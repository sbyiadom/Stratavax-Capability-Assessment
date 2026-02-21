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

  // Route to the appropriate assessment type analyzer
  switch(assessmentType) {
    case 'cognitive':
      return generateCognitiveAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'general':
      return generateGeneralAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'leadership':
      return generateLeadershipAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'technical':
      return generateTechnicalAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'personality':
      return generatePersonalityAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'performance':
      return generatePerformanceAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'behavioral':
      return generateBehavioralAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    case 'cultural':
      return generateCulturalAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
    default:
      return generateGeneralAnalysis(categories, strengths, weaknesses, developing, avgScore, candidateName);
  }
};

// ============================================
// COGNITIVE ASSESSMENT ANALYZER
// ============================================
const generateCognitiveAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific cognitive categories
  const verbalReasoning = categories.find(c => c.name.includes('Verbal')) || { percentage: 0, name: 'Verbal Reasoning' };
  const spatialReasoning = categories.find(c => c.name.includes('Spatial')) || { percentage: 0, name: 'Spatial Reasoning' };
  const memoryAttention = categories.find(c => c.name.includes('Memory') || c.name.includes('Attention')) || { percentage: 0, name: 'Memory & Attention' };
  const numericalReasoning = categories.find(c => c.name.includes('Numerical')) || { percentage: 0, name: 'Numerical Reasoning' };
  const mechanicalReasoning = categories.find(c => c.name.includes('Mechanical')) || { percentage: 0, name: 'Mechanical Reasoning' };
  const perceptualSpeed = categories.find(c => c.name.includes('Perceptual')) || { percentage: 0, name: 'Perceptual Speed & Accuracy' };
  const logicalReasoning = categories.find(c => c.name.includes('Logical') || c.name.includes('Abstract')) || { percentage: 0, name: 'Logical / Abstract Reasoning' };
  const criticalThinking = categories.find(c => c.name.includes('Critical')) || { percentage: 0, name: 'Critical Thinking' };
  const learningAgility = categories.find(c => c.name.includes('Learning')) || { percentage: 0, name: 'Learning Agility' };
  const mentalFlexibility = categories.find(c => c.name.includes('Mental') || c.name.includes('Flexibility')) || { percentage: 0, name: 'Mental Flexibility' };

  return {
    overallPattern: getCognitiveOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Cognitive Processing Style Analysis**

${candidateName}'s cognitive profile reveals a pattern of ${getCognitivePatternDescription(categories)}.

${categories.map(c => `• **${c.name}** (${c.percentage}%): ${getCognitiveScoreInterpretation(c.name, c.percentage)}`).join('\n')}`,

    behavioralTendencies: `**⚡ Cognitive Processing Tendencies**

Based on the pattern of scores, ${candidateName} processes information with the following characteristics:

• **Primary Processing Mode**: ${getPrimaryProcessingMode(categories)}
• **Learning Style**: ${getLearningStyle(categories)}
• **Problem-Solving Approach**: ${getProblemSolvingApproach(categories)}
• **Information Processing Speed**: ${getProcessingSpeed(categories)}
• **Attention to Detail**: ${getAttentionToDetail(memoryAttention.percentage)}`,

    interpersonalDynamics: `**👥 Impact on Interpersonal Functioning**

These cognitive patterns affect how ${candidateName} interacts with others:

• **Communication Style**: ${getCognitiveCommunicationStyle(verbalReasoning.percentage)}
• **Social Information Processing**: ${getSocialProcessingStyle(categories)}
• **Team Collaboration**: ${getTeamCollaborationStyle(categories)}
• **Receptiveness to Feedback**: ${getFeedbackReceptivity(categories)}`,

    workStyle: `**💼 Work Style Preferences**

${candidateName}'s cognitive profile suggests they work best in environments that offer:

• **Task Complexity**: ${getTaskComplexityPreference(categories)}
• **Information Presentation**: ${getInformationPresentationStyle(categories)}
• **Learning New Skills**: ${getLearningPreference(categories)}
• **Decision-Making Autonomy**: ${getDecisionMakingStyle(categories)}`,

    derailers: `**⚠️ Potential Cognitive Derailers**

The following cognitive areas represent potential derailers that could impact performance:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getCognitiveDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant cognitive derailers identified.'}`,

    developmentalFocus: `**📈 Priority Development Areas**

Based on the assessment results, the following areas should be prioritized for development:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getCognitiveDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Cognitive Strengths to Leverage**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getCognitiveStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Cognitive Strengths to Leverage**

No significant cognitive strengths were identified in this assessment. Focus should be on building foundational skills in all areas.`,

    riskFactors: `**🚨 Critical Risk Factors**

The following areas represent significant risks that require immediate attention:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical deficiency that will significantly impact performance in roles requiring this capability.`
).join('\n')}

${weaknesses.filter(w => w.percentage >= 40 && w.percentage < 50).map(w => 
  `• **${w.name}** (${w.percentage}%): Significant gap that needs addressing for roles requiring this competency.`
).join('\n')}`,

    summary: `**📊 Overall Summary**

${candidateName} presents a cognitive profile characterized by ${getCognitiveOverallSummary(categories, strengths, weaknesses)}. 
${strengths.length > 0 ? `Strengths are observed in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Critical development needs are evident in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}${weaknesses.length > 3 ? ' and other areas' : ''}. 
This individual would benefit most from ${getCognitiveOverallRecommendation(categories)}.`
  };
};

// ============================================
// GENERAL ASSESSMENT ANALYZER
// ============================================
const generateGeneralAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific general assessment categories
  const cognitiveAbility = categories.find(c => c.name.includes('Cognitive')) || { percentage: 0, name: 'Cognitive Ability' };
  const communication = categories.find(c => c.name.includes('Communication')) || { percentage: 0, name: 'Communication' };
  const culturalFit = categories.find(c => c.name.includes('Cultural') || c.name.includes('Attitudinal')) || { percentage: 0, name: 'Cultural & Attitudinal Fit' };
  const emotionalIntelligence = categories.find(c => c.name.includes('Emotional')) || { percentage: 0, name: 'Emotional Intelligence' };
  const ethics = categories.find(c => c.name.includes('Ethics') || c.name.includes('Integrity')) || { percentage: 0, name: 'Ethics & Integrity' };
  const leadership = categories.find(c => c.name.includes('Leadership') || c.name.includes('Management')) || { percentage: 0, name: 'Leadership & Management' };
  const performance = categories.find(c => c.name.includes('Performance')) || { percentage: 0, name: 'Performance Metrics' };
  const personality = categories.find(c => c.name.includes('Personality') || c.name.includes('Behavioral')) || { percentage: 0, name: 'Personality & Behavioral' };
  const problemSolving = categories.find(c => c.name.includes('Problem')) || { percentage: 0, name: 'Problem-Solving' };
  const technical = categories.find(c => c.name.includes('Technical') || c.name.includes('Manufacturing')) || { percentage: 0, name: 'Technical & Manufacturing' };

  return {
    overallPattern: getGeneralOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Cognitive & Analytical Profile**

${candidateName}'s general assessment reveals the following cognitive and analytical characteristics:

• **Cognitive Ability** (${cognitiveAbility.percentage}%): ${getGeneralCognitiveInterpretation(cognitiveAbility.percentage)}
• **Problem-Solving** (${problemSolving.percentage}%): ${getGeneralProblemSolvingInterpretation(problemSolving.percentage)}
• **Technical & Manufacturing** (${technical.percentage}%): ${getGeneralTechnicalInterpretation(technical.percentage)}`,

    behavioralTendencies: `**⚡ Behavioral & Personality Profile**

The assessment reveals the following behavioral tendencies:

• **Personality & Behavioral** (${personality.percentage}%): ${getGeneralPersonalityInterpretation(personality.percentage)}
• **Emotional Intelligence** (${emotionalIntelligence.percentage}%): ${getGeneralEInterpretation(emotionalIntelligence.percentage)}
• **Stress Management** (${getCategoryScore(categories, 'Stress')}%): ${getGeneralStressInterpretation(getCategoryScore(categories, 'Stress'))}`,

    interpersonalDynamics: `**👥 Interpersonal & Communication Profile**

${candidateName}'s interpersonal characteristics are reflected in:

• **Communication** (${communication.percentage}%): ${getGeneralCommunicationInterpretation(communication.percentage)}
• **Cultural & Attitudinal Fit** (${culturalFit.percentage}%): ${getGeneralCulturalInterpretation(culturalFit.percentage)}
• **Ethics & Integrity** (${ethics.percentage}%): ${getGeneralEthicsInterpretation(ethics.percentage)}`,

    workStyle: `**💼 Work Style & Performance Profile**

The assessment indicates the following work style preferences:

• **Leadership & Management** (${leadership.percentage}%): ${getGeneralLeadershipInterpretation(leadership.percentage)}
• **Performance Metrics** (${performance.percentage}%): ${getGeneralPerformanceInterpretation(performance.percentage)}
• **Work Pace** (${getCategoryScore(categories, 'Work Pace')}%): ${getGeneralWorkPaceInterpretation(getCategoryScore(categories, 'Work Pace'))}`,

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

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getGeneralStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Key Strengths to Leverage**

No significant strengths were identified. Focus should be on foundational development.`,

    riskFactors: `**🚨 Critical Risk Factors**

The following areas represent significant risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical risk that will significantly impact overall performance.`
).join('\n')}`,

    summary: `**📊 Overall Summary**

${candidateName} presents a profile characterized by ${getGeneralOverallSummary(categories, strengths, weaknesses)}. 
${strengths.length > 0 ? `Key strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}. 
This individual would benefit most from ${getGeneralOverallRecommendation(categories)}.`
  };
};

// ============================================
// LEADERSHIP ASSESSMENT ANALYZER
// ============================================
const generateLeadershipAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific leadership categories
  const vision = categories.find(c => c.name.includes('Vision') || c.name.includes('Strategic')) || { percentage: 0, name: 'Vision & Strategic Thinking' };
  const decisionMaking = categories.find(c => c.name.includes('Decision') || c.name.includes('Problem')) || { percentage: 0, name: 'Decision-Making' };
  const influence = categories.find(c => c.name.includes('Influence') || c.name.includes('Communication')) || { percentage: 0, name: 'Communication & Influence' };
  const peopleManagement = categories.find(c => c.name.includes('People') || c.name.includes('Coaching')) || { percentage: 0, name: 'People Management' };
  const changeLeadership = categories.find(c => c.name.includes('Change') || c.name.includes('Agility')) || { percentage: 0, name: 'Change Leadership' };
  const execution = categories.find(c => c.name.includes('Execution') || c.name.includes('Results')) || { percentage: 0, name: 'Execution & Results' };
  const resilience = categories.find(c => c.name.includes('Resilience') || c.name.includes('Stress')) || { percentage: 0, name: 'Resilience' };
  const selfAwareness = categories.find(c => c.name.includes('Self') || c.name.includes('Awareness')) || { percentage: 0, name: 'Self-Awareness' };
  const cultural = categories.find(c => c.name.includes('Cultural') || c.name.includes('Inclusivity')) || { percentage: 0, name: 'Cultural Competence' };
  const emotional = categories.find(c => c.name.includes('Emotional')) || { percentage: 0, name: 'Emotional Intelligence' };

  return {
    overallPattern: getLeadershipOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Strategic Thinking Profile**

${candidateName}'s leadership assessment reveals the following strategic capabilities:

• **Vision & Strategic Thinking** (${vision.percentage}%): ${getLeadershipVisionInterpretation(vision.percentage)}
• **Decision-Making** (${decisionMaking.percentage}%): ${getLeadershipDecisionInterpretation(decisionMaking.percentage)}
• **Execution & Results** (${execution.percentage}%): ${getLeadershipExecutionInterpretation(execution.percentage)}`,

    behavioralTendencies: `**⚡ Leadership Style & Approach**

The assessment reveals the following leadership tendencies:

• **Communication & Influence** (${influence.percentage}%): ${getLeadershipInfluenceInterpretation(influence.percentage)}
• **Change Leadership** (${changeLeadership.percentage}%): ${getLeadershipChangeInterpretation(changeLeadership.percentage)}
• **Resilience** (${resilience.percentage}%): ${getLeadershipResilienceInterpretation(resilience.percentage)}`,

    interpersonalDynamics: `**👥 People Management Profile**

${candidateName}'s approach to managing others is characterized by:

• **People Management** (${peopleManagement.percentage}%): ${getLeadershipPeopleInterpretation(peopleManagement.percentage)}
• **Emotional Intelligence** (${emotional.percentage}%): ${getLeadershipEInterpretation(emotional.percentage)}
• **Cultural Competence** (${cultural.percentage}%): ${getLeadershipCulturalInterpretation(cultural.percentage)}`,

    workStyle: `**💼 Leadership Work Style**

The assessment indicates the following leadership work style:

• **Self-Awareness** (${selfAwareness.percentage}%): ${getLeadershipSelfAwarenessInterpretation(selfAwareness.percentage)}
• **Adaptability**: ${getLeadershipAdaptabilityInterpretation(categories)}
• **Team Development Focus**: ${getLeadershipTeamFocusInterpretation(categories)}`,

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

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getLeadershipStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Leadership Strengths to Leverage**

No significant leadership strengths were identified. Focus should be on foundational leadership development.`,

    riskFactors: `**🚨 Leadership Risk Factors**

The following areas represent significant leadership risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical risk for leadership effectiveness.`
).join('\n')}`,

    summary: `**📊 Leadership Summary**

${candidateName} demonstrates ${getLeadershipOverallSummary(avgScore, strengths.length)} leadership potential. 
${strengths.length > 0 ? `Key leadership strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}. 
This leader would benefit most from ${getLeadershipOverallRecommendation(categories)}.`
  };
};

