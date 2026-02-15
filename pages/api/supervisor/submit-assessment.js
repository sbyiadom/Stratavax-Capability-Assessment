import { createClient } from '@supabase/supabase-js';

// Create an admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS if needed
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

  const { session_id, user_id, assessment_id, time_spent } = req.body;

  console.log("📥 Received submission request:", { session_id, user_id, assessment_id, time_spent });

  try {
    // Test Supabase connection first
    console.log("🔧 Testing Supabase connection...");
    const { data: testData, error: testError } = await supabaseAdmin
      .from('assessment_sessions')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error("❌ Supabase connection test failed:", testError);
      return res.status(500).json({ error: 'Database connection failed', details: testError });
    }
    console.log("✅ Supabase connection successful");

    // Verify the session exists and belongs to the user - use admin client
    console.log("🔍 Looking for session:", session_id);
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('assessment_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .eq('status', 'in_progress')
      .maybeSingle(); // Changed from .single() to avoid error if not found

    if (sessionError) {
      console.error("❌ Session query error:", sessionError);
      return res.status(500).json({ error: 'Session query failed', details: sessionError });
    }

    if (!session) {
      console.error("❌ Session not found for:", { session_id, user_id });
      return res.status(404).json({ error: 'Assessment session not found' });
    }

    console.log("✅ Session found:", session.id);

    // Get all responses for this session - use admin client
    console.log("🔍 Fetching responses for session:", session_id);
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('responses')
      .select(`
        id,
        question_id,
        answer_id
      `)
      .eq('session_id', session_id);

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return res.status(500).json({ error: 'Failed to fetch responses', details: responsesError });
    }

    console.log(`📊 Found ${responses?.length || 0} responses`);

    // Calculate total score by fetching each answer's score
    let totalScore = 0;
    if (responses && responses.length > 0) {
      for (const response of responses) {
        const { data: answerData, error: answerError } = await supabaseAdmin
          .from('unique_answers')
          .select('score')
          .eq('id', response.answer_id)
          .single();
        
        if (!answerError && answerData) {
          totalScore += answerData.score || 0;
        }
      }
    }

    // Calculate max possible score (assuming 5 points per question)
    const maxScore = (responses?.length || 0) * 5;

    // Update session to completed - use admin client
    console.log("🔄 Updating session status to completed");
    const { error: updateError } = await supabaseAdmin
      .from('assessment_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent_seconds: time_spent || session.time_spent_seconds || 0
      })
      .eq('id', session_id);

    if (updateError) {
      console.error("❌ Error updating session:", updateError);
      return res.status(500).json({ error: 'Failed to update session', details: updateError });
    }

    // Create assessment result - use admin client
    console.log("📝 Creating assessment result");
    const { data: result, error: resultError } = await supabaseAdmin
      .from('assessment_results')
      .insert({
        user_id: user_id,
        assessment_id: assessment_id,
        session_id: session_id,
        total_score: totalScore,
        max_score: maxScore,
        completed_at: new Date().toISOString(),
        responses_count: responses?.length || 0
      })
      .select()
      .single();

    if (resultError) {
      console.error("❌ Error creating result:", resultError);
      return res.status(500).json({ error: 'Failed to create result', details: resultError });
    }

    // Also update or create candidate_assessments record - use admin client
    console.log("🔄 Updating candidate_assessments");
    const { error: candidateError } = await supabaseAdmin
      .from('candidate_assessments')
      .upsert({
        user_id: user_id,
        assessment_id: assessment_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        score: totalScore,
        session_id: session_id
      }, {
        onConflict: 'user_id,assessment_id'
      });

    if (candidateError) {
      console.error("⚠️ Error updating candidate_assessments:", candidateError);
      // Don't fail the whole request for this
    }

    console.log("✅ Assessment submitted successfully. Result ID:", result.id);

    return res.status(200).json({ 
      success: true, 
      result_id: result.id,
      score: totalScore,
      max_score: maxScore,
      responses_count: responses?.length || 0
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack 
    });
  }
}
