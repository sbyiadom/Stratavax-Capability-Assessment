// utils/scoring.js// utils/scoring(data.percentage)
      : calculatePercentage(score, maxPossible);

  const summary = buildScoreSummary({
    totalScore: score,
    maxScore: maxPossible,
    percentage
  });

  return {
    category: categoryName,
    score,
    maxPossible,
    percentage,
    ...summary
  };
};

/**
 * Normalize all category scores.
 */
export const normalizeCategoryScores = (categoryScores = {}) => {
  const normalized = {};

  Object.entries(categoryScores || {}).forEach(([categoryName, data]) => {
    normalized[categoryName] = normalizeCategoryScore(categoryName, data);
  });

  return normalized;
};

/**
 * Sort categories by percentage descending.
 */
export const sortCategoriesByStrength = (categoryScores = {}) => {
  return Object.entries(categoryScores)
    .map(([category, data]) => normalizeCategoryScore(category, data))
    .sort((a, b) => b.percentage - a.percentage);
};

/**
 * Sort categories by percentage ascending.
 */
export const sortCategoriesByDevelopmentNeed = (categoryScores = {}) => {
  return Object.entries(categoryScores)
    .map(([category, data]) => normalizeCategoryScore(category, data))
    .sort((a, b) => a.percentage - b.percentage);
};

/**
 * Extract strengths from category scores.
 */
export const getStrengthAreas = (categoryScores = {}, limit = null) => {
  const strengths = sortCategoriesByStrength(categoryScores).filter((item) =>
    isStrength(item.percentage)
  );

  return limit ? strengths.slice(0, limit) : strengths;
};

/**
 * Extract development areas from category scores.
 */
export const getDevelopmentAreas = (categoryScores = {}, limit = null) => {
  const developmentAreas = sortCategoriesByDevelopmentNeed(
    categoryScores
  ).filter((item) => isDevelopmentArea(item.percentage));

  return limit ? developmentAreas.slice(0, limit) : developmentAreas;
};

/**
 * Generate concise score comment.
 */
export const getScoreComment = (percentage) => {
  const value = clampPercentage(percentage);

  if (value >= 85) {
    return "Exceptional performance";
  }

  if (value >= 75) {
    return "Strong performance";
  }

  if (value >= 65) {
    return "Adequate capability";
  }

  if (value >= 55) {
    return "Developing capability";
  }

  if (value >= 40) {
    return "Priority development need";
  }

  return "Critical development need";
};

/**
 * Generate supervisor-friendly implication.
 */
export const getSupervisorImplication = (percentage) => {
  const value = clampPercentage(percentage);

  if (value >= 85) {
    return "Candidate shows strong evidence of readiness in this area and may be suitable for higher responsibility or mentoring opportunities.";
  }

  if (value >= 75) {
    return "Candidate shows reliable capability in this area and can likely perform with standard supervision.";
  }

  if (value >= 65) {
    return "Candidate shows functional capability but may benefit from targeted reinforcement and practical exposure.";
  }

  if (value >= 55) {
    return "Candidate shows developing capability and should receive structured support before being assigned complex tasks in this area.";
  }

  if (value >= 40) {
    return "Candidate has significant gaps in this area and should receive focused development with increased supervision.";
  }

  return "Candidate has critical gaps in this area and should receive immediate foundational training and close supervision.";
};

export default {
  PERFORMANCE_BANDS,
  GRADE_SCALE,
  REPORT_THRESHOLDS,

  toNumber,
  clampPercentage,
  roundNumber,

  calculateTotalScore,
  calculateMaxScore,
  calculatePercentage,
  calculatePercentageDecimal,

  getPerformanceBand,
  getGradeInfo,
  getGrade,
  getGradeDescription,
  getGradeDisplay,

  getOverallClassification,
  getClassificationFromPercentage,
  getClassificationDetails,
  getClassificationDetailsFromPercentage,

  isStrength,
  isExceptionalStrength,
  isDevelopmentArea,
  isPriorityDevelopment,
  isCriticalGap,

  getScoreLevel,
  calculateGapToTarget,
  buildScoreSummary,

  normalizeCategoryScore,
  normalizeCategoryScores,
  sortCategoriesByStrength,
  sortCategoriesByDevelopmentNeed,
  getStrengthAreas,
  getDevelopmentAreas,

  getScoreComment,
  getSupervisorImplication
};

