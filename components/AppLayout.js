// components/AppLayout.js - WITH PERSISTENT SIDEBAR AND TOP NAV

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
  Reports: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
  Assessment: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
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

function isActiveRoute(pathname, href) {
  if (!pathname || !href) return false;
  if (href === "/admin") return pathname === "/admin";
  if (href === "/supervisor") return pathname === "/supervisor";
  return pathname === href || pathname.startsWith(href + "/");
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
function Sidebar({ isOpen, toggleSidebar, currentPath, handleLogout, userRole }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard(), href: '/admin' },
    { id: 'candidates', label: 'Candidates', icon: Icons.Users(), href: '/admin/manage-candidates' },
    { id: 'reports', label: 'Reports', icon: Icons.Reports(), href: '/admin/reports' },
    { id: 'assessments', label: 'Assessments', icon: Icons.Assessment(), href: '/admin/assign-assessments' },
    { id: 'settings', label: 'Settings', icon: Icons.Settings(), href: '/admin/system-settings' },
  ];

  const isActive = (href) => {
    if (href === '/admin' && currentPath === '/admin') return true;
    if (href !== '/admin' && currentPath.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          style={stylesSidebar.overlay}
        />
      )}

      {/* Sidebar */}
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
          {menuItems.map((item) => (
            <Link href={item.href} key={item.id} legacyBehavior>
              <a
                style={{
                  ...stylesSidebar.navItem,
                  background: isActive(item.href) ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: isActive(item.href) ? '3px solid #2563EB' : '3px solid transparent',
                }}
                onClick={() => {
                  if (window.innerWidth < 768) toggleSidebar();
                }}
              >
                <span style={stylesSidebar.navIcon}>{item.icon}</span>
                <span style={stylesSidebar.navLabel}>{item.label}</span>
              </a>
            </Link>
          ))}
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
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    backdropFilter: 'blur(4px)',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '260px',
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
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 16px',
    borderRadius: '8px',
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
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
        { href: "/supervisor/batch-manage", label: "Batch Manage" }
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
  const isAdmin = userRole === "admin";

  return (
    <div style={wrapperStyle}>
      {/* Sidebar - Only for admin */}
      {isAdmin && (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          currentPath={router.pathname}
          handleLogout={handleLogout}
          userRole={userRole}
        />
      )}

      {/* Main Content */}
      <div style={{
        ...styles.mainContent,
        marginLeft: isAdmin ? (sidebarOpen ? '260px' : '0') : '0',
      }}>
        {/* Top Navigation Bar */}
        <header style={styles.navBar}>
          <div style={styles.navContainer}>
            <div style={styles.navLeft}>
              {isAdmin && (
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
