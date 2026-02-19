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

        console.log("Raw results data:", resultsData);

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
            
            // Parse strengths and weaknesses from strings to objects if needed
            let strengthsList = detailedResult?.strengths || [];
            let weaknessesList = detailedResult?.weaknesses || [];
            
            // If strengths are strings, convert them to objects with area and percentage
            if (strengthsList.length > 0 && typeof strengthsList[0] === 'string') {
              strengthsList = strengthsList.map(s => {
                const match = s.match(/(.+) \((\d+)%\)/);
                if (match) {
                  return {
                    area: match[1],
                    percentage: parseInt(match[2]),
                    analysis: `Strong performance in ${match[1]} (${match[2]}%). This exceeds the 80% target.`
                  };
                }
                return { area: s, analysis: `Strength identified in ${s}` };
              });
            }
            
            if (weaknessesList.length > 0 && typeof weaknessesList[0] === 'string') {
              weaknessesList = weaknessesList.map(w => {
                const match = w.match(/(.+) \((\d+)%\)/);
                if (match) {
                  return {
                    area: match[1],
                    percentage: parseInt(match[2]),
                    analysis: `Needs improvement in ${match[1]} (${match[2]}%). Below target of 80%.`
                  };
                }
                return { area: w, analysis: `Development area identified in ${w}` };
              });
            }
            
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
              strengths: strengthsList,
              weaknesses: weaknessesList,
              recommendations: detailedResult?.recommendations || [],
              development_plan: detailedResult?.development_plan || {},
              interpretations: detailedResult?.interpretations || {},
              executive_summary: detailedResult?.interpretations?.summary || detailedResult?.interpretations?.executiveSummary || '',
              overall_profile: detailedResult?.interpretations?.overallProfile || ''
            };
          });

          console.log("Formatted assessments:", formattedAssessments);
          setAssessments(formattedAssessments);
          
          // Select the most recent assessment
          if (formattedAssessments.length > 0) {
            const mostRecent = formattedAssessments[0];
            console.log("Selected most recent:", mostRecent);
            setSelectedAssessment(mostRecent);
            
            // Set the detailed data
            setCategoryScores(mostRecent.category_scores || {});
            setStrengths(mostRecent.strengths || []);
            setWeaknesses(mostRecent.weaknesses || []);
            setRecommendations(mostRecent.recommendations || []);
            setDevelopmentPlan(mostRecent.development_plan || {});
            setInterpretations(mostRecent.interpretations || {});
            setExecutiveSummary(mostRecent.executive_summary || mostRecent.interpretations?.summary || '');
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

  // Generate professional interpretations when data changes
  useEffect(() => {
    if (selectedAssessment && Object.keys(categoryScores).length > 0 && candidate) {
      // Convert category scores to simple percentage object
      const scoresObject = {};
      Object.entries(categoryScores).forEach(([cat, data]) => {
        scoresObject[cat] = data.percentage;
      });
      
      // Generate universal interpretations
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

        {/* Executive Summary */}
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

        {/* Category Performance Table - SIMPLIFIED COMMENTS */}
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
                    let assessmentText = '';
                    
                    if (data.percentage >= 80) {
                      rowColor = '#f0fff4'; // Light green
                      assessmentText = 'Excellent';
                    } else if (data.percentage >= 70) {
                      rowColor = '#fff8e1'; // Light amber
                      assessmentText = 'Good';
                    } else if (data.percentage >= 60) {
                      rowColor = '#fff3e0'; // Light orange
                      assessmentText = 'Average';
                    } else if (data.percentage >= 50) {
                      rowColor = '#ffebee'; // Light red
                      assessmentText = 'Below Average';
                    } else {
                      rowColor = '#ffebee'; // Light red
                      assessmentText = 'Below Average';
                    }
                    
                    // Progress bar color
                    let progressColor = '';
                    if (data.percentage >= 80) progressColor = '#4caf50';
                    else if (data.percentage >= 60) progressColor = '#ff9800';
                    else progressColor = '#f44336';
                    
                    return (
                      <tr key={category} style={{ backgroundColor: rowColor, borderBottom: '1px solid #e0e0e0' }}>
                        <td style={styles.td}>
                          <strong style={{ color: grade.color }}>{category}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontWeight: 600, color: grade.color }}>
                            {data.score || data.total}/{data.maxPossible}
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

        {/* Professional Interpretation Section */}
        {professionalInterpretation && (
          <div style={styles.interpretationCard}>
            <h2 style={styles.interpretationTitle}>📋 Professional Assessment Interpretation</h2>
            
            {/* Profile Summary */}
            <div style={styles.profileSummary}>
              <span style={styles.profileBadge}>{professionalInterpretation.profileType}</span>
              <p style={styles.profileDescription}>{professionalInterpretation.profileDescription}</p>
            </div>
            
            {/* Domain Summaries */}
            <h3 style={styles.sectionTitle}>📊 Domain-Level Analysis</h3>
            <div style={styles.domainGrid}>
              {Object.entries(professionalInterpretation.domainSummaries || {}).map(([domain, data]) => (
                <div key={domain} style={styles.domainCard}>
                  <h4 style={styles.domainName}>{data.name}</h4>
                  <div style={styles.domainScore}>
                    <span style={styles.domainAverage}>{data.average}%</span>
                    <span style={styles.domainLevel}>{data.level}</span>
                  </div>
                  <p style={styles.domainSummary}>{data.summary}</p>
                  <small style={styles.domainRelevance}>{data.leadershipRelevance}</small>
                </div>
              ))}
            </div>
            
            {/* Category Breakdown */}
            <h3 style={styles.sectionTitle}>📈 Category Breakdown & What It Means</h3>
            <div style={styles.categoryGrid}>
              {Object.entries(professionalInterpretation.categoryInterpretations || {}).map(([category, data]) => {
                let levelColor = '';
                if (data.level === 'high') levelColor = '#2E7D32';
                else if (data.level === 'medium') levelColor = '#F57C00';
                else levelColor = '#C62828';
                
                return (
                  <div key={category} style={styles.categoryCard}>
                    <div style={styles.categoryHeader}>
                      <h4 style={styles.categoryName}>{category}</h4>
                      <span style={{...styles.categoryScore, color: levelColor}}>{data.score}%</span>
                    </div>
                    <p style={styles.categoryInterpretation}>{data.interpretation}</p>
                    <small style={styles.categoryRelevance}>{data.leadershipRelevance}</small>
                  </div>
                );
              })}
            </div>
            
            {/* What This Profile Suggests */}
            <h3 style={styles.sectionTitle}>🎯 What This Profile Suggests</h3>
            <div style={styles.profileInsights}>
              <div style={styles.insightColumn}>
                <h4 style={styles.insightTitle}>Best Fit:</h4>
                <ul style={styles.insightList}>
                  {professionalInterpretation.suitability?.map((item, i) => (
                    <li key={i} style={styles.insightItem}>{item}</li>
                  ))}
                </ul>
              </div>
              <div style={styles.insightColumn}>
                <h4 style={styles.insightTitle}>Risk Areas:</h4>
                <ul style={styles.insightList}>
                  {professionalInterpretation.concerns?.map((item, i) => (
                    <li key={i} style={styles.insightItem}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Development Focus */}
            {professionalInterpretation.developmentFocus?.length > 0 && (
              <>
                <h3 style={styles.sectionTitle}>🎯 Development Focus</h3>
                <div style={styles.developmentList}>
                  {professionalInterpretation.developmentFocus.map((area, i) => (
                    <div key={i} style={styles.developmentItem}>
                      <span style={styles.developmentPriority}>{i === 0 ? '🔴 High' : i === 1 ? '🟡 Medium' : '🟢 Low'}</span>
                      <span style={styles.developmentArea}>{area}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Overall Grade Interpretation */}
            <div style={styles.gradeInterpretation}>
              <h4 style={styles.gradeTitle}>📌 Overall Assessment</h4>
              <p style={styles.gradeText}>
                {professionalInterpretation.overallScore}% overall. {professionalInterpretation.profileDescription}
              </p>
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div style={styles.grid2}>
          {/* Strengths Card */}
          <div style={styles.strengthCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #2E7D32, #1B5E20)'}}>
              <span style={styles.cardIcon}>🌟</span>
              <h3 style={styles.cardHeaderTitle}>Key Strengths (Above 80%)</h3>
            </div>
            <div style={styles.cardContent}>
              {strengths && strengths.length > 0 ? (
                strengths.map((s, i) => {
                  const area = s.area || s;
                  const percentage = s.percentage || categoryScores[area]?.percentage;
                  const score = s.score || categoryScores[area]?.score;
                  const maxPossible = s.maxPossible || categoryScores[area]?.maxPossible;
                  const analysis = s.analysis || `Strong performance in ${area} (${percentage}%). Exceeds 80% target.`;
                  
                  return (
                    <div key={i} style={styles.strengthItem}>
                      <div style={styles.strengthTitle}>
                        <span style={styles.strengthIcon}>✓</span>
                        <span style={styles.strengthName}>{area}</span>
                        {percentage && (
                          <span style={{...styles.percentageBadge, background: '#E8F5E9', color: '#2E7D32'}}>
                            {score}/{maxPossible} ({percentage}%)
                          </span>
                        )}
                      </div>
                      <p style={styles.strengthComment}>{analysis}</p>
                    </div>
                  );
                })
              ) : (
                <p style={styles.emptyText}>No strengths above 80% identified in this assessment</p>
              )}
            </div>
          </div>

          {/* Weaknesses Card */}
          <div style={styles.weaknessCard}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #C62828, #8B0000)'}}>
              <span style={styles.cardIcon}>🎯</span>
              <h3 style={styles.cardHeaderTitle}>Development Areas (Below 80%)</h3>
            </div>
            <div style={styles.cardContent}>
              {weaknesses && weaknesses.length > 0 ? (
                weaknesses.map((w, i) => {
                  const area = w.area || w;
                  const percentage = w.percentage || categoryScores[area]?.percentage;
                  const score = w.score || categoryScores[area]?.score;
                  const maxPossible = w.maxPossible || categoryScores[area]?.maxPossible;
                  const gap = maxPossible ? Math.round((maxPossible * 0.8) - score) : null;
                  const analysis = w.analysis || `Needs improvement in ${area} (${percentage}%). Below 80% target.`;
                  
                  return (
                    <div key={i} style={styles.weaknessItem}>
                      <div style={styles.weaknessTitle}>
                        <span style={styles.weaknessIcon}>!</span>
                        <span style={styles.weaknessName}>{area}</span>
                        {percentage && (
                          <span style={{...styles.percentageBadge, background: '#FFEBEE', color: '#C62828'}}>
                            {score}/{maxPossible} ({percentage}%)
                          </span>
                        )}
                      </div>
                      <p style={styles.weaknessComment}>{analysis}</p>
                      {gap && (
                        <div style={styles.improvementPlan}>
                          <strong>Improvement target:</strong> Need {gap} more point{gap !== 1 ? 's' : ''} to reach 80% ({Math.round(maxPossible * 0.8)}/{maxPossible}).
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p style={styles.emptyText}>No areas below 80% identified - all categories are at or above target!</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations Card */}
        {recommendations && recommendations.length > 0 && (
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
                    <span>{rec}</span>
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
                          {item.priority && <span style={styles.priorityTag}> {item.priority} Priority</span>}
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
  improvementPlan: {
    marginTop: '10px',
    padding: '10px',
    background: '#fff3e0',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#e65100',
    lineHeight: '1.5',
    borderLeft: '3px solid #ff9800'
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
  },
  // New styles for interpretation section
  interpretationCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    marginTop: '30px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  },
  interpretationTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '2px solid #1565c0'
  },
  profileSummary: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px'
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
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
    margin: '30px 0 20px 0'
  },
  domainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  domainCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  domainName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 10px 0'
  },
  domainScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  domainAverage: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1565c0'
  },
  domainLevel: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    background: '#e3f2fd',
    color: '#1565c0'
  },
  domainSummary: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  domainRelevance: {
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic'
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  categoryCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  categoryScore: {
    fontSize: '18px',
    fontWeight: 700
  },
  categoryInterpretation: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
    marginBottom: '8px'
  },
  categoryRelevance: {
    fontSize: '12px',
    color: '#888'
  },
  profileInsights: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '30px'
  },
  insightColumn: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px'
  },
  insightTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 15px 0'
  },
  insightList: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  insightItem: {
    padding: '8px 0',
    fontSize: '14px',
    color: '#555',
    borderBottom: '1px solid #f0f0f0'
  },
  developmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '30px'
  },
  developmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  developmentPriority: {
    minWidth: '90px',
    fontSize: '13px',
    fontWeight: 600
  },
  developmentArea: {
    fontSize: '14px',
    color: '#333'
  },
  gradeInterpretation: {
    background: '#e3f2fd',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px'
  },
  gradeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1565c0',
    margin: '0 0 10px 0'
  },
  gradeText: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
    margin: 0
  }
};
