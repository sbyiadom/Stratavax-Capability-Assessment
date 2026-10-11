// components/CandidateSidebar.js
// Candidate-facing left sidebar navigation.
// - Desktop (≥1024px): fixed 260px sidebar
// - Tablet (768–1023px): icon-only 72px sidebar with tooltips
// - Mobile (<768px): off-canvas overlay with backdrop
//
// The parent owns sign-out. Pass `onSignOut`.
// Email is read from the parent (typically session.user.email).

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

// ============================================================
// Inline SVG icons (no dependency)
// ============================================================
const Icon = {
  Grid: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Clipboard: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
      <path d="M16 6h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  Chart: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <path d="M3 20h18" />
      <rect x="5" y="12" width="3.5" height="8" rx="1" />
      <rect x="10.5" y="8" width="3.5" height="12" rx="1" />
      <rect x="16" y="4" width="3.5" height="16" rx="1" />
    </svg>
  ),
  User: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Shield: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
      <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
    </svg>
  ),
  Help: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.3" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  Logout: (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M15 12H5" />
    </svg>
  ),
  Close: (props) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Menu: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
};

// ============================================================
// Nav structure
// ============================================================
const NAV_SECTIONS = [
  {
    label: "MAIN",
    items: [
      { key: "dashboard", label: "Dashboard",      href: "/candidate/dashboard", icon: "Grid",      exact: true  },
      { key: "assessments", label: "My Assessments", href: "/assessment",          icon: "Clipboard", exact: false },
      { key: "results",     label: "Results",        href: "/candidate/results",   icon: "Chart",     exact: false, disabled: true, disabledNote: "Coming soon" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { key: "profile", label: "Profile",         href: "/candidate/profile", icon: "User",   exact: false },
      { key: "privacy", label: "Privacy & Data",  href: "/candidate/privacy", icon: "Shield", exact: false },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { key: "help", label: "Help", href: "/support", icon: "Help", exact: false },
    ],
  },
];

function isActive(activePath, item) {
  if (!activePath) return false;
  if (item.exact) return activePath === item.href;
  return activePath === item.href || activePath.startsWith(item.href + "/");
}

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ============================================================
// Public: MobileMenuButton — parent renders this in its top bar
// ============================================================
export function MobileMenuButton({ onClick, visible = true }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Open navigation"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40, height: 40,
        borderRadius: 10,
        background: "rgba(10, 25, 41, 0.06)",
        border: "1px solid rgba(10, 25, 41, 0.1)",
        color: "#0a1929",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <Icon.Menu />
    </button>
  );
}

