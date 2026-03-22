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

  // Find key categories for narrative (updated for 6 new traits)
  const ownership = categories.find(c => c.name.includes('Ownership')) || { percentage: 0, name: 'Ownership' };
  const collaboration = categories.find(c => c.name.includes('Collaboration')) || { percentage: 0, name: 'Collaboration' };
  const action = categories.find(c => c.name.includes('Action')) || { percentage: 0, name: 'Action' };
  const analysisTrait = categories.find(c => c.name.includes('Analysis')) || { percentage: 0, name: 'Analysis' };
  const riskTolerance = categories.find(c => c.name.includes('Risk')) || { percentage: 0, name: 'Risk Tolerance' };
  const structure = categories.find(c => c.name.includes('Structure')) || { percentage: 0, name: 'Structure' };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification
    },
    executiveSummary: generateExecutiveSummary(candidateName, avgScore, strengths, risks, ownership, collaboration, action, analysisTrait, riskTolerance, structure),
    categoryAnalysis: {
      strengths: generateStrengthsAnalysis(strengths),
      moderate: generateModerateAnalysis(moderate),
      risks: generateRisksAnalysis(risks)
    },
    personalityStructure: generatePersonalityStructure(ownership, collaboration, action, analysisTrait, riskTolerance, structure),
    roleSuitability: generateRoleSuitability(strengths, risks, ownership, collaboration, action, analysisTrait, riskTolerance, structure),
    developmentPriorities: generateDevelopmentPriorities(risks, moderate),
    overallInterpretation: generateOverallInterpretation(candidateName, avgScore, strengths, risks, analysisTrait, riskTolerance, structure)
  };
};

