// Category-specific interpretations based on score ranges
export const INTERPRETATIONS = {
  'Cognitive Abilities': {
    high: "Exceptional cognitive capabilities. Demonstrates superior analytical thinking, pattern recognition, and problem-solving abilities. Processes complex information quickly and makes sound decisions. Shows advanced reasoning skills suitable for strategic roles.",
    medium: "Good cognitive abilities with solid analytical and problem-solving skills. Handles complex information well and makes sound decisions. Shows good reasoning capabilities with room for further development.",
    low: "Developing cognitive abilities. May struggle with analytical tasks and complex problem-solving. Needs support and practice to build stronger reasoning skills. Would benefit from structured problem-solving frameworks."
  },
  
  'Personality Assessment': {
    high: "Outstanding interpersonal skills and emotional intelligence. Communicates effectively, builds strong relationships, and navigates complex social situations with ease. Highly self-aware and adaptable to different contexts.",
    medium: "Good interpersonal skills with solid emotional intelligence. Communicates well, builds positive relationships, and handles most social situations effectively. Self-aware with room for growth.",
    low: "Developing interpersonal skills. May have difficulty with communication or emotional awareness. Would benefit from targeted development in this area through workshops and coaching."
  },
  
  'Leadership Potential': {
    high: "Natural leadership qualities with strong vision and influence. Inspires others, develops talent effectively, and drives team success. Shows strategic thinking and ability to motivate others toward common goals.",
    medium: "Shows leadership potential with ability to influence and guide others. Can lead teams in familiar contexts and shows strategic thinking. Needs development for broader leadership responsibilities.",
    low: "Limited leadership qualities at this time. Shows some potential but needs significant development. May not be ready for leadership responsibilities without substantial support."
  },
  
  'Technical Competence': {
    high: "Expert-level technical knowledge and practical skills. Masters complex technical concepts, troubleshoots effectively, and applies knowledge to real-world situations. Stays current with industry developments.",
    medium: "Strong technical knowledge with good practical application skills. Handles most technical challenges effectively and applies concepts correctly. Shows solid understanding of core principles.",
    low: "Developing technical knowledge with gaps in understanding. Can perform basic tasks but struggles with more complex requirements. Needs additional training and hands-on practice."
  },
  
  'Performance Metrics': {
    high: "Exceptional productivity and goal achievement. Consistently exceeds targets, manages time effectively, and delivers high-quality work. Takes initiative and drives results with minimal supervision.",
    medium: "Good performance with consistent goal achievement. Meets or exceeds targets regularly, manages time well, and delivers quality work. Shows good initiative and reliability.",
    low: "Performance needs improvement. May struggle with productivity, quality, or consistency. Requires coaching, clear goals, and regular feedback to improve."
  },
  
  'Communication': {
    high: "Exceptional communicator. Expresses ideas clearly and persuasively, listens actively, and adapts communication style to different audiences. Excels in both written and verbal communication.",
    medium: "Good communicator. Expresses ideas clearly in most situations and listens well. Can improve in adapting to different audiences or handling difficult conversations.",
    low: "Developing communication skills. May struggle to express ideas clearly or listen effectively. Would benefit from communication skills training and practice."
  },
  
  'Teamwork': {
    high: "Outstanding team player. Collaborates effectively, builds consensus, and contributes to team success. Supports colleagues and handles conflicts constructively.",
    medium: "Good team player. Collaborates well in most situations and contributes to team goals. Can improve in handling conflicts or supporting others.",
    low: "Developing teamwork skills. May struggle with collaboration or conflict resolution. Needs guidance on effective team participation."
  },
  
  'Emotional Intelligence': {
    high: "Exceptional emotional intelligence. Self-aware, manages emotions effectively, and reads others well. Handles stress and interpersonal challenges with poise.",
    medium: "Good emotional intelligence. Shows self-awareness and manages emotions reasonably well. Can improve in reading others or handling stressful situations.",
    low: "Developing emotional intelligence. May struggle with self-awareness or emotion management. Would benefit from coaching and mindfulness practices."
  },
  
  'Adaptability': {
    high: "Highly adaptable. Embraces change, learns quickly, and adjusts approach as needed. Thrives in dynamic environments and handles uncertainty well.",
    medium: "Adapts reasonably well to change. Can adjust approach when needed but may prefer stability. Shows willingness to learn new things.",
    low: "Struggles with change and adaptability. Prefers routine and may resist new approaches. Needs support to develop flexibility."
  },
  
  'Equipment Operation': {
    high: "Expert equipment operator. Demonstrates mastery of all relevant machinery, follows safety protocols, and maintains equipment properly. Can train others on equipment use.",
    medium: "Proficient equipment operator. Handles most machinery competently, follows safety guidelines, and performs basic maintenance. Can improve with more practice.",
    low: "Developing equipment operation skills. Needs supervision when operating machinery. Requires additional training and practice."
  },
  
  'Safety Protocols': {
    high: "Exemplary safety practices. Always follows safety protocols, identifies hazards proactively, and promotes safe behavior in others. Strong safety advocate.",
    medium: "Good safety practices. Generally follows safety protocols and maintains awareness. Can improve in hazard identification or safety advocacy.",
    low: "Needs improvement in safety awareness. May overlook protocols or miss hazards. Requires safety training and closer supervision."
  },
  
  'Quality Control': {
    high: "Exceptional attention to quality. Consistently meets or exceeds quality standards, identifies defects, and suggests improvements. Strong quality advocate.",
    medium: "Good quality awareness. Generally meets quality standards and identifies obvious defects. Can improve in prevention and continuous improvement.",
    low: "Quality awareness needs development. May miss defects or struggle to meet standards. Needs training and regular quality checks."
  },
  
  'Values Alignment': {
    high: "Strong alignment with organizational values. Demonstrates integrity, respect, and commitment in all actions. Role model for company culture.",
    medium: "Good alignment with values. Generally demonstrates expected behaviors. Can strengthen consistency in value demonstration.",
    low: "Values alignment needs attention. May not consistently demonstrate expected behaviors. Needs coaching on organizational values."
  },
  
  'Work Ethic': {
    high: "Exceptional work ethic. Consistently goes above and beyond, takes ownership, and delivers quality work. Reliable and trustworthy.",
    medium: "Good work ethic. Generally reliable and takes responsibility. Can improve in consistency or going the extra mile.",
    low: "Work ethic needs development. May lack consistency or ownership. Needs clear expectations and accountability."
  },
  
  'Initiative': {
    high: "Exceptional initiative. Proactively identifies opportunities, takes action without waiting to be told, and drives improvements. Self-starter.",
    medium: "Shows initiative in familiar areas. Takes action when comfortable but may need prompting for new situations.",
    low: "Rarely shows initiative. Waits to be directed and avoids taking action independently. Needs encouragement and structured opportunities."
  }
};

