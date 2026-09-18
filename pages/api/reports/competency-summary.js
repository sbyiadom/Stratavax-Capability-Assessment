// pages/api/reports/competency-summary.js
// Phase 6 — Competency Reports API
// Two modes:
//   GET /api/reports/competency-summary?resultId=<uuid>       → single candidate profile + cohort band
//   GET /api/reports/competency-summary?assessmentId=<uuid>   → per-assessment rollup (role-scoped)
//
// Source of truth: candidate_competency_scores. No client re-derivation.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// CLASSIFICATION ORDER (matches candidate_competency_scores CHECK)
// ============================================================
const CLASSIFICATION_ORDER = [
  'Exceptional',
  'Strong Performer',
  'Capable Contributor',
  'Developing',
  'At Risk',
  'High Risk',
];

// ============================================================
// DISCRIMINATION THRESHOLDS
// stddev in percentage points across the cohort for a competency.
// Below LOW → the competency is not separating candidates.
// ============================================================
const DISCRIMINATION = {
  LOW: 5,
  MODERATE: 10,
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stddev(values) {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function round1(value) {
  return Math.round(safeNumber(value, 0) * 10) / 10;
}

function classifyDiscrimination(sd) {
  if (sd < DISCRIMINATION.LOW) return 'low';
  if (sd < DISCRIMINATION.MODERATE) return 'moderate';
  return 'good';
}

// ============================================================
// AUTH + ROLE RESOLUTION
// ============================================================
async function resolveCaller(serviceClient, token) {
  const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return { error: 'Unauthorized: Invalid token', status: 401 };
  }

  const userId = userData.user.id;
  const metadataRole = userData.user.user_metadata?.role || null;

  const { data: profile, error: profileError } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    return { error: 'Unable to verify caller identity', status: 500 };
  }

  const resolvedRole = profile?.role || metadataRole || 'supervisor';

  if (profile?.is_active === false) {
    return { error: 'Account is inactive', status: 403 };
  }

  return {
    userId,
    role: resolvedRole,
    isAdmin: resolvedRole === 'admin',
    isSupervisor: resolvedRole === 'supervisor',
  };
}

// ============================================================
// SUPERVISOR SCOPE — which candidate_ids can this supervisor see?
// ============================================================
async function getSupervisorCandidateIds(serviceClient, supervisorId) {
  const { data, error } = await serviceClient
    .from('candidate_profiles')
    .select('id')
    .eq('supervisor_id', supervisorId);

  if (error) {
    console.error('[Competency Summary] Supervisor scope lookup failed:', error);
    return [];
  }

  return (data || []).map((row) => row.id);
}

