// pages/assessment/pre.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== ASSESSMENT CONFIGURATIONS =====
const ASSESSMENT_CONFIG = {
  'General Assessment': {
    icon: '📊',
    color: '#607D8B',
    gradient: 'linear-gradient(135deg, #607D8B, #455A64)',
    type: 'general',
    maxScore: 500,
    timeLimit: 180
  },
  'Leadership Assessment': {
    icon: '👑',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)',
    type: 'leadership',
    maxScore: 100,
    timeLimit: 60
  },
  'Cognitive Ability Assessment': {
    icon: '🧠',
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)',
    type: 'cognitive',
    maxScore: 100,
    timeLimit: 60
  },
  'Technical Assessment': {
    icon: '⚙️',
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #C62828)',
    type: 'technical',
    maxScore: 100,
    timeLimit: 60
  },
  'Personality Assessment': {
    icon: '🌟',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    type: 'personality',
    maxScore: 100,
    timeLimit: 45
  },
  'Performance Assessment': {
    icon: '📈',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #F57C00)',
    type: 'performance',
    maxScore: 100,
    timeLimit: 45
  }
};

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [completedAssessments, setCompletedAssessments] = useState({});

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAssessments();
      fetchCompletedAssessments();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      setUser(session.user);
      
      // Get user profile for name, fallback to email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.full_name) {
        setDisplayName(profile.full_name);
      } else {
        setDisplayName(session.user.email);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      router.push("/login");
    }
  };

  const fetchCompletedAssessments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("candidate_assessments_taken")
        .select("assessment_id, assessment_type, completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed");

      if (error) throw error;

      const completed = {};
      data?.forEach(item => {
        completed[item.assessment_id] = {
          completed: true,
          completedAt: item.completed_at,
          type: item.assessment_type
        };
      });

      setCompletedAssessments(completed);
    } catch (error) {
      console.error("Error fetching completed assessments:", error);
    }
  };

  const fetchAssessments = async () => {
    try {
      setLoading(true);

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

          // Map assessment name to config
          let config = ASSESSMENT_CONFIG[assessment.name];
          
          // If not found by exact name, try to match by type
          if (!config && assessment.assessment_type) {
            const typeMap = {
              'general': ASSESSMENT_CONFIG['General Assessment'],
              'leadership': ASSESSMENT_CONFIG['Leadership Assessment'],
              'cognitive': ASSESSMENT_CONFIG['Cognitive Ability Assessment'],
              'technical': ASSESSMENT_CONFIG['Technical Assessment'],
              'personality': ASSESSMENT_CONFIG['Personality Assessment'],
              'performance': ASSESSMENT_CONFIG['Performance Assessment']
            };
            config = typeMap[assessment.assessment_type];
          }

          // Fallback config
          if (!config) {
            config = {
              icon: '📋',
              color: '#667eea',
              gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
              type: assessment.assessment_type || 'general',
              maxScore: assessment.assessment_type === 'general' ? 500 : 100,
              timeLimit: assessment.assessment_type === 'general' ? 180 : 60
            };
          }

          const isCompleted = completedAssessments[assessment.id];

          return { 
            ...assessment, 
            question_count: count || 0,
            config,
            isCompleted: !!isCompleted,
            completedAt: isCompleted?.completedAt
          };
        })
      );

      setAssessments(assessmentsWithCounts);
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (assessmentId, isCompleted) => {
    if (isCompleted) {
      alert("You have already completed this assessment. Each assessment can only be taken once.");
      return;
    }
    router.push(`/assessment/${assessmentId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with User Info */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.welcome}>Welcome to Stratavax Capability Assessment</h1>
          <p style={styles.userInfo}>
            {displayName} • {user?.email}
          </p>
        </div>
        <div style={styles.stats}>
          <span style={styles.statBadge}>
            ✅ Completed: {Object.keys(completedAssessments).length}/{assessments.length}
          </span>
        </div>
      </div>

      {/* 3x2 Assessment Grid */}
      <div style={styles.gridContainer}>
        {assessments.map((assessment) => {
          const config = assessment.config;
          const isCompleted = assessment.isCompleted;
          
          return (
            <div key={assessment.id} style={{
              ...styles.card,
              opacity: isCompleted ? 0.7 : 1,
              border: isCompleted ? '2px solid #4caf50' : '1px solid #e2e8f0'
            }}>
              <div style={{
                ...styles.cardHeader,
                background: config.gradient
              }}>
                <span style={styles.cardIcon}>{config.icon}</span>
                <h3 style={styles.cardTitle}>{assessment.name}</h3>
                {isCompleted && (
                  <span style={styles.completedBadge}>✓ Completed</span>
                )}
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.cardStats}>
                  <div style={styles.stat}>
                    <span>📝 {assessment.question_count} Questions</span>
                  </div>
                  <div style={styles.stat}>
                    <span>⏱️ {config.timeLimit} Minutes</span>
                  </div>
                  <div style={styles.stat}>
                    <span>🎯 Max Score: {config.maxScore}</span>
                  </div>
                  {isCompleted && (
                    <div style={styles.stat}>
                      <span style={{color: '#4caf50'}}>
                        ✅ Completed: {formatDate(assessment.completedAt)}
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleStartAssessment(assessment.id, isCompleted)}
                  disabled={isCompleted}
                  style={{
                    ...styles.startButton,
                    background: isCompleted ? '#9e9e9e' : config.gradient,
                    cursor: isCompleted ? 'not-allowed' : 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (!isCompleted) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isCompleted) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isCompleted ? 'Already Completed' : 'Start Assessment →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions Section */}
      <div style={styles.instructions}>
        <h2 style={styles.instructionsTitle}>Assessment Guidelines</h2>
        
        <div style={styles.instructionsGrid}>
          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>⏰</span>
            <div>
              <h4 style={styles.instructionHeading}>Timed Assessments</h4>
              <p style={styles.instructionText}>Each assessment has its own time limit. Timer starts immediately when you begin.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>🔄</span>
            <div>
              <h4 style={styles.instructionHeading}>One Attempt Only</h4>
              <p style={styles.instructionText}>Each assessment can only be taken once. Completed assessments are marked with ✓.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>💾</span>
            <div>
              <h4 style={styles.instructionHeading}>Auto-Save Enabled</h4>
              <p style={styles.instructionText}>Your answers are saved automatically as you progress through each assessment.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>📊</span>
            <div>
              <h4 style={styles.instructionHeading}>Separate Reports</h4>
              <p style={styles.instructionText}>Each assessment generates its own independent report for supervisors.</p>
            </div>
          </div>
        </div>

        <p style={styles.note}>
          Choose a quiet space where you won't be interrupted. Answer honestly - there are no right or wrong answers. 
          Each assessment measures different aspects of your capabilities.
        </p>
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

// ===== STYLES =====
const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '40px 20px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    maxWidth: '1000px',
    margin: '0 auto 30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  welcome: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  userInfo: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  stats: {
    background: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: '20px'
  },
  statBadge: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2e7d32'
  },
  gridContainer: {
    maxWidth: '1000px',
    margin: '0 auto 40px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease'
  },
  cardHeader: {
    padding: '20px',
    color: 'white',
    position: 'relative'
  },
  cardIcon: {
    fontSize: '28px',
    marginBottom: '8px',
    display: 'block'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
    lineHeight: '1.4',
    paddingRight: '60px'
  },
  completedBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(255,255,255,0.3)',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    backdropFilter: 'blur(5px)'
  },
  cardBody: {
    padding: '20px'
  },
  cardStats: {
    marginBottom: '20px'
  },
  stat: {
    fontSize: '13px',
    color: '#475569',
    marginBottom: '6px'
  },
  startButton: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  instructions: {
    maxWidth: '1000px',
    margin: '0 auto',
    paddingTop: '30px',
    borderTop: '2px solid #e2e8f0'
  },
  instructionsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0'
  },
  instructionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px'
  },
  instructionCard: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start'
  },
  instructionIcon: {
    fontSize: '24px',
    lineHeight: 1
  },
  instructionHeading: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  instructionText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5'
  },
  note: {
    fontSize: '13px',
    color: '#475569',
    fontStyle: 'italic',
    margin: '20px 0 0 0',
    padding: '15px',
    background: '#f1f5f9',
    borderRadius: '8px'
  }
};
