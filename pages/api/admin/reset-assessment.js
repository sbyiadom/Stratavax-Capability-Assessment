// pages/api/admin/reset-assessment.js
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
    // Check if the admin exists in supervisors table
    const { data: adminData, error: adminError } = await supabase
      .from("supervisors")
      .select("id, email, name")
      .eq("id", admin_id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ 
        success: false, 
        error: "Unauthorized: Admin not found" 
      });
    }

    // ===== STEP 2: Get the existing completed assessment =====
    const { data: existingResult, error: fetchError } = await supabase
      .from("assessment_results")
      .select(`
        *,
        assessments (
          name
        )
      `)
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error("Error fetching assessment result:", fetchError);
      return res.status(404).json({ 
        success: false, 
        error: "Completed assessment not found for this user" 
      });
    }

    // ===== STEP 3: Update the existing record to mark it as reset =====
    const { error: updateError } = await supabase
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

    if (updateError) {
      console.error("Error updating assessment result:", updateError);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to reset assessment" 
      });
    }

    // ===== STEP 4: Create a new entry for the retake =====
    const { data: newResult, error: insertError } = await supabase
      .from("assessment_results")
      .insert([{
        user_id: user_id,
        user_email: existingResult.user_email,
        user_name: existingResult.user_name,
        assessment_id: assessment_id,
        status: "in_progress",
        overall_score: 0,
        time_spent: 0,
        category_scores: {},
        responses: {},
        strengths: [],
        weaknesses: [],
        risk_level: "unknown",
        readiness: "pending",
        reset_count: (existingResult.reset_count || 0) + 1,
        reset_by: admin_id,
        reset_at: new Date().toISOString(),
        reset_reason: reset_reason || "Reset by administrator",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating new assessment entry:", insertError);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to create retake entry" 
      });
    }

    // ===== STEP 5: Log the admin action =====
    const { error: logError } = await supabase
      .from("admin_actions")
      .insert([{
        admin_id: admin_id,
        admin_email: adminData.email,
        admin_name: adminData.name || adminData.email,
        action_type: "reset_assessment",
        target_user_id: user_id,
        target_user_email: existingResult.user_email,
        target_assessment_id: assessment_id,
        target_assessment_name: existingResult.assessments?.name || "Assessment",
        details: {
          reset_reason: reset_reason || "Reset by administrator",
          previous_score: existingResult.overall_score,
          reset_count: (existingResult.reset_count || 0) + 1,
          previous_completed_at: existingResult.completed_at
        },
        created_at: new Date().toISOString()
      }]);

    if (logError) {
      console.error("Error logging admin action:", logError);
      // Don't fail the request, just log the error
    }

    // ===== STEP 6: Also update assessments_completed table if it exists =====
    try {
      await supabase
        .from("assessments_completed")
        .update({
          status: 'reset',
          reset_at: new Date().toISOString(),
          reset_by: admin_id
        })
        .eq("user_id", user_id)
        .eq("assessment_id", assessment_id);
    } catch (e) {
      console.error("Error updating assessments_completed:", e);
      // Non-critical, continue
    }

    return res.status(200).json({
      success: true,
      message: "Assessment reset successfully. Candidate can now retake the assessment.",
      data: {
        new_result_id: newResult.id,
        reset_count: (existingResult.reset_count || 0) + 1,
        reset_at: new Date().toISOString()
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
