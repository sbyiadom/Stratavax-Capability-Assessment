// pages/api/assessment-report/[resultId].js
// FINAL PRODUCTION CLEAN VERSION — with Phase 6 competency summary embedded.
//
// Phase 6 addition:
//   - Fetches candidate_competency_scores for (user_id, assessment_id)
//   - Fetches cohort stats per competency across all candidates on the same assessment
//   - Returns `competencySummary` in the response envelope, matching the
//     exact shape produced by /api/reports/competency-summary?resultId=...
//   - Fails soft: competency errors never break the existing report.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// 🟢 HELPERS: REPORT DATA & CATEGORY NORMALIZATION
// ============================================================
function getReportData(result) {
  const raw = result?.report_data;
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.error('[Assessment Report] Failed to parse report_data:', error);
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
    reportData?.categoryScores ||
    reportData?.categoryBreakdown ||
    [];

  if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
    return Object.entries(rawCategories).map(([category, data]) => ({
      category: category,
      name: category,
      percentage: Math.round(Number(data?.percentage || data?.score || 0)),
      score: Number(data?.score || data?.earned || 0),
      maxScore: Number(data?.maxScore || data?.maxPossible || data?.total || data?.max || 100)
    }));
  }

  if (Array.isArray(rawCategories)) {
    return rawCategories.map((cat) => ({
      category: cat.category || cat.name || '',
      name: cat.name || cat.category || '',
      percentage: Math.round(Number(cat.percentage || cat.score || 0)),
      score: Number(cat.score || cat.earned || 0),
      maxScore: Number(cat.maxScore || cat.maxPossible || cat.total || cat.max || 100)
    }));
  }

  return [];
}

// ============================================================
// 🟢 PHASE 6 — COMPETENCY SUMMARY HELPERS
// ============================================================
const CLASSIFICATION_ORDER = [
  'Exceptional',
  'Strong Performer',
  'Capable Contributor',
  'Developing',
  'At Risk',
  'High Risk',
];

const DISCRIMINATION_THRESHOLDS = {
  LOW: 5,
  MODERATE: 10,
};

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round1(value) {
  return Math.round(safeNum(value, 0) * 10) / 10;
}

