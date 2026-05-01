/**
 * STRATAVAX PROFESSIONAL REPORT GENERATOR
 *
 * Generates a structured supervisor-facing assessment report.
 *
 * This corrected version:
 * - uses the central scoring standard from utils/scoring.js
 * - keeps backward-compatible exports
 * - reduces contradictory thresholds
 * - avoids Math.random() in final report generation
 * - supports all assessment types
 * - keeps the same generateStratavaxReport(...) function signature
 */

import {
  GRADE_SCALE,
  PERFORMANCE_BANDS,
  REPORT_THRESHOLDS,
  calculatePercentage,
  getGradeInfo as getCentralGradeInfo,
  getClassificationDetailsFromPercentage,
  getScoreComment,
  getSupervisorImplication,
  calculateGapToTarget,
  isStrength,
  isDevelopmentArea
} from "./scoring";

// ===== GRADE SCALE EXPORT FOR BACKWARD COMPATIBILITY =====

export const stratavaxGradeScale = GRADE_SCALE.map((item) => ({
  grade: item.grade,
  min: item.min,
  max: item.max,
  color: item.color,
  bg: item.bg,
  description: item.description,
  professional: item.description,
  classification: getClassificationDetailsFromPercentage(item.min).classification
}));

// ===== DETERMINISTIC PHRASE SELECTION =====

