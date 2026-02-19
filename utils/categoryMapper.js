/**
 * Focused Category Mapper
 * Provides professional interpretations based on actual category scores
 */

// Score thresholds for interpretation
const THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 70,
  AVERAGE: 60,
  BELOW_AVERAGE: 50
};

// Get level based on score
const getLevel = (score) => {
  if (score >= THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= THRESHOLDS.GOOD) return 'good';
  if (score >= THRESHOLDS.AVERAGE) return 'average';
  if (score >= THRESHOLDS.BELOW_AVERAGE) return 'below_average';
  return 'poor';
};

// Category interpretations by assessment type
const categoryInterpretations = {
  // General Assessment Categories
  'Cognitive Ability': {
    excellent: 'Strong analytical and strategic thinking capabilities. Can handle complex problems effectively.',
    good: 'Good cognitive abilities. Handles most challenges well with occasional support.',
    average: 'Moderate cognitive abilities. Benefits from structured approaches to complex problems.',
    below_average: 'Cognitive abilities need development. May struggle with complex problem-solving.',
    poor: 'Significant cognitive gaps. Requires clear guidance and simplified tasks.'
  },
  'Communication': {
    excellent: 'Exceptional communicator. Articulates ideas clearly and persuasively.',
    good: 'Good communication skills. Expresses ideas effectively in most situations.',
    average: 'Adequate communication. Can convey basic ideas but may struggle with complex messaging.',
    below_average: 'Communication needs improvement. May have difficulty expressing ideas clearly.',
    poor: 'Poor communication skills. Significant development needed.'
  },
  'Cultural & Attitudinal Fit': {
    excellent: 'Strong cultural alignment. Embodies company values and enhances team dynamics.',
    good: 'Good cultural fit. Generally aligned with organizational values.',
    average: 'Moderate cultural alignment. Some areas may need attention.',
    below_average: 'Cultural fit concerns. May not fully align with company values.',
    poor: 'Poor cultural fit. Significant misalignment with organizational culture.'
  },
  'Emotional Intelligence': {
    excellent: 'High emotional intelligence. Self-aware, empathetic, and skilled at managing relationships.',
    good: 'Good emotional awareness. Navigates interpersonal situations well.',
    average: 'Moderate emotional intelligence. May struggle with complex interpersonal dynamics.',
    below_average: 'Emotional intelligence needs development. Challenges with self-awareness and empathy.',
    poor: 'Poor emotional intelligence. Significant interpersonal challenges.'
  },
  'Ethics & Integrity': {
    excellent: 'Strong ethical foundation. Trustworthy and principled decision-maker.',
    good: 'Good integrity. Generally makes ethical choices with sound judgment.',
    average: 'Adequate ethical awareness. May need guidance in complex situations.',
    below_average: 'Ethical concerns. Requires clear boundaries and supervision.',
    poor: 'Poor ethical judgment. Significant risk area.'
  },
  'Leadership & Management': {
    excellent: 'Strong leadership potential. Strategic thinker who inspires and develops others.',
    good: 'Good leadership capabilities. Can manage teams and drive results effectively.',
    average: 'Moderate leadership skills. May need support in people management.',
    below_average: 'Leadership needs development. Challenges with team management.',
    poor: 'Poor leadership potential. Not ready for management roles.'
  },
  'Performance Metrics': {
    excellent: 'Results-driven with strong accountability. Sets and achieves challenging goals.',
    good: 'Good performance orientation. Meets targets and tracks progress effectively.',
    average: 'Adequate focus on results. May need guidance in goal setting.',
    below_average: 'Performance focus needs improvement. Challenges with accountability.',
    poor: 'Poor results orientation. Significant gaps in performance management.'
  },
  'Personality & Behavioral': {
    excellent: 'Stable, resilient, and adaptable. Positive work patterns.',
    good: 'Good behavioral profile. Generally stable and reliable.',
    average: 'Moderate behavioral patterns. May have some inconsistencies.',
    below_average: 'Behavioral concerns. May lack resilience or adaptability.',
    poor: 'Poor behavioral profile. Significant concerns needing attention.'
  },
  'Problem-Solving': {
    excellent: 'Excellent problem-solver. Systematic, creative, and effective.',
    good: 'Good problem-solving skills. Handles most challenges effectively.',
    average: 'Moderate problem-solving. May need support with complex issues.',
    below_average: 'Problem-solving needs development. Struggles with analysis.',
    poor: 'Poor problem-solving. Significant difficulties with challenges.'
  },
  'Technical & Manufacturing': {
    excellent: 'Strong technical expertise. Deep understanding of systems and processes.',
    good: 'Good technical knowledge. Handles most technical tasks effectively.',
    average: 'Moderate technical skills. May need training in advanced areas.',
    below_average: 'Technical knowledge needs development. Requires training.',
    poor: 'Poor technical expertise. Significant knowledge gaps.'
  },

  // Leadership Assessment Categories
  'Change Leadership & Agility': {
    excellent: 'Exceptional change leader. Drives transformation and adapts quickly.',
    good: 'Good at managing change. Adapts well to new situations.',
    average: 'Moderate change agility. May need support during transitions.',
    below_average: 'Change management needs development. Struggles with adaptation.',
    poor: 'Poor change agility. Resists or struggles with change.'
  },
  'Communication & Influence': {
    excellent: 'Powerful communicator who influences effectively at all levels.',
    good: 'Good communicator with developing influence skills.',
    average: 'Adequate communication. May struggle with persuasion.',
    below_average: 'Communication needs improvement. Limited influence.',
    poor: 'Poor communication and influence skills.'
  },
  'Cultural Alignment': {
    excellent: 'Strong cultural ambassador. Models and reinforces values.',
    good: 'Good cultural alignment. Generally embodies company values.',
    average: 'Moderate cultural fit. Some areas of misalignment.',
    below_average: 'Cultural concerns. May not fully align with values.',
    poor: 'Poor cultural fit. Significant misalignment.'
  },
  'Cultural Competence & Inclusivity': {
    excellent: 'Champions diversity and inclusion. Creates inclusive environments.',
    good: 'Good cultural competence. Values diversity and inclusion.',
    average: 'Moderate awareness of diversity issues. Needs development.',
    below_average: 'Limited cultural competence. May need training.',
    poor: 'Poor cultural competence. Concerns in this area.'
  },
  'Decision-Making & Problem-Solving': {
    excellent: 'Decisive and analytical. Makes sound judgments consistently.',
    good: 'Good decision-maker. Handles most decisions effectively.',
    average: 'Moderate decision-making. May need support with complex choices.',
    below_average: 'Decision-making needs improvement. Struggles with analysis.',
    poor: 'Poor decision-making. Significant concerns.'
  },
  'Derailer Identification': {
    excellent: 'Highly self-aware. Recognizes and manages potential derailers.',
    good: 'Good self-awareness. Aware of most derailers.',
    average: 'Moderate awareness. May miss some derailers.',
    below_average: 'Limited self-awareness. Derailer risk.',
    poor: 'Poor self-awareness. Significant derailer concerns.'
  },
  'Empathy & Relationship Building': {
    excellent: 'Builds strong, trusting relationships. Highly empathetic.',
    good: 'Good relationship builder. Connects well with others.',
    average: 'Moderate relationship skills. May need development.',
    below_average: 'Relationship building needs improvement.',
    poor: 'Poor relationship skills. Difficulty connecting with others.'
  },
  'Execution & Results Orientation': {
    excellent: 'Drives results with disciplined execution. Highly accountable.',
    good: 'Good execution focus. Delivers results consistently.',
    average: 'Moderate execution. May need help with follow-through.',
    below_average: 'Execution needs improvement. Inconsistent results.',
    poor: 'Poor execution. Significant accountability concerns.'
  },
  'Integrated Leadership Judgment': {
    excellent: 'Exceptional judgment. Balances multiple factors effectively.',
    good: 'Good judgment. Makes sound decisions in most situations.',
    average: 'Moderate judgment. May need support in complex scenarios.',
    below_average: 'Judgment concerns. Needs development.',
    poor: 'Poor judgment. Significant concerns.'
  },
  'Learning Agility': {
    excellent: 'Rapid learner. Adapts quickly to new situations.',
    good: 'Good learning agility. Picks up new concepts well.',
    average: 'Moderate learning pace. Needs time to master new areas.',
    below_average: 'Learning agility needs development. Slow to adapt.',
    poor: 'Poor learning agility. Difficulty acquiring new skills.'
  },
  'People Management & Coaching': {
    excellent: 'Develops and coaches others effectively. Strong people manager.',
    good: 'Good people manager. Supports team development.',
    average: 'Moderate people skills. Needs development in coaching.',
    below_average: 'People management needs improvement.',
    poor: 'Poor people management. Significant concerns.'
  },
  'Resilience & Stress Management': {
    excellent: 'Highly resilient. Thrives under pressure.',
    good: 'Good stress management. Handles pressure well.',
    average: 'Moderate resilience. May struggle under intense pressure.',
    below_average: 'Stress management needs improvement.',
    poor: 'Poor resilience. Significant concerns.'
  },
  'Role Readiness': {
    excellent: 'Ready for increased responsibility now.',
    good: 'Ready with some development support.',
    average: 'Needs more experience before advancement.',
    below_average: 'Significant development needed before ready.',
    poor: 'Not ready for advancement at this time.'
  },
  'Self-Awareness & Self-Regulation': {
    excellent: 'Highly self-aware and well-regulated.',
    good: 'Good self-awareness. Regulates well.',
    average: 'Moderate self-awareness. May have blind spots.',
    below_average: 'Limited self-awareness. Needs development.',
    poor: 'Poor self-awareness. Significant concerns.'
  },
  'Values & Drivers': {
    excellent: 'Strong values alignment. Highly motivated by purpose.',
    good: 'Good values alignment. Appropriately motivated.',
    average: 'Moderate alignment. May have some conflicts.',
    below_average: 'Values misalignment concerns.',
    poor: 'Poor values alignment. Significant concerns.'
  },
  'Vision & Strategic Thinking': {
    excellent: 'Strategic thinker with compelling vision.',
    good: 'Good strategic thinking. Sees the big picture.',
    average: 'Moderate strategic ability. Needs development.',
    below_average: 'Limited strategic thinking. Tactical focus.',
    poor: 'Poor strategic thinking. Significant concerns.'
  },

  // Cognitive Assessment Categories
  'Logical / Abstract Reasoning': {
    excellent: 'Strong logical reasoning. Excellent pattern recognition.',
    good: 'Good logical reasoning. Handles abstract concepts well.',
    average: 'Moderate logical skills. May need support with complex logic.',
    below_average: 'Logical reasoning needs development.',
    poor: 'Poor logical reasoning. Significant concerns.'
  },
  'Mechanical Reasoning': {
    excellent: 'Strong mechanical understanding. Natural aptitude.',
    good: 'Good mechanical reasoning. Understands mechanical concepts.',
    average: 'Moderate mechanical skills. Needs development.',
    below_average: 'Mechanical reasoning needs improvement.',
    poor: 'Poor mechanical reasoning. Significant gaps.'
  },
  'Memory & Attention': {
    excellent: 'Excellent memory and attention to detail.',
    good: 'Good memory and focus. Attentive to details.',
    average: 'Moderate memory. May miss some details.',
    below_average: 'Memory and attention need improvement.',
    poor: 'Poor memory and attention. Significant concerns.'
  },
  'Numerical Reasoning': {
    excellent: 'Strong numerical reasoning. Comfortable with data.',
    good: 'Good numerical skills. Handles numbers well.',
    average: 'Moderate numerical ability. Needs support with complex math.',
    below_average: 'Numerical reasoning needs development.',
    poor: 'Poor numerical reasoning. Significant gaps.'
  },
  'Perceptual Speed & Accuracy': {
    excellent: 'Fast and accurate. Excellent attention.',
    good: 'Good speed and accuracy. Reliable.',
    average: 'Moderate speed. May need more time.',
    below_average: 'Speed and accuracy need improvement.',
    poor: 'Poor perceptual skills. Significant concerns.'
  },
  'Spatial Reasoning': {
    excellent: 'Strong spatial reasoning. Visualizes well.',
    good: 'Good spatial skills. Handles spatial tasks well.',
    average: 'Moderate spatial ability. Needs development.',
    below_average: 'Spatial reasoning needs improvement.',
    poor: 'Poor spatial reasoning. Significant gaps.'
  },
  'Verbal Reasoning': {
    excellent: 'Strong verbal reasoning. Excellent comprehension.',
    good: 'Good verbal skills. Understands language well.',
    average: 'Moderate verbal ability. May need support.',
    below_average: 'Verbal reasoning needs development.',
    poor: 'Poor verbal reasoning. Significant concerns.'
  },

  // Technical Assessment Categories
  'CIP & Maintenance': {
    excellent: 'Strong CIP and maintenance expertise.',
    good: 'Good understanding of CIP processes.',
    average: 'Moderate CIP knowledge. Needs training.',
    below_average: 'CIP knowledge needs development.',
    poor: 'Poor CIP understanding. Significant gaps.'
  },
  'Conveyors & Line Efficiency': {
    excellent: 'Expert in conveyor systems and line efficiency.',
    good: 'Good understanding of line operations.',
    average: 'Moderate conveyor knowledge. Needs training.',
    below_average: 'Conveyor knowledge needs improvement.',
    poor: 'Poor understanding. Significant gaps.'
  },
  'Filling & Bottling': {
    excellent: 'Expert in filling and bottling processes.',
    good: 'Good understanding of filling operations.',
    average: 'Moderate filling knowledge. Needs training.',
    below_average: 'Filling knowledge needs development.',
    poor: 'Poor understanding. Significant gaps.'
  },
  'Packaging & Labeling': {
    excellent: 'Strong packaging and labeling expertise.',
    good: 'Good understanding of packaging.',
    average: 'Moderate packaging knowledge. Needs training.',
    below_average: 'Packaging knowledge needs improvement.',
    poor: 'Poor understanding. Significant gaps.'
  },
  'Safety & Efficiency': {
    excellent: 'Strong safety focus and efficiency mindset.',
    good: 'Good safety awareness. Understands efficiency.',
    average: 'Moderate safety knowledge. Needs training.',
    below_average: 'Safety knowledge needs development.',
    poor: 'Poor safety understanding. Significant concerns.'
  },
  'Water Treatment & Quality': {
    excellent: 'Expert in water treatment and quality control.',
    good: 'Good understanding of water quality.',
    average: 'Moderate water treatment knowledge. Needs training.',
    below_average: 'Water treatment knowledge needs improvement.',
    poor: 'Poor understanding. Significant gaps.'
  },

  // Performance Assessment Categories
  'Employee Engagement and Behavior': {
    excellent: 'Strong at engaging and motivating teams.',
    good: 'Good understanding of engagement.',
    average: 'Moderate engagement skills. Needs development.',
    below_average: 'Engagement skills need improvement.',
    poor: 'Poor engagement skills. Significant concerns.'
  },
  'Financial and Operational Performance': {
    excellent: 'Strong financial and operational understanding.',
    good: 'Good business acumen. Understands operations.',
    average: 'Moderate financial knowledge. Needs development.',
    below_average: 'Financial knowledge needs improvement.',
    poor: 'Poor financial understanding. Significant gaps.'
  },
  'Goal Achievement and Strategic Alignment': {
    excellent: 'Excellent at goal setting and strategic alignment.',
    good: 'Good understanding of goals and alignment.',
    average: 'Moderate goal achievement. Needs support.',
    below_average: 'Goal achievement needs improvement.',
    poor: 'Poor goal orientation. Significant concerns.'
  },
  'Productivity and Efficiency': {
    excellent: 'Highly productive and efficiency-focused.',
    good: 'Good productivity. Understands efficiency.',
    average: 'Moderate productivity. Needs improvement.',
    below_average: 'Productivity needs development.',
    poor: 'Poor productivity. Significant concerns.'
  },
  'Work Quality and Effectiveness': {
    excellent: 'Consistently high-quality work.',
    good: 'Good work quality. Reliable.',
    average: 'Moderate quality. May need improvement.',
    below_average: 'Work quality needs development.',
    poor: 'Poor quality. Significant concerns.'
  },

  // Cultural Assessment Categories
  'Attitude': {
    excellent: 'Positive attitude. Highly motivated and adaptable.',
    good: 'Good attitude. Generally positive and willing.',
    average: 'Moderate attitude. May have occasional concerns.',
    below_average: 'Attitude concerns. Needs development.',
    poor: 'Poor attitude. Significant concerns.'
  },
  'Core Values': {
    excellent: 'Strong values alignment. Principled and consistent.',
    good: 'Good values alignment. Generally aligned.',
    average: 'Moderate alignment. May have some conflicts.',
    below_average: 'Values misalignment concerns.',
    poor: 'Poor values alignment. Significant concerns.'
  },
  'Environmental Fit': {
    excellent: 'Excellent environmental fit. Thrives in the setting.',
    good: 'Good fit with environment. Comfortable.',
    average: 'Moderate fit. May need adjustment.',
    below_average: 'Environmental mismatch concerns.',
    poor: 'Poor environmental fit. Significant concerns.'
  },
  'Interpersonal': {
    excellent: 'Strong interpersonal skills. Builds relationships well.',
    good: 'Good interpersonal skills. Works well with others.',
    average: 'Moderate interpersonal skills. May need development.',
    below_average: 'Interpersonal skills need improvement.',
    poor: 'Poor interpersonal skills. Significant concerns.'
  },
  'Leadership': {
    excellent: 'Strong leadership potential. Inspires others.',
    good: 'Good leadership capabilities. Guides teams well.',
    average: 'Moderate leadership skills. Needs development.',
    below_average: 'Leadership needs improvement.',
    poor: 'Poor leadership. Significant concerns.'
  },
  'Work Style': {
    excellent: 'Effective work style. Adaptable and productive.',
    good: 'Good work habits. Reliable and consistent.',
    average: 'Moderate work style. May need adjustment.',
    below_average: 'Work style concerns. Needs improvement.',
    poor: 'Poor work style. Significant concerns.'
  }
};

