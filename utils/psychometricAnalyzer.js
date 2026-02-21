// utils/psychometricAnalyzer.js

export const generatePsychometricAnalysis = (categoryScores, assessmentType, candidateName, responseInsights) => {
  
  // Get all categories and their scores
  const categories = Object.entries(categoryScores).map(([name, data]) => ({
    name,
    score: data.score,
    maxPossible: data.maxPossible,
    percentage: data.percentage
  }));

  // Calculate overall statistics
  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = categories.reduce((sum, c) => sum + c.maxPossible, 0);
  const avgScore = Math.round((totalScore / maxPossible) * 100);
  const overallGrade = getOverallGrade(avgScore);
  const classification = getClassification(avgScore);

  // Categorize by performance
  const strengths = categories.filter(c => c.percentage >= 70);
  const moderate = categories.filter(c => c.percentage >= 50 && c.percentage < 70);
  const risks = categories.filter(c => c.percentage < 50);

  // Find key categories for narrative
  const openness = categories.find(c => c.name.includes('Openness')) || { percentage: 0, name: 'Openness to Experience' };
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness')) || { percentage: 0, name: 'Conscientiousness' };
  const cognitive = categories.find(c => c.name.includes('Cognitive') || c.name.includes('Patterns')) || { percentage: 0, name: 'Cognitive Patterns' };
  const stress = categories.find(c => c.name.includes('Stress')) || { percentage: 0, name: 'Stress Management' };
  const emotional = categories.find(c => c.name.includes('Emotional')) || { percentage: 0, name: 'Emotional Intelligence' };
  const extraversion = categories.find(c => c.name.includes('Extraversion')) || { percentage: 0, name: 'Extraversion' };
  const agreeableness = categories.find(c => c.name.includes('Agreeableness')) || { percentage: 0, name: 'Agreeableness' };
  const motivations = categories.find(c => c.name.includes('Motivations')) || { percentage: 0, name: 'Motivations' };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0, name: 'Integrity' };
  const workPace = categories.find(c => c.name.includes('Work Pace')) || { percentage: 0, name: 'Work Pace' };
  const mixedTraits = categories.find(c => c.name.includes('Mixed')) || { percentage: 0, name: 'Mixed Traits' };
  const behavioralStyle = categories.find(c => c.name.includes('Behavioral Style')) || { percentage: 0, name: 'Behavioral Style' };
  const performance = categories.find(c => c.name.includes('Performance')) || { percentage: 0, name: 'Performance Risks' };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateExecutiveSummary(candidateName, avgScore, strengths, risks, openness, conscientiousness, cognitive, stress),
    categoryAnalysis: {
      strengths: generateStrengthsAnalysis(strengths),
      moderate: generateModerateAnalysis(moderate),
      risks: generateRisksAnalysis(risks)
    },
    personalityStructure: generatePersonalityStructure(openness, conscientiousness, cognitive, stress),
    roleSuitability: generateRoleSuitability(strengths, risks, openness, cognitive, stress),
    developmentPriorities: generateDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateOverallInterpretation(candidateName, avgScore, strengths, risks, cognitive, stress)
  };
};

const generateExecutiveSummary = (candidateName, avgScore, strengths, risks, openness, conscientiousness, cognitive, stress) => {
  const strengthCount = strengths.length;
  const riskCount = risks.length;
  
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `This profile reflects a strong performer with clear strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `This profile reflects a moderate but uneven performer. `;
    
    if (openness.percentage >= 70) {
      summary += `The candidate shows high openness `;
      if (conscientiousness.percentage >= 50) {
        summary += `and decent work discipline, `;
      }
    }
    
    if (riskCount >= 3) {
      summary += `but significant weaknesses in `;
      const riskNames = risks.slice(0,3).map(r => {
        if (r.name.includes('Cognitive')) return 'cognitive processing';
        if (r.name.includes('Stress')) return 'stress tolerance';
        if (r.name.includes('Motivations')) return 'motivation clarity';
        if (r.name.includes('Emotional')) return 'emotional stability';
        return r.name.toLowerCase();
      }).join(', ');
      summary += `${riskNames}. `;
    }
  } else {
    summary += `This profile reflects significant development needs across multiple areas. `;
  }

  summary += `\n\nThere is development potential, but performance consistency and decision-making reliability are current concerns.`;
  
  return summary;
};

const generateStrengthsAnalysis = (strengths) => {
  if (strengths.length === 0) return '';

  let analysis = `🟢 **Key Strengths**\n\n`;
  
  strengths.forEach(s => {
    analysis += `**${s.name}** – ${s.percentage}% (${getGrade(s.percentage)})\n\n`;
    analysis += `${getStrengthNarrative(s.name, s.percentage)}\n\n`;
    
    const indicators = getStrengthIndicators(s.name);
    if (indicators.length > 0) {
      analysis += `${indicators.map(i => `• ${i}`).join('\n')}\n\n`;
    }
    
    analysis += `This is a major growth asset, especially in evolving environments.\n\n`;
  });

  return analysis;
};

const generateModerateAnalysis = (moderate) => {
  if (moderate.length === 0) return '';

  let analysis = `🟡 **Moderate / Stable Areas**\n\n`;
  
  moderate.forEach(m => {
    analysis += `**${m.name}** – ${m.percentage}% (${getGrade(m.percentage)})\n\n`;
    analysis += `${getModerateNarrative(m.name)}\n\n`;
  });

  return analysis;
};

const generateRisksAnalysis = (risks) => {
  if (risks.length === 0) return '';

  let analysis = `🔴 **Development & Risk Areas**\n\n`;
  
  risks.forEach(r => {
    analysis += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    analysis += `${getRiskNarrative(r.name, r.percentage)}\n\n`;
    
    const implications = getRiskImplications(r.name);
    if (implications.length > 0) {
      analysis += `May indicate:\n\n`;
      analysis += `${implications.map(i => `• ${i}`).join('\n')}\n\n`;
    }
    
    if (r.percentage < 40) {
      analysis += `For roles requiring complex judgment, this is a significant limitation.\n\n`;
    }
  });

  return analysis;
};

const generatePersonalityStructure = (openness, conscientiousness, cognitive, stress) => {
  let analysis = `🧠 **Personality Structure Interpretation**\n\n`;
  analysis += `This is an interesting contrast profile:\n\n`;
  analysis += `• Very high Openness (${openness.percentage}%)\n`;
  analysis += `• ${conscientiousness.percentage >= 70 ? 'High' : conscientiousness.percentage >= 50 ? 'Moderate' : 'Low'} Conscientiousness (${conscientiousness.percentage}%)\n`;
  analysis += `• ${cognitive.percentage >= 70 ? 'High' : cognitive.percentage >= 50 ? 'Moderate' : 'Very low'} Cognitive Pattern score (${cognitive.percentage}%)\n`;
  analysis += `• ${stress.percentage >= 70 ? 'High' : stress.percentage >= 50 ? 'Moderate' : 'Low'} Stress Management (${stress.percentage}%)\n\n`;

  if (openness.percentage >= 70 && cognitive.percentage < 50 && stress.percentage < 60) {
    analysis += `This can describe someone who:\n\n`;
    analysis += `• Has ideas\n`;
    analysis += `• Enjoys new concepts\n`;
    analysis += `• But struggles to structure thinking\n`;
    analysis += `• May not convert ideas into structured execution\n\n`;
    analysis += `High curiosity + weak cognitive structure = scattered potential.\n`;
  }

  return analysis;
};

const generateRoleSuitability = (strengths, risks, openness, cognitive, stress) => {
  const strengthNames = strengths.map(s => s.name);
  const riskNames = risks.map(r => r.name);
  
  let analysis = `🎯 **Role Suitability**\n\n`;
  
  // Suitable For
  analysis += `**Suitable For:**\n\n`;
  
  if (strengthNames.some(s => s.includes('Openness'))) {
    analysis += `• Creative or exploratory roles\n`;
    analysis += `• Research support roles\n`;
    analysis += `• Innovation brainstorming teams\n`;
  }
  
  if (strengthNames.some(s => s.includes('Conscientiousness'))) {
    analysis += `• Structured operational roles\n`;
  }
  
  if (openness.percentage >= 70 && (cognitive.percentage < 50 || stress.percentage < 50)) {
    analysis += `• Environments with structured supervision\n`;
  }
  
  if (analysis.endsWith('**Suitable For:**\n\n')) {
    analysis += `• Entry-level positions with clear guidance\n`;
    analysis += `• Structured environments with close supervision\n`;
  }
  
  analysis += `\n**Risky For:**\n\n`;
  
  if (riskNames.some(r => r.includes('Cognitive'))) {
    analysis += `• Senior leadership\n`;
    analysis += `• Strategic decision-making roles\n`;
  }
  if (riskNames.some(r => r.includes('Stress'))) {
    analysis += `• High-pressure operational roles\n`;
    analysis += `• Crisis management positions\n`;
  }
  if (riskNames.some(r => r.includes('Agreeableness'))) {
    analysis += `• Client-facing positions\n`;
  }
  
  if (analysis.endsWith('**Risky For:**\n\n')) {
    analysis += `• No significant role risks identified\n`;
  }

  return analysis;
};

const generateDevelopmentPriorities = (risks, moderate) => {
  const priorities = [...risks, ...moderate].sort((a, b) => a.percentage - b.percentage).slice(0, 4);
  
  if (priorities.length === 0) return '';

  let analysis = `📈 **Development Priorities**\n\n`;
  
  priorities.forEach((item, index) => {
    const priorityNumber = index + 1;
    const priorityEmoji = getPriorityEmoji(priorityNumber);
    analysis += `${priorityNumber}️⃣ **${priorityEmoji}**\n\n`;
    analysis += `${getDevelopmentRecommendation(item.name)}\n\n`;
  });

  return analysis;
};

const generateOverallInterpretation = (candidateName, avgScore, strengths, risks, cognitive, stress) => {
  const riskCount = risks.length;
  
  let analysis = `📌 **Overall Interpretation**\n\n`;
  
  if (avgScore >= 70) {
    analysis += `This is a capable individual with clear strengths and manageable development areas. `;
  } else if (avgScore >= 50) {
    if (cognitive.percentage < 50 && stress.percentage < 50) {
      analysis += `This is a curious, adaptable individual with moderate discipline but weak cognitive structure and stress resilience. `;
      analysis += `The candidate has growth potential but requires structured development before handling high-responsibility or high-pressure roles. `;
    } else if (riskCount >= 3) {
      analysis += `This candidate has potential but requires significant development in key areas. `;
    } else {
      analysis += `This candidate has growth potential with targeted development in key areas. `;
    }
  } else {
    analysis += `This candidate requires significant development across multiple areas before being ready for increased responsibility. `;
  }
  
  return analysis;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getGrade = (percentage) => {
  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'C-';
  if (percentage >= 50) return 'D+';
  if (percentage >= 40) return 'D';
  return 'F';
};

const getOverallGrade = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

const getClassification = (percentage) => {
  if (percentage >= 80) return 'High Potential';
  if (percentage >= 65) return 'Strong Performer';
  if (percentage >= 50) return 'Developing';
  if (percentage >= 40) return 'At Risk';
  return 'High Risk';
};

const getPriorityEmoji = (number) => {
  const priorities = [
    'Cognitive Structuring',
    'Stress Resilience',
    'Motivation Clarification',
    'Interpersonal Development',
    'Performance Consistency',
    'Emotional Intelligence Development'
  ];
  return priorities[number - 1] || 'Development Priority';
};

const getStrengthNarrative = (name, percentage) => {
  const narratives = {
    'Openness to Experience': 'Exceptional strength.',
    'Conscientiousness': 'Reasonably organized. Moderately disciplined. Can follow through on tasks. Some reliability in execution.',
    'Integrity': 'Generally ethical. Likely trustworthy. Low probability of deliberate misconduct.',
    'Work Pace': 'Maintains steady output. Neither overly slow nor overly impulsive.',
    'Extraversion': 'Balanced social engagement. Comfortable in team settings.',
    'Emotional Intelligence': 'Basic interpersonal awareness. Functional but not highly influential.'
  };
  return narratives[name] || `Strong performance at ${percentage}%.`;
};

const getStrengthIndicators = (name) => {
  const indicators = {
    'Openness to Experience': [
      'Strong curiosity and learning agility',
      'Adaptability to new ideas',
      'Innovation-friendly mindset',
      'Willingness to experiment and explore'
    ]
  };
  return indicators[name] || [];
};

const getModerateNarrative = (name) => {
  const narratives = {
    'Emotional Intelligence': 'Basic interpersonal awareness. Functional but not highly influential.',
    'Extraversion': 'Balanced social engagement. Neither highly dominant nor withdrawn.',
    'Mixed Traits': 'Inconsistent behavioral tendencies. May behave differently under varying pressures.',
    'Behavioral Style': 'Moderately adaptable. Not strongly defined leadership presence.',
    'Conscientiousness': 'Reasonably organized. Moderately disciplined. Can follow through on tasks.',
    'Work Pace': 'Maintains steady output. Neither overly slow nor overly impulsive.'
  };
  return narratives[name] || 'Shows moderate competency in this area with room for growth.';
};

const getRiskNarrative = (name, percentage) => {
  const narratives = {
    'Cognitive Patterns': 'This is the most serious concern.',
    'Stress Management': 'Likely struggles under pressure. May experience performance dips in high-demand situations. Risk of emotional reactivity.',
    'Agreeableness': 'May appear blunt or less collaborative. Possible interpersonal friction. Not naturally cooperative.',
    'Motivations': 'Unclear internal drive. May lack strong achievement orientation. Needs external structure or incentives.',
    'Performance Risks': 'Suggests inconsistency. Possible burnout vulnerability. Decision instability under pressure.',
    'Mixed Traits': 'Inconsistent behavioral tendencies. May behave differently under varying pressures.'
  };
  return narratives[name] || 'Significant development needed in this area.';
};

const getRiskImplications = (name) => {
  const implications = {
    'Cognitive Patterns': [
      'Weak analytical structure',
      'Poor strategic thinking',
      'Difficulty organizing thoughts',
      'Inconsistent reasoning patterns'
    ],
    'Stress Management': [
      'Likely struggles under pressure',
      'May experience performance dips in high-demand situations',
      'Risk of emotional reactivity'
    ],
    'Agreeableness': [
      'May appear blunt or less collaborative',
      'Possible interpersonal friction',
      'Not naturally cooperative'
    ],
    'Motivations': [
      'Unclear internal drive',
      'May lack strong achievement orientation',
      'Needs external structure or incentives'
    ],
    'Performance Risks': [
      'Inconsistency',
      'Possible burnout vulnerability',
      'Decision instability under pressure'
    ]
  };
  return implications[name] || [];
};

const getDevelopmentRecommendation = (name) => {
  const recommendations = {
    'Cognitive Patterns': 'Critical thinking training. Structured decision-making frameworks. Analytical writing exercises.',
    'Stress Management': 'Stress management coaching. Pressure simulation exercises. Mindfulness and emotional regulation training.',
    'Agreeableness': 'Conflict management training. Collaboration workshops. Assertiveness training.',
    'Motivations': 'Goal-setting alignment. KPI-based accountability. Performance coaching.',
    'Performance Risks': 'Performance monitoring. Regular feedback sessions. Stress management techniques.',
    'Mixed Traits': 'Behavioral coaching. Self-awareness exercises. Feedback sessions.',
    'Emotional Intelligence': 'EI workshops. Active listening practice. Empathy exercises.'
  };
  return recommendations[name] || 'Targeted training and structured development in this area.';
};
