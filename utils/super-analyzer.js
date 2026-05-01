// utils/super-analyzer.js

/**
 * SUPER ANALYZER
 *
 * Builds advanced supervisor-facing analysis from category scores and responses.
 *
 * Corrected version:
 * - Uses central scoring standard from utils/scoring.js
 * - Supports all assessment types
 * - Handles Manufacturing Baseline role readiness separately
 * - Removes unstable Date.now()/Buffer randomness
 * - Keeps existing export: generateSuperAnalysis
 * - Keeps output structure expected by the report page
 */

import {
  calculatePercentage,
  getClassificationDetailsFromPercentage,
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
  normalizeCategoryScore,
  REPORT_THRESHOLDS,
  roundNumber
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

const createStableHash = (input) => {
  const text = String(input || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36).toUpperCase();
};

const normalizeAssessmentType = (assessmentType) => {
  return assessmentType || "general";
};

const getCategoryPercentage = (categoryScores, categoryName) => {
  const direct = categoryScores?.[categoryName];

  if (direct) {
    return safeNumber(direct.percentage, 0);
  }

  const normalizedName = normalizeText(categoryName);

  const matchedEntry = Object.entries(categoryScores || {}).find(
    ([key]) => normalizeText(key) === normalizedName
  );

  if (!matchedEntry) return 0;

  return safeNumber(matchedEntry[1]?.percentage, 0);
};

const normalizeCategoryScoresForAnalysis = (categoryScores = {}) => {
  return Object.entries(categoryScores || {}).map(([category, data]) => {
    const normalized = normalizeCategoryScore(normalizeText(category), data);

    return {
      area: normalized.category,
      category: normalized.category,
      name: normalized.category,
      score: normalized.score,
      maxPossible: normalized.maxPossible,
      percentage: normalized.percentage,
      grade: normalized.grade,
      gradeDescription: normalized.gradeDescription,
      classification: normalized.classification,
      label: normalized.label,
      band: normalized.band,
      color: normalized.color,
      bg: normalized.bg,
      description: normalized.description,
      gap: normalized.gapToTarget,
      gapToTarget: normalized.gapToTarget,
      performanceComment: getScoreComment(normalized.percentage),
      supervisorImplication: getSupervisorImplication(normalized.percentage),
      scoreLevel: getScoreLevel(normalized.percentage)
    };
  });
};

const calculateOverallPercentage = (categoryScores, totalScore, maxScore) => {
  const total = safeNumber(totalScore, 0);
  const max = safeNumber(maxScore, 0);

  if (max > 0) {
    return calculatePercentage(total, max);
  }

  const categories = normalizeCategoryScoresForAnalysis(categoryScores);

  if (categories.length === 0) return 0;

  const average =
    categories.reduce((sum, item) => sum + safeNumber(item.percentage, 0), 0) /
    categories.length;

  return Math.round(average);
};

const buildProfileId = ({
  candidateName,
  assessmentType,
  totalScore,
  maxScore,
  categoryScores
}) => {
  const scoreString = Object.entries(categoryScores || {})
    .map(([category, data]) => `${category}:${data?.percentage ?? 0}`)
    .sort()
    .join("|");

  const base = `${candidateName}-${assessmentType}-${totalScore}-${maxScore}-${scoreString}`;
  return `SVX-${createStableHash(base).slice(0, 10)}`;
};

const buildSummary = ({
  candidateName,
  assessmentType,
  overallPercentage,
  classificationDetails,
  strengths,
  developmentAreas
}) => {
  const assessmentLabel = getAssessmentLabel(assessmentType);

  const strengthText =
    strengths.byScore.length > 0
      ? strengths.byScore
          .slice(0, 3)
          .map((item) => item.area)
          .join(", ")
      : "no dominant strength area";

  const developmentText =
    developmentAreas.byScore.length > 0
      ? developmentAreas.byScore
          .slice(0, 3)
          .map((item) => item.area)
          .join(", ")
      : "no major development area below threshold";

  const oneLine = `${candidateName} completed the ${assessmentLabel} with an overall score of ${overallPercentage}% and is classified as ${classificationDetails.classification}.`;

  const narrative = `${oneLine} Key strength evidence includes ${strengthText}. Priority development focus includes ${developmentText}. ${classificationDetails.description}`;

  return {
    oneLine,
    narrative,
    classification: classificationDetails.classification,
    grade: classificationDetails.grade,
    gradeDescription: classificationDetails.gradeDescription,
    overallScore: overallPercentage
  };
};

const getAssessmentLabel = (assessmentType) => {
  const labels = {
    general: "General Assessment",
    leadership: "Leadership Assessment",
    cognitive: "Cognitive Ability Assessment",
    technical: "Technical Competence Assessment",
    personality: "Personality Assessment",
    strategic_leadership: "Strategic Leadership Assessment",
    performance: "Performance Assessment",
    behavioral: "Behavioral & Soft Skills Assessment",
    cultural: "Cultural & Attitudinal Fit Assessment",
    manufacturing_baseline: "Manufacturing Baseline Assessment"
  };

  return labels[assessmentType] || "Assessment";
};

const buildStrengths = (categories) => {
  const byScore = categories
    .filter((item) => isStrength(item.percentage))
    .sort((a, b) => b.percentage - a.percentage);

  const relativeStrengths = [...categories]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return {
    byScore,
    relative: relativeStrengths,
    count: byScore.length,
    narrative:
      byScore.length > 0
        ? `The strongest assessed areas are ${byScore
            .slice(0, 3)
            .map((item) => item.area)
            .join(", ")}. These areas can be leveraged for placement, coaching, or gradual responsibility expansion.`
        : "No category reached the current strength threshold. Focus first on baseline capability development."
  };
};

const buildDevelopmentAreas = (categories) => {
  const byScore = categories
    .filter((item) => isDevelopmentArea(item.percentage))
    .sort((a, b) => a.percentage - b.percentage);

  const priority = byScore.filter(
    (item) =>
      isCriticalGap(item.percentage) || isPriorityDevelopment(item.percentage)
  );

  return {
    byScore,
    priority,
    count: byScore.length,
    narrative:
      byScore.length > 0
        ? `Priority development areas are ${byScore
            .slice(0, 3)
            .map((item) => item.area)
            .join(", ")}. These areas should be addressed through structured training, supervised practice, and progress review.`
        : "No major development area was identified below the current development threshold."
  };
};

const buildDifferentiators = (categories, assessmentType) => {
  const differentiators = [];

  categories
    .filter((item) => item.percentage >= REPORT_THRESHOLDS.strengthThreshold)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5)
    .forEach((item) => {
      differentiators.push({
        differentiator: item.area,
        score: item.percentage,
        value: getDifferentiatorValue(item.area, item.percentage, assessmentType)
      });
    });

  return differentiators;
};

