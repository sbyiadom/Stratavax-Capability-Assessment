// utils/detailedInterpreter.js

import { assessmentTypes } through production math and metric interpretation practice.";import { assessmentTypes } from "./assessmentConfigs";
  }

  if (concernAreas.length === 0 && strongAreas.length > 0) {
    summary +=
      " The candidate may be considered for supervised manufacturing exposure, subject to practical validation.";
  } else {
    summary +=
      " The candidate should receive structured onboarding and supervised practical exposure before independent responsibility.";
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
    narrative += "Evidence from responses:\n";
    insights.slice(0, 2).forEach((insight) => {
      narrative += `• ${insight}\n`;
    });
    narrative += "\n";
  }

  narrative += getCategoryStrengthInterpretation(category, assessmentType);
  narrative += `\n\n• Performance signal: ${area.performanceComment}`;
  narrative += `\n• Supervisor implication: ${area.supervisorImplication}`;
  narrative +=
    "\n• Recommended use: Leverage this area through role-relevant tasks, mentoring, or supervised responsibility expansion.";

  return narrative;
};

const formatModerateArea = (area, config, assessmentType) => {
  const { category, percentage, grade, gradeDesc, insights } = area;

  let narrative = `🟡 ${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  if (Array.isArray(insights) && insights.length > 0) {
    narrative += "Evidence from responses:\n";
    insights.slice(0, 2).forEach((insight) => {
      narrative += `• ${insight}\n`;
    });
    narrative += "\n";
  }

  narrative += getCategoryModerateInterpretation(category, assessmentType);
  narrative += `\n\n• Performance signal: ${area.performanceComment}`;
  narrative += `\n• Supervisor implication: ${area.supervisorImplication}`;
  narrative +=
    "\n• Recommended support: Provide role-specific practice, coaching, and periodic progress review.";

  return narrative;
};

const formatConcernArea = (area, config, assessmentType) => {
  const { category, percentage, grade, gradeDesc, insights } = area;

  let narrative = `🔴 ${category} – ${formatPercentage(
    percentage
  )} (${grade} | ${gradeDesc})\n\n`;

  if (Array.isArray(insights) && insights.length > 0) {
    narrative += "Evidence from responses:\n";
    insights.slice(0, 3).forEach((insight) => {
      narrative += `• ${insight}\n`;
    });
    narrative += "\n";
  }

  narrative += getCategoryConcernInterpretation(
    category,
    percentage,
    assessmentType
  );
  narrative += `\n\n• Performance signal: ${area.performanceComment}`;
  narrative += `\n• Supervisor implication: ${area.supervisorImplication}`;
  narrative += `\n• Gap to 80% target: ${area.gapToTarget}%`;
  narrative += `\n• Recommended support: ${getDevelopmentRecommendation(
    category,
    percentage,
    assessmentType
  )}`;

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
      "Assessment evidence suggests clear expression and communication capability. This can support reporting, instruction confirmation, and stakeholder interaction.",
    "Emotional Intelligence":
      "Assessment evidence suggests interpersonal awareness and self-management. This can support team interaction and workplace relationship management.",
    "Leadership & Management":
      "Assessment evidence suggests leadership potential. Gradual leadership exposure may be considered with role-specific validation.",
    "Problem-Solving":
      "Assessment evidence suggests structured problem-solving capability. This can support practical issue resolution and improvement tasks.",
    "Technical & Manufacturing":
      "Assessment evidence suggests operational or technical capability that may support technical role exposure.",
    "Technical Knowledge":
      "Assessment evidence suggests technical understanding that may support role-specific technical tasks.",
    "System Understanding":
      "Assessment evidence suggests awareness of system relationships and operational dependencies.",
    "Safety & Compliance":
      "Assessment evidence suggests useful awareness of safety and compliance expectations.",
    "Quality Control":
      "Assessment evidence suggests quality awareness and attention to standards."
  };

  return (
    narratives[normalized] ||
    `Assessment evidence suggests ${normalized} is a strength area that can be leveraged in role-relevant assignments.`
  );
};

const getCategoryModerateInterpretation = (category, assessmentType) => {
  const normalized = normalizeText(category);

  const manufacturing = {
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

  if (assessmentType === "manufacturing_baseline" && manufacturing[normalized]) {
    return manufacturing[normalized];
  }

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
    Communication:
      "Assessment evidence suggests functional communication ability. Clear reporting and instruction confirmation should be reinforced.",
    "Emotional Intelligence":
      "Assessment evidence suggests functional interpersonal awareness. Feedback, reflection, and coaching may strengthen consistency.",
    "Leadership & Management":
      "Assessment evidence suggests emerging leadership capability. Gradual exposure and coaching are recommended before independent leadership responsibility.",
    "Problem-Solving":
      "Assessment evidence suggests functional problem-solving ability. Structured frameworks may improve consistency."
  };

  return (
    narratives[normalized] ||
    `Assessment evidence suggests ${normalized} is functional but should be reinforced through practical exposure, feedback, and role-specific development.`
  );
};

const getCategoryConcernInterpretation = (
  category,
  percentage,
  assessmentType
) => {
  const normalized = normalizeText(category);

  const prefix = isCriticalGap(percentage)
    ? "Critical development evidence was identified."
    : "Priority development evidence was identified.";

  const manufacturing = {
    "Technical Fundamentals":
      `${prefix} The candidate may struggle with equipment concepts, maintenance basics, or manufacturing system understanding without foundational training.`,
    Troubleshooting:
      `${prefix} The candidate may struggle with fault diagnosis, root-cause analysis, or common production issue response without guided practice.`,
    "Numerical Aptitude":
      `${prefix} The candidate may struggle with production calculations, percentages, ratios, or quality documentation without numeracy support.`,
    "Safety & Work Ethic":
      `${prefix} Safety and work ethic should be addressed before independent production exposure. Safety training and close supervision are recommended.`,
    "Safety &amp; Work Ethic":
      `${prefix} Safety and work ethic should be addressed before independent production exposure. Safety training and close supervision are recommended.`
  };

  if (assessmentType === "manufacturing_baseline" && manufacturing[normalized]) {
    return manufacturing[normalized];
  }

  const narratives = {
    Ownership:
      `${prefix} The candidate may require clear expectations, close follow-up, and accountability coaching before being assigned high-autonomy work.`,
    Collaboration:
      `${prefix} The candidate may need support with teamwork, communication, and contribution in group settings.`,
    Action:
      `${prefix} The candidate may delay decisions or wait for direction. Structured action planning and time-bound tasks are recommended.`,
    Analysis:
      `${prefix} The candidate may need structured reasoning frameworks, data interpretation support, and guided problem-solving practice.`,
    "Risk Tolerance":
      `${prefix} The candidate may avoid uncertainty or change. Low-risk experimentation and risk-assessment coaching are recommended.`,
    Structure:
      `${prefix} The candidate may need SOP reinforcement, checklists, and close monitoring of process adherence.`,
    Communication:
      `${prefix} The candidate may need communication support to improve clarity, listening, reporting, or instruction confirmation.`,
    "Emotional Intelligence":
      `${prefix} The candidate may need coaching in self-awareness, empathy, feedback reception, or interpersonal judgment.`,
    "Leadership & Management":
      `${prefix} The candidate is not yet recommended for people-management responsibility without structured leadership development.`,
    "Problem-Solving":
      `${prefix} The candidate may need structured problem-solving tools such as 5 Whys, PDCA, or supervised case practice.`
  };

  return (
    narratives[normalized] ||
    `${prefix} ${normalized} requires structured development, supervised practice, and progress monitoring.`
  );
};

// ======================================================
// HIRING / PLACEMENT INTERPRETATION
// ======================================================

const generateHiringInterpretation = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config,
  assessmentType
) => {
  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  let interpretation = `🎯 Hiring Recommendations for ${config.name}\n\n`;

  if (assessmentType === "manufacturing_baseline") {
    return generateManufacturingHiringInterpretation(
      strongAreas,
      moderateAreas,
      concernAreas,
      config
    );
  }

  const hasLeadershipConcerns =
    concernNames.includes("Leadership & Management") ||
    concernNames.includes("People Leadership") ||
    concernNames.includes("Vision / Strategy");

  const hasCognitiveConcerns =
    concernNames.includes("Cognitive Ability") ||
    concernNames.includes("Analysis") ||
    concernNames.includes("Problem-Solving");

  const hasCommunicationConcerns = concernNames.includes("Communication");

  if (hasLeadershipConcerns) {
    interpretation +=
      "Use caution with people-management or leadership responsibilities until leadership-related development areas are addressed.\n\n";
  }

  if (hasCognitiveConcerns) {
    interpretation +=
      "Use caution with complex analytical or ambiguous problem-solving work unless structured frameworks and supervision are provided.\n\n";
  }

  if (hasCommunicationConcerns) {
    interpretation +=
      "Use caution with roles requiring frequent formal communication, reporting, or stakeholder-facing work until communication capability is reinforced.\n\n";
  }

  if (
    strongNames.includes("Ownership") &&
    strongNames.includes("Action")
  ) {
    interpretation +=
      "The candidate shows useful evidence for roles requiring initiative and accountability. Structured project ownership may be appropriate with clear expectations.";
  } else if (strongNames.includes("Collaboration")) {
    interpretation +=
      "The candidate shows useful evidence for collaborative environments and team-based tasks.";
  } else if (
    strongNames.includes("Analysis") &&
    strongNames.includes("Structure")
  ) {
    interpretation +=
      "The candidate shows useful evidence for analytical, structured, quality, or process-driven roles.";
  } else if (strongAreas.length > 0) {
    interpretation += `The candidate may be suitable for roles that leverage ${formatList(
      strongAreas.slice(0, 3).map((area) => area.category)
    )}, with support in development areas.`;
  } else {
    interpretation +=
      "The candidate is best suited for structured roles with clear expectations, onboarding support, and close supervisor feedback.";
  }

  return interpretation;
};

const generateManufacturingHiringInterpretation = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config
) => {
  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  let interpretation = `🎯 Hiring Recommendations for ${config.name}\n\n`;

  if (
    concernNames.includes("Safety & Work Ethic") ||
    concernNames.includes("Safety &amp; Work Ethic")
  ) {
    interpretation +=
      "Do not place the candidate into independent production exposure until safety awareness, SOP discipline, and work conduct expectations are reinforced and validated.\n\n";
  }

  if (concernNames.includes("Technical Fundamentals")) {
    interpretation +=
      "Technical fundamentals require development before assigning independent equipment-related tasks.\n\n";
  }

  if (concernNames.includes("Troubleshooting")) {
    interpretation +=
      "Troubleshooting should be developed through guided diagnostic practice before assigning independent fault-response tasks.\n\n";
  }

  if (concernNames.includes("Numerical Aptitude")) {
    interpretation +=
      "Numerical aptitude should be reinforced before assigning production calculations, metric tracking, or quality documentation tasks.\n\n";
  }

  if (
    strongNames.includes("Safety & Work Ethic") ||
    strongNames.includes("Safety &amp; Work Ethic")
  ) {
    interpretation +=
      "The candidate may be considered for supervised manufacturing exposure if practical onboarding confirms safe work behavior. ";
  }

  if (strongNames.includes("Technical Fundamentals")) {
    interpretation +=
      "Technical fundamentals may support production or maintenance onboarding with supervision. ";
  }

  if (strongNames.includes("Troubleshooting")) {
    interpretation +=
      "Troubleshooting strength may support supervised line issue review. ";
  }

  if (strongNames.includes("Numerical Aptitude")) {
    interpretation +=
      "Numerical aptitude may support production tracking or quality monitoring tasks. ";
  }

  if (strongAreas.length === 0) {
    interpretation +=
      "A training-first pathway is recommended before independent manufacturing placement.";
  }

  return interpretation;
};

// ======================================================
// DEVELOPMENT POTENTIAL
// ======================================================

const generateDevelopmentPotential = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config,
  assessmentType
) => {
  let development = `📈 Development Potential for ${config.name}\n\n`;

  if (concernAreas.length === 0 && strongAreas.length > 0) {
    development +=
      "Development should focus on leveraging existing strengths, validating performance in practical work settings, and gradually increasing responsibility.\n\n";
  } else {
    development +=
      "Development should focus on the lowest-scoring categories first, followed by role-specific reinforcement of moderate areas.\n\n";
  }

  const priorities = [...concernAreas, ...moderateAreas]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);

  if (priorities.length === 0) {
    development += "• Maintain current strengths through practical assignments\n";
    development += "• Validate capability through supervised work exposure\n";
    development += "• Consider stretch assignments where appropriate\n";

    return development;
  }

  priorities.forEach((area) => {
    development += `• ${area.category}: ${getDevelopmentRecommendation(
      area.category,
      area.percentage,
      assessmentType
    )}\n`;
  });

  return development;
};

// ======================================================
// STRATEGIC OBSERVATION
// ======================================================

const generateStrategicObservation = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config,
  assessmentType
) => {
  let observation = `🧠 Strategic Observations for ${config.name}\n\n`;

  observation += `This profile shows:\n\n`;
  observation += `• ${strongAreas.length} strength area(s)\n`;
  observation += `• ${moderateAreas.length} functional/reinforcement area(s)\n`;
  observation += `• ${concernAreas.length} development concern area(s)\n`;

  if (assessmentType === "manufacturing_baseline") {
    observation += generateManufacturingStrategicObservation(
      strongAreas,
      moderateAreas,
      concernAreas
    );

    return observation;
  }

  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  if (
    strongNames.includes("Ownership") &&
    strongNames.includes("Action")
  ) {
    observation +=
      "• Useful indicators of initiative and accountability\n";
  }

  if (
    strongNames.includes("Analysis") &&
    strongNames.includes("Structure")
  ) {
    observation +=
      "• Useful indicators for analytical and process-driven assignments\n";
  }

  if (strongNames.includes("Collaboration")) {
    observation += "• Useful indicators for team-based work\n";
  }

  if (concernNames.length > 0) {
    observation += `• Development should prioritize ${formatList(
      concernNames.slice(0, 3)
    )}\n`;
  }

  observation +=
    "• Final placement should consider interview evidence, role requirements, and practical validation\n";

  return observation;
};

const generateManufacturingStrategicObservation = (
  strongAreas,
  moderateAreas,
  concernAreas
) => {
  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  let observation = "";

  if (
    concernNames.includes("Safety & Work Ethic") ||
    concernNames.includes("Safety &amp; Work Ethic")
  ) {
    observation +=
      "• Safety readiness is the immediate gating factor for manufacturing placement\n";
  }

  if (concernNames.includes("Technical Fundamentals")) {
    observation +=
      "• Technical onboarding should begin with equipment basics and maintenance fundamentals\n";
  }

  if (concernNames.includes("Troubleshooting")) {
    observation +=
      "• Diagnostic development should include guided fault-finding and root-cause methods\n";
  }

  if (concernNames.includes("Numerical Aptitude")) {
    observation +=
      "• Numerical development should include production math and metric interpretation\n";
  }

  if (
    strongNames.includes("Safety & Work Ethic") ||
    strongNames.includes("Safety &amp; Work Ethic")
  ) {
    observation +=
      "• Safety awareness may support supervised onboarding, subject to practical observation\n";
  }

  if (strongNames.includes("Technical Fundamentals")) {
    observation +=
      "• Technical fundamentals may support supervised production or maintenance-trainee exposure\n";
  }

  observation +=
    "• Manufacturing readiness should be validated through supervised practical work before independent assignment\n";

  return observation;
};

// ======================================================
// FINAL ASSESSMENT
// ======================================================

const generateFinalAssessment = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config,
  assessmentType
) => {
  let assessment = `📌 Final Assessment for ${config.name}\n\n`;

  if (assessmentType === "manufacturing_baseline") {
    return generateManufacturingFinalAssessment(
      strongAreas,
      moderateAreas,
      concernAreas,
      config
    );
  }

  if (strongAreas.length >= 4 && concernAreas.length <= 1) {
    assessment +=
      "The candidate shows a strong assessment profile with several areas that may support role contribution or increased responsibility. Practical validation is still recommended before final placement.";
  } else if (strongAreas.length >= 2 && concernAreas.length <= 3) {
    assessment +=
      "The candidate shows a balanced profile with useful strengths and clear development needs. Structured placement with targeted support is recommended.";
  } else if (concernAreas.length >= 4) {
    assessment +=
      "The candidate shows significant development needs across multiple areas. A structured development plan, close supervision, and careful placement are recommended.";
  } else if (moderateAreas.length > 0) {
    assessment +=
      "The candidate shows functional capability with room for reinforcement. Role fit should be based on the strongest categories and practical validation.";
  } else {
    assessment +=
      "The profile requires careful interpretation. Additional evidence is recommended before making placement or advancement decisions.";
  }

  return assessment;
};

const generateManufacturingFinalAssessment = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config
) => {
  const concernNames = concernAreas.map((area) => area.category);
  const strongNames = strongAreas.map((area) => area.category);

  let assessment = `📌 Final Assessment for ${config.name}\n\n`;

  if (
    concernNames.includes("Safety & Work Ethic") ||
    concernNames.includes("Safety &amp; Work Ethic")
  ) {
    assessment +=
      "The candidate is not recommended for independent production exposure until safety awareness, SOP discipline, and work conduct expectations are reinforced and practically validated.";
    return assessment;
  }

  if (concernAreas.length >= 3) {
    assessment +=
      "The candidate shows multiple manufacturing baseline development needs. A training-first pathway is recommended before independent production responsibilities.";
    return assessment;
  }

  if (
    strongNames.includes("Safety & Work Ethic") ||
    strongNames.includes("Safety &amp; Work Ethic")
  ) {
    assessment +=
      "The candidate may be considered for supervised manufacturing onboarding, provided practical observation confirms safe work behavior and SOP adherence.";
  } else {
    assessment +=
      "The candidate may require structured onboarding and close supervision before progressing to independent manufacturing responsibilities.";
  }

  return assessment;
};

// ======================================================
// ROLE FIT
// ======================================================

const generateRoleFitAnalysis = (
  strongAreas,
  moderateAreas,
  concernAreas,
  config,
  assessmentType
) => {
  if (assessmentType === "manufacturing_baseline") {
    return generateManufacturingRoleFitAnalysis(
      strongAreas,
      moderateAreas,
      concernAreas
    );
  }

  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  let analysis = `🎯 Role Fit Analysis\n\n`;

  analysis += `Best suited for roles requiring:\n\n`;

  let addedFit = false;

  if (
    strongNames.includes("Ownership") ||
    strongNames.includes("Action")
  ) {
    analysis += `• Initiative, accountability, and task ownership\n`;
    addedFit = true;
  }

  if (strongNames.includes("Collaboration")) {
    analysis += `• Team contribution and cross-functional work\n`;
    addedFit = true;
  }

  if (
    strongNames.includes("Analysis") ||
    strongNames.includes("Structure")
  ) {
    analysis += `• Structured, analytical, quality, or process-driven work\n`;
    addedFit = true;
  }

  if (strongNames.includes("Risk Tolerance")) {
    analysis += `• Controlled improvement, experimentation, or pilot initiatives\n`;
    addedFit = true;
  }

  if (!addedFit) {
    analysis += `• Structured roles with clear expectations and supervisor support\n`;
  }

  analysis += `\nMay need support in:\n\n`;

  if (concernNames.length === 0) {
    analysis += `• No major role-fit risk was identified below the development threshold\n`;
  } else {
    concernNames.slice(0, 5).forEach((name) => {
      analysis += `• ${name}: ${getRoleFitRiskText(name)}\n`;
    });
  }

  return analysis;
};

const generateManufacturingRoleFitAnalysis = (
  strongAreas,
  moderateAreas,
  concernAreas
) => {
  const strongNames = strongAreas.map((area) => area.category);
  const concernNames = concernAreas.map((area) => area.category);

  let analysis = `🎯 Manufacturing Role Fit Analysis\n\n`;

  analysis += `Potential fit:\n\n`;

  let addedFit = false;

  if (
    strongNames.includes("Safety & Work Ethic") ||
    strongNames.includes("Safety &amp; Work Ethic")
  ) {
    analysis += `• Supervised production exposure after practical safety validation\n`;
    addedFit = true;
  }

  if (strongNames.includes("Technical Fundamentals")) {
    analysis += `• Production or maintenance-trainee onboarding with supervision\n`;
    addedFit = true;
  }

  if (strongNames.includes("Troubleshooting")) {
    analysis += `• Supervised diagnostic or line issue review tasks\n`;
    addedFit = true;
  }

  if (strongNames.includes("Numerical Aptitude")) {
    analysis += `• Production tracking, quality monitoring, or basic reporting support\n`;
    addedFit = true;
  }

  if (!addedFit) {
    analysis += `• Training-first pathway before independent manufacturing placement\n`;
  }

  analysis += `\nSupport required:\n\n`;

  if (
    concernNames.includes("Safety & Work Ethic") ||
    concernNames.includes("Safety &amp; Work Ethic")
  ) {
    analysis += `• Safety training and SOP validation before production exposure\n`;
  }

  if (concernNames.includes("Technical Fundamentals")) {
    analysis += `• Equipment familiarization and technical fundamentals training\n`;
  }

  if (concernNames.includes("Troubleshooting")) {
    analysis += `• Guided troubleshooting and root-cause analysis practice\n`;
  }

  if (concernNames.includes("Numerical Aptitude")) {
    analysis += `• Production math and metric interpretation support\n`;
  }

  if (concernNames.length === 0) {
    analysis += `• Standard onboarding, supervised practical validation, and periodic feedback\n`;
  }

  return analysis;
};

const getRoleFitRiskText = (category) => {
  const normalized = normalizeText(category);

  const risks = {
    Ownership: "high-autonomy roles may require close follow-up",
    Collaboration: "team-heavy roles may require additional support",
    Action: "fast-paced or ambiguous tasks may require guidance",
    Analysis: "complex analytical decisions may require structured frameworks",
    "Risk Tolerance": "uncertain or innovation-heavy tasks may require risk coaching",
    Structure: "procedure-heavy or quality-critical work may require SOP reinforcement",
    Communication: "stakeholder-facing work may require communication coaching",
    "Leadership & Management": "people-management responsibility should be delayed until development occurs",
    "Emotional Intelligence": "interpersonal situations may require coaching and feedback",
    "Problem-Solving": "complex problem-solving may require guided frameworks"
  };

  return risks[normalized] || "requires structured development and supervisor support";
};

// ======================================================
// DEVELOPMENT RECOMMENDATION HELPER
// ======================================================

const getDevelopmentRecommendation = (category, percentage, assessmentType) => {
  const normalized = normalizeText(category);
  const value = safeNumber(percentage, 0);

  const manufacturingRecommendations = {
    "Technical Fundamentals":
      "Provide equipment familiarization, basic maintenance training, and supervised technical practice.",
    Troubleshooting:
      "Provide guided diagnostic scenarios, root-cause analysis practice, and troubleshooting checklists.",
    "Numerical Aptitude":
      "Provide production math exercises, efficiency calculation practice, and metric interpretation support.",
    "Safety & Work Ethic":
      "Provide safety refresher training, PPE demonstrations, SOP review, and close onboarding supervision.",
    "Safety &amp; Work Ethic":
      "Provide safety refresher training, PPE demonstrations, SOP review, and close onboarding supervision."
  };

  if (
    assessmentType === "manufacturing_baseline" &&
    manufacturingRecommendations[normalized]
  ) {
    return manufacturingRecommendations[normalized];
  }

  if (value < 40) {
    return `Begin foundational development in ${normalized} with close supervision, structured training, and weekly progress review.`;
  }

  if (value < 55) {
    return `Prioritize ${normalized} through targeted training, guided practice, and supervisor feedback.`;
  }

  if (value < 65) {
    return `Develop ${normalized} through structured practice, feedback, and role-specific exposure.`;
  }

  if (value < 75) {
    return `Reinforce ${normalized} through practical assignments and supervisor review.`;
  }

  return `Leverage ${normalized} through stretch assignments, mentoring, or advanced role exposure.`;
};

// ======================================================
// HELPER
// ======================================================

const formatList = (list) => {
  const safeList = Array.isArray(list) ? list.filter(Boolean) : [];

  if (safeList.length === 0) return "no dominant areas";
  if (safeList.length === 1) return safeList[0];
  if (safeList.length === 2) return `${safeList[0]} and ${safeList[1]}`;

  return `${safeList.slice(0, -1).join(", ")}, and ${
    safeList[safeList.length - 1]
  }`;
};

export default {
  generateDetailedInterpretation
};

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
  const normalizedCategory = normalizeText(category);
  const percentage = safeNumber(data.percentage, 0);

  return {
    category: normalizedCategory,
    percentage,
    score: safeNumber(data.score ?? data.total ?? data.rawScore, 0),
    maxPossible: safeNumber(data.maxPossible ?? data.max_score, 0),
    grade: getGrade(percentage),
    gradeDesc: getGradeDescription(percentage),
    scoreLevel: getScoreLevel(percentage),
    performanceComment: getScoreComment(percentage),
    supervisorImplication: getSupervisorImplication(percentage),
    gapToTarget: calculateGapToTarget(percentage),
    insights:
      responseInsights?.[category] ||
      responseInsights?.[normalizedCategory] ||
      []
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
      strong: strongAreas.map((area) =>
        formatStrongArea(area, config, assessmentType)
      ),
      moderate: moderateAreas.map((area) =>
        formatModerateArea(area, config, assessmentType)
      ),
      concerns: concernAreas.map((area) =>
        formatConcernArea(area, config, assessmentType)
      )
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
    summary +=
      "The assessment evidence suggests a strong profile with multiple capability areas and limited development concern.";
  } else if (strongCount >= 1 && concernCount <= 3) {
    summary +=
      "The assessment evidence suggests a balanced profile with usable strengths and manageable development areas.";
  } else if (concernCount >= 4) {
    summary += `The assessment evidence suggests significant development needs across several ${config.id} competencies.`;
  } else if (moderateCount > 0 && concernCount <= 2) {
    summary +=
      "The assessment evidence suggests functional capability with role-specific reinforcement needs.";
  } else {
    summary +=
      "The assessment evidence suggests a mixed profile requiring careful placement, structured support, and practical validation.";
  }

  summary +=
    " Supervisor interpretation should consider interview evidence, practical work validation, references, and role requirements.";

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
    summary +=
      "Safety and work ethic are key concerns. Safety training, SOP reinforcement, and close supervision are recommended before production exposure.";
  } else if (
    strongNames.includes("Safety & Work Ethic") ||
    strongNames.includes("Safety &amp; Work Ethic")
  ) {
    summary +=
      "Safety and work ethic appear to be a relative strength based on assessment evidence. Practical observation during onboarding is still recommended.";
  } else {
    summary +=
      "Safety and work ethic should be reinforced during onboarding and validated through practical observation.";
  }

  if (concernNames.includes("Technical Fundamentals")) {
    summary +=
      " Technical fundamentals require structured development before independent equipment-related work.";
  }

  if (concernNames.includes("Troubleshooting")) {
    summary +=
      " Troubleshooting should be developed through guided diagnostic practice and root-cause analysis.";
  }

  if (concernNames.includes("Numerical Aptitude")) {
    summary +=
