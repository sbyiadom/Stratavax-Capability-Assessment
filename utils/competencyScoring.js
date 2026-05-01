/**
 * COMPETENCY SCORING ENGINE
 *
 * Calculates competency-level results from responses      " Response times suggest careful processing or possible uncertainty, so time management and confidence support may be useful."; * Calculates competency-level results from responses and question competency mappings.
  }

  if (avgChangesAcrossCompetencies > 1.5) {
    overallAssessment +=
      " Frequent answer changes suggest second-guessing; confidence-building and structured review habits may help.";
  }

  return {
    totalCompetencies: competencies.length,
    strongCount,
    proficientCount,
    developingCount,
    needsWorkCount,
    averageScore: Math.round(averageScore),
    overallAssessment,
    developmentUrgency,

    behavioralContext: {
      averageResponseTime: roundNumber(avgTimeAcrossCompetencies, 2),
      averageAnswerChanges: roundNumber(avgChangesAcrossCompetencies, 2)
    },

    topStrengths: competencies
      .filter((competency) => isStrength(competency.percentage))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3),

    topDevelopmentNeeds: competencies
      .filter((competency) => isDevelopmentArea(competency.percentage))
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3),

    recommendations: generateCompetencyRecommendations(
      competencyResults,
      behavioralMetrics
    )
  };
};

/**
 * Calculate confidence score based on answer patterns.
 */
