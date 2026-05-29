
// pages/api/supervisor/report.js

import { createClient } from "@supabase/supabase-js";

function normalizeParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    console.log("Supervisor report request:", {
      userId,
      assessmentId: assessmentId || null
    });

    // IMPORTANT:
    // Query ONLY by user_id because your table does not have candidate_id
    let resultsQuery = supabase
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
      resultsQuery = resultsQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultsQuery.limit(1);

    if (resultsError) {
      console.error("assessment_results query error:", resultsError);
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

    // Fetch candidate profile
    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (candidateError) {
      console.error("candidate_profiles query warning:", candidateError);
    }

    // Fetch assessment separately instead of using assessments(*) join
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

    const percentage = toNumber(record.percentage_score, 0);
    const totalScore = toNumber(record.total_score, 0);
    const maxScore = toNumber(record.max_score, 100);
    const responseCount = toNumber(record.answered_questions, 0);

    const classification = getClassification(percentage);
    const riskLevel = record.risk_level || getRiskLevel(percentage);

    const candidateName =
      candidate?.full_name || candidate?.email || "Candidate";

    const assessmentName = assessment?.title || "Assessment";

    const executiveSummary = `${candidateName} completed the ${assessmentName} assessment with an overall score of ${percentage}%.`;

    const generatedReport = {
      candidateName,
      assessmentName,
      userId,
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

      categoryScores: Array.isArray(record.category_scores)
        ? record.category_scores
        : [],

      strengths: Array.isArray(record.strengths) ? record.strengths : [],

      developmentAreas: Array.isArray(record.weaknesses)
        ? record.weaknesses
        : [],

      recommendations: Array.isArray(record.recommendations)
        ? record.recommendations
        : [],

      followUpQuestions: [],

      responseCount,
      answered_questions: responseCount,
      completedAt: record.completed_at || null,
      dataSource: "assessment_results"
    };

    return res.status(200).json({
      success: true,
      candidate: candidate || { id: userId },
      assessment: assessment || { id: record.assessment_id, title: "Assessment" },
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
