// pages/api/admin/reports.js - FIXED to show correct scores

import { createClient } from '@supabase/supabase-js';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function getRecommendation(workplaceReadiness, intellectualCapability) {
  const workplace = Number(workplaceReadiness) || 0;
  const intellectual = Number(intellectualCapability) || 0;

  if (workplace >= 85 && intellectual >= 85) {
    return 'Highly Recommended';
  }
  if (workplace >= 75 && intellectual >= 75) {
    return 'Recommended';
  }
  if (workplace >= 65 && intellectual >= 65) {
    return 'Reserve Pool';
  }
  return 'Not Recommended';
}

// ============================================================
// HELPER: Calculate scores from category_scores
// ============================================================
function calculateScoresFromCategories(categoryScores) {
  let workplaceTotal = 0;
  let workplaceCount = 0;
  let intellectualTotal = 0;
  let intellectualCount = 0;

  const workplaceKeywords = ['safety', 'risk', 'technical', 'communication', 'teamwork', 'ownership', 'integrity', 'workplace', 'ethics', 'professional', 'readiness', 'conduct', 'attitude', 'work ethic'];
  const intellectualKeywords = ['numerical', 'logical', 'reasoning', 'measurement', 'engineering', 'spatial', 'problem', 'troubleshooting', 'analysis', 'critical', 'analytical', 'decision', 'cognitive', 'aptitude', 'intellectual'];

  if (!Array.isArray(categoryScores) || categoryScores.length === 0) {
    return { workplaceReadiness: 0, intellectualCapability: 0 };
  }

  categoryScores.forEach(cat => {
    const name = (cat.category || cat.name || '').toLowerCase();
    const percentage = Number(cat.percentage || cat.score || 0);
    
    const isWorkplace = workplaceKeywords.some(keyword => name.includes(keyword));
    const isIntellectual = intellectualKeywords.some(keyword => name.includes(keyword));

    if (isWorkplace) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectual) {
      intellectualTotal += percentage;
      intellectualCount++;
    }
  });

  const workplaceReadiness = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
  const intellectualCapability = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;

  return { workplaceReadiness, intellectualCapability };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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
      auth: { persistSession: false }
    });

    // ============================================================
    // STEP 1: Get all assessment results
    // ============================================================
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (resultsError) {
      return res.status(500).json({
        success: false,
        error: `Failed to load results: ${resultsError.message}`
      });
    }

    if (!results || results.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        stats: { total: 0, nationalService: 0, stratavax: 0 }
      });
    }

    // ============================================================
    // STEP 2: Get candidate profiles
    // ============================================================
    const userIds = results.map(r => r.user_id).filter(Boolean);
    let candidateMap = {};

    if (userIds.length > 0) {
      const { data: candidates, error: candidatesError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .in('id', userIds);

      if (!candidatesError && candidates) {
        candidates.forEach(c => {
          candidateMap[c.id] = c;
        });
      }
    }

    // ============================================================
    // STEP 3: Get assessment details
    // ============================================================
    const assessmentIds = results.map(r => r.assessment_id).filter(Boolean);
    let assessmentMap = {};

    if (assessmentIds.length > 0) {
      const { data: assessments, error: assessmentsError } = await serviceClient
        .from('assessments')
        .select('id, title, assessment_type_id')
        .in('id', assessmentIds);

      if (!assessmentsError && assessments) {
        assessments.forEach(a => {
          assessmentMap[a.id] = a;
        });
      }
    }

    // ============================================================
    // STEP 4: Get assessment types
    // ============================================================
    const typeIds = Object.values(assessmentMap).map(a => a.assessment_type_id).filter(Boolean);
    let typeMap = {};

    if (typeIds.length > 0) {
      const { data: types, error: typesError } = await serviceClient
        .from('assessment_types')
        .select('id, code, name')
        .in('id', typeIds);

      if (!typesError && types) {
        types.forEach(t => {
          typeMap[t.id] = t;
        });
      }
    }

    // ============================================================
    // STEP 5: Build enriched reports with calculated scores
    // ============================================================
    const enrichedReports = results.map((result) => {
      const candidate = candidateMap[result.user_id];
      const assessment = assessmentMap[result.assessment_id] || null;
      const assessmentType = assessment ? typeMap[assessment.assessment_type_id] : null;
      
      const isNationalService = 
        result.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessmentType?.code === 'national_service' ||
        assessmentType?.name === 'National Service Recruitment Assessment' ||
        assessment?.title === 'National Service Recruitment Assessment';

      // ============================================================
      // CRITICAL FIX: Use database scores FIRST, only calculate if missing
      // ============================================================
      let workplaceReadiness = Number(result.workplace_readiness) || 0;
      let intellectualCapability = Number(result.intellectual_capability) || 0;
      let overallScore = Number(result.percentage_score) || 0;

      // ONLY calculate if ALL scores are missing (0 or null)
      const hasAnyScore = workplaceReadiness > 0 || intellectualCapability > 0 || overallScore > 0;

      if (!hasAnyScore) {
        // Try category_scores from result
        let categoryScores = [];
        if (result.category_scores && Array.isArray(result.category_scores)) {
          categoryScores = result.category_scores;
        } else if (result.report_data && result.report_data.categoryScores) {
          categoryScores = result.report_data.categoryScores;
        } else if (result.report_data && result.report_data.category_scores) {
          categoryScores = result.report_data.category_scores;
        }

        if (categoryScores.length > 0) {
          const calculated = calculateScoresFromCategories(categoryScores);
          if (workplaceReadiness === 0) workplaceReadiness = calculated.workplaceReadiness;
          if (intellectualCapability === 0) intellectualCapability = calculated.intellectualCapability;
          // Calculate overall score from workplace and intellectual
          if (workplaceReadiness > 0 || intellectualCapability > 0) {
            overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
          }
        }
      }

      // If overallScore is still 0 but we have individual scores, calculate it
      if (overallScore === 0 && (workplaceReadiness > 0 || intellectualCapability > 0)) {
        overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
      }

      // Get recommendation
      let recommendation = result.recommendation || 'N/A';
      if (isNationalService) {
        if (!recommendation || recommendation === 'N/A' || recommendation === '') {
          recommendation = getRecommendation(workplaceReadiness, intellectualCapability);
        }
      }

      // Get category_scores for the report view
      let categoryScores = [];
      if (result.category_scores && Array.isArray(result.category_scores)) {
        categoryScores = result.category_scores;
      } else if (result.report_data && result.report_data.categoryScores) {
        categoryScores = result.report_data.categoryScores;
      } else if (result.report_data && result.report_data.category_scores) {
        categoryScores = result.report_data.category_scores;
      }

      return {
        id: result.id,
        user_id: result.user_id,
        assessment_id: result.assessment_id,
        candidate_name: candidate?.full_name || 'Unknown',
        candidate_email: candidate?.email || '',
        candidate_university: candidate?.university || '',
        candidate_programme: candidate?.programme || '',
        assessment_title: assessment?.title || 'Unknown',
        assessment_type_code: assessmentType?.code || null,
        assessment_type_name: assessmentType?.name || 'General',
        isNationalService: isNationalService,
        typeLabel: isNationalService ? 'National Service' : 'Stratavax',
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        percentage_score: overallScore,
        recommendation: recommendation,
        completed_at: result.completed_at,
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0,
        category_scores: categoryScores
      };
    });

    // Count National Service reports
    const nationalServiceReports = enrichedReports.filter(r => r.isNationalService === true);
    const nationalServiceCount = nationalServiceReports.length;
    const stratavaxCount = enrichedReports.length - nationalServiceCount;

    return res.status(200).json({
      success: true,
      reports: enrichedReports,
      stats: {
        total: enrichedReports.length,
        nationalService: nationalServiceCount,
        stratavax: stratavaxCount
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
