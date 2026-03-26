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

    console.log(`🔓 Unblocking assessment for user: ${userId}, assessment: ${assessmentId}`);

    // 1. Check if there's an existing in-progress session
    const { data: existingSession, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, status, time_spent_seconds, created_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (sessionError) {
      console.error("❌ Error checking session:", sessionError);
    }

    // 2. Update candidate_assessments to unblocked
    const { data: existingRecord, error: checkError } = await supabase
      .from('candidate_assessments')
      .select('id, status')
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

    // 3. If there's an existing session, make sure it's active
    if (existingSession) {
      console.log(`📝 Found existing session: ${existingSession.id} (${existingSession.status})`);
      
      // If session is blocked or expired, update it to in_progress
      if (existingSession.status !== 'in_progress') {
        const { error: updateSessionError } = await supabase
          .from('assessment_sessions')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSession.id);

        if (updateSessionError) {
          console.error("❌ Error updating session:", updateSessionError);
        } else {
          console.log("✅ Session status updated to in_progress");
        }
      } else {
        console.log("✅ Session already in_progress");
      }
    } else {
      console.log("ℹ️ No existing session found - candidate will start fresh");
    }

    // 4. Optional: Add audit log
    try {
      await supabase
        .from('assessment_audit_logs')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          action: 'unblock',
          performed_by: req.headers['x-user-id'] || 'admin',
          timestamp: new Date().toISOString(),
          details: existingSession ? 'Assessment unblocked - candidate can resume' : 'Assessment unblocked - new session will be created'
        });
      console.log("✅ Audit log created");
    } catch (auditError) {
      console.error("⚠️ Failed to create audit log:", auditError);
    }

    // 5. Return session info if exists
    const { data: finalSession } = await supabase
      .from('assessment_sessions')
      .select('id, status, time_spent_seconds')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    console.log("✅ Assessment unblocked successfully");

    return res.status(200).json({ 
      success: true,
      hasExistingProgress: !!existingSession,
      session: finalSession,
      message: existingSession 
        ? "Assessment unblocked. Candidate can continue from where they left off." 
        : "Assessment unblocked. Candidate can start a new session."
    });

  } catch (err) {
    console.error("❌ Error unblocking assessment:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
