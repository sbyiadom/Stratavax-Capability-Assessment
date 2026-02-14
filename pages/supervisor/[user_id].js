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
  const [activeTab, setActiveTab] = useState('overview');

  // Assessment type configurations
  const assessmentConfig = {
    'general': {
      name: 'General Assessment',
      icon: '📊',
      color: '#607D8B',
      gradient: 'linear-gradient(135deg, #607D8B, #455A64)',
      categories: ['Cognitive Abilities', 'Personality Assessment', 'Leadership Potential', 'Technical Competence', 'Performance Metrics']
    },
    'leadership': {
      name: 'Leadership Assessment',
      icon: '👑',
      color: '#9C27B0',
      gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)',
      categories: ['Leadership Potential']
    },
    'cognitive': {
      name: 'Cognitive Ability Assessment',
      icon: '🧠',
      color: '#4A6FA5',
      gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)',
      categories: ['Cognitive Abilities']
    },
    'technical': {
      name: 'Technical Assessment',
      icon: '⚙️',
      color: '#F44336',
      gradient: 'linear-gradient(135deg, #F44336, #C62828)',
      categories: ['Technical Competence']
    },
    'personality': {
      name: 'Personality Assessment',
      icon: '🌟',
      color: '#4CAF50',
      gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
      categories: ['Personality Assessment']
    },
    'performance': {
      name: 'Performance Assessment',
      icon: '📈',
      color: '#FF9800',
      gradient: 'linear-gradient(135deg, #FF9800, #F57C00)',
      categories: ['Performance Metrics']
    },
    'behavioral': {
      name: 'Behavioral & Soft Skills',
      icon: '🤝',
      color: '#00ACC1',
      gradient: 'linear-gradient(135deg, #00ACC1, #006064)',
      categories: ['Communication', 'Teamwork', 'Emotional Intelligence', 'Adaptability']
    },
    'manufacturing': {
      name: 'Manufacturing Technical Skills',
      icon: '🏭',
      color: '#795548',
      gradient: 'linear-gradient(135deg, #795548, #4E342E)',
      categories: ['Equipment Operation', 'Safety Protocols', 'Quality Control', 'Maintenance']
    },
    'cultural': {
      name: 'Cultural & Attitudinal Fit',
      icon: '🎯',
      color: '#E91E63',
      gradient: 'linear-gradient(135deg, #E91E63, #AD1457)',
      categories: ['Values Alignment', 'Work Ethic', 'Adaptability', 'Initiative']
    }
  };

  // Get classification based on score
  const getClassification = useCallback((score, assessmentType = 'general') => {
    if (assessmentType === 'general') {
      if (score >= 450) return { label: "Elite Talent", color: "#2E7D32", description: "Exceptional performer demonstrating mastery across all categories. Ready for senior roles." };
      if (score >= 400) return { label: "Top Talent", color: "#4CAF50", description: "Outstanding performer with clear strengths. Shows strong leadership potential." };
      if (score >= 350) return { label: "High Potential", color: "#2196F3", description: "Strong performer with clear development areas. Shows promise for growth." };
      if (score >= 300) return { label: "Solid Performer", color: "#FF9800", description: "Reliable performer meeting core requirements. Good foundation to build upon." };
      if (score >= 250) return { label: "Developing Talent", color: "#9C27B0", description: "Shows foundational skills with clear development needs." };
      if (score >= 200) return { label: "Emerging Talent", color: "#795548", description: "Early-stage performer requiring significant development." };
      return { label: "Needs Improvement", color: "#F44336", description: "Performance below expectations. Needs intensive development plan." };
    } else {
      if (score >= 90) return { label: "Exceptional", color: "#2E7D32", description: "Exceptional performance. Demonstrates mastery in this area." };
      if (score >= 80) return { label: "Advanced", color: "#4CAF50", description: "Advanced proficiency. Strong capabilities with room for growth." };
      if (score >= 70) return { label: "Proficient", color: "#2196F3", description: "Proficient. Meets expectations with solid performance." };
      if (score >= 60) return { label: "Developing", color: "#FF9800", description: "Developing. Shows potential with targeted development needed." };
      if (score >= 50) return { label: "Basic", color: "#9C27B0", description: "Basic understanding. Requires structured development." };
      return { label: "Needs Improvement", color: "#F44336", description: "Needs significant improvement. Requires intensive support." };
    }
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

        // Get candidate info and all assessments
        const { data: candidateData, error } = await supabase
          .from('supervisor_dashboard')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (error) throw error;

        setCandidate(candidateData);
        setAssessments(candidateData.assessments || []);

        // Select the most recent assessment by default
        if (candidateData.assessments?.length > 0) {
          const mostRecent = candidateData.assessments[0];
          setSelectedAssessment(mostRecent);
          
          // Fetch detailed results if available
          if (mostRecent.result_id) {
            const { data: resultData } = await supabase
              .from('assessment_results')
              .select('*')
              .eq('id', mostRecent.result_id)
              .single();

            if (resultData) {
              setAssessmentResult(resultData);
              setCategoryScores(resultData.category_scores || {});
              setStrengths(resultData.strengths || []);
              setWeaknesses(resultData.weaknesses || []);
              setRecommendations(resultData.recommendations || []);
            }
          }
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
    
    if (assessment?.result_id) {
      const { data } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('id', assessment.result_id)
        .single();

      if (data) {
        setAssessmentResult(data);
        setCategoryScores(data.category_scores || {});
        setStrengths(data.strengths || []);
        setWeaknesses(data.weaknesses || []);
        setRecommendations(data.recommendations || []);
      }
    } else {
      setAssessmentResult(null);
      setCategoryScores({});
      setStrengths([]);
      setWeaknesses([]);
      setRecommendations([]);
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
  const config = assessmentConfig[currentAssessment?.assessment_type] || assessmentConfig.general;
  const classification = currentAssessment?.score ? 
    getClassification(currentAssessment.score, currentAssessment.assessment_type) : 
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
              background: config.gradient
            }}>
              <div style={styles.summaryContent}>
                <div>
                  <div style={styles.summaryIcon}>{config.icon}</div>
                  <h2 style={styles.summaryTitle}>{currentAssessment.assessment_name}</h2>
                  <p style={styles.summaryDate}>
                    Completed on {new Date(currentAssessment.completed_at).toLocaleDateString()} at{' '}
                    {new Date(currentAssessment.completed_at).toLocaleTimeString()}
                  </p>
                </div>
                <div style={styles.scoreCard}>
                  <div style={styles.scoreLabel}>Overall Score</div>
                  <div style={{ ...styles.scoreValue, color: classification.color }}>
                    {currentAssessment.score}/{currentAssessment.max_score || 100}
                  </div>
                  <div style={{ ...styles.classification, color: classification.color }}>
                    {classification.label}
                  </div>
                </div>
              </div>
              <p style={styles.classificationDescription}>{classification.description}</p>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'overview' ? `3px solid ${config.color}` : '3px solid transparent',
                  color: activeTab === 'overview' ? config.color : '#666'
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'categories' ? `3px solid ${config.color}` : '3px solid transparent',
                  color: activeTab === 'categories' ? config.color : '#666'
                }}
              >
                Category Breakdown
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'analysis' ? `3px solid ${config.color}` : '3px solid transparent',
                  color: activeTab === 'analysis' ? config.color : '#666'
                }}
              >
                Strengths & Weaknesses
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                style={{
                  ...styles.tab,
                  borderBottom: activeTab === 'recommendations' ? `3px solid ${config.color}` : '3px solid transparent',
                  color: activeTab === 'recommendations' ? config.color : '#666'
                }}
              >
                Recommendations
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
                          {currentAssessment.score}/{currentAssessment.max_score || 100}
                        </span>
                      </div>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Percentage</span>
                        <span style={styles.overviewStatValue}>
                          {Math.round((currentAssessment.score / (currentAssessment.max_score || 100)) * 100)}%
                        </span>
                      </div>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Classification</span>
                        <span style={{ ...styles.overviewStatValue, color: classification.color }}>
                          {classification.label}
                        </span>
                      </div>
                      <div style={styles.overviewStat}>
                        <span style={styles.overviewStatLabel}>Questions</span>
                        <span style={styles.overviewStatValue}>{config.categories.length} categories</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>Category Highlights</h3>
                    <div style={styles.categoryHighlights}>
                      {Object.entries(categoryScores).map(([category, data]) => {
                        const grade = getGrade(data.percentage);
                        return (
                          <div key={category} style={styles.highlightItem}>
                            <div style={styles.highlightCategory}>{category}</div>
                            <div style={styles.highlightBar}>
                              <div style={{
                                ...styles.highlightFill,
                                width: `${data.percentage}%`,
                                background: config.gradient
                              }} />
                            </div>
                            <div style={{ ...styles.highlightGrade, color: grade.color }}>
                              {grade.grade} • {data.percentage}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.overviewCard}>
                    <h3 style={styles.overviewCardTitle}>Key Insights</h3>
                    <div style={styles.insights}>
                      {strengths.length > 0 && (
                        <div style={styles.insightSection}>
                          <h4 style={styles.insightTitle}>Strengths</h4>
                          {strengths.map((s, i) => (
                            <div key={i} style={styles.insightItem}>
                              <span style={styles.insightBullet}>✓</span>
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {weaknesses.length > 0 && (
                        <div style={styles.insightSection}>
                          <h4 style={styles.insightTitle}>Development Areas</h4>
                          {weaknesses.map((w, i) => (
                            <div key={i} style={styles.insightItem}>
                              <span style={styles.insightBullet}>!</span>
                              <span>{w}</span>
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
                            <span style={{ fontWeight: 600 }}>{data.score}/{data.max_possible}</span>
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
                            background: config.gradient
                          }} />
                        </div>

                        <div style={styles.categoryInterpretation}>
                          {data.percentage >= 80 && `Exceptional performance in ${category}. Demonstrates mastery.`}
                          {data.percentage >= 60 && data.percentage < 80 && `Good performance in ${category} with room for growth.`}
                          {data.percentage >= 40 && data.percentage < 60 && `Developing in ${category}. Needs focused attention.`}
                          {data.percentage < 40 && `Significant development needed in ${category}. Requires structured support.`}
                        </div>
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
                              <span style={styles.strengthName}>{strength}</span>
                            </div>
                            <p style={styles.strengthDesc}>
                              Strong performance indicates capability in this area. 
                              Leverage this strength in relevant roles and responsibilities.
                            </p>
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
                              <span style={styles.weaknessName}>{weakness}</span>
                            </div>
                            <p style={styles.weaknessDesc}>
                              Needs development in this area. Focused training and support recommended.
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.noData}>No significant development areas identified.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === 'recommendations' && (
                <div style={styles.recommendationsContainer}>
                  {recommendations.length > 0 ? (
                    <div style={styles.recommendationsList}>
                      {recommendations.map((rec, index) => (
                        <div key={index} style={styles.recommendationCard}>
                          <div style={styles.recommendationHeader}>
                            <span style={styles.recommendationNumber}>{index + 1}</span>
                            <span style={styles.recommendationPriority}>
                              {rec.includes('strength') ? 'Leverage' : 'Development'}
                            </span>
                          </div>
                          <p style={styles.recommendationText}>{rec}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.noRecommendations}>
                      <p>No specific recommendations available.</p>
                    </div>
                  )}

                  {/* Development Plan */}
                  <div style={styles.planCard}>
                    <h3 style={styles.planTitle}>Suggested Development Plan</h3>
                    <div style={styles.planSteps}>
                      <div style={styles.planStep}>
                        <div style={styles.stepNumber}>1</div>
                        <div>
                          <h4 style={styles.stepTitle}>Immediate Actions (0-30 days)</h4>
                          <p style={styles.stepDesc}>
                            Focus on top development areas through targeted training and mentoring.
                          </p>
                        </div>
                      </div>
                      <div style={styles.planStep}>
                        <div style={styles.stepNumber}>2</div>
                        <div>
                          <h4 style={styles.stepTitle}>Short-term Goals (30-90 days)</h4>
                          <p style={styles.stepDesc}>
                            Apply learning in practical scenarios with supervisor guidance.
                          </p>
                        </div>
                      </div>
                      <div style={styles.planStep}>
                        <div style={styles.stepNumber}>3</div>
                        <div>
                          <h4 style={styles.stepTitle}>Long-term Development (90+ days)</h4>
                          <p style={styles.stepDesc}>
                            Leverage strengths in challenging assignments and leadership roles.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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
  summaryIcon: {
    fontSize: '40px',
    marginBottom: '10px'
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
  classification: {
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '5px'
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
  categoryHighlights: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  highlightItem: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 60px',
    gap: '10px',
    alignItems: 'center'
  },
  highlightCategory: {
    fontSize: '12px',
    color: '#666'
  },
  highlightBar: {
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  highlightFill: {
    height: '100%',
    borderRadius: '4px'
  },
  highlightGrade: {
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'right'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
    borderRadius: '6px'
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
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
    marginBottom: '8px'
  },
  strengthName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2e7d32'
  },
  strengthDesc: {
    margin: 0,
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
    marginBottom: '8px'
  },
  weaknessName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#c62828'
  },
  weaknessDesc: {
    margin: 0,
    fontSize: '12px',
    color: '#555',
    lineHeight: '1.5'
  },
  noData: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px'
  },
  recommendationsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  recommendationsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  recommendationCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5'
  },
  noRecommendations: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '8px'
  },
  planCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  planTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: 600,
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
  stepTitle: {
    margin: '0 0 5px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333'
  },
  stepDesc: {
    margin: 0,
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.5'
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
