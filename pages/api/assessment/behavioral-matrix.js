// pages/api/assessment/behavioral-matrix.js - WITH COMMENTS

import { createClient } from '@supabase/supabase-js';

// ============================================================
// VIOLATION TYPE DEFINITIONS WITH COMMENTS
// ============================================================
const VIOLATION_TYPES = {
  tab_switch: {
    label: 'Tab Switch',
    severity: 'high',
    comment: 'Candidate switched to another browser tab or window. This may indicate they were looking up answers, using other applications, or multitasking during the assessment.',
    recommendation: 'Flag for review. 108 tab switches is excessive and suggests the candidate was not fully focused on the assessment.'
  },
  copy_attempt: {
    label: 'Copy Attempt',
    severity: 'high',
    comment: 'Candidate attempted to copy content from the assessment page. This is typically an attempt to save or share questions.',
    recommendation: 'Review for potential academic dishonesty.'
  },
  paste_attempt: {
    label: 'Paste Attempt',
    severity: 'high',
    comment: 'Candidate attempted to paste content into the assessment. This may indicate they were copying answers from external sources.',
    recommendation: 'Investigate for potential cheating.'
  },
  right_click_attempt: {
    label: 'Right-Click Attempt',
    severity: 'medium',
    comment: 'Candidate attempted to right-click on the assessment page. This is often an attempt to access browser developer tools or copy content.',
    recommendation: 'Monitor for other suspicious behavior.'
  },
  screenshot_attempt: {
    label: 'Screenshot Attempt',
    severity: 'high',
    comment: 'Candidate attempted to take a screenshot of the assessment. This may indicate they were trying to save questions.',
    recommendation: 'Flag for review.'
  },
  devtools_attempt: {
    label: 'DevTools Attempt',
    severity: 'critical',
    comment: 'Candidate attempted to open browser developer tools. This is a serious violation as it may indicate attempts to manipulate the assessment or view hidden content.',
    recommendation: 'Consider invalidating the assessment.'
  },
  view_source: {
    label: 'View Source Attempt',
    severity: 'high',
    comment: 'Candidate attempted to view the page source code. This may indicate attempts to find hidden answers or manipulate the assessment.',
    recommendation: 'Flag for technical review.'
  },
  violation: {
    label: 'Rule Violation',
    severity: 'medium',
    comment: 'Candidate violated assessment rules. This includes tab switching, copy attempts, paste attempts, and other prohibited actions.',
    recommendation: 'Review the specific violation types for details.'
  }
};

// Helper function to get violation comment
function getViolationComment(type, count) {
  const info = VIOLATION_TYPES[type] || VIOLATION_TYPES.violation;
  return {
    label: info.label,
    severity: info.severity,
    comment: info.comment,
    recommendation: info.recommendation,
    count: count
  };
}

// Helper function to generate risk level comment
function getRiskComment(level, violations, tabSwitches) {
  switch(level) {
    case 'High Risk':
      return {
        summary: `⚠️ HIGH RISK: ${violations} violations and ${tabSwitches} tab switches detected.`,
        detail: 'This candidate exhibited significant behavioral concerns during the assessment, including excessive tab switching and rule violations. Strongly recommend review and potential invalidation of results.',
        action: 'Immediate review required. Consider invalidating the assessment.'
      };
    case 'Medium Risk':
      return {
        summary: `⚠️ MEDIUM RISK: ${violations} violations and ${tabSwitches} tab switches detected.`,
        detail: 'This candidate showed moderate behavioral concerns during the assessment, including tab switching and rule violations. Recommend review and follow-up.',
        action: 'Review the assessment results carefully. Consider a follow-up interview to discuss the behavior.'
      };
    case 'Low Risk':
      return {
        summary: `✅ LOW RISK: Minimal behavioral concerns detected.`,
        detail: 'This candidate demonstrated good focus and compliance with assessment rules. No significant behavioral issues were detected.',
        action: 'No action required. Standard review process applies.'
      };
    default:
      return {
        summary: 'Behavioral assessment complete.',
        detail: 'No significant behavioral concerns detected.',
        action: 'Standard review process applies.'
      };
  }
}

