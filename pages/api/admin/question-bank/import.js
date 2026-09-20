// pages/api/admin/question-bank/import.js
// Phase 3 — Question Bank Manager
// Accepts an XLSX file (or raw JSON for programmatic use) and bulk-imports
// questions + 4 answers each via the import_questions_bulk RPC.
// Phase 7A: admin-gated.

import { authorizeRequest } from '../../../../utils/apiAuth';
import formidable from 'formidable';
import * as XLSX from 'xlsx';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false
  }
};

// ============================================================
// EXPECTED HEADERS (matches export.js)
// ============================================================
const EXPECTED_HEADERS = [
  'question_id',
  'display_order',
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

// ============================================================
// Robust header normalization
// ============================================================
function normalizeHeader(v) {
  let s;
  if (v == null) {
    s = '';
  } else if (typeof v === 'string') {
    s = v;
  } else if (typeof v === 'object') {
    s = v.w != null ? String(v.w) : v.v != null ? String(v.v) : '';
  } else {
    s = String(v);
  }
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function readCellValue(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.w != null) return String(v.w);
    if (v.v != null) return String(v.v);
    return '';
  }
  return v;
}

// ============================================================
// parseWorkbook — returns { questions, errors, total }
// ============================================================
function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames.includes('Questions') ? 'Questions' : wb.SheetNames[0];

  if (!sheetName) {
    throw Object.assign(new Error('Workbook has no sheets'), {
      details: { valid: 0, total: 0, errors: [{ row: 0, reason: 'No sheets in workbook' }] }
    });
  }

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: ''
  });

  if (rows.length === 0) {
    throw Object.assign(new Error('Sheet is empty'), {
      details: { valid: 0, total: 0, errors: [{ row: 0, reason: 'No rows' }] }
    });
  }

  const rawHeader = rows[0] || [];
  const headerMap = {};
  const foundHeaders = [];
  rawHeader.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key && headerMap[key] === undefined) headerMap[key] = i;
    if (key) foundHeaders.push(key);
  });

  const missing = EXPECTED_HEADERS.filter(
    (h) => headerMap[normalizeHeader(h)] === undefined
  );

  if (missing.length > 0) {
    console.log('[Question Bank Import] raw header row:', rawHeader);
    console.log('[Question Bank Import] normalized found:', foundHeaders);
    console.log('[Question Bank Import] missing:', missing);
    throw Object.assign(
      new Error(`Missing columns: ${missing.join(', ')}. Found: ${foundHeaders.join(', ')}`),
      {
        details: {
          valid: 0,
          total: 0,
          errors: [{
            row: 1,
            reason: `Missing columns: ${missing.join(', ')}. Found: ${foundHeaders.join(', ')}`
          }]
        }
      }
    );
  }

  const cell = (row, header) => {
    const idx = headerMap[normalizeHeader(header)];
    if (idx === undefined) return '';
    return readCellValue(row[idx]);
  };

  const questions = [];
  const errors = [];
  let total = 0;

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const fileRow = i + 1;

    const nonEmpty = raw.some((c) => {
      if (c == null) return false;
      if (typeof c === 'object') return c.v != null || c.w != null;
      return c !== '';
    });
    if (!nonEmpty) continue;
    total++;

    const qText = String(cell(raw, 'question_text')).trim();
    const section = String(cell(raw, 'section')).trim();
    const subsection = String(cell(raw, 'subsection')).trim();

    const rowErrors = [];
    if (!qText) rowErrors.push('question_text is required');

    const answers = [];
    for (let n = 1; n <= 4; n++) {
      const aText = String(cell(raw, `answer_${n}_text`)).trim();
      const aScoreRaw = cell(raw, `answer_${n}_score`);

      if (!aText) { rowErrors.push(`answer_${n}_text is required`); continue; }
      if (aScoreRaw === '' || aScoreRaw === null || aScoreRaw === undefined) {
        rowErrors.push(`answer_${n}_score is required`);
        continue;
      }
      const aScore = Number(aScoreRaw);
      if (!Number.isInteger(aScore)) {
        rowErrors.push(`answer_${n}_score must be an integer (got "${aScoreRaw}")`);
        continue;
      }
      answers.push({ answer_text: aText, score: aScore, display_order: n });
    }

    if (answers.length !== 4) {
      rowErrors.push(`must have exactly 4 valid answers (got ${answers.length})`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: fileRow, reason: rowErrors.join('; ') });
      continue;
    }

    questions.push({
      question_text: qText,
      section: section || null,
      subsection: subsection || null,
      answers
    });
  }

  return { questions, errors, total };
}

