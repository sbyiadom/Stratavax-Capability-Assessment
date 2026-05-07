// pages/api/supervisor/bulk-reset-assessments.js

import { createClient } from "@supabase/supabase-js";

/*
  PLATFORM-WIDE SUPERVISOR RESET (BULK) - HOTFIXED
  ------------------------------------------------
  Purpose:
  - Bulk reset candidate assessments for clean retakes.
  - Delete all attempt-related data for each selected candidate + assessment.
  - Clear behavioral metrics and session-linked behavioral tracking.
  - Reset candidate_assessments to a clean retake state.

  Hotfix reason:
  - Your candidate_assessments table DOES NOT have session_status.
  - Any update payload containing session_status fails completely in Supabase/PostgREST.
  - This file updates only confirmed existing columns in the required reset step.
  - Optional columns are updated separately and safely.

  Required candidate_assessments reset columns used here:
  - status
  - session_id
  - result_id
  - completed_at
  - unblocked_at
  - updated_at
  - started_at
  - score

  Security:
  - Requires Authorization: Bearer <Supabase access token>
  - User must have role supervisor/admin in user_metadata or app_metadata.
  - Uses SUPABASE_SERVICE_ROLE_KEY server-side for cleanup.
*/

function nowIso() {
  return new Date().toISOString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getValue(object, names) {
  if (!object || typeof object !== "object") return null;
  for (let i = 0; i < names.length; i += 1) {
    const key = names[i];
    if (object[key] !== undefined && object[key] !== null && object[key] !== "") return object[key];
  }
  return null;
}

function dedupeItems(items) {
  const seen = {};
  const output = [];

  safeArray(items).forEach((item) => {
    const userId = getValue(item, ["userId", "user_id", "candidateId", "candidate_id"]);
    const assessmentId = getValue(item, ["assessmentId", "assessment_id"]);

    if (!userId || !assessmentId) return;

    const key = String(userId) + "::" + String(assessmentId);
    if (seen[key]) return;

    seen[key] = true;
    output.push({ userId, assessmentId });
  });

  return output;
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function isMissingTableOrColumnError(error) {
  const msg = error && (error.message || error.details || error.hint || "") ? String(error.message || error.details || error.hint) : "";
  const lower = msg.toLowerCase();
  return lower.includes("does not exist") || lower.includes("could not find") || lower.includes("schema cache");
}

async function requireSupervisor(serviceClient, req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";

  if (!String(authHeader).startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "missing_token", message: "Authorization Bearer token is required." };
  }

  const token = String(authHeader).replace("Bearer ", "").trim();
  const userResponse = await serviceClient.auth.getUser(token);
  const user = userResponse && userResponse.data ? userResponse.data.user : null;

  if (userResponse.error || !user) {
    return { ok: false, status: 401, error: "invalid_token", message: "Invalid or expired token." };
  }

  const role = (user.user_metadata && user.user_metadata.role) || (user.app_metadata && user.app_metadata.role) || null;

  if (role !== "supervisor" && role !== "admin") {
    return { ok: false, status: 403, error: "forbidden", message: "Supervisor/Admin role required." };
  }

  return { ok: true, user };
}

function addStep(summary, table, action, ok, message, count = null) {
  summary.steps.push({ table, action, ok, message: message || "", count });
}

async function safeCount(serviceClient, tableName, filters) {
  try {
    let query = serviceClient.from(tableName).select("*", { count: "exact", head: true });

    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];
      if (!filter) continue;
      if (filter.op === "in") query = query.in(filter.column, filter.value);
      else query = query.eq(filter.column, filter.value);
    }

    const response = await query;
    if (response.error) return 0;
    return response.count || 0;
  } catch (error) {
    return 0;
  }
}

async function fetchSessionIds(serviceClient, summary, userId, assessmentId) {
  try {
    const response = await serviceClient
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (response.error) {
      addStep(summary, "assessment_sessions", "select", false, response.error.message || "Failed to fetch session IDs", null);
      return [];
    }

    const ids = safeArray(response.data).map((row) => row && row.id).filter(Boolean);
    addStep(summary, "assessment_sessions", "select", true, "Fetched session IDs", ids.length);
    return ids;
  } catch (error) {
    addStep(summary, "assessment_sessions", "select", false, error && error.message ? error.message : "Failed to fetch session IDs", null);
    return [];
  }
}

