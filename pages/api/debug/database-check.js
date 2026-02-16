import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const results = {};

    // Check tables existence
    const tables = [
      'assessment_sessions',
      'responses',
      'assessment_results',
      'candidate_assessments',
      'assessment_progress',
      'unique_questions',
      'unique_answers'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      results[table] = {
        exists: !error || error.code !== '42P01',
        count: data?.length || 0,
        error: error?.message
      };
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      tables: results
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
