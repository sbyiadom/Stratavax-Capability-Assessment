// utils/phraseLibrary.js

/**
 * PHRASE LIBRARY
 *
 * Shared professional wording library for assessment reports.
 *
 * Corrected version:
 * - Avoids Math.random()
 * - Uses deterministic phrase selection
 * - Supports all assessment types
 * - Uses cautious supervisor-friendly language
 * - Avoids overclaiming
 * - Keeps flexible exports for existing report utilities
 */

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const createHash = (input) => {
  const text = String(input || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

/**
 * Deterministic phrase selector.
 *
 * Same input seed = same selected phrase.
 * This prevents reports changing on every refresh.
 */
export const selectPhrase = (phrases = [], seed = "") => {
  if (!Array.isArray(phrases) || phrases.length === 0) return "";

  const index = createHash(seed) % phrases.length;
  return phrases[index];
};

export const replaceVariables = (template = "", variables = {}) => {
  let output = String(template || "");

  Object.entries(variables || {}).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, "g"), value);
  });

  return output;
};

// ======================================================
// GENERAL REPORT PHRASES
// ======================================================

export const generalReportPhrases = {
  evidenceBased: [
    "Assessment evidence suggests {{statement}}.",
    "The response pattern indicates {{statement}}.",
    "The available assessment data points to {{statement}}.",
    "Based on the recorded responses, {{statement}}."
  ],

  practicalValidation: [
    "This should be validated through practical observation before final placement.",
    "Supervisor judgment and practical work validation are recommended before final assignment.",
    "This interpretation should be considered alongside interview evidence, references, and work observation.",
    "The result should support, not replace, supervisor judgment and practical validation."
  ],

  noStrengths: [
    "No category reached the current strength threshold.",
    "No dominant strength area was identified from the category scores.",
    "The assessment did not show a clear strength area above the current threshold.",
    "The profile shows no standout strength area, so baseline development should be prioritized."
  ],

  noDevelopmentAreas: [
    "No major development area was identified below the current development threshold.",
    "No critical development concern was identified from the category scores.",
    "The assessment did not show a major gap below the current development threshold.",
    "Development should focus on reinforcement and practical validation rather than remediation."
  ],

  caution: [
    "Use caution when interpreting this result in isolation.",
    "This result should be combined with practical validation before making final placement decisions.",
    "The assessment result should be used as one source of evidence among several.",
    "Further evidence may be required for high-impact placement or promotion decisions."
  ]
};

// ======================================================
// SCORE-LEVEL PHRASES
// ======================================================

export const scoreLevelPhrases = {
  exceptional: {
    summary: [
      "{{area}} shows exceptional evidence of capability.",
      "{{area}} appears to be a standout strength based on assessment evidence.",
      "{{area}} demonstrates strong assessment evidence and may support advanced responsibility."
    ],
    supervisor: [
      "This area may be leveraged through stretch assignments, mentoring, or greater responsibility.",
      "Supervisor may consider using this area as a foundation for expanded role contribution.",
      "This capability may support more demanding assignments, subject to practical validation."
    ]
  },

  strong: {
    summary: [
      "{{area}} shows reliable evidence of capability.",
      "{{area}} appears to be a strength area.",
      "{{area}} shows strong enough evidence to support role-relevant contribution."
    ],
    supervisor: [
      "This area can be leveraged through practical assignments and continued feedback.",
      "Supervisor may use this area as a useful foundation during onboarding or development.",
      "This strength should be reinforced through real work exposure."
    ]
  },

  adequate: {
    summary: [
      "{{area}} shows functional capability.",
      "{{area}} appears adequate but not yet dominant.",
      "{{area}} shows usable evidence with room for refinement."
    ],
    supervisor: [
      "This area should be reinforced through role-specific practice.",
      "Supervisor should provide feedback and practical exposure to strengthen consistency.",
      "This area may support routine tasks with standard guidance."
    ]
  },

  developing: {
    summary: [
      "{{area}} is developing and requires structured support.",
      "{{area}} shows foundational evidence but needs reinforcement.",
      "{{area}} requires development before complex independent responsibility."
    ],
    supervisor: [
      "Structured practice, coaching, and regular progress review are recommended.",
      "Supervisor should provide clear expectations and guided development.",
      "Practical exposure should be supervised until consistency improves."
    ]
  },

  priority_development: {
    summary: [
      "{{area}} requires priority development.",
      "{{area}} shows significant gaps that may affect role readiness.",
      "{{area}} should be addressed through targeted training and close follow-up."
    ],
    supervisor: [
      "Targeted training and supervised practice are recommended.",
      "Supervisor should monitor progress closely and provide structured feedback.",
      "Independent responsibility in this area should be limited until improvement is validated."
    ]
  },

  critical_gap: {
    summary: [
      "{{area}} shows a critical development need.",
      "{{area}} indicates a significant readiness concern.",
      "{{area}} requires immediate foundational support."
    ],
    supervisor: [
      "Immediate training, close supervision, and clear development milestones are recommended.",
      "Do not assign complex independent responsibility in this area until improvement is validated.",
      "Foundational development should begin before role-critical exposure."
    ]
  }
};

