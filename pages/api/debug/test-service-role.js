import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // Initialize with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Try to access assessment_sessions
    const { data, error } = await supabase
      .from('assessment_sessions')
      .select('count', { count: 'exact', head: true });

    res.status(200).json({
      success: true,
      serviceRoleWorking: !error,
      error: error?.message,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