/**
 * CENTRAL SCORING STANDARD
 *
 * This file provides one consistent scoring, grading, and classification
 * standard for all assessment reports.
 *
 * It is designed to support:
 * - General Assessment
 * - Leadership Assessment
 * - Cognitive Assessment
 * - Technical Assessment
 * - Personality Assessment
 * - Strategic Leadership Assessment
 * - Performance Assessment
 * - Behavioral Assessment
 * - Cultural Assessment
 * - Manufacturing Baseline Assessment
 *
 * Backward-compatible exports are preserved:
 * - calculateTotalScore
 * - calculatePercentage
 * - getOverallClassification
 * - getGrade
 * - getClassificationDetails
 */

/**
 * Unified performance bands for report interpretation.
 *
 * These bands should gradually become the common reference
 * across the report generator, commentary engine, competency scoring,
 * category mapper, and supervisor report page.
 */
export const PERFORMANCE_BANDS = [
  {
    key: "exceptional",
    min: 85,
    max: 100,
    label: "Exceptional",
    classification: "High Potential",
    strengthLevel: "Exceptional Strength",
    developmentLevel: "Maintain and Leverage",
    color: "#2E7D32",
    bg: "#E8F5E9",
    description:
      "Demonstrates strong evidence of capability and readiness for advanced responsibility."
  },
  {
    key: "strong",
    min: 75,
    max: 84,
    label: "Strong",
    classification: "Strong Performer",
    strengthLevel: "Strength",
    developmentLevel: "Leverage and Refine",
    color: "#4CAF50",
    bg: "#E8F5E9",
    description:
      "Shows reliable capability with clear strengths that can be applied in role-relevant situations."
  },
  {
    key: "adequate",
    min: 65,
    max: 74,
    label: "Adequate",
    classification: "Capable Contributor",
    strengthLevel: "Functional Capability",
    developmentLevel: "Targeted Refinement",
    color: "#1565C0",
    bg: "#E3F2FD",
    description:
      "Shows functional competence with some areas requiring reinforcement or role-specific practice."
  },
  {
    key: "developing",
    min: 55,
    max: 64,
    label: "Developing",
    classification: "Developing",
    strengthLevel: "Developing Capability",
    developmentLevel: "Development Area",
    color: "#F57C00",
    bg: "#FFF3E0",
    description:
      "Shows foundational understanding but requires structured support to reach expected performance."
  },
  {
    key: "priority_development",
    min: 40,
    max: 54,
    label: "Priority Development",
    classification: "At Risk",
    strengthLevel: "Limited Evidence",
    developmentLevel: "Priority Development",
    color: "#C62828",
    bg: "#FFEBEE",
    description:
      "Indicates significant gaps that may affect role readiness without targeted intervention."
  },
  {
    key: "critical_gap",
    min: 0,
    max: 39,
    label: "Critical Gap",
    classification: "High Risk",
    strengthLevel: "Insufficient Evidence",
    developmentLevel: "Critical Development Need",
    color: "#8B0000",
    bg: "#FFEBEE",
    description:
      "Indicates critical gaps requiring immediate structured development and close supervision."
  }
];

/**
 * Unified grade scale.
 */
export const GRADE_SCALE = [
  {
    grade: "A+",
    min: 95,
    max: 100,
    description: "Exceptional",
    color: "#0A5C2E",
    bg: "#E6F7E6"
  },
  {
    grade: "A",
    min: 90,
    max: 94,
    description: "Excellent",
    color: "#1E7A44",
    bg: "#E6F7E6"
  },
  {
    grade: "A-",
    min: 85,
    max: 89,
    description: "Very Good",
    color: "#2E7D32",
    bg: "#E8F5E9"
  },
  {
    grade: "B+",
    min: 80,
    max: 84,
    description: "Good",
    color: "#2E7D32",
    bg: "#E8F5E9"
  },
  {
    grade: "B",
    min: 75,
    max: 79,
    description: "Satisfactory",
    color: "#1565C0",
    bg: "#E3F2FD"
  },
  {
    grade: "B-",
    min: 70,
    max: 74,
    description: "Adequate",
    color: "#1565C0",
    bg: "#E3F2FD"
  },
  {
    grade: "C+",
    min: 65,
    max: 69,
    description: "Developing",
    color: "#F57C00",
    bg: "#FFF3E0"
  },
  {
    grade: "C",
    min: 60,
    max: 64,
    description: "Basic Competency",
    color: "#F57C00",
    bg: "#FFF3E0"
  },
  {
    grade: "C-",
    min: 55,
    max: 59,
    description: "Minimum Competency",
    color: "#F57C00",
    bg: "#FFF3E0"
  },
  {
    grade: "D+",
    min: 50,
    max: 54,
    description: "Below Expectations",
    color: "#C62828",
    bg: "#FFEBEE"
  },
  {
    grade: "D",
    min: 40,
    max: 49,
    description: "Significant Gaps",
    color: "#C62828",
    bg: "#FFEBEE"
  },
  {
    grade: "F",
    min: 0,
    max: 39,
    description: "Unsatisfactory",
    color: "#8B0000",
    bg: "#FFEBEE"
  }
];

