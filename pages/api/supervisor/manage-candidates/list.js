// pages/api/supervisor/manage-candidates/list.js
// Phase 7A — server-side candidates list for the supervisor surface.
//
// Replaces direct Supabase reads in pages/supervisor/manage-candidate/index.js.
// Uses the service role + scoping helper (strict scoping, Option A).

import { createClient } from '@supabase/supabase-js';
import {
  resolveCallerRole,
  getAccessibleCandidateIds,
} from '../../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Supervisor Candidates List] ${tag}`, {
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
      console.error('[Supervisor Candidates List] Missing Supabase credentials');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
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

    const userId = userData.user.id;
    const userMetadata = userData.user.user_metadata || null;

    const caller = await resolveCallerRole(serviceClient, userId, userMetadata);

    if (caller.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (!caller.isAdmin && !caller.isSupervisor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const scopedCaller = {
      userId,
      isAdmin: caller.isAdmin,
      isSupervisor: caller.isSupervisor,
      role: caller.role,
    };

    const allowedIds = await getAccessibleCandidateIds(serviceClient, scopedCaller);

    if (Array.isArray(allowedIds) && allowedIds.length === 0) {
      return res.status(200).json({
        success: true,
        candidates: [],
        scope: { type: 'supervisor', candidateCount: 0 },
      });
    }

    let candidatesQuery = serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, created_at, supervisor_id')
      .order('full_name', { ascending: true });

    if (Array.isArray(allowedIds)) {
      candidatesQuery = candidatesQuery.in('id', allowedIds);
    }

    const { data: candidatesData, error: candidatesError } = await candidatesQuery;

    if (candidatesError) {
      logError('candidates fetch failed', candidatesError, { scope: caller.role });
      return res.status(500).json({
        success: false,
        error: 'Failed to load candidates',
      });
    }

    const candidates = candidatesData || [];
    const candidateIds = candidates.map((c) => c.id);

    let countsByCandidate = {};
    if (candidateIds.length > 0) {
      const { data: resultRows, error: resultError } = await serviceClient
        .from('assessment_results')
        .select('user_id, completed_at')
        .in('user_id', candidateIds);

      if (resultError) {
        logError('assessment_results fetch failed', resultError, {
          candidateCount: candidateIds.length,
        });
      } else {
        (resultRows || []).forEach((row) => {
          const key = row.user_id;
          if (!key) return;
          if (!countsByCandidate[key]) {
            countsByCandidate[key] = { total: 0, completed: 0 };
          }
          countsByCandidate[key].total += 1;
          if (row.completed_at) {
            countsByCandidate[key].completed += 1;
          }
        });
      }
    }

    const enriched = candidates.map((c) => {
      const counts = countsByCandidate[c.id] || { total: 0, completed: 0 };
      return {
        id: c.id,
        full_name: c.full_name || '',
        email: c.email || '',
        university: c.university || '',
        programme: c.programme || '',
        created_at: c.created_at || null,
        totalAssessments: counts.total,
        completedAssessments: counts.completed,
      };
    });

    return res.status(200).json({
      success: true,
      candidates: enriched,
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
        candidateCount: enriched.length,
      },
    });
  } catch (error) {
    console.error('[Supervisor Candidates List] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