const createHash = (input) => {
  const text = String(input || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const selectPhrase = (phrases, seed = "") => {
  if (!Array.isArray(phrases) || phrases.length === 0) return "";
  const index = createHash(seed) % phrases.length;
  return phrases[index];
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeAssessmentType = (assessmentType) => {
  return assessmentType || "general";
};

// ===== CLASSIFICATION LOGIC =====

export const stratavaxClassification = (percentage) => {
  const details = getClassificationDetailsFromPercentage(percentage);

  return {
    label: details.classification,
    level:
      details.band === "exceptional"
        ? 5
        : details.band === "strong"
        ? 4
        : details.band === "adequate"
        ? 3
        : details.band === "developing"
        ? 2
        : 1,
    color: details.color,
    description: details.description,
    tone:
      details.band === "exceptional" || details.band === "strong"
        ? "positive"
        : details.band === "adequate" || details.band === "developing"
        ? "neutral"
        : "cautious"
  };
};

// ===== ASSESSMENT-SPECIFIC TEMPLATES =====

export const assessmentTemplates = {
  general: {
    name: "General Assessment",
    icon: "📊",
    strengths: {
      "Cognitive Ability": "analytical and strategic thinking",
      Communication: "clear and effective communication",
      "Cultural & Attitudinal Fit": "values alignment and workplace fit",
      "Emotional Intelligence": "self-awareness and interpersonal judgment",
      "Ethics & Integrity": "principled decision-making",
      "Leadership & Management": "leadership and team coordination",
      "Performance Metrics": "results orientation",
      "Personality & Behavioral": "work style and behavioral consistency",
      "Problem-Solving": "structured problem-solving",
      "Technical & Manufacturing": "technical and operational competence"
    },
    weaknesses: {
      "Cognitive Ability": "analytical skill development",
      Communication: "communication development",
      "Cultural & Attitudinal Fit": "values alignment review",
      "Emotional Intelligence": "interpersonal development",
      "Ethics & Integrity": "ethics and judgment reinforcement",
      "Leadership & Management": "leadership development",
      "Performance Metrics": "performance focus improvement",
      "Personality & Behavioral": "work style development",
      "Problem-Solving": "problem-solving development",
      "Technical & Manufacturing": "technical training"
    }
  },

  leadership: {
    name: "Leadership Assessment",
    icon: "👑",
    strengths: {
      "Vision & Strategic Thinking": "strategic foresight",
      "Decision-Making & Problem-Solving": "decision quality and problem-solving",
      "Communication & Influence": "communication and stakeholder influence",
      "People Management & Coaching": "team development and coaching",
      "Change Leadership & Agility": "change adaptability",
      "Emotional Intelligence": "relationship management",
      "Cultural Competence & Inclusivity": "inclusive leadership",
      "Execution & Results Orientation": "execution and accountability",
      "Resilience & Stress Management": "resilience under pressure",
      "Self-Awareness & Self-Regulation": "self-management"
    },
    weaknesses: {}
  },

  cognitive: {
    name: "Cognitive Ability Assessment",
    icon: "🧠",
    strengths: {
      "Logical / Abstract Reasoning": "logical and abstract reasoning",
      "Numerical Reasoning": "quantitative analysis",
      "Verbal Reasoning": "language comprehension",
      "Spatial Reasoning": "spatial reasoning",
      "Memory & Attention": "attention and recall",
      "Perceptual Speed & Accuracy": "processing speed and accuracy",
      "Problem-Solving": "analytical problem-solving",
      "Critical Thinking": "critical thinking",
      "Learning Agility": "learning agility",
      "Mental Flexibility": "adaptive thinking"
    },
    weaknesses: {}
  },

  technical: {
    name: "Technical Competence Assessment",
    icon: "⚙️",
    strengths: {
      "Technical Knowledge": "technical knowledge",
      "System Understanding": "system understanding",
      Troubleshooting: "diagnostic and troubleshooting ability",
      "Practical Application": "hands-on application",
      "Safety & Compliance": "safety and compliance awareness",
      "Quality Control": "quality orientation",
      "Process Optimization": "process improvement",
      "Equipment Operation": "equipment operation",
      "Maintenance Procedures": "maintenance knowledge",
      "Technical Documentation": "technical communication"
    },
    weaknesses: {}
  },

  personality: {
    name: "Personality Assessment",
    icon: "🌟",
    strengths: {
      Ownership: "accountability and follow-through",
      Collaboration: "teamwork and interpersonal effectiveness",
      Action: "decisiveness and execution",
      Analysis: "structured analytical thinking",
      "Risk Tolerance": "calculated risk-taking and innovation",
      Structure: "process discipline and consistency"
    },
    weaknesses: {}
  },

  strategic_leadership: {
    name: "Strategic Leadership Assessment",
    icon: "👑",
    strengths: {
      "Vision / Strategy": "strategic direction setting",
      "People Leadership": "people leadership and coaching",
      "Decision Making": "decision quality",
      Accountability: "ownership and accountability",
      "Emotional Intelligence": "emotional intelligence",
      "Execution Drive": "execution and delivery",
      Ethics: "ethical judgment"
    },
    weaknesses: {}
  },

  performance: {
    name: "Performance Assessment",
    icon: "📈",
    strengths: {
      "Productivity & Efficiency": "productivity and efficiency",
      "Work Quality & Effectiveness": "work quality",
      "Goal Achievement": "goal achievement",
      Accountability: "accountability",
      Initiative: "initiative",
      "Problem-Solving": "problem-solving",
      Collaboration: "collaboration",
      Adaptability: "adaptability",
      "Time Management": "time management",
      "Results Orientation": "results orientation"
    },
    weaknesses: {}
  },

  behavioral: {
    name: "Behavioral & Soft Skills Assessment",
    icon: "🗣️",
    strengths: {
      Communication: "communication",
      Teamwork: "teamwork",
      "Emotional Intelligence": "emotional intelligence",
      "Conflict Resolution": "conflict resolution",
      Adaptability: "adaptability",
      Empathy: "empathy",
      "Active Listening": "active listening",
      "Feedback Reception": "feedback reception",
      "Interpersonal Skills": "interpersonal skills",
      Professionalism: "professionalism"
    },
    weaknesses: {}
  },

  cultural: {
    name: "Cultural & Attitudinal Fit Assessment",
    icon: "🤝",
    strengths: {
      "Values Alignment": "values alignment",
      "Work Ethic": "work ethic",
      Adaptability: "adaptability",
      Collaboration: "collaboration",
      "Company Culture Fit": "company culture fit",
      "Diversity Awareness": "diversity awareness",
      Inclusivity: "inclusivity",
      Respect: "respect",
      Integrity: "integrity",
      "Professional Conduct": "professional conduct"
    },
    weaknesses: {}
  },

  manufacturing_baseline: {
    name: "Manufacturing Baseline Assessment",
    icon: "🏭",
    strengths: {
      "Technical Fundamentals":
        "foundational knowledge of maintenance, sensors, motors, pneumatics, and mechanical systems",
      Troubleshooting:
        "diagnostic thinking for common production and equipment issues",
      "Numerical Aptitude":
        "production calculations, percentages, ratios, and production-rate reasoning",
      "Safety & Work Ethic":
        "PPE awareness, safety reporting, SOP discipline, teamwork, and professional conduct"
    },
    weaknesses: {
      "Technical Fundamentals":
        "foundational technical knowledge requiring reinforcement",
      Troubleshooting:
        "diagnostic thinking requiring structured troubleshooting practice",
      "Numerical Aptitude":
        "production math and quantitative reasoning requiring practice",
      "Safety & Work Ethic":
        "safety awareness or work ethic concepts requiring reinforcement"
    },
    roleReadiness: {
      "Production Line Operator":
        "Direct production role requiring safety awareness, technical basics, and process discipline.",
      "Quality Control Technician":
        "Quality-focused role requiring accuracy, numerical reasoning, and problem identification.",
      "Maintenance Trainee":
        "Entry-level maintenance pathway requiring technical fundamentals and troubleshooting capability.",
      "Packaging Operator":
        "Packaging role requiring process adherence, safety awareness, and operational consistency."
    }
  }
};

const getTemplate = (assessmentType) => {
  return (
    assessmentTemplates[normalizeAssessmentType(assessmentType)] ||
    assessmentTemplates.general
  );
};

// ===== NARRATIVE HELPERS =====

export const generateDynamicNarrative = (
  template,
  variables = {},
  classification,
  availablePhrases
) => {
  if (!template) return "";

  let narrative = template;

  Object.keys(variables).forEach((key) => {
    narrative = narrative.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
  });

  return narrative;
};

const getAreaDescriptor = (area, assessmentType, type = "strength") => {
  const template = getTemplate(assessmentType);
  const library = type === "strength" ? template.strengths : template.weaknesses;

  return library?.[area] || area;
};

export const buildStrengthsNarrative = (
  strengths,
  assessmentType,
  classification,
  seed = ""
) => {
  if (!Array.isArray(strengths) || strengths.length === 0) {
    return "No category reached the strength threshold. The supervisor should focus first on building baseline competence before assigning advanced responsibility.";
  }

  const topStrengths = strengths.slice(0, 3);
  const names = topStrengths.map((item) => item.area).join(", ");

  const phrases = [
    `The candidate shows strongest evidence of capability in ${names}. These areas can be used as a foundation for role placement, coaching, or gradual responsibility expansion.`,
    `The strongest performance areas are ${names}. These strengths should be considered when assigning tasks, pairing the candidate with mentors, or planning development activities.`,
    `Results indicate clear relative strengths in ${names}. These areas may provide useful leverage while the supervisor addresses weaker competencies.`
  ];

  return selectPhrase(phrases, `${seed}-strengths`);
};

export const build
