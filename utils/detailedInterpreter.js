import { assessmentTypes } from './assessmentConfigs';

/**
 * Detailed Professional Interpreter
 * Generates comprehensive narrative analysis based on actual assessment scores
 */

export const generateDetailedInterpretation = (candidateName, categoryScores, assessmentType = 'general', responseInsights = {}) => {
  
  const config = assessmentTypes[assessmentType] || assessmentTypes.general;
  
  // Categorize areas by score
  const strongAreas = [];
  const moderateAreas = [];
  const concernAreas = [];
  
  Object.entries(categoryScores).forEach(([category, data]) => {
    const percentage = data.percentage;
    const score = data.score;
    const maxPossible = data.maxPossible;
    
    const area = {
      category,
      percentage,
      score,
      maxPossible,
      grade: getGradeLetter(percentage),
      gradeDesc: getGradeDescription(percentage),
      insights: responseInsights[category] || []
    };
    
    if (percentage >= 70) {
      strongAreas.push(area);
    } else if (percentage >= 60) {
      moderateAreas.push(area);
    } else {
      concernAreas.push(area);
    }
  });

  return {
    overallProfileSummary: generateOverallProfileSummary(candidateName, strongAreas, moderateAreas, concernAreas, config),
    categoryBreakdown: {
      strong: strongAreas.map(area => formatStrongArea(area, config)),
      moderate: moderateAreas.map(area => formatModerateArea(area, config)),
      concerns: concernAreas.map(area => formatConcernArea(area, config))
    },
    hiringInterpretation: generateHiringInterpretation(strongAreas, concernAreas, config),
    developmentPotential: generateDevelopmentPotential(strongAreas, concernAreas, config),
    strategicObservation: generateStrategicObservation(strongAreas, concernAreas, config),
    finalAssessment: generateFinalAssessment(strongAreas, concernAreas, config),
    roleFit: generateRoleFitAnalysis(strongAreas, concernAreas, config)
  };
};

// Helper to get grade letter
const getGradeLetter = (percentage) => {
  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'C-';
  if (percentage >= 50) return 'D+';
  if (percentage >= 40) return 'D';
  return 'F';
};

// Helper to get grade description
const getGradeDescription = (percentage) => {
  if (percentage >= 95) return 'Exceptional';
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 85) return 'Very Good';
  if (percentage >= 80) return 'Good';
  if (percentage >= 75) return 'Satisfactory';
  if (percentage >= 70) return 'Adequate';
  if (percentage >= 65) return 'Developing';
  if (percentage >= 60) return 'Basic Competency';
  if (percentage >= 55) return 'Minimum Competency';
  if (percentage >= 50) return 'Below Expectations';
  if (percentage >= 40) return 'Significant Gaps';
  return 'Unsatisfactory';
};

// Generate Overall Profile Summary
const generateOverallProfileSummary = (candidateName, strongAreas, moderateAreas, concernAreas, config) => {
  const concernCount = concernAreas.length;
  const strongCount = strongAreas.length;
  
  let summary = `Overall Profile Summary\n\n`;
  summary += `${candidateName} completed the ${config.name} with a total score that reflects `;
  
  if (strongCount >= 3 && concernCount <= 2) {
    summary += `a strong profile with clear strengths in multiple areas.`;
  } else if (strongCount >= 1 && concernCount <= 3) {
    summary += `a balanced profile with identifiable strengths and manageable development areas.`;
  } else if (concernCount >= 5) {
    summary += `significant development needs across multiple ${config.id} competencies.`;
  } else {
    summary += `a mixed profile requiring careful placement and targeted support.`;
  }
  
  return summary;
};

