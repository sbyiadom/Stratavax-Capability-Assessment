// pages/api/admin/templates/delete.js
// Phase 3 Item 5 — Assessment templates
// Deletes one template via delete_template RPC.
// No guard needed — templates have no downstream references.

import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a JSON object'
      });
    }

    const { template_id } = body;
    if (typeof template_id !== 'string' || !UUID_RE.test(template_id)) {
      return res.status(400).json({
        success: false,
        error: 'template_id must be a valid UUID'
      });
    }

    const { data, error } = await serviceClient.rpc('delete_template', {
      p_template_id: template_id
    });

    if (error) {
      console.error('[Templates Delete] rpc error:', error);
      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Template ${template_id} not found`
        });
      }
      return res.status(500).json({
        success: false,
        error: `Failed to delete template: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      template_id: data?.template_id ?? null,
      name: data?.name ?? null,
      roles_unlinked: data?.roles_unlinked ?? 0
    });
  } catch (error) {
    console.error('[Templates Delete] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
