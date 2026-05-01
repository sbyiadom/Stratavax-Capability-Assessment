// utils/assessmentConfigs.js

/**
 * ASSESSMENT Culture Fit", * ASSESSMENT TYPE CONFIGURATIONS
        maxScore: 50,
        aliases: ["Company Culture Fit"]
      },
      {
        id: "diversity",
        name: "Diversity Awareness",
        maxScore: 50,
        aliases: ["Diversity Awareness"]
      },
      {
        id: "inclusivity",
        name: "Inclusivity",
        maxScore: 50,
        aliases: ["Inclusivity"]
      },
      {
        id: "respect",
        name: "Respect",
        maxScore: 50,
        aliases: ["Respect"]
      },
      {
        id: "integrity",
        name: "Integrity",
        maxScore: 50,
        aliases: ["Integrity"]
      },
      {
        id: "conduct",
        name: "Professional Conduct",
        maxScore: 50,
        aliases: ["Professional Conduct"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  manufacturing_baseline: {
    id: "manufacturing_baseline",
    name: "Manufacturing Baseline Assessment",
    description:
      "Entry-level assessment for new manufacturing hires covering technical fundamentals, troubleshooting basics, numerical aptitude, and workplace safety.",
    icon: "🏭",
    gradient_start: "#2E7D32",
    gradient_end: "#1B5E20",
    categories: [
      {
        id: "technical_fundamentals",
        name: "Technical Fundamentals",
        maxScore: 20,
        description:
          "Basic knowledge of maintenance, sensors, motors, pneumatics, and mechanical systems",
        aliases: ["Technical Fundamentals"]
      },
      {
        id: "troubleshooting",
        name: "Troubleshooting",
        maxScore: 25,
        description:
          "Problem identification, conveyor issues, filler problems, labeler alignment, jams",
        aliases: ["Troubleshooting"]
      },
      {
        id: "numerical_aptitude",
        name: "Numerical Aptitude",
        maxScore: 25,
        description:
          "Math calculations, percentages, sequences, ratios, and production rates",
        aliases: ["Numerical Aptitude"]
      },
      {
        id: "safety_attitude",
        name: "Safety & Work Ethic",
        maxScore: 30,
        description:
          "PPE, safety reporting, SOP compliance, teamwork, and ethical behavior",
        aliases: ["Safety & Work Ethic", "Safety &amp; Work Ethic"]
      }
    ],
    weightage:
      "Category contribution is based on allocated question count and scoring distribution. Category maxScore values represent normalized reporting weights.",
    performanceBands: sharedPerformanceBands,
    passThreshold: 70,
    timeLimit: 180,
    totalQuestions: 100,
    rawMaxScore: 500,
    normalizedMaxScore: 100,
    descriptionDetailed:
      "The Manufacturing Baseline Assessment evaluates foundational knowledge required for new manufacturing hires. Topics include basic equipment understanding, common troubleshooting, numerical reasoning, and workplace safety. This assessment is designed for entry-level manufacturing positions to establish a baseline of technical and safety competency.",
    whatItMeasures: {
      technical_fundamentals:
        "Measures basic understanding of maintenance practices, sensor functions, motor operation, pneumatic systems, lubrication principles, and mechanical components.",
      troubleshooting:
        "Evaluates ability to identify common production issues, diagnose conveyor problems, resolve filler and labeler malfunctions, handle bottle jams, and respond to sensor and PLC faults.",
      numerical_aptitude:
        "Assesses mathematical ability including calculations, percentages, sequences, ratios, efficiency calculations, and production rate determination.",
      safety_attitude:
        "Evaluates knowledge of PPE requirements, safety reporting protocols, compliance with SOPs, teamwork capabilities, ethical judgment, and professional conduct."
    },
    targetAudience:
      "Entry-level manufacturing new hires, production associates, line operators, and maintenance trainees",
    recommendedFor: [
      "Production Line Operators",
      "Manufacturing Associates",
      "Quality Control Technicians",
      "Maintenance Trainees",
      "Packaging Operators",
      "Filling Line Operators"
    ],
    readinessRules: {
      production_line_operator: {
        label: "Production Line Operator",
        minimumOverall: 70,
        requiredCategories: {
          safety_attitude: 70,
          technical_fundamentals: 60,
          troubleshooting: 55
        },
        supervision:
          "Standard onboarding if thresholds are met; increased supervision if any required category is below threshold.",
        ifBelow:
          "Assign safety refresher, equipment familiarization, and supervised line exposure before independent production placement."
      },
      quality_control_technician: {
        label: "Quality Control Technician",
        minimumOverall: 70,
        requiredCategories: {
          safety_attitude: 65,
          numerical_aptitude: 70,
          troubleshooting: 60
        },
        supervision:
          "Supervised quality checks and production tracking before independent QC tasks.",
        ifBelow:
          "Provide production math, quality documentation, and basic troubleshooting practice."
      },
      maintenance_trainee: {
        label: "Maintenance Trainee",
        minimumOverall: 65,
        requiredCategories: {
          technical_fundamentals: 70,
          troubleshooting: 65,
          safety_attitude: 65
        },
        supervision:
          "Close technical supervision with guided practical exposure.",
        ifBelow:
          "Begin with foundational maintenance, equipment basics, and structured diagnostic training."
      },
      packaging_operator: {
        label: "Packaging Operator",
        minimumOverall: 65,
        requiredCategories: {
          safety_attitude: 70,
          technical_fundamentals: 55,
          troubleshooting: 55
        },
        supervision:
          "Supervised packaging-line onboarding and SOP reinforcement.",
        ifBelow:
          "Provide SOP training, safety reinforcement, and guided line observation before independent assignment."
      }
    }
  }
};

// ======================================================
// HELPERS
// ======================================================

export const getAssessmentType = (typeId) => {
  return assessmentTypes[typeId] || assessmentTypes.general;
};

export const getAssessmentCategories = (typeId) => {
  return getAssessmentType(typeId).categories || [];
};

export const getAssessmentPerformanceBands = (typeId) => {
  return getAssessmentType(typeId).performanceBands || sharedPerformanceBands;
};

export const getManufacturingBaselineCategories = () => {
  return assessmentTypes.manufacturing_baseline?.categories || [];
};

export const getManufacturingBaselineInfo = () => {
  return assessmentTypes.manufacturing_baseline || null;
};

export const getManufacturingReadinessRules = () => {
  return assessmentTypes.manufacturing_baseline?.readinessRules || {};
};

export const getPersonalityTraits = () => {
  return assessmentTypes.personality.categories;
};

export const getStrategicLeadershipDimensions = () => {
  return assessmentTypes.strategic_leadership.categories;
};

export const getPersonalityTraitDescription = (traitId) => {
  const trait = assessmentTypes.personality.categories.find(
    (category) => category.id === traitId || category.name === traitId
  );

  return trait ? trait.description : "";
};

export const getStrategicLeadershipDimensionDescription = (dimensionId) => {
  const dimension = assessmentTypes.strategic_leadership.categories.find(
    (category) => category.id === dimensionId || category.name === dimensionId
  );

  return dimension ? dimension.description : "";
};

export const findCategoryByNameOrAlias = (assessmentTypeId, categoryName) => {
  const assessment = getAssessmentType(assessmentTypeId);
  const normalizedName = String(categoryName || "")
    .replace(/&amp;/g, "&")
    .trim()
    .toLowerCase();

  return assessment.categories.find((category) => {
    const names = [category.name, ...(category.aliases || [])];

    return names.some(
      (name) =>
        String(name || "")
          .replace(/&amp;/g, "&")
          .trim()
          .toLowerCase() === normalizedName
    );
  });
};

export const getCategoryIdFromName = (assessmentTypeId, categoryName) => {
  const category = findCategoryByNameOrAlias(assessmentTypeId, categoryName);
  return category?.id || null;
};

export const getCategoryDisplayName = (assessmentTypeId, categoryNameOrId) => {
  const assessment = getAssessmentType(assessmentTypeId);

  const found = assessment.categories.find((category) => {
    return (
      category.id === categoryNameOrId ||
      category.name === categoryNameOrId ||
      (category.aliases || []).includes(categoryNameOrId)
    );
  });

  return found?.name || categoryNameOrId;
};

export const getPersonalityProfileClassification = (
  ownership,
  collaboration,
  action,
  analysis,
  risk,
  structure
) => {
  if (ownership >= 75 && action >= 65) {
    return assessmentTypes.personality.profileClassifications[
      "High Ownership Leader"
    ];
  }

  if (collaboration >= 75 && structure >= 65) {
    return assessmentTypes.personality.profileClassifications[
      "Collaborative Stabilizer"
    ];
  }

  if (action >= 75 && risk >= 65) {
    return assessmentTypes.personality.profileClassifications[
      "Risk Driver / Executor"
    ];
  }

  if (analysis >= 75 && structure >= 65) {
    return assessmentTypes.personality.profileClassifications[
      "Analytical Thinker"
    ];
  }

  return assessmentTypes.personality.profileClassifications[
    "Balanced Professional"
  ];
};

export const getStrategicLeadershipProfile = (
  visionStrategy,
  peopleLeadership,
  decisionMaking,
  accountability,
  emotionalIntelligence,
  executionDrive,
  ethics
) => {
  if (
    visionStrategy >= 75 &&
    peopleLeadership >= 75 &&
    decisionMaking >= 75
  ) {
    return assessmentTypes.strategic_leadership.profileClassifications[
      "🏆 Strategic Leader"
    ];
  }

  if (peopleLeadership >= 80 && emotionalIntelligence >= 70) {
    return assessmentTypes.strategic_leadership.profileClassifications[
      "👥 People-Focused Leader"
    ];
  }

  if (executionDrive >= 80 && accountability >= 70) {
    return assessmentTypes.strategic_leadership.profileClassifications[
      "⚡ Execution Leader"
    ];
  }

  if (visionStrategy >= 80) {
    return assessmentTypes.strategic_leadership.profileClassifications[
      "🔭 Visionary Leader"
    ];
  }

  if (ethics >= 80) {
    return assessmentTypes.strategic_leadership.profileClassifications[
      "⚖️ Ethical Leader"
    ];
  }

  if (
    visionStrategy >= 65 &&
    peopleLeadership >= 65 &&
    executionDrive >= 65
  ) {
    return assessmentTypes.strategic_leadership.profileClassifications[
      "⚖️ Balanced Leader"
    ];
  }

  return assessmentTypes.strategic_leadership.profileClassifications[
    "📈 Developing Leader"
  ];
};

export default {
  assessmentTypes,
  sharedPerformanceBands,
  getAssessmentType,
  getAssessmentCategories,
  getAssessmentPerformanceBands,
  getManufacturingBaselineCategories,
  getManufacturingBaselineInfo,
  getManufacturingReadinessRules,
  getPersonalityTraits,
  getStrategicLeadershipDimensions,
  getPersonalityTraitDescription,
  getStrategicLeadershipDimensionDescription,
  findCategoryByNameOrAlias,
  getCategoryIdFromName,
  getCategoryDisplayName,
  getPersonalityProfileClassification,
  getStrategicLeadershipProfile
};
 *
 * Central configuration for all assessment types.
 *
 * Corrected version:
 * - Keeps existing exports and IDs
 * - Supports all assessment types
 * - Adds shared performance bands
 * - Adds Manufacturing Baseline readiness rules
 * - Adds category aliases for safer mapping
 * - Corrects misleading weightage language
 * - Keeps compatibility with existing report files
 */

