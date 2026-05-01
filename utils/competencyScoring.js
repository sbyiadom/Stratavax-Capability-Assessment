// utils/competencyScoring.js

/**
 * COMPETENCY SCORING ENGINE
 *
 * - Calculates competency-level results from assessment responses
 * - Applies assessment-specific competency weights
 * - Integrates behavioral metrics such as time spent and answer changes
 * - Produces supervisor-friendly summaries and recommendations
 * - Syntax-safe version for Next.js / webpack builds
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
// THRESHOLDS
// ======================================================

export const REPORT_THRESHOLDS = {
  strengthThreshold: 75,
  developmentThreshold: 65,
  criticalThreshold: 40
};

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

export const calculatePercentageDecimal = function (
  score,
  maxScore,
  decimals
) {
  const earned = safeNumber(score, 0);
  const max = safeNumber(maxScore, 0);
  const d = decimals === undefined ? 2 : decimals;

  if (max <= 0) return 0;

  return roundNumber((earned / max) * 100, d);
};

export const getScoreLevel = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= 85) return "Exceptional";
  if (value >= 75) return "Strong";
  if (value >= 65) return "Proficient";
  if (value >= 55) return "Developing";
  if (value >= 40) return "Needs Development";

  return "Critical Gap";
};

const getNestedValue = function (object, path, fallback) {
  if (!object) return fallback;

  const parts = path.split(".");
  let current = object;

  for (let i = 0; i < parts.length; i += 1) {
    if (
      current === null ||
      current === undefined ||
      current[parts[i]] === undefined ||
      current[parts[i]] === null
    ) {
      return fallback;
    }

    current = current[parts[i]];
  }

  return current;
};

const getResponseScore = function (response) {
  if (!response) return 0;

  return safeNumber(
    getNestedValue(response, "unique_answers.score", null) !== null
      ? getNestedValue(response, "unique_answers.score", 0)
      : getNestedValue(response, "answer.score", null) !== null
        ? getNestedValue(response, "answer.score", 0)
        : response.score !== undefined
          ? response.score
          : response.selected_score !== undefined
            ? response.selected_score
            : response.value !== undefined
              ? response.value
              : 0,
    0
  );
};

const getResponseQuestionId = function (response) {
  if (!response) return null;

  return (
    response.question_id ||
    getNestedValue(response, "unique_questions.id", null) ||
    getNestedValue(response, "question.id", null)
  );
};

const getResponseTimeSpent = function (response) {
  if (!response) return 0;

  return safeNumber(
    response.time_spent_seconds ||
      response.time_spent ||
      response.duration_seconds ||
      0,
    0
  );
};

const getResponseTimesChanged = function (response) {
  if (!response) return 0;

  return safeNumber(response.times_changed || response.changes || 0, 0);
};

const getMappingQuestionId = function (mapping) {
  if (!mapping) return null;

  return (
    mapping.question_id ||
    getNestedValue(mapping, "question.id", null) ||
    getNestedValue(mapping, "unique_questions.id", null)
  );
};

const getCompetencyName = function (mapping) {
  if (!mapping) return "General";

  return (
    getNestedValue(mapping, "competencies.name", null) ||
    getNestedValue(mapping, "competency.name", null) ||
    mapping.name ||
    mapping.competency_name ||
    "General"
  );
};

const getCompetencyId = function (mapping) {
  if (!mapping) return "General";

  return (
    mapping.competency_id ||
    getNestedValue(mapping, "competencies.id", null) ||
    getNestedValue(mapping, "competency.id", null) ||
    mapping.id ||
    getCompetencyName(mapping)
  );
};

// ======================================================
// ASSESSMENT COMPETENCY WEIGHTS
// ======================================================

export const assessmentCompetencyWeights = {
  leadership: {
    "Strategic Thinking": 1.3,
    "Emotional Intelligence": 1.2,
    "Decision Making": 1.3,
    Communication: 1.1,
    "People Management": 1.3,
    Vision: 1.2,
    Execution: 1.1,
    Resilience: 1.0,
    Adaptability: 1.0,
    Accountability: 1.1
  },

  cognitive: {
    "Cognitive Ability": 1.5,
    "Decision Making": 1.2,
    "Problem Solving": 1.3,
    "Learning Agility": 1.1
  },

  technical: {
    "Technical Knowledge": 1.5,
    "Cognitive Ability": 1.0,
    "Problem Solving": 1.2,
    Execution: 1.1
  },

  personality: {
    Ownership: 1.3,
    Collaboration: 1.2,
    Action: 1.2,
    Analysis: 1.3,
    "Risk Tolerance": 1.1,
    Structure: 1.0
  },

  strategic_leadership: {
    "Vision / Strategy": 1.4,
    "People Leadership": 1.3,
    "Decision Making": 1.3,
    Accountability: 1.2,
    "Emotional Intelligence": 1.2,
    "Execution Drive": 1.3,
    Ethics: 1.4
  },

  performance: {
    Accountability: 1.3,
    Execution: 1.3,
    Communication: 1.0,
    "Strategic Thinking": 1.1,
    "Decision Making": 1.2,
    "People Management": 1.0
  },

  behavioral: {
    Communication: 1.2,
    Collaboration: 1.3,
    "Emotional Intelligence": 1.2,
    Adaptability: 1.1,
    Integrity: 1.1,
    "Cultural Fit": 1.0
  },

  cultural: {
    "Cultural Fit": 1.5,
    Integrity: 1.2,
    Collaboration: 1.2,
    Adaptability: 1.1,
    "Emotional Intelligence": 1.0
  },

  manufacturing_baseline: {
    "Technical Fundamentals": 1.3,
    Troubleshooting: 1.3,
    "Numerical Aptitude": 1.1,
    "Safety & Work Ethic": 1.5,
    "Safety &amp; Work Ethic": 1.5
  },

  general: {
    "Cognitive Ability": 1.2,
    Communication: 1.1,
    Adaptability: 1.0,
    Accountability: 1.1,
    Integrity: 1.1,
    Collaboration: 1.0
  }
};

// ======================================================
// CLASSIFICATION
// ======================================================

export const competencyClassification = function (percentage) {
  const value = clampPercentage(percentage);

  if (value >= REPORT_THRESHOLDS.strengthThreshold) return "Strong";
  if (value >= REPORT_THRESHOLDS.developmentThreshold) return "Proficient";
  if (value >= REPORT_THRESHOLDS.criticalThreshold) return "Developing";

  return "Needs Development";
};

// ======================================================
// CORE COMPETENCY SCORING
// ======================================================

export function calculateCompetencyScores(
  responses,
  questionCompetencies,
  assessmentType
) {
  const type = assessmentType || "general";

  if (!Array.isArray(responses) || responses.length === 0) {
    return {};
  }

  if (!Array.isArray(questionCompetencies) || questionCompetencies.length === 0) {
    return {};
  }

  const weights =
    assessmentCompetencyWeights[type] || assessmentCompetencyWeights.general;

  const competencyScores = {};

  responses.forEach(function (response) {
    const questionId = getResponseQuestionId(response);
    const score = getResponseScore(response);
    const maxScore = 5;
    const timeSpent = getResponseTimeSpent(response);
    const timesChanged = getResponseTimesChanged(response);

    const mappingsForQuestion = questionCompetencies.filter(function (mapping) {
      return String(getMappingQuestionId(mapping)) === String(questionId);
    });

    mappingsForQuestion.forEach(function (mapping) {
      const competencyId = getCompetencyId(mapping);
      const competencyName = getCompetencyName(mapping);
      const questionWeight = safeNumber(mapping.weight, 1);
      const assessmentWeight = safeNumber(weights[competencyName], 1);
      const combinedWeight = questionWeight * assessmentWeight;

      if (!competencyScores[competencyId]) {
        competencyScores[competencyId] = {
          id: competencyId,
          name: competencyName,
          totalScore: 0,
          maxPossible: 0,
          questionCount: 0,
          assessmentWeight: assessmentWeight,
          totalTimeSpent: 0,
          totalChanges: 0,
          responses: []
        };
      }

      competencyScores[competencyId].totalScore += score * combinedWeight;
      competencyScores[competencyId].maxPossible += maxScore * combinedWeight;
      competencyScores[competencyId].questionCount += 1;
      competencyScores[competencyId].totalTimeSpent += timeSpent;
      competencyScores[competencyId].totalChanges += timesChanged;

      competencyScores[competencyId].responses.push({
        question_id: questionId,
        score: score,
        time_spent: timeSpent,
        changed: timesChanged > 0,
        times_changed: timesChanged,
        answer_text:
          getNestedValue(response, "unique_answers.answer_text", null) ||
          getNestedValue(response, "answer.answer_text", null) ||
          response.answer_text ||
          "",
        question_text:
          getNestedValue(response, "unique_questions.question_text", null) ||
          getNestedValue(response, "question.question_text", null) ||
          response.question_text ||
          ""
      });
    });
  });

  const results = {};

  Object.keys(competencyScores).forEach(function (competencyId) {
    const competency = competencyScores[competencyId];

    const percentage = calculatePercentageDecimal(
      competency.totalScore,
      competency.maxPossible,
      2
    );

    const avgTimePerQuestion =
      competency.questionCount > 0
        ? competency.totalTimeSpent / competency.questionCount
        : 0;

    const avgChangesPerQuestion =
      competency.questionCount > 0
        ? competency.totalChanges / competency.questionCount
        : 0;

    results[competencyId] = {
      id: competencyId,
      name: competency.name,
      rawScore: roundNumber(competency.totalScore, 2),
      totalScore: roundNumber(competency.totalScore, 2),
      maxPossible: roundNumber(competency.maxPossible, 2),
      maxScore: roundNumber(competency.maxPossible, 2),
      percentage: percentage,
      questionCount: competency.questionCount,
      assessmentWeight: competency.assessmentWeight,
      classification: competencyClassification(percentage),
      scoreLevel: getScoreLevel(percentage),
      performanceComment: getScoreComment(percentage),
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      behavioral: {
        totalTimeSpent: roundNumber(competency.totalTimeSpent, 2),
        avgTimePerQuestion: roundNumber(avgTimePerQuestion, 2),
        totalChanges: competency.totalChanges,
        avgChangesPerQuestion: roundNumber(avgChangesPerQuestion, 2),
        responses: competency.responses
      },
      gapToTarget: calculateGapToTarget(percentage)
    };
  });

  return results;
}

// ======================================================
// RECOMMENDATIONS
// ======================================================

const getCompetencyRecommendationText = function (competency, percentage) {
  if (percentage < 40) {
    return (
      competency +
      " is a critical development need. Begin with foundational training, guided practice, and close supervisor follow-up."
    );
  }

  if (percentage < 55) {
    return (
      competency +
      " requires priority development. Provide structured training, practical exercises, and regular progress checks."
    );
  }

  if (percentage < 65) {
    return (
      competency +
      " is developing. Targeted coaching and practical application will help build consistency."
    );
  }

  if (percentage < 75) {
    return (
      competency +
      " is functional but should be refined through role-specific practice and feedback."
    );
  }

  return (
    competency +
    " is a strength. Continue to reinforce and apply this capability in relevant assignments."
  );
};

const getCompetencyAction = function (competency, percentage) {
  if (percentage < 40) {
    return (
      "Create a 30-day foundational development plan for " +
      competency +
      " with weekly supervisor check-ins."
    );
  }

  if (percentage < 55) {
    return (
      "Complete targeted training and supervised practice in " +
      competency +
      "."
    );
  }

  if (percentage < 65) {
    return (
      "Use structured exercises, coaching, and practical tasks to improve " +
      competency +
      "."
    );
  }

  if (percentage < 75) {
    return (
      "Assign practical tasks that require " +
      competency +
      " and provide feedback after completion."
    );
  }

  return (
    "Leverage " +
    competency +
    " through mentoring, project ownership, or advanced assignments."
  );
};

const getBehavioralRecommendationNote = function (behavioral, percentage) {
  if (!behavioral) return "";

  const avgTime = safeNumber(behavioral.avgTimePerQuestion, 0);
  const avgChanges = safeNumber(behavioral.avgChangesPerQuestion, 0);

  let note = "";

  if (avgTime > 75 && percentage < 65) {
    note +=
      " The candidate spent relatively high time in this competency area, which may suggest uncertainty or processing difficulty.";
  }

  if (avgChanges > 1.5 && percentage < 65) {
    note +=
      " Frequent answer changes in this competency area may suggest second-guessing or limited confidence.";
  }

  if (avgTime > 0 && avgTime < 15 && percentage < 65) {
    note +=
      " The candidate answered quickly despite a lower score, so careful reading and review habits should be reinforced.";
  }

  return note;
};

export function generateCompetencyRecommendations(
  competencyResults,
  behavioralMetrics
) {
  if (!competencyResults || Object.keys(competencyResults).length === 0) {
    return [];
  }

  const recommendations = [];
  const competencyValues = Object.values(competencyResults);

  const developmentNeeds = competencyValues
    .filter(function (competency) {
      return competency && !isStrength(competency.percentage);
    })
    .sort(function (a, b) {
      return safeNumber(a.percentage, 0) - safeNumber(b.percentage, 0);
    })
    .slice(0, 5);

  developmentNeeds.forEach(function (need) {
    const competency = need.name || "Competency";
    const percentage = safeNumber(need.percentage, 0);
    const behavioral = need.behavioral || behavioralMetrics || null;

    let priority = "Medium";

    if (isCriticalGap(percentage)) {
      priority = "Critical";
    } else if (isPriorityDevelopment(percentage)) {
      priority = "High";
    } else if (isDevelopmentArea(percentage)) {
      priority = "Medium";
    } else {
      priority = "Low";
    }

    if (
      behavioral &&
      percentage < REPORT_THRESHOLDS.developmentThreshold &&
      (safeNumber(behavioral.avgChangesPerQuestion, 0) > 1.5 ||
        safeNumber(behavioral.avgTimePerQuestion, 0) > 75)
    ) {
      if (priority === "Medium") priority = "High";
      if (priority === "Low") priority = "Medium";
    }

    recommendations.push({
      priority: priority,
      competency: competency,
      category: competency,
      currentScore: percentage,
      gap: need.gapToTarget,
      recommendation:
        getCompetencyRecommendationText(competency, percentage) +
        getBehavioralRecommendationNote(behavioral, percentage),
      action: getCompetencyAction(competency, percentage),
      impact:
        need.gapToTarget > 0
          ? "Improving " +
            competency +
            " by " +
            need.gapToTarget +
            "% will help move the candidate closer to the recommended target."
          : "Maintaining " +
            competency +
            " will support consistent role performance.",
      behavioralInsights: behavioral
        ? {
            avgTimePerQuestion: behavioral.avgTimePerQuestion,
            totalChanges: behavioral.totalChanges,
            avgChangesPerQuestion: behavioral.avgChangesPerQuestion
          }
        : null
    });
  });

  const strengths = competencyValues
    .filter(function (competency) {
      return competency && isStrength(competency.percentage);
    })
    .sort(function (a, b) {
      return safeNumber(b.percentage, 0) - safeNumber(a.percentage, 0);
    })
    .slice(0, 3);

  strengths.forEach(function (strength) {
    recommendations.push({
      priority: "Leverage",
      competency: strength.name,
      category: strength.name,
      currentScore: strength.percentage,
      gap: strength.gapToTarget,
      recommendation:
        strength.name +
        " is a strength at " +
        strength.percentage +
        "%. Use this capability as a foundation for role contribution, mentoring, or stretch assignments.",
      action:
        "Assign role-relevant tasks that use " +
        strength.name +
        ", or allow the candidate to support others in this area.",
      impact:
        "Using this strength can improve confidence, contribution, and development momentum.",
      isStrength: true
    });
  });

  return recommendations;
}

// ======================================================
// SUMMARY
// ======================================================

export const getCompetencySummary = function (
  competencyResults,
  behavioralMetrics
) {
  if (!competencyResults || Object.keys(competencyResults).length === 0) {
    return null;
  }

  const competencies = Object.values(competencyResults);

  const strongCount = competencies.filter(function (competency) {
    return isStrength(competency.percentage);
  }).length;

  const proficientCount = competencies.filter(function (competency) {
    return (
      competency.percentage >= REPORT_THRESHOLDS.developmentThreshold &&
      competency.percentage < REPORT_THRESHOLDS.strengthThreshold
    );
  }).length;

  const developingCount = competencies.filter(function (competency) {
    return (
      competency.percentage >= REPORT_THRESHOLDS.criticalThreshold &&
      competency.percentage < REPORT_THRESHOLDS.developmentThreshold
    );
  }).length;

  const needsWorkCount = competencies.filter(function (competency) {
    return isCriticalGap(competency.percentage);
  }).length;

  const averageScore =
    competencies.reduce(function (sum, competency) {
      return sum + safeNumber(competency.percentage, 0);
    }, 0) / competencies.length;

  const avgTimeAcrossCompetencies =
    competencies.reduce(function (sum, competency) {
      const behavioral = competency.behavioral || {};
      return sum + safeNumber(behavioral.avgTimePerQuestion, 0);
    }, 0) / competencies.length;

  const avgChangesAcrossCompetencies =
    competencies.reduce(function (sum, competency) {
      const behavioral = competency.behavioral || {};
      return sum + safeNumber(behavioral.avgChangesPerQuestion, 0);
    }, 0) / competencies.length;

  let overallAssessment = "";
  let developmentUrgency = "Low";

  if (averageScore >= 85) {
    overallAssessment =
      "Strong competency profile with evidence of advanced capability. The candidate may be suitable for greater responsibility, subject to role validation.";
    developmentUrgency = "Low";
  } else if (averageScore >= 75) {
    overallAssessment =
      "Reliable competency profile with clear strengths and manageable development needs.";
    developmentUrgency = "Low";
  } else if (averageScore >= 65) {
    overallAssessment =
      "Functional competency profile with targeted development opportunities. Practical reinforcement is recommended.";
    developmentUrgency = "Medium";
  } else if (averageScore >= 55) {
    overallAssessment =
      "Developing competency profile requiring structured support in key areas.";
    developmentUrgency = "High";
  } else {
    overallAssessment =
      "Significant competency development is needed across multiple areas. Immediate structured support is recommended.";
    developmentUrgency = "Critical";
  }

  if (avgTimeAcrossCompetencies > 75) {
    overallAssessment +=
      " Response times suggest careful processing or possible uncertainty, so time management and confidence support may be useful.";
  }

  if (avgChangesAcrossCompetencies > 1.5) {
    overallAssessment +=
      " Frequent answer changes suggest second-guessing; confidence-building and structured review habits may help.";
  }

  return {
    totalCompetencies: competencies.length,
    strongCount: strongCount,
    proficientCount: proficientCount,
    developingCount: developingCount,
    needsWorkCount: needsWorkCount,
    averageScore: Math.round(averageScore),
    overallAssessment: overallAssessment,
    developmentUrgency: developmentUrgency,
    behavioralContext: {
      averageResponseTime: roundNumber(avgTimeAcrossCompetencies, 2),
      averageAnswerChanges: roundNumber(avgChangesAcrossCompetencies, 2)
    },
    topStrengths: competencies
      .filter(function (competency) {
        return isStrength(competency.percentage);
      })
      .sort(function (a, b) {
        return safeNumber(b.percentage, 0) - safeNumber(a.percentage, 0);
      })
      .slice(0, 3),
    topDevelopmentNeeds: competencies
      .filter(function (competency) {
        return isDevelopmentArea(competency.percentage);
      })
      .sort(function (a, b) {
        return safeNumber(a.percentage, 0) - safeNumber(b.percentage, 0);
      })
      .slice(0, 3),
    recommendations: generateCompetencyRecommendations(
      competencyResults,
      behavioralMetrics
    )
  };
};

// ======================================================
// CONFIDENCE
// ======================================================

export const calculateCompetencyConfidence = function (competencyResult) {
  if (!competencyResult || !competencyResult.behavioral) {
    return "Moderate";
  }

  const behavioral = competencyResult.behavioral;
  const score = safeNumber(competencyResult.percentage, 0);
  const avgTime = safeNumber(behavioral.avgTimePerQuestion, 0);
  const avgChanges = safeNumber(behavioral.avgChangesPerQuestion, 0);

  if (score >= 80 && avgChanges < 0.5 && avgTime > 0 && avgTime < 45) {
    return "High";
  }

  if (avgChanges > 2 || (score < 60 && avgTime > 75)) {
    return "Low";
  }

  if (score >= 70 && avgChanges > 1) {
    return "Moderate - Second-guessing";
  }

  if (score < 60 && avgChanges < 0.5) {
    return "Moderate - Knowledge gap";
  }

  return "Moderate";
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  REPORT_THRESHOLDS: REPORT_THRESHOLDS,
  assessmentCompetencyWeights: assessmentCompetencyWeights,
  calculatePercentageDecimal: calculatePercentageDecimal,
  getScoreLevel: getScoreLevel,
  competencyClassification: competencyClassification,
  calculateCompetencyScores: calculateCompetencyScores,
  generateCompetencyRecommendations: generateCompetencyRecommendations,
  getCompetencySummary: getCompetencySummary,
  calculateCompetencyConfidence: calculateCompetencyConfidence
};
