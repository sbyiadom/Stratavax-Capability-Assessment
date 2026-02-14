import { supabase } from './client';

// Assessment Types
export async function getAssessmentTypes() {
  const { data, error } = await supabase
    .from('assessment_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) throw error;
  return data;
}

export async function getAssessmentTypeByCode(code) {
  const { data, error } = await supabase
    .from('assessment_types')
    .select('*')
    .eq('code', code)
    .single();
  
  if (error) throw error;
  return data;
}

// Assessments
export async function getAssessments() {
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      *,
      assessment_type:assessment_types(*)
    `)
    .eq('is_active', true);
  
  if (error) throw error;
  return data;
}

export async function getAssessmentById(id) {
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
}

// Questions and Answers
export async function getAssessmentQuestions(assessmentId) {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      answers (*)
    `)
    .eq('assessment_id', assessmentId)
    .eq('is_active', true)
    .order('question_order');
  
  if (error) throw error;
  return data;
}

// Assessment Sessions
export async function createAssessmentSession(userId, assessmentId, assessmentTypeId) {
  try {
    console.log("Creating assessment session:", { userId, assessmentId, assessmentTypeId });
    
    // Check if session already exists
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

    // Get assessment type for time limit
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

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + assessmentType.time_limit_minutes);

    console.log("Creating new session with expiry:", expiresAt);

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

// ===== OPTIMIZED SAVE RESPONSE =====
export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  try {
    // Convert to numbers if needed
    const questionIdNum = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId;
    const answerIdNum = typeof answerId === 'string' ? parseInt(answerId, 10) : answerId;

    const startTime = performance.now();

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

    const endTime = performance.now();
    console.log(`⏱️ Save took ${(endTime - startTime).toFixed(2)}ms`);

    if (error) {
      console.error("Database error:", error);
      
      // Only check session if we get a foreign key error
      if (error.code === '23503' && error.message.includes('session_id')) {
        // Session might be invalid, verify once
        const { data: session } = await supabase
          .from("assessment_sessions")
          .select("status")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .single();
          
        if (!session || session.status !== 'in_progress') {
          throw new Error("Your session has expired. Please refresh.");
        }
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Save failed:", error);
    throw error;
  }
}

export async function getSessionResponses(sessionId) {
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
      .eq("session_id", sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
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
}

export async function getUserAssessmentResults(userId) {
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
  return data;
}

// Candidate Profile
export async function getOrCreateCandidateProfile(userId, email, fullName) {
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
