// pages/api/supervisor/dashboard.js - SIMPLIFIED WORKING VERSION
import { createClient } from '@supabase/supabase-js';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getReportData(result) {
  if (!result?.report_data) return {};
  if (typeof result.report_data === 'object') return result.report_data;
  if (typeof result.report_data === 'string') {
    try { return JSON.parse(result.report_data) || {}; } 
    catch { return {}; }
  }
  return {};
}

function normalizeCategoryScores(result) {
  const reportData = getReportData(result);
  const raw = result?.category_scores || reportData?.category_scores || reportData?.categoryBreakdown || [];
  
  if (Array.isArray(raw)) {
    return raw.map(cat => ({
      category: cat.category || cat.name || '',
      percentage: Math.round(Number(cat.percentage || cat.score || 0))
    }));
  }
  
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([cat, data]) => ({
      category: cat,
      percentage: Math.round(Number(data?.percentage || 0))
    }));
  }
  
  return [];
}

function calculateScore(result) {
  const categories = normalizeCategoryScores(result);
  const valid = categories.filter(c => c.percentage > 0);
  if (valid.length > 0) {
    const sum = valid.reduce((a, c) => a + c.percentage, 0);
    return Math.round(sum / valid.length);
  }
  return Math.round(safeNumber(result?.percentage_score || result?.score || 0));
}

function getNationalServiceScores(result) {
  const reportData = getReportData(result);
  return {
    workplace: safeNumber(result?.workplace_readiness || reportData?.dimensions?.workplaceReadiness || 0),
    intellectual: safeNumber(result?.intellectual_capability || reportData?.dimensions?.intellectualCapability || 0),
    overall: safeNumber(result?.percentage_score || reportData?.dimensions?.overallScore || 0)
  };
}

function getRecommendation(workplace, intellectual, overall) {
  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  if (workplace >= 50 || intellectual >= 50 || overall >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

async function fetchAllRows(queryFn, pageSize = 1000) {
  let all = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFn().range(from, to);
    if (error) throw error;
    const rows = data || [];
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Missing env vars' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const supervisorId = userData.user.id;
    const NS_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

    console.log('[Dashboard] Supervisor:', supervisorId);

    // Get supervisor profile
    const { data: supervisor, error: supError } = await supabase
      .from('supervisor_profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', supervisorId)
      .maybeSingle();

    if (supError) console.error('[Dashboard] Supervisor error:', supError);

    // Get candidates from junction table
    const { data: assignments, error: assError } = await supabase
      .from('candidate_supervisors')
      .select('candidate_id')
      .eq('supervisor_id', supervisorId);

    if (assError) {
      console.error('[Dashboard] Assignment error:', assError);
      return res.status(500).json({ success: false, error: assError.message });
    }

    const candidateIds = (assignments || []).map(a => a.candidate_id).filter(Boolean);
    console.log('[Dashboard] Candidates found:', candidateIds.length);

    if (candidateIds.length === 0) {
      return res.status(200).json({
        success: true,
        stats: { totalCandidates: 0, completedAssessments: 0, pendingReviews: 0, nationalServiceReports: 0 },
        candidates: [],
        nationalServiceReports: [],
        otherReports: []
      });
    }

    // Get candidate profiles
    const { data: candidates, error: candError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme')
      .in('id', candidateIds);

    if (candError) {
      console.error('[Dashboard] Candidates error:', candError);
      return res.status(500).json({ success: false, error: candError.message });
    }

    // Get assessment results - ONLY columns that exist
    const { data: results, error: resError } = await supabase
      .from('assessment_results')
      .select('id, user_id, assessment_id, percentage_score, score, completed_at, report_data, category_scores, workplace_readiness, intellectual_capability')
      .in('user_id', candidateIds);

    if (resError) {
      console.error('[Dashboard] Results error:', resError);
      return res.status(500).json({ success: false, error: resError.message });
    }

    console.log('[Dashboard] Results found:', results?.length || 0);

    // Get assessments
    const assessmentIds = [...new Set((results || []).map(r => r.assessment_id).filter(Boolean))];
    const { data: assessments, error: assmtError } = await supabase
      .from('assessments')
      .select('id, title, assessment_type_id')
      .in('id', assessmentIds);

    if (assmtError) console.error('[Dashboard] Assessments error:', assmtError);

    const assessmentMap = {};
    (assessments || []).forEach(a => { assessmentMap[a.id] = a; });

    // Process results
    const allReports = [];
    const candidateMap = {};
    (candidates || []).forEach(c => { candidateMap[c.id] = c; });

    let totalCompleted = 0;
    let nationalServiceCount = 0;

    (results || []).forEach(r => {
      const candidate = candidateMap[r.user_id];
      if (!candidate) return;

      const assessment = assessmentMap[r.assessment_id];
      const isNS = r.assessment_id === NS_ASSESSMENT_ID;
      
      let score = calculateScore(r);
      let workplace = safeNumber(r.workplace_readiness);
      let intellectual = safeNumber(r.intellectual_capability);
      
      if (isNS) {
        const ns = getNationalServiceScores(r);
        workplace = ns.workplace || workplace;
        intellectual = ns.intellectual || intellectual;
        score = ns.overall || score;
      }

      const recommendation = getRecommendation(workplace, intellectual, score);
      
      if (isNS) nationalServiceCount++;
      if (r.completed_at || score > 0) totalCompleted++;

      allReports.push({
        result_id: r.id,
        candidate_id: r.user_id,
        candidate_name: candidate.full_name || 'Unknown',
        candidate_email: candidate.email || '',
        university: candidate.university || '',
        programme: candidate.programme || '',
        assessment_id: r.assessment_id,
        assessment_title: assessment?.title || 'Assessment',
        score: score,
        percentage_score: r.percentage_score || 0,
        workplace_readiness: workplace,
        intellectual_capability: intellectual,
        recommendation: recommendation,
        is_national_service: isNS,
        completed_at: r.completed_at,
        category_scores: r.category_scores || [],
        report_data: r.report_data || {}
      });
    });

    const nsReports = allReports.filter(r => r.is_national_service);
    const otherReports = allReports.filter(r => !r.is_national_service);

    return res.status(200).json({
      success: true,
      stats: {
        totalCandidates: candidates.length,
        completedAssessments: totalCompleted,
        pendingReviews: 0,
        nationalServiceReports: nationalServiceCount
      },
      candidates: candidates.map(c => ({
        ...c,
        completedAssessments: allReports.filter(r => r.candidate_id === c.id),
        stats: { completed: allReports.filter(r => r.candidate_id === c.id).length }
      })),
      nationalServiceReports: nsReports,
      otherReports: otherReports
    });

  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
}
