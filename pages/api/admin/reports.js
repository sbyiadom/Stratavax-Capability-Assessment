// pages/api/admin/reports.js - COMPLETE CORRECTED VERSION
// Fixes National Service overall score mismatch between report list and report detail

import { createClient } from '@supabase/supabase-js';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// HELPER: SAFE NUMBER
// ============================================================
function safeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

// ============================================================
// HELPER: ROUND SCORE
// ============================================================
function roundScore(value) {
  const numberValue = safeNumber(value, 0);
  return Math.round(numberValue);
}

// ============================================================
// FIXED: RECOMMENDATION LOGIC
// Uses the final overall score displayed on the report
// ============================================================
function getRecommendation(workplaceReadiness, intellectualCapability, overallScore) {
  const overall = safeNumber(overallScore, 0);

  if (overall >= 85) {
    return 'Highly Recommended';
  }

  if (overall >= 70) {
    return 'Recommended';
  }

  if (overall >= 50) {
    return 'Reserve Pool';
  }

  return 'Not Recommended';
}

// ============================================================
// CRITICAL FIX:
// Extract the correct overall score for National Service reports.
// The report list must use the same score used by the report detail.
// ============================================================
function getNationalServiceOverallScore(result) {
  const reportData = result?.report_data || {};

  // 1. Preferred source: report_data.dimensions.overallScore
  if (
    reportData?.dimensions &&
    reportData.dimensions.overallScore !== undefined &&
    reportData.dimensions.overallScore !== null
  ) {
    return roundScore(reportData.dimensions.overallScore);
  }

  // 2. Compatibility source: report_data.scores.overall
  if (
    reportData?.scores &&
    reportData.scores.overall !== undefined &&
    reportData.scores.overall !== null
  ) {
    return roundScore(reportData.scores.overall);
  }

  // 3. Compatibility source: report_data.overallScore
  if (
    reportData.overallScore !== undefined &&
    reportData.overallScore !== null
  ) {
    return roundScore(reportData.overallScore);
  }

  // 4. Fallback to database percentage_score
  return roundScore(result?.percentage_score);
}

// ============================================================
// HELPER: Extract Workplace Readiness
// ============================================================
function getWorkplaceReadiness(result) {
  const reportData = result?.report_data || {};

  if (
    reportData?.dimensions &&
    reportData.dimensions.workplaceReadiness !== undefined &&
    reportData.dimensions.workplaceReadiness !== null
  ) {
    return roundScore(reportData.dimensions.workplaceReadiness);
  }

  if (
    reportData?.scores &&
    reportData.scores.workplace !== undefined &&
    reportData.scores.workplace !== null
  ) {
    return roundScore(reportData.scores.workplace);
  }

  return roundScore(result?.workplace_readiness);
}

// ============================================================
// HELPER: Extract Intellectual Capability
// ============================================================
function getIntellectualCapability(result) {
  const reportData = result?.report_data || {};

  if (
    reportData?.dimensions &&
    reportData.dimensions.intellectualCapability !== undefined &&
    reportData.dimensions.intellectualCapability !== null
  ) {
    return roundScore(reportData.dimensions.intellectualCapability);
  }

  if (
    reportData?.scores &&
    reportData.scores.intellectual !== undefined &&
    reportData.scores.intellectual !== null
  ) {
    return roundScore(reportData.scores.intellectual);
  }

  return roundScore(result?.intellectual_capability);
}