export const sharedPerformanceBands = {
  exceptional: {
    min: 85,
    label: "Exceptional",
    description:
      "Strong evidence of capability. Candidate may be ready for advanced responsibility, subject to practical validation."
  },
  strong: {
    min: 75,
    label: "Strong",
    description:
      "Reliable capability. Candidate can likely perform with standard guidance in this area."
  },
  adequate: {
    min: 65,
    label: "Adequate",
    description:
      "Functional capability. Candidate may need reinforcement and role-specific practice."
  },
  developing: {
    min: 55,
    label: "Developing",
    description:
      "Foundational capability. Candidate requires structured support and development."
  },
  priorityDevelopment: {
    min: 40,
    label: "Priority Development",
    description:
      "Significant gaps. Candidate requires targeted training and increased supervision."
  },
  criticalGap: {
    min: 0,
    label: "Critical Gap",
    description:
      "Critical gaps. Candidate requires immediate foundational training and close supervision."
  }
};

const commonWeightageNote =
  "Category contribution is based on allocated question count, scoring weight, and maximum possible score.";

export const assessmentTypes = {
  general: {
    id: "general",
    name: "General Assessment",
    description: "Comprehensive assessment covering all capability areas",
    icon: "📊",
    categories: [
      {
        id: "cognitive",
        name: "Cognitive Ability",
        maxScore: 50,
        aliases: ["Cognitive Ability"]
      },
      {
        id: "communication",
        name: "Communication",
        maxScore: 50,
        aliases: ["Communication"]
      },
      {
        id: "cultural",
        name: "Cultural & Attitudinal Fit",
        maxScore: 50,
        aliases: ["Cultural & Attitudinal Fit", "Cultural &amp; Attitudinal Fit"]
      },
      {
        id: "emotional",
        name: "Emotional Intelligence",
        maxScore: 50,
        aliases: ["Emotional Intelligence"]
      },
      {
        id: "ethics",
        name: "Ethics & Integrity",
        maxScore: 25,
        aliases: ["Ethics & Integrity", "Ethics &amp; Integrity"]
      },
      {
        id: "leadership",
        name: "Leadership & Management",
        maxScore: 75,
        aliases: ["Leadership & Management", "Leadership &amp; Management"]
      },
      {
        id: "performance",
        name: "Performance Metrics",
        maxScore: 50,
        aliases: ["Performance Metrics"]
      },
      {
        id: "personality",
        name: "Personality & Behavioral",
        maxScore: 50,
        aliases: ["Personality & Behavioral", "Personality &amp; Behavioral"]
      },
      {
        id: "problemSolving",
        name: "Problem-Solving",
        maxScore: 50,
        aliases: ["Problem-Solving", "Problem Solving"]
      },
      {
        id: "technical",
        name: "Technical & Manufacturing",
        maxScore: 50,
        aliases: ["Technical & Manufacturing", "Technical &amp; Manufacturing"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  leadership: {
    id: "leadership",
    name: "Leadership Assessment",
    description: "Evaluate leadership potential and capabilities",
    icon: "👑",
    categories: [
      {
        id: "vision",
        name: "Vision & Strategic Thinking",
        maxScore: 50,
        aliases: ["Vision & Strategic Thinking", "Vision &amp; Strategic Thinking"]
      },
      {
        id: "decision",
        name: "Decision-Making & Problem-Solving",
        maxScore: 50,
        aliases: [
          "Decision-Making & Problem-Solving",
          "Decision-Making &amp; Problem-Solving"
        ]
      },
      {
        id: "influence",
        name: "Communication & Influence",
        maxScore: 50,
        aliases: ["Communication & Influence", "Communication &amp; Influence"]
      },
      {
        id: "people",
        name: "People Management & Coaching",
        maxScore: 50,
        aliases: [
          "People Management & Coaching",
          "People Management &amp; Coaching"
        ]
      },
      {
        id: "change",
        name: "Change Leadership & Agility",
        maxScore: 50,
        aliases: ["Change Leadership & Agility", "Change Leadership &amp; Agility"]
      },
      {
        id: "emotional",
        name: "Emotional Intelligence",
        maxScore: 50,
        aliases: ["Emotional Intelligence"]
      },
      {
        id: "cultural",
        name: "Cultural Competence & Inclusivity",
        maxScore: 50,
        aliases: [
          "Cultural Competence & Inclusivity",
          "Cultural Competence &amp; Inclusivity"
        ]
      },
      {
        id: "execution",
        name: "Execution & Results Orientation",
        maxScore: 50,
        aliases: [
          "Execution & Results Orientation",
          "Execution &amp; Results Orientation"
        ]
      },
      {
        id: "resilience",
        name: "Resilience & Stress Management",
        maxScore: 50,
        aliases: [
          "Resilience & Stress Management",
          "Resilience &amp; Stress Management"
        ]
      },
      {
        id: "self",
        name: "Self-Awareness & Self-Regulation",
        maxScore: 50,
        aliases: [
          "Self-Awareness & Self-Regulation",
          "Self-Awareness &amp; Self-Regulation"
        ]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  cognitive: {
    id: "cognitive",
    name: "Cognitive Ability Assessment",
    description: "Measure analytical thinking and problem-solving",
    icon: "🧠",
    categories: [
      {
        id: "logical",
        name: "Logical / Abstract Reasoning",
        maxScore: 50,
        aliases: ["Logical / Abstract Reasoning"]
      },
      {
        id: "numerical",
        name: "Numerical Reasoning",
        maxScore: 50,
        aliases: ["Numerical Reasoning"]
      },
      {
        id: "verbal",
        name: "Verbal Reasoning",
        maxScore: 50,
        aliases: ["Verbal Reasoning"]
      },
      {
        id: "spatial",
        name: "Spatial Reasoning",
        maxScore: 50,
        aliases: ["Spatial Reasoning"]
      },
      {
        id: "memory",
        name: "Memory & Attention",
        maxScore: 50,
        aliases: ["Memory & Attention", "Memory &amp; Attention"]
      },
      {
        id: "perceptual",
        name: "Perceptual Speed & Accuracy",
        maxScore: 50,
        aliases: [
          "Perceptual Speed & Accuracy",
          "Perceptual Speed &amp; Accuracy"
        ]
      },
      {
        id: "problem",
        name: "Problem-Solving",
        maxScore: 50,
        aliases: ["Problem-Solving", "Problem Solving"]
      },
      {
        id: "critical",
        name: "Critical Thinking",
        maxScore: 50,
        aliases: ["Critical Thinking"]
      },
      {
        id: "learning",
        name: "Learning Agility",
        maxScore: 50,
        aliases: ["Learning Agility"]
      },
      {
        id: "mental",
        name: "Mental Flexibility",
        maxScore: 50,
        aliases: ["Mental Flexibility"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  technical: {
    id: "technical",
    name: "Technical Competence Assessment",
    description: "Assess technical knowledge and skills",
    icon: "⚙️",
    categories: [
      {
        id: "knowledge",
        name: "Technical Knowledge",
        maxScore: 50,
        aliases: ["Technical Knowledge"]
      },
      {
        id: "system",
        name: "System Understanding",
        maxScore: 50,
        aliases: ["System Understanding"]
      },
      {
        id: "troubleshooting",
        name: "Troubleshooting",
        maxScore: 50,
        aliases: ["Troubleshooting"]
      },
      {
        id: "application",
        name: "Practical Application",
        maxScore: 50,
        aliases: ["Practical Application"]
      },
      {
        id: "safety",
        name: "Safety & Compliance",
        maxScore: 50,
        aliases: ["Safety & Compliance", "Safety &amp; Compliance"]
      },
      {
        id: "quality",
        name: "Quality Control",
        maxScore: 50,
        aliases: ["Quality Control"]
      },
      {
        id: "optimization",
        name: "Process Optimization",
        maxScore: 50,
        aliases: ["Process Optimization"]
      },
      {
        id: "equipment",
        name: "Equipment Operation",
        maxScore: 50,
        aliases: ["Equipment Operation"]
      },
      {
        id: "maintenance",
        name: "Maintenance Procedures",
        maxScore: 50,
        aliases: ["Maintenance Procedures"]
      },
      {
        id: "documentation",
        name: "Technical Documentation",
        maxScore: 50,
        aliases: ["Technical Documentation"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  personality: {
    id: "personality",
    name: "Personality Assessment",
    description:
      "Evaluate work style, decision-making, and interpersonal approach based on 6 key traits: Ownership, Collaboration, Action, Analysis, Risk Tolerance, and Structure",
    icon: "🌟",
    categories: [
      {
        id: "ownership",
        name: "Ownership",
        maxScore: 50,
        description:
          "Takes responsibility, drives outcomes, owns mistakes, and follows through on commitments",
        aliases: ["Ownership"]
      },
      {
        id: "collaboration",
        name: "Collaboration",
        maxScore: 50,
        description:
          "Works well in teams, builds consensus, supports others, and values collective success",
        aliases: ["Collaboration"]
      },
      {
        id: "action",
        name: "Action",
        maxScore: 50,
        description:
          "Makes quick decisions, takes initiative, moves fast, and acts with urgency",
        aliases: ["Action"]
      },
      {
        id: "analysis",
        name: "Analysis",
        maxScore: 50,
        description:
          "Seeks data, plans carefully, thinks before acting, and values thoroughness",
        aliases: ["Analysis"]
      },
      {
        id: "risk",
        name: "Risk Tolerance",
        maxScore: 50,
        description:
          "Comfortable with uncertainty, experiments, pushes boundaries, and embraces innovation",
        aliases: ["Risk Tolerance", "Risk"]
      },
      {
        id: "structure",
        name: "Structure",
        maxScore: 50,
        description:
          "Follows process, respects hierarchy, values stability, and seeks consistency",
        aliases: ["Structure"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands,
    traitDescriptions: {
      ownership:
        "High Ownership individuals take initiative, own their outcomes, and drive results independently. They are accountable, reliable, and follow through on commitments.",
      collaboration:
        "High Collaboration individuals are team-focused, build consensus, and maintain harmony. They excel in group settings and value collective success.",
      action:
        "High Action individuals are fast-moving, decisive, and comfortable with urgency. They prefer to act quickly and take initiative.",
      analysis:
        "High Analysis individuals are data-driven, methodical, and seek clarity before acting. They prefer to plan thoroughly and value accuracy.",
      risk:
        "High Risk Tolerance individuals are comfortable with uncertainty, enjoy experimentation, and push boundaries appropriately. They thrive in innovative environments.",
      structure:
        "High Structure individuals are process-oriented, follow rules, and value consistency. They prefer clear guidelines and stable environments."
    },
    profileClassifications: {
      "High Ownership Leader": {
        traits: ["ownership", "action"],
        description:
          "Takes initiative, drives results, and leads with accountability"
      },
      "Collaborative Stabilizer": {
        traits: ["collaboration", "structure"],
        description:
          "Builds consensus, maintains harmony, and follows processes"
      },
      "Risk Driver / Executor": {
        traits: ["action", "risk"],
        description:
          "Moves fast, takes calculated risks, and drives execution"
      },
      "Analytical Thinker": {
        traits: ["analysis", "structure"],
        description:
          "Thinks deeply, plans carefully, and values data-driven decisions"
      },
      "Balanced Professional": {
        traits: [],
        description:
          "Adapts approach based on situation with balanced traits"
      }
    }
  },

  strategic_leadership: {
    id: "strategic_leadership",
    name: "Strategic Leadership Assessment",
    description:
      "Comprehensive assessment measuring strategic vision, people leadership, decision-making, accountability, emotional intelligence, execution drive, and ethical judgment.",
    icon: "👑",
    categories: [
      {
        id: "vision_strategy",
        name: "Vision / Strategy",
        maxScore: 100,
        description:
          "Strategic thinking, long-term planning, and direction setting",
        aliases: ["Vision / Strategy", "Vision Strategy"]
      },
      {
        id: "people_leadership",
        name: "People Leadership",
        maxScore: 100,
        description:
          "Team development, coaching, engagement, and motivation",
        aliases: ["People Leadership"]
      },
      {
        id: "decision_making",
        name: "Decision Making",
        maxScore: 100,
        description:
          "Decisiveness, judgment, and problem-solving under uncertainty",
        aliases: ["Decision Making"]
      },
      {
        id: "accountability",
        name: "Accountability",
        maxScore: 100,
        description:
          "Ownership, responsibility, and follow-through",
        aliases: ["Accountability"]
      },
      {
        id: "emotional_intelligence",
        name: "Emotional Intelligence",
        maxScore: 100,
        description:
          "Self-awareness, empathy, and conflict management",
        aliases: ["Emotional Intelligence"]
      },
      {
        id: "execution_drive",
        name: "Execution Drive",
        maxScore: 100,
        description:
          "Results orientation, urgency, and delivery focus",
        aliases: ["Execution Drive"]
      },
      {
        id: "ethics",
        name: "Ethics",
        maxScore: 100,
        description:
          "Integrity, ethical judgment, and principled behavior",
        aliases: ["Ethics"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands,
    profileClassifications: {
      "🏆 Strategic Leader": {
        traits: ["vision_strategy", "people_leadership", "decision_making"],
        description:
          "Excels in strategic thinking, people leadership, and decisive action"
      },
      "👥 People-Focused Leader": {
        traits: ["people_leadership", "emotional_intelligence"],
        description:
          "Prioritizes team development, empathy, and relationship building"
      },
      "⚡ Execution Leader": {
        traits: ["execution_drive", "accountability"],
        description:
          "Drives results with strong follow-through and accountability"
      },
      "🔭 Visionary Leader": {
        traits: ["vision_strategy"],
        description:
          "Exceptional strategic thinking and long-term vision"
      },
      "⚖️ Ethical Leader": {
        traits: ["ethics"],
        description:
          "Strong moral compass and principled decision-making"
      },
      "⚖️ Balanced Leader": {
        traits: ["vision_strategy", "people_leadership", "execution_drive"],
        description:
          "Well-rounded across strategy, people, and execution"
      },
      "📈 Developing Leader": {
        traits: [],
        description:
          "Emerging leadership capabilities with growth potential"
      }
    },
    dimensionDescriptions: {
      vision_strategy:
        "Strategic thinking, long-term planning, and ability to set direction",
      people_leadership:
        "Team development, coaching, engagement, and motivation",
      decision_making:
        "Decisiveness, judgment, and problem-solving under uncertainty",
      accountability:
        "Ownership, responsibility, and follow-through",
      emotional_intelligence:
        "Self-awareness, empathy, and conflict management",
      execution_drive:
        "Results orientation, urgency, and delivery focus",
      ethics:
        "Integrity, ethical judgment, and principled behavior"
    }
  },

  performance: {
    id: "performance",
    name: "Performance Assessment",
    description: "Measure performance metrics and work habits",
    icon: "📈",
    categories: [
      {
        id: "productivity",
        name: "Productivity & Efficiency",
        maxScore: 50,
        aliases: ["Productivity & Efficiency", "Productivity &amp; Efficiency"]
      },
      {
        id: "quality",
        name: "Work Quality & Effectiveness",
        maxScore: 50,
        aliases: [
          "Work Quality & Effectiveness",
          "Work Quality &amp; Effectiveness"
        ]
      },
      {
        id: "goal",
        name: "Goal Achievement",
        maxScore: 50,
        aliases: ["Goal Achievement"]
      },
      {
        id: "accountability",
        name: "Accountability",
        maxScore: 50,
        aliases: ["Accountability"]
      },
      {
        id: "initiative",
        name: "Initiative",
        maxScore: 50,
        aliases: ["Initiative"]
      },
      {
        id: "problem",
        name: "Problem-Solving",
        maxScore: 50,
        aliases: ["Problem-Solving", "Problem Solving"]
      },
      {
        id: "collaboration",
        name: "Collaboration",
        maxScore: 50,
        aliases: ["Collaboration"]
      },
      {
        id: "adaptability",
        name: "Adaptability",
        maxScore: 50,
        aliases: ["Adaptability"]
      },
      {
        id: "time",
        name: "Time Management",
        maxScore: 50,
        aliases: ["Time Management"]
      },
      {
        id: "results",
        name: "Results Orientation",
        maxScore: 50,
        aliases: ["Results Orientation"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  behavioral: {
    id: "behavioral",
    name: "Behavioral & Soft Skills",
    description:
      "Assess communication, teamwork, and emotional intelligence",
    icon: "🗣️",
    categories: [
      {
        id: "communication",
        name: "Communication",
        maxScore: 50,
        aliases: ["Communication"]
      },
      {
        id: "teamwork",
        name: "Teamwork",
        maxScore: 50,
        aliases: ["Teamwork"]
      },
      {
        id: "emotional",
        name: "Emotional Intelligence",
        maxScore: 50,
        aliases: ["Emotional Intelligence"]
      },
      {
        id: "conflict",
        name: "Conflict Resolution",
        maxScore: 50,
        aliases: ["Conflict Resolution"]
      },
      {
        id: "adaptability",
        name: "Adaptability",
        maxScore: 50,
        aliases: ["Adaptability"]
      },
      {
        id: "empathy",
        name: "Empathy",
        maxScore: 50,
        aliases: ["Empathy"]
      },
      {
        id: "listening",
        name: "Active Listening",
        maxScore: 50,
        aliases: ["Active Listening"]
      },
      {
        id: "feedback",
        name: "Feedback Reception",
        maxScore: 50,
        aliases: ["Feedback Reception"]
      },
      {
        id: "interpersonal",
        name: "Interpersonal Skills",
        maxScore: 50,
        aliases: ["Interpersonal Skills"]
      },
      {
        id: "professionalism",
        name: "Professionalism",
        maxScore: 50,
        aliases: ["Professionalism"]
      }
    ],
    weightage: commonWeightageNote,
    performanceBands: sharedPerformanceBands
  },

  cultural: {
    id: "cultural",
    name: "Cultural & Attitudinal Fit",
    description: "Assess values alignment and work ethic",
    icon: "🤝",
    categories: [
      {
        id: "values",
        name: "Values Alignment",
        maxScore: 50,
        aliases: ["Values Alignment"]
      },
      {
        id: "workethic",
        name: "Work Ethic",
        maxScore: 50,
        aliases: ["Work Ethic"]
      },
      {
        id: "adaptability",
        name: "Adaptability",
        maxScore: 50,
        aliases: ["Adaptability"]
      },
      {
        id: "collaboration",
        name: "Team Collaboration",
        maxScore: 50,
        aliases: ["Team Collaboration", "Collaboration"]
      },
      {
        id: "culture",
