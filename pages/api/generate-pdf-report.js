// pages/api/generate-pdf-report.js

import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

function toNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);
  if (isNaN(numberValue) || !isFinite(numberValue)) return fallbackValue;
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
    text = text.replace(new RegExp("&" + "amp;", "g"), "&");
    text = text.replace(new RegExp("&" + "lt;", "g"), "<");
    text = text.replace(new RegExp("&" + "gt;", "g"), ">");
    text = text.replace(new RegExp("&" + "quot;", "g"), '"');
    text = text.replace(new RegExp("&" + "#039;", "g"), "'");
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
  text = text.replace(/&/g, "&" + "amp;");
  text = text.replace(/</g, "&" + "lt;");
  text = text.replace(/>/g, "&" + "gt;");
  text = text.replace(/"/g, "&" + "quot;");
  text = text.replace(/'/g, "&" + "#039;");
  return text;
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
  if (value >= 75) return "The candidate can perform reliably with standard supervision while still benefiting from role-specific reinforcement.";
  if (value >= 65) return "The candidate can perform with guidance, coaching, and periodic review in this area.";
  if (value >= 55) return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

function getPriorityFromScore(percentage) {
  var value = toNumber(percentage, 0);
  if (value < 40) return "Critical";
  if (value < 55) return "High";
  if (value < 65) return "Medium";
  return "Low";
}

function getCategoryNarrative(category, percentage) {
  var value = toNumber(percentage, 0);
  if (category === "Clinical") return "Clinical performance scored " + value + "%. This suggests difficulty consistently interpreting behavioral, psychological, or stress-related indicators. The supervisor should validate judgement in sensitive situations and use structured case discussions before assigning high-impact responsibilities.";
  if (category === "Leadership") return "Leadership performance scored " + value + "%. This suggests challenges with ownership, direction-setting, accountability, or confident response in leadership situations. Development should focus on practical leadership scenarios, decision ownership, and follow-through.";
  if (category === "Decision-Making") return "Decision-Making performance scored " + value + "%. This reflects developing judgement under complexity, ambiguity, competing priorities, or pressure. The supervisor should provide decision frameworks, guided review, and feedback after real or simulated decisions.";
  if (category === "Communication Style") return "Communication Style performance scored " + value + "%. This indicates inconsistent interpersonal communication, especially around feedback handling, emotional awareness, meeting behavior, and written clarity. Coaching should focus on clarity, listening, tone, and response discipline.";
  if (category === "Adaptability") return "Adaptability performance scored " + value + "%. This suggests difficulty adjusting to change, uncertainty, or unexpected plan changes. Development should include exposure to varied scenarios, reflection after change events, and coaching on flexible response patterns.";
  if (category === "Collaboration") return "Collaboration performance scored " + value + "%. This indicates challenges working effectively with others, aligning with team expectations, or contributing consistently in group situations. The supervisor should reinforce teamwork habits and shared accountability.";
  if (category === "FBA") return "FBA performance scored " + value + "%. This indicates gaps in understanding behavioral antecedents, consequences, triggers, and functional patterns. Practical case-based coaching is recommended to improve interpretation of behavior and appropriate response planning.";
  return category + " performance scored " + value + "%. This area requires development support, supervisor review, and practical reinforcement.";
}

function getCategoryAction(category, percentage) {
  var priority = getPriorityFromScore(percentage);
  if (category === "Clinical") return "Use case-based reviews, guided interpretation exercises, and supervisor validation before the candidate handles sensitive clinical or behavioral judgement tasks independently. Priority: " + priority + ".";
  if (category === "Leadership") return "Assign small leadership tasks with clear expectations, require reflection after completion, and review accountability, initiative, and decision ownership. Priority: " + priority + ".";
  if (category === "Decision-Making") return "Introduce a structured decision-making framework, review options before action, and discuss outcomes after decisions are made. Priority: " + priority + ".";
  if (category === "Communication Style") return "Provide coaching on feedback response, meeting participation, emotional awareness, email clarity, and active listening. Priority: " + priority + ".";
  if (category === "Adaptability") return "Expose the candidate to controlled change scenarios and coach the candidate on flexible planning, calm response, and adjustment after unexpected changes. Priority: " + priority + ".";
  if (category === "Collaboration") return "Assign team-based tasks with clear roles and review how the candidate communicates, supports others, and follows shared commitments. Priority: " + priority + ".";
  if (category === "FBA") return "Use practical behavior scenarios to teach antecedents, consequences, reinforcement patterns, and response planning. Priority: " + priority + ".";
  return "Create a targeted development plan for " + category + " and review progress after applied practice. Priority: " + priority + ".";
}

function getCategoryFollowUpQuestion(category) {
  if (category === "Clinical") return "Ask the candidate to explain how the candidate would interpret and respond to a sensitive behavioral scenario, including what evidence would be checked before acting.";
  if (category === "Leadership") return "Ask the candidate to describe a situation where the candidate had to take ownership, guide others, and follow through despite uncertainty.";
  if (category === "Decision-Making") return "Ask the candidate to walk through a recent difficult decision, including options considered, risks identified, and how the final choice was made.";
  if (category === "Communication Style") return "Ask the candidate to give an example of receiving difficult feedback and explain how the candidate responded and adjusted communication.";
  if (category === "Adaptability") return "Ask the candidate to describe how the candidate handles sudden changes in plans, priorities, or instructions.";
  if (category === "Collaboration") return "Ask the candidate to explain how the candidate works with team members when there are different opinions, unclear roles, or shared deadlines.";
  if (category === "FBA") return "Ask the candidate to analyze a behavior scenario by identifying antecedents, consequences, likely function, and appropriate response options.";
  return "Ask the candidate to provide a practical example that demonstrates capability in " + category + ".";
}

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
  return toNumber(firstValue([getValue(response, "score", null), getValue(response, "selected_score", null), getValue(response, "answer_score", null), getValue(response, "value", null), getValue(response, "points", null), getValue(answer, "score", null), getValue(answer, "value", null), getValue(answer, "points", null)], 0), 0);
}

function getResponseMaxScore(response) {
  var question;
  if (!response) return 5;
  question = getQuestion(response);
  return toNumber(firstValue([getValue(response, "max_score", null), getValue(response, "maxScore", null), getValue(response, "max_points", null), getValue(response, "max", null), getValue(question, "max_score", null), getValue(question, "maxScore", null), 5], 5), 5);
}

function getResponseCategory(response) {
  var question;
  if (!response) return "General";
  question = getQuestion(response);
  return cleanText(firstValue([getValue(question, "section", null), getValue(response, "section", null), getValue(question, "category", null), getValue(response, "category", null), getValue(question, "competency", null), getValue(response, "competency", null), getValue(question, "dimension", null), getValue(response, "dimension", null)], "General"), "General");
}

function getResponseSubcategory(response) {
  var question;
  if (!response) return "";
  question = getQuestion(response);
  return cleanText(firstValue([getValue(question, "subsection", null), getValue(response, "subsection", null), getValue(question, "sub_category", null), getValue(response, "sub_category", null)], ""), "");
}

function getResponseQuestionText(response) {
  var question;
  if (!response) return "";
  question = getQuestion(response);
  return cleanText(firstValue([getValue(question, "question_text", null), getValue(question, "text", null), getValue(response, "question_text", null), getValue(response, "question", null)], ""), "");
}

function getResponseAnswerText(response) {
  var answer;
  if (!response) return "";
  answer = getAnswer(response);
  return cleanText(firstValue([getValue(answer, "answer_text", null), getValue(answer, "text", null), getValue(answer, "label", null), getValue(response, "answer_text", null), getValue(response, "selected_answer_text", null)], ""), "");
}

function getResponseTime(response) {
  if (!response) return 0;
  return toNumber(firstValue([getValue(response, "time_spent_seconds", null), getValue(response, "time_spent", null), getValue(response, "duration_seconds", null), getValue(response, "response_time_seconds", null)], 0), 0);
}

function getResponseChanges(response) {
  if (!response) return 0;
  return toNumber(firstValue([getValue(response, "times_changed", null), getValue(response, "changes", null), getValue(response, "answer_changes", null), getValue(response, "revision_count", null)], 0), 0);
}

function getCandidateName(candidate, userId) {
  var value;
  if (!candidate) return "Candidate";
  value = firstValue([getValue(candidate, "full_name", null), getValue(candidate, "name", null), getValue(candidate, "display_name", null), getValue(candidate, "candidate_name", null), getValue(candidate, "email", null)], userId || "Candidate");
  return cleanText(value, "Candidate");
}

function getAssessmentName(assessment) {
  var value;
  if (!assessment) return "Assessment";
  value = firstValue([getValue(assessment, "title", null), getValue(assessment, "name", null), getValue(assessment, "assessment_name", null), getValue(assessment, "description", null)], "Assessment");
  return cleanText(value, "Assessment");
}

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
  var query;
  var result;
  try {
    query = supabase.from(tableName).select(selectText || "*");
    if (typeof configureQuery === "function") query = configureQuery(query);
    query = query.limit(1);
    result = await query;
    if (result.error) return null;
    if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
    return null;
  } catch (error) {
    return null;
  }
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

async function fetchResponses(supabase, userId, assessmentId, sessionId) {
  var selectText;
  var result;
  selectText = "*, unique_questions(*), unique_answers(*)";
  result = await selectRows(supabase, "responses", function (query) {
    query = query.eq("user_id", userId).eq("assessment_id", assessmentId);
    if (sessionId) query = query.eq("session_id", sessionId);
    return query;
  }, selectText);
  return { responses: result.data, source: "responses.user_id_and_assessment_id_with_joins" };
}

function buildBehavioralInsights(responses) {
  var totalTime = 0;
  var totalChanges = 0;
  var count = safeArray(responses).length;
  var averageTime = 0;
  var averageChanges = 0;
  var note = "";
  var quality = "Limited";
  safeArray(responses).forEach(function (response) { totalTime += getResponseTime(response); totalChanges += getResponseChanges(response); });
  if (count > 0) { averageTime = roundNumber(totalTime / count, 2); averageChanges = roundNumber(totalChanges / count, 2); }
  if (totalTime > 0) quality = "Available";
  if (totalTime === 0) note = "Response timing data is not available or was recorded as zero, so timing should not be used to judge confidence or speed.";
  else {
    if (averageTime > 75) note += "Average response time suggests careful processing or possible uncertainty. ";
    if (averageChanges > 1.5) note += "Frequent answer changes suggest possible second-guessing or low confidence. ";
    if (!note) note = "Response behavior does not show major timing or answer-change concerns.";
  }
  return { totalTimeSpent: roundNumber(totalTime, 2), totalChanges: roundNumber(totalChanges, 2), averageTimePerQuestion: averageTime, averageChangesPerQuestion: averageChanges, dataQuality: quality, note: note };
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
    if (!grouped[category]) grouped[category] = { category: category, name: category, totalScore: 0, maxScore: 0, questionCount: 0, totalTimeSpent: 0, totalChanges: 0, subcategories: {}, answers: [] };
    grouped[category].totalScore += score;
    grouped[category].maxScore += maxScore;
    grouped[category].questionCount += 1;
    grouped[category].totalTimeSpent += timeSpent;
    grouped[category].totalChanges += changes;
    if (subcategory) {
      if (!grouped[category].subcategories[subcategory]) grouped[category].subcategories[subcategory] = 0;
      grouped[category].subcategories[subcategory] += 1;
    }
    grouped[category].answers.push({ section: category, subsection: subcategory, question: getResponseQuestionText(response), answer: getResponseAnswerText(response), score: score, maxScore: maxScore, timeSpent: timeSpent, changes: changes });
  });
  return Object.keys(grouped).map(function (key) {
    var item = grouped[key];
    var percentage = item.maxScore > 0 ? roundNumber((item.totalScore / item.maxScore) * 100, 2) : 0;
    return { category: item.category, name: item.name, totalScore: roundNumber(item.totalScore, 2), maxScore: roundNumber(item.maxScore, 2), questionCount: item.questionCount, percentage: percentage, classification: classifyScore(percentage), comment: getScoreComment(percentage), supervisorImplication: getSupervisorImplication(percentage), narrative: getCategoryNarrative(item.category, percentage), action: getCategoryAction(item.category, percentage), riskLevel: getRiskLevel(percentage), averageTimePerQuestion: item.questionCount > 0 ? roundNumber(item.totalTimeSpent / item.questionCount, 2) : 0, averageChangesPerQuestion: item.questionCount > 0 ? roundNumber(item.totalChanges / item.questionCount, 2) : 0, subcategories: item.subcategories, answers: item.answers };
  });
}

