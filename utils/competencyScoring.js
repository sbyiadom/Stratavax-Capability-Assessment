// utils/competencyScoring.js

/**
 * COMPETENCY SCORING ENGINE
 *
 * - Calculates competency-level results from responses
 * - Applies { * - Applies assessment-specific competency weights
          bucket[name] = {
            name,
            totalScore: 0,
            maxScore: 0,
            count: 0,
            totalTime: 0,
            totalChanges: 0
          };
        }

        bucket[name].totalScore += score * weight;
        bucket[name].maxScore += 5 * weight;
        bucket[name].count += 1;
        bucket[name].totalTime += timeSpent;
        bucket[name].totalChanges += changes;
      });
  });

  const results = {};

  Object.keys(bucket).forEach(function (key) {
    const item = bucket[key];
    const percentage = calculatePercentageDecimal(
      item.totalScore,
      item.maxScore,
      2
    );

    results[key] = {
      name: key,
      totalScore: roundNumber(item.totalScore, 2),
      maxScore: roundNumber(item.maxScore, 2),
      percentage,
      classification: competencyClassification(percentage),
      scoreLevel: getScoreLevel(percentage),
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      behavioral: {
        avgTimePerQuestion:
          item.count > 0 ? roundNumber(item.totalTime / item.count, 2) : 0,
        avgChangesPerQuestion:
          item.count > 0 ? roundNumber(item.totalChanges / item.count, 2) : 0
      },
      gapToTarget: calculateGapToTarget(percentage)
    };
  });

  return results;
}

// ======================================================
// SUMMARY
// ======================================================

export const getCompetencySummary = function (competencyResults) {
  if (!competencyResults) return null;

  const list = Object.values(competencyResults);

  if (list.length === 0) return null;

  const average =
    list.reduce(function (sum, c) {
      return sum + safeNumber(c.percentage, 0);
    }, 0) / list.length;

  return {
    totalCompetencies: list.length,
    strongCount: list.filter(c => isStrength(c.percentage)).length,
    developmentCount: list.filter(c => isDevelopmentArea(c.percentage)).length,
    criticalCount: list.filter(c => isCriticalGap(c.percentage)).length,
    averageScore: roundNumber(average, 1),
    overallAssessment: getScoreComment(average)
  };
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  calculateCompetencyScores,
  competencyClassification,
  getCompetencySummary,
  assessmentCompetencyWeights
};
 * - Integrates behavioral metrics (time, answer changes)
 * - Generates supervisor-ready insights and recommendations
 *
 * Syntax-safe and aligned with utils/scoring.js
 */

import {
  clampPercentage,
  roundNumber,
  getScoreComment,
  getSupervisorImplication,
  calculateGapToTarget,
  isStrength,
  isDevelopmentArea,
  isCriticalGap,
  isPriorityDevelopment
} from "./scoring";

// ======================================================
// CONSTANTS
// ======================================================

export const REPORT_THRESHOLDS = {
  strengthThreshold: 75,
  developmentThreshold: 65,
  criticalThreshold: 40
};

// ======================================================
// HELPERS
// ======================================================

const safeNumber = function (value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback || 0;
};

const getScoreLevel = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= 85) return "Exceptional";
  if (value >= 75) return "Strong";
  if (value >= 65) return "Proficient";
  if (value >= 55) return "Developing";
  if (value >= 40) return "Needs Development";

  return "Critical Gap";
};

const calculatePercentageDecimal = function (score, maxScore, decimals) {
  if (maxScore <= 0) return 0;

  const raw = (safeNumber(score, 0) / safeNumber(maxScore, 1)) * 100;
  return roundNumber(raw, decimals === undefined ? 2 : decimals);
};

// ======================================================
// ASSESSMENT COMPETENCY WEIGHTS
// ======================================================

export const assessmentCompetencyWeights = {
  general: {
    Communication: 1.1,
    Accountability: 1.1,
    Adaptability: 1.0,
    Integrity: 1.1,
    Collaboration: 1.0,
    "Cognitive Ability": 1.2
  },

  leadership: {
    "Strategic Thinking": 1.3,
    "Decision Making": 1.3,
    Communication: 1.1,
    "People Management": 1.3,
    "Emotional Intelligence": 1.2
  },

  technical: {
    "Technical Knowledge": 1.5,
    "Problem Solving": 1.2,
    Execution: 1.1
  }
};

// ======================================================
// CLASSIFICATION (BACKWARD COMPATIBLE)
// ======================================================

export const competencyClassification = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= REPORT_THRESHOLDS.strengthThreshold) return "Strong";
  if (value >= REPORT_THRESHOLDS.developmentThreshold) return "Proficient";
  if (value >= REPORT_THRESHOLDS.criticalThreshold) return "Developing";

  return "Needs Development";
};

// ======================================================
// CORE CALCULATION
// ======================================================

export function calculateCompetencyScores(
  responses,
  questionCompetencies,
  assessmentType
) {
  if (!Array.isArray(responses) || !Array.isArray(questionCompetencies)) {
    return {};
  }

  const weights =
    assessmentCompetencyWeights[assessmentType] ||
    assessmentCompetencyWeights.general;

  const bucket = {};

  responses.forEach(function (response) {
    const questionId = response.question_id;
    const score = safeNumber(response.score, 0);
    const timeSpent = safeNumber(response.time_spent_seconds, 0);
    const changes = safeNumber(response.times_changed, 0);

    questionCompetencies
      .filter(function (qc) {
        return String(qc.question_id) === String(questionId);
      })
      .forEach(function (mapping) {
        const name = mapping.name || "General";
        const weight = safeNumber(mapping.weight, 1) * safeNumber(weights[name], 1);

