// pages/api/generate-pdf-report.js

import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

// ======================================================
// HELPERS
// ======================================================

function toNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallbackValue;
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
  if (objectData[key] !== undefined && objectData[key] !== null && objectData[key] !== "") return objectData[key];
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

function escapeHtml(value) {
  var text = cleanText(value, "");
  text = String(text);
  text = text.replace(/&/g, "&amp;");
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  text = text.replace(/"/g, "&quot;");
  text = text.replace(/'/g, "&#039;");
  return text;
}

function getSupabaseClient() {
  var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

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
  if (value >= 85) return "The candidate shows strong readiness and can be considered for role responsibilities with normal supervision, stretch assignments, and opportunities to leverage demonstrated strengths.";
  if (value >= 75) return "The candidate can perform reliably with standard supervision while benefiting from targeted reinforcement and role-specific feedback.";
  if (value >= 65) return "The candidate can perform with guidance, coaching, and periodic review in selected areas.";
  if (value >= 55) return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

function getDomainContext(category) {
  var value = cleanText(category, "General");
  if (value === "Clinical") return "clinical interpretation, behavioral judgement, and response planning";
  if (value === "Leadership") return "ownership, direction setting, accountability, and leadership follow-through";
  if (value === "Decision-Making" || value === "Decision-Making & Problem-Solving") return "structured judgement, problem analysis, option evaluation, and decision quality";
  if (value === "Communication Style" || value === "Communication & Influence") return "clarity, listening, influence, tone, and feedback response";
  if (value === "Adaptability" || value === "Change Leadership & Agility") return "flexibility, change response, uncertainty management, and adjustment to new demands";
  if (value === "Collaboration") return "team contribution, shared accountability, cooperation, and alignment with others";
  if (value === "FBA") return "behavioral antecedents, consequences, triggers, function, and response planning";
  if (value === "Role Readiness") return "readiness for role responsibilities, practical judgement, and supervised application";
  if (value === "Execution & Results Orientation") return "execution discipline, results focus, follow-through, and delivery ownership";
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
  var cleanCategory = cleanText(category, "General");
  var value = toNumber(percentage, 0);
  var context = getDomainContext(cleanCategory);
  var band = getScoreBandName(value);

  if (value >= 85) return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". This area can be leveraged in role responsibilities, stretch assignments, mentoring opportunities, and higher-complexity work.";
  if (value >= 75) return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". The candidate appears reliable in this area and should be encouraged to apply this capability consistently.";
  if (value >= 65) return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". The area is broadly adequate, but the supervisor should monitor consistency and reinforce application in real work situations.";
  if (value >= 55) return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". Structured coaching, guided practice, and periodic review are recommended.";
  if (value >= 40) return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". Targeted development, close supervision, practical exercises, and validation through observed application are recommended.";
  return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". Close support and validation through structured practice are recommended before assigning critical responsibilities.";
}

function getCategoryAction(category, percentage) {
  var cleanCategory = cleanText(category, "General");
  var value = toNumber(percentage, 0);
  var priority = getPriorityFromScore(value);

  if (value >= 85) return "Leverage this strength through stretch assignments, peer support, mentoring opportunities, and role tasks where " + cleanCategory + " can improve team or operational performance. Priority: " + priority + ".";
  if (value >= 75) return "Maintain this capability through normal supervision, role-specific feedback, and opportunities to apply " + cleanCategory + " in practical work situations. Priority: " + priority + ".";
  if (value >= 65) return "Reinforce this area through periodic review, targeted feedback, and practical application to improve consistency. Priority: " + priority + ".";
  if (value >= 55) return "Provide structured coaching, guided practice, and review progress after applied tasks before increasing independence. Priority: " + priority + ".";
  if (value >= 40) return "Create a targeted development plan with close supervision, practical scenarios, feedback cycles, and documented progress review. Priority: " + priority + ".";
  return "Apply immediate development support, close supervision, simplified assignments, and formal progress validation before assigning critical responsibilities. Priority: " + priority + ".";
}

function getFollowUpQuestion(category, percentage) {
  var cleanCategory = cleanText(category, "General");
  var value = toNumber(percentage, 0);

  if (value >= 75) return "Ask the candidate to describe how this strength can be applied to improve performance, support others, or handle a more complex responsibility in the role.";
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
// RESPONSE EXTRACTION
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
  return cleanText(firstValue([
    getValue(question, "section", null),
    getValue(response, "section", null),
    getValue(question, "category", null),
    getValue(response, "category", null),
    getValue(question, "competency", null),
    getValue(response, "competency", null),
    getValue(question, "dimension", null),
    getValue(response, "dimension", null)
  ], "General"), "General");
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
// DATA FETCHING
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
  candidate = await selectSingle(supabase, "candidate_profiles", function (query) { return query.eq("id", userId); });
  if (candidate) return candidate;
  candidate = await selectSingle(supabase, "candidate_profiles", function (query) { return query.eq("user_id", userId); });
  if (candidate) return candidate;
  candidate = await selectSingle(supabase, "profiles", function (query) { return query.eq("id", userId); });
  if (candidate) return candidate;
  candidate = await selectSingle(supabase, "profiles", function (query) { return query.eq("user_id", userId); });
  if (candidate) return candidate;
  return { id: userId, name: "Candidate" };
}

async function fetchAssessment(supabase, assessmentId) {
  var assessment;
  assessment = await selectSingle(supabase, "assessments", function (query) { return query.eq("id", assessmentId); }, "*, assessment_type:assessment_types(*)");
  if (assessment) return assessment;
  return { id: assessmentId, title: "Assessment" };
}

async function fetchResponses(supabase, userId, assessmentId, sessionId) {
  var selectText = "*, unique_questions(*), unique_answers(*)";
  var result;

  if (sessionId) {
    result = await selectRows(supabase, "responses", function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId).eq("session_id", sessionId);
    }, selectText);
    if (result.data.length > 0) return { responses: result.data, source: "responses.user_assessment_session" };
  }

  result = await selectRows(supabase, "responses", function (query) {
    return query.eq("user_id", userId).eq("assessment_id", assessmentId);
  }, selectText);

  if (result.data.length > 0) return { responses: result.data, source: "responses.user_assessment_with_joins" };

  result = await selectRows(supabase, "responses", function (query) {
    return query.eq("user_id", userId).eq("assessment_id", assessmentId);
  }, "*");

  return { responses: result.data, source: "responses.user_assessment_plain" };
}

function getCandidateName(candidate, userId) {
  var value = firstValue([
    getValue(candidate, "full_name", null),
    getValue(candidate, "name", null),
    getValue(candidate, "display_name", null),
    getValue(candidate, "candidate_name", null),
    getValue(candidate, "email", null)
  ], userId || "Candidate");
  return cleanText(value, "Candidate");
}

function getAssessmentName(assessment) {
  var value = firstValue([
    getValue(assessment, "title", null),
    getValue(assessment, "name", null),
    getValue(assessment, "assessment_name", null),
    getValue(assessment, "description", null)
  ], "Assessment");
  return cleanText(value, "Assessment");
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

  if (totalTime === 0) note = "Response timing data is not available or was recorded as zero, so timing should not be used to judge confidence or speed.";
  else {
    if (averageTime > 75) note += "Average response time suggests careful processing or possible uncertainty. ";
    if (averageChanges > 1.5) note += "Frequent answer changes suggest possible second-guessing or low confidence. ";
    if (!note) note = "Response behavior does not show major timing or answer-change concerns.";
  }

  return {
    totalTimeSpent: roundNumber(totalTime, 2),
    totalChanges: roundNumber(totalChanges, 2),
    averageTimePerQuestion: averageTime,
    averageChangesPerQuestion: averageChanges,
    dataQuality: quality,
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
      timeSpent: timeSpent,
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
      maxScore: roundNumber(item.maxScore, 2),
      questionCount: item.questionCount,
      percentage: percentage,
      classification: classifyScore(percentage),
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      narrative: getCategoryNarrative(item.category, percentage),
      action: getCategoryAction(item.category, percentage),
      riskLevel: getRiskLevel(percentage),
      priority: getPriorityFromScore(percentage),
      followUpQuestion: getFollowUpQuestion(item.category, percentage),
      averageTimePerQuestion: item.questionCount > 0 ? roundNumber(item.totalTimeSpent / item.questionCount, 2) : 0,
      averageChangesPerQuestion: item.questionCount > 0 ? roundNumber(item.totalChanges / item.questionCount, 2) : 0,
      subcategories: item.subcategories,
      answers: item.answers
    };
  });
}

