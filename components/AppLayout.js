// components/AppLayout.js
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";
import { useEffect, useState } from "react";

export default function AppLayout({ children, background, showNavigation = true }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user role from localStorage or session
    const session = localStorage.getItem("userSession");
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        setUserRole(sessionData.role);
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  };

  // Don't show navigation on login/register pages
  if (!showNavigation) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `url(${background}) center/cover no-repeat`,
          padding: 20,
        }}
      >
        {children}
      </div>
    );
  }

  // Determine which navigation items to show based on role
  const getNavLinks = () => {
    const links = [];

    if (userRole === "admin") {
      links.push(
        { href: "/admin", label: "📊 Dashboard", active: router.pathname === "/admin" },
        { href: "/admin/batch-manage", label: "📋 Batch Manage", active: router.pathname === "/admin/batch-manage" },
        { href: "/admin/add-candidate", label: "👤 Add Candidate", active: router.pathname === "/admin/add-candidate" }
      );
    } 
    else if (userRole === "supervisor") {
      links.push(
        { href: "/supervisor", label: "📊 Dashboard", active: router.pathname === "/supervisor" },
        { href: "/supervisor/batch-manage", label: "📋 Batch Manage", active: router.pathname === "/supervisor/batch-manage" }
        // NOTE: Add Candidate is NOT shown for supervisors — only admins
      );
    }
    else if (userRole === "candidate") {
      links.push(
        { href: "/candidate/dashboard", label: "📋 My Dashboard", active: router.pathname === "/candidate/dashboard" },
        { href: "/candidate/tests", label: "📝 My Tests", active: router.pathname === "/candidate/tests" },
        { href: "/candidate/results", label: "📊 My Results", active: router.pathname === "/candidate/results" }
      );
    }

    return links;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: `url(${background}) center/cover no-repeat`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `url(${background}) center/cover no-repeat`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Navigation Bar */}
      <div style={styles.navBar}>
        <div style={styles.navContainer}>
          <div style={styles.navLeft}>
            <Link href={userRole === "candidate" ? "/candidate/dashboard" : (userRole === "admin" ? "/admin" : "/supervisor")} style={styles.logo}>
              🏢 Stratavax
            </Link>
            <div style={styles.navLinks}>
              {getNavLinks().map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  style={{
                    ...styles.navLink,
                    ...(link.active ? styles.navLinkActive : {})
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={styles.navRight}>
            <span style={styles.userRole}>
              {userRole === "admin" ? "👑 Admin" : userRole === "supervisor" ? "👔 Supervisor" : "👤 Candidate"}
            </span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}

const styles = {
  navBar: {
    background: "rgba(255, 255, 255, 0.95)",
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
    gap: "30px",
    flexWrap: "wrap"
  },
  logo: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0A1929",
    textDecoration: "none",
    letterSpacing: "1px"
  },
  navLinks: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap"
  },
  navLink: {
    color: "#475569",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "all 0.2s",
    cursor: "pointer",
    ':hover': {
      background: "#F1F5F9",
      color: "#0A1929"
    }
  },
  navLinkActive: {
    background: "#0A1929",
    color: "white",
    ':hover': {
      background: "#1A2A3A",
      color: "white"
    }
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "15px"
  },
  userRole: {
    fontSize: "13px",
    padding: "6px 12px",
    background: "#E2E8F0",
    borderRadius: "20px",
    color: "#475569",
    fontWeight: 500
  },
  logoutButton: {
    padding: "8px 20px",
    background: "#F44336",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s",
    ':hover': {
      background: "#D32F2F"
    }
  },
  content: {
    padding: "20px",
    minHeight: "calc(100vh - 64px)"
  }
};
