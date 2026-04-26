/**
 * PROFESSIONAL COMMENTARY ENGINE
 * Generates rich, narrative commentary for assessment results
 * Each commentary is unique and reads like a consultant wrote it
 */

// ===== MANUFACTURING-SPECIFIC COMMENTARY =====

const getManufacturingCriticalGapCommentary = (area, percentage) => {
  const templates = {
    'Technical Fundamentals': [
      `Technical Fundamentals at ${percentage}% indicates a critical gap in foundational manufacturing knowledge. Without immediate intervention, this candidate will struggle with basic equipment operation and maintenance concepts. Priority training in core maintenance principles, sensor functions, and motor operation is essential.`,
      `The ${percentage}% score in Technical Fundamentals represents a significant barrier to production readiness. The candidate requires intensive foundational training before being placed in roles requiring equipment interaction.`
    ],
    'Troubleshooting': [
      `Troubleshooting capability at ${percentage}% is critically low. The candidate shows limited ability to diagnose production issues, which will lead to extended downtime when problems occur. Structured training in systematic problem-solving and diagnostic approaches is urgently needed.`,
      `At ${percentage}%, the candidate lacks the diagnostic skills necessary for independent problem resolution. Close supervision and guided troubleshooting practice are essential for development.`
    ],
    'Numerical Aptitude': [
      `Numerical Aptitude at ${percentage}% presents a significant challenge for production roles requiring calculations, reporting, and data interpretation. Foundational numeracy training should be prioritized before placing the candidate in roles with quantitative demands.`,
      `The ${percentage}% score indicates the candidate would struggle with production metrics, efficiency calculations, and quality documentation. Basic math skills need immediate attention.`
    ],
    'Safety & Work Ethic': [
      `Safety awareness at ${percentage}% is critically low and represents an immediate concern for manufacturing environments. Comprehensive safety training and close supervision are non-negotiable before the candidate can work independently.`,
      `At ${percentage}%, the candidate shows insufficient understanding of workplace safety requirements. This gap must be addressed before any production responsibilities can be assigned.`
    ]
  };
  
  const areaTemplates = templates[area];
  if (areaTemplates && areaTemplates.length > 0) {
    return areaTemplates[Math.floor(Math.random() * areaTemplates.length)];
  }
  return criticalGapCommentary(area, percentage);
};

const getManufacturingStrengthCommentary = (area, percentage) => {
  const templates = {
    'Technical Fundamentals': [
      `Technical Fundamentals at ${percentage}% demonstrates strong foundational knowledge. The candidate shows good understanding of maintenance principles, equipment operation, and system functions—making them well-suited for production roles.`,
      `The ${percentage}% score in Technical Fundamentals indicates solid mechanical aptitude. This strength provides a reliable foundation for equipment handling and basic troubleshooting.`
    ],
    'Troubleshooting': [
      `Troubleshooting capability at ${percentage}% is a notable strength. The candidate demonstrates systematic problem-solving skills that will help minimize production interruptions when issues arise.`,
      `At ${percentage}%, the candidate shows strong diagnostic ability. This strength positions them to handle common production issues independently and support others in problem resolution.`
    ],
    'Numerical Aptitude': [
      `Numerical Aptitude at ${percentage}% is a clear strength. The candidate can confidently handle production calculations, quality metrics, and efficiency reporting—valuable skills for manufacturing roles.`,
      `The ${percentage}% score indicates strong quantitative ability. The candidate will be effective in roles requiring data tracking, production reporting, and numerical analysis.`
    ],
    'Safety & Work Ethic': [
      `Safety awareness at ${percentage}% is exceptional. The candidate demonstrates strong understanding of PPE requirements, safety protocols, and professional conduct—essential qualities for manufacturing environments.`,
      `At ${percentage}%, the candidate shows excellent safety consciousness. This strength provides confidence in their ability to work safely and serve as a safety role model.`
    ]
  };
  
  const areaTemplates = templates[area];
  if (areaTemplates && areaTemplates.length > 0) {
    return areaTemplates[Math.floor(Math.random() * areaTemplates.length)];
  }
  return strengthCommentary(area, percentage);
};

// ===== SCORE-BASED COMMENTARY TEMPLATES =====

