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

    // Get the result
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
    console.log("[API] Session ID:", result.session_id);

    // ============================================================
    // BUILD CATEGORY BREAKDOWN FROM QUESTIONS AND RESPONSES
    // ============================================================
    let categoryBreakdown = [];

    try {
      // Get the assessment type ID
      const assessmentResponse = await serviceClient
        .from("assessments")
        .select("assessment_type_id")
        .eq("id", result.assessment_id)
        .single();

      const assessmentTypeId = assessmentResponse.data?.assessment_type_id;
      console.log("[API] Assessment type ID:", assessmentTypeId);

      if (!assessmentTypeId) {
        console.warn("[API] No assessment type ID found");
      } else {
        // Get all questions for this assessment type
        const { data: questions, error: questionsError } = await serviceClient
          .from("unique_questions")
          .select("id, section, question_text")
          .eq("assessment_type_id", assessmentTypeId);

        if (questionsError) {
          console.error("[API] Questions error:", questionsError);
        }

        console.log("[API] Questions found:", questions?.length || 0);

        // Get all responses for this session
        const { data: responses, error: responsesError } = await serviceClient
          .from("responses")
          .select("question_id, answer_id")
          .eq("session_id", result.session_id);

        if (responsesError) {
          console.error("[API] Responses error:", responsesError);
        }

        console.log("[API] Responses found:", responses?.length || 0);

        // Build category breakdown if we have questions
        if (questions && questions.length > 0) {
          // Map responses by question_id
          const responseMap = {};
          responses?.forEach(r => {
            responseMap[r.question_id] = r.answer_id;
          });

          // Group by section/category
          const categoryMap = {};

          questions.forEach(q => {
            const section = q.section || "General";
            if (!categoryMap[section]) {
              categoryMap[section] = { earned: 0, max: 0, count: 0 };
            }
            categoryMap[section].max += 1;
            if (responseMap[q.id]) {
              categoryMap[section].earned += 1;
            }
            categoryMap[section].count += 1;
          });

          // Convert to array with percentages and dimensions
          categoryBreakdown = Object.keys(categoryMap).map(key => {
            const data = categoryMap[key];
            const percentage = data.max > 0 ? Math.round((data.earned / data.max) * 100) : 0;
            
            // Determine dimension (workplace vs intellectual)
            let dimension = 'other';
            const workplaceKeywords = [
              'safety', 'risk', 'problem', 'troubleshoot', 'technical', 
              'learning', 'communication', 'teamwork', 'ownership', 
              'integrity', 'professional', 'work ethic', 'adaptability'
            ];
            const intellectualKeywords = [
              'numerical', 'logical', 'measurement', 'engineering', 
              'spatial', 'reasoning', 'aptitude', 'analytical'
            ];
            
            const lowerKey = key.toLowerCase();
            if (workplaceKeywords.some(k => lowerKey.includes(k))) {
              dimension = 'workplace';
            } else if (intellectualKeywords.some(k => lowerKey.includes(k))) {
              dimension = 'intellectual';
            }
            
            return {
              category: key,
              earned: data.earned,
              max: data.max,
              percentage: percentage,
              dimension: dimension,
              count: data.count
            };
          });

          console.log("[API] Category breakdown built:", categoryBreakdown.length);
          console.log("[API] Categories:", categoryBreakdown.map(c => c.category).join(', '));
        }
      }
    } catch (err) {
      console.error("[API] Error building category breakdown:", err);
    }

    // ============================================================
    // BUILD THE COMPLETE REPORT
    // ============================================================
    let report = result.report_data || {};

    // Add category breakdown
    if (categoryBreakdown.length > 0) {
      report.categoryBreakdown = categoryBreakdown;
    }

    // Ensure dimensions
    if (!report.dimensions) {
      report.dimensions = {
        workplaceReadiness: result.workplace_readiness || 0,
        intellectualCapability: result.intellectual_capability || 0,
        overallScore: result.percentage_score || 0
      };
    }

    // Ensure recommendation
    if (!report.recommendation) {
      report.recommendation = {
        level: result.recommendation || 'Not Recommended'
      };
    }

    // Ensure executiveSummary
    if (!report.executiveSummary) {
      const wr = report.dimensions.workplaceReadiness || 0;
      const ic = report.dimensions.intellectualCapability || 0;
      report.executiveSummary = {
        workplaceBand: wr >= 75 ? 'Ready' : wr >= 65 ? 'Developing' : 'Needs Improvement',
        intellectualBand: ic >= 75 ? 'High Potential' : ic >= 65 ? 'Moderate Potential' : 'Development Required'
      };
    }

    // Ensure candidateInfo
    if (!report.candidateInfo) {
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

    // Ensure statistics
    if (!report.statistics) {
      report.statistics = {
        totalQuestions: result.total_questions || 0,
        totalAnswered: result.answered_questions || 0
      };
    }

    // Determine if National Service
    const isNationalService = result.workplace_readiness !== null && result.workplace_readiness !== undefined;

    console.log("[API] Final category breakdown count:", report.categoryBreakdown?.length || 0);

    return res.status(200).json({
      success: true,
      result: result,
      report: report,
      isNationalService: isNationalService,
      executiveSummary: {
        workplaceReadiness: result.workplace_readiness,
        intellectualCapability: result.intellectual_capability,
        overallScore: result.percentage_score,
        recommendation: result.recommendation
      }
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
