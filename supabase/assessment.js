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

// ===== ROBUST RESPONSES FUNCTIONS WITH RETRY AND BACKUP =====
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId, retryCount = 0) {
  try {
    console.log("📝 Attempting to save response:", {
      sessionId,
      userId,
      assessmentId,
      questionId,
      answerId,
      retryCount,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!sessionId || !userId || !assessmentId || !questionId || !answerId) {
      console.error("❌ Missing required fields:", { sessionId, userId, assessmentId, questionId, answerId });
      // Still save to localStorage even if validation fails
      saveToLocalStorage(assessmentId, questionId, answerId);
      throw new Error("Missing required fields for saving response");
    }

    // Convert IDs to proper types
    const qId = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId;
    const aId = typeof answerId === 'string' ? parseInt(answerId, 10) : answerId;

    if (isNaN(qId) || isNaN(aId)) {
      console.error("❌ Invalid ID format:", { qId, aId });
      saveToLocalStorage(assessmentId, questionId, answerId);
      throw new Error("Invalid question or answer ID format");
    }

    // Always save to localStorage first (immediate backup)
    saveToLocalStorage(assessmentId, qId, aId);

    // Then try to save to database with retry logic
    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${MAX_RETRIES}`);
          await sleep(RETRY_DELAY * attempt);
        }

        const { data, error } = await supabase
          .from('responses')
          .upsert({
            session_id: sessionId,
            user_id: userId,
            assessment_id: assessmentId,
            question_id: qId,
            answer_id: aId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id,question_id',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          console.error(`❌ Attempt ${attempt} failed:`, error);
          lastError = error;
          continue;
        }

        console.log(`✅ Response saved to database on attempt ${attempt + 1}`);
        
        // Update localStorage to mark as synced
        markAsSynced(assessmentId, qId);
        
        return { success: true, data };
        
      } catch (attemptError) {
        console.error(`❌ Attempt ${attempt} error:`, attemptError);
        lastError = attemptError;
      }
    }

    // If all retries failed, throw the last error
    throw lastError || new Error("Failed to save after multiple retries");
    
  } catch (error) {
    console.error("❌ Save response error:", error);
    // Still saved to localStorage, so we can try to sync later
    return { success: false, error: error.message, savedToLocal: true };
  }
}

// Helper function to save to localStorage
function saveToLocalStorage(assessmentId, questionId, answerId) {
  try {
    const key = `assessment_${assessmentId}_answers`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    saved[questionId] = {
      answerId,
      timestamp: new Date().toISOString(),
      synced: false
    };
    localStorage.setItem(key, JSON.stringify(saved));
    localStorage.setItem(`assessment_${assessmentId}_last_saved`, new Date().toISOString());
    console.log(`💾 Saved to localStorage: Q${questionId} -> A${answerId}`);
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

// Helper function to mark answer as synced
function markAsSynced(assessmentId, questionId) {
  try {
    const key = `assessment_${assessmentId}_answers`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved[questionId]) {
      saved[questionId].synced = true;
      localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch (e) {
    console.error("Failed to mark as synced:", e);
  }
}

// Function to sync unsaved answers from localStorage
export async function syncUnsavedAnswers(sessionId, userId, assessmentId) {
  try {
    console.log("🔄 Syncing unsaved answers from localStorage");
    
    const key = `assessment_${assessmentId}_answers`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    
    const unsaved = Object.entries(saved)
      .filter(([_, data]) => !data.synced)
      .map(([qId, data]) => ({ questionId: parseInt(qId), answerId: data.answerId }));
    
    console.log(`📦 Found ${unsaved.length} unsaved answers`);
    
    if (unsaved.length === 0) {
      return { synced: 0 };
    }
    
    let synced = 0;
    let failed = 0;
    
    for (const { questionId, answerId } of unsaved) {
      try {
        const { error } = await supabase
          .from('responses')
          .upsert({
            session_id: sessionId,
            user_id: userId,
            assessment_id: assessmentId,
            question_id: questionId,
            answer_id: answerId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id,question_id'
          });
        
        if (error) {
          console.error(`Failed to sync Q${questionId}:`, error);
          failed++;
        } else {
          markAsSynced(assessmentId, questionId);
          synced++;
          console.log(`✅ Synced Q${questionId}`);
        }
      } catch (e) {
        console.error(`Error syncing Q${questionId}:`, e);
        failed++;
      }
    }
    
    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
    
  } catch (error) {
    console.error("❌ Sync error:", error);
    throw error;
  }
}

// Function to load answers from all sources
export async function loadUserAnswers(userId, assessmentId, sessionId) {
  try {
    console.log("📤 Loading answers from all sources");
    
    const answersMap = {};
    
    // Load from database
    if (sessionId) {
      const { data: dbAnswers, error } = await supabase
        .from('responses')
        .select('question_id, answer_id')
        .eq('session_id', sessionId);

      if (!error && dbAnswers) {
        dbAnswers.forEach(r => {
          answersMap[r.question_id] = r.answer_id;
        });
        console.log(`📊 Loaded ${dbAnswers.length} answers from database`);
      }
    }
    
    // Load from localStorage and merge
    const key = `assessment_${assessmentId}_answers`;
    const localAnswers = JSON.parse(localStorage.getItem(key) || '{}');
    const localCount = Object.keys(localAnswers).length;
    
    if (localCount > 0) {
      console.log(`📦 Found ${localCount} answers in localStorage`);
      
      let newAnswers = 0;
      Object.entries(localAnswers).forEach(([qId, data]) => {
        const questionId = parseInt(qId);
        if (!answersMap[questionId]) {
          answersMap[questionId] = data.answerId;
          newAnswers++;
        }
      });
      
      console.log(`➕ Added ${newAnswers} new answers from localStorage`);
    }
    
    return answersMap;
    
  } catch (error) {
    console.error("❌ Error loading answers:", error);
    return {};
  }
}

// Recovery function
export async function checkAndRestoreProgress(userId, assessmentId) {
  try {
    console.log("🔍 Checking progress for:", { userId, assessmentId });
    
    // Get the active session
    const { data: sessions, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessionError) {
      console.error("Error fetching sessions:", sessionError);
      return null;
    }

    if (!sessions || sessions.length === 0) {
      console.log("No active session found");
      return null;
    }

    const session = sessions[0];
    console.log("Found active session:", session);

    // Get saved responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('question_id, answer_id')
      .eq('session_id', session.id);

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
      return null;
    }

    // Get progress
    const { data: progress, error: progressError } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    console.log(`Found ${responses?.length || 0} saved responses in database`);
    
    // Check localStorage for unsaved answers
    const key = `assessment_${assessmentId}_answers`;
    const localAnswers = JSON.parse(localStorage.getItem(key) || '{}');
    const unsavedCount = Object.values(localAnswers).filter(d => !d.synced).length;
    
    if (unsavedCount > 0) {
      console.log(`📦 Found ${unsavedCount} unsaved answers in localStorage`);
    }
    
    return {
      session,
      responses: responses || [],
      progress: progress || null,
      unsavedCount
    };
    
  } catch (error) {
    console.error("Error in checkAndRestoreProgress:", error);
    return null;
  }
}

// Get Session Responses
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
      return [];
    }
    
    console.log("✅ Fetched responses:", data?.length || 0);
    return data || [];
    
  } catch (error) {
    console.error("❌ GetSessionResponses error:", error);
    return [];
  }
}

// Submit Assessment
export async function submitAssessment(sessionId) {
  try {
    console.log("📤 Submitting assessment for session:", sessionId);
    
    if (!sessionId) {
      console.error("❌ No session ID provided");
      throw new Error("No session ID provided");
    }

    // First, sync any unsaved answers from localStorage
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('user_id, assessment_id')
      .eq('id', sessionId)
      .single();

    if (!sessionError && session) {
      await syncUnsavedAnswers(sessionId, session.user_id, session.assessment_id);
    }

    // Call the database function to generate results
    console.log("🔧 Calling generate_assessment_results RPC");
    
    const { data, error } = await supabase
      .rpc('generate_assessment_results', {
        p_session_id: sessionId
      });

    if (error) {
      console.error("❌ RPC Error:", error);
      throw error;
    }
    
    if (!data) {
      console.error("❌ No data returned from RPC");
      throw new Error("No result ID returned");
    }
    
    console.log("✅ Assessment submitted successfully. Result ID:", data);
    
    // Clear localStorage after successful submission
    const { assessment_id } = session;
    localStorage.removeItem(`assessment_${assessment_id}_answers`);
    localStorage.removeItem(`assessment_${assessment_id}_last_saved`);
    
    return data;
    
  } catch (error) {
    console.error("❌ Submit assessment error:", error);
    throw error;
  }
}

// Get Assessment Results
export async function getAssessmentResult(resultId) {
  try {
    console.log("📤 Fetching assessment result:", resultId);
    
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

    if (error) {
      console.error("❌ Error fetching result:", error);
      throw error;
    }
    
    console.log("✅ Result fetched:", data);
    return data;
    
  } catch (error) {
    console.error("❌ Get assessment result error:", error);
    throw error;
  }
}

export async function getUserAssessmentResults(userId) {
  try {
    console.log("📤 Fetching user assessment results:", userId);
    
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

    if (error) {
      console.error("❌ Error fetching user results:", error);
      throw error;
    }
    
    console.log("✅ User results fetched:", data?.length || 0);
    return data;
    
  } catch (error) {
    console.error("❌ Get user assessment results error:", error);
    throw error;
  }
}

// Candidate Profile
export async function getOrCreateCandidateProfile(userId, email, fullName) {
  try {
    console.log("📤 Getting/creating candidate profile:", { userId, email, fullName });
    
    const { data: existing, error: existingError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing profile:", existingError);
    }

    if (existing) {
      console.log("✅ Found existing profile:", existing);
      return existing;
    }

    const { data, error } = await supabase
      .from('candidate_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating profile:", error);
      throw error;
    }
    
    console.log("✅ Profile created:", data);
    return data;
    
  } catch (error) {
    console.error("❌ Get or create candidate profile error:", error);
    throw error;
  }
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

// Completion Checking
export async function isAssessmentCompleted(userId, assessmentId) {
  try {
    console.log(`🔍 Checking completion for user ${userId}, assessment ${assessmentId}`);
    
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_assessments')
      .select('id, status, completed_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!candidateError && candidateData) {
      console.log(`✅ Found completed in candidate_assessments`);
      return true;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, status, completed_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!sessionError && sessionData) {
      console.log(`✅ Found completed in assessment_sessions`);
      return true;
    }

    console.log(`❌ No completed assessment found`);
    return false;
    
  } catch (error) {
    console.error("Error checking assessment completion:", error);
    return false;
  }
}

export async function getUserCompletedAssessments(userId) {
  try {
    console.log(`🔍 Fetching completed assessments for user ${userId}`);
    
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

    console.log(`❌ No completed assessments found`);
    return [];
    
  } catch (error) {
    console.error("Error fetching completed assessments:", error);
    return [];
  }
}

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

export async function resetAssessmentCompletion(userId, assessmentId) {
  try {
    await supabase
      .from('candidate_assessments')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    await supabase
      .from('assessment_sessions')
      .update({ status: 'reset' })
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

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
