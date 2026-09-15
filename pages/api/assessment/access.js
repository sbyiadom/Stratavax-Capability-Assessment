// pages/api/assessment/access.js - REWRITTEN
// GET /api/assessment/access?assessmentId=<uuid>
// Returns the candidate's current access state for the given assessment.
//
// Response shape:
//   { success: true, access: { status, result_id, session_id, ... } }
//
// Statuses the client cares about:
//   'not_started' | 'in_progress'   -> allowed
//   'completed'                     -> already submitted
//   'blocked'                       -> access denied
//
// If no assignment exists for the user, returns 403 with a clear error.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // GET only — this is a read-only check.
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { assessmentId } = req.query;

    if (!assessmentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing assessmentId parameter'
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Access] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
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
      console.error('[Access] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;

    // ============================================================
    // STEP 2: Look up the candidate's assignment for this assessment
    // ============================================================
    const { data: assignment, error: assignmentError } = await serviceClient
      .from('candidate_assessments')
      .select('id, status, result_id, session_id, started_at, completed_at, updated_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (assignmentError) {
      console.error('[Access] Assignment lookup error:', assignmentError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify access',
        diagnosticCode: assignmentError?.code || 'ASSIGNMENT_LOOKUP_ERROR'
      });
    }

    if (!assignment) {
      console.error('[Access] No assignment for user:', userId, 'assessment:', assessmentId);
      return res.status(403).json({
        success: false,
        error: 'Assessment not assigned to this candidate'
      });
    }

    // ============================================================
    // STEP 3: Return the access state
    // ============================================================
    return res.status(200).json({
      success: true,
      access: {
        status: assignment.status || 'not_started',
        result_id: assignment.result_id || null,
        session_id: assignment.session_id || null,
        started_at: assignment.started_at || null,
        completed_at: assignment.completed_at || null,
        updated_at: assignment.updated_at || null
      }
    });

  } catch (error) {
    console.error('[Access] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      diagnosticCode: 'UNHANDLED_ERROR'
    });
  }
}
