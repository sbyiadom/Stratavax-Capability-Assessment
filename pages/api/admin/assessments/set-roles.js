// pages/api/admin/assessments/set-roles.js
// Phase 3 Item 4 — Tag an assessment with roles (full replace).
// Atomic via set_assessment_roles RPC.

import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const { assessment_id, role_ids } = body;

  if (typeof assessment_id !== 'string' || !UUID_RE.test(assessment_id)) {
    return { ok: false, status: 400, error: 'assessment_id must be a valid UUID' };
  }

  if (!Array.isArray(role_ids)) {
    return { ok: false, status: 400, error: 'role_ids must be an array' };
  }

  for (let i = 0; i < role_ids.length; i++) {
    if (!Number.isInteger(role_ids[i]) || role_ids[i] <= 0) {
      return { ok: false, status: 400, error: `role_ids[${i}] must be a positive integer` };
    }
  }

  // de-dupe while validating
  const deduped = Array.from(new Set(role_ids));
  if (deduped.length !== role_ids.length) {
    return { ok: false, status: 400, error: 'role_ids contains duplicates' };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const validation = validateBody(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        error: validation.error
      });
    }

    const { assessment_id, role_ids } = req.body;

    const { data, error } = await serviceClient.rpc('set_assessment_roles', {
      p_assessment_id: assessment_id,
      p_role_ids: role_ids
    });

    if (error) {
      console.error('[Assessment Set-Roles] rpc error:', error);
      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Assessment ${assessment_id} not found`
        });
      }
      if (code === '22023') {
        return res.status(400).json({
          success: false,
          error: error.message || 'Validation failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: `Failed to set roles: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      assessment_id: data?.assessment_id ?? null,
      role_ids: data?.role_ids ?? [],
      inserted: data?.inserted ?? 0
    });
  } catch (error) {
    console.error('[Assessment Set-Roles] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
