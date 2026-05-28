// pages/api/supervisor/revoke-report-access.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { candidateId, assessmentId, targetSupervisorId } = req.body;

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
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !supervisorProfile || (supervisorProfile.role !== "supervisor" && supervisorProfile.role !== "admin")) {
      return res.status(403).json({ success: false, error: "Only supervisors can revoke access" });
    }

    // Delete the shared access record
    const { error: deleteError } = await supabase
      .from("shared_report_access")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("assessment_id", assessmentId)
      .eq("granted_to", targetSupervisorId)
      .eq("granted_by", user.id);

    if (deleteError) {
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    return res.status(200).json({
      success: true,
      message: "Access revoked successfully"
    });

  } catch (error) {
    console.error("Revoke access error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
