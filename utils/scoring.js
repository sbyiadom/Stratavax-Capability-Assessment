// Enhanced scoring for 100 questions
export function calculateSectionScores(responses) {
  const sections = {
    'Cognitive Abilities': { total: 0, count: 0, max: 80 }, // 20 questions × 4 max points
    'Personality Assessment': { total: 0, count: 0, max: 80 },
    'Leadership Potential': { total: 0, count: 0, max: 80 },
    'Technical Competence': { total: 0, count: 0, max: 80 },
    'Performance Metrics': { total: 0, count: 0, max: 80 }
  };

  responses.forEach(response => {
    const section = response.question?.section;
    if (section && sections[section]) {
      sections[section].total += response.score || 0;
      sections[section].count += 1;
    }
  });

  // Calculate percentages
  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      result[section] = Math.round((data.total / (data.count * 4)) * 100);
    } else {
      result[section] = 0;
    }
  });

  return result;
}

export function totalScore(responses) {
  if (!responses || responses.length === 0) return 0;
  
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * 4; // Each question max 4 points
  
  return Math.round((total / maxPossible) * 100);
}

export function classifyTalent(score) {
  if (score >= 90) return 'ELITE TALENT';
  if (score >= 80) return 'HIGH POTENTIAL';
  if (score >= 70) return 'SOLID PERFORMER';
  if (score >= 60) return 'DEVELOPMENT NEEDED';
  return 'UNDERPERFORMING';
}

export function getSectionBreakdown(responses) {
  const sections = {};
  
  responses.forEach(response => {
    const section = response.question?.section;
    if (section) {
      if (!sections[section]) {
        sections[section] = { total: 0, count: 0 };
      }
      sections[section].total += response.score || 0;
      sections[section].count += 1;
    }
  });

  const breakdown = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      breakdown[section] = {
        score: Math.round((data.total / (data.count * 4)) * 100),
        questionsAnswered: data.count
      };
    }
  });

  return breakdown;
}
