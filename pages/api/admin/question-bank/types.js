// pages/api/admin/question-bank/types.js
// Phase 3 — Question Bank Manager (read-only)
// Returns the list of assessment types for the question-bank dropdown.
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';

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

    // ============================================================
    // STEP 1: Load all assessment types, ordered by id
    // ============================================================
    const { data: types, error: typesError } = await serviceClient
      .from('assessment_types')
      .select('id, code, name, question_count, time_limit_minutes, is_active')
      .order('id', { ascending: true });

    if (typesError) {
      console.error('[Question Bank Types] types error:', typesError);
      return res.status(500).json({
        success: false,
        error: `Failed to load assessment types: ${typesError.message}`
      });
    }

    // ============================================================
    // STEP 2: Normalize (defensive — always return an array)
    // ============================================================
    const normalizedTypes = (types || []).map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      question_count: t.question_count,
      time_limit_minutes: t.time_limit_minutes,
      is_active: t.is_active
    }));

    return res.status(200).json({
      success: true,
      types: normalizedTypes,
      total: normalizedTypes.length
    });
  } catch (error) {
    console.error('[Question Bank Types] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