const generateExecutiveSummary = (candidateName, avgScore, strengths, risks, ownership, collaboration, action, analysis, riskTolerance, structure) => {
  const strengthCount = strengths.length;
  const riskCount = risks.length;
  
  let summary = `**Executive Summary**\n\n`;
  
  if (avgScore >= 70) {
    summary += `This profile reflects a strong performer with clear strengths in ${strengths.map(s => s.name.toLowerCase()).join(', ')}. `;
  } else if (avgScore >= 50) {
    summary += `This profile reflects a moderate but uneven performer. `;
    
    if (ownership.percentage >= 70 || action.percentage >= 70) {
      summary += `The candidate shows strong initiative and drive, `;
    }
    if (collaboration.percentage >= 70) {
      summary += `good teamwork orientation, `;
    }
    if (analysis.percentage >= 70) {
      summary += `strong analytical capabilities, `;
    }
    
    if (riskCount >= 3) {
      summary += `but significant weaknesses in `;
      const riskNames = risks.slice(0,3).map(r => {
        if (r.name.includes('Structure')) return 'process discipline';
        if (r.name.includes('Risk')) return 'risk management';
        if (r.name.includes('Analysis')) return 'analytical depth';
        if (r.name.includes('Action')) return 'decisiveness';
        if (r.name.includes('Collaboration')) return 'teamwork';
        if (r.name.includes('Ownership')) return 'accountability';
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

const generatePersonalityStructure = (ownership, collaboration, action, analysisTrait, riskTolerance, structure) => {
  let analysis = `🧠 **Personality Structure Interpretation**\n\n`;
  analysis += `This is an interesting contrast profile:\n\n`;
  analysis += `• ${ownership.percentage >= 70 ? 'High' : ownership.percentage >= 50 ? 'Moderate' : 'Low'} Ownership (${ownership.percentage}%)\n`;
  analysis += `• ${collaboration.percentage >= 70 ? 'High' : collaboration.percentage >= 50 ? 'Moderate' : 'Low'} Collaboration (${collaboration.percentage}%)\n`;
  analysis += `• ${action.percentage >= 70 ? 'High' : action.percentage >= 50 ? 'Moderate' : 'Low'} Action (${action.percentage}%)\n`;
  analysis += `• ${analysisTrait.percentage >= 70 ? 'High' : analysisTrait.percentage >= 50 ? 'Moderate' : 'Low'} Analysis (${analysisTrait.percentage}%)\n`;
  analysis += `• ${riskTolerance.percentage >= 70 ? 'High' : riskTolerance.percentage >= 50 ? 'Moderate' : 'Low'} Risk Tolerance (${riskTolerance.percentage}%)\n`;
  analysis += `• ${structure.percentage >= 70 ? 'High' : structure.percentage >= 50 ? 'Moderate' : 'Low'} Structure (${structure.percentage}%)\n\n`;

  // Driver profile: High Action + High Risk Tolerance
  if (action.percentage >= 70 && riskTolerance.percentage >= 60) {
    analysis += `This describes a Driver profile:\n\n`;
    analysis += `• Makes quick decisions\n`;
    analysis += `• Takes calculated risks\n`;
    analysis += `• Thrives in fast-paced environments\n`;
    analysis += `• May need to balance speed with thoroughness\n\n`;
  }
  
  // Stabilizer profile: High Collaboration + High Structure
  else if (collaboration.percentage >= 70 && structure.percentage >= 60) {
    analysis += `This describes a Stabilizer profile:\n\n`;
    analysis += `• Builds consensus and maintains harmony\n`;
    analysis += `• Follows processes reliably\n`;
    analysis += `• Provides stability to teams\n`;
    analysis += `• May need encouragement for innovation\n\n`;
  }
  
  // Analyst profile: High Analysis + High Structure
  else if (analysisTrait.percentage >= 70 && structure.percentage >= 60) {
    analysis += `This describes an Analyst profile:\n\n`;
    analysis += `• Thorough and data-driven\n`;
    analysis += `• Plans carefully before acting\n`;
    analysis += `• Values accuracy and quality\n`;
    analysis += `• May need support for quick decisions\n\n`;
  }
  
  // Leader profile: High Ownership + High Action
  else if (ownership.percentage >= 70 && action.percentage >= 60) {
    analysis += `This describes a Leader profile:\n\n`;
    analysis += `• Takes initiative and drives results\n`;
    analysis += `• Owns outcomes and follows through\n`;
    analysis += `• Sets direction for others\n`;
    analysis += `• Ready for increased responsibility\n\n`;
  }
  
  // Balanced profile
  else {
    analysis += `This profile shows a balanced approach, with moderate expression across most traits. `;
    analysis += `The candidate can adapt their style based on situation but may not have a dominant natural mode. `;
  }

  return analysis;
};

const generateRoleSuitability = (strengths, risks, ownership, collaboration, action, analysis, riskTolerance, structure) => {
  const strengthNames = strengths.map(s => s.name);
  const riskNames = risks.map(r => r.name);
  
  let analysisText = `🎯 **Role Suitability**\n\n`;
  
  // Suitable For
  analysisText += `**Suitable For:**\n\n`;
  
  if (strengthNames.includes('Ownership') || strengthNames.includes('Action')) {
    analysisText += `• Roles requiring initiative and accountability\n`;
    analysisText += `• Leadership or lead contributor positions\n`;
    analysisText += `• Project management and ownership roles\n`;
  }
  
  if (strengthNames.includes('Collaboration')) {
    analysisText += `• Team-based and collaborative environments\n`;
    analysisText += `• Client-facing or stakeholder management roles\n`;
    analysisText += `• Cross-functional initiatives\n`;
  }
  
  if (strengthNames.includes('Analysis') || strengthNames.includes('Structure')) {
    analysisText += `• Analytical and process-driven roles\n`;
    analysisText += `• Quality assurance and compliance positions\n`;
    analysisText += `• Strategic planning and research roles\n`;
  }
  
  if (strengthNames.includes('Risk Tolerance')) {
    analysisText += `• Innovation and experimentation roles\n`;
    analysisText += `• Research and development positions\n`;
    analysisText += `• Agile or startup environments\n`;
  }
  
  if (analysisText.endsWith('**Suitable For:**\n\n')) {
    analysisText += `• Entry-level positions with clear guidance\n`;
    analysisText += `• Structured environments with close supervision\n`;
  }
  
  analysisText += `\n**Risky For:**\n\n`;
  
  if (riskNames.includes('Ownership')) {
    analysisText += `• Roles requiring high independence\n`;
    analysisText += `• Positions with ambiguous expectations\n`;
  }
  if (riskNames.includes('Collaboration')) {
    analysisText += `• Heavy team-dependent roles\n`;
    analysisText += `• Client-facing positions\n`;
  }
  if (riskNames.includes('Action')) {
    analysisText += `• Fast-paced, time-sensitive roles\n`;
    analysisText += `• Crisis management positions\n`;
  }
  if (riskNames.includes('Analysis')) {
    analysisText += `• Strategic decision-making roles\n`;
    analysisText += `• Complex problem-solving positions\n`;
  }
  if (riskNames.includes('Risk Tolerance')) {
    analysisText += `• Innovation and experimentation roles\n`;
    analysisText += `• High-uncertainty environments\n`;
  }
  if (riskNames.includes('Structure')) {
    analysisText += `• Quality-critical roles\n`;
    analysisText += `• Process-dependent positions\n`;
  }
  
  if (analysisText.endsWith('**Risky For:**\n\n')) {
    analysisText += `• No significant role risks identified\n`;
  }

  return analysisText;
};

const generateDevelopmentPriorities = (risks, moderate) => {
  const priorities = [...risks, ...moderate].sort((a, b) => a.percentage - b.percentage).slice(0, 4);
  
  if (priorities.length === 0) return '';

  let analysis = `📈 **Development Priorities**\n\n`;
  
  priorities.forEach((item, index) => {
    const priorityNumber = index + 1;
    const priorityEmoji = getPriorityEmoji(item.name);
    analysis += `${priorityNumber}️⃣ **${priorityEmoji}**\n\n`;
    analysis += `${getDevelopmentRecommendation(item.name)}\n\n`;
  });

  return analysis;
};

const generateOverallInterpretation = (candidateName, avgScore, strengths, risks, analysisTrait, riskTolerance, structure) => {
  const riskCount = risks.length;
  const hasAnalysisIssue = analysisTrait.percentage < 50;
  const hasStructureIssue = structure.percentage < 50;
  const hasRiskIssue = riskTolerance.percentage < 40;
  
  let analysisText = `📌 **Overall Interpretation**\n\n`;
  
  if (avgScore >= 70) {
    analysisText += `This is a capable individual with clear strengths and manageable development areas. `;
  } else if (avgScore >= 50) {
    if (hasAnalysisIssue && hasStructureIssue) {
      analysisText += `This is a motivated individual with moderate discipline but weak analytical structure and process orientation. `;
      analysisText += `The candidate has growth potential but requires structured development before handling complex analytical or quality-critical roles. `;
    } else if (hasRiskIssue) {
      analysisText += `This candidate shows caution that may limit innovation and adaptability. `;
      analysisText += `With targeted development in risk tolerance and innovation mindset, they can expand their capabilities. `;
    } else if (riskCount >= 3) {
      analysisText += `This candidate has potential but requires significant development in key areas. `;
    } else {
      analysisText += `This candidate has growth potential with targeted development in key areas. `;
    }
  } else {
    analysisText += `This candidate requires significant development across multiple areas before being ready for increased responsibility. `;
  }
  
  return analysisText;
};

// ============================================
// HELPER FUNCTIONS (UPDATED)
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

const getPriorityEmoji = (name) => {
  const priorities = {
    'Ownership': 'Accountability Building',
    'Collaboration': 'Teamwork Development',
    'Action': 'Decisiveness Training',
    'Analysis': 'Analytical Skills',
    'Risk Tolerance': 'Innovation Mindset',
    'Structure': 'Process Discipline'
  };
  return priorities[name] || 'Development Priority';
};

const getStrengthNarrative = (name, percentage) => {
  const narratives = {
    'Ownership': 'Strong accountability and follow-through. Takes initiative and owns outcomes.',
    'Collaboration': 'Excellent team player. Builds consensus and supports collective success.',
    'Action': 'Decisive and proactive. Moves quickly on priorities.',
    'Analysis': 'Strong analytical thinking. Systematic and data-driven approach.',
    'Risk Tolerance': 'Healthy comfort with uncertainty. Balances innovation with prudence.',
    'Structure': 'Strong process orientation. Follows procedures consistently.'
  };
  return narratives[name] || `Strong performance at ${percentage}%.`;
};

const getStrengthIndicators = (name) => {
  const indicators = {
    'Ownership': [
      'Takes initiative without prompting',
      'Owns mistakes and learns from them',
      'Follows through on commitments',
      'Drives results independently'
    ],
    'Collaboration': [
      'Builds strong team relationships',
      'Seeks input from others',
      'Shares credit generously',
      'Fosters psychological safety'
    ],
    'Action': [
      'Makes timely decisions',
      'Acts with urgency',
      'Takes initiative',
      'Thrives in fast-paced environments'
    ],
    'Analysis': [
      'Thorough problem analysis',
      'Data-driven decision-making',
      'Systematic approach',
      'Thinks before acting'
    ],
    'Risk Tolerance': [
      'Comfortable with uncertainty',
      'Experiments with new approaches',
      'Pushes boundaries appropriately',
      'Embraces innovation'
    ],
    'Structure': [
      'Follows procedures reliably',
      'Maintains consistent quality',
      'Organized approach',
      'Provides stability'
    ]
  };
  return indicators[name] || [];
};

const getModerateNarrative = (name) => {
  const narratives = {
    'Ownership': 'Shows reasonable accountability but may need encouragement to take initiative.',
    'Collaboration': 'Works adequately with others but may occasionally work in silos.',
    'Action': 'Acts when prompted but may hesitate without clear direction.',
    'Analysis': 'Considers basic factors but may need support for complex analysis.',
    'Risk Tolerance': 'Prefers proven approaches but can accept calculated risks with support.',
    'Structure': 'Follows processes when clear but may improvise without guidance.'
  };
  return narratives[name] || 'Shows moderate competency in this area with room for growth.';
};

const getRiskNarrative = (name, percentage) => {
  const narratives = {
    'Ownership': 'May deflect responsibility or wait for direction.',
    'Collaboration': 'May struggle with team dynamics or prefer working alone.',
    'Action': 'May delay decisions or wait for instructions.',
    'Analysis': 'May act without sufficient information or fail to consider alternatives.',
    'Risk Tolerance': 'Excessive caution may limit innovation and adaptability.',
    'Structure': 'May skip steps or improvise without considering consequences.'
  };
  return narratives[name] || 'Significant development needed in this area.';
};

const getRiskImplications = (name) => {
  const implications = {
    'Ownership': [
      'May avoid taking responsibility',
      'Needs clear direction and supervision',
      'May not follow through consistently'
    ],
    'Collaboration': [
      'May struggle to build relationships',
      'Could create team friction',
      'May not seek input from others'
    ],
    'Action': [
      'May miss opportunities due to hesitation',
      'Could delay important decisions',
      'May need prompting to act'
    ],
    'Analysis': [
      'May make decisions without sufficient data',
      'Could miss important considerations',
      'May need structured problem-solving guidance'
    ],
    'Risk Tolerance': [
      'May avoid necessary innovation',
      'Could miss opportunities for improvement',
      'May resist beneficial change'
    ],
    'Structure': [
      'May create inconsistency',
      'Could impact quality and reliability',
      'May need reinforcement of procedures'
    ]
  };
  return implications[name] || [];
};

const getDevelopmentRecommendation = (name) => {
  const recommendations = {
    'Ownership': 'Accountability coaching. Initiative training. Project ownership opportunities.',
    'Collaboration': 'Teamwork workshops. Conflict resolution training. Cross-functional project participation.',
    'Action': 'Decision-making frameworks. Time-boxed decisions. Initiative-building exercises.',
    'Analysis': 'Critical thinking training. Structured problem-solving frameworks. Data analysis courses.',
    'Risk Tolerance': 'Innovation mindset workshops. Safe experimentation environments. Calculated risk training.',
    'Structure': 'Process discipline training. Organizational systems. Quality management courses.'
  };
  return recommendations[name] || 'Targeted training and structured development in this area.';
};
