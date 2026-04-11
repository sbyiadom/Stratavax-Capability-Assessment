/**
 * BEHAVIORAL ANALYTICS ENGINE
 * Analyzes candidate behavior during assessment
 * Provides insights for informed decision-making
 */

/**
 * Calculate behavioral metrics from responses and timing data
 */
export async function calculateBehavioralMetrics(sessionId, userId, assessmentId, supabaseClient) {
  console.log("📊 Calculating behavioral metrics for session:", sessionId);
  
  try {
    // Get all responses with timing
    const { data: responses, error: responsesError } = await supabaseClient
      .from('responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('first_saved_at', { ascending: true });
    
    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
    }
    
    // Get question timing data
    const { data: timing, error: timingError } = await supabaseClient
      .from('question_timing')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_number', { ascending: true });
    
    if (timingError) {
      console.error("Error fetching timing:", timingError);
    }
    
    // Get answer history
    const { data: answerHistory, error: historyError } = await supabaseClient
      .from('answer_history')
      .select('*')
      .eq('session_id', sessionId);
    
    if (historyError) {
      console.error("Error fetching answer history:", historyError);
    }
    
    // Calculate all metrics
    const timingMetrics = calculateTimingMetrics(responses, timing);
    const answerMetrics = calculateAnswerMetrics(responses, answerHistory);
    const navigationMetrics = calculateNavigationMetrics(timing, responses);
    const fatigueMetrics = calculateFatigueMetrics(timing);
    
    // Determine work style and recommendations
    const workStyle = determineWorkStyle(timingMetrics, answerMetrics, navigationMetrics);
    const recommendations = generateSupportRecommendations(workStyle, timingMetrics, answerMetrics);
    
    // Compile all metrics
    const behavioralMetrics = {
      user_id: userId,
      assessment_id: assessmentId,
      session_id: sessionId,
      ...timingMetrics,
      ...answerMetrics,
      ...navigationMetrics,
      ...fatigueMetrics,
      work_style: workStyle.style,
      confidence_level: workStyle.confidence,
      attention_span: workStyle.attention,
      decision_pattern: workStyle.decisionPattern,
      recommended_support: recommendations.primary,
      development_focus_areas: recommendations.focusAreas
    };
    
    console.log("✅ Behavioral metrics calculated:", {
      work_style: behavioralMetrics.work_style,
      confidence_level: behavioralMetrics.confidence_level,
      total_answer_changes: behavioralMetrics.total_answer_changes
    });
    
    // Save to database
    const { error: saveError } = await supabaseClient
      .from('behavioral_metrics')
      .upsert(behavioralMetrics, {
        onConflict: 'user_id, assessment_id, session_id'
      });
    
    if (saveError) {
      console.error("Error saving behavioral metrics:", saveError);
    } else {
      console.log("✅ Behavioral metrics saved to database");
    }
    
    return behavioralMetrics;
    
  } catch (error) {
    console.error("Error calculating behavioral metrics:", error);
    return null;
  }
}

/**
 * Calculate timing-related metrics
 */
function calculateTimingMetrics(responses, timing) {
  if (!responses || responses.length === 0) {
    return {
      avg_response_time_seconds: 0,
      median_response_time_seconds: 0,
      fastest_response_seconds: 0,
      slowest_response_seconds: 0,
      total_time_spent_seconds: 0,
      time_variance: 0
    };
  }
  
  // Get times from responses that have timing data
  const times = responses
    .map(r => r.time_spent_seconds || 0)
    .filter(t => t > 0);
  
  if (times.length === 0) {
    return {
      avg_response_time_seconds: 0,
      median_response_time_seconds: 0,
      fastest_response_seconds: 0,
      slowest_response_seconds: 0,
      total_time_spent_seconds: 0,
      time_variance: 0
    };
  }
  
  const sorted = [...times].sort((a, b) => a - b);
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const fastest = sorted[0] || 0;
  const slowest = sorted[sorted.length - 1] || 0;
  const total = times.reduce((a, b) => a + b, 0);
  
  // Calculate variance (measure of inconsistency)
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
  
  return {
    avg_response_time_seconds: Math.round(avg * 10) / 10,
    median_response_time_seconds: median || 0,
    fastest_response_seconds: fastest,
    slowest_response_seconds: slowest,
    total_time_spent_seconds: total,
    time_variance: Math.round(variance * 10) / 10
  };
}

/**
 * Calculate answer behavior metrics
 */
