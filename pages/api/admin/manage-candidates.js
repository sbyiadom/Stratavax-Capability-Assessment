// pages/api/admin/manage-candidates.js
// Phase 7A — admin endpoint for the Manage Candidates page.
//
// Replaces three client-side reads in pages/admin/manage-candidates.js:
//   • candidate_profiles
//   • assessment_results
//   • assessments (title lookup)
//
// Returns candidates with their results array and each result's
// assessment_title pre-resolved, so the page can render without further
// lookups.

import { createClient } from '@supabase/supabase-js';
import { authorizeRequest } from '../../../utils/apiAuth';

async function handleLoad(serviceClient) {
  // 1. All candidates
  const { data: candidateData, error: candidateError } = await serviceClient
    .from('candidate_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (candidateError) {
    console.error('[admin/manage-candidates] candidates error:', candidateError);
    return { error: candidateError.message, status: 500 };
  }

  // 2. All assessment results
  const { data: resultsData, error: resultsError } = await serviceClient
    .from('assessment_results')
    .select('*')
    .order('completed_at', { ascending: false });

  if (resultsError) {
    console.error('[admin/manage-candidates] results error:', resultsError);
    return { error: resultsError.message, status: 500 };
  }

  // 3. Assessment title lookup for the result rows
  const assessmentIds = [
    ...new Set(
      (resultsData || [])
        .map((r) => r.assessment_id)
        .filter(Boolean)
    ),
  ];

  let assessmentNameMap = {};

  if (assessmentIds.length > 0) {
    const { data: assessmentsData, error: assessmentsError } = await serviceClient
      .from('assessments')
      .select('id, title')
      .in('id', assessmentIds);

    if (assessmentsError) {
      console.error('[admin/manage-candidates] assessments error:', assessmentsError);
      return { error: assessmentsError.message, status: 500 };
    }

    assessmentNameMap = (assessmentsData || []).reduce((acc, item) => {
      acc[item.id] = item.title;
      return acc;
    }, {});
  }

  // 4. Attach assessment titles to results
  const resultsWithTitles = (resultsData || []).map((result) => ({
    ...result,
    assessment_title: assessmentNameMap[result.assessment_id] || 'Unnamed Assessment',
  }));

  // 5. Group results by candidate user_id
  const resultMap = {};
  resultsWithTitles.forEach((result) => {
    if (!resultMap[result.user_id]) resultMap[result.user_id] = [];
    resultMap[result.user_id].push(result);
  });

  // 6. Enrich candidates with their results and the latest result
  const enrichedCandidates = (candidateData || []).map((candidate) => {
    const results = resultMap[candidate.id] || [];
    const latest = results.length > 0 ? results[0] : null;

    return {
      ...candidate,
      results,
      latest,
    };
  });

  return { candidates: enrichedCandidates };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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
    const action = typeof req.query.action === 'string' ? req.query.action : 'load';

    if (action === 'load') {
      const result = await handleLoad(serviceClient);
      if (result.error) {
        return res.status(result.status || 500).json({ success: false, error: result.error });
      }
      return res.status(200).json({
        success: true,
        candidates: result.candidates,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Provide ?action=load.',
    });
  } catch (error) {
    console.error('[admin/manage-candidates] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
