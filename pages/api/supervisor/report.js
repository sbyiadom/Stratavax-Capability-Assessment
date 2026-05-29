// pages/api/supervisor/report.js - FINAL FIXED VERSION (ARRAY-SAFE + ROBUST QUERY)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // ✅ FIX: Normalize query params (handles array issue)
  const rawUserId = req.query.user_id || req.query.userId;
  const rawAssessmentId = req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  console.log("✅ USER ID RECEIVED:", userId);
  console.log("✅ ASSESSMENT ID RECEIVED:", assessmentId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "Supabase environment variables are missing." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  try {
    console.log(`🔍 Fetching report for user: ${userId}`);

    // ✅ ROBUST QUERY: handles both user_id and candidate_id
    let query = supabase
      .from("assessment_results")
      .select("*, assessments(*)")
      .or(`user_id.eq.${userId},candidate_id.eq.${userId}`)
      .order("completed_at", { ascending: false });

    if (assessmentId) {
      query = query.eq("assessment_id", assessmentId);
    }

    const { data: results, error } = await query.limit(1);

    console.log("✅ QUERY RESULT:", results);

    if (error) {
      console.error("❌ Query error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No completed assessments found for this candidate.",
        user_id: userId
      });
    }

    const record = results[0];
    const assessment = record.assessments || null;

    // ✅ Fetch candidate safely
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

    const candidateName = candidate?.full_name || candidate?.email || "Candidate";
    const assessmentName = assessment?.title || "Assessment";

    const generatedReport = {
      candidateName,
      assessmentName,
      percentage,
      overallPercentage: percentage,
      score: percentage,
      classification,
      executiveSummary: `${candidateName} completed the ${assessmentName} assessment with a score of ${percentage}%`,
      roleReadiness: percentage >= 75 ? "Ready for role" : "Needs development",

      // ✅ USE REAL DATA FROM DB
      categoryScores: record.category_scores || [],
      strengths: record.strengths || [],
      developmentAreas: record.weaknesses || [],
      recommendations: record.recommendations || [],
      followUpQuestions: [],

      responseCount: record.answered_questions || 0
    };

    console.log(`✅ SUCCESS: Report built for ${candidateName}`);

    return res.status(200).json({
      success: true,
      candidate,
      assessment,
      generatedReport,
      assessment_id: record.assessment_id
    });

  } catch (e) {
    console.error("❌ Fatal error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
