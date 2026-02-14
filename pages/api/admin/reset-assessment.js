import { supabase } from "../../../supabase/client";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  try {
    const { 
      user_id, 
      assessment_id, 
      session_id,
      reset_reason,
      admin_id,
      admin_email,
      admin_name 
    } = req.body;

    // Validate required fields
    if (!user_id || !assessment_id || !admin_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: user_id, assessment_id, and admin_id are required" 
      });
    }

    // ===== STEP 1: Verify the admin has permission =====
    const { data: adminData, error: adminError } = await supabase
      .from("supervisors")
      .select("id, email, full_name")
      .eq("id", admin_id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ 
        success: false, 
        error: "Unauthorized: Admin not found" 
      });
    }

    // ===== STEP 2: Get the existing completed assessment =====
    // Try to find by session_id first, then by user_id and assessment_id
    let query = supabase
      .from("assessment_sessions")
      .select(`
        *,
        assessment:assessments!inner(
          id,
          title,
          assessment_type:assessment_types!inner(
            id,
            code,
            name,
            max_score,
            time_limit_minutes
          )
        ),
        result:assessment_results(*)
      `)
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .eq("status", "completed");

    if (session_id) {
      query = query.eq("id", session_id);
    }

    const { data: sessions, error: fetchError } = await query
      .order("completed_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error fetching assessment session:", fetchError);
      return res.status(404).json({ 
        success: false, 
        error: "Completed assessment not found for this user" 
      });
    }

    const session = sessions?.[0];
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: "No completed assessment session found" 
      });
    }

    const existingResult = session.result;

    // ===== STEP 3: Update the existing session to mark it as reset =====
    const { error: sessionUpdateError } = await supabase
      .from("assessment_sessions")
      .update({
        status: "reset",
        reset_count: (session.reset_count || 0) + 1,
        reset_by: admin_id,
        reset_at: new Date().toISOString(),
        reset_reason: reset_reason || "Reset by administrator",
        updated_at: new Date().toISOString()
      })
      .eq("id", session.id);

    if (sessionUpdateError) {
      console.error("Error updating assessment session:", sessionUpdateError);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to reset assessment session" 
      });
    }

    // ===== STEP 4: Update the existing result to mark it as reset =====
    if (existingResult) {
      const { error: resultUpdateError } = await supabase
        .from("assessment_results")
        .update({
          status: "reset",
          reset_count: (existingResult.reset_count || 0) + 1,
          reset_by: admin_id,
          reset_at: new Date().toISOString(),
          reset_reason: reset_reason || "Reset by administrator",
          original_completed_at: existingResult.completed_at,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingResult.id);

      if (resultUpdateError) {
        console.error("Error updating assessment result:", resultUpdateError);
        // Continue anyway, main action is logged
      }
    }

    // ===== STEP 5: Create a new session for the retake =====
    const timeLimitMinutes = session.assessment?.assessment_type?.time_limit_minutes || 60;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + timeLimitMinutes);

    const { data: newSession, error: sessionInsertError } = await supabase
      .from("assessment_sessions")
      .insert([{
        user_id: user_id,
        assessment_id: assessment_id,
        assessment_type_id: session.assessment?.assessment_type?.id,
        status: "not_started",
        reset_count: (session.reset_count || 0) + 1,
        reset_by: admin_id,
        reset_at: new Date().toISOString(),
        reset_reason: reset_reason || "Reset by administrator",
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (sessionInsertError) {
      console.error("Error creating new session:", sessionInsertError);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to create retake session" 
      });
    }

    // ===== STEP 6: Create a new result entry for the retake =====
    const { data: newResult, error: resultInsertError } = await supabase
      .from("assessment_results")
      .insert([{
        session_id: newSession.id,
        user_id: user_id,
        user_email: existingResult?.user_email || (await supabase.auth.admin.getUserById(user_id)).data?.user?.email,
        user_name: existingResult?.user_name || (await supabase.auth.admin.getUserById(user_id)).data?.user?.user_metadata?.full_name || 'Candidate',
        assessment_id: assessment_id,
        assessment_type_id: session.assessment?.assessment_type?.id,
        status: "not_started",
        total_score: 0,
        max_score: session.assessment?.assessment_type?.max_score || 100,
        time_spent: 0,
        category_scores: {},
        responses: {},
        strengths: [],
        weaknesses: [],
        recommendations: [],
        risk_level: "unknown",
        readiness: "pending",
        reset_count: (session.reset_count || 0) + 1,
        reset_by: admin_id,
        reset_at: new Date().toISOString(),
        reset_reason: reset_reason || "Reset by administrator",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (resultInsertError) {
      console.error("Error creating new result:", resultInsertError);
      // Still have the session, so not critical
    }

    // ===== STEP 7: Update candidate_assessments =====
    const { error: candidateUpdateError } = await supabase
      .from("candidate_assessments")
      .upsert({
        user_id: user_id,
        assessment_id: assessment_id,
        assessment_type_id: session.assessment?.assessment_type?.id,
        session_id: newSession.id,
        result_id: newResult?.id,
        status: "not_started",
        score: 0,
        reset_count: (session.reset_count || 0) + 1,
        reset_by: admin_id,
        reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,assessment_id'
      });

    if (candidateUpdateError) {
      console.error("Error updating candidate assessments:", candidateUpdateError);
    }

    // ===== STEP 8: Log the admin action =====
    const { error: logError } = await supabase
      .from("supervisor_notifications")  // Using supervisor_notifications for audit log
      .insert([{
        supervisor_id: admin_id,
        user_id: user_id,
        assessment_id: assessment_id,
        session_id: newSession.id,
        result_id: newResult?.id,
        message: `Assessment reset by ${adminData.full_name || adminData.email}`,
        details: {
          action: "reset_assessment",
          reset_reason: reset_reason || "Reset by administrator",
          previous_session_id: session.id,
          previous_result_id: existingResult?.id,
          previous_score: existingResult?.total_score,
          reset_count: (session.reset_count || 0) + 1,
          previous_completed_at: session.completed_at
        },
        status: "read",  // Mark as read since it's an admin action
        created_at: new Date().toISOString()
      }]);

    if (logError) {
      console.error("Error logging admin action:", logError);
      // Don't fail the request, just log the error
    }

    // ===== STEP 9: Delete any existing progress data =====
    try {
      await supabase
        .from("assessment_progress")
        .delete()
        .eq("user_id", user_id)
        .eq("assessment_id", assessment_id);

      await supabase
        .from("responses")
        .delete()
        .eq("session_id", session.id);  // Only delete responses from old session
    } catch (e) {
      console.error("Error cleaning up progress data:", e);
      // Non-critical, continue
    }

    return res.status(200).json({
      success: true,
      message: "Assessment reset successfully. Candidate can now retake the assessment.",
      data: {
        new_session_id: newSession.id,
        new_result_id: newResult?.id,
        reset_count: (session.reset_count || 0) + 1,
        reset_at: new Date().toISOString(),
        assessment_name: session.assessment?.title,
        assessment_type: session.assessment?.assessment_type?.code,
        time_limit_minutes: session.assessment?.assessment_type?.time_limit_minutes
      }
    });

  } catch (error) {
    console.error("Reset assessment error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error: " + error.message 
    });
  }
}
