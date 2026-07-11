// utils/nationalServiceReportGenerator.js

import { roundNumber, safeArray } from './scoring';

/**
 * National Service Report Generator
 * Handles all National Service specific report generation logic
 */

// ============================================================
// CATEGORY MAPPING
// ============================================================

const WORKPLACE_CATEGORIES = [
  'safety', 'risk_awareness', 'problem_solving', 'troubleshooting',
  'technical_fundamentals', 'learning_agility', 'communication',
  'teamwork', 'ownership', 'integrity', 'professional_conduct', 'work_ethic'
];

const INTELLECTUAL_CATEGORIES = [
  'numerical_reasoning', 'numerical_aptitude', 'logical_reasoning',
  'measurement', 'engineering_units', 'spatial_reasoning'
];

function cleanText(value, fallback = "") {
  if (!value) return fallback;
  return String(value).toLowerCase().replace(/\s+/g, '_');
}

export function isWorkplaceCategory(category) {
  const normalized = cleanText(category, '');
  return WORKPLACE_CATEGORIES.some(key => normalized.includes(key));
}

export function isIntellectualCategory(category) {
  const normalized = cleanText(category, '');
  return INTELLECTUAL_CATEGORIES.some(key => normalized.includes(key));
}

// ============================================================
// CLASSIFICATION FUNCTIONS
// ============================================================

export function classifyWorkplaceReadiness(score) {
  if (score >= 85) return { band: 'Excellent', description: 'Candidate demonstrates strong workplace readiness.' };
  if (score >= 75) return { band: 'Ready', description: 'Candidate is ready for workplace responsibilities.' };
  if (score >= 65) return { band: 'Developing', description: 'Candidate requires structured support.' };
  return { band: 'Needs Improvement', description: 'Candidate requires significant development.' };
}

export function classifyIntellectualCapability(score) {
  if (score >= 85) return { band: 'Exceptional', description: 'Exceptional analytical ability.' };
  if (score >= 75) return { band: 'High Potential', description: 'Strong analytical ability.' };
  if (score >= 65) return { band: 'Moderate Potential', description: 'Moderate analytical ability.' };
  return { band: 'Development Required', description: 'Requires structured development.' };
}

// ============================================================
// RECOMMENDATION FUNCTIONS
// ============================================================

export function getRecommendation(workplaceReadiness, intellectualCapability) {
  if (workplaceReadiness >= 85 && intellectualCapability >= 85) {
    return { recommendation: 'Highly Recommended', priority: 1 };
  }
  if (workplaceReadiness >= 75 && intellectualCapability >= 75) {
    return { recommendation: 'Recommended', priority: 2 };
  }
  if (workplaceReadiness >= 65 && intellectualCapability >= 65) {
    return { recommendation: 'Reserve Pool', priority: 3 };
  }
  return { recommendation: 'Not Recommended', priority: 4 };
}

export function getSuggestedDepartments(workplaceScore, intellectualScore) {
  if (workplaceScore >= 80 && intellectualScore >= 80) {
    return ['Operations & Production Management', 'Quality Assurance & Control', 'Supply Chain & Logistics', 'Technical Services'];
  }
  if (workplaceScore >= 70 && intellectualScore >= 70) {
    return ['Production Support', 'Maintenance & Engineering', 'Quality Control', 'Warehouse & Distribution'];
  }
  if (workplaceScore >= 60 && intellectualScore >= 60) {
    return ['General Operations', 'Administrative Support', 'Entry-Level Technical Roles', 'Customer Service'];
  }
  return ['Structured Training Programs', 'Supervised Development Roles', 'Support & Administrative Functions'];
}

// ============================================================
// SCORE CALCULATION
// ============================================================

