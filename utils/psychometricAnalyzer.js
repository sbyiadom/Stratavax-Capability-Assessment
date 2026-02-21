// utils/psychometricAnalyzer.js

export const generatePsychometricAnalysis = (categoryScores, assessmentType, candidateName, responseInsights) => {
  
  // Get all categories and their scores
  const categories = Object.entries(categoryScores).map(([name, data]) => ({
    name,
    score: data.score,
    maxPossible: data.maxPossible,
    percentage: data.percentage
  }));

  // Sort categories by percentage (lowest first for development focus)
  const sortedByPercentage = [...categories].sort((a, b) => a.percentage - b.percentage);
  
  // Identify strengths (≥70%) and weaknesses (<50%)
  const strengths = categories.filter(c => c.percentage >= 70);
  const weaknesses = categories.filter(c => c.percentage < 50);
  const developing = categories.filter(c => c.percentage >= 50 && c.percentage < 70);

  // Calculate overall statistics
  const avgScore = categories.reduce((sum, c) => sum + c.percentage, 0) / categories.length;

  console.log(`Generating analysis for assessment type: ${assessmentType}`);
  console.log('Categories found:', categories.map(c => `${c.name}: ${c.percentage}%`));

  // Route to the appropriate assessment type analyzer
  switch(assessmentType) {
    case 'cognitive':
      return generateCognitiveAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'general':
      return generateGeneralAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'leadership':
      return generateLeadershipAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'technical':
      return generateTechnicalAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'personality':
      return generatePersonalityAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'performance':
      return generatePerformanceAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'behavioral':
      return generateBehavioralAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    case 'cultural':
      return generateCulturalAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
    default:
      console.warn(`Unknown assessment type: ${assessmentType}, defaulting to general analysis`);
      return generateGeneralAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage);
  }
};

// ============================================
// COGNITIVE ASSESSMENT ANALYZER
// ============================================
const generateCognitiveAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  // Create a map of all categories for easy reference
  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.name] = c; });

  return {
    overallPattern: getCognitiveOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Cognitive Processing Analysis**

${candidateName}'s cognitive assessment reveals the following pattern across ${categories.length} cognitive domains:

${categories.map(c => `• **${c.name}** (${c.percentage}%): ${getCognitiveScoreInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Learning & Processing Style**

Based on the cognitive profile, ${candidateName} demonstrates:

• **Primary Processing Mode**: ${getPrimaryProcessingMode(categories)}
• **Learning Style**: ${getLearningStyle(categories)}
• **Problem-Solving Approach**: ${getProblemSolvingApproach(categories)}
• **Information Processing Speed**: ${getProcessingSpeed(categories)}`,

    interpersonalDynamics: `**👥 Impact on Daily Functioning**

These cognitive patterns affect how ${candidateName} handles:

• **Communication**: ${getCognitiveCommunicationStyle(categoryMap['Verbal Reasoning']?.percentage || 0)}
• **Attention to Detail**: ${getAttentionToDetail(categoryMap['Memory & Attention']?.percentage || 0)}
• **Complex Tasks**: ${getTaskComplexityPreference(categories)}`,

    workStyle: `**💼 Workplace Implications**

In a work environment, ${candidateName} will likely:

• **With Instructions**: ${getInformationPresentationStyle(categories)}
• **With New Skills**: ${getLearningPreference(categories)}
• **With Decisions**: ${getDecisionMakingStyle(categories)}`,

    derailers: `**⚠️ Cognitive Challenges**

The following areas present significant challenges:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getCognitiveChallengeDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant cognitive challenges identified.'}`,

    developmentalFocus: `**📈 Priority Development Areas**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getCognitiveDevelopmentPlan(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Cognitive Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getCognitiveStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Cognitive Strengths**

No significant cognitive strengths were identified. Focus should be on foundational skill building.`,

    riskFactors: `**🚨 Critical Risk Areas**

The following areas represent significant risks that require immediate attention:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical deficiency that will significantly impact performance in roles requiring this capability.`
).join('\n')}`,

    summary: `**📊 Cognitive Summary**

${candidateName} presents a cognitive profile with ${strengths.length} strengths and ${weaknesses.length} areas needing development. 
Primary challenges are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}${weaknesses.length > 3 ? ' and other areas' : ''}. 
This individual would benefit most from ${getCognitiveOverallRecommendation(categories)}.`
  };
};

// ============================================
// GENERAL ASSESSMENT ANALYZER
// ============================================
const generateGeneralAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getGeneralOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Cognitive & Analytical Profile**

${candidateName}'s general assessment reveals the following cognitive characteristics:

${categories.filter(c => 
  c.name.includes('Cognitive') || 
  c.name.includes('Problem') || 
  c.name.includes('Technical')
).map(c => `• **${c.name}** (${c.percentage}%): ${getGeneralCognitiveInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Behavioral & Personality Profile**

The assessment reveals the following behavioral characteristics:

${categories.filter(c => 
  c.name.includes('Personality') || 
  c.name.includes('Emotional') || 
  c.name.includes('Stress') ||
  c.name.includes('Work Pace')
).map(c => `• **${c.name}** (${c.percentage}%): ${getGeneralBehavioralInterpretation(c.name, c.percentage)}`).join('\n')}`,

    interpersonalDynamics: `**👥 Interpersonal & Communication Profile**

${candidateName}'s interpersonal characteristics are reflected in:

${categories.filter(c => 
  c.name.includes('Communication') || 
  c.name.includes('Cultural') || 
  c.name.includes('Ethics') ||
  c.name.includes('Integrity')
).map(c => `• **${c.name}** (${c.percentage}%): ${getGeneralInterpersonalInterpretation(c.name, c.percentage)}`).join('\n')}`,

    workStyle: `**💼 Work Style & Performance Profile**

The assessment indicates the following work style preferences:

${categories.filter(c => 
  c.name.includes('Leadership') || 
  c.name.includes('Management') || 
  c.name.includes('Performance')
).map(c => `• **${c.name}** (${c.percentage}%): ${getGeneralWorkStyleInterpretation(c.name, c.percentage)}`).join('\n')}`,

    derailers: `**⚠️ Potential Derailers**

The following areas represent potential derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getGeneralDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant derailers identified.'}`,

    developmentalFocus: `**📈 Priority Development Areas**

Based on the assessment results, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getGeneralDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Key Strengths to Leverage**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getGeneralStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Key Strengths to Leverage**

No significant strengths were identified. Focus should be on foundational development.`,

    riskFactors: `**🚨 Critical Risk Factors**

The following areas represent significant risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical risk that will significantly impact overall performance.`
).join('\n')}`,

    summary: `**📊 Overall Summary**

