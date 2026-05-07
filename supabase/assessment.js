// supabase/assessment.js

import { supabase } from "./client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function nowIso() {
  return new Date().toISOString();
}

function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function getAnswerIdsArray(answerId) {
  if (Array.isArray(answerId)) {
    return answerId.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
  }

  if (typeof answerId === "string" && answerId.includes(",")) {
    return answerId.split(",").map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
  }

  if (answerId !== null && answerId !== undefined && answerId !== "") {
    const singleId = parseInt(answerId, 10);
    return Number.isNaN(singleId) ? [] : [singleId];
  }

  return [];
}

function normalizeAnswerForStorage(answerId) {
  const ids = getAnswerIdsArray(answerId);
  if (ids.length === 0) return "";
  if (ids.length === 1) return String(ids[0]);
  return ids.join(",");
}

function countAnsweredFromResponses(responses) {
  return safeArray(responses).filter((response) => {
    return response && response.answer_id !== null && response.answer_id !== undefined && response.answer_id !== "";
  }).length;
}

async function safeSelectRows(tableName, configureQuery, selectText = "*") {
  try {
    let query = supabase.from(tableName).select(selectText);
    if (typeof configureQuery === "function") query = configureQuery(query);
    const result = await query;
    if (result.error) return { data: [], error: result.error };
    return { data: Array.isArray(result.data) ? result.data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

async function safeSelectSingle(tableName, configureQuery, selectText = "*") {
  const rows = await safeSelectRows(
    tableName,
    (query) => {
      if (typeof configureQuery === "function") query = configureQuery(query);
      return query.limit(1);
    },
    selectText
  );

  if (rows.data.length > 0) return { data: rows.data[0], error: null };
  return { data: null, error: rows.error };
}

async function getSessionById(sessionId) {
  const result = await safeSelectSingle(
    "assessment_sessions",
    (query) => query.eq("id", sessionId),
    "*"
  );
  return result.data;
}

async function getAssessmentQuestionCount(assessmentTypeId) {
  if (!assessmentTypeId) return 0;
  const result = await safeSelectRows(
    "unique_questions",
    (query) => query.eq("assessment_type_id", assessmentTypeId),
    "id"
  );
  return result.data.length;
}

async function updateCandidateAssessmentStatus(userId, assessmentId, status, resultId) {
  try {
    const payload = {
      status,
      updated_at: nowIso()
    };

    if (status === "completed") payload.completed_at = nowIso();
    if (resultId !== undefined) payload.result_id = resultId || null;

    await supabase
      .from("candidate_assessments")
      .update(payload)
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);
  } catch (error) {
    console.error("Error updating candidate assessment status:", error);
  }
}

// ======================================================
// ASSESSMENT TYPES
// ======================================================

export async function getAssessmentTypes() {
  try {
    const { data, error } = await supabase
      .from("assessment_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAssessmentTypes:", error);
    return [];
  }
}

export async function getAssessmentTypeByCode(code) {
  try {
    const { data, error } = await supabase
      .from("assessment_types")
      .select("*")
      .eq("code", code)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getAssessmentTypeByCode:", error);
    throw error;
  }
}

// ======================================================
// ASSESSMENTS
// ======================================================

export async function getAssessments() {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("*, assessment_type:assessment_types(*)")
      .eq("is_active", true)
      .order("title", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAssessments:", error);
    return [];
  }
}

export async function getAssessmentById(id) {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("*, assessment_type:assessment_types(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getAssessmentById:", error);
    throw error;
  }
}

// ======================================================
// ASSESSMENT SESSIONS
// ======================================================

export async function createAssessmentSession(userId, assessmentId, assessmentTypeId) {
  try {
    if (!userId || !assessmentId) throw new Error("Missing userId or assessmentId");

    const completed = await isAssessmentCompleted(userId, assessmentId);
    if (completed) throw new Error("Assessment already completed");

    const existing = await safeSelectSingle(
      "assessment_sessions",
      (query) => query
        .eq("user_id", userId)
        .eq("assessment_id", assessmentId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false }),
      "*"
    );

    if (existing.data) return existing.data;

    const assessment = await getAssessmentById(assessmentId);
    const resolvedAssessmentTypeId = assessmentTypeId || assessment?.assessment_type_id || null;
    const totalQuestions = await getAssessmentQuestionCount(resolvedAssessmentTypeId);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 180);

    const { data, error } = await supabase
      .from("assessment_sessions")
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: resolvedAssessmentTypeId,
        status: "in_progress",
        started_at: nowIso(),
        expires_at: expiresAt.toISOString(),
        time_spent_seconds: 0,
        total_questions: totalQuestions,
        answered_questions: 0,
        violation_count: 0,
        copy_paste_count: 0,
        right_click_count: 0,
        devtools_count: 0,
        screenshot_count: 0,
        created_at: nowIso(),
        updated_at: nowIso()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Create assessment session error:", error);
    throw error;
  }
}

