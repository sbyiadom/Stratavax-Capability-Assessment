// pages/api/admin/create-user.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  console.log("[Create User API] Request received");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { 
      email, 
      password, 
      full_name, 
      university, 
      programme, 
      graduation_year, 
      preferred_department 
    } = req.body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: email, password, and full_name are required." 
      });
    }

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

    // ============================================================
    // STEP 1: Check if user exists in auth.users
    // ============================================================
    console.log("[Create User API] Checking if user exists in auth:", email);
    
    const { data: existingAuth, error: authCheckError } = await adminClient
      .from("auth.users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (authCheckError) {
      console.log("[Create User API] Auth check error:", authCheckError.message);
    }

    if (existingAuth) {
      console.log("[Create User API] User already exists in auth:", existingAuth.id);
      
      // Check if profile exists for this user
      const { data: existingProfile } = await adminClient
        .from("candidate_profiles")
        .select("id")
        .eq("id", existingAuth.id)
        .maybeSingle();

      if (existingProfile) {
        return res.status(409).json({ 
          success: false, 
          error: "An account with this email already exists. Please log in instead." 
        });
      }

      // If user exists in auth but not in profiles, create the profile
      console.log("[Create User API] User exists in auth but not in profiles. Creating profile...");
      
      const profileData = {
        id: existingAuth.id,
        email: email,
        full_name: full_name,
        university: university || null,
        programme: programme || null,
        graduation_year: graduation_year || null,
        preferred_department: preferred_department || null,
        updated_at: new Date().toISOString()
      };

      const { data: profile, error: profileError } = await adminClient
        .from("candidate_profiles")
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error("[Create User API] Profile creation error:", profileError);
        return res.status(500).json({ 
          success: false, 
          error: "Failed to create profile: " + profileError.message 
        });
      }

      console.log("[Create User API] ✅ Profile created for existing user");

      return res.status(200).json({
        success: true,
        message: "Account found and profile created. Please log in.",
        user: {
          id: existingAuth.id,
          email: email,
          full_name: full_name
        }
      });
    }

    // ============================================================
    // STEP 2: Create new user (only if not exists)
    // ============================================================
    console.log("[Create User API] Creating new user:", email);

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
      console.error("[Create User API] Create user error:", userError);
      return res.status(500).json({ 
        success: false, 
        error: userError.message || "Failed to create account. Please try again." 
      });
    }

    if (!userData?.user) {
      return res.status(500).json({ 
        success: false, 
        error: "Account creation failed. Please try again." 
      });
    }

    console.log("[Create User API] ✅ User created:", userData.user.id);

    // ============================================================
    // STEP 3: Create candidate profile
    // ============================================================
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

    console.log("[Create User API] Creating profile...");

    const { data: profile, error: profileError } = await adminClient
      .from("candidate_profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("[Create User API] Profile creation error:", profileError);
      // Rollback: delete the user
      await adminClient.auth.admin.deleteUser(userData.user.id);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to create profile: " + profileError.message 
      });
    }

    console.log("[Create User API] ✅ Profile created:", profile.id);

    // ============================================================
    // STEP 4: Auto-assign National Service assessment
    // ============================================================
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

    // ============================================================
    // STEP 5: Add to supervisor_candidate_access
    // ============================================================
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

    // ============================================================
    // STEP 6: Return success
    // ============================================================
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
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Registration failed. Please try again."
    });
  }
}
