// pages/api/supervisor/report.js

import { createClient } fromimport { createClient } from "@supabase/supabase-js";
// ======================================================

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(toNumber(value) * factor) / factor;
}

function first(values, fallback) {
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== undefined && values[i] !== null && values[i] !== "") {
      return values[i];
    }
  }
  return fallback;
}

// ======================================================
// INTERPRETATION
// ======================================================

function classify(percentage) {
  if (percentage >= 85) return "Exceptional";
  if (percentage >= 75) return "Strong Performer";
  if (percentage >= 65) return "Capable Contributor";
  if (percentage >= 55) return "Developing";
  if (percentage >= 40) return "At Risk";
  return "High Risk";
}

function supervisorImplication(percentage) {
  if (percentage >= 75) {
    return "Candidate can perform reliably with standard supervision.";
  }
  if (percentage >= 65) {
    return "Candidate can perform with guidance and reinforcement.";
  }
  if (percentage >= 55) {
    return "Candidate requires structured support and close follow-up.";
  }
  return "Candidate requires close supervision and targeted development.";
}

// ======================================================
// RESPONSE NORMALIZATION
// ======================================================

function getScore(r) {
  return toNumber(
    first(
      [r.score, r.selected_score, r.value, r.points],
      0
    ),
    0
  );
}

function getMaxScore(r) {
  return toNumber(
    first(
      [r.max_score, r.maxScore, r.max, 5],
      5
    ),
    5
  );
}

function getCategory(r) {
  return first(
    [r.category, r.competency, r.dimension, "General"],
    "General"
  );
}

// ======================================================
// REPORT BUILDING
// ======================================================

function buildCategoryScores(responses) {
  const map = {};

  responses.forEach(r => {
    const cat = getCategory(r);
    const score = getScore(r);
    const max = getMaxScore(r);

    if (!map[cat]) {
      map[cat] = {
        category: cat,
        totalScore: 0,
        maxScore: 0,
        count: 0
      };
    }

    map[cat].totalScore += score;
    map[cat].maxScore += max;
    map[cat].count += 1;
  });

  return Object.values(map).map(item => {
    const percentage =
      item.maxScore > 0
        ? round((item.totalScore / item.maxScore) * 100)
        : 0;

    return {
      category: item.category,
      totalScore: round(item.totalScore),
      maxScore: round(item.maxScore),
      percentage,
      classification: classify(percentage),
      supervisorImplication: supervisorImplication(percentage)
    };
  });
}

function buildReport(candidate, assessment, responses, userId, assessmentId) {
  const totalScore = responses.reduce((s, r) => s + getScore(r), 0);
  const maxScore = responses.reduce((s, r) => s + getMaxScore(r), 0);

  const percentage =
    maxScore > 0 ? round((totalScore / maxScore) * 100) : 0;

  const categories = buildCategoryScores(responses);

  return {
    candidateName:
      candidate?.full_name ||
      candidate?.name ||
      "Candidate",

    assessmentName:
      assessment?.title ||
      assessment?.name ||
      "Assessment",

    user_id: userId,
    assessment_id: assessmentId || null,

    totalScore: round(totalScore),
    maxScore: round(maxScore),
    percentage,

    classification: classify(percentage),
    supervisorImplication: supervisorImplication(percentage),

    categoryScores: categories,
    responseCount: responses.length
  };
}

// ======================================================
// API HANDLER
// ======================================================

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = req.query.user_id;
  const assessmentId = req.query.assessment_id || req.query.assessment;

  if (!userId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: candidate } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: assessment } = assessmentId
      ? await supabase
          .from("assessments")
          .select("*")
          .eq("id", assessmentId)
          .single()
      : { data: null };

    const { data: responses } = await supabase
      .from("responses")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (!responses || responses.length === 0) {
      return res.status(404).json({
        error: "No responses found for this candidate and assessment"
      });
    }

    const report = buildReport(
      candidate,
      assessment,
      responses,
      userId,
      assessmentId
    );

    return res.status(200).json({
      success: true,
      candidate,
      assessment,
      generatedReport: report,
      report
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to generate report"
    });
  }
}

// ======================================================