const getDifferentiatorValue = (area, percentage, assessmentType) => {
  const normalizedArea = normalizeText(area);

  const manufacturingValues = {
    "Technical Fundamentals":
      "Provides a useful foundation for supervised production or technical onboarding.",
    Troubleshooting:
      "Supports supervised diagnostic work and common production issue response.",
    "Numerical Aptitude":
      "Supports production reporting, quality tracking, and metric interpretation.",
    "Safety & Work Ethic":
      "Supports safe onboarding and disciplined production behavior, subject to practical observation."
  };

  if (
    assessmentType === "manufacturing_baseline" &&
    manufacturingValues[normalizedArea]
  ) {
    return manufacturingValues[normalizedArea];
  }

  const values = {
    Ownership:
      "Supports accountability, initiative, and independent task follow-through.",
    Collaboration:
      "Supports teamwork, cross-functional contribution, and peer coordination.",
    Action:
      "Supports timely execution and movement of priorities.",
    Analysis:
      "Supports structured reasoning, planning, and decision quality.",
    "Risk Tolerance":
      "Supports controlled experimentation and improvement-focused assignments.",
    Structure:
      "Supports process discipline, SOP adherence, and quality consistency.",
    Communication:
      "Supports clear reporting, stakeholder interaction, and collaborative work.",
    "Emotional Intelligence":
      "Supports interpersonal effectiveness and workplace relationship management.",
    "Leadership & Management":
      "Supports gradual leadership exposure and team coordination.",
    "Problem-Solving":
      "Supports practical issue resolution and continuous improvement."
  };

  return (
    values[normalizedArea] ||
    `Represents a relative strength at ${percentage}% that may support role contribution.`
  );
};

const buildRiskFlags = (categories, assessmentType) => {
  const flags = [];

  categories
    .filter((item) => item.percentage < REPORT_THRESHOLDS.developmentThreshold)
    .sort((a, b) => a.percentage - b.percentage)
    .forEach((item) => {
      flags.push({
        area: item.area,
        score: item.percentage,
        severity: isCriticalGap(item.percentage)
          ? "Critical"
          : isPriorityDevelopment(item.percentage)
          ? "High"
          : "Medium",
        implication: getRiskImplication(item.area, item.percentage, assessmentType),
        recommendation: getRiskRecommendation(item.area, item.percentage, assessmentType)
      });
    });

  return flags;
};

