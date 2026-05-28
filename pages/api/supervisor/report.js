// pages/api/supervisor/report.js

import { createClient } from "@supabase/supabase-js";

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function roundNumber(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(toNumber(value, 0) * factor) / factor;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function decodeObjectDeep(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(decodeObjectDeep);
  if (value && typeof value === "object") {
    const output = {};
    Object.keys(value).forEach(key => {
      output[key] = decodeObjectDeep(value[key]);
    });
    return output;
  }
  return value;
}

// ======================================================
// SCORE CLASSIFICATION (same as before)
// ======================================================

function classifyScore(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return "Exceptional";
  if (value >= 75) return "Strong Performer";
  if (value >= 65) return "Capable Contributor";
  if (value >= 55) return "Developing";
  if (value >= 40) return "At Risk";
  return "High Risk";
}

function getRiskLevel(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 75) return "Low";
  if (value >= 65) return "Moderate";
  if (value >= 55) return "Elevated";
  if (value >= 40) return "High";
  return "Critical";
}

function getPriorityFromScore(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 75) return "Leverage";
  if (value >= 65) return "Low";
  if (value >= 55) return "Medium";
  if (value >= 40) return "High";
  return "Critical";
}

function getScoreComment(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return "Exceptional performance with strong evidence of readiness.";
  if (value >= 75) return "Strong performance with reliable capability.";
  if (value >= 65) return "Adequate performance with some areas requiring reinforcement.";
  if (value >= 55) return "Developing performance requiring structured support.";
  if (value >= 40) return "Priority development is required.";
  return "Critical development support is required.";
}

