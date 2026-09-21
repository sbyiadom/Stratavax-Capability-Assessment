// pages/api/supervisor/candidate-assignments.js
// Phase 7B — load / save assignments for a single candidate.
//
// Serves pages/supervisor/assign-assessment/[id].js.
//
// Usage:
//   GET  /api/supervisor/candidate-assignments?action=load&candidateId=<uuid>
//        → { success, candidate, assigned[], assessments[] }
//
//   POST /api/supervisor/candidate-assignments?action=save&candidateId=<uuid>
//        body: { toAdd: [assessmentId], toRemove: [assessmentId] }
//        → { success }
//
// SCOPE:
//   Admin may load/save any candidate.
//   Supervisor may only load/save candidates in their scope, verified via
//   get_scoped_candidate_ids (the same primitive used by every other
//   supervisor endpoint).
//
// WRITES:
//   toAdd / toRemove are applied atomically through the existing
//   assign_candidate_assessments(candidateId, toAdd, toRemove) RPC.
//   No direct INSERT/DELETE on candidate_assessments.

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Supervisor Candidate Assignments]';
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

function isValidUUID(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

// ============================================================
// Scope check
// ============================================================
// Returns true if the caller is allowed to see/act on this candidate.

async function isCandidateInScope(serviceClient, caller, candidateId) {
  if (caller.isAdmin) return true;

  const { data: scopedRows, error } = await serviceClient.rpc(
    'get_scoped_candidate_ids',
    { p_caller: caller.userId, p_is_admin: false }
  );

  if (error) {
    logError('rpc get_scoped_candidate_ids', error, {
      role: caller.role,
      userId: caller.userId,
    });
    return false;
  }

  const scopedIds = Array.isArray(scopedRows)
    ? scopedRows
        .map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids))
        .filter(Boolean)
    : [];

  return scopedIds.includes(candidateId);
}

// ============================================================
// LOAD
// ============================================================
// Returns:
//   { candidate, assigned[], assessments[] }
//
// - candidate     : row from candidate_profiles
// - assigned[]    : rows from candidate_assessments for this candidate
//                   (id, assessment_id, status, result_id)
// - assessments[] : all active assessments, each with an embedded
//                   assessment_type (code, name, icon, gradient_*)

async function handleLoad(serviceClient, caller, candidateId, res) {
  // ---- Candidate ----
  const { data: candidate, error: candidateError } = await serviceClient
    .from('candidate_profiles')
    .select('id, full_name, email, university, programme, created_at, supervisor_id')
    .eq('id', candidateId)
    .maybeSingle();

  if (candidateError) {
    logError('candidate_profiles lookup', candidateError, { candidateId });
    return res.status(500).json({ success: false, error: 'Failed to load candidate.' });
  }

  if (!candidate) {
    return res.status(404).json({ success: false, error: 'Candidate not found.' });
  }

  // ---- Assigned (candidate_assessments for this candidate) ----
  const { data: assigned, error: assignedError } = await serviceClient
    .from('candidate_assessments')
    .select('id, assessment_id, status, result_id')
    .eq('user_id', candidateId);

  if (assignedError) {
    logError('candidate_assessments lookup', assignedError, { candidateId });
    return res.status(500).json({ success: false, error: 'Failed to load assignments.' });
  }

  // ---- Active assessments (list to select from) ----
  // Fetch assessments with embedded assessment_type.
  // The FK relationship is assessments.assessment_type_id → assessment_types.id,
  // so PostgREST can embed it directly.
  const { data: assessments, error: assessmentsError } = await serviceClient
    .from('assessments')
    .select(`
      id,
      title,
      description,
      assessment_type_id,
      assessment_types:assessment_type_id (
        id,
        code,
        name,
        icon,
        gradient_start,
        gradient_end
      )
    `)
    .eq('is_active', true)
    .order('title', { ascending: true });

  if (assessmentsError) {
    logError('assessments lookup', assessmentsError);
    return res.status(500).json({ success: false, error: 'Failed to load assessments.' });
  }

  // Normalize the embedded join: PostgREST returns assessment_types as
  // either an object or an array depending on FK cardinality. The page
  // expects assessment.assessment_type to be an object with code/name/icon/
  // gradient_start/gradient_end.
  const normalized = (assessments || []).map((a) => {
    const rawType = a.assessment_types;
    const typeObj = Array.isArray(rawType) ? rawType[0] || null : rawType || null;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      assessment_type: typeObj
        ? {
            id: typeObj.id,
            code: typeObj.code,
            name: typeObj.name,
            icon: typeObj.icon,
            gradient_start: typeObj.gradient_start,
            gradient_end: typeObj.gradient_end,
          }
        : { code: 'general', name: 'General' },
    };
  });

  return res.status(200).json({
    success: true,
    candidate: {
      id: candidate.id,
      full_name: candidate.full_name || '',
      email: candidate.email || '',
      university: candidate.university || '',
      programme: candidate.programme || '',
      created_at: candidate.created_at || null,
      supervisor_id: candidate.supervisor_id || null,
    },
    assigned: (assigned || []).map((row) => ({
      id: row.id,
      assessment_id: row.assessment_id,
      status: row.status,
      result_id: row.result_id,
    })),
    assessments: normalized,
    scope: {
      type: caller.isAdmin ? 'admin' : 'supervisor',
      role: caller.role,
      candidateId,
    },
  });
}

