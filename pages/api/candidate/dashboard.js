// pages/api/candidate/dashboard.js - FORCED CORRECT VALUES FOR NATIONAL SERVICE

import { createClient } from '@supabase/supabase-js';

// Hardcoded assessment titles as fallback (matching your database)
const ASSESSMENT_TITLES = {
  '17003efb-923f-49a5-bdeb-e4996c864a87': 'General Assessment',
  'd09953bf-59cd-40ed-a9bb-308c3b5cfb7d': 'Leadership Assessment',
  '42c1cb06-4574-4d31-8463-0147ff2a0737': 'Cognitive Ability Assessment',
  'b9a372a1-28b4-440f-bf9a-bfb9211395aa': 'Technical Competence Assessment',
  '24cd4e02-e43d-4228-beec-513886035c7f': 'Personality Assessment',
  'ab4bb0b3-011e-4d37-9c08-60c60b15e88f': 'Performance Assessment',
  '671bf00f-46cc-46f5-a217-d5a90dafb9b6': 'Behavioral & Soft Skills',
  '192996c5-2ff4-4767-80c9-4af03aaf1b7e': 'Manufacturing Technical Skills',
  '9f138960-671d-4edd-8044-c7d0a95cbbe9': 'Cultural & Attitudinal Fit',
  '49980cc1-eb63-432b-895c-951722cfcc24': 'Strategic Leadership Assessment',
  '232f7ff8-60b8-4223-81c6-4917a5fb12a3': 'Manufacturing Baseline Assessment',
  'bdb9d46e-9fac-4d00-8478-1f649e7ac600': 'National Service Recruitment Assessment'
};

// Map assessment type code to type info
const TYPE_INFO = {
  'general': { code: 'general', name: 'General' },
  'leadership': { code: 'leadership', name: 'Leadership' },
  'cognitive': { code: 'cognitive', name: 'Cognitive' },
  'technical': { code: 'technical', name: 'Technical' },
  'personality': { code: 'personality', name: 'Personality' },
  'performance': { code: 'performance', name: 'Performance' },
  'behavioral': { code: 'behavioral', name: 'Behavioral' },
  'manufacturing': { code: 'manufacturing', name: 'Manufacturing' },
  'cultural': { code: 'cultural', name: 'Cultural' },
  'strategic_leadership': { code: 'strategic_leadership', name: 'Strategic' },
  'manufacturing_baseline': { code: 'manufacturing_baseline', name: 'Baseline' },
  'national_service': { code: 'national_service', name: 'National Service' }
};

// National Service assessment ID for forced override
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

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
    const { data: profile } = await serviceClient
      .from('candidate_profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const candidateName = profile?.full_name || userData.user.user_metadata?.full_name || 'Candidate';

    // ============================================================
    // STEP 2: Get candidate assessments
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
    // STEP 3: Get assessment types for these assessments
    // ============================================================
    const assessmentIds = candidateAssessments.map(ca => ca.assessment_id).filter(Boolean);
    let typeMap = {};

    if (assessmentIds.length > 0) {
      // Get assessments with their type info
      const { data: assessments, error: aError } = await serviceClient
        .from('assessments')
        .select('id, title, description, question_count, time_limit_minutes, attempts_allowed, assessment_type_id')
        .in('id', assessmentIds);

      if (!aError && assessments) {
        // Get types
        const typeIds = assessments.map(a => a.assessment_type_id).filter(Boolean);
        if (typeIds.length > 0) {
          const { data: types, error: tError } = await serviceClient
            .from('assessment_types')
            .select('id, code, name')
            .in('id', typeIds);

          if (!tError && types) {
            types.forEach(t => {
              typeMap[t.id] = t;
            });
          }
        }

        // Build a map of assessment_id to its data
        assessments.forEach(a => {
          typeMap[a.id] = {
            ...a,
            type: typeMap[a.assessment_type_id] || null
          };
        });
      }
    }

    // ============================================================
    // STEP 4: Build cards with FORCED CORRECT values for National Service
    // ============================================================
    const cards = candidateAssessments.map(ca => {
      const assessmentData = typeMap[ca.assessment_id] || {};
      const type = assessmentData.type || {};
      const typeCode = type.code || 'general';
      
      // Get title - try assessmentData.title, then hardcoded fallback, then type name
      let title = assessmentData.title || ASSESSMENT_TITLES[ca.assessment_id] || type.name || 'Assessment';
      
      // If title is still 'Assessment' but we have a type name, use it
      if (title === 'Assessment' && type.name) {
        title = type.name;
      }

      let status = ca.status || 'blocked';
      if (ca.status === 'completed' || ca.result_id) {
        status = 'completed';
      }

      // ============================================================
      // FORCE CORRECT VALUES FOR NATIONAL SERVICE
      // ============================================================
      const isNationalService = typeCode === 'national_service' || ca.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;
      
      let questionCount;
      let timeLimitMinutes;
      
      if (isNationalService) {
        // FORCE National Service values - IGNORE database
        questionCount = 80;
        timeLimitMinutes = 90;
      } else {
        // For all other assessments, use database or fallback to 100/120
        questionCount = assessmentData.question_count || 100;
        timeLimitMinutes = assessmentData.time_limit_minutes || 120;
      }

      return {
        id: ca.assessment_id,
        title: title,
        description: assessmentData.description || 'Complete this assessment to demonstrate your capabilities.',
        typeCode: typeCode,
        typeName: type.name || 'General',
        status: status,
        questionCount: questionCount,
        timeLimitMinutes: timeLimitMinutes,
        attemptsAllowed: assessmentData.attempts_allowed || 1,
        isNationalService: isNationalService,
        completedAt: ca.completed_at || null,
        unblockedAt: ca.unblocked_at || null,
        resultId: ca.result_id || null
      };
    });

    console.log('[API] Cards built:', cards.map(c => ({ 
      id: c.id, 
      title: c.title, 
      status: c.status,
      questionCount: c.questionCount,
      timeLimitMinutes: c.timeLimitMinutes,
      isNationalService: c.isNationalService
    })));

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
