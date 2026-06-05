import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  scoreQuestionResponse,
  calculateMaxScore,
  isBaselineAssessmentType,
  getClassificationFromPercentage,
  getRiskLevel
} from "../../../utils/scoring";

export const config = {
  maxDuration: 900, // 15 minutes for large batches
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

function getQuestion(response) {
  if (!response) return null;
  return response.unique_questions || response.question || null;
}

function getResponseCategory(response) {
  const question = getQuestion(response);
  if (!response) return "General";
  
  const category = (question && (question.section || question.category || question.competency)) ||
    response.section ||
    response.category ||
    response.competency ||
    "General";
  
  return String(category);
}

function getResponseSubcategory(response) {
  const question = getQuestion(response);
  if (!response) return "";
  return question?.subsection || question?.sub_category || response.subsection || "";
}

function getResponseQuestionText(response) {
  const question = getQuestion(response);
  return question?.question_text || question?.text || response.question_text || "";
}

function getResponseAnswerText(response) {
  const answer = response.unique_answers || response.answer;
  return answer?.answer_text || answer?.text || response.answer_text || "";
}

function getResponseTime(response) {
  return toNumber(response.time_spent_seconds || response.time_spent || 0, 0);
}

function getResponseChanges(response) {
  return toNumber(response.times_changed || response.changes || response.answer_changes || 0, 0);
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

function getCategoryNarrative(category, percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return `${category} scored ${value}%, indicating exceptional capability. This is a clear strength that can be leveraged in role responsibilities.`;
  if (value >= 75) return `${category} scored ${value}%, indicating strong capability. The candidate performs reliably in this area.`;
  if (value >= 65) return `${category} scored ${value}%, indicating capable performance. Some reinforcement may be beneficial.`;
  if (value >= 55) return `${category} scored ${value}%, indicating developing capability. Structured coaching is recommended.`;
  if (value >= 40) return `${category} scored ${value}%, indicating a priority development area. Targeted support is needed.`;
  return `${category} scored ${value}%, indicating a critical development area. Close supervision required.`;
}

function getCategoryAction(category, percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return `Leverage this strength through stretch assignments and mentoring opportunities in ${category}.`;
  if (value >= 75) return `Maintain this capability through normal supervision and role-specific feedback in ${category}.`;
  if (value >= 65) return `Reinforce this area through periodic review and targeted feedback in ${category}.`;
  if (value >= 55) return `Provide structured coaching and guided practice in ${category} before increasing independence.`;
  if (value >= 40) return `Create a targeted development plan with close supervision and practical scenarios in ${category}.`;
  return `Apply immediate development support and formal progress validation in ${category}.`;
}

function getFollowUpQuestion(category, percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 75) return `Ask the candidate to describe how ${category} can be applied to improve performance or support others.`;
  return `Ask the candidate to provide a practical example that demonstrates capability in ${category}, including what was done and what outcome resulted.`;
}

function getPriorityFromScore(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 75) return "Leverage";
  if (value >= 65) return "Low";
  if (value >= 55) return "Medium";
  if (value >= 40) return "High";
  return "Critical";
}

function buildDetailedCategoryScores(responses, isBaseline) {
  const grouped = {};

  safeArray(responses).forEach(function (response) {
    const category = getResponseCategory(response);
    const subcategory = getResponseSubcategory(response);
    const scored = scoreQuestionResponse(response, Boolean(isBaseline));
    const score = toNumber(scored.score, 0);
    const maxScore = toNumber(scored.maxScore, 0);
    const timeSpent = getResponseTime(response);
    const changes = getResponseChanges(response);

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        name: category,
        totalScore: 0,
        maxScore: 0,
        questionCount: 0,
        totalTimeSpent: 0,
        totalChanges: 0,
        subcategories: {},
        answers: []
      };
    }

    grouped[category].totalScore += score;
    grouped[category].maxScore += maxScore;
    grouped[category].questionCount += 1;
    grouped[category].totalTimeSpent += timeSpent;
    grouped[category].totalChanges += changes;

    if (subcategory) {
      if (!grouped[category].subcategories[subcategory]) {
        grouped[category].subcategories[subcategory] = 0;
      }
      grouped[category].subcategories[subcategory] += 1;
    }

    grouped[category].answers.push({
      section: category,
      subsection: subcategory,
      question: getResponseQuestionText(response),
      answer: getResponseAnswerText(response),
      score: score,
      maxScore: maxScore,
      timeSpent: timeSpent,
      changes: changes
    });
  });

  return Object.keys(grouped).map(function (key) {
    const item = grouped[key];
    let percentage = item.maxScore > 0 ? (item.totalScore / item.maxScore) * 100 : 0;
    percentage = Math.min(100, Math.max(0, percentage));
    percentage = roundNumber(percentage, 2);
    
    return {
      category: item.category,
      name: item.name,
      totalScore: roundNumber(item.totalScore, 2),
      score: roundNumber(item.totalScore, 2),
      maxScore: roundNumber(item.maxScore, 2),
      maxPossible: roundNumber(item.maxScore, 2),
      questionCount: item.questionCount,
      percentage: percentage,
      classification: getClassificationFromPercentage(percentage),
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      narrative: getCategoryNarrative(item.category, percentage),
      action: getCategoryAction(item.category, percentage),
      riskLevel: getRiskLevel(percentage),
      priority: getPriorityFromScore(percentage),
      followUpQuestion: getFollowUpQuestion(item.category, percentage),
      averageTimePerQuestion: item.questionCount > 0 ? roundNumber(item.totalTimeSpent / item.questionCount, 2) : 0,
      averageChangesPerQuestion: item.questionCount > 0 ? roundNumber(item.totalChanges / item.questionCount, 2) : 0,
      subcategories: item.subcategories,
      answers: item.answers
    };
  });
}

