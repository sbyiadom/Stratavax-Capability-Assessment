// pages/api/supervisor/assessment-reset-candidates.js

import { createClient } from "@supabase/supabase-js";

/*
  PLATFORM-WIDE: Load candidates for an assessment-specific reset
  --------------------------------------------------------------
  Used by Supervisor dashboard bulk reset panel.

  Security:
  - Requires Authorization: Bearer <supabase_jwt>
  - JWT user must be role supervisor/admin
  - Uses SERVICE ROLE key for querying across candidates.

  Request body:
  {
    assessmentId | assessment_id: UUID,
    mode?: 'all' | 'completed' | 'incomplete' | 'ready'
  }

  IMPORTANT PLATFORM RULES
  - Completed is authoritative ONLY if:
      candidate_assessments.status = 'completed'
      OR candidate_assessments.completed_at exists
      OR candidate_assessments.result_id exists
      OR assessment_results exists.
    We do NOT use historical completed sessions to decide completion.

  - Activity is any attempt footprint:
      responses exist OR sessions exist OR progress exists OR session_id exists.

  Response:
  { success, assessmentId, mode, count, candidates: [...] }
*/

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getBodyValue(body, keys) {
  if (!body || typeof body !== "object") return null;
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];
    if (body[k] !== undefined && body[k] !== null && body[k] !== "") return body[k];
  }
  return null;
}

function unique(values) {
  const seen = {};
  const out = [];
  safeArray(values).forEach((v) => {
    if (v && !seen[v]) {
      seen[v] = true;
      out.push(v);
    }
  });
  return out;
}

