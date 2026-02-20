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
  if (concernNames.includes('Cognitive Ability') && 
      concernNames.includes('Emotional Intelligence') && 
      concernNames.includes('Cultural & Attitudinal Fit')) {
    summary += `This is not a high-potential leadership profile yet, but may be suitable for a structured, supervised operational role with development support.`;
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
    case 'Cognitive Ability':
      narrative += `• Can process information reasonably well\n`;
      narrative += `• Likely capable of learning new systems\n`;
      narrative += `• May handle structured analysis\n\n`;
      narrative += `This suggests potential capacity — but potential is not yet translating into performance or leadership readiness.`;
      break;
      
    case 'Ethics & Integrity':
      narrative += `• Very positive indicator\n`;
      narrative += `• Trustworthy and principled\n`;
      narrative += `• Low ethical risk\n`;
      narrative += `• Likely dependable\n\n`;
      narrative += `This is often a non-negotiable leadership foundation, so this is a strong asset.`;
      break;
      
    case 'Performance Metrics':
      narrative += `• Can meet targets with guidance\n`;
      narrative += `• Likely execution-focused\n`;
      narrative += `• Reasonably accountable`;
      break;
      
    case 'Leadership & Management':
      narrative += `• Shows emerging leadership capacity\n`;
      narrative += `• Can manage tasks/people at a basic level\n`;
      narrative += `• Not yet strategic or highly influential`;
      break;
      
    case 'Communication':
      narrative += `• Articulates ideas clearly\n`;
      narrative += `• Effective in most situations\n`;
      narrative += `• Can adapt message to audience`;
      break;
      
    case 'Problem-Solving':
      narrative += `• Strong analytical thinking\n`;
      narrative += `• Handles complex problems effectively\n`;
      narrative += `• Systematic approach to challenges`;
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
    case 'Emotional Intelligence':
      narrative += `• Basic awareness of people dynamics\n`;
      narrative += `• Not highly influential\n`;
      narrative += `• Likely average in conflict handling`;
      break;
      
    case 'Ethics & Integrity':
      narrative += `• This is concerning.\n`;
      narrative += `• Not a red flag, but not reassuring either\n`;
      narrative += `• May follow rules when monitored\n`;
      narrative += `• Requires structured governance`;
      break;
      
    case 'Problem-Solving':
      narrative += `• Can manage routine issues\n`;
      narrative += `• May struggle in complex or ambiguous situations`;
      break;
      
    case 'Communication':
      narrative += `• Can communicate, but not persuasive or highly clear\n`;
      narrative += `• May struggle with executive communication`;
      break;
      
    case 'Personality & Behavioral':
      narrative += `• Likely stable but not high-impact\n`;
      narrative += `• May lack drive, resilience, or adaptability`;
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
    case 'Communication':
      narrative += `• Difficulty articulating ideas clearly\n`;
      narrative += `• Likely struggles in stakeholder engagement\n`;
      narrative += `• Weak executive presence`;
      break;
      
    case 'Cultural & Attitudinal Fit':
      narrative += `• This is a major hiring risk:\n\n`;
      narrative += `• Misalignment with company values\n`;
      narrative += `• Possible attitude or engagement issues\n`;
      narrative += `• May disrupt team cohesion`;
      break;
      
    case 'Leadership & Management':
      narrative += `• Not ready for supervisory responsibility\n`;
      narrative += `• Weak influence and delegation capacity\n`;
      narrative += `• Likely reactive rather than strategic`;
      break;
      
    case 'Personality & Behavioral':
      narrative += `• Possible low drive, resilience, or adaptability\n`;
      narrative += `• May struggle under pressure`;
      break;
      
    case 'Performance Metrics':
      narrative += `• Inconsistent execution\n`;
      narrative += `• May require close supervision`;
      break;
      
    case 'Technical & Manufacturing':
      narrative += `• Functional but not strong\n`;
      narrative += `• Would require training`;
      break;
      
    case 'Cognitive Ability':
      narrative += `• This is a major flag. It may indicate:\n\n`;
      narrative += `• Difficulty processing complex information\n`;
      narrative += `• Slow learning curve\n`;
      narrative += `• Limited analytical capacity`;
      break;
      
    case 'Emotional Intelligence':
      narrative += `• May struggle with self-awareness\n`;
      narrative += `• Limited conflict management skills\n`;
      narrative += `• Risk of poor team dynamics`;
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
  
  if (concernNames.includes('Cognitive Ability') || 
      concernNames.includes('Emotional Intelligence') || 
      concernNames.includes('Cultural & Attitudinal Fit')) {
    suggestion += `• Structured operational roles\n`;
    suggestion += `• Clear SOP-driven environments\n`;
    suggestion += `• Roles with supervision\n`;
    suggestion += `• Not high-autonomy or strategic roles\n\n`;
  } else if (strongNames.includes('Leadership & Management')) {
    suggestion += `• Supervisory positions\n`;
    suggestion += `• Team lead roles\n`;
    suggestion += `• Project coordination\n\n`;
  } else if (strongNames.includes('Technical & Manufacturing')) {
    suggestion += `• Technical specialist roles\n`;
    suggestion += `• Skilled trade positions\n`;
    suggestion += `• Quality assurance\n\n`;
  } else {
    suggestion += `• Entry-level positions with training\n`;
    suggestion += `• Structured environments with clear guidance\n`;
    suggestion += `• Roles with close supervision\n\n`;
  }
  
  suggestion += `**Risk Areas:**\n\n`;
  
  if (concernNames.includes('Cognitive Ability')) {
    suggestion += `• Complex analytical and strategic roles\n`;
  }
  if (concernNames.includes('Emotional Intelligence')) {
    suggestion += `• High-stakes people management\n`;
  }
  if (concernNames.includes('Cultural & Attitudinal Fit')) {
    suggestion += `• Culture-shaping positions\n`;
  }
  if (concernNames.includes('Leadership & Management')) {
    suggestion += `• Senior leadership\n`;
  }
  if (concernNames.includes('Technical & Manufacturing')) {
    suggestion += `• Technical expert roles\n`;
  }
  if (concernNames.includes('Communication')) {
    suggestion += `• Client-facing positions\n`;
  }
  
  if (!suggestion.includes('•')) {
    suggestion += `• Innovation-heavy roles\n`;
    suggestion += `• High-pressure strategic decision-making\n`;
  }
  
  return suggestion;
};

