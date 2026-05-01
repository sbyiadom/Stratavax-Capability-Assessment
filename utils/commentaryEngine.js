/**
 * PROFESSIONAL COMMENTARY ENGINE
 *
 * Generates clear supervisor-facing commentary for assessment results.
 *
 * Corrected version:
 * - Uses central scoring standards from utils/scoring.js
 * - Keeps existing exports
 * - Supports all assessment types
 * - Removes random wording from final report generation
 * - Uses cautious, evidence-based report language
 */

import {
  getScoreLevel,
  getScoreComment,
  getSupervisorImplication,
  calculateGapToTarget,
  isStrength,
  isDevelopmentArea,
  isCriticalGap,
  isPriorityDevelopment,
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

const normalizeArea = (area) => normalizeText(area || "this area");

const isManufacturingArea = (area, assessmentType = null) => {
  const normalizedArea = normalizeArea(area);

  return (
    assessmentType === "manufacturing_baseline" ||
    normalizedArea === "Technical Fundamentals" ||
    normalizedArea === "Troubleshooting" ||
    normalizedArea === "Numerical Aptitude" ||
    normalizedArea === "Safety & Work Ethic" ||
    normalizedArea === "Safety &amp; Work Ethic"
  );
};

const formatPercentage = (percentage) => {
  const value = safeNumber(percentage, 0);
  return `${Math.round(value * 100) / 100}%`;
};

const getPriorityLabel = (percentage) => {
  const value = safeNumber(percentage, 0);

  if (isCriticalGap(value)) return "Critical";
  if (isPriorityDevelopment(value)) return "High";
  if (isDevelopmentArea(value)) return "Medium";
  if (isStrength(value)) return "Leverage";

  return "Low";
};

// ======================================================
// MANUFACTURING-SPECIFIC COMMENTARY
// ======================================================

const getManufacturingCriticalGapCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  const commentary = {
    "Technical Fundamentals": `Technical Fundamentals at ${score} indicates a critical gap in foundational manufacturing knowledge. Assessment evidence suggests the candidate may struggle with basic equipment concepts, maintenance principles, sensors, motors, or pneumatic systems without immediate training. Foundational technical instruction and supervised practical exposure are recommended before independent equipment-related work.`,

    Troubleshooting: `Troubleshooting at ${score} indicates a critical diagnostic gap. Assessment evidence suggests the candidate may struggle to identify root causes or respond effectively to common production issues without structured support. Guided training in fault-finding, 5 Whys, PDCA, and practical troubleshooting scenarios is recommended.`,

    "Numerical Aptitude": `Numerical Aptitude at ${score} indicates a critical numeracy gap for production-related calculations. Assessment evidence suggests the candidate may struggle with production rates, percentages, ratios, efficiency calculations, or quality documentation. Foundational production-math training is recommended before assigning quantitative production tasks.`,

    "Safety & Work Ethic": `Safety & Work Ethic at ${score} indicates a critical concern for manufacturing environments. Assessment evidence suggests the candidate requires immediate reinforcement of PPE requirements, SOP discipline, hazard reporting, teamwork expectations, and safe workplace behavior before production exposure. Close supervision is recommended.`
  };

  return (
    commentary[normalizedArea] ||
    criticalGapCommentary(normalizedArea, percentage)
  );
};

const getManufacturingPriorityGapCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  const commentary = {
    "Technical Fundamentals": `Technical Fundamentals at ${score} requires priority development. The candidate shows limited evidence of readiness in basic maintenance principles, equipment understanding, or system concepts. Structured equipment familiarization, practical demonstrations, and supervised technical practice are recommended.`,

    Troubleshooting: `Troubleshooting at ${score} requires priority development. The candidate may need support with systematic diagnosis, root-cause analysis, and common line-fault response. Practical troubleshooting exercises and guided diagnostic frameworks are recommended.`,

    "Numerical Aptitude": `Numerical Aptitude at ${score} requires priority development. The candidate may need support with production calculations, percentages, ratios, and data interpretation. Production-math practice and guided metric review are recommended.`,

    "Safety & Work Ethic": `Safety & Work Ethic at ${score} requires priority development. The candidate should receive reinforcement in PPE use, SOP compliance, safety reporting, workplace conduct, and team expectations before being given independent production responsibilities.`
  };

  return (
    commentary[normalizedArea] ||
    significantGapCommentary(normalizedArea, percentage)
  );
};

const getManufacturingStrengthCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  const commentary = {
    "Technical Fundamentals": `Technical Fundamentals at ${score} is a strength area. Assessment evidence suggests the candidate has a reliable foundation in basic equipment understanding, maintenance principles, and manufacturing system concepts. This strength can support supervised production exposure or technical onboarding.`,

    Troubleshooting: `Troubleshooting at ${score} is a strength area. Assessment evidence suggests the candidate can approach common production issues with useful diagnostic thinking. This capability may support supervised problem-solving and practical line exposure.`,

    "Numerical Aptitude": `Numerical Aptitude at ${score} is a strength area. Assessment evidence suggests the candidate can handle production calculations, percentage work, ratios, and basic production metrics with confidence. This may support quality monitoring or production reporting tasks.`,

    "Safety & Work Ethic": `Safety & Work Ethic at ${score} is a strength area. Assessment evidence suggests reliable awareness of PPE, SOP discipline, safety reporting, teamwork, and professional conduct. Practical observation should still validate this behavior during onboarding.`
  };

  return commentary[normalizedArea] || strengthCommentary(normalizedArea, percentage);
};

// ======================================================
// SCORE-BASED COMMENTARY
// ======================================================

const criticalGapCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} is a critical development need at ${score}. Assessment evidence suggests limited readiness in this area. Immediate foundational training, close supervision, and clear progress milestones are recommended before assigning complex or independent responsibilities related to this competency.`;
};

const significantGapCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} requires priority development at ${score}. The candidate shows gaps that may affect role performance without structured support. Targeted training, guided practice, and regular supervisor feedback are recommended.`;
};

const developingCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} is developing at ${score}. The candidate shows foundational evidence but may need structured practice, feedback, and role-specific exposure to build consistency.`;
};

const approachingProficiencyCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} shows functional but non-dominant capability at ${score}. The candidate may perform basic tasks in this area but would benefit from reinforcement, coaching, and practical application.`;
};

const proficientCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} shows adequate capability at ${score}. Assessment evidence suggests the candidate can handle typical demands in this area with standard guidance, although continued practical validation is recommended.`;
};

const strengthCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} is a strength area at ${score}. Assessment evidence suggests reliable capability that can be used as a foundation for role contribution, practical assignments, or further development.`;
};

const exceptionalCommentary = (area, percentage) => {
  const normalizedArea = normalizeArea(area);
  const score = formatPercentage(percentage);

  return `${normalizedArea} is an exceptional strength at ${score}. Assessment evidence suggests strong capability in this area. This may be leveraged through advanced assignments, mentoring opportunities, or greater responsibility, subject to practical validation.`;
};

// ======================================================
// SUMMARY COMMENTARY
// ======================================================

export const generateStrengthsSummary = (strengths = [], topStrengths = []) => {
  if (!Array.isArray(strengths) || strengths.length === 0) {
    return "No category reached the current strength threshold. The candidate may still show foundational capability, but the supervisor should focus first on building baseline competence before assigning advanced responsibility.";
  }

  const displayedStrengths =
    Array.isArray(topStrengths) && topStrengths.length > 0
      ? topStrengths
      : strengths
          .slice(0, 3)
          .map((item) => item.area || item.category || item.name || item);

  return `Key strength areas include ${displayedStrengths.join(
    ", "
  )}. These areas represent the strongest evidence in the assessment and may be used as leverage for role placement, coaching, or gradual responsibility expansion.`;
};

export const generateWeaknessesSummary = (
  weaknesses = [],
  topWeaknesses = [],
  overallPercentage = 0
) => {
  if (!Array.isArray(weaknesses) || weaknesses.length === 0) {
    return "No major development area was identified below the current development threshold. Continued reinforcement, practical validation, and role-specific coaching are still recommended.";
  }

  const displayedWeaknesses =
    Array.isArray(topWeaknesses) && topWeaknesses.length > 0
      ? topWeaknesses
      : weaknesses
          .slice(0, 3)
          .map((item) => item.area || item.category || item.name || item);

  return `Priority development areas include ${displayedWeaknesses.join(
    ", "
  )}. These areas show the largest gaps relative to expected performance and should be addressed through targeted training, supervised practice, and regular progress review.`;
};

export const generateProfileCommentary = (
  percentage,
  classification,
  strengths = [],
  weaknesses = []
) => {
  const value = safeNumber(percentage, 0);
  const scoreLevel = getScoreLevel(value);
  const strengthCount = Array.isArray(strengths) ? strengths.length : 0;
  const weaknessCount = Array.isArray(weaknesses) ? weaknesses.length : 0;

  if (value >= 85) {
    return `This profile shows strong overall assessment evidence at ${formatPercentage(
      value
    )}. The candidate has ${strengthCount} identified strength area(s) and ${weaknessCount} development area(s). The result suggests readiness for more demanding responsibilities, subject to interview evidence, practical validation, and supervisor judgment.`;
  }

  if (value >= 75) {
    return `This profile shows reliable overall performance at ${formatPercentage(
      value
    )}. The candidate has ${strengthCount} identified strength area(s) and ${weaknessCount} development area(s). The result suggests a strong foundation with targeted development opportunities.`;
  }

  if (value >= 65) {
    return `This profile shows functional overall capability at ${formatPercentage(
      value
    )}. The candidate may be suitable for structured role placement with targeted reinforcement in weaker areas.`;
  }

  if (value >= 55) {
    return `This profile shows developing overall capability at ${formatPercentage(
      value
    )}. The candidate requires structured support, clear expectations, and close progress monitoring to improve readiness.`;
  }

  if (value >= 40) {
    return `This profile indicates significant development needs at ${formatPercentage(
      value
    )}. The supervisor should consider close supervision, foundational training, and a staged development plan before assigning independent responsibility.`;
  }

  return `This profile indicates critical development needs at ${formatPercentage(
    value
  )}. Immediate structured intervention, close supervision, and further validation are recommended before role placement.`;
};

