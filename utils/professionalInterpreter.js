/**
 * Professional Narrative Interpreter
 * Generates detailed, human-like interpretations based on actual assessment scores
 */

export const generateProfessionalInterpretation = (candidateName, categoryScores) => {
  
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

  // Generate all the narratives
  const overallSummary = generateOverallSummary(candidateName, strongAreas, moderateAreas, concernAreas);
  const profileSuggestion = generateProfileSuggestion(strongAreas, concernAreas);
  const leadershipEval = generateLeadershipEvaluation(concernAreas);
  const overallGrade = generateOverallGrade(strongAreas, concernAreas);
  const developmentPriorities = generateDevelopmentPriorities(concernAreas);

  return {
    overallSummary,
    categoryBreakdown: {
      strong: strongAreas.map(area => formatStrongArea(area)),
      moderate: moderateAreas.map(area => formatModerateArea(area)),
      concerns: concernAreas.map(area => formatConcernArea(area))
    },
    profileSuggestion,
    leadershipEval,
    overallGrade,
    developmentPriorities
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

// Generate overall summary
const generateOverallSummary = (candidateName, strongAreas, moderateAreas, concernAreas) => {
  const concernCount = concernAreas.length;
  const strongCount = strongAreas.length;
  const concernNames = concernAreas.map(c => c.category);
  const strongNames = strongAreas.map(s => s.category);
  
  let summary = `🔎 Overall Summary\n\n`;
  summary += `${candidateName} shows `;
  
  if (strongCount > 0) {
    summary += `clear strengths in ${formatList(strongNames)}`;
    if (concernCount > 0) {
      summary += `, but also notable gaps in ${formatList(concernNames)}`;
    }
  } else if (moderateAreas.length > 0) {
    summary += `moderate capability with areas for development in ${formatList(concernNames)}`;
  } else {
    summary += `significant development needs across most areas`;
  }
  
  summary += `.\n\n`;
  
  // Add assessment based on pattern
  if (concernNames.includes('Action') && concernNames.includes('Analysis') && concernNames.includes('Risk Tolerance')) {
    summary += `This candidate shows caution that may limit decisiveness and innovation. Best suited for structured, clearly defined roles with established processes.`;
  } else if (concernNames.includes('Ownership') && concernNames.includes('Action')) {
    summary += `This candidate would benefit from developing greater initiative and accountability. Works best with clear direction and regular check-ins.`;
  } else if (concernNames.includes('Collaboration')) {
    summary += `This candidate may perform better in independent roles rather than highly collaborative environments.`;
  } else if (strongCount >= 3 && concernCount <= 2) {
    summary += `This candidate has solid foundational strengths and manageable development areas. With targeted support, they could grow into more responsible roles.`;
  } else if (concernCount >= 4) {
    summary += `This profile indicates significant development needs. The candidate would benefit from structured training and close supervision in a clearly defined role.`;
  } else {
    summary += `This is a balanced profile with identified strengths and clear development paths.`;
  }
  
  return summary;
};

// Format strong area
const formatStrongArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  switch(category) {
    case 'Ownership':
      narrative += `• Takes full accountability for outcomes\n`;
      narrative += `• Drives results proactively\n`;
      narrative += `• Owns mistakes and learns from them\n`;
      narrative += `• Follows through on commitments\n\n`;
      narrative += `This is a strong indicator of reliability and self-direction.`;
      break;
      
    case 'Collaboration':
      narrative += `• Builds strong team relationships\n`;
      narrative += `• Seeks input from others\n`;
      narrative += `• Shares credit generously\n`;
      narrative += `• Fosters psychological safety\n\n`;
      narrative += `This is a valuable asset for team-based environments.`;
      break;
      
    case 'Action':
      narrative += `• Makes timely decisions\n`;
      narrative += `• Takes initiative without waiting\n`;
      narrative += `• Acts with appropriate urgency\n`;
      narrative += `• Moves priorities forward\n\n`;
      narrative += `This is essential for fast-paced and execution-focused roles.`;
      break;
      
    case 'Analysis':
      narrative += `• Thorough problem analysis\n`;
      narrative += `• Data-driven decision-making\n`;
      narrative += `• Systematic approach to challenges\n`;
      narrative += `• Thinks before acting\n\n`;
      narrative += `This is critical for strategic and quality-focused roles.`;
      break;
      
    case 'Risk Tolerance':
      narrative += `• Comfortable with uncertainty\n`;
      narrative += `• Experiments with new approaches\n`;
      narrative += `• Pushes boundaries appropriately\n`;
      narrative += `• Embraces innovation\n\n`;
      narrative += `This is valuable for innovation and growth-oriented roles.`;
      break;
      
    case 'Structure':
      narrative += `• Follows procedures reliably\n`;
      narrative += `• Maintains consistent quality\n`;
      narrative += `• Organized approach to work\n`;
      narrative += `• Provides stability\n\n`;
      narrative += `This is essential for process-critical and quality-focused roles.`;
      break;
      
    default:
      narrative += `Strong performance in this area. This is a valuable asset.`;
  }
  
  return narrative;
};

// Format moderate area
const formatModerateArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  switch(category) {
    case 'Ownership':
      narrative += `• Takes responsibility when assigned\n`;
      narrative += `• May need encouragement for initiative\n`;
      narrative += `• Follows through with guidance\n\n`;
      narrative += `Would benefit from accountability coaching and project ownership opportunities.`;
      break;
      
    case 'Collaboration':
      narrative += `• Works adequately with others\n`;
      narrative += `• May occasionally work in silos\n`;
      narrative += `• Cooperates when needed\n\n`;
      narrative += `Would benefit from teamwork development and cross-functional exposure.`;
      break;
      
    case 'Action':
      narrative += `• Acts when prompted\n`;
      narrative += `• May hesitate without clear direction\n`;
      narrative += `• Decisiveness develops with support\n\n`;
      narrative += `Would benefit from decision-making frameworks and time-boxed choices.`;
      break;
      
    case 'Analysis':
      narrative += `• Considers basic factors\n`;
      narrative += `• May need support with complex analysis\n`;
      narrative += `• Structured thinking developing\n\n`;
      narrative += `Would benefit from analytical training and structured problem-solving.`;
      break;
      
    case 'Risk Tolerance':
      narrative += `• Prefers proven approaches\n`;
      narrative += `• Accepts calculated risks with support\n`;
      narrative += `• Innovation mindset developing\n\n`;
      narrative += `Would benefit from innovation workshops and safe experimentation opportunities.`;
      break;
      
    case 'Structure':
      narrative += `• Follows processes when clear\n`;
      narrative += `• May improvise without guidance\n`;
      narrative += `• Consistency developing\n\n`;
      narrative += `Would benefit from process training and organizational systems.`;
      break;
      
    default:
      narrative += `Shows basic competency in this area that can be developed further with targeted training.`;
  }
  
  return narrative;
};

