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

// Questions and Answers (legacy)
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
    expiresAt.setMinutes(expiresAt.getMinutes() + (assessmentType.time_limit_minutes || 60));

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

// Save response (legacy)
export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  try {
    if (!sessionId || !userId || !assessmentId || !questionId || !answerId) {
      return { success: false, error: "Missing required fields" };
    }

    const { error } = await supabase
      .from("responses")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          assessment_id: assessmentId,
          question_id: questionId,
          answer_id: answerId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,question_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      console.error("Database error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
    
  } catch (error) {
    console.error("Save function error:", error);
    return { success: false, error: error.message };
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

// ========== RANDOMIZED FUNCTIONS ==========

// Helper function to shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get randomized questions for a candidate - SIMPLIFIED VERSION
export async function getRandomizedQuestions(candidateId, assessmentId) {
  console.log("🎲 Getting randomized questions for:", { candidateId, assessmentId });
  
  try {
    // Get all question instances for this assessment
    const { data: questions, error: qError } = await supabase
      .from("question_instances")
      .select(`
        id,
        display_order,
        question_bank:question_banks!inner(
          id,
          question_text,
          section,
          subsection,
          answer_banks(
            id,
            answer_text,
            score
          )
        )
      `)
      .eq("assessment_id", assessmentId)
      .order('display_order');

    if (qError) {
      console.error("Error fetching questions:", qError);
      return [];
    }

    if (!questions || questions.length === 0) {
      console.log("No questions found, creating from question banks");
      return await createQuestionInstances(candidateId, assessmentId);
    }

    // For each question, get or create answer instances
    const result = await Promise.all(
      questions.map(async (q) => {
        // Get answer instances for this candidate
        const { data: answerInstances, error: aError } = await supabase
          .from("answer_instances")
          .select(`
            id,
            display_order,
            answer_bank:answer_banks!inner(
              id,
              answer_text,
              score
            )
          `)
          .eq("question_instance_id", q.id)
          .eq("candidate_id", candidateId)
          .order('display_order');

        if (aError) {
          console.error("Error fetching answer instances:", aError);
          return {
            id: q.id,
            question_bank_id: q.question_bank.id,
            question_text: q.question_bank.question_text,
            section: q.question_bank.section,
            subsection: q.question_bank.subsection,
            display_order: q.display_order,
            answers: q.question_bank.answer_banks || []
          };
        }

        // If no answer instances exist, create them
        if (!answerInstances || answerInstances.length === 0) {
          const shuffledAnswers = shuffleArray([...q.question_bank.answer_banks]);
          
          // Create answer instances
          const newAnswers = await Promise.all(
            shuffledAnswers.map(async (answer, index) => {
              const { data, error } = await supabase
                .from("answer_instances")
                .insert({
                  answer_bank_id: answer.id,
                  question_instance_id: q.id,
                  display_order: index,
                  candidate_id: candidateId,
                  created_at: new Date().toISOString()
                })
                .select(`
                  id,
                  display_order,
                  answer_bank:answer_banks!inner(
                    id,
                    answer_text,
                    score
                  )
                `)
                .single();

              if (error) {
                console.error("Error creating answer instance:", error);
                return {
                  id: answer.id,
                  answer_text: answer.answer_text,
                  score: answer.score,
                  display_order: index
                };
              }

              return {
                id: data.answer_bank.id,
                answer_text: data.answer_bank.answer_text,
                score: data.answer_bank.score,
                display_order: data.display_order
              };
            })
          );

          return {
            id: q.id,
            question_bank_id: q.question_bank.id,
            question_text: q.question_bank.question_text,
            section: q.question_bank.section,
            subsection: q.question_bank.subsection,
            display_order: q.display_order,
            answers: newAnswers
          };
        }

        // Use existing answer instances
        return {
          id: q.id,
          question_bank_id: q.question_bank.id,
          question_text: q.question_bank.question_text,
          section: q.question_bank.section,
          subsection: q.question_bank.subsection,
          display_order: q.display_order,
          answers: answerInstances.map(ai => ({
            id: ai.answer_bank.id,
            answer_text: ai.answer_bank.answer_text,
            score: ai.answer_bank.score,
            display_order: ai.display_order
          }))
        };
      })
    );

    return result;
    
  } catch (error) {
    console.error("Error in getRandomizedQuestions:", error);
    return [];
  }
}

// Create question instances if they don't exist
export async function createQuestionInstances(candidateId, assessmentId) {
  try {
    // Get assessment details
    const { data: assessment, error: aError } = await supabase
      .from("assessments")
      .select("assessment_type_id")
      .eq("id", assessmentId)
      .single();

    if (aError) throw aError;

    // Get all questions from question bank
    const { data: questionBanks, error: qbError } = await supabase
      .from("question_banks")
      .select(`
        id,
        question_text,
        section,
        subsection,
        answer_banks(
          id,
          answer_text,
          score
        )
      `)
      .eq("assessment_type_id", assessment.assessment_type_id);

    if (qbError) throw qbError;

    if (!questionBanks || questionBanks.length === 0) {
      return [];
    }

    // Shuffle questions
    const shuffledBanks = shuffleArray(questionBanks);

    // Create question instances
    const questionInstances = await Promise.all(
      shuffledBanks.map(async (qb, index) => {
        const { data, error } = await supabase
          .from("question_instances")
          .insert({
            question_bank_id: qb.id,
            assessment_id: assessmentId,
            display_order: index,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return { ...data, question_bank: qb };
      })
    );

    // Create answer instances for the first question only (others will be created on demand)
    const firstQuestion = questionInstances[0];
    if (firstQuestion) {
      const shuffledAnswers = shuffleArray([...firstQuestion.question_bank.answer_banks]);
      
      await Promise.all(
        shuffledAnswers.map(async (answer, index) => {
          await supabase
            .from("answer_instances")
            .insert({
              answer_bank_id: answer.id,
              question_instance_id: firstQuestion.id,
              display_order: index,
              candidate_id: candidateId,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
        })
      );
    }

    // Return formatted questions
    return questionInstances.map(qi => ({
      id: qi.id,
      question_bank_id: qi.question_bank.id,
      question_text: qi.question_bank.question_text,
      section: qi.question_bank.section,
      subsection: qi.question_bank.subsection,
      display_order: qi.display_order,
      answers: qi.id === firstQuestion?.id 
        ? shuffledAnswers.map((a, i) => ({
            id: a.id,
            answer_text: a.answer_text,
            score: a.score,
            display_order: i
          }))
        : []
    }));

  } catch (error) {
    console.error("Error creating question instances:", error);
    return [];
  }
}

// Save randomized response - SIMPLIFIED VERSION
export async function saveRandomizedResponse(session_id, user_id, assessment_id, question_instance_id, answer_bank_id) {
  console.log("💾 Saving response:", { session_id, user_id, question_instance_id, answer_bank_id });
  
  try {
    // First, find the answer instance
    let { data: answerInstance, error: findError } = await supabase
      .from("answer_instances")
      .select("id")
      .eq("question_instance_id", question_instance_id)
      .eq("candidate_id", user_id)
      .eq("answer_bank_id", answer_bank_id)
      .maybeSingle();

    if (findError) {
      console.error("Error finding answer instance:", findError);
      return { success: false, error: findError.message };
    }

    // If answer instance doesn't exist, create it
    if (!answerInstance) {
      console.log("Creating new answer instance");
      
      const { data: newInstance, error: createError } = await supabase
        .from("answer_instances")
        .insert({
          answer_bank_id: answer_bank_id,
          question_instance_id: question_instance_id,
          display_order: 0,
          candidate_id: user_id,
          created_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating answer instance:", createError);
        return { success: false, error: createError.message };
      }

      answerInstance = newInstance;
    }

    // Save the response
    const { error: saveError } = await supabase
      .from("responses")
      .upsert({
        session_id: session_id,
        user_id: user_id,
        assessment_id: assessment_id,
        question_id: question_instance_id,
        answer_id: answerInstance.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,question_id'
      });

    if (saveError) {
      console.error("Error saving response:", saveError);
      return { success: false, error: saveError.message };
    }

    console.log("✅ Response saved successfully");
    return { success: true };

  } catch (error) {
    console.error("Error in saveRandomizedResponse:", error);
    return { success: false, error: error.message };
  }
}
