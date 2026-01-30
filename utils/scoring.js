// Enhanced scoring system for 100-question assessment
export function calculateSectionScores(responses) {
  const sections = {
    'Cognitive Abilities': { total: 0, count: 0, max: 100 },
    'Personality Assessment': { total: 0, count: 0, max: 100 },
    'Leadership Potential': { total: 0, count: 0, max: 100 },
    'Technical Competence': { total: 0, count: 0, max: 100 },
    'Performance Metrics': { total: 0, count: 0, max: 100 }
  };

  responses.forEach(response => {
    const section = response.question?.section;
    if (section && sections[section]) {
      sections[section].total += response.score || 0;
      sections[section].count += 1;
    }
  });

  // Convert to percentages
  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      const maxPossible = data.count * 5; // Each question max 5 points
      result[section] = Math.round((data.total / maxPossible) * 100);
    } else {
      result[section] = 0;
    }
  });

  return result;
}

export function totalScore(responses) {
  if (!responses || responses.length === 0) return 0;
  
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * 5;
  
  return Math.round((total / maxPossible) * 100); // Percentage score
}

export function classifyTalent(score) {
  if (score >= 90) return 'ELITE TALENT';
  if (score >= 80) return 'HIGH POTENTIAL';
  if (score >= 70) return 'SOLID PERFORMER';
  if (score >= 60) return 'DEVELOPMENT NEEDED';
  return 'UNDERPERFORMING';
}

export function getStrengths(sectionScores) {
  const strengths = [];
  Object.entries(sectionScores).forEach(([section, score]) => {
    if (score >= 80) {
      strengths.push(`${section} (${score}%)`);
    }
  });
  return strengths;
}

export function getDevelopmentAreas(sectionScores) {
  const areas = [];
  Object.entries(sectionScores).forEach(([section, score]) => {
    if (score < 60) {
      areas.push(`${section} (${score}%)`);
    }
  });
  return areas;
}
