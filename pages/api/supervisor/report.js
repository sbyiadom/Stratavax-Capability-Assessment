// pages/api/supervisor/report.js

import { createClient } from "@supabase/supabase-js";

/*
  SUPERVISOR REPORT API - FINAL REPORT INTELLIGENCE

  Purpose:
  - Generate supervisor-ready reports directly from candidate responses.
  - Treat high scores as strengths/leverage areas, not development gaps.
  - Provide score-sensitive executive summaries, role readiness, follow-up questions,
    recommendations, category narratives, and behavioral insights.
  - Support shared access: supervisors can view reports shared by other supervisors.
*/

// ======================================================
// BASIC HELPERS
// ======================================================

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function roundNumber(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(toNumber(value, 0) * factor) / factor;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  if (Array.isArray(value)) {
    if (value.length > 0 && value[0] && typeof value[0] === "object") return value[0];
    return null;
  }
  if (value && typeof value === "object") return value;
  return null;
}

function getValue(objectValue, key, fallback) {
  const objectData = asObject(objectValue);
  if (!objectData) return fallback;
  if (objectData[key] !== undefined && objectData[key] !== null && objectData[key] !== "") {
    return objectData[key];
  }
  return fallback;
}

function firstValue(values, fallback) {
  if (!Array.isArray(values)) return fallback;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== undefined && values[i] !== null && values[i] !== "") return values[i];
  }
  return fallback;
}

function decodeHtmlEntities(value) {
  if (value === null || value === undefined) return value;
  let text = String(value);
  let previousText;
  for (let i = 0; i < 10; i += 1) {
    previousText = text;
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#039;/g, "'");
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, " ");
    if (text === previousText) break;
  }
  return text;
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return decodeHtmlEntities(value);
}

function decodeObjectDeep(value) {
  if (typeof value === "string") return decodeHtmlEntities(value);
  if (Array.isArray(value)) return value.map(decodeObjectDeep);
  if (value && typeof value === "object") {
    const output = {};
    Object.keys(value).forEach(key => {
      output[key] = decodeObjectDeep(value[key]);
    });
    return output;
  }
  return value;
}

function normalizeCategoryName(category) {
  return cleanText(category, "General").trim();
}

// ======================================================
// SCORE CLASSIFICATION
// ======================================================

function classifyScore(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return "Exceptional";
  if (value >= 75) return "Strong Performer";
  if (value >= 65) return "Capable Contributor";
  if (value >= 55) return "Developing";
  if (value >= 40) return "At Risk";
  return "High Risk";
}

function getRiskLevel(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 75) return "Low";
  if (value >= 65) return "Moderate";
  if (value >= 55) return "Elevated";
  if (value >= 40) return "High";
  return "Critical";
}

function getPriorityFromScore(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 75) return "Leverage";
  if (value >= 65) return "Low";
  if (value >= 55) return "Medium";
  if (value >= 40) return "High";
  return "Critical";
}

function getScoreComment(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return "Exceptional performance with strong evidence of readiness.";
  if (value >= 75) return "Strong performance with reliable capability.";
  if (value >= 65) return "Adequate performance with some areas requiring reinforcement.";
  if (value >= 55) return "Developing performance requiring structured support.";
  if (value >= 40) return "Priority development is required.";
  return "Critical development support is required.";
}

function getSupervisorImplication(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) {
    return "The candidate shows strong readiness and can be considered for role responsibilities with normal supervision, stretch assignments, and opportunities to leverage demonstrated strengths.";
  }
  if (value >= 75) {
    return "The candidate can perform reliably with standard supervision while benefiting from targeted reinforcement and role-specific feedback.";
  }
  if (value >= 65) {
    return "The candidate can perform with guidance, coaching, and periodic review in selected areas.";
  }
  if (value >= 55) {
    return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  }
  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

// ======================================================
// CATEGORY INTELLIGENCE
// ======================================================

