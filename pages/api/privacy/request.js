// pages/api/privacy/request.js
// Phase 7H — Candidate-facing privacy request submission.
//
// A logged-in candidate POSTs to this endpoint to request:
//   - 'access'      → they want a copy of their data
//   - 'correction'  → they want inaccurate data corrected
//   - 'deletion'    → they want their personal data removed
//
// The request is inserted with status 'pending'. An admin reviews and
// approves/rejects it via the admin endpoints.
//
// Authentication:
//   - Supabase Auth session (candidate must be logged in)
//   - RLS on privacy_requests enforces candidate_id = auth.uid()
//
// Rate limiting:
//   - A candidate can have at most ONE pending request at a time.
//   - If they already have a pending request, return 409 so they can't
//     spam the queue.

import { createClient } from '@supabase/supabase-js';

const LOG_TAG = '[Privacy Request]';

function cleanText(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(`${LOG_TAG} Missing Supabase env vars`);
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  // Authenticate: candidate must be logged in.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: authError } = await client.auth.getUser(token);
  if (authError || !userData?.user) {
    console.warn(`${LOG_TAG} Auth failed:`, authError?.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }

  const candidateId = userData.user.id;

  // Validate request body
  const body = req.body || {};
  const requestType = cleanText(body.request_type || body.requestType).toLowerCase();

  const VALID_TYPES = ['access', 'correction', 'deletion'];
  if (!VALID_TYPES.includes(requestType)) {
    return res.status(400).json({
      success: false,
      error: `request_type must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  // Optional details — for correction requests, this is where the candidate
  // describes what needs fixing. For deletion, they can explain context.
  const details = typeof body.details === 'object' && body.details !== null ? body.details : {};

  // For correction requests, require a description so the admin knows what to fix.
  if (requestType === 'correction') {
    const description = cleanText(details.description);
    if (!description || description.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'For correction requests, please describe what needs to be corrected (at least 10 characters).',
      });
    }
    details.description = description;
  }

  // Extract request metadata for audit purposes.
  const ipAddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = cleanText(req.headers['user-agent']) || null;

  try {
    // Confirm the candidate profile exists
    const { data: profile, error: profileError } = await client
      .from('candidate_profiles')
      .select('id, full_name, email')
      .eq('id', candidateId)
      .maybeSingle();

    if (profileError) {
      console.error(`${LOG_TAG} Profile lookup failed:`, profileError.message);
      return res.status(500).json({ success: false, error: 'Failed to verify candidate profile' });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'No candidate profile found for this account',
      });
    }

    // Rate limit: block if the candidate already has a pending request.
    const { data: existing, error: existingError } = await client
      .from('privacy_requests')
      .select('id, request_type, status, requested_at')
      .eq('candidate_id', candidateId)
      .in('status', ['pending', 'in_review'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error(`${LOG_TAG} Existing request lookup failed:`, existingError.message);
      return res.status(500).json({ success: false, error: 'Failed to check existing requests' });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You already have a pending privacy request. Please wait for it to be processed before submitting another.',
        existing_request: {
          id: existing.id,
          request_type: existing.request_type,
          status: existing.status,
          requested_at: existing.requested_at,
        },
      });
    }

    // Insert the new request.
    const insertPayload = {
      candidate_id: candidateId,
      request_type: requestType,
      status: 'pending',
      details,
      requested_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    const { data: inserted, error: insertError } = await client
      .from('privacy_requests')
      .insert(insertPayload)
      .select('id, request_type, status, requested_at')
      .single();

    if (insertError) {
      console.error(`${LOG_TAG} Insert failed:`, {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
      });
      return res.status(500).json({ success: false, error: 'Failed to submit privacy request' });
    }

    console.log(`${LOG_TAG} Request created:`, {
      id: inserted.id,
      candidate: candidateId,
      type: requestType,
    });

    return res.status(200).json({
      success: true,
      message: 'Your privacy request has been submitted. An administrator will review it within 30 days.',
      request: {
        id: inserted.id,
        request_type: inserted.request_type,
        status: inserted.status,
        requested_at: inserted.requested_at,
      },
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
