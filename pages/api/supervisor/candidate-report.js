import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get candidate profile
    const { data: profile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get all completed assessments with results
    const { data: assessments } = await supabase
      .from('assessment_results')
      .select(`
        *,
        assessment:assessments(
          id,
          title,
          assessment_type:assessment_types(
            id,
            code,
            name,
            icon,
            gradient_start,
            gradient_end
          )
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    return res.status(200).json({
      success: true,
      profile: profile || { id: userId, full_name: 'Unknown' },
      assessments: assessments || []
    });

  } catch (error) {
    console.error("Candidate report error:", error);
    return res.status(500).json({ error: error.message });
  }
}
