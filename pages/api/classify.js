// pages/api/classify.js

import { supabase } from "../../supabase/client";
import {
  calculatePercentage,
  getOverallClassification,
  isStrength,
  isDevelopmentArea,
  scoreQuestionResponse,
  isBaselineAssessmentType,
  normalizeText,
  toNumber,
  roundNumber,
  safeArray
} from "../../utils/scoring";

function getAssessmentTypeCode(assessmentRecord) {
  if (!assessmentRecord) return "general";

  const rawType = assessmentRecord.assessment_type;

  if (Array.isArray(rawType) && rawType.length > 0) {
    return normalizeText(rawType[0]?.code || rawType[0]?.name || "general", "general");
  }

  if (rawType && typeof rawType === "object") {
    return normalizeText(rawType.code || rawType.name || "general", "general");
  }

  return "general";
}

function getQuestionCategory(response) {
  const question = response?.question || response?.unique_questions || null;

  return normalizeText(
    question?.section ||
      question?.category ||
      question?.competency ||
      question?.dimension ||
      question?.subsection ||
      response?.section ||
      response?.category ||
      "General",
    "General"
  );
}

function calculateAssessmentTotals(responses, isBaseline) {
  let totalScore = 0;
  let maxPossible = 0;

  safeArray(responses).forEach((response) => {
    const scored = scoreQuestionResponse(response, isBaseline);
    totalScore += toNumber(scored.score, 0);
    maxPossible += toNumber(scored.maxScore, 0);
  });

  const percentage = calculatePercentage(totalScore, maxPossible);

  return {
    totalScore: roundNumber(totalScore, 2),
    maxPossible: roundNumber(maxPossible, 2),
    percentage
  };
}

function calculateSectionScores(responses, isBaseline) {
  const sections = {};

  safeArray(responses).forEach((response) => {
    const section = getQuestionCategory(response);
    const scored = scoreQuestionResponse(response, isBaseline);

    if (!sections[section]) {
      sections[section] = {
        totalScore: 0,
        maxPossible: 0,
        count: 0
      };
    }

    sections[section].totalScore += toNumber(scored.score, 0);
    sections[section].maxPossible += toNumber(scored.maxScore, 0);
    sections[section].count += 1;
  });

  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    result[section] = calculatePercentage(data.totalScore, data.maxPossible);
  });

  return result;
}

function getStrengths(sectionScores) {
  return Object.entries(sectionScores)
    .filter(([, score]) => isStrength(score))
    .map(([section]) => section);
}

function getDevelopmentAreas(sectionScores) {
  return Object.entries(sectionScores)
    .filter(([, score]) => isDevelopmentArea(score))
    .map(([section]) => section);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { assessment_id, user_id } = req.body || {};

  if (!assessment_id || !user_id) {
    return res.status(400).json({ error: "assessment_id and user_id are required" });
  }

  try {
    // Get assessment type first so the scoring model can be selected correctly.
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, assessment_type_id, assessment_type:assessment_types(code)")
      .eq("id", assessment_id)
      .single();

    if (assessmentError) throw assessmentError;

    const assessmentType = getAssessmentTypeCode(assessment);
    const baseline =
      isBaselineAssessmentType(assessmentType) ||
      isBaselineAssessmentType(assessment?.assessment_type_id);

    // Get all responses with question details and answer options.
    const { data: responses, error } = await supabase
      .from("responses")
      .select(`
        answer_id,
        score,
        question_id,
        question:unique_questions (
          id,
          section,
          subsection,
          category,
          competency,
          dimension,
          unique_answers (id, score, answer_text, display_order)
        ),
        unique_questions (
          id,
          section,
          subsection,
          category,
          competency,
          dimension,
          unique_answers (id, score, answer_text, display_order)
        ),
        answer:unique_answers (id, score, answer_text, display_order),
        unique_answers (id, score, answer_text, display_order)
      `)
      .eq("assessment_id", assessment_id)
      .eq("user_id", user_id);

    if (error) throw error;

    const responseList = safeArray(responses);

    // Calculate corrected totals using the shared scoring engine.
    const totals = calculateAssessmentTotals(responseList, baseline);
    const overallScore = totals.percentage;
    const sectionScores = calculateSectionScores(responseList, baseline);
    const classification = getOverallClassification(overallScore);
    const strengths = getStrengths(sectionScores);
    const developmentAreas = getDevelopmentAreas(sectionScores);

    // Build save payload based on assessment type.
    let scoresToSave = {
      assessment_id,
      user_id,
      total_score: overallScore,
      max_score: totals.maxPossible,
      raw_score: totals.totalScore,
      classification,
      strengths: strengths.length > 0 ? strengths : null,
      development_areas: developmentAreas.length > 0 ? developmentAreas : null,
      scoring_model: baseline ? "baseline_exact_match" : "weighted_single_select"
    };

    if (assessmentType === "personality") {
      scoresToSave.personality_ownership = sectionScores["Ownership"] || 0;
      scoresToSave.personality_collaboration = sectionScores["Collaboration"] || 0;
      scoresToSave.personality_action = sectionScores["Action"] || 0;
      scoresToSave.personality_analysis = sectionScores["Analysis"] || 0;
      scoresToSave.personality_risk_tolerance = sectionScores["Risk Tolerance"] || 0;
      scoresToSave.personality_structure = sectionScores["Structure"] || 0;
    } else {
      scoresToSave.cognitive_score =
        sectionScores["Cognitive Abilities"] ||
        sectionScores["Cognitive Ability"] ||
        sectionScores["Logical / Abstract Reasoning"] ||
        0;

      scoresToSave.leadership_score =
        sectionScores["Leadership Potential"] ||
        sectionScores["Leadership & Management"] ||
        sectionScores["Vision & Strategic Thinking"] ||
        0;

      scoresToSave.technical_score =
        sectionScores["Technical Competence"] ||
        sectionScores["Technical Knowledge"] ||
        sectionScores["Technical Fundamentals"] ||
        0;

      scoresToSave.performance_score =
        sectionScores["Performance Metrics"] ||
        sectionScores["Productivity & Efficiency"] ||
        0;
    }

    const { error: insertError } = await supabase
      .from("talent_classification")
      .upsert(scoresToSave, {
        onConflict: "assessment_id,user_id"
      });

    if (insertError) throw insertError;

    res.status(200).json({
      total: overallScore,
      raw_score: totals.totalScore,
      max_score: totals.maxPossible,
      classification,
      sectionScores,
      strengths,
      developmentAreas,
      scoring_model: baseline ? "baseline_exact_match" : "weighted_single_select",
      message: "Assessment successfully classified"
    });
  } catch (err) {
    console.error("Classification error:", err);
    res.status(500).json({ error: err.message });
  }
}
