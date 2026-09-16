// pages/admin/assessments/index.js
// Phase 3 — Assessment Builder
// List + create modal + edit modal + activate/deactivate toggle.
// No delete in v1 — destructive ops are deferred to Phase 7.

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

// ============================================================
// HELPERS
// ============================================================
function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

// datetime-local value → ISO string  (or null if empty)
function localToIso(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ISO string → datetime-local value
function isoToLocal(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

// ============================================================
// CREATE MODAL
// ============================================================
function CreateModal({ types, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [assessmentTypeId, setAssessmentTypeId] = useState(types[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresLocal, setExpiresLocal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        assessment_type_id: Number(assessmentTypeId),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        is_active: isActive,
        expires_at: localToIso(expiresLocal)
      };

      const response = await fetch('/api/admin/assessments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to create');
      onCreated(data);
    } catch (err) {
      console.error('[Assessment Builder UI] create error:', err);
      setError(err.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>New Assessment</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <label style={styles.fieldLabel}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
            maxLength={200}
            autoFocus
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Assessment type</label>
          <select
            value={assessmentTypeId}
            onChange={(e) => setAssessmentTypeId(e.target.value)}
            style={styles.select}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.question_count}q · {t.time_limit_minutes}m)
              </option>
            ))}
          </select>
          <div style={styles.helperText}>
            Type is locked after creation. To use a different type, create a new assessment.
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={styles.textarea}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Instructions (optional)</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            style={styles.textarea}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Expires at (optional)</label>
          <div style={styles.inlineRow}>
            <input
              type="datetime-local"
              value={expiresLocal}
              onChange={(e) => setExpiresLocal(e.target.value)}
              style={styles.input}
            />
            {expiresLocal && (
              <button
                type="button"
                onClick={() => setExpiresLocal('')}
                style={styles.clearInlineButton}
              >
                Clear
              </button>
            )}
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>Active</span>
          </label>

          {error && (
            <div style={styles.modalError}><strong>Error:</strong> {error}</div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} disabled={saving} style={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
            {saving ? 'Creating…' : 'Create assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================
function EditModal({ assessment, onClose, onSaved }) {
  const [title, setTitle] = useState(assessment.title || '');
  const [description, setDescription] = useState(assessment.description || '');
  const [instructions, setInstructions] = useState(assessment.instructions || '');
  const [isActive, setIsActive] = useState(assessment.is_active !== false);
  const [expiresLocal, setExpiresLocal] = useState(isoToLocal(assessment.expires_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        assessment_id: assessment.id,
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        is_active: isActive,
        expires_at: localToIso(expiresLocal)
      };

      const response = await fetch('/api/admin/assessments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (err) {
      console.error('[Assessment Builder UI] save error:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Edit Assessment</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <label style={styles.fieldLabel}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
            maxLength={200}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Assessment type</label>
          <div style={styles.readonlyField}>
            {assessment.assessment_type
              ? `${assessment.assessment_type.name} (${assessment.assessment_type.code})`
              : 'Unknown'}
            <span style={styles.readonlyNote}> · locked after creation</span>
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={styles.textarea}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Instructions (optional)</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            style={styles.textarea}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Expires at (optional)</label>
          <div style={styles.inlineRow}>
            <input
              type="datetime-local"
              value={expiresLocal}
              onChange={(e) => setExpiresLocal(e.target.value)}
              style={styles.input}
            />
            {expiresLocal && (
              <button
                type="button"
                onClick={() => setExpiresLocal('')}
                style={styles.clearInlineButton}
              >
                Clear
              </button>
            )}
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>Active</span>
          </label>

          {error && (
            <div style={styles.modalError}><strong>Error:</strong> {error}</div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} disabled={saving} style={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function AssessmentBuilderList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState(null);

  const [assessments, setAssessments] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);

  const debounceRef = useRef(null);

  // ---------- Load types on mount (reuses question-bank types endpoint) ----------
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
        setTypes(data.types || []);
        setTypesLoading(false);
      } catch (err) {
        console.error('[Assessment Builder UI] loadTypes error:', err);
        if (cancelled) return;
        setTypesError(err.message || 'Failed to load assessment types');
        setTypesLoading(false);
      }
    }
    loadTypes();
    return () => { cancelled = true; };
  }, [session]);

  // ---------- Reusable refetch ----------
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('assessment_type_id', typeFilter);

      const response = await fetch(`/api/admin/assessments/list?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load assessments');
      setAssessments(data.assessments || []);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('[Assessment Builder UI] refetch error:', err);
      setError(err.message || 'Failed to load assessments');
      setLoading(false);
    }
  };

  // ---------- Load assessments on filter change ----------
  useEffect(() => {
    if (!session) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, search, typeFilter]);

  // ---------- Debounce search ----------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // ---------- Handlers ----------
  const handleBack = () => router.push('/admin');
  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('');
  };

  const handleCreated = async (data) => {
    setShowCreate(false);
    setToast(`Created assessment (${data.assessment_id.slice(0, 8)}…)`);
    setTimeout(() => setToast(null), 6000);
    await refetch();
  };

  const handleSaved = async () => {
    setEditing(null);
    setToast('Assessment updated');
    setTimeout(() => setToast(null), 6000);
    await refetch();
  };

  const handleToggleActive = async (a) => {
    try {
      setTogglingId(a.id);
      const response = await fetch('/api/admin/assessments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: a.id,
          title: a.title,
          description: a.description || null,
          instructions: a.instructions || null,
          is_active: !a.is_active,
          expires_at: a.expires_at || null
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to toggle');
      await refetch();
    } catch (err) {
      console.error('[Assessment Builder UI] toggle error:', err);
      window.alert('Failed to toggle active: ' + (err.message || 'Unknown error'));
    } finally {
      setTogglingId(null);
    }
  };

  const hasActiveFilters = !!(search || typeFilter);

  // ---------- Loading / error shells ----------
  if (authLoading || typesLoading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading assessment builder...</p>
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

  // ---------- Main render ----------
  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>← Back to Admin Dashboard</button>

        <div style={styles.header}>
          <div style={styles.headerText}>
            <h1 style={styles.title}>Assessment Builder</h1>
            <p style={styles.subtitle}>
              Create and manage assessments. Each assessment is backed by a question pool from its type.
            </p>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => setShowCreate(true)}
              style={styles.createButton}
            >
              + New Assessment
            </button>
          </div>
        </div>

        {toast && (
          <div style={styles.successToast}>
            <strong>✓ {toast}</strong>
          </div>
        )}

        <div style={styles.filtersRow}>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search by title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={styles.searchInput}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                style={styles.clearIconButton}
                aria-label="Clear search"
              >✕</button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.typeSelect}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={styles.clearFiltersButton}>
              Clear filters
            </button>
          )}
        </div>

        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.tableLoading}>
              <div style={styles.loadingSpinner}></div>
              <p>Loading assessments...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div style={styles.emptyState}>
              {hasActiveFilters
                ? 'No assessments match the current filters.'
                : 'No assessments yet. Click “+ New Assessment” to create one.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '60px' }}>#</th>
                  <th style={styles.th}>Title</th>
                  <th style={{ ...styles.th, width: '22%' }}>Type</th>
                  <th style={{ ...styles.th, width: '100px' }}>Status</th>
                  <th style={{ ...styles.th, width: '18%' }}>Expires</th>
                  <th style={{ ...styles.th, width: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.tdOrder}>{i + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.titleCell}>{a.title}</div>
                      {a.description && (
                        <div style={styles.descCell}>{a.description}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {a.assessment_type ? (
                        <div>
                          <div style={styles.typeName}>{a.assessment_type.name}</div>
                          <div style={styles.typeMeta}>
                            {a.assessment_type.code} · {a.assessment_type.question_count}q · {a.assessment_type.time_limit_minutes}m
                          </div>
                        </div>
                      ) : (
                        <span style={styles.muted}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={a.is_active ? styles.badgeActive : styles.badgeInactive}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {a.expires_at ? formatDateTime(a.expires_at) : <span style={styles.muted}>—</span>}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button
                          onClick={() => setEditing(a)}
                          style={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(a)}
                          disabled={togglingId === a.id}
                          style={{
                            ...styles.toggleButton,
                            opacity: togglingId === a.id ? 0.6 : 1,
                            cursor: togglingId === a.id ? 'not-allowed' : 'pointer',
                            background: a.is_active ? '#b45309' : '#16a34a'
                          }}
                        >
                          {togglingId === a.id ? '…' : a.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && assessments.length > 0 && (
          <div style={styles.footerCount}>
            Showing {assessments.length} of {total} assessment{total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {showCreate && types.length > 0 && (
        <CreateModal
          types={types}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editing && (
        <EditModal
          assessment={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
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
  createButton: { padding: '10px 20px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  successToast: { padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' },
  filtersRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', flex: '1 1 320px', maxWidth: '480px' },
  searchInput: { width: '100%', padding: '10px 40px 10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' },
  clearIconButton: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' },
  typeSelect: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white', fontFamily: 'inherit', minWidth: '240px', cursor: 'pointer' },
  clearFiltersButton: { padding: '10px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  errorBox: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', color: '#991b1b' },
  tableContainer: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' },
  tableLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '12px', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '14px 16px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.15s' },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1a202c', verticalAlign: 'top' },
  tdOrder: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', verticalAlign: 'top' },
  titleCell: { fontWeight: '600', color: '#0a1929' },
  descCell: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  typeName: { fontWeight: '500', color: '#0a1929' },
  typeMeta: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  muted: { color: '#cbd5e1' },
  badgeActive: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: '600' },
  badgeInactive: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: '600' },
  actionCell: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  editButton: { padding: '6px 14px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  toggleButton: { padding: '6px 14px', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px' },
  footerCount: { marginTop: '12px', fontSize: '13px', color: '#64748b' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 39, 71, 0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', zIndex: 2000, overflowY: 'auto' },
  modal: { background: 'white', borderRadius: '12px', width: 'min(640px, 92vw)', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a237e' },
  modalClose: { background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' },
  modalBody: { padding: '16px 20px', overflowY: 'auto' },
  fieldLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', background: 'white', cursor: 'pointer', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  helperText: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  inlineRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  clearInlineButton: { padding: '8px 14px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' },
  readonlyField: { padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569' },
  readonlyNote: { fontSize: '12px', color: '#94a3b8' },
  modalError: { marginTop: '12px', padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' },
  cancelButton: { padding: '10px 18px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  saveButton: { padding: '10px 20px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }
};

if (typeof document !== 'undefined' && !document.getElementById('ab-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'ab-spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
