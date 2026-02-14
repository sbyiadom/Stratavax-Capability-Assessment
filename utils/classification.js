// Classification based on assessment type and score
export function classifyTalent(score, assessmentType = 'general', maxScore = null) {
  // If maxScore is provided, calculate percentage
  const percentage = maxScore ? Math.round((score / maxScore) * 100) : score;
  
  // Handle different assessment types
  switch(assessmentType) {
    case 'general':
      return classifyGeneralAssessment(score);
    
    case 'leadership':
    case 'cognitive':
    case 'technical':
    case 'personality':
    case 'performance':
    case 'behavioral':
    case 'manufacturing':
    case 'cultural':
      return classifySpecializedAssessment(percentage);
    
    default:
      return classifyByPercentage(percentage);
  }
}

// General assessment (500 points scale)
export function classifyGeneralAssessment(score) {
  if (score >= 450) return {
    label: "Elite Talent",
    level: 5,
    color: "#2E7D32",
    description: "Exceptional performer demonstrating mastery across all categories. Ready for senior roles and complex challenges."
  };
  if (score >= 400) return {
    label: "Top Talent",
    level: 4,
    color: "#4CAF50",
    description: "Outstanding performer with clear strengths across multiple domains. Shows strong leadership potential."
  };
  if (score >= 350) return {
    label: "High Potential",
    level: 3,
    color: "#2196F3",
    description: "Strong performer with clear development areas. Shows promise for growth and advancement."
  };
  if (score >= 300) return {
    label: "Solid Performer",
    level: 2,
    color: "#FF9800",
    description: "Reliable and consistent performer meeting core requirements. Good foundation to build upon."
  };
  if (score >= 250) return {
    label: "Developing Talent",
    level: 1,
    color: "#9C27B0",
    description: "Shows foundational skills with clear development needs. Requires structured guidance."
  };
  if (score >= 200) return {
    label: "Emerging Talent",
    level: 0,
    color: "#795548",
    description: "Early-stage performer requiring significant development. Needs comprehensive training."
  };
  return {
    label: "Needs Improvement",
    level: -1,
    color: "#F44336",
    description: "Performance below expectations requiring immediate attention. Needs intensive development plan."
  };
}

// Specialized assessments (percentage based)
export function classifySpecializedAssessment(percentage) {
  if (percentage >= 90) return {
    label: "Exceptional",
    level: 5,
    color: "#2E7D32",
    description: "Exceptional performance. Demonstrates mastery and could mentor others in this area."
  };
  if (percentage >= 80) return {
    label: "Advanced",
    level: 4,
    color: "#4CAF50",
    description: "Advanced proficiency. Strong capabilities with minimal guidance needed."
  };
  if (percentage >= 70) return {
    label: "Proficient",
    level: 3,
    color: "#2196F3",
    description: "Proficient. Meets expectations and can work independently."
  };
  if (percentage >= 60) return {
    label: "Developing",
    level: 2,
    color: "#FF9800",
    description: "Developing competence. Shows potential with some guidance needed."
  };
  if (percentage >= 50) return {
    label: "Basic",
    level: 1,
    color: "#9C27B0",
    description: "Basic understanding. Requires supervision and structured learning."
  };
  if (percentage >= 40) return {
    label: "Novice",
    level: 0,
    color: "#795548",
    description: "Novice level. Needs significant training and close supervision."
  };
  return {
    label: "Needs Improvement",
    level: -1,
    color: "#F44336",
    description: "Fundamental gaps identified. Requires immediate intervention and basic training."
  };
}

// Generic classification by percentage
export function classifyByPercentage(percentage) {
  if (percentage >= 90) return {
    label: "Excellent",
    level: 5,
    color: "#2E7D32"
  };
  if (percentage >= 80) return {
    label: "Very Good",
    level: 4,
    color: "#4CAF50"
  };
  if (percentage >= 70) return {
    label: "Good",
    level: 3,
    color: "#2196F3"
  };
  if (percentage >= 60) return {
    label: "Satisfactory",
    level: 2,
    color: "#FF9800"
  };
  if (percentage >= 50) return {
    label: "Adequate",
    level: 1,
    color: "#9C27B0"
  };
  return {
    label: "Needs Improvement",
    level: -1,
    color: "#F44336"
  };
}

// Get classification color
export function getClassificationColor(classification) {
  const colorMap = {
    "Elite Talent": "#2E7D32",
    "Top Talent": "#4CAF50",
    "High Potential": "#2196F3",
    "Solid Performer": "#FF9800",
    "Developing Talent": "#9C27B0",
    "Emerging Talent": "#795548",
    "Exceptional": "#2E7D32",
    "Advanced": "#4CAF50",
    "Proficient": "#2196F3",
    "Developing": "#FF9800",
    "Basic": "#9C27B0",
    "Novice": "#795548",
    "Needs Improvement": "#F44336",
    "Excellent": "#2E7D32",
    "Very Good": "#4CAF50",
    "Good": "#2196F3",
    "Satisfactory": "#FF9800",
    "Adequate": "#9C27B0"
  };
  
  return colorMap[classification] || "#666666";
}

// Get classification badge style
export function getClassificationBadgeStyle(classification) {
  const color = getClassificationColor(classification);
  return {
    backgroundColor: `${color}15`,
    color: color,
    border: `1px solid ${color}30`,
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600'
  };
}

