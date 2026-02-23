import { createClient } from '@supabase/supabase-js';
import { generatePersonalizedReport } from '../../utils/dynamicReportGenerator';
import { 
  calculateCompetencyScores, 
  generateCompetencyNarrative,
  calculateOverallCompetencyScore,
  generateCompetencyRecommendations
} from '../../utils/competencyScoring';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with competency processing");

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
    }

    console.log("📊 Processing for user:", userId, "assessment:", assessmentId);

    // Get all responses with full question and answer details
    const { data: responses, error: responsesError } = await userClient
      .from('responses')
      .select(`
        question_id,
        answer_id,
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

    // ===== NEW: COMPETENCY PROCESSING =====
    console.log("🧠 Processing competency scores...");
    
    // Get question-competency mappings
    const { data: questionCompetencies, error: qcError } = await serviceClient
      .from('question_competencies')
      .select(`
        question_id,
        competency_id,
        weight,
        competencies(name)
      `);

    if (qcError) {
      console.error("❌ Error fetching question competencies:", qcError);
    }

    let competencyResults = {};
    let competencyNarrative = { strengths: [], developmentNeeds: [] };
    let overallCompetencyScore = { overallScore: 0, classification: 'Unknown' };
    let competencyRecommendations = [];

    if (questionCompetencies && questionCompetencies.length > 0) {
      // Calculate competency scores
      competencyResults = calculateCompetencyScores(responses, questionCompetencies, assessmentType);
      
      // Generate competency narrative
      competencyNarrative = generateCompetencyNarrative(competencyResults, assessmentType);
      
      // Calculate overall competency score
      overallCompetencyScore = calculateOverallCompetencyScore(competencyResults);
      
      // Generate competency-based recommendations
      competencyRecommendations = generateCompetencyRecommendations(competencyResults);
      
      console.log(`✅ Processed ${Object.keys(competencyResults).length} competencies`);
    } else {
      console.log("⚠️ No question-competency mappings found, skipping competency processing");
    }
    // ===== END COMPETENCY PROCESSING =====

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
    if (sessionId) {
      const { error: sessionUpdateError } = await serviceClient
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

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
        session_id: sessionId,
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
      ...personalizedReport.recommendations
    ];

    // Prepare interpretations as a simple object
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
      
      // NEW: Add competency data to interpretations
      competencyData: Object.keys(competencyResults).length > 0 ? {
        results: competencyResults,
        narrative: competencyNarrative,
        overallScore: overallCompetencyScore,
        recommendations: competencyRecommendations
      } : null
    };

    // Prepare the data for assessment_results
    const resultData = {
      user_id: userId,
      assessment_id: assessmentId,
      session_id: sessionId,
      assessment_type_id: assessment?.assessment_type_id || null,
      total_score: personalizedReport.totalScore,
      max_score: personalizedReport.maxScore,
      // percentage_score is auto-generated by database
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
      
      // Log the data that failed
      console.error("❌ Data that failed to insert:", JSON.stringify(resultData, null, 2));
      
      // Even if assessment_results fails, we already saved to candidate_assessments
      // So the score is still saved
      return res.status(200).json({ 
        success: true,
        score: personalizedReport.totalScore,
        percentage: personalizedReport.percentageScore,
        classification: interpretationsObj.classification,
        warning: "Score saved but detailed report failed to save: " + resultsError.message,
        message: "Assessment submitted successfully (score only)" 
      });
    }

    // ===== NEW: Save competency scores to database =====
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
      // Create notification for the supervisor
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
    } else {
      console.log("⚠️ No created_by found for candidate, skipping notification");
    }

    return res.status(200).json({ 
      success: true,
      score: personalizedReport.totalScore,
      percentage: personalizedReport.percentageScore,
      classification: interpretationsObj.classification,
      competencyCount: Object.keys(competencyResults).length,
      message: "Assessment submitted successfully with competency analysis" 
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
