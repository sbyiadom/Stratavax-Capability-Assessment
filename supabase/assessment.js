import { supabase } from './client';

// Assessment Types
export async function getAssessmentTypes() {
  try {
    const { data, error } = await supabase
      .from('assessment_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAssessmentTypes:", error);
    return [];
  }
}

export async function getAssessmentTypeByCode(code) {
  try {
    const { data, error } = await supabase
      .from('assessment_types')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getAssessmentTypeByCode:", error);
    throw error;
  }
}

// Assessments
export async function getAssessments() {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_type:assessment_types(*)
      `)
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAssessments:", error);
    return [];
  }
}

export async function getAssessmentById(id) {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_type:assessment_types(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getAssessmentById:", error);
    throw error;
  }
}

// Questions and Answers
export async function getAssessmentQuestions(assessmentId) {
  try {
    console.log("Fetching questions for assessment:", assessmentId);
    
    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        answers (*)
      `)
      .eq('assessment_id', assessmentId)
      .eq('is_active', true)
      .order('question_order');

    if (error) {
      console.error("Error fetching questions:", error);
      throw error;
    }

    if (!data || !Array.isArray(data)) {
      console.log("No questions found or invalid data format");
      return [];
    }

    const processedData = data.map(q => ({
      ...q,
      answers: q.answers && Array.isArray(q.answers) ? q.answers : []
    }));

    console.log(`Found ${processedData.length} questions`);
    return processedData;
    
  } catch (error) {
    console.error("Error in getAssessmentQuestions:", error);
    return [];
  }
}

// Assessment Sessions
export async function createAssessmentSession(userId, assessmentId, assessmentTypeId) {
  try {
    console.log("Creating assessment session:", { userId, assessmentId, assessmentTypeId });
    
    const { data: existing, error: existingError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing session:", existingError);
    }

    if (existing) {
      console.log("Found existing session:", existing);
      return existing;
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('assessment_type_id')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error("Error fetching assessment:", assessmentError);
      throw assessmentError;
    }

    const { data: assessmentType, error: typeError } = await supabase
      .from('assessment_types')
      .select('time_limit_minutes')
      .eq('id', assessment.assessment_type_id)
      .single();

    if (typeError) {
      console.error("Error fetching assessment type:", typeError);
      throw typeError;
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + assessmentType.time_limit_minutes);

    const { data, error } = await supabase
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: assessmentTypeId,
        status: 'in_progress',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      throw error;
    }
    
    console.log("Session created successfully:", data);
    return data;
    
  } catch (error) {
    console.error("Create assessment session error:", error);
    throw error;
  }
}

export async function getAssessmentSession(sessionId) {
  try {
    console.log("Fetching session:", sessionId);
    
    const { data, error } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      console.error("Error fetching session:", error);
      throw error;
    }
    
    console.log("Session fetched:", data);
    return data;
    
  } catch (error) {
    console.error("Get assessment session error:", error);
    throw error;
  }
}

export async function updateSessionTimer(sessionId, elapsedSeconds) {
  try {
    const { error } = await supabase
      .from('assessment_sessions')
      .update({ time_spent_seconds: elapsedSeconds })
      .eq('id', sessionId);

    if (error) {
      console.error("Error updating session timer:", error);
      throw error;
    }
    
  } catch (error) {
    console.error("Update session timer error:", error);
    throw error;
  }
}

