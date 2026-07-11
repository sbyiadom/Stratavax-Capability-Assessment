// pages/api/admin/create-user.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
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

    if (!email || !password || !full_name) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields" 
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ 
        success: false, 
        error: "Registration service unavailable" 
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ============================================================
    // STEP 1: Check if profile already exists by email
    // ============================================================
    const { data: existingProfile } = await adminClient
      .from("candidate_profiles")
      .select("id, email, full_name")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Profile already exists - registration is complete!
      console.log("[Create User API] Profile already exists for:", email);
      return res.status(200).json({
        success: true,
        message: "Account already exists. Please log in.",
        user: {
          id: existingProfile.id,
          email: email,
          full_name: existingProfile.full_name
        }
      });
    }

    // ============================================================
    // STEP 2: Check if user exists in auth
    // ============================================================
    const { data: existingAuth } = await adminClient
      .from("auth.users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    let userId;

    if (existingAuth) {
      // User exists in auth but not in profile - create profile
      userId = existingAuth.id;
      console.log("[Create User API] User exists in auth, creating profile:", userId);
    } else {
      // Create new user
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
          error: userError.message || "Failed to create account" 
        });
      }

      if (!userData?.user) {
        return res.status(500).json({ 
          success: false, 
          error: "Account creation failed" 
        });
      }

      userId = userData.user.id;
      console.log("[Create User API] ✅ User created:", userId);
    }

    // ============================================================
    // STEP 3: Create profile (or update if exists)
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

    // Try to insert, but if it fails with duplicate key, fetch the existing profile
    let profile;
    try {
      const { data, error } = await adminClient
        .from("candidate_profiles")
        .insert(profileData)
        .select()
        .single();

      if (error) {
        // If duplicate key error, fetch existing profile
        if (error.code === '23505') { // Postgres unique violation
          console.log("[Create User API] Duplicate key, fetching existing profile");
          
          const { data: existing } = await adminClient
            .from("candidate_profiles")
            .select("id, email, full_name")
            .eq("email", email)
            .maybeSingle();

          if (existing) {
            profile = existing;
            console.log("[Create User API] ✅ Using existing profile:", profile.id);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      } else {
        profile = data;
        console.log("[Create User API] ✅ Profile created:", profile.id);
      }
    } catch (insertError) {
      console.error("[Create User API] Profile error:", insertError);
      
      // Rollback: delete the user if we created it
      if (!existingAuth) {
        await adminClient.auth.admin.deleteUser(userId);
      }
      
      return res.status(500).json({ 
        success: false, 
        error: insertError.message || "Failed to create profile" 
      });
    }

    // ============================================================
    // STEP 4: Assign National Service (only if new)
    // ============================================================
    if (!existingProfile) {
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
          console.warn("[Create User API] Assignment warning:", assignmentError.message);
        } else {
          console.log("[Create User API] ✅ National Service assigned");
        }
      } catch (e) {
        console.warn("[Create User API] Assignment exception:", e.message);
      }

      // ============================================================
      // STEP 5: Add supervisor access
      // ============================================================
      try {
        const defaultSupervisors = [
          "972a8a23-e0c4-4031-a553-191c9a31fbed",
          "f4b541af-f765-46f0-8f1a-955ad1847930"
        ];

        for (const supervisorId of defaultSupervisors) {
          await adminClient
            .from("supervisor_candidate_access")
            .insert({
              supervisor_id: supervisorId,
              candidate_id: userId
            })
            .select()
            .maybeSingle();
        }
        console.log("[Create User API] ✅ Added to supervisors");
      } catch (e) {
        console.warn("[Create User API] Supervisor exception:", e.message);
      }
    }

    // ============================================================
    // STEP 6: Return success
    // ============================================================
    return res.status(200).json({
      success: true,
      message: existingProfile ? "Account already exists. Please log in." : "Registration successful! Please log in.",
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
