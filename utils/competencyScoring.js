/**
 * COMPETENCY SCORING ENGINE
 * For MCQ-based assessments with different scoring per assessment type
 */

// Default competency weights per assessment type
export const assessmentCompetencyWeights = {
  'leadership': {
    'Strategic Thinking': 1.3,
    'Emotional Intelligence': 1.2,
    'Decision Making': 1.3,
    'Communication': 1.1,
    'People Management': 1.3,
    'Vision': 1.2,
    'Execution': 1.1,
    'Resilience': 1.0,
    'Adaptability': 1.0,
    'Accountability': 1.1
  },
  'cognitive': {
    'Cognitive Ability': 1.5,
    'Decision Making': 1.2,
    'Problem Solving': 1.3,
    'Learning Agility': 1.1
  },
  'technical': {
    'Technical Knowledge': 1.5,
    'Cognitive Ability': 1.0,
    'Problem Solving': 1.2,
    'Execution': 1.1
  },
  // UPDATED: Personality assessment with 6 new traits
  'personality': {
    'Ownership': 1.3,
    'Collaboration': 1.2,
    'Action': 1.2,
    'Analysis': 1.3,
    'Risk Tolerance': 1.1,
    'Structure': 1.0
  },
  // NEW: Strategic Leadership Assessment with 7 dimensions
  'strategic_leadership': {
    'Vision / Strategy': 1.4,
    'People Leadership': 1.3,
    'Decision Making': 1.3,
    'Accountability': 1.2,
    'Emotional Intelligence': 1.2,
    'Execution Drive': 1.3,
    'Ethics': 1.4
  },
  'performance': {
    'Accountability': 1.3,
    'Execution': 1.3,
    'Communication': 1.0,
    'Strategic Thinking': 1.1,
    'Decision Making': 1.2,
    'People Management': 1.0
  },
  'behavioral': {
    'Communication': 1.2,
    'Collaboration': 1.3,
    'Emotional Intelligence': 1.2,
    'Adaptability': 1.1,
    'Integrity': 1.1,
    'Cultural Fit': 1.0
  },
  'cultural': {
    'Cultural Fit': 1.5,
    'Integrity': 1.2,
    'Collaboration': 1.2,
    'Adaptability': 1.1,
    'Emotional Intelligence': 1.0
  },
  'general': {
    'Cognitive Ability': 1.2,
    'Communication': 1.1,
    'Adaptability': 1.0,
    'Accountability': 1.1,
    'Integrity': 1.1,
    'Collaboration': 1.0
  }
};

// Classification thresholds
export const competencyClassification = (percentage) => {
  if (percentage >= 80) return 'Strong';
  if (percentage >= 55) return 'Moderate';
  return 'Needs Development';
};

/**
 * Calculate competency scores from responses
 */
export function calculateCompetencyScores(responses, questionCompetencies, assessmentType = 'general') {
  const competencyScores = {};

  // Initialize with weights from assessment type
  const weights = assessmentCompetencyWeights[assessmentType] || assessmentCompetencyWeights.general;

  // Group responses by competency
  responses.forEach(response => {
    const questionId = response.question_id;
    const score = response.unique_answers?.score || 0;
    const maxScore = 5; // 5 points per question

    // Find competencies for this question
    const qCompetencies = questionCompetencies.filter(qc => qc.question_id === questionId);

    qCompetencies.forEach(qc => {
      const competencyId = qc.competency_id;
      const competencyName = qc.competencies?.name || 'Unknown';
      const questionWeight = qc.weight || 1.0;
      
      // Get assessment weight for this competency
      const assessmentWeight = weights[competencyName] || 1.0;
      
      // Combined weight
      const combinedWeight = questionWeight * assessmentWeight;

      if (!competencyScores[competencyId]) {
        competencyScores[competencyId] = {
          id: competencyId,
          name: competencyName,
          totalScore: 0,
          maxPossible: 0,
          questionCount: 0,
          assessmentWeight
        };
      }

      // Add weighted scores
      competencyScores[competencyId].totalScore += score * combinedWeight;
      competencyScores[competencyId].maxPossible += maxScore * combinedWeight;
      competencyScores[competencyId].questionCount += 1;
    });
  });

  // Calculate percentages and classifications
  const results = {};
  Object.keys(competencyScores).forEach(compId => {
    const comp = competencyScores[compId];
    const percentage = comp.maxPossible > 0 
      ? (comp.totalScore / comp.maxPossible) * 100 
      : 0;
    
    const roundedPercentage = Math.round(percentage * 100) / 100;
    
    results[compId] = {
      id: compId,
      name: comp.name,
      rawScore: comp.totalScore,
      maxPossible: comp.maxPossible,
      percentage: roundedPercentage,
      questionCount: comp.questionCount,
      assessmentWeight: comp.assessmentWeight,
      classification: competencyClassification(roundedPercentage)
    };
  });

  return results;
}

/**
 * Generate competency-based development recommendations
 */
