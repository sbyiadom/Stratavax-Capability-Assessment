// pages/api/supervisor/unblock-assessment.js
//
// SUPERVISOR UNBLOCK ASSESSMENT API
//
// Purpose:
// - Unblock an assessment without deleting candidate responses.
// - Preserve existing progress and in-progress sessions.
// - Extend time or reset time where requested.
// - Create a safe in-progress session only when needed.
// - Record audit information where the audit table exists.
//
// Phase 7A: added auth + role check. Previously had no token verification —
// performedBy was taken from the request body, which is client-controlled.
// Now: token → verified user → supervisor/admin role check → performedBy
// derived from the verified user id.

import { createClient } from "@supabase/supabase-js";

// ======================================================
// BASIC HELPERS
// ======================================================

function toNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallbackValue;
  return numberValue;
}

function cleanText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "";
  return String(value);
}

function getNowIso() {
  return new Date().toISOString();
}

function addMinutesToDate(dateValue, minutes) {
  var baseDate = dateValue ? new Date(dateValue) : new Date();
  var safeMinutes = toNumber(minutes, 0);

  if (Number.isNaN(baseDate.getTime())) baseDate = new Date();

  baseDate.setMinutes(baseDate.getMinutes() + safeMinutes);
  return baseDate;
}

function getSupabaseClient() {
  var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getSupabaseAnonClient() {
  var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase anon environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function resolveCaller(serviceClient, anonClient, token) {
  if (!token) {
    return { error: "Unauthorized: No token provided", status: 401 };
  }

  const { data: userData, error: authError } = await anonClient.auth.getUser(token);

  if (authError || !userData?.user) {
    return { error: "Unauthorized: Invalid token", status: 401 };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("supervisor_profiles")
    .select("id, role, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[unblock-assessment] profile lookup failed:", profileError.message);
    return { error: "Unable to verify caller identity", status: 500 };
  }

  const metadataRole = userData.user.user_metadata?.role || null;
  const resolvedRole = profile?.role || metadataRole;

  if (profile?.is_active === false) {
    return { error: "Account is inactive", status: 403 };
  }

  if (resolvedRole !== "admin" && resolvedRole !== "supervisor") {
    return { error: "Supervisor or admin access required", status: 403 };
  }

  return { userId: userData.user.id, role: resolvedRole };
}

async function safeSelectSingle(supabase, tableName, configureQuery, selectText) {
  var query;
  var result;

  try {
    query = supabase.from(tableName).select(selectText || "*");
    if (typeof configureQuery === "function") query = configureQuery(query);
    result = await query.maybeSingle();

    if (result.error) return { data: null, error: result.error.message };
    return { data: result.data || null, error: null };
  } catch (error) {
    return { data: null, error: error && error.message ? error.message : "Query failed" };
  }
}

async function safeSelectRows(supabase, tableName, configureQuery, selectText) {
  var query;
  var result;

  try {
    query = supabase.from(tableName).select(selectText || "*");
    if (typeof configureQuery === "function") query = configureQuery(query);
    result = await query;

    if (result.error) return { data: [], error: result.error.message };
    return { data: Array.isArray(result.data) ? result.data : [], error: null };
  } catch (error) {
    return { data: [], error: error && error.message ? error.message : "Query failed" };
  }
}

async function safeUpdate(supabase, tableName, values, configureQuery) {
  var query;
  var result;

  try {
    query = supabase.from(tableName).update(values);
    if (typeof configureQuery === "function") query = configureQuery(query);
    result = await query;

    if (result.error) return { success: false, error: result.error.message };
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : "Update failed" };
  }
}

async function safeInsert(supabase, tableName, values) {
  var result;

  try {
    result = await supabase.from(tableName).insert(values);
    if (result.error) return { success: false, error: result.error.message };
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : "Insert failed" };
  }
}

// ======================================================
// DOMAIN HELPERS
// ======================================================

async function getCandidateAssessment(supabase, userId, assessmentId) {
  return safeSelectSingle(
    supabase,
    "candidate_assessments",
    function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId);
    },
    "id, user_id, assessment_id, status, result_id, created_at, unblocked_at"
  );
}

async function getLatestSession(supabase, userId, assessmentId) {
  var rows = await safeSelectRows(
    supabase,
    "assessment_sessions",
    function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId).order("created_at", { ascending: false }).limit(1);
    },
    "id, user_id, assessment_id, status, time_spent_seconds, started_at, created_at, updated_at, expires_at"
  );

  if (rows.data.length > 0) return { data: rows.data[0], error: null };
  return { data: null, error: rows.error };
}

