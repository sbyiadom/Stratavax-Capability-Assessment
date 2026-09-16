// pages/admin/templates/index.js
// Phase 3 Item 5 — Assessment templates
// List + Create + Edit + Delete.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

// ============================================================
// Reusable modal field: Roles multi-select grouped by category
// ============================================================
function buildRoleOptions(allRoles) {
  const universities = allRoles.filter((r) => r.category === 'university');
  const programmes = allRoles.filter((r) => r.category === 'programme');
  return [
    { label: 'Programmes', options: programmes.map((r) => ({ value: r.id, label: r.name })) },
    { label: 'Universities', options: universities.map((r) => ({ value: r.id, label: r.name })) }
  ];
}

const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    borderColor: state.isFocused ? '#1a237e' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 1px #1a237e' : 'none',
    '&:hover': { borderColor: '#1a237e' },
    fontSize: '14px'
  }),
  multiValue: (base) => ({ ...base, backgroundColor: '#e0e7ff' }),
  multiValueLabel: (base) => ({ ...base, color: '#1e40af', fontWeight: 600, fontSize: '12px' }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#1e40af',
    '&:hover': { backgroundColor: '#1e40af', color: 'white' }
  }),
  groupHeading: (base) => ({
    ...base,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8'
  })
};

// ============================================================
// Shared form — used by both Create and Edit modals
// ============================================================
function TemplateForm({
  initial,
  types,
  allRoles,
  saving,
  error,
  submitLabel,
  onSubmit,
  onClose
}) {
  const [name, setName] = useState(initial.name || '');
  const [titlePattern, setTitlePattern] = useState(initial.title_pattern || '');
  const [assessmentTypeId, setAssessmentTypeId] = useState(
    initial.assessment_type_id != null ? String(initial.assessment_type_id) : ''
  );
  const [description, setDescription] = useState(initial.description || '');
  const [instructions, setInstructions] = useState(initial.instructions || '');
  const [defaultIsActive, setDefaultIsActive] = useState(initial.default_is_active !== false);
  const [expiresInDays, setExpiresInDays] = useState(
    initial.expires_in_days != null ? String(initial.expires_in_days) : ''
  );
  const [isActive, setIsActive] = useState(initial.is_active !== false);

  const initialRoles = useMemo(
    () => (initial.roles || []).map((r) => ({ value: r.id, label: r.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [selectedRoles, setSelectedRoles] = useState(initialRoles);

  const roleOptions = useMemo(() => buildRoleOptions(allRoles), [allRoles]);

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      title_pattern: titlePattern.trim() || null,
      assessment_type_id: assessmentTypeId === '' ? null : Number(assessmentTypeId),
      description: description.trim() || null,
      instructions: instructions.trim() || null,
      default_is_active: defaultIsActive,
      expires_in_days: expiresInDays === '' ? null : Number(expiresInDays),
      is_active: isActive,
      role_ids: selectedRoles.map((r) => r.value)
    });
  };

  return (
    <>
      <div style={styles.modalBody}>
        <label style={styles.fieldLabel}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          maxLength={200}
          autoFocus
        />

        <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Title pattern (optional)</label>
        <input
          type="text"
          value={titlePattern}
          onChange={(e) => setTitlePattern(e.target.value)}
          placeholder="e.g. Mechanical Assessment — {date}"
          style={styles.input}
          maxLength={200}
        />
        <div style={styles.helperText}>
          Pre-fills the Title field when this template is applied. Use <code>{'{date}'}</code> as a placeholder for today.
        </div>

        <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Assessment type</label>
        <select
          value={assessmentTypeId}
          onChange={(e) => setAssessmentTypeId(e.target.value)}
          style={styles.select}
        >
          <option value="">— No default type —</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.question_count}q · {t.time_limit_minutes}m)
            </option>
          ))}
        </select>

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

        <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Default roles</label>
        <Select
          isMulti
          options={roleOptions}
          value={selectedRoles}
          onChange={(opts) => setSelectedRoles(opts || [])}
          placeholder="Pre-select roles for assessments created from this template..."
          styles={reactSelectStyles}
          menuPlacement="top"
        />

        <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Expires in (days, optional)</label>
        <input
          type="number"
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value)}
          placeholder="e.g. 30"
          style={styles.input}
          min={1}
        />
        <div style={styles.helperText}>
          When applying this template, an expiration date of "today + this many days" is pre-filled.
        </div>

        <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={defaultIsActive}
              onChange={(e) => setDefaultIsActive(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>New assessments default to Active</span>
          </label>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>This template is Active</span>
          </label>
        </div>

        {error && <div style={styles.modalError}><strong>Error:</strong> {error}</div>}
      </div>

      <div style={styles.modalFooter}>
        <button onClick={onClose} disabled={saving} style={styles.cancelButton}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving} style={styles.saveButton}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </>
  );
}

