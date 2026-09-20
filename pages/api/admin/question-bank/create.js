// pages/api/admin/question-bank/create.js
// Phase 3 — Question Bank Manager
// Inserts one question + exactly 4 answers via create_question_with_answers RPC.
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';

// ============================================================
// HELPER: validate request body
// Returns { ok: true } or { ok: false, status, error }
// ============================================================
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const {
    assessment_type_id,
    question_text,
    section,
    subsection,
    display_order,
    answers
  } = body;

  if (!Number.isInteger(assessment_type_id) || assessment_type_id <= 0) {
    return { ok: false, status: 400, error: 'assessment_type_id must be a positive integer' };
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
    // ============================================================
    // AUTH — admin only
    // ============================================================
    const auth = await authorizeRequest(req, ['admin']);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { serviceClient } = auth;

    // ============================================================
    // STEP 1: Validate input
    // ============================================================
    const validation = validateBody(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        error: validation.error
      });
    }

    const {
      assessment_type_id,
      question_text,
      section = null,
      subsection = null,
      display_order = null,
      answers
    } = req.body;

    // ============================================================
    // STEP 2: Call the RPC
    // ============================================================
    const { data, error } = await serviceClient.rpc('create_question_with_answers', {
      p_assessment_type_id: assessment_type_id,
      p_question_text: question_text.trim(),
      p_section: section,
      p_subsection: subsection,
      p_display_order: display_order,
      p_answers: answers
    });

    if (error) {
      console.error('[Question Bank Create] rpc error:', error);

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
        error: `Failed to create question: ${error.message}`
      });
    }

    // ============================================================
    // STEP 3: Respond
    // ============================================================
    return res.status(201).json({
      success: true,
      question_id: data?.question_id ?? null,
      display_order: data?.display_order ?? null,
      answer_ids: data?.answer_ids ?? []
    });
  } catch (error) {
    console.error('[Question Bank Create] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
