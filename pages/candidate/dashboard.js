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
        // Transform to match the expected format in the UI
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
        // Ensure only one per type
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
      // Get completed assessments from candidate_assessments
      const { data: completed, error: completedError } = await supabase
        .from("candidate_assessments")
        .select("assessment_id, score, completed_at, status")
        .eq("user_id", session.user.id)
        .eq("status", "completed");

      if (!completedError && completed) {
        setCompletedAssessments(completed);
      }

      // Get in-progress assessments
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
    // Convert to percentage based on max score
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

  const handleStartAssessment = (e, assessmentId) => {
    e.preventDefault();
    e.stopPropagation();
    if (assessmentId) {
      router.push(`/assessment/${assessmentId}`);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const isPassed = (score) => {
    return score >= 80;
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingOverlay} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>🏢 Stratavax</div>
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
  const progressPercentage = totalAssessments > 0 ? Math.round((completedCount / totalAssessments) * 100) : 0;

  return (
    <AppLayout>
      {/* Hero Section with Parallax Background */}
      <div style={styles.heroWrapper}>
        <div style={styles.heroBackground} />
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>Candidate Dashboard</div>
          <h1 style={styles.heroTitle}>
            Welcome back, <span style={styles.heroName}>{userName}</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Track your progress and continue your assessments. Each assessment contains 100 questions and has its own time limit.
          </p>
          
          {/* Progress Card */}
          <div style={styles.progressCard}>
            <div style={styles.progressInfo}>
              <div style={styles.progressLabel}>Your Journey</div>
              <div style={styles.progressStats}>
                <span style={styles.progressCount}>{completedCount}</span>
                <span style={styles.progressTotal}>/{totalAssessments}</span>
                <span style={styles.progressText}>assessments completed</span>
              </div>
            </div>
            <div style={styles.progressCircleContainer}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progressPercentage * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                  style={styles.progressCircleFill}
                />
              </svg>
              <div style={styles.progressPercentage}>
                {progressPercentage}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div style={styles.waveDivider}>
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.container}>
          
          {/* Section Header */}
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Your Assessments</h2>
              <p style={styles.sectionDescription}>
                Select an assessment to begin or continue. Your progress is automatically saved.
              </p>
            </div>
            <div style={styles.statsBadge}>
              <span style={styles.statsIcon}>📊</span>
              <span style={styles.statsText}>{completedCount}/{totalAssessments} Completed</span>
            </div>
          </div>

          {/* Assessment Tabs */}
          {assessmentTypes.length > 0 && (
            <div style={styles.tabsContainer}>
              {assessmentTypes.map(tab => {
                const isActive = activeTab === tab.id;
                const hasAssessment = !!getAssessmentByType(tab.id);
                const bgConfig = assessmentBackgrounds[tab.id] || {
                  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#667eea'
                };
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => hasAssessment && setActiveTab(tab.id)}
                    disabled={!hasAssessment}
                    style={{
                      ...styles.tabButton,
                      background: isActive ? bgConfig.gradient : 'white',
                      color: isActive ? 'white' : '#64748b',
                      borderColor: isActive ? 'transparent' : '#e2e8f0',
                      opacity: hasAssessment ? 1 : 0.5,
                      boxShadow: isActive ? `0 10px 20px ${bgConfig.color}40` : 'none'
                    }}
                  >
                    <span style={styles.tabIcon}>{tab.icon}</span>
                    <div style={styles.tabInfo}>
                      <div style={styles.tabLabel}>{tab.shortLabel}</div>
                      <div style={styles.tabMeta}>
                        {hasAssessment ? '1 assessment' : 'Coming soon'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Tab Header */}
          {activeTypeConfig && (
            <div style={styles.activeTabHeader}>
              <div>
                <h3 style={styles.activeTabTitle}>
                  <span style={styles.activeTabIcon}>{activeTypeConfig.icon}</span>
                  {activeTypeConfig.label}
                </h3>
                <p style={styles.activeTabDescription}>{activeTypeConfig.description}</p>
              </div>
              <div style={{
                ...styles.activeTabBadge,
                background: activeTypeConfig.lightColor,
                color: activeTypeConfig.color
              }}>
                {activeAssessment ? (isAssessmentCompleted(activeAssessment.id) ? '✓ Completed' : '📝 Not Started') : 'No assessment'}
              </div>
            </div>
          )}

          {/* Assessment Cards */}
          {activeAssessment ? (
            <div style={styles.cardsGrid}>
              {(() => {
                const assessment = activeAssessment;
                const completed = isAssessmentCompleted(assessment.id);
                const inProgress = isAssessmentInProgress(assessment.id);
                const score = getAssessmentScore(assessment.id);
                const passed = completed && score >= 80;
                const bgConfig = assessmentBackgrounds[activeTab] || {
                  image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
                  pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
                  color: activeTypeConfig?.color || '#667eea'
                };
                const isHovered = hoveredCard === assessment.id;

                return (
                  <div
                    key={assessment.id}
                    style={{
                      ...styles.assessmentCard,
                      ...(isHovered && !completed && styles.assessmentCardHovered),
                      borderColor: completed 
                        ? passed 
                          ? '#4CAF50' 
                          : '#FF9800'
                        : inProgress
                          ? activeTypeConfig?.color || '#667eea'
                          : 'transparent',
                      cursor: completed ? 'default' : 'pointer'
                    }}
                    onMouseEnter={() => !completed && setHoveredCard(assessment.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => {
                      if (!completed && assessment) {
                        router.push(`/assessment/${assessment.id}`);
                      }
                    }}
                  >
                    {/* Card Background Image */}
                    <div style={{
                      ...styles.cardBackground,
                      backgroundImage: `url(${bgConfig.image})`,
                      opacity: isHovered && !completed ? 0.15 : 0.1,
                    }} />
                    
                    {/* Pattern Overlay */}
                    <div style={{
                      ...styles.cardPattern,
                      backgroundImage: `url(${bgConfig.pattern})`,
                      opacity: isHovered && !completed ? 0.1 : 0.05,
                    }} />

                    {/* Status Badge */}
                    <div style={{
                      ...styles.statusBadge,
                      background: completed 
                        ? passed 
                          ? 'linear-gradient(135deg, #4CAF50, #2E7D32)'
                          : 'linear-gradient(135deg, #FF9800, #F57C00)'
                        : inProgress
                          ? activeTypeConfig?.iconBg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #94a3b8, #64748b)',
                    }}>
                      {completed 
                        ? passed 
                          ? '✓ Passed' 
                          : '⚠️ Needs Review'
                        : inProgress
                          ? '🕐 In Progress'
                          : '📝 Ready to Start'
                      }
                    </div>

                    {/* Card Header */}
                    <div style={styles.cardHeader}>
                      <div style={{
                        ...styles.cardIcon,
                        background: activeTypeConfig?.iconBg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: isHovered && !completed ? `0 10px 20px ${bgConfig.color}40` : 'none',
                      }}>
                        {activeTypeConfig?.icon || '📋'}
                      </div>
                      <div style={styles.cardTitleWrapper}>
                        <h4 style={styles.cardTitle}>{assessment.title}</h4>
                        <div style={styles.cardMeta}>
                          <span style={styles.metaItem}>
                            <span style={styles.metaIcon}>⏱️</span> {activeTypeConfig?.duration || 60} mins
                          </span>
                          <span style={styles.metaItem}>
                            <span style={styles.metaIcon}>📝</span> {activeTypeConfig?.questions || 100} Q
                          </span>
                          <span style={styles.metaItem}>
                            <span style={styles.metaIcon}>🎯</span> 80% pass
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={styles.cardDescription}>
                      {isHovered && !completed ? activeTypeConfig?.longDescription : activeTypeConfig?.description}
                    </p>

                    {/* Features List - Show on Hover */}
                    {isHovered && !completed && activeTypeConfig?.features && (
                      <div style={styles.featuresList}>
                        {activeTypeConfig.features.map((feature, idx) => (
                          <span key={idx} style={styles.featureTag}>
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Score Display for Completed */}
                    {completed && (
                      <div style={{
                        ...styles.scoreCard,
                        background: passed 
                          ? 'linear-gradient(135deg, #E8F5E9, #C8E6C9)'
                          : 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
                        borderColor: passed ? '#4CAF50' : '#FF9800'
                      }}>
                        <div style={styles.scoreHeader}>
                          <span style={styles.scoreLabel}>Your Score</span>
                          <span style={{
                            ...styles.scoreValue,
                            color: passed ? '#2E7D32' : '#E65100'
                          }}>
                            {score}%
                          </span>
                        </div>
                        <div style={styles.scoreBar}>
                          <div style={{
                            ...styles.scoreBarFill,
                            width: `${score}%`,
                            background: passed 
                              ? 'linear-gradient(90deg, #4CAF50, #2E7D32)'
                              : 'linear-gradient(90deg, #FF9800, #F57C00)'
                          }} />
                        </div>
                        <div style={styles.scoreDate}>
                          {passed ? '✓ Passed' : '⚡ Below passing score (80%)'}
                        </div>
                      </div>
                    )}

                    {/* In Progress Indicator */}
                    {inProgress && !completed && (
                      <div style={{
                        ...styles.inProgressCard,
                        background: `${bgConfig.color}10`,
                        borderColor: bgConfig.color
                      }}>
                        <span style={styles.inProgressIcon}>🕐</span>
                        <span style={styles.inProgressText}>You have an assessment in progress</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {!completed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (assessment) {
                            router.push(`/assessment/${assessment.id}`);
                          }
                        }}
                        style={{
                          ...styles.actionButton,
                          background: inProgress 
                            ? activeTypeConfig?.iconBg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                          boxShadow: isHovered 
                            ? `0 20px 30px ${bgConfig.color}40`
                            : '0 4px 6px rgba(0,0,0,0.05)',
                        }}
                      >
                        <span style={styles.buttonIcon}>
                          {inProgress ? '🕐' : '🚀'}
                        </span>
                        <span style={styles.buttonText}>
                          {inProgress ? 'Continue Assessment' : 'Start Assessment'}
                        </span>
                      </button>
                    )}

                    {completed && (
                      <div style={styles.completedBadge}>
                        <span style={styles.completedIcon}>✓</span>
                        <span style={styles.completedText}>Assessment Completed</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>🔧</div>
              <h3 style={styles.emptyStateTitle}>Assessment Coming Soon</h3>
              <p style={styles.emptyStateText}>
                {activeTypeConfig?.label ? `The ${activeTypeConfig.label.toLowerCase()} is being prepared.` : 'No assessments available at this time.'} Please check back later.
              </p>
            </div>
          )}

          {/* Journey Progress Section */}
          <div style={styles.journeySection}>
            <h3 style={styles.journeyTitle}>
              <span style={styles.journeyIcon}>📈</span>
              Your Assessment Journey
            </h3>
            
            <div style={styles.journeyGrid}>
              {assessmentTypes.map(type => {
                const typeAssessment = getAssessmentByType(type.id);
                const hasAssessment = !!typeAssessment;
                const isCompleted = typeAssessment ? isAssessmentCompleted(typeAssessment.id) : false;
                const completedCount = isCompleted ? 1 : 0;
                const progress = isCompleted ? 100 : 0;
                const bgConfig = assessmentBackgrounds[type.id] || {
                  color: '#667eea'
                };
                
                return (
                  <div key={type.id} style={{
                    ...styles.journeyCard,
                    background: `linear-gradient(135deg, ${type.color}08, ${type.color}02)`,
                    borderColor: isCompleted ? type.color : '#e2e8f0',
                    opacity: hasAssessment ? 1 : 0.6
                  }}>
                    <div style={styles.journeyCardHeader}>
                      <span style={styles.journeyCardIcon}>{type.icon}</span>
                      <div>
                        <span style={{...styles.journeyCardLabel, color: type.color}}>
                          {type.shortLabel}
                        </span>
                        {isCompleted && (
                          <span style={styles.journeyCardCompleted}>✓ Completed</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.journeyCardProgress}>
                      <span style={styles.journeyCardStat}>{completedCount}/1</span>
                      <div style={styles.journeyProgressBar}>
                        <div style={{
                          ...styles.journeyProgressFill,
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${type.color}, ${type.color}dd)`
                        }} />
                      </div>
                    </div>
                    {!hasAssessment && (
                      <div style={styles.journeyComingSoon}>Coming soon</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guidelines Section */}
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
                    You don't need to complete all assessments at once. Take them one at a time when you're ready. 
                    Your progress is automatically saved, and you can always return to continue.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.footerLeft}>
              <span style={styles.footerLogo}>🏢 Stratavax</span>
              <span style={styles.footerCopyright}>© 2025 Assessment Portal</span>
            </div>
            <div style={styles.footerRight}>
              <span style={styles.footerEmail}>support@stratavax.com</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/login");
                }}
                style={styles.logoutButton}
                onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Logout
              </button>
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
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </AppLayout>
  );
}

// ===== STYLES ===== (keeping all your existing styles)
const styles = {
  loadingContainer: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a2639 0%, #2d3748 100%)',
    overflow: 'hidden'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    filter: 'blur(10px)'
  },
  loadingContent: {
    position: 'relative',
    textAlign: 'center',
    color: 'white',
    zIndex: 1,
    animation: 'slideIn 0.5s ease'
  },
  loadingLogo: {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '30px',
    letterSpacing: '2px'
  },
  loadingSpinner: {
    width: '70px',
    height: '70px',
    border: '5px solid rgba(255,255,255,0.2)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 30px'
  },
  loadingText: {
    fontSize: '18px',
    opacity: 0.9
  },
  heroWrapper: {
    position: 'relative',
    height: '400px',
    overflow: 'hidden'
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'brightness(0.7)',
    transform: 'scale(1.1)',
    animation: 'slowZoom 20s infinite alternate'
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(102,126,234,0.95) 0%, rgba(118,75,162,0.95) 100%)'
  },
  heroContent: {
    position: 'relative',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '60px 20px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  heroBadge: {
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: '800',
    marginBottom: '20px',
    lineHeight: 1.2
  },
  heroName: {
    color: '#FFEAA7',
    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  heroSubtitle: {
    fontSize: '18px',
    maxWidth: '800px',
    marginBottom: '40px',
    opacity: 0.95,
    lineHeight: 1.6
  },
  progressCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px 35px',
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  progressInfo: {
    textAlign: 'left'
  },
  progressLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  progressStats: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '5px'
  },
  progressCount: {
    fontSize: '48px',
    fontWeight: '800',
    lineHeight: 1
  },
  progressTotal: {
    fontSize: '24px',
    opacity: 0.8,
    marginLeft: '5px'
  },
  progressText: {
    fontSize: '16px',
    marginLeft: '15px',
    opacity: 0.9
  },
  progressCircleContainer: {
    position: 'relative',
    width: '100px',
    height: '100px'
  },
  progressCircleFill: {
    transition: 'stroke-dasharray 0.5s ease'
  },
  progressPercentage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '24px',
    fontWeight: '700'
  },
  waveDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    lineHeight: 0
  },
  mainContent: {
    background: '#f8fafc',
    padding: '40px 0'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  sectionTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a2639',
    marginBottom: '10px'
  },
  sectionDescription: {
    fontSize: '16px',
    color: '#64748b',
    maxWidth: '600px',
    lineHeight: 1.6
  },
  statsBadge: {
    background: 'white',
    padding: '12px 24px',
    borderRadius: '40px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statsIcon: {
    fontSize: '20px'
  },
  statsText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a2639'
  },
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  tabButton: {
    padding: '12px 24px',
    border: '2px solid',
    borderRadius: '40px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    flex: '1 1 auto',
    minWidth: '160px'
  },
  tabIcon: {
    fontSize: '20px'
  },
  tabInfo: {
    textAlign: 'left'
  },
  tabLabel: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px'
  },
  tabMeta: {
    fontSize: '11px',
    opacity: 0.8
  },
  activeTabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    padding: '20px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  activeTabTitle: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a2639',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  activeTabIcon: {
    fontSize: '28px'
  },
  activeTabDescription: {
    margin: 0,
    color: '#64748b',
    fontSize: '14px'
  },
  activeTabBadge: {
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '30px',
    marginBottom: '50px'
  },
  assessmentCard: {
    position: 'relative',
    background: 'white',
    borderRadius: '24px',
    padding: '35px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '2px solid transparent',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  assessmentCardHovered: {
    transform: 'translateY(-8px)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.12)'
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 0.3s ease',
    zIndex: 0
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundRepeat: 'repeat',
    transition: 'opacity 0.3s ease',
    zIndex: 0
  },
  statusBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    zIndex: 2
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    position: 'relative',
    zIndex: 2
  },
  cardIcon: {
    width: '70px',
    height: '70px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    transition: 'all 0.3s ease',
    flexShrink: 0
  },
  cardTitleWrapper: {
    flex: 1
  },
  cardTitle: {
    margin: '0 0 10px 0',
    color: '#1a2639',
    fontSize: '24px',
    fontWeight: '700'
  },
  cardMeta: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  metaItem: {
    fontSize: '14px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  metaIcon: {
    fontSize: '16px'
  },
  cardDescription: {
    position: 'relative',
    zIndex: 2,
    color: '#475569',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '10px',
    minHeight: '70px'
  },
  featuresList: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px'
  },
  featureTag: {
    padding: '6px 16px',
    background: '#f1f5f9',
    borderRadius: '30px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#475569'
  },
  scoreCard: {
    position: 'relative',
    zIndex: 2,
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid',
    marginBottom: '10px'
  },
  scoreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  scoreLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  scoreValue: {
    fontSize: '28px',
    fontWeight: '700'
  },
  scoreBar: {
    height: '10px',
    background: '#e2e8f0',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '12px'
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s ease'
  },
  scoreDate: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'right'
  },
  inProgressCard: {
    position: 'relative',
    zIndex: 2,
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px'
  },
  inProgressIcon: {
    fontSize: '20px'
  },
  inProgressText: {
    fontSize: '14px',
    fontWeight: '500'
  },
  actionButton: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    padding: '18px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  buttonIcon: {
    fontSize: '22px'
  },
  buttonText: {
    letterSpacing: '0.5px'
  },
  completedBadge: {
    position: 'relative',
    zIndex: 2,
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '16px',
    fontSize: '14px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center'
  },
  completedIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#4caf50',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px'
  },
  completedText: {
    fontWeight: '500'
  },
  emptyState: {
    background: 'white',
    borderRadius: '16px',
    padding: '60px 20px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '50px'
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  emptyStateTitle: {
    color: '#1a2639',
    marginBottom: '10px',
    fontSize: '24px',
    fontWeight: '600'
  },
  emptyStateText: {
    color: '#64748b',
    maxWidth: '400px',
    margin: '0 auto',
    fontSize: '16px'
  },
  journeySection: {
    marginBottom: '50px'
  },
  journeyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a2639',
    marginBottom: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  journeyIcon: {
    fontSize: '28px'
  },
  journeyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  journeyCard: {
    padding: '20px',
    borderRadius: '16px',
    border: '2px solid',
    transition: 'transform 0.2s ease'
  },
  journeyCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px'
  },
  journeyCardIcon: {
    fontSize: '24px'
  },
  journeyCardLabel: {
    fontSize: '16px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '4px'
  },
  journeyCardCompleted: {
    fontSize: '11px',
    color: '#4caf50',
    fontWeight: '500'
  },
  journeyCardProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  journeyCardStat: {
    fontSize: '18px',
    fontWeight: '700',
    minWidth: '45px'
  },
  journeyProgressBar: {
    flex: 1,
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  journeyProgressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  journeyComingSoon: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '10px',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  guidelinesWrapper: {
    position: 'relative',
    borderRadius: '32px',
    overflow: 'hidden',
    marginBottom: '40px'
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
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '30px 0',
    borderTop: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '20px'
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  footerLogo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a2639'
  },
  footerCopyright: {
    fontSize: '14px',
    color: '#64748b'
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  footerEmail: {
    fontSize: '14px',
    color: '#64748b'
  },
  logoutButton: {
    padding: '10px 24px',
    background: 'transparent',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  }
};
