// utils/scoring.js

/**
 * CENTRAL SCORING ENGINE
 *
 * Corrected version:
 * - Supports TWO scoring models:
 *   1) Baseline exact-match scoring (multi-select, exact set match = 1, else 0)
 *   2) All other assessments (single-select, answer-weighted, real max per question)
 * - Removes incorrect fixed max-score assumptions
 * - Keeps broad backward compatibility for existing imports across the project
 * - Provides shared helpers for category, competency, API, report, and PDF generation
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

export const normalizeText = function (value, fallback) {
  const fallbackValue = fallback === undefined ? "" : fallback;

  if (value === null || value === undefined || value === "") {
    return fallbackValue;
  }

  return String(value)
    .replace(/&amp;amp;/g, "&")
    .replace(/&amp;lt;/g, "<")
    .replace(/&amp;gt;/g, ">")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;#039;/g, "'")
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;nbsp;/g, " ");
};

export const safeArray = function (value) {
  return Array.isArray(value) ? value : [];
};

// ======================================================
// THRESHOLDS
// ======================================================

export const REPORT_THRESHOLDS = {
  strongStrengthThreshold: 85,
  strengthThreshold: 75,
  developmentThreshold: 65,
  priorityThreshold: 55,
  criticalThreshold: 40,
  targetScore: 80
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
    classification: "Exceptional",
    color: "#0f766e",
    bg: "#ecfdf5",
    description:
      "Strong evidence of capability and readiness for advanced responsibility."
  },
  {
    key: "strong",
    min: 75,
    max: 84.9999,
    label: "Strong",
    classification: "Strong Performer",
    color: "#2563eb",
    bg: "#eff6ff",
    description:
      "Reliable capability with clear strengths applicable in role situations."
  },
  {
    key: "adequate",
    min: 65,
    max: 74.9999,
    label: "Capable",
    classification: "Capable Contributor",
    color: "#4f46e5",
    bg: "#eef2ff",
    description:
      "Functional capability with some areas requiring reinforcement."
  },
  {
    key: "developing",
    min: 55,
    max: 64.9999,
    label: "Developing",
    classification: "Developing",
    color: "#d97706",
    bg: "#fff7ed",
    description:
      "Foundational capability requiring structured support."
  },
  {
    key: "priority_development",
    min: 40,
    max: 54.9999,
    label: "At Risk",
    classification: "At Risk",
    color: "#ea580c",
    bg: "#fff7ed",
    description:
      "Significant gaps requiring targeted development."
  },
  {
    key: "critical_gap",
    min: 0,
    max: 39.9999,
    label: "High Risk",
    classification: "High Risk",
    color: "#b42318",
    bg: "#fef3f2",
    description:
      "Critical gaps requiring immediate intervention."
  }
];

// ======================================================
// GRADE SCALE
// ======================================================

export const GRADE_SCALE = [
  { grade: "A+", min: 95, max: 100, description: "Exceptional", color: "#0f766e", bg: "#ecfdf5" },
  { grade: "A", min: 90, max: 94.9999, description: "Excellent", color: "#059669", bg: "#ecfdf5" },
  { grade: "A-", min: 85, max: 89.9999, description: "Very Good", color: "#047857", bg: "#ecfdf5" },
  { grade: "B+", min: 80, max: 84.9999, description: "Good", color: "#2563eb", bg: "#eff6ff" },
  { grade: "B", min: 75, max: 79.9999, description: "Satisfactory", color: "#1d4ed8", bg: "#eff6ff" },
  { grade: "B-", min: 70, max: 74.9999, description: "Adequate", color: "#4f46e5", bg: "#eef2ff" },
  { grade: "C+", min: 65, max: 69.9999, description: "Developing", color: "#7c3aed", bg: "#f5f3ff" },
  { grade: "C", min: 60, max: 64.9999, description: "Basic Competency", color: "#d97706", bg: "#fff7ed" },
  { grade: "C-", min: 55, max: 59.9999, description: "Minimum Competency", color: "#ea580c", bg: "#fff7ed" },
  { grade: "D", min: 40, max: 54.9999, description: "Below Expectations", color: "#dc2626", bg: "#fef2f2" },
  { grade: "F", min: 0, max: 39.9999, description: "Unsatisfactory", color: "#991b1b", bg: "#fef2f2" }
];

// ======================================================
// BASELINE + WEIGHTED QUESTION HELPERS
// ======================================================

export const parseSelectedAnswerIds = function (answerValue) {
  if (answerValue === null || answerValue === undefined || answerValue === "") return [];

  if (Array.isArray(answerValue)) {
    return answerValue
      .map(function (value) { return parseInt(value, 10); })
      .filter(function (value) { return !Number.isNaN(value); });
  }

  const text = String(answerValue);

  if (text.indexOf(",") >= 0) {
    return text
      .split(",")
      .map(function (value) { return parseInt(String(value).trim(), 10); })
      .filter(function (value) { return !Number.isNaN(value); });
  }

  const parsed = parseInt(text, 10);
  return Number.isNaN(parsed) ? [] : [parsed];
};

export const getQuestionFromResponse = function (response) {
  if (!response) return null;
  return response.unique_questions || response.question || null;
};

export const getQuestionAnswers = function (question) {
  if (!question) return [];

  if (Array.isArray(question.unique_answers)) return question.unique_answers;
  if (Array.isArray(question.answers)) return question.answers;
  if (Array.isArray(question.options)) return question.options;

  return [];
};

export const getAnswerScoreValue = function (answer) {
  if (!answer) return 0;

  return toNumber(
    answer.score !== undefined
      ? answer.score
      : answer.value !== undefined
      ? answer.value
      : answer.points !== undefined
      ? answer.points
      : 0,
    0
  );
};

export const getQuestionMaxScore = function (question, isBaseline) {
  const answers = getQuestionAnswers(question);

  if (isBaseline) return 1;
  if (answers.length === 0) return 0;

  return Math.max.apply(
    null,
    answers.map(function (answer) {
      return getAnswerScoreValue(answer);
    })
  );
};

export const getCorrectAnswerIdsForBaseline = function (question) {
  return getQuestionAnswers(question)
    .filter(function (answer) {
      return getAnswerScoreValue(answer) === 1;
    })
    .map(function (answer) {
      return parseInt(answer.id, 10);
    })
    .filter(function (id) {
      return !Number.isNaN(id);
    });
};

export const arraysMatchExactly = function (left, right) {
  const a = Array.isArray(left)
    ? Array.from(new Set(left)).sort(function (x, y) { return x - y; })
    : [];
  const b = Array.isArray(right)
    ? Array.from(new Set(right)).sort(function (x, y) { return x - y; })
    : [];

  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }

  return true;
};

export const scoreQuestionResponse = function (response, isBaseline) {
  const question = getQuestionFromResponse(response);
  const answers = getQuestionAnswers(question);
  const selectedAnswerIds = parseSelectedAnswerIds(
    response && (response.answer_id !== undefined ? response.answer_id : response.selected_answer_id)
  );

  if (!question || answers.length === 0) {
    return {
      score: toNumber(response && response.score, 0),
      maxScore: isBaseline ? 1 : toNumber(response && response.max_score, 0)
    };
  }

  if (isBaseline) {
    const correctAnswerIds = getCorrectAnswerIdsForBaseline(question);
    const earned = arraysMatchExactly(selectedAnswerIds, correctAnswerIds) ? 1 : 0;

    return {
      score: earned,
      maxScore: 1,
      correctAnswerIds: correctAnswerIds,
      selectedAnswerIds: selectedAnswerIds
    };
  }

  const selectedId = selectedAnswerIds.length > 0 ? selectedAnswerIds[0] : null;
  let selectedAnswer = null;

  if (selectedId !== null) {
    selectedAnswer = answers.find(function (answer) {
      return String(answer.id) === String(selectedId);
    }) || null;
  }

  return {
    score: selectedAnswer
      ? getAnswerScoreValue(selectedAnswer)
      : toNumber(
          response && (response.score !== undefined ? response.score : response.selected_score),
          0
        ),
    maxScore: getQuestionMaxScore(question, false),
    selectedAnswerIds: selectedAnswerIds
  };
};

export const isBaselineAssessmentType = function (assessmentTypeOrId) {
  const normalized = String(assessmentTypeOrId === undefined || assessmentTypeOrId === null ? "" : assessmentTypeOrId)
    .trim()
    .toLowerCase();

  return (
    normalized === "19" ||
    normalized === "baseline" ||
    normalized === "manufacturing_baseline_baseline"
  );
};

// ======================================================
// SCORING CALCULATIONS
// ======================================================

export const calculateTotalScore = function (responses, isBaseline) {
  if (!Array.isArray(responses)) return 0;

  return responses.reduce(function (sum, response) {
    if (!response) return sum;

    if (getQuestionFromResponse(response)) {
      return sum + scoreQuestionResponse(response, Boolean(isBaseline)).score;
    }

    const score =
      response.score !== undefined
        ? response.score
        : response.answer && response.answer.score !== undefined
        ? response.answer.score
        : response.selected_score !== undefined
        ? response.selected_score
        : response.value !== undefined
        ? response.value
        : 0;

    return sum + toNumber(score, 0);
  }, 0);
};

export const calculateMaxScore = function (questions, fallbackMaxPerQuestion, isBaseline) {
  if (!Array.isArray(questions)) return 0;

  const defaultMax = fallbackMaxPerQuestion === undefined ? 0 : fallbackMaxPerQuestion;

  return questions.reduce(function (sum, question) {
    if (!question) return sum;

    const max = getQuestionMaxScore(question, Boolean(isBaseline));

    if (max > 0) return sum + max;

    const directMax =
      question.maxScore !== undefined
        ? question.maxScore
        : question.max_score !== undefined
        ? question.max_score
        : question.score !== undefined
        ? question.score
        : question.points !== undefined
        ? question.points
        : null;

    if (directMax !== undefined && directMax !== null) {
      return sum + toNumber(directMax, defaultMax);
    }

    return sum + toNumber(defaultMax, 0);
  }, 0);
};

export const calculatePercentage = function (score, maxScore) {
  const earned = toNumber(score, 0);
  const max = toNumber(maxScore, 0);

  if (max <= 0) return 0;

  return roundNumber((earned / max) * 100, 2);
};

export const calculateAverageScore = function (responses, isBaseline) {
  if (!Array.isArray(responses) || responses.length === 0) return 0;

  const total = calculateTotalScore(responses, isBaseline);

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

export const getGradeDescription = function (percentage) {
  return getGradeInfo(percentage).description;
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
    description: band.description,
    min: gradeInfo.min,
    max: gradeInfo.max
  };
};

export const getClassificationFromPercentage = function (percentage) {
  return getClassificationDetailsFromPercentage(percentage).classification;
};

export const getScoreLevel = function (percentage) {
  const details = getClassificationDetailsFromPercentage(percentage);

  return {
    key: details.band,
    label: details.label,
    classification: details.classification,
    color: details.color,
    bg: details.bg,
    description: details.description
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

/**
 * Backward-compatible helper.
 * Returns the classification STRING because several API files save this directly to the DB.
 */