async function safeDelete(serviceClient, summary, tableName, filters, label, required = false) {
  try {
    let query = serviceClient.from(tableName).delete({ count: "exact" });

    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];
      if (!filter) continue;
      if (filter.op === "in") query = query.in(filter.column, filter.value);
      else query = query.eq(filter.column, filter.value);
    }

    const response = await query;

    if (response.error) {
      if (!required && isMissingTableOrColumnError(response.error)) {
        addStep(summary, tableName, "delete", true, label + " (missing table/column skipped safely)", 0);
        return true;
      }

      addStep(summary, tableName, "delete", false, label + ": " + (response.error.message || "Delete failed"), null);
      return false;
    }

    addStep(summary, tableName, "delete", true, label, response.count === undefined ? null : response.count);
    return true;
  } catch (error) {
    if (!required && isMissingTableOrColumnError(error)) {
      addStep(summary, tableName, "delete", true, label + " (missing table/column skipped safely)", 0);
      return true;
    }

    addStep(summary, tableName, "delete", false, label + ": " + (error && error.message ? error.message : "Delete exception"), null);
    return false;
  }
}

async function updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, column, value) {
  try {
    const payload = {};
    payload[column] = value;

    const response = await serviceClient
      .from("candidate_assessments")
      .update(payload)
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (response.error) {
      if (isMissingTableOrColumnError(response.error)) {
        addStep(summary, "candidate_assessments", "optional_update", true, "Optional field skipped: " + column, 0);
        return true;
      }

      addStep(summary, "candidate_assessments", "optional_update", false, "Optional field failed: " + column + " - " + response.error.message, null);
      return false;
    }

    addStep(summary, "candidate_assessments", "optional_update", true, "Optional field reset: " + column, null);
    return true;
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      addStep(summary, "candidate_assessments", "optional_update", true, "Optional field skipped: " + column, 0);
      return true;
    }

    addStep(summary, "candidate_assessments", "optional_update", false, "Optional field exception: " + column + " - " + (error && error.message ? error.message : "Unknown"), null);
    return false;
  }
}

async function resetCandidateAssessmentRow(serviceClient, summary, userId, assessmentId) {
  const timestamp = nowIso();

  const requiredPayload = {
    status: "unblocked",
    session_id: null,
    result_id: null,
    completed_at: null,
    unblocked_at: timestamp,
    updated_at: timestamp,
    started_at: null,
    score: null
  };

  const updateResponse = await serviceClient
    .from("candidate_assessments")
    .update(requiredPayload)
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .select("id,status,session_id,result_id,completed_at,unblocked_at,updated_at")
    .maybeSingle();

  if (!updateResponse.error && updateResponse.data && updateResponse.data.id) {
    addStep(summary, "candidate_assessments", "update", true, "Assignment reset to unblocked", 1);
    return true;
  }

  if (updateResponse.error) {
    addStep(summary, "candidate_assessments", "update", false, updateResponse.error.message || "Assignment reset update failed", null);
    return false;
  }

  const insertResponse = await serviceClient
    .from("candidate_assessments")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      status: "unblocked",
      session_id: null,
      result_id: null,
      completed_at: null,
      unblocked_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("id,status,session_id,result_id,completed_at,unblocked_at,updated_at")
    .maybeSingle();

  if (insertResponse.error) {
    addStep(summary, "candidate_assessments", "insert", false, insertResponse.error.message || "Assignment insert failed", null);
    return false;
  }

  addStep(summary, "candidate_assessments", "insert", true, "Assignment created as unblocked", 1);
  return true;
}

