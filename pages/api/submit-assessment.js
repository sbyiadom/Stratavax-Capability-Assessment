// pages/api/submit-assessment.js

import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  normalizeText,
  parseSelectedAnswerIds,
  scoreQuestionResponse,
  calculateMaxScore,
  isBaselineAssessmentType
} from "../../utils/scoring";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "5mb"
    }
  }
};

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, fallback = "") {
  return normalizeText(value, fallback);
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, anonKey);
}

function groupResponsesByQuestion(responses) {
  const responsesByQuestion = {};

  safeArray(responses).forEach(function (response) {
    if (!response || !response.question_id) return;

    const answerIds = parseSelectedAnswerIds(response.answer_id);
    if (answerIds.length === 0) return;

    if (!responsesByQuestion[response.question_id]) {
      responsesByQuestion[response.question_id] = [];
    }

    responsesByQuestion[response.question_id].push.apply(
      responsesByQuestion[response.question_id],
      answerIds
    );
  });

  return responsesByQuestion;
}

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
  if (value >= 85) return "The candidate shows strong readiness and can be considered for role responsibilities with normal supervision, stretch assignments, and opportunities to leverage demonstrated strengths.";
  if (value >= 75) return "The candidate can perform reliably with standard supervision while benefiting from targeted reinforcement and role-specific feedback.";
  if (value >= 65) return "The candidate can perform with guidance, coaching, and periodic review in selected areas.";
  if (value >= 55) return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

function getDomainContext(category) {
  const value = cleanText(category, "General");
  if (value === "Clinical") return "clinical interpretation, behavioral judgement, and response planning";
  if (value === "Leadership") return "ownership, direction setting, accountability, and leadership follow-through";
  if (value === "Decision-Making" || value === "Decision-Making & Problem-Solving") return "structured judgement, problem analysis, option evaluation, and decision quality";
  if (value === "Communication Style" || value === "Communication & Influence") return "clarity, listening, influence, tone, and feedback response";
  if (value === "Adaptability" || value === "Change Leadership & Agility") return "flexibility, change response, uncertainty management, and adjustment to new demands";
  if (value === "Collaboration") return "team contribution, shared accountability, cooperation, and alignment with others";
  if (value === "FBA") return "behavioral antecedents, consequences, triggers, function, and response planning";
  if (value === "Role Readiness") return "readiness for role responsibilities, practical judgement, and supervised application";
  if (value === "Execution & Results Orientation") return "execution discipline, results focus, follow-through, and delivery ownership";
  if (value === "Safety & Work Ethic") return "safe work behavior, SOP discipline, PPE use, hazard awareness, and workplace conduct";
  if (value === "Technical Fundamentals") return "foundational equipment knowledge, maintenance basics, and system understanding";
  if (value === "Troubleshooting") return "diagnostic thinking, fault identification, and root-cause awareness";
  if (value === "Numerical Aptitude") return "production math, rates, percentages, ratios, and numerical interpretation";
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
  const cleanCategory = cleanText(category, "General");
  const value = toNumber(percentage, 0);
  const context = getDomainContext(cleanCategory);
  const band = getScoreBandName(value);

  if (value >= 85) return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". This area can be leveraged in role responsibilities, stretch assignments, mentoring opportunities, and higher-complexity work.";
  if (value >= 75) return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". The candidate appears reliable in this area and should be encouraged to apply this capability consistently.";
  if (value >= 65) return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". The area is broadly adequate, but the supervisor should monitor consistency and reinforce application in real work situations.";
  if (value >= 55) return cleanCategory + " scored " + value + "%, indicating " + band + " in " + context + ". Structured coaching, guided practice, and periodic review are recommended.";
  if (value >= 40) return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". Targeted development, close supervision, practical exercises, and validation through observed application are recommended.";
  return cleanCategory + " scored " + value + "%, indicating a " + band + " in " + context + ". Close support and validation through structured practice are recommended before assigning critical responsibilities.";
}

