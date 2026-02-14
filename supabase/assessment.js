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
  // Check if session already exists
  const { data: existing } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (existing) return existing;

  // Get assessment type for time limit
  const { data: assessment } = await supabase
    .from('assessments')
    .select('assessment_type_id')
    .eq('id', assessmentId)
    .single();

  const { data: assessmentType } = await supabase
    .from('assessment_types')
    .select('time_limit_minutes')
    .eq('id', assessment.assessment_type_id)
    .single();

  // Calculate expiry time
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

  if (error) throw error;
  return data;
}

export async function getAssessmentSession(sessionId) {
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSessionTimer(sessionId, elapsedSeconds) {
  const { error } = await supabase
    .from('assessment_sessions')
    .update({ time_spent_seconds: elapsedSeconds })
    .eq('id', sessionId);

  if (error) throw error;
}

// ===== UPDATED RESPONSES FUNCTIONS WITH BETTER ERROR HANDLING =====
export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  try {
    console.log("📝 Attempting to save response:", {
      sessionId,
      userId,
      assessmentId,
      questionId,
      answerId,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!sessionId || !userId || !assessmentId || !questionId || !answerId) {
      console.error("❌ Missing required fields:", { sessionId, userId, assessmentId, questionId, answerId });
      throw new Error("Missing required fields for saving response");
    }

    // Convert IDs to proper types
    const qId = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId;
    const aId = typeof answerId === 'string' ? parseInt(answerId, 10) : answerId;

    if (isNaN(qId) || isNaN(aId)) {
      console.error("❌ Invalid ID format:", { qId, aId });
      throw new Error("Invalid question or answer ID format");
    }

    // First, verify the session exists and is in progress
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error("❌ Session verification failed:", sessionError);
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    if (session.status !== 'in_progress') {
      console.error("❌ Session is not in progress:", session.status);
      throw new Error(`Session is ${session.status}, not in progress`);
    }

    console.log("✅ Session verified, attempting to save response");

    // Attempt to save the response
    const { data, error, status, statusText } = await supabase
      .from('responses')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        assessment_id: assessmentId,
        question_id: qId,
        answer_id: aId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,question_id',
        ignoreDuplicates: false
      })
      .select();

    console.log("📦 Supabase response:", { 
      data, 
      error, 
      status, 
      statusText,
      hasData: !!data,
      hasError: !!error 
    });

    if (error) {
      console.error("❌ Database error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log("✅ Response saved successfully:", data);
    return { success: true, data };
    
  } catch (error) {
    console.error("❌ Save response error:", error);
    throw error;
  }
}

export async function getSessionResponses(sessionId) {
  try {
    console.log("📤 Fetching responses for session:", sessionId);
    
    const { data, error } = await supabase
      .from('responses')
      .select(`
        *,
        question:questions!inner(
          id,
          question_text,
          section,
          subsection
        ),
        answer:answers!inner(
          id,
          answer_text,
          score
        )
      `)
      .eq('session_id', sessionId);

    if (error) {
      console.error("❌ Error fetching responses:", error);
      throw error;
    }
    
    console.log("✅ Fetched responses:", data?.length || 0);
    return data || [];
    
  } catch (error) {
    console.error("❌ GetSessionResponses error:", error);
    return [];
  }
}

// Submit and Generate Results
export async function submitAssessment(sessionId) {
  try {
    console.log("📤 Submitting assessment for session:", sessionId);
    
    // Call the database function to generate results
    const { data, error } = await supabase
      .rpc('generate_assessment_results', {
        p_session_id: sessionId
      });

    if (error) {
      console.error("❌ Submit assessment error:", error);
      throw error;
    }
    
    console.log("✅ Assessment submitted successfully:", data);
    return data;
    
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
    console.log("📝 Saving progress:", { sessionId, userId, assessmentId, elapsedSeconds, lastQuestionId });
    
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

    if (error) {
      console.error("❌ Error saving progress:", error);
      throw error;
    }
    
    console.log("✅ Progress saved");
    
  } catch (error) {
    console.error("❌ Save progress error:", error);
    throw error;
  }
}

export async function getProgress(userId, assessmentId) {
  try {
    console.log("📤 Fetching progress for:", { userId, assessmentId });
    
    const { data, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching progress:", error);
      throw error;
    }
    
    console.log("✅ Fetched progress:", data);
    return data;
    
  } catch (error) {
    console.error("❌ Get progress error:", error);
    return null;
  }
}

// ===== COMPLETION CHECKING FUNCTIONS =====

/**
 * Check if assessment already completed using the new structure
 */
export async function isAssessmentCompleted(userId, assessmentId) {
  try {
    console.log(`🔍 Checking completion for user ${userId}, assessment ${assessmentId}`);
    
    // First check in candidate_assessments (new structure)
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_assessments')
      .select('id, status, completed_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!candidateError && candidateData) {
      console.log(`✅ Found completed in candidate_assessments:`, candidateData);
      return true;
    }

    // If not found, check in assessment_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, status, completed_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!sessionError && sessionData) {
      console.log(`✅ Found completed in assessment_sessions:`, sessionData);
      
      // Also update candidate_assessments for future queries
      try {
        await supabase
          .from('candidate_assessments')
          .upsert({
            user_id: userId,
            assessment_id: assessmentId,
            status: 'completed',
            completed_at: sessionData.completed_at
          }, { onConflict: 'user_id,assessment_id' });
      } catch (upsertError) {
        console.log("Could not update candidate_assessments:", upsertError);
      }
      
      return true;
    }

    // Check assessment_results as last resort
    const { data: resultData, error: resultError } = await supabase
      .from('assessment_results')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!resultError && resultData) {
      console.log(`✅ Found completed in assessment_results`);
      return true;
    }

    console.log(`❌ No completed assessment found`);
    return false;
    
  } catch (error) {
    console.error("Error checking assessment completion:", error);
    return false;
  }
}

