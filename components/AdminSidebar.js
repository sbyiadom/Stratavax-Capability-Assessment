// components/AdminSidebar.js
// Shared admin sidebar. Renders for role === 'admin' only.
// Active item is derived from router.pathname — always accurate.
// Phase 6: restructured into grouped sections with parent headers.

import Link from 'next/link';
import { useRouter } from 'next/router';

const COLORS = {
  accent: '#2563EB',
  sidebarBg: '#0F2747',
  sidebarHover: '#1a3a6b',
};

// ============================================================
// MENU STRUCTURE
// Groups → items. Always expanded. Group headers are visual
// dividers only; they are not clickable.
// ============================================================
const MENU_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/admin',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        ),
      },
    ],
  },
  {
    id: 'candidates',
    label: 'Candidates',
    items: [
      {
        id: 'manage-candidates',
        label: 'All Candidates',
        href: '/admin/manage-candidates',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        ),
      },
      {
        id: 'add-candidate',
        label: 'Add Candidate',
        href: '/admin/add-candidate',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
        ),
      },
      {
        id: 'batch-manage',
        label: 'Batch Manage',
        href: '/admin/batch-manage',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6"/><path d="M17 11h6"/></svg>
        ),
      },
    ],
  },
  {
    id: 'supervisors',
    label: 'Supervisors',
    items: [
      {
        id: 'manage-supervisors',
        label: 'All Supervisors',
        href: '/admin/manage-supervisors',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
        ),
      },
      {
        id: 'add-supervisor',
        label: 'Add Supervisor',
        href: '/admin/add-supervisor',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
        ),
      },
      {
        id: 'assign-supervisors',
        label: 'Assign Supervisors',
        href: '/admin/assign-supervisors',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        ),
      },
    ],
  },
  {
    id: 'assessments',
    label: 'Assessments',
    items: [
      {
        id: 'assessments',
        label: 'Assessments',
        href: '/admin/assessments',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        ),
      },
      {
        id: 'question-bank',
        label: 'Question Bank',
        href: '/admin/question-bank',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="6" rx="2"/><rect x="3" y="11" width="18" height="6" rx="2"/><line x1="7" y1="17" x2="7" y2="21"/><line x1="17" y1="17" x2="17" y2="21"/></svg>
        ),
      },
      {
        id: 'templates',
        label: 'Templates',
        href: '/admin/templates',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        ),
      },
      {
        id: 'roles',
        label: 'Roles',
        href: '/admin/roles',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        ),
      },
    ],
  },
  {
    id: 'assignments',
    label: 'Assignments',
    items: [
      {
        id: 'assign-assessments',
        label: 'Assign Assessments',
        href: '/admin/assign-assessments',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        ),
      },
      {
        id: 'bulk-assign',
        label: 'Bulk Assign',
        href: '/admin/bulk-assign',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6"/><path d="M17 11h6"/></svg>
        ),
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      {
        id: 'reports-assessment',
        label: 'Assessment Reports',
        href: '/admin/reports',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        ),
        children: [
          {
            id: 'reports-ns',
            label: 'National Service',
            href: '/admin/reports?type=national_service',
          },
          {
            id: 'reports-sv',
            label: 'Stratavax',
            href: '/admin/reports?type=stratavax',
          },
        ],
      },
      {
        id: 'competency-reports',
        label: 'Competency Reports',
        href: '/admin/competency-reports',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        ),
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ),
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: '/admin/system-settings',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
        ),
      },
      {
        id: 'reset-password',
        label: 'Password Reset',
        href: '/admin/reset-password',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        ),
      },
    ],
  },
];

// ============================================================
// FLATTEN for active-id lookup
// ============================================================
function flattenItems() {
  const flat = [];
  for (const group of MENU_GROUPS) {
    for (const item of group.items) {
      flat.push(item);
      if (Array.isArray(item.children)) {
        for (const child of item.children) {
          flat.push(child);
        }
      }
    }
  }
  return flat;
}

const FLAT_ITEMS = flattenItems();

// ============================================================
// ACTIVE-ITEM DERIVATION
// - Exact match wins.
// - Otherwise, longest href that is a prefix of pathname wins.
// - For children with query strings (e.g. ?type=ns), compare the
//   pathname without query; the parent will highlight if any of its
//   children match or if pathname === parent href.
// ============================================================
function normalizePath(href) {
  if (!href) return '';
  const qIdx = href.indexOf('?');
  return qIdx === -1 ? href : href.slice(0, qIdx);
}

