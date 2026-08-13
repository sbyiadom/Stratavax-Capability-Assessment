// pages/api/supervisor/dashboard.js - FINAL SOURCE OF TRUTH FIX
// Counts completed reports from assessment_results, not candidate_assessments.

import { createClient } from '@supabase/supabase-js';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function safeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
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
      console.error('[Dashboard] Failed to parse report_data:', error);
      return {};
    }
  }
  return {};
}

function normalizeCategoryScores(result) {
  const reportData = getReportData(result);

  const rawCategories = 
    result?.category_scores ||
    reportData?.category_scores ||
    reportData?.categoryBreakdown ||
    reportData?.categoryScores ||
    result?.categoryScores;

  if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
    return Object.entries(rawCategories).map(([category, data]) => ({
      category: category,
      percentage: Math.round(Number(data?.percentage || 0)),
      maxScore: data?.maxPossible || data?.total || data?.maxScore || 0,
      score: data?.score || 0
    }));
  }

  if (Array.isArray(rawCategories)) {
    return rawCategories.map((cat) => ({
      category: cat.category || cat.name || '',
      percentage: Math.round(Number(cat.percentage || cat.score || 0)),
      maxScore: cat.maxScore || cat.maxPossible || cat.total || 0,
      score: cat.score || 0
    }));
  }

  return [];
}

function calculateTrueAssessmentScore(result) {
  const finalCategoryScores = normalizeCategoryScores(result);

  if (finalCategoryScores.length > 0) {
    const validScores = finalCategoryScores.filter((cat) => Number(cat.percentage || 0) > 0);
    if (validScores.length > 0) {
      const sum = validScores.reduce((acc, cat) => acc + Number(cat.percentage || 0), 0);
      return Math.round(sum / validScores.length);
    }
  }

  return Math.round(safeNumber(result?.percentage_score || result?.score || result?.overallScore || 0));
}

function getNationalServiceScores(result) {
  const reportData = getReportData(result);
  
  return {
    workplaceReadiness: safeNumber(
      reportData?.dimensions?.workplaceReadiness ??
      reportData?.scores?.workplace ??
      result?.workplace_readiness ??
      0
    ),
    intellectualCapability: safeNumber(
      reportData?.dimensions?.intellectualCapability ??
      reportData?.scores?.intellectual ??
      result?.intellectual_capability ??
      0
    ),
    overallScore: safeNumber(
      reportData?.dimensions?.overallScore ??
      reportData?.scores?.overall ??
      reportData?.overallScore ??
      reportData?.percentageScore ??
      result?.percentage_score ??
      0
    )
  };
}

function calculateSubScores(categoryScores) {
  let workplaceTotal = 0;
  let workplaceCount = 0;
  let intellectualTotal = 0;
  let intellectualCount = 0;

  const workplaceCategories = ['Safety & Risk Awareness', 'Technical Fundamentals', 'Communication & Teamwork', 'Ownership & Integrity', 'Professional Conduct', 'Work Ethic'];
  const intellectualCategories = ['Problem Solving & Troubleshooting', 'Logical Reasoning', 'Numerical Reasoning', 'Measurement & Engineering Units', 'Learning Agility', 'Cognitive Ability', 'Analytical Thinking'];

  if (!categoryScores || !Array.isArray(categoryScores)) {
    return { workplaceReadiness: 0, intellectualCapability: 0 };
  }

  categoryScores.forEach(cat => {
    const name = (cat.category || cat.name || '').toLowerCase();
    const percentage = Number(cat.percentage || cat.score || 0);
    
    const isWorkplace = workplaceCategories.some(keyword => name.includes(keyword.toLowerCase()));
    const isIntellectual = intellectualCategories.some(keyword => name.includes(keyword.toLowerCase()));

    if (isWorkplace) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectual) {
      intellectualTotal += percentage;
      intellectualCount++;
    }
  });

  return {
    workplaceReadiness: workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0,
    intellectualCapability: intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0
  };
}

function calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability, overallScore) {
  const workplace = safeNumber(workplaceReadiness);
  const intellectual = safeNumber(intellectualCapability);
  const overall = safeNumber(overallScore);

  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  if (workplace >= 50 || intellectual >= 50 || overall >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

// ============================================================
// 🟢 SECTION 5: PAGINATION HELPER
// ============================================================
async function fetchAllRows(queryBuilderFactory, pageSize = 1000) {
  let allRows = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryBuilderFactory().range(from, to);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    allRows = allRows.concat(rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Missing env vars' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const supervisorId = userData.user.id;
    const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

    // ============================================================
    // STEP 1: GET CANDIDATES ASSIGNED TO SUPERVISOR
    // ============================================================
    let allCandidates = [];
    const candidateIdsSet = new Set();

    // 1. Fetch via Junction Table
    const { data: junctionAssignments, error: junctionError } = await supabase
      .from('candidate_supervisors')
      .select('candidate_id')
      .eq('supervisor_id', supervisorId);

    if (!junctionError && junctionAssignments && junctionAssignments.length > 0) {
      const junctionIds = junctionAssignments.map(j => j.candidate_id).filter(Boolean);
      if (junctionIds.length > 0) {
        const { data: junctionCandidates, error: junctionCandError } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, university, programme, graduation_year, preferred_department')
          .in('id', junctionIds);
        if (!junctionCandError && junctionCandidates) {
          junctionCandidates.forEach(c => {
            if (!candidateIdsSet.has(c.id)) {
              candidateIdsSet.add(c.id);
              allCandidates.push(c);
            }
          });
        }
      }
    }

    // 2. Fetch via Legacy field
    const { data: legacyCandidates, error: legacyError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, graduation_year, preferred_department')
      .eq('supervisor_id', supervisorId);

    if (!legacyError && legacyCandidates) {
      legacyCandidates.forEach(c => {
        if (!candidateIdsSet.has(c.id)) {
          candidateIdsSet.add(c.id);
          allCandidates.push(c);
        }
      });
    }

    const candidates = allCandidates;
    const candidateIds = candidates.map(c => c.id);

    // ============================================================
    // STEP 2: GET ASSESSMENT STATUS AND RESULTS (PAGINATED)
    // ============================================================
    // 🟢 SECTION 5.1: Paginate candidate_assessments
    const candidateAssessments = await fetchAllRows(() => 
      supabase
        .from('candidate_assessments')
        .select('user_id, assessment_id, status, result_id, completed_at, updated_at')
        .in('user_id', candidateIds)
    );

    // 🟢 SECTION 5.2: Paginate assessment_results
    const candidateResultIds = [...new Set(
      candidates.flatMap(c => [c.id, c.user_id]).filter(Boolean)
    )];

    const results = await fetchAllRows(() => 
      supabase
        .from('assessment_results')
        .select('*')
        .in('user_id', candidateResultIds)
    );

    // 🟢 SECTION 4.4: Fetch assessments using IDs from BOTH sources
    const assessmentIDs = [
      ...new Set([
        ...(candidateAssessments || []).map(a => a.assessment_id),
        ...(results || []).map(r => r.assessment_id)
      ].filter(Boolean))
    ];

    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('id, title, assessment_type_id')
      .in('id', assessmentIDs);

    if (assessmentsError) {
      console.error('[Dashboard] Assessments error:', assessmentsError);
      return res.status(500).json({ success: false, error: assessmentsError.message });
    }

    const typeIds = assessments.map(a => a.assessment_type_id).filter(Boolean);
    let typeMap = {};
    if (typeIds.length > 0) {
      const { data: types } = await supabase
        .from('assessment_types')
        .select('id, code, name')
        .in('id', typeIds);
      if (types) types.forEach(t => typeMap[t.id] = t);
    }

    // ============================================================
    // STEP 3: BUILD DATA STRUCTURES
    // ============================================================
    const assessmentMap = assessments.reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    const caMap = candidateAssessments.reduce((acc, ca) => {
      if (!acc[ca.user_id]) acc[ca.user_id] = [];
      acc[ca.user_id].push(ca);
      return acc;
    }, {});

    let totalCompleted = 0;
    let totalInProgress = 0;
    let nationalServiceReports = 0;
    const allReports = [];
    const candidateRows = [];

    // ============================================================
    // STEP 4: PROCESS CANDIDATES (Source of Truth: assessment_results)
    // ============================================================
    candidates.forEach(c => {
      const userAssessments = caMap[c.id] || [];

      // 🟢 SECTION 4.1: Completed reports must come from assessment_results
      const candidateResults = results.filter(r => String(r.user_id) === String(c.id));
      const completedResults = candidateResults.filter(r => {
        if (!r || r.is_valid === false) return false;
        return (
          Boolean(r.id) &&
          Boolean(r.assessment_id) &&
          (
            r.completed_at ||
            safeNumber(r.percentage_score) > 0 ||
            normalizeCategoryScores(r).length > 0 ||
            Object.keys(getReportData(r)).length > 0 ||
            String(r.status || '').toLowerCase() === 'completed'
          )
        );
      });

      // 🟢 SECTION 4.3: In-progress excludes assessments that already have a completed result
      const inProgress = userAssessments.filter(a => {
        const hasCompletedResult = completedResults.some(
          r => String(r.assessment_id) === String(a.assessment_id)
        );
        return a.status === 'in_progress' && !hasCompletedResult;
      });

      totalCompleted += completedResults.length;
      totalInProgress += inProgress.length;

      // 🟢 SECTION 4.2: Replace ca with r references
      const completedAssessments = completedResults.map(r => {
        const linkedCandidateAssessment = userAssessments.find(
          ca => String(ca.result_id) === String(r.id) && String(ca.assessment_id) === String(r.assessment_id)
        );
        const assessment = assessmentMap[r.assessment_id];
        const type = assessment ? typeMap[assessment.assessment_type_id] : null;

        const assessmentTitle = String(assessment?.title || '').toLowerCase().trim();
        const assessmentCode = String(type?.code || '').toLowerCase().trim();
        const assessmentTypeName = String(type?.name || '').toLowerCase().trim();

        const isNationalService = 
          r.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
          assessmentCode.includes('national') ||
          assessmentTypeName.includes('national service') ||
          assessmentTitle === 'national service recruitment assessment' ||
          assessmentTitle.includes('national service') ||
          assessmentTitle.includes('nationalservice') ||
          assessmentTitle.includes('service recruitment');

        let workplace = 0;
        let intellectual = 0;
        let overallScore = 0;
        let finalCategoryScores = [];

        if (isNationalService) {
          const nsScores = getNationalServiceScores(r);
          workplace = nsScores.workplaceReadiness;
          intellectual = nsScores.intellectualCapability;
          overallScore = nsScores.overallScore;
        } else {
          workplace = safeNumber(r?.workplace_readiness || 0);
          intellectual = safeNumber(r?.intellectual_capability || 0);
          overallScore = calculateTrueAssessmentScore(r);
          finalCategoryScores = normalizeCategoryScores(r);
        }

        if (workplace === 0 && intellectual === 0 && r?.category_scores) {
          const calculated = calculateSubScores(r.category_scores);
          workplace = calculated.workplaceReadiness;
          intellectual = calculated.intellectualCapability;
        }

        if (overallScore === 0 && (workplace > 0 || intellectual > 0)) {
          overallScore = Math.round((workplace + intellectual) / 2);
        }

        let recommendation = 'Not Available';
        if (isNationalService) {
          recommendation = calculateNationalServiceRecommendation(workplace, intellectual, overallScore);
        } else {
          if (overallScore >= 85) recommendation = 'Highly Recommended';
          else if (overallScore >= 75) recommendation = 'Recommended';
          else if (overallScore >= 65) recommendation = 'Reserve Pool';
          else if (overallScore >= 50) recommendation = 'Consider for Development';
          else recommendation = 'Not Recommended';
        }

        if (isNationalService) nationalServiceReports++;

        return {
          assessment_id: r.assessment_id,
          result_id: r.id,
          title: assessment?.title || 'Assessment',
          assessment_code: type?.code || 'general',
          score: overallScore,
          percentage_score: overallScore,
          overallScore: overallScore,
          category_scores: finalCategoryScores,
          categoryScores: finalCategoryScores,
          report_data: getReportData(r),
          isNationalService: isNationalService,
          workplace_readiness: workplace,
          intellectual_capability: intellectual,
          completed_at: r.completed_at,
          recommendation: recommendation
        };
      });

      const stats = {
        completed: completedResults.length,
        inProgress: inProgress.length,
        unblocked: userAssessments.filter(a => a.status === 'unblocked').length,
        blocked: userAssessments.filter(a => a.status === 'blocked').length,
        notStarted: userAssessments.filter(a => a.status === 'not_started').length
      };

      completedAssessments.forEach(a => {
        allReports.push({
          result_id: a.result_id,
          candidate_id: c.id,
          candidate_name: c.full_name || 'Unknown',
          candidate_email: c.email || '',
          university: c.university || '',
          programme: c.programme || '',
          assessment_id: a.assessment_id,
          assessment_title: a.title || 'Assessment',
          assessment_code: a.assessment_code || 'general',
          score: a.score || 0,
          percentage_score: a.percentage_score || 0,
          overallScore: a.overallScore || 0,
          category_scores: a.category_scores || [],
          categoryScores: a.categoryScores || [],
          report_data: a.report_data || {},
          is_national_service: a.isNationalService || false,
          workplace_readiness: a.workplace_readiness || 0,
          intellectual_capability: a.intellectual_capability || 0,
          recommendation: a.recommendation || 'Not Available',
          status: 'completed',
          completed_at: a.completed_at
        });
      });

      candidateRows.push({
        id: c.id,
        full_name: c.full_name || 'Unknown',
        email: c.email || '',
        university: c.university || '',
        programme: c.programme || '',
        graduation_year: c.graduation_year || '',
        preferred_department: c.preferred_department || '',
        stats: stats,
        completedAssessments: completedAssessments,
        inProgressAssessments: inProgress
      });
    });

    const nationalServiceReportsList = allReports.filter(r => r.is_national_service === true);
    const otherReportsList = allReports.filter(r => r.is_national_service === false);

    return res.status(200).json({
      success: true,
      stats: {
        totalCandidates: candidates.length,
        completedAssessments: totalCompleted,
        pendingReviews: totalInProgress,
        nationalServiceReports: nationalServiceReports
      },
      candidates: candidateRows,
      nationalServiceReports: nationalServiceReportsList,
      otherReports: otherReportsList,
      debug: {
        assignedCandidates: candidates.length,
        candidateAssessments: candidateAssessments.length,
        resultRows: results.length,
        totalReports: allReports.length,
        nsReports: nationalServiceReportsList.length,
        otherReports: otherReportsList.length,
        supervisorId: supervisorId,
        supportsMultiSupervisor: true
      }
    });

  } catch (error) {
    console.error('[Supervisor Dashboard] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}
