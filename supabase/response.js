import { supabase } from "./client";

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  console.log("🚀 Starting saveResponse with:", {
    assessment_id, question_id, answer_id, user_id
  });

  // Validate inputs
  if (!assessment_id || !question_id || !answer_id || !user_id) {
    const error = new Error("Missing required parameters");
    console.error("❌ Validation failed:", error.message, {
      assessment_id, question_id, answer_id, user_id
    });
    throw error;
  }

  try {
    // FIX 1: Use string format instead of array for onConflict
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
          // CORRECT: String format matching your constraint
          onConflict: 'assessment_id,question_id,user_id',
        }
      )
      .select();

    if (error) {
      console.error("❌ Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Try alternative approach if UPSERT fails
      return await saveResponseAlternative(
        assessment_id, question_id, answer_id, user_id
      );
    }

    console.log("✅ Save successful:", data);
    return { success: true, data };
    
  } catch (error) {
    console.error("💥 Unexpected error in saveResponse:", error);
    throw new Error(getUserFriendlyError(error));
  }
}

// Alternative save method without UPSERT
async function saveResponseAlternative(assessment_id, question_id, answer_id, user_id) {
  console.log("🔄 Trying alternative save method...");
  
  try {
    // 1. Check if record exists
    const { data: existing, error: fetchError } = await supabase
      .from("responses")
      .select("id")
      .eq("assessment_id", assessment_id)
      .eq("question_id", question_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError);
      throw fetchError;
    }

    let result;
    
    if (existing) {
      // 2A. UPDATE existing record
      console.log("📝 Updating existing record ID:", existing.id);
      const { data, error: updateError } = await supabase
        .from("responses")
        .update({
          answer_id: Number(answer_id),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select();

      if (updateError) throw updateError;
      result = data;
      console.log("✅ Update successful:", data);
      
    } else {
      // 2B. INSERT new record
      console.log("🆕 Inserting new record");
      const { data, error: insertError } = await supabase
        .from("responses")
        .insert({
          assessment_id: Number(assessment_id),
          question_id: Number(question_id),
          answer_id: Number(answer_id),
          user_id: user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (insertError) throw insertError;
      result = data;
      console.log("✅ Insert successful:", data);
    }
    
    return { success: true, data: result };
    
  } catch (error) {
    console.error("❌ Alternative save also failed:", error);
    throw error;
  }
}

function getUserFriendlyError(error) {
  console.log("🆘 Error code:", error.code);
  
  switch(error.code) {
    case '23505': // unique_violation
      return "You've already answered this question.";
    case '42501': // insufficient_privilege
      return "Permission denied. Please log in again.";
    case '23503': // foreign_key_violation
      return "Invalid question or answer reference.";
    case '22P02': // invalid_text_representation
      return "Invalid data format. Please refresh and try again.";
    case '400': // bad request
      if (error.message?.includes('unique constraint')) {
        return "Duplicate answer detected.";
      }
      return "Bad request to database.";
    default:
      if (error.message?.includes('duplicate key')) {
        return "This answer already exists.";
      }
      return "Failed to save answer. Please try again.";
  }
}
