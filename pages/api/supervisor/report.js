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
  if (value >= 85) {
    return "The candidate shows strong readiness and can be considered for role responsibilities with normal supervision, stretch assignments, and opportunities to leverage demonstrated strengths.";
  }
  if (value >= 75) {
    return "The candidate can perform reliably with standard supervision while benefiting from targeted reinforcement and role-specific feedback.";
  }
  if (value >= 65) {
    return "The candidate can perform with guidance, coaching, and periodic review in selected areas.";
  }
  if (value >= 55) {
    return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  }
  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

function getCategoryNarrative(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = cleanText(category, "General");
  
  if (value >= 85) return cleanCategory + " scored " + value + "%, indicating a clear strength. This area can be leveraged in role responsibilities and stretch assignments.";
  if (value >= 75) return cleanCategory + " scored " + value + "%, indicating strong capability. The candidate appears reliable in this area.";
  if (value >= 65) return cleanCategory + " scored " + value + "%, indicating capable performance. The area is broadly adequate.";
  if (value >= 55) return cleanCategory + " scored " + value + "%, indicating developing capability. Structured coaching and guided practice are recommended.";
  if (value >= 40) return cleanCategory + " scored " + value + "%, indicating a priority development area. Targeted development and close supervision are recommended.";
  return cleanCategory + " scored " + value + "%, indicating a critical development area. Close support and structured development are required.";
}

