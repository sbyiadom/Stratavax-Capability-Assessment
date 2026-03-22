// Score thresholds
const THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 70,
  AVERAGE: 60,
  BELOW_AVERAGE: 50
};

// Get level based on score
export const getLevel = (score) => {
  if (score >= THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= THRESHOLDS.GOOD) return 'good';
  if (score >= THRESHOLDS.AVERAGE) return 'average';
  if (score >= THRESHOLDS.BELOW_AVERAGE) return 'below_average';
  return 'poor';
};

// Assessment type configurations
export const assessmentConfigs = {
  'general': {
    name: 'General Assessment',
    categories: [
      'Cognitive Ability',
      'Communication',
      'Cultural & Attitudinal Fit',
      'Emotional Intelligence',
      'Ethics & Integrity',
      'Leadership & Management',
      'Performance Metrics',
      'Personality & Behavioral',
      'Problem-Solving',
      'Technical & Manufacturing'
    ],
    maxScores: {
      'Cognitive Ability': 50,
      'Communication': 50,
      'Cultural & Attitudinal Fit': 50,
      'Emotional Intelligence': 50,
      'Ethics & Integrity': 25,
      'Leadership & Management': 75,
      'Performance Metrics': 50,
      'Personality & Behavioral': 50,
      'Problem-Solving': 50,
      'Technical & Manufacturing': 50
    },
    description: 'Comprehensive assessment covering all capability areas',
    icon: '📊'
  },
  'leadership': {
    name: 'Leadership Assessment',
    categories: [
      'Vision & Strategic Thinking',
      'Decision-Making & Problem-Solving',
      'Communication & Influence',
      'People Management & Coaching',
      'Change Leadership & Agility',
      'Emotional Intelligence',
      'Cultural Competence & Inclusivity',
      'Execution & Results Orientation',
      'Resilience & Stress Management',
      'Self-Awareness & Self-Regulation'
    ],
    maxScores: {
      'Vision & Strategic Thinking': 50,
      'Decision-Making & Problem-Solving': 50,
      'Communication & Influence': 50,
      'People Management & Coaching': 50,
      'Change Leadership & Agility': 50,
      'Emotional Intelligence': 50,
      'Cultural Competence & Inclusivity': 50,
      'Execution & Results Orientation': 50,
      'Resilience & Stress Management': 50,
      'Self-Awareness & Self-Regulation': 50
    },
    description: 'Evaluate leadership potential and capabilities',
    icon: '👑'
  },
  'cognitive': {
    name: 'Cognitive Ability Assessment',
    categories: [
      'Logical / Abstract Reasoning',
      'Numerical Reasoning',
      'Verbal Reasoning',
      'Spatial Reasoning',
      'Memory & Attention',
      'Perceptual Speed & Accuracy',
      'Problem-Solving',
      'Critical Thinking',
      'Learning Agility',
      'Mental Flexibility'
    ],
    maxScores: {
      'Logical / Abstract Reasoning': 50,
      'Numerical Reasoning': 50,
      'Verbal Reasoning': 50,
      'Spatial Reasoning': 50,
      'Memory & Attention': 50,
      'Perceptual Speed & Accuracy': 50,
      'Problem-Solving': 50,
      'Critical Thinking': 50,
      'Learning Agility': 50,
      'Mental Flexibility': 50
    },
    description: 'Measure analytical thinking and problem-solving',
    icon: '🧠'
  },
  'technical': {
    name: 'Technical Competence Assessment',
    categories: [
      'Technical Knowledge',
      'System Understanding',
      'Troubleshooting',
      'Practical Application',
      'Safety & Compliance',
      'Quality Control',
      'Process Optimization',
      'Equipment Operation',
      'Maintenance Procedures',
      'Technical Documentation'
    ],
    maxScores: {
      'Technical Knowledge': 50,
      'System Understanding': 50,
      'Troubleshooting': 50,
      'Practical Application': 50,
      'Safety & Compliance': 50,
      'Quality Control': 50,
      'Process Optimization': 50,
      'Equipment Operation': 50,
      'Maintenance Procedures': 50,
      'Technical Documentation': 50
    },
    description: 'Assess technical knowledge and skills',
    icon: '⚙️'
  },
  // UPDATED: Personality assessment with 6 new traits
  'personality': {
    name: 'Personality Assessment',
    categories: [
      'Ownership',
      'Collaboration',
      'Action',
      'Analysis',
      'Risk Tolerance',
      'Structure'
    ],
    maxScores: {
      'Ownership': 50,
      'Collaboration': 50,
      'Action': 50,
      'Analysis': 50,
      'Risk Tolerance': 50,
      'Structure': 50
    },
    description: 'Evaluate work style, decision-making, and interpersonal approach based on 6 key traits',
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
  'performance': {
    name: 'Performance Assessment',
    categories: [
      'Productivity & Efficiency',
      'Work Quality & Effectiveness',
      'Goal Achievement',
      'Accountability',
      'Initiative',
      'Problem-Solving',
      'Collaboration',
      'Adaptability',
      'Time Management',
      'Results Orientation'
    ],
    maxScores: {
      'Productivity & Efficiency': 50,
      'Work Quality & Effectiveness': 50,
      'Goal Achievement': 50,
      'Accountability': 50,
      'Initiative': 50,
      'Problem-Solving': 50,
      'Collaboration': 50,
      'Adaptability': 50,
      'Time Management': 50,
      'Results Orientation': 50
    },
    description: 'Measure performance metrics and work habits',
    icon: '📈'
  },
  'behavioral': {
    name: 'Behavioral & Soft Skills',
    categories: [
      'Communication',
      'Teamwork',
      'Emotional Intelligence',
      'Conflict Resolution',
      'Adaptability',
      'Empathy',
      'Active Listening',
      'Feedback Reception',
      'Interpersonal Skills',
      'Professionalism'
    ],
    maxScores: {
      'Communication': 50,
      'Teamwork': 50,
      'Emotional Intelligence': 50,
      'Conflict Resolution': 50,
      'Adaptability': 50,
      'Empathy': 50,
      'Active Listening': 50,
      'Feedback Reception': 50,
      'Interpersonal Skills': 50,
      'Professionalism': 50
    },
    description: 'Assess communication, teamwork, and emotional intelligence',
    icon: '🗣️'
  },
  'manufacturing': {
    name: 'Manufacturing Technical Skills',
    categories: [
      'Equipment Operation',
      'Safety Procedures',
      'Quality Control',
      'Process Optimization',
      'Maintenance',
      'Troubleshooting',
      'Blueprint Reading',
      'Measurement Tools',
      'Production Planning',
      'Lean Manufacturing'
    ],
    maxScores: {
      'Equipment Operation': 50,
      'Safety Procedures': 50,
      'Quality Control': 50,
      'Process Optimization': 50,
      'Maintenance': 50,
      'Troubleshooting': 50,
      'Blueprint Reading': 50,
      'Measurement Tools': 50,
      'Production Planning': 50,
      'Lean Manufacturing': 50
    },
    description: 'Evaluate manufacturing and production skills',
    icon: '🏭'
  },
  'cultural': {
    name: 'Cultural & Attitudinal Fit',
    categories: [
      'Values Alignment',
      'Work Ethic',
      'Adaptability',
      'Team Collaboration',
      'Company Culture Fit',
      'Diversity Awareness',
      'Inclusivity',
      'Respect',
      'Integrity',
      'Professional Conduct'
    ],
    maxScores: {
      'Values Alignment': 50,
      'Work Ethic': 50,
      'Adaptability': 50,
      'Team Collaboration': 50,
      'Company Culture Fit': 50,
      'Diversity Awareness': 50,
      'Inclusivity': 50,
      'Respect': 50,
      'Integrity': 50,
      'Professional Conduct': 50
    },
    description: 'Assess values alignment and work ethic',
    icon: '🤝'
  }
};

// Get grade based on percentage
export const getGradeFromPercentage = (percentage) => {
  if (percentage >= 95) return { grade: 'A+', color: '#0A5C2E', bg: '#E6F7E6', description: 'Exceptional' };
  if (percentage >= 90) return { grade: 'A', color: '#1E7A44', bg: '#E6F7E6', description: 'Excellent' };
  if (percentage >= 85) return { grade: 'A-', color: '#2E7D32', bg: '#E8F5E9', description: 'Very Good' };
  if (percentage >= 80) return { grade: 'B+', color: '#2E7D32', bg: '#E8F5E9', description: 'Good' };
  if (percentage >= 75) return { grade: 'B', color: '#1565C0', bg: '#E3F2FD', description: 'Satisfactory' };
  if (percentage >= 70) return { grade: 'B-', color: '#1565C0', bg: '#E3F2FD', description: 'Adequate' };
  if (percentage >= 65) return { grade: 'C+', color: '#E65100', bg: '#FFF3E0', description: 'Developing' };
  if (percentage >= 60) return { grade: 'C', color: '#E65100', bg: '#FFF3E0', description: 'Basic Competency' };
  if (percentage >= 55) return { grade: 'C-', color: '#E65100', bg: '#FFF3E0', description: 'Minimum Competency' };
  if (percentage >= 50) return { grade: 'D+', color: '#B71C1C', bg: '#FFEBEE', description: 'Below Expectations' };
  if (percentage >= 40) return { grade: 'D', color: '#B71C1C', bg: '#FFEBEE', description: 'Significant Gaps' };
  return { grade: 'F', color: '#8B0000', bg: '#FFEBEE', description: 'Unsatisfactory' };
};

// Get classification based on score and assessment type
export const getClassification = (score, maxScore, assessmentType = 'general') => {
  const percentage = Math.round((score / maxScore) * 100);
  
  if (assessmentType === 'general') {
    if (percentage >= 90) return { label: "Elite Talent", color: "#2E7D32" };
    if (percentage >= 80) return { label: "Top Talent", color: "#4CAF50" };
    if (percentage >= 70) return { label: "High Potential", color: "#2196F3" };
    if (percentage >= 60) return { label: "Solid Performer", color: "#FF9800" };
    if (percentage >= 50) return { label: "Developing Talent", color: "#9C27B0" };
    if (percentage >= 40) return { label: "Emerging Talent", color: "#795548" };
    return { label: "Needs Improvement", color: "#F44336" };
  } else {
    if (percentage >= 90) return { label: "Exceptional", color: "#2E7D32" };
    if (percentage >= 80) return { label: "Advanced", color: "#4CAF50" };
    if (percentage >= 70) return { label: "Proficient", color: "#2196F3" };
    if (percentage >= 60) return { label: "Developing", color: "#FF9800" };
    if (percentage >= 50) return { label: "Basic", color: "#9C27B0" };
    return { label: "Needs Improvement", color: "#F44336" };
  }
};

// Helper to get personality trait descriptions
export const getPersonalityTraitDescription = (trait) => {
  const descriptions = {
    'Ownership': 'Takes responsibility, drives outcomes, owns mistakes, and follows through on commitments.',
    'Collaboration': 'Works well in teams, builds consensus, supports others, and values collective success.',
    'Action': 'Makes quick decisions, takes initiative, moves fast, and acts with urgency.',
    'Analysis': 'Seeks data, plans carefully, thinks before acting, and values thoroughness.',
    'Risk Tolerance': 'Comfortable with uncertainty, experiments, pushes boundaries, and embraces innovation.',
    'Structure': 'Follows process, respects hierarchy, values stability, and seeks consistency.'
  };
  return descriptions[trait] || '';
};

// Keep only essential functions that are actually used
export const getPersonalizedStrengthDescription = (category, score, maxPossible) => {
  const percentage = Math.round((score / maxPossible) * 100);
  const level = getLevel(percentage);
  
  return `Performance in ${category}: ${percentage}% - ${level.replace('_', ' ')}.`;
};

export const getPersonalizedRecommendations = (category, score, maxPossible) => {
  const percentage = Math.round((score / maxPossible) * 100);
  const gapToTarget = Math.round((maxPossible * 0.8) - score);
  
  return [
    `Current score: ${score}/${maxPossible} (${percentage}%). Target: 80% (need ${gapToTarget > 0 ? gapToTarget : 0} more points).`,
    'Complete targeted training in this area',
    'Work with a mentor for guided development',
    'Practice skills through practical applications'
  ];
};

export const generatePersonalizedProfileSummary = (candidateName, assessmentType, totalScore, maxScore, categoryScores) => {
  const percentage = Math.round((totalScore / maxScore) * 100);
  return `${candidateName} completed the ${assessmentConfigs[assessmentType]?.name || 'Assessment'} with a total score of ${totalScore}/${maxScore} (${percentage}%).`;
};

export const getPersonalizedBestFit = (categoryScores) => {
  return {
    fits: ['Standard roles with appropriate support'],
    risks: ['No significant risks identified']
  };
};
