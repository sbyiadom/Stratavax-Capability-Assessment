// utils/psychometricAnalyzer.js

export const generatePsychometricAnalysis = (categoryScores, assessmentType, candidateName, responseInsights) => {
  
  // Get all categories and their scores
  const categories = Object.entries(categoryScores).map(([name, data]) => ({
    name,
    score: data.score,
    maxPossible: data.maxPossible,
    percentage: data.percentage
  }));

  // Sort categories by percentage (lowest first for development focus)
  const sortedByPercentage = [...categories].sort((a, b) => a.percentage - b.percentage);
  
  // Identify strengths (≥70%) and weaknesses (<50%)
  const strengths = categories.filter(c => c.percentage >= 70);
  const weaknesses = categories.filter(c => c.percentage < 50);
  const developing = categories.filter(c => c.percentage >= 50 && c.percentage < 70);

  // Calculate overall statistics
  const avgScore = categories.reduce((sum, c) => sum + c.percentage, 0) / categories.length;

  // Generate analysis based on assessment type
  return generateAssessmentAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage, assessmentType);
};

const generateAssessmentAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage, assessmentType) => {
  
  // Get assessment type display name
  const assessmentTypeNames = {
    'cognitive': 'Cognitive Ability',
    'general': 'General',
    'leadership': 'Leadership',
    'technical': 'Technical',
    'personality': 'Personality',
    'performance': 'Performance',
    'behavioral': 'Behavioral',
    'cultural': 'Cultural Fit'
  };

  const typeName = assessmentTypeNames[assessmentType] || 'Assessment';

  return {
    // Overall Performance Summary
    overallSummary: `**📊 Overall Performance Summary**

${candidateName} completed the ${typeName} assessment with an overall score of ${Math.round(avgScore)}%. ` + 
getOverallPerformanceDescription(avgScore, strengths.length, weaknesses.length),

    // Category-by-Category Analysis
    categoryAnalysis: generateCategoryAnalysis(categories, candidateName),

    // Key Strengths
    keyStrengths: strengths.length > 0 
      ? `**💪 Key Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getStrengthDescription(s.name, s.percentage, assessmentType)}`).join('\n\n')}`
      : `**💪 Key Strengths**

No significant strengths were identified in this assessment. Focus should be on foundational development in all areas.`,

    // Priority Development Areas
    priorityDevelopment: `**📈 Priority Development Areas**

Based on performance, the following areas require immediate attention:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getDevelopmentPriorityDescription(c.name, c.percentage, assessmentType)}`
).join('\n\n')}`,

    // Detailed Development Plan
    developmentPlan: generateDevelopmentPlan(categories, weaknesses, developing, strengths, candidateName, assessmentType),

    // Risk Factors
    riskFactors: weaknesses.length > 0
      ? `**⚠️ Risk Factors**

The following areas present significant challenges that need attention:

${weaknesses.slice(0, 3).map(w => `• **${w.name}** (${w.percentage}%): ${getRiskDescription(w.name, w.percentage, assessmentType)}`).join('\n')}`
      : `**⚠️ Risk Factors**

No significant risk factors identified.`
  };
};

const generateCategoryAnalysis = (categories, candidateName) => {
  return `**📋 Category-by-Category Analysis**

${candidateName} was assessed on the following ${categories.length} competencies:

${categories.map(c => `**${c.name}** – ${c.percentage}% (${getPerformanceLevel(c.percentage)})

${getCategorySpecificFeedback(c.name, c.percentage)}

• **Score**: ${c.score}/${c.maxPossible}
• **Target**: 80% (${Math.round((80 - c.percentage) / 10) * 10}% gap)
• **Priority**: ${getPriorityLevel(c.percentage)}`).join('\n\n')}`;
};

