// pages/api/admin/roles/update.js
// Phase 3 Item 4 — Roles
// Updates one role via update_role RPC. Code is locked after creation.
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';

const VALID_CATEGORIES = ['university', 'programme'];

// ============================================================
// HELPER: validate request body
// ============================================================
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  // Explicit rejection — code is immutable.
  if (Object.prototype.hasOwnProperty.call(body, 'code')) {
    return { ok: false, status: 400, error: 'code cannot be changed after creation' };
  }

  const { role_id, name, category, description, display_order, is_active } = body;

  if (!Number.isInteger(role_id) || role_id <= 0) {
    return { ok: false, status: 400, error: 'role_id must be a positive integer' };
  }

  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, status: 400, error: 'name is required' };
  }
  if (name.length > 200) {
    return { ok: false, status: 400, error: 'name must be 200 chars or fewer' };
  }

  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    return { ok: false, status: 400, error: 'category must be university or programme' };
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return { ok: false, status: 400, error: 'description must be a string or null' };
  }

  if (display_order !== undefined && display_order !== null) {
    if (!Number.isInteger(display_order) || display_order < 0) {
      return { ok: false, status: 400, error: 'display_order must be a non-negative integer or null' };
    }
  }

  if (is_active !== undefined && is_active !== null && typeof is_active !== 'boolean') {
    return { ok: false, status: 400, error: 'is_active must be a boolean or null' };
  }

  return { ok: true };
}

// ============================================================
// API HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const validation = validateBody(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        error: validation.error
      });
    }

    const {
      role_id,
      name,
      category,
      description = null,
      display_order = null,
      is_active = null
    } = req.body;

    const { data, error } = await serviceClient.rpc('update_role', {
      p_role_id: role_id,
      p_name: name.trim(),
      p_category: category,
      p_description: description,
      p_display_order: display_order,
      p_is_active: is_active
    });

    if (error) {
      console.error('[Roles Update] rpc error:', error);
      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Role ${role_id} not found`
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
        error: `Failed to update role: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      role_id: data?.role_id ?? null
    });
  } catch (error) {
    console.error('[Roles Update] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
