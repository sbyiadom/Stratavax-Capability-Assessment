// pages/api/supervisor/reports.js - FULLY CORRECTED DEPLOYMENT VERSION
// FIX: Properly extracts type from Supabase array, adds broader NS detection.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getReportData(result) {
  const raw = result?.report_data;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('Failed to parse report_data:', error);
      return {};
    }
  }
  return {};
}

function getNationalServiceOverallScore(result) {
  const reportData = getReportData(result);
  return safeNumber(
    reportData?.dimensions?.overallScore ??
    reportData?.scores?.overall ??
    reportData?.overallScore ??
    result?.percentage_score ??
    0
  );
}

function calculateRecommendation(workplaceReadiness, intellectualCapability, overallScore) {
  const workplace = safeNumber(workplaceReadiness);
  const intellectual = safeNumber(intellectualCapability);
  const overall = safeNumber(overallScore);
  
  if (overall > 0) {
    if (overall >= 85) return 'Highly Recommended';
    if (overall >= 75) return 'Recommended';
    if (overall >= 65) return 'Reserve Pool';
    if (overall >= 50) return 'Consider for Development';
    return 'Not Recommended';
  }
  
  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  if (workplace >= 50 || intellectual >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Missing token" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const supervisorId = userData.user.id;
    const supervisorEmail = userData.user.email;

    console.log('[Supervisor Reports] Supervisor ID:', supervisorId);

    // ============================================================
    // GET ASSIGNED CANDIDATES - MERGING BOTH LEGACY AND JUNCTION TABLE
    // ============================================================
    let assignedCandidates = [];
    const candidateMap = {};
    const candidateIdsSet = new Set();

    // Method 1: Legacy candidate_profiles fields
    const { data: candidatesByField, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email, created_at')
      .or(`supervisor_id.eq.${supervisorId},assigned_supervisor_id.eq.${supervisorId},supervisor_email.eq.${supervisorEmail}`);

    if (!candidateError && candidatesByField) {
      candidatesByField.forEach(candidate => {
        if (!candidateIdsSet.has(candidate.id)) {
          candidateIdsSet.add(candidate.id);
          candidateMap[candidate.id] = candidate;
        }
      });
      console.log('[Supervisor Reports] Found candidates by legacy fields:', candidatesByField.length);
    }

    // Method 2: NEW candidate_supervisors junction table
    const { data: junctionAssignments, error: junctionError } = await supabase
      .from('candidate_supervisors')
      .select('candidate_id')
      .eq('supervisor_id', supervisorId);

    if (!junctionError && junctionAssignments && junctionAssignments.length > 0) {
      const junctionCandidateIds = [...new Set(junctionAssignments.map(item => item.candidate_id).filter(Boolean))];
      const missingCandidateIds = junctionCandidateIds.filter(id => !candidateIdsSet.has(id));

      if (missingCandidateIds.length > 0) {
        const { data: junctionCandidates, error: junctionCandidatesError } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email, created_at')
          .in('id', missingCandidateIds);

        if (!junctionCandidatesError && junctionCandidates) {
          junctionCandidates.forEach(candidate => {
            if (!candidateIdsSet.has(candidate.id)) {
              candidateIdsSet.add(candidate.id);
              candidateMap[candidate.id] = candidate;
            }
          });
          console.log('[Supervisor Reports] Found candidates via candidate_supervisors:', junctionCandidates.length);
        }
      }
    }

    assignedCandidates = Object.values(candidateMap);

    console.log('[Supervisor Reports] Total assigned candidates:', assignedCandidates.length);

    if (assignedCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        candidates: [],
        stats: { total: 0, completed: 0, inProgress: 0 },
        message: 'No candidates assigned to this supervisor'
      });
    }

    const candidateIds = assignedCandidates.map(c => c.id);

    // ============================================================
    // GET ASSESSMENT RESULTS FOR THESE CANDIDATES
    // ============================================================
    const { data: results, error: resultsError } = await supabase
      .from('assessment_results')
      .select(`
        id,
        user_id,
        assessment_id,
        session_id,
        percentage_score,
        workplace_readiness,
        intellectual_capability,
        total_score,
        max_score,
        category_scores,
        report_data,
        completed_at,
        created_at,
        is_valid,
        is_auto_submitted,
        violation_count,
        assessments:assessment_id (
          id,
          title,
          assessment_type_id,
          assessment_types:assessment_type_id (
            id,
            code,
            name
          )
        )
      `)
      .in('user_id', candidateIds)
      .order('completed_at', { ascending: false });

    if (resultsError) {
      console.error('[Supervisor Reports] Results error:', resultsError);
      return res.status(500).json({ success: false, error: resultsError.message });
    }

    console.log('[Supervisor Reports] Results found:', results?.length || 0);

    // ============================================================
    // PROCESS REPORTS
    // ============================================================
    const reports = (results || []).map(result => {
      const assessment = result.assessments || {};
      
      // 🟢 CRITICAL FIX: Correctly extract the type from the Supabase Array
      const typeArray = assessment.assessment_types || assessment.assessment_type || [];
      const type = Array.isArray(typeArray) && typeArray.length > 0 ? typeArray[0] : {};

      // 🟢 BROADER NATIONAL SERVICE DETECTION
      const assessmentTitle = String(assessment?.title || '').toLowerCase().trim();
      const assessmentCode = String(type?.code || '').toLowerCase().trim();
      const assessmentTypeName = String(type?.name || '').toLowerCase().trim();

      const isNationalService = 
        assessment?.id === 'bdb9d46e-9fac-4d00-8478-1f649e7ac600' ||
        assessmentCode.includes('national') ||
        assessmentTypeName.includes('national service') ||
        assessmentTitle.includes('national service') ||
        assessmentTitle.includes('nationalservice') ||
        assessmentTitle.includes('service recruitment');

      const candidate = assignedCandidates.find(c => c.id === result.user_id) || {};

      // Get scores - prefer report_data for National Service
      let overallScore = safeNumber(result.percentage_score);
      if (isNationalService) {
        overallScore = getNationalServiceOverallScore(result);
      }

      const workplaceReadiness = safeNumber(result.workplace_readiness || 0);
      const intellectualCapability = safeNumber(result.intellectual_capability || 0);
      const recommendation = calculateRecommendation(workplaceReadiness, intellectualCapability, overallScore);

      const isCompleted = !!result.completed_at;

      return {
        result_id: result.id,
        candidate_id: result.user_id,
        candidate_name: candidate.full_name || 'Unknown',
        candidate_email: candidate.email || '',
        university: candidate.university || '',
        programme: candidate.programme || '',
        assessment_id: result.assessment_id,
        assessment_title: assessment?.title || 'Assessment',
        assessment_code: type?.code || 'general',
        score: overallScore,
        percentage_score: result.percentage_score || 0,
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        recommendation: recommendation,
        is_national_service: isNationalService,
        is_completed: isCompleted,
        is_auto_submitted: result.is_auto_submitted || false,
        completed_at: result.completed_at,
        category_scores: result.category_scores || [],
        report_data: result.report_data || {}
      };
    });

    // Split reports
    const nationalServiceReports = reports.filter(r => r.is_national_service === true);
    const otherReports = reports.filter(r => r.is_national_service === false);

    const stats = {
      total: reports.length,
      completed: reports.filter(r => r.is_completed).length,
      inProgress: reports.filter(r => !r.is_completed && r.session_id).length
    };

    return res.status(200).json({
      success: true,
      reports: reports,
      nationalServiceReports,
      otherReports,
      candidates: assignedCandidates,
      stats
    });

  } catch (error) {
    console.error('[Supervisor Reports] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
