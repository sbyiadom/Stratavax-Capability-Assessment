// pages/api/assessment/[id].js - SIMPLIFIED WORKING VERSION

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "GET") {
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
      return res.status(500).json({ 
        success: false, 
        error: "Server configuration error",
        details: "Missing environment variables"
      });
    }

    console.log("Fetching assessment with ID:", id);

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // First, get the assessment
    const { data: assessment, error: assessmentError } = await serviceClient
      .from("assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (assessmentError) {
      console.error("Assessment fetch error:", assessmentError);
      return res.status(500).json({
        success: false,
        error: "Database error",
        details: assessmentError.message
      });
    }

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: "Assessment not found"
      });
    }

    // Then get the assessment type
    let assessmentType = null;
    if (assessment.assessment_type_id) {
      const { data: type, error: typeError } = await serviceClient
        .from("assessment_types")
        .select("*")
        .eq("id", assessment.assessment_type_id)
        .maybeSingle();

      if (!typeError && type) {
        assessmentType = type;
        assessment.assessment_type = type;
      }
    }

    console.log("Assessment found:", assessment.title);

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
