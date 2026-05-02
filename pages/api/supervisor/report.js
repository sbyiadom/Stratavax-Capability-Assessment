// pages/api/supervisor/report.js

import { createClient } from "@supabase/supabase-js";

/*
  Supervisor Report API

  Query examples:
  /api/supervisor/report?user_id=USER_ID&assessment_id=ASSESSMENT_ID
  /api/supervisor/report?user_id=USER_ID&assessment=ASSESSMENT_ID

  This file is intentionally written in syntax-safe JavaScript:
  - no optional chaining
  - no default parameters
  - no arrow functions
  - no duplicated exports
  - no partial fragments
*/

// ======================================================
// BASIC HELPERS
// ======================================================

function toNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);

  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) {
    return fallbackValue;
  }

  return numberValue;
}

function roundNumber(value, decimals) {
  var decimalPlaces = decimals === undefined ? 2 : decimals;
  var factor = Math.pow(10, decimalPlaces);

  return Math.round(toNumber(value, 0) * factor) / factor;
}

function firstValue(values, fallback) {
  var i;

  if (!Array.isArray(values)) {
    return fallback;
  }

  for (i = 0; i < values.length; i += 1) {
    if (values[i] !== undefined && values[i] !== null && values[i] !== "") {
      return values[i];
    }
  }

  return fallback;
}

function getObjectValue(objectValue, key, fallback) {
  if (
    objectValue &&
    typeof objectValue === "object" &&
    objectValue[key] !== undefined &&
    objectValue[key] !== null &&
    objectValue[key] !== ""
  ) {
    return objectValue[key];
  }

  return fallback;
}

function getNestedValue(objectValue, path, fallback) {
  var parts;
  var current;
  var i;

  if (!objectValue || !path) {
    return fallback;
  }

  parts = path.split(".");
  current = objectValue;

  for (i = 0; i < parts.length; i += 1) {
    if (
      current === null ||
      current === undefined ||
      current[parts[i]] === undefined ||
      current[parts[i]] === null
    ) {
      return fallback;
    }

    current = current[parts[i]];
  }

  if (current === "") {
    return fallback;
  }

  return current;
}

// ======================================================
// INTERPRETATION HELPERS
// ======================================================

function getClassification(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 85) {
    return "Exceptional";
  }

  if (value >= 75) {
    return "Strong Performer";
  }

  if (value >= 65) {
    return "Capable Contributor";
  }

  if (value >= 55) {
    return "Developing";
  }

  if (value >= 40) {
    return "At Risk";
  }

  return "High Risk";
}

function getScoreComment(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 85) {
    return "Exceptional performance with strong evidence of readiness.";
  }

  if (value >= 75) {
    return "Strong performance with reliable capability.";
  }

  if (value >= 65) {
    return "Adequate performance with some areas requiring reinforcement.";
  }

  if (value >= 55) {
    return "Developing performance requiring structured support.";
  }

  if (value >= 40) {
    return "Priority development is required.";
  }

  return "Critical development support is required.";
}

function getSupervisorImplication(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 75) {
    return "The candidate can likely perform reliably with standard supervision, while still benefiting from role-specific reinforcement.";
  }

  if (value >= 65) {
    return "The candidate can perform with guidance, coaching, and reinforcement in weaker areas.";
  }

  if (value >= 55) {
    return "The candidate requires structured support, close follow-up, and practical coaching before being relied upon independently.";
  }

  return "The candidate requires close supervision, targeted development, and careful validation before being assigned critical responsibilities.";
}

function getRiskLevel(percentage) {
  var value = toNumber(percentage, 0);

  if (value >= 75) {
    return "Low";
  }

  if (value >= 65) {
    return "Moderate";
  }

  if (value >= 55) {
    return "Elevated";
  }

  if (value >= 40) {
    return "High";
  }

  return "Critical";
}

// ======================================================
// RESPONSE FIELD HELPERS
// ======================================================