// Generate overall profile summary based on scores
const getProfileSummary = (scores) => {
  const values = Object.values(scores);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const excellent = values.filter(s => s >= 80).length;
  const poor = values.filter(s => s < 50).length;

  if (excellent >= 5 && poor === 0) {
    return {
      type: 'High-Performer',
      description: 'This candidate demonstrates strong overall capability with consistent performance across most areas. Ready for challenging roles and increased responsibility.'
    };
  } else if (excellent >= 3 && poor <= 1) {
    return {
      type: 'Solid Performer',
      description: 'This candidate shows solid performance with clear strengths and manageable development areas. Good potential for growth.'
    };
  } else if (avg >= 60 && poor <= 2) {
    return {
      type: 'Developing Performer',
      description: 'This candidate has foundational skills with identified development areas. Requires targeted support to reach full potential.'
    };
  } else if (poor >= 3) {
    return {
      type: 'Development Priority',
      description: 'This candidate has significant development needs across multiple areas. Requires intensive support and structured training.'
    };
  } else {
    return {
      type: 'Balanced Profile',
      description: 'This candidate shows a mix of strengths and development areas. Suitable for structured roles with supervision.'
    };
  }
};

// Generate suitability and risks
const getSuitabilityAndRisks = (scores) => {
  const suitability = [];
  const risks = [];
  
  const leadership = scores['Leadership & Management'] || 0;
  const cognitive = scores['Cognitive Ability'] || 0;
  const technical = scores['Technical & Manufacturing'] || 0;
  const cultural = scores['Cultural & Attitudinal Fit'] || 0;
  const ei = scores['Emotional Intelligence'] || 0;
  const communication = scores['Communication'] || 0;

  // Suitability based on strengths
  if (leadership >= 70 && cognitive >= 70 && ei >= 60) {
    suitability.push('Good fit for leadership or management roles');
  }
  if (technical >= 70) {
    suitability.push('Well-suited for technical or specialist positions');
  }
  if (communication >= 70) {
    suitability.push('Effective in client-facing or collaborative roles');
  }
  if (leadership >= 60 && cognitive >= 60) {
    suitability.push('Suitable for team lead or supervisory positions');
  }
  if (technical >= 60 && cultural >= 60) {
    suitability.push('Good fit for operational roles in structured environments');
  }

  // Risks based on weaknesses
  if (cognitive < 50) {
    risks.push('Limited cognitive capacity may impact complex problem-solving');
  }
  if (ei < 50) {
    risks.push('Emotional intelligence concerns may affect team dynamics');
  }
  if (cultural < 50) {
    risks.push('Cultural fit concerns - may not align with company values');
  }
  if (leadership < 50) {
    risks.push('Limited leadership potential - may not suit management roles');
  }
  if (technical < 50 && cognitive < 50) {
    risks.push('Significant development needed for technical or analytical roles');
  }

  return { suitability, risks };
};

