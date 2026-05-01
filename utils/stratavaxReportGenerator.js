// utils/stratavaxReportGenerator.js

/**
 * STRATAVAX PROFESSIONAL REPORT GENERATOR
 *
 * Syntax-safeexport const buildStrengthsNarrative = function ( * Syntax-safe corrected version.
  strengths,
  assessmentType,
  classification,
  seed
) {
  if (!Array.isArray(strengths) || strengths.length === 0) {
    return "No category reached the current strength threshold. Development should focus first on building baseline competence before assigning advanced responsibility.";
  }

  const topStrengths = strengths.slice(0, 3);
  const names = topStrengths
    .map(function (item) {
      return item.area;
    })
    .join(", ");

  const phrases = [
    "The candidate shows strongest evidence of capability in " +
      names +
      ". These areas can be used as a foundation for role placement, coaching, or gradual responsibility expansion.",
    "The strongest performance areas are " +
      names +
      ". These strengths should be considered when assigning tasks, pairing the candidate with mentors, or planning development activities.",
    "Results indicate relative strengths in " +
      names +
      ". These areas may provide useful leverage while the supervisor addresses weaker competencies."
  ];

  return selectPhrase(phrases, String(seed || "") + "-strengths");
};

export const buildWeaknessesNarrative = function (
  weaknesses,
  assessmentType,
  classification,
  seed
) {
  if (!Array.isArray(weaknesses) || weaknesses.length === 0) {
    return "No major development area was identified below the current development threshold. Continued reinforcement and practical validation are still recommended.";
  }

  const topWeaknesses = weaknesses.slice(0, 3);
  const names = topWeaknesses
    .map(function (item) {
      return item.area;
    })
    .join(", ");

  const phrases = [
    "Priority development should focus on " +
      names +
      ". These areas show the largest gaps and may affect role readiness without structured support.",
    "The main development needs are " +
      names +
      ". Targeted coaching, practice, and supervisor follow-up are recommended before assigning complex responsibilities in these areas.",
    "Results suggest that " +
      names +
      " require attention. These areas should be included in the candidate's development plan and reviewed after training or practical exposure."
  ];

  return selectPhrase(phrases, String(seed || "") + "-weaknesses");
};

export const generateExecutiveSummary = function (
  candidateName,
  totalScore,
  maxScore,
  percentage,
  classification,
  strengths,
  weaknesses,
  assessmentType,
  seed
) {
  const template = getTemplate(assessmentType);
  const scoreText = String(totalScore) + "/" + String(maxScore) + " (" + String(percentage) + "%)";

  const introOptions = [
    String(candidateName) +
      " completed the " +
      template.name +
      " with an overall score of " +
      scoreText +
      ".",
    "The " +
      template.name +
      " result for " +
      String(candidateName) +
      " shows an overall score of " +
      scoreText +
      ".",
    String(candidateName) +
      "'s " +
      template.name +
      " produced an overall result of " +
      scoreText +
      "."
  ];

  const intro = selectPhrase(introOptions, String(seed || "") + "-intro");

  const strengthSentence =
    Array.isArray(strengths) && strengths.length > 0
      ? " Key strengths include " +
        strengths
          .slice(0, 3)
          .map(function (item) {
            return item.area;
          })
          .join(", ") +
        "."
      : " No category reached the strength threshold.";

  const weaknessSentence =
    Array.isArray(weaknesses) && weaknesses.length > 0
      ? " Priority development areas include " +
        weaknesses
          .slice(0, 3)
          .map(function (item) {
            return item.area;
          })
          .join(", ") +
        "."
      : " No major development area was identified below the development threshold.";

  return (
    intro +
    strengthSentence +
    weaknessSentence +
    " " +
    classification.description
  );
};

// ======================================================
// REPORT SECTION GENERATORS
// ======================================================

export const generateCoverPage = function (
  candidateName,
  assessmentType,
  dateTaken,
  reportDate
) {
  const template = getTemplate(assessmentType);

  return {
    candidateName: candidateName,
    assessmentName: template.name,
    assessmentIcon: template.icon,
    dateTaken: dateTaken,
    reportGenerated: reportDate,
    confidentiality: "CONFIDENTIAL - For internal use only",
    branding: "Stratavax"
  };
};

export const getPerformanceComment = function (percentage) {
  return getScoreComment(percentage);
};

export const generateScoreBreakdown = function (categoryScores) {
  return Object.entries(categoryScores || {}).map(function (entry) {
    const category = entry[0];
    const data = entry[1] || {};

    const percentage = safeNumber(data.percentage, 0);
    const gradeInfo = getCentralGradeInfo(percentage);
    const scoreValue = safeNumber(data.score !== undefined ? data.score : data.total, 0);
    const maxPossible = safeNumber(data.maxPossible, 0);

    return {
      category: category,
      score: String(scoreValue) + "/" + String(maxPossible),
      percentage: percentage,
      grade: gradeInfo.grade,
      comment: getPerformanceComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage)
    };
  });
};

export const generateChartData = function (categoryScores) {
  return {
    labels: Object.keys(categoryScores || {}).map(function (category) {
      if (category.length > 15) {
        return category.substring(0, 15) + "...";
      }

      return category;
    }),
    datasets: [
      {
        data: Object.values(categoryScores || {}).map(function (item) {
          return safeNumber(item.percentage, 0);
        }),
        backgroundColor: Object.values(categoryScores || {}).map(function (item) {
          const details = getClassificationDetailsFromPercentage(
            safeNumber(item.percentage, 0)
          );

          return details.color;
        })
      }
    ]
  };
};

export const generateStructuredRecommendations = function (
  weaknesses,
  strengths,
  assessmentType,
  seed
) {
  const recommendations = [];

  const sortedWeaknesses = Array.isArray(weaknesses)
    ? weaknesses.slice().sort(function (a, b) {
        return a.percentage - b.percentage;
      })
    : [];

  sortedWeaknesses.slice(0, 4).forEach(function (weakness) {
    const area = weakness.area;
    const percentage = safeNumber(weakness.percentage, 0);
    const gap = calculateGapToTarget(percentage);

    let priority = "Medium";

    if (percentage < 40) {
      priority = "Critical";
    } else if (percentage < 55) {
      priority = "High";
    } else if (percentage < 65) {
      priority = "Medium";
    } else {
      priority = "Low";
    }

    recommendations.push({
      priority: priority,
      category: area,
      recommendation:
        "Strengthen " +
        area +
        ". Assessment evidence suggests this area requires structured development.",
      action:
        priority === "Critical" || priority === "High"
          ? "Provide structured training, supervised practice, and weekly check-ins for " +
            area +
            "."
          : "Provide targeted practice and feedback in " + area + ".",
      impact:
        gap > 0
          ? "Improving " +
            area +
            " by " +
            gap +
            "% will help move the candidate closer to the recommended 80% target."
          : "Maintaining " + area + " will support consistent role performance."
    });
  });

  const safeStrengths = Array.isArray(strengths) ? strengths : [];

  safeStrengths.slice(0, 2).forEach(function (strength) {
    const area = strength.area;

    recommendations.push({
      priority: "Leverage",
      category: area,
      recommendation:
        "Leverage strength in " +
        area +
        ". Assessment evidence suggests this area can support role contribution.",
      action:
        "Use " +
        area +
        " through mentoring, guided responsibility, or role-relevant assignments.",
      impact:
        "Applying this strength can improve confidence, contribution, and development momentum."
    });
  });

  return recommendations;
};

// ======================================================
// MAIN REPORT GENERATOR
// ======================================================

export const generateStratavaxReport = function (
  userId,
  assessmentType,
  responses,
  candidateName,
  dateTaken
) {
  const safeResponses = Array.isArray(responses) ? responses : [];
  const safeAssessmentType = normalizeAssessmentType(assessmentType);
  const template = getTemplate(safeAssessmentType);
  const safeDateTaken = dateTaken || new Date().toISOString();

  const categoryScores = {};
  let totalScore = 0;

  safeResponses.forEach(function (response) {
    const question = response.unique_questions || response.question || {};
    const answer = response.unique_answers || response.answer || {};

    const section = normalizeText(
      question.section ||
        question.category ||
        question.subsection ||
        "General"
    );

    const score = safeNumber(
      answer.score !== undefined ? answer.score : response.score,
      0
    );

    totalScore += score;

    if (!categoryScores[section]) {
      categoryScores[section] = {
        total: 0,
        count: 0,
        maxPossible: 0,
        average: 0,
        percentage: 0,
        score: 0
      };
    }

    categoryScores[section].total += score;
    categoryScores[section].count += 1;
    categoryScores[section].maxPossible += 5;
  });

  Object.keys(categoryScores).forEach(function (section) {
    const data = categoryScores[section];

    data.percentage =
      data.maxPossible > 0
        ? calculatePercentage(data.total, data.maxPossible)
        : 0;

    data.average =
      data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0;

    data.score = data.total;

    const gradeInfo = getCentralGradeInfo(data.percentage);
    const classificationDetails = getClassificationDetailsFromPercentage(
      data.percentage
    );

    data.grade = gradeInfo.grade;
    data.gradeDescription = gradeInfo.description;
    data.comment = getPerformanceComment(data.percentage);
    data.classification = classificationDetails.classification;
    data.band = classificationDetails.band;
    data.supervisorImplication = getSupervisorImplication(data.percentage);
  });

  const maxScore = safeResponses.length * 5;
  const percentageScore =
    maxScore > 0 ? calculatePercentage(totalScore, maxScore) : 0;

  const classification = stratavaxClassification(percentageScore);
  const gradeInfo = getCentralGradeInfo(percentageScore);
  const classificationDetails =
    getClassificationDetailsFromPercentage(percentageScore);

  const strengthsList = [];
  const weaknessesList = [];
  const neutralList = [];

  Object.entries(categoryScores).forEach(function (entry) {
    const section = entry[0];
    const data = entry[1];

    const item = {
      area: section,
      percentage: data.percentage,
      score: data.total,
      maxPossible: data.maxPossible,
      grade: data.grade,
      gap: calculateGapToTarget(data.percentage)
    };

    if (isStrength(data.percentage)) {
      strengthsList.push(item);
    } else if (isDevelopmentArea(data.percentage)) {
      weaknessesList.push(item);
    } else {
      neutralList.push(item);
    }
  });

  const sortedStrengths = strengthsList.sort(function (a, b) {
    return b.percentage - a.percentage;
  });

  const sortedWeaknesses = weaknessesList.sort(function (a, b) {
    return a.percentage - b.percentage;
  });

  const seed =
    String(userId) +
    "-" +
    safeAssessmentType +
    "-" +
    String(candidateName) +
    "-" +
    safeDateTaken +
    "-" +
    String(totalScore) +
    "-" +
    String(maxScore);

  const executiveSummary = generateExecutiveSummary(
    candidateName,
    totalScore,
    maxScore,
    percentageScore,
    classification,
    sortedStrengths,
    sortedWeaknesses,
    safeAssessmentType,
    seed
  );

  const strengthsNarrative = buildStrengthsNarrative(
    sortedStrengths,
    safeAssessmentType,
    classification.label,
    seed
  );

  const weaknessesNarrative = buildWeaknessesNarrative(
    sortedWeaknesses,
    safeAssessmentType,
    classification.label,
    seed
  );

  const structuredRecommendations = generateStructuredRecommendations(
    sortedWeaknesses,
    sortedStrengths,
    safeAssessmentType,
    seed
  );

  const chartData = generateChartData(categoryScores);
  const scoreBreakdown = generateScoreBreakdown(categoryScores);

  const coverPage = generateCoverPage(
    candidateName,
    safeAssessmentType,
    safeDateTaken,
    new Date().toISOString()
  );

  return {
    userId: userId,
    assessmentType: safeAssessmentType,
    assessmentName: template.name,
    candidateName: candidateName,

    totalScore: totalScore,
    maxScore: maxScore,
    percentageScore: percentageScore,

    grade: gradeInfo.grade,
    gradeInfo: {
      grade: gradeInfo.grade,
      min: gradeInfo.min,
      max: gradeInfo.max,
      color: gradeInfo.color,
      bg: gradeInfo.bg,
      description: gradeInfo.description,
      professional: gradeInfo.description,
      classification: classification.label
    },

    classification: classification,
    classificationDetails: classificationDetails,

    categoryScores: categoryScores,
    strengths: sortedStrengths,
    weaknesses: sortedWeaknesses,
    neutralAreas: neutralList,

    strengthsForDb: sortedStrengths.map(function (strength) {
      return strength.area + " (" + strength.percentage + "%)";
    }),

    weaknessesForDb: sortedWeaknesses.map(function (weakness) {
      return weakness.area + " (" + weakness.percentage + "%)";
    }),

    stratavaxReport: {
      cover: coverPage,

      executiveSummary: {
        totalScore: String(totalScore) + "/" + String(maxScore),
        percentage: percentageScore,
        grade: gradeInfo.grade,
        gradeDescription: gradeInfo.description,
        classification: classification.label,
        narrative: executiveSummary,
        classificationDescription: classification.description
      },

      scoreBreakdown: scoreBreakdown,

      strengths: {
        items: sortedStrengths,
        narrative: strengthsNarrative,
        topStrengths: sortedStrengths.slice(0, 3).map(function (item) {
          return item.area;
        })
      },

      weaknesses: {
        items: sortedWeaknesses,
        narrative: weaknessesNarrative,
        topWeaknesses: sortedWeaknesses.slice(0, 3).map(function (item) {
          return item.area;
        })
      },

      neutralAreas: {
        items: neutralList,
        narrative:
          neutralList.length > 0
            ? "Functional but non-dominant areas include " +
              neutralList
                .map(function (item) {
                  return item.area;
                })
                .join(", ") +
              ". These areas may require reinforcement depending on role requirements."
            : "No neutral capability areas were identified."
      },

      recommendations: structuredRecommendations,

      visualData: {
        chartData: chartData,
        scoreBreakdown: scoreBreakdown
      }
    },

    executiveSummary: executiveSummary,
    recommendations: structuredRecommendations,
    overallProfile: classification.description,
    overallTraits: [gradeInfo.description, classification.label],

    interpretations: {
      classification: classification.label,
      summary: executiveSummary,
      overallProfile: classification.description,
      strengths: sortedStrengths.map(function (item) {
        return item.area + " (" + item.percentage + "%)";
      }),
      weaknesses: sortedWeaknesses.map(function (item) {
        return item.area + " (" + item.percentage + "%)";
      }),
      neutralAreas: neutralList.map(function (item) {
        return item.area + " (" + item.percentage + "%)";
      })
    }
  };
};

// ======================================================
// BACKWARD-COMPATIBLE HELPER
// ======================================================

export const getGradeInfo = function (percentage) {
  const gradeInfo = getCentralGradeInfo(percentage);
  const classificationDetails =
    getClassificationDetailsFromPercentage(percentage);

  return {
    grade: gradeInfo.grade,
    min: gradeInfo.min,
    max: gradeInfo.max,
    color: gradeInfo.color,
    bg: gradeInfo.bg,
    description: gradeInfo.description,
    professional: gradeInfo.description,
    classification: classificationDetails.classification
  };
};

export default {
  stratavaxGradeScale: stratavaxGradeScale,
  stratavaxClassification: stratavaxClassification,
  assessmentTemplates: assessmentTemplates,
  generateDynamicNarrative: generateDynamicNarrative,
  buildStrengthsNarrative: buildStrengthsNarrative,
  buildWeaknessesNarrative: buildWeaknessesNarrative,
  generateExecutiveSummary: generateExecutiveSummary,
  generateCoverPage: generateCoverPage,
  generateScoreBreakdown: generateScoreBreakdown,
  getPerformanceComment: getPerformanceComment,
  generateChartData: generateChartData,
  generateStructuredRecommendations: generateStructuredRecommendations,
  generateStratavaxReport: generateStratavaxReport,
  getGradeInfo: getGradeInfo
};
 *
 * Keeps existing exports:
 * - stratavaxGradeScale
 * - stratavaxClassification
 * - assessmentTemplates
 * - generateDynamicNarrative
 * - buildStrengthsNarrative
 * - buildWeaknessesNarrative
 * - generateExecutiveSummary
 * - generateCoverPage
 * - generateScoreBreakdown
 * - getPerformanceComment
 * - generateChartData
 * - generateStructuredRecommendations
 * - generateStratavaxReport
 * - getGradeInfo
 */

