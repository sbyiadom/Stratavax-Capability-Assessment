import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for authorization header
    const authHeader = req.headers.authorization;
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.log("No auth header found, headers:", Object.keys(req.headers));
      return res.status(401).json({ error: "No authorization token" });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log("Token length:", token.length);
    console.log("Token first 20 chars:", token.substring(0, 20));

    // Create a client with the user's token
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Create service client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId = user_id;
    let assessmentId = assessment_id;

    if (sessionId && !userId) {
      console.log("Fetching session:", sessionId);
      const { data: session, error: sessionError } = await serviceClient
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
      console.log("Session user:", userId, "assessment:", assessmentId);
    }

    // Test user client first
    console.log("Testing user client with a simple query");
    const { error: testError } = await userClient
      .from('assessment_types')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error("User client test failed:", testError);
    } else {
      console.log("User client test passed");
    }

    // Get responses using the user's token
    console.log("Fetching responses for user:", userId);
    const { data: responses, error: responsesError } = await userClient
      .from('responses')
      .select('answer_id')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Responses error:", responsesError);
      console.error("Error code:", responsesError.code);
      console.error("Error details:", responsesError.details);
      console.error("Error hint:", responsesError.hint);
      
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        message: responsesError.message,
        code: responsesError.code,
        hint: responsesError.hint
      });
    }

    console.log(`Found ${responses?.length || 0} responses`);

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: "No responses found" });
    }

    // Get answer IDs
    const answerIds = responses.map(r => r.answer_id).filter(Boolean);
    console.log(`Fetching ${answerIds.length} answers`);

    // Get scores
    const { data: answers, error: answersError } = await userClient
      .from('unique_answers')
      .select('score')
      .in('id', answerIds);

    if (answersError) {
      console.error("❌ Answers error:", answersError);
      return res.status(500).json({ 
        error: "Failed to fetch answers",
        message: answersError.message 
      });
    }

    // Calculate total score
    let totalScore = 0;
    answers.forEach(answer => {
      totalScore += answer.score || 0;
    });

    console.log("✅ Calculated score:", totalScore);

    // Update session
    if (sessionId) {
      await serviceClient
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    // Save to candidate_assessments
    const { error: candidateError } = await serviceClient
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        status: 'completed',
        score: totalScore,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (candidateError) {
      console.error("❌ Candidate error:", candidateError);
      return res.status(500).json({ 
        error: "Failed to save submission",
        message: candidateError.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      score: totalScore,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message,
      stack: err.stack
    });
  }
}
