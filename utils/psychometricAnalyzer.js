// utils/psychometricAnalyzer.js

/**
 * PSYCHOMETRIC ANALYZER
 *
 * Generates structured psychometricWorkEthic * Generates structured psychometric-style analysis from category scores.
  } = manufacturingCategories;

  let summary = "";

  if (safetyWorkEthic.percentage < 60) {
    summary += `Safety and work ethic are the most important concerns. Safety training, SOP reinforcement, and close supervision are recommended before production exposure. `;
  } else if (safetyWorkEthic.percentage >= 75) {
    summary += `Safety and work ethic appear to be reliable based on the assessment evidence. Practical observation during onboarding is still recommended. `;
  }

  if (technicalFundamentals.percentage < 60) {
    summary += `Technical fundamentals require structured development before independent equipment-related tasks. `;
  } else if (technicalFundamentals.percentage >= 75) {
    summary += `Technical fundamentals appear to be a relative strength and may support supervised production or technical onboarding. `;
  }

  if (troubleshooting.percentage < 60) {
    summary += `Troubleshooting capability should be developed through guided diagnostic practice and root-cause analysis. `;
  }

  if (numericalAptitude.percentage < 60) {
    summary += `Numerical aptitude should be reinforced through production math and metric interpretation practice. `;
  }

  if (strengths.length > 0) {
    summary += `Key strengths include ${strengths
      .slice(0, 3)
      .map((strength) => strength.name)
      .join(", ")}. `;
  }

  if (risks.length > 0) {
    summary += `Priority development areas include ${risks
      .slice(0, 3)
      .map((risk) => risk.name)
      .join(", ")}. `;
  }

  summary += `Manufacturing readiness should be confirmed through practical observation and supervised onboarding.`;

  return summary;
};

const generateStrengthsAnalysis = (strengths, assessmentType) => {
  if (!strengths || strengths.length === 0) {
    return "";
  }

  let analysis = `🟢 **Key Strengths**\n\n`;

  strengths.forEach((strength) => {
    analysis += `**${strength.name}** – ${strength.percentage}% (${strength.grade})\n\n`;
    analysis += `${getStrengthNarrative(strength.name, strength.percentage, assessmentType)}\n\n`;

    const indicators = getStrengthIndicators(strength.name, assessmentType);

    if (indicators.length > 0) {
      analysis += `${indicators.map((indicator) => `• ${indicator}`).join("\n")}\n\n`;
    }

    analysis += `Supervisor implication: ${getSupervisorImplication(
      strength.percentage
    )}\n\n`;
  });

  return analysis;
};

const generateModerateAnalysis = (moderate, assessmentType) => {
  if (!moderate || moderate.length === 0) {
    return "";
  }

  let analysis = `🟡 **Functional / Reinforcement Areas**\n\n`;

  moderate.forEach((item) => {
    analysis += `**${item.name}** – ${item.percentage}% (${item.grade})\n\n`;
    analysis += `${getModerateNarrative(item.name, item.percentage, assessmentType)}\n\n`;
    analysis += `Supervisor implication: ${getSupervisorImplication(
      item.percentage
    )}\n\n`;
  });

  return analysis;
};

const generateRisksAnalysis = (risks, assessmentType) => {
  if (!risks || risks.length === 0) {
    return "";
  }

  let analysis = `🔴 **Development & Risk Areas**\n\n`;

  risks.forEach((risk) => {
    analysis += `**${risk.name}** – ${risk.percentage}% (${risk.grade})\n\n`;
    analysis += `${getRiskNarrative(risk.name, risk.percentage, assessmentType)}\n\n`;

    const implications = getRiskImplications(risk.name, assessmentType);

    if (implications.length > 0) {
      analysis += `May indicate:\n\n`;
      analysis += `${implications.map((item) => `• ${item}`).join("\n")}\n\n`;
    }

    analysis += `Recommended focus: ${getDevelopmentRecommendationText(
      risk.name,
      risk.percentage,
      assessmentType
    )}\n\n`;
  });

  return analysis;
};

const generatePersonalityStructure = (
  ownership,
  collaboration,
  action,
  analysisTrait,
  riskTolerance,
  structure,
  assessmentType,
  manufacturingCategories
) => {
  if (assessmentType === "manufacturing_baseline") {
    return generateManufacturingStructure(manufacturingCategories);
  }

  const profileParts = [
    ownership,
    collaboration,
    action,
    analysisTrait,
    riskTolerance,
    structure
  ];

  const hasPersonalityData = profileParts.some(
    (item) => item && item.maxPossible > 0
  );

  if (!hasPersonalityData) {
    return `🧠 **Profile Structure Interpretation**\n\nNo dedicated personality-trait category pattern was available for this assessment. The report should rely on the category scores, response evidence, and supervisor validation.`;
  }

  let text = `🧠 **Personality Structure Interpretation**\n\n`;
  text += `The assessment pattern suggests the following trait structure:\n\n`;

  profileParts.forEach((item) => {
    text += `• ${getTraitLevel(item.percentage)} ${item.name} (${item.percentage}%)\n`;
  });

  text += `\n`;

  if (
    action.percentage >= REPORT_THRESHOLDS.strengthThreshold &&
    riskTolerance.percentage >= REPORT_THRESHOLDS.developmentThreshold
  ) {
    text += `This pattern suggests an action-oriented profile. The candidate may be comfortable moving tasks forward, especially where expectations are clear. Supervisors should still validate quality, judgment, and follow-through in practical settings.\n\n`;
  } else if (
    collaboration.percentage >= REPORT_THRESHOLDS.strengthThreshold &&
    structure.percentage >= REPORT_THRESHOLDS.developmentThreshold
  ) {
    text += `This pattern suggests a collaborative and structured profile. The candidate may contribute well in team environments with defined processes and clear expectations.\n\n`;
  } else if (
    analysisTrait.percentage >= REPORT_THRESHOLDS.strengthThreshold &&
    structure.percentage >= REPORT_THRESHOLDS.developmentThreshold
  ) {
    text += `This pattern suggests an analytical and process-oriented profile. The candidate may perform well in tasks requiring planning, accuracy, and structured thinking.\n\n`;
  } else if (
    ownership.percentage >= REPORT_THRESHOLDS.strengthThreshold &&
    action.percentage >= REPORT_THRESHOLDS.developmentThreshold
  ) {
    text += `This pattern suggests useful indicators of accountability and initiative. The candidate may benefit from clear ownership of tasks and progressive responsibility.\n\n`;
  } else {
    text += `This profile does not show one dominant trait pattern. Placement should be based on the strongest category evidence and validated through supervised work exposure.\n\n`;
  }

  return text;
};

const generateManufacturingStructure = (manufacturingCategories) => {
  const {
    technicalFundamentals,
    troubleshooting,
    numericalAptitude,
    safetyWorkEthic
  } = manufacturingCategories;

  let text = `🧠 **Manufacturing Baseline Structure Interpretation**\n\n`;

  text += `The manufacturing profile shows:\n\n`;
  text += `• ${getTraitLevel(technicalFundamentals.percentage)} Technical Fundamentals (${technicalFundamentals.percentage}%)\n`;
  text += `• ${getTraitLevel(troubleshooting.percentage)} Troubleshooting (${troubleshooting.percentage}%)\n`;
  text += `• ${getTraitLevel(numericalAptitude.percentage)} Numerical Aptitude (${numericalAptitude.percentage}%)\n`;
  text += `• ${getTraitLevel(safetyWorkEthic.percentage)} Safety & Work Ethic (${safetyWorkEthic.percentage}%)\n\n`;

  if (safetyWorkEthic.percentage < 60) {
    text += `Safety and work ethic should be addressed first because safety readiness is foundational for manufacturing placement.\n\n`;
  } else if (
    safetyWorkEthic.percentage >= 75 &&
    technicalFundamentals.percentage >= 65
  ) {
    text += `The candidate shows a useful baseline for supervised production exposure, subject to practical validation.\n\n`;
  } else {
    text += `The candidate shows a mixed manufacturing baseline and would benefit from structured onboarding, coaching, and supervised exposure.\n\n`;
  }

  return text;
};

const generateRoleSuitability = (
  strengths,
  risks,
  ownership,
  collaboration,
  action,
  analysis,
  riskTolerance,
  structure,
  assessmentType,
  manufacturingCategories
) => {
  if (assessmentType === "manufacturing_baseline") {
    return generateManufacturingRoleSuitability(
      strengths,
      risks,
      manufacturingCategories
    );
  }

  const strengthNames = strengths.map((item) => item.name);
  const riskNames = risks.map((item) => item.name);

  let text = `🎯 **Role Suitability**\n\n`;
  text += `**Potentially Suitable For:**\n\n`;

  let addedSuitable = false;

  if (
    strengthNames.includes("Ownership") ||
    strengthNames.includes("Action")
  ) {
    text += `• Roles requiring initiative, follow-through, and accountability\n`;
    addedSuitable = true;
  }

  if (strengthNames.includes("Collaboration")) {
    text += `• Team-based or cross-functional work environments\n`;
    addedSuitable = true;
  }

  if (
    strengthNames.includes("Analysis") ||
    strengthNames.includes("Structure")
  ) {
    text += `• Analytical, process-driven, planning, quality, or compliance tasks\n`;
    addedSuitable = true;
  }

  if (strengthNames.includes("Risk Tolerance")) {
    text += `• Controlled improvement, innovation, or pilot assignments\n`;
    addedSuitable = true;
  }

  if (!addedSuitable) {
    text += `• Structured roles with clear expectations, defined tasks, and supervisor support\n`;
  }

  text += `\n**Use Caution With:**\n\n`;

  let addedRisk = false;

  if (riskNames.includes("Ownership")) {
    text += `• High-autonomy roles without close follow-up\n`;
    addedRisk = true;
  }

  if (riskNames.includes("Collaboration")) {
    text += `• Highly interdependent team assignments without support\n`;
    addedRisk = true;
  }

  if (riskNames.includes("Action")) {
    text += `• Fast-paced, ambiguous, or time-sensitive decision roles\n`;
    addedRisk = true;
  }

  if (riskNames.includes("Analysis")) {
    text += `• Complex analytical decisions without structured frameworks\n`;
    addedRisk = true;
  }

  if (riskNames.includes("Risk Tolerance")) {
    text += `• High-uncertainty roles without guided risk review\n`;
    addedRisk = true;
  }

  if (riskNames.includes("Structure")) {
    text += `• Quality-critical or procedure-heavy tasks without SOP reinforcement\n`;
    addedRisk = true;
  }

  if (!addedRisk) {
    text += `• No major role-risk pattern was identified from the category structure. Practical validation is still recommended.\n`;
  }

  return text;
};

const generateManufacturingRoleSuitability = (
  strengths,
  risks,
  manufacturingCategories
) => {
  const {
    technicalFundamentals,
    troubleshooting,
    numericalAptitude,
    safetyWorkEthic
  } = manufacturingCategories;

  let text = `🎯 **Manufacturing Role Suitability**\n\n`;

  text += `**Potentially Suitable For:**\n\n`;

  let addedSuitable = false;

  if (safetyWorkEthic.percentage >= 70 && technicalFundamentals.percentage >= 60) {
    text += `• Supervised production or manufacturing associate exposure\n`;
    addedSuitable = true;
  }

  if (troubleshooting.percentage >= 65 && numericalAptitude.percentage >= 65) {
    text += `• Supervised quality monitoring or production tracking tasks\n`;
    addedSuitable = true;
  }

  if (technicalFundamentals.percentage >= 75 && troubleshooting.percentage >= 65) {
    text += `• Maintenance-trainee pathway with practical validation\n`;
    addedSuitable = true;
  }

  if (!addedSuitable) {
    text += `• Training-first pathway before independent role placement\n`;
  }

  text += `\n**Use Caution With:**\n\n`;

  if (safetyWorkEthic.percentage < 60) {
    text += `• Any production exposure before safety training and SOP validation\n`;
  }

  if (technicalFundamentals.percentage < 60) {
    text += `• Independent equipment-related tasks\n`;
  }

  if (troubleshooting.percentage < 60) {
    text += `• Independent fault diagnosis or line troubleshooting\n`;
  }

  if (numericalAptitude.percentage < 60) {
    text += `• Calculation-heavy production reporting or quality documentation\n`;
  }

  if (
    safetyWorkEthic.percentage >= 60 &&
    technicalFundamentals.percentage >= 60 &&
    troubleshooting.percentage >= 60 &&
    numericalAptitude.percentage >= 60
  ) {
    text += `• No critical manufacturing placement restriction was identified, but practical validation is still recommended.\n`;
  }

  return text;
};

const generateDevelopmentPriorities = (
  risks,
  moderate,
  assessmentType
) => {
  const priorities = [...(risks || []), ...(moderate || [])]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 4);

  if (priorities.length === 0) {
    return "";
  }

  let text = `📈 **Development Priorities**\n\n`;

  priorities.forEach((item, index) => {
    text += `${index + 1}. **${item.name}** – ${item.percentage}%\n\n`;
    text += `${getDevelopmentRecommendationText(
      item.name,
      item.percentage,
      assessmentType
    )}\n\n`;
  });

  return text;
};

const generateOverallInterpretation = (
  candidateName,
  avgScore,
  strengths,
  risks,
  analysisTrait,
  riskTolerance,
  structure,
  assessmentType,
  manufacturingCategories
) => {
  let text = `📌 **Overall Interpretation**\n\n`;

  if (assessmentType === "manufacturing_baseline") {
    const { safetyWorkEthic, technicalFundamentals } = manufacturingCategories;

    if (safetyWorkEthic.percentage < 60) {
      text += `${candidateName} should not be placed into independent production exposure until safety and work ethic gaps are addressed through training and practical validation. `;
    } else if (
      avgScore >= 70 &&
      safetyWorkEthic.percentage >= 70 &&
      technicalFundamentals.percentage >= 60
    ) {
      text += `${candidateName} may be considered for supervised manufacturing exposure with standard onboarding and practical validation. `;
    } else {
      text += `${candidateName} shows a developing manufacturing baseline and should receive structured training before independent responsibility. `;
    }

    return text;
  }

  if (avgScore >= 85) {
    text += `${candidateName} shows strong overall assessment evidence with readiness for more demanding work, subject to practical validation. `;
  } else if (avgScore >= 75) {
    text += `${candidateName} shows reliable overall capability with clear strengths and targeted development needs. `;
  } else if (avgScore >= 65) {
    text += `${candidateName} shows functional capability and may be suitable for structured role placement with reinforcement. `;
  } else if (avgScore >= 55) {
    text += `${candidateName} shows developing capability and requires structured support, clear expectations, and progress monitoring. `;
  } else {
    text += `${candidateName} shows significant development needs and should receive foundational training and close supervision before increased responsibility. `;
  }

  if (risks.length > 0) {
    text += `Priority attention should be given to ${risks
      .slice(0, 3)
      .map((risk) => risk.name)
      .join(", ")}. `;
  }

  return text;
};

// ======================================================
// NARRATIVE HELPERS
// ======================================================

const getTraitLevel = (percentage) => {
  const value = safeNumber(percentage, 0);

  if (value >= 85) return "Exceptional";
  if (value >= 75) return "High";
  if (value >= 65) return "Functional";
  if (value >= 55) return "Developing";
  if (value >= 40) return "Low";
  return "Critical";
};

const getStrengthNarrative = (name, percentage, assessmentType) => {
  const category = normalizeText(name);

  const manufacturing = {
    "Technical Fundamentals":
      "Assessment evidence suggests useful foundational technical knowledge that may support supervised production or maintenance onboarding.",
    Troubleshooting:
      "Assessment evidence suggests useful diagnostic thinking for common production issues.",
    "Numerical Aptitude":
      "Assessment evidence suggests reliable production math and quantitative reasoning capability.",
    "Safety & Work Ethic":
      "Assessment evidence suggests reliable safety awareness and workplace conduct indicators."
  };

  if (assessmentType === "manufacturing_baseline" && manufacturing[category]) {
    return manufacturing[category];
  }

  const narratives = {
    Ownership:
      "Assessment evidence suggests accountability, follow-through, and willingness to own outcomes.",
    Collaboration:
      "Assessment evidence suggests teamwork orientation and ability to contribute in group settings.",
    Action:
      "Assessment evidence suggests initiative, decisiveness, and willingness to move tasks forward.",
    Analysis:
      "Assessment evidence suggests structured reasoning and data-informed thinking.",
    "Risk Tolerance":
      "Assessment evidence suggests comfort with controlled uncertainty and calculated experimentation.",
    Structure:
      "Assessment evidence suggests process discipline, consistency, and procedural reliability."
  };

  return (
    narratives[category] ||
    `Assessment evidence suggests ${getScoreComment(
      percentage
    ).toLowerCase()} in ${category}.`
  );
};

const getStrengthIndicators = (name, assessmentType) => {
  const category = normalizeText(name);

  const indicators = {
    "Technical Fundamentals": [
      "Understands basic equipment concepts",
      "Can build on maintenance and system knowledge",
      "May progress well with practical onboarding"
    ],
    Troubleshooting: [
      "Shows diagnostic thinking",
      "Can benefit from practical fault-finding exposure",
      "May support common issue resolution with guidance"
    ],
    "Numerical Aptitude": [
      "Handles production calculations",
      "Can interpret basic metrics",
      "May support quality or production tracking"
    ],
    "Safety & Work Ethic": [
      "Shows safety awareness",
      "Understands SOP and PPE expectations",
      "May model safe work habits after onboarding validation"
    ],
    Ownership: [
      "Takes responsibility for outcomes",
      "Follows through on commitments",
      "Can be trusted with clear ownership"
    ],
    Collaboration: [
      "Works with others constructively",
      "Can contribute to team objectives",
      "May support peer learning"
    ],
    Action: [
      "Moves tasks forward",
      "Can make timely decisions",
      "Shows initiative"
    ],
    Analysis: [
      "Uses structured thinking",
      "Considers evidence before acting",
      "Can support problem-solving"
    ],
    "Risk Tolerance": [
      "Can work with controlled uncertainty",
      "May support improvement initiatives",
      "Can evaluate calculated risks"
    ],
    Structure: [
      "Follows process",
      "Supports consistent execution",
      "May be reliable in procedure-based tasks"
    ]
  };

  return indicators[category] || [];
};

const getModerateNarrative = (name, percentage, assessmentType) => {
  const category = normalizeText(name);

  if (assessmentType === "manufacturing_baseline") {
    return `${category} shows functional but non-dominant evidence. The candidate may perform basic tasks with structure, coaching, and supervised practice.`;
  }

  return `${category} shows functional evidence. The candidate may be able to apply this capability in routine situations but would benefit from reinforcement and role-specific practice.`;
};

const getRiskNarrative = (name, percentage, assessmentType) => {
  const category = normalizeText(name);

  if (assessmentType === "manufacturing_baseline") {
    const manufacturingNarratives = {
      "Technical Fundamentals":
        "The candidate may struggle with equipment concepts, maintenance basics, or system understanding without foundational technical training.",
      Troubleshooting:
        "The candidate may struggle with root-cause analysis, diagnostic thinking, or common line-fault response without structured support.",
      "Numerical Aptitude":
        "The candidate may struggle with production calculations, efficiency math, ratios, or quality documentation.",
      "Safety & Work Ethic":
        "The candidate may need safety training, SOP reinforcement, and close supervision before production exposure."
    };

    return (
      manufacturingNarratives[category] ||
      `${category} requires structured development before independent manufacturing responsibility.`
    );
  }

  const narratives = {
    Ownership:
      "The candidate may need clear accountability expectations, task ownership, and close follow-up.",
    Collaboration:
      "The candidate may need support in team-based environments and structured feedback on interpersonal contribution.",
    Action:
      "The candidate may delay decisions or wait for direction without clear expectations.",
    Analysis:
      "The candidate may need structured analytical frameworks and guided reasoning practice.",
    "Risk Tolerance":
      "The candidate may avoid uncertainty or resist necessary change without controlled experimentation.",
    Structure:
      "The candidate may need SOP reinforcement, checklists, and process-discipline support."
  };

  return (
    narratives[category] ||
    `${category} requires structured development and supervisor support.`
  );
};

const getRiskImplications = (name, assessmentType) => {
  const category = normalizeText(name);

  const manufacturingImplications = {
    "Technical Fundamentals": [
      "May require equipment familiarization",
      "May need basic maintenance training",
      "May need supervised technical exposure"
    ],
    Troubleshooting: [
      "May require diagnostic frameworks",
      "May need guided fault-finding practice",
      "May need support identifying root causes"
    ],
    "Numerical Aptitude": [
      "May require production math practice",
      "May need support with production metrics",
      "May need guidance on quality documentation"
    ],
    "Safety & Work Ethic": [
      "May require safety training before production exposure",
      "May need SOP and PPE reinforcement",
      "May require close supervision during onboarding"
    ]
  };

  if (
    assessmentType === "manufacturing_baseline" &&
    manufacturingImplications[category]
  ) {
    return manufacturingImplications[category];
  }

  const implications = {
    Ownership: [
      "May require clear ownership boundaries",
      "May need frequent progress checks",
      "May need coaching on accountability"
    ],
    Collaboration: [
      "May need teamwork support",
      "May struggle with highly interdependent tasks",
      "May benefit from peer feedback"
    ],
    Action: [
      "May hesitate in time-sensitive tasks",
      "May need clear next steps",
      "May benefit from time-bound decisions"
    ],
    Analysis: [
      "May need structured reasoning frameworks",
      "May miss alternatives without guidance",
      "May need data interpretation support"
    ],
    "Risk Tolerance": [
      "May avoid controlled experimentation",
      "May resist uncertain tasks",
      "May need risk-assessment coaching"
    ],
    Structure: [
      "May skip steps without checklists",
      "May need SOP reinforcement",
      "May require process monitoring"
    ]
  };

  return implications[category] || [];
};

const getDevelopmentRecommendationText = (
  name,
  percentage,
  assessmentType
) => {
  const category = normalizeText(name);
  const value = safeNumber(percentage, 0);

  if (value < 40) {
    return `Begin foundational development in ${category} with close supervision, structured training, and weekly progress review.`;
  }

  if (value < 55) {
    return `Prioritize ${category} through targeted training, guided practice, and supervisor feedback.`;
  }

  if (value < 65) {
    return `Develop ${category} through structured practice and practical exposure.`;
  }

  return `Reinforce ${category} through role-specific assignments and feedback.`;
};

export default {
  generatePsychometricAnalysis
};
 *
 * Corrected version:
 * - Uses central scoring standard from utils/scoring.js
 * - Supports all assessment types
 * - Keeps existing export: generatePsychometricAnalysis
 * - Keeps expected output structure for super-analyzer.js
 * - Uses evidence-based, supervisor-friendly wording
 */

