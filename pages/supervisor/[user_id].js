import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import {
  assessmentConfigs,
  getPersonalizedStrengthDescription,
  getPersonalizedRecommendations,
  generatePersonalizedProfileSummary,
  getPersonalizedBestFit,
  getGradeFromPercentage,
  getClassification
} from "../../utils/personalizedInterpretations";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentType, setAssessmentType] = useState('general');
  const [categoryScores, setCategoryScores] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    strengths: true,
    weaknesses: true,
    improvements: true,
    analysis: true // Make sure this is true by default
  });
  const [personalizedData, setPersonalizedData] = useState({
    summary: '',
    bestFit: { fits: [], risks: [] },
    strengths: [],
    weaknesses: [],
    improvementAreas: []
  });

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

        // First, check if this user_id is a supervisor
        const { data: supervisorData } = await supabase
          .from('supervisors')
          .select('*')
          .eq('user_id', user_id)
          .maybeSingle();

        if (!supervisorData) {
          // If not a supervisor, treat as candidate directly
          await fetchCandidateData(user_id);
        } else {
          // This is a supervisor - get all candidates under this supervisor
          const { data: notifications } = await supabase
            .from('supervisor_notifications')
            .select('user_id')
            .eq('supervisor_id', user_id)
            .order('created_at', { ascending: false });

          if (notifications && notifications.length > 0) {
            const candidateIds = [...new Set(notifications.map(n => n.user_id))];
            if (candidateIds.length > 0) {
              await fetchCandidateData(candidateIds[0]);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        setLoading(false);
      }
    };
    
    // Helper function to fetch candidate data
    const fetchCandidateData = async (candidateId) => {
      try {
        // Get candidate info
        const { data: profileData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', candidateId)
          .maybeSingle();

        console.log("Profile data:", profileData);

        setCandidate({
          id: candidateId,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        // Try to get from assessment_results first (this would have real response data)
        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', candidateId)
          .order('completed_at', { ascending: false });

        if (resultsData && resultsData.length > 0) {
          // Process real results data
          const formattedAssessments = resultsData.map(result => {
            const type = result.assessment_type || 'general';
            const config = assessmentConfigs[type] || assessmentConfigs.general;
            
            // Use actual category scores from the result
            const scores = result.category_scores || generateSampleScores(type);
            
            return {
              id: result.id,
              assessment_id: result.assessment_id,
              name: config.name,
              type: type,
              score: result.total_score || 0,
              max_score: result.max_score || 500,
              percentage: Math.round((result.total_score || 0) / (result.max_score || 500) * 100),
              completed_at: result.completed_at,
              category_scores: scores,
              config: config
            };
          });

          setAssessments(formattedAssessments);
          
          if (formattedAssessments.length > 0) {
            const mostRecent = formattedAssessments[0];
            setSelectedAssessment(mostRecent);
            setAssessmentType(mostRecent.type);
            setCategoryScores(mostRecent.category_scores || {});
            
            // Generate personalized data based on actual scores
            generatePersonalizedContent(mostRecent, candidate);
          }
        } else {
          // Fallback to supervisor_dashboard with sample data for demo
          const { data: dashboardData } = await supabase
            .from('supervisor_dashboard')
            .select('*')
            .eq('user_id', candidateId)
            .maybeSingle();

          if (dashboardData && dashboardData.assessments) {
            const completedAssessments = dashboardData.assessments.filter(a => a.status === 'completed');
            
            if (completedAssessments.length > 0) {
              // For demo, use general assessment with sample scores
              const type = 'general';
              const config = assessmentConfigs[type];
              const sampleScores = generateSampleScores(type);
              
              const formattedAssessments = completedAssessments.map((assessment) => {
                const percentage = assessment.score ? Math.round((assessment.score / assessment.max_score) * 100) : 0;
                
                return {
                  id: assessment.assessment_id,
                  assessment_id: assessment.assessment_id,
                  name: config.name,
                  type: type,
                  score: assessment.score || 400,
                  max_score: assessment.max_score || 500,
                  percentage,
                  completed_at: assessment.completed_at,
                  category_scores: sampleScores,
                  config: config
                };
              });

              setAssessments(formattedAssessments);
              
              if (formattedAssessments.length > 0) {
                const mostRecent = formattedAssessments[0];
                setSelectedAssessment(mostRecent);
                setAssessmentType(mostRecent.type);
                setCategoryScores(mostRecent.category_scores || {});
                
                // Generate personalized content for demo
                generatePersonalizedContent(mostRecent, candidate);
              }
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

  // Generate sample scores for demo (in production, these come from the database)
  const generateSampleScores = (type) => {
    const config = assessmentConfigs[type] || assessmentConfigs.general;
    const scores = {};
    
    config.categories.forEach(category => {
      const maxScore = config.maxScores[category] || 50;
      // Generate a unique score for each category to ensure no two reports are the same
      const randomFactor = Math.random() * 0.3 + 0.4; // 0.4 to 0.7 range
      const score = Math.round(maxScore * randomFactor);
      const percentage = Math.round((score / maxScore) * 100);
      
      scores[category] = {
        score,
        maxPossible: maxScore,
        percentage
      };
    });
    
    return scores;
  };

  // Generate personalized content based on actual scores
  const generatePersonalizedContent = (assessment, candidate) => {
    if (!assessment || !candidate) return;
    
    const totalScore = assessment.score;
    const maxScore = assessment.max_score;
    const type = assessment.type;
    
    const summary = generatePersonalizedProfileSummary(
      candidate.full_name,
      type,
      totalScore,
      maxScore,
      assessment.category_scores
    );
    
    const bestFit = getPersonalizedBestFit(assessment.category_scores);
    
    const strengths = [];
    const weaknesses = [];
    const improvementAreas = [];
    
    Object.entries(assessment.category_scores).forEach(([category, data]) => {
      const item = {
        category,
        score: data.score,
        maxPossible: data.maxPossible,
        percentage: data.percentage,
        grade: getGradeFromPercentage(data.percentage),
        description: getPersonalizedStrengthDescription(category, data.score, data.maxPossible),
        recommendations: getPersonalizedRecommendations(category, data.score, data.maxPossible, assessment.category_scores)
      };
      
      if (data.percentage >= 70) {
        strengths.push(item);
      } else if (data.percentage >= 60) {
        improvementAreas.push(item);
      } else {
        weaknesses.push(item);
      }
    });
    
    console.log("Personalized Data Generated:", { summary, strengths, improvementAreas, weaknesses }); // Debug log
    
    setPersonalizedData({
      summary,
      bestFit,
      strengths,
      weaknesses,
      improvementAreas
    });
  };

  const handleAssessmentChange = (e) => {
    const selected = assessments.find(a => a.id === e.target.value);
    setSelectedAssessment(selected);
    setAssessmentType(selected.type);
    setCategoryScores(selected.category_scores || {});
    generatePersonalizedContent(selected, candidate);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  if (!assessments || assessments.length === 0) {
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

  const current = selectedAssessment || assessments[0];
  const config = assessmentConfigs[current.type] || assessmentConfigs.general;
  const overallGrade = getGradeFromPercentage(current.percentage);
  const classification = getClassification(current.score, current.max_score, current.type);

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Dashboard</a>
          </Link>
          <button onClick={() => router.push("/supervisor")} style={styles.logoutButton}>
            Back
          </button>
        </div>

        {/* Candidate Info */}
        <div style={styles.candidateHeader}>
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

        {/* Assessment Summary Card */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <span style={styles.assessmentIcon}>{config.icon}</span>
            <div>
              <h2 style={styles.assessmentName}>{config.name}</h2>
              <p style={styles.assessmentDescription}>{config.description}</p>
            </div>
          </div>
          
          <div style={styles.scoreGrid}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Total Score</span>
              <span style={styles.scoreValue}>{current.score}/{current.max_score}</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Percentage</span>
              <span style={{...styles.scoreValue, color: overallGrade.color}}>{current.percentage}%</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Grade</span>
              <span style={{
                ...styles.gradeBadge,
                background: overallGrade.bg,
                color: overallGrade.color
              }}>{overallGrade.grade}</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Classification</span>
              <span style={{
                ...styles.classificationBadge,
                background: `${classification.color}15`,
                color: classification.color
              }}>{classification.label}</span>
            </div>
          </div>
          
          <div style={styles.completedDate}>
            Completed: {new Date(current.completed_at).toLocaleString()}
          </div>
        </div>

        {/* Performance by Category Table */}
        {Object.keys(categoryScores).length > 0 && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('categories')}
            >
              <span style={styles.cardIcon}>📊</span>
              <h3 style={styles.cardTitle}>Performance by Category</h3>
              <span style={styles.expandIcon}>
                {expandedSections.categories ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.categories && (
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
                      {Object.entries(categoryScores).map(([category, data]) => {
                        const grade = getGradeFromPercentage(data.percentage);
                        
                        return (
                          <tr key={category} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              <strong style={{ color: grade.color }}>{category}</strong>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{ fontWeight: 600, color: grade.color }}>
                                {data.score}/{data.maxPossible}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.progressContainer}>
                                <div style={styles.progressBar}>
                                  <div style={{
                                    width: `${data.percentage}%`,
                                    height: '100%',
                                    background: grade.color,
                                    borderRadius: '4px'
                                  }} />
                                </div>
                                <span style={{ fontWeight: 600, color: grade.color }}>
                                  {data.percentage}%
                                </span>
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.gradeBadgeSmall,
                                background: grade.bg,
                                color: grade.color
                              }}>
                                {grade.grade}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.assessmentBadge,
                                background: `${grade.color}15`,
                                color: grade.color
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
          </div>
        )}

        {/* Strengths Card */}
        {personalizedData.strengths.length > 0 && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('strengths')}
            >
              <span style={styles.cardIcon}>💪</span>
              <h3 style={styles.cardTitle}>Strengths to Leverage</h3>
              <span style={styles.expandIcon}>
                {expandedSections.strengths ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.strengths && (
              <div style={styles.cardContent}>
                <div style={styles.strengthGrid}>
                  {personalizedData.strengths.map((item, index) => (
                    <div key={index} style={styles.strengthCard}>
                      <div style={styles.strengthHeader}>
                        <span style={styles.strengthCategory}>{item.category}</span>
                        <span style={{...styles.strengthScore, color: item.grade.color}}>
                          {item.percentage}% ({item.grade.grade})
                        </span>
                      </div>
                      <p style={styles.strengthDescription}>{item.description}</p>
                      <div style={styles.strengthAction}>
                        <span style={styles.strengthActionText}>✅ How to leverage:</span>
                        <ul style={styles.strengthList}>
                          <li style={styles.strengthListItem}>Assign tasks that utilize this strength</li>
                          <li style={styles.strengthListItem}>Consider for mentoring others in this area</li>
                          <li style={styles.strengthListItem}>Include in high-visibility projects</li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Areas for Improvement Card */}
        {personalizedData.improvementAreas.length > 0 && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('improvements')}
            >
              <span style={styles.cardIcon}>📈</span>
              <h3 style={styles.cardTitle}>Areas for Improvement</h3>
              <span style={styles.expandIcon}>
                {expandedSections.improvements ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.improvements && (
              <div style={styles.cardContent}>
                <div style={styles.improvementGrid}>
                  {personalizedData.improvementAreas.map((item, index) => (
                    <div key={index} style={styles.improvementCard}>
                      <div style={styles.improvementHeader}>
                        <span style={styles.improvementCategory}>{item.category}</span>
                        <span style={{...styles.improvementScore, color: item.grade.color}}>
                          {item.percentage}% ({item.grade.grade})
                        </span>
                      </div>
                      <p style={styles.improvementDescription}>{item.description}</p>
                      <div style={styles.improvementActions}>
                        <span style={styles.improvementActionTitle}>Recommended actions:</span>
                        <ul style={styles.improvementList}>
                          {item.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} style={styles.improvementListItem}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Critical Development Areas Card */}
        {personalizedData.weaknesses.length > 0 && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('weaknesses')}
            >
              <span style={styles.cardIcon}>⚠️</span>
              <h3 style={styles.cardTitle}>Critical Development Areas</h3>
              <span style={styles.expandIcon}>
                {expandedSections.weaknesses ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.weaknesses && (
              <div style={styles.cardContent}>
                <div style={styles.weaknessGrid}>
                  {personalizedData.weaknesses.map((item, index) => (
                    <div key={index} style={styles.weaknessCard}>
                      <div style={styles.weaknessHeader}>
                        <span style={styles.weaknessCategory}>{item.category}</span>
                        <span style={{...styles.weaknessScore, color: item.grade.color}}>
                          {item.percentage}% ({item.grade.grade})
                        </span>
                      </div>
                      <p style={styles.weaknessDescription}>{item.description}</p>
                      <div style={styles.weaknessActions}>
                        <span style={styles.weaknessActionTitle}>🔴 Critical recommendations:</span>
                        <ul style={styles.weaknessList}>
                          {item.recommendations.map((rec, i) => (
                            <li key={i} style={styles.weaknessListItem}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-Time Analysis Section - Always Visible */}
        <div style={styles.card}>
          <div 
            style={styles.cardHeader}
            onClick={() => toggleSection('analysis')}
          >
            <span style={styles.cardIcon}>🔍</span>
            <h3 style={styles.cardTitle}>Real-Time Analysis</h3>
            <span style={styles.expandIcon}>
              {expandedSections.analysis ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.analysis && (
            <div style={styles.cardContent}>
              {/* Overall Summary */}
              {personalizedData.summary && (
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>🔎 Overall Summary</h4>
                  <p style={styles.analysisText}>{personalizedData.summary}</p>
                </div>
              )}

              {/* Category Breakdown with Meanings */}
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>📊 Category Breakdown & What It Means</h4>
                
                {/* Strong Areas */}
                {personalizedData.strengths.length > 0 && (
                  <div style={styles.categoryGroup}>
                    <h5 style={styles.categoryGroupTitle}>🟢 Strong Areas (≥70%)</h5>
                    {personalizedData.strengths.map((item) => (
                      <div key={item.category} style={styles.categoryAnalysis}>
                        <div style={styles.categoryAnalysisHeader}>
                          <span style={styles.categoryAnalysisName}>{item.category}</span>
                          <span style={{...styles.categoryAnalysisScore, color: '#2E7D32'}}>
                            {item.percentage}% ({item.grade.grade})
                          </span>
                        </div>
                        <p style={styles.categoryAnalysisText}>{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Moderate Areas */}
                {personalizedData.improvementAreas.length > 0 && (
                  <div style={styles.categoryGroup}>
                    <h5 style={styles.categoryGroupTitle}>🟡 Moderate / Basic Competency Areas (60-69%)</h5>
                    {personalizedData.improvementAreas.map((item) => (
                      <div key={item.category} style={styles.categoryAnalysis}>
                        <div style={styles.categoryAnalysisHeader}>
                          <span style={styles.categoryAnalysisName}>{item.category}</span>
                          <span style={{...styles.categoryAnalysisScore, color: '#F57C00'}}>
                            {item.percentage}% ({item.grade.grade})
                          </span>
                        </div>
                        <p style={styles.categoryAnalysisText}>{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Development Concerns */}
                {personalizedData.weaknesses.length > 0 && (
                  <div style={styles.categoryGroup}>
                    <h5 style={styles.categoryGroupTitle}>🔴 Development Concerns (&lt;60%)</h5>
                    {personalizedData.weaknesses.map((item) => (
                      <div key={item.category} style={styles.categoryAnalysis}>
                        <div style={styles.categoryAnalysisHeader}>
                          <span style={styles.categoryAnalysisName}>{item.category}</span>
                          <span style={{...styles.categoryAnalysisScore, color: '#C62828'}}>
                            {item.percentage}% ({item.grade.grade})
                          </span>
                        </div>
                        <p style={styles.categoryAnalysisText}>{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What This Profile Suggests */}
              <div style={styles.analysisSection}>
                <h4 style={styles.analysisTitle}>🎯 What This Profile Suggests</h4>
                <div style={styles.profileInsights}>
                  <div style={styles.insightColumn}>
                    <h5 style={styles.insightTitle}>Best Fit:</h5>
                    <ul style={styles.insightList}>
                      {personalizedData.bestFit.fits.length > 0 ? (
                        personalizedData.bestFit.fits.map((item, i) => (
                          <li key={i} style={styles.insightItem}>{item}</li>
                        ))
                      ) : (
                        <li style={styles.insightItem}>Standard roles with appropriate support</li>
                      )}
                    </ul>
                  </div>
                  <div style={styles.insightColumn}>
                    <h5 style={styles.insightTitle}>Risk Areas:</h5>
                    <ul style={styles.insightList}>
                      {personalizedData.bestFit.risks.length > 0 ? (
                        personalizedData.bestFit.risks.map((item, i) => (
                          <li key={i} style={styles.insightItem}>{item}</li>
                        ))
                      ) : (
                        <li style={styles.insightItem}>No significant risks identified</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Development Priority Summary */}
              {personalizedData.weaknesses.length > 0 && (
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>📋 Development Priority Summary</h4>
                  <div style={styles.priorityList}>
                    {personalizedData.weaknesses.slice(0, 3).map((item, index) => (
                      <div key={index} style={styles.priorityItem}>
                        <span style={styles.priorityRank}>Priority {index + 1}:</span>
                        <span style={styles.priorityCategory}>{item.category}</span>
                        <span style={styles.priorityAction}>
                          {item.recommendations[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>Report generated on {new Date().toLocaleDateString()} • Confidential</p>
          <p style={styles.reportId}>Report ID: {Math.random().toString(36).substring(2, 15)}</p>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  logoutButton: {
    background: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
    ':hover': {
      background: '#b71c1c'
    }
  },
  candidateHeader: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  candidateName: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    fontWeight: 600,
    color: '#1565c0'
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
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px'
  },
  assessmentIcon: {
    fontSize: '40px'
  },
  assessmentName: {
    margin: '0 0 5px 0',
    fontSize: '24px',
    fontWeight: 600
  },
  assessmentDescription: {
    margin: 0,
    fontSize: '14px',
    opacity: 0.9
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
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
  completedDate: {
    fontSize: '13px',
    opacity: 0.8,
    textAlign: 'right'
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
    gap: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    ':hover': {
      background: '#f8f9fa'
    }
  },
  cardIcon: {
    fontSize: '24px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    flex: 1
  },
  expandIcon: {
    fontSize: '14px',
    color: '#1565c0'
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
  strengthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  strengthCard: {
    background: '#f0fff4',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #c8e6c9'
  },
  strengthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  strengthCategory: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#2E7D32'
  },
  strengthScore: {
    fontSize: '14px',
    fontWeight: 600
  },
  strengthDescription: {
    fontSize: '13px',
    color: '#2E7D32',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  strengthAction: {
    background: 'white',
    padding: '10px',
    borderRadius: '6px'
  },
  strengthActionText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#2E7D32',
    display: 'block',
    marginBottom: '8px'
  },
  strengthList: {
    margin: 0,
    padding: '0 0 0 15px'
  },
  strengthListItem: {
    fontSize: '12px',
    color: '#555',
    marginBottom: '4px'
  },
  improvementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  improvementCard: {
    background: '#fff8e1',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ffe0b2'
  },
  improvementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  improvementCategory: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#F57C00'
  },
  improvementScore: {
    fontSize: '14px',
    fontWeight: 600
  },
  improvementDescription: {
    fontSize: '13px',
    color: '#E65100',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  improvementActions: {
    background: 'white',
    padding: '10px',
    borderRadius: '6px'
  },
  improvementActionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F57C00',
    display: 'block',
    marginBottom: '8px'
  },
  improvementList: {
    margin: 0,
    padding: '0 0 0 15px'
  },
  improvementListItem: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px'
  },
  weaknessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  weaknessCard: {
    background: '#ffebee',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ffcdd2'
  },
  weaknessHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  weaknessCategory: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#C62828'
  },
  weaknessScore: {
    fontSize: '14px',
    fontWeight: 600
  },
  weaknessDescription: {
    fontSize: '13px',
    color: '#B71C1C',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  weaknessActions: {
    background: 'white',
    padding: '10px',
    borderRadius: '6px'
  },
  weaknessActionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#C62828',
    display: 'block',
    marginBottom: '8px'
  },
  weaknessList: {
    margin: 0,
    padding: '0 0 0 15px'
  },
  weaknessListItem: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px'
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
  categoryGroup: {
    marginBottom: '25px'
  },
  categoryGroupTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 12px 0'
  },
  categoryAnalysis: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #e0e0e0'
  },
  categoryAnalysisHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  categoryAnalysisName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333'
  },
  categoryAnalysisScore: {
    fontSize: '14px',
    fontWeight: 600
  },
  categoryAnalysisText: {
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.6',
    margin: 0
  },
  profileInsights: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  insightColumn: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px'
  },
  insightTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 10px 0'
  },
  insightList: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  insightItem: {
    padding: '6px 0',
    fontSize: '13px',
    color: '#555',
    borderBottom: '1px solid #f0f0f0'
  },
  priorityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  priorityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e0e0e0'
  },
  priorityRank: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1565c0',
    minWidth: '70px'
  },
  priorityCategory: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
    minWidth: '150px'
  },
  priorityAction: {
    fontSize: '13px',
    color: '#555',
    flex: 1
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#999',
    fontSize: '12px'
  },
  reportId: {
    fontSize: '10px',
    marginTop: '5px',
    color: '#ccc'
  }
};
