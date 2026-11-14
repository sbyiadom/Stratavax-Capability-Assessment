// pages/api/assessment/save-response.js
// Phase 5: Forced-choice support
// Phase 5.1: Metadata spread order fixed
// Phase 5.2: Upsert to prevent race conditions
// Phase 9 (2026-11-14): ACCUMULATE total_time_spent instead of overwriting.
//   Previously set total_time_spent to the CURRENT question's time,
//   which meant after 100 questions it showed only ~2 minutes.
//   Now accumulates properly and mirrors into time_spent_seconds.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, questionId, answer, leastAnswerId, metadata } = req.body;

    if (!sessionId || !questionId || answer === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("assessment_id, user_id, total_time_spent, time_spent_seconds")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const assessmentId = session.assessment_id;
    const qid = parseInt(questionId, 10);

    const { data: existing, error: existingError } = await serviceClient
      .from("responses")
      .select("id, answer_id, least_answer_id, times_changed, initial_answer_id, metadata")
      .eq("session_id", sessionId)
      .eq("question_id", qid)
      .maybeSingle();

    if (existingError) {
      console.error("[SaveResponse] Existing row read error:", existingError);
    }

    const isNew = !existing;

    const isAnswerChange = existing && existing.answer_id != null
      ? String(existing.answer_id) !== String(answer)
      : false;

    const newChangeCount = isNew
      ? 0
      : (existing.times_changed || 0) + (isAnswerChange ? 1 : 0);

    const normalizedLeastAnswerId =
      leastAnswerId === undefined || leastAnswerId === null || leastAnswerId === ""
        ? null
        : parseInt(leastAnswerId, 10);

    const safeLeastAnswerId = Number.isNaN(normalizedLeastAnswerId)
      ? null
      : normalizedLeastAnswerId;

    // ============================================================
    // METADATA — per-question deltas, not cumulative totals
    // ============================================================
    const metadataColumn = {
      ...(existing?.metadata || {}),
      tab_switches: parseInt(metadata?.tab_switches, 10) || 0,
      copy_attempts: parseInt(metadata?.copy_attempts, 10) || 0,
      paste_attempts: parseInt(metadata?.paste_attempts, 10) || 0,
      right_click_attempts: parseInt(metadata?.right_click_attempts, 10) || 0,
      violations: parseInt(metadata?.violations, 10) || 0,
      previous_question: parseInt(metadata?.previous_question, 10) || 0,
      is_answer_change: isAnswerChange,
      time_on_question: parseInt(metadata?.time_on_question, 10) || 0
    };

    const now = new Date().toISOString();

    const upsertPayload = {
      session_id: sessionId,
      user_id: userId,
      assessment_id: assessmentId,
      question_id: qid,
      answer_id: String(answer),
      least_answer_id: safeLeastAnswerId,
      time_spent_seconds: parseInt(metadata?.time_spent_seconds, 10) || 0,
      updated_at: now,
      metadata: metadataColumn,
      times_changed: newChangeCount,
      initial_answer_id: isNew
        ? (metadata?.initial_answer_id || String(answer))
        : (existing.initial_answer_id || metadata?.initial_answer_id || String(answer))
    };

    if (isNew) {
      upsertPayload.created_at = now;
      upsertPayload.first_saved_at = now;
    }

    const { data: upsertData, error: upsertError } = await serviceClient
      .from("responses")
      .upsert(upsertPayload, {
        onConflict: "session_id,question_id",
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error("[SaveResponse] Upsert error:", upsertError);
      return res.status(500).json({ success: false, error: upsertError.message });
    }

    const { count } = await serviceClient
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    // ============================================================
    // BUGFIX (Phase 9): ACCUMULATE time instead of overwriting.
    //
    // Old behavior: `total_time_spent` was set to the CURRENT
    // question's time, so after 100 questions it showed the time
    // spent on the last question only (~2 minutes).
    //
    // New behavior: read the current accumulated total and add the
    // new delta. Also mirror into `time_spent_seconds` — that column
    // was never being set, which caused the funnel analytics to show
    // null or near-zero averages.
    // ============================================================
    const newDeltaSeconds = parseInt(metadata?.time_spent_seconds, 10) || 0;
    const previousTotal = Number(session.total_time_spent) || 0;
    const previousTracked = Number(session.time_spent_seconds) || 0;
    const accumulatedTotal = previousTotal + newDeltaSeconds;

    await serviceClient
      .from("assessment_sessions")
      .update({
        answered_questions: count || 0,
        updated_at: now,
        total_time_spent: accumulatedTotal,
        time_spent_seconds: Math.max(previousTracked, accumulatedTotal),
        last_activity: now
      })
      .eq("id", sessionId);

    return res.status(200).json({
      success: true,
      data: upsertData,
      isNewResponse: isNew,
      isAnswerChange: isAnswerChange,
      timesChanged: newChangeCount,
      hasLeastAnswer: safeLeastAnswerId !== null,
      hasBehavioralData: metadataColumn.violations > 0 || metadataColumn.tab_switches > 0
    });

  } catch (error) {
    console.error("[SaveResponse] Unhandled error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