function getResponseScore(response) {
  if (!response) {
    return 0;
  }

  return toNumber(
    firstValue(
      [
        getObjectValue(response, "score", null),
        getObjectValue(response, "selected_score", null),
        getObjectValue(response, "answer_score", null),
        getObjectValue(response, "points", null),
        getObjectValue(response, "value", null),
        getNestedValue(response, "answer.score", null),
        getNestedValue(response, "unique_answers.score", null),
        getNestedValue(response, "selected_answer.score", null)
      ],
      0
    ),
    0
  );
}

function getResponseMaxScore(response) {
  if (!response) {
    return 5;
  }

  return toNumber(
    firstValue(
      [
        getObjectValue(response, "max_score", null),
        getObjectValue(response, "maxScore", null),
        getObjectValue(response, "max_points", null),
        getObjectValue(response, "max", null),
        getNestedValue(response, "question.max_score", null),
        getNestedValue(response, "unique_questions.max_score", null),
        getNestedValue(response, "question.maxScore", null),
        getNestedValue(response, "unique_questions.maxScore", null)
      ],
      5
    ),
    5
  );
}

function getResponseCategory(response) {
  if (!response) {
    return "General";
  }

  return firstValue(
    [
      getObjectValue(response, "category", null),
      getObjectValue(response, "competency", null),
      getObjectValue(response, "dimension", null),
      getObjectValue(response, "section", null),
      getObjectValue(response, "area", null),
      getNestedValue(response, "question.category", null),
      getNestedValue(response, "question.competency", null),
      getNestedValue(response, "question.dimension", null),
      getNestedValue(response, "unique_questions.category", null),
      getNestedValue(response, "unique_questions.competency", null),
      getNestedValue(response, "unique_questions.dimension", null)
    ],
    "General"
  );
}

function getResponseQuestionText(response) {
  if (!response) {
    return "";
  }

  return firstValue(
    [
      getObjectValue(response, "question_text", null),
      getObjectValue(response, "question", null),
      getNestedValue(response, "question.question_text", null),
      getNestedValue(response, "question.text", null),
      getNestedValue(response, "unique_questions.question_text", null),
      getNestedValue(response, "unique_questions.text", null)
    ],
    ""
  );
}

function getResponseAnswerText(response) {
  if (!response) {
    return "";
  }

  return firstValue(
    [
      getObjectValue(response, "answer_text", null),
      getObjectValue(response, "selected_answer_text", null),
      getNestedValue(response, "answer.answer_text", null),
      getNestedValue(response, "answer.text", null),
      getNestedValue(response, "unique_answers.answer_text", null),
      getNestedValue(response, "unique_answers.text", null),
      getNestedValue(response, "selected_answer.answer_text", null),
      getNestedValue(response, "selected_answer.text", null)
    ],
    ""
  );
}

function getResponseTime(response) {
  if (!response) {
    return 0;
  }

  return toNumber(
    firstValue(
      [
        getObjectValue(response, "time_spent_seconds", null),
        getObjectValue(response, "time_spent", null),
        getObjectValue(response, "duration_seconds", null),
        getObjectValue(response, "response_time_seconds", null)
      ],
      0
    ),
    0
  );
}

function getResponseChanges(response) {
  if (!response) {
    return 0;
  }

  return toNumber(
    firstValue(
      [
        getObjectValue(response, "times_changed", null),
        getObjectValue(response, "changes", null),
        getObjectValue(response, "answer_changes", null),
        getObjectValue(response, "revision_count", null)
      ],
      0
    ),
    0
  );
}

// ======================================================
// CANDIDATE AND ASSESSMENT HELPERS
// ======================================================

function getCandidateName(candidate, userId) {
  if (!candidate) {
    return "Candidate";
  }

  return firstValue(
    [
      getObjectValue(candidate, "full_name", null),
      getObjectValue(candidate, "name", null),
      getObjectValue(candidate, "display_name", null),
      getObjectValue(candidate, "email", null),
      getObjectValue(candidate, "candidate_name", null)
    ],
    userId || "Candidate"
  );
}