// Helper function to format flagged questions with comments
function formatFlaggedQuestions(questions) {
  return questions.map(q => ({
    ...q,
    comment: q.violation 
      ? '⚠️ This question had a violation (tab switch, copy attempt, etc.)' 
      : q.changed 
        ? '✏️ Candidate changed their answer on this question'
        : '⏱️ Candidate spent more than 60 seconds on this question',
    recommendation: q.violation 
      ? 'Review this question for potential compromise' 
      : 'No action needed'
  }));
}

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

    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('question_id, time_spent_seconds, times_changed, metadata, created_at')
      .eq('session_id', result.session_id)
      .order('created_at', { ascending: true });

    if (responsesError) {
      console.error('Responses error:', responsesError);
    }

    // ============================================================
    // CALCULATE BEHAVIORAL METRICS WITH COMMENTS
    // ============================================================
    let totalChanges = 0;
    let totalTabSwitches = 0;
    let totalViolations = 0;
    let totalCopyAttempts = 0;
    let totalPasteAttempts = 0;
    let totalRightClicks = 0;
    let violationTypes = {};
    const timePerQuestion = [];
    const violationTimeline = [];

    if (responses && responses.length > 0) {
      responses.forEach(response => {
        // From columns
        totalChanges += response.times_changed || 0;
        
        // From metadata
        const metadata = response.metadata || {};
        const tabSwitches = parseInt(metadata.tab_switches, 10) || 0;
        const violations = parseInt(metadata.violations, 10) || 0;
        const copyAttempts = parseInt(metadata.copy_attempts, 10) || 0;
        const pasteAttempts = parseInt(metadata.paste_attempts, 10) || 0;
        const rightClicks = parseInt(metadata.right_click_attempts, 10) || 0;
        
        totalTabSwitches += tabSwitches;
        totalViolations += violations;
        totalCopyAttempts += copyAttempts;
        totalPasteAttempts += pasteAttempts;
        totalRightClicks += rightClicks;

        // Track violation types
        if (tabSwitches > 0) violationTypes.tab_switch = (violationTypes.tab_switch || 0) + tabSwitches;
        if (copyAttempts > 0) violationTypes.copy_attempt = (violationTypes.copy_attempt || 0) + copyAttempts;
        if (pasteAttempts > 0) violationTypes.paste_attempt = (violationTypes.paste_attempt || 0) + pasteAttempts;
        if (rightClicks > 0) violationTypes.right_click_attempt = (violationTypes.right_click_attempt || 0) + rightClicks;

        // Track timeline of violations
        if (violations > 0 || tabSwitches > 0 || copyAttempts > 0 || pasteAttempts > 0 || rightClicks > 0) {
          violationTimeline.push({
            question_id: response.question_id,
            timestamp: response.created_at,
            tab_switches: tabSwitches,
            violations: violations,
            copy_attempts: copyAttempts,
            paste_attempts: pasteAttempts,
            right_click_attempts: rightClicks
          });
        }

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

    // ============================================================
    // BUILD COMMENTED FLAGGED QUESTIONS
    // ============================================================
    const rawFlaggedQuestions = timePerQuestion.filter(q => 
      q.time_seconds > 60 || q.changed || q.violation
    );
    const flaggedQuestions = formatFlaggedQuestions(rawFlaggedQuestions);

    // ============================================================
    // BUILD VIOLATION COMMENTS
    // ============================================================
    const violationComments = [];
    Object.keys(violationTypes).forEach(type => {
      const info = getViolationComment(type, violationTypes[type]);
      violationComments.push({
        type: type,
        label: info.label,
        count: info.count,
        severity: info.severity,
        comment: info.comment,
        recommendation: info.recommendation
      });
    });

    // Sort by severity and count
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    violationComments.sort((a, b) => {
      const aScore = (a.count || 0) * 10 + severityOrder[a.severity] || 99;
      const bScore = (b.count || 0) * 10 + severityOrder[b.severity] || 99;
      return bScore - aScore;
    });

    const hasBehavioralData = 
      totalChanges > 0 || 
      totalTabSwitches > 0 || 
      totalViolations > 0 || 
      totalCopyAttempts > 0 || 
      totalPasteAttempts > 0 || 
      totalRightClicks > 0 ||
      timePerQuestion.length > 0;

    // ============================================================
    // GENERATE RISK COMMENT
    // ============================================================
    const riskLevel = getRiskLevel(totalViolations, totalTabSwitches, totalChanges, avgTime);
    const riskComment = getRiskComment(riskLevel, totalViolations, totalTabSwitches);

    // ============================================================
    // BUILD RESPONSE WITH COMMENTS
    // ============================================================
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
        totalQuestions: result.total_questions || 0,
        answeredQuestions: result.answered_questions || 0
      },
      timing: {
        totalTimeSeconds: 0,
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
        hasBehavioralData: hasBehavioralData,
        violationComments: violationComments,  // ADDED: Comments for each violation type
        violationTimeline: violationTimeline  // ADDED: Timeline of when violations occurred
      },
      flaggedQuestions: flaggedQuestions,  // ADDED: Questions with comments
      riskAssessment: {
        level: riskLevel,
        summary: riskComment.summary,  // ADDED: Risk summary with comment
        detail: riskComment.detail,    // ADDED: Detailed risk explanation
        action: riskComment.action      // ADDED: Recommended action
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
