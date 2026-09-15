// pages/admin/question-bank/index.js
// Phase 3 — Question Bank Manager
// List + Edit + Delete + Export + Import (XLSX with client-side preview).

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import * as XLSX from 'xlsx';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

// ============================================================
// CLIENT-SIDE XLSX PREVIEW PARSER
// Same validation rules as the server, so preview matches what the server will accept.
// Returns { questions, errors: [{row, reason}], total }
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

function parseWorkbookBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.includes('Questions') ? 'Questions' : wb.SheetNames[0];
  if (!sheetName) {
    return { questions: [], errors: [{ row: 0, reason: 'Workbook has no sheets' }], total: 0 };
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: ''
  });
  if (rows.length === 0) {
    return { questions: [], errors: [{ row: 0, reason: 'Sheet is empty' }], total: 0 };
  }
  const headerRow = rows[0].map((h) => String(h || '').trim());
  const missing = EXPECTED_HEADERS.filter((h) => !headerRow.includes(h));
  if (missing.length > 0) {
    return {
      questions: [],
      errors: [{ row: 1, reason: 'Missing columns: ' + missing.join(', ') }],
      total: 0
    };
  }
  const idx = {};
  EXPECTED_HEADERS.forEach((h) => { idx[h] = headerRow.indexOf(h); });

  const questions = [];
  const errors = [];
  let total = 0;
  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const fileRow = i + 1;
    const nonEmpty = raw.some((c) => c !== '' && c !== null && c !== undefined);
    if (!nonEmpty) continue;
    total++;

    const qText = String(raw[idx['question_text']] || '').trim();
    const section = String(raw[idx['section']] || '').trim();
    const subsection = String(raw[idx['subsection']] || '').trim();
    const rowErrors = [];
    if (!qText) rowErrors.push('question_text is required');

    const answers = [];
    for (let n = 1; n <= 4; n++) {
      const aText = String(raw[idx[`answer_${n}_text`]] || '').trim();
      const aScoreRaw = raw[idx[`answer_${n}_score`]];
      if (!aText) { rowErrors.push(`answer_${n}_text is required`); continue; }
      if (aScoreRaw === '' || aScoreRaw === null || aScoreRaw === undefined) {
        rowErrors.push(`answer_${n}_score is required`);
        continue;
      }
      const aScore = Number(aScoreRaw);
      if (!Number.isInteger(aScore)) {
        rowErrors.push(`answer_${n}_score must be an integer`);
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
// IMPORT MODAL
// ============================================================
function ImportModal({ assessmentType, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { questions, errors, total }
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setError(null);
    try {
      const arrayBuffer = await f.arrayBuffer();
      const result = parseWorkbookBuffer(arrayBuffer);
      setPreview(result);
    } catch (err) {
      console.error('[Question Bank UI] parse error:', err);
      setError('Could not read that file. Make sure it is a valid .xlsx workbook.');
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file || !preview || preview.errors.length > 0) return;
    try {
      setImporting(true);
      setError(null);

      const formData = new FormData();
      formData.append('assessment_type_id', String(assessmentType.id));
      formData.append('file', file);

      const response = await fetch('/api/admin/question-bank/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const details = data.details?.errors
          ? data.details.errors.map((e) => `row ${e.row}: ${e.reason}`).join('\n')
          : '';
        throw new Error((data.error || 'Import failed') + (details ? '\n\n' + details : ''));
      }

      onImported(data);
    } catch (err) {
      console.error('[Question Bank UI] import error:', err);
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 'min(820px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Import questions into {assessmentType.name}</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <p style={{ marginTop: 0, color: '#475569', fontSize: '13px' }}>
            Expected columns match the Export template: <code>question_id, display_order,
            question_text, section, subsection, answer_1_text, answer_1_score, answer_2_text,
            answer_2_score, answer_3_text, answer_3_score, answer_4_text, answer_4_score</code>.
            Export the current type to get a template, fill it in, then upload here.
          </p>

          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFile}
            style={{ display: 'block', marginTop: '16px' }}
          />

          {preview && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: preview.errors.length === 0 ? '#dcfce7' : '#fef3c7',
                color: preview.errors.length === 0 ? '#166534' : '#92400e',
                fontSize: '13px',
                fontWeight: 600
              }}>
                Parsed {preview.total} rows · {preview.questions.length} valid · {preview.errors.length} with errors
              </div>

              {preview.errors.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#991b1b'
                }}>
                  {preview.errors.map((e, i) => (
                    <div key={i} style={{ marginBottom: '6px' }}>
                      <strong>Row {e.row}:</strong> {e.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={styles.modalError}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} disabled={importing} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={
              importing ||
              !preview ||
              preview.questions.length === 0 ||
              preview.errors.length > 0
            }
            style={{
              ...styles.saveButton,
              opacity:
                importing || !preview || preview.questions.length === 0 || preview.errors.length > 0
                  ? 0.5
                  : 1,
              cursor:
                importing || !preview || preview.questions.length === 0 || preview.errors.length > 0
                  ? 'not-allowed'
                  : 'pointer'
            }}
          >
            {importing ? 'Importing…' : preview && preview.errors.length === 0
              ? `Import ${preview.questions.length} question${preview.questions.length === 1 ? '' : 's'}`
              : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT MODAL  (unchanged from previous version)
// ============================================================
function EditModal({ question, onClose, onSaved }) {
  const [questionText, setQuestionText] = useState(question.question_text || '');
  const [section, setSection] = useState(question.section || '');
  const [subsection, setSubsection] = useState(question.subsection || '');
  const [answers, setAnswers] = useState(
    (question.answers || []).map((a) => ({
      id: a.id,
      answer_text: a.answer_text,
      score: a.score,
      display_order: a.display_order
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateAnswer = (idx, field, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        question_id: question.id,
        question_text: questionText.trim(),
        section: section.trim() || null,
        subsection: subsection.trim() || null,
        answers: answers.map((a) => ({
          id: a.id,
          answer_text: a.answer_text.trim(),
          score: Number(a.score),
          display_order: Number(a.display_order)
        }))
      };
      const response = await fetch('/api/admin/question-bank/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (err) {
      console.error('[Question Bank UI] save error:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Edit Question #{question.display_order}</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <label style={styles.fieldLabel}>Question text</label>
          <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3} style={styles.textarea} />

          <div style={styles.twoCol}>
            <div>
              <label style={styles.fieldLabel}>Section</label>
              <input type="text" value={section} onChange={(e) => setSection(e.target.value)} style={styles.input} />
            </div>
            <div>
              <label style={styles.fieldLabel}>Subsection</label>
              <input type="text" value={subsection} onChange={(e) => setSubsection(e.target.value)} style={styles.input} />
            </div>
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '16px' }}>Answers</label>
          {answers.map((a, idx) => (
            <div key={a.id} style={styles.answerRow}>
              <input type="number" value={a.score} onChange={(e) => updateAnswer(idx, 'score', e.target.value)} style={styles.scoreInput} />
              <input type="text" value={a.answer_text} onChange={(e) => updateAnswer(idx, 'answer_text', e.target.value)} style={styles.answerInput} />
            </div>
          ))}

          {error && <div style={styles.modalError}><strong>Error:</strong> {error}</div>}
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} disabled={saving} style={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={styles.saveButton}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function QuestionBankList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState(null);

  const [assessmentTypeId, setAssessmentTypeId] = useState(1);
  const [section, setSection] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [assessmentType, setAssessmentType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importToast, setImportToast] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function loadTypes() {
      try {
        setTypesLoading(true);
        setTypesError(null);
        const response = await fetch('/api/admin/question-bank/types');
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load assessment types');
        if (cancelled) return;
        const list = data.types || [];
        setTypes(list);
        setTypesLoading(false);
        const queryType = Number(router.query.type);
        const initialType =
          Number.isInteger(queryType) && list.some((t) => t.id === queryType)
            ? queryType
            : list[0]?.id ?? 1;
        setAssessmentTypeId(initialType);
      } catch (err) {
        console.error('[Question Bank UI] loadTypes error:', err);
        if (cancelled) return;
        setTypesError(err.message || 'Failed to load assessment types');
        setTypesLoading(false);
      }
    }
    loadTypes();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const refetchQuestions = async () => {
    try {
      const params = new URLSearchParams();
      params.set('assessment_type_id', String(assessmentTypeId));
      if (section) params.set('section', section);
      if (search) params.set('search', search);
      const response = await fetch(`/api/admin/question-bank/list?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load questions');
      setAssessmentType(data.assessment_type || null);
      setQuestions(data.questions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[Question Bank UI] refetch error:', err);
      setError(err.message || 'Failed to load questions');
    }
  };

  useEffect(() => {
    if (!session || !assessmentTypeId) return;
    let cancelled = false;
    async function loadQuestions() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set('assessment_type_id', String(assessmentTypeId));
        if (section) params.set('section', section);
        if (search) params.set('search', search);
        const response = await fetch(`/api/admin/question-bank/list?${params.toString()}`);
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load questions');
        if (cancelled) return;
        setAssessmentType(data.assessment_type || null);
        setQuestions(data.questions || []);
        setTotal(data.total || 0);
        setLoading(false);
      } catch (err) {
        console.error('[Question Bank UI] loadQuestions error:', err);
        if (cancelled) return;
        setError(err.message || 'Failed to load questions');
        setLoading(false);
      }
    }
    loadQuestions();
    return () => { cancelled = true; };
  }, [session, assessmentTypeId, section, search]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const handleTypeChange = (newId) => {
    setAssessmentTypeId(newId);
    setSection('');
    setSearchInput('');
    setSearch('');
    router.replace({ pathname: '/admin/question-bank', query: { type: newId } }, undefined, { shallow: true });
  };

  const handleBack = () => router.push('/admin');
  const handleClearFilters = () => { setSection(''); setSearchInput(''); setSearch(''); };
  const handleEditSaved = async () => { setEditingQuestion(null); await refetchQuestions(); };

  const handleDelete = async (q) => {
    const ok = window.confirm(
      `Delete question #${q.display_order}?\n\n"${q.question_text.slice(0, 120)}${q.question_text.length > 120 ? '…' : ''}"\n\nThis will also delete its 4 answers. This cannot be undone.`
    );
    if (!ok) return;
    try {
      setDeletingId(q.id);
      const response = await fetch('/api/admin/question-bank/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      await refetchQuestions();
    } catch (err) {
      console.error('[Question Bank UI] delete error:', err);
      window.alert('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const url = `/api/admin/question-bank/export?assessment_type_id=${assessmentTypeId}`;
      const response = await fetch(url);
      if (!response.ok) {
        let message = 'Export failed';
        try { const data = await response.json(); message = data.error || message; } catch (e) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeCode = (assessmentType?.code || 'assessment').replace(/[^a-z0-9_-]/gi, '_');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = objectUrl;
      a.download = `question-bank-${safeCode}-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('[Question Bank UI] export error:', err);
      window.alert('Failed to export: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleImportCompleted = async (data) => {
    setShowImport(false);
    setImportToast(
      `Imported ${data.questions_inserted} question${data.questions_inserted === 1 ? '' : 's'} (${data.answers_inserted} answers), display_order ${data.first_display_order}–${data.last_display_order}.`
    );
    // auto-dismiss
    setTimeout(() => setImportToast(null), 8000);
    await refetchQuestions();
  };

  const sectionOptions = (() => {
    const seen = new Map();
    questions.forEach((q) => { if (q.section && !seen.has(q.section)) seen.set(q.section, true); });
    return Array.from(seen.keys()).sort((a, b) => a.localeCompare(b));
  })();

  const hasActiveFilters = !!(section || search);

  if (authLoading || typesLoading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading question bank...</p>
        </div>
      </AppLayout>
    );
  }

  if (typesError) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.container}>
          <button onClick={handleBack} style={styles.backButton}>← Back to Admin Dashboard</button>
          <div style={styles.errorBox}><strong>Error:</strong> {typesError}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>← Back to Admin Dashboard</button>

        <div style={styles.header}>
          <div style={styles.headerText}>
            <h1 style={styles.title}>Question Bank</h1>
            <p style={styles.subtitle}>Browse the question pool for each assessment type.</p>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => setShowImport(true)}
              disabled={loading}
              style={{
                ...styles.importButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              📤 Import from Excel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading}
              style={{
                ...styles.exportButton,
                opacity: exporting || loading ? 0.6 : 1,
                cursor: exporting || loading ? 'not-allowed' : 'pointer'
              }}
            >
              {exporting ? '⏳ Exporting…' : '⬇ Export to Excel'}
            </button>
          </div>
        </div>

        {importToast && (
          <div style={styles.successToast}>
            <strong>✓ {importToast}</strong>
          </div>
        )}

        <div style={styles.selectorRow}>
          <label style={styles.selectorLabel}>Assessment type</label>
          <select
            value={assessmentTypeId}
            onChange={(e) => handleTypeChange(Number(e.target.value))}
            style={styles.select}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.question_count}q · {t.time_limit_minutes}m)
              </option>
            ))}
          </select>
        </div>

        {assessmentType && (
          <div style={styles.metaCard}>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Code</span>
              <span style={styles.metaValue}>{assessmentType.code}</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Declared pool size</span>
              <span style={styles.metaValue}>{assessmentType.question_count} questions</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Time limit</span>
              <span style={styles.metaValue}>{assessmentType.time_limit_minutes} minutes</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Loaded from pool</span>
              <span style={styles.metaValue}>
                {total} questions
                {assessmentType.question_count !== total ? (
                  <span style={styles.metaWarning}> — out of sync</span>
                ) : null}
              </span>
            </div>
          </div>
        )}

        <div style={styles.filtersRow}>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search question text..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={styles.searchInput}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} style={styles.clearIconButton} aria-label="Clear search">✕</button>
            )}
          </div>
          <select value={section} onChange={(e) => setSection(e.target.value)} style={styles.sectionSelect}>
            <option value="">All sections</option>
            {sectionOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={styles.clearFiltersButton}>Clear filters</button>
          )}
        </div>

        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.tableLoading}>
              <div style={styles.loadingSpinner}></div>
              <p>Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div style={styles.emptyState}>
              {hasActiveFilters
                ? 'No questions match the current filters.'
                : 'This assessment has 0 questions in its pool. Import to add content.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '56px' }}>#</th>
                  <th style={styles.th}>Question</th>
                  <th style={{ ...styles.th, width: '15%' }}>Section</th>
                  <th style={{ ...styles.th, width: '12%' }}>Subsection</th>
                  <th style={{ ...styles.th, width: '24%' }}>Answers</th>
                  <th style={{ ...styles.th, width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} style={styles.tr}>
                    <td style={styles.tdOrder}>{q.display_order}</td>
                    <td style={styles.td}>{q.question_text}</td>
                    <td style={styles.td}>{q.section || <span style={styles.muted}>—</span>}</td>
                    <td style={styles.td}>{q.subsection || <span style={styles.muted}>—</span>}</td>
                    <td style={styles.td}>
                      <div style={styles.answersList}>
                        {(q.answers || []).map((a) => (
                          <div key={a.id} style={styles.answerRowDisplay}>
                            <span style={styles.answerScore}>{a.score}</span>
                            <span style={styles.answerText}>{a.answer_text}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button onClick={() => setEditingQuestion(q)} style={styles.editButton}>Edit</button>
                        <button
                          onClick={() => handleDelete(q)}
                          disabled={deletingId === q.id}
                          style={{
                            ...styles.deleteButton,
                            opacity: deletingId === q.id ? 0.6 : 1,
                            cursor: deletingId === q.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {deletingId === q.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && questions.length > 0 && (
          <div style={styles.footerCount}>
            Showing {questions.length} of {total} question{total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {editingQuestion && (
        <EditModal question={editingQuestion} onClose={() => setEditingQuestion(null)} onSaved={handleEditSaved} />
      )}

      {showImport && assessmentType && (
        <ImportModal
          assessmentType={assessmentType}
          onClose={() => setShowImport(false)}
          onImported={handleImportCompleted}
        />
      )}
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' },
  loadingSpinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #1a237e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '20px' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  headerText: { flex: '1 1 auto' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  importButton: { padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' },
  exportButton: { padding: '10px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' },
  successToast: { padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' },
  selectorRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  selectorLabel: { fontSize: '14px', fontWeight: '600', color: '#475569' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white', fontFamily: 'inherit', minWidth: '360px', cursor: 'pointer' },
  metaCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
  metaRow: { display: 'flex', flexDirection: 'column', gap: '2px' },
  metaKey: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' },
  metaValue: { fontSize: '14px', color: '#0a1929', fontWeight: '500' },
  metaWarning: { color: '#b45309', fontWeight: '600' },
  filtersRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', flex: '1 1 320px', maxWidth: '480px' },
  searchInput: { width: '100%', padding: '10px 40px 10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' },
  clearIconButton: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' },
  sectionSelect: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white', fontFamily: 'inherit', minWidth: '220px', cursor: 'pointer' },
  clearFiltersButton: { padding: '10px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  errorBox: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b' },
  tableContainer: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' },
  tableLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '12px', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '14px 16px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.15s' },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1a202c', verticalAlign: 'top' },
  tdOrder: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', verticalAlign: 'top' },
  muted: { color: '#cbd5e1' },
  answersList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  answerRowDisplay: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', lineHeight: '1.35' },
  answerScore: { display: 'inline-block', minWidth: '20px', padding: '1px 6px', background: '#eef2ff', color: '#3730a3', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textAlign: 'center', flexShrink: 0 },
  answerText: { color: '#334155' },
  actionCell: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  editButton: { padding: '6px 12px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  deleteButton: { padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px' },
  footerCount: { marginTop: '12px', fontSize: '13px', color: '#64748b' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 39, 71, 0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', zIndex: 2000, overflowY: 'auto' },
  modal: { background: 'white', borderRadius: '12px', width: 'min(720px, 92vw)', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a237e' },
  modalClose: { background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' },
  modalBody: { padding: '16px 20px', overflowY: 'auto' },
  fieldLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  answerRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  scoreInput: { width: '64px', padding: '10px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', textAlign: 'center', boxSizing: 'border-box' },
  answerInput: { flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  modalError: { marginTop: '12px', padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', whiteSpace: 'pre-wrap' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' },
  cancelButton: { padding: '10px 18px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  saveButton: { padding: '10px 20px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }
};

if (typeof document !== 'undefined' && !document.getElementById('qb-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'qb-spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
