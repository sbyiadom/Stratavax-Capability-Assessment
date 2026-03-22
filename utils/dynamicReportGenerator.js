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
  // UPDATED: Personality assessment with 6 new traits
  'personality': {
    name: 'Personality Assessment',
    strengths: ['Ownership', 'Collaboration', 'Action', 'Analysis', 'Risk Tolerance', 'Structure'],
    weaknesses: ['behavioral patterns', 'stress management', 'interpersonal dynamics'],
    icon: '🌟',
    traitDescriptions: {
      'Ownership': 'Takes responsibility, drives outcomes, owns mistakes, and follows through on commitments.',
      'Collaboration': 'Works well in teams, builds consensus, supports others, and values collective success.',
      'Action': 'Makes quick decisions, takes initiative, moves fast, and acts with urgency.',
      'Analysis': 'Seeks data, plans carefully, thinks before acting, and values thoroughness.',
      'Risk Tolerance': 'Comfortable with uncertainty, experiments, pushes boundaries, and embraces innovation.',
      'Structure': 'Follows process, respects hierarchy, values stability, and seeks consistency.'
    }
  },
  // NEW: Strategic Leadership Assessment
  'strategic_leadership': {
    name: 'Strategic Leadership Assessment',
    strengths: ['Vision / Strategy', 'People Leadership', 'Decision Making', 'Accountability', 'Emotional Intelligence', 'Execution Drive', 'Ethics'],
    weaknesses: ['strategic gaps', 'people development', 'decisiveness', 'accountability gaps', 'emotional awareness', 'execution consistency', 'ethical judgment'],
    icon: '👑',
    dimensionDescriptions: {
      'Vision / Strategy': 'Strategic thinking, long-term planning, and ability to set direction',
      'People Leadership': 'Team development, coaching, engagement, and motivation',
      'Decision Making': 'Decisiveness, judgment, and problem-solving under uncertainty',
      'Accountability': 'Ownership, responsibility, and follow-through',
      'Emotional Intelligence': 'Self-awareness, empathy, and conflict management',
      'Execution Drive': 'Results orientation, urgency, and delivery focus',
      'Ethics': 'Integrity, ethical judgment, and principled behavior'
    }
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
      message: `Demonstrates strong capabilities. Ready for increased responsibility.`
    };
  } else if (percentage >= 70) {
    return {
      title: 'Competent Performer',
      icon: '📈',
      message: `Shows solid performance with ${strengthCount} key ${strengthCount === 1 ? 'strength' : 'strengths'}.`
    };
  } else if (percentage >= 60) {
    return {
      title: 'Developing Performer',
      icon: '🌱',
      message: `Has foundational skills with ${weaknessCount} ${weaknessCount === 1 ? 'area' : 'areas'} needing attention.`
    };
  } else if (percentage >= 50) {
    return {
      title: 'Emerging Talent',
      icon: '🌿',
      message: `Building core competencies. Requires guidance in key areas.`
    };
  } else if (percentage >= 40) {
    return {
      title: 'Needs Development',
      icon: '🎯',
      message: `Significant opportunities for growth identified.`
    };
  } else {
    return {
      title: 'Intensive Support Needed',
      icon: '⚠️',
      message: `Requires structured intervention to build foundational capabilities.`
    };
  }
};

