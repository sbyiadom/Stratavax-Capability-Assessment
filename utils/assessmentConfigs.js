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
  
  'strategic_leadership': {
    id: 'strategic_leadership',
    name: 'Strategic Leadership Assessment',
    description: 'Comprehensive assessment measuring strategic vision, people leadership, decision-making, accountability, emotional intelligence, execution drive, and ethical judgment.',
    icon: '👑',
    categories: [
      { id: 'vision_strategy', name: 'Vision / Strategy', maxScore: 100, description: 'Strategic thinking, long-term planning, and direction setting' },
      { id: 'people_leadership', name: 'People Leadership', maxScore: 100, description: 'Team development, coaching, engagement, and motivation' },
      { id: 'decision_making', name: 'Decision Making', maxScore: 100, description: 'Decisiveness, judgment, and problem-solving under uncertainty' },
      { id: 'accountability', name: 'Accountability', maxScore: 100, description: 'Ownership, responsibility, and follow-through' },
      { id: 'emotional_intelligence', name: 'Emotional Intelligence', maxScore: 100, description: 'Self-awareness, empathy, and conflict management' },
      { id: 'execution_drive', name: 'Execution Drive', maxScore: 100, description: 'Results orientation, urgency, and delivery focus' },
      { id: 'ethics', name: 'Ethics', maxScore: 100, description: 'Integrity, ethical judgment, and principled behavior' }
    ],
    weightage: 'All leadership dimensions equally weighted',
    profileClassifications: {
      '🏆 Strategic Leader': {
        traits: ['vision_strategy', 'people_leadership', 'decision_making'],
        description: 'Excels in strategic thinking, people leadership, and decisive action'
      },
      '👥 People-Focused Leader': {
        traits: ['people_leadership', 'emotional_intelligence'],
        description: 'Prioritizes team development, empathy, and relationship building'
      },
      '⚡ Execution Leader': {
        traits: ['execution_drive', 'accountability'],
        description: 'Drives results with strong follow-through and accountability'
      },
      '🔭 Visionary Leader': {
        traits: ['vision_strategy'],
        description: 'Exceptional strategic thinking and long-term vision'
      },
      '⚖️ Ethical Leader': {
        traits: ['ethics'],
        description: 'Strong moral compass and principled decision-making'
      },
      '⚖️ Balanced Leader': {
        traits: ['vision_strategy', 'people_leadership', 'execution_drive'],
        description: 'Well-rounded across strategy, people, and execution'
      },
      '📈 Developing Leader': {
        traits: [],
        description: 'Emerging leadership capabilities with growth potential'
      }
    },
    dimensionDescriptions: {
      vision_strategy: 'Strategic thinking, long-term planning, and ability to set direction',
      people_leadership: 'Team development, coaching, engagement, and motivation',
      decision_making: 'Decisiveness, judgment, and problem-solving under uncertainty',
      accountability: 'Ownership, responsibility, and follow-through',
      emotional_intelligence: 'Self-awareness, empathy, and conflict management',
      execution_drive: 'Results orientation, urgency, and delivery focus',
      ethics: 'Integrity, ethical judgment, and principled behavior'
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
  },

  // NEW: Manufacturing Baseline Assessment for New Hires
  'manufacturing_baseline': {
    id: 'manufacturing_baseline',
    name: 'Manufacturing Baseline Assessment',
    description: 'Entry-level assessment for new manufacturing hires covering technical fundamentals, troubleshooting basics, numerical aptitude, and workplace safety.',
    icon: '🏭',
    gradient_start: '#2E7D32',
    gradient_end: '#1B5E20',
    categories: [
      { id: 'technical_fundamentals', name: 'Technical Fundamentals', maxScore: 20, description: 'Basic knowledge of maintenance, sensors, motors, pneumatics, and mechanical systems' },
      { id: 'troubleshooting', name: 'Troubleshooting', maxScore: 25, description: 'Problem identification, conveyor issues, filler problems, labeler alignment, jams' },
      { id: 'numerical_aptitude', name: 'Numerical Aptitude', maxScore: 25, description: 'Math calculations, percentages, sequences, ratios, and production rates' },
      { id: 'safety_attitude', name: 'Safety & Work Ethic', maxScore: 30, description: 'PPE, safety reporting, SOP compliance, teamwork, and ethical behavior' }
    ],
    weightage: 'Each category contributes to total score based on question count',
    passThreshold: 70,
    timeLimit: 180,
    totalQuestions: 100,
    descriptionDetailed: 'The Manufacturing Baseline Assessment evaluates foundational knowledge required for new manufacturing hires. Topics include basic equipment understanding, common troubleshooting, numerical reasoning, and workplace safety. This assessment is designed for entry-level manufacturing positions to establish a baseline of technical and safety competency.',
    whatItMeasures: {
      technical_fundamentals: 'Measures basic understanding of maintenance practices, sensor functions, motor operation, pneumatic systems, lubrication principles, and mechanical components.',
      troubleshooting: 'Evaluates ability to identify common production issues, diagnose conveyor problems, resolve filler and labeler malfunctions, handle bottle jams, and respond to sensor and PLC faults.',
      numerical_aptitude: 'Assesses mathematical ability including calculations, percentages, sequences, ratios, efficiency calculations, and production rate determination.',
      safety_attitude: 'Evaluates knowledge of PPE requirements, safety reporting protocols, compliance with SOPs, teamwork capabilities, ethical judgment, and professional conduct.'
    },
    targetAudience: 'Entry-level manufacturing new hires, production associates, line operators, and maintenance trainees',
    recommendedFor: [
      'Production Line Operators',
      'Manufacturing Associates',
      'Quality Control Technicians',
      'Maintenance Trainees',
      'Packaging Operators',
      'Filling Line Operators'
    ]
  }
};