// ============================================
// TECHNICAL ASSESSMENT ANALYZER
// ============================================
const generateTechnicalAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific technical categories
  const technicalKnowledge = categories.find(c => c.name.includes('Technical') || c.name.includes('Knowledge')) || { percentage: 0, name: 'Technical Knowledge' };
  const systemUnderstanding = categories.find(c => c.name.includes('System') || c.name.includes('Understanding')) || { percentage: 0, name: 'System Understanding' };
  const troubleshooting = categories.find(c => c.name.includes('Troubleshooting') || c.name.includes('Problem')) || { percentage: 0, name: 'Troubleshooting' };
  const practicalApplication = categories.find(c => c.name.includes('Practical') || c.name.includes('Application')) || { percentage: 0, name: 'Practical Application' };
  const safety = categories.find(c => c.name.includes('Safety') || c.name.includes('Compliance')) || { percentage: 0, name: 'Safety & Compliance' };
  const quality = categories.find(c => c.name.includes('Quality')) || { percentage: 0, name: 'Quality Control' };
  const process = categories.find(c => c.name.includes('Process') || c.name.includes('Optimization')) || { percentage: 0, name: 'Process Optimization' };
  const equipment = categories.find(c => c.name.includes('Equipment') || c.name.includes('Operation')) || { percentage: 0, name: 'Equipment Operation' };
  const maintenance = categories.find(c => c.name.includes('Maintenance')) || { percentage: 0, name: 'Maintenance Procedures' };
  const documentation = categories.find(c => c.name.includes('Documentation')) || { percentage: 0, name: 'Technical Documentation' };

  return {
    overallPattern: getTechnicalOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Technical Knowledge Profile**

${candidateName}'s technical assessment reveals the following knowledge areas:

• **Technical Knowledge** (${technicalKnowledge.percentage}%): ${getTechnicalKnowledgeInterpretation(technicalKnowledge.percentage)}
• **System Understanding** (${systemUnderstanding.percentage}%): ${getTechnicalSystemInterpretation(systemUnderstanding.percentage)}
• **Technical Documentation** (${documentation.percentage}%): ${getTechnicalDocumentationInterpretation(documentation.percentage)}`,

    behavioralTendencies: `**⚡ Technical Application Style**

The assessment reveals the following technical tendencies:

• **Troubleshooting** (${troubleshooting.percentage}%): ${getTechnicalTroubleshootingInterpretation(troubleshooting.percentage)}
• **Practical Application** (${practicalApplication.percentage}%): ${getTechnicalApplicationInterpretation(practicalApplication.percentage)}
• **Process Optimization** (${process.percentage}%): ${getTechnicalProcessInterpretation(process.percentage)}`,

    workStyle: `**💼 Technical Work Style**

${candidateName}'s technical work style is characterized by:

• **Equipment Operation** (${equipment.percentage}%): ${getTechnicalEquipmentInterpretation(equipment.percentage)}
• **Maintenance Procedures** (${maintenance.percentage}%): ${getTechnicalMaintenanceInterpretation(maintenance.percentage)}
• **Safety & Compliance** (${safety.percentage}%): ${getTechnicalSafetyInterpretation(safety.percentage)}
• **Quality Control** (${quality.percentage}%): ${getTechnicalQualityInterpretation(quality.percentage)}`,

    derailers: `**⚠️ Technical Derailers**

The following areas represent potential technical derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getTechnicalDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant technical derailers identified.'}`,

    developmentalFocus: `**📈 Technical Development Priorities**

Based on the assessment, prioritize technical development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getTechnicalDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Technical Strengths to Leverage**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getTechnicalStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Technical Strengths to Leverage**

No significant technical strengths were identified. Focus should be on foundational technical training.`,

    riskFactors: `**🚨 Technical Risk Factors**

The following areas represent significant technical risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): Critical risk for technical roles.`
).join('\n')}`,

    summary: `**📊 Technical Summary**

${candidateName} demonstrates ${getTechnicalOverallSummary(avgScore, strengths.length)} technical competence. 
${strengths.length > 0 ? `Technical strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}. 
This individual would benefit most from ${getTechnicalOverallRecommendation(categories)}.`
  };
};

// ============================================
// PERSONALITY ASSESSMENT ANALYZER
// ============================================
const generatePersonalityAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific personality categories
  const openness = categories.find(c => c.name.includes('Openness')) || { percentage: 0, name: 'Openness to Experience' };
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness')) || { percentage: 0, name: 'Conscientiousness' };
  const extraversion = categories.find(c => c.name.includes('Extraversion')) || { percentage: 0, name: 'Extraversion' };
  const agreeableness = categories.find(c => c.name.includes('Agreeableness')) || { percentage: 0, name: 'Agreeableness' };
  const neuroticism = categories.find(c => c.name.includes('Neuroticism')) || { percentage: 0, name: 'Neuroticism' };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0, name: 'Integrity' };
  const emotional = categories.find(c => c.name.includes('Emotional')) || { percentage: 0, name: 'Emotional Intelligence' };
  const stress = categories.find(c => c.name.includes('Stress')) || { percentage: 0, name: 'Stress Management' };
  const workPace = categories.find(c => c.name.includes('Work Pace')) || { percentage: 0, name: 'Work Pace' };
  const motivations = categories.find(c => c.name.includes('Motivations')) || { percentage: 0, name: 'Motivations' };

  return {
    overallPattern: getPersonalityOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    cognitiveStyle: `**🧠 Personality Structure**

${candidateName}'s personality assessment reveals the following core dimensions:

• **Openness to Experience** (${openness.percentage}%): ${getPersonalityOpennessInterpretation(openness.percentage)}
• **Conscientiousness** (${conscientiousness.percentage}%): ${getPersonalityConscientiousnessInterpretation(conscientiousness.percentage)}
• **Extraversion** (${extraversion.percentage}%): ${getPersonalityExtraversionInterpretation(extraversion.percentage)}
• **Agreeableness** (${agreeableness.percentage}%): ${getPersonalityAgreeablenessInterpretation(agreeableness.percentage)}
• **Neuroticism** (${neuroticism.percentage}%): ${getPersonalityNeuroticismInterpretation(neuroticism.percentage)}`,

    behavioralTendencies: `**⚡ Behavioral Tendencies**

The assessment reveals the following behavioral patterns:

• **Integrity** (${integrity.percentage}%): ${getPersonalityIntegrityInterpretation(integrity.percentage)}
• **Emotional Intelligence** (${emotional.percentage}%): ${getPersonalityEInterpretation(emotional.percentage)}
• **Stress Management** (${stress.percentage}%): ${getPersonalityStressInterpretation(stress.percentage)}
• **Motivations** (${motivations.percentage}%): ${getPersonalityMotivationsInterpretation(motivations.percentage)}`,

    workStyle: `**💼 Work Style Preferences**

${candidateName}'s work style is characterized by:

• **Work Pace** (${workPace.percentage}%): ${getPersonalityWorkPaceInterpretation(workPace.percentage)}
• **Collaboration Style**: ${getPersonalityCollaborationStyle(extraversion.percentage, agreeableness.percentage)}
• **Decision-Making Approach**: ${getPersonalityDecisionStyle(conscientiousness.percentage, neuroticism.percentage)}
• **Adaptability**: ${getPersonalityAdaptability(openness.percentage)}`,

    derailers: `**⚠️ Personality Derailers**

The following areas represent potential personality derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getPersonalityDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant personality derailers identified.'}`,

    developmentalFocus: `**📈 Personality Development Focus**

Based on the assessment, consider development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getPersonalityDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Personality Strengths to Leverage**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getPersonalityStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Personality Strengths to Leverage**

No significant personality strengths were identified.`,

    riskFactors: `**🚨 Personality Risk Factors**

The following areas represent significant personality risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): May impact workplace relationships and performance.`
).join('\n')}`,

    summary: `**📊 Personality Summary**

${candidateName} presents a personality profile characterized by ${getPersonalityOverallSummary(categories)}. 
${strengths.length > 0 ? `Key strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary areas for growth are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}. 
This individual would thrive in environments that ${getPersonalityEnvironmentMatch(categories)}.`
  };
};

