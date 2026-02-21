// utils/psychometricAnalyzer.js

export const generatePsychometricAnalysis = (categoryScores, assessmentType, candidateName, responseInsights) => {
  
  // Calculate overall statistics
  const scores = Object.values(categoryScores).map(c => c.percentage);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highScores = scores.filter(s => s >= 70).length;
  const lowScores = scores.filter(s => s < 50).length;
  const moderateScores = scores.filter(s => s >= 50 && s < 70).length;

  // Identify patterns
  const strengths = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage >= 70)
    .map(([category]) => category);
  
  const weaknesses = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage < 50)
    .map(([category]) => category);
  
  const developing = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage >= 50 && data.percentage < 70)
    .map(([category]) => category);

  // Generate assessment-type specific analysis
  switch(assessmentType) {
    case 'general':
      return generateGeneralAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'leadership':
      return generateLeadershipAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'cognitive':
      return generateCognitiveAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'technical':
      return generateTechnicalAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'personality':
      return generatePersonalityAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'performance':
      return generatePerformanceAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'behavioral':
      return generateBehavioralAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    case 'cultural':
      return generateCulturalAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
    default:
      return generateGeneralAnalysis(categoryScores, candidateName, strengths, weaknesses, developing, avgScore);
  }
};

const generateGeneralAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: generateOverallPattern(avg, strengths.length, weaknesses.length),
    cognitiveStyle: generateCognitiveStyle(scores, name),
    behavioralTendencies: generateBehavioralTendencies(scores, strengths, weaknesses),
    interpersonalDynamics: generateInterpersonalDynamics(scores),
    workStyle: generateWorkStyle(scores),
    derailers: generateDerailers(weaknesses),
    developmentalFocus: generateDevelopmentalFocus(developing, weaknesses),
    strengthsToLeverage: generateStrengthsToLeverage(strengths),
    riskFactors: generateRiskFactors(weaknesses),
    summary: generateSummary(name, avg, strengths, weaknesses)
  };
};

const generateLeadershipAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s leadership approach and potential. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: `Strategic thinking is ${scores['Vision & Strategic Thinking']?.percentage >= 70 ? 'a significant strength' : scores['Vision & Strategic Thinking']?.percentage >= 50 ? 'developing' : 'an area needing attention'}. Decision-making patterns indicate ${scores['Decision-Making & Problem-Solving']?.percentage >= 70 ? 'decisive and analytical thinking' : 'some hesitation in complex situations'}.`,
    behavioralTendencies: generateLeadershipBehavior(scores),
    interpersonalDynamics: generateLeadershipInterpersonal(scores),
    workStyle: generateLeadershipWorkStyle(scores),
    derailers: generateLeadershipDerailers(weaknesses),
    developmentalFocus: generateLeadershipDevelopment(developing, weaknesses),
    strengthsToLeverage: generateLeadershipStrengths(strengths),
    riskFactors: generateLeadershipRisks(weaknesses),
    summary: `${name} demonstrates ${avg >= 70 ? 'strong' : avg >= 50 ? 'emerging' : 'limited'} leadership potential. ${strengths.length} key leadership strengths identified with ${weaknesses.length} areas requiring development.`
  };
};

const generateCognitiveAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s cognitive processing style and analytical capabilities. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: generateDetailedCognitiveStyle(scores),
    behavioralTendencies: `Problem-solving approach is ${scores['Problem-Solving']?.percentage >= 70 ? 'systematic and effective' : 'developing and would benefit from structured frameworks'}.`,
    interpersonalDynamics: `Cognitive style affects communication through ${scores['Verbal Reasoning']?.percentage >= 70 ? 'clear and articulate expression' : 'some challenges in articulating complex ideas'}.`,
    workStyle: `Learns best through ${scores['Learning Agility']?.percentage >= 70 ? 'rapid, hands-on experience' : 'structured, step-by-step instruction'}.`,
    derailers: generateCognitiveDerailers(weaknesses),
    developmentalFocus: generateCognitiveDevelopment(developing, weaknesses),
    strengthsToLeverage: generateCognitiveStrengths(strengths),
    riskFactors: generateCognitiveRisks(weaknesses),
    summary: `${name} demonstrates ${avg >= 70 ? 'strong' : avg >= 50 ? 'moderate' : 'limited'} cognitive abilities. ${strengths.length} cognitive strengths identified with ${weaknesses.length} areas requiring development.`
  };
};

const generateTechnicalAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s technical competence and practical application skills. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: `Technical problem-solving approach is ${scores['Troubleshooting']?.percentage >= 70 ? 'systematic and effective' : 'developing and would benefit from structured methodologies'}.`,
    behavioralTendencies: `Approach to technical challenges is ${scores['Practical Application']?.percentage >= 70 ? 'hands-on and confident' : 'cautious and methodical'}.`,
    interpersonalDynamics: `Collaborates on technical projects by ${scores['Teamwork']?.percentage >= 70 ? 'actively contributing and sharing knowledge' : 'working best independently with clear direction'}.`,
    workStyle: `Prefers ${scores['Process Optimization']?.percentage >= 70 ? 'optimizing and improving existing processes' : 'following established procedures with clear guidelines'}.`,
    derailers: generateTechnicalDerailers(weaknesses),
    developmentalFocus: generateTechnicalDevelopment(developing, weaknesses),
    strengthsToLeverage: generateTechnicalStrengths(strengths),
    riskFactors: generateTechnicalRisks(weaknesses),
    summary: `${name} demonstrates ${avg >= 70 ? 'strong' : avg >= 50 ? 'developing' : 'foundational'} technical competence. ${strengths.length} technical strengths identified with ${weaknesses.length} areas requiring development.`
  };
};

const generatePersonalityAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s personality structure and behavioral predispositions. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: `Information processing style is ${scores['Cognitive Patterns']?.percentage >= 70 ? 'analytical and systematic' : 'intuitive and big-picture oriented'}.`,
    behavioralTendencies: generatePersonalityBehavior(scores),
    interpersonalDynamics: generatePersonalityInterpersonal(scores),
    workStyle: generatePersonalityWorkStyle(scores),
    derailers: generatePersonalityDerailers(weaknesses),
    developmentalFocus: generatePersonalityDevelopment(developing, weaknesses),
    strengthsToLeverage: generatePersonalityStrengths(strengths),
    riskFactors: generatePersonalityRisks(weaknesses),
    summary: `${name} demonstrates a ${avg >= 70 ? 'well-integrated' : avg >= 50 ? 'moderately balanced' : 'developing'} personality profile. ${strengths.length} personality strengths identified with ${weaknesses.length} areas for growth.`
  };
};

const generatePerformanceAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s performance patterns and work effectiveness. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: `Approaches tasks with ${scores['Productivity & Efficiency']?.percentage >= 70 ? 'high efficiency and focus' : 'variable pace requiring structure'}.`,
    behavioralTendencies: `Work habits show ${scores['Accountability']?.percentage >= 70 ? 'strong ownership and reliability' : 'inconsistent follow-through needing support'}.`,
    interpersonalDynamics: `Collaborates by ${scores['Collaboration']?.percentage >= 70 ? 'actively contributing to team success' : 'working best with clear individual assignments'}.`,
    workStyle: `Prefers ${scores['Work Quality & Effectiveness']?.percentage >= 70 ? 'delivering high-quality outputs with attention to detail' : 'completing tasks efficiently but may miss details'}.`,
    derailers: generatePerformanceDerailers(weaknesses),
    developmentalFocus: generatePerformanceDevelopment(developing, weaknesses),
    strengthsToLeverage: generatePerformanceStrengths(strengths),
    riskFactors: generatePerformanceRisks(weaknesses),
    summary: `${name} demonstrates ${avg >= 70 ? 'strong' : avg >= 50 ? 'developing' : 'needs improvement in'} performance patterns. ${strengths.length} performance strengths identified with ${weaknesses.length} areas requiring development.`
  };
};

const generateBehavioralAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s behavioral patterns and interpersonal style. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: `Processes social information by ${scores['Active Listening']?.percentage >= 70 ? 'attentively absorbing and responding' : 'sometimes missing subtle cues'}.`,
    behavioralTendencies: generateBehavioralTendenciesDetail(scores),
    interpersonalDynamics: generateInterpersonalDetail(scores),
    workStyle: `Preferred team role is ${scores['Teamwork']?.percentage >= 70 ? 'collaborative and supportive' : 'independent with clear boundaries'}.`,
    derailers: generateBehavioralDerailers(weaknesses),
    developmentalFocus: generateBehavioralDevelopment(developing, weaknesses),
    strengthsToLeverage: generateBehavioralStrengths(strengths),
    riskFactors: generateBehavioralRisks(weaknesses),
    summary: `${name} demonstrates ${avg >= 70 ? 'strong' : avg >= 50 ? 'developing' : 'needs improvement in'} behavioral competencies. ${strengths.length} behavioral strengths identified with ${weaknesses.length} areas requiring development.`
  };
};

const generateCulturalAnalysis = (scores, name, strengths, weaknesses, developing, avg) => {
  return {
    overallPattern: `This profile reflects ${name}'s alignment with organizational culture and values. ${generateOverallPattern(avg, strengths.length, weaknesses.length)}`,
    cognitiveStyle: `Approaches cultural situations with ${scores['Diversity Awareness']?.percentage >= 70 ? 'high awareness and sensitivity' : 'basic understanding needing development'}.`,
    behavioralTendencies: `Demonstrates ${scores['Values Alignment']?.percentage >= 70 ? 'strong' : 'developing'} alignment with core values.`,
    interpersonalDynamics: `Interacts with diverse colleagues by ${scores['Inclusivity']?.percentage >= 70 ? 'actively including and respecting all perspectives' : 'sometimes overlooking different viewpoints'}.`,
    workStyle: `Contributes to team culture by ${scores['Work Ethic']?.percentage >= 70 ? 'modeling desired behaviors' : 'following established norms'}.`,
    derailers: generateCulturalDerailers(weaknesses),
    developmentalFocus: generateCulturalDevelopment(developing, weaknesses),
    strengthsToLeverage: generateCulturalStrengths(strengths),
    riskFactors: generateCulturalRisks(weaknesses),
    summary: `${name} demonstrates ${avg >= 70 ? 'strong' : avg >= 50 ? 'moderate' : 'limited'} cultural alignment. ${strengths.length} cultural strengths identified with ${weaknesses.length} areas requiring development.`
  };
};

// Helper functions for general analysis
const generateOverallPattern = (avg, strengthsCount, weaknessesCount) => {
  if (avg >= 70) return `Overall performance is strong with ${strengthsCount} areas of notable strength and ${weaknessesCount} areas for development.`;
  if (avg >= 50) return `Overall performance is developing with ${strengthsCount} areas of strength and ${weaknessesCount} areas needing attention.`;
  return `Overall performance indicates significant development needs with ${weaknessesCount} areas requiring immediate attention.`;
};

const generateCognitiveStyle = (scores, name) => {
  const cognitiveScore = scores['Cognitive Ability']?.percentage || 50;
  if (cognitiveScore >= 70) return `${name} demonstrates strong analytical thinking and processes information effectively. Learns quickly and adapts to new situations with ease.`;
  if (cognitiveScore >= 50) return `${name} shows adequate cognitive abilities. Can handle routine analytical tasks but may need support with complex problem-solving.`;
  return `${name} struggles with analytical tasks and would benefit from structured guidance and simplified approaches.`;
};

