// pages/api/admin/current-expiration.js
// Phase 7A — returns the current expires_at for the National Service
// assessment. Admin-gated. Replaces the client-side supabase.from('assessments')
// read in components/admin/AssessmentExpiration.js.
//
// Uses service role, so RLS on `assessments` won't affect this.

import { createClient } from '@supabase/supabase-js';

const NATIONAL_SERVICE_TITLE = 'National Service Recruitment Assessment';

async function resolveAdmin(serviceClient, authClient, token) {
  const { data: userData, error: authError } = await authClient.auth.getUser(token);

  if (authError || !userData?.user) {
    return { error: 'Unauthorized: Invalid token', status: 401 };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[admin/current-expiration] profile lookup failed:', profileError.message);
    return { error: 'Unable to verify caller identity', status: 500 };
  }

  const metadataRole = userData.user.user_metadata?.role || null;
  const resolvedRole = profile?.role || metadataRole;

  if (profile?.is_active === false) {
    return { error: 'Account is inactive', status: 403 };
  }

  if (resolvedRole !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { userId: userData.user.id, role: resolvedRole };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[admin/current-expiration] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const caller = await resolveAdmin(serviceClient, authClient, token);
    if (caller.error) {
      return res.status(caller.status || 401).json({ success: false, error: caller.error });
    }

    const { data, error } = await serviceClient
      .from('assessments')
      .select('expires_at')
      .eq('title', NATIONAL_SERVICE_TITLE)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[admin/current-expiration] fetch failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      expires_at: data?.expires_at || null,
    });
  } catch (error) {
    console.error('[admin/current-expiration] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
