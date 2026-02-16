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

  console.log('📥 Submit assessment request received:', JSON.stringify(req.body, null, 2));

  try {
    const { session_id, user_id, assessment_id, time_spent } = req.body;

    // Validate required fields
    if (!session_id || !user_id || !assessment_id) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { session_id: !session_id, user_id: !user_id, assessment_id: !assessment_id }
      });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .single();

    if (sessionError) {
      console.error('❌ Session verification failed:', sessionError);
      return res.status(404).json({ error: 'Assessment session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Assessment already submitted' });
    }

    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        question_id,
        answer_id,
        created_at
      `)
      .eq('session_id', session_id);

    if (responsesError) {
      console.error('❌ Error fetching responses:', responsesError);
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }

    console.log(`📊 Found ${responses?.length || 0} responses for session`);

    // Calculate total score (you can enhance this based on your scoring logic)
    let totalScore = 0;
    let maxScore = 0;

    // If you have answer scores, calculate them
    if (responses && responses.length > 0) {
      // Get answer scores for each response
      for (const response of responses) {
        const { data: answer } = await supabase
          .from('unique_answers')
          .select('score')
          .eq('id', response.answer_id)
          .single();
        
        if (answer) {
          totalScore += answer.score || 0;
        }
      }
      // Assume max 5 points per question
      maxScore = responses.length * 5;
    }

    // Update session to completed
    const { error: updateError } = await supabase
      .from('assessment_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent_seconds: time_spent || session.time_spent_seconds || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('❌ Error updating session:', updateError);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    // Create assessment result
    const { data: result, error: resultError } = await supabase
      .from('assessment_results')
      .insert({
        session_id: session_id,
        user_id: user_id,
        assessment_id: assessment_id,
        total_score: totalScore,
        max_score: maxScore,
        responses_count: responses?.length || 0,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (resultError) {
      console.error('❌ Error creating result:', resultError);
      return res.status(500).json({ error: 'Failed to create result' });
    }

    // Update candidate_assessments
    const { error: candidateError } = await supabase
      .from('candidate_assessments')
      .upsert({
        user_id: user_id,
        assessment_id: assessment_id,
        session_id: session_id,
        result_id: result.id,
        status: 'completed',
        score: totalScore,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,assessment_id'
      });

    if (candidateError) {
      console.error('⚠️ Error updating candidate_assessments:', candidateError);
      // Don't fail the request for this
    }

    console.log('✅ Assessment submitted successfully. Result ID:', result.id);

    return res.status(200).json({ 
      success: true, 
      message: 'Assessment submitted successfully',
      result_id: result.id,
      score: totalScore,
      max_score: maxScore,
      responses_count: responses?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in submit-assessment:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
