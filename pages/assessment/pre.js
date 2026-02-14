import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function PreAssessment() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      await loadAssessments(session.user.id);
    } catch (error) {
      console.error("Error:", error);
      router.push("/login");
    }
  };

  const loadAssessments = async (userId) => {
    try {
      // Get all active assessments
      const { data: assessmentsData, error } = await supabase
        .from('assessments')
        .select(`
          *,
          assessment_type:assessment_types(*)
        `)
        .eq('is_active', true)
        .order('assessment_type_id');

      if (error) throw error;
      
      // Check which assessments are completed
      let completed = 0;
      for (let assessment of assessmentsData) {
        const { data: completedData } = await supabase
          .from('candidate_assessments')
          .select('id')
          .eq('user_id', userId)
          .eq('assessment_id', assessment.id)
          .eq('status', 'completed')
          .maybeSingle();
        
        assessment.completed = !!completedData;
        if (assessment.completed) completed++;
      }

      setAssessments(assessmentsData || []);
      setCompletedCount(completed);
    } catch (error) {
      console.error("Error loading assessments:", error);
    } finally {
      setLoading(false);
    }
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
    return icons[type?.code] || type?.icon || '📋';
  };

  if (loading) {
    return (
      <AppLayout background="/images/preassessmentbg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p>Loading assessments...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Your Assessments</h1>
          <p style={styles.subtitle}>
            Welcome back, {user?.email?.split('@')[0] || 'Candidate'}
          </p>
          <p style={styles.description}>
            Track your progress and continue your assessments. Each assessment contains 100 questions 
            and has its own time limit.
          </p>
          
          {/* Progress Stats */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{completedCount}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{assessments.length}</div>
              <div style={styles.statLabel}>Total</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {Math.round((completedCount / assessments.length) * 100) || 0}%
              </div>
              <div style={styles.statLabel}>Progress</div>
            </div>
          </div>
        </div>

        {/* Assessment Grid */}
        <div style={styles.gridContainer}>
          {assessments.map((assessment) => {
            const type = assessment.assessment_type;
            const isCompleted = assessment.completed;
            
            return (
              <div key={assessment.id} style={{
                ...styles.card,
                opacity: isCompleted ? 0.7 : 1,
                border: isCompleted ? '2px solid #4caf50' : 'none'
              }}>
                <div style={{
                  ...styles.cardHeader,
                  background: `linear-gradient(135deg, ${type?.gradient_start || '#667eea'}, ${type?.gradient_end || '#764ba2'})`
                }}>
                  <span style={styles.cardIcon}>{getAssessmentIcon(type)}</span>
                  <h3 style={styles.cardTitle}>{assessment.title}</h3>
                  {isCompleted && (
                    <span style={styles.completedBadge}>✓ Completed</span>
                  )}
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.cardStats}>
                    <div>📝 {type?.question_count || 100} Questions</div>
                    <div>⏱️ {type?.time_limit_minutes || 60} Minutes</div>
                    <div>🎯 Max Score: {type?.max_score || 100}</div>
                  </div>
                  
                  <p style={styles.cardDescription}>
                    {assessment.description || `${assessment.title} - Comprehensive assessment`}
                  </p>
                  
                  <Link href={`/assessment/${assessment.id}`}>
                    <a style={{
                      ...styles.startButton,
                      background: isCompleted ? '#9e9e9e' : `linear-gradient(135deg, ${type?.gradient_start || '#667eea'}, ${type?.gradient_end || '#764ba2'})`,
                      pointerEvents: isCompleted ? 'none' : 'auto',
                      cursor: isCompleted ? 'not-allowed' : 'pointer'
                    }}>
                      {isCompleted ? 'Already Completed' : 'Start Assessment →'}
                    </a>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <h2 style={styles.instructionsTitle}>Important Guidelines</h2>
          <div style={styles.instructionsGrid}>
            <div style={styles.instructionItem}>
              <span style={styles.instructionIcon}>⏰</span>
              <div>
                <h4>Timed Assessments</h4>
                <p>Each assessment has its own time limit. Timer starts when you begin.</p>
              </div>
            </div>
            <div style={styles.instructionItem}>
              <span style={styles.instructionIcon}>🔄</span>
              <div>
                <h4>One Attempt Only</h4>
                <p>Each assessment can only be taken once. Make sure you're ready.</p>
              </div>
            </div>
            <div style={styles.instructionItem}>
              <span style={styles.instructionIcon}>💾</span>
              <div>
                <h4>Auto-Save Enabled</h4>
                <p>Your answers are automatically saved as you progress.</p>
              </div>
            </div>
            <div style={styles.instructionItem}>
              <span style={styles.instructionIcon}>🛡️</span>
              <div>
                <h4>Secure Environment</h4>
                <p>Copy/paste and right-click are disabled during assessments.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>© 2025 Stratavax Assessment Portal</p>
          <p>support@stratavax.com</p>
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1565c0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#1565c0',
    marginBottom: '10px'
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    maxWidth: '600px',
    margin: '0 auto 30px'
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginTop: '20px'
  },
  statCard: {
    background: 'white',
    padding: '20px 30px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1565c0',
    lineHeight: 1.2
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease',
    cursor: 'pointer'
  },
  cardHeader: {
    padding: '20px',
    color: 'white',
    position: 'relative'
  },
  cardIcon: {
    fontSize: '36px',
    marginBottom: '10px',
    display: 'block'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    paddingRight: '60px'
  },
  completedBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(255,255,255,0.3)',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  cardBody: {
    padding: '20px'
  },
  cardStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '15px',
    fontSize: '14px',
    color: '#475569'
  },
  cardDescription: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  startButton: {
    display: 'block',
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease'
  },
  instructions: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px'
  },
  instructionsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px',
    textAlign: 'center'
  },
  instructionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  instructionItem: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start',
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  instructionIcon: {
    fontSize: '24px'
  },
  footer: {
    textAlign: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: '14px'
  }
};