// Generate leadership evaluation
const generateLeadershipEvaluation = (concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  
  let evaluation = `🧠 Leadership Evaluation\n\n`;
  
  const hasCognitive = concernNames.includes('Cognitive Ability');
  const hasEI = concernNames.includes('Emotional Intelligence');
  const hasCultural = concernNames.includes('Cultural & Attitudinal Fit');
  
  if (hasCognitive && hasEI && hasCultural) {
    evaluation += `For leadership hiring, I would flag:\n\n`;
    evaluation += `• Low Cognitive Ability\n`;
    evaluation += `• Low Emotional Intelligence\n`;
    evaluation += `• Low Cultural Fit\n\n`;
    evaluation += `Those three together often predict:\n\n`;
    evaluation += `• Struggles in complexity\n`;
    evaluation += `• Team friction\n`;
    evaluation += `• Leadership ceiling\n\n`;
    evaluation += `Ethics is strong — but integrity alone doesn't compensate for low cognitive and emotional capacity in leadership roles.`;
  } else if (hasCognitive || hasEI || hasCultural) {
    evaluation += `For leadership consideration, the ${hasCognitive ? 'cognitive ability' : hasEI ? 'emotional intelligence' : 'cultural fit'} concern needs to be addressed. This may limit effectiveness in leadership roles without significant development.`;
  } else {
    evaluation += `This candidate shows potential for leadership development, though current experience may be limited. With targeted growth in strategic areas, they could progress toward leadership roles.`;
  }
  
  return evaluation;
};

// Generate overall grade
const generateOverallGrade = (strongAreas, concernAreas) => {
  const strongCount = strongAreas.length;
  const concernCount = concernAreas.length;
  
  let grade = `📌 Overall Grade Interpretation\n\n`;
  
  if (strongCount >= 5 && concernCount <= 2) {
    grade += `This profile reflects a strong candidate with multiple strengths and manageable development areas. Good potential for growth and increased responsibility.`;
  } else if (strongCount >= 3 && concernCount <= 3) {
    grade += `Average performer with integrity, but limited leadership upside without significant development. Not a poor candidate — but not high-potential.`;
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
    'Cognitive Ability': 'Enroll in critical thinking and problem-solving courses. Practice with case studies and analytical exercises.',
    'Emotional Intelligence': 'Participate in EI workshops. Practice active listening and seek feedback on interpersonal interactions.',
    'Technical & Manufacturing': 'Complete foundational technical training. Shadow experienced technicians for hands-on learning.',
    'Cultural & Attitudinal Fit': 'Participate in company culture workshops. Schedule regular feedback sessions on cultural alignment.',
    'Communication': 'Take business writing and presentation skills courses. Join Toastmasters or similar groups.',
    'Problem-Solving': 'Learn structured problem-solving frameworks. Practice with real-world case studies.',
    'Leadership & Management': 'Take leadership development courses. Seek opportunities to lead small projects.',
    'Performance Metrics': 'Set SMART goals and track progress weekly. Learn performance management frameworks.',
    'Personality & Behavioral': 'Work with a coach on professional presence and adaptability.',
    'Ethics & Integrity': 'Participate in ethics training and governance workshops.'
  };
  
  return recommendations[category] || 'Complete targeted training and work with a mentor for guided development.';
};

// Helper to format list
const formatList = (list) => {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
};
