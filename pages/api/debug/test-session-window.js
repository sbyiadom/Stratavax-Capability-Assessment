// pages/api/debug/test-session-window.js
// TEMPORARY — Phase 3 item 6 verification only.
// Bypasses auth and uses the service role to test scheduling-window enforcement.
// DELETE THIS FILE after item 6 is verified.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Same window-resolution logic as pages/api/assessment/session.js
// ============================================================
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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { user_id, assessment_id } = req.body || {};

    if (!user_id || !assessment_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing user_id or assessment_id'
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Look up the candidate_assessments row
    const { data: ca, error: caErr } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .eq('user_id', user_id)
      .eq('assessment_id', assessment_id)
      .maybeSingle();

    if (caErr) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load assignment',
        details: caErr.message
      });
    }

    if (!ca) {
      return res.status(404).json({
        success: false,
        error: 'No assignment found for this user/assessment pair'
      });
    }

    // Look up the assessment
    const { data: assessment, error: aErr } = await serviceClient
      .from('assessments')
      .select('id, title, starts_at, expires_at, is_active')
      .eq('id', assessment_id)
      .maybeSingle();

    if (aErr) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load assessment',
        details: aErr.message
      });
    }

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // --- Same status checks as session.js (in order) ---
    if (ca.status === 'blocked') {
      return res.status(403).json({
        success: false,
        error: 'Assessment is blocked',
        diagnosticCode: 'BLOCKED'
      });
    }

    if (ca.status === 'completed' || ca.result_id) {
      return res.status(409).json({
        success: false,
        error: 'Assessment already completed',
        diagnosticCode: 'COMPLETED'
      });
    }

    // --- Window enforcement ---
    const window = resolveWindow(ca, assessment);
    const now = new Date();

    if (window.start && now < window.start) {
      return res.status(403).json({
        success: false,
        error: `Assessment not yet available. Opens ${window.start.toISOString()}.`,
        diagnosticCode: 'BEFORE_WINDOW',
        window: {
          source: window.source,
          starts_at: window.start.toISOString(),
          expires_at: window.end ? window.end.toISOString() : null,
          now: now.toISOString()
        }
      });
    }

    if (window.end && now > window.end) {
      return res.status(403).json({
        success: false,
        error: `Assessment window has closed (${window.end.toISOString()}).`,
        diagnosticCode: 'AFTER_WINDOW',
        window: {
          source: window.source,
          starts_at: window.start ? window.start.toISOString() : null,
          expires_at: window.end.toISOString(),
          now: now.toISOString()
        }
      });
    }

    // If we got here, all checks passed
    return res.status(200).json({
      success: true,
      message: 'Session would be created. All checks passed.',
      diagnosticCode: 'OK',
      window: {
        source: window.source,
        starts_at: window.start ? window.start.toISOString() : null,
        expires_at: window.end ? window.end.toISOString() : null,
        now: now.toISOString()
      },
      candidate_assessment: {
        id: ca.id,
        status: ca.status,
        is_scheduled: ca.is_scheduled,
        scheduled_start: ca.scheduled_start,
        scheduled_end: ca.scheduled_end
      }
    });
  } catch (error) {
    console.error('[Test Window] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
