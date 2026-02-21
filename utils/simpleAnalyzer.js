// utils/simpleAnalyzer.js

export const generateSimpleAnalysis = (categoryScores, assessmentType, candidateName) => {
  
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

  // Route to assessment-specific analyzer
  switch(assessmentType) {
    case 'cognitive':
      return generateCognitiveAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'general':
      return generateGeneralAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'leadership':
      return generateLeadershipAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'technical':
      return generateTechnicalAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'personality':
      return generatePersonalityAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'performance':
      return generatePerformanceAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'behavioral':
      return generateBehavioralAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    case 'cultural':
      return generateCulturalAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
    default:
      return generateGeneralAnalysis(candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible);
  }
};

// ============================================
// COGNITIVE ASSESSMENT ANALYZER
// ============================================
const generateCognitiveAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const memoryAttention = categories.find(c => c.name.includes('Memory') || c.name.includes('Attention')) || { percentage: 0 };
  const verbalReasoning = categories.find(c => c.name.includes('Verbal')) || { percentage: 0 };
  const logicalReasoning = categories.find(c => c.name.includes('Logical') || c.name.includes('Abstract')) || { percentage: 0 };
  const numericalReasoning = categories.find(c => c.name.includes('Numerical')) || { percentage: 0 };
  const spatialReasoning = categories.find(c => c.name.includes('Spatial')) || { percentage: 0 };
  const mechanicalReasoning = categories.find(c => c.name.includes('Mechanical')) || { percentage: 0 };
  const perceptualSpeed = categories.find(c => c.name.includes('Perceptual')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateCognitiveExecutiveSummary(candidateName, avgScore, risks, memoryAttention, verbalReasoning, logicalReasoning),
    strengths: generateStrengthsSection(strengths, 'cognitive'),
    moderate: generateModerateSection(moderate, 'cognitive'),
    risks: generateCognitiveRisksSection(risks, categories),
    personalityStructure: generateCognitiveProfile(categories, memoryAttention, verbalReasoning, logicalReasoning),
    roleSuitability: generateCognitiveRoleSuitability(avgScore, memoryAttention, verbalReasoning, logicalReasoning, numericalReasoning),
    developmentPriorities: generateCognitiveDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateCognitiveOverallInterpretation(candidateName, avgScore, risks, memoryAttention, verbalReasoning, logicalReasoning)
  };
};

// ============================================
// GENERAL ASSESSMENT ANALYZER
// ============================================
const generateGeneralAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const cognitive = categories.find(c => c.name.includes('Cognitive')) || { percentage: 0 };
  const communication = categories.find(c => c.name.includes('Communication')) || { percentage: 0 };
  const emotional = categories.find(c => c.name.includes('Emotional')) || { percentage: 0 };
  const leadership = categories.find(c => c.name.includes('Leadership')) || { percentage: 0 };
  const problemSolving = categories.find(c => c.name.includes('Problem')) || { percentage: 0 };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0 };
  const performance = categories.find(c => c.name.includes('Performance')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateGeneralExecutiveSummary(candidateName, avgScore, strengths, risks, cognitive, emotional, leadership),
    strengths: generateStrengthsSection(strengths, 'general'),
    moderate: generateModerateSection(moderate, 'general'),
    risks: generateGeneralRisksSection(risks),
    personalityStructure: generateGeneralProfile(categories, cognitive, emotional, leadership, integrity),
    roleSuitability: generateGeneralRoleSuitability(avgScore, strengths, risks, leadership, cognitive),
    developmentPriorities: generateGeneralDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateGeneralOverallInterpretation(candidateName, avgScore, strengths, risks, leadership, cognitive)
  };
};

// ============================================
// LEADERSHIP ASSESSMENT ANALYZER
// ============================================
const generateLeadershipAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const vision = categories.find(c => c.name.includes('Vision') || c.name.includes('Strategic')) || { percentage: 0 };
  const decision = categories.find(c => c.name.includes('Decision')) || { percentage: 0 };
  const people = categories.find(c => c.name.includes('People') || c.name.includes('Management')) || { percentage: 0 };
  const influence = categories.find(c => c.name.includes('Influence') || c.name.includes('Communication')) || { percentage: 0 };
  const change = categories.find(c => c.name.includes('Change')) || { percentage: 0 };
  const execution = categories.find(c => c.name.includes('Execution') || c.name.includes('Results')) || { percentage: 0 };
  const emotional = categories.find(c => c.name.includes('Emotional')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateLeadershipExecutiveSummary(candidateName, avgScore, strengths, risks, vision, people, decision),
    strengths: generateStrengthsSection(strengths, 'leadership'),
    moderate: generateModerateSection(moderate, 'leadership'),
    risks: generateLeadershipRisksSection(risks),
    personalityStructure: generateLeadershipProfile(categories, vision, decision, people, emotional),
    roleSuitability: generateLeadershipRoleSuitability(avgScore, strengths, risks, vision, people, execution),
    developmentPriorities: generateLeadershipDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateLeadershipOverallInterpretation(candidateName, avgScore, strengths, risks, vision, people)
  };
};

// ============================================
// TECHNICAL ASSESSMENT ANALYZER
// ============================================
const generateTechnicalAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const knowledge = categories.find(c => c.name.includes('Technical') || c.name.includes('Knowledge')) || { percentage: 0 };
  const system = categories.find(c => c.name.includes('System')) || { percentage: 0 };
  const troubleshooting = categories.find(c => c.name.includes('Troubleshooting')) || { percentage: 0 };
  const safety = categories.find(c => c.name.includes('Safety')) || { percentage: 0 };
  const quality = categories.find(c => c.name.includes('Quality')) || { percentage: 0 };
  const equipment = categories.find(c => c.name.includes('Equipment')) || { percentage: 0 };
  const maintenance = categories.find(c => c.name.includes('Maintenance')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateTechnicalExecutiveSummary(candidateName, avgScore, strengths, risks, knowledge, troubleshooting, safety),
    strengths: generateStrengthsSection(strengths, 'technical'),
    moderate: generateModerateSection(moderate, 'technical'),
    risks: generateTechnicalRisksSection(risks),
    personalityStructure: generateTechnicalProfile(categories, knowledge, system, troubleshooting, safety),
    roleSuitability: generateTechnicalRoleSuitability(avgScore, strengths, risks, knowledge, troubleshooting, safety),
    developmentPriorities: generateTechnicalDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateTechnicalOverallInterpretation(candidateName, avgScore, strengths, risks, knowledge, troubleshooting)
  };
};

// ============================================
// PERSONALITY ASSESSMENT ANALYZER
// ============================================
const generatePersonalityAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const openness = categories.find(c => c.name.includes('Openness')) || { percentage: 0 };
  const conscientiousness = categories.find(c => c.name.includes('Conscientiousness')) || { percentage: 0 };
  const extraversion = categories.find(c => c.name.includes('Extraversion')) || { percentage: 0 };
  const agreeableness = categories.find(c => c.name.includes('Agreeableness')) || { percentage: 0 };
  const neuroticism = categories.find(c => c.name.includes('Neuroticism')) || { percentage: 0 };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0 };
  const emotional = categories.find(c => c.name.includes('Emotional')) || { percentage: 0 };
  const stress = categories.find(c => c.name.includes('Stress')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generatePersonalityExecutiveSummary(candidateName, avgScore, strengths, risks, openness, conscientiousness, emotional, stress),
    strengths: generateStrengthsSection(strengths, 'personality'),
    moderate: generateModerateSection(moderate, 'personality'),
    risks: generatePersonalityRisksSection(risks),
    personalityStructure: generatePersonalityProfile(categories, openness, conscientiousness, extraversion, agreeableness, neuroticism),
    roleSuitability: generatePersonalityRoleSuitability(avgScore, strengths, risks, openness, conscientiousness, extraversion, emotional),
    developmentPriorities: generatePersonalityDevelopmentPriorities(risks, moderate),
    overallInterpretation: generatePersonalityOverallInterpretation(candidateName, avgScore, strengths, risks, openness, conscientiousness, emotional, stress)
  };
};

