// pages/api/supervisor/dashboard-test.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  try {
    // Get user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) {
      return res.status(401).json({ error: userError.message });
    }

    const supervisorId = userData.user.id;

    // Get candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('supervisor_id', supervisorId);

    if (candidatesError) {
      return res.status(500).json({ error: candidatesError });
    }

    const candidateIds = candidates.map(c => c.id);

    // Try query with .in()
    const { data: results, error: resultsError } = await supabase
      .from('assessment_results')
      .select('*')
      .in('user_id', candidateIds);

    if (resultsError) {
      return res.status(500).json({
        error: resultsError.message,
        code: resultsError.code,
        details: resultsError.details,
        hint: resultsError.hint
      });
    }

    return res.status(200).json({
      success: true,
      candidateCount: candidateIds.length,
      resultCount: results.length,
      sample: results.slice(0, 3)
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
