// pages/api/assessment/behavioral-matrix.js - FULLY CORRECTED (Step 3)
// Added formatDuration, totalTimeSeconds, and the summary object.

import { createClient } from '@supabase/supabase-js';

// ============================================================
// VIOLATION TYPE DEFINITIONS
// ============================================================
const VIOLATION_TYPES = {
  tab_switch: {
    label: 'Tab Switch',
    severity: 'high',
    comment: 'Candidate switched to another browser tab or window. This may indicate they were looking up answers, using other applications, or multitasking during the assessment.',
    recommendation: 'Flag for review. Excessive tab switches suggests the candidate was not fully focused on the assessment.'
  },
  tab_switch_external: {
    label: 'External Tab Switch',
    severity: 'critical',
    comment: 'Candidate switched to an external website or application. This is a serious violation as it may indicate they were searching for answers or using external resources.',
    recommendation: 'Immediate review required. Consider invalidating the assessment.'
  },
  external_url_visit: {
    label: 'External URL Visit',
    severity: 'critical',
    comment: 'Candidate visited an external website during the assessment. This may indicate they were looking up answers or using unauthorized resources.',
    recommendation: 'Review the specific URLs visited. Search engines and AI tools are high-risk categories.'
  },
  external_link_click: {
    label: 'External Link Click',
    severity: 'high',
    comment: 'Candidate clicked on an external link from the assessment page. This may indicate an attempt to leave the assessment environment.',
    recommendation: 'Flag for review.'
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

// ============================================================
// EXTRACT EXTERNAL URLS FROM RESULT
// ============================================================
function extractExternalUrls(result) {
  let externalUrls = [];
  let domainVisits = {};
  
  // Check proctoring_data
  if (result.proctoring_data) {
    try {
      const proctoringData = typeof result.proctoring_data === 'string' 
        ? JSON.parse(result.proctoring_data) 
        : result.proctoring_data;
      
      externalUrls = proctoringData.externalUrls || [];
      domainVisits = proctoringData.domainVisits || {};
      
      // Also check for externalUrls in other formats
      if (proctoringData.external_urls) {
        externalUrls = proctoringData.external_urls;
      }
      if (proctoringData.urlVisits) {
        externalUrls = proctoringData.urlVisits;
      }
    } catch (e) {
      console.warn('Error parsing proctoring_data:', e);
    }
  }
  
  // Check flattened external_urls_visited column
  if (result.external_urls_visited && Array.isArray(result.external_urls_visited)) {
    if (result.external_urls_visited.length > externalUrls.length) {
      externalUrls = result.external_urls_visited;
    }
  }
  
  // Check domain_visits column
  if (result.domain_visits && typeof result.domain_visits === 'object') {
    domainVisits = { ...domainVisits, ...result.domain_visits };
  }
  
  // Categorize external URLs
  externalUrls = externalUrls.map(url => {
    if (!url.category) {
      const domain = url.domain || '';
      if (domain.includes('google') || domain.includes('bing') || domain.includes('yahoo') || domain.includes('duckduckgo')) {
        url.category = 'search_engine';
      } else if (domain.includes('chatgpt') || domain.includes('claude') || domain.includes('perplexity') || domain.includes('bard')) {
        url.category = 'ai_tool';
      } else if (domain.includes('youtube') || domain.includes('twitter') || domain.includes('facebook') || domain.includes('linkedin')) {
        url.category = 'social_media';
      } else if (domain.includes('slack') || domain.includes('teams') || domain.includes('discord') || domain.includes('whatsapp')) {
        url.category = 'messaging';
      } else if (domain.includes('wikipedia') || domain.includes('khanacademy') || domain.includes('coursera')) {
        url.category = 'educational';
      } else if (domain.includes('github') || domain.includes('stackoverflow') || domain.includes('gitlab')) {
        url.category = 'code_reference';
      } else if (domain.includes('gmail') || domain.includes('outlook') || domain.includes('mail')) {
        url.category = 'email';
      } else {
        url.category = 'other';
      }
    }
    return url;
  });
  
  return { externalUrls, domainVisits };
}

// ============================================================
// CATEGORIZE VIOLATIONS
// ============================================================
function categorizeViolations(violations) {
  const categorized = {};
  violations.forEach(v => {
    const type = v.type || 'violation';
    if (!categorized[type]) {
      categorized[type] = 0;
    }
    categorized[type]++;
  });
  return categorized;
}

// ============================================================
// 🟢 NEW HELPER: FORMAT DURATION (Step 3.1)
// ============================================================
function formatDuration(seconds) {
  const totalSeconds = Number(seconds) || 0;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get the result WITH proctoring data
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
        proctoring_data,
        external_urls_visited,
        domain_visits,
        violations,
        tab_switch_details,
        risk_score,
        risk_level,
        total_tab_switches,
        total_external_urls
      `)
      .eq('id', resultId)
      .single();

    if (resultError) {
      console.error('Result error:', resultError);
      return res.status(500).json({ success: false, error: resultError.message });
    }

    // ============================================================
    // EXTRACT EXTERNAL URLS
    // ============================================================
    const { externalUrls, domainVisits } = extractExternalUrls(result);
    
    // Get violations from result
    let violations = [];
    if (result.violations && Array.isArray(result.violations)) {
      violations = result.violations;
    } else if (result.proctoring_data) {
      try {
        const proctoringData = typeof result.proctoring_data === 'string' 
          ? JSON.parse(result.proctoring_data) 
          : result.proctoring_data;
        violations = proctoringData.violations || [];
      } catch (e) {}
    }
    
    const violationTypes = categorizeViolations(violations);

    // Get candidate profile
    // 🟢 STEP 5: Confirmed candidate_profiles uses "id" as the primary key, not "user_id"
    const { data: candidateProfile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('full_name, email, university, programme')
      .eq('id', result.user_id)
      .single();

    if (profileError) {
      console.warn('Profile error (non-fatal):', profileError.message);
    }

    // Get assessment title
    let assessmentTitle = 'Assessment';
    try {
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('title')
        .eq('id', result.assessment_id)
        .single();
      
      if (!assessmentError && assessmentData) {
        assessmentTitle = assessmentData.title || 'Assessment';
      }
    } catch (assessmentErr) {
      console.warn('Assessment fetch error:', assessmentErr.message);
    }

    // Get responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('question_id, time_spent_seconds, times_changed, metadata, created_at')
      .eq('session_id', result.session_id)
      .order('created_at', { ascending: true });

    if (responsesError) {
      console.error('Responses error:', responsesError);
    }

    // Calculate behavioral metrics
    let totalChanges = 0;
    let totalTabSwitches = 0;
    let totalViolations = 0;
    let totalCopyAttempts = 0;
    let totalPasteAttempts = 0;
    let totalRightClicks = 0;
    const timePerQuestion = [];
    const violationTimeline = [];

    if (responses && responses.length > 0) {
      responses.forEach(response => {
        totalChanges += response.times_changed || 0;
        
        const metadata = response.metadata || {};
        const tabSwitches = parseInt(metadata.tab_switches, 10) || 0;
        const violationsCount = parseInt(metadata.violations, 10) || 0;
        const copyAttempts = parseInt(metadata.copy_attempts, 10) || 0;
        const pasteAttempts = parseInt(metadata.paste_attempts, 10) || 0;
        const rightClicks = parseInt(metadata.right_click_attempts, 10) || 0;
        
        totalTabSwitches += tabSwitches;
        totalViolations += violationsCount;
        totalCopyAttempts += copyAttempts;
        totalPasteAttempts += pasteAttempts;
        totalRightClicks += rightClicks;

        if (violationsCount > 0 || tabSwitches > 0 || copyAttempts > 0 || pasteAttempts > 0 || rightClicks > 0) {
          violationTimeline.push({
            question_id: response.question_id,
            timestamp: response.created_at,
            tab_switches: tabSwitches,
            violations: violationsCount,
            copy_attempts: copyAttempts,
            paste_attempts: pasteAttempts,
            right_click_attempts: rightClicks
          });
        }

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

    // 🟢 STEP 3.2: Calculate totalTimeSeconds
    let totalTimeSeconds = 0;
    if (result.proctoring_data) {
      try {
        const proctoringData = typeof result.proctoring_data === 'string' 
          ? JSON.parse(result.proctoring_data) 
          : result.proctoring_data;
        totalTimeSeconds = proctoringData.summary?.duration || 0;
      } catch (e) {}
    }
    // Fallback if not found in proctoring_data
    if (totalTimeSeconds === 0 && result.completed_at) {
      const { data: sessionData } = await supabase
        .from('assessment_sessions')
        .select('started_at, completed_at')
        .eq('id', result.session_id)
        .single();
      
      if (sessionData?.started_at && sessionData?.completed_at) {
        totalTimeSeconds = Math.floor((new Date(sessionData.completed_at) - new Date(sessionData.started_at)) / 1000);
      }
    }

    const rawFlaggedQuestions = timePerQuestion.filter(q => 
      q.time_seconds > 60 || q.changed || q.violation
    );
    const flaggedQuestions = formatFlaggedQuestions(rawFlaggedQuestions);

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
      timePerQuestion.length > 0 ||
      externalUrls.length > 0;

    const riskLevel = result.risk_level || getRiskLevel(totalViolations, totalTabSwitches, totalChanges, avgTime);
    const riskComment = getRiskComment(riskLevel, totalViolations, totalTabSwitches);

    // ============================================================
    // BUILD BEHAVIORAL MATRIX WITH EXTERNAL URLS
    // ============================================================
    const behavioralMatrix = {
      candidate: {
        name: candidateProfile?.full_name || 'Unknown',
        email: candidateProfile?.email || '',
        university: candidateProfile?.university || '',
        programme: candidateProfile?.programme || ''
      },
      assessment: {
        title: assessmentTitle,
        completedAt: result.completed_at,
        overallScore: result.percentage_score,
        totalQuestions: result.total_questions || 0,
        answeredQuestions: result.answered_questions || 0
      },
      // 🟢 STEP 3.3: Updated timing object with totalTimeSeconds
      timing: {
        totalTimeSeconds: totalTimeSeconds,
        averageTimePerQuestion: avgTime,
        timePerQuestion: timePerQuestion,
        formattedTotalTime: formatDuration(totalTimeSeconds)
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
        violationComments: violationComments,
        violationTimeline: violationTimeline
      },
      // 🟢 STEP 3.3: ADDED SUMMARY OBJECT FOR REPORT COMPONENT COMPATIBILITY
      summary: {
        duration: totalTimeSeconds,
        averageTimePerQuestion: avgTime,
        answerChanges: totalChanges,
        tabSwitches: totalTabSwitches,
        totalViolations: totalViolations,
        copyAttempts: totalCopyAttempts,
        pasteAttempts: totalPasteAttempts,
        copyPasteAttempts: totalCopyAttempts + totalPasteAttempts,
        rightClickAttempts: totalRightClicks,
        riskLevel: String(riskLevel || 'Low Risk')
          .toLowerCase()
          .replace('risk', '')
          .trim(),
        hasBehavioralData: hasBehavioralData,
        externalUrlsCount: externalUrls.length
      },
      // ============================================================
      // EXTERNAL URL DATA
      // ============================================================
      externalUrls: externalUrls,
      domainVisits: domainVisits,
      externalDomainCounts: externalUrls.reduce((acc, url) => {
        if (url.domain) {
          acc[url.domain] = (acc[url.domain] || 0) + 1;
        }
        return acc;
      }, {}),
      externalUrlsCount: externalUrls.length,
      flaggedQuestions: flaggedQuestions,
      riskAssessment: {
        level: riskLevel,
        summary: riskComment.summary,
        detail: riskComment.detail,
        action: riskComment.action
      }
    };

    // ============================================================
    // RETURN BOTH STRUCTURES FOR COMPATIBILITY
    // ============================================================
    return res.status(200).json({
      success: true,
      behavioralMatrix: behavioralMatrix,
      matrixData: behavioralMatrix,
      data: behavioralMatrix,
      result: behavioralMatrix
    });

  } catch (error) {
    console.error('Behavioral matrix error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      matrixData: null,
      behavioralMatrix: null
    });
  }
}
