import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [developmentPlan, setDevelopmentPlan] = useState({});
  const [interpretations, setInterpretations] = useState({});
  const [executiveSummary, setExecutiveSummary] = useState('');

  // Professional grade definitions
  const gradeScale = [
    { grade: 'A+', min: 95, color: '#1B5E20', bg: '#E8F5E9', description: 'Exceeds expectations - Mastery level' },
    { grade: 'A', min: 90, color: '#2E7D32', bg: '#E8F5E9', description: 'Excellent performance' },
    { grade: 'A-', min: 85, color: '#2E7D32', bg: '#E8F5E9', description: 'Very good performance' },
    { grade: 'B+', min: 80, color: '#2E7D32', bg: '#E8F5E9', description: 'Good performance' },
    { grade: 'B', min: 75, color: '#1565C0', bg: '#E3F2FD', description: 'Satisfactory performance' },
    { grade: 'B-', min: 70, color: '#1565C0', bg: '#E3F2FD', description: 'Adequate performance' },
    { grade: 'C+', min: 65, color: '#F57C00', bg: '#FFF3E0', description: 'Developing - Shows potential' },
    { grade: 'C', min: 60, color: '#F57C00', bg: '#FFF3E0', description: 'Basic competency' },
    { grade: 'C-', min: 55, color: '#F57C00', bg: '#FFF3E0', description: 'Minimum competency' },
    { grade: 'D+', min: 50, color: '#C62828', bg: '#FFEBEE', description: 'Below expectations' },
    { grade: 'D', min: 40, color: '#C62828', bg: '#FFEBEE', description: 'Significant gaps' },
    { grade: 'F', min: 0, color: '#B71C1C', bg: '#FFEBEE', description: 'Unsatisfactory' }
  ];

  const getGradeInfo = (percentage) => {
    return gradeScale.find(g => percentage >= g.min) || gradeScale[gradeScale.length - 1];
  };

  const getOverallRating = (percentage) => {
    if (percentage >= 80) return 'Strong Performer';
    if (percentage >= 60) return 'Competent Performer';
    if (percentage >= 40) return 'Developing Performer';
    return 'Needs Development';
  };

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
          .single();

        setCandidate({
          id: user_id,
          full_name: profileData?.full_name || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        // Get assessments
        const { data: candidateAssessments } = await supabase
          .from('candidate_assessments')
          .select(`
            id,
            assessment_id,
            score,
            completed_at,
            assessments (
              id,
              title,
              assessment_type:assessment_types (
                code,
                name
              )
            )
          `)
          .eq('user_id', user_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        // Get detailed results
        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id);

        const resultsMap = {};
        if (resultsData) {
          resultsData.forEach(result => {
            resultsMap[result.assessment_id] = result;
          });
        }

        if (candidateAssessments) {
          const formatted = candidateAssessments.map(assessment => {
            const result = resultsMap[assessment.assessment_id];
            return {
              id: assessment.id,
              assessment_id: assessment.assessment_id,
              name: assessment.assessments?.title || 'Assessment',
              type: assessment.assessments?.assessment_type?.code || 'general',
              score: assessment.score,
              max_score: 500,
              percentage: Math.round((assessment.score / 500) * 100),
              completed_at: assessment.completed_at,
              category_scores: result?.category_scores || {},
              strengths: result?.strengths || [],
              weaknesses: result?.weaknesses || [],
              recommendations: result?.recommendations || [],
              development_plan: result?.development_plan || {},
              interpretations: result?.interpretations || {}
            };
          });
          setAssessments(formatted);
          if (formatted.length > 0) {
            setSelectedAssessment(formatted[0]);
            const first = formatted[0];
            setCategoryScores(first.category_scores || {});
            setStrengths(first.strengths || []);
            setWeaknesses(first.weaknesses || []);
            setRecommendations(first.recommendations || []);
            setDevelopmentPlan(first.development_plan || {});
            setInterpretations(first.interpretations || {});
            setExecutiveSummary(first.interpretations?.executiveSummary || first.interpretations?.summary || '');
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isSupervisor, user_id]);

  const handleAssessmentChange = (e) => {
    const selected = assessments.find(a => a.id === e.target.value);
    setSelectedAssessment(selected);
    setCategoryScores(selected.category_scores);
    setStrengths(selected.strengths);
    setWeaknesses(selected.weaknesses);
    setRecommendations(selected.recommendations);
    setDevelopmentPlan(selected.development_plan);
    setInterpretations(selected.interpretations);
    setExecutiveSummary(selected.interpretations?.executiveSummary || '');
  };

  const handleBack = () => router.push('/supervisor');

  if (!isSupervisor || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading report...</p>
      </div>
    );
  }

  if (!candidate || !assessments.length) {
    return (
      <div style={styles.errorContainer}>
        <h2>No Data Available</h2>
        <button onClick={handleBack} style={styles.button}>← Back to Dashboard</button>
      </div>
    );
  }

  const current = selectedAssessment || assessments[0];
  const overallGrade = getGradeInfo(current.percentage);
  const overallRating = getOverallRating(current.percentage);

  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>← Back to Dashboard</button>
          <div style={styles.titleSection}>
            <h1 style={styles.candidateName}>{candidate.full_name}</h1>
            <p style={styles.candidateEmail}>{candidate.email}</p>
          </div>
          {assessments.length > 1 && (
            <select 
              value={current.id} 
              onChange={handleAssessmentChange}
              style={styles.select}
            >
              {assessments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} - {new Date(a.completed_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Report Header */}
        <div style={styles.reportHeader}>
          <div>
            <h2 style={styles.assessmentTitle}>{current.name}</h2>
            <p style={styles.completionDate}>Completed: {new Date(current.completed_at).toLocaleString()}</p>
          </div>
          <div style={styles.scoreCard}>
            <span style={styles.scoreValue}>{current.score}</span>
            <span style={styles.scoreMax}>/{current.max_score}</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div style={styles.summaryCard}>
          <h3 style={styles.sectionTitle}>Executive Summary</h3>
          <p style={styles.summaryText}>
            {executiveSummary || `${candidate.full_name} scored ${current.percentage}% (${overallGrade.grade}) on the ${current.name}, indicating they are a ${overallRating}.`}
          </p>
          <div style={styles.overallRating}>
            <span style={styles.ratingLabel}>Overall Rating:</span>
            <span style={{...styles.ratingValue, color: overallGrade.color}}>{overallRating} ({overallGrade.grade})</span>
          </div>
        </div>

        {/* Category Scores Table */}
        <div style={styles.tableCard}>
          <h3 style={styles.sectionTitle}>Performance by Category</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Percentage</th>
                  <th style={styles.th}>Grade</th>
                  <th style={styles.th}>Comment</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryScores).map(([category, data]) => {
                  const grade = getGradeInfo(data.percentage);
                  return (
                    <tr key={category}>
                      <td style={styles.td}><strong>{category}</strong></td>
                      <td style={styles.td}>{data.score}/{data.maxPossible}</td>
                      <td style={styles.td}>{data.percentage}%</td>
                      <td style={{...styles.td, color: grade.color, fontWeight: 600}}>{grade.grade}</td>
                      <td style={styles.td}>{grade.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strengths & Weaknesses Grid */}
        <div style={styles.grid2}>
          {/* Strengths Card */}
          <div style={styles.strengthCard}>
            <h3 style={{...styles.cardTitle, color: '#2E7D32'}}>✓ Key Strengths</h3>
            {strengths.length > 0 ? (
              <ul style={styles.list}>
                {strengths.map((s, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={styles.bullet}>✓</span>
                    <span>{typeof s === 'string' ? s : s.area || s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>No specific strengths identified</p>
            )}
          </div>

          {/* Weaknesses Card */}
          <div style={styles.weaknessCard}>
            <h3 style={{...styles.cardTitle, color: '#C62828'}}>! Development Areas</h3>
            {weaknesses.length > 0 ? (
              <ul style={styles.list}>
                {weaknesses.map((w, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={styles.bullet}>!</span>
                    <span>{typeof w === 'string' ? w : w.area || w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>No development areas identified</p>
            )}
          </div>
        </div>

        {/* Recommendations Card */}
        {recommendations.length > 0 && (
          <div style={styles.recommendationsCard}>
            <h3 style={styles.cardTitle}>📋 Recommendations</h3>
            <ul style={styles.list}>
              {recommendations.map((rec, i) => (
                <li key={i} style={styles.listItem}>
                  <span style={styles.bullet}>•</span>
                  <span>{typeof rec === 'string' ? rec : rec.message || rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Development Plan */}
        {developmentPlan && Object.keys(developmentPlan).length > 0 && (
          <div style={styles.planCard}>
            <h3 style={styles.cardTitle}>📅 Development Action Plan</h3>
            <div style={styles.planGrid}>
              {developmentPlan.immediate && developmentPlan.immediate.length > 0 && (
                <div style={styles.planPhase}>
                  <h4 style={styles.phaseTitle}>Immediate (0-30 days)</h4>
                  <ul style={styles.list}>
                    {developmentPlan.immediate.map((item, i) => (
                      <li key={i} style={styles.planItem}>
                        <strong>{item.area}:</strong> {item.recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {developmentPlan.shortTerm && developmentPlan.shortTerm.length > 0 && (
                <div style={styles.planPhase}>
                  <h4 style={styles.phaseTitle}>Short-term (30-60 days)</h4>
                  <ul style={styles.list}>
                    {developmentPlan.shortTerm.map((item, i) => (
                      <li key={i} style={styles.planItem}>
                        <strong>{item.area}:</strong> {item.recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {developmentPlan.longTerm && developmentPlan.longTerm.length > 0 && (
                <div style={styles.planPhase}>
                  <h4 style={styles.phaseTitle}>Long-term (60-90+ days)</h4>
                  <ul style={styles.list}>
                    {developmentPlan.longTerm.map((item, i) => (
                      <li key={i} style={styles.planItem}>
                        <strong>{item.area}:</strong> {item.recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p>Report generated on {new Date().toLocaleDateString()} | Confidential</p>
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
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  loadingContainer: {
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
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  header: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'none',
    border: '1px solid #1565c0',
    color: '#1565c0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#1565c0',
      color: 'white'
    }
  },
  titleSection: {
    flex: 1
  },
  candidateName: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    fontWeight: 600,
    color: '#333'
  },
  candidateEmail: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '250px',
    background: 'white'
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  },
  assessmentTitle: {
    margin: '0 0 5px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#333'
  },
  completionDate: {
    margin: 0,
    color: '#666',
    fontSize: '13px'
  },
  scoreCard: {
    display: 'flex',
    alignItems: 'baseline',
    padding: '15px 25px',
    background: '#1565c0',
    borderRadius: '8px',
    color: 'white'
  },
  scoreValue: {
    fontSize: '36px',
    fontWeight: 700,
    lineHeight: 1
  },
  scoreMax: {
    fontSize: '16px',
    opacity: 0.8,
    marginLeft: '5px'
  },
  summaryCard: {
    padding: '25px',
    marginBottom: '30px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  summaryText: {
    margin: '0 0 15px 0',
    fontSize: '15px',
    color: '#555',
    lineHeight: '1.6'
  },
  overallRating: {
    padding: '12px 15px',
    background: '#f8f9fa',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  ratingLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333'
  },
  ratingValue: {
    fontSize: '16px',
    fontWeight: 700
  },
  tableCard: {
    padding: '25px',
    marginBottom: '30px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    background: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: 600,
    color: '#333'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    color: '#555'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '25px',
    marginBottom: '30px'
  },
  strengthCard: {
    padding: '25px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    borderTop: '4px solid #2E7D32'
  },
  weaknessCard: {
    padding: '25px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    borderTop: '4px solid #C62828'
  },
  recommendationsCard: {
    padding: '25px',
    marginBottom: '30px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    borderTop: '4px solid #1565c0'
  },
  planCard: {
    padding: '25px',
    marginBottom: '30px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
    color: '#555'
  },
  bullet: {
    fontSize: '16px',
    fontWeight: 600,
    minWidth: '20px'
  },
  emptyText: {
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  planPhase: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },
  phaseTitle: {
    margin: '0 0 15px 0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#333'
  },
  planItem: {
    marginBottom: '8px',
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5'
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#999',
    fontSize: '12px'
  },
  button: {
    padding: '10px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px'
  }
};
