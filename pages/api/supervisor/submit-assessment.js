import { createClient } from '@supabase/supabase-js';

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
    // Create admin client with service role key and explicit schema
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    // Verify the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .eq('status', 'in_progress')
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return res.status(404).json({ error: 'Assessment session not found' });
    }

    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        question_id,
        answer_id,
        unique_questions:question_id (
          id,
          assessment_type_id
        ),
        unique_answers:answer_id (
          id,
          score
        )
      `)
      .eq('session_id', session_id);

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }

    console.log(`📊 Found ${responses?.length || 0} responses`);

    // Calculate total score
    const totalScore = responses?.reduce((sum, response) => {
      return sum + (response.unique_answers?.score || 0);
    }, 0) || 0;

    // Calculate max possible score (assuming 5 points per question)
    const maxScore = (responses?.length || 0) * 5;

    // Update session to completed
    const { error: updateError } = await supabase
      .from('assessment_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent_seconds: time_spent || session.time_spent_seconds || 0
      })
      .eq('id', session_id);

    if (updateError) {
      console.error("❌ Error updating session:", updateError);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    // Create assessment result
    const { data: result, error: resultError } = await supabase
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
      return res.status(500).json({ error: 'Failed to create result' });
    }

    // Also update or create candidate_assessments record
    const { error: candidateError } = await supabase
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
    return res.status(500).json({ error: 'Internal server error' });
  }
}
