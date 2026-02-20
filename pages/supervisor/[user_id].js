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
import { generateUniversalInterpretation } from "../../utils/categoryMapper";

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
  const [professionalInterpretation, setProfessionalInterpretation] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    categories: true,
    interpretation: true,
    recommendations: true
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
        // FIRST: Try to get detailed data from assessment_results
        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', candidateId)
          .order('completed_at', { ascending: false });

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

        if (resultsData && resultsData.length > 0) {
          // We have detailed results with category scores
          const formattedAssessments = resultsData.map(result => {
            const maxScore = result.max_score || 500;
            const percentage = result.total_score ? Math.round((result.total_score / maxScore) * 100) : 0;
            
            return {
              id: result.id,
              assessment_id: result.assessment_id,
              name: `Assessment ${result.assessment_id?.substring(0, 8) || ''}`,
              type: result.assessment_type || 'general',
              score: result.total_score || 0,
              max_score: maxScore,
              percentage,
              completed_at: result.completed_at,
              category_scores: result.category_scores || {},
              strengths: result.strengths || [],
              weaknesses: result.weaknesses || [],
              recommendations: result.recommendations || [],
              development_plan: result.development_plan || {},
              interpretations: result.interpretations || {},
              executive_summary: result.interpretations?.summary || result.interpretations?.executiveSummary || '',
              overall_profile: result.interpretations?.overallProfile || ''
            };
          });

          setAssessments(formattedAssessments);
          
          if (formattedAssessments.length > 0) {
            const mostRecent = formattedAssessments[0];
            setSelectedAssessment(mostRecent);
            setCategoryScores(mostRecent.category_scores || {});
            setStrengths(mostRecent.strengths || []);
            setWeaknesses(mostRecent.weaknesses || []);
            setRecommendations(mostRecent.recommendations || []);
            setDevelopmentPlan(mostRecent.development_plan || {});
            setInterpretations(mostRecent.interpretations || {});
            setExecutiveSummary(mostRecent.executive_summary || '');
            setAssessmentType(mostRecent.type);
          }
          
          setLoading(false);
          return;
        }

        // SECOND: Try to get from candidate_assessments
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
          .eq('user_id', candidateId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        if (candidateAssessments && candidateAssessments.length > 0) {
          const formattedAssessments = candidateAssessments.map(assessment => {
            const maxScore = 500;
            const percentage = assessment.score ? Math.round((assessment.score / maxScore) * 100) : 0;
            const type = assessment.assessments?.assessment_type?.code || 'general';
            
            const categoryScores = {
              'Overall Performance': {
                score: assessment.score || 0,
                maxPossible: maxScore,
                percentage: percentage,
                total: assessment.score || 0
              }
            };
            
            const gradeInfo = getGradeInfo(percentage);
            const rating = getOverallRating(percentage, [], [], type);
            
            const strengths = percentage >= 70 ? ['Overall Performance'] : [];
            const weaknesses = percentage < 70 ? ['Overall Performance'] : [];
            
            const strengthsForDb = strengths.map(s => `${s} (${percentage}%)`);
            const weaknessesForDb = weaknesses.map(w => `${w} (${percentage}%)`);
            
            const executiveSummary = `${profileData?.full_name || 'Candidate'} completed the assessment with a score of ${assessment.score}/${maxScore} (${percentage}%). ${rating.message}`;
            
            return {
              id: assessment.id,
              assessment_id: assessment.assessment_id,
              name: assessment.assessments?.title || 'Assessment',
              type,
              score: assessment.score || 0,
              max_score: maxScore,
              percentage,
              completed_at: assessment.completed_at,
              category_scores: categoryScores,
              strengths: strengthsForDb,
              weaknesses: weaknessesForDb,
              recommendations: [],
              development_plan: {},
              interpretations: {
                classification: gradeInfo.description,
                summary: executiveSummary,
                overallProfile: rating.message,
                strengths: strengthsForDb,
                weaknesses: weaknessesForDb
              },
              executive_summary: executiveSummary,
              overall_profile: rating.message
            };
          });

          setAssessments(formattedAssessments);
          
          if (formattedAssessments.length > 0) {
            const mostRecent = formattedAssessments[0];
            setSelectedAssessment(mostRecent);
            setCategoryScores(mostRecent.category_scores || {});
            setStrengths(mostRecent.strengths || []);
            setWeaknesses(mostRecent.weaknesses || []);
            setExecutiveSummary(mostRecent.executive_summary || '');
            setAssessmentType(mostRecent.type);
          }
          
          setLoading(false);
          return;
        }

        // THIRD: Fallback to supervisor_dashboard
        const { data: dashboardData } = await supabase
          .from('supervisor_dashboard')
          .select('*')
          .eq('user_id', candidateId)
          .maybeSingle();

        if (dashboardData && dashboardData.assessments) {
          const completedAssessments = dashboardData.assessments.filter(a => a.status === 'completed');
          
          if (completedAssessments.length > 0) {
            const formattedAssessments = completedAssessments.map((assessment) => {
              const percentage = assessment.score ? Math.round((assessment.score / assessment.max_score) * 100) : 0;
              const gradeInfo = getGradeInfo(percentage);
              const rating = getOverallRating(percentage, [], [], assessment.assessment_type);
              
              const categoryName = assessment.assessment_type === 'general' ? 'General Knowledge' : 
                                  assessment.assessment_type === 'technical' ? 'Technical Skills' : 
                                  'Assessment';
              const categoryScores = {
                [categoryName]: {
                  score: assessment.score || 0,
                  maxPossible: assessment.max_score || 500,
                  percentage: percentage,
                  total: assessment.score || 0
                }
              };
              
              const strengths = percentage >= 70 ? [categoryName] : [];
              const weaknesses = percentage < 70 ? [categoryName] : [];
              
              const strengthsForDb = strengths.map(s => `${s} (${percentage}%)`);
              const weaknessesForDb = weaknesses.map(w => `${w} (${percentage}%)`);
              
              const executiveSummary = `${dashboardData.full_name || 'Candidate'} completed the ${assessment.assessment_name} with a score of ${assessment.score}/${assessment.max_score} (${percentage}%). ${rating.message}`;
              
              return {
                id: assessment.assessment_id,
                assessment_id: assessment.assessment_id,
                name: assessment.assessment_name,
                type: assessment.assessment_type,
                score: assessment.score || 0,
                max_score: assessment.max_score || 500,
                percentage,
                completed_at: assessment.completed_at,
                category_scores: categoryScores,
                strengths: strengthsForDb,
                weaknesses: weaknessesForDb,
                recommendations: [],
                development_plan: {},
                interpretations: {
                  classification: gradeInfo.description,
                  summary: executiveSummary,
                  overallProfile: rating.message,
                  strengths: strengthsForDb,
                  weaknesses: weaknessesForDb
                },
                executive_summary: executiveSummary,
                overall_profile: rating.message
              };
            });

            setAssessments(formattedAssessments);
            
            if (formattedAssessments.length > 0) {
              const sorted = [...formattedAssessments].sort((a, b) => 
                new Date(b.completed_at) - new Date(a.completed_at)
              );
              const mostRecent = sorted[0];
              setSelectedAssessment(mostRecent);
              setCategoryScores(mostRecent.category_scores || {});
              setStrengths(mostRecent.strengths || []);
              setWeaknesses(mostRecent.weaknesses || []);
              setExecutiveSummary(mostRecent.executive_summary || '');
              setAssessmentType(mostRecent.type);
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

  // Generate professional interpretations when data changes
  useEffect(() => {
    if (selectedAssessment && Object.keys(categoryScores).length > 0 && candidate) {
      const scoresObject = {};
      Object.entries(categoryScores).forEach(([cat, data]) => {
        scoresObject[cat] = data.percentage;
      });
      
      const interpretation = generateUniversalInterpretation(
        assessmentType,
        candidate.full_name,
        scoresObject,
        strengths,
        weaknesses,
        selectedAssessment.percentage
      );
      
      setProfessionalInterpretation(interpretation);
    }
  }, [selectedAssessment, categoryScores, strengths, weaknesses, assessmentType, candidate]);

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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getClassification = (score, assessmentType = 'general') => {
    if (assessmentType === 'general') {
      if (score >= 450) return { label: "Elite Talent", color: "#2E7D32" };
      if (score >= 400) return { label: "Top Talent", color: "#4CAF50" };
      if (score >= 350) return { label: "High Potential", color: "#2196F3" };
      if (score >= 300) return { label: "Solid Performer", color: "#FF9800" };
      if (score >= 250) return { label: "Developing Talent", color: "#9C27B0" };
      if (score >= 200) return { label: "Emerging Talent", color: "#795548" };
      return { label: "Needs Improvement", color: "#F44336" };
    } else {
      if (score >= 90) return { label: "Exceptional", color: "#2E7D32" };
      if (score >= 80) return { label: "Advanced", color: "#4CAF50" };
      if (score >= 70) return { label: "Proficient", color: "#2196F3" };
      if (score >= 60) return { label: "Developing", color: "#FF9800" };
      if (score >= 50) return { label: "Basic", color: "#9C27B0" };
      return { label: "Needs Improvement", color: "#F44336" };
    }
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
  const overallGrade = getGradeInfo(current.percentage);
  const overallRating = getOverallRating(current.percentage, current.strengths, current.weaknesses, current.type);
  const classification = getClassification(current.score, current.type);

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

        {/* Hero Score Card */}
        <div style={{
          ...styles.heroCard,
          background: `linear-gradient(135deg, ${overallGrade.color}, ${adjustColor(overallGrade.color, 30)})`
        }}>
          <div style={styles.heroContent}>
            <div>
              <div style={styles.heroTitle}>{current.name}</div>
              <div style={styles.heroDate}>
                Completed: {new Date(current.completed_at).toLocaleString()}
              </div>
            </div>
            <div style={styles.heroScore}>
              <span style={styles.heroScoreNumber}>{current.score}</span>
              <span style={styles.heroMaxScore}>/{current.max_score}</span>
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
              <div style={styles.heroStatLabel}>Classification</div>
              <div style={{...styles.heroStatValue, color: classification.color}}>
                {classification.label}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary Section */}
        {executiveSummary && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('summary')}
            >
              <span style={styles.cardIcon}>📋</span>
              <h3 style={styles.cardTitle}>Executive Summary</h3>
              <span style={styles.expandIcon}>
                {expandedSections.summary ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.summary && (
              <div style={styles.cardContent}>
                <p style={styles.summaryText}>{executiveSummary}</p>
                <div style={{
                  ...styles.ratingBadge,
                  background: overallGrade.bg,
                  color: overallGrade.color
                }}>
                  <span style={styles.ratingIcon}>{overallRating.icon}</span>
                  <span>
                    <strong>Overall Assessment:</strong> {overallRating.title} • Grade {overallGrade.grade}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Performance Section */}
        {Object.keys(current.category_scores).length > 0 && (
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
                      {Object.entries(current.category_scores).map(([category, data]) => {
                        const grade = getGradeInfo(data.percentage);
                        
                        let rowColor = '#ffffff';
                        let assessmentText = '';
                        
                        if (data.percentage >= 80) {
                          rowColor = '#f0fff4';
                          assessmentText = 'Excellent';
                        } else if (data.percentage >= 70) {
                          rowColor = '#fff8e1';
                          assessmentText = 'Good';
                        } else if (data.percentage >= 60) {
                          rowColor = '#fff3e0';
                          assessmentText = 'Average';
                        } else {
                          rowColor = '#ffebee';
                          assessmentText = 'Below Average';
                        }
                        
                        let progressColor = '';
                        if (data.percentage >= 80) progressColor = '#4caf50';
                        else if (data.percentage >= 60) progressColor = '#ff9800';
                        else progressColor = '#f44336';
                        
                        return (
                          <tr key={category} style={{ ...styles.tableRow, backgroundColor: rowColor }}>
                            <td style={styles.tableCell}>
                              <strong style={{ color: grade.color }}>{category}</strong>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{ fontWeight: 600, color: grade.color }}>
                                {data.score || data.total}/{data.maxPossible}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.progressContainer}>
                                <div style={styles.progressBar}>
                                  <div style={{
                                    width: `${data.percentage}%`,
                                    height: '100%',
                                    background: progressColor,
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
                                {assessmentText}
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

        {/* Professional Interpretation Section */}
        {professionalInterpretation && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('interpretation')}
            >
              <span style={styles.cardIcon}>📋</span>
              <h3 style={styles.cardTitle}>Professional Assessment Interpretation</h3>
              <span style={styles.expandIcon}>
                {expandedSections.interpretation ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.interpretation && (
              <div style={styles.cardContent}>
                {/* Profile Summary */}
                <div style={styles.profileSummary}>
                  <span style={styles.profileBadge}>
                    {professionalInterpretation.profileType}
                  </span>
                  <p style={styles.profileDescription}>
                    {professionalInterpretation.profileDescription}
                  </p>
                </div>

                {/* Overall Summary */}
                <div style={styles.overallSummary}>
                  <p style={styles.overallSummaryText}>
                    {professionalInterpretation.overallSummary}
                  </p>
                </div>

                {/* Category Breakdown */}
                <h4 style={styles.sectionSubtitle}>Category Breakdown & What It Means</h4>
                <div style={styles.categoryGrid}>
                  {Object.entries(professionalInterpretation.categoryInterpretation || {}).map(([category, data]) => {
                    let levelColor = '';
                    if (data.level === 'excellent') levelColor = '#2E7D32';
                    else if (data.level === 'good') levelColor = '#4CAF50';
                    else if (data.level === 'average') levelColor = '#F57C00';
                    else levelColor = '#C62828';
                    
                    return (
                      <div key={category} style={styles.categoryCard}>
                        <div style={styles.categoryHeader}>
                          <h5 style={styles.categoryName}>{category}</h5>
                          <span style={{...styles.categoryScore, color: levelColor}}>
                            {data.score}%
                          </span>
                        </div>
                        <p style={styles.categoryInterpretation}>{data.interpretation}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Profile Insights */}
                <h4 style={styles.sectionSubtitle}>What This Profile Suggests</h4>
                <div style={styles.insightsGrid}>
                  <div style={styles.insightColumn}>
                    <h5 style={styles.insightTitle}>Best Fit:</h5>
                    <ul style={styles.insightList}>
                      {professionalInterpretation.suitability?.map((item, i) => (
                        <li key={i} style={styles.insightItem}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={styles.insightColumn}>
                    <h5 style={styles.insightTitle}>Risk Areas:</h5>
                    <ul style={styles.insightList}>
                      {professionalInterpretation.risks?.map((item, i) => (
                        <li key={i} style={styles.insightItem}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Development Focus */}
                {professionalInterpretation.developmentFocus?.length > 0 && (
                  <>
                    <h4 style={styles.sectionSubtitle}>Development Focus</h4>
                    <div style={styles.developmentList}>
                      {professionalInterpretation.developmentFocus.map((item, i) => (
                        <div key={i} style={styles.developmentItem}>
                          <span style={styles.developmentPriority}>
                            {item.priority === 'High' ? '🔴 High' : 
                             item.priority === 'Medium' ? '🟡 Medium' : '🟢 Low'}
                          </span>
                          <span style={styles.developmentArea}>{item.area}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Top Strengths */}
                {professionalInterpretation.topStrengths?.length > 0 && (
                  <div style={styles.topStrengthsCard}>
                    <h5 style={styles.topStrengthsTitle}>✨ Top Strengths</h5>
                    <div style={styles.topStrengthsList}>
                      {professionalInterpretation.topStrengths.map((strength, i) => (
                        <span key={i} style={styles.topStrengthTag}>{strength}</span>
                      ))}
                    </div>
                  </div>
                )}
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
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  container: {
    width: '90vw',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
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
  heroCard: {
    padding: '30px',
    borderRadius: '20px',
    color: 'white',
    marginBottom: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  heroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px'
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
    background: 'rgba(255,255,255,0.2)',
    padding: '15px 25px',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)'
  },
  heroScoreNumber: {
    fontSize: '48px',
    fontWeight: 800,
    lineHeight: 1
  },
  heroMaxScore: {
    fontSize: '20px',
    opacity: 0.8,
    marginLeft: '5px'
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
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
  profileSummary: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  profileBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    background: '#1565c0',
    color: 'white',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px'
  },
  profileDescription: {
    fontSize: '16px',
    color: '#555',
    lineHeight: '1.6',
    margin: 0
  },
  overallSummary: {
    background: '#e3f2fd',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px'
  },
  overallSummaryText: {
    fontSize: '15px',
    color: '#1565c0',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic'
  },
  sectionSubtitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '20px 0 15px 0'
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  categoryCard: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  categoryScore: {
    fontSize: '16px',
    fontWeight: 700
  },
  categoryInterpretation: {
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5',
    margin: 0
  },
  insightsGrid: {
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
  developmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px'
  },
  developmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },
  developmentPriority: {
    minWidth: '80px',
    fontSize: '12px',
    fontWeight: 600
  },
  developmentArea: {
    fontSize: '13px',
    color: '#333'
  },
  topStrengthsCard: {
    background: '#E8F5E9',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '15px'
  },
  topStrengthsTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2E7D32',
    margin: '0 0 10px 0'
  },
  topStrengthsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  topStrengthTag: {
    padding: '4px 10px',
    background: 'white',
    color: '#2E7D32',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid #2E7D32'
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