function getAssessmentName(assessment) {
  if (!assessment) {
    return "Assessment";
  }

  return firstValue(
    [
      getObjectValue(assessment, "title", null),
      getObjectValue(assessment, "name", null),
      getObjectValue(assessment, "assessment_name", null),
      getObjectValue(assessment, "description", null)
    ],
    "Assessment"
  );
}

// ======================================================
// SUPABASE QUERY HELPERS
// ======================================================

async function selectRows(supabase, tableName, configureQuery, selectText) {
  var query;
  var result;

  try {
    query = supabase.from(tableName).select(selectText || "*");

    if (typeof configureQuery === "function") {
      query = configureQuery(query);
    }

    result = await query;

    if (result.error) {
      return {
        data: [],
        error: result.error.message
      };
    }

    return {
      data: Array.isArray(result.data) ? result.data : [],
      error: null
    };
  } catch (error) {
    return {
      data: [],
      error: error && error.message ? error.message : "Query failed"
    };
  }
}

async function selectSingle(supabase, tableName, configureQuery, selectText) {
  var query;
  var result;

  try {
    query = supabase.from(tableName).select(selectText || "*");

    if (typeof configureQuery === "function") {
      query = configureQuery(query);
    }

    query = query.limit(1);
    result = await query;

    if (result.error) {
      return null;
    }

    if (Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0];
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ======================================================
// DATA FETCHING
// ======================================================

async function fetchCandidate(supabase, userId) {
  var candidate;

  candidate = await selectSingle(supabase, "profiles", function (query) {
    return query.eq("id", userId);
  });

  if (candidate) {
    return candidate;
  }

  candidate = await selectSingle(supabase, "profiles", function (query) {
    return query.eq("user_id", userId);
  });

  if (candidate) {
    return candidate;
  }

  candidate = await selectSingle(supabase, "users", function (query) {
    return query.eq("id", userId);
  });

  if (candidate) {
    return candidate;
  }

  candidate = await selectSingle(supabase, "candidates", function (query) {
    return query.eq("user_id", userId);
  });

  if (candidate) {
    return candidate;
  }

  candidate = await selectSingle(supabase, "candidates", function (query) {
    return query.eq("id", userId);
  });

  if (candidate) {
    return candidate;
  }

  return {
    id: userId,
    name: "Candidate"
  };
}

async function fetchAssessment(supabase, assessmentId) {
  var assessment;

  if (!assessmentId) {
    return null;
  }

  assessment = await selectSingle(supabase, "assessments", function (query) {
    return query.eq("id", assessmentId);
  });

  if (assessment) {
    return assessment;
  }

  assessment = await selectSingle(supabase, "unique_assessments", function (query) {
    return query.eq("id", assessmentId);
  });

  if (assessment) {
    return assessment;
  }

  return null;
}

async function fetchSessions(supabase, userId, assessmentId) {
  var tableNames;
  var i;
  var result;

  if (!userId || !assessmentId) {
    return [];
  }

  tableNames = ["assessment_sessions", "sessions", "candidate_sessions"];

  for (i = 0; i < tableNames.length; i += 1) {
    result = await selectRows(
      supabase,
      tableNames[i],
      function (query) {
        return query.eq("user_id", userId).eq("assessment_id", assessmentId);
      },
      "*"
    );

    if (result.data.length > 0) {
      return result.data;
    }
  }

  return [];
}

async function fetchResponses(supabase, userId, assessmentId) {
  var selectWithJoins;
  var directWithJoins;
  var directPlain;
  var sessions;
  var sessionIds;
  var bySessionWithJoins;
  var bySessionPlain;
  var fallbackWithJoins;
  var fallbackPlain;

  selectWithJoins = "*, unique_answers(*), unique_questions(*)";

  if (assessmentId) {
    directWithJoins = await selectRows(
      supabase,
      "responses",
      function (query) {
        return query.eq("user_id", userId).eq("assessment_id", assessmentId);
      },
      selectWithJoins
    );

    if (directWithJoins.data.length > 0) {
      return {
        responses: directWithJoins.data,
        source: "responses.user_id_and_assessment_id_with_joins"
      };
    }

    directPlain = await selectRows(
      supabase,
      "responses",
      function (query) {
        return query.eq("user_id", userId).eq("assessment_id", assessmentId);
      },
      "*"
    );

    if (directPlain.data.length > 0) {
      return {
        responses: directPlain.data,
        source: "responses.user_id_and_assessment_id_plain"
      };
    }

    sessions = await fetchSessions(supabase, userId, assessmentId);

    sessionIds = sessions
      .map(function (session) {
        return session.id;
      })
      .filter(function (id) {
        return id !== undefined && id !== null && id !== "";
      });

    if (sessionIds.length > 0) {
      bySessionWithJoins = await selectRows(
        supabase,
        "responses",
        function (query) {
          return query.eq("user_id", userId).in("session_id", sessionIds);
        },
        selectWithJoins
      );

      if (bySessionWithJoins.data.length > 0) {
        return {
          responses: bySessionWithJoins.data,
          source: "responses.session_id_with_joins"
        };
      }

      bySessionPlain = await selectRows(
        supabase,
        "responses",
        function (query) {
          return query.eq("user_id", userId).in("session_id", sessionIds);
        },
        "*"
      );

      if (bySessionPlain.data.length > 0) {
        return {
          responses: bySessionPlain.data,
          source: "responses.session_id_plain"
        };
      }
    }
  }

  fallbackWithJoins = await selectRows(
    supabase,
    "responses",
    function (query) {
      return query.eq("user_id", userId);
    },
    selectWithJoins
  );

  if (fallbackWithJoins.data.length > 0) {
    return {
      responses: fallbackWithJoins.data,
      source: "responses.user_id_fallback_with_joins"
    };
  }

  fallbackPlain = await selectRows(
    supabase,
    "responses",
    function (query) {
      return query.eq("user_id", userId);
    },
    "*"
  );

  return {
    responses: fallbackPlain.data,
    source: "responses.user_id_fallback_plain"
  };
}

// ======================================================
// REPORT BUILDING
// ======================================================

function buildBehavioralInsights(responses) {
  var totalTime = 0;
  var totalChanges = 0;
  var averageTime = 0;
  var averageChanges = 0;
  var count = responses.length;
  var note = "";

  responses.forEach(function (response) {
    totalTime += getResponseTime(response);
    totalChanges += getResponseChanges(response);
  });

  if (count > 0) {
    averageTime = roundNumber(totalTime / count, 2);
    averageChanges = roundNumber(totalChanges / count, 2);
  }

  if (averageTime > 75) {
    note += "Response time suggests careful processing or possible uncertainty. ";
  }

  if (averageChanges > 1.5) {
    note += "Frequent answer changes suggest possible second-guessing or low confidence. ";
  }

  if (!note) {
    note = "Response behavior does not show major timing or answer-change concerns.";
  }

  return {
    totalTimeSpent: roundNumber(totalTime, 2),
    totalChanges: roundNumber(totalChanges, 2),
    averageTimePerQuestion: averageTime,
    averageChangesPerQuestion: averageChanges,
    note: note
  };
}

function buildCategoryScores(responses) {
  var grouped = {};

  responses.forEach(function (response) {
    var category = getResponseCategory(response);
    var score = getResponseScore(response);
    var maxScore = getResponseMaxScore(response);
    var timeSpent = getResponseTime(response);
    var changes = getResponseChanges(response);

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        name: category,
        totalScore: 0,
        maxScore: 0,
        questionCount: 0,
        totalTimeSpent: 0,
        totalChanges: 0,
        answers: []
      };
    }

    grouped[category].totalScore += score;
    grouped[category].maxScore += maxScore;
    grouped[category].questionCount += 1;
    grouped[category].totalTimeSpent += timeSpent;
    grouped[category].totalChanges += changes;

    grouped[category].answers.push({
      question: getResponseQuestionText(response),
      answer: getResponseAnswerText(response),
      score: score,
      maxScore: maxScore,
      timeSpent: timeSpent,
      changes: changes
    });
  });

  return Object.keys(grouped).map(function (key) {
    var item = grouped[key];
    var percentage =
      item.maxScore > 0
        ? roundNumber((item.totalScore / item.maxScore) * 100, 2)
        : 0;

    return {
      category: item.category,
      name: item.name,
      totalScore: roundNumber(item.totalScore, 2),
      maxScore: roundNumber(item.maxScore, 2),
      questionCount: item.questionCount,
      percentage: percentage,
      classification: getClassification(percentage),
      comment: getScoreComment(percentage),
      supervisorImplication: getSupervisorImplication(percentage),
      riskLevel: getRiskLevel(percentage),
      averageTimePerQuestion:
        item.questionCount > 0
          ? roundNumber(item.totalTimeSpent / item.questionCount, 2)
          : 0,
      averageChangesPerQuestion:
        item.questionCount > 0
          ? roundNumber(item.totalChanges / item.questionCount, 2)
          : 0,
      answers: item.answers
    };
  });
}

