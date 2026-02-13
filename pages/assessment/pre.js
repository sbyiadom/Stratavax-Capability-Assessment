// pages/assessment/pre.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== CATEGORY CONFIGURATIONS WITH BACKGROUND IMAGES =====
const CATEGORY_CONFIG = {
  'Cognitive': {
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #2C3E50 100%)',
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '🧠',
    bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
    description: 'Analytical thinking, problem-solving, and reasoning'
  },
  'Behavioral': {
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #C62828 100%)',
    lightBg: 'rgba(255, 107, 107, 0.1)',
    icon: '😊',
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/always-grey.png',
    description: 'Communication, teamwork, and emotional intelligence'
  },
  'Leadership': {
    gradient: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
    lightBg: 'rgba(211, 47, 47, 0.1)',
    icon: '👑',
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/dark-mosaic.png',
    description: 'Vision, influence, and team development'
  },
  'Manufacturing': {
    gradient: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)',
    lightBg: 'rgba(56, 142, 60, 0.1)',
    icon: '⚙️',
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
    description: 'Technical skills and equipment knowledge'
  },
  'Cultural': {
    gradient: 'linear-gradient(135deg, #9C89B8 0%, #6B4E71 100%)',
    lightBg: 'rgba(156, 137, 184, 0.1)',
    icon: '🌍',
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
    description: 'Values alignment and organizational fit'
  },
  'Technical': {
    gradient: 'linear-gradient(135deg, #1982C4 0%, #0A4D6E 100%)',
    lightBg: 'rgba(25, 130, 196, 0.1)',
    icon: '💻',
    bgImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/brick-wall.png',
    description: 'Technical knowledge and practical skills'
  },
  'General': {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    lightBg: 'rgba(102, 126, 234, 0.1)',
    icon: '📋',
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
    description: 'General assessments and evaluations'
  }
};

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userStats, setUserStats] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    checkUser();
    fetchAssessments();
    fetchUserStats();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSession(session);
    } catch (error) {
      console.error("Error checking session:", error);
      router.push("/login");
    }
  };

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          assessment_categories (
            id,
            name,
            description,
            icon
          )
        `)
        .eq("is_active", true)
        .order("category_id")
        .order("name");

      if (error) throw error;

      // Get question counts for each assessment
      const assessmentsWithCounts = await Promise.all(
        (data || []).map(async (assessment) => {
          const { count, error: countError } = await supabase
            .from("questions")
            .select("*", { count: 'exact', head: true })
            .eq("assessment_id", assessment.id);

          if (countError) {
            console.error(`Error counting questions for ${assessment.id}:`, countError);
            return { ...assessment, question_count: 0 };
          }

          return { ...assessment, question_count: count || 0 };
        })
      );

      setAssessments(assessmentsWithCounts);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setError("Failed to load assessments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get completed assessments
      const { data: completed, error: completedError } = await supabase
        .from("assessment_results")
        .select("assessment_id, score, completed_at")
        .eq("user_id", session.user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (completedError) throw completedError;

      // Get in-progress assessments
      const { data: inProgress, error: progressError } = await supabase
        .from("assessment_timer_progress")
        .select("assessment_id, elapsed_seconds, started_at")
        .eq("user_id", session.user.id)
        .eq("status", "in_progress");

      if (progressError) throw progressError;

      setUserStats({
        completed: completed || [],
        inProgress: inProgress || [],
        totalCompleted: completed?.length || 0,
        averageScore: completed?.length 
          ? Math.round(completed.reduce((acc, curr) => acc + (curr.score || 0), 0) / completed.length)
          : 0
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handleStartAssessment = async (assessmentId) => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    try {
      // Check if already completed
      const { data: existing, error: checkError } = await supabase
        .from("assessment_results")
        .select("id")
        .eq("assessment_id", assessmentId)
        .eq("user_id", session.user.id)
        .eq("status", "completed")
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        alert("You have already completed this assessment. Each assessment can only be taken once.");
        return;
      }

      // Check if there's an in-progress assessment
      const { data: inProgress, error: progressError } = await supabase
        .from("assessment_timer_progress")
        .select("*")
        .eq("assessment_id", assessmentId)
        .eq("user_id", session.user.id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (progressError) throw progressError;

      if (inProgress) {
        const confirmResume = confirm(
          "You have an incomplete attempt for this assessment. Would you like to continue?"
        );
        if (confirmResume) {
          router.push(`/assessment/${assessmentId}`);
        }
        return;
      }

      // Start new assessment
      router.push(`/assessment/${assessmentId}`);
    } catch (error) {
      console.error("Error starting assessment:", error);
      alert("Failed to start assessment. Please try again.");
    }
  };

  const getCategoryConfig = (categoryName) => {
    return CATEGORY_CONFIG[categoryName] || CATEGORY_CONFIG['General'];
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesCategory = selectedCategory === "all" || assessment.category_id === selectedCategory;
    const matchesSearch = assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assessment.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assessment.assessment_categories?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Map(
    assessments
      .filter(a => a.assessment_categories)
      .map(a => [a.assessment_categories.id, a.assessment_categories])
  ).values()];

  const isAssessmentCompleted = (assessmentId) => {
    return userStats?.completed?.some(c => c.assessment_id === assessmentId) || false;
  };

  const isAssessmentInProgress = (assessmentId) => {
    return userStats?.inProgress?.some(p => p.assessment_id === assessmentId) || false;
  };

  const getAssessmentProgress = (assessmentId) => {
    const progress = userStats?.inProgress?.find(p => p.assessment_id === assessmentId);
    return progress?.elapsed_seconds || 0;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingOverlay} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>
            <span style={styles.loadingLogoGradient}>Stratavax</span>
          </div>
          <div style={styles.loadingSpinnerContainer}>
            <div style={styles.loadingSpinner} />
          </div>
          <div style={styles.loadingTitle}>Loading Assessments</div>
          <div style={styles.loadingSubtitle}>Please wait while we prepare your assessments...</div>
          <div style={styles.loadingProgress}>
            <div style={styles.loadingProgressBar} />
          </div>
        </div>
      </div>
    );
  }

  const backgroundConfig = selectedCategory === "all" 
    ? CATEGORY_CONFIG['General']
    : getCategoryConfig(categories.find(c => c.id === selectedCategory)?.name);

  return (
    <div style={styles.container}>
      {/* Dynamic Background based on selected category */}
      <div style={{
        ...styles.backgroundImage,
        backgroundImage: `url(${backgroundConfig.bgImage})`,
      }} />
      <div style={{
        ...styles.backgroundOverlay,
        background: `linear-gradient(135deg, ${backgroundConfig.gradient.split(',')[0].replace('linear-gradient(135deg,', '')}, ${backgroundConfig.gradient.split(',')[1]})`,
        opacity: 0.85
      }} />
      <div style={{
        ...styles.backgroundPattern,
        backgroundImage: `url(${backgroundConfig.pattern})`,
      }} />
      
      {/* Content */}
      <div style={styles.content}>
        {/* Header */}
        <div style={{
          ...styles.header,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.logo}>
                <span style={styles.logoText}>🏢 Stratavax</span>
              </div>
              <div style={styles.headerTitle}>Assessment Center</div>
            </div>
            
            <div style={styles.headerRight}>
              {session && (
                <div style={styles.userInfo}>
                  <div style={styles.userAvatar}>
                    {session.user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span style={styles.userEmail}>{session.user.email}</span>
                  <button
                    onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
                    style={styles.logoutButton}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Banner */}
        {userStats && (
          <div style={styles.statsBanner}>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <div style={styles.statIconContainer}>
                  <span style={styles.statIcon}>✅</span>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{userStats.totalCompleted}</div>
                  <div style={styles.statLabel}>Completed</div>
                </div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statIconContainer}>
                  <span style={styles.statIcon}>📊</span>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{userStats.averageScore}%</div>
                  <div style={styles.statLabel}>Avg. Score</div>
                </div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statIconContainer}>
                  <span style={styles.statIcon}>⏳</span>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{userStats.inProgress.length}</div>
                  <div style={styles.statLabel}>In Progress</div>
                </div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statIconContainer}>
                  <span style={styles.statIcon}>📋</span>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{assessments.length}</div>
                  <div style={styles.statLabel}>Available</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <span style={styles.sidebarIcon}>🔍</span>
              <h3 style={styles.sidebarTitle}>Filters</h3>
            </div>

            {/* Search */}
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* Categories */}
            <div style={styles.categoriesContainer}>
              <div style={styles.categoriesHeader}>
                <span style={styles.categoriesIcon}>📂</span>
                <span style={styles.categoriesTitle}>Categories</span>
              </div>
              
              <button
                onClick={() => setSelectedCategory("all")}
                onMouseEnter={() => setHoveredCategory("all")}
                onMouseLeave={() => setHoveredCategory(null)}
                style={{
                  ...styles.categoryButton,
                  background: selectedCategory === "all" || hoveredCategory === "all"
                    ? CATEGORY_CONFIG['General'].gradient
                    : 'white',
                  color: selectedCategory === "all" || hoveredCategory === "all" ? 'white' : '#1e293b',
                  borderColor: selectedCategory === "all" || hoveredCategory === "all" ? 'transparent' : '#e2e8f0',
                  transform: hoveredCategory === "all" ? 'translateX(5px)' : 'translateX(0)'
                }}
              >
                <span style={styles.categoryIcon}>📋</span>
                All Assessments
                <span style={{
                  ...styles.categoryCount,
                  background: selectedCategory === "all" || hoveredCategory === "all"
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(0,0,0,0.05)',
                  color: selectedCategory === "all" || hoveredCategory === "all" ? 'white' : '#64748b'
                }}>
                  {assessments.length}
                </span>
              </button>

              {categories.map((category) => {
                const config = getCategoryConfig(category.name);
                const isSelected = selectedCategory === category.id;
                const isHovered = hoveredCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    onMouseEnter={() => setHoveredCategory(category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      ...styles.categoryButton,
                      background: isSelected || isHovered
                        ? config.gradient
                        : 'white',
                      color: isSelected || isHovered ? 'white' : '#1e293b',
                      borderColor: isSelected || isHovered ? 'transparent' : '#e2e8f0',
                      transform: isHovered ? 'translateX(5px)' : 'translateX(0)'
                    }}
                  >
                    <span style={styles.categoryIcon}>
                      {category.icon || config.icon}
                    </span>
                    {category.name}
                    <span style={{
                      ...styles.categoryCount,
                      background: isSelected || isHovered
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(0,0,0,0.05)',
                      color: isSelected || isHovered ? 'white' : '#64748b'
                    }}>
                      {assessments.filter(a => a.category_id === category.id).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Tips */}
            <div style={styles.tipsContainer}>
              <div style={styles.tipsHeader}>
                <span style={styles.tipsIcon}>💡</span>
                <span style={styles.tipsTitle}>Quick Tips</span>
              </div>
              <ul style={styles.tipsList}>
                <li style={styles.tipItem}>
                  <span style={styles.tipIcon}>✓</span>
                  Each assessment has 100 questions
                </li>
                <li style={styles.tipItem}>
                  <span style={styles.tipIcon}>⏱️</span>
                  180 minutes time limit
                </li>
                <li style={styles.tipItem}>
                  <span style={styles.tipIcon}>🔄</span>
                  Answers auto-save
                </li>
                <li style={styles.tipItem}>
                  <span style={styles.tipIcon}>📱</span>
                  Works on all devices
                </li>
                <li style={styles.tipItem}>
                  <span style={styles.tipIcon}>🛡️</span>
                  Anti-cheat enabled
                </li>
                <li style={styles.tipItem}>
                  <span style={styles.tipIcon}>✅</span>
                  One attempt only
                </li>
              </ul>
            </div>
          </div>

          {/* Assessments Grid */}
          <div style={styles.assessmentsContainer}>
            <div style={styles.assessmentsHeader}>
              <h2 style={styles.assessmentsTitle}>
                {selectedCategory === "all" 
                  ? "All Assessments" 
                  : categories.find(c => c.id === selectedCategory)?.name || "Assessments"}
              </h2>
              <div style={styles.assessmentsCountContainer}>
                <span style={styles.assessmentsCount}>
                  {filteredAssessments.length} available
                </span>
              </div>
            </div>

            {error && (
              <div style={styles.errorBanner}>
                <span style={styles.errorIcon}>⚠️</span>
                <span style={styles.errorMessage}>{error}</span>
                <button 
                  onClick={fetchAssessments}
                  style={styles.retryButton}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {filteredAssessments.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyStateIcon}>🔍</div>
                <h3 style={styles.emptyStateTitle}>No Assessments Found</h3>
                <p style={styles.emptyStateText}>
                  {searchTerm 
                    ? `No assessments matching "${searchTerm}"`
                    : "No assessments available in this category"}
                </p>
                {(searchTerm || selectedCategory !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                    }}
                    style={styles.clearFiltersButton}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(102,126,234,0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.assessmentGrid}>
                {filteredAssessments.map((assessment) => {
                  const completed = isAssessmentCompleted(assessment.id);
                  const inProgress = isAssessmentInProgress(assessment.id);
                  const progress = getAssessmentProgress(assessment.id);
                  const isHovered = hoveredCard === assessment.id;
                  const config = getCategoryConfig(assessment.assessment_categories?.name);
                  
                  return (
                    <div
                      key={assessment.id}
                      onMouseEnter={() => setHoveredCard(assessment.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        ...styles.assessmentCard,
                        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                        boxShadow: isHovered 
                          ? '0 30px 60px rgba(0,0,0,0.2)'
                          : '0 10px 30px rgba(0,0,0,0.1)'
                      }}
                    >
                      {/* Card Background with Pattern */}
                      <div style={{
                        ...styles.cardBackground,
                        backgroundImage: `url(${config.bgImage})`,
                        opacity: isHovered ? 0.15 : 0.1
                      }} />
                      <div style={{
                        ...styles.cardOverlay,
                        background: `linear-gradient(135deg, ${config.gradient.split(',')[0].replace('linear-gradient(135deg,', '')}, ${config.gradient.split(',')[1]})`,
                        opacity: isHovered ? 0.05 : 0.02
                      }} />
                      <div style={{
                        ...styles.cardPattern,
                        backgroundImage: `url(${config.pattern})`,
                        opacity: isHovered ? 0.05 : 0.03
                      }} />
                      
                      {/* Card Content */}
                      <div style={styles.cardContent}>
                        <div style={styles.cardHeader}>
                          <div style={{
                            ...styles.cardIcon,
                            background: config.gradient,
                            transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0)'
                          }}>
                            {config.icon}
                          </div>
                          <div style={styles.cardInfo}>
                            <h3 style={styles.cardTitle}>{assessment.name}</h3>
                            <div style={styles.cardMeta}>
                              <span style={{
                                ...styles.cardCategory,
                                background: `${config.color}15`,
                                color: config.color
                              }}>
                                {assessment.assessment_categories?.name || 'General'}
                              </span>
                              <span style={styles.cardDivider}>•</span>
                              <span style={styles.cardQuestions}>
                                {assessment.question_count || 0} questions
                              </span>
                            </div>
                          </div>
                        </div>

                        <p style={styles.cardDescription}>
                          {assessment.description || 'No description available'}
                        </p>

                        <div style={styles.cardFooter}>
                          <div style={styles.cardStats}>
                            <div style={styles.cardStat}>
                              <span style={styles.cardStatIcon}>⏱️</span>
                              <span style={styles.cardStatLabel}>180 min</span>
                            </div>
                            <div style={styles.cardStat}>
                              <span style={styles.cardStatIcon}>📊</span>
                              <span style={styles.cardStatLabel}>100 Q</span>
                            </div>
                            {assessment.difficulty && (
                              <div style={styles.cardStat}>
                                <span style={styles.cardStatIcon}>📈</span>
                                <span style={styles.cardStatLabel}>
                                  {assessment.difficulty}
                                </span>
                              </div>
                            )}
                          </div>

                          {completed ? (
                            <div style={styles.completedBadge}>
                              <span style={styles.completedIcon}>✅</span>
                              Completed
                            </div>
                          ) : inProgress ? (
                            <div style={styles.progressContainer}>
                              <div style={styles.progressInfo}>
                                <span style={styles.progressIcon}>⏳</span>
                                <span style={styles.progressText}>In Progress</span>
                                <span style={styles.progressTime}>
                                  {formatTime(progress)} used
                                </span>
                              </div>
                              <button
                                onClick={() => handleStartAssessment(assessment.id)}
                                style={styles.continueButton}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(255,152,0,0.4)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #fb8c00, #f57c00)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(251,140,0,0.3)';
                                }}
                              >
                                Continue →
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartAssessment(assessment.id)}
                              style={styles.startButton}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = config.gradient;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 10px 20px ${config.color}60`;
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = config.gradient;
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${config.color}40`;
                              }}
                            >
                              Start Assessment →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>
    </div>
  );
}

// ===== ENHANCED STYLES WITH BACKGROUND IMAGES AND BETTER READABILITY =====
const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 0.5s ease',
    animation: 'fadeIn 1s ease'
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: 'background 0.5s ease',
    pointerEvents: 'none'
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundRepeat: 'repeat',
    opacity: 0.05,
    pointerEvents: 'none',
    animation: 'fadeIn 1.5s ease'
  },
  content: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },

  // Loading States
  loadingContainer: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
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
    filter: 'blur(10px)',
    transform: 'scale(1.1)'
  },
  loadingContent: {
    position: 'relative',
    textAlign: 'center',
    color: 'white',
    zIndex: 1,
    maxWidth: '500px',
    padding: '40px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '48px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.5s ease'
  },
  loadingLogo: {
    fontSize: '42px',
    fontWeight: '800',
    marginBottom: '40px',
    letterSpacing: '2px'
  },
  loadingLogoGradient: {
    background: 'linear-gradient(135deg, #fff, #e2e8f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  loadingSpinnerContainer: {
    marginBottom: '40px'
  },
  loadingSpinner: {
    width: '80px',
    height: '80px',
    margin: '0 auto',
    border: '5px solid rgba(255,255,255,0.2)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '15px'
  },
  loadingSubtitle: {
    fontSize: '16px',
    opacity: 0.9,
    marginBottom: '30px'
  },
  loadingProgress: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  loadingProgressBar: {
    height: '100%',
    width: '60%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    animation: 'shimmer 2s infinite linear'
  },

  // Header
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    animation: 'slideIn 0.5s ease'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  logo: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'white',
    letterSpacing: '1px'
  },
  logoText: {
    background: 'linear-gradient(135deg, #fff, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    borderLeft: '2px solid rgba(255,255,255,0.2)',
    paddingLeft: '20px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'rgba(255,255,255,0.1)',
    padding: '6px 6px 6px 16px',
    borderRadius: '40px',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600'
  },
  userEmail: {
    color: 'white',
    fontSize: '14px',
    opacity: 0.9,
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(5px)'
  },

  // Stats Banner
  statsBanner: {
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    padding: '24px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    animation: 'slideIn 0.5s ease'
  },
  statsGrid: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
    }
  },
  statIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statIcon: {
    fontSize: '24px',
    color: 'white'
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 1.2
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  // Main Content
  mainContent: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 24px',
    display: 'flex',
    gap: '30px',
    flex: 1,
    flexWrap: 'wrap'
  },

  // Sidebar
  sidebar: {
    flex: '0 0 300px',
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: '32px',
    padding: '28px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    height: 'fit-content',
    animation: 'slideIn 0.5s ease',
    position: 'sticky',
    top: '100px'
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f5f9',
    marginBottom: '20px'
  },
  sidebarIcon: {
    fontSize: '24px'
  },
  sidebarTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  searchContainer: {
    marginBottom: '25px'
  },
  searchInput: {
    width: '100%',
    padding: '16px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.2s ease',
    outline: 'none',
    background: 'white',
    ':focus': {
      borderColor: '#667eea',
      boxShadow: '0 0 0 4px rgba(102,126,234,0.1)'
    }
  },
  categoriesContainer: {
    marginBottom: '25px'
  },
  categoriesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600'
  },
  categoriesIcon: {
    fontSize: '18px'
  },
  categoriesTitle: {
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  categoryButton: {
    width: '100%',
    padding: '14px 18px',
    marginBottom: '8px',
    border: '2px solid',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    position: 'relative',
    textAlign: 'left'
  },
  categoryIcon: {
    fontSize: '20px'
  },
  categoryCount: {
    marginLeft: 'auto',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  tipsContainer: {
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderRadius: '20px',
    padding: '20px',
    border: '1px solid #e2e8f0'
  },
  tipsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600'
  },
  tipsIcon: {
    fontSize: '20px'
  },
  tipsTitle: {
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tipsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  tipItem: {
    padding: '10px 0',
    color: '#475569',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid #e2e8f0',
    ':last-child': {
      borderBottom: 'none'
    }
  },
  tipIcon: {
    fontSize: '16px',
    minWidth: '24px'
  },

  // Assessments Container
  assessmentsContainer: {
    flex: 1,
    minWidth: 0
  },
  assessmentsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    animation: 'slideIn 0.5s ease'
  },
  assessmentsTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  assessmentsCountContainer: {
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    padding: '8px 16px',
    borderRadius: '40px',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  assessmentsCount: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600'
  },
  errorBanner: {
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid rgba(239,68,68,0.3)',
    boxShadow: '0 10px 25px rgba(239,68,68,0.1)',
    animation: 'slideIn 0.3s ease'
  },
  errorIcon: {
    fontSize: '24px'
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '500',
    flex: 1
  },
  retryButton: {
    padding: '8px 20px',
    background: 'white',
    border: '1px solid #ef4444',
    borderRadius: '30px',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  emptyState: {
    background: 'rgba(255,255,255,0.98)',
    borderRadius: '32px',
    padding: '80px 40px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.3)',
    animation: 'slideIn 0.5s ease'
  },
  emptyStateIcon: {
    fontSize: '80px',
    marginBottom: '25px',
    opacity: 0.7
  },
  emptyStateTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  emptyStateText: {
    color: '#64748b',
    marginBottom: '30px',
    fontSize: '16px'
  },
  clearFiltersButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
  },
  assessmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '25px',
    animation: 'slideIn 0.5s ease'
  },
  assessmentCard: {
    position: 'relative',
    background: 'white',
    borderRadius: '28px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    animation: 'slideIn 0.5s ease',
    cursor: 'pointer',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 0.3s ease'
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: 'opacity 0.3s ease'
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundRepeat: 'repeat',
    opacity: 0.03,
    pointerEvents: 'none'
  },
  cardContent: {
    position: 'relative',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    zIndex: 2
  },
  cardHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px'
  },
  cardIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: 'white',
    flexShrink: 0,
    transition: 'all 0.3s ease'
  },
  cardInfo: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
    lineHeight: 1.3
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    flexWrap: 'wrap'
  },
  cardCategory: {
    padding: '4px 12px',
    borderRadius: '30px',
    fontSize: '11px',
    fontWeight: '600'
  },
  cardDivider: {
    color: '#cbd5e1'
  },
  cardQuestions: {
    fontWeight: '500',
    color: '#64748b'
  },
  cardDescription: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#475569',
    marginBottom: '20px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1
  },
  cardFooter: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardStats: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '16px',
    flexWrap: 'wrap'
  },
  cardStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#475569'
  },
  cardStatIcon: {
    fontSize: '14px'
  },
  cardStatLabel: {
    fontWeight: '500'
  },
  completedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    color: 'white',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  completedIcon: {
    fontSize: '18px'
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: '#fff8e1',
    borderRadius: '12px',
    color: '#f57c00',
    fontSize: '13px',
    fontWeight: '500'
  },
  progressIcon: {
    fontSize: '16px'
  },
  progressText: {
    fontWeight: '600'
  },
  progressTime: {
    marginLeft: 'auto',
    fontFamily: 'monospace',
    background: 'rgba(255,255,255,0.5)',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  continueButton: {
    padding: '14px',
    background: 'linear-gradient(135deg, #fb8c00, #f57c00)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  startButton: {
    padding: '14px',
    border: 'none',
    borderRadius: '16px',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
