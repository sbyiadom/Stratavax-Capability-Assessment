// pages/api/admin/dashboard-data.js
// Phase 7A — admin-only endpoint returning the row-level data the admin
// dashboard needs for its charts, filters, and recent activity panels.
//
// Complements /api/admin/dashboard-stats (which returns aggregate counts).
// Replaces four client-side supabase.from() reads in pages/admin/index.js.
//
// Payload note: candidate_assessments currently has ~10k rows and the page
// selects '*'. This preserves current behavior. If payload becomes an issue,
// trim the projection to the fields the page actually uses.

import { createClient } from '@supabase/supabase-js';

async function resolveAdmin(serviceClient, authClient, token) {
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
    console.error('[admin/dashboard-data] profile lookup failed:', profileError.message);
    return { error: 'Unable to verify caller identity', status: 500 };
  }

  const resolvedRole = profile?.role || metadataRole;

  if (profile?.is_active === false) {
    return { error: 'Account is inactive', status: 403 };
  }

  if (resolvedRole !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { userId, role: resolvedRole };
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
      console.error('[admin/dashboard-data] Missing Supabase credentials');
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

    // ============================================================
    // DATA — same shape as the previous four client-side reads
    // ============================================================
    const [candidatesResponse, resultsResponse, assignmentsResponse] = await Promise.all([
      serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, created_at')
        .order('created_at', { ascending: false }),
      serviceClient
        .from('assessment_results')
        .select('id, user_id, assessment_id, total_score, max_score, percentage_score, completed_at, recommendation')
        .order('completed_at', { ascending: false }),
      serviceClient
        .from('candidate_assessments')
        .select('*'),
    ]);

    if (candidatesResponse.error) {
      console.error('[admin/dashboard-data] candidates fetch failed:', candidatesResponse.error);
      return res.status(500).json({ success: false, error: candidatesResponse.error.message });
    }

    if (resultsResponse.error) {
      console.error('[admin/dashboard-data] results fetch failed:', resultsResponse.error);
      return res.status(500).json({ success: false, error: resultsResponse.error.message });
    }

    if (assignmentsResponse.error) {
      console.error('[admin/dashboard-data] assignments fetch failed:', assignmentsResponse.error);
      return res.status(500).json({ success: false, error: assignmentsResponse.error.message });
    }

    return res.status(200).json({
      success: true,
      allCandidates: candidatesResponse.data || [],
      allResults: resultsResponse.data || [],
      candidateAssessments: assignmentsResponse.data || [],
    });
  } catch (error) {
    console.error('[admin/dashboard-data] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
