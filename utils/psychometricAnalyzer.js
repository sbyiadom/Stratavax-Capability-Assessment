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

  // Sort categories by percentage for different sections
  const strengths = categories.filter(c => c.percentage >= 70);
  const moderate = categories.filter(c => c.percentage >= 50 && c.percentage < 70);
  const risks = categories.filter(c => c.percentage < 50);
  
  // Sort risks by percentage (lowest first) for development focus
  const sortedRisks = [...risks].sort((a, b) => a.percentage - b.percentage);
  
  // Get key categories for narrative
  const cognitivePattern = categories.find(c => c.name.includes('Cognitive') || c.name.includes('Logical')) || { percentage: 0, name: 'Cognitive Patterns' };
  const stressManagement = categories.find(c => c.name.includes('Stress')) || { percentage: 0, name: 'Stress Management' };
  const emotionalIntelligence = categories.find(c => c.name.includes('Emotional')) || { percentage: 0, name: 'Emotional Intelligence' };
  const openness = categories.find(c => c.name.includes('Openness')) || { percentage: 0, name: 'Openness to Experience' };
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness')) || { percentage: 0, name: 'Conscientiousness' };
  const extraversion = categories.find(c => c.name.includes('Extraversion')) || { percentage: 0, name: 'Extraversion' };
  const agreeableness = categories.find(c => c.name.includes('Agreeableness')) || { percentage: 0, name: 'Agreeableness' };
  const motivations = categories.find(c => c.name.includes('Motivations')) || { percentage: 0, name: 'Motivations' };
  const performance = categories.find(c => c.name.includes('Performance')) || { percentage: 0, name: 'Performance Risks' };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0, name: 'Integrity' };
  const workPace = categories.find(c => c.name.includes('Work Pace')) || { percentage: 0, name: 'Work Pace' };
  const neuroticism = categories.find(c => c.name.includes('Neuroticism')) || { percentage: 0, name: 'Neuroticism' };

  // Generate the analysis based on the structure you provided
  return {
    overallProfilePattern: generateOverallProfilePattern(avgScore, strengths.length, risks.length, categories, candidateName),
    cognitiveProcessingStyle: generateCognitiveProcessingStyle(categories, cognitivePattern, candidateName),
    behavioralTendencies: generateBehavioralTendencies(categories, extraversion, agreeableness, conscientiousness, candidateName),
    interpersonalDynamics: generateInterpersonalDynamics(categories, emotionalIntelligence, extraversion, agreeableness, candidateName),
    workStylePreferences: generateWorkStylePreferences(categories, workPace, conscientiousness, openness, candidateName),
    potentialDerailers: generatePotentialDerailers(risks, sortedRisks, candidateName),
    developmentalFocusAreas: generateDevelopmentalFocusAreas(sortedRisks, moderate, candidateName),
    strengthsToLeverage: generateStrengthsToLeverage(strengths, candidateName),
    riskFactors: generateRiskFactors(risks, sortedRisks, candidateName),
    summaryInterpretation: generateSummaryInterpretation(candidateName, avgScore, strengths, risks, cognitivePattern, stressManagement)
  };
};

const generateOverallProfilePattern = (avgScore, strengthsCount, risksCount, categories, candidateName) => {
  let narrative = `**Overall Profile Pattern**\n\n`;
  
  if (avgScore >= 70) {
    narrative += `This profile reflects a strong performer with clear strengths in ${strengthsCount} areas and manageable development needs.`;
  } else if (avgScore >= 50) {
    narrative += `This profile reflects a moderate but uneven performer. `;
    if (risksCount >= 3) {
      narrative += `The candidate shows some strengths but significant weaknesses in ${risksCount} key areas.`;
    } else {
      narrative += `The candidate shows balanced performance with room for growth in several areas.`;
    }
  } else {
    narrative += `This profile reflects significant development needs across multiple areas. `;
    narrative += `Performance consistency and decision-making reliability are current concerns.`;
  }
  
  return narrative;
};

