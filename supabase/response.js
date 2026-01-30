import { supabase } from "./client";

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  // Validate all required parameters
  if (!assessment_id || !question_id || !answer_id || !user_id) {
    console.error("Missing required parameters:", {
      assessment_id, question_id, answer_id, user_id
    });
    throw new Error("Missing required parameters for saving response");
  }

  console.log("Attempting to save response:", {
    assessment_id, question_id, answer_id, user_id
  });

  try {
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        {
          assessment_id: Number(assessment_id),
          question_id: Number(question_id),
          answer_id: Number(answer_id),
          user_id: user_id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "assessment_id,question_id,user_id",
          ignoreDuplicates: false,
        }
      )
      .select();

    if (error) {
      console.error("Supabase save error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log("Successfully saved response:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to save response:", error);
    
    // Provide user-friendly error message
    let userMessage = "Failed to save answer. Please try again.";
    
    if (error.code === '42501') {
      userMessage = "Permission denied. Please check if you're logged in.";
    } else if (error.code === '23503') {
      userMessage = "Invalid question or answer reference.";
    } else if (error.code === '23505') {
      userMessage = "You've already answered this question.";
    }
    
    throw new Error(userMessage);
  }
}
