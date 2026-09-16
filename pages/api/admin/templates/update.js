// pages/api/admin/templates/update.js
// Phase 3 Item 5 — Assessment templates
// Updates one template + replaces its role links via update_template RPC.

import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const {
    template_id, name, title_pattern, assessment_type_id, description,
    instructions, default_is_active, expires_in_days, is_active, role_ids
  } = body;

  if (typeof template_id !== 'string' || !UUID_RE.test(template_id)) {
    return { ok: false, status: 400, error: 'template_id must be a valid UUID' };
  }
  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, status: 400, error: 'name is required' };
  }
  if (name.length > 200) {
    return { ok: false, status: 400, error: 'name must be 200 chars or fewer' };
  }
  if (title_pattern !== undefined && title_pattern !== null) {
    if (typeof title_pattern !== 'string') {
      return { ok: false, status: 400, error: 'title_pattern must be a string or null' };
    }
    if (title_pattern.length > 200) {
      return { ok: false, status: 400, error: 'title_pattern must be 200 chars or fewer' };
    }
  }
  if (assessment_type_id !== undefined && assessment_type_id !== null) {
    if (!Number.isInteger(assessment_type_id) || assessment_type_id <= 0) {
      return { ok: false, status: 400, error: 'assessment_type_id must be a positive integer or null' };
    }
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return { ok: false, status: 400, error: 'description must be a string or null' };
  }
  if (instructions !== undefined && instructions !== null && typeof instructions !== 'string') {
    return { ok: false, status: 400, error: 'instructions must be a string or null' };
  }
  if (default_is_active !== undefined && default_is_active !== null && typeof default_is_active !== 'boolean') {
    return { ok: false, status: 400, error: 'default_is_active must be a boolean or null' };
  }
  if (is_active !== undefined && is_active !== null && typeof is_active !== 'boolean') {
    return { ok: false, status: 400, error: 'is_active must be a boolean or null' };
  }
  if (expires_in_days !== undefined && expires_in_days !== null) {
    if (!Number.isInteger(expires_in_days) || expires_in_days <= 0) {
      return { ok: false, status: 400, error: 'expires_in_days must be a positive integer or null' };
    }
  }
  if (role_ids !== undefined && role_ids !== null) {
    if (!Array.isArray(role_ids)) {
      return { ok: false, status: 400, error: 'role_ids must be an array or null' };
    }
    for (let i = 0; i < role_ids.length; i++) {
      if (!Number.isInteger(role_ids[i]) || role_ids[i] <= 0) {
        return { ok: false, status: 400, error: `role_ids[${i}] must be a positive integer` };
      }
    }
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

    const {
      template_id,
      name,
      title_pattern = null,
      assessment_type_id = null,
      description = null,
      instructions = null,
      default_is_active = null,
      expires_in_days = null,
      is_active = null,
      role_ids = null
    } = req.body;

    const { data, error } = await serviceClient.rpc('update_template', {
      p_template_id: template_id,
      p_name: name.trim(),
      p_title_pattern: title_pattern,
      p_assessment_type_id: assessment_type_id,
      p_description: description,
      p_instructions: instructions,
      p_default_is_active: default_is_active,
      p_expires_in_days: expires_in_days,
      p_is_active: is_active,
      p_role_ids: role_ids
    });

    if (error) {
      console.error('[Templates Update] rpc error:', error);
      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: error.message || 'Template or assessment type not found'
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
        error: `Failed to update template: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      template_id: data?.template_id ?? null,
      roles_linked: data?.roles_linked ?? 0
    });
  } catch (error) {
    console.error('[Templates Update] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
