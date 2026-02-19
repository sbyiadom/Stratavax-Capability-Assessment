/**
 * Universal Category Mapper
 * Maps categories from different assessment types to interpretation domains
 */

// Category definitions by assessment type
export const assessmentTypeDefinitions = {
  'general': {
    name: 'General Assessment',
    description: 'Comprehensive evaluation of overall capabilities',
    categories: {
      'Cognitive Ability': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Strong analytical and strategic thinking capabilities',
          medium: 'Moderate cognitive abilities suitable for most roles',
          low: 'Cognitive limitations that may impact complex problem-solving'
        }
      },
      'Communication': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Essential',
        interpretation: {
          high: 'Excellent communication skills - articulate and persuasive',
          medium: 'Adequate communication for team collaboration',
          low: 'Communication challenges that may affect influence'
        }
      },
      'Cultural & Attitudinal Fit': {
        domain: 'cultural',
        weight: 'foundational',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Strong cultural alignment and positive attitude',
          medium: 'Generally aligned with some adaptation needed',
          low: 'Potential cultural mismatch requiring attention'
        }
      },
      'Emotional Intelligence': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Critical for leadership',
        interpretation: {
          high: 'High emotional intelligence - self-aware and empathetic',
          medium: 'Moderate emotional awareness with room to grow',
          low: 'Emotional intelligence gaps affecting relationships'
        }
      },
      'Ethics & Integrity': {
        domain: 'values',
        weight: 'foundational',
        leadershipRelevance: 'Non-negotiable',
        interpretation: {
          high: 'Strong ethical foundation - trustworthy and principled',
          medium: 'Generally ethical but may need guidance in gray areas',
          low: 'Ethical concerns requiring attention'
        }
      },
      'Leadership & Management': {
        domain: 'leadership',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Strong leadership potential - strategic and influential',
          medium: 'Emerging leadership capabilities',
          low: 'Leadership skills need significant development'
        }
      },
      'Performance Metrics': {
        domain: 'operational',
        weight: 'moderate',
        leadershipRelevance: 'Important for results',
        interpretation: {
          high: 'Results-driven with strong accountability',
          medium: 'Can meet targets with guidance',
          low: 'Needs development in goal-setting and accountability'
        }
      },
      'Personality & Behavioral': {
        domain: 'behavioral',
        weight: 'moderate',
        leadershipRelevance: 'Influences team dynamics',
        interpretation: {
          high: 'Stable, resilient, and adaptable',
          medium: 'Generally stable but not high-impact',
          low: 'Behavioral concerns affecting performance'
        }
      },
      'Problem-Solving': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Strong problem-solving - systematic and creative',
          medium: 'Can solve routine problems effectively',
          low: 'Struggles with complex problem-solving'
        }
      },
      'Technical & Manufacturing': {
        domain: 'technical',
        weight: 'role-specific',
        leadershipRelevance: 'Domain expertise',
        interpretation: {
          high: 'Strong technical expertise - domain expert',
          medium: 'Solid technical foundation',
          low: 'Technical knowledge gaps requiring training'
        }
      }
    }
  },
  
  'leadership': {
    name: 'Leadership Assessment',
    description: 'Evaluation of leadership potential and capabilities',
    categories: {
      'Change Leadership & Agility': {
        domain: 'leadership',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Exceptional change leadership - adapts and drives transformation',
          medium: 'Can manage change with support',
          low: 'Struggles with change and adaptation'
        }
      },
      'Communication & Influence': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Essential',
        interpretation: {
          high: 'Powerful communicator who influences effectively',
          medium: 'Good communicator with developing influence',
          low: 'Communication and influence need development'
        }
      },
      'Cultural Alignment': {
        domain: 'cultural',
        weight: 'foundational',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Strong cultural ambassador - models values',
          medium: 'Generally aligned with culture',
          low: 'Cultural misalignment risk'
        }
      },
      'Cultural Competence & Inclusivity': {
        domain: 'cultural',
        weight: 'high',
        leadershipRelevance: 'Critical for modern leadership',
        interpretation: {
          high: 'Champions diversity and inclusion effectively',
          medium: 'Aware of diversity but needs development',
          low: 'Limited cultural competence'
        }
      },
      'Decision-Making & Problem-Solving': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Decisive and analytical - makes sound judgments',
          medium: 'Makes reasonable decisions with input',
          low: 'Decision-making needs significant improvement'
        }
      },
      'Derailer Identification': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Critical awareness',
        interpretation: {
          high: 'Self-aware - recognizes and manages derailers',
          medium: 'Some awareness of derailers',
          low: 'Limited self-awareness of derailers'
        }
      },
      'Empathy & Relationship Building': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Essential',
        interpretation: {
          high: 'Builds strong, trusting relationships',
          medium: 'Good relationship builder',
          low: 'Struggles with relationship building'
        }
      },
      'Execution & Results Orientation': {
        domain: 'operational',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Drives results with disciplined execution',
          medium: 'Delivers results with guidance',
          low: 'Execution and results need improvement'
        }
      },
      'Integrated Leadership Judgment': {
        domain: 'leadership',
        weight: 'high',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Exceptional judgment - balances multiple factors',
          medium: 'Sound judgment in most situations',
          low: 'Judgment concerns in complex situations'
        }
      },
      'Learning Agility': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Essential for growth',
        interpretation: {
          high: 'Rapid learner - adapts quickly to new situations',
          medium: 'Learns at a steady pace',
          low: 'Learning agility needs development'
        }
      },
      'People Management & Coaching': {
        domain: 'leadership',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Develops and coaches others effectively',
          medium: 'Adequate people manager',
          low: 'People management skills need development'
        }
      },
      'Resilience & Stress Management': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Highly resilient - thrives under pressure',
          medium: 'Manages stress adequately',
          low: 'Stress management concerns'
        }
      },
      'Role Readiness': {
        domain: 'career',
        weight: 'moderate',
        leadershipRelevance: 'Readiness indicator',
        interpretation: {
          high: 'Ready for increased responsibility now',
          medium: 'Ready with some development',
          low: 'Needs more experience before promotion'
        }
      },
      'Self-Awareness & Self-Regulation': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Essential',
        interpretation: {
          high: 'Highly self-aware and well-regulated',
          medium: 'Good self-awareness',
          low: 'Limited self-awareness'
        }
      },
      'Values & Drivers': {
        domain: 'values',
        weight: 'foundational',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Values strongly aligned with leadership',
          medium: 'Generally aligned values',
          low: 'Values misalignment risk'
        }
      },
      'Vision & Strategic Thinking': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Strategic thinker with compelling vision',
          medium: 'Good strategic thinking',
          low: 'Strategic thinking needs development'
        }
      }
    }
  },
  
  'cognitive': {
    name: 'Cognitive Ability Assessment',
    description: 'Evaluation of analytical and reasoning capabilities',
    categories: {
      'Logical / Abstract Reasoning': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Strong logical reasoning - excellent pattern recognition',
          medium: 'Good logical reasoning abilities',
          low: 'Logical reasoning needs development'
        }
      },
      'Mechanical Reasoning': {
        domain: 'technical',
        weight: 'moderate',
        leadershipRelevance: 'Role-specific',
        interpretation: {
          high: 'Strong mechanical understanding',
          medium: 'Good mechanical aptitude',
          low: 'Mechanical reasoning needs improvement'
        }
      },
      'Memory & Attention': {
        domain: 'cognitive',
        weight: 'moderate',
        leadershipRelevance: 'Supporting',
        interpretation: {
          high: 'Excellent memory and attention to detail',
          medium: 'Good memory and focus',
          low: 'Memory and attention concerns'
        }
      },
      'Numerical Reasoning': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Important for analytical roles',
        interpretation: {
          high: 'Strong numerical reasoning - comfortable with data',
          medium: 'Good numerical skills',
          low: 'Numerical reasoning needs development'
        }
      },
      'Perceptual Speed & Accuracy': {
        domain: 'cognitive',
        weight: 'moderate',
        leadershipRelevance: 'Supporting',
        interpretation: {
          high: 'Fast and accurate - excellent attention',
          medium: 'Good speed and accuracy',
          low: 'Processing speed concerns'
        }
      },
      'Spatial Reasoning': {
        domain: 'cognitive',
        weight: 'moderate',
        leadershipRelevance: 'Role-specific',
        interpretation: {
          high: 'Strong spatial reasoning',
          medium: 'Good spatial skills',
          low: 'Spatial reasoning needs improvement'
        }
      },
      'Verbal Reasoning': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Strong verbal reasoning - excellent comprehension',
          medium: 'Good verbal skills',
          low: 'Verbal reasoning needs development'
        }
      }
    }
  },
  
  'technical': {
    name: 'Technical Competence Assessment',
    description: 'Evaluation of technical knowledge and skills',
    categories: {
      'CIP & Maintenance': {
        domain: 'technical',
        weight: 'high',
        leadershipRelevance: 'Domain expertise',
        interpretation: {
          high: 'Strong CIP and maintenance expertise',
          medium: 'Good understanding of CIP processes',
          low: 'CIP knowledge needs development'
        }
      },
      'Conveyors & Line Efficiency': {
        domain: 'technical',
        weight: 'high',
        leadershipRelevance: 'Domain expertise',
        interpretation: {
          high: 'Expert in conveyor systems and line efficiency',
          medium: 'Good understanding of line operations',
          low: 'Conveyor knowledge needs improvement'
        }
      },
      'Filling & Bottling': {
        domain: 'technical',
        weight: 'high',
        leadershipRelevance: 'Domain expertise',
        interpretation: {
          high: 'Expert in filling and bottling processes',
          medium: 'Good understanding of filling operations',
          low: 'Filling process knowledge needs development'
        }
      },
      'Packaging & Labeling': {
        domain: 'technical',
        weight: 'high',
        leadershipRelevance: 'Domain expertise',
        interpretation: {
          high: 'Strong packaging and labeling expertise',
          medium: 'Good understanding of packaging',
          low: 'Packaging knowledge needs improvement'
        }
      },
      'Safety & Efficiency': {
        domain: 'technical',
        weight: 'foundational',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Strong safety focus and efficiency mindset',
          medium: 'Good safety awareness',
          low: 'Safety knowledge needs development'
        }
      },
      'Water Treatment & Quality': {
        domain: 'technical',
        weight: 'high',
        leadershipRelevance: 'Domain expertise',
        interpretation: {
          high: 'Expert in water treatment and quality control',
          medium: 'Good understanding of water quality',
          low: 'Water treatment knowledge needs improvement'
        }
      }
    }
  },
  
  'performance': {
    name: 'Performance Assessment',
    description: 'Evaluation of performance management capabilities',
    categories: {
      'Employee Engagement and Behavior': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Important for people management',
        interpretation: {
          high: 'Strong at engaging and motivating teams',
          medium: 'Good understanding of engagement',
          low: 'Engagement skills need development'
        }
      },
      'Financial and Operational Performance': {
        domain: 'operational',
        weight: 'high',
        leadershipRelevance: 'Critical for business acumen',
        interpretation: {
          high: 'Strong financial and operational understanding',
          medium: 'Good business acumen',
          low: 'Financial knowledge needs improvement'
        }
      },
      'Goal Achievement and Strategic Alignment': {
        domain: 'strategic',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Excellent at goal setting and strategic alignment',
          medium: 'Good understanding of goals',
          low: 'Goal achievement needs development'
        }
      },
      'Productivity and Efficiency': {
        domain: 'operational',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Highly productive and efficiency-focused',
          medium: 'Good productivity',
          low: 'Productivity needs improvement'
        }
      },
      'Work Quality and Effectiveness': {
        domain: 'operational',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Consistently high-quality work',
          medium: 'Good work quality',
          low: 'Quality concerns need attention'
        }
      }
    }
  },
  
  'cultural': {
    name: 'Cultural & Attitudinal Fit Assessment',
    description: 'Evaluation of cultural alignment and attitude',
    categories: {
      'Attitude': {
        domain: 'behavioral',
        weight: 'foundational',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Positive attitude - adaptable and motivated',
          medium: 'Generally positive attitude',
          low: 'Attitude concerns need attention'
        }
      },
      'Core Values': {
        domain: 'values',
        weight: 'foundational',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Strong values alignment - principled',
          medium: 'Generally aligned with values',
          low: 'Values misalignment risk'
        }
      },
      'Environmental Fit': {
        domain: 'cultural',
        weight: 'moderate',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Excellent environmental fit',
          medium: 'Good fit with environment',
          low: 'Environmental mismatch concerns'
        }
      },
      'Interpersonal': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Strong interpersonal skills',
          medium: 'Good with people',
          low: 'Interpersonal skills need development'
        }
      },
      'Leadership': {
        domain: 'leadership',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Strong leadership potential',
          medium: 'Emerging leadership',
          low: 'Leadership needs development'
        }
      },
      'Work Style': {
        domain: 'behavioral',
        weight: 'moderate',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Effective work style - adaptable and productive',
          medium: 'Good work habits',
          low: 'Work style concerns'
        }
      }
    }
  },
  
  'personality': {
    name: 'Personality Assessment',
    description: 'Evaluation of personality traits and behavioral patterns',
    categories: {
      'Agreeableness': {
        domain: 'interpersonal',
        weight: 'moderate',
        leadershipRelevance: 'Team dynamics',
        interpretation: {
          high: 'Highly agreeable - collaborative and cooperative',
          medium: 'Generally agreeable',
          low: 'May be perceived as difficult'
        }
      },
      'Behavioral Style': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Adaptable behavioral style - flexible',
          medium: 'Consistent behavioral patterns',
          low: 'Behavioral rigidity concerns'
        }
      },
      'Cognitive Patterns': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Flexible thinking - creative and adaptable',
          medium: 'Pragmatic thinking style',
          low: 'Rigid thinking patterns'
        }
      },
      'Conscientiousness': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Highly conscientious - organized and reliable',
          medium: 'Generally conscientious',
          low: 'Organization and reliability concerns'
        }
      },
      'Emotional Intelligence': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'High emotional intelligence - self-aware',
          medium: 'Moderate emotional awareness',
          low: 'Emotional intelligence gaps'
        }
      },
      'Extraversion': {
        domain: 'interpersonal',
        weight: 'moderate',
        leadershipRelevance: 'Team dynamics',
        interpretation: {
          high: 'Extraverted - energized by interaction',
          medium: 'Balanced social approach',
          low: 'Introverted - may need solo work'
        }
      },
      'Integrity': {
        domain: 'values',
        weight: 'foundational',
        leadershipRelevance: 'Non-negotiable',
        interpretation: {
          high: 'High integrity - trustworthy',
          medium: 'Generally ethical',
          low: 'Integrity concerns'
        }
      },
      'Mixed Traits': {
        domain: 'behavioral',
        weight: 'moderate',
        leadershipRelevance: 'Contextual',
        interpretation: {
          high: 'Well-balanced personality',
          medium: 'Typical personality profile',
          low: 'Extreme traits that may impact work'
        }
      },
      'Motivations': {
        domain: 'values',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Strong intrinsic motivation',
          medium: 'Appropriately motivated',
          low: 'Motivation concerns'
        }
      },
      'Neuroticism': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Stress management',
        interpretation: {
          high: 'Emotionally stable - handles pressure well',
          medium: 'Generally stable',
          low: 'Emotional volatility concerns'
        }
      },
      'Openness to Experience': {
        domain: 'cognitive',
        weight: 'moderate',
        leadershipRelevance: 'Innovation',
        interpretation: {
          high: 'Open to new ideas - innovative',
          medium: 'Open to change',
          low: 'Resistant to new approaches'
        }
      },
      'Performance Risks': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Risk identification',
        interpretation: {
          high: 'Low performance risk',
          medium: 'Some performance risks',
          low: 'Significant performance risks'
        }
      },
      'Stress Management': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Excellent stress management',
          medium: 'Adequate stress handling',
          low: 'Stress vulnerability'
        }
      },
      'Work Pace': {
        domain: 'behavioral',
        weight: 'moderate',
        leadershipRelevance: 'Productivity',
        interpretation: {
          high: 'Fast-paced and productive',
          medium: 'Sustainable work pace',
          low: 'Work pace concerns'
        }
      }
    }
  },
  
  'behavioral': {
    name: 'Behavioral & Soft Skills Assessment',
    description: 'Evaluation of behavioral competencies and soft skills',
    categories: {
      'Adaptability': {
        domain: 'behavioral',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Highly adaptable - thrives on change',
          medium: 'Adapts with support',
          low: 'Struggles with change'
        }
      },
      'Clinical': {
        domain: 'specialized',
        weight: 'role-specific',
        leadershipRelevance: 'Specialized',
        interpretation: {
          high: 'Strong clinical understanding',
          medium: 'Good clinical awareness',
          low: 'Clinical knowledge needs development'
        }
      },
      'Collaboration': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Excellent collaborator - team player',
          medium: 'Works well in teams',
          low: 'Collaboration challenges'
        }
      },
      'Communication Style': {
        domain: 'interpersonal',
        weight: 'high',
        leadershipRelevance: 'Important',
        interpretation: {
          high: 'Effective communicator - adaptable style',
          medium: 'Clear communicator',
          low: 'Communication style concerns'
        }
      },
      'Decision-Making': {
        domain: 'cognitive',
        weight: 'high',
        leadershipRelevance: 'Critical',
        interpretation: {
          high: 'Sound decision-making - considers options',
          medium: 'Makes reasonable decisions',
          low: 'Decision-making needs improvement'
        }
      },
      'FBA': {
        domain: 'specialized',
        weight: 'role-specific',
        leadershipRelevance: 'Specialized',
        interpretation: {
          high: 'Strong FBA understanding',
          medium: 'Good FBA knowledge',
          low: 'FBA needs development'
        }
      },
      'Leadership': {
        domain: 'leadership',
        weight: 'high',
        leadershipRelevance: 'Core',
        interpretation: {
          high: 'Natural leader - inspires others',
          medium: 'Emerging leader',
          low: 'Leadership potential needs development'
        }
      }
    }
  }
};

// Domain-based interpretation templates
const domainInterpretations = {
  'cognitive': {
    name: 'Cognitive & Analytical',
    leadershipRelevance: 'Critical for strategic thinking and problem-solving',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'cognitive').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong cognitive capabilities - handles complexity well';
      if (avg >= 50) return 'Moderate cognitive abilities - suitable for most roles';
      return 'Cognitive development needed - may struggle with complexity';
    }
  },
  'interpersonal': {
    name: 'Interpersonal & Communication',
    leadershipRelevance: 'Essential for collaboration and influence',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'interpersonal').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong interpersonal skills - builds relationships effectively';
      if (avg >= 50) return 'Good interpersonal abilities - works well with others';
      return 'Interpersonal skills need development';
    }
  },
  'leadership': {
    name: 'Leadership & Management',
    leadershipRelevance: 'Core leadership competencies',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'leadership').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong leadership potential - ready for increased responsibility';
      if (avg >= 50) return 'Emerging leadership capabilities - good foundation';
      return 'Leadership skills need significant development';
    }
  },
  'operational': {
    name: 'Operational & Execution',
    leadershipRelevance: 'Important for results delivery',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'operational').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong operational focus - delivers results';
      if (avg >= 50) return 'Good operational capabilities';
      return 'Operational execution needs improvement';
    }
  },
  'technical': {
    name: 'Technical & Domain Expertise',
    leadershipRelevance: 'Role-specific knowledge',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'technical').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong technical expertise - domain expert';
      if (avg >= 50) return 'Good technical foundation';
      return 'Technical knowledge needs development';
    }
  },
  'values': {
    name: 'Values & Ethics',
    leadershipRelevance: 'Foundational for trust',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'values').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong values alignment - trustworthy';
      if (avg >= 50) return 'Generally aligned with values';
      return 'Values misalignment concerns';
    }
  },
  'behavioral': {
    name: 'Behavioral & Work Style',
    leadershipRelevance: 'Influences team dynamics',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'behavioral').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong behavioral profile - stable and adaptable';
      if (avg >= 50) return 'Good behavioral patterns';
      return 'Behavioral concerns need attention';
    }
  },
  'cultural': {
    name: 'Cultural & Attitudinal Fit',
    leadershipRelevance: 'Important for alignment',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'cultural').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong cultural fit - values aligned';
      if (avg >= 50) return 'Generally good cultural fit';
      return 'Cultural alignment concerns';
    }
  },
  'strategic': {
    name: 'Strategic & Vision',
    leadershipRelevance: 'Critical for direction-setting',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'strategic').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Strong strategic thinking - sees big picture';
      if (avg >= 50) return 'Good strategic awareness';
      return 'Strategic thinking needs development';
    }
  },
  'career': {
    name: 'Career & Readiness',
    leadershipRelevance: 'Readiness indicator',
    overall: (scores) => {
      const avg = scores.filter(s => s.domain === 'career').reduce((a, b) => a + b.score, 0) / scores.length;
      if (avg >= 70) return 'Ready for advancement';
      if (avg >= 50) return 'Ready with support';
      return 'Needs more experience';
    }
  }
};

