import { supabase } from "../../supabase/client";

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
    const overallScore = calculateTotalScore(responses || []);
    const sectionScores = calculateSectionScores(responses || []);
    const classification = getOverallClassification(overallScore);
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

// Helper functions (you can import these from your utils or define them here)
function calculateTotalScore(responses) {
  if (!responses || responses.length === 0) return 0;
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * 4;
  return Math.round((total / maxPossible) * 100);
}

function calculateSectionScores(responses) {
  const sections = {
    'Cognitive Abilities': { total: 0, count: 0 },
    'Personality Assessment': { total: 0, count: 0 },
    'Leadership Potential': { total: 0, count: 0 },
    'Technical Competence': { total: 0, count: 0 },
    'Performance Metrics': { total: 0, count: 0 }
  };

  responses.forEach(response => {
    const section = response.question?.section;
    if (section && sections[section]) {
      sections[section].total += response.score || 0;
      sections[section].count += 1;
    }
  });

  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      result[section] = Math.round((data.total / (data.count * 4)) * 100);
    } else {
      result[section] = 0;
    }
  });

  return result;
}

function getOverallClassification(score) {
  if (score >= 90) return "Elite Talent";
  if (score >= 80) return "Top Talent";
  if (score >= 70) return "High Potential";
  if (score >= 60) return "Solid Performer";
  if (score >= 50) return "Developing Talent";
  if (score >= 40) return "Emerging Talent";
  return "Needs Improvement";
}

function getStrengths(sectionScores) {
  const strengths = [];
  const threshold = 70;
  
  Object.entries(sectionScores).forEach(([section, score]) => {
    if (score >= threshold) {
      strengths.push(section);
    }
  });
  
  return strengths;
}

function getDevelopmentAreas(sectionScores) {
  const areas = [];
  const threshold = 50;
  
  Object.entries(sectionScores).forEach(([section, score]) => {
    if (score < threshold) {
      areas.push(section);
    }
  });
  
  return areas;
}
