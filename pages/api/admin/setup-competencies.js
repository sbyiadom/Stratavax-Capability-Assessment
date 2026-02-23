import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { assessmentType } = req.body;

    // 1. Insert default competencies if they don't exist
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

    for (const comp of defaultCompetencies) {
      await serviceClient
        .from('competencies')
        .upsert(comp, { onConflict: 'name' });
    }

    // 2. Get all questions
    const { data: questions, error: questionsError } = await serviceClient
      .from('questions')
      .select('id, section, assessment_type_id')
      .limit(1000);

    if (questionsError) throw questionsError;

    // 3. Get competencies with their IDs
    const { data: competencies, error: compError } = await serviceClient
      .from('competencies')
      .select('id, name');

    if (compError) throw compError;

    const compMap = {};
    competencies.forEach(c => {
      compMap[c.name] = c.id;
    });

    // 4. Map questions to competencies based on section
    const mappings = [];
    
    questions.forEach(question => {
      const section = question.section?.toLowerCase() || '';
      
      // Map based on section name
      if (section.includes('strategic') || section.includes('vision')) {
        if (compMap['Strategic Thinking']) mappings.push({ question_id: question.id, competency_id: compMap['Strategic Thinking'], weight: 1.0 });
      }
      if (section.includes('emotional') || section.includes('empathy')) {
        if (compMap['Emotional Intelligence']) mappings.push({ question_id: question.id, competency_id: compMap['Emotional Intelligence'], weight: 1.0 });
      }
      if (section.includes('decision')) {
        if (compMap['Decision Making']) mappings.push({ question_id: question.id, competency_id: compMap['Decision Making'], weight: 1.0 });
      }
      if (section.includes('communicat')) {
        if (compMap['Communication']) mappings.push({ question_id: question.id, competency_id: compMap['Communication'], weight: 1.0 });
      }
      if (section.includes('people') || section.includes('manag')) {
        if (compMap['People Management']) mappings.push({ question_id: question.id, competency_id: compMap['People Management'], weight: 1.0 });
      }
      if (section.includes('adapt')) {
        if (compMap['Adaptability']) mappings.push({ question_id: question.id, competency_id: compMap['Adaptability'], weight: 1.0 });
      }
      if (section.includes('account')) {
        if (compMap['Accountability']) mappings.push({ question_id: question.id, competency_id: compMap['Accountability'], weight: 1.0 });
      }
      if (section.includes('cognitive') || section.includes('analyt')) {
        if (compMap['Cognitive Ability']) mappings.push({ question_id: question.id, competency_id: compMap['Cognitive Ability'], weight: 1.0 });
      }
      if (section.includes('technical')) {
        if (compMap['Technical Knowledge']) mappings.push({ question_id: question.id, competency_id: compMap['Technical Knowledge'], weight: 1.0 });
      }
      if (section.includes('cultural') || section.includes('fit')) {
        if (compMap['Cultural Fit']) mappings.push({ question_id: question.id, competency_id: compMap['Cultural Fit'], weight: 1.0 });
      }
      if (section.includes('integrity') || section.includes('ethic')) {
        if (compMap['Integrity']) mappings.push({ question_id: question.id, competency_id: compMap['Integrity'], weight: 1.0 });
      }
      if (section.includes('collab') || section.includes('team')) {
        if (compMap['Collaboration']) mappings.push({ question_id: question.id, competency_id: compMap['Collaboration'], weight: 1.0 });
      }
      if (section.includes('resilience')) {
        if (compMap['Resilience']) mappings.push({ question_id: question.id, competency_id: compMap['Resilience'], weight: 1.0 });
      }
      if (section.includes('execution') || section.includes('result')) {
        if (compMap['Execution']) mappings.push({ question_id: question.id, competency_id: compMap['Execution'], weight: 1.0 });
      }
    });

    // 5. Insert mappings
    if (mappings.length > 0) {
      const { error: insertError } = await serviceClient
        .from('question_competencies')
        .upsert(mappings, { onConflict: 'question_id, competency_id' });

      if (insertError) throw insertError;
    }

    res.status(200).json({
      success: true,
      competenciesAdded: defaultCompetencies.length,
      questionsProcessed: questions.length,
      mappingsCreated: mappings.length
    });

  } catch (error) {
    console.error('Error setting up competencies:', error);
    res.status(500).json({ error: error.message });
  }
}
