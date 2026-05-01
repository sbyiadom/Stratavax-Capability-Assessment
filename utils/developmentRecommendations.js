// utils/developmentRecommendations.js

/**
 * CATEGORY-SPECIFIC DEVELOPMENT RECOMMENDATIONS
 *
 * stakeholder engagement, or team support responsibilities." * Corrected version:
  },

  "Execution Drive": {
    critical:
      "Begin execution development with SMART goals, daily planning, progress tracking, and close follow-up on deliverables.",
    priority:
      "Strengthen execution drive through clear milestones, accountability reviews, obstacle removal, and delivery-focused coaching.",
    developing:
      "Develop execution through manageable goals, weekly progress checks, and feedback on follow-through.",
    reinforce:
      "Reinforce execution through role-relevant deliverables and progress reviews.",
    strength:
      "Leverage execution drive through challenging assignments, implementation projects, or operational delivery ownership."
  },

  Ethics: {
    critical:
      "Begin ethics and integrity reinforcement through policy review, ethical decision frameworks, case studies, and supervisor discussion of workplace dilemmas.",
    priority:
      "Strengthen ethics through values-based coaching, case discussions, and clear decision boundaries.",
    developing:
      "Develop ethical judgment through scenario review and guidance on company expectations.",
    reinforce:
      "Reinforce ethics through policy refreshers and practical workplace examples.",
    strength:
      "Leverage ethical judgment by involving the candidate in values-based discussions or mentoring on professional standards."
  },

  // ======================================================
  // GENERAL / COGNITIVE / TECHNICAL / BEHAVIORAL / CULTURAL
  // ======================================================

  "Cognitive Ability": {
    critical:
      "Begin foundational cognitive development using reasoning exercises, structured problem-solving, and mentor-guided analytical tasks.",
    priority:
      "Strengthen cognitive ability through logic exercises, case studies, decision frameworks, and regular feedback.",
    developing:
      "Develop cognitive capability through practical problem-solving, guided reasoning, and structured learning.",
    reinforce:
      "Reinforce cognitive ability through role-relevant analytical tasks.",
    strength:
      "Leverage cognitive strength through complex problem-solving or planning assignments."
  },

  Communication: {
    critical:
      "Begin communication development through basic business writing, active listening, instruction confirmation, and presentation practice in low-risk settings.",
    priority:
      "Strengthen communication through feedback, writing practice, presentation coaching, and active listening exercises.",
    developing:
      "Develop communication through meeting participation, written summaries, and feedback.",
    reinforce:
      "Reinforce communication through role-relevant presentations and clear reporting.",
    strength:
      "Leverage communication strength through stakeholder interaction, peer support, or presentation responsibilities."
  },

  "Problem-Solving": {
    critical:
      "Begin foundational problem-solving development using 5 Whys, PDCA, root-cause analysis, and supervised practical exercises.",
    priority:
      "Strengthen problem-solving through case studies, structured frameworks, and guided issue resolution.",
    developing:
      "Develop problem-solving through practical scenarios and supervisor feedback.",
    reinforce:
      "Reinforce problem-solving through role-relevant challenges.",
    strength:
      "Leverage problem-solving strength through improvement projects or diagnostic assignments."
  },

  "Technical Knowledge": {
    critical:
      "Begin foundational technical training with structured learning, supervised practice, and review of technical standards.",
    priority:
      "Strengthen technical knowledge through certification, hands-on practice, and mentoring.",
    developing:
      "Develop technical knowledge through practical exposure, guided study, and feedback.",
    reinforce:
      "Reinforce technical knowledge through role-relevant technical tasks.",
    strength:
      "Leverage technical knowledge through advanced technical assignments or peer support."
  },

  "System Understanding": {
    critical:
      "Begin system understanding development by mapping system components, studying process flows, and reviewing cause-and-effect relationships.",
    priority:
      "Strengthen system understanding through process walkthroughs, system diagrams, and practical troubleshooting.",
    developing:
      "Develop system understanding through guided observation and process review.",
    reinforce:
      "Reinforce system understanding through operational exposure.",
    strength:
      "Leverage system understanding through process improvement or cross-functional tasks."
  },

  "Safety & Compliance": {
    critical:
      "Prioritize safety and compliance training immediately. Review procedures, reporting rules, and compliance expectations before independent work.",
    priority:
      "Strengthen safety and compliance through refresher training, practical demonstrations, and supervisor observation.",
    developing:
      "Develop safety and compliance through SOP review, safety talks, and guided practice.",
    reinforce:
      "Reinforce safety and compliance through periodic observation and feedback.",
    strength:
      "Leverage safety and compliance strength through safety champion activities or peer support."
  },

  "Quality Control": {
    critical:
      "Begin quality-control training with standards review, inspection methods, checklists, and supervised quality checks.",
    priority:
      "Strengthen quality control through practical inspections, defect identification, and quality documentation practice.",
    developing:
      "Develop quality control through supervised checks and feedback.",
    reinforce:
      "Reinforce quality control through routine quality tasks.",
    strength:
      "Leverage quality-control strength through quality monitoring or improvement initiatives."
  },

  "Values Alignment": {
    critical:
      "Clarify company values, expected behavior, and role standards. Use coaching and supervisor check-ins to reinforce alignment.",
    priority:
      "Strengthen values alignment through onboarding discussions, values-based scenarios, and feedback.",
    developing:
      "Develop values alignment through expectation setting and workplace examples.",
    reinforce:
      "Reinforce values alignment through recognition and feedback.",
    strength:
      "Leverage values alignment by encouraging the candidate to model expected workplace behavior."
  },

  "Work Ethic": {
    critical:
      "Clarify reliability, effort, attendance, task completion, and quality expectations. Use close follow-up and accountability routines.",
    priority:
      "Strengthen work ethic through clear goals, progress reviews, and feedback on reliability.",
    developing:
      "Develop work ethic through structured tasks, supervisor check-ins, and recognition of consistency.",
    reinforce:
      "Reinforce work ethic through role-relevant responsibilities and feedback.",
    strength:
      "Leverage work ethic by assigning dependable tasks and recognizing consistency."
  },

  Professionalism: {
    critical:
      "Begin professionalism coaching with clear standards for conduct, communication, reliability, and workplace behavior.",
    priority:
      "Strengthen professionalism through feedback, role expectations, and supervisor check-ins.",
    developing:
      "Develop professionalism through workplace examples and behavior coaching.",
    reinforce:
      "Reinforce professionalism through periodic feedback.",
    strength:
      "Leverage professionalism by assigning visible responsibilities or peer support roles."
  }
};

// ======================================================
// MAIN EXPORT
// ======================================================

export const getDevelopmentRecommendation = (category, percentage) => {
  const normalizedCategory = normalizeText(category || "this area");
  const value = safeNumber(percentage, 0);

  const categoryRecommendations = recommendations[normalizedCategory];

  if (!categoryRecommendations) {
    return defaultRecommendation(normalizedCategory, value);
  }

  return buildRecommendation({
    category: normalizedCategory,
    percentage: value,
    critical: categoryRecommendations.critical,
    priority: categoryRecommendations.priority,
    developing: categoryRecommendations.developing,
    reinforce: categoryRecommendations.reinforce,
    strength: categoryRecommendations.strength
  });
};

export default {
  getDevelopmentRecommendation
};
 * - Uses central scoring standard from utils/scoring.js
 * - Supports all assessment types
 * - Keeps existing export: getDevelopmentRecommendation(category, percentage)
 * - Provides supervisor-friendly, practical development guidance
 */

