// utils/competencyNarrative.js
// Phase 6.5 — Top-level competency narrative generator.
//
// Turns an array of competency scores into a human-readable paragraph
// that names the candidate's strongest and weakest areas, interprets
// the spread, and gives the supervisor a concrete next step.
//
// PURE FUNCTION. No database access. No side effects.

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).trim();
}

function round1(value) {
  return Math.round(safeNumber(value, 0) * 10) / 10;
}

// ============================================================
// THRESHOLDS
// ============================================================
const STRENGTH_ABSOLUTE = 75;
const DEVELOPMENT_ABSOLUTE = 55;
const SPREAD_WIDE = 20;
const SPREAD_NARROW = 8;

// ============================================================
// CLASSIFICATION
// ============================================================
export function classifyCompetencySignal(percentage) {
  const p = safeNumber(percentage, 0);
  if (p >= STRENGTH_ABSOLUTE) return "strength";
  if (p <= DEVELOPMENT_ABSOLUTE) return "development";
  return "neutral";
}

export function classifySpread(spread) {
  const s = safeNumber(spread, 0);
  if (s >= SPREAD_WIDE) return "wide";
  if (s <= SPREAD_NARROW) return "narrow";
  return "moderate";
}

export function getTopAndBottom(competencyScores) {
  const rows = Array.isArray(competencyScores) ? competencyScores : [];
  if (rows.length === 0) return { top: null, bottom: null, spread: 0 };

  let top = null;
  let bottom = null;

  rows.forEach((row) => {
    const p = safeNumber(row?.percentage, 0);
    if (!top || p > safeNumber(top.percentage, 0)) {
      top = { ...row, percentage: p };
    }
    if (!bottom || p < safeNumber(bottom.percentage, 0)) {
      bottom = { ...row, percentage: p };
    }
  });

  const spread = round1(safeNumber(top?.percentage, 0) - safeNumber(bottom?.percentage, 0));
  return { top, bottom, spread };
}

// ============================================================
// PHRASE SELECTION
// ============================================================
function pickHeadline(topSignal, bottomSignal) {
  if (topSignal === "strength" && bottomSignal === "development") {
    return "This candidate shows a mixed competency profile with a clear standout strength and a clear development area.";
  }
  if (topSignal === "strength" && bottomSignal !== "development") {
    return "This candidate shows strong overall competency performance across the assessed areas.";
  }
  if (topSignal !== "strength" && bottomSignal === "development") {
    return "This candidate shows development needs across the assessed competency areas.";
  }
  return "This candidate shows a consistent, moderate competency profile with no dominant strength or weakness.";
}

function pickSpreadSummary(signal, spread, top, bottom) {
  const topName = safeText(top?.name, "the strongest area");
  const bottomName = safeText(bottom?.name, "the weakest area");
  const topPct = round1(top?.percentage);
  const bottomPct = round1(bottom?.percentage);

  if (signal === "wide") {
    return `The ${round1(spread)}-point spread across competencies is wide. ${topName} (${topPct}%) is clearly the strongest area, while ${bottomName} (${bottomPct}%) is significantly weaker. This pattern suggests uneven development: the candidate is reliable in one domain but will need targeted support in another.`;
  }
  if (signal === "narrow") {
    return `The ${round1(spread)}-point spread across competencies is narrow, indicating consistent performance rather than a dominant strength or weakness. The candidate performed roughly evenly, with ${topName} (${topPct}%) only slightly ahead of ${bottomName} (${bottomPct}%).`;
  }
  return `The ${round1(spread)}-point spread across competencies is moderate. ${topName} (${topPct}%) leads the profile, while ${bottomName} (${bottomPct}%) sits lowest. The candidate has distinguishable strengths and development areas that supervisors can work with.`;
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================
export function generateCompetencyNarrative({
  competencyScores,
  candidateName,
  assessmentTitle,
} = {}) {
  const rows = Array.isArray(competencyScores) ? competencyScores : [];
  const name = safeText(candidateName, "This candidate");
  const title = safeText(assessmentTitle, "this assessment");

  if (rows.length === 0) {
    return {
      signal: "none",
      headline: "",
      spreadSummary: "",
      topCompetency: null,
      bottomCompetency: null,
      paragraph: `No competency data is available for ${name} on ${title}.`,
    };
  }

  const { top, bottom, spread } = getTopAndBottom(rows);
  const spreadSignal = classifySpread(spread);
  const topSignal = classifyCompetencySignal(top?.percentage);
  const bottomSignal = classifyCompetencySignal(bottom?.percentage);

  const headline = pickHeadline(topSignal, bottomSignal);
  const spreadSummary = pickSpreadSummary(spreadSignal, spread, top, bottom);

  return {
    signal: spreadSignal,
    headline,
    spreadSummary,
    topCompetency: top
      ? { name: top.name, percentage: round1(top.percentage), classification: top.classification }
      : null,
    bottomCompetency: bottom
      ? { name: bottom.name, percentage: round1(bottom.percentage), classification: bottom.classification }
      : null,
    paragraph: `${headline} ${spreadSummary}`,
  };
}

export function generateSupervisorImplication({ topCompetency, bottomCompetency, signal } = {}) {
  const topName = safeText(topCompetency?.name, "the strongest competency");
  const bottomName = safeText(bottomCompetency?.name, "the weakest competency");

  if (signal === "wide") {
    return `Leverage ${topName} where reliability matters most. Plan structured development for ${bottomName} with clear milestones and regular feedback over the first 90 days.`;
  }
  if (signal === "narrow") {
    return `Assign a range of tasks to draw out capability differences over time. No single competency needs urgent attention, but continued observation will help identify where this candidate contributes best.`;
  }
  return `Consider assigning tasks that lean on ${topName} while gradually introducing opportunities to strengthen ${bottomName} under supervision.`;
}

export default {
  classifyCompetencySignal,
  classifySpread,
  getTopAndBottom,
  generateCompetencyNarrative,
  generateSupervisorImplication,
};