export function generateCompetencyRecommendations(competencyResults) {
  const recommendations = [];
  
  // Get competencies that need development (below 80%)
  const developmentNeeds = Object.values(competencyResults)
    .filter(c => c.classification !== 'Strong')
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);
  
  // Development recommendation library
  const recommendationLibrary = {
    'Strategic Thinking': [
      'Take a course on strategic planning and execution',
      'Practice scenario planning exercises weekly',
      'Shadow senior leaders during strategic planning sessions'
    ],
    'Emotional Intelligence': [
      'Complete a 360-degree feedback assessment',
      'Practice active listening in all conversations',
      'Keep an emotion journal for 30 days'
    ],
    'Decision Making': [
      'Use decision matrices for all major choices',
      'Study decision-making frameworks',
      'Practice risk assessment with case studies'
    ],
    'Communication': [
      'Take a business writing or public speaking course',
      'Join Toastmasters or similar group',
      'Practice presenting to small groups weekly'
    ],
    'Adaptability': [
      'Volunteer for cross-functional projects',
      'Learn a new skill outside your comfort zone',
      'Practice reframing challenges as opportunities'
    ],
    'Accountability': [
      'Set public goals and track progress',
      'Volunteer for task ownership on projects',
      'Use project management tools consistently'
    ],
    'Cognitive Ability': [
      'Practice logic puzzles and brain teasers',
      'Take online courses in critical thinking',
      'Read books on problem-solving methodologies'
    ],
    'Technical Knowledge': [
      'Take technical courses relevant to your field',
      'Pursue relevant certifications',
      'Work on hands-on projects to apply knowledge'
    ],
    'Cultural Fit': [
      'Learn about company values and mission',
      'Participate in team-building activities',
      'Understand organizational culture better'
    ],
    'Integrity': [
      'Study ethical decision-making frameworks',
      'Practice transparency in communications',
      'Model integrity in all interactions'
    ],
    'Collaboration': [
      'Seek opportunities for team projects',
      'Practice active listening and empathy',
      'Participate in cross-functional initiatives'
    ],
    'Resilience': [
      'Practice stress management techniques',
      'Develop a support network',
      'Learn from setbacks and failures'
    ],
    'Vision': [
      'Study your organization\'s long-term strategy',
      'Practice articulating future possibilities',
      'Develop a personal vision statement'
    ],
    'Execution': [
      'Use project management methodologies',
      'Set SMART goals and track progress',
      'Break large projects into manageable tasks'
    ],
    'People Management': [
      'Seek opportunities to mentor others',
      'Take a course on people management',
      'Practice giving constructive feedback'
    ],
    // NEW: Personality trait recommendations
    'Ownership': [
      'Take initiative on projects without being asked',
      'Volunteer to lead a small team initiative',
      'Practice owning mistakes and presenting lessons learned',
      'Set personal goals and track progress publicly'
    ],
    'Action': [
      'Practice making decisions with 80% of the information',
      'Set time limits for decision-making',
      'Volunteer for time-sensitive projects',
      'Create action plans with clear deadlines'
    ],
    'Analysis': [
      'Take a course in data analysis or critical thinking',
      'Practice using decision matrices for important choices',
      'Create structured problem-solving templates',
      'Study root cause analysis methodologies'
    ],
    'Risk Tolerance': [
      'Volunteer for pilot projects or experimental initiatives',
      'Practice evaluating risks using structured frameworks',
      'Participate in innovation workshops',
      'Learn about calculated risk-taking in business contexts'
    ],
    'Structure': [
      'Create personal work templates and processes',
      'Study project management methodologies',
      'Practice documenting procedures for repeatable tasks',
      'Implement a personal organization system'
    ],
    // NEW: Strategic Leadership dimension recommendations
    'Vision / Strategy': [
      'Complete a strategic management certification program',
      'Practice writing strategic memos and business cases',
      'Participate in industry trend analysis exercises',
      'Shadow senior leaders during strategic planning sessions',
      'Read books on strategic thinking and competitive strategy'
    ],
    'People Leadership': [
      'Take a leadership development program',
      'Practice coaching conversations with team members',
      'Lead a cross-functional team initiative',
      'Complete 360-degree feedback and create action plan',
      'Mentor junior colleagues or new team members'
    ],
    'Decision Making': [
      'Study decision science and cognitive bias frameworks',
      'Practice making decisions with limited information',
      'Lead complex problem-solving workshops',
      'Develop a personal decision-making framework',
      'Analyze past decisions to identify improvement areas'
    ],
    'Accountability': [
      'Take ownership of a high-visibility project',
      'Create accountability systems for team initiatives',
      'Practice transparent reporting of outcomes',
      'Lead post-mortem analysis sessions',
      'Set personal accountability goals with regular check-ins'
    ],
    'Emotional Intelligence': [
      'Complete an emotional intelligence assessment',
      'Practice empathy mapping and perspective-taking',
      'Lead conflict resolution sessions',
      'Develop self-regulation techniques',
      'Seek feedback on interpersonal effectiveness'
    ],
    'Execution Drive': [
      'Learn agile and project management methodologies',
      'Lead time-sensitive initiatives with aggressive deadlines',
      'Create and track execution metrics',
      'Develop systems to overcome execution obstacles',
      'Practice breaking large projects into milestone-based deliverables'
    ],
    'Ethics': [
      'Complete ethics and compliance certification',
      'Participate in ethical dilemma workshops',
      'Create an ethical decision-making framework',
      'Lead by example in ethical conduct',
      'Study case studies of ethical leadership'
    ]
  };
  
  developmentNeeds.forEach(need => {
    const competency = need.name;
    const options = recommendationLibrary[competency] || [
      `Focus on developing ${competency} through targeted training and practice`,
      `Seek opportunities to apply and strengthen ${competency}`,
      `Work with a mentor to develop ${competency} skills`
    ];
    
    // Pick a random recommendation
    const recommendation = options[Math.floor(Math.random() * options.length)];
    
    recommendations.push({
      priority: need.percentage < 55 ? 'High' : 'Medium',
      competency,
      currentScore: need.percentage,
      recommendation,
      action: `Focus on ${competency} development over the next 30-60 days`,
      impact: `Improving ${competency} will enhance overall performance`
    });
  });
  
  return recommendations;
}
