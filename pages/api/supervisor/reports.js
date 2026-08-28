// pages/api/supervisor/reports.js
// COMPLETE FIXED VERSION
// Checks BOTH legacy AND junction table for permission
// Also checks shared_report_access

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const supervisorId = userData.user.id;
    const { user_id, assessment_id } = req.query;

    console.log('[Supervisor Reports] Supervisor ID:', supervisorId);

    // ============================================================
    // GET ASSIGNED CANDIDATES (BOTH SOURCES)
    // ============================================================
    let allCandidates = [];
    const candidateIdsSet = new Set();

    // Method 1: Legacy fields
    const { data: candidatesByField, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id, created_at')
      .eq('supervisor_id', supervisorId);

    if (!candidateError && candidatesByField) {
      candidatesByField.forEach(candidate => {
        if (!candidateIdsSet.has(candidate.id)) {
          candidateIdsSet.add(candidate.id);
          allCandidates.push(candidate);
        }
      });
      console.log('[Supervisor Reports] Found candidates by legacy fields:', candidatesByField.length);
    }

    // Method 2: Junction table
    const { data: junctionAssignments, error: junctionError } = await supabase
      .from('candidate_supervisors')
      .select('candidate_id')
      .eq('supervisor_id', supervisorId);

    if (!junctionError && junctionAssignments && junctionAssignments.length > 0) {
      const junctionCandidateIds = junctionAssignments.map(item => item.candidate_id).filter(Boolean);
      const missingIds = junctionCandidateIds.filter(id => !candidateIdsSet.has(id));

      if (missingIds.length > 0) {
        const { data: junctionCandidates, error: junctionCandidatesError } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, university, programme, supervisor_id, created_at')
          .in('id', missingIds);

        if (!junctionCandidatesError && junctionCandidates) {
          junctionCandidates.forEach(candidate => {
            if (!candidateIdsSet.has(candidate.id)) {
              candidateIdsSet.add(candidate.id);
              allCandidates.push(candidate);
            }
          });
          console.log('[Supervisor Reports] Found candidates via junction table:', junctionCandidates.length);
        }
      }
    }

    console.log('[Supervisor Reports] Total assigned candidates:', allCandidates.length);

    // ============================================================
    // FILTER BY SPECIFIC USER WITH PERMISSION CHECK
    // ============================================================
    let targetCandidates = allCandidates;

    if (user_id) {
      // Check if the candidate exists at all
      const { data: candidateExists, error: existsError } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', user_id)
        .maybeSingle();

      if (existsError || !candidateExists) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }

      // Check if candidate is assigned via legacy field
      const assignedCandidate = allCandidates.find(c => c.id === user_id);
      
      if (assignedCandidate) {
        targetCandidates = [assignedCandidate];
        console.log('[Supervisor Reports] Found candidate via legacy assignment');
      } else {
        // Check junction table
        const { data: junctionCheck, error: junctionCheckError } = await supabase
          .from('candidate_supervisors')
          .select('candidate_id')
          .eq('candidate_id', user_id)
          .eq('supervisor_id', supervisorId)
          .maybeSingle();

        if (!junctionCheckError && junctionCheck) {
          // Candidate is assigned via junction table, fetch their details
          const { data: candidateData, error: candidateDataError } = await supabase
            .from('candidate_profiles')
            .select('id, full_name, email, university, programme, supervisor_id, created_at')
            .eq('id', user_id)
            .maybeSingle();

          if (!candidateDataError && candidateData) {
            targetCandidates = [candidateData];
            console.log('[Supervisor Reports] Found candidate via junction table');
          } else {
            return res.status(404).json({
              success: false,
              error: 'Candidate not found'
            });
          }
        } else {
          // Check shared access
          const { data: sharedAccess, error: sharedError } = await supabase
            .from('shared_report_access')
            .select('candidate_id, expires_at')
            .eq('candidate_id', user_id)
            .eq('granted_to', supervisorId)
            .maybeSingle();

          if (!sharedError && sharedAccess) {
            // Check if access has expired
            if (sharedAccess.expires_at && new Date(sharedAccess.expires_at) < new Date()) {
              return res.status(403).json({
                success: false,
                error: 'Access to this report has expired'
              });
            }

            const { data: candidateData, error: candidateDataError } = await supabase
              .from('candidate_profiles')
              .select('id, full_name, email, university, programme, supervisor_id, created_at')
              .eq('id', user_id)
              .maybeSingle();

            if (!candidateDataError && candidateData) {
              targetCandidates = [candidateData];
              console.log('[Supervisor Reports] Found candidate via shared access');
            } else {
              return res.status(404).json({
                success: false,
                error: 'Candidate not found'
              });
            }
          } else {
            return res.status(404).json({
              success: false,
              error: 'Candidate not found or not assigned to you'
            });
          }
        }
      }
    }

    if (targetCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        candidates: [],
        stats: { total: 0, completed: 0, inProgress: 0 },
        message: 'No candidates assigned to this supervisor'
      });
    }

    const candidateIds = targetCandidates.map(c => c.id);

    // ============================================================
    // GET ASSESSMENT RESULTS
    // ============================================================
    let query = supabase
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

    if (assessment_id) {
      query = query.eq('assessment_id', assessment_id);
    }

    const { data: results, error: resultsError } = await query;

    if (resultsError) {
      console.error('[Supervisor Reports] Results error:', resultsError);
      return res.status(500).json({ 
        success: false, 
        error: resultsError.message 
      });
    }

    console.log('[Supervisor Reports] Results found:', results?.length || 0);

    // ============================================================
    // PROCESS REPORTS
    // ============================================================
    const reports = (results || []).map(result => {
      const assessment = result.assessments || {};
      
      const typeArray = assessment.assessment_types || assessment.assessment_type || [];
      const type = Array.isArray(typeArray) && typeArray.length > 0 ? typeArray[0] : {};

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

      const candidate = targetCandidates.find(c => c.id === result.user_id) || {};

      let overallScore = safeNumber(result.percentage_score);
      if (isNationalService) {
        overallScore = getNationalServiceOverallScore(result);
      }

      const workplaceReadiness = safeNumber(result.workplace_readiness || 0);
      const intellectualCapability = safeNumber(result.intellectual_capability || 0);
      const recommendation = calculateRecommendation(workplaceReadiness, intellectualCapability, overallScore);
      const isCompleted = !!result.completed_at || (result.percentage_score !== null && result.percentage_score !== undefined);

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
        report_data: result.report_data || {},
        _result: result
      };
    });

    // ============================================================
    // RETURN RESPONSE
    // ============================================================
    if (assessment_id && reports.length === 1) {
      const report = reports[0];
      const candidate = targetCandidates.find(c => c.id === report.candidate_id) || {};
      const assessment = report._result?.assessments || {};

      return res.status(200).json({
        success: true,
        result: report._result,
        candidate: {
          id: candidate.id,
          full_name: candidate.full_name,
          email: candidate.email,
          university: candidate.university,
          programme: candidate.programme,
        },
        assessment: {
          id: assessment.id,
          title: assessment.title,
        },
        generatedReport: {
          ...report,
          candidateName: candidate.full_name || 'Candidate',
          assessmentName: assessment.title || 'Assessment',
          percentage_score: report.score,
          overallScore: report.score,
          category_scores: report.category_scores || [],
          recommendation: report.recommendation,
          completed_at: report.completed_at,
        },
        reports: reports,
        candidates: targetCandidates,
        stats: {
          total: reports.length,
          completed: reports.filter(r => r.is_completed).length,
          inProgress: reports.filter(r => !r.is_completed && r.session_id).length
        }
      });
    }

    const nationalServiceReports = reports.filter(r => r.is_national_service === true);
    const otherReports = reports.filter(r => r.is_national_service === false);

    return res.status(200).json({
      success: true,
      reports: reports,
      nationalServiceReports,
      otherReports,
      candidates: targetCandidates,
      stats: {
        total: reports.length,
        completed: reports.filter(r => r.is_completed).length,
        inProgress: reports.filter(r => !r.is_completed && r.session_id).length
      }
    });

  } catch (error) {
    console.error('[Supervisor Reports] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
