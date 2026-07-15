// pages/api/assessment/submit.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, autoSubmitted, autoSubmitReason, allowIncomplete, answers } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
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

    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // Update session status
    await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    // Update candidate_assessments
    await serviceClient
      .from("candidate_assessments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id);

    // Get or create result
    const { data: existingResult, error: resultError } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id)
      .maybeSingle();

    let resultId;
    if (resultError || !existingResult) {
      const { data: newResult, error: createResultError } = await serviceClient
        .from("assessment_results")
        .insert({
          user_id: session.user_id,
          assessment_id: session.assessment_id,
          session_id: sessionId,
          total_score: 0,
          max_score: 0,
          percentage_score: 0,
          completed_at: new Date().toISOString(),
          is_valid: true,
          is_auto_submitted: autoSubmitted || false
        })
        .select()
        .single();

      if (!createResultError && newResult) {
        resultId = newResult.id;
      }
    } else {
      resultId = existingResult.id;
    }

    return res.status(200).json({
      success: true,
      resultId: resultId,
      sessionId: sessionId,
      isAutoSubmitted: autoSubmitted || false
    });

  } catch (error) {
    console.error("Error submitting assessment:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