import {
  GRADE_SCALE,
  calculatePercentage,
  getGradeInfo as getCentralGradeInfo,
  getClassificationDetailsFromPercentage,
  getScoreComment,
  getSupervisorImplication,
  calculateGapToTarget,
  isStrength,
  isDevelopmentArea
} from "./scoring";

// ======================================================
// BASIC HELPERS
// ======================================================

const safeNumber = function (value, fallback) {
  const defaultValue = fallback === undefined ? 0 : fallback;
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
};

const normalizeText = function (value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const normalizeAssessmentType = function (assessmentType) {
  if (!assessmentType) {
    return "general";
  }

  return assessmentType;
};

const createHash = function (input) {
  const text = String(input || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash = hash | 0;
  }

  return Math.abs(hash);
};

const selectPhrase = function (phrases, seed) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return "";
  }

  const hash = createHash(seed || "");
  const index = hash % phrases.length;

  return phrases[index];
};

// ======================================================
// ASSESSMENT TEMPLATES
// ======================================================

export const assessmentTemplates = {
  general: {
    name: "General Assessment",
    icon: "📊"
  },
  leadership: {
    name: "Leadership Assessment",
    icon: "👑"
  },
  cognitive: {
    name: "Cognitive Ability Assessment",
    icon: "🧠"
  },
  technical: {
    name: "Technical Competence Assessment",
    icon: "⚙️"
  },
  personality: {
    name: "Personality Assessment",
    icon: "🌟"
  },
  strategic_leadership: {
    name: "Strategic Leadership Assessment",
    icon: "👑"
  },
  performance: {
    name: "Performance Assessment",
    icon: "📈"
  },
  behavioral: {
    name: "Behavioral & Soft Skills Assessment",
    icon: "🗣️"
  },
  cultural: {
    name: "Cultural & Attitudinal Fit Assessment",
    icon: "🤝"
  },
  manufacturing_baseline: {
    name: "Manufacturing Baseline Assessment",
    icon: "🏭"
  }
};

