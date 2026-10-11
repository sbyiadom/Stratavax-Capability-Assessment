// pages/api/admin/privacy/requests/[id]/reject.js
// Phase 7H — Admin rejection endpoint for privacy requests.
//
// Marks a pending or in_review privacy request as rejected, with a
// required reason. No candidate data is modified.
//
// The rejection reason is stored on the request and is visible to the
// candidate when they check their request status.
//
// Auth: admin only.

import { authorizeRequest } from '../../../../../../utils/apiAuth';

const LOG_TAG = '[Privacy Reject]';

function cleanText(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).trim();
}

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
    // Validate body
    const body = req.body || {};
    const rejectionReason = cleanText(body.rejection_reason || body.reason);
    const notes = cleanText(body.notes) || null;

    if (!rejectionReason || rejectionReason.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'A rejection reason is required (at least 10 characters). The candidate will see this reason.',
      });
    }

    // Load the request
    const { data: request, error: requestErr } = await serviceClient
      .from('privacy_requests')
      .select('id, candidate_id, request_type, status, requested_at')
      .eq('id', requestId)
      .maybeSingle();

    if (requestErr) {
      console.error(`${LOG_TAG} Request lookup failed:`, requestErr.message);
      return res.status(500).json({ success: false, error: 'Failed to load request' });
    }

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    // Guard: only pending or in_review requests can be rejected
    if (!['pending', 'in_review'].includes(request.status)) {
      return res.status(409).json({
        success: false,
        error: `Cannot reject a request with status "${request.status}". Only pending or in_review requests can be rejected.`,
        current_status: request.status,
      });
    }

    const reviewerId = caller.userId;

    // Update the request
    const { data: updated, error: updateErr } = await serviceClient
      .from('privacy_requests')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('id, status, reviewed_by, reviewed_at, rejection_reason, notes')
      .single();

    if (updateErr) {
      console.error(`${LOG_TAG} Failed to reject request:`, updateErr.message);
      return res.status(500).json({ success: false, error: 'Failed to reject request' });
    }

    console.log(`${LOG_TAG} Request ${requestId} rejected by ${reviewerId}`);

    return res.status(200).json({
      success: true,
      message: 'Privacy request rejected. The reason has been recorded and will be shown to the candidate.',
      request: updated,
    });

  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
