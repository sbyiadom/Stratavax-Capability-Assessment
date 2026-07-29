// pages/api/supervisor/dashboard.js - FIXED RECOMMENDATION CALCULATION

import { createClient } from '@supabase/supabase-js';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function calculateSubScores(categoryScores) {
  let workplaceTotal = 0;
  let workplaceCount = 0;
  let intellectualTotal = 0;
  let intellectualCount = 0;

  const workplaceCategories = [
    'Safety & Risk Awareness', 'Technical Fundamentals', 
    'Communication & Teamwork', 'Ownership & Integrity', 
    'Professional Conduct', 'Work Ethic'
  ];
  
  const intellectualCategories = [
    'Problem Solving & Troubleshooting', 'Logical Reasoning', 
    'Numerical Reasoning', 'Measurement & Engineering Units', 
    'Learning Agility', 'Cognitive Ability', 'Analytical Thinking'
  ];

  if (!categoryScores || !Array.isArray(categoryScores)) {
    return { workplaceReadiness: 0, intellectualCapability: 0 };
  }

  categoryScores.forEach(cat => {
    const name = (cat.category || cat.name || '').toLowerCase();
    const percentage = Number(cat.percentage || cat.score || 0);
    
    const isWorkplace = workplaceCategories.some(keyword => 
      name.includes(keyword.toLowerCase())
    );
    const isIntellectual = intellectualCategories.some(keyword => 
      name.includes(keyword.toLowerCase())
    );

    if (isWorkplace) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectual) {
      intellectualTotal += percentage;
      intellectualCount++;
    }
  });

  return {
    workplaceReadiness: workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0,
    intellectualCapability: intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0
  };
}

