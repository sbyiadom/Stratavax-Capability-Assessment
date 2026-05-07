
// utils/scoring.js

/**
 * CENTRAL SCORING ENGINE (SYNTAX-SAFE)
 *
 * This file intentionally avoids:
 * - optional chaining in exports
 * - complex nested destructuring
 * - trailing commas in risky positions
 *
 * It keeps required exports used by:
 * - stratavaxReportGenerator.js
 * - super-analyzer.js
 * - save-classification.js
 * - report generators
 */

// ======================================================
// BASIC HELPERS
// ======================================================

export const toNumber = function (value, fallback) {
  const defaultValue = fallback === undefined ? 0 : fallback;
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
};

export const clampPercentage = function (value) {
  const num = toNumber(value, 0);

  if (num < 0) return 0;
  if (num > 100) return 100;

  return num;
};

export const roundNumber = function (value, decimals) {
  const d = decimals === undefined ? 2 : decimals;
  const factor = Math.pow(10, d);

  return Math.round(toNumber(value, 0) * factor) / factor;
};

// ======================================================
// PERFORMANCE BANDS
// ======================================================

export const PERFORMANCE_BANDS = [
  {
    key: "exceptional",
    min: 85,
    max: 100,
    label: "Exceptional",
    classification: "High Potential",
    color: "#2E7D32",
    bg: "#E8F5E9",
    description:
      "Strong evidence of capability and readiness for advanced responsibility."
  },
  {
    key: "strong",
    min: 75,
    max: 84,
    label: "Strong",
    classification: "Strong Performer",
    color: "#4CAF50",
    bg: "#E8F5E9",
    description:
      "Reliable capability with clear strengths applicable in role situations."
  },
  {
    key: "adequate",
    min: 65,
    max: 74,
    label: "Adequate",
    classification: "Capable Contributor",
    color: "#1565C0",
    bg: "#E3F2FD",
    description:
      "Functional capability with some areas requiring reinforcement."
  },
  {
    key: "developing",
    min: 55,
    max: 64,
    label: "Developing",
    classification: "Developing",
    color: "#F57C00",
    bg: "#FFF3E0",
    description:
      "Foundational capability requiring structured support."
  },
  {
    key: "priority_development",
    min: 40,
    max: 54,
    label: "Priority Development",
    classification: "At Risk",
    color: "#C62828",
    bg: "#FFEBEE",
    description:
      "Significant gaps requiring targeted development."
  },
  {
    key: "critical_gap",
    min: 0,
    max: 39,
    label: "Critical Gap",
    classification: "High Risk",
    color: "#8B0000",
    bg: "#FFEBEE",
    description:
      "Critical gaps requiring immediate intervention."
  }
];

// ======================================================
// GRADE SCALE
// ======================================================

export const GRADE_SCALE = [
  {
    grade: "A+",
    min: 95,
    max: 100,
    description: "Exceptional"
  },
  {
    grade: "A",
    min: 90,
    max: 94,
    description: "Excellent"
  },
  {
    grade: "A-",
    min: 85,
    max: 89,
    description: "Very Good"
  },
  {
    grade: "B+",
    min: 80,
    max: 84,
    description: "Good"
  },
  {
    grade: "B",
    min: 75,
    max: 79,
    description: "Satisfactory"
  },
  {
    grade: "B-",
    min: 70,
    max: 74,
    description: "Adequate"
  },
  {
    grade: "C+",
    min: 65,
    max: 69,
    description: "Developing"
  },
  {
    grade: "C",
    min: 60,
    max: 64,
    description: "Basic Competency"
  },
  {
    grade: "C-",
    min: 55,
    max: 59,
    description: "Minimum Competency"
  },
  {
    grade: "D",
    min: 40,
    max: 54,
    description: "Below Expectations"
  },
  {
    grade: "F",
    min: 0,
    max: 39,
    description: "Unsatisfactory"
  }
];

// ======================================================
// SCORING CALCULATIONS
// ======================================================

export const calculateTotalScore = function (responses) {
  if (!Array.isArray(responses)) return 0;

  return responses.reduce(function (sum, response) {
    if (!response) return sum;

    const score =
      response.score ||
      (response.answer && response.answer.score) ||
      response.selected_score ||
      response.value ||
      0;

    return sum + toNumber(score, 0);
  }, 0);
};

