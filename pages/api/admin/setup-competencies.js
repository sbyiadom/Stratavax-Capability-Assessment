import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user's session from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a client with the user's token (respects RLS policies)
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    console.log("🚀 Starting competency setup with user token...");

    // 1. Insert default competencies if they don't exist
    console.log("📋 Inserting default competencies...");
    const defaultCompetencies = [
      // Leadership competencies
      { name: 'Strategic Thinking', description: 'Ability to think ahead, envision possibilities, and plan strategically', category: 'Leadership', display_order: 1 },
      { name: 'Emotional Intelligence', description: 'Ability to recognize, understand, and manage emotions', category: 'Leadership', display_order: 2 },
      { name: 'Decision Making', description: 'Ability to make sound, timely decisions', category: 'Leadership', display_order: 3 },
      { name: 'Communication', description: 'Ability to convey information effectively', category: 'Leadership', display_order: 4 },
      { name: 'People Management', description: 'Ability to lead and develop others', category: 'Leadership', display_order: 5 },
      { name: 'Vision', description: 'Ability to create and communicate a compelling vision', category: 'Leadership', display_order: 6 },
      { name: 'Execution', description: 'Ability to deliver results', category: 'Leadership', display_order: 7 },
      { name: 'Resilience', description: 'Ability to recover from setbacks', category: 'Leadership', display_order: 8 },
      
      // Behavioral competencies
      { name: 'Adaptability', description: 'Ability to adjust to new conditions', category: 'Behavioral', display_order: 9 },
      { name: 'Accountability', description: 'Taking ownership of actions and results', category: 'Behavioral', display_order: 10 },
      { name: 'Collaboration', description: 'Working effectively with others', category: 'Behavioral', display_order: 11 },
      { name: 'Integrity', description: 'Honesty and ethical behavior', category: 'Behavioral', display_order: 12 },
      
      // Cognitive competencies
      { name: 'Cognitive Ability', description: 'Problem-solving, analytical thinking, and learning capacity', category: 'Cognitive', display_order: 13 },
      { name: 'Problem Solving', description: 'Ability to analyze and solve complex problems', category: 'Cognitive', display_order: 14 },
      { name: 'Learning Agility', description: 'Ability to learn quickly and apply knowledge', category: 'Cognitive', display_order: 15 },
      
      // Technical
      { name: 'Technical Knowledge', description: 'Domain-specific technical expertise', category: 'Technical', display_order: 16 },
      
      // Cultural
      { name: 'Cultural Fit', description: 'Alignment with organizational values and culture', category: 'Cultural', display_order: 17 }
    ];

    // Insert competencies one by one to handle errors gracefully
    for (const comp of defaultCompetencies) {
      const { error } = await userClient
        .from('competencies')
        .upsert(comp, { onConflict: 'name' });
      
      if (error) {
        console.error(`Error inserting ${comp.name}:`, error);
        return res.status(500).json({ 
          success: false, 
          error: `Permission denied. Make sure you have INSERT privileges on the competencies table.` 
        });
      }
    }

    // 2. Get all competencies with their IDs
    console.log("🔍 Fetching competencies...");
    const { data: competencies, error: compError } = await userClient
      .from('competencies')
      .select('id, name');

    if (compError) {
      console.error("Error fetching competencies:", compError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch competencies: ' + compError.message 
      });
    }

    const compMap = {};
    competencies.forEach(c => {
      compMap[c.name] = c.id;
    });
    console.log(`✅ Found ${competencies.length} competencies`);

    // 3. Get all questions
    console.log("🔍 Fetching questions...");
    const { data: questions, error: questionsError } = await userClient
      .from('questions')
      .select('id, section, assessment_type_id')
      .limit(1000);

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch questions: ' + questionsError.message 
      });
    }
    
    console.log(`✅ Found ${questions.length} questions`);

    // 4. Map questions to competencies based on section names
    console.log("🔗 Creating question-competency mappings...");
    const mappings = [];
    let mappedCount = 0;
    
    questions.forEach(question => {
      const section = question.section?.toLowerCase() || '';
      let mapped = false;
      
      // Leadership mappings
      if (section.includes('strategic') || section.includes('vision') || section.includes('foresight')) {
        if (compMap['Strategic Thinking']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Strategic Thinking'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('emotional') || section.includes('empathy') || section.includes('self-awareness')) {
        if (compMap['Emotional Intelligence']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Emotional Intelligence'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('decision') || section.includes('judgment') || section.includes('choose')) {
        if (compMap['Decision Making']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Decision Making'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('communicat') || section.includes('present') || section.includes('speak')) {
        if (compMap['Communication']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Communication'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('people') || section.includes('manag') || section.includes('lead')) {
        if (compMap['People Management']) {
          mappings.push({ question_id: question.id, competency_id: compMap['People Management'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('adapt') || section.includes('flexib')) {
        if (compMap['Adaptability']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Adaptability'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('account') || section.includes('responsib') || section.includes('owner')) {
        if (compMap['Accountability']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Accountability'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('cognitive') || section.includes('analyt') || section.includes('reason')) {
        if (compMap['Cognitive Ability']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Cognitive Ability'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('problem') || section.includes('solve')) {
        if (compMap['Problem Solving']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Problem Solving'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('learn') || section.includes('agility')) {
        if (compMap['Learning Agility']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Learning Agility'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('technical') || section.includes('technolog') || section.includes('system')) {
        if (compMap['Technical Knowledge']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Technical Knowledge'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('cultural') || section.includes('fit') || section.includes('values')) {
        if (compMap['Cultural Fit']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Cultural Fit'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('integrit') || section.includes('ethic')) {
        if (compMap['Integrity']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Integrity'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('collab') || section.includes('team') || section.includes('cooperat')) {
        if (compMap['Collaboration']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Collaboration'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('resilien') || section.includes('stress') || section.includes('pressure')) {
        if (compMap['Resilience']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Resilience'], weight: 1.0 });
          mapped = true;
        }
      }
      if (section.includes('execution') || section.includes('result') || section.includes('deliver')) {
        if (compMap['Execution']) {
          mappings.push({ question_id: question.id, competency_id: compMap['Execution'], weight: 1.0 });
          mapped = true;
        }
      }
      
      if (mapped) mappedCount++;
    });

    console.log(`✅ Mapped ${mappedCount} questions to competencies`);

    // 5. Clear existing mappings to avoid duplicates
    console.log("🧹 Clearing existing question_competencies...");
    const { error: deleteError } = await userClient
      .from('question_competencies')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error("Error clearing mappings:", deleteError);
      // Continue anyway
    }

    // 6. Insert mappings in batches
    if (mappings.length > 0) {
      console.log(`💾 Inserting ${mappings.length} mappings...`);
      
      // Insert in batches of 50 to avoid payload size limits
      const batchSize = 50;
      for (let i = 0; i < mappings.length; i += batchSize) {
        const batch = mappings.slice(i, i + batchSize);
        const { error: insertError } = await userClient
          .from('question_competencies')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i}:`, insertError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to insert mappings: ' + insertError.message 
          });
        } else {
          console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} mappings)`);
        }
      }
    }

    // 7. Verify the setup
    console.log("🔍 Verifying setup...");
    const { count, error: countError } = await userClient
      .from('question_competencies')
      .select('*', { count: 'exact', head: true });

    res.status(200).json({
      success: true,
      message: "Competency setup completed successfully",
      stats: {
        competenciesAdded: defaultCompetencies.length,
        questionsProcessed: questions.length,
        questionsMapped: mappedCount,
        totalMappings: mappings.length,
        finalCount: count || 0
      }
    });

  } catch (error) {
    console.error('❌ Error setting up competencies:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