// ============================================================
// HELPERS: multipart + raw JSON body
// ============================================================
function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      multiples: false
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const fileEntry = files.file || files.upload || files.questions;
      const single = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
      const rawField = (k) => {
        const v = fields[k];
        return Array.isArray(v) ? v[0] : v;
      };
      resolve({
        assessment_type_id: rawField('assessment_type_id'),
        file: single
      });
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// ============================================================
// API HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // ============================================================
    // AUTH — admin only. Runs before body parsing.
    // ============================================================
    const auth = await authorizeRequest(req, ['admin']);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { serviceClient } = auth;

    const contentType = String(req.headers['content-type'] || '');
    let assessmentTypeId;
    let questions = [];

    if (contentType.startsWith('multipart/form-data')) {
      const { assessment_type_id, file } = await readMultipart(req);

      if (!assessment_type_id) {
        return res.status(400).json({ success: false, error: 'Missing assessment_type_id' });
      }
      assessmentTypeId = Number(assessment_type_id);
      if (!Number.isInteger(assessmentTypeId) || assessmentTypeId <= 0) {
        return res.status(400).json({ success: false, error: 'assessment_type_id must be a positive integer' });
      }
      if (!file) {
        return res.status(400).json({ success: false, error: 'Missing file' });
      }

      const buffer = fs.readFileSync(file.filepath);

      let parsed;
      try {
        parsed = parseWorkbook(buffer);
      } catch (parseErr) {
        console.error('[Question Bank Import] parse error:', parseErr);
        return res.status(400).json({
          success: false,
          error: parseErr.message || 'Failed to parse workbook',
          details: parseErr.details || null
        });
      }

      if (parsed.errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `${parsed.errors.length} row(s) failed validation`,
          details: {
            valid: parsed.questions.length,
            total: parsed.total,
            errors: parsed.errors
          }
        });
      }

      if (parsed.questions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid rows to import'
        });
      }

      questions = parsed.questions;

    } else if (contentType.startsWith('application/json')) {
      const body = await readJsonBody(req);
      const { assessment_type_id, questions: qs } = body;

      if (!assessment_type_id) {
        return res.status(400).json({ success: false, error: 'Missing assessment_type_id' });
      }
      assessmentTypeId = Number(assessment_type_id);
      if (!Number.isInteger(assessmentTypeId) || assessmentTypeId <= 0) {
        return res.status(400).json({ success: false, error: 'assessment_type_id must be a positive integer' });
      }
      if (!Array.isArray(qs) || qs.length === 0) {
        return res.status(400).json({ success: false, error: 'questions must be a non-empty array' });
      }

      questions = qs;

    } else {
      return res.status(415).json({
        success: false,
        error: 'Unsupported content type. Use multipart/form-data (XLSX) or application/json.'
      });
    }

    const { data, error } = await serviceClient.rpc('import_questions_bulk', {
      p_assessment_type_id: assessmentTypeId,
      p_questions: questions
    });

    if (error) {
      console.error('[Question Bank Import] rpc error:', error);
      const code = error.code;
      if (code === 'P0002') {
        return res.status(404).json({
          success: false,
          error: `Assessment type ${assessmentTypeId} not found`
        });
      }
      if (code === '22023') {
        return res.status(400).json({
          success: false,
          error: error.message || 'Validation failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: `Import failed: ${error.message}`
      });
    }

    return res.status(200).json({
      success: true,
      questions_inserted: data?.questions_inserted ?? 0,
      answers_inserted: data?.answers_inserted ?? 0,
      first_display_order: data?.first_display_order ?? null,
      last_display_order: data?.last_display_order ?? null,
      question_ids: data?.question_ids ?? []
    });

  } catch (error) {
    console.error('[Question Bank Import] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