// ============================================================
// CREATE MODAL
// ============================================================
function CreateModal({ types, allRoles, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/admin/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to create');
      onCreated(data);
    } catch (err) {
      console.error('[Templates UI] create error:', err);
      setError(err.message || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>New Template</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>
        <TemplateForm
          initial={{}}
          types={types}
          allRoles={allRoles}
          saving={saving}
          error={error}
          submitLabel="Create template"
          onSubmit={handleSubmit}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================
function EditModal({ template, types, allRoles, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/admin/templates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, template_id: template.id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (err) {
      console.error('[Templates UI] save error:', err);
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Edit Template</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>
        <TemplateForm
          initial={template}
          types={types}
          allRoles={allRoles}
          saving={saving}
          error={error}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function TemplatesList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [types, setTypes] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [refDataLoading, setRefDataLoading] = useState(true);

  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const debounceRef = useRef(null);

  // ---------- Load reference data ----------
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadRef() {
      try {
        setRefDataLoading(true);
        const [typesRes, rolesRes] = await Promise.all([
          fetch('/api/admin/question-bank/types'),
          fetch('/api/admin/roles/list')
        ]);
        const typesData = await typesRes.json();
        const rolesData = await rolesRes.json();

        if (!typesRes.ok || !typesData.success) throw new Error(typesData.error || 'Failed to load types');
        if (!rolesRes.ok || !rolesData.success) throw new Error(rolesData.error || 'Failed to load roles');

        if (cancelled) return;
        setTypes(typesData.types || []);
        setAllRoles(rolesData.roles || []);
        setRefDataLoading(false);
      } catch (err) {
        console.error('[Templates UI] loadRef error:', err);
        if (cancelled) return;
        setRefDataLoading(false);
      }
    }

    loadRef();
    return () => { cancelled = true; };
  }, [session]);

  // ---------- Refetch templates ----------
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('assessment_type_id', typeFilter);
      if (showInactive) params.set('include_inactive', 'true');

      const response = await fetch(`/api/admin/templates/list?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load templates');
      setTemplates(data.templates || []);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('[Templates UI] refetch error:', err);
      setError(err.message || 'Failed to load templates');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, search, typeFilter, showInactive]);

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
    setShowInactive(false);
  };

  const handleCreated = async (data) => {
    setShowCreate(false);
    setToast(`Created template (id ${data.template_id.slice(0, 8)}…)`);
    setTimeout(() => setToast(null), 6000);
    await refetch();
  };

  const handleSaved = async () => {
    setEditing(null);
    setToast('Template updated');
    setTimeout(() => setToast(null), 6000);
    await refetch();
  };

  const handleDelete = async (t) => {
    const ok = window.confirm(
      `Delete "${t.name}"?\n\nThis will remove the template and any role links. Assessments already created from it are unaffected.\n\nThis cannot be undone.`
    );
    if (!ok) return;
    try {
      setDeletingId(t.id);
      const response = await fetch('/api/admin/templates/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: t.id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      await refetch();
    } catch (err) {
      console.error('[Templates UI] delete error:', err);
      window.alert('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = !!(search || typeFilter || showInactive);

  if (authLoading || refDataLoading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading templates...</p>
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
            <h1 style={styles.title}>Assessment Templates</h1>
            <p style={styles.subtitle}>
              Reusable presets that pre-fill the New Assessment form.
            </p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => setShowCreate(true)} style={styles.createButton}>+ New Template</button>
          </div>
        </div>

        {toast && <div style={styles.successToast}><strong>✓ {toast}</strong></div>}

        <div style={styles.filtersRow}>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={styles.searchInput}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} style={styles.clearIconButton} aria-label="Clear">✕</button>
            )}
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.typeSelect}>
            <option value="">All types</option>
            {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            <span style={styles.checkboxLabel}>Show inactive</span>
          </label>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={styles.clearFiltersButton}>Clear filters</button>
          )}
        </div>

        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.tableLoading}>
              <div style={styles.loadingSpinner}></div>
              <p>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div style={styles.emptyState}>
              {hasActiveFilters
                ? 'No templates match the current filters.'
                : 'No templates yet. Click “+ New Template” to create one.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '50px' }}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: '16%' }}>Type</th>
                  <th style={{ ...styles.th, width: '18%' }}>Title pattern</th>
                  <th style={{ ...styles.th, width: '18%' }}>Default roles</th>
                  <th style={{ ...styles.th, width: '80px' }}>Active</th>
                  <th style={{ ...styles.th, width: '110px' }}>Expires in</th>
                  <th style={{ ...styles.th, width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t, i) => (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.tdOrder}>{i + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>{t.name}</div>
                      {t.description && <div style={styles.descCell}>{t.description}</div>}
                    </td>
                    <td style={styles.td}>
                      {t.assessment_type ? (
                        <div>
                          <div style={styles.typeName}>{t.assessment_type.name}</div>
                          <div style={styles.typeMeta}>
                            {t.assessment_type.code} · {t.assessment_type.question_count}q · {t.assessment_type.time_limit_minutes}m
                          </div>
                        </div>
                      ) : (
                        <span style={styles.muted}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {t.title_pattern
                        ? <code style={styles.codeCell}>{t.title_pattern}</code>
                        : <span style={styles.muted}>—</span>}
                    </td>
                    <td style={styles.td}>
                      {t.roles && t.roles.length > 0 ? (
                        <div style={styles.roleChips}>
                          {t.roles.map((r) => (
                            <span key={r.id} style={styles.roleChip}>{r.name}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={styles.muted}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={t.is_active ? styles.badgeActive : styles.badgeInactive}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {t.expires_in_days != null
                        ? <span style={styles.daysCell}>{t.expires_in_days}d</span>
                        : <span style={styles.muted}>—</span>}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button onClick={() => setEditing(t)} style={styles.editButton}>Edit</button>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deletingId === t.id}
                          style={{
                            ...styles.deleteButton,
                            opacity: deletingId === t.id ? 0.6 : 1,
                            cursor: deletingId === t.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {deletingId === t.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && templates.length > 0 && (
          <div style={styles.footerCount}>
            Showing {templates.length} of {total} template{total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          types={types}
          allRoles={allRoles}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editing && (
        <EditModal
          template={editing}
          types={types}
          allRoles={allRoles}
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
  searchWrapper: { position: 'relative', flex: '1 1 280px', maxWidth: '420px' },
  searchInput: { width: '100%', padding: '10px 40px 10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' },
  clearIconButton: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' },
  typeSelect: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white', fontFamily: 'inherit', minWidth: '200px', cursor: 'pointer' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
  checkboxLabel: { fontSize: '13px', color: '#475569', fontWeight: '500' },
  clearFiltersButton: { padding: '10px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  errorBox: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', color: '#991b1b' },
  tableContainer: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' },
  tableLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '12px', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '14px 16px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.15s' },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1a202c', verticalAlign: 'top' },
  tdOrder: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', verticalAlign: 'top' },
  nameCell: { fontWeight: '600', color: '#0a1929' },
  descCell: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  typeName: { fontWeight: '500', color: '#0a1929' },
  typeMeta: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  muted: { color: '#cbd5e1' },
  codeCell: { background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' },
  roleChips: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  roleChip: { display: 'inline-block', padding: '2px 8px', background: '#e0e7ff', color: '#1e40af', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
  badgeActive: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: '600' },
  badgeInactive: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: '600' },
  daysCell: { fontSize: '13px', color: '#475569', fontWeight: '500' },
  actionCell: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  editButton: { padding: '6px 12px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  deleteButton: { padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px' },
  footerCount: { marginTop: '12px', fontSize: '13px', color: '#64748b' },

  // Modal
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
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  modalError: { marginTop: '12px', padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' },
  cancelButton: { padding: '10px 18px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  saveButton: { padding: '10px 20px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }
};

if (typeof document !== 'undefined' && !document.getElementById('tmpl-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'tmpl-spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