function getCategoryDomainContext(category) {
  const value = normalizeCategoryName(category);
  if (value === "Clinical") return "clinical interpretation, behavioral judgement, and response planning";
  if (value === "Leadership") return "ownership, direction setting, accountability, and leadership follow-through";
  if (value === "Decision-Making") return "judgement under ambiguity, prioritization, risk review, and decision quality";
  if (value === "Decision-Making & Problem-Solving") return "structured judgement, problem analysis, option evaluation, and decision quality";
  if (value === "Communication Style") return "feedback response, listening, emotional awareness, tone, and clarity";
  if (value === "Communication & Influence") return "clarity, stakeholder communication, influence, listening, and message discipline";
  if (value === "Adaptability") return "flexibility, change response, uncertainty management, and adjustment to new demands";
  if (value === "Collaboration") return "team contribution, shared accountability, cooperation, and alignment with others";
  if (value === "FBA") return "behavioral antecedents, consequences, triggers, function, and response planning";
  if (value === "Role Readiness") return "readiness for role responsibilities, practical judgement, and supervised application";
  if (value === "Resilience & Stress Management") return "resilience, stress response, pressure management, and sustained performance";
  if (value === "Empathy & Relationship Building") return "relationship building, empathy, trust, and interpersonal awareness";
  if (value === "Cultural Alignment") return "alignment with expected values, work norms, and organizational behavior";
  if (value === "Cultural Competence & Inclusivity") return "inclusive behavior, cultural awareness, and respectful collaboration";
  if (value === "Derailer Identification") return "awareness of behavior risks, self-management, and early identification of derailers";
  if (value === "Change Leadership & Agility") return "change leadership, adaptability, agility, and response to shifting priorities";
  if (value === "Values & Drivers") return "work values, motivation, drivers, and consistency with expected role behavior";
  if (value === "Vision & Strategic Thinking") return "strategic thinking, future orientation, planning, and broader business perspective";
  if (value === "Learning Agility") return "learning speed, feedback use, adaptability, and growth orientation";
  if (value === "People Management & Coaching") return "coaching, people leadership, performance support, and team development";
  if (value === "Execution & Results Orientation") return "execution discipline, results focus, follow-through, and delivery ownership";
  if (value === "Self-Awareness & Self-Regulation") return "self-awareness, emotional regulation, reflection, and disciplined behavior";
  if (value === "Integrated Leadership Judgment") return "integrated judgement, leadership reasoning, situational awareness, and balanced decision-making";
  if (value === "Aptitude") return "cognitive aptitude, problem-solving, analytical thinking, and learning ability";
  if (value === "Attitude") return "workplace attitude, professionalism, engagement, and positive contribution";
  if (value === "Safety") return "safety awareness, hazard identification, and safe work practices";
  if (value === "Technical") return "technical knowledge, equipment operation, and manufacturing processes";
  if (value === "Troubleshooting") return "diagnostic thinking, root cause analysis, and systematic problem resolution";
  return "this competency area and its practical application in role responsibilities";
}

function getScoreBandName(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return "clear strength";
  if (value >= 75) return "strong capability";
  if (value >= 65) return "capable performance";
  if (value >= 55) return "developing capability";
  if (value >= 40) return "priority development area";
  return "critical development area";
}

function getCategoryNarrative(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = normalizeCategoryName(category);
  const context = getCategoryDomainContext(cleanCategory);
  const band = getScoreBandName(value);

  if (value >= 85) {
    return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". This area can be leveraged in role responsibilities, stretch assignments, mentoring opportunities, and higher-complexity work where the candidate can contribute with confidence.";
  }
  if (value >= 75) {
    return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". The candidate appears reliable in this area and should be encouraged to apply this capability consistently while receiving normal role-specific reinforcement.";
  }
  if (value >= 65) {
    return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". The area is broadly adequate, but the supervisor should monitor consistency, provide practical feedback, and reinforce application in real work situations.";
  }
  if (value >= 55) {
    return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". Structured coaching, guided practice, and periodic review are recommended before the candidate is relied upon independently in this area.";
  }
  if (value >= 40) {
    return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". Targeted development, close supervision, practical exercises, and validation through observed application are recommended.";
  }
  return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". The supervisor should apply close support, avoid independent assignment of critical responsibilities in this area, and validate improvement through structured practice.";
}

function getCategoryAction(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = normalizeCategoryName(category);
  const priority = getPriorityFromScore(value);

  if (value >= 85) {
    return "Leverage this strength through stretch assignments, peer support, mentoring opportunities, and role tasks where " + cleanCategory + " can improve team or operational performance. Priority: " + priority + ".";
  }
  if (value >= 75) {
    return "Maintain this capability through normal supervision, role-specific feedback, and opportunities to apply " + cleanCategory + " in practical work situations. Priority: " + priority + ".";
  }
  if (value >= 65) {
    return "Reinforce this area through periodic review, targeted feedback, and practical application to improve consistency. Priority: " + priority + ".";
  }
  if (value >= 55) {
    return "Provide structured coaching, guided practice, and review progress after applied tasks before increasing independence. Priority: " + priority + ".";
  }
  if (value >= 40) {
    return "Create a targeted development plan with close supervision, practical scenarios, feedback cycles, and documented progress review. Priority: " + priority + ".";
  }
  return "Apply immediate development support, close supervision, simplified assignments, and formal progress validation before assigning critical responsibilities. Priority: " + priority + ".";
}