import {
  isCriticalGap,
  isPriorityDevelopment,
  isDevelopmentArea,
  isStrength,
  calculateGapToTarget,
  getScoreLevel
} from "./scoring";

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

const getPriorityKey = (percentage) => {
  const value = safeNumber(percentage, 0);

  if (isCriticalGap(value)) return "critical";
  if (isPriorityDevelopment(value)) return "priority";
  if (isDevelopmentArea(value)) return "developing";
  if (isStrength(value)) return "strength";

  return "reinforce";
};

const buildRecommendation = ({
  category,
  percentage,
  critical,
  priority,
  developing,
  reinforce,
  strength
}) => {
  const value = safeNumber(percentage, 0);
  const priorityKey = getPriorityKey(value);
  const gap = calculateGapToTarget(value);
  const scoreLevel = getScoreLevel(value);

  const recommendationMap = {
    critical,
    priority,
    developing,
    reinforce,
    strength
  };

  const selected =
    recommendationMap[priorityKey] ||
    recommendationMap.reinforce ||
    defaultRecommendation(category, value);

  const gapText =
    gap > 0
      ? ` Current gap to the recommended 80% target is ${gap}%.`
      : " Current result meets or exceeds the recommended 80% target.";

  return `${selected} ${gapText} Development level: ${scoreLevel.label}.`;
};

