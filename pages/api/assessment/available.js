// pages/api/assessment/available.js
// Phase 7A — returns assessments visible to the calling candidate,
// with completion status. Replaces client-side reads of `assessments`
// and `candidate_assessments` in pages/assessment/pre.js.
//
// Constraints:
//   • Candidate role only. Supervisors/admins receive 403.
//   • NEVER returns score, result_id, percentage_score, or any per-attempt data.
//   • Data reads happen with the service role; authorization is enforced above.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[assessment/available] Missing Supabase credentials', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials',
      });
    }

    // ============================================================
    // AUTH
    // ============================================================
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error('[assessment/available] auth.getUser failed:', authError?.message);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const userId = userData.user.id;
    const role = userData.user.user_metadata?.role || 'candidate';

    if (role !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is for candidates only',
      });
    }

    // ============================================================
    // DATA — service role
    // ============================================================
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. All active, candidate-visible assessments with their types
    const { data: assessments, error: assessmentsError } = await serviceClient
      .from('assessments')
      .select(`
        id,
        title,
        is_active,
        assessment_type:assessment_types (
          id,
          code,
          name,
          icon,
          gradient_start,
          gradient_end,
          max_score,
          question_count,
          visible_to_candidates
        )
      `)
      .eq('is_active', true);

    if (assessmentsError) {
      console.error('[assessment/available] assessments fetch error:', assessmentsError);
      return res.status(500).json({ success: false, error: assessmentsError.message });
    }

    // Filter server-side. manufacturing and any other hidden type is excluded here.
    const visibleAssessments = (assessments || []).filter(
      (a) => a.assessment_type && a.assessment_type.visible_to_candidates === true
    );

    if (visibleAssessments.length === 0) {
      return res.status(200).json({ success: true, assessments: [] });
    }

    // 2. This candidate's assignment rows — NO score column selected.
    //    score / result_id / percentage_score are deliberately never read here.
    const assessmentIds = visibleAssessments.map((a) => a.id);

    const { data: assignments, error: assignmentsError } = await serviceClient
      .from('candidate_assessments')
      .select('assessment_id, status')
      .eq('user_id', userId)
      .in('assessment_id', assessmentIds);

    if (assignmentsError) {
      console.error('[assessment/available] assignments fetch error:', assignmentsError);
      return res.status(500).json({ success: false, error: assignmentsError.message });
    }

    const assignmentMap = {};
    (assignments || []).forEach((row) => {
      assignmentMap[row.assessment_id] = row.status || null;
    });

    // 3. Shape the response to match what pre.js expects.
    //    Deliberately excluded: score, result_id, percentage_score, completed_at.
    const shaped = visibleAssessments.map((a) => {
      const type = a.assessment_type || {};
      const status = assignmentMap[a.id] || null;

      return {
        id: a.id,
        title: a.title,
        assessment_type: {
          code: type.code || null,
          name: type.name || null,
          icon: type.icon || '📋',
          gradient_start: type.gradient_start || '#667eea',
          gradient_end: type.gradient_end || '#764ba2',
          question_count: type.question_count || 100,
          max_score: type.max_score || 500,
        },
        // Only a boolean — never a score.
        completed: status === 'completed',
      };
    });

    return res.status(200).json({ success: true, assessments: shaped });
  } catch (error) {
    console.error('[assessment/available] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