function getCategoryFollowUpQuestion(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = normalizeCategoryName(category);

  if (value >= 75) {
    return "Ask the candidate to describe how this strength can be applied to improve performance, support others, or handle a more complex responsibility in the role.";
  }
  if (cleanCategory === "Clinical") return "Ask the candidate to explain how the candidate would interpret and respond to a sensitive behavioral scenario, including what evidence would be checked before acting.";
  if (cleanCategory === "Leadership") return "Ask the candidate to describe a situation where the candidate had to take ownership, guide others, and follow through despite uncertainty.";
  if (cleanCategory === "Decision-Making" || cleanCategory === "Decision-Making & Problem-Solving") return "Ask the candidate to walk through a recent difficult decision, including options considered, risks identified, and how the final choice was made.";
  if (cleanCategory === "Communication Style" || cleanCategory === "Communication & Influence") return "Ask the candidate to give an example of receiving difficult feedback and explain how the candidate responded and adjusted communication.";
  if (cleanCategory === "Adaptability" || cleanCategory === "Change Leadership & Agility") return "Ask the candidate to describe how the candidate handles sudden changes in plans, priorities, or instructions.";
  if (cleanCategory === "Collaboration") return "Ask the candidate to explain how the candidate works with team members when there are different opinions, unclear roles, or shared deadlines.";
  if (cleanCategory === "FBA") return "Ask the candidate to analyze a behavior scenario by identifying antecedents, consequences, likely function, and appropriate response options.";
  if (cleanCategory === "Safety") return "Ask the candidate to describe a safety observation they would make in the workplace and how they would address it.";
  if (cleanCategory === "Troubleshooting") return "Ask the candidate to walk through a diagnostic process for a manufacturing equipment issue, including what they would check first and why.";
  if (cleanCategory === "Technical") return "Ask the candidate to explain a key technical concept in their domain and how it applies to daily operations.";
  if (cleanCategory === "Aptitude") return "Ask the candidate to describe how they approach learning new technical concepts or solving analytical problems.";
  if (cleanCategory === "Attitude") return "Ask the candidate to describe a situation where they maintained a positive attitude during a challenging work period.";

  return "Ask the candidate to provide a practical example that demonstrates capability in " + cleanCategory + ", including what was done, why it was done, and what outcome resulted.";
}

// ======================================================
// RESPONSE HELPERS (for fallback calculation)
// ======================================================

function getQuestion(response) {
  if (!response) return null;
  return asObject(response.unique_questions) || asObject(response.question) || null;
}

function getAnswer(response) {
  if (!response) return null;
  return asObject(response.unique_answers) || asObject(response.answer) || asObject(response.selected_answer) || null;
}

function getResponseScore(response) {
  const answer = getAnswer(response);
  return toNumber(firstValue([
    getValue(response, "score", null),
    getValue(response, "selected_score", null),
    getValue(response, "answer_score", null),
    getValue(response, "value", null),
    getValue(response, "points", null),
    getValue(answer, "score", null),
    getValue(answer, "value", null),
    getValue(answer, "points", null)
  ], 0), 0);
}

function getResponseMaxScore(response) {
  const question = getQuestion(response);
  return toNumber(firstValue([
    getValue(response, "max_score", null),
    getValue(response, "maxScore", null),
    getValue(response, "max_points", null),
    getValue(response, "max", null),
    getValue(question, "max_score", null),
    getValue(question, "maxScore", null),
    getValue(question, "max_points", null),
    5
  ], 5), 5);
}

function getResponseCategory(response) {
  const question = getQuestion(response);
  return normalizeCategoryName(firstValue([
    getValue(question, "section", null),
    getValue(response, "section", null),
    getValue(question, "category", null),
    getValue(response, "category", null),
    getValue(question, "competency", null),
    getValue(response, "competency", null),
    getValue(question, "dimension", null),
    getValue(response, "dimension", null)
  ], "General"));
}

function getResponseSubcategory(response) {
  const question = getQuestion(response);
  return cleanText(firstValue([
    getValue(question, "subsection", null),
    getValue(response, "subsection", null),
    getValue(question, "sub_category", null),
    getValue(response, "sub_category", null)
  ], ""), "");
}

function getResponseQuestionText(response) {
  const question = getQuestion(response);
  return cleanText(firstValue([
    getValue(question, "question_text", null),
    getValue(question, "text", null),
    getValue(response, "question_text", null),
    getValue(response, "question", null)
  ], ""), "");
}

function getResponseAnswerText(response) {
  const answer = getAnswer(response);
  return cleanText(firstValue([
    getValue(answer, "answer_text", null),
    getValue(answer, "text", null),
    getValue(answer, "label", null),
    getValue(response, "answer_text", null),
    getValue(response, "selected_answer_text", null)
  ], ""), "");
}

