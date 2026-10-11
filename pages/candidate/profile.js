// pages/candidate/profile.js
// Candidate profile page — redesigned to match the dashboard.
// - Left sidebar navigation (CandidateSidebar)
// - Layered background: blurred image + navy vignette overlay
// - Centered glassmorphic profile card
// - Top bar with breadcrumb + profile chip
// - Footer with Privacy / Terms / Support links
//
// Business logic (fetch, save, validation, dropdowns) is unchanged.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../supabase/client";
import { useRequireAuth } from "../../utils/requireAuth";
import CandidateSidebar, { MobileMenuButton } from "../../components/CandidateSidebar";

export default function CandidateProfile() {
  const { session, loading: authLoading } = useRequireAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    university: "",
    programme: "",
    graduation_year: "",
    preferred_department: "",
  });

  const [currentYear] = useState(new Date().getFullYear());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [viewport, setViewport] = useState({ isMobile: false, isTablet: false });

  // ---------- Responsive ----------
  useEffect(() => {
    function update() {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      setViewport({ isMobile: w < 768, isTablet: w >= 768 && w < 1024 });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/candidate/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to load profile (HTTP ${response.status}).`);
      }

      const data = payload.profile || {};
      setProfile({
        full_name: data.full_name || "",
        email: data.email || "",
        university: data.university || "",
        programme: data.programme || "",
        graduation_year: data.graduation_year || "",
        preferred_department: data.preferred_department || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: error.message || "Failed to load profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          university: profile.university,
          programme: profile.programme,
          graduation_year: profile.graduation_year,
          preferred_department: profile.preferred_department,
        }),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to save profile (HTTP ${response.status}).`);
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to save profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sidebarWidth = viewport.isMobile ? 0 : viewport.isTablet ? 72 : 260;

  // ---------- Loading ----------
  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingOverlay} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your profile...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div style={styles.pageContainer}>
      {/* Sidebar */}
      <CandidateSidebar
        userName={profile.full_name || "Candidate"}
        userEmail={session?.user?.email || ""}
        onSignOut={handleSignOut}
        activePath="/candidate/profile"
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main column */}
      <div style={{ ...styles.mainColumn, marginLeft: sidebarWidth }}>
        <div style={styles.pageBackground} />
        <div style={styles.pageOverlay} />

        <div style={styles.content}>
          {/* Top bar */}
          <header style={styles.topBar}>
            <div style={styles.topBarLeft}>
              {viewport.isMobile && (
                <MobileMenuButton
                  onClick={() => setMobileNavOpen(true)}
                  visible={true}
                />
              )}
              <div>
                <h1 style={styles.pageTitle}>Profile</h1>
                <div style={styles.breadcrumb}>
                  <span>Candidate Portal</span>
                  <span style={styles.breadcrumbSep}>/</span>
                  <span style={styles.breadcrumbActive}>Profile</span>
                </div>
              </div>
            </div>
            <div style={styles.topBarRight}>
              <Link href="/candidate/profile" style={styles.profileChip}>
                <span style={styles.profileChipAvatar}>
                  {(profile.full_name || "C").charAt(0).toUpperCase()}
                </span>
                <span style={styles.profileChipName}>
                  {profile.full_name || "Candidate"}
                </span>
              </Link>
            </div>
          </header>

          {/* Card */}
          <div style={styles.cardWrapper}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>My Profile</h2>
                  <p style={styles.cardSubtitle}>Update your personal information</p>
                </div>
                <div style={styles.cardAvatar}>
                  {(profile.full_name || "C").charAt(0).toUpperCase()}
                </div>
              </div>

              {message && (
                <div
                  style={{
                    ...styles.message,
                    background:
                      message.type === "success"
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                    borderColor:
                      message.type === "success"
                        ? "rgba(34, 197, 94, 0.3)"
                        : "rgba(239, 68, 68, 0.3)",
                    color: message.type === "success" ? "#166534" : "#991b1b",
                  }}
                >
                  <span style={styles.messageIcon}>
                    {message.type === "success" ? "✓" : "!"}
                  </span>
                  <span>{message.text}</span>
                </div>
              )}

              <div style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter your full name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Email <span style={styles.lockedTag}>Locked</span>
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    style={{ ...styles.input, ...styles.inputDisabled }}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>University / Institution</label>
                  <input
                    type="text"
                    name="university"
                    value={profile.university}
                    onChange={handleChange}
                    placeholder="Enter your university name"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Programme of Study</label>
                  <input
                    type="text"
                    name="programme"
                    value={profile.programme}
                    onChange={handleChange}
                    placeholder="e.g., BSc Computer Science"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Graduation Year</label>
                    <select
                      name="graduation_year"
                      value={profile.graduation_year}
                      onChange={handleChange}
                      style={styles.input}
                    >
                      <option value="">Select graduation year</option>
                      {[2024, 2025, 2026, 2027, 2028].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Preferred Department</label>
                    <select
                      name="preferred_department"
                      value={profile.preferred_department}
                      onChange={handleChange}
                      style={styles.input}
                    >
                      <option value="">Select preferred department</option>
                      <option value="Operations & Production">Operations &amp; Production</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="Supply Chain & Logistics">Supply Chain &amp; Logistics</option>
                      <option value="Technical Services">Technical Services</option>
                      <option value="Administration">Administration</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales & Marketing">Sales &amp; Marketing</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.6 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer style={styles.footer}>
            <div style={styles.footerContent}>
              <div style={styles.footerLeft}>
                <span style={styles.footerBrand}>Stratavax</span>
                <span style={styles.footerDivider}>|</span>
                <span style={styles.footerText}>Talent Assessment Platform</span>
              </div>
              <div style={styles.footerCenter}>
                <span style={styles.footerText}>
                  © {currentYear} Stratavax. All rights reserved.
                </span>
              </div>
              <div style={styles.footerRight}>
                <Link href="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                <span style={styles.footerDot}>•</span>
                <Link href="/terms" style={styles.footerLink}>Terms of Service</Link>
                <span style={styles.footerDot}>•</span>
                <Link href="/support" style={styles.footerLink}>Support</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  // ---------- Page ----------
  pageContainer: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
  },
  mainColumn: {
    position: "relative",
    minHeight: "100vh",
    transition: "margin-left 200ms ease",
    overflow: "hidden",
  },
  pageBackground: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: "url(/images/dashboard1-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    zIndex: 0,
    pointerEvents: "none",
    filter: "blur(2px) saturate(1.05)",
    transform: "scale(1.03)",
  },
  pageOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background:
      "linear-gradient(180deg, rgba(10, 25, 41, 0.28) 0%, rgba(10, 25, 41, 0.14) 35%, rgba(10, 25, 41, 0.32) 100%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "24px 32px 0",
    boxSizing: "border-box",
    maxWidth: 1440,
    margin: "0 auto",
  },

  // ---------- Loading ----------
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    background: "#0a1929",
  },
  loadingBackground: {
    position: "absolute", inset: 0,
    backgroundImage: "url(/images/loading-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.7)",
    zIndex: 0,
  },
  loadingOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(180deg, rgba(10,25,41,0.6), rgba(10,25,41,0.85))",
    zIndex: 0,
  },
  loadingContent: {
    position: "relative",
    textAlign: "center",
    color: "white",
    zIndex: 1,
    textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  },
  loadingLogo: {
    fontSize: 32, fontWeight: 700, marginBottom: 20,
    letterSpacing: 2, color: "white",
  },
  loadingSpinner: {
    width: 50, height: 50,
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
  loadingText: { fontSize: 16, opacity: 0.9 },

  // ---------- Top bar ----------
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 16, padding: "16px 20px",
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: "0 1px 3px rgba(10, 25, 41, 0.08)",
    marginBottom: 20, flexWrap: "wrap",
  },
  topBarLeft: { display: "flex", alignItems: "center", gap: 14 },
  topBarRight: { display: "flex", alignItems: "center", gap: 10 },
  pageTitle: {
    fontSize: 22, fontWeight: 700, color: "#0a1929",
    margin: 0, letterSpacing: "-0.01em",
  },
  breadcrumb: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, color: "#94a3b8", marginTop: 2,
  },
  breadcrumbSep: { color: "#cbd5e1" },
  breadcrumbActive: { color: "#334155", fontWeight: 500 },
  profileChip: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 14px 6px 6px",
    background: "rgba(10, 25, 41, 0.04)",
    border: "1px solid rgba(10, 25, 41, 0.06)",
    borderRadius: 50, textDecoration: "none",
    color: "#0a1929", fontSize: 13, fontWeight: 500,
  },
  profileChipAvatar: {
    width: 28, height: 28, borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white", fontWeight: 700, fontSize: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  profileChipName: {
    maxWidth: 140, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap",
  },

  // ---------- Card ----------
  cardWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
    flex: 1,
  },
  card: {
    maxWidth: 720,
    width: "100%",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    padding: "32px 36px",
    borderRadius: 18,
    border: "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: "0 8px 40px rgba(10, 25, 41, 0.12)",
    animation: "fadeIn 0.4s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: "1px solid rgba(10, 25, 41, 0.06)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0a1929",
    margin: "0 0 4px 0",
    letterSpacing: "-0.01em",
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: "#64748b",
    margin: 0,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white",
    fontWeight: 700,
    fontSize: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 16px rgba(79, 70, 229, 0.35)",
  },

  // ---------- Messages ----------
  message: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 13.5,
    fontWeight: 500,
    border: "1px solid",
  },
  messageIcon: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },

  // ---------- Form ----------
  form: { display: "flex", flexDirection: "column", gap: 18 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#334155",
    letterSpacing: "0.01em",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  lockedTag: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#64748b",
    background: "rgba(148, 163, 184, 0.15)",
    padding: "2px 6px",
    borderRadius: 4,
  },
  input: {
    padding: "11px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    background: "white",
    color: "#0a1929",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  inputDisabled: {
    background: "#f1f5f9",
    color: "#64748b",
    cursor: "not-allowed",
  },

  // ---------- Actions ----------
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 20,
    borderTop: "1px solid rgba(10, 25, 41, 0.06)",
  },
  saveButton: {
    padding: "12px 32px",
    background: "linear-gradient(135deg, #1a237e, #4f46e5)",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(26, 35, 126, 0.25)",
    transition: "transform 150ms ease, box-shadow 150ms ease",
  },

  // ---------- Footer ----------
  footer: {
    marginTop: "auto",
    padding: "20px 0 24px",
    borderTop: "1px solid rgba(10, 25, 41, 0.06)",
  },
  footerContent: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", gap: 12, flexWrap: "wrap",
  },
  footerLeft: { display: "flex", alignItems: "center", gap: 8 },
  footerBrand: { fontSize: 13, fontWeight: 700, color: "#0a1929" },
  footerDivider: { color: "#cbd5e1" },
  footerText: { fontSize: 12, color: "#64748b" },
  footerCenter: { display: "flex", alignItems: "center", gap: 8 },
  footerRight: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
  },
  footerLink: {
    fontSize: 12, color: "#475569", textDecoration: "none",
  },
  footerDot: { fontSize: 12, color: "#cbd5e1" },
};
