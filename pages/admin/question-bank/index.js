// pages/admin/question-bank/index.js
// Phase 3 — Question Bank Manager (read-only list view)
// Lists questions for a single assessment type, with search + section filter.
// No writes yet — create/edit/delete/import/export come file-by-file.

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

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

  const debounceRef = useRef(null);

  // ============================================================
  // STEP 1: Load assessment types on mount
  // ============================================================
  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadTypes() {
      try {
        setTypesLoading(true);
        setTypesError(null);

        const response = await fetch('/api/admin/question-bank/types');
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load assessment types');
        }

        if (cancelled) return;

        const list = data.types || [];
        setTypes(list);
        setTypesLoading(false);

        // Honor ?type= from the URL if present and valid; otherwise default to first type
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

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ============================================================
  // STEP 2: Load questions when type / section / search change
  // ============================================================
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

        const response = await fetch(
          `/api/admin/question-bank/list?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load questions');
        }

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

    return () => {
      cancelled = true;
    };
  }, [session, assessmentTypeId, section, search]);

  // ============================================================
  // STEP 3: Debounce search input → search state
  // ============================================================
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ============================================================
  // STEP 4: Keep ?type= in URL when user changes the dropdown
  // ============================================================
  const handleTypeChange = (newId) => {
    setAssessmentTypeId(newId);
    setSection('');
    setSearchInput('');
    setSearch('');

    router.replace(
      { pathname: '/admin/question-bank', query: { type: newId } },
      undefined,
      { shallow: true }
    );
  };

  const handleBack = () => router.push('/admin');

  const handleClearFilters = () => {
    setSection('');
    setSearchInput('');
    setSearch('');
  };

  // ============================================================
  // STEP 5: Derived — distinct sections from current results
  // ============================================================
  const sectionOptions = (() => {
    const seen = new Map();
    questions.forEach((q) => {
      if (q.section && !seen.has(q.section)) seen.set(q.section, true);
    });
    return Array.from(seen.keys()).sort((a, b) => a.localeCompare(b));
  })();

  const hasActiveFilters = !!(section || search);

  // ============================================================
  // RENDER: loading shell (auth or initial types load)
  // ============================================================
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
          <button onClick={handleBack} style={styles.backButton}>
            ← Back to Admin Dashboard
          </button>
          <div style={styles.errorBox}>
            <strong>Error:</strong> {typesError}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ============================================================
  // RENDER: main view
  // ============================================================
  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Admin Dashboard
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>Question Bank</h1>
          <p style={styles.subtitle}>
            Browse the question pool for each assessment type.
          </p>
        </div>

        {/* ============ Type selector + meta ============ */}
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

        {/* ============ Meta card for the selected type ============ */}
        {assessmentType && (
          <div style={styles.metaCard}>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Code</span>
              <span style={styles.metaValue}>{assessmentType.code}</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Declared pool size</span>
              <span style={styles.metaValue}>
                {assessmentType.question_count} questions
              </span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Time limit</span>
              <span style={styles.metaValue}>
                {assessmentType.time_limit_minutes} minutes
              </span>
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

        {/* ============ Search + section filter ============ */}
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
              <button
                onClick={() => setSearchInput('')}
                style={styles.clearIconButton}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            style={styles.sectionSelect}
          >
            <option value="">All sections</option>
            {sectionOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={styles.clearFiltersButton}>
              Clear filters
            </button>
          )}
        </div>

        {/* ============ Error ============ */}
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
            <button
              onClick={() => {
                // Force refetch by resetting section (no-op) and toggling search
                setSearch((s) => s);
              }}
              style={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {/* ============ Table ============ */}
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
                  <th style={{ ...styles.th, width: '18%' }}>Section</th>
                  <th style={{ ...styles.th, width: '14%' }}>Subsection</th>
                  <th style={{ ...styles.th, width: '28%' }}>Answers</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} style={styles.tr}>
                    <td style={styles.tdOrder}>{q.display_order}</td>
                    <td style={styles.td}>{q.question_text}</td>
                    <td style={styles.td}>
                      {q.section || <span style={styles.muted}>—</span>}
                    </td>
                    <td style={styles.td}>
                      {q.subsection || <span style={styles.muted}>—</span>}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.answersList}>
                        {(q.answers || []).map((a) => (
                          <div key={a.id} style={styles.answerRow}>
                            <span style={styles.answerScore}>{a.score}</span>
                            <span style={styles.answerText}>{a.answer_text}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ============ Footer count ============ */}
        {!loading && questions.length > 0 && (
          <div style={styles.footerCount}>
            Showing {questions.length} of {total} question
            {total === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '20px'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  selectorLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    background: 'white',
    fontFamily: 'inherit',
    minWidth: '360px',
    cursor: 'pointer'
  },
  metaCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  metaKey: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: '600'
  },
  metaValue: {
    fontSize: '14px',
    color: '#0a1929',
    fontWeight: '500'
  },
  metaWarning: {
    color: '#b45309',
    fontWeight: '600'
  },
  filtersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 320px',
    maxWidth: '480px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 40px 10px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  clearIconButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px'
  },
  sectionSelect: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    background: 'white',
    fontFamily: 'inherit',
    minWidth: '220px',
    cursor: 'pointer'
  },
  clearFiltersButton: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#991b1b'
  },
  retryButton: {
    padding: '4px 12px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  tableLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    gap: '12px',
    color: '#64748b'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  tr: {
    transition: 'background 0.15s'
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#1a202c',
    verticalAlign: 'top'
  },
  tdOrder: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '600',
    verticalAlign: 'top'
  },
  muted: {
    color: '#cbd5e1'
  },
  answersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  answerRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    fontSize: '13px',
    lineHeight: '1.35'
  },
  answerScore: {
    display: 'inline-block',
    minWidth: '20px',
    padding: '1px 6px',
    background: '#eef2ff',
    color: '#3730a3',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 0
  },
  answerText: {
    color: '#334155'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
    fontSize: '15px'
  },
  footerCount: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#64748b'
  }
};

// ============================================================
// KEYFRAMES (injected once)
// ============================================================
if (typeof document !== 'undefined' && !document.getElementById('qb-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'qb-spin-keyframes';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
