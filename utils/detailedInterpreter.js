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
    // General categories
    'Cognitive Ability': '• Strong analytical thinking\n• Handles complex problems effectively\n• Quick learner',
    'Communication': '• Articulates ideas clearly\n• Effective communicator\n• Engages stakeholders well',
    'Ethics & Integrity': '• Trustworthy and principled\n• Strong moral compass\n• Low ethical risk',
    'Leadership & Management': '• Natural leader\n• Inspires others\n• Drives results',
    'Performance Metrics': '• Results-oriented\n• Accountable\n• Meets or exceeds targets',
    'Problem-Solving': '• Systematic approach to challenges\n• Creative solutions\n• Effective troubleshooting',
    
    // New Personality Traits
    'Ownership': '• Takes full accountability for outcomes\n• Drives results proactively\n• Owns mistakes as learning opportunities\n• Reliable and follows through',
    'Collaboration': '• Builds strong team relationships\n• Actively seeks diverse perspectives\n• Shares credit generously\n• Fosters psychological safety',
    'Action': '• Moves quickly on priorities\n• Makes decisive choices\n• Takes initiative without waiting\n• Thrives in fast-paced environments',
    'Analysis': '• Thoroughly analyzes problems\n• Seeks data before acting\n• Thinks systematically\n• Excels in roles requiring careful planning',
    'Risk Tolerance': '• Comfortable with uncertainty\n• Experiments with new approaches\n• Pushes boundaries appropriately\n• Balances innovation with prudence',
    'Structure': '• Follows procedures reliably\n• Respects established systems\n• Maintains consistent quality\n• Provides stability and reliability'
  };
  return strengths[category] || '• Strong performance in this area\n• Valuable organizational asset';
};

const getGenericConcernInterpretation = (category, assessmentType) => {
  const concerns = {
    // General categories
    'Cognitive Ability': '• Difficulty with complex problems\n• May struggle with analytical tasks\n• Requires structured guidance',
    'Communication': '• Struggles to articulate ideas\n• May misunderstand instructions\n• Needs communication training',
    'Cultural & Attitudinal Fit': '• Potential misalignment with values\n• May struggle with team integration\n• Risk of engagement issues',
    'Leadership & Management': '• Not ready for leadership\n• Limited influence skills\n• Needs fundamental training',
    
    // New Personality Traits
    'Ownership': '• May deflect responsibility\n• Waits for direction rather than initiating\n• Needs accountability coaching\n• Requires clear expectations',
    'Collaboration': '• May work in silos\n• Struggles with team dynamics\n• Needs teamwork development\n• May prioritize individual goals',
    'Action': '• May delay decisions\n• Hesitates without clear direction\n• Needs encouragement to act\n• Struggles with urgency',
    'Analysis': '• May act without sufficient information\n• Fails to consider alternatives\n• Needs structured problem-solving\n• Could benefit from analytical training',
    'Risk Tolerance': '• Excessive caution\n• Resists new approaches\n• Avoids necessary risks\n• Needs innovation encouragement',
    'Structure': '• May skip steps or improvise\n• Inconsistent process adherence\n• Needs quality reinforcement\n• Requires clear guidelines'
  };
  return concerns[category] || '• Significant gap requiring attention\n• Immediate development needed\n• Requires structured support';
};

// Generate Hiring Interpretation
const generateHiringInterpretation = (strongAreas, concernAreas, config) => {
  const concernNames = concernAreas.map(c => c.category);
  const strongNames = strongAreas.map(c => c.category);
  
  let interpretation = `🎯 Hiring Recommendations for ${config.name}\n\n`;
  
  const hasLeadershipIssues = concernNames.some(c => c.includes('Leadership') || c.includes('Management'));
  const hasCulturalIssues = concernNames.some(c => c.includes('Cultural') || c.includes('Values'));
  const hasCognitiveIssues = concernNames.some(c => c.includes('Cognitive') || c.includes('Reasoning'));
  
  // Check personality-specific concerns
  const hasOwnershipIssues = concernNames.includes('Ownership');
  const hasCollaborationIssues = concernNames.includes('Collaboration');
  const hasActionIssues = concernNames.includes('Action');
  const hasAnalysisIssues = concernNames.includes('Analysis');
  const hasRiskIssues = concernNames.includes('Risk Tolerance');
  const hasStructureIssues = concernNames.includes('Structure');
  
  // Check personality-specific strengths
  const hasOwnershipStrength = strongNames.includes('Ownership');
  const hasCollaborationStrength = strongNames.includes('Collaboration');
  const hasActionStrength = strongNames.includes('Action');
  
  if (hasLeadershipIssues || hasCulturalIssues || hasCognitiveIssues) {
    interpretation += `Candidate requires careful consideration for roles requiring:\n\n`;
    if (hasLeadershipIssues) interpretation += `• Team management responsibility\n`;
    if (hasCulturalIssues) interpretation += `• High cultural alignment\n`;
    if (hasCognitiveIssues) interpretation += `• Complex analytical tasks\n\n`;
    interpretation += `Best suited for structured, supervised positions with clear guidance.`;
  } else if (hasOwnershipStrength && hasActionStrength) {
    interpretation += `Candidate shows strong initiative and accountability. Well-suited for roles requiring independence and drive.`;
  } else if (hasCollaborationStrength) {
    interpretation += `Candidate demonstrates strong team orientation. Excellent fit for collaborative environments.`;
  } else {
    interpretation += `Candidate shows potential for roles matching their strengths.`;
  }
  
  return interpretation;
};

