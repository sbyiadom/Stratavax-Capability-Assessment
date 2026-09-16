// pages/admin/assessments/index.js
// Phase 3 — Assessment Builder
// List + create modal (with template picker) + edit modal + role tagging.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
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

function localToIso(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

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

// {date} → today's date (YYYY-MM-DD); leaves other content untouched.
function applyTitlePattern(pattern) {
  if (!pattern) return '';
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const iso = `${yyyy}-${mm}-${dd}`;
  return pattern.replace(/\{date\}/g, iso);
}

// now + N days → datetime-local string for the expires input
function daysFromNowToLocal(days) {
  if (days == null || !Number.isFinite(days) || days <= 0) return '';
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================
// CREATE MODAL (with template picker)
// ============================================================
function CreateModal({ types, templates, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [assessmentTypeId, setAssessmentTypeId] = useState(types[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresLocal, setExpiresLocal] = useState('');

  const [templateId, setTemplateId] = useState('');
  const [templateRoles, setTemplateRoles] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ---------- Apply template values to form state ----------
  const applyTemplate = (t) => {
    if (!t) return;
    if (t.title_pattern) setTitle(applyTitlePattern(t.title_pattern));
    if (t.assessment_type_id) setAssessmentTypeId(String(t.assessment_type_id));
    setDescription(t.description || '');
    setInstructions(t.instructions || '');
    setIsActive(t.default_is_active !== false);
    setExpiresLocal(daysFromNowToLocal(t.expires_in_days));
    setTemplateRoles(Array.isArray(t.roles) ? t.roles : []);
  };

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    if (!id) {
      // Clearing the template doesn't wipe manual input — user decides what to do
      setTemplateRoles([]);
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (t) applyTemplate(t);
  };

  const handleResetFromTemplate = () => {
    if (!templateId) return;
    const t = templates.find((x) => x.id === templateId);
    if (t) applyTemplate(t);
  };

  // ---------- Save ----------
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

      // Apply template roles if any
      if (templateRoles.length > 0 && data.assessment_id) {
        try {
          const rolesRes = await fetch('/api/admin/assessments/set-roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessment_id: data.assessment_id,
              role_ids: templateRoles.map((r) => r.id)
            })
          });
          const rolesData = await rolesRes.json();
          if (!rolesRes.ok || !rolesData.success) {
            console.error('[Assessment Builder UI] template roles failed:', rolesData.error);
            // Don't block creation — assessment exists, only role tagging failed
          }
        } catch (roleErr) {
          console.error('[Assessment Builder UI] template roles error:', roleErr);
        }
      }

      onCreated(data);
    } catch (err) {
      console.error('[Assessment Builder UI] create error:', err);
      setError(err.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const hasTemplate = templateId !== '';

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>New Assessment</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* ---------- Template picker ---------- */}
          {templates.length > 0 && (
            <>
              <label style={styles.fieldLabel}>Start from template (optional)</label>
              <div style={styles.inlineRow}>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  style={{ ...styles.select, flex: 1 }}
                >
                  <option value="">— No template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {hasTemplate && (
                  <button
                    type="button"
                    onClick={handleResetFromTemplate}
                    style={styles.resetTemplateButton}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div style={styles.helperText}>
                {hasTemplate
                  ? 'Template values have been applied. Edit any field freely — use Reset to re-apply the template.'
                  : 'Pick a template to pre-fill the fields below.'}
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '14px', marginBottom: '14px' }} />
            </>
          )}

          <label style={styles.fieldLabel}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} maxLength={200} autoFocus />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Assessment type</label>
          <select value={assessmentTypeId} onChange={(e) => setAssessmentTypeId(e.target.value)} style={styles.select}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.question_count}q · {t.time_limit_minutes}m)
              </option>
            ))}
          </select>
          <div style={styles.helperText}>Type is locked after creation. To use a different type, create a new assessment.</div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={styles.textarea} />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Instructions (optional)</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} style={styles.textarea} />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Expires at (optional)</label>
          <div style={styles.inlineRow}>
            <input type="datetime-local" value={expiresLocal} onChange={(e) => setExpiresLocal(e.target.value)} style={styles.input} />
            {expiresLocal && <button type="button" onClick={() => setExpiresLocal('')} style={styles.clearInlineButton}>Clear</button>}
          </div>

          <label style={styles.checkboxRow}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>Active</span>
          </label>

          {hasTemplate && templateRoles.length > 0 && (
            <div style={styles.templateRolesBanner}>
              <strong>Will tag with {templateRoles.length} role{templateRoles.length === 1 ? '' : 's'} from template:</strong>
              <div style={styles.roleChips}>
                {templateRoles.map((r) => (
                  <span key={r.id} style={styles.roleChip}>{r.name}</span>
                ))}
              </div>
            </div>
          )}

          {error && <div style={styles.modalError}><strong>Error:</strong> {error}</div>}
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
// EDIT MODAL (unchanged, roles multi-select)
// ============================================================
function EditModal({ assessment, allRoles, onClose, onSaved }) {
  const [title, setTitle] = useState(assessment.title || '');
  const [description, setDescription] = useState(assessment.description || '');
  const [instructions, setInstructions] = useState(assessment.instructions || '');
  const [isActive, setIsActive] = useState(assessment.is_active !== false);
  const [expiresLocal, setExpiresLocal] = useState(isoToLocal(assessment.expires_at));

  const initialRoles = useMemo(
    () => (assessment.roles || []).map((r) => ({ value: r.id, label: r.name })),
    [assessment.roles]
  );
  const [selectedRoles, setSelectedRoles] = useState(initialRoles);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const roleOptions = useMemo(() => {
    const universities = allRoles.filter((r) => r.category === 'university');
    const programmes = allRoles.filter((r) => r.category === 'programme');
    return [
      { label: 'Programmes', options: programmes.map((r) => ({ value: r.id, label: r.name })) },
      { label: 'Universities', options: universities.map((r) => ({ value: r.id, label: r.name })) }
    ];
  }, [allRoles]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updatePayload = {
        assessment_id: assessment.id,
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        is_active: isActive,
        expires_at: localToIso(expiresLocal)
      };

      const updateResponse = await fetch('/api/admin/assessments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const updateData = await updateResponse.json();
      if (!updateResponse.ok || !updateData.success) {
        throw new Error(updateData.error || 'Failed to save assessment');
      }

      const roleIds = selectedRoles.map((r) => r.value);
      const rolesResponse = await fetch('/api/admin/assessments/set-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: assessment.id, role_ids: roleIds })
      });
      const rolesData = await rolesResponse.json();
      if (!rolesResponse.ok || !rolesData.success) {
        throw new Error(rolesData.error || 'Assessment saved, but role tagging failed');
      }

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
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} maxLength={200} />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Assessment type</label>
          <div style={styles.readonlyField}>
            {assessment.assessment_type
              ? `${assessment.assessment_type.name} (${assessment.assessment_type.code})`
              : 'Unknown'}
            <span style={styles.readonlyNote}> · locked after creation</span>
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={styles.textarea} />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Instructions (optional)</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} style={styles.textarea} />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Expires at (optional)</label>
          <div style={styles.inlineRow}>
            <input type="datetime-local" value={expiresLocal} onChange={(e) => setExpiresLocal(e.target.value)} style={styles.input} />
            {expiresLocal && <button type="button" onClick={() => setExpiresLocal('')} style={styles.clearInlineButton}>Clear</button>}
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Roles / Programmes</label>
          <Select
            isMulti
            options={roleOptions}
            value={selectedRoles}
            onChange={(opts) => setSelectedRoles(opts || [])}
            placeholder="Tag this assessment with the roles it's intended for..."
            styles={reactSelectStyles}
            menuPlacement="top"
          />
          <div style={styles.helperText}>
            Leave empty if this assessment isn't role-specific.
          </div>

          <label style={styles.checkboxRow}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>Active</span>
          </label>

          {error && <div style={styles.modalError}><strong>Error:</strong> {error}</div>}
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
// react-select custom styles
// ============================================================
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
// MAIN PAGE
// ============================================================
export default function AssessmentBuilderList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [types, setTypes] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [refDataLoading, setRefDataLoading] = useState(true);
  const [typesError, setTypesError] = useState(null);

  const [assessments, setAssessments] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);

  const debounceRef = useRef(null);

  // ---------- Load reference data ----------
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadRef() {
      try {
        setRefDataLoading(true);
        setTypesError(null);

        const [typesRes, rolesRes, templatesRes] = await Promise.all([
          fetch('/api/admin/question-bank/types'),
          fetch('/api/admin/roles/list'),
          fetch('/api/admin/templates/list')
        ]);

        const typesData = await typesRes.json();
        const rolesData = await rolesRes.json();
        const templatesData = await templatesRes.json();

        if (!typesRes.ok || !typesData.success) throw new Error(typesData.error || 'Failed to load types');
        if (!rolesRes.ok || !rolesData.success) throw new Error(rolesData.error || 'Failed to load roles');
        if (!templatesRes.ok || !templatesData.success) throw new Error(templatesData.error || 'Failed to load templates');

        if (cancelled) return;
        setTypes(typesData.types || []);
        setAllRoles(rolesData.roles || []);
        setTemplates(templatesData.templates || []);
        setRefDataLoading(false);
      } catch (err) {
        console.error('[Assessment Builder UI] loadRef error:', err);
        if (cancelled) return;
        setTypesError(err.message || 'Failed to load reference data');
        setRefDataLoading(false);
      }
    }

    loadRef();
    return () => { cancelled = true; };
  }, [session]);

  // ---------- Refetch assessments ----------
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('assessment_type_id', typeFilter);
      if (roleFilter) params.set('role_id', roleFilter);

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

  useEffect(() => {
    if (!session) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, search, typeFilter, roleFilter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const handleBack = () => router.push('/admin');
  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('');
    setRoleFilter('');
  };

  const handleCreated = async () => {
    setShowCreate(false);
    setToast('Created assessment');
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

  const hasActiveFilters = !!(search || typeFilter || roleFilter);

  if (authLoading || refDataLoading) {
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
            <button onClick={() => setShowCreate(true)} style={styles.createButton}>+ New Assessment</button>
          </div>
        </div>

        {toast && <div style={styles.successToast}><strong>✓ {toast}</strong></div>}

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
              <button onClick={() => setSearchInput('')} style={styles.clearIconButton} aria-label="Clear search">✕</button>
            )}
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.typeSelect}>
            <option value="">All types</option>
            {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={styles.typeSelect}>
            <option value="">All roles</option>
            {allRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.category === 'university' ? 'uni' : 'prog'})
              </option>
            ))}
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
                  <th style={{ ...styles.th, width: '50px' }}>#</th>
                  <th style={styles.th}>Title</th>
                  <th style={{ ...styles.th, width: '18%' }}>Type</th>
                  <th style={{ ...styles.th, width: '20%' }}>Roles</th>
                  <th style={{ ...styles.th, width: '90px' }}>Status</th>
                  <th style={{ ...styles.th, width: '140px' }}>Expires</th>
                  <th style={{ ...styles.th, width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.tdOrder}>{i + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.titleCell}>{a.title}</div>
                      {a.description && <div style={styles.descCell}>{a.description}</div>}
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
                      {a.roles && a.roles.length > 0 ? (
                        <div style={styles.roleChips}>
                          {a.roles.map((r) => (
                            <span key={r.id} style={styles.roleChip}>{r.name}</span>
                          ))}
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
                        <button onClick={() => setEditing(a)} style={styles.editButton}>Edit</button>
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
          templates={templates}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editing && (
        <EditModal
          assessment={editing}
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
  roleChips: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  roleChip: { display: 'inline-block', padding: '2px 8px', background: '#e0e7ff', color: '#1e40af', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
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
  resetTemplateButton: { padding: '10px 14px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#1a237e', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' },
  readonlyField: { padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569' },
  readonlyNote: { fontSize: '12px', color: '#94a3b8' },
  templateRolesBanner: { marginTop: '14px', padding: '10px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '13px', color: '#1e40af' },
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