// ======================================================
// MANUFACTURING-SPECIFIC PROFILE COMMENTARY
// ======================================================

const generateManufacturingProfileCommentaryFn = (
  percentage,
  categories = {}
) => {
  const value = safeNumber(percentage, 0);

  const safetyScore =
    safeNumber(categories["Safety & Work Ethic"], 0) ||
    safeNumber(categories["Safety &amp; Work Ethic"], 0);

  const technicalScore = safeNumber(categories["Technical Fundamentals"], 0);
  const troubleshootingScore = safeNumber(categories["Troubleshooting"], 0);
  const numericalScore = safeNumber(categories["Numerical Aptitude"], 0);

  if (value >= 80 && safetyScore >= 80 && technicalScore >= 70) {
    return `The manufacturing baseline profile suggests strong readiness for supervised manufacturing placement. Safety awareness and technical fundamentals appear reliable, although practical validation during onboarding is still recommended.`;
  }

  if (safetyScore > 0 && safetyScore < 60) {
    return `Safety and work ethic are the most important concerns in this manufacturing baseline profile. Safety training, SOP reinforcement, and close supervision should be completed before production exposure.`;
  }

  if (technicalScore > 0 && technicalScore < 60) {
    return `Technical fundamentals are a primary development need in this manufacturing baseline profile. The candidate should receive foundational equipment training and supervised technical exposure before independent production work.`;
  }

  if (troubleshootingScore > 0 && troubleshootingScore < 60) {
    return `Troubleshooting is a development need in this manufacturing baseline profile. Structured diagnostic training and guided fault-finding practice are recommended.`;
  }

  if (numericalScore > 0 && numericalScore < 60) {
    return `Numerical aptitude is a development need in this manufacturing baseline profile. Production math, efficiency calculations, and metric interpretation should be reinforced.`;
  }

  if (value >= 65) {
    return `The manufacturing baseline profile shows functional readiness with some areas requiring reinforcement. Supervised onboarding and practical validation are recommended.`;
  }

  return `The manufacturing baseline profile shows developing readiness. The candidate should complete structured training and supervised practical exposure before independent production responsibilities.`;
};

// ======================================================
// MAIN EXPORT FUNCTION
// ======================================================

export const generateCommentary = (
  area,
  percentage,
  type = "weakness",
  assessmentType = null
) => {
  const normalizedArea = normalizeArea(area);
  const value = safeNumber(percentage, 0);
  const manufacturing = isManufacturingArea(normalizedArea, assessmentType);

  /**
   * If type says strength but score is not actually strength-level,
   * use score-based wording instead of forcing a strength.
   */
  if (type === "strength" && isStrength(value)) {
    if (value >= REPORT_THRESHOLDS.strongStrengthThreshold) {
      if (manufacturing) {
        return getManufacturingStrengthCommentary(normalizedArea, value);
      }

      return exceptionalCommentary(normalizedArea, value);
    }

    if (manufacturing) {
      return getManufacturingStrengthCommentary(normalizedArea, value);
    }

    return strengthCommentary(normalizedArea, value);
  }

  /**
   * Score-based interpretation.
   */
  if (isCriticalGap(value)) {
    if (manufacturing) {
      return getManufacturingCriticalGapCommentary(normalizedArea, value);
    }

    return criticalGapCommentary(normalizedArea, value);
  }

  if (isPriorityDevelopment(value)) {
    if (manufacturing) {
      return getManufacturingPriorityGapCommentary(normalizedArea, value);
    }

    return significantGapCommentary(normalizedArea, value);
  }

  if (isDevelopmentArea(value)) {
    return developingCommentary(normalizedArea, value);
  }

  if (value < REPORT_THRESHOLDS.strengthThreshold) {
    return approachingProficiencyCommentary(normalizedArea, value);
  }

  if (manufacturing) {
    return getManufacturingStrengthCommentary(normalizedArea, value);
  }

  return strengthCommentary(normalizedArea, value);
};

// Export manufacturing-specific function
export const generateManufacturingProfileCommentary =
  generateManufacturingProfileCommentaryFn;

export default {
  generateCommentary,
  generateStrengthsSummary,
  generateWeaknessesSummary,
  generateProfileCommentary,
  generateManufacturingProfileCommentary
};
