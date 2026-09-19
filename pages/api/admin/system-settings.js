// pages/api/admin/system-settings.js
// Phase 7A — admin-only endpoint for system settings operations.
// Replaces three client-side reads/writes in pages/admin/system-settings.js:
//   • load   — read the single settings row (id = 1)
//   • save   — upsert the settings row
//   • status — check availability of four tables
// Prepares for RLS enforcement.

import { createClient } from '@supabase/supabase-js';

// Must match DEFAULT_SETTINGS in pages/admin/system-settings.js
const DEFAULTS = {
  site_name: 'Stratavax',
  support_email: 'support@stratavax.com',
  default_assessment_time_limit: 180,
  default_passing_score: 80,
  enable_registration: true,
  require_email_confirmation: true,
  session_timeout: 60,
  max_login_attempts: 5,
  maintenance_mode: false,
};

function cleanText(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return fallback;
  return parsed;
}

function clampNumber(value, min, max, fallback) {
  const parsed = toNumber(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeSettings(raw) {
  const input = raw || {};
  return {
    site_name: cleanText(input.site_name, DEFAULTS.site_name).trim() || DEFAULTS.site_name,
    support_email: cleanText(input.support_email, DEFAULTS.support_email).trim() || DEFAULTS.support_email,
    default_assessment_time_limit: clampNumber(input.default_assessment_time_limit, 30, 300, DEFAULTS.default_assessment_time_limit),
    default_passing_score: clampNumber(input.default_passing_score, 0, 100, DEFAULTS.default_passing_score),
    enable_registration: Boolean(input.enable_registration),
    require_email_confirmation: Boolean(input.require_email_confirmation),
    session_timeout: clampNumber(input.session_timeout, 5, 240, DEFAULTS.session_timeout),
    max_login_attempts: clampNumber(input.max_login_attempts, 3, 10, DEFAULTS.max_login_attempts),
    maintenance_mode: Boolean(input.maintenance_mode),
  };
}

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
    console.error('[admin/system-settings] profile lookup failed:', profileError.message);
    return { error: 'Unable to verify caller role', status: 500 };
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

async function handleLoad(serviceClient) {
  const { data, error } = await serviceClient
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[admin/system-settings] load error:', error);
    return { error: error.message, status: 500 };
  }

  // If the row doesn't exist, return defaults so the page renders something sensible.
  const settings = data ? { ...DEFAULTS, ...data } : { ...DEFAULTS };
  return { settings };
}

async function handleSave(serviceClient, userId, body) {
  const sanitized = sanitizeSettings(body);

  const { error } = await serviceClient
    .from('system_settings')
    .upsert({
      id: 1,
      ...sanitized,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: 'id' });

  if (error) {
    console.error('[admin/system-settings] save error:', error);
    return { error: error.message, status: 500 };
  }

  return { settings: sanitized };
}

async function checkTableStatus(serviceClient, tableName) {
  try {
    const { error } = await serviceClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    if (error) return 'Unavailable';
    return 'Active';
  } catch {
    return 'Unavailable';
  }
}

async function handleStatus(serviceClient) {
  const [supervisors, candidates, assessments, systemSettings] = await Promise.all([
    checkTableStatus(serviceClient, 'supervisor_profiles'),
    checkTableStatus(serviceClient, 'candidate_profiles'),
    checkTableStatus(serviceClient, 'assessments'),
    checkTableStatus(serviceClient, 'system_settings'),
  ]);

  return { status: { supervisors, candidates, assessments, systemSettings } };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[admin/system-settings] Missing Supabase credentials', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
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

    const action = typeof req.query.action === 'string' ? req.query.action : '';

    if (req.method === 'GET' && action === 'load') {
      const result = await handleLoad(serviceClient);
      if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error });
      return res.status(200).json({ success: true, settings: result.settings });
    }

    if (req.method === 'POST' && action === 'save') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const result = await handleSave(serviceClient, caller.userId, body);
      if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error });
      return res.status(200).json({ success: true, settings: result.settings });
    }

    if (req.method === 'GET' && action === 'status') {
      const result = await handleStatus(serviceClient);
      return res.status(200).json({ success: true, status: result.status });
    }

    return res.status(400).json({
      success: false,
      error: 'Provide ?action=load, ?action=save (POST), or ?action=status',
    });
  } catch (error) {
    console.error('[admin/system-settings] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
