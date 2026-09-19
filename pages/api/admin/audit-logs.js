// pages/api/admin/audit-logs.js
// Phase 7A — admin-only endpoint that returns audit log entries.
// Replaces the client-side supabase.from("audit_logs") read in
// pages/admin/audit-logs.js. Prepares for RLS enforcement.
//
// Admin role enforced server-side. The client no longer needs to
// verify role via supervisor_profiles — the endpoint does it.

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

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error('[admin/audit-logs] auth.getUser failed:', authError?.message);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // ============================================================
    // AUTHORIZATION — admin only
    // ============================================================
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await serviceClient
      .from('supervisor_profiles')
      .select('id, role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[admin/audit-logs] profile lookup failed:', profileError.message);
      return res.status(500).json({ success: false, error: 'Unable to verify caller role' });
    }

    const metadataRole = userData.user.user_metadata?.role || null;
    const resolvedRole = profile?.role || metadataRole;

    if (profile?.is_active === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (resolvedRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // ============================================================
    // DATA
    // ============================================================
    const range = typeof req.query.range === 'string' ? req.query.range : 'today';
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    let query = serviceClient
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent,
        created_at,
        supervisor:supervisor_profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const boundary = getDateBoundary(range);
    if (boundary) {
      query = query.gte('created_at', boundary);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[admin/audit-logs] fetch error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to load audit logs',
      });
    }

    return res.status(200).json({
      success: true,
      logs: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    console.error('[admin/audit-logs] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