// Format Strong Areas (≥70%)
const formatStrongArea = (area, config) => {
  const { category, percentage, grade, gradeDesc, insights } = area;
  
  let narrative = `🟢 ${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  // Add specific insights from responses
  if (insights && insights.length > 0) {
    narrative += `Based on responses:\n`;
    insights.slice(0, 2).forEach(insight => {
      narrative += `• ${insight}\n`;
    });
  } else {
    // Fallback to generic interpretation
    narrative += getGenericStrengthInterpretation(category, config.id);
  }
  
  return narrative;
};

// Format Moderate Areas (60-69%)
const formatModerateArea = (area, config) => {
  const { category, percentage, grade, gradeDesc, insights } = area;
  
  let narrative = `🟡 ${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  if (insights && insights.length > 0) {
    narrative += `Response analysis:\n`;
    insights.slice(0, 2).forEach(insight => {
      narrative += `• ${insight}\n`;
    });
    narrative += `\n• Shows basic competency but needs development to reach proficiency.\n`;
    narrative += `• Would benefit from targeted training in this area.`;
  } else {
    narrative += `• Shows basic competency in this area\n`;
    narrative += `• Requires focused development to reach target levels\n`;
    narrative += `• Would benefit from structured learning and practice`;
  }
  
  return narrative;
};

// Format Concern Areas (<60%)
const formatConcernArea = (area, config) => {
  const { category, percentage, grade, gradeDesc, insights } = area;
  
  let narrative = `🔴 ${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  if (insights && insights.length > 0) {
    narrative += `Critical observations:\n`;
    insights.slice(0, 3).forEach(insight => {
      narrative += `• ${insight}\n`;
    });
    narrative += `\n• This is a significant gap requiring immediate attention.\n`;
    narrative += `• May impact overall performance without intervention.`;
  } else {
    narrative += getGenericConcernInterpretation(category, config.id);
  }
  
  return narrative;
};

// Generic interpretations for when specific insights aren't available
const getGenericStrengthInterpretation = (category, assessmentType) => {
  const strengths = {
    'Cognitive Ability': '• Strong analytical thinking\n• Handles complex problems effectively\n• Quick learner',
    'Communication': '• Articulates ideas clearly\n• Effective communicator\n• Engages stakeholders well',
    'Ethics & Integrity': '• Trustworthy and principled\n• Strong moral compass\n• Low ethical risk',
    'Leadership & Management': '• Natural leader\n• Inspires others\n• Drives results',
    'Performance Metrics': '• Results-oriented\n• Accountable\n• Meets or exceeds targets'
  };
  return strengths[category] || '• Strong performance in this area\n• Valuable organizational asset';
};

const getGenericConcernInterpretation = (category, assessmentType) => {
  const concerns = {
    'Cognitive Ability': '• Difficulty with complex problems\n• May struggle with analytical tasks\n• Requires structured guidance',
    'Communication': '• Struggles to articulate ideas\n• May misunderstand instructions\n• Needs communication training',
    'Cultural & Attitudinal Fit': '• Potential misalignment with values\n• May struggle with team integration\n• Risk of engagement issues',
    'Leadership & Management': '• Not ready for leadership\n• Limited influence skills\n• Needs fundamental training'
  };
  return concerns[category] || '• Significant gap requiring attention\n• Immediate development needed\n• Requires structured support';
};

// Generate Hiring Interpretation
const generateHiringInterpretation = (strongAreas, concernAreas, config) => {
  const concernNames = concernAreas.map(c => c.category);
  
  let interpretation = `🎯 Hiring Recommendations for ${config.name}\n\n`;
  
  const hasLeadershipIssues = concernNames.some(c => c.includes('Leadership') || c.includes('Management'));
  const hasCulturalIssues = concernNames.some(c => c.includes('Cultural') || c.includes('Values'));
  const hasCognitiveIssues = concernNames.some(c => c.includes('Cognitive') || c.includes('Reasoning'));
  
  if (hasLeadershipIssues || hasCulturalIssues || hasCognitiveIssues) {
    interpretation += `Candidate requires careful consideration for roles requiring:\n\n`;
    if (hasLeadershipIssues) interpretation += `• Team management responsibility\n`;
    if (hasCulturalIssues) interpretation += `• High cultural alignment\n`;
    if (hasCognitiveIssues) interpretation += `• Complex analytical tasks\n\n`;
    interpretation += `Best suited for structured, supervised positions with clear guidance.`;
  } else {
    interpretation += `Candidate shows potential for roles matching their strengths.`;
  }
  
  return interpretation;
};

// Generate Development Potential
const generateDevelopmentPotential = (strongAreas, concernAreas, config) => {
  return `📈 Development Potential for ${config.name}\n\n` +
    `Based on the assessment results, development should focus on:\n\n` +
    `• Targeted training in weaker competencies\n` +
    `• Structured mentoring program\n` +
    `• Regular feedback and progress reviews\n` +
    `• Practical application opportunities`;
};

// Generate Strategic Observation
const generateStrategicObservation = (strongAreas, concernAreas, config) => {
  return `🧠 Strategic Observations for ${config.name}\n\n` +
    `This profile suggests:\n\n` +
    `• ${strongAreas.length} areas of strength to leverage\n` +
    `• ${concernAreas.length} areas requiring development\n` +
    `• Alignment with ${strongAreas.length >= 5 ? 'strategic' : 'operational'} roles`;
};

// Generate Final Assessment
const generateFinalAssessment = (strongAreas, concernAreas, config) => {
  const strongCount = strongAreas.length;
  const concernCount = concernAreas.length;
  
  let assessment = `📌 Final Assessment for ${config.name}\n\n`;
  
  if (strongCount >= 5 && concernCount <= 2) {
    assessment += `Exceptional candidate with strong alignment to ${config.id} competencies. Ready for challenging roles.`;
  } else if (strongCount >= 3 && concernCount <= 3) {
    assessment += `Solid candidate with balanced profile. Requires targeted development in specific areas.`;
  } else if (concernCount >= 5) {
    assessment += `Candidate requires significant development across multiple ${config.id} competencies. Best suited for entry-level positions.`;
  } else {
    assessment += `Mixed profile requiring careful placement and structured support.`;
  }
  
  return assessment;
};

// Generate Role Fit Analysis
const generateRoleFitAnalysis = (strongAreas, concernAreas, config) => {
  const strongNames = strongAreas.map(a => a.category);
  
  let analysis = `🎯 Role Fit Analysis\n\n`;
  analysis += `Best suited for roles requiring:\n\n`;
  
  if (strongNames.includes('Communication')) analysis += `• Strong communication skills\n`;
  if (strongNames.includes('Leadership')) analysis += `• Leadership capabilities\n`;
  if (strongNames.includes('Technical')) analysis += `• Technical expertise\n`;
  if (strongNames.includes('Problem-Solving')) analysis += `• Analytical thinking\n`;
  
  if (analysis === `🎯 Role Fit Analysis\n\nBest suited for roles requiring:\n\n`) {
    analysis += `• Structured, supervised positions\n`;
    analysis += `• Clear guidelines and procedures\n`;
    analysis += `• Developmental opportunities\n`;
  }
  
  return analysis;
};
