// pages/api/supervisor/dashboard.js - COMPLETE FIXED v2
// Phase 6.5: Scope locked to primary supervisor (candidate_profiles.supervisor_id).
//            Junction access still applies elsewhere (report viewer) but is
//            NOT used for the supervisor dashboard's "my candidates" count.
//            All .in() queries are chunked to avoid URL length limits.

import { createClient } from '@supabase/supabase-js';

const IN_CHUNK_SIZE = 150;

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Run a query that filters by .in() over a possibly-large ID list, chunked.
async function chunkedIn(ids, queryBuilder) {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const chunks = chunkArray(ids, IN_CHUNK_SIZE);
  const allData = [];
  for (const chunk of chunks) {
    const { data, error } = await queryBuilder(chunk);
    if (error) return { data: allData, error };
    if (Array.isArray(data)) allData.push(...data);
  }
  return { data: allData, error: null };
}

function logSupabaseError(tag, error, extra = {}) {
  console.error(`[Supervisor Dashboard] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

function getReportData(result) {
  if (!result) return {};
  if (result.report_data && typeof result.report_data === 'object') return result.report_data;
  if (result.report_data && typeof result.report_data === 'string') {
    try { return JSON.parse(result.report_data) || {}; }
    catch { return {}; }
  }
  return {};
}

function normalizeCategoryScores(result) {
  const reportData = getReportData(result);
  const raw = result?.category_scores || reportData?.categoryScores || reportData?.categoryBreakdown || [];

  if (Array.isArray(raw)) {
    return raw.map(cat => ({
      category: cat.category || cat.name || '',
      percentage: Math.round(safeNumber(cat.percentage || cat.score || 0))
    }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([cat, data]) => ({
      category: cat,
      percentage: Math.round(safeNumber(data?.percentage || data?.score || 0))
    }));
  }
  return [];
}

function calculateScore(result) {
  if (result?.percentage_score) {
    return Math.round(safeNumber(result.percentage_score));
  }

  const categories = normalizeCategoryScores(result);
  const valid = categories.filter(c => c.percentage > 0);
  if (valid.length > 0) {
    const sum = valid.reduce((a, c) => a + c.percentage, 0);
    return Math.round(sum / valid.length);
  }

  const reportData = getReportData(result);
  if (reportData?.percentageScore) {
    return Math.round(safeNumber(reportData.percentageScore));
  }

  return 0;
}

function getNationalServiceScores(result) {
  const reportData = getReportData(result);

  let workplace = safeNumber(
    reportData?.workplaceReadiness ||
    reportData?.dimensions?.workplaceReadiness ||
    reportData?.workplace_readiness ||
    result?.workplace_readiness ||
    0
  );

  let intellectual = safeNumber(
    reportData?.intellectualCapability ||
    reportData?.dimensions?.intellectualCapability ||
    reportData?.intellectual_capability ||
    result?.intellectual_capability ||
    0
  );

  if (workplace === 0 && intellectual === 0) {
    const categoryScores = reportData?.categoryScores || reportData?.category_scores || result?.category_scores || [];

    const workplaceCategories = [
      'Communication & Teamwork',
      'Ownership & Integrity',
      'Safety & Risk Awareness',
      'Technical Fundamentals',
      'Work Ethic',
      'Professional Conduct'
    ];

    const intellectualCategories = [
      'Problem Solving & Troubleshooting',
      'Logical Reasoning',
      'Numerical Reasoning',
      'Measurement & Engineering Units',
      'Learning Agility',
      'Cognitive Ability',
      'Analytical Thinking'
    ];

    let workplaceTotal = 0;
    let workplaceCount = 0;
    let intellectualTotal = 0;
    let intellectualCount = 0;

    if (Array.isArray(categoryScores) && categoryScores.length > 0) {
      categoryScores.forEach(cat => {
        const name = (cat.category || cat.name || '').toLowerCase();
        const percentage = safeNumber(cat.percentage || cat.score || 0);

        const isWorkplace = workplaceCategories.some(c => name.includes(c.toLowerCase()));
        const isIntellectual = intellectualCategories.some(c => name.includes(c.toLowerCase()));

        if (isWorkplace && percentage > 0) {
          workplaceTotal += percentage;
          workplaceCount++;
        } else if (isIntellectual && percentage > 0) {
          intellectualTotal += percentage;
          intellectualCount++;
        }
      });
    }

    workplace = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
    intellectual = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;
  }

  const overall = safeNumber(
    reportData?.percentageScore ||
    reportData?.overallScore ||
    reportData?.percentage_score ||
    result?.percentage_score ||
    0
  );

  if (workplace === 0 && intellectual === 0 && overall > 0) {
    workplace = overall;
    intellectual = overall;
  }

  return {
    workplaceReadiness: workplace,
    intellectualCapability: intellectual,
    overallScore: overall
  };
}

function getRecommendation(workplace, intellectual, overall) {
  const w = safeNumber(workplace);
  const i = safeNumber(intellectual);
  const o = safeNumber(overall);

  const bestScore = Math.max(w, i, o);

  if (bestScore >= 85) return 'Highly Recommended';
  if (bestScore >= 75) return 'Recommended';
  if (bestScore >= 65) return 'Reserve Pool';
  if (bestScore >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization token'
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Supervisor Dashboard] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      logSupabaseError('auth.getUser failed', userError);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const authEmail = String(userData.user.email || '').trim().toLowerCase();
    const authId = userData.user.id;

    // ============================================================
    // RESOLVE SUPERVISOR PROFILE
    // ============================================================
    let supervisor = null;

    const { data: byId, error: byIdError } = await supabase
      .from('supervisor_profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', authId)
      .maybeSingle();

    if (byIdError) {
      logSupabaseError('supervisor lookup by id failed', byIdError, { authId });
    } else if (byId) {
      supervisor = byId;
    }

    if (!supervisor) {
      const { data: byEmail, error: byEmailError } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email, role, is_active')
        .ilike('email', authEmail)
        .maybeSingle();

      if (byEmailError) {
        logSupabaseError('supervisor lookup by email failed', byEmailError, { authEmail });
      } else if (byEmail) {
        supervisor = byEmail;
      }
    }

    if (!supervisor) {
      console.error('[Supervisor Dashboard] Supervisor not found:', { authId, authEmail });
      return res.status(404).json({
        success: false,
        error: 'Supervisor profile not found. Please contact support.',
        code: 'SUPERVISOR_PROFILE_NOT_FOUND'
      });
    }

    if (supervisor.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'Supervisor account is inactive. Please contact support.',
        code: 'SUPERVISOR_INACTIVE'
      });
    }

    const supervisorId = supervisor.id;

    // ============================================================
    // FETCH CANDIDATES — PRIMARY ONLY (locked semantics)
    // ============================================================
    const { data: primaryCandidates, error: primaryError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id, created_at')
      .eq('supervisor_id', supervisorId);

    if (primaryError) {
      logSupabaseError('primary candidates lookup failed', primaryError, { supervisorId });
      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve candidate list',
        code: 'CANDIDATES_FETCH_FAILED'
      });
    }

    const allCandidates = primaryCandidates || [];
    const totalCandidates = allCandidates.length;

    if (totalCandidates === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalCandidates: 0,
          completedAssessments: 0,
          pendingReviews: 0,
          nationalServiceReports: 0
        },
        candidates: [],
        nationalServiceReports: [],
        otherReports: [],
        diagnostics: {
          supervisorId: supervisor.id,
          supervisorName: supervisor.full_name,
          message: 'No candidates assigned to this supervisor'
        }
      });
    }

    const candidateIds = allCandidates.map(c => c.id);

    // ============================================================
    // FETCH ASSESSMENT RESULTS (chunked)
    // ============================================================
    const { data: results, error: resultsError } = await chunkedIn(candidateIds, (chunk) =>
      supabase
        .from('assessment_results')
        .select('id, user_id, assessment_id, percentage_score, completed_at, report_data, category_scores, workplace_readiness, intellectual_capability, total_score, max_score')
        .in('user_id', chunk)
    );

    if (resultsError) {
      logSupabaseError('assessment results fetch failed', resultsError, {
        candidateCount: candidateIds.length,
      });
      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve assessment reports',
        code: 'ASSESSMENT_RESULTS_FETCH_FAILED'
      });
    }

    const resultRows = results || [];

    // ============================================================
    // FETCH ASSESSMENT DETAILS (chunked)
    // ============================================================
    const assessmentIds = [...new Set(resultRows.map(r => r.assessment_id).filter(Boolean))];
    const assessmentMap = {};

    if (assessmentIds.length > 0) {
      const { data: assessments, error: assessmentError } = await chunkedIn(assessmentIds, (chunk) =>
        supabase
          .from('assessments')
          .select('id, title, assessment_type_id')
          .in('id', chunk)
      );

      if (assessmentError) {
        logSupabaseError('assessments lookup failed', assessmentError, {
          assessmentCount: assessmentIds.length,
        });
      } else {
        (assessments || []).forEach(a => { assessmentMap[a.id] = a; });
      }
    }

    // ============================================================
    // PROCESS RESULTS
    // ============================================================
    const candidateMap = {};
    allCandidates.forEach(c => { candidateMap[c.id] = c; });

    const NS_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

    let totalCompleted = 0;
    let nationalServiceCount = 0;
    let orphanCount = 0;
    const allReports = [];

    resultRows.forEach(r => {
      const candidate = candidateMap[r.user_id];
      if (!candidate) {
        orphanCount++;
        return;
      }

      const assessment = assessmentMap[r.assessment_id];
      const isNS = r.assessment_id === NS_ASSESSMENT_ID;

      let score = calculateScore(r);
      let workplace = 0;
      let intellectual = 0;

      if (isNS) {
        const nsScores = getNationalServiceScores(r);
        workplace = nsScores.workplaceReadiness || 0;
        intellectual = nsScores.intellectualCapability || 0;
        score = nsScores.overallScore || score;
      } else {
        workplace = safeNumber(r.workplace_readiness || 0);
        intellectual = safeNumber(r.intellectual_capability || 0);
      }

      if (score === 0 && r.percentage_score) {
        score = safeNumber(r.percentage_score);
      }

      const hasCompletionDate = !!r.completed_at;
      const hasPercentageScore = r.percentage_score !== null && r.percentage_score !== undefined && r.percentage_score !== '';
      const hasScore = score > 0;

      if (hasCompletionDate || hasPercentageScore || hasScore) {
        totalCompleted++;
      }

      if (isNS) nationalServiceCount++;

      const recommendation = getRecommendation(workplace, intellectual, score);

      allReports.push({
        result_id: r.id,
        candidate_id: r.user_id,
        candidate_name: candidate.full_name || 'Unknown',
        candidate_email: candidate.email || '',
        university: candidate.university || '',
        programme: candidate.programme || '',
        assessment_id: r.assessment_id,
        assessment_title: assessment?.title || 'Assessment',
        score: score,
        percentage_score: r.percentage_score || 0,
        workplace_readiness: workplace,
        intellectual_capability: intellectual,
        recommendation: recommendation,
        is_national_service: isNS,
        completed_at: r.completed_at,
        category_scores: r.category_scores || [],
        report_data: r.report_data || {}
      });
    });

    const nsReports = allReports.filter(r => r.is_national_service);
    const otherReports = allReports.filter(r => !r.is_national_service);

    // ============================================================
    // BUILD CANDIDATE ROWS
    // ============================================================
    const candidateRows = allCandidates.map(c => {
      const candidateReports = allReports.filter(r => r.candidate_id === c.id);
      return {
        ...c,
        completedAssessments: candidateReports,
        stats: {
          completed: candidateReports.filter(r => r.completed_at).length,
          inProgress: 0,
          unblocked: 0,
          blocked: 0,
          notStarted: 0
        }
      };
    });

    // ============================================================
    // RETURN
    // ============================================================
    return res.status(200).json({
      success: true,
      stats: {
        totalCandidates: totalCandidates,
        completedAssessments: totalCompleted,
        pendingReviews: 0,
        nationalServiceReports: nationalServiceCount
      },
      candidates: candidateRows,
      nationalServiceReports: nsReports,
      otherReports: otherReports,
      diagnostics: {
        supervisorId: supervisor.id,
        supervisorName: supervisor.full_name,
        candidateCount: totalCandidates,
        resultCount: resultRows.length,
        reportCount: allReports.length,
        orphanResultCount: orphanCount
      }
    });

  } catch (error) {
    console.error('[Supervisor Dashboard] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
