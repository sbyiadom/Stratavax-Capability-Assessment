// pages/api/supervisor/report.js - SIMPLIFIED ADMIN BYPASS VERSION

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const userId = req.query.user_id || req.query.userId;
  const assessmentId = req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "Supabase environment variables are missing." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // ===== DIRECT ADMIN BYPASS =====
    const ADMIN_EMAILS = ['sbyiadom88@gmail.com'];
    let requestingUserEmail = null;
    let isAdminBypass = false;

    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        requestingUserEmail = user.email;
        isAdminBypass = ADMIN_EMAILS.includes(requestingUserEmail);
        console.log(`🔐 User: ${requestingUserEmail}, Admin Bypass: ${isAdminBypass}`);
      }
    }

    // If not admin bypass, check other permissions
    if (!isAdminBypass) {
      // Get candidate to check supervisor
      const { data: candidate } = await supabase
        .from("candidate_profiles")
        .select("supervisor_id")
        .eq("id", userId)
        .single();

      const isDirectSupervisor = candidate && candidate.supervisor_id === requestingUserEmail;
      
      if (!isDirectSupervisor && !requestingUserEmail) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to view this report",
          requires_share: true
        });
      }
    }

    // ===== Fetch assessment results =====
    let resultQuery = supabase
      .from("assessment_results")
      .select("*, assessments(*)")
      .eq("user_id", userId);

    if (assessmentId) {
      resultQuery = resultQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultQuery.order("completed_at", { ascending: false });

    if (resultsError) {
      return res.status(500).json({ success: false, error: resultsError.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No assessment results found for this candidate.",
        user_id: userId
      });
    }

    const storedResult = results[0];
    const assessment = storedResult.assessments || null;

    // Get candidate profile
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    // Build simple report
    const generatedReport = {
      candidateName: candidate?.full_name || "Candidate",
      assessmentName: assessment?.title || "Assessment",
      userId: userId,
      assessmentId: assessmentId || assessment?.id,
      totalScore: storedResult.total_score || 0,
      maxScore: storedResult.max_score || 100,
      percentage: storedResult.percentage_score || 0,
      classification: "Completed",
      riskLevel: "N/A",
      executiveSummary: `${candidate?.full_name || "Candidate"} completed the ${assessment?.title || "assessment"} with a score of ${storedResult.percentage_score || 0}%.`,
      categoryScores: [],
      strengths: [],
      developmentAreas: [],
      recommendations: [],
      followUpQuestions: []
    };

    return res.status(200).json({
      success: true,
      candidate: candidate || { id: userId },
      assessment: assessment,
      generatedReport: generatedReport,
      result: storedResult
    });

  } catch (error) {
    console.error("Report generation error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
