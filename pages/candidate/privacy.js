// pages/candidate/privacy.js
// Candidate-facing privacy page — redesigned to match dashboard/profile.
//
// - Left sidebar navigation (CandidateSidebar)
// - Layered background: blurred image + navy vignette overlay
// - Three request type cards (Access / Correction / Deletion)
// - Submission via POST /api/privacy/request
// - History list via GET /api/privacy/requests (server-side, RLS-safe)
// - Pending request banner
// - Retention policy info note
// - Top bar, footer, mobile responsive

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";
import CandidateSidebar, { MobileMenuButton } from "../../components/CandidateSidebar";

// ============================================================
// CONFIG
// ============================================================
const REQUEST_TYPES = [
  {
    value: "access",
    title: "Access my data",
    description:
      "Receive a complete copy of everything we hold about you: your profile, assessment results, competency scores, and responses.",
    turnaround: "Delivered within 7 days",
    icon: "📄",
  },
  {
    value: "correction",
    title: "Correct my data",
    description:
      "Request that inaccurate personal information (name, phone, university, programme, etc.) be corrected. Assessment scores are only corrected where a genuine data error occurred.",
    turnaround: "Reviewed within 14 days",
    icon: "✎",
  },
  {
    value: "deletion",
    title: "Delete my data",
    description:
      "Request that your personal data be removed. Your profile, responses, and session history are deleted or anonymized. Aggregate scores may be retained in anonymized form for platform analytics.",
    turnaround: "Processed within 30 days",
    icon: "🗑",
  },
];

const STATUS_LABELS = {
  pending:   { label: "Pending Review", bg: "rgba(245, 158, 11, 0.15)", fg: "#d97706" },
  in_review: { label: "In Review",      bg: "rgba(59, 130, 246, 0.15)", fg: "#2563eb" },
  approved:  { label: "Approved",       bg: "rgba(34, 197, 94, 0.15)",  fg: "#16a34a" },
  completed: { label: "Completed",      bg: "rgba(34, 197, 94, 0.15)",  fg: "#16a34a" },
  rejected:  { label: "Rejected",       bg: "rgba(220, 38, 38, 0.15)",  fg: "#dc2626" },
};

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

