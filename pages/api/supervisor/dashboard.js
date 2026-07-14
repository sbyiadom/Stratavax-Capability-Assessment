// pages/api/supervisor/dashboard.js
// Secure supervisor dashboard API
// Purpose:
// - Loads supervisor dashboard data using the Supabase service role on the server.
// - Avoids frontend RLS issues where a supervisor may see 0 rows even when candidates are assigned.
// - Supports both supervisor and admin roles.
//
// IMPORTANT FRONTEND NOTE:
// Your pages/supervisor/index.js must call this API with the logged-in user's access token:
//
// const { data: sessionData } = await supabase.auth.getSession();
// const token = sessionData?.session?.access_token;
// const response = await fetch('/api/supervisor/dashboard', {
//   headers: { Authorization: `Bearer ${token}` }
// });

import { createClient } from '@supabase/supabase-js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function getScoreFromResult(resultData) {
  if (!resultData) return 0;

  const directScore = safeNumber(resultData.percentage_score, 0);
  if (directScore) return directScore;

  const reportData = resultData.report_data || {};
  const overallScore = safeNumber(reportData.overallScore, 0);
  if (overallScore) return overallScore;

  const dimensionOverall = safeNumber(reportData?.dimensions?.overallScore, 0);
  if (dimensionOverall) return dimensionOverall;

  const workplace = getWorkplaceReadiness(resultData);
  const intellectual = getIntellectualCapability(resultData);

  if (workplace && intellectual) {
    return Math.round((workplace + intellectual) / 2);
  }

  return 0;
}

function getWorkplaceReadiness(resultData) {
  if (!resultData) return 0;

  const direct = safeNumber(resultData.workplace_readiness, 0);
  if (direct) return direct;

  const reportData = resultData.report_data || {};
  const dimensions = reportData.dimensions || {};

  return (
    safeNumber(dimensions.workplaceReadiness, 0) ||
    safeNumber(reportData.workplaceReadiness, 0) ||
    0
  );
}

function getIntellectualCapability(resultData) {
  if (!resultData) return 0;

  const direct = safeNumber(resultData.intellectual_capability, 0);
  if (direct) return direct;

  const reportData = resultData.report_data || {};
  const dimensions = reportData.dimensions || {};

  return (
    safeNumber(dimensions.intellectualCapability, 0) ||
    safeNumber(reportData.intellectualCapability, 0) ||
    0
  );
}

function getRecommendation(resultData) {
  if (!resultData) return 'Not Available';

  if (resultData.recommendation) return resultData.recommendation;

  const reportData = resultData.report_data || {};

  if (typeof reportData.recommendation === 'string') {
    return reportData.recommendation;
  }

  if (reportData.recommendation?.level) {
    return reportData.recommendation.level;
  }

  return 'Not Available';
}

function getRiskLevel(resultData) {
  if (!resultData) return 'Medium';

  if (resultData.risk_level) return resultData.risk_level;

  const reportData = resultData.report_data || {};

  return reportData.riskLevel || reportData.classification || 'Medium';
}

function buildResultMap(results) {
  const map = new Map();
  safeArray(results).forEach((item) => {
    if (item?.id) map.set(String(item.id), item);
  });
  return map;
}

