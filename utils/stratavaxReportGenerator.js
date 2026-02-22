/**
 * STRATAVAX PROFESSIONAL REPORT GENERATOR
 * Enhanced version of dynamicReportGenerator.js with:
 * - 5-section structured format (Cover, Executive Summary, Breakdown, Strengths/Weaknesses, Recommendations)
 * - Assessment-specific narrative templates
 * - Visual chart data preparation
 * - Variable-based sentence construction for uniqueness
 */

import { gradeScale as baseGradeScale } from './dynamicReportGenerator';

// ========== SECTION 1: CONFIGURATION & CONSTANTS ==========

// Enhanced grade scale with Stratavax format
export const stratavaxGradeScale = [
  { grade: 'A+', min: 95, color: '#0A5C2E', bg: '#E6F7E6', 
    description: 'Exceptional - Mastery level',
    professional: 'Exceptional',
    classification: 'High Potential' },
  { grade: 'A', min: 90, color: '#1E7A44', bg: '#E6F7E6', 
    description: 'Excellent',
    professional: 'Excellent',
    classification: 'High Potential' },
  { grade: 'A-', min: 85, color: '#2E7D32', bg: '#E8F5E9', 
    description: 'Very Good',
    professional: 'Very Good',
    classification: 'High Potential' },
  { grade: 'B+', min: 80, color: '#2E7D32', bg: '#E8F5E9', 
    description: 'Good',
    professional: 'Good',
    classification: 'Strong Performer' },
  { grade: 'B', min: 75, color: '#1565C0', bg: '#E3F2FD', 
    description: 'Satisfactory',
    professional: 'Satisfactory',
    classification: 'Strong Performer' },
  { grade: 'B-', min: 70, color: '#1565C0', bg: '#E3F2FD', 
    description: 'Adequate',
    professional: 'Adequate',
    classification: 'Strong Performer' },
  { grade: 'C+', min: 65, color: '#E65100', bg: '#FFF3E0', 
    description: 'Developing',
    professional: 'Developing',
    classification: 'Developing' },
  { grade: 'C', min: 60, color: '#E65100', bg: '#FFF3E0', 
    description: 'Basic Competency',
    professional: 'Basic',
    classification: 'Developing' },
  { grade: 'C-', min: 55, color: '#E65100', bg: '#FFF3E0', 
    description: 'Minimum Competency',
    professional: 'Minimum',
    classification: 'Developing' },
  { grade: 'D+', min: 50, color: '#B71C1C', bg: '#FFEBEE', 
    description: 'Below Expectations',
    professional: 'Below Expectations',
    classification: 'At Risk' },
  { grade: 'D', min: 40, color: '#B71C1C', bg: '#FFEBEE', 
    description: 'Significant Gaps',
    professional: 'Significant Gaps',
    classification: 'At Risk' },
  { grade: 'F', min: 0, color: '#8B0000', bg: '#FFEBEE', 
    description: 'Unsatisfactory',
    professional: 'Unsatisfactory',
    classification: 'High Risk' }
];

// Stratavax classification logic (matches requirement doc)
export const stratavaxClassification = (percentage) => {
  if (percentage >= 85) return { 
    label: 'High Potential',
    level: 5,
    color: '#2E7D32',
    description: 'Demonstrates exceptional capability, positioning as top talent ready for strategic challenges.',
    tone: 'positive'
  };
  if (percentage >= 70) return { 
    label: 'Strong Performer',
    level: 4,
    color: '#4CAF50',
    description: 'Shows solid performance with consistent capability across key areas.',
    tone: 'positive'
  };
  if (percentage >= 55) return { 
    label: 'Developing',
    level: 3,
    color: '#FF9800',
    description: 'Shows foundational competence with clear opportunities for growth.',
    tone: 'neutral'
  };
  if (percentage >= 40) return { 
    label: 'At Risk',
    level: 2,
    color: '#F44336',
    description: 'Indicates significant development needs requiring structured intervention.',
    tone: 'cautious'
  };
  return { 
    label: 'High Risk',
    level: 1,
    color: '#8B0000',
    description: 'Critical gaps requiring immediate attention and support.',
    tone: 'cautious'
  };
};

// ========== SECTION 2: ASSESSMENT-SPECIFIC TEMPLATES ==========

