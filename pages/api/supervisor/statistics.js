// pages/api/supervisor/statistics.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Verify session
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1];
    supabase.auth.setSession({ access_token: token, refresh_token: '' });

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    // Get statistics from database
    const { count: totalResponses } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true });

    const { data: uniqueResponses } = await supabase
      .from('responses')
      .select('user_id')
      .not('user_id', 'is', null);

    const uniqueUsers = new Set(uniqueResponses?.map(r => r.user_id) || []);

    // Calculate average score
    let averageScore = 0;
    if (totalResponses > 0) {
      const { data: scoreData } = await supabase
        .from('responses')
        .select('answers(score)')
        .limit(1000);

      if (scoreData && scoreData.length > 0) {
        let totalScore = 0;
        let validScores = 0;
        
        scoreData.forEach(item => {
          if (item.answers && item.answers.length > 0) {
            const score = item.answers[0]?.score;
            if (typeof score === 'number') {
              totalScore += score;
              validScores++;
            }
          }
        });
        
        if (validScores > 0) {
          averageScore = Math.round((totalScore / (validScores * 10)) * 100);
        }
      }
    }

    res.status(200).json({
      totalResponses: totalResponses || 0,
      completedAssessments: uniqueUsers.size,
      averageScore,
      uniqueRespondents: uniqueUsers.size
    });

  } catch (error) {
    console.error('Statistics API error:', error);
    res.status(500).json({ error: 'Internal server error' })
  }
}
