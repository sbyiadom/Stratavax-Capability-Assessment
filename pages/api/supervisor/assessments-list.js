// pages/api/supervisor/assessments-list.js
// Phase 7B — returns the active assessments list for supervisor pickers.
//
// Used by:
//   • pages/supervisor/batch-manage.js (bulk-assign modal)
//   • (future) any other supervisor page that needs an assessment picker
//
// Response:
//   { success: true, assessments: [{ id, title, type_code, type_name }, ...] }
//
// Only returns is_active = true assessments. Sorted by title.

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Supervisor Assessments List]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { serviceClient } = auth;

  try {
    const { data: rows, error } = await serviceClient
      .from('assessments')
      .select(`
        id,
        title,
        assessment_type_id,
        assessment_types:assessment_type_id (
          id,
          code,
          name
        )
      `)
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) {
      console.error(`${LOG_TAG} fetch failed`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({ success: false, error: 'Failed to load assessments.' });
    }

    const assessments = (rows || []).map((a) => {
      const rawType = a.assessment_types;
      const typeObj = Array.isArray(rawType) ? rawType[0] || null : rawType || null;
      return {
        id: a.id,
        title: a.title || 'Untitled Assessment',
        type_code: typeObj?.code || 'general',
        type_name: typeObj?.name || 'General Assessment',
      };
    });

    return res.status(200).json({
      success: true,
      assessments,
      count: assessments.length,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