// Format concern area
const formatConcernArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  switch(category) {
    case 'Ownership':
      narrative += `• May deflect responsibility\n`;
      narrative += `• Waits for direction\n`;
      narrative += `• Inconsistent follow-through\n\n`;
      narrative += `This is a significant gap for roles requiring independence and accountability.`;
      break;
      
    case 'Collaboration':
      narrative += `• May work in silos\n`;
      narrative += `• Struggles with team dynamics\n`;
      narrative += `• Limited contribution to collective success\n\n`;
      narrative += `This is a concern for team-based environments.`;
      break;
      
    case 'Action':
      narrative += `• Delays decisions\n`;
      narrative += `• Hesitates without clear direction\n`;
      narrative += `• Misses opportunities due to caution\n\n`;
      narrative += `This is a major flag for fast-paced, execution-focused roles.`;
      break;
      
    case 'Analysis':
      narrative += `• Acts without sufficient information\n`;
      narrative += `• Fails to consider alternatives\n`;
      narrative += `• Limited structured thinking\n\n`;
      narrative += `This is a significant gap for strategic and analytical roles.`;
      break;
      
    case 'Risk Tolerance':
      narrative += `• Excessive caution\n`;
      narrative += `• Resists new approaches\n`;
      narrative += `• Avoids necessary innovation\n\n`;
      narrative += `This may limit growth and adaptability in dynamic environments.`;
      break;
      
    case 'Structure':
      narrative += `• Skips steps or improvises\n`;
      narrative += `• Inconsistent process adherence\n`;
      narrative += `• May impact quality and reliability\n\n`;
      narrative += `This is a concern for quality-critical and process-dependent roles.`;
      break;
      
    default:
      narrative += `Significant gaps in this area requiring immediate attention and structured development.`;
  }
  
  return narrative;
};

