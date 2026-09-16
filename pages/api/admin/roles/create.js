// pages/api/admin/roles/create.js
// Phase 3 Item 4 — Roles
// Creates one role row via create_role RPC.

import { createClient } from '@supabase/supabase-js';

const VALID_CATEGORIES = ['university', 'programme'];

// ============================================================
// HELPER: validate request body
// ============================================================
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const { code, name, category, description, display_order, is_active } = body;

  if (typeof code !== 'string' || code.trim() === '') {
    return { ok: false, status: 400, error: 'code is required' };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(code.trim())) {
    return {
      ok: false,
      status: 400,
      error: 'code must be lowercase snake_case (a-z, 0-9, _) and start with a letter'
    };
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
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
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
      code,
      name,
      category,
      description = null,
      display_order = 100,
      is_active = true
    } = req.body;

    const { data, error } = await serviceClient.rpc('create_role', {
      p_code: code.trim(),
      p_name: name.trim(),
      p_category: category,
      p_description: description,
      p_display_order: display_order,
      p_is_active: is_active
    });

    if (error) {
      console.error('[Roles Create] rpc error:', error);
      const code_ = error.code;
      if (code_ === '23505') {
        return res.status(409).json({
          success: false,
          error: error.message || 'Code already exists'
        });
      }
      if (code_ === '22023') {
        return res.status(400).json({
          success: false,
          error: error.message || 'Validation failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: `Failed to create role: ${error.message}`
      });
    }

    return res.status(201).json({
      success: true,
      role_id: data?.role_id ?? null
    });
  } catch (error) {
    console.error('[Roles Create] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