// ============================================================
// NEW: Calculate recommendation from scores
// ============================================================
function calculateRecommendation(workplaceReadiness, intellectualCapability, overallScore) {
  const workplace = Number(workplaceReadiness || 0);
  const intellectual = Number(intellectualCapability || 0);
  const overall = Number(overallScore || 0);
  
  // If overall score is available, use it
  if (overall > 0) {
    if (overall >= 85) return 'Highly Recommended';
    if (overall >= 75) return 'Recommended';
    if (overall >= 65) return 'Reserve Pool';
    if (overall >= 50) return 'Consider for Development';
    return 'Not Recommended';
  }
  
  // Otherwise use workplace and intellectual scores
  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  if (workplace >= 50 || intellectual >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Missing token" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: "Missing env vars" });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token", details: userError?.message });
    }

    const user = userData.user;
    const supervisorId = user.id;

    console.log('[Dashboard] Supervisor ID:', supervisorId);

    // ============================================================
    // STEP 1: Get candidates assigned to this supervisor
    // ============================================================
    const { data: candidates, error: candidatesError } = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id')
      .eq('supervisor_id', supervisorId);

    if (candidatesError) {
      console.error('[Dashboard] Candidates error:', candidatesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to load candidates', 
        details: candidatesError.message 
      });
    }

    console.log('[Dashboard] Candidates found:', candidates?.length || 0);

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({
        success: true,
        supervisor: { id: user.id, email: user.email },
        stats: { totalCandidates: 0, completedAssessments: 0, nationalServiceReports: 0, pendingReviews: 0 },
        candidates: [],
        nationalServiceReports: [],
        otherReports: [],
        debug: {
          assignedCandidates: 0,
          candidateAssessments: 0,
          resultRows: 0,
          supervisorId: supervisorId
        }
      });
    }

    const candidateIds = candidates.map(c => c.id);

    // ============================================================
    // STEP 2: Get ALL assessment results for these candidates
    // ============================================================
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('*')
      .in('user_id', candidateIds);

    if (resultsError) {
      console.error('[Dashboard] Results error:', resultsError);
    }

    console.log('[Dashboard] Results found:', results?.length || 0);

    // ============================================================
    // STEP 3: Get candidate assessments (for status tracking)
    // ============================================================
    const { data: assessments, error: assessmentsError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .in('user_id', candidateIds);

    if (assessmentsError) {
      console.error('[Dashboard] Assessments error:', assessmentsError);
    }

    console.log('[Dashboard] Assessments found:', assessments?.length || 0);

    // ============================================================
    // STEP 4: Get assessment details
    // ============================================================
    const assessmentIds = assessments ? assessments.map(a => a.assessment_id).filter(Boolean) : [];
    let assessmentMap = {};

    if (assessmentIds.length > 0) {
      const { data: assessmentData, error: assessmentError } = await serviceClient
        .from('assessments')
        .select(`
          id, 
          title, 
          assessment_type_id,
          assessment_types:assessment_type_id (id, code, name)
        `)
        .in('id', assessmentIds);

      if (assessmentError) {
        console.error('[Dashboard] Assessment details error:', assessmentError);
        const { data: simpleAssessments, error: simpleError } = await serviceClient
          .from('assessments')
          .select('id, title, assessment_type_id')
          .in('id', assessmentIds);

        if (!simpleError && simpleAssessments) {
          simpleAssessments.forEach(a => {
            assessmentMap[a.id] = { ...a, assessment_type: null };
          });
        }
      } else if (assessmentData) {
        assessmentData.forEach(a => {
          assessmentMap[a.id] = a;
        });
      }
    }

    // ============================================================
    // STEP 5: Build candidates with correct counts and recommendations
    // ============================================================
    const candidatesWithStats = candidates.map(c => {
      // Get results for this candidate
      const candidateResults = results ? results.filter(r => r.user_id === c.id) : [];
      const completedResults = candidateResults.filter(r => r.completed_at !== null && r.is_valid !== false);
      
      // Get assessments for this candidate
      const candidateAssessments = assessments ? assessments.filter(a => a.user_id === c.id) : [];
      const inProgressAssessments = candidateAssessments.filter(a => a.status === 'in_progress' && !a.result_id);

      // Build completed assessments list with scores
      const completedAssessments = completedResults.map(r => {
        // Find the assessment details
        const assessment = assessmentMap[r.assessment_id] || {};
        const type = assessment.assessment_type || {};
        const isNationalService = 
          type?.code === 'national_service' ||
          assessment?.title === 'National Service Recruitment Assessment' ||
          assessment?.id === NATIONAL_SERVICE_ASSESSMENT_ID;

        let workplace = Number(r.workplace_readiness || 0);
        let intellectual = Number(r.intellectual_capability || 0);

        if (workplace === 0 && intellectual === 0 && r.category_scores) {
          const calculated = calculateSubScores(r.category_scores);
          workplace = calculated.workplaceReadiness;
          intellectual = calculated.intellectualCapability;
        }

        // ============================================================
        // Calculate recommendation from scores
        // ============================================================
        const overallScore = Number(r.percentage_score || 0);
        const recommendation = calculateRecommendation(workplace, intellectual, overallScore);

        return {
          assessment_id: r.assessment_id,
          result_id: r.id,
          title: assessment.title || 'Assessment',
          score: overallScore,
          isNationalService: isNationalService,
          assessment_code: type?.code || 'general',
          workplace_readiness: workplace,
          intellectual_capability: intellectual,
          completed_at: r.completed_at,
          recommendation: recommendation  // ✅ Now calculated from scores
        };
      });

      return {
        ...c,
        stats: {
          completed: completedResults.length,
          inProgress: inProgressAssessments.length,
          totalAssessments: candidateResults.length + inProgressAssessments.length
        },
        completedAssessments: completedAssessments
      };
    });

    // ============================================================
    // STEP 6: Build reports for National Service and Other tabs
    // ============================================================
    const allReports = [];

    candidatesWithStats.forEach(candidate => {
      candidate.completedAssessments.forEach(assessment => {
        allReports.push({
          result_id: assessment.result_id,
          candidate_id: candidate.id,
          candidate_name: candidate.full_name || 'Unknown',
          candidate_email: candidate.email || '',
          university: candidate.university || '',
          programme: candidate.programme || '',
          assessment_id: assessment.assessment_id,
          assessment_title: assessment.title || 'Assessment',
          assessment_code: assessment.assessment_code || 'general',
          score: assessment.score || 0,
          is_national_service: assessment.isNationalService || false,
          workplace_readiness: assessment.workplace_readiness || 0,
          intellectual_capability: assessment.intellectual_capability || 0,
          recommendation: assessment.recommendation || 'Not Available',  // ✅ Now has value
          status: 'completed',
          completed_at: assessment.completed_at
        });
      });
    });

    const nationalServiceReports = allReports.filter(r => r.is_national_service === true);
    const otherReports = allReports.filter(r => r.is_national_service === false);

    console.log('[Dashboard] National Service reports:', nationalServiceReports.length);
    console.log('[Dashboard] Other reports:', otherReports.length);

    // Sample log to verify recommendations
    if (nationalServiceReports.length > 0) {
      console.log('[Dashboard] Sample recommendation:', {
        name: nationalServiceReports[0].candidate_name,
        workplace: nationalServiceReports[0].workplace_readiness,
        intellectual: nationalServiceReports[0].intellectual_capability,
        overall: nationalServiceReports[0].score,
        recommendation: nationalServiceReports[0].recommendation
      });
    }

    const stats = {
      totalCandidates: candidates.length,
      completedAssessments: allReports.length,
      pendingReviews: allReports.filter(r => r.status === 'completed').length,
      nationalServiceReports: nationalServiceReports.length
    };

    return res.status(200).json({
      success: true,
      supervisor: { id: user.id, email: user.email },
      stats,
      candidates: candidatesWithStats,
      nationalServiceReports,
      otherReports,
      debug: {
        assignedCandidates: candidates.length,
        candidateAssessments: assessments ? assessments.length : 0,
        resultRows: results ? results.length : 0,
        totalReports: allReports.length,
        nsReports: nationalServiceReports.length,
        otherReports: otherReports.length,
        supervisorId: supervisorId
      }
    });

  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal error'
    });
  }
}
