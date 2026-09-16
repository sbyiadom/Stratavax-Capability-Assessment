// pages/api/admin/roles/delete.js
// Phase 3 Item 4 — Roles
// Deletes one role via delete_role RPC.
// Refuses if the role is tagged to any assessment.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// API HANDLER
// ============================================================
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

    // ---------- validate body ----------
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a JSON object'
      });
    }

    const { role_id } = body;
    if (!Number.isInteger(role_id) || role_id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'role_id must be a positive integer'
      });
    }

    // ---------- call RPC ----------
    const { data, error } = await serviceClient.rpc('delete_role', {
      p_role_id: role_id
    });

    if (error) {
      console.error('[Roles Delete] rpc error:', error);
      const code = error.code;

      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Role ${role_id} not found`
        });
      }

      if (code === '23503') {
        return res.status(409).json({
          success: false,
          error: error.message || 'Role is in use and cannot be deleted'
        });
      }

      return res.status(500).json({
        success: false,
        error: `Failed to delete role: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      role_id: data?.role_id ?? null,
      code: data?.code ?? null
    });
  } catch (error) {
    console.error('[Roles Delete] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
