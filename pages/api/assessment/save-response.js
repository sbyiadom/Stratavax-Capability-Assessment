// pages/api/assessment/save-response.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, questionId, answer, metadata } = req.body;

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

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    // Get session to get assessment_id
    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("assessment_id, user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const assessmentId = session.assessment_id;

    // Check if response exists
    const { data: existing, error: existingError } = await serviceClient
      .from("responses")
      .select("id, answer_id, times_changed, initial_answer_id")
      .eq("session_id", sessionId)
      .eq("question_id", parseInt(questionId, 10))
      .maybeSingle();

    const isNew = !existing;
    const isAnswerChange = existing ? String(existing.answer_id) !== String(answer) : false;
    const newChangeCount = isNew ? 0 : (existing.times_changed || 0) + (isAnswerChange ? 1 : 0);

    const responseData = {
      session_id: sessionId,
      user_id: userId,
      assessment_id: assessmentId,
      question_id: parseInt(questionId, 10),
      answer_id: String(answer),
      time_spent_seconds: metadata?.time_spent_seconds || 0,
      updated_at: new Date().toISOString()
    };

    if (isNew) {
      responseData.created_at = new Date().toISOString();
      responseData.first_saved_at = new Date().toISOString();
      responseData.times_changed = 0;
      responseData.initial_answer_id = metadata?.initial_answer_id || String(answer);
    } else {
      responseData.times_changed = newChangeCount;
      responseData.initial_answer_id = existing.initial_answer_id || metadata?.initial_answer_id || String(answer);
    }

    let result;
    if (isNew) {
      result = await serviceClient.from("responses").insert(responseData).select();
    } else {
      result = await serviceClient
        .from("responses")
        .update(responseData)
        .eq("id", existing.id)
        .select();
    }

    if (result.error) {
      return res.status(500).json({ success: false, error: result.error.message });
    }

    // Update session answered count
    const { count } = await serviceClient
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    await serviceClient
      .from("assessment_sessions")
      .update({ answered_questions: count || 0, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return res.status(200).json({
      success: true,
      data: result.data,
      isNewResponse: isNew,
      isAnswerChange: isAnswerChange,
      timesChanged: newChangeCount
    });

  } catch (error) {
    console.error("Error saving response:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