const generateBehavioralTendencies = (scores, strengths, weaknesses) => {
  const personalityScore = scores['Personality & Behavioral']?.percentage || 50;
  if (personalityScore >= 70) return `Demonstrates stable, resilient, and adaptable behavioral patterns. Handles pressure well and maintains consistency.`;
  if (personalityScore >= 50) return `Shows generally stable behavior with occasional inconsistencies under pressure. Would benefit from stress management techniques.`;
  return `Behavioral patterns may be inconsistent. May struggle with adaptability and maintaining composure in challenging situations.`;
};

const generateInterpersonalDynamics = (scores) => {
  const eiScore = scores['Emotional Intelligence']?.percentage || 50;
  if (eiScore >= 70) return `Strong interpersonal skills. Builds rapport easily, navigates social situations skillfully, and leaves positive impressions.`;
  if (eiScore >= 50) return `Adequate interpersonal skills. Relates well to others in most situations but may struggle with complex dynamics.`;
  return `Interpersonal skills need development. May struggle with social situations and reading others' cues.`;
};

const generateWorkStyle = (scores) => {
  const workPace = scores['Work Pace']?.percentage || 50;
  if (workPace >= 70) return `Works at a fast pace without sacrificing quality. Thrives in deadline-driven environments.`;
  if (workPace >= 50) return `Maintains steady output and generally meets deadlines. May need support during peak periods.`;
  return `Struggles to maintain consistent work pace and may miss deadlines without close supervision.`;
};

const generateDerailers = (weaknesses) => {
  if (weaknesses.length === 0) return `No significant derailers identified. Profile shows consistent performance across areas.`;
  if (weaknesses.length <= 3) return `Potential derailers include ${weaknesses.join(', ')}. These areas may impact performance if not addressed.`;
  return `Multiple derailers identified: ${weaknesses.join(', ')}. These represent significant risk factors requiring immediate attention.`;
};

const generateDevelopmentalFocus = (developing, weaknesses) => {
  const focus = [...developing, ...weaknesses].slice(0, 3);
  if (focus.length === 0) return `Continue to leverage existing strengths and seek opportunities for growth.`;
  return `Priority development areas: ${focus.join(', ')}. Focused training and support in these areas will yield the greatest improvement.`;
};

const generateStrengthsToLeverage = (strengths) => {
  if (strengths.length === 0) return `No dominant strengths identified. Focus on building foundational competencies.`;
  if (strengths.length <= 2) return `Key strengths: ${strengths.join(', ')}. Leverage these in appropriate roles and responsibilities.`;
  return `Multiple strengths identified: ${strengths.join(', ')}. These can be leveraged for greater responsibility and mentoring others.`;
};

const generateRiskFactors = (weaknesses) => {
  if (weaknesses.length === 0) return `No significant risk factors identified.`;
  if (weaknesses.length <= 2) return `Risk factors: ${weaknesses.join(', ')}. These may impact performance in specific situations.`;
  return `Significant risk factors: ${weaknesses.join(', ')}. These represent critical areas needing immediate intervention.`;
};

const generateSummary = (name, avg, strengths, weaknesses) => {
  return `${name} presents a ${avg >= 70 ? 'strong' : avg >= 50 ? 'developing' : 'challenged'} profile with ${strengths.length} identified strengths and ${weaknesses.length} areas for development. ${avg >= 70 ? 'Well-suited for roles requiring these competencies.' : avg >= 50 ? 'With targeted development, can grow into more responsible roles.' : 'Requires structured support and clear guidance in a well-defined role.'}`;
};

// Leadership-specific helpers
const generateLeadershipBehavior = (scores) => {
  const peopleScore = scores['People Management & Coaching']?.percentage || 50;
  if (peopleScore >= 70) return `Strong people management capabilities. Develops others effectively and builds high-performing teams.`;
  if (peopleScore >= 50) return `Emerging people management skills. Can support team members with guidance.`;
  return `People management skills need development. May struggle with coaching and developing others.`;
};