function getCategoryFollowUpQuestion(category, percentage) {
  const value = toNumber(percentage, 0);
  const cleanCategory = cleanText(category, "General");
  
  if (value >= 75) return "Ask the candidate to describe how this strength can be applied to improve performance in the role.";
  return "Ask the candidate to provide a practical example that demonstrates capability in " + cleanCategory + ".";
}

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
    // ===== STEP 1: Get the requesting user from authorization header =====
    const authHeader = req.headers.authorization || "";
    let requestingUserId = null;
    let requestingUserEmail = null;
    let requestingUserRole = null;
    let requestingUserIsAdmin = false;

    // Hardcoded admin emails for fallback
    const ADMIN_EMAILS = ['sbyiadom88@gmail.com'];

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        requestingUserId = user.id;
        requestingUserEmail = user.email;
        
        // Check multiple sources for admin role
        // 1. Check supervisor_profiles table
        const { data: supervisorProfile } = await supabase
          .from("supervisor_profiles")
          .select("role, is_active")
          .eq("id", requestingUserId)
          .maybeSingle();
        
        // 2. Check user_metadata
        const metadataRole = user.user_metadata?.role;
        
        // 3. Check if email is in admin list
        const isAdminEmail = ADMIN_EMAILS.includes(user.email);
        
        requestingUserRole = supervisorProfile?.role || metadataRole || (isAdminEmail ? "admin" : null);
        requestingUserIsAdmin = requestingUserRole === "admin" || isAdminEmail;
        
        console.log(`🔐 User: ${user.email}, Role: ${requestingUserRole}, IsAdmin: ${requestingUserIsAdmin}`);
      }
    }

    // ===== STEP 2: Get candidate profile =====
    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (candidateError) {
      console.error("Candidate fetch error:", candidateError);
    }

    // ===== STEP 3: PERMISSION CHECK =====
    let hasPermission = false;
    let permissionReason = null;

    // Case 0: Admin has full access (check this FIRST)
    if (requestingUserIsAdmin) {
      hasPermission = true;
      permissionReason = "Admin access";
      console.log(`✅ Admin access granted for ${requestingUserEmail}`);
    }
    // Case 1: No authenticated user (public access) - deny
    else if (!requestingUserId) {
      hasPermission = false;
      permissionReason = "Not authenticated";
    }
    // Case 2: Direct supervisor of the candidate
    else if (candidate && candidate.supervisor_id === requestingUserId) {
      hasPermission = true;
      permissionReason = "Direct supervisor";
    }
    // Case 3: Shared access
    else if (candidate && assessmentId) {
      const { data: sharedAccess, error: sharedError } = await supabase
        .from("shared_report_access")
        .select("*")
        .eq("candidate_id", userId)
        .eq("assessment_id", assessmentId)
        .eq("granted_to", requestingUserId)
        .maybeSingle();

      if (sharedAccess && !sharedError) {
        const isExpired = sharedAccess.expires_at && new Date(sharedAccess.expires_at) < new Date();
        if (!isExpired) {
          hasPermission = true;
          permissionReason = "Shared access";
        } else {
          permissionReason = "Shared access expired";
        }
      } else {
        permissionReason = "No shared access found";
      }
    }
    // Case 4: No candidate found
    else if (!candidate) {
      permissionReason = "Candidate not found";
    }
    // Case 5: No permission
    else {
      permissionReason = `Not authorized - Candidate supervisor_id: ${candidate?.supervisor_id}, Requesting user: ${requestingUserId}`;
    }

    console.log(`🔐 Permission check: ${hasPermission ? "GRANTED" : "DENIED"} - ${permissionReason}`);

    // If no permission, return 403 with details
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to view this report",
        reason: permissionReason,
        requires_share: true,
        candidate_name: candidate?.full_name || "Candidate"
      });
    }

    // ===== STEP 4: Get stored assessment result =====
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
    const candidateName = candidate?.full_name || candidate?.email || "Candidate";
    const assessmentName = assessment?.title || "Assessment";

    // Build category scores from stored data or fallback
    let categoryScores = [];
    
    if (storedResult.category_scores && Array.isArray(storedResult.category_scores) && storedResult.category_scores.length > 0) {
      categoryScores = storedResult.category_scores.map(cat => ({
        ...cat,
        name: cat.name || cat.category,
        percentage: toNumber(cat.percentage, 0),
        narrative: cat.narrative || getCategoryNarrative(cat.name || cat.category, toNumber(cat.percentage, 0)),
        followUpQuestion: cat.followUpQuestion || getCategoryFollowUpQuestion(cat.name || cat.category, toNumber(cat.percentage, 0))
      }));
    }

    // Build strengths and development areas
    const strengths = categoryScores
      .filter(cat => toNumber(cat.percentage, 0) >= 85)
      .map(cat => cat.name);
    
    const developmentAreas = categoryScores
      .filter(cat => toNumber(cat.percentage, 0) < 75)
      .map(cat => cat.name);

    // Build recommendations
    const recommendations = [
      ...developmentAreas.map(area => ({
        priority: "High",
        competency: area,
        recommendation: `Focus on developing ${area} through targeted coaching and practical application.`,
        isStrength: false
      })),
      ...strengths.map(strength => ({
        priority: "Leverage",
        competency: strength,
        recommendation: `Leverage ${strength} as a key strength for role responsibilities.`,
        isStrength: true
      }))
    ];

    // Build follow-up questions
    const followUpQuestions = categoryScores
      .filter(cat => toNumber(cat.percentage, 0) < 75)
      .slice(0, 5)
      .map(cat => ({
        category: cat.name,
        question: cat.followUpQuestion || getCategoryFollowUpQuestion(cat.name, toNumber(cat.percentage, 0))
      }));

    // Build executive summary
    const topAreas = categoryScores.filter(c => toNumber(c.percentage, 0) >= 85).slice(0, 3);
    const lowestAreas = categoryScores.filter(c => toNumber(c.percentage, 0) < 65).slice(0, 3);
    
    let strengthText = "";
    let areaText = "";
    
    if (topAreas.length > 0) {
      strengthText = " Key strengths include " + topAreas.map(a => a.name + " (" + a.percentage + "%)").join(", ") + ".";
    }
    if (lowestAreas.length > 0) {
      areaText = " The most important development areas are " + lowestAreas.map(a => a.name + " (" + a.percentage + "%)").join(", ") + ".";
    }
    
    const executiveSummary = candidateName + " completed the " + assessmentName + " assessment with an overall score of " + percentage + "%, classified as " + classification + ". " + getScoreComment(percentage) + strengthText + areaText;
    const roleReadiness = getSupervisorImplication(percentage);

    // Build behavioral insights
    const behavioralInsights = {
      answeredQuestions: storedResult.answered_questions || 0,
      totalQuestions: storedResult.total_questions || 0,
      violationCount: storedResult.violation_count || 0,
      violation_details: storedResult.violation_details || {},
      note: "Response behavior data is available from the assessment session."
    };

    // Build final report
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

    return res.status(200).json({
      success: true,
      candidate: decodeObjectDeep(candidate || { id: userId }),
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