export const assessmentTemplates = {
  'leadership': {
    name: 'Leadership Assessment',
    icon: '👑',
    strengths: {
      'Vision & Strategic Thinking': 'strategic foresight and ability to chart long-term direction',
      'Decision-Making & Problem-Solving': 'decisive analytical capabilities',
      'Communication & Influence': 'persuasive communication and stakeholder influence',
      'People Management & Coaching': 'talent development and team building',
      'Change Leadership & Agility': 'adaptability and change management',
      'Emotional Intelligence': 'self-awareness and relationship management',
      'Cultural Competence & Inclusivity': 'inclusive leadership and cultural awareness',
      'Execution & Results Orientation': 'drive for results and accountability',
      'Resilience & Stress Management': 'composure under pressure',
      'Self-Awareness & Self-Regulation': 'personal insight and emotional control'
    },
    weaknesses: {
      'Vision & Strategic Thinking': 'limited strategic perspective',
      'Decision-Making & Problem-Solving': 'indecisiveness or analysis gaps',
      'Communication & Influence': 'difficulty articulating vision or persuading others',
      'People Management & Coaching': 'underdeveloped coaching capabilities',
      'Change Leadership & Agility': 'resistance to change or slow adaptation',
      'Emotional Intelligence': 'challenges with self-awareness or empathy',
      'Cultural Competence & Inclusivity': 'limited cultural awareness',
      'Execution & Results Orientation': 'inconsistent follow-through',
      'Resilience & Stress Management': 'strain under pressure',
      'Self-Awareness & Self-Regulation': 'limited self-insight'
    },
    narrativeTemplates: {
      executiveIntro: (name, classification) => {
        const intros = {
          'High Potential': `${name} demonstrates exceptional leadership potential with clear readiness for increased responsibility.`,
          'Strong Performer': `${name} shows solid leadership capabilities with identified areas for strategic development.`,
          'Developing': `${name} exhibits foundational leadership skills with clear opportunities for growth.`,
          'At Risk': `${name} requires structured leadership development to address identified gaps.`,
          'High Risk': `${name} needs intensive leadership coaching and foundational development.`
        };
        return intros[classification] || `${name} completed the Leadership Assessment with the following results:`;
      },
      strengthPhrases: [
        'demonstrates exceptional capability in {{area}}',
        'shows natural aptitude for {{area}}',
        'exhibits strong proficiency in {{area}}',
        'performs consistently well in {{area}}'
      ],
      weaknessPhrases: [
        'would benefit from focused development in {{area}}',
        'presents opportunity for growth in {{area}}',
        'requires targeted support to strengthen {{area}}',
        'shows potential to develop {{area}} further'
      ]
    }
  },
  
  'cognitive': {
    name: 'Cognitive Ability Assessment',
    icon: '🧠',
    strengths: {
      'Logical / Abstract Reasoning': 'strong pattern recognition and logical thinking',
      'Numerical Reasoning': 'comfort with data and quantitative analysis',
      'Verbal Reasoning': 'strong language comprehension and expression',
      'Spatial Reasoning': 'excellent visual-spatial processing',
      'Memory & Attention': 'strong recall and attention to detail',
      'Perceptual Speed & Accuracy': 'quick and accurate information processing',
      'Problem-Solving': 'effective analytical problem-solving',
      'Critical Thinking': 'sound judgment and reasoning',
      'Learning Agility': 'rapid acquisition of new concepts',
      'Mental Flexibility': 'adaptable thinking and perspective-taking'
    },
    weaknesses: {
      'Logical / Abstract Reasoning': 'difficulty with complex logical problems',
      'Numerical Reasoning': 'discomfort with quantitative analysis',
      'Verbal Reasoning': 'challenges with complex language',
      'Spatial Reasoning': 'difficulty with visual-spatial tasks',
      'Memory & Attention': 'inconsistent recall or attention',
      'Perceptual Speed & Accuracy': 'slower information processing',
      'Problem-Solving': 'needs structured problem-solving approaches',
      'Critical Thinking': 'underdeveloped analytical reasoning',
      'Learning Agility': 'requires more time to master new concepts',
      'Mental Flexibility': 'tendency toward rigid thinking'
    },
    narrativeTemplates: {
      executiveIntro: (name, classification) => {
        const intros = {
          'High Potential': `${name} demonstrates exceptional cognitive abilities suitable for complex analytical roles.`,
          'Strong Performer': `${name} shows solid cognitive capabilities with strengths in key areas.`,
          'Developing': `${name} exhibits foundational cognitive skills with identified areas for development.`,
          'At Risk': `${name} requires cognitive skill development to meet role expectations.`,
          'High Risk': `${name} needs intensive cognitive training and support.`
        };
        return intros[classification] || `${name} completed the Cognitive Ability Assessment with the following results:`;
      },
      strengthPhrases: [
        'demonstrates strong analytical thinking in {{area}}',
        'shows exceptional cognitive processing in {{area}}',
        'exhibits quick learning and adaptation in {{area}}',
        'performs with high accuracy in {{area}}'
      ],
      weaknessPhrases: [
        'would benefit from cognitive exercises in {{area}}',
        'presents opportunity to strengthen {{area}}',
        'requires structured practice to improve {{area}}',
        'shows potential for development in {{area}}'
      ]
    }
  },
  
  'technical': {
    name: 'Technical Competence Assessment',
    icon: '⚙️',
    strengths: {
      'Technical Knowledge': 'deep technical understanding',
      'System Understanding': 'comprehensive system knowledge',
      'Troubleshooting': 'effective diagnostic abilities',
      'Practical Application': 'strong hands-on implementation',
      'Safety & Compliance': 'excellent safety awareness',
      'Quality Control': 'strong quality orientation',
      'Process Optimization': 'ability to improve processes',
      'Equipment Operation': 'proficient equipment handling',
      'Maintenance Procedures': 'thorough maintenance knowledge',
      'Technical Documentation': 'clear technical communication'
    },
    weaknesses: {
      'Technical Knowledge': 'gaps in technical understanding',
      'System Understanding': 'limited system knowledge',
      'Troubleshooting': 'underdeveloped diagnostic skills',
      'Practical Application': 'difficulty with hands-on implementation',
      'Safety & Compliance': 'needs safety reinforcement',
      'Quality Control': 'inconsistent quality attention',
      'Process Optimization': 'limited process improvement skills',
      'Equipment Operation': 'needs equipment training',
      'Maintenance Procedures': 'gaps in maintenance knowledge',
      'Technical Documentation': 'difficulty with technical writing'
    },
    narrativeTemplates: {
      executiveIntro: (name, classification) => {
        const intros = {
          'High Potential': `${name} demonstrates exceptional technical expertise suitable for advanced technical roles.`,
          'Strong Performer': `${name} shows solid technical competence with strengths in key areas.`,
          'Developing': `${name} exhibits foundational technical skills with identified training needs.`,
          'At Risk': `${name} requires technical skill development to meet role requirements.`,
          'High Risk': `${name} needs intensive technical training and supervision.`
        };
        return intros[classification] || `${name} completed the Technical Competence Assessment with the following results:`;
      },
      strengthPhrases: [
        'demonstrates strong technical proficiency in {{area}}',
        'shows deep understanding of {{area}}',
        'exhibits practical mastery in {{area}}',
        'performs with technical precision in {{area}}'
      ],
      weaknessPhrases: [
        'would benefit from technical training in {{area}}',
        'presents opportunity to build {{area}} skills',
        'requires guided practice to develop {{area}}',
        'shows potential to strengthen {{area}} with support'
      ]
    }
  },
  
  'general': {
    name: 'General Assessment',
    icon: '📊',
    strengths: {
      'Cognitive Ability': 'strong analytical and strategic thinking',
      'Communication': 'clear and effective communication',
      'Cultural & Attitudinal Fit': 'strong values alignment',
      'Emotional Intelligence': 'self-awareness and empathy',
      'Ethics & Integrity': 'principled decision-making',
      'Leadership & Management': 'leadership potential',
      'Performance Metrics': 'results orientation',
      'Personality & Behavioral': 'stable and adaptable',
      'Problem-Solving': 'effective problem-solving',
      'Technical & Manufacturing': 'technical competence'
    },
    weaknesses: {
      'Cognitive Ability': 'needs cognitive skill development',
      'Communication': 'communication gaps to address',
      'Cultural & Attitudinal Fit': 'cultural alignment concerns',
      'Emotional Intelligence': 'EI development needed',
      'Ethics & Integrity': 'ethics guidance required',
      'Leadership & Management': 'leadership skill gaps',
      'Performance Metrics': 'performance focus to develop',
      'Personality & Behavioral': 'behavioral patterns to address',
      'Problem-Solving': 'problem-solving skill gaps',
      'Technical & Manufacturing': 'technical training needed'
    },
    narrativeTemplates: {
      executiveIntro: (name, classification) => {
        const intros = {
          'High Potential': `${name} demonstrates exceptional overall capability across multiple domains.`,
          'Strong Performer': `${name} shows solid performance with clear strengths to leverage.`,
          'Developing': `${name} exhibits foundational skills with identified development areas.`,
          'At Risk': `${name} requires structured development to address performance gaps.`,
          'High Risk': `${name} needs intensive support to build fundamental capabilities.`
        };
        return intros[classification] || `${name} completed the General Assessment with the following results:`;
      },
      strengthPhrases: [
        'demonstrates strong capability in {{area}}',
        'shows natural aptitude for {{area}}',
        'exhibits proficiency in {{area}}',
        'performs consistently in {{area}}'
      ],
      weaknessPhrases: [
        'would benefit from development in {{area}}',
        'presents opportunity to strengthen {{area}}',
        'requires support to improve {{area}}',
        'shows potential to develop {{area}}'
      ]
    }
  }
};