// Generate interpretation based on category and score
export function interpretCategoryScore(category, score, maxScore = 5) {
  // Calculate percentage
  const percentage = typeof score === 'number' && maxScore 
    ? (score / maxScore) * 100 
    : score;
  
  const categoryData = INTERPRETATIONS[category];
  if (!categoryData) {
    return generateDefaultInterpretation(category, percentage);
  }

  if (percentage >= 80) {
    return {
      level: 'High',
      text: categoryData.high || categoryData.high || `Exceptional performance in ${category}.`,
      recommendations: getRecommendations(category, 'high')
    };
  } else if (percentage >= 60) {
    return {
      level: 'Medium',
      text: categoryData.medium || `Good performance in ${category} with room for growth.`,
      recommendations: getRecommendations(category, 'medium')
    };
  } else {
    return {
      level: 'Low',
      text: categoryData.low || `Needs development in ${category}. Focused attention required.`,
      recommendations: getRecommendations(category, 'low')
    };
  }
}

// Generate default interpretation for unknown categories
function generateDefaultInterpretation(category, percentage) {
  if (percentage >= 80) {
    return {
      level: 'High',
      text: `Strong performance in ${category}. Demonstrates capability in this area.`,
      recommendations: [`Continue to leverage strength in ${category}`]
    };
  } else if (percentage >= 60) {
    return {
      level: 'Medium',
      text: `Satisfactory performance in ${category}. Meets expectations with development areas.`,
      recommendations: [`Focus on developing ${category} through targeted practice`]
    };
  } else {
    return {
      level: 'Low',
      text: `Development needed in ${category}. Requires structured support and training.`,
      recommendations: [`Create development plan for ${category} with clear milestones`]
    };
  }
}