// ============================================================
// CandidateSidebar
// ============================================================
export default function CandidateSidebar({
  userName = "Candidate",
  userEmail = "",
  onSignOut,
  activePath,
  mobileOpen = false,
  onCloseMobile,
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ---------- Responsive breakpoint tracking ----------
  useEffect(() => {
    function update() {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ---------- Auto-close mobile drawer on route change ----------
  useEffect(() => {
    if (isMobile && mobileOpen && onCloseMobile) onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  // ---------- Auto-collapse on tablet ----------
  useEffect(() => {
    setCollapsed(isTablet);
  }, [isTablet]);

  // ---------- Effective path fallback ----------
  const path = activePath || (router ? router.pathname : "");
  const effectiveCollapsed = isMobile ? false : collapsed;

  // ---------- Sidebar body ----------
  const sidebarBody = (
    <aside
      style={{
        ...styles.sidebar,
        width: effectiveCollapsed ? 72 : 260,
      }}
    >
      {/* Brand */}
      <div
        style={{
          ...styles.brand,
          justifyContent: effectiveCollapsed ? "center" : "flex-start",
          padding: effectiveCollapsed ? "20px 0" : "20px 20px",
        }}
      >
        <Link
          href="/candidate/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "white",
          }}
        >
          <div style={styles.brandMark}>
            <Image
              src="/images/stratavax-logo.png"
              alt="Stratavax"
              width={28}
              height={28}
              priority
            />
          </div>
          {!effectiveCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={styles.brandTitle}>STRATAVAX</span>
              <span style={styles.brandSub}>Assessment Portal</span>
            </div>
          )}
        </Link>

        {isMobile && onCloseMobile && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            style={styles.closeBtn}
          >
            <Icon.Close />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={styles.navSection}>
            {!effectiveCollapsed && (
              <div style={styles.navSectionLabel}>{section.label}</div>
            )}
            {section.items.map((item) => {
              const active = !item.disabled && isActive(path, item);
              const IconCmp = Icon[item.icon];
              const content = (
                <>
                  <span
                    style={{
                      ...styles.navIcon,
                      color: active
                        ? "#ffd700"
                        : item.disabled
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {IconCmp ? <IconCmp /> : null}
                  </span>
                  {!effectiveCollapsed && (
                    <span
                      style={{
                        ...styles.navLabel,
                        color: active
                          ? "white"
                          : item.disabled
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(255,255,255,0.75)",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                  {!effectiveCollapsed && item.disabled && (
                    <span style={styles.soonTag}>{item.disabledNote}</span>
                  )}
                  {active && !effectiveCollapsed && (
                    <span style={styles.activeBar} />
                  )}
                </>
              );

              const sharedStyle = {
                ...styles.navItem,
                justifyContent: effectiveCollapsed ? "center" : "flex-start",
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                cursor: item.disabled ? "not-allowed" : "pointer",
                opacity: item.disabled ? 0.7 : 1,
              };

              if (item.disabled) {
                return (
                  <div
                    key={item.key}
                    style={sharedStyle}
                    title={effectiveCollapsed ? `${item.label} — ${item.disabledNote}` : undefined}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  style={sharedStyle}
                  title={effectiveCollapsed ? item.label : undefined}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User block */}
      <div
        style={{
          ...styles.userBlock,
          padding: effectiveCollapsed ? "14px 0" : "14px 16px",
          alignItems: effectiveCollapsed ? "center" : "stretch",
        }}
      >
        {!effectiveCollapsed ? (
          <>
            <div style={styles.userRow}>
              <div style={styles.avatar}>{initials(userName)}</div>
              <div style={styles.userMeta}>
                <div style={styles.userName} title={userName}>{userName}</div>
                {userEmail ? (
                  <div style={styles.userEmail} title={userEmail}>{userEmail}</div>
                ) : null}
              </div>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                style={styles.signOutBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                }}
              >
                <Icon.Logout />
                <span>Sign Out</span>
              </button>
            )}
          </>
        ) : (
          <div
            style={styles.avatar}
            title={`${userName}${userEmail ? " — " + userEmail : ""}`}
          >
            {initials(userName)}
          </div>
        )}
      </div>
    </aside>
  );

  // ---------- Mobile: off-canvas + backdrop ----------
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            onClick={onCloseMobile}
            style={styles.backdrop}
            aria-hidden="true"
          />
        )}
        <div
          style={{
            ...styles.mobileWrapper,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          }}
          aria-hidden={!mobileOpen}
        >
          {sidebarBody}
        </div>
      </>
    );
  }

  // ---------- Desktop / tablet: fixed ----------
  return sidebarBody;
}

// ============================================================
// Styles
// ============================================================
const styles = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    background:
      "linear-gradient(180deg, #0a1929 0%, #0f172a 55%, #1a237e 100%)",
    color: "white",
    zIndex: 40,
    boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
    transition: "width 200ms ease",
    overflow: "hidden",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    minHeight: 68,
    gap: 8,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "white",
  },
  brandSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.04em",
    marginTop: 2,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white",
    width: 36,
    height: 36,
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 0",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  navSection: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 10px",
  },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.35)",
    padding: "8px 10px 6px",
  },
  navItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 10,
    textDecoration: "none",
    transition: "background 150ms ease",
    overflow: "hidden",
    minHeight: 42,
  },
  navIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 20,
    transition: "color 150ms ease",
  },
  navLabel: {
    fontSize: 13.5,
    fontWeight: 500,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    flex: 1,
    transition: "color 150ms ease",
  },
  soonTag: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(255,215,0,0.85)",
    background: "rgba(255,215,0,0.1)",
    border: "1px solid rgba(255,215,0,0.2)",
    padding: "2px 6px",
    borderRadius: 4,
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    background: "#ffd700",
    borderRadius: "0 3px 3px 0",
  },
  userBlock: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "rgba(0,0,0,0.18)",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white",
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.4)",
    letterSpacing: "0.02em",
  },
  userMeta: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: "white",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userEmail: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginTop: 1,
  },
  signOutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "9px 12px",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 150ms ease",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 25, 41, 0.55)",
    backdropFilter: "blur(2px)",
    zIndex: 39,
    animation: "fadeIn 150ms ease",
  },
  mobileWrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    zIndex: 40,
    transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform",
  },
};
