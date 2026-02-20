import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Check supervisor authentication
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn) {
            setIsSupervisor(true);
          } else {
            router.push("/supervisor-login");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };
    checkAuth();
  }, [router]);

  // Fetch candidate data
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Get candidate info
        const { data: profileData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        setCandidate({
          id: user_id,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        // Get assessment results
        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        console.log("Assessment Results:", resultsData);

        if (resultsData && resultsData.length > 0) {
          setAssessmentResult(resultsData[0]); // Get the most recent
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor, user_id]);

  // Helper function to get grade info
  const getGradeInfo = (percentage) => {
    if (percentage >= 90) return { grade: 'A', color: '#2E7D32', bg: '#E8F5E9', text: 'Excellent' };
    if (percentage >= 80) return { grade: 'B', color: '#2E7D32', bg: '#E8F5E9', text: 'Very Good' };
    if (percentage >= 70) return { grade: 'C', color: '#1565C0', bg: '#E3F2FD', text: 'Good' };
    if (percentage >= 60) return { grade: 'D', color: '#F57C00', bg: '#FFF3E0', text: 'Fair' };
    return { grade: 'F', color: '#C62828', bg: '#FFEBEE', text: 'Needs Improvement' };
  };

  if (!isSupervisor || loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading candidate report...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>👤</div>
        <h3>Candidate Not Found</h3>
        <p>The requested candidate could not be found.</p>
        <Link href="/supervisor" legacyBehavior>
          <a style={styles.primaryButton}>← Back to Dashboard</a>
        </Link>
      </div>
    );
  }

  if (!assessmentResult) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <h3>No Assessment Data Available</h3>
        <p>This candidate hasn't completed any assessments yet.</p>
        <Link href="/supervisor" legacyBehavior>
          <a style={styles.primaryButton}>← Back to Dashboard</a>
        </Link>
      </div>
    );
  }

  const totalPercentage = Math.round((assessmentResult.total_score / assessmentResult.max_score) * 100);
  const gradeInfo = getGradeInfo(totalPercentage);

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Dashboard</a>
          </Link>
        </div>

        {/* CARD 1: Candidate Summary */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <div>
              <h1 style={styles.candidateName}>{candidate.full_name}</h1>
              <p style={styles.candidateEmail}>{candidate.email}</p>
            </div>
            <div style={styles.completedDate}>
              Completed: {new Date(assessmentResult.completed_at).toLocaleDateString()}
            </div>
          </div>
          
          <div style={styles.scoreGrid}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Total Score</span>
              <span style={styles.scoreValue}>{assessmentResult.total_score}/{assessmentResult.max_score}</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Percentage</span>
              <span style={{...styles.scoreValue, color: gradeInfo.color}}>{totalPercentage}%</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Grade</span>
              <span style={{
                ...styles.gradeBadge,
                background: gradeInfo.bg,
                color: gradeInfo.color
              }}>{gradeInfo.grade}</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Classification</span>
              <span style={{
                ...styles.classificationBadge,
                background: gradeInfo.bg,
                color: gradeInfo.color
              }}>{gradeInfo.text}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Category Breakdown */}
        {assessmentResult.category_scores && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>📊</span>
              <h3 style={styles.cardTitle}>Performance by Category</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.tableHead}>Category</th>
                      <th style={styles.tableHead}>Score</th>
                      <th style={styles.tableHead}>Percentage</th>
                      <th style={styles.tableHead}>Grade</th>
                      <th style={styles.tableHead}>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(assessmentResult.category_scores).map(([category, data]) => {
                      const categoryGrade = getGradeInfo(data.percentage);
                      const percentage = data.percentage;
                      
                      // Determine background color based on percentage
                      let rowColor = '#ffffff';
                      if (percentage >= 80) rowColor = '#f0fff4';
                      else if (percentage >= 70) rowColor = '#e8f5e9';
                      else if (percentage >= 60) rowColor = '#fff8e1';
                      else rowColor = '#ffebee';
                      
                      return (
                        <tr key={category} style={{ ...styles.tableRow, backgroundColor: rowColor }}>
                          <td style={styles.tableCell}>
                            <strong>{category}</strong>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{ fontWeight: 600 }}>
                              {data.score}/{data.maxPossible}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.progressContainer}>
                              <div style={styles.progressBar}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: '100%',
                                  background: categoryGrade.color,
                                  borderRadius: '4px'
                                }} />
                              </div>
                              <span style={{ fontWeight: 600, color: categoryGrade.color }}>
                                {percentage}%
                              </span>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.gradeBadgeSmall,
                              background: categoryGrade.bg,
                              color: categoryGrade.color
                            }}>
                              {categoryGrade.grade}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.assessmentBadge,
                              background: categoryGrade.bg,
                              color: categoryGrade.color
                            }}>
                              {categoryGrade.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CARD 3: Detailed Analysis */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🔍</span>
            <h3 style={styles.cardTitle}>Detailed Analysis</h3>
          </div>
          <div style={styles.cardContent}>
            
            {/* Executive Summary */}
            {assessmentResult.interpretations?.executiveSummary && (
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>📋 Executive Summary</h4>
                <p style={styles.analysisText}>{assessmentResult.interpretations.executiveSummary}</p>
              </div>
            )}

            {/* Strengths */}
            {assessmentResult.strengths && assessmentResult.strengths.length > 0 && (
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>💪 Strengths</h4>
                <div style={styles.strengthList}>
                  {assessmentResult.strengths.map((strength, index) => (
                    <div key={index} style={styles.strengthItem}>
                      <span style={styles.strengthBullet}>✅</span>
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Areas for Improvement */}
            {assessmentResult.weaknesses && assessmentResult.weaknesses.length > 0 && (
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>📈 Areas for Improvement</h4>
                <div style={styles.weaknessList}>
                  {assessmentResult.weaknesses.map((weakness, index) => (
                    <div key={index} style={styles.weaknessItem}>
                      <span style={styles.weaknessBullet}>📌</span>
                      <span>{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {assessmentResult.recommendations && assessmentResult.recommendations.length > 0 && (
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>🎯 Recommendations</h4>
                <div style={styles.recommendationsList}>
                  {assessmentResult.recommendations.map((rec, index) => (
                    <div key={index} style={styles.recommendationItem}>
                      <span style={styles.recommendationBullet}>•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Profile */}
            {assessmentResult.interpretations?.overallProfile && (
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>📌 Overall Profile</h4>
                <p style={styles.analysisText}>{assessmentResult.interpretations.overallProfile}</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>Report generated on {new Date().toLocaleDateString()} • Confidential</p>
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
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1565c0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    margin: '20px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    background: '#1565c0',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '30px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    marginTop: '20px',
    transition: 'all 0.2s',
    cursor: 'pointer',
    ':hover': {
      background: '#0d47a1',
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(21, 101, 192, 0.3)'
    }
  },
  container: {
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    marginBottom: '30px'
  },
  backButton: {
    color: '#1565c0',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #1565c0',
    transition: 'all 0.2s',
    ':hover': {
      background: '#1565c0',
      color: 'white'
    }
  },
  summaryCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '25px',
    borderRadius: '12px',
    color: 'white',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  candidateName: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    fontWeight: 600
  },
  candidateEmail: {
    margin: 0,
    fontSize: '14px',
    opacity: 0.9
  },
  completedDate: {
    fontSize: '14px',
    opacity: 0.9
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  scoreItem: {
    background: 'rgba(255,255,255,0.1)',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)'
  },
  scoreLabel: {
    fontSize: '12px',
    opacity: 0.9,
    marginBottom: '5px',
    display: 'block'
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: 700,
    display: 'block'
  },
  gradeBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '30px',
    fontWeight: 700,
    fontSize: '18px'
  },
  classificationBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '30px',
    fontWeight: 600,
    fontSize: '14px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '20px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  cardIcon: {
    fontSize: '24px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  cardContent: {
    padding: '20px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #1565c0',
    backgroundColor: '#f5f5f5'
  },
  tableHead: {
    padding: '12px',
    fontWeight: 600,
    color: '#333',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background 0.2s'
  },
  tableCell: {
    padding: '12px'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  progressBar: {
    width: '80px',
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  gradeBadgeSmall: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '12px'
  },
  assessmentBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
  },
  analysisSection: {
    marginBottom: '30px'
  },
  analysisTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 15px 0',
    paddingBottom: '8px',
    borderBottom: '2px solid #1565c0'
  },
  analysisText: {
    fontSize: '15px',
    color: '#555',
    lineHeight: '1.8',
    margin: 0
  },
  strengthList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  strengthItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#f0fff4',
    borderRadius: '8px',
    border: '1px solid #c8e6c9'
  },
  strengthBullet: {
    fontSize: '16px'
  },
  weaknessList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  weaknessItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#fff8e1',
    borderRadius: '8px',
    border: '1px solid #ffe0b2'
  },
  weaknessBullet: {
    fontSize: '16px'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  recommendationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px',
    background: '#e3f2fd',
    borderRadius: '8px',
    border: '1px solid #bbdefb'
  },
  recommendationBullet: {
    fontSize: '16px',
    color: '#1565c0',
    fontWeight: 'bold'
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#999',
    fontSize: '12px'
  }
};