${candidateName} presents a profile with ${strengths.length} strengths and ${weaknesses.length} development areas. 
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}. 
This individual would benefit most from ${getGeneralOverallRecommendation(categories)}.`
  };
};

// ============================================
// LEADERSHIP ASSESSMENT ANALYZER
// ============================================
const generateLeadershipAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getLeadershipOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Strategic Thinking Profile**

${candidateName}'s leadership assessment reveals the following strategic capabilities:

${categories.filter(c => 
  c.name.includes('Vision') || 
  c.name.includes('Strategic') || 
  c.name.includes('Decision')
).map(c => `• **${c.name}** (${c.percentage}%): ${getLeadershipStrategicInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Leadership Style & Approach**

The assessment reveals the following leadership tendencies:

${categories.filter(c => 
  c.name.includes('Communication') || 
  c.name.includes('Influence') || 
  c.name.includes('Change')
).map(c => `• **${c.name}** (${c.percentage}%): ${getLeadershipStyleInterpretation(c.name, c.percentage)}`).join('\n')}`,

    interpersonalDynamics: `**👥 People Management Profile**

${candidateName}'s approach to managing others is characterized by:

${categories.filter(c => 
  c.name.includes('People') || 
  c.name.includes('Coaching') || 
  c.name.includes('Emotional') ||
  c.name.includes('Cultural')
).map(c => `• **${c.name}** (${c.percentage}%): ${getLeadershipPeopleInterpretation(c.name, c.percentage)}`).join('\n')}`,

    workStyle: `**💼 Leadership Work Style**

The assessment indicates the following leadership work style:

${categories.filter(c => 
  c.name.includes('Execution') || 
  c.name.includes('Results') || 
  c.name.includes('Resilience') ||
  c.name.includes('Self')
).map(c => `• **${c.name}** (${c.percentage}%): ${getLeadershipWorkStyleInterpretation(c.name, c.percentage)}`).join('\n')}`,

    derailers: `**⚠️ Leadership Derailers**

The following areas represent potential leadership derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getLeadershipDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant leadership derailers identified.'}`,

    developmentalFocus: `**📈 Leadership Development Priorities**

Based on the assessment, prioritize leadership development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getLeadershipDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Leadership Strengths to Leverage**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getLeadershipStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Leadership Strengths to Leverage**

No significant leadership strengths were identified.`,

    riskFactors: `**🚨 Leadership Risk Factors**

The following areas represent significant leadership risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical risk for leadership effectiveness.`
).join('\n')}`,

    summary: `**📊 Leadership Summary**

${candidateName} demonstrates leadership potential with ${strengths.length} identified strengths and ${weaknesses.length} areas for development. 
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// TECHNICAL ASSESSMENT ANALYZER
// ============================================
const generateTechnicalAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getTechnicalOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Technical Knowledge Profile**

${candidateName}'s technical assessment reveals the following knowledge areas:

${categories.map(c => `• **${c.name}** (${c.percentage}%): ${getTechnicalKnowledgeInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Technical Application Style**

The assessment reveals the following technical tendencies:

${categories.filter(c => 
  c.name.includes('Troubleshooting') || 
  c.name.includes('Practical') || 
  c.name.includes('Process')
).map(c => `• **${c.name}** (${c.percentage}%): ${getTechnicalApplicationInterpretation(c.name, c.percentage)}`).join('\n')}`,

    workStyle: `**💼 Technical Work Style**

${candidateName}'s technical work style is characterized by:

${categories.filter(c => 
  c.name.includes('Equipment') || 
  c.name.includes('Maintenance') || 
  c.name.includes('Safety') ||
  c.name.includes('Quality')
).map(c => `• **${c.name}** (${c.percentage}%): ${getTechnicalWorkStyleInterpretation(c.name, c.percentage)}`).join('\n')}`,

    derailers: `**⚠️ Technical Derailers**

The following areas represent potential technical derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getTechnicalDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant technical derailers identified.'}`,

    developmentalFocus: `**📈 Technical Development Priorities**

Based on the assessment, prioritize technical development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getTechnicalDevelopmentPlan(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Technical Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getTechnicalStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Technical Strengths**

No significant technical strengths were identified.`,

    riskFactors: `**🚨 Technical Risk Factors**

The following areas represent significant technical risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical risk for technical roles.`
).join('\n')}`,

    summary: `**📊 Technical Summary**

${candidateName} demonstrates technical competence with ${strengths.length} strengths and ${weaknesses.length} areas for development. 
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// PERSONALITY ASSESSMENT ANALYZER
// ============================================
const generatePersonalityAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getPersonalityOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Personality Structure**

${candidateName}'s personality assessment reveals the following core dimensions:

${categories.map(c => `• **${c.name}** (${c.percentage}%): ${getPersonalityTraitInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Behavioral Tendencies**

The assessment reveals the following behavioral patterns:

${categories.filter(c => 
  c.name.includes('Integrity') || 
  c.name.includes('Emotional') || 
  c.name.includes('Stress') ||
  c.name.includes('Motivations')
).map(c => `• **${c.name}** (${c.percentage}%): ${getPersonalityBehavioralInterpretation(c.name, c.percentage)}`).join('\n')}`,

    workStyle: `**💼 Work Style Preferences**

${candidateName}'s work style is characterized by:

• **Work Pace**: ${getPersonalityWorkPaceInterpretation(categories.find(c => c.name.includes('Work Pace'))?.percentage || 0)}
• **Collaboration Style**: ${getPersonalityCollaborationStyle(
  categories.find(c => c.name.includes('Extraversion'))?.percentage || 0,
  categories.find(c => c.name.includes('Agreeableness'))?.percentage || 0
)}
• **Adaptability**: ${getPersonalityAdaptability(categories.find(c => c.name.includes('Openness'))?.percentage || 0)}`,

    derailers: `**⚠️ Personality Derailers**

The following areas represent potential personality derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getPersonalityDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant personality derailers identified.'}`,

    developmentalFocus: `**📈 Personality Development Focus**

Based on the assessment, consider development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getPersonalityDevelopmentPlan(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Personality Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getPersonalityStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Personality Strengths**

No significant personality strengths were identified.`,

    riskFactors: `**🚨 Personality Risk Factors**

The following areas represent significant personality risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): May impact workplace relationships and performance.`
).join('\n')}`,

    summary: `**📊 Personality Summary**