function getCategoryAction(category, percentage) {
  const cleanCategory = cleanText(category, "General");
  const value = toNumber(percentage, 0);
  const priority = getPriorityFromScore(value);

  if (value >= 85) return "Leverage this strength through stretch assignments, peer support, mentoring opportunities, and role tasks where " + cleanCategory + " can improve team or operational performance. Priority: " + priority + ".";
  if (value >= 75) return "Maintain this capability through normal supervision, role-specific feedback, and opportunities to apply " + cleanCategory + " in practical work situations. Priority: " + priority + ".";
  if (value >= 65) return "Reinforce this area through periodic review, targeted feedback, and practical application to improve consistency. Priority: " + priority + ".";
  if (value >= 55) return "Provide structured coaching, guided practice, and review progress after applied tasks before increasing independence. Priority: " + priority + ".";
  if (value >= 40) return "Create a targeted development plan with close supervision, practical scenarios, feedback cycles, and documented progress review. Priority: " + priority + ".";
  return "Apply immediate development support, close supervision, simplified assignments, and formal progress validation before assigning critical responsibilities. Priority: " + priority + ".";
}

function getFollowUpQuestion(category, percentage) {
  const cleanCategory = cleanText(category, "General");
  const value = toNumber(percentage, 0);

  if (value >= 75) return "Ask the candidate to describe how this strength can be applied to improve performance, support others, or handle a more complex responsibility in the role.";
  if (cleanCategory === "Clinical") return "Ask the candidate to explain how the candidate would interpret and respond to a sensitive behavioral scenario, including what evidence would be checked before acting.";
  if (cleanCategory === "Leadership") return "Ask the candidate to describe a situation where the candidate had to take ownership, guide others, and follow through despite uncertainty.";
  if (cleanCategory === "Decision-Making" || cleanCategory === "Decision-Making & Problem-Solving") return "Ask the candidate to walk through a recent difficult decision, including options considered, risks identified, and how the final choice was made.";
  if (cleanCategory === "Communication Style" || cleanCategory === "Communication & Influence") return "Ask the candidate to give an example of receiving difficult feedback and explain how the candidate responded and adjusted communication.";
  if (cleanCategory === "Adaptability" || cleanCategory === "Change Leadership & Agility") return "Ask the candidate to describe how the candidate handles sudden changes in plans, priorities, or instructions.";
  if (cleanCategory === "Collaboration") return "Ask the candidate to explain how the candidate works with team members when there are different opinions, unclear roles, or shared deadlines.";
  if (cleanCategory === "FBA") return "Ask the candidate to analyze a behavior scenario by identifying antecedents, consequences, likely function, and appropriate response options.";
  if (cleanCategory === "Safety & Work Ethic") return "Ask the candidate to describe how the candidate would maintain safe work behavior, follow SOPs, and respond to a potential hazard on the line.";
  if (cleanCategory === "Technical Fundamentals") return "Ask the candidate to explain a basic equipment concept or maintenance principle and describe how it applies in practice.";
  if (cleanCategory === "Troubleshooting") return "Ask the candidate to walk through how the candidate would diagnose a common line or equipment fault step by step.";
  if (cleanCategory === "Numerical Aptitude") return "Ask the candidate to solve a basic production-math scenario aloud and explain the method used.";
  return "Ask the candidate to provide a practical example that demonstrates capability in " + cleanCategory + ", including what was done, why it was done, and what outcome resulted.";
}

function getQuestion(response) {
  if (!response) return null;
  return response.unique_questions || response.question || null;
}

function getAnswer(response) {
  if (!response) return null;
  return response.unique_answers || response.answer || response.selected_answer || null;
}

function getResponseCategory(response) {
  const question = getQuestion(response);
  if (!response) return "General";
  return cleanText(
    (question && (question.section || question.category || question.competency || question.dimension)) ||
      response.section ||
      response.category ||
      response.competency ||
      response.dimension ||
      "General",
    "General"
  );
}

function getResponseSubcategory(response) {
  const question = getQuestion(response);
  if (!response) return "";
  return cleanText(
    (question && (question.subsection || question.sub_category)) || response.subsection || response.sub_category || "",
    ""
  );
}

function getResponseQuestionText(response) {
  const question = getQuestion(response);
  if (!response) return "";
  return cleanText(
    (question && (question.question_text || question.text)) || response.question_text || response.question || "",
    ""
  );
}

function getResponseAnswerText(response) {
  const answer = getAnswer(response);
  if (!response) return "";
  return cleanText(
    (answer && (answer.answer_text || answer.text || answer.label)) || response.answer_text || response.selected_answer_text || "",
    ""
  );
}

function getResponseTime(response) {
  if (!response) return 0;
  return toNumber(
    response.time_spent_seconds !== undefined
      ? response.time_spent_seconds
      : response.time_spent !== undefined
      ? response.time_spent
      : response.duration_seconds !== undefined
      ? response.duration_seconds
      : response.response_time_seconds !== undefined
      ? response.response_time_seconds
      : 0,
    0
  );
}

