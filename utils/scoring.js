// utils/scoring.js - COMPLETE VERSION WITH ALL EXPORTS
export function calculateSectionScores(responses) {
  const sections = {
    'Cognitive Abilities': { total: 0, count: 0, max: 80 },
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
  const maxPossible = responses.length * 4;
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

// NEW FUNCTIONS YOU NEED:
export function getCategoryGrade(percentage) {
  if (percentage >= 80) return "A";
  if (percentage >= 75) return "A-";
  if (percentage >= 70) return "B+";
  if (percentage >= 65) return "B";
  if (percentage >= 60) return "B-";
  if (percentage >= 55) return "C+";
  if (percentage >= 50) return "C";
  if (percentage >= 45) return "C-";
  if (percentage >= 40) return "D+";
  if (percentage >= 35) return "D";
  return "F";
}

export function getDevelopmentAreas(categoryScores) {
  const developmentAreas = [];
  const developmentThreshold = 60;
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    const percentage = typeof score === 'object' ? (score.score || score.percentage || 0) : score;
    
    if (percentage < developmentThreshold) {
      developmentAreas.push({
        category,
        score: percentage,
        grade: getCategoryGrade(percentage),
        neededImprovement: developmentThreshold - percentage
      });
    }
  });
  
  developmentAreas.sort((a, b) => a.score - b.score);
  return developmentAreas;
}

export function getStrengths(categoryScores) {
  const strengths = [];
  const strengthThreshold = 70;
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    const percentage = typeof score === 'object' ? (score.score || score.percentage || 0) : score;
    
    if (percentage >= strengthThreshold) {
      strengths.push({
        category,
        score: percentage,
        grade: getCategoryGrade(percentage)
      });
    }
  });
  
  strengths.sort((a, b) => b.score - a.score);
  return strengths;
}

// Helper function for your API
export function getOverallClassification(totalScore) {
  if (totalScore >= 450) return "Elite Talent";
  if (totalScore >= 400) return "Top Talent";
  if (totalScore >= 350) return "High Potential";
  if (totalScore >= 300) return "Solid Performer";
  if (totalScore >= 250) return "Developing Talent";
  if (totalScore >= 200) return "Emerging Talent";
  return "Needs Improvement";
}
