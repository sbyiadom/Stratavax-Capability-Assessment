import { supabase } from "./client";

export async function saveResponse(
  assessment_id,
  question_id,
  answer_id,
  user_id
) {
  const { error } = await supabase
    .from("responses")
    .upsert(
      {
        assessment_id,
        question_id,
        answer_id,
        user_id,
      },
      {
        onConflict: "assessment_id,question_id,user_id",
      }
    );

  if (error) {
    console.error("Save response error:", error);
    throw error;
  }

  // SUCCESS — do nothing
  return true;
}