// Get recommendations based on category and performance level
export function getRecommendations(category, level) {
  const recommendations = {
    'Cognitive Abilities': {
      high: [
        'Assign complex problem-solving tasks',
        'Include in strategic planning sessions',
        'Consider for roles requiring analytical thinking',
        'Leverage as a resource for others'
      ],
      medium: [
        'Provide opportunities to work on progressively complex problems',
        'Offer analytical thinking workshops',
        'Assign a mentor for guidance',
        'Practice with case studies'
      ],
      low: [
        'Implement structured problem-solving training',
        'Provide clear frameworks and templates',
        'Pair with analytical thinkers for mentoring',
        'Break down complex tasks into steps'
      ]
    },
    
    'Leadership Potential': {
      high: [
        'Fast-track for leadership development programs',
        'Consider for team lead roles',
        'Assign mentoring responsibilities',
        'Include in succession planning'
      ],
      medium: [
        'Offer opportunities to lead small projects',
        'Provide leadership training',
        'Assign a leadership mentor',
        'Give exposure to leadership tasks'
      ],
      low: [
        'Start with basic leadership training',
        'Observe effective leaders',
        'Take on small coordination tasks',
        'Consider individual contributor path'
      ]
    },
    
    'Technical Competence': {
      high: [
        'Assign to complex technical projects',
        'Consider for technical lead roles',
        'Encourage knowledge sharing',
        'Support advanced certifications'
      ],
      medium: [
        'Provide technical training opportunities',
        'Work with experienced team members',
        'Assign stretch assignments',
        'Encourage hands-on practice'
      ],
      low: [
        'Create structured technical training plan',
        'Provide hands-on practice with supervision',
        'Consider formal certification programs',
        'Assign simple tasks to build confidence'
      ]
    },
    
    'Personality Assessment': {
      high: [
        'Utilize in client-facing roles',
        'Consider for team leadership',
        'Leverage in conflict resolution',
        'Include in collaboration-heavy projects'
      ],
      medium: [
        'Encourage participation in team projects',
        'Provide feedback on interactions',
        'Consider communication workshops',
        'Practice difficult conversations'
      ],
      low: [
        'Provide communication skills training',
        'Offer emotional intelligence workshops',
        'Practice role-playing exercises',
        'Seek coaching on interactions'
      ]
    },
    
    'Performance Metrics': {
      high: [
        'Recognize consistent high performance',
        'Consider for increased responsibility',
        'Have them model best practices',
        'Include in process improvement'
      ],
      medium: [
        'Set clear goals with check-ins',
        'Provide productivity coaching',
        'Offer time management training',
        'Track progress regularly'
      ],
      low: [
        'Implement daily check-ins',
        'Set smaller achievable goals',
        'Provide close coaching',
        'Create structured daily plans'
      ]
    }
  };

  // Return category-specific recommendations or defaults
  const categoryRecs = recommendations[category];
  if (categoryRecs && categoryRecs[level]) {
    return categoryRecs[level];
  }

  // Default recommendations
  const defaultRecs = {
    high: ['Continue to leverage this strength', 'Consider mentoring others in this area'],
    medium: ['Focus on targeted improvement in this area', 'Seek opportunities for practice'],
    low: ['Create structured development plan', 'Provide additional training and support']
  };

  return defaultRecs[level] || ['Review and discuss development needs'];
}