${candidateName} presents a personality profile with ${strengths.length} strengths and ${weaknesses.length} areas for growth. 
Primary areas for development are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// PERFORMANCE ASSESSMENT ANALYZER
// ============================================
const generatePerformanceAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getPerformanceOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    workStyle: `**💼 Performance Profile**

${candidateName}'s performance assessment reveals:

${categories.map(c => `• **${c.name}** (${c.percentage}%): ${getPerformanceMetricInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Work Behaviors**

The assessment reveals the following work behaviors:

${categories.filter(c => 
  c.name.includes('Accountability') || 
  c.name.includes('Initiative') || 
  c.name.includes('Collaboration')
).map(c => `• **${c.name}** (${c.percentage}%): ${getPerformanceBehaviorInterpretation(c.name, c.percentage)}`).join('\n')}`,

    derailers: `**⚠️ Performance Derailers**

The following areas represent potential performance derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getPerformanceDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant performance derailers identified.'}`,

    developmentalFocus: `**📈 Performance Development**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getPerformanceDevelopmentPlan(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Performance Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getPerformanceStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Performance Strengths**

No significant performance strengths were identified.`,

    summary: `**📊 Performance Summary**

${candidateName} demonstrates performance patterns with ${strengths.length} strengths and ${weaknesses.length} areas for improvement. 
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// BEHAVIORAL ASSESSMENT ANALYZER
// ============================================
const generateBehavioralAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getBehavioralOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    interpersonalDynamics: `**👥 Interpersonal Skills Profile**

${candidateName}'s behavioral assessment reveals:

${categories.filter(c => 
  c.name.includes('Teamwork') || 
  c.name.includes('Interpersonal') || 
  c.name.includes('Professionalism')
).map(c => `• **${c.name}** (${c.percentage}%): ${getBehavioralInterpersonalInterpretation(c.name, c.percentage)}`).join('\n')}`,

    communicationStyle: `**💬 Communication Profile**

The assessment reveals the following communication patterns:

${categories.filter(c => 
  c.name.includes('Listening') || 
  c.name.includes('Empathy') || 
  c.name.includes('Feedback') ||
  c.name.includes('Communication')
).map(c => `• **${c.name}** (${c.percentage}%): ${getBehavioralCommunicationInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Behavioral Patterns**

${candidateName}'s behavioral tendencies include:

${categories.filter(c => 
  c.name.includes('Conflict') || 
  c.name.includes('Adaptability') || 
  c.name.includes('Decision')
).map(c => `• **${c.name}** (${c.percentage}%): ${getBehavioralTendencyInterpretation(c.name, c.percentage)}`).join('\n')}`,

    derailers: `**⚠️ Behavioral Derailers**

The following areas represent potential behavioral derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getBehavioralDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant behavioral derailers identified.'}`,

    developmentalFocus: `**📈 Behavioral Development**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getBehavioralDevelopmentPlan(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Behavioral Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getBehavioralStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Behavioral Strengths**

No significant behavioral strengths were identified.`,

    summary: `**📊 Behavioral Summary**

${candidateName} demonstrates behavioral patterns with ${strengths.length} strengths and ${weaknesses.length} areas for development. 
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// CULTURAL ASSESSMENT ANALYZER
// ============================================
const generateCulturalAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName, sortedByPercentage) => {
  
  return {
    overallPattern: getCulturalOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    valuesAlignment: `**🎯 Values & Ethics Profile**

${candidateName}'s cultural assessment reveals:

${categories.filter(c => 
  c.name.includes('Values') || 
  c.name.includes('Integrity') || 
  c.name.includes('Work Ethic') ||
  c.name.includes('Conduct')
).map(c => `• **${c.name}** (${c.percentage}%): ${getCulturalValuesInterpretation(c.name, c.percentage)}`).join('\n')}`,

    interpersonalDynamics: `**👥 Intercultural Competence**

The assessment reveals the following intercultural capabilities:

${categories.filter(c => 
  c.name.includes('Diversity') || 
  c.name.includes('Inclusivity') || 
  c.name.includes('Respect') ||
  c.name.includes('Collaboration')
).map(c => `• **${c.name}** (${c.percentage}%): ${getCulturalInterculturalInterpretation(c.name, c.percentage)}`).join('\n')}`,

    workStyle: `**💼 Cultural Fit Profile**

${candidateName}'s cultural fit is characterized by:

• **Company Culture Fit**: ${getCulturalFitInterpretation(categories.find(c => c.name.includes('Culture') || c.name.includes('Fit'))?.percentage || 0)}
• **Adaptability**: ${getCulturalAdaptabilityInterpretation(categories.find(c => c.name.includes('Adaptability'))?.percentage || 0)}`,

    derailers: `**⚠️ Cultural Derailers**

The following areas represent potential cultural derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getCulturalDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant cultural derailers identified.'}`,

    developmentalFocus: `**📈 Cultural Development**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getCulturalDevelopmentPlan(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Cultural Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getCulturalStrengthDescription(s.name)}`).join('\n')}`
      : `**💪 Cultural Strengths**

No significant cultural strengths were identified.`,

    riskFactors: `**🚨 Cultural Risk Factors**

The following areas represent significant cultural risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): May struggle to align with organizational culture.`
).join('\n')}`,

    summary: `**📊 Cultural Summary**

${candidateName} demonstrates cultural alignment with ${strengths.length} strengths and ${weaknesses.length} areas for development. 
Primary areas for development are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// HELPER FUNCTIONS - COGNITIVE
// ============================================

const getCognitiveScoreInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return `Exceptional capability. This is a significant cognitive strength.`;
  if (percentage >= 70) return `Strong performance. This is a reliable cognitive asset.`;
  if (percentage >= 60) return `Developing competency. Shows potential with room for growth.`;
  if (percentage >= 50) return `Basic competency. Meets minimum requirements but needs development.`;
  if (percentage >= 40) return `Below average performance. Significant improvement needed.`;
  return `Critical deficiency. Requires immediate, intensive intervention.`;
};

const getCognitiveChallengeDescription = (categoryName, percentage) => {
  if (categoryName.includes('Verbal')) return `Difficulty with language-based tasks. May struggle with reading comprehension and verbal expression.`;
  if (categoryName.includes('Numerical')) return `Challenges with numbers and quantitative information. Will need support with data analysis.`;
  if (categoryName.includes('Logical')) return `Difficulty with abstract reasoning and logical problem-solving.`;
  if (categoryName.includes('Spatial')) return `Challenges with visual-spatial tasks. May struggle with diagrams and spatial relationships.`;
  if (categoryName.includes('Memory')) return `Difficulty retaining information. May need reminders and written instructions.`;
  if (categoryName.includes('Mechanical')) return `Challenges understanding mechanical concepts and physical principles.`;
  if (categoryName.includes('Perceptual')) return `Slower processing of visual information. May need extra time for detail-oriented tasks.`;
  return `Significant challenge in this area requiring structured intervention.`;
};

const getCognitiveDevelopmentPlan = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Verbal')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Daily vocabulary building, reading comprehension exercises, and verbal reasoning puzzles.`;
  }
  if (categoryName.includes('Numerical')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Daily math practice, numerical reasoning exercises, and real-world data interpretation tasks.`;
  }
  if (categoryName.includes('Logical')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Logic puzzles, brain teasers, and structured problem-solving practice.`;
  }
  if (categoryName.includes('Spatial')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Spatial visualization exercises, puzzles, and practice reading diagrams.`;
  }
  if (categoryName.includes('Memory')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Memory techniques, regular review, and using mnemonic devices.`;
  }
  if (categoryName.includes('Mechanical')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Hands-on mechanical projects and studying how simple machines work.`;
  }
  if (categoryName.includes('Perceptual')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Speed and accuracy drills and visual scanning exercises.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Recommended: Targeted training and structured practice in this area.`;
};

