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
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [developmentPlan, setDevelopmentPlan] = useState([]);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [overallProfile, setOverallProfile] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Get classification based on score
  const getClassification = useCallback((score, maxScore = 500) => {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return { label: "Elite Talent", color: "#2E7D32", description: "Exceptional performer demonstrating mastery across all categories. Ready for senior roles." };
    if (percentage >= 80) return { label: "Top Talent", color: "#4CAF50", description: "Outstanding performer with clear strengths. Shows strong leadership potential." };
    if (percentage >= 70) return { label: "High Potential", color: "#2196F3", description: "Strong performer with clear development areas. Shows promise for growth." };
    if (percentage >= 60) return { label: "Solid Performer", color: "#FF9800", description: "Reliable performer meeting core requirements. Good foundation to build upon." };
    if (percentage >= 50) return { label: "Developing Talent", color: "#9C27B0", description: "Shows foundational skills with clear development needs." };
    if (percentage >= 40) return { label: "Emerging Talent", color: "#795548", description: "Early-stage performer requiring significant development." };
    return { label: "Needs Improvement", color: "#F44336", description: "Performance below expectations. Needs intensive development plan." };
  }, []);

  // Get grade based on percentage
  const getGrade = useCallback((percentage) => {
    if (percentage >= 90) return { grade: "A+", color: "#2E7D32" };
    if (percentage >= 80) return { grade: "A", color: "#4CAF50" };
    if (percentage >= 70) return { grade: "B", color: "#2196F3" };
    if (percentage >= 60) return { grade: "C", color: "#FF9800" };
    if (percentage >= 50) return { grade: "D", color: "#9C27B0" };
    return { grade: "F", color: "#F44336" };
  }, []);

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

        // Get candidate info from auth.users or candidate_profiles
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, user_metadata')
          .eq('id', user_id)
          .single();

        if (userError) {
          console.error("Error fetching user:", userError);
        }

        setCandidate({
          id: user_id,
          full_name: userData?.user_metadata?.full_name || 'Candidate',
          email: userData?.email || 'No email'
        });

        // Get all completed assessments for this candidate from assessment_results
        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select(`
            *,
            assessments (
              id,
              title,
              assessment_type:assessment_types (
                code,
                name,
                icon,
                color
              )
            )
          `)
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error("Error fetching results:", resultsError);
        }

        if (resultsData && resultsData.length > 0) {
          // Transform the data for the assessments list
          const formattedAssessments = resultsData.map(result => ({
            result_id: result.id,
            assessment_id: result.assessment_id,
            assessment_name: result.assessments?.title || 'Assessment',
            assessment_type: result.assessments?.assessment_type?.code || 'general',
            score: result.total_score,
            max_score: result.max_score,
            percentage: result.percentage_score,
            completed_at: result.completed_at,
            category_scores: result.category_scores,
            strengths: result.strengths || [],
            weaknesses: result.weaknesses || [],
            recommendations: result.recommendations || [],
            development_plan: result.development_plan || [],
            executive_summary: result.interpretations?.executiveSummary || '',
            overall_profile: result.interpretations?.overallProfile || ''
          }));

          setAssessments(formattedAssessments);
          
          // Select the most recent assessment
          const mostRecent = formattedAssessments[0];
          setSelectedAssessment(mostRecent);
          
          // Set the detailed data
          setAssessmentResult(mostRecent);
          setCategoryScores(mostRecent.category_scores || {});
          setStrengths(mostRecent.strengths || []);
          setWeaknesses(mostRecent.weaknesses || []);
          setRecommendations(mostRecent.recommendations || []);
          setDevelopmentPlan(mostRecent.development_plan || []);
          setExecutiveSummary(mostRecent.executive_summary || '');
          setOverallProfile(mostRecent.overall_profile || '');
        }

      } catch (error) {
        console.error("Error fetching candidate data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor, user_id]);

  // Handle assessment selection
  const handleAssessmentChange = async (assessment) => {
    setSelectedAssessment(assessment);
    setActiveTab('overview');
    
    if (assessment) {
      setAssessmentResult(assessment);
      setCategoryScores(assessment.category_scores || {});
      setStrengths(assessment.strengths || []);
      setWeaknesses(assessment.weaknesses || []);
      setRecommendations(assessment.recommendations || []);
      setDevelopmentPlan(assessment.development_plan || []);
      setExecutiveSummary(assessment.executive_summary || '');
      setOverallProfile(assessment.overall_profile || '');
    } else {
      setAssessmentResult(null);
      setCategoryScores({});
      setStrengths([]);
      setWeaknesses([]);
      setRecommendations([]);
      setDevelopmentPlan([]);
      setExecutiveSummary('');
      setOverallProfile('');
    }
  };

  const handleBack = () => {
    router.push('/supervisor');
  };

  if (!isSupervisor) {
    return (
      <div style={styles.checkingContainer}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading candidate analysis...</p>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.notFoundContainer}>
          <h1>Candidate Not Found</h1>
          <p>The requested candidate data could not be found.</p>
          <button onClick={handleBack} style={styles.backButton}>
            ← Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  const currentAssessment = selectedAssessment || assessments[0];
  const classification = currentAssessment?.score ? 
    getClassification(currentAssessment.score, currentAssessment.max_score) : 
    { label: 'N/A', color: '#666', description: '' };

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backLink}>
            ← Back to Dashboard
          </button>
          
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.candidateName}>{candidate.full_name}</h1>
              <p style={styles.candidateEmail}>{candidate.email}</p>
            </div>
            
            {/* Assessment Selector */}
            {assessments.length > 1 && (
              <div style={styles.selector}>
                <label style={styles.selectorLabel}>Select Assessment:</label>
                <select
                  value={currentAssessment?.result_id || ''}
                  onChange={(e) => {
                    const selected = assessments.find(a => a.result_id === e.target.value);
                    handleAssessmentChange(selected);
                  }}
                  style={styles.select}
                >
                  {assessments.map((a, index) => (
                    <option key={a.result_id || index} value={a.result_id}>
                      {a.assessment_name} - {new Date(a.completed_at).toLocaleDateString()} ({a.score}/{a.max_score})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {currentAssessment ? (
          <>
            {/* Assessment Summary Card */}
            <div style={{
              ...styles.summaryCard,
              background: `linear-gradient(135deg, ${classification.color}, ${adjustColor(classification.color, -20)})`
            }}>
              <div style={styles.summaryContent}>
                <div>
                  <h2 style={styles.summaryTitle}>{currentAssessment.assessment_name}</h2>
                  <p style={styles.summaryDate}>
                    Completed on {new Date(currentAssessment.completed_at).toLocaleDateString()} at{' '}
                    {new Date(currentAssessment.completed_at).toLocaleTimeString()}
                  </p>
                </div>
                <div style={styles.scoreCard}>
                  <div style={styles.scoreLabel}>Overall Score</div>
                  <div style={{ ...styles.scoreValue, color: 'white' }}>
                    {currentAssessment.score}/{currentAssessment.max_score}
                  </div>
                  <div style={styles.scorePercentage}>
                    {currentAssessment.percentage}%
                  </div>
                  <div style={styles.classification}>
                    {classification.label}
                  </div>
                </div>
              </div>
              {executiveSummary && (
                <p style={styles.classificationDescription}>{executiveSummary}</p>
              )}
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'overview' ? `3px solid ${classification.color}` : '3px solid transparent',
                  color: activeTab === 'overview' ? classification.color : '#666'
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'categories' ? `3px solid ${classification.color}` : '3px solid transparent',
                  color: activeTab === 'categories' ? classification.color : '#666'
                }}
              >
                Category Breakdown
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'analysis' ? `3px solid ${classification.color}` : '3px solid transparent',
                  color: activeTab === 'analysis' ? classification.color : '#666'
                }}
              >
                Strengths & Weaknesses
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'recommendations' ? `3px solid ${classification.color}` : '3px solid transparent',
                  color: activeTab === 'recommendations' ? classification.color : '#666'
                }}
              >
                Development Plan
              </button>
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div style={styles.overviewGrid}>
                  <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>Performance Summary</h3>
                    <div style={styles.overviewStats}>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Total Score</span>
                        <span style={{ ...styles.overviewStatValue, color: classification.color }}>
                          {currentAssessment.score}/{currentAssessment.max_score}
                        </span>
                      </div>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Percentage</span>
                        <span style={styles.overviewStatValue}>
                          {currentAssessment.percentage}%
                        </span>
                      </div>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Classification</span>
                        <span style={{ ...styles.overviewStatValue, color: classification.color }}>
                          {classification.label}
                        </span>
                      </div>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Categories Assessed</span>
                        <span style={styles.overviewStatValue}>
                          {Object.keys(categoryScores).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>Overall Profile</h3>
                    <p style={styles.profileText}>{overallProfile || classification.description}</p>
                  </div>

                  <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>Key Insights</h3>
                    <div style={styles.insights}>
                      {strengths.length > 0 && (
                        <div style={styles.insightSection}>
                          <h4 style={styles.insightTitle}>Strengths</h4>
                          {strengths.slice(0, 3).map((s, i) => (
                            <div key={i} style={styles.insightItem}>
                              <span style={styles.insightBullet}>✓</span>
                              <span>{s.area || s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {weaknesses.length > 0 && (
                        <div style={styles.insightSection}>
                          <h4 style={styles.insightTitle}>Development Areas</h4>
                          {weaknesses.slice(0, 3).map((w, i) => (
                            <div key={i} style={styles.insightItem}>
                              <span style={styles.insightBullet}>!</span>
                              <span>{w.area || w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === 'categories' && (
                <div style={styles.categoriesGrid}>
                  {Object.entries(categoryScores).map(([category, data]) => {
                    const grade = getGrade(data.percentage);
                    const level = data.percentage >= 70 ? 'Strength' : 
                                 data.percentage >= 50 ? 'Average' : 'Development Area';
                    
                    return (
                      <div key={category} style={styles.categoryCard}>
                        <div style={styles.categoryHeader}>
                          <h3 style={styles.categoryTitle}>{category}</h3>
                          <span style={{
                            ...styles.categoryBadge,
                            background: level === 'Strength' ? '#4caf5020' :
                                       level === 'Average' ? '#ff980020' : '#f4433620',
                            color: level === 'Strength' ? '#2e7d32' :
                                  level === 'Average' ? '#ed6c02' : '#c62828'
                          }}>
                            {level}
                          </span>
                        </div>

                        <div style={styles.categoryScore}>
                          <div style={styles.scoreRow}>
                            <span>Score</span>
                            <span style={{ fontWeight: 600 }}>{data.score}/{data.maxPossible}</span>
                          </div>
                          <div style={styles.scoreRow}>
                            <span>Average</span>
                            <span style={{ fontWeight: 600 }}>{data.average}/5</span>
                          </div>
                          <div style={styles.scoreRow}>
                            <span>Percentage</span>
                            <span style={{ ...styles.percentageValue, color: grade.color }}>
                              {data.percentage}% • Grade {grade.grade}
                            </span>
                          </div>
                        </div>

                        <div style={styles.progressBar}>
                          <div style={{
                            ...styles.progressFill,
                            width: `${data.percentage}%`,
                            background: `linear-gradient(90deg, ${classification.color}, ${adjustColor(classification.color, 20)})`
                          }} />
                        </div>

                        <div style={styles.categoryInterpretation}>
                          {data.analysis || (
                            data.percentage >= 80 ? `Exceptional performance in ${category}. Demonstrates mastery.` :
                            data.percentage >= 60 ? `Good performance in ${category} with room for growth.` :
                            data.percentage >= 40 ? `Developing in ${category}. Needs focused attention.` :
                            `Significant development needed in ${category}. Requires structured support.`
                          )}
                        </div>

                        {data.traits && data.traits.length > 0 && (
                          <div style={styles.traitsContainer}>
                            {data.traits.map((trait, idx) => (
                              <span key={idx} style={styles.traitTag}>{trait}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div style={styles.analysisGrid}>
                  {/* Strengths */}
                  <div style={styles.analysisCard}>
                    <h3 style={{ ...styles.analysisTitle, color: '#2e7d32' }}>
                      <span style={styles.analysisIcon}>✓</span>
                      Key Strengths
                    </h3>
                    {strengths.length > 0 ? (
                      <div style={styles.strengthsList}>
                        {strengths.map((strength, index) => (
                          <div key={index} style={styles.strengthItem}>
                            <div style={styles.strengthHeader}>
                              <span style={styles.strengthName}>{strength.area || strength}</span>
                              {strength.percentage && (
                                <span style={styles.strengthScore}>{strength.percentage}%</span>
                              )}
                            </div>
                            <p style={styles.strengthDesc}>
                              {strength.insights || strength.analysis || 
                               `Strong performance indicates capability in this area. Leverage this strength in relevant roles.`}
                            </p>
                            {strength.traits && strength.traits.length > 0 && (
                              <div style={styles.traitsList}>
                                {strength.traits.map((trait, idx) => (
                                  <span key={idx} style={styles.traitTag}>{trait}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.noData}>No exceptional strengths identified.</p>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div style={styles.analysisCard}>
                    <h3 style={{ ...styles.analysisTitle, color: '#c62828' }}>
                      <span style={styles.analysisIcon}>!</span>
                      Development Areas
                    </h3>
                    {weaknesses.length > 0 ? (
                      <div style={styles.weaknessesList}>
                        {weaknesses.map((weakness, index) => (
                          <div key={index} style={styles.weaknessItem}>
                            <div style={styles.weaknessHeader}>
                              <span style={styles.weaknessName}>{weakness.area || weakness}</span>
                              {weakness.percentage && (
                                <span style={styles.weaknessScore}>{weakness.percentage}%</span>
                              )}
                            </div>
                            <p style={styles.weaknessDesc}>
                              {weakness.insights || weakness.analysis ||
                               `Needs development in this area. Focused training and support recommended.`}
                            </p>
                            {weakness.recommendations && weakness.recommendations.length > 0 && (
                              <div style={styles.recommendationTags}>
                                {weakness.recommendations.map((rec, idx) => (
                                  <span key={idx} style={styles.recommendationTag}>{rec}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.noData}>No significant development areas identified.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations/Development Plan Tab */}
              {activeTab === 'recommendations' && (
                <div style={styles.recommendationsContainer}>
                  {developmentPlan.length > 0 ? (
                    <div style={styles.planSteps}>
                      {developmentPlan.map((step, index) => (
                        <div key={index} style={styles.planStep}>
                          <div style={styles.stepNumber}>{index + 1}</div>
                          <div style={styles.stepContent}>
                            <p style={styles.stepText}>{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div style={styles.recommendationsList}>
                      {recommendations.map((rec, index) => (
                        <div key={index} style={styles.recommendationCard}>
                          <div style={styles.recommendationHeader}>
                            <span style={styles.recommendationNumber}>{index + 1}</span>
                            <span style={styles.recommendationPriority}>
                              {rec.type === 'strength' ? 'Leverage' : 'Development'}
                            </span>
                          </div>
                          <p style={styles.recommendationText}>{rec.message || rec}</p>
                          {rec.areas && rec.areas.length > 0 && (
                            <div style={styles.recommendationAreas}>
                              {rec.areas.map((area, idx) => (
                                <span key={idx} style={styles.recommendationArea}>{area}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.noRecommendations}>
                      <p>No specific recommendations available.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={styles.noAssessment}>
            <p>No assessment data available for this candidate.</p>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p>Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
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

// Helper function to adjust color brightness
function adjustColor(hex, percent) {
  if (!hex) return '#666';
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the color
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
  
  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const styles = {
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
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
  notFoundContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  container: {
    width: '90vw',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    marginBottom: '30px'
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#1565c0',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
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
    color: '#333',
    fontSize: '24px'
  },
  candidateEmail: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  selector: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    minWidth: '300px'
  },
  selectorLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px'
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '13px'
  },
  summaryCard: {
    padding: '30px',
    borderRadius: '12px',
    color: 'white',
    marginBottom: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  summaryContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  summaryTitle: {
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 5px 0'
  },
  summaryDate: {
    fontSize: '13px',
    opacity: 0.9,
    margin: 0
  },
  scoreCard: {
    background: 'rgba(255,255,255,0.15)',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
    minWidth: '150px'
  },
  scoreLabel: {
    fontSize: '12px',
    opacity: 0.9,
    marginBottom: '5px'
  },
  scoreValue: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1
  },
  scorePercentage: {
    fontSize: '16px',
    fontWeight: 600,
    marginTop: '5px'
  },
  classification: {
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '10px',
    padding: '5px 10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '4px'
  },
  classificationDescription: {
    fontSize: '14px',
    opacity: 0.9,
    margin: 0,
    padding: '15px',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '8px'
  },
  tabs: {
    display: 'flex',
    gap: '20px',
    borderBottom: '2px solid #e0e0e0',
    marginBottom: '30px'
  },
  tab: {
    padding: '10px 0',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tabContent: {
    minHeight: '400px'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  overviewCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  overviewCardTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#333'
  },
  overviewStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  overviewStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  overviewStatLabel: {
    fontSize: '13px',
    color: '#666'
  },
  overviewStatValue: {
    fontSize: '15px',
    fontWeight: 600
  },
  profileText: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
    margin: 0
  },
  insights: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  insightSection: {
    marginBottom: '15px'
  },
  insightTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 10px 0'
  },
  insightItem: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#555'
  },
  insightBullet: {
    fontSize: '14px'
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  categoryCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  categoryTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#333'
  },
  categoryBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600
  },
  categoryScore: {
    marginBottom: '15px'
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px'
  },
  percentageValue: {
    fontWeight: 600
  },
  progressBar: {
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '15px'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px'
  },
  categoryInterpretation: {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.5',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px',
    marginBottom: '10px'
  },
  traitsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px'
  },
  traitTag: {
    padding: '4px 8px',
    background: '#e3f2fd',
    color: '#1565c0',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  analysisCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  analysisTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  analysisIcon: {
    fontSize: '18px'
  },
  strengthsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  strengthItem: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #4caf50'
  },
  strengthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  strengthName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2e7d32'
  },
  strengthScore: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#2e7d32',
    background: '#e8f5e9',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  strengthDesc: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#555',
    lineHeight: '1.5'
  },
  weaknessesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  weaknessItem: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #f44336'
  },
  weaknessHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  weaknessName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#c62828'
  },
  weaknessScore: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#c62828',
    background: '#ffebee',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  weaknessDesc: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#555',
    lineHeight: '1.5'
  },
  traitsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px'
  },
  recommendationTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '10px'
  },
  recommendationTag: {
    padding: '4px 8px',
    background: '#fff3e0',
    color: '#e65100',
    borderRadius: '4px',
    fontSize: '11px'
  },
  noData: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px'
  },
  recommendationsContainer: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  recommendationsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  recommendationCard: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #1565c0'
  },
  recommendationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  recommendationNumber: {
    width: '24px',
    height: '24px',
    background: '#1565c0',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600
  },
  recommendationPriority: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    background: '#e3f2fd',
    color: '#1565c0',
    borderRadius: '4px'
  },
  recommendationText: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5'
  },
  recommendationAreas: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px'
  },
  recommendationArea: {
    padding: '3px 8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#333'
  },
  planSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  planStep: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  stepNumber: {
    width: '30px',
    height: '30px',
    background: '#1565c0',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0
  },
  stepContent: {
    flex: 1
  },
  stepText: {
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5'
  },
  noRecommendations: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  noAssessment: {
    textAlign: 'center',
    padding: '60px',
    background: 'white',
    borderRadius: '12px'
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#888',
    fontSize: '11px'
  },
  backButton: {
    padding: '10px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px'
  }
};
