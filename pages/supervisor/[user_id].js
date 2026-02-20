import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import {
  getGradeInfo,
  getOverallRating,
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
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    categories: true,
    analysis: true
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

        setCandidate({
          id: candidateId,
          full_name: profileData?.full_name || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        // Try to get from supervisor_dashboard first
        const { data: dashboardData } = await supabase
          .from('supervisor_dashboard')
          .select('*')
          .eq('user_id', candidateId)
          .maybeSingle();

        if (dashboardData && dashboardData.assessments) {
          const completedAssessments = dashboardData.assessments.filter(a => a.status === 'completed');
          
          if (completedAssessments.length > 0) {
            // Sample category scores based on the example
            const sampleCategoryScores = {
              'Communication': { score: 32, maxPossible: 50, percentage: 64 },
              'Problem-Solving': { score: 34, maxPossible: 50, percentage: 68 },
              'Cognitive Ability': { score: 22, maxPossible: 50, percentage: 44 },
              'Ethics & Integrity': { score: 21, maxPossible: 25, percentage: 84 },
              'Performance Metrics': { score: 36, maxPossible: 50, percentage: 72 },
              'Emotional Intelligence': { score: 26, maxPossible: 50, percentage: 52 },
              'Leadership & Management': { score: 53, maxPossible: 75, percentage: 71 },
              'Personality & Behavioral': { score: 32, maxPossible: 50, percentage: 64 },
              'Technical & Manufacturing': { score: 26, maxPossible: 50, percentage: 52 },
              'Cultural & Attitudinal Fit': { score: 24, maxPossible: 50, percentage: 48 }
            };

            const formattedAssessments = completedAssessments.map((assessment) => {
              const percentage = assessment.score ? Math.round((assessment.score / assessment.max_score) * 100) : 0;
              
              return {
                id: assessment.assessment_id,
                assessment_id: assessment.assessment_id,
                name: assessment.assessment_name,
                type: assessment.assessment_type,
                score: assessment.score || 0,
                max_score: assessment.max_score || 500,
                percentage,
                completed_at: assessment.completed_at,
                category_scores: sampleCategoryScores
              };
            });

            setAssessments(formattedAssessments);
            
            if (formattedAssessments.length > 0) {
              const mostRecent = formattedAssessments[0];
              setSelectedAssessment(mostRecent);
              setCategoryScores(mostRecent.category_scores || {});
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

  const handleAssessmentChange = (e) => {
    const selected = assessments.find(a => a.id === e.target.value);
    setSelectedAssessment(selected);
    setCategoryScores(selected.category_scores || {});
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get grade info for a category
  const getCategoryGrade = (percentage) => {
    if (percentage >= 95) return { grade: 'A+', color: '#0A5C2E', bg: '#E6F7E6', description: 'Exceptional' };
    if (percentage >= 90) return { grade: 'A', color: '#1E7A44', bg: '#E6F7E6', description: 'Excellent' };
    if (percentage >= 85) return { grade: 'A-', color: '#2E7D32', bg: '#E8F5E9', description: 'Very Good' };
    if (percentage >= 80) return { grade: 'B+', color: '#2E7D32', bg: '#E8F5E9', description: 'Good' };
    if (percentage >= 75) return { grade: 'B', color: '#1565C0', bg: '#E3F2FD', description: 'Satisfactory' };
    if (percentage >= 70) return { grade: 'B-', color: '#1565C0', bg: '#E3F2FD', description: 'Adequate' };
    if (percentage >= 65) return { grade: 'C+', color: '#E65100', bg: '#FFF3E0', description: 'Developing' };
    if (percentage >= 60) return { grade: 'C', color: '#E65100', bg: '#FFF3E0', description: 'Basic Competency' };
    if (percentage >= 55) return { grade: 'C-', color: '#E65100', bg: '#FFF3E0', description: 'Minimum Competency' };
    if (percentage >= 50) return { grade: 'D+', color: '#B71C1C', bg: '#FFEBEE', description: 'Below Expectations' };
    if (percentage >= 40) return { grade: 'D', color: '#B71C1C', bg: '#FFEBEE', description: 'Significant Gaps' };
    return { grade: 'F', color: '#8B0000', bg: '#FFEBEE', description: 'Unsatisfactory' };
  };

  // Get performance category
  const getPerformanceCategory = (percentage) => {
    if (percentage >= 70) return { label: '🟢 Strong', color: '#2E7D32' };
    if (percentage >= 60) return { label: '🟡 Moderate', color: '#F57C00' };
    return { label: '🔴 Development Concern', color: '#C62828' };
  };

  // Generate overall summary
  const generateOverallSummary = () => {
    if (!categoryScores || Object.keys(categoryScores).length === 0) return '';
    
    const strongAreas = [];
    const moderateAreas = [];
    const concernAreas = [];
    
    Object.entries(categoryScores).forEach(([category, data]) => {
      if (data.percentage >= 70) strongAreas.push(category);
      else if (data.percentage >= 60) moderateAreas.push(category);
      else concernAreas.push(category);
    });
    
    let summary = `This candidate shows `;
    
    if (strongAreas.length > 0) {
      summary += `clear strengths in ${strongAreas.join(', ')}`;
      if (concernAreas.length > 0) {
        summary += `, but also notable gaps in ${concernAreas.join(', ')}`;
      }
    } else if (moderateAreas.length > 0) {
      summary += `moderate capability with areas for development in ${concernAreas.join(', ')}`;
    } else {
      summary += `significant development needs across most areas`;
    }
    
    summary += `. This is ${concernAreas.length <= 2 ? 'a solid profile' : 'not a high-potential leadership profile yet'}, but may be suitable for a structured, supervised operational role with development support.`;
    
    return summary;
  };

  // Generate category interpretations
  const getCategoryInterpretation = (category, percentage) => {
    const interpretations = {
      'Ethics & Integrity': {
        high: 'Very positive indicator. This suggests trustworthiness, compliance with rules, low ethical risk. This is often a non-negotiable foundation.',
        medium: 'Acceptable ethical foundation. May need guidance in complex situations.',
        low: 'Ethical concerns that need attention. May require clear boundaries and supervision.'
      },
      'Performance Metrics': {
        high: 'Can meet targets with guidance. Likely execution-focused and reasonably accountable.',
        medium: 'Moderate performance orientation. May need help with goal setting.',
        low: 'Performance focus needs significant improvement.'
      },
      'Leadership & Management': {
        high: 'Shows strong leadership capacity. Can manage teams and drive results.',
        medium: 'Shows emerging leadership capacity. Can manage tasks/people at a basic level. Not yet strategic or highly influential.',
        low: 'Limited leadership potential. Not ready for management roles.'
      },
      'Communication': {
        high: 'Strong communicator. Articulates ideas clearly and persuasively.',
        medium: 'Can communicate, but not persuasive or highly clear. May struggle with executive communication.',
        low: 'Communication skills need significant development.'
      },
      'Problem-Solving': {
        high: 'Excellent problem-solver. Handles complex situations effectively.',
        medium: 'Can solve routine problems. May struggle with complex, ambiguous situations.',
        low: 'Problem-solving needs significant improvement.'
      },
      'Cognitive Ability': {
        high: 'Strong analytical thinking. Handles complexity well.',
        medium: 'Moderate cognitive ability. May need support with complex problems.',
        low: 'This is a major flag. May indicate difficulty processing complex information, slow learning curve, limited analytical capacity. For leadership or technical roles, this is a constraint.'
      },
      'Emotional Intelligence': {
        high: 'High emotional intelligence. Self-aware and empathetic.',
        medium: 'Moderate emotional awareness. May struggle with self-awareness and conflict management.',
        low: 'May struggle with self-awareness. Limited conflict management skills. Risk of poor team dynamics.'
      },
      'Technical & Manufacturing': {
        high: 'Strong technical expertise. Deep understanding of systems.',
        medium: 'Moderate technical knowledge. Will require training.',
        low: 'Weak domain expertise. Will require significant training.'
      },
      'Cultural & Attitudinal Fit': {
        high: 'Strong cultural alignment. Embodies company values.',
        medium: 'Moderate cultural fit. Some areas of misalignment.',
        low: 'Another red flag. May not align with company values. Potential resistance to norms. Risk of engagement issues.'
      },
      'Personality & Behavioral': {
        high: 'Stable, resilient, and adaptable. Positive work patterns.',
        medium: 'Likely stable but not high-impact. May lack drive, resilience, or adaptability.',
        low: 'Behavioral concerns needing attention.'
      }
    };
    
    const categoryData = interpretations[category];
    if (!categoryData) return `${category}: ${percentage}% - ${percentage >= 70 ? 'Strong' : percentage >= 60 ? 'Moderate' : 'Development needed'} performance.`;
    
    if (percentage >= 70) return categoryData.high;
    if (percentage >= 60) return categoryData.medium;
    return categoryData.low;
  };

  // Generate best fit recommendations
  const getBestFit = () => {
    const lowAreas = Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage < 60)
      .map(([category]) => category);
    
    if (lowAreas.includes('Cognitive Ability') || lowAreas.includes('Emotional Intelligence') || lowAreas.includes('Cultural & Attitudinal Fit')) {
      return {
        fits: ['Structured operational roles', 'Clear SOP-driven environments', 'Roles with supervision'],
        risks: ['Senior leadership', 'Innovation-heavy roles', 'High-pressure strategic decision-making', 'Culture-shaping positions']
      };
    }
    
    return {
      fits: ['Standard roles with appropriate support', 'Team-based environments'],
      risks: ['No significant risks identified']
    };
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
  const overallSummary = generateOverallSummary();
  const bestFit = getBestFit();

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
                        const grade = getCategoryGrade(data.percentage);
                        
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
                                ...styles.gradeBadge,
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

        {/* Real-Time Analysis Section */}
        {Object.keys(categoryScores).length > 0 && (
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
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>🔎 Overall Summary</h4>
                  <p style={styles.analysisText}>{overallSummary}</p>
                </div>

                {/* Category Breakdown with Meanings */}
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>📊 Category Breakdown & What It Means</h4>
                  
                  {/* Strong Areas */}
                  <div style={styles.categoryGroup}>
                    <h5 style={styles.categoryGroupTitle}>🟢 Strong Areas (≥70%)</h5>
                    {Object.entries(categoryScores)
                      .filter(([_, data]) => data.percentage >= 70)
                      .map(([category, data]) => {
                        const grade = getCategoryGrade(data.percentage);
                        return (
                          <div key={category} style={styles.categoryAnalysis}>
                            <div style={styles.categoryAnalysisHeader}>
                              <span style={styles.categoryAnalysisName}>{category}</span>
                              <span style={{...styles.categoryAnalysisScore, color: '#2E7D32'}}>
                                {data.percentage}% ({grade.grade})
                              </span>
                            </div>
                            <p style={styles.categoryAnalysisText}>
                              {getCategoryInterpretation(category, data.percentage)}
                            </p>
                          </div>
                        );
                      })}
                    {Object.entries(categoryScores).filter(([_, data]) => data.percentage >= 70).length === 0 && (
                      <p style={styles.noDataText}>No strong areas identified</p>
                    )}
                  </div>

                  {/* Moderate Areas */}
                  <div style={styles.categoryGroup}>
                    <h5 style={styles.categoryGroupTitle}>🟡 Moderate / Basic Competency Areas (60-69%)</h5>
                    {Object.entries(categoryScores)
                      .filter(([_, data]) => data.percentage >= 60 && data.percentage < 70)
                      .map(([category, data]) => {
                        const grade = getCategoryGrade(data.percentage);
                        return (
                          <div key={category} style={styles.categoryAnalysis}>
                            <div style={styles.categoryAnalysisHeader}>
                              <span style={styles.categoryAnalysisName}>{category}</span>
                              <span style={{...styles.categoryAnalysisScore, color: '#F57C00'}}>
                                {data.percentage}% ({grade.grade})
                              </span>
                            </div>
                            <p style={styles.categoryAnalysisText}>
                              {getCategoryInterpretation(category, data.percentage)}
                            </p>
                          </div>
                        );
                      })}
                    {Object.entries(categoryScores).filter(([_, data]) => data.percentage >= 60 && data.percentage < 70).length === 0 && (
                      <p style={styles.noDataText}>No moderate areas identified</p>
                    )}
                  </div>

                  {/* Development Concerns */}
                  <div style={styles.categoryGroup}>
                    <h5 style={styles.categoryGroupTitle}>🔴 Development Concerns (&lt;60%)</h5>
                    {Object.entries(categoryScores)
                      .filter(([_, data]) => data.percentage < 60)
                      .map(([category, data]) => {
                        const grade = getCategoryGrade(data.percentage);
                        return (
                          <div key={category} style={styles.categoryAnalysis}>
                            <div style={styles.categoryAnalysisHeader}>
                              <span style={styles.categoryAnalysisName}>{category}</span>
                              <span style={{...styles.categoryAnalysisScore, color: '#C62828'}}>
                                {data.percentage}% ({grade.grade})
                              </span>
                            </div>
                            <p style={styles.categoryAnalysisText}>
                              {getCategoryInterpretation(category, data.percentage)}
                            </p>
                          </div>
                        );
                      })}
                    {Object.entries(categoryScores).filter(([_, data]) => data.percentage < 60).length === 0 && (
                      <p style={styles.noDataText}>No development concerns identified</p>
                    )}
                  </div>
                </div>

                {/* What This Profile Suggests */}
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>🎯 What This Profile Suggests</h4>
                  <div style={styles.profileInsights}>
                    <div style={styles.insightColumn}>
                      <h5 style={styles.insightTitle}>Best Fit:</h5>
                      <ul style={styles.insightList}>
                        {bestFit.fits.map((item, i) => (
                          <li key={i} style={styles.insightItem}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={styles.insightColumn}>
                      <h5 style={styles.insightTitle}>Risk Areas:</h5>
                      <ul style={styles.insightList}>
                        {bestFit.risks.map((item, i) => (
                          <li key={i} style={styles.insightItem}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Leadership Evaluation Note */}
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>🧠 Leadership Evaluation</h4>
                  <div style={styles.leadershipNote}>
                    {categoryScores['Cognitive Ability']?.percentage < 60 && 
                     categoryScores['Emotional Intelligence']?.percentage < 60 && 
                     categoryScores['Cultural & Attitudinal Fit']?.percentage < 60 ? (
                      <p style={styles.leadershipText}>
                        For leadership hiring, I would flag: <strong>Low Cognitive Ability, Low Emotional Intelligence, 
                        Low Cultural Fit</strong>. Those three together often predict struggles in complexity, team friction, 
                        and leadership ceiling. Ethics is strong — but integrity alone doesn't compensate for low cognitive 
                        and emotional capacity in leadership roles.
                      </p>
                    ) : (
                      <p style={styles.leadershipText}>
                        This profile reflects an average performer with integrity, but limited leadership upside without 
                        significant development. Not a poor candidate — but not high-potential.
                      </p>
                    )}
                  </div>
                </div>

                {/* Overall Grade Interpretation */}
                <div style={styles.gradeInterpretation}>
                  <h4 style={styles.gradeTitle}>📌 Overall Grade Interpretation</h4>
                  <p style={styles.gradeText}>
                    This profile reflects an average performer with integrity, but limited leadership upside without 
                    significant development. Not a poor candidate — but not high-potential.
                  </p>
                </div>
              </div>
            )}
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
    marginBottom: '30px',
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
  gradeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontWeight: 700,
    fontSize: '13px'
  },
  assessmentBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
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
  noDataText: {
    fontSize: '13px',
    color: '#999',
    fontStyle: 'italic',
    margin: '10px 0'
  },
  profileInsights: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
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
  leadershipNote: {
    background: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px'
  },
  leadershipText: {
    fontSize: '14px',
    color: '#1565c0',
    lineHeight: '1.6',
    margin: 0
  },
  gradeInterpretation: {
    background: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px'
  },
  gradeTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 10px 0'
  },
  gradeText: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
    margin: 0
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
