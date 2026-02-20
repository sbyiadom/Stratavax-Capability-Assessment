/**
 * Professional Narrative Interpreter
 * Generates detailed, human-like interpretations based on actual assessment scores
 */

export const generateProfessionalInterpretation = (candidateName, categoryScores) => {
  
  // Categorize areas by score
  const strongAreas = [];
  const moderateAreas = [];
  const concernAreas = [];
  const areaDetails = {};
  
  Object.entries(categoryScores).forEach(([category, data]) => {
    const percentage = data.percentage;
    const score = data.score;
    const maxPossible = data.maxPossible;
    
    const area = {
      category,
      percentage,
      score,
      maxPossible,
      grade: getGradeLetter(percentage),
      gradeDesc: getGradeDescription(percentage)
    };
    
    areaDetails[category] = area;
    
    if (percentage >= 70) {
      strongAreas.push(area);
    } else if (percentage >= 60) {
      moderateAreas.push(area);
    } else {
      concernAreas.push(area);
    }
  });

  return {
    overallProfileSummary: generateOverallProfileSummary(candidateName, strongAreas, moderateAreas, concernAreas),
    categoryBreakdown: {
      strong: strongAreas.map(area => formatStrongArea(area)),
      moderate: moderateAreas.map(area => formatModerateArea(area)),
      concerns: concernAreas.map(area => formatConcernArea(area))
    },
    hiringInterpretation: generateHiringInterpretation(strongAreas, concernAreas),
    developmentPotential: generateDevelopmentPotential(strongAreas, concernAreas),
    strategicObservation: generateStrategicObservation(concernAreas),
    finalAssessment: generateFinalAssessment(strongAreas, concernAreas)
  };
};

// Helper to get grade letter
const getGradeLetter = (percentage) => {
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

// Helper to get grade description
const getGradeDescription = (percentage) => {
  if (percentage >= 95) return 'Exceptional';
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 85) return 'Very Good';
  if (percentage >= 80) return 'Good';
  if (percentage >= 75) return 'Satisfactory';
  if (percentage >= 70) return 'Adequate';
  if (percentage >= 65) return 'Developing';
  if (percentage >= 60) return 'Basic Competency';
  if (percentage >= 55) return 'Minimum Competency';
  if (percentage >= 50) return 'Below Expectations';
  if (percentage >= 40) return 'Significant Gaps';
  return 'Unsatisfactory';
};

// Generate overall profile summary
const generateOverallProfileSummary = (candidateName, strongAreas, moderateAreas, concernAreas) => {
  const concernCount = concernAreas.length;
  const strongCount = strongAreas.length;
  
  let summary = `Overall Profile Summary\n\n`;
  summary += `This profile reflects:\n\n`;
  
  if (strongCount === 0 && concernCount >= 5) {
    summary += `Moderate intellectual capacity but broad behavioral, cultural, and leadership weaknesses.\n\n`;
    summary += `Unlike candidates with clear integrity strengths, this one shows no dominant strength area. The only relatively solid score is Cognitive Ability.\n\n`;
    summary += `This is not currently a leadership-ready profile and carries several organizational risk indicators.`;
  } else if (strongCount >= 2 && concernCount <= 3) {
    summary += `A balanced profile with clear strengths in ${strongAreas.map(s => s.category).join(', ')} and manageable development areas.\n\n`;
    summary += `This candidate has foundational strengths to build upon but needs targeted development in weaker areas.`;
  } else if (concernCount >= 6) {
    summary += `Significant development needs across multiple areas. This profile indicates several organizational risk factors.\n\n`;
    summary += `Not currently suitable for leadership or autonomous roles without intensive support.`;
  } else {
    summary += `A mixed profile with both strengths and significant development areas.\n\n`;
    summary += `Requires careful placement and structured support to succeed.`;
  }
  
  return summary;
};

// Format strong area with bullet points
const formatStrongArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  switch(category) {
    case 'Cognitive Ability':
      narrative += `• Can process information reasonably well\n`;
      narrative += `• Likely capable of learning new systems\n`;
      narrative += `• May handle structured analysis\n\n`;
      narrative += `This suggests potential capacity — but potential is not yet translating into performance or leadership readiness.`;
      break;
      
    case 'Ethics & Integrity':
      narrative += `• Very positive indicator\n`;
      narrative += `• Trustworthy and principled\n`;
      narrative += `• Low ethical risk\n`;
      narrative += `• Likely dependable\n\n`;
      narrative += `This is often a non-negotiable leadership foundation, so this is a strong asset.`;
      break;
      
    case 'Performance Metrics':
      narrative += `• Can meet targets with guidance\n`;
      narrative += `• Likely execution-focused\n`;
      narrative += `• Reasonably accountable`;
      break;
      
    case 'Leadership & Management':
      narrative += `• Shows emerging leadership capacity\n`;
      narrative += `• Can manage tasks/people at a basic level\n`;
      narrative += `• Not yet strategic or highly influential`;
      break;
      
    case 'Communication':
      narrative += `• Articulates ideas clearly\n`;
      narrative += `• Effective in most situations\n`;
      narrative += `• Can adapt message to audience`;
      break;
      
    case 'Problem-Solving':
      narrative += `• Strong analytical thinking\n`;
      narrative += `• Handles complex problems effectively\n`;
      narrative += `• Systematic approach to challenges`;
      break;
      
    case 'Emotional Intelligence':
      narrative += `• Basic awareness of people dynamics\n`;
      narrative += `• Not highly influential\n`;
      narrative += `• Likely average in conflict handling`;
      break;
      
    default:
      narrative += `Strong performance in this area. This is a valuable asset.`;
  }
  
  return narrative;
};

