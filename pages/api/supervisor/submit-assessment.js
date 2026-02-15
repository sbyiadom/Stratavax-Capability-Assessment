import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log environment (without exposing the actual keys)
  console.log("🔧 Environment check:", {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...'
  });

  // Create admin client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { session_id, user_id, assessment_id, time_spent } = req.body;
  console.log("📥 Submission request:", { session_id, user_id, assessment_id, time_spent });

  try {
    // Simple test query
    const { data: testData, error: testError } = await supabaseAdmin
      .from('assessment_sessions')
      .select('id')
      .limit(1);

    if (testError) {
      console.error("❌ Connection test failed:", testError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: testError.message,
        details: testError
      });
    }

    console.log("✅ Database connection successful");

    // Now try to get the specific session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('assessment_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .single();

    if (sessionError) {
      console.error("❌ Session fetch error:", sessionError);
      return res.status(404).json({ 
        error: 'Session not found',
        message: sessionError.message
      });
    }

    console.log("✅ Session found:", session.id);

    return res.status(200).json({ 
      success: true, 
      message: 'Connection test successful',
      session_id: session.id
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
