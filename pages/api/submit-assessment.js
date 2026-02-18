import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called");

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get the authorization token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Create service role client (for writing)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // For reading responses, try to use the user's token first, fallback to service role
    let readClient = serviceClient;
    
    if (token) {
      // Create a client with the user's token for reading
      readClient = createClient(
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
    }

    let userId = user_id;
    let assessmentId = assessment_id;

    if (sessionId && !userId) {
      const { data: session, error: sessionError } = await serviceClient
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
    }

    // Get responses using the read client (with user token first)
    let responsesData;
    const { data: responses, error: responsesError } = await readClient
      .from('responses')
      .select('answer_id')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Responses error with user token:", responsesError);
      
      // Fallback to service client
      console.log("🔄 Falling back to service role for responses");
      const { data: fallbackResponses, error: fallbackError } = await serviceClient
        .from('responses')
        .select('answer_id')
        .eq('user_id', userId)
        .eq('assessment_id', assessmentId);

      if (fallbackError) {
        return res.status(500).json({ 
          error: "Failed to fetch responses",
          message: fallbackError.message 
        });
      }

      responsesData = fallbackResponses;
    } else {
      responsesData = responses;
    }

    if (!responsesData || responsesData.length === 0) {
      return res.status(400).json({ error: "No responses found" });
    }

    // Get answer IDs and fetch scores
    const answerIds = responsesData.map(r => r.answer_id).filter(Boolean);

    const { data: answers, error: answersError } = await serviceClient
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

    // Update session to completed
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

    // Calculate percentage for assessment_results
    const maxScore = responsesData.length * 5;
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Save to assessment_results
    await serviceClient
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: maxScore,
        percentage_score: percentage,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    return res.status(200).json({ 
      success: true,
      score: totalScore,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
