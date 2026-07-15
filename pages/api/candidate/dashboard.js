// pages/api/candidate/dashboard.js - UPDATED with full data

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

    const candidateName = profile?.full_name || 'Candidate';

    // ============================================================
    // STEP 2: Get assessment types
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
    // STEP 3: Get candidate assessments with assessment details
    // ============================================================
    const { data: assessments, error: assessmentsError } = await serviceClient
      .from('candidate_assessments')
      .select(`
        id,
        user_id,
        assessment_id,
        status,
        result_id,
        completed_at,
        started_at,
        unblocked_at,
        created_at,
        session_id,
        assessments:assessment_id (
          id,
          title,
          description,
          assessment_type_id,
          question_count,
          time_limit_minutes,
          attempts_allowed,
          assessment_types:assessment_type_id (
            id,
            code,
            name,
            category_config,
            display_order
          )
        )
      `)
      .eq('user_id', userId);

    if (assessmentsError) {
      console.error('Assessments error:', assessmentsError);
    }

    // ============================================================
    // STEP 4: Get assessment results
    // ============================================================
    const { data: results, error: resultsError } = await serviceClient
      .from('assessment_results')
      .select('id, assessment_id, total_score, max_score, percentage_score, completed_at')
      .eq('user_id', userId);

    if (resultsError) {
      console.error('Results error:', resultsError);
    }

    // ============================================================
    // STEP 5: Get sessions
    // ============================================================
    const { data: sessions, error: sessionsError } = await serviceClient
      .from('assessment_sessions')
      .select('id, assessment_id, status, time_spent_seconds, updated_at')
      .eq('user_id', userId);

    if (sessionsError) {
      console.error('Sessions error:', sessionsError);
    }

    // ============================================================
    // STEP 6: Build data structures
    // ============================================================
    const resultMap = {};
    (results || []).forEach(r => {
      resultMap[r.assessment_id] = r;
    });

    const sessionMap = {};
    (sessions || []).forEach(s => {
      const existing = sessionMap[s.assessment_id];
      if (!existing || new Date(s.updated_at || 0).getTime() > new Date(existing.updated_at || 0).getTime()) {
        sessionMap[s.assessment_id] = s;
      }
    });

    const accessMap = {};
    (assessments || []).forEach(a => {
      accessMap[a.assessment_id] = a;
    });

    // Process assessment types
    const processedTypes = (assessmentTypes || [])
      .filter(type => type.code !== 'manufacturing')
      .map(type => {
        let areas = [];
        if (Array.isArray(type.category_config) && type.category_config.length > 0) {
          areas = type.category_config;
        } else {
          // Get default areas based on code
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
          areas = defaultAreas[type.code] || ["General Assessment"];
        }
        return {
          id: type.code,
          label: type.name,
          shortLabel: type.code === 'manufacturing_baseline' ? 'Mfg Baseline' : type.name,
          description: type.description || `${type.name} assessment`,
          areas: areas,
          display_order: type.display_order || 0
        };
      });

    // Process assessment cards
    const cards = (assessments || []).map(a => {
      const assessment = a.assessments || {};
      const assessmentType = assessment.assessment_types || {};
      const typeCode = assessmentType.code || 'general';
      const result = resultMap[a.assessment_id] || null;
      const session = sessionMap[a.assessment_id] || null;
      const access = accessMap[a.assessment_id] || null;

      let status = 'blocked';
      if (a.status === 'completed' || a.result_id || result) {
        status = 'completed';
      } else if (a.status === 'unblocked') {
        status = 'unblocked';
      } else if (session && session.status === 'in_progress' && a.status !== 'blocked') {
        status = 'in_progress';
      } else if (a.status === 'blocked') {
        status = 'blocked';
      }

      const scorePercentage = result ? Math.round(result.percentage_score || 0) : null;

      return {
        id: a.assessment_id,
        title: assessment.title || 'Assessment',
        description: assessment.description || 'Assessment assigned by your supervisor.',
        typeCode: typeCode,
        typeName: assessmentType.name || typeCode,
        status: status,
        scorePercentage: scorePercentage,
        completedAt: a.completed_at || result?.completed_at || null,
        unblockedAt: a.unblocked_at || null,
        result: result,
        session: session,
        access: access,
        questionCount: assessment.question_count || assessmentType.question_count || 100,
        timeLimitMinutes: assessment.time_limit_minutes || assessmentType.time_limit_minutes || 180,
        attemptsAllowed: assessment.attempts_allowed || assessmentType.attempts_allowed || 1
      };
    });

    // Calculate stats
    const stats = {
      total: cards.length,
      completed: cards.filter(c => c.status === 'completed').length,
      ready: cards.filter(c => c.status === 'unblocked').length,
      inProgress: cards.filter(c => c.status === 'in_progress').length
    };

    return res.status(200).json({
      success: true,
      candidateName,
      assessmentTypes: processedTypes,
      assessmentCards: cards,
      stats
    });

  } catch (error) {
    console.error('Candidate dashboard API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
