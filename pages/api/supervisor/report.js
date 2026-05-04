// pages/api/supervisor/report.js

import { createClient } from "@supabase/supabase-js";

/*
  SUPERVISOR REPORT API - FINAL REPORT INTELLIGENCE

  Replace this file:
  pages/api/supervisor/report.js

  Purpose:
  - Generate supervisor-ready reports directly from candidate responses.
  - Treat high scores as strengths/leverage areas, not development gaps.
  - Provide score-sensitive executive summaries, role readiness, follow-up questions,
    recommendations, category narratives, and behavioral insights.
  - Decode HTML entities so values such as &amp; display as &.
*/

// ======================================================
// BASIC HELPERS
// ======================================================

function toNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);

  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) {
    return fallbackValue;
  }

  return numberValue;
}

function roundNumber(value, decimals) {
  var decimalPlaces = decimals === undefined ? 2 : decimals;
  var factor = Math.pow(10, decimalPlaces);
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
  var objectData = asObject(objectValue);

  if (!objectData) return fallback;

  if (objectData[key] !== undefined && objectData[key] !== null && objectData[key] !== "") {
    return objectData[key];
  }

  return fallback;
}

function firstValue(values, fallback) {
  var i;

  if (!Array.isArray(values)) return fallback;

  for (i = 0; i < values.length; i += 1) {
    if (values[i] !== undefined && values[i] !== null && values[i] !== "") return values[i];
  }

  return fallback;
}

function decodeHtmlEntities(value) {
  var text;
  var previousText;
  var i;

  if (value === null || value === undefined) return value;

  text = String(value);

  for (i = 0; i < 10; i += 1) {
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

function cleanText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "";
  return decodeHtmlEntities(value);
}

function decodeObjectDeep(value) {
  var output;
  var keys;
  var i;

  if (typeof value === "string") return decodeHtmlEntities(value);

  if (Array.isArray(value)) {
    return value.map(function (item) {
      return decodeObjectDeep(item);
    });
  }

  if (value && typeof value === "object") {
    output = {};
    keys = Object.keys(value);

    for (i = 0; i < keys.length; i += 1) {
      output[keys[i]] = decodeObjectDeep(value[keys[i]]);
    }

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
  var value = toNumber(percentage, 0);

  if (value >= 85) return "Exceptional";
  if (value >= 75) return "Strong Performer";
  if (value >= 65) return "Capable Contributor";
  if (value >= 55) return "Developing";
  if (value >= 40) return "At Risk";

  return "High Risk";
}

function getRiskLevel(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 75) return "Low";
  if (value >= 65) return "Moderate";
  if (value >= 55) return "Elevated";
  if (value >= 40) return "High";

  return "Critical";
}

function getPriorityFromScore(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 75) return "Leverage";
  if (value >= 65) return "Low";
  if (value >= 55) return "Medium";
  if (value >= 40) return "High";

  return "Critical";
}

function getScoreComment(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 85) return "Exceptional performance with strong evidence of readiness.";
  if (value >= 75) return "Strong performance with reliable capability.";
  if (value >= 65) return "Adequate performance with some areas requiring reinforcement.";
  if (value >= 55) return "Developing performance requiring structured support.";
  if (value >= 40) return "Priority development is required.";

  return "Critical development support is required.";
}

function getSupervisorImplication(percentage) {
  var value = toNumber(percentage, 0);

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
  var value = normalizeCategoryName(category);

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

  return "this competency area and its practical application in role responsibilities";
}

function getScoreBandName(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 85) return "clear strength";
  if (value >= 75) return "strong capability";
  if (value >= 65) return "capable performance";
  if (value >= 55) return "developing capability";
  if (value >= 40) return "priority development area";

  return "critical development area";
}

function getCategoryNarrative(category, percentage) {
  var value = toNumber(percentage, 0);
  var cleanCategory = normalizeCategoryName(category);
  var context = getCategoryDomainContext(cleanCategory);
  var band = getScoreBandName(value);

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
  var value = toNumber(percentage, 0);
  var cleanCategory = normalizeCategoryName(category);
  var priority = getPriorityFromScore(value);

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
  var value = toNumber(percentage, 0);
  var cleanCategory = normalizeCategoryName(category);

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

  return "Ask the candidate to provide a practical example that demonstrates capability in " + cleanCategory + ", including what was done, why it was done, and what outcome resulted.";
}

