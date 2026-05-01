// utils/responseAnalyzer.js

/**
 * RESPONSE ANALYZER
 *
 * percentage; * Uses actual question and answer data to generate category-level insights.
    data.level = getScoreLevel(percentage);
    data.performanceComment = getScoreComment(percentage);
    data.supervisorImplication = getSupervisorImplication(percentage);
    data.gapToTarget = calculateGapToTarget(percentage);
    data.summary = generateUniqueSummary(category, data, percentage);

    /**
     * Keep only the most useful insights:
     * - prioritize low/critical score evidence
     * - then include high score evidence
     */
    const criticalOrLowInsights = data.questionDetails
      .filter((item) => item.percentage < 55)
      .slice(0, 2)
      .map((item) =>
        generateInsight(
          category,
          item.fullQuestion,
          item.answer,
          item.score,
          item.maxScore
        )
      );

    const strengthInsights = data.questionDetails
      .filter((item) => item.percentage >= 75)
      .slice(0, 1)
      .map((item) =>
        generateInsight(
          category,
          item.fullQuestion,
          item.answer,
          item.score,
          item.maxScore
        )
      );

    const selectedInsights = [...criticalOrLowInsights, ...strengthInsights];

    data.insights =
      selectedInsights.length > 0 ? selectedInsights : data.insights.slice(0, 3);
  });

  return categorizedInsights;
};

const generateInsight = (category, questionText, answerText, score, maxScore = 5) => {
  const questionShort = truncateText(questionText, 80);
  const answerShort = truncateText(answerText, 60);
  const percentage = calculatePercentage(score, maxScore);
  const level = getScoreLevel(percentage);

  if (percentage >= 85) {
    return `Strong evidence was shown in ${category}. For the question "${questionShort}", the selected answer "${answerShort}" scored ${score}/${maxScore}, suggesting strong understanding of this concept.`;
  }

  if (percentage >= 75) {
    return `Good evidence was shown in ${category}. For the question "${questionShort}", the selected answer "${answerShort}" scored ${score}/${maxScore}, suggesting reliable understanding with room for refinement.`;
  }

  if (percentage >= 65) {
    return `Functional evidence was shown in ${category}. For the question "${questionShort}", the selected answer "${answerShort}" scored ${score}/${maxScore}, suggesting adequate awareness that may need role-specific reinforcement.`;
  }

  if (percentage >= 55) {
    return `Developing evidence was shown in ${category}. For the question "${questionShort}", the selected answer "${answerShort}" scored ${score}/${maxScore}, suggesting basic awareness but a need for further practice.`;
  }

  if (percentage >= 40) {
    return `A development need was identified in ${category}. For the question "${questionShort}", the selected answer "${answerShort}" scored ${score}/${maxScore}, suggesting this concept requires focused reinforcement.`;
  }

  return `A critical gap was identified in ${category}. For the question "${questionShort}", the selected answer "${answerShort}" scored ${score}/${maxScore}, suggesting immediate foundational support is needed.`;
};

