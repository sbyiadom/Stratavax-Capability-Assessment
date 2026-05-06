// pages/api/supervisor/bulk-reset-assessments.js

import { createClient } from "@supabase/supabase-js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getValue(object, names) {
  var i;
  if (!object || typeof object !== "object") return null;
  for (i = 0; i < names.length; i += 1) {
    if (object[names[i]] !== undefined && object[names[i]] !== null && object[names[i]] !== "") return object[names[i]];
  }
  return null;
}

function dedupeItems(items) {
  var seen = {};
  var output = [];

  safeArray(items).forEach(function (item) {
    var userId = getValue(item, ["userId", "user_id", "candidateId", "candidate_id"]);
    var assessmentId = getValue(item, ["assessmentId", "assessment_id"]);
    var key;

    if (!userId || !assessmentId) return;
    key = String(userId) + "::" + String(assessmentId);
    if (!seen[key]) {
      seen[key] = true;
      output.push({ userId: userId, assessmentId: assessmentId });
    }
  });

  return output;
}

async function getSessionIds(supabase, userId, assessmentId) {
  var response;
  try {
    response = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (response.error) return [];
    return safeArray(response.data).map(function (row) { return row.id; }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

async function safeCount(supabase, tableName, filters) {
  var query;
  var i;
  try {
    query = supabase.from(tableName).select("*", { count: "exact", head: true });
    for (i = 0; i < filters.length; i += 1) {
      if (filters[i].operator === "in") query = query.in(filters[i].column, filters[i].value);
      else query = query.eq(filters[i].column, filters[i].value);
    }
    const response = await query;
    if (response.error) return 0;
    return response.count || 0;
  } catch (error) {
    return 0;
  }
}

async function safeDelete(supabase, tableName, filters, summary, label) {
  var query;
  var i;
  var count;

  try {
    count = await safeCount(supabase, tableName, filters);
    query = supabase.from(tableName).delete();
    for (i = 0; i < filters.length; i += 1) {
      if (filters[i].operator === "in") query = query.in(filters[i].column, filters[i].value);
      else query = query.eq(filters[i].column, filters[i].value);
    }

    const response = await query;
    if (response.error) {
      summary.warnings.push({ table: tableName, label: label, message: response.error.message });
      return 0;
    }

    summary.deleted[tableName] = (summary.deleted[tableName] || 0) + count;
    return count;
  } catch (error) {
    summary.warnings.push({ table: tableName, label: label, message: error && error.message ? error.message : "Delete skipped." });
    return 0;
  }
}

async function resetOne(supabase, item, dryRun) {
  var userId = item.userId;
  var assessmentId = item.assessmentId;
  var sessionIds;
  var summary = {
    userId: userId,
    assessmentId: assessmentId,
    dryRun: dryRun === true,
    deleted: {},
    warnings: [],
    reset: false
  };

  sessionIds = await getSessionIds(supabase, userId, assessmentId);
  summary.sessionIds = sessionIds;

  if (dryRun) {
    summary.wouldDelete = {
      answer_history: sessionIds.length > 0 ? await safeCount(supabase, "answer_history", [{ column: "session_id", operator: "in", value: sessionIds }]) : 0,
      question_timing: sessionIds.length > 0 ? await safeCount(supabase, "question_timing", [{ column: "session_id", operator: "in", value: sessionIds }]) : 0,
      candidate_personality_scores: sessionIds.length > 0 ? await safeCount(supabase, "candidate_personality_scores", [{ column: "session_id", operator: "in", value: sessionIds }]) : 0,
      assessment_violations: await safeCount(supabase, "assessment_violations", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]),
      responses: await safeCount(supabase, "responses", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]),
      behavioral_metrics: await safeCount(supabase, "behavioral_metrics", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]),
      assessment_progress: await safeCount(supabase, "assessment_progress", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]),
      assessment_results: await safeCount(supabase, "assessment_results", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }]),
      assessment_sessions: await safeCount(supabase, "assessment_sessions", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }])
    };
    summary.reset = true;
    return summary;
  }

  // Delete session-linked behavioral tracking first.
  if (sessionIds.length > 0) {
    await safeDelete(supabase, "answer_history", [{ column: "session_id", operator: "in", value: sessionIds }], summary, "Answer history cleared");
    await safeDelete(supabase, "question_timing", [{ column: "session_id", operator: "in", value: sessionIds }], summary, "Question timing cleared");
    await safeDelete(supabase, "candidate_personality_scores", [{ column: "session_id", operator: "in", value: sessionIds }], summary, "Candidate personality scores cleared");
  }

  // Delete direct candidate + assessment tracking.
  await safeDelete(supabase, "assessment_violations", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], summary, "Violations cleared");
  await safeDelete(supabase, "responses", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], summary, "Responses cleared");
  await safeDelete(supabase, "behavioral_metrics", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], summary, "Behavioral metrics cleared");
  await safeDelete(supabase, "assessment_progress", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], summary, "Progress cleared");
  await safeDelete(supabase, "assessment_results", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], summary, "Results cleared");
  await safeDelete(supabase, "assessment_sessions", [{ column: "user_id", value: userId }, { column: "assessment_id", value: assessmentId }], summary, "Sessions cleared");

  const updateResponse = await supabase
    .from("candidate_assessments")
    .update({
      status: "unblocked",
      result_id: null,
      completed_at: null,
      session_id: null,
      session_status: null,
      unblocked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId);

  if (updateResponse.error) {
    summary.reset = false;
    summary.error = updateResponse.error.message;
    return summary;
  }

  summary.reset = true;
  return summary;
}

export default async function handler(req, res) {
  var supabaseUrl;
  var serviceRoleKey;
  var supabase;
  var dryRun;
  var confirmBulkReset;
  var items;
  var results;
  var successful;
  var failed;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, error: "server_config_error", message: "Supabase service role environment variables are missing." });
  }

  dryRun = req.body && req.body.dryRun === true;
  confirmBulkReset = req.body && req.body.confirmBulkReset === true;
  items = dedupeItems(req.body && req.body.items ? req.body.items : req.body && req.body.resetItems ? req.body.resetItems : []);

  if (items.length === 0) {
    return res.status(400).json({ success: false, error: "no_items", message: "No valid candidate assessment reset items were provided." });
  }

  if (!dryRun && !confirmBulkReset) {
    return res.status(400).json({ success: false, error: "missing_confirmation", message: "confirmBulkReset must be true for a real reset." });
  }

  supabase = createClient(supabaseUrl, serviceRoleKey);

  results = [];
  for (const item of items) {
    try {
      results.push(await resetOne(supabase, item, dryRun));
    } catch (error) {
      results.push({ userId: item.userId, assessmentId: item.assessmentId, reset: false, error: error && error.message ? error.message : "Unexpected reset error." });
    }
  }

  successful = results.filter(function (item) { return item.reset === true; }).length;
  failed = results.length - successful;

  return res.status(200).json({
    success: failed === 0,
    dryRun: dryRun,
    total: results.length,
    totalDeduped: results.length,
    successful: successful,
    failed: failed,
    results: results
  });
}
