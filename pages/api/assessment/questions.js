// pages/api/assessment/questions.js - FULLY CORRECTED WITH 40-QUESTION LIMIT

import { createClient } from '@supabase/supabase-js';

// ============================================================
// PRACTICAL ASSESSMENT IDs - ONLY 40 QUESTIONS
// ============================================================
const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',
  'a6000077-095d-4115-bc4e-5936fce953e9',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'
];

// ============================================================
// NATIONAL SERVICE ASSESSMENT ID - 80 QUESTIONS
// ============================================================
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// QUESTION COUNT DEFAULTS BY ASSESSMENT TYPE
// ============================================================
const QUESTION_COUNT_MAP = {
  'c2bc4994-1c4a-4094-a763-8d9d560b759e': 40,
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0': 40,
  'a6000077-095d-4115-bc4e-5936fce953e9': 40,
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc': 40,
  'bdb9d46e-9fac-4d00-8478-1f649e7ac600': 80,
  '232f7ff8-60b8-4223-81c6-4917a5fb12a3': 100,
};

// ============================================================
// HELPERS
// ============================================================
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function randomizeAnswers(question) {
  if (!question || !question.answers || !Array.isArray(question.answers)) {
    return question;
  }
  const shuffledAnswers = shuffleArray(question.answers);
  const updatedAnswers = shuffledAnswers.map((answer, index) => ({
    ...answer,
    display_order: index + 1,
  }));
  return { ...question, answers: updatedAnswers };
}

function getRequiredQuestionCount(assessmentId, assessmentTypeCode) {
  // Check if it's a practical assessment
  if (PRACTICAL_ASSESSMENT_IDS.includes(assessmentId)) {
    return 40;
  }
  
  // Check if it's National Service
  if (assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID || assessmentTypeCode === 'national_service') {
    return 80;
  }
  
  // Use the map or default to 100
  return QUESTION_COUNT_MAP[assessmentId] || 100;
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[API] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Get parameters from query
    const { assessmentTypeId, assessmentTypeCode, assessmentId } = req.query;
    
    if (!assessmentTypeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing assessmentTypeId parameter' 
      });
    }

    console.log(`[API] Fetching questions - TypeId: ${assessmentTypeId}, Code: ${assessmentTypeCode || 'unknown'}, AssessmentId: ${assessmentId || 'unknown'}`);

    // Get required question count
    const requiredCount = getRequiredQuestionCount(assessmentId, assessmentTypeCode);
    console.log(`[API] Required question count: ${requiredCount}`);

    // Create Supabase client
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get questions from unique_questions
    const { data: questionsData, error: questionsError } = await serviceClient
      .from('unique_questions')
      .select('*')
      .eq('assessment_type_id', parseInt(assessmentTypeId, 10))
      .order('display_order', { ascending: true });

    if (questionsError) {
      console.error('[API] Questions error:', questionsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch questions',
        details: questionsError.message
      });
    }

    if (!questionsData || questionsData.length === 0) {
      console.warn(`[API] No questions found for assessment_type_id: ${assessmentTypeId}`);
      return res.status(200).json({
        success: true,
        questionCount: 0,
        questions: []
      });
    }

    console.log(`[API] Found ${questionsData.length} questions in unique_questions`);

    // Get answers for all questions
    const questionIds = questionsData.map(q => q.id);
    const { data: answersData, error: answersError } = await serviceClient
      .from('unique_answers')
      .select('*')
      .in('question_id', questionIds);

    if (answersError) {
      console.error('[API] Answers error:', answersError);
    }

    // Build answers map
    const answersMap = {};
    if (answersData) {
      answersData.forEach(a => {
        if (!answersMap[a.question_id]) answersMap[a.question_id] = [];
        answersMap[a.question_id].push(a);
      });
    }

    // Format questions with their answers
    let formattedQuestions = questionsData.map((question) => {
      const answers = safeArray(answersMap[question.id] || []).map((answer) => ({
        id: answer.id,
        answer_text: answer.answer_text,
        score: answer.score || 0,
        display_order: answer.display_order || 1
      }));

      return {
        id: question.id,
        question_text: question.question_text,
        section: question.section || "General",
        subsection: question.subsection || "",
        display_order: question.display_order || 1,
        answers: answers
      };
    });

    // ============================================================
    // STEP 3: Randomize and enforce the required question count
    // ============================================================
    
    // Randomize answer options for each question
    formattedQuestions = formattedQuestions.map(q => randomizeAnswers(q));
    
    // Randomize question order and enforce the required count
    formattedQuestions = shuffleArray(formattedQuestions)
      .slice(0, requiredCount);

    console.log(`[API] Returning ${formattedQuestions.length} questions (limited to ${requiredCount})`);

    return res.status(200).json({
      success: true,
      questionCount: formattedQuestions.length,
      questions: formattedQuestions
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
