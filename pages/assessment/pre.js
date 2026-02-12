import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

export default function PreAssessmentPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  const [assessments, setAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const [inProgressAssessments, setInProgressAssessments] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);

  // ===== BACKGROUND IMAGES FOR EACH ASSESSMENT TYPE =====
  const assessmentBackgrounds = {
    general: {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
      overlay: 'rgba(102, 126, 234, 0.85)'
    },
    behavioral: {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/always-grey.png',
      overlay: 'rgba(240, 147, 251, 0.85)'
    },
    cognitive: {
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      image: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/stardust.png',
      overlay: 'rgba(79, 172, 254, 0.85)'
    },
    cultural: {
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
      overlay: 'rgba(67, 233, 123, 0.85)'
    },
    manufacturing: {
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
      overlay: 'rgba(250, 112, 154, 0.85)'
    },
    leadership: {
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
      pattern: 'https://www.transparenttextures.com/patterns/dark-mosaic.png',
      overlay: 'rgba(255, 154, 158, 0.85)'
    }
  };

  // ===== ASSESSMENT TYPE CONFIGURATION =====
  const assessmentTypes = [
    { 
      id: 'general', 
      label: '📋 General Assessment', 
      shortLabel: 'General',
      description: 'Comprehensive 5-area evaluation of cognitive abilities, personality, leadership, technical competence, and performance',
      longDescription: 'This assessment provides a holistic view of your capabilities across five critical dimensions. It measures your cognitive agility, personality traits, leadership potential, technical expertise, and performance orientation.',
      icon: '📋',
      iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#667eea',
      lightColor: 'rgba(102, 126, 234, 0.1)',
      duration: 180,
      questions: 100,
      passing: 60,
      features: ['Cognitive Abilities', 'Personality Traits', 'Leadership Potential', 'Technical Competence', 'Performance Metrics']
    },
    { 
      id: 'behavioral', 
      label: '🧠 Behavioral & Soft Skills', 
      shortLabel: 'Behavioral',
      description: 'Communication, teamwork, emotional intelligence, adaptability, initiative, time management, and resilience',
      longDescription: 'Evaluate your interpersonal skills and workplace behaviors that predict long-term success. This assessment measures how you interact with others, handle challenges, and contribute to team dynamics.',
      icon: '🧠',
      iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#f5576c',
      lightColor: 'rgba(245, 87, 108, 0.1)',
      duration: 180,
      questions: 100,
      passing: 70,
      features: ['Adaptability', 'Emotional Intelligence', 'Communication', 'Teamwork', 'Initiative', 'Time Management', 'Resilience']
    },
    { 
      id: 'cognitive', 
      label: '💡 Cognitive & Thinking Skills', 
      shortLabel: 'Cognitive',
      description: 'Problem-solving, critical thinking, learning agility, creativity, and analytical reasoning',
      longDescription: 'Assess your mental agility and reasoning capabilities. This assessment challenges your problem-solving approaches, critical analysis skills, ability to learn quickly, and creative thinking capacity.',
      icon: '💡',
      iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#4facfe',
      lightColor: 'rgba(79, 172, 254, 0.1)',
      duration: 180,
      questions: 100,
      passing: 65,
      features: ['Problem-Solving', 'Critical Thinking', 'Learning Agility', 'Creativity', 'Analytical Reasoning']
    },
    { 
      id: 'cultural', 
      label: '🤝 Cultural & Attitudinal Fit', 
      shortLabel: 'Cultural',
      description: 'Values alignment, organizational citizenship, reliability, customer focus, safety awareness, and commercial acumen',
      longDescription: 'Determine your alignment with organizational values and work culture. This evaluation focuses on your ethical framework, reliability, customer orientation, safety consciousness, and business awareness.',
      icon: '🤝',
      iconBg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      color: '#43e97b',
      lightColor: 'rgba(67, 233, 123, 0.1)',
      duration: 180,
      questions: 100,
      passing: 75,
      features: ['Values Alignment', 'Citizenship', 'Reliability', 'Customer Focus', 'Safety', 'Commercial Acumen']
    },
    { 
      id: 'manufacturing', 
      label: '⚙️ Manufacturing Technical Skills', 
      shortLabel: 'Manufacturing',
      description: 'Blowing machines, Labeler, Filling, Conveyors, Stretchwrappers, Shrinkwrappers, Date coders, and Raw materials',
      longDescription: 'Demonstrate your technical expertise in manufacturing operations. This comprehensive assessment covers all critical equipment and processes including blow molding, labeling, filling, conveying, wrapping, coding, and material science.',
      icon: '⚙️',
      iconBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      color: '#fa709a',
      lightColor: 'rgba(250, 112, 154, 0.1)',
      duration: 180,
      questions: 100,
      passing: 75,
      features: ['Blowing Machines', 'Labeler', 'Filling', 'Conveyors', 'Stretchwrappers', 'Shrinkwrappers', 'Date Coders', 'Raw Materials']
    },
    { 
      id: 'leadership', 
      label: '👑 Leadership Potential', 
      shortLabel: 'Leadership',
      description: 'Vision setting, team development, coaching, decision-making, influence, and strategic leadership',
      longDescription: 'Uncover your leadership capabilities and potential for growth. This assessment measures your ability to set direction, develop others, make sound decisions, influence stakeholders, and think strategically.',
      icon: '👑',
      iconBg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      color: '#ff9a9e',
      lightColor: 'rgba(255, 154, 158, 0.1)',
      duration: 180,
      questions: 100,
      passing: 75,
      features: ['Vision', 'Team Development', 'Coaching', 'Decision-Making', 'Influence', 'Strategic Thinking']
    }
  ];

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Candidate');
      fetchAssessments();
      fetchUserProgress();
    }
  }, [session]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      
      if (data) {
        const assessmentMap = {};
        data.forEach(assessment => {
          assessmentMap[assessment.assessment_type] = assessment;
        });
        setAssessments(assessmentMap);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const { data: completed, error: completedError } = await supabase
        .from("assessment_results")
        .select("assessment_id, overall_score, completed_at, status")
        .eq("user_id", session.user.id)
        .eq("status", "completed");

      if (!completedError && completed) {
        setCompletedAssessments(completed);
      }

      const { data: inProgress, error: inProgressError } = await supabase
        .from("assessment_results")
        .select("assessment_id, time_spent, updated_at")
        .eq("user_id", session.user.id)
        .eq("status", "in_progress");

      if (!inProgressError && inProgress) {
        setInProgressAssessments(inProgress);
      }
    } catch (error) {
      console.error("Error fetching user progress:", error);
    }
  };

  const getAssessmentById = (type) => {
    return assessments[type];
  };

  const isAssessmentCompleted = (assessmentId) => {
    return completedAssessments.some(a => a.assessment_id === assessmentId);
  };

  const isAssessmentInProgress = (assessmentId) => {
    return inProgressAssessments.some(a => a.assessment_id === assessmentId);
  };

  const getAssessmentScore = (assessmentId) => {
    const completed = completedAssessments.find(a => a.assessment_id === assessmentId);
    return completed?.overall_score || null;
  };

  const getCompletedCount = () => {
    return completedAssessments.length;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>🏢 Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Preparing your assessments...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const completedCount = getCompletedCount();
  const totalAssessments = 6;
  const progressPercentage = Math.round((completedCount / totalAssessments) * 100);

  return (
    <AppLayout>
      {/* Hero Section with Parallax Background */}
      <div style={styles.heroWrapper}>
        <div style={styles.heroBackground} />
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>Assessment Portal</div>
          <h1 style={styles.heroTitle}>
            Welcome back, <span style={styles.heroName}>{userName}</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Select an assessment to begin. Each assessment contains 100 questions and has a 180-minute time limit.
            Your progress is automatically saved.
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
              <h2 style={styles.sectionTitle}>Available Assessments</h2>
              <p style={styles.sectionDescription}>
                Choose from 6 comprehensive assessments designed to evaluate different aspects of your professional capabilities
              </p>
            </div>
            <div style={styles.statsBadge}>
              <span style={styles.statsIcon}>📊</span>
              <span style={styles.statsText}>{completedCount}/{totalAssessments} Completed</span>
            </div>
          </div>

          {/* Assessment Grid */}
          <div style={styles.assessmentGrid}>
            {assessmentTypes.map((type) => {
              const assessment = getAssessmentById(type.id);
              const hasAssessment = !!assessment;
              const isCompleted = assessment ? isAssessmentCompleted(assessment.id) : false;
              const isInProgress = assessment ? isAssessmentInProgress(assessment.id) : false;
              const score = assessment ? getAssessmentScore(assessment.id) : null;
              const passed = isCompleted && score >= type.passing;
              const bgConfig = assessmentBackgrounds[type.id];
              const isHovered = hoveredCard === type.id;

              if (!hasAssessment) return null;

              return (
                <div
                  key={type.id}
                  style={{
                    ...styles.assessmentCard,
                    ...(isHovered && styles.assessmentCardHovered),
                    background: isCompleted 
                      ? 'linear-gradient(145deg, #ffffff, #f8fafc)'
                      : 'white',
                    borderColor: isCompleted 
                      ? passed 
                        ? '#4CAF50' 
                        : '#FF9800'
                      : isInProgress
                        ? type.color
                        : 'rgba(226, 232, 240, 0.5)',
                    opacity: isCompleted ? 0.9 : 1
                  }}
                  onMouseEnter={() => setHoveredCard(type.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => {
                    if (!isCompleted && assessment) {
                      router.push(`/assessment/${assessment.id}`);
                    }
                  }}
                >
                  {/* Card Background Image with Overlay */}
                  <div style={{
                    ...styles.cardBackground,
                    backgroundImage: `url(${bgConfig.image})`,
                    opacity: isHovered ? 0.15 : 0.1,
                  }} />
                  
                  {/* Pattern Overlay */}
                  <div style={{
                    ...styles.cardPattern,
                    backgroundImage: `url(${bgConfig.pattern})`,
                    opacity: isHovered ? 0.1 : 0.05,
                  }} />

                  {/* Status Badge */}
                  <div style={{
                    ...styles.statusBadge,
                    background: isCompleted 
                      ? passed 
                        ? 'linear-gradient(135deg, #4CAF50, #2E7D32)'
                        : 'linear-gradient(135deg, #FF9800, #F57C00)'
                      : isInProgress
                        ? type.iconBg
                        : 'linear-gradient(135deg, #94a3b8, #64748b)',
                  }}>
                    {isCompleted 
                      ? passed 
                        ? '✓ Passed' 
                        : '⚠️ Needs Review'
                      : isInProgress
                        ? '🕐 In Progress'
                        : '📝 Ready to Start'
                    }
                  </div>

                  {/* Card Header with Icon */}
                  <div style={styles.cardHeader}>
                    <div style={{
                      ...styles.cardIcon,
                      background: type.iconBg,
                      boxShadow: isHovered ? `0 10px 20px ${type.color}40` : 'none',
                    }}>
                      {type.icon}
                    </div>
                    <div style={styles.cardTitleWrapper}>
                      <h3 style={styles.cardTitle}>{type.label}</h3>
                      <div style={styles.cardMeta}>
                        <span style={styles.metaItem}>
                          <span style={styles.metaIcon}>⏱️</span> 180 mins
                        </span>
                        <span style={styles.metaItem}>
                          <span style={styles.metaIcon}>📝</span> {type.questions} Q
                        </span>
                        <span style={styles.metaItem}>
                          <span style={styles.metaIcon}>🎯</span> {type.passing}% pass
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={styles.cardDescription}>
                    {isHovered ? type.longDescription : type.description}
                  </p>

                  {/* Features List - Show on Hover */}
                  {isHovered && (
                    <div style={styles.featuresList}>
                      {type.features.map((feature, idx) => (
                        <span key={idx} style={styles.featureTag}>
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Score Display for Completed */}
                  {isCompleted && (
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
                    </div>
                  )}

                  {/* In Progress Indicator */}
                  {isInProgress && !isCompleted && (
                    <div style={{
                      ...styles.inProgressCard,
                      background: `${type.color}10`,
                      borderColor: type.color
                    }}>
                      <span style={styles.inProgressIcon}>🕐</span>
                      <span style={styles.inProgressText}>You have an assessment in progress</span>
                    </div>
                  )}

                  {/* Action Button */}
                  {!isCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (assessment) {
                          router.push(`/assessment/${assessment.id}`);
                        }
                      }}
                      style={{
                        ...styles.actionButton,
                        background: isInProgress 
                          ? type.iconBg
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        boxShadow: isHovered 
                          ? `0 20px 30px ${type.color}40`
                          : '0 4px 6px rgba(0,0,0,0.05)',
                      }}
                    >
                      <span style={styles.buttonIcon}>
                        {isInProgress ? '🕐' : '🚀'}
                      </span>
                      <span style={styles.buttonText}>
                        {isInProgress ? 'Continue Assessment' : 'Start Assessment'}
                      </span>
                    </button>
                  )}

                  {isCompleted && (
                    <div style={styles.completedBadge}>
                      <span style={styles.completedIcon}>✓</span>
                      <span style={styles.completedText}>
                        Completed on {new Date(completedAssessments.find(a => a.assessment_id === assessment?.id)?.completed_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Guidelines Section with Background */}
          <div style={styles.guidelinesWrapper}>
            <div style={styles.guidelinesBackground} />
            <div style={styles.guidelinesContent}>
              <div style={styles.guidelinesHeader}>
                <span style={styles.guidelinesIcon}>📌</span>
                <h3 style={styles.guidelinesTitle}>Assessment Guidelines</h3>
              </div>
              
              <div style={styles.guidelinesGrid}>
                <div style={styles.guidelineCard}>
                  <div style={styles.guidelineIconWrapper}>
                    <span style={styles.guidelineIcon}>⏰</span>
                  </div>
                  <div style={styles.guidelineTextWrapper}>
                    <h4 style={styles.guidelineTitle}>180-Minute Timer</h4>
                    <p style={styles.guidelineText}>
                      All assessments have a fixed 180-minute time limit. The timer starts when you begin and pauses if you log off.
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
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ===== STYLES =====
const styles = {
  // Loading
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContent: {
    textAlign: 'center',
    color: 'white'
  },
  loadingLogo: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '30px'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '5px solid rgba(255,255,255,0.3)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingText: {
    fontSize: '18px',
    opacity: 0.9
  },

  // Hero Section
  heroWrapper: {
    position: 'relative',
    height: '480px',
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

  // Main Content
  mainContent: {
    background: '#f8fafc',
    padding: '60px 0'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '40px',
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

  // Assessment Grid
  assessmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '30px',
    marginBottom: '60px'
  },
  assessmentCard: {
    position: 'relative',
    background: 'white',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '2px solid transparent',
    cursor: 'pointer',
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
    padding: '6px 16px',
    borderRadius: '30px',
    fontSize: '12px',
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
    margin: '0 0 8px 0',
    color: '#1a2639',
    fontSize: '20px',
    fontWeight: '700'
  },
  cardMeta: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  metaItem: {
    fontSize: '12px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  metaIcon: {
    fontSize: '14px'
  },
  cardDescription: {
    position: 'relative',
    zIndex: 2,
    color: '#475569',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '10px',
    minHeight: '65px'
  },
  featuresList: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '15px'
  },
  featureTag: {
    padding: '4px 12px',
    background: '#f1f5f9',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#475569'
  },
  scoreCard: {
    position: 'relative',
    zIndex: 2,
    borderRadius: '16px',
    padding: '16px',
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
    fontSize: '24px',
    fontWeight: '700'
  },
  scoreBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
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
    padding: '16px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  buttonIcon: {
    fontSize: '20px'
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

  // Guidelines Section
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

  // Footer
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

// Add global animations
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slowZoom {
    0% { transform: scale(1); }
    100% { transform: scale(1.1); }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}