const defaultRecommendation = (category, percentage) => {
  const value = safeNumber(percentage, 0);
  const normalizedCategory = normalizeText(category || "this area");

  if (isCriticalGap(value)) {
    return `Critical development is needed in ${normalizedCategory}. Start with foundational training, assign a mentor, use supervised practice, and schedule weekly progress reviews.`;
  }

  if (isPriorityDevelopment(value)) {
    return `${normalizedCategory} requires priority development. Provide structured training, guided practice, and regular supervisor feedback.`;
  }

  if (isDevelopmentArea(value)) {
    return `${normalizedCategory} is developing. Build capability through targeted practice, feedback, and role-specific exposure.`;
  }

  if (isStrength(value)) {
    return `${normalizedCategory} is a strength. Continue to leverage this capability through practical assignments, mentoring opportunities, or advanced role exposure.`;
  }

  return `${normalizedCategory} shows functional capability. Continue reinforcing this area through practice, coaching, and periodic review.`;
};

// ======================================================
// RECOMMENDATION LIBRARY
// ======================================================

const recommendations = {
  // ======================================================
  // MANUFACTURING BASELINE
  // ======================================================

  "Technical Fundamentals": {
    critical:
      "Provide foundational technical training before independent equipment exposure. Focus on basic maintenance principles, mechanical components, sensors, motors, lubrication, pneumatic systems, and equipment safety. Pair the candidate with an experienced operator or technician for supervised practical learning.",
    priority:
      "Strengthen technical fundamentals through structured equipment familiarization, practical demonstrations, preventive maintenance basics, and guided technical exercises. Supervisor should verify understanding before assigning equipment-related tasks.",
    developing:
      "Continue building technical fundamentals through hands-on practice, equipment walkthroughs, maintenance checklists, and coaching on common production equipment.",
    reinforce:
      "Reinforce technical fundamentals through supervised line exposure, periodic technical refreshers, and practical equipment checks.",
    strength:
      "Leverage technical fundamentals by assigning supervised equipment-related tasks, supporting peer learning, or progressing toward maintenance or technical training pathways."
  },

  Troubleshooting: {
    critical:
      "Begin with foundational troubleshooting training. Focus on problem identification, root-cause analysis, 5 Whys, PDCA, fault symptoms, and common production issues. Candidate should not handle independent fault diagnosis until practical competence is validated.",
    priority:
      "Develop troubleshooting through structured diagnostic scenarios, guided root-cause analysis, fault-finding checklists, and supervised line problem-solving practice.",
    developing:
      "Build troubleshooting consistency through practical production scenarios, review of common faults, and coaching on systematic diagnosis.",
    reinforce:
      "Reinforce troubleshooting by involving the candidate in supervised problem-solving tasks and post-issue reviews.",
    strength:
      "Leverage troubleshooting strength by involving the candidate in supervised diagnostic tasks, line improvement discussions, or peer support during common issue resolution."
  },

  "Numerical Aptitude": {
    critical:
      "Provide foundational production-math training before assigning calculation-heavy tasks. Focus on basic arithmetic, percentages, ratios, production rates, efficiency calculations, and quality documentation.",
    priority:
      "Strengthen numerical aptitude through production calculation exercises, metric interpretation, efficiency math, and supervised data-entry or reporting practice.",
    developing:
      "Continue developing numerical aptitude through regular production math drills, simple reporting tasks, and coaching on interpreting operational metrics.",
    reinforce:
      "Reinforce numerical aptitude through routine production tracking, basic quality data interpretation, and periodic supervisor review.",
    strength:
      "Leverage numerical aptitude by assigning supervised production reporting, quality monitoring, or metric-tracking responsibilities."
  },

  "Safety & Work Ethic": {
    critical:
      "Prioritize safety training before any production exposure. Focus on PPE, SOP compliance, hazard identification, incident reporting, emergency response, teamwork expectations, and professional conduct. Close supervision is required until safety behavior is validated.",
    priority:
      "Strengthen safety and work ethic through safety refresher training, PPE demonstrations, SOP reviews, hazard-recognition exercises, and close supervisor feedback.",
    developing:
      "Continue reinforcing safety and work ethic through onboarding checklists, toolbox talks, SOP reminders, and supervised production exposure.",
    reinforce:
      "Reinforce safety and work ethic through periodic safety reviews, observation, and feedback during onboarding.",
    strength:
      "Leverage safety and work ethic strength by encouraging the candidate to model SOP discipline, participate in safety discussions, and support safe work habits during onboarding."
  },

  "Safety &amp; Work Ethic": {
    critical:
      "Prioritize safety training before any production exposure. Focus on PPE, SOP compliance, hazard identification, incident reporting, emergency response, teamwork expectations, and professional conduct. Close supervision is required until safety behavior is validated.",
    priority:
      "Strengthen safety and work ethic through safety refresher training, PPE demonstrations, SOP reviews, hazard-recognition exercises, and close supervisor feedback.",
    developing:
      "Continue reinforcing safety and work ethic through onboarding checklists, toolbox talks, SOP reminders, and supervised production exposure.",
    reinforce:
      "Reinforce safety and work ethic through periodic safety reviews, observation, and feedback during onboarding.",
    strength:
      "Leverage safety and work ethic strength by encouraging the candidate to model SOP discipline, participate in safety discussions, and support safe work habits during onboarding."
  },

  // ======================================================
  // PERSONALITY TRAITS
  // ======================================================

  Ownership: {
    critical:
      "Begin accountability coaching immediately. Assign a small, clearly defined task with visible ownership, weekly check-ins, and documented follow-through expectations.",
    priority:
      "Build ownership through project responsibility, progress tracking, feedback on follow-through, and coaching on taking responsibility for outcomes.",
    developing:
      "Develop ownership by assigning manageable responsibilities, reviewing commitments weekly, and encouraging proactive communication of blockers.",
    reinforce:
      "Reinforce ownership through stretch assignments, accountability routines, and recognition of reliable follow-through.",
    strength:
      "Leverage ownership by assigning project ownership, mentoring responsibilities, or tasks requiring independent follow-through."
  },

  Collaboration: {
    critical:
      "Start with foundational teamwork development. Use structured group tasks, active-listening practice, and supervisor feedback on team participation.",
    priority:
      "Strengthen collaboration through cross-functional assignments, peer feedback, team problem-solving, and coaching on consensus-building.",
    developing:
      "Develop collaboration through paired work, team participation, shared goals, and feedback on communication style.",
    reinforce:
      "Reinforce collaboration through team assignments, meeting participation, and recognition of constructive team behavior.",
    strength:
      "Leverage collaboration by assigning team-based tasks, peer support opportunities, or cross-functional participation."
  },

  Action: {
    critical:
      "Build action orientation through time-bound tasks, clear decision rules, and close supervisor follow-up. Start with low-risk decisions and immediate feedback.",
    priority:
      "Strengthen action orientation through initiative-building exercises, decision deadlines, task ownership, and progress tracking.",
    developing:
      "Develop action orientation through small independent tasks, time-boxed decisions, and coaching on urgency.",
    reinforce:
      "Reinforce action orientation through role-relevant assignments that require timely execution.",
    strength:
      "Leverage action orientation through fast-paced assignments, implementation tasks, or responsibility for moving priorities forward."
  },

  Analysis: {
    critical:
      "Begin foundational analytical training. Use structured problem-solving frameworks, root-cause analysis, decision matrices, and supervised reasoning exercises.",
    priority:
      "Strengthen analysis through case studies, data interpretation practice, structured problem-solving, and feedback on decision logic.",
    developing:
      "Develop analysis through guided planning, review of alternatives, evidence gathering, and supervisor feedback.",
    reinforce:
      "Reinforce analysis through practical decision reviews, simple data tasks, and structured reflection.",
    strength:
      "Leverage analysis by assigning planning, quality review, data interpretation, or problem-solving tasks."
  },

  "Risk Tolerance": {
    critical:
      "Start with low-risk experimentation and structured risk assessment. Candidate should practice evaluating probability, impact, and mitigation with mentor support.",
    priority:
      "Build healthy risk tolerance through controlled pilot tasks, risk-review conversations, and safe experimentation.",
    developing:
      "Develop risk tolerance by encouraging calculated risk-taking in low-impact situations and reviewing lessons learned.",
    reinforce:
      "Reinforce risk tolerance through small improvement projects and structured reflection on outcomes.",
    strength:
      "Leverage risk tolerance through innovation tasks, controlled improvement experiments, or pilot initiatives."
  },

  Structure: {
    critical:
      "Start with process-discipline training. Use checklists, SOP review, task templates, and close monitoring of procedure adherence.",
    priority:
      "Strengthen structure through standard work routines, documented procedures, quality checks, and supervisor review.",
    developing:
      "Develop structure by using checklists, calendars, SOP practice, and regular feedback on consistency.",
    reinforce:
      "Reinforce structure through process-based assignments and periodic review of compliance with procedures.",
    strength:
      "Leverage structure by assigning quality-critical tasks, documentation work, process improvement, or SOP support."
  },

  // ======================================================
  // STRATEGIC LEADERSHIP
  // ======================================================

  "Vision / Strategy": {
    critical:
      "Begin with foundational strategic thinking training. Focus on business context, long-term planning, SWOT, scenario thinking, and structured strategic memos.",
    priority:
      "Strengthen strategy through participation in planning sessions, business case reviews, market or operational analysis, and mentoring from senior leaders.",
    developing:
      "Develop strategy through case studies, scenario planning, and guided review of organizational priorities.",
    reinforce:
      "Reinforce strategy through department planning discussions and practical strategic assignments.",
    strength:
      "Leverage strategic capability by assigning strategic projects, planning responsibilities, or mentoring opportunities."
  },

  "People Leadership": {
    critical:
      "Begin foundational people-leadership training. Focus on feedback, coaching, delegation, team motivation, and conflict basics.",
    priority:
      "Strengthen people leadership through supervised team coordination, feedback practice, coaching exercises, and leadership mentoring.",
    developing:
      "Develop people leadership through small team assignments, coaching practice, and regular feedback from a manager.",
    reinforce:
      "Reinforce people leadership through project leadership and peer coaching.",
    strength:
      "Leverage people leadership through team leadership, mentoring, or formal supervisory development."
  },

  "Decision Making": {
    critical:
      "Begin structured decision-making development. Use decision matrices, risk review, root-cause analysis, and mentor review before major decisions.",
    priority:
      "Strengthen decision making through case studies, bias awareness, scenario planning, and post-decision reviews.",
    developing:
      "Develop decision making through supervised decision tasks and structured reflection on outcomes.",
    reinforce:
      "Reinforce decision making through practical role decisions and feedback.",
    strength:
      "Leverage decision-making strength by assigning complex decisions with appropriate accountability."
  },

  Accountability: {
    critical:
      "Begin accountability coaching. Assign clearly owned tasks with written commitments, progress tracking, and weekly supervisor review.",
    priority:
      "Strengthen accountability through ownership of initiatives, follow-through routines, and feedback on reliability.",
    developing:
      "Develop accountability through defined tasks, check-ins, and reflection on commitments.",
    reinforce:
      "Reinforce accountability through stretch assignments and performance tracking.",
    strength:
      "Leverage accountability through project ownership, mentoring, or lead contributor responsibilities."
  },

  "Emotional Intelligence": {
    critical:
      "Begin emotional intelligence development through self-awareness training, active listening, empathy practice, and feedback on interpersonal interactions.",
    priority:
      "Strengthen emotional intelligence through coaching, perspective-taking, conflict management practice, and feedback.",
    developing:
      "Develop emotional intelligence through reflection, guided interpersonal practice, and supervisor feedback.",
    reinforce:
      "Reinforce emotional intelligence through team interaction and feedback.",
    strength:
