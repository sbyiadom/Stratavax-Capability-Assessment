// utils/psychometricAnalyzer.js

export const generatePsychometricAnalysis = (categoryScores, assessmentType, candidateName, responseInsights) => {
  
  // Get all categories and their scores
  const categories = Object.entries(categoryScores).map(([name, data]) => ({
    name,
    score: data.score,
    maxPossible: data.maxPossible,
    percentage: data.percentage
  }));

  // Sort categories by percentage (highest first for strengths, lowest for risks)
  const byPercentage = [...categories].sort((a, b) => b.percentage - a.percentage);
  
  // Identify strengths (≥70%), moderate (50-69%), and risks (<50%)
  const strengths = categories.filter(c => c.percentage >= 70);
  const moderate = categories.filter(c => c.percentage >= 50 && c.percentage < 70);
  const risks = categories.filter(c => c.percentage < 50);

  // Calculate overall statistics
  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = categories.reduce((sum, c) => sum + c.maxPossible, 0);
  const avgScore = Math.round((totalScore / maxPossible) * 100);

  return {
    executiveSummary: generateExecutiveSummary(candidateName, avgScore, strengths, moderate, risks, categories, totalScore, maxPossible),
    categoryAnalysis: {
      strengths: generateStrengthsAnalysis(strengths),
      moderate: generateModerateAnalysis(moderate),
      risks: generateRisksAnalysis(risks)
    },
    personalityStructure: generatePersonalityStructure(categories, strengths, risks),
    roleSuitability: generateRoleSuitability(strengths, risks),
    developmentPriorities: generateDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateOverallInterpretation(candidateName, avgScore, strengths, risks)
  };
};

