// pages/api/admin/question-bank/update.js
// Phase 3 — Question Bank Manager
// Updates one question + its 4 answers via update_question_with_answers RPC.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// HELPER: validate request body
// ============================================================
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const {
    question_id,
    question_text,
    section,
    subsection,
    display_order,
    answers
  } = body;

  if (!Number.isInteger(question_id) || question_id <= 0) {
    return { ok: false, status: 400, error: 'question_id must be a positive integer' };
  }

  if (typeof question_text !== 'string' || question_text.trim() === '') {
    return { ok: false, status: 400, error: 'question_text is required' };
  }

  if (question_text.length > 2000) {
    return { ok: false, status: 400, error: 'question_text must be 2000 chars or fewer' };
  }

  if (section !== undefined && section !== null && typeof section !== 'string') {
    return { ok: false, status: 400, error: 'section must be a string or null' };
  }

  if (subsection !== undefined && subsection !== null && typeof subsection !== 'string') {
    return { ok: false, status: 400, error: 'subsection must be a string or null' };
  }

  if (display_order !== undefined && display_order !== null) {
    if (!Number.isInteger(display_order) || display_order < 1) {
      return { ok: false, status: 400, error: 'display_order must be a positive integer or null' };
    }
  }

  if (!Array.isArray(answers)) {
    return { ok: false, status: 400, error: 'answers must be an array' };
  }

  if (answers.length !== 4) {
    return { ok: false, status: 400, error: `answers must contain exactly 4 items (got ${answers.length})` };
  }

  const seenOrders = new Set();
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!a || typeof a !== 'object') {
      return { ok: false, status: 400, error: `answers[${i}] must be an object` };
    }
    if (!Number.isInteger(a.id) || a.id <= 0) {
      return { ok: false, status: 400, error: `answers[${i}].id must be a positive integer` };
    }
    if (typeof a.answer_text !== 'string' || a.answer_text.trim() === '') {
      return { ok: false, status: 400, error: `answers[${i}].answer_text is required` };
    }
    if (!Number.isInteger(a.score)) {
      return { ok: false, status: 400, error: `answers[${i}].score must be an integer` };
    }
    if (!Number.isInteger(a.display_order) || a.display_order < 1 || a.display_order > 4) {
      return { ok: false, status: 400, error: `answers[${i}].display_order must be 1–4` };
    }
    if (seenOrders.has(a.display_order)) {
      return { ok: false, status: 400, error: 'answers display_order values must be unique' };
    }
    seenOrders.add(a.display_order);
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
      question_id,
      question_text,
      section = null,
      subsection = null,
      display_order = null,
      answers
    } = req.body;

    const { data, error } = await serviceClient.rpc('update_question_with_answers', {
      p_question_id: question_id,
      p_question_text: question_text.trim(),
      p_section: section,
      p_subsection: subsection,
      p_display_order: display_order,
      p_answers: answers
    });

    if (error) {
      console.error('[Question Bank Update] rpc error:', error);

      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Question ${question_id} not found`
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
        error: `Failed to update question: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      question_id: data?.question_id ?? null,
      display_order: data?.display_order ?? null,
      answer_ids: data?.answer_ids ?? []
    });
  } catch (error) {
    console.error('[Question Bank Update] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
