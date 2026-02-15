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

// ========== NEW RANDOMIZED FUNCTIONS FOR QUESTION BANK ==========

// Helper function to shuffle array (internal use only)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get randomized questions for a candidate
export async function getRandomizedQuestions(candidateId, assessmentId, sessionId) {
  console.log("🎲 Getting randomized questions for:", { candidateId, assessmentId, sessionId });
  
  try {
    // First, check if we already have answer instances for this candidate
    const { data: existingInstances, error: instanceError } = await supabase
      .from("answer_instances")
      .select(`
        id,
        display_order,
        answer_bank:answer_banks!inner(
          id,
          answer_text,
          score,
          question_bank:question_banks!inner(
            id,
            question_text,
            section,
            subsection,
            question_instances!inner(
              id,
              display_order,
              assessment_id
            )
          )
        )
      `)
      .eq("candidate_id", candidateId)
      .eq("answer_bank.question_bank.question_instances.assessment_id", assessmentId);

    if (instanceError) {
      console.error("Error checking existing instances:", instanceError);
      // Fall back to regular questions
      return await getAssessmentQuestions(assessmentId);
    }

    if (existingInstances && existingInstances.length > 0) {
      console.log(`Found ${existingInstances.length} existing answer instances`);
      
      // Group by question
      const questionsMap = new Map();
      
      existingInstances.forEach(instance => {
        const qb = instance.answer_bank.question_bank;
        const questionInstance = qb.question_instances[0];
        
        if (!questionsMap.has(questionInstance.id)) {
          questionsMap.set(questionInstance.id, {
            id: questionInstance.id,
            question_bank_id: qb.id,
            question_text: qb.question_text,
            section: qb.section,
            subsection: qb.subsection,
            display_order: questionInstance.display_order,
            answers: []
          });
        }
        
        questionsMap.get(questionInstance.id).answers.push({
          id: instance.answer_bank.id,
          answer_text: instance.answer_bank.answer_text,
          score: instance.answer_bank.score,
          display_order: instance.display_order
        });
      });

      // Convert to array and sort
      let questions = Array.from(questionsMap.values());
      questions.sort((a, b) => a.display_order - b.display_order);
      
      // Sort answers within each question
      questions = questions.map(q => ({
        ...q,
        answers: q.answers.sort((a, b) => a.display_order - b.display_order)
      }));

      return questions;
    }

    // If no instances exist, create new randomized ones
    console.log("No existing instances, creating new randomized assessment");
    return await createRandomizedAssessment(candidateId, assessmentId, sessionId);

  } catch (error) {
    console.error("Error in getRandomizedQuestions:", error);
    // Fall back to regular questions
    return await getAssessmentQuestions(assessmentId);
  }
}