const generateExecutiveSummary = (candidateName, avgScore, strengths, moderate, risks, categories, totalScore, maxPossible) => {
  const riskCount = risks.length;
  const strengthCount = strengths.length;
  const hasCognitiveIssue = risks.some(r => r.name.includes('Cognitive'));
  const hasStressIssue = risks.some(r => r.name.includes('Stress'));
  const hasOpennessStrength = strengths.some(s => s.name.includes('Openness'));
  const hasConscientiousness = strengths.some(s => s.name.includes('Conscientiousness')) || 
                               moderate.some(m => m.name.includes('Conscientiousness'));

  let summary = `**Overall Performance Interpretation**\n\n`;
  summary += `Total Score: ${totalScore} / ${maxPossible}\n`;
  summary += `Average: ${avgScore}%\n`;
  summary += `Overall Grade: ${getOverallGrade(avgScore)}\n`;
  summary += `Classification: ${getClassification(avgScore)}\n\n`;
  summary += `**Executive Summary**\n\n`;

  if (strengthCount >= 3 && riskCount <= 2) {
    summary += `This profile reflects a strong performer with clear strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
    if (hasOpennessStrength && hasConscientiousness) {
      summary += `The combination of high openness and conscientiousness suggests someone who can both generate ideas and execute them effectively. `;
    }
  } else if (strengthCount >= 2 && riskCount >= 3) {
    summary += `This profile reflects a moderate but uneven performer. `;
    if (hasOpennessStrength) summary += `The candidate shows high openness `;
    if (hasConscientiousness) summary += `and decent work discipline, `;
    summary += `but significant weaknesses in ${risks.slice(0,3).map(r => r.name.toLowerCase()).join(', ')}. `;
  } else if (riskCount >= 4) {
    summary += `This profile reflects significant development needs across multiple areas. `;
  } else {
    summary += `This profile reflects a developing performer with room for growth. `;
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
    
    // Add bullet points for key indicators
    const indicators = getStrengthIndicators(s.name, s.percentage);
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
    analysis += `${getModerateNarrative(m.name, m.percentage)}\n\n`;
  });

  return analysis;
};

const generateRisksAnalysis = (risks) => {
  if (risks.length === 0) return '';

  let analysis = `🔴 **Development & Risk Areas**\n\n`;
  
  risks.forEach(r => {
    analysis += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    analysis += `${getRiskNarrative(r.name, r.percentage)}\n\n`;
    
    // Add bullet points for what this may indicate
    const implications = getRiskImplications(r.name, r.percentage);
    if (implications.length > 0) {
      analysis += `${implications.map(i => `• ${i}`).join('\n')}\n\n`;
    }
    
    // Add risk description for critical areas
    if (r.percentage < 40) {
      analysis += `For roles requiring complex judgment, this is a significant limitation.\n\n`;
    }
  });

  return analysis;
};

const generatePersonalityStructure = (categories, strengths, risks) => {
  const openness = categories.find(c => c.name.includes('Openness'))?.percentage || 0;
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness'))?.percentage || 0;
  const cognitive = categories.find(c => c.name.includes('Cognitive'))?.percentage || 0;
  const stress = categories.find(c => c.name.includes('Stress'))?.percentage || 0;
  
  let analysis = `🧠 **Personality Structure Interpretation**\n\n`;
  analysis += `This is an interesting contrast profile:\n\n`;
  analysis += `• Very high Openness (${openness}%)\n`;
  analysis += `• ${conscientiousness >= 70 ? 'High' : conscientiousness >= 50 ? 'Moderate' : 'Low'} Conscientiousness (${conscientiousness}%)\n`;
  analysis += `• ${cognitive >= 70 ? 'High' : cognitive >= 50 ? 'Moderate' : 'Very low'} Cognitive Pattern score (${cognitive}%)\n`;
  analysis += `• ${stress >= 70 ? 'High' : stress >= 50 ? 'Moderate' : 'Low'} Stress Management (${stress}%)\n\n`;

  if (openness >= 80 && cognitive < 50 && stress < 60) {
    analysis += `This can describe someone who:\n\n`;
    analysis += `• Has ideas\n`;
    analysis += `• Enjoys new concepts\n`;
    analysis += `• But struggles to structure thinking\n`;
    analysis += `• May not convert ideas into structured execution\n\n`;
    analysis += `High curiosity + weak cognitive structure = scattered potential.\n`;
  } else if (openness >= 70 && conscientiousness >= 70) {
    analysis += `This combination of high openness and conscientiousness suggests someone who can both generate ideas and execute them effectively.\n`;
  } else if (cognitive < 50 && stress < 50) {
    analysis += `The combination of low cognitive structure and poor stress management suggests someone who may struggle with complex, high-pressure situations.\n`;
  } else {
    analysis += `This profile shows a mix of strengths and development areas that need to be considered in context.\n`;
  }

  return analysis;
};

const generateRoleSuitability = (strengths, risks) => {
  const strengthNames = strengths.map(s => s.name);
  const riskNames = risks.map(r => r.name);
  
  let analysis = `🎯 **Role Suitability**\n\n`;
  
  // Suitable for
  analysis += `**Suitable For:**\n\n`;
  
  if (strengthNames.some(s => s.includes('Openness'))) {
    analysis += `• Creative or exploratory roles\n`;
    analysis += `• Research support roles\n`;
    analysis += `• Innovation brainstorming teams\n`;
  }
  if (strengthNames.some(s => s.includes('Conscientiousness'))) {
    analysis += `• Structured operational roles\n`;
    analysis += `• Project coordination\n`;
  }
  if (strengthNames.some(s => s.includes('Extraversion'))) {
    analysis += `• Collaborative team environments\n`;
  }
  if (strengths.length === 0 || (strengthNames.includes('Openness') && risks.length > 2)) {
    analysis += `• Environments with structured supervision\n`;
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
    analysis += `• Team leadership roles\n`;
  }
  if (riskNames.some(r => r.includes('Motivations'))) {
    analysis += `• Roles requiring high initiative\n`;
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
    analysis += `${index + 1}️⃣ **${getPriorityTitle(item.name, index)}**\n\n`;
    analysis += `${getDevelopmentRecommendation(item.name, item.percentage)}\n\n`;
  });

  return analysis;
};

const generateOverallInterpretation = (candidateName, avgScore, strengths, risks) => {
  const strengthCount = strengths.length;
  const riskCount = risks.length;
  const hasCognitiveRisk = risks.some(r => r.name.includes('Cognitive'));
  const hasStressRisk = risks.some(r => r.name.includes('Stress'));
  
  let analysis = `📌 **Overall Interpretation**\n\n`;
  
  if (strengthCount >= 2 && riskCount <= 2) {
    analysis += `This is a capable individual with clear strengths and manageable development areas. `;
  } else if (strengthCount >= 1 && riskCount >= 3) {
    analysis += `This is a curious, adaptable individual with moderate discipline but weak cognitive structure and stress resilience. `;
    if (hasCognitiveRisk && hasStressRisk) {
      analysis += `The candidate has growth potential but requires structured development before handling high-responsibility or high-pressure roles. `;
    }
  } else if (riskCount >= 4) {
    analysis += `This candidate requires significant development across multiple areas before being ready for increased responsibility. `;
  } else {
    analysis += `This candidate has growth potential with targeted development in key areas. `;
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

const getPriorityTitle = (name, index) => {
  if (name.includes('Cognitive')) return 'Cognitive Structuring';
  if (name.includes('Stress')) return 'Stress Resilience';
  if (name.includes('Motivations')) return 'Motivation Clarification';
  if (name.includes('Agreeableness')) return 'Interpersonal Development';
  if (name.includes('Performance')) return 'Performance Consistency';
  if (name.includes('Emotional')) return 'Emotional Intelligence Development';
  
  const defaults = ['Primary Development Area', 'Secondary Development Area', 'Tertiary Development Area', 'Additional Development Area'];
  return defaults[index] || 'Development Area';
};

const getStrengthNarrative = (name, percentage) => {
  const narratives = {
    'Openness to Experience': 'Exceptional strength. Strong curiosity and learning agility. Adaptability to new ideas. Innovation-friendly mindset. Willingness to experiment and explore.',
    'Conscientiousness': 'Reasonably organized. Moderately disciplined. Can follow through on tasks. Some reliability in execution.',
    'Integrity': 'Generally ethical. Likely trustworthy. Low probability of deliberate misconduct.',
    'Work Pace': 'Maintains steady output. Neither overly slow nor overly impulsive.',
    'Neuroticism': 'Emotionally stable. Handles pressure reasonably well.',
    'Extraversion': 'Balanced social engagement. Comfortable in team settings.',
    'Emotional Intelligence': 'Basic interpersonal awareness. Functional but not highly influential.',
    'Cognitive Patterns': 'Strong analytical thinking. Handles complex problems effectively.'
  };
  return narratives[name] || `Strong performance at ${percentage}%. This is a valuable asset.`;
};

const getStrengthIndicators = (name, percentage) => {
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

const getModerateNarrative = (name, percentage) => {
  const narratives = {
    'Emotional Intelligence': 'Basic interpersonal awareness. Functional but not highly influential.',
    'Extraversion': 'Balanced social engagement. Neither highly dominant nor withdrawn.',
    'Mixed Traits': 'Inconsistent behavioral tendencies. May behave differently under varying pressures.',
    'Behavioral Style': 'Moderately adaptable. Not strongly defined leadership presence.',
    'Neuroticism': 'Generally stable but may show stress in challenging situations.',
    'Work Pace': 'Maintains steady output. Neither overly slow nor overly impulsive.',
    'Conscientiousness': 'Reasonably organized. Moderately disciplined. Can follow through on tasks.'
  };
  return narratives[name] || `Shows moderate competency in this area with room for growth.`;
};

const getRiskNarrative = (name, percentage) => {
  const narratives = {
    'Cognitive Patterns': 'This is the most serious concern. Weak analytical structure. Poor strategic thinking. Difficulty organizing thoughts. Inconsistent reasoning patterns.',
    'Stress Management': 'Likely struggles under pressure. May experience performance dips in high-demand situations. Risk of emotional reactivity.',
    'Agreeableness': 'May appear blunt or less collaborative. Possible interpersonal friction. Not naturally cooperative.',
    'Motivations': 'Unclear internal drive. May lack strong achievement orientation. Needs external structure or incentives.',
    'Performance Risks': 'Inconsistency. Possible burnout vulnerability. Decision instability under pressure.',
    'Mixed Traits': 'Inconsistent behavioral tendencies. May behave differently under varying pressures.'
  };
  return narratives[name] || `Significant development needed in this area.`;
};

const getRiskImplications = (name, percentage) => {
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

const getDevelopmentRecommendation = (name, percentage) => {
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
