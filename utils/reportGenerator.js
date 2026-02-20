// Report generation utilities

export const getClassification = (percentage) => {
  if (percentage >= 80) return { 
    label: 'High Potential', 
    color: '#10b981',
    bg: '#d1fae5',
    description: 'Ready for increased responsibility and challenging roles'
  };
  if (percentage >= 65) return { 
    label: 'Strong Performer', 
    color: '#3b82f6',
    bg: '#dbeafe',
    description: 'Solid performer with growth potential'
  };
  if (percentage >= 50) return { 
    label: 'Developing', 
    color: '#f59e0b',
    bg: '#fef3c7',
    description: 'Requires structured development before higher responsibility'
  };
  if (percentage >= 40) return { 
    label: 'At Risk', 
    color: '#f97316',
    bg: '#ffedd5',
    description: 'Significant gaps that need immediate attention'
  };
  return { 
    label: 'High Risk', 
    color: '#ef4444',
    bg: '#fee2e2',
    description: 'Intensive support and intervention required'
  };
};

export const getGradeInfo = (percentage) => {
  if (percentage >= 95) return { grade: 'A+', text: 'Exceptional' };
  if (percentage >= 90) return { grade: 'A', text: 'Excellent' };
  if (percentage >= 85) return { grade: 'A-', text: 'Very Good' };
  if (percentage >= 80) return { grade: 'B+', text: 'Good' };
  if (percentage >= 75) return { grade: 'B', text: 'Satisfactory' };
  if (percentage >= 70) return { grade: 'B-', text: 'Adequate' };
  if (percentage >= 65) return { grade: 'C+', text: 'Developing' };
  if (percentage >= 60) return { grade: 'C', text: 'Basic Competency' };
  if (percentage >= 55) return { grade: 'C-', text: 'Minimum Competency' };
  if (percentage >= 50) return { grade: 'D+', text: 'Below Expectations' };
  if (percentage >= 40) return { grade: 'D', text: 'Significant Gaps' };
  return { grade: 'F', text: 'Unsatisfactory' };
};

export const getHiringRecommendation = (percentage, strengths, weaknesses) => {
  const weaknessCount = weaknesses.length;
  const hasCriticalWeakness = weaknesses.some(w => 
    w.includes('Cognitive') || w.includes('Cultural') || w.includes('Leadership')
  );
  
  if (percentage >= 80 && weaknessCount <= 2) {
    return {
      recommendation: 'Recommended',
      color: '#10b981',
      summary: 'Strong candidate ready for immediate hire. Demonstrates exceptional capabilities across key competencies.'
    };
  } else if (percentage >= 65 && weaknessCount <= 3) {
    return {
      recommendation: 'Recommended with Development Plan',
      color: '#3b82f6',
      summary: 'Solid candidate with clear strengths. Recommend hire with structured development plan to address identified gaps.'
    };
  } else if (percentage >= 50 && !hasCriticalWeakness) {
    return {
      recommendation: 'Conditional Recommendation',
      color: '#f59e0b',
      summary: 'Candidate meets minimum requirements but requires close supervision and targeted development. Consider for entry-level positions.'
    };
  } else {
    return {
      recommendation: 'Not Recommended',
      color: '#ef4444',
      summary: 'Significant gaps in critical competencies. Not suitable for current role requirements without intensive intervention.'
    };
  }
};
