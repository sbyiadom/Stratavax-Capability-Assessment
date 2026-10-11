// pages/api/admin/privacy/requests.js
// Phase 7H — Admin listing endpoint for privacy requests.
//
// Returns a paginated list of privacy requests, with filters:
//   - status:    pending | in_review | approved | rejected | completed
//   - type:      access | correction | deletion
//   - candidate: a specific candidate UUID
//   - since:     ISO date — only requests at or after this time
//
// Query params:
//   ?status=pending          → filter by status
//   ?type=deletion           → filter by type
//   ?candidate=<uuid>        → filter by candidate
//   ?since=2026-10-01        → only requests on/after this date
//   ?limit=50&offset=0       → pagination (default 50, max 200)
//
// Auth:
//   - Admin only (authorizeRequest with ['admin'])
//
// Response:
//   {
//     success: true,
//     total: <count matching filters>,
//     returned: <number in this page>,
//     limit, offset,
//     requests: [ { ...request, candidate: { full_name, email } } ]
//   }

import { authorizeRequest } from '../../../../utils/apiAuth';

const LOG_TAG = '[Admin Privacy Requests]';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VALID_STATUSES = ['pending', 'in_review', 'approved', 'rejected', 'completed'];
const VALID_TYPES = ['access', 'correction', 'deletion'];

function parsePositiveInt(value, fallback, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  if (max !== undefined && n > max) return max;
  return n;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Admin-only authentication
  const auth = await authorizeRequest(req, ['admin']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { serviceClient } = auth;

  try {
    // Parse query params
    const status = req.query.status ? String(req.query.status).trim() : null;
    const type = req.query.type ? String(req.query.type).trim() : null;
    const candidate = req.query.candidate ? String(req.query.candidate).trim() : null;
    const since = req.query.since ? String(req.query.since).trim() : null;
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parsePositiveInt(req.query.offset, 0);

    // Validate filters
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    // Build the query
    let query = serviceClient
      .from('privacy_requests')
      .select(`
        id,
        candidate_id,
        request_type,
        status,
        details,
        requested_at,
        reviewed_by,
        reviewed_at,
        completed_at,
        notes,
        rejection_reason,
        ip_address,
        user_agent
      `, { count: 'exact' })
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('request_type', type);
    if (candidate) query = query.eq('candidate_id', candidate);
    if (since) query = query.gte('requested_at', since);

    const { data: requests, error: requestsError, count } = await query;

    if (requestsError) {
      console.error(`${LOG_TAG} Query failed:`, {
        message: requestsError.message,
        code: requestsError.code,
        details: requestsError.details,
      });
      return res.status(500).json({ success: false, error: 'Failed to load privacy requests' });
    }

    // Enrich with candidate profiles (name/email) in a single batched query.
    // Empty array if no candidates — skip the query entirely in that case.
    let candidateMap = {};
    if (requests && requests.length > 0) {
      const candidateIds = [...new Set(requests.map(r => r.candidate_id))];
      const { data: profiles, error: profilesError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .in('id', candidateIds);

      if (profilesError) {
        console.warn(`${LOG_TAG} Candidate enrichment failed (non-fatal):`, profilesError.message);
      } else {
        (profiles || []).forEach(p => {
          candidateMap[p.id] = {
            full_name: p.full_name,
            email: p.email,
            university: p.university,
            programme: p.programme,
          };
        });
      }
    }

    // Enrich with reviewer names (for requests that have been reviewed)
    let reviewerMap = {};
    const reviewerIds = [...new Set(
      (requests || [])
        .map(r => r.reviewed_by)
        .filter(Boolean)
    )];

    if (reviewerIds.length > 0) {
      const { data: reviewers, error: reviewersError } = await serviceClient
        .from('supervisor_profiles')
        .select('id, full_name, email, role')
        .in('id', reviewerIds);

      if (reviewersError) {
        console.warn(`${LOG_TAG} Reviewer enrichment failed (non-fatal):`, reviewersError.message);
      } else {
        (reviewers || []).forEach(r => {
          reviewerMap[r.id] = {
            full_name: r.full_name,
            email: r.email,
            role: r.role,
          };
        });
      }
    }

    // Merge enrichment into the response objects
    const enriched = (requests || []).map(r => ({
      ...r,
      candidate: candidateMap[r.candidate_id] || null,
      reviewer: r.reviewed_by ? (reviewerMap[r.reviewed_by] || null) : null,
    }));

    return res.status(200).json({
      success: true,
      total: count ?? enriched.length,
      returned: enriched.length,
      limit,
      offset,
      filters: {
        status: status || null,
        type: type || null,
        candidate: candidate || null,
        since: since || null,
      },
      requests: enriched,
    });

  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
