// pages/assessment/pre.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== ASSESSMENT CONFIGURATIONS =====
const ASSESSMENT_CONFIG = {
  'Behavioral & Soft Skills Assessment': {
    icon: '🧠',
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)',
    timeLimit: '180 minutes'
  },
  'Cognitive & Thinking Skills': {
    icon: '💡',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #F57C00)',
    timeLimit: '180 minutes'
  },
  'Cultural & Attitudinal Fit': {
    icon: '🤝',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    timeLimit: '180 minutes'
  },
  'Leadership Potential Assessment': {
    icon: '👑',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)',
    timeLimit: '180 minutes'
  },
  'Manufacturing Technical Skills': {
    icon: '⚙️',
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #C62828)',
    timeLimit: '180 minutes'
  },
  'Stratavax EvalEx Comprehensive Assessment': {
    icon: '📊',
    color: '#607D8B',
    gradient: 'linear-gradient(135deg, #607D8B, #455A64)',
    timeLimit: '180 minutes'
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
      
      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      // Use full_name if available, otherwise fall back to email
      if (profile?.full_name) {
        setDisplayName(profile.full_name.split(' ')[0]); // First name only
      } else {
        // Extract name from email (before @)
        const emailName = session.user.email.split('@')[0];
        setDisplayName(emailName);
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
            gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
            timeLimit: '180 minutes'
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
        <div style={styles.loadingCard}>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading assessments...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Welcome Header */}
      <div style={styles.welcomeSection}>
        <h1 style={styles.welcomeTitle}>
          Welcome back, <span style={styles.welcomeName}>{displayName}</span> 👋
        </h1>
        <p style={styles.welcomeSubtitle}>
          Select an assessment to begin. Each assessment helps us understand your unique skills and potential.
        </p>
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
                    <span style={styles.statIcon}>📝</span>
                    <span style={styles.statText}>{assessment.question_count} questions</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statIcon}>⏱️</span>
                    <span style={styles.statText}>{config.timeLimit}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleStartAssessment(assessment.id)}
                  style={styles.startButton}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = config.gradient;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 10px 20px ${config.color}80`;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = config.gradient;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                >
                  Start Assessment →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Important Information Section */}
      <div style={styles.infoSection}>
        <h2 style={styles.infoTitle}>📋 Important Information</h2>
        
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>⏰</div>
            <h3 style={styles.infoCardTitle}>Time Limit</h3>
            <p style={styles.infoCardText}>
              Each assessment has a <strong>180-minute (3 hour)</strong> time limit. 
              The timer starts immediately when you begin.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🔄</div>
            <h3 style={styles.infoCardTitle}>One Attempt Only</h3>
            <p style={styles.infoCardText}>
              You can only take each assessment <strong>once</strong>. 
              Make sure you're ready before starting.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>💾</div>
            <h3 style={styles.infoCardTitle}>Auto-Save</h3>
            <p style={styles.infoCardText}>
              Your answers are <strong>automatically saved</strong> as you progress. 
              You can leave and return within the time limit.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🛡️</div>
            <h3 style={styles.infoCardTitle}>Secure Mode</h3>
            <p style={styles.infoCardText}>
              Copy/paste and right-click are disabled during assessments to 
              ensure fair evaluation.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>📱</div>
            <h3 style={styles.infoCardTitle}>Device Compatibility</h3>
            <p style={styles.infoCardText}>
              Assessments work on all devices - desktop, tablet, and mobile. 
              Choose a quiet environment.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>📊</div>
            <h3 style={styles.infoCardTitle}>Instant Results</h3>
            <p style={styles.infoCardText}>
              Get your results immediately after completion. 
              Detailed reports will be available for review.
            </p>
          </div>
        </div>

        <div style={styles.noteBox}>
          <span style={styles.noteIcon}>💡</span>
          <p style={styles.noteText}>
            <strong>Pro Tip:</strong> Find a quiet space where you won't be interrupted. 
            Read each question carefully - there are no trick questions, just opportunities 
            to showcase your authentic self.
          </p>
        </div>
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
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '40px 20px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  },
  loadingCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingText: {
    fontSize: '18px',
    color: '#475569'
  },
  welcomeSection: {
    maxWidth: '800px',
    margin: '0 auto 40px',
    textAlign: 'center'
  },
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '10px'
  },
  welcomeName: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.6'
  },
  gridContainer: {
    maxWidth: '1000px',
    margin: '0 auto 50px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    padding: '20px',
    color: 'white'
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '10px',
    display: 'block'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
    lineHeight: '1.4'
  },
  cardBody: {
    padding: '20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  cardStats: {
    marginBottom: '20px'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#475569'
  },
  statIcon: {
    fontSize: '14px'
  },
  statText: {
    fontWeight: '500'
  },
  startButton: {
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    marginTop: 'auto'
  },
  infoSection: {
    maxWidth: '1000px',
    margin: '0 auto'
  },
  infoTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '25px',
    textAlign: 'center'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '25px'
  },
  infoCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    textAlign: 'center'
  },
  infoIcon: {
    fontSize: '28px',
    marginBottom: '12px',
    display: 'block'
  },
  infoCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  infoCardText: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0
  },
  noteBox: {
    background: 'linear-gradient(135deg, #667eea10, #764ba210)',
    border: '2px solid #667eea30',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  noteIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  noteText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
    margin: 0
  }
};
