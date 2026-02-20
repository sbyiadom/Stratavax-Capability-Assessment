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
    description: 'Evaluate personality traits and interpersonal skills',
    icon: '🌟',
    categories: [
      { id: 'openness', name: 'Openness', maxScore: 50 },
      { id: 'conscientiousness', name: 'Conscientiousness', maxScore: 50 },
      { id: 'extraversion', name: 'Extraversion', maxScore: 50 },
      { id: 'agreeableness', name: 'Agreeableness', maxScore: 50 },
      { id: 'neuroticism', name: 'Neuroticism', maxScore: 50 },
      { id: 'resilience', name: 'Resilience', maxScore: 50 },
      { id: 'adaptability', name: 'Adaptability', maxScore: 50 },
      { id: 'optimism', name: 'Optimism', maxScore: 50 },
      { id: 'efficacy', name: 'Self-Efficacy', maxScore: 50 },
      { id: 'workstyle', name: 'Work Style', maxScore: 50 }
    ],
    weightage: 'All personality dimensions equally weighted'
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
