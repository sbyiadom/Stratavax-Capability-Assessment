import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('[Test] Service Role Test Started');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Test] URL present:', !!supabaseUrl);
  console.log('[Test] Key present:', !!supabaseKey);
  console.log('[Test] Key prefix:', supabaseKey?.substring(0, 20) + '...');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Test 1: Query supervisor_profiles
  const { data: supervisors, error: supError } = await supabase
    .from('supervisor_profiles')
    .select('id, email, full_name')
    .limit(3);

  console.log('[Test] Supervisors found:', supervisors?.length || 0);
  if (supError) console.log('[Test] Sup Error:', supError);

  // Test 2: Query candidate_profiles (RLS ON)
  const { data: candidates, error: candError } = await supabase
    .from('candidate_profiles')
    .select('id, full_name, supervisor_id')
    .limit(3);

  console.log('[Test] Candidates found:', candidates?.length || 0);
  if (candError) console.log('[Test] Cand Error:', candError);

  // Test 3: Query assessment_results (RLS ON)
  const { data: assessments, error: assError } = await supabase
    .from('assessment_results')
    .select('id, user_id, percentage_score')
    .limit(3);

  console.log('[Test] Assessments found:', assessments?.length || 0);
  if (assError) console.log('[Test] Ass Error:', assError);

  // Test 4: Count Fofie's candidates
  const { data: fofieCandidates, error: fofieError } = await supabase
    .from('candidate_profiles')
    .select('id, full_name')
    .eq('supervisor_id', 'f4b541af-f765-46f0-8f1a-955ad1847930')
    .limit(5);

  console.log('[Test] Fofie candidates found:', fofieCandidates?.length || 0);
  if (fofieError) console.log('[Test] Fofie Error:', fofieError);

  return res.status(200).json({
    success: true,
    environment: {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      keyPrefix: supabaseKey?.substring(0, 20) + '...'
    },
    tests: {
      supervisors: {
        count: supervisors?.length || 0,
        error: supError?.message || null
      },
      candidates: {
        count: candidates?.length || 0,
        error: candError?.message || null
      },
      assessments: {
        count: assessments?.length || 0,
        error: assError?.message || null
      },
      fofieCandidates: {
        count: fofieCandidates?.length || 0,
        error: fofieError?.message || null
      }
    }
  });
}
