// pages/api/assessment/session.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { assessmentId, assessmentTypeId, durationMinutes } = req.body;

    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;

    // Check for existing in-progress session
    const { data: existingSession } = await serviceClient
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (existingSession) {
      return res.status(200).json({ success: true, session: existingSession });
    }

    // Get assessment
    const { data: assessment } = await serviceClient
      .from('assessments')
      .select('id, assessment_type_id, assessment_type:assessment_types(*)')
      .eq('id', assessmentId)
      .single();

    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    // Get question count
    const questionCount = assessment.assessment_type?.question_count || 40;

    // Create session
    const duration = durationMinutes || 120;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    const { data: newSession, error: createError } = await serviceClient
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: assessment.assessment_type_id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        time_spent_seconds: 0,
        total_questions: questionCount,
        answered_questions: 0,
        violation_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({ success: false, error: createError.message });
    }

    // Update candidate_assessments
    await serviceClient
      .from('candidate_assessments')
      .update({
        session_id: newSession.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    return res.status(200).json({ success: true, session: newSession });

  } catch (error) {
    console.error('[Session] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
