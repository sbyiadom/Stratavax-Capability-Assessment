/**
 * COMPETENCY SCORING ENGINE
 * Enhanced with behavioral analytics integration and comprehensive recommendations
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
  'personality': {
    'Ownership': 1.3,
    'Collaboration': 1.2,
    'Action': 1.2,
    'Analysis': 1.3,
    'Risk Tolerance': 1.1,
    'Structure': 1.0
  },
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
  if (percentage >= 65) return 'Proficient';
  if (percentage >= 50) return 'Developing';
  return 'Needs Development';
};

/**
 * Calculate competency scores from responses with weighted scoring
 */
export function calculateCompetencyScores(responses, questionCompetencies, assessmentType = 'general') {
  console.log("🧠 Calculating competency scores for", assessmentType);
  
  if (!responses || responses.length === 0) {
    console.log("⚠️ No responses provided for competency scoring");
    return {};
  }
  
  if (!questionCompetencies || questionCompetencies.length === 0) {
    console.log("⚠️ No question-competency mappings found");
    return {};
  }
  
  const competencyScores = {};
  const weights = assessmentCompetencyWeights[assessmentType] || assessmentCompetencyWeights.general;

  // Group responses by competency
  responses.forEach(response => {
    const questionId = response.question_id;
    const score = response.unique_answers?.score || 0;
    const maxScore = 5;
    const timeSpent = response.time_spent_seconds || 0;
    const timesChanged = response.times_changed || 0;

    // Find competencies for this question
    const qCompetencies = questionCompetencies.filter(qc => qc.question_id === questionId);

    qCompetencies.forEach(qc => {
      const competencyId = qc.competency_id;
      const competencyName = qc.competencies?.name || 'Unknown';
      const questionWeight = qc.weight || 1.0;
      
      const assessmentWeight = weights[competencyName] || 1.0;
      const combinedWeight = questionWeight * assessmentWeight;

      if (!competencyScores[competencyId]) {
        competencyScores[competencyId] = {
          id: competencyId,
          name: competencyName,
          totalScore: 0,
          maxPossible: 0,
          questionCount: 0,
          assessmentWeight,
          // Behavioral metrics per competency
          totalTimeSpent: 0,
          totalChanges: 0,
          responses: []
        };
      }

      competencyScores[competencyId].totalScore += score * combinedWeight;
      competencyScores[competencyId].maxPossible += maxScore * combinedWeight;
      competencyScores[competencyId].questionCount += 1;
      competencyScores[competencyId].totalTimeSpent += timeSpent;
      competencyScores[competencyId].totalChanges += timesChanged;
      competencyScores[competencyId].responses.push({
        question_id: response.question_id,
        score: score,
        time_spent: timeSpent,
        changed: timesChanged > 0,
        answer_text: response.unique_answers?.answer_text,
        question_text: response.unique_questions?.question_text
      });
    });
  });

  // Calculate percentages and classifications with behavioral insights
  const results = {};
  Object.keys(competencyScores).forEach(compId => {
    const comp = competencyScores[compId];
    const percentage = comp.maxPossible > 0 
      ? (comp.totalScore / comp.maxPossible) * 100 
      : 0;
    
    const roundedPercentage = Math.round(percentage * 100) / 100;
    const avgTimePerQuestion = comp.questionCount > 0 ? comp.totalTimeSpent / comp.questionCount : 0;
    const avgChangesPerQuestion = comp.questionCount > 0 ? comp.totalChanges / comp.questionCount : 0;
    
    results[compId] = {
      id: compId,
      name: comp.name,
      rawScore: comp.totalScore,
      maxPossible: comp.maxPossible,
      percentage: roundedPercentage,
      questionCount: comp.questionCount,
      assessmentWeight: comp.assessmentWeight,
      classification: competencyClassification(roundedPercentage),
      // Behavioral metrics
      behavioral: {
        totalTimeSpent: comp.totalTimeSpent,
        avgTimePerQuestion: Math.round(avgTimePerQuestion),
        totalChanges: comp.totalChanges,
        avgChangesPerQuestion: Math.round(avgChangesPerQuestion * 100) / 100,
        responses: comp.responses
      },
      gapToTarget: Math.max(0, 80 - roundedPercentage)
    };
  });

  console.log(`✅ Calculated scores for ${Object.keys(results).length} competencies`);
  return results;
}

