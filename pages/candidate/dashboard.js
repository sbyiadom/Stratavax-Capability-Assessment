// pages/candidate/dashboard.js - COMPLETE FIXED VERSION

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
  const [selectedAssessment, setSelectedAssessment] = useState(null);
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

      console.log('Dashboard data:', data);

      setUserName(data.candidateName || "Candidate");
      setAssessments(data.assessmentCards || []);
      setStats(data.stats || { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 });
      
      // Auto-select first assessment
      if (data.assessmentCards && data.assessmentCards.length > 0) {
        setSelectedAssessment(data.assessmentCards[0]);
      }
      
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

  function handleSelectAssessment(assessment) {
    setSelectedAssessment(assessment);
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

  const getAssessmentColor = (typeCode) => {
    const colors = {
      general: { gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', border: '#2563eb', light: '#dbeafe' },
      leadership: { gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', border: '#7c3aed', light: '#ede9fe' },
      cognitive: { gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', border: '#0891b2', light: '#cffafe' },
      cultural: { gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: '#059669', light: '#d1fae5' },
      personality: { gradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)', border: '#0d9488', light: '#ccfbf1' },
      strategic_leadership: { gradient: 'linear-gradient(135deg, #1e3a8a 0%, #5b21b6 100%)', border: '#5b21b6', light: '#e9d8fd' },
      performance: { gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', border: '#ea580c', light: '#ffedd5' },
      technical: { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', border: '#dc2626', light: '#fee2e2' },
      behavioral: { gradient: 'linear-gradient(135deg, #9333ea 0%, #6b21a5 100%)', border: '#9333ea', light: '#f3e8ff' },
      manufacturing_baseline: { gradient: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: '#2e7d32', light: '#e8f5e9' },
      national_service: { gradient: 'linear-gradient(135deg, #0d47a1 0%, #1a237e 100%)', border: '#0d47a1', light: '#e8eaf6' }
    };
    return colors[typeCode] || colors.general;
  };

  const getDefaultAreas = (typeCode) => {
    const areas = {
      general: ["Cognitive Ability", "Communication", "Cultural & Attitudinal Fit", "Emotional Intelligence", "Ethics & Integrity", "Leadership & Management", "Performance Metrics", "Personality & Behavioral", "Problem-Solving", "Technical & Manufacturing"],
      leadership: ["Change Leadership & Agility", "Communication & Influence", "Cultural Alignment", "Decision-Making & Problem-Solving", "Execution & Results Orientation", "People Management & Coaching", "Resilience & Stress Management", "Role Readiness", "Vision & Strategic Thinking"],
      cognitive: ["Logical / Abstract Reasoning", "Mechanical Reasoning", "Memory & Attention", "Numerical Reasoning", "Perceptual Speed & Accuracy", "Spatial Reasoning", "Verbal Reasoning"],
      technical: ["CIP & Maintenance", "Conveyors & Line Efficiency", "Filling & Bottling", "Packaging & Labeling", "Safety & Efficiency", "Water Treatment & Quality"],
      performance: ["Employee Engagement and Behavior", "Financial and Operational Performance", "Goal Achievement and Strategic Alignment", "Productivity and Efficiency", "Work Quality and Effectiveness"],
      cultural: ["Attitude", "Core Values", "Environmental Fit", "Interpersonal", "Leadership", "Work Style"],
      personality: ["Ownership", "Collaboration", "Action", "Analysis", "Risk Tolerance", "Structure"],
      strategic_leadership: ["Vision / Strategy", "People Leadership", "Decision Making", "Accountability", "Emotional Intelligence", "Execution Drive", "Ethics"],
      behavioral: ["Adaptability", "Clinical", "Collaboration", "Communication Style", "Decision-Making", "FBA", "Leadership"],
      manufacturing_baseline: ["Technical Fundamentals", "Troubleshooting", "Numerical Aptitude", "Safety & Work Ethic"],
      national_service: ["Workplace Readiness", "Intellectual Capability", "Safety & Risk Awareness", "Problem Solving", "Technical Fundamentals", "Communication", "Teamwork", "Professional Conduct"]
    };
    return areas[typeCode] || ["General Assessment"];
  };

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
                  width={36} 
                  height={36}
                  priority
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

          {/* Compact Assessment Cards */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Your Assessments</h3>
                <p style={styles.sectionSubtitle}>Click an assessment to view details</p>
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
              <>
                {/* Compact Cards */}
                <div style={styles.compactGrid}>
                  {assessments.map((assessment) => {
                    const colors = getAssessmentColor(assessment.typeCode);
                    const isSelected = selectedAssessment?.id === assessment.id;
                    const isNationalService = assessment.isNationalService || assessment.typeCode === 'national_service';

                    return (
                      <div 
                        key={assessment.id} 
                        style={{
                          ...styles.compactCard,
                          border: isSelected ? `2px solid ${colors.border}` : '1px solid #e2e8f0',
                          background: isSelected ? colors.light : 'white',
                          boxShadow: isSelected ? `0 4px 12px rgba(0,0,0,0.15)` : '0 2px 8px rgba(0,0,0,0.05)',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSelectAssessment(assessment)}
                      >
                        <div style={{ ...styles.compactGradient, background: colors.gradient }} />
                        <div style={styles.compactContent}>
                          <div style={styles.compactLeft}>
                            <span style={styles.compactIcon}>{isNationalService ? '🇬🇭' : '📊'}</span>
                            <span style={styles.compactName}>{assessment.title}</span>
                          </div>
                          <span style={styles.compactArrow}>{isSelected ? '▼' : '▶'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Assessment Detail Card */}
                {selectedAssessment && (
                  <div style={styles.detailSection}>
                    <div style={styles.detailHeader}>
                      <div style={styles.detailHeaderLeft}>
                        <h3 style={styles.detailTitle}>{selectedAssessment.title}</h3>
                        <span style={styles.detailType}>{selectedAssessment.typeName}</span>
                      </div>
                      <div style={styles.detailActions}>
                        {selectedAssessment.status === 'unblocked' || selectedAssessment.status === 'in_progress' ? (
                          <button
                            onClick={() => handleStartAssessment(selectedAssessment.id)}
                            style={styles.detailStartButton}
                          >
                            {selectedAssessment.status === 'in_progress' ? 'Continue Assessment →' : 'Start Assessment →'}
                          </button>
                        ) : selectedAssessment.status === 'completed' ? (
                          <span style={styles.detailCompleted}>✅ Completed</span>
                        ) : (
                          <span style={styles.detailBlocked}>
                            🔒 {selectedAssessment.isNationalService ? 'Contact support' : 'Contact supervisor to unlock'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status and Description */}
                    <div style={styles.detailStatusRow}>
                      {(() => {
                        const status = getStatusInfo(selectedAssessment.status);
                        return (
                          <span style={{ ...styles.detailStatusBadge, background: status.bg, color: status.color }}>
                            {status.icon} {status.label}
                          </span>
                        );
                      })()}
                      {selectedAssessment.isNationalService && (
                        <span style={styles.detailNsBadge}>🇬🇭 National Service (Always Available)</span>
                      )}
                    </div>
                    <p style={styles.detailDescription}>{selectedAssessment.description}</p>

                    {/* Assessment Areas */}
                    <div style={styles.detailAreas}>
                      <h4 style={styles.detailAreasTitle}>Assessment Areas</h4>
                      <div style={styles.detailAreasGrid}>
                        {getDefaultAreas(selectedAssessment.typeCode).map((area, index) => (
                          <div key={index} style={styles.detailAreaItem}>
                            <span style={styles.detailAreaDot}>•</span>
                            <span style={styles.detailAreaText}>{area}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assessment Info */}
                    <div style={styles.detailInfo}>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>⏱️ Time Limit</span>
                        <span style={styles.detailInfoValue}>{selectedAssessment.timeLimitMinutes || 180} minutes</span>
                      </div>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>📋 Questions</span>
                        <span style={styles.detailInfoValue}>{selectedAssessment.questionCount || 100}</span>
                      </div>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>🔄 Attempts</span>
                        <span style={styles.detailInfoValue}>{selectedAssessment.attemptsAllowed === 1 ? 'Single attempt' : `${selectedAssessment.attemptsAllowed} attempts`}</span>
                      </div>
                      <div style={styles.detailInfoItem}>
                        <span style={styles.detailInfoLabel}>📂 Type</span>
                        <span style={styles.detailInfoValue}>{selectedAssessment.typeName}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
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
                  <p style={styles.guidelineCardText}>All assessments have a 3-hour time limit. The timer starts when you begin.</p>
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
                  <p style={styles.guidelineCardText}>Most assessments require supervisor approval. National Service is always available.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>💾</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Auto-Save</h4>
                  <p style={styles.guidelineCardText}>Your answers are automatically saved. Resume in-progress assessments anytime.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>🔒</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Data Privacy</h4>
                  <p style={styles.guidelineCardText}>Your assessment data is encrypted. Results are only shared with authorized supervisors.</p>
                </div>
              </div>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIcon}>⚖️</div>
                <div>
                  <h4 style={styles.guidelineCardTitle}>Fair Assessment</h4>
                  <p style={styles.guidelineCardText}>All candidates are assessed using the same standardized criteria.</p>
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

        {/* Footer */}
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
  
  header: { padding: "12px 24px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.2)" },
  headerContent: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoWrapper: { display: "flex", alignItems: "center", gap: "8px" },
  headerTitle: { fontSize: "18px", fontWeight: "700", color: "white", letterSpacing: "1px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  headerDivider: { color: "rgba(255,255,255,0.7)", fontSize: "18px", fontWeight: "300" },
  headerSubtitle: { fontSize: "15px", color: "rgba(255,255,255,0.9)", fontWeight: "400", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  profileButton: { padding: "6px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "30px", cursor: "pointer", fontSize: "13px", fontWeight: "500", backdropFilter: "blur(10px)", textDecoration: "none", display: "inline-block" },
  logoutButton: { padding: "6px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "30px", cursor: "pointer", fontSize: "13px", fontWeight: "500", backdropFilter: "blur(10px)" },
  
  welcomeSection: { maxWidth: "1200px", margin: "24px auto 12px", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  welcomeContent: { flex: 1 },
  welcomeTitle: { fontSize: "22px", fontWeight: "600", margin: "0 0 4px 0", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  welcomeName: { color: "#ffd700" },
  welcomeText: { fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  progressBadge: { background: "rgba(255,255,255,0.15)", padding: "6px 16px", borderRadius: "30px", display: "flex", alignItems: "baseline", gap: "4px", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(10px)" },
  progressCount: { fontSize: "18px", fontWeight: "700", color: "white" },
  progressTotal: { fontSize: "13px", color: "rgba(255,255,255,0.7)" },
  progressLabel: { fontSize: "12px", color: "rgba(255,255,255,0.7)", marginLeft: "8px" },
  
  statsBar: { maxWidth: "1200px", margin: "0 auto 20px", padding: "0 20px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" },
  statCard: { padding: "12px", borderRadius: "10px", textAlign: "center", border: "2px solid", background: "white" },
  statNumber: { fontSize: "24px", fontWeight: "700", color: "#0a1929" },
  statLabel: { fontSize: "12px", color: "#475569", marginTop: "2px" },
  
  mainContent: { maxWidth: "1200px", margin: "0 auto", padding: "0 20px 30px", flex: 1 },
  errorBox: { marginBottom: "16px", padding: "10px 16px", borderRadius: "10px", background: "#fff5f5", border: "1px solid #fecaca", color: "#b42318", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px" },
  retryButton: { padding: "4px 12px", background: "#b42318", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  
  section: { marginBottom: "24px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "white", margin: 0, textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  sectionSubtitle: { fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: "2px 0 0 0", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  sectionCount: { fontSize: "13px", color: "rgba(255,255,255,0.7)", padding: "2px 12px", background: "rgba(255,255,255,0.15)", borderRadius: "20px", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  
  compactGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", marginBottom: "20px" },
  compactCard: { 
    position: "relative",
    borderRadius: "10px", 
    overflow: "hidden",
    transition: "all 0.3s ease",
    cursor: "pointer",
    height: "44px"
  },
  compactGradient: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    height: "3px" 
  },
  compactContent: { 
    padding: "8px 14px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    height: "100%"
  },
  compactLeft: { display: "flex", alignItems: "center", gap: "8px" },
  compactIcon: { fontSize: "14px" },
  compactName: { fontSize: "14px", fontWeight: "500", color: "#0a1929" },
  compactArrow: { fontSize: "12px", color: "#94a3b8" },
  
  detailSection: { 
    background: "white", 
    borderRadius: "12px", 
    padding: "20px 24px", 
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    border: "2px solid #1a237e",
    marginTop: "4px"
  },
  detailHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    flexWrap: "wrap", 
    gap: "10px",
    marginBottom: "10px",
    paddingBottom: "10px",
    borderBottom: "2px solid #f1f5f9"
  },
  detailHeaderLeft: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  detailTitle: { fontSize: "18px", fontWeight: "600", color: "#0a1929", margin: 0 },
  detailType: { fontSize: "12px", color: "#64748b", padding: "2px 10px", background: "#f1f5f9", borderRadius: "10px" },
  detailActions: { display: "flex", alignItems: "center", gap: "10px" },
  detailStartButton: { padding: "8px 20px", background: "#1a237e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500", fontFamily: "inherit", transition: "background 0.2s" },
  detailBlocked: { fontSize: "13px", color: "#94a3b8", fontWeight: "500" },
  detailCompleted: { fontSize: "13px", color: "#16a34a", fontWeight: "600" },
  
  detailStatusRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" },
  detailStatusBadge: { padding: "2px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  detailNsBadge: { fontSize: "11px", fontWeight: "600", padding: "2px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "12px" },
  detailDescription: { fontSize: "14px", color: "#64748b", margin: "0 0 12px 0", lineHeight: "1.5" },
  
  detailAreas: { marginBottom: "14px" },
  detailAreasTitle: { fontSize: "14px", fontWeight: "600", color: "#0a1929", margin: "0 0 8px 0" },
  detailAreasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px" },
  detailAreaItem: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#f8fafc", borderRadius: "6px" },
  detailAreaDot: { color: "#1a237e", fontSize: "16px", fontWeight: "bold" },
  detailAreaText: { fontSize: "13px", color: "#334155" },
  
  detailInfo: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", 
    gap: "10px",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9"
  },
  detailInfoItem: { display: "flex", flexDirection: "column", gap: "1px" },
  detailInfoLabel: { fontSize: "11px", color: "#94a3b8" },
  detailInfoValue: { fontSize: "13px", fontWeight: "500", color: "#0a1929" },
  
  emptyState: { textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.95)", borderRadius: "12px", border: "1px solid #e2e8f0" },
  emptyIcon: { fontSize: "40px", marginBottom: "12px" },
  emptyTitle: { fontSize: "16px", fontWeight: "600", color: "#0a1929", margin: "0 0 6px 0" },
  emptySub: { fontSize: "13px", color: "#94a3b8", margin: 0 },
  
  guidelinesSection: { marginTop: "16px", marginBottom: "20px", background: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0" },
  guidelinesTitle: { fontSize: "16px", fontWeight: "600", color: "#0a1929", margin: "0 0 12px 0" },
  guidelinesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" },
  guidelineCard: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #eef2f7" },
  guidelineIcon: { fontSize: "20px", flexShrink: 0 },
  guidelineCardTitle: { fontSize: "13px", fontWeight: "600", color: "#0a1929", margin: "0 0 2px 0" },
  guidelineCardText: { fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.4" },
  
  infoNote: { padding: "10px 16px", background: "rgba(227,242,253,0.95)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#1565c0", fontSize: "13px", border: "1px solid #90caf9" },
  infoIcon: { fontSize: "16px" },
  
  footer: { marginTop: "auto", padding: "12px 24px", background: "rgba(10,22,40,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.1)" },
  footerContent: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  footerLeft: { display: "flex", alignItems: "center", gap: "8px" },
  footerBrand: { fontSize: "13px", fontWeight: "600", color: "white" },
  footerDivider: { color: "rgba(255,255,255,0.3)" },
  footerText: { fontSize: "12px", color: "rgba(255,255,255,0.6)" },
  footerCenter: { display: "flex", alignItems: "center", gap: "8px" },
  footerRight: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  footerLink: { fontSize: "12px", color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.2s" },
  footerDot: { fontSize: "12px", color: "rgba(255,255,255,0.3)" }
};
