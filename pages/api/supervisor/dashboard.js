// pages/api/supervisor/dashboard.js - CORRECTED VERSION

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
    // Try multiple assignment methods
    // ============================================================
    let candidates = [];
    let assignmentMethod = 'none';

    // Method 1: Check supervisor_id
    const { data: candidatesBySupervisorId, error: error1 } = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id')
      .eq('supervisor_id', supervisorId);

    if (!error1 && candidatesBySupervisorId && candidatesBySupervisorId.length > 0) {
      candidates = candidatesBySupervisorId;
      assignmentMethod = 'supervisor_id';
      console.log('[Dashboard] Found candidates by supervisor_id:', candidates.length);
    }

    // Method 2: Check assigned_supervisor_id
    if (candidates.length === 0) {
      const { data: candidatesByAssignedId, error: error2 } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id')
        .eq('assigned_supervisor_id', supervisorId);

      if (!error2 && candidatesByAssignedId && candidatesByAssignedId.length > 0) {
        candidates = candidatesByAssignedId;
        assignmentMethod = 'assigned_supervisor_id';
        console.log('[Dashboard] Found candidates by assigned_supervisor_id:', candidates.length);
      }
    }

    // Method 3: Check both fields with OR
    if (candidates.length === 0) {
      const { data: candidatesByOr, error: error3 } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id')
        .or(`supervisor_id.eq.${supervisorId},assigned_supervisor_id.eq.${supervisorId}`);

      if (!error3 && candidatesByOr && candidatesByOr.length > 0) {
        candidates = candidatesByOr;
        assignmentMethod = 'or_both';
        console.log('[Dashboard] Found candidates by OR query:', candidates.length);
      }
    }

    // Method 4: Check supervisor_assignments table
    if (candidates.length === 0) {
      try {
        const { data: assignments, error: assignmentError } = await serviceClient
          .from('supervisor_assignments')
          .select('candidate_id')
          .eq('supervisor_id', supervisorId);

        if (!assignmentError && assignments && assignments.length > 0) {
          const candidateIds = assignments.map(a => a.candidate_id);
          const { data: candidatesFromAssignments, error: error4 } = await serviceClient
            .from('candidate_profiles')
            .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id')
            .in('id', candidateIds);

          if (!error4 && candidatesFromAssignments && candidatesFromAssignments.length > 0) {
            candidates = candidatesFromAssignments;
            assignmentMethod = 'supervisor_assignments';
            console.log('[Dashboard] Found candidates via supervisor_assignments:', candidates.length);
          }
        }
      } catch (e) {
        console.log('[Dashboard] supervisor_assignments table may not exist');
      }
    }

    // If still no candidates, return empty with debug info
    if (candidates.length === 0) {
      console.log('[Dashboard] No candidates found for supervisor:', supervisorId);
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
          assignmentMethod: 'none',
          supervisorId: supervisorId,
          message: 'No candidates found. Check assignment fields.'
        }
      });
    }

    const candidateIds = candidates.map(c => c.id);

    // ============================================================
    // STEP 2: Get candidate assessments
    // ============================================================
    const { data: assessments, error: assessmentsError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .in('user_id', candidateIds);

    if (assessmentsError) {
      console.error('[Dashboard] Assessments error:', assessmentsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to load assessments', 
        details: assessmentsError.message 
      });
    }

    console.log('[Dashboard] Assessments found:', assessments?.length || 0);

    // ============================================================
    // STEP 3: Get assessment details
    // ============================================================
    const assessmentIds = assessments.map(a => a.assessment_id).filter(Boolean);
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

        if (!simpleError) {
          simpleAssessments.forEach(a => {
            assessmentMap[a.id] = { ...a, assessment_type: null };
          });
        }
      } else {
        assessmentData.forEach(a => {
          assessmentMap[a.id] = a;
        });
      }
    }

    // ============================================================
    // STEP 4: Get results for completed assessments
    // ============================================================
    const resultIds = assessments.map(a => a.result_id).filter(Boolean);
    let resultMap = {};

    if (resultIds.length > 0) {
      const { data: resultsData, error: resultsError } = await serviceClient
        .from('assessment_results')
        .select('*')
        .in('id', resultIds);

      if (!resultsError) {
        resultsData.forEach(r => { resultMap[r.id] = r; });
        console.log('[Dashboard] Results found:', resultsData.length);
      }
    }

    // ============================================================
    // STEP 5: Build reports
    // ============================================================
    const reports = [];

    assessments.forEach(a => {
      const assessment = assessmentMap[a.assessment_id];
      if (!assessment) return;

      const type = assessment.assessment_type || {};
      const isNationalService = 
        type?.code === 'national_service' ||
        assessment?.title === 'National Service Recruitment Assessment' ||
        assessment?.id === NATIONAL_SERVICE_ASSESSMENT_ID;

      const result = a.result_id ? resultMap[a.result_id] : null;
      const isCompleted = a.status === 'completed' || a.result_id !== null;

      if (!isCompleted && !result) return;

      const candidate = candidates.find(c => c.id === a.user_id);

      let workplaceReadiness = Number(result?.workplace_readiness || 0);
      let intellectualCapability = Number(result?.intellectual_capability || 0);

      if (workplaceReadiness === 0 && intellectualCapability === 0 && result?.category_scores) {
        const calculated = calculateSubScores(result.category_scores);
        workplaceReadiness = calculated.workplaceReadiness;
        intellectualCapability = calculated.intellectualCapability;
      }

      let recommendation = result?.recommendation || 'Not Available';
      if (isNationalService && (recommendation === 'Not Available' || !recommendation || recommendation === 'N/A')) {
        const workplace = Number(workplaceReadiness || 0);
        const intellectual = Number(intellectualCapability || 0);
        if (workplace >= 85 && intellectual >= 85) recommendation = 'Highly Recommended';
        else if (workplace >= 75 && intellectual >= 75) recommendation = 'Recommended';
        else if (workplace >= 65 && intellectual >= 65) recommendation = 'Reserve Pool';
        else recommendation = 'Not Recommended';
      }

      reports.push({
        result_id: a.result_id,
        candidate_id: a.user_id,
        candidate_name: candidate?.full_name || 'Unknown',
        candidate_email: candidate?.email || '',
        university: candidate?.university || '',
        programme: candidate?.programme || '',
        assessment_id: a.assessment_id,
        assessment_title: assessment.title || 'Assessment',
        assessment_code: type?.code || 'general',
        status: a.status,
        completed_at: a.completed_at,
        score: result?.percentage_score || 0,
        is_national_service: isNationalService,
        workplace_readiness: workplaceReadiness,
        intellectual_capability: intellectualCapability,
        recommendation: recommendation,
        percentage_score: result?.percentage_score || 0,
        resultData: result || null
      });
    });

    // ============================================================
    // STEP 6: Split reports
    // ============================================================
    const nationalServiceReports = reports.filter(r => r.is_national_service === true);
    const otherReports = reports.filter(r => r.is_national_service === false);

    console.log('[Dashboard] National Service reports:', nationalServiceReports.length);
    console.log('[Dashboard] Other reports:', otherReports.length);

    // ============================================================
    // STEP 7: Build candidate objects
    // ============================================================
    const candidatesWithStats = candidates.map(c => {
      const candidateAssessments = assessments.filter(a => a.user_id === c.id);
      const completed = candidateAssessments.filter(a => a.status === 'completed' || a.result_id !== null).length;
      const inProgress = candidateAssessments.filter(a => a.status === 'in_progress').length;
      const notStarted = candidateAssessments.filter(a => !a.status || a.status === 'pending' || a.status === '').length;

      const completedAssessments = candidateAssessments
        .filter(a => a.status === 'completed' || a.result_id !== null)
        .map(a => {
          const assessment = assessmentMap[a.assessment_id];
          const type = assessment?.assessment_type || {};
          const result = a.result_id ? resultMap[a.result_id] : null;
          
          const isNS = type?.code === 'national_service' || assessment?.title === 'National Service Recruitment Assessment';
          
          let workplace = Number(result?.workplace_readiness || 0);
          let intellectual = Number(result?.intellectual_capability || 0);
          
          if (workplace === 0 && intellectual === 0 && result?.category_scores) {
            const calculated = calculateSubScores(result.category_scores);
            workplace = calculated.workplaceReadiness;
            intellectual = calculated.intellectualCapability;
          }
          
          return {
            assessment_id: a.assessment_id,
            result_id: a.result_id,
            title: assessment?.title || 'Assessment',
            score: result?.percentage_score || 0,
            isNationalService: isNS,
            assessment_code: type?.code || 'general',
            workplace_readiness: workplace,
            intellectual_capability: intellectual
          };
        })
        .filter(item => item.result_id);

      return {
        ...c,
        assessments: candidateAssessments,
        stats: { 
          completed, 
          inProgress, 
          unblocked: 0, 
          blocked: 0, 
          notStarted, 
          total: candidateAssessments.length 
        },
        completedAssessments
      };
    });

    const stats = {
      totalCandidates: candidates.length,
      completedAssessments: assessments.filter(a => a.status === 'completed' || a.result_id !== null).length,
      pendingReviews: assessments.filter(a => a.status === 'in_progress').length,
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
        candidateAssessments: assessments.length,
        resultRows: resultIds.length,
        totalReports: reports.length,
        nsReports: nationalServiceReports.length,
        otherReports: otherReports.length,
        assignmentMethod: assignmentMethod,
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
