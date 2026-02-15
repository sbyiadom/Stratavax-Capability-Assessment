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
    // Your table doesn't have session_id column, so we'll just update without it
    const { error } = await supabase
      .from('assessment_progress')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        elapsed_seconds: elapsedSeconds,
        last_question_id: lastQuestionId,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,assessment_id'
      });

    if (error) {
      console.error("Error saving progress:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error saving progress:", error);
    return false;
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

// ========== HELPER FUNCTIONS ==========

function shuffleArray(array) {
  if (!array || !Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get unique questions for any assessment type
 * Each question has its own unique answers that are never reused
 */
export async function getUniqueQuestions(assessmentId) {
  try {
    console.log("🔍 Fetching unique questions for assessment:", assessmentId);
    
    if (!assessmentId) {
      console.error("❌ No assessmentId provided");
      return [];
    }

    // First get the assessment to know its type
    const { data: assessment, error: aError } = await supabase
      .from('assessments')
      .select('assessment_type_id, title')
      .eq('id', assessmentId)
      .single();

    if (aError) {
      console.error("❌ Error fetching assessment:", aError);
      return [];
    }

    console.log("📊 Assessment:", assessment.title);
    console.log("📊 Assessment type ID:", assessment.assessment_type_id);

    // Log the exact query we're about to run
    console.log("🔎 Running query: unique_questions WHERE assessment_type_id =", assessment.assessment_type_id);

    // Get all unique questions for this assessment type with their answers
    const { data: questions, error: qError } = await supabase
      .from('unique_questions')
      .select(`
        id,
        section,
        subsection,
        question_text,
        display_order,
        unique_answers (
          id,
          answer_text,
          score,
          display_order
        )
      `)
      .eq('assessment_type_id', assessment.assessment_type_id)
      .order('display_order');

    if (qError) {
      console.error("❌ Error fetching unique questions:", qError);
      console.error("Error details:", JSON.stringify(qError, null, 2));
      return [];
    }

    // Log the raw response
    console.log("📦 Raw questions response:", JSON.stringify(questions, null, 2));
    console.log("📦 Questions type:", typeof questions);
    console.log("📦 Is array:", Array.isArray(questions));
    console.log("📦 Questions length:", questions?.length);

    if (!questions || questions.length === 0) {
      console.log("⚠️ No unique questions found for assessment type ID:", assessment.assessment_type_id);
      
      // Try to get the assessment type name for better debugging
      const { data: typeData } = await supabase
        .from('assessment_types')
        .select('name')
        .eq('id', assessment.assessment_type_id)
        .single();
      
      console.log("Assessment type name:", typeData?.name);
      
      // Check if the unique_questions table exists and has any data at all
      const { count, error: countError } = await supabase
        .from('unique_questions')
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log("Total questions in unique_questions table:", count);
      }
      
      return [];
    }

    console.log(`✅ Found ${questions.length} unique questions`);
    
    // Calculate total answers
    const totalAnswers = questions.reduce((acc, q) => acc + (q.unique_answers?.length || 0), 0);
    console.log(`📊 Total answers: ${totalAnswers}, Avg: ${(totalAnswers / questions.length).toFixed(1)} per question`);

    // Check if we have all 100 questions
    if (questions.length !== 100) {
      console.log(`⚠️ Warning: Expected 100 questions, found ${questions.length}`);
    }

    // Randomize the order of questions for each candidate
    const shuffledQuestions = shuffleArray([...questions]);

    // Format the questions for the frontend
    const formattedQuestions = shuffledQuestions.map((q, index) => {
      // Randomize the answers for this question
      const shuffledAnswers = shuffleArray(q.unique_answers || []);
      
      return {
        id: q.id,
        question_text: q.question_text,
        section: q.section,
        subsection: q.subsection,
        display_order: index + 1, // New random order
        answers: shuffledAnswers
          .map(a => ({
            id: a.id,
            answer_text: a.answer_text,
            score: a.score,
            display_order: a.display_order
          }))
          .sort((a, b) => a.display_order - b.display_order) // Keep answers in original order within question
      };
    });

    console.log(`✅ Returning ${formattedQuestions.length} formatted questions for ${assessment.title}`);
    console.log("First question sample:", JSON.stringify(formattedQuestions[0], null, 2));
    
    return formattedQuestions;

  } catch (error) {
    console.error("❌ Error in getUniqueQuestions:", error);
    console.error("Error stack:", error.stack);
    return [];
  }
}

/**
 * Save response for unique questions
 */
export async function saveUniqueResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  console.log("💾 Saving unique response:", { session_id, user_id, question_id, answer_id });
  
  try {
    if (!session_id || !user_id || !assessment_id || !question_id || !answer_id) {
      console.error("❌ Missing required fields");
      return { success: false, error: "Missing required fields" };
    }

    // DON'T convert to numbers - keep as UUID strings
    // Just ensure they're strings
    const sessionIdStr = String(session_id);
    const questionIdNum = typeof question_id === 'string' ? parseInt(question_id, 10) : question_id;
    const answerIdNum = typeof answer_id === 'string' ? parseInt(answer_id, 10) : answer_id;

    // Save to responses table
    const { error } = await supabase
      .from("responses")
      .upsert({
        session_id: sessionIdStr, // Keep as UUID string, not number
        user_id: user_id,
        assessment_id: assessment_id,
        question_id: questionIdNum,
        answer_id: answerIdNum,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,question_id'
      });

    if (error) {
      console.error("❌ Error saving response:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Unique response saved successfully");
    return { success: true };

  } catch (error) {
    console.error("❌ Error in saveUniqueResponse:", error);
    return { success: false, error: error.message };
  }
}
// ========== LEGACY FUNCTIONS (for backward compatibility) ==========

export async function getRandomizedQuestions(candidateId, assessmentId) {
  console.log("⚠️ getRandomizedQuestions is deprecated, using getUniqueQuestions");
  return getUniqueQuestions(assessmentId);
}

export async function saveRandomizedResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  console.log("⚠️ saveRandomizedResponse is deprecated, using saveUniqueResponse");
  return saveUniqueResponse(session_id, user_id, assessment_id, question_id, answer_id);
}

export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  return saveUniqueResponse(sessionId, userId, assessmentId, questionId, answerId);
}



