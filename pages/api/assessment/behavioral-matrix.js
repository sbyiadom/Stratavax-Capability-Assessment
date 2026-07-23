// pages/api/assessment/behavioral-matrix.js

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

    // Get the result with session data
    const { data: result, error: resultError } = await supabase
      .from('assessment_results')
      .select(`
        id,
        user_id,
        assessment_id,
        percentage_score,
        completed_at,
        total_questions,
        answered_questions,
        is_auto_submitted,
        session_id,
        report_data,
        candidate_profiles:user_id (
          full_name,
          email,
          university,
          programme
        ),
        assessments:assessment_id (
          title
        )
      `)
      .eq('id', resultId)
      .single();

    if (resultError) {
      return res.status(500).json({ success: false, error: resultError.message });
    }

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', result.session_id)
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', result.session_id);

    if (responsesError) {
      console.error('Responses error:', responsesError);
    }

    // Calculate behavioral metrics
    const metrics = {
      totalQuestions: result.total_questions || 0,
      answeredQuestions: result.answered_questions || 0,
      totalTimeSeconds: session?.total_time_spent || 0,
      averageTimePerQuestion: 0,
      answerChanges: 0,
      tabSwitches: 0,
      violations: 0,
      copyAttempts: 0,
      pasteAttempts: 0,
      rightClickAttempts: 0,
      timePerQuestion: [],
      answersTimeline: [],
      flaggedQuestions: []
    };

    let totalChanges = 0;
    let totalTabSwitches = 0;
    let totalViolations = 0;
    let totalCopyAttempts = 0;
    let totalPasteAttempts = 0;
    let totalRightClicks = 0;
    const timePerQuestion = [];

    if (responses && responses.length > 0) {
      responses.forEach(response => {
        const metadata = response.metadata || {};
        
        if (metadata.times_changed) {
          totalChanges += parseInt(metadata.times_changed) || 0;
        }
        if (metadata.tab_switches) {
          totalTabSwitches += parseInt(metadata.tab_switches) || 0;
        }
        if (metadata.violations) {
          totalViolations += parseInt(metadata.violations) || 0;
        }
        if (metadata.copy_attempts) {
          totalCopyAttempts += parseInt(metadata.copy_attempts) || 0;
        }
        if (metadata.paste_attempts) {
          totalPasteAttempts += parseInt(metadata.paste_attempts) || 0;
        }
        if (metadata.right_click_attempts) {
          totalRightClicks += parseInt(metadata.right_click_attempts) || 0;
        }

        if (metadata.time_on_question) {
          timePerQuestion.push({
            question_id: response.question_id,
            time_seconds: parseInt(metadata.time_on_question) || 0,
            changed: (metadata.times_changed || 0) > 0,
            violation: (metadata.violations || 0) > 0,
            answer: response.answer_id
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

    const behavioralMatrix = {
      candidate: {
        name: result.candidate_profiles?.full_name || 'Unknown',
        email: result.candidate_profiles?.email || '',
        university: result.candidate_profiles?.university || '',
        programme: result.candidate_profiles?.programme || ''
      },
      assessment: {
        title: result.assessments?.title || 'Unknown',
        completedAt: result.completed_at,
        overallScore: result.percentage_score,
        totalQuestions: result.total_questions,
        answeredQuestions: result.answered_questions
      },
      timing: {
        totalTimeSeconds: session?.total_time_spent || metrics.totalTimeSeconds,
        averageTimePerQuestion: avgTime,
        timePerQuestion: timePerQuestion,
        formattedTotalTime: formatTime(session?.total_time_spent || metrics.totalTimeSeconds)
      },
      behavior: {
        answerChanges: totalChanges,
        tabSwitches: totalTabSwitches,
        violations: totalViolations,
        copyAttempts: totalCopyAttempts,
        pasteAttempts: totalPasteAttempts,
        rightClickAttempts: totalRightClicks,
        isAutoSubmitted: result.is_auto_submitted || false
      },
      flaggedQuestions: flaggedQuestions,
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
    console.error('Behavioral matrix error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
