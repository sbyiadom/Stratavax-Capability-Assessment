// components/AppLayout.js
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";

export default function AppLayout({ children, background, showNavigation = true }) {
  const router = useRouter();

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
            <Link href="/supervisor" style={styles.logo}>
              🏢 Stratavax
            </Link>
            <div style={styles.navLinks}>
              <Link href="/supervisor" style={{
                ...styles.navLink,
                ...(router.pathname === "/supervisor" ? styles.navLinkActive : {})
              }}>
                📊 Dashboard
              </Link>
              <Link href="/supervisor/batch-manage" style={{
                ...styles.navLink,
                ...(router.pathname === "/supervisor/batch-manage" ? styles.navLinkActive : {})
              }}>
                📋 Batch Manage
              </Link>
              <Link href="/supervisor/add-candidate" style={{
                ...styles.navLink,
                ...(router.pathname === "/supervisor/add-candidate" ? styles.navLinkActive : {})
              }}>
                👤 Add Candidate
              </Link>
            </div>
          </div>
          <div style={styles.navRight}>
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
