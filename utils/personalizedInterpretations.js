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
  'personality': {
    name: 'Personality Assessment',
    categories: [
      'Openness',
      'Conscientiousness',
      'Extraversion',
      'Agreeableness',
      'Neuroticism',
      'Resilience',
      'Adaptability',
      'Optimism',
      'Self-Efficacy',
      'Work Style'
    ],
    maxScores: {
      'Openness': 50,
      'Conscientiousness': 50,
      'Extraversion': 50,
      'Agreeableness': 50,
      'Neuroticism': 50,
      'Resilience': 50,
      'Adaptability': 50,
      'Optimism': 50,
      'Self-Efficacy': 50,
      'Work Style': 50
    },
    description: 'Evaluate personality traits and interpersonal skills',
    icon: '🌟'
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

// Category interpretations database
export const categoryInterpretations = {
  // General Assessment Categories
  'Cognitive Ability': {
    excellent: 'Exceptional analytical and strategic thinking capabilities. Demonstrates masterful problem-solving and can handle the most complex challenges with ease.',
    good: 'Strong analytical thinking. Handles complex problems effectively and shows consistent logical reasoning.',
    average: 'Moderate cognitive abilities. Benefits from structured approaches and may need support with highly complex problems.',
    below_average: 'Cognitive abilities need development. May struggle with complex problem-solving and analytical tasks.',
    poor: 'Significant cognitive gaps. Requires clear guidance, simplified tasks, and structured support for analytical work.'
  },
  'Communication': {
    excellent: 'Exceptional communicator. Articulates ideas with clarity, persuasiveness, and impact. Excels in both written and verbal communication.',
    good: 'Strong communication skills. Expresses ideas clearly and effectively in most situations.',
    average: 'Adequate communication. Can convey basic ideas but may struggle with complex messaging or persuasive communication.',
    below_average: 'Communication needs improvement. May have difficulty expressing ideas clearly or adapting to different audiences.',
    poor: 'Poor communication skills. Significant development needed in both written and verbal expression.'
  },
  'Cultural & Attitudinal Fit': {
    excellent: 'Strong cultural alignment. Embodies company values and enhances team dynamics naturally.',
    good: 'Good cultural fit. Generally aligned with organizational values and contributes positively.',
    average: 'Moderate cultural alignment. Some areas may need attention to fully integrate with company culture.',
    below_average: 'Cultural fit concerns. May not fully align with company values, requiring guidance and support.',
    poor: 'Poor cultural fit. Significant misalignment with organizational culture, values, and norms.'
  },
  'Emotional Intelligence': {
    excellent: 'High emotional intelligence. Exceptionally self-aware, empathetic, and skilled at managing relationships.',
    good: 'Good emotional awareness. Navigates interpersonal situations well and understands others\' perspectives.',
    average: 'Moderate emotional intelligence. May struggle with complex interpersonal dynamics or conflict situations.',
    below_average: 'Emotional intelligence needs development. Challenges with self-awareness, empathy, or relationship management.',
    poor: 'Poor emotional intelligence. Significant interpersonal challenges affecting team dynamics.'
  },
  'Ethics & Integrity': {
    excellent: 'Strong ethical foundation. Trustworthy and principled decision-maker with unwavering integrity.',
    good: 'Good integrity. Generally makes ethical choices with sound judgment in most situations.',
    average: 'Adequate ethical awareness. May need guidance in complex ethical situations.',
    below_average: 'Ethical concerns. Requires clear boundaries and supervision to ensure proper conduct.',
    poor: 'Poor ethical judgment. Significant risk area requiring immediate attention and intervention.'
  },
  'Leadership & Management': {
    excellent: 'Strong leadership potential. Strategic thinker who inspires and develops others effectively.',
    good: 'Good leadership capabilities. Can manage teams and drive results with developing influence.',
    average: 'Moderate leadership skills. May need support in people management and strategic thinking.',
    below_average: 'Leadership needs development. Challenges with team management and influencing others.',
    poor: 'Poor leadership potential. Not ready for management roles without significant development.'
  },
  'Performance Metrics': {
    excellent: 'Results-driven with strong accountability. Sets and achieves challenging goals consistently.',
    good: 'Good performance orientation. Meets targets and tracks progress effectively.',
    average: 'Adequate focus on results. May need guidance in goal setting and performance tracking.',
    below_average: 'Performance focus needs improvement. Challenges with accountability and meeting targets.',
    poor: 'Poor results orientation. Significant gaps in performance management and accountability.'
  },
  'Personality & Behavioral': {
    excellent: 'Stable, resilient, and adaptable. Consistently demonstrates positive work patterns.',
    good: 'Good behavioral profile. Generally stable, reliable, and adaptable.',
    average: 'Moderate behavioral patterns. May have some inconsistencies in work style.',
    below_average: 'Behavioral concerns. May lack resilience or adaptability in challenging situations.',
    poor: 'Poor behavioral profile. Significant concerns needing attention and intervention.'
  },
  'Problem-Solving': {
    excellent: 'Excellent problem-solver. Systematic, creative, and effective in all situations.',
    good: 'Good problem-solving skills. Handles most challenges effectively with sound analysis.',
    average: 'Moderate problem-solving. May need support with complex or novel issues.',
    below_average: 'Problem-solving needs development. Struggles with analysis and solution generation.',
    poor: 'Poor problem-solving. Significant difficulties with challenges requiring analytical thinking.'
  },
  'Technical & Manufacturing': {
    excellent: 'Strong technical expertise. Deep understanding of systems, processes, and applications.',
    good: 'Good technical knowledge. Handles most technical tasks effectively with minimal guidance.',
    average: 'Moderate technical skills. May need training in advanced areas and complex applications.',
    below_average: 'Technical knowledge needs development. Requires training and supervision.',
    poor: 'Poor technical expertise. Significant knowledge gaps requiring foundational training.'
  },

  // Leadership Assessment Categories
  'Vision & Strategic Thinking': {
    excellent: 'Strategic thinker with compelling vision. Anticipates future trends and creates clear direction.',
    good: 'Good strategic thinking. Sees the big picture and understands organizational direction.',
    average: 'Moderate strategic ability. Needs development in long-term planning and vision creation.',
    below_average: 'Limited strategic thinking. Tends to focus on tactical rather than strategic.',
    poor: 'Poor strategic thinking. Significant concerns in vision and strategic planning.'
  },
  'Decision-Making & Problem-Solving': {
    excellent: 'Decisive and analytical. Makes sound judgments consistently, even under pressure.',
    good: 'Good decision-maker. Handles most decisions effectively with thorough analysis.',
    average: 'Moderate decision-making. May need support with complex or high-stakes choices.',
    below_average: 'Decision-making needs improvement. Struggles with analysis and timely decisions.',
    poor: 'Poor decision-making. Significant concerns in judgment and problem-solving.'
  },
  'Communication & Influence': {
    excellent: 'Powerful communicator who influences effectively at all levels of the organization.',
    good: 'Good communicator with developing influence skills. Persuades effectively in most situations.',
    average: 'Adequate communication. May struggle with persuasion and influencing others.',
    below_average: 'Communication needs improvement. Limited influence and impact.',
    poor: 'Poor communication and influence skills. Significant development needed.'
  },
  'People Management & Coaching': {
    excellent: 'Develops and coaches others exceptionally. Builds high-performing teams naturally.',
    good: 'Good people manager. Supports team development and provides effective coaching.',
    average: 'Moderate people skills. Needs development in coaching and team development.',
    below_average: 'People management needs improvement. Challenges in developing others.',
    poor: 'Poor people management. Significant concerns in team leadership.'
  },
  'Change Leadership & Agility': {
    excellent: 'Exceptional change leader. Drives transformation and adapts quickly to new situations.',
    good: 'Good at managing change. Adapts well to new situations and supports others through change.',
    average: 'Moderate change agility. May need support during organizational transitions.',
    below_average: 'Change management needs development. Struggles with adaptation.',
    poor: 'Poor change agility. Resists or struggles significantly with change.'
  },

  // Cognitive Assessment Categories
  'Logical / Abstract Reasoning': {
    excellent: 'Strong logical reasoning. Exceptional pattern recognition and abstract thinking.',
    good: 'Good logical reasoning. Handles abstract concepts and patterns well.',
    average: 'Moderate logical skills. May need support with complex logic and abstractions.',
    below_average: 'Logical reasoning needs development. Struggles with abstract concepts.',
    poor: 'Poor logical reasoning. Significant concerns in analytical thinking.'
  },
  'Numerical Reasoning': {
    excellent: 'Strong numerical reasoning. Exceptionally comfortable with data and numerical analysis.',
    good: 'Good numerical skills. Handles numbers and data analysis effectively.',
    average: 'Moderate numerical ability. Needs support with complex mathematical concepts.',
    below_average: 'Numerical reasoning needs development. Struggles with data interpretation.',
    poor: 'Poor numerical reasoning. Significant gaps in quantitative thinking.'
  },
  'Verbal Reasoning': {
    excellent: 'Strong verbal reasoning. Excellent comprehension and language processing.',
    good: 'Good verbal skills. Understands language well and communicates effectively.',
    average: 'Moderate verbal ability. May need support with complex language tasks.',
    below_average: 'Verbal reasoning needs development. Struggles with language comprehension.',
    poor: 'Poor verbal reasoning. Significant concerns in language processing.'
  },

  // Technical Assessment Categories
  'Technical Knowledge': {
    excellent: 'Deep technical expertise. Comprehensive understanding of systems and technologies.',
    good: 'Good technical knowledge. Solid grasp of core concepts and applications.',
    average: 'Moderate technical knowledge. Needs training in advanced areas.',
    below_average: 'Technical knowledge needs development. Requires foundational training.',
    poor: 'Poor technical knowledge. Significant gaps requiring immediate attention.'
  },
  'System Understanding': {
    excellent: 'Exceptional system understanding. Comprehends complex interactions and dependencies.',
    good: 'Good system understanding. Grasps how components work together effectively.',
    average: 'Moderate system knowledge. May need help understanding complex interactions.',
    below_average: 'System understanding needs development. Struggles with integrated concepts.',
    poor: 'Poor system understanding. Significant concerns in holistic thinking.'
  },
  'Troubleshooting': {
    excellent: 'Expert troubleshooter. Quickly identifies root causes and implements effective solutions.',
    good: 'Good troubleshooting skills. Handles most issues effectively with systematic approach.',
    average: 'Moderate troubleshooting. May need support with complex or novel problems.',
    below_average: 'Troubleshooting needs development. Struggles with problem diagnosis.',
    poor: 'Poor troubleshooting. Significant difficulties in problem resolution.'
  },

  // Personality Assessment Categories
  'Openness': {
    excellent: 'Highly open to new experiences. Creative, curious, and embraces innovation.',
    good: 'Good openness. Receptive to new ideas and willing to try new approaches.',
    average: 'Moderate openness. May need encouragement to embrace change and innovation.',
    below_average: 'Limited openness. Tends to prefer familiar approaches and routines.',
    poor: 'Poor openness. Resists new ideas and significant change.'
  },
  'Conscientiousness': {
    excellent: 'Highly conscientious. Organized, dependable, and achievement-oriented.',
    good: 'Good conscientiousness. Reliable and organized in most situations.',
    average: 'Moderate conscientiousness. May need support with organization and follow-through.',
    below_average: 'Conscientiousness needs improvement. Inconsistent reliability.',
    poor: 'Poor conscientiousness. Significant concerns in dependability.'
  },
  'Extraversion': {
    excellent: 'Highly extraverted. Energized by social interaction and naturally engaging.',
    good: 'Good extraversion. Comfortable in social situations and team environments.',
    average: 'Moderate extraversion. May need support in highly social situations.',
    below_average: 'Limited extraversion. Prefers independent work and quiet environments.',
    poor: 'Poor social engagement. Significant challenges in team settings.'
  },

  // Performance Assessment Categories
  'Productivity & Efficiency': {
    excellent: 'Highly productive and efficiency-focused. Consistently exceeds targets.',
    good: 'Good productivity. Meets targets with efficient work processes.',
    average: 'Moderate productivity. May need support with time management and efficiency.',
    below_average: 'Productivity needs development. Struggles to meet targets.',
    poor: 'Poor productivity. Significant concerns in output and efficiency.'
  },
  'Work Quality & Effectiveness': {
    excellent: 'Consistently high-quality work. Exceptional attention to detail and accuracy.',
    good: 'Good work quality. Reliable and produces solid results.',
    average: 'Moderate quality. May need improvement in accuracy and attention to detail.',
    below_average: 'Work quality needs development. Inconsistent output quality.',
    poor: 'Poor quality. Significant concerns in work standards.'
  },
  'Goal Achievement': {
    excellent: 'Exceptional goal achievement. Consistently exceeds objectives.',
    good: 'Good goal achievement. Meets most targets and objectives.',
    average: 'Moderate goal achievement. May need support with goal setting and attainment.',
    below_average: 'Goal achievement needs improvement. Struggles to meet objectives.',
    poor: 'Poor goal achievement. Significant concerns in target attainment.'
  },

  // Behavioral Assessment Categories
  'Teamwork': {
    excellent: 'Exceptional team player. Builds strong relationships and enhances team dynamics.',
    good: 'Good teamwork. Collaborates effectively and contributes to team success.',
    average: 'Moderate teamwork. May need development in collaboration and team contribution.',
    below_average: 'Teamwork needs improvement. Struggles with team dynamics.',
    poor: 'Poor teamwork. Significant challenges in collaborative settings.'
  },
  'Conflict Resolution': {
    excellent: 'Expert conflict resolver. Navigates disagreements constructively and builds consensus.',
    good: 'Good conflict resolution. Handles most disagreements professionally.',
    average: 'Moderate conflict resolution. May need support with complex conflicts.',
    below_average: 'Conflict resolution needs development. Struggles with disagreements.',
    poor: 'Poor conflict resolution. Significant concerns in managing disputes.'
  },
  'Adaptability': {
    excellent: 'Highly adaptable. Thrives in changing environments and embraces new challenges.',
    good: 'Good adaptability. Adjusts well to most changes and new situations.',
    average: 'Moderate adaptability. May need support during significant changes.',
    below_average: 'Adaptability needs development. Struggles with change.',
    poor: 'Poor adaptability. Significant resistance to change.'
  },

  // Manufacturing Assessment Categories
  'Equipment Operation': {
    excellent: 'Expert equipment operator. Masters all machinery and optimizes performance.',
    good: 'Good equipment operation. Handles most machinery effectively and safely.',
    average: 'Moderate equipment skills. Needs training on advanced equipment.',
    below_average: 'Equipment operation needs development. Requires supervision.',
    poor: 'Poor equipment skills. Significant training needed.'
  },
  'Safety Procedures': {
    excellent: 'Safety champion. Exemplifies and promotes all safety protocols.',
    good: 'Good safety awareness. Follows procedures consistently.',
    average: 'Moderate safety knowledge. Needs reinforcement of protocols.',
    below_average: 'Safety awareness needs development. Requires monitoring.',
    poor: 'Poor safety understanding. Significant concerns requiring immediate attention.'
  },
  'Quality Control': {
    excellent: 'Quality expert. Maintains exceptional standards and identifies improvements.',
    good: 'Good quality focus. Maintains standards and identifies issues.',
    average: 'Moderate quality awareness. Needs support in quality maintenance.',
    below_average: 'Quality control needs development. Inconsistent standards.',
    poor: 'Poor quality focus. Significant concerns in quality maintenance.'
  },

  // Cultural Assessment Categories
  'Values Alignment': {
    excellent: 'Strong values alignment. Naturally embodies and promotes company values.',
    good: 'Good values alignment. Generally aligned with organizational principles.',
    average: 'Moderate alignment. Some values may need reinforcement.',
    below_average: 'Values misalignment concerns. May not fully embrace company principles.',
    poor: 'Poor values alignment. Significant disconnect from organizational values.'
  },
  'Work Ethic': {
    excellent: 'Exceptional work ethic. Consistently goes above and beyond.',
    good: 'Good work ethic. Reliable and dedicated to quality work.',
    average: 'Moderate work ethic. May need encouragement for extra effort.',
    below_average: 'Work ethic needs improvement. Inconsistent effort.',
    poor: 'Poor work ethic. Significant concerns in dedication and effort.'
  },
  'Diversity Awareness': {
    excellent: 'Strong diversity advocate. Champions inclusion and respects all perspectives.',
    good: 'Good diversity awareness. Values different perspectives and backgrounds.',
    average: 'Moderate awareness. Needs development in diversity understanding.',
    below_average: 'Limited diversity awareness. May need training and education.',
    poor: 'Poor diversity awareness. Significant concerns in this area.'
  }
};

// Generate personalized strength description based on actual score
export const getPersonalizedStrengthDescription = (category, score, maxPossible) => {
  const percentage = Math.round((score / maxPossible) * 100);
  const level = getLevel(percentage);
  
  const baseDescription = categoryInterpretations[category]?.[level] || 
    `Strong performance in ${category} (${percentage}%). This is a valuable asset.`;
  
  // Add personalized detail based on the exact score
  if (percentage >= 90) {
    return `${baseDescription} This is exceptional performance - in the top tier.`;
  } else if (percentage >= 80) {
    return `${baseDescription} Well above the target threshold of 80%.`;
  } else if (percentage >= 75) {
    return `${baseDescription} Solid performance with room to reach excellence.`;
  }
  
  return baseDescription;
};

// Generate personalized improvement recommendations
export const getPersonalizedRecommendations = (category, score, maxPossible, allScores = {}) => {
  const percentage = Math.round((score / maxPossible) * 100);
  const gapToTarget = Math.round((maxPossible * 0.8) - score);
  
  const recommendations = {
    'Cognitive Ability': [
      `Current score ${score}/${maxPossible} (${percentage}%). Need ${gapToTarget > 0 ? gapToTarget : 0} more points to reach 80% target.`,
      'Complete structured problem-solving frameworks training',
      'Practice with case studies and analytical exercises weekly',
      'Work with a mentor on complex problem-solving scenarios',
      'Enroll in critical thinking and logical reasoning courses'
    ],
    'Emotional Intelligence': [
      `Current score ${score}/${maxPossible} (${percentage}%). Focus on reaching ${gapToTarget > 0 ? gapToTarget : 0} point improvement.`,
      'Participate in EI workshops focusing on self-awareness',
      'Practice active listening and empathy in daily interactions',
      'Seek regular feedback on interpersonal interactions',
      'Work with a coach on conflict resolution skills'
    ],
    'Technical & Manufacturing': [
      `Technical skills at ${percentage}%. Need ${gapToTarget > 0 ? gapToTarget : 0} more points to reach competency target.`,
      'Complete foundational technical training courses',
      'Shadow experienced technicians for hands-on learning',
      'Practice equipment operation under supervision',
      'Create a structured skill development plan'
    ],
    'Cultural & Attitudinal Fit': [
      `Cultural alignment at ${percentage}%. Target is 80% (${gapToTarget > 0 ? gapToTarget : 0} point gap).`,
      'Participate in company culture workshops',
      'Schedule regular feedback sessions on cultural alignment',
      'Pair with a culture champion for mentoring',
      'Review and discuss company values application'
    ],
    'Communication': [
      `Communication score ${score}/${maxPossible} (${percentage}%). Target 80% requires ${gapToTarget > 0 ? gapToTarget : 0} more points.`,
      'Take business writing and presentation skills courses',
      'Practice presentations with constructive feedback',
      'Join Toastmasters or similar groups',
      'Work on executive presence with a mentor'
    ],
    'Problem-Solving': [
      `Problem-solving at ${percentage}%. Gap to target: ${gapToTarget > 0 ? gapToTarget : 0} points.`,
      'Learn structured problem-solving frameworks (root cause analysis)',
      'Practice with real-world case studies',
      'Participate in design thinking workshops',
      'Work on cross-functional projects'
    ],
    'Leadership & Management': [
      `Leadership score ${score}/${maxPossible} (${percentage}%). Need ${gapToTarget > 0 ? gapToTarget : 0} points to reach target.`,
      'Take leadership development courses',
      'Seek opportunities to lead small projects',
      'Work with a leadership coach',
      'Practice delegation and team motivation'
    ],
    'Performance Metrics': [
      `Performance orientation at ${percentage}%. Target 80% (${gapToTarget > 0 ? gapToTarget : 0} point gap).`,
      'Set SMART goals and track progress weekly',
      'Learn performance management frameworks',
      'Practice accountability and ownership',
      'Work with manager on performance planning'
    ]
  };
  
  const defaultRecs = [
    `Current score: ${score}/${maxPossible} (${percentage}%). Target: 80% (need ${gapToTarget > 0 ? gapToTarget : 0} more points).`,
    'Complete targeted training in this area',
    'Work with a mentor for guided development',
    'Practice skills through practical applications',
    'Set specific improvement goals with weekly check-ins'
  ];
  
  return recommendations[category] || defaultRecs;
};

// Generate overall profile summary based on all scores
export const generatePersonalizedProfileSummary = (candidateName, assessmentType, totalScore, maxScore, categoryScores) => {
  const percentage = Math.round((totalScore / maxScore) * 100);
  const strongAreas = [];
  const moderateAreas = [];
  const concernAreas = [];
  
  Object.entries(categoryScores).forEach(([category, data]) => {
    if (data.percentage >= 70) strongAreas.push(category);
    else if (data.percentage >= 60) moderateAreas.push(category);
    else concernAreas.push(category);
  });
  
  let summary = `${candidateName} completed the ${assessmentConfigs[assessmentType]?.name || 'Assessment'} with a total score of ${totalScore}/${maxScore} (${percentage}%). `;
  
  if (strongAreas.length > 0) {
    summary += `Demonstrates strengths in ${strongAreas.join(', ')}. `;
  }
  
  if (moderateAreas.length > 0) {
    summary += `Shows basic competency in ${moderateAreas.join(', ')} that can be developed further. `;
  }
  
  if (concernAreas.length > 0) {
    summary += `Critical development needed in ${concernAreas.join(', ')}. `;
  }
  
  // Add personalized assessment based on pattern
  if (concernAreas.includes('Cognitive Ability') && concernAreas.includes('Emotional Intelligence') && concernAreas.includes('Cultural & Attitudinal Fit')) {
    summary += 'This combination of low cognitive ability, emotional intelligence, and cultural fit is significant for leadership roles. These three factors together often predict struggles with complexity, team dynamics, and organizational alignment.';
  } else if (strongAreas.length >= 5 && concernAreas.length <= 2) {
    summary += 'This is a strong profile with multiple strengths and manageable development areas. Good potential for growth.';
  } else if (concernAreas.length >= 4) {
    summary += 'This profile shows significant development needs across multiple areas. Requires structured support and intensive training.';
  } else {
    summary += 'This is a balanced profile with identified strengths and clear development paths.';
  }
  
  return summary;
};

// Get best fit based on actual scores
export const getPersonalizedBestFit = (categoryScores) => {
  const strengths = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage >= 70)
    .map(([category]) => category);
    
  const weaknesses = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage < 60)
    .map(([category]) => category);
  
  const fits = [];
  const risks = [];
  
  // Determine best fit based on strengths
  if (strengths.includes('Ethics & Integrity') && strengths.includes('Performance Metrics')) {
    fits.push('Compliance and quality assurance roles');
  }
  if (strengths.includes('Leadership & Management')) {
    fits.push('Supervisory and team lead positions');
  }
  if (strengths.includes('Technical & Manufacturing')) {
    fits.push('Technical specialist roles');
  }
  if (strengths.includes('Communication')) {
    fits.push('Client-facing and collaborative roles');
  }
  if (strengths.includes('Problem-Solving')) {
    fits.push('Analytical and troubleshooting positions');
  }
  
  // Default fit if no strong patterns
  if (fits.length === 0) {
    fits.push('Structured operational roles with clear guidance');
    fits.push('Entry-level positions with training support');
  }
  
  // Determine risks based on weaknesses
  if (weaknesses.includes('Cognitive Ability')) {
    risks.push('Complex analytical and strategic roles');
  }
  if (weaknesses.includes('Emotional Intelligence')) {
    risks.push('High-stakes people management');
  }
  if (weaknesses.includes('Cultural & Attitudinal Fit')) {
    risks.push('Culture-defining positions');
  }
  if (weaknesses.includes('Leadership & Management')) {
    risks.push('Senior leadership positions');
  }
  if (weaknesses.includes('Technical & Manufacturing')) {
    risks.push('Technical expert roles');
  }
  
  // Default if no specific risks
  if (risks.length === 0 && weaknesses.length > 0) {
    risks.push('Roles requiring autonomy in weak areas');
  } else if (risks.length === 0) {
    risks.push('No significant risks identified');
  }
  
  return { fits, risks };
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
