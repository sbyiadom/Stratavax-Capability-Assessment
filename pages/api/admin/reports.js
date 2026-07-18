// pages/api/admin/reports.js - COMPLETE FIXED VERSION

import { createClient } from '@supabase/supabase-js';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// FIXED: RECOMMENDATION LOGIC
// ============================================================
function getRecommendation(workplaceReadiness, intellectualCapability, overallScore) {
  const workplace = Number(workplaceReadiness) || 0;
  const intellectual = Number(intellectualCapability) || 0;
  const overall = Number(overallScore) || 0;

  // Use overall score as the primary factor
  if (overall >= 85) {
    return 'Highly Recommended';
  } else if (overall >= 70) {
    return 'Recommended';
  } else if (overall >= 50) {
    return 'Reserve Pool';
  } else {
    return 'Not Recommended';
  }
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
      console.error('Results error:', resultsError);
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
    // STEP 2: Get all candidate profiles
    // ============================================================
    const userIds = results.map(r => r.user_id).filter(Boolean);
    let candidateMap = {};

    if (userIds.length > 0) {
      const { data: candidates, error: candidatesError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, preferred_department, graduation_year')
        .in('id', userIds);

      if (!candidatesError && candidates) {
        candidates.forEach(c => {
          candidateMap[c.id] = c;
        });
        console.log(`[Report API] Loaded ${candidates.length} candidate profiles`);
      }
    }

    // ============================================================
    // STEP 3: Get all assessment details
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
    // STEP 5: Build enriched reports
    // ============================================================
    const enrichedReports = results.map((result) => {
      const profile = candidateMap[result.user_id] || {};
      const assessment = assessmentMap[result.assessment_id] || {};
      const assessmentType = assessment ? typeMap[assessment.assessment_type_id] : null;

      const isNationalService = 
        result.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessmentType?.code === 'national_service' ||
        assessment?.title === 'National Service Recruitment Assessment';

      // Get scores
      const workplaceReadiness = Number(result.workplace_readiness) || 0;
      const intellectualCapability = Number(result.intellectual_capability) || 0;
      const overallScore = Number(result.percentage_score) || 0;

      // Get category scores
      let categoryScores = [];
      if (result.category_scores && Array.isArray(result.category_scores) && result.category_scores.length > 0) {
        categoryScores = result.category_scores;
      } else if (result.report_data && result.report_data.categoryBreakdown) {
        categoryScores = result.report_data.categoryBreakdown;
      }

      // ============================================================
      // FIX: Calculate recommendation using the new logic
      // ============================================================
      let recommendation = result.recommendation || null;
      
      // If recommendation is missing or invalid, calculate it
      if (!recommendation || recommendation === 'N/A' || recommendation === '') {
        recommendation = getRecommendation(workplaceReadiness, intellectualCapability, overallScore);
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
        isNationalService: isNationalService,
        typeLabel: isNationalService ? 'National Service' : 'Stratavax',
        
        // Scores
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        percentage_score: overallScore,
        overallScore: overallScore,
        
        // Category scores
        category_scores: categoryScores,
        categoryScores: categoryScores,
        categoryBreakdown: categoryScores,
        
        // Recommendation - FIXED
        recommendation: recommendation,
        recommendationLevel: recommendation,
        
        // Metadata
        completed_at: result.completed_at,
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0,
        correct_answers: result.correct_answers || 0,
        
        // Candidate info for the report component
        candidateInfo: {
          fullName: profile?.full_name || 'Unknown',
          university: profile?.university || '',
          programme: profile?.programme || '',
          graduationYear: profile?.graduation_year || '',
          preferredDepartment: profile?.preferred_department || '',
          assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
        }
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
