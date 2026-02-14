// ===== ASSESSMENT TYPE CONFIGURATIONS =====
export const ASSESSMENT_CONFIGS = {
  general: {
    id: 'general',
    name: 'General Assessment',
    code: 'general',
    icon: '📊',
    color: '#607D8B',
    gradient: 'linear-gradient(135deg, #607D8B, #455A64)',
    sections: ['Cognitive Abilities', 'Personality Assessment', 'Leadership Potential', 'Technical Competence', 'Performance Metrics'],
    maxScorePerQuestion: 5,
    totalQuestions: 100,
    maxTotalScore: 500,
    passingScore: 350,
    timeLimitMinutes: 180,
    weightages: {
      'Cognitive Abilities': 0.25,
      'Personality Assessment': 0.20,
      'Leadership Potential': 0.20,
      'Technical Competence': 0.20,
      'Performance Metrics': 0.15
    }
  },
  leadership: {
    id: 'leadership',
    name: 'Leadership Assessment',
    code: 'leadership',
    icon: '👑',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)',
    sections: ['Leadership Potential'],
    maxScorePerQuestion: 5,
    totalQuestions: 50,
    maxTotalScore: 250,
    passingScore: 175,
    timeLimitMinutes: 60,
    weightages: {
      'Leadership Potential': 1.0
    },
    subcategories: ['Vision', 'Influence', 'Team Development', 'Strategic Thinking', 'Motivation', 'Decision Making']
  },
  cognitive: {
    id: 'cognitive',
    name: 'Cognitive Ability Assessment',
    code: 'cognitive',
    icon: '🧠',
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)',
    sections: ['Cognitive Abilities'],
    maxScorePerQuestion: 5,
    totalQuestions: 50,
    maxTotalScore: 250,
    passingScore: 175,
    timeLimitMinutes: 60,
    weightages: {
      'Cognitive Abilities': 1.0
    },
    subcategories: ['Analytical Thinking', 'Problem Solving', 'Critical Thinking', 'Logical Reasoning', 'Pattern Recognition']
  },
  technical: {
    id: 'technical',
    name: 'Technical Assessment',
    code: 'technical',
    icon: '⚙️',
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #C62828)',
    sections: ['Technical Competence'],
    maxScorePerQuestion: 5,
    totalQuestions: 50,
    maxTotalScore: 250,
    passingScore: 175,
    timeLimitMinutes: 60,
    weightages: {
      'Technical Competence': 1.0
    },
    subcategories: ['Technical Knowledge', 'Practical Application', 'Troubleshooting', 'Quality Control', 'Safety Protocols']
  },
  personality: {
    id: 'personality',
    name: 'Personality Assessment',
    code: 'personality',
    icon: '🌟',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    sections: ['Personality Assessment'],
    maxScorePerQuestion: 5,
    totalQuestions: 40,
    maxTotalScore: 200,
    passingScore: 140,
    timeLimitMinutes: 45,
    weightages: {
      'Personality Assessment': 1.0
    },
    subcategories: ['Communication', 'Teamwork', 'Emotional Intelligence', 'Adaptability', 'Conflict Resolution']
  },
  performance: {
    id: 'performance',
    name: 'Performance Assessment',
    code: 'performance',
    icon: '📈',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #F57C00)',
    sections: ['Performance Metrics'],
    maxScorePerQuestion: 5,
    totalQuestions: 40,
    maxTotalScore: 200,
    passingScore: 140,
    timeLimitMinutes: 45,
    weightages: {
      'Performance Metrics': 1.0
    },
    subcategories: ['Productivity', 'Goal Achievement', 'Time Management', 'Quality of Work', 'Initiative']
  },
  behavioral: {
    id: 'behavioral',
    name: 'Behavioral & Soft Skills',
    code: 'behavioral',
    icon: '🤝',
    color: '#00ACC1',
    gradient: 'linear-gradient(135deg, #00ACC1, #006064)',
    sections: ['Communication', 'Teamwork', 'Emotional Intelligence'],
    maxScorePerQuestion: 5,
    totalQuestions: 50,
    maxTotalScore: 250,
    passingScore: 175,
    timeLimitMinutes: 60,
    weightages: {
      'Communication': 0.35,
      'Teamwork': 0.35,
      'Emotional Intelligence': 0.30
    }
  },
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing Technical Skills',
    code: 'manufacturing',
    icon: '🏭',
    color: '#795548',
    gradient: 'linear-gradient(135deg, #795548, #4E342E)',
    sections: ['Equipment Operation', 'Safety Protocols', 'Quality Control', 'Maintenance'],
    maxScorePerQuestion: 5,
    totalQuestions: 50,
    maxTotalScore: 250,
    passingScore: 175,
    timeLimitMinutes: 60,
    weightages: {
      'Equipment Operation': 0.30,
      'Safety Protocols': 0.30,
      'Quality Control': 0.25,
      'Maintenance': 0.15
    }
  },
  cultural: {
    id: 'cultural',
    name: 'Cultural & Attitudinal Fit',
    code: 'cultural',
    icon: '🎯',
    color: '#E91E63',
    gradient: 'linear-gradient(135deg, #E91E63, #AD1457)',
    sections: ['Values Alignment', 'Work Ethic', 'Adaptability'],
    maxScorePerQuestion: 5,
    totalQuestions: 40,
    maxTotalScore: 200,
    passingScore: 140,
    timeLimitMinutes: 45,
    weightages: {
      'Values Alignment': 0.40,
      'Work Ethic': 0.35,
      'Adaptability': 0.25
    }
  }
};

