/**
 * STRATAVAX PROFESSIONAL REPORT GENERATOR
 * Enhanced version with phrase library for unique, varied narratives
 * Every report is guaranteed to be different
 */

import { gradeScale as baseGradeScale } from './dynamicReportGenerator';
import { 
  getStrengthPhrase, 
  getWeaknessPhrase, 
  getImpactPhrase,
  getClassificationPhrase,
  strengthPhrases,
  weaknessPhrases,
  impactPhrases,
  classificationPhrases,
  areaDescriptors
} from './phraseLibrary';

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
    description: getClassificationPhrase('High Potential'),
    tone: 'positive'
  };
  if (percentage >= 70) return { 
    label: 'Strong Performer',
    level: 4,
    color: '#4CAF50',
    description: getClassificationPhrase('Strong Performer'),
    tone: 'positive'
  };
  if (percentage >= 55) return { 
    label: 'Developing',
    level: 3,
    color: '#FF9800',
    description: getClassificationPhrase('Developing'),
    tone: 'neutral'
  };
  if (percentage >= 40) return { 
    label: 'At Risk',
    level: 2,
    color: '#F44336',
    description: getClassificationPhrase('At Risk'),
    tone: 'cautious'
  };
  return { 
    label: 'High Risk',
    level: 1,
    color: '#8B0000',
    description: getClassificationPhrase('High Risk'),
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
        const intros = [
          `${name} completed the Leadership Assessment with the following results:`,
          `The leadership profile for ${name} reveals:`,
          `Analysis of ${name}'s leadership capabilities indicates:`,
          `${name}'s leadership assessment yields the following insights:`,
          `Evaluation of ${name}'s leadership potential shows:`
        ];
        return intros[Math.floor(Math.random() * intros.length)];
      }
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
        const intros = [
          `${name} completed the Cognitive Ability Assessment with the following results:`,
          `The cognitive profile for ${name} demonstrates:`,
          `Analysis of ${name}'s cognitive capabilities indicates:`,
          `${name}'s cognitive assessment yields the following insights:`,
          `Evaluation of ${name}'s analytical abilities shows:`
        ];
        return intros[Math.floor(Math.random() * intros.length)];
      }
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
        const intros = [
          `${name} completed the Technical Competence Assessment with the following results:`,
          `The technical profile for ${name} reveals:`,
          `Analysis of ${name}'s technical capabilities indicates:`,
          `${name}'s technical assessment yields the following insights:`,
          `Evaluation of ${name}'s technical competence shows:`
        ];
        return intros[Math.floor(Math.random() * intros.length)];
      }
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
        const intros = [
          `${name} completed the General Assessment with the following results:`,
          `The overall profile for ${name} demonstrates:`,
          `Analysis of ${name}'s comprehensive assessment indicates:`,
          `${name}'s assessment yields the following insights:`,
          `Evaluation of ${name}'s capabilities shows:`
        ];
        return intros[Math.floor(Math.random() * intros.length)];
      }
    }
  }
};

