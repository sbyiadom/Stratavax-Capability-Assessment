// Assessment type configurations with specific categories and interpretations

export const assessmentTypes = {
  'general': {
    id: 'general',
    name: 'General Assessment',
    description: 'Comprehensive assessment covering all capability areas',
    icon: '📊',
    categories: [
      { id: 'cognitive', name: 'Cognitive Ability', maxScore: 50 },
      { id: 'communication', name: 'Communication', maxScore: 50 },
      { id: 'cultural', name: 'Cultural & Attitudinal Fit', maxScore: 50 },
      { id: 'emotional', name: 'Emotional Intelligence', maxScore: 50 },
      { id: 'ethics', name: 'Ethics & Integrity', maxScore: 25 },
      { id: 'leadership', name: 'Leadership & Management', maxScore: 75 },
      { id: 'performance', name: 'Performance Metrics', maxScore: 50 },
      { id: 'personality', name: 'Personality & Behavioral', maxScore: 50 },
      { id: 'problemSolving', name: 'Problem-Solving', maxScore: 50 },
      { id: 'technical', name: 'Technical & Manufacturing', maxScore: 50 }
    ],
    weightage: 'Each category contributes equally to total score'
  },
  
  'leadership': {
    id: 'leadership',
    name: 'Leadership Assessment',
    description: 'Evaluate leadership potential and capabilities',
    icon: '👑',
    categories: [
      { id: 'vision', name: 'Vision & Strategic Thinking', maxScore: 50 },
      { id: 'decision', name: 'Decision-Making & Problem-Solving', maxScore: 50 },
      { id: 'influence', name: 'Communication & Influence', maxScore: 50 },
      { id: 'people', name: 'People Management & Coaching', maxScore: 50 },
      { id: 'change', name: 'Change Leadership & Agility', maxScore: 50 },
      { id: 'emotional', name: 'Emotional Intelligence', maxScore: 50 },
      { id: 'cultural', name: 'Cultural Competence & Inclusivity', maxScore: 50 },
      { id: 'execution', name: 'Execution & Results Orientation', maxScore: 50 },
      { id: 'resilience', name: 'Resilience & Stress Management', maxScore: 50 },
      { id: 'self', name: 'Self-Awareness & Self-Regulation', maxScore: 50 }
    ],
    weightage: 'All leadership competencies equally weighted'
  },
  
  'cognitive': {
    id: 'cognitive',
    name: 'Cognitive Ability Assessment',
    description: 'Measure analytical thinking and problem-solving',
    icon: '🧠',
    categories: [
      { id: 'logical', name: 'Logical / Abstract Reasoning', maxScore: 50 },
      { id: 'numerical', name: 'Numerical Reasoning', maxScore: 50 },
      { id: 'verbal', name: 'Verbal Reasoning', maxScore: 50 },
      { id: 'spatial', name: 'Spatial Reasoning', maxScore: 50 },
      { id: 'memory', name: 'Memory & Attention', maxScore: 50 },
      { id: 'perceptual', name: 'Perceptual Speed & Accuracy', maxScore: 50 },
      { id: 'problem', name: 'Problem-Solving', maxScore: 50 },
      { id: 'critical', name: 'Critical Thinking', maxScore: 50 },
      { id: 'learning', name: 'Learning Agility', maxScore: 50 },
      { id: 'mental', name: 'Mental Flexibility', maxScore: 50 }
    ],
    weightage: 'All cognitive abilities equally weighted'
  },
  
  'technical': {
    id: 'technical',
    name: 'Technical Competence Assessment',
    description: 'Assess technical knowledge and skills',
    icon: '⚙️',
    categories: [
      { id: 'knowledge', name: 'Technical Knowledge', maxScore: 50 },
      { id: 'system', name: 'System Understanding', maxScore: 50 },
      { id: 'troubleshooting', name: 'Troubleshooting', maxScore: 50 },
      { id: 'application', name: 'Practical Application', maxScore: 50 },
      { id: 'safety', name: 'Safety & Compliance', maxScore: 50 },
      { id: 'quality', name: 'Quality Control', maxScore: 50 },
      { id: 'optimization', name: 'Process Optimization', maxScore: 50 },
      { id: 'equipment', name: 'Equipment Operation', maxScore: 50 },
      { id: 'maintenance', name: 'Maintenance Procedures', maxScore: 50 },
      { id: 'documentation', name: 'Technical Documentation', maxScore: 50 }
    ],
    weightage: 'All technical competencies equally weighted'
  },
  
  'personality': {
    id: 'personality',
    name: 'Personality Assessment',
    description: 'Evaluate work style, decision-making, and interpersonal approach based on 6 key traits: Ownership, Collaboration, Action, Analysis, Risk Tolerance, and Structure',
    icon: '🌟',
    categories: [
      { 
        id: 'ownership', 
        name: 'Ownership', 
        maxScore: 50, 
        description: 'Takes responsibility, drives outcomes, owns mistakes, and follows through on commitments' 
      },
      { 
        id: 'collaboration', 
        name: 'Collaboration', 
        maxScore: 50, 
        description: 'Works well in teams, builds consensus, supports others, and values collective success' 
      },
      { 
        id: 'action', 
        name: 'Action', 
        maxScore: 50, 
        description: 'Makes quick decisions, takes initiative, moves fast, and acts with urgency' 
      },
      { 
        id: 'analysis', 
        name: 'Analysis', 
        maxScore: 50, 
        description: 'Seeks data, plans carefully, thinks before acting, and values thoroughness' 
      },
      { 
        id: 'risk', 
        name: 'Risk Tolerance', 
        maxScore: 50, 
        description: 'Comfortable with uncertainty, experiments, pushes boundaries, and embraces innovation' 
      },
      { 
        id: 'structure', 
        name: 'Structure', 
        maxScore: 50, 
        description: 'Follows process, respects hierarchy, values stability, and seeks consistency' 
      }
    ],
    weightage: 'All personality dimensions equally weighted',
    traitDescriptions: {
      ownership: 'High Ownership individuals take initiative, own their outcomes, and drive results independently. They are accountable, reliable, and follow through on commitments.',
      collaboration: 'High Collaboration individuals are team-focused, build consensus, and maintain harmony. They excel in group settings and value collective success.',
      action: 'High Action individuals are fast-moving, decisive, and comfortable with uncertainty. They prefer to act quickly and take initiative.',
      analysis: 'High Analysis individuals are data-driven, methodical, and seek clarity before acting. They prefer to plan thoroughly and value accuracy.',
      risk: 'High Risk individuals are comfortable with uncertainty, enjoy experimentation, and push boundaries. They thrive in innovative environments.',
      structure: 'High Structure individuals are process-oriented, follow rules, and value consistency. They prefer clear guidelines and stable environments.'
    },
    profileClassifications: {
      'High Ownership Leader': {
        traits: ['ownership', 'action'],
        description: 'Takes initiative, drives results, and leads with accountability'
      },
      'Collaborative Stabilizer': {
        traits: ['collaboration', 'structure'],
        description: 'Builds consensus, maintains harmony, and follows processes'
      },
      'Risk Driver / Executor': {
        traits: ['action', 'risk'],
        description: 'Moves fast, takes calculated risks, and drives execution'
      },
      'Analytical Thinker': {
        traits: ['analysis', 'structure'],
        description: 'Thinks deeply, plans carefully, and values data-driven decisions'
      },
      'Balanced Professional': {
        traits: [],
        description: 'Adapts approach based on situation with balanced traits'
      }
    }
  },
  
  'performance': {
    id: 'performance',
    name: 'Performance Assessment',
    description: 'Measure performance metrics and work habits',
    icon: '📈',
    categories: [
      { id: 'productivity', name: 'Productivity & Efficiency', maxScore: 50 },
      { id: 'quality', name: 'Work Quality & Effectiveness', maxScore: 50 },
      { id: 'goal', name: 'Goal Achievement', maxScore: 50 },
      { id: 'accountability', name: 'Accountability', maxScore: 50 },
      { id: 'initiative', name: 'Initiative', maxScore: 50 },
      { id: 'problem', name: 'Problem-Solving', maxScore: 50 },
      { id: 'collaboration', name: 'Collaboration', maxScore: 50 },
      { id: 'adaptability', name: 'Adaptability', maxScore: 50 },
      { id: 'time', name: 'Time Management', maxScore: 50 },
      { id: 'results', name: 'Results Orientation', maxScore: 50 }
    ],
    weightage: 'All performance metrics equally weighted'
  },
  
  'behavioral': {
    id: 'behavioral',
    name: 'Behavioral & Soft Skills',
    description: 'Assess communication, teamwork, and emotional intelligence',
    icon: '🗣️',
    categories: [
      { id: 'communication', name: 'Communication', maxScore: 50 },
      { id: 'teamwork', name: 'Teamwork', maxScore: 50 },
      { id: 'emotional', name: 'Emotional Intelligence', maxScore: 50 },
      { id: 'conflict', name: 'Conflict Resolution', maxScore: 50 },
      { id: 'adaptability', name: 'Adaptability', maxScore: 50 },
      { id: 'empathy', name: 'Empathy', maxScore: 50 },
      { id: 'listening', name: 'Active Listening', maxScore: 50 },
      { id: 'feedback', name: 'Feedback Reception', maxScore: 50 },
      { id: 'interpersonal', name: 'Interpersonal Skills', maxScore: 50 },
      { id: 'professionalism', name: 'Professionalism', maxScore: 50 }
    ],
    weightage: 'All behavioral skills equally weighted'
  },
  
  'cultural': {
    id: 'cultural',
    name: 'Cultural & Attitudinal Fit',
    description: 'Assess values alignment and work ethic',
    icon: '🤝',
    categories: [
      { id: 'values', name: 'Values Alignment', maxScore: 50 },
      { id: 'workethic', name: 'Work Ethic', maxScore: 50 },
      { id: 'adaptability', name: 'Adaptability', maxScore: 50 },
      { id: 'collaboration', name: 'Team Collaboration', maxScore: 50 },
      { id: 'culture', name: 'Company Culture Fit', maxScore: 50 },
      { id: 'diversity', name: 'Diversity Awareness', maxScore: 50 },
      { id: 'inclusivity', name: 'Inclusivity', maxScore: 50 },
      { id: 'respect', name: 'Respect', maxScore: 50 },
      { id: 'integrity', name: 'Integrity', maxScore: 50 },
      { id: 'conduct', name: 'Professional Conduct', maxScore: 50 }
    ],
    weightage: 'All cultural fit dimensions equally weighted'
  }
};

export const getAssessmentType = (typeId) => {
  return assessmentTypes[typeId] || assessmentTypes.general;
};

export const getPersonalityTraits = () => {
  return assessmentTypes.personality.categories;
};

export const getPersonalityTraitDescription = (traitId) => {
  const trait = assessmentTypes.personality.categories.find(c => c.id === traitId);
  return trait ? trait.description : '';
};

export const getPersonalityProfileClassification = (ownership, collaboration, action, analysis, risk, structure) => {
  const scores = { ownership, collaboration, action, analysis, risk, structure };
  
  if (ownership >= 70 && action >= 60) {
    return assessmentTypes.personality.profileClassifications['High Ownership Leader'];
  }
  if (collaboration >= 70 && structure >= 60) {
    return assessmentTypes.personality.profileClassifications['Collaborative Stabilizer'];
  }
  if (action >= 70 && risk >= 60) {
    return assessmentTypes.personality.profileClassifications['Risk Driver / Executor'];
  }
  if (analysis >= 70 && structure >= 60) {
    return assessmentTypes.personality.profileClassifications['Analytical Thinker'];
  }
  return assessmentTypes.personality.profileClassifications['Balanced Professional'];
};
