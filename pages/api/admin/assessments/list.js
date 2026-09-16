// pages/api/admin/assessments/list.js
// Phase 3 — Assessment Builder (read-only)
// Returns all assessments, joined with their assessment_type and role tags.

import { createClient } from '@supabase/supabase-js';

function parsePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const roleFilter = req.query.role_id;
    let roleIdFilter = null;
    if (roleFilter !== undefined && roleFilter !== null && roleFilter !== '') {
      const n = Number(roleFilter);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role_id: must be a positive integer'
        });
      }
      roleIdFilter = n;
    }

    const DEFAULT_LIMIT = 200;
    const MAX_LIMIT = 500;
    const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    const limit = Math.min(limitRaw, MAX_LIMIT);
    const offset = parsePositiveInt(req.query.offset, 0);

    // ---------- if role_id filter is provided, pre-resolve matching assessment ids ----------
    let restrictedAssessmentIds = null;
    if (roleIdFilter) {
      const { data: matches, error: matchError } = await serviceClient
        .from('assessment_roles')
        .select('assessment_id')
        .eq('role_id', roleIdFilter);

      if (matchError) {
        console.error('[Assessment Builder List] role filter error:', matchError);
        return res.status(500).json({
          success: false,
          error: `Failed to filter by role: ${matchError.message}`
        });
      }

      restrictedAssessmentIds = (matches || []).map((m) => m.assessment_id);

      if (restrictedAssessmentIds.length === 0) {
        return res.status(200).json({
          success: true,
          assessments: [],
          total: 0,
          filters_applied: {
            assessment_type_id: assessmentTypeId,
            role_id: roleIdFilter,
            search,
            limit,
            offset
          }
        });
      }
    }

    // ---------- count ----------
    let countQuery = serviceClient
      .from('assessments')
      .select('id', { count: 'exact', head: true });

    if (assessmentTypeId) countQuery = countQuery.eq('assessment_type_id', assessmentTypeId);
    if (search) countQuery = countQuery.ilike('title', `%${search}%`);
    if (restrictedAssessmentIds) countQuery = countQuery.in('id', restrictedAssessmentIds);

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[Assessment Builder List] count error:', countError);
      return res.status(500).json({
        success: false,
        error: `Failed to count assessments: ${countError.message}`
      });
    }

    // ---------- list (with embedded types + roles) ----------
    let listQuery = serviceClient
      .from('assessments')
      .select(`
        id, title, assessment_type_id, description, instructions,
        is_active, expires_at, created_at, updated_at,
        assessment_types(id, code, name, question_count, time_limit_minutes),
        assessment_roles(roles(id, code, name))
      `)
      .order('title', { ascending: true })
      .range(offset, offset + limit - 1);

    if (assessmentTypeId) listQuery = listQuery.eq('assessment_type_id', assessmentTypeId);
    if (search) listQuery = listQuery.ilike('title', `%${search}%`);
    if (restrictedAssessmentIds) listQuery = listQuery.in('id', restrictedAssessmentIds);

    const { data: assessments, error: listError } = await listQuery;

    if (listError) {
      console.error('[Assessment Builder List] list error:', listError);
      return res.status(500).json({
        success: false,
        error: `Failed to load assessments: ${listError.message}`
      });
    }

    // ---------- normalize ----------
    const normalized = (assessments || []).map((a) => ({
      id: a.id,
      title: a.title,
      assessment_type_id: a.assessment_type_id,
      description: a.description,
      instructions: a.instructions,
      is_active: a.is_active,
      expires_at: a.expires_at,
      created_at: a.created_at,
      updated_at: a.updated_at,
      assessment_type: a.assessment_types
        ? {
            id: a.assessment_types.id,
            code: a.assessment_types.code,
            name: a.assessment_types.name,
            question_count: a.assessment_types.question_count,
            time_limit_minutes: a.assessment_types.time_limit_minutes
          }
        : null,
      roles: Array.isArray(a.assessment_roles)
        ? a.assessment_roles
            .map((ar) => ar.roles)
            .filter(Boolean)
            .map((r) => ({ id: r.id, code: r.code, name: r.name }))
            .sort((x, y) => x.name.localeCompare(y.name))
        : []
    }));

    return res.status(200).json({
      success: true,
      assessments: normalized,
      total: totalCount || 0,
      filters_applied: {
        assessment_type_id: assessmentTypeId,
        role_id: roleIdFilter,
        search,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('[Assessment Builder List] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
