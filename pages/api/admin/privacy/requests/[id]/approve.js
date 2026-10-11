// pages/api/admin/privacy/requests/[id]/approve.js
// Phase 7H — Admin approval endpoint for privacy requests.
//
// Approves a pending privacy request and executes the corresponding action:
//
//   deletion    → anonymizes the candidate using the same logic as the
//                 retention cron. Anonymization replaces identifying fields
//                 with the sentinel, preserving aggregate scores.
//
//   correction  → applies admin-provided corrections to candidate_profiles.
//                 The corrections come in the request body as { corrections: {...} }.
//
//   access      → in this session, returns a placeholder. Full export
//                 generation is in Session 5 (GET /api/admin/privacy/export/[candidateId]).
//
// The endpoint marks the request as completed, records the reviewer, and
// logs the action to anonymization_log.
//
// Auth: admin only.

import { authorizeRequest } from '../../../../../utils/apiAuth';

const LOG_TAG = '[Privacy Approve]';

// Fields in candidate_profiles that can be corrected by admins.
// Restrict to identity/education fields. Do not allow changes to role,
// id, email (auth-managed), or supervisor assignment through this path.
const ALLOWED_CORRECTION_FIELDS = new Set([
  'full_name',
  'phone',
  'university',
  'programme',
  'degree_level_id',
  'graduation_year',
  'preferred_department',
]);

function cleanText(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).trim();
}