// ============================================================
// COMPONENT
// ============================================================
export default function CandidatePrivacyPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [userName, setUserName] = useState("Candidate");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [requests, setRequests] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
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

  // ---------- Load data ----------
  useEffect(() => {
    if (!session?.user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      // ---- 1. Load candidate name from profile API ----
      try {
        const profileRes = await fetch("/api/candidate/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        if (profileData?.success && profileData.profile?.full_name) {
          setUserName(profileData.profile.full_name);
        }
      } catch {
        // Non-fatal — fall back to "Candidate"
      }

      // ---- 2. Load privacy requests via new API route ----
      const reqRes = await fetch("/api/privacy/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reqData = await reqRes.json();

      if (!reqRes.ok || !reqData.success) {
        throw new Error(reqData.error || "Failed to load your requests");
      }

      setRequests(reqData.requests || []);
      setLoading(false);
    } catch (err) {
      console.error("[Privacy Page] Load failed:", err);
      setError(err.message || "Failed to load your privacy data");
      setLoading(false);
    }
  }

  // ---------- Pending request check ----------
  const pendingRequest = requests.find(
    (r) => r.status === "pending" || r.status === "in_review"
  );

  // ---------- Submit ----------
  async function handleSubmit() {
    if (!selectedType) {
      setSubmitError("Please choose a request type.");
      return;
    }
    if (selectedType === "correction" && details.trim().length < 10) {
      setSubmitError(
        "Please describe what needs to be corrected (at least 10 characters)."
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const body = {
        request_type: selectedType,
        details: details.trim() ? { description: details.trim() } : {},
      };

      const response = await fetch("/api/privacy/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitSuccess(true);
      setSelectedType(null);
      setDetails("");
      await loadData();

      setTimeout(() => setSubmitSuccess(false), 5000);
      setSubmitting(false);
    } catch (err) {
      console.error("[Privacy Page] Submit failed:", err);
      setSubmitError(err.message || "Failed to submit request");
      setSubmitting(false);
    }
  }

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
          <div style={styles.loadingText}>Loading your privacy settings...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // ---------- Render ----------
  return (
    <div style={styles.pageContainer}>
      {/* Sidebar */}
      <CandidateSidebar
        userName={userName}
        userEmail={session?.user?.email || ""}
        onSignOut={handleSignOut}
        activePath="/candidate/privacy"
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
                <h1 style={styles.pageTitle}>Privacy &amp; Data</h1>
                <div style={styles.breadcrumb}>
                  <span>Candidate Portal</span>
                  <span style={styles.breadcrumbSep}>/</span>
                  <span style={styles.breadcrumbActive}>Privacy &amp; Data</span>
                </div>
              </div>
            </div>
            <div style={styles.topBarRight}>
              <Link href="/candidate/profile" style={styles.profileChip}>
                <span style={styles.profileChipAvatar}>
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span style={styles.profileChipName}>{userName}</span>
              </Link>
            </div>
          </header>

          {/* Welcome / intro */}
          <section style={styles.welcomeCard}>
            <div>
              <div style={styles.welcomeEyebrow}>YOUR DATA, YOUR RIGHTS</div>
              <h2 style={styles.welcomeTitle}>
                Manage your <span style={styles.welcomeAccent}>privacy requests</span>
              </h2>
              <p style={styles.welcomeText}>
                You can request a copy of your data, ask for a correction, or
                request deletion. Every request is reviewed by an administrator
                and handled within the stated turnaround.
              </p>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span>{error}</span>
              <button onClick={loadData} style={styles.retryButton}>
                Retry
              </button>
            </div>
          )}

          {/* Pending banner */}
          {pendingRequest && (
            <div style={styles.pendingBanner}>
              <span style={styles.pendingIcon}>⏳</span>
              <div style={styles.pendingText}>
                <strong>You already have a request in progress.</strong>
                <span style={styles.pendingSub}>
                  A {pendingRequest.request_type} request submitted on{" "}
                  {formatDate(pendingRequest.requested_at)} is currently{" "}
                  {pendingRequest.status.replace("_", " ")}. You can submit
                  another request once it has been processed.
                </span>
              </div>
            </div>
          )}

          {/* Submission form */}
          {!pendingRequest && (
            <section style={styles.formCard}>
              <div style={styles.formHeader}>
                <h3 style={styles.formTitle}>Submit a New Request</h3>
                <p style={styles.formSubtitle}>
                  Choose the type of request you want to make. An administrator
                  will review it and respond within the stated turnaround.
                </p>
              </div>

              {submitSuccess && (
                <div style={styles.successBox}>
                  <span style={styles.successIcon}>✓</span>
                  <span>
                    Your request has been submitted. You will receive a response
                    from the assessment team.
                  </span>
                </div>
              )}

              {submitError && (
                <div style={styles.submitErrorBox}>
                  <span style={styles.errorIcon}>!</span>
                  <span>{submitError}</span>
                </div>
              )}

              <div style={styles.typeGrid}>
                {REQUEST_TYPES.map((type) => {
                  const isSelected = selectedType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setSelectedType(type.value);
                        setSubmitError(null);
                      }}
                      style={{
                        ...styles.typeCard,
                        borderColor: isSelected ? "#6366f1" : "rgba(226, 232, 240, 0.8)",
                        background: isSelected ? "rgba(99, 102, 241, 0.06)" : "white",
                        boxShadow: isSelected
                          ? "0 8px 24px rgba(99, 102, 241, 0.18)"
                          : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div
                        style={{
                          ...styles.typeIconBox,
                          background: isSelected
                            ? "rgba(99, 102, 241, 0.15)"
                            : "rgba(148, 163, 184, 0.12)",
                          color: isSelected ? "#4f46e5" : "#64748b",
                        }}
                      >
                        {type.icon}
                      </div>
                      <div style={styles.typeBody}>
                        <div
                          style={{
                            ...styles.typeTitle,
                            color: isSelected ? "#4f46e5" : "#0a1929",
                          }}
                        >
                          {type.title}
                        </div>
                        <div style={styles.typeDescription}>
                          {type.description}
                        </div>
                        <div style={styles.typeTurnaround}>
                          {type.turnaround}
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.typeRadio,
                          borderColor: isSelected ? "#6366f1" : "#cbd5e1",
                        }}
                      >
                        {isSelected && <div style={styles.typeRadioInner} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedType === "correction" && (
                <div style={styles.detailsField}>
                  <label style={styles.detailsLabel}>
                    What needs to be corrected?{" "}
                    <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="e.g. My phone number is incorrect. It should be +233 24 123 4567."
                    style={styles.detailsTextarea}
                    rows={4}
                  />
                  <div style={styles.detailsHint}>
                    Minimum 10 characters. Be specific so we can act quickly.
                  </div>
                </div>
              )}

              {selectedType && selectedType !== "correction" && (
                <div style={styles.detailsField}>
                  <label style={styles.detailsLabel}>
                    Additional details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Any context you want to share."
                    style={styles.detailsTextarea}
                    rows={3}
                  />
                </div>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedType || submitting}
                  style={{
                    ...styles.submitButton,
                    opacity: !selectedType || submitting ? 0.5 : 1,
                    cursor:
                      !selectedType || submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </section>
          )}

          {/* History */}
          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h3 style={styles.historyTitle}>Your Requests</h3>
              <span style={styles.historyCount}>
                {requests.length} {requests.length === 1 ? "request" : "requests"}
              </span>
            </div>

            {requests.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>◇</div>
                <p style={styles.emptyTitle}>No requests yet</p>
                <p style={styles.emptySub}>
                  You haven't submitted any privacy requests. Use the form
                  above whenever you need to.
                </p>
              </div>
            ) : (
              <div style={styles.requestList}>
                {requests.map((req) => {
                  const statusInfo =
                    STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                  const isExpanded = expandedId === req.id;
                  const typeInfo = REQUEST_TYPES.find(
                    (t) => t.value === req.request_type
                  );

                  return (
                    <div key={req.id} style={styles.requestRow}>
                      <div
                        style={styles.requestHeader}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : req.id)
                        }
                      >
                        <span style={styles.requestIcon}>
                          {typeInfo?.icon || "•"}
                        </span>
                        <div style={styles.requestHeaderBody}>
                          <div style={styles.requestType}>
                            {typeInfo?.title || req.request_type}
                          </div>
                          <div style={styles.requestMeta}>
                            Submitted {formatDate(req.requested_at)}
                          </div>
                        </div>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: statusInfo.bg,
                            color: statusInfo.fg,
                          }}
                        >
                          {statusInfo.label}
                        </span>
                        <span
                          style={{
                            ...styles.expandArrow,
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0)",
                          }}
                        >
                          ▾
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={styles.requestDetails}>
                          {req.details?.description && (
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>
                                Your description
                              </span>
                              <span style={styles.detailValue}>
                                {req.details.description}
                              </span>
                            </div>
                          )}

                          {req.reviewed_at && (
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>
                                Reviewed on
                              </span>
                              <span style={styles.detailValue}>
                                {formatDate(req.reviewed_at)}
                              </span>
                            </div>
                          )}

                          {req.completed_at && (
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>
                                Completed on
                              </span>
                              <span style={styles.detailValue}>
                                {formatDate(req.completed_at)}
                              </span>
                            </div>
                          )}

                          {req.rejection_reason && (
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>
                                Rejection reason
                              </span>
                              <span
                                style={{
                                  ...styles.detailValue,
                                  color: "#991b1b",
                                }}
                              >
                                {req.rejection_reason}
                              </span>
                            </div>
                          )}

                          {req.notes && (
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Notes</span>
                              <span style={styles.detailValue}>
                                {req.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Retention info */}
          <div style={styles.infoNote}>
            <span style={styles.infoIcon}>i</span>
            <span>
              <strong>Retention:</strong> Your personal data is retained for
              24 months from your last activity, after which it is anonymized
              in accordance with our Privacy and Data Retention Policy. You can
              request a copy or deletion of your data at any time using the
              form above.
            </span>
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

  // ---------- Welcome card ----------
  welcomeCard: {
    padding: "24px 28px",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: "0 4px 24px rgba(10, 25, 41, 0.08)",
    marginBottom: 20,
  },
  welcomeEyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
    color: "#6366f1", marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 22, fontWeight: 700, color: "#0a1929",
    margin: "0 0 8px 0", lineHeight: 1.3, letterSpacing: "-0.01em",
  },
  welcomeAccent: { color: "#6366f1" },
  welcomeText: {
    fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.6,
    maxWidth: 720,
  },

  // ---------- Error ----------
  errorBox: {
    marginBottom: 16, padding: "12px 16px",
    borderRadius: 12,
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "#b91c1c",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13.5, gap: 12,
  },
  retryButton: {
    padding: "6px 16px", background: "#ef4444",
    color: "white", border: "none", borderRadius: 6,
    cursor: "pointer", fontSize: 12, fontWeight: 600,
    fontFamily: "inherit",
  },

  // ---------- Pending banner ----------
  pendingBanner: {
    display: "flex", gap: 16, alignItems: "flex-start",
    padding: "20px 24px",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: 14, marginBottom: 20,
    color: "#92400e",
  },
  pendingIcon: { fontSize: 26, lineHeight: 1 },
  pendingText: { display: "flex", flexDirection: "column", gap: 4 },
  pendingSub: {
    fontSize: 13, color: "#78350f", lineHeight: 1.5,
  },

  // ---------- Form card ----------
  formCard: {
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: "28px 32px",
    boxShadow: "0 4px 24px rgba(10, 25, 41, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    marginBottom: 20,
  },
  formHeader: { marginBottom: 20 },
  formTitle: {
    fontSize: 18, fontWeight: 700, color: "#0a1929",
    margin: "0 0 6px 0", letterSpacing: "-0.01em",
  },
  formSubtitle: {
    fontSize: 13.5, color: "#64748b", margin: 0, lineHeight: 1.5,
  },

  successBox: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", borderRadius: 10,
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#166534", fontSize: 13.5, marginBottom: 16,
  },
  successIcon: {
    width: 20, height: 20, borderRadius: "50%",
    background: "#16a34a", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 800, flexShrink: 0,
  },
  submitErrorBox: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", borderRadius: 10,
    background: "rgba(220, 38, 38, 0.08)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
    color: "#991b1b", fontSize: 13.5, marginBottom: 16,
  },
  errorIcon: {
    width: 20, height: 20, borderRadius: "50%",
    background: "#dc2626", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 800, flexShrink: 0,
  },

  // ---------- Request type cards ----------
  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },
  typeCard: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "16px 18px",
    border: "2px solid",
    borderRadius: 12,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
    fontFamily: "inherit",
    background: "white",
  },
  typeIconBox: {
    width: 40, height: 40, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
    transition: "background 150ms ease, color 150ms ease",
  },
  typeBody: { flex: 1, minWidth: 0 },
  typeTitle: {
    fontSize: 14, fontWeight: 700, marginBottom: 4,
    transition: "color 150ms ease",
  },
  typeDescription: {
    fontSize: 12.5, color: "#64748b", lineHeight: 1.5,
    marginBottom: 8,
  },
  typeTurnaround: {
    fontSize: 10.5, fontWeight: 700,
    color: "#6366f1", textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  typeRadio: {
    width: 20, height: 20, borderRadius: "50%",
    border: "2px solid", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  typeRadioInner: {
    width: 10, height: 10, borderRadius: "50%",
    background: "#6366f1",
  },

  // ---------- Details field ----------
  detailsField: { marginBottom: 16 },
  detailsLabel: {
    display: "block", fontSize: 12.5, fontWeight: 700,
    color: "#334155", marginBottom: 6,
  },
  detailsTextarea: {
    width: "100%", padding: "12px 14px",
    borderRadius: 10, border: "1px solid #e2e8f0",
    fontSize: 13.5, fontFamily: "inherit",
    resize: "vertical", outline: "none",
    boxSizing: "border-box", background: "#f8fafc",
    color: "#0a1929",
  },
  detailsHint: {
    fontSize: 11.5, color: "#94a3b8", marginTop: 4,
  },

  // ---------- Form actions ----------
  formActions: {
    display: "flex", justifyContent: "flex-end", marginTop: 8,
  },
  submitButton: {
    padding: "12px 32px",
    background: "linear-gradient(135deg, #1a237e, #4f46e5)",
    color: "white", border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(26, 35, 126, 0.25)",
    transition: "transform 150ms ease, box-shadow 150ms ease",
  },

  // ---------- History ----------
  historySection: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: "24px 28px",
    boxShadow: "0 4px 24px rgba(10, 25, 41, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    marginBottom: 20,
  },
  historyHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", gap: 12, marginBottom: 16,
    flexWrap: "wrap",
  },
  historyTitle: {
    fontSize: 16, fontWeight: 700, color: "#0a1929",
    margin: 0, letterSpacing: "-0.01em",
  },
  historyCount: {
    fontSize: 12, fontWeight: 600, color: "#334155",
    padding: "6px 14px",
    background: "rgba(248, 250, 252, 0.9)",
    borderRadius: 50,
    border: "1px solid rgba(10, 25, 41, 0.06)",
  },
  emptyState: {
    padding: "40px 20px", textAlign: "center",
  },
  emptyIcon: {
    fontSize: 32, color: "#cbd5e1", marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15, fontWeight: 700, color: "#0a1929",
    margin: "0 0 6px 0",
  },
  emptySub: {
    fontSize: 13, color: "#64748b", margin: 0,
  },
  requestList: {
    display: "flex", flexDirection: "column", gap: 8,
  },
  requestRow: {
    background: "white",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(226, 232, 240, 0.8)",
  },
  requestHeader: {
    display: "flex", alignItems: "center",
    gap: 14, padding: "14px 18px",
    cursor: "pointer", transition: "background 150ms ease",
  },
  requestIcon: { fontSize: 20, flexShrink: 0 },
  requestHeaderBody: { flex: 1, minWidth: 0 },
  requestType: {
    fontSize: 14, fontWeight: 700, color: "#0a1929",
    marginBottom: 2,
  },
  requestMeta: { fontSize: 12, color: "#94a3b8" },
  statusBadge: {
    padding: "4px 12px", borderRadius: 50,
    fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
  },
  expandArrow: {
    fontSize: 12, color: "#94a3b8",
    transition: "transform 200ms ease",
  },
  requestDetails: {
    padding: "16px 20px",
    background: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    display: "flex", flexDirection: "column", gap: 12,
  },
  detailRow: { display: "flex", flexDirection: "column", gap: 3 },
  detailLabel: {
    fontSize: 10.5, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  detailValue: {
    fontSize: 13.5, color: "#1e293b", lineHeight: 1.5,
  },

  // ---------- Info note ----------
  infoNote: {
    padding: "14px 20px",
    background: "rgba(219, 234, 254, 0.75)",
    backdropFilter: "blur(10px)",
    borderRadius: 12,
    display: "flex", alignItems: "flex-start", gap: 12,
    color: "#1e40af", fontSize: 13,
    border: "1px solid rgba(59, 130, 246, 0.2)",
    lineHeight: 1.6, marginBottom: 20,
  },
  infoIcon: {
    fontSize: 15, fontWeight: 700, flexShrink: 0, marginTop: 1,
    width: 18, height: 18, borderRadius: "50%",
    background: "#3b82f6", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontStyle: "italic", fontFamily: "Georgia, serif",
  },

  // ---------- Footer ----------
  footer: {
    marginTop: "auto", padding: "20px 0 24px",
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
