// utils/scoring.js - COMPLETE VERSION WITH ALL ASSESSMENT TYPES

// ===== ASSESSMENT TYPE CONFIGURATIONS =====
export const ASSESSMENT_CONFIGS = {
  general: {
    name: 'General Assessment',
    sections: ['Cognitive Abilities', 'Personality Assessment', 'Leadership Potential', 'Bottled Water Manufacturing', 'Performance Metrics'],
    maxScorePerQuestion: 4,
    passingScore: 60,
    weightages: {
      'Cognitive Abilities': 0.25,
      'Personality Assessment': 0.20,
      'Leadership Potential': 0.20,
      'Bottled Water Manufacturing': 0.20,
      'Performance Metrics': 0.15
    }
  },
  behavioral: {
    name: 'Behavioral & Soft Skills',
    sections: ['Communication', 'Teamwork', 'Emotional Intelligence'],
    maxScorePerQuestion: 5,
    passingScore: 70,
    weightages: {
      'Communication': 0.35,
      'Teamwork': 0.35,
      'Emotional Intelligence': 0.30
    }
  },
  cognitive: {
    name: 'Cognitive & Thinking Skills',
    sections: ['Problem Solving', 'Critical Thinking', 'Analytical Reasoning'],
    maxScorePerQuestion: 5,
    passingScore: 65,
    weightages: {
      'Problem Solving': 0.40,
      'Critical Thinking': 0.35,
      'Analytical Reasoning': 0.25
    }
  },
  cultural: {
    name: 'Cultural & Attitudinal Fit',
    sections: ['Values Alignment', 'Work Ethic'],
    maxScorePerQuestion: 5,
    passingScore: 75,
    weightages: {
      'Values Alignment': 0.50,
      'Work Ethic': 0.50
    }
  },
  manufacturing: {
    name: 'Manufacturing Technical Skills',
    sections: ['Blowing Machines', 'Labeler', 'Filling', 'Conveyors', 'Stretchwrappers', 'Date Coders', 'Raw Materials'],
    maxScorePerQuestion: 5,
    passingScore: 70,
    weightages: {
      'Blowing Machines': 0.20,
      'Labeler': 0.15,
      'Filling': 0.15,
      'Conveyors': 0.15,
      'Stretchwrappers': 0.15,
      'Date Coders': 0.10,
      'Raw Materials': 0.10
    }
  }
};

// ===== CORE SCORING FUNCTIONS =====

/**
 * Calculate scores for any assessment type
 */
export function calculateAssessmentScore(userId, assessmentId, responses, questions, assessmentType = 'general') {
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
  const sectionScores = {};
  let totalRawScore = 0;
  let totalMaxScore = 0;
  const strengths = [];
  const weaknesses = [];

  // Initialize section scores
  config.sections.forEach(section => {
    sectionScores[section] = {
      total: 0,
      max: 0,
      count: 0,
      percentage: 0,
      grade: 'F',
      questionsAnswered: 0
    };
  });

  // Process each response
  Object.entries(responses).forEach(([questionId, responseData]) => {
    const question = questions.find(q => q.id === parseInt(questionId));
    if (!question) return;

    const section = question.section;
    if (!sectionScores[section]) return;

    // Get the answer score
    const answerId = responseData.answer_id || responseData;
    const answer = question.answers?.find(a => a.id === answerId);
    const score = answer?.score || responseData.score || 0;
    
    // Update section scores
    sectionScores[section].total += score;
    sectionScores[section].max += config.maxScorePerQuestion;
    sectionScores[section].count += 1;
    sectionScores[section].questionsAnswered += 1;
    
    totalRawScore += score;
    totalMaxScore += config.maxScorePerQuestion;

    // Track strengths based on answer metadata
    if (answer) {
      if (answer.strength_level === 'high' || score >= 4) {
        strengths.push({
          category: section,
          question: question.question_text.substring(0, 50) + '...',
          score: score,
          trait: answer.trait_category || 'General',
          interpretation: answer.interpretation || 'Demonstrated strong ability'
        });
      }
      if (score <= 2) {
        weaknesses.push({
          category: section,
          question: question.question_text.substring(0, 50) + '...',
          score: score,
          trait: answer.trait_category || 'General',
          interpretation: answer.interpretation || 'Area for improvement'
        });
      }
    }
  });

  // Calculate percentages and grades
  Object.keys(sectionScores).forEach(section => {
    const data = sectionScores[section];
    if (data.max > 0) {
      data.percentage = Math.round((data.total / data.max) * 100);
      data.grade = getCategoryGrade(data.percentage);
      
      // Add to strengths/weaknesses based on section performance
      if (data.percentage >= 70) {
        strengths.push({
          category: section,
          score: data.percentage,
          grade: data.grade,
          isSection: true,
          interpretation: `Strong performance in ${section}`
        });
      } else if (data.percentage < 50) {
        weaknesses.push({
          category: section,
          score: data.percentage,
          grade: data.grade,
          isSection: true,
          interpretation: `Development needed in ${section}`
        });
      }
    }
  });

  // Calculate weighted overall score
  let weightedScore = 0;
  let totalWeight = 0;

  Object.keys(sectionScores).forEach(section => {
    const weight = config.weightages[section] || 0;
    if (weight > 0 && sectionScores[section].percentage > 0) {
      weightedScore += sectionScores[section].percentage * weight;
      totalWeight += weight;
    }
  });

  const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 
                      totalMaxScore > 0 ? Math.round((totalRawScore / totalMaxScore) * 100) : 0;

  // Determine risk level and readiness
  const { riskLevel, readiness } = assessRiskAndReadiness(overallScore, sectionScores, assessmentType);

  // Deduplicate strengths and weaknesses
  const uniqueStrengths = deduplicateArray(strengths, 'category');
  const uniqueWeaknesses = deduplicateArray(weaknesses, 'category');

  return {
    overallScore,
    sectionScores,
    categoryScores: sectionScores,
    strengths: uniqueStrengths.slice(0, 5),
    weaknesses: uniqueWeaknesses.slice(0, 5),
    riskLevel,
    readiness,
    totalQuestions: Object.keys(responses).length,
    completedAt: new Date().toISOString()
  };
}

