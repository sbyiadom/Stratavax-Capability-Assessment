// supabase/assessment.js
import { supabase } from "./client";

// ===== SECTION CONFIGURATIONS FOR BETTER CONTEXT =====
const SECTION_CONFIG = {
  'Cognitive Abilities': { icon: '🧠', category: 'cognitive' },
  'Personality Assessment': { icon: '😊', category: 'behavioral' },
  'Leadership Potential': { icon: '👑', category: 'leadership' },
  'Bottled Water Manufacturing': { icon: '⚙️', category: 'manufacturing' },
  'Performance Metrics': { icon: '📊', category: 'performance' },
  'Adaptability & Flexibility': { icon: '🔄', category: 'adaptability' },
  'Emotional Intelligence': { icon: '🧘', category: 'emotional' },
  'Communication Skills': { icon: '💬', category: 'communication' },
  'Teamwork & Collaboration': { icon: '🤝', category: 'teamwork' },
  'Initiative & Proactivity': { icon: '⚡', category: 'initiative' },
  'Time Management': { icon: '⏰', category: 'productivity' },
  'Resilience': { icon: '💪', category: 'resilience' },
  'Problem-Solving': { icon: '🔍', category: 'problem-solving' },
  'Critical Thinking': { icon: '🎯', category: 'critical-thinking' },
  'Learning Agility': { icon: '📚', category: 'learning' },
  'Creativity & Innovation': { icon: '💡', category: 'creativity' },
  'Core Values Alignment': { icon: '🎯', category: 'values' },
  'Organizational Citizenship': { icon: '🤲', category: 'citizenship' },
  'Reliability & Dependability': { icon: '✓', category: 'reliability' },
  'Customer Focus': { icon: '👥', category: 'customer' },
  'Safety Awareness': { icon: '⚠️', category: 'safety' },
  'Commercial Awareness': { icon: '💰', category: 'commercial' },
  'Blowing Machines': { icon: '💨', category: 'manufacturing' },
  'Labeler': { icon: '🏷️', category: 'manufacturing' },
  'Filling': { icon: '💧', category: 'manufacturing' },
  'Conveyors': { icon: '📦', category: 'manufacturing' },
  'Stretchwrappers': { icon: '🔄', category: 'manufacturing' },
  'Shrinkwrappers': { icon: '🔥', category: 'manufacturing' },
  'Date Coders': { icon: '📅', category: 'manufacturing' },
  'Raw Materials': { icon: '🧪', category: 'manufacturing' },
  'Vision & Strategic Thinking': { icon: '🎯', category: 'strategic' },
  'Team Development': { icon: '🌱', category: 'development' },
  'Decision-Making': { icon: '⚖️', category: 'decision' },
  'Influence': { icon: '🗣️', category: 'influence' },
  'Leadership EQ': { icon: '💖', category: 'leadership-eq' },
  'Conflict Resolution': { icon: '🤝', category: 'conflict' },
  'Delegation': { icon: '📤', category: 'delegation' },
  'Leadership Integrity': { icon: '🛡️', category: 'integrity' },
  'Innovation Leadership': { icon: '💫', category: 'innovation' }
};

/**
 * Fetch all questions for an assessment with their answers
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<Array>} Array of questions with their answers
 */
