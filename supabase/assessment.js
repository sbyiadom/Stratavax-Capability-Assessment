import { supabase } from './client';

// Fisher-Yates shuffle algorithm for true randomness
function shuffleArray(array) {
  if (!array || !Array.isArray(array)) return [];
  
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
    
    // First check if there's an existing in-progress session
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

    // Check if there's a completed session (for reference)
    const { data: completed } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (completed) {
      console.log("Found completed session - cannot create new one:", completed);
      throw new Error("Assessment already completed");
    }

    // Get assessment for time limit
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('assessment_type_id')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error("Error fetching assessment:", assessmentError);
      throw assessmentError;
    }

    // Get time limit from assessment type
    let timeLimit = 60; // default 60 minutes
    const { data: assessmentType, error: typeError } = await supabase
      .from('assessment_types')
      .select('time_limit_minutes')
      .eq('id', assessment.assessment_type_id)
      .single();

    if (typeError) {
      console.error("Error fetching assessment type:", typeError);
      // Use default time limit
    } else {
      timeLimit = assessmentType?.time_limit_minutes || 60;
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + timeLimit);

    // Create new session
    const { data, error } = await supabase
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: assessment.assessment_type_id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        time_spent_seconds: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      .update({ 
        time_spent_seconds: elapsedSeconds
      })
      .eq('id', sessionId);

    if (error) {
      console.error("Error updating session timer:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Update session timer error:", error);
    return false;
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
    
    console.log(`Found ${data?.length || 0} responses`);
    return { answerMap, count: data?.length || 0 };
    
  } catch (error) {
    console.error("Error in getSessionResponses:", error);
    return { answerMap: {}, count: 0 };
  }
}

// Submit Assessment - OPTIMIZED for speed
export async function submitAssessment(sessionId) {
  try {
    console.log("📤 Submitting assessment for session:", sessionId);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }

    const { data: assessmentSession, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('user_id, assessment_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error("❌ Error fetching assessment session:", sessionError);
      throw new Error("Could not verify session");
    }

    const submissionData = {
      sessionId: sessionId,
      user_id: assessmentSession.user_id,
      assessment_id: assessmentSession.assessment_id
    };

    console.log("📦 Submitting with data:", submissionData);

    const response = await fetch('/api/submit-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(submissionData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("❌ API error:", result);
      throw new Error(result.message || result.error || 'Submission failed');
    }
    
    console.log("✅ Assessment submitted successfully:", result);
    return result;
    
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
    // First save to assessment_progress
    const { error: progressError } = await supabase
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

    if (progressError) {
      console.error("Error saving progress:", progressError);
      return false;
    }
    
    // Also update session timer
    await updateSessionTimer(sessionId, elapsedSeconds);
    
    return true;
  } catch (error) {
    console.error("Error saving progress:", error);
    return false;
  }
}

// Get Progress
export async function getProgress(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (error) {
      console.error("Error getting progress:", error);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Error getting progress:", error);
    return null;
  }
}

// Completion Checking - FIXED VERSION
export async function isAssessmentCompleted(userId, assessmentId) {
  try {
    // Check in candidate_assessments first
    const { data, error } = await supabase
      .from('candidate_assessments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error checking completion:", error);
    }

    if (data) {
      console.log("Assessment completed found in candidate_assessments");
      return true;
    }

    // If not found, check assessment_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error("Error checking session completion:", sessionError);
    }

    return !!sessionData;
    
  } catch (error) {
    console.error("Error in isAssessmentCompleted:", error);
    return false;
  }
}

/**
 * Get unique questions for any assessment type - COMPLETELY RANDOMIZED
 * Both questions and answers are randomized for each candidate
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

    console.log("📊 Assessment type ID:", assessment.assessment_type_id);

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
      .eq('assessment_type_id', assessment.assessment_type_id);

    if (qError) {
      console.error("❌ Error fetching unique questions:", qError);
      return [];
    }

    if (!questions || questions.length === 0) {
      console.log("⚠️ No unique questions found for assessment type ID:", assessment.assessment_type_id);
      return [];
    }

    console.log(`✅ Found ${questions.length} unique questions`);

    // SHUFFLE THE QUESTIONS ORDER first
    const shuffledQuestions = shuffleArray(questions);

    // Then format each question with randomized answers
    const formattedQuestions = shuffledQuestions.map((q, index) => {
      // Get all answers for this question
      const answers = (q.unique_answers || []).map(a => ({
        id: a.id,
        answer_text: a.answer_text,
        score: a.score,
        display_order: a.display_order
      }));

      // SHUFFLE the answers randomly
      const shuffledAnswers = shuffleArray(answers);

      return {
        id: q.id,
        question_text: q.question_text,
        section: q.section,
        subsection: q.subsection,
        display_order: index + 1,
        answers: shuffledAnswers
      };
    });

    console.log(`✅ Returning ${formattedQuestions.length} randomized questions with randomized answers`);
    
    // Log first question to show randomization worked
    if (formattedQuestions.length > 0) {
      console.log("Sample first question ID:", formattedQuestions[0].id);
    }
    
    return formattedQuestions;

  } catch (error) {
    console.error("❌ Error in getUniqueQuestions:", error);
    return [];
  }
}

/**
 * Save response for unique questions - FIXED VERSION
 */
export async function saveUniqueResponse(session_id, user_id, assessment_id, question_id, answer_id) {
  console.log("💾 Saving unique response:", { session_id, user_id, question_id, answer_id });
  
  try {
    if (!session_id || !user_id || !assessment_id || !question_id || !answer_id) {
      console.error("❌ Missing required fields");
      return { success: false, error: "Missing required fields" };
    }

    // Convert IDs to proper types
    const questionIdNum = parseInt(question_id, 10);
    const answerIdNum = parseInt(answer_id, 10);

    if (isNaN(questionIdNum) || isNaN(answerIdNum)) {
      console.error("❌ Invalid ID format");
      return { success: false, error: "Invalid ID format" };
    }

    // First verify the session exists and is in progress
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, status')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .single();

    if (sessionError) {
      console.error("❌ Session verification failed:", sessionError);
      return { success: false, error: "Session not found" };
    }

    if (session.status !== 'in_progress') {
      return { success: false, error: `Session is ${session.status}, cannot save responses` };
    }

    // Save to responses table
    const { data, error } = await supabase
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
      })
      .select();

    if (error) {
      console.error("❌ Error saving response:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Unique response saved successfully");
    return { success: true, data };

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
