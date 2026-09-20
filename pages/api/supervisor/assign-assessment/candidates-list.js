// pages/api/supervisor/assign-assessment/candidates-list.js
// Phase 7B — server-side candidate list for the assign-assessment flow.
//
// Scoping is delegated to the Postgres function public.get_scoped_candidate_ids,
// which returns the set of candidate_profiles.id values visible to the caller:
//   • admin      → all candidates
//   • supervisor → union of primary (candidate_profiles.supervisor_id)
//                  and junction (candidate_supervisors.supervisor_id) links
//
// This replaces the previous ".in('id', allowedIds)" approach, which
// overflowed PostgREST's URL length limit for supervisors with many candidates.
//
// Auth is delegated to utils/apiAuth.js (authorizeRequest), which handles
// bearer token extraction, token validation, role resolution, and
// active-account checks uniformly across the supervisor/admin surface.
//
// Response shape (unchanged from Phase 7A so the page consumes it as-is):
//   {
//     success: true,
//     candidates: [{ id, full_name, email, university, programme, created_at, supervisor_id }],
//     scope: { type: 'admin' | 'supervisor', role, candidateCount }
//   }

import { authorizeRequest } from '../../../../utils/apiAuth';

const LOG_TAG = '[Assign Assessment Candidates]';
const CHUNK_SIZE = 100;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function logError(stage, error, extra = {}) {
  console.error(`${LOG_TAG} ${stage} failed`, {
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

  // ---- Auth: bearer token + role check + active-account check ----
  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;

  try {
    // ---- Scoping: get the candidate id set from the DB-side function ----
    const { data: scopedRows, error: scopedError } = await serviceClient.rpc(
      'get_scoped_candidate_ids',
      { p_caller: caller.userId, p_is_admin: caller.isAdmin }
    );

    if (scopedError) {
      logError('rpc get_scoped_candidate_ids', scopedError, {
        role: caller.role,
        userId: caller.userId,
      });
      return res.status(500).json({ success: false, error: 'Failed to load candidates' });
    }

    const scopedIds = Array.isArray(scopedRows)
      ? scopedRows
          .map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids))
          .filter(Boolean)
      : [];

    // Empty scope → return an empty list with 200, not an error.
    if (scopedIds.length === 0) {
      return res.status(200).json({
        success: true,
        candidates: [],
        scope: {
          type: caller.isAdmin ? 'admin' : 'supervisor',
          role: caller.role,
          candidateCount: 0,
        },
      });
    }

    // ---- Hydrate candidate_profiles rows, chunked ----
    const candidatesById = new Map();

    for (const slice of chunk(scopedIds, CHUNK_SIZE)) {
      const { data: rows, error: fetchError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, created_at, supervisor_id')
        .in('id', slice);

      if (fetchError) {
        logError('candidate_profiles chunk', fetchError, {
          chunkSize: slice.length,
          totalIds: scopedIds.length,
          role: caller.role,
        });
        return res.status(500).json({ success: false, error: 'Failed to load candidates' });
      }

      (rows || []).forEach((row) => {
        if (row?.id) candidatesById.set(row.id, row);
      });
    }

    const candidates = Array.from(candidatesById.values());

    // Deterministic order: full_name asc, fallback to email.
    candidates.sort((a, b) => {
      const an = (a.full_name || '').toLowerCase();
      const bn = (b.full_name || '').toLowerCase();
      if (an && bn && an !== bn) return an < bn ? -1 : 1;
      if (an && !bn) return -1;
      if (!an && bn) return 1;
      return (a.email || '').localeCompare(b.email || '');
    });

    const shaped = candidates.map((c) => ({
      id: c.id,
      full_name: c.full_name || '',
      email: c.email || '',
      university: c.university || '',
      programme: c.programme || '',
      created_at: c.created_at || null,
      supervisor_id: c.supervisor_id || null,
    }));

    return res.status(200).json({
      success: true,
      candidates: shaped,
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
        role: caller.role,
        candidateCount: shaped.length,
      },
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