// Generate Development Potential
const generateDevelopmentPotential = (strongAreas, concernAreas, config) => {
  const concernNames = concernAreas.map(c => c.category);
  const strongNames = strongAreas.map(c => c.category);
  
  let development = `📈 Development Potential for ${config.name}\n\n`;
  development += `Based on the assessment results, development should focus on:\n\n`;
  
  // Personality-specific development recommendations
  if (concernNames.includes('Ownership')) {
    development += `• Building accountability through ownership of small projects\n`;
  }
  if (concernNames.includes('Collaboration')) {
    development += `• Developing teamwork through cross-functional initiatives\n`;
  }
  if (concernNames.includes('Action')) {
    development += `• Building decisiveness through time-bound decision practice\n`;
  }
  if (concernNames.includes('Analysis')) {
    development += `• Strengthening analytical skills through structured frameworks\n`;
  }
  if (concernNames.includes('Risk Tolerance')) {
    development += `• Encouraging calculated risk-taking in safe environments\n`;
  }
  if (concernNames.includes('Structure')) {
    development += `• Reinforcing process adherence through clear guidelines\n`;
  }
  
  if (development === `📈 Development Potential for ${config.name}\n\nBased on the assessment results, development should focus on:\n\n`) {
    development += `• Targeted training in weaker competencies\n`;
    development += `• Structured mentoring program\n`;
    development += `• Regular feedback and progress reviews\n`;
    development += `• Practical application opportunities\n`;
  }
  
  return development;
};

// Generate Strategic Observation
const generateStrategicObservation = (strongAreas, concernAreas, config) => {
  const strongCount = strongAreas.length;
  const concernCount = concernAreas.length;
  const strongNames = strongAreas.map(c => c.category);
  
  let observation = `🧠 Strategic Observations for ${config.name}\n\n`;
  observation += `This profile suggests:\n\n`;
  observation += `• ${strongCount} areas of strength to leverage\n`;
  observation += `• ${concernCount} areas requiring development\n`;
  
  // Personality-specific observations
  if (strongNames.includes('Ownership') && strongNames.includes('Action')) {
    observation += `• Strong initiative profile - ready for autonomous roles\n`;
  }
  if (strongNames.includes('Collaboration') && strongNames.includes('Structure')) {
    observation += `• Team-oriented with process focus - good for operational roles\n`;
  }
  if (strongNames.includes('Analysis') && strongNames.includes('Structure')) {
    observation += `• Analytical and systematic - strong for quality-focused roles\n`;
  }
  
  observation += `• Alignment with ${strongCount >= 5 ? 'strategic' : 'operational'} roles`;
  
  return observation;
};

// Generate Final Assessment
const generateFinalAssessment = (strongAreas, concernAreas, config) => {
  const strongCount = strongAreas.length;
  const concernCount = concernAreas.length;
  const concernNames = concernAreas.map(c => c.category);
  
  let assessment = `📌 Final Assessment for ${config.name}\n\n`;
  
  // Personality-specific final assessments
  const hasOwnershipConcern = concernNames.includes('Ownership');
  const hasCollaborationConcern = concernNames.includes('Collaboration');
  const hasActionConcern = concernNames.includes('Action');
  
  if (strongCount >= 5 && concernCount <= 2) {
    assessment += `Exceptional candidate with strong alignment to ${config.id} competencies. Ready for challenging roles.`;
  } else if (strongCount >= 3 && concernCount <= 3) {
    assessment += `Solid candidate with balanced profile. Requires targeted development in specific areas.`;
  } else if (hasOwnershipConcern && hasActionConcern) {
    assessment += `Candidate requires development in initiative and accountability. Best suited for structured, supervised roles with clear expectations.`;
  } else if (hasCollaborationConcern) {
    assessment += `Candidate may benefit from teamwork development. Consider roles with limited team interdependence initially.`;
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
  const concernNames = concernAreas.map(a => a.category);
  
  let analysis = `🎯 Role Fit Analysis\n\n`;
  analysis += `Best suited for roles requiring:\n\n`;
  
  // Personality-specific fit analysis
  if (strongNames.includes('Ownership') && strongNames.includes('Action')) {
    analysis += `• Independent work with accountability\n`;
    analysis += `• Fast-paced environments requiring initiative\n`;
    analysis += `• Leadership or lead contributor roles\n`;
  } else if (strongNames.includes('Collaboration')) {
    analysis += `• Strong communication and teamwork\n`;
    analysis += `• Client-facing or cross-functional collaboration\n`;
    analysis += `• Team-based project work\n`;
  } else if (strongNames.includes('Analysis') && strongNames.includes('Structure')) {
    analysis += `• Process-driven and quality-focused work\n`;
    analysis += `• Analytical and planning roles\n`;
    analysis += `• Structured environments with clear guidelines\n`;
  } else if (strongNames.includes('Risk Tolerance')) {
    analysis += `• Innovation and experimentation\n`;
    analysis += `• Research and development roles\n`;
    analysis += `• Agile or startup environments\n`;
  }
  
  // Check for roles to avoid
  if (concernNames.includes('Ownership') || concernNames.includes('Action')) {
    analysis += `\nMay need support in:\n`;
    analysis += `• Roles requiring high independence\n`;
    analysis += `• Positions with ambiguous expectations\n`;
    analysis += `• Fast-paced decision-making roles\n`;
  }
  
  if (concernNames.includes('Collaboration')) {
    analysis += `\nMay need support in:\n`;
    analysis += `• Heavy team-dependent roles\n`;
    analysis += `• Positions requiring frequent coordination\n`;
    analysis += `• Client-facing responsibilities\n`;
  }
  
  if (analysis === `🎯 Role Fit Analysis\n\nBest suited for roles requiring:\n\n`) {
    analysis += `• Structured, supervised positions\n`;
    analysis += `• Clear guidelines and procedures\n`;
    analysis += `• Developmental opportunities\n`;
  }
  
  return analysis;
};