function buildRecommendations(categoryScores) {
  var recommendations = [];
  var developmentAreas;
  var strengths;

  developmentAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });

  developmentAreas.forEach(function (area) {
    var percentage = toNumber(area.percentage, 0);
    recommendations.push({
      priority: getPriorityFromScore(percentage),
      competency: area.name,
      category: area.name,
      currentScore: percentage,
      gap: percentage < 80 ? roundNumber(80 - percentage, 2) : 0,
      recommendation: area.narrative,
      action: area.action,
      impact: "Improving this area will increase role readiness, judgement reliability, consistency, and confidence in work-related decisions.",
      followUpQuestion: getFollowUpQuestion(area.name, percentage),
      isStrength: false
    });
  });

  strengths = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) >= 75; }).sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); });

  strengths.forEach(function (area) {
    recommendations.push({
      priority: "Leverage",
      competency: area.name,
      category: area.name,
      currentScore: area.percentage,
      gap: 0,
      recommendation: area.narrative,
      action: area.action,
      impact: "Using this strength can improve candidate contribution, team support, role readiness, and development momentum.",
      followUpQuestion: getFollowUpQuestion(area.name, area.percentage),
      isStrength: true
    });
  });

  return recommendations;
}

function buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores) {
  var lowestAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); }).slice(0, 3);
  var topAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) >= 75; }).sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); }).slice(0, 3);
  var strengthText = "";
  var areaText = "";

  if (topAreas.length > 0) strengthText = " Key strengths include " + topAreas.map(function (item) { return item.name + " (" + item.percentage + "%)"; }).join(", ") + ".";
  if (lowestAreas.length > 0) areaText = " The most important development areas are " + lowestAreas.map(function (item) { return item.name + " (" + item.percentage + "%)"; }).join(", ") + ".";

  return candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText;
}

