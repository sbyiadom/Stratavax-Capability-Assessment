// pages/api/assessment/responses.js - WITH FORCED-CHOICE SUPPORT
//
// Phase 5 change:
// - When a response has a least_answer_id, the answerMap value for that
//   question is returned as { most, least } instead of a bare answer_id.
// - Callers that see an object value know the assessment is forced-choice.
// - Single-select responses continue to return a plain answer_id.
// - Added a scoringMode field to the response envelope so callers can
//   make display decisions without a second lookup.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { sessionId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!sessionId) {
    return res.status(400).json({ success: false, error: "Missing sessionId" });
  }

  try {
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

    // Verify the user owns this session
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    // Look up the session to confirm ownership and resolve scoring_mode.
    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, assessment_type_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Resolve scoring_mode for the assessment type (for informational use).
    let scoringMode = "single_select";
    if (session.assessment_type_id) {
      const { data: typeRow, error: typeErr } = await serviceClient
        .from("assessment_types")
        .select("scoring_mode")
        .eq("id", session.assessment_type_id)
        .maybeSingle();

      if (!typeErr && typeRow?.scoring_mode) {
        scoringMode = typeRow.scoring_mode;
      }
    }

    // Fetch responses. least_answer_id only exists on rows written after
    // the Phase 5 migration; older rows will have it as null.
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, least_answer_id, initial_answer_id, times_changed")
      .eq("session_id", sessionId);

    if (responsesError) {
      return res.status(500).json({ success: false, error: responsesError.message });
    }

    // Build maps.
    const answerMap = {};
    const initialAnswerMap = {};
    const changeCountMap = {};

    (responses || []).forEach(r => {
      if (!r.question_id) return;

      // Forced-choice: answerMap[qid] = { most, least }
      if (r.least_answer_id !== null && r.least_answer_id !== undefined) {
        answerMap[r.question_id] = {
          most: r.answer_id,
          least: r.least_answer_id
        };
      } else {
        // Single-select (or forced-choice row that hasn't been finished yet):
        // answerMap[qid] = answer_id (plain)
        answerMap[r.question_id] = r.answer_id;
      }

      if (r.initial_answer_id !== null && r.initial_answer_id !== undefined) {
        initialAnswerMap[r.question_id] = r.initial_answer_id;
      }

      changeCountMap[r.question_id] = r.times_changed || 0;
    });

    return res.status(200).json({
      success: true,
      scoringMode: scoringMode,
      responses: {
        answerMap,
        initialAnswerMap,
        changeCountMap,
        count: (responses || []).length
      }
    });

  } catch (error) {
    console.error("Error fetching responses:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
