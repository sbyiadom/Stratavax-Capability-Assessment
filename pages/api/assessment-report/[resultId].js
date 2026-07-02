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
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Get the result
    const resultResponse = await serviceClient
      .from("assessment_results")
      .select("*")
      .eq("id", resultId)
      .single();

    if (resultResponse.error || !resultResponse.data) {
      return res.status(404).json({
        success: false,
        error: "Result not found"
      });
    }

    const result = resultResponse.data;

    // Check if it's a National Service assessment
    let report = null;
    let isNationalService = false;

    if (result.assessment_id) {
      const assessmentResponse = await serviceClient
        .from("assessments")
        .select("*, assessment_type:assessment_types(*)")
        .eq("id", result.assessment_id)
        .single();

      if (!assessmentResponse.error && assessmentResponse.data) {
        const assessment = assessmentResponse.data;
        isNationalService = assessment.assessment_type?.code === 'national_service';
        
        // If it's National Service and we have report_data in the result
        if (isNationalService && result.report_data) {
          report = result.report_data;
        }
      }
    }

    return res.status(200).json({
      success: true,
      result: result,
      report: report,
      isNationalService: isNationalService,
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
      error: "Failed to fetch report"
    });
  }
}
