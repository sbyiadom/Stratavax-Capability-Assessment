// utils/detailedInterpreter.js

import { assessmentTypes } from "./assessmentConfigs, config, assessmentType))import { assessmentTypes } from "./assessmentConfigs";
    },

    hiringInterpretation: generateHiringInterpretation(
      strongAreas,
      moderateAreas,
      concernAreas,
      config,
      assessmentType
    ),

    developmentPotential: generateDevelopmentPotential(
      strongAreas,
      moderateAreas,
      concernAreas,
      config,
      assessmentType
    ),

    strategicObservation: generateStrategicObservation(
      strongAreas,
      moderateAreas,
      concernAreas,
      config,
      assessmentType
    ),

    finalAssessment: generateFinalAssessment(
      strongAreas,
      moderateAreas,
      concernAreas,
      config,
      assessmentType
    ),

    roleFit: generateRoleFitAnalysis(
      strongAreas,
      moderateAreas,
      concernAreas,
      config,
      assessmentType
    )
  };
};

// ======================================================
// OVERALL PROFILE SUMMARY
// ======================================================

const generateOverallProfileSummary = (
  candidateName,
  strongAreas,
  moderateAreas,
  concernAreas,
  config,
  assessmentType
) => {
  const strongCount = strongAreas.length;
  const moderateCount = moderateAreas.length;
  const concernCount = concernAreas.length;

  let summary = `Overall Profile Summary\n\n`;

  summary += `${candidateName} completed the ${config.name}. `;

  if (assessmentType === "manufacturing_baseline") {
    summary += generateManufacturingOverallSummary(
      strongAreas,
      moderateAreas,
      concernAreas
    );
    return summary;
  }

  if (strongCount >= 3 && concernCount <= 1) {
    summary += `The assessment evidence suggests a strong profile with multiple areas of capability and limited development concern.`;
  } else if (strongCount >= 1 && concernCount <= 3) {
    summary += `The assessment evidence suggests a balanced profile with usable strengths and manageable development areas.`;
  } else if (concernCount >= 4) {
    summary += `The assessment evidence suggests significant development needs across several ${config.id} competencies.`;
  } else if (moderateCount > 0 && concernCount <= 2) {
    summary += `The assessment evidence suggests functional capability with role-specific reinforcement needs.`;
  } else {
    summary += `The assessment evidence suggests a mixed profile requiring careful placement, structured support, and practical validation.`;
  }

  summary += ` Supervisor interpretation should consider interview evidence, practical work validation, references, and role requirements.`;

  return summary;
};

const generateManufacturingOverallSummary = (
  strongAreas,
  moderateAreas,
  concernAreas
) => {
  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  let summary = "";

  if (
    concernNames.includes("Safety & Work Ethic") ||
    concernNames.includes("Safety &amp; Work Ethic")
  ) {
    summary += `Safety and work ethic are key concerns. Safety training, SOP reinforcement, and close supervision are recommended before production exposure.`;
  } else if (
    strongNames.includes("Safety & Work Ethic") ||
    strongNames.includes("Safety &amp; Work Ethic")
  ) {
    summary += `Safety and work ethic appear to be a relative strength based on assessment evidence. Practical observation during onboarding is still recommended.`;
  } else {
    summary += `Safety and work ethic should be reinforced during onboarding and validated through practical observation.`;
  }

  if (concernNames.includes("Technical Fundamentals")) {
    summary += ` Technical fundamentals require structured development before independent equipment-related work.`;
  }

  if (concernNames.includes("Troubleshooting")) {
    summary += ` Troubleshooting should be developed through guided diagnostic practice and root-cause analysis.`;
  }

  if (concernNames.includes("Numerical Aptitude")) {
    summary += ` Numerical aptitude should be reinforced through production math and metric interpretation practice.`;
  }

  if (concernAreas.length === 0 && strongAreas.length > 0) {
    summary += ` The candidate may be considered for supervised manufacturing exposure, subject to practical validation.`;
  } else {
    summary += ` The candidate should receive structured onboarding and supervised practical exposure before independent responsibility.`;
  }

  return summary;
};

