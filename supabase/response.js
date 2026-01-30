import { supabase } from "./client";

// Helper function to convert number to UUID format
const toAssessmentUUID = (id) => {
  const num = Number(id);
  if (isNaN(num) || num <= 0) {
    console.warn(`⚠️ Invalid assessment ID: ${id}, using default UUID`);
    return '00000000-0000-0000-0000-000000000001';
  }
  return `00000000-0000-0000-0000-${num.toString().padStart(12, '0')}`;
};

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  console.group("💾 saveResponse");
  console.log("Input:", { assessment_id, question_id, answer_id, user_id });
  
  // Validate inputs
  if (!assessment_id || !question_id || !answer_id || !user_id) {
    console.error("❌ Missing required parameters");
    throw new Error("Missing required data for saving response");
  }
  
  // Convert to correct types
  const assessmentIdUUID = toAssessmentUUID(assessment_id);
  const questionIdNum = Number(question_id);
  const answerIdNum = Number(answer_id);
  
  console.log("Converted:", {
    assessmentIdUUID,
    questionIdNum,
    answerIdNum,
    user_id
  });
  
  // Validate conversions
  if (isNaN(questionIdNum) || isNaN(answerIdNum)) {
    console.error("❌ Invalid ID conversion:", { question_id, answer_id });
    throw new Error("Invalid question or answer data");
  }
  
  if (typeof user_id !== 'string' || user_id.length < 10) {
    console.error("❌ Invalid user_id format:", user_id);
    throw new Error("Invalid user session");
  }
  
  try {
    // First, try to check if record exists
    console.log("🔍 Checking for existing response...");
    const { data: existing, error: checkError } = await supabase
      .from("responses")
      .select("id")
      .eq("assessment_id", assessmentIdUUID)
      .eq("question_id", questionIdNum)
      .eq("user_id", user_id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("❌ Check error:", checkError);
    }
    
    let result;
    
    if (existing) {
      // UPDATE existing response
      console.log("📝 Updating existing response ID:", existing.id);
      const { data, error: updateError } = await supabase
        .from("responses")
        .update({
          answer_id: answerIdNum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select();
      
      if (updateError) {
        console.error("❌ Update error:", updateError);
        throw updateError;
      }
      
      result = data;
      console.log("✅ Update successful:", data);
      
    } else {
      // INSERT new response
      console.log("🆕 Inserting new response");
      const { data, error: insertError } = await supabase
        .from("responses")
        .insert({
          assessment_id: assessmentIdUUID,
          question_id: questionIdNum,
          answer_id: answerIdNum,
          user_id: user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();
      
      if (insertError) {
        console.error("❌ Insert error:", insertError);
        
        // Try UPSERT as fallback
        console.log("🔄 Trying UPSERT fallback...");
        return await tryUpsertFallback(assessmentIdUUID, questionIdNum, answerIdNum, user_id);
      }
      
      result = data;
      console.log("✅ Insert successful:", data);
    }
    
    console.groupEnd();
    return { success: true, data: result };
    
  } catch (error) {
    console.error("💥 saveResponse failed:", error);
    console.groupEnd();
    throw new Error(getUserFriendlyError(error));
  }
}

// UPSERT fallback function
async function tryUpsertFallback(assessmentIdUUID, questionIdNum, answerIdNum, user_id) {
  try {
    console.log("🔄 Attempting UPSERT...");
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        {
          assessment_id: assessmentIdUUID,
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
    
    if (error) throw error;
    
    console.log("✅ UPSERT successful:", data);
    return { success: true, data };
    
  } catch (upsertError) {
    console.error("❌ UPSERT also failed:", upsertError);
    throw upsertError;
  }
}

// User-friendly error messages
function getUserFriendlyError(error) {
  console.log("🆘 Raw error code:", error?.code);
  
  if (!error) return "Unknown error occurred";
  
  switch(error.code) {
    case '22P02': // invalid_text_representation
      return "Data format error. Please refresh and try again.";
    case '23505': // unique_violation
      return "You've already answered this question.";
    case '23503': // foreign_key_violation
      return "Invalid question or answer reference.";
    case '42501': // insufficient_privilege
      return "Permission denied. Please log in again.";
    case '42703': // undefined_column
      return "Database configuration error.";
    case 'PGRST116': // no rows returned (not an error)
      return "No existing response found.";
    default:
      if (error.message?.includes('invalid input syntax')) {
        return "Invalid data format.";
      }
      if (error.message?.includes('duplicate key')) {
        return "Duplicate answer detected.";
      }
      return error.message || "Failed to save answer. Please try again.";
  }
}