function getResponseTime(response) {
  if (!response) return 0;
  return toNumber(firstValue([
    getValue(response, "time_spent_seconds", null),
    getValue(response, "time_spent", null),
    getValue(response, "duration_seconds", null),
    getValue(response, "response_time_seconds", null)
  ], 0), 0);
}

function getResponseChanges(response) {
  if (!response) return 0;
  return toNumber(firstValue([
    getValue(response, "times_changed", null),
    getValue(response, "changes", null),
    getValue(response, "answer_changes", null),
    getValue(response, "revision_count", null)
  ], 0), 0);
}

// ======================================================
// CANDIDATE / ASSESSMENT HELPERS
// ======================================================

function getCandidateName(candidate, userId) {
  if (!candidate) return "Candidate";
  const value = firstValue([
    getValue(candidate, "full_name", null),
    getValue(candidate, "name", null),
    getValue(candidate, "display_name", null),
    getValue(candidate, "candidate_name", null),
    getValue(candidate, "email", null)
  ], userId || "Candidate");
  return cleanText(value, "Candidate");
}

function getAssessmentName(assessment) {
  if (!assessment) return "Assessment";
  const value = firstValue([
    getValue(assessment, "title", null),
    getValue(assessment, "name", null),
    getValue(assessment, "assessment_name", null),
    getValue(assessment, "description", null)
  ], "Assessment");
  return cleanText(value, "Assessment");
}

// ======================================================
// SUPABASE QUERY HELPERS
// ======================================================

async function selectRows(supabase, tableName, configureQuery, selectText) {
  try {
    let query = supabase.from(tableName).select(selectText || "*");
    if (typeof configureQuery === "function") query = configureQuery(query);
    const result = await query;
    if (result.error) return { data: [], error: result.error.message };
    return { data: Array.isArray(result.data) ? result.data : [], error: null };
  } catch (error) {
    return { data: [], error: error && error.message ? error.message : "Query failed" };
  }
}

async function selectSingle(supabase, tableName, configureQuery, selectText) {
  const rows = await selectRows(supabase, tableName, (query) => {
    if (typeof configureQuery === "function") query = configureQuery(query);
    return query.limit(1);
  }, selectText || "*");
  if (rows.data.length > 0) return rows.data[0];
  return null;
}

async function fetchCandidate(supabase, userId) {
  let candidate = await selectSingle(supabase, "candidate_profiles", (query) => query.eq("id", userId));
  if (candidate) return candidate;
  candidate = await selectSingle(supabase, "candidate_profiles", (query) => query.eq("user_id", userId));
  if (candidate) return candidate;
  return { id: userId, full_name: "Candidate" };
}

async function fetchAssessment(supabase, assessmentId) {
  if (!assessmentId) return null;
  const assessment = await selectSingle(supabase, "assessments", (query) => query.eq("id", assessmentId));
  if (assessment) return assessment;
  return null;
}

async function fetchResponses(supabase, userId, assessmentId) {
  const selectText = "*, unique_questions(*), unique_answers(*)";
  
  if (assessmentId) {
    const resultWithAssessment = await selectRows(supabase, "responses", (query) => {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId);
    }, selectText);
    if (resultWithAssessment.data.length > 0) {
      return { responses: resultWithAssessment.data, source: "responses.user_id_and_assessment_id_with_joins" };
    }
  }

  const resultUserOnly = await selectRows(supabase, "responses", (query) => {
    return query.eq("user_id", userId);
  }, selectText);
  if (resultUserOnly.data.length > 0) {
    return { responses: resultUserOnly.data, source: "responses.user_id_fallback_with_joins" };
  }

  return { responses: [], source: "none" };
}

// ======================================================
// REPORT BUILDING (Fallback for when stored data is missing)
// ======================================================

