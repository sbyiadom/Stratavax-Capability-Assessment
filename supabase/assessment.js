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
    expiresAt.setMinutes(expiresAt.getMinutes() + (assessmentType.time_limit_minutes || 60));

    const { data, error } = await supabase
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: assessmentTypeId,
        status: 'in_progress',
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString()
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

// Get session responses
export async function getSessionResponses(sessionId) {
  try {
    console.log("Fetching responses for session:", sessionId);
    
    if (!sessionId) {
      return { answerMap: {}, count: 0 };
    }

    const { data, error } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching responses:", error);
      return { answerMap: {}, count: 0 };
    }

    const answerMap = {};
    data?.forEach(r => {
      if (r?.question_id) {
        answerMap[r.question_id] = r.answer_id;
      }
    });
    
    return { answerMap, count: data?.length || 0 };
    
  } catch (error) {
    console.error("Error in getSessionResponses:", error);
    return { answerMap: {}, count: 0 };
  }
}

// Submit Assessment
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
    return true;
  } catch (error) {
    console.error("Error saving progress:", error);
    return false;
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

// ========== FIXED VERSION WITH DEBUGGING ==========

// Helper function to shuffle array
function shuffleArray(array) {
  if (!array || !Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get questions for an assessment - FIXED VERSION
export async function getRandomizedQuestions(candidateId, assessmentId) {
  console.log("🎲 getRandomizedQuestions called with:", { candidateId, assessmentId });
  
  try {
    if (!assessmentId) {
      console.error("No assessmentId provided");
      return [];
    }

    // First, try to get questions directly from the questions table (fallback)
    console.log("Attempting to fetch from questions table first...");
    const { data: directQuestions, error: directError } = await supabase
      .from('questions')
      .select(`
        *,
        answers (*)
      `)
      .eq('assessment_id', assessmentId)
      .eq('is_active', true)
      .order('question_order');

    if (!directError && directQuestions && directQuestions.length > 0) {
      console.log(`Found ${directQuestions.length} questions in questions table`);
      
      // Randomize the questions
      const shuffledQuestions = shuffleArray(directQuestions);
      
      // Format and return
      return shuffledQuestions.map((q, index) => ({
        id: q.id,
        question_text: q.question_text,
        section: q.section,
        subsection: q.subsection,
        display_order: index,
        answers: (q.answers || []).map(a => ({
          id: a.id,
          answer_text: a.answer_text,
          score: a.score
        }))
      }));
    }

    // If no questions in questions table, try question_instances
    console.log("No questions in questions table, trying question_instances...");
    
    const { data: instances, error: instancesError } = await supabase
      .from("question_instances")
      .select(`
        id,
        display_order,
        question_bank_id
      `)
      .eq("assessment_id", assessmentId);

    if (instancesError) {
      console.error("Error fetching question instances:", instancesError);
      return [];
    }

    console.log(`Found ${instances?.length || 0} question instances`);

    if (!instances || instances.length === 0) {
      console.log("No question instances found");
      return [];
    }

    // For each instance, get the question bank details
    const questions = await Promise.all(
      instances.map(async (instance) => {
        const { data: questionBank, error: bankError } = await supabase
          .from("question_banks")
          .select(`
            id,
            question_text,
            section,
            subsection,
            answer_banks (
              id,
              answer_text,
              score
            )
          `)
          .eq("id", instance.question_bank_id)
          .single();

        if (bankError) {
          console.error(`Error fetching question bank ${instance.question_bank_id}:`, bankError);
          return null;
        }

        return {
          id: instance.id,
          question_text: questionBank.question_text,
          section: questionBank.section,
          subsection: questionBank.subsection,
          display_order: instance.display_order,
          answers: questionBank.answer_banks || []
        };
      })
    );

    // Filter out any null values
    const validQuestions = questions.filter(q => q !== null);
    
    console.log(`Returning ${validQuestions.length} valid questions`);

    // Randomize the order
    return shuffleArray(validQuestions);

  } catch (error) {
    console.error("Error in getRandomizedQuestions:", error);
    return [];
  }
}

// Save response - FIXED VERSION
export async function saveRandomizedResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  console.log("💾 Saving response:", { session_id, user_id, question_id, answer_id });
  
  try {
    if (!session_id || !user_id || !assessment_id || !question_id || !answer_id) {
      console.error("Missing required fields");
      return { success: false, error: "Missing required fields" };
    }

    // Convert to numbers if needed
    const questionIdNum = typeof question_id === 'string' ? parseInt(question_id, 10) : question_id;
    const answerIdNum = typeof answer_id === 'string' ? parseInt(answer_id, 10) : answer_id;

    // Save to responses table
    const { error } = await supabase
      .from("responses")
      .upsert({
        session_id: session_id,
        user_id: user_id,
        assessment_id: assessment_id,
        question_id: questionIdNum,
        answer_id: answerIdNum,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,question_id'
      });

    if (error) {
      console.error("Error saving response:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Response saved successfully");
    return { success: true };

  } catch (error) {
    console.error("Error in saveRandomizedResponse:", error);
    return { success: false, error: error.message };
  }
}

// Legacy function
export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  return saveRandomizedResponse(sessionId, userId, assessmentId, questionId, answerId);
}
