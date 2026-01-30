import { supabase } from "./client";

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  console.log("🚀 Starting saveResponse with:", {
    assessment_id, question_id, answer_id, user_id,
    types: {
      assessment_id: typeof assessment_id,
      question_id: typeof question_id, 
      answer_id: typeof answer_id,
      user_id: typeof user_id
    }
  });

  // Convert assessment_id to UUID format
  // If assessment_id is a number (like 1), convert to UUID format
  let assessmentIdUUID;
  
  if (typeof assessment_id === 'number') {
    // Convert number to a consistent UUID (for assessment 1, 2, 3, etc.)
    assessmentIdUUID = `00000000-0000-0000-0000-${assessment_id.toString().padStart(12, '0')}`;
    console.log(`🔄 Converted assessment_id ${assessment_id} to UUID: ${assessmentIdUUID}`);
  } else if (typeof assessment_id === 'string' && assessment_id.includes('-')) {
    // Already a UUID
    assessmentIdUUID = assessment_id;
  } else {
    console.error("❌ Invalid assessment_id format:", assessment_id);
    throw new Error("Invalid assessment ID format");
  }

  // Convert other IDs to numbers
  const questionIdNum = Number(question_id);
  const answerIdNum = Number(answer_id);

  if (isNaN(questionIdNum) || isNaN(answerIdNum)) {
    console.error("❌ Invalid number conversion:", { question_id, answer_id });
    throw new Error("Invalid question or answer data");
  }

  if (!user_id || typeof user_id !== 'string') {
    console.error("❌ Invalid user_id:", user_id);
    throw new Error("Invalid user session");
  }

  console.log("✅ Final values for save:", {
    assessment_id: assessmentIdUUID,
    question_id: questionIdNum,
    answer_id: answerIdNum,
    user_id
  });

  try {
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        {
          assessment_id: assessmentIdUUID,  // UUID format
          question_id: questionIdNum,
          answer_id: answerIdNum,
          user_id: user_id,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'assessment_id,question_id,user_id',
        }
      )
      .select();

    if (error) {
      console.error("❌ Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log("✅ Save successful:", data);
    return { success: true, data };
    
  } catch (error) {
    console.error("💥 Save failed:", error);
    throw new Error(getUserFriendlyError(error));
  }
}

function getUserFriendlyError(error) {
  console.log("🆘 Error code:", error.code);
  
  switch(error.code) {
    case '22P02': // invalid_text_representation
      return "Data type mismatch. The assessment ID format is incorrect.";
    case '23505': // unique_violation
      return "You've already answered this question.";
    case '23503': // foreign_key_violation
      return "Invalid question or answer reference.";
    default:
      return `Failed to save answer: ${error.message || 'Please try again.'}`;
  }
}
