// pages/admin/templates/index.js
// Phase 3 Item 5 — Assessment templates (read-only)
// Lists saved presets for the Assessment Builder create modal.

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

export default function TemplatesList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);

  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);

  // ---------- Load types on mount ----------
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadTypes() {
      try {
        setTypesLoading(true);
        const response = await fetch('/api/admin/question-bank/types');
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load types');
        if (cancelled) return;
        setTypes(data.types || []);
        setTypesLoading(false);
      } catch (err) {
        console.error('[Templates UI] loadTypes error:', err);
        if (cancelled) return;
        setTypesLoading(false);
      }
    }

    loadTypes();
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

  // ---------- Debounce search ----------
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
    setShowInactive(false);
  };

  const hasActiveFilters = !!(search || typeFilter || showInactive);

  if (authLoading || typesLoading) {
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
        </div>

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
            <span style={{ fontSize: '13px', color: '#475569' }}>Show inactive</span>
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
                : 'No templates yet. Create one to speed up assessment setup.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '50px' }}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: '18%' }}>Type</th>
                  <th style={{ ...styles.th, width: '18%' }}>Title pattern</th>
                  <th style={{ ...styles.th, width: '18%' }}>Default roles</th>
                  <th style={{ ...styles.th, width: '80px' }}>Active</th>
                  <th style={{ ...styles.th, width: '110px' }}>Expires in</th>
                  <th style={{ ...styles.th, width: '140px' }}>Actions</th>
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
                      <span style={styles.muted}>—</span>
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
    </AppLayout>
  );
}

const styles = {
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' },
  loadingSpinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #1a237e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '20px' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  headerText: { flex: '1 1 auto' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  filtersRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', flex: '1 1 280px', maxWidth: '420px' },
  searchInput: { width: '100%', padding: '10px 40px 10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' },
  clearIconButton: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' },
  typeSelect: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white', fontFamily: 'inherit', minWidth: '200px', cursor: 'pointer' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
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
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px' },
  footerCount: { marginTop: '12px', fontSize: '13px', color: '#64748b' }
};

if (typeof document !== 'undefined' && !document.getElementById('tmpl-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'tmpl-spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
