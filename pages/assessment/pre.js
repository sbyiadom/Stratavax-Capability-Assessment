import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

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

      // For each assessment, check if the user has completed it
      const assessmentsWithStatus = await Promise.all(
        assessmentsData.map(async (assessment) => {
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
                    <div>⏱️ {type?.time_limit_minutes || 60} Minutes</div>
                    <div>🎯 Max Score: {type?.max_score || 100}</div>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/assessment/${assessment.id}`)}
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
  }
};