function buildRoleReadiness(percentage, categoryScores) {
  var weakAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; });
  var value = toNumber(percentage, 0);

  if (value >= 85 && weakAreas.length === 0) return "The candidate appears highly ready for role responsibilities with normal supervision. The supervisor can consider stretch assignments, broader accountability, and opportunities to leverage demonstrated strengths.";
  if (value >= 75 && weakAreas.length === 0) return "The candidate appears broadly ready for role responsibilities with normal supervision and role-specific reinforcement.";
  if (value >= 65) return "The candidate may be considered for controlled role responsibilities with coaching, periodic review, and targeted reinforcement in weaker areas.";
  if (value >= 55) return "The candidate should not be relied upon independently yet. Structured development, supervised practice, and progress review are recommended before broader responsibility.";
  return "The candidate is not yet ready for independent critical responsibilities. Close supervision, targeted development, and validation through practical scenarios are recommended before role-critical assignment.";
}

function buildFollowUpQuestions(categoryScores) {
  var selected = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 75; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });
  if (selected.length === 0) selected = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) >= 75; }).sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); }).slice(0, 3);
  return selected.map(function (item) {
    return { category: item.name, priority: getPriorityFromScore(item.percentage), score: item.percentage, question: getFollowUpQuestion(item.name, item.percentage) };
  });
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
  strengths = categoryScores.filter(function (item) { return toNumber(item.percentage, 0) >= 75; }).sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); });
  developmentAreas = categoryScores.filter(function (item) { return toNumber(item.percentage, 0) < 65; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });
  recommendations = buildRecommendations(categoryScores);
  candidateName = getCandidateName(candidate, userId);
  assessmentName = getAssessmentName(assessment);
  executiveSummary = buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores);
  roleReadiness = buildRoleReadiness(percentage, categoryScores);
  followUpQuestions = buildFollowUpQuestions(categoryScores);

  return {
    candidateName: candidateName,
    assessmentName: assessmentName,
    assessmentId: assessmentId || null,
    userId: userId,
    totalScore: roundNumber(totalScore, 2),
    maxScore: roundNumber(maxScore, 2),
    percentage: percentage,
    classification: classification,
    riskLevel: getRiskLevel(percentage),
    executiveSummary: executiveSummary,
    supervisorImplication: getSupervisorImplication(percentage),
    roleReadiness: roleReadiness,
    behavioralInsights: behavioralInsights,
    categoryScores: categoryScores,
    strengths: strengths,
    developmentAreas: developmentAreas,
    recommendations: recommendations,
    followUpQuestions: followUpQuestions,
    responseCount: safeArray(responses).length,
    dataSource: source
  };
}

// ======================================================
// HTML TEMPLATE
// ======================================================