/**
 * Generate enhanced competency-based development recommendations
 * Now includes behavioral insights integration
 */
export function generateCompetencyRecommendations(competencyResults, behavioralMetrics = null) {
  if (!competencyResults || Object.keys(competencyResults).length === 0) {
    return [];
  }
  
  const recommendations = [];
  
  // Get competencies that need development (below 80%)
  const developmentNeeds = Object.values(competencyResults)
    .filter(c => c.classification !== 'Strong')
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);
  
  // Enhanced recommendation library with behavioral integration
  const recommendationLibrary = {
    'Strategic Thinking': {
      critical: [
        'Take a strategic management certification program',
        'Practice writing strategic memos and business cases',
        'Participate in industry trend analysis exercises',
        'Shadow senior leaders during strategic planning sessions'
      ],
      developing: [
        'Start with basic strategic frameworks (SWOT, PESTEL, Porter\'s Five Forces)',
        'Read "Good Strategy Bad Strategy" by Richard Rumelt',
        'Practice strategic thinking with case studies',
        'Attend strategy workshops and seminars'
      ],
      proficient: [
        'Lead strategic initiatives within your team',
        'Mentor others in strategic thinking',
        'Contribute to department-level strategy discussions',
        'Develop strategic decision-making frameworks'
      ]
    },
    'Emotional Intelligence': {
      critical: [
        'Complete a comprehensive EI assessment and coaching program',
        'Practice daily self-reflection and emotion journaling',
        'Take an interpersonal dynamics course',
        'Work with a coach on empathy and relationship management'
      ],
      developing: [
        'Practice active listening in all conversations',
        'Seek 360-degree feedback on interpersonal skills',
        'Read "Emotional Intelligence 2.0" by Bradberry',
        'Take online EI courses on LinkedIn Learning'
      ],
      proficient: [
        'Lead team-building activities',
        'Mentor others on emotional intelligence',
        'Help resolve team conflicts',
        'Create psychological safety in your team'
      ]
    },
    'Decision Making': {
      critical: [
        'Learn structured decision-making frameworks (RAPID, DACI)',
        'Study cognitive biases and how to avoid them',
        'Practice with business case studies',
        'Take a decision science course'
      ],
      developing: [
        'Use decision matrices for all major choices',
        'Practice making decisions with 80% of information',
        'Seek diverse perspectives before deciding',
        'Track decision outcomes to learn from mistakes'
      ],
      proficient: [
        'Lead complex decision-making processes',
        'Mentor others on decision frameworks',
        'Create decision templates for your team',
        'Facilitate strategic decision workshops'
      ]
    },
    'Communication': {
      critical: [
        'Take intensive business communication courses',
        'Join Toastmasters and practice weekly',
        'Work with a communication coach',
        'Practice presentations with peer feedback'
      ],
      developing: [
        'Take a business writing or public speaking course',
        'Practice active listening techniques',
        'Ask for feedback after presentations',
        'Join a speaking club like Toastmasters'
      ],
      proficient: [
        'Lead important client presentations',
        'Mentor others on communication skills',
        'Represent your team in cross-functional meetings',
        'Write key business communications'
      ]
    },
    'Ownership': {
      critical: [
        'Take initiative on projects without being asked',
        'Volunteer to lead problem-solving efforts',
        'Practice owning mistakes publicly',
        'Set personal accountability metrics'
      ],
      developing: [
        'Take on one extra responsibility per week',
        'Complete tasks without being reminded',
        'Volunteer for challenging assignments',
        'Set and track personal goals'
      ],
      proficient: [
        'Lead key initiatives independently',
        'Mentor others on taking ownership',
        'Drive accountability in your team',
        'Champion continuous improvement'
      ]
    },
    'Action': {
      critical: [
        'Practice making decisions with limited information',
        'Set strict time limits for decision-making',
        'Volunteer for time-sensitive projects',
        'Create action plans with clear deadlines'
      ],
      developing: [
        'Break large tasks into small actionable steps',
        'Set daily completion goals',
        'Use time-blocking techniques',
        'Celebrate task completion'
      ],
      proficient: [
        'Lead fast-paced initiatives',
        'Drive execution in your team',
        'Remove obstacles for others',
        'Create systems for rapid action'
      ]
    },
    'Analysis': {
      critical: [
        'Take advanced data analysis courses',
        'Practice with complex business cases',
        'Learn statistical thinking',
        'Work with a mentor on analytical skills'
      ],
      developing: [
        'Use structured problem-solving frameworks',
        'Practice root cause analysis',
        'Take a critical thinking course',
        'Analyze case studies weekly'
      ],
      proficient: [
        'Lead complex analytical projects',
        'Mentor others on analytical thinking',
        'Create analytical frameworks for your team',
        'Drive data-informed decisions'
      ]
    }
  };
  
  developmentNeeds.forEach(need => {
    const competency = need.name;
    const percentage = need.percentage;
    const behavioral = need.behavioral;
    
    // Determine priority based on score and behavioral patterns
    let priority = 'Medium';
    if (percentage < 50) priority = 'Critical';
    else if (percentage < 60) priority = 'High';
    else if (percentage < 70) priority = 'Medium';
    else priority = 'Low';
    
    // Adjust priority based on behavioral patterns
    if (behavioral && behavioral.avgChangesPerQuestion > 2 && percentage < 70) {
      priority = 'High'; // Changing answers frequently without improvement
    }
    if (behavioral && behavioral.avgTimePerQuestion > 90 && percentage < 70) {
      priority = 'High'; // Spending too much time but still scoring low
    }
    
    // Get recommendations based on proficiency level
    let options = [];
    if (percentage < 50) {
      options = recommendationLibrary[competency]?.critical || [
        `Intensive development needed in ${competency}. Start with foundational training.`,
        `Work with a mentor to build basic ${competency} skills.`,
        `Complete structured learning program for ${competency}.`
      ];
    } else if (percentage < 65) {
      options = recommendationLibrary[competency]?.developing || [
        `Focus on developing ${competency} through targeted training and practice.`,
        `Seek opportunities to apply and strengthen ${competency}.`,
        `Work with a mentor to develop ${competency} skills.`
      ];
    } else {
      options = recommendationLibrary[competency]?.proficient || [
        `Strengthen ${competency} through advanced training and challenging assignments.`,
        `Mentor others to deepen your ${competency} expertise.`,
        `Lead initiatives that require strong ${competency} skills.`
      ];
    }
    
    // Add behavioral insights to recommendation
    let behavioralNote = '';
    if (behavioral && behavioral.avgTimePerQuestion > 60) {
      behavioralNote = ` Note: You spend significant time (${Math.round(behavioral.avgTimePerQuestion)}s avg) on questions in this area. Consider time management strategies.`;
    }
    if (behavioral && behavioral.avgChangesPerQuestion > 1) {
      behavioralNote += ` You also change answers frequently in this area. Practice trusting your first instinct.`;
    }
    
    const recommendation = options[Math.floor(Math.random() * options.length)] + behavioralNote;
    
    recommendations.push({
      priority,
      competency,
      currentScore: percentage,
      gap: need.gapToTarget,
      recommendation,
      action: `Create a 30-60-90 day plan for ${competency} development`,
      impact: `Improving ${competency} from ${percentage}% to 80%+ will enhance overall effectiveness by approximately 15-20%`,
      behavioralInsights: behavioral ? {
        avgTimePerQuestion: behavioral.avgTimePerQuestion,
        totalChanges: behavioral.totalChanges,
        avgChangesPerQuestion: behavioral.avgChangesPerQuestion
      } : null
    });
  });
  
  // Add strength-based recommendations for top 3 competencies
  const strengths = Object.values(competencyResults)
    .filter(c => c.classification === 'Strong')
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);
  
  strengths.forEach(strength => {
    recommendations.push({
      priority: 'Leverage',
      competency: strength.name,
      currentScore: strength.percentage,
      recommendation: `Exceptional strength in ${strength.name} at ${strength.percentage}%. Leverage this by mentoring others and taking on challenging projects.`,
      action: `Take on a mentorship role or lead a key initiative in ${strength.name}`,
      impact: `Using this strength can accelerate team performance and career growth`,
      isStrength: true
    });
  });
  
  return recommendations;
}