function getResponseChanges(response) {
  if (!response) return 0;
  return toNumber(
    response.times_changed !== undefined
      ? response.times_changed
      : response.changes !== undefined
      ? response.changes
      : response.answer_changes !== undefined
      ? response.answer_changes
      : response.revision_count !== undefined
      ? response.revision_count
      : 0,
    0
  );
}

function buildBehavioralInsights(responses) {
  let totalTime = 0;
  let totalChanges = 0;
  const count = safeArray(responses).length;
  let averageTime = 0;
  let averageChanges = 0;
  let note = "";
  let quality = "Limited";

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

function buildDetailedCategoryScores(responses, isBaseline) {
  const grouped = {};

  safeArray(responses).forEach(function (response) {
    const category = getResponseCategory(response);
    const subcategory = getResponseSubcategory(response);
    const scored = scoreQuestionResponse(response, Boolean(isBaseline));
    const score = toNumber(scored.score, 0);
    const maxScore = toNumber(scored.maxScore, 0);
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
      if (!grouped[category].subcategories[subcategory]) {
        grouped[category].subcategories[subcategory] = 0;
      }
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
    const item = grouped[key];
    let percentage = item.maxScore > 0 ? (item.totalScore / item.maxScore) * 100 : 0;
    percentage = Math.min(100, Math.max(0, percentage));
    percentage = roundNumber(percentage, 2);
    
    return {
      category: item.category,
      name: item.name,
      totalScore: roundNumber(item.totalScore, 2),
      score: roundNumber(item.totalScore, 2),
      maxScore: roundNumber(item.maxScore, 2),
      maxPossible: roundNumber(item.maxScore, 2),
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

function buildDetailedRecommendations(categoryScores) {
  const recommendations = [];

  const developmentAreas = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) < 65 && toNumber(item.percentage, 0) >= 0; })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });

  developmentAreas.forEach(function (area) {
    const percentage = toNumber(area.percentage, 0);
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

  const strengths = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) >= 75 && toNumber(item.percentage, 0) <= 100; })
    .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); });

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
  const lowestAreas = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) < 65 && toNumber(item.percentage, 0) >= 0; })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); })
    .slice(0, 3);

  const topAreas = safeArray(categoryScores)
    .filter(function (item) { return toNumber(item.percentage, 0) >= 75 && toNumber(item.percentage, 0) <= 100; })
    .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); })
    .slice(0, 3);

  let strengthText = "";
  let areaText = "";

  if (topAreas.length > 0) {
    strengthText = " Key strengths include " + topAreas.map(function (item) { return item.name + " (" + item.percentage + "%)"; }).join(", ") + ".";
  }

  if (lowestAreas.length > 0) {
    areaText = " The most important development areas are " + lowestAreas.map(function (item) { return item.name + " (" + item.percentage + "%)"; }).join(", ") + ".";
  }

  return candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText;
}

function buildRoleReadiness(percentage, categoryScores) {
  const weakAreas = safeArray(categoryScores).filter(function (item) { return toNumber(item.percentage, 0) < 65 && toNumber(item.percentage, 0) >= 0; });
  const value = toNumber(percentage, 0);

  if (value >= 85 && weakAreas.length === 0) return "The candidate appears highly ready for role responsibilities with normal supervision. The supervisor can consider stretch assignments, broader accountability, and opportunities to leverage demonstrated strengths.";
  if (value >= 75 && weakAreas.length === 0) return "The candidate appears broadly ready for role responsibilities with normal supervision and role-specific reinforcement.";
  if (value >= 65) return "The candidate may be considered for controlled role responsibilities with coaching, periodic review, and targeted reinforcement in weaker areas.";
  if (value >= 55) return "The candidate should not be relied upon independently yet. Structured development, supervised practice, and progress review are recommended before broader responsibility.";
  return "The candidate is not yet ready for independent critical responsibilities. Close supervision, targeted development, and validation through practical scenarios are recommended before role-critical assignment.";
}