const generateUniqueSummary = (category, data, percentage) => {
  const {
    highScoreCount,
    moderateScoreCount,
    lowScoreCount,
    criticalScoreCount,
    questionCount
  } = data;

  const categoryName = normalizeHtmlEntities(category);
  const scoreLevel = getScoreLevel(percentage);

  const hasAllStrong = highScoreCount === questionCount && questionCount > 0;
  const hasMostlyStrong = highScoreCount > questionCount / 2;
  const hasMostlyWeak = lowScoreCount + criticalScoreCount > questionCount / 2;
  const hasAllCritical =
    criticalScoreCount === questionCount && questionCount > 0;

  // Manufacturing baseline specific summaries
  if (categoryName === "Safety & Work Ethic") {
    if (hasAllStrong) {
      return `The candidate demonstrated strong safety awareness across all ${questionCount} questions. Evidence suggests reliable understanding of PPE, safety protocols, SOP expectations, teamwork, and professional conduct.`;
    }

    if (hasMostlyStrong) {
      return `The candidate showed generally reliable safety awareness, with ${highScoreCount} out of ${questionCount} responses showing strong evidence. Some safety or conduct areas may still require reinforcement during onboarding.`;
    }

    if (hasAllCritical) {
      return `Critical safety concerns were identified across all ${questionCount} questions. Comprehensive safety training and close supervision are recommended before production exposure.`;
    }

    if (hasMostlyWeak) {
      return `Safety and work ethic require priority development. ${lowScoreCount + criticalScoreCount} out of ${questionCount} responses suggest gaps that should be addressed before independent production responsibilities.`;
    }

    return `Safety and work ethic show ${scoreLevel.label.toLowerCase()} evidence. Supervisor should reinforce PPE requirements, SOP discipline, incident reporting, and professional conduct during onboarding.`;
  }

  if (categoryName === "Technical Fundamentals") {
    if (hasAllStrong) {
      return `The candidate demonstrated strong technical foundation across all ${questionCount} questions, suggesting good understanding of equipment basics, maintenance principles, sensors, motors, and mechanical systems.`;
    }

    if (hasMostlyStrong) {
      return `The candidate showed generally reliable technical fundamentals, with ${highScoreCount} out of ${questionCount} responses showing strong evidence. Practical equipment familiarization is still recommended.`;
    }

    if (hasAllCritical) {
      return `Critical gaps in technical fundamentals were identified. Foundational training is required before assigning independent equipment-related tasks.`;
    }

    if (hasMostlyWeak) {
      return `Technical fundamentals require priority development. The candidate may struggle with equipment concepts, maintenance basics, or system understanding without structured training.`;
    }

    return `Technical fundamentals show ${scoreLevel.label.toLowerCase()} evidence. Structured technical training and supervised practice are recommended.`;
  }

  if (categoryName === "Troubleshooting") {
    if (hasAllStrong) {
      return `The candidate demonstrated strong troubleshooting evidence across all ${questionCount} questions, suggesting systematic diagnostic thinking and good problem-resolution awareness.`;
    }

    if (hasMostlyStrong) {
      return `The candidate showed generally reliable troubleshooting capability, with ${highScoreCount} out of ${questionCount} responses showing strong diagnostic evidence. Continued practice with real production scenarios is recommended.`;
    }

    if (hasAllCritical) {
      return `Critical troubleshooting gaps were identified. The candidate requires structured diagnostic training and close supervision during problem-resolution tasks.`;
    }

    if (hasMostlyWeak) {
      return `Troubleshooting requires priority development. The candidate may need support with root-cause analysis, fault-finding, and structured diagnostic methods.`;
    }

    return `Troubleshooting shows ${scoreLevel.label.toLowerCase()} evidence. Practice with structured problem-solving methods such as 5 Whys, PDCA, or guided fault diagnosis is recommended.`;
  }

  if (categoryName === "Numerical Aptitude") {
    if (hasAllStrong) {
      return `The candidate demonstrated strong numerical reasoning across all ${questionCount} questions, suggesting reliable ability with production calculations, percentages, ratios, and rate interpretation.`;
    }

    if (hasMostlyStrong) {
      return `The candidate showed generally reliable numerical aptitude, with ${highScoreCount} out of ${questionCount} responses showing strong evidence. Continued practice with production metrics is recommended.`;
    }

    if (hasAllCritical) {
      return `Critical numeracy gaps were identified. Foundational math training is recommended before assigning production calculations or reporting tasks.`;
    }

    if (hasMostlyWeak) {
      return `Numerical aptitude requires priority development. The candidate may struggle with production calculations, efficiency math, or quality documentation without support.`;
    }

    return `Numerical aptitude shows ${scoreLevel.label.toLowerCase()} evidence. Production math practice and guided metric interpretation are recommended.`;
  }

  // General summary logic
  if (hasAllStrong) {
    return `Exceptional response pattern in ${categoryName}. All ${questionCount} responses showed strong evidence of understanding.`;
  }

  if (hasMostlyStrong) {
    return `Strong response pattern in ${categoryName}. ${highScoreCount} out of ${questionCount} responses showed strong evidence of understanding.`;
  }

  if (hasAllCritical) {
    return `Critical development need in ${categoryName}. All ${questionCount} responses showed major gaps requiring immediate support.`;
  }

  if (hasMostlyWeak) {
    return `Priority development need in ${categoryName}. ${lowScoreCount + criticalScoreCount} out of ${questionCount} responses suggest gaps requiring structured support.`;
  }

  if (isStrength(percentage)) {
    return `${categoryName} is a strength area. Response evidence suggests reliable capability that can be leveraged in role-relevant tasks.`;
  }

  if (isDevelopmentArea(percentage)) {
    return `${categoryName} is a development area. Response evidence suggests the candidate would benefit from structured training, practice, and feedback.`;
  }

  return `${categoryName} shows functional but non-dominant capability. Continued practice and role-specific reinforcement are recommended.`;
};

