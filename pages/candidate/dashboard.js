// pages/candidate/dashboard.js
// Redesigned candidate dashboard.
// - Left sidebar navigation (CandidateSidebar)
// - Layered background overlay (image preserved, tuned for legibility)
// - 5-KPI stats row (total, completed, ready, inProgress, blocked)
// - Assessment table list (replaces compact card grid)
// - Detail panel below (preserved from previous version)
// - Assessment guidelines (preserved)
// - Info note + footer (preserved)

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";
import CandidateSidebar, { MobileMenuButton } from "../../components/CandidateSidebar";

// ============================================================
// PRESERVED HELPERS — do not modify without testing
// ============================================================

const ASSESSMENT_COLORS = {
  general:                  { gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", border: "#6366f1", light: "rgba(99, 102, 241, 0.08)",  glow: "rgba(99, 102, 241, 0.25)" },
  leadership:               { gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", border: "#8b5cf6", light: "rgba(139, 92, 246, 0.08)",  glow: "rgba(139, 92, 246, 0.25)" },
  cognitive:                { gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", border: "#06b6d4", light: "rgba(6, 182, 212, 0.08)",   glow: "rgba(6, 182, 212, 0.25)" },
  cultural:                 { gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "#10b981", light: "rgba(16, 185, 129, 0.08)",  glow: "rgba(16, 185, 129, 0.25)" },
  personality:              { gradient: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)", border: "#14b8a6", light: "rgba(20, 184, 166, 0.08)",  glow: "rgba(20, 184, 166, 0.25)" },
  strategic_leadership:     { gradient: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)", border: "#1e40af", light: "rgba(30, 64, 175, 0.08)",   glow: "rgba(30, 64, 175, 0.25)" },
  performance:              { gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", border: "#f59e0b", light: "rgba(245, 158, 11, 0.08)",  glow: "rgba(245, 158, 11, 0.25)" },
  technical:                { gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", border: "#ef4444", light: "rgba(239, 68, 68, 0.08)",   glow: "rgba(239, 68, 68, 0.25)" },
  behavioral:               { gradient: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)", border: "#a855f7", light: "rgba(168, 85, 247, 0.08)",  glow: "rgba(168, 85, 247, 0.25)" },
  manufacturing_baseline:   { gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", border: "#22c55e", light: "rgba(34, 197, 94, 0.08)",   glow: "rgba(34, 197, 94, 0.25)" },
  manufacturing_technical:  { gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", border: "#ef4444", light: "rgba(239, 68, 68, 0.08)",   glow: "rgba(239, 68, 68, 0.25)" },
  national_service:         { gradient: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)", border: "#1d4ed8", light: "rgba(29, 78, 216, 0.08)",   glow: "rgba(29, 78, 216, 0.25)" },
  practical_mechanical:     { gradient: "linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)", border: "#1a237e", light: "rgba(26, 35, 126, 0.08)",   glow: "rgba(26, 35, 126, 0.25)" },
  practical_electrical:     { gradient: "linear-gradient(135deg, #b71c1c 0%, #880e4f 100%)", border: "#b71c1c", light: "rgba(183, 28, 28, 0.08)",   glow: "rgba(183, 28, 28, 0.25)" },
  practical_logistics:      { gradient: "linear-gradient(135deg, #e65100 0%, #bf360c 100%)", border: "#e65100", light: "rgba(230, 81, 0, 0.08)",    glow: "rgba(230, 81, 0, 0.25)" },
  practical_quality:        { gradient: "linear-gradient(135deg, #1b5e20 0%, #004d40 100%)", border: "#1b5e20", light: "rgba(27, 94, 32, 0.08)",    glow: "rgba(27, 94, 32, 0.25)" },
};

function getAssessmentColor(typeCode) {
  return ASSESSMENT_COLORS[typeCode] || ASSESSMENT_COLORS.general;
}

function getExpirationStatus(expiresAt) {
  if (!expiresAt) return { status: "no_expiry", label: "", color: "", days: null };
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0)      return { status: "expired", label: "EXPIRED",                  color: "#dc2626", days: diffDays };
  if (diffDays === 0)    return { status: "today",   label: "Expires Today",            color: "#f59e0b", days: 0 };
  if (diffDays <= 7)     return { status: "soon",    label: `${diffDays} days remaining`, color: "#f59e0b", days: diffDays };
  return                        { status: "ok",      label: `${diffDays} days remaining`, color: "#16a34a", days: diffDays };
}

function isNationalServiceAssessment(assessment) {
  return assessment?.isNationalService || assessment?.typeCode === "national_service";
}

function isPracticalAssessment(assessment) {
  return assessment?.typeCode && assessment.typeCode.startsWith("practical_");
}

function getDisplayQuestionCount(assessment) {
  if (isNationalServiceAssessment(assessment)) return assessment.questionCount || 80;
  if (isPracticalAssessment(assessment))       return assessment.questionCount || 40;
  return assessment.questionCount || 100;
}

function getDisplayTimeLimitMinutes(assessment) {
  if (isNationalServiceAssessment(assessment)) return assessment.timeLimitMinutes || 90;
  if (isPracticalAssessment(assessment))       return assessment.timeLimitMinutes || 90;
  return assessment.timeLimitMinutes || 120;
}

function getShortName(title, isNationalService) {
  if (isNationalService) return "National Service";
  if (!title) return "Assessment";
  const original = typeof title === "string" ? title.trim() : "";
  if (!original) return "Assessment";
  const suffixes = [
    " Recruitment Assessment",
    " Technical Assessment",
    " Competence Assessment",
    " Assessment",
  ];
  let short = original;
  for (const suffix of suffixes) {
    if (short.endsWith(suffix)) {
      short = short.slice(0, -suffix.length).trim();
      break;
    }
  }
  return short || original;
}

function getStatusInfo(status) {
  switch (status) {
    case "unblocked":   return { bg: "rgba(34, 197, 94, 0.12)",  color: "#16a34a", label: "Ready to Start", dot: "#16a34a" };
    case "in_progress": return { bg: "rgba(251, 191, 36, 0.12)", color: "#d97706", label: "In Progress",    dot: "#d97706" };
    case "completed":   return { bg: "rgba(59, 130, 246, 0.12)", color: "#2563eb", label: "Completed",      dot: "#2563eb" };
    default:            return { bg: "rgba(148, 163, 184, 0.12)", color: "#64748b", label: "Blocked",        dot: "#64748b" };
  }
}

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
export default function CandidateDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Candidate");
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 });
  const [currentYear] = useState(new Date().getFullYear());

  // Responsive + mobile drawer
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [viewport, setViewport] = useState({ isMobile: false, isTablet: false });

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
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/candidate/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load dashboard");
      }

      setUserName(data.candidateName || "Candidate");
      setAssessments(data.assessmentCards || []);
      setStats(data.stats || { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 });

      if (data.assessmentCards && data.assessmentCards.length > 0) {
        setSelectedAssessment(data.assessmentCards[0]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Failed to load dashboard");
      setLoading(false);
    }
  }

  function handleStartAssessment(assessmentId) {
    router.push(`/assessment/${assessmentId}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleSelectAssessment(assessment) {
    setSelectedAssessment(assessment);
  }

  // ------------------------------------------------------------
  // Layout offsets based on viewport
  // ------------------------------------------------------------
  const sidebarWidth = viewport.isMobile ? 0 : viewport.isTablet ? 72 : 260;

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingOverlay} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={styles.pageContainer}>
      {/* Sidebar */}
      <CandidateSidebar
        userName={userName}
        userEmail={session?.user?.email || ""}
        onSignOut={handleSignOut}
        activePath="/candidate/dashboard"
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main column */}
      <div
        style={{
          ...styles.mainColumn,
          marginLeft: sidebarWidth,
        }}
      >
        {/* Background layer (only over main content, not sidebar) */}
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
                <h1 style={styles.pageTitle}>Dashboard</h1>
                <div style={styles.breadcrumb}>
                  <span>Candidate Portal</span>
                  <span style={styles.breadcrumbSep}>/</span>
                  <span style={styles.breadcrumbActive}>Dashboard</span>
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

          {/* Welcome */}
          <section style={styles.welcomeCard}>
            <div style={styles.welcomeLeft}>
              <div style={styles.welcomeEyebrow}>WELCOME BACK</div>
              <h2 style={styles.welcomeTitle}>
                {userName.split(" ")[0]}, you have{" "}
                <span style={styles.welcomeAccent}>
                  {stats.ready + stats.inProgress}
                </span>{" "}
                {stats.ready + stats.inProgress === 1 ? "assessment" : "assessments"} awaiting you
              </h2>
              <p style={styles.welcomeText}>
                {stats.ready + stats.inProgress > 0
                  ? "Pick up where you left off or start a new assessment below."
                  : "All assessments are currently blocked. Contact your supervisor to unlock them."}
              </p>
            </div>
            <div style={styles.progressRing}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(10,25,41,0.08)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="url(#progressGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.total > 0 ? (stats.completed / stats.total) * 326.7 : 0} 326.7`}
                  transform="rotate(-90 60 60)"
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={styles.progressRingInner}>
                <div style={styles.progressRingNumber}>
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </div>
                <div style={styles.progressRingLabel}>
                  {stats.completed}/{stats.total}
                </div>
              </div>
            </div>
          </section>

          {/* KPI row */}
          <section style={styles.kpiGrid}>
            <KpiCard label="Total Assigned" value={stats.total}      color="#6366f1" accent="rgba(99, 102, 241, 0.12)"  icon="◈" />
            <KpiCard label="Completed"      value={stats.completed}  color="#16a34a" accent="rgba(34, 197, 94, 0.12)"   icon="✔" />
            <KpiCard label="Ready"          value={stats.ready}      color="#2563eb" accent="rgba(59, 130, 246, 0.12)"  icon="▢" />
            <KpiCard label="In Progress"    value={stats.inProgress} color="#d97706" accent="rgba(251, 191, 36, 0.12)"  icon="◉" />
            <KpiCard label="Blocked"        value={stats.blocked}    color="#64748b" accent="rgba(148, 163, 184, 0.12)" icon="●" />
          </section>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span>{error}</span>
              <button onClick={fetchDashboardData} style={styles.retryButton}>
                Retry
              </button>
            </div>
          )}

          {/* Assessment table + detail */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Your Assessments</h3>
                <p style={styles.sectionSubtitle}>
                  Select a row to view details and begin
                </p>
              </div>
              <span style={styles.sectionCount}>
                {assessments.length} {assessments.length === 1 ? "assessment" : "assessments"}
              </span>
            </div>

            {assessments.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>◇</div>
                <p style={styles.emptyTitle}>No assessments available</p>
                <p style={styles.emptySub}>
                  Contact your supervisor to get assessments assigned to you.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                {!viewport.isMobile && (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Assessment</th>
                          <th style={styles.th}>Type</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Questions</th>
                          <th style={styles.th}>Time</th>
                          <th style={styles.th}>Expires</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.map((assessment) => {
                          const colors = getAssessmentColor(assessment.typeCode);
                          const isSelected = selectedAssessment?.id === assessment.id;
                          const ns = isNationalServiceAssessment(assessment);
                          const displayName = getShortName(assessment.title, ns);
                          const expiry = getExpirationStatus(assessment.expires_at);
                          const isExpired = expiry.status === "expired";
                          const statusInfo = getStatusInfo(assessment.status);

                          return (
                            <tr
                              key={assessment.id}
                              onClick={() => !isExpired && handleSelectAssessment(assessment)}
                              style={{
                                ...styles.tr,
                                background: isSelected ? colors.light : "transparent",
                                opacity: isExpired ? 0.55 : 1,
                                cursor: isExpired ? "not-allowed" : "pointer",
                                borderLeft: isSelected
                                  ? `3px solid ${colors.border}`
                                  : "3px solid transparent",
                              }}
                            >
                              <td style={styles.td}>
                                <div style={styles.tdName}>
                                  <span
                                    style={{
                                      ...styles.tdColorDot,
                                      background: colors.gradient,
                                    }}
                                  />
                                  <div style={styles.tdNameStack}>
                                    <span
                                      style={{
                                        ...styles.tdNameText,
                                        textDecoration: isExpired ? "line-through" : "none",
                                        color: isSelected ? colors.border : "#0a1929",
                                      }}
                                    >
                                      {displayName}
                                    </span>
                                    {ns && <span style={styles.tdNsTag}>NS</span>}
                                  </div>
                                </div>
                              </td>
                              <td style={styles.td}>
                                <span style={styles.tdType}>{assessment.typeName || "—"}</span>
                              </td>
                              <td style={styles.td}>
                                <span
                                  style={{
                                    ...styles.statusPill,
                                    background: statusInfo.bg,
                                    color: statusInfo.color,
                                  }}
                                >
                                  <span
                                    style={{
                                      ...styles.statusDot,
                                      background: statusInfo.dot,
                                    }}
                                  />
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={styles.tdMuted}>
                                  {getDisplayQuestionCount(assessment)}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={styles.tdMuted}>
                                  {getDisplayTimeLimitMinutes(assessment)} min
                                </span>
                              </td>
                              <td style={styles.td}>
                                {assessment.expires_at && expiry.status !== "no_expiry" ? (
                                  <span
                                    style={{
                                      ...styles.expiryPill,
                                      background:
                                        expiry.status === "expired"
                                          ? "rgba(220, 38, 38, 0.12)"
                                          : expiry.status === "soon" || expiry.status === "today"
                                          ? "rgba(245, 158, 11, 0.14)"
                                          : "rgba(34, 197, 94, 0.12)",
                                      color:
                                        expiry.status === "expired"
                                          ? "#dc2626"
                                          : expiry.status === "soon" || expiry.status === "today"
                                          ? "#d97706"
                                          : "#16a34a",
                                    }}
                                  >
                                    {expiry.status === "expired"
                                      ? "Expired"
                                      : expiry.status === "today"
                                      ? "Today"
                                      : `${expiry.days}d`}
                                  </span>
                                ) : (
                                  <span style={styles.tdMuted}>—</span>
                                )}
                              </td>
                              <td style={{ ...styles.td, textAlign: "right" }}>
                                {assessment.status === "unblocked" || assessment.status === "in_progress" ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartAssessment(assessment.id);
                                    }}
                                    style={{
                                      ...styles.rowAction,
                                      background: colors.gradient,
                                    }}
                                  >
                                    {assessment.status === "in_progress" ? "Continue" : "Start"}
                                  </button>
                                ) : assessment.status === "completed" ? (
                                  <span style={styles.tdCompleted}>Done</span>
                                ) : (
                                  <span style={styles.tdMuted}>Locked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile stacked rows */}
                {viewport.isMobile && (
                  <div style={styles.mobileList}>
                    {assessments.map((assessment) => {
                      const colors = getAssessmentColor(assessment.typeCode);
                      const isSelected = selectedAssessment?.id === assessment.id;
                      const ns = isNationalServiceAssessment(assessment);
                      const displayName = getShortName(assessment.title, ns);
                      const expiry = getExpirationStatus(assessment.expires_at);
                      const isExpired = expiry.status === "expired";
                      const statusInfo = getStatusInfo(assessment.status);

                      return (
                        <div
                          key={assessment.id}
                          onClick={() => !isExpired && handleSelectAssessment(assessment)}
                          style={{
                            ...styles.mobileCard,
                            borderLeft: `4px solid ${colors.border}`,
                            opacity: isExpired ? 0.55 : 1,
                            background: isSelected ? colors.light : "white",
                          }}
                        >
                          <div style={styles.mobileCardHeader}>
                            <span
                              style={{
                                ...styles.mobileCardName,
                                color: isSelected ? colors.border : "#0a1929",
                              }}
                            >
                              {displayName}
                            </span>
                            {ns && <span style={styles.tdNsTag}>NS</span>}
                          </div>
                          <div style={styles.mobileCardMeta}>
                            <span
                              style={{
                                ...styles.statusPill,
                                background: statusInfo.bg,
                                color: statusInfo.color,
                              }}
                            >
                              <span style={{ ...styles.statusDot, background: statusInfo.dot }} />
                              {statusInfo.label}
                            </span>
                            {assessment.expires_at && expiry.status !== "no_expiry" && (
                              <span
                                style={{
                                  ...styles.expiryPill,
                                  background:
                                    expiry.status === "expired"
                                      ? "rgba(220, 38, 38, 0.12)"
                                      : expiry.status === "soon" || expiry.status === "today"
                                      ? "rgba(245, 158, 11, 0.14)"
                                      : "rgba(34, 197, 94, 0.12)",
                                  color:
                                    expiry.status === "expired"
                                      ? "#dc2626"
                                      : expiry.status === "soon" || expiry.status === "today"
                                      ? "#d97706"
                                      : "#16a34a",
                                }}
                              >
                                {expiry.status === "expired"
                                  ? "Expired"
                                  : expiry.status === "today"
                                  ? "Expires today"
                                  : `${expiry.days}d left`}
                              </span>
                            )}
                          </div>
                          <div style={styles.mobileCardStats}>
                            <span>{getDisplayQuestionCount(assessment)} Q</span>
                            <span style={styles.mobileDot}>·</span>
                            <span>{getDisplayTimeLimitMinutes(assessment)} min</span>
                          </div>
                          {(assessment.status === "unblocked" || assessment.status === "in_progress") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartAssessment(assessment.id);
                              }}
                              style={{
                                ...styles.mobileAction,
                                background: colors.gradient,
                              }}
                            >
                              {assessment.status === "in_progress" ? "Continue" : "Start"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Detail panel — preserved from previous version */}
                {selectedAssessment && (
                  <div style={styles.detailSection}>
                    <div style={styles.detailHeader}>
                      <div style={styles.detailHeaderLeft}>
                        <h3 style={styles.detailTitle}>{selectedAssessment.title}</h3>
                        <span style={styles.detailType}>{selectedAssessment.typeName}</span>
                      </div>
                      <div style={styles.detailActions}>
                        {selectedAssessment.status === "unblocked" ||
                        selectedAssessment.status === "in_progress" ? (
                          <button
                            onClick={() => handleStartAssessment(selectedAssessment.id)}
                            style={styles.detailStartButton}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow =
                                "0 8px 25px rgba(26, 35, 126, 0.25)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(26, 35, 126, 0.2)";
                            }}
                          >
                            {selectedAssessment.status === "in_progress"
                              ? "Continue Assessment"
                              : "Start Assessment"}
                          </button>
                        ) : selectedAssessment.status === "completed" ? (
                          <span style={styles.detailCompleted}>Completed</span>
                        ) : (
                          <span style={styles.detailBlocked}>
                            {selectedAssessment.isNationalService
                              ? "Contact support"
                              : "Contact supervisor to unlock"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={styles.detailStatusRow}>
                      {(() => {
                        const status = getStatusInfo(selectedAssessment.status);
                        return (
                          <span
                            style={{
                              ...styles.detailStatusBadge,
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </span>
                        );
                      })()}
                      {selectedAssessment.isNationalService && (
                        <span style={styles.detailNsBadge}>
                          National Service (Always Available)
                        </span>
                      )}
                      {selectedAssessment.expires_at &&
                        (() => {
                          const expiryStatus = getExpirationStatus(
                            selectedAssessment.expires_at
                          );
                          if (expiryStatus.status === "expired") {
                            return (
                              <span style={styles.detailExpiredBadge}>
                                EXPIRED - Assessment No Longer Available
                              </span>
                            );
                          }
                          if (expiryStatus.status !== "no_expiry") {
                            const isUrgent =
                              expiryStatus.status === "soon" ||
                              expiryStatus.status === "today";
                            return (
                              <span
                                style={{
                                  ...styles.detailExpiryBadge,
                                  background: isUrgent
                                    ? "rgba(220, 38, 38, 0.12)"
                                    : "rgba(22, 163, 74, 0.12)",
                                  color: isUrgent ? "#dc2626" : "#16a34a",
                                  border: isUrgent
                                    ? "1px solid #dc2626"
                                    : "1px solid #16a34a",
                                }}
                              >
                                {expiryStatus.status === "today"
                                  ? "Expires Today"
                                  : `${expiryStatus.days} days remaining`}
                                {isUrgent && (
                                  <span style={styles.urgentTag}>URGENT</span>
                                )}
                              </span>
                            );
                          }
                          return null;
                        })()}
                    </div>

                    <p style={styles.detailDescription}>
                      {selectedAssessment.description}
                    </p>

                    {selectedAssessment.isNationalService &&
                      selectedAssessment.expires_at &&
                      (() => {
                        const expiryStatus = getExpirationStatus(
                          selectedAssessment.expires_at
                        );
                        if (
                          expiryStatus.status === "expired" ||
                          expiryStatus.status === "no_expiry"
                        )
                          return null;
                        const isUrgent =
                          expiryStatus.status === "soon" ||
                          expiryStatus.status === "today";
                        return (
                          <div
                            style={{
                              ...styles.deadlineNotice,
                              background: isUrgent
                                ? "rgba(220, 38, 38, 0.08)"
                                : "rgba(59, 130, 246, 0.08)",
                              border: isUrgent
                                ? "2px solid #dc2626"
                                : "2px solid #3b82f6",
                            }}
                          >
                            <div style={styles.deadlineIcon}>
                              {isUrgent ? "⚠️" : "📅"}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  ...styles.deadlineTitle,
                                  color: isUrgent ? "#dc2626" : "#1e40af",
                                }}
                              >
                                {isUrgent
                                  ? "IMPORTANT: Assessment Deadline Approaching"
                                  : "Assessment Available Until"}
                              </div>
                              <div
                                style={{
                                  ...styles.deadlineBody,
                                  color: isUrgent ? "#991b1b" : "#475569",
                                }}
                              >
                                {expiryStatus.status === "today"
                                  ? "This assessment expires TODAY. Please complete it now."
                                  : `You have ${expiryStatus.days} days remaining to complete this assessment.`}
                              </div>
                              <div style={styles.deadlineDate}>
                                Deadline: {formatDate(selectedAssessment.expires_at)}
                              </div>
                            </div>
                            {isUrgent && (
                              <button
                                onClick={() =>
                                  handleStartAssessment(selectedAssessment.id)
                                }
                                style={styles.deadlineAction}
                              >
                                Take Now
                              </button>
                            )}
                          </div>
                        );
                      })()}

                    {/* Assessment Areas */}
                    <div style={styles.detailAreas}>
                      <h4 style={styles.detailAreasTitle}>Assessment Areas</h4>
                      <div style={styles.detailAreasGrid}>
                        {selectedAssessment.sections &&
                        selectedAssessment.sections.length > 0 ? (
                          selectedAssessment.sections.map((section, index) => (
                            <div key={index} style={styles.detailAreaItem}>
                              <span style={styles.detailAreaBullet}>•</span>
                              <span style={styles.detailAreaText}>
                                {section.name}
                                {section.questionCount ? (
                                  <span style={styles.detailAreaCount}>
                                    ({section.questionCount})
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={styles.detailAreaItem}>
                            <span style={styles.detailAreaText}>
                              Sections will appear once configured.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div style={styles.detailInfo}>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>Time Limit</span>
                        <span style={styles.detailInfoValue}>
                          {getDisplayTimeLimitMinutes(selectedAssessment)} minutes
                        </span>
                      </div>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>Questions</span>
                        <span style={styles.detailInfoValue}>
                          {getDisplayQuestionCount(selectedAssessment)}
                        </span>
                      </div>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>Attempts</span>
                        <span style={styles.detailInfoValue}>
                          {selectedAssessment.attemptsAllowed === 1
                            ? "Single attempt"
                            : `${selectedAssessment.attemptsAllowed} attempts`}
                        </span>
                      </div>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>Type</span>
                        <span style={styles.detailInfoValue}>
                          {selectedAssessment.typeName}
                        </span>
                      </div>
                      {selectedAssessment.expires_at &&
                        (() => {
                          const expiryStatus = getExpirationStatus(
                            selectedAssessment.expires_at
                          );
                          if (expiryStatus.status === "no_expiry") return null;
                          return (
                            <div style={styles.detailInfoItem}>
                              <span style={styles.detailInfoLabel}>Expires</span>
                              <span
                                style={{
                                  ...styles.detailInfoValue,
                                  color:
                                    expiryStatus.status === "expired"
                                      ? "#dc2626"
                                      : expiryStatus.status === "soon"
                                      ? "#d97706"
                                      : "#0a1929",
                                  fontWeight:
                                    expiryStatus.status === "expired" ||
                                    expiryStatus.status === "soon"
                                      ? "700"
                                      : "500",
                                }}
                              >
                                {expiryStatus.status === "expired"
                                  ? "EXPIRED"
                                  : expiryStatus.status === "today"
                                  ? "Today"
                                  : `${expiryStatus.days} days remaining`}
                              </span>
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Guidelines */}
          <section style={styles.guidelinesSection}>
            <h3 style={styles.guidelinesTitle}>Assessment Guidelines</h3>
            <div style={styles.guidelinesGrid}>
              <GuidelineCard icon="⏱" title="Time Limit" text="Assessment time limits depend on the assessment type. National Service is 90 minutes; other assessments are 120 minutes." />
              <GuidelineCard icon="↻" title="Single Attempt" text="Each assessment can only be taken once. Results are final upon submission." />
              <GuidelineCard icon="◉" title="Supervisor Approval" text="Most assessments require supervisor approval. National Service is always available." />
              <GuidelineCard icon="◈" title="Auto-Save" text="Your answers are automatically saved. Resume in-progress assessments anytime." />
              <GuidelineCard icon="◒" title="Data Privacy" text="Your assessment data is encrypted. Results are only shared with authorized supervisors." />
              <GuidelineCard icon="◐" title="Fair Assessment" text="All candidates are assessed using the same standardized criteria." />
            </div>
          </section>

          {/* Info note */}
          <div style={styles.infoNote}>
            <span style={styles.infoIcon}>i</span>
            <span>
              <strong>Note:</strong> The <strong>National Service Assessment</strong> is
              always available to all candidates. Other assessments must be{" "}
              <strong>unblocked by your supervisor</strong> before starting. If an
              assessment has been reset, refresh the dashboard and it will show as
              ready.
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
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================
function KpiCard({ label, value, color, accent, icon }) {
  return (
    <div style={{ ...styles.kpiCard }}>
      <div
        style={{
          ...styles.kpiIconBox,
          background: accent,
          color: color,
        }}
      >
        {icon}
      </div>
      <div style={styles.kpiBody}>
        <div style={{ ...styles.kpiValue, color }}>{value}</div>
        <div style={styles.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

function GuidelineCard({ icon, title, text }) {
  return (
    <div style={styles.guidelineCard}>
      <div style={styles.guidelineIcon}>{icon}</div>
      <div>
        <h4 style={styles.guidelineCardTitle}>{title}</h4>
        <p style={styles.guidelineCardText}>{text}</p>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  // ---------- Page & main column ----------
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: "url(/images/dashboard1-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    zIndex: 0,
    pointerEvents: "none",
  },
  pageOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.86) 0%, rgba(248,250,252,0.92) 45%, rgba(241,245,249,0.96) 100%)",
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
    position: "absolute",
    inset: 0,
    backgroundImage: "url(/images/loading-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.7)",
    zIndex: 0,
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
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
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 20,
    letterSpacing: 2,
    color: "white",
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
  loadingText: { fontSize: 16, opacity: 0.9 },

  // ---------- Top bar ----------
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    boxShadow: "0 1px 3px rgba(10, 25, 41, 0.04)",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0a1929",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  breadcrumbSep: { color: "#cbd5e1" },
  breadcrumbActive: { color: "#334155", fontWeight: 500 },
  profileChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px 6px 6px",
    background: "rgba(10, 25, 41, 0.04)",
    border: "1px solid rgba(10, 25, 41, 0.06)",
    borderRadius: 50,
    textDecoration: "none",
    color: "#0a1929",
    fontSize: 13,
    fontWeight: 500,
    transition: "background 150ms ease",
  },
  profileChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white",
    fontWeight: 700,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipName: {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // ---------- Welcome card ----------
  welcomeCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    padding: "28px 32px",
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 18,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    boxShadow: "0 4px 24px rgba(10, 25, 41, 0.04)",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  welcomeLeft: { flex: "1 1 320px", minWidth: 0 },
  welcomeEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#6366f1",
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0a1929",
    margin: "0 0 6px 0",
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
  },
  welcomeAccent: { color: "#6366f1" },
  welcomeText: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
    lineHeight: 1.5,
  },
  progressRing: {
    position: "relative",
    width: 120,
    height: 120,
    flexShrink: 0,
  },
  progressRingInner: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingNumber: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0a1929",
    lineHeight: 1,
  },
  progressRingLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 600,
    marginTop: 2,
  },

  // ---------- KPI grid ----------
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 14,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    boxShadow: "0 1px 3px rgba(10, 25, 41, 0.04)",
    transition: "transform 200ms ease, box-shadow 200ms ease",
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
  },
  kpiBody: { display: "flex", flexDirection: "column", minWidth: 0 },
  kpiValue: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  kpiLabel: {
    fontSize: 11.5,
    color: "#64748b",
    fontWeight: 600,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  // ---------- Section ----------
  section: { marginBottom: 24 },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0a1929",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    margin: "3px 0 0 0",
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    padding: "6px 14px",
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(20px)",
    borderRadius: 50,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    whiteSpace: "nowrap",
  },

  // ---------- Table ----------
  tableWrapper: {
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 14,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    boxShadow: "0 4px 24px rgba(10, 25, 41, 0.04)",
    overflow: "hidden",
    marginBottom: 20,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13.5,
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    background: "rgba(248, 250, 252, 0.8)",
    borderBottom: "1px solid rgba(10, 25, 41, 0.06)",
    whiteSpace: "nowrap",
  },
  tr: {
    transition: "background 150ms ease",
    borderBottom: "1px solid rgba(10, 25, 41, 0.04)",
  },
  td: {
    padding: "14px 16px",
    color: "#334155",
    verticalAlign: "middle",
  },
  tdName: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  tdColorDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "0 0 0 3px rgba(255,255,255,0.6)",
  },
  tdNameStack: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  tdNameText: {
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tdNsTag: {
    fontSize: 9,
    fontWeight: 800,
    padding: "2px 6px",
    background: "rgba(29, 78, 216, 0.12)",
    color: "#1d4ed8",
    borderRadius: 4,
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  tdType: {
    fontSize: 12.5,
    color: "#64748b",
  },
  tdMuted: {
    fontSize: 12.5,
    color: "#94a3b8",
  },
  tdCompleted: {
    fontSize: 12,
    fontWeight: 600,
    color: "#16a34a",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 50,
    fontSize: 11.5,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  expiryPill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  rowAction: {
    padding: "7px 16px",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "transform 150ms ease, box-shadow 150ms ease",
    boxShadow: "0 2px 8px rgba(10, 25, 41, 0.15)",
  },

  // ---------- Mobile list ----------
  mobileList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  mobileCard: {
    padding: "16px",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(20px)",
    borderRadius: 12,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    boxShadow: "0 1px 3px rgba(10, 25, 41, 0.04)",
    cursor: "pointer",
  },
  mobileCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  mobileCardName: {
    fontSize: 15,
    fontWeight: 700,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  mobileCardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  mobileCardStats: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 12,
  },
  mobileDot: { color: "#cbd5e1" },
  mobileAction: {
    width: "100%",
    padding: "10px 16px",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // ---------- Empty ----------
  emptyState: {
    textAlign: "center",
    padding: "60px 40px",
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(20px)",
    borderRadius: 16,
    border: "1px solid rgba(10, 25, 41, 0.06)",
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 42,
    color: "#cbd5e1",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#0a1929",
    margin: "0 0 6px 0",
  },
  emptySub: {
    fontSize: 13.5,
    color: "#64748b",
    margin: 0,
  },

  // ---------- Error ----------
  errorBox: {
    marginBottom: 16,
    padding: "12px 16px",
    borderRadius: 12,
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13.5,
    gap: 12,
  },
  retryButton: {
    padding: "6px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit",
  },

  // ---------- Detail ----------
  detailSection: {
    background: "rgba(255,255,255,0.98)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: "24px 28px",
    boxShadow: "0 4px 24px rgba(10, 25, 41, 0.06)",
    border: "1px solid rgba(10, 25, 41, 0.06)",
    animation: "fadeIn 0.4s ease",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #f1f5f9",
  },
  detailHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  detailTitle: {
    fontSize: 19,
    fontWeight: 700,
    color: "#0a1929",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  detailType: {
    fontSize: 11.5,
    color: "#64748b",
    padding: "3px 12px",
    background: "#f1f5f9",
    borderRadius: 50,
    fontWeight: 600,
  },
  detailActions: { display: "flex", alignItems: "center", gap: 12 },
  detailStartButton: {
    padding: "10px 28px",
    background: "linear-gradient(135deg, #1a237e, #4f46e5)",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "inherit",
    transition: "all 0.3s",
    boxShadow: "0 4px 12px rgba(26, 35, 126, 0.2)",
  },
  detailBlocked: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  detailCompleted: { fontSize: 13, color: "#16a34a", fontWeight: 700 },

  detailStatusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  detailStatusBadge: {
    padding: "4px 14px",
    borderRadius: 50,
    fontSize: 12,
    fontWeight: 700,
  },
  detailNsBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 12px",
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: 50,
  },
  detailExpiryBadge: {
    padding: "6px 16px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  detailExpiredBadge: {
    padding: "4px 14px",
    borderRadius: 50,
    fontSize: 12,
    fontWeight: 700,
    background: "rgba(220, 38, 38, 0.15)",
    color: "#dc2626",
  },
  urgentTag: {
    background: "#dc2626",
    color: "white",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.04em",
  },
  detailDescription: {
    fontSize: 13.5,
    color: "#64748b",
    margin: "0 0 16px 0",
    lineHeight: 1.6,
  },

  deadlineNotice: {
    padding: "16px 20px",
    borderRadius: 12,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  deadlineIcon: { fontSize: 26, lineHeight: 1 },
  deadlineTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    marginBottom: 2,
  },
  deadlineBody: { fontSize: 13, lineHeight: 1.5 },
  deadlineDate: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  deadlineAction: {
    padding: "8px 20px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  detailAreas: { marginBottom: 16 },
  detailAreasTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0a1929",
    margin: "0 0 10px 0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  detailAreasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 6,
  },
  detailAreaItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    background: "#f8fafc",
    borderRadius: 8,
    border: "1px solid #f1f5f9",
  },
  detailAreaBullet: { color: "#6366f1", fontSize: 14, fontWeight: "bold" },
  detailAreaText: { fontSize: 12.5, color: "#334155" },
  detailAreaCount: { color: "#94a3b8", marginLeft: 6, fontSize: 11 },

  detailInfo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 12,
    paddingTop: 14,
    borderTop: "1px solid #f1f5f9",
  },
  detailInfoItem: { display: "flex", flexDirection: "column", gap: 2 },
  detailInfoLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  detailInfoValue: { fontSize: 13.5, fontWeight: 600, color: "#0a1929" },

  // ---------- Guidelines ----------
  guidelinesSection: {
    marginBottom: 20,
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: "24px 28px",
    border: "1px solid rgba(10, 25, 41, 0.06)",
    boxShadow: "0 1px 3px rgba(10, 25, 41, 0.04)",
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0a1929",
    margin: "0 0 16px 0",
    letterSpacing: "-0.01em",
  },
  guidelinesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  guidelineCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 16px",
    background: "#f8fafc",
    borderRadius: 10,
    border: "1px solid #f1f5f9",
  },
  guidelineIcon: {
    fontSize: 20,
    flexShrink: 0,
    color: "#6366f1",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  guidelineCardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0a1929",
    margin: "0 0 3px 0",
  },
  guidelineCardText: {
    fontSize: 12,
    color: "#64748b",
    margin: 0,
    lineHeight: 1.5,
  },

  // ---------- Info note ----------
  infoNote: {
    padding: "14px 20px",
    background: "rgba(59, 130, 246, 0.08)",
    backdropFilter: "blur(10px)",
    borderRadius: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    color: "#1e40af",
    fontSize: 13,
    border: "1px solid rgba(59, 130, 246, 0.15)",
    lineHeight: 1.6,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#3b82f6",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontStyle: "italic",
    fontFamily: "Georgia, serif",
  },

  // ---------- Footer ----------
  footer: {
    marginTop: "auto",
    padding: "20px 0 24px",
    borderTop: "1px solid rgba(10, 25, 41, 0.06)",
  },
  footerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  footerLeft: { display: "flex", alignItems: "center", gap: 8 },
  footerBrand: { fontSize: 13, fontWeight: 700, color: "#0a1929" },
  footerDivider: { color: "#cbd5e1" },
  footerText: { fontSize: 12, color: "#94a3b8" },
  footerCenter: { display: "flex", alignItems: "center", gap: 8 },
  footerRight: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  footerLink: {
    fontSize: 12,
    color: "#64748b",
    textDecoration: "none",
    transition: "color 0.2s",
  },
  footerDot: { fontSize: 12, color: "#cbd5e1" },
};
