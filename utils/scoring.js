// utils/scoring.js - Enhanced scoring for 100 questions

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

// NEW: Get category grade based on percentage
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

// NEW: Get category grade label
export function getCategoryGradeLabel(grade) {
  const labels = {
    "A": "High-impact candidate",
    "A-": "Strong candidate with minor refinement areas",
    "B+": "Above average performance",
    "B": "Solid performance",
    "B-": "Adequate with some development needs",
    "C+": "Meets basic requirements",
    "C": "Development required",
    "C-": "Significant improvement needed",
    "D+": "Below expectations",
    "D": "Low readiness",
    "F": "Not suitable"
  };
  return labels[grade] || "Unknown";
}

// NEW: Get development areas (areas below 60%)
export function getDevelopmentAreas(categoryScores) {
  const developmentAreas = [];
  
  // Threshold for considering an area needs development (below 60%)
  const developmentThreshold = 60;
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    const percentage = typeof score === 'object' ? (score.score || score.percentage || 0) : score;
    
    if (percentage < developmentThreshold) {
      developmentAreas.push({
        category,
        score: percentage,
        grade: getCategoryGrade(percentage),
        gradeLabel: getCategoryGradeLabel(getCategoryGrade(percentage)),
        neededImprovement: developmentThreshold - percentage,
        interpretation: getPerformanceInterpretation(percentage, category)
      });
    }
  });
  
  // Sort by lowest score first (most critical needs first)
  developmentAreas.sort((a, b) => a.score - b.score);
  
  return developmentAreas;
}

// NEW: Get performance interpretation
export function getPerformanceInterpretation(percentage, category) {
  const grade = getCategoryGrade(percentage);
  
  const interpretations = {
    'A': `Excellent performance in ${category}. Demonstrates mastery and expertise.`,
    'A-': `Strong performance in ${category}. Shows high competence with minor areas for refinement.`,
    'B+': `Above average in ${category}. Good understanding and application.`,
    'B': `Solid performance in ${category}. Meets expectations consistently.`,
    'B-': `Adequate in ${category}. Some development areas identified.`,
    'C+': `Basic competency in ${category}. Needs improvement in key areas.`,
    'C': `Development needed in ${category}. Significant gaps identified.`,
    'C-': `Below expectations in ${category}. Requires focused development.`,
    'D+': `Poor performance in ${category}. Major improvements needed.`,
    'D': `Very poor performance in ${category}. Critical development required.`,
    'F': `Unsuitable performance in ${category}. Does not meet minimum standards.`
  };
  
  return interpretations[grade] || `Performance in ${category} requires evaluation.`;
}

// NEW: Calculate overall classification based on 500-point scale
export function getOverallClassification(totalScore) {
  if (totalScore >= 450) return "Elite Talent";
  if (totalScore >= 400) return "Top Talent";
  if (totalScore >= 350) return "High Potential";
  if (totalScore >= 300) return "Solid Performer";
  if (totalScore >= 250) return "Developing Talent";
  if (totalScore >= 200) return "Emerging Talent";
  return "Needs Improvement";
}

// NEW: Convert percentage score to 500-point scale
export function convertTo500Scale(percentage) {
  return Math.round((percentage / 100) * 500);
}

// NEW: Get strengths (areas above 70%)
export function getStrengths(categoryScores) {
  const strengths = [];
  
  // Threshold for considering an area a strength (above 70%)
  const strengthThreshold = 70;
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    const percentage = typeof score === 'object' ? (score.score || score.percentage || 0) : score;
    
    if (percentage >= strengthThreshold) {
      strengths.push({
        category,
        score: percentage,
        grade: getCategoryGrade(percentage),
        gradeLabel: getCategoryGradeLabel(getCategoryGrade(percentage)),
        interpretation: getPerformanceInterpretation(percentage, category)
      });
    }
  });
  
  // Sort by highest score first (biggest strengths first)
  strengths.sort((a, b) => b.score - a.score);
  
  return strengths;
}

// NEW: Generate recommendations based on development areas
export function generateRecommendations(developmentAreas) {
  const recommendations = [];
  
  developmentAreas.forEach(area => {
    let recommendation = "";
    
    switch(area.category) {
      case 'Cognitive Abilities':
        recommendation = "Consider cognitive training exercises, problem-solving workshops, and analytical thinking development programs. Focus on logical reasoning, pattern recognition, and mental agility exercises.";
        break;
      case 'Personality Assessment':
        recommendation = "Engage in personality development sessions, emotional intelligence training, and communication workshops. Consider role-playing exercises and interpersonal skills development programs.";
        break;
      case 'Leadership Potential':
        recommendation = "Participate in leadership workshops, mentorship programs, and team management exercises. Focus on decision-making, influence development, and strategic thinking training.";
        break;
      case 'Technical Competence':
        recommendation = "Attend technical training sessions, industry-specific workshops, and hands-on practice programs. Focus on core technical skills, practical applications, and problem-solving in technical domains.";
        break;
      case 'Performance Metrics':
        recommendation = "Focus on goal-setting strategies, performance tracking improvement, time management workshops, and productivity enhancement techniques. Implement regular performance reviews and feedback sessions.";
        break;
      default:
        recommendation = "Consider targeted training and development programs in this specific area. Create a personalized development plan with measurable goals and regular progress reviews.";
    }
    
    recommendations.push({
      category: area.category,
      issue: `${area.category} scored ${area.score}% (Grade ${area.grade}).`,
      recommendation: recommendation,
      priority: area.score < 50 ? "High" : area.score < 60 ? "Medium" : "Low",
      grade: area.grade,
      score: area.score
    });
  });
  
  // Sort by priority (High first)
  recommendations.sort((a, b) => {
    const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return recommendations;
}