// ============================================================
// MODE A — SINGLE RESULT: profile + cohort band
// ============================================================
async function handleSingleResult(serviceClient, caller, resultId) {
  // 1. Load the result to get candidate_id + assessment_id
  const { data: result, error: resultError } = await serviceClient
    .from('assessment_results')
    .select('id, user_id, assessment_id, completed_at')
    .eq('id', resultId)
    .maybeSingle();

  if (resultError) {
    console.error('[Competency Summary] Result lookup failed:', resultError);
    return { error: resultError.message, status: 500 };
  }

  if (!result) {
    return { error: 'Result not found', status: 404 };
  }

  // 2. Supervisor scope check
  if (!caller.isAdmin) {
    const allowed = await getSupervisorCandidateIds(serviceClient, caller.userId);
    if (!allowed.includes(result.user_id)) {
      return { error: 'You do not have permission to view this report', status: 403 };
    }
  }

  // 3. Candidate's competency rows
  const { data: candidateRows, error: candidateError } = await serviceClient
    .from('candidate_competency_scores')
    .select(`
      competency_id,
      raw_score,
      max_possible,
      percentage,
      classification,
      question_count
    `)
    .eq('candidate_id', result.user_id)
    .eq('assessment_id', result.assessment_id);

  if (candidateError) {
    console.error('[Competency Summary] Candidate competency lookup failed:', candidateError);
    return { error: candidateError.message, status: 500 };
  }

  if (!candidateRows || candidateRows.length === 0) {
    return {
      mode: 'single',
      hasCompetencies: false,
      candidateId: result.user_id,
      assessmentId: result.assessment_id,
      competencies: [],
      message: 'No competency scores are available for this assessment.',
    };
  }

  // 4. Competency metadata
  const competencyIds = candidateRows.map((r) => r.competency_id);
  const { data: competencyMeta, error: metaError } = await serviceClient
    .from('competencies')
    .select('id, name, category, display_order')
    .in('id', competencyIds);

  if (metaError) {
    console.error('[Competency Summary] Competency meta lookup failed:', metaError);
    return { error: metaError.message, status: 500 };
  }

  const metaMap = {};
  (competencyMeta || []).forEach((c) => { metaMap[c.id] = c; });

  // 5. Cohort — all rows for the same assessment_id (option a)
  const { data: cohortRows, error: cohortError } = await serviceClient
    .from('candidate_competency_scores')
    .select('competency_id, candidate_id, percentage')
    .eq('assessment_id', result.assessment_id);

  if (cohortError) {
    console.error('[Competency Summary] Cohort lookup failed:', cohortError);
    return { error: cohortError.message, status: 500 };
  }

  // 6. Build cohort distribution per competency
  const cohortByCompetency = {};
  (cohortRows || []).forEach((row) => {
    const key = row.competency_id;
    if (!cohortByCompetency[key]) cohortByCompetency[key] = [];
    cohortByCompetency[key].push(safeNumber(row.percentage, 0));
  });

  // 7. Assemble response
  const competencies = candidateRows.map((row) => {
    const meta = metaMap[row.competency_id] || { name: 'Unknown', category: null, display_order: 999 };
    const cohort = cohortByCompetency[row.competency_id] || [];
    const cohortMin = cohort.length > 0 ? Math.min(...cohort) : null;
    const cohortMax = cohort.length > 0 ? Math.max(...cohort) : null;
    const cohortMean = cohort.length > 0
      ? round1(cohort.reduce((a, b) => a + b, 0) / cohort.length)
      : null;
    const cohortSd = cohort.length >= 2 ? round1(stddev(cohort)) : null;

    return {
      competencyId: row.competency_id,
      name: meta.name,
      category: meta.category,
      displayOrder: meta.display_order ?? 999,
      rawScore: safeNumber(row.raw_score, 0),
      maxPossible: safeNumber(row.max_possible, 0),
      percentage: round1(row.percentage),
      classification: row.classification || null,
      questionCount: safeNumber(row.question_count, 0),
      cohort: {
        n: cohort.length,
        min: cohortMin !== null ? round1(cohortMin) : null,
        max: cohortMax !== null ? round1(cohortMax) : null,
        mean: cohortMean,
        stddev: cohortSd,
        discrimination: cohortSd !== null ? classifyDiscrimination(cohortSd) : null,
      },
    };
  });

  // Sort by display_order, then name
  competencies.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.name.localeCompare(b.name);
  });

  return {
    mode: 'single',
    hasCompetencies: true,
    candidateId: result.user_id,
    assessmentId: result.assessment_id,
    completedAt: result.completed_at,
    competencies,
  };
}

