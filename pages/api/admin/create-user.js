// pages/api/admin/create-user.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  console.log("[Create User API] Request received");
  console.log("[Create User API] Method:", req.method);

  if (req.method !== "POST") {
    console.log("[Create User API] Method not allowed:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = req.body;
    console.log("[Create User API] Request body:", JSON.stringify(body, null, 2));

    const { 
      email, 
      password, 
      full_name, 
      university, 
      programme, 
      graduation_year, 
      preferred_department 
    } = body;

    // Validate required fields
    if (!email || !password || !full_name) {
      console.log("[Create User API] Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: email, password, and full_name are required." 
      });
    }

    console.log("[Create User API] Email:", email);
    console.log("[Create User API] Full Name:", full_name);
    console.log("[Create User API] Supabase URL exists:", !!supabaseUrl);
    console.log("[Create User API] Service Role Key exists:", !!serviceRoleKey);

    // Check if service role key is configured
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Create User API] Missing Supabase configuration");
      return res.status(500).json({ 
        success: false, 
        error: "Registration service is temporarily unavailable. Please try again later." 
      });
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("[Create User API] Admin client created");

    // Step 1: Check if user already exists in auth
    try {
      console.log("[Create User API] Checking auth.users for:", email);
      const { data: existingAuth, error: authCheckError } = await adminClient
        .from("auth.users")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (authCheckError) {
        console.log("[Create User API] Auth check error (continuing):", authCheckError.message);
      }

      if (existingAuth) {
        console.log("[Create User API] User already exists in auth");
        return res.status(409).json({ 
          success: false, 
          error: "An account with this email already exists. Please log in instead." 
        });
      }
      console.log("[Create User API] User does not exist in auth");
    } catch (authCheckErr) {
      console.log("[Create User API] Auth check exception (continuing):", authCheckErr.message);
    }

    // Step 2: Check if user already exists in profiles
    try {
      console.log("[Create User API] Checking candidate_profiles for:", email);
      const { data: existingProfile, error: profileCheckError } = await adminClient
        .from("candidate_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileCheckError) {
        console.log("[Create User API] Profile check error (continuing):", profileCheckError.message);
      }

      if (existingProfile) {
        console.log("[Create User API] Profile already exists");
        return res.status(409).json({ 
          success: false, 
          error: "A candidate profile with this email already exists." 
        });
      }
      console.log("[Create User API] No existing profile found");
    } catch (profileCheckErr) {
      console.log("[Create User API] Profile check exception (continuing):", profileCheckErr.message);
    }

    // Step 3: Create user via admin API
    console.log("[Create User API] Creating user with email:", email);
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        name: full_name,
        role: "candidate",
        user_type: "candidate"
      }
    });

    if (userError) {
  console.error(
    "[Create User API] Create user error:",
    JSON.stringify(userError, null, 2)
  );

  return res.status(500).json({
    success: false,
    error: userError.message,
    details: userError
  });
}
``

    if (!userData?.user) {
      console.error("[Create User API] No user data returned");
      return res.status(500).json({ 
        success: false, 
        error: "Account creation failed. Please try again." 
      });
    }

    console.log("[Create User API] ✅ User created:", userData.user.id);

    // Step 4: Create candidate profile
    const profileData = {
      id: userData.user.id,
      email: email,
      full_name: full_name,
      university: university || null,
      programme: programme || null,
      graduation_year: graduation_year || null,
      preferred_department: preferred_department || null,
      updated_at: new Date().toISOString()
    };

    console.log("[Create User API] Creating profile with data:", JSON.stringify(profileData, null, 2));

    const { data: profile, error: profileError } = await adminClient
      .from("candidate_profiles")
      .insert(profileData)
      .select()
      .single();

   if (profileError) {
  console.error(
    "[Create User API] Profile creation error:",
    JSON.stringify(profileError, null, 2)
  );

  await adminClient.auth.admin.deleteUser(userData.user.id);

  return res.status(500).json({
    success: false,
    error: profileError.message,
    details: profileError
  });
}

    console.log("[Create User API] ✅ Profile created:", profile.id);

    // Step 5: Auto-assign National Service assessment
    const NATIONAL_SERVICE_ASSESSMENT_ID = "bdb9d46e-9fac-4d00-8478-1f649e7ac600";

    const { error: assignmentError } = await adminClient
      .from("candidate_assessments")
      .insert({
        user_id: userData.user.id,
        assessment_id: NATIONAL_SERVICE_ASSESSMENT_ID,
        status: "unblocked",
        unblocked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (assignmentError) {
      console.warn("[Create User API] Assignment error (non-fatal):", assignmentError.message);
    } else {
      console.log("[Create User API] ✅ National Service assessment assigned");
    }

    // Step 6: Add to supervisor_candidate_access
    const defaultSupervisors = [
      "972a8a23-e0c4-4031-a553-191c9a31fbed", // Maabena Baah
      "f4b541af-f765-46f0-8f1a-955ad1847930"  // Emmanuel Fofie
    ];

    let supervisorAccessCount = 0;
    for (const supervisorId of defaultSupervisors) {
      const { error: accessError } = await adminClient
        .from("supervisor_candidate_access")
        .insert({
          supervisor_id: supervisorId,
          candidate_id: userData.user.id
        })
        .select()
        .maybeSingle();

      if (!accessError) {
        supervisorAccessCount++;
      }
    }

    console.log(`[Create User API] ✅ Added to ${supervisorAccessCount} supervisor(s)`);

    // Return success
    return res.status(200).json({
      success: true,
      message: "Registration successful! Your account has been created. Please log in.",
      user: {
        id: userData.user.id,
        email: userData.user.email,
        full_name: full_name
      }
    });

  } catch (error) {
    console.error("[Create User API] Unhandled error:", error);
    console.error("[Create User API] Error stack:", error.stack);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Registration failed. Please try again.",
      details: error.message
    });
  }
}
