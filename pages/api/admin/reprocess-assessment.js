import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  scoreQuestionResponse,
  calculateMaxScore,
  isBaselineAssessmentType
} from "../../../utils/scoring";  // ← FIXED: Added one more ../

export const config = {
  maxDuration: 300, // 5 minutes for batch processing
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

function buildCategoryScoresFromResponses(responses, isBaseline) {
  const grouped = {};
  
  responses.forEach(response => {
    const category = getResponseCategory(response);
    const scored = scoreQuestionResponse(response, isBaseline);
    
    if (!grouped[category]) {
      grouped[category] = { totalScore: 0, maxScore: 0, count: 0 };
    }
    
    grouped[category].totalScore += scored.score;
    grouped[category].maxScore += scored.maxScore;
    grouped[category].count += 1;
  });
  
  return Object.keys(grouped).map(key => {
    let percentage = grouped[key].maxScore > 0 
      ? (grouped[key].totalScore / grouped[key].maxScore) * 100 
      : 0;
    percentage = Math.min(100, Math.max(0, percentage));
    
    return {
      name: key,
      totalScore: roundNumber(grouped[key].totalScore, 2),
      score: roundNumber(grouped[key].totalScore, 2),
      maxScore: roundNumber(grouped[key].maxScore, 2),
      maxPossible: roundNumber(grouped[key].maxScore, 2),
      percentage: roundNumber(percentage, 2),
      questionCount: grouped[key].count,
      classification: percentage >= 85 ? "Exceptional" : 
                      percentage >= 75 ? "Strong Performer" : 
                      percentage >= 65 ? "Capable Contributor" : 
                      percentage >= 55 ? "Developing" :
                      percentage >= 40 ? "At Risk" : "High Risk"
    };
  });
}

export default async function handler(req, res) {
  // Add a simple auth check - you can enhance this
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_API_KEY || "your-secret-key-here";
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  // Optional: Check for admin key
  if (authHeader !== `Bearer ${adminKey}` && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const { assessmentResultId, userId, assessmentId, dryRun = false } = req.body;
  
  const supabase = getServiceClient();
  const results = [];
  const errors = [];
  
  try {
    // Query for results that need reprocessing
    let query = supabase
      .from("assessment_results")
      .select(`
        id, 
        user_id, 
        assessment_id, 
        session_id,
        candidate_profiles!user_id (full_name, email),
        assessments!assessment_id (
          assessment_type_id, 
          title, 
          assessment_type:assessment_types(code)
        )
      `);
    
    if (assessmentResultId) {
      query = query.eq("id", assessmentResultId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (assessmentId) {
      query = query.eq("assessment_id", assessmentId);
    }
    
    // Only get results that have a session_id and are completed
    query = query.not("session_id", "is", null);
    
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
        console.log(`Processing result ${record.id} for user ${record.user_id}...`);
        
        // Get responses for this session
        const { data: responses, error: responsesError } = await supabase
          .from("responses")
          .select(`
            *,
            unique_questions:question_id (
              id, 
              section, 
              category, 
              competency,
              unique_answers (
                id, 
                score, 
                answer_text
              )
            ),
            unique_answers:answer_id (
              id, 
              score, 
              answer_text
            )
          `)
          .eq("session_id", record.session_id);
        
        if (responsesError) {
          errors.push({ id: record.id, error: responsesError.message });
          continue;
        }
        
        if (!responses || responses.length === 0) {
          errors.push({ id: record.id, error: "No responses found for session" });
          continue;
        }
        
        const assessmentTypeId = record.assessments?.assessment_type_id;
        const assessmentTypeCode = record.assessments?.assessment_type?.code;
        
        const isBaseline = isBaselineAssessmentType(assessmentTypeId) || 
                          isBaselineAssessmentType(assessmentTypeCode);
        
        // Calculate total score
        let earnedScore = 0;
        responses.forEach(r => { 
          earnedScore += toNumber(scoreQuestionResponse(r, isBaseline).score, 0);
        });
        
        // Get questions to calculate max score
        const { data: questions, error: questionsError } = await supabase
          .from("unique_questions")
          .select("id")
          .eq("assessment_type_id", assessmentTypeId);
        
        if (questionsError) {
          errors.push({ id: record.id, error: questionsError.message });
          continue;
        }
        
        const maxScore = calculateMaxScore(questions || [], isBaseline ? 1 : 0, isBaseline);
        let percentage = maxScore > 0 ? (earnedScore / maxScore) * 100 : 0;
        percentage = Math.min(100, Math.max(0, percentage));
        
        // Build category scores
        const categoryScores = buildCategoryScoresFromResponses(responses, isBaseline);
        
        // Extract strengths and weaknesses
        const strengths = categoryScores
          .filter(c => c.percentage >= 75 && c.percentage <= 100)
          .sort((a, b) => b.percentage - a.percentage);
        
        const weaknesses = categoryScores
          .filter(c => c.percentage < 65 && c.percentage >= 0)
          .sort((a, b) => a.percentage - b.percentage);
        
        if (dryRun) {
          results.push({
            id: record.id,
            userId: record.user_id,
            oldPercentage: record.percentage_score,
            newPercentage: roundNumber(percentage, 2),
            strengthsCount: strengths.length,
            weaknessesCount: weaknesses.length,
            strengths: strengths.map(s => ({ name: s.name, pct: s.percentage })),
            weaknesses: weaknesses.map(w => ({ name: w.name, pct: w.percentage })),
            status: "dry_run"
          });
        } else {
          // Update the record
          const { error: updateError } = await supabase
            .from("assessment_results")
            .update({
              total_score: roundNumber(earnedScore, 2),
              max_score: roundNumber(maxScore, 2),
              percentage_score: roundNumber(percentage, 2),
              category_scores: categoryScores,
              strengths: strengths,
              weaknesses: weaknesses,
              updated_at: new Date().toISOString()
            })
            .eq("id", record.id);
          
          if (updateError) throw updateError;
          
          results.push({
            id: record.id,
            userId: record.user_id,
            assessmentId: record.assessment_id,
            oldPercentage: record.percentage_score,
            newPercentage: roundNumber(percentage, 2),
            strengthsCount: strengths.length,
            weaknessesCount: weaknesses.length,
            status: "success"
          });
        }
        
      } catch (recordError) {
        console.error(`Error processing record ${record.id}:`, recordError);
        errors.push({ id: record.id, error: recordError.message });
      }
    }
    
    return res.status(200).json({
      success: true,
      dryRun: dryRun,
      message: dryRun ? "Dry run completed - no changes made" : `Reprocessed ${results.length} assessments`,
      totalFound: resultsToFix.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error("Reprocess error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
