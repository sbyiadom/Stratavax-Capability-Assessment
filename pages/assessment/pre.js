import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import { getAssessments, getOrCreateCandidateProfile, isAssessmentCompleted } from "../../supabase/assessment";

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [completedAssessments, setCompletedAssessments] = useState({});

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
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
      
      // Get or create profile
      const profile = await getOrCreateCandidateProfile(
        session.user.id,
        session.user.email,
        session.user.user_metadata?.full_name || session.user.email
      );
      setProfile(profile);
    } catch (error) {
      console.error("Error checking session:", error);
      router.push("/login");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get all assessments
      const assessmentsData = await getAssessments();
      
      // Check which ones are completed
      const completed = {};
      for (const assessment of assessmentsData) {
        const isCompleted = await isAssessmentCompleted(user.id, assessment.id);
        completed[assessment.id] = isCompleted;
      }
      
      setAssessments(assessmentsData);
      setCompletedAssessments(completed);
    } catch (error) {
      console.error("Error loading assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (assessment) => {
    if (completedAssessments[assessment.id]) {
      alert("You have already completed this assessment. Each assessment can only be taken once.");
      return;
    }
    
    // Store assessment info in session storage
    sessionStorage.setItem('currentAssessment', JSON.stringify({
      id: assessment.id,
      type: assessment.assessment_type,
      name: assessment.title
    }));
    
    router.push(`/assessment/${assessment.id}`);
  };

  const getAssessmentIcon = (type) => {
    const icons = {
      'general': '📊',
      'leadership': '👑',
      'cognitive': '🧠',
      'technical': '⚙️',
      'personality': '🌟',
      'performance': '📈',
      'behavioral': '🤝',
      'manufacturing': '🏭',
      'cultural': '🎯'
    };
    return icons[type.code] || type.icon || '📋';
  };

  const getGradient = (type) => {
    return `linear-gradient(135deg, ${type.gradient_start || '#667eea'}, ${type.gradient_end || '#764ba2'})`;
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
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.welcome}>Welcome to Stratavax Capability Assessment</h1>
          <p style={styles.userInfo}>
            {profile?.full_name || user?.email} • {user?.email}
          </p>
        </div>
        <div style={styles.stats}>
          <span style={styles.statBadge}>
            ✅ Completed: {Object.values(completedAssessments).filter(Boolean).length}/{assessments.length}
          </span>
        </div>
      </div>

      {/* Assessment Grid */}
      <div style={styles.gridContainer}>
        {assessments.map((assessment) => {
          const isCompleted = completedAssessments[assessment.id];
          const assessmentType = assessment.assessment_type;
          
          return (
            <div key={assessment.id} style={{
              ...styles.card,
              opacity: isCompleted ? 0.7 : 1,
              border: isCompleted ? '2px solid #4caf50' : '1px solid #e2e8f0'
            }}>
              <div style={{
                ...styles.cardHeader,
                background: getGradient(assessmentType)
              }}>
                <span style={styles.cardIcon}>{getAssessmentIcon(assessmentType)}</span>
                <h3 style={styles.cardTitle}>{assessment.title}</h3>
                {isCompleted && (
                  <span style={styles.completedBadge}>✓ Completed</span>
                )}
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.cardStats}>
                  <div style={styles.stat}>
                    <span>📝 {assessmentType.question_count} Questions</span>
                  </div>
                  <div style={styles.stat}>
                    <span>⏱️ {assessmentType.time_limit_minutes} Minutes</span>
                  </div>
                  <div style={styles.stat}>
                    <span>🎯 Max Score: {assessmentType.max_score}</span>
                  </div>
                </div>
                
                <p style={styles.description}>{assessment.description}</p>
                
                <button
                  onClick={() => handleStartAssessment(assessment)}
                  disabled={isCompleted}
                  style={{
                    ...styles.startButton,
                    background: isCompleted ? '#9e9e9e' : getGradient(assessmentType),
                    cursor: isCompleted ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isCompleted ? 'Already Completed' : 'Start Assessment →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h2 style={styles.instructionsTitle}>Assessment Guidelines</h2>
        
        <div style={styles.instructionsGrid}>
          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>⏰</span>
            <div>
              <h4 style={styles.instructionHeading}>Timed Assessments</h4>
              <p style={styles.instructionText}>Each assessment has its own time limit. Timer starts when you begin.</p>
            </div>
          </div>

          <div style={styles.instructionCard}>
            <span style={styles.instructionIcon}>🔄</span>
            <div>
              <h4 style={styles.instructionHeading}>One Attempt Only</h4>
              <p style={styles.instructionText}>Each assessment can only be taken once. Completed are marked with ✓.</p>
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
            <span style={styles.instructionIcon}>📊</span>
            <div>
              <h4 style={styles.instructionHeading}>Detailed Reports</h4>
              <p style={styles.instructionText}>Each assessment generates its own detailed report with analysis.</p>
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
    </div>
  );
}

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
    maxWidth: '1200px',
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
    maxWidth: '1200px',
    margin: '0 auto 40px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
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
    fontSize: '32px',
    marginBottom: '8px',
    display: 'block'
  },
  cardTitle: {
    fontSize: '16px',
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
    marginBottom: '15px'
  },
  stat: {
    fontSize: '13px',
    color: '#475569',
    marginBottom: '6px'
  },
  description: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  startButton: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  instructions: {
    maxWidth: '1200px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  instructionCard: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start',
    padding: '15px',
    background: '#f1f5f9',
    borderRadius: '8px'
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
  }
};