export async function getAssessmentSession(sessionId) {
  try {
    const data = await getSessionById(sessionId);
    if (!data) throw new Error("Session not found");
    return data;
  } catch (error) {
    console.error("Get assessment session error:", error);
    throw error;
  }
}

export async function updateSessionTimer(sessionId, elapsedSeconds) {
  try {
    if (!sessionId) return false;

    const { error } = await supabase
      .from("assessment_sessions")
      .update({
        time_spent_seconds: Math.max(0, toNumber(elapsedSeconds, 0)),
        updated_at: nowIso()
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error updating session timer:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Update session timer error:", error);
    return false;
  }
}

export async function getSessionResponses(sessionId) {
  try {
    const answerMap = {};
    const initialAnswerMap = {};
    const changeCountMap = {};

    if (!sessionId) return { answerMap, initialAnswerMap, changeCountMap, count: 0 };

    const { data, error } = await supabase
      .from("responses")
      .select("question_id, answer_id, initial_answer_id, times_changed")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching responses:", error);
      return { answerMap, initialAnswerMap, changeCountMap, count: 0 };
    }

    safeArray(data).forEach((response) => {
      if (response?.question_id) {
        answerMap[response.question_id] = response.answer_id;
        if (response.initial_answer_id !== null && response.initial_answer_id !== undefined) {
          initialAnswerMap[response.question_id] = response.initial_answer_id;
        }
        changeCountMap[response.question_id] = toNumber(response.times_changed, 0);
      }
    });

    return { answerMap, initialAnswerMap, changeCountMap, count: safeArray(data).length };
  } catch (error) {
    console.error("Error in getSessionResponses:", error);
    return { answerMap: {}, initialAnswerMap: {}, changeCountMap: {}, count: 0 };
  }
}

// ======================================================
// SUBMISSION
// ======================================================

export async function submitAssessment(sessionId, options = {}) {
  try {
    if (!sessionId) throw new Error("Missing sessionId");

    const authResponse = await supabase.auth.getSession();
    const authSession = authResponse?.data?.session || null;
    if (!authSession) throw new Error("No active session");

    const assessmentSession = await getSessionById(sessionId);
    if (!assessmentSession) throw new Error("Could not verify session");

    const autoSubmitted = options.autoSubmitted === true || options.auto_submitted === true;
    const allowIncomplete = options.allowIncomplete === true || options.allow_incomplete === true || autoSubmitted;

    const response = await fetch("/api/submit-assessment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authSession.access_token
      },
      body: JSON.stringify({
        sessionId,
        session_id: sessionId,
        user_id: assessmentSession.user_id,
        assessment_id: assessmentSession.assessment_id,
        auto_submit: autoSubmitted,
        auto_submitted: autoSubmitted,
        is_auto_submitted: autoSubmitted,
        auto_submit_reason: options.autoSubmitReason || options.auto_submit_reason || null,
        allow_incomplete: allowIncomplete,
        allowIncomplete
      })
    });

    const result = await response.json();

    if (!response.ok) {
      if (result?.error === "incomplete_assessment") throw new Error("incomplete_assessment");
      if (result?.error === "already_submitted") throw new Error("already_submitted");
      throw new Error(result?.message || result?.error || "Submission failed");
    }

    const resultId = result?.id || result?.result?.id || result?.data?.id || null;
    await updateCandidateAssessmentStatus(assessmentSession.user_id, assessmentSession.assessment_id, "completed", resultId);

    return result;
  } catch (error) {
    console.error("Submit assessment error:", error);
    throw error;
  }
}

// ======================================================
// RESULTS
// ======================================================