function countByKey(rows, keyName) {
  const map = {};
  safeArray(rows).forEach((row) => {
    const key = row && row[keyName] ? row[keyName] : null;
    if (key) map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function mapById(rows, idName) {
  const map = {};
  safeArray(rows).forEach((row) => {
    if (row && row[idName]) map[row[idName]] = row;
  });
  return map;
}

function isMissingTableError(err) {
  const msg = err && (err.message || err.details || "") ? String(err.message || err.details) : "";
  return msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation") && msg.toLowerCase().includes("does not exist");
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

async function safeSelectByAssessment(serviceClient, tableName, selectText, assessmentId) {
  try {
    const res = await serviceClient.from(tableName).select(selectText).eq("assessment_id", assessmentId);
    if (res.error) {
      if (isMissingTableError(res.error)) return [];
      return [];
    }
    return safeArray(res.data);
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

async function getAssignments(serviceClient, assessmentId) {
  // Prefer a richer select, but fall back if optional columns are absent.
  let res = await serviceClient
    .from("candidate_assessments")
    .select("id,user_id,assessment_id,status,created_at,unblocked_at,result_id,completed_at,session_id,session_status")
    .eq("assessment_id", assessmentId);

  if (!res.error) return { data: safeArray(res.data), error: null };

  res = await serviceClient
    .from("candidate_assessments")
    .select("id,user_id,assessment_id,status,created_at,unblocked_at,result_id,completed_at")
    .eq("assessment_id", assessmentId);

  if (res.error) return { data: [], error: res.error };
  return { data: safeArray(res.data), error: null };
}

function matchesMode(candidate, mode) {
  if (mode === "completed") return candidate.isCompleted === true;
  if (mode === "incomplete") return candidate.hasActivity === true && candidate.isCompleted !== true;
  if (mode === "ready") return candidate.isCompleted !== true && candidate.hasActivity !== true && candidate.assignmentStatus === "unblocked";
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  try {
    const assessmentId = getBodyValue(req.body, ["assessmentId", "assessment_id"]);
    let mode = safeText(getBodyValue(req.body, ["mode", "filterMode", "candidateMode"]), "all").toLowerCase();
    if (["all", "completed", "incomplete", "ready"].indexOf(mode) < 0) mode = "all";

    if (!assessmentId) {
      return res.status(400).json({ success: false, error: "missing_assessment_id", message: "assessmentId is required." });
    }

    const serviceClient = getServiceClient();

    // Enforce supervisor/admin
    const authCheck = await requireSupervisor(serviceClient, req);
    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ success: false, error: authCheck.error, message: authCheck.message });
    }

    const assignmentResult = await getAssignments(serviceClient, assessmentId);
    if (assignmentResult.error) {
      return res.status(500).json({ success: false, error: "candidate_assessments_query_failed", message: assignmentResult.error.message });
    }

    const assignments = assignmentResult.data;
    const userIds = unique(assignments.map((a) => a.user_id));

    if (userIds.length === 0) {
      return res.status(200).json({ success: true, assessmentId, mode, count: 0, candidates: [] });
    }

    // Profiles
    const profilesResult = await serviceClient
      .from("candidate_profiles")
      .select("id,full_name,email,phone,supervisor_id,created_at")
      .in("id", userIds);

    const profileMap = profilesResult.error ? {} : mapById(profilesResult.data, "id");

    // Authoritative results for completion
    const resultsRows = await safeSelectByAssessment(
      serviceClient,
      "assessment_results",
      "id,user_id,assessment_id,total_score,max_score,percentage_score,completed_at,is_valid,is_auto_submitted",
      assessmentId
    );

    // Activity footprints
    const responsesRows = await safeSelectByAssessment(serviceClient, "responses", "id,user_id,assessment_id", assessmentId);
    const sessionsUserRows = await safeSelectByAssessment(serviceClient, "assessment_sessions", "id,user_id,assessment_id,status,completed_at", assessmentId);
    const progressRows = await safeSelectByAssessment(serviceClient, "assessment_progress", "id,user_id,assessment_id", assessmentId);

    const resultMap = mapById(resultsRows, "user_id");
    const responseCounts = countByKey(responsesRows, "user_id");
    const sessionUserCounts = countByKey(sessionsUserRows, "user_id");
    const progressCounts = countByKey(progressRows, "user_id");

    const candidates = assignments
      .map((assignment) => {
        const profile = profileMap[assignment.user_id] || {};
        const result = resultMap[assignment.user_id] || null;

        const responseCount = responseCounts[assignment.user_id] || 0;
        const sessionCount = sessionUserCounts[assignment.user_id] || 0;
        const progressCount = progressCounts[assignment.user_id] || 0;

        const hasResult = result !== null;

        // Authoritative completion only
        const isCompleted = Boolean(
          hasResult ||
            assignment.status === "completed" ||
            !!assignment.result_id ||
            !!assignment.completed_at
        );

        const hasActivity = Boolean(
          responseCount > 0 ||
            sessionCount > 0 ||
            progressCount > 0 ||
            !!assignment.session_id
        );

        return {
          userId: assignment.user_id,
          candidateId: assignment.user_id,
          assessmentId,
          assignmentId: assignment.id,
          fullName: profile.full_name || "Unnamed Candidate",
          email: profile.email || "No email provided",
          phone: profile.phone || "",
          assignmentStatus: assignment.status || "unknown",
          completedAt: assignment.completed_at || (result && result.completed_at ? result.completed_at : null),
          resultId: assignment.result_id || (result && result.id ? result.id : null),
          hasResult,
          isCompleted,
          hasActivity,
          responseCount,
          sessionCount,
          progressCount,
          resetCategory: isCompleted ? "completed" : hasActivity ? "incomplete" : assignment.status === "unblocked" ? "ready" : "assigned"
        };
      })
      .filter((candidate) => matchesMode(candidate, mode));

    candidates.sort((a, b) => safeText(a.fullName, "").localeCompare(safeText(b.fullName, "")));

    return res.status(200).json({ success: true, assessmentId, mode, count: candidates.length, candidates });
  } catch (error) {
    console.error("assessment-reset-candidates error:", error);
    return res.status(500).json({ success: false, error: "server_error", message: error && error.message ? error.message : "Unexpected server error." });
  }
}