export const getCategorySpecificRecommendations = (category, data = {}) => {
  const categoryName = normalizeHtmlEntities(category);
  const percentage = safeNumber(data.percentage, 0);
  const questionDetails = Array.isArray(data.questionDetails)
    ? data.questionDetails
    : [];

  const weakAreas = questionDetails.filter((question) =>
    Number(question.percentage ?? question.score ?? 0) < 55
  );

  const recommendations = {
    "Safety & Work Ethic": [
      "Complete safety induction or refresher training.",
      "Participate in PPE demonstrations and safety drills.",
      "Review company SOPs, incident reporting rules, and emergency procedures.",
      "Work with a safety mentor during initial production exposure.",
      "Complete hazard recognition and risk assessment practice."
    ],

    "Technical Fundamentals": [
      "Complete foundational equipment operation training.",
      "Study maintenance principles and preventive maintenance basics.",
      "Practice identifying sensors, motors, pneumatic components, and common mechanical parts.",
      "Work with a technical mentor on equipment familiarization.",
      "Complete hands-on training for core manufacturing systems."
    ],

    Troubleshooting: [
      "Complete structured problem-solving training such as PDCA, 5 Whys, or DMAIC.",
      "Practice root-cause analysis on common production issues.",
      "Study equipment fault symptoms and basic diagnostic procedures.",
      "Work with an experienced technician on troubleshooting scenarios.",
      "Complete simulation-based troubleshooting exercises."
    ],

    "Numerical Aptitude": [
      "Complete production math and calculation practice.",
      "Practice efficiency calculations, percentages, ratios, and production rates.",
      "Study quality control documentation and basic data interpretation.",
      "Work with a mentor on production tracking systems.",
      "Complete a foundational numeracy refresher if needed."
    ],

    "Leadership & Management": [
      "Complete leadership fundamentals training focused on accountability and team direction.",
      "Practice giving constructive feedback in low-risk situations.",
      "Work with a mentor on conflict resolution and team coordination.",
      "Study leadership styles and when to apply them."
    ],

    "Cognitive Ability": [
      "Practice logical reasoning and structured problem-solving exercises.",
      "Take a course in critical thinking and decision-making.",
      "Work through case studies with a mentor.",
      "Use problem-solving frameworks such as PDCA or 5 Whys."
    ],

    Communication: [
      "Practice clear verbal and written communication.",
      "Seek feedback after presentations or written reports.",
      "Practice active listening and summarizing instructions.",
      "Join communication or presentation skills training."
    ],

    "Problem-Solving": [
      "Learn structured problem-solving methodologies.",
      "Practice with real-world scenarios and case studies.",
      "Participate in root-cause analysis training.",
      "Work on supervised cross-functional problem-solving tasks."
    ],

    "Emotional Intelligence": [
      "Participate in emotional intelligence and self-awareness workshops.",
      "Practice empathy and perspective-taking during daily interactions.",
      "Seek regular feedback on interpersonal effectiveness.",
      "Work with a coach or mentor on conflict management."
    ],

    Ownership: [
      "Take ownership of a small task or project from start to finish.",
      "Set clear accountability goals and review progress weekly.",
      "Practice communicating progress, blockers, and lessons learned.",
      "Seek feedback on follow-through and reliability."
    ],

    Collaboration: [
      "Participate in team-based assignments.",
      "Practice active listening and asking for input before decisions.",
      "Share credit and document team contributions.",
      "Seek feedback on teamwork effectiveness."
    ],

    Action: [
      "Practice time-bound decision-making.",
      "Break tasks into clear next actions and deadlines.",
      "Take initiative in low-risk work situations.",
      "Review progress regularly with a supervisor or mentor."
    ],

    Analysis: [
      "Use structured analytical frameworks before decisions.",
      "Practice root-cause analysis and data interpretation.",
      "Review case studies and document reasoning.",
      "Seek feedback on decision quality and analytical depth."
    ],

    "Risk Tolerance": [
      "Practice small, low-risk experiments.",
      "Use risk assessment tools to evaluate probability and impact.",
      "Discuss calculated risks with a mentor before action.",
      "Reflect on outcomes and lessons from controlled experiments."
    ],

    Structure: [
      "Use checklists and templates for recurring tasks.",
      "Review SOPs and follow procedures consistently.",
      "Document work steps and supervisor feedback.",
      "Practice process discipline in quality-critical tasks."
    ]
  };

  const defaultRecommendations = [
    "Complete targeted training in this area.",
    "Work with a mentor for guided development.",
    "Practice skills through supervised practical application.",
    "Set specific improvement goals with weekly check-ins."
  ];

  const selectedRecommendations =
    recommendations[categoryName] || defaultRecommendations;

  /**
   * Add specific weak-question evidence if available.
   */
  if (weakAreas.length > 0) {
    return [
      ...selectedRecommendations,
      `Review missed or low-scoring questions in ${categoryName} to identify specific knowledge gaps.`
    ];
  }

  /**
   * Adjust recommendation if the area is already strong.
   */
  if (isStrength(percentage)) {
    return [
      `Continue to leverage ${categoryName} as a strength.`,
      `Apply ${categoryName} in role-relevant assignments.`,
      `Consider mentoring or supporting peers in ${categoryName}.`
    ];
  }

  return selectedRecommendations;
};