import {
  calculatePercentage,
  getScoreLevel,
  getGrade,
  getClassificationFromPercentage,
  getSupervisorImplication,
  getScoreComment,
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

const normalizeCategoryScores = (categoryScores = {}) => {
  return Object.entries(categoryScores || {}).map(([name, data]) => {
    const score = safeNumber(data?.score ?? data?.total ?? data?.rawScore ?? 0);
    const maxPossible = safeNumber(data?.maxPossible ?? data?.max_score ?? 0);
    const percentage =
      data?.percentage !== undefined && data?.percentage !== null
        ? safeNumber(data.percentage, 0)
        : calculatePercentage(score, maxPossible);

    return {
      name: normalizeText(name),
      score,
      maxPossible,
      percentage,
      grade: getGrade(percentage),
      scoreLevel: getScoreLevel(percentage),
      gapToTarget: calculateGapToTarget(percentage)
    };
  });
};

const findCategory = (categories, possibleNames = []) => {
  return (
    categories.find((category) =>
      possibleNames.some((name) =>
        category.name.toLowerCase().includes(name.toLowerCase())
      )
    ) || {
      name: possibleNames[0] || "Unknown",
      score: 0,
      maxPossible: 0,
      percentage: 0,
      grade: getGrade(0),
      scoreLevel: getScoreLevel(0),
      gapToTarget: calculateGapToTarget(0)
    }
  );
};

const getAveragePercentage = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) return 0;

  const totalScore = categories.reduce(
    (sum, category) => sum + safeNumber(category.score, 0),
    0
  );

  const maxPossible = categories.reduce(
    (sum, category) => sum + safeNumber(category.maxPossible, 0),
    0
  );

  if (maxPossible > 0) {
    return calculatePercentage(totalScore, maxPossible);
  }

  const average =
    categories.reduce(
      (sum, category) => sum + safeNumber(category.percentage, 0),
      0
    ) / categories.length;

  return Math.round(average);
};

