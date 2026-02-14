import { supabase } from './client';

// Assessment Types
export async function getAssessmentTypes() {
  const { data, error } = await supabase
    .from('assessment_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) throw error;
  return data;
}

export async function getAssessmentTypeByCode(code) {
  const { data, error } = await supabase
    .from('assessment_types')
    .select('*')
    .eq('code', code)
    .single();
  
  if (error) throw error;
  return data;
}

// Assessments
export async function getAssessments() {
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      *,
      assessment_type:assessment_types(*)
    `)
    .eq('is_active', true);
  
  if (error) throw error;
  return data;
}

export async function getAssessmentById(id) {
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      *,
      assessment_type:assessment_types(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Questions and Answers
export async function getAssessmentQuestions(assessmentId) {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      answers (*)
    `)
    .eq('assessment_id', assessmentId)
    .eq('is_active', true)
    .order('question_order');
  
  if (error) throw error;
  return data;
}

// Assessment Sessions
export async function createAssessmentSession(userId, assessmentId, assessmentTypeId) {
  // Check if session already exists
  const { data: existing } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (existing) return existing;

  // Get assessment type for time limit
  const { data: assessment } = await supabase
    .from('assessments')
    .select('assessment_type_id')
    .eq('id', assessmentId)
    .single();

  const { data: assessmentType } = await supabase
    .from('assessment_types')
    .select('time_limit_minutes')
    .eq('id', assessment.assessment_type_id)
    .single();

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + assessmentType.time_limit_minutes);

  const { data, error } = await supabase
    .from('assessment_sessions')
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      assessment_type_id: assessmentTypeId,
      status: 'in_progress',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAssessmentSession(sessionId) {
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSessionTimer(sessionId, elapsedSeconds) {
  const { error } = await supabase
    .from('assessment_sessions')
    .update({ time_spent_seconds: elapsedSeconds })
    .eq('id', sessionId);

  if (error) throw error;
}

// Responses
export async function saveResponse(sessionId, userId, assessmentId, questionId, answerId) {
  const { error } = await supabase
    .from('responses')
    .upsert({
      session_id: sessionId,
      user_id: userId,
      assessment_id: assessmentId,
      question_id: questionId,
      answer_id: answerId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id,question_id'
    });

  if (error) throw error;
}

export async function getSessionResponses(sessionId) {
  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      question:questions(*),
      answer:answers(*)
    `)
    .eq('session_id', sessionId);

  if (error) throw error;
  return data;
}

// Submit and Generate Results
export async function submitAssessment(sessionId) {
  // Call the database function to generate results
  const { data, error } = await supabase
    .rpc('generate_assessment_results', {
      p_session_id: sessionId
    });

  if (error) throw error;
  return data;
}

// Get Assessment Results
export async function getAssessmentResult(resultId) {
  const { data, error } = await supabase
    .from('assessment_results')
    .select(`
      *,
      assessment:assessments(
        *,
        assessment_type:assessment_types(*)
      )
    `)
    .eq('id', resultId)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserAssessmentResults(userId) {
  const { data, error } = await supabase
    .from('assessment_results')
    .select(`
      *,
      assessment:assessments(
        *,
        assessment_type:assessment_types(*)
      )
    `)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Candidate Profile
export async function getOrCreateCandidateProfile(userId, email, fullName) {
  const { data: existing } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('candidate_profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Progress Tracking
export async function saveProgress(sessionId, userId, assessmentId, elapsedSeconds, lastQuestionId) {
  const { error } = await supabase
    .from('assessment_progress')
    .upsert({
      user_id: userId,
      assessment_id: assessmentId,
      session_id: sessionId,
      elapsed_seconds: elapsedSeconds,
      last_question_id: lastQuestionId,
      last_saved_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,assessment_id'
    });

  if (error) throw error;
}

export async function getProgress(userId, assessmentId) {
  const { data, error } = await supabase
    .from('assessment_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Check if assessment already completed
export async function isAssessmentCompleted(userId, assessmentId) {
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId)
    .eq('status', 'completed')
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
