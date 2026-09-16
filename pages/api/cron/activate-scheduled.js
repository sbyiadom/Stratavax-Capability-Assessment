// pages/api/cron/activate-scheduled.js
// Phase 3 item 6 — activation cron.
// Runs daily via Vercel Cron. Flips scheduled rows to their next state:
//   • start <= now < end  → 'unblocked'
//   • end   <= now        → 'blocked'
// Idempotent — safe to run multiple times.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Vercel Cron sends GET; allow POST for manual testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Optional shared-secret check.
  // If CRON_SECRET is set in Vercel env vars, Vercel Cron will send it as
  // Authorization: Bearer <secret>. Manual calls (curl / reqbin) must send
  // the same. If CRON_SECRET is unset, this check is skipped.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      console.warn('[Activate Scheduled] Unauthorized call');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
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
