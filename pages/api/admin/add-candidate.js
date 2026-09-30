// pages/api/admin/add-candidate.js
// Phase 7D:
//   • Phone is now REQUIRED. Validated + normalized to E.164 (+233XXXXXXXXX)
//     before writing to candidate_profiles. Accepts Ghanaian mobile numbers
//     in local (0XXXXXXXXX), international with + (+233XXXXXXXXX), and
//     no-plus (233XXXXXXXXX) forms. Rejects landlines, wrong-country numbers,
//     and any "00"-prefixed input.
//   • Validation mirrors public.normalize_ghana_phone in Postgres — same
//     rules, same whitelist, same output format.
//
// Phase 7C (kept):
//   • Accepts `degree_level_id`, validates against degree_levels, stores it.
//   • Removed autoAssignNationalService — retired.
//
// Phase 7B (kept):
//   • Auth via utils/apiAuth.js (authorizeRequest).
//   • Accepts role 'admin' OR 'supervisor'. Supervisor callers forced to
//     themselves; admin callers may specify any supervisor_id.
//   • Accepts and stores university and programme.

import { authorizeRequest } from "../../../utils/apiAuth";

// Ghanaian mobile prefixes (NCA-allocated). Landlines (03x) are rejected.
// If the NCA issues new mobile prefixes, add them here AND in the
// normalize_ghana_phone Postgres function so the two stay in sync.
const GHANA_MOBILE_PREFIXES = new Set([
  "020", "023", "024", "025", "026", "027", "028", "029",
  "050", "053", "054", "055", "056", "057", "058", "059",
]);

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

// Mirror of public.normalize_ghana_phone. Returns the E.164 form
// (+233XXXXXXXXX) if valid, null otherwise.
function normalizeGhanaPhone(input) {
  if (input === null || input === undefined) return null;

  const raw = String(input);
  const clean = raw.replace(/[\s\-().]/g, "");

  if (clean === "") return null;

  // Reject any leading "00" — mistyped international prefix.
  if (clean.startsWith("00")) return null;

  let local;
  if (/^\+233[0-9]{9}$/.test(clean)) {
    local = "0" + clean.slice(4);
  } else if (/^233[0-9]{9}$/.test(clean)) {
    local = "0" + clean.slice(3);
  } else {
    local = clean;
  }

  if (!/^0[0-9]{9}$/.test(local)) return null;

  const prefix = local.slice(0, 3);
  if (!GHANA_MOBILE_PREFIXES.has(prefix)) return null;

  return "+233" + local.slice(1);
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
    const rawPhone = req.body?.phone ?? "";
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

    // Phone is required and must be a valid Ghanaian mobile number.
    const normalizedPhone = normalizeGhanaPhone(rawPhone);
    if (!normalizedPhone) {
      return jsonResponse(res, 400, {
        success: false,
        message:
          "A valid Ghanaian mobile number is required (e.g. 024 123 4567 or +233 24 123 4567).",
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
      phone: normalizedPhone,
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
