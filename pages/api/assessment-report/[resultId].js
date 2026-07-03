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

    // Get assessment details
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
        
        if (assessmentTypeCode === 'national_service') {
          isNationalService = true;
        }
      }
    }

    if (result.workplace_readiness !== undefined && result.workplace_readiness !== null) {
      isNationalService = true;
    }

    if (result.report_data && result.report_data.dimensions && 
        result.report_data.dimensions.workplaceReadiness !== undefined) {
      isNationalService = true;
    }

    // ============================================================
    // FETCH CATEGORY BREAKDOWN FROM THE DATABASE
    // ============================================================
    let categoryBreakdown = [];

    if (result.report_data && result.report_data.categoryBreakdown) {
      // Use the category breakdown from report_data
      categoryBreakdown = result.report_data.categoryBreakdown;
      console.log("[API] Category breakdown from report_data:", categoryBreakdown.length);
    } else if (result.report_data && result.report_data.categoryScores) {
      // Alternative field name
      categoryBreakdown = result.report_data.categoryScores;
      console.log("[API] Category scores from report_data:", categoryBreakdown.length);
    } else {
      // Try to fetch from the database if not in report_data
      try {
        // Get the assessment type ID
        const assessmentResponse = await serviceClient
          .from("assessments")
          .select("assessment_type_id")
          .eq("id", result.assessment_id)
          .single();

        if (assessmentResponse.data) {
          const assessmentTypeId = assessmentResponse.data.assessment_type_id;
          
          // Get questions with their sections/categories
          const { data: questions, error: questionsError } = await serviceClient
            .from("unique_questions")
            .select("id, section, question_text")
            .eq("assessment_type_id", assessmentTypeId)
            .eq("is_active", true);

          if (!questionsError && questions) {
            // Get responses for this session
            const { data: responses, error: responsesError } = await serviceClient
              .from("responses")
              .select("question_id, answer_id")
              .eq("session_id", result.session_id);

            if (!responsesError && responses) {
              // Build category breakdown
              const categoryMap = {};
              const categoryMaxMap = {};

              questions.forEach(q => {
                const section = q.section || "General";
                if (!categoryMap[section]) {
                  categoryMap[section] = { earned: 0, max: 0, count: 0 };
                  categoryMaxMap[section] = { max: 0 };
                }
                // Get max score for this question
                // This is simplified - you may need to fetch answer scores
                categoryMap[section].max += 1;
                categoryMaxMap[section].max += 1;
                
                const response = responses.find(r => r.question_id === q.id);
                if (response && response.answer_id) {
                  categoryMap[section].earned += 1;
                }
                categoryMap[section].count += 1;
              });

              // Calculate percentages and build the breakdown
              categoryBreakdown = Object.keys(categoryMap).map(key => {
                const earned = categoryMap[key].earned;
                const max = categoryMap[key].max;
                const percentage = max > 0 ? Math.round((earned / max) * 100) : 0;
                return {
                  category: key,
                  earned: earned,
                  max: max,
                  percentage: percentage,
                  dimension: isWorkplaceCategory(key) ? 'workplace' : 
                             isIntellectualCategory(key) ? 'intellectual' : 'other'
                };
              });
            }
          }
        }
      } catch (err) {
        console.error("[API] Error fetching category breakdown:", err);
      }
    }

    // ============================================================
    // HELPER FUNCTIONS FOR CATEGORY MAPPING
    // ============================================================
    function isWorkplaceCategory(category) {
      const workplaceKeywords = ['safety', 'risk', 'problem', 'troubleshoot', 'technical', 'learning', 'communication', 'teamwork', 'ownership', 'integrity', 'professional', 'work ethic'];
      const normalized = category.toLowerCase().replace(/\s+/g, '_');
      return workplaceKeywords.some(key => normalized.includes(key));
    }

    function isIntellectualCategory(category) {
      const intellectualKeywords = ['numerical', 'logical', 'measurement', 'engineering', 'spatial', 'reasoning', 'aptitude'];
      const normalized = category.toLowerCase().replace(/\s+/g, '_');
      return intellectualKeywords.some(key => normalized.includes(key));
    }

    // ============================================================
    // BUILD THE REPORT DATA
    // ============================================================
    let report = result.report_data || {};

    // If we have category breakdown but it's not in the report, add it
    if (categoryBreakdown.length > 0 && !report.categoryBreakdown) {
      report.categoryBreakdown = categoryBreakdown;
    }

    // Ensure dimensions exist
    if (!report.dimensions) {
      report.dimensions = {
        workplaceReadiness: result.workplace_readiness || 0,
        intellectualCapability: result.intellectual_capability || 0,
        overallScore: result.percentage_score || 0
      };
    }

    // Ensure candidateInfo exists
    if (!report.candidateInfo) {
      // Try to fetch candidate info
      const { data: profile, error: profileError } = await serviceClient
        .from("candidate_profiles")
        .select("full_name, email, university, programme, graduation_year, preferred_department")
        .eq("id", result.user_id)
        .single();

      if (!profileError && profile) {
        report.candidateInfo = {
          fullName: profile.full_name || 'Candidate',
          university: profile.university || 'Not Specified',
          programme: profile.programme || 'Not Specified',
          graduationYear: profile.graduation_year || 'Not Specified',
          preferredDepartment: profile.preferred_department || 'Not Specified',
          assessmentDate: new Date(result.completed_at).toLocaleDateString()
        };
      }
    }

    console.log("[API] Final report has categoryBreakdown:", 
      report.categoryBreakdown ? report.categoryBreakdown.length : 0);

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