function calculateAnswerMetrics(responses, answerHistory) {
  const totalChanges = answerHistory?.length || 0;
  const avgChanges = responses?.length ? totalChanges / responses.length : 0;
  
  // Calculate improvement rate (did changes improve scores?)
  let improvements = 0;
  if (answerHistory && answerHistory.length > 0) {
    for (const change of answerHistory) {
      if (change.score_improved === true) {
        improvements++;
      }
    }
  }
  
  const improvementRate = totalChanges > 0 ? (improvements / totalChanges) * 100 : 0;
  
  // First instinct accuracy (compare initial answer to final answer)
  let firstInstinctCorrect = 0;
  let firstInstinctTotal = 0;
  
  if (responses && responses.length > 0) {
    for (const response of responses) {
      if (response.initial_answer_id && response.answer_id) {
        firstInstinctTotal++;
        // Compare initial vs final - if they didn't change, first instinct was trusted
        // If they changed and it improved, first instinct was wrong
        // This is a simplified metric - for full accuracy we'd need answer scores
        if (response.initial_answer_id === response.answer_id) {
          firstInstinctCorrect++;
        }
      }
    }
  }
  
  const firstInstinctAccuracy = firstInstinctTotal > 0 
    ? (firstInstinctCorrect / firstInstinctTotal) * 100 
    : 0;
  
  return {
    total_answer_changes: totalChanges,
    avg_changes_per_question: Math.round(avgChanges * 100) / 100,
    improvement_rate: Math.round(improvementRate),
    first_instinct_accuracy: Math.round(firstInstinctAccuracy)
  };
}

/**
 * Calculate navigation pattern metrics
 */
function calculateNavigationMetrics(timing, responses) {
  if (!timing || timing.length === 0) {
    return {
      total_question_visits: 0,
      revisit_rate: 0,
      skipped_questions: 0,
      linearity_score: 0
    };
  }
  
  const totalVisits = timing.reduce((sum, t) => sum + (t.visit_count || 1), 0);
  const uniqueQuestions = timing.length;
  const revisitRate = uniqueQuestions > 0 
    ? ((totalVisits - uniqueQuestions) / uniqueQuestions) * 100 
    : 0;
  const skippedQuestions = timing.filter(t => t.skipped === true).length;
  
  // Calculate linearity (did they answer questions in order?)
  let linearScore = 100;
  const answeredOrder = responses?.map(r => r.question_id) || [];
  
  for (let i = 1; i < answeredOrder.length; i++) {
    // If they went back to a previous question, penalize
    if (answeredOrder[i] < answeredOrder[i-1]) {
      linearScore -= 5;
    }
  }
  
  return {
    total_question_visits: totalVisits,
    revisit_rate: Math.round(revisitRate),
    skipped_questions: skippedQuestions,
    linearity_score: Math.max(0, Math.min(100, linearScore))
  };
}

/**
 * Calculate fatigue metrics (comparison between first and second half)
 */
function calculateFatigueMetrics(timing) {
  if (!timing || timing.length < 4) {
    return {
      first_half_avg_time: 0,
      second_half_avg_time: 0,
      fatigue_factor: 0
    };
  }
  
  const midPoint = Math.floor(timing.length / 2);
  const firstHalf = timing.slice(0, midPoint);
  const secondHalf = timing.slice(midPoint);
  
  const firstAvg = firstHalf.reduce((sum, t) => sum + (t.time_spent_seconds || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, t) => sum + (t.time_spent_seconds || 0), 0) / secondHalf.length;
  
  // Fatigue factor: positive means slowing down (fatigued), negative means speeding up
  const fatigueFactor = secondAvg - firstAvg;
  
  return {
    first_half_avg_time: Math.round(firstAvg),
    second_half_avg_time: Math.round(secondAvg),
    fatigue_factor: Math.round(fatigueFactor)
  };
}

/**
 * Determine work style based on behavioral patterns
 */
function determineWorkStyle(timingMetrics, answerMetrics, navigationMetrics) {
  const { avg_response_time_seconds, time_variance } = timingMetrics;
  const { total_answer_changes, improvement_rate } = answerMetrics;
  const { revisit_rate, linearity_score } = navigationMetrics;
  
  let style = "Balanced";
  let confidence = "Moderate";
  let attention = "Consistent";
  let decisionPattern = "Deliberate";
  
  // Determine work style based on multiple factors
  if (avg_response_time_seconds < 15 && total_answer_changes < 3 && revisit_rate < 20) {
    style = "Quick Decision Maker";
    confidence = "High";
    decisionPattern = "Fast & Confident";
  } 
  else if (avg_response_time_seconds > 45 && total_answer_changes > 5) {
    style = "Methodical Analyst";
    confidence = "Cautious";
    decisionPattern = "Thorough & Revisiting";
  } 
  else if (total_answer_changes > 8) {
    style = "Anxious Reviser";
    confidence = "Low";
    decisionPattern = "Second-Guesses";
  } 
  else if (revisit_rate > 50) {
    style = "Strategic Reviewer";
    confidence = "Moderate";
    decisionPattern = "Reviews Before Submitting";
  } 
  else if (improvement_rate > 70) {
    style = "Adaptive Learner";
    confidence = "Growing";
    decisionPattern = "Learns from Mistakes";
  }
  else if (linearity_score < 60) {
    style = "Non-Linear Thinker";
    confidence = "Variable";
    decisionPattern = "Jumps Between Questions";
  }
  else if (time_variance > 50) {
    style = "Inconsistent Responder";
    confidence = "Uncertain";
    decisionPattern = "Variable Speed";
  }
  
  // Determine attention span based on fatigue factor
  const fatigueFactor = timingMetrics.fatigue_factor || 0;
  if (fatigueFactor > 30) {
    attention = "Declining (Fatigue Detected)";
  } else if (fatigueFactor < -10) {
    attention = "Improving (Warms Up)";
  } else if (Math.abs(fatigueFactor) < 10) {
    attention = "Consistent";
  }
  
  return { style, confidence, attention, decisionPattern };
}