export function calculateNationalServiceScores(responses, questions) {
  let workplaceEarned = 0;
  let workplaceMax = 0;
  let intellectualEarned = 0;
  let intellectualMax = 0;

  const responseMap = {};
  responses.forEach(r => {
    responseMap[r.question_id] = r;
  });

  // Helper to get score from answer
  function getAnswerScore(question, answerId) {
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const answer = answers.find(a => String(a.id) === String(answerId));
    return answer ? Number(answer.score) || 0 : 0;
  }

  questions.forEach(question => {
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const maxScore = answers.reduce((max, a) => Math.max(max, Number(a.score) || 0), 0) || 1;

    const response = responseMap[question.id];
    let earned = 0;
    if (response?.answer_id) {
      earned = getAnswerScore(question, response.answer_id);
    }

    const category = cleanText(question.section || 'General', 'General');
    if (isWorkplaceCategory(category)) {
      workplaceEarned += earned;
      workplaceMax += maxScore;
    } else if (isIntellectualCategory(category)) {
      intellectualEarned += earned;
      intellectualMax += maxScore;
    }
  });

  return {
    workplaceEarned,
    workplaceMax,
    intellectualEarned,
    intellectualMax
  };
}

// ============================================================
// CATEGORY BREAKDOWN CALCULATION - NEW FUNCTION
// ============================================================

export function calculateCategoryBreakdown(responses, questions) {
  const categoryMap = {};
  const categoryMaxMap = {};
  const categoryDimensionMap = {};

  const responseMap = {};
  responses.forEach(r => {
    responseMap[r.question_id] = r;
  });

  function getAnswerScore(question, answerId) {
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const answer = answers.find(a => String(a.id) === String(answerId));
    return answer ? Number(answer.score) || 0 : 0;
  }

  questions.forEach(question => {
    const category = cleanText(question.section || 'General', 'General');
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const maxScore = answers.reduce((max, a) => Math.max(max, Number(a.score) || 0), 0) || 1;

    if (!categoryMap[category]) {
      categoryMap[category] = 0;
      categoryMaxMap[category] = 0;
      // Determine if this category is workplace or intellectual
      if (isWorkplaceCategory(category)) {
        categoryDimensionMap[category] = 'workplace';
      } else if (isIntellectualCategory(category)) {
        categoryDimensionMap[category] = 'intellectual';
      } else {
        categoryDimensionMap[category] = 'other';
      }
    }

    const response = responseMap[question.id];
    let earned = 0;
    if (response?.answer_id) {
      earned = getAnswerScore(question, response.answer_id);
    }

    categoryMap[category] += earned;
    categoryMaxMap[category] += maxScore;
  });

  // Build category breakdown array
  const breakdown = Object.keys(categoryMap).map(category => {
    const earned = categoryMap[category];
    const max = categoryMaxMap[category];
    const percentage = max > 0 ? roundNumber((earned / max) * 100, 2) : 0;
    
    return {
      category: category,
      dimension: categoryDimensionMap[category] || 'other',
      earned: earned,
      max: max,
      percentage: percentage,
      earnedDisplay: earned,
      maxDisplay: max
    };
  });

  // Sort by percentage descending
  breakdown.sort((a, b) => b.percentage - a.percentage);

  return breakdown;
}

// ============================================================
// REPORT BUILDING
// ============================================================

export function generateNationalServiceReport({
  profile,
  assessment,
  workplaceReadiness,
  intellectualCapability,
  overallScore,
  totalQuestions,
  answeredCount,
  recommendation,
  suggestedDepartments,
  workplaceClass,
  intellectualClass,
  categoryBreakdown = []  // NEW: Accept category breakdown
}) {
  return {
    candidateName: profile?.full_name || 'Candidate',
    assessmentName: assessment?.title || 'National Service Assessment',
    candidateInfo: {
      fullName: profile?.full_name || 'Candidate',
      university: profile?.university || 'Not Specified',
      programme: profile?.programme || 'Not Specified',
      graduationYear: profile?.graduation_year || 'Not Specified',
      preferredDepartment: profile?.preferred_department || 'Not Specified',
      assessmentDate: new Date().toLocaleDateString()
    },
    dimensions: {
      workplaceReadiness,
      intellectualCapability,
      overallScore
    },
    executiveSummary: {
      workplaceBand: workplaceClass.band,
      intellectualBand: intellectualClass.band,
      recommendation: recommendation.recommendation
    },
    recommendation: {
      level: recommendation.recommendation,
      priority: recommendation.priority
    },
    suggestedPlacement: suggestedDepartments,
    statistics: {
      totalQuestions,
      totalAnswered: answeredCount
    },
    classifications: {
      workplace: workplaceClass,
      intellectual: intellectualClass
    },
    categoryBreakdown: categoryBreakdown  // NEW: Include in report
  };
}
