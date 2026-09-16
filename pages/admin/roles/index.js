// pages/admin/roles/index.js
// Phase 3 Item 4 — Roles (read-only)
// Lists universities + programmes. No create/edit/delete yet.

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

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

  const [categoryTab, setCategoryTab] = useState('all'); // 'all' | 'university' | 'programme'
  const [searchInput, setSearchInput] = useState('');

  // ---------- Load roles on mount ----------
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadRoles() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/roles/list');
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load roles');
        }
        if (cancelled) return;

        setRoles(data.roles || []);
        setTotal(data.total || 0);
        setLoading(false);
      } catch (err) {
        console.error('[Roles UI] load error:', err);
        if (cancelled) return;
        setError(err.message || 'Failed to load roles');
        setLoading(false);
      }
    }

    loadRoles();
    return () => { cancelled = true; };
  }, [session]);

  // ---------- Derived: filtered list ----------
  const filteredRoles = useMemo(() => {
    let list = roles;

    if (categoryTab !== 'all') {
      list = list.filter((r) => r.category === categoryTab);
    }

    const term = searchInput.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term)
      );
    }

    return list;
  }, [roles, categoryTab, searchInput]);

  const handleBack = () => router.push('/admin');
  const handleClearSearch = () => setSearchInput('');

  // ---------- Loading shell ----------
  if (authLoading || loading) {
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
        </div>

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
            Universities ({roles.filter((r) => r.category === 'university').length})
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
            Programmes ({roles.filter((r) => r.category === 'programme').length})
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
                onClick={handleClearSearch}
                style={styles.clearIconButton}
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
        </div>

        <div style={styles.tableContainer}>
          {filteredRoles.length === 0 ? (
            <div style={styles.emptyState}>
              {searchInput
                ? 'No roles match your search.'
                : 'No roles in this category.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '60px' }}>#</th>
                  <th style={{ ...styles.th, width: '20%' }}>Code</th>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: '130px' }}>Category</th>
                  <th style={{ ...styles.th, width: '110px' }}>Order</th>
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
                      {r.description && (
                        <div style={styles.descCell}>{r.description}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          r.category === 'university'
                            ? styles.badgeUniversity
                            : styles.badgeProgramme
                        }
                      >
                        {r.category === 'university' ? 'University' : 'Programme'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.orderCell}>{r.display_order}</span>
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
  header: { marginBottom: '24px' },
  headerText: { flex: '1 1 auto' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
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
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px' },
  footerCount: { marginTop: '12px', fontSize: '13px', color: '#64748b' }
};

if (typeof document !== 'undefined' && !document.getElementById('roles-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'roles-spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
