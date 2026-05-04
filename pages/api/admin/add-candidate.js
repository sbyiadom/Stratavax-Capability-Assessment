// pages/api/admin/add-candidate.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function jsonResponse(res, status, payload) {
  return res.status(status).json(payload);
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeUuid(value) {
  const text = cleanText(value);
  if (!text) return null;
  return text;
}

function generatePassword() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36).slice(-4);
  return "Strat@" + randomPart + timePart + "9";
}

async function getAuthenticatedAdmin(adminClient, req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { error: "Missing authorization token." };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return { error: "Invalid or expired authorization token." };
  }

  const authUser = userData.user;

  const { data: profile, error: profileError } = await adminClient
    .from("supervisor_profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message || "Unable to verify admin profile." };
  }

  const resolvedRole = profile?.role || authUser.user_metadata?.role;

  if (resolvedRole !== "admin") {
    return { error: "Admin access is required." };
  }

  if (profile?.is_active === false) {
    return { error: "Admin account is inactive." };
  }

  return { adminUser: authUser, adminProfile: profile };
}

async function writeAuditLog(adminClient, adminUserId, candidateId, payload) {
  try {
    await adminClient.from("audit_logs").insert({
      user_id: adminUserId,
      action: "create",
      table_name: "candidate_profiles",
      record_id: candidateId,
      old_data: null,
      new_data: payload,
      ip_address: null,
      user_agent: null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Candidate creation audit log warning:", error?.message || error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return jsonResponse(res, 405, { success: false, message: "Method not allowed." });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(res, 500, {
      success: false,
      message: "Supabase service role configuration is missing. Set SUPABASE_SERVICE_ROLE_KEY in Vercel."
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const authCheck = await getAuthenticatedAdmin(adminClient, req);

    if (authCheck.error) {
      return jsonResponse(res, 403, { success: false, message: authCheck.error });
    }

    const fullName = cleanText(req.body?.full_name || req.body?.fullName);
    const email = cleanText(req.body?.email).toLowerCase();
    const phone = cleanText(req.body?.phone);
    const supervisorId = normalizeUuid(req.body?.supervisor_id || req.body?.supervisorId);
    const providedPassword = cleanText(req.body?.password);
    const password = providedPassword || generatePassword();
    const sendInvite = Boolean(req.body?.send_invite || req.body?.sendInvite);

    if (!fullName) {
      return jsonResponse(res, 400, { success: false, message: "Candidate full name is required." });
    }

    if (!email || !isValidEmail(email)) {
      return jsonResponse(res, 400, { success: false, message: "A valid candidate email is required." });
    }

    if (password.length < 8) {
      return jsonResponse(res, 400, { success: false, message: "Password must be at least 8 characters." });
    }

    if (supervisorId) {
      const { data: supervisor, error: supervisorError } = await adminClient
        .from("supervisor_profiles")
        .select("id, role, is_active")
        .eq("id", supervisorId)
        .maybeSingle();

      if (supervisorError) throw supervisorError;

      if (!supervisor || supervisor.is_active === false) {
        return jsonResponse(res, 400, { success: false, message: "Selected supervisor was not found or is inactive." });
      }
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("candidate_profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;

    if (existingProfile) {
      return jsonResponse(res, 409, { success: false, message: "A candidate profile already exists with this email." });
    }

    let createdUser = null;

    if (sendInvite) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          role: "candidate",
          full_name: fullName
        }
      });

      if (inviteError) throw inviteError;
      createdUser = inviteData?.user;
    } else {
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "candidate",
          full_name: fullName
        }
      });

      if (createError) throw createError;
      createdUser = createData?.user;
    }

    if (!createdUser?.id) {
      return jsonResponse(res, 500, { success: false, message: "Candidate auth user could not be created." });
    }

    const profilePayload = {
      id: createdUser.id,
      full_name: fullName,
      email,
      phone: phone || null,
      supervisor_id: supervisorId
    };

    const { data: candidateProfile, error: profileInsertError } = await adminClient
      .from("candidate_profiles")
      .insert(profilePayload)
      .select("id, full_name, email, phone, supervisor_id")
      .single();

    if (profileInsertError) {
      try {
        await adminClient.auth.admin.deleteUser(createdUser.id);
      } catch (deleteError) {
        console.warn("Rollback auth user delete warning:", deleteError?.message || deleteError);
      }
      throw profileInsertError;
    }

    await writeAuditLog(adminClient, authCheck.adminUser.id, createdUser.id, candidateProfile || profilePayload);

    return jsonResponse(res, 200, {
      success: true,
      message: sendInvite ? "Candidate created and invite email sent." : "Candidate created successfully.",
      candidate: candidateProfile,
      temporary_password: sendInvite ? null : password,
      invite_sent: sendInvite
    });
  } catch (error) {
    console.error("Add candidate API error:", error);
    return jsonResponse(res, 500, {
      success: false,
      message: error.message || "Failed to create candidate."
    });
  }
}