/**
 * Get all completed assessments for a user
 */
export async function getUserCompletedAssessments(userId) {
  try {
    console.log(`🔍 Fetching completed assessments for user ${userId}`);
    
    // Get from candidate_assessments (primary source)
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_assessments')
      .select(`
        assessment_id,
        status,
        score,
        completed_at,
        assessment:assessments(
          title,
          assessment_type:assessment_types(*)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (!candidateError && candidateData && candidateData.length > 0) {
      console.log(`✅ Found ${candidateData.length} completed in candidate_assessments`);
      return candidateData;
    }

    // If none found, try assessment_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select(`
        assessment_id,
        status,
        completed_at,
        assessment:assessments(
          title,
          assessment_type:assessment_types(*)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (!sessionError && sessionData && sessionData.length > 0) {
      console.log(`✅ Found ${sessionData.length} completed in assessment_sessions`);
      
      // Migrate to candidate_assessments
      for (const session of sessionData) {
        try {
          await supabase
            .from('candidate_assessments')
            .upsert({
              user_id: userId,
              assessment_id: session.assessment_id,
              status: 'completed',
              completed_at: session.completed_at
            }, { onConflict: 'user_id,assessment_id' });
        } catch (e) {
          console.log("Migration error:", e);
        }
      }
      
      return sessionData;
    }

    console.log(`❌ No completed assessments found`);
    return [];
    
  } catch (error) {
    console.error("Error fetching completed assessments:", error);
    return [];
  }
}

/**
 * Get in-progress assessment for a user
 */
export async function getUserInProgressAssessment(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from('assessment_sessions')
      .select(`
        *,
        assessment:assessments(
          *,
          assessment_type:assessment_types(*)
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (error) throw error;
    return data;
    
  } catch (error) {
    console.error("Error fetching in-progress assessment:", error);
    return null;
  }
}

/**
 * Get assessment statistics for a user
 */
export async function getUserAssessmentStats(userId) {
  try {
    const completed = await getUserCompletedAssessments(userId);
    
    const stats = {
      totalCompleted: completed.length,
      totalScore: 0,
      averageScore: 0,
      byType: {}
    };

    completed.forEach(item => {
      stats.totalScore += item.score || 0;
      
      const type = item.assessment?.assessment_type?.code || 'unknown';
      if (!stats.byType[type]) {
        stats.byType[type] = {
          count: 0,
          totalScore: 0
        };
      }
      stats.byType[type].count += 1;
      stats.byType[type].totalScore += item.score || 0;
    });

    if (stats.totalCompleted > 0) {
      stats.averageScore = Math.round(stats.totalScore / stats.totalCompleted);
    }

    return stats;
    
  } catch (error) {
    console.error("Error fetching assessment stats:", error);
    return {
      totalCompleted: 0,
      totalScore: 0,
      averageScore: 0,
      byType: {}
    };
  }
}

/**
 * Reset assessment completion status (for admin use)
 */
export async function resetAssessmentCompletion(userId, assessmentId) {
  try {
    // Delete from candidate_assessments
    await supabase
      .from('candidate_assessments')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    // Update session status
    await supabase
      .from('assessment_sessions')
      .update({ status: 'reset' })
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    // Delete responses
    await supabase
      .from('responses')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    return { success: true };
    
  } catch (error) {
    console.error("Error resetting assessment:", error);
    throw error;
  }
}
