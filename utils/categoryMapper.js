/**
 * Focused Category Mapper
 *
 * Provides professional "The candidate shows strong foundational manufacturing knowledge, including equipment basics, maintenance principles, and system understanding.", * Provides professional interpretations based on actual category scores.
    strong:
      "The candidate shows reliable technical fundamentals and may be ready for supervised production or maintenance exposure.",
    adequate:
      "The candidate shows functional technical foundation but may need reinforcement in equipment operation, sensors, motors, or pneumatic systems.",
    developing:
      "The candidate shows developing technical fundamentals. Structured equipment familiarization and hands-on training are recommended.",
    priority_development:
      "Technical fundamentals require priority development. The candidate may struggle with basic equipment concepts without training.",
    critical_gap:
      "The candidate shows critical gaps in technical fundamentals. Foundational training is required before independent equipment work."
  },

  Troubleshooting: {
    exceptional:
      "The candidate shows strong diagnostic thinking and can likely approach common production issues systematically.",
    strong:
      "The candidate shows reliable troubleshooting capability for common production or equipment issues.",
    adequate:
      "The candidate shows functional troubleshooting ability but may need diagnostic frameworks for complex issues.",
    developing:
      "Troubleshooting capability is developing. Practice with structured fault-finding and root-cause analysis is recommended.",
    priority_development:
      "Troubleshooting requires priority development. The candidate may struggle to identify root causes without guidance.",
    critical_gap:
      "The candidate shows critical troubleshooting gaps. Close supervision and diagnostic training are recommended."
  },

  "Numerical Aptitude": {
    exceptional:
      "The candidate shows strong numerical reasoning for production calculations, percentages, ratios, and production-rate interpretation.",
    strong:
      "The candidate shows reliable numerical aptitude and can likely handle standard production math and reporting tasks.",
    adequate:
      "The candidate shows functional numerical ability but may need practice with production metrics and calculations.",
    developing:
      "Numerical aptitude is developing. Production math, efficiency calculations, and quality documentation practice are recommended.",
    priority_development:
      "Numerical aptitude requires priority development. The candidate may struggle with production calculations and data interpretation.",
    critical_gap:
      "The candidate shows critical numeracy gaps. Foundational math training is recommended before quantitative production tasks."
  },

  "Safety & Work Ethic": {
    exceptional:
      "The candidate shows strong safety awareness, PPE understanding, SOP discipline, teamwork, and professional conduct.",
    strong:
      "The candidate shows reliable safety and work ethic indicators suitable for supervised manufacturing environments.",
    adequate:
      "The candidate shows functional safety awareness but may need reinforcement of specific protocols and SOP expectations.",
    developing:
      "Safety and work ethic understanding is developing. Refresher training and clear workplace expectations are recommended.",
    priority_development:
      "Safety or work ethic requires priority development. Close supervision and safety reinforcement are recommended.",
    critical_gap:
      "The candidate shows critical safety or conduct gaps. Safety training is required before production exposure."
  },

  // Personality Traits
  Ownership: {
    exceptional:
      "The candidate shows strong accountability, initiative, and follow-through.",
    strong:
      "The candidate shows reliable ownership and can likely manage assigned responsibilities with standard supervision.",
    adequate:
      "The candidate shows functional ownership but may need encouragement to take initiative beyond assigned tasks.",
    developing:
      "Ownership is developing. Clear accountability expectations and follow-up are recommended.",
    priority_development:
      "Ownership requires priority development. The candidate may wait for direction or need close accountability tracking.",
    critical_gap:
      "The candidate shows critical ownership gaps. Close supervision and accountability coaching are recommended."
  },

  Collaboration: {
    exceptional:
      "The candidate shows strong teamwork, consensus-building, and interpersonal contribution.",
    strong:
      "The candidate shows reliable collaboration and can likely work well in team environments.",
    adequate:
      "The candidate shows functional collaboration but may need support in highly interdependent team settings.",
    developing:
      "Collaboration is developing. Teamwork practice and feedback are recommended.",
    priority_development:
      "Collaboration requires priority development. The candidate may struggle in team-based environments without support.",
    critical_gap:
      "The candidate shows critical collaboration gaps. Teamwork coaching and close observation are recommended."
  },

  Action: {
    exceptional:
      "The candidate shows strong action orientation, decisiveness, and urgency.",
    strong:
      "The candidate shows reliable initiative and can likely move tasks forward with standard supervision.",
    adequate:
      "The candidate shows functional action orientation but may need support with ambiguous or time-sensitive decisions.",
    developing:
      "Action orientation is developing. Decision-making practice and time-bound tasks are recommended.",
    priority_development:
      "Action orientation requires priority development. The candidate may delay decisions or wait for direction.",
    critical_gap:
      "The candidate shows critical gaps in action orientation. Close guidance and initiative-building support are recommended."
  },

  Analysis: {
    exceptional:
      "The candidate shows strong analytical thinking, structured reasoning, and data-informed judgment.",
    strong:
      "The candidate shows reliable analytical capability for structured tasks and decision support.",
    adequate:
      "The candidate shows functional analysis but may need frameworks for complex reasoning.",
    developing:
      "Analysis is developing. Structured problem-solving and data interpretation practice are recommended.",
    priority_development:
      "Analysis requires priority development. The candidate may act without sufficient evidence or structure.",
    critical_gap:
      "The candidate shows critical analytical gaps. Foundational analytical training is recommended."
  },

  "Risk Tolerance": {
    exceptional:
      "The candidate shows healthy comfort with uncertainty, experimentation, and calculated risk-taking.",
    strong:
      "The candidate shows reliable risk awareness and may be comfortable with controlled innovation.",
    adequate:
      "The candidate shows functional risk tolerance but may prefer proven approaches.",
    developing:
      "Risk tolerance is developing. Safe experimentation and risk assessment practice are recommended.",
    priority_development:
      "Risk tolerance requires priority development. The candidate may avoid necessary change or innovation.",
    critical_gap:
      "The candidate shows critical risk-aversion indicators. Structured exposure to safe experimentation is recommended."
  },

  Structure: {
    exceptional:
      "The candidate shows strong process discipline, consistency, and procedural reliability.",
    strong:
      "The candidate shows reliable structure orientation and can likely follow procedures consistently.",
    adequate:
      "The candidate shows functional process adherence but may need reinforcement in complex or quality-critical work.",
    developing:
      "Structure orientation is developing. Clear SOPs, checklists, and process training are recommended.",
    priority_development:
      "Structure requires priority development. The candidate may skip steps or work inconsistently without guidance.",
    critical_gap:
      "The candidate shows critical process-discipline gaps. Close supervision and SOP reinforcement are recommended."
  }
};

// ======================================================
// HELPERS
// ======================================================

const getCategoryInterpretation = (category, percentage) => {
  const scoreLevel = getScoreLevel(percentage);
  const categorySet = categoryInterpretations[category];

  if (categorySet?.[scoreLevel.key]) {
    return categorySet[scoreLevel.key];
  }

  return `${category}: ${percentage}% - ${scoreLevel.label}. ${getSupervisorImplication(
    percentage
  )}`;
};

const getProfileSummary = (scores) => {
  const values = Object.values(scores || {}).map((value) => Number(value || 0));

  if (values.length === 0) {
    return {
      type: "No Data",
      description:
        "No category score data was available for this assessment report."
    };
  }

  const average =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const strengths = values.filter((score) => isStrength(score)).length;
  const developmentAreas = values.filter((score) =>
    isDevelopmentArea(score)
  ).length;
  const criticalGaps = values.filter((score) => isCriticalGap(score)).length;

  if (average >= 85 && criticalGaps === 0) {
    return {
      type: "High-Potential Profile",
      description:
        "This candidate demonstrates strong overall capability with evidence of readiness for more demanding responsibilities, subject to role validation."
    };
  }

  if (average >= 75 && developmentAreas <= 1) {
    return {
      type: "Strong Performer",
      description:
        "This candidate shows reliable performance with clear strengths and limited development needs."
    };
  }

  if (average >= 65 && criticalGaps === 0) {
    return {
      type: "Capable Contributor",
      description:
        "This candidate shows functional competence with some areas requiring targeted reinforcement."
    };
  }

  if (average >= 55) {
    return {
      type: "Developing Performer",
      description:
        "This candidate has foundational capability but requires structured support to improve role readiness."
    };
  }

  if (criticalGaps > 0 || average < 40) {
    return {
      type: "High Development Need",
      description:
        "This candidate shows critical or significant gaps that require immediate structured development and close supervision."
    };
  }

  return {
    type: "Development Priority",
    description:
      "This candidate shows significant development needs across multiple areas and should be placed carefully with structured supervision."
  };
};

const getSuitabilityAndRisks = (scores) => {
  const suitability = [];
  const risks = [];

  const get = (name) => Number(scores?.[name] || 0);

  // General / broad categories
  const leadership = get("Leadership & Management");
  const cognitive = get("Cognitive Ability");
  const technical = get("Technical & Manufacturing");
  const cultural = get("Cultural & Attitudinal Fit");
  const emotional = get("Emotional Intelligence");
  const communication = get("Communication");
  const problemSolving = get("Problem-Solving");

  if (leadership >= 75 && cognitive >= 65 && emotional >= 65) {
    suitability.push(
      "May be suitable for leadership-track responsibilities with role-specific validation."
    );
  }

  if (technical >= 75 || get("Technical Fundamentals") >= 75) {
    suitability.push(
      "Shows evidence of suitability for technical or operational tasks with standard supervision."
    );
  }

  if (communication >= 75 || get("Collaboration") >= 75) {
    suitability.push(
      "Shows evidence of suitability for collaborative or stakeholder-facing work."
    );
  }

  if (problemSolving >= 75 || get("Troubleshooting") >= 75) {
    suitability.push(
      "Shows evidence of suitability for problem-solving or diagnostic tasks."
    );
  }

  // Manufacturing Baseline categories
  const techFundamentals = get("Technical Fundamentals");
  const troubleshooting = get("Troubleshooting");
  const numericalAptitude = get("Numerical Aptitude");
  const safetyWorkEthic =
    get("Safety & Work Ethic") || get("Safety &amp; Work Ethic");

  if (safetyWorkEthic >= 75 && techFundamentals >= 65) {
    suitability.push(
      "May be suitable for supervised production exposure after standard onboarding."
    );
  }

  if (troubleshooting >= 65 && numericalAptitude >= 65) {
    suitability.push(
      "May be suitable for quality monitoring or production tracking tasks with appropriate guidance."
    );
  }

  if (techFundamentals >= 75 && troubleshooting >= 65) {
    suitability.push(
      "May be suitable for a maintenance-trainee pathway with practical validation."
    );
  }

  // Personality traits
  const ownership = get("Ownership");
  const collaboration = get("Collaboration");
  const action = get("Action");
  const analysis = get("Analysis");
  const riskTolerance = get("Risk Tolerance");
  const structure = get("Structure");

  if (ownership >= 75 && action >= 65) {
    suitability.push(
      "Shows evidence of suitability for roles requiring initiative and accountability."
    );
  }

  if (collaboration >= 75) {
    suitability.push(
      "Shows evidence of suitability for team-based and collaborative environments."
    );
  }

  if (analysis >= 75 && structure >= 65) {
    suitability.push(
      "Shows evidence of suitability for analytical, process-driven, or quality-focused tasks."
    );
  }

  if (riskTolerance >= 75 && action >= 65) {
    suitability.push(
      "May be suitable for controlled innovation or improvement-focused assignments."
    );
  }

  // Risks
  if (safetyWorkEthic > 0 && safetyWorkEthic < 55) {
    risks.push(
      "Safety and work ethic require attention before production exposure. Safety training and close supervision are recommended."
    );
  }

  if (techFundamentals > 0 && techFundamentals < 55) {
    risks.push(
      "Technical fundamentals are below expected baseline. The candidate may struggle with equipment concepts without foundational training."
    );
  }

  if (troubleshooting > 0 && troubleshooting < 55) {
    risks.push(
      "Troubleshooting is below expected baseline. The candidate may need structured diagnostic training and guided practice."
    );
  }

  if (numericalAptitude > 0 && numericalAptitude < 55) {
    risks.push(
      "Numerical aptitude is below expected baseline. The candidate may need support with production calculations and reporting."
    );
  }

  if (cognitive > 0 && cognitive < 55) {
    risks.push(
      "Cognitive capability may limit complex analysis without structured problem-solving support."
    );
  }

  if (emotional > 0 && emotional < 55) {
    risks.push(
      "Emotional intelligence may require development to support effective workplace interactions."
    );
  }

  if (cultural > 0 && cultural < 55) {
    risks.push(
      "Cultural or attitudinal fit requires supervisor validation and expectation setting."
    );
  }

  if (leadership > 0 && leadership < 55) {
    risks.push(
      "Leadership readiness appears limited. People-management responsibility is not recommended without development."
    );
  }

  if (ownership > 0 && ownership < 55) {
    risks.push(
      "Ownership and accountability may require close follow-up and clear expectations."
    );
  }

  if (collaboration > 0 && collaboration < 55) {
    risks.push(
      "Collaboration may require support before assigning highly interdependent team tasks."
    );
  }

  if (action > 0 && action < 55) {
    risks.push(
      "Action orientation may require development; the candidate may delay decisions or wait for direction."
    );
  }

  if (analysis > 0 && analysis < 55) {
    risks.push(
      "Analytical thinking may require structured frameworks and guided practice."
    );
  }

  if (structure > 0 && structure < 55) {
    risks.push(
      "Process discipline may require reinforcement through SOPs, checklists, and close supervision."
    );
  }

  return {
    suitability,
    risks
  };
};

// ======================================================
// MAIN EXPORT
// ======================================================

export const generateUniversalInterpretation = (
  assessmentType,
  candidateName,
  scores,
  strengths,
  weaknesses,
  overallPercentage
) => {
  const safeScores = scores || {};
  const normalized = normalizeCategoryScores(
    Object.fromEntries(
      Object.entries(safeScores).map(([category, percentage]) => [
        category,
        {
          score: percentage,
          maxPossible: 100,
          percentage
        }
      ])
    )
  );

  const categoryInterpretation = {};

  Object.entries(safeScores).forEach(([category, score]) => {
    const percentage = Number(score || 0);
    const level = getScoreLevel(percentage);

    categoryInterpretation[category] = {
      score: percentage,
      level: level.key,
      levelLabel: level.label,
      classification: level.classification,
      color: level.color,
      interpretation: getCategoryInterpretation(category, percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      performanceComment: getScoreComment(percentage),
      gapToTarget: calculateGapToTarget(percentage)
    };
  });

  const profileSummary = getProfileSummary(safeScores);
  const { suitability, risks } = getSuitabilityAndRisks(safeScores);

  const topStrengths = getStrengthAreas(normalized, 3).map(
    (item) => item.category
  );

  const topWeaknesses = getDevelopmentAreas(normalized, 3).map(
    (item) => item.category
  );

  const developmentFocus = getDevelopmentAreas(normalized, 3).map(
    (item, index) => ({
      area: item.category,
      score: item.percentage,
      gapToTarget: item.gapToTarget,
      priority:
        isCriticalGap(item.percentage) || isPriorityDevelopment(item.percentage)
          ? "High"
          : index === 0
          ? "Medium"
          : "Low"
    })
  );

  const strengthText =
    topStrengths.length > 0
      ? `Key strengths include ${topStrengths.join(", ")}. `
      : "No category reached the strength threshold. ";

  const weaknessText =
    topWeaknesses.length > 0
      ? `Priority development areas include ${topWeaknesses.join(", ")}. `
      : "No major development area was identified below the development threshold. ";

  const overallSummary = `${candidateName} completed the assessment with an overall score of ${overallPercentage}%. ${strengthText}${weaknessText}${profileSummary.description}`;

  return {
    candidateName,
    assessmentType,
    overallScore: overallPercentage,

    profileType: profileSummary.type,
    profileDescription: profileSummary.description,
    overallSummary,

    categoryInterpretation,
    topStrengths,
    topWeaknesses,

    suitability:
      suitability.length > 0
        ? suitability
        : ["Standard role placement may be considered with appropriate support and supervisor validation."],

    risks:
      risks.length > 0
        ? risks
        : ["No significant risk area was identified from the category score pattern."],

    developmentFocus
  };
};

export default {
  generateUniversalInterpretation
};
 *
 * Corrected version:
 * - Uses central scoring standards from utils/scoring.js
 * - Supports all assessment types
 * - Keeps generateUniversalInterpretation(...) export unchanged
 * - Reduces contradictory thresholds
 * - Adds cleaner supervisor-friendly suitability and risk logic
 */

