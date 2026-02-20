// Response analyzer that uses actual question and answer data to generate insights

export const analyzeResponses = (responses, questions, answers) => {
  const insights = {
    communication: [],
    problemSolving: [],
    cognitive: [],
    ethics: [],
    performance: [],
    emotional: [],
    leadership: [],
    personality: [],
    technical: [],
    cultural: []
  };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.question_id);
    const answer = answers.find(a => a.id === response.answer_id);
    
    if (!question || !answer) return;

    const category = question.category || question.section;
    const questionText = question.question_text;
    const answerText = answer.answer_text;
    const score = answer.score;

    // Generate insight based on question and answer
    const insight = generateInsight(category, questionText, answerText, score);
    
    if (insight && insights[category]) {
      insights[category].push(insight);
    }
  });

  return insights;
};

const generateInsight = (category, questionText, answerText, score) => {
  const insights = {
    // Communication insights
    'Communication': {
      high: `Shows strong communication skills: "${answerText}" - demonstrates clarity and effectiveness.`,
      medium: `Demonstrates basic communication: "${answerText}" - could benefit from more structured expression.`,
      low: `Struggles with communication: "${answerText}" - needs development in articulating ideas clearly.`
    },
    
    // Problem-Solving insights
    'Problem-Solving': {
      high: `Excellent problem-solving approach: "${answerText}" - shows systematic thinking.`,
      medium: `Adequate problem-solving: "${answerText}" - works for routine issues but may struggle with complexity.`,
      low: `Limited problem-solving: "${answerText}" - tends to rely on others for solutions.`
    },
    
    // Cognitive Ability insights
    'Cognitive Ability': {
      high: `Strong analytical thinking: "${answerText}" - processes information effectively.`,
      medium: `Moderate cognitive ability: "${answerText}" - handles structured tasks well.`,
      low: `Cognitive challenges evident: "${answerText}" - struggles with abstract concepts.`
    },
    
    // Ethics & Integrity insights
    'Ethics & Integrity': {
      high: `Principled decision-making: "${answerText}" - demonstrates strong ethical foundation.`,
      medium: `Adequate ethical awareness: "${answerText}" - follows rules when clear.`,
      low: `Ethical concerns: "${answerText}" - may need clear boundaries and supervision.`
    },
    
    // Performance Metrics insights
    'Performance Metrics': {
      high: `Results-oriented: "${answerText}" - focused on achieving targets.`,
      medium: `Moderate performance focus: "${answerText}" - meets basic expectations.`,
      low: `Performance inconsistency: "${answerText}" - struggles with accountability.`
    },
    
    // Emotional Intelligence insights
    'Emotional Intelligence': {
      high: `Emotionally aware: "${answerText}" - understands and manages feelings well.`,
      medium: `Basic emotional awareness: "${answerText}" - navigates simple situations.`,
      low: `Emotional intelligence gaps: "${answerText}" - may struggle with interpersonal dynamics.`
    },
    
    // Leadership & Management insights
    'Leadership & Management': {
      high: `Natural leadership qualities: "${answerText}" - inspires and guides others.`,
      medium: `Emerging leadership: "${answerText}" - can coordinate tasks effectively.`,
      low: `Leadership challenges: "${answerText}" - not ready for people management.`
    },
    
    // Personality & Behavioral insights
    'Personality & Behavioral': {
      high: `Resilient and adaptable: "${answerText}" - handles pressure well.`,
      medium: `Generally stable: "${answerText}" - maintains composure in routine situations.`,
      low: `Behavioral concerns: "${answerText}" - may struggle under stress.`
    },
    
    // Technical & Manufacturing insights
    'Technical & Manufacturing': {
      high: `Strong technical aptitude: "${answerText}" - applies knowledge effectively.`,
      medium: `Basic technical skills: "${answerText}" - requires guidance for complex tasks.`,
      low: `Technical knowledge gaps: "${answerText}" - needs foundational training.`
    },
    
    // Cultural & Attitudinal Fit insights
    'Cultural & Attitudinal Fit': {
      high: `Excellent cultural alignment: "${answerText}" - embodies company values.`,
      medium: `Generally aligned: "${answerText}" - fits with most team norms.`,
      low: `Cultural misalignment: "${answerText}" - may not resonate with organizational values.`
    }
  };

  const categoryInsights = insights[category];
  if (!categoryInsights) return null;

  if (score >= 4) return categoryInsights.high;
  if (score >= 3) return categoryInsights.medium;
  return categoryInsights.low;
};

export const generateCategorySummary = (category, scores, insights) => {
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highScores = scores.filter(s => s >= 4).length;
  const lowScores = scores.filter(s => s <= 2).length;

  let summary = '';

  if (highScores > scores.length / 2) {
    summary = `Strong performance in ${category}. `;
  } else if (lowScores > scores.length / 2) {
    summary = `Significant development needed in ${category}. `;
  } else {
    summary = `Mixed performance in ${category} with both strengths and areas for growth. `;
  }

  // Add specific insights
  if (insights && insights.length > 0) {
    summary += `Key observations: ${insights.slice(0, 2).join(' ')}`;
  }

  return summary;
};
