// pages/api/supervisor/report.js

import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * CONFIG
 * ============================================================
 * Change ONLY these if your library table/columns differ.
 */
const LIBRARY_TABLE = "competency_library"; // <-- replace if needed
const LIBRARY_NAME_COLUMN = "name";
const LIBRARY_DESCRIPTION_COLUMN = "description";
const LIBRARY_RECOMMENDATION_COLUMN = "recommendation";
const LIBRARY_FOLLOWUP_COLUMN = "follow_up_question";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */
function normalizeParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getClassification(percentage) {
  if (percentage >= 85) return "Exceptional";
  if (percentage >= 75) return "Strong Performer";
  if (percentage >= 65) return "Capable Contributor";
  if (percentage >= 55) return "Developing";
  if (percentage >= 40) return "At Risk";
  return "High Risk";
}

function getRiskLevel(percentage) {
  if (percentage >= 75) return "Low";
  if (percentage >= 55) return "Moderate";
  return "High";
}

function buildCategoryScoreMap(categoryScores) {
  const map = new Map();

  safeArray(categoryScores).forEach((item) => {
    const key = safeText(item?.name || item?.category, "").trim().toLowerCase();
    if (!key) return;
    map.set(key, item);
  });

  return map;
}

function buildLibraryMap(libraryRows) {
  const map = new Map();

  safeArray(libraryRows).forEach((row) => {
    const key = safeText(row?.[LIBRARY_NAME_COLUMN], "").trim().toLowerCase();
    if (!key) return;
    map.set(key, row);
  });

  return map;
}

function normalizeInsightItems(rawItems, categoryScoreMap, libraryMap, type) {
  return safeArray(rawItems).map((item) => {
    const name =
      typeof item === "string"
        ? item
        : safeText(item?.name || item?.category, "Area");

    const lookupKey = safeText(name, "").trim().toLowerCase();
    const scoreRow = categoryScoreMap.get(lookupKey) || null;
    const libraryRow = libraryMap.get(lookupKey) || null;

    const percentage = toNumber(scoreRow?.percentage ?? scoreRow?.score, 0);

    const description =
      safeText(
        libraryRow?.[LIBRARY_DESCRIPTION_COLUMN],
        safeText(
          item?.description || item?.narrative,
          `${name} is an area of ${type === "strength" ? "strength" : "development"} for this candidate.`
        )
      );

    const recommendation = safeText(
      libraryRow?.[LIBRARY_RECOMMENDATION_COLUMN],
      safeText(item?.recommendation, "")
    );

    const followUpQuestion = safeText(
      libraryRow?.[LIBRARY_FOLLOWUP_COLUMN],
      ""
    );

    return {
      name,
      percentage,
      narrative: description,
      description,
      recommendation,
      followUpQuestion,
      classification:
        safeText(scoreRow?.classification, percentage > 0 ? getClassification(percentage) : "Not available")
    };
  });
}

function buildFollowUpQuestionsFromLibrary(developmentAreas) {
  return safeArray(developmentAreas)
    .filter((item) => safeText(item?.followUpQuestion, "").trim() !== "")
    .map((item) => ({
      category: item.name,
      question: item.followUpQuestion,
      priority: "Medium"
    }));
}

function buildRecommendationsFromLibrary(developmentAreas) {
  return safeArray(developmentAreas)
    .filter((item) => safeText(item?.recommendation, "").trim() !== "")
    .map((item) => ({
      category: item.name,
      title: item.name,
      recommendation: item.recommendation,
      priority: "Medium"
    }));
}