// Generate classification description
export function getClassificationDescription(classification, assessmentType = 'general') {
  const descriptions = {
    "Elite Talent": "This candidate demonstrates exceptional capabilities across all areas. They are ready for senior roles and can be trusted with complex, high-stakes responsibilities.",
    "Top Talent": "An outstanding performer with clear strengths. This candidate shows strong potential for growth and should be considered for leadership development programs.",
    "High Potential": "A strong performer with identifiable areas for growth. With targeted development, this candidate could advance to higher levels of responsibility.",
    "Solid Performer": "A reliable performer who meets all core requirements. They form the backbone of the organization and can be counted on for consistent results.",
    "Developing Talent": "Shows foundational skills but needs structured development. With proper guidance and training, this candidate can improve their capabilities.",
    "Emerging Talent": "Early in their development journey. Needs comprehensive training and close supervision to build fundamental skills.",
    "Exceptional": "Demonstrates mastery in this assessment area. Could serve as a resource or mentor for others.",
    "Advanced": "Shows strong capabilities with minimal guidance needed. Ready for more challenging assignments in this area.",
    "Proficient": "Meets expectations and can work independently. Solid foundation to build upon.",
    "Developing": "Shows potential but needs guidance. Would benefit from structured learning opportunities.",
    "Basic": "Has fundamental understanding but requires supervision. Needs focused development in this area.",
    "Novice": "At the beginning of the learning curve. Requires significant training and close supervision.",
    "Needs Improvement": "Significant gaps identified. Requires immediate intervention and a structured improvement plan."
  };
  
  return descriptions[classification] || "Performance level requires review and targeted development.";
}

// Get next steps based on classification
export function getNextSteps(classification) {
  const nextSteps = {
    "Elite Talent": [
      "Consider for senior or strategic roles",
      "Assign as mentor for developing talent",
      "Provide advanced leadership opportunities",
      "Include in succession planning"
    ],
    "Top Talent": [
      "Enroll in leadership development program",
      "Assign stretch assignments",
      "Provide executive coaching",
      "Fast-track for promotion consideration"
    ],
    "High Potential": [
      "Create personalized development plan",
      "Assign mentor for guidance",
      "Provide targeted training opportunities",
      "Give exposure to cross-functional projects"
    ],
    "Solid Performer": [
      "Reinforce strengths through recognition",
      "Identify areas for skill enhancement",
      "Provide ongoing training opportunities",
      "Consider for team lead roles"
    ],
    "Developing Talent": [
      "Create structured development plan",
      "Assign experienced mentor",
      "Provide basic skills training",
      "Set clear, achievable goals"
    ],
    "Emerging Talent": [
      "Enroll in foundational training programs",
      "Assign buddy for daily guidance",
      "Provide frequent feedback",
      "Set short-term improvement goals"
    ],
    "Exceptional": [
      "Leverage as subject matter expert",
      "Assign mentoring responsibilities",
      "Provide advanced training opportunities",
      "Consider for specialist roles"
    ],
    "Advanced": [
      "Assign challenging projects",
      "Provide cross-training opportunities",
      "Consider for lead roles",
      "Offer advanced certifications"
    ],
    "Proficient": [
      "Reinforce through practical application",
      "Provide ongoing skill updates",
      "Consider for expanded responsibilities",
      "Offer refresher training as needed"
    ],
    "Developing": [
      "Provide structured training",
      "Assign practice opportunities",
      "Offer coaching and feedback",
      "Set progressive skill goals"
    ],
    "Basic": [
      "Provide foundational training",
      "Assign simple tasks for practice",
      "Offer regular check-ins",
      "Consider remedial courses"
    ],
    "Novice": [
      "Provide intensive training",
      "Assign close supervision",
      "Break down tasks into steps",
      "Set very short-term goals"
    ],
    "Needs Improvement": [
      "Develop intensive improvement plan",
      "Provide one-on-one coaching",
      "Set weekly progress reviews",
      "Consider role reassessment"
    ]
  };
  
  return nextSteps[classification] || [
    "Review assessment results in detail",
    "Schedule feedback session with candidate",
    "Create personalized development plan",
    "Set clear performance expectations"
  ];
}

// Determine if candidate is ready for promotion
export function isPromotionReady(classification, assessmentType = 'general') {
  const readyForPromotion = [
    "Elite Talent",
    "Top Talent",
    "Exceptional",
    "Advanced"
  ];
  
  const considerationForPromotion = [
    "High Potential",
    "Proficient"
  ];
  
  if (readyForPromotion.includes(classification)) {
    return { ready: true, timeline: "Immediate", confidence: "High" };
  }
  
  if (considerationForPromotion.includes(classification)) {
    return { ready: false, timeline: "6-12 months", confidence: "Medium" };
  }
  
  return { ready: false, timeline: "12+ months", confidence: "Low" };
}

// Get development priority
export function getDevelopmentPriority(classification) {
  const priorityMap = {
    "Elite Talent": "Low",
    "Top Talent": "Low",
    "High Potential": "Medium",
    "Solid Performer": "Medium",
    "Developing Talent": "High",
    "Emerging Talent": "High",
    "Exceptional": "Low",
    "Advanced": "Low",
    "Proficient": "Medium",
    "Developing": "High",
    "Basic": "High",
    "Novice": "Critical",
    "Needs Improvement": "Critical"
  };
  
  return priorityMap[classification] || "Medium";
}