const getCognitiveStrengthDescription = (categoryName) => {
  if (categoryName.includes('Verbal')) return `Strong verbal abilities. Can be leveraged in communication-heavy roles.`;
  if (categoryName.includes('Numerical')) return `Strong numerical abilities. Valuable in data analysis and quantitative roles.`;
  if (categoryName.includes('Logical')) return `Strong logical reasoning. Excellent for problem-solving and analytical roles.`;
  if (categoryName.includes('Spatial')) return `Strong spatial abilities. Valuable in design and technical roles.`;
  if (categoryName.includes('Memory')) return `Excellent memory. Valuable for roles requiring information retention.`;
  return `Strong cognitive ability in this area.`;
};

const getCognitiveOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall cognitive performance is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall cognitive performance is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall cognitive performance indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

const getCognitiveOverallRecommendation = (categories) => {
  const criticalCount = categories.filter(c => c.percentage < 40).length;
  
  if (criticalCount >= 5) return "intensive, structured intervention with a focus on foundational cognitive skills";
  if (criticalCount >= 3) return "targeted support in critical areas combined with general cognitive development";
  return "structured cognitive training with emphasis on identified weak areas";
};

// ============================================
// HELPER FUNCTIONS - PRIMARY COGNITIVE
// ============================================

const getPrimaryProcessingMode = (categories) => {
  const verbal = categories.find(c => c.name.includes('Verbal'))?.percentage || 0;
  const numerical = categories.find(c => c.name.includes('Numerical'))?.percentage || 0;
  const spatial = categories.find(c => c.name.includes('Spatial'))?.percentage || 0;
  const logical = categories.find(c => c.name.includes('Logical') || c.name.includes('Abstract'))?.percentage || 0;

  const scores = [
    { mode: 'verbal-linguistic', score: verbal },
    { mode: 'logical-mathematical', score: (numerical + logical) / 2 },
    { mode: 'visual-spatial', score: spatial }
  ];

  const primary = scores.reduce((max, mode) => mode.score > max.score ? mode : max, scores[0]);
  
  if (primary.score >= 60) return `primarily ${primary.mode} processing`;
  return "no clearly dominant processing mode, suggesting a need for multi-modal learning approaches";
};

const getLearningStyle = (categories) => {
  const memory = categories.find(c => c.name.includes('Memory'))?.percentage || 0;
  const perceptual = categories.find(c => c.name.includes('Perceptual'))?.percentage || 0;
  
  if (memory >= 60 && perceptual >= 60) return "learns effectively through both repetition and hands-on practice";
  if (memory >= 60) return "learns best through structured repetition and memorization";
  if (perceptual >= 60) return "learns best through hands-on practice and visual demonstration";
  return "requires multi-sensory learning approaches with significant repetition";
};

const getProblemSolvingApproach = (categories) => {
  const logical = categories.find(c => c.name.includes('Logical') || c.name.includes('Abstract'))?.percentage || 0;
  const mechanical = categories.find(c => c.name.includes('Mechanical'))?.percentage || 0;
  const spatial = categories.find(c => c.name.includes('Spatial'))?.percentage || 0;

  if (logical >= 60) return "systematic and analytical, preferring to work through problems step-by-step";
  if (mechanical >= 60) return "practical and hands-on, learning by doing";
  if (spatial >= 60) return "visual and intuitive, seeing patterns and relationships";
  return "trial and error, requiring guidance to develop more systematic approaches";
};

const getProcessingSpeed = (categories) => {
  const perceptual = categories.find(c => c.name.includes('Perceptual'))?.percentage || 0;
  
  if (perceptual >= 70) return "processes information quickly and efficiently";
  if (perceptual >= 50) return "processes information at an average pace";
  return "processes information slowly and may need additional time for complex tasks";
};

const getAttentionToDetail = (memoryScore) => {
  if (memoryScore >= 70) return "excellent attention to detail, rarely misses important information";
  if (memoryScore >= 50) return "generally attentive but may miss some details";
  return "struggles with detail orientation, may need checklists and reminders";
};

const getCognitiveCommunicationStyle = (verbalScore) => {
  if (verbalScore >= 70) return "articulate and expressive, able to convey complex ideas clearly";
  if (verbalScore >= 50) return "adequately communicates basic ideas but may struggle with complex concepts";
  return "struggles with verbal expression, may benefit from written communication";
};