async function getExistingProgress(supabase, userId, assessmentId) {
  var responseRows;
  var progressRows;

  responseRows = await safeSelectRows(
    supabase,
    "responses",
    function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId).limit(1);
    },
    "id"
  );

  progressRows = await safeSelectRows(
    supabase,
    "assessment_progress",
    function (query) {
      return query.eq("user_id", userId).eq("assessment_id", assessmentId).limit(1);
    },
    "id"
  );

  return {
    hasResponses: responseRows.data.length > 0,
    hasProgressRecord: progressRows.data.length > 0,
    hasExistingProgress: responseRows.data.length > 0 || progressRows.data.length > 0
  };
}

async function updateOrCreateCandidateAssessment(supabase, userId, assessmentId) {
  var existing;
  var nowIso = getNowIso();
  var updateResult;
  var insertResult;

  existing = await getCandidateAssessment(supabase, userId, assessmentId);

  if (existing.data) {
    updateResult = await safeUpdate(
      supabase,
      "candidate_assessments",
      {
        status: "unblocked",
        unblocked_at: nowIso,
        updated_at: nowIso
      },
      function (query) {
        return query.eq("user_id", userId).eq("assessment_id", assessmentId);
      }
    );

    if (!updateResult.success) throw new Error("Failed to update candidate assessment: " + updateResult.error);
    return { action: "updated", previousStatus: existing.data.status };
  }

  insertResult = await safeInsert(supabase, "candidate_assessments", {
    user_id: userId,
    assessment_id: assessmentId,
    status: "unblocked",
    unblocked_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso
  });

  if (!insertResult.success) throw new Error("Failed to create candidate assessment: " + insertResult.error);
  return { action: "created", previousStatus: null };
}

async function updateOrCreateSession(supabase, userId, assessmentId, existingSession, extendMinutes, resetTime) {
  var now = new Date();
  var nowIso = now.toISOString();
  var extensionMinutes = toNumber(extendMinutes, 0);
  var shouldCreateOrUpdateSession = resetTime || extensionMinutes > 0;
  var expiresAt = null;
  var timeExtensionApplied = 0;
  var updateResult;
  var insertResult;
  var baseExpiry;

  if (!shouldCreateOrUpdateSession) {
    if (existingSession) {
      return {
        sessionAction: "preserved",
        expiresAt: existingSession.expires_at || null,
        timeExtensionApplied: 0
      };
    }

    return {
      sessionAction: "none",
      expiresAt: null,
      timeExtensionApplied: 0
    };
  }

  if (resetTime) {
    expiresAt = addMinutesToDate(now, 180);
    timeExtensionApplied = 180;
  } else if (extensionMinutes > 0) {
    if (existingSession && existingSession.expires_at) {
      baseExpiry = new Date(existingSession.expires_at);
      if (Number.isNaN(baseExpiry.getTime()) || baseExpiry.getTime() < now.getTime()) baseExpiry = now;
      expiresAt = addMinutesToDate(baseExpiry, extensionMinutes);
    } else {
      expiresAt = addMinutesToDate(now, extensionMinutes);
    }
    timeExtensionApplied = extensionMinutes;
  }

  if (!expiresAt) {
    return {
      sessionAction: existingSession ? "preserved" : "none",
      expiresAt: existingSession ? existingSession.expires_at : null,
      timeExtensionApplied: 0
    };
  }

  if (existingSession) {
    updateResult = await safeUpdate(
      supabase,
      "assessment_sessions",
      {
        status: "in_progress",
        expires_at: expiresAt.toISOString(),
        updated_at: nowIso
      },
      function (query) {
        return query.eq("id", existingSession.id);
      }
    );

    if (!updateResult.success) {
      return {
        sessionAction: "update_failed",
        expiresAt: existingSession.expires_at || null,
        timeExtensionApplied: 0,
        warning: updateResult.error
      };
    }

    return {
      sessionAction: "updated",
      expiresAt: expiresAt.toISOString(),
      timeExtensionApplied: timeExtensionApplied
    };
  }

  insertResult = await safeInsert(supabase, "assessment_sessions", {
    user_id: userId,
    assessment_id: assessmentId,
    status: "in_progress",
    started_at: nowIso,
    expires_at: expiresAt.toISOString(),
    time_spent_seconds: 0,
    created_at: nowIso,
    updated_at: nowIso
  });

  if (!insertResult.success) {
    return {
      sessionAction: "create_failed",
      expiresAt: null,
      timeExtensionApplied: 0,
      warning: insertResult.error
    };
  }

  return {
    sessionAction: "created",
    expiresAt: expiresAt.toISOString(),
    timeExtensionApplied: timeExtensionApplied
  };
}

async function writeAuditLog(supabase, payload) {
  var insertResult;

  insertResult = await safeInsert(supabase, "assessment_audit_logs", payload);

  if (!insertResult.success) {
    return { success: false, warning: insertResult.error };
  }

  return { success: true, warning: null };
}

async function getFinalSession(supabase, userId, assessmentId) {
  var latest = await getLatestSession(supabase, userId, assessmentId);
  return latest.data;
}