// Add personality, performance, behavioral, cultural templates (similar structure)
assessmentTemplates['personality'] = {
  name: 'Personality Assessment',
  icon: '🌟',
  strengths: {
    'Openness': 'intellectual curiosity and creativity',
    'Conscientiousness': 'organization and reliability',
    'Extraversion': 'energy and sociability',
    'Agreeableness': 'cooperation and empathy',
    'Neuroticism': 'emotional stability',
    'Resilience': 'ability to bounce back',
    'Adaptability': 'flexibility in new situations',
    'Optimism': 'positive outlook',
    'Self-Efficacy': 'confidence in abilities',
    'Work Style': 'productive work patterns'
  },
  weaknesses: {
    'Openness': 'resistance to new ideas',
    'Conscientiousness': 'organization challenges',
    'Extraversion': 'reserved or withdrawn',
    'Agreeableness': 'interpersonal friction',
    'Neuroticism': 'emotional reactivity',
    'Resilience': 'difficulty recovering from setbacks',
    'Adaptability': 'struggles with change',
    'Optimism': 'negative outlook',
    'Self-Efficacy': 'self-doubt',
    'Work Style': 'ineffective work patterns'
  },
  narrativeTemplates: {
    executiveIntro: (name, classification) => `${name} completed the Personality Assessment with the following profile:`,
    strengthPhrases: [
      'demonstrates positive traits in {{area}}',
      'shows healthy patterns in {{area}}',
      'exhibits strengths in {{area}}',
      'displays adaptive behavior in {{area}}'
    ],
    weaknessPhrases: [
      'would benefit from self-awareness in {{area}}',
      'presents opportunity to develop {{area}}',
      'requires attention to {{area}}',
      'shows potential to grow in {{area}}'
    ]
  }
};

