// pages/api/debug.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const result = {
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        keyLength: supabaseKey?.length || 0,
        urlStart: supabaseUrl?.substring(0, 20) || 'missing'
      }
    };
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false, 
        ...result,
        error: 'Missing environment variables'
      });
    }
    
    // 🔴 FIX: Create client with auth disabled for service role
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test 1: Check supervisor_profiles
    const { data: supervisors, error: sError } = await supabase
      .from('supervisor_profiles')
      .select('id, full_name, email, role, is_active')
      .limit(5);
    
    result.supervisors = {
      count: supervisors?.length || 0,
      error: sError ? { message: sError.message, code: sError.code } : null,
      sample: supervisors?.[0] || null
    };
    
    // Test 2: Check candidate_supervisors
    const { data: assignments, error: aError } = await supabase
      .from('candidate_supervisors')
      .select('id, candidate_id, supervisor_id')
      .limit(5);
    
    result.assignments = {
      count: assignments?.length || 0,
      error: aError ? { message: aError.message, code: aError.code } : null,
      sample: assignments?.[0] || null
    };
    
    // Test 3: Check candidate_profiles
    const { data: candidates, error: cError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme')
      .limit(5);
    
    result.candidates = {
      count: candidates?.length || 0,
      error: cError ? { message: cError.message, code: cError.code } : null,
      sample: candidates?.[0] || null
    };
    
    // Test 4: Check assessment_results for Maabena's candidates
    // First get Maabena's candidate IDs
    const { data: maabenaAssignments, error: maabenaError } = await supabase
      .from('candidate_supervisors')
      .select('candidate_id')
      .eq('supervisor_id', '972a8a23-e0c4-4031-a553-191c9a31fbed');
    
    let maabenaCandidateIds = [];
    if (!maabenaError && maabenaAssignments) {
      maabenaCandidateIds = maabenaAssignments.map(a => a.candidate_id).filter(Boolean);
    }
    
    result.maabena = {
      assignedCandidates: maabenaCandidateIds.length,
      error: maabenaError ? { message: maabenaError.message, code: maabenaError.code } : null
    };
    
    // Get assessment results for Maabena's candidates
    let maabenaResults = [];
    let mError = null;
    
    if (maabenaCandidateIds.length > 0) {
      const { data: results, error: resultsError } = await supabase
        .from('assessment_results')
        .select('id, user_id, assessment_id, percentage_score, status, completed_at')
        .in('user_id', maabenaCandidateIds)
        .limit(10);
      
      maabenaResults = results || [];
      mError = resultsError;
    }
    
    result.maabenaResults = {
      count: maabenaResults.length,
      error: mError ? { message: mError.message, code: mError.code } : null,
      sample: maabenaResults.length > 0 ? maabenaResults[0] : null
    };
    
    // Test 5: Check assessments table
    const { data: assessments, error: assError } = await supabase
      .from('assessments')
      .select('id, title, assessment_type_id')
      .limit(5);
    
    result.assessments = {
      count: assessments?.length || 0,
      error: assError ? { message: assError.message, code: assError.code } : null,
      sample: assessments?.[0] || null
    };
    
    // Test 6: Check if the National Service assessment exists
    const { data: nsAssessment, error: nsError } = await supabase
      .from('assessments')
      .select('id, title, assessment_type_id')
      .eq('id', 'bdb9d46e-9fac-4d00-8478-1f649e7ac600')
      .maybeSingle();
    
    result.nationalServiceAssessment = {
      exists: !!nsAssessment,
      error: nsError ? { message: nsError.message, code: nsError.code } : null,
      data: nsAssessment || null
    };
    
    return res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
