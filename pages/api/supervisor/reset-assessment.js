// pages/api/supervisor/reset-assessment.js

import { createClient } from "@supabase/supabase-js";

/*
  Supervisor/Admin Assessment Reset API

  Purpose:
  - Fully reset a candidate assessment so the candidate can retake it.
  - Clear old responses, results, sessions, progress, reports, and behavioral data where those tables exist.
  - Reset candidate_assessments without deleting the assignment.
  - Keep the assessment assigned and unblocked for the candidate.

  Important:
  - This file is intentionally defensive.
  - Optional cleanup tables may not exist in every deployment, so failures on optional cleanup are logged and returned in resetSummary but do not stop the reset.
  - The required step is updating or creating candidate_assessments as unblocked.
*/

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "";
  return String(value);
}

function getRequestValue(body, keys) {
  var i;
  if (!body || typeof body !== "object") return null;
  for (i = 0; i < keys.length; i += 1) {
    if (body[keys[i]] !== undefined && body[keys[i]] !== null && body[keys[i]] !== "") return body[keys[i]];
  }
  return null;
}

function makeSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function addSummary(summary, tableName, action, ok, message, count) {
  summary.push({
    table: tableName,
    action: action,
    ok: ok,
    message: message || "",
    count: count === undefined || count === null ? null : count
  });
}

async function safeDeleteRows(supabase, summary, tableName, filters, label) {
  var query;
  var i;
  var result;

  try {
    query = supabase.from(tableName).delete({ count: "exact" });

    for (i = 0; i < filters.length; i += 1) {
      query = query.eq(filters[i].column, filters[i].value);
    }

    result = await query;

    if (result.error) {
      console.error("Reset cleanup skipped/failed for " + tableName + " (" + label + "):", result.error);
      addSummary(summary, tableName, "delete", false, result.error.message || "Delete failed", null);
      return false;
    }

    addSummary(summary, tableName, "delete", true, label || "Deleted", result.count);
    return true;
  } catch (error) {
    console.error("Reset cleanup exception for " + tableName + " (" + label + "):", error);
    addSummary(summary, tableName, "delete", false, error && error.message ? error.message : "Delete exception", null);
    return false;
  }
}