const getRiskImplication = (area, percentage, assessmentType) => {
  const normalizedArea = normalizeText(area);

  if (assessmentType === "manufacturing_baseline") {
    const manufacturingRisks = {
      "Technical Fundamentals":
        "Candidate may struggle with basic equipment concepts or maintenance principles without foundational training.",
      Troubleshooting:
        "Candidate may struggle with fault diagnosis or root-cause analysis without guided practice.",
      "Numerical Aptitude":
        "Candidate may struggle with production calculations, ratios, or quality documentation.",
      "Safety & Work Ethic":
        "Candidate may not yet be ready for production exposure without safety training and close supervision."
    };

    if (manufacturingRisks[normalizedArea]) {
      return manufacturingRisks[normalizedArea];
    }
  }

  return getSupervisorImplication(percentage);
};

const getRiskRecommendation = (area, percentage, assessmentType) => {
  const normalizedArea = normalizeText(area);

  if (assessmentType === "manufacturing_baseline") {
    const manufacturingRecommendations = {
      "Technical Fundamentals":
        "Provide foundational technical training and supervised equipment familiarization.",
      Troubleshooting:
        "Provide structured diagnostic training using 5 Whys, PDCA, and guided fault scenarios.",
      "Numerical Aptitude":
        "Provide production math practice, metric interpretation, and supervised reporting exercises.",
      "Safety & Work Ethic":
        "Provide safety induction, SOP reinforcement, PPE training, and close onboarding supervision."
    };

    if (manufacturingRecommendations[normalizedArea]) {
      return manufacturingRecommendations[normalizedArea];
    }
  }

  if (isCriticalGap(percentage)) {
    return `Begin foundational development in ${normalizedArea} with close supervision and weekly progress checks.`;
  }

  if (isPriorityDevelopment(percentage)) {
    return `Prioritize structured training and guided practice in ${normalizedArea}.`;
  }

  return `Provide targeted coaching and practical reinforcement in ${normalizedArea}.`;
};

const buildRoleReadiness = (categoryScores, assessmentType, overallPercentage) => {
  if (assessmentType === "manufacturing_baseline") {
    return buildManufacturingRoleReadiness(categoryScores, overallPercentage);
  }

  return buildGeneralRoleReadiness(categoryScores, overallPercentage);
};

const buildManufacturingRoleReadiness = (categoryScores, overallPercentage) => {
  const technical = getCategoryPercentage(categoryScores, "Technical Fundamentals");
  const troubleshooting = getCategoryPercentage(categoryScores, "Troubleshooting");
  const numerical = getCategoryPercentage(categoryScores, "Numerical Aptitude");

  const safety =
    getCategoryPercentage(categoryScores, "Safety & Work Ethic") ||
    getCategoryPercentage(categoryScores, "Safety &amp; Work Ethic");

  const productionScore = Math.round(
    safety * 0.4 + technical * 0.3 + troubleshooting * 0.2 + numerical * 0.1
  );

  const qualityScore = Math.round(
    safety * 0.25 + numerical * 0.35 + troubleshooting * 0.25 + technical * 0.15
  );

  const maintenanceScore = Math.round(
    technical * 0.4 + troubleshooting * 0.35 + safety * 0.15 + numerical * 0.1
  );

  return {
    production: {
      score: productionScore,
      ready: productionScore >= 75 && safety >= 70,
      reasoning: getManufacturingReadinessReasoning(
        "Production",
        productionScore,
        {
          safety,
          technical,
          troubleshooting,
          numerical
        }
      )
    },

    quality: {
      score: qualityScore,
      ready: qualityScore >= 75 && numerical >= 65 && safety >= 65,
      reasoning: getManufacturingReadinessReasoning("Quality", qualityScore, {
        safety,
        technical,
        troubleshooting,
        numerical
      })
    },

    maintenance: {
      score: maintenanceScore,
      ready: maintenanceScore >= 75 && technical >= 70 && troubleshooting >= 65,
      reasoning: getManufacturingReadinessReasoning(
        "Maintenance",
        maintenanceScore,
        {
          safety,
          technical,
          troubleshooting,
          numerical
        }
      )
    }
  };
};