// ======================================================
// CATEGORY FORMATTERS
// ======================================================

const formatStrongArea = (area, config, assessmentType) => {
  const { category, percentage, grade, gradeDesc, insights } = area;

  let narrative = `🟢 ${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  if (Array.isArray(insights) && insights.length > 0) {
    narrative += `Evidence from responses:\n`;
    insights.slice(0, 2).forEach((insight) => {
      narrative += `• ${insight}\n`;
    });
    narrative += `\n`;
  }

  narrative += getCategoryStrengthInterpretation(category, assessmentType);
  narrative += `\n\n• Performance signal: ${area.performanceComment}`;
  narrative += `\n• Supervisor implication: ${area.supervisorImplication}`;
  narrative += `\n• Recommended use: Leverage this area through role-relevant tasks, mentoring, or supervised responsibility expansion.`;

  return narrative;
};

const formatModerateArea = (area, config, assessmentType) => {
  const { category, percentage, grade, gradeDesc, insights } = area;

  let narrative = `🟡 ${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  if (Array.isArray(insights) && insights.length > 0) {
    narrative += `Evidence from responses:\n`;
    insights.slice(0, 2).forEach((insight) => {
      narrative += `• ${insight}\n`;
    });
    narrative += `\n`;
  }

  narrative += getCategoryModerateInterpretation(category, assessmentType);
  narrative += `\n\n• Performance signal: ${area.performanceComment}`;
  narrative += `\n• Supervisor implication: ${area.supervisorImplication}`;
  narrative += `\n• Recommended support: Provide role-specific practice, coaching, and periodic progress review.`;

  return narrative;
};

const formatConcernArea = (area, config, assessmentType) => {
  const { category, percentage, grade, gradeDesc, insights } = area;

  let narrative = `🔴 ${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  if (Array.isArray(insights) && insights.length > 0) {
    narrative += `Evidence from responses:\n`;
    insights.slice(0, 3).forEach((insight) => {
      narrative += `• ${insight}\n`;
    });
    narrative += `\n`;
  }

  narrative += getCategoryConcernInterpretation(category, percentage, assessmentType);
  narrative += `\n\n• Performance signal: ${area.performanceComment}`;
  narrative += `\n• Supervisor implication: ${area.supervisorImplication}`;
  narrative += `\n• Gap to 80% target: ${area.gapToTarget}%`;
  narrative += `\n• Recommended support: ${getDevelopmentRecommendation(category, percentage, assessmentType)}`;

  return narrative;
};

// ======================================================
// CATEGORY NARRATIVES
// ======================================================

const getCategoryStrengthInterpretation = (category, assessmentType) => {
  const normalized = normalizeText(category);

  const manufacturing = {
    "Technical Fundamentals":
      "Assessment evidence suggests useful foundational technical knowledge, including basic equipment and system concepts. This can support supervised manufacturing exposure or technical onboarding.",
    Troubleshooting:
      "Assessment evidence suggests useful diagnostic thinking and awareness of problem-resolution steps. This can support supervised fault-finding and production issue review.",
    "Numerical Aptitude":
      "Assessment evidence suggests reliable numerical reasoning for production calculations, percentages, ratios, and basic reporting.",
    "Safety & Work Ethic":
      "Assessment evidence suggests reliable safety awareness, SOP discipline, and workplace conduct indicators. Practical validation during onboarding is still required.",
    "Safety &amp; Work Ethic":
      "Assessment evidence suggests reliable safety awareness, SOP discipline, and workplace conduct indicators. Practical validation during onboarding is still required."
  };

  if (assessmentType === "manufacturing_baseline" && manufacturing[normalized]) {
    return manufacturing[normalized];
  }

  const narratives = {
    Ownership:
      "Assessment evidence suggests accountability, follow-through, and initiative. This can support tasks requiring ownership and responsibility.",
    Collaboration:
      "Assessment evidence suggests constructive teamwork and interpersonal contribution. This can support team-based or cross-functional environments.",
    Action:
      "Assessment evidence suggests initiative, decisiveness, and execution focus. This can support work where timely action is important.",
    Analysis:
      "Assessment evidence suggests structured reasoning and data-informed thinking. This can support planning, quality, and problem-solving tasks.",
    "Risk Tolerance":
      "Assessment evidence suggests comfort with controlled uncertainty and calculated experimentation. This can support improvement-focused assignments.",
    Structure:
      "Assessment evidence suggests process discipline and consistency. This can support SOP-driven and quality-critical work.",
    Communication:
      "Assessment evidence suggests clear expression and communication capability. This can support

import {
  getGrade,
  getGradeDescription,
  getScoreLevel,
  getScoreComment,
  getSupervisorImplication,
  isStrength,
  isDevelopmentArea,
  isCriticalGap,
  isPriorityDevelopment,
  calculateGapToTarget,
  REPORT_THRESHOLDS
} from "./scoring";

/**
 * Detailed Professional Interpreter
 *
 * Generates comprehensive narrative analysis based on actual assessment scores.
 *
 * Corrected version:
 * - Uses central scoring standard from utils/scoring.js
 * - Keeps existing export: generateDetailedInterpretation
 * - Keeps existing output structure
 * - Supports all assessment types
 * - Improves Manufacturing Baseline interpretation
 * - Uses evidence-based supervisor-friendly wording
 */

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const formatPercentage = (value) => {
  const number = safeNumber(value, 0);
  return `${Math.round(number * 100) / 100}%`;
};

const normalizeCategoryScore = (category, data = {}, responseInsights = {}) => {
  const percentage = safeNumber(data.percentage, 0);

  return {
    category: normalizeText(category),
    percentage,
    score: safeNumber(data.score ?? data.total ?? data.rawScore, 0),
    maxPossible: safeNumber(data.maxPossible ?? data.max_score, 0),
    grade: getGrade(percentage),
    gradeDesc: getGradeDescription(percentage),
    scoreLevel: getScoreLevel(percentage),
    performanceComment: getScoreComment(percentage),
    supervisorImplication: getSupervisorImplication(percentage),
    gapToTarget: calculateGapToTarget(percentage),
    insights: responseInsights?.[category] || responseInsights?.[normalizeText(category)] || []
  };
};

export const generateDetailedInterpretation = (
  candidateName,
  categoryScores,
  assessmentType = "general",
  responseInsights = {}
) => {
  const config = assessmentTypes[assessmentType] || assessmentTypes.general;

  const strongAreas = [];
  const moderateAreas = [];
  const concernAreas = [];

  Object.entries(categoryScores || {}).forEach(([category, data]) => {
    const area = normalizeCategoryScore(category, data, responseInsights);

    if (isStrength(area.percentage)) {
      strongAreas.push(area);
    } else if (isDevelopmentArea(area.percentage)) {
      concernAreas.push(area);
    } else {
      moderateAreas.push(area);
    }
  });

  strongAreas.sort((a, b) => b.percentage - a.percentage);
  moderateAreas.sort((a, b) => b.percentage - a.percentage);
  concernAreas.sort((a, b) => a.percentage - b.percentage);

  return {
    overallProfileSummary: generateOverallProfileSummary(
      candidateName,
      strongAreas,
      moderateAreas,
      concernAreas,
      config,
      assessmentType
    ),

    categoryBreakdown: {
      strong: strongAreas.map((area) => formatStrongArea(area, config, assessmentType)),
      moderate: moderateAreas.map((area) => formatModerateArea(area, config, assessmentType)),