const generateLeadershipInterpersonal = (scores) => {
  const influenceScore = scores['Communication & Influence']?.percentage || 50;
  if (influenceScore >= 70) return `Highly influential communicator. Persuades effectively and gains buy-in at all levels.`;
  if (influenceScore >= 50) return `Communicates adequately but may struggle with persuasion in complex situations.`;
  return `Limited influence skills. Communication lacks persuasiveness and impact.`;
};

const generateLeadershipWorkStyle = (scores) => {
  const executionScore = scores['Execution & Results Orientation']?.percentage || 50;
  if (executionScore >= 70) return `Execution-focused leader who drives results with disciplined follow-through.`;
  if (executionScore >= 50) return `Generally delivers results but may need support with follow-through.`;
  return `Inconsistent execution. May struggle to deliver results reliably.`;
};

const generateLeadershipDerailers = (weaknesses) => {
  if (weaknesses.includes('People Management & Coaching')) {
    return `People management is a significant derailer. This may lead to team disengagement and turnover.`;
  }
  return generateDerailers(weaknesses);
};

const generateLeadershipDevelopment = (developing, weaknesses) => {
  const focus = [...developing, ...weaknesses].slice(0, 3);
  return `Leadership development should focus on: ${focus.join(', ')}. Targeted coaching and stretch assignments in these areas will accelerate growth.`;
};

const generateLeadershipStrengths = (strengths) => {
  if (strengths.includes('Vision & Strategic Thinking')) {
    return `Strategic thinking is a key strength. Leverage this in planning and setting direction.`;
  }
  return generateStrengthsToLeverage(strengths);
};

const generateLeadershipRisks = (weaknesses) => {
  if (weaknesses.includes('People Management & Coaching') && weaknesses.includes('Communication & Influence')) {
    return `Combined weaknesses in people management and communication represent significant risk for leadership roles.`;
  }
  return generateRiskFactors(weaknesses);
};

// Cognitive-specific helpers
const generateDetailedCognitiveStyle = (scores) => {
  const logicalScore = scores['Logical / Abstract Reasoning']?.percentage || 50;
  const numericalScore = scores['Numerical Reasoning']?.percentage || 50;
  const verbalScore = scores['Verbal Reasoning']?.percentage || 50;
  
  if (logicalScore >= 70 && numericalScore >= 70 && verbalScore >= 70) {
    return `Exceptional cognitive abilities across all domains. Demonstrates strong analytical, quantitative, and verbal reasoning.`;
  }
  if (logicalScore >= 70) {
    return `Strong logical reasoning skills. Excels at pattern recognition and abstract thinking.`;
  }
  if (numericalScore >= 70) {
    return `Strong numerical reasoning. Comfortable with data and quantitative analysis.`;
  }
  if (verbalScore >= 70) {
    return `Strong verbal reasoning. Excellent comprehension and language processing.`;
  }
  return `Moderate cognitive abilities. Handles structured tasks well but may struggle with complex analysis.`;
};

const generateCognitiveDerailers = (weaknesses) => {
  if (weaknesses.includes('Logical / Abstract Reasoning')) {
    return `Difficulty with abstract reasoning may limit ability to handle complex, ambiguous situations.`;
  }
  return generateDerailers(weaknesses);
};

const generateCognitiveDevelopment = (developing, weaknesses) => {
  return `Cognitive development should focus on: ${[...developing, ...weaknesses].slice(0, 3).join(', ')}. Practice with puzzles, case studies, and analytical exercises.`;
};

const generateCognitiveStrengths = (strengths) => {
  return `Cognitive strengths: ${strengths.join(', ')}. Leverage these in analytical and problem-solving roles.`;
};

const generateCognitiveRisks = (weaknesses) => {
  if (weaknesses.includes('Logical / Abstract Reasoning') && weaknesses.includes('Numerical Reasoning')) {
    return `Weaknesses in both logical and numerical reasoning represent significant risk for roles requiring analytical thinking.`;
  }
  return generateRiskFactors(weaknesses);
};

// Add more specific helper functions for other assessment types as needed...
