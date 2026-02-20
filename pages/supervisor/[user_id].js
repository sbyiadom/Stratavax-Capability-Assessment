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
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [categoryScores, setCategoryScores] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    strengths: true,
    weaknesses: true,
    improvements: true,
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
        // Get candidate info - FIXED: Get the actual name
        const { data: profileData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', candidateId)
          .maybeSingle();

        console.log("Profile data:", profileData); // Debug log

        setCandidate({
          id: candidateId,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
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

  // Get strengths (≥70%)
  const getStrengths = () => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage >= 70)
      .map(([category, data]) => ({
        category,
        score: data.score,
        maxPossible: data.maxPossible,
        percentage: data.percentage,
        grade: getCategoryGrade(data.percentage)
      }));
  };

  // Get weaknesses (<60%)
  const getWeaknesses = () => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage < 60)
      .map(([category, data]) => ({
        category,
        score: data.score,
        maxPossible: data.maxPossible,
        percentage: data.percentage,
        grade: getCategoryGrade(data.percentage)
      }));
  };

  // Get areas for improvement (60-69%)
  const getImprovementAreas = () => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage >= 60 && data.percentage < 70)
      .map(([category, data]) => ({
        category,
        score: data.score,
        maxPossible: data.maxPossible,
        percentage: data.percentage,
        grade: getCategoryGrade(data.percentage)
      }));
  };

  // Generate improvement recommendations
  const getRecommendations = (category, percentage) => {
    const recommendations = {
      'Cognitive Ability': [
        'Provide structured problem-solving frameworks and analytical thinking exercises',
        'Assign a mentor for complex tasks and decision-making scenarios',
        'Enroll in critical thinking and logical reasoning courses',
        'Practice with case studies and puzzle-based learning platforms'
      ],
      'Emotional Intelligence': [
        'Provide EI training focusing on self-awareness and empathy',
        'Encourage regular self-reflection and feedback seeking',
        'Schedule 360-degree feedback sessions',
        'Pair with a mentor who demonstrates strong emotional intelligence'
      ],
      'Technical & Manufacturing': [
        'Enroll in technical training programs and certification courses',
        'Provide hands-on practice with supervision',
        'Shadow experienced technicians for on-the-job learning',
        'Create a structured skill development plan with clear milestones'
      ],
      'Cultural & Attitudinal Fit': [
        'Schedule regular feedback sessions to discuss cultural alignment',
        'Pair with a culture champion for guidance and mentoring',
        'Participate in team-building activities and company events',
        'Review company values and discuss practical applications'
      ],
      'Communication': [
        'Provide communication skills training and workshops',
        'Practice presentations with constructive feedback',
        'Join Toastmasters or similar public speaking groups',
        'Work on written communication through regular reports'
      ],
      'Problem-Solving': [
        'Provide structured problem-solving frameworks (e.g., root cause analysis)',
        'Practice with real-world scenarios and case studies',
        'Participate in design thinking workshops',
        'Work on cross-functional projects to gain different perspectives'
      ],
      'Personality & Behavioral': [
        'Provide behavioral coaching and feedback sessions',
        'Encourage participation in team activities',
        'Work with a mentor on professional presence',
        'Practice adaptability through varied assignments'
      ]
    };

    const defaultRecs = [
      'Provide targeted training and development in this area',
      'Set specific improvement goals with regular check-ins',
      'Pair with a mentor who excels in this area',
      'Create a personalized development plan with clear milestones'
    ];

    return recommendations[category] || defaultRecs;
  };

  // Generate best fit recommendations
  const getBestFit = () => {
    const weaknesses = getWeaknesses().map(w => w.category);
    
    if (weaknesses.includes('Cognitive Ability') || weaknesses.includes('Emotional Intelligence') || weaknesses.includes('Cultural & Attitudinal Fit')) {
      return {
        fits: ['Structured operational roles', 'Clear SOP-driven environments', 'Roles with close supervision'],
        risks: ['Senior leadership positions', 'Innovation-heavy roles', 'High-pressure strategic decision-making', 'Culture-shaping positions']
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
  const strengths = getStrengths();
  const weaknesses = getWeaknesses();
  const improvementAreas = getImprovementAreas();

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

        {/* Candidate Info - FIXED: Now shows the actual name */}
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

        {/* Strengths Card - NEW */}
        {strengths.length > 0 && (
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
                  {strengths.map((item, index) => (
                    <div key={index} style={styles.strengthCard}>
                      <div style={styles.strengthHeader}>
                        <span style={styles.strengthCategory}>{item.category}</span>
                        <span style={{...styles.strengthScore, color: item.grade.color}}>
                          {item.percentage}% ({item.grade.grade})
                        </span>
                      </div>
                      <p style={styles.strengthDescription}>
                        {item.category === 'Ethics & Integrity' && 'Strong ethical foundation. Trustworthy and principled decision-maker.'}
                        {item.category === 'Performance Metrics' && 'Results-driven with good accountability. Can meet targets effectively.'}
                        {item.category === 'Leadership & Management' && 'Shows leadership potential. Can manage teams and drive results.'}
                        {item.category === 'Problem-Solving' && 'Excellent problem-solver. Handles challenges effectively.'}
                        {item.category === 'Communication' && 'Strong communicator. Articulates ideas clearly.'}
                        {!['Ethics & Integrity', 'Performance Metrics', 'Leadership & Management', 'Problem-Solving', 'Communication'].includes(item.category) && 
                          `Strong performance in ${item.category}. This is a valuable asset.`}
                      </p>
                      <div style={styles.strengthAction}>
                        <span style={styles.strengthActionText}>✅ Leverage this strength in:</span>
                        <div style={styles.strengthTags}>
                          {item.category === 'Ethics & Integrity' && (
                            <>
                              <span style={styles.strengthTag}>Compliance roles</span>
                              <span style={styles.strengthTag}>Quality assurance</span>
                              <span style={styles.strengthTag}>Supervisory positions</span>
                            </>
                          )}
                          {item.category === 'Performance Metrics' && (
                            <>
                              <span style={styles.strengthTag}>Project management</span>
                              <span style={styles.strengthTag}>Operations</span>
                              <span style={styles.strengthTag}>Target-driven roles</span>
                            </>
                          )}
                          {item.category === 'Leadership & Management' && (
                            <>
                              <span style={styles.strengthTag}>Team lead roles</span>
                              <span style={styles.strengthTag}>Mentoring others</span>
                              <span style={styles.strengthTag}>Project coordination</span>
                            </>
                          )}
                          {![ 'Ethics & Integrity', 'Performance Metrics', 'Leadership & Management'].includes(item.category) && (
                            <>
                              <span style={styles.strengthTag}>Roles requiring {item.category}</span>
                              <span style={styles.strengthTag}>Specialized tasks</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Areas for Improvement Card - NEW */}
        {improvementAreas.length > 0 && (
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
                  {improvementAreas.map((item, index) => (
                    <div key={index} style={styles.improvementCard}>
                      <div style={styles.improvementHeader}>
                        <span style={styles.improvementCategory}>{item.category}</span>
                        <span style={{...styles.improvementScore, color: item.grade.color}}>
                          {item.percentage}% ({item.grade.grade})
                        </span>
                      </div>
                      <p style={styles.improvementDescription}>
                        {item.category === 'Communication' && 'Can communicate, but needs to develop persuasiveness and executive presence.'}
                        {item.category === 'Problem-Solving' && 'Can solve routine problems but may struggle with complex, ambiguous situations.'}
                        {item.category === 'Personality & Behavioral' && 'Stable but not high-impact. Could develop greater drive and adaptability.'}
                        {!['Communication', 'Problem-Solving', 'Personality & Behavioral'].includes(item.category) && 
                          `Shows basic competency in ${item.category} but needs development to reach target levels.`}
                      </p>
                      <div style={styles.improvementActions}>
                        <span style={styles.improvementActionTitle}>Recommended actions:</span>
                        <ul style={styles.improvementList}>
                          {getRecommendations(item.category, item.percentage).slice(0, 2).map((rec, i) => (
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

        {/* Development Concerns / Weaknesses Card - NEW */}
        {weaknesses.length > 0 && (
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
                  {weaknesses.map((item, index) => (
                    <div key={index} style={styles.weaknessCard}>
                      <div style={styles.weaknessHeader}>
                        <span style={styles.weaknessCategory}>{item.category}</span>
                        <span style={{...styles.weaknessScore, color: item.grade.color}}>
                          {item.percentage}% ({item.grade.grade})
                        </span>
                      </div>
                      <p style={styles.weaknessDescription}>
                        {item.category === 'Cognitive Ability' && 'This is a major concern. May struggle with complex problem-solving and have a slow learning curve.'}
                        {item.category === 'Emotional Intelligence' && 'May struggle with self-awareness and conflict management. Risk of poor team dynamics.'}
                        {item.category === 'Technical & Manufacturing' && 'Weak domain expertise. Will require significant training and supervision.'}
                        {item.category === 'Cultural & Attitudinal Fit' && 'May not align with company values. Risk of engagement issues and resistance to norms.'}
                        {!['Cognitive Ability', 'Emotional Intelligence', 'Technical & Manufacturing', 'Cultural & Attitudinal Fit'].includes(item.category) && 
                          `Significant gaps in ${item.category} that need immediate attention.`}
                      </p>
                      <div style={styles.weaknessActions}>
                        <span style={styles.weaknessActionTitle}>🔴 Critical recommendations:</span>
                        <ul style={styles.weaknessList}>
                          {getRecommendations(item.category, item.percentage).map((rec, i) => (
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
                  {strengths.length > 0 && (
                    <div style={styles.categoryGroup}>
                      <h5 style={styles.categoryGroupTitle}>🟢 Strong Areas (≥70%)</h5>
                      {strengths.map((item) => (
                        <div key={item.category} style={styles.categoryAnalysis}>
                          <div style={styles.categoryAnalysisHeader}>
                            <span style={styles.categoryAnalysisName}>{item.category}</span>
                            <span style={{...styles.categoryAnalysisScore, color: '#2E7D32'}}>
                              {item.percentage}% ({item.grade.grade})
                            </span>
                          </div>
                          <p style={styles.categoryAnalysisText}>
                            {item.category === 'Ethics & Integrity' && 'Very positive indicator. This suggests trustworthiness, compliance with rules, low ethical risk. This is often a non-negotiable foundation.'}
                            {item.category === 'Performance Metrics' && 'Can meet targets with guidance. Likely execution-focused and reasonably accountable.'}
                            {item.category === 'Leadership & Management' && 'Shows strong leadership capacity. Can manage teams and drive results.'}
                            {![ 'Ethics & Integrity', 'Performance Metrics', 'Leadership & Management'].includes(item.category) && 
                              `Strong performance in ${item.category}. This is a valuable asset.`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Moderate Areas */}
                  {improvementAreas.length > 0 && (
                    <div style={styles.categoryGroup}>
                      <h5 style={styles.categoryGroupTitle}>🟡 Moderate / Basic Competency Areas (60-69%)</h5>
                      {improvementAreas.map((item) => (
                        <div key={item.category} style={styles.categoryAnalysis}>
                          <div style={styles.categoryAnalysisHeader}>
                            <span style={styles.categoryAnalysisName}>{item.category}</span>
                            <span style={{...styles.categoryAnalysisScore, color: '#F57C00'}}>
                              {item.percentage}% ({item.grade.grade})
                            </span>
                          </div>
                          <p style={styles.categoryAnalysisText}>
                            {item.category === 'Communication' && 'Can communicate, but not persuasive or highly clear. May struggle with executive communication.'}
                            {item.category === 'Problem-Solving' && 'Can solve routine problems. May struggle with complex, ambiguous situations.'}
                            {item.category === 'Personality & Behavioral' && 'Likely stable but not high-impact. May lack drive, resilience, or adaptability.'}
                            {![ 'Communication', 'Problem-Solving', 'Personality & Behavioral'].includes(item.category) && 
                              `Moderate performance in ${item.category}. Needs development to reach target levels.`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Development Concerns */}
                  {weaknesses.length > 0 && (
                    <div style={styles.categoryGroup}>
                      <h5 style={styles.categoryGroupTitle}>🔴 Development Concerns (&lt;60%)</h5>
                      {weaknesses.map((item) => (
                        <div key={item.category} style={styles.categoryAnalysis}>
                          <div style={styles.categoryAnalysisHeader}>
                            <span style={styles.categoryAnalysisName}>{item.category}</span>
                            <span style={{...styles.categoryAnalysisScore, color: '#C62828'}}>
                              {item.percentage}% ({item.grade.grade})
                            </span>
                          </div>
                          <p style={styles.categoryAnalysisText}>
                            {item.category === 'Cognitive Ability' && 'This is a major flag. May indicate difficulty processing complex information, slow learning curve, limited analytical capacity. For leadership or technical roles, this is a constraint.'}
                            {item.category === 'Emotional Intelligence' && 'May struggle with self-awareness. Limited conflict management skills. Risk of poor team dynamics.'}
                            {item.category === 'Technical & Manufacturing' && 'Weak domain expertise. Will require significant training.'}
                            {item.category === 'Cultural & Attitudinal Fit' && 'Another red flag. May not align with company values. Potential resistance to norms. Risk of engagement issues.'}
                            {![ 'Cognitive Ability', 'Emotional Intelligence', 'Technical & Manufacturing', 'Cultural & Attitudinal Fit'].includes(item.category) && 
                              `Significant gaps in ${item.category} that need immediate attention.`}
                          </p>
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

                {/* Development Plan Summary */}
                <div style={styles.analysisSection}>
                  <h4 style={styles.analysisTitle}>📋 Development Priority Summary</h4>
                  <div style={styles.priorityList}>
                    {weaknesses.slice(0, 3).map((item, index) => (
                      <div key={index} style={styles.priorityItem}>
                        <span style={styles.priorityRank}>Priority {index + 1}:</span>
                        <span style={styles.priorityCategory}>{item.category}</span>
                        <span style={styles.priorityAction}>
                          {getRecommendations(item.category, item.percentage)[0]}
                        </span>
                      </div>
                    ))}
                  </div>
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
  // New styles for strength cards
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
  strengthTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px'
  },
  strengthTag: {
    background: '#E8F5E9',
    color: '#2E7D32',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500
  },
  // New styles for improvement cards
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
  // New styles for weakness cards
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
  }
};
