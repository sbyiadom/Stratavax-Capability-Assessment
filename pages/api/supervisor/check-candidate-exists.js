// pages/api/supervisor/check-candidate-exists.js
// Phase 7A — checks whether a candidate email already exists.
//
// Replaces the direct supabase read in pages/supervisor/add-candidate.js.
// Admin- or supervisor-level callers only. Returns { exists: boolean }.

import { createClient } from '@supabase/supabase-js';
import { resolveCallerRole } from '../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Check Candidate Exists] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Check Candidate Exists] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !userData?.user) {
      logError('auth.getUser failed', authError || { message: 'no user' });
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const caller = await resolveCallerRole(
      serviceClient,
      userData.user.id,
      userData.user.user_metadata || null
    );

    if (caller.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (!caller.isAdmin && !caller.isSupervisor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const { data: existing, error: checkError } = await serviceClient
      .from('candidate_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      logError('candidate lookup failed', checkError, { email });
      return res.status(500).json({ success: false, error: 'Failed to check candidate' });
    }

    return res.status(200).json({
      success: true,
      exists: !!existing,
      candidateId: existing?.id || null,
    });
  } catch (error) {
    console.error('[Check Candidate Exists] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
