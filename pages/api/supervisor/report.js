// pages/api/supervisor/report.js - FIXED FINAL VERSION

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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "Supabase environment variables are missing." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  try {
    console.log(`Fetching report for user: ${userId}`);

    let query = supabase
      .from("assessment_results")
      .select("*, assessments(*)")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (assessmentId) {
      query = query.eq("assessment_id", assessmentId);
    }

    const { data: results, error } = await query.limit(1);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No completed assessments found for this candidate."
      });
    }

    const record = results[0];

    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("full_name, email, id")
      .eq("id", userId)
      .single();

    const percentage = Number(record.percentage_score) || 0;

    let classification = "High Risk";
    if (percentage >= 85) classification = "Exceptional";
    else if (percentage >= 75) classification = "Strong Performer";
    else if (percentage >= 65) classification = "Capable Contributor";
    else if (percentage >= 55) classification = "Developing";
    else if (percentage >= 40) classification = "At Risk";

    const report = {
      candidateName: candidate?.full_name || candidate?.email || "Candidate",
      assessmentName: record.assessments?.title || "Assessment",
      percentage,
      classification,
      executiveSummary: `Candidate scored ${percentage}%`,
      roleReadiness: percentage >= 75 ? "Ready" : "Needs development",
      categoryScores: [],
      strengths: [],
      developmentAreas: [],
      recommendations: [],
      followUpQuestions: []
    };

    return res.status(200).json({
      success: true,
      candidate,
      assessment: record.assessments,
      generatedReport: report
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
