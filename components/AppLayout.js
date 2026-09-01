// components/AppLayout.js - UPDATED WITH EXPORT DASHBOARD LINK

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";

// ============================================================
// SIDEBAR ICONS
// ============================================================
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  UserPlus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
  ),
  UserCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
  ),
  UserX: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
  ),
  Clipboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
  ),
  CheckSquare: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  ),
  Layers: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
  Reports: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  ),
  Close: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
  ),
  History: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  Assessment: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
  ),
  Candidate: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  // 🆕 Export Icon
  Export: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
};

function getStoredRole() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("userSession");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.role || null;
  } catch (error) {
    console.error("Failed to parse stored session:", error);
    return null;
  }
}

function getDashboardHref(role) {
  if (role === "admin") return "/admin";
  if (role === "supervisor") return "/supervisor";
  if (role === "candidate") return "/candidate/dashboard";
  return "/login";
}

function getRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";
  if (role === "candidate") return "Candidate";
  return "Account";
}

function normalizeBackground(background) {
  if (!background) return "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)";
  if (String(background).startsWith("linear-gradient") || String(background).startsWith("radial-gradient")) return background;
  return "url(" + background + ") center/cover no-repeat";
}

// ============================================================
// PROPER ROUTE DETECTION FOR SUB-PAGES
// ============================================================
function isActiveRoute(pathname, href) {
  if (!pathname || !href) return false;
  
  // Exact match for main pages
  if (href === "/admin" && pathname === "/admin") return true;
  if (href === "/supervisor" && pathname === "/supervisor") return true;
  
  // Check if path starts with href for sub-pages
  if (href.startsWith("/supervisor/") && pathname.startsWith(href)) return true;
  if (href.startsWith("/admin/") && pathname.startsWith(href)) return true;
  
  // Check for query params (like ?tab=)
  if (href.includes("?tab=")) {
    const basePath = href.split("?")[0];
    if (pathname === basePath) {
      const currentTab = new URLSearchParams(window.location.search).get('tab');
      const targetTab = href.split("=")[1];
      if (currentTab === targetTab) return true;
    }
  }
  
  return pathname === href || pathname.startsWith(href + "/");
}