export const generatePsychometricAnalysis = (
  categoryScores,
  assessmentType,
  candidateName,
  responseInsights = {}
) => {
  const categories = normalizeCategoryScores(categoryScores);

  const totalScore = categories.reduce(
    (sum, category) => sum + safeNumber(category.score, 0),
    0
  );

  const maxPossible = categories.reduce(
    (sum, category) => sum + safeNumber(category.maxPossible, 0),
    0
  );

  const avgScore = getAveragePercentage(categories);
  const overallGrade = getGrade(avgScore);
  const classification = getClassificationFromPercentage(avgScore);

  const strengths = categories
    .filter((category) => isStrength(category.percentage))
    .sort((a, b) => b.percentage - a.percentage);

  const moderate = categories
    .filter(
      (category) =>
        !isStrength(category.percentage) &&
        !isDevelopmentArea(category.percentage)
    )
    .sort((a, b) => b.percentage - a.percentage);

  const risks = categories
    .filter((category) => isDevelopmentArea(category.percentage))
    .sort((a, b) => a.percentage - b.percentage);

  const ownership = findCategory(categories, ["Ownership"]);
  const collaboration = findCategory(categories, ["Collaboration"]);
  const action = findCategory(categories, ["Action"]);
  const analysisTrait = findCategory(categories, ["Analysis"]);
  const riskTolerance = findCategory(categories, ["Risk Tolerance", "Risk"]);
  const structure = findCategory(categories, ["Structure"]);

  const manufacturingCategories = {
    technicalFundamentals: findCategory(categories, [
      "Technical Fundamentals"
    ]),
    troubleshooting: findCategory(categories, ["Troubleshooting"]),
    numericalAptitude: findCategory(categories, ["Numerical Aptitude"]),
    safetyWorkEthic: findCategory(categories, [
      "Safety & Work Ethic",
      "Safety"
    ])
  };

  return {
    overallPerformance: {
      totalScore,
      maxPossible,
      avgScore,
      overallGrade,
      classification,
      scoreLevel: getScoreLevel(avgScore),
      supervisorImplication: getSupervisorImplication(avgScore)
    },

    executiveSummary: generateExecutiveSummary(
      candidateName,
      avgScore,
      strengths,
      risks,
      ownership,
      collaboration,
      action,
      analysisTrait,
      riskTolerance,
      structure,
      assessmentType,
      manufacturingCategories
    ),

    categoryAnalysis: {
      strengths: generateStrengthsAnalysis(strengths, assessmentType),
      moderate: generateModerateAnalysis(moderate, assessmentType),
      risks: generateRisksAnalysis(risks, assessmentType)
    },

    personalityStructure: generatePersonalityStructure(
      ownership,
      collaboration,
      action,
      analysisTrait,
      riskTolerance,
      structure,
      assessmentType,
      manufacturingCategories
    ),

    roleSuitability: generateRoleSuitability(
      strengths,
      risks,
      ownership,
      collaboration,
      action,
      analysisTrait,
      riskTolerance,
      structure,
      assessmentType,
      manufacturingCategories
    ),

    developmentPriorities: generateDevelopmentPriorities(
      risks,
      moderate,
      assessmentType
    ),

    overallInterpretation: generateOverallInterpretation(
      candidateName,
      avgScore,
      strengths,
      risks,
      analysisTrait,
      riskTolerance,
      structure,
      assessmentType,
      manufacturingCategories
    )
  };
};

