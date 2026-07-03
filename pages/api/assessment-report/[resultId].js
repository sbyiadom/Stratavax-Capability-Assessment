// pages/api/assessment-report/[resultId].js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { resultId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!resultId) {
    return res.status(400).json({ success: false, error: "Missing resultId" });
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

    // Get the result with full data
    const resultResponse = await serviceClient
      .from("assessment_results")
      .select("*")
      .eq("id", resultId)
      .single();

    if (resultResponse.error || !resultResponse.data) {
      console.error("Result fetch error:", resultResponse.error);
      return res.status(404).json({
        success: false,
        error: "Result not found"
      });
    }

    const result = resultResponse.data;
    console.log("[API] Result found:", result.id);
    console.log("[API] report_data exists:", !!result.report_data);
    console.log("[API] workplace_readiness:", result.workplace_readiness);
    console.log("[API] intellectual_capability:", result.intellectual_capability);
    console.log("[API] recommendation:", result.recommendation);

    // Get assessment details to determine report type
    let assessmentTypeCode = null;
    let isNationalService = false;

    if (result.assessment_id) {
      const assessmentResponse = await serviceClient
        .from("assessments")
        .select("*, assessment_type:assessment_types(*)")
        .eq("id", result.assessment_id)
        .single();

      if (!assessmentResponse.error && assessmentResponse.data) {
        const assessment = assessmentResponse.data;
        assessmentTypeCode = assessment.assessment_type?.code;
        console.log("[API] Assessment type code:", assessmentTypeCode);
        
        // Check if it's National Service
        if (assessmentTypeCode === 'national_service') {
          isNationalService = true;
        }
      }
    }

    // Also check if the result itself has National Service fields
    if (result.workplace_readiness !== undefined && result.workplace_readiness !== null) {
      isNationalService = true;
      console.log("[API] Detected National Service from result fields");
    }

    // Check if report_data has National Service structure
    if (result.report_data && result.report_data.dimensions && 
        result.report_data.dimensions.workplaceReadiness !== undefined) {
      isNationalService = true;
      console.log("[API] Detected National Service from report_data structure");
    }

    console.log("[API] isNationalService:", isNationalService);

    return res.status(200).json({
      success: true,
      result: result,
      report: result.report_data || null,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      executiveSummary: isNationalService ? {
        workplaceReadiness: result.workplace_readiness,
        intellectualCapability: result.intellectual_capability,
        overallScore: result.percentage_score,
        recommendation: result.recommendation
      } : null
    });

  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch report",
      message: error?.message || "Internal server error"
    });
  }
}
