import { supabase } from "./client";

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  if (!assessment_id || !question_id || !answer_id || !user_id) {
    throw new Error("Missing fields in saveResponse()");
  }

  const { error } = await supabase.from("responses").upsert(
    [
      {
        assessment_id,
        question_id,
        answer_id,
        user_id,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: ["assessment_id", "question_id", "user_id"] }
  );

  if (error) {
    console.error("Supabase save error:", error);
    throw new Error(error.message);
  }

  return true;
}
