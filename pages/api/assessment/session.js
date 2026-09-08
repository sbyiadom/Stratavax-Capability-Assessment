// pages/api/assessment/session.js - FULLY CORRECTED
// - Separate assessment lookup (no embedded relationship)
// - Proper error handling
// - Validates candidate assignment before session creation
// - Uses authoritative assessment_type_id from database

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
      console.error('[Session] Missing environment variables');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // ============================================================
    // STEP 1: Verify user
    // ============================================================
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Session] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;

    // ============================================================
    // STEP 2: Get candidate assignment
    // ============================================================
    const { data: candidateAssessment, error: assignmentError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (assignmentError) {
      console.error('[Session] Assignment error:', assignmentError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify assignment',
        diagnosticCode: assignmentError?.code || 'ASSIGNMENT_ERROR'
      });
    }

    // Check if candidate has access
    if (!candidateAssessment) {
      console.error('[Session] No assignment found for user:', userId, 'assessment:', assessmentId);
      return res.status(403).json({
        success: false,
        error: 'Assessment not assigned to this candidate'
      });
    }

    // Check if assessment is blocked
    if (candidateAssessment.status === 'blocked') {
      return res.status(403).json({
        success: false,
        error: 'Assessment is blocked. Please contact your supervisor.'
      });
    }

    // Check if assessment is already completed
    if (candidateAssessment.status === 'completed' || candidateAssessment.result_id) {
      return res.status(409).json({
        success: false,
        error: 'Assessment already completed'
      });
    }

    // ============================================================
    // STEP 3: Get assessment (SEPARATE LOOKUP - NO EMBEDDED RELATIONSHIP)
    // ============================================================
    console.log(`[Session] Looking up assessment: ${assessmentId}`);
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('id, title, assessment_type_id')
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) {
      console.error('[Session] Assessment lookup error:', assessmentError);
      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve assessment',
        diagnosticCode: assessmentError?.code || 'ASSESSMENT_LOOKUP_ERROR'
      });
    }

    if (!assessment) {
      console.error('[Session] Assessment not found:', assessmentId);
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    console.log(`[Session] Assessment found: ${assessment.id} - ${assessment.title}`);

    // ============================================================
    // STEP 4: Resolve assessment type from authoritative source
    // ============================================================
    const resolvedAssessmentTypeId = 
      assessment.assessment_type_id ||
      candidateAssessment.assessment_type_id ||
      Number(assessmentTypeId) ||
      null;

    if (!resolvedAssessmentTypeId) {
      console.error('[Session] Could not resolve assessment type for assessment:', assessmentId);
      return res.status(422).json({
        success: false,
        error: 'Assessment type could not be resolved'
      });
    }

    console.log(`[Session] Resolved assessment type ID: ${resolvedAssessmentTypeId}`);

    // ============================================================
    // STEP 5: Check for existing in-progress session
    // ============================================================
    const { data: existingSession, error: existingError } = await serviceClient
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (existingError) {
      console.error('[Session] Existing session error:', existingError);
    }

    if (existingSession) {
      console.log('[Session] Reusing existing session:', existingSession.id);
      return res.status(200).json({
        success: true,
        session: existingSession,
        isNew: false
      });
    }

    // ============================================================
    // STEP 6: Create new session
    // ============================================================
    const duration = durationMinutes || 120;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    // Get question count for the assessment type
    const { data: assessmentType, error: typeError } = await serviceClient
      .from('assessment_types')
      .select('id, code, name, question_count')
      .eq('id', resolvedAssessmentTypeId)
      .maybeSingle();

    if (typeError) {
      console.error('[Session] Assessment type lookup error:', typeError);
    }

    const questionCount = assessmentType?.question_count || 40;

    const { data: newSession, error: createError } = await serviceClient
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: resolvedAssessmentTypeId,
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
        details: createError.message,
        diagnosticCode: createError?.code || 'SESSION_CREATE_ERROR'
      });
    }

    console.log('[Session] Created new session:', newSession.id, 'for assessment:', assessmentId);

    // ============================================================
    // STEP 7: Update candidate_assessments with session_id
    // ============================================================
    const { error: updateError } = await serviceClient
      .from('candidate_assessments')
      .update({
        session_id: newSession.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (updateError) {
      console.error('[Session] Candidate assessment update error:', updateError);
      // Don't fail the session creation if this update fails
    }

    return res.status(200).json({
      success: true,
      session: newSession,
      isNew: true
    });

  } catch (error) {
    console.error('[Session] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      diagnosticCode: 'UNHANDLED_ERROR'
    });
  }
}
