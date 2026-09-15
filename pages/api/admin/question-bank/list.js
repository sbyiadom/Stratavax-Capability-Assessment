// pages/api/admin/question-bank/list.js
// Phase 3 — Question Bank Manager (read-only)
// Returns questions + their 4 answers for a given assessment_type_id.
// Mirrors the client/auth/error conventions of pages/api/admin/reports.js (Option A).

import { createClient } from '@supabase/supabase-js';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// ============================================================
// HELPER: PARSE POSITIVE INT
// ============================================================
function parsePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false
      }
    });

    // ============================================================
    // STEP 1: Parse + validate query params
    // ============================================================
    const rawTypeId = req.query.assessment_type_id;

    if (rawTypeId === undefined || rawTypeId === null || rawTypeId === '') {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: assessment_type_id'
      });
    }

    const assessmentTypeId = Number(rawTypeId);
    if (!Number.isInteger(assessmentTypeId) || assessmentTypeId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment_type_id: must be a positive integer'
      });
    }

    const section = typeof req.query.section === 'string' && req.query.section.trim() !== ''
      ? req.query.section.trim()
      : null;

    const search = typeof req.query.search === 'string' && req.query.search.trim() !== ''
      ? req.query.search.trim()
      : null;

    const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    const limit = Math.min(limitRaw, MAX_LIMIT);
    const offset = parsePositiveInt(req.query.offset, 0);

    // ============================================================
    // STEP 2: Load assessment_type header (404 if unknown)
    // ============================================================
    const { data: assessmentType, error: typeError } = await serviceClient
      .from('assessment_types')
      .select('id, code, name, question_count, time_limit_minutes, is_active')
      .eq('id', assessmentTypeId)
      .maybeSingle();

    if (typeError) {
      console.error('[Question Bank List] assessment_types error:', typeError);
      return res.status(500).json({
        success: false,
        error: `Failed to load assessment type: ${typeError.message}`
      });
    }

    if (!assessmentType) {
      return res.status(404).json({
        success: false,
        error: `Assessment type ${assessmentTypeId} not found`
      });
    }

    // ============================================================
    // STEP 3: Count matching questions (for pagination total)
    // ============================================================
    let countQuery = serviceClient
      .from('unique_questions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_type_id', assessmentTypeId);

    if (section) countQuery = countQuery.eq('section', section);
    if (search) countQuery = countQuery.ilike('question_text', `%${search}%`);

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[Question Bank List] count error:', countError);
      return res.status(500).json({
        success: false,
        error: `Failed to count questions: ${countError.message}`
      });
    }

    // ============================================================
    // STEP 4: Load questions with nested answers
    // ============================================================
    let questionsQuery = serviceClient
      .from('unique_questions')
      .select(
        'id, display_order, question_text, section, subsection, unique_answers(id, answer_text, score, display_order)'
      )
      .eq('assessment_type_id', assessmentTypeId)
      .order('display_order', { ascending: true })
      .order('display_order', { referencedTable: 'unique_answers', ascending: true })
      .range(offset, offset + limit - 1);

    if (section) questionsQuery = questionsQuery.eq('section', section);
    if (search) questionsQuery = questionsQuery.ilike('question_text', `%${search}%`);

    const { data: questions, error: questionsError } = await questionsQuery;

    if (questionsError) {
      console.error('[Question Bank List] questions error:', questionsError);
      return res.status(500).json({
        success: false,
        error: `Failed to load questions: ${questionsError.message}`
      });
    }

    // ============================================================
    // STEP 5: Normalize shape — always expose answers as an array
    // ============================================================
    const normalizedQuestions = (questions || []).map((q) => ({
      id: q.id,
      display_order: q.display_order,
      question_text: q.question_text,
      section: q.section,
      subsection: q.subsection,
      answers: Array.isArray(q.unique_answers)
        ? q.unique_answers.map((a) => ({
            id: a.id,
            answer_text: a.answer_text,
            score: a.score,
            display_order: a.display_order
          }))
        : []
    }));

    // ============================================================
    // STEP 6: Respond
    // ============================================================
    return res.status(200).json({
      success: true,
      assessment_type: {
        id: assessmentType.id,
        code: assessmentType.code,
        name: assessmentType.name,
        question_count: assessmentType.question_count,
        time_limit_minutes: assessmentType.time_limit_minutes,
        is_active: assessmentType.is_active
      },
      questions: normalizedQuestions,
      total: totalCount || 0,
      filters_applied: {
        assessment_type_id: assessmentTypeId,
        section,
        search,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('[Question Bank List] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