function getSupervisorImplication(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return "The candidate shows strong readiness and can be considered for role responsibilities with normal supervision, stretch assignments, and opportunities to leverage demonstrated strengths.";
  if (value >= 75) return "The candidate can perform reliably with standard supervision while benefiting from targeted reinforcement and role-specific feedback.";
  if (value >= 65) return "The candidate can perform with guidance, coaching, and periodic review in selected areas.";
  if (value >= 55) return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

function getCategoryDomainContext(category) {
  const value = cleanText(category, "General");
  if (value === "Clinical") return "clinical interpretation, behavioral judgement, and response planning";
  if (value === "Leadership") return "ownership, direction setting, accountability, and leadership follow-through";
  if (value === "Decision-Making") return "judgement under ambiguity, prioritization, risk review, and decision quality";
  if (value === "Decision-Making & Problem-Solving") return "structured judgement, problem analysis, option evaluation, and decision quality";
  if (value === "Communication Style") return "feedback response, listening, emotional awareness, tone, and clarity";
  if (value === "Communication & Influence") return "clarity, stakeholder communication, influence, listening, and message discipline";
  if (value === "Adaptability") return "flexibility, change response, uncertainty management, and adjustment to new demands";
  if (value === "Collaboration") return "team contribution, shared accountability, cooperation, and alignment with others";
  if (value === "FBA") return "behavioral antecedents, consequences, triggers, function, and response planning";
  if (value === "Role Readiness") return "readiness for role responsibilities, practical judgement, and supervised application";
  if (value === "Resilience & Stress Management") return "resilience, stress response, pressure management, and sustained performance";
  if (value === "Empathy & Relationship Building") return "relationship building, empathy, trust, and interpersonal awareness";
  return "this competency area and its practical application in role responsibilities";
}

function getCategoryNarrative(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = cleanText(category, "General");
  const context = getCategoryDomainContext(cleanCategory);
  
  if (value >= 85) return cleanCategory + " scored " + value + "%, indicating a clear strength in " + context + ". This area can be leveraged in role responsibilities, stretch assignments, and mentoring opportunities.";
  if (value >= 75) return cleanCategory + " scored " + value + "%, indicating strong capability in " + context + ". The candidate appears reliable in this area.";
  if (value >= 65) return cleanCategory + " scored " + value + "%, indicating capable performance in " + context + ". The area is broadly adequate.";
  if (value >= 55) return cleanCategory + " scored " + value + "%, indicating developing capability in " + context + ". Structured coaching and guided practice are recommended.";
  if (value >= 40) return cleanCategory + " scored " + value + "%, indicating a priority development area in " + context + ". Targeted development and close supervision are recommended.";
  return cleanCategory + " scored " + value + "%, indicating a critical development area in " + context + ". Close support and structured development are required.";
}

function getCategoryAction(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = cleanText(category, "General");
  const priority = getPriorityFromScore(value);
  
  if (value >= 85) return "Leverage this strength through stretch assignments and mentoring opportunities. Priority: " + priority + ".";
  if (value >= 75) return "Maintain this capability through normal supervision and role-specific feedback. Priority: " + priority + ".";
  if (value >= 65) return "Reinforce this area through periodic review and targeted feedback. Priority: " + priority + ".";
  if (value >= 55) return "Provide structured coaching and guided practice. Priority: " + priority + ".";
  if (value >= 40) return "Create a targeted development plan with close supervision. Priority: " + priority + ".";
  return "Apply immediate development support and close supervision. Priority: " + priority + ".";
}

function getCategoryFollowUpQuestion(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = cleanText(category, "General");
  
  if (value >= 75) return "Ask the candidate to describe how this strength can be applied to improve performance in the role.";
  if (cleanCategory === "Clinical") return "Ask the candidate to explain how they would interpret and respond to a sensitive behavioral scenario.";
  if (cleanCategory === "Leadership") return "Ask the candidate to describe a situation where they had to take ownership and guide others through uncertainty.";
  if (cleanCategory === "Decision-Making" || cleanCategory === "Decision-Making & Problem-Solving") return "Ask the candidate to walk through a recent difficult decision, including options considered and risks identified.";
  return "Ask the candidate to provide a practical example that demonstrates capability in " + cleanCategory + ".";
}

// ======================================================
// MAIN API HANDLER - USING STORED RESULTS
// ======================================================

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
    return res.status(500).json({
      success: false,
      error: "Supabase environment variables are missing."
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // ===== STEP 1: Get the stored assessment result =====
    let resultQuery = supabase
      .from("assessment_results")
      .select("*, assessments(*)")
      .eq("user_id", userId);

    if (assessmentId) {
      resultQuery = resultQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultQuery.order("completed_at", { ascending: false });

    if (resultsError) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch assessment results: " + resultsError.message
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No assessment results found for this candidate.",
        user_id: userId,
        assessment_id: assessmentId || null
      });
    }

    const storedResult = results[0];
    const assessment = storedResult.assessments || null;
    const percentage = toNumber(storedResult.percentage_score, 0);
    const classification = classifyScore(percentage);

    // ===== STEP 2: Get candidate profile =====
    const { data: candidateData, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (candidateError) {
      console.error("Candidate fetch error:", candidateError);
    }

    const candidate = candidateData || { id: userId, full_name: "Candidate" };
    const candidateName = candidate.full_name || candidate.email || "Candidate";
    const assessmentName = assessment?.title || "Assessment";

    // ===== STEP 3: Build category scores from stored data =====
    let categoryScores = [];
    
    if (storedResult.category_scores) {
      // Use stored category scores if available
      categoryScores = safeArray(storedResult.category_scores).map(cat => ({
        ...cat,
        percentage: toNumber(cat.percentage || cat.score, 0),
        narrative: cat.narrative || getCategoryNarrative(cat.name || cat.category, toNumber(cat.percentage || cat.score, 0)),
        action: cat.action || getCategoryAction(cat.name || cat.category, toNumber(cat.percentage || cat.score, 0)),
        followUpQuestion: cat.followUpQuestion || getCategoryFollowUpQuestion(cat.name || cat.category, toNumber(cat.percentage || cat.score, 0))
      }));
    }

    // ===== STEP 4: Build strengths and development areas =====
    const strengths = categoryScores
      .filter(cat => toNumber(cat.percentage, 0) >= 75)
      .sort((a, b) => toNumber(b.percentage, 0) - toNumber(a.percentage, 0));

    const developmentAreas = categoryScores
      .filter(cat => toNumber(cat.percentage, 0) < 65)
      .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0));

    // ===== STEP 5: Build recommendations =====
    const recommendations = [
      ...developmentAreas.map(area => ({
        priority: getPriorityFromScore(area.percentage),
        competency: area.name || area.category,
        currentScore: area.percentage,
        recommendation: area.narrative,
        action: area.action,
        isStrength: false
      })),
      ...strengths.map(strength => ({
        priority: "Leverage",
        competency: strength.name || strength.category,
        currentScore: strength.percentage,
        recommendation: strength.narrative,
        action: strength.action,
        isStrength: true
      }))
    ];

    // ===== STEP 6: Build follow-up questions =====
    const followUpQuestions = categoryScores
      .filter(cat => toNumber(cat.percentage, 0) < 75)
      .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0))
      .slice(0, 5)
      .map(cat => ({
        category: cat.name || cat.category,
        priority: getPriorityFromScore(cat.percentage),
        score: cat.percentage,
        question: cat.followUpQuestion || getCategoryFollowUpQuestion(cat.name || cat.category, cat.percentage)
      }));

    // ===== STEP 7: Build executive summary =====
    const lowestAreas = developmentAreas.slice(0, 3);
    const topAreas = strengths.slice(0, 3);
    
    let strengthText = "";
    let areaText = "";
    
    if (topAreas.length > 0) {
      strengthText = " Key strengths include " + topAreas.map(a => a.name + " (" + a.percentage + "%)").join(", ") + ".";
    }
    if (lowestAreas.length > 0) {
      areaText = " The most important development areas are " + lowestAreas.map(a => a.name + " (" + a.percentage + "%)").join(", ") + ".";
    }
    
    const executiveSummary = candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText;

    // ===== STEP 8: Build role readiness =====
    let roleReadiness = getSupervisorImplication(percentage);
    if (percentage >= 85 && developmentAreas.length === 0) {
      roleReadiness = "The candidate appears highly ready for role responsibilities with normal supervision. The supervisor can consider stretch assignments, broader accountability, and opportunities to leverage demonstrated strengths.";
    } else if (percentage >= 75 && developmentAreas.length === 0) {
      roleReadiness = "The candidate appears broadly ready for role responsibilities with normal supervision and role-specific reinforcement.";
    }

    // ===== STEP 9: Build behavioral insights (from stored data) =====
    const behavioralInsights = {
      answeredQuestions: storedResult.answered_questions || 0,
      totalQuestions: storedResult.total_questions || 0,
      violationCount: storedResult.violation_count || 0,
      violation_details: storedResult.violation_details || {},
      note: "Response behavior data is available from the assessment session."
    };

    // ===== STEP 10: Build final report =====
    const generatedReport = {
      candidateName,
      assessmentName,
      userId,
      assessmentId: assessmentId || assessment?.id,

      totalScore: storedResult.total_score || 0,
      maxScore: storedResult.max_score || 100,
      percentage,
      overallPercentage: percentage,
      overallScore: percentage,
      score: percentage,
      
      classification,
      overallClassification: classification,
      riskLevel: getRiskLevel(percentage),
      
      summary: executiveSummary,
      executiveSummary,
      overallAssessment: executiveSummary,
      supervisorImplication: getSupervisorImplication(percentage),
      roleReadiness,
      readinessStatement: roleReadiness,
      
      behavioralInsights,
      behavioral_summary: behavioralInsights,
      
      categoryScores,
      competencyScores: categoryScores,
      
      strengths,
      topStrengths: strengths,
      developmentAreas,
      topDevelopmentNeeds: developmentAreas,
      
      recommendations,
      actionPlan: recommendations,
      
      followUpQuestions,
      supervisorQuestions: followUpQuestions,
      
      responseCount: storedResult.answered_questions || 0,
      dataSource: "assessment_results"
    };

    // ===== STEP 11: Return response =====
    return res.status(200).json({
      success: true,
      candidate: decodeObjectDeep(candidate),
      assessment: decodeObjectDeep(assessment),
      generatedReport: decodeObjectDeep(generatedReport),
      result: decodeObjectDeep(storedResult),
      responseCount: storedResult.answered_questions || 0,
      dataSource: "assessment_results"
    });

  } catch (error) {
    console.error("Report generation error:", error);
    return res.status(500).json({
      success: false,
      error: error && error.message ? error.message : "Failed to generate supervisor report."
    });
  }
}
