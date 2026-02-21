// utils/simpleAnalyzer.js

export const generateSimpleAnalysis = (categoryScores, candidateName) => {
  
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
  const strengths = categories.filter(c => c.percentage >= 70).sort((a, b) => b.percentage - a.percentage);
  const moderate = categories.filter(c => c.percentage >= 50 && c.percentage < 70).sort((a, b) => b.percentage - a.percentage);
  const risks = categories.filter(c => c.percentage < 50).sort((a, b) => a.percentage - b.percentage);

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateExecutiveSummary(candidateName, avgScore, strengths, risks),
    strengths: generateStrengthsSection(strengths),
    moderate: generateModerateSection(moderate),
    risks: generateRisksSection(risks),
    personalityStructure: generatePersonalityStructure(categories),
    roleSuitability: generateRoleSuitability(strengths, risks),
    developmentPriorities: generateDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateOverallInterpretation(candidateName, avgScore, strengths, risks)
  };
};

const generateExecutiveSummary = (candidateName, avgScore, strengths, risks) => {
  const hasHighOpenness = strengths.some(s => s.name.includes('Openness'));
  const hasConscientiousness = strengths.some(s => s.name.includes('Conscientiousness')) || 
                              strengths.some(s => s.name.includes('Work Pace'));
  
  let summary = `This profile reflects `;
  
  if (avgScore >= 70) {
    summary += `a strong performer with clear strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}.`;
  } else if (avgScore >= 50) {
    summary += `a moderate but uneven performer. `;
    
    if (hasHighOpenness) summary += `The candidate shows high openness `;
    if (hasConscientiousness) summary += `and decent work discipline, `;
    
    if (risks.length > 0) {
      summary += `but significant weaknesses in `;
      const riskDescriptions = [];
      if (risks.some(r => r.name.includes('Cognitive'))) riskDescriptions.push('cognitive processing');
      if (risks.some(r => r.name.includes('Stress'))) riskDescriptions.push('stress tolerance');
      if (risks.some(r => r.name.includes('Motivations'))) riskDescriptions.push('motivation clarity');
      if (risks.some(r => r.name.includes('Emotional'))) riskDescriptions.push('emotional stability');
      if (riskDescriptions.length === 0) {
        summary += risks.slice(0,3).map(r => r.name.toLowerCase()).join(', ');
      } else {
        summary += riskDescriptions.join(', ');
      }
      summary += '.';
    }
  } else {
    summary += `significant development needs across multiple areas.`;
  }

  summary += `\n\nThere is development potential, but performance consistency and decision-making reliability are current concerns.`;
  
  return summary;
};

const generateStrengthsSection = (strengths) => {
  if (strengths.length === 0) return '';

  let section = `🟢 **Key Strengths**\n\n`;
  
  strengths.forEach(s => {
    section += `**${s.name}** – ${s.percentage}% (${getGrade(s.percentage)})\n\n`;
    section += `${getStrengthDescription(s.name)}\n\n`;
    
    const indicators = getStrengthIndicators(s.name);
    if (indicators.length > 0) {
      section += `Indicates:\n\n`;
      indicators.forEach(i => section += `• ${i}\n`);
      section += `\n`;
    }
    
    section += `This is a major growth asset, especially in evolving environments.\n\n`;
  });

  return section;
};

const generateModerateSection = (moderate) => {
  if (moderate.length === 0) return '';

  let section = `🟡 **Moderate / Stable Areas**\n\n`;
  
  moderate.forEach(m => {
    section += `**${m.name}** – ${m.percentage}% (${getGrade(m.percentage)})\n\n`;
    section += `${getModerateDescription(m.name)}\n\n`;
  });

  return section;
};

const generateRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Development & Risk Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getRiskDescription(r.name, r.percentage)}\n\n`;
    
    const implications = getRiskImplications(r.name);
    if (implications.length > 0) {
      section += `May indicate:\n\n`;
      implications.forEach(i => section += `• ${i}\n`);
      section += `\n`;
    }
    
    if (r.percentage < 40) {
      section += `For roles requiring complex judgment, this is a significant limitation.\n\n`;
    }
  });

  return section;
};

const generatePersonalityStructure = (categories) => {
  const openness = categories.find(c => c.name.includes('Openness'))?.percentage || 0;
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness'))?.percentage || 0;
  const cognitive = categories.find(c => c.name.includes('Cognitive') || c.name.includes('Patterns'))?.percentage || 0;
  const stress = categories.find(c => c.name.includes('Stress'))?.percentage || 0;
  const extraversion = categories.find(c => c.name.includes('Extraversion'))?.percentage || 0;
  const agreeableness = categories.find(c => c.name.includes('Agreeableness'))?.percentage || 0;
  
  let section = `🧠 **Personality Structure Interpretation**\n\n`;
  
  if (openess > 0 || conscientiousness > 0 || cognitive > 0 || stress > 0) {
    section += `This is an interesting contrast profile:\n\n`;
    if (openess > 0) section += `• ${openess >= 70 ? 'Very high' : openess >= 50 ? 'Moderate' : 'Low'} Openness (${openess}%)\n`;
    if (conscientiousness > 0) section += `• ${conscientiousness >= 70 ? 'High' : conscientiousness >= 50 ? 'Moderate' : 'Low'} Conscientiousness (${conscientiousness}%)\n`;
    if (cognitive > 0) section += `• ${cognitive >= 70 ? 'High' : cognitive >= 50 ? 'Moderate' : 'Very low'} Cognitive Pattern score (${cognitive}%)\n`;
    if (stress > 0) section += `• ${stress >= 70 ? 'High' : stress >= 50 ? 'Moderate' : 'Low'} Stress Management (${stress}%)\n`;
    if (extraversion > 0) section += `• ${extraversion >= 70 ? 'High' : extraversion >= 50 ? 'Moderate' : 'Low'} Extraversion (${extraversion}%)\n`;
    if (agreeableness > 0) section += `• ${agreeableness >= 70 ? 'High' : agreeableness >= 50 ? 'Moderate' : 'Low'} Agreeableness (${agreeableness}%)\n`;
    
    section += `\n`;
    
    if (openess >= 70 && cognitive < 50 && stress < 60) {
      section += `This can describe someone who:\n\n`;
      section += `• Has ideas\n`;
      section += `• Enjoys new concepts\n`;
      section += `• But struggles to structure thinking\n`;
      section += `• May not convert ideas into structured execution\n\n`;
      section += `High curiosity + weak cognitive structure = scattered potential.\n`;
    } else if (openess >= 70 && conscientiousness >= 70) {
      section += `This combination of high openness and conscientiousness suggests someone who can both generate ideas and execute them effectively.\n`;
    } else if (cognitive < 50 && stress < 50) {
      section += `The combination of low cognitive structure and poor stress management suggests someone who may struggle with complex, high-pressure situations.\n`;
    }
  } else {
    section += `The profile shows a mix of strengths and development areas that need to be considered in context.\n`;
  }
  
  return section;
};

const generateRoleSuitability = (strengths, risks) => {
  const strengthNames = strengths.map(s => s.name);
  const riskNames = risks.map(r => r.name);
  
  let section = `🎯 **Role Suitability**\n\n`;
  
  // Suitable For
  section += `**Suitable For:**\n\n`;
  
  if (strengthNames.some(s => s.includes('Openness'))) {
    section += `• Creative or exploratory roles\n`;
    section += `• Research support roles\n`;
    section += `• Innovation brainstorming teams\n`;
  }
  
  if (strengthNames.some(s => s.includes('Conscientiousness')) || strengthNames.some(s => s.includes('Work Pace'))) {
    section += `• Structured operational roles\n`;
  }
  
  if (strengthNames.some(s => s.includes('Extraversion'))) {
    section += `• Collaborative team environments\n`;
  }
  
  if (strengthNames.some(s => s.includes('Emotional'))) {
    section += `• Team support roles\n`;
  }
  
  if (section.endsWith('**Suitable For:**\n\n')) {
    section += `• Entry-level positions with clear guidance\n`;
  }
  
  if (risks.length > 0) {
    section += `• Environments with structured supervision\n`;
  }
  
  section += `\n**Risky For:**\n\n`;
  
  if (riskNames.some(r => r.includes('Cognitive'))) {
    section += `• Senior leadership\n`;
    section += `• Strategic decision-making roles\n`;
  }
  if (riskNames.some(r => r.includes('Stress'))) {
    section += `• High-pressure operational roles\n`;
    section += `• Crisis management positions\n`;
  }
  if (riskNames.some(r => r.includes('Agreeableness'))) {
    section += `• Client-facing positions\n`;
  }
  if (riskNames.some(r => r.includes('Motivations'))) {
    section += `• Roles requiring high initiative\n`;
  }
  
  if (section.endsWith('**Risky For:**\n\n')) {
    section += `• No significant role risks identified\n`;
  }

  return section;
};

const generateDevelopmentPriorities = (risks, moderate) => {
  const priorities = [...risks, ...moderate].sort((a, b) => a.percentage - b.percentage).slice(0, 4);
  
  if (priorities.length === 0) return '';

  let section = `📈 **Development Priorities**\n\n`;
  
  priorities.forEach((item, index) => {
    const number = index + 1;
    const emoji = number === 1 ? '1️⃣' : number === 2 ? '2️⃣' : number === 3 ? '3️⃣' : '4️⃣';
    const title = getPriorityTitle(item.name);
    section += `${emoji} **${title}**\n\n`;
    section += `${getDevelopmentRecommendation(item.name)}\n\n`;
  });

  return section;
};

const generateOverallInterpretation = (candidateName, avgScore, strengths, risks) => {
  const hasOpenness = strengths.some(s => s.name.includes('Openness'));
  const hasCognitiveRisk = risks.some(r => r.name.includes('Cognitive'));
  const hasStressRisk = risks.some(r => r.name.includes('Stress'));
  const riskCount = risks.length;
  
  let section = `📌 **Overall Interpretation**\n\n`;
  
  if (avgScore >= 70) {
    section += `This is a capable individual with clear strengths and manageable development areas. `;
  } else if (avgScore >= 50) {
    if (hasOpenness && hasCognitiveRisk && hasStressRisk) {
      section += `This is a curious, adaptable individual with moderate discipline but weak cognitive structure and stress resilience. `;
      section += `The candidate has growth potential but requires structured development before handling high-responsibility or high-pressure roles. `;
    } else if (riskCount >= 3) {
      section += `This candidate has potential but requires significant development in key areas. `;
    } else {
      section += `This candidate has growth potential with targeted development in key areas. `;
    }
  } else {
    section += `This candidate requires significant development across multiple areas before being ready for increased responsibility. `;
  }
  
  return section;
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

const getStrengthDescription = (name) => {
  const descriptions = {
    'Openness to Experience': 'Exceptional strength.',
    'Conscientiousness': 'Reasonably organized. Moderately disciplined. Can follow through on tasks. Some reliability in execution.',
    'Integrity': 'Generally ethical. Likely trustworthy. Low probability of deliberate misconduct.',
    'Work Pace': 'Maintains steady output. Neither overly slow nor overly impulsive.',
    'Extraversion': 'Balanced social engagement. Comfortable in team settings.',
    'Emotional Intelligence': 'Basic interpersonal awareness. Functional but not highly influential.',
    'Neuroticism': 'Emotionally stable. Handles pressure reasonably well.',
    'Cognitive Patterns': 'Strong analytical thinking. Handles complex problems effectively.'
  };
  return descriptions[name] || 'Strong performance in this area.';
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

const getModerateDescription = (name) => {
  const descriptions = {
    'Emotional Intelligence': 'Basic interpersonal awareness. Functional but not highly influential.',
    'Extraversion': 'Balanced social engagement. Neither highly dominant nor withdrawn.',
    'Mixed Traits': 'Inconsistent behavioral tendencies. May behave differently under varying pressures.',
    'Behavioral Style': 'Moderately adaptable. Not strongly defined leadership presence.',
    'Conscientiousness': 'Reasonably organized. Moderately disciplined. Can follow through on tasks.',
    'Work Pace': 'Maintains steady output. Neither overly slow nor overly impulsive.',
    'Neuroticism': 'Generally stable but may show stress in challenging situations.'
  };
  return descriptions[name] || 'Shows moderate competency in this area with room for growth.';
};

const getRiskDescription = (name, percentage) => {
  const descriptions = {
    'Cognitive Patterns': 'This is the most serious concern.',
    'Stress Management': 'Likely struggles under pressure. May experience performance dips in high-demand situations. Risk of emotional reactivity.',
    'Agreeableness': 'May appear blunt or less collaborative. Possible interpersonal friction. Not naturally cooperative.',
    'Motivations': 'Unclear internal drive. May lack strong achievement orientation. Needs external structure or incentives.',
    'Performance Risks': 'Suggests inconsistency. Possible burnout vulnerability. Decision instability under pressure.',
    'Mixed Traits': 'Inconsistent behavioral tendencies. May behave differently under varying pressures.',
    'Emotional Intelligence': 'Struggles with self-awareness and interpersonal dynamics.'
  };
  return descriptions[name] || 'Significant development needed in this area.';
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

const getPriorityTitle = (name) => {
  if (name.includes('Cognitive')) return 'Cognitive Structuring';
  if (name.includes('Stress')) return 'Stress Resilience';
  if (name.includes('Motivations')) return 'Motivation Clarification';
  if (name.includes('Agreeableness')) return 'Interpersonal Development';
  if (name.includes('Performance')) return 'Performance Consistency';
  if (name.includes('Emotional')) return 'Emotional Intelligence Development';
  if (name.includes('Mixed')) return 'Behavioral Consistency';
  return 'Development Priority';
};

const getDevelopmentRecommendation = (name) => {
  const recommendations = {
    'Cognitive Patterns': 'Critical thinking training. Structured decision-making frameworks. Analytical writing exercises.',
    'Stress Management': 'Stress management coaching. Pressure simulation exercises. Mindfulness and emotional regulation training.',
    'Agreeableness': 'Conflict management training. Collaboration workshops. Assertiveness training.',
    'Motivations': 'Goal-setting alignment. KPI-based accountability. Performance coaching.',
    'Performance Risks': 'Performance monitoring. Regular feedback sessions. Stress management techniques.',
    'Mixed Traits': 'Behavioral coaching. Self-awareness exercises. Feedback sessions.',
    'Emotional Intelligence': 'EI workshops. Active listening practice. Empathy exercises.',
    'Extraversion': 'Social skills training. Gradual exposure to team settings.',
    'Work Pace': 'Time management training. Productivity tools and techniques.'
  };
  return recommendations[name] || 'Targeted training and structured development in this area.';
};
