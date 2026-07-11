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
    // STEP 1: Check if user already exists in auth
    // ============================================================
    const { data: existingAuth } = await adminClient
      .from("auth.users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    let userId;

    if (existingAuth) {
      userId = existingAuth.id;
      console.log("[Create User API] User already exists in auth:", userId);
    } else {
      // ============================================================
      // STEP 2: Create new user
      // ============================================================
      console.log("[Create User API] Creating new user...");

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

      userId = userData.user.id;
      console.log("[Create User API] ✅ User created:", userId);
    }

    // ============================================================
    // STEP 3: Create profile (using upsert)
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

    console.log("[Create User API] Creating profile for user:", userId);

    const { data: profile, error: profileError } = await adminClient
      .from("candidate_profiles")
      .upsert(profileData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (profileError) {
      console.error("[Create User API] Profile error:", profileError);
      
      if (!existingAuth) {
        await adminClient.auth.admin.deleteUser(userId);
      }
      
      return res.status(500).json({ 
        success: false, 
        error: "Failed to create profile: " + profileError.message 
      });
    }

    console.log("[Create User API] ✅ Profile saved:", profile.id);

    // ============================================================
    // STEP 4: Auto-assign National Service (with error handling)
    // ============================================================
    // Only assign if it's a new user
    if (!existingAuth) {
      try {
        const NATIONAL_SERVICE_ASSESSMENT_ID = "bdb9d46e-9fac-4d00-8478-1f649e7ac600";

        // First check if the assessment exists
        const { data: assessmentCheck } = await adminClient
          .from("assessments")
          .select("id, is_active")
          .eq("id", NATIONAL_SERVICE_ASSESSMENT_ID)
          .eq("is_active", true)
          .maybeSingle();

        if (!assessmentCheck) {
          console.warn("[Create User API] ⚠️ National Service assessment not found or inactive");
        } else {
          // Assign the assessment
          const { error: assignmentError } = await adminClient
            .from("candidate_assessments")
            .upsert({
              user_id: userId,
              assessment_id: NATIONAL_SERVICE_ASSESSMENT_ID,
              status: "unblocked",
              unblocked_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'user_id,assessment_id'
            });

          if (assignmentError) {
            console.warn("[Create User API] ⚠️ Assessment assignment error:", assignmentError.message);
            // Don't fail registration for this
          } else {
            console.log("[Create User API] ✅ National Service assessment assigned");
          }
        }
      } catch (e) {
        console.warn("[Create User API] ⚠️ Assignment exception:", e.message);
      }

      // ============================================================
      // STEP 5: Add to supervisors
      // ============================================================
      try {
        const defaultSupervisors = [
          "972a8a23-e0c4-4031-a553-191c9a31fbed",
          "f4b541af-f765-46f0-8f1a-955ad1847930"
        ];

        for (const supervisorId of defaultSupervisors) {
          await adminClient
            .from("supervisor_candidate_access")
            .upsert({
              supervisor_id: supervisorId,
              candidate_id: userId
            }, { 
              onConflict: 'supervisor_id,candidate_id'
            })
            .select()
            .maybeSingle();
        }
        console.log("[Create User API] ✅ Added to supervisors");
      } catch (e) {
        console.warn("[Create User API] ⚠️ Supervisor exception:", e.message);
      }
    }

    // ============================================================
    // STEP 6: Return success (always succeeds, even if assignment fails)
    // ============================================================
    return res.status(200).json({
      success: true,
      message: existingAuth ? "Account already exists. Please log in." : "Registration successful! Your account has been created. Please log in.",
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
