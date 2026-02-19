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
    }

    // 2. Delete candidate assessments record
    const { error: candidateError } = await supabase
      .from('candidate_assessments')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (candidateError) {
      console.error("❌ Error deleting candidate assessments:", candidateError);
    }

    // 3. Delete all responses for this user/assessment
    const { error: responsesError } = await supabase
      .from('responses')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Error deleting responses:", responsesError);
    }

    // 4. Update assessment session to 'reset' or delete it
    const { error: sessionError } = await supabase
      .from('assessment_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (sessionError) {
      console.error("❌ Error deleting session:", sessionError);
    }

    // 5. Delete progress data
    const { error: progressError } = await supabase
      .from('assessment_progress')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (progressError) {
      console.error("❌ Error deleting progress:", progressError);
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
