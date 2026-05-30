// pages/api/save-classification.js

import { supabase } from "../../supabase/client";
import {
  calculatePercentage,
  getOverallClassification,
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

function calculateAssessmentTotals(responses, isBaseline) {
  let totalScore = 0;
  let maxPossible = 0;

  safeArray(responses).forEach((response) => {
    const scored = scoreQuestionResponse(response, isBaseline);
    totalScore += toNumber(scored.score, 0);
    maxPossible += toNumber(scored.maxScore, 0);
  });

  return {
    rawScore: roundNumber(totalScore, 2),
    maxScore: roundNumber(maxPossible, 2),
    percentage: calculatePercentage(totalScore, maxPossible)
  };
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
    // Fetch assessment type first so the scoring model is correct.
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

    // Fetch responses WITH linked question answers so max score can be computed correctly.
    const { data: responses, error } = await supabase
      .from("responses")
      .select(`
        answer_id,
        score,
        question_id,
        question:unique_questions (
          id,
          unique_answers (id, score, answer_text, display_order)
        ),
        unique_questions (
          id,
          unique_answers (id, score, answer_text, display_order)
        ),
        answer:unique_answers (id, score, answer_text, display_order),
        unique_answers (id, score, answer_text, display_order)
      `)
      .eq("assessment_id", assessment_id)
      .eq("user_id", user_id);

    if (error) throw error;

    const totals = calculateAssessmentTotals(safeArray(responses), baseline);
    const classification = getOverallClassification(totals.percentage);

    const payload = {
      assessment_id,
      user_id,
      total_score: totals.percentage,
      raw_score: totals.rawScore,
      max_score: totals.maxScore,
      classification,
      scoring_model: baseline ? "baseline_exact_match" : "weighted_single_select"
    };

    const { error: insertError } = await supabase
      .from("talent_classification")
      .upsert(payload, { onConflict: "assessment_id,user_id" });

    if (insertError) throw insertError;

    res.status(200).json({
      total: totals.percentage,
      raw_score: totals.rawScore,
      max_score: totals.maxScore,
      classification,
      scoring_model: baseline ? "baseline_exact_match" : "weighted_single_select"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
