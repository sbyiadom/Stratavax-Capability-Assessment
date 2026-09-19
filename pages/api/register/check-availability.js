// pages/api/register/check-availability.js
// Phase 7A — unauthenticated availability check for the registration flow.
//
// Replaces the direct supabase reads in pages/register.js.
// Called during signup when the user has no session yet, so this endpoint
// intentionally does NOT require an Authorization header.
//
// Returns only booleans — never any candidate data — so the leak surface is
// minimal. Uses head:true count queries.

import { createClient } from '@supabase/supabase-js';

function logError(tag, error, extra = {}) {
  console.error(`[Register Check Availability] ${tag}`, {
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
      console.error('[Register Check Availability] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const body = req.body || {};

    const wantName =
      Object.prototype.hasOwnProperty.call(body, 'fullName') &&
      typeof body.fullName === 'string' &&
      body.fullName.trim().length >= 3;

    const wantEmail =
      Object.prototype.hasOwnProperty.call(body, 'email') &&
      typeof body.email === 'string' &&
      body.email.includes('@') &&
      body.email.trim().length >= 5;

    if (!wantName && !wantEmail) {
      return res.status(400).json({
        success: false,
        error: 'Provide either fullName or email to check.',
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const result = {};

    // -------- Name availability --------
    if (wantName) {
      const name = body.fullName.trim();

      // ilike on the substring, then filter for exact case-insensitive match
      // in JS to avoid SQL wildcards in the user's input.
      const { data: nameRows, error: nameError } = await serviceClient
        .from('candidate_profiles')
        .select('full_name')
        .ilike('full_name', name);

      if (nameError) {
        logError('name check failed', nameError);
        return res.status(500).json({ success: false, error: 'Failed to check name' });
      }

      const lowerName = name.toLowerCase();
      const taken = (nameRows || []).some(
        (row) =>
          typeof row?.full_name === 'string' &&
          row.full_name.trim().toLowerCase() === lowerName
      );

      result.fullNameAvailable = !taken;
    }

    // -------- Email availability --------
    if (wantEmail) {
      const email = body.email.trim().toLowerCase();

      const { data: emailRows, error: emailError } = await serviceClient
        .from('candidate_profiles')
        .select('id')
        .eq('email', email);

      if (emailError) {
        logError('email check failed', emailError);
        return res.status(500).json({ success: false, error: 'Failed to check email' });
      }

      result.emailAvailable = (emailRows || []).length === 0;
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Register Check Availability] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
