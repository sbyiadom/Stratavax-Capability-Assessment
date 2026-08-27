import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Detailed Test] Service role key length:', supabaseKey?.length);
  console.log('[Detailed Test] Service role key prefix:', supabaseKey?.substring(0, 30) + '...');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Test 1: Try to get the current user (this should work with service role)
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log('[Detailed Test] Auth getUser result:', userData);
  console.log('[Detailed Test] Auth getUser error:', userError);

  // Test 2: Try a simple query on supervisor_profiles
  const { data: supervisors, error: supError } = await supabase
    .from('supervisor_profiles')
    .select('*')
    .limit(5);

  console.log('[Detailed Test] Supervisors found:', supervisors?.length || 0);
  console.log('[Detailed Test] Sup Error:', supError);

  // Test 3: Try candidate_profiles
  const { data: candidates, error: candError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .limit(5);

  console.log('[Detailed Test] Candidates found:', candidates?.length || 0);
  console.log('[Detailed Test] Cand Error:', candError);

  // Test 4: Check if Fofie exists in candidate_profiles
  const { data: fofie, error: fofieError } = await supabase
    .from('candidate_profiles')
    .select('id, full_name')
    .eq('supervisor_id', 'f4b541af-f765-46f0-8f1a-955ad1847930')
    .limit(5);

  console.log('[Detailed Test] Fofie candidates:', fofie?.length || 0);
  console.log('[Detailed Test] Fofie Error:', fofieError);

  // Test 5: Check if Maabena exists in candidate_profiles
  const { data: maabena, error: maabenaError } = await supabase
    .from('candidate_profiles')
    .select('id, full_name')
    .eq('supervisor_id', '972a8a23-e0c4-4031-a553-191c9a31fbed')
    .limit(5);

  console.log('[Detailed Test] Maabena candidates:', maabena?.length || 0);
  console.log('[Detailed Test] Maabena Error:', maabenaError);

  return res.status(200).json({
    success: true,
    debug: {
      serviceKeyLength: supabaseKey?.length || 0,
      serviceKeyPrefix: supabaseKey?.substring(0, 30) + '...',
      url: supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '').substring(0, 30) + '...' : null
    },
    tests: {
      authGetUser: {
        success: !!userData,
        error: userError?.message || null
      },
      supervisors: {
        count: supervisors?.length || 0,
        error: supError?.message || null,
        data: supervisors?.slice(0, 2) || []
      },
      candidates: {
        count: candidates?.length || 0,
        error: candError?.message || null,
        data: candidates?.slice(0, 2) || []
      },
      fofieCandidates: {
        count: fofie?.length || 0,
        error: fofieError?.message || null
      },
      maabenaCandidates: {
        count: maabena?.length || 0,
        error: maabenaError?.message || null
      }
    }
  });
}