// ============================================
// PERFORMANCE ASSESSMENT ANALYZER
// ============================================
const generatePerformanceAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const productivity = categories.find(c => c.name.includes('Productivity')) || { percentage: 0 };
  const quality = categories.find(c => c.name.includes('Quality')) || { percentage: 0 };
  const accountability = categories.find(c => c.name.includes('Accountability')) || { percentage: 0 };
  const initiative = categories.find(c => c.name.includes('Initiative')) || { percentage: 0 };
  const collaboration = categories.find(c => c.name.includes('Collaboration')) || { percentage: 0 };
  const time = categories.find(c => c.name.includes('Time')) || { percentage: 0 };
  const goal = categories.find(c => c.name.includes('Goal')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generatePerformanceExecutiveSummary(candidateName, avgScore, strengths, risks, productivity, quality, accountability),
    strengths: generateStrengthsSection(strengths, 'performance'),
    moderate: generateModerateSection(moderate, 'performance'),
    risks: generatePerformanceRisksSection(risks),
    personalityStructure: generatePerformanceProfile(categories, productivity, quality, accountability, initiative),
    roleSuitability: generatePerformanceRoleSuitability(avgScore, strengths, risks, productivity, quality, accountability),
    developmentPriorities: generatePerformanceDevelopmentPriorities(risks, moderate),
    overallInterpretation: generatePerformanceOverallInterpretation(candidateName, avgScore, strengths, risks, productivity, accountability)
  };
};

// ============================================
// BEHAVIORAL ASSESSMENT ANALYZER
// ============================================
const generateBehavioralAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const teamwork = categories.find(c => c.name.includes('Teamwork')) || { percentage: 0 };
  const communication = categories.find(c => c.name.includes('Communication')) || { percentage: 0 };
  const conflict = categories.find(c => c.name.includes('Conflict')) || { percentage: 0 };
  const empathy = categories.find(c => c.name.includes('Empathy')) || { percentage: 0 };
  const adaptability = categories.find(c => c.name.includes('Adaptability')) || { percentage: 0 };
  const professionalism = categories.find(c => c.name.includes('Professionalism')) || { percentage: 0 };
  const interpersonal = categories.find(c => c.name.includes('Interpersonal')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateBehavioralExecutiveSummary(candidateName, avgScore, strengths, risks, teamwork, communication, conflict),
    strengths: generateStrengthsSection(strengths, 'behavioral'),
    moderate: generateModerateSection(moderate, 'behavioral'),
    risks: generateBehavioralRisksSection(risks),
    personalityStructure: generateBehavioralProfile(categories, teamwork, communication, empathy, adaptability),
    roleSuitability: generateBehavioralRoleSuitability(avgScore, strengths, risks, teamwork, communication, conflict),
    developmentPriorities: generateBehavioralDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateBehavioralOverallInterpretation(candidateName, avgScore, strengths, risks, teamwork, communication)
  };
};

// ============================================
// CULTURAL ASSESSMENT ANALYZER
// ============================================
const generateCulturalAnalysis = (candidateName, categories, strengths, moderate, risks, avgScore, overallGrade, classification, totalScore, maxPossible) => {
  
  const values = categories.find(c => c.name.includes('Values')) || { percentage: 0 };
  const diversity = categories.find(c => c.name.includes('Diversity')) || { percentage: 0 };
  const inclusivity = categories.find(c => c.name.includes('Inclusivity')) || { percentage: 0 };
  const respect = categories.find(c => c.name.includes('Respect')) || { percentage: 0 };
  const workEthic = categories.find(c => c.name.includes('Work Ethic')) || { percentage: 0 };
  const integrity = categories.find(c => c.name.includes('Integrity')) || { percentage: 0 };
  const collaboration = categories.find(c => c.name.includes('Collaboration')) || { percentage: 0 };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateCulturalExecutiveSummary(candidateName, avgScore, strengths, risks, values, diversity, inclusivity),
    strengths: generateStrengthsSection(strengths, 'cultural'),
    moderate: generateModerateSection(moderate, 'cultural'),
    risks: generateCulturalRisksSection(risks),
    personalityStructure: generateCulturalProfile(categories, values, diversity, inclusivity, respect),
    roleSuitability: generateCulturalRoleSuitability(avgScore, strengths, risks, values, diversity, collaboration),
    developmentPriorities: generateCulturalDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateCulturalOverallInterpretation(candidateName, avgScore, strengths, risks, values, diversity)
  };
};

// ============================================
// COGNITIVE HELPER FUNCTIONS
// ============================================

const generateCognitiveExecutiveSummary = (candidateName, avgScore, risks, memory, verbal, logical) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong cognitive abilities. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows moderate cognitive abilities with significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates significant cognitive challenges across multiple domains. `;
  }

  const riskAreas = [];
  if (memory.percentage < 50) riskAreas.push('memory and attention');
  if (verbal.percentage < 50) riskAreas.push('verbal reasoning');
  if (logical.percentage < 50) riskAreas.push('logical reasoning');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical weaknesses in ${riskAreas.join(', ')}, which will impact learning and problem-solving.`;
  }

  summary += `\n\nIntensive cognitive remediation is required before this individual can handle complex tasks independently.`;
  
  return summary;
};

