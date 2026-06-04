import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  scoreQuestionResponse,
  calculateMaxScore,
  isBaselineAssessmentType
} from "../../utils/scoring";

export const config = {
  maxDuration: 300, // 5 minutes for batch processing
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

// Copy these functions from submit-assessment.js
function getQuestion(response) { return response?.unique_questions || response?.question || null; }
function getAnswer(response) { return response?.unique_answers || response?.answer || response?.selected_answer || null; }

function getResponseCategory(response) {
  const question = getQuestion(response);
  return question?.section || question?.category || question?.competency || response?.category || "General";
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
      score: roundNumber(grouped[key].totalScore, 2),
      maxScore: roundNumber(grouped[key].maxScore, 2),
      percentage: roundNumber(percentage, 2),
      questionCount: grouped[key].count,
      classification: percentage >= 85 ? "Exceptional" : percentage >= 75 ? "Strong Performer" : 
                     percentage >= 65 ? "Capable Contributor" : percentage >= 55 ? "Developing" :
                     percentage >= 40 ? "At Risk" : "High Risk"
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  // Optional: Add admin auth check here
  const { assessmentResultId, userId, assessmentId } = req.body;
  
  const supabase = getServiceClient();
  const results = [];
  
  try {
    // Query for results that need reprocessing
    let query = supabase
      .from("assessment_results")
      .select(`
        id, user_id, assessment_id, session_id,
        candidate_profiles(full_name, email),
        assessments(assessment_type_id, title, assessment_type:assessment_types(code))
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
    
    const { data: resultsToFix, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    
    for (const record of resultsToFix) {
      console.log(`Processing result ${record.id}...`);
      
      // Get responses for this session
      const { data: responses, error: responsesError } = await supabase
        .from("responses")
        .select(`
          *,
          unique_questions(
            id, section, category, competency,
            unique_answers(id, score, answer_text)
          ),
          unique_answers(id, score, answer_text)
        `)
        .eq("session_id", record.session_id);
      
      if (responsesError || !responses?.length) {
        console.log(`No responses found for session ${record.session_id}, skipping`);
        continue;
      }
      
      const isBaseline = isBaselineAssessmentType(
        record.assessments?.assessment_type_id || 
        record.assessments?.assessment_type?.code
      );
      
      // Calculate scores
      let earnedScore = 0;
      responses.forEach(r => { earnedScore += scoreQuestionResponse(r, isBaseline).score; });
      
      const questionsResponse = await supabase
        .from("unique_questions")
        .select("id")
        .eq("assessment_type_id", record.assessments?.assessment_type_id);
      
      const maxScore = calculateMaxScore(questionsResponse.data || [], isBaseline ? 1 : 0, isBaseline);
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
        oldPercentage: record.percentage_score,
        newPercentage: roundNumber(percentage, 2),
        strengthsCount: strengths.length,
        weaknessesCount: weaknesses.length,
        status: "success"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Reprocessed ${results.length} assessments`,
      results
    });
    
  } catch (error) {
    console.error("Reprocess error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