function buildFollowUpQuestions(categoryScores) {
  let selected = safeArray(categoryScores)
    .filter(function (item) { 
      const percentage = toNumber(item.percentage, 0);
      return percentage < 75 && percentage >= 0; 
    })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });

  if (selected.length === 0) {
    selected = safeArray(categoryScores)
      .filter(function (item) { 
        const percentage = toNumber(item.percentage, 0);
        return percentage >= 75 && percentage <= 100; 
      })
      .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); })
      .slice(0, 3);
  }

  return selected.map(function (item) {
    return {
      category: item.name,
      priority: getPriorityFromScore(item.percentage),
      score: item.percentage,
      question: getFollowUpQuestion(item.name, item.percentage)
    };
  });
}

function buildDetailedReportPayload(candidateProfile, assessment, responses, userId, assessmentId, overallPercentage, totalScore, maxScore, responseCount, isBaseline) {
  const candidateName = cleanText(
    candidateProfile && (candidateProfile.full_name || candidateProfile.name || candidateProfile.display_name || candidateProfile.candidate_name || candidateProfile.email),
    userId || "Candidate"
  );

  const assessmentName = cleanText(
    assessment && (assessment.title || assessment.name || assessment.assessment_name || assessment.description),
    "Assessment"
  );

  const categoryScores = buildDetailedCategoryScores(responses, isBaseline);
  const behavioralInsights = buildBehavioralInsights(responses);
  
  const strengths = safeArray(categoryScores)
    .filter(function (item) { 
      const percentage = toNumber(item.percentage, 0);
      return percentage >= 75 && percentage <= 100;
    })
    .sort(function (a, b) { return toNumber(b.percentage, 0) - toNumber(a.percentage, 0); });
    
  const developmentAreas = safeArray(categoryScores)
    .filter(function (item) { 
      const percentage = toNumber(item.percentage, 0);
      return percentage < 65 && percentage >= 0;
    })
    .sort(function (a, b) { return toNumber(a.percentage, 0) - toNumber(b.percentage, 0); });
    
  const recommendations = buildDetailedRecommendations(categoryScores);
  const followUpQuestions = buildFollowUpQuestions(categoryScores);

  const classification = classifyScore(overallPercentage);
  const executiveSummary = buildExecutiveSummary(candidateName, assessmentName, overallPercentage, classification, categoryScores);
  const roleReadiness = buildRoleReadiness(overallPercentage, categoryScores);

  return {
    candidateName: candidateName,
    assessmentName: assessmentName,
    assessmentId: assessmentId || null,
    userId: userId,
    totalScore: roundNumber(totalScore, 2),
    maxScore: roundNumber(maxScore, 2),
    percentage: roundNumber(overallPercentage, 2),
    classification: classification,
    riskLevel: getRiskLevel(overallPercentage),
    executiveSummary: executiveSummary,
    supervisorImplication: getSupervisorImplication(overallPercentage),
    roleReadiness: roleReadiness,
    behavioralInsights: behavioralInsights,
    categoryScores: categoryScores,
    strengths: strengths,
    developmentAreas: developmentAreas,
    recommendations: recommendations,
    followUpQuestions: followUpQuestions,
    responseCount: toNumber(responseCount, 0),
    dataSource: "assessment_submission_engine"
  };
}

async function upsertAssessmentResult(serviceClient, resultData) {
  const upsertResponse = await serviceClient
    .from("assessment_results")
    .upsert(resultData, { onConflict: "session_id" })
    .select()
    .single();

  if (!upsertResponse.error) return upsertResponse;

  const fallbackResponse = await serviceClient
    .from("assessment_results")
    .insert(resultData)
    .select()
    .single();

  return fallbackResponse;
}

async function updateCandidateAssessment(serviceClient, session, result, earnedScore) {
  const basePayload = {
    status: "completed",
    result_id: result ? result.id : null,
    completed_at: nowIso(),
    session_id: session.id,
    updated_at: nowIso()
  };

  let updateResponse = await serviceClient
    .from("candidate_assessments")
    .update({
      score: earnedScore,
      total_score: earnedScore,
      ...basePayload
    })
    .eq("user_id", session.user_id)
    .eq("assessment_id", session.assessment_id);

  if (updateResponse.error) {
    updateResponse = await serviceClient
      .from("candidate_assessments")
      .update(basePayload)
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id);
  }

  return updateResponse;
}