/**
 * Role/report thresholds.
 */
export const REPORT_THRESHOLDS = {
  exceptional: 85,
  strong: 75,
  adequate: 65,
  developing: 55,
  priorityDevelopment: 40,
  criticalGap: 0,

  /**
   * Report display thresholds.
   */
  strengthThreshold: 75,
  strongStrengthThreshold: 85,
  developmentThreshold: 65,
  priorityDevelopmentThreshold: 55,
  criticalThreshold: 40,

  /**
   * Default supervisor target used in development plans.
   */
  targetScore: 80
};

/**
 * Safely convert to number.
 */
export const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return fallback;
  }

  return number;
};

/**
 * Clamp percentage between 0 and 100.
 */
export const clampPercentage = (percentage) => {
  const value = toNumber(percentage, 0);

  if (value < 0) return 0;
  if (value > 100) return 100;

  return value;
};

/**
 * Round number to specified decimal places.
 */
export const roundNumber = (value, decimals = 2) => {
  const number = toNumber(value, 0);
  const factor = Math.pow(10, decimals);

  return Math.round(number * factor) / factor;
};

/**
 * Calculate total score from responses.
 *
 * Supports multiple response shapes:
 * - response.score
 * - response.unique_answers.score
 * - response.answer.score
 */
export const calculateTotalScore = (responses) => {
  if (!Array.isArray(responses) || responses.length === 0) return 0;

  return responses.reduce((total, response) => {
    const score =
      response?.score ??
      response?.unique_answers?.score ??
      response?.answer?.score ??
      0;

    return total + toNumber(score, 0);
  }, 0);
};

/**
 * Calculate max possible score.
 *
 * If maxScore is provided, it uses maxScore.
 * Otherwise, it assumes each response/question is worth 5 points.
 */
export const calculateMaxScore = (responses, maxScore = null) => {
  if (maxScore !== null && maxScore !== undefined) {
    return toNumber(maxScore, 0);
  }

  if (!Array.isArray(responses) || responses.length === 0) {
    return 0;
  }

  return responses.length * 5;
};

/**
 * Calculate percentage score.
 */
export const calculatePercentage = (score, maxScore) => {
  const earned = toNumber(score, 0);
  const maximum = toNumber(maxScore, 0);

  if (!maximum || maximum <= 0) return 0;

  return Math.round((earned / maximum) * 100);
};

/**
 * Calculate percentage with decimals.
 */
export const calculatePercentageDecimal = (score, maxScore, decimals = 2) => {
  const earned = toNumber(score, 0);
  const maximum = toNumber(maxScore, 0);

  if (!maximum || maximum <= 0) return 0;

  return roundNumber((earned / maximum) * 100, decimals);
};

/**
 * Get performance band for a percentage.
 */
export const getPerformanceBand = (percentage) => {
  const value = clampPercentage(percentage);

  return (
    PERFORMANCE_BANDS.find(
      (band) => value >= band.min && value <= band.max
    ) || PERFORMANCE_BANDS[PERFORMANCE_BANDS.length - 1]
  );
};

/**
 * Get grade information.
 */
export const getGradeInfo = (percentage) => {
  const value = clampPercentage(percentage);

  return (
    GRADE_SCALE.find((gradeInfo) => value >= gradeInfo.min) ||
    GRADE_SCALE[GRADE_SCALE.length - 1]
  );
};

/**
 * Backward-compatible grade function.
 *
 * Previous code expects getGrade(percentage) to return a string.
 */
export const getGrade = (percentage) => {
  return getGradeInfo(percentage).grade;
};

/**
 * Get grade description.
 */
export const getGradeDescription = (percentage) => {
  return getGradeInfo(percentage).description;
};

/**
 * Get grade display object.
 */
export const getGradeDisplay = (percentage) => {
  const gradeInfo = getGradeInfo(percentage);

  return {
    letter: gradeInfo.grade,
    description: gradeInfo.description,
    color: gradeInfo.color,
    bg: gradeInfo.bg
  };
};

/**
 * Get overall classification label from total score and max score.
 *
 * Backward-compatible function.
 */
export const getOverallClassification = (totalScore, maxScore = 500) => {
  const percentage = calculatePercentage(totalScore, maxScore);
  return getPerformanceBand(percentage).classification;
};

/**
 * Get classification directly from percentage.
 */
export const getClassificationFromPercentage = (percentage) => {
  return getPerformanceBand(percentage).classification;
};

