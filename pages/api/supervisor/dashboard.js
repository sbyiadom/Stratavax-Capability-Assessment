// pages/api/supervisor/dashboard.js - MINIMAL TEST VERSION
import { createClient } from '@supabase/supabase-js';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: 'Missing env vars' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const user = userData.user;
    const supervisorId = user.id;

    // Get candidates for this supervisor
    const { data: candidates, error: candidatesError } = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id')
      .eq('supervisor_id', supervisorId);

    if (candidatesError) {
      return res.status(500).json({ success: false, error: 'Failed to load candidates', details: candidatesError.message });
    }

    const candidateIds = candidates.map(c => c.id);

    // Get candidate assessments
    const { data: assessments, error: assessmentsError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .in('user_id', candidateIds);

    if (assessmentsError) {
      return res.status(500).json({ success: false, error: 'Failed to load assessments', details: assessmentsError.message });
    }

    // Get assessment details
    const assessmentIds = assessments.map(a => a.assessment_id).filter(Boolean);
    const { data: assessmentDetails, error: assessmentDetailsError } = await serviceClient
      .from('assessments')
      .select('id, title, assessment_type_id')
      .in('id', assessmentIds);

    if (assessmentDetailsError) {
      return res.status(500).json({ success: false, error: 'Failed to load assessment details', details: assessmentDetailsError.message });
    }

    // Get assessment types
    const typeIds = assessmentDetails.map(a => a.assessment_type_id).filter(Boolean);
    const { data: assessmentTypes, error: assessmentTypesError } = await serviceClient
      .from('assessment_types')
      .select('id, code, name')
      .in('id', typeIds);

    if (assessmentTypesError) {
      return res.status(500).json({ success: false, error: 'Failed to load assessment types', details: assessmentTypesError.message });
    }

    // Get results
    const resultIds = assessments.map(a => a.result_id).filter(Boolean);
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('*')
      .in('id', resultIds);

    if (resultsError) {
      return res.status(500).json({ success: false, error: 'Failed to load results', details: resultsError.message });
    }

    // Build maps
    const assessmentMap = {};
    assessmentDetails.forEach(a => { assessmentMap[a.id] = a; });

    const typeMap = {};
    assessmentTypes.forEach(t => { typeMap[t.id] = t; });

    const resultMap = {};
    results.forEach(r => { resultMap[r.id] = r; });

    // Build reports
    const reports = [];
    assessments.forEach(a => {
      const assessment = assessmentMap[a.assessment_id];
      if (!assessment) return;

      const type = typeMap[assessment.assessment_type_id];
      const isNationalService = type?.code === 'national_service';
      const result = a.result_id ? resultMap[a.result_id] : null;
      const isCompleted = a.status === 'completed' || a.result_id !== null;

      if (!isCompleted && !result) return;

      const candidate = candidates.find(c => c.id === a.user_id);

      reports.push({
        result_id: a.result_id,
        candidate_id: a.user_id,
        candidate_name: candidate?.full_name || 'Unknown',
        assessment_id: a.assessment_id,
        assessment_title: assessment.title || 'Assessment',
        assessment_code: type?.code || 'general',
        status: a.status,
        completed_at: a.completed_at,
        score: result?.percentage_score || 0,
        is_national_service: isNationalService,
        workplace_readiness: result?.workplace_readiness || 0,
        intellectual_capability: result?.intellectual_capability || 0,
        recommendation: result?.recommendation || 'Not Available',
        percentage_score: result?.percentage_score || 0
      });
    });

    const nationalServiceReports = reports.filter(r => r.is_national_service);
    const otherReports = reports.filter(r => !r.is_national_service);

    return res.status(200).json({
      success: true,
      supervisor: { id: user.id, email: user.email },
      stats: {
        totalCandidates: candidates.length,
        completedAssessments: assessments.filter(a => a.status === 'completed' || a.result_id !== null).length,
        nationalServiceReports: nationalServiceReports.length
      },
      candidates: candidates.map(c => ({
        ...c,
        stats: {
          completed: assessments.filter(a => a.user_id === c.id && (a.status === 'completed' || a.result_id !== null)).length,
          inProgress: assessments.filter(a => a.user_id === c.id && a.status === 'in_progress').length,
          unblocked: assessments.filter(a => a.user_id === c.id && a.status === 'unblocked').length,
          blocked: assessments.filter(a => a.user_id === c.id && a.status === 'blocked').length,
          notStarted: assessments.filter(a => a.user_id === c.id && (!a.status || a.status === 'pending')).length,
          total: assessments.filter(a => a.user_id === c.id).length
        },
        completedAssessments: assessments
          .filter(a => a.user_id === c.id && (a.status === 'completed' || a.result_id !== null))
          .map(a => ({
            assessment_id: a.assessment_id,
            result_id: a.result_id,
            title: assessmentMap[a.assessment_id]?.title || 'Assessment',
            score: a.result_id ? (resultMap[a.result_id]?.percentage_score || 0) : 0
          }))
          .filter(a => a.result_id)
      })),
      nationalServiceReports,
      otherReports
    });

  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
}