// ============================================
// PERFORMANCE ASSESSMENT ANALYZER
// ============================================
const generatePerformanceAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific performance categories
  const productivity = categories.find(c => c.name.includes('Productivity')) || { percentage: 0, name: 'Productivity & Efficiency' };
  const quality = categories.find(c => c.name.includes('Quality')) || { percentage: 0, name: 'Work Quality' };
  const goal = categories.find(c => c.name.includes('Goal')) || { percentage: 0, name: 'Goal Achievement' };
  const accountability = categories.find(c => c.name.includes('Accountability')) || { percentage: 0, name: 'Accountability' };
  const initiative = categories.find(c => c.name.includes('Initiative')) || { percentage: 0, name: 'Initiative' };
  const collaboration = categories.find(c => c.name.includes('Collaboration')) || { percentage: 0, name: 'Collaboration' };
  const timeManagement = categories.find(c => c.name.includes('Time')) || { percentage: 0, name: 'Time Management' };
  const results = categories.find(c => c.name.includes('Results')) || { percentage: 0, name: 'Results Orientation' };

  return {
    overallPattern: getPerformanceOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    workStyle: `**💼 Performance Profile**

${candidateName}'s performance assessment reveals:

• **Productivity & Efficiency** (${productivity.percentage}%): ${getPerformanceProductivityInterpretation(productivity.percentage)}
• **Work Quality** (${quality.percentage}%): ${getPerformanceQualityInterpretation(quality.percentage)}
• **Time Management** (${timeManagement.percentage}%): ${getPerformanceTimeInterpretation(timeManagement.percentage)}
• **Results Orientation** (${results.percentage}%): ${getPerformanceResultsInterpretation(results.percentage)}`,

    behavioralTendencies: `**⚡ Work Behaviors**

The assessment reveals the following work behaviors:

• **Accountability** (${accountability.percentage}%): ${getPerformanceAccountabilityInterpretation(accountability.percentage)}
• **Initiative** (${initiative.percentage}%): ${getPerformanceInitiativeInterpretation(initiative.percentage)}
• **Collaboration** (${collaboration.percentage}%): ${getPerformanceCollaborationInterpretation(collaboration.percentage)}
• **Goal Achievement** (${goal.percentage}%): ${getPerformanceGoalInterpretation(goal.percentage)}`,

    derailers: `**⚠️ Performance Derailers**

The following areas represent potential performance derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getPerformanceDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant performance derailers identified.'}`,

    developmentalFocus: `**📈 Performance Development**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getPerformanceDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Performance Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getPerformanceStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Performance Strengths**

No significant performance strengths were identified.`,

    summary: `**📊 Performance Summary**

${candidateName} demonstrates ${getPerformanceOverallSummary(avgScore)} performance patterns. 
${strengths.length > 0 ? `Key strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// BEHAVIORAL ASSESSMENT ANALYZER
// ============================================
const generateBehavioralAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific behavioral categories
  const teamwork = categories.find(c => c.name.includes('Teamwork') || c.name.includes('Team')) || { percentage: 0, name: 'Teamwork' };
  const conflict = categories.find(c => c.name.includes('Conflict')) || { percentage: 0, name: 'Conflict Resolution' };
  const empathy = categories.find(c => c.name.includes('Empathy')) || { percentage: 0, name: 'Empathy' };
  const listening = categories.find(c => c.name.includes('Listening')) || { percentage: 0, name: 'Active Listening' };
  const feedback = categories.find(c => c.name.includes('Feedback')) || { percentage: 0, name: 'Feedback Reception' };
  const interpersonal = categories.find(c => c.name.includes('Interpersonal')) || { percentage: 0, name: 'Interpersonal Skills' };
  const professionalism = categories.find(c => c.name.includes('Professionalism')) || { percentage: 0, name: 'Professionalism' };
  const adaptability = categories.find(c => c.name.includes('Adaptability')) || { percentage: 0, name: 'Adaptability' };
  const communication = categories.find(c => c.name.includes('Communication')) || { percentage: 0, name: 'Communication Style' };
  const decision = categories.find(c => c.name.includes('Decision')) || { percentage: 0, name: 'Decision-Making' };

  return {
    overallPattern: getBehavioralOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    interpersonalDynamics: `**👥 Interpersonal Skills Profile**

${candidateName}'s behavioral assessment reveals:

• **Teamwork** (${teamwork.percentage}%): ${getBehavioralTeamworkInterpretation(teamwork.percentage)}
• **Interpersonal Skills** (${interpersonal.percentage}%): ${getBehavioralInterpersonalInterpretation(interpersonal.percentage)}
• **Professionalism** (${professionalism.percentage}%): ${getBehavioralProfessionalismInterpretation(professionalism.percentage)}`,

    communicationStyle: `**💬 Communication Profile**

The assessment reveals the following communication patterns:

• **Active Listening** (${listening.percentage}%): ${getBehavioralListeningInterpretation(listening.percentage)}
• **Empathy** (${empathy.percentage}%): ${getBehavioralEmpathyInterpretation(empathy.percentage)}
• **Feedback Reception** (${feedback.percentage}%): ${getBehavioralFeedbackInterpretation(feedback.percentage)}
• **Communication Style** (${communication.percentage}%): ${getBehavioralCommunicationInterpretation(communication.percentage)}`,

    behavioralTendencies: `**⚡ Behavioral Patterns**

${candidateName}'s behavioral tendencies include:

• **Conflict Resolution** (${conflict.percentage}%): ${getBehavioralConflictInterpretation(conflict.percentage)}
• **Adaptability** (${adaptability.percentage}%): ${getBehavioralAdaptabilityInterpretation(adaptability.percentage)}
• **Decision-Making** (${decision.percentage}%): ${getBehavioralDecisionInterpretation(decision.percentage)}`,

    derailers: `**⚠️ Behavioral Derailers**

The following areas represent potential behavioral derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getBehavioralDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant behavioral derailers identified.'}`,

    developmentalFocus: `**📈 Behavioral Development**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getBehavioralDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Behavioral Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getBehavioralStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Behavioral Strengths**

No significant behavioral strengths were identified.`,

    summary: `**📊 Behavioral Summary**

${candidateName} demonstrates ${getBehavioralOverallSummary(avgScore, strengths.length)} behavioral patterns. 
${strengths.length > 0 ? `Key strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary development needs are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// CULTURAL ASSESSMENT ANALYZER
// ============================================
const generateCulturalAnalysis = (categories, strengths, weaknesses, developing, avgScore, candidateName) => {
  // Find specific cultural categories
  const values = categories.find(c => c.name.includes('Values')) || { percentage: 0, name: 'Values Alignment' };
  const workEthic = categories.find(c => c.name.includes('Work Ethic')) || { percentage: 0, name: 'Work Ethic' };
  const diversity = categories.find(c => c.name.includes('Diversity')) || { percentage: 0, name: 'Diversity Awareness' };
  const inclusivity = categories.find(c => c.name.includes('Inclusivity')) || { percentage: 0, name: 'Inclusivity' };
  const respect = categories.find(c => c.name.includes('Respect')) || { percentage: 0, name: 'Respect' };
  const collaboration = categories.find(c => c.name.includes('Collaboration') || c.name.includes('Team')) || { percentage: 0, name: 'Team Collaboration' };
  const adaptability = categories.find(c => c.name.includes('Adaptability')) || { percentage: 0, name: 'Adaptability' };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0, name: 'Integrity' };
  const conduct = categories.find(c => c.name.includes('Conduct')) || { percentage: 0, name: 'Professional Conduct' };
  const culture = categories.find(c => c.name.includes('Culture') || c.name.includes('Fit')) || { percentage: 0, name: 'Company Culture Fit' };

  return {
    overallPattern: getCulturalOverallPattern(avgScore, strengths.length, weaknesses.length, categories),
    
    valuesAlignment: `**🎯 Values & Ethics Profile**

${candidateName}'s cultural assessment reveals:

• **Values Alignment** (${values.percentage}%): ${getCulturalValuesInterpretation(values.percentage)}
• **Integrity** (${integrity.percentage}%): ${getCulturalIntegrityInterpretation(integrity.percentage)}
• **Work Ethic** (${workEthic.percentage}%): ${getCulturalWorkEthicInterpretation(workEthic.percentage)}
• **Professional Conduct** (${conduct.percentage}%): ${getCulturalConductInterpretation(conduct.percentage)}`,

    interpersonalDynamics: `**👥 Intercultural Competence**

The assessment reveals the following intercultural capabilities:

• **Diversity Awareness** (${diversity.percentage}%): ${getCulturalDiversityInterpretation(diversity.percentage)}
• **Inclusivity** (${inclusivity.percentage}%): ${getCulturalInclusivityInterpretation(inclusivity.percentage)}
• **Respect** (${respect.percentage}%): ${getCulturalRespectInterpretation(respect.percentage)}
• **Team Collaboration** (${collaboration.percentage}%): ${getCulturalCollaborationInterpretation(collaboration.percentage)}`,

    workStyle: `**💼 Cultural Fit Profile**

${candidateName}'s cultural fit is characterized by:

• **Company Culture Fit** (${culture.percentage}%): ${getCulturalFitInterpretation(culture.percentage)}
• **Adaptability** (${adaptability.percentage}%): ${getCulturalAdaptabilityInterpretation(adaptability.percentage)}
• **Overall Cultural Alignment**: ${getCulturalAlignmentSummary(categories)}`,

    derailers: `**⚠️ Cultural Derailers**

The following areas represent potential cultural derailers:

${weaknesses.length > 0 
  ? weaknesses.map(w => `• **${w.name}** (${w.percentage}%): ${getCulturalDerailerDescription(w.name, w.percentage)}`).join('\n')
  : '• No significant cultural derailers identified.'}`,

    developmentalFocus: `**📈 Cultural Development**

Based on the assessment, prioritize development in:

${sortedByPercentage.slice(0, 3).map((c, i) => 
  `**Priority ${i+1}: ${c.name}** (${c.percentage}%)\n${getCulturalDevelopmentRecommendation(c.name, c.percentage)}`
).join('\n\n')}`,

    strengthsToLeverage: strengths.length > 0 
      ? `**💪 Cultural Strengths**

${strengths.map(s => `• **${s.name}** (${s.percentage}%): ${getCulturalStrengthDescription(s.name, s.percentage)}`).join('\n')}`
      : `**💪 Cultural Strengths**

No significant cultural strengths were identified.`,

    riskFactors: `**🚨 Cultural Risk Factors**

The following areas represent significant cultural risks:

${weaknesses.filter(w => w.percentage < 40).map(w => 
  `• **${w.name}** (${w.percentage}%): May struggle to align with organizational culture.`
).join('\n')}`,

    summary: `**📊 Cultural Summary**

${candidateName} demonstrates ${getCulturalOverallSummary(avgScore, strengths.length)} cultural alignment. 
${strengths.length > 0 ? `Key cultural strengths include ${strengths.map(s => s.name.toLowerCase()).join(', ')}. ` : ''}
Primary areas for development are in ${weaknesses.slice(0, 3).map(w => w.name.toLowerCase()).join(', ')}.`
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getCategoryScore = (categories, namePattern) => {
  const category = categories.find(c => c.name.includes(namePattern));
  return category ? category.percentage : 0;
};

const getCognitiveScoreInterpretation = (categoryName, percentage) => {
  if (percentage >= 80) return `Exceptional capability. This is a significant cognitive strength.`;
  if (percentage >= 70) return `Strong performance. This is a reliable cognitive asset.`;
  if (percentage >= 60) return `Developing competency. Shows potential with room for growth.`;
  if (percentage >= 50) return `Basic competency. Meets minimum requirements but needs development.`;
  if (percentage >= 40) return `Below average performance. Significant improvement needed.`;
  return `Critical deficiency. Requires immediate, intensive intervention.`;
};

const getCognitivePatternDescription = (categories) => {
  const highScores = categories.filter(c => c.percentage >= 60).length;
  const lowScores = categories.filter(c => c.percentage < 40).length;
  
  if (highScores >= 5) return "well-developed cognitive abilities across multiple domains";
  if (lowScores >= 5) return "significant challenges across multiple cognitive domains";
  if (highScores >= 3) return "selective strengths with notable gaps in other areas";
  return "generally underdeveloped cognitive abilities requiring comprehensive support";
};

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

const getSocialProcessingStyle = (categories) => {
  const perceptual = categories.find(c => c.name.includes('Perceptual'))?.percentage || 0;
  const memory = categories.find(c => c.name.includes('Memory'))?.percentage || 0;

  if (perceptual >= 60 && memory >= 60) return "quickly picks up on social cues and remembers interactions well";
  if (perceptual >= 60) return "observes social dynamics but may forget details of interactions";
  if (memory >= 60) return "remembers interactions but may miss subtle social cues";
  return "may struggle to read social situations and recall interaction details";
};

const getTeamCollaborationStyle = (categories) => {
  const logical = categories.find(c => c.name.includes('Logical'))?.percentage || 0;
  const verbal = categories.find(c => c.name.includes('Verbal'))?.percentage || 0;

  if (logical >= 60 && verbal >= 60) return "contributes effectively to team discussions and problem-solving";
  if (verbal >= 60) return "participates in discussions but may need support with complex analysis";
  if (logical >= 60) return "offers analytical insights but may need support with verbal expression";
  return "may be quieter in team settings, preferring to contribute in writing or one-on-one";
};

const getFeedbackReceptivity = (categories) => {
  const openness = categories.find(c => c.name.includes('Openness'))?.percentage || 0;
  const neuroticism = categories.find(c => c.name.includes('Neuroticism'))?.percentage || 0;

  if (openness >= 60 && neuroticism < 60) return "generally open to feedback and uses it constructively";
  if (openness >= 60) return "open to feedback but may be sensitive to criticism";
  if (neuroticism >= 60) return "may be defensive when receiving feedback";
  return "needs supportive, constructive feedback delivered carefully";
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

const getCognitiveDerailerDescription = (categoryName, percentage) => {
  if (percentage < 30) {
    if (categoryName.includes('Verbal')) return "Severe difficulty with language-based tasks. Will significantly impact communication and learning.";
    if (categoryName.includes('Numerical')) return "Severe difficulty with numbers. Will significantly impact any role requiring data analysis.";
    if (categoryName.includes('Logical')) return "Severe difficulty with abstract reasoning. Will struggle with complex problem-solving.";
    if (categoryName.includes('Spatial')) return "Severe difficulty with visual-spatial tasks. May struggle with diagrams and spatial relationships.";
    if (categoryName.includes('Memory')) return "Severe memory challenges. Will need extensive support and written reminders.";
    if (categoryName.includes('Mechanical')) return "Severe difficulty understanding mechanical concepts. Will struggle with technical roles.";
    if (categoryName.includes('Perceptual')) return "Severe difficulty with visual processing. May miss important details and need extra time.";
  }
  
  if (percentage < 50) {
    if (categoryName.includes('Verbal')) return "Significant challenges with verbal tasks. May misunderstand instructions and struggle to express ideas.";
    if (categoryName.includes('Numerical')) return "Significant challenges with numbers. Will need support with quantitative tasks.";
    if (categoryName.includes('Logical')) return "Significant challenges with logical reasoning. May need help with problem-solving.";
    if (categoryName.includes('Spatial')) return "Significant challenges with spatial tasks. May struggle with visual information.";
    if (categoryName.includes('Memory')) return "Significant memory challenges. May forget instructions and need reminders.";
    if (categoryName.includes('Mechanical')) return "Significant challenges with mechanical concepts. Will need training for technical roles.";
    if (categoryName.includes('Perceptual')) return "Significant challenges with visual processing. May need extra time for detail work.";
  }
  
  return "This area requires development to reach expected levels.";
};

const getCognitiveDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Verbal')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Daily vocabulary building, reading comprehension exercises, and verbal reasoning puzzles. Consider working with a language tutor for 2-3 sessions per week.`;
  }
  if (categoryName.includes('Numerical')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Daily math practice starting with foundational concepts, numerical reasoning exercises, and real-world data interpretation tasks. Consider online math refresher courses.`;
  }
  if (categoryName.includes('Logical') || categoryName.includes('Abstract')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Daily logic puzzles, brain teasers, and structured problem-solving practice. Work through case studies with a mentor.`;
  }
  if (categoryName.includes('Spatial')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Spatial visualization exercises, puzzles like tangrams, and practice reading diagrams and blueprints. Consider 3D modeling software for practice.`;
  }
  if (categoryName.includes('Memory')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Memory techniques (chunking, association, method of loci), regular review of new information, and using mnemonic devices. Practice recalling information after intervals.`;
  }
  if (categoryName.includes('Mechanical')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Hands-on mechanical projects, studying how simple machines work, and practical troubleshooting exercises. Shadow experienced technicians.`;
  }
  if (categoryName.includes('Perceptual')) {
    return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Speed and accuracy drills, visual scanning exercises, and practice with detail-oriented tasks. Use timers to gradually increase processing speed.`;
  }
  return `Current performance is at ${percentage}%. Target is 80% (${gap}% gap). Recommended: Targeted training and structured practice in this area with weekly progress reviews.`;
};

const getCognitiveStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Verbal')) return `Excellent verbal abilities (${percentage}%). Can be leveraged in communication-heavy roles, training others, and tasks requiring clear expression.`;
  if (categoryName.includes('Numerical')) return `Strong numerical abilities (${percentage}%). Valuable in data analysis, budgeting, and quantitative roles. Consider for tasks involving metrics and statistics.`;
  if (categoryName.includes('Logical')) return `Strong logical reasoning (${percentage}%). Excellent for problem-solving, strategic planning, and analytical roles. Can mentor others in structured thinking.`;
  if (categoryName.includes('Spatial')) return `Strong spatial abilities (${percentage}%). Valuable in design, engineering, and technical roles. Can excel at reading blueprints and visualizing complex systems.`;
  if (categoryName.includes('Memory')) return `Excellent memory (${percentage}%). Can recall details accurately, valuable for roles requiring information retention. Could serve as a knowledge resource for the team.`;
  if (categoryName.includes('Mechanical')) return `Strong mechanical reasoning (${percentage}%). Well-suited for technical, maintenance, and hands-on roles. Can troubleshoot equipment effectively.`;
  if (categoryName.includes('Perceptual')) return `Excellent perceptual speed and accuracy (${percentage}%). Highly detail-oriented, can spot errors quickly. Valuable for quality control and inspection roles.`;
  return `Strong performance in ${categoryName} (${percentage}%). This is a valuable cognitive asset.`;
};

const getCognitiveOverallSummary = (categories, strengths, weaknesses) => {
  const criticalCount = categories.filter(c => c.percentage < 40).length;
  const developingCount = categories.filter(c => c.percentage >= 40 && c.percentage < 60).length;
  
  if (criticalCount >= 5) return `significant challenges across multiple cognitive domains, with ${criticalCount} areas at critical levels requiring intensive intervention`;
  if (weaknesses.length >= 5) return `widespread weaknesses across ${weaknesses.length} cognitive areas requiring comprehensive development`;
  if (developingCount >= 5) return `developing abilities across multiple domains, with ${developingCount} areas at developing levels showing potential for growth`;
  if (strengths.length >= 3) return `selective strengths in ${strengths.length} areas with manageable development needs in others`;
  return "a mix of developing abilities and areas needing significant improvement";
};

const getCognitiveOverallRecommendation = (categories) => {
  const criticalCount = categories.filter(c => c.percentage < 40).length;
  const developingCount = categories.filter(c => c.percentage >= 40 && c.percentage < 60).length;
  
  if (criticalCount >= 5) return "intensive, structured intervention with a focus on foundational cognitive skills, including daily practice and one-on-one coaching";
  if (criticalCount >= 3) return "targeted support in critical areas combined with general cognitive development through structured programs";
  if (developingCount >= 5) return "a comprehensive development program addressing multiple areas with regular progress monitoring";
  return "structured cognitive training with emphasis on identified weak areas and leveraging strengths";
};

const getCognitiveOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  const criticalCount = categories.filter(c => c.percentage < 40).length;
  
  if (avgScore >= 70) return `Overall cognitive performance is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall cognitive performance is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  if (criticalCount >= 5) return `Overall cognitive performance indicates significant challenges across ${criticalCount} areas requiring immediate attention and structured intervention.`;
  return `Overall cognitive performance indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

// General Assessment helper functions
const getGeneralCognitiveInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional analytical and strategic thinking capabilities. Can handle the most complex challenges with ease.";
  if (percentage >= 70) return "Strong analytical thinking. Handles complex problems effectively.";
  if (percentage >= 60) return "Moderate cognitive abilities. Benefits from structured approaches.";
  if (percentage >= 50) return "Adequate cognitive abilities for routine tasks. May need support with complexity.";
  if (percentage >= 40) return "Limited cognitive abilities. Struggles with complex problem-solving.";
  return "Significant cognitive gaps. Requires clear guidance and simplified tasks.";
};

const getGeneralProblemSolvingInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional problem-solver. Systematic, creative, and effective.";
  if (percentage >= 70) return "Good problem-solving skills. Handles most challenges effectively.";
  if (percentage >= 60) return "Moderate problem-solving. May need support with complex issues.";
  if (percentage >= 50) return "Adequate for routine problems. Struggles with novel situations.";
  if (percentage >= 40) return "Limited problem-solving. Needs structured approaches.";
  return "Poor problem-solving. Significant difficulties with challenges.";
};

const getGeneralTechnicalInterpretation = (percentage) => {
  if (percentage >= 80) return "Strong technical expertise. Deep understanding of systems and processes.";
  if (percentage >= 70) return "Good technical knowledge. Handles most technical tasks effectively.";
  if (percentage >= 60) return "Moderate technical skills. May need training in advanced areas.";
  if (percentage >= 50) return "Basic technical understanding. Requires guidance for complex tasks.";
  if (percentage >= 40) return "Limited technical knowledge. Needs foundational training.";
  return "Poor technical expertise. Significant knowledge gaps.";
};

const getGeneralPersonalityInterpretation = (percentage) => {
  if (percentage >= 80) return "Stable, resilient, and adaptable. Consistently positive work patterns.";
  if (percentage >= 70) return "Good behavioral profile. Generally stable and reliable.";
  if (percentage >= 60) return "Moderate behavioral patterns. May have some inconsistencies.";
  if (percentage >= 50) return "Adequate behavior. May lack resilience or adaptability.";
  if (percentage >= 40) return "Behavioral concerns. May struggle under pressure.";
  return "Poor behavioral profile. Significant concerns needing attention.";
};

const getGeneralEInterpretation = (percentage) => {
  if (percentage >= 80) return "High emotional intelligence. Self-aware and empathetic.";
  if (percentage >= 70) return "Good emotional awareness. Navigates situations well.";
  if (percentage >= 60) return "Moderate emotional intelligence. May struggle with complex dynamics.";
  if (percentage >= 50) return "Basic emotional awareness. Needs development in this area.";
  if (percentage >= 40) return "Limited emotional intelligence. May struggle with relationships.";
  return "Poor emotional intelligence. Significant interpersonal challenges.";
};

const getGeneralStressInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly resilient. Thrives under pressure.";
  if (percentage >= 70) return "Good stress management. Handles pressure well.";
  if (percentage >= 60) return "Moderate resilience. May struggle under intense pressure.";
  if (percentage >= 50) return "Adequate stress management. Needs support in high-pressure situations.";
  if (percentage >= 40) return "Limited stress management. Easily overwhelmed.";
  return "Poor stress management. Significant concerns.";
};

const getGeneralCommunicationInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional communicator. Articulates ideas clearly and persuasively.";
  if (percentage >= 70) return "Strong communication skills. Expresses ideas effectively.";
  if (percentage >= 60) return "Moderate communication. Conveys basic ideas but may struggle with complexity.";
  if (percentage >= 50) return "Adequate communication. Needs development in clarity.";
  if (percentage >= 40) return "Limited communication skills. Difficulty expressing ideas.";
  return "Poor communication skills. Significant development needed.";
};

const getGeneralCulturalInterpretation = (percentage) => {
  if (percentage >= 80) return "Strong cultural alignment. Embodies company values.";
  if (percentage >= 70) return "Good cultural fit. Generally aligned with values.";
  if (percentage >= 60) return "Moderate cultural alignment. Some areas need attention.";
  if (percentage >= 50) return "Adequate cultural fit. May need guidance on values.";
  if (percentage >= 40) return "Cultural fit concerns. May not align with company values.";
  return "Poor cultural fit. Significant misalignment.";
};

const getGeneralEthicsInterpretation = (percentage) => {
  if (percentage >= 80) return "Strong ethical foundation. Trustworthy and principled.";
  if (percentage >= 70) return "Good integrity. Makes ethical choices.";
  if (percentage >= 60) return "Moderate ethical awareness. May need guidance in complex situations.";
  if (percentage >= 50) return "Adequate ethics. Follows rules when clear.";
  if (percentage >= 40) return "Ethical concerns. Requires clear boundaries.";
  return "Poor ethical judgment. Significant risk area.";
};

const getGeneralLeadershipInterpretation = (percentage) => {
  if (percentage >= 80) return "Strong leadership potential. Inspires and develops others.";
  if (percentage >= 70) return "Good leadership capabilities. Can manage teams effectively.";
  if (percentage >= 60) return "Moderate leadership skills. May need support in people management.";
  if (percentage >= 50) return "Adequate leadership. Emerging but needs development.";
  if (percentage >= 40) return "Limited leadership. Not ready for management roles.";
  return "Poor leadership potential. Significant development needed.";
};

const getGeneralPerformanceInterpretation = (percentage) => {
  if (percentage >= 80) return "Results-driven with strong accountability. Exceeds targets.";
  if (percentage >= 70) return "Good performance orientation. Meets targets effectively.";
  if (percentage >= 60) return "Moderate performance focus. May need guidance on goal setting.";
  if (percentage >= 50) return "Adequate performance. Meets basic expectations.";
  if (percentage >= 40) return "Performance concerns. Inconsistent delivery.";
  return "Poor performance orientation. Significant gaps.";
};

const getGeneralWorkPaceInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly productive and efficient. Consistently exceeds expectations.";
  if (percentage >= 70) return "Good work pace. Meets deadlines consistently.";
  if (percentage >= 60) return "Moderate productivity. May need support during peak periods.";
  if (percentage >= 50) return "Adequate work pace. Meets basic expectations.";
  if (percentage >= 40) return "Slow work pace. May struggle with deadlines.";
  return "Poor productivity. Significant concerns.";
};

const getGeneralDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Cognitive')) return "Critical cognitive gaps will significantly impact learning and problem-solving.";
    if (categoryName.includes('Communication')) return "Severe communication challenges will lead to misunderstandings and errors.";
    if (categoryName.includes('Cultural')) return "Significant cultural misalignment may cause team friction and disengagement.";
    if (categoryName.includes('Emotional')) return "Poor emotional intelligence will negatively impact team dynamics.";
    if (categoryName.includes('Ethics')) return "Serious ethical concerns require immediate attention and supervision.";
    if (categoryName.includes('Leadership')) return "Lack of leadership capability will prevent effective team management.";
    if (categoryName.includes('Performance')) return "Inconsistent performance will require constant supervision.";
    if (categoryName.includes('Personality')) return "Behavioral issues may disrupt team cohesion.";
    if (categoryName.includes('Problem')) return "Poor problem-solving skills will lead to dependency on others.";
    if (categoryName.includes('Technical')) return "Technical knowledge gaps will limit effectiveness in technical roles.";
  }
  return "This area requires development to reach expected levels.";
};

const getGeneralDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Cognitive')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete structured problem-solving training and practice with case studies. Work with a mentor on complex analytical tasks.`;
  }
  if (categoryName.includes('Communication')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Take business writing and presentation skills courses. Join Toastmasters. Practice presentations with feedback.`;
  }
  if (categoryName.includes('Cultural')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Participate in company culture workshops. Schedule regular feedback sessions on cultural alignment. Pair with a culture champion.`;
  }
  if (categoryName.includes('Emotional')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Participate in EI workshops focusing on self-awareness and empathy. Practice active listening. Seek regular feedback.`;
  }
  if (categoryName.includes('Ethics')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete ethics training. Discuss ethical dilemmas with supervisor. Review company values and their application.`;
  }
  if (categoryName.includes('Leadership')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Take leadership development courses. Seek opportunities to lead small projects. Work with a leadership coach.`;
  }
  if (categoryName.includes('Performance')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Set SMART goals and track progress weekly. Learn performance management frameworks. Practice accountability.`;
  }
  if (categoryName.includes('Personality')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Work with a coach on professional presence. Practice adaptability through varied assignments. Seek feedback on behavior.`;
  }
  if (categoryName.includes('Problem')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn structured problem-solving frameworks. Practice with real-world case studies. Participate in design thinking workshops.`;
  }
  if (categoryName.includes('Technical')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete foundational technical training courses. Shadow experienced technicians. Create a structured skill development plan.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted training in this area with weekly progress reviews.`;
};

const getGeneralStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Cognitive')) return `Strong analytical thinking (${percentage}%). Can handle complex problems. Leverage in strategic roles.`;
  if (categoryName.includes('Communication')) return `Strong communication skills (${percentage}%). Effective in stakeholder engagement. Leverage in client-facing roles.`;
  if (categoryName.includes('Cultural')) return `Strong cultural alignment (${percentage}%). Embodies company values. Leverage as culture champion.`;
  if (categoryName.includes('Emotional')) return `High emotional intelligence (${percentage}%). Skilled at managing relationships. Leverage in team leadership.`;
  if (categoryName.includes('Ethics')) return `Strong ethical foundation (${percentage}%). Trustworthy and principled. Leverage in compliance roles.`;
  if (categoryName.includes('Leadership')) return `Strong leadership potential (${percentage}%). Inspires and develops others. Leverage in management roles.`;
  if (categoryName.includes('Performance')) return `Results-driven (${percentage}%). Strong accountability. Leverage in target-driven roles.`;
  if (categoryName.includes('Personality')) return `Stable and adaptable (${percentage}%). Positive work patterns. Leverage in dynamic environments.`;
  if (categoryName.includes('Problem')) return `Excellent problem-solver (${percentage}%). Systematic and creative. Leverage in analytical roles.`;
  if (categoryName.includes('Technical')) return `Strong technical expertise (${percentage}%). Deep understanding. Leverage in technical specialist roles.`;
  return `Strong performance in ${categoryName} (${percentage}%). This is a valuable asset.`;
};

const getGeneralOverallSummary = (categories, strengths, weaknesses) => {
  const strongAreas = strengths.length;
  const weakAreas = weaknesses.length;
  
  if (strongAreas >= 5 && weakAreas <= 2) return "a strong profile with multiple strengths and manageable development areas";
  if (strongAreas >= 3 && weakAreas <= 3) return "a balanced profile with identifiable strengths and clear development paths";
  if (weakAreas >= 5) return "significant development needs across multiple areas requiring structured support";
  return "a mixed profile with both strengths and significant development areas";
};

const getGeneralOverallRecommendation = (categories) => {
  const weakAreas = categories.filter(c => c.percentage < 50).length;
  
  if (weakAreas >= 5) return "a comprehensive development program addressing multiple areas with intensive support";
  if (weakAreas >= 3) return "targeted development in priority areas with regular progress monitoring";
  return "structured development focusing on identified weak areas while leveraging strengths";
};

const getGeneralOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall performance is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall performance is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall performance indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

// Leadership Assessment helper functions
const getLeadershipVisionInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional strategic thinker with compelling vision. Anticipates future trends effectively.";
  if (percentage >= 70) return "Good strategic thinking. Sees the big picture and understands organizational direction.";
  if (percentage >= 60) return "Moderate strategic ability. Needs development in long-term planning.";
  if (percentage >= 50) return "Adequate strategic thinking. Tends to focus on tactical rather than strategic.";
  if (percentage >= 40) return "Limited strategic thinking. Needs significant development.";
  return "Poor strategic thinking. Significant concerns.";
};

const getLeadershipDecisionInterpretation = (percentage) => {
  if (percentage >= 80) return "Decisive and analytical. Makes sound judgments consistently, even under pressure.";
  if (percentage >= 70) return "Good decision-maker. Handles most decisions effectively.";
  if (percentage >= 60) return "Moderate decision-making. May need support with complex choices.";
  if (percentage >= 50) return "Adequate decision-making. Struggles with timely decisions.";
  if (percentage >= 40) return "Limited decision-making. Needs improvement.";
  return "Poor decision-making. Significant concerns.";
};

const getLeadershipExecutionInterpretation = (percentage) => {
  if (percentage >= 80) return "Drives results with disciplined execution. Highly accountable.";
  if (percentage >= 70) return "Good execution focus. Delivers results consistently.";
  if (percentage >= 60) return "Moderate execution. May need help with follow-through.";
  if (percentage >= 50) return "Adequate execution. Inconsistent results.";
  if (percentage >= 40) return "Limited execution. Needs improvement.";
  return "Poor execution. Significant concerns.";
};

const getLeadershipInfluenceInterpretation = (percentage) => {
  if (percentage >= 80) return "Powerful communicator who influences effectively at all levels.";
  if (percentage >= 70) return "Good communicator with developing influence skills.";
  if (percentage >= 60) return "Moderate influence. May struggle with persuasion.";
  if (percentage >= 50) return "Adequate communication. Limited influence.";
  if (percentage >= 40) return "Limited influence. Needs development.";
  return "Poor communication and influence skills.";
};

const getLeadershipChangeInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional change leader. Drives transformation and adapts quickly.";
  if (percentage >= 70) return "Good at managing change. Adapts well to new situations.";
  if (percentage >= 60) return "Moderate change agility. May need support during transitions.";
  if (percentage >= 50) return "Adequate change management. Struggles with adaptation.";
  if (percentage >= 40) return "Limited change agility. Needs development.";
  return "Poor change agility. Resists change.";
};

const getLeadershipResilienceInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly resilient. Thrives under pressure.";
  if (percentage >= 70) return "Good resilience. Handles pressure well.";
  if (percentage >= 60) return "Moderate resilience. May struggle under intense pressure.";
  if (percentage >= 50) return "Adequate resilience. Needs support in high-stress situations.";
  if (percentage >= 40) return "Limited resilience. Easily overwhelmed.";
  return "Poor resilience. Significant concerns.";
};

const getLeadershipPeopleInterpretation = (percentage) => {
  if (percentage >= 80) return "Develops and coaches others exceptionally. Builds high-performing teams.";
  if (percentage >= 70) return "Good people manager. Supports team development.";
  if (percentage >= 60) return "Moderate people skills. Needs development in coaching.";
  if (percentage >= 50) return "Adequate people management. Challenges in developing others.";
  if (percentage >= 40) return "Limited people management. Needs improvement.";
  return "Poor people management. Significant concerns.";
};

const getLeadershipEInterpretation = (percentage) => {
  if (percentage >= 80) return "High emotional intelligence. Self-aware and empathetic.";
  if (percentage >= 70) return "Good emotional awareness. Navigates situations well.";
  if (percentage >= 60) return "Moderate emotional intelligence. May struggle with complex dynamics.";
  if (percentage >= 50) return "Adequate emotional awareness. Needs development.";
  if (percentage >= 40) return "Limited emotional intelligence. May struggle with relationships.";
  return "Poor emotional intelligence. Significant challenges.";
};

const getLeadershipCulturalInterpretation = (percentage) => {
  if (percentage >= 80) return "Champions diversity and inclusion. Creates inclusive environments.";
  if (percentage >= 70) return "Good cultural competence. Values diversity.";
  if (percentage >= 60) return "Moderate awareness of diversity issues. Needs development.";
  if (percentage >= 50) return "Adequate cultural awareness. May need training.";
  if (percentage >= 40) return "Limited cultural competence. Needs improvement.";
  return "Poor cultural competence. Concerns in this area.";
};

const getLeadershipSelfAwarenessInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly self-aware and well-regulated. Understands impact on others.";
  if (percentage >= 70) return "Good self-awareness. Regulates well.";
  if (percentage >= 60) return "Moderate self-awareness. May have blind spots.";
  if (percentage >= 50) return "Adequate self-awareness. Needs development.";
  if (percentage >= 40) return "Limited self-awareness. Needs improvement.";
  return "Poor self-awareness. Significant concerns.";
};

const getLeadershipAdaptabilityInterpretation = (categories) => {
  const change = categories.find(c => c.name.includes('Change'))?.percentage || 0;
  const resilience = categories.find(c => c.name.includes('Resilience'))?.percentage || 0;
  const avg = (change + resilience) / 2;
  
  if (avg >= 70) return "Highly adaptable leader who thrives in changing environments";
  if (avg >= 50) return "Moderately adaptable but may need support during major transitions";
  return "Struggles with change and may need additional support during transitions";
};

const getLeadershipTeamFocusInterpretation = (categories) => {
  const people = categories.find(c => c.name.includes('People'))?.percentage || 0;
  const emotional = categories.find(c => c.name.includes('Emotional'))?.percentage || 0;
  const avg = (people + emotional) / 2;
  
  if (avg >= 70) return "Strong focus on team development and creating psychological safety";
  if (avg >= 50) return "Developing focus on team development with room for growth";
  return "Limited focus on team development, may need to prioritize people management";
};

const getLeadershipDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Vision')) return "Lack of strategic vision will prevent effective direction-setting.";
    if (categoryName.includes('Decision')) return "Poor decision-making will lead to organizational risks.";
    if (categoryName.includes('People')) return "Inability to manage people will lead to team disengagement.";
    if (categoryName.includes('Change')) return "Resistance to change will hinder organizational agility.";
    if (categoryName.includes('Communication')) return "Poor communication will create confusion and misalignment.";
    if (categoryName.includes('Execution')) return "Lack of execution focus will prevent goal achievement.";
    if (categoryName.includes('Resilience')) return "Low resilience will lead to leadership derailment under pressure.";
    if (categoryName.includes('Self')) return "Lack of self-awareness will blind the leader to their impact.";
  }
  return "This area requires development for leadership effectiveness.";
};

const getLeadershipDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Vision')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Study organizational strategy. Practice writing vision statements. Discuss strategic concepts with a mentor. Read books on strategic thinking.`;
  }
  if (categoryName.includes('Decision')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Use structured decision-making frameworks. Discuss major decisions with mentor. Analyze past decisions to identify improvement areas.`;
  }
  if (categoryName.includes('People')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete people management training. Practice giving feedback. Shadow an experienced manager. Take on informal mentoring.`;
  }
  if (categoryName.includes('Change')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn change management models. Practice communicating about change positively. Volunteer for change initiatives.`;
  }
  if (categoryName.includes('Communication') || categoryName.includes('Influence')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Take influencing skills workshop. Practice tailoring messages to different audiences. Seek feedback on communication.`;
  }
  if (categoryName.includes('Execution')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Set SMART goals and track progress. Use project management tools. Address obstacles immediately. Celebrate small wins.`;
  }
  if (categoryName.includes('Resilience')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Develop a personal resilience plan. Practice recovery activities. Build a support network. Learn stress management techniques.`;
  }
  if (categoryName.includes('Self')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Seek 360-degree feedback. Work with a coach to identify blind spots. Regularly reflect on decisions and interactions.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted leadership development in this area.`;
};

const getLeadershipStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Vision')) return `Strong strategic vision (${percentage}%). Can set clear direction and anticipate future trends.`;
  if (categoryName.includes('Decision')) return `Excellent decision-making (${percentage}%). Makes sound judgments under pressure.`;
  if (categoryName.includes('People')) return `Strong people management (${percentage}%). Develops and coaches others effectively.`;
  if (categoryName.includes('Change')) return `Exceptional change leadership (${percentage}%). Drives transformation effectively.`;
  if (categoryName.includes('Communication')) return `Powerful influencer (${percentage}%). Communicates persuasively at all levels.`;
  if (categoryName.includes('Execution')) return `Results-driven leader (${percentage}%). Disciplined execution and accountability.`;
  if (categoryName.includes('Resilience')) return `Highly resilient leader (${percentage}%). Thrives under pressure.`;
  if (categoryName.includes('Self')) return `Highly self-aware leader (${percentage}%). Understands impact on others.`;
  return `Strong leadership capability in ${categoryName} (${percentage}%).`;
};

const getLeadershipOverallSummary = (avgScore, strengthsCount) => {
  if (avgScore >= 70) return `strong with ${strengthsCount} key leadership strengths`;
  if (avgScore >= 50) return `developing with ${strengthsCount} identified leadership strengths`;
  return `limited with significant development needs`;
};

const getLeadershipOverallRecommendation = (categories) => {
  const weakAreas = categories.filter(c => c.percentage < 50).length;
  
  if (weakAreas >= 5) return "comprehensive leadership development program with intensive coaching";
  if (weakAreas >= 3) return "targeted leadership development in priority areas with mentorship";
  return "focused leadership development building on existing strengths";
};

const getLeadershipOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall leadership capability is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall leadership capability is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall leadership capability indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

// Technical Assessment helper functions
const getTechnicalKnowledgeInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional technical knowledge. Deep understanding of systems and technologies.";
  if (percentage >= 70) return "Strong technical knowledge. Solid grasp of core concepts.";
  if (percentage >= 60) return "Moderate technical knowledge. Needs training in advanced areas.";
  if (percentage >= 50) return "Adequate technical knowledge. Requires foundational training.";
  if (percentage >= 40) return "Limited technical knowledge. Significant gaps.";
  return "Poor technical knowledge. Requires immediate attention.";
};

const getTechnicalSystemInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional system understanding. Comprehends complex interactions.";
  if (percentage >= 70) return "Good system understanding. Grasps how components work together.";
  if (percentage >= 60) return "Moderate system knowledge. May need help with complex interactions.";
  if (percentage >= 50) return "Adequate system understanding. Needs development.";
  if (percentage >= 40) return "Limited system understanding. Struggles with integrated concepts.";
  return "Poor system understanding. Significant concerns.";
};

const getTechnicalDocumentationInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional documentation skills. Creates clear, comprehensive documentation.";
  if (percentage >= 70) return "Good documentation skills. Produces clear documentation.";
  if (percentage >= 60) return "Moderate documentation skills. May need improvement in clarity.";
  if (percentage >= 50) return "Adequate documentation. Needs development.";
  if (percentage >= 40) return "Limited documentation skills. Struggles with technical writing.";
  return "Poor documentation skills. Significant concerns.";
};

const getTechnicalTroubleshootingInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional troubleshooter. Quickly identifies root causes.";
  if (percentage >= 70) return "Good troubleshooting skills. Handles most issues effectively.";
  if (percentage >= 60) return "Moderate troubleshooting. May need support with complex problems.";
  if (percentage >= 50) return "Adequate troubleshooting. Needs development.";
  if (percentage >= 40) return "Limited troubleshooting. Struggles with problem diagnosis.";
  return "Poor troubleshooting. Significant difficulties.";
};

const getTechnicalApplicationInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional practical application. Translates knowledge effectively.";
  if (percentage >= 70) return "Good practical skills. Applies knowledge effectively.";
  if (percentage >= 60) return "Moderate practical application. Needs guidance for complex applications.";
  if (percentage >= 50) return "Adequate practical skills. Needs development.";
  if (percentage >= 40) return "Limited practical skills. Struggles to apply knowledge.";
  return "Poor practical application. Significant gap.";
};

const getTechnicalProcessInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional process optimization skills. Continuously improves workflows.";
  if (percentage >= 70) return "Good optimization skills. Identifies improvement opportunities.";
  if (percentage >= 60) return "Moderate optimization awareness. Needs guidance.";
  if (percentage >= 50) return "Adequate process focus. Needs development.";
  if (percentage >= 40) return "Limited optimization focus. Follows processes without question.";
  return "Poor process optimization. May resist changes.";
};

const getTechnicalEquipmentInterpretation = (percentage) => {
  if (percentage >= 80) return "Expert equipment operator. Masters all machinery.";
  if (percentage >= 70) return "Good equipment skills. Handles most machinery effectively.";
  if (percentage >= 60) return "Moderate equipment skills. Needs training on advanced equipment.";
  if (percentage >= 50) return "Adequate equipment skills. Requires supervision.";
  if (percentage >= 40) return "Limited equipment skills. Needs significant training.";
  return "Poor equipment skills. Requires immediate attention.";
};

const getTechnicalMaintenanceInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional maintenance knowledge. Performs all procedures thoroughly.";
  if (percentage >= 70) return "Good maintenance skills. Handles routine maintenance effectively.";
  if (percentage >= 60) return "Moderate maintenance knowledge. Needs training on complex procedures.";
  if (percentage >= 50) return "Adequate maintenance skills. Requires guidance.";
  if (percentage >= 40) return "Limited maintenance skills. Needs development.";
  return "Poor maintenance understanding. Significant gaps.";
};

const getTechnicalSafetyInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional safety focus. Champions safety protocols.";
  if (percentage >= 70) return "Good safety awareness. Follows procedures consistently.";
  if (percentage >= 60) return "Moderate safety knowledge. Needs reinforcement of protocols.";
  if (percentage >= 50) return "Adequate safety awareness. Requires monitoring.";
  if (percentage >= 40) return "Limited safety awareness. Needs immediate attention.";
  return "Poor safety understanding. Significant concerns.";
};

const getTechnicalQualityInterpretation = (percentage) => {
  if (percentage >= 80) return "Quality expert. Maintains exceptional standards.";
  if (percentage >= 70) return "Good quality focus. Maintains standards and identifies issues.";
  if (percentage >= 60) return "Moderate quality awareness. Needs support.";
  if (percentage >= 50) return "Adequate quality focus. Inconsistent standards.";
  if (percentage >= 40) return "Limited quality focus. Needs improvement.";
  return "Poor quality focus. Significant concerns.";
};

const getTechnicalDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Technical Knowledge')) return "Critical knowledge gaps will prevent effective technical performance.";
    if (categoryName.includes('System')) return "Poor system understanding will lead to integration errors.";
    if (categoryName.includes('Troubleshooting')) return "Inability to troubleshoot will create dependency on others.";
    if (categoryName.includes('Safety')) return "Safety concerns create significant risk for self and others.";
    if (categoryName.includes('Quality')) return "Quality issues will lead to rework and customer dissatisfaction.";
    if (categoryName.includes('Equipment')) return "Equipment operation deficiencies create safety and productivity risks.";
    if (categoryName.includes('Maintenance')) return "Poor maintenance practices will lead to equipment failure.";
  }
  return "This area requires development for technical competence.";
};

const getTechnicalDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Technical Knowledge')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete foundational technical training courses. Create a structured learning plan. Shadow experienced technicians.`;
  }
  if (categoryName.includes('System')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Map out system components and relationships. Study system documentation. Discuss interactions with experienced colleagues.`;
  }
  if (categoryName.includes('Troubleshooting')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn systematic troubleshooting methodologies. Practice with simulated problems. Document troubleshooting steps.`;
  }
  if (categoryName.includes('Practical')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice applying knowledge in supervised settings. Work on simple projects first. Get feedback on application.`;
  }
  if (categoryName.includes('Safety')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete all required safety training. Follow procedures exactly. Report concerns immediately.`;
  }
  if (categoryName.includes('Quality')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn quality standards and inspection methods. Practice self-checking work. Use quality tools consistently.`;
  }
  if (categoryName.includes('Process')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn process mapping and analysis techniques. Identify waste in current processes. Suggest incremental improvements.`;
  }
  if (categoryName.includes('Equipment')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete equipment training and certification. Practice under supervision. Follow operating procedures strictly.`;
  }
  if (categoryName.includes('Maintenance')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn preventive maintenance schedules and procedures. Document maintenance activities. Develop troubleshooting skills.`;
  }
  if (categoryName.includes('Documentation')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Study existing documentation thoroughly. Practice writing clear procedures. Get feedback on documentation.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted technical training in this area.`;
};

const getTechnicalStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Technical Knowledge')) return `Strong technical expertise (${percentage}%). Deep understanding of systems.`;
  if (categoryName.includes('System')) return `Strong system understanding (${percentage}%). Grasps complex interactions.`;
  if (categoryName.includes('Troubleshooting')) return `Excellent troubleshooting skills (${percentage}%). Quickly identifies root causes.`;
  if (categoryName.includes('Practical')) return `Strong practical application (${percentage}%). Translates knowledge effectively.`;
  if (categoryName.includes('Safety')) return `Strong safety focus (${percentage}%). Champions safety protocols.`;
  if (categoryName.includes('Quality')) return `Strong quality focus (${percentage}%). Maintains exceptional standards.`;
  if (categoryName.includes('Process')) return `Strong process optimization skills (${percentage}%). Continuously improves workflows.`;
  if (categoryName.includes('Equipment')) return `Strong equipment operation skills (${percentage}%). Masters machinery.`;
  if (categoryName.includes('Maintenance')) return `Strong maintenance skills (${percentage}%). Performs procedures effectively.`;
  if (categoryName.includes('Documentation')) return `Strong documentation skills (${percentage}%). Creates clear documentation.`;
  return `Strong technical competence in ${categoryName} (${percentage}%).`;
};

const getTechnicalOverallSummary = (avgScore, strengthsCount) => {
  if (avgScore >= 70) return `strong with ${strengthsCount} key technical strengths`;
  if (avgScore >= 50) return `developing with ${strengthsCount} identified technical strengths`;
  return `limited with significant development needs`;
};

const getTechnicalOverallRecommendation = (categories) => {
  const weakAreas = categories.filter(c => c.percentage < 50).length;
  
  if (weakAreas >= 5) return "comprehensive technical training program with hands-on practice and mentorship";
  if (weakAreas >= 3) return "targeted technical training in priority areas with practical application";
  return "focused technical development building on existing strengths";
};

const getTechnicalOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall technical competence is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall technical competence is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall technical competence indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

// Personality Assessment helper functions
const getPersonalityOpennessInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly open to new experiences. Creative, curious, and embraces innovation.";
  if (percentage >= 70) return "Good openness. Receptive to new ideas and willing to try new approaches.";
  if (percentage >= 60) return "Moderate openness. May need encouragement to embrace change.";
  if (percentage >= 50) return "Adequate openness. Prefers familiar approaches.";
  if (percentage >= 40) return "Limited openness. Tends to prefer routines.";
  return "Poor openness. Resists new ideas and significant change.";
};

const getPersonalityConscientiousnessInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly conscientious. Organized, dependable, and achievement-oriented.";
  if (percentage >= 70) return "Good conscientiousness. Reliable and organized in most situations.";
  if (percentage >= 60) return "Moderate conscientiousness. May need support with organization.";
  if (percentage >= 50) return "Adequate conscientiousness. Inconsistent reliability.";
  if (percentage >= 40) return "Limited conscientiousness. Needs improvement.";
  return "Poor conscientiousness. Significant concerns in dependability.";
};

const getPersonalityExtraversionInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly extraverted. Energized by social interaction and naturally engaging.";
  if (percentage >= 70) return "Good extraversion. Comfortable in social situations and team environments.";
  if (percentage >= 60) return "Moderate extraversion. May need support in highly social situations.";
  if (percentage >= 50) return "Adequate extraversion. Prefers independent work at times.";
  if (percentage >= 40) return "Limited extraversion. Prefers independent work.";
  return "Poor social engagement. Significant challenges in team settings.";
};

const getPersonalityAgreeablenessInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly agreeable. Cooperative, compassionate, and skilled at maintaining relationships.";
  if (percentage >= 70) return "Good agreeableness. Generally cooperative and considerate.";
  if (percentage >= 60) return "Moderate agreeableness. Can be cooperative but may prioritize own needs.";
  if (percentage >= 50) return "Adequate agreeableness. May be competitive at times.";
  if (percentage >= 40) return "Limited agreeableness. May be perceived as challenging.";
  return "Poor agreeableness. Struggles with team collaboration.";
};

const getPersonalityNeuroticismInterpretation = (percentage) => {
  if (percentage >= 80) return "High emotional stability. Remains calm under pressure.";
  if (percentage >= 70) return "Good emotional stability. Handles pressure well.";
  if (percentage >= 60) return "Moderate emotional stability. May show signs of stress.";
  if (percentage >= 50) return "Adequate emotional stability. May be prone to stress.";
  if (percentage >= 40) return "Limited emotional stability. Struggles with pressure.";
  return "Poor emotional stability. Significant reactivity.";
};

const getPersonalityIntegrityInterpretation = (percentage) => {
  if (percentage >= 80) return "Strong ethical foundation. Trustworthy and principled.";
  if (percentage >= 70) return "Good integrity. Makes ethical choices.";
  if (percentage >= 60) return "Moderate ethical awareness. May need guidance.";
  if (percentage >= 50) return "Adequate integrity. Follows rules when clear.";
  if (percentage >= 40) return "Ethical concerns. Requires boundaries.";
  return "Poor integrity. Significant concerns.";
};

const getPersonalityEInterpretation = (percentage) => {
  if (percentage >= 80) return "High emotional intelligence. Self-aware and empathetic.";
  if (percentage >= 70) return "Good emotional awareness. Navigates situations well.";
  if (percentage >= 60) return "Moderate emotional intelligence. May struggle with complex dynamics.";
  if (percentage >= 50) return "Adequate emotional awareness. Needs development.";
  if (percentage >= 40) return "Limited emotional intelligence. May struggle with relationships.";
  return "Poor emotional intelligence. Significant challenges.";
};

const getPersonalityStressInterpretation = (percentage) => {
  if (percentage >= 80) return "Excellent stress management. Thrives under pressure.";
  if (percentage >= 70) return "Good stress management. Handles pressure well.";
  if (percentage >= 60) return "Moderate stress management. May struggle under intense pressure.";
  if (percentage >= 50) return "Adequate stress management. Needs support.";
  if (percentage >= 40) return "Limited stress management. Easily overwhelmed.";
  return "Poor stress management. Significant concerns.";
};

const getPersonalityMotivationsInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly motivated and driven. Seeks challenges and shows initiative.";
  if (percentage >= 70) return "Good motivation. Generally engaged and willing to take on responsibilities.";
  if (percentage >= 60) return "Moderate motivation. May need external motivation.";
  if (percentage >= 50) return "Adequate motivation. Responds to clear goals.";
  if (percentage >= 40) return "Limited motivation. May require frequent prompting.";
  return "Poor motivation. Shows little initiative.";
};

const getPersonalityWorkPaceInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly productive and efficient. Thrives in deadline-driven environments.";
  if (percentage >= 70) return "Good work pace. Maintains steady output.";
  if (percentage >= 60) return "Moderate work pace. May need support during peak periods.";
  if (percentage >= 50) return "Adequate work pace. Meets basic expectations.";
  if (percentage >= 40) return "Slow work pace. May struggle with deadlines.";
  return "Poor productivity. Significant concerns.";
};

const getPersonalityCollaborationStyle = (extraversion, agreeableness) => {
  const avg = (extraversion + agreeableness) / 2;
  if (avg >= 70) return "Highly collaborative team player who builds strong relationships";
  if (avg >= 50) return "Generally collaborative but may prefer independent work at times";
  return "Prefers independent work, may need encouragement to collaborate";
};

const getPersonalityDecisionStyle = (conscientiousness, neuroticism) => {
  if (conscientiousness >= 70 && neuroticism >= 70) return "Makes careful, well-considered decisions with confidence";
  if (conscientiousness >= 70) return "Makes thorough decisions but may take longer than necessary";
  if (neuroticism < 50) return "May make hasty decisions without full consideration";
  return "Decision-making may be impacted by stress and uncertainty";
};

const getPersonalityAdaptability = (openness) => {
  if (openness >= 70) return "Highly adaptable, embraces change and new situations";
  if (openness >= 50) return "Moderately adaptable, can adjust with support";
  return "Prefers routine and structure, may struggle with change";
};

const getPersonalityDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Openness')) return "Resistance to change will limit adaptability and innovation.";
    if (categoryName.includes('Conscientiousness')) return "Unreliability and disorganization will impact performance.";
    if (categoryName.includes('Extraversion')) return "Social withdrawal will limit team collaboration and communication.";
    if (categoryName.includes('Agreeableness')) return "Interpersonal friction may disrupt team dynamics.";
    if (categoryName.includes('Neuroticism')) return "Emotional reactivity will negatively impact relationships and performance under pressure.";
    if (categoryName.includes('Integrity')) return "Ethical concerns create significant organizational risk.";
    if (categoryName.includes('Emotional')) return "Poor emotional intelligence will hinder relationships and teamwork.";
    if (categoryName.includes('Stress')) return "Inability to manage stress will lead to performance issues.";
    if (categoryName.includes('Motivations')) return "Low motivation will require constant external direction.";
    if (categoryName.includes('Work Pace')) return "Slow work pace will impact productivity and deadline achievement.";
  }
  return "This area requires development for personal effectiveness.";
};

const getPersonalityDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Openness')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Start with small changes to routine. Practice curiosity by learning about one new topic weekly. Work with a mentor to explore new approaches.`;
  }
  if (categoryName.includes('Conscientiousness')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Use detailed checklists and project management tools. Set up accountability partnerships with regular check-ins. Break commitments into smaller, trackable steps.`;
  }
  if (categoryName.includes('Extraversion')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice one-on-one interactions in low-stakes settings first. Prepare talking points before meetings. Consider joining a supportive group like Toastmasters.`;
  }
  if (categoryName.includes('Agreeableness')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice assertiveness techniques. Learn to set boundaries while maintaining relationships. Role-play difficult conversations with a coach.`;
  }
  if (categoryName.includes('Neuroticism')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice mindfulness and stress-reduction techniques daily. Consider professional coaching for anxiety management. Establish predictable routines to reduce uncertainty.`;
  }
  if (categoryName.includes('Integrity')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Participate in ethics workshops and case study discussions. Review company values and discuss practical applications with supervisor.`;
  }
  if (categoryName.includes('Emotional')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Participate in EI workshops focusing on self-awareness and empathy. Practice identifying emotions in self and others. Seek regular feedback on interpersonal interactions.`;
  }
  if (categoryName.includes('Stress')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn and practice stress management techniques daily. Consider employee assistance program resources. Establish work-life boundaries.`;
  }
  if (categoryName.includes('Motivations')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Connect daily tasks to larger organizational goals. Establish a recognition system with frequent positive feedback. Consider job crafting to align tasks with interests.`;
  }
  if (categoryName.includes('Work Pace')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Implement time management training and productivity tools. Set clear daily/weekly goals with regular progress reviews. Consider breaking large tasks into smaller chunks.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted personal development in this area.`;
};

const getPersonalityStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Openness')) return `High openness (${percentage}%). Creative and innovative. Embraces new ideas.`;
  if (categoryName.includes('Conscientiousness')) return `High conscientiousness (${percentage}%). Organized, dependable, and detail-oriented.`;
  if (categoryName.includes('Extraversion')) return `High extraversion (${percentage}%). Energized by social interaction. Builds relationships easily.`;
  if (categoryName.includes('Agreeableness')) return `High agreeableness (${percentage}%). Cooperative, compassionate, and skilled at maintaining relationships.`;
  if (categoryName.includes('Neuroticism')) return `High emotional stability (${percentage}%). Remains calm under pressure.`;
  if (categoryName.includes('Integrity')) return `Strong integrity (${percentage}%). Trustworthy and principled.`;
  if (categoryName.includes('Emotional')) return `High emotional intelligence (${percentage}%). Self-aware and empathetic.`;
  if (categoryName.includes('Stress')) return `Excellent stress management (${percentage}%). Thrives under pressure.`;
  if (categoryName.includes('Motivations')) return `Highly motivated (${percentage}%). Seeks challenges and shows initiative.`;
  if (categoryName.includes('Work Pace')) return `Highly productive (${percentage}%). Thrives in deadline-driven environments.`;
  return `Strong personality trait in ${categoryName} (${percentage}%).`;
};

const getPersonalityOverallSummary = (categories) => {
  const strengths = categories.filter(c => c.percentage >= 70).length;
  const concerns = categories.filter(c => c.percentage < 50).length;
  
  if (strengths >= 5) return "a well-integrated personality profile with multiple strengths";
  if (concerns >= 5) return "significant personality concerns requiring attention";
  if (strengths >= 3) return "a generally balanced profile with identifiable strengths";
  return "a developing personality profile with areas for growth";
};

const getPersonalityEnvironmentMatch = (categories) => {
  const extraversion = categories.find(c => c.name.includes('Extraversion'))?.percentage || 50;
  const openness = categories.find(c => c.name.includes('Openness'))?.percentage || 50;
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness'))?.percentage || 50;
  
  if (extraversion >= 70) return "provide social interaction and team collaboration";
  if (openness >= 70) return "offer variety, innovation, and new challenges";
  if (conscientiousness >= 70) return "have clear structure, expectations, and opportunities for achievement";
  return "provide stability, clear expectations, and supportive supervision";
};

const getPersonalityOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall personality profile is well-developed with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall personality profile is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall personality profile indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};

// Performance Assessment helper functions
const getPerformanceProductivityInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly productive and efficient. Consistently exceeds targets.";
  if (percentage >= 70) return "Good productivity. Meets targets with efficient work processes.";
  if (percentage >= 60) return "Moderate productivity. May need support with time management.";
  if (percentage >= 50) return "Adequate productivity. Meets basic expectations.";
  if (percentage >= 40) return "Limited productivity. Struggles to meet targets.";
  return "Poor productivity. Significant concerns.";
};

const getPerformanceQualityInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional work quality. Consistently high standards and attention to detail.";
  if (percentage >= 70) return "Good work quality. Reliable and produces solid results.";
  if (percentage >= 60) return "Moderate quality. May need improvement in accuracy.";
  if (percentage >= 50) return "Adequate quality. Inconsistent at times.";
  if (percentage >= 40) return "Limited quality focus. Needs improvement.";
  return "Poor quality. Significant concerns.";
};

const getPerformanceTimeInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional time management. Prioritizes effectively and meets all deadlines.";
  if (percentage >= 70) return "Good time management. Generally meets deadlines.";
  if (percentage >= 60) return "Moderate time management. May need help with prioritization.";
  if (percentage >= 50) return "Adequate time management. Sometimes misses deadlines.";
  if (percentage >= 40) return "Limited time management. Often misses deadlines.";
  return "Poor time management. Significant concerns.";
};

const getPerformanceResultsInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly results-oriented. Focused on outcomes and driven to succeed.";
  if (percentage >= 70) return "Good results focus. Works toward goals effectively.";
  if (percentage >= 60) return "Moderate results orientation. May lose focus on outcomes.";
  if (percentage >= 50) return "Adequate results focus. Needs direction.";
  if (percentage >= 40) return "Limited results focus. Lacks drive.";
  return "Poor results orientation. Significant concerns.";
};

const getPerformanceAccountabilityInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional accountability. Takes full ownership and learns from mistakes.";
  if (percentage >= 70) return "Good accountability. Takes responsibility for own work.";
  if (percentage >= 60) return "Moderate accountability. May sometimes deflect responsibility.";
  if (percentage >= 50) return "Adequate accountability. Needs encouragement.";
  if (percentage >= 40) return "Limited accountability. May blame others.";
  return "Poor accountability. Avoids responsibility.";
};

const getPerformanceInitiativeInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional initiative. Proactively seeks opportunities and acts without waiting.";
  if (percentage >= 70) return "Good initiative. Takes action when needed.";
  if (percentage >= 60) return "Moderate initiative. May need prompting to act.";
  if (percentage >= 50) return "Adequate initiative. Waits for direction at times.";
  if (percentage >= 40) return "Limited initiative. Rarely takes action independently.";
  return "Poor initiative. Avoids taking action.";
};

const getPerformanceCollaborationInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional collaborator. Builds strong relationships and enhances team performance.";
  if (percentage >= 70) return "Good collaboration skills. Works well with others.";
  if (percentage >= 60) return "Moderate collaboration. May need development in teamwork.";
  if (percentage >= 50) return "Adequate collaboration. Works independently at times.";
  if (percentage >= 40) return "Limited collaboration. May work in silos.";
  return "Poor collaboration. Struggles in team settings.";
};

const getPerformanceGoalInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional goal achievement. Consistently exceeds objectives.";
  if (percentage >= 70) return "Good goal achievement. Meets most targets.";
  if (percentage >= 60) return "Moderate goal achievement. May need support with goal setting.";
  if (percentage >= 50) return "Adequate goal achievement. Sometimes meets objectives.";
  if (percentage >= 40) return "Limited goal achievement. Struggles to meet objectives.";
  return "Poor goal achievement. Significant concerns.";
};

const getPerformanceDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Productivity')) return "Low productivity will significantly impact output and team performance.";
    if (categoryName.includes('Quality')) return "Poor quality work will lead to rework and customer dissatisfaction.";
    if (categoryName.includes('Time')) return "Poor time management will result in missed deadlines and bottlenecks.";
    if (categoryName.includes('Results')) return "Lack of results orientation will prevent goal achievement.";
    if (categoryName.includes('Accountability')) return "Lack of accountability will require constant supervision.";
    if (categoryName.includes('Initiative')) return "Lack of initiative will require constant direction.";
    if (categoryName.includes('Collaboration')) return "Poor collaboration will hinder team effectiveness.";
    if (categoryName.includes('Goal')) return "Inability to achieve goals will impact organizational results.";
  }
  return "This area requires development for performance effectiveness.";
};

const getPerformanceDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Productivity')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Use time tracking to identify inefficiencies. Learn productivity techniques (batch processing, Pomodoro). Set daily output goals.`;
  }
  if (categoryName.includes('Quality')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Use checklists to ensure quality. Get feedback on work product. Study examples of excellent work. Review work before submitting.`;
  }
  if (categoryName.includes('Time')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Use a calendar and task list consistently. Prioritize tasks using urgency/importance matrix. Estimate time needed more accurately.`;
  }
  if (categoryName.includes('Results')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Focus on outcomes rather than activities. Track results metrics. Adjust approach based on results. Set stretch goals.`;
  }
  if (categoryName.includes('Accountability')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Make commitments in writing. Share goals with others for accountability. Follow through consistently. Take ownership of mistakes.`;
  }
  if (categoryName.includes('Initiative')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Identify one improvement to make independently. Volunteer for small tasks. Proactively seek additional responsibilities.`;
  }
  if (categoryName.includes('Collaboration')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice active listening in meetings. Seek input from others before deciding. Acknowledge others' contributions. Volunteer for cross-functional projects.`;
  }
  if (categoryName.includes('Goal')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Break goals into weekly action steps. Track progress visibly. Celebrate small wins. Set SMART goals with clear metrics.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted performance development in this area.`;
};

const getPerformanceStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Productivity')) return `Highly productive (${percentage}%). Consistently exceeds targets.`;
  if (categoryName.includes('Quality')) return `Exceptional quality focus (${percentage}%). Consistently high standards.`;
  if (categoryName.includes('Time')) return `Excellent time management (${percentage}%). Prioritizes effectively.`;
  if (categoryName.includes('Results')) return `Highly results-oriented (${percentage}%). Focused on outcomes.`;
  if (categoryName.includes('Accountability')) return `Exceptional accountability (${percentage}%). Takes full ownership.`;
  if (categoryName.includes('Initiative')) return `Exceptional initiative (${percentage}%). Proactively seeks opportunities.`;
  if (categoryName.includes('Collaboration')) return `Exceptional collaborator (${percentage}%). Builds strong relationships.`;
  if (categoryName.includes('Goal')) return `Exceptional goal achievement (${percentage}%). Consistently exceeds objectives.`;
  return `Strong performance in ${categoryName} (${percentage}%).`;
};

const getPerformanceOverallSummary = (avgScore) => {
  if (avgScore >= 70) return "strong with consistent performance across areas";
  if (avgScore >= 50) return "developing with room for improvement in several areas";
  return "limited with significant performance concerns requiring attention";
};

const getPerformanceOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall performance is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall performance is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall performance indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};

// Behavioral Assessment helper functions
const getBehavioralTeamworkInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional team player. Builds strong relationships and enhances team dynamics.";
  if (percentage >= 70) return "Good teamwork. Collaborates effectively and contributes to team success.";
  if (percentage >= 60) return "Moderate teamwork. May need development in collaboration.";
  if (percentage >= 50) return "Adequate teamwork. Works well in most team settings.";
  if (percentage >= 40) return "Limited teamwork. May prefer working alone.";
  return "Poor teamwork. Struggles in team settings.";
};

const getBehavioralInterpersonalInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional interpersonal skills. Builds rapport easily and navigates social situations skillfully.";
  if (percentage >= 70) return "Good interpersonal skills. Relates well to others.";
  if (percentage >= 60) return "Moderate interpersonal skills. May need development in social awareness.";
  if (percentage >= 50) return "Adequate interpersonal skills. Generally gets along with others.";
  if (percentage >= 40) return "Limited interpersonal skills. May struggle in social situations.";
  return "Poor interpersonal skills. Significant social challenges.";
};

const getBehavioralProfessionalismInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional professionalism. Consistently displays appropriate behavior and communication.";
  if (percentage >= 70) return "Good professionalism. Generally professional in most situations.";
  if (percentage >= 60) return "Moderate professionalism. May need guidance on professional conduct.";
  if (percentage >= 50) return "Adequate professionalism. Meets basic expectations.";
  if (percentage >= 40) return "Limited professionalism. May have lapses in behavior.";
  return "Poor professionalism. Significant concerns.";
};

const getBehavioralListeningInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional listener. Fully attends to others and responds thoughtfully.";
  if (percentage >= 70) return "Good listening skills. Generally attentive and responsive.";
  if (percentage >= 60) return "Moderate listening skills. May sometimes miss key information.";
  if (percentage >= 50) return "Adequate listening. Usually pays attention.";
  if (percentage >= 40) return "Limited listening. May be easily distracted.";
  return "Poor listening. Struggles to attend to others.";
};

const getBehavioralEmpathyInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional empathy. Deeply understands others' perspectives and responds with compassion.";
  if (percentage >= 70) return "Good empathy. Understands others' feelings and perspectives.";
  if (percentage >= 60) return "Moderate empathy. May sometimes miss others' emotional cues.";
  if (percentage >= 50) return "Adequate empathy. Generally considers others' feelings.";
  if (percentage >= 40) return "Limited empathy. May struggle to understand others' perspectives.";
  return "Poor empathy. Difficulty relating to others' experiences.";
};

const getBehavioralFeedbackInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional feedback receptivity. Welcomes feedback and uses it to improve.";
  if (percentage >= 70) return "Good feedback reception. Generally open to feedback.";
  if (percentage >= 60) return "Moderate feedback reception. May be defensive at times.";
  if (percentage >= 50) return "Adequate feedback reception. Accepts feedback when given.";
  if (percentage >= 40) return "Limited feedback reception. May resist or dismiss feedback.";
  return "Poor feedback reception. Reacts negatively to feedback.";
};

const getBehavioralCommunicationInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional communicator. Articulates ideas with clarity and impact.";
  if (percentage >= 70) return "Good communication skills. Expresses ideas clearly.";
  if (percentage >= 60) return "Moderate communication. May struggle with complex messaging.";
  if (percentage >= 50) return "Adequate communication. Conveys basic ideas.";
  if (percentage >= 40) return "Limited communication. Difficulty articulating ideas.";
  return "Poor communication. Significant development needed.";
};

const getBehavioralConflictInterpretation = (percentage) => {
  if (percentage >= 80) return "Expert conflict resolver. Navigates disagreements constructively and builds consensus.";
  if (percentage >= 70) return "Good conflict resolution. Handles most disagreements professionally.";
  if (percentage >= 60) return "Moderate conflict resolution. May need support with complex conflicts.";
  if (percentage >= 50) return "Adequate conflict resolution. Can resolve simple disagreements.";
  if (percentage >= 40) return "Limited conflict resolution. May avoid or escalate conflicts.";
  return "Poor conflict resolution. Significant concerns.";
};

const getBehavioralAdaptabilityInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly adaptable. Thrives in changing environments and embraces new challenges.";
  if (percentage >= 70) return "Good adaptability. Adjusts well to most changes and new situations.";
  if (percentage >= 60) return "Moderate adaptability. May need support during significant changes.";
  if (percentage >= 50) return "Adequate adaptability. Can adjust with guidance.";
  if (percentage >= 40) return "Limited adaptability. Struggles with change.";
  return "Poor adaptability. Significant resistance to change.";
};

const getBehavioralDecisionInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional decision-maker. Makes sound judgments consistently.";
  if (percentage >= 70) return "Good decision-maker. Handles most decisions effectively.";
  if (percentage >= 60) return "Moderate decision-making. May need support with complex choices.";
  if (percentage >= 50) return "Adequate decision-making. Can make routine decisions.";
  if (percentage >= 40) return "Limited decision-making. Struggles with analysis.";
  return "Poor decision-making. Significant concerns.";
};

const getBehavioralDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Teamwork')) return "Poor teamwork will disrupt team dynamics and collaboration.";
    if (categoryName.includes('Conflict')) return "Inability to resolve conflict will create persistent team friction.";
    if (categoryName.includes('Empathy')) return "Lack of empathy will damage relationships and trust.";
    if (categoryName.includes('Listening')) return "Poor listening skills will lead to misunderstandings and errors.";
    if (categoryName.includes('Feedback')) return "Defensiveness to feedback will prevent growth and improvement.";
    if (categoryName.includes('Interpersonal')) return "Poor interpersonal skills will hinder relationship building.";
    if (categoryName.includes('Professionalism')) return "Unprofessional behavior will damage reputation and credibility.";
    if (categoryName.includes('Adaptability')) return "Inflexibility will limit ability to handle change.";
    if (categoryName.includes('Decision')) return "Poor decision-making will lead to organizational risks.";
  }
  return "This area requires development for behavioral effectiveness.";
};

const getBehavioralDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Teamwork')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice supporting team members. Ask how you can help others. Acknowledge team achievements. Contribute ideas in team settings.`;
  }
  if (categoryName.includes('Conflict')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Learn conflict resolution basics. Practice staying calm during disagreements. Seek mediation when needed. Address conflicts early.`;
  }
  if (categoryName.includes('Empathy')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice perspective-taking. Ask about others' feelings and experiences. Listen without judgment. Consider others' needs when making decisions.`;
  }
  if (categoryName.includes('Listening')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice paraphrasing what others say. Avoid interrupting. Maintain eye contact and attentive body language. Ask clarifying questions.`;
  }
  if (categoryName.includes('Feedback')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Ask for feedback regularly. Listen without defending. Create action plans from feedback. Thank people for feedback. Show improvement based on input.`;
  }
  if (categoryName.includes('Interpersonal')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice basic social conventions (greetings, small talk). Observe effective interpersonal interactions. Build rapport with diverse colleagues.`;
  }
  if (categoryName.includes('Professionalism')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Review professional conduct guidelines. Observe professional behavior models. Get feedback on professional presence. Maintain composure in all situations.`;
  }
  if (categoryName.includes('Adaptability')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Start with small changes to routine. Practice curiosity by learning about one new topic weekly. Volunteer for projects involving new methodologies.`;
  }
  if (categoryName.includes('Decision')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Use structured decision-making frameworks. Discuss major decisions with mentor. Analyze past decisions to identify improvement areas.`;
  }
  if (categoryName.includes('Communication')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Take business writing and presentation skills courses. Practice presentations with constructive feedback. Join Toastmasters or similar groups.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted behavioral development in this area.`;
};

const getBehavioralStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Teamwork')) return `Exceptional team player (${percentage}%). Builds strong relationships and enhances team dynamics.`;
  if (categoryName.includes('Conflict')) return `Expert conflict resolver (${percentage}%). Navigates disagreements constructively.`;
  if (categoryName.includes('Empathy')) return `Exceptional empathy (${percentage}%). Deeply understands others' perspectives.`;
  if (categoryName.includes('Listening')) return `Exceptional listener (${percentage}%). Fully attends to others and responds thoughtfully.`;
  if (categoryName.includes('Feedback')) return `Exceptional feedback receptivity (${percentage}%). Welcomes feedback and uses it to improve.`;
  if (categoryName.includes('Interpersonal')) return `Exceptional interpersonal skills (${percentage}%). Builds rapport easily.`;
  if (categoryName.includes('Professionalism')) return `Exceptional professionalism (${percentage}%). Consistently displays appropriate behavior.`;
  if (categoryName.includes('Adaptability')) return `Highly adaptable (${percentage}%). Thrives in changing environments.`;
  if (categoryName.includes('Decision')) return `Exceptional decision-maker (${percentage}%). Makes sound judgments consistently.`;
  if (categoryName.includes('Communication')) return `Exceptional communicator (${percentage}%). Articulates ideas with clarity and impact.`;
  return `Strong behavioral competency in ${categoryName} (${percentage}%).`;
};