assessmentTemplates['performance'] = {
  name: 'Performance Assessment',
  icon: '📈',
  strengths: {
    'Productivity & Efficiency': 'high output and efficiency',
    'Work Quality & Effectiveness': 'quality focus',
    'Goal Achievement': 'goal orientation',
    'Accountability': 'ownership and responsibility',
    'Initiative': 'proactive approach',
    'Problem-Solving': 'effective problem-solving',
    'Collaboration': 'team contribution',
    'Adaptability': 'flexibility',
    'Time Management': 'efficient time use',
    'Results Orientation': 'drive for results'
  },
  weaknesses: {
    'Productivity & Efficiency': 'productivity gaps',
    'Work Quality & Effectiveness': 'quality inconsistencies',
    'Goal Achievement': 'missed targets',
    'Accountability': 'limited ownership',
    'Initiative': 'reactive approach',
    'Problem-Solving': 'ineffective problem-solving',
    'Collaboration': 'limited team contribution',
    'Adaptability': 'rigidity',
    'Time Management': 'poor time management',
    'Results Orientation': 'limited results focus'
  },
  narrativeTemplates: {
    executiveIntro: (name, classification) => `${name} completed the Performance Assessment with the following results:`,
    strengthPhrases: [
      'demonstrates strong performance in {{area}}',
      'shows effectiveness in {{area}}',
      'exhibits productivity in {{area}}',
      'performs well in {{area}}'
    ],
    weaknessPhrases: [
      'would benefit from performance coaching in {{area}}',
      'presents opportunity to improve {{area}}',
      'requires development in {{area}}',
      'shows potential to enhance {{area}}'
    ]
  }
};

assessmentTemplates['behavioral'] = {
  name: 'Behavioral & Soft Skills Assessment',
  icon: '🗣️',
  strengths: {
    'Communication': 'clear communication',
    'Teamwork': 'collaborative approach',
    'Emotional Intelligence': 'self and social awareness',
    'Conflict Resolution': 'effective conflict handling',
    'Adaptability': 'flexibility',
    'Empathy': 'understanding others',
    'Active Listening': 'attentive listening',
    'Feedback Reception': 'open to feedback',
    'Interpersonal Skills': 'relationship building',
    'Professionalism': 'professional conduct'
  },
  weaknesses: {
    'Communication': 'communication gaps',
    'Teamwork': 'collaboration challenges',
    'Emotional Intelligence': 'limited self-awareness',
    'Conflict Resolution': 'conflict avoidance or escalation',
    'Adaptability': 'rigidity',
    'Empathy': 'limited perspective-taking',
    'Active Listening': 'poor listening',
    'Feedback Reception': 'defensive to feedback',
    'Interpersonal Skills': 'relationship challenges',
    'Professionalism': 'professionalism concerns'
  },
  narrativeTemplates: {
    executiveIntro: (name, classification) => `${name} completed the Behavioral Skills Assessment with the following profile:`,
    strengthPhrases: [
      'demonstrates strong interpersonal skills in {{area}}',
      'shows emotional intelligence in {{area}}',
      'exhibits professionalism in {{area}}',
      'performs well in {{area}}'
    ],
    weaknessPhrases: [
      'would benefit from soft skills training in {{area}}',
      'presents opportunity to develop {{area}}',
      'requires coaching in {{area}}',
      'shows potential to improve {{area}}'
    ]
  }
};