function buildMessage(hasExistingProgress, timeExtensionApplied, resetTime) {
  var message;

  if (hasExistingProgress) {
    message = "Assessment unblocked. Candidate can continue from where they left off.";
  } else {
    message = "Assessment unblocked. Candidate can start a new session.";
  }

  if (resetTime) {
    message += " Time reset to full duration.";
  } else if (timeExtensionApplied > 0) {
    message += " Time extended by " + timeExtensionApplied + " minutes.";
  }

  return message;
}

// ======================================================
// API HANDLER
// ======================================================

export default async function handler(req, res) {
  var body;
  var userId;
  var assessmentId;
  var extendMinutes;
  var resetTime;
  var performedBy;
  var supabase;
  var anonClient;
  var token;
  var caller;
  var latestSessionResult;
  var existingSession;
  var progressInfo;
  var candidateAssessmentAction;
  var sessionAction;
  var finalSession;
  var auditResult;
  var warnings = [];
  var auditPayload;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // ======================================================
    // AUTH — verify token and role before doing anything else
    // ======================================================
    token = (req.headers.authorization || "").replace("Bearer ", "").trim();
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
    }

    supabase = getSupabaseClient();
    anonClient = getSupabaseAnonClient();

    caller = await resolveCaller(supabase, anonClient, token);
    if (caller.error) {
      return res.status(caller.status || 401).json({ success: false, error: caller.error });
    }

    body = req.body || {};
    userId = cleanText(body.userId || body.user_id, "");
    assessmentId = cleanText(body.assessmentId || body.assessment_id, "");
    extendMinutes = toNumber(body.extendMinutes || body.extend_minutes, 0);
    resetTime = body.resetTime === true || body.reset_time === true;
    // performedBy is derived from the VERIFIED caller, not from the request body.
    performedBy = caller.userId;

    if (!userId || !assessmentId) {
      return res.status(400).json({ success: false, error: "Missing required fields: userId and assessmentId are required." });
    }

    if (extendMinutes < 0) extendMinutes = 0;
    if (extendMinutes > 480) extendMinutes = 480;

    latestSessionResult = await getLatestSession(supabase, userId, assessmentId);
    existingSession = latestSessionResult.data;

    if (latestSessionResult.error) warnings.push("Session lookup warning: " + latestSessionResult.error);

    progressInfo = await getExistingProgress(supabase, userId, assessmentId);
    candidateAssessmentAction = await updateOrCreateCandidateAssessment(supabase, userId, assessmentId);

    sessionAction = await updateOrCreateSession(
      supabase,
      userId,
      assessmentId,
      existingSession,
      extendMinutes,
      resetTime
    );

    if (sessionAction.warning) warnings.push("Session warning: " + sessionAction.warning);

    finalSession = await getFinalSession(supabase, userId, assessmentId);

    auditPayload = {
      user_id: userId,
      assessment_id: assessmentId,
      action: "unblock",
      performed_by: performedBy,
      timestamp: getNowIso(),
      details: {
        candidateAssessmentAction: candidateAssessmentAction.action,
        previousAssessmentStatus: candidateAssessmentAction.previousStatus,
        hadExistingSession: !!existingSession,
        sessionAction: sessionAction.sessionAction,
        hasExistingProgress: progressInfo.hasExistingProgress,
        hasResponses: progressInfo.hasResponses,
        hasProgressRecord: progressInfo.hasProgressRecord,
        requestedExtendMinutes: extendMinutes,
        timeExtensionApplied: sessionAction.timeExtensionApplied,
        resetTime: resetTime,
        newExpiry: sessionAction.expiresAt
      }
    };

    auditResult = await writeAuditLog(supabase, auditPayload);
    if (!auditResult.success) warnings.push("Audit log warning: " + auditResult.warning);

    return res.status(200).json({
      success: true,
      userId: userId,
      user_id: userId,
      assessmentId: assessmentId,
      assessment_id: assessmentId,
      hasExistingProgress: progressInfo.hasExistingProgress,
      has_existing_progress: progressInfo.hasExistingProgress,
      hadExistingSession: !!existingSession,
      had_existing_session: !!existingSession,
      candidateAssessmentAction: candidateAssessmentAction.action,
      candidate_assessment_action: candidateAssessmentAction.action,
      sessionAction: sessionAction.sessionAction,
      session_action: sessionAction.sessionAction,
      session: finalSession,
      timeExtensionApplied: sessionAction.timeExtensionApplied,
      time_extension_applied: sessionAction.timeExtensionApplied,
      resetTime: resetTime,
      reset_time: resetTime,
      warnings: warnings,
      message: buildMessage(progressInfo.hasExistingProgress, sessionAction.timeExtensionApplied, resetTime)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error && error.message ? error.message : "Failed to unblock assessment."
    });
  }
}
