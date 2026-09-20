// pages/api/supervisor/dashboard.js
// Phase 7B — supervisor dashboard stats, candidates, and reports payload.
//
// SCOPE POLICY CHANGE:
//   Phase 6.5 deliberately scoped this endpoint to primary-only
//   (candidate_profiles.supervisor_id), so the dashboard's "Total Candidates"
//   counted only directly-owned candidates. That decision was superseded in
//   Phase 7B: the dashboard now uses the same union scope (primary + junction)
//   as every other supervisor endpoint, so the dashboard agrees with
//   /supervisor/manage-candidate, /supervisor/assign-assessment,
//   /supervisor/batch-manage, /supervisor/reports, and
//   /supervisor/export-dashboard.
//
//   Scoping is delegated to the Postgres function public.get_scoped_candidate_ids,
//   which returns the set of candidate_profiles.id values visible to the caller.
//
// AUTH:
//   authorizeRequest from utils/apiAuth.js — service role + role check +
//   active-account check. Same pattern as every other Phase 7B endpoint.
//
// RESPONSE SHAPE (unchanged so pages/supervisor/index.js consumes it as-is):
//   {
//     success: true,
//     stats: { totalCandidates, completedAssessments, pendingReviews, nationalServiceReports },
//     candidates: [{ ...candidate, completedAssessments: [...], stats: {...} }],
//     nationalServiceReports: [...],
//     otherReports: [...],
//     diagnostics: { supervisorId, supervisorName, candidateCount, resultCount,
//                    reportCount, orphanResultCount },
//     scope: { type, role, candidateCount, resultCount }
//   }

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Supervisor Dashboard]';
const CANDIDATE_CHUNK_SIZE = 100;
const RESULT_CHUNK_SIZE = 150;
const ASSESSMENT_CHUNK_SIZE = 150;

