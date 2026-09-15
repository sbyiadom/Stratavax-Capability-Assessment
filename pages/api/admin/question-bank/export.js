// pages/api/admin/question-bank/export.js
// Phase 3 — Question Bank Manager
// Exports a single assessment type's questions as XLSX.
// The exported file is also the round-trippable import template.

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ============================================================
// HELPER: fetch questions + answers for a type
// ============================================================
async function loadQuestions(serviceClient, assessmentTypeId) {
  const { data, error } = await serviceClient
    .from('unique_questions')
    .select(
      'id, display_order, question_text, section, subsection, unique_answers(id, answer_text, score, display_order)'
    )
    .eq('assessment_type_id', assessmentTypeId)
    .order('display_order', { ascending: true })
    .order('display_order', { referencedTable: 'unique_answers', ascending: true });

  if (error) throw error;

  return (data || []).map((q) => {
    const answers = Array.isArray(q.unique_answers)
      ? [...q.unique_answers].sort((a, b) => a.display_order - b.display_order)
      : [];
    while (answers.length < 4) {
      answers.push({ id: null, answer_text: '', score: 0, display_order: answers.length + 1 });
    }
    return {
      id: q.id,
      display_order: q.display_order,
      question_text: q.question_text,
      section: q.section || '',
      subsection: q.subsection || '',
      a1: answers[0],
      a2: answers[1],
      a3: answers[2],
      a4: answers[3]
    };
  });
}

// ============================================================
// HELPER: load assessment type header
// ============================================================
async function loadAssessmentType(serviceClient, assessmentTypeId) {
  const { data, error } = await serviceClient
    .from('assessment_types')
    .select('id, code, name, question_count, time_limit_minutes')
    .eq('id', assessmentTypeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================================
// HELPER: build the workbook
// ============================================================
function buildWorkbook(assessmentType, questions) {
  const header = [
    'question_id',       // read-only on export; ignored on import
    'display_order',     // optional on import; server assigns if blank
    'question_text',
    'section',
    'subsection',
    'answer_1_text',
    'answer_1_score',
    'answer_2_text',
    'answer_2_score',
    'answer_3_text',
    'answer_3_score',
    'answer_4_text',
    'answer_4_score'
  ];

  const rows = questions.map((q) => [
    q.id ?? '',
    q.display_order ?? '',
    q.question_text || '',
    q.section || '',
    q.subsection || '',
    q.a1.answer_text || '',
    q.a1.score ?? '',
    q.a2.answer_text || '',
    q.a2.score ?? '',
    q.a3.answer_text || '',
    q.a3.score ?? '',
    q.a4.answer_text || '',
    q.a4.score ?? ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  ws['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 60 }, { wch: 24 }, { wch: 24 },
    { wch: 40 }, { wch: 14 },
    { wch: 40 }, { wch: 14 },
    { wch: 40 }, { wch: 14 },
    { wch: 40 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');

  // Metadata sheet for humans
  const metaRows = [
    ['Assessment type', assessmentType.name],
    ['Code', assessmentType.code],
    ['ID', assessmentType.id],
    ['Declared pool size', assessmentType.question_count],
    ['Time limit (minutes)', assessmentType.time_limit_minutes],
    ['Exported at', new Date().toISOString()]
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaRows);
  metaWs['!cols'] = [{ wch: 24 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, metaWs, 'Info');

  return wb;
}

// ============================================================
// API HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // ---------- validate query param ----------
    const rawTypeId = req.query.assessment_type_id;
    if (rawTypeId === undefined || rawTypeId === null || rawTypeId === '') {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: assessment_type_id'
      });
    }

    const assessmentTypeId = Number(rawTypeId);
    if (!Number.isInteger(assessmentTypeId) || assessmentTypeId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment_type_id: must be a positive integer'
      });
    }

    // ---------- load data ----------
    const assessmentType = await loadAssessmentType(serviceClient, assessmentTypeId);
    if (!assessmentType) {
      return res.status(404).json({
        success: false,
        error: `Assessment type ${assessmentTypeId} not found`
      });
    }

    const questions = await loadQuestions(serviceClient, assessmentTypeId);

    // ---------- build workbook ----------
    const wb = buildWorkbook(assessmentType, questions);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // ---------- respond with file ----------
    const safeCode = (assessmentType.code || 'assessment').replace(/[^a-z0-9_-]/gi, '_');
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `question-bank-${safeCode}-${stamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[Question Bank Export] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