/**
 * Generate personalized support recommendations
 */
function generateSupportRecommendations(workStyle, timingMetrics, answerMetrics) {
  const focusAreas = [];
  let primary = "";
  
  switch (workStyle.style) {
    case "Quick Decision Maker":
      primary = "Encourage reviewing answers before submitting. Provide time management guidance to balance speed with accuracy.";
      focusAreas.push("Review habits", "Double-checking work", "Quality verification");
      break;
      
    case "Methodical Analyst":
      primary = "Provide clear time expectations. Consider extended time if needed for complex assessments. Leverage their thoroughness.";
      focusAreas.push("Time management", "Efficiency techniques", "Prioritization");
      break;
      
    case "Anxious Reviser":
      primary = "Build confidence through practice assessments. Provide positive reinforcement. Consider reducing time pressure.";
      focusAreas.push("Confidence building", "Trusting first instincts", "Stress management");
      break;
      
    case "Strategic Reviewer":
      primary = "Leverage their thoroughness. Suggest flagging difficult questions for review rather than revisiting all questions.";
      focusAreas.push("Question flagging", "Efficient review strategies", "Time allocation");
      break;
      
    case "Adaptive Learner":
      primary = "Encourage learning from mistakes. Provide detailed feedback on incorrect answers. This candidate benefits from iteration.";
      focusAreas.push("Learning from errors", "Continuous improvement", "Feedback utilization");
      break;
      
    case "Non-Linear Thinker":
      primary = "Allow flexible question navigation. Consider providing a 'mark for review' feature to help organize their approach.";
      focusAreas.push("Question organization", "Navigation strategies", "Workflow planning");
      break;
      
    case "Inconsistent Responder":
      primary = "Help establish consistent pacing. Consider breaking assessment into smaller sections to maintain focus.";
      focusAreas.push("Pacing strategies", "Focus maintenance", "Section management");
      break;
      
    default:
      primary = "Provide balanced support with regular check-ins on progress. Continue to monitor performance patterns.";
      focusAreas.push("Consistent performance", "Regular feedback", "Progress monitoring");
  }
  
  // Add additional recommendations based on metrics
  if (timingMetrics.avg_response_time_seconds > 60) {
    focusAreas.push("Time management strategies");
  }
  
  if (answerMetrics.first_instinct_accuracy > 80 && answerMetrics.total_answer_changes > 3) {
    focusAreas.push("Trusting first instincts");
    if (!primary.includes("first instinct")) {
      primary += " Their first instinct accuracy is high - encourage trusting initial responses.";
    }
  }
  
  if (answerMetrics.improvement_rate < 30 && answerMetrics.total_answer_changes > 0) {
    focusAreas.push("Effective reviewing strategies");
    if (!primary.includes("review")) {
      primary += " Answer changes often don't improve scores - focus on effective review strategies.";
    }
  }
  
  const fatigueFactor = timingMetrics.fatigue_factor || 0;
  if (fatigueFactor > 30) {
    focusAreas.push("Break management", "Fatigue prevention");
    primary += " Significant fatigue detected in second half. Consider break strategies for longer assessments.";
  }
  
  return {
    primary: primary.substring(0, 500),
    focusAreas: [...new Set(focusAreas)] // Remove duplicates
  };
}

/**
 * Get behavioral insights summary for display
 */
export function getBehavioralSummary(behavioralData) {
  if (!behavioralData) return null;
  
  return {
    work_style: behavioralData.work_style,
    confidence: behavioralData.confidence_level,
    attention: behavioralData.attention_span,
    decision_pattern: behavioralData.decision_pattern,
    avg_response_time: behavioralData.avg_response_time_seconds,
    answer_changes: behavioralData.total_answer_changes,
    revisit_rate: behavioralData.revisit_rate,
    recommended_support: behavioralData.recommended_support,
    focus_areas: behavioralData.development_focus_areas
  };
}

export default {
  calculateBehavioralMetrics,
  getBehavioralSummary
};