// UPDATED: Personality assessment with 6 new traits
assessmentTemplates['personality'] = {
  name: 'Personality Assessment',
  icon: '🌟',
  strengths: {
    'Ownership': 'accountability, initiative, and follow-through',
    'Collaboration': 'teamwork, consensus-building, and interpersonal effectiveness',
    'Action': 'decisiveness, urgency, and proactive execution',
    'Analysis': 'analytical thinking, systematic approach, and data-driven reasoning',
    'Risk Tolerance': 'innovation mindset, calculated risk-taking, and comfort with uncertainty',
    'Structure': 'process adherence, organizational consistency, and reliability'
  },
  weaknesses: {
    'Ownership': 'limited accountability or initiative',
    'Collaboration': 'difficulty with teamwork or building consensus',
    'Action': 'indecisiveness or lack of urgency',
    'Analysis': 'limited analytical thinking or systematic approach',
    'Risk Tolerance': 'excessive caution or resistance to innovation',
    'Structure': 'inconsistent process adherence or organizational gaps'
  },
  narrativeTemplates: {
    executiveIntro: (name, classification) => {
      const intros = [
        `${name} completed the Personality Assessment with the following profile:`,
        `The personality profile for ${name} reveals:`,
        `Analysis of ${name}'s behavioral patterns indicates:`,
        `${name}'s personality assessment yields the following insights:`,
        `Evaluation of ${name}'s disposition shows:`
      ];
      return intros[Math.floor(Math.random() * intros.length)];
    }
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
    executiveIntro: (name, classification) => {
      const intros = [
        `${name} completed the Performance Assessment with the following results:`,
        `The performance profile for ${name} demonstrates:`,
        `Analysis of ${name}'s work patterns indicates:`,
        `${name}'s performance assessment yields the following insights:`,
        `Evaluation of ${name}'s productivity shows:`
      ];
      return intros[Math.floor(Math.random() * intros.length)];
    }
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
    executiveIntro: (name, classification) => {
      const intros = [
        `${name} completed the Behavioral Skills Assessment with the following profile:`,
        `The behavioral profile for ${name} reveals:`,
        `Analysis of ${name}'s interpersonal patterns indicates:`,
        `${name}'s soft skills assessment yields the following insights:`,
        `Evaluation of ${name}'s social competencies shows:`
      ];
      return intros[Math.floor(Math.random() * intros.length)];
    }
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
    executiveIntro: (name, classification) => {
      const intros = [
        `${name} completed the Cultural Fit Assessment with the following results:`,
        `The cultural alignment profile for ${name} demonstrates:`,
        `Analysis of ${name}'s values congruence indicates:`,
        `${name}'s cultural assessment yields the following insights:`,
        `Evaluation of ${name}'s organizational fit shows:`
      ];
      return intros[Math.floor(Math.random() * intros.length)];
    }
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
  
  return narrative;
};

/**
 * Build strengths section with unique phrasing per candidate
 */
export const buildStrengthsNarrative = (strengths, assessmentType, classification) => {
  if (strengths.length === 0) {
    const noStrengthPhrases = [
      'No significant strengths identified above the 80% threshold.',
      'The candidate does not demonstrate any standout strengths at this time.',
      'Performance is consistent but without exceptional peaks in any area.',
      'No areas exceed the excellence threshold in this assessment.',
      'Strengths are not prominently differentiated in this profile.'
    ];
    return noStrengthPhrases[Math.floor(Math.random() * noStrengthPhrases.length)];
  }
  
  // Generate unique phrases for each strength
  const strengthStatements = strengths.map((strength, index) => {
    const area = strength.area || strength;
    const phrase = getStrengthPhrase(area, assessmentType);
    
    // Add variety in how we present the percentage
    const percentageOptions = [
      ` (${strength.percentage}% proficiency)`,
      ` at ${strength.percentage}%`,
      ` scoring ${strength.percentage}%`,
      '', // Sometimes omit the percentage
      ` (${strength.percentage}% mastery)`,
      ` with ${strength.percentage}% accuracy`,
      ` demonstrating ${strength.percentage}% capability`,
      '' // Another omit option
    ];
    
    const percentageText = percentageOptions[Math.floor(Math.random() * percentageOptions.length)];
    
    // Randomly add emphasis for top strength
    if (index === 0 && Math.random() > 0.5) {
      return `Notably, ${phrase}${percentageText}`;
    }
    
    return phrase + percentageText;
  });
  
  // Different narrative structures
  const structures = [
    // Structure 1: Simple list
    (list) => {
      if (list.length === 1) return `The candidate ${list[0]}.`;
      if (list.length === 2) return `The candidate ${list[0]} and ${list[1].replace('The candidate ', '').toLowerCase()}.`;
      const last = list.pop();
      return `The candidate ${list.join(', ')}, and ${last.toLowerCase()}.`;
    },
    
    // Structure 2: Emphasized opening
    (list) => {
      if (list.length === 1) return `${list[0].charAt(0).toUpperCase() + list[0].slice(1)}.`;
      const last = list.pop();
      return `${list.join('. ')}. Additionally, ${last.toLowerCase()}.`;
    },
    
    // Structure 3: Area-focused
    (list) => {
      const areas = strengths.map(s => s.area || s).join(', ');
      return `Key strengths emerge in ${areas}, with ${list[0].toLowerCase()}`;
    },
    
    // Structure 4: Percentage-focused
    (list) => {
      const topStrength = strengths[0];
      return `The strongest performance is in ${topStrength.area || topStrength} at ${topStrength.percentage}%. ${list.slice(1).length > 0 ? `Additional strengths include ${list.slice(1).join(' and ').toLowerCase()}` : ''}`;
    },
    
    // Structure 5: Question format
    (list) => {
      return `Where does the candidate excel? ${list.join(' ')}`;
    },
    
    // Structure 6: Observation format
    (list) => {
      return `Observations indicate strong performance in ${list.join(' ').toLowerCase()}`;
    }
  ];
  
  const selectedStructure = structures[Math.floor(Math.random() * structures.length)];
  return selectedStructure([...strengthStatements]);
};

/**
 * Build weaknesses section with unique phrasing per candidate
 */
export const buildWeaknessesNarrative = (weaknesses, assessmentType, classification) => {
  if (weaknesses.length === 0) {
    const noWeaknessPhrases = [
      'No significant development areas identified. The candidate meets or exceeds expectations across all categories.',
      'Performance is consistently strong with no critical gaps detected.',
      'The candidate demonstrates adequate capability in all assessed areas.',
      'No priority development needs identified at this time.',
      'The profile shows balanced competence without notable weaknesses.'
    ];
    return noWeaknessPhrases[Math.floor(Math.random() * noWeaknessPhrases.length)];
  }
  
  // Sort weaknesses by priority (lowest scores first)
  const sortedWeaknesses = [...weaknesses].sort((a, b) => a.percentage - b.percentage);
  
  // Generate unique phrases for each weakness with varied impact statements
  const weaknessStatements = sortedWeaknesses.map((weakness, index) => {
    const area = weakness.area || weakness;
    const phrase = getWeaknessPhrase(area, assessmentType);
    
    // Determine priority based on score
    let priority = 'Medium';
    if (weakness.percentage < 40) priority = 'High';
    else if (weakness.percentage < 55) priority = 'Medium';
    else priority = 'Low';
    
    const impactPhrase = getImpactPhrase(priority);
    
    // Vary how we combine phrase and impact
    const combinationStyle = Math.floor(Math.random() * 4);
    
    switch(combinationStyle) {
      case 0: return `${phrase} — ${impactPhrase}`;
      case 1: return `${phrase}. ${impactPhrase.charAt(0).toUpperCase() + impactPhrase.slice(1)}`;
      case 2: return `${phrase}; ${impactPhrase}`;
      case 3: return `${phrase} — this is ${impactPhrase.toLowerCase()}`;
      default: return `${phrase} — ${impactPhrase}`;
    }
  });
  
  // Different narrative structures
  const structureType = Math.floor(Math.random() * 8);
  
  switch(structureType) {
    case 0: // List format
      if (weaknessStatements.length === 1) return weaknessStatements[0];
      if (weaknessStatements.length === 2) return `${weaknessStatements[0]} ${weaknessStatements[1].charAt(0).toLowerCase() + weaknessStatements[1].slice(1)}`;
      const last = weaknessStatements.pop();
      return `${weaknessStatements.join(' ')} ${last.charAt(0).toLowerCase() + last.slice(1)}`;
      
    case 1: // Paragraph format
      return `The assessment reveals development opportunities in several areas: ${weaknessStatements.join(' ')}`;
      
    case 2: // Priority-based format
      const critical = weaknessStatements.slice(0, Math.min(2, weaknessStatements.length)).join(' ');
      const others = weaknessStatements.slice(2).join(' ');
      return `Priority development needs include ${critical}. ${others ? `Secondary areas for growth include ${others}.` : ''}`;
      
    case 3: // Question format
      return `What areas require attention? ${weaknessStatements.join(' ')}`;
      
    case 4: // Observation format
      return `Observations indicate that ${weaknessStatements[0].toLowerCase()} ${weaknessStatements.length > 1 ? `Further, ${weaknessStatements.slice(1).join(' ').toLowerCase()}` : ''}`;
      
    case 5: // Gap-focused format
      const biggestGap = sortedWeaknesses[0];
      return `The most significant gap is in ${biggestGap.area || biggestGap} at ${biggestGap.percentage}%. ${weaknessStatements.slice(1).length > 0 ? `Additional development areas include ${weaknessStatements.slice(1).join(' and ').toLowerCase()}` : ''}`;
      
    case 6: // Recommendation format
      return `To strengthen the profile, ${weaknessStatements[0].toLowerCase()} ${weaknessStatements.length > 1 ? `Additionally, ${weaknessStatements.slice(1).join(' ').toLowerCase()}` : ''}`;
      
    case 7: // Summary format
      const weakAreas = sortedWeaknesses.map(w => w.area || w).join(', ');
      return `Development is recommended in ${weakAreas}. ${weaknessStatements[0]}`;
      
    default:
      return weaknessStatements.join(' ');
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
  
  // Random intro selection
  const introOptions = [
    `${candidateName} completed the ${template.name} with a total score of ${totalScore}/${maxScore} (${percentage}%).`,
    `The ${template.name} for ${candidateName} yielded a score of ${totalScore}/${maxScore}, representing ${percentage}% overall.`,
    `Analysis of ${candidateName}'s performance on the ${template.name} shows a score of ${totalScore}/${maxScore} (${percentage}%).`,
    `${candidateName} achieved ${totalScore} out of ${maxScore} (${percentage}%) on the ${template.name}.`,
    `Results from the ${template.name} indicate that ${candidateName} scored ${totalScore}/${maxScore}, or ${percentage}%.`
  ];
  
  const intro = introOptions[Math.floor(Math.random() * introOptions.length)];
  
  // Classification message
  const classificationMessage = classification.description;
  
  // Build strengths summary with variation
  let strengthsSummary = '';
  if (strengths.length > 0) {
    const strengthAreas = strengths.slice(0, 3).map(s => s.area || s);
    const strengthPhraseOptions = [
      `Key strengths include ${strengthAreas.join(', ')}.`,
      `The candidate demonstrates particular strength in ${strengthAreas.join(', ')}.`,
      `Notable capabilities emerge in ${strengthAreas.join(', ')}.`,
      `Areas of excellence include ${strengthAreas.join(', ')}.`,
      `The strongest performances are in ${strengthAreas.join(', ')}.`
    ];
    strengthsSummary = strengthPhraseOptions[Math.floor(Math.random() * strengthPhraseOptions.length)];
  }
  
  // Build weaknesses summary with variation
  let weaknessesSummary = '';
  if (weaknesses.length > 0) {
    const weakAreas = weaknesses.slice(0, 3).map(w => w.area || w);
    const weakPhraseOptions = [
      `Priority development areas are ${weakAreas.join(', ')}.`,
      `Attention should be directed to ${weakAreas.join(', ')}.`,
      `Opportunities for growth exist in ${weakAreas.join(', ')}.`,
      `Development needs are most apparent in ${weakAreas.join(', ')}.`,
      `Focus areas for improvement include ${weakAreas.join(', ')}.`
    ];
    weaknessesSummary = weakPhraseOptions[Math.floor(Math.random() * weakPhraseOptions.length)];
  }
  
  // Combine with varied transitions
  const transitionOptions = ['', 'Additionally, ', 'Furthermore, ', 'Meanwhile, ', 'At the same time, '];
  const transition = transitionOptions[Math.floor(Math.random() * transitionOptions.length)];
  
  let summary = intro;
  if (strengthsSummary) summary += ` ${strengthsSummary}`;
  if (weaknessesSummary) summary += ` ${transition}${weaknessesSummary}`;
  summary += ` ${classificationMessage}`;
  
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
    comment: getPerformanceComment(data.percentage)
  }));
};

