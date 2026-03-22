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

    // Get the assessment type to determine which sections to save
    const { data: assessment } = await supabase
      .from("assessments")
      .select("assessment_type:assessment_types(code)")
      .eq("id", assessment_id)
      .single();

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Build the scores object based on assessment type
    let scoresToSave = {
      assessment_id,
      user_id,
      total_score: overallScore,
      classification,
      strengths: strengths.length > 0 ? strengths : null,
      development_areas: developmentAreas.length > 0 ? developmentAreas : null,
    };

    // Handle personality assessment separately with 6 traits
    if (assessmentType === 'personality') {
      scoresToSave.personality_ownership = sectionScores['Ownership'] || 0;
      scoresToSave.personality_collaboration = sectionScores['Collaboration'] || 0;
      scoresToSave.personality_action = sectionScores['Action'] || 0;
      scoresToSave.personality_analysis = sectionScores['Analysis'] || 0;
      scoresToSave.personality_risk_tolerance = sectionScores['Risk Tolerance'] || 0;
      scoresToSave.personality_structure = sectionScores['Structure'] || 0;
    } else {
      // For other assessment types, use generic fields
      scoresToSave.cognitive_score = sectionScores['Cognitive Abilities'] || 
                                      sectionScores['Cognitive Ability'] || 
                                      sectionScores['Logical / Abstract Reasoning'] || 0;
      scoresToSave.leadership_score = sectionScores['Leadership Potential'] || 
                                      sectionScores['Leadership & Management'] || 
                                      sectionScores['Vision & Strategic Thinking'] || 0;
      scoresToSave.technical_score = sectionScores['Technical Competence'] || 
                                     sectionScores['Technical Knowledge'] || 0;
      scoresToSave.performance_score = sectionScores['Performance Metrics'] || 
                                       sectionScores['Productivity & Efficiency'] || 0;
    }

    // Save to talent_classification
    const { error: insertError } = await supabase
      .from("talent_classification")
      .upsert(scoresToSave, { 
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

// Helper functions
function calculateTotalScore(responses) {
  if (!responses || responses.length === 0) return 0;
  const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxPossible = responses.length * 5; // Changed from 4 to 5 (since scores are 0-5)
  return Math.round((total / maxPossible) * 100);
}

function calculateSectionScores(responses) {
  const sections = {};

  responses.forEach(response => {
    const section = response.question?.section;
    if (section) {
      if (!sections[section]) {
        sections[section] = { total: 0, count: 0, maxPossible: 0 };
      }
      sections[section].total += response.score || 0;
      sections[section].count += 1;
      sections[section].maxPossible += 5;
    }
  });

  const result = {};
  Object.entries(sections).forEach(([section, data]) => {
    if (data.count > 0) {
      result[section] = Math.round((data.total / data.maxPossible) * 100);
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
