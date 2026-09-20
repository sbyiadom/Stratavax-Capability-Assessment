// pages/api/admin/audit-logs.js
// Phase 7A — admin-only endpoint that returns audit log entries.
// Replaces the client-side supabase.from("audit_logs") read in
// pages/admin/audit-logs.js. Prepares for RLS enforcement.
//
// Fix (post-7A): the original version used an embedded join
//   supervisor:supervisor_profiles(full_name, email)
// which requires a FK relationship between audit_logs and
// supervisor_profiles. There isn't one (user_id references auth.users,
// not supervisor_profiles), so PostgREST rejected the query with
// "Could not find a relationship".
//
// Now: query audit_logs without the join, then look up supervisor names
// in a second query, then stitch the results together in JS. Rows whose
// user_id does not resolve to a supervisor are returned with
// supervisor = null, which the page already handles.
//
// Admin role enforced server-side.

import { createClient } from '@supabase/supabase-js';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

function getDateBoundary(range) {
  const now = new Date();
  const start = new Date();

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (range === 'week') {
    start.setDate(now.getDate() - 7);
    return start.toISOString();
  }
  if (range === 'month') {
    start.setDate(now.getDate() - 30);
    return start.toISOString();
  }
  return null; // 'all' or unknown
}

async function resolveCaller(serviceClient, authClient, token) {
  if (!token) {
    return { error: 'Unauthorized: No token provided', status: 401 };
  }

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
    console.error('[admin/audit-logs] profile lookup failed:', profileError.message);
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
      console.error('[admin/audit-logs] Missing Supabase credentials', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials',
      });
    }

    // ============================================================
    // AUTH
    // ============================================================
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token || ''}` } },
    });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const caller = await resolveCaller(serviceClient, authClient, token);
    if (caller.error) {
      return res.status(caller.status || 401).json({ success: false, error: caller.error });
    }

    // ============================================================
    // DATA — no embedded join
    // ============================================================
    const range = typeof req.query.range === 'string' ? req.query.range : 'today';
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    let query = serviceClient
      .from('audit_logs')
      .select('id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    const boundary = getDateBoundary(range);
    if (boundary) {
      query = query.gte('created_at', boundary);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[admin/audit-logs] fetch error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to load audit logs',
      });
    }

    const logs = Array.isArray(rows) ? rows : [];

    // ============================================================
    // SECOND QUERY — resolve supervisor names for the user_ids we saw
    // ============================================================
    const userIds = [
      ...new Set(logs.map((r) => r.user_id).filter(Boolean)),
    ];

    let supervisorMap = {};

    if (userIds.length > 0) {
      const { data: supervisors, error: supervisorsError } = await serviceClient
        .from('supervisor_profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (supervisorsError) {
        // Non-fatal — logs are still useful without names.
        console.error('[admin/audit-logs] supervisor lookup failed:', supervisorsError);
      } else {
        supervisorMap = (supervisors || []).reduce((acc, s) => {
          acc[s.id] = { full_name: s.full_name, email: s.email };
          return acc;
        }, {});
      }
    }

    // ============================================================
    // STITCH — attach supervisor object (or null)
    // ============================================================
    const enriched = logs.map((row) => ({
      ...row,
      supervisor: row.user_id ? (supervisorMap[row.user_id] || null) : null,
    }));

    return res.status(200).json({
      success: true,
      logs: enriched,
    });
  } catch (error) {
    console.error('[admin/audit-logs] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