assessmentTemplates['cultural'] = {
  name: 'Cultural & Attitudinal Fit Assessment',
  icon: '🤝',
  strengths: {
    'Values Alignment': 'values congruence',
    'Work Ethic': 'strong work ethic',
    'Adaptability': 'flexibility',
    'Collaboration': 'team orientation',
    'Company Culture Fit': 'cultural alignment',
    'Diversity Awareness': 'inclusive mindset',
    'Inclusivity': 'inclusive behavior',
    'Respect': 'respectful interactions',
    'Integrity': 'ethical behavior',
    'Professional Conduct': 'professionalism'
  },
  weaknesses: {
    'Values Alignment': 'values mismatch',
    'Work Ethic': 'work ethic concerns',
    'Adaptability': 'resistance to change',
    'Collaboration': 'individualistic approach',
    'Company Culture Fit': 'cultural misalignment',
    'Diversity Awareness': 'limited awareness',
    'Inclusivity': 'exclusionary patterns',
    'Respect': 'disrespectful behavior',
    'Integrity': 'ethical concerns',
    'Professional Conduct': 'unprofessional behavior'
  },
  narrativeTemplates: {
    executiveIntro: (name, classification) => `${name} completed the Cultural Fit Assessment with the following results:`,
    strengthPhrases: [
      'demonstrates strong cultural alignment in {{area}}',
      'shows values congruence in {{area}}',
      'exhibits positive attitude in {{area}}',
      'performs well in {{area}}'
    ],
    weaknessPhrases: [
      'would benefit from cultural awareness in {{area}}',
      'presents opportunity to align {{area}}',
      'requires development in {{area}}',
      'shows potential to improve {{area}}'
    ]
  }
};

// ========== SECTION 3: ENHANCED NARRATIVE ENGINE ==========

/**
 * Generate dynamic narrative with variable-based sentence construction
 * Ensures no two reports are identical through:
 * - Randomized phrase selection
 * - Variable insertion ({{area}}, {{percentage}}, etc.)
 * - Classification-based tone adjustment
 */
export const generateDynamicNarrative = (
  template, 
  variables, 
  classification,
  availablePhrases
) => {
  if (!template) return '';
  
  // Replace all {{variables}} in template
  let narrative = template;
  Object.keys(variables).forEach(key => {
    narrative = narrative.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  });
  
  // If there are phrase arrays, randomly select one for each placeholder
  if (availablePhrases?.strengthPhrases) {
    // This would be used for more complex narrative construction
    // We'll implement this in the main generator
  }
  
  return narrative;
};

/**
 * Build strengths section with unique phrasing per candidate
 */
export const buildStrengthsNarrative = (strengths, assessmentType, classification) => {
  const template = assessmentTemplates[assessmentType] || assessmentTemplates.general;
  const strengthPhrases = template.narrativeTemplates.strengthPhrases;
  
  if (strengths.length === 0) {
    return 'No significant strengths identified above the 80% threshold.';
  }
  
  // Select random phrases for each strength to ensure uniqueness
  const strengthStatements = strengths.map((strength, index) => {
    const area = strength.area || strength;
    const phraseIndex = (index + Math.floor(Math.random() * 10)) % strengthPhrases.length;
    let phrase = strengthPhrases[phraseIndex].replace('{{area}}', area);
    
    // Add impact based on classification
    if (index === 0 && classification === 'High Potential') {
      phrase += ' - this exceptional capability positions them for strategic impact.';
    } else if (index === 0) {
      phrase += ' - a key asset to leverage.';
    }
    
    return phrase;
  });
  
  // Build the narrative with varied sentence structures
  if (strengths.length === 1) {
    return `The candidate ${strengthStatements[0]}`;
  } else if (strengths.length === 2) {
    return `The candidate ${strengthStatements[0]} and ${strengthStatements[1].replace('The candidate ', '').toLowerCase()}`;
  } else {
    const lastStrength = strengthStatements.pop();
    const otherStrengths = strengthStatements.map(s => s.toLowerCase());
    return `The candidate ${otherStrengths.join(', ')}, and ${lastStrength.toLowerCase()}`;
  }
};

