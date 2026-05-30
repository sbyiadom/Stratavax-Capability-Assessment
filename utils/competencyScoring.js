// utils/competencyScoring.js

/**
 * COMPETENCY SCORING
 *
 * Corrected version:
 * - Uses the shared scoring engine from utils/scoring.js
 * - Supports BOTH scoring models:
 *   1) Baseline exact-match scoring
 *   2) Weighted single-select scoring
 * - Removes hardcoded max-score assumptions (no fixed 5)
 * - Keeps existing export: calculateCompetencyScores
 */

import {
  calculatePercentage,
  getClassificationDetailsFromPercentage,
  getScoreComment,
  getSupervisorImplication,
  calculateGapToTarget,
  normalizeText,
  safeArray,
  toNumber,
  roundNumber,
  scoreQuestionResponse,
  isBaselineAssessmentType
} from "./scoring";

const getQuestionFromResponse = (response) => {
  if (!response) return null;
  return response.unique_questions || response.question || null;
};

const getResponseCategory = (response, assessmentType) => {
  const question = getQuestionFromResponse(response) || {};

  return normalizeText(
    question.competency ||
      question.section ||
      question.category ||
      question.dimension ||
      question.subsection ||
      response?.competency ||
      response?.section ||
      response?.category ||
      response?.dimension ||
      "General",
    "General"
  );
};

const getCompetencyMappingLookup = (questionCompetencies = []) => {
  const lookup = {};

  safeArray(questionCompetencies).forEach((item) => {
    const questionId = item?.question_id;
    if (!questionId) return;

    if (!lookup[questionId]) {
      lookup[questionId] = [];
    }

    lookup[questionId].push(item);
  });

  return lookup;
};

const getCompetencyIdentity = (mapping, fallbackName, fallbackId) => {
  const competencyObject = Array.isArray(mapping?.competencies)
    ? mapping?.competencies?.[0]
    : mapping?.competencies;

  const name = normalizeText(
    competencyObject?.name ||
      mapping?.competency_name ||
      fallbackName ||
      "General",
    "General"
  );

  const id =
    mapping?.competency_id ||
    competencyObject?.id ||
    fallbackId ||
    name;

  return { id, name };
};

const buildResultObject = (name, competencyId, rawScore, maxPossible, questionCount) => {
  const percentage = calculatePercentage(rawScore, maxPossible || 1);
  const details = getClassificationDetailsFromPercentage(percentage);

  return {
    id: competencyId,
    competency_id: competencyId,
    name,
    category: name,
    rawScore: roundNumber(rawScore, 2),
    totalScore: roundNumber(rawScore, 2),
    score: roundNumber(rawScore, 2),
    maxPossible: roundNumber(maxPossible, 2),
    maxScore: roundNumber(maxPossible, 2),
    percentage,
    classification: details.classification,
    band: details.band,
    label: details.label,
    color: details.color,
    bg: details.bg,
    grade: details.grade,
    gradeDescription: details.gradeDescription,
    description: details.description,
    performanceComment: getScoreComment(percentage),
    supervisorImplication: getSupervisorImplication(percentage),
    gapToTarget: calculateGapToTarget(percentage),
    questionCount: toNumber(questionCount, 0)
  };
};

/**
 * calculateCompetencyScores
 *
 * Expected inputs:
 * - responses: response rows with question and answer joins
 * - questionCompetencies: rows from question_competencies
 * - assessmentType: assessment type code or id
 *
 * Returns object keyed by competency name for backward compatibility.
 */
export const calculateCompetencyScores = (
  responses,
  questionCompetencies = [],
  assessmentType = "general"
) => {
  const safeResponses = safeArray(responses);
  const mappings = safeArray(questionCompetencies);
  const mappingLookup = getCompetencyMappingLookup(mappings);
  const isBaseline = isBaselineAssessmentType(assessmentType);
  const results = {};

  safeResponses.forEach((response) => {
    const question = getQuestionFromResponse(response);
    const questionId = question?.id || response?.question_id;
    const scored = scoreQuestionResponse(response, isBaseline);

    const score = toNumber(scored.score, 0);
    const maxScore = toNumber(scored.maxScore, 0);

    const linkedMappings = questionId ? mappingLookup[questionId] || [] : [];

    // If no explicit competency mapping exists, fall back to the question section/category.
    if (linkedMappings.length === 0) {
      const fallbackName = getResponseCategory(response, assessmentType);
      if (!results[fallbackName]) {
        results[fallbackName] = {
          id: fallbackName,
          name: fallbackName,
          rawScore: 0,
          maxPossible: 0,
          questionCount: 0
        };
      }

      results[fallbackName].rawScore += score;
      results[fallbackName].maxPossible += maxScore;
      results[fallbackName].questionCount += 1;
      return;
    }

    linkedMappings.forEach((mapping) => {
      const weight = toNumber(mapping?.weight, 1);
      const identity = getCompetencyIdentity(mapping, getResponseCategory(response, assessmentType), null);
      const key = identity.name;

      if (!results[key]) {
        results[key] = {
          id: identity.id,
          name: identity.name,
          rawScore: 0,
          maxPossible: 0,
          questionCount: 0
        };
      }

      results[key].rawScore += score * weight;
      results[key].maxPossible += maxScore * weight;
      results[key].questionCount += 1;
    });
  });

  const finalized = {};

  Object.keys(results).forEach((key) => {
    const item = results[key];
    finalized[key] = buildResultObject(
      item.name,
      item.id,
      item.rawScore,
      item.maxPossible,
      item.questionCount
    );
  });

  return finalized;
};

export default {
  calculateCompetencyScores
};