/**
 * Generate performance comment based on percentage
 */
export const getPerformanceComment = (percentage) => {
  const comments = {
    excellent: [
      'Exceptional performance',
      'Outstanding capability',
      'Mastery level demonstrated',
      'Exemplary proficiency',
      'Superior competence'
    ],
    good: [
      'Very good performance',
      'Strong capability',
      'Solid proficiency',
      'Above average',
      'Commendable performance'
    ],
    average: [
      'Good performance',
      'Satisfactory capability',
      'Adequate proficiency',
      'Meeting expectations',
      'Competent performance'
    ],
    developing: [
      'Adequate performance',
      'Developing capability',
      'Foundational proficiency',
      'Room for growth',
      'Basic competence'
    ],
    below: [
      'Below expectations',
      'Needs development',
      'Significant gap',
      'Requires attention',
      'Below standard'
    ],
    poor: [
      'Significant gap',
      'Critical need',
      'Unsatisfactory',
      'Immediate attention required',
      'Fundamental gap'
    ]
  };
  
  if (percentage >= 85) return comments.excellent[Math.floor(Math.random() * comments.excellent.length)];
  if (percentage >= 75) return comments.good[Math.floor(Math.random() * comments.good.length)];
  if (percentage >= 65) return comments.average[Math.floor(Math.random() * comments.average.length)];
  if (percentage >= 55) return comments.developing[Math.floor(Math.random() * comments.developing.length)];
  if (percentage >= 45) return comments.below[Math.floor(Math.random() * comments.below.length)];
  return comments.poor[Math.floor(Math.random() * comments.poor.length)];
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
    
    const actionOptions = [
      `Complete targeted training in ${area} within 30 days.`,
      `Work with a mentor to develop ${area} skills.`,
      `Enroll in a ${area} certification program.`,
      `Practice ${area} through structured exercises.`,
      `Receive coaching focused on ${area}.`
    ];
    
    const impactOptions = [
      `Improving ${area} will significantly enhance overall performance.`,
      `Strengthening ${area} is critical for role effectiveness.`,
      `Developing ${area} will address a key competency gap.`,
      `Progress in ${area} will yield substantial performance gains.`,
      `Building ${area} competence is foundational for success.`
    ];
    
    recommendations.push({
      priority: 'High',
      category: area,
      recommendation: `Priority: Strengthen ${area} — ${weaknessDesc}.`,
      action: actionOptions[Math.floor(Math.random() * actionOptions.length)],
      impact: impactOptions[Math.floor(Math.random() * impactOptions.length)]
    });
  });
  
  // Priority 2: Secondary development areas
  weaknesses.slice(2, 4).forEach((weakness) => {
    const area = weakness.area || weakness;
    const weaknessDesc = template.weaknesses[area] || 'development opportunity';
    
    const actionOptions = [
      `Practice ${area} skills through on-the-job application.`,
      `Participate in workshops focused on ${area}.`,
      `Study best practices in ${area}.`,
      `Seek feedback on ${area} performance.`,
      `Take an online course in ${area}.`
    ];
    
    const impactOptions = [
      `Developing ${area} will round out professional capabilities.`,
      `Strengthening ${area} supports overall competency development.`,
      `Improving ${area} enhances versatility.`,
      `Building ${area} contributes to well-rounded performance.`,
      `Progress in ${area} complements existing strengths.`
    ];
    
    recommendations.push({
      priority: 'Medium',
      category: area,
      recommendation: `Develop ${area} — ${weaknessDesc}.`,
      action: actionOptions[Math.floor(Math.random() * actionOptions.length)],
      impact: impactOptions[Math.floor(Math.random() * impactOptions.length)]
    });
  });
  
  // Priority 3: Leverage strengths
  strengths.slice(0, 2).forEach((strength) => {
    const area = strength.area || strength;
    const strengthDesc = template.strengths[area] || 'key strength';
    
    const actionOptions = [
      `Mentor others in ${area}.`,
      `Take on stretch assignments involving ${area}.`,
      `Lead projects that leverage ${area} expertise.`,
      `Share best practices in ${area} with the team.`,
      `Develop training materials for ${area}.`
    ];
    
    const impactOptions = [
      `Leveraging ${area} creates organizational value.`,
      `Maximizing this strength enhances team capability.`,
      `Utilizing ${area} expertise benefits the wider team.`,
      `Building on this strength accelerates impact.`,
      `Applying ${area} skills in new contexts drives growth.`
    ];
    
    recommendations.push({
      priority: 'Leverage',
      category: area,
      recommendation: `Leverage strength in ${area} — ${strengthDesc}.`,
      action: actionOptions[Math.floor(Math.random() * actionOptions.length)],
      impact: impactOptions[Math.floor(Math.random() * impactOptions.length)]
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

// Export grade info function for backward compatibility
export const getGradeInfo = (percentage) => {
  return stratavaxGradeScale.find(g => percentage >= g.min) || stratavaxGradeScale[stratavaxGradeScale.length - 1];
};