const criticalGapCommentary = (area, percentage) => {
  const templates = [
    `${area} presents a critical development priority at ${percentage}%. This significant gap will likely impede performance in roles requiring these capabilities. Immediate, structured intervention is essential to build foundational competence.`,
    
    `At ${percentage}%, ${area} represents a substantial weakness that requires urgent attention. Without targeted development, this gap will continue to impact overall effectiveness and may create risks in role performance.`,
    
    `The score of ${percentage}% in ${area} indicates fundamental challenges that must be addressed. This area should be prioritized for intensive coaching and structured skill-building exercises.`,
    
    `${area} emerges as a critical vulnerability with a score of ${percentage}%. This level of performance suggests limited exposure to or understanding of core concepts in this domain. A comprehensive development plan with clear milestones is recommended.`,
    
    `With only ${percentage}% proficiency, ${area} requires immediate remediation. This gap is substantial enough to warrant dedicated focus in the development plan, with regular progress monitoring and targeted learning interventions.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

const significantGapCommentary = (area, percentage) => {
  const templates = [
    `${area} shows significant development needs at ${percentage}%. While foundational awareness may exist, the candidate would benefit substantially from structured learning opportunities and guided practice in this area.`,
    
    `At ${percentage}%, ${area} represents a notable gap that should be addressed in the development plan. Focused training and practical application will help build competence and confidence in this domain.`,
    
    `The ${percentage}% score in ${area} indicates that this competency requires strengthening. With targeted support and deliberate practice, meaningful improvement can be achieved over the next 3-6 months.`,
    
    `${area} emerges as a development priority with a score of ${percentage}%. The candidate demonstrates basic awareness but needs structured guidance to translate this into applied capability.`,
    
    `Performance in ${area} at ${percentage}% suggests gaps in both knowledge and application. A combination of formal training and mentored practice would accelerate development in this area.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

const developingCommentary = (area, percentage) => {
  const templates = [
    `${area} is developing with a score of ${percentage}%. The candidate shows foundational understanding and would benefit from continued practice and exposure to increasingly complex applications.`,
    
    `At ${percentage}%, ${area} demonstrates emerging competence. With structured support and real-world application, this area can be strengthened to meet role expectations within 6-12 months.`,
    
    `The ${percentage}% score in ${area} indicates that the candidate has established basic competence but would benefit from targeted development to reach full proficiency.`,
    
    `${area} shows promising foundations at ${percentage}%. Continued development through practical application and feedback will help solidify these skills.`,
    
    `Performance in ${area} at ${percentage}% suggests the candidate is on a positive trajectory. Focused practice and exposure to varied situations will accelerate progress toward proficiency.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

const approachingProficiencyCommentary = (area, percentage) => {
  const templates = [
    `${area} is approaching expected levels at ${percentage}%. The candidate demonstrates solid understanding and would benefit from fine-tuning through practical application and feedback.`,
    
    `At ${percentage}%, ${area} shows good foundational strength. With continued experience and occasional guidance, this area should reach full proficiency.`,
    
    `The ${percentage}% score in ${area} indicates that the candidate is close to meeting expectations. Targeted refinement and application in real-world contexts will bridge the remaining gap.`,
    
    `${area} is nearly at proficiency with a score of ${percentage}%. The candidate demonstrates competence and would benefit from opportunities to apply these skills in varied contexts.`,
    
    `Performance in ${area} at ${percentage}% suggests solid capability. Fine-tuning through feedback and exposure to complex situations will elevate this area to strength status.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

const proficientCommentary = (area, percentage) => {
  const templates = [
    `${area} meets expectations at ${percentage}%. The candidate demonstrates reliable capability and can perform independently in this area.`,
    
    `At ${percentage}%, ${area} shows solid competence. The candidate can be trusted to handle typical demands in this domain with minimal guidance.`,
    
    `The ${percentage}% score in ${area} indicates satisfactory performance. This provides a foundation that can be built upon for future growth.`,
    
    `${area} demonstrates expected capability at ${percentage}%. The candidate has established a reliable skill set in this area.`,
    
    `Performance in ${area} at ${percentage}% meets role requirements. Continued application will further consolidate these skills.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

const strengthCommentary = (area, percentage) => {
  const templates = [
    `${area} is a clear strength at ${percentage}%. The candidate demonstrates strong capability that can be leveraged for impact. This area exceeds expectations and represents a reliable asset.`,
    
    `At ${percentage}%, ${area} stands out as a notable strength. The candidate shows advanced capability that distinguishes them from peers. This competency can be leveraged for greater responsibility.`,
    
    `The ${percentage}% score in ${area} indicates exceptional performance. This strength provides a foundation for taking on stretch assignments and mentoring others.`,
    
    `${area} emerges as a significant strength with a score of ${percentage}%. The candidate demonstrates sophisticated understanding and application in this domain.`,
    
    `Performance in ${area} at ${percentage}% is exceptional. This represents a competitive advantage that should be leveraged in role placement and development opportunities.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

const exceptionalCommentary = (area, percentage) => {
  const templates = [
    `${area} is exceptional at ${percentage}%. The candidate demonstrates mastery that far exceeds expectations. This level of capability is rare and positions them as a potential subject matter expert or mentor in this domain.`,
    
    `At ${percentage}%, ${area} represents elite performance. The candidate shows sophisticated understanding and application that distinguishes them as a top talent in this area.`,
    
    `The ${percentage}% score in ${area} indicates mastery-level capability. This is a significant asset that should be leveraged for organizational impact and knowledge sharing.`,
    
    `${area} is a standout strength at ${percentage}%. The candidate demonstrates exceptional proficiency that can be leveraged for mentoring others and leading complex initiatives.`,
    
    `Performance in ${area} at ${percentage}% is extraordinary. This level of capability suggests deep expertise that can drive significant value in roles requiring these competencies.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// ===== STRENGTH SUMMARY COMMENTARY =====

export const generateStrengthsSummary = (strengths, topStrengths) => {
  if (strengths.length === 0) {
    const templates = [
      "The assessment did not identify any areas scoring above the 80% proficiency threshold. While the candidate demonstrates functional capability across competencies, there are no standout strengths to leverage at this time. Development efforts should focus on building foundational skills across all areas.",
      
      "No significant strengths emerged from this assessment. Performance is consistent but without exceptional peaks in any domain. This suggests a profile that would benefit from broad-based development before specialization.",
      
      "The candidate's performance does not reveal any areas of exceptional strength. The profile shows consistent, moderate performance across competencies, indicating that foundational development should be the initial priority."
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  const templates = [
    `The candidate demonstrates notable strengths in ${topStrengths.join(', ')}. These areas represent reliable assets that can be leveraged for impact. Performance in these domains exceeds expectations and provides a foundation for taking on increased responsibility.`,
    
    `Key strengths emerge in ${topStrengths.join(', ')}. These competencies distinguish the candidate and should be considered when identifying opportunities for contribution and growth.`,
    
    `${topStrengths.join(', ')} stand out as areas of relative strength. The candidate shows advanced capability in these domains, which can be leveraged to add value while developing other areas.`,
    
    `The candidate's strongest performances are in ${topStrengths.join(', ')}. These areas demonstrate capability beyond the expected level and provide a platform for further development and contribution.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// ===== WEAKNESS SUMMARY COMMENTARY =====

export const generateWeaknessesSummary = (weaknesses, topWeaknesses, overallPercentage) => {
  if (weaknesses.length === 0) {
    const templates = [
      "The candidate meets or exceeds expectations across all assessed areas. No significant development gaps were identified, indicating readiness for roles requiring these competencies.",
      
      "Performance is consistently strong with no critical gaps detected. The candidate demonstrates adequate capability across all assessed dimensions.",
      
      "All areas meet expected performance levels. Development should focus on building upon existing strengths rather than addressing specific gaps."
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  const templates = [
    `Priority development areas include ${topWeaknesses.join(', ')}. These competencies show the greatest gap relative to expectations and should be the focus of the development plan. Addressing these areas will have the most significant impact on overall effectiveness.`,
    
    `The assessment identifies development needs in ${topWeaknesses.join(', ')}. These areas present the most immediate opportunities for growth and should be prioritized in the development journey.`,
    
    `${topWeaknesses.join(', ')} emerge as the primary development areas. Targeted intervention in these competencies will yield the greatest return on development investment.`,
    
    `Focus should be directed toward strengthening ${topWeaknesses.join(', ')}. These areas show the most significant gap between current and expected performance.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// ===== OVERALL PROFILE COMMENTARY =====

export const generateProfileCommentary = (percentage, classification, strengths, weaknesses) => {
  const strengthCount = strengths.length;
  const weaknessCount = weaknesses.length;
  
  if (percentage >= 85) {
    const templates = [
      `This profile reflects exceptional capability with ${strengthCount} identified strengths and only ${weaknessCount} minor development areas. The candidate demonstrates readiness for increased responsibility and strategic challenges.`,
      
      `At ${percentage}%, this performance places the candidate in the exceptional range. The profile shows mastery across multiple competencies with minimal development needs.`,
      
      `The candidate presents as high-potential talent with a strong foundation for advancement. The combination of ${strengthCount} strengths and limited development areas suggests readiness for challenging assignments.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (percentage >= 70) {
    const templates = [
      `This profile shows solid performance with ${strengthCount} identified strengths and ${weaknessCount} development areas. The candidate demonstrates reliable capability with clear opportunities for strategic growth.`,
      
      `At ${percentage}%, the candidate performs solidly with consistent capability across key areas. Development efforts should leverage existing strengths to address identified gaps.`,
      
      `The profile reveals a strong performer with ${strengthCount} areas of relative strength and ${weaknessCount} areas for development. This balanced profile suggests readiness for roles with moderate complexity.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (percentage >= 55) {
    const templates = [
      `This profile shows foundational competence with ${weaknessCount} identified development areas. The candidate has building-block skills that can be strengthened through targeted development.`,
      
      `At ${percentage}%, the candidate demonstrates developing capability. The ${weaknessCount} development areas represent opportunities for growth that should be addressed through structured learning.`,
      
      `The profile reveals a developing performer with clear opportunities for growth. Focused attention on the ${weaknessCount} priority areas will accelerate progress toward full proficiency.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  const templates = [
    `This profile indicates significant development needs with ${weaknessCount} areas requiring attention. Structured intervention and close supervision are recommended to build foundational capabilities.`,
    
    `At ${percentage}%, the candidate shows substantial gaps that need immediate attention. A comprehensive development plan with clear milestones and regular progress monitoring is essential.`,
    
    `The profile reveals critical development needs across multiple areas. Intensive support and structured learning experiences are required to build fundamental competence.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// ===== MANUFACTURING-SPECIFIC PROFILE COMMENTARY =====

const generateManufacturingProfileCommentaryFn = (percentage, categories) => {
  const safetyScore = categories['Safety & Work Ethic'] || 0;
  const techScore = categories['Technical Fundamentals'] || 0;
  
  if (percentage >= 80 && safetyScore >= 80 && techScore >= 70) {
    const templates = [
      `This candidate demonstrates strong readiness for manufacturing roles. With exceptional safety awareness and solid technical fundamentals, they are well-prepared for production environments.`,
      `The profile indicates strong manufacturing baseline competence. The candidate combines good technical knowledge with excellent safety consciousness—essential qualities for production success.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (safetyScore < 50) {
    const templates = [
      `Safety awareness is the most critical concern in this profile. Before any production responsibilities, the candidate requires comprehensive safety training and close supervision.`,
      `This profile highlights safety as a significant gap. The candidate's score in safety awareness indicates insufficient understanding of PPE requirements and safety protocols—an immediate development priority.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (techScore < 50) {
    const templates = [
      `Technical fundamentals require significant development. The candidate needs foundational training in equipment operation and maintenance principles before independent production work.`,
      `This profile shows technical knowledge as a primary development need. Structured training in core manufacturing concepts will be essential to build baseline competence.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  const templates = [
    `This candidate shows foundational readiness for manufacturing environments. With a ${percentage}% overall score, they have established baseline knowledge while demonstrating clear development areas.`,
    `The profile reveals a developing manufacturing baseline. The candidate meets minimum requirements in some areas but would benefit from structured training to build competence in others.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// ===== MAIN EXPORT FUNCTION =====

export const generateCommentary = (area, percentage, type = 'weakness', assessmentType = null) => {
  // Check if this is a manufacturing baseline assessment
  const isManufacturing = assessmentType === 'manufacturing_baseline' || 
                          area === 'Technical Fundamentals' || 
                          area === 'Troubleshooting' || 
                          area === 'Numerical Aptitude' || 
                          area === 'Safety & Work Ethic';
  
  if (type === 'strength') {
    if (percentage >= 90) {
      if (isManufacturing) return getManufacturingStrengthCommentary(area, percentage);
      return exceptionalCommentary(area, percentage);
    }
    if (percentage >= 80) {
      if (isManufacturing) return getManufacturingStrengthCommentary(area, percentage);
      return strengthCommentary(area, percentage);
    }
    if (isManufacturing && (area === 'Safety & Work Ethic' || area === 'Technical Fundamentals')) {
      return getManufacturingStrengthCommentary(area, percentage);
    }
    return proficientCommentary(area, percentage);
  } else {
    if (percentage < 30) {
      if (isManufacturing) return getManufacturingCriticalGapCommentary(area, percentage);
      return criticalGapCommentary(area, percentage);
    }
    if (percentage < 40) {
      if (isManufacturing && area === 'Safety & Work Ethic') return getManufacturingCriticalGapCommentary(area, percentage);
      return significantGapCommentary(area, percentage);
    }
    if (percentage < 50) {
      if (isManufacturing) return getManufacturingCriticalGapCommentary(area, percentage);
      return developingCommentary(area, percentage);
    }
    if (percentage < 60) return approachingProficiencyCommentary(area, percentage);
    if (percentage < 70) return proficientCommentary(area, percentage);
    if (isManufacturing) return getManufacturingStrengthCommentary(area, percentage);
    return strengthCommentary(area, percentage);
  }
};

// Export manufacturing-specific function
export const generateManufacturingProfileCommentary = generateManufacturingProfileCommentaryFn;
