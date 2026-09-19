// pages/api/candidate/profile.js
// Phase 7A — server-side profile read + update for the calling candidate.
//
// Replaces the direct supabase reads/writes in pages/candidate/profile.js.
// A candidate can only read and update their own row. Column whitelist on
// update prevents escalation.

import { createClient } from '@supabase/supabase-js';

function logError(tag, error, extra = {}) {
  console.error(`[Candidate Profile] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

// Only these columns may be updated by a candidate.
const WRITABLE_COLUMNS = [
  'full_name',
  'university',
  'programme',
  'graduation_year',
  'preferred_department',
];

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Candidate Profile] Missing Supabase credentials');
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

    const userId = userData.user.id;

    // -------- GET: read own profile --------
    if (req.method === 'GET') {
      const { data: profile, error: readError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, graduation_year, preferred_department, supervisor_id, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (readError) {
        logError('read failed', readError, { userId });
        return res.status(500).json({ success: false, error: 'Failed to load profile' });
      }

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }

      return res.status(200).json({ success: true, profile });
    }

    // -------- PUT / POST: update own profile --------
    const body = req.body || {};
    const updates = { updated_at: new Date().toISOString() };

    let writableFieldCount = 0;
    for (const column of WRITABLE_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(body, column)) {
        const value = body[column];
        updates[column] =
          value === null || value === undefined
            ? null
            : String(value).trim();
        writableFieldCount += 1;
      }
    }

    if (writableFieldCount === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('candidate_profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, full_name, email, university, programme, graduation_year, preferred_department, supervisor_id, created_at, updated_at')
      .maybeSingle();

    if (updateError) {
      logError('update failed', updateError, { userId });
      return res.status(500).json({ success: false, error: 'Failed to save profile' });
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    return res.status(200).json({ success: true, profile: updated });
  } catch (error) {
    console.error('[Candidate Profile] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
