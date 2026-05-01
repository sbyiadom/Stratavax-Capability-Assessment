// utils/professionalInterpreter.js

/**
 * Professional Narrative Interpreter
 *
 * Generates professional, supervisor-facing interpretations based on category scores.
 *
 * Corrected version:
 * - Uses central scoring standard from utils/scoring.js
 * - Keeps existing export: generateProfessionalInterpretation
 * - Keeps existing output structure expected by super-analyzer.js
 * - Supports all assessment types and categories
 * - Improves Manufacturing Baseline interpretation
 * - Uses evidence-based language and avoids overclaiming
 */

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

const normalizeCategoryScore = (category, data = {}) => {
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
    gapToTarget: calculateGapToTarget(percentage)
  };
};

export const generateProfessionalInterpretation = (
  candidateName,
  categoryScores
) => {
  const strongAreas = [];
  const moderateAreas = [];
  const concernAreas = [];

  Object.entries(categoryScores || {}).forEach(([category, data]) => {
    const area = normalizeCategoryScore(category, data);

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

  const overallSummary = generateOverallSummary(
    candidateName,
    strongAreas,
    moderateAreas,
    concernAreas
  );

  const profileSuggestion = generateProfileSuggestion(
    strongAreas,
    moderateAreas,
    concernAreas
  );

  const leadershipEval = generateLeadershipEvaluation(
    strongAreas,
    moderateAreas,
    concernAreas
  );

  const overallGrade = generateOverallGrade(
    strongAreas,
    moderateAreas,
    concernAreas
  );

  const developmentPriorities = generateDevelopmentPriorities(concernAreas);

  return {
    overallSummary,

    categoryBreakdown: {
      strong: strongAreas.map((area) => formatStrongArea(area)),
      moderate: moderateAreas.map((area) => formatModerateArea(area)),
      concerns: concernAreas.map((area) => formatConcernArea(area))
    },

    profileSuggestion,
    leadershipEval,
    overallGrade,
    developmentPriorities
  };
};

// ======================================================
// OVERALL SUMMARY
// ======================================================

const generateOverallSummary = (
  candidateName,
  strongAreas,
  moderateAreas,
  concernAreas
) => {
  const strongCount = strongAreas.length;
  const moderateCount = moderateAreas.length;
  const concernCount = concernAreas.length;

  const strongNames = strongAreas.slice(0, 3).map((area) => area.category);
  const concernNames = concernAreas.slice(0, 3).map((area) => area.category);

  let summary = `🔎 Overall Summary\n\n`;

  summary += `${candidateName} shows `;

  if (strongCount > 0 && concernCount > 0) {
    summary += `clear strength evidence in ${formatList(
      strongNames
    )}, with priority development needs in ${formatList(concernNames)}.`;
  } else if (strongCount > 0) {
    summary += `clear strength evidence in ${formatList(strongNames)}.`;
  } else if (concernCount > 0) {
    summary += `development needs in ${formatList(concernNames)}.`;
  } else if (moderateCount > 0) {
    summary += `a functional but non-dominant profile across the assessed categories.`;
  } else {
    summary += `limited available category evidence for interpretation.`;
  }

  summary += `\n\n`;

  if (concernCount >= 4) {
    summary += `This profile suggests significant development needs across several areas. Structured training, close supervision, and clear progress milestones are recommended.`;
  } else if (concernCount > 0 && strongCount > 0) {
    summary += `The candidate has useful strengths that can be leveraged while development gaps are addressed through targeted support.`;
  } else if (strongCount >= 3 && concernCount === 0) {
    summary += `The profile suggests a strong foundation for role contribution, subject to interview evidence, practical validation, and supervisor judgment.`;
  } else if (moderateCount > 0) {
    summary += `The profile suggests functional capability with room for role-specific reinforcement and practical exposure.`;
  } else {
    summary += `Additional evidence may be needed to support confident placement decisions.`;
  }

  return summary;
};

// ======================================================
// CATEGORY FORMATTERS
// ======================================================

const formatStrongArea = (area) => {
  const {
    category,
    percentage,
    grade,
    gradeDesc,
    performanceComment,
    supervisorImplication
  } = area;

  let narrative = `${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  narrative += getCategoryStrengthNarrative(category, percentage);
  narrative += `\n\n• Performance signal: ${performanceComment}`;
  narrative += `\n• Supervisor implication: ${supervisorImplication}`;

  return narrative;
};

const formatModerateArea = (area) => {
  const {
    category,
    percentage,
    grade,
    gradeDesc,
    performanceComment,
    supervisorImplication
  } = area;

  let narrative = `${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  narrative += getCategoryModerateNarrative(category, percentage);
  narrative += `\n\n• Performance signal: ${performanceComment}`;
  narrative += `\n• Supervisor implication: ${supervisorImplication}`;
  narrative += `\n• Recommended support: Provide role-specific practice, feedback, and structured reinforcement.`;

  return narrative;
};

const formatConcernArea = (area) => {
  const {
    category,
    percentage,
    grade,
    gradeDesc,
    performanceComment,
    supervisorImplication,
    gapToTarget
  } = area;

  let narrative = `${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  narrative += getCategoryConcernNarrative(category, percentage);
  narrative += `\n\n• Performance signal: ${performanceComment}`;
  narrative += `\n• Supervisor implication: ${supervisorImplication}`;
  narrative += `\n• Gap to 80% target: ${gapToTarget}%`;
  narrative += `\n• Recommended support: ${getDevelopmentRecommendation(category, percentage)}`;

  return narrative;
};

// ======================================================
// CATEGORY-SPECIFIC NARRATIVES
// ======================================================

const getCategoryStrengthNarrative = (category, percentage) => {
  const normalized = normalizeText(category);

  const narratives = {
    Ownership:
      "Assessment evidence suggests accountability, initiative, and follow-through. This can support roles requiring task ownership and reliability.",

    Collaboration:
      "Assessment evidence suggests constructive teamwork and interpersonal contribution. This can support team-based or cross-functional work.",

    Action:
      "Assessment evidence suggests timely action, initiative, and execution focus. This can support environments where progress and responsiveness are important.",

    Analysis:
      "Assessment evidence suggests structured reasoning and analytical thinking. This can support planning, problem-solving, quality, or decision-support tasks.",

    "Risk Tolerance":
      "Assessment evidence suggests comfort with controlled uncertainty and calculated experimentation. This can support improvement or innovation-focused tasks.",

    Structure:
      "Assessment evidence suggests process discipline, consistency, and procedural reliability. This can support quality-critical and SOP-driven work.",

    "Technical Fundamentals":
      "Assessment evidence suggests useful foundational technical knowledge. This can support supervised manufacturing exposure, equipment familiarization, or technical onboarding.",

    Troubleshooting:
      "Assessment evidence suggests diagnostic thinking and problem-resolution awareness. This can support supervised fault-finding and production issue response.",

    "Numerical Aptitude":
      "Assessment evidence suggests reliable production math and numerical reasoning. This can support metric tracking, quality documentation, and production reporting.",

    "Safety & Work Ethic":
      "Assessment evidence suggests reliable safety awareness, SOP discipline, and workplace conduct indicators. Practical observation should still validate this during onboarding.",

    "Safety &amp; Work Ethic":
      "Assessment evidence suggests reliable safety awareness, SOP discipline, and workplace conduct indicators. Practical observation should still validate this during onboarding.",

    Communication:
      "Assessment evidence suggests clear expression and communication capability. This can support collaboration, reporting, and stakeholder interaction.",

    "Emotional Intelligence":
      "Assessment evidence suggests interpersonal awareness and self-management. This can support team interaction and workplace relationship management.",

    "Leadership & Management":
      "Assessment evidence suggests leadership potential. Gradual leadership exposure may be considered with role-specific validation.",

    "Problem-Solving":
      "Assessment evidence suggests structured problem-solving capability. This can support practical issue resolution and improvement tasks.",

    "Technical & Manufacturing":
      "Assessment evidence suggests operational or technical capability that may support technical role exposure."
  };

  return (
    narratives[normalized] ||
    `Assessment evidence suggests ${normalized} is a strength area that can be leveraged in role-relevant assignments.`
  );
};

const getCategoryModerateNarrative = (category, percentage) => {
  const normalized = normalizeText(category);

  const narratives = {
    Ownership:
      "Assessment evidence suggests functional ownership, but the candidate may benefit from clearer accountability expectations and progress follow-up.",

    Collaboration:
      "Assessment evidence suggests functional collaboration, but the candidate may benefit from more team-based practice and feedback.",

    Action:
      "Assessment evidence suggests developing action orientation. The candidate may need support with urgency, initiative, or decision timing.",

    Analysis:
      "Assessment evidence suggests functional analytical ability, but complex tasks may require structure and guidance.",

    "Risk Tolerance":
      "Assessment evidence suggests moderate comfort with uncertainty. Controlled experimentation and risk review can help strengthen this area.",

    Structure:
      "Assessment evidence suggests functional process adherence. SOP reinforcement and checklists may improve consistency.",

    "Technical Fundamentals":
      "Assessment evidence suggests a developing technical foundation. Practical equipment familiarization and guided technical practice are recommended.",

    Troubleshooting:
      "Assessment evidence suggests developing troubleshooting capability. Structured diagnostic frameworks and supervised scenarios are recommended.",

    "Numerical Aptitude":
      "Assessment evidence suggests functional numerical ability. Production math and metric interpretation practice are recommended.",

    "Safety & Work Ethic":
      "Assessment evidence suggests functional safety awareness. PPE, SOP, and workplace conduct reinforcement should continue during onboarding.",

    "Safety &amp; Work Ethic":
      "Assessment evidence suggests functional safety awareness. PPE, SOP, and workplace conduct reinforcement should continue during onboarding."
  };

  return (
    narratives[normalized] ||
    `Assessment evidence suggests ${normalized} is functional but should be reinforced through practical exposure, feedback, and role-specific development.`
  );
};

const getCategoryConcernNarrative = (category, percentage) => {
  const normalized = normalizeText(category);

  const criticalPrefix = isCriticalGap(percentage)
    ? "Critical development evidence was identified."
    : "Priority development evidence was identified.";

  const narratives = {
    Ownership:
      `${criticalPrefix} The candidate may require clear expectations, close follow-up, and accountability coaching before being assigned high-autonomy work.`,

    Collaboration:
      `${criticalPrefix} The candidate may need support with teamwork, communication, and contribution in group settings.`,

    Action:
      `${criticalPrefix} The candidate may delay decisions or wait for direction. Structured action planning and time-bound tasks are recommended.`,

    Analysis:
      `${criticalPrefix} The candidate may need structured reasoning frameworks, data interpretation support, and guided problem-solving practice.`,

    "Risk Tolerance":
      `${criticalPrefix} The candidate may avoid uncertainty or change. Low-risk experimentation and risk-assessment coaching are recommended.`,

    Structure:
      `${criticalPrefix} The candidate may need SOP reinforcement, checklists, and close monitoring of process adherence.`,

    "Technical Fundamentals":
      `${criticalPrefix} The candidate may struggle with equipment concepts, maintenance basics, or manufacturing system understanding without foundational training.`,

    Troubleshooting:
      `${criticalPrefix} The candidate may struggle with fault diagnosis, root-cause analysis, or common production issue response without guided practice.`,

    "Numerical Aptitude":
      `${criticalPrefix} The candidate may struggle with production calculations, percentages, ratios, or quality documentation without numeracy support.`,

    "Safety & Work Ethic":
      `${criticalPrefix} Safety and work ethic should be addressed before independent production exposure. Safety training and close supervision are recommended.`,

    "Safety &amp; Work Ethic":
      `${criticalPrefix} Safety and work ethic should be addressed before independent production exposure. Safety training and close supervision are recommended.`,

    Communication:
      `${criticalPrefix} The candidate may need communication support to
