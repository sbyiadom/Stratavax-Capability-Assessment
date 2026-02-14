import { supabase } from "./client";

// Save a single response
export async function saveResponse(session_id, assessment_id, question_id, answer_id, user_id) {
  console.log("💾 Saving response:", { session_id, question_id, answer_id, user_id });

  // Convert to numbers if needed
  const questionId = typeof question_id === 'string' ? parseInt(question_id, 10) : question_id;
  const answerId = typeof answer_id === 'string' ? parseInt(answer_id, 10) : answer_id;

  try {
    // First, check if the session exists and is still in progress
    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, status")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .single();

    if (sessionError) {
      console.error("Session check error:", sessionError);
      throw new Error("Invalid or expired session");
    }

    if (session.status !== 'in_progress') {
      throw new Error("This assessment session is no longer active");
    }

    // Simple upsert - let database handle constraints
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        {
          session_id: session_id,
          assessment_id: assessment_id,
          question_id: questionId,
          answer_id: answerId,
          user_id: user_id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,question_id',
        }
      )
      .select();

    if (error) {
      console.error("Database error:", error);
      
      // User-friendly error messages
      if (error.code === '23503') {
        if (error.message.includes('session_id')) {
          throw new Error("Invalid session. Please restart the assessment.");
        } else if (error.message.includes('question_id')) {
          throw new Error("Invalid question. Please refresh the page.");
        } else if (error.message.includes('answer_id')) {
          throw new Error("Please select a valid answer.");
        } else {
          throw new Error("Database constraint error. Please try again.");
        }
      } else if (error.code === '23505') {
        throw new Error("Answer already saved.");
      } else {
        throw new Error("Failed to save. Please try again.");
      }
    }

    console.log("✅ Response saved");
    return { success: true, data };

  } catch (error) {
    console.error("Save failed:", error);
    throw error;
  }
}

// Load all responses for a session
export async function loadSessionResponses(session_id) {
  try {
    const { data, error } = await supabase
      .from("responses")
      .select(`
        question_id, 
        answer_id,
        answer:answers!inner(
          score,
          answer_text
        ),
        question:questions!inner(
          section,
          subsection,
          question_text
        )
      `)
      .eq("session_id", session_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Create a map of question_id -> answer_id for quick lookup
    const answerMap = {};
    const detailedResponses = [];
    
    data.forEach(r => {
      answerMap[r.question_id] = r.answer_id;
      detailedResponses.push({
        question_id: r.question_id,
        answer_id: r.answer_id,
        question_text: r.question?.question_text,
        section: r.question?.section,
        subsection: r.question?.subsection,
        answer_text: r.answer?.answer_text,
        score: r.answer?.score
      });
    });
    
    return {
      answerMap,
      detailedResponses,
      count: data.length
    };
  } catch (error) {
    console.error("Error loading responses:", error);
    return {
      answerMap: {},
      detailedResponses: [],
      count: 0
    };
  }
}

// Load responses for a user across all sessions of an assessment
export async function loadUserAssessmentResponses(user_id, assessment_id) {
  try {
    const { data, error } = await supabase
      .from("responses")
      .select(`
        session_id,
        question_id, 
        answer_id,
        session:assessment_sessions!inner(
          id,
          status,
          completed_at
        )
      `)
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Group by session
    const sessions = {};
    data.forEach(r => {
      const sessionId = r.session_id;
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          session_id: sessionId,
          status: r.session?.status,
          completed_at: r.session?.completed_at,
          responses: {}
        };
      }
      sessions[sessionId].responses[r.question_id] = r.answer_id;
    });
    
    return Object.values(sessions);
  } catch (error) {
    console.error("Error loading user responses:", error);
    return [];
  }
}

// Get response count for an assessment
export async function getResponseCount(user_id, assessment_id) {
  try {
    const { count, error } = await supase
      .from("responses")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error getting response count:", error);
    return 0;
  }
}

// Delete responses for a session (used when resetting)
export async function deleteSessionResponses(session_id) {
  try {
    const { error } = await supabase
      .from("responses")
      .delete()
      .eq("session_id", session_id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting responses:", error);
    throw error;
  }
}

// Bulk save responses (for restoring or importing)
export async function bulkSaveResponses(responses) {
  try {
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        responses.map(r => ({
          ...r,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'session_id,question_id',
          ignoreDuplicates: false
        }
      );

    if (error) throw error;
    return { success: true, count: responses.length };
  } catch (error) {
    console.error("Error bulk saving responses:", error);
    throw error;
  }
}

// Check if all questions are answered for a session
export async function isAssessmentComplete(session_id, totalQuestions) {
  try {
    const { count, error } = await supabase
      .from("responses")
      .select("*", { count: 'exact', head: true })
      .eq("session_id", session_id);

    if (error) throw error;
    return count === totalQuestions;
  } catch (error) {
    console.error("Error checking completion:", error);
    return false;
  }
}

// Get unanswered questions for a session
export async function getUnansweredQuestions(session_id, questionIds) {
  try {
    const { data, error } = await supabase
      .from("responses")
      .select("question_id")
      .eq("session_id", session_id);

    if (error) throw error;

    const answeredIds = new Set(data.map(r => r.question_id));
    return questionIds.filter(id => !answeredIds.has(id));
  } catch (error) {
    console.error("Error getting unanswered questions:", error);
    return questionIds; // Return all as unanswered if error
  }
}