/**
 * Build weaknesses section with unique phrasing per candidate
 */
export const buildWeaknessesNarrative = (weaknesses, assessmentType, classification) => {
  const template = assessmentTemplates[assessmentType] || assessmentTemplates.general;
  const weaknessPhrases = template.narrativeTemplates.weaknessPhrases;
  
  if (weaknesses.length === 0) {
    return 'No significant development areas identified. The candidate meets or exceeds expectations across all categories.';
  }
  
  // Select random phrases for each weakness
  const weaknessStatements = weaknesses.map((weakness, index) => {
    const area = weakness.area || weakness;
    const phraseIndex = (index + Math.floor(Math.random() * 10)) % weaknessPhrases.length;
    let phrase = weaknessPhrases[phraseIndex].replace('{{area}}', area);
    
    // Add urgency based on classification
    if (index < 2 && classification === 'At Risk' || classification === 'High Risk') {
      phrase += ' This is a critical development priority requiring immediate attention.';
    } else if (index < 2) {
      phrase += ' This should be a focus area in the development plan.';
    }
    
    return phrase;
  });
  
  // Build narrative with varied structures
  if (weaknesses.length === 1) {
    return `The candidate ${weaknessStatements[0]}`;
  } else if (weaknesses.length === 2) {
    return `The candidate ${weaknessStatements[0]} and ${weaknessStatements[1].replace('The candidate ', '').toLowerCase()}`;
  } else {
    const lastWeakness = weaknessStatements.pop();
    const otherWeaknesses = weaknessStatements.map(w => w.toLowerCase());
    return `The candidate ${otherWeaknesses.join(', ')}, and ${lastWeakness.toLowerCase()}`;
  }
};

/**
 * Generate overall executive summary with classification-based messaging
 */
export const generateExecutiveSummary = (
  candidateName,
  totalScore,
  maxScore,
  percentage,
  classification,
  strengths,
  weaknesses,
  assessmentType
) => {
  const template = assessmentTemplates[assessmentType] || assessmentTemplates.general;
  const intro = template.narrativeTemplates.executiveIntro(candidateName, classification.label);
  
  // Build classification-specific message
  const classificationMessages = {
    'High Potential': `At ${percentage}%, this score reflects exceptional capability. ${candidateName} demonstrates readiness for increased responsibility and strategic challenges.`,
    'Strong Performer': `With a score of ${percentage}%, ${candidateName} shows solid performance with clear strengths to leverage. Targeted development in identified areas will enhance overall effectiveness.`,
    'Developing': `Scoring ${percentage}%, ${candidateName} has foundational competence with clear opportunities for growth. Structured development will accelerate progress.`,
    'At Risk': `At ${percentage}%, this score indicates significant development needs. ${candidateName} requires structured intervention and close supervision in key areas.`,
    'High Risk': `With ${percentage}%, critical gaps have been identified. Immediate attention and intensive support are recommended.`
  };
  
  const classificationMessage = classificationMessages[classification.label] || 
    `${candidateName} scored ${percentage}% on the ${template.name}.`;
  
  // Build strengths summary
  const strengthsSummary = strengths.length > 0 
    ? `Key strengths include ${strengths.slice(0, 3).map(s => s.area || s).join(', ')}.`
    : '';
  
  // Build weaknesses summary
  const weaknessesSummary = weaknesses.length > 0
    ? `Priority development areas are ${weaknesses.slice(0, 3).map(w => w.area || w).join(', ')}.`
    : '';
  
  // Combine with conditional punctuation
  let summary = `${intro} ${classificationMessage}`;
  if (strengthsSummary) summary += ` ${strengthsSummary}`;
  if (weaknessesSummary) summary += ` ${weaknessesSummary}`;
  
  return summary;
};

// ========== SECTION 4: REPORT STRUCTURE GENERATORS ==========

/**
 * Generate cover page data for Stratavax report format
 */
export const generateCoverPage = (candidateName, assessmentType, dateTaken, reportDate) => {
  const template = assessmentTemplates[assessmentType] || assessmentTemplates.general;
  
  return {
    candidateName,
    assessmentName: template.name,
    assessmentIcon: template.icon,
    dateTaken,
    reportGenerated: reportDate,
    confidentiality: 'CONFIDENTIAL - For internal use only',
    branding: 'Stratavax'
  };
};

/**
 * Generate score breakdown table data
 */
export const generateScoreBreakdown = (categoryScores) => {
  return Object.entries(categoryScores).map(([category, data]) => ({
    category,
    score: `${data.score}/${data.maxPossible}`,
    percentage: data.percentage,
    grade: data.grade || 'N/A',
    comment: data.comment || getPerformanceComment(data.percentage)
  }));
};

