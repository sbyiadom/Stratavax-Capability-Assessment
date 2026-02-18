import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log("🔍 Testing service role access");
  
  const results = {
    env_check: {
      has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
      service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
      service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }
  };

  try {
    // Create service role client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Try to count responses
    const { count: responseCount, error: responseError } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true });

    results.responses_test = {
      success: !responseError,
      error: responseError?.message,
      count: responseCount
    };

    // Test 2: Try to read one response
    const { data: responseData, error: readError } = await supabase
      .from('responses')
      .select('*')
      .limit(1);

    results.responses_read = {
      success: !readError,
      error: readError?.message,
      has_data: responseData && responseData.length > 0
    };

    // Test 3: Try to join with unique_answers
    const { data: joinData, error: joinError } = await supabase
      .from('responses')
      .select(`
        id,
        unique_answers!inner (
          score
        )
      `)
      .limit(1);

    results.join_test = {
      success: !joinError,
      error: joinError?.message,
      has_data: joinData && joinData.length > 0
    };

    // Test 4: Test with specific user from logs
    const testUserId = '22754b0a-a68f-462c-ab80-0af41fff70f1';
    const { data: userResponses, error: userError } = await supabase
      .from('responses')
      .select('count')
      .eq('user_id', testUserId)
      .limit(1);

    results.user_test = {
      success: !userError,
      error: userError?.message,
      user_id: testUserId
    };

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      results
    });
  }
}
