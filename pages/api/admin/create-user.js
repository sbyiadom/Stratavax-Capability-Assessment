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
        error: "Registration service is temporarily unavailable." 
      });
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("[Create User API] Processing email:", email);

    // ============================================================
    // STEP 1: Check if email already exists in candidate_profiles
    // ============================================================
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from("candidate_profiles")
      .select("id, email, full_name")
      .eq("email", email)
      .maybeSingle();

    if (profileCheckError) {
      console.error("[Create User API] Profile check error:", profileCheckError);
      // Continue anyway
    }

    if (existingProfile) {
      console.log("[Create User API] Profile already exists for email:", email);
      return res.status(409).json({ 
        success: false, 
        error: "An account with this email already exists. Please log in instead." 
      });
    }

    // ============================================================
    // STEP 2: Check if email already exists in auth.users
    // ============================================================
    const { data: existingAuth, error: authCheckError } = await adminClient
      .from("auth.users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (authCheckError) {
      console.error("[Create User API] Auth check error:", authCheckError);
      // Continue anyway
    }

    // ============================================================
    // STEP 3: Get or create user ID
    // ============================================================
    let userId = null;

    if (existingAuth) {
      // Use existing auth user
      userId = existingAuth.id;
      console.log("[Create User API] Using existing auth user:", userId);
    } else {
      // Create new auth user
      console.log("[Create User API] Creating new auth user...");

      try {
        const createResult = await adminClient.auth.admin.createUser({
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

        if (createResult.error) {
          console.error("[Create User API] Create user error:", createResult.error);
          
          // Check if user was actually created despite error
          const { data: recheckAuth } = await adminClient
            .from("auth.users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (recheckAuth) {
            userId = recheckAuth.id;
            console.log("[Create User API] User was created despite error, using ID:", userId);
          } else {
            throw new Error(createResult.error.message || "Failed to create user");
          }
        } else if (createResult.data?.user) {
          userId = createResult.data.user.id;
          console.log("[Create User API] ✅ User created:", userId);
        }
      } catch (createErr) {
        console.error("[Create User API] Create exception:", createErr);
        
        // Check if user exists now
        const { data: recheckAuth } = await adminClient
          .from("auth.users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (recheckAuth) {
          userId = recheckAuth.id;
          console.log("[Create User API] User exists, using existing ID:", userId);
        } else {
          throw createErr;
        }
      }
    }

    if (!userId) {
      throw new Error("Could not create or find user. Please try again.");
    }

    // ============================================================
    // STEP 4: Create candidate profile (with the correct ID)
    // ============================================================
    const profileData = {
      id: userId,
      email: email,
      full_name: full_name,
      university: university || null,
      programme: programme || null,
      graduation_year: graduation_year || null,
      preferred_department: preferred_department || null,
      updated_at: new Date().toISOString()
    };

    console.log("[Create User API] Creating profile with ID:", userId);

    const { data: profile, error: profileError } = await adminClient
      .from("candidate_profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("[Create User API] Profile error:", profileError);
      throw new Error("Failed to create profile: " + profileError.message);
    }

    console.log("[Create User API] ✅ Profile created:", profile.id);

    // ============================================================
    // STEP 5: Auto-assign National Service assessment
    // ============================================================
    try {
      const NATIONAL_SERVICE_ASSESSMENT_ID = "bdb9d46e-9fac-4d00-8478-1f649e7ac600";

      const { error: assignmentError } = await adminClient
        .from("candidate_assessments")
        .insert({
          user_id: userId,
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
    } catch (assignErr) {
      console.warn("[Create User API] Assignment exception:", assignErr.message);
    }

    // ============================================================
    // STEP 6: Add to supervisors
    // ============================================================
    try {
      const defaultSupervisors = [
        "972a8a23-e0c4-4031-a553-191c9a31fbed",
        "f4b541af-f765-46f0-8f1a-955ad1847930"
      ];

      for (const supervisorId of defaultSupervisors) {
        const { error: accessError } = await adminClient
          .from("supervisor_candidate_access")
          .insert({
            supervisor_id: supervisorId,
            candidate_id: userId
          })
          .select()
          .maybeSingle();

        if (accessError) {
          console.warn("[Create User API] Supervisor access error:", accessError.message);
        }
      }
      console.log("[Create User API] ✅ Added to supervisors");
    } catch (superErr) {
      console.warn("[Create User API] Supervisor exception:", superErr.message);
    }

    // ============================================================
    // STEP 7: Return success
    // ============================================================
    return res.status(200).json({
      success: true,
      message: "Registration successful! Your account has been created. Please log in.",
      user: {
        id: userId,
        email: email,
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
