// pages/api/supervisor/reset-assessment.js

import { createClient } from "@supabase/supabase-js";

/*
  Supervisor/Admin Assessment Reset API (FULL FILE)

  Purpose:
  - Fully reset a candidate assessment so the candidate can retake it cleanly.
  - Clears attempt-linked data (responses, answer history, timings, violations, progress, metrics).
  - Removes old sessions for that candidate+assessment.
  - Resets candidate_assessments back to UNBLOCKED (session_id/result_id/completed_at cleared).

  Why this fix is necessary:
  - You had responses still existing after “reset”
  - candidate_assessments remained status=completed and session_id stayed pointing to the old completed session
  Which causes:
  - “Changed answer” on first selection after reset
  - Behavioral insights referencing stale attempt data
  - Supervisor dashboard counting extra completed items

  Design:
  - Uses SERVICE ROLE key (server-side) to bypass RLS safely.
  - Defensive: optional tables might not exist; failures are captured in resetSummary but do not stop required steps.
  - Required outcome: candidate_assessments must be set to status='unblocked' and session_id/result_id/completed_at cleared.

  Request body accepted keys:
  - userId | user_id | candidateId | candidate_id
  - assessmentId | assessment_id

  Notes:
  - Keep this endpoint protected on the UI side (supervisor-only).
*/

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getRequestValue(body, keys) {
  if (!body || typeof body !== "object") return null;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") return body[key];
  }
  return null;
}

function makeSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function addSummary(summary, tableName, action, ok, message, count) {
  summary.push({
    table: tableName,
    action,
    ok,
    message: message || "",
    count: count === undefined || count === null ? null : count
  });
}

function isMissingTableError(error) {
  const msg = error && (error.message || error.details || "") ? String(error.message || error.details) : "";
  return msg.toLowerCase().includes("does not exist");
}

async function safeDelete(supabase, summary, tableName, whereClauses, label, options = {}) {
  const required = options.required === true;

  try {
    let query = supabase.from(tableName).delete({ count: "exact" });

    for (let i = 0; i < whereClauses.length; i += 1) {
      const clause = whereClauses[i];
      if (!clause) continue;

      if (clause.op === "in") query = query.in(clause.column, clause.value);
      else query = query.eq(clause.column, clause.value);
    }

    const result = await query;

    if (result.error) {
      const msg = result.error.message || "Delete failed";
      console.error(`Reset cleanup failed for ${tableName} (${label}):`, result.error);

      // Optional table might not exist – log and continue.
      if (!required && isMissingTableError(result.error)) {
        addSummary(summary, tableName, "delete", true, `${label} (table missing – skipped safely)`, 0);
        return true;
      }

      addSummary(summary, tableName, "delete", false, `${label}: ${msg}`, null);
      return false;
    }

    addSummary(summary, tableName, "delete", true, label || "Deleted", result.count);
    return true;
  } catch (error) {
    console.error(`Reset cleanup exception for ${tableName} (${label}):`, error);

    if (!required && isMissingTableError(error)) {
      addSummary(summary, tableName, "delete", true, `${label} (table missing – skipped safely)`, 0);
      return true;
    }

    addSummary(
      summary,
      tableName,
      "delete",
      false,
      label + ": " + (error && error.message ? error.message : "Delete exception"),
      null
    );
    return false;
  }
}

async function safeUpdateCandidateAssessment(supabase, summary, userId, assessmentId, payload, label) {
  try {
    const result = await supabase
      .from("candidate_assessments")
      .update(payload)
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (result.error) {
      console.error("candidate_assessments update failed (" + label + "):", result.error);
      addSummary(summary, "candidate_assessments", "update", false, label + ": " + (result.error.message || "Update failed"), null);
      return false;
    }

    addSummary(summary, "candidate_assessments", "update", true, label, null);
    return true;
  } catch (error) {
    console.error("candidate_assessments update exception (" + label + "):", error);
    addSummary(summary, "candidate_assessments", "update", false, label + ": " + (error && error.message ? error.message : "Update exception"), null);
    return false;
  }
}

