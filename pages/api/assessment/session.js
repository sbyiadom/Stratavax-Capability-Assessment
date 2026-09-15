// pages/api/assessment/session.js - FULLY CORRECTED
// - Separate assessment lookup (no embedded relationship)
// - Proper error handling
// - Validates candidate assignment before session creation
// - Uses authoritative assessment_type_id from database
// - Phase Two / Item 2.2: freezes the question set (and answer order)
//   into session_questions at session creation.
// - Phase Two / "Serve all questions" policy: freezes the ENTIRE pool
//   for the assessment type — no slice, no sampling.
// - Phase Two: computes the session duration from the frozen question
//   count (>=100 → 120 min, >=80 → 90 min, <80 → 60 min) and returns
//   it to the client as session.duration_minutes. No new DB column.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Phase Two: duration policy
// ============================================================
function computeDurationMinutes(questionCount) {
  const count = Number(questionCount) || 0;
  if (count >= 100) return 120;
  if (count >= 80) return 90;
  return 60;
}

function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { assessmentId, assessmentTypeId } = req.body;

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

    if (!candidateAssessment) {
      console.error('[Session] No assignment found for user:', userId, 'assessment:', assessmentId);
      return res.status(403).json({
        success: false,
        error: 'Assessment not assigned to this candidate'
      });
    }

    if (candidateAssessment.status === 'blocked') {
      return res.status(403).json({
        success: false,
        error: 'Assessment is blocked. Please contact your supervisor.'
      });
    }

    if (candidateAssessment.status === 'completed' || candidateAssessment.result_id) {
      return res.status(409).json({
        success: false,
        error: 'Assessment already completed'
      });
    }

    // ============================================================
    // STEP 3: Get assessment
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
    // STEP 4: Resolve assessment type
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

      // Compute duration_minutes for the reused session so the client
      // always receives a consistent value (whether the session is new
      // or reused).
      const reusedDurationMinutes = computeDurationMinutes(existingSession.total_questions);

      return res.status(200).json({
        success: true,
        session: {
          ...existingSession,
          duration_minutes: reusedDurationMinutes
        },
        isNew: false
      });
    }

    // ============================================================
    // STEP 6: Fetch the FULL question pool for this assessment type.
    // Phase Two "Serve all questions" policy: no slice, no sampling.
    // ============================================================
    const { data: allQuestions, error: qErr } = await serviceClient
      .from('unique_questions')
      .select('id, section, unique_answers(id, display_order)')
      .eq('assessment_type_id', resolvedAssessmentTypeId);

    if (qErr) {
      console.error('[Session] Question fetch error:', qErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to load questions for this assessment',
        diagnosticCode: 'QUESTION_FETCH_FAILED'
      });
    }

    const pool = Array.isArray(allQuestions) ? allQuestions : [];

    if (pool.length === 0) {
      console.error('[Session] No questions found for assessment_type_id', resolvedAssessmentTypeId);
      return res.status(422).json({
        success: false,
        error: 'No questions available for this assessment',
        diagnosticCode: 'NO_QUESTIONS'
      });
    }

    // ============================================================
    // STEP 7: Shuffle the full pool (order only) and compute duration.
    // ============================================================
    const chosen = shuffleArray(pool);
    const frozenCount = chosen.length;
    const durationMinutes = computeDurationMinutes(frozenCount);

    console.log(`[Session] Freezing all ${frozenCount} questions → duration ${durationMinutes} min`);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    // ============================================================
    // STEP 8: Create the session
    // ============================================================
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
        total_questions: frozenCount,
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
    // STEP 9: Freeze the question set into session_questions.
    // Fail-closed: if this fails, delete the session.
    // ============================================================
    try {
      const rows = chosen.map((q, index) => ({
        session_id: newSession.id,
        question_id: q.id,
        display_order: index + 1,
        answer_order: shuffleArray(q.unique_answers || []).map((a, ai) => ({
          answer_id: a.id,
          display_order: ai + 1
        })),
        assessment_version: 1,
        scoring_version: 1
      }));

      const { error: insertErr } = await serviceClient
        .from('session_questions')
        .insert(rows);

      if (insertErr) {
        console.error('[Session] Freeze: insert error:', insertErr);
        await serviceClient
          .from('assessment_sessions')
          .delete()
          .eq('id', newSession.id);
        return res.status(500).json({
          success: false,
          error: 'Failed to freeze question set for this session',
          diagnosticCode: 'FREEZE_INSERT_FAILED'
        });
      }

      console.log(`[Session] Frozen ${rows.length} questions for session ${newSession.id}`);
    } catch (freezeErr) {
      console.error('[Session] Freeze: unhandled error:', freezeErr);
      await serviceClient
        .from('assessment_sessions')
        .delete()
        .eq('id', newSession.id);
      return res.status(500).json({
        success: false,
        error: 'Failed to freeze question set for this session',
        diagnosticCode: 'FREEZE_UNHANDLED_ERROR'
      });
    }

    // ============================================================
    // STEP 10: Update candidate_assessments with session_id
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
    }

    return res.status(200).json({
      success: true,
      session: {
        ...newSession,
        duration_minutes: durationMinutes
      },
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
