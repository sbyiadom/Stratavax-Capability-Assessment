// pages/api/admin/reports.js - FIXED to properly read category data

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
        .select('id, full_name, email, university, programme, preferred_department, graduation_year')
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
    // STEP 5: Build enriched reports - READ DATA FROM DATABASE
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
      // READ DATA DIRECTLY FROM THE RESULT OBJECT
      // ============================================================
      
      // Get category_scores - this is the key data we need
      let categoryScores = [];
      
      // Try result.category_scores first (direct column)
      if (result.category_scores && Array.isArray(result.category_scores) && result.category_scores.length > 0) {
        categoryScores = result.category_scores;
        console.log(`[Report] Using category_scores from result: ${categoryScores.length} categories`);
      } 
      // Try result.report_data.categoryBreakdown
      else if (result.report_data && result.report_data.categoryBreakdown) {
        categoryScores = result.report_data.categoryBreakdown;
        console.log(`[Report] Using categoryBreakdown from report_data: ${categoryScores.length} categories`);
      }
      // Try result.report_data.category_scores
      else if (result.report_data && result.report_data.category_scores) {
        categoryScores = result.report_data.category_scores;
        console.log(`[Report] Using category_scores from report_data: ${categoryScores.length} categories`);
      }
      // Try result.report_data.categories
      else if (result.report_data && result.report_data.categories) {
        categoryScores = result.report_data.categories;
        console.log(`[Report] Using categories from report_data: ${categoryScores.length} categories`);
      }

      // Get scores - read directly from database
      const workplaceReadiness = Number(result.workplace_readiness) || 0;
      const intellectualCapability = Number(result.intellectual_capability) || 0;
      const overallScore = Number(result.percentage_score) || 0;

      // Get recommendation
      let recommendation = result.recommendation || 'Not Recommended';
      if (isNationalService && (!recommendation || recommendation === 'N/A' || recommendation === '')) {
        recommendation = getRecommendation(workplaceReadiness, intellectualCapability);
      }

      // Build the report object with ALL data
      const reportData = {
        // Candidate info
        candidateName: candidate?.full_name || 'Unknown',
        candidateEmail: candidate?.email || '',
        university: candidate?.university || '',
        programme: candidate?.programme || '',
        graduationYear: candidate?.graduation_year || '',
        preferredDepartment: candidate?.preferred_department || '',
        
        // Assessment info
        assessmentTitle: assessment?.title || 'Unknown',
        assessmentTypeCode: assessmentType?.code || null,
        assessmentTypeName: assessmentType?.name || 'General',
        isNationalService: isNationalService,
        typeLabel: isNationalService ? 'National Service' : 'Stratavax',
        
        // Scores - READ FROM DATABASE
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        percentage_score: overallScore,
        overallScore: overallScore,
        
        // Category scores - READ FROM DATABASE
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
          fullName: candidate?.full_name || 'Unknown',
          university: candidate?.university || '',
          programme: candidate?.programme || '',
          graduationYear: candidate?.graduation_year || '',
          preferredDepartment: candidate?.preferred_department || '',
          assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
        }
      };

      // If this is National Service and we have category scores, also add the full report_data
      if (isNationalService && result.report_data) {
        reportData.fullReport = result.report_data;
      }

      return reportData;
    });

    // Count National Service reports
    const nationalServiceReports = enrichedReports.filter(r => r.isNationalService === true);
    const nationalServiceCount = nationalServiceReports.length;
    const stratavaxCount = enrichedReports.length - nationalServiceCount;

    // Log what we're returning
    console.log(`[Report API] Returning ${enrichedReports.length} reports`);
    console.log(`[Report API] National Service: ${nationalServiceCount}, Stratavax: ${stratavaxCount}`);
    
    // Log sample category data for debugging
    const sampleNS = enrichedReports.find(r => r.isNationalService && r.category_scores?.length > 0);
    if (sampleNS) {
      console.log(`[Report API] Sample NS report: ${sampleNS.candidateName}, category_scores: ${sampleNS.category_scores.length}`);
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