function buildCandidateMap(candidates) {
  const map = new Map();
  safeArray(candidates).forEach((item) => {
    if (item?.id) map.set(String(item.id), item);
  });
  return map;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase server environment variables.'
      });
    }

    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing Authorization bearer token.'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verify the frontend user session token.
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired user session.'
      });
    }

    const user = userData.user;
    const supervisorId = user.id;

    // Load supervisor profile from database, not only user metadata.
    const { data: supervisorProfile, error: supervisorProfileError } = await serviceClient
      .from('supervisor_profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', supervisorId)
      .maybeSingle();

    if (supervisorProfileError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load supervisor profile.',
        details: supervisorProfileError.message
      });
    }

    if (!supervisorProfile) {
      return res.status(403).json({
        success: false,
        error: 'No supervisor profile found for this user.'
      });
    }

    if (supervisorProfile.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'This supervisor account is inactive.'
      });
    }

    const role = supervisorProfile.role || user.user_metadata?.role || 'supervisor';
    const isAdmin = role === 'admin';

    let assignedCandidates = [];

    if (isAdmin) {
      const { data: allCandidates, error: allCandidatesError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, created_at')
        .order('full_name', { ascending: true });

      if (allCandidatesError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to load candidates for admin.',
          details: allCandidatesError.message
        });
      }

      assignedCandidates = allCandidates || [];
    } else {
      // Primary source: candidate_profiles.supervisor_id.
      const { data: directCandidates, error: directCandidatesError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, created_at')
        .eq('supervisor_id', supervisorId)
        .order('full_name', { ascending: true });

      if (directCandidatesError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to load assigned candidates.',
          details: directCandidatesError.message
        });
      }

      assignedCandidates = directCandidates || [];

      // Fallback source: supervisor_candidate_access.
      // This protects the dashboard if some records are mapped only through the access table.
      const { data: accessRows, error: accessError } = await serviceClient
        .from('supervisor_candidate_access')
        .select('candidate_id')
        .eq('supervisor_id', supervisorId);

      if (!accessError && accessRows && accessRows.length > 0) {
        const existingIds = new Set(assignedCandidates.map((candidate) => String(candidate.id)));
        const missingCandidateIds = accessRows
          .map((row) => row.candidate_id)
          .filter((candidateId) => candidateId && !existingIds.has(String(candidateId)));

        if (missingCandidateIds.length > 0) {
          const { data: accessCandidates, error: accessCandidatesError } = await serviceClient
            .from('candidate_profiles')
            .select('id, full_name, email, university, programme, supervisor_id, created_at')
            .in('id', missingCandidateIds);

          if (!accessCandidatesError && accessCandidates) {
            assignedCandidates = [...assignedCandidates, ...accessCandidates];
          }
        }
      }
    }

    const candidateIds = assignedCandidates.map((candidate) => candidate.id).filter(Boolean);

    let allAssessments = [];
    let resultRows = [];
    let nationalServiceReports = [];
    let otherReports = [];
    let candidates = [];

    if (candidateIds.length > 0) {
      const { data: assessmentRows, error: assessmentRowsError } = await serviceClient
        .from('candidate_assessments')
        .select(`
          id,
          user_id,
          assessment_id,
          status,
          result_id,
          completed_at,
          assessments!inner(
            id,
            title,
            assessment_type:assessment_types(id, code, name)
          )
        `)
        .in('user_id', candidateIds);

      if (assessmentRowsError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to load candidate assessments.',
          details: assessmentRowsError.message
        });
      }

      allAssessments = assessmentRows || [];

      const resultIds = allAssessments
        .map((assessment) => assessment.result_id)
        .filter(Boolean);

      if (resultIds.length > 0) {
        const { data: resultsData, error: resultsError } = await serviceClient
          .from('assessment_results')
          .select('*')
          .in('id', resultIds);

        if (resultsError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to load assessment results.',
            details: resultsError.message
          });
        }

        resultRows = resultsData || [];
      }

      const resultMap = buildResultMap(resultRows);
      const candidateMap = buildCandidateMap(assignedCandidates);
      const allReportData = [];

      allAssessments.forEach((assessment) => {
        const isCompleted = assessment.status === 'completed' || assessment.result_id !== null;
        const resultData = assessment.result_id ? resultMap.get(String(assessment.result_id)) : null;

        if (!isCompleted && !resultData) return;

        const candidate = candidateMap.get(String(assessment.user_id));
        const assessmentType = assessment.assessments?.assessment_type || {};
        const assessmentCode = assessmentType?.code || 'general';
        const isNationalService = assessmentCode === 'national_service';

        const workplaceReadiness = getWorkplaceReadiness(resultData);
        const intellectualCapability = getIntellectualCapability(resultData);
        const overallScore = getScoreFromResult(resultData);
        const recommendation = getRecommendation(resultData);
        const riskLevel = getRiskLevel(resultData);

        const reportEntry = {
          result_id: assessment.result_id,
          candidate_id: assessment.user_id,
          candidate_name: candidate?.full_name || 'Unknown',
          candidate_email: candidate?.email || '',
          university: candidate?.university || '',
          programme: candidate?.programme || '',
          assessment_id: assessment.assessment_id,
          assessment_title: assessment.assessments?.title || 'Assessment',
          assessment_type: assessmentType?.name || 'General',
          assessment_code: assessmentCode,
          status: assessment.status,
          completed_at: assessment.completed_at || resultData?.completed_at || null,
          score: overallScore || 0,
          is_national_service: isNationalService,
          resultData,
          percentage_score: overallScore || 0,
          workplace_readiness: workplaceReadiness || 0,
          intellectual_capability: intellectualCapability || 0,
          recommendation: recommendation || 'Not Available',
          risk_level: riskLevel || 'Medium',
          // Management requested no sub-category display on dashboard.
          category_scores: []
        };

        if (isNationalService) {
          reportEntry.scores = {
            overall: overallScore || 0,
            workplace: workplaceReadiness || 0,
            intellectual: intellectualCapability || 0,
            recommendation: recommendation || 'Not Available',
            riskLevel: riskLevel || 'Medium'
          };
          nationalServiceReports.push(reportEntry);
        } else {
          otherReports.push(reportEntry);
        }

        allReportData.push(reportEntry);
      });

      candidates = assignedCandidates.map((candidate) => {
        const candidateAssessments = allAssessments.filter(
          (assessment) => String(assessment.user_id) === String(candidate.id)
        );

        const completed = candidateAssessments.filter(
          (assessment) => assessment.status === 'completed' || assessment.result_id !== null
        ).length;

        const inProgress = candidateAssessments.filter(
          (assessment) => assessment.status === 'in_progress'
        ).length;

        const unblocked = candidateAssessments.filter(
          (assessment) => assessment.status === 'unblocked'
        ).length;

        const blocked = candidateAssessments.filter(
          (assessment) => assessment.status === 'blocked'
        ).length;

        const notStarted = candidateAssessments.filter(
          (assessment) => assessment.status === 'pending' || !assessment.status || assessment.status === ''
        ).length;

        const completedAssessments = candidateAssessments
          .filter((assessment) => assessment.status === 'completed' || assessment.result_id !== null)
          .map((assessment) => {
            const reportEntry = allReportData.find(
              (report) => String(report.result_id) === String(assessment.result_id) &&
                String(report.candidate_id) === String(candidate.id)
            );

            const isNationalService = assessment.assessments?.assessment_type?.code === 'national_service';

            return {
              assessment_id: assessment.assessment_id,
              result_id: assessment.result_id,
              title: assessment.assessments?.title || 'Assessment',
              score: reportEntry?.score || 0,
              isNationalService,
              assessment_code: assessment.assessments?.assessment_type?.code || 'general',
              assessment_type: assessment.assessments?.assessment_type?.name || 'General',
              reportData: reportEntry || null
            };
          })
          .filter((item) => item.result_id);

        return {
          ...candidate,
          assessments: candidateAssessments,
          stats: {
            completed,
            inProgress,
            unblocked,
            blocked,
            notStarted,
            total: candidateAssessments.length
          },
          completedAssessments
        };
      });
    }

    const stats = {
      totalCandidates: assignedCandidates.length,
      completedAssessments: allAssessments.filter(
        (assessment) => assessment.status === 'completed' || assessment.result_id !== null
      ).length,
      pendingReviews: allAssessments.filter(
        (assessment) => assessment.status === 'in_progress' || assessment.status === 'unblocked'
      ).length,
      nationalServiceReports: nationalServiceReports.length
    };

    return res.status(200).json({
      success: true,
      supervisor: {
        id: supervisorProfile.id,
        email: supervisorProfile.email,
        full_name: supervisorProfile.full_name || '',
        role,
        is_admin: isAdmin
      },
      stats,
      candidates,
      nationalServiceReports,
      otherReports,
      debug: {
        supervisorId,
        assignedCandidates: assignedCandidates.length,
        candidateAssessments: allAssessments.length,
        resultRows: resultRows.length,
        nationalServiceReports: nationalServiceReports.length,
        otherReports: otherReports.length
      }
    });
  } catch (error) {
    console.error('[Supervisor Dashboard API] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to load supervisor dashboard.'
    });
  }
}