// ------------------------------------------------------------
// Deletion action — anonymize the candidate using the sentinel.
//
// This mirrors the retention cron's logic but scoped to a single candidate.
// After this runs, the candidate's data becomes aggregate-only.
// ------------------------------------------------------------
async function executeDeletion(serviceClient, request, reviewerId) {
  const sentinelId = process.env.ANONYMIZATION_SENTINEL_ID;
  if (!sentinelId) {
    throw new Error('ANONYMIZATION_SENTINEL_ID is not set');
  }

  const candidateId = request.candidate_id;

  // Guard: never anonymize the sentinel itself
  if (candidateId === sentinelId) {
    throw new Error('Cannot anonymize the sentinel candidate');
  }

  // Verify the candidate exists and isn't already anonymized
  const { data: profile, error: profileErr } = await serviceClient
    .from('candidate_profiles')
    .select('id, full_name, email')
    .eq('id', candidateId)
    .maybeSingle();

  if (profileErr) {
    throw new Error(`Candidate lookup failed: ${profileErr.message}`);
  }
  if (!profile) {
    throw new Error('Candidate profile not found');
  }
  if (profile.email?.startsWith('anonymized')) {
    // Already anonymized — idempotent success
    return {
      action: 'deletion',
      status: 'already_anonymized',
      candidate_id: candidateId,
    };
  }

  // 1. Anonymize candidate_profiles
  const anonymizedEmail = `anonymized+${candidateId.slice(0, 8)}@stratavax.internal`;

  const { error: profileUpdateErr } = await serviceClient
    .from('candidate_profiles')
    .update({
      full_name: '[Anonymized]',
      email: anonymizedEmail,
      phone: '+233000000000',
      university: null,
      programme: null,
      degree_level_id: null,
      graduation_year: null,
      preferred_department: null,
      supervisor_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidateId);

  if (profileUpdateErr) {
    throw new Error(`Failed to anonymize profile: ${profileUpdateErr.message}`);
  }

  // 2. Reassign assessment_results to the sentinel
  const { error: resultsErr, count: resultsCount } = await serviceClient
    .from('assessment_results')
    .update(
      { user_id: sentinelId, updated_at: new Date().toISOString() },
      { count: 'exact' }
    )
    .eq('user_id', candidateId);

  if (resultsErr) {
    console.error(`${LOG_TAG} Results anonymization warning:`, resultsErr.message);
  }

  // 3. Reassign candidate_competency_scores to the sentinel
  const { error: scoresErr, count: scoresCount } = await serviceClient
    .from('candidate_competency_scores')
    .update(
      { candidate_id: sentinelId },
      { count: 'exact' }
    )
    .eq('candidate_id', candidateId);

  if (scoresErr) {
    console.error(`${LOG_TAG} Competency scores anonymization warning:`, scoresErr.message);
  }

  // 4. Hard delete responses (item-level data)
  const { error: responsesErr, count: responsesCount } = await serviceClient
    .from('responses')
    .delete({ count: 'exact' })
    .eq('user_id', candidateId);

  if (responsesErr) {
    console.error(`${LOG_TAG} Responses deletion warning:`, responsesErr.message);
  }

  // 5. Hard delete assessment_sessions
  const { error: sessionsErr, count: sessionsCount } = await serviceClient
    .from('assessment_sessions')
    .delete({ count: 'exact' })
    .eq('user_id', candidateId);

  if (sessionsErr) {
    console.error(`${LOG_TAG} Sessions deletion warning:`, sessionsErr.message);
  }

  // 6. Log the action
  const { error: logErr } = await serviceClient
    .from('anonymization_log')
    .insert({
      table_name: 'candidate_profiles',
      row_id: candidateId,
      action: 'anonymized',
      reason: `Privacy request approved by admin (request ${request.id})`,
      triggered_by: 'privacy_request',
      privacy_request_id: request.id,
      performed_by: reviewerId,
    });

  if (logErr) {
    console.error(`${LOG_TAG} Anonymization log write failed:`, logErr.message);
  }

  return {
    action: 'deletion',
    status: 'completed',
    candidate_id: candidateId,
    anonymized: {
      profile: 1,
      assessment_results: resultsCount ?? 0,
      competency_scores: scoresCount ?? 0,
    },
    deleted: {
      responses: responsesCount ?? 0,
      assessment_sessions: sessionsCount ?? 0,
    },
  };
}

// ------------------------------------------------------------
// Correction action — apply admin-provided field corrections.
//
// The request body must contain { corrections: { field: value, ... } }.
// Only ALLOWED_CORRECTION_FIELDS are accepted.
// ------------------------------------------------------------
async function executeCorrection(serviceClient, request, reviewerId, corrections) {
  if (!corrections || typeof corrections !== 'object' || Array.isArray(corrections)) {
    throw new Error('Correction requests require a corrections object in the request body');
  }

  const candidateId = request.candidate_id;
  const fields = Object.keys(corrections);

  if (fields.length === 0) {
    throw new Error('No correction fields provided');
  }

  // Filter to allowed fields
  const rejected = fields.filter(f => !ALLOWED_CORRECTION_FIELDS.has(f));
  if (rejected.length > 0) {
    throw new Error(`Cannot correct these fields: ${rejected.join(', ')}`);
  }

  // Build the update payload (strip undefined, keep null to clear)
  const updatePayload = { updated_at: new Date().toISOString() };
  fields.forEach(f => {
    updatePayload[f] = corrections[f];
  });

  // Fetch current values for the audit log
  const { data: before, error: beforeErr } = await serviceClient
    .from('candidate_profiles')
    .select(fields.join(', '))
    .eq('id', candidateId)
    .maybeSingle();

  if (beforeErr) {
    throw new Error(`Failed to load current values: ${beforeErr.message}`);
  }
  if (!before) {
    throw new Error('Candidate profile not found');
  }

  // Apply the correction
  const { error: updateErr } = await serviceClient
    .from('candidate_profiles')
    .update(updatePayload)
    .eq('id', candidateId);

  if (updateErr) {
    throw new Error(`Failed to apply correction: ${updateErr.message}`);
  }

  // Log the change in anonymization_log (using it as a general privacy-action log)
  const { error: logErr } = await serviceClient
    .from('anonymization_log')
    .insert({
      table_name: 'candidate_profiles',
      row_id: candidateId,
      action: 'anonymized', // schema doesn't have 'corrected'; we note reason
      reason: `Correction applied via privacy request ${request.id}: ${fields.join(', ')}`,
      triggered_by: 'privacy_request',
      privacy_request_id: request.id,
      performed_by: reviewerId,
    });

  if (logErr) {
    console.warn(`${LOG_TAG} Correction log write failed:`, logErr.message);
  }

  return {
    action: 'correction',
    status: 'completed',
    candidate_id: candidateId,
    fields_corrected: fields,
    before,
    after: updatePayload,
  };
}

// ------------------------------------------------------------
// Access action — placeholder for now.
//
// Session 5 will build the actual export. For this session, we mark the
// request as completed and return a pointer to the export endpoint.
// ------------------------------------------------------------
async function executeAccess(serviceClient, request, reviewerId) {
  return {
    action: 'access',
    status: 'completed',
    candidate_id: request.candidate_id,
    note: 'Export generation handled separately. Call GET /api/admin/privacy/export/[candidateId] to produce the export file.',
  };
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Admin-only auth
  const auth = await authorizeRequest(req, ['admin']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;
  const { id: requestId } = req.query;

  if (!requestId) {
    return res.status(400).json({ success: false, error: 'Missing request id' });
  }

  try {
    // Load the request
    const { data: request, error: requestErr } = await serviceClient
      .from('privacy_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestErr) {
      console.error(`${LOG_TAG} Request lookup failed:`, requestErr.message);
      return res.status(500).json({ success: false, error: 'Failed to load request' });
    }

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    // Guard: only pending or in_review requests can be approved
    if (!['pending', 'in_review'].includes(request.status)) {
      return res.status(409).json({
        success: false,
        error: `Cannot approve a request with status "${request.status}". Only pending or in_review requests can be approved.`,
        current_status: request.status,
      });
    }

    const reviewerId = caller.userId;
    let actionResult;

    // Execute the appropriate action
    if (request.request_type === 'deletion') {
      actionResult = await executeDeletion(serviceClient, request, reviewerId);
    } else if (request.request_type === 'correction') {
      const corrections = req.body?.corrections;
      actionResult = await executeCorrection(serviceClient, request, reviewerId, corrections);
    } else if (request.request_type === 'access') {
      actionResult = await executeAccess(serviceClient, request, reviewerId);
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown request_type: ${request.request_type}`,
      });
    }

    // Mark the request completed
    const notes = cleanText(req.body?.notes) || null;

    const { data: updated, error: updateErr } = await serviceClient
      .from('privacy_requests')
      .update({
        status: 'completed',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('id, status, reviewed_by, reviewed_at, completed_at, notes')
      .single();

    if (updateErr) {
      console.error(`${LOG_TAG} Failed to mark request completed:`, updateErr.message);
      return res.status(500).json({
        success: false,
        error: 'Action succeeded but failed to update request status',
        action_result: actionResult,
      });
    }

    console.log(`${LOG_TAG} Request ${requestId} approved and completed:`, actionResult);

    return res.status(200).json({
      success: true,
      message: `Privacy request approved and ${actionResult.action} executed.`,
      request: updated,
      action_result: actionResult,
    });

  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
