// components/AdminSidebar.js
// Shared admin sidebar. Renders for role === 'admin' only.
// Active item is derived from router.pathname — always accurate,
// whether you clicked a link or navigated directly to a URL.

import Link from 'next/link';
import { useRouter } from 'next/router';

const COLORS = {
  accent: '#2563EB',
  sidebarBg: '#0F2747',
  sidebarHover: '#1a3a6b',
};

// ============================================================
// MENU ITEMS
// ============================================================
const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    )
  },
  {
    id: 'candidates',
    label: 'Candidates',
    href: '/admin/manage-candidates',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/admin/reports',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    )
  },
  {
    id: 'assessments',
    label: 'Assessments',
    href: '/admin/assign-assessments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    )
  },
  {
    id: 'question-bank',
    label: 'Question Bank',
    href: '/admin/question-bank',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="6" rx="2"/><rect x="3" y="11" width="18" height="6" rx="2"/><line x1="7" y1="17" x2="7" y2="21"/><line x1="17" y1="17" x2="17" y2="21"/></svg>
    )
  },
  {
    id: 'assessment-builder',
    label: 'Assessment Builder',
    href: '/admin/assessments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    )
  },
  {
    id: 'templates',
    label: 'Templates',
    href: '/admin/templates',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
    )
  },
  {
    id: 'roles',
    label: 'Roles',
    href: '/admin/roles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/admin/system-settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
    )
  },
];

// ============================================================
// ACTIVE-ITEM DERIVATION FROM URL
// ------------------------------------------------------------
// Rules:
//   • exact match wins (e.g. '/admin' for dashboard)
//   • otherwise, the longest href that is a prefix of the pathname wins
//     (so '/admin/templates' highlights Templates, not Dashboard)
// ============================================================
function getActiveId(pathname) {
  if (!pathname) return null;

  // exact match for the dashboard or any menu item
  const exact = menuItems.find((m) => m.href === pathname);
  if (exact) return exact.id;

  // longest-prefix match
  let best = null;
  let bestLen = 0;
  for (const m of menuItems) {
    if (m.href === '/admin') continue; // don't let '/admin' match everything
    if (pathname === m.href || pathname.startsWith(m.href + '/')) {
      if (m.href.length > bestLen) {
        best = m;
        bestLen = m.href.length;
      }
    }
  }
  return best ? best.id : null;
}

// ============================================================
// COMPONENT
// ============================================================
export default function AdminSidebar({ isOpen, toggleSidebar, handleLogout, userRole }) {
  const router = useRouter();

  // Render only for admin
  if (userRole !== 'admin') return null;

  const activeId = getActiveId(router.pathname);

  const handleNavigation = (item) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && toggleSidebar) {
      toggleSidebar();
    }
    router.push(item.href);
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
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item)}
            style={{
              ...stylesSidebar.navItem,
              backgroundColor: activeId === item.id ? COLORS.sidebarHover : 'transparent',
              borderLeft: activeId === item.id
                ? `3px solid ${COLORS.accent}`
                : '3px solid transparent',
            }}
          >
            <span style={stylesSidebar.navIcon}>{item.icon}</span>
            <span style={stylesSidebar.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={stylesSidebar.bottomNav}>
        <button onClick={handleLogout} style={stylesSidebar.navItem}>
          <span style={stylesSidebar.navIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    width: '100%',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    textAlign: 'left',
  },
  bottomNav: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
};
