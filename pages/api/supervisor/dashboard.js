// pages/api/supervisor/dashboard.js - COMPLETE FIXED FILE
// FIX: Properly fetches candidates from legacy supervisor_id field

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
  const raw = result?.category_scores || reportData?.categoryScores || reportData?.categoryBreakdown || [];
  
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
  if (result?.percentage_score) {
    return Math.round(safeNumber(result.percentage_score));
  }
  
  const categories = normalizeCategoryScores(result);
  const valid = categories.filter(c => c.percentage > 0);
  if (valid.length > 0) {
    const sum = valid.reduce((a, c) => a + c.percentage, 0);
    return Math.round(sum / valid.length);
  }
  
  const reportData = getReportData(result);
  if (reportData?.percentageScore) {
    return Math.round(safeNumber(reportData.percentageScore));
  }
  
  return 0;
}

function getNationalServiceScores(result) {
  const reportData = getReportData(result);
  
  let workplace = safeNumber(
    reportData?.workplaceReadiness || 
    reportData?.dimensions?.workplaceReadiness ||
    reportData?.workplace_readiness ||
    result?.workplace_readiness || 
    0
  );
  
  let intellectual = safeNumber(
    reportData?.intellectualCapability || 
    reportData?.dimensions?.intellectualCapability ||
    reportData?.intellectual_capability ||
    result?.intellectual_capability || 
    0
  );
  
  if (workplace === 0 && intellectual === 0) {
    const categoryScores = reportData?.categoryScores || reportData?.category_scores || result?.category_scores || [];
    
    const workplaceCategories = [
      'Communication & Teamwork', 
      'Ownership & Integrity', 
      'Safety & Risk Awareness', 
      'Technical Fundamentals',
      'Work Ethic',
      'Professional Conduct'
    ];
    
    const intellectualCategories = [
      'Problem Solving & Troubleshooting',
      'Logical Reasoning', 
      'Numerical Reasoning', 
      'Measurement & Engineering Units',
      'Learning Agility',
      'Cognitive Ability',
      'Analytical Thinking'
    ];
    
    let workplaceTotal = 0;
    let workplaceCount = 0;
    let intellectualTotal = 0;
    let intellectualCount = 0;
    
    if (Array.isArray(categoryScores) && categoryScores.length > 0) {
      categoryScores.forEach(cat => {
        const name = (cat.category || cat.name || '').toLowerCase();
        const percentage = safeNumber(cat.percentage || cat.score || 0);
        
        const isWorkplace = workplaceCategories.some(c => name.includes(c.toLowerCase()));
        const isIntellectual = intellectualCategories.some(c => name.includes(c.toLowerCase()));
        
        if (isWorkplace && percentage > 0) {
          workplaceTotal += percentage;
          workplaceCount++;
        } else if (isIntellectual && percentage > 0) {
          intellectualTotal += percentage;
          intellectualCount++;
        }
      });
    }
    
    workplace = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
    intellectual = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;
  }
  
  const overall = safeNumber(
    reportData?.percentageScore || 
    reportData?.overallScore || 
    reportData?.percentage_score ||
    result?.percentage_score || 
    0
  );
  
  if (workplace === 0 && intellectual === 0 && overall > 0) {
    workplace = overall;
    intellectual = overall;
  }
  
  return {
    workplaceReadiness: workplace,
    intellectualCapability: intellectual,
    overallScore: overall
  };
}