function rowHtml(label, value) {
  return '<div class="info-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

function sectionTitle(title) {
  return '<h2>' + escapeHtml(title) + '</h2>';
}

function buildCategoryRows(items) {
  var rows = safeArray(items).map(function (item) {
    return '<tr><td><strong>' + escapeHtml(item.name || item.category) + '</strong><br><small>' + escapeHtml(item.questionCount || 0) + ' question(s)</small></td><td><strong>' + escapeHtml(item.percentage) + '%</strong></td><td>' + escapeHtml(item.classification) + '</td><td>' + escapeHtml(item.riskLevel) + '</td><td>' + escapeHtml(item.narrative) + '<br><small><strong>Action:</strong> ' + escapeHtml(item.action) + '</small></td></tr>';
  }).join('');

  return rows || '<tr><td colspan="5">No category scores available.</td></tr>';
}

function buildListCards(items, type) {
  var list = safeArray(items).map(function (item) {
    var scoreValue = item.percentage !== undefined ? item.percentage : item.currentScore;
    var scoreText = scoreValue !== undefined && scoreValue !== null && scoreValue !== '' ? scoreValue + '%' : cleanText(item.priority, '');
    return '<div class="card-list-item"><div><strong>' + escapeHtml(item.name || item.category || item.competency) + '</strong><p>' + escapeHtml(item.narrative || item.recommendation || '') + '</p></div><span class="score-pill ' + escapeHtml(type) + '">' + escapeHtml(scoreText) + '</span></div>';
  }).join('');

  return list || '<p>No items available.</p>';
}

function buildQuestionCards(items) {
  var cards = safeArray(items).map(function (item) {
    return '<div class="question-card"><div><strong>' + escapeHtml(item.category) + '</strong><span>' + escapeHtml(item.priority) + '</span></div><p>' + escapeHtml(item.question) + '</p></div>';
  }).join('');

  return cards || '<p>No follow-up questions available.</p>';
}

function buildRecommendationCards(items) {
  var cards = safeArray(items).map(function (item) {
    return '<div class="recommendation-card"><div class="rec-header"><h3>' + escapeHtml(item.category || item.competency) + '</h3><span>' + escapeHtml(item.priority) + '</span></div><p>' + escapeHtml(item.recommendation) + '</p><p><strong>Action:</strong> ' + escapeHtml(item.action) + '</p><p><strong>Impact:</strong> ' + escapeHtml(item.impact) + '</p><p><strong>Follow-up:</strong> ' + escapeHtml(item.followUpQuestion || '') + '</p></div>';
  }).join('');

  return cards || '<p>No recommendations available.</p>';
}

function generateHTMLTemplate(report) {
  var generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var behavioralNote = report.behavioralInsights && report.behavioralInsights.note ? report.behavioralInsights.note : 'No behavioral insight is available.';
  var styles = '<style>body{font-family:Arial,sans-serif;color:#172033;margin:0;background:#fff}.page{padding:28px}.header{display:flex;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:18px;margin-bottom:20px}.eyebrow{font-size:12px;text-transform:uppercase;color:#667085;font-weight:bold;letter-spacing:.04em}.title{font-size:30px;font-weight:800;margin:4px 0;color:#101828}.subtitle{color:#667085;font-size:13px;margin:4px 0}.scorebox{background:#f0fdfa;border:1px solid #99f6e4;border-radius:14px;padding:18px;min-width:190px;text-align:center}.score{font-size:40px;font-weight:900;color:#0f766e}.classification{font-weight:700;color:#344054}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{border:1px solid #eaecf0;border-radius:14px;padding:16px;margin-bottom:14px;background:#fff}.highlight{border-color:#fed7aa;background:#fffaf5}h2{font-size:18px;margin:0 0 10px;color:#101828}p{font-size:13px;line-height:1.55;margin:0 0 8px}.info-row{display:flex;justify-content:space-between;font-size:12px;border-bottom:1px solid #eaecf0;padding:6px 0}.info-row span{color:#667085}.badge{display:inline-block;border-radius:999px;padding:4px 10px;background:#eef4ff;color:#3538cd;font-size:11px;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f9fafb;color:#475467;text-align:left;padding:8px;border-bottom:1px solid #eaecf0}td{vertical-align:top;padding:8px;border-bottom:1px solid #eaecf0}small{color:#667085}.card-list-item{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #eaecf0;padding:10px 0}.score-pill{white-space:nowrap;font-weight:bold}.warning{color:#c2410c}.success{color:#0f766e}.question-card,.recommendation-card{border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-bottom:10px;background:#f9fafb}.question-card div,.rec-header{display:flex;justify-content:space-between;gap:10px}.question-card span,.rec-header span{font-size:11px;font-weight:bold;color:#c2410c}.rec-header h3{font-size:15px;margin:0;color:#101828}.footer{margin-top:22px;border-top:1px solid #eaecf0;padding-top:10px;font-size:10px;color:#667085}.page-break{page-break-before:always}@media print{.card,.question-card,.recommendation-card{break-inside:avoid}}</style>';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supervisor Assessment Report</title>' + styles + '</head><body><div class="page"><div class="header"><div><div class="eyebrow">Supervisor Assessment Report</div><div class="title">' + escapeHtml(report.candidateName) + '</div><div class="subtitle">Assessment: ' + escapeHtml(report.assessmentName) + '</div><div class="subtitle">Generated: ' + escapeHtml(generatedAt) + '</div></div><div class="scorebox"><div class="score">' + escapeHtml(report.percentage) + '%</div><div class="classification">' + escapeHtml(report.classification) + '</div><div class="subtitle">Risk Level: ' + escapeHtml(report.riskLevel) + '</div><div class="subtitle">Responses: ' + escapeHtml(report.responseCount) + '</div></div></div><div class="grid"><div class="card">' + sectionTitle('Candidate Information') + rowHtml('Candidate ID', report.userId) + rowHtml('Assessment ID', report.assessmentId || 'Not available') + rowHtml('Total Score', report.totalScore + ' / ' + report.maxScore) + rowHtml('Data Source', report.dataSource || 'Not available') + '</div><div class="card">' + sectionTitle('Supervisor Implication') + '<p>' + escapeHtml(report.supervisorImplication) + '</p></div></div><div class="card">' + sectionTitle('Executive Summary') + '<p>' + escapeHtml(report.executiveSummary) + '</p></div><div class="card highlight">' + sectionTitle('Role Readiness') + '<p>' + escapeHtml(report.roleReadiness) + '</p></div><div class="card">' + sectionTitle('Behavioral Insights') + '<p>' + escapeHtml(behavioralNote) + '</p></div><div class="card page-break">' + sectionTitle('Category / Competency Scores') + '<table><thead><tr><th>Area</th><th>Score</th><th>Classification</th><th>Risk</th><th>Narrative Meaning</th></tr></thead><tbody>' + buildCategoryRows(report.categoryScores) + '</tbody></table></div><div class="grid"><div class="card">' + sectionTitle('Top Strengths') + buildListCards(report.strengths, 'success') + '</div><div class="card">' + sectionTitle('Development Areas') + buildListCards(report.developmentAreas, 'warning') + '</div></div><div class="card page-break">' + sectionTitle('Supervisor Follow-up Questions') + buildQuestionCards(report.followUpQuestions) + '</div><div class="card">' + sectionTitle('Recommendations') + buildRecommendationCards(report.recommendations) + '</div><div class="footer">CONFIDENTIAL - For internal use only | Stratavax Supervisor Assessment Report</div></div></body></html>';
}

// ======================================================
// PDF GENERATION
// ======================================================

async function launchBrowser() {
  var executablePath;
  var isServerless = process.env.VERCEL_ENV || process.env.AWS_REGION || process.env.NODE_ENV === 'production';

  if (isServerless) {
    executablePath = await chromium.executablePath();
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });
  }

  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