function buildBehavioralInsights(responses) {
  let totalTime = 0;
  let totalChanges = 0;
  const count = safeArray(responses).length;
  let averageTime = 0;
  let averageChanges = 0;
  let note = "";
  let quality = "Limited";

  safeArray(responses).forEach((response) => {
    totalTime += getResponseTime(response);
    totalChanges += getResponseChanges(response);
  });

  if (count > 0) {
    averageTime = roundNumber(totalTime / count, 2);
    averageChanges = roundNumber(totalChanges / count, 2);
  }

  if (totalTime > 0) quality = "Available";

  if (totalTime === 0) {
    note = "Response timing data is not available or was recorded as zero, so timing should not be used to judge confidence or speed.";
  } else {
    if (averageTime > 75) note += "Average response time suggests careful processing or possible uncertainty. ";
    if (averageChanges > 1.5) note += "Frequent answer changes suggest possible second-guessing or low confidence. ";
    if (!note) note = "Response behavior does not show major timing or answer-change concerns.";
  }

  return {
    totalTimeSpent: roundNumber(totalTime, 2),
    total_time_spent: roundNumber(totalTime, 2),
    totalChanges: roundNumber(totalChanges, 2),
    total_changes: roundNumber(totalChanges, 2),
    averageTimePerQuestion: averageTime,
    average_time_per_question: averageTime,
    averageChangesPerQuestion: averageChanges,
    average_changes_per_question: averageChanges,
    dataQuality: quality,
    data_quality: quality,
    note: note
  };
}

function buildCategoryScores(responses) {
  const grouped = {};

  safeArray(responses).forEach((response) => {
    const category = getResponseCategory(response);
    const subcategory = getResponseSubcategory(response);
    const score = getResponseScore(response);
    const maxScore = getResponseMaxScore(response);
    const timeSpent = getResponseTime(response);
    const changes = getResponseChanges(response);

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        name: category,
        totalScore: 0,
        maxScore: 0,
        questionCount: 0,
        totalTimeSpent: 0,
        totalChanges: 0,
        subcategories: {},
        answers: []
      };
    }

    grouped[category].totalScore += score;
    grouped[category].maxScore += maxScore;
    grouped[category].questionCount += 1;
    grouped[category].totalTimeSpent += timeSpent;
    grouped[category].totalChanges += changes;

    if (subcategory) {
      if (!grouped[category].subcategories[subcategory]) grouped[category].subcategories[subcategory] = 0;
      grouped[category].subcategories[subcategory] += 1;
    }

    grouped[category].answers.push({
      section: category,
      subsection: subcategory,
      question: getResponseQuestionText(response),
      answer: getResponseAnswerText(response),
      score: score,
      maxScore: maxScore,
      max_score: maxScore,
      timeSpent: timeSpent,
      time_spent: timeSpent,
      changes: changes
    });
  });

  return Object.keys(grouped).map((key) => {
    const item = grouped[key];
    const percentage = item.maxScore > 0 ? roundNumber((item.totalScore / item.maxScore) * 100, 2) : 0;

    return {
      name: item.category,
      category: item.category,
      score: item.totalScore,
      maxScore: item.maxScore,
      percentage: percentage,
      classification: classifyScore(percentage),
      narrative: getCategoryNarrative(item.category, percentage),
      action: getCategoryAction(item.category, percentage),
      followUpQuestion: getCategoryFollowUpQuestion(item.category, percentage),
      questionCount: item.questionCount,
      answers: item.answers
    };
  });
}

function buildRecommendations(categoryScores) {
  const recommendations = [];
  const developmentAreas = safeArray(categoryScores)
    .filter((item) => toNumber(item.percentage, 0) < 65)
    .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0));

  const strengths = safeArray(categoryScores)
    .filter((item) => toNumber(item.percentage, 0) >= 75)
    .sort((a, b) => toNumber(b.percentage, 0) - toNumber(a.percentage, 0));

  developmentAreas.forEach((area) => {
    recommendations.push({
      priority: getPriorityFromScore(area.percentage),
      competency: area.name,
      currentScore: area.percentage,
      recommendation: area.narrative,
      action: area.action,
      isStrength: false
    });
  });

  strengths.forEach((area) => {
    recommendations.push({
      priority: "Leverage",
      competency: area.name,
      currentScore: area.percentage,
      recommendation: area.narrative,
      action: area.action,
      isStrength: true
    });
  });

  return recommendations;
}

function buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores) {
  const lowestAreas = safeArray(categoryScores)
    .filter((item) => toNumber(item.percentage, 0) < 65)
    .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0))
    .slice(0, 3);

  const topAreas = safeArray(categoryScores)
    .filter((item) => toNumber(item.percentage, 0) >= 75)
    .sort((a, b) => toNumber(b.percentage, 0) - toNumber(a.percentage, 0))
    .slice(0, 3);

  let strengthText = "";
  let areaText = "";

  if (topAreas.length > 0) {
    strengthText = " Key strengths include " + topAreas.map((item) => item.name + " (" + item.percentage + "%)").join(", ") + ".";
  }
  if (lowestAreas.length > 0) {
    areaText = " The most important development areas are " + lowestAreas.map((item) => item.name + " (" + item.percentage + "%)").join(", ") + ".";
  }

  return cleanText(candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText, "");
}

