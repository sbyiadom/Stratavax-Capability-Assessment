// pages/candidate/privacy.js
// Phase 7H — Candidate-facing privacy request page.
//
// Candidates can:
//   - Submit privacy requests (access, correction, deletion)
//   - View their own past requests with status and admin response
//   - Read what each request type does and how it's handled
//
// Uses:
//   - supabase auth session (client-side)
//   - privacy_requests table directly via RLS (auth.uid() = candidate_id)
//   - POST /api/privacy/request to submit

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

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
  pending:    { label: "Pending Review",   bg: "rgba(245, 158, 11, 0.15)", fg: "#d97706" },
  in_review:  { label: "In Review",        bg: "rgba(59, 130, 246, 0.15)",  fg: "#2563eb" },
  approved:   { label: "Approved",         bg: "rgba(34, 197, 94, 0.15)",   fg: "#16a34a" },
  completed:  { label: "Completed",        bg: "rgba(34, 197, 94, 0.15)",   fg: "#16a34a" },
  rejected:   { label: "Rejected",         bg: "rgba(220, 38, 38, 0.15)",   fg: "#dc2626" },
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

  // ============================================================
  // Load candidate's own requests
  // ============================================================
  useEffect(() => {
    if (!session?.user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load candidate name from profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      }

      // Load candidate's own requests (RLS enforces auth.uid() = candidate_id)
      const { data: reqs, error: reqError } = await supabase
        .from("privacy_requests")
        .select(
          "id, request_type, status, details, requested_at, reviewed_at, completed_at, rejection_reason, notes"
        )
        .order("requested_at", { ascending: false });

      if (reqError) {
        throw new Error(reqError.message || "Failed to load your requests");
      }

      setRequests(reqs || []);
      setLoading(false);
    } catch (err) {
      console.error("[Privacy Page] Load failed:", err);
      setError(err.message || "Failed to load your privacy data");
      setLoading(false);
    }
  }

  // ============================================================
  // Check if candidate has a pending request
  // ============================================================
  const pendingRequest = requests.find(
    (r) => r.status === "pending" || r.status === "in_review"
  );

  // ============================================================
  // Submit a request
  // ============================================================
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

      // Success — reset form, reload list
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

  // ============================================================
  // Render helpers
  // ============================================================
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your privacy settings...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageBackground} />

      <div style={styles.content}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.logoWrapper}>
                <Image
                  src="/images/stratavax-logo.png"
                  alt="Stratavax"
                  width={40}
                  height={40}
                  priority
                />
                <span style={styles.headerTitle}>STRATAVAX</span>
              </div>
              <span style={styles.headerDivider}>|</span>
              <span style={styles.headerSubtitle}>Assessment Portal</span>
            </div>
            <div style={styles.headerRight}>
              <Link href="/candidate/dashboard" style={styles.profileButton}>
                <span style={styles.profileAvatar}>
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span>{userName}</span>
              </Link>
              <button onClick={handleSignOut} style={styles.logoutButton}>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Welcome / heading */}
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <div>
              <h2 style={styles.welcomeTitle}>
                Privacy & Data <span style={styles.welcomeName}>Requests</span>
              </h2>
              <p style={styles.welcomeText}>
                You can request a copy of your data, ask for a correction, or
                request deletion. Every request is reviewed by an administrator.
              </p>
            </div>
            <Link href="/candidate/dashboard" style={styles.backLink}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div style={styles.mainContent}>
          {error && (
            <div style={styles.errorBox}>
              {error}
              <button onClick={loadData} style={styles.retryButton}>
                Retry
              </button>
            </div>
          )}

          {/* ============ Pending request banner ============ */}
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

          {/* ============ Submission form ============ */}
          {!pendingRequest && (
            <div style={styles.formCard}>
              <h3 style={styles.formTitle}>Submit a New Request</h3>
              <p style={styles.formSubtitle}>
                Choose the type of request you want to make. An administrator
                will review it and respond within the stated turnaround.
              </p>

              {submitSuccess && (
                <div style={styles.successBox}>
                  ✓ Your request has been submitted. You will receive a
                  response from the assessment team.
                </div>
              )}

              {submitError && (
                <div style={styles.submitErrorBox}>{submitError}</div>
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
                        borderColor: isSelected ? "#6366f1" : "#e2e8f0",
                        background: isSelected ? "rgba(99, 102, 241, 0.06)" : "white",
                        boxShadow: isSelected
                          ? "0 8px 24px rgba(99, 102, 241, 0.18)"
                          : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={styles.typeIcon}>{type.icon}</div>
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
                    cursor: !selectedType || submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}

          {/* ============ History ============ */}
          <div style={styles.historySection}>
            <h3 style={styles.historyTitle}>
              Your Requests ({requests.length})
            </h3>

            {requests.length === 0 ? (
              <div style={styles.emptyState}>
                You haven't submitted any privacy requests yet.
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
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          }}
                        >
                          ▾
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={styles.requestDetails}>
                          {req.details && req.details.description && (
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
          </div>

          {/* ============ Policy note ============ */}
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
        </div>

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
          </div>
        </footer>
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

// ============================================================
// STYLES
// ============================================================
const styles = {
  pageContainer: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
  },
  pageBackground: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: "url(/images/dashboard1-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    zIndex: -1,
  },
  content: {
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },

  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  loadingBackground: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: "url(/images/loading-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.7)",
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
    fontSize: "32px",
    fontWeight: "700",
    marginBottom: "20px",
    letterSpacing: "2px",
    color: "white",
  },
  loadingSpinner: {
    width: "50px",
    height: "50px",
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
  loadingText: { fontSize: "16px", opacity: 0.9 },

  header: {
    padding: "16px 32px",
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  headerContent: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoWrapper: { display: "flex", alignItems: "center", gap: "10px" },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "white",
    letterSpacing: "1px",
    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  headerDivider: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "18px",
    fontWeight: "300",
  },
  headerSubtitle: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
  },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  profileButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 16px 6px 6px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "50px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "white",
    backdropFilter: "blur(10px)",
    textDecoration: "none",
  },
  profileAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
  },
  logoutButton: {
    padding: "8px 20px",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "50px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    backdropFilter: "blur(10px)",
  },

  welcomeSection: {
    maxWidth: "1280px",
    margin: "32px auto 20px",
    padding: "0 32px",
  },
  welcomeContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    padding: "20px 28px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  welcomeTitle: {
    fontSize: "24px",
    fontWeight: "600",
    margin: "0 0 4px 0",
    color: "white",
    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  welcomeName: { color: "#ffd700" },
  welcomeText: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    margin: 0,
    maxWidth: "600px",
  },
  backLink: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.85)",
    textDecoration: "none",
    padding: "8px 16px",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "50px",
    border: "1px solid rgba(255,255,255,0.12)",
    whiteSpace: "nowrap",
  },

  mainContent: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 32px 40px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  errorBox: {
    padding: "12px 16px",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#fecaca",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "14px",
  },
  retryButton: {
    padding: "4px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  pendingBanner: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    padding: "20px 24px",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "14px",
    color: "#fef3c7",
  },
  pendingIcon: { fontSize: "28px", lineHeight: "1" },
  pendingText: { display: "flex", flexDirection: "column", gap: "4px" },
  pendingSub: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.75)",
    lineHeight: "1.5",
  },

  formCard: {
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    padding: "28px 32px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  formTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#0a1929",
    margin: "0 0 6px 0",
  },
  formSubtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 20px 0",
    lineHeight: "1.5",
  },

  successBox: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#166534",
    fontSize: "14px",
    marginBottom: "16px",
  },
  submitErrorBox: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(220, 38, 38, 0.08)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
    color: "#991b1b",
    fontSize: "14px",
    marginBottom: "16px",
  },

  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  typeCard: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "16px 18px",
    border: "2px solid",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
    fontFamily: "inherit",
    background: "white",
  },
  typeIcon: { fontSize: "24px", lineHeight: "1", flexShrink: 0 },
  typeBody: { flex: 1, minWidth: 0 },
  typeTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "4px",
  },
  typeDescription: {
    fontSize: "12.5px",
    color: "#64748b",
    lineHeight: "1.5",
    marginBottom: "6px",
  },
  typeTurnaround: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#6366f1",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  typeRadio: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "2px solid",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "2px",
  },
  typeRadioInner: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#6366f1",
  },

  detailsField: { marginBottom: "16px" },
  detailsLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "6px",
  },
  detailsTextarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    background: "#f8fafc",
  },
  detailsHint: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "4px",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  submitButton: {
    padding: "12px 32px",
    background: "linear-gradient(135deg, #1a237e, #4f46e5)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(26, 35, 126, 0.2)",
    transition: "all 0.2s",
  },

  historySection: {
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  historyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    margin: "0 0 16px 0",
    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontSize: "14px",
  },
  requestList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  requestRow: {
    background: "rgba(255,255,255,0.97)",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid rgba(226,232,240,0.6)",
  },
  requestHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 18px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  requestIcon: { fontSize: "20px", flexShrink: 0 },
  requestHeaderBody: { flex: 1, minWidth: 0 },
  requestType: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0a1929",
    marginBottom: "2px",
  },
  requestMeta: { fontSize: "12px", color: "#94a3b8" },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: "50px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  expandArrow: {
    fontSize: "12px",
    color: "#94a3b8",
    transition: "transform 0.2s",
  },
  requestDetails: {
    padding: "16px 20px",
    background: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  detailRow: { display: "flex", flexDirection: "column", gap: "2px" },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  detailValue: { fontSize: "13.5px", color: "#1e293b", lineHeight: "1.5" },

  infoNote: {
    padding: "14px 20px",
    background: "rgba(59, 130, 246, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    color: "#bfdbfe",
    fontSize: "13px",
    border: "1px solid rgba(59, 130, 246, 0.15)",
    lineHeight: "1.6",
  },
  infoIcon: { fontSize: "18px", flexShrink: 0, marginTop: "1px" },

  footer: {
    marginTop: "auto",
    padding: "16px 32px",
    background: "rgba(10,22,40,0.8)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  footerContent: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  footerLeft: { display: "flex", alignItems: "center", gap: "8px" },
  footerBrand: { fontSize: "13px", fontWeight: "600", color: "white" },
  footerDivider: { color: "rgba(255,255,255,0.2)" },
  footerText: { fontSize: "12px", color: "rgba(255,255,255,0.4)" },
  footerCenter: { display: "flex", alignItems: "center", gap: "8px" },
};
