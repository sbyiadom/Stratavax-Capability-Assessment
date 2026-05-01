/**
 * BEHAVIORAL ANALYTICS ENGINE
 *
 * Calculates and saves candidate behavior during an assessment attempt.
 * This file supports all assessment types.
 *
 * It calculates:
 * - response timing
 * - answer changes
 * - first-instinct consistency
 * - navigation/revisit behavior
 * - fatigue/pacing
 * - work style
 * - confidence level
 * - attention span
 * - decision pattern
 * - recommended support
 * - development focus areas
 */

const roundNumber = (value, decimals = 2) => {
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return 0;
  }

  const factor = Math.pow(10, decimals);
  return Math.round(number * factor) / factor;
};

const calculateMedian = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return roundNumber((sorted[middle - 1] + sorted[middle]) / 2, 2);
  }

  return roundNumber(sorted[middle], 2);
};

const calculateVariance = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;

  return roundNumber(variance, 2);
};

/**
 * Main behavioral metric calculator.
 */
export async function calculateBehavioralMetrics(
  sessionId,
  userId,
  assessmentId,
  supabaseClient
) {
  console.log("📊 Calculating behavioral metrics for session:", sessionId);

  try {
    if (!sessionId || !userId || !assessmentId || !supabaseClient) {
      console.error("Missing required inputs for calculateBehavioralMetrics", {
        sessionId,
        userId,
        assessmentId,
        hasSupabaseClient: Boolean(supabaseClient)
      });

      return null;
    }

    const { data: assessmentSession, error: sessionError } =
      await supabaseClient
        .from("assessment_sessions")
        .select(
          `
          id,
          user_id,
          assessment_id,
          time_spent_seconds,
          answered_questions,
          total_questions,
          status,
          violation_count,
          copy_paste_count,
          right_click_count,
          devtools_count,
          screenshot_count
        `
        )
        .eq("id", sessionId)
        .maybeSingle();

    if (sessionError) {
      console.error("Error fetching assessment session:", sessionError);
    }

    const { data: responses, error: responsesError } = await supabaseClient
      .from("responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("first_saved_at", { ascending: true });

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
    }

    const { data: timing, error: timingError } = await supabaseClient
      .from("question_timing")
      .select("*")
      .eq("session_id", sessionId)
      .order("question_number", { ascending: true });

    if (timingError) {
      console.error("Error fetching timing:", timingError);
    }

    const { data: answerHistory, error: historyError } = await supabaseClient
      .from("answer_history")
      .select("*")
      .eq("session_id", sessionId)
      .order("changed_at", { ascending: true });

    if (historyError) {
      console.error("Error fetching answer history:", historyError);
    }

    const safeResponses = responses || [];
    const safeTiming = timing || [];
    const safeAnswerHistory = answerHistory || [];

    const timingMetrics = calculateTimingMetrics(
      safeResponses,
      safeTiming,
      assessmentSession
    );

    const answerMetrics = calculateAnswerMetrics(
      safeResponses,
      safeAnswerHistory
    );

    const navigationMetrics = calculateNavigationMetrics(
      safeTiming,
      safeResponses,
      assessmentSession
    );

    const fatigueMetrics = calculateFatigueMetrics(safeTiming);

    const workStyle = determineWorkStyle(
      timingMetrics,
      answerMetrics,
      navigationMetrics,
      fatigueMetrics
    );

    const recommendations = generateSupportRecommendations(
      workStyle,
      timingMetrics,
      answerMetrics,
      navigationMetrics,
      fatigueMetrics
    );

    const behavioralMetrics = {
      user_id: userId,
      assessment_id: assessmentId,
      session_id: sessionId,

      avg_response_time_seconds: timingMetrics.avg_response_time_seconds,
      median_response_time_seconds: timingMetrics.median_response_time_seconds,
      fastest_response_seconds: timingMetrics.fastest_response_seconds,
      slowest_response_seconds: timingMetrics.slowest_response_seconds,
      total_time_spent_seconds: timingMetrics.total_time_spent_seconds,
      time_variance: timingMetrics.time_variance,

      total_answer_changes: answerMetrics.total_answer_changes,
      avg_changes_per_question: answerMetrics.avg_changes_per_question,
      improvement_rate: answerMetrics.improvement_rate,
      first_instinct_accuracy: answerMetrics.first_instinct_accuracy,

      total_question_visits: navigationMetrics.total_question_visits,
      revisit_rate: navigationMetrics.revisit_rate,
      skipped_questions: navigationMetrics.skipped_questions,
      linearity_score: navigationMetrics.linearity_score,

      first_half_avg_time: fatigueMetrics.first_half_avg_time,
      second_half_avg_time: fatigueMetrics.second_half_avg_time,
      fatigue_factor: fatigueMetrics.fatigue_factor,

      work_style: workStyle.style,
      confidence_level: workStyle.confidence,
      attention_span: workStyle.attention,
      decision_pattern: workStyle.decisionPattern,

      recommended_support: recommendations.primary,
      development_focus_areas: recommendations.focusAreas
    };

    console.log("✅ Behavioral metrics calculated:", {
      session_id: behavioralMetrics.session_id,
      work_style: behavioralMetrics.work_style,
      confidence_level: behavioralMetrics.confidence_level,
      attention_span: behavioralMetrics.attention_span,
      total_answer_changes: behavioralMetrics.total_answer_changes,
      total_question_visits: behavioralMetrics.total_question_visits
    });

    /**
     * Important:
     * Supabase onConflict column list must not contain spaces.
     */
    const { error: saveError } = await supabaseClient
      .from("behavioral_metrics")
      .upsert(behavioralMetrics, {
        onConflict: "user_id,assessment_id,session_id"
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
 * Timing metrics.
 *
 * Priority:
 * 1. Use question_timing rows.
 * 2. Fall back to responses.time_spent_seconds.
 * 3. Use assessment_sessions.time_spent_seconds only for total duration.
 *
 * We do not invent fastest or slowest response time if no per-question timing exists.
 */
function calculateTimingMetrics(responses, timing, assessmentSession = null) {
  const timingTimes = (timing || [])
    .map((row) => Number(row.time_spent_seconds || 0))
    .filter((time) => time > 0);

  const responseTimes = (responses || [])
    .map((row) => Number(row.time_spent_seconds || 0))
    .filter((time) => time > 0);

  const times = timingTimes.length > 0 ? timingTimes : responseTimes;

  const sessionTotalTime = Number(assessmentSession?.time_spent_seconds || 0);

  if (times.length === 0) {
    return {
      avg_response_time_seconds: 0,
      median_response_time_seconds: 0,
      fastest_response_seconds: null,
      slowest_response_seconds: null,
      total_time_spent_seconds: sessionTotalTime,
      time_variance: 0,
      timing_source: sessionTotalTime > 0 ? "session_only" : "not_captured"
    };
  }

  const totalFromTimes = times.reduce((sum, time) => sum + time, 0);
  const average = totalFromTimes / times.length;
  const sorted = [...times].sort((a, b) => a - b);

  return {
    avg_response_time_seconds: roundNumber(average, 2),
    median_response_time_seconds: calculateMedian(times),
    fastest_response_seconds: sorted[0],
    slowest_response_seconds: sorted[sorted.length - 1],
    total_time_spent_seconds:
      totalFromTimes > 0 ? totalFromTimes : sessionTotalTime,
    time_variance: calculateVariance(times),
    timing_source: timingTimes.length > 0 ? "question_timing" : "responses"
  };
}

/**
 * Answer-change and first-instinct metrics.
 */
function calculateAnswerMetrics(responses, answerHistory) {
  const safeResponses = responses || [];
  const safeAnswerHistory = answerHistory || [];

  const changesFromResponses = safeResponses.reduce(
    (sum, response) => sum + Number(response.times_changed || 0),
    0
  );

  const changesFromHistory = safeAnswerHistory.length || 0;

  const totalChanges =
    changesFromResponses > 0 ? changesFromResponses : changesFromHistory;

  const avgChanges = safeResponses.length
    ? totalChanges / safeResponses.length
    : 0;

  let improvementRate = 0;

  /**
   * Only calculate improvement rate if answer_history has score_improved.
   * If not available, keep 0 rather than guessing.
   */
  if (safeAnswerHistory.length > 0) {
    const rowsWithImprovementFlag = safeAnswerHistory.filter(
      (change) => typeof change.score_improved === "boolean"
    );

    if (rowsWithImprovementFlag.length > 0) {
      const improved = rowsWithImprovementFlag.filter(
        (change) => change.score_improved === true
      ).length;

      improvementRate = (improved / rowsWithImprovementFlag.length) * 100;
    }
  }

  let unchangedInitialAnswers = 0;
  let responsesWithInitialAnswer = 0;

  for (const response of safeResponses) {
    const hasInitial =
      response.initial_answer_id !== null &&
      response.initial_answer_id !== undefined;

    const hasFinal =
      response.answer_id !== null && response.answer_id !== undefined;

    if (hasInitial && hasFinal) {
      responsesWithInitialAnswer += 1;

      if (String(response.initial_answer_id) === String(response.answer_id)) {
        unchangedInitialAnswers += 1;
      }
    }
  }

  const firstInstinctAccuracy =
    responsesWithInitialAnswer > 0
      ? (unchangedInitialAnswers / responsesWithInitialAnswer) * 100
      : 0;

  return {
    total_answer_changes: Number(totalChanges || 0),
    avg_changes_per_question: roundNumber(avgChanges, 2),
    improvement_rate: roundNumber(improvementRate, 2),
    first_instinct_accuracy: roundNumber(firstInstinctAccuracy, 2)
  };
}

/**
 * Navigation metrics.
 */
function calculateNavigationMetrics(timing, responses, assessmentSession = null) {
  const safeTiming = timing || [];
  const safeResponses = responses || [];

  const totalQuestions =
    Number(assessmentSession?.total_questions || 0) ||
    new Set(safeResponses.map((response) => response.question_id)).size ||
    safeTiming.length;

  if (safeTiming.length === 0) {
    return {
      total_question_visits: 0,
      revisit_rate: 0,
      skipped_questions: 0,
      linearity_score: 0,
      navigation_source: "not_captured"
    };
  }

  const totalVisits = safeTiming.reduce(
    (sum, timingRow) => sum + Number(timingRow.visit_count || 1),
    0
  );

  const uniqueQuestionsWithTiming = new Set(
    safeTiming.map((timingRow) => timingRow.question_id)
  ).size;

  const revisitedQuestions = safeTiming.filter(
    (timingRow) => Number(timingRow.visit_count || 1) > 1
  ).length;

  const revisitRate =
    totalQuestions > 0 ? (revisitedQuestions / totalQuestions) * 100 : 0;

  const skippedQuestions = safeTiming.filter(
    (timingRow) => timingRow.skipped === true
  ).length;

  let linearityScore = 100;

  const orderedTiming = [...safeTiming]
    .filter((timingRow) => timingRow.question_number !== null)
    .sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return aTime - bTime;
    });

  for (let index = 1; index < orderedTiming.length; index++) {
    const previousQuestionNumber = Number(
      orderedTiming[index - 1].question_number
    );

    const currentQuestionNumber = Number(orderedTiming[index].question_number);

    if (currentQuestionNumber < previousQuestionNumber) {
      linearityScore -= 5;
    }
  }

  const extraVisits = Math.max(0, totalVisits - uniqueQuestionsWithTiming);

  if (totalQuestions > 0) {
    const revisitPenalty = (extraVisits / totalQuestions) * 50;
    linearityScore -= revisitPenalty;
  }

  return {
    total_question_visits: totalVisits,
    revisit_rate: roundNumber(revisitRate, 2),
    skipped_questions: skippedQuestions,
    linearity_score: roundNumber(Math.max(0, Math.min(100, linearityScore)), 2),
    navigation_source: "question_timing"
  };
}

/**
 * Fatigue/pacing metrics.
 */
function calculateFatigueMetrics(timing) {
  const safeTiming = (timing || []).filter(
    (timingRow) => Number(timingRow.time_spent_seconds || 0) > 0
  );

  if (safeTiming.length < 4) {
    return {
      first_half_avg_time: 0,
      second_half_avg_time: 0,
      fatigue_factor: 0,
      fatigue_source: "not_captured"
    };
  }

  const orderedTiming = [...safeTiming].sort((a, b) => {
    const aNumber = Number(a.question_number || 0);
    const bNumber = Number(b.question_number || 0);
    return aNumber - bNumber;
  });

  const midpoint = Math.floor(orderedTiming.length / 2);

  const firstHalf = orderedTiming.slice(0, midpoint);
  const secondHalf = orderedTiming.slice(midpoint);

  const firstAverage =
    firstHalf.reduce(
      (sum, timingRow) => sum + Number(timingRow.time_spent_seconds || 0),
      0
    ) / firstHalf.length;

  const secondAverage =
    secondHalf.reduce(
      (sum, timingRow) => sum + Number(timingRow.time_spent_seconds || 0),
      0
    ) / secondHalf.length;

  const fatigueFactor = secondAverage - firstAverage;

  return {
    first_half_avg_time: roundNumber(firstAverage, 2),
    second_half_avg_time: roundNumber(secondAverage, 2),
    fatigue_factor: roundNumber(fatigueFactor, 2),
    fatigue_source: "question_timing"
  };
}

/**
 * Determine work style.
 */
function determineWorkStyle(
  timingMetrics,
  answerMetrics,
  navigationMetrics,
  fatigueMetrics
) {
  const avgResponseTime = Number(timingMetrics.avg_response_time_seconds || 0);
  const timeVariance = Number(timingMetrics.time_variance || 0);
  const totalAnswerChanges = Number(answerMetrics.total_answer_changes || 0);
  const improvementRate = Number(answerMetrics.improvement_rate || 0);
  const revisitRate = Number(navigationMetrics.revisit_rate || 0);
  const linearityScore = Number(navigationMetrics.linearity_score || 0);
  const fatigueFactor = Number(fatigueMetrics.fatigue_factor || 0);

  let style = "Balanced";
  let confidence = "Moderate";
  let attention = "Consistent";
  let decisionPattern = "Deliberate";

  const hasTimingData =
    timingMetrics.timing_source === "question_timing" ||
    timingMetrics.timing_source === "responses";

  const hasNavigationData =
    navigationMetrics.navigation_source === "question_timing";

  /**
   * If timing and navigation are missing,
   * avoid over-interpreting behavior.
   */
  if (!hasTimingData && !hasNavigationData) {
    if (totalAnswerChanges === 0) {
      style = "Balanced";
      confidence = "Moderate";
      decisionPattern = "Consistent First Choice";
    } else if (totalAnswerChanges <= 3) {
      style = "Balanced";
      confidence = "Moderate";
      decisionPattern = "Minor Review Pattern";
    } else {
      style = "Review-Oriented";
      confidence = "Variable";
      decisionPattern = "Frequent Reconsideration";
    }

    return { style, confidence, attention, decisionPattern };
  }

  if (
    avgResponseTime > 0 &&
    avgResponseTime < 15 &&
    totalAnswerChanges < 3 &&
    revisitRate < 20
  ) {
    style = "Quick Decision Maker";
    confidence = "High";
    decisionPattern = "Fast & Confident";
  } else if (avgResponseTime > 45 && totalAnswerChanges > 5) {
    style = "Methodical Analyst";
    confidence = "Cautious";
    decisionPattern = "Thorough & Revisiting";
  } else if (totalAnswerChanges > 8) {
    style = "Anxious Reviser";
    confidence = "Low";
    decisionPattern = "Second-Guesses";
  } else if (revisitRate > 50) {
    style = "Strategic Reviewer";
    confidence = "Moderate";
    decisionPattern = "Reviews Before Submitting";
  } else if (improvementRate > 70) {
    style = "Adaptive Learner";
    confidence = "Growing";
    decisionPattern = "Learns from Mistakes";
  } else if (hasNavigationData && linearityScore > 0 && linearityScore < 60) {
    style = "Non-Linear Thinker";
    confidence = "Variable";
    decisionPattern = "Jumps Between Questions";
  } else if (timeVariance > 50) {
    style = "Inconsistent Responder";
    confidence = "Uncertain";
    decisionPattern = "Variable Speed";
  }

  if (fatigueFactor > 30) {
    attention = "Declining Pace";
  } else if (fatigueFactor < -10) {
    attention = "Improving Pace";
  } else {
    attention = "Consistent";
  }

  return { style, confidence, attention, decisionPattern };
}

/**
 * Generate supervisor support recommendation.
 */
function generateSupportRecommendations(
  workStyle,
  timingMetrics,
  answerMetrics,
  navigationMetrics,
  fatigueMetrics
) {
  const focusAreas = [];
  let primary = "";

  switch (workStyle.style) {
    case "Quick Decision Maker":
      primary =
        "Encourage answer review before submission. Support the candidate in balancing speed with accuracy and quality verification.";
      focusAreas.push(
        "Review habits",
        "Double-checking work",
        "Quality verification"
      );
      break;

    case "Methodical Analyst":
      primary =
        "Provide clear time expectations and help the candidate balance thorough analysis with efficient completion.";
      focusAreas.push("Time management", "Efficiency techniques", "Prioritization");
      break;

    case "Anxious Reviser":
      primary =
        "Build confidence through practice assessments, positive reinforcement, and structured review techniques.";
      focusAreas.push(
        "Confidence building",
        "Trusting first instincts",
        "Stress management"
      );
      break;

    case "Strategic Reviewer":
      primary =
        "Leverage the candidate's review habit while encouraging efficient question-flagging and targeted review strategies.";
      focusAreas.push(
        "Question flagging",
        "Efficient review strategies",
        "Time allocation"
      );
      break;

    case "Adaptive Learner":
      primary =
        "Provide detailed feedback after assessments. The candidate may benefit from iterative learning and guided correction.";
      focusAreas.push(
        "Learning from errors",
        "Continuous improvement",
        "Feedback utilization"
      );
      break;

    case "Non-Linear Thinker":
      primary =
        "Support the candidate with question organization strategies and a clear workflow for moving through assessments.";
      focusAreas.push(
        "Question organization",
        "Navigation strategies",
        "Workflow planning"
      );
      break;

    case "Inconsistent Responder":
      primary =
        "Help the candidate establish consistent pacing and consider breaking longer assessments into manageable sections.";
      focusAreas.push("Pacing strategies", "Focus maintenance", "Section management");
      break;

    case "Review-Oriented":
      primary =
        "Encourage structured review habits so answer changes are deliberate and evidence-based rather than uncertain.";
      focusAreas.push(
        "Review discipline",
        "Decision confidence",
        "Evidence-based checking"
      );
      break;

    default:
      primary =
        "Provide balanced support with regular check-ins on progress. Continue to monitor performance patterns.";
      focusAreas.push(
        "Consistent performance",
        "Regular feedback",
        "Progress monitoring"
      );
  }

  if (Number(timingMetrics.avg_response_time_seconds || 0) > 60) {
    focusAreas.push("Time management strategies");
  }

  if (
    Number(answerMetrics.first_instinct_accuracy || 0) > 80 &&
    Number(answerMetrics.total_answer_changes || 0) > 3
  ) {
    focusAreas.push("Trusting first instincts");

    if (!primary.toLowerCase().includes("first instinct")) {
      primary +=
        " First-choice consistency is high; encourage the candidate to review carefully without unnecessary second-guessing.";
    }
  }

  if (
    Number(answerMetrics.improvement_rate || 0) < 30 &&
    Number(answerMetrics.total_answer_changes || 0) > 0
  ) {
    focusAreas.push("Effective reviewing strategies");

    if (!primary.toLowerCase().includes("review")) {
      primary +=
        " Answer changes do not consistently improve outcomes, so review strategy should be strengthened.";
    }
  }

  if (Number(fatigueMetrics.fatigue_factor || 0) > 30) {
    focusAreas.push("Break management", "Fatigue prevention");

    primary +=
      " A slowing pace was detected later in the assessment, so structured breaks may help in longer assessments.";
  }

  return {
    primary,
    focusAreas: [...new Set(focusAreas)]
  };
}

/**
 * Display summary helper.
 */
export function getBehavioralSummary(behavioralData) {
  if (!behavioralData) return null;

  return {
    work_style: behavioralData.work_style,
    confidence: behavioralData.confidence_level,
    attention: behavioralData.attention_span,
    decision_pattern: behavioralData.decision_pattern,

    avg_response_time_seconds: behavioralData.avg_response_time_seconds,
    median_response_time_seconds: behavioralData.median_response_time_seconds,
    fastest_response_seconds: behavioralData.fastest_response_seconds,
    slowest_response_seconds: behavioralData.slowest_response_seconds,
    total_time_spent_seconds: behavioralData.total_time_spent_seconds,

    total_answer_changes: behavioralData.total_answer_changes,
    avg_changes_per_question: behavioralData.avg_changes_per_question,
    improvement_rate: behavioralData.improvement_rate,
    first_instinct_accuracy: behavioralData.first_instinct_accuracy,

    total_question_visits: behavioralData.total_question_visits,
    revisit_rate: behavioralData.revisit_rate,
    skipped_questions: behavioralData.skipped_questions,
    linearity_score: behavioralData.linearity_score,

    first_half_avg_time: behavioralData.first_half_avg_time,
    second_half_avg_time: behavioralData.second_half_avg_time,
    fatigue_factor: behavioralData.fatigue_factor,

    recommended_support: behavioralData.recommended_support,
    focus_areas: behavioralData.development_focus_areas
  };
}

export default {
  calculateBehavioralMetrics,
  getBehavioralSummary
};
