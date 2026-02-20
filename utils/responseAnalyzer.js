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
