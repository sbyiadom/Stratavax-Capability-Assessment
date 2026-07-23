// pages/api/assessment/behavioral-matrix.js - SIMPLIFIED WORKING VERSION

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { resultId } = req.query;
    if (!resultId) {
      return res.status(400).json({ success: false, error: 'Missing resultId' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // STEP 1: Get the result to find session_id
    const { data: result, error: resultError } = await supabase
      .from('assessment_results')
      .select('id, session_id, user_id, percentage_score, completed_at, total_questions, answered_questions, is_auto_submitted')
      .eq('id', resultId)
      .single();

    if (resultError) {
      console.error('[Behavioral] Result error:', resultError);
      return res.status(500).json({ success: false, error: resultError.message });
    }

    // STEP 2: Get candidate info
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('full_name, email, university, programme')
      .eq('id', result.user_id)
      .single();

    if (candidateError) {
      console.error('[Behavioral] Candidate error:', candidateError);
    }

    // STEP 3: Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('question_id, time_spent_seconds, times_changed, metadata')
      .eq('session_id', result.session_id);

    if (responsesError) {
      console.error('[Behavioral] Responses error:', responsesError);
      return res.status(500).json({ success: false, error: responsesError.message });
    }

    console.log('[Behavioral] Responses found:', responses?.length || 0);

    // STEP 4: Calculate metrics
    let totalChanges = 0;
    let totalTabSwitches = 0;
    let totalViolations = 0;
    let totalCopyAttempts = 0;
    let totalPasteAttempts = 0;
    let totalRightClicks = 0;
    const timePerQuestion = [];

    if (responses && responses.length > 0) {
      responses.forEach(response => {
        // From columns
        totalChanges += response.times_changed || 0;
        
        // From metadata
        const metadata = response.metadata || {};
        totalTabSwitches += parseInt(metadata.tab_switches, 10) || 0;
        totalViolations += parseInt(metadata.violations, 10) || 0;
        totalCopyAttempts += parseInt(metadata.copy_attempts, 10) || 0;
        totalPasteAttempts += parseInt(metadata.paste_attempts, 10) || 0;
        totalRightClicks += parseInt(metadata.right_click_attempts, 10) || 0;

        // Time per question
        const timeOnQuestion = parseInt(metadata.time_on_question, 10) || 0;
        const timeSpent = response.time_spent_seconds || 0;
        
        if (timeOnQuestion > 0 || timeSpent > 0) {
          timePerQuestion.push({
            question_id: response.question_id,
            time_seconds: timeOnQuestion || timeSpent,
            changed: (response.times_changed || 0) > 0,
            violation: (metadata.violations || 0) > 0
          });
        }
      });
    }

    const avgTime = timePerQuestion.length > 0 
      ? Math.round(timePerQuestion.reduce((sum, q) => sum + q.time_seconds, 0) / timePerQuestion.length)
      : 0;

    const flaggedQuestions = timePerQuestion.filter(q => 
      q.time_seconds > 60 || q.changed || q.violation
    );

    const hasBehavioralData = 
      totalChanges > 0 || 
      totalTabSwitches > 0 || 
      totalViolations > 0 || 
      totalCopyAttempts > 0 || 
      totalPasteAttempts > 0 || 
      totalRightClicks > 0 ||
      timePerQuestion.length > 0;

    console.log('[Behavioral] Metrics:', {
      totalChanges,
      totalTabSwitches,
      totalViolations,
      timePerQuestion: timePerQuestion.length,
      hasBehavioralData
    });

    // STEP 5: Build response
    const behavioralMatrix = {
      candidate: {
        name: candidate?.full_name || 'Unknown',
        email: candidate?.email || '',
        university: candidate?.university || '',
        programme: candidate?.programme || ''
      },
      assessment: {
        completedAt: result.completed_at,
        overallScore: result.percentage_score,
        totalQuestions: result.total_questions || 0,
        answeredQuestions: result.answered_questions || 0
      },
      timing: {
        totalTimeSeconds: 0, // We don't have this in the data
        averageTimePerQuestion: avgTime,
        timePerQuestion: timePerQuestion,
        formattedTotalTime: '00:00:00'
      },
      behavior: {
        answerChanges: totalChanges,
        tabSwitches: totalTabSwitches,
        violations: totalViolations,
        copyAttempts: totalCopyAttempts,
        pasteAttempts: totalPasteAttempts,
        rightClickAttempts: totalRightClicks,
        isAutoSubmitted: result.is_auto_submitted || false,
        hasBehavioralData: hasBehavioralData
      },
      flaggedQuestions: flaggedQuestions.slice(0, 20),
      riskAssessment: {
        level: getRiskLevel(totalViolations, totalTabSwitches, totalChanges, avgTime),
        summary: getRiskSummary(totalViolations, totalTabSwitches, totalChanges, avgTime)
      }
    };

    return res.status(200).json({
      success: true,
      behavioralMatrix
    });

  } catch (error) {
    console.error('[Behavioral] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function getRiskLevel(violations, tabSwitches, changes, avgTime) {
  let score = 0;
  if (violations > 0) score += 2;
  if (tabSwitches > 5) score += 1;
  if (changes > 10) score += 1;
  if (avgTime < 5) score += 1;

  if (score >= 4) return 'High Risk';
  if (score >= 2) return 'Medium Risk';
  return 'Low Risk';
}

function getRiskSummary(violations, tabSwitches, changes, avgTime) {
  const issues = [];
  if (violations > 0) issues.push(`${violations} violation(s)`);
  if (tabSwitches > 5) issues.push(`${tabSwitches} tab switches`);
  if (changes > 10) issues.push(`${changes} answer changes`);
  if (avgTime < 5) issues.push('Very fast answering (potential rushing)');

  if (issues.length === 0) return 'No behavioral concerns detected.';
  return `Behavioral flags: ${issues.join(', ')}.`;
}
