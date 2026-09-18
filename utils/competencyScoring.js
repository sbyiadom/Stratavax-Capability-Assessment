// utils/competencyScoring.js

/**
 * COMPETENCY SCORING
 *
 * Phase 5 update:
 * - Reads assessmentType scoring mode ('single_select' or 'forced_choice')
 *   via the assessmentType parameter, which can now be an object:
 *     { code: 'leadership', scoring_mode: 'forced_choice' }
 *   or a plain code string (legacy callers).
 * - Passes mode through to scoreQuestionResponse so forced-choice responses
 *   are scored correctly.
 * - Only questions with a real mapping in question_competencies contribute
 *   to competency scores. Unmapped questions are ignored (per Phase 5 fix).
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

// Accepts either a code string or an object { code, scoring_mode }.
// Returns 'baseline' | 'forced_choice' | 'single_select'.
const resolveScoringMode = (assessmentType) => {
  if (assessmentType && typeof assessmentType === "object") {
    const code = assessmentType.code || assessmentType.id;
    if (isBaselineAssessmentType(code)) return "baseline";
    if (assessmentType.scoring_mode === "forced_choice") return "forced_choice";
    return "single_select";
  }

  if (isBaselineAssessmentType(assessmentType)) return "baseline";
  return "single_select";
};

const getQuestionFromResponse = (response) => {
  if (!response) return null;
  return response.unique_questions || response.question || null;
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
 * @param responses              - response rows with question + answer joins
 * @param questionCompetencies   - rows from question_competencies
 * @param assessmentType         - string code OR { code, scoring_mode }
 *
 * Only mapped questions contribute (Phase 5).
 */
export const calculateCompetencyScores = (
  responses,
  questionCompetencies = [],
  assessmentType = "general"
) => {
  const safeResponses = safeArray(responses);
  const mappings = safeArray(questionCompetencies);
  const mappingLookup = getCompetencyMappingLookup(mappings);
  const scoringMode = resolveScoringMode(assessmentType);
  const results = {};

  safeResponses.forEach((response) => {
    const question = getQuestionFromResponse(response);
    const questionId = question?.id || response?.question_id;
    const scored = scoreQuestionResponse(
      response,
      scoringMode === "baseline",
      scoringMode
    );

    const score = toNumber(scored.score, 0);
    const maxScore = toNumber(scored.maxScore, 0);

    const linkedMappings = questionId ? mappingLookup[questionId] || [] : [];

    // Only mapped questions contribute to competency scores.
    if (linkedMappings.length === 0) {
      return;
    }

    linkedMappings.forEach((mapping) => {
      const weight = toNumber(mapping?.weight, 1);
      const identity = getCompetencyIdentity(mapping, null, null);

      // Defensive: numeric competency_id required.
      const numericId = Number(identity.id);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        return;
      }

      const key = identity.name;

      if (!results[key]) {
        results[key] = {
          id: numericId,
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