export const calculateMaxScore = function (questions, fallbackMaxPerQuestion) {
  if (!Array.isArray(questions)) return 0;

  const defaultMax = fallbackMaxPerQuestion === undefined ? 5 : fallbackMaxPerQuestion;

  return questions.reduce(function (sum, question) {
    if (!question) return sum;

    const directMax =
      question.maxScore ||
      question.max_score ||
      question.score ||
      question.points;

    if (directMax !== undefined && directMax !== null) {
      return sum + toNumber(directMax, defaultMax);
    }

    if (Array.isArray(question.options) && question.options.length > 0) {
      const optionScores = question.options.map(function (option) {
        if (!option) return 0;

        return toNumber(
          option.score ||
            option.value ||
            option.points ||
            0,
          0
        );
      });

      const maxOptionScore = Math.max.apply(null, optionScores);

      return sum + toNumber(maxOptionScore, defaultMax);
    }

    return sum + toNumber(defaultMax, 5);
  }, 0);
};

export const calculatePercentage = function (score, maxScore) {
  const earned = toNumber(score, 0);
  const max = toNumber(maxScore, 0);

  if (max <= 0) return 0;

  return Math.round((earned / max) * 100);
};

export const calculateAverageScore = function (responses) {
  if (!Array.isArray(responses) || responses.length === 0) return 0;

  const total = calculateTotalScore(responses);

  return roundNumber(total / responses.length, 2);
};

// ======================================================
// LOOKUPS
// ======================================================

export const getPerformanceBand = function (percentage) {
  const value = clampPercentage(percentage);

  for (let i = 0; i < PERFORMANCE_BANDS.length; i += 1) {
    const band = PERFORMANCE_BANDS[i];

    if (value >= band.min && value <= band.max) {
      return band;
    }
  }

  return PERFORMANCE_BANDS[PERFORMANCE_BANDS.length - 1];
};

export const getGradeInfo = function (percentage) {
  const value = clampPercentage(percentage);

  for (let i = 0; i < GRADE_SCALE.length; i += 1) {
    const grade = GRADE_SCALE[i];

    if (value >= grade.min && value <= grade.max) {
      return grade;
    }
  }

  return GRADE_SCALE[GRADE_SCALE.length - 1];
};

export const getGrade = function (percentage) {
  return getGradeInfo(percentage).grade;
};

export const getClassificationDetailsFromPercentage = function (percentage) {
  const band = getPerformanceBand(percentage);
  const gradeInfo = getGradeInfo(percentage);

  return {
    percentage: clampPercentage(percentage),
    grade: gradeInfo.grade,
    gradeDescription: gradeInfo.description,
    classification: band.classification,
    band: band.key,
    label: band.label,
    color: band.color,
    bg: band.bg,
    description: band.description
  };
};

export const classifyScore = function (score, maxScore) {
  const percentage = calculatePercentage(score, maxScore);
  const details = getClassificationDetailsFromPercentage(percentage);

  return {
    totalScore: toNumber(score, 0),
    maxScore: toNumber(maxScore, 0),
    percentage: percentage,
    grade: details.grade,
    gradeDescription: details.gradeDescription,
    classification: details.classification,
    band: details.band,
    label: details.label,
    color: details.color,
    bg: details.bg,
    description: details.description
  };
};


// Alias used by pages/api/save-classification.js
// Accepts (score, maxScore) or (percentage) depending on caller.
export const getOverallClassification = function (scoreOrPercentage, maxScore) {
  if (maxScore !== undefined && maxScore !== null) {
    return classifyScore(scoreOrPercentage, maxScore);
  }
  return getClassificationDetailsFromPercentage(scoreOrPercentage);
};

export const calculateAssessmentScore = function (responses, questions) {
  const totalScore = calculateTotalScore(responses);
  const maxScore = calculateMaxScore(questions);
  const percentage = calculatePercentage(totalScore, maxScore);
  const details = getClassificationDetailsFromPercentage(percentage);

  return {
    totalScore: totalScore,
    maxScore: maxScore,
    percentage: percentage,
    grade: details.grade,
    gradeDescription: details.gradeDescription,
    classification: details.classification,
    band: details.band,
    label: details.label,
    color: details.color,
    bg: details.bg,
    description: details.description
  };
};

// ======================================================
// INTERPRETATION HELPERS
// ======================================================

export const isStrength = function (percentage) {
  return clampPercentage(percentage) >= 75;
};

export const isDevelopmentArea = function (percentage) {
  return clampPercentage(percentage) < 65;
};

export const isCriticalGap = function (percentage) {
  return clampPercentage(percentage) < 40;
};

export const isPriorityDevelopment = function (percentage) {
  const value = clampPercentage(percentage);

  return value >= 40 && value < 55;
};

export const getScoreComment = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= 85) return "Exceptional performance";
  if (value >= 75) return "Strong performance";
  if (value >= 65) return "Adequate capability";
  if (value >= 55) return "Developing capability";
  if (value >= 40) return "Priority development needed";

  return "Critical development needed";
};