const generateCognitiveRisksSection = (risks, categories) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getCognitiveRiskDescription(r.name, r.percentage)}\n\n`;
    
    const implications = getCognitiveRiskImplications(r.name);
    if (implications.length > 0) {
      section += `This may indicate:\n\n`;
      implications.forEach(i => section += `• ${i}\n`);
      section += `\n`;
    }
    
    const gapToMin = Math.max(0, Math.round((50 - r.percentage) / 5) * 5);
    if (r.percentage < 50) {
      section += `Need to improve by at least ${gapToMin}% to reach minimum competency (50%).\n\n`;
    }
    
    const steps = getCognitiveDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateCognitiveProfile = (categories, memory, verbal, logical) => {
  let section = `🧠 **Cognitive Profile Analysis**\n\n`;
  
  const avgCognitive = [memory.percentage, verbal.percentage, logical.percentage]
    .filter(p => p > 0).reduce((a, b) => a + b, 0) / 3 || 0;
  
  if (avgCognitive < 40) {
    section += `This candidate shows severe cognitive limitations. The pattern suggests:\n\n`;
    section += `• Extreme difficulty processing and retaining information\n`;
    section += `• Cannot perform complex reasoning tasks\n`;
    section += `• Requires one-on-one instruction and constant supervision\n`;
    section += `• May need simplified, repetitive tasks only\n\n`;
    section += `This individual requires intensive, specialized intervention.`;
  } else if (avgCognitive < 50) {
    section += `This candidate shows significant cognitive challenges. The pattern suggests:\n\n`;
    section += `• Slow information processing\n`;
    section += `• Difficulty with abstract concepts\n`;
    section += `• Struggles with multi-step problems\n`;
    section += `• Needs step-by-step instructions and frequent repetition\n\n`;
    section += `Will need substantial support and simplified learning materials.`;
  } else if (avgCognitive < 60) {
    section += `This candidate shows uneven cognitive development. The pattern suggests:\n\n`;
    section += `• Can handle routine tasks but struggles with novelty\n`;
    section += `• Benefits from structured learning approaches\n`;
    section += `• Needs extra time for complex tasks\n`;
    section += `• May have specific learning difficulties in certain areas`;
  }
  
  return section;
};

const generateCognitiveRoleSuitability = (avgScore, memory, verbal, logical, numerical) => {
  let section = `🎯 **Role Suitability**\n\n`;
  
  section += `**Suitable For:**\n\n`;
  
  if (avgScore < 40) {
    section += `• Entry-level positions with close supervision\n`;
    section += `• Routine, repetitive tasks with clear procedures\n`;
    section += `• Roles with step-by-step instructions\n`;
    section += `• Sheltered workshops or supported employment\n`;
  } else if (avgScore < 50) {
    section += `• Structured operational roles with clear guidelines\n`;
    section += `• Positions with limited decision-making\n`;
    section += `• Roles emphasizing consistency over complexity\n`;
    section += `• Environments with supportive supervision\n`;
  } else if (avgScore < 60) {
    section += `• Technical support roles with defined processes\n`;
    section += `• Positions with moderate complexity\n`;
    section += `• Roles that leverage existing strengths\n`;
  }
  
  section += `\n**Risky For:**\n\n`;
  
  if (avgScore < 50) {
    section += `• Senior leadership or management positions\n`;
    section += `• Strategic decision-making roles\n`;
    section += `• Positions requiring rapid learning\n`;
    section += `• Roles with high complexity and autonomy\n`;
  }

  return section;
};

const generateCognitiveDevelopmentPriorities = (risks, moderate) => {
  const priorities = [...risks, ...moderate].sort((a, b) => a.percentage - b.percentage).slice(0, 4);
  if (priorities.length === 0) return '';

  let section = `📈 **Development Priorities**\n\n`;
  
  priorities.forEach((item, index) => {
    const number = index + 1;
    const emoji = number === 1 ? '1️⃣' : number === 2 ? '2️⃣' : number === 3 ? '3️⃣' : '4️⃣';
    const title = getCognitivePriorityTitle(item.name);
    const gap = Math.round((70 - item.percentage) / 5) * 5;
    
    section += `${emoji} **${title}**\n\n`;
    section += `**Current:** ${item.percentage}% | **Target:** 70% | **Gap:** ${gap}%\n\n`;
    
    const steps = getCognitiveDevelopmentSteps(item.name);
    if (steps.length > 0) {
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateCognitiveOverallInterpretation = (candidateName, avgScore, risks, memory, verbal, logical) => {
  let section = `📌 **Overall Interpretation**\n\n`;
  
  if (avgScore < 40) {
    section += `${candidateName} presents with severe cognitive limitations. `;
    section += `The profile indicates significant challenges with information processing, learning, and problem-solving. `;
    section += `This individual requires intensive, specialized intervention focusing on foundational cognitive skills. `;
    section += `Even with development, progress will be slow and will require substantial support.`;
  } else if (avgScore < 50) {
    section += `${candidateName} demonstrates below-average cognitive abilities. `;
    section += `The profile suggests difficulty with analytical thinking and complex problem-solving. `;
    section += `With intensive, targeted intervention, some improvement is possible. `;
    section += `However, this individual will likely always require structured environments with close supervision.`;
  } else if (avgScore < 60) {
    section += `${candidateName} shows developing cognitive abilities with significant gaps. `;
    section += `While there is potential for growth, progress will require structured learning approaches and consistent practice.`;
  }
  
  return section;
};

// ============================================
// GENERAL HELPER FUNCTIONS
// ============================================

const generateGeneralExecutiveSummary = (candidateName, avgScore, strengths, risks, cognitive, emotional, leadership) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong overall capabilities with particular strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows moderate capabilities but has significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates significant development needs across multiple areas. `;
  }

  const riskAreas = [];
  if (cognitive.percentage < 50) riskAreas.push('cognitive ability');
  if (emotional.percentage < 50) riskAreas.push('emotional intelligence');
  if (leadership.percentage < 50) riskAreas.push('leadership potential');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical weaknesses in ${riskAreas.join(', ')}, which will impact overall performance.`;
  }

  return summary;
};

const generateGeneralRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getGeneralRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getGeneralDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateGeneralProfile = (categories, cognitive, emotional, leadership, integrity) => {
  let section = `🧠 **Competency Profile Analysis**\n\n`;
  
  if (cognitive.percentage >= 70 && emotional.percentage >= 70 && leadership.percentage >= 70) {
    section += `This candidate shows strong capabilities across all key areas. The profile suggests:\n\n`;
    section += `• Well-rounded individual with balanced strengths\n`;
    section += `• Can handle complex roles requiring multiple competencies\n`;
    section += `• Good potential for growth and advancement\n`;
  } else if (cognitive.percentage < 50 && emotional.percentage < 50) {
    section += `This candidate shows significant challenges in both cognitive and emotional domains. The profile suggests:\n\n`;
    section += `• Difficulty with both analytical and interpersonal tasks\n`;
    section += `• May struggle in most professional environments\n`;
    section += `• Requires highly structured support and clear guidance\n`;
  } else if (integrity.percentage >= 70 && cognitive.percentage < 50) {
    section += `This candidate has strong ethical foundation but limited cognitive abilities. The profile suggests:\n\n`;
    section += `• Trustworthy but may struggle with complex tasks\n`;
    section += `• Best suited for roles requiring integrity over intellect\n`;
    section += `• May need simplified responsibilities despite good intentions\n`;
  }
  
  return section;
};

// ============================================
// LEADERSHIP HELPER FUNCTIONS
// ============================================

const generateLeadershipExecutiveSummary = (candidateName, avgScore, strengths, risks, vision, people, decision) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong leadership potential with particular strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows emerging leadership capabilities with significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates limited leadership potential at this time. `;
  }

  const riskAreas = [];
  if (vision.percentage < 50) riskAreas.push('strategic thinking');
  if (people.percentage < 50) riskAreas.push('people management');
  if (decision.percentage < 50) riskAreas.push('decision-making');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical weaknesses in ${riskAreas.join(', ')}, which will impact leadership effectiveness.`;
  }

  return summary;
};

const generateLeadershipRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getLeadershipRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getLeadershipDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateLeadershipProfile = (categories, vision, decision, people, emotional) => {
  let section = `🧠 **Leadership Profile Analysis**\n\n`;
  
  if (vision.percentage >= 70 && people.percentage >= 70 && emotional.percentage >= 70) {
    section += `This candidate shows strong leadership capabilities across multiple dimensions. The profile suggests:\n\n`;
    section += `• Can articulate vision and inspire others\n`;
    section += `• Builds and develops effective teams\n`;
    section += `• Demonstrates emotional intelligence and self-awareness\n`;
    section += `• Ready for senior leadership roles with appropriate support\n`;
  } else if (vision.percentage >= 70 && people.percentage < 50) {
    section += `This candidate has strategic vision but struggles with people management. The profile suggests:\n\n`;
    section += `• Can see the big picture but may struggle to bring others along\n`;
    section += `• Needs development in empathy, coaching, and team building\n`;
    section += `• May be better suited for individual contributor strategic roles\n`;
  } else if (people.percentage >= 70 && vision.percentage < 50) {
    section += `This candidate is good with people but lacks strategic vision. The profile suggests:\n\n`;
    section += `• Builds strong relationships and supports team members\n`;
    section += `• May focus on tactical execution rather than long-term direction\n`;
    section += `• Best suited for team lead or supervisory roles with clear direction\n`;
  } else if (decision.percentage < 50 && emotional.percentage < 50) {
    section += `This candidate shows significant concerns in both decision-making and emotional intelligence. The profile suggests:\n\n`;
    section += `• May make poor judgments under pressure\n`;
    section += `• Struggles with interpersonal dynamics\n`;
    section += `• Not ready for any leadership responsibility at this time\n`;
  }
  
  return section;
};

// ============================================
// TECHNICAL HELPER FUNCTIONS
// ============================================

const generateTechnicalExecutiveSummary = (candidateName, avgScore, strengths, risks, knowledge, troubleshooting, safety) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong technical competence with particular strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows developing technical skills with significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates limited technical knowledge at this time. `;
  }

  const riskAreas = [];
  if (knowledge.percentage < 50) riskAreas.push('technical knowledge');
  if (troubleshooting.percentage < 50) riskAreas.push('problem-solving');
  if (safety.percentage < 50) riskAreas.push('safety awareness');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical weaknesses in ${riskAreas.join(', ')}, which will impact technical performance.`;
  }

  return summary;
};

const generateTechnicalRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getTechnicalRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getTechnicalDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateTechnicalProfile = (categories, knowledge, system, troubleshooting, safety) => {
  let section = `🧠 **Technical Competency Profile**\n\n`;
  
  if (knowledge.percentage >= 70 && troubleshooting.percentage >= 70) {
    section += `This candidate shows strong technical expertise. The profile suggests:\n\n`;
    section += `• Deep understanding of technical concepts\n`;
    section += `• Can troubleshoot complex problems effectively\n`;
    section += `• Ready for advanced technical roles\n`;
  } else if (knowledge.percentage >= 70 && troubleshooting.percentage < 50) {
    section += `This candidate has theoretical knowledge but struggles with practical application. The profile suggests:\n\n`;
    section += `• Knows concepts but cannot apply them effectively\n`;
    section += `• Needs hands-on practice and mentorship\n`;
    section += `• May excel in documentation or training roles\n`;
  } else if (troubleshooting.percentage >= 70 && knowledge.percentage < 50) {
    section += `This candidate is good at figuring things out but lacks foundational knowledge. The profile suggests:\n\n`;
    section += `• Can solve problems through trial and error\n`;
    section += `• Needs formal training to build knowledge base\n`;
    section += `• May have natural mechanical aptitude\n`;
  } else if (safety.percentage < 50) {
    section += `This candidate shows significant safety concerns. The profile suggests:\n\n`;
    section += `• May not recognize hazardous situations\n`;
    section += `• Requires intensive safety training before any technical work\n`;
    section += `• Needs close supervision in all activities\n`;
  }
  
  return section;
};

// ============================================
// PERSONALITY HELPER FUNCTIONS
// ============================================

const generatePersonalityExecutiveSummary = (candidateName, avgScore, strengths, risks, openness, conscientiousness, emotional, stress) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates a well-adjusted personality profile with strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows a moderate but uneven personality profile. `;
  } else {
    summary += `${candidateName} demonstrates significant personality concerns that may impact workplace functioning. `;
  }

  const riskAreas = [];
  if (emotional.percentage < 50) riskAreas.push('emotional stability');
  if (stress.percentage < 50) riskAreas.push('stress management');
  if (conscientiousness.percentage < 50) riskAreas.push('reliability');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical concerns in ${riskAreas.join(', ')}, which may affect job performance and team dynamics.`;
  }

  return summary;
};

const generatePersonalityRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getPersonalityRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getPersonalityDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generatePersonalityProfile = (categories, openness, conscientiousness, extraversion, agreeableness, neuroticism) => {
  let section = `🧠 **Personality Profile Analysis**\n\n`;
  
  if (openness.percentage >= 70 && conscientiousness.percentage >= 70) {
    section += `This candidate combines creativity with discipline. The profile suggests:\n\n`;
    section += `• Can generate innovative ideas and execute them\n`;
    section += `• Adaptable yet reliable\n`;
    section += `• Strong potential for growth roles\n`;
  } else if (openness.percentage >= 70 && conscientiousness.percentage < 50) {
    section += `This candidate is creative but disorganized. The profile suggests:\n\n`;
    section += `• Full of ideas but struggles to follow through\n`;
    section += `• May start projects but not complete them\n`;
    section += `• Needs structure and accountability\n`;
  } else if (conscientiousness.percentage >= 70 && openness.percentage < 50) {
    section += `This candidate is reliable but resistant to change. The profile suggests:\n\n`;
    section += `• Dependable and organized\n`;
    section += `• May struggle with new approaches\n`;
    section += `• Best in stable, predictable environments\n`;
  } else if (neuroticism.percentage < 50) {
    section += `This candidate shows emotional stability concerns. The profile suggests:\n\n`;
    section += `• May be prone to stress and anxiety\n`;
    section += `• Could struggle under pressure\n`;
    section += `• Needs supportive environment and stress management\n`;
  }
  
  return section;
};

// ============================================
// PERFORMANCE HELPER FUNCTIONS
// ============================================

const generatePerformanceExecutiveSummary = (candidateName, avgScore, strengths, risks, productivity, quality, accountability) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong performance patterns with particular strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows developing performance with significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates significant performance concerns. `;
  }

  const riskAreas = [];
  if (productivity.percentage < 50) riskAreas.push('productivity');
  if (quality.percentage < 50) riskAreas.push('work quality');
  if (accountability.percentage < 50) riskAreas.push('accountability');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical weaknesses in ${riskAreas.join(', ')}, which will impact job performance.`;
  }

  return summary;
};

const generatePerformanceRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getPerformanceRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getPerformanceDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generatePerformanceProfile = (categories, productivity, quality, accountability, initiative) => {
  let section = `🧠 **Performance Profile Analysis**\n\n`;
  
  if (productivity.percentage >= 70 && quality.percentage >= 70) {
    section += `This candidate combines speed with accuracy. The profile suggests:\n\n`;
    section += `• Produces high-quality work efficiently\n`;
    section += `• Reliable and consistent performer\n`;
    section += `• Can handle demanding workloads\n`;
  } else if (productivity.percentage >= 70 && quality.percentage < 50) {
    section += `This candidate is fast but error-prone. The profile suggests:\n\n`;
    section += `• Gets work done quickly but makes mistakes\n`;
    section += `• May sacrifice quality for speed\n`;
    section += `• Needs quality checks and attention to detail training\n`;
  } else if (quality.percentage >= 70 && productivity.percentage < 50) {
    section += `This candidate produces excellent work but is slow. The profile suggests:\n\n`;
    section += `• High standards but struggles with pace\n`;
    section += `• May need help with time management\n`;
    section += `• Could benefit from efficiency training\n`;
  } else if (accountability.percentage < 50) {
    section += `This candidate shows accountability concerns. The profile suggests:\n\n`;
    section += `• May blame others or external factors\n`;
    section += `• Avoids responsibility for mistakes\n`;
    section += `• Needs coaching on ownership and follow-through\n`;
  }
  
  return section;
};

// ============================================
// BEHAVIORAL HELPER FUNCTIONS
// ============================================

const generateBehavioralExecutiveSummary = (candidateName, avgScore, strengths, risks, teamwork, communication, conflict) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong behavioral competencies with particular strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows developing behavioral skills with significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates significant behavioral concerns. `;
  }

  const riskAreas = [];
  if (teamwork.percentage < 50) riskAreas.push('teamwork');
  if (communication.percentage < 50) riskAreas.push('communication');
  if (conflict.percentage < 50) riskAreas.push('conflict resolution');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical weaknesses in ${riskAreas.join(', ')}, which may impact workplace relationships.`;
  }

  return summary;
};

const generateBehavioralRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getBehavioralRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getBehavioralDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateBehavioralProfile = (categories, teamwork, communication, empathy, adaptability) => {
  let section = `🧠 **Behavioral Profile Analysis**\n\n`;
  
  if (teamwork.percentage >= 70 && communication.percentage >= 70) {
    section += `This candidate shows strong interpersonal skills. The profile suggests:\n\n`;
    section += `• Works effectively in teams\n`;
    section += `• Communicates clearly and appropriately\n`;
    section += `• Builds positive relationships with colleagues\n`;
  } else if (teamwork.percentage >= 70 && communication.percentage < 50) {
    section += `This candidate is cooperative but struggles to communicate. The profile suggests:\n\n`;
    section += `• Willing to help others but may not express needs\n`;
    section += `• May be misunderstood or overlook important information\n`;
    section += `• Needs communication skills training\n`;
  } else if (communication.percentage >= 70 && teamwork.percentage < 50) {
    section += `This candidate communicates well but prefers working alone. The profile suggests:\n\n`;
    section += `• Expresses ideas clearly but may not collaborate\n`;
    section += `• Could be perceived as aloof or uncooperative\n`;
    section += `• Needs encouragement to engage with team\n`;
  } else if (adaptability.percentage < 50) {
    section += `This candidate shows adaptability concerns. The profile suggests:\n\n`;
    section += `• Struggles with change and new situations\n`;
    section += `• May resist new processes or ideas\n`;
    section += `• Needs support during transitions\n`;
  }
  
  return section;
};

// ============================================
// CULTURAL HELPER FUNCTIONS
// ============================================

const generateCulturalExecutiveSummary = (candidateName, avgScore, strengths, risks, values, diversity, inclusivity) => {
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `${candidateName} demonstrates strong cultural alignment with particular strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `${candidateName} shows developing cultural awareness with significant gaps. `;
  } else {
    summary += `${candidateName} demonstrates significant cultural fit concerns. `;
  }

  const riskAreas = [];
  if (values.percentage < 50) riskAreas.push('values alignment');
  if (diversity.percentage < 50) riskAreas.push('diversity awareness');
  if (inclusivity.percentage < 50) riskAreas.push('inclusivity');

  if (riskAreas.length > 0) {
    summary += `\n\nThe assessment reveals critical concerns in ${riskAreas.join(', ')}, which may affect organizational fit.`;
  }

  return summary;
};

