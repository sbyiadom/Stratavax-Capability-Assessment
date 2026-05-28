// pages/api/supervisor/grant-report-access.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { candidateId, assessmentId, targetSupervisorId, expiresInDays } = req.body;

    if (!candidateId || !assessmentId || !targetSupervisorId) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Verify the requesting user is a supervisor or admin
    const { data: supervisorProfile, error: profileError } = await supabase
      .from("supervisor_profiles")
      .select("id, role, is_active, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !supervisorProfile || (supervisorProfile.role !== "supervisor" && supervisorProfile.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Only supervisors can grant access" });
    }

    // Verify target supervisor exists
    const { data: targetSupervisor, error: targetError } = await supabase
      .from("supervisor_profiles")
      .select("id, email, full_name")
      .eq("id", targetSupervisorId)
      .single();

    if (targetError || !targetSupervisor) {
      return res.status(404).json({ success: false, error: "Target supervisor not found" });
    }

    // Calculate expiration date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Grant access
    const { data, error: insertError } = await supabase
      .from("shared_report_access")
      .upsert({
        candidate_id: candidateId,
        assessment_id: assessmentId,
        granted_by: user.id,
        granted_to: targetSupervisorId,
        permission: "view",
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ success: false, error: insertError.message });
    }

    // Get candidate name
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("full_name, email")
      .eq("id", candidateId)
      .single();

    // Get assessment title
    const { data: assessment } = await supabase
      .from("assessments")
      .select("title")
      .eq("id", assessmentId)
      .single();

    // Create notification for target supervisor
    await supabase.from("supervisor_notifications").insert({
      supervisor_id: targetSupervisorId,
      user_id: candidateId,
      assessment_id: assessmentId,
      message: `${supervisorProfile.full_name || "A supervisor"} has granted you access to view ${candidate?.full_name || "a candidate"}'s ${assessment?.title || "assessment"} report.`,
      status: "unread",
      priority: "normal",
      created_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Access granted to ${targetSupervisor.full_name}`,
      data: { ...data, granted_to_name: targetSupervisor.full_name }
    });

  } catch (error) {
    console.error("Grant access error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
