// pages/api/admin/assignments/data.js
// Phase 7A — admin-only consolidated read for the supervisor assignment pages.
//
// Serves batch-manage.js and assign-candidates.js with one call:
//   { success: true, candidates, supervisors, assignments }
//
// Replaces:
//   • direct supabase reads of candidate_profiles + supervisor_profiles
//   • POST to /api/admin/supervisor-assignments (which had no admin check)

import { createClient } from '@supabase/supabase-js';
import { resolveCallerRole } from '../../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Admin Assignments Data] ${tag}`, {
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
      console.error('[Admin Assignments Data] Missing Supabase credentials');
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

    // This endpoint is admin-only. Supervisors must not be able to read
    // the full assignment map.
    if (!caller.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // 1. Load all candidates (admin sees everything)
    const { data: candidatesData, error: candidatesError } = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, phone, university, programme, supervisor_id, created_at')
      .order('created_at', { ascending: false });

    if (candidatesError) {
      logError('candidates fetch failed', candidatesError);
      return res.status(500).json({ success: false, error: 'Failed to load candidates' });
    }

    const candidates = candidatesData || [];

    // 2. Load all active supervisors and admins
    const { data: supervisorsData, error: supervisorsError } = await serviceClient
      .from('supervisor_profiles')
      .select('id, full_name, email, role, is_active')
      .in('role', ['supervisor', 'admin'])
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (supervisorsError) {
      logError('supervisors fetch failed', supervisorsError);
      return res.status(500).json({ success: false, error: 'Failed to load supervisors' });
    }

    const supervisors = supervisorsData || [];

    // 3. Load all candidate_supervisors rows for these candidates, grouped
    //    by candidate_id. Inlined here so the pages don't need a second call.
    let assignments = {};

    if (candidates.length > 0) {
      const candidateIds = candidates.map((c) => c.id);

      // Chunk to keep URLs short even at scale
      const IN_CHUNK = 200;
      const rows = [];
      for (let i = 0; i < candidateIds.length; i += IN_CHUNK) {
        const chunk = candidateIds.slice(i, i + IN_CHUNK);
        const { data: chunkRows, error: assignmentsError } = await serviceClient
          .from('candidate_supervisors')
          .select('candidate_id, supervisor_id')
          .in('candidate_id', chunk);

        if (assignmentsError) {
          logError('candidate_supervisors fetch failed', assignmentsError, {
            chunkSize: chunk.length,
          });
          // Non-fatal: return what we have
          continue;
        }
        if (Array.isArray(chunkRows)) {
          rows.push(...chunkRows);
        }
      }

      rows.forEach((row) => {
        if (!row?.candidate_id || !row?.supervisor_id) return;
        if (!assignments[row.candidate_id]) {
          assignments[row.candidate_id] = [];
        }
        assignments[row.candidate_id].push(row.supervisor_id);
      });
    }

    return res.status(200).json({
      success: true,
      candidates,
      supervisors,
      assignments,
      counts: {
        candidates: candidates.length,
        supervisors: supervisors.length,
        assignedCandidates: Object.keys(assignments).length,
      },
    });
  } catch (error) {
    console.error('[Admin Assignments Data] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
