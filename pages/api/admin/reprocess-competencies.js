import { createClient } from '@supabase/supabase-js';
import { calculateCompetencyScores } from '../../../utils/competencyScoring';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log("🔄 Starting competency reprocessing for existing results...");

    // 1. Get all completed assessments
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('id, user_id, assessment_id, assessment_type_id')
      .order('completed_at', { ascending: false });

    if (resultsError) throw resultsError;
    console.log(`📊 Found ${results.length} completed assessments to reprocess`);

    // 2. Get question-competency mappings
    const { data: questionCompetencies, error: qcError } = await serviceClient
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
    const { data: assessmentTypes, error: typeError } = await serviceClient
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
        // Get responses for this assessment
        const { data: responses, error: responsesError } = await serviceClient
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

        if (responsesError || !responses || responses.length === 0) {
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
          const { error: insertError } = await serviceClient
            .from('candidate_competency_scores')
            .upsert(competencyInserts, { 
              onConflict: 'candidate_id, assessment_id, competency_id' 
            });

          if (insertError) throw insertError;
        }

        successCount++;
        console.log(`✅ Reprocessed result ${result.id} (${successCount}/${results.length})`);

      } catch (error) {
        failedCount++;
        failedDetails.push({ id: result.id, error: error.message });
        console.error(`❌ Failed to reprocess ${result.id}:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Reprocessing completed',
      reprocessing: {
        totalAssessments: results.length,
        successCount,
        failedCount,
        failedDetails: failedDetails.slice(0, 10) // Only show first 10 failures
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
