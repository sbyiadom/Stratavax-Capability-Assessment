import { calculateCompetencyScores } from '../../../utils/competencyScoring';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user's session from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a client with the user's token (respects RLS policies)
    const { createClient } = require('@supabase/supabase-js');
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

    console.log("🔄 Starting competency reprocessing for existing results...");

    // 1. Get all completed assessments
    const { data: results, error: resultsError } = await userClient
      .from('assessment_results')
      .select('id, user_id, assessment_id, assessment_type_id')
      .order('completed_at', { ascending: false });

    if (resultsError) throw resultsError;
    console.log(`📊 Found ${results.length} completed assessments to reprocess`);

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No completed assessments found to reprocess',
        reprocessing: {
          totalAssessments: 0,
          successCount: 0,
          failedCount: 0
        }
      });
    }

    // 2. Get question-competency mappings
    const { data: questionCompetencies, error: qcError } = await userClient
      .from('question_competencies')
      .select(`
        question_id,
        competency_id,
        weight,
        competencies(name)
      `);

    if (qcError) throw qcError;
    console.log(`✅ Found ${questionCompetencies.length} question-competency mappings`);

    if (questionCompetencies.length === 0) {
      return res.status(400).json({ 
        error: 'No competency mappings found. Please run the setup script first.' 
      });
    }

    // 3. Get assessment types for context
    const { data: assessmentTypes, error: typeError } = await userClient
      .from('assessment_types')
      .select('id, code');

    if (typeError) throw typeError;

    const typeMap = {};
    assessmentTypes.forEach(t => {
      typeMap[t.id] = t.code;
    });

    // 4. Process each result
    let successCount = 0;
    let failedCount = 0;
    const failedDetails = [];

    for (const result of results) {
      try {
        console.log(`🔄 Processing result ${result.id}...`);

        // Get responses for this assessment
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
          .eq('user_id', result.user_id)
          .eq('assessment_id', result.assessment_id);

        if (responsesError) {
          console.error(`Error fetching responses for ${result.id}:`, responsesError);
          failedCount++;
          failedDetails.push({ id: result.id, error: 'Failed to fetch responses' });
          continue;
        }

        if (!responses || responses.length === 0) {
          console.log(`⚠️ No responses found for result ${result.id}`);
          failedCount++;
          failedDetails.push({ id: result.id, error: 'No responses found' });
          continue;
        }

        const assessmentType = typeMap[result.assessment_type_id] || 'general';

        // Calculate competency scores
        const competencyResults = calculateCompetencyScores(
          responses, 
          questionCompetencies, 
          assessmentType
        );

        // Skip if no competency results (shouldn't happen, but just in case)
        if (Object.keys(competencyResults).length === 0) {
          console.log(`⚠️ No competency scores calculated for result ${result.id}`);
          failedCount++;
          failedDetails.push({ id: result.id, error: 'No competency scores calculated' });
          continue;
        }

        // Save competency scores
        const competencyInserts = [];
        Object.values(competencyResults).forEach(comp => {
          competencyInserts.push({
            candidate_id: result.user_id,
            assessment_id: result.assessment_id,
            competency_id: comp.id,
            raw_score: comp.rawScore,
            max_possible: comp.maxPossible,
            percentage: comp.percentage,
            classification: comp.classification,
            question_count: comp.questionCount
          });
        });

        if (competencyInserts.length > 0) {
          // Delete existing scores for this candidate/assessment first
          await userClient
            .from('candidate_competency_scores')
            .delete()
            .eq('candidate_id', result.user_id)
            .eq('assessment_id', result.assessment_id);

          // Insert new scores
          const { error: insertError } = await userClient
            .from('candidate_competency_scores')
            .insert(competencyInserts);

          if (insertError) {
            console.error(`Error inserting scores for ${result.id}:`, insertError);
            failedCount++;
            failedDetails.push({ id: result.id, error: insertError.message });
            continue;
          }

          successCount++;
          console.log(`✅ Reprocessed result ${result.id} (${successCount}/${results.length})`);
        } else {
          console.log(`⚠️ No competency inserts for result ${result.id}`);
          failedCount++;
          failedDetails.push({ id: result.id, error: 'No competency data generated' });
        }

      } catch (error) {
        console.error(`❌ Failed to reprocess ${result.id}:`, error.message);
        failedCount++;
        failedDetails.push({ id: result.id, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Reprocessing completed',
      reprocessing: {
        totalAssessments: results.length,
        successCount,
        failedCount,
        failedDetails: failedDetails.slice(0, 20) // Show first 20 failures
      }
    });

  } catch (error) {
    console.error('❌ Error reprocessing competencies:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