/**
 * Generate performance comment based on percentage
 */
export const getPerformanceComment = (percentage) => {
  if (percentage >= 85) return 'Exceptional performance';
  if (percentage >= 75) return 'Very good performance';
  if (percentage >= 65) return 'Good performance';
  if (percentage >= 55) return 'Adequate performance';
  if (percentage >= 45) return 'Below expectations';
  return 'Significant gap';
};

/**
 * Generate visual chart data for PDF reports
 */
export const generateChartData = (categoryScores) => {
  return {
    labels: Object.keys(categoryScores).map(c => c.length > 15 ? c.substring(0, 15) + '...' : c),
    datasets: [{
      data: Object.values(categoryScores).map(c => c.percentage),
      backgroundColor: Object.values(categoryScores).map(c => 
        c.percentage >= 80 ? '#4CAF50' :
        c.percentage >= 60 ? '#2196F3' :
        c.percentage >= 40 ? '#FF9800' : '#F44336'
      )
    }]
  };
};

/**
 * Generate development recommendations with priority levels
 */
export const generateStructuredRecommendations = (weaknesses, strengths, assessmentType) => {
  const template = assessmentTemplates[assessmentType] || assessmentTemplates.general;
  const recommendations = [];
  
  // Priority 1: Critical development areas (bottom 2 weaknesses)
  weaknesses.slice(0, 2).forEach((weakness, index) => {
    const area = weakness.area || weakness;
    const weaknessDesc = template.weaknesses[area] || 'development needed';
    
    recommendations.push({
      priority: 'High',
      category: area,
      recommendation: `Priority: Strengthen ${area} - ${weaknessDesc}.`,
      action: `Complete targeted training in ${area} within 30 days.`,
      impact: `Improving ${area} will significantly enhance overall performance.`
    });
  });
  
  // Priority 2: Secondary development areas
  weaknesses.slice(2, 4).forEach((weakness) => {
    const area = weakness.area || weakness;
    const weaknessDesc = template.weaknesses[area] || 'development opportunity';
    
    recommendations.push({
      priority: 'Medium',
      category: area,
      recommendation: `Develop ${area} - ${weaknessDesc}.`,
      action: `Practice ${area} skills through on-the-job application.`,
      impact: `Building competence in ${area} will round out capabilities.`
    });
  });
  
  // Priority 3: Leverage strengths
  strengths.slice(0, 2).forEach((strength) => {
    const area = strength.area || strength;
    const strengthDesc = template.strengths[area] || 'key strength';
    
    recommendations.push({
      priority: 'Leverage',
      category: area,
      recommendation: `Leverage strength in ${area} - ${strengthDesc}.`,
      action: `Mentor others and take on stretch assignments involving ${area}.`,
      impact: `Maximizing this strength will create additional value.`
    });
  });
  
  return recommendations;
};

// ========== SECTION 5: MAIN ENHANCED REPORT GENERATOR ==========

/**
 * Enhanced Stratavax Report Generator
 * Builds on your existing generatePersonalizedReport but adds:
 * - Structured 5-section format
 * - Assessment-specific narratives
 * - Visual chart data
 * - Enhanced uniqueness through variable-based sentences
 */
