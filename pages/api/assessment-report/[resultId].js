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
      .select(`
        *,
        candidate_profiles!inner(full_name, email, university, programme, graduation_year, preferred_department),
        assessments!inner(title, assessment_type:assessment_types(id, code, name))
      `)
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
    console.log("[API] Assessment type code:", result.assessments?.assessment_type?.code);

    // Determine if this is a National Service assessment
    const assessmentTypeCode = result.assessments?.assessment_type?.code || null;
    const isNationalService = 
      assessmentTypeCode === 'national_service' ||
      (result.workplace_readiness !== null && result.workplace_readiness !== undefined) ||
      (result.report_data && result.report_data.dimensions && 
       result.report_data.dimensions.workplaceReadiness !== undefined);

    console.log("[API] isNationalService:", isNationalService);

    // Build the report data
    let report = result.report_data || null;

    // If this is a National Service assessment but report_data is missing, build it
    if (isNationalService && !report) {
      report = {
        dimensions: {
          workplaceReadiness: result.workplace_readiness || 0,
          intellectualCapability: result.intellectual_capability || 0,
          overallScore: result.percentage_score || 0
        },
        recommendation: {
          level: result.recommendation || 'Not Recommended'
        },
        statistics: {
          totalQuestions: result.total_questions || 0,
          totalAnswered: result.answered_questions || 0
        },
        candidateInfo: {
          fullName: result.candidate_profiles?.full_name || 'Candidate',
          university: result.candidate_profiles?.university || '',
          programme: result.candidate_profiles?.programme || '',
          graduationYear: result.candidate_profiles?.graduation_year || '',
          preferredDepartment: result.candidate_profiles?.preferred_department || '',
          assessmentDate: new Date(result.completed_at).toLocaleDateString()
        }
      };
    }

    return res.status(200).json({
      success: true,
      result: result,
      report: report,
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
