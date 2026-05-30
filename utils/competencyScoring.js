// utils/competencyScoring.js

import {
  toNumber,
  roundNumber,
  safeArray,
  normalizeText,
  scoreQuestionResponse,
  isBaselineAssessmentType
} from "./scoring";

// ======================================================
// HELPERS
// ======================================================

function getCategory(response) {
  if (!response) return "General";

  const question = response.unique_questions || response.question || null;

  return normalizeText(
    (question && (question.section || question.category || question.competency || question.dimension)) ||
      response.section ||
      response.category ||
      response.competency ||
      response.dimension ||
      "General",
    "General"
  );
}

// ======================================================
// MAIN FUNCTION
// ======================================================

export function calculateCompetencyScores(responses, assessmentType) {
  const isBaseline = isBaselineAssessmentType(assessmentType);
  const grouped = {};

  safeArray(responses).forEach(function (response) {
    const category = getCategory(response);

    const scored = scoreQuestionResponse(response, isBaseline);
    const score = toNumber(scored.score, 0);
    const maxScore = toNumber(scored.maxScore, 0);

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        totalScore: 0,
        maxScore: 0,
        count: 0
      };
    }

    grouped[category].totalScore += score;
    grouped[category].maxScore += maxScore;
    grouped[category].count += 1;
  });

  return Object.values(grouped).map(function (item) {
    const percentage =
      item.maxScore > 0
        ? roundNumber((item.totalScore / item.maxScore) * 100, 2)
        : 0;

    return {
      category: item.category,
      name: item.category,
      score: roundNumber(item.totalScore, 2),
      totalScore: roundNumber(item.totalScore, 2),
      maxScore: roundNumber(item.maxScore, 2),
      maxPossible: roundNumber(item.maxScore, 2),
      questionCount: item.count,
      percentage: percentage
    };
  });
}