function buildRoleReadiness(percentage, categoryScores) {
  const weakAreas = safeArray(categoryScores).filter((item) => toNumber(item.percentage, 0) < 65);
  const value = toNumber(percentage, 0);

  if (value >= 85 && weakAreas.length === 0) {
    return "The candidate appears highly ready for role responsibilities with normal supervision. The supervisor can consider stretch assignments, broader accountability, and opportunities to leverage demonstrated strengths.";
  }
  if (value >= 75 && weakAreas.length === 0) {
    return "The candidate appears broadly ready for role responsibilities with normal supervision and role-specific reinforcement.";
  }
  if (value >= 65) {
    return "The candidate may be considered for controlled role responsibilities with coaching, periodic review, and targeted reinforcement in weaker areas.";
  }
  if (value >= 55) {
    return "The candidate should not be relied upon independently yet. Structured development, supervised practice, and progress review are recommended before broader responsibility.";
  }
  return "The candidate is not yet ready for independent critical responsibilities. Close supervision, targeted development, and validation through practical scenarios are recommended before role-critical assignment.";
}

function buildFollowUpQuestions(categoryScores) {
  let selected = safeArray(categoryScores)
    .filter((item) => toNumber(item.percentage, 0) < 75)
    .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0));

  if (selected.length === 0) {
    selected = safeArray(categoryScores)
      .filter((item) => toNumber(item.percentage, 0) >= 75)
      .sort((a, b) => toNumber(b.percentage, 0) - toNumber(a.percentage, 0))
      .slice(0, 3);
  }

  return selected.map((item) => ({
    category: item.name,
    priority: getPriorityFromScore(item.percentage),
    score: item.percentage,
    question: getCategoryFollowUpQuestion(item.name, item.percentage)
  }));
}

function buildReportFromResponses(candidate, assessment, responses, userId, assessmentId, source) {
  let totalScore = 0;
  let maxScore = 0;
  let percentage = 0;
  let classification;
  let categoryScores;
  let strengths;
  let developmentAreas;
  let recommendations;
  let behavioralInsights;
  let candidateName;
  let assessmentName;
  let executiveSummary;
  let roleReadiness;
  let followUpQuestions;

  safeArray(responses).forEach((response) => {
    totalScore += getResponseScore(response);
    maxScore += getResponseMaxScore(response);
  });

  if (maxScore > 0) percentage = roundNumber((totalScore / maxScore) * 100, 2);
  classification = classifyScore(percentage);
  categoryScores = buildCategoryScores(responses);
  behavioralInsights = buildBehavioralInsights(responses);

  strengths = categoryScores
    .filter((item) => toNumber(item.percentage, 0) >= 75)
    .sort((a, b) => toNumber(b.percentage, 0) - toNumber(a.percentage, 0));

  developmentAreas = categoryScores
    .filter((item) => toNumber(item.percentage, 0) < 65)
    .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0));

  recommendations = buildRecommendations(categoryScores);
  candidateName = getCandidateName(candidate, userId);
  assessmentName = getAssessmentName(assessment);
  executiveSummary = buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores);
  roleReadiness = buildRoleReadiness(percentage, categoryScores);
  followUpQuestions = buildFollowUpQuestions(categoryScores);

  return {
    candidateName: candidateName,
    candidate_name: candidateName,
    assessmentName: assessmentName,
    assessment_name: assessmentName,
    userId: userId,
    user_id: userId,
    assessmentId: assessmentId || null,
    assessment_id: assessmentId || null,
    totalScore: roundNumber(totalScore, 2),
    total_score: roundNumber(totalScore, 2),
    maxScore: roundNumber(maxScore, 2),
    max_score: roundNumber(maxScore, 2),
    percentage: percentage,
    overallPercentage: percentage,
    overall_score: percentage,
    overallScore: percentage,
    totalPercentage: percentage,
    score: percentage,
    classification: classification,
    overallClassification: classification,
    performanceBand: classification,
    performance_band: classification,
    riskLevel: getRiskLevel(percentage),
    risk_level: getRiskLevel(percentage),
    summary: executiveSummary,
    executiveSummary: executiveSummary,
    executive_summary: executiveSummary,
    overallAssessment: executiveSummary,
    overall_assessment: executiveSummary,
    interpretation: executiveSummary,
    supervisorImplication: getSupervisorImplication(percentage),
    supervisor_implication: getSupervisorImplication(percentage),
    recommendationSummary: getSupervisorImplication(percentage),
    recommendation_summary: getSupervisorImplication(percentage),
    roleReadiness: roleReadiness,
    role_readiness: roleReadiness,
    readinessStatement: roleReadiness,
    readiness_statement: roleReadiness,
    behavioralInsights: behavioralInsights,
    behavioral_insights: behavioralInsights,
    behavioralSummary: behavioralInsights,
    behavioral_summary: behavioralInsights,
    categoryScores: categoryScores,
    category_scores: categoryScores,
    competencyScores: categoryScores,
    competency_scores: categoryScores,
    strengths: strengths,
    topStrengths: strengths,
    top_strengths: strengths,
    developmentAreas: developmentAreas,
    development_areas: developmentAreas,
    topDevelopmentNeeds: developmentAreas,
    top_development_needs: developmentAreas,
    recommendations: recommendations,
    actionPlan: recommendations,
    action_plan: recommendations,
    followUpQuestions: followUpQuestions,
    follow_up_questions: followUpQuestions,
    supervisorQuestions: followUpQuestions,
    supervisor_questions: followUpQuestions,
    responseCount: safeArray(responses).length,
    response_count: safeArray(responses).length,
    totalResponses: safeArray(responses).length,
    total_responses: safeArray(responses).length,
    dataSource: source,
    data_source: source
  };
}