function buildRecommendations(categoryScores) {
  var recommendations = [];
  var developmentAreas;
  var strengths;

  developmentAreas = categoryScores
    .filter(function (item) {
      return toNumber(item.percentage, 0) < 65;
    })
    .sort(function (a, b) {
      return toNumber(a.percentage, 0) - toNumber(b.percentage, 0);
    })
    .slice(0, 5);

  developmentAreas.forEach(function (area) {
    var percentage = toNumber(area.percentage, 0);
    var priority = "Medium";

    if (percentage < 40) {
      priority = "Critical";
    } else if (percentage < 55) {
      priority = "High";
    }

    recommendations.push({
      priority: priority,
      competency: area.name,
      category: area.name,
      currentScore: percentage,
      gap: percentage < 80 ? roundNumber(80 - percentage, 2) : 0,
      recommendation:
        area.name +
        " requires development attention. The supervisor should provide targeted coaching, practical exercises, and follow-up checks.",
      action:
        "Create a short development plan for " +
        area.name +
        " and review progress with the candidate after practical assignments.",
      impact:
        "Improving this area will increase role readiness, consistency, and confidence in work-related decisions."
    });
  });

  strengths = categoryScores
    .filter(function (item) {
      return toNumber(item.percentage, 0) >= 75;
    })
    .sort(function (a, b) {
      return toNumber(b.percentage, 0) - toNumber(a.percentage, 0);
    })
    .slice(0, 3);

  strengths.forEach(function (area) {
    recommendations.push({
      priority: "Leverage",
      competency: area.name,
      category: area.name,
      currentScore: area.percentage,
      gap: 0,
      recommendation:
        area.name +
        " is a strength. The supervisor can use this area to support confidence, contribution, and role performance.",
      action:
        "Assign role-relevant tasks that allow the candidate to apply " +
        area.name +
        " in real work situations.",
      impact:
        "Using this strength can improve candidate contribution and development momentum.",
      isStrength: true
    });
  });

  return recommendations;
}

function buildReport(candidate, assessment, responses, userId, assessmentId, source) {
  var totalScore = 0;
  var maxScore = 0;
  var percentage = 0;
  var classification = "";
  var categoryScores = [];
  var strengths = [];
  var developmentAreas = [];
  var recommendations = [];
  var behavioralInsights;
  var candidateName;
  var assessmentName;
  var summary;

  responses.forEach(function (response) {
    totalScore += getResponseScore(response);
    maxScore += getResponseMaxScore(response);
  });

  if (maxScore > 0) {
    percentage = roundNumber((totalScore / maxScore) * 100, 2);
  }

  classification = getClassification(percentage);
  categoryScores = buildCategoryScores(responses);
  behavioralInsights = buildBehavioralInsights(responses);

  strengths = categoryScores
    .filter(function (item) {
      return toNumber(item.percentage, 0) >= 75;
    })
    .sort(function (a, b) {
      return toNumber(b.percentage, 0) - toNumber(a.percentage, 0);
    })
    .slice(0, 3);

  developmentAreas = categoryScores
    .filter(function (item) {
      return toNumber(item.percentage, 0) < 65;
    })
    .sort(function (a, b) {
      return toNumber(a.percentage, 0) - toNumber(b.percentage, 0);
    })
    .slice(0, 3);

  recommendations = buildRecommendations(categoryScores);
  candidateName = getCandidateName(candidate, userId);
  assessmentName = getAssessmentName(assessment);

  summary =
    candidateName +
    " completed the " +
    assessmentName +
    ". The overall score is " +
    percentage +
    "%, classified as " +
    classification +
    ". " +
    getScoreComment(percentage);

  return {
    candidateName: candidateName,
    candidate_name: candidateName,
    assessmentName: assessmentName,
    assessment_name: assessmentName,
    userId: userId,
    user_id: userId,
    assessmentId: assessmentId || null,
    assessment_id: assessmentId || null,

    totalScore: roundNumber(totalScore, 2),
    total_score: roundNumber(totalScore, 2),
    maxScore: roundNumber(maxScore, 2),
    max_score: roundNumber(maxScore, 2),
    percentage: percentage,
    overallPercentage: percentage,
    overall_score: percentage,
    classification: classification,
    overallClassification: classification,
    riskLevel: getRiskLevel(percentage),

    summary: summary,
    executiveSummary: summary,
    overallAssessment: summary,
    interpretation: summary,
    supervisorImplication: getSupervisorImplication(percentage),

    behavioralInsights: behavioralInsights,
    behavioralSummary: behavioralInsights,

    categoryScores: categoryScores,
    category_scores: categoryScores,
    competencyScores: categoryScores,
    competency_scores: categoryScores,

    strengths: strengths,
    topStrengths: strengths,
    developmentAreas: developmentAreas,
    topDevelopmentNeeds: developmentAreas,
    recommendations: recommendations,

    responseCount: responses.length,
    response_count: responses.length,
    dataSource: source
  };
}