// ===== FIXED SAVE RESPONSE - THIS IS THE KEY FUNCTION =====
export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  try {
    // Validate inputs
    if (!sessionId || !userId || !assessmentId || !questionId || !answerId) {
      console.error("Missing required fields:", { sessionId, userId, assessmentId, questionId, answerId });
      return { success: false, error: "Missing required fields" };
    }

    // Convert to numbers
    const questionIdNum = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId;
    const answerIdNum = typeof answerId === 'string' ? parseInt(answerId, 10) : answerId;

    if (isNaN(questionIdNum) || isNaN(answerIdNum)) {
      console.error("Invalid ID format:", { questionId, answerId });
      return { success: false, error: "Invalid ID format" };
    }

    console.log(`Saving response: Q${questionIdNum} -> A${answerIdNum}`);

    // Simple upsert without .select() for speed
    const { error } = await supabase
      .from("responses")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          assessment_id: assessmentId,
          question_id: questionIdNum,
          answer_id: answerIdNum,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,question_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      console.error("Database error:", error);
      
      // Handle specific error codes
      if (error.code === '23503') {
        if (error.message.includes('session_id')) {
          return { success: false, error: "session_invalid", message: "Session not found" };
        } else if (error.message.includes('question_id')) {
          return { success: false, error: "question_invalid", message: "Question not found" };
        } else if (error.message.includes('answer_id')) {
          return { success: false, error: "answer_invalid", message: "Answer not found" };
        }
      } else if (error.code === '23505') {
        // This is actually fine - answer was already saved
        console.log("Answer already saved");
        return { success: true, alreadySaved: true };
      } else if (error.code === '42P01') {
        return { success: false, error: "table_not_found", message: "Database error" };
      } else if (error.code === '42501') {
        return { success: false, error: "permission_denied", message: "Permission denied" };
      }
      
      return { success: false, error: error.code, message: error.message };
    }

    console.log("✅ Response saved successfully");
    return { success: true };
    
  } catch (error) {
    console.error("Save function error:", error);
    return { success: false, error: "exception", message: error.message };
  }
}

// ===== FIXED GET SESSION RESPONSES =====
export async function getSessionResponses(sessionId) {
  try {
    console.log("Fetching responses for session:", sessionId);
    
    if (!sessionId) {
      console.log("No sessionId provided");
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
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching responses:", error);
      return {
        answerMap: {},
        detailedResponses: [],
        count: 0
      };
    }

    if (!data || !Array.isArray(data)) {
      return {
        answerMap: {},
        detailedResponses: [],
        count: 0
      };
    }

    const answerMap = {};
    
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (r && r.question_id) {
        answerMap[r.question_id] = r.answer_id;
      }
    }
    
    return {
      answerMap,
      detailedResponses: [],
      count: data.length
    };
  } catch (error) {
    console.error("Error in getSessionResponses:", error);
    return {
      answerMap: {},
      detailedResponses: [],
      count: 0
    };
  }
}

// Submit and Generate Results
export async function submitAssessment(sessionId) {
  try {
    console.log("📤 Submitting assessment for session:", sessionId);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }

    const { data: assessmentSession, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('assessment_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error("❌ Error fetching assessment session:", sessionError);
      throw sessionError;
    }

    const response = await fetch('/api/supervisor/submit-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: session.user.id,
        assessment_id: assessmentSession.assessment_id,
        time_spent: 0
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("❌ API error:", result);
      throw new Error(result.error || 'Submission failed');
    }
    
    console.log("✅ Assessment submitted successfully:", result);
    return result.result_id;
    
  } catch (error) {
    console.error("❌ Submit assessment error:", error);
    throw error;
  }
}

// Get Assessment Results
export async function getAssessmentResult(resultId) {
  try {
    const { data, error } = await supabase
      .from('assessment_results')
      .select(`
        *,
        assessment:assessments(
          *,
          assessment_type:assessment_types(*)
        )
      `)
      .eq('id', resultId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getAssessmentResult:", error);
    throw error;
  }
}

export async function getUserAssessmentResults(userId) {
  try {
    const { data, error } = await supabase
      .from('assessment_results')
      .select(`
        *,
        assessment:assessments(
          *,
          assessment_type:assessment_types(*)
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getUserAssessmentResults:", error);
    return [];
  }
}

// Candidate Profile
export async function getOrCreateCandidateProfile(userId, email, fullName) {
  try {
    const { data: existing } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('candidate_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getOrCreateCandidateProfile:", error);
    throw error;
  }
}

// Progress Tracking
export async function saveProgress(sessionId, userId, assessmentId, elapsedSeconds, lastQuestionId) {
  try {
    const { error } = await supabase
      .from('assessment_progress')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        elapsed_seconds: elapsedSeconds,
        last_question_id: lastQuestionId,
        last_saved_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,assessment_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error("Error saving progress:", error);
    throw error;
  }
}

export async function getProgress(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting progress:", error);
    return null;
  }
}

// Completion Checking
export async function isAssessmentCompleted(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from('candidate_assessments')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("Error checking completion:", error);
    return false;
  }
}
