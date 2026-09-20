// pages/api/admin/roles/delete.js
// Phase 3 Item 4 — Roles
// Deletes one role via delete_role RPC.
// Refuses if the role is tagged to any assessment.
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';

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
