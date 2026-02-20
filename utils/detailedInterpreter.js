import { assessmentTypes } from './assessmentConfigs';

/**
 * Detailed Professional Interpreter
 * Generates comprehensive narrative analysis based on actual assessment scores
 */

export const generateDetailedInterpretation = (candidateName, categoryScores, assessmentType = 'general') => {
  
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
      gradeDesc: getGradeDescription(percentage)
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
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `🟢 ${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  // Assessment-specific interpretations
  switch(config.id) {
    case 'leadership':
      narrative += getLeadershipInterpretation(category, percentage);
      break;
    case 'cognitive':
      narrative += getCognitiveInterpretation(category, percentage);
      break;
    case 'technical':
      narrative += getTechnicalInterpretation(category, percentage);
      break;
    case 'personality':
      narrative += getPersonalityInterpretation(category, percentage);
      break;
    case 'performance':
      narrative += getPerformanceInterpretation(category, percentage);
      break;
    case 'behavioral':
      narrative += getBehavioralInterpretation(category, percentage);
      break;
    case 'cultural':
      narrative += getCulturalInterpretation(category, percentage);
      break;
    default:
      narrative += getGeneralInterpretation(category, percentage);
  }
  
  return narrative;
};

// Format Moderate Areas (60-69%)
const formatModerateArea = (area, config) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `🟡 ${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  narrative += getModerateInterpretation(category, config.id);
  
  return narrative;
};

// Format Concern Areas (<60%)
const formatConcernArea = (area, config) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `🔴 ${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  narrative += getConcernInterpretation(category, config.id);
  
  return narrative;
};

// Assessment-specific interpretations
const getGeneralInterpretation = (category, percentage) => {
  const interpretations = {
    'Cognitive Ability': '• Strong analytical thinking\n• Handles complex problems effectively\n• Quick learner',
    'Communication': '• Articulates ideas clearly\n• Effective in stakeholder engagement\n• Persuasive communicator',
    'Ethics & Integrity': '• Trustworthy and principled\n• Strong moral compass\n• Low ethical risk',
    'Leadership & Management': '• Natural leader\n• Inspires and motivates others\n• Effective delegator',
    'Performance Metrics': '• Results-driven\n• Accountable for outcomes\n• Exceeds targets'
  };
  return interpretations[category] || '• Strong performance in this area\n• Valuable organizational asset';
};

const getLeadershipInterpretation = (category, percentage) => {
  const interpretations = {
    'Vision & Strategic Thinking': '• Strategic mindset\n• Sees big picture\n• Plans effectively for future',
    'Decision-Making': '• Makes sound judgments\n• Balances risks and opportunities\n• Decisive under pressure',
    'People Management': '• Develops team members\n• Provides effective feedback\n• Builds high-performing teams',
    'Change Leadership': '• Drives transformation\n• Adapts quickly\n• Manages resistance effectively'
  };
  return interpretations[category] || '• Strong leadership capability\n• Inspires followership\n• Drives results';
};

const getCognitiveInterpretation = (category, percentage) => {
  const interpretations = {
    'Logical / Abstract Reasoning': '• Excellent pattern recognition\n• Handles abstract concepts\n• Strong analytical mind',
    'Numerical Reasoning': '• Comfortable with data\n• Strong quantitative skills\n• Analytical thinker',
    'Verbal Reasoning': '• Excellent comprehension\n• Processes information quickly\n• Strong language skills',
    'Problem-Solving': '• Systematic approach\n• Creative solutions\n• Effective under pressure'
  };
  return interpretations[category] || '• Strong cognitive abilities\n• Quick learner\n• Analytical thinker';
};

const getTechnicalInterpretation = (category, percentage) => {
  const interpretations = {
    'Technical Knowledge': '• Deep domain expertise\n• Stays current with technology\n• Applies knowledge effectively',
    'Troubleshooting': '• Systematic problem diagnosis\n• Quick to identify root causes\n• Effective problem solver',
    'Quality Control': '• Meticulous attention to detail\n• Maintains high standards\n• Identifies issues proactively',
    'Safety & Compliance': '• Strong safety mindset\n• Follows procedures diligently\n• Promotes safe practices'
  };
  return interpretations[category] || '• Strong technical aptitude\n• Applies knowledge effectively\n• Quick to learn new systems';
};

const getPersonalityInterpretation = (category, percentage) => {
  const interpretations = {
    'Openness': '• Creative and innovative\n• Embraces new ideas\n• Adaptable to change',
    'Conscientiousness': '• Organized and dependable\n• Follows through on commitments\n• High attention to detail',
    'Extraversion': '• Energized by social interaction\n• Builds relationships easily\n• Effective collaborator',
    'Emotional Stability': '• Resilient under pressure\n• Maintains composure\n• Handles stress effectively'
  };
  return interpretations[category] || '• Strong personality fit\n• Self-aware\n• Adaptable';
};

const getPerformanceInterpretation = (category, percentage) => {
  const interpretations = {
    'Productivity': '• Highly efficient\n• Consistently meets targets\n• Manages time effectively',
    'Quality': '• Produces excellent work\n• Attention to detail\n• Takes pride in output',
    'Accountability': '• Takes ownership\n• Reliable and dependable\n• Follows through',
    'Results Orientation': '• Driven to succeed\n• Sets and achieves goals\n• Focused on outcomes'
  };
  return interpretations[category] || '• Strong performer\n• Delivers results\n• Exceeds expectations';
};

const getBehavioralInterpretation = (category, percentage) => {
  const interpretations = {
    'Communication': '• Expresses ideas clearly\n• Listens actively\n• Adapts message to audience',
    'Teamwork': '• Collaborates effectively\n• Supports team members\n• Builds consensus',
    'Emotional Intelligence': '• Self-aware\n• Empathetic\n• Manages relationships well',
    'Conflict Resolution': '• Handles disagreements constructively\n• Finds win-win solutions\n• Maintains relationships'
  };
  return interpretations[category] || '• Strong interpersonal skills\n• Builds positive relationships\n• Team player';
};

const getCulturalInterpretation = (category, percentage) => {
  const interpretations = {
    'Values Alignment': '• Embodies company values\n• Role model for others\n• Strengthens culture',
    'Work Ethic': '• Dedicated and hardworking\n• Goes above and beyond\n• Takes initiative',
    'Diversity Awareness': '• Values differences\n• Inclusive mindset\n• Respects all perspectives',
    'Professional Conduct': '• Maintains professionalism\n• Ethical behavior\n• Positive representation'
  };
  return interpretations[category] || '• Strong cultural fit\n• Aligned with values\n• Contributes positively';
};

const getModerateInterpretation = (category, assessmentType) => {
  return '• Basic competency established\n• Requires development to reach proficiency\n• Needs targeted training\n• Potential for growth with support';
};

const getConcernInterpretation = (category, assessmentType) => {
  if (category.includes('Cognitive') || category.includes('Logical')) {
    return '• Difficulty with complex problems\n• May struggle with analytical tasks\n• Requires structured guidance\n• Learning curve may be slow';
  }
  if (category.includes('Communication')) {
    return '• Struggles to articulate ideas\n• May misunderstand instructions\n• Limited persuasive ability\n• Needs communication training';
  }
  if (category.includes('Cultural') || category.includes('Values')) {
    return '• Potential misalignment with values\n• May struggle with team integration\n• Risk of engagement issues\n• Requires cultural mentoring';
  }
  if (category.includes('Leadership') || category.includes('Management')) {
    return '• Not ready for leadership\n• Limited influence skills\n• Struggles with delegation\n• Needs fundamental training';
  }
  return '• Significant gap requiring attention\n• Immediate development needed\n• May impact performance\n• Requires structured support';
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
