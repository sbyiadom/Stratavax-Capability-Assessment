import { createClient } from '@supabase/supabase-js';
import { generatePersonalizedReport } from '../../utils/dynamicReportGenerator';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called");

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

    // Generate personalized report - this now handles all calculations
    const personalizedReport = generatePersonalizedReport(
      userId,
      assessment?.assessment_type?.code || 'general',
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
      summary: `Overall performance: ${personalizedReport.percentageScore}%`
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

    console.log("✅ Results inserted successfully:", insertedData);

    // ========== ADD NOTIFICATION CREATION HERE ==========
    console.log("📋 Creating notification for supervisor...");

    // Get the supervisor ID for this candidate (from created_by field)
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
    // ========== END NOTIFICATION CREATION ==========

    return res.status(200).json({ 
      success: true,
      score: personalizedReport.totalScore,
      percentage: personalizedReport.percentageScore,
      classification: interpretationsObj.classification,
      message: "Assessment submitted successfully" 
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