const generateCulturalRisksSection = (risks) => {
  if (risks.length === 0) return '';

  let section = `🔴 **Critical Development Areas**\n\n`;
  
  risks.forEach(r => {
    section += `**${r.name}** – ${r.percentage}% (${getGrade(r.percentage)})\n\n`;
    section += `${getCulturalRiskDescription(r.name, r.percentage)}\n\n`;
    
    const steps = getCulturalDevelopmentSteps(r.name);
    if (steps.length > 0) {
      section += `**Recommended actions:**\n`;
      steps.slice(0, 3).forEach(step => section += `• ${step}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateCulturalProfile = (categories, values, diversity, inclusivity, respect) => {
  let section = `🧠 **Cultural Fit Profile**\n\n`;
  
  if (values.percentage >= 70 && diversity.percentage >= 70 && inclusivity.percentage >= 70) {
    section += `This candidate shows strong cultural alignment. The profile suggests:\n\n`;
    section += `• Embodies organizational values\n`;
    section += `• Respects and values differences\n`;
    section += `• Creates inclusive environment for others\n`;
    section += `• Would be a positive cultural contributor\n`;
  } else if (values.percentage >= 70 && diversity.percentage < 50) {
    section += `This candidate aligns with core values but lacks diversity awareness. The profile suggests:\n\n`;
    section += `• Shares organizational principles\n`;
    section += `• May not understand or appreciate differences\n`;
    section += `• Needs diversity and inclusion training\n`;
  } else if (diversity.percentage >= 70 && values.percentage < 50) {
    section += `This candidate values diversity but may not align with core values. The profile suggests:\n\n`;
    section += `• Respects differences and inclusion\n`;
    section += `• May not fully embrace organizational principles\n`;
    section += `• Needs clarity on company values and expectations\n`;
  } else if (respect.percentage < 50) {
    section += `This candidate shows respect concerns. The profile suggests:\n\n`;
    section += `• May be dismissive of others\n`;
    section += `• Could create interpersonal friction\n`;
    section += `• Needs coaching on professional conduct\n`;
  }
  
  return section;
};

// ============================================
// GENERIC HELPER FUNCTIONS (used by all analyzers)
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

// Generic section generators
const generateStrengthsSection = (strengths, type) => {
  if (strengths.length === 0) return '';

  let section = `🟢 **Key Strengths**\n\n`;
  
  strengths.forEach(s => {
    section += `**${s.name}** – ${s.percentage}% (${getGrade(s.percentage)})\n\n`;
    section += `${getStrengthDescription(s.name, type)}\n\n`;
    
    const indicators = getStrengthIndicators(s.name);
    if (indicators.length > 0) {
      section += `Indicates:\n\n`;
      indicators.forEach(i => section += `• ${i}\n`);
      section += `\n`;
    }
  });

  return section;
};

const generateModerateSection = (moderate, type) => {
  if (moderate.length === 0) return '';

  let section = `🟡 **Moderate / Developing Areas**\n\n`;
  
  moderate.forEach(m => {
    section += `**${m.name}** – ${m.percentage}% (${getGrade(m.percentage)})\n\n`;
    section += `${getModerateDescription(m.name, type)}\n\n`;
    
    const gap = Math.round((70 - m.percentage) / 5) * 5;
    section += `Current performance is ${m.percentage}%. Target is 70% (${gap}% gap).\n\n`;
  });

  return section;
};

// ============================================
// DETAILED RISK DESCRIPTIONS BY ASSESSMENT TYPE
// ============================================

const getCognitiveRiskDescription = (name, percentage) => {
  const descriptions = {
    'Memory & Attention': `At ${percentage}%, memory and attention are severely impaired. Will struggle to retain instructions, remember procedures, and maintain focus on tasks.`,
    'Verbal Reasoning': `At ${percentage}%, verbal reasoning is critically low. Will have difficulty understanding written instructions, following verbal directions, and expressing ideas clearly.`,
    'Logical / Abstract Reasoning': `At ${percentage}%, logical reasoning is severely deficient. Will struggle with cause-and-effect relationships, problem-solving, and understanding abstract concepts.`,
    'Numerical Reasoning': `At ${percentage}%, numerical reasoning is critically low. Will have difficulty with basic arithmetic, understanding numbers, and interpreting quantitative data.`,
    'Mechanical Reasoning': `At ${percentage}%, mechanical reasoning is very low. Will struggle to understand how things work and troubleshoot mechanical problems.`,
    'Spatial Reasoning': `At ${percentage}%, spatial reasoning is significantly below average. Will have difficulty reading diagrams, understanding spatial relationships, and visualizing objects.`,
    'Perceptual Speed & Accuracy': `At ${percentage}%, perceptual processing is very slow and error-prone. Will miss details and make frequent errors on detail-oriented tasks.`
  };
  return descriptions[name] || `Critical deficiency at ${percentage}% requiring immediate intervention.`;
};

const getGeneralRiskDescription = (name, percentage) => {
  const descriptions = {
    'Cognitive Ability': `At ${percentage}%, cognitive ability is critically low. Will struggle with analytical thinking and complex problem-solving.`,
    'Communication': `At ${percentage}%, communication skills are severely underdeveloped. Will have difficulty expressing ideas and understanding others.`,
    'Emotional Intelligence': `At ${percentage}%, emotional intelligence is very low. May struggle with self-awareness and interpersonal relationships.`,
    'Leadership & Management': `At ${percentage}%, leadership potential is severely limited. Not ready for any management responsibility.`,
    'Problem-Solving': `At ${percentage}%, problem-solving ability is critically deficient. Will need step-by-step guidance for even routine issues.`,
    'Ethics & Integrity': `At ${percentage}%, ethical concerns require immediate attention. Needs clear boundaries and supervision.`,
    'Performance Metrics': `At ${percentage}%, performance is highly inconsistent. Will require constant monitoring and feedback.`
  };
  return descriptions[name] || `Critical deficiency at ${percentage}% requiring immediate intervention.`;
};

const getLeadershipRiskDescription = (name, percentage) => {
  const descriptions = {
    'Vision & Strategic Thinking': `At ${percentage}%, strategic thinking is severely limited. Cannot articulate vision or plan for the future.`,
    'Decision-Making': `At ${percentage}%, decision-making is poor and unreliable. Will make inconsistent judgments under pressure.`,
    'People Management': `At ${percentage}%, people management skills are critically underdeveloped. Cannot effectively lead or develop others.`,
    'Communication & Influence': `At ${percentage}%, communication and influence skills are very low. Cannot persuade or inspire others.`,
    'Change Leadership': `At ${percentage}%, cannot effectively lead or adapt to change. Will resist and struggle with transitions.`,
    'Execution & Results': `At ${percentage}%, execution is highly inconsistent. Will struggle to deliver results reliably.`,
    'Emotional Intelligence': `At ${percentage}%, emotional intelligence is very low. Will struggle with self-awareness and team dynamics.`
  };
  return descriptions[name] || `Critical leadership deficiency at ${percentage}%.`;
};

const getTechnicalRiskDescription = (name, percentage) => {
  const descriptions = {
    'Technical Knowledge': `At ${percentage}%, technical knowledge is severely lacking. Cannot perform basic technical tasks independently.`,
    'System Understanding': `At ${percentage}%, system understanding is critically low. Cannot grasp how components work together.`,
    'Troubleshooting': `At ${percentage}%, troubleshooting ability is severely deficient. Cannot diagnose or resolve problems.`,
    'Safety & Compliance': `At ${percentage}%, safety awareness is critically low. Poses significant risk to self and others.`,
    'Quality Control': `At ${percentage}%, quality standards are not met. Work will contain frequent errors.`,
    'Equipment Operation': `At ${percentage}%, cannot operate equipment safely or effectively. Requires direct supervision.`,
    'Maintenance Procedures': `At ${percentage}%, cannot perform basic maintenance. Equipment may fail due to neglect.`
  };
  return descriptions[name] || `Critical technical deficiency at ${percentage}%.`;
};

const getPersonalityRiskDescription = (name, percentage) => {
  const descriptions = {
    'Neuroticism': `At ${percentage}%, emotional stability is very low. Will struggle with stress and may be reactive under pressure.`,
    'Extraversion': `At ${percentage}%, social engagement is very low. May withdraw from team interactions and avoid collaboration.`,
    'Agreeableness': `At ${percentage}%, cooperativeness is very low. May create interpersonal friction and resist teamwork.`,
    'Conscientiousness': `At ${percentage}%, reliability is very low. Will struggle with organization and follow-through.`,
    'Openness': `At ${percentage}%, adaptability is very low. Will resist change and new approaches.`,
    'Stress Management': `At ${percentage}%, cannot manage pressure effectively. Performance will deteriorate under stress.`,
    'Integrity': `At ${percentage}%, integrity concerns require immediate attention. Needs clear boundaries and supervision.`
  };
  return descriptions[name] || `Critical personality concern at ${percentage}%.`;
};

const getPerformanceRiskDescription = (name, percentage) => {
  const descriptions = {
    'Productivity': `At ${percentage}%, productivity is very low. Struggles to complete tasks and meet deadlines.`,
    'Quality': `At ${percentage}%, work quality is poor. Produces error-prone output requiring constant revision.`,
    'Accountability': `At ${percentage}%, accountability is very low. Blames others and avoids responsibility.`,
    'Initiative': `At ${percentage}%, initiative is very low. Requires constant direction and prompting.`,
    'Collaboration': `At ${percentage}%, collaboration skills are poor. Struggles to work effectively with others.`,
    'Time Management': `At ${percentage}%, time management is very poor. Frequently misses deadlines.`,
    'Goal Achievement': `At ${percentage}%, consistently fails to meet goals and objectives.`
  };
  return descriptions[name] || `Critical performance deficiency at ${percentage}%.`;
};

const getBehavioralRiskDescription = (name, percentage) => {
  const descriptions = {
    'Teamwork': `At ${percentage}%, teamwork skills are very poor. Cannot collaborate effectively with others.`,
    'Communication': `At ${percentage}%, communication skills are severely underdeveloped. Creates misunderstandings and confusion.`,
    'Conflict Resolution': `At ${percentage}%, cannot handle disagreements constructively. May escalate conflicts.`,
    'Empathy': `At ${percentage}%, empathy is very low. Fails to understand others' perspectives.`,
    'Adaptability': `At ${percentage}%, cannot adapt to change. Becomes distressed with new situations.`,
    'Professionalism': `At ${percentage}%, professional conduct is concerning. May behave inappropriately.`,
    'Feedback Reception': `At ${percentage}%, becomes defensive and cannot accept feedback constructively.`
  };
  return descriptions[name] || `Critical behavioral concern at ${percentage}%.`;
};

const getCulturalRiskDescription = (name, percentage) => {
  const descriptions = {
    'Values Alignment': `At ${percentage}%, significant misalignment with core values. May actively work against organizational principles.`,
    'Diversity Awareness': `At ${percentage}%, diversity awareness is very low. May exhibit or condone exclusionary behavior.`,
    'Inclusivity': `At ${percentage}%, fails to create inclusive environment. May exclude or marginalize others.`,
    'Respect': `At ${percentage}%, shows disrespect toward colleagues. May create hostile work environment.`,
    'Work Ethic': `At ${percentage}%, work ethic is very poor. Does minimum required and may cut corners.`,
    'Integrity': `At ${percentage}%, integrity concerns require immediate attention. Poses ethical risk.`,
    'Collaboration': `At ${percentage}%, collaboration skills are very poor. Works against team cohesion.`
  };
  return descriptions[name] || `Critical cultural fit concern at ${percentage}%.`;
};

// ============================================
// DEVELOPMENT STEPS BY ASSESSMENT TYPE
// ============================================

const getCognitiveDevelopmentSteps = (name) => {
  const steps = {
    'Memory & Attention': [
      'Use memory aids (checklists, notes, reminders) daily',
      'Practice mindfulness and focus exercises for 10 minutes daily',
      'Break tasks into smaller chunks with clear completion points',
      'Use repetition and regular review of information',
      'Create structured routines and consistent procedures'
    ],
    'Verbal Reasoning': [
      'Read for 15 minutes daily, starting with simple materials',
      'Write brief summaries of what was read',
      'Practice explaining simple concepts to others',
      'Use vocabulary building apps daily',
      'Work with a tutor on language skills twice weekly'
    ],
    'Logical / Abstract Reasoning': [
      'Start with simple cause-and-effect exercises',
      'Practice with basic logic puzzles daily',
      'Use real-world examples to explain concepts',
      'Work through problems step-by-step with guidance',
      'Use visual aids and concrete examples'
    ],
    'Numerical Reasoning': [
      'Practice basic arithmetic for 10 minutes daily',
      'Use money transactions for real-world math practice',
      'Work with calculators and visual number lines',
      'Start with concrete objects before moving to abstract numbers',
      'Use math apps that provide immediate feedback'
    ],
    'Mechanical Reasoning': [
      'Study simple machines with hands-on examples',
      'Take apart and reassemble simple mechanical objects',
      'Watch educational videos about how things work',
      'Work alongside an experienced mentor weekly',
      'Practice identifying mechanical problems and solutions'
    ],
    'Spatial Reasoning': [
      'Practice with puzzles (jigsaw, tangrams) daily',
      'Use building blocks to create structures from pictures',
      'Practice reading simple diagrams and maps',
      'Practice estimating distances and sizes',
      'Work with 3D modeling software at basic level'
    ],
    'Perceptual Speed & Accuracy': [
      'Practice visual scanning exercises with timers',
      'Use "spot the difference" puzzles to improve detail recognition',
      'Create checklists for quality control tasks',
      'Practice sorting and categorizing exercises',
      'Take breaks to maintain focus during detail work'
    ]
  };
  return steps[name] || [
    'Assess current skill level to identify specific gaps',
    'Create a structured learning plan with clear milestones',
    'Work with a mentor for guided practice weekly',
    'Use targeted exercises and resources daily',
    'Track progress weekly and adjust approach as needed'
  ];
};

const getLeadershipDevelopmentSteps = (name) => {
  const steps = {
    'Vision & Strategic Thinking': [
      'Read books on strategic thinking and leadership',
      'Practice writing vision statements for hypothetical scenarios',
      'Study organizational strategy and discuss with mentor',
      'Participate in strategic planning sessions',
      'Analyze case studies of successful leaders'
    ],
    'Decision-Making': [
      'Use structured decision-making frameworks (pros/cons, decision matrices)',
      'Practice making decisions with incomplete information',
      'Discuss major decisions with mentor before finalizing',
      'Analyze past decisions to identify improvement areas',
      'Role-play difficult decision scenarios'
    ],
    'People Management': [
      'Complete foundational people management training',
      'Practice giving feedback in low-stakes situations',
      'Shadow an experienced manager weekly',
      'Take on informal mentoring of junior team members',
      'Read books on coaching and development'
    ],
    'Communication & Influence': [
      'Take an influencing skills workshop',
      'Practice tailoring messages to different audiences',
      'Join Toastmasters or similar groups',
      'Seek feedback on communication effectiveness',
      'Study persuasive communication techniques'
    ],
    'Change Leadership': [
      'Learn change management models (Kotter, ADKAR)',
      'Practice communicating about change positively',
      'Volunteer for change initiatives',
      'Study successful organizational transformations',
      'Help others navigate through changes'
    ],
    'Execution & Results': [
      'Set SMART goals and track progress weekly',
      'Use project management tools to monitor execution',
      'Break large goals into weekly action steps',
      'Celebrate small wins to build momentum',
      'Review and adjust plans regularly'
    ],
    'Emotional Intelligence': [
      'Participate in EI workshops',
      'Practice active listening daily',
      'Seek feedback on interpersonal interactions',
      'Reflect on emotional responses to situations',
      'Read books on emotional intelligence'
    ]
  };
  return steps[name] || [
    'Identify specific leadership gaps with mentor',
    'Create development plan with clear objectives',
    'Seek stretch assignments to practice skills',
    'Work with executive coach monthly',
    'Gather 360-degree feedback quarterly'
  ];
};

const getTechnicalDevelopmentSteps = (name) => {
  const steps = {
    'Technical Knowledge': [
      'Complete foundational technical training courses',
      'Create a structured learning plan with milestones',
      'Shadow experienced technicians weekly',
      'Study technical documentation and manuals',
      'Practice skills in supervised settings'
    ],
    'System Understanding': [
      'Map out system components and relationships',
      'Study system documentation thoroughly',
      'Discuss interactions with experienced colleagues',
      'Learn how changes in one area affect others',
      'Practice troubleshooting system issues'
    ],
    'Troubleshooting': [
      'Learn systematic troubleshooting methodologies',
      'Practice with simulated problems',
      'Document troubleshooting steps and solutions',
      'Build a knowledge base of common issues',
      'Shadow experienced troubleshooters'
    ],
    'Safety & Compliance': [
      'Complete all required safety training',
      'Follow procedures exactly every time',
      'Report concerns immediately',
      'Review safety incidents and lessons learned',
      'Practice safety scenarios regularly'
    ],
    'Quality Control': [
      'Learn quality standards and inspection methods',
      'Practice self-checking work using checklists',
      'Study examples of quality issues and solutions',
      'Track quality metrics weekly',
      'Identify improvement opportunities'
    ],
    'Equipment Operation': [
      'Complete equipment training and certification',
      'Practice under supervision until proficient',
      'Follow operating procedures strictly',
      'Learn basic maintenance for equipment',
      'Train others on equipment operation'
    ],
    'Maintenance Procedures': [
      'Learn preventive maintenance schedules',
      'Document maintenance activities thoroughly',
      'Develop troubleshooting skills for common issues',
      'Practice routine maintenance independently',
      'Study equipment manuals and specifications'
    ]
  };
  return steps[name] || [
    'Identify specific technical skill gaps',
    'Create structured learning plan with mentor',
    'Complete relevant certifications',
    'Practice hands-on skills weekly',
    'Document progress and lessons learned'
  ];
};

const getPersonalityDevelopmentSteps = (name) => {
  const steps = {
    'Neuroticism': [
      'Practice mindfulness and stress-reduction techniques daily',
      'Establish predictable routines to reduce uncertainty',
      'Learn cognitive reframing techniques',
      'Build a support network of trusted colleagues',
      'Consider professional coaching for anxiety management'
    ],
    'Extraversion': [
      'Practice one-on-one interactions in comfortable settings',
      'Prepare talking points before meetings',
      'Join a supportive group like Toastmasters',
      'Gradually increase participation in team activities',
      'Find balance between social time and solo work'
    ],
    'Agreeableness': [
      'Practice assertiveness techniques in low-stakes situations',
      'Learn to set healthy boundaries while maintaining relationships',
      'Role-play difficult conversations with a coach',
      'Read books on assertive communication',
      'Practice saying "no" politely and offering alternatives'
    ],
    'Conscientiousness': [
      'Use detailed checklists and project management tools',
      'Set up accountability partnerships with regular check-ins',
      'Break commitments into smaller, trackable steps',
      'Use calendar and task list consistently',
      'Review progress and adjust plans daily'
    ],
    'Openness': [
      'Start with small changes to routine',
      'Learn about one new topic weekly',
      'Try new approaches to routine tasks',
      'Volunteer for projects involving new methodologies',
      'Embrace change gradually with support'
    ],
    'Stress Management': [
      'Learn and practice stress reduction techniques daily',
      'Establish work-life boundaries',
      'Practice mindfulness and meditation',
      'Develop a personal resilience plan',
      'Use employee assistance program resources'
    ],
    'Integrity': [
      'Review company values and ethics policies',
      'Discuss ethical dilemmas with supervisor',
      'Participate in ethics training',
      'Practice transparent communication',
      'Reflect on decision-making process'
    ]
  };
  return steps[name] || [
    'Work with a coach on personal development',
    'Seek regular feedback on behavior',
    'Practice self-awareness exercises',
    'Read books on personal effectiveness',
    'Track progress and adjust approach'
  ];
};

const getPerformanceDevelopmentSteps = (name) => {
  const steps = {
    'Productivity': [
      'Use time tracking to identify inefficiencies',
      'Learn productivity techniques (Pomodoro, batch processing)',
      'Set daily output goals and track progress',
      'Prioritize tasks using urgency/importance matrix',
      'Review productivity weekly and adjust'
    ],
    'Quality': [
      'Use checklists to ensure quality standards',
      'Get feedback on work product regularly',
      'Study examples of excellent work',
      'Review work before submitting',
      'Learn quality improvement methodologies'
    ],
    'Accountability': [
      'Make commitments in writing',
      'Share goals with others for accountability',
      'Follow through consistently',
      'Take ownership of mistakes and learn from them',
      'Document accomplishments and challenges'
    ],
    'Initiative': [
      'Identify one improvement to make independently weekly',
      'Volunteer for small tasks and projects',
      'Proactively seek additional responsibilities',
      'Suggest improvements without being asked',
      'Take on problems and solve them'
    ],
    'Collaboration': [
      'Practice active listening in meetings',
      'Seek input from others before deciding',
      'Acknowledge others contributions publicly',
      'Volunteer for cross-functional projects',
      'Share credit generously with team members'
    ],
    'Time Management': [
      'Use a calendar and task list consistently',
      'Estimate time needed more accurately',
      'Block time for important tasks',
      'Review and adjust schedule daily',
      'Learn prioritization techniques'
    ],
    'Goal Achievement': [
      'Set SMART goals with clear metrics',
      'Break goals into weekly action steps',
      'Track progress visibly',
      'Celebrate small wins',
      'Review and adjust goals quarterly'
    ]
  };
  return steps[name] || [
    'Identify specific performance gaps with supervisor',
    'Create improvement plan with clear metrics',
    'Implement productivity tools and techniques',
    'Track progress weekly',
    'Adjust approach based on results'
  ];
};

const getBehavioralDevelopmentSteps = (name) => {
  const steps = {
    'Teamwork': [
      'Practice supporting team members',
      'Ask how you can help others',
      'Acknowledge team achievements',
      'Contribute ideas in team settings',
      'Participate in team-building activities'
    ],
    'Communication': [
      'Take communication skills training',
      'Practice active listening daily',
      'Prepare talking points before important conversations',
      'Seek feedback on communication effectiveness',
      'Join Toastmasters or similar groups'
    ],
    'Conflict Resolution': [
      'Learn conflict resolution basics',
      'Practice staying calm during disagreements',
      'Seek mediation when needed',
      'Address conflicts early before escalation',
      'Find win-win solutions'
    ],
    'Empathy': [
      'Practice perspective-taking daily',
      'Ask about others feelings and experiences',
      'Listen without judgment',
      'Consider others needs when making decisions',
      'Show genuine concern for colleagues'
    ],
    'Adaptability': [
      'Start with small changes to routine',
      'Practice curiosity about new approaches',
      'Volunteer for projects involving change',
      'Learn to see situations from multiple perspectives',
      'Adapt when initial approach doesn't work'
    ],
    'Professionalism': [
      'Review professional conduct guidelines',
      'Observe professional behavior models',
      'Get feedback on professional presence',
      'Maintain composure in all situations',
      'Represent organization positively'
    ],
    'Feedback Reception': [
      'Ask for feedback regularly',
      'Listen without defending',
      'Thank people for feedback',
      'Create action plans from feedback',
      'Show improvement based on input'
    ]
  };
  return steps[name] || [
    'Work with coach on behavioral development',
    'Seek regular feedback from colleagues',
    'Practice self-awareness daily',
    'Role-play challenging situations',
    'Track progress and adjust approach'
  ];
};

const getCulturalDevelopmentSteps = (name) => {
  const steps = {
    'Values Alignment': [
      'Study company values and discuss with supervisor',
      'Identify personal connection to each value',
      'Demonstrate values in daily work',
      'Recognize others who exemplify values',
      'Review values application in decisions'
    ],
    'Diversity Awareness': [
      'Complete diversity and inclusion training',
      'Learn about different cultures and perspectives',
      'Seek diverse perspectives in meetings',
      'Challenge own assumptions and biases',
      'Read books on diversity and inclusion'
    ],
    'Inclusivity': [
      'Ensure everyone has opportunity to contribute',
      'Invite input from quiet members',
      'Create space for diverse voices',
      'Address exclusionary behavior',
      'Practice inclusive language'
    ],
    'Respect': [
      'Treat everyone with courtesy regardless of role',
      'Avoid gossip and negative talk',
      'Show appreciation for others contributions',
      'Respect boundaries and differences',
      'Address disrespectful behavior when observed'
    ],
    'Work Ethic': [
      'Set personal standards for effort and quality',
      'Complete tasks thoroughly',
      'Be reliable and dependable',
      'Go beyond minimum requirements',
      'Take pride in work quality'
    ],
    'Integrity': [
      'Practice transparent communication',
      'Keep commitments consistently',
      'Admit mistakes and learn from them',
      'Make decisions aligned with values',
      'Be honest even when difficult'
    ],
    'Collaboration': [
      'Practice supporting team members',
      'Share information and resources freely',
      'Celebrate team successes',
      'Help others without being asked',
      'Build cross-functional relationships'
    ]
  };
  return steps[name] || [
    'Participate in culture workshops',
    'Seek feedback on cultural alignment',
    'Learn about organizational values',
    'Engage with diverse team members',
    'Practice inclusive behaviors daily'
  ];
};

// ============================================
// HELPER FUNCTIONS FOR STRENGTHS AND MODERATE
// ============================================

const getStrengthDescription = (name, type) => {
  const descriptions = {
    'cognitive': {
      'Memory & Attention': 'Strong ability to retain information and maintain focus.',
      'Verbal Reasoning': 'Excellent verbal comprehension and expression.',
      'Logical / Abstract Reasoning': 'Strong analytical and problem-solving abilities.',
      'Numerical Reasoning': 'Good quantitative and numerical skills.',
      'Spatial Reasoning': 'Strong visual-spatial processing.',
      'Perceptual Speed': 'Fast and accurate visual processing.'
    },
    'personality': {
      'Openness': 'Highly curious and open to new experiences.',
      'Conscientiousness': 'Organized, disciplined, and reliable.',
      'Extraversion': 'Energized by social interaction.',
      'Agreeableness': 'Cooperative and compassionate.',
      'Emotional Stability': 'Calm and resilient under pressure.'
    },
    'leadership': {
      'Vision': 'Strategic thinker with clear direction.',
      'Decision-Making': 'Makes sound judgments consistently.',
      'People Management': 'Develops and coaches others effectively.',
      'Communication': 'Influential and persuasive communicator.',
      'Execution': 'Drives results with discipline.'
    },
    'technical': {
      'Technical Knowledge': 'Deep understanding of systems and technologies.',
      'Troubleshooting': 'Excellent problem diagnosis skills.',
      'Quality Control': 'Maintains high standards.',
      'Safety': 'Strong safety awareness.',
      'Equipment Operation': 'Skilled equipment operator.'
    }
  };
  
  return descriptions[type]?.[name] || `Strong performance in this area.`;
};

const getModerateDescription = (name, type) => {
  const descriptions = {
    'cognitive': {
      'Memory & Attention': 'Adequate memory and focus with room for improvement.',
      'Verbal Reasoning': 'Basic verbal skills that can be developed further.',
      'Logical Reasoning': 'Can handle routine logic but struggles with complexity.'
    },
    'personality': {
      'Extraversion': 'Balanced social engagement.',
      'Agreeableness': 'Generally cooperative.',
      'Conscientiousness': 'Moderately organized.'
    },
    'leadership': {
      'Vision': 'Developing strategic thinking.',
      'People Management': 'Emerging people skills.',
      'Execution': 'Generally delivers results.'
    },
    'technical': {
      'Technical Knowledge': 'Basic understanding needs development.',
      'Troubleshooting': 'Can solve routine issues.'
    }
  };
  
  return descriptions[type]?.[name] || `Shows moderate competency with room for growth.`;
};

const getStrengthIndicators = (name) => {
  const indicators = {
    'Openness': [
      'Strong curiosity and learning agility',
      'Adaptability to new ideas',
      'Innovation-friendly mindset',
      'Willingness to experiment'
    ],
    'Conscientiousness': [
      'Organized and dependable',
      'Follows through on commitments',
      'Attention to detail',
      'Reliable execution'
    ],
    'Vision': [
      'Sees the big picture',
      'Anticipates future trends',
      'Creates clear direction',
      'Strategic mindset'
    ],
    'People Management': [
      'Develops team members',
      'Provides effective feedback',
      'Builds high-performing teams',
      'Coaches others'
    ]
  };
  return indicators[name] || [];
};

// Additional helper functions for missing functions
const generateGeneralRoleSuitability = (avgScore, strengths, risks, leadership, cognitive) => {
  return "**Role Suitability**\n\nGeneral assessment role suitability analysis.";
};

const generateGeneralDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nGeneral assessment development priorities.";
};

const generateGeneralOverallInterpretation = (candidateName, avgScore, strengths, risks, leadership, cognitive) => {
  return "**Overall Interpretation**\n\nGeneral assessment overall interpretation.";
};

const generateLeadershipRoleSuitability = (avgScore, strengths, risks, vision, people, execution) => {
  return "**Role Suitability**\n\nLeadership assessment role suitability analysis.";
};

const generateLeadershipDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nLeadership assessment development priorities.";
};

const generateLeadershipOverallInterpretation = (candidateName, avgScore, strengths, risks, vision, people) => {
  return "**Overall Interpretation**\n\nLeadership assessment overall interpretation.";
};

const generateTechnicalRoleSuitability = (avgScore, strengths, risks, knowledge, troubleshooting, safety) => {
  return "**Role Suitability**\n\nTechnical assessment role suitability analysis.";
};

const generateTechnicalDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nTechnical assessment development priorities.";
};