const generateCognitiveProcessingStyle = (categories, cognitivePattern, candidateName) => {
  let narrative = `**Cognitive Processing Style**\n\n`;
  
  if (cognitivePattern.percentage >= 70) {
    narrative += `Strong analytical thinking. Handles complex problems effectively.`;
  } else if (cognitivePattern.percentage >= 50) {
    narrative += `Moderate cognitive abilities. Benefits from structured approaches.`;
  } else {
    narrative += `This is the most serious concern. Weak analytical structure. Poor strategic thinking. Difficulty organizing thoughts. Inconsistent reasoning patterns.`;
  }
  
  // Add specific reasoning details
  const verbal = categories.find(c => c.name.includes('Verbal'))?.percentage || 0;
  const numerical = categories.find(c => c.name.includes('Numerical'))?.percentage || 0;
  const logical = categories.find(c => c.name.includes('Logical'))?.percentage || 0;
  
  if (verbal < 50 || numerical < 50 || logical < 50) {
    narrative += `\n\nSpecific challenges include:`;
    if (verbal < 50) narrative += `\n• Weak verbal reasoning affecting comprehension and expression`;
    if (numerical < 50) narrative += `\n• Difficulty with numerical data and quantitative analysis`;
    if (logical < 50) narrative += `\n• Poor logical reasoning impacting problem-solving`;
  }
  
  return narrative;
};

const generateBehavioralTendencies = (categories, extraversion, agreeableness, conscientiousness, candidateName) => {
  let narrative = `**Behavioral Tendencies**\n\n`;
  
  if (extraversion.percentage >= 70) {
    narrative += `Energized by social interaction. Comfortable in team environments. `;
  } else if (extraversion.percentage >= 50) {
    narrative += `Balanced social engagement. Neither highly dominant nor withdrawn. `;
  } else {
    narrative += `Prefers independent work. May find excessive social interaction draining. `;
  }
  
  if (agreeableness.percentage >= 70) {
    narrative += `Highly cooperative and compassionate. Builds strong relationships. `;
  } else if (agreeableness.percentage >= 50) {
    narrative += `Generally cooperative. Works well with others. `;
  } else {
    narrative += `May appear blunt or less collaborative. Possible interpersonal friction. Not naturally cooperative. `;
  }
  
  if (conscientiousness.percentage >= 70) {
    narrative += `Highly organized and dependable. Strong attention to detail.`;
  } else if (conscientiousness.percentage >= 50) {
    narrative += `Reasonably organized. Moderately disciplined. Can follow through on tasks.`;
  } else {
    narrative += `Struggles with organization and follow-through. Needs structure and accountability.`;
  }
  
  return narrative;
};

const generateInterpersonalDynamics = (categories, emotionalIntelligence, extraversion, agreeableness, candidateName) => {
  let narrative = `**Interpersonal Dynamics**\n\n`;
  
  if (emotionalIntelligence.percentage >= 70) {
    narrative += `High emotional intelligence. Self-aware and empathetic. Navigates interpersonal situations effectively.`;
  } else if (emotionalIntelligence.percentage >= 50) {
    narrative += `Basic interpersonal awareness. Functional but not highly influential.`;
  } else {
    narrative += `Poor emotional intelligence. Challenges with interpersonal relationships. May struggle to read social cues.`;
  }
  
  if (extraversion.percentage < 50 && agreeableness.percentage < 50) {
    narrative += `\n\nCombination of low extraversion and low agreeableness may lead to social withdrawal and interpersonal friction.`;
  } else if (extraversion.percentage >= 70 && agreeableness.percentage >= 70) {
    narrative += `\n\nStrong combination of social engagement and cooperation makes this individual naturally effective in team settings.`;
  }
  
  return narrative;
};

