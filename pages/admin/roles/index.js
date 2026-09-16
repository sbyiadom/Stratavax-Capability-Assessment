// pages/admin/roles/index.js
// Phase 3 Item 4 — Roles
// List + Create + Edit + Delete.

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

// ============================================================
// CREATE MODAL
// ============================================================
function CreateModal({ defaultCategory, onClose, onCreated }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory || 'programme');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(100);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        code: code.trim(),
        name: name.trim(),
        category,
        description: description.trim() || null,
        display_order: Number(displayOrder) || 0,
        is_active: isActive
      };
      const response = await fetch('/api/admin/roles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to create role');
      onCreated(data);
    } catch (err) {
      console.error('[Roles UI] create error:', err);
      setError(err.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>New Role</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <label style={styles.fieldLabel}>Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="lowercase_snake_case"
            style={styles.input}
            autoFocus
          />
          <div style={styles.helperText}>
            Machine identifier — lowercase letters, digits, underscores. Locked after creation.
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            maxLength={200}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.select}
          >
            <option value="programme">Programme</option>
            <option value="university">University</option>
          </select>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={styles.textarea}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Display order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            style={styles.input}
            min={0}
          />
          <div style={styles.helperText}>
            Lower numbers appear first. 999 pins to the bottom.
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#1a202c' }}>Active</span>
          </label>

          {error && <div style={styles.modalError}><strong>Error:</strong> {error}</div>}
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} disabled={saving} style={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
            {saving ? 'Creating…' : 'Create role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================
function EditModal({ role, onClose, onSaved }) {
  const [name, setName] = useState(role.name || '');
  const [category, setCategory] = useState(role.category || 'programme');
  const [description, setDescription] = useState(role.description || '');
  const [displayOrder, setDisplayOrder] = useState(role.display_order ?? 100);
  const [isActive, setIsActive] = useState(role.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        role_id: role.id,
        name: name.trim(),
        category,
        description: description.trim() || null,
        display_order: Number(displayOrder) || 0,
        is_active: isActive
      };
      const response = await fetch('/api/admin/roles/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (err) {
      console.error('[Roles UI] save error:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Edit Role</h2>
          <button onClick={onClose} style={styles.modalClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <label style={styles.fieldLabel}>Code</label>
          <div style={styles.readonlyField}>
            <code style={styles.codeCell}>{role.code}</code>
            <span style={styles.readonlyNote}> · locked after creation</span>
          </div>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            maxLength={200}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.select}
          >
            <option value="programme">Programme</option>
            <option value="university">University</option>
          </select>

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={styles.textarea}
          />

          <label style={{ ...styles.fieldLabel, marginTop: '12px' }}>Display order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            style={styles.input}
            min={0}
          />

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
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
// MAIN PAGE
// ============================================================
export default function RolesList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [categoryTab, setCategoryTab] = useState('all');
  const [searchInput, setSearchInput] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  // ---------- Load ----------
  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/roles/list');
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load roles');
      setRoles(data.roles || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[Roles UI] load error:', err);
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ---------- Derived ----------
  const filteredRoles = useMemo(() => {
    let list = roles;
    if (categoryTab !== 'all') {
      list = list.filter((r) => r.category === categoryTab);
    }
    const term = searchInput.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term)
      );
    }
    return list;
  }, [roles, categoryTab, searchInput]);

  // ---------- Handlers ----------
  const handleBack = () => router.push('/admin');

  const handleCreated = async (data) => {
    setShowCreate(false);
    setToast(`Created role (id ${data.role_id})`);
    setTimeout(() => setToast(null), 6000);
    await loadRoles();
  };

  const handleSaved = async () => {
    setEditing(null);
    setToast('Role updated');
    setTimeout(() => setToast(null), 6000);
    await loadRoles();
  };

  const handleDelete = async (role) => {
    const ok = window.confirm(
      `Delete "${role.name}"?\n\nCode: ${role.code}\nCategory: ${role.category}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingId(role.id);
      const response = await fetch('/api/admin/roles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: role.id })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      await loadRoles();
    } catch (err) {
      console.error('[Roles UI] delete error:', err);
      window.alert('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const universityCount = roles.filter((r) => r.category === 'university').length;
  const programmeCount = roles.filter((r) => r.category === 'programme').length;

  // ---------- Loading shell ----------
  if (authLoading || (loading && roles.length === 0)) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading roles...</p>
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
            <h1 style={styles.title}>Roles & Programmes</h1>
            <p style={styles.subtitle}>
              Canonical list of universities and programmes used across the platform.
            </p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => setShowCreate(true)} style={styles.createButton}>
              + New Role
            </button>
          </div>
        </div>

        {toast && (
          <div style={styles.successToast}>
            <strong>✓ {toast}</strong>
          </div>
        )}

        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}

        <div style={styles.tabsRow}>
          <button
            onClick={() => setCategoryTab('all')}
            style={{
              ...styles.tab,
              background: categoryTab === 'all' ? '#1a237e' : 'white',
              color: categoryTab === 'all' ? 'white' : '#475569',
              border: categoryTab === 'all' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            All ({total})
          </button>
          <button
            onClick={() => setCategoryTab('university')}
            style={{
              ...styles.tab,
              background: categoryTab === 'university' ? '#1a237e' : 'white',
              color: categoryTab === 'university' ? 'white' : '#475569',
              border: categoryTab === 'university' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            Universities ({universityCount})
          </button>
          <button
            onClick={() => setCategoryTab('programme')}
            style={{
              ...styles.tab,
              background: categoryTab === 'programme' ? '#1a237e' : 'white',
              color: categoryTab === 'programme' ? 'white' : '#475569',
              border: categoryTab === 'programme' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            Programmes ({programmeCount})
          </button>
        </div>

        <div style={styles.filtersRow}>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search by name or code..."
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
        </div>

        <div style={styles.tableContainer}>
          {filteredRoles.length === 0 ? (
            <div style={styles.emptyState}>
              {searchInput ? 'No roles match your search.' : 'No roles in this category.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '60px' }}>#</th>
                  <th style={{ ...styles.th, width: '18%' }}>Code</th>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: '120px' }}>Category</th>
                  <th style={{ ...styles.th, width: '90px' }}>Order</th>
                  <th style={{ ...styles.th, width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((r, i) => (
                  <tr key={r.id} style={styles.tr}>
                    <td style={styles.tdOrder}>{i + 1}</td>
                    <td style={styles.td}>
                      <code style={styles.codeCell}>{r.code}</code>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>{r.name}</div>
                      {r.description && <div style={styles.descCell}>{r.description}</div>}
                    </td>
                    <td style={styles.td}>
                      <span style={r.category === 'university' ? styles.badgeUniversity : styles.badgeProgramme}>
                        {r.category === 'university' ? 'University' : 'Programme'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.orderCell}>{r.display_order}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button onClick={() => setEditing(r)} style={styles.editButton}>Edit</button>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          style={{
                            ...styles.deleteButton,
                            opacity: deletingId === r.id ? 0.6 : 1,
                            cursor: deletingId === r.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {deletingId === r.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredRoles.length > 0 && (
          <div style={styles.footerCount}>
            Showing {filteredRoles.length} of {total} role{total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          defaultCategory={categoryTab === 'university' ? 'university' : 'programme'}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editing && (
        <EditModal
          role={editing}
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
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  headerText: { flex: '1 1 auto' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  createButton: { padding: '10px 20px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  successToast: { padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' },
  tabsRow: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  filtersRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', flex: '1 1 320px', maxWidth: '480px' },
  searchInput: { width: '100%', padding: '10px 40px 10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' },
  clearIconButton: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' },
  errorBox: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', color: '#991b1b' },
  tableContainer: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '14px 16px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.15s' },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1a202c', verticalAlign: 'top' },
  tdOrder: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', verticalAlign: 'top' },
  codeCell: { background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' },
  nameCell: { fontWeight: '500', color: '#0a1929' },
  descCell: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  badgeUniversity: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: '#dbeafe', color: '#1e40af', fontSize: '12px', fontWeight: '600' },
  badgeProgramme: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: '#e8f5e9', color: '#2e7d32', fontSize: '12px', fontWeight: '600' },
  orderCell: { fontSize: '13px', color: '#64748b' },
  actionCell: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  editButton: { padding: '6px 12px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  deleteButton: { padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px' },
  footerCount: { marginTop: '12px', fontSize: '13px', color: '#64748b' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 39, 71, 0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', zIndex: 2000, overflowY: 'auto' },
  modal: { background: 'white', borderRadius: '12px', width: 'min(600px, 92vw)', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a237e' },
  modalClose: { background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' },
  modalBody: { padding: '16px 20px', overflowY: 'auto' },
  fieldLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', background: 'white', cursor: 'pointer', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  helperText: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  readonlyField: { padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569' },
  readonlyNote: { fontSize: '12px', color: '#94a3b8', marginLeft: '6px' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' },
  modalError: { marginTop: '12px', padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' },
  cancelButton: { padding: '10px 18px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' },
  saveButton: { padding: '10px 20px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }
};

if (typeof document !== 'undefined' && !document.getElementById('roles-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'roles-spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