// ===== CORE SCORING FUNCTIONS =====

/**
 * Calculate scores for any assessment type from responses data
 */
export function calculateAssessmentScore(sessionId, userId, assessmentId, responses, questions, assessmentType = 'general') {
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
  const sectionScores = {};
  const subcategoryScores = {};
  let totalRawScore = 0;
  let totalMaxScore = 0;
  const strengths = [];
  const weaknesses = [];
  const interpretations = {};

  // Initialize section scores
  config.sections.forEach(section => {
    sectionScores[section] = {
      total: 0,
      max: 0,
      count: 0,
      percentage: 0,
      grade: 'F',
      average: 0,
      questionsAnswered: 0
    };
  });

  // Process each response
  responses.forEach(response => {
    const question = questions.find(q => q.id === response.question_id);
    if (!question) return;

    const section = question.section;
    if (!sectionScores[section]) {
      // Handle new sections dynamically
      sectionScores[section] = {
        total: 0,
        max: 0,
        count: 0,
        percentage: 0,
        grade: 'F',
        average: 0,
        questionsAnswered: 0
      };
    }

    const answer = response.answer;
    const score = answer?.score || 0;
    const maxScore = config.maxScorePerQuestion || 5;
    
    // Update section scores
    sectionScores[section].total += score;
    sectionScores[section].max += maxScore;
    sectionScores[section].count += 1;
    sectionScores[section].questionsAnswered += 1;
    
    totalRawScore += score;
    totalMaxScore += maxScore;

    // Track subcategory scores
    const subsection = question.subsection;
    if (subsection) {
      if (!subcategoryScores[section]) {
        subcategoryScores[section] = {};
      }
      if (!subcategoryScores[section][subsection]) {
        subcategoryScores[section][subsection] = {
          total: 0,
          count: 0,
          max: 0
        };
      }
      subcategoryScores[section][subsection].total += score;
      subcategoryScores[section][subsection].count += 1;
      subcategoryScores[section][subsection].max += maxScore;
    }

    // Track strengths based on answer metadata
    if (answer) {
      if (answer.strength_level === 'high' || score >= 4) {
        strengths.push({
          category: section,
          subcategory: subsection,
          question: question.question_text,
          score: score,
          maxScore: maxScore,
          trait: answer.trait_category || 'General',
          interpretation: answer.interpretation || 'Demonstrated strong ability'
        });
      }
      if (score <= 2) {
        weaknesses.push({
          category: section,
          subcategory: subsection,
          question: question.question_text,
          score: score,
          maxScore: maxScore,
          trait: answer.trait_category || 'General',
          interpretation: answer.interpretation || 'Area for improvement'
        });
      }
    }
  });

  // Calculate percentages and grades for sections
  Object.keys(sectionScores).forEach(section => {
    const data = sectionScores[section];
    if (data.max > 0) {
      data.percentage = Math.round((data.total / data.max) * 100);
      data.average = data.count > 0 ? (data.total / data.count).toFixed(1) : 0;
      data.grade = getCategoryGrade(data.percentage);
      
      // Add interpretation
      interpretations[section] = generateSectionInterpretation(section, data.percentage);
      
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

  // Calculate subcategory percentages
  Object.keys(subcategoryScores).forEach(section => {
    Object.keys(subcategoryScores[section]).forEach(subcat => {
      const data = subcategoryScores[section][subcat];
      if (data.max > 0) {
        data.percentage = Math.round((data.total / data.max) * 100);
        data.average = (data.total / data.count).toFixed(1);
        data.grade = getCategoryGrade(data.percentage);
      }
    });
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

  // Calculate overall percentage based on total score
  const overallPercentage = config.maxTotalScore > 0 
    ? Math.round((totalRawScore / config.maxTotalScore) * 100)
    : overallScore;

  // Determine risk level and readiness
  const { riskLevel, readiness } = assessRiskAndReadiness(overallPercentage, sectionScores, assessmentType);

  // Generate recommendations
  const recommendations = generateRecommendations(sectionScores, strengths, weaknesses, assessmentType);

  // Deduplicate strengths and weaknesses
  const uniqueStrengths = deduplicateArray(strengths, 'category');
  const uniqueWeaknesses = deduplicateArray(weaknesses, 'category');

  return {
    sessionId,
    userId,
    assessmentId,
    assessmentType,
    overallScore: totalRawScore,
    maxScore: config.maxTotalScore,
    overallPercentage,
    sectionScores,
    subcategoryScores,
    interpretations,
    strengths: uniqueStrengths.slice(0, 5),
    weaknesses: uniqueWeaknesses.slice(0, 5),
    recommendations,
    riskLevel,
    readiness,
    totalQuestions: responses.length,
    totalAnswered: responses.length,
    completedAt: new Date().toISOString()
  };
}

/**
 * Calculate section scores from responses (legacy support)
 */
export function calculateSectionScores(responses) {
  const sections = {};
  
  responses.forEach(response => {
    const section = response.question?.section;
    if (section) {
      if (!sections[section]) {
        sections[section] = { total: 0, count: 0 };
      }
      sections[section].total += response.score || 0;
      sections[section].count += 1;
    }
  });

  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      result[section] = Math.round((data.total / (data.count * 5)) * 100);
    } else {
      result[section] = 0;
    }
  });

  return result;
}

/**
 * Calculate total score
 */
export function calculateTotalScore(responses) {
  if (!responses || responses.length === 0) return 0;
  return responses.reduce((sum, r) => sum + (r.score || 0), 0);
}

/**
 * Calculate total score percentage
 */
export function calculateTotalPercentage(responses, maxPerQuestion = 5) {
  if (!responses || responses.length === 0) return 0;
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * maxPerQuestion;
  return Math.round((total / maxPossible) * 100);
}

/**
 * Get grade based on percentage
 */
export function getCategoryGrade(percentage) {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

/**
 * Get grade color
 */
export function getGradeColor(grade) {
  const colors = {
    'A+': '#2E7D32',
    'A': '#2E7D32',
    'A-': '#2E7D32',
    'B+': '#4CAF50',
    'B': '#4CAF50',
    'B-': '#4CAF50',
    'C+': '#2196F3',
    'C': '#2196F3',
    'C-': '#2196F3',
    'D+': '#FF9800',
    'D': '#FF9800',
    'D-': '#FF9800',
    'F': '#F44336'
  };
  return colors[grade] || '#666';
}

/**
 * Generate section interpretation
 */
function generateSectionInterpretation(section, percentage) {
  if (percentage >= 80) {
    return `Exceptional performance in ${section}. Demonstrates mastery and consistent excellence.`;
  } else if (percentage >= 60) {
    return `Good performance in ${section} with room for growth. Meets expectations.`;
  } else if (percentage >= 40) {
    return `Developing in ${section}. Needs focused attention and structured support.`;
  } else {
    return `Significant development needed in ${section}. Requires intensive training and supervision.`;
  }
}

/**
 * Generate recommendations based on scores
 */
function generateRecommendations(sectionScores, strengths, weaknesses, assessmentType) {
  const recommendations = [];
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;

  // Add recommendations based on strengths
  strengths.slice(0, 3).forEach(strength => {
    if (strength.isSection) {
      recommendations.push(`Leverage strength in ${strength.category} by assigning challenging projects and mentoring opportunities.`);
    }
  });

  // Add recommendations based on weaknesses
  weaknesses.slice(0, 3).forEach(weakness => {
    if (weakness.isSection) {
      recommendations.push(`Focus on developing ${weakness.category} through targeted training, workshops, and practical exercises.`);
    }
  });

  // Add assessment-specific recommendations
  if (assessmentType === 'manufacturing') {
    if (sectionScores['Safety Protocols']?.percentage < 70) {
      recommendations.push('Priority: Complete safety certification and attend refresher training.');
    }
    if (sectionScores['Equipment Operation']?.percentage < 60) {
      recommendations.push('Schedule hands-on equipment training with experienced operator.');
    }
  }

  if (assessmentType === 'leadership') {
    if (strengths.length > 2) {
      recommendations.push('Consider for leadership development program and mentoring junior staff.');
    }
    if (weaknesses.length > 1) {
      recommendations.push('Enroll in foundational leadership training and seek coaching opportunities.');
    }
  }

  // Add general recommendations if none generated
  if (recommendations.length === 0) {
    recommendations.push('Continue current development path with regular feedback and check-ins.');
    recommendations.push('Identify specific areas for growth through performance discussions.');
  }

  return recommendations.slice(0, 5);
}

/**
 * Assess risk level and readiness
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
    readiness = 'development_needed';
  }

  // Assessment-specific risk factors
  if (assessmentType === 'manufacturing' && overallScore < 70) {
    riskLevel = 'high';
    readiness = 'training_required';
  }

  if (assessmentType === 'leadership' && overallScore < 60) {
    riskLevel = 'medium';
    readiness = 'coaching_needed';
  }

  return { riskLevel, readiness };
}

/**
 * Get classification based on score and assessment type
 */
export function getClassification(score, maxScore, assessmentType = 'general') {
  const percentage = (score / maxScore) * 100;
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;

  if (assessmentType === 'general') {
    if (score >= 450) return 'Elite Talent';
    if (score >= 400) return 'Top Talent';
    if (score >= 350) return 'High Potential';
    if (score >= 300) return 'Solid Performer';
    if (score >= 250) return 'Developing Talent';
    if (score >= 200) return 'Emerging Talent';
    return 'Needs Improvement';
  } else {
    if (percentage >= 90) return 'Exceptional';
    if (percentage >= 80) return 'Advanced';
    if (percentage >= 70) return 'Proficient';
    if (percentage >= 60) return 'Developing';
    if (percentage >= 50) return 'Basic';
    return 'Needs Improvement';
  }
}

/**
 * Get strengths from section scores
 */
export function getStrengths(sectionScores) {
  const strengths = [];
  const threshold = 70;

  Object.entries(sectionScores).forEach(([section, data]) => {
    const percentage = data.percentage || data;
    if (percentage >= threshold) {
      strengths.push({
        category: section,
        score: percentage,
        grade: getCategoryGrade(percentage),
        level: percentage >= 85 ? 'Exceptional' : 'Strong'
      });
    }
  });

  return strengths.sort((a, b) => b.score - a.score);
}

/**
 * Get development areas from section scores
 */
export function getDevelopmentAreas(sectionScores) {
  const areas = [];
  const threshold = 60;

  Object.entries(sectionScores).forEach(([section, data]) => {
    const percentage = data.percentage || data;
    if (percentage < threshold) {
      areas.push({
        category: section,
        score: percentage,
        grade: getCategoryGrade(percentage),
        gap: Math.round(threshold - percentage),
        priority: percentage < 40 ? 'High' : percentage < 50 ? 'Medium' : 'Low'
      });
    }
  });

  return areas.sort((a, b) => a.score - b.score);
}

/**
 * Check if assessment is passed
 */
export function isAssessmentPassed(score, maxScore, assessmentType = 'general') {
  const config = ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
  return score >= config.passingScore;
}

/**
 * Get percentile rank
 */
export function getPercentileRank(score, allScores) {
  if (!allScores || allScores.length === 0) return 50;
  const count = allScores.filter(s => s < score).length;
  return Math.round((count / allScores.length) * 100);
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
 * Generate report summary
 */
export function generateReportSummary(result, userInfo) {
  const config = ASSESSMENT_CONFIGS[result.assessmentType] || ASSESSMENT_CONFIGS.general;
  const passed = result.overallScore >= config.passingScore;
  const classification = getClassification(result.overallScore, result.maxScore, result.assessmentType);

  return {
    candidateName: userInfo?.full_name || userInfo?.email || 'Candidate',
    assessmentName: config.name,
    assessmentType: result.assessmentType,
    overallScore: result.overallScore,
    maxScore: result.maxScore,
    percentage: result.overallPercentage,
    grade: getCategoryGrade(result.overallPercentage),
    passed,
    classification,
    riskLevel: result.riskLevel,
    readiness: result.readiness,
    strengths: result.strengths?.length || 0,
    weaknesses: result.weaknesses?.length || 0,
    completedAt: result.completedAt,
    summary: generateSummaryText(result, classification, passed)
  };
}

/**
 * Generate summary text
 */
function generateSummaryText(result, classification, passed) {
  if (passed) {
    if (result.overallPercentage >= 80) {
      return `Exceptional performance. Candidate demonstrates strong capabilities across all areas and is well-suited for the role.`;
    } else if (result.overallPercentage >= 70) {
      return `Good performance. Candidate meets requirements with identified areas for growth and development.`;
    } else {
      return `Satisfactory performance. Candidate meets minimum requirements but would benefit from targeted development.`;
    }
  } else {
    if (result.overallPercentage >= 50) {
      return `Below passing threshold. Candidate shows potential but needs significant development before being considered for the role.`;
    } else {
      return `Does not meet minimum requirements. Candidate requires comprehensive development and training.`;
    }
  }
}

/**
 * Get assessment config by type
 */
export function getAssessmentConfig(assessmentType) {
  return ASSESSMENT_CONFIGS[assessmentType] || ASSESSMENT_CONFIGS.general;
}

/**
 * Get all assessment types
 */
export function getAllAssessmentTypes() {
  return Object.values(ASSESSMENT_CONFIGS).map(config => ({
    id: config.id,
    code: config.code,
    name: config.name,
    icon: config.icon,
    color: config.color,
    gradient: config.gradient
  }));
}
