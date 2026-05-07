// pages/api/supervisor/bulk-reset-assessments.js

import { createClient } from "@supabase/supabase-js";

/*
  PLATFORM-WIDE SUPERVISOR RESET (BULK)
  ------------------------------------
  Goal:
  - Supervisor/Admin can bulk reset candidate assessments for clean retakes.
  - Deletes ALL attempt data (responses, sessions, progress, violations, behavioral metrics, personality scores, timing, history, results).
  - Resets candidate_assessments back to UNBLOCKED.

  Security:
  - Requires Authorization: Bearer <supabase_jwt>
  - JWT user must have role supervisor/admin (user_metadata.role)
  - Uses SERVICE ROLE key for deletes/updates.

  Request body:
  {
    dryRun?: boolean,
    confirmBulkReset?: boolean (required when dryRun=false),
    items: [ { userId|user_id|candidateId|candidate_id, assessmentId|assessment_id } ]
  }

  Response:
  {
    success,
    dryRun,
    total,
    totalDeduped,
    successful,
    failed,
    results: [ { userId, assessmentId, reset, dryRun, resetSummary|wouldDelete|error } ]
  }
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
    const k = names[i];
    if (object[k] !== undefined && object[k] !== null && object[k] !== "") return object[k];
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function requireSupervisor(serviceClient, req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (!String(authHeader).startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "missing_token", message: "Authorization Bearer token is required" };
  }

  const token = String(authHeader).replace("Bearer ", "").trim();
  const userResp = await serviceClient.auth.getUser(token);
  const user = userResp?.data?.user || null;

  if (userResp.error || !user) {
    return { ok: false, status: 401, error: "invalid_token", message: "Invalid or expired token" };
  }

  const role = user.user_metadata?.role || user.app_metadata?.role || null;
  if (role !== "supervisor" && role !== "admin") {
    return { ok: false, status: 403, error: "forbidden", message: "Supervisor/Admin role required" };
  }

  return { ok: true, user };
}

function isMissingTableError(err) {
  const msg = err && (err.message || err.details || "") ? String(err.message || err.details) : "";
  return msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation") && msg.toLowerCase().includes("does not exist");
}

async function safeCount(serviceClient, tableName, filters) {
  try {
    let q = serviceClient.from(tableName).select("*", { count: "exact", head: true });
    for (let i = 0; i < filters.length; i += 1) {
      const f = filters[i];
      if (f.op === "in") q = q.in(f.column, f.value);
      else q = q.eq(f.column, f.value);
    }
    const res = await q;
    if (res.error) return 0;
    return res.count || 0;
  } catch {
    return 0;
  }
}


async function deleteRows(serviceClient, summary, tableName, filters, label, required = false) {
  try {
    let q = serviceClient.from(tableName).delete({ count: "exact" });
    for (let i = 0; i < filters.length; i += 1) {
      const f = filters[i];
      if (f.op === "in") q = q.in(f.column, f.value);
      else q = q.eq(f.column, f.value);
    }
    const res = await q;

    if (res.error) {
      if (!required && isMissingTableError(res.error)) {
        summary.steps.push({ table: tableName, action: "delete", ok: true, message: label + " (table missing – skipped)", count: 0 });
        return true;
      }
      summary.steps.push({ table: tableName, action: "delete", ok: false, message: label + ": " + (res.error.message || "delete failed"), count: null });
      return false;
    }

    summary.steps.push({ table: tableName, action: "delete", ok: true, message: label, count: res.count ?? null });
    return true;
  } catch (err) {
    if (!required && isMissingTableError(err)) {
      summary.steps.push({ table: tableName, action: "delete", ok: true, message: label + " (table missing – skipped)", count: 0 });
      return true;
    }
    summary.steps.push({ table: tableName, action: "delete", ok: false, message: label + ": " + (err && err.message ? err.message : "delete exception"), count: null });
    return false;
  }
}

async function fetchSessionIds(serviceClient, summary, userId, assessmentId) {
  try {
    const res = await serviceClient
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (res.error) {
      summary.steps.push({ table: "assessment_sessions", action: "select", ok: false, message: res.error.message || "failed to fetch session ids", count: null });
      return [];
    }

    const ids = safeArray(res.data).map((r) => r && r.id).filter(Boolean);
    summary.steps.push({ table: "assessment_sessions", action: "select", ok: true, message: "Fetched session IDs", count: ids.length });
    return ids;
  } catch (err) {
    summary.steps.push({ table: "assessment_sessions", action: "select", ok: false, message: err && err.message ? err.message : "failed to fetch session ids", count: null });
    return [];
  }
}

async function resetCandidateAssessmentsRow(serviceClient, summary, userId, assessmentId) {
  const ts = nowIso();

  const updatePayload = {
    status: "unblocked",
    session_id: null,
    session_status: null,
    result_id: null,
    completed_at: null,
    unblocked_at: ts,
    updated_at: ts
  };

  const upd = await serviceClient
    .from("candidate_assessments")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .select("id")
    .maybeSingle();

  if (!upd.error && upd.data && upd.data.id) {
    summary.steps.push({ table: "candidate_assessments", action: "update", ok: true, message: "candidate_assessments set to unblocked", count: 1 });
    return true;
  }

  if (upd.error && !isMissingTableError(upd.error)) {
    summary.steps.push({ table: "candidate_assessments", action: "update", ok: false, message: upd.error.message || "update failed", count: null });
  }

  const ins = await serviceClient
    .from("candidate_assessments")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      status: "unblocked",
      session_id: null,
      result_id: null,
      completed_at: null,
      unblocked_at: ts,
      created_at: ts,
      updated_at: ts
    })
    .select("id")
    .maybeSingle();

  if (ins.error) {
    summary.steps.push({ table: "candidate_assessments", action: "insert", ok: false, message: ins.error.message || "insert failed", count: null });
    return false;
  }

  summary.steps.push({ table: "candidate_assessments", action: "insert", ok: true, message: "candidate_assessments created as unblocked", count: 1 });
  return true;
}

async function dryRunOne(serviceClient, userId, assessmentId) {
  const summary = {
    userId,
    assessmentId,
    dryRun: true,
    wouldDelete: {},
    reset: true
  };

  const sessionIds = await fetchSessionIds(serviceClient, { steps: [] }, userId, assessmentId);

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

  // session-linked deletes
  if (sessionIds.length > 0) {
    await deleteRows(serviceClient, summary, "answer_history", [{ column: "session_id", op: "in", value: sessionIds }], "Answer history cleared");
    await deleteRows(serviceClient, summary, "question_timing", [{ column: "session_id", op: "in", value: sessionIds }], "Question timing cleared");
    await deleteRows(serviceClient, summary, "candidate_personality_scores", [{ column: "session_id", op: "in", value: sessionIds }], "Candidate personality scores cleared");
    await deleteRows(serviceClient, summary, "assessment_results", [{ column: "session_id", op: "in", value: sessionIds }], "Assessment results cleared by session_id");
  }

  // required deletes
  const responsesOk = await deleteRows(
    serviceClient,
    summary,
    "responses",
    [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }],
    "Responses cleared",
    true
  );

  const resultsOk = await deleteRows(
    serviceClient,
    summary,
    "assessment_results",
    [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }],
    "Assessment results cleared by user_id",
    true
  );

  // optional deletes
  await deleteRows(serviceClient, summary, "assessment_violations", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], "Violations cleared");
  await deleteRows(serviceClient, summary, "assessment_progress", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], "Progress cleared");
  await deleteRows(serviceClient, summary, "behavioral_metrics", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], "Behavioral metrics cleared");
  await deleteRows(serviceClient, summary, "assessment_reports", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], "Generated reports cleared");
  await deleteRows(serviceClient, summary, "assessment_classifications", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], "Assessment classifications cleared");

  // sessions last (required)
  const sessionsOk = await deleteRows(
    serviceClient,
    summary,
    "assessment_sessions",
    [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }],
    "Assessment sessions cleared",
    true
  );

  // assignment reset (required)
  const assignmentOk = await resetCandidateAssessmentsRow(serviceClient, summary, userId, assessmentId);

  summary.reset = Boolean(responsesOk && resultsOk && sessionsOk && assignmentOk);

  if (!summary.reset) {
    summary.error = "Reset did not fully complete (responses/results/sessions/assignment).";
  }

  return summary;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  try {
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

    const serviceClient = getServiceClient();

    // Enforce supervisor/admin
    const authCheck = await requireSupervisor(serviceClient, req);
    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ success: false, error: authCheck.error, message: authCheck.message });
    }

    const results = [];

    // Sequential processing keeps the DB load predictable.
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      const userId = it.userId;
      const assessmentId = it.assessmentId;

      try {
        if (dryRun) results.push(await dryRunOne(serviceClient, userId, assessmentId));
        else results.push(await resetOne(serviceClient, userId, assessmentId));
      } catch (err) {
        results.push({
          userId,
          assessmentId,
          dryRun,
          reset: false,
          error: err && err.message ? err.message : "Unexpected reset error"
        });
      }
    }

    const successful = results.filter((r) => r && r.reset === true).length;
    const failed = results.length - successful;

    return res.status(200).json({
      success: failed === 0,
      dryRun,
      total: results.length,
      totalDeduped: items.length,
      successful,
      failed,
      results
    });
  } catch (err) {
    console.error("bulk-reset fatal error:", err);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: err && err.message ? err.message : "Unexpected server error"
    });
  }
}
