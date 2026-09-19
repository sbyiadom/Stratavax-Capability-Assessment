// pages/api/supervisor/manage-candidates/[userId]/detail.js
// Phase 7A — server-side candidate detail for the supervisor surface.
//
// Replaces the direct Supabase reads in
// pages/supervisor/manage-candidate/[userId]/index.js.
//
// Returns:
//   {
//     success: true,
//     candidate: { id, full_name, email, university, programme, ... },
//     reports: [ { id, assessment_id, assessment_title, score, status,
//                  isCompleted, completed_at, created_at,
//                  total_score, max_score, percentage_score,
//                  category_scores, report_data } ],
//     assignedSupervisors: [ { id, full_name, email } ],
//     scope: { type: 'admin' | 'supervisor' }
//   }

import { createClient } from '@supabase/supabase-js';
import {
  resolveCallerRole,
  canAccessCandidate,
} from '../../../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Candidate Detail] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// Score calculation: mirrors the client-side calculateScore logic
function computeScoreFromResult(result) {
  if (!result) return 0;

  // 1. Explicit percentage_score
  if (result.percentage_score !== undefined && result.percentage_score !== null) {
    const v = safeNumber(result.percentage_score);
    if (v > 0 && v <= 100) return Math.round(v);
  }

  // 2. From category_scores
  let categoryScores = result.category_scores;
  if (!categoryScores && result.report_data) {
    try {
      const rd = typeof result.report_data === 'string'
        ? JSON.parse(result.report_data)
        : result.report_data;
      categoryScores = rd?.categoryScores || rd?.category_scores || null;
    } catch { /* ignore */ }
  }

  if (categoryScores && typeof categoryScores === 'object') {
    const values = Array.isArray(categoryScores)
      ? categoryScores
      : Object.values(categoryScores);

    let totalEarned = 0;
    let totalMax = 0;
    const validPcts = [];

    values.forEach((cat) => {
      if (!cat || typeof cat !== 'object') return;
      const score = safeNumber(cat.score || cat.earned || 0);
      const maxScore = safeNumber(cat.maxScore || cat.max || 0);
      const pct = safeNumber(cat.percentage || 0);
      if (maxScore > 0 && score >= 0) {
        totalEarned += score;
        totalMax += maxScore;
      }
      if (pct > 0 && pct <= 100) validPcts.push(pct);
    });

    if (totalMax > 0) {
      return Math.min(100, Math.max(0, Math.round((totalEarned / totalMax) * 100)));
    }
    if (validPcts.length > 0) {
      return Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length);
    }
  }

  // 3. From total_score / max_score
  if (result.total_score !== undefined && result.max_score !== undefined) {
    const total = safeNumber(result.total_score);
    const max = safeNumber(result.max_score);
    if (max > 0) {
      return Math.min(100, Math.max(0, Math.round((total / max) * 100)));
    }
  }

  return 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Candidate Detail] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const { userId } = req.query;
    const candidateId = String(userId || '').trim();
    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !userData?.user) {
      logError('auth.getUser failed', authError || { message: 'no user' });
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const userId = userData.user.id;
    const userMetadata = userData.user.user_metadata || null;

    const caller = await resolveCallerRole(serviceClient, userId, userMetadata);

    if (caller.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (!caller.isAdmin && !caller.isSupervisor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const scopedCaller = {
      userId,
      isAdmin: caller.isAdmin,
      isSupervisor: caller.isSupervisor,
      role: caller.role,
    };

    // Access check
    const hasAccess = await canAccessCandidate(serviceClient, scopedCaller, candidateId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'You do not have permission to view this candidate.' });
    }

    // Load candidate profile
    const { data: candidate, error: candidateError } = await serviceClient
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError) {
      logError('candidate_profiles lookup failed', candidateError, { candidateId });
      return res.status(500).json({ success: false, error: 'Failed to load candidate' });
    }

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Load results with assessment title via separate query (avoid embedded joins)
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('*, assessments:assessment_id(id, title, description)')
      .eq('user_id', candidateId)
      .order('created_at', { ascending: false });

    if (resultsError) {
      logError('assessment_results lookup failed', resultsError, { candidateId });
      // Non-fatal — return candidate with empty results
    }

    const reports = (results || []).map((result) => {
      const assessment = result.assessments || {};
      const displayScore = computeScoreFromResult(result);
      const status = result.completed_at ? 'Completed' : (result.status || 'Pending');
      const isCompleted = !!result.completed_at;

      return {
        id: result.id,
        assessment_id: result.assessment_id,
        assessment_title: assessment?.title || 'Untitled Assessment',
        score: displayScore,
        status,
        isCompleted,
        completed_at: result.completed_at,
        created_at: result.created_at,
        total_score: result.total_score,
        max_score: result.max_score,
        percentage_score: result.percentage_score,
        category_scores: result.category_scores,
        report_data: result.report_data,
        // raw_result intentionally omitted from the response — the page
        // currently uses it for nothing except display consistency, and
        // it contains proctoring data that should be fetched via the
        // assessment-report endpoint instead.
      };
    });

    // Load assigned supervisors for display
    let assignedSupervisors = [];
    const { data: supervisorRows, error: supervisorError } = await serviceClient
      .from('candidate_supervisors')
      .select('supervisor_id, supervisor_profiles!inner(id, full_name, email)')
      .eq('candidate_id', candidateId);

    if (supervisorError) {
      logError('candidate_supervisors lookup failed', supervisorError, { candidateId });
    } else if (Array.isArray(supervisorRows)) {
      assignedSupervisors = supervisorRows
        .map((row) => row.supervisor_profiles)
        .filter(Boolean);
    }

    return res.status(200).json({
      success: true,
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name || '',
        email: candidate.email || '',
        university: candidate.university || '',
        programme: candidate.programme || '',
        graduation_year: candidate.graduation_year || '',
        preferred_department: candidate.preferred_department || '',
        created_at: candidate.created_at || null,
        supervisor_id: candidate.supervisor_id || null,
      },
      reports,
      assignedSupervisors,
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
      },
    });
  } catch (error) {
    console.error('[Candidate Detail] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
