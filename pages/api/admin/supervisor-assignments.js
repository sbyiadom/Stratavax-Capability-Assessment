// pages/api/admin/supervisor-assignments.js
// Phase 7A — admin-only read for supervisor assignments.
//
// Fix: previously this endpoint authenticated the caller but did NOT verify
// they were admin. Any authenticated user could POST candidate IDs and read
// the full junction map. Now requires admin.
//
// This endpoint has been superseded by /api/admin/assignments/data for the
// pages that needed it, but remains available in case other callers exist.

import { createClient } from '@supabase/supabase-js';
import { resolveCallerRole } from '../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Admin Supervisor Assignments] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET or POST.' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Admin Supervisor Assignments] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
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

    // Admin-only. Without this check, any authenticated user can read the
    // full junction map for arbitrary candidates.
    if (!caller.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Parse candidateIds from query (GET) or body (POST)
    let candidateIds = [];
    if (req.method === 'POST') {
      candidateIds = (req.body && req.body.candidateIds) || [];
    } else {
      const queryIds = req.query.candidateIds || '';
      candidateIds =
        typeof queryIds === 'string' ? queryIds.split(',').filter(Boolean) : [];
    }

    const ids = Array.isArray(candidateIds)
      ? [...new Set(candidateIds.filter(Boolean))]
      : [];

    if (ids.length === 0) {
      return res.status(200).json({ success: true, assignments: {} });
    }

    // Chunk to keep URLs short even with a large candidate list
    const IN_CHUNK = 200;
    const assignmentsByCandidate = {};

    for (let i = 0; i < ids.length; i += IN_CHUNK) {
      const chunk = ids.slice(i, i + IN_CHUNK);

      const { data: rows, error: assignError } = await serviceClient
        .from('candidate_supervisors')
        .select('candidate_id, supervisor_id')
        .in('candidate_id', chunk);

      if (assignError) {
        logError('candidate_supervisors fetch failed', assignError, {
          chunkSize: chunk.length,
        });
        // Non-fatal: return what we have so far
        continue;
      }

      (rows || []).forEach((row) => {
        if (!row?.candidate_id || !row?.supervisor_id) return;
        if (!assignmentsByCandidate[row.candidate_id]) {
          assignmentsByCandidate[row.candidate_id] = [];
        }
        assignmentsByCandidate[row.candidate_id].push(row.supervisor_id);
      });
    }

    return res.status(200).json({
      success: true,
      assignments: assignmentsByCandidate,
    });
  } catch (error) {
    console.error('[Admin Supervisor Assignments] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
