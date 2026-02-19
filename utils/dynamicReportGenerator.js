/**
 * Universal Dynamic Report Generator
 * Works for ALL assessment types - General, Leadership, Cognitive, Technical, Performance, Cultural, etc.
 * Every report is unique based on actual candidate performance
 */

// Grade definitions that work for any score range
export const gradeScale = [
  { grade: 'A+', min: 95, color: '#0A5C2E', bg: '#E6F7E6', 
    description: 'Exceptional - Mastery level',
    message: (name, assessmentType) => `${name} demonstrates extraordinary capability in ${assessmentType}. This is top-tier performance.` },
  { grade: 'A', min: 90, color: '#1E7A44', bg: '#E6F7E6', 
    description: 'Excellent',
    message: (name, assessmentType) => `${name} shows deep understanding and consistent high-quality performance in ${assessmentType}.` },
  { grade: 'A-', min: 85, color: '#2E7D32', bg: '#E8F5E9', 
    description: 'Very Good',
    message: (name, assessmentType) => `${name} has strong capabilities in ${assessmentType} with only minor areas for refinement.` },
  { grade: 'B+', min: 80, color: '#2E7D32', bg: '#E8F5E9', 
    description: 'Good',
    message: (name, assessmentType) => `${name} delivers solid performance in ${assessmentType} with clear strengths to build upon.` },
  { grade: 'B', min: 75, color: '#1565C0', bg: '#E3F2FD', 
    description: 'Satisfactory',
    message: (name, assessmentType) => `${name} meets expectations in ${assessmentType} consistently.` },
  { grade: 'B-', min: 70, color: '#1565C0', bg: '#E3F2FD', 
    description: 'Adequate',
    message: (name, assessmentType) => `${name} has established a solid foundation in ${assessmentType} for future development.` },
  { grade: 'C+', min: 65, color: '#E65100', bg: '#FFF3E0', 
    description: 'Developing',
    message: (name, assessmentType) => `${name} shows potential in ${assessmentType} and would benefit from targeted guidance.` },
  { grade: 'C', min: 60, color: '#E65100', bg: '#FFF3E0', 
    description: 'Basic Competency',
    message: (name, assessmentType) => `${name} has core understanding of ${assessmentType} concepts but needs practical application.` },
  { grade: 'C-', min: 55, color: '#E65100', bg: '#FFF3E0', 
    description: 'Minimum Competency',
    message: (name, assessmentType) => `${name} has foundational ${assessmentType} knowledge that requires structured support.` },
  { grade: 'D+', min: 50, color: '#B71C1C', bg: '#FFEBEE', 
    description: 'Below Expectations',
    message: (name, assessmentType) => `${name} has significant opportunities for development in ${assessmentType}.` },
  { grade: 'D', min: 40, color: '#B71C1C', bg: '#FFEBEE', 
    description: 'Significant Gaps',
    message: (name, assessmentType) => `${name} requires focused attention on critical ${assessmentType} skills.` },
  { grade: 'F', min: 0, color: '#8B0000', bg: '#FFEBEE', 
    description: 'Unsatisfactory',
    message: (name, assessmentType) => `${name} needs intensive intervention and structured coaching in ${assessmentType}.` }
];

export const getGradeInfo = (percentage) => {
  return gradeScale.find(g => percentage >= g.min) || gradeScale[gradeScale.length - 1];
};

// Assessment-type specific descriptors
const assessmentDescriptors = {
  'general': {
    name: 'General Assessment',
    strengths: ['versatility', 'broad knowledge', 'adaptability'],
    weaknesses: ['specific knowledge gaps', 'skill development areas'],
    icon: '📊'
  },
  'leadership': {
    name: 'Leadership Assessment',
    strengths: ['strategic thinking', 'people management', 'vision', 'decisiveness'],
    weaknesses: ['team development', 'conflict resolution', 'coaching skills'],
    icon: '👑'
  },
  'cognitive': {
    name: 'Cognitive Ability Assessment',
    strengths: ['analytical thinking', 'problem-solving', 'logical reasoning'],
    weaknesses: ['processing speed', 'complex reasoning', 'pattern recognition'],
    icon: '🧠'
  },
  'technical': {
    name: 'Technical Competence Assessment',
    strengths: ['technical knowledge', 'system understanding', 'practical application'],
    weaknesses: ['advanced concepts', 'troubleshooting', 'emerging technologies'],
    icon: '⚙️'
  },
  'performance': {
    name: 'Performance Assessment',
    strengths: ['results orientation', 'efficiency', 'quality focus'],
    weaknesses: ['metric tracking', 'goal alignment', 'performance consistency'],
    icon: '📈'
  },
  'cultural': {
    name: 'Cultural & Attitudinal Fit Assessment',
    strengths: ['values alignment', 'team collaboration', 'work ethic'],
    weaknesses: ['adaptability', 'cultural awareness', 'interpersonal skills'],
    icon: '🤝'
  },
  'personality': {
    name: 'Personality Assessment',
    strengths: ['emotional intelligence', 'self-awareness', 'resilience'],
    weaknesses: ['behavioral patterns', 'stress management', 'interpersonal dynamics'],
    icon: '🌟'
  },
  'behavioral': {
    name: 'Behavioral & Soft Skills Assessment',
    strengths: ['communication', 'collaboration', 'adaptability'],
    weaknesses: ['conflict resolution', 'feedback reception', 'emotional regulation'],
    icon: '🗣️'
  }
};

