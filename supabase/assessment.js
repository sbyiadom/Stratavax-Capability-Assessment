// supabase/assessment.js
import { supabase } from "./client";

/**
 * Fetch questions for a specific assessment with proper ordering
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<Array>} - Array of questions with their answers
 */
export async function getAssessmentQuestions(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(assessmentId)) {
    throw new Error("Invalid assessment ID format");
  }

  try {
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
          is_correct
        )
      `)
      .eq("assessment_id", assessmentId)
      .order("question_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) throw error;
    
    console.log(`✅ Fetched ${data?.length || 0} questions for assessment ${assessmentId}`);
    
    return data || [];
  } catch (error) {
    console.error("❌ Error fetching assessment questions:", error);
    throw error;
  }
}

/**
 * Get assessment details by ID
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<Object>} - Assessment details
 */
export async function getAssessmentById(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_categories (
          id,
          name,
          description
        )
      `)
      .eq("id", assessmentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error fetching assessment:", error);
    throw error;
  }
}

/**
 * Get total question count for an assessment
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<number>} - Total number of questions
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
    return count || 0;
  } catch (error) {
    console.error("❌ Error getting question count:", error);
    throw error;
  }
}

/**
 * Get all available assessments
 * @returns {Promise<Array>} - Array of assessments
 */
export async function getAllAssessments() {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_categories (
          id,
          name,
          description
        )
      `)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("❌ Error fetching all assessments:", error);
    throw error;
  }
}

/**
 * Get assessments by category
 * @param {string} categoryId - UUID of the category
 * @returns {Promise<Array>} - Array of assessments in the category
 */
export async function getAssessmentsByCategory(categoryId) {
  if (!categoryId) {
    throw new Error("Category ID is required");
  }

  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("❌ Error fetching assessments by category:", error);
    throw error;
  }
}

/**
 * Get questions with pagination support
 * @param {string} assessmentId - UUID of the assessment
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of questions per page
 * @returns {Promise<Object>} - Questions and pagination info
 */
export async function getAssessmentQuestionsPaginated(assessmentId, page = 1, pageSize = 10) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from("questions")
      .select("*", { count: 'exact', head: true })
      .eq("assessment_id", assessmentId);

    if (countError) throw countError;

    // Get paginated questions
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
          is_correct
        )
      `)
      .eq("assessment_id", assessmentId)
      .order("question_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    return {
      questions: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error("❌ Error fetching paginated questions:", error);
    throw error;
  }
}

/**
 * Get assessment statistics
 * @param {string} assessmentId - UUID of the assessment
 * @returns {Promise<Object>} - Assessment statistics
 */
export async function getAssessmentStats(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is required");
  }

  try {
    // Get total questions
    const totalQuestions = await getQuestionCount(assessmentId);

    // Get sections breakdown
    const { data: sections, error: sectionsError } = await supabase
      .from("questions")
      .select("section, count")
      .eq("assessment_id", assessmentId)
      .group("section");

    if (sectionsError) throw sectionsError;

    // Get average time taken (from completed assessments)
    const { data: avgTime, error: timeError } = await supabase
      .from("assessment_results")
      .select("time_spent_seconds")
      .eq("assessment_id", assessmentId)
      .eq("status", "completed");

    if (timeError) throw timeError;

    const averageTime = avgTime?.length 
      ? Math.round(avgTime.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0) / avgTime.length)
      : 0;

    return {
      assessment_id: assessmentId,
      total_questions: totalQuestions,
      sections: sections || [],
      average_completion_time: averageTime,
      total_attempts: avgTime?.length || 0
    };
  } catch (error) {
    console.error("❌ Error fetching assessment stats:", error);
    throw error;
  }
}

/**
 * Validate assessment access
 * @param {string} assessmentId - UUID of the assessment
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} - Access validation result
 */
export async function validateAssessmentAccess(assessmentId, userId) {
  if (!assessmentId || !userId) {
    throw new Error("Assessment ID and User ID are required");
  }

  try {
    // Check if assessment exists and is active
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, is_active, max_attempts")
      .eq("id", assessmentId)
      .single();

    if (assessmentError) throw assessmentError;
    if (!assessment) throw new Error("Assessment not found");
    if (!assessment.is_active) throw new Error("Assessment is not active");

    // Check number of attempts
    const { count, error: attemptsError } = await supabase
      .from("assessment_results")
      .select("*", { count: 'exact', head: true })
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId)
      .eq("status", "completed");

    if (attemptsError) throw attemptsError;

    const attemptsUsed = count || 0;
    const maxAttempts = assessment.max_attempts || 1;
    const hasRemainingAttempts = attemptsUsed < maxAttempts;

    return {
      valid: hasRemainingAttempts,
      assessment,
      attempts_used: attemptsUsed,
      max_attempts: maxAttempts,
      remaining_attempts: Math.max(0, maxAttempts - attemptsUsed)
    };
  } catch (error) {
    console.error("❌ Error validating assessment access:", error);
    throw error;
  }
}