export default {
  analyzeResponses,
  getCategorySpecificRecommendations
};
 *
 * Corrected version:
 * - Uses central scoring standard from utils/scoring.js
 * - Supports all assessment types
 * - Handles different response/query shapes safely
 * - Keeps existing exports:
 *   - analyzeResponses
 *   - getCategorySpecificRecommendations
 */

import {
  calculatePercentage,
  getScoreLevel,
  getScoreComment,
  getSupervisorImplication,
  isStrength,
  isDevelopmentArea,
  isCriticalGap,
  isPriorityDevelopment,
  calculateGapToTarget,
  roundNumber
} from "./scoring";

const safeString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const truncateText = (text, maxLength = 80) => {
  const value = safeString(text, "");

  if (!value) return "";

  if (value.length <= maxLength) return value;

  return `${value.substring(0, maxLength)}...`;
};

const normalizeHtmlEntities = (value) => {
  return safeString(value, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const getQuestionFromResponse = (response, questions = []) => {
  if (response?.unique_questions) return response.unique_questions;
  if (response?.question) return response.question;

  const questionId = response?.question_id;

  if (!questionId || !Array.isArray(questions)) return null;

  return questions.find((question) => String(question.id) === String(questionId));
};

const getAnswerFromResponse = (response, answers = []) => {
  if (response?.unique_answers) return response.unique_answers;
  if (response?.answer) return response.answer;

  const answerId = response?.answer_id;

  if (!answerId || !Array.isArray(answers)) return null;

  return answers.find((answer) => String(answer.id) === String(answerId));
};

const getCategoryFromQuestion = (question) => {
  return (
    normalizeHtmlEntities(question?.category) ||
    normalizeHtmlEntities(question?.section) ||
    normalizeHtmlEntities(question?.subsection) ||
    "General"
  );
};

const getQuestionText = (question) => {
  return (
    question?.question_text ||
    question?.text ||
    question?.question ||
    "Question text not available"
  );
};

const getAnswerText = (answer, response) => {
  return (
    answer?.answer_text ||
    answer?.text ||
    answer?.label ||
    response?.answer_text ||
    response?.selected_answer ||
    "Answer text not available"
  );
};

const getAnswerScore = (answer, response) => {
  return safeNumber(answer?.score ?? response?.score ?? 0, 0);
};

const getMaxScoreForResponse = (response) => {
  return safeNumber(response?.max_score ?? response?.maxScore ?? 5, 5);
};

/**
 * Main analyzer.
 *
 * Expected usage:
 * analyzeResponses(responses, questions, answers)
 *
 * It also works when responses already contain:
 * - unique_questions
 * - unique_answers
 */
export const analyzeResponses = (responses, questions = [], answers = []) => {
  const categorizedInsights = {};

  if (!Array.isArray(responses) || responses.length === 0) {
    return categorizedInsights;
  }

  responses.forEach((response) => {
    const question = getQuestionFromResponse(response, questions);
    const answer = getAnswerFromResponse(response, answers);

    if (!question && !answer) return;

    const category = getCategoryFromQuestion(question);
    const questionText = getQuestionText(question);
    const answerText = getAnswerText(answer, response);
    const score = getAnswerScore(answer, response);
    const maxScore = getMaxScoreForResponse(response);

    if (!categorizedInsights[category]) {
      categorizedInsights[category] = {
        insights: [],
        scores: [],
        maxScores: [],
        totalScore: 0,
        maxPossible: 0,
        questionCount: 0,
        highScoreCount: 0,
        moderateScoreCount: 0,
        lowScoreCount: 0,
        criticalScoreCount: 0,
        questionDetails: []
      };
    }

    const insight = generateInsight(category, questionText, answerText, score, maxScore);

    categorizedInsights[category].insights.push(insight);
    categorizedInsights[category].scores.push(score);
    categorizedInsights[category].maxScores.push(maxScore);
    categorizedInsights[category].totalScore += score;
    categorizedInsights[category].maxPossible += maxScore;
    categorizedInsights[category].questionCount += 1;

    const questionPercentage = calculatePercentage(score, maxScore);

    if (questionPercentage >= 75) {
      categorizedInsights[category].highScoreCount += 1;
    } else if (questionPercentage >= 55) {
      categorizedInsights[category].moderateScoreCount += 1;
    } else if (questionPercentage >= 40) {
      categorizedInsights[category].lowScoreCount += 1;
    } else {
      categorizedInsights[category].criticalScoreCount += 1;
    }

    categorizedInsights[category].questionDetails.push({
      question: truncateText(questionText, 120),
      fullQuestion: questionText,
      answer: answerText,
      score,
      maxScore,
      percentage: questionPercentage,
      interpretation: getScoreComment(questionPercentage),
      supervisorImplication: getSupervisorImplication(questionPercentage)
    });
  });

  Object.keys(categorizedInsights).forEach((category) => {
    const data = categorizedInsights[category];

    const percentage = calculatePercentage(data.totalScore, data.maxPossible);
    const averageScore =
      data.questionCount > 0 ? data.totalScore / data.questionCount : 0;

    data.averageScore = roundNumber(averageScore, 2);