async function safeInsertCandidateAssessment(supabase, summary, payload) {
  try {
    const result = await supabase.from("candidate_assessments").insert(payload);

    if (result.error) {
      console.error("candidate_assessments insert failed:", result.error);
      addSummary(summary, "candidate_assessments", "insert", false, result.error.message || "Insert failed", null);
      return false;
    }

    addSummary(summary, "candidate_assessments", "insert", true, "Created unblocked assignment", null);
    return true;
  } catch (error) {
    console.error("candidate_assessments insert exception:", error);
    addSummary(summary, "candidate_assessments", "insert", false, error && error.message ? error.message : "Insert exception", null);
    return false;
  }
}

async function resetCandidateAssessmentRecord(supabase, summary, userId, assessmentId) {
  const timestamp = nowIso();

  const existing = await supabase
    .from("candidate_assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (existing.error) {
    console.error("candidate_assessments lookup failed:", existing.error);
    addSummary(summary, "candidate_assessments", "select", false, existing.error.message || "Lookup failed", null);
    return false;
  }

  if (!existing.data) {
    return safeInsertCandidateAssessment(supabase, summary, {
      user_id: userId,
      assessment_id: assessmentId,
      status: "unblocked",
      unblocked_at: timestamp,
      session_id: null,
      result_id: null,
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp
    });
  }

  // REQUIRED: must succeed
  const baseOk = await safeUpdateCandidateAssessment(
    supabase,
    summary,
    userId,
    assessmentId,
    {
      status: "unblocked",
      unblocked_at: timestamp,
      session_id: null,
      result_id: null,
      completed_at: null,
      updated_at: timestamp
    },
    "Base reset: status=unblocked, session/result/completed cleared"
  );

  if (!baseOk) return false;

  // OPTIONAL columns (schema-dependent)
  const optionalFields = [
    { column: "started_at", value: null },
    { column: "submitted_at", value: null },
    { column: "finished_at", value: null },
    { column: "ended_at", value: null },
    { column: "score", value: null },
    { column: "total_score", value: null },
    { column: "percentage", value: null },
    { column: "grade", value: null },
    { column: "classification", value: null },
    { column: "session_status", value: null },
    { column: "current_question_index", value: null },
    { column: "current_section", value: null },
    { column: "progress", value: null },
    { column: "progress_percentage", value: null },
    { column: "is_completed", value: false },
    { column: "completed", value: false },
    { column: "blocked", value: false },
    { column: "is_blocked", value: false },
    { column: "reset_at", value: timestamp }
  ];

  for (let i = 0; i < optionalFields.length; i += 1) {
    const payload = {};
    payload[optionalFields[i].column] = optionalFields[i].value;
    await safeUpdateCandidateAssessment(
      supabase,
      summary,
      userId,
      assessmentId,
      payload,
      "Optional reset field: " + optionalFields[i].column
    );
  }

  return true;
}

async function createAuditLog(supabase, summary, userId, assessmentId, req) {
  const timestamp = nowIso();
  const performedBy = cleanText(
    req.headers["x-user-id"] || req.headers["x-user-email"] || "supervisor_or_admin",
    "supervisor_or_admin"
  );

  try {
    const result = await supabase
      .from("assessment_audit_logs")
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        action: "reset",
        performed_by: performedBy,
        timestamp,
        details: "Assessment reset by supervisor/admin. Attempt data cleared and candidate_assessments set to unblocked."
      });

    if (result.error) {
      console.error("assessment_audit_logs insert failed:", result.error);
      addSummary(summary, "assessment_audit_logs", "insert", false, result.error.message || "Audit insert failed", null);
      return false;
    }

    addSummary(summary, "assessment_audit_logs", "insert", true, "Audit log created", null);
    return true;
  } catch (error) {
    console.error("assessment_audit_logs insert exception:", error);
    addSummary(summary, "assessment_audit_logs", "insert", false, error && error.message ? error.message : "Audit insert exception", null);
    return false;
  }
}

