// pages/api/supervisor/export-dashboard-data.js
// Phase 7A — server-side data payload for the supervisor export-dashboard page.
//
// Replaces the direct supabase reads in pages/supervisor/export-dashboard.js.
// Uses strict scoping (Option A): admin → all candidates, supervisor → assigned.

import { createClient } from '@supabase/supabase-js';
import {
  resolveCallerRole,
  getAccessibleCandidateIds,
} from '../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Supervisor Export Dashboard] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Supervisor Export Dashboard] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !userData?.user) {
      logError('auth.getUser failed', authError || { message: 'no user' });
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const caller = await resolveCallerRole(
      serviceClient,
      userData.user.id,
      userData.user.user_metadata || null
    );

    if (caller.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (!caller.isAdmin && !caller.isSupervisor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const scopedCaller = {
      userId: userData.user.id,
      isAdmin: caller.isAdmin,
      isSupervisor: caller.isSupervisor,
      role: caller.role,
    };

    const allowedIds = await getAccessibleCandidateIds(serviceClient, scopedCaller);

    // Empty scope → empty payload
    if (Array.isArray(allowedIds) && allowedIds.length === 0) {
      return res.status(200).json({
        success: true,
        candidates: [],
        results: [],
        scope: { type: caller.isAdmin ? 'admin' : 'supervisor', candidateCount: 0 },
      });
    }

    // Candidates
    let candidatesQuery = serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, graduation_year, preferred_department, supervisor_id, created_at')
      .order('full_name', { ascending: true });

    if (Array.isArray(allowedIds)) {
      candidatesQuery = candidatesQuery.in('id', allowedIds);
    }

    const { data: candidates, error: candidatesError } = await candidatesQuery;

    if (candidatesError) {
      logError('candidates fetch failed', candidatesError, { scope: caller.role });
      return res.status(500).json({ success: false, error: 'Failed to load candidates' });
    }

    const candidateRows = candidates || [];
    const candidateIds = candidateRows.map((c) => c.id);

    if (candidateIds.length === 0) {
      return res.status(200).json({
        success: true,
        candidates: [],
        results: [],
        scope: { type: caller.isAdmin ? 'admin' : 'supervisor', candidateCount: 0 },
      });
    }

    // Results — chunked to keep URLs short
    const IN_CHUNK = 200;
    const results = [];

    for (let i = 0; i < candidateIds.length; i += IN_CHUNK) {
      const chunk = candidateIds.slice(i, i + IN_CHUNK);

      const { data: rows, error: rowsError } = await serviceClient
        .from('assessment_results')
        .select('id, user_id, assessment_id, total_score, max_score, percentage_score, category_scores, report_data, completed_at, created_at, recommendation')
        .in('user_id', chunk)
        .order('completed_at', { ascending: false });

      if (rowsError) {
        logError('assessment_results fetch failed', rowsError, { chunkSize: chunk.length });
        continue;
      }
      if (Array.isArray(rows)) {
        results.push(...rows);
      }
    }

    return res.status(200).json({
      success: true,
      candidates: candidateRows,
      results,
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
        candidateCount: candidateRows.length,
        resultCount: results.length,
      },
    });
  } catch (error) {
    console.error('[Supervisor Export Dashboard] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