/**
 * Calculate scores from responses array (legacy support)
 */
export function calculateSectionScores(responses) {
  const sections = {
    'Cognitive Abilities': { total: 0, count: 0, max: 80 },
    'Personality Assessment': { total: 0, count: 0, max: 80 },
    'Leadership Potential': { total: 0, count: 0, max: 80 },
    'Bottled Water Manufacturing': { total: 0, count: 0, max: 80 },
    'Performance Metrics': { total: 0, count: 0, max: 80 }
  };

  responses.forEach(response => {
    const section = response.question?.section;
    if (section && sections[section]) {
      sections[section].total += response.score || 0;
      sections[section].count += 1;
    }
  });

  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      result[section] = Math.round((data.total / (data.count * 4)) * 100);
    } else {
      result[section] = 0;
    }
  });

  return result;
}

/**
 * Calculate total score percentage
 */
export function totalScore(responses) {
  if (!responses || responses.length === 0) return 0;
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * 4;
  return Math.round((total / maxPossible) * 100);
}

/**
 * Classify talent based on score and assessment type
 */
export function classifyTalent(score, assessmentType = 'general') {
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
  
  if (assessmentType === 'general') {
    if (score >= 90) return 'ELITE TALENT';
    if (score >= 80) return 'HIGH POTENTIAL';
    if (score >= 70) return 'SOLID PERFORMER';
    if (score >= 60) return 'DEVELOPMENT NEEDED';
    return 'UNDERPERFORMING';
  } else {
    // Specific classifications for other assessment types
    if (score >= 85) return 'EXCEPTIONAL';
    if (score >= 75) return 'PROFICIENT';
    if (score >= 65) return 'COMPETENT';
    if (score >= 55) return 'DEVELOPING';
    return 'FOUNDATIONAL';
  }
}

/**
 * Get section breakdown with detailed metrics
 */
export function getSectionBreakdown(responses) {
  const sections = {};
  
  responses.forEach(response => {
    const section = response.question?.section;
    if (section) {
      if (!sections[section]) {
        sections[section] = { total: 0, count: 0, maxPossible: 0 };
      }
      sections[section].total += response.score || 0;
      sections[section].count += 1;
      sections[section].maxPossible += 4; // Max score per question
    }
  });

  const breakdown = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      breakdown[section] = {
        score: Math.round((data.total / data.maxPossible) * 100),
        rawScore: data.total,
        maxScore: data.maxPossible,
        questionsAnswered: data.count,
        grade: getCategoryGrade(Math.round((data.total / data.maxPossible) * 100))
      };
    }
  });

  return breakdown;
}

/**
 * Get grade based on percentage
 */
export function getCategoryGrade(percentage) {
  if (percentage >= 95) return "A+";
  if (percentage >= 90) return "A";
  if (percentage >= 85) return "A-";
  if (percentage >= 80) return "B+";
  if (percentage >= 75) return "B";
  if (percentage >= 70) return "B-";
  if (percentage >= 65) return "C+";
  if (percentage >= 60) return "C";
  if (percentage >= 55) return "C-";
  if (percentage >= 50) return "D+";
  if (percentage >= 45) return "D";
  if (percentage >= 40) return "D-";
  return "F";
}

/**
 * Get development areas (weaknesses)
 */
