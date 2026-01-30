// supabase/response.js
import { supabase } from "./client";

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  if (!user_id) throw new Error("User ID is required");

  const { error } = await supabase.from("responses").upsert(
    [
      {
        assessment_id,
        question_id,
        answer_id,
        user_id,
      },
    ],
    { onConflict: ["assessment_id", "question_id", "user_id"] }
  );

  if (error) throw error;
}