export const getSupervisorImplication = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= 75) {
    return "Candidate can perform reliably with standard supervision.";
  }

  if (value >= 65) {
    return "Candidate can perform with guidance and reinforcement.";
  }

  if (value >= 55) {
    return "Candidate requires structured support and supervision.";
  }

  return "Candidate requires close supervision and targeted development.";
};

export const calculateGapToTarget = function (percentage, target) {
  const tgt = target === undefined ? 80 : target;
  const value = clampPercentage(percentage);

  if (value >= tgt) return 0;

  return roundNumber(tgt - value, 2);
};

export const getRiskLevel = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= 75) return "Low";
  if (value >= 65) return "Moderate";
  if (value >= 55) return "Elevated";
  if (value >= 40) return "High";

  return "Critical";
};

export const getReadinessLevel = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= 85) return "Ready for advanced responsibility";
  if (value >= 75) return "Ready with normal supervision";
  if (value >= 65) return "Ready with reinforcement";
  if (value >= 55) return "Partially ready";
  if (value >= 40) return "Not yet ready";

  return "Requires immediate development";
};

// ======================================================
// CATEGORY / DIMENSION HELPERS
// ======================================================

export const calculateCategoryScores = function (responses) {
  if (!Array.isArray(responses)) return [];

  const grouped = {};

  responses.forEach(function (response) {
    if (!response) return;

    const category =
      response.category ||
      response.dimension ||
      response.competency ||
      "General";

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        totalScore: 0,
        maxScore: 0,
        count: 0
      };
    }

    const score =
      response.score ||
      (response.answer && response.answer.score) ||
      response.selected_score ||
      response.value ||
      0;

    const maxScore =
      response.maxScore ||
      response.max_score ||
      response.max ||
      5;

    grouped[category].totalScore += toNumber(score, 0);
    grouped[category].maxScore += toNumber(maxScore, 5);
    grouped[category].count += 1;
  });

  return Object.keys(grouped).map(function (key) {
    const item = grouped[key];
    const percentage = calculatePercentage(item.totalScore, item.maxScore);
    const details = getClassificationDetailsFromPercentage(percentage);

    return {
      category: item.category,
      totalScore: item.totalScore,
      maxScore: item.maxScore,
      count: item.count,
      percentage: percentage,
      grade: details.grade,
      classification: details.classification,
      label: details.label,
      color: details.color,
      bg: details.bg,
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      riskLevel: getRiskLevel(percentage),
      gapToTarget: calculateGapToTarget(percentage, 80)
    };
  });
};

export const getTopStrengths = function (categoryScores, limit) {
  if (!Array.isArray(categoryScores)) return [];

  const maxItems = limit === undefined ? 3 : limit;

  return categoryScores
    .filter(function (item) {
      return item && isStrength(item.percentage);
    })
    .sort(function (a, b) {
      return toNumber(b.percentage, 0) - toNumber(a.percentage, 0);
    })
    .slice(0, maxItems);
};

export const getDevelopmentAreas = function (categoryScores, limit) {
  if (!Array.isArray(categoryScores)) return [];

  const maxItems = limit === undefined ? 3 : limit;

  return categoryScores
    .filter(function (item) {
      return item && isDevelopmentArea(item.percentage);
    })
    .sort(function (a, b) {
      return toNumber(a.percentage, 0) - toNumber(b.percentage, 0);
    })
    .slice(0, maxItems);
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  PERFORMANCE_BANDS: PERFORMANCE_BANDS,
  GRADE_SCALE: GRADE_SCALE,

  toNumber: toNumber,
  clampPercentage: clampPercentage,
  roundNumber: roundNumber,

  calculateTotalScore: calculateTotalScore,
  calculateMaxScore: calculateMaxScore,
  calculatePercentage: calculatePercentage,
  calculateAverageScore: calculateAverageScore,
  calculateAssessmentScore: calculateAssessmentScore,
  classifyScore: classifyScore,
  getOverallClassification: getOverallClassification,

  getPerformanceBand: getPerformanceBand,
  getGradeInfo: getGradeInfo,
  getGrade: getGrade,
  getClassificationDetailsFromPercentage: getClassificationDetailsFromPercentage,

  isStrength: isStrength,
  isDevelopmentArea: isDevelopmentArea,
  isCriticalGap: isCriticalGap,
  isPriorityDevelopment: isPriorityDevelopment,

  getScoreComment: getScoreComment,
  getSupervisorImplication: getSupervisorImplication,
  calculateGapToTarget: calculateGapToTarget,
  getRiskLevel: getRiskLevel,
  getReadinessLevel: getReadinessLevel,

  calculateCategoryScores: calculateCategoryScores,
  getTopStrengths: getTopStrengths,
  getDevelopmentAreas: getDevelopmentAreas
};
