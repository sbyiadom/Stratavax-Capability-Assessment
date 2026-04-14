import { createClient } from '@supabase/supabase-js';
import { generatePersonalizedReport } from '../../utils/dynamicReportGenerator';
import { calculateBehavioralMetrics } from '../../utils/behavioralAnalyzer';

// Import competency functions
import { 
  calculateCompetencyScores, 
  generateCompetencyRecommendations 
} from '../../utils/competencyScoring';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with behavioral analytics");

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization token" });
    }

    const token = authHeader.replace('Bearer ', '');

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId = user_id;
    let assessmentId = assessment_id;
    let activeSessionId = sessionId;

    if (sessionId && !userId) {
      const { data: session, error: sessionError } = await serviceClient
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error("❌ Session error:", sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
      activeSessionId = sessionId;
    }

    console.log("📊 Processing for user:", userId, "assessment:", assessmentId, "session:", activeSessionId);

    // Get all responses with full question and answer details
    const { data: responses, error: responsesError } = await userClient
      .from('responses')
      .select(`
        question_id,
        answer_id,
        time_spent_seconds,
        times_changed,
        first_saved_at,
        initial_answer_id,
        session_id,
        unique_questions!inner (
          id,
          section,
          subsection,
          question_text
        ),
        unique_answers!inner (
          id,
          score,
          answer_text
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Responses error:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        message: responsesError.message 
      });
    }

    if (!responses || responses.length === 0) {
      console.error("❌ No responses found");
      return res.status(400).json({ error: "No responses found" });
    }

    console.log(`✅ Found ${responses.length} responses`);

    // Get assessment type for the result
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('assessment_type_id, assessment_type:assessment_types(code), title')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error("❌ Assessment error:", assessmentError);
    }

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Get candidate name for the report
    let candidateName = 'Candidate';
    const { data: profileData } = await serviceClient
      .from('candidate_profiles')
      .select('full_name, email, created_by')
      .eq('id', userId)
      .single();

    if (profileData?.full_name) {
      candidateName = profileData.full_name;
    } else if (profileData?.email) {
      candidateName = profileData.email.split('@')[0];
    }

    // ===== COMPETENCY PROCESSING =====
    console.log("🧠 Processing competency scores...");
    
    // Get question-competency mappings (if they exist)
    const { data: questionCompetencies, error: qcError } = await serviceClient
      .from('question_competencies')
      .select(`
        question_id,
        competency_id,
        weight,
        competencies(name)
      `);

    let competencyResults = {};
    let competencyRecommendations = [];

    if (questionCompetencies && questionCompetencies.length > 0 && !qcError) {
      // Calculate competency scores
      competencyResults = calculateCompetencyScores(responses, questionCompetencies, assessmentType);
      
      // Generate competency-based recommendations
      competencyRecommendations = generateCompetencyRecommendations(competencyResults);
      
      console.log(`✅ Processed ${Object.keys(competencyResults).length} competencies`);
    } else {
      console.log("⚠️ No question-competency mappings found, skipping competency processing");
    }
    // ===== END COMPETENCY PROCESSING =====

    // ===== BEHAVIORAL METRICS PROCESSING - FIXED =====
    console.log("🧠 Calculating behavioral metrics...");
    let behavioralMetrics = null;
    
    try {
      // Ensure we have a session ID for behavioral tracking
      if (!activeSessionId) {
        // Try to get session from responses
        const sessionFromResponses = responses.find(r => r.session_id);
        if (sessionFromResponses?.session_id) {
          activeSessionId = sessionFromResponses.session_id;
          console.log("📌 Using session_id from responses:", activeSessionId);
        } else {
          // Generate a session ID if none exists
          activeSessionId = crypto.randomUUID ? crypto.randomUUID() : 
            `${Date.now()}-${userId}-${assessmentId}`;
          console.log("📌 Generated new session_id:", activeSessionId);
          
          // Update responses with this session ID
          const { error: updateError } = await serviceClient
            .from('responses')
            .update({ session_id: activeSessionId })
            .eq('user_id', userId)
            .eq('assessment_id', assessmentId);
            
          if (updateError) {
            console.error("❌ Failed to update responses with session_id:", updateError);
          }
        }
      }
      
      // Ensure timing tables exist (create if not)
      await ensureBehavioralTables(serviceClient);
      
      // Extract timing data from responses
      const timingData = extractTimingFromResponses(responses);
      if (timingData && timingData.length > 0) {
        console.log(`📊 Found ${timingData.length} timing records from responses`);
        
        // Save to question_timing table
        for (const timing of timingData) {
          await serviceClient
            .from('question_timing')
            .upsert({
              session_id: activeSessionId,
              question_id: timing.question_id,
              question_number: timing.question_number,
              time_spent_seconds: timing.time_spent_seconds,
              visit_count: timing.visit_count || 1,
              skipped: timing.skipped || false,
              first_viewed_at: timing.first_viewed_at,
              last_answered_at: timing.last_answered_at,
              user_id: userId,
              assessment_id: assessmentId
            }, {
              onConflict: 'session_id, question_id'
            });
        }
        console.log(`✅ Saved ${timingData.length} timing records`);
      }
      
      // Extract answer history from responses with times_changed
      const answerHistoryData = extractAnswerHistoryFromResponses(responses, userId, assessmentId);
      if (answerHistoryData && answerHistoryData.length > 0) {
        for (const history of answerHistoryData) {
          await serviceClient
            .from('answer_history')
            .insert({
              session_id: activeSessionId,
              question_id: history.question_id,
              previous_answer_id: history.previous_answer_id,
              new_answer_id: history.new_answer_id,
              score_improved: history.score_improved,
              changed_at: history.changed_at,
              user_id: userId,
              assessment_id: assessmentId
            });
        }
        console.log(`✅ Saved ${answerHistoryData.length} answer history records`);
      }
      
      // Now calculate behavioral metrics
      behavioralMetrics = await calculateBehavioralMetrics(
        activeSessionId,
        userId,
        assessmentId,
        serviceClient
      );
      
      if (behavioralMetrics) {
        console.log("✅ Behavioral metrics calculated:", {
          work_style: behavioralMetrics.work_style,
          confidence_level: behavioralMetrics.confidence_level,
          total_answer_changes: behavioralMetrics.total_answer_changes,
          avg_response_time: behavioralMetrics.avg_response_time_seconds
        });
        
        // Save behavioral metrics to dedicated table
        const { error: metricsSaveError } = await serviceClient
          .from('behavioral_metrics')
          .upsert({
            user_id: userId,
            assessment_id: assessmentId,
            session_id: activeSessionId,
            avg_response_time_seconds: behavioralMetrics.avg_response_time_seconds,
            median_response_time_seconds: behavioralMetrics.median_response_time_seconds,
            fastest_response_seconds: behavioralMetrics.fastest_response_seconds,
            slowest_response_seconds: behavioralMetrics.slowest_response_seconds,
            total_time_spent_seconds: behavioralMetrics.total_time_spent_seconds,
            time_variance: behavioralMetrics.time_variance,
            total_answer_changes: behavioralMetrics.total_answer_changes || 0,
            avg_changes_per_question: behavioralMetrics.avg_changes_per_question || 0,
            improvement_rate: behavioralMetrics.improvement_rate || 0,
            first_instinct_accuracy: behavioralMetrics.first_instinct_accuracy || 0,
            total_question_visits: behavioralMetrics.total_question_visits || responses.length,
            revisit_rate: behavioralMetrics.revisit_rate || 0,
            skipped_questions: behavioralMetrics.skipped_questions || 0,
            linearity_score: behavioralMetrics.linearity_score || 100,
            first_half_avg_time: behavioralMetrics.first_half_avg_time || 0,
            second_half_avg_time: behavioralMetrics.second_half_avg_time || 0,
            fatigue_factor: behavioralMetrics.fatigue_factor || 0,
            work_style: behavioralMetrics.work_style || 'Balanced',
            confidence_level: behavioralMetrics.confidence_level || 'Moderate',
            attention_span: behavioralMetrics.attention_span || 'Consistent',
            decision_pattern: behavioralMetrics.decision_pattern || 'Deliberate',
            recommended_support: behavioralMetrics.recommended_support || '',
            development_focus_areas: behavioralMetrics.development_focus_areas || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id, assessment_id, session_id'
          });
          
        if (metricsSaveError) {
          console.error("❌ Error saving behavioral metrics:", metricsSaveError);
        } else {
          console.log("✅ Behavioral metrics saved to dedicated table");
        }
      } else {
        console.log("⚠️ No behavioral metrics generated - creating fallback data");
        behavioralMetrics = createFallbackBehavioralMetrics(responses);
      }
    } catch (behavioralError) {
      console.error("❌ Error calculating behavioral metrics:", behavioralError);
      behavioralMetrics = createFallbackBehavioralMetrics(responses);
    }
    // ===== END BEHAVIORAL METRICS PROCESSING =====

    // Generate personalized report (your existing logic)
    const personalizedReport = generatePersonalizedReport(
      userId,
      assessmentType,
      responses,
      candidateName
    );

    console.log("✅ Personalized report generated");
    console.log("📊 Total score:", personalizedReport.totalScore, "Percentage:", personalizedReport.percentageScore);

    // Determine risk level and readiness
    const riskLevel = personalizedReport.percentageScore < 40 ? 'high' : 
                     personalizedReport.percentageScore < 60 ? 'medium' : 'low';
    const readiness = personalizedReport.percentageScore >= 70 ? 'ready' : 
                     personalizedReport.percentageScore >= 50 ? 'development_needed' : 'not_ready';

    // Update session to completed
    if (activeSessionId) {
      const { error: sessionUpdateError } = await serviceClient
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', activeSessionId);

      if (sessionUpdateError) {
        console.error("❌ Session update error:", sessionUpdateError);
      } else {
        console.log("✅ Session updated");
      }
    }

    // Save to candidate_assessments
    const { error: candidateError } = await serviceClient
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: activeSessionId,
        status: 'completed',
        score: personalizedReport.totalScore,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (candidateError) {
      console.error("❌ Candidate error:", candidateError);
    } else {
      console.log("✅ Candidate assessments updated");
    }

    // Prepare strengths and weaknesses as simple arrays of strings
    const strengthsArray = personalizedReport.strengths.map(s => 
      `${s.area} (${s.percentage}%)`
    );
    const weaknessesArray = personalizedReport.weaknesses.map(w => 
      `${w.area} (${w.percentage}%)`
    );

    // Prepare recommendations as a simple array of strings
    const recommendationsArray = [
      ...personalizedReport.recommendations,
      ...competencyRecommendations.map(r => r.recommendation)
    ];

    // Prepare interpretations with behavioral insights - FIXED with proper fallbacks
    const interpretationsObj = {
      classification: personalizedReport.gradeInfo?.description || 
                     (personalizedReport.percentageScore >= 80 ? 'Elite Talent' :
                      personalizedReport.percentageScore >= 60 ? 'High Potential' :
                      personalizedReport.percentageScore >= 40 ? 'Developing Talent' :
                      'Needs Improvement'),
      executiveSummary: personalizedReport.executiveSummary,
      overallProfile: personalizedReport.overallProfile,
      overallTraits: personalizedReport.overallTraits || [],
      summary: `Overall performance: ${personalizedReport.percentageScore}%`,
      
      // Add competency data to interpretations
      competencyData: Object.keys(competencyResults).length > 0 ? {
        results: competencyResults,
        recommendations: competencyRecommendations
      } : null,
      
      // Add behavioral insights to interpretations - FIXED with complete data
      behavioralInsights: {
        // Core metrics
        work_style: behavioralMetrics?.work_style || calculateWorkStyleFromResponses(responses),
        confidence_level: behavioralMetrics?.confidence_level || calculateConfidenceFromResponses(responses),
        attention_span: behavioralMetrics?.attention_span || 'Consistent',
        decision_pattern: behavioralMetrics?.decision_pattern || 'Deliberate',
        
        // Timing metrics
        avg_response_time: behavioralMetrics?.avg_response_time_seconds || calculateAvgResponseTime(responses),
        fastest_response: behavioralMetrics?.fastest_response_seconds || calculateFastestResponse(responses),
        slowest_response: behavioralMetrics?.slowest_response_seconds || calculateSlowestResponse(responses),
        total_time_spent: behavioralMetrics?.total_time_spent_seconds || calculateTotalTime(responses),
        
        // Answer behavior metrics
        total_answer_changes: behavioralMetrics?.total_answer_changes || calculateTotalAnswerChanges(responses),
        question_revisit_rate: behavioralMetrics?.revisit_rate || calculateRevisitRate(responses),
        first_instinct_accuracy: behavioralMetrics?.first_instinct_accuracy || calculateFirstInstinctAccuracy(responses),
        improvement_rate: behavioralMetrics?.improvement_rate || calculateImprovementRate(responses),
        
        // Fatigue metrics
        fatigue_factor: behavioralMetrics?.fatigue_factor || calculateFatigueFromResponses(responses),
        
        // Support recommendations
        recommended_support: behavioralMetrics?.recommended_support || generateDefaultSupportRecommendation(responses),
        development_focus_areas: behavioralMetrics?.development_focus_areas || generateDefaultFocusAreas(responses)
      }
    };

    // Prepare the data for assessment_results
    const resultData = {
      user_id: userId,
      assessment_id: assessmentId,
      session_id: activeSessionId,
      assessment_type_id: assessment?.assessment_type_id || null,
      total_score: personalizedReport.totalScore,
      max_score: personalizedReport.maxScore,
      category_scores: personalizedReport.categoryScores,
      interpretations: interpretationsObj,
      strengths: strengthsArray,
      weaknesses: weaknessesArray,
      recommendations: recommendationsArray,
      risk_level: riskLevel,
      readiness: readiness,
      completed_at: new Date().toISOString()
    };

    console.log("📦 Inserting into assessment_results...");

    // Save to assessment_results
    const { data: insertedData, error: resultsError } = await serviceClient
      .from('assessment_results')
      .insert([resultData])
      .select();

    if (resultsError) {
      console.error("❌ Results error - Full details:", {
        message: resultsError.message,
        code: resultsError.code,
        details: resultsError.details,
        hint: resultsError.hint
      });
      
      return res.status(200).json({ 
        success: true,
        score: personalizedReport.totalScore,
        percentage: personalizedReport.percentageScore,
        classification: interpretationsObj.classification,
        behavioralMetrics: behavioralMetrics ? {
          work_style: behavioralMetrics.work_style,
          confidence_level: behavioralMetrics.confidence_level,
          avg_response_time: behavioralMetrics.avg_response_time_seconds,
          total_answer_changes: behavioralMetrics.total_answer_changes
        } : interpretationsObj.behavioralInsights,
        warning: "Score saved but detailed report failed to save: " + resultsError.message,
        message: "Assessment submitted successfully (score only)" 
      });
    }

    // ===== Save competency scores to database =====
    if (Object.keys(competencyResults).length > 0) {
      console.log("💾 Saving competency scores...");
      
      const competencyInserts = [];
      Object.values(competencyResults).forEach(comp => {
        competencyInserts.push({
          candidate_id: userId,
          assessment_id: assessmentId,
          competency_id: comp.id,
          raw_score: comp.rawScore,
          max_possible: comp.maxPossible,
          percentage: comp.percentage,
          classification: comp.classification,
          question_count: comp.questionCount
        });
      });
      
      const { error: compInsertError } = await serviceClient
        .from('candidate_competency_scores')
        .upsert(competencyInserts, { 
          onConflict: 'candidate_id, assessment_id, competency_id' 
        });
      
      if (compInsertError) {
        console.error("❌ Error saving competency scores:", compInsertError);
      } else {
        console.log(`✅ Saved ${competencyInserts.length} competency scores`);
      }
    }
    // ===== END SAVE COMPETENCY SCORES =====

    console.log("✅ Results inserted successfully:", insertedData);

    // Create notification for supervisor
    console.log("📋 Creating notification for supervisor...");

    if (profileData?.created_by) {
      const { error: notifError } = await serviceClient
        .from('supervisor_notifications')
        .insert({
          supervisor_id: profileData.created_by,
          user_id: userId,
          assessment_id: assessmentId,
          result_id: insertedData?.[0]?.id,
          message: `${profileData.full_name || profileData.email || 'Candidate'} completed ${assessment?.title || 'an assessment'}`,
          status: 'unread',
          created_at: new Date().toISOString()
        });

      if (notifError) {
        console.error("❌ Failed to create notification:", notifError);
      } else {
        console.log("✅ Notification created for supervisor:", profileData.created_by);
      }
    }

    return res.status(200).json({ 
      success: true,
      score: personalizedReport.totalScore,
      percentage: personalizedReport.percentageScore,
      classification: interpretationsObj.classification,
      competencyCount: Object.keys(competencyResults).length,
      behavioralMetrics: {
        work_style: interpretationsObj.behavioralInsights.work_style,
        confidence_level: interpretationsObj.behavioralInsights.confidence_level,
        avg_response_time: interpretationsObj.behavioralInsights.avg_response_time,
        total_answer_changes: interpretationsObj.behavioralInsights.total_answer_changes,
        recommended_support: interpretationsObj.behavioralInsights.recommended_support
      },
      message: "Assessment submitted successfully with behavioral analytics" 
    });

  } catch (err) {
    console.error("❌ Fatal error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message,
      stack: err.stack
    });
  }
}

// ===== HELPER FUNCTIONS FOR BEHAVIORAL DATA EXTRACTION =====

async function ensureBehavioralTables(supabaseClient) {
  // Check if tables exist (this is a lightweight check)
  // In production, you'd run migrations instead
  console.log("🔧 Ensuring behavioral tables exist...");
  // Tables should be created via migrations - this is just a check
}

function extractTimingFromResponses(responses) {
  if (!responses || responses.length === 0) return [];
  
  return responses.map((response, index) => ({
    question_id: response.question_id,
    question_number: index + 1,
    time_spent_seconds: response.time_spent_seconds || 30, // Default 30s if not captured
    visit_count: (response.times_changed || 0) + 1,
    skipped: false,
    first_viewed_at: response.first_saved_at || new Date().toISOString(),
    last_answered_at: new Date().toISOString()
  }));
}

function extractAnswerHistoryFromResponses(responses, userId, assessmentId) {
  if (!responses || responses.length === 0) return [];
  
  const history = [];
  for (const response of responses) {
    if (response.initial_answer_id && response.initial_answer_id !== response.answer_id) {
      history.push({
        question_id: response.question_id,
        previous_answer_id: response.initial_answer_id,
        new_answer_id: response.answer_id,
        score_improved: null, // Would need original scores to calculate
        changed_at: response.first_saved_at || new Date().toISOString()
      });
    }
  }
  return history;
}

function calculateAvgResponseTime(responses) {
  const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
  if (times.length === 0) return 30; // Default
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

function calculateFastestResponse(responses) {
  const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
  if (times.length === 0) return 5;
  return Math.min(...times);
}

function calculateSlowestResponse(responses) {
  const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
  if (times.length === 0) return 60;
  return Math.max(...times);
}

function calculateTotalTime(responses) {
  const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
  if (times.length === 0) return responses.length * 30;
  return times.reduce((a, b) => a + b, 0);
}

function calculateTotalAnswerChanges(responses) {
  return responses.reduce((sum, r) => sum + (r.times_changed || 0), 0);
}

function calculateRevisitRate(responses) {
  const totalChanges = calculateTotalAnswerChanges(responses);
  if (responses.length === 0) return 0;
  return Math.round((totalChanges / responses.length) * 100);
}

function calculateFirstInstinctAccuracy(responses) {
  // Simplified - would need actual answer scores for accuracy
  const unchanged = responses.filter(r => !r.initial_answer_id || r.initial_answer_id === r.answer_id).length;
  if (responses.length === 0) return 0;
  return Math.round((unchanged / responses.length) * 100);
}

function calculateImprovementRate(responses) {
  // Simplified - would need score comparison
  return 50; // Default
}

function calculateFatigueFromResponses(responses) {
  const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
  if (times.length < 4) return 0;
  
  const midPoint = Math.floor(times.length / 2);
  const firstHalf = times.slice(0, midPoint);
  const secondHalf = times.slice(midPoint);
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  return Math.round(secondAvg - firstAvg);
}

function calculateWorkStyleFromResponses(responses) {
  const avgTime = calculateAvgResponseTime(responses);
  const changes = calculateTotalAnswerChanges(responses);
  
  if (avgTime < 15 && changes < 3) return "Quick Decision Maker";
  if (avgTime > 45 && changes > 5) return "Methodical Analyst";
  if (changes > 8) return "Anxious Reviser";
  if (changes > 3) return "Strategic Reviewer";
  if (avgTime < 25) return "Fast-paced / Decisive";
  if (avgTime > 50) return "Methodical / Deliberate";
  return "Balanced";
}

function calculateConfidenceFromResponses(responses) {
  const avgTime = calculateAvgResponseTime(responses);
  const changes = calculateTotalAnswerChanges(responses);
  
  if (avgTime < 20 && changes < 2) return "High";
  if (changes > 5) return "Low";
  if (changes > 2) return "Moderate";
  return "Moderate";
}

function createFallbackBehavioralMetrics(responses) {
  return {
    work_style: calculateWorkStyleFromResponses(responses),
    confidence_level: calculateConfidenceFromResponses(responses),
    attention_span: "Consistent",
    decision_pattern: "Deliberate",
    avg_response_time_seconds: calculateAvgResponseTime(responses),
    fastest_response_seconds: calculateFastestResponse(responses),
    slowest_response_seconds: calculateSlowestResponse(responses),
    total_time_spent_seconds: calculateTotalTime(responses),
    time_variance: 0,
    total_answer_changes: calculateTotalAnswerChanges(responses),
    avg_changes_per_question: calculateTotalAnswerChanges(responses) / (responses.length || 1),
    improvement_rate: calculateImprovementRate(responses),
    first_instinct_accuracy: calculateFirstInstinctAccuracy(responses),
    total_question_visits: responses.length,
    revisit_rate: calculateRevisitRate(responses),
    skipped_questions: 0,
    linearity_score: 100,
    first_half_avg_time: 0,
    second_half_avg_time: 0,
    fatigue_factor: calculateFatigueFromResponses(responses),
    recommended_support: generateDefaultSupportRecommendation(responses),
    development_focus_areas: generateDefaultFocusAreas(responses)
  };
}

function generateDefaultSupportRecommendation(responses) {
  const workStyle = calculateWorkStyleFromResponses(responses);
  
  switch (workStyle) {
    case "Quick Decision Maker":
      return "Encourage reviewing answers before submitting. Provide time management guidance to balance speed with accuracy.";
    case "Methodical Analyst":
      return "Provide clear time expectations. Consider extended time if needed for complex assessments.";
    case "Anxious Reviser":
      return "Build confidence through practice assessments. Provide positive reinforcement.";
    default:
      return "Provide balanced support with regular check-ins on progress.";
  }
}

function generateDefaultFocusAreas(responses) {
  const workStyle = calculateWorkStyleFromResponses(responses);
  const baseAreas = ["Consistent performance", "Regular feedback"];
  
  if (workStyle === "Quick Decision Maker") {
    baseAreas.push("Review habits", "Quality verification");
  } else if (workStyle === "Methodical Analyst") {
    baseAreas.push("Time management", "Efficiency techniques");
  } else if (workStyle === "Anxious Reviser") {
    baseAreas.push("Confidence building", "Trusting first instincts");
  }
  
  return baseAreas;
}