function buildBehavioralInsights(responses) {
  let totalTime = 0;
  let totalChanges = 0;
  const count = safeArray(responses).length;
  
  safeArray(responses).forEach(function (response) {
    totalTime += getResponseTime(response);
    totalChanges += getResponseChanges(response);
  });

  const averageTime = count > 0 ? roundNumber(totalTime / count, 2) : 0;
  const averageChanges = count > 0 ? roundNumber(totalChanges / count, 2) : 0;
  
  let note = "";
  if (totalTime === 0) {
    note = "Response timing data is not available.";
  } else {
    if (averageTime > 75) note += "Average response time suggests careful processing. ";
    if (averageChanges > 1.5) note += "Frequent answer changes suggest possible second-guessing. ";
    if (!note) note = "Response behavior does not show major concerns.";
  }

  return {
    totalTimeSpent: roundNumber(totalTime, 2),
    totalChanges: roundNumber(totalChanges, 2),
    averageTimePerQuestion: averageTime,
    averageChangesPerQuestion: averageChanges,
    dataQuality: totalTime > 0 ? "Available" : "Limited",
    note: note
  };
}

function buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores) {
  const lowestAreas = safeArray(categoryScores)
    .filter(item => toNumber(item.percentage, 0) < 65)
    .sort((a, b) => toNumber(a.percentage, 0) - toNumber(b.percentage, 0))
    .slice(0, 3);

  const topAreas = safeArray(categoryScores)
    .filter(item => toNumber(item.percentage, 0) >= 75)
    .sort((a, b) => toNumber(b.percentage, 0) - toNumber(a.percentage, 0))
    .slice(0, 3);

  let strengthText = "";
  let areaText = "";

  if (topAreas.length > 0) {
    strengthText = " Key strengths include " + topAreas.map(item => `${item.name} (${item.percentage}%)`).join(", ") + ".";
  }
  if (lowestAreas.length > 0) {
    areaText = " Development areas include " + lowestAreas.map(item => `${item.name} (${item.percentage}%)`).join(", ") + ".";
  }

  return `${candidateName} completed ${assessmentName} with ${percentage}% (${classification}). ${getScoreComment(percentage)}${strengthText}${areaText}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminKey = process.env.ADMIN_API_KEY;
  const authHeader = req.headers.authorization;
  
  if (adminKey && authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { limit = 100, offset = 0, dryRun = false, resultId, userId } = req.body;
  
  const supabase = getServiceClient();
  const results = [];
  const errors = [];

  try {
    // Get all assessment results that need reprocessing (have session_id but empty strengths)
    let query = supabase
      .from("assessment_results")
      .select(`
        id, 
        user_id, 
        assessment_id, 
        session_id,
        percentage_score,
        candidate_profiles!user_id (full_name, email),
        assessments!assessment_id (
          id,
          title,
          assessment_type_id,
          assessment_type:assessment_types(code)
        )
      `)
      .not("session_id", "is", null)
      .order("completed_at", { ascending: false });

    if (resultId) {
      query = query.eq("id", resultId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data: resultsToFix, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    
    if (!resultsToFix || resultsToFix.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No assessment results found to reprocess"
      });
    }

    for (const record of resultsToFix) {
      try {
        console.log(`Processing ${record.id} for user ${record.user_id}...`);
        
        // Get responses for this session
        const { data: responses, error: responsesError } = await supabase
          .from("responses")
          .select(`
            *,
            unique_questions:question_id (
              id, section, category, competency, subsection, question_text,
              unique_answers (id, score, answer_text)
            ),
            unique_answers:answer_id (id, score, answer_text)
          `)
          .eq("session_id", record.session_id);
        
        if (responsesError) {
          errors.push({ id: record.id, error: responsesError.message });
          continue;
        }
        
        if (!responses || responses.length === 0) {
          errors.push({ id: record.id, error: "No responses found" });
          continue;
        }
        
        const assessment = record.assessments || {};
        const isBaseline = isBaselineAssessmentType(assessment.assessment_type_id) || 
                          isBaselineAssessmentType(assessment.assessment_type?.code);
        
        // Calculate scores
        let earnedScore = 0;
        responses.forEach(r => { 
          earnedScore += toNumber(scoreQuestionResponse(r, isBaseline).score, 0);
        });
        
        const { data: questions, error: questionsError } = await supabase
          .from("unique_questions")
          .select("id")
          .eq("assessment_type_id", assessment.assessment_type_id);
        
        if (questionsError) {
          errors.push({ id: record.id, error: questionsError.message });
          continue;
        }
        
        const maxScore = calculateMaxScore(questions || [], isBaseline ? 1 : 0, isBaseline);
        let percentage = maxScore > 0 ? (earnedScore / maxScore) * 100 : 0;
        percentage = Math.min(100, Math.max(0, roundNumber(percentage, 2)));
        
        // Build complete report
        const categoryScores = buildDetailedCategoryScores(responses, isBaseline);
        const behavioralInsights = buildBehavioralInsights(responses);
        
        const strengths = categoryScores
          .filter(c => c.percentage >= 75 && c.percentage <= 100)
          .sort((a, b) => b.percentage - a.percentage);
        
        const weaknesses = categoryScores
          .filter(c => c.percentage < 65 && c.percentage >= 0)
          .sort((a, b) => a.percentage - b.percentage);
        
        const candidateName = record.candidate_profiles?.full_name || record.candidate_profiles?.email || "Candidate";
        const assessmentName = assessment.title || "Assessment";
        const classification = getClassificationFromPercentage(percentage);
        const riskLevel = getRiskLevel(percentage);
        const executiveSummary = buildExecutiveSummary(candidateName, assessmentName, percentage, classification, categoryScores);
        const roleReadiness = percentage >= 75 ? "Candidate appears ready for role responsibilities." : "Candidate requires additional development.";
        
        // Build recommendations
        const recommendations = weaknesses.map(w => ({
          priority: getPriorityFromScore(w.percentage),
          competency: w.name,
          category: w.name,
          currentScore: w.percentage,
          recommendation: w.narrative,
          action: w.action,
          isStrength: false
        })).concat(strengths.slice(0, 2).map(s => ({
          priority: "Leverage",
          competency: s.name,
          category: s.name,
          currentScore: s.percentage,
          recommendation: s.narrative,
          action: s.action,
          isStrength: true
        })));
        
        // Build follow-up questions
        const followUpQuestions = weaknesses.length > 0 
          ? weaknesses.slice(0, 3).map(w => ({
              category: w.name,
              priority: getPriorityFromScore(w.percentage),
              score: w.percentage,
              question: getFollowUpQuestion(w.name, w.percentage)
            }))
          : strengths.slice(0, 3).map(s => ({
              category: s.name,
              priority: "Leverage",
              score: s.percentage,
              question: getFollowUpQuestion(s.name, s.percentage)
            }));
        
        const interpretations = {
          executiveSummary,
          supervisorImplication: getSupervisorImplication(percentage),
          roleReadiness,
          behavioralInsights,
          followUpQuestions,
          classification,
          riskLevel,
          dataSource: "regeneration_engine"
        };
        
        if (dryRun) {
          results.push({
            id: record.id,
            userId: record.user_id,
            oldPercentage: record.percentage_score,
            newPercentage: percentage,
            strengthsCount: strengths.length,
            weaknessesCount: weaknesses.length,
            strengths: strengths.map(s => ({ name: s.name, pct: s.percentage })),
            weaknesses: weaknesses.map(w => ({ name: w.name, pct: w.percentage })),
            status: "dry_run"
          });
        } else {
          // Update the record with regenerated data
          const { error: updateError } = await supabase
            .from("assessment_results")
            .update({
              total_score: roundNumber(earnedScore, 2),
              max_score: roundNumber(maxScore, 2),
              percentage_score: percentage,
              category_scores: categoryScores,
              strengths: strengths,
              weaknesses: weaknesses,
              recommendations: recommendations,
              interpretations: interpretations,
              risk_level: riskLevel,
              readiness: roleReadiness,
              updated_at: new Date().toISOString()
            })
            .eq("id", record.id);
          
          if (updateError) throw updateError;
          
          results.push({
            id: record.id,
            userId: record.user_id,
            assessmentId: record.assessment_id,
            oldPercentage: record.percentage_score,
            newPercentage: percentage,
            strengthsCount: strengths.length,
            weaknessesCount: weaknesses.length,
            status: "success"
          });
        }
        
      } catch (recordError) {
        console.error(`Error processing ${record.id}:`, recordError);
        errors.push({ id: record.id, error: recordError.message });
      }
    }
    
    return res.status(200).json({
      success: true,
      dryRun,
      message: dryRun ? "Dry run completed" : `Regenerated ${results.length} reports`,
      totalProcessed: resultsToFix.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      nextOffset: offset + limit,
      hasMore: resultsToFix.length === limit
    });
    
  } catch (error) {
    console.error("Regeneration error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