const getTemplate = function (assessmentType) {
  const type = normalizeAssessmentType(assessmentType);

  if (assessmentTemplates[type]) {
    return assessmentTemplates[type];
  }

  return assessmentTemplates.general;
};

// ======================================================
// BACKWARD-COMPATIBLE GRADE SCALE
// ======================================================

export const stratavaxGradeScale = GRADE_SCALE.map(function (item) {
  const classificationDetails = getClassificationDetailsFromPercentage(item.min);

  return {
    grade: item.grade,
    min: item.min,
    max: item.max,
    color: item.color,
    bg: item.bg,
    description: item.description,
    professional: item.description,
    classification: classificationDetails.classification
  };
});

// ======================================================
// CLASSIFICATION
// ======================================================

export const stratavaxClassification = function (percentage) {
  const details = getClassificationDetailsFromPercentage(percentage);

  let level = 1;
  let tone = "cautious";

  if (details.band === "exceptional") {
    level = 5;
    tone = "positive";
  } else if (details.band === "strong") {
    level = 4;
    tone = "positive";
  } else if (details.band === "adequate") {
    level = 3;
    tone = "neutral";
  } else if (details.band === "developing") {
    level = 2;
    tone = "neutral";
  }

  return {
    label: details.classification,
    level: level,
    color: details.color,
    description: details.description,
    tone: tone
  };
};

// ======================================================
// NARRATIVE HELPERS
// ======================================================

export const generateDynamicNarrative = function (
  template,
  variables,
  classification,
  availablePhrases
) {
  if (!template) {
    return "";
  }

  const safeVariables = variables || {};
  let narrative = String(template);

  Object.keys(safeVariables).forEach(function (key) {
    narrative = narrative.replace(
      new RegExp("{{" + key + "}}", "g"),
      safeVariables[key]
    );
  });

  return narrative;
};

