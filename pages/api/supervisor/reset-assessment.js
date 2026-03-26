import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`🔄 Resetting assessment for user: ${userId}, assessment: ${assessmentId}`);

    // 1. Delete existing assessment results
    const { error: resultsError } = await supabase
      .from('assessment_results')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (resultsError) {
      console.error("❌ Error deleting assessment results:", resultsError);
    } else {
      console.log("✅ Assessment results deleted");
    }

    // 2. Delete all responses for this user/assessment
    const { error: responsesError } = await supabase
      .from('responses')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Error deleting responses:", responsesError);
    } else {
      console.log("✅ Responses deleted");
    }

    // 3. Delete assessment sessions
    const { error: sessionError } = await supabase
      .from('assessment_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (sessionError) {
      console.error("❌ Error deleting session:", sessionError);
    } else {
      console.log("✅ Assessment sessions deleted");
    }

    // 4. Delete progress data
    const { error: progressError } = await supabase
      .from('assessment_progress')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (progressError) {
      console.error("❌ Error deleting progress:", progressError);
    } else {
      console.log("✅ Progress data deleted");
    }

    // 5. UPDATE candidate_assessments instead of DELETE
    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('candidate_assessments')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking candidate_assessments:", checkError);
    }

    if (existingRecord) {
      // Update existing record to unblocked
      const { error: updateError } = await supabase
        .from('candidate_assessments')
        .update({ 
          status: 'unblocked',
          unblocked_at: new Date().toISOString(),
          result_id: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('assessment_id', assessmentId);

      if (updateError) {
        console.error("❌ Error updating candidate_assessments:", updateError);
      } else {
        console.log("✅ Candidate assessment updated to unblocked");
      }
    } else {
      // Create new record if it doesn't exist
      const { error: insertError } = await supabase
        .from('candidate_assessments')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          status: 'unblocked',
          unblocked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("❌ Error inserting candidate_assessments:", insertError);
      } else {
        console.log("✅ Candidate assessment created with unblocked status");
      }
    }

    // 6. Optional: Add audit log for reset action
    try {
      await supabase
        .from('assessment_audit_logs')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          action: 'reset',
          performed_by: req.headers['x-user-id'] || 'admin',
          timestamp: new Date().toISOString(),
          details: 'Assessment reset by supervisor/admin'
        });
      console.log("✅ Audit log created");
    } catch (auditError) {
      console.error("⚠️ Failed to create audit log:", auditError);
      // Don't fail the request if audit fails
    }

    console.log("✅ Assessment reset successfully");

    return res.status(200).json({ 
      success: true, 
      message: "Assessment reset successfully. Candidate can now retake it." 
    });

  } catch (err) {
    console.error("❌ Error resetting assessment:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
