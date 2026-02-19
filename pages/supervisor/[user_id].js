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

  // Expressive grade definitions with personality
  const gradeScale = [
    { 
      grade: 'A+', min: 95, color: '#0A5C2E', bg: '#E6F7E6', 
      description: '🌟 Exceptional! Demonstrates mastery beyond expectations. A true standout performer.',
      shortDesc: 'Exceptional performance'
    },
    { 
      grade: 'A', min: 90, color: '#1E7A44', bg: '#E6F7E6', 
      description: '⭐ Excellent! Shows deep understanding and consistent high-quality performance.',
      shortDesc: 'Excellent performance'
    },
    { 
      grade: 'A-', min: 85, color: '#2E7D32', bg: '#E8F5E9', 
      description: '📈 Very Good! Strong capabilities with minor areas for refinement.',
      shortDesc: 'Very good performance'
    },
    { 
      grade: 'B+', min: 80, color: '#2E7D32', bg: '#E8F5E9', 
      description: '👍 Good! Solid performance with clear strengths and growth opportunities.',
      shortDesc: 'Good performance'
    },
    { 
      grade: 'B', min: 75, color: '#1565C0', bg: '#E3F2FD', 
      description: '📊 Satisfactory. Meets expectations with room to grow.',
      shortDesc: 'Satisfactory performance'
    },
    { 
      grade: 'B-', min: 70, color: '#1565C0', bg: '#E3F2FD', 
      description: '📝 Adequate. Foundation is solid; focused development will yield results.',
      shortDesc: 'Adequate performance'
    },
    { 
      grade: 'C+', min: 65, color: '#E65100', bg: '#FFF3E0', 
      description: '🌱 Developing. Shows potential; targeted guidance will accelerate growth.',
      shortDesc: 'Developing'
    },
    { 
      grade: 'C', min: 60, color: '#E65100', bg: '#FFF3E0', 
      description: '🌿 Building competence. Core understanding present; needs practical application.',
      shortDesc: 'Basic competency'
    },
    { 
      grade: 'C-', min: 55, color: '#E65100', bg: '#FFF3E0', 
      description: '🌱 Emerging. Foundational knowledge established; requires structured support.',
      shortDesc: 'Minimum competency'
    },
    { 
      grade: 'D+', min: 50, color: '#B71C1C', bg: '#FFEBEE', 
      description: '⚠️ Below expectations. Significant opportunity for development.',
      shortDesc: 'Below expectations'
    },
    { 
      grade: 'D', min: 40, color: '#B71C1C', bg: '#FFEBEE', 
      description: '🔧 Needs improvement. Critical areas require attention and support.',
      shortDesc: 'Significant gaps'
    },
    { 
      grade: 'F', min: 0, color: '#8B0000', bg: '#FFEBEE', 
      description: '🚨 Intensive development needed. Requires structured intervention and coaching.',
      shortDesc: 'Unsatisfactory'
    }
  ];

  const getGradeInfo = (percentage) => {
    return gradeScale.find(g => percentage >= g.min) || gradeScale[gradeScale.length - 1];
  };

  const getOverallRating = (percentage) => {
    if (percentage >= 80) return {
      title: 'Strong Performer',
      message: 'This candidate demonstrates strong capabilities and is ready for increased responsibility.',
      icon: '🌟'
    };
    if (percentage >= 60) return {
      title: 'Competent Performer',
      message: 'This candidate shows solid foundational skills with clear potential for growth.',
      icon: '📈'
    };
    if (percentage >= 40) return {
      title: 'Developing Performer',
      message: 'This candidate has foundational knowledge but requires structured development.',
      icon: '🌱'
    };
    return {
      title: 'Needs Development',
      message: 'This candidate needs significant development and intensive support.',
      icon: '🎯'
    };
  };

  // Generate adaptive comments for strengths and weaknesses
  const getStrengthComment = (area, percentage) => {
    const comments = [
      `Demonstrates exceptional capability in ${area} - a true asset to the team.`,
      `Shows strong mastery of ${area} concepts and applies them effectively.`,
      `Exhibits natural aptitude for ${area} that can be leveraged for team success.`,
      `Consistently performs well in ${area} - a reliable strength to build upon.`,
      `Has developed robust ${area} skills that contribute significantly to performance.`
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  };

  const getWeaknessComment = (area, percentage) => {
    const comments = [
      `Would benefit from focused development in ${area} to build confidence and competence.`,
      `${area} presents an opportunity for growth with targeted training and practice.`,
      `Additional support in ${area} will help unlock greater potential.`,
      `Developing stronger ${area} skills should be a priority in the coming months.`,
      `With structured guidance in ${area}, significant improvement is achievable.`
    ];
    return comments[Math.floor(Math.random() * comments.length)];
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
        <p>Loading candidate report...</p>
      </div>
    );
  }

  if (!candidate || !assessments.length) {
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
  const overallRating = getOverallRating(current.percentage);

  // Calculate strengths and weaknesses with expressive comments
  const enhancedStrengths = strengths.map(s => ({
    area: typeof s === 'string' ? s : s.area || s,
    percentage: typeof s === 'object' && s.percentage ? s.percentage : 
                categoryScores[typeof s === 'string' ? s : s.area || s]?.percentage,
    comment: getStrengthComment(
      typeof s === 'string' ? s : s.area || s,
      typeof s === 'object' && s.percentage ? s.percentage : 
      categoryScores[typeof s === 'string' ? s : s.area || s]?.percentage
    )
  }));

  const enhancedWeaknesses = weaknesses.map(w => ({
    area: typeof w === 'string' ? w : w.area || w,
    percentage: typeof w === 'object' && w.percentage ? w.percentage : 
                categoryScores[typeof w === 'string' ? w : w.area || w]?.percentage,
    comment: getWeaknessComment(
      typeof w === 'string' ? w : w.area || w,
      typeof w === 'object' && w.percentage ? w.percentage : 
      categoryScores[typeof w === 'string' ? w : w.area || w]?.percentage
    )
  }));

  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header with gradient */}
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
                    {a.name} - {new Date(a.completed_at).toLocaleDateString()}
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

        {/* Executive Summary with personality */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <span style={styles.summaryIcon}>📋</span>
            <h2 style={styles.summaryTitle}>Executive Summary</h2>
          </div>
          <p style={styles.summaryText}>
            {executiveSummary || `${candidate.full_name} achieved an overall score of ${current.score}/${current.max_score} (${current.percentage}%), earning a grade of ${overallGrade.grade}. ${overallRating.message} Their performance shows ${current.percentage >= 70 ? 'strong capabilities' : 'development opportunities'} across ${Object.keys(categoryScores).length} assessment categories.`}
          </p>
          <div style={{...styles.ratingBadge, background: overallGrade.bg, color: overallGrade.color}}>
            <span style={styles.ratingIcon}>{overallRating.icon}</span>
            <span><strong>Overall Assessment:</strong> {overallRating.title} • Grade {overallGrade.grade}</span>
          </div>
        </div>

        {/* Category Performance Table */}
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
                {Object.entries(categoryScores).map(([category, data]) => {
                  const grade = getGradeInfo(data.percentage);
                  return (
                    <tr key={category}>
                      <td style={styles.td}><strong>{category}</strong></td>
                      <td style={styles.td}>{data.score}/{data.maxPossible}</td>
                      <td style={styles.td}>{data.percentage}%</td>
                      <td style={{...styles.td, color: grade.color, fontWeight: 700}}>{grade.grade}</td>
                      <td style={styles.td}>{grade.shortDesc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strengths & Weaknesses with expressive comments */}
        <div style={styles.grid2}>
          {/* Strengths Card */}
          <div style={styles.strengthCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #2E7D32, #1B5E20)'}}>
              <span style={styles.cardIcon}>🌟</span>
              <h3 style={styles.cardHeaderTitle}>Key Strengths</h3>
            </div>
            <div style={styles.cardContent}>
              {enhancedStrengths.length > 0 ? (
                enhancedStrengths.map((s, i) => (
                  <div key={i} style={styles.strengthItem}>
                    <div style={styles.strengthTitle}>
                      <span style={styles.strengthIcon}>✓</span>
                      <span style={styles.strengthName}>{s.area}</span>
                      {s.percentage && (
                        <span style={{...styles.percentageBadge, background: '#E8F5E9', color: '#2E7D32'}}>
                          {s.percentage}%
                        </span>
                      )}
                    </div>
                    <p style={styles.strengthComment}>{s.comment}</p>
                  </div>
                ))
              ) : (
                <p style={styles.emptyText}>No specific strengths identified</p>
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
              {enhancedWeaknesses.length > 0 ? (
                enhancedWeaknesses.map((w, i) => (
                  <div key={i} style={styles.weaknessItem}>
                    <div style={styles.weaknessTitle}>
                      <span style={styles.weaknessIcon}>!</span>
                      <span style={styles.weaknessName}>{w.area}</span>
                      {w.percentage && (
                        <span style={{...styles.percentageBadge, background: '#FFEBEE', color: '#C62828'}}>
                          {w.percentage}%
                        </span>
                      )}
                    </div>
                    <p style={styles.weaknessComment}>{w.comment}</p>
                  </div>
                ))
              ) : (
                <p style={styles.emptyText}>No development areas identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations Card */}
        {recommendations.length > 0 && (
          <div style={styles.recommendationsCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #1565C0, #0D47A1)'}}>
              <span style={styles.cardIcon}>💡</span>
              <h3 style={styles.cardHeaderTitle}>Recommendations</h3>
            </div>
            <div style={styles.cardContent}>
              <ul style={styles.recommendationsList}>
                {recommendations.map((rec, i) => (
                  <li key={i} style={styles.recommendationItem}>
                    <span style={styles.recommendationBullet}>→</span>
                    <span>{typeof rec === 'string' ? rec : rec.message || rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Development Plan */}
        {developmentPlan && Object.keys(developmentPlan).length > 0 && (
          <div style={styles.planCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #6A1B9A, #4A0072)'}}>
              <span style={styles.cardIcon}>📅</span>
              <h3 style={styles.cardHeaderTitle}>Development Action Plan</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.planGrid}>
                {developmentPlan.immediate && developmentPlan.immediate.length > 0 && (
                  <div style={styles.planPhase}>
                    <h4 style={styles.phaseTitle}>⚡ Immediate (0-30 days)</h4>
                    <ul style={styles.planList}>
                      {developmentPlan.immediate.map((item, i) => (
                        <li key={i} style={styles.planListItem}>
                          <strong>{item.area}:</strong> {item.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {developmentPlan.shortTerm && developmentPlan.shortTerm.length > 0 && (
                  <div style={styles.planPhase}>
                    <h4 style={styles.phaseTitle}>📈 Short-term (30-60 days)</h4>
                    <ul style={styles.planList}>
                      {developmentPlan.shortTerm.map((item, i) => (
                        <li key={i} style={styles.planListItem}>
                          <strong>{item.area}:</strong> {item.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {developmentPlan.longTerm && developmentPlan.longTerm.length > 0 && (
                  <div style={styles.planPhase}>
                    <h4 style={styles.phaseTitle}>🚀 Long-term (60-90+ days)</h4>
                    <ul style={styles.planList}>
                      {developmentPlan.longTerm.map((item, i) => (
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
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    padding: '15px 12px',
    background: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: 600,
    color: '#333'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f0f0f0',
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
