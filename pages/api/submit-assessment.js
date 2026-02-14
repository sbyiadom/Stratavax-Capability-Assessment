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

    // ===== GET ASSESSMENT DETAILS =====
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, name, assessment_type, assessment_code, passing_score")
      .eq("id", assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return res.status(404).json({
        success: false,
        error: "Assessment not found"
      });
    }

    // Determine assessment type and max score
    const assessmentType = assessment.assessment_type || 'general';
    const maxScore = assessmentType === 'general' ? 500 : 100;

    // ===== CHECK IF ALREADY SUBMITTED =====
    // Check in candidate_assessments_taken table
    const { data: existingSubmission, error: submissionCheckError } = await supabase
      .from("candidate_assessments_taken")
      .select("id, status, completed_at")
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .eq("status", "completed")
      .maybeSingle();

    if (submissionCheckError) {
      console.error("Error checking submission:", submissionCheckError);
    }

    // Block if already submitted
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false,
        error: `❌ ${assessment.name} already submitted. One attempt only allowed per candidate.`,
        assessment_type: assessmentType
      });
    }

    // ===== CALCULATE SCORES =====
    let scoreData = null;
    let responses = null;
    
    if (result_id) {
      // Get responses from assessment_results
      const { data: result, error: resultError } = await supabase
        .from("assessment_results")
        .select("responses, category_scores, time_spent")
        .eq("id", result_id)
        .single();

      if (!resultError && result) {
        responses = result.responses;
        
        // Get all questions for this assessment to calculate scores
        const { data: questions } = await supabase
          .from("questions")
          .select(`
            id,
            section,
            subsection,
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
            assessmentType
          );
        }
      }
    }

    // ===== UPDATE ASSESSMENT_RESULTS =====
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
          assessment_type: assessmentType,
          assessment_name: assessment.name,
          max_score: maxScore,
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

    // ===== INSERT INTO CANDIDATE_ASSESSMENTS_TAKEN =====
    const { error: takenError } = await supabase
      .from("candidate_assessments_taken")
      .insert({
        user_id,
        assessment_id,
        assessment_type: assessmentType,
        assessment_name: assessment.name,
        result_id: result_id || null,
        status: "completed",
        completed_at: new Date().toISOString(),
        score: scoreData?.overallScore || 0
      });

    if (takenError) {
      // Unique constraint violation means duplicate submission
      if (takenError.code === '23505') {
        return res.status(400).json({ 
          success: false,
          error: "Assessment already submitted. Please do not refresh or resubmit." 
        });
      }
      console.error("Error inserting into candidate_assessments_taken:", takenError);
    }

    // ===== UPDATE ASSESSMENTS_COMPLETED FOR BACKWARD COMPATIBILITY =====
    // Only for general assessment to maintain backward compatibility
    if (assessmentType === 'general') {
      const { error: completionError } = await supabase
        .from("assessments_completed")
        .insert({
          user_id,
          assessment_id,
          completed_at: new Date().toISOString(),
          status: 'completed',
          score: scoreData?.overallScore || 0,
          assessment_type: assessmentType
        });

      if (completionError && completionError.code !== '23505') {
        console.error("Completion insert error:", completionError);
      }

      // Update assessments table for backward compatibility
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
    }

    // ===== UPDATE TALENT CLASSIFICATION FOR GENERAL ASSESSMENT =====
    if (assessmentType === 'general' && scoreData?.overallScore) {
      const classification = 
        scoreData.overallScore >= 450 ? 'Elite Talent' :
        scoreData.overallScore >= 400 ? 'Top Talent' :
        scoreData.overallScore >= 350 ? 'High Potential' :
        scoreData.overallScore >= 300 ? 'Solid Performer' :
        scoreData.overallScore >= 250 ? 'Developing Talent' :
        scoreData.overallScore >= 200 ? 'Emerging Talent' : 'Needs Improvement';

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
        .from("auth.users")
        .select("email, raw_user_meta_data")
        .eq("id", user_id)
        .single();

      // Get all supervisors
      const { data: supervisors } = await supabase
        .from("supervisors")
        .select("id, email");

      if (supervisors && supervisors.length > 0) {
        const notifications = supervisors.map(sup => ({
          supervisor_id: sup.id,
          user_id: user_id,
          user_name: userData?.raw_user_meta_data?.full_name || 'Candidate',
          user_email: userData?.email || '',
          assessment_id: assessment_id,
          assessment_name: assessment.name,
          assessment_type: assessmentType,
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

    // ===== RETURN SUCCESS RESPONSE WITH ASSESSMENT TYPE =====
    return res.status(200).json({ 
      success: true,
      message: `✅ ${assessment.name} submitted successfully!`,
      assessment_type: assessmentType,
      assessment_name: assessment.name,
      score: scoreData?.overallScore || 0,
      max_score: maxScore,
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
