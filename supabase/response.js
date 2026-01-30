// supabase/response.js
import { supabase } from "./client";

export async function saveResponse(assessment_id, question_id, answer_id, user_id) {
  // Input validation
  if (!assessment_id) throw new Error("Missing assessment_id");
  if (!question_id) throw new Error("Missing question_id");
  if (!answer_id) throw new Error("Missing answer_id");
  if (!user_id) throw new Error("Missing user_id");

  const { error } = await supabase.from("responses").upsert(
    [{
      assessment_id,
      question_id,
      answer_id,
      user_id,
      updated_at: new Date().toISOString(), // optional tracking
    }],
    { onConflict: ["assessment_id", "question_id", "user_id"] }
  );

  if (error) {
    console.error("Supabase save error:", error);
    throw error;
  }
}
