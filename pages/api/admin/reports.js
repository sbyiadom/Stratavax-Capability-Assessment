// pages/api/admin/reports.js - WITH DEBUGGING

import { createClient } from '@supabase/supabase-js';

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
        .select('id, full_name, email, university, programme')
        .in('id', userIds);

      if (!candidatesError && candidates) {
        candidates.forEach(c => {
          candidateMap[c.id] = c;
        });
      }
    }

    // ============================================================
    // STEP 3: Get all assessments with their types in ONE query
    // ============================================================
    const assessmentIds = results.map(r => r.assessment_id).filter(Boolean);
    let assessmentTypeMap = {};

    if (assessmentIds.length > 0) {
      // Use a join to get assessment with type info
      const { data: assessmentsWithTypes, error: joinError } = await serviceClient
        .from('assessments')
        .select(`
          id,
          title,
          assessment_type_id,
          assessment_types!inner (
            id,
            code,
            name
          )
        `)
        .in('id', assessmentIds);

      if (!joinError && assessmentsWithTypes) {
        assessmentsWithTypes.forEach(a => {
          assessmentTypeMap[a.id] = {
            title: a.title,
            assessment_type_id: a.assessment_type_id,
            type: a.assessment_types || null
          };
        });
        console.log(`✅ Found ${Object.keys(assessmentTypeMap).length} assessments with types`);
      } else {
        // Fallback: get assessments and types separately
        console.log('⚠️ Join failed, using fallback...');
        
        const { data: assessments, error: assessmentsError } = await serviceClient
          .from('assessments')
          .select('id, title, assessment_type_id')
          .in('id', assessmentIds);

        if (!assessmentsError && assessments) {
          const typeIds = assessments.map(a => a.assessment_type_id).filter(Boolean);
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

          assessments.forEach(a => {
            assessmentTypeMap[a.id] = {
              title: a.title,
              assessment_type_id: a.assessment_type_id,
              type: typeMap[a.assessment_type_id] || null
            };
          });
        }
      }
    }

    // ============================================================
    // STEP 4: Build enriched reports
    // ============================================================
    const enrichedReports = results.map((result) => {
      const candidate = candidateMap[result.user_id];
      const assessmentInfo = assessmentTypeMap[result.assessment_id] || null;
      
      // Check if this is a National Service assessment
      const isNationalService = 
        assessmentInfo?.type?.code === 'national_service' ||
        assessmentInfo?.type?.name === 'National Service Recruitment Assessment';

      // Get scores
      let workplaceReadiness = Number(result.workplace_readiness) || 0;
      let intellectualCapability = Number(result.intellectual_capability) || 0;
      let overallScore = Number(result.percentage_score) || 0;

      if (overallScore === 0 && (workplaceReadiness > 0 || intellectualCapability > 0)) {
        overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
      }

      let recommendation = result.recommendation || 'N/A';
      if (isNationalService) {
        if (!recommendation || recommendation === 'N/A' || recommendation === '') {
          recommendation = getRecommendation(workplaceReadiness, intellectualCapability);
        }
      }

      return {
        id: result.id,
        user_id: result.user_id,
        assessment_id: result.assessment_id,
        candidate_name: candidate?.full_name || 'Unknown',
        candidate_email: candidate?.email || '',
        candidate_university: candidate?.university || '',
        candidate_programme: candidate?.programme || '',
        assessment_title: assessmentInfo?.title || 'Unknown',
        assessment_type_code: assessmentInfo?.type?.code || null,
        assessment_type_name: assessmentInfo?.type?.name || 'General',
        isNationalService: isNationalService,
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        percentage_score: overallScore,
        recommendation: recommendation,
        completed_at: result.completed_at,
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0,
        category_scores: result.category_scores || []
      };
    });

    // Count National Service reports
    const nationalServiceReports = enrichedReports.filter(r => r.isNationalService === true);
    const nationalServiceCount = nationalServiceReports.length;
    const stratavaxCount = enrichedReports.length - nationalServiceCount;

    console.log(`📊 Total reports: ${enrichedReports.length}`);
    console.log(`📋 National Service reports: ${nationalServiceCount}`);
    console.log(`📊 Stratavax reports: ${stratavaxCount}`);

    // Log sample National Service reports for debugging
    if (nationalServiceReports.length > 0) {
      console.log('Sample National Service report:', {
        id: nationalServiceReports[0].id,
        assessment_id: nationalServiceReports[0].assessment_id,
        assessment_title: nationalServiceReports[0].assessment_title,
        isNationalService: nationalServiceReports[0].isNationalService,
        type_code: nationalServiceReports[0].assessment_type_code
      });
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
