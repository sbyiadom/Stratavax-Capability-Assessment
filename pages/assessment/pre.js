import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  // List of assessment types to exclude
  const excludedTypes = ['manufacturing'];

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
      fetchAssessments(session.user.id);
    } catch (error) {
      console.error("Error:", error);
      router.push("/login");
    }
  };

  const fetchAssessments = async (userId) => {
    try {
      setError(null);
      
      // First, get all active assessments with their types
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`
          *,
          assessment_type:assessment_types(*)
        `)
        .eq('is_active', true)
        .order('assessment_type_id');

      if (assessmentsError) throw assessmentsError;
      
      console.log("Fetched assessments:", assessmentsData);
      
      if (!assessmentsData || assessmentsData.length === 0) {
        setAssessments([]);
        setLoading(false);
        return;
      }

      // Filter out excluded assessment types (like manufacturing)
      const filteredAssessments = assessmentsData.filter(
        assessment => !excludedTypes.includes(assessment.assessment_type?.code)
      );

      // For each assessment, check if the user has completed it
      const assessmentsWithStatus = await Promise.all(
        filteredAssessments.map(async (assessment) => {
          try {
            // Check in candidate_assessments first
            const { data: completed, error: completedError } = await supabase
              .from('candidate_assessments')
              .select('id, status, score')
              .eq('user_id', userId)
              .eq('assessment_id', assessment.id)
              .maybeSingle();

            if (completedError && completedError.code !== 'PGRST116') {
              console.log("Error checking completion:", completedError);
            }
            
            return {
              ...assessment,
              completed: !!completed,
              score: completed?.score || null
            };
          } catch (err) {
            console.log("Error processing assessment:", assessment.id, err);
            return {
              ...assessment,
              completed: false,
              score: null
            };
          }
        })
      );

      setAssessments(assessmentsWithStatus);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/candidate/dashboard');
  };

  const handleStartClick = (assessment) => {
    setSelectedAssessment(assessment);
    setShowInstructions(true);
  };

  const confirmStart = () => {
    setShowInstructions(false);
    router.push(`/assessment/${selectedAssessment.id}`);
  };

  const getIcon = (type) => {
    return type?.icon || '📋';
  };

  const getGradient = (type) => {
    if (!type) return 'linear-gradient(135deg, #667eea, #764ba2)';
    return `linear-gradient(135deg, ${type.gradient_start || '#667eea'}, ${type.gradient_end || '#764ba2'})`;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading assessments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <h2>Error Loading Assessments</h2>
          <p>{error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchAssessments(user.id);
            }}
            style={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button onClick={handleBack} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <h1 style={styles.title}>Available Assessments</h1>
      <p style={styles.subtitle}>Welcome, {user?.email}. Select an assessment to begin.</p>
      
      {assessments.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No assessments available at this time.</p>
        </div>
      ) : (
        <div style={styles.grid}>
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
                  background: getGradient(type)
                }}>
                  <span style={styles.cardIcon}>{getIcon(type)}</span>
                  <h3 style={styles.cardTitle}>{assessment.title}</h3>
                  {isCompleted && <span style={styles.completedBadge}>✓ Completed</span>}
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.stats}>
                    <div>📝 {type?.question_count || 100} Questions</div>
                    <div>⏱️ 180 Minutes (3 hours)</div>
                    <div>🎯 Max Score: {type?.max_score || 500}</div>
                  </div>
                  
                  <button
                    onClick={() => handleStartClick(assessment)}
                    disabled={isCompleted}
                    style={{
                      ...styles.button,
                      background: isCompleted ? '#9e9e9e' : getGradient(type),
                      cursor: isCompleted ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isCompleted ? 'Already Completed' : 'Start Assessment'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && selectedAssessment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>📋</span>
              <h2 style={styles.modalTitle}>Assessment Instructions</h2>
              <button onClick={() => setShowInstructions(false)} style={styles.closeButton}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
              {/* Time & Attempts */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>⏱️ Time & Attempts</h3>
                <ul style={styles.instructionList}>
                  <li><strong>Time Limit:</strong> 3 hours (180 minutes)</li>
                  <li><strong>One Attempt Only:</strong> Once submitted, you cannot retake</li>
                  <li><strong>Auto-Save:</strong> Your answers are saved automatically</li>
                  <li><strong>Auto-Submit:</strong> Assessment submits automatically if time expires or security rules are violated</li>
                </ul>
              </div>

              {/* DO's */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>✅ DO's</h3>
                <ul style={styles.instructionList}>
                  <li>Use a stable internet connection</li>
                  <li>Find a quiet, distraction-free environment</li>
                  <li>Read each question carefully</li>
                  <li>Answer honestly – there are no right or wrong answers</li>
                  <li>Use the Question Navigator to jump between questions</li>
                  <li>Review and change answers before final submission</li>
                  <li>Complete all 100 questions</li>
                  <li>Submit only when you are ready</li>
                  <li>Contact your supervisor if you need assistance</li>
                </ul>
              </div>

              {/* DON'Ts */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>❌ DON'Ts</h3>
                <ul style={styles.instructionList}>
                  <li><strong>Don't switch tabs or windows</strong> – Excessive switching may auto-submit</li>
                  <li><strong>Don't open the assessment in multiple tabs</strong> – This triggers a security warning</li>
                  <li><strong>Don't use keyboard shortcuts</strong> – Ctrl+C, Ctrl+V, Ctrl+R, F5 are disabled</li>
                  <li><strong>Don't right-click</strong> – Copy/paste is disabled</li>
                  <li><strong>Don't open Developer Tools</strong> – Detected and may auto-submit</li>
                  <li><strong>Don't exit fullscreen mode repeatedly</strong> – May trigger auto-submission</li>
                  <li><strong>Don't refresh the page</strong> – Use navigation buttons instead</li>
                  <li><strong>Don't guess randomly</strong> – Honest answers provide valuable insights</li>
                  <li><strong>Don't overthink</strong> – Go with your first instinct</li>
                </ul>
              </div>

              {/* Security Monitoring */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>🛡️ Security Monitoring</h3>
                <table style={styles.securityTable}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Consequence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Tab/window switching</td><td>Warning after 1st; auto-submit after 3</td></tr>
                    <tr><td>Opening Developer Tools</td><td>Warning; repeated attempts auto-submit</td></tr>
                    <tr><td>Exiting fullscreen</td><td>Warning; repeated attempts auto-submit</td></tr>
                    <tr><td>Copy/paste attempts</td><td>Blocked</td></tr>
                    <tr><td>Keyboard shortcuts</td><td>Blocked</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Pro Tips */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>💡 Pro Tips</h3>
                <ul style={styles.instructionList}>
                  <li>Trust your instinct – the first answer is often the most authentic</li>
                  <li>Don't analyze the question – read once and respond naturally</li>
                  <li>Use the navigator – you can skip questions and return later</li>
                  <li>Green numbers in the navigator show answered questions</li>
                  <li>Review all answers before final submission</li>
                </ul>
              </div>

              {/* Checklist */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>📋 Before You Start Checklist</h3>
                <ul style={styles.checklist}>
                  <li><input type="checkbox" id="check1" /> <label htmlFor="check1"> Stable internet connection</label></li>
                  <li><input type="checkbox" id="check2" /> <label htmlFor="check2"> Quiet, distraction-free environment</label></li>
                  <li><input type="checkbox" id="check3" /> <label htmlFor="check3"> 3 uninterrupted hours available</label></li>
                  <li><input type="checkbox" id="check4" /> <label htmlFor="check4"> Understand this is a one-time assessment</label></li>
                  <li><input type="checkbox" id="check5" /> <label htmlFor="check5"> Will answer honestly based on natural tendencies</label></li>
                  <li><input type="checkbox" id="check6" /> <label htmlFor="check6"> Will not switch tabs or use keyboard shortcuts</label></li>
                  <li><input type="checkbox" id="check7" /> <label htmlFor="check7"> Understand results will be shared with supervisor</label></li>
                </ul>
              </div>

              {/* Need Help */}
              <div style={styles.instructionSection}>
                <h3 style={styles.sectionTitle}>📞 Need Help?</h3>
                <ul style={styles.instructionList}>
                  <li><strong>Assessment access:</strong> Contact your supervisor</li>
                  <li><strong>Technical issues:</strong> Refresh the page (progress is saved)</li>
                  <li><strong>Access denied:</strong> Supervisor must unblock the assessment</li>
                </ul>
              </div>

              {/* Confirmation */}
              <div style={styles.confirmationSection}>
                <p style={styles.confirmationText}>
                  By starting this assessment, you confirm that you have read and understood these instructions, 
                  will answer honestly, and agree to follow the security guidelines.
                </p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowInstructions(false)} style={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={confirmStart} style={styles.startButton}>
                I Understand & Start Assessment →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div style={styles.infoNote}>
        <p>⚠️ <strong>Important:</strong> Each assessment has a 3-hour time limit (180 minutes). Your progress is automatically saved.</p>
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  backButton: {
    padding: '8px 20px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '30px',
    transition: 'all 0.2s',
    color: '#333',
    ':hover': {
      background: '#e0e0e0'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px'
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  errorCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1565c0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  title: {
    fontSize: '32px',
    color: '#333',
    marginBottom: '10px',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '40px',
    textAlign: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    padding: '20px',
    color: 'white',
    position: 'relative'
  },
  cardIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '10px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    paddingRight: '70px'
  },
  completedBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(255,255,255,0.3)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  cardBody: {
    padding: '20px'
  },
  stats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#666'
  },
  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '5px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'opacity 0.2s',
    cursor: 'pointer'
  },
  retryButton: {
    padding: '10px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  infoNote: {
    marginTop: '40px',
    padding: '16px 20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    color: '#666',
    fontSize: '14px',
    textAlign: 'center'
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(5px)'
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc'
  },
  modalIcon: {
    fontSize: '28px'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929',
    flex: 1,
    marginLeft: '12px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '8px',
    ':hover': {
      background: '#e2e8f0'
    }
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  instructionSection: {
    marginBottom: '24px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 12px 0'
  },
  instructionList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#334155',
    lineHeight: '1.6',
    '& li': {
      marginBottom: '6px'
    }
  },
  checklist: {
    margin: 0,
    paddingLeft: '0',
    listStyle: 'none',
    '& li': {
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  },
  securityTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    '& th, & td': {
      padding: '8px 12px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0'
    },
    '& th': {
      background: '#f1f5f9',
      fontWeight: 600,
      color: '#0A1929'
    }
  },
  confirmationSection: {
    marginTop: '16px',
    padding: '16px',
    background: '#e8f5e9',
    borderRadius: '12px',
    borderLeft: '4px solid #4caf50'
  },
  confirmationText: {
    margin: 0,
    fontSize: '14px',
    color: '#2e7d32',
    lineHeight: '1.5'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    color: '#475569',
    transition: 'all 0.2s',
    ':hover': {
      background: '#e2e8f0'
    }
  },
  startButton: {
    padding: '10px 24px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)'
    }
  }
};