async function safeUpdateCandidateAssessment(supabase, summary, userId, assessmentId, updatePayload, label) {
  var result;

  try {
    result = await supabase
      .from("candidate_assessments")
      .update(updatePayload)
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

async function safeInsertCandidateAssessment(supabase, summary, insertPayload) {
  var result;

  try {
    result = await supabase
      .from("candidate_assessments")
      .insert(insertPayload);

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
  var existingResult;
  var existingRecord;
  var timestamp;
  var baseUpdate;
  var requiredUpdated;
  var insertPayload;
  var optionalFields;
  var i;
  var oneFieldPayload;

  timestamp = nowIso();

  existingResult = await supabase
    .from("candidate_assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (existingResult.error) {
    console.error("candidate_assessments lookup failed:", existingResult.error);
    addSummary(summary, "candidate_assessments", "select", false, existingResult.error.message || "Lookup failed", null);
    return false;
  }

  existingRecord = existingResult.data;

  if (!existingRecord) {
    insertPayload = {
      user_id: userId,
      assessment_id: assessmentId,
      status: "unblocked",
      unblocked_at: timestamp,
      result_id: null,
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp
    };

    return await safeInsertCandidateAssessment(supabase, summary, insertPayload);
  }

  // Required/base reset. Keep assignment row, but make it retakable.
  baseUpdate = {
    status: "unblocked",
    unblocked_at: timestamp,
    result_id: null,
    completed_at: null,
    updated_at: timestamp
  };

  requiredUpdated = await safeUpdateCandidateAssessment(
    supabase,
    summary,
    userId,
    assessmentId,
    baseUpdate,
    "Base reset: status unblocked, result cleared, completion cleared"
  );

  if (!requiredUpdated) return false;

  // Optional columns. These may or may not exist depending on the current schema.
  // Each field is updated independently so one missing column does not break the reset.
  optionalFields = [
    { column: "started_at", value: null },
    { column: "submitted_at", value: null },
    { column: "finished_at", value: null },
    { column: "ended_at", value: null },
    { column: "score", value: null },
    { column: "total_score", value: null },
    { column: "percentage", value: null },
    { column: "grade", value: null },
    { column: "classification", value: null },
    { column: "session_id", value: null },
    { column: "session_status", value: null },
    { column: "current_question_index", value: null },
    { column: "current_section", value: null },
    { column: "progress", value: null },
    { column: "progress_percentage", value: null },
    { column: "is_completed", value: false },
    { column: "completed", value: false },
    { column: "blocked", value: false },
    { column: "is_blocked", value: false },
    { column: "reset_at", value: timestamp },
    { column: "reset_count", value: null }
  ];

  for (i = 0; i < optionalFields.length; i += 1) {
    oneFieldPayload = {};
    oneFieldPayload[optionalFields[i].column] = optionalFields[i].value;
    await safeUpdateCandidateAssessment(
      supabase,
      summary,
      userId,
      assessmentId,
      oneFieldPayload,
      "Optional reset field: " + optionalFields[i].column
    );
  }

  return true;
}

async function createAuditLog(supabase, summary, userId, assessmentId, req) {
  var timestamp;
  var performedBy;
  var result;

  timestamp = nowIso();
  performedBy = cleanText(req.headers["x-user-id"] || req.headers["x-user-email"] || "supervisor_or_admin", "supervisor_or_admin");

  try {
    result = await supabase
      .from("assessment_audit_logs")
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        action: "reset",
        performed_by: performedBy,
        timestamp: timestamp,
        details: "Assessment reset by supervisor/admin. Previous responses, result/session/progress data cleared where available. Candidate assessment kept assigned and unblocked for retake."
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

export default async function handler(req, res) {
  var userId;
  var assessmentId;
  var supabaseUrl;
  var serviceRoleKey;
  var supabase;
  var resetSummary;
  var requiredResetOk;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    userId = getRequestValue(req.body, ["userId", "user_id", "candidateId", "candidate_id"]);
    assessmentId = getRequestValue(req.body, ["assessmentId", "assessment_id"]);

    if (!userId || !assessmentId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["userId", "assessmentId"]
      });
    }

    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "server_config_error",
        message: "Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
      });
    }

    supabase = makeSupabaseClient();
    resetSummary = [];

    console.log("Reset assessment requested", { userId: userId, assessmentId: assessmentId });

    // Delete primary attempt/result data.
    await safeDeleteRows(supabase, resetSummary, "assessment_results", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment results cleared");

    await safeDeleteRows(supabase, resetSummary, "responses", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Responses cleared");

    await safeDeleteRows(supabase, resetSummary, "assessment_sessions", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment sessions cleared by user_id");

    // Some schemas use candidate_id instead of user_id. If this column does not exist, this safely logs and continues.
    await safeDeleteRows(supabase, resetSummary, "assessment_sessions", [
      { column: "candidate_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment sessions cleared by candidate_id");

    await safeDeleteRows(supabase, resetSummary, "assessment_progress", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment progress cleared");

    // Delete generated reports and computed metrics if these tables exist.
    await safeDeleteRows(supabase, resetSummary, "assessment_reports", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Generated assessment reports cleared");

    await safeDeleteRows(supabase, resetSummary, "behavioral_metrics", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Behavioral metrics cleared");

    await safeDeleteRows(supabase, resetSummary, "candidate_behavioral_metrics", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate behavioral metrics cleared by user_id");

    await safeDeleteRows(supabase, resetSummary, "candidate_behavioral_metrics", [
      { column: "candidate_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate behavioral metrics cleared by candidate_id");

    await safeDeleteRows(supabase, resetSummary, "candidate_assessment_sessions", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate assessment sessions cleared by user_id");

    await safeDeleteRows(supabase, resetSummary, "candidate_assessment_sessions", [
      { column: "candidate_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate assessment sessions cleared by candidate_id");

    await safeDeleteRows(supabase, resetSummary, "assessment_attempts", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment attempts cleared");

    // Required assignment reset. This is what makes the candidate dashboard show the assessment as retakable.
    requiredResetOk = await resetCandidateAssessmentRecord(supabase, resetSummary, userId, assessmentId);

    if (!requiredResetOk) {
      return res.status(500).json({
        success: false,
        error: "candidate_assessment_reset_failed",
        message: "Old data cleanup was attempted, but candidate_assessments could not be reset to unblocked.",
        resetSummary: resetSummary
      });
    }

    await createAuditLog(supabase, resetSummary, userId, assessmentId, req);

    return res.status(200).json({
      success: true,
      message: "Assessment reset successfully. Candidate can now retake the assessment.",
      userId: userId,
      assessmentId: assessmentId,
      resetSummary: resetSummary
    });
  } catch (err) {
    console.error("Error resetting assessment:", err);
    return res.status(500).json({
      error: "server_error",
      message: err && err.message ? err.message : "Unexpected server error while resetting assessment."
    });
  }
}