const generateWorkStylePreferences = (categories, workPace, conscientiousness, openness, candidateName) => {
  let narrative = `**Work Style Preferences**\n\n`;
  
  if (workPace.percentage >= 70) {
    narrative += `Highly productive and efficient. Thrives in deadline-driven environments. `;
  } else if (workPace.percentage >= 50) {
    narrative += `Maintains steady output. Neither overly slow nor overly impulsive. `;
  } else {
    narrative += `Struggles to maintain consistent work pace. Needs time management support. `;
  }
  
  if (conscientiousness.percentage >= 70) {
    narrative += `Organized and methodical. Prefers clear structure and defined processes. `;
  } else if (conscientiousness.percentage >= 50) {
    narrative += `Moderately organized. Can work within structured environments. `;
  } else {
    narrative += `Prefers flexibility but may struggle with organization and follow-through. `;
  }
  
  if (openness.percentage >= 70) {
    narrative += `Enjoys new challenges and adapts well to change.`;
  } else if (openness.percentage >= 50) {
    narrative += `Open to new approaches when properly introduced.`;
  } else {
    narrative += `Prefers familiar routines and may resist change.`;
  }
  
  return narrative;
};

const generatePotentialDerailers = (risks, sortedRisks, candidateName) => {
  if (risks.length === 0) {
    return `**Potential Derailers**\n\nNo significant derailers identified at this time.`;
  }
  
  let narrative = `**Potential Derailers**\n\n`;
  narrative += `The following areas represent potential derailers that could impact performance:\n\n`;
  
  sortedRisks.slice(0, 3).forEach(risk => {
    narrative += `• **${risk.name}** (${risk.percentage}%): ${getDerailerDescription(risk.name, risk.percentage)}\n`;
  });
  
  return narrative;
};

const generateDevelopmentalFocusAreas = (sortedRisks, moderate, candidateName) => {
  const focusAreas = [...sortedRisks, ...moderate].slice(0, 3);
  
  if (focusAreas.length === 0) {
    return `**Developmental Focus Areas**\n\nNo specific developmental focus areas identified. Continue to build on existing strengths.`;
  }
  
  let narrative = `**Developmental Focus Areas**\n\n`;
  
  focusAreas.forEach((area, index) => {
    narrative += `**Priority ${index + 1}: ${area.name}** – Current level ${area.percentage}%. `;
    narrative += `${getDevelopmentFocusDescription(area.name, area.percentage)}\n\n`;
  });
  
  return narrative;
};

const generateStrengthsToLeverage = (strengths, candidateName) => {
  if (strengths.length === 0) {
    return `**Strengths to Leverage**\n\nNo significant strengths identified at this time. Focus should be on foundational development.`;
  }
  
  let narrative = `**Strengths to Leverage**\n\n`;
  
  strengths.forEach(strength => {
    narrative += `• **${strength.name}** (${strength.percentage}%): ${getStrengthLeverageDescription(strength.name, strength.percentage)}\n`;
  });
  
  return narrative;
};

const generateRiskFactors = (risks, sortedRisks, candidateName) => {
  if (risks.length === 0) {
    return `**Risk Factors**\n\nNo significant risk factors identified.`;
  }
  
  let narrative = `**Risk Factors**\n\n`;
  narrative += `The following areas represent significant challenges that need attention:\n\n`;
  
  sortedRisks.slice(0, 3).forEach(risk => {
    let riskLevel = risk.percentage < 40 ? 'Critical' : 'High';
    narrative += `• **${risk.name}** (${risk.percentage}%): ${riskLevel} risk. ${getRiskFactorDescription(risk.name, risk.percentage)}\n`;
  });
  
  return narrative;
};

