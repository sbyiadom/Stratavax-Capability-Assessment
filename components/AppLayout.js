// components/AppLayout.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";

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
  if (role === "admin") return "👑 Admin";
  if (role === "supervisor") return "👔 Supervisor";
  if (role === "candidate") return "👤 Candidate";
  return "Account";
}

function normalizeBackground(background) {
  if (!background) return "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
  if (String(background).startsWith("linear-gradient") || String(background).startsWith("radial-gradient")) return background;
  return "url(" + background + ") center/cover no-repeat";
}

function isActiveRoute(pathname, href) {
  if (!pathname || !href) return false;
  if (href === "/admin") return pathname === "/admin";
  if (href === "/supervisor") return pathname === "/supervisor";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppLayout({ children, background, showNavigation = true }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(showNavigation);

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
        { href: "/admin", label: "📊 Dashboard" },
        { href: "/admin/batch-manage", label: "📋 Batch Manage" },
        { href: "/admin/add-candidate", label: "👤 Add Candidate" }
      ];
    }

    if (userRole === "supervisor") {
      return [
        { href: "/supervisor", label: "📊 Dashboard" },
        { href: "/supervisor/batch-manage", label: "📋 Batch Manage" }
      ];
    }

    if (userRole === "candidate") {
      return [
        { href: "/candidate/dashboard", label: "📋 Dashboard" },
        { href: "/candidate/profile", label: "👤 Profile" }
      ];
    }

    return [];
  }

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

  return (
    <div style={wrapperStyle}>
      <header style={styles.navBar}>
        <div style={styles.navContainer}>
          <div style={styles.navLeft}>
            <Link href={homeHref} legacyBehavior>
              <a style={styles.logo}>🏢 Stratavax</a>
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
    gap: "28px",
    flexWrap: "wrap"
  },
  logo: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0a1929",
    textDecoration: "none",
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
    minHeight: "calc(100vh - 64px)"
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
