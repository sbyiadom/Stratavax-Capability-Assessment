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
  const [unblockedAssessments, setUnblockedAssessments] = useState([]);

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
    // UPDATED: Personality assessment now shows 6 key traits
    'personality': [
      'Ownership - Takes responsibility and drives outcomes',
      'Collaboration - Works well in teams and builds consensus',
      'Action - Makes quick decisions and takes initiative',
      'Analysis - Seeks data and plans carefully',
      'Risk Tolerance - Comfortable with uncertainty and experimentation',
      'Structure - Follows process and values consistency'
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

  // Assessment types to exclude
  const excludedTypes = ['manufacturing'];

  useEffect(() => {
    if (session?.user) {
      fetchCandidateProfile(session.user.id);
      fetchAssessments();
      fetchUserProgress();
      fetchAssessmentTypes();
      fetchUnblockedAssessments(session.user.id);
    }
  }, [session]);

  const fetchCandidateProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching candidate profile:", error);
        const metadataName = session?.user?.user_metadata?.full_name;
        const emailName = session?.user?.email?.split('@')[0] || 'Candidate';
        setUserName(metadataName || emailName);
        return;
      }

      if (data?.full_name) {
        setUserName(data.full_name);
      } else {
        const metadataName = session?.user?.user_metadata?.full_name;
        const emailName = session?.user?.email?.split('@')[0] || 'Candidate';
        setUserName(metadataName || emailName);
      }
    } catch (error) {
      console.error("Error in fetchCandidateProfile:", error);
      const metadataName = session?.user?.user_metadata?.full_name;
      const emailName = session?.user?.email?.split('@')[0] || 'Candidate';
      setUserName(metadataName || emailName);
    }
  };

  // NEW: Fetch only unblocked assessments
  const fetchUnblockedAssessments = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(`
          assessment_id,
          status,
          unblocked_at,
          assessments (
            id,
            title,
            description,
            assessment_type_id,
            assessment_types (
              code,
              name,
              icon,
              gradient_start,
              gradient_end
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'unblocked');

      if (error) throw error;

      const unblockedIds = (data || []).map(item => item.assessment_id);
      setUnblockedAssessments(unblockedIds);
      
      return unblockedIds;
    } catch (error) {
      console.error("Error fetching unblocked assessments:", error);
      return [];
    }
  };

  const fetchAssessmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      if (data) {
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
          duration: 180,
          questions: 100,
          passing: 80,
          features: type.category_config || ['General Assessment']
        }));
        
        setAssessmentTypes(transformedTypes);
        if (transformedTypes.length > 0) {
          setActiveTab(transformedTypes[0].id);
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

  // MODIFIED: Check if assessment is unblocked
  const isAssessmentUnblocked = (assessmentId) => {
    return unblockedAssessments.includes(assessmentId);
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

  const getUnblockedCount = () => {
    return unblockedAssessments.length;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedAssessmentAreas(assessmentAreas[tabId] || []);
  };

  const handleStartAssessment = (assessmentId) => {
    // Double-check access before navigating
    if (!isAssessmentUnblocked(assessmentId) && !isAssessmentCompleted(assessmentId) && !isAssessmentInProgress(assessmentId)) {
      alert("This assessment is currently blocked. Please contact your supervisor to unblock it.");
      return;
    }
    router.push(`/assessment/${assessmentId}`);
  };

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

  const activeTypeConfig = assessmentTypes.find(t => t.id === activeTab) || assessmentTypes[0];
  const activeAssessment = activeTab ? getAssessmentByType(activeTab) : null;
  const completedCount = getCompletedCount();
  const totalAssessments = getTotalAssessments();
  const unblockedCount = getUnblockedCount();

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageBackground} />
      
      <div style={styles.content}>
        <div style={styles.header}>
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

        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h2 style={styles.welcomeTitle}>
              Welcome back, <span style={styles.welcomeName}>{userName}</span>
            </h2>
            <p style={styles.welcomeText}>
              {unblockedCount > 0 
                ? `You have ${unblockedCount} unblocked assessment(s) ready to take.` 
                : "No assessments are currently unblocked. Contact your supervisor to unlock assessments."}
            </p>
          </div>
          <div style={styles.progressBadge}>
            <span style={styles.progressCount}>{completedCount}</span>
            <span style={styles.progressTotal}>/{totalAssessments}</span>
            <span style={styles.progressLabel}>Completed</span>
          </div>
        </div>

        <div style={styles.mainContent}>
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
                    background: isActive ? colors.gradient : 'rgba(255,255,255,0.9)',
                    color: isActive ? 'white' : colors.color,
                    border: isActive ? 'none' : `1px solid ${colors.color}40`,
                    opacity: hasAssessment ? 1 : 0.4,
                    boxShadow: isActive ? `0 4px 12px rgba(0,0,0,0.2)` : 'none'
                  }}
                >
                  <span style={styles.tabLabel}>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {activeAssessment ? (
            <div style={styles.assessmentDetailsSection}>
              <div style={{
                ...styles.card,
                border: `1px solid ${assessmentColors[activeTab]?.color}40`,
                boxShadow: `0 8px 20px rgba(0,0,0,0.15)`
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
                      const unblocked = isAssessmentUnblocked(activeAssessment.id);
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
                      } else if (unblocked) {
                        return (
                          <span style={{
                            ...styles.statusBadge,
                            background: '#E8F5E9',
                            color: '#2E7D32',
                            border: '1px solid #4CAF50'
                          }}>
                            🔓 Ready to Start
                          </span>
                        );
                      } else {
                        return (
                          <span style={{
                            ...styles.statusBadge,
                            background: '#F5F5F5',
                            color: '#9E9E9E',
                            border: '1px solid #E0E0E0'
                          }}>
                            🔒 Blocked
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
                {isAssessmentUnblocked(activeAssessment.id) || 
                 isAssessmentInProgress(activeAssessment.id) ? (
                  <button
                    onClick={() => handleStartAssessment(activeAssessment.id)}
                    style={{
                      ...styles.startButton,
                      background: assessmentColors[activeTab]?.gradient || assessmentColors.general.gradient,
                      boxShadow: `0 4px 12px rgba(0,0,0,0.2)`
                    }}
                  >
                    {isAssessmentInProgress(activeAssessment.id) ? 'Continue Assessment →' : 'Start Assessment →'}
                  </button>
                ) : (
                  <button
                    disabled
                    style={{
                      ...styles.startButton,
                      background: '#E0E0E0',
                      color: '#9E9E9E',
                      cursor: 'not-allowed',
                      boxShadow: 'none'
                    }}
                  >
                    Contact Supervisor to Unblock
                  </button>
                )}
              </div>

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

          <div style={styles.progressSection}>
            <h3 style={styles.sectionTitle}>Your Progress</h3>
            <div style={styles.progressGrid}>
              {assessmentTypes.map(type => {
                const typeAssessment = getAssessmentByType(type.id);
                const isUnblocked = typeAssessment ? isAssessmentUnblocked(typeAssessment.id) : false;
                const isCompleted = typeAssessment ? isAssessmentCompleted(typeAssessment.id) : false;
                const isInProgress = typeAssessment ? isAssessmentInProgress(typeAssessment.id) : false;
                const colors = assessmentColors[type.id] || assessmentColors.general;
                
                let statusColor = colors.color;
                let statusText = 'Blocked';
                let statusBg = '#F5F5F5';
                
                if (isCompleted) {
                  statusColor = '#166534';
                  statusBg = '#dcfce7';
                  statusText = 'Completed';
                } else if (isInProgress) {
                  statusColor = colors.color;
                  statusBg = colors.light;
                  statusText = 'In Progress';
                } else if (isUnblocked) {
                  statusColor = '#2E7D32';
                  statusBg = '#E8F5E9';
                  statusText = 'Unblocked';
                }
                
                return (
                  <div key={type.id} style={{
                    ...styles.progressItem,
                    border: `1px solid ${colors.color}40`,
                    background: statusBg,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
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

          <div style={styles.infoNote}>
            <span style={styles.infoIcon}>ℹ️</span>
            <span><strong>Note:</strong> Assessments must be unblocked by your supervisor before you can take them. All assessments have 100 questions and a 3-hour (180 minutes) time limit.</span>
          </div>

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
                    <span style={styles.guidelineIcon}>🔓</span>
                  </div>
                  <div style={styles.guidelineTextWrapper}>
                    <h4 style={styles.guidelineTitle}>Must Be Unblocked</h4>
                    <p style={styles.guidelineText}>
                      Your supervisor must unblock each assessment before you can take it. Contact them if you don't see an assessment you expect.
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
              </div>

              <div style={styles.tipCard}>
                <span style={styles.tipIcon}>💡</span>
                <div style={styles.tipContent}>
                  <strong>Pro Tip:</strong> If an assessment shows as "Blocked", contact your supervisor to request access. Once unblocked, it will appear as ready to start.
                </div>
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
        @keyframes slowZoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageContainer: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden'
  },
  pageBackground: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(/images/dashboard1-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: -1
  },
  content: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    width: '100%'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  loadingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(/images/loading-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'brightness(0.7)',
    zIndex: 0
  },
  loadingContent: {
    position: 'relative',
    textAlign: 'center',
    color: 'white',
    zIndex: 1,
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
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
    padding: '16px 24px',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.2)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
    letterSpacing: '1px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  headerDivider: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '20px',
    fontWeight: '300'
  },
  headerSubtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '400',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
  },
  logoutButton: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
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
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  welcomeName: {
    color: '#FFD700'
  },
  welcomeText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.9)',
    margin: 0,
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
  },
  progressBadge: {
    background: 'rgba(255,255,255,0.15)',
    padding: '8px 20px',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    border: '1px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)'
  },
  progressCount: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white'
  },
  progressTotal: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)'
  },
  progressLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
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
    fontFamily: 'inherit',
    backdropFilter: 'blur(10px)'
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
    gap: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
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
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
    color: '#64748b',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  progressSection: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 16px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
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
    background: 'rgba(227,242,253,0.95)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#1565c0',
    fontSize: '14px',
    border: '1px solid #90caf9',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
