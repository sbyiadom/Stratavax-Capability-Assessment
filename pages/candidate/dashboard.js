import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

export default function CandidateDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  const [assessments, setAssessments] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const [inProgressAssessments, setInProgressAssessments] = useState([]);
  const [userName, setUserName] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [selectedAssessmentAreas, setSelectedAssessmentAreas] = useState(null);

  // ===== ASSESSMENT KEY AREAS (only category names) =====
  const assessmentAreas = {
    'general': [
      'Cognitive Ability',
      'Communication',
      'Cultural & Attitudinal Fit',
      'Emotional Intelligence',
      'Ethics & Integrity',
      'Leadership & Management',
      'Performance Metrics',
      'Personality & Behavioral',
      'Problem-Solving',
      'Technical & Manufacturing'
    ],
    'leadership': [
      'Change Leadership & Agility',
      'Communication & Influence',
      'Cultural Alignment',
      'Cultural Competence & Inclusivity',
      'Decision-Making & Problem-Solving',
      'Derailer Identification',
      'Empathy & Relationship Building',
      'Execution & Results Orientation',
      'Integrated Leadership Judgment',
      'Learning Agility',
      'People Management & Coaching',
      'Resilience & Stress Management',
      'Role Readiness',
      'Self-Awareness & Self-Regulation',
      'Values & Drivers',
      'Vision & Strategic Thinking'
    ],
    'cognitive': [
      'Logical / Abstract Reasoning',
      'Mechanical Reasoning',
      'Memory & Attention',
      'Numerical Reasoning',
      'Perceptual Speed & Accuracy',
      'Spatial Reasoning',
      'Verbal Reasoning'
    ],
    'technical': [
      'CIP & Maintenance',
      'Conveyors & Line Efficiency',
      'Filling & Bottling',
      'Packaging & Labeling',
      'Safety & Efficiency',
      'Water Treatment & Quality'
    ],
    'performance': [
      'Employee Engagement and Behavior',
      'Financial and Operational Performance',
      'Goal Achievement and Strategic Alignment',
      'Productivity and Efficiency',
      'Work Quality and Effectiveness'
    ],
    'cultural': [
      'Attitude',
      'Core Values',
      'Environmental Fit',
      'Interpersonal',
      'Leadership',
      'Work Style'
    ],
    'personality': [
      'Agreeableness',
      'Behavioral Style',
      'Cognitive Patterns',
      'Conscientiousness',
      'Emotional Intelligence',
      'Extraversion',
      'Integrity',
      'Mixed Traits',
      'Motivations',
      'Neuroticism',
      'Openness to Experience',
      'Performance Risks',
      'Stress Management',
      'Work Pace'
    ],
    'behavioral': [
      'Adaptability',
      'Clinical',
      'Collaboration',
      'Communication Style',
      'Decision-Making',
      'FBA',
      'Leadership'
    ]
  };

  // ===== PROFESSIONAL COLORS FOR EACH ASSESSMENT TYPE =====
  const assessmentColors = {
    'general': {
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      color: '#2563eb',
      light: '#dbeafe',
      border: '1px solid #2563eb20'
    },
    'leadership': {
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      color: '#7c3aed',
      light: '#ede9fe',
      border: '1px solid #7c3aed20'
    },
    'cognitive': {
      gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      color: '#0891b2',
      light: '#cffafe',
      border: '1px solid #0891b220'
    },
    'cultural': {
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      color: '#059669',
      light: '#d1fae5',
      border: '1px solid #05966920'
    },
    'personality': {
      gradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
      color: '#0d9488',
      light: '#ccfbf1',
      border: '1px solid #0d948820'
    },
    'performance': {
      gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      color: '#ea580c',
      light: '#ffedd5',
      border: '1px solid #ea580c20'
    },
    'technical': {
      gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      color: '#dc2626',
      light: '#fee2e2',
      border: '1px solid #dc262620'
    },
    'behavioral': {
      gradient: 'linear-gradient(135deg, #9333ea 0%, #6b21a5 100%)',
      color: '#9333ea',
      light: '#f3e8ff',
      border: '1px solid #9333ea20'
    }
  };

  // Assessment types to exclude (manufacturing removed)
  const excludedTypes = ['manufacturing'];

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Candidate');
      fetchAssessments();
      fetchUserProgress();
      fetchAssessmentTypes();
    }
  }, [session]);

  const fetchAssessmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      if (data) {
        // Filter out excluded types
        const filteredData = data.filter(type => !excludedTypes.includes(type.code));
        
        const transformedTypes = filteredData.map(type => ({
          id: type.code,
          label: type.name,
          shortLabel: type.code.charAt(0).toUpperCase() + type.code.slice(1),
          description: type.description || `${type.name} assessment`,
          longDescription: type.description || `Comprehensive assessment of your ${type.name.toLowerCase()} capabilities.`,
          icon: type.icon || '📋',
          iconBg: `linear-gradient(135deg, ${type.gradient_start || '#2563eb'}, ${type.gradient_end || '#1e40af'})`,
          color: type.color || '#2563eb',
          lightColor: `${type.color}20` || '#dbeafe',
          // FORCE UNIFORM VALUES FOR ALL ASSESSMENTS
          duration: 180, // 180 minutes for all
          questions: 100, // 100 questions for all
          passing: 80,
          features: type.category_config || ['General Assessment']
        }));
        
        setAssessmentTypes(transformedTypes);
        if (transformedTypes.length > 0) {
          setActiveTab(transformedTypes[0].id);
          // Set initial assessment areas
          setSelectedAssessmentAreas(assessmentAreas[transformedTypes[0].id] || []);
        }
      }
    } catch (error) {
      console.error("Error fetching assessment types:", error);
    }
  };

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          assessment_type:assessment_types(*)
        `)
        .eq("is_active", true);

      if (error) throw error;
      
      if (data) {
        // Filter out assessments with excluded types
        const filteredData = data.filter(assessment => 
          !excludedTypes.includes(assessment.assessment_type?.code)
        );
        const uniqueAssessments = removeDuplicateAssessments(filteredData);
        setAssessments(uniqueAssessments);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicateAssessments = (assessments) => {
    const assessmentMap = new Map();
    assessments.forEach(assessment => {
      const typeCode = assessment.assessment_type?.code;
      if (!assessmentMap.has(typeCode)) {
        assessmentMap.set(typeCode, assessment);
      }
    });
    return Array.from(assessmentMap.values());
  };

  const fetchUserProgress = async () => {
    try {
      const { data: completed, error: completedError } = await supabase
        .from("candidate_assessments")
        .select("assessment_id, score, completed_at, status")
        .eq("user_id", session.user.id)
        .eq("status", "completed");

      if (!completedError && completed) {
        setCompletedAssessments(completed);
      }

      const { data: inProgress, error: inProgressError } = await supabase
        .from("assessment_sessions")
        .select("assessment_id, time_spent_seconds, updated_at")
        .eq("user_id", session.user.id)
        .eq("status", "in_progress");

      if (!inProgressError && inProgress) {
        setInProgressAssessments(inProgress);
      }
    } catch (error) {
      console.error("Error fetching user progress:", error);
    }
  };

  const getAssessmentByType = (typeCode) => {
    return assessments.find(a => a.assessment_type?.code === typeCode);
  };

  const isAssessmentCompleted = (assessmentId) => {
    return completedAssessments.some(a => a.assessment_id === assessmentId);
  };

  const isAssessmentInProgress = (assessmentId) => {
    return inProgressAssessments.some(a => a.assessment_id === assessmentId);
  };

  const getAssessmentScore = (assessmentId) => {
    const completed = completedAssessments.find(a => a.assessment_id === assessmentId);
    const assessment = assessments.find(a => a.id === assessmentId);
    const maxScore = assessment?.assessment_type?.max_score || 500;
    return completed?.score ? Math.round((completed.score / maxScore) * 100) : null;
  };

  const getCompletedCount = () => {
    return completedAssessments.length;
  };

  const getTotalAssessments = () => {
    return assessments.length;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedAssessmentAreas(assessmentAreas[tabId] || []);
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const activeTypeConfig = assessmentTypes.find(t => t.id === activeTab) || assessmentTypes[0];
  const activeAssessment = activeTab ? getAssessmentByType(activeTab) : null;
  const completedCount = getCompletedCount();
  const totalAssessments = getTotalAssessments();

  return (
    <AppLayout>
      {/* Professional Header with Gradient Background */}
      <div style={styles.header}>
        <div style={styles.headerOverlay} />
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>STRATAVAX</h1>
            <span style={styles.headerDivider}>|</span>
            <span style={styles.headerSubtitle}>Assessment Portal</span>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            style={styles.logoutButton}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Welcome Section */}
      <div style={styles.welcomeSection}>
        <div style={styles.welcomeContent}>
          <h2 style={styles.welcomeTitle}>
            Welcome back, <span style={styles.welcomeName}>{userName}</span>
          </h2>
          <p style={styles.welcomeText}>
            Select an assessment to begin. Your progress is automatically saved.
          </p>
        </div>
        <div style={styles.progressBadge}>
          <span style={styles.progressCount}>{completedCount}</span>
          <span style={styles.progressTotal}>/{totalAssessments}</span>
          <span style={styles.progressLabel}>Completed</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Assessment Tabs - Professional Colored Tabs */}
        <div style={styles.tabsContainer}>
          {assessmentTypes.map(tab => {
            const isActive = activeTab === tab.id;
            const hasAssessment = !!getAssessmentByType(tab.id);
            const colors = assessmentColors[tab.id] || assessmentColors.general;
            
            return (
              <button
                key={tab.id}
                onClick={() => hasAssessment && handleTabChange(tab.id)}
                disabled={!hasAssessment}
                style={{
                  ...styles.tabButton,
                  background: isActive ? colors.gradient : 'white',
                  color: isActive ? 'white' : colors.color,
                  border: isActive ? 'none' : `1px solid ${colors.color}40`,
                  opacity: hasAssessment ? 1 : 0.4,
                  boxShadow: isActive ? `0 4px 12px ${colors.color}40` : 'none'
                }}
              >
                <span style={styles.tabLabel}>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Assessment Details Section - Professional Card */}
        {activeAssessment ? (
          <div style={styles.assessmentDetailsSection}>
            {/* Assessment Card with Professional Colors */}
            <div style={{
              ...styles.card,
              border: `1px solid ${assessmentColors[activeTab]?.color}30`,
              boxShadow: `0 8px 20px ${assessmentColors[activeTab]?.color}10`
            }}>
              <div style={styles.cardHeader}>
                <div style={{
                  ...styles.cardIconLarge,
                  background: assessmentColors[activeTab]?.gradient || assessmentColors.general.gradient
                }}>
                  {activeTypeConfig?.icon || '📋'}
                </div>
                <div style={styles.cardInfo}>
                  <h3 style={styles.cardTitle}>{activeAssessment.title}</h3>
                  <div style={styles.cardMeta}>
                    <span style={styles.metaItem}>
                      <span style={styles.metaIcon}>⏱️</span> 180 minutes
                    </span>
                    <span style={styles.metaItem}>
                      <span style={styles.metaIcon}>📋</span> 100 questions
                    </span>
                    <span style={styles.metaItem}>
                      <span style={styles.metaIcon}>🎯</span> 80% passing
                    </span>
                  </div>
                </div>
                <div style={styles.cardStatus}>
                  {(() => {
                    const completed = isAssessmentCompleted(activeAssessment.id);
                    const inProgress = isAssessmentInProgress(activeAssessment.id);
                    const score = getAssessmentScore(activeAssessment.id);
                    
                    if (completed) {
                      return (
                        <span style={{
                          ...styles.statusBadge,
                          background: score >= 80 ? '#dcfce7' : '#fff3cd',
                          color: score >= 80 ? '#166534' : '#856404',
                          border: `1px solid ${score >= 80 ? '#86efac' : '#ffe69c'}`
                        }}>
                          {score >= 80 ? '✓ Passed' : '⚠️ Review'} • {score}%
                        </span>
                      );
                    } else if (inProgress) {
                      return (
                        <span style={{
                          ...styles.statusBadge,
                          background: '#dbeafe',
                          color: '#1e40af',
                          border: '1px solid #93c5fd'
                        }}>
                          In Progress
                        </span>
                      );
                    } else {
                      return (
                        <span style={{
                          ...styles.statusBadge,
                          background: '#f8fafc',
                          color: assessmentColors[activeTab]?.color || '#2563eb',
                          border: `1px solid ${assessmentColors[activeTab]?.color}40`
                        }}>
                          Ready to Start
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>
              <button
                onClick={() => router.push(`/assessment/${activeAssessment.id}`)}
                style={{
                  ...styles.startButton,
                  background: assessmentColors[activeTab]?.gradient || assessmentColors.general.gradient,
                  boxShadow: `0 4px 12px ${assessmentColors[activeTab]?.color}40`
                }}
              >
                {isAssessmentInProgress(activeAssessment.id) ? 'Continue Assessment →' : 'Start Assessment →'}
              </button>
            </div>

            {/* Key Assessment Areas - Professional Card */}
            {selectedAssessmentAreas && selectedAssessmentAreas.length > 0 && (
              <div style={{
                ...styles.areasSection,
                borderTop: `4px solid ${assessmentColors[activeTab]?.color || '#2563eb'}`
              }}>
                <h3 style={styles.areasTitle}>Key Assessment Areas</h3>
                <div style={styles.areasGrid}>
                  {selectedAssessmentAreas.map((area, index) => (
                    <div key={index} style={styles.areaItem}>
                      <span style={{...styles.areaBullet, color: assessmentColors[activeTab]?.color || '#2563eb'}}>•</span>
                      <span style={styles.areaText}>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No assessment available for this type.</p>
          </div>
        )}

        {/* Progress Grid - Professional Colored Items */}
        <div style={styles.progressSection}>
          <h3 style={styles.sectionTitle}>Your Progress</h3>
          <div style={styles.progressGrid}>
            {assessmentTypes.map(type => {
              const typeAssessment = getAssessmentByType(type.id);
              const isCompleted = typeAssessment ? isAssessmentCompleted(typeAssessment.id) : false;
              const isInProgress = typeAssessment ? isAssessmentInProgress(typeAssessment.id) : false;
              const colors = assessmentColors[type.id] || assessmentColors.general;
              
              let statusColor = colors.color;
              let statusText = 'Not Started';
              let statusBg = '#f8fafc';
              
              if (isCompleted) {
                statusColor = '#166534';
                statusBg = '#dcfce7';
                statusText = 'Completed';
              } else if (isInProgress) {
                statusColor = colors.color;
                statusBg = colors.light;
                statusText = 'In Progress';
              }
              
              return (
                <div key={type.id} style={{
                  ...styles.progressItem,
                  border: `1px solid ${colors.color}30`,
                  background: statusBg
                }}>
                  <div style={styles.progressItemLeft}>
                    <div style={{
                      ...styles.progressColorDot,
                      background: colors.gradient
                    }} />
                    <span style={{...styles.progressName, color: colors.color}}>{type.shortLabel}</span>
                  </div>
                  <span style={{
                    ...styles.progressStatus,
                    background: statusBg,
                    color: statusColor
                  }}>{statusText}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Note - Uniform Rules */}
        <div style={styles.infoNote}>
          <span style={styles.infoIcon}>ℹ️</span>
          <span><strong>Note:</strong> All assessments have 100 questions and a 3-hour (180 minutes) time limit.</span>
        </div>

        {/* Guidelines Section - Keep as is */}
        <div style={styles.guidelinesWrapper}>
          <div style={styles.guidelinesBackground} />
          <div style={styles.guidelinesContent}>
            <div style={styles.guidelinesHeader}>
              <span style={styles.guidelinesIcon}>📋</span>
              <h3 style={styles.guidelinesTitle}>Assessment Guidelines</h3>
            </div>
            
            <div style={styles.guidelinesGrid}>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIconWrapper}>
                  <span style={styles.guidelineIcon}>⏱️</span>
                </div>
                <div style={styles.guidelineTextWrapper}>
                  <h4 style={styles.guidelineTitle}>3-Hour Time Limit</h4>
                  <p style={styles.guidelineText}>
                    All assessments have a 3-hour (180 minutes) time limit. The timer starts when you begin.
                  </p>
                </div>
              </div>

              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIconWrapper}>
                  <span style={styles.guidelineIcon}>🔄</span>
                </div>
                <div style={styles.guidelineTextWrapper}>
                  <h4 style={styles.guidelineTitle}>One Attempt Only</h4>
                  <p style={styles.guidelineText}>
                    Each assessment can only be taken once. Ensure you're in a quiet environment before starting.
                  </p>
                </div>
              </div>

              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIconWrapper}>
                  <span style={styles.guidelineIcon}>💾</span>
                </div>
                <div style={styles.guidelineTextWrapper}>
                  <h4 style={styles.guidelineTitle}>Auto-Save Enabled</h4>
                  <p style={styles.guidelineText}>
                    Your answers are automatically saved. You can leave and return to resume where you left off.
                  </p>
                </div>
              </div>

              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIconWrapper}>
                  <span style={styles.guidelineIcon}>📝</span>
                </div>
                <div style={styles.guidelineTextWrapper}>
                  <h4 style={styles.guidelineTitle}>100 Questions</h4>
                  <p style={styles.guidelineText}>
                    Each assessment contains 100 questions. Take your time and answer carefully.
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>💡</span>
              <div style={styles.tipContent}>
                <strong>Pro Tip:</strong> Complete assessments one at a time when you're ready. Your progress is automatically saved.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
  },
  loadingContent: {
    textAlign: 'center',
    color: 'white'
  },
  loadingLogo: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '20px',
    letterSpacing: '2px',
    color: 'white'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingText: {
    fontSize: '16px',
    opacity: 0.9
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid #334155'
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    pointerEvents: 'none'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    letterSpacing: '1px'
  },
  headerDivider: {
    color: '#475569',
    fontSize: '20px',
    fontWeight: '300'
  },
  headerSubtitle: {
    fontSize: '16px',
    color: '#94a3b8',
    fontWeight: '400'
  },
  logoutButton: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '1px solid #475569',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)'
  },
  welcomeSection: {
    maxWidth: '1200px',
    margin: '32px auto 24px',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  welcomeContent: {
    flex: 1
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#0f172a'
  },
  welcomeName: {
    color: '#2563eb'
  },
  welcomeText: {
    fontSize: '14px',
    color: '#475569',
    margin: 0
  },
  progressBadge: {
    background: '#f1f5f9',
    padding: '8px 20px',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    border: '1px solid #e2e8f0'
  },
  progressCount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2563eb'
  },
  progressTotal: {
    fontSize: '14px',
    color: '#64748b'
  },
  progressLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginLeft: '8px'
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px'
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  tabButton: {
    padding: '8px 20px',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  tabLabel: {
    textTransform: 'capitalize'
  },
  assessmentDetailsSection: {
    marginBottom: '32px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  cardIconLarge: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    color: 'white',
    flexShrink: 0
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#0f172a'
  },
  cardMeta: {
    display: 'flex',
    gap: '24px',
    fontSize: '14px',
    color: '#475569',
    flexWrap: 'wrap'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  metaIcon: {
    fontSize: '16px'
  },
  cardStatus: {
    minWidth: '140px',
    textAlign: 'right'
  },
  statusBadge: {
    padding: '6px 16px',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: '500',
    display: 'inline-block'
  },
  startButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'flex-end',
    transition: 'all 0.2s',
    minWidth: '200px'
  },
  areasSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  areasTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 16px 0'
  },
  areasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px'
  },
  areaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0'
  },
  areaBullet: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  areaText: {
    fontSize: '14px',
    color: '#334155'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    marginBottom: '30px',
    border: '1px solid #e2e8f0',
    color: '#64748b'
  },
  progressSection: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 16px 0'
  },
  progressGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  progressItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '10px'
  },
  progressItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  progressColorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '4px'
  },
  progressName: {
    fontSize: '14px',
    fontWeight: '500'
  },
  progressStatus: {
    fontSize: '12px',
    fontWeight: '500',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  infoNote: {
    marginBottom: '24px',
    padding: '12px 20px',
    background: '#e3f2fd',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#1565c0',
    fontSize: '14px',
    border: '1px solid #90caf9'
  },
  infoIcon: {
    fontSize: '18px'
  },
  guidelinesWrapper: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    marginTop: '20px'
  },
  guidelinesBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'brightness(0.3)'
  },
  guidelinesContent: {
    position: 'relative',
    padding: '40px',
    background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)',
    backdropFilter: 'blur(10px)'
  },
  guidelinesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '30px'
  },
  guidelinesIcon: {
    fontSize: '28px'
  },
  guidelinesTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'white',
    margin: 0
  },
  guidelinesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  guidelineCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  guidelineIconWrapper: {
    width: '44px',
    height: '44px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0
  },
  guidelineTextWrapper: {
    flex: 1
  },
  guidelineTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 6px 0'
  },
  guidelineText: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    margin: 0
  },
  tipCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'rgba(37,99,235,0.15)',
    borderRadius: '10px',
    border: '1px solid rgba(37,99,235,0.3)'
  },
  tipIcon: {
    fontSize: '24px'
  },
  tipContent: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: '1.5'
  }
};