const generateTechnicalOverallInterpretation = (candidateName, avgScore, strengths, risks, knowledge, troubleshooting) => {
  return "**Overall Interpretation**\n\nTechnical assessment overall interpretation.";
};

const generatePersonalityRoleSuitability = (avgScore, strengths, risks, openness, conscientiousness, extraversion, emotional) => {
  return "**Role Suitability**\n\nPersonality assessment role suitability analysis.";
};

const generatePersonalityDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nPersonality assessment development priorities.";
};

const generatePersonalityOverallInterpretation = (candidateName, avgScore, strengths, risks, openness, conscientiousness, emotional, stress) => {
  return "**Overall Interpretation**\n\nPersonality assessment overall interpretation.";
};

const generatePerformanceRoleSuitability = (avgScore, strengths, risks, productivity, quality, accountability) => {
  return "**Role Suitability**\n\nPerformance assessment role suitability analysis.";
};

const generatePerformanceDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nPerformance assessment development priorities.";
};

const generatePerformanceOverallInterpretation = (candidateName, avgScore, strengths, risks, productivity, accountability) => {
  return "**Overall Interpretation**\n\nPerformance assessment overall interpretation.";
};

const generateBehavioralRoleSuitability = (avgScore, strengths, risks, teamwork, communication, conflict) => {
  return "**Role Suitability**\n\nBehavioral assessment role suitability analysis.";
};

const generateBehavioralDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nBehavioral assessment development priorities.";
};

const generateBehavioralOverallInterpretation = (candidateName, avgScore, strengths, risks, teamwork, communication) => {
  return "**Overall Interpretation**\n\nBehavioral assessment overall interpretation.";
};

const generateCulturalRoleSuitability = (avgScore, strengths, risks, values, diversity, collaboration) => {
  return "**Role Suitability**\n\nCultural assessment role suitability analysis.";
};

const generateCulturalDevelopmentPriorities = (risks, moderate) => {
  return "**Development Priorities**\n\nCultural assessment development priorities.";
};

const generateCulturalOverallInterpretation = (candidateName, avgScore, strengths, risks, values, diversity) => {
  return "**Overall Interpretation**\n\nCultural assessment overall interpretation.";
};

const getCognitivePriorityTitle = (name) => {
  const titles = {
    'Memory & Attention': 'Memory and Attention Development',
    'Verbal Reasoning': 'Verbal Comprehension and Expression',
    'Logical / Abstract Reasoning': 'Logical Thinking and Problem-Solving',
    'Numerical Reasoning': 'Numerical Literacy and Calculation',
    'Mechanical Reasoning': 'Mechanical Understanding and Application',
    'Spatial Reasoning': 'Spatial Awareness and Visualization',
    'Perceptual Speed & Accuracy': 'Visual Processing and Attention to Detail'
  };
  return titles[name] || 'Cognitive Skill Development';
};

const getCognitiveRiskImplications = (name) => {
  const implications = {
    'Memory & Attention': [
      'Difficulty remembering instructions and procedures',
      'Frequent distractions and loss of focus',
      'Forgets important details and deadlines',
      'Requires constant reminders and written instructions'
    ],
    'Verbal Reasoning': [
      'Struggles to understand written and verbal instructions',
      'Difficulty expressing ideas and asking questions',
      'May misunderstand communication from others',
      'Limited vocabulary and reading comprehension'
    ],
    'Logical / Abstract Reasoning': [
      'Difficulty understanding cause and effect',
      'Struggles with problem-solving',
      'Cannot grasp abstract concepts',
      'Needs concrete, step-by-step instructions'
    ]
  };
  return implications[name] || [];
};

const getGeneralDevelopmentSteps = (name) => {
  return [
    'Identify specific skill gaps with supervisor',
    'Create structured learning plan with clear objectives',
    'Practice skills in real-world scenarios',
    'Seek regular feedback and adjust approach',
    'Track progress monthly'
  ];
};