export async function getAssessmentQuestions(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(assessmentId)) {
    throw new Error("Invalid assessment ID format");
  }

  try {
    console.log(`🔍 Fetching questions for assessment: ${assessmentId}`);
    
    const { data, error } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        section,
        subsection,
        assessment_id,
        question_order,
        answers (
          id,
          answer_text,
          score,
          strength_level,
          trait_category
        )
      `)
      .eq("assessment_id", assessmentId)
      .order("question_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) throw error;
    
    // Validate that each question has answers
    const validatedData = (data || []).map(question => {
      const answerCount = question.answers?.length || 0;
      
      if (answerCount === 0) {
        console.warn(`⚠️ Question ${question.id} has no answers!`);
      } else if (answerCount < 5) {
        console.warn(`⚠️ Question ${question.id} has only ${answerCount}/5 answers`);
      }
      
      // Add section configuration if available
      const sectionConfig = SECTION_CONFIG[question.section] || { icon: '📝', category: 'general' };
      
      return {
        ...question,
        section_icon: sectionConfig.icon,
        section_category: sectionConfig.category,
        answer_count: answerCount,
        has_valid_answers: answerCount >= 4 // At least 4 answers (some might have 4, some 5)
      };
    });
    
    console.log(`✅ Fetched ${validatedData.length} questions for assessment ${assessmentId}`);
    
    // Log summary of answer counts
    const answerStats = validatedData.reduce((acc, q) => {
      acc[q.answer_count] = (acc[q.answer_count] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`📊 Answer count distribution:`, answerStats);
    
    return validatedData;
  } catch (error) {
    console.error("❌ Error fetching assessment questions:", error);
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }
}

/**
 * Fetch assessment details by ID
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<Object>} Assessment details
 */
export async function getAssessmentById(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    console.log(`🔍 Fetching assessment details: ${assessmentId}`);
    
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_categories (
          id,
          name,
          description,
          icon
        )
      `)
      .eq("id", assessmentId)
      .single();

    if (error) throw error;
    
    // Get question count
    const questionCount = await getQuestionCount(assessmentId).catch(() => 0);
    
    console.log(`✅ Fetched assessment: ${data.name} (${questionCount} questions)`);
    
    return {
      ...data,
      question_count: questionCount,
      has_questions: questionCount > 0
    };
  } catch (error) {
    console.error("❌ Error fetching assessment:", error);
    throw new Error(`Failed to fetch assessment: ${error.message}`);
  }
}

/**
 * Get total question count for an assessment
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<number>} Number of questions
 */
export async function getQuestionCount(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    const { count, error } = await supabase
      .from("questions")
      .select("*", { count: 'exact', head: true })
      .eq("assessment_id", assessmentId);

    if (error) throw error;
    
    console.log(`📊 Question count for ${assessmentId}: ${count || 0}`);
    
    return count || 0;
  } catch (error) {
    console.error("❌ Error getting question count:", error);
    throw new Error(`Failed to get question count: ${error.message}`);
  }
}

/**
 * Fetch all active assessments
 * @returns {Promise<Array>} List of assessments
 */
export async function getAllAssessments() {
  try {
    console.log("🔍 Fetching all assessments");
    
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_categories (
          id,
          name,
          description,
          icon
        )
      `)
      .eq("is_active", true)
      .order("category_id")
      .order("name");

    if (error) throw error;
    
    // Get question counts for each assessment
    const assessmentsWithCounts = await Promise.all(
      (data || []).map(async (assessment) => {
        const count = await getQuestionCount(assessment.id).catch(() => 0);
        return {
          ...assessment,
          question_count: count,
          is_ready: count === 100 // Check if assessment has all 100 questions
        };
      })
    );
    
    // Log summary
    const readyCount = assessmentsWithCounts.filter(a => a.is_ready).length;
    console.log(`✅ Fetched ${assessmentsWithCounts.length} assessments (${readyCount} ready with 100 questions)`);
    
    return assessmentsWithCounts;
  } catch (error) {
    console.error("❌ Error fetching all assessments:", error);
    throw new Error(`Failed to fetch assessments: ${error.message}`);
  }
}

/**
 * Fetch assessments by category
 * @param {string} categoryId - Category UUID
 * @returns {Promise<Array>} List of assessments in category
 */
export async function getAssessmentsByCategory(categoryId) {
  if (!categoryId) {
    throw new Error("Category ID is required");
  }

  try {
    console.log(`🔍 Fetching assessments for category: ${categoryId}`);
    
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_categories (
          id,
          name,
          description,
          icon
        )
      `)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    
    // Get question counts
    const assessmentsWithCounts = await Promise.all(
      (data || []).map(async (assessment) => {
        const count = await getQuestionCount(assessment.id).catch(() => 0);
        return {
          ...assessment,
          question_count: count
        };
      })
    );
    
    console.log(`✅ Fetched ${assessmentsWithCounts.length} assessments in category`);
    
    return assessmentsWithCounts;
  } catch (error) {
    console.error("❌ Error fetching assessments by category:", error);
    throw new Error(`Failed to fetch assessments by category: ${error.message}`);
  }
}