async function createSupervisorNotification(serviceClient, session, result, profile, percentage, isAutoSubmit, autoSubmitReason) {
  try {
    const supervisorId = (profile && (profile.created_by || profile.supervisor_id)) || null;
    if (!supervisorId) return;

    const candidateName = (profile && (profile.full_name || profile.email)) || "Candidate";
    const message = isAutoSubmit
      ? "Assessment auto-submitted for " + candidateName + ". Reason: " + (autoSubmitReason || "Auto-submit") + ". Score: " + Math.round(percentage) + "%"
      : candidateName + " completed an assessment. Score: " + Math.round(percentage) + "%";

    await serviceClient.from("supervisor_notifications").insert({
      supervisor_id: supervisorId,
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      result_id: result.id,
      message: message,
      status: "unread",
      priority: isAutoSubmit ? "high" : "normal",
      created_at: nowIso()
    });
  } catch (error) {
    console.error("Notification warning:", error);
  }
}

async function fetchExistingResult(serviceClient, sessionId) {
  const existing = await serviceClient
    .from("assessment_results")
    .select("id, session_id, user_id, assessment_id, percentage_score, answered_questions, total_questions, is_auto_submitted, auto_submit_reason")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing.error) return null;
  return existing.data || null;
}

async function fetchCandidateAssessment(serviceClient, userId, assessmentId) {
  const res = await serviceClient
    .from("candidate_assessments")
    .select("id, status, session_id, result_id, completed_at, unblocked_at, updated_at")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (res.error) return null;
  return res.data || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const sessionId = body.sessionId || body.session_id;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No authorization token" });
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const serviceClient = getServiceClient();

    const authResponse = await serviceClient.auth.getUser(accessToken);
    const authenticatedUser = authResponse && authResponse.data ? authResponse.data.user : null;

    if (authResponse.error || !authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "invalid_token",
        message: "Could not validate user session"
      });
    }

    const sessionResponse = await serviceClient
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, assessment_type_id, violation_count, auto_submitted, answered_questions, total_questions, status, copy_paste_count, right_click_count, devtools_count, screenshot_count, time_spent_seconds, started_at, created_at")
      .eq("id", sessionId)
      .single();

    if (sessionResponse.error || !sessionResponse.data) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    const session = sessionResponse.data;

    if (session.user_id !== authenticatedUser.id) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "You cannot submit another user's assessment session"
      });
    }

    const assignment = await fetchCandidateAssessment(serviceClient, session.user_id, session.assessment_id);

    if (assignment) {
      const looksReset = assignment.status === "unblocked" && !assignment.session_id && !assignment.result_id && !assignment.completed_at;
      const sessionMismatch = assignment.session_id && String(assignment.session_id) !== String(sessionId);

      if (looksReset) {
        return res.status(409).json({
          success: false,
          error: "assessment_reset",
          message: "This assessment was reset by your supervisor. Please restart the assessment from your dashboard."
        });
      }

      if (sessionMismatch && assignment.status !== "blocked") {
        return res.status(409).json({
          success: false,
          error: "session_mismatch",
          message: "Your active assessment session is no longer valid. Please restart from your dashboard."
        });
      }
    }

    if (session.status === "completed") {
      const existing = await fetchExistingResult(serviceClient, sessionId);
      if (existing) {
        return res.status(200).json({
          success: true,
          id: existing.id,
          result_id: existing.id,
          result: existing,
          isAutoSubmitted: Boolean(existing.is_auto_submitted),
          is_auto_submitted: Boolean(existing.is_auto_submitted),
          auto_submit_reason: existing.auto_submit_reason || null,
          message: "Assessment already submitted."
        });
      }
      return res.status(200).json({ success: true, error: "already_submitted", message: "Assessment already submitted." });
    }

    const violationCount = toNumber(session.violation_count, 0);
    const maxViolations = 3;

    const requestAutoSubmit = body.auto_submit === true || body.auto_submitted === true || body.is_auto_submitted === true;
    const allowIncomplete = body.allow_incomplete === true || body.allowIncomplete === true || requestAutoSubmit;
    const isAutoSubmit = violationCount >= maxViolations || requestAutoSubmit || allowIncomplete;

    // ============================================================
    // FIXED: Simplified assessment query without nested relation
    // ============================================================
    const assessmentResponse = await serviceClient
      .from("assessments")
      .select("id, assessment_type_id, title")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentResponse.error || !assessmentResponse.data) {
      console.error("Assessment fetch error:", assessmentResponse.error);
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_assessment",
        message: assessmentResponse.error ? assessmentResponse.error.message : "Assessment not found"
      });
    }

    const assessment = assessmentResponse.data;

    // Get assessment type code separately if needed
    let assessmentTypeCode = null;
    if (assessment.assessment_type_id) {
      const typeResponse = await serviceClient
        .from("assessment_types")
        .select("code")
        .eq("id", assessment.assessment_type_id)
        .maybeSingle();
      
      if (!typeResponse.error && typeResponse.data) {
        assessmentTypeCode = typeResponse.data.code;
      }
    }

    const isBaseline = isBaselineAssessmentType(assessment.assessment_type_id) || isBaselineAssessmentType(assessmentTypeCode);

    // ============================================================
    // FIXED: Use 'questions' table instead of 'unique_questions'
    // ============================================================
    const questionsResponse = await serviceClient
      .from("questions")
      .select(`
        id,
        question_text,
        section,
        subsection,
        display_order,
        answers (
          id,
          answer_text,
          score,
          is_correct,
          display_order
        )
      `)
      .eq("assessment_id", session.assessment_id)
      .eq("is_active", true);

    if (questionsResponse.error) {
      console.error("Questions fetch error:", questionsResponse.error);
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_questions",
        message: questionsResponse.error.message      });
    }

    const questions = safeArray(questionsResponse.data);
    const totalQuestions = questions.length || toNumber(session.total_questions, 0);

    if (totalQuestions <= 0) {
      return res.status(400).json({
        success: false,
        error: "no_questions_found",
        message: "No questions found for this assessment"
      });
    }

    // ============================================================
    // FIXED: Get responses with proper joins
    // ============================================================
    const responsesResponse = await serviceClient
      .from("responses")
      .select(`
        id,
        question_id,
        answer_id,
        user_id,
        assessment_id,
        session_id,
        time_spent_seconds,
        times_changed,
        initial_answer_id,
        created_at,
        updated_at
      `)
      .eq("session_id", sessionId);

    if (responsesResponse.error) {
      console.error("Responses fetch error:", responsesResponse.error);
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_responses",
        message: responsesResponse.error.message
      });
    }

    const responses = safeArray(responsesResponse.data);
    const answeredCount = responses.filter(r => r.answer_id && r.answer_id !== "").length;

    if (!allowIncomplete && answeredCount < totalQuestions) {
      const unansweredCount = totalQuestions - answeredCount;
      return res.status(400).json({
        success: false,
        error: "incomplete_assessment",
        message: "Please answer all questions before submitting. " + unansweredCount + " question(s) remaining.",
        unanswered_count: unansweredCount,
        total_questions: totalQuestions,
        answered_count: answeredCount
      });
    }

    // ============================================================
    // FIXED: Calculate score properly
    // ============================================================
    let earnedScore = 0;
    let maxScore = 0;

    for (const question of questions) {
      // Get max score for this question
      const maxAnswer = safeArray(question.answers)
        .reduce((max, a) => Math.max(max, toNumber(a.score, 0)), 0);
      
      const questionMax = maxAnswer > 0 ? maxAnswer : 1;
      maxScore += questionMax;

      // Find the response for this question
      const response = responses.find(r => r.question_id === question.id);
      
      if (response && response.answer_id) {
        const answer = safeArray(question.answers).find(a => String(a.id) === String(response.answer_id));
        if (answer) {
          earnedScore += toNumber(answer.score, 0);
        }
      }
    }

    let percentage = maxScore > 0 ? (earnedScore / maxScore) * 100 : 0;
    if (Number.isNaN(percentage) || !Number.isFinite(percentage)) percentage = 0;
    percentage = roundNumber(percentage, 2);

    const isValid = !isAutoSubmit && answeredCount === totalQuestions;

    let autoSubmitReason = null;
    if (isAutoSubmit) {
      autoSubmitReason = body.auto_submit_reason || null;
      if (!autoSubmitReason && violationCount >= maxViolations) {
        autoSubmitReason = "Auto-submitted due to " + violationCount + " violation(s).";
      }
      if (!autoSubmitReason) {
        autoSubmitReason = "Auto-submitted because the assessment timer expired.";
      }
      autoSubmitReason += " Answered " + answeredCount + " of " + totalQuestions + " questions.";
    }

    const profileResponse = await serviceClient
      .from("candidate_profiles")
      .select("id, full_name, email, created_by, supervisor_id")
      .eq("id", session.user_id)
      .maybeSingle();

    const candidateProfile = profileResponse.data || { id: session.user_id, full_name: null, email: null };

    // Build category scores from responses and questions
    const categoryScores = buildDetailedCategoryScores(responses, isBaseline);
    
    const detailedReport = buildDetailedReportPayload(
      candidateProfile,
      assessment,
      responses,
      session.user_id,
      session.assessment_id,
      percentage,
      earnedScore,
      maxScore,
      answeredCount,
      isBaseline
    );

    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: toNumber(earnedScore, 0),
      max_score: toNumber(maxScore, 0),
      percentage_score: percentage,
      answered_questions: toNumber(answeredCount, 0),
      total_questions: toNumber(totalQuestions, 0),
      is_valid: Boolean(isValid),
      is_auto_submitted: Boolean(isAutoSubmit),
      auto_submit_reason: autoSubmitReason,
      violation_count: toNumber(violationCount, 0),
      violation_details: {
        copy_paste: toNumber(session.copy_paste_count, 0),
        right_clicks: toNumber(session.right_click_count, 0),
        devtools: toNumber(session.devtools_count, 0),
        screenshots: toNumber(session.screenshot_count, 0)
      },
      completed_at: nowIso(),
      risk_level: detailedReport.riskLevel,
      readiness: detailedReport.roleReadiness,
      category_scores: detailedReport.categoryScores.length > 0 ? detailedReport.categoryScores : null,
      strengths: detailedReport.strengths.length > 0 ? detailedReport.strengths : null,
      weaknesses: detailedReport.developmentAreas.length > 0 ? detailedReport.developmentAreas : null,
      recommendations: detailedReport.recommendations.length > 0 ? detailedReport.recommendations : null,
      interpretations: {
        executiveSummary: detailedReport.executiveSummary,
        supervisorImplication: detailedReport.supervisorImplication,
        roleReadiness: detailedReport.roleReadiness,
        behavioralInsights: detailedReport.behavioralInsights,
        followUpQuestions: detailedReport.followUpQuestions,
        classification: detailedReport.classification,
        riskLevel: detailedReport.riskLevel,
        dataSource: detailedReport.dataSource
      }
    };

    const resultResponse = await upsertAssessmentResult(serviceClient, resultData);

    if (resultResponse.error || !resultResponse.data) {
      console.error("Result save error:", resultResponse.error);
      return res.status(500).json({
        success: false,
        error: "failed_to_save_results",
        message: resultResponse.error ? resultResponse.error.message : "Could not save result"
      });
    }

    const result = resultResponse.data;

    await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: nowIso(),
        auto_submitted: Boolean(isAutoSubmit),
        auto_submit_reason: autoSubmitReason,
        answered_questions: toNumber(answeredCount, 0),
        total_questions: toNumber(totalQuestions, 0),
        updated_at: nowIso()
      })
      .eq("id", sessionId);

    await updateCandidateAssessment(serviceClient, session, result, earnedScore);

    if (profileResponse.data) {
      await createSupervisorNotification(serviceClient, session, result, profileResponse.data, percentage, isAutoSubmit, autoSubmitReason);
    }

    return res.status(200).json({
      success: true,
      result_id: result.id,
      id: result.id,
      result: result,
      score: toNumber(earnedScore, 0),
      total_score: toNumber(earnedScore, 0),
      max_score: toNumber(maxScore, 0),
      percentage: Math.round(percentage),
      percentage_score: percentage,
      percentage_raw: percentage,
      answered_questions: toNumber(answeredCount, 0),
      total_questions: toNumber(totalQuestions, 0),
      is_valid: Boolean(isValid),
      isAutoSubmitted: Boolean(isAutoSubmit),
      is_auto_submitted: Boolean(isAutoSubmit),
      violationCount: toNumber(violationCount, 0),
      violation_count: toNumber(violationCount, 0),
      auto_submit_reason: autoSubmitReason,
      category_scores: detailedReport.categoryScores,
      strengths: detailedReport.strengths,
      weaknesses: detailedReport.developmentAreas,
      recommendations: detailedReport.recommendations,
      follow_up_questions: detailedReport.followUpQuestions,
      message: isAutoSubmit
        ? "Assessment auto-submitted. Score calculated as " + toNumber(earnedScore, 0) + " out of " + toNumber(maxScore, 0) + ". Answered " + answeredCount + " of " + totalQuestions + " questions."
        : "Assessment submitted successfully. Score: " + Math.round(percentage) + "%"
    });
  } catch (error) {
    console.error("Fatal submit-assessment error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error && error.message ? error.message : "Submission failed"
    });
  }
}
