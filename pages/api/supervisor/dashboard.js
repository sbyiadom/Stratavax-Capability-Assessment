// pages/api/supervisor/dashboard.js - FIXED VERSION
// Avoids querying assessment_types separately to prevent 403 errors
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
      return res.status(401).json({ success: false, error: 'Invalid token', details: userError?.message });
    }

    const user = userData.user;
    const supervisorId = user.id;

    // ============================================================
    // STEP 1: Get candidates for this supervisor
    // ============================================================
    const { data: candidates, error: candidatesError } = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id')
      .eq('supervisor_id', supervisorId);

    if (candidatesError) {
      console.error('[Dashboard] Candidates error:', candidatesError);
      return res.status(500).json({ success: false, error: 'Failed to load candidates', details: candidatesError.message });
    }

    const candidateIds = candidates.map(c => c.id);

    if (candidateIds.length === 0) {
      return res.status(200).json({
        success: true,
        supervisor: { id: user.id, email: user.email },
        stats: { totalCandidates: 0, completedAssessments: 0, nationalServiceReports: 0 },
        candidates: [],
        nationalServiceReports: [],
        otherReports: []
      });
    }

    // ============================================================
    // STEP 2: Get candidate assessments with assessment details in ONE query
    // Using a simpler approach - get assessments first, then join manually
    // ============================================================
    const { data: assessments, error: assessmentsError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .in('user_id', candidateIds);

    if (assessmentsError) {
      console.error('[Dashboard] Assessments error:', assessmentsError);
      return res.status(500).json({ success: false, error: 'Failed to load assessments', details: assessmentsError.message });
    }

    // ============================================================
    // STEP 3: Get assessment details (with assessment_type info embedded)
    // We'll use a left join to get the type info
    // ============================================================
    const assessmentIds = assessments.map(a => a.assessment_id).filter(Boolean);
    let assessmentMap = {};
    let typeMap = {};

    if (assessmentIds.length > 0) {
      // Get assessments with their types using a single query with embedded fields
      const { data: assessmentData, error: assessmentError } = await serviceClient
        .from('assessments')
        .select(`
          id, 
          title, 
          assessment_type_id,
          assessment_types:assessment_type_id (id, code, name)
        `)
        .in('id', assessmentIds);

      if (assessmentError) {
        console.error('[Dashboard] Assessment details error:', assessmentError);
        // If this fails, try a simpler approach without the nested join
        // Fallback: get assessments without types
        const { data: simpleAssessments, error: simpleError } = await serviceClient
          .from('assessments')
          .select('id, title, assessment_type_id')
          .in('id', assessmentIds);

        if (simpleError) {
          console.error('[Dashboard] Simple assessment error:', simpleError);
          return res.status(500).json({ success: false, error: 'Failed to load assessment details', details: simpleError.message });
        }

        // Build assessment map from simple data
        simpleAssessments.forEach(a => {
          assessmentMap[a.id] = { ...a, assessment_type: null };
        });

        // Try to get types separately
        const typeIds = simpleAssessments.map(a => a.assessment_type_id).filter(Boolean);
        if (typeIds.length > 0) {
          const { data: typesData, error: typesError } = await serviceClient
            .from('assessment_types')
            .select('id, code, name')
            .in('id', typeIds);

          if (!typesError && typesData) {
            typesData.forEach(t => { typeMap[t.id] = t; });
          }
        }

        // Map types to assessments
        Object.keys(assessmentMap).forEach(id => {
          const a = assessmentMap[id];
          if (a.assessment_type_id) {
            a.assessment_type = typeMap[a.assessment_type_id] || null;
          }
        });
      } else {
        // Build assessment map from successful nested query
        assessmentData.forEach(a => {
          assessmentMap[a.id] = a;
        });
      }
    }

    // ============================================================
    // STEP 4: Get results for completed assessments
    // ============================================================
    const resultIds = assessments.map(a => a.result_id).filter(Boolean);
    let resultMap = {};

    if (resultIds.length > 0) {
      const { data: resultsData, error: resultsError } = await serviceClient
        .from('assessment_results')
        .select('*')
        .in('id', resultIds);

      if (resultsError) {
        console.error('[Dashboard] Results error:', resultsError);
        // Continue without results
      } else {
        resultsData.forEach(r => { resultMap[r.id] = r; });
      }
    }

    // ============================================================
    // STEP 5: Build reports
    // ============================================================
    const reports = [];

    assessments.forEach(a => {
      const assessment = assessmentMap[a.assessment_id];
      if (!assessment) {
        console.log('[Dashboard] Missing assessment for:', a.assessment_id);
        return;
      }

      const type = assessment.assessment_type || {};
      const isNationalService = type?.code === 'national_service';
      const result = a.result_id ? resultMap[a.result_id] : null;
      const isCompleted = a.status === 'completed' || a.result_id !== null;

      // Only include completed assessments or those with results
      if (!isCompleted && !result) return;

      const candidate = candidates.find(c => c.id === a.user_id);

      reports.push({
        result_id: a.result_id,
        candidate_id: a.user_id,
        candidate_name: candidate?.full_name || 'Unknown',
        candidate_email: candidate?.email || '',
        university: candidate?.university || '',
        programme: candidate?.programme || '',
        assessment_id: a.assessment_id,
        assessment_title: assessment.title || 'Assessment',
        assessment_code: type?.code || 'general',
        assessment_type_name: type?.name || 'General',
        status: a.status,
        completed_at: a.completed_at,
        score: result?.percentage_score || 0,
        is_national_service: isNationalService,
        workplace_readiness: result?.workplace_readiness || 0,
        intellectual_capability: result?.intellectual_capability || 0,
        recommendation: result?.recommendation || 'Not Available',
        percentage_score: result?.percentage_score || 0,
        resultData: result || null
      });
    });

    const nationalServiceReports = reports.filter(r => r.is_national_service);
    const otherReports = reports.filter(r => !r.is_national_service);

    // ============================================================
    // STEP 6: Build candidate objects with their stats
    // ============================================================
    const candidatesWithStats = candidates.map(c => {
      const candidateAssessments = assessments.filter(a => a.user_id === c.id);
      const completed = candidateAssessments.filter(a => a.status === 'completed' || a.result_id !== null).length;
      const inProgress = candidateAssessments.filter(a => a.status === 'in_progress').length;
      const unblocked = candidateAssessments.filter(a => a.status === 'unblocked').length;
      const blocked = candidateAssessments.filter(a => a.status === 'blocked').length;
      const notStarted = candidateAssessments.filter(a => !a.status || a.status === 'pending' || a.status === '').length;

      const completedAssessments = candidateAssessments
        .filter(a => a.status === 'completed' || a.result_id !== null)
        .map(a => {
          const assessment = assessmentMap[a.assessment_id];
          const type = assessment?.assessment_type || {};
          const result = a.result_id ? resultMap[a.result_id] : null;
          
          return {
            assessment_id: a.assessment_id,
            result_id: a.result_id,
            title: assessment?.title || 'Assessment',
            score: result?.percentage_score || 0,
            isNationalService: type?.code === 'national_service',
            assessment_code: type?.code || 'general',
            assessment_type: type?.name || 'General',
            reportData: reports.find(r => r.result_id === a.result_id) || null
          };
        })
        .filter(item => item.result_id);

      return {
        ...c,
        assessments: candidateAssessments,
        stats: { completed, inProgress, unblocked, blocked, notStarted, total: candidateAssessments.length },
        completedAssessments
      };
    });

    // ============================================================
    // STEP 7: Return response
    // ============================================================
    const stats = {
      totalCandidates: candidates.length,
      completedAssessments: assessments.filter(a => a.status === 'completed' || a.result_id !== null).length,
      pendingReviews: assessments.filter(a => a.status === 'in_progress' || a.status === 'unblocked').length,
      nationalServiceReports: nationalServiceReports.length
    };

    return res.status(200).json({
      success: true,
      supervisor: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || ''
      },
      stats,
      candidates: candidatesWithStats,
      nationalServiceReports,
      otherReports
    });

  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal error'
    });
  }
}
