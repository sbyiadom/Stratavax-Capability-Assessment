// pages/api/supervisor/dashboard.js
// Robust Supervisor Dashboard API
// Fixes: "Failed to load supervisor profile" by avoiding hard failure on supervisor_profiles lookup.
// Also validates that SUPABASE_SERVICE_ROLE_KEY is truly a service_role key.

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

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function isLikelyServiceRoleKey(key) {
  const payload = decodeJwtPayload(key);
  return payload?.role === 'service_role';
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

  if (typeof reportData.recommendation === 'string') return reportData.recommendation;
  if (reportData.recommendation?.level) return reportData.recommendation.level;

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

async function verifyUser(serviceClient, token) {
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || 'Invalid or expired user session.' };
  }
  return { user: data.user, error: null };
}

async function loadSupervisorProfile(serviceClient, user) {
  const byId = await serviceClient
    .from('supervisor_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!byId.error && byId.data) {
    return { profile: byId.data, error: null, lookup: 'id' };
  }

  const byEmail = await serviceClient
    .from('supervisor_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('email', user.email)
    .maybeSingle();

  if (!byEmail.error && byEmail.data) {
    return { profile: byEmail.data, error: null, lookup: 'email' };
  }

  return {
    profile: null,
    error: byId.error?.message || byEmail.error?.message || 'Supervisor profile not found.',
    lookup: 'failed'
  };
}

async function loadCandidates(serviceClient, supervisorId, role) {
  if (role === 'admin') {
    const response = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id, created_at')
      .order('full_name', { ascending: true });

    if (response.error) return { candidates: [], error: response.error.message };
    return { candidates: response.data || [], error: null };
  }

  const directResponse = await serviceClient
    .from('candidate_profiles')
    .select('id, full_name, email, university, programme, supervisor_id, created_at')
    .eq('supervisor_id', supervisorId)
    .order('full_name', { ascending: true });

  if (directResponse.error) return { candidates: [], error: directResponse.error.message };

  let candidates = directResponse.data || [];

  const accessResponse = await serviceClient
    .from('supervisor_candidate_access')
    .select('candidate_id')
    .eq('supervisor_id', supervisorId);

  if (!accessResponse.error && accessResponse.data?.length > 0) {
    const existingIds = new Set(candidates.map((candidate) => String(candidate.id)));
    const missingCandidateIds = accessResponse.data
      .map((row) => row.candidate_id)
      .filter((candidateId) => candidateId && !existingIds.has(String(candidateId)));

    if (missingCandidateIds.length > 0) {
      const accessCandidates = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, created_at')
        .in('id', missingCandidateIds);

      if (!accessCandidates.error && accessCandidates.data) {
        candidates = [...candidates, ...accessCandidates.data];
      }
    }
  }

  return { candidates, error: null };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase server environment variables.',
        required: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
      });
    }

    if (!isLikelyServiceRoleKey(serviceRoleKey)) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not a service_role key. Set the real Supabase service_role secret in Vercel Environment Variables, then redeploy.',
        hint: 'Do not use NEXT_PUBLIC_SUPABASE_ANON_KEY as SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing Authorization bearer token.' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const verified = await verifyUser(serviceClient, token);
    if (!verified.user) {
      return res.status(401).json({ success: false, error: verified.error });
    }

    const user = verified.user;
    const metadataRole = user.user_metadata?.role || null;

    const profileResult = await loadSupervisorProfile(serviceClient, user);
    const supervisorProfile = profileResult.profile;

    const resolvedRole = supervisorProfile?.role || metadataRole;

    if (resolvedRole !== 'supervisor' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Supervisor or admin access is required.',
        debug: {
          userId: user.id,
          email: user.email,
          metadataRole,
          profileLookup: profileResult.lookup,
          profileError: profileResult.error
        }
      });
    }

    if (supervisorProfile?.is_active === false) {
      return res.status(403).json({ success: false, error: 'This supervisor account is inactive.' });
    }

    const role = resolvedRole;
    const isAdmin = role === 'admin';
    const supervisorIdForAssignments = supervisorProfile?.id || user.id;

    const candidateResult = await loadCandidates(serviceClient, supervisorIdForAssignments, role);

    if (candidateResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load assigned candidates.',
        details: candidateResult.error,
        debug: {
          userId: user.id,
          email: user.email,
          metadataRole,
          supervisorIdForAssignments,
          role,
          profileLookup: profileResult.lookup,
          profileError: profileResult.error
        }
      });
    }

    const assignedCandidates = candidateResult.candidates || [];
    const candidateIds = assignedCandidates.map((candidate) => candidate.id).filter(Boolean);

    let allAssessments = [];
    let resultRows = [];
    let nationalServiceReports = [];
    let otherReports = [];
    let candidates = [];

    if (candidateIds.length > 0) {
      const assessmentResponse = await serviceClient
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

      if (assessmentResponse.error) {
        return res.status(500).json({ success: false, error: 'Failed to load candidate assessments.', details: assessmentResponse.error.message });
      }

      allAssessments = assessmentResponse.data || [];
      const resultIds = allAssessments.map((assessment) => assessment.result_id).filter(Boolean);

      if (resultIds.length > 0) {
        const resultResponse = await serviceClient
          .from('assessment_results')
          .select('*')
          .in('id', resultIds);

        if (resultResponse.error) {
          return res.status(500).json({ success: false, error: 'Failed to load assessment results.', details: resultResponse.error.message });
        }

        resultRows = resultResponse.data || [];
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
        const candidateAssessments = allAssessments.filter((assessment) => String(assessment.user_id) === String(candidate.id));
        const completed = candidateAssessments.filter((assessment) => assessment.status === 'completed' || assessment.result_id !== null).length;
        const inProgress = candidateAssessments.filter((assessment) => assessment.status === 'in_progress').length;
        const unblocked = candidateAssessments.filter((assessment) => assessment.status === 'unblocked').length;
        const blocked = candidateAssessments.filter((assessment) => assessment.status === 'blocked').length;
        const notStarted = candidateAssessments.filter((assessment) => assessment.status === 'pending' || !assessment.status || assessment.status === '').length;

        const completedAssessments = candidateAssessments
          .filter((assessment) => assessment.status === 'completed' || assessment.result_id !== null)
          .map((assessment) => {
            const reportEntry = allReportData.find(
              (report) => String(report.result_id) === String(assessment.result_id) && String(report.candidate_id) === String(candidate.id)
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
          stats: { completed, inProgress, unblocked, blocked, notStarted, total: candidateAssessments.length },
          completedAssessments
        };
      });
    }

    const stats = {
      totalCandidates: assignedCandidates.length,
      completedAssessments: allAssessments.filter((assessment) => assessment.status === 'completed' || assessment.result_id !== null).length,
      pendingReviews: allAssessments.filter((assessment) => assessment.status === 'in_progress' || assessment.status === 'unblocked').length,
      nationalServiceReports: nationalServiceReports.length
    };

    return res.status(200).json({
      success: true,
      supervisor: {
        id: supervisorProfile?.id || user.id,
        email: supervisorProfile?.email || user.email,
        full_name: supervisorProfile?.full_name || user.user_metadata?.full_name || '',
        role,
        is_admin: isAdmin
      },
      stats,
      candidates,
      nationalServiceReports,
      otherReports,
      debug: {
        userId: user.id,
        userEmail: user.email,
        metadataRole,
        profileLookup: profileResult.lookup,
        profileError: profileResult.error,
        supervisorIdForAssignments,
        assignedCandidates: assignedCandidates.length,
        candidateAssessments: allAssessments.length,
        resultRows: resultRows.length,
        nationalServiceReports: nationalServiceReports.length,
        otherReports: otherReports.length,
        serviceRoleKeyLooksValid: true
      }
    });
  } catch (error) {
    console.error('[Supervisor Dashboard API] Fatal error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load supervisor dashboard.' });
  }
}
