// pages/api/candidate/dashboard.js - COMPLETE FIXED VERSION

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[API] Missing env vars');
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
    console.log('[API] User ID:', userId);

    // ============================================================
    // STEP 1: Get candidate profile
    // ============================================================
    const { data: profile, error: profileError } = await serviceClient
      .from('candidate_profiles')
      .select('full_name, email, university, programme')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[API] Profile error:', profileError);
    }

    const candidateName = profile?.full_name || userData.user.user_metadata?.full_name || 'Candidate';
    console.log('[API] Candidate name:', candidateName);

    // ============================================================
    // STEP 2: Get ALL candidate assessments
    // ============================================================
    const { data: candidateAssessments, error: caError } = await serviceClient
      .from('candidate_assessments')
      .select('*')
      .eq('user_id', userId);

    if (caError) {
      console.error('[API] Candidate assessments error:', caError);
      return res.status(500).json({
        success: false,
        error: 'Failed to load assessments',
        details: caError.message
      });
    }

    console.log('[API] Found candidate assessments:', candidateAssessments?.length || 0);

    if (!candidateAssessments || candidateAssessments.length === 0) {
      return res.status(200).json({
        success: true,
        candidateName,
        assessmentTypes: [],
        assessmentCards: [],
        stats: { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 }
      });
    }

    // ============================================================
    // STEP 3: Get ALL assessments with their details
    // ============================================================
    const assessmentIds = candidateAssessments.map(ca => ca.assessment_id).filter(Boolean);
    let assessmentMap = {};
    let typeMap = {};

    if (assessmentIds.length > 0) {
      // Get assessments
      const { data: assessments, error: aError } = await serviceClient
        .from('assessments')
        .select('id, title, description, assessment_type_id, question_count, time_limit_minutes, attempts_allowed')
        .in('id', assessmentIds);

      if (!aError && assessments) {
        assessments.forEach(a => {
          assessmentMap[a.id] = a;
        });
        console.log('[API] Found assessments:', Object.keys(assessmentMap).length);
        
        // Get assessment types
        const typeIds = assessments.map(a => a.assessment_type_id).filter(Boolean);
        if (typeIds.length > 0) {
          const { data: types, error: tError } = await serviceClient
            .from('assessment_types')
            .select('id, code, name, category_config')
            .in('id', typeIds);

          if (!tError && types) {
            types.forEach(t => {
              typeMap[t.id] = t;
            });
            console.log('[API] Found types:', Object.keys(typeMap).length);
          }
        }
      }
    }

    // ============================================================
    // STEP 4: Build assessment cards with proper titles
    // ============================================================
    const cards = candidateAssessments.map(ca => {
      const assessment = assessmentMap[ca.assessment_id] || {};
      const type = typeMap[assessment.assessment_type_id] || {};
      const typeCode = type.code || 'general';

      let status = ca.status || 'blocked';
      if (ca.status === 'completed' || ca.result_id) {
        status = 'completed';
      }

      // Get the actual title - use assessment.title
      let title = assessment.title || 'Assessment';
      
      // If title is still generic but we have a type name, use that
      if (title === 'Assessment' && type.name) {
        title = type.name;
      }

      return {
        id: ca.assessment_id,
        title: title,
        description: assessment.description || 'Complete this assessment to demonstrate your capabilities.',
        typeCode: typeCode,
        typeName: type.name || 'General',
        status: status,
        questionCount: assessment.question_count || 100,
        timeLimitMinutes: assessment.time_limit_minutes || 180,
        attemptsAllowed: assessment.attempts_allowed || 1,
        isNationalService: typeCode === 'national_service',
        completedAt: ca.completed_at || null,
        unblockedAt: ca.unblocked_at || null,
        resultId: ca.result_id || null
      };
    });

    console.log('[API] Cards with titles:', cards.map(c => ({ id: c.id, title: c.title, status: c.status })));

    // ============================================================
    // STEP 5: Get all assessment types for tabs
    // ============================================================
    const { data: allTypes, error: allTypesError } = await serviceClient
      .from('assessment_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (allTypesError) {
      console.error('[API] All types error:', allTypesError);
    }

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

    const processedTypes = (allTypes || [])
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
    // STEP 6: Calculate stats
    // ============================================================
    const stats = {
      total: cards.length,
      completed: cards.filter(c => c.status === 'completed').length,
      ready: cards.filter(c => c.status === 'unblocked').length,
      inProgress: cards.filter(c => c.status === 'in_progress').length,
      blocked: cards.filter(c => c.status === 'blocked').length
    };

    console.log('[API] Stats:', stats);

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
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
