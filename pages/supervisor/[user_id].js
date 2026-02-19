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
  const [uniqueInsights, setUniqueInsights] = useState([]);
  const [interpretations, setInterpretations] = useState({});
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [overallProfile, setOverallProfile] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Grade definitions with colors and interpretations
  const gradeSystem = {
    'A+': { min: 95, color: '#2E7D32', bg: '#E8F5E9', label: 'Exceptional', description: 'Demonstrates mastery beyond expectations' },
    'A': { min: 90, color: '#2E7D32', bg: '#E8F5E9', label: 'Excellent', description: 'Strong mastery of all concepts' },
    'A-': { min: 85, color: '#4CAF50', bg: '#E8F5E9', label: 'Very Good', description: 'Above average performance' },
    'B+': { min: 80, color: '#4CAF50', bg: '#E8F5E9', label: 'Good', description: 'Solid understanding' },
    'B': { min: 75, color: '#2196F3', bg: '#E3F2FD', label: 'Satisfactory', description: 'Meets expectations' },
    'B-': { min: 70, color: '#2196F3', bg: '#E3F2FD', label: 'Adequate', description: 'Basic competency demonstrated' },
    'C+': { min: 65, color: '#FF9800', bg: '#FFF3E0', label: 'Developing', description: 'Shows potential with some gaps' },
    'C': { min: 60, color: '#FF9800', bg: '#FFF3E0', label: 'Emerging', description: 'Foundational understanding' },
    'C-': { min: 55, color: '#FF9800', bg: '#FFF3E0', label: 'Basic', description: 'Minimum competency' },
    'D+': { min: 50, color: '#F44336', bg: '#FFEBEE', label: 'Needs Improvement', description: 'Significant gaps identified' },
    'D': { min: 40, color: '#F44336', bg: '#FFEBEE', label: 'Below Expectations', description: 'Critical areas need development' },
    'F': { min: 0, color: '#B71C1C', bg: '#FFEBEE', label: 'Unsatisfactory', description: 'Requires intensive intervention' }
  };

  // Get grade based on percentage
  const getGrade = useCallback((percentage) => {
    for (const [grade, data] of Object.entries(gradeSystem)) {
      if (percentage >= data.min) {
        return { 
          grade, 
          ...data,
          icon: percentage >= 80 ? '🌟' : percentage >= 60 ? '📈' : '📊'
        };
      }
    }
    return { grade: 'F', ...gradeSystem['F'], icon: '⚠️' };
  }, []);

  // Get classification based on score
  const getClassification = useCallback((score, maxScore = 500) => {
    const percentage = (score / maxScore) * 100;
    const grade = getGrade(percentage);
    
    let description = '';
    if (percentage >= 80) {
      description = 'This candidate demonstrates strong capabilities and is ready for increased responsibility. They show mastery in key areas and have the potential to take on leadership roles.';
    } else if (percentage >= 60) {
      description = 'This candidate shows solid foundational skills with clear potential for growth. With targeted development in specific areas, they can advance to the next level.';
    } else if (percentage >= 40) {
      description = 'This candidate has foundational knowledge but requires structured development and support. Focused training in key areas will help build competency.';
    } else {
      description = 'This candidate needs significant development and intensive support. A structured learning plan with close mentorship is recommended.';
    }
    
    return {
      label: grade.label,
      grade: grade.grade,
      color: grade.color,
      bgColor: grade.bg,
      icon: grade.icon,
      percentage: Math.round(percentage),
      description
    };
  }, [getGrade]);

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

        // Get candidate info from candidate_profiles
        const { data: profileData, error: profileError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .single();

        if (!profileError && profileData) {
          setCandidate({
            id: user_id,
            full_name: profileData.full_name || 'Candidate',
            email: profileData.email || 'No email'
          });
        } else {
          setCandidate({
            id: user_id,
            full_name: 'Candidate',
            email: 'Email not available'
          });
        }

        // Get data from candidate_assessments
        const { data: candidateAssessments, error: candidateError } = await supabase
          .from('candidate_assessments')
          .select(`
            id,
            assessment_id,
            status,
            score,
            completed_at,
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
            
            return {
              result_id: detailedResult?.id || assessment.id,
              assessment_id: assessment.assessment_id,
              assessment_name: assessment.assessments?.title || 'Assessment',
              assessment_type: assessment.assessments?.assessment_type?.code || 'general',
              score: assessment.score,
              max_score: 500,
              percentage: assessment.score ? Math.round((assessment.score / 500) * 100) : 0,
              completed_at: assessment.completed_at,
              category_scores: detailedResult?.category_scores || {},
              strengths: detailedResult?.strengths || [],
              weaknesses: detailedResult?.weaknesses || [],
              recommendations: detailedResult?.recommendations || [],
              development_plan: detailedResult?.development_plan || {},
              unique_insights: detailedResult?.unique_insights || [],
              interpretations: detailedResult?.interpretations || {},
              executive_summary: detailedResult?.interpretations?.executiveSummary || detailedResult?.interpretations?.summary || '',
              overall_profile: detailedResult?.interpretations?.overallProfile || ''
            };
          });

          setAssessments(formattedAssessments);
          
          // Select the most recent assessment
          if (formattedAssessments.length > 0) {
            const mostRecent = formattedAssessments[0];
            setSelectedAssessment(mostRecent);
            
            // Set the detailed data
            setCategoryScores(mostRecent.category_scores || {});
            setStrengths(mostRecent.strengths || []);
            setWeaknesses(mostRecent.weaknesses || []);
            setRecommendations(mostRecent.recommendations || []);
            setDevelopmentPlan(mostRecent.development_plan || {});
            setUniqueInsights(mostRecent.unique_insights || []);
            setInterpretations(mostRecent.interpretations || {});
            setExecutiveSummary(mostRecent.executive_summary || '');
            setOverallProfile(mostRecent.overall_profile || '');
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
    
    if (assessment) {
      setCategoryScores(assessment.category_scores || {});
      setStrengths(assessment.strengths || []);
      setWeaknesses(assessment.weaknesses || []);
      setRecommendations(assessment.recommendations || []);
      setDevelopmentPlan(assessment.development_plan || {});
      setUniqueInsights(assessment.unique_insights || []);
      setInterpretations(assessment.interpretations || {});
      setExecutiveSummary(assessment.executive_summary || '');
      setOverallProfile(assessment.overall_profile || '');
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

  if (!assessments || assessments.length === 0) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.noAssessment}>
          <h2>No Assessment Data Available</h2>
          <p>This candidate hasn't completed any assessments yet.</p>
          <button onClick={handleBack} style={styles.backButton}>
            ← Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  const currentAssessment = selectedAssessment || assessments[0];
  const classification = getClassification(currentAssessment.score, currentAssessment.max_score);

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

        {/* Hero Score Card */}
        <div style={{
          ...styles.heroCard,
          background: `linear-gradient(135deg, ${classification.color}, ${adjustColor(classification.color, -30)})`
        }}>
          <div style={styles.heroContent}>
            <div style={styles.heroLeft}>
              <div style={styles.heroIcon}>{classification.icon}</div>
              <div>
                <div style={styles.heroTitle}>{currentAssessment.assessment_name}</div>
                <div style={styles.heroDate}>
                  Completed on {new Date(currentAssessment.completed_at).toLocaleDateString()} at{' '}
                  {new Date(currentAssessment.completed_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div style={styles.heroScore}>
              <div style={styles.heroScoreValue}>{currentAssessment.score}</div>
              <div style={styles.heroScoreMax}>/{currentAssessment.max_score}</div>
            </div>
          </div>
          
          <div style={styles.heroStats}>
            <div style={styles.heroStat}>
              <div style={styles.heroStatLabel}>Percentage</div>
              <div style={styles.heroStatValue}>{classification.percentage}%</div>
            </div>
            <div style={styles.heroStat}>
              <div style={styles.heroStatLabel}>Grade</div>
              <div style={{...styles.heroStatValue, fontSize: '32px'}}>{classification.grade}</div>
            </div>
            <div style={styles.heroStat}>
              <div style={styles.heroStatLabel}>Classification</div>
              <div style={styles.heroStatValue}>{classification.label}</div>
            </div>
          </div>
          
          <div style={{
            ...styles.heroBadge,
            background: classification.bgColor,
            color: classification.color
          }}>
            {classification.description}
          </div>
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
              {/* Executive Summary Card */}
              <div style={styles.summaryCard}>
                <div style={styles.summaryHeader}>
                  <span style={styles.summaryIcon}>📋</span>
                  <h3 style={styles.summaryTitle}>Executive Summary</h3>
                </div>
                <p style={styles.summaryText}>
                  {executiveSummary || classification.description}
                </p>
              </div>

              {/* Performance Summary Card */}
              <div style={styles.statsCard}>
                <div style={styles.statsHeader}>
                  <span style={styles.statsIcon}>📊</span>
                  <h3 style={styles.statsTitle}>Performance Summary</h3>
                </div>
                <div style={styles.statsGrid}>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>Total Score</div>
                    <div style={{...styles.statValue, color: classification.color}}>
                      {currentAssessment.score}/{currentAssessment.max_score}
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>Percentage</div>
                    <div style={styles.statValue}>{classification.percentage}%</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>Grade</div>
                    <div style={{...styles.statValue, color: classification.color}}>
                      {classification.grade} ({classification.label})
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>Categories</div>
                    <div style={styles.statValue}>{Object.keys(categoryScores).length}</div>
                  </div>
                </div>
              </div>

              {/* Key Insights Card */}
              <div style={styles.insightsCard}>
                <div style={styles.insightsHeader}>
                  <span style={styles.insightsIcon}>💡</span>
                  <h3 style={styles.insightsTitle}>Key Insights</h3>
                </div>
                <div style={styles.insightsContent}>
                  {strengths.length > 0 && (
                    <div style={styles.insightSection}>
                      <h4 style={{...styles.insightSectionTitle, color: '#2E7D32'}}>
                        <span style={styles.sectionIcon}>✓</span> Strengths
                      </h4>
                      {strengths.slice(0, 3).map((s, i) => (
                        <div key={i} style={styles.insightItem}>
                          <span style={styles.insightBullet}>✓</span>
                          <span>{typeof s === 'string' ? s : s.area || s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {weaknesses.length > 0 && (
                    <div style={styles.insightSection}>
                      <h4 style={{...styles.insightSectionTitle, color: '#C62828'}}>
                        <span style={styles.sectionIcon}>!</span> Development Areas
                      </h4>
                      {weaknesses.slice(0, 3).map((w, i) => (
                        <div key={i} style={styles.insightItem}>
                          <span style={styles.insightBullet}>!</span>
                          <span>{typeof w === 'string' ? w : w.area || w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {uniqueInsights.length > 0 && (
                    <div style={styles.insightSection}>
                      <h4 style={styles.insightSectionTitle}>
                        <span style={styles.sectionIcon}>🔍</span> Unique Observations
                      </h4>
                      {uniqueInsights.map((insight, i) => (
                        <div key={i} style={styles.insightItem}>
                          <span style={styles.insightBullet}>•</span>
                          <span>{insight}</span>
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
                        background: level === 'Strength' ? grade.bg :
                                   level === 'Average' ? '#FFF3E0' : '#FFEBEE',
                        color: level === 'Strength' ? grade.color :
                              level === 'Average' ? '#F57C00' : '#C62828'
                      }}>
                        {level}
                      </span>
                    </div>

                    <div style={styles.categoryScore}>
                      <div style={styles.categoryScoreRow}>
                        <span>Score</span>
                        <span style={{ fontWeight: 600 }}>{data.score}/{data.maxPossible}</span>
                      </div>
                      <div style={styles.categoryScoreRow}>
                        <span>Average</span>
                        <span style={{ fontWeight: 600 }}>{data.average}/5</span>
                      </div>
                      <div style={styles.categoryScoreRow}>
                        <span>Grade</span>
                        <span style={{ fontWeight: 600, color: grade.color }}>
                          {grade.grade} • {data.percentage}%
                        </span>
                      </div>
                    </div>

                    <div style={styles.categoryProgress}>
                      <div style={styles.categoryProgressBar}>
                        <div style={{
                          ...styles.categoryProgressFill,
                          width: `${data.percentage}%`,
                          background: `linear-gradient(90deg, ${grade.color}, ${adjustColor(grade.color, 20)})`
                        }} />
                      </div>
                    </div>

                    <div style={styles.categoryInterpretation}>
                      <span style={styles.interpretationIcon}>{grade.icon}</span>
                      <span>{grade.description} in this area.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div style={styles.analysisGrid}>
              {/* Strengths Section */}
              <div style={styles.analysisSection}>
                <div style={{...styles.analysisHeader, background: 'linear-gradient(135deg, #2E7D32, #1B5E20)'}}>
                  <span style={styles.analysisIcon}>🌟</span>
                  <h2 style={styles.analysisTitle}>Key Strengths</h2>
                </div>
                <div style={styles.analysisContent}>
                  {strengths.length > 0 ? (
                    strengths.map((strength, index) => {
                      const area = typeof strength === 'string' ? strength : strength.area;
                      const percentage = strength.percentage || 
                        (categoryScores[area]?.percentage) || 
                        (area.match(/\d+/) ? parseInt(area.match(/\d+/)[0]) : null);
                      const grade = percentage ? getGrade(percentage) : null;
                      
                      return (
                        <div key={index} style={styles.analysisItem}>
                          <div style={styles.analysisItemHeader}>
                            <span style={styles.analysisItemIcon}>✓</span>
                            <span style={styles.analysisItemTitle}>{area}</span>
                            {percentage && (
                              <span style={{
                                ...styles.analysisItemBadge,
                                background: grade?.bg || '#E8F5E9',
                                color: grade?.color || '#2E7D32'
                              }}>
                                {grade?.grade || percentage}%
                              </span>
                            )}
                          </div>
                          <p style={styles.analysisItemDesc}>
                            {strength.insights || strength.analysis || 
                             `Demonstrates strong capability in ${area}. This is a key area of competence that can be leveraged for greater responsibility.`}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p style={styles.noData}>No exceptional strengths identified.</p>
                  )}
                </div>
              </div>

              {/* Weaknesses Section */}
              <div style={styles.analysisSection}>
                <div style={{...styles.analysisHeader, background: 'linear-gradient(135deg, #C62828, #8B0000)'}}>
                  <span style={styles.analysisIcon}>🎯</span>
                  <h2 style={styles.analysisTitle}>Development Areas</h2>
                </div>
                <div style={styles.analysisContent}>
                  {weaknesses.length > 0 ? (
                    weaknesses.map((weakness, index) => {
                      const area = typeof weakness === 'string' ? weakness : weakness.area;
                      const percentage = weakness.percentage || 
                        (categoryScores[area]?.percentage) || 
                        (area.match(/\d+/) ? parseInt(area.match(/\d+/)[0]) : null);
                      const grade = percentage ? getGrade(percentage) : null;
                      
                      return (
                        <div key={index} style={styles.analysisItem}>
                          <div style={styles.analysisItemHeader}>
                            <span style={styles.analysisItemIcon}>!</span>
                            <span style={styles.analysisItemTitle}>{area}</span>
                            {percentage && (
                              <span style={{
                                ...styles.analysisItemBadge,
                                background: grade?.bg || '#FFEBEE',
                                color: grade?.color || '#C62828'
                              }}>
                                {grade?.grade || percentage}%
                              </span>
                            )}
                          </div>
                          <p style={styles.analysisItemDesc}>
                            {weakness.insights || weakness.analysis ||
                             `Needs focused development in ${area}. This area requires attention through targeted training and practice.`}
                          </p>
                          {weakness.recommendations && weakness.recommendations.length > 0 && (
                            <div style={styles.recommendationTags}>
                              {weakness.recommendations.map((rec, idx) => (
                                <span key={idx} style={styles.recommendationTag}>{rec}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p style={styles.noData}>No significant development areas identified.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Development Plan Tab */}
          {activeTab === 'recommendations' && (
            <div style={styles.planContainer}>
              {/* Overall Recommendations */}
              {recommendations.length > 0 && (
                <div style={styles.recommendationsSection}>
                  <h3 style={styles.sectionHeader}>
                    <span style={styles.sectionIcon}>📌</span>
                    Key Recommendations
                  </h3>
                  <div style={styles.recommendationsGrid}>
                    {recommendations.map((rec, index) => (
                      <div key={index} style={styles.recommendationCard}>
                        <div style={styles.recommendationNumber}>{index + 1}</div>
                        <p style={styles.recommendationText}>
                          {typeof rec === 'string' ? rec : rec.message || JSON.stringify(rec)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Development Plan */}
              {developmentPlan && Object.keys(developmentPlan).length > 0 && (
                <div style={styles.planSections}>
                  {/* Immediate Actions */}
                  {developmentPlan.immediate && developmentPlan.immediate.length > 0 && (
                    <div style={styles.planPhase}>
                      <div style={styles.phaseHeader}>
                        <span style={styles.phaseIcon}>⚡</span>
                        <div>
                          <h3 style={styles.phaseTitle}>Immediate Actions</h3>
                          <p style={styles.phaseTimeline}>0-30 days</p>
                        </div>
                      </div>
                      <div style={styles.phaseContent}>
                        {developmentPlan.immediate.map((item, index) => (
                          <div key={index} style={styles.phaseItem}>
                            <div style={styles.phaseItemHeader}>
                              <span style={styles.phaseItemArea}>{item.area}</span>
                              <span style={styles.phaseItemPriority}>High Priority</span>
                            </div>
                            <p style={styles.phaseItemAction}>{item.action}</p>
                            <p style={styles.phaseItemDesc}>{item.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Short-term Goals */}
                  {developmentPlan.shortTerm && developmentPlan.shortTerm.length > 0 && (
                    <div style={styles.planPhase}>
                      <div style={styles.phaseHeader}>
                        <span style={styles.phaseIcon}>📅</span>
                        <div>
                          <h3 style={styles.phaseTitle}>Short-term Goals</h3>
                          <p style={styles.phaseTimeline}>30-60 days</p>
                        </div>
                      </div>
                      <div style={styles.phaseContent}>
                        {developmentPlan.shortTerm.map((item, index) => (
                          <div key={index} style={styles.phaseItem}>
                            <div style={styles.phaseItemHeader}>
                              <span style={styles.phaseItemArea}>{item.area}</span>
                              <span style={styles.phaseItemPriority}>Medium Priority</span>
                            </div>
                            <p style={styles.phaseItemAction}>{item.action}</p>
                            <p style={styles.phaseItemDesc}>{item.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Long-term Development */}
                  {developmentPlan.longTerm && developmentPlan.longTerm.length > 0 && (
                    <div style={styles.planPhase}>
                      <div style={styles.phaseHeader}>
                        <span style={styles.phaseIcon}>🚀</span>
                        <div>
                          <h3 style={styles.phaseTitle}>Long-term Development</h3>
                          <p style={styles.phaseTimeline}>60-90+ days</p>
                        </div>
                      </div>
                      <div style={styles.phaseContent}>
                        {developmentPlan.longTerm.map((item, index) => (
                          <div key={index} style={styles.phaseItem}>
                            <div style={styles.phaseItemHeader}>
                              <span style={styles.phaseItemArea}>{item.area}</span>
                              <span style={styles.phaseItemPriority}>Growth Opportunity</span>
                            </div>
                            <p style={styles.phaseItemAction}>{item.action}</p>
                            <p style={styles.phaseItemDesc}>{item.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p style={styles.footerNote}>This report is confidential and should be used for development purposes only.</p>
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
function adjustColor(hex, percent) {
  if (!hex) return '#666';
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
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
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px',
    animation: 'fadeIn 0.5s ease'
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
    gap: '5px',
    transition: 'color 0.2s',
    ':hover': {
      color: '#0d47a1'
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
    color: '#333',
    fontSize: '28px',
    fontWeight: 700
  },
  candidateEmail: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  selector: {
    background: '#f8f9fa',
    padding: '15px 20px',
    borderRadius: '12px',
    minWidth: '350px',
    border: '1px solid #e0e0e0'
  },
  selectorLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer'
  },
  heroCard: {
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
  heroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  heroIcon: {
    fontSize: '48px',
    background: 'rgba(255,255,255,0.2)',
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)'
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
  heroScore: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '5px',
    background: 'rgba(255,255,255,0.2)',
    padding: '15px 25px',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)'
  },
  heroScoreValue: {
    fontSize: '48px',
    fontWeight: 800,
    lineHeight: 1
  },
  heroScoreMax: {
    fontSize: '20px',
    opacity: 0.8
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '25px',
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
  heroBadge: {
    padding: '15px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: '1.5',
    position: 'relative',
    zIndex: 2
  },
  tabs: {
    display: 'flex',
    gap: '30px',
    borderBottom: '2px solid #e0e0e0',
    marginBottom: '30px'
  },
  tab: {
    padding: '12px 0',
    background: 'none',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '-2px'
  },
  tabContent: {
    minHeight: '500px',
    animation: 'fadeIn 0.3s ease'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '25px'
  },
  summaryCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
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
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  summaryText: {
    margin: 0,
    fontSize: '15px',
    color: '#555',
    lineHeight: '1.6'
  },
  statsCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  statsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  statsIcon: {
    fontSize: '28px'
  },
  statsTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px'
  },
  statItem: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700
  },
  insightsCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  insightsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  insightsIcon: {
    fontSize: '28px'
  },
  insightsTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  insightsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  insightSection: {
    marginBottom: '15px'
  },
  insightSectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  sectionIcon: {
    fontSize: '16px'
  },
  insightItem: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5'
  },
  insightBullet: {
    fontSize: '16px'
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  categoryCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, boxShadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
    }
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
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600
  },
  categoryScore: {
    marginBottom: '15px'
  },
  categoryScoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px'
  },
  categoryProgress: {
    marginBottom: '15px'
  },
  categoryProgressBar: {
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  categoryInterpretation: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#555'
  },
  interpretationIcon: {
    fontSize: '14px'
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '25px'
  },
  analysisSection: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  analysisHeader: {
    padding: '20px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  analysisIcon: {
    fontSize: '28px'
  },
  analysisTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  analysisContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  analysisItem: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  analysisItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  analysisItemIcon: {
    fontSize: '16px',
    fontWeight: 600
  },
  analysisItemTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#333'
  },
  analysisItemBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    marginLeft: 'auto'
  },
  analysisItemDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5'
  },
  recommendationTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '10px'
  },
  recommendationTag: {
    padding: '4px 10px',
    background: '#fff3e0',
    color: '#e65100',
    borderRadius: '20px',
    fontSize: '11px'
  },
  noData: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center',
    padding: '30px',
    background: '#f8f9fa',
    borderRadius: '12px'
  },
  planContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  recommendationsSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  sectionIcon: {
    fontSize: '24px'
  },
  recommendationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  recommendationCard: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    borderLeft: '4px solid #1565c0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px'
  },
  recommendationNumber: {
    width: '28px',
    height: '28px',
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
  recommendationText: {
    margin: 0,
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
    flex: 1
  },
  planSections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  planPhase: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  phaseHeader: {
    padding: '20px',
    background: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  phaseIcon: {
    fontSize: '32px'
  },
  phaseTitle: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  phaseTimeline: {
    margin: 0,
    fontSize: '13px',
    color: '#666'
  },
  phaseContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  phaseItem: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  phaseItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  phaseItemArea: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1565c0'
  },
  phaseItemPriority: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    background: '#e3f2fd',
    color: '#1565c0',
    borderRadius: '20px'
  },
  phaseItemAction: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333'
  },
  phaseItemDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic'
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center'
  },
  footerNote: {
    fontSize: '11px',
    color: '#999',
    marginTop: '5px'
  },
  backButton: {
    padding: '10px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px',
    transition: 'background 0.2s',
    ':hover': {
      background: '#0d47a1'
    }
  }
};