// ======================================================
// RESPONSE HELPERS
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
  var answer;
  if (!response) return 0;
  answer = getAnswer(response);

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
  var question;
  if (!response) return 5;
  question = getQuestion(response);

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
  var question;
  if (!response) return "General";
  question = getQuestion(response);

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
  var question;
  if (!response) return "";
  question = getQuestion(response);

  return cleanText(firstValue([
    getValue(question, "subsection", null),
    getValue(response, "subsection", null),
    getValue(question, "sub_category", null),
    getValue(response, "sub_category", null)
  ], ""), "");
}

function getResponseQuestionText(response) {
  var question;
  if (!response) return "";
  question = getQuestion(response);

  return cleanText(firstValue([
    getValue(question, "question_text", null),
    getValue(question, "text", null),
    getValue(response, "question_text", null),
    getValue(response, "question", null)
  ], ""), "");
}

function getResponseAnswerText(response) {
  var answer;
  if (!response) return "";
  answer = getAnswer(response);

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
  var value;

  if (!candidate) return "Candidate";

  value = firstValue([
    getValue(candidate, "full_name", null),
    getValue(candidate, "name", null),
    getValue(candidate, "display_name", null),
    getValue(candidate, "candidate_name", null),
    getValue(candidate, "email", null)
  ], userId || "Candidate");

  return cleanText(value, "Candidate");
}

function getAssessmentName(assessment) {
  var value;

  if (!assessment) return "Assessment";

  value = firstValue([
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
  var query;
  var result;

  try {
    query = supabase.from(tableName).select(selectText || "*");
    if (typeof configureQuery === "function") query = configureQuery(query);
    result = await query;

    if (result.error) return { data: [], error: result.error.message };
    return { data: Array.isArray(result.data) ? result.data : [], error: null };
  } catch (error) {
    return { data: [], error: error && error.message ? error.message : "Query failed" };
  }
}

async function selectSingle(supabase, tableName, configureQuery, selectText) {
  var rows;

  rows = await selectRows(supabase, tableName, function (query) {
    if (typeof configureQuery === "function") query = configureQuery(query);
    return query.limit(1);
  }, selectText || "*");

  if (rows.data.length > 0) return rows.data[0];
  return null;
}

async function fetchCandidate(supabase, userId) {
  var candidate;

  candidate = await selectSingle(supabase, "profiles", function (query) { return query.eq("id", userId); });
  if (candidate) return candidate;

  candidate = await selectSingle(supabase, "profiles", function (query) { return query.eq("user_id", userId); });
  if (candidate) return candidate;

  candidate = await selectSingle(supabase, "user_profiles", function (query) { return query.eq("id", userId); });
  if (candidate) return candidate;

  candidate = await selectSingle(supabase, "candidate_profiles", function (query) { return query.eq("user_id", userId); });
  if (candidate) return candidate;

  candidate = await selectSingle(supabase, "candidate_profiles", function (query) { return query.eq("id", userId); });
  if (candidate) return candidate;

  return { id: userId, name: "Candidate" };
}

async function fetchAssessment(supabase, assessmentId) {
  var assessment;

  if (!assessmentId) return null;

  assessment = await selectSingle(supabase, "assessments", function (query) { return query.eq("id", assessmentId); });
  if (assessment) return assessment;

  assessment = await selectSingle(supabase, "candidate_assessments", function (query) { return query.eq("id", assessmentId); });
  if (assessment) return assessment;

  return null;
}

async function fetchResponses(supabase, userId, assessmentId) {
  var selectText = "*, unique_questions(*), unique_answers(*)";
  var resultWithAssessment;
  var resultPlainAssessment;
  var resultUserOnly;

  if (assessmentId) {
    resultWithAssessment = await selectRows(supabase, "responses", function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId);
    }, selectText);

    if (resultWithAssessment.data.length > 0) {
      return { responses: resultWithAssessment.data, source: "responses.user_id_and_assessment_id_with_joins" };
    }

    resultPlainAssessment = await selectRows(supabase, "responses", function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId);
    }, "*");

    if (resultPlainAssessment.data.length > 0) {
      return { responses: resultPlainAssessment.data, source: "responses.user_id_and_assessment_id_plain" };
    }
  }

  resultUserOnly = await selectRows(supabase, "responses", function (query) {
    return query.eq("user_id", userId);
  }, selectText);

  if (resultUserOnly.data.length > 0) {
    return { responses: resultUserOnly.data, source: "responses.user_id_fallback_with_joins" };
  }

  resultUserOnly = await selectRows(supabase, "responses", function (query) {
    return query.eq("user_id", userId);
  }, "*");

  return { responses: resultUserOnly.data, source: "responses.user_id_fallback_plain" };
}

