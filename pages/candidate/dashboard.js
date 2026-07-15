// pages/candidate/dashboard.js - PROFESSIONAL REDESIGN

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

      setUserName(data.candidateName || "Candidate");
      setAssessments(data.assessmentCards || []);
      setStats(data.stats || { total: 0, completed: 0, ready: 0, inProgress: 0, blocked: 0 });
      
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
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', label: 'Ready to Start', icon: '🚀' };
      case 'in_progress': 
        return { bg: 'rgba(251, 191, 36, 0.15)', color: '#d97706', label: 'In Progress', icon: '⏳' };
      case 'completed': 
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', label: 'Completed', icon: '✅' };
      default: 
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#64748b', label: 'Blocked', icon: '🔒' };
    }
  };

  const getAssessmentColor = (typeCode) => {
    const colors = {
      general: { 
        gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
        border: '#6366f1', 
        light: 'rgba(99, 102, 241, 0.08)',
        hover: 'rgba(99, 102, 241, 0.15)',
        glow: 'rgba(99, 102, 241, 0.25)'
      },
      leadership: { 
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
        border: '#8b5cf6', 
        light: 'rgba(139, 92, 246, 0.08)',
        hover: 'rgba(139, 92, 246, 0.15)',
        glow: 'rgba(139, 92, 246, 0.25)'
      },
      cognitive: { 
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
        border: '#06b6d4', 
        light: 'rgba(6, 182, 212, 0.08)',
        hover: 'rgba(6, 182, 212, 0.15)',
        glow: 'rgba(6, 182, 212, 0.25)'
      },
      cultural: { 
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
        border: '#10b981', 
        light: 'rgba(16, 185, 129, 0.08)',
        hover: 'rgba(16, 185, 129, 0.15)',
        glow: 'rgba(16, 185, 129, 0.25)'
      },
      personality: { 
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', 
        border: '#14b8a6', 
        light: 'rgba(20, 184, 166, 0.08)',
        hover: 'rgba(20, 184, 166, 0.15)',
        glow: 'rgba(20, 184, 166, 0.25)'
      },
      strategic_leadership: { 
        gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', 
        border: '#1e40af', 
        light: 'rgba(30, 64, 175, 0.08)',
        hover: 'rgba(30, 64, 175, 0.15)',
        glow: 'rgba(30, 64, 175, 0.25)'
      },
      performance: { 
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
        border: '#f59e0b', 
        light: 'rgba(245, 158, 11, 0.08)',
        hover: 'rgba(245, 158, 11, 0.15)',
        glow: 'rgba(245, 158, 11, 0.25)'
      },
      technical: { 
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
        border: '#ef4444', 
        light: 'rgba(239, 68, 68, 0.08)',
        hover: 'rgba(239, 68, 68, 0.15)',
        glow: 'rgba(239, 68, 68, 0.25)'
      },
      behavioral: { 
        gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', 
        border: '#a855f7', 
        light: 'rgba(168, 85, 247, 0.08)',
        hover: 'rgba(168, 85, 247, 0.15)',
        glow: 'rgba(168, 85, 247, 0.25)'
      },
      manufacturing_baseline: { 
        gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
        border: '#22c55e', 
        light: 'rgba(34, 197, 94, 0.08)',
        hover: 'rgba(34, 197, 94, 0.15)',
        glow: 'rgba(34, 197, 94, 0.25)'
      },
      national_service: { 
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', 
        border: '#1d4ed8', 
        light: 'rgba(29, 78, 216, 0.08)',
        hover: 'rgba(29, 78, 216, 0.15)',
        glow: 'rgba(29, 78, 216, 0.25)'
      }
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

  const getShortName = (title, isNationalService) => {
    if (isNationalService) return 'National Service';
    
    const shortNames = {
      'General Assessment': 'General',
      'Leadership Assessment': 'Leadership',
      'Cognitive Ability Assessment': 'Cognitive',
      'Technical Competence Assessment': 'Technical',
      'Personality Assessment': 'Personality',
      'Performance Assessment': 'Performance',
      'Behavioral & Soft Skills': 'Behavioral',
      'Manufacturing Technical Skills': 'Manufacturing',
      'Cultural & Attitudinal Fit': 'Cultural',
      'Strategic Leadership Assessment': 'Strategic',
      'Manufacturing Baseline Assessment': 'Baseline',
      'National Service Recruitment Assessment': 'National Service'
    };
    
    return shortNames[title] || title;
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
              <Link href="/candidate/profile" style={styles.profileButton}>
                <span style={styles.profileAvatar}>{userName.charAt(0).toUpperCase()}</span>
                <span>{userName}</span>
              </Link>
              <button onClick={handleSignOut} style={styles.logoutButton}>Sign Out</button>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <div>
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
        </div>

        {/* Stats Cards */}
        <div style={styles.statsBar}>
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, background: 'rgba(34, 197, 94, 0.12)', borderColor: '#22c55e' }}>
              <div style={{ ...styles.statIcon, color: '#16a34a' }}>✅</div>
              <div>
                <div style={styles.statNumber}>{stats.completed}</div>
                <div style={styles.statLabel}>Completed</div>
              </div>
            </div>
            <div style={{ ...styles.statCard, background: 'rgba(59, 130, 246, 0.12)', borderColor: '#3b82f6' }}>
              <div style={{ ...styles.statIcon, color: '#2563eb' }}>📋</div>
              <div>
                <div style={styles.statNumber}>{stats.ready}</div>
                <div style={styles.statLabel}>Ready</div>
              </div>
            </div>
            <div style={{ ...styles.statCard, background: 'rgba(251, 191, 36, 0.12)', borderColor: '#f59e0b' }}>
              <div style={{ ...styles.statIcon, color: '#d97706' }}>⏳</div>
              <div>
                <div style={styles.statNumber}>{stats.inProgress}</div>
                <div style={styles.statLabel}>In Progress</div>
              </div>
            </div>
            <div style={{ ...styles.statCard, background: 'rgba(148, 163, 184, 0.12)', borderColor: '#94a3b8' }}>
              <div style={{ ...styles.statIcon, color: '#64748b' }}>🔒</div>
              <div>
                <div style={styles.statNumber}>{stats.blocked}</div>
                <div style={styles.statLabel}>Blocked</div>
              </div>
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
                    const displayName = getShortName(assessment.title, isNationalService);

                    return (
                      <div 
                        key={assessment.id} 
                        style={{
                          ...styles.compactCard,
                          background: isSelected ? colors.light : 'white',
                          border: isSelected ? `2px solid ${colors.border}` : '1px solid rgba(226, 232, 240, 0.6)',
                          boxShadow: isSelected 
                            ? `0 8px 32px ${colors.glow}` 
                            : '0 2px 8px rgba(0,0,0,0.04)',
                          transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onClick={() => handleSelectAssessment(assessment)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                          }
                        }}
                      >
                        <div style={{ ...styles.compactGradient, background: colors.gradient }} />
                        <div style={styles.compactContent}>
                          <div style={styles.compactLeft}>
                            <span style={styles.compactIcon}>{isNationalService ? '🇬🇭' : '📊'}</span>
                            <span style={{ 
                              ...styles.compactName, 
                              color: isSelected ? colors.border : '#0a1929',
                              fontWeight: isSelected ? '600' : '500'
                            }}>{displayName}</span>
                          </div>
                          <div style={styles.compactRight}>
                            {isNationalService && (
                              <span style={styles.compactNsTag}>NS</span>
                            )}
                            <span style={{ 
                              ...styles.compactArrow, 
                              color: isSelected ? colors.border : '#94a3b8',
                              transform: isSelected ? 'rotate(180deg)' : 'rotate(0)'
                            }}>▾</span>
                          </div>
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
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 25px rgba(26, 35, 126, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 35, 126, 0.2)';
                            }}
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
                      <h4 style={styles.detailAreasTitle}>📋 Assessment Areas</h4>
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
            <h3 style={styles.guidelinesTitle}>📋 Assessment Guidelines & Regulations</h3>
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
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
  
  header: { padding: "16px 32px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  headerContent: { maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoWrapper: { display: "flex", alignItems: "center", gap: "10px" },
  headerTitle: { fontSize: "20px", fontWeight: "700", color: "white", letterSpacing: "1px", textShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  headerDivider: { color: "rgba(255,255,255,0.4)", fontSize: "18px", fontWeight: "300" },
  headerSubtitle: { fontSize: "15px", color: "rgba(255,255,255,0.8)", fontWeight: "400" },
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
    transition: "all 0.2s"
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
    color: "white"
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
    transition: "all 0.2s"
  },
  
  welcomeSection: { maxWidth: "1280px", margin: "32px auto 20px", padding: "0 32px" },
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
    border: "1px solid rgba(255,255,255,0.08)"
  },
  welcomeTitle: { fontSize: "24px", fontWeight: "600", margin: "0 0 4px 0", color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  welcomeName: { color: "#ffd700" },
  welcomeText: { fontSize: "14px", color: "rgba(255,255,255,0.8)", margin: 0 },
  progressBadge: { 
    background: "rgba(255,255,255,0.1)", 
    padding: "8px 20px", 
    borderRadius: "50px", 
    display: "flex", 
    alignItems: "baseline", 
    gap: "4px", 
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)"
  },
  progressCount: { fontSize: "20px", fontWeight: "700", color: "white" },
  progressTotal: { fontSize: "14px", color: "rgba(255,255,255,0.6)" },
  progressLabel: { fontSize: "13px", color: "rgba(255,255,255,0.6)", marginLeft: "8px" },
  
  statsBar: { maxWidth: "1280px", margin: "0 auto 24px", padding: "0 32px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" },
  statCard: { 
    padding: "16px 20px", 
    borderRadius: "12px", 
    display: "flex", 
    alignItems: "center", 
    gap: "14px",
    border: "2px solid",
    background: "white",
    transition: "all 0.3s"
  },
  statIcon: { fontSize: "24px" },
  statNumber: { fontSize: "24px", fontWeight: "700", color: "#0a1929" },
  statLabel: { fontSize: "12px", color: "#64748b", marginTop: "0px" },
  
  mainContent: { maxWidth: "1280px", margin: "0 auto", padding: "0 32px 40px", flex: 1 },
  errorBox: { marginBottom: "16px", padding: "12px 16px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px" },
  retryButton: { padding: "4px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  
  section: { marginBottom: "28px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "white", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  sectionSubtitle: { fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "2px 0 0 0" },
  sectionCount: { fontSize: "13px", color: "rgba(255,255,255,0.7)", padding: "4px 16px", background: "rgba(255,255,255,0.08)", borderRadius: "50px", border: "1px solid rgba(255,255,255,0.06)" },
  
  compactGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "24px" },
  compactCard: { 
    position: "relative",
    borderRadius: "12px", 
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
    padding: "8px 16px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    height: "100%"
  },
  compactLeft: { display: "flex", alignItems: "center", gap: "8px" },
  compactIcon: { fontSize: "14px" },
  compactName: { fontSize: "13px", fontWeight: "500", color: "#0a1929", transition: "color 0.3s" },
  compactRight: { display: "flex", alignItems: "center", gap: "8px" },
  compactNsTag: { 
    fontSize: "9px", 
    fontWeight: "700", 
    padding: "2px 6px", 
    background: "rgba(29, 78, 216, 0.15)", 
    color: "#1d4ed8", 
    borderRadius: "4px" 
  },
  compactArrow: { fontSize: "12px", transition: "transform 0.3s" },
  
  detailSection: { 
    background: "rgba(255,255,255,0.95)", 
    backdropFilter: "blur(20px)",
    borderRadius: "16px", 
    padding: "24px 28px", 
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    marginTop: "4px",
    animation: "fadeIn 0.4s ease"
  },
  detailHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    flexWrap: "wrap", 
    gap: "12px",
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "2px solid #f1f5f9"
  },
  detailHeaderLeft: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  detailTitle: { fontSize: "20px", fontWeight: "600", color: "#0a1929", margin: 0 },
  detailType: { fontSize: "12px", color: "#64748b", padding: "2px 12px", background: "#f1f5f9", borderRadius: "12px" },
  detailActions: { display: "flex", alignItems: "center", gap: "12px" },
  detailStartButton: { 
    padding: "10px 28px", 
    background: "linear-gradient(135deg, #1a237e, #4f46e5)", 
    color: "white", 
    border: "none", 
    borderRadius: "10px", 
    cursor: "pointer", 
    fontSize: "14px", 
    fontWeight: "600", 
    fontFamily: "inherit", 
    transition: "all 0.3s",
    boxShadow: "0 4px 12px rgba(26, 35, 126, 0.2)"
  },
  detailBlocked: { fontSize: "13px", color: "#94a3b8", fontWeight: "500" },
  detailCompleted: { fontSize: "13px", color: "#16a34a", fontWeight: "600" },
  
  detailStatusRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" },
  detailStatusBadge: { padding: "4px 14px", borderRadius: "50px", fontSize: "12px", fontWeight: "600" },
  detailNsBadge: { fontSize: "11px", fontWeight: "600", padding: "2px 12px", background: "#dbeafe", color: "#1e40af", borderRadius: "50px" },
  detailDescription: { fontSize: "14px", color: "#64748b", margin: "0 0 16px 0", lineHeight: "1.6" },
  
  detailAreas: { marginBottom: "16px" },
  detailAreasTitle: { fontSize: "14px", fontWeight: "600", color: "#0a1929", margin: "0 0 10px 0" },
  detailAreasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px" },
  detailAreaItem: { display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" },
  detailAreaDot: { color: "#6366f1", fontSize: "16px", fontWeight: "bold" },
  detailAreaText: { fontSize: "13px", color: "#334155" },
  
  detailInfo: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", 
    gap: "12px",
    paddingTop: "14px",
    borderTop: "1px solid #f1f5f9"
  },
  detailInfoItem: { display: "flex", flexDirection: "column", gap: "1px" },
  detailInfoLabel: { fontSize: "11px", color: "#94a3b8" },
  detailInfoValue: { fontSize: "14px", fontWeight: "500", color: "#0a1929" },
  
  emptyState: { textAlign: "center", padding: "60px 40px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.06)" },
  emptyIcon: { fontSize: "48px", marginBottom: "16px" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "white", margin: "0 0 8px 0", textShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  emptySub: { fontSize: "14px", color: "rgba(255,255,255,0.6)", margin: 0 },
  
  guidelinesSection: { marginTop: "20px", marginBottom: "24px", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)" },
  guidelinesTitle: { fontSize: "16px", fontWeight: "600", color: "white", margin: "0 0 16px 0", textShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  guidelinesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" },
  guidelineCard: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" },
  guidelineIcon: { fontSize: "22px", flexShrink: 0 },
  guidelineCardTitle: { fontSize: "13px", fontWeight: "600", color: "white", margin: "0 0 2px 0" },
  guidelineCardText: { fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: "1.4" },
  
  infoNote: { padding: "12px 20px", background: "rgba(59, 130, 246, 0.08)", backdropFilter: "blur(10px)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px", color: "#93c5fd", fontSize: "13px", border: "1px solid rgba(59, 130, 246, 0.1)" },
  infoIcon: { fontSize: "18px" },
  
  footer: { marginTop: "auto", padding: "16px 32px", background: "rgba(10,22,40,0.8)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.05)" },
  footerContent: { maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  footerLeft: { display: "flex", alignItems: "center", gap: "8px" },
  footerBrand: { fontSize: "13px", fontWeight: "600", color: "white" },
  footerDivider: { color: "rgba(255,255,255,0.2)" },
  footerText: { fontSize: "12px", color: "rgba(255,255,255,0.4)" },
  footerCenter: { display: "flex", alignItems: "center", gap: "8px" },
  footerRight: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  footerLink: { fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.2s" },
  footerDot: { fontSize: "12px", color: "rgba(255,255,255,0.2)" }
};
