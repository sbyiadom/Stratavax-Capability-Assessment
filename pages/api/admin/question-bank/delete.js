// pages/api/admin/question-bank/delete.js
// Phase 3 — Question Bank Manager
// Deletes one question + its answers via delete_question_with_answers RPC.
// Refuses if the question has been served / answered / is mid-flight.
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';

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

    // ---------- validate body ----------
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a JSON object'
      });
    }

    const { question_id } = body;
    if (!Number.isInteger(question_id) || question_id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'question_id must be a positive integer'
      });
    }

    // ---------- call RPC ----------
    const { data, error } = await serviceClient.rpc('delete_question_with_answers', {
      p_question_id: question_id
    });

    if (error) {
      console.error('[Question Bank Delete] rpc error:', error);

      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Question ${question_id} not found`
        });
      }
      if (code === '23503') {
        return res.status(409).json({
          success: false,
          error: error.message || 'Question is in use and cannot be deleted'
        });
      }

      return res.status(500).json({
        success: false,
        error: `Failed to delete question: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      question_id: data?.question_id ?? null,
      answers_deleted: data?.answers_deleted ?? 0
    });
  } catch (error) {
    console.error('[Question Bank Delete] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
