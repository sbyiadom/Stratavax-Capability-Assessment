import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";
import {
  getGradeInfo,
  getOverallRating,
  getStrengthComment,
  getWeaknessComment,
  gradeScale
} from "../../utils/dynamicReportGenerator";

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
  const [assessmentType, setAssessmentType] = useState('general');

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
        const { data: profileData, error: profileError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        setCandidate({
          id: user_id,
          full_name: profileData?.full_name || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        // Get assessments with scores
        const { data: candidateAssessments, error: candidateError } = await supabase
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

        if (candidateError) {
          console.error("Error fetching candidate assessments:", candidateError);
        }

        // Get detailed results from assessment_results
        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id);

        if (resultsError) {
          console.error("Error fetching assessment results:", resultsError);
        }

        // Create a map of results by assessment_id
        const resultsMap = {};
        if (resultsData) {
          resultsData.forEach(result => {
            resultsMap[result.assessment_id] = result;
          });
        }

        // Combine the data
        if (candidateAssessments && candidateAssessments.length > 0) {
          const formattedAssessments = candidateAssessments.map(assessment => {
            const detailedResult = resultsMap[assessment.assessment_id];
            const percentage = assessment.score ? Math.round((assessment.score / 500) * 100) : 0;
            const type = assessment.assessments?.assessment_type?.code || 'general';
            
            return {
              id: assessment.id,
              assessment_id: assessment.assessment_id,
              name: assessment.assessments?.title || 'Assessment',
              type,
              score: assessment.score || 0,
              max_score: 500,
              percentage,
              completed_at: assessment.completed_at,
              category_scores: detailedResult?.category_scores || {},
              strengths: detailedResult?.strengths || [],
              weaknesses: detailedResult?.weaknesses || [],
              recommendations: detailedResult?.recommendations || [],
              development_plan: detailedResult?.development_plan || {},
              interpretations: detailedResult?.interpretations || {},
              executive_summary: detailedResult?.interpretations?.summary || detailedResult?.interpretations?.executiveSummary || '',
              overall_profile: detailedResult?.interpretations?.overallProfile || ''
            };
          });

          setAssessments(formattedAssessments);
          
          // Select the most recent assessment
          if (formattedAssessments.length > 0) {
            const mostRecent = formattedAssessments[0];
            setSelectedAssessment(mostRecent);
            
            // Set the detailed data directly from the database
            setCategoryScores(mostRecent.category_scores || {});
            setStrengths(mostRecent.strengths || []);
            setWeaknesses(mostRecent.weaknesses || []);
            setRecommendations(mostRecent.recommendations || []);
            setDevelopmentPlan(mostRecent.development_plan || {});
            setInterpretations(mostRecent.interpretations || {});
            setExecutiveSummary(mostRecent.executive_summary || '');
            setAssessmentType(mostRecent.type);
          }
        } else {
          console.log("No completed assessments found for user:", user_id);
        }

      } catch (error) {
        console.error("Error fetching candidate data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isSupervisor, user_id]);

  const handleAssessmentChange = (e) => {
    const selected = assessments.find(a => a.id === e.target.value);
    setSelectedAssessment(selected);
    setCategoryScores(selected.category_scores || {});
    setStrengths(selected.strengths || []);
    setWeaknesses(selected.weaknesses || []);
    setRecommendations(selected.recommendations || []);
    setDevelopmentPlan(selected.development_plan || {});
    setInterpretations(selected.interpretations || {});
    setExecutiveSummary(selected.executive_summary || '');
    setAssessmentType(selected.type);
  };

  const handleBack = () => router.push('/supervisor');

  if (!isSupervisor || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading candidate report...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={styles.errorContainer}>
        <h2>Candidate Not Found</h2>
        <p>The requested candidate could not be found.</p>
        <button onClick={handleBack} style={styles.primaryButton}>← Back to Dashboard</button>
      </div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div style={styles.errorContainer}>
        <h2>No Assessment Data Available</h2>
        <p>This candidate hasn't completed any assessments yet.</p>
        <button onClick={handleBack} style={styles.primaryButton}>← Back to Dashboard</button>
      </div>
    );
  }

  const current = selectedAssessment || assessments[0];
  const overallGrade = getGradeInfo(current.percentage);
  const overallRating = getOverallRating(current.percentage, current.strengths, current.weaknesses, current.type);

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>← Dashboard</button>
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.candidateName}>{candidate.full_name}</h1>
              <p style={styles.candidateEmail}>{candidate.email}</p>
            </div>
            {assessments.length > 1 && (
              <select 
                value={current.id} 
                onChange={handleAssessmentChange}
                style={styles.assessmentSelect}
              >
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} - {new Date(a.completed_at).toLocaleDateString()} ({a.score}/{a.max_score})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Hero Score Section */}
        <div style={{
          ...styles.heroSection,
          background: `linear-gradient(135deg, ${overallGrade.color}, ${adjustColor(overallGrade.color, 30)})`
        }}>
          <div style={styles.heroContent}>
            <div>
              <div style={styles.heroTitle}>{current.name}</div>
              <div style={styles.heroDate}>Completed: {new Date(current.completed_at).toLocaleString()}</div>
            </div>
            <div style={styles.heroScoreCard}>
              <span style={styles.heroScore}>{current.score}</span>
              <span style={styles.heroMax}>/{current.max_score}</span>
            </div>
          </div>
          <div style={styles.heroStats}>
            <div style={styles.heroStat}>
              <div style={styles.heroStatLabel}>Percentage</div>
              <div style={styles.heroStatValue}>{current.percentage}%</div>
            </div>
            <div style={styles.heroStat}>
              <div style={styles.heroStatLabel}>Grade</div>
              <div style={{...styles.heroStatValue, fontSize: '32px'}}>{overallGrade.grade}</div>
            </div>
            <div style={styles.heroStat}>
              <div style={styles.heroStatLabel}>Rating</div>
              <div style={styles.heroStatValue}>{overallRating.title}</div>
            </div>
          </div>
        </div>

        {/* Executive Summary - Use data from database, not regenerated */}
        {executiveSummary && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryHeader}>
              <span style={styles.summaryIcon}>📋</span>
              <h2 style={styles.summaryTitle}>Executive Summary</h2>
            </div>
            <p style={styles.summaryText}>{executiveSummary}</p>
            <div style={{...styles.ratingBadge, background: overallGrade.bg, color: overallGrade.color}}>
              <span style={styles.ratingIcon}>{overallRating.icon}</span>
              <span><strong>Overall Assessment:</strong> {overallRating.title} • Grade {overallGrade.grade}</span>
            </div>
          </div>
        )}

        {/* Category Performance Table */}
        {Object.keys(current.category_scores).length > 0 && (
          <div style={styles.tableCard}>
            <div style={styles.tableHeader}>
              <span style={styles.tableIcon}>📊</span>
              <h2 style={styles.tableTitle}>Performance by Category</h2>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>Percentage</th>
                    <th style={styles.th}>Grade</th>
                    <th style={styles.th}>Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(current.category_scores).map(([category, data]) => {
                    const grade = getGradeInfo(data.percentage);
                    
                    // Determine row background color based on percentage
                    let rowColor = '#ffffff';
                    if (data.percentage >= 80) {
                      rowColor = '#f0fff4'; // Light green
                    } else if (data.percentage >= 60) {
                      rowColor = '#fff8e1'; // Light amber
                    } else if (data.percentage >= 40) {
                      rowColor = '#fff3e0'; // Light orange
                    } else {
                      rowColor = '#ffebee'; // Light red
                    }
                    
                    // Progress bar color
                    let progressColor = '';
                    if (data.percentage >= 80) progressColor = '#4caf50';
                    else if (data.percentage >= 60) progressColor = '#ff9800';
                    else if (data.percentage >= 40) progressColor = '#ff5722';
                    else progressColor = '#f44336';
                    
                    return (
                      <tr key={category} style={{ backgroundColor: rowColor, borderBottom: '1px solid #e0e0e0' }}>
                        <td style={styles.td}>
                          <strong style={{ color: grade.color }}>{category}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontWeight: 600, color: grade.color }}>
                            {data.score}/{data.maxPossible}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '80px',
                              height: '8px',
                              background: '#e0e0e0',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${data.percentage}%`,
                                height: '100%',
                                background: progressColor,
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontWeight: 600, color: grade.color, minWidth: '45px' }}>
                              {data.percentage}%
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: grade.bg,
                            color: grade.color,
                            fontWeight: 700,
                            fontSize: '13px'
                          }}>
                            {grade.grade}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: `${grade.color}15`,
                            color: grade.color,
                            fontSize: '13px',
                            fontWeight: 500
                          }}>
                            {grade.description}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses - Use data from database */}
        <div style={styles.grid2}>
          {/* Strengths Card */}
          <div style={styles.strengthCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #2E7D32, #1B5E20)'}}>
              <span style={styles.cardIcon}>🌟</span>
              <h3 style={styles.cardHeaderTitle}>Key Strengths</h3>
            </div>
            <div style={styles.cardContent}>
              {current.strengths && current.strengths.length > 0 ? (
                current.strengths.map((s, i) => {
                  const area = typeof s === 'string' ? s : s.area || s;
                  const percentage = typeof s === 'object' ? s.percentage : 
                                    current.category_scores[area]?.percentage;
                  return (
                    <div key={i} style={styles.strengthItem}>
                      <div style={styles.strengthTitle}>
                        <span style={styles.strengthIcon}>✓</span>
                        <span style={styles.strengthName}>{area}</span>
                        {percentage && (
                          <span style={{...styles.percentageBadge, background: '#E8F5E9', color: '#2E7D32'}}>
                            {percentage}%
                          </span>
                        )}
                      </div>
                      <p style={styles.strengthComment}>{getStrengthComment(area, percentage, current.strengths, current.type)}</p>
                    </div>
                  );
                })
              ) : (
                <p style={styles.emptyText}>No specific strengths identified in this assessment</p>
              )}
            </div>
          </div>

          {/* Weaknesses Card */}
          <div style={styles.weaknessCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #C62828, #8B0000)'}}>
              <span style={styles.cardIcon}>🎯</span>
              <h3 style={styles.cardHeaderTitle}>Development Areas</h3>
            </div>
            <div style={styles.cardContent}>
              {current.weaknesses && current.weaknesses.length > 0 ? (
                current.weaknesses.map((w, i) => {
                  const area = typeof w === 'string' ? w : w.area || w;
                  const percentage = typeof w === 'object' ? w.percentage : 
                                    current.category_scores[area]?.percentage;
                  return (
                    <div key={i} style={styles.weaknessItem}>
                      <div style={styles.weaknessTitle}>
                        <span style={styles.weaknessIcon}>!</span>
                        <span style={styles.weaknessName}>{area}</span>
                        {percentage && (
                          <span style={{...styles.percentageBadge, background: '#FFEBEE', color: '#C62828'}}>
                            {percentage}%
                          </span>
                        )}
                      </div>
                      <p style={styles.weaknessComment}>{getWeaknessComment(area, percentage, current.weaknesses, current.type)}</p>
                    </div>
                  );
                })
              ) : (
                <p style={styles.emptyText}>No significant development areas identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations Card */}
        {current.recommendations && current.recommendations.length > 0 && (
          <div style={styles.recommendationsCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #1565C0, #0D47A1)'}}>
              <span style={styles.cardIcon}>💡</span>
              <h3 style={styles.cardHeaderTitle}>Recommendations</h3>
            </div>
            <div style={styles.cardContent}>
              <ul style={styles.recommendationsList}>
                {current.recommendations.map((rec, i) => (
                  <li key={i} style={styles.recommendationItem}>
                    <span style={styles.recommendationBullet}>→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Development Plan */}
        {current.development_plan && Object.keys(current.development_plan).length > 0 && (
          <div style={styles.planCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #6A1B9A, #4A0072)'}}>
              <span style={styles.cardIcon}>📅</span>
              <h3 style={styles.cardHeaderTitle}>Development Action Plan</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.planGrid}>
                {current.development_plan.immediate && current.development_plan.immediate.length > 0 && (
                  <div style={styles.planPhase}>
                    <h4 style={styles.phaseTitle}>⚡ Immediate (0-30 days)</h4>
                    <ul style={styles.planList}>
                      {current.development_plan.immediate.map((item, i) => (
                        <li key={i} style={styles.planListItem}>
                          <strong>{item.area}:</strong> {item.recommendation}
                          {item.priority && <span style={styles.priorityTag}> {item.priority} Priority</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {current.development_plan.shortTerm && current.development_plan.shortTerm.length > 0 && (
                  <div style={styles.planPhase}>
                    <h4 style={styles.phaseTitle}>📈 Short-term (30-60 days)</h4>
                    <ul style={styles.planList}>
                      {current.development_plan.shortTerm.map((item, i) => (
                        <li key={i} style={styles.planListItem}>
                          <strong>{item.area}:</strong> {item.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {current.development_plan.longTerm && current.development_plan.longTerm.length > 0 && (
                  <div style={styles.planPhase}>
                    <h4 style={styles.phaseTitle}>🚀 Long-term (60-90+ days)</h4>
                    <ul style={styles.planList}>
                      {current.development_plan.longTerm.map((item, i) => (
                        <li key={i} style={styles.planListItem}>
                          <strong>{item.area}:</strong> {item.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppLayout>
  );
}

// Helper function to adjust color brightness
const adjustColor = (hex, percent) => {
  if (!hex) return '#666';
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    animation: 'fadeIn 0.5s ease'
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
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #1565c0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  header: {
    marginBottom: '30px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    padding: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'none',
    border: '1px solid #1565c0',
    color: '#1565c0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '15px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#1565c0',
      color: 'white'
    }
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  candidateName: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a2639',
    background: 'linear-gradient(135deg, #1a2639, #2d3748)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  candidateEmail: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  assessmentSelect: {
    padding: '10px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '30px',
    fontSize: '14px',
    minWidth: '280px',
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
    ':focus': {
      borderColor: '#1565c0'
    }
  },
  heroSection: {
    padding: '30px',
    borderRadius: '20px',
    color: 'white',
    marginBottom: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    position: 'relative',
    zIndex: 2
  },
  heroTitle: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '5px'
  },
  heroDate: {
    fontSize: '14px',
    opacity: 0.9
  },
  heroScoreCard: {
    display: 'flex',
    alignItems: 'baseline',
    background: 'rgba(255,255,255,0.2)',
    padding: '15px 25px',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)'
  },
  heroScore: {
    fontSize: '48px',
    fontWeight: 800,
    lineHeight: 1
  },
  heroMax: {
    fontSize: '20px',
    opacity: 0.8,
    marginLeft: '5px'
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    position: 'relative',
    zIndex: 2
  },
  heroStat: {
    textAlign: 'center',
    padding: '15px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    backdropFilter: 'blur(5px)'
  },
  heroStatLabel: {
    fontSize: '12px',
    opacity: 0.8,
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  heroStatValue: {
    fontSize: '24px',
    fontWeight: 700
  },
  summaryCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  summaryIcon: {
    fontSize: '28px'
  },
  summaryTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#333'
  },
  summaryText: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    color: '#555',
    lineHeight: '1.8'
  },
  ratingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px 20px',
    borderRadius: '12px',
    fontSize: '15px'
  },
  ratingIcon: {
    fontSize: '24px'
  },
  tableCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  tableIcon: {
    fontSize: '28px'
  },
  tableTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#333'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  th: {
    textAlign: 'left',
    padding: '15px 12px',
    background: '#f8f9fa',
    borderBottom: '2px solid #1565c0',
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
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  weaknessCard: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  recommendationsCard: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  planCard: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  cardHeader: {
    padding: '20px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  cardIcon: {
    fontSize: '28px'
  },
  cardHeaderTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  cardContent: {
    padding: '25px'
  },
  strengthItem: {
    marginBottom: '20px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  strengthTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  strengthIcon: {
    color: '#2E7D32',
    fontSize: '16px',
    fontWeight: 700
  },
  strengthName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333'
  },
  percentageBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    marginLeft: 'auto'
  },
  strengthComment: {
    margin: 0,
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
    fontStyle: 'italic'
  },
  weaknessItem: {
    marginBottom: '20px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  weaknessTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  weaknessIcon: {
    color: '#C62828',
    fontSize: '16px',
    fontWeight: 700
  },
  weaknessName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333'
  },
  weaknessComment: {
    margin: 0,
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
    fontStyle: 'italic'
  },
  emptyText: {
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },
  recommendationsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  recommendationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '15px',
    color: '#555'
  },
  recommendationBullet: {
    color: '#1565c0',
    fontSize: '16px',
    fontWeight: 600,
    minWidth: '25px'
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  planPhase: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  phaseTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#333'
  },
  planList: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  planListItem: {
    marginBottom: '10px',
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.6',
    paddingLeft: '15px',
    borderLeft: '3px solid #1565c0'
  },
  priorityTag: {
    background: '#FFEB3B',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    marginLeft: '8px'
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#999',
    fontSize: '12px'
  },
  primaryButton: {
    padding: '12px 30px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 500,
    marginTop: '20px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#0d47a1',
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(21, 101, 192, 0.3)'
    }
  }
};
