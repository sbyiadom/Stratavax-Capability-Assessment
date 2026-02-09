import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assessment_id, user_id } = req.body;
    if (!assessment_id || !user_id) {
      return res.status(400).json({ 
        success: false,
        error: "assessment_id and user_id required" 
      });
    }

    // ===== CHECK 1: assessments_completed table =====
    const { data: existingCompletion, error: checkError } = await supabase
      .from("assessments_completed")
      .select("id, completed_at")
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking completion:", checkError);
      return res.status(500).json({ 
        success: false,
        error: "Error checking submission status" 
      });
    }

    // Block if already submitted
    if (existingCompletion) {
      return res.status(400).json({ 
        success: false,
        error: "❌ Assessment already submitted. One attempt only allowed per candidate." 
      });
    }

    // ===== CHECK 2: assessments table (backward compatibility) =====
    const { data: assessmentData } = await supabase
      .from("assessments")
      .select("status, submitted_at")
      .eq("id", assessment_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (assessmentData?.status === 'submitted' || assessmentData?.submitted_at) {
      return res.status(400).json({ 
        success: false,
        error: "❌ Assessment already submitted. You cannot retake it." 
      });
    }

    // ===== MARK AS SUBMITTED (ATOMIC OPERATION) =====
    
    // 1. Insert into assessments_completed (unique constraint prevents duplicates)
    const { error: completionError } = await supabase
      .from("assessments_completed")
      .insert({
        user_id,
        assessment_id,
        completed_at: new Date().toISOString(),
        status: 'completed'
      });

    if (completionError) {
      // Unique constraint violation means duplicate submission
      if (completionError.code === '23505') {
        return res.status(400).json({ 
          success: false,
          error: "Assessment already submitted. Please do not refresh or resubmit." 
        });
      }
      throw completionError;
    }

    // 2. Update assessments table for backward compatibility
    const { error: assessmentError } = await supabase
      .from("assessments")
      .update({
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq("id", assessment_id)
      .eq("user_id", user_id);

    if (assessmentError) {
      console.error("Assessment update error:", assessmentError);
      // Don't fail - assessments_completed was saved successfully
    }

    return res.status(200).json({ 
      success: true,
      message: "✅ Assessment submitted successfully! One attempt completed." 
    });
  } catch (err) {
    console.error("Submit assessment error:", err);
    res.status(500).json({ 
      success: false,
      error: "Submission failed. Please contact support." 
    });
  }
}