// ============================================================
// MODE B — ASSESSMENT ROLLUP (role-scoped)
// ============================================================
async function handleAssessmentRollup(serviceClient, caller, assessmentId) {
  // 1. Assessment meta
  const { data: assessment, error: assessmentError } = await serviceClient
    .from('assessments')
    .select('id, title, assessment_type_id')
    .eq('id', assessmentId)
    .maybeSingle();

  if (assessmentError) {
    console.error('[Competency Summary] Assessment lookup failed:', assessmentError);
    return { error: assessmentError.message, status: 500 };
  }

  if (!assessment) {
    return { error: 'Assessment not found', status: 404 };
  }

  // 2. Build the row query, applying supervisor scope if needed
  let allowedCandidateIds = null;
  if (!caller.isAdmin) {
    allowedCandidateIds = await getSupervisorCandidateIds(serviceClient, caller.userId);
    if (allowedCandidateIds.length === 0) {
      return {
        mode: 'rollup',
        assessmentId,
        assessmentTitle: assessment.title,
        candidateCount: 0,
        competencies: [],
        message: 'No candidates are assigned to you for this assessment.',
      };
    }
  }

  let rowsQuery = serviceClient
    .from('candidate_competency_scores')
    .select('competency_id, candidate_id, percentage, classification')
    .eq('assessment_id', assessmentId);

  if (allowedCandidateIds) {
    rowsQuery = rowsQuery.in('candidate_id', allowedCandidateIds);
  }

  const { data: rows, error: rowsError } = await rowsQuery;

  if (rowsError) {
    console.error('[Competency Summary] Rollup rows lookup failed:', rowsError);
    return { error: rowsError.message, status: 500 };
  }

  if (!rows || rows.length === 0) {
    return {
      mode: 'rollup',
      assessmentId,
      assessmentTitle: assessment.title,
      candidateCount: 0,
      competencies: [],
      message: 'No competency scores are available for this assessment yet.',
    };
  }

  // 3. Competency metadata
  const competencyIds = [...new Set(rows.map((r) => r.competency_id))];
  const { data: competencyMeta, error: metaError } = await serviceClient
    .from('competencies')
    .select('id, name, category, display_order')
    .in('id', competencyIds);

  if (metaError) {
    console.error('[Competency Summary] Rollup competency meta failed:', metaError);
    return { error: metaError.message, status: 500 };
  }

  const metaMap = {};
  (competencyMeta || []).forEach((c) => { metaMap[c.id] = c; });

  // 4. Group rows by competency
  const byCompetency = {};
  const distinctCandidates = new Set();

  rows.forEach((row) => {
    const key = row.competency_id;
    if (!byCompetency[key]) byCompetency[key] = [];
    byCompetency[key].push(row);
    distinctCandidates.add(row.candidate_id);
  });

  // 5. Build rollup
  const competencies = Object.keys(byCompetency).map((competencyId) => {
    const group = byCompetency[competencyId];
    const meta = metaMap[competencyId] || { name: 'Unknown', category: null, display_order: 999 };

    const percentages = group.map((r) => safeNumber(r.percentage, 0));
    const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const sd = stddev(percentages);

    const classificationCounts = {};
    CLASSIFICATION_ORDER.forEach((c) => { classificationCounts[c] = 0; });
    group.forEach((r) => {
      if (r.classification && classificationCounts[r.classification] !== undefined) {
        classificationCounts[r.classification] += 1;
      }
    });

    return {
      competencyId,
      name: meta.name,
      category: meta.category,
      displayOrder: meta.display_order ?? 999,
      n: group.length,
      mean: round1(mean),
      median: round1(median(percentages)),
      min: round1(Math.min(...percentages)),
      max: round1(Math.max(...percentages)),
      stddev: round1(sd),
      discrimination: classifyDiscrimination(sd),
      classificationCounts,
    };
  });

  competencies.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.name.localeCompare(b.name);
  });

  return {
    mode: 'rollup',
    assessmentId,
    assessmentTitle: assessment.title,
    candidateCount: distinctCandidates.size,
    competencies,
  };
}

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Competency Summary] Missing Supabase credentials');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Auth
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const caller = await resolveCaller(serviceClient, token);
    if (caller.error) {
      return res.status(caller.status || 401).json({ success: false, error: caller.error });
    }

    // Route to mode
    const { resultId, assessmentId } = req.query || {};

    if (resultId) {
      const cleanResultId = String(resultId).trim();
      if (!cleanResultId) {
        return res.status(400).json({ success: false, error: 'Invalid resultId' });
      }

      const payload = await handleSingleResult(serviceClient, caller, cleanResultId);
      if (payload.error) {
        return res.status(payload.status || 500).json({ success: false, error: payload.error });
      }
      return res.status(200).json({ success: true, ...payload });
    }

    if (assessmentId) {
      const cleanAssessmentId = String(assessmentId).trim();
      if (!cleanAssessmentId) {
        return res.status(400).json({ success: false, error: 'Invalid assessmentId' });
      }

      const payload = await handleAssessmentRollup(serviceClient, caller, cleanAssessmentId);
      if (payload.error) {
        return res.status(payload.status || 500).json({ success: false, error: payload.error });
      }
      return res.status(200).json({ success: true, ...payload });
    }

    return res.status(400).json({
      success: false,
      error: 'Provide either ?resultId=<uuid> or ?assessmentId=<uuid>',
    });
  } catch (error) {
    console.error('[Competency Summary] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
