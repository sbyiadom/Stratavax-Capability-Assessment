// Calculate section scores from responses
export function calculateSectionScores(responses, assessmentType) {
  const sectionScores = {};
  
  responses?.forEach(response => {
    const section = response.unique_questions?.section || 'General';
    const score = response.unique_answers?.score || 0;
    
    if (!sectionScores[section]) {
      sectionScores[section] = {
        total: 0,
        count: 0,
        maxPossible: 0
      };
    }
    
    sectionScores[section].total += score;
    sectionScores[section].count += 1;
    sectionScores[section].maxPossible += 5; // Assuming 5 points per question
  });

  // Calculate percentages
  Object.keys(sectionScores).forEach(section => {
    const data = sectionScores[section];
    data.percentage = Math.round((data.total / data.maxPossible) * 100) || 0;
    data.average = (data.total / data.count).toFixed(1);
  });

  return sectionScores;
}

// Identify strengths and weaknesses
export function identifyStrengthsWeaknesses(sectionScores) {
  const strengths = [];
  const weaknesses = [];

  Object.entries(sectionScores).forEach(([section, data]) => {
    if (data.percentage >= 70) {
      strengths.push(`${section} (${data.percentage}%)`);
    } else if (data.percentage <= 40) {
      weaknesses.push(`${section} (${data.percentage}%)`);
    }
  });

  return { strengths, weaknesses };
}

// Generate recommendations based on scores
export function generateRecommendations(sectionScores, assessmentType) {
  const recommendations = [];
  const weakAreas = Object.entries(sectionScores)
    .filter(([_, data]) => data.percentage < 50)
    .map(([section]) => section);

  if (weakAreas.length > 0) {
    recommendations.push(`Focus on developing: ${weakAreas.join(', ')}`);
  }

  if (Object.values(sectionScores).some(data => data.percentage >= 80)) {
    recommendations.push('Leverage strengths in mentoring others');
  }

  return recommendations;
}

// Determine risk level
export function determineRiskLevel(sectionScores, totalPercentage) {
  const weakSections = Object.values(sectionScores).filter(data => data.percentage < 40).length;
  
  if (totalPercentage < 40 || weakSections > 3) return 'high';
  if (totalPercentage < 60 || weakSections > 1) return 'medium';
  return 'low';
}

// Determine readiness
export function determineReadiness(totalPercentage, assessmentType) {
  if (totalPercentage >= 70) return 'ready';
  if (totalPercentage >= 50) return 'development_needed';
  return 'not_ready';
}