export const getAssessmentType = (typeId) => {
  return assessmentTypes[typeId] || assessmentTypes.general;
};

export const getManufacturingBaselineCategories = () => {
  return assessmentTypes.manufacturing_baseline?.categories || [];
};

export const getManufacturingBaselineInfo = () => {
  return assessmentTypes.manufacturing_baseline || null;
};

export const getPersonalityTraits = () => {
  return assessmentTypes.personality.categories;
};

export const getStrategicLeadershipDimensions = () => {
  return assessmentTypes.strategic_leadership.categories;
};

export const getPersonalityTraitDescription = (traitId) => {
  const trait = assessmentTypes.personality.categories.find(c => c.id === traitId);
  return trait ? trait.description : '';
};

export const getStrategicLeadershipDimensionDescription = (dimensionId) => {
  const dimension = assessmentTypes.strategic_leadership.categories.find(c => c.id === dimensionId);
  return dimension ? dimension.description : '';
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

export const getStrategicLeadershipProfile = (
  visionStrategy, 
  peopleLeadership, 
  decisionMaking, 
  accountability, 
  emotionalIntelligence, 
  executionDrive, 
  ethics
) => {
  // Strategic Leader
  if (visionStrategy >= 70 && peopleLeadership >= 70 && decisionMaking >= 70) {
    return assessmentTypes.strategic_leadership.profileClassifications['🏆 Strategic Leader'];
  }
  // People-Focused Leader
  if (peopleLeadership >= 80 && emotionalIntelligence >= 70) {
    return assessmentTypes.strategic_leadership.profileClassifications['👥 People-Focused Leader'];
  }
  // Execution Leader
  if (executionDrive >= 80 && accountability >= 70) {
    return assessmentTypes.strategic_leadership.profileClassifications['⚡ Execution Leader'];
  }
  // Visionary Leader
  if (visionStrategy >= 80) {
    return assessmentTypes.strategic_leadership.profileClassifications['🔭 Visionary Leader'];
  }
  // Ethical Leader
  if (ethics >= 80) {
    return assessmentTypes.strategic_leadership.profileClassifications['⚖️ Ethical Leader'];
  }
  // Balanced Leader
  if (visionStrategy >= 60 && peopleLeadership >= 60 && executionDrive >= 60) {
    return assessmentTypes.strategic_leadership.profileClassifications['⚖️ Balanced Leader'];
  }
  // Default
  return assessmentTypes.strategic_leadership.profileClassifications['📈 Developing Leader'];
};