async function dryRunOne(serviceClient, userId, assessmentId) {
  const summary = {
    userId,
    assessmentId,
    dryRun: true,
    reset: true,
    sessionIds: [],
    wouldDelete: {}
  };

  const tempSummary = { steps: [] };
  const sessionIds = await fetchSessionIds(serviceClient, tempSummary, userId, assessmentId);
  summary.sessionIds = sessionIds;

  summary.wouldDelete.answer_history = sessionIds.length > 0 ? await safeCount(serviceClient, "answer_history", [{ column: "session_id", op: "in", value: sessionIds }]) : 0;
  summary.wouldDelete.question_timing = sessionIds.length > 0 ? await safeCount(serviceClient, "question_timing", [{ column: "session_id", op: "in", value: sessionIds }]) : 0;
  summary.wouldDelete.candidate_personality_scores = sessionIds.length > 0 ? await safeCount(serviceClient, "candidate_personality_scores", [{ column: "session_id", op: "in", value: sessionIds }]) : 0;
  summary.wouldDelete.responses = await safeCount(serviceClient, "responses", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.assessment_results = await safeCount(serviceClient, "assessment_results", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.assessment_sessions = await safeCount(serviceClient, "assessment_sessions", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.assessment_progress = await safeCount(serviceClient, "assessment_progress", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.assessment_violations = await safeCount(serviceClient, "assessment_violations", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.behavioral_metrics = await safeCount(serviceClient, "behavioral_metrics", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.assessment_reports = await safeCount(serviceClient, "assessment_reports", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);
  summary.wouldDelete.assessment_classifications = await safeCount(serviceClient, "assessment_classifications", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]);

  return summary;
}

async function resetOne(serviceClient, userId, assessmentId) {
  const summary = {
    userId,
    assessmentId,
    dryRun: false,
    reset: false,
    steps: []
  };

  const sessionIds = await fetchSessionIds(serviceClient, summary, userId, assessmentId);

  if (sessionIds.length > 0) {
    await safeDelete(serviceClient, summary, "answer_history", [{ column: "session_id", op: "in", value: sessionIds }], "Answer history cleared");
    await safeDelete(serviceClient, summary, "question_timing", [{ column: "session_id", op: "in", value: sessionIds }], "Question timing cleared");
    await safeDelete(serviceClient, summary, "candidate_personality_scores", [{ column: "session_id", op: "in", value: sessionIds }], "Candidate personality scores cleared");
    await safeDelete(serviceClient, summary, "assessment_results", [{ column: "session_id", op: "in", value: sessionIds }], "Assessment results cleared by session_id");
  }

  const responsesOk = await safeDelete(
    serviceClient,
    summary,
    "responses",
    [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ],
    "Responses cleared",
    true
  );

  const resultsOk = await safeDelete(
    serviceClient,
    summary,
    "assessment_results",
    [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ],
    "Assessment results cleared by user_id",
    true
  );

  await safeDelete(serviceClient, summary, "assessment_violations", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Violations cleared");

  await safeDelete(serviceClient, summary, "assessment_progress", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Progress cleared");

  await safeDelete(serviceClient, summary, "behavioral_metrics", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Behavioral metrics cleared");

  await safeDelete(serviceClient, summary, "assessment_reports", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Generated reports cleared");

  await safeDelete(serviceClient, summary, "assessment_classifications", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Assessment classifications cleared");

  const sessionsOk = await safeDelete(
    serviceClient,
    summary,
    "assessment_sessions",
    [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ],
    "Assessment sessions cleared",
    true
  );

  const assignmentOk = await resetCandidateAssessmentRow(serviceClient, summary, userId, assessmentId);

  await updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, "time_extension_minutes", null);
  await updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, "original_time_limit", null);
  await updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, "extended_until", null);
  await updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, "is_scheduled", false);
  await updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, "scheduled_start", null);
  await updateOptionalCandidateField(serviceClient, summary, userId, assessmentId, "scheduled_end", null);

  summary.reset = Boolean(responsesOk && resultsOk && sessionsOk && assignmentOk);

  if (!summary.reset) {
    summary.error = "Reset did not fully complete. Required cleanup or assignment reset failed.";
  }

  return summary;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed", message: "Method not allowed" });
  }

  try {
    const serviceClient = getServiceClient();

    const authCheck = await requireSupervisor(serviceClient, req);
    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ success: false, error: authCheck.error, message: authCheck.message });
    }

    const body = req.body || {};
    const dryRun = body.dryRun === true;
    const confirmBulkReset = body.confirmBulkReset === true;
    const items = dedupeItems(body.items || body.resetItems || []);

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: "no_items", message: "No valid reset items provided." });
    }

    if (!dryRun && !confirmBulkReset) {
      return res.status(400).json({ success: false, error: "missing_confirmation", message: "confirmBulkReset must be true for a real reset." });
    }

    const results = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];

      try {
        if (dryRun) {
          results.push(await dryRunOne(serviceClient, item.userId, item.assessmentId));
        } else {
          results.push(await resetOne(serviceClient, item.userId, item.assessmentId));
        }
      } catch (error) {
        results.push({
          userId: item.userId,
          assessmentId: item.assessmentId,
          dryRun,
          reset: false,
          error: error && error.message ? error.message : "Unexpected reset error."
        });
      }
    }

    const successful = results.filter((item) => item && item.reset === true).length;
    const failed = results.length - successful;

    return res.status(failed === 0 ? 200 : 207).json({
      success: failed === 0,
      dryRun,
      total: results.length,
      totalDeduped: items.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error("bulk-reset fatal error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error && error.message ? error.message : "Unexpected server error while bulk resetting assessments."
    });
  }
}
