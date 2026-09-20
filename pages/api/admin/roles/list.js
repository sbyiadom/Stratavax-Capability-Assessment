// pages/api/admin/roles/list.js
// Phase 3 Item 4 — Role-based assessments (read-only)
// Returns roles, optionally filtered by category ('university' | 'programme').
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';

const VALID_CATEGORIES = ['university', 'programme'];

// ============================================================
// API HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
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

    // ---------- query params ----------
    const rawCategory = req.query.category;
    let category = null;

    if (rawCategory !== undefined && rawCategory !== null && rawCategory !== '') {
      if (typeof rawCategory !== 'string' || !VALID_CATEGORIES.includes(rawCategory)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
        });
      }
      category = rawCategory;
    }

    const includeInactive =
      req.query.include_inactive === '1' || req.query.include_inactive === 'true';

    // ---------- load ----------
    let query = serviceClient
      .from('roles')
      .select('id, code, name, description, category, display_order, is_active')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (category) query = query.eq('category', category);
    if (!includeInactive) query = query.eq('is_active', true);

    const { data: roles, error } = await query;

    if (error) {
      console.error('[Roles List] query error:', error);
      return res.status(500).json({
        success: false,
        error: `Failed to load roles: ${error.message}`
      });
    }

    // ---------- normalize ----------
    const normalized = (roles || []).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      category: r.category,
      display_order: r.display_order,
      is_active: r.is_active
    }));

    return res.status(200).json({
      success: true,
      roles: normalized,
      total: normalized.length,
      filters_applied: {
        category,
        include_inactive: includeInactive
      }
    });
  } catch (error) {
    console.error('[Roles List] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