/**
 * Get classification details with color and description.
 *
 * Backward-compatible function.
 */
export const getClassificationDetails = (totalScore, maxScore = 500) => {
  const percentage = calculatePercentage(totalScore, maxScore);
  const band = getPerformanceBand(percentage);
  const gradeInfo = getGradeInfo(percentage);

  return {
    classification: band.classification,
    percentage,
    grade: gradeInfo.grade,
    gradeDescription: gradeInfo.description,
    band: band.key,
    label: band.label,
    color: band.color,
    bg: band.bg,
    description: band.description,
    strengthLevel: band.strengthLevel,
    developmentLevel: band.developmentLevel
  };
};

/**
 * Get classification details directly from percentage.
 */
export const getClassificationDetailsFromPercentage = (percentage) => {
  const value = clampPercentage(percentage);
  const band = getPerformanceBand(value);
  const gradeInfo = getGradeInfo(value);

  return {
    classification: band.classification,
    percentage: value,
    grade: gradeInfo.grade,
    gradeDescription: gradeInfo.description,
    band: band.key,
    label: band.label,
    color: band.color,
    bg: band.bg,
    description: band.description,
    strengthLevel: band.strengthLevel,
    developmentLevel: band.developmentLevel
  };
};

/**
 * Determine whether a category should be treated as a strength.
 */
export const isStrength = (percentage) => {
  return clampPercentage(percentage) >= REPORT_THRESHOLDS.strengthThreshold;
};

/**
 * Determine whether a category is an exceptional strength.
 */
export const isExceptionalStrength = (percentage) => {
  return (
    clampPercentage(percentage) >= REPORT_THRESHOLDS.strongStrengthThreshold
  );
};

/**
 * Determine whether a category should be treated as a development area.
 */
export const isDevelopmentArea = (percentage) => {
  return clampPercentage(percentage) < REPORT_THRESHOLDS.developmentThreshold;
};

/**
 * Determine whether a category is priority development.
 */
export const isPriorityDevelopment = (percentage) => {
  const value = clampPercentage(percentage);

  return (
    value < REPORT_THRESHOLDS.priorityDevelopmentThreshold &&
    value >= REPORT_THRESHOLDS.criticalThreshold
  );
};

/**
 * Determine whether a category is a critical gap.
 */
export const isCriticalGap = (percentage) => {
  return clampPercentage(percentage) < REPORT_THRESHOLDS.criticalThreshold;
};

/**
 * Get report interpretation level for category/competency.
 */
export const getScoreLevel = (percentage) => {
  const band = getPerformanceBand(percentage);

  return {
    key: band.key,
    label: band.label,
    classification: band.classification,
    strengthLevel: band.strengthLevel,
    developmentLevel: band.developmentLevel,
    description: band.description,
    color: band.color,
    bg: band.bg
  };
};

/**
 * Calculate gap to target.
 */
export const calculateGapToTarget = (
  percentage,
  target = REPORT_THRESHOLDS.targetScore
) => {
  const value = clampPercentage(percentage);
  const targetValue = clampPercentage(target);

  return Math.max(0, roundNumber(targetValue - value, 2));
};

/**
 * Build a complete score summary object.
 */
export const buildScoreSummary = ({
  totalScore = 0,
  maxScore = 0,
  percentage = null
} = {}) => {
  const resolvedPercentage =
    percentage !== null && percentage !== undefined
      ? clampPercentage(percentage)
      : calculatePercentage(totalScore, maxScore);

  const gradeInfo = getGradeInfo(resolvedPercentage);
  const band = getPerformanceBand(resolvedPercentage);

  return {
    totalScore: toNumber(totalScore, 0),
    maxScore: toNumber(maxScore, 0),
    percentage: resolvedPercentage,

    grade: gradeInfo.grade,
    gradeDescription: gradeInfo.description,

    classification: band.classification,
    band: band.key,
    label: band.label,

    color: band.color,
    bg: band.bg,
    description: band.description,

    strengthLevel: band.strengthLevel,
    developmentLevel: band.developmentLevel,

    gapToTarget: calculateGapToTarget(resolvedPercentage)
  };
};

/**
 * Normalize raw category score data.
 *
 * Supports shapes:
 * {
 *   score, maxPossible, percentage
 * }
 *
 * or:
 * {
 *   total, maxPossible
 * }
 */
export const normalizeCategoryScore = (categoryName, data = {}) => {
  const score = toNumber(data.score ?? data.total ?? data.rawScore ?? 0, 0);
  const maxPossible = toNumber(data.maxPossible ?? data.max_score ?? 0, 0);

  const percentage =
    data.percentage !== undefined && data.percentage !== null
