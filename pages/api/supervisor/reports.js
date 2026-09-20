// pages/api/supervisor/reports.js
// Phase 7B — server-side reports payload for the supervisor reports pages.
//
// ROOT CAUSE OF PREVIOUS FAILURE:
//   This endpoint used the anon client + the caller's bearer token, so all reads
//   were subject to RLS. Phase 7 enabled RLS on every table with a default-deny
//   policy set, so SELECTs returned 0 rows silently for every supervisor. The
//   Vercel logs showed:
//     [Supervisor Reports] Found candidates by legacy fields: 0
//     [Supervisor Reports] Total assigned candidates: 0
//
// FIX:
//   Switch to utils/apiAuth.js (service role) and enforce scoping in code via
//   the get_scoped_candidate_ids RPC, exactly like the other supervisor
//   endpoints. RLS remains enabled as defense-in-depth on the DB; this
//   endpoint bypasses it deliberately for the service role.
//
// SCOPING MODEL:
//   • admin      → all candidates
//   • supervisor → union of primary (candidate_profiles.supervisor_id)
//                  and junction (candidate_supervisors.supervisor_id) links
//   • shared_report_access is currently EMPTY (verified 2026-09-20),
//     so the shared-access path is intentionally omitted. If the feature
//     becomes active, add a union branch here — do NOT expose it elsewhere.
//
// RESPONSE SHAPE (preserved from Phase 7A so pages/supervisor/reports/index.js
// and pages/supervisor/reports/[resultId].js consume it unchanged):
//   List mode:
//     { success, reports[], nationalServiceReports[], otherReports[],
//       candidates[], stats: { total, completed, inProgress } }
//   Single-result mode (when ?assessment_id= is passed and 1 result matches):
//     { success, result, candidate, assessment, generatedReport, reports[],
//       candidates[], stats }
//
// PER-CANDIDATE FIELDS (unchanged):
//   result_id, candidate_id, candidate_name, candidate_email, university,
//   programme, assessment_id, assessment_title, assessment_code, score,
//   percentage_score, workplace_readiness, intellectual_capability,
//   recommendation, is_national_service, is_completed, is_auto_submitted,
//   completed_at, category_scores, report_data, _result

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Supervisor Reports]';
const CHUNK_SIZE = 100;

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

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
      console.error(`${LOG_TAG} Failed to parse report_data:`, error);
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
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ---- Auth: bearer token + role check + active-account check ----
  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;
  const { user_id, assessment_id } = req.query;

  try {
    // ---- Scoping via RPC (bypasses RLS; enforces primary + junction union) ----
    const { data: scopedRows, error: scopedError } = await serviceClient.rpc(
      'get_scoped_candidate_ids',
      { p_caller: caller.userId, p_is_admin: caller.isAdmin }
    );

    if (scopedError) {
      logError('rpc get_scoped_candidate_ids', scopedError, {
        role: caller.role,
        userId: caller.userId,
      });
      return res.status(500).json({ success: false, error: 'Failed to load candidates' });
    }

    const scopedIds = Array.isArray(scopedRows)
      ? scopedRows
          .map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids))
          .filter(Boolean)
      : [];

    if (scopedIds.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        nationalServiceReports: [],
        otherReports: [],
        candidates: [],
        stats: { total: 0, completed: 0, inProgress: 0 },
        scope: { type: caller.isAdmin ? 'admin' : 'supervisor', role: caller.role, candidateCount: 0 },
        message: 'No candidates assigned to this supervisor',
      });
    }

    // ---- Hydrate candidate_profiles, chunked ----
    const candidatesById = new Map();

    for (const slice of chunk(scopedIds, CHUNK_SIZE)) {
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
        return res.status(500).json({ success: false, error: 'Failed to load candidates' });
      }

      (rows || []).forEach((row) => {
        if (row?.id) candidatesById.set(row.id, row);
      });
    }

    let targetCandidates = Array.from(candidatesById.values());

    // ---- Optional: filter to a single candidate, with an access check ----
    // The original endpoint returned 404 if user_id was provided but the
    // candidate was not in the caller's scope. We preserve that, but now
    // the scope check is enforced against the RPC-derived set — no RLS
    // lookup needed.
    if (user_id) {
      const requested = candidatesById.get(user_id);
      if (!requested) {
        return res.status(404).json({ success: false, error: 'Candidate not found' });
      }
      targetCandidates = [requested];
    }

    if (targetCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        nationalServiceReports: [],
        otherReports: [],
        candidates: [],
        stats: { total: 0, completed: 0, inProgress: 0 },
        scope: { type: caller.isAdmin ? 'admin' : 'supervisor', role: caller.role, candidateCount: 0 },
        message: 'No candidates assigned to this supervisor',
      });
    }

    const candidateIds = targetCandidates.map((c) => c.id);

    // ---- Fetch assessment_results with embedded join, chunked ----
    // Note: the embedded join 'assessments:assessment_id' relies on the FK
    // from assessment_results.assessment_id → assessments.id. That FK exists
    // (this select worked under RLS before; it will work under service role).
    const allResults = [];

    for (const slice of chunk(candidateIds, CHUNK_SIZE)) {
      let query = serviceClient
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
        .in('user_id', slice)
        .order('completed_at', { ascending: false });

      if (assessment_id) {
        query = query.eq('assessment_id', assessment_id);
      }

      const { data: rows, error: resultsError } = await query;

      if (resultsError) {
        logError('assessment_results chunk', resultsError, {
          chunkSize: slice.length,
          totalCandidates: candidateIds.length,
          assessmentFilter: assessment_id || null,
        });
        // Preserve the original behavior: a results-fetch failure is a 500.
        return res.status(500).json({ success: false, error: resultsError.message });
      }

      if (Array.isArray(rows)) allResults.push(...rows);
    }

    // ---- Process results into report rows ----
    const targetCandidatesById = new Map(targetCandidates.map((c) => [c.id, c]));

    const reports = allResults.map((result) => {
      const assessment = result.assessments || {};
      const typeArray = assessment.assessment_types || assessment.assessment_type || [];
      const type = Array.isArray(typeArray) && typeArray.length > 0 ? typeArray[0] : {};

      const assessmentTitle = String(assessment?.title || '').toLowerCase().trim();
      const assessmentCode = String(type?.code || '').toLowerCase().trim();
      const assessmentTypeName = String(type?.name || '').toLowerCase().trim();

      const isNationalService =
        assessment?.id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessmentCode.includes('national') ||
        assessmentTypeName.includes('national service') ||
        assessmentTitle.includes('national service') ||
        assessmentTitle.includes('nationalservice') ||
        assessmentTitle.includes('service recruitment');

      const candidate = targetCandidatesById.get(result.user_id) || {};

      let overallScore = safeNumber(result.percentage_score);
      if (isNationalService) {
        overallScore = getNationalServiceOverallScore(result);
      }

      const workplaceReadiness = safeNumber(result.workplace_readiness || 0);
      const intellectualCapability = safeNumber(result.intellectual_capability || 0);
      const recommendation = calculateRecommendation(
        workplaceReadiness,
        intellectualCapability,
        overallScore
      );
      const isCompleted =
        !!result.completed_at ||
        (result.percentage_score !== null && result.percentage_score !== undefined);

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
        recommendation,
        is_national_service: isNationalService,
        is_completed: isCompleted,
        is_auto_submitted: result.is_auto_submitted || false,
        completed_at: result.completed_at,
        category_scores: result.category_scores || [],
        report_data: result.report_data || {},
        _result: result,
      };
    });

    // ---- Single-result mode (preserved from original) ----
    if (assessment_id && reports.length === 1) {
      const report = reports[0];
      const candidate = targetCandidatesById.get(report.candidate_id) || {};
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
        reports,
        candidates: targetCandidates,
        stats: {
          total: reports.length,
          completed: reports.filter((r) => r.is_completed).length,
          inProgress: reports.filter((r) => !r.is_completed && r._result?.session_id).length,
        },
        scope: {
          type: caller.isAdmin ? 'admin' : 'supervisor',
          role: caller.role,
          candidateCount: targetCandidates.length,
          resultCount: reports.length,
        },
      });
    }

    // ---- List mode (preserved from original) ----
    const nationalServiceReports = reports.filter((r) => r.is_national_service === true);
    const otherReports = reports.filter((r) => r.is_national_service === false);

    return res.status(200).json({
      success: true,
      reports,
      nationalServiceReports,
      otherReports,
      candidates: targetCandidates,
      stats: {
        total: reports.length,
        completed: reports.filter((r) => r.is_completed).length,
        inProgress: reports.filter((r) => !r.is_completed && r._result?.session_id).length,
      },
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
        role: caller.role,
        candidateCount: targetCandidates.length,
        resultCount: reports.length,
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
