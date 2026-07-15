// pages/api/admin/reports.js

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing env vars:', { 
        supabaseUrl: !!supabaseUrl, 
        serviceRoleKey: !!serviceRoleKey 
      });
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
    let typeMap = {};

    if (assessmentIds.length > 0) {
      const { data: assessments, error: assessmentsError } = await serviceClient
        .from('assessments')
        .select('id, title, assessment_type_id')
        .in('id', assessmentIds);

      if (!assessmentsError && assessments) {
        assessments.forEach(a => {
          assessmentMap[a.id] = a;
        });
        
        const typeIds = assessments.map(a => a.assessment_type_id).filter(Boolean);
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
      }
    }

    // ============================================================
    // STEP 4: Build enriched reports
    // ============================================================
    const enrichedReports = results.map((result) => {
      const candidate = candidateMap[result.user_id];
      const assessment = assessmentMap[result.assessment_id] || null;
      const assessmentType = assessment ? typeMap[assessment.assessment_type_id] : null;
      const isNationalService = assessmentType?.code === 'national_service';

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
        workplace_readiness: result.workplace_readiness || 0,
        intellectual_capability: result.intellectual_capability || 0,
        percentage_score: result.percentage_score || 0,
        recommendation: result.recommendation || 'N/A',
        completed_at: result.completed_at,
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0,
        category_scores: result.category_scores || []
      };
    });

    const nationalServiceCount = enrichedReports.filter(r => r.isNationalService === true).length;
    const stratavaxCount = enrichedReports.filter(r => r.isNationalService !== true).length;

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