function buildRecommendations(categoryScores) {
  var recommendations = [];
  var developmentAreas;
  developmentAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });
  developmentAreas.forEach(function (area) {
    var percentage = toNumber(area.percentage, 0);
    recommendations.push({ priority: getPriorityFromScore(percentage), competency: area.name, category: area.name, currentScore: percentage, gap: percentage < 80 ? roundNumber(80 - percentage, 2) : 0, recommendation: area.narrative, action: area.action, impact: "Improving this area will increase role readiness, judgement reliability, consistency, and confidence in work-related decisions.", behavioralInsights: { averageTimePerQuestion: area.averageTimePerQuestion, averageChangesPerQuestion: area.averageChangesPerQuestion }, followUpQuestion: getCategoryFollowUpQuestion(area.name) });
  });
  return recommendations;
}

function buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores) {
  var lowestAreas;
  var areaText = "";
  lowestAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); }).slice(0, 3);
  if (lowestAreas.length > 0) areaText = " The most important development areas are " + lowestAreas.map(function (item) { return item.name + " (" + item.percentage + "%)"; }).join(", ") + ".";
  return cleanText(candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + areaText, "");
}

function buildRoleReadiness(percentage, categoryScores) {
  var weakAreas;
  var value = toNumber(percentage, 0);
  weakAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; });
  if (value >= 75 && weakAreas.length === 0) return "The candidate appears broadly ready for role responsibilities with normal supervision and role-specific reinforcement.";
  if (value >= 65) return "The candidate may be considered for controlled role responsibilities with coaching, periodic review, and targeted reinforcement in weaker areas.";
  if (value >= 55) return "The candidate should not be relied upon independently yet. Structured development, supervised practice, and progress review are recommended before broader responsibility.";
  return "The candidate is not yet ready for independent critical responsibilities. Close supervision, targeted development, and validation through practical scenarios are recommended before role-critical assignment.";
}

