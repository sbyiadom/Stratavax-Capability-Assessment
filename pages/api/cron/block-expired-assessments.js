// pages/api/cron/block-expired-assessments.js

export default async function handler(req, res) {
  // Verify cron secret for security
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized attempt to access cron endpoint');
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }

  try {
    console.log('[Cron] Starting block-expired-assessments job...');
    
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseAnonKey || !supabaseUrl) {
      throw new Error('Missing Supabase environment variables');
    }

    // Call the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/block-expired-assessments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    const data = await response.json();
    
    console.log('[Cron] Job completed:', data);
    
    res.status(200).json({
      success: true,
      message: 'Cron job executed successfully',
      result: data
    });
  } catch (error) {
    console.error('[Cron] Job failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
