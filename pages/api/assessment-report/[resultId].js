// pages/api/assessment-report/[resultId].js - FIXED AUTH ERROR
// FIXED: Correctly extracts token and verifies user for API access.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { resultId } = req.query;
    if (!resultId) {
      return res.status(400).json({ success: false, error: 'Missing resultId' });
    }

    // ============================================================
    // AUTHENTICATION FIX
    // ============================================================
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Assessment Report] Missing environment variables');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    // Create the client
    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Verify the user making the request is authenticated
    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    
    if (authError || !userData?.user) {
      console.error('[Assessment Report] Auth error:', authError);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // ============================================================
    // STEP 1: Get the assessment result
    // ============================================================
    const { data: result, error: resultError } = await serviceClient
      .from('assessment_results')
      .select(`
        *,
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
      .eq('id', resultId)
      .single();

    if (resultError || !result) {
      console.error('[Assessment Report] Result error:', resultError);
      return res.status(404).json({ success: false, error: 'Result not found' });
    }

    // ============================================================
    // STEP 2: Fetch Candidate Profile (Robust Two-Way Lookup)
    // ============================================================
    let candidateProfile = null;
    const candidateSelect = 'id, user_id, full_name, email, university, programme, graduation_year, preferred_department';

    if (result.user_id) {
      // Attempt 1: assessment_results.user_id matches candidate_profiles.id
      const { data: profileById, error: profileByIdError } = await serviceClient
        .from('candidate_profiles')
        .select(candidateSelect)
        .eq('id', result.user_id)
        .maybeSingle();

      if (!profileByIdError && profileById) {
        candidateProfile = profileById;
        console.log('[Assessment Report] Found candidate via id match.');
      }

      // Attempt 2: assessment_results.user_id matches candidate_profiles.user_id
      if (!candidateProfile) {
        const { data: profileByUserId, error: profileByUserIdError } = await serviceClient
          .from('candidate_profiles')
          .select(candidateSelect)
          .eq('user_id', result.user_id)
          .maybeSingle();

        if (!profileByUserIdError && profileByUserId) {
          candidateProfile = profileByUserId;
          console.log('[Assessment Report] Found candidate via user_id match.');
        }
      }
    }

    console.log('[Assessment Report] Candidate profile lookup:', {
      resultId,
      resultUserId: result.user_id,
      foundProfile: Boolean(candidateProfile),
      candidateProfile
    });

    // ============================================================
    // STEP 3: Fetch Assessment Details and Build Report
    // ============================================================
    const assessment = result.assessments || {};
    const type = assessment.assessment_types || {};

    const isNationalService = 
      result.assessment_id === 'bdb9d46e-9fac-4d00-8478-1f649e7ac600' ||
      type?.code === 'national_service' ||
      assessment?.title === 'National Service Recruitment Assessment';

    // Process category scores for frontend compatibility
    let categoryScores = result.category_scores || [];
    let workplaceSubCategories = [];
    let intellectualSubCategories = [];

    // If category_scores is a JSON object, convert to array
    if (categoryScores && typeof categoryScores === 'object' && !Array.isArray(categoryScores)) {
      categoryScores = Object.entries(categoryScores).map(([name, data]) => ({
        category: name,
        percentage: data.percentage || 0,
        score: data.score || 0,
        maxScore: data.maxPossible || data.total || 0
      }));
    }

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

    // ============================================================
    // STEP 4: Return the response with candidate at top level
    // ============================================================
    return res.status(200).json({
      success: true,
      candidate: candidateProfile,
      result: {
        ...result,
        candidate_profiles: candidateProfile,
        assessments: assessment,
        workplaceSubCategories,
        intellectualSubCategories,
        categoryScores
      },
      report: result.report_data || {},
      isNationalService,
      assessmentTypeCode: type?.code || 'general'
    });

  } catch (error) {
    console.error('[Assessment Report] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
