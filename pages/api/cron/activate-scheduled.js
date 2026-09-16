// pages/api/cron/activate-scheduled.js
// Phase 3 item 6 — activation cron.
// TEMPORARY DIAGNOSTIC BUILD — revert after debugging.

import { createClient } from '@supabase/supabase-js';

function safePreview(s) {
  if (!s || typeof s !== 'string') return `(empty:${typeof s})`;
  if (s.length <= 16) return s;
  return s.slice(0, 10) + '*'.repeat(Math.max(0, s.length - 15)) + s.slice(-5);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';

  // ----- DIAGNOSTIC BLOCK -----
  // If the env var is missing OR the header doesn't match, return a diagnostic
  // response so we can see what's happening without leaking the full secret.
  const expected = cronSecret ? `Bearer ${cronSecret}` : null;

  if (cronSecret && auth !== expected) {
    console.warn('[Activate Scheduled] Unauthorized call');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      _diagnostic: {
        cron_secret_loaded: !!cronSecret,
        cron_secret_length: cronSecret ? cronSecret.length : 0,
        cron_secret_preview: safePreview(cronSecret),
        received_header_length: auth.length,
        received_header_preview: safePreview(auth),
        expected_header_length: expected ? expected.length : 0,
        expected_header_preview: safePreview(expected),
        received_starts_with_bearer_space:
          typeof auth === 'string' && auth.startsWith('Bearer '),
        received_starts_with_bearer_no_space:
          typeof auth === 'string' && auth.startsWith('Bearer') && !auth.startsWith('Bearer '),
      }
    });
  }
  // ----- END DIAGNOSTIC BLOCK -----

  if (cronSecret && auth !== expected) {
    // (redundant — kept for safety)
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Activate Scheduled] Missing Supabase credentials');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await serviceClient.rpc('activate_scheduled_assessments');

    if (error) {
      console.error('[Activate Scheduled] rpc error:', error);
      return res.status(500).json({
        success: false,
        error: `Failed to run activation: ${error.message}`
      });
    }

    console.log('[Activate Scheduled] Result:', data);

    return res.status(200).json({
      success: true,
      activated: data?.activated ?? 0,
      blocked: data?.blocked ?? 0,
      ran_at: data?.ran_at ?? new Date().toISOString()
    });
  } catch (error) {
    console.error('[Activate Scheduled] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
