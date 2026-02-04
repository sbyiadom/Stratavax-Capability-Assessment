import { supabase } from "../../supabase/client";
import { totalScore, calculateSectionScores, classifyTalent, getStrengths, getDevelopmentAreas } from "../../utils/scoring";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { assessment_id, user_id } = req.body;
  
  if (!assessment_id || !user_id) {
    return res.status(400).json({ error: "assessment_id and user_id are required" });
  }

  try {
    // Get all responses with question details
    const { data: responses, error } = await supabase
      .from("responses")
      .select(`
        score,
        question:questions (section, subsection)
      `)
      .eq("assessment_id", assessment_id)
      .eq("user_id", user_id);

    if (error) throw error;

    // Calculate scores
    const overallScore = totalScore(responses || []);
    const sectionScores = calculateSectionScores(responses || []);
    const classification = classifyTalent(overallScore);
    const strengths = getStrengths(sectionScores);
    const developmentAreas = getDevelopmentAreas(sectionScores);

    // Save to talent_classification
    const { error: insertError } = await supabase
      .from("talent_classification")
      .upsert({
        assessment_id,
        user_id,
        total_score: overallScore,
        cognitive_score: sectionScores['Cognitive Abilities'] || 0,
        personality_score: sectionScores['Personality Assessment'] || 0,
        leadership_score: sectionScores['Leadership Potential'] || 0,
        technical_score: sectionScores['Technical Competence'] || 0,
        performance_score: sectionScores['Performance Metrics'] || 0,
        classification,
        strengths: strengths.length > 0 ? strengths : null,
        development_areas: developmentAreas.length > 0 ? developmentAreas : null,
      }, { 
        onConflict: ["assessment_id", "user_id"] 
      });

    if (insertError) throw insertError;

    res.status(200).json({
      total: overallScore,
      classification,
      sectionScores,
      strengths,
      developmentAreas,
      message: "Assessment successfully classified"
    });
  } catch (err) {
    console.error("Classification error:", err);
    res.status(500).json({ error: err.message });
  }
}
