// Response analyzer that uses actual question and answer data to generate unique insights

export const analyzeResponses = (responses, questions, answers) => {
  const categorizedInsights = {};

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.question_id);
    const answer = answers.find(a => a.id === response.answer_id);
    
    if (!question || !answer) return;

    const category = question.category || question.section;
    const questionText = question.question_text;
    const answerText = answer.answer_text;
    const score = answer.score;

    if (!categorizedInsights[category]) {
      categorizedInsights[category] = {
        insights: [],
        scores: [],
        questionCount: 0,
        highScoreCount: 0,
        lowScoreCount: 0,
        questionDetails: []
      };
    }

    // Generate unique insight based on the actual question and answer
    const insight = generateInsight(category, questionText, answerText, score);
    
    categorizedInsights[category].insights.push(insight);
    categorizedInsights[category].scores.push(score);
    categorizedInsights[category].questionCount++;
    
    categorizedInsights[category].questionDetails.push({
      question: questionText.substring(0, 50) + '...',
      answer: answerText,
      score: score
    });
    
    if (score >= 4) categorizedInsights[category].highScoreCount++;
    if (score <= 2) categorizedInsights[category].lowScoreCount++;
  });

  // Generate unique summary for each category
  Object.keys(categorizedInsights).forEach(category => {
    const data = categorizedInsights[category];
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const percentage = Math.round((avgScore / 5) * 100);
    
    data.summary = generateUniqueSummary(category, data, percentage);
    data.percentage = percentage;
    
    // Keep only the most relevant insights
    data.insights = data.insights.slice(0, 3);
  });

  return categorizedInsights;
};

const generateInsight = (category, questionText, answerText, score) => {
  const questionShort = questionText.length > 60 
    ? questionText.substring(0, 60) + '...' 
    : questionText;
  
  const answerShort = answerText.length > 40 
    ? answerText.substring(0, 40) + '...' 
    : answerText;

  // Create score-based insights with specific references to the answer
  if (score === 5) {
    return `Strong understanding demonstrated when asked "${questionShort}" – answered with "${answerShort}". This shows mastery of the concept.`;
  } else if (score === 4) {
    return `Good grasp shown in response to "${questionShort}" – answered "${answerShort}". Slight room for deeper understanding.`;
  } else if (score === 3) {
    return `Basic awareness shown for "${questionShort}" – answered "${answerShort}". Needs more depth in this area.`;
  } else if (score === 2) {
    return `Limited understanding evident in "${questionShort}" – answered "${answerShort}". Requires focused development.`;
  } else {
    return `Significant gap identified in "${questionShort}" – answered "${answerShort}". This area needs immediate attention.`;
  }
};

const generateUniqueSummary = (category, data, percentage) => {
  const { highScoreCount, lowScoreCount, questionCount } = data;
  
  // Manufacturing baseline specific summaries
  if (category === 'Safety & Work Ethic') {
    if (highScoreCount === questionCount) {
      return `Exemplary safety awareness demonstrated across all ${questionCount} questions. Candidate shows strong understanding of PPE, safety protocols, and professional conduct.`;
    } else if (highScoreCount > questionCount / 2) {
      return `Good safety awareness with ${highScoreCount} out of ${questionCount} responses showing strong understanding. Some reinforcement needed in specific areas.`;
    } else if (lowScoreCount === questionCount) {
      return `Critical safety concerns identified. All ${questionCount} responses show significant gaps in safety knowledge. Immediate training required.`;
    } else if (lowScoreCount > questionCount / 2) {
      return `Safety knowledge needs significant improvement. ${lowScoreCount} out of ${questionCount} responses indicate gaps in understanding. Priority training recommended.`;
    } else if (percentage >= 60) {
      return `Adequate safety awareness with some areas needing reinforcement. Focus on specific safety protocols identified.`;
    } else {
      return `Below expected safety knowledge. Structured safety training and close supervision recommended.`;
    }
  }
  
  if (category === 'Technical Fundamentals') {
    if (highScoreCount === questionCount) {
      return `Strong technical foundation demonstrated. Candidate shows excellent understanding of maintenance principles, sensor functions, and mechanical systems.`;
    } else if (highScoreCount > questionCount / 2) {
      return `Solid technical understanding with ${highScoreCount} out of ${questionCount} responses showing good grasp of fundamentals.`;
    } else if (lowScoreCount === questionCount) {
      return `Critical gaps in technical fundamentals. Complete foundational training needed before independent equipment work.`;
    } else if (lowScoreCount > questionCount / 2) {
      return `Technical knowledge needs significant development. Hands-on training and equipment familiarization recommended.`;
    } else {
      return `Developing technical understanding with areas needing focused training. Structured learning program recommended.`;
    }
  }
  
  if (category === 'Troubleshooting') {
    if (highScoreCount === questionCount) {
      return `Exceptional diagnostic ability. Candidate demonstrates systematic problem-solving across all scenarios.`;
    } else if (highScoreCount > questionCount / 2) {
      return `Good troubleshooting capability with ${highScoreCount} out of ${questionCount} responses showing strong diagnostic thinking.`;
    } else if (lowScoreCount === questionCount) {
      return `Critical gaps in problem-solving ability. Structured training in diagnostic methodologies urgent.`;
    } else if (lowScoreCount > questionCount / 2) {
      return `Troubleshooting skills need significant development. Focus on root cause analysis and diagnostic frameworks.`;
    } else {
      return `Developing diagnostic ability. Practice with structured problem-solving approaches recommended.`;
    }
  }
  
  if (category === 'Numerical Aptitude') {
    if (highScoreCount === questionCount) {
      return `Strong numerical reasoning demonstrated. Candidate handles production calculations and data interpretation effectively.`;
    } else if (highScoreCount > questionCount / 2) {
      return `Good numerical ability with ${highScoreCount} out of ${questionCount} responses showing strong calculation skills.`;
    } else if (lowScoreCount === questionCount) {
      return `Critical numeracy gaps identified. Immediate foundational math training required.`;
    } else if (lowScoreCount > questionCount / 2) {
      return `Numerical skills need significant development. Focus on production math and data interpretation.`;
    } else {
      return `Developing numerical ability. Practice with production calculations and metrics recommended.`;
    }
  }
  
  // Original logic for other categories
  if (highScoreCount === questionCount) {
    return `Exceptional performance in ${category}. All ${questionCount} responses demonstrated mastery level understanding.`;
  } else if (highScoreCount > questionCount / 2) {
    return `Strong performance in ${category} with ${highScoreCount} out of ${questionCount} responses showing excellent understanding.`;
  } else if (lowScoreCount === questionCount) {
    return `Critical development needed in ${category}. All ${questionCount} responses indicate significant gaps in understanding.`;
  } else if (lowScoreCount > questionCount / 2) {
    return `Significant development needed in ${category}. ${lowScoreCount} out of ${questionCount} responses show gaps in understanding.`;
  } else if (percentage >= 60) {
    return `Mixed but generally adequate performance in ${category}. Shows some strengths but also areas requiring attention.`;
  } else {
    return `Below expected performance in ${category}. Requires structured development across multiple areas.`;
  }
};

