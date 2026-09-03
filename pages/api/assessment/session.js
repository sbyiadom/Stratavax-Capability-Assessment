// pages/api/assessment/session.js - FULLY CORRECTED
// Persists assessment_id when creating or reusing sessions

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { assessmentId, assessmentTypeId, durationMinutes } = req.body;

    if (!assessmentId || !assessmentTypeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing assessmentId or assessmentTypeId'
      });
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

    // ============================================================
    // STEP 1: Check for existing in-progress session
    // ============================================================
    const { data: existingSession, error: existingError } = await serviceClient
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)  // ← MUST match assessment_id
      .eq('status', 'in_progress')
      .maybeSingle();

    if (existingError) {
      console.error('[Session] Existing session error:', existingError);
    }

    if (existingSession) {
      console.log('[Session] Reusing existing session:', existingSession.id);
      return res.status(200).json({
        success: true,
        session: existingSession
      });
    }

    // ============================================================
    // STEP 2: Create new session with assessment_id
    // ============================================================
    const duration = durationMinutes || 120;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    // Get question count for the assessment
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('id, assessment_type_id, assessment_type:assessment_types(*)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      console.error('[Session] Assessment lookup error:', assessmentError);
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    const questionCount = assessment.assessment_type?.question_count || 40;

    // ============================================================
    // STEP 3: Insert session with BOTH assessment_id and assessment_type_id
    // ============================================================
    const { data: newSession, error: createError } = await serviceClient
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_id: assessmentId,          // ← CRITICAL: Persist the actual assessment ID
        assessment_type_id: assessmentTypeId,
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
      console.error('[Session] Create error:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create session',
        details: createError.message
      });
    }

    console.log('[Session] Created new session:', newSession.id, 'for assessment:', assessmentId);

    return res.status(200).json({
      success: true,
      session: newSession
    });

  } catch (error) {
    console.error('[Session] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
