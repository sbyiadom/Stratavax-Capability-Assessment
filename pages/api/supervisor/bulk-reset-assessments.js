// pages/api/supervisor/bulk-reset-assessments.js

import { createClient } from "@supabase/supabase-js";

/*
  Bulk Supervisor/Admin Assessment Reset API

  File path:
  pages/api/supervisor/bulk-reset-assessments.js

  Purpose:
  - Reset many candidate-assessment records in one request.
  - Useful when a deployment bug, scoring issue, reset issue, or assessment configuration issue affects multiple candidates.
  - Clears old responses/results/sessions/progress/reports/metrics where those tables exist.
  - Keeps each candidate assessment assigned and unblocked so the candidate can retake it.

  Safety controls:
  - POST only.
  - Requires confirmBulkReset = true unless dryRun = true.
  - Supports dryRun mode.
  - Maximum 50 reset items per request by default.
  - Continues processing even if one candidate-assessment pair fails.
  - Returns a detailed per-item reset summary.

  Request examples:

  1) Reset selected candidates/assessments:
  {
    "confirmBulkReset": true,
    "items": [
      { "userId": "candidate-user-id-1", "assessmentId": "assessment-id-1" },
      { "userId": "candidate-user-id-2", "assessmentId": "assessment-id-1" }
    ]
  }

  2) Dry run only:
  {
    "dryRun": true,
    "items": [
      { "userId": "candidate-user-id-1", "assessmentId": "assessment-id-1" }
    ]
  }
*/

var MAX_BULK_RESET_ITEMS = 50;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "";
  return String(value);
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function getRequestValue(body, keys) {
  var i;

  if (!body || typeof body !== "object") return null;

  for (i = 0; i < keys.length; i += 1) {
    if (body[keys[i]] !== undefined && body[keys[i]] !== null && body[keys[i]] !== "") {
      return body[keys[i]];
    }
  }

  return null;
}

function normalizeResetItem(item) {
  var userId;
  var assessmentId;

  if (!isObject(item)) {
    return {
      userId: null,
      assessmentId: null,
      valid: false,
      error: "Item must be an object."
    };
  }

  userId = getRequestValue(item, ["userId", "user_id", "candidateId", "candidate_id"]);
  assessmentId = getRequestValue(item, ["assessmentId", "assessment_id"]);

  if (!userId || !assessmentId) {
    return {
      userId: userId,
      assessmentId: assessmentId,
      valid: false,
      error: "Each item requires userId and assessmentId."
    };
  }

  return {
    userId: cleanText(userId, ""),
    assessmentId: cleanText(assessmentId, ""),
    valid: true,
    error: null
  };
}

function deduplicateItems(items) {
  var seen = {};
  var output = [];
  var i;
  var item;
  var key;

  for (i = 0; i < items.length; i += 1) {
    item = items[i];
    key = item.userId + "::" + item.assessmentId;

    if (!seen[key]) {
      seen[key] = true;
      output.push(item);
    }
  }

  return output;
}