function getFileName(name) {
  var safeName = cleanText(name, 'Candidate').replace(/[^a-zA-Z0-9_-]+/g, '_');
  if (!safeName) safeName = 'Candidate';
  return safeName + '_supervisor_report.pdf';
}

// ======================================================
// API HANDLER
// ======================================================

export default async function handler(req, res) {
  var userId;
  var assessmentId;
  var sessionId;
  var serviceClient;
  var candidate;
  var assessment;
  var responseResult;
  var responses;
  var report;
  var html;
  var browser = null;
  var page;
  var pdfBuffer;
  var fileName;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    userId = req.body.userId || req.body.user_id;
    assessmentId = req.body.assessmentId || req.body.assessment_id || req.body.assessment;
    sessionId = req.body.sessionId || req.body.session_id || null;

    if (!userId || !assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userId and assessmentId are required.' });
    }

    serviceClient = getSupabaseClient();
    candidate = await fetchCandidate(serviceClient, userId);
    assessment = await fetchAssessment(serviceClient, assessmentId);
    responseResult = await fetchResponses(serviceClient, userId, assessmentId, sessionId);
    responses = responseResult.responses;

    if (!responses || responses.length === 0) {
      return res.status(404).json({ success: false, error: 'No responses found for this candidate and assessment.' });
    }

    report = buildReport(candidate, assessment, responses, userId, assessmentId, responseResult.source);
    html = generateHTMLTemplate(report);

    browser = await launchBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '36px', left: '20px' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:8px;text-align:center;width:100%;color:#667085;font-family:Arial,sans-serif;"><span>Stratavax - Confidential</span> | <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
    });

    if (browser) {
      await browser.close();
      browser = null;
    }

    try {
      await serviceClient.from('assessment_reports').insert([{
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId || null,
        report_data: report,
        generated_at: new Date().toISOString()
      }]);
    } catch (saveError) {
      console.error('Failed to save report metadata:', saveError);
    }

    fileName = getFileName(report.candidateName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Failed to close browser:', closeError);
      }
    }

    console.error('PDF generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
}