// ======================================================
// MANUFACTURING BASELINE PHRASES
// ======================================================

export const manufacturingPhrases = {
  "Technical Fundamentals": {
    strength: [
      "Technical Fundamentals show useful evidence of equipment and manufacturing-system understanding.",
      "The candidate appears to have a workable technical foundation for supervised onboarding.",
      "Assessment evidence suggests the candidate can build on existing technical fundamentals during practical exposure."
    ],
    development: [
      "Technical Fundamentals require structured reinforcement before independent equipment-related work.",
      "The candidate may need support with equipment concepts, maintenance basics, sensors, motors, or pneumatic systems.",
      "Foundational technical training and supervised equipment familiarization are recommended."
    ],
    action: [
      "Provide equipment walkthroughs, maintenance basics, and supervised technical practice.",
      "Assign practical equipment familiarization with an experienced operator or technician.",
      "Use checklists and demonstrations to reinforce technical concepts."
    ]
  },

  Troubleshooting: {
    strength: [
      "Troubleshooting shows useful diagnostic evidence for common production issues.",
      "Assessment evidence suggests the candidate can approach practical faults with structured support.",
      "The candidate may be able to contribute to supervised line issue review."
    ],
    development: [
      "Troubleshooting requires structured diagnostic development.",
      "The candidate may need support with root-cause analysis and fault-finding.",
      "Guided troubleshooting practice is recommended before independent issue resolution."
    ],
    action: [
      "Use 5 Whys, PDCA, and guided fault scenarios.",
      "Provide practical troubleshooting simulations and supervisor feedback.",
      "Pair the candidate with an experienced technician during issue review."
    ]
  },

  "Numerical Aptitude": {
    strength: [
      "Numerical Aptitude shows useful evidence for production calculations and reporting.",
      "The candidate appears able to handle production math and basic metric interpretation.",
      "Assessment evidence suggests numerical reasoning may support quality or production tracking tasks."
    ],
    development: [
      "Numerical Aptitude requires reinforcement for production calculations and metric interpretation.",
      "The candidate may need support with percentages, ratios, efficiency calculations, or production rates.",
      "Production math practice is recommended before assigning calculation-heavy work."
    ],
    action: [
      "Provide production math exercises and metric interpretation practice.",
      "Use examples involving output, efficiency, ratios, and quality checks.",
      "Review calculation tasks with a supervisor or mentor."
    ]
  },

  "Safety & Work Ethic": {
    strength: [
      "Safety & Work Ethic shows useful evidence of PPE awareness, SOP discipline, and workplace conduct.",
      "Assessment evidence suggests the candidate understands important safety and work-behavior expectations.",
      "This area may support supervised production onboarding, subject to practical observation."
    ],
    development: [
      "Safety & Work Ethic requires reinforcement before independent production exposure.",
      "The candidate may need safety training, SOP reinforcement, and close onboarding supervision.",
      "Safety awareness and workplace conduct should be practically validated before production assignment."
    ],
    action: [
      "Provide safety induction, PPE demonstrations, and SOP review.",
      "Use toolbox talks, hazard-recognition exercises, and supervisor observation.",
      "Validate safe work behavior during supervised onboarding."
    ]
  }
};

// Alias support
manufacturingPhrases["Safety &amp; Work Ethic"] =
  manufacturingPhrases["Safety & Work Ethic"];

// ======================================================
// PERSONALITY / TRAIT PHRASES
// ======================================================

export const traitPhrases = {
  Ownership: {
    strength:
      "Ownership suggests accountability, initiative, and follow-through.",
    development:
      "Ownership requires development through clear expectations, task ownership, and follow-up."
  },
  Collaboration: {
    strength:
      "Collaboration suggests constructive team contribution and interpersonal effectiveness.",
    development:
      "Collaboration requires development through team practice, active listening, and feedback."
  },
  Action: {
    strength:
      "Action suggests initiative, timely execution, and willingness to move tasks forward.",
    development:
      "Action requires development through time-bound tasks, initiative-building, and decision practice."
  },
  Analysis: {
    strength:
      "Analysis suggests structured reasoning and data-informed thinking.",
    development:
      "Analysis requires development through problem-solving frameworks, case practice, and guided reasoning."
  },
  "Risk Tolerance": {
    strength:
      "Risk Tolerance suggests comfort with controlled uncertainty and experimentation.",
    development:
      "Risk Tolerance requires development through safe experiments and structured risk review."
  },
  Structure: {
    strength:
      "Structure suggests process discipline, consistency, and respect for procedures.",
    development:
      "Structure requires development through SOP reinforcement, checklists, and process monitoring."
  }
};

// ======================================================
// ROLE READINESS PHRASES
// ======================================================