// Format moderate area
const formatModerateArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  switch(category) {
    case 'Emotional Intelligence':
      narrative += `• Basic awareness of people dynamics\n`;
      narrative += `• Not highly influential\n`;
      narrative += `• Likely average in conflict handling`;
      break;
      
    case 'Ethics & Integrity':
      narrative += `• This is concerning.\n`;
      narrative += `• Not a red flag, but not reassuring either\n`;
      narrative += `• May follow rules when monitored\n`;
      narrative += `• Requires structured governance`;
      break;
      
    case 'Problem-Solving':
      narrative += `• Can manage routine issues\n`;
      narrative += `• May struggle in complex or ambiguous situations`;
      break;
      
    case 'Communication':
      narrative += `• Can communicate, but not persuasive or highly clear\n`;
      narrative += `• May struggle with executive communication`;
      break;
      
    case 'Personality & Behavioral':
      narrative += `• Likely stable but not high-impact\n`;
      narrative += `• May lack drive, resilience, or adaptability`;
      break;
      
    default:
      narrative += `Shows basic competency in this area that can be developed further with targeted training.`;
  }
  
  return narrative;
};

// Format concern area
const formatConcernArea = (area) => {
  const { category, percentage, grade, gradeDesc } = area;
  
  let narrative = `${category} – ${percentage}% (${grade} | ${gradeDesc})\n\n`;
  
  switch(category) {
    case 'Communication':
      narrative += `• Difficulty articulating ideas clearly\n`;
      narrative += `• Likely struggles in stakeholder engagement\n`;
      narrative += `• Weak executive presence`;
      break;
      
    case 'Cultural & Attitudinal Fit':
      narrative += `• This is a major hiring risk:\n\n`;
      narrative += `• Misalignment with company values\n`;
      narrative += `• Possible attitude or engagement issues\n`;
      narrative += `• May disrupt team cohesion`;
      break;
      
    case 'Leadership & Management':
      narrative += `• Not ready for supervisory responsibility\n`;
      narrative += `• Weak influence and delegation capacity\n`;
      narrative += `• Likely reactive rather than strategic`;
      break;
      
    case 'Personality & Behavioral':
      narrative += `• Possible low drive, resilience, or adaptability\n`;
      narrative += `• May struggle under pressure`;
      break;
      
    case 'Performance Metrics':
      narrative += `• Inconsistent execution\n`;
      narrative += `• May require close supervision`;
      break;
      
    case 'Technical & Manufacturing':
      narrative += `• Functional but not strong\n`;
      narrative += `• Would require training`;
      break;
      
    case 'Cognitive Ability':
      narrative += `• This is a major flag. It may indicate:\n\n`;
      narrative += `• Difficulty processing complex information\n`;
      narrative += `• Slow learning curve\n`;
      narrative += `• Limited analytical capacity`;
      break;
      
    case 'Emotional Intelligence':
      narrative += `• May struggle with self-awareness\n`;
      narrative += `• Limited conflict management skills\n`;
      narrative += `• Risk of poor team dynamics`;
      break;
      
    case 'Ethics & Integrity':
      narrative += `• Significant ethical concerns\n`;
      narrative += `• Requires clear boundaries and supervision\n`;
      narrative += `• Risk area needing immediate attention`;
      break;
      
    default:
      narrative += `Significant gaps in this area requiring immediate attention and structured development.`;
  }
  
  return narrative;
};

// Generate hiring interpretation
const generateHiringInterpretation = (strongAreas, concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  const strongNames = strongAreas.map(s => s.category);
  
  let interpretation = `🎯 Interpretation for Hiring Decisions\n\n`;
  
  // Check for leadership suitability
  const hasLeadershipIssues = concernNames.includes('Leadership & Management');
  const hasCulturalIssues = concernNames.includes('Cultural & Attitudinal Fit');
  const hasCommunicationIssues = concernNames.includes('Communication');
  const hasIntegrityIssues = concernNames.includes('Ethics & Integrity');
  
  if (hasLeadershipIssues || hasCulturalIssues || hasCommunicationIssues || hasIntegrityIssues) {
    interpretation += `If This Is for a Leadership Role:\n\n`;
    interpretation += `I would not recommend hire at this stage.\n\n`;
    interpretation += `Reasons:\n\n`;
    
    if (hasLeadershipIssues) interpretation += `• Leadership & Management very low\n`;
    if (hasCulturalIssues) interpretation += `• Cultural Fit very low\n`;
    if (hasCommunicationIssues) interpretation += `• Communication weak\n`;
    if (hasIntegrityIssues) interpretation += `• Integrity only minimum level\n\n`;
    
    interpretation += `That combination predicts:\n\n`;
    interpretation += `• Team friction\n`;
    interpretation += `• Poor performance sustainability\n`;
    interpretation += `• High supervision dependency\n\n`;
  }
  
  interpretation += `If This Is for an Entry-Level / Structured Role:\n\n`;
  interpretation += `Possible — but only if:\n\n`;
  interpretation += `• Clear SOP environment\n`;
  interpretation += `• Strong oversight\n`;
  interpretation += `• Low autonomy\n`;
  interpretation += `• Limited people-management responsibility`;
  
  return interpretation;
};

// Generate development potential
const generateDevelopmentPotential = (strongAreas, concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  const strongNames = strongAreas.map(s => s.category);
  
  let potential = `📈 Development Potential?\n\n`;
  
  const hasCognitiveStrength = strongNames.includes('Cognitive Ability') || 
                              (strongAreas.find(s => s.category === 'Cognitive Ability')?.percentage >= 65);
  
  const hasEIStrength = strongNames.includes('Emotional Intelligence') || 
                       (strongAreas.find(s => s.category === 'Emotional Intelligence')?.percentage >= 60);
  
  if (hasCognitiveStrength) {
    potential += `There is some upside because:\n\n`;
    potential += `• Cognitive ability is decent\n`;
    if (hasEIStrength) potential += `• Emotional intelligence is not severely low\n\n`;
    
    potential += `However, development would need to focus on:\n\n`;
    
    if (concernNames.includes('Communication')) potential += `• Communication skills\n`;
    if (concernNames.includes('Cultural & Attitudinal Fit')) potential += `• Attitude & culture alignment\n`;
    if (concernNames.includes('Performance Metrics')) potential += `• Accountability & execution discipline\n`;
    if (concernNames.includes('Leadership & Management')) potential += `• Leadership fundamentals\n`;
  } else {
    potential += `Limited development upside given the pattern of scores. Significant intervention would be required.`;
  }
  
  return potential;
};

// Generate strategic observation
const generateStrategicObservation = (concernAreas) => {
  const concernNames = concernAreas.map(c => c.category);
  
  let observation = `🧠 Strategic Observation (Important)\n\n`;
  
  const hasIntegrityIssues = concernNames.includes('Ethics & Integrity');
  const hasLeadershipIssues = concernNames.includes('Leadership & Management');
  const hasCulturalIssues = concernNames.includes('Cultural & Attitudinal Fit');
  
  observation += `Compared to other profiles:\n\n`;
  observation += `This candidate has ${!hasIntegrityIssues ? 'stronger' : 'weaker'} integrity, `;
  observation += `${!hasLeadershipIssues ? 'stronger' : 'weaker'} leadership, and `;
  observation += `${!hasCulturalIssues ? 'stronger' : 'weaker'} cultural fit.\n\n`;
  
  observation += `Between candidates:\n\n`;
  observation += `• Some candidates = Safer but limited\n`;
  observation += `• This candidate = ${hasCognitiveStrength ? 'Higher mental capacity but higher risk' : 'Balanced risk profile'}`;
  
  return observation;
};

// Generate final assessment
const generateFinalAssessment = (strongAreas, concernAreas) => {
  const concernCount = concernAreas.length;
  const strongCount = strongAreas.length;
  
  let assessment = `📌 Final Assessment Summary\n\n`;
  
  if (strongCount === 0 && concernCount >= 5) {
    assessment += `Intellectually capable but behaviorally and culturally underdeveloped. Not leadership-ready. Requires structured environment and development support.`;
  } else if (strongCount >= 2 && concernCount <= 3) {
    assessment += `Balanced profile with identifiable strengths and clear development paths. Suitable for growth-oriented roles with proper support.`;
  } else if (concernCount >= 6) {
    assessment += `Significant development needed across multiple areas. Best suited for entry-level positions with close supervision and clear guidance.`;
  } else {
    assessment += `Mixed profile requiring careful placement and targeted development support.`;
  }
  
  return assessment;
};
