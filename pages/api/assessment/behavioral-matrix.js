// pages/api/assessment/behavioral-matrix.js - DIAGNOSTIC VERSION

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('========================================');
  console.log('🔍 BEHAVIORAL MATRIX DIAGNOSTIC START');
  console.log('========================================');
  
  try {
    // Step 1: Check environment variables
    console.log('📌 STEP 1: Checking environment variables...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ PRESENT' : '❌ MISSING');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ PRESENT' : '❌ MISSING');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Step 2: Get resultId
    console.log('📌 STEP 2: Getting resultId...');
    const { resultId } = req.query;
    console.log('  - resultId:', resultId || '❌ MISSING');
    
    if (!resultId) {
      throw new Error('Missing resultId');
    }

    // Step 3: Check token
    console.log('📌 STEP 3: Checking authorization...');
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('  - Token present:', token ? '✅ YES' : '❌ NO');
    
    if (!token) {
      throw new Error('Missing authorization token');
    }

    // Step 4: Initialize Supabase
    console.log('📌 STEP 4: Initializing Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('  - Supabase initialized: ✅');

    // Step 5: Verify user
    console.log('📌 STEP 5: Verifying user...');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('  - Auth Error:', authError);
      throw new Error(`Auth error: ${authError.message}`);
    }
    console.log('  - User verified:', userData?.user?.email || '✅');

    // Step 6: Check if assessment_results table exists and get data
    console.log('📌 STEP 6: Fetching assessment result...');
    const { data: result, error: resultError } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('id', resultId)
      .single();
    
    if (resultError) {
      console.error('  - Result Error:', resultError);
      throw new Error(`Result error: ${resultError.message}`);
    }
    console.log('  - Result found:', result.id);
    console.log('  - session_id:', result.session_id);
    console.log('  - user_id:', result.user_id);
    console.log('  - assessment_id:', result.assessment_id);

    // Step 7: Check if responses table exists and get data
    console.log('📌 STEP 7: Fetching responses...');
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', result.session_id);
    
    if (responsesError) {
      console.error('  - Responses Error:', responsesError);
      // Not throwing here - maybe responses table doesn't exist yet
      console.log('  - ⚠️ Responses table may not exist, continuing...');
    } else {
      console.log('  - Responses found:', responses?.length || 0);
      if (responses && responses.length > 0) {
        console.log('  - Sample response metadata:', responses[0]?.metadata);
      }
    }

    // Step 8: Return success with sample data
    console.log('📌 STEP 8: Success! Returning diagnostic data...');
    console.log('========================================');
    
    return res.status(200).json({
      success: true,
      message: 'Diagnostic test successful',
      data: {
        hasResult: true,
        resultId: result.id,
        sessionId: result.session_id,
        userId: result.user_id,
        assessmentId: result.assessment_id,
        responsesCount: responses?.length || 0,
        hasResponses: responses && responses.length > 0,
        sampleMetadata: responses && responses.length > 0 ? responses[0]?.metadata : null,
        resultData: {
          percentage_score: result.percentage_score,
          completed_at: result.completed_at,
          is_auto_submitted: result.is_auto_submitted
        }
      }
    });

  } catch (error) {
    console.error('❌ DIAGNOSTIC FAILED:', error);
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.log('========================================');
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
