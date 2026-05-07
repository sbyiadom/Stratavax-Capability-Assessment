// pages/api/supervisor/reset-assessment.js

import { createClient } from "@supabase/supabase-js";

/*
  PLATFORM-WIDE SUPERVISOR RESET (SINGLE) - HOTFIXED
  --------------------------------------------------
  Purpose:
  - Reset ONE candidate assessment for a clean retake.
  - Delete all attempt-related data for the selected candidate + assessment.
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

function getRequestValue(body, keys) {
  if (!body || typeof body !== "object") return null;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") return body[key];
  }
  return null;
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

function addSummary(summary, table, action, ok, message, count = null) {
  summary.push({ table, action, ok, message: message || "", count });
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

async function fetchSessionIds(serviceClient, summary, userId, assessmentId) {
  try {
    const response = await serviceClient
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (response.error) {
      addSummary(summary, "assessment_sessions", "select", false, response.error.message || "Failed to fetch session IDs", null);
      return [];
    }

    const ids = safeArray(response.data).map((row) => row && row.id).filter(Boolean);
    addSummary(summary, "assessment_sessions", "select", true, "Fetched session IDs", ids.length);
    return ids;
  } catch (error) {
    addSummary(summary, "assessment_sessions", "select", false, error && error.message ? error.message : "Failed to fetch session IDs", null);
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
        addSummary(summary, tableName, "delete", true, label + " (missing table/column skipped safely)", 0);
        return true;
      }

      addSummary(summary, tableName, "delete", false, label + ": " + (response.error.message || "Delete failed"), null);
      return false;
    }

    addSummary(summary, tableName, "delete", true, label, response.count === undefined ? null : response.count);
    return true;
  } catch (error) {
    if (!required && isMissingTableOrColumnError(error)) {
      addSummary(summary, tableName, "delete", true, label + " (missing table/column skipped safely)", 0);
      return true;
    }

    addSummary(summary, tableName, "delete", false, label + ": " + (error && error.message ? error.message : "Delete exception"), null);
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
        addSummary(summary, "candidate_assessments", "optional_update", true, "Optional field skipped: " + column, 0);
        return true;
      }

      addSummary(summary, "candidate_assessments", "optional_update", false, "Optional field failed: " + column + " - " + response.error.message, null);
      return false;
    }

    addSummary(summary, "candidate_assessments", "optional_update", true, "Optional field reset: " + column, null);
    return true;
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      addSummary(summary, "candidate_assessments", "optional_update", true, "Optional field skipped: " + column, 0);
      return true;
    }

    addSummary(summary, "candidate_assessments", "optional_update", false, "Optional field exception: " + column + " - " + (error && error.message ? error.message : "Unknown"), null);
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
    addSummary(summary, "candidate_assessments", "update", true, "Assignment reset to unblocked", 1);
    return true;
  }

  if (updateResponse.error) {
    addSummary(summary, "candidate_assessments", "update", false, updateResponse.error.message || "Assignment reset update failed", null);
    return false;
  }

  // If no row exists, create a clean assignment row.
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
    addSummary(summary, "candidate_assessments", "insert", false, insertResponse.error.message || "Assignment insert failed", null);
    return false;
  }

  addSummary(summary, "candidate_assessments", "insert", true, "Assignment created as unblocked", 1);
  return true;
}

async function createAuditLog(serviceClient, summary, userId, assessmentId, performedBy) {
  try {
    const response = await serviceClient.from("assessment_audit_logs").insert({
      user_id: userId,
      assessment_id: assessmentId,
      action: "reset",
      performed_by: performedBy || "supervisor_or_admin",
      timestamp: nowIso(),
      details: "Assessment reset. Responses, results, sessions, progress, violations, behavioral metrics, timing, and personality scores cleared where available."
    });

    if (response.error) {
      if (isMissingTableOrColumnError(response.error)) {
        addSummary(summary, "assessment_audit_logs", "insert", true, "Audit table missing; skipped safely", 0);
        return true;
      }

      addSummary(summary, "assessment_audit_logs", "insert", false, response.error.message || "Audit insert failed", null);
      return false;
    }

    addSummary(summary, "assessment_audit_logs", "insert", true, "Audit log created", null);
    return true;
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      addSummary(summary, "assessment_audit_logs", "insert", true, "Audit table missing; skipped safely", 0);
      return true;
    }

    addSummary(summary, "assessment_audit_logs", "insert", false, error && error.message ? error.message : "Audit insert exception", null);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed", message: "Method not allowed" });
  }

  const resetSummary = [];

  try {
    const serviceClient = getServiceClient();

    const authCheck = await requireSupervisor(serviceClient, req);
    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ success: false, error: authCheck.error, message: authCheck.message, resetSummary });
    }

    const userId = getRequestValue(req.body, ["userId", "user_id", "candidateId", "candidate_id"]);
    const assessmentId = getRequestValue(req.body, ["assessmentId", "assessment_id"]);

    if (!userId || !assessmentId) {
      return res.status(400).json({
        success: false,
        error: "missing_required_fields",
        message: "userId and assessmentId are required.",
        resetSummary
      });
    }

    const sessionIds = await fetchSessionIds(serviceClient, resetSummary, userId, assessmentId);

    // Session-linked cleanup first.
    if (sessionIds.length > 0) {
      await safeDelete(serviceClient, resetSummary, "answer_history", [{ column: "session_id", op: "in", value: sessionIds }], "Answer history cleared");
      await safeDelete(serviceClient, resetSummary, "question_timing", [{ column: "session_id", op: "in", value: sessionIds }], "Question timing cleared");
      await safeDelete(serviceClient, resetSummary, "candidate_personality_scores", [{ column: "session_id", op: "in", value: sessionIds }], "Candidate personality scores cleared");
      await safeDelete(serviceClient, resetSummary, "assessment_results", [{ column: "session_id", op: "in", value: sessionIds }], "Assessment results cleared by session_id");
    }

    // Candidate + assessment cleanup.
    const responsesOk = await safeDelete(
      serviceClient,
      resetSummary,
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
      resetSummary,
      "assessment_results",
      [
        { column: "user_id", value: userId },
        { column: "assessment_id", value: assessmentId }
      ],
      "Assessment results cleared by user_id",
      true
    );

    await safeDelete(serviceClient, resetSummary, "assessment_violations", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Violations cleared");

    await safeDelete(serviceClient, resetSummary, "assessment_progress", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Progress cleared");

    await safeDelete(serviceClient, resetSummary, "behavioral_metrics", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Behavioral metrics cleared");

    await safeDelete(serviceClient, resetSummary, "assessment_reports", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Generated reports cleared");

    await safeDelete(serviceClient, resetSummary, "assessment_classifications", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment classifications cleared");

    const sessionsOk = await safeDelete(
      serviceClient,
      resetSummary,
      "assessment_sessions",
      [
        { column: "user_id", value: userId },
        { column: "assessment_id", value: assessmentId }
      ],
      "Assessment sessions cleared",
      true
    );

    const assignmentOk = await resetCandidateAssessmentRow(serviceClient, resetSummary, userId, assessmentId);

    // Optional confirmed schema fields only. These are safe based on your column list.
    await updateOptionalCandidateField(serviceClient, resetSummary, userId, assessmentId, "time_extension_minutes", null);
    await updateOptionalCandidateField(serviceClient, resetSummary, userId, assessmentId, "original_time_limit", null);
    await updateOptionalCandidateField(serviceClient, resetSummary, userId, assessmentId, "extended_until", null);
    await updateOptionalCandidateField(serviceClient, resetSummary, userId, assessmentId, "is_scheduled", false);
    await updateOptionalCandidateField(serviceClient, resetSummary, userId, assessmentId, "scheduled_start", null);
    await updateOptionalCandidateField(serviceClient, resetSummary, userId, assessmentId, "scheduled_end", null);

    await createAuditLog(serviceClient, resetSummary, userId, assessmentId, authCheck.user && authCheck.user.email ? authCheck.user.email : authCheck.user.id);

    if (!responsesOk || !resultsOk || !sessionsOk || !assignmentOk) {
      return res.status(500).json({
        success: false,
        error: "reset_failed",
        message: "Reset did not fully complete. Review resetSummary.",
        userId,
        assessmentId,
        resetSummary
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assessment reset successfully. Candidate can retake the assessment.",
      userId,
      assessmentId,
      resetSummary
    });
  } catch (error) {
    console.error("reset-assessment fatal error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error && error.message ? error.message : "Unexpected server error while resetting assessment.",
      resetSummary
    });
  }
}
