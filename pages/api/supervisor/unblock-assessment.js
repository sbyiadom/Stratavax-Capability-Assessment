import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, assessmentId, extendMinutes, resetTime = false } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`🔓 Unblocking assessment for user: ${userId}, assessment: ${assessmentId}`);
    console.log(`⏰ Time extension: ${extendMinutes || 0} minutes, Reset time: ${resetTime}`);

    // 1. Check if there's an existing in-progress session
    const { data: existingSession, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, status, time_spent_seconds, created_at, expires_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (sessionError) {
      console.error("❌ Error checking session:", sessionError);
    }

    let newExpiresAt = null;
    let timeExtensionApplied = 0;

    // 2. Handle time extension
    if (existingSession && (extendMinutes > 0 || resetTime)) {
      const currentExpiresAt = new Date(existingSession.expires_at);
      const now = new Date();
      
      if (resetTime) {
        // Reset to full time (3 hours = 180 minutes)
        newExpiresAt = new Date(now);
        newExpiresAt.setMinutes(now.getMinutes() + 180);
        timeExtensionApplied = 180;
        console.log(`⏰ Time reset to full 3 hours`);
      } else if (extendMinutes > 0) {
        // Extend by specified minutes
        newExpiresAt = new Date(currentExpiresAt);
        newExpiresAt.setMinutes(currentExpiresAt.getMinutes() + extendMinutes);
        timeExtensionApplied = extendMinutes;
        console.log(`⏰ Extended by ${extendMinutes} minutes`);
      }

      // Update session with new expiration
      if (newExpiresAt) {
        const { error: updateSessionError } = await supabase
          .from('assessment_sessions')
          .update({ 
            expires_at: newExpiresAt.toISOString(),
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSession.id);

        if (updateSessionError) {
          console.error("❌ Error updating session time:", updateSessionError);
        } else {
          console.log(`✅ Session time extended. New expiry: ${newExpiresAt.toISOString()}`);
        }
      }
    }

    // 3. Update candidate_assessments to unblocked
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

    // 4. If there's no session but we have time extension, create a new session
    if (!existingSession && (extendMinutes > 0 || resetTime)) {
      const timeLimit = 180; // Default 3 hours
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + timeLimit);
      
      const { error: createSessionError } = await supabase
        .from('assessment_sessions')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          time_spent_seconds: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createSessionError) {
        console.error("❌ Error creating new session:", createSessionError);
      } else {
        console.log("✅ New session created with time limit");
      }
    }

    // 5. Optional: Add audit log
    try {
      await supabase
        .from('assessment_audit_logs')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          action: 'unblock',
          performed_by: req.headers['x-user-id'] || 'admin',
          timestamp: new Date().toISOString(),
          details: {
            hadExistingSession: !!existingSession,
            timeExtensionMinutes: timeExtensionApplied,
            resetTime: resetTime,
            newExpiry: newExpiresAt?.toISOString()
          }
        });
      console.log("✅ Audit log created");
    } catch (auditError) {
      console.error("⚠️ Failed to create audit log:", auditError);
    }

    // 6. Return session info
    const { data: finalSession } = await supabase
      .from('assessment_sessions')
      .select('id, status, time_spent_seconds, expires_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    console.log("✅ Assessment unblocked successfully");

    return res.status(200).json({ 
      success: true,
      hasExistingProgress: !!existingSession,
      session: finalSession,
      timeExtensionApplied: timeExtensionApplied,
      message: existingSession 
        ? `Assessment unblocked. Candidate can continue from where they left off. ${timeExtensionApplied > 0 ? `Time extended by ${timeExtensionApplied} minutes.` : ''}`
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