async function getSessionIdsForCandidate(supabase, userId, assessmentId, summary) {
  try {
    const result = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (result.error) {
      addSummary(summary, "assessment_sessions", "select", false, result.error.message || "Failed to fetch session IDs", null);
      return [];
    }

    const ids = (Array.isArray(result.data) ? result.data : [])
      .map((r) => (r ? r.id : null))
      .filter(Boolean);

    addSummary(summary, "assessment_sessions", "select", true, "Fetched session IDs", ids.length);
    return ids;
  } catch (error) {
    addSummary(summary, "assessment_sessions", "select", false, error && error.message ? error.message : "Failed to fetch session IDs", null);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resetSummary = [];

  try {
    const userId = getRequestValue(req.body, ["userId", "user_id", "candidateId", "candidate_id"]);
    const assessmentId = getRequestValue(req.body, ["assessmentId", "assessment_id"]);

    if (!userId || !assessmentId) {
      return res.status(400).json({
        success: false,
        error: "missing_required_fields",
        required: ["userId", "assessmentId"]
      });
    }

    const supabase = makeSupabaseClient();

    console.log("Reset assessment requested", { userId, assessmentId });

    // 1) Collect session IDs first (for dependent tables)
    const sessionIds = await getSessionIdsForCandidate(supabase, userId, assessmentId, resetSummary);

    // 2) Delete dependent tables by session_id (optional tables handled safely)
    if (sessionIds.length > 0) {
      await safeDelete(supabase, resetSummary, "answer_history", [{ column: "session_id", op: "in", value: sessionIds }], "Answer history cleared");
      await safeDelete(supabase, resetSummary, "question_timing", [{ column: "session_id", op: "in", value: sessionIds }], "Question timing cleared");
      await safeDelete(supabase, resetSummary, "candidate_personality_scores", [{ column: "session_id", op: "in", value: sessionIds }], "Personality scores cleared");
      await safeDelete(supabase, resetSummary, "assessment_results", [{ column: "session_id", op: "in", value: sessionIds }], "Assessment results cleared by session_id");
    }

    // 3) Delete core attempt data by user+assessment
    const responsesOk = await safeDelete(
      supabase,
      resetSummary,
      "responses",
      [
        { column: "user_id", value: userId },
        { column: "assessment_id", value: assessmentId }
      ],
      "Responses cleared",
      { required: true }
    );

    const sessionsOk = await safeDelete(
      supabase,
      resetSummary,
      "assessment_sessions",
      [
        { column: "user_id", value: userId },
        { column: "assessment_id", value: assessmentId }
      ],
      "Assessment sessions cleared",
      { required: true }
    );

    await safeDelete(supabase, resetSummary, "assessment_violations", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Violations cleared");

    await safeDelete(supabase, resetSummary, "assessment_progress", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Progress cleared");

    await safeDelete(supabase, resetSummary, "behavioral_metrics", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Behavioral metrics cleared");

    await safeDelete(supabase, resetSummary, "assessment_reports", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Generated reports cleared");

    await safeDelete(supabase, resetSummary, "assessment_results", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment results cleared by user_id");

    if (!responsesOk || !sessionsOk) {
      return res.status(500).json({
        success: false,
        error: "required_cleanup_failed",
        message: "Reset failed because required cleanup (responses/sessions) did not complete.",
        resetSummary
      });
    }

    // 4) REQUIRED: reset candidate_assessments record
    const requiredResetOk = await resetCandidateAssessmentRecord(supabase, resetSummary, userId, assessmentId);

    if (!requiredResetOk) {
      return res.status(500).json({
        success: false,
        error: "candidate_assessment_reset_failed",
        message: "Cleanup attempted, but candidate_assessments could not be reset to unblocked.",
        resetSummary
      });
    }

    // 5) Audit (optional)
    await createAuditLog(supabase, resetSummary, userId, assessmentId, req);

    return res.status(200).json({
      success: true,
      message: "Assessment reset successfully. Candidate can now retake the assessment.",
      userId,
      assessmentId,
      clearedSessionIds: sessionIds,
      resetSummary
    });
  } catch (err) {
    console.error("Error resetting assessment:", err);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: err && err.message ? err.message : "Unexpected server error while resetting assessment.",
      resetSummary
    });
  }
}