export const calculateCompetencyConfidence = (competencyResult) => {
  if (!competencyResult || !competencyResult.behavioral) {
    return "Moderate";
  }

  const { avgTimePerQuestion, avgChangesPerQuestion } =
    competencyResult.behavioral;

  const score = safeNumber(competencyResult.percentage, 0);
  const avgTime = safeNumber(avgTimePerQuestion, 0);
  const avgChanges = safeNumber(avgChangesPerQuestion, 0);

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

export default {
  calculateCompetencyScores,
  generateCompetencyRecommendations,
  getCompetencySummary,
  competencyClassification,
  calculateCompetencyConfidence,
  assessmentCompetencyWeights
};
 *
 * Corrected version:
 * - Uses central scoring standard from utils/scoring.js
 * - Keeps all existing exports
 * - Supports all assessment types
 * - Improves behavioral insight integration
 * - Avoids contradictory classifications
 * - Generates supervisor-friendly recommendations
 */

import {
  REPORT_THRESHOLDS,
  calculatePercentageDecimal,
  getScoreLevel,
  getScoreComment,
  getSupervisorImplication,
  calculateGapToTarget,
  isStrength,
  isDevelopmentArea,
  isCriticalGap,
  isPriorityDevelopment,
  roundNumber
} from "./scoring";

/**
 * Default competency weights per assessment type.
 *
 * These are used only when question-level competency mapping exists.
 */
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

/**
 * Backward-compatible competency classification.
 *
 * Previous code expected:
 * - Strong
 * - Proficient
 * - Developing
 * - Needs Development
 */
export const competencyClassification = (percentage) => {
  const value = Number(percentage || 0);

  if (value >= REPORT_THRESHOLDS.strengthThreshold) return "Strong";
  if (value >= REPORT_THRESHOLDS.developmentThreshold) return "Proficient";
  if (value >= REPORT_THRESHOLDS.criticalThreshold) return "Developing";

  return "Needs Development";
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getResponseScore = (response) => {
  return safeNumber(
    response?.unique_answers?.score ??
      response?.answer?.score ??
      response?.score ??
      0,
    0
  );
};

const getResponseQuestionId = (response) => {
  return response?.question_id ?? response?.unique_questions?.id ?? response?.question?.id;
};

const getResponseTimeSpent = (response) => {
  return safeNumber(
    response?.time_spent_seconds ??
      response?.time_spent ??
      response?.duration_seconds ??
      0,
    0
  );
};

const getResponseTimesChanged = (response) => {
  return safeNumber(response?.times_changed ?? response?.changes ?? 0, 0);
};

const getCompetencyName = (mapping) => {
  return (
    mapping?.competencies?.name ||
    mapping?.competency?.name ||
    mapping?.name ||
    "Unknown"
  );
};

const getCompetencyId = (mapping) => {
  return (
    mapping?.competency_id ||
    mapping?.competency?.id ||
    mapping?.competencies?.id ||
    mapping?.id ||
    getCompetencyName(mapping)
  );
};

/**
 * Calculate competency scores from responses with weighted scoring.
 *
 * @param {Array} responses - Candidate responses
 * @param {Array} questionCompetencies - Question to competency mappings
 * @param {string} assessmentType - Assessment type code
 * @returns {Object} Competency result object keyed by competency id
 */
export function calculateCompetencyScores(
  responses,
  questionCompetencies,
  assessmentType = "general"
) {
  console.log("🧠 Calculating competency scores for", assessmentType);

  if (!Array.isArray(responses) || responses.length === 0) {
    console.log("⚠️ No responses provided for competency scoring");
    return {};
  }

  if (!Array.isArray(questionCompetencies) || questionCompetencies.length === 0) {
    console.log("⚠️ No question-competency mappings found");
    return {};
  }

  const competencyScores = {};
  const weights =
    assessmentCompetencyWeights[assessmentType] ||
    assessmentCompetencyWeights.general;

  responses.forEach((response) => {
    const questionId = getResponseQuestionId(response);
    const score = getResponseScore(response);
    const maxScore = 5;
    const timeSpent = getResponseTimeSpent(response);
    const timesChanged = getResponseTimesChanged(response);

    const mappingsForQuestion = questionCompetencies.filter(
      (mapping) => String(mapping.question_id) === String(questionId)
    );

    mappingsForQuestion.forEach((mapping) => {
      const competencyId = getCompetencyId(mapping);
      const competencyName = getCompetencyName(mapping);
      const questionWeight = safeNumber(mapping?.weight, 1.0);
      const assessmentWeight = safeNumber(weights[competencyName], 1.0);
      const combinedWeight = questionWeight * assessmentWeight;

      if (!competencyScores[competencyId]) {
        competencyScores[competencyId] = {
          id: competencyId,
          name: competencyName,
          totalScore: 0,
          maxPossible: 0,
          questionCount: 0,
          assessmentWeight,
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
        score,
        time_spent: timeSpent,
        changed: timesChanged > 0,
        times_changed: timesChanged,
        answer_text:
          response?.unique_answers?.answer_text ||
          response?.answer?.answer_text ||
          response?.answer_text ||
          "",
        question_text:
          response?.unique_questions?.question_text ||
          response?.question?.question_text ||
          response?.question_text ||
          ""
      });
    });
  });

  const results = {};

  Object.keys(competencyScores).forEach((competencyId) => {
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

    const scoreLevel = getScoreLevel(percentage);

    results[competencyId] = {
      id: competencyId,
      name: competency.name,

      rawScore: roundNumber(competency.totalScore, 2),
      maxPossible: roundNumber(competency.maxPossible, 2),
      percentage,
      questionCount: competency.questionCount,
      assessmentWeight: competency.assessmentWeight,

      classification: competencyClassification(percentage),
      scoreLevel,
      performanceComment: getScoreComment(percentage),
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

  console.log(`✅ Calculated scores for ${Object.keys(results).length} competencies`);

  return results;
}

/**
 * Generate enhanced competency-based development recommendations.
 *
 * Includes behavioral insight context.
 */
export function generateCompetencyRecommendations(
  competencyResults,
  behavioralMetrics = null
) {
  if (!competencyResults || Object.keys(competencyResults).length === 0) {
    return [];
  }

  const recommendations = [];

  const competencyValues = Object.values(competencyResults);

  const developmentNeeds = competencyValues
    .filter((competency) => !isStrength(competency.percentage))
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);

  developmentNeeds.forEach((need) => {
    const competency = need.name;
    const percentage = safeNumber(need.percentage, 0);
    const behavioral = need.behavioral || null;

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

    /**
     * Behavioral adjustment:
     * If candidate spends a lot of time or revises often but still scores low,
     * treat the competency as higher development priority.
     */
    if (
      behavioral &&
      percentage < REPORT_THRESHOLDS.developmentThreshold &&
      (safeNumber(behavioral.avgChangesPerQuestion, 0) > 1.5 ||
        safeNumber(behavioral.avgTimePerQuestion, 0) > 75)
    ) {
      if (priority === "Medium") priority = "High";
      if (priority === "Low") priority = "Medium";
    }

    const action = getCompetencyAction(competency, percentage);
    const behavioralNote = getBehavioralRecommendationNote(behavioral, percentage);

    recommendations.push({
      priority,
      competency,
      category: competency,
      currentScore: percentage,
      gap: need.gapToTarget,
      recommendation: `${getCompetencyRecommendationText(
        competency,
        percentage
      )}${behavioralNote}`,
      action,
      impact:
        need.gapToTarget > 0
          ? `Improving ${competency} by ${need.gapToTarget}% will help move the candidate closer to the recommended 80% target.`
          : `Maintaining ${competency} will support consistent role performance.`,
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
    .filter((competency) => isStrength(competency.percentage))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  strengths.forEach((strength) => {
    recommendations.push({
      priority: "Leverage",
      competency: strength.name,
      category: strength.name,
      currentScore: strength.percentage,
      gap: strength.gapToTarget,
      recommendation: `${strength.name} is a strength at ${strength.percentage}%. Use this capability as a foundation for role contribution, mentoring, or stretch assignments.`,
      action: `Assign role-relevant tasks that use ${strength.name}, or allow the candidate to support others in this area.`,
      impact:
        "Using this strength can improve confidence, contribution, and development momentum.",
      isStrength: true
    });
  });

  return recommendations;
}

const getCompetencyRecommendationText = (competency, percentage) => {
  if (percentage < 40) {
    return `${competency} is a critical development need. Begin with foundational training, guided practice, and close supervisor follow-up.`;
  }

  if (percentage < 55) {
    return `${competency} requires priority development. Provide structured training, practical exercises, and regular progress checks.`;
  }

  if (percentage < 65) {
    return `${competency} is developing. Targeted coaching and practical application will help build consistency.`;
  }

  if (percentage < 75) {
    return `${competency} is functional but should be refined through role-specific practice and feedback.`;
  }

  return `${competency} is a strength. Continue to reinforce and apply this capability in relevant assignments.`;
};

const getCompetencyAction = (competency, percentage) => {
  if (percentage < 40) {
    return `Create a 30-day foundational development plan for ${competency} with weekly supervisor check-ins.`;
  }

  if (percentage < 55) {
    return `Complete targeted training and supervised practice in ${competency}.`;
  }

  if (percentage < 65) {
    return `Use structured exercises, coaching, and practical tasks to improve ${competency}.`;
  }

  if (percentage < 75) {
    return `Assign practical tasks that require ${competency} and provide feedback after completion.`;
  }

  return `Leverage ${competency} through mentoring, project ownership, or advanced assignments.`;
};

const getBehavioralRecommendationNote = (behavioral, percentage) => {
  if (!behavioral) return "";

  const avgTime = safeNumber(behavioral.avgTimePerQuestion, 0);
  const avgChanges = safeNumber(behavioral.avgChangesPerQuestion, 0);

  let note = "";

  if (avgTime > 75 && percentage < 65) {
    note += ` The candidate spent relatively high time in this competency area, which may suggest uncertainty or processing difficulty.`;
  }

  if (avgChanges > 1.5 && percentage < 65) {
    note += ` Frequent answer changes in this competency area may suggest second-guessing or limited confidence.`;
  }

  if (avgTime > 0 && avgTime < 15 && percentage < 65) {
    note += ` The candidate answered quickly despite a lower score, so review habits and careful reading should be reinforced.`;
  }

  return note;
};

/**
 * Get overall competency summary with behavioral context.
 */
export const getCompetencySummary = (
  competencyResults,
  behavioralMetrics = null
) => {
  if (!competencyResults || Object.keys(competencyResults).length === 0) {
    return null;
  }

  const competencies = Object.values(competencyResults);

  const strongCount = competencies.filter((competency) =>
    isStrength(competency.percentage)
  ).length;

  const proficientCount = competencies.filter(
    (competency) =>
      competency.percentage >= REPORT_THRESHOLDS.developmentThreshold &&
      competency.percentage < REPORT_THRESHOLDS.strengthThreshold
  ).length;

  const developingCount = competencies.filter(
    (competency) =>
      competency.percentage >= REPORT_THRESHOLDS.criticalThreshold &&
      competency.percentage < REPORT_THRESHOLDS.developmentThreshold
  ).length;

  const needsWorkCount = competencies.filter((competency) =>
    isCriticalGap(competency.percentage)
  ).length;

  const averageScore =
    competencies.reduce(
      (sum, competency) => sum + safeNumber(competency.percentage, 0),
      0
    ) / competencies.length;

  const avgTimeAcrossCompetencies =
    competencies.reduce(
      (sum, competency) =>
        sum + safeNumber(competency.behavioral?.avgTimePerQuestion, 0),
      0
    ) / competencies.length;

  const avgChangesAcrossCompetencies =
    competencies.reduce(
      (sum, competency) =>
        sum + safeNumber(competency.behavioral?.avgChangesPerQuestion, 0),
      0
    ) / competencies.length;

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