/**
 * Get overall competency summary with behavioral context
 */
export const getCompetencySummary = (competencyResults, behavioralMetrics = null) => {
  if (!competencyResults || Object.keys(competencyResults).length === 0) {
    return null;
  }
  
  const competencies = Object.values(competencyResults);
  const strongCount = competencies.filter(c => c.percentage >= 80).length;
  const proficientCount = competencies.filter(c => c.percentage >= 65 && c.percentage < 80).length;
  const developingCount = competencies.filter(c => c.percentage >= 50 && c.percentage < 65).length;
  const needsWorkCount = competencies.filter(c => c.percentage < 50).length;
  const averageScore = competencies.reduce((sum, c) => sum + c.percentage, 0) / competencies.length;
  
  // Calculate behavioral averages across competencies
  const avgTimeAcrossCompetencies = competencies.reduce((sum, c) => sum + (c.behavioral?.avgTimePerQuestion || 0), 0) / competencies.length;
  const avgChangesAcrossCompetencies = competencies.reduce((sum, c) => sum + (c.behavioral?.avgChangesPerQuestion || 0), 0) / competencies.length;
  
  let overallAssessment = '';
  let developmentUrgency = 'Low';
  
  if (averageScore >= 75) {
    overallAssessment = 'Strong competency profile with multiple areas of expertise. Ready for increased responsibility.';
    developmentUrgency = 'Low';
  } else if (averageScore >= 60) {
    overallAssessment = 'Solid competency foundation with clear development opportunities. Targeted growth will accelerate readiness.';
    developmentUrgency = 'Medium';
  } else if (averageScore >= 50) {
    overallAssessment = 'Developing competency profile requiring focused attention on key areas. Structured development plan recommended.';
    developmentUrgency = 'High';
  } else {
    overallAssessment = 'Significant competency development needed across multiple areas. Immediate intervention recommended.';
    developmentUrgency = 'Critical';
  }
  
  // Add behavioral context to assessment
  if (avgTimeAcrossCompetencies > 60) {
    overallAssessment += ' Response times indicate careful analysis, which may benefit from time management strategies.';
  }
  if (avgChangesAcrossCompetencies > 1.5) {
    overallAssessment += ' Frequent answer changes suggest second-guessing; building confidence in initial responses could improve efficiency.';
  }
  
  return {
    totalCompetencies: competencies.length,
    strongCount,
    proficientCount,
    developingCount,
    needsWorkCount,
    averageScore: Math.round(averageScore),
    overallAssessment,
    developmentUrgency,
    behavioralContext: {
      averageResponseTime: Math.round(avgTimeAcrossCompetencies),
      averageAnswerChanges: Math.round(avgChangesAcrossCompetencies * 10) / 10
    },
    topStrengths: competencies.filter(c => c.percentage >= 75).sort((a, b) => b.percentage - a.percentage).slice(0, 3),
    topDevelopmentNeeds: competencies.filter(c => c.percentage < 65).sort((a, b) => a.percentage - b.percentage).slice(0, 3),
    recommendations: generateCompetencyRecommendations(competencyResults, behavioralMetrics)
  };
};

/**
 * Calculate confidence score based on answer patterns
 */
export const calculateCompetencyConfidence = (competencyResult) => {
  if (!competencyResult || !competencyResult.behavioral) return 'Medium';
  
  const { avgTimePerQuestion, avgChangesPerQuestion, totalChanges } = competencyResult.behavioral;
  const score = competencyResult.percentage;
  
  // High confidence indicators
  if (score >= 80 && avgChangesPerQuestion < 0.5 && avgTimePerQuestion < 45) {
    return 'High';
  }
  // Low confidence indicators
  if (avgChangesPerQuestion > 2 || (score < 60 && avgTimePerQuestion > 60)) {
    return 'Low';
  }
  // Mixed indicators
  if (score >= 70 && avgChangesPerQuestion > 1) {
    return 'Moderate - Second-guessing';
  }
  if (score < 60 && avgChangesPerQuestion < 0.5) {
    return 'Moderate - Knowledge gap';
  }
  
  return 'Moderate';
};

export default {
  calculateCompetencyScores,
  generateCompetencyRecommendations,
  getCompetencySummary,
  competencyClassification,
  calculateCompetencyConfidence,
  assessmentCompetencyWeights
};
