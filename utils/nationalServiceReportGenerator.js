// utils/nationalServiceReportGenerator.js - FIXED VERSION
// Handles all National Service specific report generation logic
// Now properly generates sub-categories for the frontend

import { roundNumber, safeArray } from './scoring';

// ============================================================
// CATEGORY MAPPING - Updated with more comprehensive lists
// ============================================================

const WORKPLACE_CATEGORIES = [
  'safety', 'risk_awareness', 'risk', 'hazard',
  'technical_fundamentals', 'technical',
  'communication', 'teamwork', 'collaboration',
  'ownership', 'integrity', 'accountability',
  'professional_conduct', 'work_ethic', 'ethics',
  'workplace', 'workplace_readiness', 'readiness',
  'learning_agility', 'agility', 'adaptability'
];

const INTELLECTUAL_CATEGORIES = [
  'numerical_reasoning', 'numerical_aptitude', 'numerical', 'math',
  'logical_reasoning', 'logic', 'reasoning',
  'measurement', 'engineering_units', 'units',
  'spatial_reasoning', 'spatial',
  'problem_solving', 'troubleshooting', 'analysis',
  'critical_thinking', 'analytical', 'decision_making',
  'intellectual', 'cognitive', 'capability'
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
// ENHANCED CATEGORY BREAKDOWN CALCULATION
// ============================================================

export function calculateCategoryBreakdown(responses, questions) {
  const categoryMap = {};
  const categoryMaxMap = {};
  const categoryDimensionMap = {};
  const questionCountMap = {};

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
    // Get the category name (use section field)
    const category = question.section || question.category || 'General';
    const categoryKey = cleanText(category, 'general');
    
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const maxScore = answers.reduce((max, a) => Math.max(max, Number(a.score) || 0), 0) || 1;

    if (!categoryMap[categoryKey]) {
      categoryMap[categoryKey] = 0;
      categoryMaxMap[categoryKey] = 0;
      questionCountMap[categoryKey] = 0;
      
      // Determine if this category is workplace or intellectual
      if (isWorkplaceCategory(category)) {
        categoryDimensionMap[categoryKey] = 'workplace';
      } else if (isIntellectualCategory(category)) {
        categoryDimensionMap[categoryKey] = 'intellectual';
      } else {
        // Default based on category name patterns
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes('safety') || lowerCategory.includes('technical') || 
            lowerCategory.includes('communication') || lowerCategory.includes('teamwork') ||
            lowerCategory.includes('ownership') || lowerCategory.includes('integrity') ||
            lowerCategory.includes('workplace') || lowerCategory.includes('ethics') ||
            lowerCategory.includes('professional')) {
          categoryDimensionMap[categoryKey] = 'workplace';
        } else {
          categoryDimensionMap[categoryKey] = 'intellectual';
        }
      }
    }

    const response = responseMap[question.id];
    let earned = 0;
    if (response?.answer_id) {
      earned = getAnswerScore(question, response.answer_id);
    }

    categoryMap[categoryKey] += earned;
    categoryMaxMap[categoryKey] += maxScore;
    questionCountMap[categoryKey] += 1;
  });

  // Build category breakdown array with display names
  const breakdown = Object.keys(categoryMap).map(categoryKey => {
    const earned = categoryMap[categoryKey];
    const max = categoryMaxMap[categoryKey];
    const percentage = max > 0 ? roundNumber((earned / max) * 100, 1) : 0;
    const questionCount = questionCountMap[categoryKey] || 0;
    
    // Get display name (capitalized with spaces)
    const displayName = categoryKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      category: displayName,
      key: categoryKey,
      dimension: categoryDimensionMap[categoryKey] || 'other',
      earned: earned,
      max: max,
      percentage: percentage,
      questionCount: questionCount,
      score: earned,
      maxScore: max
    };
  });

  // Sort by percentage descending
  breakdown.sort((a, b) => b.percentage - a.percentage);

  return breakdown;
}

// ============================================================
// SPLIT CATEGORIES INTO WORKPLACE AND INTELLECTUAL
// ============================================================

export function splitCategoryBreakdown(categoryBreakdown) {
  const workplace = [];
  const intellectual = [];

  categoryBreakdown.forEach(cat => {
    if (cat.dimension === 'workplace') {
      workplace.push(cat);
    } else if (cat.dimension === 'intellectual') {
      intellectual.push(cat);
    } else {
      // Fallback: check the category name
      const categoryName = cat.category || '';
      const lowerName = categoryName.toLowerCase();
      
      const workplaceKeywords = ['safety', 'technical', 'communication', 'teamwork', 'ownership', 'integrity', 'workplace', 'ethics', 'professional', 'readiness'];
      const intellectualKeywords = ['numerical', 'logical', 'reasoning', 'measurement', 'engineering', 'spatial', 'problem', 'troubleshooting', 'critical', 'analytical', 'decision'];
      
      const isWorkplace = workplaceKeywords.some(k => lowerName.includes(k));
      const isIntellectual = intellectualKeywords.some(k => lowerName.includes(k));
      
      if (isWorkplace) {
        workplace.push(cat);
      } else if (isIntellectual) {
        intellectual.push(cat);
      } else {
        // Default: put in intellectual if we're not sure
        intellectual.push(cat);
      }
    }
  });

  return { workplace, intellectual };
}

// ============================================================
// MAIN REPORT BUILDING - ENHANCED
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
  categoryBreakdown = [],
  responses = [],
  questions = []
}) {
  // If we have responses and questions but no category breakdown, calculate it
  let finalCategoryBreakdown = categoryBreakdown;
  
  if ((finalCategoryBreakdown.length === 0) && responses.length > 0 && questions.length > 0) {
    finalCategoryBreakdown = calculateCategoryBreakdown(responses, questions);
    console.log('[NationalServiceReport] Calculated category breakdown from responses:', finalCategoryBreakdown.length);
  }
  
  // Split into workplace and intellectual sub-categories
  const { workplace, intellectual } = splitCategoryBreakdown(finalCategoryBreakdown);
  
  console.log('[NationalServiceReport] Workplace sub-categories:', workplace.length);
  console.log('[NationalServiceReport] Intellectual sub-categories:', intellectual.length);

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
    // ============================================================
    // CRITICAL: These are the sub-categories for the frontend
    // ============================================================
    categoryBreakdown: finalCategoryBreakdown,
    workplaceSubCategories: workplace,
    intellectualSubCategories: intellectual,
    // Also include as category_scores for compatibility with NationalServiceReport component
    category_scores: finalCategoryBreakdown,
    // Legacy support
    scores: {
      overall: overallScore,
      workplace: workplaceReadiness,
      intellectual: intellectualCapability,
      recommendation: recommendation.recommendation
    }
  };
}

// ============================================================
// EXPORT ALL FUNCTIONS
// ============================================================

export default {
  isWorkplaceCategory,
  isIntellectualCategory,
  classifyWorkplaceReadiness,
  classifyIntellectualCapability,
  getRecommendation,
  getSuggestedDepartments,
  calculateNationalServiceScores,
  calculateCategoryBreakdown,
  splitCategoryBreakdown,
  generateNationalServiceReport
};
