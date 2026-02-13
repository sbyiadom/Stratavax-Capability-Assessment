// pages/pre.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";
import Link from "next/link";

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userStats, setUserStats] = useState(null);

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

  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Cognitive': '🧠',
      'Behavioral': '😊',
      'Leadership': '👑',
      'Manufacturing': '⚙️',
      'Cultural': '🌍',
      'Technical': '💻',
      'General': '📝'
    };
    return icons[categoryName] || '📋';
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
          <div style={styles.loadingLogo}>🏢 Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingTitle}>Loading Assessments</div>
          <div style={styles.loadingSubtitle}>Please wait while we prepare your assessments...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Background Image */}
      <div style={styles.backgroundImage} />
      <div style={styles.backgroundOverlay} />
      <div style={styles.backgroundPattern} />
      
      {/* Content */}
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.logo}>🏢 Stratavax</div>
              <div style={styles.headerTitle}>Assessment Center</div>
            </div>
            
            <div style={styles.headerRight}>
              {session && (
                <div style={styles.userInfo}>
                  <span style={styles.userEmail}>{session.user.email}</span>
                  <button
                    onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
                    style={styles.logoutButton}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
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
                <span style={styles.statIcon}>✅</span>
                <div>
                  <div style={styles.statValue}>{userStats.totalCompleted}</div>
                  <div style={styles.statLabel}>Completed</div>
                </div>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statIcon}>📊</span>
                <div>
                  <div style={styles.statValue}>{userStats.averageScore}%</div>
                  <div style={styles.statLabel}>Avg. Score</div>
                </div>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statIcon}>⏳</span>
                <div>
                  <div style={styles.statValue}>{userStats.inProgress.length}</div>
                  <div style={styles.statLabel}>In Progress</div>
                </div>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statIcon}>📋</span>
                <div>
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
                style={{
                  ...styles.categoryButton,
                  background: selectedCategory === "all" 
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'white',
                  color: selectedCategory === "all" ? 'white' : '#1e293b',
                  borderColor: selectedCategory === "all" ? '#667eea' : '#e2e8f0'
                }}
              >
                <span style={styles.categoryIcon}>📋</span>
                All Assessments
                <span style={styles.categoryCount}>{assessments.length}</span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    ...styles.categoryButton,
                    background: selectedCategory === category.id 
                      ? 'linear-gradient(135deg, #667eea, #764ba2)'
                      : 'white',
                    color: selectedCategory === category.id ? 'white' : '#1e293b',
                    borderColor: selectedCategory === category.id ? '#667eea' : '#e2e8f0'
                  }}
                >
                  <span style={styles.categoryIcon}>
                    {category.icon || getCategoryIcon(category.name)}
                  </span>
                  {category.name}
                  <span style={styles.categoryCount}>
                    {assessments.filter(a => a.category_id === category.id).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Tips */}
            <div style={styles.tipsContainer}>
              <div style={styles.tipsHeader}>
                <span style={styles.tipsIcon}>💡</span>
                <span style={styles.tipsTitle}>Quick Tips</span>
              </div>
              <ul style={styles.tipsList}>
                <li style={styles.tipItem}>✓ Each assessment has 100 questions</li>
                <li style={styles.tipItem}>⏱️ 180 minutes time limit</li>
                <li style={styles.tipItem}>🔄 Answers auto-save</li>
                <li style={styles.tipItem}>📱 Works on all devices</li>
                <li style={styles.tipItem}>🛡️ Anti-cheat enabled</li>
                <li style={styles.tipItem}>✅ One attempt only</li>
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
              <span style={styles.assessmentsCount}>
                {filteredAssessments.length} available
              </span>
            </div>

            {error && (
              <div style={styles.errorBanner}>
                <span style={styles.errorIcon}>⚠️</span>
                <span>{error}</span>
                <button 
                  onClick={fetchAssessments}
                  style={styles.retryButton}
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
                  
                  return (
                    <div key={assessment.id} style={styles.assessmentCard}>
                      {/* Card Background with Pattern */}
                      <div style={{
                        ...styles.cardBackground,
                        backgroundImage: `url(${
                          assessment.assessment_categories?.name === 'Cognitive' 
                            ? 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb'
                            : assessment.assessment_categories?.name === 'Leadership'
                            ? 'https://images.unsplash.com/photo-1552664730-d307ca884978'
                            : assessment.assessment_categories?.name === 'Manufacturing'
                            ? 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa'
                            : 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40'
                        }?auto=format&fit=crop&w=1920&q=80)`,
                      }} />
                      <div style={styles.cardOverlay} />
                      
                      {/* Card Content */}
                      <div style={styles.cardContent}>
                        <div style={styles.cardHeader}>
                          <div style={{
                            ...styles.cardIcon,
                            background: `linear-gradient(135deg, ${
                              assessment.assessment_categories?.name === 'Cognitive' ? '#4A6FA5'
                              : assessment.assessment_categories?.name === 'Leadership' ? '#D32F2F'
                              : assessment.assessment_categories?.name === 'Manufacturing' ? '#388E3C'
                              : assessment.assessment_categories?.name === 'Behavioral' ? '#FF6B6B'
                              : assessment.assessment_categories?.name === 'Cultural' ? '#9C89B8'
                              : '#667eea'
                            }, ${
                              assessment.assessment_categories?.name === 'Cognitive' ? '#2C3E50'
                              : assessment.assessment_categories?.name === 'Leadership' ? '#B71C1C'
                              : assessment.assessment_categories?.name === 'Manufacturing' ? '#1B5E20'
                              : assessment.assessment_categories?.name === 'Behavioral' ? '#C62828'
                              : assessment.assessment_categories?.name === 'Cultural' ? '#6B4E71'
                              : '#764ba2'
                            })`
                          }}>
                            {assessment.assessment_categories?.icon || 
                             getCategoryIcon(assessment.assessment_categories?.name)}
                          </div>
                          <div style={styles.cardInfo}>
                            <h3 style={styles.cardTitle}>{assessment.name}</h3>
                            <div style={styles.cardMeta}>
                              <span style={styles.cardCategory}>
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
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #fb8c00, #f57c00)';
                                  e.currentTarget.style.transform = 'translateY(0)';
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
                                e.currentTarget.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(102,126,234,0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
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
      `}</style>
    </div>
  );
}

// ===== STYLES WITH BACKGROUND IMAGES =====
const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    filter: 'blur(8px)'
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
    pointerEvents: 'none'
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://www.transparenttextures.com/patterns/cubes.png)',
    opacity: 0.05,
    pointerEvents: 'none'
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
  loadingTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '15px'
  },
  loadingSubtitle: {
    fontSize: '16px',
    opacity: 0.9
  },

  // Header
  header: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
    gap: '16px'
  },
  userEmail: {
    color: 'white',
    fontSize: '14px',
    opacity: 0.9
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  // Stats Banner
  statsBanner: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    padding: '20px 24px'
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
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '28px'
  },
  statValue: {
    fontSize: '24px',
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
    flex: 1
  },

  // Sidebar
  sidebar: {
    flex: '0 0 280px',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    height: 'fit-content',
    border: '1px solid rgba(255,255,255,0.2)'
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
    fontSize: '20px'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  searchContainer: {
    marginBottom: '25px'
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102,126,234,0.1)'
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
    fontSize: '16px'
  },
  categoriesTitle: {
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  categoryButton: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '8px',
    border: '2px solid',
    borderRadius: '12px',
    background: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    position: 'relative'
  },
  categoryIcon: {
    fontSize: '18px'
  },
  categoryCount: {
    marginLeft: 'auto',
    background: 'rgba(0,0,0,0.05)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  tipsContainer: {
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderRadius: '16px',
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
    fontSize: '18px'
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
    padding: '8px 0',
    color: '#475569',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #e2e8f0',
    ':last-child': {
      borderBottom: 'none'
    }
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
    marginBottom: '20px'
  },
  assessmentsTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  assessmentsCount: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '30px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    backdropFilter: 'blur(5px)'
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#ef4444'
  },
  errorIcon: {
    fontSize: '20px'
  },
  retryButton: {
    marginLeft: 'auto',
    padding: '8px 16px',
    background: 'white',
    border: 'none',
    borderRadius: '20px',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  emptyState: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '24px',
    padding: '60px 40px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
  },
  emptyStateIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  emptyStateTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '10px'
  },
  emptyStateText: {
    color: '#64748b',
    marginBottom: '25px'
  },
  clearFiltersButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  assessmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  assessmentCard: {
    position: 'relative',
    background: 'white',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    animation: 'slideIn 0.5s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
    }
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    transition: 'opacity 0.3s ease'
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98))',
    backdropFilter: 'blur(5px)'
  },
  cardContent: {
    position: 'relative',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  cardHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px'
  },
  cardIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'white',
    flexShrink: 0,
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
  },
  cardInfo: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '6px',
    lineHeight: 1.3
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap'
  },
  cardCategory: {
    padding: '4px 10px',
    background: '#f1f5f9',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569'
  },
  cardDivider: {
    opacity: 0.5
  },
  cardQuestions: {
    fontWeight: '500'
  },
  cardDescription: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#475569',
    marginBottom: '20px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
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
    borderRadius: '12px'
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
    padding: '12px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    color: 'white',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600'
  },
  completedIcon: {
    fontSize: '16px'
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
    padding: '8px 12px',
    background: '#fff8e1',
    borderRadius: '8px',
    color: '#f57c00',
    fontSize: '13px',
    fontWeight: '500'
  },
  progressIcon: {
    fontSize: '14px'
  },
  progressText: {
    fontWeight: '600'
  },
  progressTime: {
    marginLeft: 'auto',
    fontFamily: 'monospace'
  },
  continueButton: {
    padding: '12px',
    background: 'linear-gradient(135deg, #fb8c00, #f57c00)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(251,140,0,0.3)'
  },
  startButton: {
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
  }
};
