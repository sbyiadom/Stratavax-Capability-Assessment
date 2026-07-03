// pages/api/assessment/[id].js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing assessment ID" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const serviceClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const response = await serviceClient
      .from("assessments")
      .select("*, assessment_type:assessment_types(*)")
      .eq("id", id)
      .single();

    if (response.error || !response.data) {
      return res.status(404).json({
        success: false,
        error: "Assessment not found"
      });
    }

    return res.status(200).json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error("Error fetching assessment:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch assessment"
    });
  }
}