// Generate profile suggestion
const generateProfileSuggestion = (strongAreas, concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  const strongNames = strongAreas.map(s => s.category);
  
  let suggestion = `🎯 What This Profile Suggests\n\n`;
  suggestion += `**Best Fit:**\n\n`;
  
  if (concernNames.includes('Action') && concernNames.includes('Risk Tolerance')) {
    suggestion += `• Structured, process-driven roles\n`;
    suggestion += `• Clear SOP-defined environments\n`;
    suggestion += `• Roles with established procedures\n`;
    suggestion += `• Not high-autonomy or innovation roles\n\n`;
  } else if (strongNames.includes('Ownership') && strongNames.includes('Action')) {
    suggestion += `• Leadership or lead contributor roles\n`;
    suggestion += `• Project management positions\n`;
    suggestion += `• Roles requiring initiative and accountability\n\n`;
  } else if (strongNames.includes('Collaboration')) {
    suggestion += `• Team-based roles\n`;
    suggestion += `• Client-facing positions\n`;
    suggestion += `• Cross-functional initiatives\n\n`;
  } else if (strongNames.includes('Analysis') && strongNames.includes('Structure')) {
    suggestion += `• Analytical and quality-focused roles\n`;
    suggestion += `• Process improvement positions\n`;
    suggestion += `• Strategic planning roles\n\n`;
  } else {
    suggestion += `• Entry-level positions with training\n`;
    suggestion += `• Structured environments with clear guidance\n`;
    suggestion += `• Roles with close supervision\n\n`;
  }
  
  suggestion += `**Risk Areas:**\n\n`;
  
  if (concernNames.includes('Ownership')) {
    suggestion += `• Roles requiring high independence\n`;
  }
  if (concernNames.includes('Collaboration')) {
    suggestion += `• Heavy team-dependent roles\n`;
  }
  if (concernNames.includes('Action')) {
    suggestion += `• Fast-paced, time-sensitive roles\n`;
  }
  if (concernNames.includes('Analysis')) {
    suggestion += `• Strategic decision-making positions\n`;
  }
  if (concernNames.includes('Risk Tolerance')) {
    suggestion += `• Innovation and experimentation roles\n`;
  }
  if (concernNames.includes('Structure')) {
    suggestion += `• Quality-critical positions\n`;
  }
  
  if (!suggestion.includes('•')) {
    suggestion += `• Standard operational roles with appropriate supervision\n`;
  }
  
  return suggestion;
};

// Generate leadership evaluation
const generateLeadershipEvaluation = (concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  
  let evaluation = `🧠 Leadership Evaluation\n\n`;
  
  const hasOwnership = concernNames.includes('Ownership');
  const hasAction = concernNames.includes('Action');
  const hasAnalysis = concernNames.includes('Analysis');
  const hasCollaboration = concernNames.includes('Collaboration');
  
  if (hasOwnership && hasAction && hasAnalysis) {
    evaluation += `For leadership hiring, this profile shows significant gaps in:\n\n`;
    evaluation += `• Ownership and accountability\n`;
    evaluation += `• Decisiveness and initiative\n`;
    evaluation += `• Analytical thinking\n\n`;
    evaluation += `These gaps would likely limit leadership effectiveness without substantial development.`;
  } else if (hasOwnership || hasAction) {
    evaluation += `The ${hasOwnership ? 'ownership' : 'action'} gap needs to be addressed for leadership consideration. Leadership roles require initiative and accountability.`;
  } else if (hasAnalysis) {
    evaluation += `Analytical thinking is a gap that may limit strategic leadership capabilities. With development, this candidate could grow into management roles.`;
  } else {
    evaluation += `This candidate shows potential for leadership development with appropriate coaching and experience.`;
  }
  
  return evaluation;
};

// Generate overall grade
const generateOverallGrade = (strongAreas, concernAreas) => {
  const strongCount = strongAreas.length;
  const concernCount = concernAreas.length;
  
  let grade = `📌 Overall Grade Interpretation\n\n`;
  
  if (strongCount >= 4 && concernCount <= 2) {
    grade += `This profile reflects a strong candidate with multiple strengths and manageable development areas. Good potential for growth and increased responsibility.`;
  } else if (strongCount >= 2 && concernCount <= 3) {
    grade += `Balanced performer with identified strengths and clear development paths. Not a high-potential candidate without targeted growth, but capable in structured roles.`;
  } else if (concernCount >= 4) {
    grade += `This candidate requires significant development across multiple areas. Best suited for structured roles with close supervision and clear guidance.`;
  } else {
    grade += `Balanced profile with identified strengths and clear development paths. With targeted support, this candidate can grow into a solid contributor.`;
  }
  
  return grade;
};

// Generate development priorities
const generateDevelopmentPriorities = (concernAreas) => {
  if (concernAreas.length === 0) return '';
  
  let priorities = `📋 Development Priority Summary\n\n`;
  
  concernAreas.slice(0, 3).forEach((area, index) => {
    priorities += `Priority ${index + 1}: ${area.category}\n`;
    priorities += `• Focus on improving from ${area.percentage}% to 70%+ target\n`;
    priorities += `• ${getDevelopmentRecommendation(area.category)}\n\n`;
  });
  
  return priorities;
};

// Get development recommendation
const getDevelopmentRecommendation = (category) => {
  const recommendations = {
    'Ownership': 'Accountability coaching. Take ownership of a small project. Practice owning outcomes and learning from mistakes.',
    'Collaboration': 'Teamwork workshops. Participate in cross-functional projects. Practice active listening and seeking input.',
    'Action': 'Decision-making frameworks. Time-boxed decisions. Practice taking initiative in low-risk situations.',
    'Analysis': 'Critical thinking courses. Structured problem-solving training. Data analysis practice.',
    'Risk Tolerance': 'Innovation mindset workshops. Safe experimentation opportunities. Learn calculated risk assessment.',
    'Structure': 'Process discipline training. Project management tools. Develop personal organization systems.'
  };
  
  return recommendations[category] || 'Complete targeted training and work with a mentor for guided development.';
};

// Helper to format list
const formatList = (list) => {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
};
