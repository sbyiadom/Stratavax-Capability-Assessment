import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const results = {
    env: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }
  };

  try {
    // Create service client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Simple query on a public table
    const { data: typeData, error: typeError } = await supabase
      .from('assessment_types')
      .select('count', { count: 'exact', head: true });

    results.test1_public_table = {
      success: !typeError,
      error: typeError?.message,
      hasData: !!typeData
    };

    // Test 2: Query responses table
    const { data: responseData, error: responseError } = await supabase
      .from('responses')
      .select('count', { count: 'exact', head: true });

    results.test2_responses_table = {
      success: !responseError,
      error: responseError?.message,
      hasData: !!responseData
    };

    // Test 3: Query with the specific user
    const testUserId = '22754b0a-a68f-462c-ab80-0af41fff70f1';
    const { data: userData, error: userError } = await supabase
      .from('responses')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);

    results.test3_specific_user = {
      success: !userError,
      error: userError?.message,
      found: userData && userData.length > 0
    };

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      results
    });
  }
}