function computeStddev(values) {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function classifyDiscrimination(sd) {
  if (sd < DISCRIMINATION_THRESHOLDS.LOW) return 'low';
  if (sd < DISCRIMINATION_THRESHOLDS.MODERATE) return 'moderate';
  return 'good';
}

/**
 * Build the competencySummary payload for a single candidate's attempt.
 * Matches the shape returned by /api/reports/competency-summary?resultId=...
 * Returns null on any hard failure so the caller can degrade gracefully.
 */
async function buildCompetencySummary(serviceClient, candidateId, assessmentId) {
  try {
    // 1. Candidate's competency rows for this assessment
    const { data: candidateRows, error: candidateError } = await serviceClient
      .from('candidate_competency_scores')
      .select('competency_id, raw_score, max_possible, percentage, classification, question_count')
      .eq('candidate_id', candidateId)
      .eq('assessment_id', assessmentId);

    if (candidateError) {
      console.error('[Assessment Report] Competency candidate lookup failed:', {
        message: candidateError.message,
        code: candidateError.code,
        details: candidateError.details,
        candidateId,
        assessmentId,
      });
      return null;
    }

    if (!candidateRows || candidateRows.length === 0) {
      return {
        mode: 'single',
        hasCompetencies: false,
        candidateId,
        assessmentId,
        competencies: [],
        message: 'No competency scores are available for this assessment.',
      };
    }

    // 2. Competency metadata
    const competencyIds = candidateRows.map((r) => r.competency_id);
    const { data: competencyMeta, error: metaError } = await serviceClient
      .from('competencies')
      .select('id, name, category, display_order')
      .in('id', competencyIds);

    if (metaError) {
      console.error('[Assessment Report] Competency meta lookup failed:', {
        message: metaError.message,
        code: metaError.code,
        details: metaError.details,
      });
      return null;
    }

    const metaMap = {};
    (competencyMeta || []).forEach((c) => { metaMap[c.id] = c; });

    // 3. Cohort rows for the same assessment — used for band stats
    const { data: cohortRows, error: cohortError } = await serviceClient
      .from('candidate_competency_scores')
      .select('competency_id, candidate_id, percentage')
      .eq('assessment_id', assessmentId);

    if (cohortError) {
      console.error('[Assessment Report] Competency cohort lookup failed:', {
        message: cohortError.message,
        code: cohortError.code,
        details: cohortError.details,
        assessmentId,
      });
      // Cohort failure is not fatal — fall through with no cohort data
    }

    const cohortByCompetency = {};
    (cohortRows || []).forEach((row) => {
      const key = row.competency_id;
      if (!cohortByCompetency[key]) cohortByCompetency[key] = [];
      cohortByCompetency[key].push(safeNum(row.percentage, 0));
    });

    // 4. Build the per-competency entries
    const competencies = candidateRows.map((row) => {
      const meta = metaMap[row.competency_id] || {
        name: 'Unknown',
        category: null,
        display_order: 999,
      };
      const cohort = cohortByCompetency[row.competency_id] || [];
      const cohortMin = cohort.length > 0 ? Math.min(...cohort) : null;
      const cohortMax = cohort.length > 0 ? Math.max(...cohort) : null;
      const cohortMean = cohort.length > 0
        ? round1(cohort.reduce((a, b) => a + b, 0) / cohort.length)
        : null;
      const cohortSd = cohort.length >= 2 ? round1(computeStddev(cohort)) : null;

      return {
        competencyId: row.competency_id,
        name: meta.name,
        category: meta.category,
        displayOrder: meta.display_order ?? 999,
        rawScore: safeNum(row.raw_score, 0),
        maxPossible: safeNum(row.max_possible, 0),
        percentage: round1(row.percentage),
        classification: row.classification || null,
        questionCount: safeNum(row.question_count, 0),
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

    competencies.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return a.name.localeCompare(b.name);
    });

    return {
      mode: 'single',
      hasCompetencies: true,
      candidateId,
      assessmentId,
      competencies,
    };
  } catch (error) {
    console.error('[Assessment Report] buildCompetencySummary threw:', error);
    return null;
  }
}

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { resultId } = req.query;
    const cleanResultId = String(resultId || '').trim();

    if (!cleanResultId) {
      return res.status(400).json({ success: false, error: 'Missing resultId' });
    }

    // ============================================================
    // ENFORCE SERVICE ROLE KEY
    // ============================================================
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Assessment Report] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: missing Supabase service role key'
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // ============================================================
    // AUTHENTICATION
    // ============================================================
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error('[Assessment Report] Auth error:', authError);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // ============================================================
    // DIRECT RESULT LOOKUP (NO EMBEDDED JOINS)
    // ============================================================
    const { data: result, error: resultError } = await serviceClient
      .from('assessment_results')
      .select('*')
      .eq('id', cleanResultId)
      .maybeSingle();

    if (resultError) {
      console.error('[Assessment Report] Result query error:', resultError);
      return res.status(500).json({
        success: false,
        error: resultError.message || 'Failed to fetch result',
        debug: { stage: 'fetch_result', error: resultError }
      });
    }

    if (!result) {
      console.error('[Assessment Report] Result not found:', { resultId: cleanResultId });
      return res.status(404).json({
        success: false,
        error: 'Result not found',
        debug: {
          searchedTable: 'assessment_results',
          searchedColumn: 'id',
          resultId: cleanResultId
        }
      });
    }

    // ============================================================
    // SIMPLIFIED CANDIDATE PROFILE LOOKUP (ID ONLY)
    // ============================================================
    let candidateProfile = null;
    const candidateSelect = 'id, full_name, email, university, programme, graduation_year, preferred_department';

    if (result.user_id) {
      const { data: profileById, error: profileByIdError } = await serviceClient
        .from('candidate_profiles')
        .select(candidateSelect)
        .eq('id', result.user_id)
        .maybeSingle();

      if (profileByIdError) {
        console.error('[Assessment Report] Candidate lookup error:', profileByIdError);
      }

      if (profileById) {
        candidateProfile = profileById;
        console.log('[Assessment Report] Found candidate via candidate_profiles.id match.');
      }
    }

    // ============================================================
    // SEPARATE ASSESSMENT AND TYPE LOOKUP
    // ============================================================
    let assessment = null;
    let assessmentType = null;

    if (result.assessment_id) {
      const { data: assessmentRow } = await serviceClient
        .from('assessments')
        .select('id, title, assessment_type_id')
        .eq('id', result.assessment_id)
        .maybeSingle();

      if (assessmentRow) {
        assessment = assessmentRow;

        if (assessmentRow.assessment_type_id) {
          const { data: typeRow } = await serviceClient
            .from('assessment_types')
            .select('id, code, name')
            .eq('id', assessmentRow.assessment_type_id)
            .maybeSingle();

          if (typeRow) {
            assessmentType = typeRow;
          }
        }
      }
    }

    // ============================================================
    // BROADEN NATIONAL SERVICE DETECTION
    // ============================================================
    const assessmentTitle = String(assessment?.title || '').toLowerCase().trim();
    const assessmentCode = String(assessmentType?.code || '').toLowerCase().trim();
    const assessmentTypeName = String(assessmentType?.name || '').toLowerCase().trim();

    const isNationalService =
      result.assessment_id === 'bdb9d46e-9fac-4d00-8478-1f649e7ac600' ||
      assessmentCode.includes('national') ||
      assessmentTypeName.includes('national service') ||
      assessmentTitle.includes('national service') ||
      assessmentTitle.includes('nationalservice') ||
      assessmentTitle.includes('service recruitment');

    // ============================================================
    // NORMALIZE CATEGORIES & BUILD COMPLETE REPORT
    // ============================================================
    const reportData = getReportData(result);
    const categoryScores = normalizeCategoryScores(result);

    let workplaceSubCategories = [];
    let intellectualSubCategories = [];

    // Split categories if it's a National Service report
    if (isNationalService && Array.isArray(categoryScores)) {
      const workplaceKeywords = ['Safety', 'Technical', 'Communication', 'Teamwork', 'Ownership', 'Integrity', 'Professional', 'Work Ethic', 'Workplace'];
      const intellectualKeywords = ['Learning', 'Problem Solving', 'Troubleshooting', 'Logical', 'Numerical', 'Measurement', 'Engineering', 'Critical', 'Analytical'];

      categoryScores.forEach(cat => {
        const name = cat.category || '';
        const isWorkplace = workplaceKeywords.some(k => name.includes(k));
        const isIntellectual = intellectualKeywords.some(k => name.includes(k));

        if (isWorkplace) workplaceSubCategories.push(cat);
        else if (isIntellectual) intellectualSubCategories.push(cat);
        else intellectualSubCategories.push(cat); // Default fallback
      });
    }

    // Calculate Scores
    const workplaceReadiness = Number(
      reportData?.dimensions?.workplaceReadiness ??
      reportData?.scores?.workplace ??
      result.workplace_readiness ??
      0
    );

    const intellectualCapability = Number(
      reportData?.dimensions?.intellectualCapability ??
      reportData?.scores?.intellectual ??
      result.intellectual_capability ??
      0
    );

    let overallScore = Number(
      reportData?.dimensions?.overallScore ??
      reportData?.scores?.overall ??
      reportData?.overallScore ??
      result.percentage_score ??
      0
    );

    // If overallScore is 0, calculate from categoryScores
    if (overallScore === 0 && categoryScores.length > 0) {
      const validScores = categoryScores
        .map((cat) => Number(cat.percentage || 0))
        .filter((score) => score > 0);

      if (validScores.length > 0) {
        overallScore = Math.round(
          validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        );
      }
    }

    // If still 0, calculate from Workplace/Intellectual average (for NS)
    if (overallScore === 0 && (workplaceReadiness > 0 || intellectualCapability > 0)) {
      overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
    }

    // Candidate Info for the report
    const candidateInfo = {
      fullName: candidateProfile?.full_name || 'Candidate',
      email: candidateProfile?.email || '',
      university: candidateProfile?.university || '',
      programme: candidateProfile?.programme || '',
      graduationYear: candidateProfile?.graduation_year || '',
      preferredDepartment: candidateProfile?.preferred_department || '',
      assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
    };

    // BUILD THE FINAL REPORT OBJECT
    const finalReport = isNationalService
      ? {
          ...reportData,
          reportType: 'national_service',
          candidateInfo,
          dimensions: {
            workplaceReadiness,
            intellectualCapability,
            overallScore
          },
          scores: {
            workplace: workplaceReadiness,
            intellectual: intellectualCapability,
            overall: overallScore
          },
          recommendation: {
            level: result.recommendation || reportData?.recommendation?.level || 'N/A'
          },
          statistics: {
            totalQuestions: result.total_questions || result.max_score || 0,
            totalAnswered: result.answered_questions || result.max_score || 0
          },
          category_scores: categoryScores,
          categoryScores: categoryScores,
          categoryBreakdown: categoryScores,
          workplaceSubCategories,
          intellectualSubCategories,
          suggestedPlacement: reportData?.suggestedPlacement || [],
          assessmentName: assessment?.title || 'National Service Assessment'
        }
      : {
          ...reportData,
          reportType: 'stratavax',
          candidateInfo,
          assessmentName: assessment?.title || 'Assessment',
          assessmentType: assessmentType?.code || 'general',
          overallScore,
          percentage_score: overallScore,
          score: overallScore,
          categoryScores,
          category_scores: categoryScores,
          classification: result.classification || reportData.classification || 'Standard Profile',
          riskLevel: result.risk_level || reportData.riskLevel || 'Low',
          total_questions: result.total_questions || result.max_score || 0,
          answered_questions: result.answered_questions || result.max_score || 0,
          executiveSummary: result.executive_summary || reportData.executiveSummary || '',
          supervisorImplication: result.supervisor_implication || reportData.supervisorImplication || ''
        };

    // ============================================================
    // 🟢 PHASE 6 — COMPETENCY SUMMARY (fails soft)
    // ============================================================
    let competencySummary = null;
    if (result.user_id && result.assessment_id && !isNationalService) {
      competencySummary = await buildCompetencySummary(
        serviceClient,
        result.user_id,
        result.assessment_id
      );
    }

    // ============================================================
    // RETURN COMPLETE RESPONSE
    // ============================================================
    return res.status(200).json({
      success: true,
      candidate: candidateProfile,
      result: {
        ...result,
        candidate_profiles: candidateProfile,
        assessments: assessment,
        assessment_types: assessmentType,
        workplaceSubCategories,
        intellectualSubCategories,
        categoryScores,
        category_scores: categoryScores,
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        percentage_score: overallScore,
        overallScore: overallScore,
        score: overallScore
      },
      report: finalReport,
      isNationalService,
      assessmentTypeCode: assessmentType?.code || 'general',
      categoryScores,
      competencySummary
    });

  } catch (error) {
    console.error('[Assessment Report] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