export async function getAssessmentResult(resultId) {
  try {
    const { data, error } = await supabase
      .from("assessment_results")
      .select("*, assessment:assessments(*, assessment_type:assessment_types(*))")
      .eq("id", resultId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getAssessmentResult:", error);
    throw error;
  }
}

export async function getUserAssessmentResults(userId) {
  try {
    const { data, error } = await supabase
      .from("assessment_results")
      .select("*, assessment:assessments(*, assessment_type:assessment_types(*))")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getUserAssessmentResults:", error);
    return [];
  }
}

// ======================================================
// CANDIDATE PROFILE
// ======================================================

export async function getOrCreateCandidateProfile(userId, email, fullName) {
  try {
    const { data: existing } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from("candidate_profiles")
      .insert({ id: userId, email, full_name: fullName })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getOrCreateCandidateProfile:", error);
    throw error;
  }
}

// ======================================================
// PROGRESS
// ======================================================

export async function saveProgress(sessionId, userId, assessmentId, elapsedSeconds, lastQuestionId) {
  try {
    if (!userId || !assessmentId) return false;

    const { error } = await supabase
      .from("assessment_progress")
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        elapsed_seconds: Math.max(0, toNumber(elapsedSeconds, 0)),
        last_question_id: lastQuestionId || null,
        last_saved_at: nowIso(),
        updated_at: nowIso()
      }, { onConflict: "user_id,assessment_id" });

    if (error) {
      console.error("Error saving progress:", error);
      return false;
    }

    if (sessionId) await updateSessionTimer(sessionId, elapsedSeconds);
    return true;
  } catch (error) {
    console.error("Error saving progress:", error);
    return false;
  }
}

export async function getProgress(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from("assessment_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (error) {
      console.error("Error getting progress:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting progress:", error);
    return null;
  }
}

export async function isAssessmentCompleted(userId, assessmentId) {
  try {
    const candidateAssessment = await safeSelectSingle(
      "candidate_assessments",
      (query) => query.eq("user_id", userId).eq("assessment_id", assessmentId).eq("status", "completed"),
      "id, status, result_id"
    );
    if (candidateAssessment.data) return true;

    const resultRecord = await safeSelectSingle(
      "assessment_results",
      (query) => query.eq("user_id", userId).eq("assessment_id", assessmentId),
      "id"
    );
    if (resultRecord.data) return true;

    const completedSession = await safeSelectSingle(
      "assessment_sessions",
      (query) => query.eq("user_id", userId).eq("assessment_id", assessmentId).eq("status", "completed"),
      "id"
    );

    return !!completedSession.data;
  } catch (error) {
    console.error("Error in isAssessmentCompleted:", error);
    return false;
  }
}

// ======================================================
// QUESTIONS
// ======================================================

export async function getUniqueQuestions(assessmentId) {
  try {
    if (!assessmentId) return [];

    const assessmentResult = await safeSelectSingle(
      "assessments",
      (query) => query.eq("id", assessmentId),
      "assessment_type_id, title"
    );

    if (!assessmentResult.data) return [];

    const questionsResult = await safeSelectRows(
      "unique_questions",
      (query) => query.eq("assessment_type_id", assessmentResult.data.assessment_type_id).order("display_order", { ascending: true }),
      "id, section, subsection, question_text, display_order, unique_answers(id, answer_text, score, display_order)"
    );

    if (questionsResult.error) {
      console.error("Error fetching unique questions:", questionsResult.error);
      return [];
    }

    return shuffleArray(questionsResult.data).map((question, index) => {
      const answers = safeArray(question.unique_answers).map((answer) => ({
        id: answer.id,
        answer_text: answer.answer_text,
        score: answer.score,
        display_order: answer.display_order
      }));

      return {
        id: question.id,
        question_text: question.question_text,
        section: question.section,
        subsection: question.subsection,
        display_order: index + 1,
        answers: shuffleArray(answers)
      };
    });
  } catch (error) {
    console.error("Error in getUniqueQuestions:", error);
    return [];
  }
}

// ======================================================
// QUESTION TIMING AND RESPONSES
// ======================================================

