// Enhanced scoring for different question types
export function calculateSectionScores(responses, questions) {
  const sections = {
    'Cognitive Abilities': { total: 0, count: 0, maxScore: 0 },
    'Personality Assessment': { total: 0, count: 0, maxScore: 0 },
    'Leadership Potential': { total: 0, count: 0, maxScore: 0 },
    'Technical Competence': { total: 0, count: 0, maxScore: 0 },
    'Performance Metrics': { total: 0, count: 0, maxScore: 0 }
  };

  // Create a map of questions for quick lookup
  const questionMap = {};
  questions.forEach(q => {
    questionMap[q.id] = q;
  });

  responses.forEach(response => {
    const question = questionMap[response.question_id];
    if (question && sections[question.section]) {
      sections[question.section].total += response.score || 0;
      sections[question.section].count += 1;
      
      // Calculate max possible score for this question type
      const maxForQuestion = question.section === 'Cognitive Abilities' ? 5 : 5;
      sections[question.section].maxScore += maxForQuestion;
    }
  });

  // Calculate percentages
  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0 && data.maxScore > 0) {
      result[section] = Math.round((data.total / data.maxScore) * 100);
    } else {
      result[section] = 0;
    }
  });

  return result;
}

export function totalScore(responses, questions) {
  if (!responses || responses.length === 0) return 0;
  
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * 5; // All questions max 5 points
  
  return Math.round((total / maxPossible) * 100);
}

export function getCognitiveAccuracy(responses, questions) {
  const cognitiveResponses = responses.filter(r => {
    const q = questions.find(q => q.id === r.question_id);
    return q?.section === 'Cognitive Abilities';
  });
  
  if (cognitiveResponses.length === 0) return 0;
  
  // For cognitive questions, score 5 = correct, 1-4 = incorrect with varying degrees
  const correctAnswers = cognitiveResponses.filter(r => r.score === 5).length;
  return Math.round((correctAnswers / cognitiveResponses.length) * 100);
}

export function classifyTalent(overallScore, cognitiveScore) {
  // Consider both overall score and cognitive accuracy
  if (overallScore >= 90 && cognitiveScore >= 80) return 'ELITE TALENT';
  if (overallScore >= 80 && cognitiveScore >= 70) return 'HIGH POTENTIAL';
  if (overallScore >= 70 && cognitiveScore >= 60) return 'SOLID PERFORMER';
  if (overallScore >= 60) return 'DEVELOPMENT NEEDED';
  return 'UNDERPERFORMING';
}