// Get overall assessment interpretation
export function interpretOverallScore(score, maxScore, assessmentType = 'general') {
  const percentage = (score / maxScore) * 100;
  
  if (assessmentType === 'general') {
    if (score >= 450) {
      return {
        summary: "Exceptional Overall Performance",
        description: "This candidate demonstrates exceptional capabilities across all areas. They are ready for senior roles and can be trusted with complex, high-stakes responsibilities. Their performance indicates strong potential for continued growth and leadership.",
        strengths: "Consistently high performance across all categories",
        focus: "Continue challenging with advanced responsibilities"
      };
    }
    if (score >= 400) {
      return {
        summary: "Outstanding Overall Performance",
        description: "An outstanding performer with clear strengths across multiple domains. This candidate shows strong potential for growth and should be considered for leadership development programs and increased responsibility.",
        strengths: "Strong performance in most areas with clear excellence in key categories",
        focus: "Target development in specific areas while leveraging strengths"
      };
    }
    if (score >= 350) {
      return {
        summary: "Strong Overall Performance",
        description: "A strong performer with identifiable areas for growth. With targeted development, this candidate could advance to higher levels of responsibility. They form a solid foundation for the organization.",
        strengths: "Good performance across categories with some standout areas",
        focus: "Focus development on specific categories for advancement"
      };
    }
    if (score >= 300) {
      return {
        summary: "Satisfactory Overall Performance",
        description: "A reliable performer who meets all core requirements. They can be counted on for consistent results and form the backbone of the organization. With development, they can grow further.",
        strengths: "Consistent performance meeting expectations",
        focus: "Identify and develop key areas for growth"
      };
    }
    if (score >= 250) {
      return {
        summary: "Developing Overall Performance",
        description: "Shows foundational skills but needs structured development. With proper guidance and training, this candidate can improve their capabilities. They show potential for growth.",
        strengths: "Basic competencies established",
        focus: "Structured development needed across multiple areas"
      };
    }
    if (score >= 200) {
      return {
        summary: "Emerging Overall Performance",
        description: "Early in their development journey. Needs comprehensive training and close supervision to build fundamental skills. With support, they can develop into solid performers.",
        strengths: "Willingness to learn and develop",
        focus: "Intensive development needed in most areas"
      };
    }
    return {
      summary: "Needs Significant Development",
      description: "Performance below expectations requiring immediate attention. Needs an intensive development plan and regular performance reviews to address critical gaps.",
      strengths: "Areas for immediate intervention identified",
      focus: "Critical development needed across all categories"
    };
  } else {
    // Specialized assessments
    if (percentage >= 90) {
      return {
        summary: "Exceptional Performance",
        description: "Demonstrates mastery in this assessment area. Could serve as a resource or mentor for others. Ready for advanced challenges in this domain.",
        strengths: "Mastery level understanding and application",
        focus: "Leverage expertise and consider mentoring role"
      };
    }
    if (percentage >= 80) {
      return {
        summary: "Advanced Performance",
        description: "Shows strong capabilities with minimal guidance needed. Ready for more challenging assignments in this area and potential to lead others.",
        strengths: "Strong command of the subject matter",
        focus: "Expand through advanced applications"
      };
    }
    if (percentage >= 70) {
      return {
        summary: "Proficient Performance",
        description: "Meets expectations and can work independently. Solid foundation to build upon for further growth and development.",
        strengths: "Solid understanding and independent capability",
        focus: "Reinforce and build through practice"
      };
    }
    if (percentage >= 60) {
      return {
        summary: "Developing Performance",
        description: "Shows potential but needs guidance. Would benefit from structured learning opportunities and mentoring in this area.",
        strengths: "Basic understanding established",
        focus: "Targeted development through guided practice"
      };
    }
    if (percentage >= 50) {
      return {
        summary: "Basic Performance",
        description: "Has fundamental understanding but requires supervision. Needs focused development and regular feedback to improve.",
        strengths: "Foundation established",
        focus: "Structured learning and supervised practice"
      };
    }
    return {
      summary: "Needs Improvement",
      description: "Significant gaps identified. Requires immediate intervention and a structured improvement plan with close supervision.",
      strengths: "Clear development areas identified",
      focus: "Intensive training and regular monitoring"
    };
  }
}

// Get interview questions based on assessment results
export function getInterviewQuestions(category, level) {
  const questions = {
    'Cognitive Abilities': {
      high: [
        "Tell me about a complex problem you solved. What was your approach?",
        "How do you approach strategic decision-making?",
        "Describe a time you had to analyze large amounts of data."
      ],
      medium: [
        "Walk me through how you approach problem-solving.",
        "Give an example of a time you had to think critically.",
        "How do you evaluate different options before deciding?"
      ],
      low: [
        "What steps do you take when faced with a new problem?",
        "Tell me about a time someone helped you solve a difficult problem.",
        "How do you ensure you understand a problem before solving it?"
      ]
    },
    
    'Leadership Potential': {
      high: [
        "Describe your leadership philosophy and how you've applied it.",
        "Tell me about a time you developed someone on your team.",
        "How do you inspire and motivate others?"
      ],
      medium: [
        "Describe a time you led a project or initiative.",
        "How do you handle team conflicts?",
        "What's your approach to giving feedback?"
      ],
      low: [
        "What does leadership mean to you?",
        "Tell me about a time you helped a colleague.",
        "How do you handle working in a team?"
      ]
    }
  };

  const categoryQuestions = questions[category];
  if (categoryQuestions && categoryQuestions[level]) {
    return categoryQuestions[level];
  }

  // Default questions
  return [
    "Tell me about your experience in this area.",
    "What do you consider your strengths in this area?",
    "How do you approach development in areas needing improvement?"
  ];
}

// Get development resources based on category
export function getDevelopmentResources(category) {
  const resources = {
    'Cognitive Abilities': [
      'Critical thinking workshops',
      'Problem-solving case studies',
      'Analytical thinking courses',
      'Strategic planning seminars'
    ],
    'Leadership Potential': [
      'Leadership development programs',
      'Mentoring opportunities',
      'Management training',
      'Executive coaching'
    ],
    'Technical Competence': [
      'Technical certification programs',
      'Hands-on workshops',
      'Industry conferences',
      'Online learning platforms'
    ],
    'Personality Assessment': [
      'Communication skills training',
      'Emotional intelligence workshops',
      'Team building activities',
      'Conflict resolution courses'
    ],
    'Performance Metrics': [
      'Time management training',
      'Productivity tools workshop',
      'Goal setting seminars',
      'Performance coaching'
    ]
  };

  return resources[category] || [
    'Online courses in this area',
    'Mentoring from experienced colleagues',
    'Hands-on practice opportunities',
    'Workshops and training sessions'
  ];
}