// Dynamic overall rating generator based on score and assessment type
export const getOverallRating = (percentage, strengths, weaknesses, assessmentType = 'general') => {
  const strengthCount = strengths.length;
  const weaknessCount = weaknesses.length;
  const descriptor = assessmentDescriptors[assessmentType] || assessmentDescriptors.general;
  
  if (percentage >= 80) {
    return {
      title: 'Strong Performer',
      icon: '🌟',
      message: `Demonstrates strong ${descriptor.strengths[0]} capabilities. Ready for increased responsibility.`
    };
  } else if (percentage >= 70) {
    return {
      title: 'Competent Performer',
      icon: '📈',
      message: `Shows solid performance with ${strengthCount} key ${strengthCount === 1 ? 'strength' : 'strengths'} in ${descriptor.strengths.slice(0,2).join(' and ')}.`
    };
  } else if (percentage >= 60) {
    return {
      title: 'Developing Performer',
      icon: '🌱',
      message: `Has foundational skills with ${weaknessCount} ${weaknessCount === 1 ? 'area' : 'areas'} needing attention in ${descriptor.weaknesses[0]}.`
    };
  } else if (percentage >= 50) {
    return {
      title: 'Emerging Talent',
      icon: '🌿',
      message: `Building core competencies. Requires guidance in ${weaknesses.slice(0,2).map(w => w.area || w).join(' and ')}.`
    };
  } else if (percentage >= 40) {
    return {
      title: 'Needs Development',
      icon: '🎯',
      message: `Significant opportunities for growth in ${descriptor.weaknesses.slice(0,2).join(' and ')}.`
    };
  } else {
    return {
      title: 'Intensive Support Needed',
      icon: '⚠️',
      message: `Requires structured intervention in ${descriptor.weaknesses.join(' and ')} to build foundational capabilities.`
    };
  }
};

// Dynamic strength comment generator
export const getStrengthComment = (area, percentage, allStrengths, assessmentType = 'general') => {
  const rank = allStrengths.findIndex(s => (s.area || s) === area) + 1;
  const isTopStrength = rank === 1;
  
  const strengthPhrases = [
    `Demonstrates exceptional capability in ${area}`,
    `Shows natural aptitude for ${area}`,
    `Exhibits strong proficiency in ${area}`,
    `Performs consistently well in ${area}`,
    `Has developed robust ${area} skills`
  ];
  
  const impactPhrases = [
    `that significantly contributes to overall performance.`,
    `which is a valuable asset to the team.`,
    `that can be leveraged for greater responsibility.`,
    `setting them apart from peers.`,
    `forming a reliable foundation for growth.`
  ];
  
  const randomPhrase = strengthPhrases[Math.floor(Math.random() * strengthPhrases.length)];
  const randomImpact = impactPhrases[Math.floor(Math.random() * impactPhrases.length)];
  
  if (isTopStrength && percentage >= 80) {
    return `🎯 Top strength! ${randomPhrase} ${randomImpact}`;
  }
  return `${randomPhrase} ${randomImpact}`;
};

