// pages/api/admin/add-supervisor.js

import { createClient } from "@supabase/supabase-js";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

function isDuplicateUserError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("already") || message.includes("duplicate") || message.includes("registered") || message.includes("exists");
}

async function validateAdmin(serviceClient, accessToken) {
  if (!accessToken) {
    return { ok: false, status: 401, error: "missing_token", message: "Authorization token is required." };
  }

  const { data: authData, error: authError } = await serviceClient.auth.getUser(accessToken);

  if (authError || !authData?.user) {
    return { ok: false, status: 401, error: "invalid_token", message: "Could not validate admin session." };
  }

  const user = authData.user;
  const metadataRole = user.user_metadata?.role || null;

  const { data: profile, error: profileError } = await serviceClient
    .from("supervisor_profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    return { ok: false, status: 500, error: "profile_check_failed", message: profileError.message };
  }

  const resolvedRole = profile?.role || metadataRole;

  if (resolvedRole !== "admin") {
    return { ok: false, status: 403, error: "admin_required", message: "Admin access is required." };
  }

  if (profile?.is_active === false) {
    return { ok: false, status: 403, error: "admin_inactive", message: "Admin account is inactive." };
  }

  return { ok: true, user, profile };
}

async function findAuthUserByEmail(serviceClient, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const found = users.find((user) => cleanEmail(user.email) === email);
    if (found) return found;

    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function createOrGetAuthUser(serviceClient, email, password, fullName) {
  const createResponse = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      name: fullName,
      role: "supervisor",
      user_type: "supervisor",
      is_supervisor: true
    }
  });

  if (!createResponse.error && createResponse.data?.user) {
    return { user: createResponse.data.user, created: true };
  }

  if (!isDuplicateUserError(createResponse.error)) {
    throw createResponse.error;
  }

  const existingUser = await findAuthUserByEmail(serviceClient, email);

  if (!existingUser) {
    throw new Error("A user with this email already exists, but the user record could not be retrieved.");
  }

  await serviceClient.auth.admin.updateUserById(existingUser.id, {
    user_metadata: {
      ...(existingUser.user_metadata || {}),
      full_name: fullName,
      name: fullName,
      role: "supervisor",
      user_type: "supervisor",
      is_supervisor: true
    }
  });

  return { user: existingUser, created: false };
}

async function upsertSupervisorProfile(serviceClient, userId, email, fullName) {
  const now = new Date().toISOString();

  const { data: existingById, error: byIdError } = await serviceClient
    .from("supervisor_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (byIdError && byIdError.code !== "PGRST116") throw byIdError;

  if (existingById) {
    const { data, error } = await serviceClient
      .from("supervisor_profiles")
      .update({
        email,
        full_name: fullName,
        role: "supervisor",
        is_active: true,
        updated_at: now
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return { profile: data, created: false };
  }

  const { data: existingByEmail, error: byEmailError } = await serviceClient
    .from("supervisor_profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (byEmailError && byEmailError.code !== "PGRST116") throw byEmailError;

  if (existingByEmail) {
    throw new Error("A supervisor profile already exists with this email address.");
  }

  const { data, error } = await serviceClient
    .from("supervisor_profiles")
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role: "supervisor",
      is_active: true,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;
  return { profile: data, created: true };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed", message: "Method not allowed." });
  }

  try {
    const serviceClient = getServiceClient();
    const adminCheck = await validateAdmin(serviceClient, getBearerToken(req));

    if (!adminCheck.ok) {
      return res.status(adminCheck.status).json({
        success: false,
        error: adminCheck.error,
        message: adminCheck.message
      });
    }

    const body = req.body || {};
    const email = cleanEmail(body.email);
    const password = String(body.password || "");
    const fullName = cleanName(body.full_name || body.fullName || body.name);

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: "missing_fields",
        message: "Email, password, and full name are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "weak_password",
        message: "Password must be at least 6 characters."
      });
    }

    const authResult = await createOrGetAuthUser(serviceClient, email, password, fullName);
    const profileResult = await upsertSupervisorProfile(serviceClient, authResult.user.id, email, fullName);

    return res.status(200).json({
      success: true,
      message: profileResult.created ? "Supervisor added successfully." : "Supervisor profile updated successfully.",
      auth_user_created: authResult.created,
      supervisor_profile_created: profileResult.created,
      supervisor: profileResult.profile
    });
  } catch (error) {
    console.error("Add supervisor API error:", error);

    const status = isDuplicateUserError(error) ? 409 : 500;

    return res.status(status).json({
      success: false,
      error: status === 409 ? "duplicate_supervisor" : "server_error",
      message: error?.message || "Failed to add supervisor."
    });
  }
}