export async function trackQuestionView(session_id, question_id, question_number) {
  try {
    if (!session_id || !question_id) return;

    const { data: existing } = await supabase
      .from("question_timing")
      .select("id, visit_count")
      .eq("session_id", session_id)
      .eq("question_id", question_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("question_timing")
        .update({
          visit_count: toNumber(existing.visit_count, 0) + 1,
          updated_at: nowIso()
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("question_timing").insert({
        session_id,
        question_id,
        question_number,
        first_viewed_at: nowIso(),
        visit_count: 1,
        created_at: nowIso(),
        updated_at: nowIso()
      });
    }
  } catch (error) {
    console.error("Error tracking question view:", error);
  }
}

async function updateQuestionTiming(session_id, question_id, metadata = {}) {
  try {
    let timeSpent = toNumber(metadata.time_spent_seconds, 0);

    const existing = await safeSelectSingle(
      "question_timing",
      (query) => query.eq("session_id", session_id).eq("question_id", question_id),
      "id, first_viewed_at"
    );

    if (existing.data) {
      if (!timeSpent && existing.data.first_viewed_at) {
        timeSpent = Math.floor((Date.now() - new Date(existing.data.first_viewed_at).getTime()) / 1000);
      }

      await supabase
        .from("question_timing")
        .update({
          last_answered_at: nowIso(),
          time_spent_seconds: Math.max(0, timeSpent),
          updated_at: nowIso()
        })
        .eq("id", existing.data.id);
    } else {
      await supabase.from("question_timing").insert({
        session_id,
        question_id,
        question_number: metadata.question_number || null,
        first_viewed_at: nowIso(),
        last_answered_at: nowIso(),
        time_spent_seconds: Math.max(0, timeSpent),
        visit_count: 1,
        created_at: nowIso(),
        updated_at: nowIso()
      });
    }
  } catch (error) {
    console.error("Error updating question timing:", error);
  }
}

async function updateSessionAnsweredCount(sessionId) {
  try {
    const rows = await safeSelectRows("responses", (query) => query.eq("session_id", sessionId), "id, answer_id");

    await supabase
      .from("assessment_sessions")
      .update({ answered_questions: countAnsweredFromResponses(rows.data), updated_at: nowIso() })
      .eq("id", sessionId);
  } catch (error) {
    console.error("Error updating session answered count:", error);
  }
}

export async function saveUniqueResponse(session_id, user_id, assessment_id, question_id, answer_id, metadata = {}) {
  try {
    if (!session_id || !user_id || !assessment_id || !question_id || answer_id === null || answer_id === undefined || answer_id === "") {
      return { success: false, error: "Missing required fields" };
    }

    const questionIdNum = parseInt(question_id, 10);
    if (Number.isNaN(questionIdNum)) return { success: false, error: "Invalid question ID format" };

    const answerIdsArray = getAnswerIdsArray(answer_id);
    if (answerIdsArray.length === 0) return { success: false, error: "Invalid answer ID format" };

    const answerToStore = normalizeAnswerForStorage(answer_id);

    const sessionResult = await safeSelectSingle(
      "assessment_sessions",
      (query) => query.eq("id", session_id).eq("user_id", user_id),
      "id, status"
    );

    if (!sessionResult.data) return { success: false, error: "Session not found" };
    if (sessionResult.data.status !== "in_progress") {
      return { success: false, error: "Session is " + sessionResult.data.status + ", cannot save responses" };
    }

    const existingResult = await safeSelectSingle(
      "responses",
      (query) => query.eq("session_id", session_id).eq("question_id", questionIdNum),
      "id, answer_id, times_changed, initial_answer_id"
    );

    const existingResponse = existingResult.data;
    const isNewResponse = !existingResponse;
    const isAnswerChange = existingResponse ? String(existingResponse.answer_id || "") !== String(answerToStore || "") : false;
    const newChangeCount = isNewResponse ? 0 : toNumber(existingResponse.times_changed, 0) + (isAnswerChange ? 1 : 0);
    const timeSpent = toNumber(metadata.time_spent_seconds, 0);

    const responseData = {
      session_id,
      user_id,
      assessment_id,
      question_id: questionIdNum,
      answer_id: answerToStore,
      time_spent_seconds: Math.max(0, timeSpent),
      updated_at: nowIso()
    };

    if (isNewResponse) {
      responseData.first_saved_at = nowIso();
      responseData.times_changed = 0;
      responseData.initial_answer_id = metadata.initial_answer_id !== undefined && metadata.initial_answer_id !== null ? String(metadata.initial_answer_id) : answerToStore;
    } else {
      responseData.times_changed = newChangeCount;
      responseData.initial_answer_id = existingResponse.initial_answer_id || answerToStore;
    }

    if (isAnswerChange) {
      await supabase.from("answer_history").insert({
        session_id,
        question_id: questionIdNum,
        old_answer_id: existingResponse.answer_id,
        new_answer_id: answerToStore,
        changed_at: nowIso()
      });
    }

    const { data, error } = await supabase
      .from("responses")
      .upsert(responseData, { onConflict: "session_id,question_id" })
      .select();

    if (error) {
      console.error("Error saving response:", error);
      return { success: false, error: error.message };
    }

    await updateQuestionTiming(session_id, questionIdNum, metadata);
    await updateSessionAnsweredCount(session_id);

    return { success: true, data, isNewResponse, isAnswerChange, timesChanged: responseData.times_changed };
  } catch (error) {
    console.error("Error in saveUniqueResponse:", error);
    return { success: false, error: error?.message || "Failed to save response" };
  }
}

// ======================================================
// LEGACY COMPATIBILITY
// ======================================================

export async function getRandomizedQuestions(candidateId, assessmentId) {
  return getUniqueQuestions(assessmentId);
}

export async function saveRandomizedResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  return saveUniqueResponse(session_id, user_id, assessment_id, question_id, answer_id);
}

export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  return saveUniqueResponse(sessionId, userId, assessmentId, questionId, answerId);
}
