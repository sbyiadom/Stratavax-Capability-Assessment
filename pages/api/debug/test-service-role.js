import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const results = {
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
      keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
        process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 'missing'
    }
  };

  // Test with service role client
  try {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Simple query
    const { data: queryData, error: queryError } = await serviceClient
      .from('supervisors')
      .select('count')
      .limit(1);

    results.test1 = {
      success: !queryError,
      error: queryError?.message,
      data: queryData
    };

    // Test 2: Try to get a specific supervisor
    const { data: specificData, error: specificError } = await serviceClient
      .from('supervisors')
      .select('*')
      .eq('id', '12f19660-d58a-4519-8862-4e22fdf3f6ba');

    results.test2 = {
      success: !specificError,
      error: specificError?.message,
      data: specificData
    };

    // Test 3: Try to insert a test record
    const testId = 'test-' + Date.now();
    const { data: insertData, error: insertError } = await serviceClient
      .from('supervisors')
      .insert({
        user_id: testId,
        email: `test-${Date.now()}@example.com`,
        full_name: 'Test User',
        role: 'test',
        is_active: false,
        created_at: new Date().toISOString()
      })
      .select();

    results.test3 = {
      success: !insertError,
      error: insertError?.message
    };

    // Clean up if insert succeeded
    if (!insertError && insertData) {
      await serviceClient
        .from('supervisors')
        .delete()
        .eq('user_id', testId);
    }

  } catch (error) {
    results.error = error.message;
  }

  res.status(200).json(results);
}