export const getOverallClassification = function (scoreOrPercentage, maxScore) {
  if (maxScore !== undefined && maxScore !== null) {
    return getClassificationFromPercentage(calculatePercentage(scoreOrPercentage, maxScore));
  }

  return getClassificationFromPercentage(scoreOrPercentage);
};

export const calculateAssessmentScore = function (responses, questions, isBaseline) {
  const totalScore = calculateTotalScore(responses, isBaseline);
  const maxScore = calculateMaxScore(questions, 0, isBaseline);
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
  return clampPercentage(percentage) >= REPORT_THRESHOLDS.strengthThreshold;
};

export const isDevelopmentArea = function (percentage) {
  return clampPercentage(percentage) < REPORT_THRESHOLDS.developmentThreshold;
};

export const isCriticalGap = function (percentage) {
  return clampPercentage(percentage) < REPORT_THRESHOLDS.criticalThreshold;
};

export const isPriorityDevelopment = function (percentage) {
  const value = clampPercentage(percentage);

  return value >= REPORT_THRESHOLDS.criticalThreshold && value < REPORT_THRESHOLDS.priorityThreshold;
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
  const tgt = target === undefined ? REPORT_THRESHOLDS.targetScore : target;
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

export const normalizeCategoryScore = function (category, data) {
  const safeCategory = normalizeText(category, "General");
  const item = data || {};

  const score = toNumber(
    item.score !== undefined
      ? item.score
      : item.total !== undefined
      ? item.total
      : item.totalScore !== undefined
      ? item.totalScore
      : item.rawScore !== undefined
      ? item.rawScore
      : 0,
    0
  );

  const maxPossible = toNumber(
    item.maxPossible !== undefined
      ? item.maxPossible
      : item.max_score !== undefined
      ? item.max_score
      : item.maxScore !== undefined
      ? item.maxScore
      : 0,
    0
  );

  const percentage =
    item.percentage !== undefined && item.percentage !== null
      ? clampPercentage(item.percentage)
      : maxPossible > 0
      ? calculatePercentage(score, maxPossible)
      : 0;

  const details = getClassificationDetailsFromPercentage(percentage);

  return {
    category: safeCategory,
    name: safeCategory,
    score: score,
    totalScore: score,
    maxPossible: maxPossible,
    maxScore: maxPossible,
    percentage: percentage,
    grade: details.grade,
    gradeDescription: details.gradeDescription,
    classification: details.classification,
    band: details.band,
    label: details.label,
    color: details.color,
    bg: details.bg,
    description: details.description,
    performanceComment: getScoreComment(percentage),
    supervisorImplication: getSupervisorImplication(percentage),
    riskLevel: getRiskLevel(percentage),
    gapToTarget: calculateGapToTarget(percentage)
  };
};

export const normalizeCategoryScores = function (categoryScores) {
  if (Array.isArray(categoryScores)) {
    return categoryScores.map(function (item) {
      const category =
        item && (item.category !== undefined ? item.category : item.name !== undefined ? item.name : "General");
      return normalizeCategoryScore(category, item || {});
    });
  }

  return Object.keys(categoryScores || {}).map(function (category) {
    return normalizeCategoryScore(category, categoryScores[category] || {});
  });
};

export const calculateCategoryScores = function (responses, isBaseline) {
  if (!Array.isArray(responses)) return [];

  const grouped = {};

  responses.forEach(function (response) {
    if (!response) return;

    const question = getQuestionFromResponse(response) || {};
    const category = normalizeText(
      question.section !== undefined
        ? question.section
        : question.category !== undefined
        ? question.category
        : question.competency !== undefined
        ? question.competency
        : question.dimension !== undefined
        ? question.dimension
        : response.category !== undefined
        ? response.category
        : response.dimension !== undefined
        ? response.dimension
        : response.competency !== undefined
        ? response.competency
        : "General",
      "General"
    );

    const scored = scoreQuestionResponse(response, Boolean(isBaseline));

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        totalScore: 0,
        maxPossible: 0,
        count: 0
      };
    }

    grouped[category].totalScore += scored.score;
    grouped[category].maxPossible += scored.maxScore;
    grouped[category].count += 1;
  });

  return Object.keys(grouped).map(function (key) {
    const item = grouped[key];
    const percentage = calculatePercentage(item.totalScore, item.maxPossible);
    const details = getClassificationDetailsFromPercentage(percentage);

    return {
      category: item.category,
      name: item.category,
      totalScore: roundNumber(item.totalScore, 2),
      score: roundNumber(item.totalScore, 2),
      maxPossible: roundNumber(item.maxPossible, 2),
      maxScore: roundNumber(item.maxPossible, 2),
      count: item.count,
      questionCount: item.count,
      percentage: percentage,
      grade: details.grade,
      classification: details.classification,
      label: details.label,
      color: details.color,
      bg: details.bg,
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      riskLevel: getRiskLevel(percentage),
      gapToTarget: calculateGapToTarget(percentage)
    };
  });
};

