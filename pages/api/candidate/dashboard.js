// pages/api/candidate/dashboard.js - COMPLETE WORKING VERSION

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

    // ============================================================
    // STEP 1: Get candidate profile
    // ============================================================
    const { data: profile } = await serviceClient
      .from('candidate_profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const candidateName = profile?.full_name || userData.user.user_metadata?.full_name || 'Candidate';

    // ============================================================
    // STEP 2: Get candidate assessments with assessment details
    // Use a single query with proper joins
    // ============================================================
    const { data: rawData, error: queryError } = await serviceClient
      .from('candidate_assessments')
      .select(`
        id,
        user_id,
        assessment_id,
        status,
        result_id,
        completed_at,
        unblocked_at,
        created_at,
        assessments:assessment_id (
          id,
          title,
          description,
          question_count,
          time_limit_minutes,
          attempts_allowed,
          assessment_type_id,
          assessment_types:assessment_type_id (
            id,
            code,
            name
          )
        )
      `)
      .eq('user_id', userId);

    if (queryError) {
      console.error('[API] Query error:', queryError);
      return res.status(500).json({
        success: false,
        error: 'Failed to load assessments',
        details: queryError.message
      });
    }

    console.log('[API] Raw data length:', rawData?.length || 0);

    if (!rawData || rawData.length === 0) {
      return res.status(200).json({
        success: true,
        candidateName,
        assessmentTypes: [],
        assessmentCards: [],
        stats: { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 }
      });
    }

    // ============================================================
    // STEP 3: Build assessment cards
    // ============================================================
    const cards = rawData.map((item) => {
      // Get the nested assessment data
      const assessment = item.assessments || {};
      const type = assessment.assessment_types || {};
      
      // Get the title - prefer assessment.title, fallback to type name
      let title = assessment.title || type.name || 'Assessment';
      
      // If title is still 'Assessment' but we have a type, use type name
      if (title === 'Assessment' && type.name) {
        title = type.name;
      }

      // Determine status
      let status = item.status || 'blocked';
      if (item.status === 'completed' || item.result_id) {
        status = 'completed';
      }

      return {
        id: item.assessment_id,
        title: title,
        fullTitle: assessment.title || type.name || 'Assessment',
        description: assessment.description || 'Complete this assessment to demonstrate your capabilities.',
        typeCode: type.code || 'general',
        typeName: type.name || 'General',
        status: status,
        questionCount: assessment.question_count || 100,
        timeLimitMinutes: assessment.time_limit_minutes || 180,
        attemptsAllowed: assessment.attempts_allowed || 1,
        isNationalService: type.code === 'national_service',
        completedAt: item.completed_at || null,
        unblockedAt: item.unblocked_at || null,
        resultId: item.result_id || null
      };
    });

    console.log('[API] Cards built:', cards.map(c => ({ title: c.title, status: c.status })));

    // ============================================================
    // STEP 4: Get assessment types for tabs
    // ============================================================
    const { data: allTypes } = await serviceClient
      .from('assessment_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

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
    // STEP 5: Calculate stats
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
