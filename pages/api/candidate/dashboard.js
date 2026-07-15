// pages/api/candidate/dashboard.js - SHOW ALL ASSESSMENTS

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;

    // ============================================================
    // STEP 1: Get candidate profile
    // ============================================================
    const { data: profile, error: profileError } = await serviceClient
      .from('candidate_profiles')
      .select('full_name, email, university, programme')
      .eq('id', userId)
      .maybeSingle();

    const candidateName = profile?.full_name || userData.user.user_metadata?.full_name || 'Candidate';

    // ============================================================
    // STEP 2: Get ALL active assessment types
    // ============================================================
    const { data: assessmentTypes, error: typesError } = await serviceClient
      .from('assessment_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (typesError) {
      console.error('Types error:', typesError);
    }

    // ============================================================
    // STEP 3: Get ALL active assessments
    // ============================================================
    const { data: allAssessments, error: assessmentsError } = await serviceClient
      .from('assessments')
      .select(`
        id,
        title,
        description,
        assessment_type_id,
        question_count,
        time_limit_minutes,
        attempts_allowed,
        is_active
      `)
      .eq('is_active', true);

    if (assessmentsError) {
      console.error('Assessments error:', assessmentsError);
    }

    // ============================================================
    // STEP 4: Get candidate's existing assessments (to check status)
    // ============================================================
    const { data: candidateAssessments, error: caError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .eq('user_id', userId);

    if (caError) {
      console.error('Candidate assessments error:', caError);
    }

    // Build a map of existing assessments
    const existingMap = {};
    (candidateAssessments || []).forEach(ca => {
      existingMap[ca.assessment_id] = ca;
    });

    // ============================================================
    // STEP 5: Build assessment cards - SHOW ALL ASSESSMENTS
    // ============================================================
    const cards = (allAssessments || []).map(assessment => {
      const existing = existingMap[assessment.id] || null;
      const type = (assessmentTypes || []).find(t => t.id === assessment.assessment_type_id);
      const typeCode = type?.code || 'general';
      
      // Determine status:
      // - If already completed: 'completed'
      // - If in progress: 'in_progress'  
      // - If National Service: 'unblocked' (always ready)
      // - Otherwise: 'blocked' (needs supervisor to unblock)
      let status = 'blocked';
      if (existing?.status === 'completed' || existing?.result_id) {
        status = 'completed';
      } else if (existing?.status === 'in_progress') {
        status = 'in_progress';
      } else if (typeCode === 'national_service') {
        status = 'unblocked'; // National Service is always unblocked
      } else if (existing?.status === 'unblocked') {
        status = 'unblocked'; // Supervisor has unblocked it
      }

      return {
        id: assessment.id,
        title: assessment.title || 'Assessment',
        description: assessment.description || '',
        typeCode: typeCode,
        typeName: type?.name || 'General',
        status: status,
        questionCount: assessment.question_count || 100,
        timeLimitMinutes: assessment.time_limit_minutes || 180,
        attemptsAllowed: assessment.attempts_allowed || 1,
        isNationalService: typeCode === 'national_service',
        existing: existing,
        completedAt: existing?.completed_at || null,
        unblockedAt: existing?.unblocked_at || null
      };
    });

    // ============================================================
    // STEP 6: Build assessment types list
    // ============================================================
    const defaultAreas = {
      general: ["Cognitive Ability", "Communication", "Cultural & Attitudinal Fit", "Emotional Intelligence", "Ethics & Integrity", "Leadership & Management", "Performance Metrics", "Personality & Behavioral", "Problem-Solving", "Technical & Manufacturing"],
      leadership: ["Change Leadership & Agility", "Communication & Influence", "Cultural Alignment", "Decision-Making & Problem-Solving", "Execution & Results Orientation", "People Management & Coaching", "Resilience & Stress Management", "Role Readiness", "Vision & Strategic Thinking"],
      cognitive: ["Logical / Abstract Reasoning", "Mechanical Reasoning", "Memory & Attention", "Numerical Reasoning", "Perceptual Speed & Accuracy", "Spatial Reasoning", "Verbal Reasoning"],
      technical: ["CIP & Maintenance", "Conveyors & Line Efficiency", "Filling & Bottling", "Packaging & Labeling", "Safety & Efficiency", "Water Treatment & Quality"],
      performance: ["Employee Engagement and Behavior", "Financial and Operational Performance", "Goal Achievement and Strategic Alignment", "Productivity and Efficiency", "Work Quality and Effectiveness"],
      cultural: ["Attitude", "Core Values", "Environmental Fit", "Interpersonal", "Leadership", "Work Style"],
      personality: ["Ownership", "Collaboration", "Action", "Analysis", "Risk Tolerance", "Structure"],
      strategic_leadership: ["Vision / Strategy", "People Leadership", "Decision Making", "Accountability", "Emotional Intelligence", "Execution Drive", "Ethics"],
      behavioral: ["Adaptability", "Clinical", "Collaboration", "Communication Style", "Decision-Making", "FBA", "Leadership"],
      manufacturing_baseline: ["Technical Fundamentals", "Troubleshooting", "Numerical Aptitude", "Safety & Work Ethic"],
      national_service: ["Workplace Readiness", "Intellectual Capability", "Safety & Risk Awareness", "Problem Solving", "Technical Fundamentals", "Communication", "Teamwork", "Professional Conduct"]
    };

    const processedTypes = (assessmentTypes || [])
      .filter(t => t.code !== 'manufacturing')
      .map(t => {
        let areas = [];
        if (Array.isArray(t.category_config) && t.category_config.length > 0) {
          areas = t.category_config;
        } else {
          areas = defaultAreas[t.code] || ["General Assessment"];
        }
        return {
          id: t.code,
          label: t.name,
          shortLabel: t.code === 'manufacturing_baseline' ? 'Mfg Baseline' : t.name,
          description: t.description || `${t.name} assessment`,
          areas: areas,
          display_order: t.display_order || 0
        };
      });

    // ============================================================
    // STEP 7: Calculate stats
    // ============================================================
    const stats = {
      total: cards.length,
      completed: cards.filter(c => c.status === 'completed').length,
      ready: cards.filter(c => c.status === 'unblocked').length,
      inProgress: cards.filter(c => c.status === 'in_progress').length,
      blocked: cards.filter(c => c.status === 'blocked').length
    };

    return res.status(200).json({
      success: true,
      candidateName,
      assessmentTypes: processedTypes,
      assessmentCards: cards,
      stats
    });

  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
