// pages/candidate/dashboard.js - COMPLETE PROFESSIONAL VERSION

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
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
  const [stats, setStats] = useState({ total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 });
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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

      setUserName(data.candidateName || "Candidate");
      setAssessments(data.assessmentCards || []);
      setStats(data.stats || { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 });
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

  const getStatusInfo = (status) => {
    switch(status) {
      case 'unblocked': 
        return { bg: '#dcfce7', color: '#166534', label: 'Ready to Start', icon: '🚀' };
      case 'in_progress': 
        return { bg: '#fef3c7', color: '#92400e', label: 'In Progress', icon: '⏳' };
      case 'completed': 
        return { bg: '#dbeafe', color: '#1e40af', label: 'Completed', icon: '✅' };
      default: 
        return { bg: '#f1f5f9', color: '#64748b', label: 'Blocked', icon: '🔒' };
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageBackground} />
      
      <div style={styles.content}>
        {/* Header with Logo */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.logoWrapper}>
                <Image 
                  src="/images/stratavax-logo.png" 
                  alt="Stratavax" 
                  width={40} 
                  height={40}
                />
                <span style={styles.headerTitle}>STRATAVAX</span>
              </div>
              <span style={styles.headerDivider}>|</span>
              <span style={styles.headerSubtitle}>Assessment Portal</span>
            </div>
            <div style={styles.headerRight}>
              <Link href="/candidate/profile" style={styles.profileButton}>
                👤 {userName}
              </Link>
              <button onClick={handleSignOut} style={styles.logoutButton}>Sign Out</button>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h2 style={styles.welcomeTitle}>
              Welcome back, <span style={styles.welcomeName}>{userName}</span>
            </h2>
            <p style={styles.welcomeText}>
              {stats.ready + stats.inProgress > 0
                ? `You have ${stats.ready + stats.inProgress} assessment(s) ready or in progress.`
                : "All assessments are currently blocked. Contact your supervisor to unlock assessments."}
            </p>
          </div>
          <div style={styles.progressBadge}>
            <span style={styles.progressCount}>{stats.completed}</span>
            <span style={styles.progressTotal}>/{stats.total}</span>
            <span style={styles.progressLabel}>Completed</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsBar}>
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, background: '#dcfce7', borderColor: '#86efac' }}>
              <div style={styles.statNumber}>{stats.ready}</div>
              <div style={styles.statLabel}>Ready</div>
            </div>
            <div style={{ ...styles.statCard, background: '#fef3c7', borderColor: '#fcd34d' }}>
              <div style={styles.statNumber}>{stats.inProgress}</div>
              <div style={styles.statLabel}>In Progress</div>
            </div>
            <div style={{ ...styles.statCard, background: '#dbeafe', borderColor: '#93c5fd' }}>
              <div style={styles.statNumber}>{stats.completed}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            <div style={{ ...styles.statCard, background: '#f1f5f9', borderColor: '#e2e8f0' }}>
              <div style={styles.statNumber}>{stats.blocked}</div>
              <div style={styles.statLabel}>Blocked</div>
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

          {/* Assessments Grid */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Your Assessments</h3>
                <p style={styles.sectionSubtitle}>Complete the assessments assigned to you by your supervisor</p>
              </div>
              <span style={styles.sectionCount}>{assessments.length} available</span>
            </div>
            
            {assessments.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <p style={styles.emptyTitle}>No assessments available</p>
                <p style={styles.emptySub}>Contact your supervisor to get assessments assigned to you.</p>
              </div>
            ) : (
              <div style={styles.assessmentGrid}>
                {assessments.map((assessment) => {
                  const status = getStatusInfo(assessment.status);
                  const isNationalService = assessment.isNationalService || assessment.typeCode === 'national_service';
                  const canStart = assessment.status === 'unblocked' || assessment.status === 'in_progress';

                  return (
                    <div key={assessment.id} style={styles.assessmentCard}>
                      <div style={styles.cardHeader}>
                        <div style={styles.cardBadge}>
                          <span style={{ ...styles.statusDot, background: status.color }} />
                          <span style={{ ...styles.statusLabel, color: status.color }}>{status.icon} {status.label}</span>
                        </div>
                        <div style={styles.cardBadges}>
                          {isNationalService && (
                            <span style={styles.nsBadge}>🇬🇭 National Service</span>
                          )}
                        </div>
                      </div>

                      <h3 style={styles.cardTitle}>{assessment.title}</h3>
                      <p style={styles.cardDescription}>{assessment.description}</p>

                      <div style={styles.cardMeta}>
                        <span style={styles.metaItem}>
                          <span style={styles.metaIcon}>⏱️</span> {assessment.timeLimitMinutes || 180} min
                        </span>
                        <span style={styles.metaItem}>
                          <span style={styles.metaIcon}>📋</span> {assessment.questionCount || 100} questions
                        </span>
                        <span style={styles.metaItem}>
                          <span style={styles.metaIcon}>📂</span> {assessment.typeName}
                        </span>
                      </div>

                      <div style={styles.cardFooter}>
                        {canStart ? (
                          <button
                            onClick={() => handleStartAssessment(assessment.id)}
                            style={styles.startButton}
                          >
                            {assessment.status === 'in_progress' ? 'Continue Assessment →' : 'Start Assessment →'}
                          </button>
                        ) : (
                          <span style={styles.blockedText}>
                            {isNationalService ? '⚠️ Contact support' : '🔒 Contact supervisor to unlock'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guidelines and Regulations */}
          <div style={styles.guidelinesSection}>
            <h3 style={styles.guidelinesTitle}>Assessment Guidelines & Regulations</h3>
            <div style={styles.guidelinesGrid}>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>⏱️</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Time Limit</h4>
                  <p style={styles.guidelineCardText}>All assessments have a 3-hour time limit. The timer starts when you begin the assessment.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>🔄</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Single Attempt</h4>
                  <p style={styles.guidelineCardText}>Each assessment can only be taken once. Results are final upon submission.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>🔓</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Supervisor Approval</h4>
                  <p style={styles.guidelineCardText}>Most assessments require supervisor approval. The National Service assessment is always available.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>💾</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Auto-Save</h4>
                  <p style={styles.guidelineCardText}>Your answers are automatically saved. You can resume in-progress assessments anytime.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>🔒</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Data Privacy</h4>
                  <p style={styles.guidelineCardText}>Your assessment data is encrypted and protected. Results are only shared with authorized supervisors.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>⚖️</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Fair Assessment</h4>
                  <p style={styles.guidelineCardText}>All candidates are assessed using the same standardized criteria to ensure fairness.</p>
                </div>
              </div>
            </div>
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

        {/* Footer with Regulations */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <div style={styles.footerLeft}>
              <span style={styles.footerBrand}>Stratavax</span>
              <span style={styles.footerDivider}>|</span>
              <span style={styles.footerText}>Talent Assessment Platform</span>
            </div>
            <div style={styles.footerCenter}>
              <span style={styles.footerText}>© {currentYear} Stratavax. All rights reserved.</span>
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
  content: { position: "relative", zIndex: 1, minHeight: "100vh", width: "100%", display: "flex", flexDirection: "column" },
  
  loadingContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  loadingBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url(/images/loading-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.7)", zIndex: 0 },
  loadingContent: { position: "relative", textAlign: "center", color: "white", zIndex: 1, textShadow: "2px 2px 4px rgba(0,0,0,0.5)" },
  loadingLogo: { fontSize: "32px", fontWeight: "700", marginBottom: "20px", letterSpacing: "2px", color: "white" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid rgba(255,255,255,0.2)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  loadingText: { fontSize: "16px", opacity: 0.9 },
  
  header: { padding: "16px 24px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.2)" },
  headerContent: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoWrapper: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "20px", fontWeight: "700", color: "white", letterSpacing: "1px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  headerDivider: { color: "rgba(255,255,255,0.7)", fontSize: "20px", fontWeight: "300" },
  headerSubtitle: { fontSize: "16px", color: "rgba(255,255,255,0.9)", fontWeight: "400", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  profileButton: { padding: "8px 20px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "500", backdropFilter: "blur(10px)", textDecoration: "none", display: "inline-block" },
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
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" },
  statCard: { padding: "16px", borderRadius: "12px", textAlign: "center", border: "2px solid", background: "white" },
  statNumber: { fontSize: "28px", fontWeight: "700", color: "#0a1929" },
  statLabel: { fontSize: "13px", color: "#475569", marginTop: "4px" },
  
  mainContent: { maxWidth: "1200px", margin: "0 auto", padding: "0 20px 40px", flex: 1 },
  errorBox: { marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", background: "#fff5f5", border: "1px solid #fecaca", color: "#b42318", display: "flex", alignItems: "center", justifyContent: "space-between" },
  retryButton: { padding: "4px 12px", background: "#b42318", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  
  section: { marginBottom: "30px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" },
  sectionTitle: { fontSize: "20px", fontWeight: "600", color: "white", margin: 0, textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  sectionSubtitle: { fontSize: "14px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  sectionCount: { fontSize: "14px", color: "rgba(255,255,255,0.7)", padding: "4px 12px", background: "rgba(255,255,255,0.15)", borderRadius: "20px", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  
  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" },
  assessmentCard: { background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" },
  
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" },
  cardBadge: { display: "flex", alignItems: "center", gap: "6px" },
  cardBadges: { display: "flex", gap: "6px", flexWrap: "wrap" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", display: "inline-block" },
  statusLabel: { fontSize: "12px", fontWeight: "600" },
  nsBadge: { fontSize: "11px", fontWeight: "600", padding: "2px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "12px" },
  
  cardTitle: { fontSize: "18px", fontWeight: "600", color: "#0a1929", margin: "0 0 8px 0" },
  cardDescription: { fontSize: "14px", color: "#64748b", margin: "0 0 12px 0", lineHeight: "1.5" },
  
  cardMeta: { display: "flex", gap: "16px", fontSize: "13px", color: "#94a3b8", flexWrap: "wrap", marginBottom: "16px" },
  metaItem: { display: "flex", alignItems: "center", gap: "4px" },
  metaIcon: { fontSize: "16px" },
  
  cardFooter: { marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" },
  startButton: { padding: "10px 24px", background: "#1a237e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500", fontFamily: "inherit", transition: "background 0.2s" },
  blockedText: { fontSize: "13px", color: "#94a3b8", fontWeight: "500", fontStyle: "italic" },
  
  emptyState: { textAlign: "center", padding: "60px 40px", background: "rgba(255,255,255,0.95)", borderRadius: "16px", border: "1px solid #e2e8f0" },
  emptyIcon: { fontSize: "48px", marginBottom: "16px" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#0a1929", margin: "0 0 8px 0" },
  emptySub: { fontSize: "14px", color: "#94a3b8", margin: 0 },
  
  guidelinesSection: { marginTop: "20px", marginBottom: "24px", background: "rgba(255,255,255,0.95)", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" },
  guidelinesTitle: { fontSize: "18px", fontWeight: "600", color: "#0a1929", margin: "0 0 16px 0" },
  guidelinesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" },
  guidelineCard: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #eef2f7" },
  guidelineIcon: { fontSize: "24px", flexShrink: 0 },
  guidelineCardTitle: { fontSize: "14px", fontWeight: "600", color: "#0a1929", margin: "0 0 4px 0" },
  guidelineCardText: { fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.4" },
  
  infoNote: { padding: "12px 20px", background: "rgba(227,242,253,0.95)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", color: "#1565c0", fontSize: "14px", border: "1px solid #90caf9" },
  infoIcon: { fontSize: "18px" },
  
  footer: { marginTop: "auto", padding: "16px 24px", background: "rgba(10,22,40,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.1)" },
  footerContent: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  footerLeft: { display: "flex", alignItems: "center", gap: "8px" },
  footerBrand: { fontSize: "14px", fontWeight: "600", color: "white" },
  footerDivider: { color: "rgba(255,255,255,0.3)" },
  footerText: { fontSize: "13px", color: "rgba(255,255,255,0.6)" },
  footerCenter: { display: "flex", alignItems: "center", gap: "8px" },
  footerRight: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  footerLink: { fontSize: "13px", color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.2s" },
  footerDot: { fontSize: "13px", color: "rgba(255,255,255,0.3)" }
};
