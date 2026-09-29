// pages/api/admin/add-candidate.js
// Phase 7C:
//   • Accepts `degree_level_id` from the request body, validates it against
//     degree_levels, and stores it on candidate_profiles alongside
//     university and programme.
//   • Removed autoAssignNationalService. The National Service assessment is
//     retired (deadline passed). Assignment is now a manual, supervisor-driven
//     action via /supervisor/assign-assessment. This mirrors the removal of
//     the equivalent block from pages/register.js.
//
// Phase 7B (kept):
//   • Auth via utils/apiAuth.js (authorizeRequest) — consistent with the rest
//     of the Phase 7B endpoint surface.
//   • Accepts role 'admin' OR 'supervisor'. Previously admin-only, which
//     blocked pages/supervisor/add-candidate.js.
//   • Supervisor callers are forced to link the created candidate to
//     themselves (supervisor_id = caller.userId); they cannot pass an
//     arbitrary supervisor_id. Admin callers may specify any supervisor_id.
//   • Accepts and stores `university` and `programme` on candidate_profiles.
//
// Everything else preserved: duplicate check, invite vs password, audit log,
// rollback on profile insert failure.

import { createClient } from "@supabase/supabase-js";
import { authorizeRequest } from "../../../utils/apiAuth";

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

function generatePassword() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36).slice(-4);
  return "Strat@" + randomPart + timePart + "9";
}

// Returns { value, error }. value is an integer id or null; error is a string
// if the raw input was present but invalid. Callers should 400 on error.
async function resolveDegreeLevelId(adminClient, rawInput) {
  const raw = rawInput === null || rawInput === undefined ? "" : String(rawInput).trim();
  if (raw === "") return { value: null, error: null };

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return { value: null, error: "degree_level_id must be an integer." };
  }

  const { data, error } = await adminClient
    .from("degree_levels")
    .select("id")
    .eq("id", parsed)
    .maybeSingle();

  if (error) {
    return { value: null, error: "Could not validate degree level." };
  }
  if (!data) {
    return { value: null, error: "Selected degree level was not found." };
  }

  return { value: parsed, error: null };
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
      created_at: new Date().toISOString(),
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

  const auth = await authorizeRequest(req, ["admin", "supervisor"]);
  if (auth.error) {
    return jsonResponse(res, auth.status, { success: false, message: auth.error });
  }

  const { caller, serviceClient: adminClient } = auth;

  try {
    const fullName = cleanText(req.body?.full_name || req.body?.fullName);
    const email = cleanText(req.body?.email).toLowerCase();
    const phone = cleanText(req.body?.phone);
    const university = cleanText(req.body?.university);
    const programme = cleanText(req.body?.programme || req.body?.program);
    const providedPassword = cleanText(req.body?.password);
    const password = providedPassword || generatePassword();
    const sendInvite = Boolean(req.body?.send_invite || req.body?.sendInvite);

    // Supervisor callers are locked to themselves. Admin can pick anyone.
    let supervisorId = null;
    if (caller.isAdmin) {
      supervisorId = cleanText(req.body?.supervisor_id || req.body?.supervisorId) || null;
    } else {
      // caller.isSupervisor — ignore whatever the client sent
      supervisorId = caller.userId;
    }

    if (!fullName) {
      return jsonResponse(res, 400, {
        success: false,
        message: "Candidate full name is required.",
      });
    }

    if (!email || !isValidEmail(email)) {
      return jsonResponse(res, 400, {
        success: false,
        message: "A valid candidate email is required.",
      });
    }

    if (password.length < 8) {
      return jsonResponse(res, 400, {
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    // Validate degree level against the degree_levels table before we do
    // anything expensive (auth user creation). Null is allowed.
    const degreeLevelResult = await resolveDegreeLevelId(
      adminClient,
      req.body?.degree_level_id ?? req.body?.degreeLevelId
    );

    if (degreeLevelResult.error) {
      return jsonResponse(res, 400, {
        success: false,
        message: degreeLevelResult.error,
      });
    }

    const degreeLevelId = degreeLevelResult.value;

    if (supervisorId) {
      const { data: supervisor, error: supervisorError } = await adminClient
        .from("supervisor_profiles")
        .select("id, role, is_active")
        .eq("id", supervisorId)
        .maybeSingle();

      if (supervisorError) throw supervisorError;

      if (!supervisor || supervisor.is_active === false) {
        return jsonResponse(res, 400, {
          success: false,
          message: "Selected supervisor was not found or is inactive.",
        });
      }
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("candidate_profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;

    if (existingProfile) {
      return jsonResponse(res, 409, {
        success: false,
        message: "A candidate profile already exists with this email.",
      });
    }

    let createdUser = null;

    if (sendInvite) {
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: {
            role: "candidate",
            full_name: fullName,
          },
        });

      if (inviteError) throw inviteError;
      createdUser = inviteData?.user;
    } else {
      const { data: createData, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role: "candidate",
            full_name: fullName,
          },
        });

      if (createError) throw createError;
      createdUser = createData?.user;
    }

    if (!createdUser?.id) {
      return jsonResponse(res, 500, {
        success: false,
        message: "Candidate auth user could not be created.",
      });
    }

    const profilePayload = {
      id: createdUser.id,
      full_name: fullName,
      email,
      phone: phone || null,
      university: university || null,
      programme: programme || null,
      degree_level_id: degreeLevelId,
      supervisor_id: supervisorId,
    };

    const { data: candidateProfile, error: profileInsertError } = await adminClient
      .from("candidate_profiles")
      .insert(profilePayload)
      .select("id, full_name, email, phone, university, programme, degree_level_id, supervisor_id")
      .single();

    if (profileInsertError) {
      try {
        await adminClient.auth.admin.deleteUser(createdUser.id);
      } catch (deleteError) {
        console.warn("Rollback auth user delete warning:", deleteError?.message || deleteError);
      }
      throw profileInsertError;
    }

    await writeAuditLog(
      adminClient,
      caller.userId,
      createdUser.id,
      candidateProfile || profilePayload
    );

    return jsonResponse(res, 200, {
      success: true,
      message: sendInvite
        ? "Candidate created and invite email sent."
        : "Candidate created successfully.",
      candidate: candidateProfile,
      temporary_password: sendInvite ? null : password,
      invite_sent: sendInvite,
    });
  } catch (error) {
    console.error("Add candidate API error:", error);
    return jsonResponse(res, 500, {
      success: false,
      message: error.message || "Failed to create candidate.",
    });
  }
}
