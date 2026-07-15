// pages/api/assessment/session.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { assessmentId, assessmentTypeId, durationMinutes } = req.body;
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: "Missing assessmentId" });
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

    // Check for existing in-progress session
    const { data: existingSession, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (!sessionError && existingSession) {
      return res.status(200).json({
        success: true,
        session: existingSession,
        isNew: false
      });
    }

    // Create new session
    const duration = durationMinutes || 180;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    const { data: newSession, error: createError } = await serviceClient
      .from("assessment_sessions")
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: assessmentTypeId || null,
        status: "in_progress",
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        total_questions: 0,
        answered_questions: 0,
        time_spent_seconds: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error("Create session error:", createError);
      return res.status(500).json({ success: false, error: createError.message });
    }

    // Update candidate_assessments with session_id
    await serviceClient
      .from("candidate_assessments")
      .update({
        session_id: newSession.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    return res.status(200).json({
      success: true,
      session: newSession,
      isNew: true
    });

  } catch (error) {
    console.error("Error creating session:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
