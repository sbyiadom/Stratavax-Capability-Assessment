// pages/api/supervisor/reset-assessment.js

import { createClient } from "@supabase/supabase-js";

/*
  PLATFORM-WIDE SUPERVISOR RESET (SINGLE)
  -------------------------------------
  Goal:
  - Supervisor can reset a candidate's assessment for a clean retake.
  - All attempt data is deleted (including behavioral metrics).
  - Candidate assignment remains, but is set back to UNBLOCKED.

  Why this exists:
  - If candidate_assessments remains "completed" or assessment_results still exists,
    the candidate dashboard and supervisor dashboard will continue to show "Completed".
  - If responses/history remain, the UI will show "Changed answer" on first selection.

  Security:
  - Requires a valid supervisor/admin Supabase JWT (Authorization: Bearer <token>)
  - Uses SERVICE ROLE key for the actual deletes/updates (bypasses RLS)

  Request body:
  {
    userId | user_id | candidateId | candidate_id: UUID,
    assessmentId | assessment_id: UUID
  }

  Response:
  { success, message, userId, assessmentId, resetSummary }
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
    const k = keys[i];
    if (body[k] !== undefined && body[k] !== null && body[k] !== "") return body[k];
  }
  return null;
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

function add(summary, table, action, ok, message, count = null) {
  summary.push({ table, action, ok, message: message || "", count });
}

function isMissingTableError(err) {
  const msg = err && (err.message || err.details || "") ? String(err.message || err.details) : "";
  return msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation") && msg.toLowerCase().includes("does not exist");
}

async function safeDelete(serviceClient, summary, table, whereClauses, label, required = false) {
  try {
    let q = serviceClient.from(table).delete({ count: "exact" });
    for (let i = 0; i < whereClauses.length; i += 1) {
      const c = whereClauses[i];
      if (!c) continue;
      if (c.op === "in") q = q.in(c.column, c.value);
      else q = q.eq(c.column, c.value);
    }

    const res = await q;

    if (res.error) {
      if (!required && isMissingTableError(res.error)) {
        add(summary, table, "delete", true, `${label} (table missing – skipped)`, 0);
        return true;
      }
      add(summary, table, "delete", false, `${label}: ${res.error.message || "delete failed"}`, null);
      return false;
    }

    add(summary, table, "delete", true, label, res.count ?? null);
    return true;
  } catch (err) {
    if (!required && isMissingTableError(err)) {
      add(summary, table, "delete", true, `${label} (table missing – skipped)`, 0);
      return true;
    }
    add(summary, table, "delete", false, `${label}: ${err && err.message ? err.message : "delete exception"}`, null);
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
      add(summary, "assessment_sessions", "select", false, res.error.message || "failed to fetch session ids", null);
      return [];
    }

    const ids = safeArray(res.data).map((r) => r && r.id).filter(Boolean);
    add(summary, "assessment_sessions", "select", true, "Fetched session IDs", ids.length);
    return ids;
  } catch (err) {
    add(summary, "assessment_sessions", "select", false, err && err.message ? err.message : "failed to fetch session ids", null);
    return [];
  }
}

async function resetCandidateAssessmentsRow(serviceClient, summary, userId, assessmentId) {
  const ts = nowIso();

  // Update first
  const updatePayload = {
    status: "unblocked",
    session_id: null,
    session_status: null,
    result_id: null,
    completed_at: null,
    unblocked_at: ts,
    updated_at: ts
  };

  // Use select to know if row existed
  const upd = await serviceClient
    .from("candidate_assessments")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .select("id")
    .maybeSingle();

  if (!upd.error && upd.data && upd.data.id) {
    add(summary, "candidate_assessments", "update", true, "candidate_assessments set to unblocked", 1);
    return true;
  }

  if (upd.error && !isMissingTableError(upd.error)) {
    // If update failed for real reason, record it
    add(summary, "candidate_assessments", "update", false, upd.error.message || "update failed", null);
  }

  // Insert fallback if no row
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
    add(summary, "candidate_assessments", "insert", false, ins.error.message || "insert failed", null);
    return false;
  }

  add(summary, "candidate_assessments", "insert", true, "candidate_assessments created as unblocked", 1);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  const resetSummary = [];

  try {
    const serviceClient = getServiceClient();

    // Enforce supervisor/admin
    const authCheck = await requireSupervisor(serviceClient, req);
    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ success: false, error: authCheck.error, message: authCheck.message });
    }

    const userId = getRequestValue(req.body, ["userId", "user_id", "candidateId", "candidate_id"]);
    const assessmentId = getRequestValue(req.body, ["assessmentId", "assessment_id"]);

    if (!userId || !assessmentId) {
      return res.status(400).json({
        success: false,
        error: "missing_required_fields",
        message: "userId and assessmentId are required"
      });
    }

    // 1) Gather sessions for session-linked cleanup
    const sessionIds = await fetchSessionIds(serviceClient, resetSummary, userId, assessmentId);

    // 2) Delete session-linked tables first
    if (sessionIds.length > 0) {
      await safeDelete(serviceClient, resetSummary, "answer_history", [{ column: "session_id", op: "in", value: sessionIds }], "Answer history cleared");
      await safeDelete(serviceClient, resetSummary, "question_timing", [{ column: "session_id", op: "in", value: sessionIds }], "Question timing cleared");
      await safeDelete(serviceClient, resetSummary, "candidate_personality_scores", [{ column: "session_id", op: "in", value: sessionIds }], "Candidate personality scores cleared");
      await safeDelete(serviceClient, resetSummary, "assessment_results", [{ column: "session_id", op: "in", value: sessionIds }], "Assessment results cleared by session_id");
    }

    // 3) Delete user+assessment attempt tables
    // REQUIRED deletions (must succeed for a clean platform reset)
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

    // Delete results by user+assessment (THIS is critical for dashboards)
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

    // 4) Delete sessions last
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

    // 5) Reset candidate_assessments row (required)
    const assignmentOk = await resetCandidateAssessmentsRow(serviceClient, resetSummary, userId, assessmentId);

    // Hard fail if core pieces failed
    if (!responsesOk || !resultsOk || !sessionsOk || !assignmentOk) {
      return res.status(500).json({
        success: false,
        error: "reset_failed",
        message: "Reset did not fully complete (responses/results/sessions/assignment). Review resetSummary.",
        userId,
        assessmentId,
        resetSummary
      });
    }

    // Optional audit log
    await safeDelete(serviceClient, resetSummary, "assessment_audit_logs", [], "Audit log not deleted (audit is append-only)");

    return res.status(200).json({
      success: true,
      message: "Assessment reset successfully. Candidate can now retake the assessment.",
      userId,
      assessmentId,
      resetSummary
    });
  } catch (err) {
    console.error("reset-assessment fatal error:", err);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: err && err.message ? err.message : "Unexpected server error"
    });
  }
}