// ============================================================
// SAVE
// ============================================================
// Body: { toAdd: [assessmentId], toRemove: [assessmentId] }
// Uses assign_candidate_assessments(candidateId, toAdd, toRemove) RPC.

async function handleSave(serviceClient, caller, candidateId, req, res) {
  const body = req.body || {};
  const toAdd = Array.isArray(body.toAdd) ? body.toAdd.filter(isValidUUID) : [];
  const toRemove = Array.isArray(body.toRemove) ? body.toRemove.filter(isValidUUID) : [];

  if (toAdd.length === 0 && toRemove.length === 0) {
    return res.status(200).json({ success: true, added: 0, removed: 0 });
  }

  const { data, error } = await serviceClient.rpc('assign_candidate_assessments', {
    p_candidate_id: candidateId,
    p_to_add: toAdd,
    p_to_remove: toRemove,
  });

  if (error) {
    logError('rpc assign_candidate_assessments', error, {
      candidateId,
      toAdd,
      toRemove,
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save assignments.',
    });
  }

  console.log(`${LOG_TAG} assignments updated`, {
    by: caller.userId,
    byRole: caller.role,
    candidateId,
    toAdd,
    toRemove,
    rpcResult: data,
  });

  return res.status(200).json({
    success: true,
    added: toAdd.length,
    removed: toRemove.length,
    result: data || null,
  });
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ---- Auth ----
  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;

  try {
    const action = String(req.query.action || '').toLowerCase();
    const candidateId = String(req.query.candidateId || '').trim();

    if (!candidateId || !isValidUUID(candidateId)) {
      return res.status(400).json({ success: false, error: 'Valid candidateId is required.' });
    }

    if (action !== 'load' && action !== 'save') {
      return res.status(400).json({ success: false, error: 'action must be "load" or "save".' });
    }

    if (action === 'save' && req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'save requires POST.' });
    }

    if (action === 'load' && req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'load requires GET.' });
    }

    // ---- Scope check ----
    const inScope = await isCandidateInScope(serviceClient, caller, candidateId);
    if (!inScope) {
      logError('scope check rejected', { message: 'candidate out of scope' }, {
        role: caller.role,
        userId: caller.userId,
        candidateId,
      });
      return res.status(403).json({
        success: false,
        error: 'This candidate is not in your scope.',
      });
    }

    if (action === 'load') {
      return await handleLoad(serviceClient, caller, candidateId, res);
    }

    return await handleSave(serviceClient, caller, candidateId, req, res);
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