// Dynamic weakness comment generator
export const getWeaknessComment = (area, percentage, allWeaknesses, assessmentType = 'general') => {
  const rank = allWeaknesses.findIndex(w => (w.area || w) === area) + 1;
  const isPriority = rank <= 2;
  
  const weaknessPhrases = [
    `Would benefit significantly from focused development in ${area}.`,
    `${area} presents the greatest opportunity for growth.`,
    `Developing stronger ${area} skills should be a priority.`,
    `Additional support in ${area} will unlock greater potential.`,
    `Building competence in ${area} will enhance overall effectiveness.`
  ];
  
  const recommendationPhrases = [
    `Targeted training and practice are recommended.`,
    `Regular feedback and coaching will accelerate improvement.`,
    `Structured learning activities will build confidence.`,
    `Mentorship in this area would be valuable.`,
    `Practical application exercises will reinforce learning.`
  ];
  
  const randomPhrase = weaknessPhrases[Math.floor(Math.random() * weaknessPhrases.length)];
  const randomRec = recommendationPhrases[Math.floor(Math.random() * recommendationPhrases.length)];
  
  if (isPriority && percentage < 50) {
    return `🔴 Critical priority: ${randomPhrase} ${randomRec}`;
  } else if (isPriority) {
    return `🔸 Priority area: ${randomPhrase}`;
  }
  return randomPhrase;
};

// Dynamic executive summary generator
export const generateExecutiveSummary = (name, score, maxScore, percentage, grade, rating, strengths, weaknesses, categoryCount, assessmentType = 'general') => {
  const descriptor = assessmentDescriptors[assessmentType] || assessmentDescriptors.general;
  
  const introPhrases = [
    `${name} completed the ${descriptor.name} with a total score of ${score}/${maxScore} (${percentage}%), achieving a grade of ${grade}.`,
    `In the ${descriptor.name}, ${name} scored ${score}/${maxScore} (${percentage}%), earning a grade of ${grade}.`,
    `${name} demonstrated ${percentage}% proficiency (${grade}) on the ${descriptor.name}, scoring ${score}/${maxScore}.`
  ];
  
  const strengthPhrases = [
    `They demonstrated particular strength in ${strengths[0]?.area || strengths[0] || descriptor.strengths[0]}`,
    `Their performance was notably strong in ${strengths[0]?.area || strengths[0] || descriptor.strengths[0]}`,
    `Exceptional performance was observed in ${strengths[0]?.area || strengths[0] || descriptor.strengths[0]}`
  ];
  
  const weaknessPhrases = [
    `Key development opportunities include ${weaknesses[0]?.area || weaknesses[0] || descriptor.weaknesses[0]}`,
    `Areas requiring attention are ${weaknesses[0]?.area || weaknesses[0] || descriptor.weaknesses[0]}`,
    `Growth is needed in ${weaknesses[0]?.area || weaknesses[0] || descriptor.weaknesses[0]}`
  ];
  
  let summary = introPhrases[Math.floor(Math.random() * introPhrases.length)] + ' ';
  
  if (strengths.length > 0) {
    summary += strengthPhrases[Math.floor(Math.random() * strengthPhrases.length)];
    if (strengths.length > 1) {
      summary += ` and ${strengths.length - 1} other ${strengths.length > 2 ? 'areas' : 'area'}`;
    }
    summary += '. ';
  }
  
  if (weaknesses.length > 0) {
    summary += weaknessPhrases[Math.floor(Math.random() * weaknessPhrases.length)];
    if (weaknesses.length > 1) {
      summary += ` and ${weaknesses.length - 1} other ${weaknesses.length > 2 ? 'areas' : 'area'}`;
    }
    summary += '. ';
  }
  
  summary += rating.message;
  
  return summary;
};

// Generate personalized recommendations based on weaknesses
export const generateRecommendations = (weaknesses, assessmentType = 'general') => {
  const recommendations = [];
  
  const trainingPhrases = [
    (area) => `Complete targeted training in ${area}`,
    (area) => `Participate in a workshop focused on ${area}`,
    (area) => `Enroll in a certification program for ${area}`,
    (area) => `Take an online course covering ${area} fundamentals`
  ];
  
  const practicePhrases = [
    (area) => `Apply ${area} concepts in real projects`,
    (area) => `Practice ${area} skills through simulations`,
    (area) => `Seek opportunities to use ${area} in daily work`,
    (area) => `Work on ${area} exercises with a mentor`
  ];
  
  const feedbackPhrases = [
    (area) => `Request regular feedback on ${area} progress`,
    (area) => `Schedule monthly check-ins to discuss ${area} development`,
    (area) => `Find a mentor who excels in ${area}`,
    (area) => `Join a peer learning group focused on ${area}`
  ];
  
  weaknesses.forEach((weakness, index) => {
    const area = weakness.area || weakness;
    
    if (index === 0) {
      recommendations.push(`🔴 Priority: ${trainingPhrases[index % trainingPhrases.length](area)}.`);
    } else if (index === 1) {
      recommendations.push(`📌 ${practicePhrases[index % practicePhrases.length](area)}.`);
    } else {
      recommendations.push(`📋 ${feedbackPhrases[index % feedbackPhrases.length](area)}.`);
    }
    
    // Add a second recommendation for top weaknesses
    if (index < 2) {
      recommendations.push(`   • Follow up with ${practicePhrases[(index + 1) % practicePhrases.length](area).toLowerCase()}`);
    }
  });
  
  return recommendations;
};