export const generateStratavaxReport = (
  userId,
  assessmentType,
  responses,
  candidateName,
  dateTaken = new Date().toISOString()
) => {
  console.log(`📊 Generating Stratavax report for ${candidateName} (${userId}) on ${assessmentType} assessment`);
  console.log(`📝 Processing ${responses.length} responses`);
  
  // ===== STEP 1: Calculate scores (reuse your existing logic) =====
  const categoryScores = {};
  const strengthsList = [];
  const weaknessesList = [];
  let totalScore = 0;
  
  responses.forEach(response => {
    const question = response.unique_questions;
    const answer = response.unique_answers;
    const section = question?.section || 'General';
    const score = answer?.score || 0;
    totalScore += score;
    
    if (!categoryScores[section]) {
      categoryScores[section] = {
        total: 0,
        count: 0,
        maxPossible: 0,
        average: 0,
        percentage: 0,
        score: 0
      };
    }
    
    categoryScores[section].total += score;
    categoryScores[section].count += 1;
    categoryScores[section].maxPossible += 5;
  });
  
  // Calculate percentages and identify strengths/weaknesses
  Object.keys(categoryScores).forEach(section => {
    const data = categoryScores[section];
    data.percentage = Math.round((data.total / data.maxPossible) * 100);
    data.average = Number((data.total / data.count).toFixed(2));
    data.score = data.total;
    
    // Add grade info
    const gradeInfo = stratavaxGradeScale.find(g => data.percentage >= g.min) || stratavaxGradeScale[stratavaxGradeScale.length - 1];
    data.grade = gradeInfo.grade;
    data.comment = getPerformanceComment(data.percentage);
    
    // 80% threshold for strength
    if (data.percentage >= 80) {
      strengthsList.push({
        area: section,
        percentage: data.percentage,
        score: data.total,
        maxPossible: data.maxPossible,
        grade: data.grade
      });
    } else {
      const gap = Math.round((data.maxPossible * 0.8) - data.total);
      weaknessesList.push({
        area: section,
        percentage: data.percentage,
        score: data.total,
        maxPossible: data.maxPossible,
        grade: data.grade,
        gap: gap > 0 ? gap : 0
      });
    }
  });
  
  const maxScore = responses.length * 5;
  const percentageScore = Math.round((totalScore / maxScore) * 100);
  
  // ===== STEP 2: Apply Stratavax classification =====
  const classification = stratavaxClassification(percentageScore);
  const gradeInfo = stratavaxGradeScale.find(g => percentageScore >= g.min) || stratavaxGradeScale[stratavaxGradeScale.length - 1];
  
  // ===== STEP 3: Sort strengths and weaknesses =====
  const sortedStrengths = strengthsList.sort((a, b) => b.percentage - a.percentage);
  const sortedWeaknesses = weaknessesList.sort((a, b) => a.percentage - b.percentage);
  
  // ===== STEP 4: Generate enhanced narratives =====
  const executiveSummary = generateExecutiveSummary(
    candidateName,
    totalScore,
    maxScore,
    percentageScore,
    classification,
    sortedStrengths,
    sortedWeaknesses,
    assessmentType
  );
  
  const strengthsNarrative = buildStrengthsNarrative(sortedStrengths, assessmentType, classification.label);
  const weaknessesNarrative = buildWeaknessesNarrative(sortedWeaknesses, assessmentType, classification.label);
  
  // ===== STEP 5: Generate structured recommendations =====
  const structuredRecommendations = generateStructuredRecommendations(
    sortedWeaknesses,
    sortedStrengths,
    assessmentType
  );
  
  // ===== STEP 6: Generate visual data =====
  const chartData = generateChartData(categoryScores);
  const scoreBreakdown = generateScoreBreakdown(categoryScores);
  
  // ===== STEP 7: Generate cover page =====
  const coverPage = generateCoverPage(
    candidateName,
    assessmentType,
    dateTaken,
    new Date().toISOString()
  );
  
  // ===== STEP 8: Build complete report object =====
  return {
    // Core data (compatible with your existing structure)
    userId,
    assessmentType,
    candidateName,
    totalScore,
    maxScore,
    percentageScore,
    grade: gradeInfo.grade,
    gradeInfo,
    classification,
    categoryScores,
    strengths: sortedStrengths,
    weaknesses: sortedWeaknesses,
    strengthsForDb: sortedStrengths.map(s => `${s.area} (${s.percentage}%)`),
    weaknessesForDb: sortedWeaknesses.map(w => `${w.area} (${w.percentage}%)`),
    
    // Enhanced Stratavax 5-section structure
    stratavaxReport: {
      // Section 1: Cover Page
      cover: coverPage,
      
      // Section 2: Executive Summary
      executiveSummary: {
        totalScore: `${totalScore}/${maxScore}`,
        percentage: percentageScore,
        grade: gradeInfo.grade,
        classification: classification.label,
        narrative: executiveSummary,
        classificationDescription: classification.description
      },
      
      // Section 3: Score Breakdown Table
      scoreBreakdown: scoreBreakdown,
      
      // Section 4: Strengths & Weaknesses
      strengths: {
        items: sortedStrengths,
        narrative: strengthsNarrative,
        topStrengths: sortedStrengths.slice(0, 3).map(s => s.area)
      },
      weaknesses: {
        items: sortedWeaknesses,
        narrative: weaknessesNarrative,
        topWeaknesses: sortedWeaknesses.slice(0, 3).map(w => w.area)
      },
      
      // Section 5: Development Recommendations
      recommendations: structuredRecommendations,
      
      // Visual data for PDF
      visualData: {
        chartData,
        scoreBreakdown
      }
    },
    
    // Keep your existing fields for backward compatibility
    executiveSummary,
    recommendations: structuredRecommendations.map(r => r.recommendation),
    overallProfile: classification.description,
    overallTraits: [gradeInfo.description, classification.label],
    interpretations: {
      classification: classification.label,
      summary: executiveSummary,
      overallProfile: classification.description,
      strengths: sortedStrengths.map(s => `${s.area} (${s.percentage}%)`),
      weaknesses: sortedWeaknesses.map(w => `${w.area} (${w.percentage}%)`)
    }
  };
};