// Create a new randomized assessment for a candidate
export async function createRandomizedAssessment(candidateId, assessmentId, sessionId) {
  try {
    // Get all question instances for this assessment
    const { data: questionInstances, error: qiError } = await supabase
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
      .eq("assessment_id", assessmentId);

    if (qiError) throw qiError;

    if (!questionInstances || questionInstances.length === 0) {
      console.log("No question instances found, creating from question banks");
      return await createQuestionInstances(candidateId, assessmentId);
    }

    console.log(`Found ${questionInstances.length} question instances`);

    // Shuffle questions
    const shuffledQuestions = shuffleArray([...questionInstances]);
    
    // Update display orders
    await Promise.all(
      shuffledQuestions.map(async (q, index) => {
        await supabase
          .from("question_instances")
          .update({ display_order: index })
          .eq("id", q.id);
      })
    );

    // For each question, create randomized answer instances
    const randomizedQuestions = await Promise.all(
      shuffledQuestions.map(async (qi) => {
        const answerBanks = qi.question_bank.answer_banks || [];
        const shuffledAnswers = shuffleArray([...answerBanks]);
        
        // Create answer instances
        const answerInstances = await Promise.all(
          shuffledAnswers.map(async (answer, index) => {
            // Check if answer instance already exists
            const { data: existing } = await supabase
              .from("answer_instances")
              .select("id")
              .eq("question_instance_id", qi.id)
              .eq("candidate_id", candidateId)
              .eq("answer_bank_id", answer.id)
              .maybeSingle();

            if (existing) {
              return { 
                id: answer.id,
                answer_text: answer.answer_text,
                score: answer.score,
                display_order: index 
              };
            }

            // Create new answer instance
            const { data, error } = await supabase
              .from("answer_instances")
              .insert({
                answer_bank_id: answer.id,
                question_instance_id: qi.id,
                display_order: index,
                candidate_id: candidateId,
                created_at: new Date().toISOString()
              })
              .select()
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
              id: answer.id,
              answer_text: answer.answer_text,
              score: answer.score,
              display_order: index 
            };
          })
        );

        return {
          id: qi.id,
          question_bank_id: qi.question_bank.id,
          question_text: qi.question_bank.question_text,
          section: qi.question_bank.section,
          subsection: qi.question_bank.subsection,
          display_order: qi.display_order,
          answers: answerInstances.sort((a, b) => a.display_order - b.display_order)
        };
      })
    );

    return randomizedQuestions.sort((a, b) => a.display_order - b.display_order);

  } catch (error) {
    console.error("Error creating randomized assessment:", error);
    throw error;
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

    // Get all questions from question bank for this assessment type
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
      console.log("No question banks found for this assessment type");
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

    // Create answer instances for each question
    const randomizedQuestions = await Promise.all(
      questionInstances.map(async (qi) => {
        const shuffledAnswers = shuffleArray([...qi.question_bank.answer_banks]);
        
        const answerInstances = await Promise.all(
          shuffledAnswers.map(async (answer, index) => {
            const { data, error } = await supabase
              .from("answer_instances")
              .insert({
                answer_bank_id: answer.id,
                question_instance_id: qi.id,
                display_order: index,
                candidate_id: candidateId,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (error) throw error;
            
            return {
              id: answer.id,
              answer_text: answer.answer_text,
              score: answer.score,
              display_order: index
            };
          })
        );

        return {
          id: qi.id,
          question_bank_id: qi.question_bank.id,
          question_text: qi.question_bank.question_text,
          section: qi.question_bank.section,
          subsection: qi.question_bank.subsection,
          display_order: qi.display_order,
          answers: answerInstances.sort((a, b) => a.display_order - b.display_order)
        };
      })
    );

    return randomizedQuestions.sort((a, b) => a.display_order - b.display_order);

  } catch (error) {
    console.error("Error creating question instances:", error);
    throw error;
  }
}

// ===== FIXED SAVE RANDOMIZED RESPONSE FUNCTION =====
export async function saveRandomizedResponse(session_id, user_id, assessment_id, question_instance_id, answer_bank_id) {
  console.log("💾 [saveRandomizedResponse] ENTERED with:", { 
    session_id, 
    user_id, 
    assessment_id, 
    question_instance_id, 
    answer_bank_id 
  });
  
  try {
    // Validate inputs
    if (!session_id || !user_id || !assessment_id || !question_instance_id || !answer_bank_id) {
      console.error("❌ Missing required fields:", { session_id, user_id, assessment_id, question_instance_id, answer_bank_id });
      return { success: false, error: "Missing required fields" };
    }

    // First, try to find the answer instance for this candidate and question
    console.log("🔍 Looking for answer instance with:", {
      question_instance_id,
      candidate_id: user_id,
      answer_bank_id
    });

    let { data: answerInstance, error: findError } = await supabase
      .from("answer_instances")
      .select("id")
      .eq("question_instance_id", question_instance_id)
      .eq("candidate_id", user_id)
      .eq("answer_bank_id", answer_bank_id)
      .maybeSingle();

    if (findError) {
      console.error("❌ Error finding answer instance:", findError);
      return { success: false, error: findError.message };
    }

    // If answer instance doesn't exist, create it
    if (!answerInstance) {
      console.log("⚠️ Answer instance not found, creating new one...");
      
      // Get the question instance to verify it exists
      const { data: questionInstance, error: qiError } = await supabase
        .from("question_instances")
        .select("id, display_order")
        .eq("id", question_instance_id)
        .single();

      if (qiError) {
        console.error("❌ Question instance not found:", qiError);
        return { success: false, error: "Question instance not found" };
      }

      // Get the answer bank to verify it exists
      const { data: answerBank, error: abError } = await supabase
        .from("answer_banks")
        .select("id")
        .eq("id", answer_bank_id)
        .single();

      if (abError) {
        console.error("❌ Answer bank not found:", abError);
        return { success: false, error: "Answer bank not found" };
      }

      // Get the highest display order for this question and candidate
      const { data: maxOrder } = await supabase
        .from("answer_instances")
        .select("display_order")
        .eq("question_instance_id", question_instance_id)
        .eq("candidate_id", user_id)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = maxOrder ? maxOrder.display_order + 1 : 0;

      // Create new answer instance
      const { data: newInstance, error: createError } = await supabase
        .from("answer_instances")
        .insert({
          answer_bank_id: answer_bank_id,
          question_instance_id: question_instance_id,
          display_order: nextOrder,
          candidate_id: user_id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Failed to create answer instance:", createError);
        return { success: false, error: "Failed to create answer instance" };
      }

      console.log("✅ Created new answer instance:", newInstance);
      answerInstance = newInstance;
    } else {
      console.log("✅ Found existing answer instance:", answerInstance);
    }

    // Save the response
    console.log("💾 Saving response with:", {
      session_id,
      user_id,
      assessment_id,
      question_id: question_instance_id,
      answer_id: answerInstance.id
    });

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
      console.error("❌ Error saving response:", saveError);
      return { success: false, error: saveError.message };
    }

    console.log("✅ Response saved successfully!");
    return { success: true };

  } catch (error) {
    console.error("❌ Error in saveRandomizedResponse:", error);
    return { success: false, error: error.message };
  }
}

// Export all functions (they're already exported above, but this is explicit)
export {
  shuffleArray,
  getRandomizedQuestions,
  createRandomizedAssessment,
  createQuestionInstances,
  saveRandomizedResponse
};
