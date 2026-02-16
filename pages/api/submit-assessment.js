import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🚀 New submit API called');
  
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Get session details
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return res.status(404).json({ error: 'Session not found' });
    }

    // 2. Get all responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', sessionId);

    if (responsesError) {
      console.error('Responses error:', responsesError);
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }

    // 3. Calculate score (simple version)
    const totalScore = responses?.length || 0;
    const maxScore = 100;

    // 4. Update session to completed
    const { error: updateError } = await supabase
      .from('assessment_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    // 5. Create result
    const { data: result, error: resultError } = await supabase
      .from('assessment_results')
      .insert({
        session_id: sessionId,
        user_id: session.user_id,
        assessment_id: session.assessment_id,
        total_score: totalScore,
        max_score: maxScore,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (resultError) {
      console.error('Result error:', resultError);
      return res.status(500).json({ error: 'Failed to create result' });
    }

    // 6. Update candidate_assessments
    await supabase
      .from('candidate_assessments')
      .upsert({
        user_id: session.user_id,
        assessment_id: session.assessment_id,
        session_id: sessionId,
        result_id: result.id,
        status: 'completed',
        score: totalScore,
        completed_at: new Date().toISOString()
      });

    return res.status(200).json({
      success: true,
      resultId: result.id,
      score: totalScore
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
