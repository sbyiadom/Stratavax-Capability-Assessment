// pages/api/admin/templates/list.js
// Phase 3 Item 5 — Assessment templates (read-only)
// Returns templates with their nested default roles.
// Same shape conventions as the other admin list endpoints.

import { createClient } from '@supabase/supabase-js';

function parsePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // ---------- query params ----------
    const search = typeof req.query.search === 'string' && req.query.search.trim() !== ''
      ? req.query.search.trim()
      : null;

    const typeFilter = req.query.assessment_type_id;
    let assessmentTypeId = null;
    if (typeFilter !== undefined && typeFilter !== null && typeFilter !== '') {
      const n = Number(typeFilter);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid assessment_type_id: must be a positive integer'
        });
      }
      assessmentTypeId = n;
    }

    const includeInactive =
      req.query.include_inactive === '1' || req.query.include_inactive === 'true';

    const DEFAULT_LIMIT = 200;
    const MAX_LIMIT = 500;
    const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    const limit = Math.min(limitRaw, MAX_LIMIT);
    const offset = parsePositiveInt(req.query.offset, 0);

    // ---------- count ----------
    let countQuery = serviceClient
      .from('assessment_templates')
      .select('id', { count: 'exact', head: true });

    if (assessmentTypeId) countQuery = countQuery.eq('assessment_type_id', assessmentTypeId);
    if (search) countQuery = countQuery.ilike('name', `%${search}%`);
    if (!includeInactive) countQuery = countQuery.eq('is_active', true);

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[Templates List] count error:', countError);
      return res.status(500).json({
        success: false,
        error: `Failed to count templates: ${countError.message}`
      });
    }

    // ---------- list with nested type + roles ----------
    let listQuery = serviceClient
      .from('assessment_templates')
      .select(`
        id, name, title_pattern, assessment_type_id,
        description, instructions, default_is_active,
        expires_in_days, is_active, created_at, updated_at,
        assessment_types(id, code, name, question_count, time_limit_minutes),
        assessment_template_roles(roles(id, code, name, category))
      `)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (assessmentTypeId) listQuery = listQuery.eq('assessment_type_id', assessmentTypeId);
    if (search) listQuery = listQuery.ilike('name', `%${search}%`);
    if (!includeInactive) listQuery = listQuery.eq('is_active', true);

    const { data: templates, error: listError } = await listQuery;

    if (listError) {
      console.error('[Templates List] list error:', listError);
      return res.status(500).json({
        success: false,
        error: `Failed to load templates: ${listError.message}`
      });
    }

    // ---------- normalize ----------
    const normalized = (templates || []).map((t) => ({
      id: t.id,
      name: t.name,
      title_pattern: t.title_pattern,
      assessment_type_id: t.assessment_type_id,
      description: t.description,
      instructions: t.instructions,
      default_is_active: t.default_is_active,
      expires_in_days: t.expires_in_days,
      is_active: t.is_active,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assessment_type: t.assessment_types
        ? {
            id: t.assessment_types.id,
            code: t.assessment_types.code,
            name: t.assessment_types.name,
            question_count: t.assessment_types.question_count,
            time_limit_minutes: t.assessment_types.time_limit_minutes
          }
        : null,
      roles: Array.isArray(t.assessment_template_roles)
        ? t.assessment_template_roles
            .map((tr) => tr.roles)
            .filter(Boolean)
            .map((r) => ({ id: r.id, code: r.code, name: r.name, category: r.category }))
            .sort((x, y) => x.name.localeCompare(y.name))
        : []
    }));

    return res.status(200).json({
      success: true,
      templates: normalized,
      total: totalCount || 0,
      filters_applied: {
        assessment_type_id: assessmentTypeId,
        search,
        include_inactive: includeInactive,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('[Templates List] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
