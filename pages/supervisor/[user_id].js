import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateDetailedInterpretation } from "../../utils/detailedInterpreter";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
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

        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsData && resultsData.length > 0) {
          const result = resultsData[0];
          const percentage = Math.round((result.total_score / result.max_score) * 100);
          
          const detailedInterpretation = generateDetailedInterpretation(
            profileData?.full_name || 'Candidate',
            result.category_scores
          );
          
          setAssessmentData({
            source: 'results',
            total_score: result.total_score,
            max_score: result.max_score,
            percentage: percentage,
            completed_at: result.completed_at,
            category_scores: result.category_scores || {},
            strengths: result.strengths || [],
            weaknesses: result.weaknesses || [],
            recommendations: result.recommendations || [],
            interpretations: result.interpretations || {},
            detailedInterpretation: detailedInterpretation
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor, user_id]);

  const getGradeInfo = (percentage) => {
    if (percentage >= 90) return { grade: 'A', color: '#10b981', bg: '#d1fae5', text: 'Exceptional' };
    if (percentage >= 80) return { grade: 'B', color: '#3b82f6', bg: '#dbeafe', text: 'Very Good' };
    if (percentage >= 70) return { grade: 'C', color: '#8b5cf6', bg: '#ede9fe', text: 'Good' };
    if (percentage >= 60) return { grade: 'D', color: '#f59e0b', bg: '#fef3c7', text: 'Fair' };
    if (percentage >= 50) return { grade: 'E', color: '#f97316', bg: '#ffedd5', text: 'Below Average' };
    return { grade: 'F', color: '#ef4444', bg: '#fee2e2', text: 'Needs Improvement' };
  };

  const getScoreCategory = (percentage) => {
    if (percentage >= 70) return 'strength';
    if (percentage >= 60) return 'moderate';
    return 'concern';
  };

  if (!isSupervisor || loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading candidate report...</p>
      </div>
    );
  }

  if (!candidate || !assessmentData) {
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

  const gradeInfo = getGradeInfo(assessmentData.percentage);

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        {/* Header with back button */}
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Dashboard</a>
          </Link>
        </div>

        {/* Candidate Profile Header */}
        <div style={styles.profileHeader}>
          <div style={styles.profileInfo}>
            <h1 style={styles.candidateName}>{candidate.full_name}</h1>
            <p style={styles.candidateEmail}>{candidate.email}</p>
            <p style={styles.completedDate}>Assessment completed on {new Date(assessmentData.completed_at).toLocaleDateString()}</p>
          </div>
          <div style={styles.scoreBadge}>
            <span style={styles.scoreLarge}>{assessmentData.total_score}</span>
            <span style={styles.scoreMax}>/{assessmentData.max_score}</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={styles.metricsGrid}>
          <div style={{...styles.metricCard, borderTop: `4px solid ${gradeInfo.color}`}}>
            <span style={styles.metricLabel}>Percentage</span>
            <span style={{...styles.metricValue, color: gradeInfo.color}}>{assessmentData.percentage}%</span>
          </div>
          <div style={{...styles.metricCard, borderTop: `4px solid ${gradeInfo.color}`}}>
            <span style={styles.metricLabel}>Grade</span>
            <span style={{...styles.metricValue, color: gradeInfo.color}}>{gradeInfo.grade}</span>
          </div>
          <div style={{...styles.metricCard, borderTop: `4px solid ${gradeInfo.color}`}}>
            <span style={styles.metricLabel}>Classification</span>
            <span style={{...styles.metricValue, color: gradeInfo.color}}>{gradeInfo.text}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button 
            style={{...styles.tab, borderBottom: activeTab === 'overview' ? `3px solid #3b82f6` : '3px solid transparent'}}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            style={{...styles.tab, borderBottom: activeTab === 'categories' ? `3px solid #3b82f6` : '3px solid transparent'}}
            onClick={() => setActiveTab('categories')}
          >
            Category Performance
          </button>
          <button 
            style={{...styles.tab, borderBottom: activeTab === 'analysis' ? `3px solid #3b82f6` : '3px solid transparent'}}
            onClick={() => setActiveTab('analysis')}
          >
            Professional Analysis
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {/* Strengths Section */}
              {assessmentData.strengths && assessmentData.strengths.length > 0 && (
                <div style={styles.sectionCard}>
                  <h3 style={styles.sectionTitle}>
                    <span style={styles.sectionIcon}>💪</span> 
                    Strengths
                  </h3>
                  <div style={styles.tagContainer}>
                    {assessmentData.strengths.map((strength, index) => (
                      <span key={index} style={{...styles.tag, background: '#d1fae5', color: '#065f46'}}>
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {assessmentData.weaknesses && assessmentData.weaknesses.length > 0 && (
                <div style={styles.sectionCard}>
                  <h3 style={styles.sectionTitle}>
                    <span style={styles.sectionIcon}>📈</span> 
                    Areas for Improvement
                  </h3>
                  <div style={styles.tagContainer}>
                    {assessmentData.weaknesses.map((weakness, index) => (
                      <span key={index} style={{...styles.tag, background: '#fee2e2', color: '#991b1b'}}>
                        {weakness}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Recommendations Preview */}
              {assessmentData.recommendations && assessmentData.recommendations.length > 0 && (
                <div style={styles.sectionCard}>
                  <h3 style={styles.sectionTitle}>
                    <span style={styles.sectionIcon}>🎯</span> 
                    Key Recommendations
                  </h3>
                  <div style={styles.recommendationsPreview}>
                    {assessmentData.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} style={styles.recommendationPreviewItem}>
                        <span style={styles.bulletPoint}>•</span>
                        <span style={styles.recommendationPreviewText}>{rec}</span>
                      </div>
                    ))}
                    {assessmentData.recommendations.length > 3 && (
                      <p style={styles.viewMoreHint}>View all {assessmentData.recommendations.length} recommendations in the Analysis tab</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div style={styles.categoriesContainer}>
              {Object.entries(assessmentData.category_scores).map(([category, data]) => {
                const categoryGrade = getGradeInfo(data.percentage);
                const categoryType = getScoreCategory(data.percentage);
                
                let borderColor = '#e5e7eb';
                let badgeColor = '#6b7280';
                if (categoryType === 'strength') {
                  borderColor = '#10b981';
                  badgeColor = '#10b981';
                } else if (categoryType === 'moderate') {
                  borderColor = '#f59e0b';
                  badgeColor = '#f59e0b';
                } else {
                  borderColor = '#ef4444';
                  badgeColor = '#ef4444';
                }
                
                return (
                  <div key={category} style={{...styles.categoryCard, borderLeft: `4px solid ${borderColor}`}}>
                    <div style={styles.categoryHeader}>
                      <h4 style={styles.categoryName}>{category}</h4>
                      <span style={{...styles.categoryBadge, background: categoryGrade.bg, color: categoryGrade.color}}>
                        {categoryGrade.grade}
                      </span>
                    </div>
                    
                    <div style={styles.categoryDetails}>
                      <div style={styles.categoryScore}>
                        <span style={styles.categoryScoreLabel}>Score</span>
                        <span style={styles.categoryScoreValue}>{data.score}/{data.maxPossible}</span>
                      </div>
                      
                      <div style={styles.categoryPercentage}>
                        <span style={styles.categoryPercentageLabel}>Percentage</span>
                        <div style={styles.progressContainer}>
                          <div style={styles.progressBar}>
                            <div style={{
                              width: `${data.percentage}%`,
                              height: '100%',
                              background: categoryGrade.color,
                              borderRadius: '4px'
                            }} />
                          </div>
                          <span style={{...styles.categoryPercentageValue, color: categoryGrade.color}}>
                            {data.percentage}%
                          </span>
                        </div>
                      </div>
                      
                      <div style={styles.categoryAssessment}>
                        <span style={styles.categoryAssessmentLabel}>Assessment</span>
                        <span style={{...styles.categoryAssessmentValue, color: badgeColor}}>
                          {categoryGrade.text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && assessmentData.detailedInterpretation && (
            <div style={styles.analysisContainer}>
              {/* Overall Profile Summary */}
              <div style={styles.analysisCard}>
                <h3 style={styles.analysisCardTitle}>Executive Summary</h3>
                <div style={styles.analysisText}>{assessmentData.detailedInterpretation.overallProfileSummary}</div>
              </div>

              {/* Category Analysis */}
              <div style={styles.analysisCard}>
                <h3 style={styles.analysisCardTitle}>Category Analysis</h3>
                
                {assessmentData.detailedInterpretation.categoryBreakdown.strong.map((narrative, index) => (
                  <div key={index} style={styles.categoryAnalysisBlock}>
                    <div style={styles.analysisText}>{narrative}</div>
                  </div>
                ))}

                {assessmentData.detailedInterpretation.categoryBreakdown.moderate.map((narrative, index) => (
                  <div key={index} style={styles.categoryAnalysisBlock}>
                    <div style={styles.analysisText}>{narrative}</div>
                  </div>
                ))}

                {assessmentData.detailedInterpretation.categoryBreakdown.concerns.map((narrative, index) => (
                  <div key={index} style={styles.categoryAnalysisBlock}>
                    <div style={styles.analysisText}>{narrative}</div>
                  </div>
                ))}
              </div>

              {/* Hiring Interpretation */}
              <div style={styles.analysisCard}>
                <h3 style={styles.analysisCardTitle}>Hiring Recommendations</h3>
                <div style={styles.analysisText}>{assessmentData.detailedInterpretation.hiringInterpretation}</div>
              </div>

              {/* Development Potential */}
              <div style={styles.analysisCard}>
                <h3 style={styles.analysisCardTitle}>Development Potential</h3>
                <div style={styles.analysisText}>{assessmentData.detailedInterpretation.developmentPotential}</div>
              </div>

              {/* Strategic Observation */}
              <div style={styles.analysisCard}>
                <h3 style={styles.analysisCardTitle}>Strategic Observation</h3>
                <div style={styles.analysisText}>{assessmentData.detailedInterpretation.strategicObservation}</div>
              </div>

              {/* Final Assessment */}
              <div style={styles.analysisCard}>
                <h3 style={styles.analysisCardTitle}>Final Assessment</h3>
                <div style={styles.analysisText}>{assessmentData.detailedInterpretation.finalAssessment}</div>
              </div>

              {/* All Recommendations */}
              {assessmentData.recommendations && assessmentData.recommendations.length > 0 && (
                <div style={styles.analysisCard}>
                  <h3 style={styles.analysisCardTitle}>Detailed Recommendations</h3>
                  <div style={styles.recommendationsList}>
                    {assessmentData.recommendations.map((rec, index) => (
                      <div key={index} style={styles.recommendationItem}>
                        <span style={styles.recommendationNumber}>{index + 1}.</span>
                        <span style={styles.recommendationText}>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <p>Confidential Report • Generated on {new Date().toLocaleDateString()}</p>
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
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    margin: '20px',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    background: '#3b82f6',
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
      background: '#2563eb',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)'
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
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #3b82f6',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3b82f6',
      color: 'white'
    }
  },
  profileHeader: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  profileInfo: {
    flex: 1
  },
  candidateName: {
    margin: '0 0 8px 0',
    fontSize: '32px',
    fontWeight: 700,
    color: '#1f2937'
  },
  candidateEmail: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    color: '#6b7280'
  },
  completedDate: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af'
  },
  scoreBadge: {
    background: '#f3f4f6',
    padding: '20px 30px',
    borderRadius: '60px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '5px'
  },
  scoreLarge: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1
  },
  scoreMax: {
    fontSize: '20px',
    color: '#9ca3af'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  metricCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    textAlign: 'center'
  },
  metricLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  metricValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 700
  },
  tabContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '10px'
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '10px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#4b5563',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabContent: {
    minHeight: '400px'
  },
  sectionCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  sectionIcon: {
    fontSize: '24px'
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  tag: {
    padding: '8px 16px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: 500
  },
  recommendationsPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  recommendationPreviewItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  bulletPoint: {
    color: '#3b82f6',
    fontSize: '18px'
  },
  recommendationPreviewText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5'
  },
  viewMoreHint: {
    margin: '10px 0 0 0',
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  categoriesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  categoryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
    }
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  categoryName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937'
  },
  categoryBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600
  },
  categoryDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  categoryScore: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryScoreLabel: {
    fontSize: '13px',
    color: '#6b7280'
  },
  categoryScoreValue: {
    fontSize: '15px',
    fontWeight: 600',
    color: '#1f2937'
  },
  categoryPercentage: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryPercentageLabel: {
    fontSize: '13px',
    color: '#6b7280'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    maxWidth: '150px'
  },
  progressBar: {
    width: '100px',
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  categoryPercentageValue: {
    fontSize: '15px',
    fontWeight: 600,
    minWidth: '45px'
  },
  categoryAssessment: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '5px',
    paddingTop: '5px',
    borderTop: '1px solid #f3f4f6'
  },
  categoryAssessmentLabel: {
    fontSize: '13px',
    color: '#6b7280'
  },
  categoryAssessmentValue: {
    fontSize: '14px',
    fontWeight: 600
  },
  analysisContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  analysisCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  analysisCardTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    borderBottom: '2px solid #f3f4f6',
    paddingBottom: '10px'
  },
  analysisText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.8',
    whiteSpace: 'pre-line'
  },
  categoryAnalysisBlock: {
    marginBottom: '20px',
    padding: '15px',
    background: '#f9fafb',
    borderRadius: '12px'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  recommendationItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '10px',
    background: '#f9fafb',
    borderRadius: '8px'
  },
  recommendationNumber: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    minWidth: '25px'
  },
  recommendationText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    flex: 1
  },
  footer: {
    marginTop: '50px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '12px'
  }
};
