// pages/api/admin/assign-assessments.js
// Phase 7A — server-side endpoint for the admin assign-assessments page.
//
// Replaces five client-side Supabase operations in
// pages/admin/assign-assessments.js with one authenticated endpoint.
//
// Three actions, all admin-gated:
//   GET  ?action=load                            → candidates + assessments + supervisors
//   GET  ?action=status&assessmentId=<uuid>      → candidate_assessments status for one assessment
//   POST ?action=assign                          → batch upsert candidate_assessments
//
// Uses service role, so RLS won't affect it. The endpoint enforces admin
// at the API layer.

import { createClient } from '@supabase/supabase-js';
import { authorizeRequest } from '../../../utils/apiAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ['blocked', 'unblocked', 'scheduled', 'completed', 'in_progress'];

// ============================================================
// HELPERS
// ============================================================
function isValidUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

function isValidIsoDate(v) {
  if (typeof v !== 'string' || v === '') return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

// ============================================================
// ACTION: load
// ============================================================
async function handleLoad(serviceClient) {
  const [candidateResponse, assessmentResponse, supervisorResponse] = await Promise.all([
    serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, phone, supervisor_id, supervisor:supervisor_profiles(id, full_name, email)')
      .order('created_at', { ascending: false }),
    serviceClient
      .from('assessments')
      .select('id, title, description, is_active, assessment_type:assessment_types(id, code, name, icon)')
      .eq('is_active', true)
      .order('title', { ascending: true }),
    serviceClient
      .from('supervisor_profiles')
      .select('id, full_name, email, role, is_active')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
  ]);

  if (candidateResponse.error) {
    console.error('[assign-assessments] candidates error:', candidateResponse.error);
    return { error: candidateResponse.error.message, status: 500 };
  }
  if (assessmentResponse.error) {
    console.error('[assign-assessments] assessments error:', assessmentResponse.error);
    return { error: assessmentResponse.error.message, status: 500 };
  }
  if (supervisorResponse.error) {
    console.error('[assign-assessments] supervisors error:', supervisorResponse.error);
    return { error: supervisorResponse.error.message, status: 500 };
  }

  return {
    candidates: candidateResponse.data || [],
    assessments: assessmentResponse.data || [],
    supervisors: supervisorResponse.data || [],
  };
}

// ============================================================
// ACTION: status
// ============================================================
async function handleStatus(serviceClient, assessmentId) {
  if (!isValidUuid(assessmentId)) {
    return { error: 'assessmentId must be a valid UUID', status: 400 };
  }

  const { data, error } = await serviceClient
    .from('candidate_assessments')
    .select('user_id, status, is_scheduled, scheduled_start, scheduled_end')
    .eq('assessment_id', assessmentId);

  if (error) {
    console.error('[assign-assessments] status error:', error);
    return { error: error.message, status: 500 };
  }

  const statusMap = {};
  (data || []).forEach((item) => {
    statusMap[item.user_id] = {
      status: item.status,
      is_scheduled: item.is_scheduled,
      scheduled_start: item.scheduled_start,
      scheduled_end: item.scheduled_end,
    };
  });

  return { status: statusMap };
}

// ============================================================
// ACTION: assign (batch upsert)
// ============================================================
async function handleAssign(serviceClient, callerUserId, body) {
  const {
    candidateIds,
    assessmentId,
    targetStatus,
    scheduleFields,
  } = body || {};

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { error: 'candidateIds must be a non-empty array', status: 400 };
  }
  if (candidateIds.length > 500) {
    return { error: 'candidateIds cannot exceed 500 in one request', status: 400 };
  }
  const invalidCandidate = candidateIds.find((id) => !isValidUuid(id));
  if (invalidCandidate) {
    return { error: 'All candidateIds must be valid UUIDs', status: 400 };
  }
  if (!isValidUuid(assessmentId)) {
    return { error: 'assessmentId must be a valid UUID', status: 400 };
  }
  if (typeof targetStatus !== 'string' || !VALID_STATUSES.includes(targetStatus)) {
    return { error: `targetStatus must be one of: ${VALID_STATUSES.join(', ')}`, status: 400 };
  }

  // Validate scheduleFields
  const schedule = scheduleFields && typeof scheduleFields === 'object' ? scheduleFields : {};
  const isScheduled = schedule.is_scheduled === true;

  if (isScheduled) {
    if (!isValidIsoDate(schedule.scheduled_start)) {
      return { error: 'scheduled_start must be a valid ISO timestamp', status: 400 };
    }
    if (!isValidIsoDate(schedule.scheduled_end)) {
      return { error: 'scheduled_end must be a valid ISO timestamp', status: 400 };
    }
    if (new Date(schedule.scheduled_start) >= new Date(schedule.scheduled_end)) {
      return { error: 'scheduled_start must be before scheduled_end', status: 400 };
    }
  }

  const now = new Date().toISOString();

  const rows = candidateIds.map((userId) => ({
    user_id: userId,
    assessment_id: assessmentId,
    status: targetStatus,
    unblocked_at: targetStatus === 'unblocked' ? now : null,
    is_scheduled: isScheduled ? true : false,
    scheduled_start: isScheduled ? schedule.scheduled_start : null,
    scheduled_end: isScheduled ? schedule.scheduled_end : null,
    scheduled_by: isScheduled ? callerUserId : null,
    scheduled_at: isScheduled ? now : null,
    updated_at: now,
    created_at: now,
  }));

  const { data, error } = await serviceClient
    .from('candidate_assessments')
    .upsert(rows, {
      onConflict: 'user_id,assessment_id',
      ignoreDuplicates: false,
    })
    .select('id, user_id');

  if (error) {
    console.error('[assign-assessments] upsert error:', error);
    return { error: error.message, status: 500 };
  }

  return {
    written: Array.isArray(data) ? data.length : 0,
    rowIds: (data || []).map((r) => r.id),
  };
}

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // ============================================================
    // AUTH — admin only
    // ============================================================
    const auth = await authorizeRequest(req, ['admin']);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { serviceClient, caller } = auth;
    const action = typeof req.query.action === 'string' ? req.query.action : '';

    // -------- GET ?action=load --------
    if (req.method === 'GET' && action === 'load') {
      const result = await handleLoad(serviceClient);
      if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error });
      return res.status(200).json({
        success: true,
        candidates: result.candidates,
        assessments: result.assessments,
        supervisors: result.supervisors,
      });
    }

    // -------- GET ?action=status&assessmentId=X --------
    if (req.method === 'GET' && action === 'status') {
      const assessmentId = typeof req.query.assessmentId === 'string' ? req.query.assessmentId : '';
      const result = await handleStatus(serviceClient, assessmentId);
      if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error });
      return res.status(200).json({ success: true, status: result.status });
    }

    // -------- POST ?action=assign --------
    if (req.method === 'POST' && action === 'assign') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const result = await handleAssign(serviceClient, caller.userId, body);
      if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error });
      return res.status(200).json({
        success: true,
        written: result.written,
        rowIds: result.rowIds,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Provide ?action=load, ?action=status&assessmentId=X (GET), or ?action=assign (POST).',
    });
  } catch (error) {
    console.error('[assign-assessments] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