const getTaskComplexityPreference = (categories) => {
  const logical = categories.find(c => c.name.includes('Logical'))?.percentage || 0;
  const abstract = categories.find(c => c.name.includes('Abstract'))?.percentage || 0;
  const avgComplex = (logical + abstract) / 2;

  if (avgComplex >= 60) return "comfortable with complex, multi-step tasks and abstract problems";
  if (avgComplex >= 40) return "can handle moderately complex tasks with clear structure";
  return "prefers simple, concrete tasks with step-by-step instructions";
};

const getInformationPresentationStyle = (categories) => {
  const verbal = categories.find(c => c.name.includes('Verbal'))?.percentage || 0;
  const spatial = categories.find(c => c.name.includes('Spatial'))?.percentage || 0;

  if (verbal >= 60 && spatial >= 60) return "responds well to both written instructions and visual aids";
  if (verbal >= 60) return "prefers written or verbal instructions";
  if (spatial >= 60) return "prefers diagrams, charts, and visual demonstrations";
  return "benefits from multi-modal instruction combining words, visuals, and hands-on practice";
};

const getLearningPreference = (categories) => {
  const mechanical = categories.find(c => c.name.includes('Mechanical'))?.percentage || 0;
  const spatial = categories.find(c => c.name.includes('Spatial'))?.percentage || 0;

  if (mechanical >= 60 || spatial >= 60) return "learns best through hands-on, practical application";
  return "learns best through structured instruction and repetition";
};

const getDecisionMakingStyle = (categories) => {
  const logical = categories.find(c => c.name.includes('Logical'))?.percentage || 0;
  const critical = categories.find(c => c.name.includes('Critical'))?.percentage || 0;

  if (logical >= 60 && critical >= 60) return "makes independent decisions after careful analysis";
  if (logical >= 60) return "can make decisions with clear guidelines and support";
  return "prefers decisions to be made by others, needs clear direction";
};

// ============================================
// HELPER FUNCTIONS - GENERAL
// ============================================

const getGeneralCognitiveInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional analytical and strategic thinking capabilities.";
  if (percentage >= 70) return "Strong analytical thinking. Handles complex problems effectively.";
  if (percentage >= 60) return "Moderate cognitive abilities. Benefits from structured approaches.";
  if (percentage >= 50) return "Adequate cognitive abilities for routine tasks.";
  if (percentage >= 40) return "Limited cognitive abilities. Struggles with complex problem-solving.";
  return "Significant cognitive gaps. Requires clear guidance and simplified tasks.";
};

const getGeneralBehavioralInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Stable, resilient, and adaptable. Consistently positive work patterns.";
  if (percentage >= 70) return "Good behavioral profile. Generally stable and reliable.";
  if (percentage >= 60) return "Moderate behavioral patterns. May have some inconsistencies.";
  if (percentage >= 50) return "Adequate behavior. May lack resilience or adaptability.";
  if (percentage >= 40) return "Behavioral concerns. May struggle under pressure.";
  return "Poor behavioral profile. Significant concerns needing attention.";
};

const getGeneralInterpersonalInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional communicator. Articulates ideas clearly and persuasively.";
  if (percentage >= 70) return "Strong communication skills. Expresses ideas effectively.";
  if (percentage >= 60) return "Moderate communication. Conveys basic ideas but may struggle with complexity.";
  if (percentage >= 50) return "Adequate communication. Needs development in clarity.";
  if (percentage >= 40) return "Limited communication skills. Difficulty expressing ideas.";
  return "Poor communication skills. Significant development needed.";
};

const getGeneralWorkStyleInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Strong leadership potential. Inspires and develops others.";
  if (percentage >= 70) return "Good leadership capabilities. Can manage teams effectively.";
  if (percentage >= 60) return "Moderate leadership skills. May need support in people management.";
  if (percentage >= 50) return "Adequate leadership. Emerging but needs development.";
  if (percentage >= 40) return "Limited leadership. Not ready for management roles.";
  return "Poor leadership potential. Significant development needed.";
};

const getGeneralDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Critical gap that will significantly impact performance in this area.";
  if (percentage < 50) return "Significant gap that needs addressing for roles requiring this competency.";
  return "This area requires development to reach expected levels.";
};

const getGeneralDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted training and practice in this area with weekly progress reviews.`;
};

const getGeneralStrengthDescription = (categoryName) => {
  return `Strong performance in ${categoryName}. Leverage this in appropriate roles.`;
};

const getGeneralOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall performance is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall performance is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall performance indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

const getGeneralOverallRecommendation = (categories) => {
  const weakAreas = categories.filter(c => c.percentage < 50).length;
  
  if (weakAreas >= 5) return "a comprehensive development program addressing multiple areas with intensive support";
  if (weakAreas >= 3) return "targeted development in priority areas with regular progress monitoring";
  return "structured development focusing on identified weak areas while leveraging strengths";
};

// ============================================
// HELPER FUNCTIONS - LEADERSHIP
// ============================================

const getLeadershipStrategicInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional strategic thinker with compelling vision.";
  if (percentage >= 70) return "Good strategic thinking. Sees the big picture.";
  if (percentage >= 60) return "Moderate strategic ability. Needs development in long-term planning.";
  if (percentage >= 50) return "Adequate strategic thinking. Tends to focus on tactical rather than strategic.";
  return "Limited strategic thinking. Needs significant development.";
};

const getLeadershipStyleInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Powerful communicator who influences effectively at all levels.";
  if (percentage >= 70) return "Good communicator with developing influence skills.";
  if (percentage >= 60) return "Moderate influence. May struggle with persuasion.";
  return "Limited influence. Needs development.";
};

const getLeadershipPeopleInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Develops and coaches others exceptionally. Builds high-performing teams.";
  if (percentage >= 70) return "Good people manager. Supports team development.";
  if (percentage >= 60) return "Moderate people skills. Needs development in coaching.";
  return "Limited people management. Needs improvement.";
};

const getLeadershipWorkStyleInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Drives results with disciplined execution. Highly accountable.";
  if (percentage >= 70) return "Good execution focus. Delivers results consistently.";
  if (percentage >= 60) return "Moderate execution. May need help with follow-through.";
  return "Limited execution. Needs improvement.";
};

const getLeadershipDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Critical gap that will significantly impact leadership effectiveness.";
  if (percentage < 50) return "Significant gap that needs addressing for leadership roles.";
  return "This area requires development for leadership effectiveness.";
};

const getLeadershipDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted leadership development in this area with mentoring.`;
};

const getLeadershipStrengthDescription = (categoryName) => {
  return `Strong leadership capability in ${categoryName}. Leverage this in management roles.`;
};

const getLeadershipOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall leadership capability is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall leadership capability is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall leadership capability indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

// ============================================
// HELPER FUNCTIONS - TECHNICAL
// ============================================

const getTechnicalKnowledgeInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional technical knowledge. Deep understanding of systems and technologies.";
  if (percentage >= 70) return "Strong technical knowledge. Solid grasp of core concepts.";
  if (percentage >= 60) return "Moderate technical knowledge. Needs training in advanced areas.";
  if (percentage >= 50) return "Adequate technical knowledge. Requires foundational training.";
  return "Limited technical knowledge. Significant gaps.";
};

const getTechnicalApplicationInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional practical application. Translates knowledge effectively.";
  if (percentage >= 70) return "Good practical skills. Applies knowledge effectively.";
  if (percentage >= 60) return "Moderate practical application. Needs guidance for complex applications.";
  return "Limited practical skills. Struggles to apply knowledge.";
};

const getTechnicalWorkStyleInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Expert equipment operator. Masters all machinery.";
  if (percentage >= 70) return "Good equipment skills. Handles most machinery effectively.";
  if (percentage >= 60) return "Moderate equipment skills. Needs training on advanced equipment.";
  return "Limited equipment skills. Needs significant training.";
};

const getTechnicalDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Critical knowledge gap that will prevent effective technical performance.";
  if (percentage < 50) return "Significant gap that needs addressing for technical competence.";
  return "This area requires development for technical competence.";
};

const getTechnicalDevelopmentPlan = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted technical training with hands-on practice.`;
};

const getTechnicalStrengthDescription = (categoryName) => {
  return `Strong technical competence in ${categoryName}. Leverage this in technical specialist roles.`;
};

const getTechnicalOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall technical competence is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall technical competence is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall technical competence indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

// ============================================
// HELPER FUNCTIONS - PERSONALITY
// ============================================

const getPersonalityTraitInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return `Exceptional level. This is a significant personality strength.`;
  if (percentage >= 70) return `Strong level. This is a reliable personality asset.`;
  if (percentage >= 60) return `Moderate level. Shows potential with room for growth.`;
  if (percentage >= 50) return `Adequate level. Meets minimum expectations.`;
  return `Low level. May need attention and development.`;
};

const getPersonalityBehavioralInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional. Highly motivated and emotionally intelligent.";
  if (percentage >= 70) return "Good. Generally engaged and emotionally aware.";
  if (percentage >= 60) return "Moderate. May need encouragement and support.";
  return "Limited. Requires development in this area.";
};

const getPersonalityWorkPaceInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly productive and efficient. Thrives in deadline-driven environments.";
  if (percentage >= 70) return "Good work pace. Maintains steady output.";
  if (percentage >= 60) return "Moderate work pace. May need support during peak periods.";
  return "Slow work pace. May struggle with deadlines.";
};

const getPersonalityCollaborationStyle = (extraversion, agreeableness) => {
  const avg = (extraversion + agreeableness) / 2;
  if (avg >= 70) return "Highly collaborative team player who builds strong relationships";
  if (avg >= 50) return "Generally collaborative but may prefer independent work at times";
  return "Prefers independent work, may need encouragement to collaborate";
};

const getPersonalityAdaptability = (openness) => {
  if (openness >= 70) return "Highly adaptable, embraces change and new situations";
  if (openness >= 50) return "Moderately adaptable, can adjust with support";
  return "Prefers routine and structure, may struggle with change";
};

const getPersonalityDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Significant concern that may impact workplace relationships and performance.";
  return "This area requires development for personal effectiveness.";
};

const getPersonalityDevelopmentPlan = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted personal development in this area.`;
};

