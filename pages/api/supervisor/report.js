// pages/api/supervisor/reports.js - COMPLETE FIXED VERSION

import { createClient } from "@supabase/supabase-js";

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Get the authenticated user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const supervisorId = userData.user.id;
    const supervisorEmail = userData.user.email;
    
    console.log('[Supervisor Reports] Supervisor ID:', supervisorId);
    console.log('[Supervisor Reports] Supervisor Email:', supervisorEmail);

    // ============================================================
    // METHOD 1: Check candidate_profiles for supervisor assignments
    // ============================================================
    let assignedCandidates = [];

    // Try multiple assignment fields
    const { data: candidatesByField, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email, created_at')
      .or(`supervisor_id.eq.${supervisorId},assigned_supervisor_id.eq.${supervisorId},supervisor_email.eq.${supervisorEmail}`);

    if (!candidateError && candidatesByField && candidatesByField.length > 0) {
      assignedCandidates = candidatesByField;
      console.log('[Supervisor Reports] Found candidates via profile fields:', assignedCandidates.length);
    }

    // ============================================================
    // METHOD 2: Check supervisor_assignments table if exists
    // ============================================================
    if (assignedCandidates.length === 0) {
      try {
        const { data: assignments, error: assignmentError } = await supabase
          .from('supervisor_assignments')
          .select('candidate_id')
          .eq('supervisor_id', supervisorId);

        if (!assignmentError && assignments && assignments.length > 0) {
          const candidateIds = assignments.map(a => a.candidate_id);
          
          const { data: candidatesFromAssignments, error: candidatesError } = await supabase
            .from('candidate_profiles')
            .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email, created_at')
            .in('id', candidateIds);

          if (!candidatesError && candidatesFromAssignments) {
            assignedCandidates = candidatesFromAssignments;
            console.log('[Supervisor Reports] Found candidates via supervisor_assignments:', assignedCandidates.length);
          }
        }
      } catch (assignmentTableError) {
        console.log('[Supervisor Reports] supervisor_assignments table may not exist:', assignmentTableError.message);
      }
    }

    // ============================================================
    // METHOD 3: If still no candidates, check by email domain or role
    // ============================================================
    if (assignedCandidates.length === 0) {
      // Try to find candidates where supervisor_email matches
      const { data: candidatesByEmail, error: emailError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email, created_at')
        .eq('supervisor_email', supervisorEmail);

      if (!emailError && candidatesByEmail && candidatesByEmail.length > 0) {
        assignedCandidates = candidatesByEmail;
        console.log('[Supervisor Reports] Found candidates via supervisor_email:', assignedCandidates.length);
      }
    }

    const candidateIds = assignedCandidates.map(c => c.id);

    console.log('[Supervisor Reports] Total assigned candidates:', candidateIds.length);

    if (candidateIds.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        candidates: [],
        stats: { total: 0, completed: 0, inProgress: 0, nationalService: 0, stratavax: 0 },
        message: 'No candidates assigned to this supervisor'
      });
    }

    // ============================================================
    // Get all assessment results for these candidates
    // ============================================================
    const { data: reports, error: reportsError } = await supabase
      .from('assessment_results')
      .select(`
        id,
        user_id,
        assessment_id,
        session_id,
        percentage_score,
        workplace_readiness,
        intellectual_capability,
        total_score,
        max_score,
        category_scores,
        report_data,
        completed_at,
        created_at,
        is_valid,
        is_auto_submitted,
        violation_count,
        assessments:assessment_id (
          id,
          title,
          assessment_type_id,
          assessment_types:assessment_type_id (
            id,
            code,
            name
          )
        )
      `)
      .in('user_id', candidateIds)
      .order('completed_at', { ascending: false });

    if (reportsError) {
      console.error('[Supervisor Reports] Reports query error:', reportsError);
      return res.status(500).json({ success: false, error: reportsError.message });
    }

    console.log('[Supervisor Reports] Reports found:', reports?.length || 0);

    // ============================================================
    // Calculate corrected scores for National Service reports
    // ============================================================
    const processedReports = (reports || []).map(report => {
      const assessment = report.assessments || {};
      const assessmentType = assessment.assessment_types || {};
      
      const isNationalService = 
        assessmentType?.code === 'national_service' ||
        assessment?.title === 'National Service Recruitment Assessment';

      let displayScore = safeNumber(report.percentage_score || 0);
      let calculatedWorkplace = safeNumber(report.workplace_readiness || 0);
      let calculatedIntellectual = safeNumber(report.intellectual_capability || 0);

      if (isNationalService) {
        // Calculate from category_scores if available
        const categoryScores = safeArray(report.category_scores || report.report_data?.categoryScores || []);
        
        if (categoryScores.length > 0) {
          const workplaceCategories = [
            'Communication & Teamwork',
            'Ownership & Integrity',
            'Technical Fundamentals',
            'Safety & Risk Awareness'
          ];
          
          const intellectualCategories = [
            'Learning Agility',
            'Problem Solving & Troubleshooting',
            'Logical Reasoning',
            'Numerical Reasoning',
            'Measurement & Engineering Units'
          ];

          let workplaceTotal = 0;
          let workplaceCount = 0;
          let intellectualTotal = 0;
          let intellectualCount = 0;

          categoryScores.forEach(cat => {
            const name = cat.category || cat.name || '';
            const percentage = safeNumber(cat.percentage || cat.score || 0);
            
            if (workplaceCategories.some(c => name.includes(c) || name.toLowerCase().includes(c.toLowerCase()))) {
              workplaceTotal += percentage;
              workplaceCount++;
            } else if (intellectualCategories.some(c => name.includes(c) || name.toLowerCase().includes(c.toLowerCase()))) {
              intellectualTotal += percentage;
              intellectualCount++;
            }
          });

          calculatedWorkplace = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
          calculatedIntellectual = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;
          
          displayScore = (calculatedWorkplace > 0 || calculatedIntellectual > 0) 
            ? Math.round((calculatedWorkplace + calculatedIntellectual) / 2)
            : safeNumber(report.percentage_score || 0);
        }
      }

      // Find the candidate info
      const candidate = assignedCandidates.find(c => c.id === report.user_id) || {};

      return {
        ...report,
        displayScore: displayScore,
        calculatedWorkplace: calculatedWorkplace,
        calculatedIntellectual: calculatedIntellectual,
        isNationalService: isNationalService,
        candidate_name: candidate.full_name || 'Unknown',
        candidate_email: candidate.email || '',
        candidate_university: candidate.university || '',
        candidate_programme: candidate.programme || '',
        assessment_title: assessment?.title || 'Unknown',
        is_completed: !!report.completed_at,
        is_auto_submitted: report.is_auto_submitted || false
      };
    });

    // ============================================================
    // Calculate stats
    // ============================================================
    const total = processedReports.length;
    const completed = processedReports.filter(r => r.is_completed).length;
    const inProgress = processedReports.filter(r => !r.is_completed && r.is_valid !== false).length;
    const nationalService = processedReports.filter(r => r.isNationalService).length;
    const stratavax = processedReports.filter(r => !r.isNationalService).length;

    return res.status(200).json({
      success: true,
      reports: processedReports,
      candidates: assignedCandidates.map(c => ({
        ...c,
        reportCount: processedReports.filter(r => r.user_id === c.id).length,
        completedCount: processedReports.filter(r => r.user_id === c.id && r.is_completed).length
      })),
      stats: {
        total,
        completed,
        inProgress,
        nationalService,
        stratavax,
        candidates: assignedCandidates.length
      }
    });

  } catch (error) {
    console.error('[Supervisor Reports] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch supervisor reports'
    });
  }
}
