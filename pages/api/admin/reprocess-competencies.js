// pages/api/admin/reprocess-competencies.js
//
// Phase 5 — backfill: recompute competency scores for every existing
// assessment_results row and write them to candidate_competency_scores.
//
// Phase 7A security revision:
//   • Auth: caller must be a valid Supabase user (token verified).
//   • Authorization: caller's supervisor_profiles.role must be 'admin',
//     and is_active must not be false.
//   • Data operations now run through a service-role client, so this
//     endpoint continues to work after RLS is enabled on the tables it
//     touches (assessment_results, responses, candidate_competency_scores).
//   • No functional change to the reprocessing loop.
//
// Prior fixes retained:
//   • Fetch scoring_mode from assessment_types so forced-choice
//     assessments use the most/least model instead of single-select.
//   • Fetch least_answer_id from responses so the engine sees both picks.
//   • Pass the assessment type object (not a bare code) to
//     calculateCompetencyScores, so the engine can read scoring_mode.
//   • Removed unique_questions.category / competency / dimension from
//     the responses select (columns don't exist).
//   • Removed responses.score from the select (column doesn't exist).
//   • Only mapped questions contribute to competency scores; the
//     section-name fallback is gone.

import { createClient } from '@supabase/supabase-js';
import { calculateCompetencyScores } from '../../../utils/competencyScoring';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================================
    // AUTH
    // ============================================================
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[reprocess-competencies] Missing Supabase credentials', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return res.status(500).json({
        error: 'Server configuration error: Missing Supabase credentials',
      });
    }

    // authClient: uses the caller's token, only for verifying the user.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error('[reprocess-competencies] auth.getUser failed:', authError?.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // ============================================================
    // AUTHORIZATION — admin only
    // serviceClient is used for the role check so it is not affected
    // by RLS on supervisor_profiles, and for all data operations below.
    // ============================================================
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await serviceClient
      .from('supervisor_profiles')
      .select('id, role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[reprocess-competencies] profile lookup failed:', profileError.message);
      return res.status(500).json({ error: 'Unable to verify caller role' });
    }

    const metadataRole = userData.user.user_metadata?.role || null;
    const resolvedRole = profile?.role || metadataRole || 'supervisor';

    if (profile?.is_active === false) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    if (resolvedRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('🔄 Starting competency reprocessing for existing results...', {
      triggeredBy: userData.user.id,
    });

    // ============================================================
    // DATA OPERATIONS — all through serviceClient
    // ============================================================

    // 1. Get all completed assessments
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('id, user_id, assessment_id, assessment_type_id, session_id, completed_at')
      .order('completed_at', { ascending: false });

    if (resultsError) throw resultsError;
    console.log(`📊 Found ${results.length} completed assessments to reprocess`);

    if (!results || results.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No completed assessments found to reprocess',
        reprocessing: {
          totalAssessments: 0,
          successCount: 0,
          failedCount: 0,
          failedDetails: [],
        },
      });
    }

    // 2. Get question-competency mappings
    const { data: questionCompetencies, error: qcError } = await serviceClient
      .from('question_competencies')
      .select(`
        question_id,
        competency_id,
        weight,
        competencies(id, name)
      `);

    if (qcError) throw qcError;
    console.log(`✅ Found ${questionCompetencies.length} question-competency mappings`);

    if (!questionCompetencies || questionCompetencies.length === 0) {
      return res.status(400).json({
        error: 'No competency mappings found. Please run the setup script first.',
      });
    }

    // 3. Get assessment types — including scoring_mode
    const { data: assessmentTypes, error: typeError } = await serviceClient
      .from('assessment_types')
      .select('id, code, scoring_mode');

    if (typeError) throw typeError;

    const typeMap = {};
    (assessmentTypes || []).forEach((t) => {
      typeMap[t.id] = {
        id: t.id,
        code: t.code,
        scoring_mode: t.scoring_mode || 'single_select',
      };
    });

    // 4. Process each result
    let successCount = 0;
    let failedCount = 0;
    const failedDetails = [];

    for (const result of results) {
      try {
        console.log(`🔄 Processing result ${result.id}...`);

        const { data: responses, error: responsesError } = await serviceClient
          .from('responses')
          .select(`
            id,
            question_id,
            answer_id,
            least_answer_id,
            session_id,
            unique_questions!inner (
              id,
              section,
              subsection,
              question_text,
              unique_answers (
                id,
                score,
                answer_text,
                display_order
              )
            ),
            unique_answers (
              id,
              score,
              answer_text,
              display_order
            )
          `)
          .eq('user_id', result.user_id)
          .eq('assessment_id', result.assessment_id);

        if (responsesError) {
          console.error(`Error fetching responses for ${result.id}:`, responsesError);
          failedCount += 1;
          failedDetails.push({
            id: result.id,
            error: responsesError.message || 'Failed to fetch responses',
          });
          continue;
        }

        if (!responses || responses.length === 0) {
          console.log(`⚠️ No responses found for result ${result.id}`);
          failedCount += 1;
          failedDetails.push({ id: result.id, error: 'No responses found' });
          continue;
        }

        const assessmentType = typeMap[result.assessment_type_id] || {
          id: result.assessment_type_id,
          code: 'general',
          scoring_mode: 'single_select',
        };

        const competencyResults = calculateCompetencyScores(
          responses,
          questionCompetencies,
          assessmentType
        );

        if (!competencyResults || Object.keys(competencyResults).length === 0) {
          console.log(`⚠️ No competency scores calculated for result ${result.id}`);
          failedCount += 1;
          failedDetails.push({ id: result.id, error: 'No competency scores calculated' });
          continue;
        }

        const competencyInserts = Object.values(competencyResults).map((comp) => ({
          candidate_id: result.user_id,
          assessment_id: result.assessment_id,
          competency_id: comp.id,
          raw_score: comp.rawScore,
          max_possible: comp.maxPossible,
          percentage: comp.percentage,
          classification: comp.classification,
          question_count: comp.questionCount,
        }));

        if (competencyInserts.length > 0) {
          const { error: deleteError } = await serviceClient
            .from('candidate_competency_scores')
            .delete()
            .eq('candidate_id', result.user_id)
            .eq('assessment_id', result.assessment_id);

          if (deleteError) {
            console.error(`Error deleting old scores for ${result.id}:`, deleteError);
            failedCount += 1;
            failedDetails.push({ id: result.id, error: deleteError.message });
            continue;
          }

          const { error: insertError } = await serviceClient
            .from('candidate_competency_scores')
            .insert(competencyInserts);

          if (insertError) {
            console.error(`Error inserting scores for ${result.id}:`, insertError);
            failedCount += 1;
            failedDetails.push({ id: result.id, error: insertError.message });
            continue;
          }

          successCount += 1;
          console.log(`✅ Reprocessed result ${result.id} (${successCount} ok / ${failedCount} failed / ${results.length} total)`);
        } else {
          console.log(`⚠️ No competency inserts for result ${result.id}`);
          failedCount += 1;
          failedDetails.push({ id: result.id, error: 'No competency data generated' });
        }
      } catch (error) {
        console.error(`❌ Failed to reprocess ${result.id}:`, error.message);
        failedCount += 1;
        failedDetails.push({ id: result.id, error: error.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Reprocessing completed',
      reprocessing: {
        totalAssessments: results.length,
        successCount,
        failedCount,
        failedDetails: failedDetails.slice(0, 20),
      },
    });
  } catch (error) {
    console.error('❌ Error reprocessing competencies:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