/**
 * ============================================================
 * API HANDLER
 * ============================================================
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const rawUserId = req.query.user_id || req.query.userId;
  const rawAssessmentId =
    req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  const userId = normalizeParam(rawUserId);
  const assessmentId = normalizeParam(rawAssessmentId);

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing user_id"
    });
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error:
        "Supabase environment variables are missing. Expected SUPABASE URL and SERVICE ROLE KEY."
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    /**
     * ------------------------------------------------------------
     * 1) Load assessment result
     * ------------------------------------------------------------
     */
    let resultQuery = supabase
      .from("assessment_results")
      .select(`
        id,
        session_id,
        user_id,
        assessment_id,
        total_score,
        max_score,
        category_scores,
        interpretations,
        strengths,
        weaknesses,
        recommendations,
        risk_level,
        readiness,
        completed_at,
        created_at,
        updated_at,
        is_valid,
        validation_note,
        answered_questions,
        auto_submit_reason,
        is_auto_submitted,
        violation_count,
        violation_details,
        total_questions,
        percentage_score
      `)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (assessmentId) {
      resultQuery = resultQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultQuery.limit(1);

    if (resultsError) {
      return res.status(500).json({
        success: false,
        error: resultsError.message
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No completed assessments found for this candidate.",
        user_id: userId,
        assessment_id: assessmentId || null
      });
    }

    const record = results[0];

    /**
     * ------------------------------------------------------------
     * 2) Load candidate profile
     * ------------------------------------------------------------
     */
    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, email")
      .eq("id", record.user_id)
      .maybeSingle();

    if (candidateError) {
      console.error("candidate_profiles query warning:", candidateError);
    }

    /**
     * ------------------------------------------------------------
     * 3) Load assessment
     * ------------------------------------------------------------
     */
    let assessment = null;

    if (record.assessment_id) {
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("id, title")
        .eq("id", record.assessment_id)
        .maybeSingle();

      if (assessmentError) {
        console.error("assessments query warning:", assessmentError);
      } else {
        assessment = assessmentData || null;
      }
    }

    /**
     * ------------------------------------------------------------
     * 4) Load library rows for relevant categories
     * ------------------------------------------------------------
     */
    const categoryScores = safeArray(record.category_scores);
    const categoryScoreMap = buildCategoryScoreMap(categoryScores);

    const categoryNames = categoryScores
      .map((item) => safeText(item?.name || item?.category, "").trim())
      .filter(Boolean);

    let libraryRows = [];
    if (categoryNames.length > 0) {
      const { data: libraryData, error: libraryError } = await supabase
        .from(LIBRARY_TABLE)
        .select(
          [
            LIBRARY_NAME_COLUMN,
            LIBRARY_DESCRIPTION_COLUMN,
            LIBRARY_RECOMMENDATION_COLUMN,
            LIBRARY_FOLLOWUP_COLUMN
          ].join(", ")
        )
        .in(LIBRARY_NAME_COLUMN, categoryNames);

      if (libraryError) {
        console.error("library query warning:", libraryError);
      } else {
        libraryRows = libraryData || [];
      }
    }

    const libraryMap = buildLibraryMap(libraryRows);

    /**
     * ------------------------------------------------------------
     * 5) Build report payload
     * ------------------------------------------------------------
     */
    const percentage = toNumber(record.percentage_score, 0);
    const totalScore = toNumber(record.total_score, 0);
    const maxScore = toNumber(record.max_score, 100);
    const responseCount = toNumber(record.answered_questions, 0);

    const classification = getClassification(percentage);
    const riskLevel = safeText(record.risk_level, getRiskLevel(percentage));

    const candidateName =
      safeText(candidate?.full_name, "") ||
      safeText(candidate?.email, "") ||
      "Candidate";

    const assessmentName =
      safeText(assessment?.title, "") || "Assessment";

    const strengths = normalizeInsightItems(
      record.strengths,
      categoryScoreMap,
      libraryMap,
      "strength"
    );

    const developmentAreas = normalizeInsightItems(
      record.weaknesses,
      categoryScoreMap,
      libraryMap,
      "development"
    );

    const followUpQuestions = buildFollowUpQuestionsFromLibrary(developmentAreas);

    const recommendationsFromLibrary =
      buildRecommendationsFromLibrary(developmentAreas);

    const dbRecommendations = safeArray(record.recommendations).map((item) => {
      if (typeof item === "string") {
        return {
          title: "Recommendation",
          category: "",
          recommendation: item,
          priority: "Medium"
        };
      }

      return {
        title: safeText(item?.title, safeText(item?.category, "Recommendation")),
        category: safeText(item?.category, ""),
        recommendation: safeText(
          item?.recommendation || item?.description,
          "No recommendation text available."
        ),
        priority: safeText(item?.priority, "Medium")
      };
    });

    const recommendations =
      recommendationsFromLibrary.length > 0
        ? recommendationsFromLibrary
        : dbRecommendations;

    const executiveSummary = `${candidateName} completed the ${assessmentName} assessment with an overall score of ${percentage}%.`;

    const generatedReport = {
      candidateName,
      assessmentName,
      userId: record.user_id,
      assessmentId: record.assessment_id,

      totalScore,
      maxScore,

      percentage,
      overallPercentage: percentage,
      overallScore: percentage,
      score: percentage,

      classification,
      overallClassification: classification,

      riskLevel,

      summary: executiveSummary,
      executiveSummary,
      overallAssessment: executiveSummary,

      supervisorImplication:
        "Review the assessment results and provide targeted feedback based on the candidate's performance.",

      roleReadiness:
        percentage >= 75
          ? "Candidate appears ready for role responsibilities."
          : "Candidate requires additional development before assuming critical responsibilities.",

      readinessStatement:
        percentage >= 75 ? "Ready for role" : "Development needed",

      categoryScores,
      strengths,
      developmentAreas,
      recommendations,
      followUpQuestions,

      responseCount,
      answered_questions: responseCount,
      completedAt: record.completed_at || null,
      dataSource: "assessment_results"
    };

    return res.status(200).json({
      success: true,
      candidate: candidate || { id: record.user_id },
      assessment:
        assessment || { id: record.assessment_id, title: "Assessment" },
      generatedReport,
      result: record,
      assessment_id: record.assessment_id
    });
  } catch (error) {
    console.error("Supervisor report fatal error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate report"
    });
  }
}