function buildFollowUpQuestions(categoryScores) {
  var questions = [];
  safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65; }).sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); }).forEach(function (item) { questions.push({ category: item.name, priority: getPriorityFromScore(item.percentage), question: getCategoryFollowUpQuestion(item.name) }); });
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
  safeArray(responses).forEach(function (response) { totalScore += getResponseScore(response); maxScore += getResponseMaxScore(response); });
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
  return { candidateName: candidateName, assessmentName: assessmentName, assessmentId: assessmentId || null, userId: userId, totalScore: roundNumber(totalScore, 2), maxScore: roundNumber(maxScore, 2), percentage: percentage, classification: classification, riskLevel: getRiskLevel(percentage), executiveSummary: executiveSummary, supervisorImplication: getSupervisorImplication(percentage), roleReadiness: roleReadiness, behavioralInsights: behavioralInsights, categoryScores: categoryScores, strengths: strengths, developmentAreas: developmentAreas, recommendations: recommendations, followUpQuestions: followUpQuestions, responseCount: safeArray(responses).length, dataSource: source };
}

function rowHtml(label, value) {
  return "<div class=\"info-row\"><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
}

function sectionTitle(title) {
  return "<h2>" + escapeHtml(title) + "</h2>";
}

function buildCategoryRows(items) {
  return safeArray(items).map(function (item) {
    return "<tr><td><strong>" + escapeHtml(item.name || item.category) + "</strong><br><small>" + escapeHtml(item.questionCount || 0) + " question(s)</small></td><td>" + escapeHtml(item.percentage) + "%</td><td>" + escapeHtml(item.classification) + "</td><td>" + escapeHtml(item.riskLevel) + "</td><td>" + escapeHtml(item.narrative) + "<br><small><strong>Action:</strong> " + escapeHtml(item.action) + "</small></td></tr>";
  }).join("");
}