const generateExecutiveSummary = (
  candidateName,
  avgScore,
  strengths,
  risks,
  ownership,
  collaboration,
  action,
  analysis,
  riskTolerance,
  structure,
  assessmentType,
  manufacturingCategories
) => {
  const strengthCount = strengths.length;
  const riskCount = risks.length;
  const scoreLevel = getScoreLevel(avgScore);

  let summary = `**Executive Summary**\n\n`;

  summary += `${candidateName} completed the assessment with an overall score of ${avgScore}%, classified as ${scoreLevel.classification}. `;

  if (assessmentType === "manufacturing_baseline") {
    summary += generateManufacturingExecutiveSummary(
      manufacturingCategories,
      strengths,
      risks
    );
    return summary;
  }

  if (avgScore >= REPORT_THRESHOLDS.strongStrengthThreshold) {
    summary += `The assessment evidence suggests a strong overall capability profile. `;
  } else if (avgScore >= REPORT_THRESHOLDS.strengthThreshold) {
    summary += `The assessment evidence suggests a reliable profile with clear strengths and manageable development needs. `;
  } else if (avgScore >= REPORT_THRESHOLDS.developmentThreshold) {
    summary += `The assessment evidence suggests functional capability with targeted areas requiring reinforcement. `;
  } else if (avgScore >= REPORT_THRESHOLDS.criticalThreshold) {
    summary += `The assessment evidence suggests a developing profile that requires structured support and close progress monitoring. `;
  } else {
    summary += `The assessment evidence suggests critical development needs that should be addressed before independent role placement. `;
  }

  if (strengthCount > 0) {
    summary += `Key strengths include ${strengths
      .slice(0, 3)
      .map((strength) => strength.name)
      .join(", ")}. `;
  } else {
    summary += `No category reached the current strength threshold. `;
  }

  if (riskCount > 0) {
    summary += `Priority development areas include ${risks
      .slice(0, 3)
      .map((risk) => risk.name)
      .join(", ")}. `;
  } else {
    summary += `No major development area was identified below the development threshold. `;
  }

  if (
    ownership.percentage >= REPORT_THRESHOLDS.strengthThreshold ||
    action.percentage >= REPORT_THRESHOLDS.strengthThreshold
  ) {
    summary += `The profile shows useful indicators of initiative or accountability. `;
  }

  if (collaboration.percentage >= REPORT_THRESHOLDS.strengthThreshold) {
    summary += `The profile also suggests potential for team-based contribution. `;
  }

  if (analysis.percentage >= REPORT_THRESHOLDS.strengthThreshold) {
    summary += `Analytical capability appears to be a relative strength. `;
  }

  summary += `These findings should be interpreted alongside interview evidence, practical validation, and supervisor judgment.`;

  return summary;
};

const generateManufacturingExecutiveSummary = (
  manufacturingCategories,
  strengths,
  risks
) => {
  const {
    technicalFundamentals,
    troubleshooting,
    numericalAptitude,