/**
 * Fetch paginated questions for an assessment
 * @param {string} assessmentId - Assessment UUID
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of questions per page
 * @returns {Promise<Object>} Paginated questions with metadata
 */
export async function getAssessmentQuestionsPaginated(assessmentId, page = 1, pageSize = 10) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    console.log(`🔍 Fetching page ${page} of questions for assessment ${assessmentId}`);
    
    // Get total count first
    const { count, error: countError } = await supabase
      .from("questions")
      .select("*", { count: 'exact', head: true })
      .eq("assessment_id", assessmentId);

    if (countError) throw countError;

    // Fetch paginated questions with answers
    const { data, error } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        section,
        subsection,
        question_order,
        answers (
          id,
          answer_text,
          score,
          strength_level,
          trait_category
        )
      `)
      .eq("assessment_id", assessmentId)
      .order("question_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    // Validate answers for each question
    const validatedQuestions = (data || []).map(question => {
      const answerCount = question.answers?.length || 0;
      return {
        ...question,
        answer_count: answerCount,
        has_valid_answers: answerCount >= 4
      };
    });

    const result = {
      questions: validatedQuestions,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasNext: from + pageSize < (count || 0),
      hasPrevious: page > 1
    };
    
    console.log(`✅ Fetched page ${page}/${result.totalPages} (${validatedQuestions.length} questions)`);
    
    return result;
  } catch (error) {
    console.error("❌ Error fetching paginated questions:", error);
    throw new Error(`Failed to fetch paginated questions: ${error.message}`);
  }
}

/**
 * Get statistics for an assessment
 * @param {string} assessmentId - Assessment UUID
 * @returns {Promise<Object>} Assessment statistics
 */
export async function getAssessmentStats(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    console.log(`🔍 Fetching stats for assessment: ${assessmentId}`);
    
    const totalQuestions = await getQuestionCount(assessmentId);

    // Get sections breakdown
    const { data: sections, error: sectionsError } = await supabase
      .from("questions")
      .select("section, count")
      .eq("assessment_id", assessmentId)
      .select('section, count(*)', { count: 'exact' })
      .group('section');

    if (sectionsError) throw sectionsError;

    // Get completion stats
    const { data: results, error: resultsError } = await supabase
      .from("assessment_results")
      .select("score, time_spent_seconds, completed_at")
      .eq("assessment_id", assessmentId)
      .eq("status", "completed");

    if (resultsError) throw resultsError;

    // Calculate average score and time
    const averageScore = results?.length 
      ? Math.round(results.reduce((acc, curr) => acc + (curr.score || 0), 0) / results.length)
      : 0;

    const averageTime = results?.length 
      ? Math.round(results.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0) / results.length)
      : 0;

    // Get answer distribution
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select(`
        question_id,
        score,
        strength_level
      `)
      .in('question_id', 
        supabase
          .from('questions')
          .select('id')
          .eq('assessment_id', assessmentId)
      );

    if (answersError) throw answersError;

    const strengthLevels = answers?.reduce((acc, curr) => {
      acc[curr.strength_level] = (acc[curr.strength_level] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      assessment_id: assessmentId,
      total_questions: totalQuestions,
      sections: sections || [],
      sections_count: sections?.length || 0,
      total_attempts: results?.length || 0,
      average_score: averageScore,
      average_completion_time: averageTime,
      strength_levels: strengthLevels || {},
      last_updated: new Date().toISOString()
    };
    
    console.log(`✅ Fetched stats for assessment:`, stats);
    
    return stats;
  } catch (error) {
    console.error("❌ Error fetching assessment stats:", error);
    throw new Error(`Failed to fetch assessment stats: ${error.message}`);
  }
}

/**
 * Validate if a user can access an assessment
 * @param {string} assessmentId - Assessment UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Access validation result
 */
export async function validateAssessmentAccess(assessmentId, userId) {
  if (!assessmentId || !userId) {
    throw new Error("Assessment ID and User ID are required");
  }

  try {
    console.log(`🔍 Validating access for user ${userId} to assessment ${assessmentId}`);
    
    // Check if assessment exists and is active
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, name, is_active, max_attempts, time_limit_minutes")
      .eq("id", assessmentId)
      .single();

    if (assessmentError) throw assessmentError;
    if (!assessment) throw new Error("Assessment not found");
    if (!assessment.is_active) throw new Error("Assessment is not active");

    // Check question count
    const questionCount = await getQuestionCount(assessmentId);
    if (questionCount === 0) {
      return {
        valid: false,
        assessment,
        error: "Assessment has no questions configured",
        questions_available: false
      };
    }

    // Check completed attempts
    const { count, error: attemptsError } = await supabase
      .from("assessment_results")
      .select("*", { count: 'exact', head: true })
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId)
      .eq("status", "completed");

    if (attemptsError) throw attemptsError;

    // Check in-progress attempts
    const { data: inProgress, error: progressError } = await supabase
      .from("assessment_timer_progress")
      .select("elapsed_seconds, started_at")
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (progressError) throw progressError;

    const attemptsUsed = count || 0;
    const maxAttempts = assessment.max_attempts || 1;
    const hasRemainingAttempts = attemptsUsed < maxAttempts;

    const result = {
      valid: hasRemainingAttempts,
      assessment: {
        ...assessment,
        question_count: questionCount,
        time_limit_seconds: (assessment.time_limit_minutes || 180) * 60
      },
      attempts_used: attemptsUsed,
      max_attempts: maxAttempts,
      remaining_attempts: Math.max(0, maxAttempts - attemptsUsed),
      has_in_progress: !!inProgress,
      in_progress_data: inProgress || null,
      questions_available: questionCount > 0
    };

    console.log(`✅ Access validation result:`, result);
    
    return result;
  } catch (error) {
    console.error("❌ Error validating assessment access:", error);
    throw new Error(`Failed to validate access: ${error.message}`);
  }
}

/**
 * Get section details for an assessment
 * @param {string} assessmentId - Assessment UUID
 * @returns {Promise<Array>} Sections with question counts
 */
export async function getAssessmentSections(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    const { data, error } = await supabase
      .from("questions")
      .select("section, count")
      .eq("assessment_id", assessmentId)
      .select('section, count(*)', { count: 'exact' })
      .group('section')
      .order('section');

    if (error) throw error;

    const sectionsWithConfig = (data || []).map(section => ({
      ...section,
      icon: SECTION_CONFIG[section.section]?.icon || '📝',
      category: SECTION_CONFIG[section.section]?.category || 'general'
    }));

    return sectionsWithConfig;
  } catch (error) {
    console.error("❌ Error fetching assessment sections:", error);
    throw new Error(`Failed to fetch sections: ${error.message}`);
  }
}

/**
 * Check if assessment is ready (has all 100 questions with answers)
 * @param {string} assessmentId - Assessment UUID
 * @returns {Promise<Object>} Readiness status
 */
export async function checkAssessmentReadiness(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    const questionCount = await getQuestionCount(assessmentId);
    
    if (questionCount !== 100) {
      return {
        ready: false,
        question_count: questionCount,
        missing_questions: 100 - questionCount,
        message: `Assessment has ${questionCount}/100 questions`
      };
    }

    // Check if all questions have answers
    const { data: questions, error } = await supabase
      .from("questions")
      .select(`
        id,
        answers!inner (
          id
        )
      `)
      .eq("assessment_id", assessmentId);

    if (error) {
      // If error with !inner, means some questions have no answers
      return {
        ready: false,
        question_count: questionCount,
        message: "Some questions are missing answers"
      };
    }

    return {
      ready: true,
      question_count: questionCount,
      message: "Assessment is ready to use"
    };
  } catch (error) {
    console.error("❌ Error checking assessment readiness:", error);
    return {
      ready: false,
      error: error.message
    };
  }
}
