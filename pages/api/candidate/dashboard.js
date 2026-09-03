// pages/api/candidate/dashboard.js - COMPLETE VERSION WITH PRACTICAL ASSESSMENTS

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
  'bdb9d46e-9fac-4d00-8478-1f649e7ac600': 'National Service Recruitment Assessment',
  // ============================================================
  // NEW: 4 PRACTICAL MANUFACTURING ASSESSMENTS
  // ============================================================
  '11111111-1111-1111-1111-111111111111': 'Practical Mechanical Assessment',
  '22222222-2222-2222-2222-222222222222': 'Practical Electrical Assessment',
  '33333333-3333-3333-3333-333333333333': 'Practical Logistics Assessment',
  '44444444-4444-4444-4444-444444444444': 'Practical Quality Assessment'
};

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// MAP ASSESSMENT IDs TO THEIR CORRECT TYPE CODES
// ============================================================
const ASSESSMENT_TYPE_CODE_MAP = {
  // Existing assessments with their codes
  '17003efb-923f-49a5-bdeb-e4996c864a87': 'general',
  'd09953bf-59cd-40ed-a9bb-308c3b5cfb7d': 'leadership',
  '42c1cb06-4574-4d31-8463-0147ff2a0737': 'cognitive',
  'b9a372a1-28b4-440f-bf9a-bfb9211395aa': 'technical',
  '24cd4e02-e43d-4228-beec-513886035c7f': 'personality',
  'ab4bb0b3-011e-4d37-9c08-60c60b15e88f': 'performance',
  '671bf00f-46cc-46f5-a217-d5a90dafb9b6': 'behavioral',
  '192996c5-2ff4-4767-80c9-4af03aaf1b7e': 'manufacturing_technical',
  '9f138960-671d-4edd-8044-c7d0a95cbbe9': 'cultural',
  '49980cc1-eb63-432b-895c-951722cfcc24': 'strategic_leadership',
  '232f7ff8-60b8-4223-81c6-4917a5fb12a3': 'manufacturing_baseline',
  'bdb9d46e-9fac-4d00-8478-1f649e7ac600': 'national_service',
  // ============================================================
  // NEW: 4 PRACTICAL ASSESSMENT TYPE CODES
  // ============================================================
  '11111111-1111-1111-1111-111111111111': 'practical_mechanical',
  '22222222-2222-2222-2222-222222222222': 'practical_electrical',
  '33333333-3333-3333-3333-333333333333': 'practical_logistics',
  '44444444-4444-4444-4444-444444444444': 'practical_quality'
};

// ============================================================
// PRACTICAL ASSESSMENT IDs FOR QUICK REFERENCE
// ============================================================
const PRACTICAL_ASSESSMENT_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
];

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[API] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Create Supabase client with service role key
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Verify the user
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;

    // STEP 1: Get candidate profile
    const { data: profile } = await serviceClient
      .from('candidate_profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const candidateName = profile?.full_name || userData.user.user_metadata?.full_name || 'Candidate';

    // STEP 2: Get candidate assessments
    let { data: candidateAssessments, error: caError } = await serviceClient
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

    // ============================================================
    // FIX: Ensure practical assessments exist for this candidate
    // If not, insert them as 'blocked' by default
    // ============================================================
    const existingAssessmentIds = new Set((candidateAssessments || []).map(ca => ca.assessment_id));
    const missingPracticalIds = PRACTICAL_ASSESSMENT_IDS.filter(id => !existingAssessmentIds.has(id));

    if (missingPracticalIds.length > 0) {
      console.log('[API] Adding missing practical assessments for user:', userId);
      
      // Get assessment_type_id for each missing practical assessment
      const { data: assessmentsData } = await serviceClient
        .from('assessments')
        .select('id, assessment_type_id')
        .in('id', missingPracticalIds);

      const assessmentTypeMap = {};
      (assessmentsData || []).forEach(a => {
        assessmentTypeMap[a.id] = a.assessment_type_id;
      });

      // Insert missing practical assessments as 'blocked'
      const insertData = missingPracticalIds.map(assessmentId => ({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type_id: assessmentTypeMap[assessmentId] || null,
        status: 'blocked',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      if (insertData.length > 0) {
        const { error: insertError } = await serviceClient
          .from('candidate_assessments')
          .insert(insertData);

        if (insertError) {
          console.error('[API] Error inserting practical assessments:', insertError);
        } else {
          // Re-fetch candidate assessments to include the new ones
          const { data: refreshedData } = await serviceClient
            .from('candidate_assessments')
            .select('*')
            .eq('user_id', userId);
          
          candidateAssessments = refreshedData || [];
        }
      }
    }

    if (!candidateAssessments || candidateAssessments.length === 0) {
      return res.status(200).json({
        success: true,
        candidateName,
        assessmentTypes: [],
        assessmentCards: [],
        stats: { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 }
      });
    }

    // STEP 3: Get assessment types with expires_at
    const assessmentIds = candidateAssessments.map(ca => ca.assessment_id).filter(Boolean);
    let typeMap = {};

    if (assessmentIds.length > 0) {
      const { data: assessments, error: aError } = await serviceClient
        .from('assessments')
        .select('id, title, description, question_count, time_limit_minutes, attempts_allowed, assessment_type_id, expires_at')
        .in('id', assessmentIds);

      if (!aError && assessments) {
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

        assessments.forEach(a => {
          typeMap[a.id] = {
            ...a,
            type: typeMap[a.assessment_type_id] || null
          };
        });
      }
    }

    // STEP 4: Build cards with expires_at
    const cards = candidateAssessments.map(ca => {
      const assessmentData = typeMap[ca.assessment_id] || {};
      const type = assessmentData.type || {};
      
      // ============================================================
      // FIX: Use the assessment type code map for correct typeCode
      // ============================================================
      const typeCode = ASSESSMENT_TYPE_CODE_MAP[ca.assessment_id] || type.code || 'general';
      
      let title = assessmentData.title || ASSESSMENT_TITLES[ca.assessment_id] || type.name || 'Assessment';
      if (title === 'Assessment' && type.name) {
        title = type.name;
      }

      let status = ca.status || 'blocked';
      if (ca.status === 'completed' || ca.result_id) {
        status = 'completed';
      }

      const isNationalService = typeCode === 'national_service' || ca.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;
      
      let questionCount;
      let timeLimitMinutes;
      
      if (isNationalService) {
        questionCount = 80;
        timeLimitMinutes = 90;
      } else {
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
        expires_at: assessmentData.expires_at || null,
        completedAt: ca.completed_at || null,
        unblockedAt: ca.unblocked_at || null,
        resultId: ca.result_id || null
      };
    });

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
