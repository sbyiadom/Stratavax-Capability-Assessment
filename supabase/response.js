// supabase/response.js
import { supabase } from "./client";

// Save a single response - FIXED version with better error handling
export async function saveResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  console.log("💾 [saveResponse] Starting with:", { session_id, user_id, question_id, answer_id });

  // Validate required fields
  if (!session_id || !user_id || !assessment_id || !question_id || !answer_id) {
    const missing = [];
    if (!session_id) missing.push('session_id');
    if (!user_id) missing.push('user_id');
    if (!assessment_id) missing.push('assessment_id');
    if (!question_id) missing.push('question_id');
    if (!answer_id) missing.push('answer_id');
    
    console.error("❌ [saveResponse] Missing required fields:", missing);
    return { 
      success: false, 
      error: `Missing required fields: ${missing.join(', ')}` 
    };
  }

  // Ensure IDs are numbers
  const questionId = typeof question_id === 'string' ? parseInt(question_id, 10) : question_id;
  const answerId = typeof answer_id === 'string' ? parseInt(answer_id, 10) : answer_id;
  const sessionId = typeof session_id === 'string' ? parseInt(session_id, 10) : session_id;
  
  if (isNaN(questionId) || isNaN(answerId) || isNaN(sessionId)) {
    console.error("❌ [saveResponse] Invalid ID format:", { questionId, answerId, sessionId });
    return { 
      success: false, 
      error: "Invalid ID format - expected numbers" 
    };
  }

  try {
    // First verify the session exists and is in progress
    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .eq("user_id", user_id)
      .single();

    if (sessionError) {
      console.error("❌ [saveResponse] Session verification failed:", sessionError);
      return { 
        success: false, 
        error: `Session verification failed: ${sessionError.message}` 
      };
    }

    if (!session) {
      return { 
        success: false, 
        error: "Session not found" 
      };
    }

    if (session.status !== 'in_progress') {
      return { 
        success: false, 
        error: `Session is ${session.status}, not in progress` 
      };
    }

    // Check if the answer exists and belongs to the question
    const { data: answer, error: answerError } = await supabase
      .from("answers")
      .select("id, question_id")
      .eq("id", answerId)
      .eq("question_id", questionId)
      .single();

    if (answerError) {
      console.error("❌ [saveResponse] Answer verification failed:", answerError);
      return { 
        success: false, 
        error: `Answer verification failed: ${answerError.message}` 
      };
    }

    // Now try to upsert the response
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        {
          session_id: sessionId,
          user_id: user_id,
          assessment_id: assessment_id,
          question_id: questionId,
          answer_id: answerId,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'session_id,question_id',
          ignoreDuplicates: false
        }
      )
      .select();

    if (error) {
      console.error("❌ [saveResponse] Database error:", error);
      
      // Provide user-friendly error messages
      if (error.code === '23503') {
        if (error.message.includes('session_id')) {
          return { success: false, error: "Invalid session. Please restart the assessment." };
        } else if (error.message.includes('question_id')) {
          return { success: false, error: "Invalid question. Please refresh." };
        } else if (error.message.includes('answer_id')) {
          return { success: false, error: "Invalid answer selection." };
        } else if (error.message.includes('user_id')) {
          return { success: false, error: "User authentication error." };
        }
      } else if (error.code === '42P01') {
        return { success: false, error: "Responses table does not exist." };
      } else if (error.code === '42501') {
        return { success: false, error: "Permission denied. Check RLS policies." };
      }
      
      return { success: false, error: error.message };
    }

    console.log("✅ [saveResponse] Success:", data);
    return { success: true, data };

  } catch (error) {
    console.error("❌ [saveResponse] Unexpected error:", error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred" 
    };
  }
}

// Load all responses for a session
export async function getSessionResponses(session_id) {
  try {
    if (!session_id) {
      console.error("No session_id provided");
      return { answerMap: {}, detailedResponses: [], count: 0 };
    }

    const sessionId = typeof session_id === 'string' ? parseInt(session_id, 10) : session_id;

    const { data, error } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error loading responses:", error);
      return { answerMap: {}, detailedResponses: [], count: 0 };
    }

    const answerMap = {};
    const detailedResponses = [];
    
    data?.forEach(r => {
      if (r.question_id && r.answer_id) {
        answerMap[r.question_id] = r.answer_id;
        detailedResponses.push({
          question_id: r.question_id,
          answer_id: r.answer_id
        });
      }
    });

    return {
      answerMap,
      detailedResponses,
      count: data?.length || 0
    };
  } catch (error) {
    console.error("Error in getSessionResponses:", error);
    return { answerMap: {}, detailedResponses: [], count: 0 };
  }
}
