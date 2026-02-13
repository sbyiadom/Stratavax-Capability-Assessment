// pages/assessment/pre.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== ASSESSMENT CONFIGURATIONS =====
const ASSESSMENT_CONFIG = {
  'Behavioral & Soft Skills Assessment': {
    icon: '🧠',
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)'
  },
  'Cognitive & Thinking Skills': {
    icon: '💡',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #F57C00)'
  },
  'Cultural & Attitudinal Fit': {
    icon: '🤝',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)'
  },
  'Leadership Potential Assessment': {
    icon: '👑',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)'
  },
  'Manufacturing Technical Skills': {
    icon: '⚙️',
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #C62828)'
  },
  'Stratavax EvalEx Comprehensive Assessment': {
    icon: '📊',
    color: '#607D8B',
    gradient: 'linear-gradient(135deg, #607D8B, #455A64)'
  }
};

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    checkUser();
    fetchAssessments();
  }, []);

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

          const config = ASSESSMENT_CONFIG[assessment.name] || {
            icon: '📋',
            color: '#667eea',
            gradient: 'linear-gradient(135deg, #667eea, #764ba2)'
          };

          return { 
            ...assessment, 
            question_count: count || 0,
            config
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

  const handleStartAssessment = async (assessmentId) => {
    router.push(`/assessment/${assessmentId}`);
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
      </div>

      {/* 3x2 Assessment Grid */}
      <div style={styles.gridContainer}>
        {assessments.map((assessment) => {
          const config = assessment.config;
          
          return (
            <div key={assessment.id} style={styles.card}>
              <div style={{
                ...styles.cardHeader,
                background: config.gradient
              }}>
                <span style={styles.cardIcon}>{config.icon}</span>
                <h3 style={styles.cardTitle}>{assessment.name}</h3>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.cardStats}>
                  <div style={styles.stat}>
                    <span>📝 {assessment.question_count} Questions</span>
                  </div>
                  <div style={styles.stat}>
                    <span>⏱️ 180 Minutes</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleStartAssessment(assessment.id)}
                  style={{
                    ...styles.startButton,
                    background: config.gradient
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Start Assessment →
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
              <h4 style={styles.instructionHeading}>180 Minutes Total</h4>
              <p style={styles.instructionText}>Timer starts immediately when you begin. Manage your time wisely.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>🔄</span>
            <div>
              <h4 style={styles.instructionHeading}>One Attempt Only</h4>
              <p style={styles.instructionText}>Each assessment can only be taken once. Make sure you're ready.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>💾</span>
            <div>
              <h4 style={styles.instructionHeading}>Auto-Save Enabled</h4>
              <p style={styles.instructionText}>Your answers are saved automatically as you progress.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>🛡️</span>
            <div>
              <h4 style={styles.instructionHeading}>Secure Environment</h4>
              <p style={styles.instructionText}>Copy/paste and right-click are disabled for assessment integrity.</p>
            </div>
          </div>
        </div>

        <p style={styles.note}>
          Choose a quiet space where you won't be interrupted. Answer honestly - there are no right or wrong answers.
        </p>
      </div>
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
    borderBottom: '2px solid #e2e8f0'
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
    border: '1px solid #e2e8f0'
  },
  cardHeader: {
    padding: '20px',
    color: 'white'
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
    lineHeight: '1.4'
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
    cursor: 'pointer',
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

// Add keyframes for spinner
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
