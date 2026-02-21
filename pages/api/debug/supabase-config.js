import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const config = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : 'missing',
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...' : 'missing',
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
        process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 'missing'
    }
  };

  // Test 1: Anon client
  try {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await anonClient
      .from('supervisors')
      .select('count')
      .limit(1);

    config.anonTest = {
      success: !error,
      error: error?.message,
      hasData: !!data
    };
  } catch (e) {
    config.anonTest = { success: false, error: e.message };
  }

  // Test 2: Service role client
  try {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await serviceClient
      .from('supervisors')
      .select('count')
      .limit(1);

    config.serviceTest = {
      success: !error,
      error: error?.message,
      hasData: !!data
    };
  } catch (e) {
    config.serviceTest = { success: false, error: e.message };
  }

  // Test 3: Try to get the specific supervisor that's failing
  try {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await serviceClient
      .from('supervisors')
      .select('*')
      .eq('id', '12f19660-d58a-4519-8862-4e22fdf3f6ba');

    config.specificTest = {
      success: !error,
      error: error?.message,
      found: data && data.length > 0
    };
  } catch (e) {
    config.specificTest = { success: false, error: e.message };
  }

  res.status(200).json(config);
}
