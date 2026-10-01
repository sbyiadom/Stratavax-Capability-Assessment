// pages/api/assessment/session.js - FULLY CORRECTED + DB duration override
// (unchanged header)
// 2026-10-01: STEP 3 now selects assessments.duration_minutes. STEP 5 and
//             STEP 7 prefer that value when present; fall back to the
//             count-based rule otherwise.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Phase Two: duration policy — DB override, else count-based.
// ============================================================
function computeDurationMinutes(questionCount) {
  const count = Number(questionCount) || 0;
  if (count >= 100) return 120;
  if (count >= 80) return 90;
  return 60;
}

function resolveDurationMinutes(assessment, questionCount) {
  const explicit = Number(assessment?.duration_minutes);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return computeDurationMinutes(questionCount);
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

function resolveWindow(candidateAssessment, assessment) {
  if (candidateAssessment?.is_scheduled) {
    const start = candidateAssessment.scheduled_start
      ? new Date(candidateAssessment.scheduled_start)
      : null;
    const end = candidateAssessment.scheduled_end
      ? new Date(candidateAssessment.scheduled_end)
      : null;
    return { start, end, source: 'candidate' };
  }
  const start = assessment?.starts_at ? new Date(assessment.starts_at) : null;
  const end = assessment?.expires_at ? new Date(assessment.expires_at) : null;
  return { start, end, source: 'assessment' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ============================================================
  // PATCH — (unchanged) caller-owned session updates.
  // ============================================================
  if (req.method === 'PATCH') {
    try {
      const { sessionId, violationCount } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Missing sessionId' });
      }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        console.error('[Session PATCH] Missing environment variables');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const serviceClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
      if (userError || !userData?.user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      const userId = userData.user.id;

      const { data: existingSession, error: lookupError } = await serviceClient
        .from('assessment_sessions')
        .select('id, user_id, status, violation_count')
        .eq('id', sessionId)
        .maybeSingle();

      if (lookupError) {
        console.error('[Session PATCH] Lookup error:', lookupError);
        return res.status(500).json({ success: false, error: 'Failed to look up session' });
      }
      if (!existingSession) return res.status(404).json({ success: false, error: 'Session not found' });
      if (existingSession.user_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (existingSession.status !== 'in_progress') {
        return res.status(409).json({ success: false, error: 'Session is not in progress' });
      }

      const patch = { updated_at: new Date().toISOString() };
      if (typeof violationCount === 'number' && Number.isFinite(violationCount) && violationCount >= 0) {
        patch.violation_count = Math.floor(violationCount);
      }

      const { error: updateError } = await serviceClient
        .from('assessment_sessions')
        .update(patch)
        .eq('id', sessionId);

      if (updateError) {
        console.error('[Session PATCH] Update error:', updateError);
        return res.status(500).json({ success: false, error: updateError.message });
      }
      return res.status(200).json({ success: true });
    } catch (patchErr) {
      console.error('[Session PATCH] Unhandled error:', patchErr);
      return res.status(500).json({
        success: false,
        error: patchErr.message || 'Internal server error',
      });
    }
  }

  // ============================================================
  // POST — create or retrieve an in-progress session.
  // ============================================================
  try {
    const { assessmentId, assessmentTypeId } = req.body;
    if (!assessmentId) return res.status(400).json({ success: false, error: 'Missing assessmentId' });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Session] Missing environment variables');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // STEP 1: Verify user
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Session] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    const userId = userData.user.id;

    // STEP 2: Get candidate assignment
    const { data: candidateAssessment, error: assignmentError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (assignmentError) {
      console.error('[Session] Assignment error:', assignmentError);
      return res.status(500).json({
        success: false, error: 'Failed to verify assignment',
        diagnosticCode: assignmentError?.code || 'ASSIGNMENT_ERROR'
      });
    }
    if (!candidateAssessment) {
      console.error('[Session] No assignment found for user:', userId, 'assessment:', assessmentId);
      return res.status(403).json({ success: false, error: 'Assessment not assigned to this candidate' });
    }
    if (candidateAssessment.status === 'blocked') {
      return res.status(403).json({ success: false, error: 'Assessment is blocked. Please contact your supervisor.' });
    }
    if (candidateAssessment.status === 'completed' || candidateAssessment.result_id) {
      return res.status(409).json({ success: false, error: 'Assessment already completed' });
    }

    // STEP 3: Get assessment — NOW SELECTS duration_minutes
    console.log(`[Session] Looking up assessment: ${assessmentId}`);
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('id, title, assessment_type_id, starts_at, expires_at, is_active, duration_minutes')
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) {
      console.error('[Session] Assessment lookup error:', assessmentError);
      return res.status(500).json({
        success: false, error: 'Unable to retrieve assessment',
        diagnosticCode: assessmentError?.code || 'ASSESSMENT_LOOKUP_ERROR'
      });
    }
    if (!assessment) {
      console.error('[Session] Assessment not found:', assessmentId);
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    console.log(`[Session] Assessment found: ${assessment.id} - ${assessment.title}`);
    console.log(`[Session] Assessment duration_minutes: ${assessment.duration_minutes}`);

    // STEP 3.5: Enforce scheduling window (unchanged)
    const window = resolveWindow(candidateAssessment, assessment);
    const now = new Date();

    if (window.start && now < window.start) {
      const when = window.start.toISOString();
      console.log(`[Session] Rejecting: before window (source=${window.source}, start=${when})`);
      return res.status(403).json({
        success: false,
        error: `This assessment is not yet available. It opens on ${when}.`,
        diagnosticCode: 'BEFORE_WINDOW',
        window: {
          source: window.source,
          starts_at: window.start.toISOString(),
          expires_at: window.end ? window.end.toISOString() : null
        }
      });
    }
    if (window.end && now > window.end) {
      const when = window.end.toISOString();
      console.log(`[Session] Rejecting: after window (source=${window.source}, end=${when})`);
      return res.status(403).json({
        success: false,
        error: `This assessment window has closed (${when}). Please contact your supervisor.`,
        diagnosticCode: 'AFTER_WINDOW',
        window: {
          source: window.source,
          starts_at: window.start ? window.start.toISOString() : null,
          expires_at: window.end.toISOString()
        }
      });
    }

    // STEP 4: Resolve assessment type (unchanged)
    const resolvedAssessmentTypeId =
      assessment.assessment_type_id ||
      candidateAssessment.assessment_type_id ||
      Number(assessmentTypeId) ||
      null;

    if (!resolvedAssessmentTypeId) {
      console.error('[Session] Could not resolve assessment type for assessment:', assessmentId);
      return res.status(422).json({ success: false, error: 'Assessment type could not be resolved' });
    }
    console.log(`[Session] Resolved assessment type ID: ${resolvedAssessmentTypeId}`);

    // STEP 5: Existing in-progress session — NOW uses resolveDurationMinutes
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
      const reusedDurationMinutes = resolveDurationMinutes(assessment, existingSession.total_questions);
      return res.status(200).json({
        success: true,
        session: { ...existingSession, duration_minutes: reusedDurationMinutes },
        isNew: false
      });
    }

    // STEP 6: Fetch FULL question pool (unchanged)
    const { data: allQuestions, error: qErr } = await serviceClient
      .from('unique_questions')
      .select('id, section, unique_answers(id, display_order)')
      .eq('assessment_type_id', resolvedAssessmentTypeId);

    if (qErr) {
      console.error('[Session] Question fetch error:', qErr);
      return res.status(500).json({
        success: false, error: 'Failed to load questions for this assessment',
        diagnosticCode: 'QUESTION_FETCH_FAILED'
      });
    }
    const pool = Array.isArray(allQuestions) ? allQuestions : [];
    if (pool.length === 0) {
      console.error('[Session] No questions found for assessment_type_id', resolvedAssessmentTypeId);
      return res.status(422).json({
        success: false, error: 'No questions available for this assessment',
        diagnosticCode: 'NO_QUESTIONS'
      });
    }

    // STEP 7: Shuffle, compute duration — NOW uses resolveDurationMinutes
    const chosen = shuffleArray(pool);
    const frozenCount = chosen.length;
    const durationMinutes = resolveDurationMinutes(assessment, frozenCount);
    console.log(`[Session] Freezing all ${frozenCount} questions → duration ${durationMinutes} min`);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    // STEP 8: Create session (unchanged)
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
        success: false, error: 'Failed to create session',
        details: createError.message,
        diagnosticCode: createError?.code || 'SESSION_CREATE_ERROR'
      });
    }
    console.log('[Session] Created new session:', newSession.id, 'for assessment:', assessmentId);

    // STEP 9: Freeze question set (unchanged)
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
        await serviceClient.from('assessment_sessions').delete().eq('id', newSession.id);
        return res.status(500).json({
          success: false, error: 'Failed to freeze question set for this session',
          diagnosticCode: 'FREEZE_INSERT_FAILED'
        });
      }
      console.log(`[Session] Frozen ${rows.length} questions for session ${newSession.id}`);
    } catch (freezeErr) {
      console.error('[Session] Freeze: unhandled error:', freezeErr);
      await serviceClient.from('assessment_sessions').delete().eq('id', newSession.id);
      return res.status(500).json({
        success: false, error: 'Failed to freeze question set for this session',
        diagnosticCode: 'FREEZE_UNHANDLED_ERROR'
      });
    }

    // STEP 10: Update candidate_assessments (unchanged)
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
      session: { ...newSession, duration_minutes: durationMinutes },
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
