// pages/candidate/dashboard.js - SHOW ALL ASSESSMENTS

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

export default function CandidateDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Candidate");
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ completed: 0, ready: 0, inProgress: 0, total: 0, blocked: 0 });

  useEffect(() => {
    if (!session?.user) return;
    fetchDashboardData();
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

      const response = await fetch('/api/candidate/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load dashboard');
      }

      console.log('Dashboard data:', data);

      setUserName(data.candidateName || "Candidate");
      setAssessments(data.assessmentCards || []);
      setStats(data.stats || { completed: 0, ready: 0, inProgress: 0, total: 0, blocked: 0 });
      setLoading(false);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to load dashboard');
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

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const readyCount = assessments.filter(a => a.status === 'unblocked').length;
  const completedCount = assessments.filter(a => a.status === 'completed').length;
  const inProgressCount = assessments.filter(a => a.status === 'in_progress').length;
  const blockedCount = assessments.filter(a => a.status === 'blocked').length;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageBackground} />
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <h1 style={styles.headerTitle}>STRATAVAX</h1>
              <span style={styles.headerDivider}>|</span>
              <span style={styles.headerSubtitle}>Assessment Portal</span>
            </div>
            <div style={styles.headerRight}>
              <button onClick={handleSignOut} style={styles.logoutButton}>Sign Out</button>
            </div>
          </div>
        </div>

        {/* Welcome */}
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h2 style={styles.welcomeTitle}>
              Welcome back, <span style={styles.welcomeName}>{userName}</span>
            </h2>
            <p style={styles.welcomeText}>
              {readyCount + inProgressCount > 0
                ? `You have ${readyCount + inProgressCount} assessment(s) ready or in progress.`
                : "All assessments are currently blocked. Contact your supervisor to unlock assessments."}
            </p>
          </div>
          <div style={styles.progressBadge}>
            <span style={styles.progressCount}>{completedCount}</span>
            <span style={styles.progressTotal}>/{assessments.length}</span>
            <span style={styles.progressLabel}>Completed</span>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsBar}>
          <div style={styles.statsBarInner}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{readyCount}</span>
              <span style={styles.statLabel}>Ready</span>
            </div>
            <div style={styles.statDivider}>|</div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{inProgressCount}</span>
              <span style={styles.statLabel}>In Progress</span>
            </div>
            <div style={styles.statDivider}>|</div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{completedCount}</span>
              <span style={styles.statLabel}>Completed</span>
            </div>
            <div style={styles.statDivider}>|</div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{blockedCount}</span>
              <span style={styles.statLabel}>Blocked</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
              <button onClick={fetchDashboardData} style={styles.retryButton}>Retry</button>
            </div>
          )}

          {/* Assessments List */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>All Assessments</h3>
            <p style={styles.sectionSubtitle}>
              {assessments.filter(a => a.isNationalService).length > 0 
                ? "🇬🇭 National Service assessments are always available. Other assessments require supervisor approval." 
                : "All assessments require supervisor approval to unlock."}
            </p>
            
            {assessments.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No assessments are currently available.</p>
                <p style={styles.emptySub}>Contact your supervisor for more information.</p>
              </div>
            ) : (
              <div style={styles.assessmentGrid}>
                {assessments.map((assessment) => {
                  const isNationalService = assessment.isNationalService || assessment.typeCode === 'national_service';
                  const isUnblocked = assessment.status === 'unblocked';
                  const isInProgress = assessment.status === 'in_progress';
                  const isCompleted = assessment.status === 'completed';
                  const isBlocked = assessment.status === 'blocked';

                  let statusLabel = '🔒 Blocked';
                  let statusColor = '#94a3b8';
                  let statusBg = '#f1f5f9';
                  let canStart = false;

                  if (isCompleted) {
                    statusLabel = '✅ Completed';
                    statusColor = '#16a34a';
                    statusBg = '#dcfce7';
                    canStart = false;
                  } else if (isInProgress) {
                    statusLabel = '⏳ In Progress';
                    statusColor = '#f59e0b';
                    statusBg = '#fef3c7';
                    canStart = true;
                  } else if (isUnblocked) {
                    statusLabel = '🚀 Ready to Start';
                    statusColor = '#2563eb';
                    statusBg = '#dbeafe';
                    canStart = true;
                  } else if (isBlocked) {
                    statusLabel = '🔒 Blocked';
                    statusColor = '#94a3b8';
                    statusBg = '#f1f5f9';
                    canStart = false;
                  }

                  return (
                    <div key={assessment.id} style={styles.assessmentCard}>
                      <div style={styles.assessmentHeader}>
                        <div style={styles.assessmentInfo}>
                          <h3 style={styles.assessmentTitle}>{assessment.title}</h3>
                          <p style={styles.assessmentDescription}>{assessment.description || 'Assessment assigned for your evaluation.'}</p>
                          <div style={styles.assessmentMeta}>
                            <span>⏱️ {assessment.timeLimitMinutes || 180} min</span>
                            <span>📋 {assessment.questionCount || 100} questions</span>
                            <span style={styles.assessmentType}>{assessment.typeName}</span>
                          </div>
                          {isNationalService && (
                            <span style={styles.nsBadge}>🇬🇭 National Service (Always Available)</span>
                          )}
                          {isBlocked && !isNationalService && (
                            <span style={styles.blockedBadge}>🔒 Requires Supervisor Approval</span>
                          )}
                        </div>
                        <div style={styles.assessmentStatus}>
                          <span style={{ ...styles.statusBadge, background: statusBg, color: statusColor }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <div style={styles.assessmentFooter}>
                        {canStart && (
                          <button
                            onClick={() => handleStartAssessment(assessment.id)}
                            style={styles.startButton}
                          >
                            {isInProgress ? 'Continue Assessment →' : 'Start Assessment →'}
                          </button>
                        )}
                        {isCompleted && (
                          <span style={styles.completedText}>✅ Completed</span>
                        )}
                        {isBlocked && !isNationalService && (
                          <span style={styles.blockedText}>🔒 Contact supervisor to unlock</span>
                        )}
                        {isNationalService && isBlocked && (
                          <span style={styles.blockedText}>⚠️ Contact support</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Note */}
          <div style={styles.infoNote}>
            <span style={styles.infoIcon}>ℹ️</span>
            <span>
              <strong>Note:</strong> The <strong>National Service Assessment</strong> is always available to all candidates. 
              Other assessments must be <strong>unblocked by your supervisor</strong> before starting. 
              If an assessment has been reset, refresh the dashboard and it will show as ready.
            </span>
          </div>
        </div>
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
  pageContainer: { position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden" },
  pageBackground: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url(/images/dashboard1-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", zIndex: -1 },
  content: { position: "relative", zIndex: 1, minHeight: "100vh", width: "100%" },
  loadingContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  loadingBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url(/images/loading-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.7)", zIndex: 0 },
  loadingContent: { position: "relative", textAlign: "center", color: "white", zIndex: 1, textShadow: "2px 2px 4px rgba(0,0,0,0.5)" },
  loadingLogo: { fontSize: "32px", fontWeight: "700", marginBottom: "20px", letterSpacing: "2px", color: "white" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid rgba(255,255,255,0.2)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  loadingText: { fontSize: "16px", opacity: 0.9 },
  header: { padding: "16px 24px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.2)" },
  headerContent: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { fontSize: "20px", fontWeight: "700", color: "white", margin: 0, letterSpacing: "1px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  headerDivider: { color: "rgba(255,255,255,0.7)", fontSize: "20px", fontWeight: "300" },
  headerSubtitle: { fontSize: "16px", color: "rgba(255,255,255,0.9)", fontWeight: "400", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  logoutButton: { padding: "8px 20px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "500", backdropFilter: "blur(10px)" },
  welcomeSection: { maxWidth: "1200px", margin: "32px auto 16px", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  welcomeContent: { flex: 1 },
  welcomeTitle: { fontSize: "24px", fontWeight: "600", margin: "0 0 4px 0", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  welcomeName: { color: "#ffd700" },
  welcomeText: { fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  progressBadge: { background: "rgba(255,255,255,0.15)", padding: "8px 20px", borderRadius: "30px", display: "flex", alignItems: "baseline", gap: "4px", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(10px)" },
  progressCount: { fontSize: "20px", fontWeight: "700", color: "white" },
  progressTotal: { fontSize: "14px", color: "rgba(255,255,255,0.7)" },
  progressLabel: { fontSize: "13px", color: "rgba(255,255,255,0.7)", marginLeft: "8px" },
  statsBar: { maxWidth: "1200px", margin: "0 auto 24px", padding: "0 20px" },
  statsBarInner: { background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-around", border: "1px solid rgba(255,255,255,0.15)" },
  statItem: { display: "flex", alignItems: "center", gap: "8px" },
  statNumber: { fontSize: "18px", fontWeight: "700", color: "white" },
  statLabel: { fontSize: "13px", color: "rgba(255,255,255,0.7)" },
  statDivider: { color: "rgba(255,255,255,0.2)" },
  mainContent: { maxWidth: "1200px", margin: "0 auto", padding: "0 20px 40px" },
  errorBox: { marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", background: "#fff5f5", border: "1px solid #fecaca", color: "#b42318", display: "flex", alignItems: "center", justifyContent: "space-between" },
  retryButton: { padding: "4px 12px", background: "#b42318", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  section: { marginBottom: "30px" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "white", margin: "0 0 4px 0", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  sectionSubtitle: { fontSize: "14px", color: "rgba(255,255,255,0.8)", margin: "0 0 16px 0", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  emptyState: { textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.9)", borderRadius: "12px", border: "1px solid #e2e8f0" },
  emptySub: { fontSize: "14px", color: "#94a3b8", marginTop: "8px" },
  assessmentGrid: { display: "flex", flexDirection: "column", gap: "16px" },
  assessmentCard: { background: "white", padding: "20px 24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  assessmentHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" },
  assessmentInfo: { flex: 1 },
  assessmentTitle: { fontSize: "18px", fontWeight: "600", color: "#0a1929", margin: "0 0 4px 0" },
  assessmentDescription: { fontSize: "14px", color: "#64748b", margin: "4px 0 8px 0" },
  assessmentMeta: { display: "flex", gap: "16px", fontSize: "13px", color: "#94a3b8", flexWrap: "wrap" },
  assessmentType: { padding: "2px 8px", background: "#f1f5f9", borderRadius: "4px", fontSize: "12px" },
  nsBadge: { display: "inline-block", padding: "2px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "12px", fontSize: "12px", fontWeight: "600", marginTop: "6px" },
  blockedBadge: { display: "inline-block", padding: "2px 10px", background: "#fef3c7", color: "#92400e", borderRadius: "12px", fontSize: "12px", fontWeight: "600", marginTop: "6px", marginLeft: "8px" },
  assessmentStatus: { minWidth: "120px", textAlign: "right" },
  statusBadge: { padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "500", display: "inline-block" },
  assessmentFooter: { display: "flex", justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px", gap: "16px" },
  startButton: { padding: "8px 20px", background: "#1a237e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500", fontFamily: "inherit" },
  completedText: { fontSize: "13px", color: "#16a34a", fontWeight: "500" },
  blockedText: { fontSize: "13px", color: "#94a3b8", fontWeight: "500" },
  infoNote: { padding: "12px 20px", background: "rgba(227,242,253,0.95)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", color: "#1565c0", fontSize: "14px", border: "1px solid #90caf9" },
  infoIcon: { fontSize: "18px" }
};
