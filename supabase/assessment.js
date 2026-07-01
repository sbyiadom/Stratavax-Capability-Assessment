// supabase/assessment.js

// ======================================================
// QUESTIONS - SIMPLIFIED FIXED VERSION
// ======================================================

export async function getUniqueQuestions(assessmentId) {
  try {
    console.log(`[getUniqueQuestions] Fetching questions for assessment ID: ${assessmentId}`);
    
    if (!assessmentId) {
      console.warn("[getUniqueQuestions] No assessment ID provided");
      return [];
    }

    // Step 1: Get the assessment to find its assessment_type_id
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("assessment_type_id, title")
      .eq("id", assessmentId)
      .maybeSingle();

    if (assessmentError) {
      console.error("[getUniqueQuestions] Error fetching assessment:", assessmentError);
      return [];
    }

    if (!assessment) {
      console.warn(`[getUniqueQuestions] Assessment not found for ID: ${assessmentId}`);
      return [];
    }

    const assessmentTypeId = assessment.assessment_type_id;
    console.log(`[getUniqueQuestions] Assessment type ID: ${assessmentTypeId} (${typeof assessmentTypeId})`);

    if (!assessmentTypeId) {
      console.warn(`[getUniqueQuestions] No assessment_type_id found for assessment ${assessmentId}`);
      return [];
    }

    // Step 2: Get questions for this assessment type with their answers
    const { data: questionsData, error: questionsError } = await supabase
      .from("unique_questions")
      .select(`
        id,
        section,
        subsection,
        question_text,
        display_order,
        assessment_type_id,
        unique_answers (
          id,
          answer_text,
          score,
          display_order
        )
      `)
      .eq("assessment_type_id", assessmentTypeId)
      .order("display_order", { ascending: true });

    if (questionsError) {
      console.error("[getUniqueQuestions] Error fetching questions:", questionsError);
      return [];
    }

    console.log(`[getUniqueQuestions] Found ${questionsData?.length || 0} questions`);

    if (!questionsData || questionsData.length === 0) {
      console.warn(`[getUniqueQuestions] No questions found for assessment_type_id: ${assessmentTypeId}`);
      
      // Fallback: Try querying without the nested relation
      console.log("[getUniqueQuestions] Trying fallback query without nested relation...");
      
      const { data: fallbackQuestions, error: fallbackError } = await supabase
        .from("unique_questions")
        .select("*")
        .eq("assessment_type_id", assessmentTypeId)
        .order("display_order", { ascending: true });

      if (fallbackError) {
        console.error("[getUniqueQuestions] Fallback query error:", fallbackError);
        return [];
      }

      console.log(`[getUniqueQuestions] Fallback found ${fallbackQuestions?.length || 0} questions`);

      if (!fallbackQuestions || fallbackQuestions.length === 0) {
        return [];
      }

      // Get answers separately
      const questionIds = fallbackQuestions.map(q => q.id);
      const { data: answersData, error: answersError } = await supabase
        .from("unique_answers")
        .select("*")
        .in("question_id", questionIds);

      if (answersError) {
        console.error("[getUniqueQuestions] Error fetching answers:", answersError);
        return [];
      }

      // Build the questions with answers
      const formattedQuestions = fallbackQuestions.map((question) => {
        const answers = safeArray(answersData)
          .filter(a => a.question_id === question.id)
          .map((answer) => ({
            id: answer.id,
            answer_text: answer.answer_text,
            score: answer.score,
            display_order: answer.display_order
          }));

        if (answers.length === 0) {
          console.warn(`[getUniqueQuestions] Question ${question.id} has no answers, skipping`);
          return null;
        }

        return {
          id: question.id,
          question_text: question.question_text,
          section: question.section || "General",
          subsection: question.subsection || "",
          display_order: question.display_order || 1,
          answers: shuffleArray(answers)
        };
      });

      const validQuestions = formattedQuestions.filter(q => q !== null);
      console.log(`[getUniqueQuestions] Returning ${validQuestions.length} valid questions from fallback`);
      return shuffleArray(validQuestions);
    }

    // Step 3: Format the questions (normal path)
    const formattedQuestions = questionsData.map((question, index) => {
      const answers = safeArray(question.unique_answers).map((answer) => ({
        id: answer.id,
        answer_text: answer.answer_text,
        score: answer.score,
        display_order: answer.display_order
      }));

      if (answers.length === 0) {
        console.warn(`[getUniqueQuestions] Question ${question.id} has no answers, skipping`);
        return null;
      }

      return {
        id: question.id,
        question_text: question.question_text,
        section: question.section || "General",
        subsection: question.subsection || "",
        display_order: index + 1,
        answers: shuffleArray(answers)
      };
    });

    const validQuestions = formattedQuestions.filter(q => q !== null);
    console.log(`[getUniqueQuestions] Returning ${validQuestions.length} valid questions`);

    return shuffleArray(validQuestions);

  } catch (error) {
    console.error("[getUniqueQuestions] Error:", error);
    return [];
  }
}