export const getCategorySpecificRecommendations = (category, data) => {
  const { lowScoreCount, questionCount, questionDetails } = data;
  const weakAreas = questionDetails.filter(q => q.score <= 2);
  
  const recommendations = {
    // Manufacturing baseline specific recommendations
    'Safety & Work Ethic': [
      'Complete OSHA or equivalent safety certification',
      'Participate in hands-on PPE training and safety drills',
      'Study company safety policies and incident response procedures',
      'Work with a safety mentor for guided practice',
      'Complete hazard recognition and risk assessment training'
    ],
    'Technical Fundamentals': [
      'Complete foundational equipment operation training',
      'Study maintenance principles and preventive maintenance schedules',
      'Practice sensor calibration and basic diagnostics',
      'Work with a technical mentor on equipment familiarization',
      'Complete hands-on training for core manufacturing systems'
    ],
    'Troubleshooting': [
      'Complete structured problem-solving training (e.g., PDCA, DMAIC)',
      'Practice root cause analysis on common production issues',
      'Study equipment fault codes and diagnostic procedures',
      'Work with a senior technician on troubleshooting scenarios',
      'Complete simulation-based troubleshooting exercises'
    ],
    'Numerical Aptitude': [
      'Complete production math and calculation training',
      'Practice efficiency calculations and metric reporting',
      'Study quality control documentation and data entry',
      'Work with a mentor on production tracking systems',
      'Complete basic numeracy refresher course'
    ],
    // Existing recommendations
    'Leadership & Management': [
      'Complete a leadership fundamentals course focusing on team development',
      'Practice giving constructive feedback in low-stakes situations',
      'Work with a mentor on conflict resolution scenarios',
      'Study different leadership styles and when to apply them'
    ],
    'Cognitive Ability': [
      'Practice logical reasoning puzzles and brain teasers daily',
      'Take an online course in critical thinking and problem-solving',
      'Work through case studies with a mentor',
      'Use structured problem-solving frameworks (e.g., PDCA, 5 Whys)'
    ],
    'Communication': [
      'Join Toastmasters or similar public speaking group',
      'Practice writing clear, concise emails and reports',
      'Seek feedback on presentations',
      'Work on active listening skills'
    ],
    'Problem-Solving': [
      'Learn structured problem-solving methodologies',
      'Practice with real-world business cases',
      'Participate in root cause analysis training',
      'Work on cross-functional projects'
    ],
    'Emotional Intelligence': [
      'Participate in EI workshops focusing on self-awareness',
      'Practice empathy in daily interactions',
      'Seek regular feedback on interpersonal skills',
      'Work with a coach on conflict management'
    ]
  };

  const defaultRecs = [
    'Complete targeted training in this area',
    'Work with a mentor for guided development',
    'Practice skills through practical applications',
    'Set specific improvement goals with weekly check-ins'
  ];

  return recommendations[category] || defaultRecs;
};
