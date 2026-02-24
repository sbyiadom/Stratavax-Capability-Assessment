import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("🚀 Starting competency setup with user token...");
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    
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

    console.log("📋 Inserting default competencies...");
    
    const defaultCompetencies = [
      { name: 'Strategic Thinking', description: 'Ability to think ahead and plan strategically', category: 'Leadership', display_order: 1 },
      { name: 'Emotional Intelligence', description: 'Ability to recognize and manage emotions', category: 'Leadership', display_order: 2 },
      { name: 'Decision Making', description: 'Ability to make sound decisions', category: 'Leadership', display_order: 3 },
      { name: 'Communication', description: 'Ability to convey information effectively', category: 'Leadership', display_order: 4 },
      { name: 'People Management', description: 'Ability to lead and develop others', category: 'Leadership', display_order: 5 },
      { name: 'Vision', description: 'Ability to create and communicate a compelling vision', category: 'Leadership', display_order: 6 },
      { name: 'Execution', description: 'Ability to deliver results', category: 'Leadership', display_order: 7 },
      { name: 'Resilience', description: 'Ability to recover from setbacks', category: 'Leadership', display_order: 8 },
      { name: 'Adaptability', description: 'Ability to adjust to new conditions', category: 'Behavioral', display_order: 9 },
      { name: 'Accountability', description: 'Taking ownership of actions', category: 'Behavioral', display_order: 10 },
      { name: 'Collaboration', description: 'Working effectively with others', category: 'Behavioral', display_order: 11 },
      { name: 'Integrity', description: 'Honesty and ethical behavior', category: 'Behavioral', display_order: 12 },
      { name: 'Cognitive Ability', description: 'Problem-solving and analytical thinking', category: 'Cognitive', display_order: 13 },
      { name: 'Problem Solving', description: 'Ability to analyze and solve complex problems', category: 'Cognitive', display_order: 14 },
      { name: 'Learning Agility', description: 'Ability to learn quickly and apply knowledge', category: 'Cognitive', display_order: 15 },
      { name: 'Technical Knowledge', description: 'Domain-specific expertise', category: 'Technical', display_order: 16 },
      { name: 'Cultural Fit', description: 'Alignment with organizational values', category: 'Cultural', display_order: 17 }
    ];

    // Insert one by one with error handling
    for (const comp of defaultCompetencies) {
      // Check if exists first
      const { data: existing } = await userClient
        .from('competencies')
        .select('id')
        .eq('name', comp.name)
        .maybeSingle();
      
      if (!existing) {
        const { error } = await userClient
          .from('competencies')
          .insert(comp);
        
        if (error) {
          console.error(`Error inserting ${comp.name}:`, error);
        } else {
          console.log(`✅ Inserted ${comp.name}`);
        }
      } else {
        console.log(`⏭️ ${comp.name} already exists`);
      }
    }

    // Get all competencies
    const { data: competencies, error: compError } = await userClient
      .from('competencies')
      .select('id, name');

    if (compError) {
      throw compError;
    }

    const compMap = {};
    competencies.forEach(c => {
      compMap[c.name] = c.id;
    });
    console.log(`✅ Found ${competencies.length} competencies`);

    // Get questions
    const { data: questions, error: questionsError } = await userClient
      .from('questions')
      .select('id, section')
      .limit(1000);

    if (questionsError) throw questionsError;
    console.log(`✅ Found ${questions.length} questions`);

    // Create mappings
    const mappings = [];
    let mappedCount = 0;
    
    questions.forEach(question => {
      const section = question.section?.toLowerCase() || '';
      
      if (section.includes('strategic') && compMap['Strategic Thinking']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Strategic Thinking'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('emotional') && compMap['Emotional Intelligence']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Emotional Intelligence'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('decision') && compMap['Decision Making']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Decision Making'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('communicat') && compMap['Communication']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Communication'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('people') && compMap['People Management']) {
        mappings.push({ question_id: question.id, competency_id: compMap['People Management'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('vision') && compMap['Vision']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Vision'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('execution') && compMap['Execution']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Execution'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('resilien') && compMap['Resilience']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Resilience'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('adapt') && compMap['Adaptability']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Adaptability'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('account') && compMap['Accountability']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Accountability'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('collab') && compMap['Collaboration']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Collaboration'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('integrit') && compMap['Integrity']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Integrity'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('cognitive') && compMap['Cognitive Ability']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Cognitive Ability'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('problem') && compMap['Problem Solving']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Problem Solving'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('learn') && compMap['Learning Agility']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Learning Agility'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('technical') && compMap['Technical Knowledge']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Technical Knowledge'], weight: 1.0 });
        mappedCount++;
      }
      if (section.includes('cultural') && compMap['Cultural Fit']) {
        mappings.push({ question_id: question.id, competency_id: compMap['Cultural Fit'], weight: 1.0 });
        mappedCount++;
      }
    });

    console.log(`✅ Mapped ${mappedCount} questions to competencies`);

    // Clear existing mappings
    console.log("🧹 Clearing existing question_competencies...");
    await userClient
      .from('question_competencies')
      .delete()
      .neq('id', 0);

    // Insert mappings in batches
    if (mappings.length > 0) {
      console.log(`💾 Inserting ${mappings.length} mappings...`);
      
      const batchSize = 50;
      for (let i = 0; i < mappings.length; i += batchSize) {
        const batch = mappings.slice(i, i + batchSize);
        const { error: insertError } = await userClient
          .from('question_competencies')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch:`, insertError);
          throw insertError;
        }
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    // Verify
    const { count } = await userClient
      .from('question_competencies')
      .select('*', { count: 'exact', head: true });

    res.status(200).json({
      success: true,
      message: "Competency setup completed",
      stats: {
        competencies: competencies.length,
        questionsProcessed: questions.length,
        questionsMapped: mappedCount,
        totalMappings: mappings.length,
        finalCount: count
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: error.code
    });
  }
}