function createSupabaseClient() {
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

async function safeCountRows(supabase, summary, tableName, filters, label) {
  var query;
  var i;
  var result;

  try {
    query = supabase.from(tableName).select("id", { count: "exact", head: true });

    for (i = 0; i < filters.length; i += 1) {
      query = query.eq(filters[i].column, filters[i].value);
    }

    result = await query;

    if (result.error) {
      addSummary(summary, tableName, "dry_count", false, result.error.message || "Dry-run count failed", null);
      return null;
    }

    addSummary(summary, tableName, "dry_count", true, label || "Dry-run count completed", result.count);
    return result.count;
  } catch (error) {
    addSummary(summary, tableName, "dry_count", false, error && error.message ? error.message : "Dry-run count exception", null);
    return null;
  }
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
      console.error("Bulk reset cleanup skipped/failed for " + tableName + " (" + label + "):", result.error);
      addSummary(summary, tableName, "delete", false, result.error.message || "Delete failed", null);
      return false;
    }

    addSummary(summary, tableName, "delete", true, label || "Deleted", result.count);
    return true;
  } catch (error) {
    console.error("Bulk reset cleanup exception for " + tableName + " (" + label + "):", error);
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

async function dryRunOneItem(supabase, item) {
  var summary = [];
  var userId = item.userId;
  var assessmentId = item.assessmentId;
  var candidateAssessmentResult;

  await safeCountRows(supabase, summary, "assessment_results", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Assessment results that would be cleared");

  await safeCountRows(supabase, summary, "responses", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Responses that would be cleared");

  await safeCountRows(supabase, summary, "assessment_sessions", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Assessment sessions that would be cleared by user_id");

  await safeCountRows(supabase, summary, "assessment_progress", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Assessment progress rows that would be cleared");

  await safeCountRows(supabase, summary, "assessment_reports", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Generated reports that would be cleared");

  await safeCountRows(supabase, summary, "behavioral_metrics", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ], "Behavioral metrics that would be cleared");

  try {
    candidateAssessmentResult = await supabase
      .from("candidate_assessments")
      .select("id,status,completed_at,result_id,session_id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (candidateAssessmentResult.error) {
      addSummary(summary, "candidate_assessments", "dry_select", false, candidateAssessmentResult.error.message || "Candidate assignment lookup failed", null);
    } else if (candidateAssessmentResult.data) {
      addSummary(summary, "candidate_assessments", "dry_select", true, "Existing assignment found and would be reset to unblocked", 1);
    } else {
      addSummary(summary, "candidate_assessments", "dry_select", true, "No assignment found; bulk reset would create an unblocked assignment", 0);
    }
  } catch (error) {
    addSummary(summary, "candidate_assessments", "dry_select", false, error && error.message ? error.message : "Candidate assignment lookup exception", null);
  }

  return {
    userId: userId,
    assessmentId: assessmentId,
    success: true,
    dryRun: true,
    resetSummary: summary
  };
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

async function createAuditLog(supabase, summary, userId, assessmentId, req, batchId) {
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
        action: "bulk_reset",
        performed_by: performedBy,
        timestamp: timestamp,
        details: "Bulk reset batch " + batchId + ". Previous responses, result/session/progress/report/metric data cleared where available. Candidate assessment kept assigned and unblocked for retake."
      });

    if (result.error) {
      console.error("assessment_audit_logs insert failed:", result.error);
      addSummary(summary, "assessment_audit_logs", "insert", false, result.error.message || "Audit insert failed", null);
      return false;
    }

    addSummary(summary, "assessment_audit_logs", "insert", true, "Bulk reset audit log created", null);
    return true;
  } catch (error) {
    console.error("assessment_audit_logs insert exception:", error);
    addSummary(summary, "assessment_audit_logs", "insert", false, error && error.message ? error.message : "Audit insert exception", null);
    return false;
  }
}

async function resetOneItem(supabase, item, req, batchId) {
  var summary = [];
  var userId = item.userId;
  var assessmentId = item.assessmentId;
  var requiredResetOk;

  try {
    await safeDeleteRows(supabase, summary, "assessment_results", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment results cleared");

    await safeDeleteRows(supabase, summary, "responses", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Responses cleared");

    await safeDeleteRows(supabase, summary, "assessment_sessions", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment sessions cleared by user_id");

    await safeDeleteRows(supabase, summary, "assessment_sessions", [
      { column: "candidate_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment sessions cleared by candidate_id");

    await safeDeleteRows(supabase, summary, "assessment_progress", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment progress cleared");

    await safeDeleteRows(supabase, summary, "assessment_reports", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Generated assessment reports cleared");

    await safeDeleteRows(supabase, summary, "behavioral_metrics", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Behavioral metrics cleared");

    await safeDeleteRows(supabase, summary, "candidate_behavioral_metrics", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate behavioral metrics cleared by user_id");

    await safeDeleteRows(supabase, summary, "candidate_behavioral_metrics", [
      { column: "candidate_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate behavioral metrics cleared by candidate_id");

    await safeDeleteRows(supabase, summary, "candidate_assessment_sessions", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate assessment sessions cleared by user_id");

    await safeDeleteRows(supabase, summary, "candidate_assessment_sessions", [
      { column: "candidate_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Candidate assessment sessions cleared by candidate_id");

    await safeDeleteRows(supabase, summary, "assessment_attempts", [
      { column: "user_id", value: userId },
      { column: "assessment_id", value: assessmentId }
    ], "Assessment attempts cleared");

    requiredResetOk = await resetCandidateAssessmentRecord(supabase, summary, userId, assessmentId);

    if (!requiredResetOk) {
      return {
        userId: userId,
        assessmentId: assessmentId,
        success: false,
        error: "candidate_assessment_reset_failed",
        message: "candidate_assessments could not be reset to unblocked.",
        resetSummary: summary
      };
    }

    await createAuditLog(supabase, summary, userId, assessmentId, req, batchId);

    return {
      userId: userId,
      assessmentId: assessmentId,
      success: true,
      message: "Assessment reset successfully. Candidate can retake it.",
      resetSummary: summary
    };
  } catch (error) {
    return {
      userId: userId,
      assessmentId: assessmentId,
      success: false,
      error: "reset_exception",
      message: error && error.message ? error.message : "Unexpected reset error.",
      resetSummary: summary
    };
  }
}

export default async function handler(req, res) {
  var supabaseUrl;
  var serviceRoleKey;
  var supabase;
  var body;
  var dryRun;
  var confirmBulkReset;
  var rawItems;
  var normalizedItems;
  var validItems;
  var invalidItems;
  var dedupedItems;
  var results;
  var i;
  var result;
  var batchId;
  var successCount;
  var failedCount;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    body = req.body || {};
    dryRun = body.dryRun === true;
    confirmBulkReset = body.confirmBulkReset === true;
    rawItems = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "missing_items",
        message: "Bulk reset requires an items array. Each item must include userId and assessmentId."
      });
    }

    normalizedItems = rawItems.map(function (item) {
      return normalizeResetItem(item);
    });

    validItems = normalizedItems.filter(function (item) {
      return item.valid === true;
    });

    invalidItems = normalizedItems.filter(function (item) {
      return item.valid !== true;
    });

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "no_valid_items",
        message: "No valid reset items were provided.",
        invalidItems: invalidItems
      });
    }

    dedupedItems = deduplicateItems(validItems);

    if (dedupedItems.length > MAX_BULK_RESET_ITEMS) {
      return res.status(400).json({
        success: false,
        error: "batch_size_exceeded",
        message: "Bulk reset is limited to " + MAX_BULK_RESET_ITEMS + " candidate-assessment pairs per request.",
        requested: dedupedItems.length,
        maximum: MAX_BULK_RESET_ITEMS
      });
    }

    if (!dryRun && !confirmBulkReset) {
      return res.status(400).json({
        success: false,
        error: "confirmation_required",
        message: "Set confirmBulkReset to true to perform bulk reset. You may set dryRun to true to preview impact without deleting anything."
      });
    }

    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: "server_config_error",
        message: "Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
      });
    }

    supabase = createSupabaseClient();
    batchId = "bulk-reset-" + Date.now();
    results = [];

    for (i = 0; i < dedupedItems.length; i += 1) {
      if (dryRun) {
        result = await dryRunOneItem(supabase, dedupedItems[i]);
      } else {
        result = await resetOneItem(supabase, dedupedItems[i], req, batchId);
      }

      results.push(result);
    }

    successCount = results.filter(function (item) { return item.success === true; }).length;
    failedCount = results.length - successCount;

    return res.status(200).json({
      success: failedCount === 0,
      dryRun: dryRun,
      batchId: batchId,
      message: dryRun ? "Bulk reset dry run completed." : "Bulk reset completed.",
      totalRequested: rawItems.length,
      totalValid: validItems.length,
      totalInvalid: invalidItems.length,
      totalDeduped: dedupedItems.length,
      successful: successCount,
      failed: failedCount,
      invalidItems: invalidItems,
      results: results
    });
  } catch (error) {
    console.error("Bulk reset server error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error && error.message ? error.message : "Unexpected server error during bulk reset."
    });
  }
}