function buildListCards(items, type) {
  return safeArray(items).map(function (item) {
    return "<div class=\"card-list-item\"><div><strong>" + escapeHtml(item.name || item.category || item.competency) + "</strong><p>" + escapeHtml(item.narrative || item.recommendation || item.question || "") + "</p></div><span class=\"score-pill " + escapeHtml(type) + "\">" + escapeHtml(item.percentage || item.currentScore || item.priority || "") + (item.percentage || item.currentScore ? "%" : "") + "</span></div>";
  }).join("");
}

function buildQuestionCards(items) {
  return safeArray(items).map(function (item) {
    return "<div class=\"question-card\"><div><strong>" + escapeHtml(item.category) + "</strong><span>" + escapeHtml(item.priority) + "</span></div><p>" + escapeHtml(item.question) + "</p></div>";
  }).join("");
}

function buildRecommendationCards(items) {
  return safeArray(items).map(function (item) {
    return "<div class=\"recommendation-card\"><div class=\"rec-header\"><h3>" + escapeHtml(item.category || item.competency) + "</h3><span>" + escapeHtml(item.priority) + "</span></div><p>" + escapeHtml(item.recommendation) + "</p><p><strong>Action:</strong> " + escapeHtml(item.action) + "</p><p><strong>Impact:</strong> " + escapeHtml(item.impact) + "</p><p><strong>Follow-up:</strong> " + escapeHtml(item.followUpQuestion || "") + "</p></div>";
  }).join("");
}