export const getStrengthAreas = function (categoryScores, limit) {
  const normalized = normalizeCategoryScores(categoryScores);
  const maxItems = limit === undefined ? 3 : limit;

  return normalized
    .filter(function (item) {
      return item && isStrength(item.percentage);
    })
    .sort(function (a, b) {
      return toNumber(b.percentage, 0) - toNumber(a.percentage, 0);
    })
    .slice(0, maxItems);
};

export const getTopStrengths = function (categoryScores, limit) {
  return getStrengthAreas(categoryScores, limit);
};

export const getDevelopmentAreas = function (categoryScores, limit) {
  const normalized = normalizeCategoryScores(categoryScores);
  const maxItems = limit === undefined ? 3 : limit;

  return normalized
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
  REPORT_THRESHOLDS: REPORT_THRESHOLDS,
  PERFORMANCE_BANDS: PERFORMANCE_BANDS,
  GRADE_SCALE: GRADE_SCALE,

  toNumber: toNumber,
  clampPercentage: clampPercentage,
  roundNumber: roundNumber,
  normalizeText: normalizeText,
  safeArray: safeArray,

  parseSelectedAnswerIds: parseSelectedAnswerIds,
  getQuestionFromResponse: getQuestionFromResponse,
  getQuestionAnswers: getQuestionAnswers,
  getAnswerScoreValue: getAnswerScoreValue,
  getQuestionMaxScore: getQuestionMaxScore,
  getCorrectAnswerIdsForBaseline: getCorrectAnswerIdsForBaseline,
  arraysMatchExactly: arraysMatchExactly,
  scoreQuestionResponse: scoreQuestionResponse,
  isBaselineAssessmentType: isBaselineAssessmentType,

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
  getGradeDescription: getGradeDescription,
  getScoreLevel: getScoreLevel,
  getClassificationDetailsFromPercentage: getClassificationDetailsFromPercentage,
  getClassificationFromPercentage: getClassificationFromPercentage,

  isStrength: isStrength,
  isDevelopmentArea: isDevelopmentArea,
  isCriticalGap: isCriticalGap,
  isPriorityDevelopment: isPriorityDevelopment,

  getScoreComment: getScoreComment,
  getSupervisorImplication: getSupervisorImplication,
  calculateGapToTarget: calculateGapToTarget,
  getRiskLevel: getRiskLevel,
  getReadinessLevel: getReadinessLevel,

  normalizeCategoryScore: normalizeCategoryScore,
  normalizeCategoryScores: normalizeCategoryScores,
  calculateCategoryScores: calculateCategoryScores,
  getStrengthAreas: getStrengthAreas,
  getTopStrengths: getTopStrengths,
  getDevelopmentAreas: getDevelopmentAreas
};