export const roleReadinessPhrases = {
  ready: [
    "Assessment evidence suggests possible readiness, subject to practical validation.",
    "The candidate may be considered ready for supervised progression in this role area.",
    "The result supports potential readiness, provided onboarding confirms practical performance."
  ],

  conditional: [
    "The candidate may be conditionally ready with increased supervision and structured onboarding.",
    "Role exposure may be appropriate if development support and supervisor monitoring are in place.",
    "Readiness is developing and should be validated through supervised practical tasks."
  ],

  notReady: [
    "The candidate is not yet recommended for independent responsibility in this role area.",
    "Training and supervised practice are recommended before role placement.",
    "Current evidence suggests the candidate should follow a development-first pathway."
  ]
};

// ======================================================
// DEVELOPMENT PLAN PHRASES
// ======================================================

export const developmentPlanPhrases = {
  thirtyDays: [
    "Clarify expectations and begin foundational development in priority areas.",
    "Start supervised practice and assign a mentor or experienced peer for guidance.",
    "Review low-scoring areas and begin targeted training with weekly check-ins."
  ],

  sixtyDays: [
    "Increase practical exposure while continuing supervisor feedback.",
    "Review progress against development goals and adjust support where needed.",
    "Introduce role-relevant tasks that allow the candidate to apply developing skills."
  ],

  ninetyDays: [
    "Validate progress through practical observation or reassessment.",
    "Review readiness for expanded responsibility based on demonstrated improvement.",
    "Document progress and decide whether further training, reassessment, or placement adjustment is required."
  ]
};

// ======================================================
// HELPER FUNCTIONS
// ======================================================

export const getScoreLevelKey = (percentage) => {
  const value = safeNumber(percentage, 0);

  if (value >= 85) return "exceptional";
  if (value >= 75) return "strong";
  if (value >= 65) return "adequate";
  if (value >= 55) return "developing";
  if (value >= 40) return "priority_development";

  return "critical_gap";
};

export const getScorePhrase = (
  area,
  percentage,
  phraseType = "summary",
  seed = ""
) => {
  const levelKey = getScoreLevelKey(percentage);
  const phrases = scoreLevelPhrases[levelKey]?.[phraseType] || [];

  const selected = selectPhrase(
    phrases,
    `${seed}-${area}-${percentage}-${phraseType}`
  );

  return replaceVariables(selected, {
    area: normalizeText(area),
    percentage
  });
};

export const getManufacturingPhrase = (
  area,
  percentage,
  phraseType = "strength",
  seed = ""
) => {
  const normalizedArea = normalizeText(area);
  const library = manufacturingPhrases[normalizedArea];

  if (!library) {
    return getScorePhrase(area, percentage, "summary", seed);
  }

  const selected = selectPhrase(
    library[phraseType] || library.strength || [],
    `${seed}-${normalizedArea}-${percentage}-${phraseType}`
  );

  return selected;
};

export const getTraitPhrase = (trait, percentage) => {
  const normalizedTrait = normalizeText(trait);
  const library = traitPhrases[normalizedTrait];

  if (!library) {
    return getScorePhrase(trait, percentage, "summary", `${trait}-${percentage}`);
  }

  return percentage >= 75 ? library.strength : library.development;
};

export const getRoleReadinessPhrase = (status, seed = "") => {
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (normalizedStatus.includes("ready") && !normalizedStatus.includes("not")) {
    return selectPhrase(roleReadinessPhrases.ready, `${seed}-ready`);
  }

  if (
    normalizedStatus.includes("conditional") ||
    normalizedStatus.includes("developing")
  ) {
    return selectPhrase(roleReadinessPhrases.conditional, `${seed}-conditional`);
  }

  return selectPhrase(roleReadinessPhrases.notReady, `${seed}-not-ready`);
};

export const getDevelopmentPlanPhrase = (period, seed = "") => {
  const phrases = developmentPlanPhrases[period] || [];
  return selectPhrase(phrases, `${seed}-${period}`);
};

/**
 * Generic phrase getter.
 *
 * Example:
 * getPhrase("generalReportPhrases.noStrengths", "seed")
 */
export const getPhrase = (path, seed = "") => {
  const parts = String(path || "").split(".");
  let current = phraseLibrary;

  for (const part of parts) {
    current = current?.[part];
  }

  if (Array.isArray(current)) {
    return selectPhrase(current, seed);
  }

  if (typeof current === "string") {
    return current;
  }

  return "";
};

/**
 * Compatibility helper for older code that may call generatePhrase().
 */
export const generatePhrase = (template = "", variables = {}) => {
  return replaceVariables(template, variables);
};

// ======================================================
// MAIN LIBRARY EXPORT
// ======================================================

export const phraseLibrary = {
  generalReportPhrases,
  scoreLevelPhrases,
  manufacturingPhrases,
  traitPhrases,
  roleReadinessPhrases,
  developmentPlanPhrases
};

export default {
  phraseLibrary,

  selectPhrase,
  replaceVariables,
  generatePhrase,
  getPhrase,

  getScoreLevelKey,
  getScorePhrase,
  getManufacturingPhrase,
  getTraitPhrase,
  getRoleReadinessPhrase,
  getDevelopmentPlanPhrase,

  generalReportPhrases,
  scoreLevelPhrases,
  manufacturingPhrases,
  traitPhrases,
  roleReadinessPhrases,
  developmentPlanPhrases
};
