// pages/api/supervisor/assessment-reset-candidates.js

import { createClient } from "@supabase/supabase-js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "";
  return String(value);
}

function getBodyValue(body, keys) {
  var i;
  if (!body || typeof body !== "object") return null;
  for (i = 0; i < keys.length; i += 1) {
    if (body[keys[i]] !== undefined && body[keys[i]] !== null && body[keys[i]] !== "") return body[keys[i]];
  }
  return null;
}

function unique(values) {
  var seen = {};
  var output = [];
  safeArray(values).forEach(function (value) {
    if (value && !seen[value]) {
      seen[value] = true;
      output.push(value);
    }
  });
  return output;
}

function countByKey(rows, keyName) {
  var map = {};
  safeArray(rows).forEach(function (row) {
    var key = row && row[keyName] ? row[keyName] : null;
    if (key) map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function mapById(rows, idName) {
  var map = {};
  safeArray(rows).forEach(function (row) {
    if (row && row[idName]) map[row[idName]] = row;
  });
  return map;
}

async function safeSelect(supabase, tableName, selectText, assessmentId) {
  var result;
  try {
    result = await supabase.from(tableName).select(selectText).eq("assessment_id", assessmentId);
    if (result.error) return [];
    return safeArray(result.data);
  } catch (error) {
    return [];
  }
}

async function getAssignments(supabase, assessmentId) {
  var result;

  result = await supabase
    .from("candidate_assessments")
    .select("id,user_id,assessment_id,status,created_at,unblocked_at,result_id,completed_at,session_id,session_status")
    .eq("assessment_id", assessmentId);

  if (!result.error) return { data: safeArray(result.data), error: null };

  result = await supabase
    .from("candidate_assessments")
    .select("id,user_id,assessment_id,status,created_at,unblocked_at,result_id")
    .eq("assessment_id", assessmentId);

  if (result.error) return { data: [], error: result.error };
  return { data: safeArray(result.data), error: null };
}

function matchesMode(candidate, mode) {
  if (mode === "completed") return candidate.isCompleted === true;
  if (mode === "incomplete") return candidate.hasActivity === true && candidate.isCompleted !== true;
  if (mode === "ready") return candidate.isCompleted !== true && candidate.hasActivity !== true && candidate.assignmentStatus === "unblocked";
  return true;
}

export default async function handler(req, res) {
  var assessmentId;
  var mode;
  var supabase;
  var assignmentResult;
  var assignments;
  var userIds;
  var profilesResult;
  var profileMap;
  var resultsRows;
  var responsesRows;
  var sessionsUserRows;
  var sessionsCandidateRows;
  var progressRows;
  var resultMap;
  var responseCounts;
  var sessionUserCounts;
  var sessionCandidateCounts;
  var progressCounts;
  var candidates;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    assessmentId = getBodyValue(req.body, ["assessmentId", "assessment_id"]);
    mode = safeText(getBodyValue(req.body, ["mode", "filterMode", "candidateMode"]), "all").toLowerCase();
    if (["all", "completed", "incomplete", "ready"].indexOf(mode) < 0) mode = "all";

    if (!assessmentId) {
      return res.status(400).json({ success: false, error: "missing_assessment_id", message: "assessmentId is required." });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: "server_config_error", message: "Supabase environment variables are missing." });
    }

    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    assignmentResult = await getAssignments(supabase, assessmentId);
    if (assignmentResult.error) {
      return res.status(500).json({ success: false, error: "candidate_assessments_query_failed", message: assignmentResult.error.message });
    }

    assignments = assignmentResult.data;
    userIds = unique(assignments.map(function (item) { return item.user_id; }));

    if (userIds.length === 0) {
      return res.status(200).json({ success: true, assessmentId: assessmentId, mode: mode, count: 0, candidates: [] });
    }

    profilesResult = await supabase
      .from("candidate_profiles")
      .select("id,full_name,email,phone,supervisor_id,created_at")
      .in("id", userIds);

    profileMap = profilesResult.error ? {} : mapById(profilesResult.data, "id");

    resultsRows = await safeSelect(supabase, "assessment_results", "id,user_id,assessment_id,total_score,max_score,percentage_score,completed_at,is_valid", assessmentId);
    responsesRows = await safeSelect(supabase, "responses", "id,user_id,assessment_id", assessmentId);
    sessionsUserRows = await safeSelect(supabase, "assessment_sessions", "id,user_id,assessment_id,status,completed_at", assessmentId);
    sessionsCandidateRows = await safeSelect(supabase, "assessment_sessions", "id,candidate_id,assessment_id,status,completed_at", assessmentId);
    progressRows = await safeSelect(supabase, "assessment_progress", "id,user_id,assessment_id", assessmentId);

    resultMap = mapById(resultsRows, "user_id");
    responseCounts = countByKey(responsesRows, "user_id");
    sessionUserCounts = countByKey(sessionsUserRows, "user_id");
    sessionCandidateCounts = countByKey(sessionsCandidateRows, "candidate_id");
    progressCounts = countByKey(progressRows, "user_id");

    candidates = assignments.map(function (assignment) {
      var profile = profileMap[assignment.user_id] || {};
      var result = resultMap[assignment.user_id] || null;
      var responseCount = responseCounts[assignment.user_id] || 0;
      var sessionCount = (sessionUserCounts[assignment.user_id] || 0) + (sessionCandidateCounts[assignment.user_id] || 0);
      var progressCount = progressCounts[assignment.user_id] || 0;
      var hasResult = result !== null;
      var isCompleted = hasResult || assignment.status === "completed" || !!assignment.result_id || !!assignment.completed_at;
      var hasActivity = responseCount > 0 || sessionCount > 0 || progressCount > 0 || !!assignment.session_id;

      return {
        userId: assignment.user_id,
        candidateId: assignment.user_id,
        assessmentId: assessmentId,
        assignmentId: assignment.id,
        fullName: profile.full_name || "Unnamed Candidate",
        email: profile.email || "No email provided",
        phone: profile.phone || "",
        assignmentStatus: assignment.status || "unknown",
        completedAt: assignment.completed_at || (result && result.completed_at ? result.completed_at : null),
        resultId: assignment.result_id || (result && result.id ? result.id : null),
        hasResult: hasResult,
        isCompleted: isCompleted,
        hasActivity: hasActivity,
        responseCount: responseCount,
        sessionCount: sessionCount,
        progressCount: progressCount,
        resetCategory: isCompleted ? "completed" : hasActivity ? "incomplete" : assignment.status === "unblocked" ? "ready" : "assigned"
      };
    }).filter(function (candidate) {
      return matchesMode(candidate, mode);
    });

    candidates.sort(function (a, b) {
      return safeText(a.fullName, "").localeCompare(safeText(b.fullName, ""));
    });

    return res.status(200).json({ success: true, assessmentId: assessmentId, mode: mode, count: candidates.length, candidates: candidates });
  } catch (error) {
    console.error("assessment-reset-candidates error:", error);
    return res.status(500).json({ success: false, error: "server_error", message: error && error.message ? error.message : "Unexpected server error." });
  }
}