const getManufacturingReadinessReasoning = (role, score, data) => {
  const { safety, technical, troubleshooting, numerical } = data;

  if (safety < 60) {
    return `${role} readiness is limited because safety and work ethic require reinforcement before production exposure.`;
  }

  if (role === "Production") {
    if (score >= 75) {
      return "Assessment evidence suggests potential readiness for supervised production exposure with standard onboarding and practical validation.";
    }

    return "Production readiness is developing. Focus on safety reinforcement, technical basics, and supervised line exposure.";
  }

  if (role === "Quality") {
    if (score >= 75) {
      return "Assessment evidence suggests potential readiness for supervised quality or production tracking tasks.";
    }

    return "Quality readiness is developing. Focus on numerical aptitude, troubleshooting, and documentation practice.";
  }

  if (role === "Maintenance") {
    if (score >= 75) {
      return "Assessment evidence suggests potential readiness for a maintenance-trainee pathway with practical validation.";
    }

    return "Maintenance readiness is developing. Focus on technical fundamentals and structured troubleshooting practice.";
  }

  return "Role readiness should be validated through supervised practical exposure.";
};

const buildGeneralRoleReadiness = (categoryScores, overallPercentage) => {
  const leadership =
    getCategoryPercentage(categoryScores, "Leadership & Management") ||
    getCategoryPercentage(categoryScores, "People Leadership") ||
    getCategoryPercentage(categoryScores, "Vision / Strategy");

  const cognitive =
    getCategoryPercentage(categoryScores, "Cognitive Ability") ||
    getCategoryPercentage(categoryScores, "Analysis") ||
    getCategoryPercentage(categoryScores, "Problem-Solving");

  const technical =
    getCategoryPercentage(categoryScores, "Technical & Manufacturing") ||
    getCategoryPercentage(categoryScores, "Technical Knowledge") ||
    getCategoryPercentage(categoryScores, "Technical Fundamentals");

  const communication = getCategoryPercentage(categoryScores, "Communication");
  const emotional = getCategoryPercentage(categoryScores, "Emotional Intelligence");
  const ownership =
    getCategoryPercentage(categoryScores, "Ownership") ||
    getCategoryPercentage(categoryScores, "Accountability");
  const action =
    getCategoryPercentage(categoryScores, "Action") ||
    getCategoryPercentage(categoryScores, "Execution Drive");
  const structure = getCategoryPercentage(categoryScores, "Structure");

  const executiveScore = Math.round(
    leadership * 0.35 +
      cognitive * 0.2 +
      communication * 0.15 +
      emotional * 0.15 +
      ownership * 0.15
  );

  const managementScore = Math.round(
    leadership * 0.25 +
      communication * 0.2 +
      emotional * 0.2 +
      ownership * 0.2 +
      action * 0.15
  );

  const technicalScore = Math.round(
    technical * 0.4 + cognitive * 0.25 + structure * 0.2 + action * 0.15
  );

  return {
    executive: {
      score: executiveScore || overallPercentage,
      ready: executiveScore >= 80 && leadership >= 70,
      reasoning:
        executiveScore >= 80 && leadership >= 70
          ? "Assessment evidence suggests possible readiness for strategic or senior responsibility, subject to interview and work validation."
          : "Executive readiness is not yet confirmed. Strengthen leadership, strategic thinking, communication, and accountability evidence."
    },

    management: {
      score: managementScore || overallPercentage,
      ready: managementScore >= 75 && leadership >= 65,
      reasoning:
        managementScore >= 75 && leadership >= 65
          ? "Assessment evidence suggests possible readiness for supervised management exposure or team coordination."
          : "Management readiness is developing. Focus on leadership, people skills, ownership, and execution consistency."
    },

    technical: {
      score: technicalScore || overallPercentage,
      ready: technicalScore >= 75 && technical >= 65,
      reasoning:
        technicalScore >= 75 && technical >= 65
          ? "Assessment evidence suggests possible readiness for technical or specialist assignments with role validation."
          : "Technical readiness is developing. Focus on technical capability, structured thinking, and practical application."
    }
  };
};