function getActiveId(pathname, asPath) {
  if (!pathname) return null;

  // exact match (including children paths)
  const exact = FLAT_ITEMS.find((m) => {
    const p = normalizePath(m.href);
    return p === pathname;
  });
  if (exact) {
    // If exact match is a parent that has children AND the current
    // path matches a child path exactly, prefer the parent — the
    // children all point to the same page with query strings.
    return exact.id;
  }

  // longest-prefix match against normalized hrefs
  let best = null;
  let bestLen = 0;
  for (const m of FLAT_ITEMS) {
    const p = normalizePath(m.href);
    if (p === '/admin') continue; // don't let '/admin' match everything
    if (pathname === p || pathname.startsWith(p + '/')) {
      if (p.length > bestLen) {
        best = m;
        bestLen = p.length;
      }
    }
  }
  return best ? best.id : null;
}

// Whether a parent should be considered "active" because the current
// page matches one of its children.
function isParentActive(item, activeChildId) {
  if (!Array.isArray(item.children)) return false;
  return item.children.some((c) => c.id === activeChildId);
}

// ============================================================
// COMPONENT
// ============================================================
export default function AdminSidebar({ isOpen, toggleSidebar, handleLogout, userRole }) {
  const router = useRouter();

  if (userRole !== 'admin') return null;

  const activeId = getActiveId(router.pathname, router.asPath);
  const activeChildId = Array.isArray(router.query?.type) ? null : null; // reserved for future

  const handleNavigation = (href) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && toggleSidebar) {
      toggleSidebar();
    }
    router.push(href);
  };

  return (
    <div style={{
      ...stylesSidebar.sidebar,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    }}>
      <div style={stylesSidebar.logoArea}>
        <div style={stylesSidebar.logoIcon}>S</div>
        <span style={stylesSidebar.logoText}>Stratavax</span>
      </div>

      <nav style={stylesSidebar.nav}>
        {MENU_GROUPS.map((group) => (
          <div key={group.id} style={stylesSidebar.group}>
            <div style={stylesSidebar.groupLabel}>{group.label}</div>
            {group.items.map((item) => {
              const isActive =
                activeId === item.id ||
                isParentActive(item, activeId);

              return (
                <div key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.href)}
                    style={{
                      ...stylesSidebar.navItem,
                      backgroundColor: isActive ? COLORS.sidebarHover : 'transparent',
                      borderLeft: isActive
                        ? `3px solid ${COLORS.accent}`
                        : '3px solid transparent',
                    }}
                  >
                    <span style={stylesSidebar.navIcon}>{item.icon}</span>
                    <span style={stylesSidebar.navLabel}>{item.label}</span>
                  </button>

                  {/* Children — always rendered when present, indented */}
                  {Array.isArray(item.children) && item.children.length > 0 && (
                    <div style={stylesSidebar.childrenContainer}>
                      {item.children.map((child) => {
                        const childActive = activeId === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleNavigation(child.href)}
                            style={{
                              ...stylesSidebar.childItem,
                              color: childActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                              backgroundColor: childActive ? 'rgba(37,99,235,0.18)' : 'transparent',
                            }}
                          >
                            <span style={stylesSidebar.childDot} />
                            <span style={stylesSidebar.childLabel}>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={stylesSidebar.bottomNav}>
        <button onClick={handleLogout} style={stylesSidebar.navItem}>
          <span style={stylesSidebar.navIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span style={stylesSidebar.navLabel}>Logout</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const stylesSidebar = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '250px',
    height: '100vh',
    background: COLORS.sidebarBg,
    color: 'white',
    zIndex: 1000,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  logoArea: {
    padding: '20px 20px 10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: COLORS.accent,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  nav: {
    flex: 1,
    padding: '12px 12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflowY: 'auto',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  groupLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '8px 16px 4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: 500,
    width: '100%',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    flexShrink: 0,
    opacity: 0.9,
  },
  navLabel: {
    flex: 1,
    textAlign: 'left',
  },
  childrenContainer: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: '30px',
    marginTop: '1px',
    marginBottom: '2px',
  },
  childItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: 500,
    width: '100%',
    textAlign: 'left',
    borderRadius: '6px',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    color: 'rgba(255,255,255,0.65)',
  },
  childDot: {
    display: 'inline-block',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.4)',
    flexShrink: 0,
  },
  childLabel: {
    flex: 1,
  },
  bottomNav: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
};
