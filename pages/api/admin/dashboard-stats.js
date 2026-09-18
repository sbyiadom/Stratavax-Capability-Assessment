// pages/api/admin/dashboard-stats.js
// Phase 6.5 — real dashboard metrics with time-window deltas.
// Every number is computed from the database. No hardcoded deltas, no
// percentage-of-total multipliers.

import { createClient } from '@supabase/supabase-js';

function logSupabaseError(tag, error, extra = {}) {
  console.error(`[Dashboard Stats] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

async function resolveAdmin(serviceClient, token) {
  const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return { error: 'Unauthorized: Invalid token', status: 401 };
  }

  const userId = userData.user.id;
  const metadataRole = userData.user.user_metadata?.role || null;

  const { data: profile, error: profileError } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    logSupabaseError('admin lookup failed', profileError, { userId });
    return { error: `Unable to verify caller identity: ${profileError.message}`, status: 500 };
  }

  const resolvedRole = profile?.role || metadataRole;

  if (resolvedRole !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  if (profile?.is_active === false) {
    return { error: 'Account is inactive', status: 403 };
  }

  return { userId, role: resolvedRole };
}

// count helper: returns number of rows matching a filter function
async function countRows(serviceClient, table, applyFilters) {
  let query = serviceClient.from(table).select('*', { count: 'exact', head: true });
  query = applyFilters(query);
  const { count, error } = await query;
  if (error) {
    logSupabaseError(`count ${table} failed`, error);
    throw error;
  }
  return count || 0;
}

function pctDelta(current, previous) {
  if (previous === 0) {
    if (current === 0) return { delta: 0, deltaPct: 0 };
    return { delta: current, deltaPct: null }; // undefined-from-zero
  }
  const delta = current - previous;
  const deltaPct = Math.round((delta / previous) * 1000) / 10; // one decimal
  return { delta, deltaPct };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Dashboard Stats] Missing Supabase credentials');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const caller = await resolveAdmin(serviceClient, token);
    if (caller.error) {
      return res.status(caller.status || 401).json({ success: false, error: caller.error });
    }

    // ============================================================
    // CANDIDATES — 30-day windows
    // ============================================================
    const [
      totalCandidates,
      candidatesLast30,
      candidatesPrev30,
    ] = await Promise.all([
      countRows(serviceClient, 'candidate_profiles', (q) => q),
      countRows(serviceClient, 'candidate_profiles', (q) =>
        q.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      ),
      countRows(serviceClient, 'candidate_profiles', (q) =>
        q
          .gte('created_at', new Date(Date.now() - 60 * 86400000).toISOString())
          .lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      ),
    ]);

    const candidateDelta = pctDelta(candidatesLast30, candidatesPrev30);

    // ============================================================
    // RESULTS — 7-day and 30-day windows
    // ============================================================
    const [
      totalResults,
      resultsLast7,
      resultsPrev7,
      resultsLast30,
      resultsPrev30,
    ] = await Promise.all([
      countRows(serviceClient, 'assessment_results', (q) => q),
      countRows(serviceClient, 'assessment_results', (q) =>
        q.gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString())
      ),
      countRows(serviceClient, 'assessment_results', (q) =>
        q
          .gte('completed_at', new Date(Date.now() - 14 * 86400000).toISOString())
          .lt('completed_at', new Date(Date.now() - 7 * 86400000).toISOString())
      ),
      countRows(serviceClient, 'assessment_results', (q) =>
        q.gte('completed_at', new Date(Date.now() - 30 * 86400000).toISOString())
      ),
      countRows(serviceClient, 'assessment_results', (q) =>
        q
          .gte('completed_at', new Date(Date.now() - 60 * 86400000).toISOString())
          .lt('completed_at', new Date(Date.now() - 30 * 86400000).toISOString())
      ),
    ]);

    const resultsDelta7 = pctDelta(resultsLast7, resultsPrev7);
    const resultsDelta30 = pctDelta(resultsLast30, resultsPrev30);

    // ============================================================
    // COMPLETION — snapshot (completed sessions vs total)
    // ============================================================
    const [
      totalAssigned,
      completedAssessments,
      inProgressCount,
      blockedCount,
    ] = await Promise.all([
      countRows(serviceClient, 'candidate_assessments', (q) => q),
      countRows(serviceClient, 'candidate_assessments', (q) => q.eq('status', 'completed')),
      countRows(serviceClient, 'assessment_sessions', (q) => q.eq('status', 'in_progress')),
      countRows(serviceClient, 'candidate_assessments', (q) => q.eq('status', 'blocked')),
    ]);

    const completionRate = totalAssigned > 0
      ? Math.round((completedAssessments / totalAssigned) * 100)
      : 0;

    // ============================================================
    // SCORE — average and pass rate (real, from percentage_score)
    // ============================================================
    const { data: scoreRows, error: scoreError } = await serviceClient
      .from('assessment_results')
      .select('percentage_score')
      .not('percentage_score', 'is', null);

    if (scoreError) {
      logSupabaseError('score fetch failed', scoreError);
    }

    const scores = (scoreRows || [])
      .map((r) => Number(r.percentage_score))
      .filter((v) => Number.isFinite(v));

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const passCount = scores.filter((s) => s >= 70).length;
    const passRate = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

    // ============================================================
    // RESPONSE
    // ============================================================
    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),

      candidates: {
        total: totalCandidates,
        last30: candidatesLast30,
        prev30: candidatesPrev30,
        delta30: candidateDelta.delta,
        deltaPct30: candidateDelta.deltaPct,
      },

      results: {
        total: totalResults,
        last7: resultsLast7,
        prev7: resultsPrev7,
        delta7: resultsDelta7.delta,
        deltaPct7: resultsDelta7.deltaPct,
        last30: resultsLast30,
        prev30: resultsPrev30,
        delta30: resultsDelta30.delta,
        deltaPct30: resultsDelta30.deltaPct,
      },

      completion: {
        totalAssigned,
        completed: completedAssessments,
        rate: completionRate,
        inProgress: inProgressCount,
        blocked: blockedCount,
      },

      scores: {
        sampleSize: scores.length,
        average: avgScore,
        passRate,
        passThreshold: 70,
      },
    });
  } catch (error) {
    console.error('[Dashboard Stats] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
