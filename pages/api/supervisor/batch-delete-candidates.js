// pages/api/supervisor/batch-delete-candidates.js
// Phase 7A — server-side endpoint for batch candidate deletion.
// Replaces two client-side DELETE calls in pages/supervisor/batch-manage.js.
//
// Deletes both the candidate_profiles row AND the auth.users record so
// re-registration with the same email works.
//
// Supervisors may only delete candidates in their scope (candidate_profiles
// .supervisor_id match OR candidate_supervisors junction match). Admins may
// delete any candidate.

import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCaller(serviceClient, authClient, token) {
  const { data: userData, error: authError } = await authClient.auth.getUser(token);

  if (authError || !userData?.user) {
    return { error: 'Unauthorized: Invalid token', status: 401 };
  }

  const userId = userData.user.id;
  const metadataRole = userData.user.user_metadata?.role || null;

  const { data: profile, error: profileError } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[batch-delete-candidates] profile lookup failed:', profileError.message);
    return { error: 'Unable to verify caller identity', status: 500 };
  }

  const resolvedRole = profile?.role || metadataRole;

  if (profile?.is_active === false) {
    return { error: 'Account is inactive', status: 403 };
  }

  if (resolvedRole !== 'admin' && resolvedRole !== 'supervisor') {
    return { error: 'Supervisor or admin access required', status: 403 };
  }

  return {
    userId,
    role: resolvedRole,
    isAdmin: resolvedRole === 'admin',
  };
}

async function getScopedCandidateIds(serviceClient, supervisorId) {
  const ids = new Set();

  const { data: primaryRows, error: primaryError } = await serviceClient
    .from('candidate_profiles')
    .select('id')
    .eq('supervisor_id', supervisorId);

  if (primaryError) {
    console.error('[batch-delete-candidates] primary scope lookup failed:', primaryError.message);
  } else {
    (primaryRows || []).forEach((row) => {
      if (row?.id) ids.add(row.id);
    });
  }

  const { data: junctionRows, error: junctionError } = await serviceClient
    .from('candidate_supervisors')
    .select('candidate_id')
    .eq('supervisor_id', supervisorId);

  if (junctionError) {
    console.error('[batch-delete-candidates] junction scope lookup failed:', junctionError.message);
  } else {
    (junctionRows || []).forEach((row) => {
      if (row?.candidate_id) ids.add(row.candidate_id);
    });
  }

  return ids;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[batch-delete-candidates] Missing Supabase credentials');
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

    const caller = await resolveCaller(serviceClient, authClient, token);
    if (caller.error) {
      return res.status(caller.status || 401).json({ success: false, error: caller.error });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const rawIds = Array.isArray(body.candidateIds) ? body.candidateIds : [];

    const candidateIds = rawIds.filter((id) => typeof id === 'string' && UUID_RE.test(id));

    if (candidateIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid candidateIds provided' });
    }

    // Scope check for supervisors.
    if (!caller.isAdmin) {
      const scoped = await getScopedCandidateIds(serviceClient, caller.userId);
      const outOfScope = candidateIds.filter((id) => !scoped.has(id));

      if (outOfScope.length > 0) {
        return res.status(403).json({
          success: false,
          error: `You do not have permission to delete ${outOfScope.length} of the selected candidate(s).`,
        });
      }
    }

    // 1. Delete profile rows.
    const { error: profileDeleteError } = await serviceClient
      .from('candidate_profiles')
      .delete()
      .in('id', candidateIds);

    if (profileDeleteError) {
      console.error('[batch-delete-candidates] profile delete failed:', profileDeleteError);
      return res.status(500).json({ success: false, error: profileDeleteError.message });
    }

    // 2. Delete auth.users rows. Collect failures but don't fail the whole request —
    //    profiles are already gone, and reporting the number of auth-delete failures
    //    lets the caller know to clean up manually if needed.
    const authDeleteFailures = [];
    for (const id of candidateIds) {
      try {
        const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(id);
        if (authDeleteError) {
          authDeleteFailures.push({ id, message: authDeleteError.message });
        }
      } catch (err) {
        authDeleteFailures.push({ id, message: err.message || 'unknown error' });
      }
    }

    if (authDeleteFailures.length > 0) {
      console.error('[batch-delete-candidates] some auth.users deletes failed:', authDeleteFailures);
    }

    return res.status(200).json({
      success: true,
      deletedProfiles: candidateIds.length,
      deletedAuthUsers: candidateIds.length - authDeleteFailures.length,
      authDeleteFailures: authDeleteFailures.length > 0 ? authDeleteFailures : undefined,
    });
  } catch (error) {
    console.error('[batch-delete-candidates] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