import {
  getScoreLevel,
  getScoreComment,
  getSupervisorImplication,
  getStrengthAreas,
  getDevelopmentAreas,
  normalizeCategoryScores,
  isStrength,
  isDevelopmentArea,
  isCriticalGap,
  isPriorityDevelopment,
  calculateGapToTarget,
  REPORT_THRESHOLDS
} from "./scoring";

// ======================================================
// ASSESSMENT-SPECIFIC CATEGORY INTERPRETATIONS
// ======================================================

const categoryInterpretations = {
  // General Assessment Categories
  "Cognitive Ability": {
    exceptional:
      "The candidate shows strong analytical and strategic thinking capability. This suggests readiness for complex problem-solving and structured decision-making tasks.",
    strong:
      "The candidate shows reliable cognitive capability and can handle most analytical challenges with standard guidance.",
    adequate:
      "The candidate shows functional cognitive capability but may benefit from structure when working through complex problems.",
    developing:
      "The candidate shows developing cognitive capability and may require support with complex analysis or abstract reasoning.",
    priority_development:
      "The candidate shows significant gaps in cognitive capability. Structured problem-solving support is recommended.",
    critical_gap:
      "The candidate shows critical gaps in cognitive capability. Close guidance and foundational reasoning support are recommended."
  },

  Communication: {
    exceptional:
      "The candidate shows strong communication capability and can likely explain ideas clearly in role-relevant situations.",
    strong:
      "The candidate communicates effectively in most situations and can support collaboration through clear expression.",
    adequate:
      "The candidate shows functional communication ability but may benefit from practice with complex or formal communication.",
    developing:
      "The candidate shows developing communication capability and may require support in presenting ideas clearly.",
    priority_development:
      "Communication should be treated as a priority development area. Misunderstanding or unclear expression may affect performance.",
    critical_gap:
      "The candidate shows critical communication gaps. Structured communication training and close supervision are recommended."
  },

  "Cultural & Attitudinal Fit": {
    exceptional:
      "The candidate shows strong alignment with workplace values, professional conduct, and team expectations.",
    strong:
      "The candidate shows generally reliable cultural and attitudinal fit for structured work environments.",
    adequate:
      "The candidate shows functional alignment but may need reinforcement of organizational expectations.",
    developing:
      "The candidate shows developing cultural alignment and may benefit from onboarding, coaching, and expectation setting.",
    priority_development:
      "Cultural or attitudinal fit requires attention. Supervisor should clarify values, standards, and expected workplace behaviors.",
    critical_gap:
      "The candidate shows critical fit concerns. Further validation and close monitoring are recommended before placement."
  },

  "Emotional Intelligence": {
    exceptional:
      "The candidate shows strong self-awareness and interpersonal judgment based on assessment evidence.",
    strong:
      "The candidate shows reliable interpersonal awareness and can likely manage typical workplace interactions.",
    adequate:
      "The candidate shows functional emotional intelligence but may need support in complex interpersonal situations.",
    developing:
      "The candidate shows developing emotional intelligence and may benefit from feedback and coaching.",
    priority_development:
      "Emotional intelligence is a priority development area. Interpersonal effectiveness may require structured support.",
    critical_gap:
      "The candidate shows critical gaps in emotional intelligence. Close supervision and interpersonal coaching are recommended."
  },

  "Ethics & Integrity": {
    exceptional:
      "The candidate shows strong evidence of principled judgment and ethical decision-making.",
    strong:
      "The candidate shows reliable ethical awareness and generally sound judgment.",
    adequate:
      "The candidate shows functional ethical awareness but may need guidance in complex situations.",
    developing:
      "The candidate shows developing ethical judgment and should receive clear boundaries and guidance.",
    priority_development:
      "Ethics and integrity should be treated as a priority development area. Supervisor guidance is recommended.",
    critical_gap:
      "The candidate shows critical gaps in ethical judgment. Further validation is recommended before assigning independent responsibility."
  },

  "Leadership & Management": {
    exceptional:
      "The candidate shows strong evidence of leadership readiness, including direction setting, people awareness, and accountability.",
    strong:
      "The candidate shows reliable leadership potential and may be suitable for gradual leadership exposure.",
    adequate:
      "The candidate shows functional leadership capability but may need structured development before leading others independently.",
    developing:
      "The candidate shows developing leadership capability and should receive coaching before taking on management responsibility.",
    priority_development:
      "Leadership and management require priority development. The candidate may not yet be ready for people-management responsibility.",
    critical_gap:
      "The candidate shows critical leadership gaps. Management responsibility is not recommended without significant development."
  },

  "Performance Metrics": {
    exceptional:
      "The candidate shows strong results orientation, accountability, and performance awareness.",
    strong:
      "The candidate shows reliable performance orientation and can likely work toward targets with standard supervision.",
    adequate:
      "The candidate shows functional performance awareness but may benefit from structured goals and progress reviews.",
    developing:
      "The candidate shows developing performance orientation and should receive clear targets and regular feedback.",
    priority_development:
      "Performance orientation requires priority development. Structured tracking and supervisor follow-up are recommended.",
    critical_gap:
      "The candidate shows critical performance gaps. Close supervision and clear performance expectations are recommended."
  },

  "Personality & Behavioral": {
    exceptional:
      "The candidate shows strong evidence of stable work style, adaptability, and constructive behavioral patterns.",
    strong:
      "The candidate shows generally reliable behavioral patterns for work settings.",
    adequate:
      "The candidate shows functional behavioral consistency but may need role-specific support.",
    developing:
      "The candidate shows developing behavioral consistency and may benefit from regular feedback.",
    priority_development:
      "Behavioral patterns require attention. Supervisor should provide clear expectations and regular check-ins.",
    critical_gap:
      "The candidate shows critical behavioral concerns. Close supervision and further validation are recommended."
  },

  "Problem-Solving": {
    exceptional:
      "The candidate shows strong problem-solving capability, including structured thinking and practical judgment.",
    strong:
      "The candidate can likely handle common problems with reliable reasoning and standard support.",
    adequate:
      "The candidate shows functional problem-solving capability but may need frameworks for complex issues.",
    developing:
      "The candidate shows developing problem-solving capability and would benefit from structured methods such as 5 Whys or PDCA.",
    priority_development:
      "Problem-solving is a priority development area. The candidate may struggle with root-cause analysis without support.",
    critical_gap:
      "The candidate shows critical problem-solving gaps. Close guidance and foundational problem-solving training are recommended."
  },

  "Technical & Manufacturing": {
    exceptional:
      "The candidate shows strong technical and operational understanding that may support technical role readiness.",
    strong:
      "The candidate shows reliable technical capability and can likely handle standard operational tasks.",
    adequate:
      "The candidate shows functional technical understanding but may need practical exposure and reinforcement.",
    developing:
      "The candidate shows developing technical capability and should receive structured technical training.",
    priority_development:
      "Technical capability requires priority development. The candidate may struggle with technical tasks without support.",
    critical_gap:
      "The candidate shows critical technical gaps. Foundational technical training and close supervision are recommended."
  },

  // Manufacturing Baseline Assessment Categories
  "Technical Fundamentals": {
    exceptional:
