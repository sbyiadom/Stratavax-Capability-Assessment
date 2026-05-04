// pages/api/submit-assessment.js

import { createClient } from "@supabase/supabase-js";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "5mb"
    }
  }
};

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
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

function parseAnswerIds(answerValue) {
  if (answerValue === null || answerValue === undefined || answerValue === "") return [];

  if (Array.isArray(answerValue)) {
    return answerValue
      .map((value) => parseInt(value, 10))
      .filter((value) => !Number.isNaN(value));
  }

  const text = String(answerValue);

  if (text.includes(",")) {
    return text
      .split(",")
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => !Number.isNaN(value));
  }

  const parsed = parseInt(text, 10);
  return Number.isNaN(parsed) ? [] : [parsed];
}

function uniqueNumbers(values) {
  return Array.from(new Set(safeArray(values).map((value) => toNumber(value, null)).filter((value) => value !== null)));
}

function calculateQuestionMaxScore(question, isBaseline) {
  const answers = safeArray(question.unique_answers);

  if (isBaseline) return 1;

  if (answers.length === 0) return 0;

  return Math.max(...answers.map((answer) => toNumber(answer.score, 0)));
}

function buildQuestionMetadata(questions, isBaseline) {
  const metadata = {};
  let totalMaxScore = 0;

  safeArray(questions).forEach((question) => {
    const answers = safeArray(question.unique_answers);
    const answerScores = {};
    const correctAnswerIds = [];
    let maxScore = calculateQuestionMaxScore(question, isBaseline);

    answers.forEach((answer) => {
      const answerId = toNumber(answer.id, null);
      const answerScore = toNumber(answer.score, 0);

      if (answerId === null) return;

      answerScores[answerId] = answerScore;

      if (answerScore === 1) {
        correctAnswerIds.push(answerId);
      }
    });

    if (!isBaseline && maxScore < 0) maxScore = 0;

    metadata[question.id] = {
      questionId: question.id,
      answerScores,
      correctAnswerIds,
      isMultipleCorrect: correctAnswerIds.length > 1,
      maxScore
    };

    totalMaxScore += maxScore;
  });

  return { metadata, totalMaxScore };
}

function calculateEarnedScore(responsesByQuestion, questionMetadata, isBaseline) {
  let earnedScore = 0;

  Object.entries(responsesByQuestion).forEach(([questionId, selectedAnswerIdsRaw]) => {
    const selectedAnswerIds = uniqueNumbers(selectedAnswerIdsRaw);
    const metadata = questionMetadata[questionId];
    let questionScore = 0;

    if (!metadata || selectedAnswerIds.length === 0) return;

    if (isBaseline) {
      const correctAnswerIds = uniqueNumbers(metadata.correctAnswerIds);

      if (correctAnswerIds.length === 0) {
        questionScore = 0;
      } else if (metadata.isMultipleCorrect) {
        const hasAllCorrect = correctAnswerIds.every((correctId) => selectedAnswerIds.includes(correctId));
        const hasNoExtraIncorrect = selectedAnswerIds.every((selectedId) => correctAnswerIds.includes(selectedId));
        questionScore = hasAllCorrect && hasNoExtraIncorrect ? 1 : 0;
      } else {
        questionScore = correctAnswerIds.includes(selectedAnswerIds[0]) ? 1 : 0;
      }
    } else {
      selectedAnswerIds.forEach((answerId) => {
        questionScore += toNumber(metadata.answerScores[answerId], 0);
      });

      if (questionScore > metadata.maxScore) questionScore = metadata.maxScore;
    }

    earnedScore += questionScore;
  });

  return earnedScore;
}

function groupResponsesByQuestion(responses) {
  const responsesByQuestion = {};

  safeArray(responses).forEach((response) => {
    if (!response || !response.question_id) return;

    const answerIds = parseAnswerIds(response.answer_id);
    if (answerIds.length === 0) return;

    if (!responsesByQuestion[response.question_id]) {
      responsesByQuestion[response.question_id] = [];
    }

    responsesByQuestion[response.question_id].push(...answerIds);
  });

  return responsesByQuestion;
}

function extractResultId(result) {
  if (!result) return null;
  if (result.id) return result.id;
  if (result.result && result.result.id) return result.result.id;
  if (result.data && result.data.id) return result.data.id;
  return null;
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

async function updateCandidateAssessment(serviceClient, session, result, scoreData) {
  const updatePayload = {
    status: "completed",
    result_id: result ? result.id : null,
    updated_at: nowIso()
  };

  const optionalPayload = {
    score: scoreData.earnedScore,
    max_score: scoreData.maxScore,
    percentage: scoreData.percentage,
    completed_at: nowIso()
  };

  let updateResponse = await serviceClient
    .from("candidate_assessments")
    .update({ ...updatePayload, ...optionalPayload })
    .eq("user_id", session.user_id)
    .eq("assessment_id", session.assessment_id);

  if (updateResponse.error) {
    updateResponse = await serviceClient
      .from("candidate_assessments")
      .update(updatePayload)
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id);
  }

  return updateResponse;
}

async function createSupervisorNotification(serviceClient, session, result, profile, scoreData, isAutoSubmit, violationCount) {
  try {
    const supervisorId = profile?.created_by || profile?.supervisor_id || null;
    if (!supervisorId) return;

    const candidateName = profile.full_name || profile.email || "Candidate";
    const message = isAutoSubmit
      ? "Assessment auto-submitted for " + candidateName + " due to " + violationCount + " violation(s). Score: " + Math.round(scoreData.percentage) + "%"
      : candidateName + " completed an assessment. Score: " + Math.round(scoreData.percentage) + "%";

    await serviceClient.from("supervisor_notifications").insert({
      supervisor_id: supervisorId,
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      result_id: result.id,
      message,
      status: "unread",
      priority: isAutoSubmit ? "high" : "normal",
      created_at: nowIso()
    });
  } catch (error) {
    console.error("Notification warning:", error);
  }
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
    const authenticatedUser = authResponse?.data?.user || null;

    if (authResponse.error || !authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "invalid_token",
        message: "Could not validate user session"
      });
    }

    const sessionResponse = await serviceClient
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, assessment_type_id, violation_count, auto_submitted, answered_questions, total_questions, status, copy_paste_count, right_click_count, devtools_count, screenshot_count, time_spent_seconds")
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

    if (session.status === "completed") {
      return res.status(400).json({ success: false, error: "already_submitted" });
    }

    const violationCount = toNumber(session.violation_count, 0);
    const maxViolations = 3;
    const isAutoSubmit = violationCount >= maxViolations || body.auto_submit === true || body.is_auto_submitted === true;

    const assessmentResponse = await serviceClient
      .from("assessments")
      .select("id, assessment_type_id, title")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentResponse.error || !assessmentResponse.data) {
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_assessment",
        message: assessmentResponse.error ? assessmentResponse.error.message : "Assessment not found"
      });
    }

    const assessment = assessmentResponse.data;
    const isBaseline = toNumber(assessment.assessment_type_id, 0) === 19;

    const questionsResponse = await serviceClient
      .from("unique_questions")
      .select("id, unique_answers(id, score)")
      .eq("assessment_type_id", assessment.assessment_type_id);

    if (questionsResponse.error) {
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_questions",
        message: questionsResponse.error.message
      });
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

    const responsesResponse = await serviceClient
      .from("responses")
      .select("question_id, answer_id")
      .eq("session_id", sessionId);

    if (responsesResponse.error) {
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_responses",
        message: responsesResponse.error.message
      });
    }

    const responses = safeArray(responsesResponse.data);
    const responsesByQuestion = groupResponsesByQuestion(responses);
    const answeredCount = Object.keys(responsesByQuestion).length;

    if (!isAutoSubmit && answeredCount < totalQuestions) {
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

    const metadataResult = buildQuestionMetadata(questions, isBaseline);
    const earnedScore = calculateEarnedScore(responsesByQuestion, metadataResult.metadata, isBaseline);
    const maxScore = metadataResult.totalMaxScore > 0 ? metadataResult.totalMaxScore : totalQuestions;

    let percentage = maxScore > 0 ? (earnedScore / maxScore) * 100 : 0;
    if (Number.isNaN(percentage) || !Number.isFinite(percentage)) percentage = 0;
    percentage = Math.round(percentage * 100) / 100;

    const isValid = !isAutoSubmit && answeredCount === totalQuestions;
    const autoSubmitReason = isAutoSubmit
      ? "Auto-submitted due to " + violationCount + " violation(s). Answered " + answeredCount + " of " + totalQuestions + " questions."
      : null;

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
      completed_at: nowIso()
    };

    const resultResponse = await upsertAssessmentResult(serviceClient, resultData);

    if (resultResponse.error || !resultResponse.data) {
      return res.status(500).json({
        success: false,
        error: "failed_to_save_results",
        message: resultResponse.error ? resultResponse.error.message : "Could not save result"
      });
    }

    const result = resultResponse.data;

    const sessionUpdateResponse = await serviceClient
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

    if (sessionUpdateResponse.error) {
      return res.status(500).json({
        success: false,
        error: "failed_to_update_session",
        message: sessionUpdateResponse.error.message,
        result_id: result.id
      });
    }

    await updateCandidateAssessment(serviceClient, session, result, {
      earnedScore,
      maxScore,
      percentage
    });

    const profileResponse = await serviceClient
      .from("candidate_profiles")
      .select("full_name, email, created_by, supervisor_id")
      .eq("id", session.user_id)
      .maybeSingle();

    if (profileResponse.data) {
      await createSupervisorNotification(serviceClient, session, result, profileResponse.data, { percentage }, isAutoSubmit, violationCount);
    }

    return res.status(200).json({
      success: true,
      result_id: result.id,
      id: result.id,
      result,
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
      message: isAutoSubmit
        ? "Assessment auto-submitted due to " + violationCount + " violation(s). Score calculated on " + answeredCount + " of " + totalQuestions + " questions."
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