export function getDevelopmentAreas(categoryScores) {
  const developmentAreas = [];
  const developmentThreshold = 60;
  
  Object.entries(categoryScores).forEach(([category, data]) => {
    const percentage = typeof data === 'object' ? (data.percentage || data.score || 0) : data;
    
    if (percentage < developmentThreshold) {
      developmentAreas.push({
        category,
        score: percentage,
        grade: getCategoryGrade(percentage),
        neededImprovement: Math.round(developmentThreshold - percentage),
        priority: percentage < 40 ? 'High' : percentage < 50 ? 'Medium' : 'Low'
      });
    }
  });
  
  developmentAreas.sort((a, b) => a.score - b.score);
  return developmentAreas;
}

/**
 * Get strengths based on scores
 */
export function getStrengths(categoryScores) {
  const strengths = [];
  const strengthThreshold = 70;
  
  Object.entries(categoryScores).forEach(([category, data]) => {
    const percentage = typeof data === 'object' ? (data.percentage || data.score || 0) : data;
    
    if (percentage >= strengthThreshold) {
      strengths.push({
        category,
        score: percentage,
        grade: getCategoryGrade(percentage),
        excellence: percentage >= 85 ? 'Exceptional' : 'Strong'
      });
    }
  });
  
  strengths.sort((a, b) => b.score - a.score);
  return strengths;
}

/**
 * Get overall classification for legacy support
 */
export function getOverallClassification(totalScore) {
  if (totalScore >= 450) return "Elite Talent";
  if (totalScore >= 400) return "Top Talent";
  if (totalScore >= 350) return "High Potential";
  if (totalScore >= 300) return "Solid Performer";
  if (totalScore >= 250) return "Developing Talent";
  if (totalScore >= 200) return "Emerging Talent";
  return "Needs Improvement";
}

/**
 * Assess risk level and readiness based on scores
 */
export function assessRiskAndReadiness(overallScore, sectionScores, assessmentType) {
  let riskLevel = 'low';
  let readiness = 'ready';
  let criticalSections = 0;
  let warningSections = 0;

  // Count sections with low scores
  Object.values(sectionScores).forEach(section => {
    const percentage = section.percentage || 0;
    if (percentage < 40) criticalSections++;
    else if (percentage < 60) warningSections++;
  });

  // Determine risk level
  if (overallScore < 50 || criticalSections > 2) {
    riskLevel = 'high';
    readiness = 'not_ready';
  } else if (overallScore < 65 || warningSections > 3 || criticalSections > 1) {
    riskLevel = 'medium';
    readiness = 'needs_development';
  }

  // Assessment-specific risk factors
  if (assessmentType === 'manufacturing' && overallScore < 70) {
    riskLevel = 'high'; // Technical skills require higher threshold
    readiness = 'needs_training';
  }

  if (assessmentType === 'behavioral' && overallScore < 60) {
    riskLevel = 'medium';
    readiness = 'coaching_needed';
  }

  return { riskLevel, readiness };
}

/**
 * Generate assessment report summary
 */
export function generateReportSummary(scoreData, userInfo, assessmentType) {
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
  const passed = scoreData.overallScore >= config.passingScore;
  
  return {
    candidateName: userInfo.name || userInfo.email,
    assessmentName: config.name,
    assessmentType,
    overallScore: scoreData.overallScore,
    grade: getCategoryGrade(scoreData.overallScore),
    passed,
    classification: classifyTalent(scoreData.overallScore, assessmentType),
    riskLevel: scoreData.riskLevel,
    readiness: scoreData.readiness,
    strengths: scoreData.strengths,
    weaknesses: scoreData.weaknesses,
    completedAt: scoreData.completedAt,
    recommendation: getRecommendation(scoreData.overallScore, assessmentType, passed)
  };
}

/**
 * Get specific recommendation based on score and assessment type
 */
function getRecommendation(score, assessmentType, passed) {
  if (passed) {
    if (score >= 80) {
      return 'Candidate exceeds requirements. Recommended for immediate consideration.';
    }
    return 'Candidate meets minimum requirements. Recommended for further evaluation.';
  } else {
    if (assessmentType === 'manufacturing') {
      return 'Candidate requires technical training before deployment.';
    }
    return 'Candidate does not meet minimum requirements. Consider development program.';
  }
}

/**
 * Deduplicate array based on key
 */
function deduplicateArray(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Format score for display
 */
export function formatScore(score, decimalPlaces = 0) {
  if (typeof score === 'number') {
    return score.toFixed(decimalPlaces);
  }
  return '0';
}

/**
 * Check if assessment is passed
 */
export function isAssessmentPassed(score, assessmentType = 'general') {
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
  return score >= config.passingScore;
}
