// pages/api/admin/reports.js - FIXED VERSION

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
    // STEP 1: Get all assessment results with JOINs
    // ============================================================
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select(`
        *,
        candidate_profiles!inner (
          id,
          full_name,
          email,
          university,
          programme,
          preferred_department,
          graduation_year
        ),
        assessments!inner (
          id,
          title,
          assessment_type_id,
          assessment_types!inner (
            id,
            code,
            name
          )
        )
      `)
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
    // STEP 2: Build enriched reports with data from JOINs
    // ============================================================
    const enrichedReports = results.map((result) => {
      // Extract data from the joined tables
      const profile = result.candidate_profiles || {};
      const assessment = result.assessments || {};
      const assessmentType = assessment.assessment_types || {};

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
      } else if (result.report_data && result.report_data.category_scores) {
        categoryScores = result.report_data.category_scores;
      }

      // Get recommendation
      let recommendation = result.recommendation || 'Not Recommended';
      if (isNationalService && (!recommendation || recommendation === 'N/A' || recommendation === '')) {
        recommendation = getRecommendation(workplaceReadiness, intellectualCapability);
      }

      // Build the report object with ALL data from the JOINs
      return {
        id: result.id,
        user_id: result.user_id,
        assessment_id: result.assessment_id,
        session_id: result.session_id,
        
        // Candidate info - from joined profile
        candidate_name: profile?.full_name || 'Unknown',
        candidate_email: profile?.email || '',
        university: profile?.university || '',
        programme: profile?.programme || '',
        graduation_year: profile?.graduation_year || '',
        preferred_department: profile?.preferred_department || '',
        
        // Assessment info - from joined assessment
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
        
        // Recommendation
        recommendation: recommendation,
        recommendationLevel: recommendation,
        
        // Metadata
        completed_at: result.completed_at,
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0,
        correct_answers: result.correct_answers || 0,
        is_valid: result.is_valid || false,
        is_auto_submitted: result.is_auto_submitted || false,
        
        // Dimensions for the report component
        dimensions: {
          workplaceReadiness: workplaceReadiness,
          intellectualCapability: intellectualCapability,
          overallScore: overallScore
        },
        
        // Statistics for the report component
        statistics: {
          totalQuestions: result.total_questions || 0,
          answeredQuestions: result.answered_questions || 0,
          correctAnswers: result.correct_answers || 0
        },
        
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

    console.log(`[Report API] Returning ${enrichedReports.length} reports`);
    console.log(`[Report API] National Service: ${nationalServiceCount}, Stratavax: ${stratavaxCount}`);
    
    // Log sample data for debugging
    const sample = enrichedReports[0];
    if (sample) {
      console.log(`[Report API] Sample: ${sample.candidate_name} - ${sample.assessment_title} - ${sample.percentage_score}%`);
    }

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