function generateHTMLTemplate(report) {
  var generatedAt = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  var behavioralNote = report.behavioralInsights && report.behavioralInsights.note ? report.behavioralInsights.note : "No behavioral insight is available.";
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Supervisor Assessment Report</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:0;background:#fff}.page{padding:28px}.header{display:flex;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:18px;margin-bottom:20px}.eyebrow{font-size:12px;text-transform:uppercase;color:#667085;font-weight:bold;letter-spacing:.04em}.title{font-size:30px;font-weight:800;margin:4px 0;color:#101828}.subtitle{color:#667085;font-size:13px;margin:4px 0}.scorebox{background:#f0fdfa;border:1px solid #99f6e4;border-radius:14px;padding:18px;min-width:190px;text-align:center}.score{font-size:40px;font-weight:900;color:#0f766e}.classification{font-weight:700;color:#344054}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{border:1px solid #eaecf0;border-radius:14px;padding:16px;margin-bottom:14px;background:#fff}.highlight{border-color:#fed7aa;background:#fffaf5}h2{font-size:18px;margin:0 0 10px;color:#101828}p{font-size:13px;line-height:1.55;margin:0 0 8px}.info-row{display:flex;justify-content:space-between;font-size:12px;border-bottom:1px solid #eaecf0;padding:6px 0}.info-row span{color:#667085}.badge{display:inline-block;border-radius:999px;padding:4px 10px;background:#eef4ff;color:#3538cd;font-size:11px;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f9fafb;color:#475467;text-align:left;padding:8px;border-bottom:1px solid #eaecf0}td{vertical-align:top;padding:8px;border-bottom:1px solid #eaecf0}small{color:#667085}.card-list-item{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #eaecf0;padding:10px 0}.score-pill{white-space:nowrap;font-weight:bold}.warning{color:#c2410c}.success{color:#0f766e}.question-card,.recommendation-card{border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-bottom:10px;background:#f9fafb}.question-card div,.rec-header{display:flex;justify-content:space-between;gap:10px}.question-card span,.rec-header span{font-size:11px;font-weight:bold;color:#c2410c}.rec-header h3{font-size:15px;margin:0;color:#101828}.footer{margin-top:22px;border-top:1px solid #eaecf0;padding-top:10px;font-size:10px;color:#667085}.avoid-break{break-inside:avoid}.page-break{page-break-before:always}</style></head><body><div class=\"page\"><div class=\"header\"><div><div class=\"eyebrow\">Supervisor Assessment Report</div><div class=\"title\">" + escapeHtml(report.candidateName) + "</div><div class=\"subtitle\">Assessment: " + escapeHtml(report.assessmentName) + "</div><div class=\"subtitle\">Generated: " + escapeHtml(generatedAt) + "</div></div><div class=\"scorebox\"><div class=\"score\">" + escapeHtml(report.percentage) + "%</div><div class=\"classification\">" + escapeHtml(report.classification) + "</div><div class=\"subtitle\">Risk Level: " + escapeHtml(report.riskLevel) + "</div><div class=\"subtitle\">Responses: " + escapeHtml(report.responseCount) + "</div></div></div><div class=\"grid\"><div class=\"card\">" + sectionTitle("Candidate Information") + rowHtml("Candidate ID", report.userId) + rowHtml("Assessment ID", report.assessmentId || "Not available") + rowHtml("Data Source", report.dataSource || "Not available") + "</div><div class=\"card\">" + sectionTitle("Supervisor Implication") + "<p>" + escapeHtml(report.supervisorImplication) + "</p></div></div><div class=\"card\">" + sectionTitle("Executive Summary") + "<p>" + escapeHtml(report.executiveSummary) + "</p></div><div class=\"card highlight\">" + sectionTitle("Role Readiness") + "<p>" + escapeHtml(report.roleReadiness) + "</p></div><div class=\"card\">" + sectionTitle("Behavioral Insights") + "<p>" + escapeHtml(behavioralNote) + "</p></div><div class=\"card page-break\">" + sectionTitle("Category / Competency Scores") + "<table><thead><tr><th>Area</th><th>Score</th><th>Classification</th><th>Risk</th><th>Narrative Meaning</th></tr></thead><tbody>" + buildCategoryRows(report.categoryScores) + "</tbody></table></div><div class=\"grid\"><div class=\"card\">" + sectionTitle("Top Strengths") + (report.strengths.length === 0 ? "<p>No strengths available.</p>" : buildListCards(report.strengths, "success")) + "</div><div class=\"card\">" + sectionTitle("Development Areas") + buildListCards(report.developmentAreas, "warning") + "</div></div><div class=\"card page-break\">" + sectionTitle("Supervisor Follow-up Questions") + buildQuestionCards(report.followUpQuestions) + "</div><div class=\"card\">" + sectionTitle("Recommendations") + buildRecommendationCards(report.recommendations) + "</div><div class=\"footer\">CONFIDENTIAL - For internal use only | Stratavax Supervisor Assessment Report</div></div></body></html>";
}

