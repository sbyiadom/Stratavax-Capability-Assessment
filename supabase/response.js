// supabase/response.js
import { supabase } from "./client";

// Save a single response - FIXED version
export async function saveResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  console.log("💾 Saving response:", { session_id, user_id, question_id, answer_id });

  // Validate required fields
  if (!session_id || !user_id || !assessment_id || !question_id || !answer_id) {
    console.error("Missing required fields:", { session_id, user_id, assessment_id, question_id, answer_id });
    throw new Error("Missing required fields for saving response");
  }

  // Convert to numbers if needed
  const questionId = typeof question_id === 'string' ? parseInt(question_id, 10) : question_id;
  const answerId = typeof answer_id === 'string' ? parseInt(answer_id, 10) : answer_id;
  
  // Validate numbers
  if (isNaN(questionId) || isNaN(answerId)) {
    console.error("Invalid question_id or answer_id:", { question_id, answer_id });
    throw new Error("Invalid question or answer ID");
  }

  try {
    // First, check if the session exists and is still in progress
    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, status")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors

    if (sessionError) {
      console.error("Session check error:", sessionError);
      throw new Error("Invalid or expired session");
    }

    if (!session) {
      console.error("Session not found:", session_id);
      throw new Error("Assessment session not found");
    }

    if (session.status !== 'in_progress') {
      throw new Error("This assessment session is no longer active");
    }

    // Check if response already exists
    const { data: existingResponse, error: checkError } = await supabase
      .from("responses")
      .select("id")
      .eq("session_id", session_id)
      .eq("question_id", questionId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing response:", checkError);
    }

    let result;
    
    if (existingResponse) {
      // Update existing response
      console.log("Updating existing response for question:", questionId);
      const { data, error } = await supabase
        .from("responses")
        .update({
          answer_id: answerId,
          updated_at: new Date().toISOString()
        })
        .eq("session_id", session_id)
        .eq("question_id", questionId)
        .select();

      if (error) throw error;
      result = data;
    } else {
      // Insert new response
      console.log("Creating new response for question:", questionId);
      const { data, error } = await supabase
        .from("responses")
        .insert({
          session_id: session_id,
          user_id: user_id,
          assessment_id: assessment_id,
          question_id: questionId,
          answer_id: answerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      result = data;
    }

    console.log("✅ Response saved successfully");
    
    // Also update the session's last_activity
    await supabase
      .from("assessment_sessions")
      .update({
        last_activity: new Date().toISOString()
      })
      .eq("id", session_id);

    return { success: true, data: result };

  } catch (error) {
    console.error("❌ Save failed:", error);
    return { 
      success: false, 
      error: error.message || "Failed to save response"
    };
  }
}

// Load all responses for a session - FIXED version
export async function loadSessionResponses(session_id) {
  try {
    if (!session_id) {
      console.error("No session_id provided to loadSessionResponses");
      return {
        answerMap: {},
        detailedResponses: [],
        count: 0
      };
    }

    const { data, error } = await supabase
      .from("responses")
      .select(`
        question_id, 
        answer_id
      `)
      .eq("session_id", session_id);

    if (error) {
      console.error("Error loading responses:", error);
      throw error;
    }
    
    // Create a map of question_id -> answer_id for quick lookup
    const answerMap = {};
    const detailedResponses = [];
    
    if (data && Array.isArray(data)) {
      data.forEach(r => {
        if (r.question_id && r.answer_id) {
          answerMap[r.question_id] = r.answer_id;
          detailedResponses.push({
            question_id: r.question_id,
            answer_id: r.answer_id
          });
        }
      });
    }
    
    console.log(`📊 Loaded ${data?.length || 0} responses from database`);
    
    return {
      answerMap,
      detailedResponses,
      count: data?.length || 0
    };
  } catch (error) {
    console.error("Error in loadSessionResponses:", error);
    return {
      answerMap: {},
      detailedResponses: [],
      count: 0
    };
  }
}

// Get progress for a user
export async function getProgress(user_id, assessment_id) {
  try {
    const { data, error } = await supabase
      .from("assessment_sessions")
      .select(`
        id,
        elapsed_seconds,
        last_question_id,
        status
      `)
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error getting progress:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getProgress:", error);
    return null;
  }
}

// Save progress
export async function saveProgress(session_id, user_id, assessment_id, elapsed_seconds, last_question_id) {
  try {
    const { error } = await supabase
      .from("assessment_sessions")
      .update({
        elapsed_seconds,
        last_question_id,
        last_activity: new Date().toISOString()
      })
      .eq("id", session_id)
      .eq("user_id", user_id);

    if (error) {
      console.error("Error saving progress:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveProgress:", error);
    return false;
  }
}

// Check if assessment is completed
export async function isAssessmentCompleted(user_id, assessment_id) {
  try {
    const { data, error } = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id)
      .eq("status", "completed")
      .maybeSingle();

    if (error) {
      console.error("Error checking completion:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in isAssessmentCompleted:", error);
    return false;
  }
}