// ======================================================
// REPORT BUILDING
// ======================================================

function buildBehavioralInsights(responses) {
  var totalTime = 0;
  var totalChanges = 0;
  var count = safeArray(responses).length;
  var averageTime = 0;
  var averageChanges = 0;
  var note = "";
  var quality = "Limited";

  safeArray(responses).forEach(function (response) {
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
  var grouped = {};

  safeArray(responses).forEach(function (response) {
    var category = getResponseCategory(response);
    var subcategory = getResponseSubcategory(response);
    var score = getResponseScore(response);
    var maxScore = getResponseMaxScore(response);
    var timeSpent = getResponseTime(response);
    var changes = getResponseChanges(response);

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

  return Object.keys(grouped).map(function (key) {
    var item = grouped[key];
    var percentage = item.maxScore > 0 ? roundNumber((item.totalScore / item.maxScore) * 100, 2) : 0;

    return {
      category: item.category,
      name: item.name,
      totalScore: roundNumber(item.totalScore, 2),
      total_score: roundNumber(item.totalScore, 2),
      maxScore: roundNumber(item.maxScore, 2),
      max_score: roundNumber(item.maxScore, 2),
      questionCount: item.questionCount,
      question_count: item.questionCount,
      percentage: percentage,
      score: percentage,
      classification: classifyScore(percentage),
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      supervisor_implication: getSupervisorImplication(percentage),
      narrative: getCategoryNarrative(item.category, percentage),
      action: getCategoryAction(item.category, percentage),
      riskLevel: getRiskLevel(percentage),
      risk_level: getRiskLevel(percentage),
      priority: getPriorityFromScore(percentage),
      followUpQuestion: getCategoryFollowUpQuestion(item.category, percentage),
      follow_up_question: getCategoryFollowUpQuestion(item.category, percentage),
      averageTimePerQuestion: item.questionCount > 0 ? roundNumber(item.totalTimeSpent / item.questionCount, 2) : 0,
      average_time_per_question: item.questionCount > 0 ? roundNumber(item.totalTimeSpent / item.questionCount, 2) : 0,
      averageChangesPerQuestion: item.questionCount > 0 ? roundNumber(item.totalChanges / item.questionCount, 2) : 0,
      average_changes_per_question: item.questionCount > 0 ? roundNumber(item.totalChanges / item.questionCount, 2) : 0,
      subcategories: item.subcategories,
      answers: item.answers
    };
  });
}

function buildRecommendations(categoryScores) {
  var recommendations = [];
  var developmentAreas;
  var strengths;

  developmentAreas = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) < 65; })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });

  developmentAreas.forEach(function (area) {
    var percentage = toNumber(area.percentage, 0);

    recommendations.push({
      priority: getPriorityFromScore(percentage),
      competency: area.name,
      category: area.name,
      currentScore: percentage,
      current_score: percentage,
      gap: percentage < 80 ? roundNumber(80 - percentage, 2) : 0,
      recommendation: area.narrative,
      action: area.action,
      impact: "Improving this area will increase role readiness, judgement reliability, consistency, and confidence in work-related decisions.",
      behavioralInsights: {
        averageTimePerQuestion: area.averageTimePerQuestion,
        averageChangesPerQuestion: area.averageChangesPerQuestion
      },
      behavioral_insights: {
        average_time_per_question: area.averageTimePerQuestion,
        average_changes_per_question: area.averageChangesPerQuestion
      },
      followUpQuestion: getCategoryFollowUpQuestion(area.name, percentage),
      follow_up_question: getCategoryFollowUpQuestion(area.name, percentage),
      isStrength: false,
      is_strength: false
    });
  });

  strengths = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) >= 75; })
    .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); });

  strengths.forEach(function (area) {
    recommendations.push({
      priority: "Leverage",
      competency: area.name,
      category: area.name,
      currentScore: area.percentage,
      current_score: area.percentage,
      gap: 0,
      recommendation: area.narrative,
      action: area.action,
      impact: "Using this strength can improve candidate contribution, team support, role readiness, and development momentum.",
      followUpQuestion: getCategoryFollowUpQuestion(area.name, area.percentage),
      follow_up_question: getCategoryFollowUpQuestion(area.name, area.percentage),
      isStrength: true,
      is_strength: true
    });
  });

  return recommendations;
}

function buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores) {
  var lowestAreas;
  var topAreas;
  var areaText = "";
  var strengthText = "";

  lowestAreas = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) < 65; })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); })
    .slice(0, 3);

  topAreas = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) >= 75; })
    .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); })
    .slice(0, 3);

  if (topAreas.length > 0) {
    strengthText = " Key strengths include " + topAreas.map(function (item) {
      return item.name + " (" + item.percentage + "%)";
    }).join(", ") + ".";
  }

  if (lowestAreas.length > 0) {
    areaText = " The most important development areas are " + lowestAreas.map(function (item) {
      return item.name + " (" + item.percentage + "%)";
    }).join(", ") + ".";
  }

  return cleanText(candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText, "");
}

function buildRoleReadiness(percentage, categoryScores) {
  var weakAreas;
  var value = toNumber(percentage, 0);

  weakAreas = safeArray(categoryScores).filter(function (item) {
    return toNumber(item.percentage, 0) < 65;
  });

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
  var questions = [];
  var selected;

  selected = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) < 75; })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });

  if (selected.length === 0) {
    selected = safeArray(categoryScores)
      .filter(function (item) { return toNumber(item.percentage, 0) >= 75; })
      .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); })
      .slice(0, 3);
  }

  selected.forEach(function (item) {
    questions.push({
      category: item.name,
      competency: item.name,
      priority: getPriorityFromScore(item.percentage),
      score: item.percentage,
      question: getCategoryFollowUpQuestion(item.name, item.percentage)
    });
  });

  return questions;
}

function buildReport(candidate, assessment, responses, userId, assessmentId, source) {
  var totalScore = 0;
  var maxScore = 0;
  var percentage = 0;
  var classification;
  var categoryScores;
  var strengths;
  var developmentAreas;
  var recommendations;
  var behavioralInsights;
  var candidateName;
  var assessmentName;
  var executiveSummary;
  var roleReadiness;
  var followUpQuestions;

  safeArray(responses).forEach(function (response) {
    totalScore += getResponseScore(response);
    maxScore += getResponseMaxScore(response);
  });

  if (maxScore > 0) percentage = roundNumber((totalScore / maxScore) * 100, 2);

  classification = classifyScore(percentage);
  categoryScores = buildCategoryScores(responses);
  behavioralInsights = buildBehavioralInsights(responses);

  strengths = categoryScores
    .filter(function (item) { return toNumber(item.percentage, 0) >= 75; })
    .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); });

  developmentAreas = categoryScores
    .filter(function (item) { return toNumber(item.percentage, 0) < 65; })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });

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
// API HANDLER
// ======================================================

export default async function handler(req, res) {
  var userId;
  var assessmentId;
  var supabaseUrl;
  var supabaseKey;
  var supabase;
  var candidate;
  var assessment;
  var responseResult;
  var responses;
  var generatedReport;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  userId = req.query.user_id || req.query.userId;
  assessmentId = req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    });
  }

  supabase = createClient(supabaseUrl, supabaseKey);

  try {
    candidate = await fetchCandidate(supabase, userId);
    assessment = await fetchAssessment(supabase, assessmentId);
    responseResult = await fetchResponses(supabase, userId, assessmentId);
    responses = responseResult.responses;

    if (!responses || responses.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No responses found for this candidate and assessment.",
        user_id: userId,
        assessment_id: assessmentId || null,
        dataSource: responseResult.source,
        data_source: responseResult.source
      });
    }

    generatedReport = buildReport(candidate, assessment, responses, userId, assessmentId, responseResult.source);

    candidate = decodeObjectDeep(candidate);
    assessment = decodeObjectDeep(assessment);
    generatedReport = decodeObjectDeep(generatedReport);

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
    return res.status(500).json({
      success: false,
      error: error && error.message ? error.message : "Failed to generate supervisor report."
    });
  }
}