const NS_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function logError(stage, error, extra = {}) {
  console.error(`${LOG_TAG} ${stage} failed`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getReportData(result) {
  if (!result) return {};
  if (result.report_data && typeof result.report_data === 'object') return result.report_data;
  if (result.report_data && typeof result.report_data === 'string') {
    try {
      return JSON.parse(result.report_data) || {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeCategoryScores(result) {
  const reportData = getReportData(result);
  const raw =
    result?.category_scores ||
    reportData?.categoryScores ||
    reportData?.categoryBreakdown ||
    [];

  if (Array.isArray(raw)) {
    return raw.map((cat) => ({
      category: cat.category || cat.name || '',
      percentage: Math.round(safeNumber(cat.percentage || cat.score || 0)),
    }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([cat, data]) => ({
      category: cat,
      percentage: Math.round(safeNumber(data?.percentage || data?.score || 0)),
    }));
  }
  return [];
}

function calculateScore(result) {
  if (result?.percentage_score) {
    return Math.round(safeNumber(result.percentage_score));
  }

  const categories = normalizeCategoryScores(result);
  const valid = categories.filter((c) => c.percentage > 0);
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
    const categoryScores =
      reportData?.categoryScores ||
      reportData?.category_scores ||
      result?.category_scores ||
      [];

    const workplaceCategories = [
      'Communication & Teamwork',
      'Ownership & Integrity',
      'Safety & Risk Awareness',
      'Technical Fundamentals',
      'Work Ethic',
      'Professional Conduct',
    ];

    const intellectualCategories = [
      'Problem Solving & Troubleshooting',
      'Logical Reasoning',
      'Numerical Reasoning',
      'Measurement & Engineering Units',
      'Learning Agility',
      'Cognitive Ability',
      'Analytical Thinking',
    ];

    let workplaceTotal = 0;
    let workplaceCount = 0;
    let intellectualTotal = 0;
    let intellectualCount = 0;

    if (Array.isArray(categoryScores) && categoryScores.length > 0) {
      categoryScores.forEach((cat) => {
        const name = (cat.category || cat.name || '').toLowerCase();
        const percentage = safeNumber(cat.percentage || cat.score || 0);

        const isWorkplace = workplaceCategories.some((c) => name.includes(c.toLowerCase()));
        const isIntellectual = intellectualCategories.some((c) => name.includes(c.toLowerCase()));

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
    overallScore: overall,
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
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  // ---- Auth: bearer token + role check + active-account check ----
  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;

  try {
    // ---- Scoping: DB-side union of primary + junction links ----
    const { data: scopedRows, error: scopedError } = await serviceClient.rpc(
      'get_scoped_candidate_ids',
      { p_caller: caller.userId, p_is_admin: caller.isAdmin }
    );

    if (scopedError) {
      logError('rpc get_scoped_candidate_ids', scopedError, {
        role: caller.role,
        userId: caller.userId,
      });
      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve candidate list',
        code: 'CANDIDATES_FETCH_FAILED',
      });
    }

    const scopedIds = Array.isArray(scopedRows)
      ? scopedRows
          .map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids))
          .filter(Boolean)
      : [];

    // ---- Empty scope: return 200 with empty everything ----
    if (scopedIds.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalCandidates: 0,
          completedAssessments: 0,
          pendingReviews: 0,
          nationalServiceReports: 0,
        },
        candidates: [],
        nationalServiceReports: [],
        otherReports: [],
        diagnostics: {
          supervisorId: caller.userId,
          supervisorName: caller.role === 'admin' ? 'Administrator' : null,
          message: 'No candidates in scope',
        },
        scope: {
          type: caller.isAdmin ? 'admin' : 'supervisor',
          role: caller.role,
          candidateCount: 0,
          resultCount: 0,
        },
      });
    }

    // ---- Hydrate candidate_profiles, chunked ----
    const candidatesById = new Map();

    for (const slice of chunk(scopedIds, CANDIDATE_CHUNK_SIZE)) {
      const { data: rows, error: fetchError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, created_at')
        .in('id', slice);

      if (fetchError) {
        logError('candidate_profiles chunk', fetchError, {
          chunkSize: slice.length,
          totalIds: scopedIds.length,
          role: caller.role,
        });
        return res.status(500).json({
          success: false,
          error: 'Unable to retrieve candidate list',
          code: 'CANDIDATES_FETCH_FAILED',
        });
      }

      (rows || []).forEach((row) => {
        if (row?.id) candidatesById.set(row.id, row);
      });
    }

    const allCandidates = Array.from(candidatesById.values());
    const totalCandidates = allCandidates.length;

    if (totalCandidates === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalCandidates: 0,
          completedAssessments: 0,
          pendingReviews: 0,
          nationalServiceReports: 0,
        },
        candidates: [],
        nationalServiceReports: [],
        otherReports: [],
        diagnostics: {
          supervisorId: caller.userId,
          message: 'No candidates in scope',
        },
        scope: {
          type: caller.isAdmin ? 'admin' : 'supervisor',
          role: caller.role,
          candidateCount: 0,
          resultCount: 0,
        },
      });
    }

    const candidateIds = allCandidates.map((c) => c.id);

    // ---- Fetch assessment_results, chunked ----
    const resultRows = [];

    for (const slice of chunk(candidateIds, RESULT_CHUNK_SIZE)) {
      const { data: rows, error: resultsError } = await serviceClient
        .from('assessment_results')
        .select(
          'id, user_id, assessment_id, percentage_score, completed_at, report_data, category_scores, workplace_readiness, intellectual_capability, total_score, max_score'
        )
        .in('user_id', slice);

      if (resultsError) {
        logError('assessment_results chunk', resultsError, {
          chunkSize: slice.length,
          totalCandidates: candidateIds.length,
        });
        return res.status(500).json({
          success: false,
          error: 'Unable to retrieve assessment reports',
          code: 'ASSESSMENT_RESULTS_FETCH_FAILED',
        });
      }

      if (Array.isArray(rows)) resultRows.push(...rows);
    }

    // ---- Fetch assessment details, chunked ----
    const assessmentIds = [...new Set(resultRows.map((r) => r.assessment_id).filter(Boolean))];
    const assessmentMap = {};

    if (assessmentIds.length > 0) {
      for (const slice of chunk(assessmentIds, ASSESSMENT_CHUNK_SIZE)) {
        const { data: assessments, error: assessmentError } = await serviceClient
          .from('assessments')
          .select('id, title, assessment_type_id')
          .in('id', slice);

        if (assessmentError) {
          logError('assessments chunk', assessmentError, {
            chunkSize: slice.length,
            totalAssessments: assessmentIds.length,
          });
          continue;
        }

        (assessments || []).forEach((a) => {
          assessmentMap[a.id] = a;
        });
      }
    }

    // ---- Process results ----
    const candidateMap = {};
    allCandidates.forEach((c) => {
      candidateMap[c.id] = c;
    });

    let totalCompleted = 0;
    let nationalServiceCount = 0;
    let orphanCount = 0;
    const allReports = [];

    resultRows.forEach((r) => {
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
      const hasPercentageScore =
        r.percentage_score !== null && r.percentage_score !== undefined && r.percentage_score !== '';
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
        report_data: r.report_data || {},
      });
    });

    const nsReports = allReports.filter((r) => r.is_national_service);
    const otherReports = allReports.filter((r) => !r.is_national_service);

    // ---- Build candidate rows with per-candidate stats ----
    const candidateRows = allCandidates.map((c) => {
      const candidateReports = allReports.filter((r) => r.candidate_id === c.id);
      return {
        ...c,
        completedAssessments: candidateReports,
        stats: {
          completed: candidateReports.filter((r) => r.completed_at).length,
          inProgress: 0,
          unblocked: 0,
          blocked: 0,
          notStarted: 0,
        },
      };
    });

    // ---- Return ----
    return res.status(200).json({
      success: true,
      stats: {
        totalCandidates: totalCandidates,
        completedAssessments: totalCompleted,
        pendingReviews: 0,
        nationalServiceReports: nationalServiceCount,
      },
      candidates: candidateRows,
      nationalServiceReports: nsReports,
      otherReports: otherReports,
      diagnostics: {
        supervisorId: caller.userId,
        supervisorName: null,
        candidateCount: totalCandidates,
        resultCount: resultRows.length,
        reportCount: allReports.length,
        orphanResultCount: orphanCount,
      },
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
        role: caller.role,
        candidateCount: totalCandidates,
        resultCount: resultRows.length,
      },
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