// ============================================================
// ROLE-BASED MENU SECTIONS - UPDATED WITH EXPORT DASHBOARD
// ============================================================
function getMenuSections(role) {
  // Admin menu
  if (role === 'admin') {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Icons.Dashboard(),
        href: '/admin',
        isMain: true,
      },
      {
        id: 'supervisors',
        label: 'Supervisors',
        icon: Icons.Users(),
        isSection: true,
        children: [
          { id: 'add-supervisor', label: 'Add Supervisor', icon: Icons.UserPlus(), href: '/admin/add-supervisor' },
          { id: 'manage-supervisors', label: 'Manage Supervisors', icon: Icons.UserCheck(), href: '/admin/manage-supervisors' },
          { id: 'assign-supervisors', label: 'Assign Supervisors', icon: Icons.UserX(), href: '/admin/assign-candidates' },
        ]
      },
      {
        id: 'candidates',
        label: 'Candidates',
        icon: Icons.Users(),
        isSection: true,
        children: [
          { id: 'manage-candidates', label: 'Manage Candidates', icon: Icons.UserCheck(), href: '/admin/manage-candidates' },
          { id: 'assign-assessments', label: 'Assign Assessments', icon: Icons.CheckSquare(), href: '/admin/assign-assessments' },
          { id: 'batch-manage', label: 'Batch Manage', icon: Icons.Layers(), href: '/admin/batch-manage' },
        ]
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: Icons.FileText(),
        isSection: true,
        children: [
          { id: 'assessment-reports', label: 'Assessment Reports', icon: Icons.FileText(), href: '/admin/reports' },
          // 🆕 Export Dashboard for Admin
          { id: 'export-dashboard', label: '📊 Export Dashboard', icon: Icons.Export(), href: '/admin/export-dashboard' },
        ]
      },
      {
        id: 'system',
        label: 'System',
        icon: Icons.Settings(),
        isSection: true,
        children: [
          { id: 'audit-logs', label: 'Audit Logs', icon: Icons.History(), href: '/admin/audit-logs' },
          { id: 'system-settings', label: 'System Settings', icon: Icons.Settings(), href: '/admin/system-settings' },
        ]
      }
    ];
  }

  // ============================================================
  // SUPERVISOR MENU - UPDATED WITH EXPORT DASHBOARD
  // ============================================================
  if (role === 'supervisor') {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Icons.Dashboard(),
        href: '/supervisor',
        isMain: true,
      },
      {
        id: 'my-candidates',
        label: 'My Candidates',
        icon: Icons.Users(),
        isSection: true,
        children: [
          // ✅ View Candidates → /supervisor/manage-candidate
          { id: 'view-candidates', label: 'View Candidates', icon: Icons.UserCheck(), href: '/supervisor/manage-candidate' },
          // ✅ Add Candidate → /supervisor/add-candidate
          { id: 'add-candidate', label: 'Add Candidate', icon: Icons.UserPlus(), href: '/supervisor/add-candidate' },
          // ✅ Assign Assessment → /supervisor/assign-assessment
          { id: 'assign-assessment', label: 'Assign Assessment', icon: Icons.CheckSquare(), href: '/supervisor/assign-assessment' },
          // ✅ Batch Manage → /supervisor/batch-manage
          { id: 'batch-manage', label: 'Batch Manage', icon: Icons.Layers(), href: '/supervisor/batch-manage' },
        ]
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: Icons.FileText(),
        isSection: true,
        children: [
          // ✅ National Service Reports → /supervisor/reports?tab=national
          { id: 'national-service', label: 'National Service Reports', icon: Icons.FileText(), href: '/supervisor/reports?tab=national' },
          // ✅ Other Assessment Reports → /supervisor/reports?tab=other
          { id: 'other-assessments', label: 'Other Assessment Reports', icon: Icons.Reports(), href: '/supervisor/reports?tab=other' },
          // 🆕 Export Dashboard → /supervisor/export-dashboard
          { id: 'export-dashboard', label: '📊 Export Dashboard', icon: Icons.Export(), href: '/supervisor/export-dashboard' },
        ]
      },
    ];
  }

  // Candidate menu
  if (role === 'candidate') {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Icons.Dashboard(),
        href: '/candidate/dashboard',
        isMain: true,
      },
      {
        id: 'assessments',
        label: 'My Assessments',
        icon: Icons.Assessment(),
        href: '/candidate/assessments',
        isMain: true,
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: Icons.Users(),
        href: '/candidate/profile',
        isMain: true,
      },
      {
        id: 'results',
        label: 'My Results',
        icon: Icons.FileText(),
        href: '/candidate/results',
        isMain: true,
      },
    ];
  }

  return [];
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
function Sidebar({ isOpen, toggleSidebar, currentPath, handleLogout, userRole }) {
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    supervisors: true,
    candidates: true,
    reports: true,
    system: true,
    'my-candidates': true,
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load expanded state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_expanded_sections');
      if (saved) {
        setExpandedSections(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Save expanded state to localStorage
  const toggleSection = (section) => {
    const newState = {
      ...expandedSections,
      [section]: !expandedSections[section]
    };
    setExpandedSections(newState);
    try {
      localStorage.setItem('sidebar_expanded_sections', JSON.stringify(newState));
    } catch (e) {
      // Ignore
    }
  };

  const menuSections = getMenuSections(userRole);

  // PROPER ACTIVE ROUTE DETECTION
  const isActive = (href) => {
    if (!currentPath) return false;
    
    // Exact match
    if (currentPath === href) return true;
    
    // Check if currentPath starts with href (for sub-pages)
    if (href !== '/supervisor' && currentPath.startsWith(href)) return true;
    
    // For '/supervisor' main page, only highlight if exactly '/supervisor'
    if (href === '/supervisor') {
      return currentPath === '/supervisor';
    }
    
    // For tab URLs
    if (href.includes('?tab=')) {
      const basePath = href.split('?')[0];
      if (currentPath === basePath) {
        const currentTab = new URLSearchParams(window.location.search).get('tab');
        const targetTab = href.split('=')[1];
        if (currentTab === targetTab) return true;
      }
    }
    
    return false;
  };

  // SECTION ACTIVE DETECTION
  const isSectionActive = (section) => {
    if (!section.children) return false;
    return section.children.some(child => {
      if (child.href === '/supervisor' && currentPath === '/supervisor') return true;
      if (child.href !== '/supervisor' && currentPath.startsWith(child.href)) return true;
      if (child.href.includes('?tab=')) {
        const basePath = child.href.split('?')[0];
        if (currentPath === basePath) {
          const currentTab = new URLSearchParams(window.location.search).get('tab');
          const targetTab = child.href.split('=')[1];
          if (currentTab === targetTab) return true;
        }
      }
      return isActive(child.href);
    });
  };

  return (
    <>
      {isOpen && isMobile && (
        <div 
          onClick={toggleSidebar}
          style={stylesSidebar.overlay}
        />
      )}

      <div style={{
        ...stylesSidebar.sidebar,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}>
        <div style={stylesSidebar.sidebarHeader}>
          <div style={stylesSidebar.logoArea}>
            <div style={stylesSidebar.logoIcon}>S</div>
            <span style={stylesSidebar.logoText}>Stratavax</span>
          </div>
          <button onClick={toggleSidebar} style={stylesSidebar.closeButton}>
            <Icons.Close />
          </button>
        </div>

        <nav style={stylesSidebar.nav}>
          {menuSections.map((item) => {
            // Main item (Dashboard, Profile, Assessments)
            if (item.isMain) {
              const active = isActive(item.href);
              return (
                <Link href={item.href} key={item.id} legacyBehavior>
                  <a
                    style={{
                      ...stylesSidebar.navItem,
                      background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      borderLeft: active ? '3px solid #2563EB' : '3px solid transparent',
                      marginBottom: '4px',
                    }}
                    onClick={() => {
                      if (window.innerWidth < 768) toggleSidebar();
                    }}
                  >
                    <span style={stylesSidebar.navIcon}>{item.icon}</span>
                    <span style={stylesSidebar.navLabel}>{item.label}</span>
                  </a>
                </Link>
              );
            }

            // Section with children
            if (item.isSection) {
              const isExpanded = expandedSections[item.id] !== false;
              const sectionActive = isSectionActive(item);

              return (
                <div key={item.id} style={stylesSidebar.sectionContainer}>
                  <button
                    onClick={() => toggleSection(item.id)}
                    style={{
                      ...stylesSidebar.sectionHeader,
                      background: sectionActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderLeft: sectionActive ? '3px solid #2563EB' : '3px solid transparent',
                    }}
                  >
                    <span style={stylesSidebar.navIcon}>{item.icon}</span>
                    <span style={stylesSidebar.sectionLabel}>{item.label}</span>
                    <span style={stylesSidebar.sectionChevron}>
                      {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={stylesSidebar.subNav}>
                      {item.children.map((child) => {
                        let href = child.href;
                        const childActive = isActive(child.href) || 
                          (child.href === '/supervisor' && currentPath === '/supervisor') ||
                          (currentPath.startsWith(child.href) && child.href !== '/supervisor');
                        
                        return (
                          <Link href={href} key={child.id} legacyBehavior>
                            <a
                              style={{
                                ...stylesSidebar.subNavItem,
                                background: childActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                borderLeft: childActive ? '3px solid #2563EB' : '3px solid transparent',
                              }}
                              onClick={() => {
                                if (window.innerWidth < 768) toggleSidebar();
                              }}
                            >
                              <span style={stylesSidebar.subNavIcon}>{child.icon}</span>
                              <span style={stylesSidebar.subNavLabel}>{child.label}</span>
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </nav>

        <div style={stylesSidebar.sidebarFooter}>
          <div style={stylesSidebar.userInfo}>
            <span style={stylesSidebar.userAvatar}>
              {userRole ? userRole.charAt(0).toUpperCase() : 'U'}
            </span>
            <span style={stylesSidebar.userName}>{getRoleLabel(userRole)}</span>
          </div>
          <button onClick={handleLogout} style={stylesSidebar.logoutBtn}>
            <Icons.Logout />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

const stylesSidebar = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '280px',
    height: '100vh',
    background: '#0F2747',
    color: 'white',
    zIndex: 1000,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: '#2563EB',
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
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      color: 'white',
    },
  },
  nav: {
    flex: 1,
    padding: '12px 12px 12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 16px 10px 20px',
    borderRadius: '8px 0 0 8px',
    textDecoration: 'none',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
    '&:hover': {
      background: 'rgba(255,255,255,0.08)',
      color: 'white',
    },
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
  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 16px 10px 20px',
    borderRadius: '8px 0 0 8px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s',
    width: '100%',
    textAlign: 'left',
    '&:hover': {
      background: 'rgba(255,255,255,0.06)',
      color: 'white',
    },
  },
  sectionLabel: {
    flex: 1,
    textAlign: 'left',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.5px',
    opacity: 0.7,
  },
  sectionChevron: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
  subNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingLeft: '8px',
  },
  subNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '8px 16px 8px 44px',
    borderRadius: '8px 0 0 8px',
    textDecoration: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 400,
    transition: 'all 0.2s',
    '&:hover': {
      background: 'rgba(255,255,255,0.06)',
      color: 'white',
    },
  },
  subNavIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    flexShrink: 0,
    opacity: 0.6,
  },
  subNavLabel: {
    flex: 1,
    textAlign: 'left',
  },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#2563EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
    '&:hover': {
      background: 'rgba(255,255,255,0.1)',
      color: 'white',
    },
  },
};

// ============================================================
// MAIN APPLAYOUT COMPONENT
// ============================================================
export default function AppLayout({ children, background, showNavigation = true }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(showNavigation);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function resolveRole() {
      try {
        const storedRole = getStoredRole();
        if (storedRole && mounted) {
          setUserRole(storedRole);
        }

        const { data } = await supabase.auth.getSession();
        const sessionRole = data?.session?.user?.user_metadata?.role || storedRole || null;

        if (mounted) {
          setUserRole(sessionRole);
          setLoading(false);
        }
      } catch (error) {
        console.error("AppLayout role check error:", error);
        if (mounted) {
          setUserRole(getStoredRole());
          setLoading(false);
        }
      }
    }

    if (!showNavigation) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    resolveRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUserRole(null);
        return;
      }

      if (session?.user) {
        setUserRole(session.user.user_metadata?.role || getStoredRole());
      }
    });

    return () => {
      mounted = false;
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, [showNavigation]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") localStorage.removeItem("userSession");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  }

  function getNavLinks() {
    if (userRole === "admin") {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/batch-manage", label: "Batch Manage" },
        { href: "/admin/add-candidate", label: "Add Candidate" }
      ];
    }

    if (userRole === "supervisor") {
      return [
        { href: "/supervisor", label: "Dashboard" },
        { href: "/supervisor/batch-manage", label: "Batch Manage" },
        { href: "/supervisor/add-candidate", label: "Add Candidate" }
      ];
    }

    if (userRole === "candidate") {
      return [
        { href: "/candidate/dashboard", label: "Dashboard" },
        { href: "/candidate/profile", label: "Profile" }
      ];
    }

    return [];
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const wrapperStyle = {
    minHeight: "100vh",
    background: normalizeBackground(background),
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed"
  };

  if (!showNavigation) {
    return <div style={wrapperStyle}>{children}</div>;
  }

  if (loading) {
    return (
      <div style={{ ...wrapperStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <div style={styles.loadingText}>Loading...</div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const navLinks = getNavLinks();
  const homeHref = getDashboardHref(userRole);
  const showSidebar = userRole === "admin" || userRole === "supervisor";

  return (
    <div style={wrapperStyle}>
      {showSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          currentPath={router.pathname}
          handleLogout={handleLogout}
          userRole={userRole}
        />
      )}

      <div style={{
        ...styles.mainContent,
        marginLeft: showSidebar ? (sidebarOpen ? '280px' : '0') : '0',
      }}>
        <header style={styles.navBar}>
          <div style={styles.navContainer}>
            <div style={styles.navLeft}>
              {showSidebar && (
                <button onClick={toggleSidebar} style={styles.menuButton}>
                  <Icons.Menu />
                </button>
              )}
              
              <Link href={homeHref} legacyBehavior>
                <a style={styles.logoLink}>
                  <img 
                    src="/images/stratavax-logo.png" 
                    alt="Stratavax" 
                    style={styles.logoImage}
                  />
                  <span style={styles.logoText}>Stratavax</span>
                </a>
              </Link>

              {navLinks.length > 0 && (
                <nav style={styles.navLinks}>
                  {navLinks.map((link) => {
                    const active = isActiveRoute(router.pathname, link.href);
                    return (
                      <Link key={link.href} href={link.href} legacyBehavior>
                        <a style={{ ...styles.navLink, ...(active ? styles.navLinkActive : {}) }}>
                          {link.label}
                        </a>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <div style={styles.navRight}>
              <span style={styles.userRole}>{getRoleLabel(userRole)}</span>
              <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
            </div>
          </div>
        </header>

        <main style={styles.content}>{children}</main>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  mainContent: {
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
  },
  navBar: {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  navContainer: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px"
  },
  navLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },
  menuButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#1a202c",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none"
  },
  logoImage: {
    height: "36px",
    width: "36px",
    objectFit: "contain"
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0a1929",
    letterSpacing: "1px"
  },
  navLinks: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  navLink: {
    color: "#475569",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 600,
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "all 0.2s",
    cursor: "pointer"
  },
  navLinkActive: {
    background: "#0a1929",
    color: "white"
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  userRole: {
    fontSize: "13px",
    padding: "6px 12px",
    background: "#e2e8f0",
    borderRadius: "20px",
    color: "#475569",
    fontWeight: 600
  },
  logoutButton: {
    padding: "8px 18px",
    background: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600
  },
  content: {
    minHeight: "calc(100vh - 64px)",
    padding: "0",
  },
  loadingCard: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: "16px",
    padding: "28px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
  },
  spinner: {
    width: "42px",
    height: "42px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #0a1929",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 14px"
  },
  loadingText: {
    color: "#334155",
    fontWeight: 600
  }
};
