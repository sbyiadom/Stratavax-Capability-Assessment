// pages/api/assessment/access.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { assessmentId } = req.query;
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

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    // Check access - this uses service role, bypasses RLS
    const { data: access, error: accessError } = await serviceClient
      .from("candidate_assessments")
      .select("id, status, result_id, completed_at, unblocked_at, session_id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (accessError) {
      console.error("Access error:", accessError);
      return res.status(500).json({ success: false, error: accessError.message });
    }

    return res.status(200).json({
      success: true,
      access: access || null
    });

  } catch (error) {
    console.error("Error checking access:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
