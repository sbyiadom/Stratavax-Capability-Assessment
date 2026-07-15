// pages/api/assessment/[id].js - FIXED VERSION

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { id } = req.query;

  // Allow both GET and POST for flexibility
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing assessment ID" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const serviceClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Get the assessment with its type
    const { data: assessment, error: assessmentError } = await serviceClient
      .from("assessments")
      .select(`
        id,
        title,
        description,
        question_count,
        time_limit_minutes,
        attempts_allowed,
        is_active,
        assessment_type_id,
        assessment_types:assessment_type_id (
          id,
          code,
          name,
          description,
          category_config,
          time_limit_minutes as type_time_limit
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (assessmentError) {
      console.error("Assessment fetch error:", assessmentError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch assessment",
        details: assessmentError.message
      });
    }

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: "Assessment not found"
      });
    }

    // Get the total question count for this assessment type
    const { count: questionCount, error: countError } = await serviceClient
      .from("unique_questions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_type_id", assessment.assessment_type_id);

    if (!countError && questionCount !== null) {
      assessment.question_count = questionCount;
    }

    return res.status(200).json({
      success: true,
      ...assessment
    });

  } catch (error) {
    console.error("Error fetching assessment:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch assessment",
      message: error.message
    });
  }
}
