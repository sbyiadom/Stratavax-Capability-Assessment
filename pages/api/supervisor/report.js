// pages/api/supervisor/report.js

import { createClient } from", null),import { createClient } from "@supabase/supabase-js";
      getNestedValue(response, "question.dimension", null)
    ],
    "General"
  );
}

function getResponseQuestionText(response) {
  return firstDefined(
    [
      response.question_text,
      getNestedValue(response, "unique_questions.question_text", null),
      getNestedValue(response, "question.question_text", null),
      getNestedValue(response, "unique_questions.text", null),
      getNestedValue(response, "question.text", null)
    ],
    ""
  );
}

function getResponseAnswerText(response) {
  return firstDefined(
    [
      response.answer_text,
      getNestedValue(response, "unique_answers.answer_text", null),
      getNestedValue(response, "answer.answer_text", null),
      getNestedValue(response, "unique_answers.text", null),
      getNestedValue(response, "answer.text", null)
    ],
    ""
  );
}

function getCandidateName(candidate, userId) {
  if (!candidate) return "Candidate";

  return firstDefined(
    [
      candidate.full_name,
      candidate.name,
      candidate.display_name,
      candidate.email,
      candidate.candidate_name
    ],
    userId || "Candidate"
  );
}

async function trySelectRows(supabase, tableName, configureQuery, selectText) {
  try {
    let query = supabase.from(tableName).select(selectText || "*");

    query = configureQuery(query);

    const result = await query;

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

async function trySelectSingle(supabase, tableName, configureQuery) {
  try {
    let query = supabase.from(tableName).select("*");

    query = configureQuery(query).limit(1);

    const result = await query;

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

async function fetchCandidate(supabase, userId) {
  const profile = await trySelectSingle(supabase, "profiles", function (query) {
    return query.eq("id", userId);
  });

  if (profile) return profile;

  const user = await trySelectSingle(supabase, "users", function (query) {
    return query.eq("id", userId);
  });

  if (user) return user;

  const candidate = await trySelectSingle(supabase, "candidates", function (query) {
    return query.eq("user_id", userId);
  });

  if (candidate) return candidate;

  return {
    id: userId,
    name: "Candidate"
  };
}

async function fetchAssessment(supabase, assessmentId) {
  if (!assessmentId) return null;

  const assessment = await trySelectSingle(supabase, "assessments", function (query) {
    return query.eq("id", assessmentId);
  });

  return assessment;
}

async function fetchSessions(supabase, userId, assessmentId) {
  if (!assessmentId) return [];

  const tableNames = ["assessment_sessions", "sessions", "candidate_sessions"];

  for (let i = 0; i < tableNames.length; i += 1) {
    const result = await trySelectRows(
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
  const selectWithJoins = "*, unique_answers(*), unique_questions(*)";

  if (assessmentId) {
    const directWithAssessment = await trySelectRows(
      supabase,
      "responses",
      function (query) {
        return query.eq("user_id", userId).eq("assessment_id", assessmentId);
      },
      selectWithJoins
    );

    if (directWithAssessment.data.length > 0) {
      return {
        responses: directWithAssessment.data,
        source: "responses.assessment_id"
      };
    }

    const directPlain = await trySelectRows(
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
        source: "responses.assessment_id_plain"
      };
    }

    const sessions = await fetchSessions(supabase, userId, assessmentId);
    const sessionIds = sessions
      .map(function (session) {
        return session.id;
      })
      .filter(function (id) {
        return id !== undefined && id !== null && id !== "";
      });

    if (sessionIds.length > 0) {
      const bySessionWithJoins = await trySelectRows(
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
          source: "responses.session_id"
        };
      }

      const bySessionPlain = await trySelectRows(
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

  const fallbackWithJoins = await trySelectRows(
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
      source: "responses.user_id_fallback"
    };
  }

  const fallbackPlain = await trySelectRows(
    supabase,
    "responses",
    function (query) {
      return query.eq("user_id", userId);
    },
    "*"
  );

  return {
    responses: fallbackPlain.data,
    source: "responses.user_id_plain_fallback"
  };
}

function buildCategoryScores(responses) {
  const grouped = {};

  responses.forEach(function (response) {
    const category = getResponseCategory(response);
    const score = getResponseScore(response);
    const maxScore = getResponseMaxScore(response);

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        name: category,
        totalScore: 0,
        maxScore: 0,
        questionCount: 0,
        answers: []
      };
    }

    grouped[category].totalScore += score;
    grouped[category].maxScore += maxScore;
    grouped[category].questionCount += 1;
    grouped[category].answers.push({
      question: getResponseQuestionText(response),
      answer: getResponseAnswerText(response),
      score: score,
      maxScore: maxScore
    });
  });

  return Object.keys(grouped).map(function (key) {
    const item = grouped[key];
    const percentage =
      item.maxScore > 0 ? roundNumber((item.totalScore / item.maxScore) * 100, 2) : 0;

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
      answers: item.answers
    };
  });
}

function buildRecommendations(categoryScores) {
  const recommendations = [];

  const developmentAreas = categoryScores
    .filter(function (item) {
      return safeNumber(item.percentage, 0) < 65;
    })
    .sort(function (a, b) {
      return safeNumber(a.percentage, 0) - safeNumber(b.percentage, 0);
    })
    .slice(0, 5);

  developmentAreas.forEach(function (area) {
    const percentage = safeNumber(area.percentage, 0);

    let priority = "Medium";

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

  const strengths = categoryScores
    .filter(function (item) {
      return safeNumber(item.percentage, 0) >= 75;
    })
    .sort(function (a, b) {
      return safeNumber(b.percentage, 0) - safeNumber(a.percentage, 0);
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
  const totalScore = responses.reduce(function (sum, response) {
    return sum + getResponseScore(response);
  }, 0);

  const maxScore = responses.reduce(function (sum, response) {
    return sum + getResponseMaxScore(response);
  }, 0);

  const percentage =
    maxScore > 0 ? roundNumber((totalScore / maxScore) * 100, 2) : 0;

  const classification = getClassification(percentage);
  const categoryScores = buildCategoryScores(responses);

  const strengths = categoryScores
    .filter(function (item) {
      return safeNumber(item.percentage, 0) >= 75;
    })
    .sort(function (a, b) {
      return safeNumber(b.percentage, 0) - safeNumber(a.percentage, 0);
    })
    .slice(0, 3);

  const developmentAreas = categoryScores
    .filter(function (item) {
      return safeNumber(item.percentage, 0) < 65;
    })
    .sort(function (a, b) {
      return safeNumber(a.percentage, 0) - safeNumber(b.percentage, 0);
    })
    .slice(0, 3);

  const recommendations = buildRecommendations(categoryScores);

  const candidateName = getCandidateName(candidate, userId);
  const assessmentName = assessment
    ? firstDefined([assessment.title, assessment.name, assessment.assessment_name], "Assessment")
    : "Assessment";

  const summary =
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

    summary: summary,
    executiveSummary: summary,
    overallAssessment: summary,
    interpretation: summary,
    supervisorImplication: getSupervisorImplication(percentage),

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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const userId = req.query.user_id || req.query.userId;
  const assessmentId =
    req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  if (!userId) {
    return res.status(400).json({
      error: "Missing user_id"
    });
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error:
        "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const candidate = await fetchCandidate(supabase, userId);
    const assessment = await fetchAssessment(supabase, assessmentId);

    const responseResult = await fetchResponses(supabase, userId, assessmentId);
    const responses = responseResult.responses;

    if (!responses || responses.length === 0) {
      return res.status(404).json({
        error: "No responses found for this candidate and assessment.",
        user_id: userId,
        assessment_id: assessmentId || null
      });
    }

    const generatedReport = buildReport(
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
      error:
        error && error.message
          ? error.message
          : "Failed to generate supervisor report."
    });
  }
}

function safeNumber(value, fallback) {
  const defaultValue = fallback === undefined ? 0 : fallback;
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
}

function roundNumber(value, decimals) {
  const d = decimals === undefined ? 2 : decimals;
  const factor = Math.pow(10, d);

  return Math.round(safeNumber(value, 0) * factor) / factor;
}

function firstDefined(values, fallback) {
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== undefined && values[i] !== null && values[i] !== "") {
      return values[i];
    }
  }

  return fallback;
}

function getNestedValue(object, path, fallback) {
  if (!object) return fallback;

  const parts = path.split(".");
  let current = object;

  for (let i = 0; i < parts.length; i += 1) {
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

  return current;
}

function getClassification(percentage) {
  const value = safeNumber(percentage, 0);

  if (value >= 85) return "Exceptional";
  if (value >= 75) return "Strong Performer";
  if (value >= 65) return "Capable Contributor";
  if (value >= 55) return "Developing";
  if (value >= 40) return "At Risk";

  return "High Risk";
}

function getScoreComment(percentage) {
  const value = safeNumber(percentage, 0);

  if (value >= 85) return "Exceptional performance with strong evidence of readiness.";
  if (value >= 75) return "Strong performance with reliable capability.";
  if (value >= 65) return "Adequate performance with some areas for reinforcement.";
  if (value >= 55) return "Developing performance requiring structured support.";
  if (value >= 40) return "Priority development is required.";

  return "Critical development support is required.";
}

function getSupervisorImplication(percentage) {
  const value = safeNumber(percentage, 0);

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

function getResponseScore(response) {
  return safeNumber(
    firstDefined(
      [
        getNestedValue(response, "unique_answers.score", null),
        getNestedValue(response, "answer.score", null),
        response.score,
        response.selected_score,
        response.value
      ],
      0
    ),
    0
  );
}

function getResponseMaxScore(response) {
  return safeNumber(
    firstDefined(
      [
        getNestedValue(response, "unique_questions.max_score", null),
        getNestedValue(response, "question.max_score", null),
        response.max_score,
        response.maxScore,
        response.max
      ],
      5
    ),
    5
  );
}

function getResponseCategory(response) {
  return firstDefined(
    [
      response.category,
      response.competency,
      response.dimension,
      getNestedValue(response, "unique_questions.category", null),
      getNestedValue(response, "unique_questions.competency", null),
      getNestedValue(response, "unique_questions.dimension", null),
      getNestedValue(response, "question.category", null),