// Main universal interpretation function
export const generateUniversalInterpretation = (assessmentType, candidateName, scores, strengths, weaknesses, overallPercentage) => {
  // Get assessment definition
  const assessmentDef = assessmentTypeDefinitions[assessmentType] || assessmentTypeDefinitions.general;
  
  // Build category interpretations
  const categoryInterpretations = {};
  const domainScores = {};
  
  Object.entries(scores).forEach(([category, score]) => {
    const categoryDef = assessmentDef.categories[category];
    if (!categoryDef) return;
    
    let level = 'low';
    if (score >= 70) level = 'high';
    else if (score >= 50) level = 'medium';
    
    categoryInterpretations[category] = {
      score,
      level,
      interpretation: categoryDef.interpretation[level],
      domain: categoryDef.domain,
      weight: categoryDef.weight,
      leadershipRelevance: categoryDef.leadershipRelevance
    };
    
    // Aggregate domain scores
    if (!domainScores[categoryDef.domain]) {
      domainScores[categoryDef.domain] = [];
    }
    domainScores[categoryDef.domain].push(score);
  });
  
  // Calculate domain averages
  const domainAverages = {};
  Object.entries(domainScores).forEach(([domain, scores]) => {
    domainAverages[domain] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });
  
  // Generate domain summaries
  const domainSummaries = {};
  Object.entries(domainAverages).forEach(([domain, avg]) => {
    const domainDef = domainInterpretations[domain];
    if (domainDef) {
      let level = 'low';
      if (avg >= 70) level = 'high';
      else if (avg >= 50) level = 'medium';
      
      domainSummaries[domain] = {
        average: Math.round(avg),
        level,
        name: domainDef.name,
        leadershipRelevance: domainDef.leadershipRelevance,
        summary: domainDef.overall([{ domain, score: avg }])
      };
    }
  });
  
  // Generate overall profile summary
  const allScores = Object.values(scores);
  const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const criticalLow = allScores.filter(s => s < 50).length;
  const strongHigh = allScores.filter(s => s >= 70).length;
  
  let profileType = '';
  let profileDescription = '';
  
  if (criticalLow >= 4) {
    profileType = 'Development Priority';
    profileDescription = 'This candidate has significant development needs across multiple areas. Requires intensive support and structured training.';
  } else if (strongHigh >= 5 && criticalLow <= 1) {
    profileType = 'High-Performer';
    profileDescription = 'This candidate demonstrates strong capabilities across most areas. Ready for challenging roles and increased responsibility.';
  } else if (strongHigh >= 3) {
    profileType = 'Solid Performer';
    profileDescription = 'This candidate shows solid performance with clear strengths and some development areas. Good potential for growth.';
  } else if (avgScore >= 60) {
    profileType = 'Developing Performer';
    profileDescription = 'This candidate has foundational skills with identified development areas. Requires targeted support to reach potential.';
  } else {
    profileType = 'Entry-Level Foundation';
    profileDescription = 'This candidate is building foundational skills. Requires structured development and close supervision.';
  }
  
  // Generate suitability assessment
  const suitability = [];
  const concerns = [];
  
  if (criticalLow >= 3) {
    concerns.push('Multiple critical gaps - not suitable for complex roles without development');
  }
  if (domainAverages['cognitive'] < 50) {
    concerns.push('Limited cognitive capacity for strategic roles');
  }
  if (domainAverages['leadership'] < 50) {
    concerns.push('Leadership potential needs significant development');
  }
  if (domainAverages['interpersonal'] < 50) {
    concerns.push('Interpersonal skills may impact team dynamics');
  }
  if (domainAverages['values'] < 70) {
    concerns.push('Values alignment requires attention');
  }
  
  if (strongHigh >= 3) {
    suitability.push('Leverage strengths in challenging assignments');
  }
  if (domainAverages['operational'] >= 70) {
    suitability.push('Well-suited for operational and execution-focused roles');
  }
  if (domainAverages['technical'] >= 70) {
    suitability.push('Strong fit for technical specialist positions');
  }
  if (domainAverages['leadership'] >= 70 && domainAverages['cognitive'] >= 70) {
    suitability.push('Ready for leadership development programs');
  }
  
  return {
    assessmentName: assessmentDef.name,
    assessmentDescription: assessmentDef.description,
    candidateName,
    overallScore: overallPercentage,
    profileType,
    profileDescription,
    categoryInterpretations,
    domainSummaries,
    strengths: strengths.map(s => ({
      area: s.area || s,
      percentage: s.percentage || scores[s.area || s]
    })),
    weaknesses: weaknesses.map(w => ({
      area: w.area || w,
      percentage: w.percentage || scores[w.area || w]
    })),
    suitability: suitability.length > 0 ? suitability : ['Standard role placement with development support'],
    concerns: concerns.length > 0 ? concerns : ['No significant concerns identified'],
    developmentFocus: weaknesses.slice(0, 3).map(w => w.area || w),
    criticalAreas: allScores.filter(s => s < 50).length,
    strongAreas: allScores.filter(s => s >= 70).length
  };
};
