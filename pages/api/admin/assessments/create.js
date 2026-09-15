// pages/api/admin/assessments/create.js
// Phase 3 — Assessment Builder
// Creates one assessment row via create_assessment RPC.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// HELPER: validate request body
// ============================================================
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const { title, assessment_type_id, description, instructions, is_active, expires_at } = body;

  if (typeof title !== 'string' || title.trim() === '') {
    return { ok: false, status: 400, error: 'title is required' };
  }
  if (title.length > 200) {
    return { ok: false, status: 400, error: 'title must be 200 chars or fewer' };
  }
  if (!Number.isInteger(assessment_type_id) || assessment_type_id <= 0) {
    return { ok: false, status: 400, error: 'assessment_type_id must be a positive integer' };
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
      title,
      assessment_type_id,
      description = null,
      instructions = null,
      is_active = true,
      expires_at = null
    } = req.body;

    const { data, error } = await serviceClient.rpc('create_assessment', {
      p_title: title.trim(),
      p_assessment_type_id: assessment_type_id,
      p_description: description,
      p_instructions: instructions,
      p_is_active: is_active,
      p_expires_at: expires_at
    });

    if (error) {
      console.error('[Assessment Builder Create] rpc error:', error);
      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Assessment type ${assessment_type_id} not found`
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
        error: `Failed to create assessment: ${error.message}`
      });
    }

    return res.status(201).json({
      success: true,
      assessment_id: data?.assessment_id ?? null
    });
  } catch (error) {
    console.error('[Assessment Builder Create] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