const generateDevelopmentPlan = (categories, weaknesses, developing, strengths, candidateName, assessmentType) => {
  const priorityAreas = [...weaknesses, ...developing].slice(0, 3);
  
  return `**📅 Personalized Development Plan for ${candidateName}**

Based on the assessment results, here is a tailored development plan:

${priorityAreas.map((area, index) => `
**Goal ${index + 1}: Improve ${area.name}**
• **Current Level**: ${area.percentage}% (${getPerformanceLevel(area.percentage)})
• **Target Level**: 80% (Proficient)
• **Timeline**: ${index === 0 ? '3 months' : index === 1 ? '6 months' : '9 months'}

**Recommended Actions:**
${getDevelopmentActions(area.name, area.percentage, assessmentType).map(action => `  • ${action}`).join('\n')}

**Success Metrics:**
  • Complete all recommended training modules
  • Practice exercises 3-4 times per week
  • Achieve 70%+ on progress checks
  • Demonstrate improvement in practical applications
`).join('\n')}

${strengths.length > 0 ? `
**Strengths to Leverage:**
${strengths.slice(0, 2).map(s => `• Your strength in **${s.name}** (${s.percentage}%) can be leveraged to build confidence while working on development areas.`).join('\n')}` : ''}

**Recommended Support:**
• Schedule monthly progress reviews with supervisor
• Work with a mentor for guided practice
• Use online resources and practice materials
• Join study groups or peer learning sessions
`;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getPerformanceLevel = (percentage) => {
  if (percentage >= 80) return 'Exceptional';
  if (percentage >= 70) return 'Strong';
  if (percentage >= 60) return 'Developing';
  if (percentage >= 50) return 'Basic';
  if (percentage >= 40) return 'Below Average';
  return 'Critical';
};

const getPriorityLevel = (percentage) => {
  if (percentage < 40) return 'Critical - Immediate action required';
  if (percentage < 50) return 'High - Needs urgent attention';
  if (percentage < 60) return 'Medium - Should be prioritized';
  if (percentage < 70) return 'Low - Monitor progress';
  return 'Strength - Maintain and leverage';
};

const getOverallPerformanceDescription = (avgScore, strengthsCount, weaknessesCount) => {
  if (avgScore >= 70) return `This is a strong performance with ${strengthsCount} identified strengths and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `This is a developing performance with room for improvement in ${weaknessesCount} key areas.`;
  return `This performance indicates significant development needs across ${weaknessesCount} areas requiring immediate attention.`;
};

const getCategorySpecificFeedback = (categoryName, percentage) => {
  const baseFeedback = {
    'Verbal Reasoning': {
      high: 'Demonstrates strong ability to understand and analyze written information.',
      medium: 'Shows basic competency in verbal tasks but needs practice with complex passages.',
      low: 'Struggles significantly with verbal comprehension and expression.'
    },
    'Numerical Reasoning': {
      high: 'Excellent at working with numbers and interpreting quantitative data.',
      medium: 'Can handle basic calculations but needs support with complex numerical problems.',
      low: 'Significant difficulty with numerical concepts and data interpretation.'
    },
    'Logical / Abstract Reasoning': {
      high: 'Exceptional at identifying patterns and solving abstract problems.',
      medium: 'Can solve routine logic problems but struggles with novel situations.',
      low: 'Major challenges with logical thinking and pattern recognition.'
    },
    'Spatial Reasoning': {
      high: 'Strong ability to visualize and manipulate objects in space.',
      medium: 'Adequate spatial skills but needs practice with complex visual tasks.',
      low: 'Difficulty with spatial relationships and visual processing.'
    },
    'Memory & Attention': {
      high: 'Excellent recall and sustained attention to detail.',
      medium: 'Generally attentive but may miss some details or forget information.',
      low: 'Significant challenges with memory retention and maintaining focus.'
    },
    'Mechanical Reasoning': {
      high: 'Strong understanding of mechanical principles and physical systems.',
      medium: 'Basic grasp of mechanical concepts but needs practical experience.',
      low: 'Limited understanding of how mechanical systems work.'
    },
    'Perceptual Speed & Accuracy': {
      high: 'Exceptionally fast and accurate at visual processing tasks.',
      medium: 'Average speed and accuracy, may need extra time for detail work.',
      low: 'Slow processing speed with frequent errors on detail-oriented tasks.'
    },
    'Cognitive Ability': {
      high: 'Strong analytical and strategic thinking capabilities.',
      medium: 'Moderate cognitive abilities. Benefits from structured approaches.',
      low: 'Struggles with complex problem-solving and analytical tasks.'
    },
    'Communication': {
      high: 'Articulates ideas clearly and persuasively.',
      medium: 'Adequate communication. Needs development in clarity.',
      low: 'Difficulty expressing ideas clearly.'
    },
    'Problem-Solving': {
      high: 'Excellent problem-solver. Systematic and effective.',
      medium: 'Can solve routine problems but struggles with novel situations.',
      low: 'Poor problem-solving skills. Needs structured approaches.'
    },
    'Leadership & Management': {
      high: 'Strong leadership potential. Inspires and develops others.',
      medium: 'Emerging leadership skills. Needs development in people management.',
      low: 'Limited leadership capability. Not ready for management roles.'
    },
    'Emotional Intelligence': {
      high: 'High emotional intelligence. Self-aware and empathetic.',
      medium: 'Moderate emotional awareness. May struggle with complex dynamics.',
      low: 'Poor emotional intelligence. Challenges with interpersonal relationships.'
    },
    'Ethics & Integrity': {
      high: 'Strong ethical foundation. Trustworthy and principled.',
      medium: 'Adequate ethical awareness. May need guidance in complex situations.',
      low: 'Ethical concerns. Requires clear boundaries and supervision.'
    },
    'Cultural & Attitudinal Fit': {
      high: 'Strong cultural alignment. Embodies company values.',
      medium: 'Moderate cultural fit. Some areas need attention.',
      low: 'Poor cultural fit. Significant misalignment.'
    },
    'Personality & Behavioral': {
      high: 'Stable, resilient, and adaptable. Positive work patterns.',
      medium: 'Moderate behavioral patterns. May have some inconsistencies.',
      low: 'Behavioral concerns. May struggle under pressure.'
    },
    'Technical & Manufacturing': {
      high: 'Strong technical expertise. Deep understanding of systems.',
      medium: 'Moderate technical skills. Needs training in advanced areas.',
      low: 'Weak domain expertise. Requires significant training.'
    },
    'Performance Metrics': {
      high: 'Results-driven with strong accountability.',
      medium: 'Adequate performance focus. Needs guidance on goal setting.',
      low: 'Performance concerns. Inconsistent delivery.'
    },
    'Work Pace': {
      high: 'Highly productive and efficient.',
      medium: 'Moderate productivity. May need support during peak periods.',
      low: 'Slow work pace. Struggles with deadlines.'
    },
    'Integrity': {
      high: 'Strong ethical foundation. Trustworthy and principled.',
      medium: 'Adequate integrity. Follows rules when clear.',
      low: 'Integrity concerns. Requires boundaries.'
    },
    'Motivations': {
      high: 'Highly motivated and driven. Seeks challenges.',
      medium: 'Moderate motivation. May need external motivation.',
      low: 'Poor motivation. Shows little initiative.'
    },
    'Neuroticism': {
      high: 'High emotional stability. Remains calm under pressure.',
      medium: 'Moderate emotional stability. May show signs of stress.',
      low: 'Poor emotional stability. Struggles with pressure.'
    },
    'Extraversion': {
      high: 'Highly extraverted. Energized by social interaction.',
      medium: 'Moderate extraversion. Comfortable in most social situations.',
      low: 'Prefers independent work. May find social interaction draining.'
    },
    'Mixed Traits': {
      high: 'Well-integrated personality traits.',
      medium: 'Moderately integrated traits.',
      low: 'Some inconsistency in personality expression.'
    },
    'Agreeableness': {
      high: 'Highly agreeable. Cooperative and compassionate.',
      medium: 'Moderately agreeable. Generally cooperative.',
      low: 'Low agreeableness. May be perceived as challenging.'
    },
    'Behavioral Style': {
      high: 'Highly effective behavioral patterns.',
      medium: 'Moderately effective behavioral patterns.',
      low: 'Ineffective behavioral patterns needing attention.'
    },
    'Conscientiousness': {
      high: 'Highly conscientious. Organized and dependable.',
      medium: 'Moderately conscientious. Generally reliable.',
      low: 'Low conscientiousness. Inconsistent reliability.'
    },
    'Stress Management': {
      high: 'Excellent stress management. Thrives under pressure.',
      medium: 'Moderate stress management. May struggle under intense pressure.',
      low: 'Poor stress management. Easily overwhelmed.'
    },
    'Openness to Experience': {
      high: 'Highly open to new experiences. Creative and curious.',
      medium: 'Moderately open. Receptive to new ideas.',
      low: 'Low openness. Prefers familiar approaches.'
    }
  };

  const categoryFeedback = baseFeedback[categoryName];
  if (!categoryFeedback) {
    if (percentage >= 70) return 'Strong performance in this area.';
    if (percentage >= 50) return 'Shows basic competency with room for improvement.';
    return 'Significant development needed in this area.';
  }

  if (percentage >= 70) return categoryFeedback.high;
  if (percentage >= 50) return categoryFeedback.medium;
  return categoryFeedback.low;
};

const getStrengthDescription = (categoryName, percentage, assessmentType) => {
  return `Strong performance at ${percentage}%. This is a valuable asset that can be leveraged while working on development areas.`;
};

const getDevelopmentPriorityDescription = (categoryName, percentage, assessmentType) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current score is ${percentage}%. Need to improve by ${gap}% to reach target proficiency of 80%. ${getCategorySpecificFeedback(categoryName, percentage)}`;
};

const getRiskDescription = (categoryName, percentage, assessmentType) => {
  if (percentage < 40) return `Critical deficiency that will significantly impact performance. Requires immediate intervention.`;
  if (percentage < 50) return `Significant gap that needs urgent attention in this area.`;
  return `Below expected levels. Should be prioritized for development.`;
};

const getDevelopmentActions = (categoryName, percentage, assessmentType) => {
  const actions = {
    'Verbal Reasoning': [
      'Complete daily reading comprehension exercises',
      'Practice summarizing complex texts',
      'Use vocabulary building apps',
      'Join a book club or discussion group'
    ],
    'Numerical Reasoning': [
      'Practice basic math operations daily',
      'Work through numerical reasoning workbooks',
      'Use online math tutorial platforms',
      'Apply math to real-world scenarios'
    ],
    'Logical / Abstract Reasoning': [
      'Solve logic puzzles and brain teasers daily',
      'Practice pattern recognition exercises',
      'Work through case studies with a mentor',
      'Use structured problem-solving frameworks'
    ],
    'Spatial Reasoning': [
      'Practice with spatial puzzles (tangrams, jigsaw)',
      'Work with 3D modeling software',
      'Practice reading and creating diagrams',
      'Engage in activities like origami or building'
    ],
    'Memory & Attention': [
      'Use memory techniques (chunking, association)',
      'Practice mindfulness and focus exercises',
      'Take notes and review regularly',
      'Use checklists for detailed tasks'
    ],
    'Mechanical Reasoning': [
      'Study basic mechanical principles',
      'Work on hands-on projects',
      'Shadow experienced technicians',
      'Watch educational videos on mechanical systems'
    ],
    'Perceptual Speed & Accuracy': [
      'Practice speed-accuracy drills',
      'Use visual scanning exercises',
      'Work on detail-oriented tasks with timers',
      'Double-check work systematically'
    ],
    'Cognitive Ability': [
      'Engage in critical thinking exercises',
      'Practice analytical problem-solving',
      'Work through case studies',
      'Take online courses in logical thinking'
    ],
    'Communication': [
      'Join Toastmasters or similar groups',
      'Practice presentations with feedback',
      'Take business writing courses',
      'Seek opportunities to lead meetings'
    ],
    'Problem-Solving': [
      'Learn structured problem-solving frameworks',
      'Practice with real-world case studies',
      'Participate in brainstorming sessions',
      'Work on cross-functional projects'
    ],
    'Leadership & Management': [
      'Take leadership fundamentals courses',
      'Seek mentorship from experienced leaders',
      'Volunteer for team lead roles',
      'Practice delegation and feedback'
    ],
    'Emotional Intelligence': [
      'Participate in EI workshops',
      'Practice active listening daily',
      'Seek feedback on interpersonal interactions',
      'Reflect on emotional responses'
    ],
    'Ethics & Integrity': [
      'Review company values and ethics policies',
      'Discuss ethical dilemmas with supervisor',
      'Participate in ethics training',
      'Practice transparent communication'
    ],
    'Cultural & Attitudinal Fit': [
      'Participate in company culture events',
      'Seek feedback on cultural alignment',
      'Learn about organizational values',
      'Engage with diverse team members'
    ],
    'Personality & Behavioral': [
      'Work with a coach on professional presence',
      'Practice adaptability in different situations',
      'Seek regular feedback on behavior',
      'Develop stress management techniques'
    ],
    'Technical & Manufacturing': [
      'Complete foundational technical training',
      'Shadow experienced technicians',
      'Practice hands-on skills',
      'Create a skill development plan'
    ],
    'Performance Metrics': [
      'Set SMART goals and track progress',
      'Learn performance management frameworks',
      'Practice self-assessment',
      'Review performance data regularly'
    ],
    'Work Pace': [
      'Use time management tools',
      'Practice prioritization techniques',
      'Break large tasks into smaller chunks',
      'Set daily productivity goals'
    ],
    'Integrity': [
      'Review ethical guidelines',
      'Discuss values with mentor',
      'Practice transparent communication',
      'Reflect on decision-making process'
    ],
    'Motivations': [
      'Connect tasks to larger goals',
      'Set personal achievement targets',
      'Find a mentor for guidance',
      'Identify intrinsic motivators'
    ],
    'Neuroticism': [
      'Practice stress-reduction techniques',
      'Develop predictable routines',
      'Build a support network',
      'Learn cognitive reframing'
    ],
    'Extraversion': [
      'Practice one-on-one interactions',
      'Prepare for social situations',
      'Join team activities gradually',
      'Find balance between social and solo work'
    ],
    'Mixed Traits': [
      'Work with a coach on behavioral flexibility',
      'Observe and learn from different styles',
      'Practice adapting to situations',
      'Seek feedback on interactions'
    ],
    'Agreeableness': [
      'Practice assertiveness techniques',
      'Learn to set healthy boundaries',
      'Role-play difficult conversations',
      'Balance cooperation with self-advocacy'
    ],
    'Behavioral Style': [
      'Identify behavioral triggers',
      'Practice self-monitoring',
      'Seek regular feedback',
      'Develop alternative responses'
    ],
    'Conscientiousness': [
      'Use organizational tools',
      'Create detailed checklists',
      'Set up accountability partnerships',
      'Break commitments into smaller steps'
    ],
    'Stress Management': [
      'Learn stress reduction techniques',
      'Establish work-life boundaries',
      'Practice mindfulness daily',
      'Develop a stress management plan'
    ],
    'Openness to Experience': [
      'Try new approaches to tasks',
      'Learn about one new topic weekly',
      'Volunteer for innovative projects',
      'Embrace small changes gradually'
    ]
  };

  const defaultActions = [
    'Complete targeted training in this area',
    'Work with a mentor for guided development',
    'Practice skills through practical applications',
    'Set specific improvement goals with weekly check-ins',
    'Use online resources and learning platforms',
    'Track progress and adjust approach as needed'
  ];

  return actions[categoryName] || defaultActions.slice(0, 4);
};
