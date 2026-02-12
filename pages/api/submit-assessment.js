import { supabase } from "../../supabase/client";
import { calculateAssessmentScore } from "../../utils/scoring";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assessment_id, user_id, result_id, time_spent } = req.body;
    
    if (!assessment_id || !user_id) {
      return res.status(400).json({ 
        success: false,
        error: "assessment_id and user_id required" 
      });
    }

    // ===== GET ASSESSMENT TYPE =====
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, name, assessment_type, passing_score")
      .eq("id", assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return res.status(404).json({
        success: false,
        error: "Assessment not found"
      });
    }

    // ===== CHECK 1: assessment_results table =====
    const { data: existingResult, error: resultCheckError } = await supabase
      .from("assessment_results")
      .select("id, status, completed_at")
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .eq("status", "completed")
      .maybeSingle();

    if (resultCheckError) {
      console.error("Error checking completion:", resultCheckError);
      return res.status(500).json({ 
        success: false,
        error: "Error checking submission status" 
      });
    }

    // Block if already submitted
    if (existingResult) {
      return res.status(400).json({ 
        success: false,
        error: `❌ ${assessment.name} already submitted. One attempt only allowed per candidate.`,
        assessment_type: assessment.assessment_type
      });
    }

    // ===== CHECK 2: assessments_completed table (backward compatibility) =====
    const { data: existingCompletion } = await supabase
      .from("assessments_completed")
      .select("id")
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (existingCompletion) {
      return res.status(400).json({ 
        success: false,
        error: "❌ Assessment already submitted. You cannot retake it." 
      });
    }

    // ===== CALCULATE SCORES =====
    let scoreData = null;
    
    if (result_id) {
      // Get responses from assessment_results
      const { data: result, error: resultError } = await supabase
        .from("assessment_results")
        .select("responses, category_scores, time_spent")
        .eq("id", result_id)
        .single();

      if (!resultError && result) {
        // Get all questions for this assessment to calculate scores
        const { data: questions } = await supabase
          .from("questions")
          .select(`
            id,
            section,
            answers (
              id,
              score,
              interpretation,
              trait_category,
              strength_level
            )
          `)
          .eq("assessment_id", assessment_id);

        if (questions) {
          scoreData = await calculateAssessmentScore(
            user_id,
            assessment_id,
            result.responses || {},
            questions,
            assessment.assessment_type
          );
        }
      }
    }

    // ===== MARK AS SUBMITTED =====
    
    // 1. Update assessment_results
    if (result_id) {
      const { error: updateError } = await supabase
        .from("assessment_results")
        .update({
          status: "completed",
          overall_score: scoreData?.overallScore || 0,
          category_scores: scoreData?.categoryScores || {},
          strengths: scoreData?.strengths || [],
          weaknesses: scoreData?.weaknesses || [],
          risk_level: scoreData?.riskLevel || "unknown",
          readiness: scoreData?.readiness || "pending",
          completed_at: new Date().toISOString(),
          time_spent: time_spent || 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", result_id)
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Failed to update assessment result:", updateError);
      }
    }

    // 2. Insert into assessments_completed (for backward compatibility)
    const { error: completionError } = await supabase
      .from("assessments_completed")
      .insert({
        user_id,
        assessment_id,
        completed_at: new Date().toISOString(),
        status: 'completed',
        score: scoreData?.overallScore || 0,
        assessment_type: assessment.assessment_type
      });

    if (completionError) {
      // Unique constraint violation means duplicate submission
      if (completionError.code === '23505') {
        return res.status(400).json({ 
          success: false,
          error: "Assessment already submitted. Please do not refresh or resubmit." 
        });
      }
      console.error("Completion insert error:", completionError);
    }

    // 3. Update assessments table for backward compatibility
    const { error: assessmentUpdateError } = await supabase
      .from("assessments")
      .update({
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq("id", assessment_id)
      .eq("user_id", user_id);

    if (assessmentUpdateError) {
      console.error("Assessment update error:", assessmentUpdateError);
    }

    // ===== UPDATE TALENT CLASSIFICATION FOR GENERAL ASSESSMENT =====
    if (assessment.assessment_type === 'general' && scoreData?.overallScore) {
      const classification = 
        scoreData.overallScore >= 90 ? 'Top Talent' :
        scoreData.overallScore >= 75 ? 'High Potential' :
        scoreData.overallScore >= 60 ? 'Solid Performer' :
        scoreData.overallScore >= 40 ? 'Developing' : 'Needs Improvement';

      await supabase
        .from("talent_classification")
        .upsert({
          user_id: user_id,
          total_score: scoreData.overallScore,
          classification: classification,
          assessment_id: assessment_id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }

    // ===== INSERT INTO SUPERVISOR NOTIFICATIONS =====
    try {
      // Get user details
      const { data: userData } = await supabase
        .from("assessment_results")
        .select("user_name, user_email")
        .eq("user_id", user_id)
        .eq("assessment_id", assessment_id)
        .single();

      // Get all supervisors
      const { data: supervisors } = await supabase
        .from("supervisors")
        .select("id, email");

      if (supervisors && supervisors.length > 0) {
        const notifications = supervisors.map(sup => ({
          supervisor_id: sup.id,
          user_id: user_id,
          user_name: userData?.user_name || 'Candidate',
          user_email: userData?.user_email || '',
          assessment_id: assessment_id,
          assessment_name: assessment.name,
          assessment_type: assessment.assessment_type,
          score: scoreData?.overallScore || 0,
          risk_level: scoreData?.riskLevel || 'unknown',
          readiness: scoreData?.readiness || 'pending',
          status: 'unread',
          created_at: new Date().toISOString()
        }));

        await supabase
          .from("supervisor_notifications")
          .insert(notifications);
      }
    } catch (notifyError) {
      console.error("Failed to create notifications:", notifyError);
      // Don't fail the submission if notifications fail
    }

    return res.status(200).json({ 
      success: true,
      message: `✅ ${assessment.name} submitted successfully! One attempt completed.`,
      assessment_type: assessment.assessment_type,
      score: scoreData?.overallScore || 0,
      risk_level: scoreData?.riskLevel || 'unknown',
      readiness: scoreData?.readiness || 'pending'
    });

  } catch (err) {
    console.error("Submit assessment error:", err);
    res.status(500).json({ 
      success: false,
      error: "Submission failed. Please contact support." 
    });
  }
}