const getBehavioralOverallSummary = (avgScore, strengthsCount) => {
  if (avgScore >= 70) return `strong with ${strengthsCount} key behavioral strengths`;
  if (avgScore >= 50) return `developing with ${strengthsCount} identified behavioral strengths`;
  return `limited with significant behavioral development needs`;
};

const getBehavioralOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall behavioral profile is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall behavioral profile is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall behavioral profile indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};

// Cultural Assessment helper functions
const getCulturalValuesInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional values alignment. Naturally embodies and promotes company values.";
  if (percentage >= 70) return "Good values alignment. Generally aligned with organizational values.";
  if (percentage >= 60) return "Moderate values alignment. Some values may need reinforcement.";
  if (percentage >= 50) return "Adequate values alignment. Generally follows company values.";
  if (percentage >= 40) return "Limited values alignment. May not fully embrace company values.";
  return "Poor values alignment. Significant disconnect from organizational values.";
};

const getCulturalIntegrityInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional integrity. Trustworthy and principled with unwavering ethics.";
  if (percentage >= 70) return "Good integrity. Generally makes ethical choices with sound judgment.";
  if (percentage >= 60) return "Moderate integrity. May need guidance in complex ethical situations.";
  if (percentage >= 50) return "Adequate integrity. Follows rules when clear.";
  if (percentage >= 40) return "Limited integrity. Requires boundaries and supervision.";
  return "Poor integrity. Significant risk area.";
};

const getCulturalWorkEthicInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional work ethic. Consistently goes above and beyond.";
  if (percentage >= 70) return "Good work ethic. Reliable and dedicated to quality work.";
  if (percentage >= 60) return "Moderate work ethic. May need encouragement for extra effort.";
  if (percentage >= 50) return "Adequate work ethic. Meets basic expectations.";
  if (percentage >= 40) return "Limited work ethic. May do minimum required.";
  return "Poor work ethic. Lacks dedication and effort.";
};

const getCulturalConductInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional professional conduct. Models appropriate behavior consistently.";
  if (percentage >= 70) return "Good professional conduct. Generally displays appropriate behavior.";
  if (percentage >= 60) return "Moderate professional conduct. May need guidance on conduct.";
  if (percentage >= 50) return "Adequate professional conduct. Meets basic standards.";
  if (percentage >= 40) return "Limited professional conduct. May have lapses.";
  return "Poor professional conduct. Significant concerns.";
};

const getCulturalDiversityInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional diversity awareness. Champions inclusion and respects all perspectives.";
  if (percentage >= 70) return "Good diversity awareness. Values different perspectives and backgrounds.";
  if (percentage >= 60) return "Moderate awareness. Needs development in diversity understanding.";
  if (percentage >= 50) return "Adequate diversity awareness. Generally respectful of differences.";
  if (percentage >= 40) return "Limited diversity awareness. May need training.";
  return "Poor diversity awareness. Significant concerns.";
};

const getCulturalInclusivityInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional inclusivity. Actively ensures all voices are heard and creates belonging.";
  if (percentage >= 70) return "Good inclusivity. Generally inclusive of others.";
  if (percentage >= 60) return "Moderate inclusivity. May need awareness of exclusionary behaviors.";
  if (percentage >= 50) return "Adequate inclusivity. Includes others when prompted.";
  if (percentage >= 40) return "Limited inclusivity. May unintentionally exclude others.";
  return "Poor inclusivity. May actively exclude or marginalize others.";
};

const getCulturalRespectInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional respect. Treats everyone with dignity, regardless of role or background.";
  if (percentage >= 70) return "Good respect. Generally respectful to others.";
  if (percentage >= 60) return "Moderate respect. May need reminders about respectful behavior.";
  if (percentage >= 50) return "Adequate respect. Respectful to most people.";
  if (percentage >= 40) return "Limited respect. May be dismissive of others.";
  return "Poor respect. Disrespectful behavior is a concern.";
};

const getCulturalCollaborationInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional collaborator. Builds strong relationships and enhances team dynamics.";
  if (percentage >= 70) return "Good collaboration skills. Works well with others.";
  if (percentage >= 60) return "Moderate collaboration. May need development in teamwork.";
  if (percentage >= 50) return "Adequate collaboration. Works with others when needed.";
  if (percentage >= 40) return "Limited collaboration. May work in silos.";
  return "Poor collaboration. Struggles in team settings.";
};

const getCulturalFitInterpretation = (percentage) => {
  if (percentage >= 80) return "Exceptional cultural fit. Naturally aligns with and enhances company culture.";
  if (percentage >= 70) return "Good cultural fit. Generally aligned with organizational culture.";
  if (percentage >= 60) return "Moderate cultural fit. Some areas may need attention.";
  if (percentage >= 50) return "Adequate cultural fit. Fits with most team norms.";
  if (percentage >= 40) return "Limited cultural fit. May not fully integrate.";
  return "Poor cultural fit. Significant misalignment.";
};

const getCulturalAdaptabilityInterpretation = (percentage) => {
  if (percentage >= 80) return "Highly adaptable. Thrives in changing cultural environments.";
  if (percentage >= 70) return "Good adaptability. Adjusts well to most cultural changes.";
  if (percentage >= 60) return "Moderate adaptability. May need support during cultural shifts.";
  if (percentage >= 50) return "Adequate adaptability. Can adjust with guidance.";
  if (percentage >= 40) return "Limited adaptability. Struggles with cultural change.";
  return "Poor adaptability. Significant resistance to cultural shifts.";
};

const getCulturalAlignmentSummary = (categories) => {
  const values = categories.find(c => c.name.includes('Values'))?.percentage || 0;
  const integrity = categories.find(c => c.name.includes('Integrity'))?.percentage || 0;
  const workEthic = categories.find(c => c.name.includes('Work Ethic'))?.percentage || 0;
  const avg = (values + integrity + workEthic) / 3;
  
  if (avg >= 70) return "Strong alignment with organizational values and culture";
  if (avg >= 50) return "Moderate alignment with room for deeper integration";
  return "Limited alignment requiring attention and development";
};

const getCulturalDerailerDescription = (categoryName, percentage) => {
  if (percentage < 40) {
    if (categoryName.includes('Values')) return "Values misalignment will lead to cultural friction and disengagement.";
    if (categoryName.includes('Integrity')) return "Integrity concerns create significant organizational risk.";
    if (categoryName.includes('Work Ethic')) return "Poor work ethic will impact team morale and productivity.";
    if (categoryName.includes('Diversity')) return "Lack of diversity awareness may lead to exclusionary behaviors.";
    if (categoryName.includes('Inclusivity')) return "Poor inclusivity will create a non-welcoming environment.";
    if (categoryName.includes('Respect')) return "Disrespectful behavior will damage relationships and trust.";
    if (categoryName.includes('Collaboration')) return "Poor collaboration will hinder team effectiveness.";
    if (categoryName.includes('Culture')) return "Cultural misalignment will lead to disengagement and turnover.";
    if (categoryName.includes('Conduct')) return "Unprofessional conduct will damage reputation and credibility.";
  }
  return "This area requires development for cultural alignment.";
};

const getCulturalDevelopmentRecommendation = (categoryName, percentage) => {
  const gap = Math.round((80 - percentage) / 10) * 10;
  
  if (categoryName.includes('Values')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Study company values and discuss with supervisor. Identify personal connection to each value. Demonstrate values in daily work.`;
  }
  if (categoryName.includes('Integrity')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Participate in ethics workshops and case study discussions. Review company values and discuss practical applications with supervisor.`;
  }
  if (categoryName.includes('Work Ethic')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Set personal standards for effort and quality. Complete tasks thoroughly. Be reliable and dependable. Go beyond minimum requirements.`;
  }
  if (categoryName.includes('Diversity')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete diversity and inclusion training. Learn about different cultures and perspectives. Seek diverse perspectives. Challenge own assumptions and biases.`;
  }
  if (categoryName.includes('Inclusivity')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Ensure everyone has opportunity to contribute. Invite input from quiet members. Create space for diverse voices. Address exclusionary behavior.`;
  }
  if (categoryName.includes('Respect')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Treat everyone with courtesy regardless of role. Avoid gossip and negative talk. Show appreciation for others' contributions. Respect boundaries and differences.`;
  }
  if (categoryName.includes('Collaboration')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Practice supporting team members. Ask how you can help others. Acknowledge team achievements. Contribute ideas in team settings.`;
  }
  if (categoryName.includes('Culture')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Participate in company culture workshops. Schedule regular feedback sessions on cultural alignment. Pair with a culture champion for mentoring.`;
  }
  if (categoryName.includes('Conduct')) {
    return `Current: ${percentage}%. Target: 80% (${gap}% gap). Review professional conduct guidelines. Observe professional behavior models. Get feedback on professional presence. Maintain composure in all situations.`;
  }
  return `Current: ${percentage}%. Target: 80% (${gap}% gap). Complete targeted cultural development in this area.`;
};

const getCulturalStrengthDescription = (categoryName, percentage) => {
  if (categoryName.includes('Values')) return `Exceptional values alignment (${percentage}%). Naturally embodies and promotes company values.`;
  if (categoryName.includes('Integrity')) return `Exceptional integrity (${percentage}%). Trustworthy and principled with unwavering ethics.`;
  if (categoryName.includes('Work Ethic')) return `Exceptional work ethic (${percentage}%). Consistently goes above and beyond.`;
  if (categoryName.includes('Diversity')) return `Exceptional diversity awareness (${percentage}%). Champions inclusion and respects all perspectives.`;
  if (categoryName.includes('Inclusivity')) return `Exceptional inclusivity (${percentage}%). Actively ensures all voices are heard.`;
  if (categoryName.includes('Respect')) return `Exceptional respect (${percentage}%). Treats everyone with dignity.`;
  if (categoryName.includes('Collaboration')) return `Exceptional collaborator (${percentage}%). Builds strong relationships and enhances team dynamics.`;
  if (categoryName.includes('Culture')) return `Exceptional cultural fit (${percentage}%). Naturally aligns with and enhances company culture.`;
  if (categoryName.includes('Conduct')) return `Exceptional professional conduct (${percentage}%). Models appropriate behavior consistently.`;
  return `Strong cultural competency in ${categoryName} (${percentage}%).`;
};

const getCulturalOverallSummary = (avgScore, strengthsCount) => {
  if (avgScore >= 70) return `strong with ${strengthsCount} key cultural strengths`;
  if (avgScore >= 50) return `developing with ${strengthsCount} identified cultural strengths`;
  return `limited with significant cultural development needs`;
};

const getCulturalOverallPattern = (avgScore, strengthsCount, weaknessesCount, categories) => {
  if (avgScore >= 70) return `Overall cultural alignment is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avgScore >= 50) return `Overall cultural alignment is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall cultural alignment indicates significant concerns with ${weaknessesCount} areas requiring immediate attention.`;
};