const generateSummaryInterpretation = (candidateName, avgScore, strengths, risks, cognitivePattern, stressManagement) => {
  let narrative = `**Summary Interpretation**\n\n`;
  
  if (avgScore >= 70) {
    narrative += `This is a capable individual with clear strengths and manageable development areas. `;
  } else if (avgScore >= 50) {
    if (cognitivePattern.percentage < 50 && stressManagement.percentage < 50) {
      narrative += `This is a curious, adaptable individual with moderate discipline but weak cognitive structure and stress resilience. `;
      narrative += `The candidate has growth potential but requires structured development before handling high-responsibility or high-pressure roles. `;
    } else if (risks.length >= 3) {
      narrative += `This candidate has potential but requires significant development in ${risks.slice(0,3).map(r => r.name.toLowerCase()).join(', ')}. `;
    } else {
      narrative += `This candidate has growth potential with targeted development in key areas. `;
    }
  } else {
    narrative += `This candidate requires significant development across multiple areas before being ready for increased responsibility. `;
  }
  
  return narrative;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getDerailerDescription = (name, percentage) => {
  const descriptions = {
    'Cognitive Patterns': 'Weak analytical structure and poor strategic thinking will limit ability to handle complex problems.',
    'Stress Management': 'Likely struggles under pressure. May experience performance dips in high-demand situations.',
    'Agreeableness': 'May create interpersonal friction and struggle with team collaboration.',
    'Motivations': 'Unclear internal drive. May lack strong achievement orientation.',
    'Performance Risks': 'Inconsistency and possible burnout vulnerability.',
    'Mixed Traits': 'Inconsistent behavioral tendencies under pressure.',
    'Emotional Intelligence': 'May struggle with self-awareness and interpersonal dynamics.'
  };
  return descriptions[name] || 'This area requires development to reach expected levels.';
};

const getDevelopmentFocusDescription = (name, percentage) => {
  const descriptions = {
    'Cognitive Patterns': 'Critical thinking training. Structured decision-making frameworks. Analytical writing exercises.',
    'Stress Management': 'Stress management coaching. Pressure simulation exercises. Mindfulness and emotional regulation training.',
    'Agreeableness': 'Conflict management training. Collaboration workshops. Assertiveness training.',
    'Motivations': 'Goal-setting alignment. KPI-based accountability. Performance coaching.',
    'Performance Risks': 'Performance monitoring. Regular feedback sessions. Stress management techniques.',
    'Mixed Traits': 'Behavioral coaching. Self-awareness exercises. Feedback sessions.',
    'Emotional Intelligence': 'EI workshops. Active listening practice. Empathy exercises.'
  };
  return descriptions[name] || 'Targeted training and structured development in this area.';
};

const getStrengthLeverageDescription = (name, percentage) => {
  const descriptions = {
    'Openness to Experience': 'Can be leveraged for innovation, adaptability, and exploring new approaches.',
    'Conscientiousness': 'Can be leveraged for project coordination, quality control, and reliable execution.',
    'Integrity': 'Can be leveraged for compliance roles, ethics oversight, and building trust.',
    'Work Pace': 'Can be leveraged for deadline-driven tasks and consistent output.',
    'Neuroticism': 'Can be leveraged for maintaining calm in stressful situations.',
    'Extraversion': 'Can be leveraged for team collaboration and client-facing roles.',
    'Emotional Intelligence': 'Can be leveraged for team leadership and conflict resolution.'
  };
  return descriptions[name] || 'This strength can be leveraged in appropriate roles.';
};

const getRiskFactorDescription = (name, percentage) => {
  const descriptions = {
    'Cognitive Patterns': 'Will significantly impact problem-solving, strategic thinking, and learning new concepts.',
    'Stress Management': 'Will lead to performance inconsistency under pressure and potential burnout.',
    'Agreeableness': 'May cause team friction and difficulty in collaborative environments.',
    'Motivations': 'May result in low initiative and require constant external direction.',
    'Performance Risks': 'Will lead to inconsistent output and missed deadlines.',
    'Mixed Traits': 'May result in unpredictable behavior under stress.'
  };
  return descriptions[name] || 'Critical area needing immediate intervention.';
};
