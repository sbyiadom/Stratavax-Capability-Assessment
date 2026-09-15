// pages/api/admin/assessments/update.js
// Phase 3 — Assessment Builder
// Updates one assessment via update_assessment RPC.
// assessment_type_id is intentionally locked and will be rejected if sent.

import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// HELPER: validate body
// ============================================================
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  // Explicit rejection rather than silent ignore.
  if (Object.prototype.hasOwnProperty.call(body, 'assessment_type_id')) {
    return {
      ok: false,
      status: 400,
      error: 'assessment_type_id cannot be changed after creation'
    };
  }

  const { assessment_id, title, description, instructions, is_active, expires_at } = body;

  if (typeof assessment_id !== 'string' || !UUID_RE.test(assessment_id)) {
    return { ok: false, status: 400, error: 'assessment_id must be a valid UUID' };
  }

  if (typeof title !== 'string' || title.trim() === '') {
    return { ok: false, status: 400, error: 'title is required' };
  }

  if (title.length > 200) {
    return { ok: false, status: 400, error: 'title must be 200 chars or fewer' };
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return { ok: false, status: 400, error: 'description must be a string or null' };
  }

  if (instructions !== undefined && instructions !== null && typeof instructions !== 'string') {
    return { ok: false, status: 400, error: 'instructions must be a string or null' };
  }

  if (is_active !== undefined && is_active !== null && typeof is_active !== 'boolean') {
    return { ok: false, status: 400, error: 'is_active must be a boolean or null' };
  }

  if (expires_at !== undefined && expires_at !== null) {
    if (typeof expires_at !== 'string') {
      return { ok: false, status: 400, error: 'expires_at must be an ISO string or null' };
    }
    const d = new Date(expires_at);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, status: 400, error: 'expires_at must be a valid ISO date string' };
    }
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
      assessment_id,
      title,
      description = null,
      instructions = null,
      is_active = null,
      expires_at = null
    } = req.body;

    const { data, error } = await serviceClient.rpc('update_assessment', {
      p_assessment_id: assessment_id,
      p_title: title.trim(),
      p_description: description,
      p_instructions: instructions,
      p_is_active: is_active,
      p_expires_at: expires_at
    });

    if (error) {
      console.error('[Assessment Builder Update] rpc error:', error);

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
        error: `Failed to update assessment: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      assessment_id: data?.assessment_id ?? null
    });
  } catch (error) {
    console.error('[Assessment Builder Update] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
