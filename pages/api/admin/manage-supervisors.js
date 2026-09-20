// pages/api/admin/manage-supervisors.js
// Phase 7A — admin endpoint for the Manage Supervisors page.
//
// Replaces two client-side reads and one client-side write in
// pages/admin/manage-supervisors.js:
//   • GET  ?action=load           → list of supervisor_profiles
//   • POST ?action=toggle-status  → set is_active on one supervisor
//
// Admin-gated via utils/apiAuth.

import { createClient } from '@supabase/supabase-js';
import { authorizeRequest } from '../../../utils/apiAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleLoad(serviceClient) {
  const { data, error } = await serviceClient
    .from('supervisor_profiles')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/manage-supervisors] load error:', error);
    return { error: error.message, status: 500 };
  }

  return { supervisors: data || [] };
}

async function handleToggleStatus(serviceClient, body) {
  const supervisorId = typeof body?.supervisorId === 'string' ? body.supervisorId : '';

  if (!UUID_RE.test(supervisorId)) {
    return { error: 'supervisorId must be a valid UUID', status: 400 };
  }

  // Look up the current row first so we know what to flip and can enforce
  // the "admin accounts cannot be deactivated here" rule server-side.
  const { data: existing, error: lookupError } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', supervisorId)
    .maybeSingle();

  if (lookupError) {
    console.error('[admin/manage-supervisors] lookup error:', lookupError);
    return { error: lookupError.message, status: 500 };
  }

  if (!existing) {
    return { error: 'Supervisor not found', status: 404 };
  }

  if (existing.role === 'admin') {
    return { error: 'Admin accounts cannot be deactivated from this page.', status: 403 };
  }

  const nextActive = !existing.is_active;

  const { error: updateError } = await serviceClient
    .from('supervisor_profiles')
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supervisorId);

  if (updateError) {
    console.error('[admin/manage-supervisors] update error:', updateError);
    return { error: updateError.message, status: 500 };
  }

  return { is_active: nextActive };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // ============================================================
    // AUTH — admin only
    // ============================================================
    const auth = await authorizeRequest(req, ['admin']);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { serviceClient } = auth;
    const action = typeof req.query.action === 'string' ? req.query.action : '';

    // -------- GET ?action=load --------
    if (req.method === 'GET' && action === 'load') {
      const result = await handleLoad(serviceClient);
      if (result.error) {
        return res.status(result.status || 500).json({ success: false, error: result.error });
      }
      return res.status(200).json({
        success: true,
        supervisors: result.supervisors,
      });
    }

    // -------- POST ?action=toggle-status --------
    if (req.method === 'POST' && action === 'toggle-status') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const result = await handleToggleStatus(serviceClient, body);
      if (result.error) {
        return res.status(result.status || 500).json({ success: false, error: result.error });
      }
      return res.status(200).json({
        success: true,
        is_active: result.is_active,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Provide ?action=load (GET) or ?action=toggle-status (POST).',
    });
  } catch (error) {
    console.error('[admin/manage-supervisors] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
