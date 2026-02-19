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

  // ===== BACKGROUND IMAGES FOR EACH ASSESSMENT TYPE =====
  const assessmentBackgrounds = {
    general: {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
      color: '#667eea'
    },
    behavioral: {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/always-grey.png',
      color: '#f5576c'
    },
    cognitive: {
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      image: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/stardust.png',
      color: '#4facfe'
    },
    cultural: {
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
      color: '#43e97b'
    },
    manufacturing: {
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
      color: '#fa709a'
    },
    leadership: {
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/dark-mosaic.png',
      color: '#ff9a9e'
    },
    personality: {
      gradient: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
      image: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
      color: '#4CAF50'
    },
    performance: {
      gradient: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
      color: '#FF9800'
    },
    technical: {
      gradient: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)',
      image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
      color: '#F44336'
    }
  };

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
        const transformedTypes = data.map(type => ({
          id: type.code,
          label: type.name,
          shortLabel: type.code.charAt(0).toUpperCase() + type.code.slice(1),
          description: type.description || `${type.name} assessment`,
          longDescription: type.description || `Comprehensive assessment of your ${type.name.toLowerCase()} capabilities.`,
          icon: type.icon || '📋',
          iconBg: `linear-gradient(135deg, ${type.gradient_start || '#667eea'}, ${type.gradient_end || '#764ba2'})`,
          color: type.color || '#667eea',
          lightColor: `${type.color}20` || 'rgba(102, 126, 234, 0.1)',
          duration: type.time_limit_minutes || 60,
          questions: type.question_count || 100,
          passing: 80,
          features: type.category_config || ['General Assessment']
        }));
        
        setAssessmentTypes(transformedTypes);
        if (transformedTypes.length > 0) {
          setActiveTab(transformedTypes[0].id);
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
        const uniqueAssessments = removeDuplicateAssessments(data);
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
    const maxScore = assessment?.assessment_type?.max_score || 100;
    return completed?.score ? Math.round((completed.score / maxScore) * 100) : null;
  };

  const getCompletedCount = () => {
    return completedAssessments.length;
  };

  const getTotalAssessments = () => {
    return assessments.length;
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
      {/* Simple Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>Stratavax Assessment</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Compact Welcome Section */}
      <div style={styles.welcomeSection}>
        <div style={styles.welcomeContent}>
          <h2 style={styles.welcomeTitle}>
            Welcome back, <span style={styles.welcomeName}>{userName}</span>
          </h2>
          <p style={styles.welcomeText}>
            Track your progress and continue your assessments.
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
        {/* Assessment Tabs */}
        <div style={styles.tabsContainer}>
          {assessmentTypes.map(tab => {
            const isActive = activeTab === tab.id;
            const hasAssessment = !!getAssessmentByType(tab.id);
            
            return (
              <button
                key={tab.id}
                onClick={() => hasAssessment && setActiveTab(tab.id)}
                disabled={!hasAssessment}
                style={{
                  ...styles.tabButton,
                  background: isActive ? assessmentBackgrounds[tab.id]?.gradient || tab.iconBg : '#f5f5f5',
                  color: isActive ? 'white' : '#666',
                  opacity: hasAssessment ? 1 : 0.4
                }}
              >
                <span style={styles.tabIcon}>{tab.icon}</span>
                <span style={styles.tabLabel}>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Active Assessment Card */}
        {activeAssessment ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>{activeTypeConfig?.icon}</span>
              <div style={styles.cardInfo}>
                <h3 style={styles.cardTitle}>{activeAssessment.title}</h3>
                <div style={styles.cardMeta}>
                  <span>⏱️ {activeTypeConfig?.duration || 60} mins</span>
                  <span>📝 {activeTypeConfig?.questions || 100} questions</span>
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
                        background: score >= 80 ? '#4caf5020' : '#ff980020',
                        color: score >= 80 ? '#2e7d32' : '#ed6c02'
                      }}>
                        {score >= 80 ? '✓ Passed' : '⚠️ Review'} • {score}%
                      </span>
                    );
                  } else if (inProgress) {
                    return (
                      <span style={{...styles.statusBadge, background: '#1565c020', color: '#1565c0'}}>
                        🕐 In Progress
                      </span>
                    );
                  } else {
                    return (
                      <span style={{...styles.statusBadge, background: '#f5f5f5', color: '#666'}}>
                        📝 Ready
                      </span>
                    );
                  }
                })()}
              </div>
            </div>
            <button
              onClick={() => router.push(`/assessment/${activeAssessment.id}`)}
              style={styles.startButton}
            >
              {isAssessmentInProgress(activeAssessment.id) ? 'Continue →' : 'Start →'}
            </button>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No assessment available for this type.</p>
          </div>
        )}

        {/* Progress Grid */}
        <div style={styles.progressSection}>
          <h3 style={styles.sectionTitle}>Your Progress</h3>
          <div style={styles.progressGrid}>
            {assessmentTypes.map(type => {
              const typeAssessment = getAssessmentByType(type.id);
              const isCompleted = typeAssessment ? isAssessmentCompleted(typeAssessment.id) : false;
              const isInProgress = typeAssessment ? isAssessmentInProgress(typeAssessment.id) : false;
              
              let statusColor = '#999';
              let statusText = 'Not Started';
              
              if (isCompleted) {
                statusColor = '#2e7d32';
                statusText = 'Completed';
              } else if (isInProgress) {
                statusColor = '#1565c0';
                statusText = 'In Progress';
              }
              
              return (
                <div key={type.id} style={styles.progressItem}>
                  <span style={styles.progressIcon}>{type.icon}</span>
                  <span style={styles.progressName}>{type.shortLabel}</span>
                  <span style={{...styles.progressStatus, color: statusColor}}>{statusText}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guidelines Section - Kept exactly as you like it */}
        <div style={styles.guidelinesWrapper}>
          <div style={styles.guidelinesBackground} />
          <div style={styles.guidelinesContent}>
            <div style={styles.guidelinesHeader}>
              <span style={styles.guidelinesIcon}>📌</span>
              <h3 style={styles.guidelinesTitle}>Important Guidelines</h3>
            </div>
            
            <div style={styles.guidelinesGrid}>
              <div style={styles.guidelineCard}>
                <div style={styles.guidelineIconWrapper}>
                  <span style={styles.guidelineIcon}>⏰</span>
                </div>
                <div style={styles.guidelineTextWrapper}>
                  <h4 style={styles.guidelineTitle}>Timed Assessments</h4>
                  <p style={styles.guidelineText}>
                    Each assessment has its own time limit. The timer starts when you begin and pauses if you log off.
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
                    Each assessment can only be taken once. Make sure you're in a quiet environment before starting.
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
                  <span style={styles.guidelineIcon}>🛡️</span>
                </div>
                <div style={styles.guidelineTextWrapper}>
                  <h4 style={styles.guidelineTitle}>Anti-Cheat Protection</h4>
                  <p style={styles.guidelineText}>
                    Right-click, copy/paste, and text selection are disabled during assessments to maintain integrity.
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>💡</span>
              <div style={styles.tipContent}>
                <strong style={styles.tipTitle}>Pro Tip:</strong>
                <span style={styles.tipText}>
                  Take assessments one at a time when you're ready. Your progress is automatically saved.
                </span>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  loadingContent: {
    textAlign: 'center',
    color: 'white'
  },
  loadingLogo: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '20px',
    letterSpacing: '1px'
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
    background: 'white',
    borderBottom: '1px solid #e0e0e0',
    padding: '12px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1565c0',
    margin: 0
  },
  logoutButton: {
    padding: '6px 16px',
    background: '#f5f5f5',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  welcomeSection: {
    maxWidth: '1200px',
    margin: '24px auto 16px',
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
    color: '#333'
  },
  welcomeName: {
    color: '#1565c0'
  },
  welcomeText: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  progressBadge: {
    background: '#f5f5f5',
    padding: '8px 16px',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px'
  },
  progressCount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1565c0'
  },
  progressTotal: {
    fontSize: '14px',
    color: '#666'
  },
  progressLabel: {
    fontSize: '13px',
    color: '#666',
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
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  tabButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  },
  tabIcon: {
    fontSize: '16px'
  },
  tabLabel: {
    textTransform: 'capitalize'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  cardIcon: {
    fontSize: '32px',
    width: '48px',
    height: '48px',
    background: '#f5f5f5',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#333'
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#666'
  },
  cardStatus: {
    marginRight: '16px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  startButton: {
    padding: '8px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    marginBottom: '30px'
  },
  progressSection: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0'
  },
  progressGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px'
  },
  progressItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #f0f0f0'
  },
  progressIcon: {
    fontSize: '18px'
  },
  progressName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textTransform: 'capitalize'
  },
  progressStatus: {
    fontSize: '11px',
    fontWeight: '500'
  },
  // Guidelines section - kept exactly as you had it
  guidelinesWrapper: {
    position: 'relative',
    borderRadius: '32px',
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
    background: 'linear-gradient(135deg, rgba(26,38,57,0.95) 0%, rgba(45,55,72,0.95) 100%)',
    backdropFilter: 'blur(10px)'
  },
  guidelinesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '30px'
  },
  guidelinesIcon: {
    fontSize: '32px'
  },
  guidelinesTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  guidelinesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  guidelineCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    padding: '20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '16px',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  guidelineIconWrapper: {
    width: '48px',
    height: '48px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0
  },
  guidelineTextWrapper: {
    flex: 1
  },
  guidelineTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    marginBottom: '5px'
  },
  guidelineText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.5,
    margin: 0
  },
  tipCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  tipIcon: {
    fontSize: '32px',
    flexShrink: 0
  },
  tipContent: {
    fontSize: '14px',
    color: 'white',
    lineHeight: 1.6
  },
  tipTitle: {
    marginRight: '8px'
  },
  tipText: {
    opacity: 0.9
  }
};