const getPersonalityStrengthDescription = (categoryName) => {
  return `Strong personality trait in ${categoryName}. Leverage this in appropriate roles.`;
};

const getPersonalityOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall personality profile is well-developed with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall personality profile is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall personality profile indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};

// ============================================
// HELPER FUNCTIONS - PERFORMANCE
// ============================================

const getPerformanceMetricInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional. Consistently exceeds targets.";
  if (percentage >= 70) return "Good. Meets targets with efficient work processes.";
  if (percentage >= 60) return "Moderate. May need support with time management.";
  if (percentage >= 50) return "Adequate. Meets basic expectations.";
  return "Limited. Struggles to meet targets.";
};

const getPerformanceBehaviorInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional. Takes full ownership and learns from mistakes.";
  if (percentage >= 70) return "Good. Takes responsibility for own work.";
  if (percentage >= 60) return "Moderate. May sometimes deflect responsibility.";
  return "Limited. Needs improvement.";
};

const getPerformanceDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Critical gap that will significantly impact output and performance.";
  if (percentage < 50) return "Significant gap that needs addressing for performance effectiveness.";
  return "This area requires development for performance effectiveness.";
};

const getPerformanceDevelopmentPlan = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted performance development in this area.`;
};

const getPerformanceStrengthDescription = (categoryName) => {
  return `Strong performance in ${categoryName}. Leverage this in target-driven roles.`;
};

const getPerformanceOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall performance is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall performance is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall performance indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};

// ============================================
// HELPER FUNCTIONS - BEHAVIORAL
// ============================================

const getBehavioralInterpersonalInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional. Builds strong relationships and enhances team dynamics.";
  if (percentage >= 70) return "Good. Works well with others and contributes to team success.";
  if (percentage >= 60) return "Moderate. May need development in collaboration.";
  return "Limited. May prefer working alone.";
};

const getBehavioralCommunicationInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional listener and communicator.";
  if (percentage >= 70) return "Good communication skills. Expresses ideas clearly.";
  if (percentage >= 60) return "Moderate communication. May struggle with complex messaging.";
  return "Limited communication. Difficulty articulating ideas.";
};

const getBehavioralTendencyInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Expert at navigating disagreements constructively.";
  if (percentage >= 70) return "Good at handling most disagreements professionally.";
  if (percentage >= 60) return "Moderate. May need support with complex conflicts.";
  return "Limited. May avoid or escalate conflicts.";
};

const getBehavioralDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Significant concern that will impact team dynamics and collaboration.";
  return "This area requires development for behavioral effectiveness.";
};

const getBehavioralDevelopmentPlan = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted behavioral development in this area.`;
};

const getBehavioralStrengthDescription = (categoryName) => {
  return `Strong behavioral competency in ${categoryName}. Leverage this in team settings.`;
};

const getBehavioralOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall behavioral profile is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall behavioral profile is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall behavioral profile indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};

// ============================================
// HELPER FUNCTIONS - CULTURAL
// ============================================

const getCulturalValuesInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional alignment. Naturally embodies and promotes company values.";
  if (percentage >= 70) return "Good alignment. Generally aligned with organizational values.";
  if (percentage >= 60) return "Moderate alignment. Some values may need reinforcement.";
  return "Limited alignment. May not fully embrace company values.";
};

const getCulturalInterculturalInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return "Exceptional awareness. Champions inclusion and respects all perspectives.";
  if (percentage >= 70) return "Good awareness. Values different perspectives and backgrounds.";
  if (percentage >= 60) return "Moderate awareness. Needs development in this area.";
  return "Limited awareness. May need training and education.";
};

const getCulturalFitInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional fit. Naturally aligns with and enhances company culture.";
  if (percentage >= 70) return "Good fit. Generally aligned with organizational culture.";
  if (percentage >= 60) return "Moderate fit. Some areas may need attention.";
  return "Limited fit. May not fully integrate.";
};

const getCulturalAdaptabilityInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly adaptable. Thrives in changing cultural environments.";
  if (percentage >= 70) return "Good adaptability. Adjusts well to most cultural changes.";
  if (percentage >= 60) return "Moderate adaptability. May need support during cultural shifts.";
  return "Limited adaptability. Struggles with cultural change.";
};

const getCulturalDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) return "Significant concern that may lead to cultural friction and disengagement.";
  return "This area requires development for cultural alignment.";
};

const getCulturalDevelopmentPlan = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted cultural development in this area.`;
};

const getCulturalStrengthDescription = (categoryName) => {
  return `Strong cultural competency in ${categoryName}. Leverage this in culture-building roles.`;
};

const getCulturalOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall cultural alignment is strong with ${strengthsCount} areas of notable strength.`;
  if (avgScore >= 50) return `Overall cultural alignment is developing with ${weaknessesCount} areas needing attention.`;
  return `Overall cultural alignment indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};