const buildDevelopmentPlan = (developmentAreas, assessmentType) => {
  const topAreas = developmentAreas.byScore.slice(0, 3);

  if (topAreas.length === 0) {
    return {
      focus: "Maintain and leverage strengths",
      thirtyDays: [
        "Confirm strengths through practical work observation.",
        "Assign role-relevant tasks that use the strongest areas.",
        "Provide feedback and identify stretch opportunities."
      ],
      sixtyDays: [
        "Increase responsibility gradually where performance is validated.",
        "Encourage peer support or mentoring in strength areas.",
        "Monitor consistency across real work situations."
      ],
      ninetyDays: [
        "Review readiness for expanded responsibility.",
        "Document performance evidence.",
        "Plan next-stage development or role progression."
      ]
    };
  }

  return {
    focus: topAreas.map((item) => item.area).join(", "),
    thirtyDays: topAreas.map(
      (item) =>
        `Begin structured development in ${item.area}; clarify expectations and assign supervised practice.`
    ),
    sixtyDays: topAreas.map(
      (item) =>
        `Review progress in ${item.area}; add practical tasks and targeted feedback.`
    ),
    ninetyDays: topAreas.map(
      (item) =>
        `Validate improvement in ${item.area}; consider reassessment or expanded responsibility if progress is confirmed.`
    )
  };
};

const buildEvidenceNotes = (responses, categoryScores) => {
  const responseCount = Array.isArray(responses) ? responses.length : 0;
  const categoryCount = Object.keys(categoryScores || {}).length;

  return {
    responseCount,
    categoryCount,
    notes: [
      `Analysis is based on ${responseCount} recorded response(s).`,
      `Category analysis covers ${categoryCount} scored area(s).`,
      "Assessment evidence should be interpreted together with interviews, supervisor judgment, references, and practical validation.",
      "Behavioral and timing insights depend on whether response timing and navigation data were captured during the attempt."
    ]
  };
};

/**
 * Main export.
 */
export const generateSuperAnalysis = (
  candidateName,
  assessmentType,
  responses,
  categoryScores,
  totalScore,
  maxScore
) => {
  const safeAssessmentType = normalizeAssessmentType(assessmentType);
  const safeResponses = Array.isArray(responses) ? responses : [];
  const safeCategoryScores = categoryScores || {};

  const overallPercentage = calculateOverallPercentage(
    safeCategoryScores,
    totalScore,
    maxScore
  );

  const classificationDetails =
    getClassificationDetailsFromPercentage(overallPercentage);

  const categories = normalizeCategoryScoresForAnalysis(safeCategoryScores);

  const strengths = buildStrengths(categories);
  const developmentAreas = buildDevelopmentAreas(categories);
  const differentiators = buildDifferentiators(categories, safeAssessmentType);
  const riskFlags = buildRiskFlags(categories, safeAssessmentType);

  const roleReadiness = buildRoleReadiness(
    safeCategoryScores,
    safeAssessmentType,
    overallPercentage
  );

  const developmentPlan = buildDevelopmentPlan(
    developmentAreas,
    safeAssessmentType
  );

  const evidenceNotes = buildEvidenceNotes(safeResponses, safeCategoryScores);

  const summary = buildSummary({
    candidateName,
    assessmentType: safeAssessmentType,
    overallPercentage,
    classificationDetails,
    strengths,
    developmentAreas
  });

  const profileId = buildProfileId({
    candidateName,
    assessmentType: safeAssessmentType,
    totalScore,
    maxScore,
    categoryScores: safeCategoryScores
  });

  return {
    profileId,

    candidateName,
    assessmentType: safeAssessmentType,
    assessmentName: getAssessmentLabel(safeAssessmentType),

    totalScore: safeNumber(totalScore, 0),
    maxScore: safeNumber(maxScore, 0),
    overallPercentage,
    overallScore: overallPercentage,

    grade: getGrade(overallPercentage),
    gradeDescription: getGradeDescription(overallPercentage),
    classification: classificationDetails.classification,
    classificationDetails,

    summary,

    strengths,
    developmentAreas,
    differentiators,
    riskFlags,
    roleReadiness,
    developmentPlan,
    evidenceNotes,

    categoryAnalysis: categories,

    supervisorSnapshot: {
      readiness: classificationDetails.classification,
      primaryStrength:
        strengths.byScore[0]?.area || strengths.relative[0]?.area || "None identified",
      primaryDevelopmentArea:
        developmentAreas.byScore[0]?.area || "None identified",
      recommendedSupport:
        developmentAreas.byScore.length > 0
          ? "Structured development plan with supervisor follow-up"
          : "Maintain strengths through practical validation and role-relevant assignments",
      retestGuidance:
        developmentAreas.priority.length > 0
          ? "Retest after 30-90 days of focused development"
          : "Retest optional unless required by role progression"
    }
  };
};

export default {
  generateSuperAnalysis
};