async function launchBrowser() {
  var executablePath;
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    executablePath = await chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar");
    return puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: executablePath, headless: chromium.headless, ignoreHTTPSErrors: true });
  }
  return puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
}

export default async function handler(req, res) {
  var userId;
  var assessmentId;
  var sessionId;
  var serviceClient;
  var candidate;
  var candidateError;
  var assessment;
  var assessmentError;
  var responseResult;
  var responses;
  var report;
  var html;
  var browser;
  var page;
  var pdfBuffer;
  var safeCandidateName;

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    userId = req.body.userId || req.body.user_id;
    assessmentId = req.body.assessmentId || req.body.assessment_id;
    sessionId = req.body.sessionId || req.body.session_id;

    if (!userId || !assessmentId) return res.status(400).json({ error: "Missing required fields" });

    serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    candidate = null;
    candidateError = null;
    try {
      candidate = await selectSingle(serviceClient, "candidate_profiles", function (query) { return query.eq("id", userId); });
      if (!candidate) candidate = await selectSingle(serviceClient, "profiles", function (query) { return query.eq("id", userId); });
      if (!candidate) candidate = await selectSingle(serviceClient, "profiles", function (query) { return query.eq("user_id", userId); });
    } catch (error) {
      candidateError = error;
    }

    if (!candidate && candidateError) return res.status(404).json({ error: "Candidate not found" });
    if (!candidate) candidate = { id: userId, name: "Candidate" };

    assessment = null;
    assessmentError = null;
    try {
      assessment = await selectSingle(serviceClient, "assessments", function (query) { return query.eq("id", assessmentId); }, "*, assessment_type:assessment_types(*)");
      if (!assessment) assessment = await selectSingle(serviceClient, "candidate_assessments", function (query) { return query.eq("id", assessmentId); });
    } catch (error2) {
      assessmentError = error2;
    }

    if (!assessment && assessmentError) return res.status(404).json({ error: "Assessment not found" });
    if (!assessment) assessment = { id: assessmentId, title: "Assessment" };

    responseResult = await fetchResponses(serviceClient, userId, assessmentId, sessionId);
    responses = responseResult.responses;

    if (!responses || responses.length === 0) return res.status(404).json({ error: "No responses found" });

    report = buildReport(candidate, assessment, responses, userId, assessmentId, responseResult.source);
    html = generateHTMLTemplate(report);

    browser = await launchBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 20000 });
    pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" }, displayHeaderFooter: true, headerTemplate: "<div></div>", footerTemplate: "<div style=\"font-size:8px;text-align:center;width:100%;color:#666;font-family:Arial,sans-serif;\"><span>Stratavax - Confidential</span> | <span>Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></span></div>" });
    await browser.close();

    try {
      await serviceClient.from("assessment_reports").insert([{ user_id: userId, assessment_id: assessmentId, session_id: sessionId || null, report_data: report, generated_at: new Date().toISOString() }]);
    } catch (saveError) {
      console.error("Failed to save report metadata:", saveError);
    }

    safeCandidateName = cleanText(report.candidateName, "Candidate").replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"" + safeCandidateName + "_supervisor_report.pdf\"");
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error3) {
    console.error("PDF generation error:", error3);
    return res.status(500).json({ error: "Failed to generate PDF report", message: error3 && error3.message ? error3.message : "Unknown error" });
  }
}