// ======================================================
// API HANDLER
// ======================================================

export default async function handler(req, res) {
  var userId;
  var assessmentId;
  var supabaseUrl;
  var supabaseKey;
  var supabase;
  var candidate;
  var assessment;
  var responseResult;
  var responses;
  var generatedReport;

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  userId = req.query.user_id || req.query.userId;
  assessmentId =
    req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing user_id"
    });
  }

  supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error:
        "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    });
  }

  supabase = createClient(supabaseUrl, supabaseKey);

  try {
    candidate = await fetchCandidate(supabase, userId);
    assessment = await fetchAssessment(supabase, assessmentId);
    responseResult = await fetchResponses(supabase, userId, assessmentId);
    responses = responseResult.responses;

    if (!responses || responses.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No responses found for this candidate and assessment.",
        user_id: userId,
        assessment_id: assessmentId || null,
        dataSource: responseResult.source
      });
    }

    generatedReport = buildReport(
      candidate,
      assessment,
      responses,
      userId,
      assessmentId,
      responseResult.source
    );

    return res.status(200).json({
      success: true,
      candidate: candidate,
      assessment: assessment,
      generatedReport: generatedReport,
      report: generatedReport,
      responseCount: responses.length,
      dataSource: responseResult.source
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error:
        error && error.message
          ? error.message
          : "Failed to generate supervisor report."
    });
  }
}
