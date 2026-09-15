// pages/api/assessment/questions.js - FULLY CORRECTED WITH 40-QUESTION LIMIT
// UPDATED: Added Bearer token authentication (Phase 1)
// UPDATED: Removed answer scores from response; server computes isMultipleCorrect (Phase 1)
// UPDATED (Phase Two / Item 2.4): If a sessionId is provided and that session
// has a frozen set in session_questions, return that exact set (in the exact
// order it was frozen) instead of re-randomizing. This guarantees page refresh
// returns the same questions the candidate started with.

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

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

// ============================================================
// Determine (server-side) whether a question allows multiple
// correct answers, WITHOUT exposing scores to the client.
// ============================================================
function computeIsMultipleCorrect(question, assessmentTypeCode) {
  if (assessmentTypeCode === 'national_service') {
    return false;
  }
  if (!question || !Array.isArray(question.answers)) return false;
  const correctAnswers = question.answers.filter((answer) => safeNumber(answer.score, 0) === 1);
  return correctAnswers.length > 1;
}

// Strip the score field from each answer before sending to the client.
function stripScores(question) {
  const answers = safeArray(question.answers).map(({ score, ...rest }) => rest);
  return { ...question, answers };
}

function getRequiredQuestionCount(assessmentId, assessmentTypeCode) {
  if (PRACTICAL_ASSESSMENT_IDS.includes(assessmentId)) {
    return 40;
  }
  if (assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID || assessmentTypeCode === 'national_service') {
    return 80;
  }
  return QUESTION_COUNT_MAP[assessmentId] || 100;
}

// ============================================================
// Phase Two (Item 2.4): read the frozen set for a session.
// Returns null if the session has no frozen rows yet, so the
// caller can fall back to random selection.
// ============================================================
async function loadFrozenQuestions(serviceClient, sessionId, assessmentTypeCode) {
  // 1. Read the frozen rows, ordered exactly as the candidate saw them.
  const { data: frozen, error: frozenErr } = await serviceClient
    .from('session_questions')
    .select('question_id, display_order, answer_order')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true });

  if (frozenErr) {
    console.error('[API] Frozen set read error:', frozenErr);
    return null;
  }
  if (!frozen || frozen.length === 0) {
    return null;
  }

  const questionIds = frozen.map((row) => row.question_id);

  // 2. Fetch the questions themselves.
  const { data: questions, error: qErr } = await serviceClient
    .from('unique_questions')
    .select('id, question_text, section, subsection, display_order')
    .in('id', questionIds);

  if (qErr || !questions) {
    console.error('[API] Frozen questions fetch error:', qErr);
    return null;
  }

  // 3. Fetch all answers for those questions.
  const { data: answers, error: aErr } = await serviceClient
    .from('unique_answers')
    .select('id, question_id, answer_text, score, display_order')
    .in('question_id', questionIds);

  if (aErr) {
    console.error('[API] Frozen answers fetch error:', aErr);
    return null;
  }

  // 4. Build lookup maps.
  const questionMap = {};
  questions.forEach((q) => { questionMap[q.id] = q; });

  const answersByQuestion = {};
  safeArray(answers).forEach((a) => {
    if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = [];
    answersByQuestion[a.question_id].push(a);
  });

  // 5. Assemble questions in the frozen order, using the frozen answer order.
  const assembled = [];
  for (const row of frozen) {
    const q = questionMap[row.question_id];
    if (!q) {
      console.warn('[API] Frozen question missing from unique_questions:', row.question_id);
      continue;
    }

    const answersForQ = answersByQuestion[row.question_id] || [];

    // answer_order is JSONB: [{ answer_id, display_order }, ...]
    const answerOrder = Array.isArray(row.answer_order) ? row.answer_order : [];
    let orderedAnswers;

    if (answerOrder.length > 0) {
      const answerMap = {};
      answersForQ.forEach((a) => { answerMap[a.id] = a; });

      orderedAnswers = answerOrder
        .map((entry, idx) => {
          const a = answerMap[entry.answer_id];
          if (!a) return null;
          return {
            id: a.id,
            answer_text: a.answer_text,
            score: a.score || 0,
            display_order: entry.display_order || idx + 1,
          };
        })
        .filter(Boolean);
    } else {
      // Fallback: frozen row exists but answer_order is empty — use DB order.
      orderedAnswers = answersForQ
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map((a, index) => ({
          id: a.id,
          answer_text: a.answer_text,
          score: a.score || 0,
          display_order: index + 1,
        }));
    }

    assembled.push({
      id: q.id,
      question_text: q.question_text,
      section: q.section || 'General',
      subsection: q.subsection || '',
      display_order: row.display_order,
      answers: orderedAnswers,
    });
  }

  // 6. Compute isMultipleCorrect and strip scores (same as the random path).
  return assembled.map((q) => {
    const isMultipleCorrect = computeIsMultipleCorrect(q, assessmentTypeCode);
    const withoutScores = stripScores(q);
    return { ...withoutScores, isMultipleCorrect };
  });
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

    // ============================================================
    // AUTH CHECK
    // ============================================================
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get parameters from query
    const { assessmentTypeId, assessmentTypeCode, assessmentId, sessionId } = req.query;

    if (!assessmentTypeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing assessmentTypeId parameter'
      });
    }

    console.log(`[API] Fetching questions - TypeId: ${assessmentTypeId}, Code: ${assessmentTypeCode || 'unknown'}, AssessmentId: ${assessmentId || 'unknown'}, SessionId: ${sessionId || 'none'}`);

    // ============================================================
    // Phase Two (Item 2.4): prefer the frozen set when a session exists.
    // ============================================================
    if (sessionId) {
      const frozen = await loadFrozenQuestions(serviceClient, sessionId, assessmentTypeCode);
      if (frozen && frozen.length > 0) {
        console.log(`[API] Returning ${frozen.length} FROZEN questions for session ${sessionId}`);
        return res.status(200).json({
          success: true,
          questionCount: frozen.length,
          source: 'frozen',
          questions: frozen
        });
      }
      console.log(`[API] No frozen set for session ${sessionId} — falling back to random selection`);
    }

    // ============================================================
    // Fallback path (legacy sessions without a frozen set, or no
    // sessionId at all): original random-selection behavior.
    // ============================================================
    const requiredCount = getRequiredQuestionCount(assessmentId, assessmentTypeCode);
    console.log(`[API] Required question count: ${requiredCount}`);

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

    const questionIds = questionsData.map(q => q.id);
    const { data: answersData, error: answersError } = await serviceClient
      .from('unique_answers')
      .select('*')
      .in('question_id', questionIds);

    if (answersError) {
      console.error('[API] Answers error:', answersError);
    }

    const answersMap = {};
    if (answersData) {
      answersData.forEach(a => {
        if (!answersMap[a.question_id]) answersMap[a.question_id] = [];
        answersMap[a.question_id].push(a);
      });
    }

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

    formattedQuestions = formattedQuestions.map(q => randomizeAnswers(q));
    formattedQuestions = shuffleArray(formattedQuestions).slice(0, requiredCount);

    formattedQuestions = formattedQuestions.map((q) => {
      const isMultipleCorrect = computeIsMultipleCorrect(q, assessmentTypeCode);
      const withoutScores = stripScores(q);
      return { ...withoutScores, isMultipleCorrect };
    });

    console.log(`[API] Returning ${formattedQuestions.length} questions (limited to ${requiredCount}) — source: random`);

    return res.status(200).json({
      success: true,
      questionCount: formattedQuestions.length,
      source: 'random',
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