function getRecommendation(workplace, intellectual, overall) {
  const w = safeNumber(workplace);
  const i = safeNumber(intellectual);
  const o = safeNumber(overall);
  
  if (w >= 85 && i >= 85) return 'Highly Recommended';
  if (w >= 75 && i >= 75) return 'Recommended';
  if (w >= 65 && i >= 65) return 'Reserve Pool';
  if (w >= 50 || i >= 50 || o >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Dashboard] Missing env vars');
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

    console.log('[Dashboard] Supervisor ID:', supervisorId);

    // ============================================================
    // STEP 1: GET CANDIDATES FROM LEGACY supervisor_id FIELD
    // ============================================================
    let allCandidates = [];
    const candidateIdsSet = new Set();

    // PRIMARY: Get candidates from candidate_profiles.supervisor_id
    console.log('[Dashboard] Fetching candidates from legacy supervisor_id field...');
    const { data: legacyCandidates, error: legacyError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, created_at')
      .eq('supervisor_id', supervisorId);

    if (legacyError) {
      console.error('[Dashboard] Legacy field error:', legacyError);
    } else if (legacyCandidates) {
      legacyCandidates.forEach(c => {
        if (!candidateIdsSet.has(c.id)) {
          candidateIdsSet.add(c.id);
          allCandidates.push(c);
        }
      });
      console.log('[Dashboard] ✅ Legacy candidates found:', legacyCandidates.length);
    }

    // SECONDARY: Also check junction table
    console.log('[Dashboard] Also checking junction table...');
    try {
      const { data: junctionAssignments, error: junctionError } = await supabase
        .from('candidate_supervisors')
        .select('candidate_id')
        .eq('supervisor_id', supervisorId);

      if (!junctionError && junctionAssignments && junctionAssignments.length > 0) {
        const junctionIds = junctionAssignments.map(a => a.candidate_id).filter(Boolean);
        const missingIds = junctionIds.filter(id => !candidateIdsSet.has(id));
        
        if (missingIds.length > 0) {
          const { data: junctionCandidates, error: junctionCandError } = await supabase
            .from('candidate_profiles')
            .select('id, full_name, email, university, programme, created_at')
            .in('id', missingIds);
          
          if (!junctionCandError && junctionCandidates) {
            junctionCandidates.forEach(c => {
              if (!candidateIdsSet.has(c.id)) {
                candidateIdsSet.add(c.id);
                allCandidates.push(c);
              }
            });
            console.log('[Dashboard] ✅ Junction candidates found:', junctionCandidates.length);
          }
        }
      }
    } catch (junctionError) {
      console.log('[Dashboard] Junction table check:', junctionError.message);
    }

    console.log('[Dashboard] 📊 Total candidates found:', allCandidates.length);

    // If no candidates found, return empty response
    if (allCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalCandidates: 0,
          completedAssessments: 0,
          pendingReviews: 0,
          nationalServiceReports: 0
        },
        candidates: [],
        nationalServiceReports: [],
        otherReports: [],
        debug: {
          supervisorId: supervisorId,
          message: 'No candidates assigned to this supervisor yet'
        }
      });
    }

    const candidateIds = allCandidates.map(c => c.id);

    // ============================================================
    // STEP 2: GET ASSESSMENT RESULTS
    // ============================================================
    const { data: results, error: resError } = await supabase
      .from('assessment_results')
      .select('id, user_id, assessment_id, percentage_score, completed_at, report_data, category_scores, workplace_readiness, intellectual_capability, total_score, max_score')
      .in('user_id', candidateIds);

    if (resError) {
      console.error('[Dashboard] Results error:', resError);
      return res.status(500).json({ success: false, error: resError.message });
    }

    console.log('[Dashboard] 📊 Results found:', results?.length || 0);

    // ============================================================
    // STEP 3: GET ASSESSMENT DETAILS
    // ============================================================
    const assessmentIds = [...new Set((results || []).map(r => r.assessment_id).filter(Boolean))];
    let assessmentMap = {};
    
    if (assessmentIds.length > 0) {
      const { data: assessments, error: assmtError } = await supabase
        .from('assessments')
        .select('id, title, assessment_type_id')
        .in('id', assessmentIds);

      if (!assmtError && assessments) {
        assessments.forEach(a => { assessmentMap[a.id] = a; });
        console.log('[Dashboard] 📚 Assessments found:', assessments.length);
      }
    }

    // ============================================================
    // STEP 4: PROCESS RESULTS
    // ============================================================
    const candidateMap = {};
    allCandidates.forEach(c => { candidateMap[c.id] = c; });

    let totalCompleted = 0;
    let nationalServiceCount = 0;
    const allReports = [];

    (results || []).forEach(r => {
      const candidate = candidateMap[r.user_id];
      if (!candidate) return;

      const assessment = assessmentMap[r.assessment_id];
      const isNS = r.assessment_id === NS_ASSESSMENT_ID;
      
      let score = calculateScore(r);
      let workplace = 0;
      let intellectual = 0;
      
      if (isNS) {
        const nsScores = getNationalServiceScores(r);
        workplace = nsScores.workplaceReadiness || 0;
        intellectual = nsScores.intellectualCapability || 0;
        score = nsScores.overallScore || score;
      } else {
        workplace = safeNumber(r.workplace_readiness || 0);
        intellectual = safeNumber(r.intellectual_capability || 0);
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

    // ============================================================
    // STEP 5: BUILD CANDIDATE ROWS
    // ============================================================
    const candidateRows = allCandidates.map(c => {
      const candidateReports = allReports.filter(r => r.candidate_id === c.id);
      return {
        ...c,
        completedAssessments: candidateReports,
        stats: {
          completed: candidateReports.filter(r => r.completed_at).length,
          inProgress: 0,
          unblocked: 0,
          blocked: 0,
          notStarted: 0
        }
      };
    });

    // ============================================================
    // STEP 6: RETURN RESPONSE
    // ============================================================
    return res.status(200).json({
      success: true,
      stats: {
        totalCandidates: allCandidates.length,
        completedAssessments: totalCompleted,
        pendingReviews: 0,
        nationalServiceReports: nationalServiceCount
      },
      candidates: candidateRows,
      nationalServiceReports: nsReports,
      otherReports: otherReports,
      debug: {
        totalCandidates: allCandidates.length,
        totalResults: results?.length || 0,
        totalReports: allReports.length,
        nsReports: nsReports.length,
        otherReports: otherReports.length,
        supervisorId: supervisorId,
        source: 'legacy_supervisor_id'
      }
    });

  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