// ======================================================
// MAIN API HANDLER
// ======================================================

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const userId = req.query.user_id || req.query.userId;
  const assessmentId = req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: "Supabase environment variables are missing."
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // ===== STEP 1: Get the requesting user from authorization header =====
    const authHeader = req.headers.authorization || "";
    let requestingUserId = null;
    let requestingUserRole = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        requestingUserId = user.id;
        // Get user role from metadata or supervisor_profiles
        const { data: supervisorProfile } = await supabase
          .from("supervisor_profiles")
          .select("role")
          .eq("id", requestingUserId)
          .maybeSingle();
        requestingUserRole = supervisorProfile?.role || user.user_metadata?.role || null;
      }
    }

    // ===== STEP 2: Get stored assessment result =====
    let resultQuery = supabase
      .from("assessment_results")
      .select("*, assessments(*)")
      .eq("user_id", userId);

    if (assessmentId) {
      resultQuery = resultQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultQuery.order("completed_at", { ascending: false });

    if (resultsError) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch assessment results: " + resultsError.message
      });
    }

    // ===== STEP 3: Get candidate profile =====
    const { data: candidateData, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (candidateError) {
      console.error("Candidate fetch error:", candidateError);
    }

    const candidate = candidateData || { id: userId, full_name: "Candidate" };

    // ===== STEP 4: PERMISSION CHECK =====
    // Check if requesting user has permission to view this report
    let hasPermission = false;

    if (requestingUserId) {
      // Admin has full access
      if (requestingUserRole === "admin") {
        hasPermission = true;
      }
      // Direct supervisor of the candidate
      else if (candidate.supervisor_id === requestingUserId) {
        hasPermission = true;
      }
      // Shared access
      else if (results && results.length > 0) {
        const { data: sharedAccess } = await supabase
          .from("shared_report_access")
          .select("*")
          .eq("candidate_id", userId)
          .eq("assessment_id", results[0].assessment_id)
          .eq("granted_to", requestingUserId)
          .maybeSingle();

        const hasValidSharedAccess = sharedAccess && (!sharedAccess.expires_at || new Date(sharedAccess.expires_at) > new Date());
        if (hasValidSharedAccess) {
          hasPermission = true;
        }
      }
    }

    // If no permission and not using service role, return 403
    if (!hasPermission && !authHeader.includes("service_role")) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to view this report",
        requires_share: true,
        candidate_name: candidate.full_name || "Candidate"
      });
    }

    // ===== STEP 5: Build report from stored data or fallback to responses =====
    if (results && results.length > 0) {
      const storedResult = results[0];
      const assessment = storedResult.assessments || null;
      const percentage = toNumber(storedResult.percentage_score, 0);
      const classification = classifyScore(percentage);
      const candidateName = candidate.full_name || candidate.email || "Candidate";
      const assessmentName = assessment?.title || "Assessment";

      // Use stored category scores if available, otherwise build from responses
      let categoryScores = [];
      let strengthsList = [];
      let developmentAreasList = [];

      if (storedResult.category_scores && Array.isArray(storedResult.category_scores) && storedResult.category_scores.length > 0) {
        categoryScores = storedResult.category_scores.map(cat => ({
          ...cat,
          percentage: toNumber(cat.percentage, 0),
          narrative: cat.narrative || getCategoryNarrative(cat.name, toNumber(cat.percentage, 0)),
          action: cat.action || getCategoryAction(cat.name, toNumber(cat.percentage, 0)),
          followUpQuestion: cat.followUpQuestion || getCategoryFollowUpQuestion(cat.name, toNumber(cat.percentage, 0))
        }));
        
        strengthsList = storedResult.strengths || categoryScores.filter(c => toNumber(c.percentage, 0) >= 85).map(c => c.name);
        developmentAreasList = storedResult.weaknesses || categoryScores.filter(c => toNumber(c.percentage, 0) < 75).map(c => c.name);
      } else {
        // Fallback: fetch responses and calculate category scores
        const responseResult = await fetchResponses(supabase, userId, assessmentId);
        const responses = responseResult.responses;
        
        if (responses.length > 0) {
          const calculatedScores = buildCategoryScores(responses);
          categoryScores = calculatedScores;
          strengthsList = calculatedScores.filter(c => toNumber(c.percentage, 0) >= 85).map(c => c.name);
          developmentAreasList = calculatedScores.filter(c => toNumber(c.percentage, 0) < 75).map(c => c.name);
        }
      }

      const recommendations = buildRecommendations(categoryScores);
      const followUpQuestions = buildFollowUpQuestions(categoryScores);
      
      const lowestAreas = categoryScores.filter(c => toNumber(c.percentage, 0) < 65).slice(0, 3);
      const topAreas = categoryScores.filter(c => toNumber(c.percentage, 0) >= 85).slice(0, 3);
      
      let strengthText = "";
      let areaText = "";
      if (topAreas.length > 0) {
        strengthText = " Key strengths include " + topAreas.map(a => a.name + " (" + a.percentage + "%)").join(", ") + ".";
      }
      if (lowestAreas.length > 0) {
        areaText = " The most important development areas are " + lowestAreas.map(a => a.name + " (" + a.percentage + "%)").join(", ") + ".";
      }
      
      const executiveSummary = candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText;
      const roleReadiness = buildRoleReadiness(percentage, categoryScores);
      
      const behavioralInsights = {
        answeredQuestions: storedResult.answered_questions || 0,
        totalQuestions: storedResult.total_questions || 0,
        violationCount: storedResult.violation_count || 0,
        violation_details: storedResult.violation_details || {},
        note: "Response behavior data is available from the assessment session."
      };

      const generatedReport = {
        candidateName,
        assessmentName,
        userId,
        assessmentId: assessmentId || assessment?.id,
        totalScore: storedResult.total_score || 0,
        maxScore: storedResult.max_score || 100,
        percentage,
        overallPercentage: percentage,
        overallScore: percentage,
        score: percentage,
        classification,
        overallClassification: classification,
        riskLevel: getRiskLevel(percentage),
        summary: executiveSummary,
        executiveSummary,
        overallAssessment: executiveSummary,
        supervisorImplication: getSupervisorImplication(percentage),
        roleReadiness,
        readinessStatement: roleReadiness,
        behavioralInsights,
        behavioral_summary: behavioralInsights,
        categoryScores,
        competencyScores: categoryScores,
        strengths: strengthsList,
        topStrengths: strengthsList,
        developmentAreas: developmentAreasList,
        topDevelopmentNeeds: developmentAreasList,
        recommendations,
        actionPlan: recommendations,
        followUpQuestions,
        supervisorQuestions: followUpQuestions,
        responseCount: storedResult.answered_questions || 0,
        dataSource: "assessment_results"
      };

      return res.status(200).json({
        success: true,
        candidate: decodeObjectDeep(candidate),
        assessment: decodeObjectDeep(assessment),
        generatedReport: decodeObjectDeep(generatedReport),
        result: decodeObjectDeep(storedResult),
        responseCount: storedResult.answered_questions || 0,
        dataSource: "assessment_results"
      });
    }

    // ===== STEP 6: Fallback to calculating from responses =====
    const assessment = await fetchAssessment(supabase, assessmentId);
    const responseResult = await fetchResponses(supabase, userId, assessmentId);
    const responses = responseResult.responses;

    if (!responses || responses.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No responses found for this candidate and assessment.",
        user_id: userId,
        assessment_id: assessmentId || null,
        dataSource: responseResult.source
      });
    }

    const generatedReport = buildReportFromResponses(candidate, assessment, responses, userId, assessmentId, responseResult.source);

    candidate && decodeObjectDeep(candidate);
    assessment && decodeObjectDeep(assessment);
    decodeObjectDeep(generatedReport);

    return res.status(200).json({
      success: true,
      candidate: candidate,
      assessment: assessment,
      generatedReport: generatedReport,
      generated_report: generatedReport,
      report: generatedReport,
      responseCount: responses.length,
      response_count: responses.length,
      dataSource: responseResult.source,
      data_source: responseResult.source
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return res.status(500).json({
      success: false,
      error: error && error.message ? error.message : "Failed to generate supervisor report."
    });
  }
}
