/**
 * COMPETENCY SCORING ENGINE
 * Builds on your existing section-based scoring to add competency-based insights
 */

import { stratavaxClassification } from './stratavaxReportGenerator';

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
  'personality': {
    'Emotional Intelligence': 1.3,
    'Adaptability': 1.1,
    'Cultural Fit': 1.2,
    'Accountability': 1.0,
    'Collaboration': 1.1,
    'Integrity': 1.2
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

// Classification thresholds (matches your stratavax classification)
export const competencyClassification = (percentage) => {
  if (percentage >= 80) return 'Strong';
  if (percentage >= 55) return 'Moderate';
  return 'Needs Development';
};

/**
 * Calculate competency scores from responses
 * @param {Array} responses - The responses array with question and answer details
 * @param {Array} questionCompetencies - Question-competency mappings from database
 * @param {string} assessmentType - The assessment type code
 * @returns {Object} Competency scores with details
 */
export function calculateCompetencyScores(responses, questionCompetencies, assessmentType = 'general') {
  const competencyScores = {};
  const competencyMaxScores = {};
  const competencyQuestionCount = {};
  const competencyQuestions = {};

  // Initialize with weights from assessment type
  const weights = assessmentCompetencyWeights[assessmentType] || assessmentCompetencyWeights.general;

  // Group responses by competency
  responses.forEach(response => {
    const questionId = response.question_id;
    const score = response.unique_answers?.score || 0;
    const maxScore = 5; // Assuming 5 points per question (standard in your system)

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
          questions: [],
          weightedScore: 0,
          assessmentWeight
        };
        competencyMaxScores[competencyId] = 0;
        competencyQuestionCount[competencyId] = 0;
        competencyQuestions[competencyId] = [];
      }

      // Add weighted scores
      competencyScores[competencyId].totalScore += score * combinedWeight;
      competencyScores[competencyId].maxPossible += maxScore * combinedWeight;
      competencyScores[competencyId].questionCount += 1;
      
      // Track questions for this competency
      competencyScores[competencyId].questions.push({
        questionId,
        score,
        maxScore,
        weight: combinedWeight,
        section: response.unique_questions?.section,
        questionText: response.unique_questions?.question_text?.substring(0, 50)
      });
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
      classification: competencyClassification(roundedPercentage),
      questions: comp.questions.slice(0, 5) // Store first 5 questions for reference
    };
  });

  return results;
}

/**
 * Get top strengths based on competency scores
 * @param {Object} competencyResults - Results from calculateCompetencyScores
 * @param {number} limit - Number of strengths to return
 * @returns {Array} Top strengths
 */
export function getTopStrengths(competencyResults, limit = 3) {
  return Object.values(competencyResults)
    .filter(c => c.classification === 'Strong')
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
    .map(c => ({
      competency: c.name,
      percentage: c.percentage,
      description: `Strong performance in ${c.name}`
    }));
}

/**
 * Get top development needs based on competency scores
 * @param {Object} competencyResults - Results from calculateCompetencyScores
 * @param {number} limit - Number of development needs to return
 * @returns {Array} Top development needs
 */
export function getTopDevelopmentNeeds(competencyResults, limit = 3) {
  return Object.values(competencyResults)
    .filter(c => c.classification === 'Needs Development')
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, limit)
    .map(c => ({
      competency: c.name,
      percentage: c.percentage,
      gap: (80 - c.percentage).toFixed(1), // Gap to reach "Strong" threshold
      description: `Development needed in ${c.name}`
    }));
}

/**
 * Generate competency narrative for reports
 * @param {Object} competencyResults - Results from calculateCompetencyScores
 * @param {string} assessmentType - Assessment type code
 * @returns {Object} Narratives for strengths and weaknesses
 */
export function generateCompetencyNarrative(competencyResults, assessmentType = 'general') {
  const strengths = getTopStrengths(competencyResults);
  const developmentNeeds = getTopDevelopmentNeeds(competencyResults);
  
  const strengthAreas = strengths.map(s => s.competency).join(', ');
  const developmentAreas = developmentNeeds.map(d => d.competency).join(', ');
  
  // Dynamic narrative templates
  const strengthTemplates = [
    `The candidate demonstrates exceptional capability in ${strengthAreas}.`,
    `Key competencies include ${strengthAreas}, where performance exceeds expectations.`,
    `Notable strengths emerge in ${strengthAreas}, indicating natural aptitude.`,
    `Performance is strongest in ${strengthAreas}, showing developed expertise.`,
    `Areas of proficiency include ${strengthAreas}, where scores are notably high.`
  ];
  
  const developmentTemplates = [
    `Priority development areas include ${developmentAreas}.`,
    `Focus should be directed toward developing ${developmentAreas}.`,
    `Opportunities for growth exist in ${developmentAreas}.`,
    `Attention is needed in ${developmentAreas} to strengthen overall capability.`,
    `Development planning should prioritize ${developmentAreas}.`
  ];
  
  const combinedTemplates = [
    `The candidate shows strength in ${strengthAreas}, while ${developmentAreas} would benefit from focused development.`,
    `With demonstrated capability in ${strengthAreas}, attention should now turn to developing ${developmentAreas}.`,
    `${strengthAreas} are clear strengths; development efforts should target ${developmentAreas}.`,
    `While ${strengthAreas} are well-developed, ${developmentAreas} represent growth opportunities.`
  ];
  
  const randomIndex = (arr) => Math.floor(Math.random() * arr.length);
  
  let strengthsNarrative = '';
  let developmentNarrative = '';
  let combinedNarrative = '';
  
  if (strengths.length > 0) {
    strengthsNarrative = strengthTemplates[randomIndex(strengthTemplates)];
  }
  
  if (developmentNeeds.length > 0) {
    developmentNarrative = developmentTemplates[randomIndex(developmentTemplates)];
  }
  
  if (strengths.length > 0 && developmentNeeds.length > 0) {
    combinedNarrative = combinedTemplates[randomIndex(combinedTemplates)];
  } else if (strengths.length > 0) {
    combinedNarrative = strengthsNarrative;
  } else if (developmentNeeds.length > 0) {
    combinedNarrative = developmentNarrative;
  } else {
    combinedNarrative = 'Performance is balanced across all competencies.';
  }
  
  return {
    strengths: strengths,
    developmentNeeds: developmentNeeds,
    strengthsNarrative,
    developmentNarrative,
    combinedNarrative
  };
}

/**
 * Calculate overall competency score (weighted average of all competencies)
 * @param {Object} competencyResults - Results from calculateCompetencyScores
 * @returns {Object} Overall score and classification
 */
export function calculateOverallCompetencyScore(competencyResults) {
  const competencies = Object.values(competencyResults);
  
  if (competencies.length === 0) {
    return {
      overallScore: 0,
      classification: 'Needs Development',
      competencyCount: 0
    };
  }
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  competencies.forEach(comp => {
    totalWeightedScore += comp.percentage * comp.assessmentWeight;
    totalWeight += comp.assessmentWeight;
  });
  
  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const roundedScore = Math.round(overallScore * 100) / 100;
  
  // Use stratavax classification for consistency
  const classification = stratavaxClassification(roundedScore);
  
  return {
    overallScore: roundedScore,
    classification: classification.label,
    classificationDetails: classification,
    competencyCount: competencies.length
  };
}

/**
 * Generate competency-based development recommendations
 * @param {Object} competencyResults - Results from calculateCompetencyScores
 * @returns {Array} Structured recommendations
 */
export function generateCompetencyRecommendations(competencyResults) {
  const recommendations = [];
  const developmentNeeds = getTopDevelopmentNeeds(competencyResults, 5);
  
  // Development recommendation library
  const recommendationLibrary = {
    'Strategic Thinking': [
      'Take a course on strategic planning and execution',
      'Practice scenario planning exercises weekly',
      'Read "Good Strategy Bad Strategy" by Richard Rumelt',
      'Shadow senior leaders during strategic planning sessions',
      'Lead a small strategic initiative within your team'
    ],
    'Emotional Intelligence': [
      'Complete a 360-degree feedback assessment',
      'Practice active listening in all conversations',
      'Keep an emotion journal for 30 days',
      'Take an online course on emotional intelligence',
      'Seek feedback on your interpersonal interactions'
    ],
    'Decision Making': [
      'Use decision matrices for all major choices',
      'Study decision-making frameworks (DECIDE model, etc.)',
      'Practice risk assessment with case studies',
      'Document your decision process for later review',
      'Participate in root cause analysis exercises'
    ],
    'Communication': [
      'Take a business writing or public speaking course',
      'Join Toastmasters or similar group',
      'Practice presenting to small groups weekly',
      'Ask for feedback on your communications',
      'Write summaries of complex topics for practice'
    ],
    'Adaptability': [
      'Volunteer for cross-functional projects',
      'Learn a new skill outside your comfort zone',
      'Practice reframing challenges as opportunities',
      'Study change management methodologies',
      'Take on stretch assignments in new areas'
    ],
    'Accountability': [
      'Set public goals and track progress',
      'Volunteer for task ownership on projects',
      'Use project management tools consistently',
      'Practice saying "I will handle it"',
      'Document and share lessons learned'
    ],
    'Cognitive Ability': [
      'Practice logic puzzles and brain teasers',
      'Take online courses in critical thinking',
      'Read books on problem-solving methodologies',
      'Engage in strategic games (chess, etc.)',
      'Learn a new analytical tool or technique'
    ],
    'Technical Knowledge': [
      'Take technical courses relevant to your field',
      'Pursue relevant certifications',
      'Work on hands-on projects to apply knowledge',
      'Join professional communities and forums',
      'Stay updated with industry trends and best practices'
    ],
    'Cultural Fit': [
      'Learn about company values and mission',
      'Participate in team-building activities',
      'Understand organizational culture better',
      'Align personal goals with company goals',
      'Champion company values in daily work'
    ],
    'Integrity': [
      'Study ethical decision-making frameworks',
      'Practice transparency in communications',
      'Seek feedback on ethical considerations',
      'Read case studies on business ethics',
      'Model integrity in all interactions'
    ],
    'Collaboration': [
      'Seek opportunities for team projects',
      'Practice active listening and empathy',
      'Offer help to colleagues proactively',
      'Participate in cross-functional initiatives',
      'Build relationships outside your immediate team'
    ],
    'Resilience': [
      'Practice stress management techniques',
      'Develop a support network',
      'Learn from setbacks and failures',
      'Maintain work-life balance',
      'Build mindfulness practices'
    ],
    'Vision': [
      'Study your organization\'s long-term strategy',
      'Practice articulating future possibilities',
      'Read books on visionary leadership',
      'Develop a personal vision statement',
      'Share your ideas for the future with others'
    ],
    'Execution': [
      'Use project management methodologies',
      'Set SMART goals and track progress',
      'Break large projects into manageable tasks',
      'Celebrate small wins along the way',
      'Review and learn from completed projects'
    ],
    'People Management': [
      'Seek opportunities to mentor others',
      'Take a course on people management',
      'Practice giving constructive feedback',
      'Learn about different leadership styles',
      'Ask for feedback on your management approach'
    ]
  };
  
  developmentNeeds.forEach(need => {
    const competency = need.competency;
    const options = recommendationLibrary[competency] || [
      `Focus on developing ${competency} through targeted training and practice`,
      `Seek opportunities to apply and strengthen ${competency}`,
      `Work with a mentor to develop ${competency} skills`,
      `Complete relevant coursework in ${competency}`,
      `Practice ${competency} in daily work situations`
    ];
    
    // Pick a random recommendation
    const recommendation = options[Math.floor(Math.random() * options.length)];
    
    recommendations.push({
      priority: 'High',
      competency,
      currentScore: need.percentage,
      gap: need.gap,
      recommendation,
      action: `Focus on ${competency} development over the next 30-60 days`,
      impact: `Improving ${competency} will enhance overall performance and readiness`
    });
  });
  
  return recommendations;
}