// Dynamic strength comment generator
export const getStrengthComment = (area, percentage, allStrengths, assessmentType = 'general') => {
  const rank = allStrengths.findIndex(s => (s.area || s) === area) + 1;
  const isTopStrength = rank === 1;
  
  // Personality trait specific strength phrases
  const traitSpecificPhrases = {
    // Personality traits
    'Ownership': [
      `Demonstrates exceptional accountability and follow-through in ${area}`,
      `Shows natural ownership and initiative in ${area}`,
      `Exhibits strong responsibility and drive in ${area}`,
      `Consistently takes charge and owns outcomes in ${area}`,
      `Has developed robust accountability skills in ${area}`
    ],
    'Collaboration': [
      `Demonstrates exceptional teamwork and consensus-building in ${area}`,
      `Shows natural ability to work with others in ${area}`,
      `Exhibits strong collaborative instincts in ${area}`,
      `Consistently builds strong team relationships in ${area}`,
      `Has developed robust partnership skills in ${area}`
    ],
    'Action': [
      `Demonstrates exceptional decisiveness and initiative in ${area}`,
      `Shows natural ability to act quickly in ${area}`,
      `Exhibits strong execution focus in ${area}`,
      `Consistently moves priorities forward in ${area}`,
      `Has developed robust action-orientation in ${area}`
    ],
    'Analysis': [
      `Demonstrates exceptional analytical thinking in ${area}`,
      `Shows natural ability to process complex information in ${area}`,
      `Exhibits strong systematic approach in ${area}`,
      `Consistently seeks data before acting in ${area}`,
      `Has developed robust analytical skills in ${area}`
    ],
    'Risk Tolerance': [
      `Demonstrates exceptional comfort with uncertainty in ${area}`,
      `Shows natural ability to experiment and innovate in ${area}`,
      `Exhibits strong calculated risk-taking in ${area}`,
      `Consistently pushes boundaries appropriately in ${area}`,
      `Has developed robust innovation skills in ${area}`
    ],
    'Structure': [
      `Demonstrates exceptional process discipline in ${area}`,
      `Shows natural ability to follow procedures in ${area}`,
      `Exhibits strong organizational skills in ${area}`,
      `Consistently maintains quality standards in ${area}`,
      `Has developed robust systematic approach in ${area}`
    ],
    // Strategic Leadership dimensions
    'Vision / Strategy': [
      `Demonstrates exceptional strategic thinking and long-term vision in ${area}`,
      `Shows natural ability to see the big picture and set direction in ${area}`,
      `Exhibits strong foresight and planning capabilities in ${area}`,
      `Consistently anticipates future trends and opportunities in ${area}`,
      `Has developed robust strategic planning skills in ${area}`
    ],
    'People Leadership': [
      `Demonstrates exceptional ability to develop and coach teams in ${area}`,
      `Shows natural talent for engaging and motivating others in ${area}`,
      `Exhibits strong mentorship and development skills in ${area}`,
      `Consistently builds high-performing teams in ${area}`,
      `Has developed robust people management capabilities in ${area}`
    ],
    'Decision Making': [
      `Demonstrates exceptional decisiveness and judgment in ${area}`,
      `Shows natural ability to make sound decisions under pressure in ${area}`,
      `Exhibits strong analytical problem-solving in ${area}`,
      `Consistently makes timely, well-reasoned choices in ${area}`,
      `Has developed robust decision-making frameworks in ${area}`
    ],
    'Accountability': [
      `Demonstrates exceptional ownership and responsibility in ${area}`,
      `Shows natural drive to take charge and follow through in ${area}`,
      `Exhibits strong commitment to outcomes in ${area}`,
      `Consistently owns results, both successes and failures in ${area}`,
      `Has developed robust accountability practices in ${area}`
    ],
    'Emotional Intelligence': [
      `Demonstrates exceptional self-awareness and empathy in ${area}`,
      `Shows natural ability to understand and manage emotions in ${area}`,
      `Exhibits strong interpersonal awareness in ${area}`,
      `Consistently navigates complex social situations effectively in ${area}`,
      `Has developed robust emotional intelligence in ${area}`
    ],
    'Execution Drive': [
      `Demonstrates exceptional focus on results and delivery in ${area}`,
      `Shows natural urgency and drive to achieve in ${area}`,
      `Exhibits strong follow-through and persistence in ${area}`,
      `Consistently meets or exceeds performance targets in ${area}`,
      `Has developed robust execution capabilities in ${area}`
    ],
    'Ethics': [
      `Demonstrates exceptional integrity and moral judgment in ${area}`,
      `Shows natural commitment to ethical principles in ${area}`,
      `Exhibits strong values-aligned behavior in ${area}`,
      `Consistently makes principled decisions in ${area}`,
      `Has developed robust ethical reasoning skills in ${area}`
    ]
  };
  
  const strengthPhrases = traitSpecificPhrases[area] || [
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
  
  // Personality trait specific weakness phrases
  const traitSpecificPhrases = {
    // Personality traits
    'Ownership': [
      `Would benefit significantly from developing stronger accountability in ${area}.`,
      `${area} presents the greatest opportunity for taking more initiative.`,
      `Developing stronger ownership skills should be a priority.`,
      `Additional support in taking responsibility will unlock greater potential.`,
      `Building accountability in ${area} will enhance overall effectiveness.`
    ],
    'Collaboration': [
      `Would benefit significantly from developing stronger teamwork skills in ${area}.`,
      `${area} presents the greatest opportunity for building better relationships.`,
      `Developing stronger collaboration skills should be a priority.`,
      `Additional support in working with others will unlock greater potential.`,
      `Building team skills in ${area} will enhance overall effectiveness.`
    ],
    'Action': [
      `Would benefit significantly from developing greater decisiveness in ${area}.`,
      `${area} presents the greatest opportunity for faster execution.`,
      `Developing stronger action orientation should be a priority.`,
      `Additional support in making timely decisions will unlock greater potential.`,
      `Building initiative in ${area} will enhance overall effectiveness.`
    ],
    'Analysis': [
      `Would benefit significantly from developing stronger analytical skills in ${area}.`,
      `${area} presents the greatest opportunity for better planning.`,
      `Developing more systematic thinking should be a priority.`,
      `Additional support in data-driven decisions will unlock greater potential.`,
      `Building analytical capability in ${area} will enhance overall effectiveness.`
    ],
    'Risk Tolerance': [
      `Would benefit significantly from developing greater comfort with uncertainty in ${area}.`,
      `${area} presents the greatest opportunity for more innovation.`,
      `Developing calculated risk-taking skills should be a priority.`,
      `Additional support in experimenting will unlock greater potential.`,
      `Building innovation skills in ${area} will enhance overall effectiveness.`
    ],
    'Structure': [
      `Would benefit significantly from developing stronger process discipline in ${area}.`,
      `${area} presents the greatest opportunity for better organization.`,
      `Developing more systematic approaches should be a priority.`,
      `Additional support in following procedures will unlock greater potential.`,
      `Building consistency in ${area} will enhance overall effectiveness.`
    ],
    // Strategic Leadership dimensions
    'Vision / Strategy': [
      `Would benefit significantly from developing stronger strategic thinking in ${area}.`,
      `${area} presents the greatest opportunity for long-term planning.`,
      `Developing better foresight and direction-setting should be a priority.`,
      `Additional support in strategic analysis will unlock greater potential.`,
      `Building strategic capabilities in ${area} will enhance overall effectiveness.`
    ],
    'People Leadership': [
      `Would benefit significantly from developing stronger team development skills in ${area}.`,
      `${area} presents the greatest opportunity for coaching and mentoring.`,
      `Developing better engagement and motivation strategies should be a priority.`,
      `Additional support in people management will unlock greater potential.`,
      `Building leadership capabilities in ${area} will enhance overall effectiveness.`
    ],
    'Decision Making': [
      `Would benefit significantly from developing greater decisiveness in ${area}.`,
      `${area} presents the greatest opportunity for improving judgment.`,
      `Developing better problem-solving frameworks should be a priority.`,
      `Additional support in decision-making processes will unlock greater potential.`,
      `Building analytical capabilities in ${area} will enhance overall effectiveness.`
    ],
    'Accountability': [
      `Would benefit significantly from developing stronger ownership in ${area}.`,
      `${area} presents the greatest opportunity for taking responsibility.`,
      `Developing better follow-through should be a priority.`,
      `Additional support in accountability practices will unlock greater potential.`,
      `Building ownership skills in ${area} will enhance overall effectiveness.`
    ],
    'Emotional Intelligence': [
      `Would benefit significantly from developing greater self-awareness in ${area}.`,
      `${area} presents the greatest opportunity for empathy development.`,
      `Developing better emotional regulation should be a priority.`,
      `Additional support in interpersonal awareness will unlock greater potential.`,
      `Building emotional intelligence in ${area} will enhance overall effectiveness.`
    ],
    'Execution Drive': [
      `Would benefit significantly from developing stronger results focus in ${area}.`,
      `${area} presents the greatest opportunity for improving delivery speed.`,
      `Developing better execution discipline should be a priority.`,
      `Additional support in performance management will unlock greater potential.`,
      `Building execution capabilities in ${area} will enhance overall effectiveness.`
    ],
    'Ethics': [
      `Would benefit significantly from developing stronger ethical awareness in ${area}.`,
      `${area} presents the greatest opportunity for moral reasoning.`,
      `Developing better ethical decision-making should be a priority.`,
      `Additional support in integrity practices will unlock greater potential.`,
      `Building ethical judgment in ${area} will enhance overall effectiveness.`
    ]
  };
  
  const weaknessPhrases = traitSpecificPhrases[area] || [
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
    const gap = w.maxPossible ? Math.round((w.maxPossible * 0.8) - w.score) : null;
    plan.immediate.push({
      area,
      action: `Begin focused development in ${area}`,
      recommendation: index === 0 
        ? `Complete foundational training in ${area} (currently ${w.score}/${w.maxPossible}, need ${gap} points to reach 80%)`
        : `Work with mentor to identify specific ${area} improvement areas (target: 80%)`,
      priority: index === 0 ? 'High' : 'Medium'
    });
  });
  
  // Short-term goals (30-60 days) - practice and application
  weaknesses.slice(3, 5).forEach((w) => {
    const area = w.area || w;
    const gap = w.maxPossible ? Math.round((w.maxPossible * 0.8) - w.score) : null;
    plan.shortTerm.push({
      area,
      action: `Apply learning in practical scenarios`,
      recommendation: `Practice ${area} skills through real projects (need ${gap} more points to reach 80%)`
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
export const generatePersonalizedReport = (userId, assessmentType, responses, candidateName) => {
  console.log(`📊 Generating personalized report for ${candidateName} (${userId}) on ${assessmentType} assessment`);
  console.log(`📝 Processing ${responses.length} responses`);
  
  // Calculate category scores from responses
  const categoryScores = {};
  const strengthsList = [];
  const weaknessesList = [];
  let totalScore = 0;
  
  responses.forEach(response => {
    const question = response.unique_questions;
    const answer = response.unique_answers;
    const section = question?.section || 'General';
    const score = answer?.score || 0;
    totalScore += score;
    
    if (!categoryScores[section]) {
      categoryScores[section] = {
        total: 0,
        count: 0,
        maxPossible: 0,
        average: 0,
        percentage: 0,
        score: 0
      };
    }
    
    categoryScores[section].total += score;
    categoryScores[section].count += 1;
    categoryScores[section].maxPossible += 5;
  });
  
  // Calculate percentages and identify strengths/weaknesses based on 80% threshold
  Object.keys(categoryScores).forEach(section => {
    const data = categoryScores[section];
    data.percentage = Math.round((data.total / data.maxPossible) * 100);
    data.average = Number((data.total / data.count).toFixed(2));
    data.score = data.total;
    
    // 80% threshold for strength - anything below needs improvement
    if (data.percentage >= 80) {
      strengthsList.push({
        area: section,
        percentage: data.percentage,
        score: data.total,
        maxPossible: data.maxPossible,
        analysis: `Strong performance in ${section} (${data.percentage}%). This exceeds the 80% target with ${data.score}/${data.maxPossible} points.`
      });
    } else {
      const gap = Math.round((data.maxPossible * 0.8) - data.total);
      weaknessesList.push({
        area: section,
        percentage: data.percentage,
        score: data.total,
        maxPossible: data.maxPossible,
        gap: gap > 0 ? gap : 0,
        analysis: `Needs improvement in ${section} (${data.percentage}%). Current score ${data.score}/${data.maxPossible} is below the 80% target. Need ${gap} more points to reach target.`
      });
    }
  });
  
  const maxScore = responses.length * 5;
  const percentageScore = Math.round((totalScore / maxScore) * 100);
  const grade = getGradeInfo(percentageScore);
  const rating = getOverallRating(percentageScore, strengthsList, weaknessesList, assessmentType);
  
  // Generate executive summary with actual data
  const executiveSummary = `${candidateName} completed the ${assessmentDescriptors[assessmentType]?.name || 'Assessment'} with a total score of ${totalScore}/${maxScore} (${percentageScore}%). ` + 
    (strengthsList.length > 0 ? `Strengths (above 80%): ${strengthsList.map(s => `${s.area} (${s.percentage}%)`).join(', ')}. ` : 'No strengths above 80% identified. ') +
    (weaknessesList.length > 0 ? `Development needed (below 80%): ${weaknessesList.map(w => `${w.area} (${w.percentage}%)`).join(', ')}. ` : '') +
    rating.message;
  
  // Generate recommendations based on weaknesses
  const recommendationsList = [
    ...weaknessesList.map(w => `Focus on improving ${w.area} from ${w.percentage}% to 80% target. Need ${w.gap} more point${w.gap !== 1 ? 's' : ''} to reach ${Math.round(w.maxPossible * 0.8)}/${w.maxPossible}. Recommended: targeted training and practice.`),
    ...(strengthsList.length > 0 ? [`Leverage strengths in ${strengthsList.map(s => s.area).join(', ')} for greater impact.`] : [])
  ];
  
  // Format strengths and weaknesses as strings for database
  const strengthsForDb = strengthsList.map(s => `${s.area} (${s.percentage}%)`);
  const weaknessesForDb = weaknessesList.map(w => `${w.area} (${w.percentage}%)`);
  
  // Generate development plan
  const developmentPlan = generateDevelopmentPlan(weaknessesList, strengthsList, assessmentType);
  
  console.log("Strengths identified:", strengthsForDb);
  console.log("Weaknesses identified:", weaknessesForDb);
  
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
    strengths: strengthsList, // Object array with details
    weaknesses: weaknessesList, // Object array with details
    strengthsForDb, // String array for database
    weaknessesForDb, // String array for database
    executiveSummary,
    recommendations: recommendationsList,
    developmentPlan,
    overallProfile: rating.message,
    overallTraits: [grade.description, rating.title],
    interpretations: {
      classification: grade.description,
      summary: executiveSummary,
      overallProfile: rating.message,
      strengths: strengthsForDb,
      weaknesses: weaknessesForDb
    }
  };
};
