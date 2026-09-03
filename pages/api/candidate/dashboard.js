// pages/api/candidate/dashboard.js - FIXED VERSION

import { createClient } from '@supabase/supabase-js';

// ============================================================
// CORRECT PRACTICAL ASSESSMENT IDs
// ============================================================
const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',  // Mechanical Technical
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',  // Electrical Technical
  'a6000077-095d-4115-bc4e-5936fce953e9',  // Quality Assurance
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'   // Logistics & Supply Chain
];

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// MAP ASSESSMENT IDs TO THEIR CORRECT TYPE CODES
// ============================================================
const ASSESSMENT_TYPE_CODE_MAP = {
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
  // PRACTICAL ASSESSMENT TYPE CODES
  // ============================================================
  'c2bc4994-1c4a-4094-a763-8d9d560b759e': 'practical_mechanical',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0': 'practical_electrical',
  'a6000077-095d-4115-bc4e-5936fce953e9': 'practical_quality',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc': 'practical_logistics'
};

// ============================================================
// PRACTICAL ASSESSMENT DEFAULTS
// ============================================================
const PRACTICAL_DEFAULTS = {
  questionCount: 40,
  timeLimitMinutes: 90,
  attemptsAllowed: 1
};

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
      
      const { data: assessmentsData } = await serviceClient
        .from('assessments')
        .select('id, assessment_type_id')
        .in('id', missingPracticalIds);

      const assessmentTypeMap = {};
      (assessmentsData || []).forEach(a => {
        assessmentTypeMap[a.id] = a.assessment_type_id;
      });

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

    // STEP 3: Get assessment details - FIXED to properly fetch titles
    const assessmentIds = candidateAssessments.map(ca => ca.assessment_id).filter(Boolean);
    
    // Create a map of assessment data
    let assessmentDataMap = {};
    
    if (assessmentIds.length > 0) {
      const { data: assessments, error: aError } = await serviceClient
        .from('assessments')
        .select('id, title, description, question_count, time_limit_minutes, attempts_allowed, assessment_type_id, expires_at')
        .in('id', assessmentIds);

      if (!aError && assessments) {
        assessments.forEach(a => {
          assessmentDataMap[a.id] = a;
        });
        console.log('[API] Found assessments:', assessments.map(a => ({ id: a.id, title: a.title })));
      } else if (aError) {
        console.error('[API] Error fetching assessments:', aError);
      }
    }

    // STEP 4: Get assessment types
    let typeMap = {};
    const typeIds = Object.values(assessmentDataMap).map(a => a.assessment_type_id).filter(Boolean);
    
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

    // STEP 5: Build cards - FIXED title logic
    const cards = candidateAssessments.map(ca => {
      const assessmentData = assessmentDataMap[ca.assessment_id] || {};
      const type = typeMap[assessmentData.assessment_type_id] || {};
      
      // Get the type code from the map or fallback to type.code or 'general'
      const typeCode = ASSESSMENT_TYPE_CODE_MAP[ca.assessment_id] || type.code || 'general';
      
      // FIXED: Get the title from the assessment data, or fallback to type name
      let title = assessmentData.title || type.name || 'Assessment';
      
      // If title is still 'Assessment' and we have a type name, use that
      if (title === 'Assessment' && type.name) {
        title = type.name;
      }

      let status = ca.status || 'blocked';
      if (ca.status === 'completed' || ca.result_id) {
        status = 'completed';
      }

      const isNationalService = typeCode === 'national_service' || ca.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;
      const isPractical = typeCode && typeCode.startsWith('practical_');
      
      let questionCount;
      let timeLimitMinutes;
      let attemptsAllowed;
      
      if (isNationalService) {
        questionCount = 80;
        timeLimitMinutes = 90;
        attemptsAllowed = 1;
      } else if (isPractical) {
        questionCount = assessmentData.question_count || PRACTICAL_DEFAULTS.questionCount;
        timeLimitMinutes = assessmentData.time_limit_minutes || PRACTICAL_DEFAULTS.timeLimitMinutes;
        attemptsAllowed = assessmentData.attempts_allowed || PRACTICAL_DEFAULTS.attemptsAllowed;
      } else {
        questionCount = assessmentData.question_count || 100;
        timeLimitMinutes = assessmentData.time_limit_minutes || 120;
        attemptsAllowed = assessmentData.attempts_allowed || 1;
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
        attemptsAllowed: attemptsAllowed,
        isNationalService: isNationalService,
        expires_at: assessmentData.expires_at || null,
        completedAt: ca.completed_at || null,
        unblockedAt: ca.unblocked_at || null,
        resultId: ca.result_id || null
      };
    });

    // Sort cards: show ready/unblocked first, then in_progress, then blocked, then completed
    const sortOrder = { 'unblocked': 0, 'in_progress': 1, 'blocked': 2, 'completed': 3 };
    cards.sort((a, b) => {
      const orderA = sortOrder[a.status] !== undefined ? sortOrder[a.status] : 99;
      const orderB = sortOrder[b.status] !== undefined ? sortOrder[b.status] : 99;
      return orderA - orderB;
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
      stack: process.env.NEXT_PUBLIC_ENV === 'development' ? error.stack : undefined
    });
  }
}