// ============================================================
// HELPER: Extract Category Scores
// ============================================================
function getCategoryScores(result) {
  const reportData = result?.report_data || {};

  if (
    result?.category_scores &&
    Array.isArray(result.category_scores) &&
    result.category_scores.length > 0
  ) {
    return result.category_scores;
  }

  if (
    reportData?.categoryBreakdown &&
    Array.isArray(reportData.categoryBreakdown) &&
    reportData.categoryBreakdown.length > 0
  ) {
    return reportData.categoryBreakdown;
  }

  if (
    reportData?.category_scores &&
    Array.isArray(reportData.category_scores) &&
    reportData.category_scores.length > 0
  ) {
    return reportData.category_scores;
  }

  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false
      }
    });

    // ============================================================
    // STEP 1: Get all assessment results
    // ============================================================
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (resultsError) {
      console.error('[Admin Reports API] Results error:', resultsError);

      return res.status(500).json({
        success: false,
        error: `Failed to load results: ${resultsError.message}`
      });
    }

    if (!results || results.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        stats: {
          total: 0,
          nationalService: 0,
          stratavax: 0
        }
      });
    }

    // ============================================================
    // STEP 2: Get all candidate profiles
    // ============================================================
    const userIds = [...new Set(results.map(r => r.user_id).filter(Boolean))];

    let candidateMap = {};

    if (userIds.length > 0) {
      const { data: candidates, error: candidatesError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, preferred_department, graduation_year')
        .in('id', userIds);

      if (candidatesError) {
        console.error('[Admin Reports API] Candidate profile error:', candidatesError);
      }

      if (!candidatesError && candidates) {
        candidates.forEach(candidate => {
          candidateMap[candidate.id] = candidate;
        });

        console.log(`[Admin Reports API] Loaded ${candidates.length} candidate profiles`);
      }
    }

    // ============================================================
    // STEP 3: Get all assessment details
    // ============================================================
    const assessmentIds = [...new Set(results.map(r => r.assessment_id).filter(Boolean))];

    let assessmentMap = {};

    if (assessmentIds.length > 0) {
      const { data: assessments, error: assessmentsError } = await serviceClient
        .from('assessments')
        .select('id, title, assessment_type_id')
        .in('id', assessmentIds);

      if (assessmentsError) {
        console.error('[Admin Reports API] Assessment error:', assessmentsError);
      }

      if (!assessmentsError && assessments) {
        assessments.forEach(assessment => {
          assessmentMap[assessment.id] = assessment;
        });
      }
    }

    // ============================================================
    // STEP 4: Get assessment types
    // ============================================================
    const typeIds = [
      ...new Set(
        Object.values(assessmentMap)
          .map(assessment => assessment.assessment_type_id)
          .filter(Boolean)
      )
    ];

    let typeMap = {};

    if (typeIds.length > 0) {
      const { data: types, error: typesError } = await serviceClient
        .from('assessment_types')
        .select('id, code, name')
        .in('id', typeIds);

      if (typesError) {
        console.error('[Admin Reports API] Assessment type error:', typesError);
      }

      if (!typesError && types) {
        types.forEach(type => {
          typeMap[type.id] = type;
        });
      }
    }

    // ============================================================
    // STEP 5: Build enriched reports
    // ============================================================
    const enrichedReports = results.map(result => {
      const profile = candidateMap[result.user_id] || {};
      const assessment = assessmentMap[result.assessment_id] || {};
      const assessmentType = assessment?.assessment_type_id
        ? typeMap[assessment.assessment_type_id]
        : null;

      const isNationalService =
        result.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessmentType?.code === 'national_service' ||
        assessment?.title === 'National Service Recruitment Assessment';

      // ============================================================
      // CRITICAL SCORE FIX
      // For National Service, use report_data score first.
      // This keeps the list page and detail page consistent.
      // ============================================================
      let workplaceReadiness = 0;
      let intellectualCapability = 0;
      let overallScore = 0;

      if (isNationalService) {
        workplaceReadiness = getWorkplaceReadiness(result);
        intellectualCapability = getIntellectualCapability(result);
        overallScore = getNationalServiceOverallScore(result);
      } else {
        workplaceReadiness = roundScore(result.workplace_readiness);
        intellectualCapability = roundScore(result.intellectual_capability);
        overallScore = roundScore(result.percentage_score);
      }

      const categoryScores = getCategoryScores(result);

      // ============================================================
      // Recommendation should be based on the same corrected score
      // ============================================================
      let recommendation = result.recommendation || null;

      if (!recommendation || recommendation === 'N/A' || recommendation === '') {
        recommendation = getRecommendation(
          workplaceReadiness,
          intellectualCapability,
          overallScore
        );
      }

      return {
        id: result.id,
        user_id: result.user_id,
        assessment_id: result.assessment_id,

        // Candidate info
        candidate_name: profile?.full_name || 'Unknown',
        candidate_email: profile?.email || '',
        university: profile?.university || '',
        programme: profile?.programme || '',
        graduation_year: profile?.graduation_year || '',
        preferred_department: profile?.preferred_department || '',

        // Assessment info
        assessment_title: assessment?.title || 'Unknown',
        assessment_type_code: assessmentType?.code || null,
        assessment_type_name: assessmentType?.name || 'General',
        isNationalService,
        typeLabel: isNationalService ? 'National Service' : 'Stratavax',

        // Scores
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        percentage_score: overallScore,
        overallScore,

        // Category scores
        category_scores: categoryScores,
        categoryScores,
        categoryBreakdown: categoryScores,

        // Recommendation
        recommendation,
        recommendationLevel: recommendation,

        // Metadata
        completed_at: result.completed_at,
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0,
        correct_answers: result.correct_answers || 0,

        // Include raw report data for detailed report page compatibility
        report_data: result.report_data || null,

        // Candidate info for report component
        candidateInfo