// Main interpretation generator
export const generateUniversalInterpretation = (assessmentType, candidateName, scores, strengths, weaknesses, overallPercentage) => {
  
  // Generate category interpretations
  const categoryInterpretation = {};
  Object.entries(scores).forEach(([category, score]) => {
    const level = getLevel(score);
    const interpretation = categoryInterpretations[category]?.[level] || 
      `${category}: ${score}% - ${level.replace('_', ' ')} performance.`;
    
    categoryInterpretation[category] = {
      score,
      level,
      interpretation
    };
  });

  // Get profile summary
  const profileSummary = getProfileSummary(scores);

  // Get suitability and risks
  const { suitability, risks } = getSuitabilityAndRisks(scores);

  // Identify top strengths and development areas
  const topStrengths = Object.entries(scores)
    .filter(([_, score]) => score >= 70)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  const topWeaknesses = Object.entries(scores)
    .filter(([_, score]) => score < 60)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([category]) => category);

  // Generate development focus
  const developmentFocus = topWeaknesses.map((area, index) => ({
    area,
    priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Low'
  }));

  // Create overall summary paragraph
  const overallSummary = `${candidateName} completed the assessment with an overall score of ${overallPercentage}%. ` +
    (topStrengths.length > 0 ? `Key strengths include ${topStrengths.join(', ')}. ` : '') +
    (topWeaknesses.length > 0 ? `Development needed in ${topWeaknesses.join(', ')}. ` : '') +
    profileSummary.description;

  return {
    candidateName,
    overallScore: overallPercentage,
    profileType: profileSummary.type,
    profileDescription: profileSummary.description,
    overallSummary,
    categoryInterpretation,
    topStrengths,
    topWeaknesses,
    suitability: suitability.length > 0 ? suitability : ['Standard role placement with appropriate support'],
    risks: risks.length > 0 ? risks : ['No significant risks identified'],
    developmentFocus
  };
};
