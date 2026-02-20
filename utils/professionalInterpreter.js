/**
 * Professional Narrative Interpreter
 * Generates human-like, detailed interpretations based on actual assessment scores
 */

// Generate complete professional interpretation
export const generateProfessionalInterpretation = (candidateName, categoryScores) => {
  
  // Categorize areas by score
  const strongAreas = [];
  const moderateAreas = [];
  const concernAreas = [];
  const areaDetails = {};
  
  Object.entries(categoryScores).forEach(([category, data]) => {
    const percentage = data.percentage;
    const score = data.score;
    const maxPossible = data.maxPossible;
    const grade = getGradeLetter(percentage);
    const gradeDesc = getGradeDescription(percentage);
    
    const area = {
      category,
      percentage,
      score,
      maxPossible,
      grade,
      gradeDesc,
      details: generateAreaDetails(category, percentage, score, maxPossible)
    };
    
    areaDetails[category] = area;
    
    if (percentage >= 70) {
      strongAreas.push(area);
    } else if (percentage >= 60) {
      moderateAreas.push(area);
    } else {
      concernAreas.push(area);
    }
  });

  return {
    overallSummary: generateOverallSummary(candidateName, strongAreas, moderateAreas, concernAreas),
    categoryBreakdown: {
      strong: strongAreas.map(area => formatStrongArea(area)),
      moderate: moderateAreas.map(area => formatModerateArea(area)),
      concerns: concernAreas.map(area => formatConcernArea(area))
    },
    profileSuggestion: generateProfileSuggestion(strongAreas, concernAreas),
    leadershipEval: generateLeadershipEvaluation(concernAreas),
    overallGrade: generateOverallGradeInterpretation(strongAreas, concernAreas),
    developmentPriorities: generateDevelopmentPriorities(concernAreas)
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

// Generate area-specific details
const generateAreaDetails = (category, percentage, score, maxPossible) => {
  const details = {
    'Cognitive Ability': {
      excellent: 'Exceptional analytical and strategic thinking capabilities. Demonstrates masterful problem-solving and can handle the most complex challenges with ease.',
      good: 'Strong analytical thinking. Handles complex problems effectively and shows consistent logical reasoning.',
      average: 'Moderate cognitive abilities. Benefits from structured approaches and may need support with highly complex problems.',
      below: 'Cognitive abilities need development. May struggle with complex problem-solving and analytical tasks.',
      poor: 'Significant cognitive gaps. Requires clear guidance, simplified tasks, and structured support for analytical work.'
    },
    'Communication': {
      excellent: 'Exceptional communicator. Articulates ideas with clarity, persuasiveness, and impact. Excels in both written and verbal communication.',
      good: 'Strong communication skills. Expresses ideas clearly and effectively in most situations.',
      average: 'Adequate communication. Can convey basic ideas but may struggle with complex messaging or persuasive communication.',
      below: 'Communication needs improvement. May have difficulty expressing ideas clearly or adapting to different audiences.',
      poor: 'Poor communication skills. Significant development needed in both written and verbal expression.'
    },
    'Cultural & Attitudinal Fit': {
      excellent: 'Strong cultural alignment. Embodies company values and enhances team dynamics naturally.',
      good: 'Good cultural fit. Generally aligned with organizational values and contributes positively.',
      average: 'Moderate cultural alignment. Some areas may need attention to fully integrate with company culture.',
      below: 'Cultural fit concerns. May not fully align with company values, requiring guidance and support.',
      poor: 'Poor cultural fit. Significant misalignment with organizational culture, values, and norms.'
    },
    'Emotional Intelligence': {
      excellent: 'High emotional intelligence. Exceptionally self-aware, empathetic, and skilled at managing relationships.',
      good: 'Good emotional awareness. Navigates interpersonal situations well and understands others\' perspectives.',
      average: 'Moderate emotional intelligence. May struggle with complex interpersonal dynamics or conflict situations.',
      below: 'Emotional intelligence needs development. Challenges with self-awareness, empathy, or relationship management.',
      poor: 'Poor emotional intelligence. Significant interpersonal challenges affecting team dynamics.'
    },
    'Ethics & Integrity': {
      excellent: 'Strong ethical foundation. Trustworthy and principled decision-maker with unwavering integrity.',
      good: 'Good integrity. Generally makes ethical choices with sound judgment in most situations.',
      average: 'Adequate ethical awareness. May need guidance in complex ethical situations.',
      below: 'Ethical concerns. Requires clear boundaries and supervision to ensure proper conduct.',
      poor: 'Poor ethical judgment. Significant risk area requiring immediate attention and intervention.'
    },
    'Leadership & Management': {
      excellent: 'Strong leadership potential. Strategic thinker who inspires and develops others effectively.',
      good: 'Good leadership capabilities. Can manage teams and drive results with developing influence.',
      average: 'Moderate leadership skills. May need support in people management and strategic thinking.',
      below: 'Leadership needs development. Challenges with team management and influencing others.',
      poor: 'Poor leadership potential. Not ready for management roles without significant development.'
    },
    'Performance Metrics': {
      excellent: 'Results-driven with strong accountability. Sets and achieves challenging goals consistently.',
      good: 'Good performance orientation. Meets targets and tracks progress effectively.',
      average: 'Adequate focus on results. May need guidance in goal setting and performance tracking.',
      below: 'Performance focus needs improvement. Challenges with accountability and meeting targets.',
      poor: 'Poor results orientation. Significant gaps in performance management and accountability.'
    },
    'Personality & Behavioral': {
      excellent: 'Stable, resilient, and adaptable. Consistently demonstrates positive work patterns.',
      good: 'Good behavioral profile. Generally stable, reliable, and adaptable.',
      average: 'Moderate behavioral patterns. May have some inconsistencies in work style.',
      below: 'Behavioral concerns. May lack resilience or adaptability in challenging situations.',
      poor: 'Poor behavioral profile. Significant concerns needing attention and intervention.'
    },
    'Problem-Solving': {
      excellent: 'Excellent problem-solver. Systematic, creative, and effective in all situations.',
      good: 'Good problem-solving skills. Handles most challenges effectively with sound analysis.',
      average: 'Moderate problem-solving. May need support with complex or novel issues.',
      below: 'Problem-solving needs development. Struggles with analysis and solution generation.',
      poor: 'Poor problem-solving. Significant difficulties with challenges requiring analytical thinking.'
    },
    'Technical & Manufacturing': {
      excellent: 'Strong technical expertise. Deep understanding of systems, processes, and applications.',
      good: 'Good technical knowledge. Handles most technical tasks effectively with minimal guidance.',
      average: 'Moderate technical skills. May need training in advanced areas and complex applications.',
      below: 'Technical knowledge needs development. Requires training and supervision.',
      poor: 'Poor technical expertise. Significant knowledge gaps requiring foundational training.'
    }
  };

  const categoryDetails = details[category];
  if (!categoryDetails) return `${category}: ${percentage}% - ${getGradeDescription(percentage)} performance.`;

  if (percentage >= 80) return categoryDetails.excellent;
  if (percentage >= 70) return categoryDetails.good;
  if (percentage >= 60) return categoryDetails.average;
  if (percentage >= 50) return categoryDetails.below;
  return categoryDetails.poor;
};

// Generate overall summary
const generateOverallSummary = (candidateName, strongAreas, moderateAreas, concernAreas) => {
  const strongNames = strongAreas.map(s => s.category);
  const concernNames = concernAreas.map(c => c.category);
  
  let summary = `🔎 Overall Summary\n\n`;
  summary += `${candidateName} shows `;
  
  if (strongAreas.length > 0) {
    summary += `clear strengths in ${formatList(strongNames)}`;
    if (concernAreas.length > 0) {
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
  } else if (strongAreas.length >= 3 && concernAreas.length <= 2) {
    summary += `This candidate has solid foundational strengths and manageable development areas. With targeted support, they could grow into more responsible roles.`;
  } else if (concernAreas.length >= 4) {
    summary += `This profile indicates significant development needs. The candidate would benefit from structured training and close supervision in a clearly defined role.`;
  } else {
    summary += `This is a balanced profile with identified strengths and clear development paths.`;
  }
  
  return summary;
};

// Format strong area with bullet points
const formatStrongArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade}) – ${gradeDesc}\n`;
  
  switch(category) {
    case 'Ethics & Integrity':
      narrative += `Very positive indicator. This suggests:\n\n`;
      narrative += `• Trustworthiness\n`;
      narrative += `• Compliance with rules\n`;
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
      
    default:
      narrative += area.details;
  }
  
  return narrative;
};

// Format moderate area
const formatModerateArea = (area) => {
  const { category, percentage, grade } = area;
  
  let narrative = `${category} – ${percentage}% (${grade})\n\n`;
  
  switch(category) {
    case 'Communication':
      narrative += `Can communicate, but not persuasive or highly clear\n\n`;
      narrative += `May struggle with executive communication`;
      break;
      
    case 'Problem-Solving':
      narrative += `Can solve routine problems\n\n`;
      narrative += `May struggle with complex, ambiguous situations`;
      break;
      
    case 'Personality & Behavioral':
      narrative += `Likely stable but not high-impact\n\n`;
      narrative += `May lack drive, resilience, or adaptability`;
      break;
      
    default:
      narrative += area.details;
  }
  
  return narrative;
};

// Format concern area
const formatConcernArea = (area) => {
  const { category, percentage, grade } = area;
  
  let narrative = `${category} – ${percentage}% (${grade})\n`;
  
  switch(category) {
    case 'Cognitive Ability':
      narrative += `This is a major flag. It may indicate:\n\n`;
      narrative += `• Difficulty processing complex information\n`;
      narrative += `• Slow learning curve\n`;
      narrative += `• Limited analytical capacity\n\n`;
      narrative += `For leadership or technical roles, this is a constraint.`;
      break;
      
    case 'Emotional Intelligence':
      narrative += `• May struggle with self-awareness\n`;
      narrative += `• Limited conflict management skills\n`;
      narrative += `• Risk of poor team dynamics`;
      break;
      
    case 'Technical & Manufacturing':
      narrative += `• Weak domain expertise\n`;
      narrative += `• Will require significant training`;
      break;
      
    case 'Cultural & Attitudinal Fit':
      narrative += `Another red flag:\n\n`;
      narrative += `• May not align with company values\n`;
      narrative += `• Potential resistance to norms\n`;
      narrative += `• Risk of engagement issues`;
      break;
      
    default:
      narrative += area.details;
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
  
  if (suggestion.endsWith('Risk Areas:\n\n')) {
    suggestion += `• Innovation-heavy roles\n`;
    suggestion += `• High-pressure strategic decision-making\n`;
  }
  
  return suggestion;
};

// Generate leadership evaluation
const generateLeadershipEvaluation = (concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  
  let evaluation = `🧠 If You're Evaluating for Leadership\n\n`;
  
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

// Generate overall grade interpretation
const generateOverallGradeInterpretation = (strongAreas, concernAreas) => {
  const strongCount = strongAreas.length;
  const concernCount = concernAreas.length;
  
  let interpretation = `📌 Overall Grade Interpretation\n\n`;
  
  if (strongCount >= 5 && concernCount <= 2) {
    interpretation += `This profile reflects a strong candidate with multiple strengths and manageable development areas. Good potential for growth and increased responsibility.`;
  } else if (strongCount >= 3 && concernCount <= 3) {
    interpretation += `Average performer with integrity, but limited leadership upside without significant development. Not a poor candidate — but not high-potential.`;
  } else if (concernCount >= 4) {
    interpretation += `This candidate requires significant development across multiple areas. Best suited for structured roles with close supervision and clear guidance.`;
  } else {
    interpretation += `Balanced profile with identified strengths and clear development paths. With targeted support, this candidate can grow into a solid contributor.`;
  }
  
  return interpretation;
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

// Get specific development recommendation
const getDevelopmentRecommendation = (category) => {
  const recommendations = {
    'Cognitive Ability': 'Enroll in critical thinking and problem-solving courses. Practice with case studies and analytical exercises.',
    'Emotional Intelligence': 'Participate in EI workshops. Practice active listening and seek feedback on interpersonal interactions.',
    'Technical & Manufacturing': 'Complete foundational technical training. Shadow experienced technicians for hands-on learning.',
    'Cultural & Attitudinal Fit': 'Participate in company culture workshops. Schedule regular feedback sessions on cultural alignment.',
    'Communication': 'Take business writing and presentation skills courses. Join Toastmasters or similar groups.',
    'Problem-Solving': 'Learn structured problem-solving frameworks. Practice with real-world case studies.',
    'Leadership & Management': 'Take leadership development courses. Seek opportunities to lead small projects.',
    'Performance Metrics': 'Set SMART goals and track progress weekly. Learn performance management frameworks.'
  };
  
  return recommendations[category] || 'Complete targeted training and work with a mentor for guided development.';
};

// Helper to format list
const formatList = (list) => {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
};