// Generate development plan based on weaknesses and strengths
export const generateDevelopmentPlan = (weaknesses, strengths, assessmentType = 'general') => {
  const plan = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };
  
  // Immediate actions (0-30 days) - focus on top 3 weaknesses
  weaknesses.slice(0, 3).forEach((w, index) => {
    const area = w.area || w;
    plan.immediate.push({
      area,
      action: `Begin focused development in ${area}`,
      recommendation: index === 0 
        ? `Complete foundational training and assessment in ${area}`
        : `Work with mentor to identify specific ${area} improvement areas`,
      priority: index === 0 ? 'High' : 'Medium'
    });
  });
  
  // Short-term goals (30-60 days) - practice and application
  weaknesses.slice(0, 2).forEach((w) => {
    const area = w.area || w;
    plan.shortTerm.push({
      area,
      action: `Apply learning in practical scenarios`,
      recommendation: `Practice ${area} skills through real projects with supervision`
    });
  });
  
  // Long-term development (60-90+ days) - leverage strengths
  strengths.slice(0, 2).forEach((s) => {
    const area = s.area || s;
    plan.longTerm.push({
      area,
      action: `Leverage strength in ${area}`,
      recommendation: `Mentor others and take on challenging projects involving ${area}`
    });
  });
  
  return plan;
};

// ========== MAIN EXPORT FUNCTION ==========
// This is the function that your API route is trying to import
export const generatePersonalizedReport = (userId, assessmentType, responses, candidateName) => {
  console.log(`📊 Generating personalized report for ${candidateName} (${userId}) on ${assessmentType} assessment`);
  
  // Create a simple report structure
  // In a real implementation, you would process the responses and generate meaningful insights
  
  // Calculate category scores from responses
  const categoryScores = {};
  const strengths = [];
  const weaknesses = [];
  let totalScore = 0;
  
  responses.forEach(response => {
    const section = response.unique_questions?.section || 'General';
    const score = response.unique_answers?.score || 0;
    totalScore += score;
    
    if (!categoryScores[section]) {
      categoryScores[section] = {
        total: 0,
        count: 0,
        maxPossible: 0,
        percentage: 0
      };
    }
    
    categoryScores[section].total += score;
    categoryScores[section].count += 1;
    categoryScores[section].maxPossible += 5;
  });
  
  // Calculate percentages
  Object.keys(categoryScores).forEach(section => {
    const data = categoryScores[section];
    data.percentage = Math.round((data.total / data.maxPossible) * 100);
    
    if (data.percentage >= 70) {
      strengths.push({
        area: section,
        percentage: data.percentage,
        score: data.total,
        maxPossible: data.maxPossible
      });
    } else if (data.percentage <= 40) {
      weaknesses.push({
        area: section,
        percentage: data.percentage,
        score: data.total,
        maxPossible: data.maxPossible
      });
    }
  });
  
  const maxScore = responses.length * 5;
  const percentageScore = Math.round((totalScore / maxScore) * 100);
  const grade = getGradeInfo(percentageScore);
  const rating = getOverallRating(percentageScore, strengths, weaknesses, assessmentType);
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    candidateName,
    totalScore,
    maxScore,
    percentageScore,
    grade.grade,
    rating,
    strengths,
    weaknesses,
    Object.keys(categoryScores).length,
    assessmentType
  );
  
  // Generate recommendations
  const recommendationsList = generateRecommendations(weaknesses, assessmentType);
  
  // Generate development plan
  const developmentPlan = generateDevelopmentPlan(weaknesses, strengths, assessmentType);
  
  // Return the complete report
  return {
    userId,
    assessmentType,
    candidateName,
    totalScore,
    maxScore,
    percentageScore,
    grade: grade.grade,
    gradeInfo: grade,
    rating,
    categoryScores,
    strengths,
    weaknesses,
    executiveSummary,
    recommendations: recommendationsList,
    developmentPlan,
    overallProfile: rating.message,
    overallTraits: [grade.description, rating.title],
    interpretations: {
      classification: grade.description,
      summary: executiveSummary,
      overallProfile: rating.message
    }
  };
};
