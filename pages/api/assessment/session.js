// pages/api/assessment/session.js - FULLY CORRECTED
// - Separate assessment lookup (no embedded relationship)
// - Proper error handling
// - Validates candidate assignment before session creation
// - Uses authoritative assessment_type_id from database
// - UPDATED (Phase Two / Item 2.2): freezes the question set
//   (and answer order) into session_questions at session creation.
//   Guarantees page refresh returns the same question set, and
//   scoring uses the exact questions the candidate answered.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Phase Two: question-count constants, mirroring questions.js
// ============================================================
const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',
  'a6000077-095d-4115-bc4e-5936fce953e9',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'
];
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';
const QUESTION_COUNT_MAP = {
  'c2bc4994-1c4a-4094-a763-8d9d560b759e': 40,
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0': 40,
  'a6000077-095d-4115-bc4e-5936fce953e9': 40,
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc': 40,
  'bdb9d46e-9fac-4d00-8478-1f649e7ac600': 80,
  '232f7ff8-60b8-4223-81c6-4917a5fb12a3': 100
};

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

function getRequiredQuestionCount(assessmentId, assessmentTypeCode, fallbackCount) {
  if (PRACTICAL_ASSESSMENT_IDS.includes(assessmentId)) return 40;
  if (assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID || assessmentTypeCode === 'national_service') return 80;
  return QUESTION_COUNT_MAP[assessmentId] || fallbackCount || 100;
}

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
    // STEP 6b (Phase Two): Freeze the question set for this session.
    // Chosen and shuffled NOW, written to session_questions, and
    // never re-chosen for this session again — even on page refresh.
    // Fail-closed: if freezing fails, the session is deleted so we
    // never end up with a session that has no frozen questions.
    // ============================================================
    try {
      const { data: allQuestions, error: qErr } = await serviceClient
        .from('unique_questions')
        .select('id, section, unique_answers(id, display_order)')
        .eq('assessment_type_id', resolvedAssessmentTypeId);

      if (qErr) {
        console.error('[Session] Freeze: question fetch error:', qErr);
        await serviceClient
          .from('assessment_sessions')
          .delete()
          .eq('id', newSession.id);
        return res.status(500).json({
          success: false,
          error: 'Failed to freeze question set for this session',
          diagnosticCode: 'FREEZE_QUESTION_FETCH_FAILED'
        });
      }

      const pool = Array.isArray(allQuestions) ? allQuestions : [];

      if (pool.length === 0) {
        console.error('[Session] Freeze: no questions found for assessment_type_id', resolvedAssessmentTypeId);
        await serviceClient
          .from('assessment_sessions')
          .delete()
          .eq('id', newSession.id);
        return res.status(422).json({
          success: false,
          error: 'No questions available for this assessment',
          diagnosticCode: 'NO_QUESTIONS'
        });
      }

      const requiredCount = getRequiredQuestionCount(
        assessmentId,
        assessmentType?.code,
        questionCount
      );

      const chosen = shuffleArray(pool).slice(0, requiredCount);

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

      // Align the session's total_questions with the ACTUAL frozen count
      if (rows.length !== newSession.total_questions) {
        const { error: alignErr } = await serviceClient
          .from('assessment_sessions')
          .update({
            total_questions: rows.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', newSession.id);

        if (alignErr) {
          console.error('[Session] Freeze: total_questions alignment error:', alignErr);
          // Not fatal — the freeze itself succeeded; proceed.
        } else {
          newSession.total_questions = rows.length;
        }
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
