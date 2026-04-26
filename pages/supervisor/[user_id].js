import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from 'next/dynamic';
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateStratavaxReport } from "../../utils/stratavaxReportGenerator";
import { getAssessmentType } from "../../utils/assessmentConfigs";
import { generateCommentary } from "../../utils/commentaryEngine";
import { generateUniversalInterpretation } from "../../utils/categoryMapper";
import { generateSuperAnalysis } from "../../utils/super-analyzer";
import BehavioralInsights from "../../components/BehavioralInsights";

const CandidateReport = dynamic(
  () => Promise.resolve(CandidateReportComponent),
  { ssr: false }
);

function CandidateReportComponent() {
  const router = useRouter();
  const { user_id } = router.query;
  const reportRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stratavaxReport, setStratavaxReport] = useState(null);
  const [assessmentTypeName, setAssessmentTypeName] = useState('');
  const [competencyData, setCompetencyData] = useState([]);
  const [competencyInterpretation, setCompetencyInterpretation] = useState(null);
  const [superAnalysis, setSuperAnalysis] = useState(null);
  const [behavioralData, setBehavioralData] = useState(null); // FIXED: added const
  const [detailedCategoryAnalysis, setDetailedCategoryAnalysis] = useState({});
  const [isInvalidResult, setIsInvalidResult] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');
  const [questionResponses, setQuestionResponses] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = localStorage.getItem("userSession");
        if (!userSession) {
          router.push("/login");
          return;
        }
        const session = JSON.parse(userSession);
        if (session.loggedIn) {
          setIsSupervisor(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authChecked || !isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: profileData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        const candidateInfo = {
          id: user_id,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        };
        setCandidate(candidateInfo);

        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsData && resultsData.length > 0) {
          const resultsWithAssessments = [];
          for (const result of resultsData) {
            const { data: assessment } = await supabase
              .from('assessments')
              .select('*, assessment_type:assessment_types(*)')
              .eq('id', result.assessment_id)
              .single();
            if (assessment) {
              resultsWithAssessments.push({ ...result, assessment });
            }
          }
          if (resultsWithAssessments.length > 0) {
            setAllAssessments(resultsWithAssessments);
            await loadAssessmentData(resultsWithAssessments[0], candidateInfo);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [authChecked, isSupervisor, user_id]);

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return { letter: 'A+', color: '#2E7D32', bg: '#E8F5E9', description: 'Exceptional' };
    if (percentage >= 80) return { letter: 'A', color: '#4CAF50', bg: '#E8F5E9', description: 'Excellent' };
    if (percentage >= 70) return { letter: 'B', color: '#2196F3', bg: '#E3F2FD', description: 'Good' };
    if (percentage >= 60) return { letter: 'C', color: '#FF9800', bg: '#FFF3E0', description: 'Developing' };
    if (percentage >= 50) return { letter: 'D', color: '#F57C00', bg: '#FFF3E0', description: 'Below Average' };
    return { letter: 'F', color: '#F44336', bg: '#FFEBEE', description: 'Needs Improvement' };
  };

  const getActionablePlan = (category, percentage) => {
    const gap = 80 - percentage;
    if (gap <= 0) {
      return [
        `Lead a project utilizing ${category} skills`,
        `Mentor 2-3 colleagues in ${category}`,
        `Create a training resource on ${category} best practices`,
        `Take on a stretch assignment requiring advanced ${category}`
      ];
    } else if (gap <= 20) {
      return [
        `Complete an intermediate course in ${category} (4-6 weeks)`,
        `Practice ${category} skills in low-stakes environments`,
        `Seek feedback from a mentor on ${category} application`,
        `Review case studies related to ${category}`
      ];
    } else if (gap <= 30) {
      return [
        `Enroll in a foundational ${category} training program (6-8 weeks)`,
        `Work with a mentor on weekly ${category} exercises`,
        `Set weekly goals for ${category} improvement`,
        `Complete online modules and practice exercises`
      ];
    } else {
      return [
        `Complete intensive ${category} fundamentals course (8-12 weeks)`,
        `Schedule weekly coaching sessions focused on ${category}`,
        `Create a daily practice routine for ${category}`,
        `Shadow an expert and document learning`,
        `Complete a structured development plan with weekly check-ins`
      ];
    }
  };

  const getDevelopmentRecommendation = (category, percentage) => {
    if (percentage >= 80) {
      return `Continue to leverage ${category} as a key strength. Consider mentoring others in this area.`;
    } else if (percentage >= 70) {
      return `Build on your solid foundation in ${category}. Focus on advanced applications and real-world practice.`;
    } else if (percentage >= 60) {
      return `Targeted development in ${category} will yield significant improvement. Focus on core concepts and structured practice.`;
    } else if (percentage >= 50) {
      return `${category} requires focused attention. Start with foundational training and work with a mentor to build competence.`;
    } else {
      return `${category} is a critical priority. Immediate intervention needed with structured learning plan and close supervision.`;
    }
  };

  const getAssessmentThemeColor = () => {
    if (selectedAssessment?.assessment_type === 'manufacturing_baseline') {
      return '#2E7D32';
    }
    const percentage = selectedAssessment?.percentage || 0;
    return percentage >= 80 ? '#2E7D32' : percentage >= 60 ? '#1565C0' : percentage >= 40 ? '#F57C00' : '#C62828';
  };

  const getDevelopmentFocusAreas = (workStyle, fatigueFactor) => {
    const areas = ['Consistent performance', 'Regular feedback'];
    if (workStyle === 'Quick Decision Maker') {
      areas.push('Review habits', 'Quality verification');
    } else if (workStyle === 'Methodical Analyst') {
      areas.push('Time management', 'Efficiency techniques');
    } else if (workStyle === 'Anxious Reviser') {
      areas.push('Confidence building', 'Trusting first instincts');
    } else if (workStyle === 'Strategic Reviewer') {
      areas.push('Question flagging', 'Efficient review strategies');
    }
    if (fatigueFactor > 30) {
      areas.push('Break management', 'Fatigue prevention');
    }
    return [...new Set(areas)];
  };

  const getRecommendedSupport = (workStyle, avgTime, totalChanges) => {
    switch (workStyle) {
      case 'Quick Decision Maker':
        return 'Encourage reviewing answers before submitting. Provide time management guidance to balance speed with accuracy.';
      case 'Methodical Analyst':
        return 'Provide clear time expectations. Consider extended time if needed for complex assessments. Leverage their thoroughness.';
      case 'Anxious Reviser':
        return 'Build confidence through practice assessments. Provide positive reinforcement. Consider reducing time pressure.';
      case 'Strategic Reviewer':
        return 'Leverage their thoroughness. Suggest flagging difficult questions for review rather than revisiting all questions.';
      default:
        return 'Provide balanced support with regular check-ins on progress. Continue to monitor performance patterns.';
    }
  };

  const calculateBehavioralFromResponses = (responses) => {
    if (!responses || responses.length === 0) {
      return {
        work_style: 'Balanced',
        confidence_level: 'Moderate',
        attention_span: 'Consistent',
        decision_pattern: 'Deliberate',
        avg_response_time: 30,
        fastest_response: 10,
        slowest_response: 60,
        total_time_spent: responses.length * 30,
        total_answer_changes: 0,
        question_revisit_rate: 0,
        first_instinct_accuracy: null,
        improvement_rate: 0,
        fatigue_factor: 0,
        recommended_support: 'Continue to monitor performance patterns. Provide balanced support with regular check-ins.',
        development_focus_areas: ['Consistent performance', 'Regular feedback', 'Progress monitoring']
      };
    }
    
    const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
    const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 30;
    const totalChanges = responses.reduce((sum, r) => sum + (r.times_changed || 0), 0);
    const revisitRate = responses.length > 0 ? Math.round((totalChanges / responses.length) * 100) : 0;
    
    let workStyle = 'Balanced';
    if (avgTime < 15 && totalChanges < 3) workStyle = 'Quick Decision Maker';
    else if (avgTime > 45 && totalChanges > 5) workStyle = 'Methodical Analyst';
    else if (totalChanges > 8) workStyle = 'Anxious Reviser';
    else if (totalChanges > 3) workStyle = 'Strategic Reviewer';
    else if (avgTime < 25) workStyle = 'Fast-paced / Decisive';
    else if (avgTime > 50) workStyle = 'Methodical / Deliberate';
    
    let confidenceLevel = 'Moderate';
    if (avgTime < 20 && totalChanges < 2) confidenceLevel = 'High';
    else if (totalChanges > 5) confidenceLevel = 'Low';
    
    let decisionPattern = 'Deliberate';
    if (avgTime < 20) decisionPattern = 'Quick / Intuitive';
    else if (avgTime > 50) decisionPattern = 'Thorough / Analytical';
    
    return {
      work_style: workStyle,
      confidence_level: confidenceLevel,
      attention_span: 'Consistent',
      decision_pattern: decisionPattern,
      avg_response_time: avgTime,
      total_answer_changes: totalChanges,
      question_revisit_rate: revisitRate,
      recommended_support: getRecommendedSupport(workStyle, avgTime, totalChanges),
      development_focus_areas: getDevelopmentFocusAreas(workStyle, 0)
    };
  };

  const loadAssessmentData = async (result, candidateInfo) => {
    try {
      console.log("Loading assessment data for result:", result.id);
      
      if (result.is_valid === false) {
        setIsInvalidResult(true);
        setInvalidReason(result.validation_note || 'This assessment was auto-submitted due to rule violations and is not considered valid.');
      } else {
        setIsInvalidResult(false);
        setInvalidReason('');
      }
      
      const { data: responsesData } = await supabase
        .from('responses')
        .select(`*, unique_questions!inner (id, section, subsection, question_text), unique_answers!inner (id, answer_text, score)`)
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id);
      
      setQuestionResponses(responsesData || []);

      const assessmentTypeId = result.assessment?.assessment_type?.code || result.assessment_type || 'general';
      const config = getAssessmentType(assessmentTypeId);
      setAssessmentTypeName(config.name);

      const report = generateStratavaxReport(user_id, assessmentTypeId, responsesData || [], candidateInfo.full_name, result.completed_at);
      setStratavaxReport(report);

      const detailedAnalysis = {};
      if (result.category_scores) {
        Object.entries(result.category_scores).forEach(([category, data]) => {
          const percentage = data.percentage || 0;
          detailedAnalysis[category] = {
            score: data.score || data.total || 0,
            maxPossible: data.maxPossible || 100,
            percentage: percentage,
            grade: getGradeFromPercentage(percentage),
            narrative: generateCommentary(category, percentage, percentage >= 70 ? 'strength' : 'weakness', assessmentTypeId),
            recommendation: getDevelopmentRecommendation(category, percentage),
            gap: Math.max(0, 80 - percentage)
          };
        });
        setDetailedCategoryAnalysis(detailedAnalysis);
        
        const competencies = Object.entries(result.category_scores).map(([category, data], index) => {
          const percentage = data.percentage || 0;
          let classification = 'Needs Development';
          if (percentage >= 80) classification = 'Strong';
          else if (percentage >= 55) classification = 'Moderate';
          return {
            id: `comp-${index}`,
            competencies: { name: category, category: assessmentTypeId || 'General' },
            percentage: percentage,
            raw_score: data.score || data.total || 0,
            max_possible: data.maxPossible || 100,
            classification: classification,
            gap: Math.max(0, 80 - percentage),
            narrative: generateCommentary(category, percentage, classification === 'Strong' ? 'strength' : 'neutral', assessmentTypeId)
          };
        });
        competencies.sort((a, b) => b.percentage - a.percentage);
        setCompetencyData(competencies);
        
        try {
          const analysis = generateSuperAnalysis(candidateInfo.full_name, assessmentTypeId, responsesData || [], result.category_scores, result.total_score, result.max_score);
          setSuperAnalysis(analysis);
        } catch (e) { console.error(e); }
      }

      // Behavioral data fetching
      let behavioralInsightsData = null;
      
      const { data: behavioralMetricsData, error: metricsError } = await supabase
        .from('behavioral_metrics')
        .select('*')
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id)
        .maybeSingle();
      
      if (behavioralMetricsData && !metricsError) {
        behavioralInsightsData = {
          work_style: behavioralMetricsData.work_style || 'Balanced',
          confidence_level: behavioralMetricsData.confidence_level || 'Moderate',
          attention_span: behavioralMetricsData.attention_span || 'Consistent',
          decision_pattern: behavioralMetricsData.decision_pattern || 'Deliberate',
          avg_response_time: behavioralMetricsData.avg_response_time_seconds,
          total_answer_changes: behavioralMetricsData.total_answer_changes || 0,
          question_revisit_rate: behavioralMetricsData.revisit_rate || 0,
          recommended_support: behavioralMetricsData.recommended_support || '',
          development_focus_areas: behavioralMetricsData.development_focus_areas || []
        };
      }
      
      if (!behavioralInsightsData && responsesData && responsesData.length > 0) {
        behavioralInsightsData = calculateBehavioralFromResponses(responsesData);
      }
      
      setBehavioralData(behavioralInsightsData);

      setSelectedAssessment({
        id: result.id,
        assessment_id: result.assessment_id,
        assessment_type: assessmentTypeId,
        assessment_name: config.name,
        total_score: result.total_score,
        max_score: result.max_score,
        percentage: report.percentageScore,
        completed_at: result.completed_at,
        category_scores: result.category_scores || {},
        config: config,
        report: report,
        interpretations: result.interpretations,
        is_valid: result.is_valid !== false,
        validation_note: result.validation_note
      });
    } catch (error) {
      console.error("Error loading assessment data:", error);
    }
  };

  const handleAssessmentChange = async (e) => {
    const selected = allAssessments.find(a => a.id === e.target.value);
    if (selected && candidate) {
      setLoading(true);
      await loadAssessmentData(selected, candidate);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePrint = () => window.print();

  const themeColor = getAssessmentThemeColor();

  if (!authChecked || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading assessment report...</p>
      </div>
    );
  }

  if (!candidate || !selectedAssessment || !stratavaxReport) {
    return (
      <div style={styles.emptyContainer}>
        <h3>No Assessment Data Available</h3>
        <p>This candidate hasn't completed any valid assessments yet.</p>
        <Link href="/supervisor" style={styles.backButton}>Back to Dashboard</Link>
      </div>
    );
  }

  const report = selectedAssessment.report.stratavaxReport;
  const assessmentDisplayName = selectedAssessment.assessment_name || 'Assessment';
  const isValidResult = selectedAssessment.is_valid !== false;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'breakdown', label: 'Score Breakdown' },
    { id: 'competencies', label: 'Competencies' },
    ...(behavioralData && behavioralData.work_style !== 'Assessment Invalid' ? [{ id: 'behavioral', label: 'Behavioral Insights' }] : []),
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'development', label: 'Development Plan' },
    ...(superAnalysis ? [{ id: 'super', label: 'Super Analysis' }] : []),
    { id: 'responses', label: 'Question Responses' }
  ];

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <Link href="/supervisor" style={styles.dashboardLink}>Dashboard</Link>
            <div style={styles.logo}>STRATAVAX</div>
          </div>
          <div style={styles.headerRight}>
            {allAssessments.length > 1 && (
              <select value={selectedAssessment.id} onChange={handleAssessmentChange} style={styles.assessmentSelect}>
                {allAssessments.map((a) => {
                  const type = a.assessment?.assessment_type?.code || a.assessment_type || 'general';
                  const config = getAssessmentType(type);
                  return <option key={a.id} value={a.id}>{config.name} - {new Date(a.completed_at).toLocaleDateString()}</option>;
                })}
              </select>
            )}
            <button onClick={handlePrint} style={styles.printButton}>Print Report</button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{...styles.hero, background: `linear-gradient(135deg, ${themeColor}08 0%, ${themeColor}04 100%)`}}>
        <div style={styles.heroContent}>
          <div style={styles.candidateInfo}>
            <div style={{...styles.candidateAvatar, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`}}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 style={styles.candidateName}>{candidate.full_name}</h1>
              <p style={styles.assessmentMeta}>{assessmentDisplayName} • Completed {formatDate(selectedAssessment.completed_at)}</p>
              {superAnalysis && <p style={styles.profileId}>Profile ID: {superAnalysis.profileId}</p>}
            </div>
          </div>
          <div style={{...styles.scoreCard, background: `linear-gradient(135deg, ${themeColor}10, white)`}}>
            <div style={styles.scoreCircle}>
              <span style={{...styles.scoreValue, color: themeColor}}>{selectedAssessment.percentage}%</span>
              <span style={styles.scoreLabel}>Overall Score</span>
            </div>
            <div style={styles.scoreDetails}>
              <div style={styles.scoreDetailItem}>
                <span style={styles.scoreDetailLabel}>Score</span>
                <span style={styles.scoreDetailValue}>{selectedAssessment.total_score}/{selectedAssessment.max_score}</span>
              </div>
              <div style={styles.scoreDetailItem}>
                <span style={styles.scoreDetailLabel}>Grade</span>
                <span style={styles.scoreDetailValue}>{report.executiveSummary.grade}</span>
              </div>
              <div style={styles.scoreDetailItem}>
                <span style={styles.scoreDetailLabel}>Classification</span>
                <span style={{...styles.classificationBadge, background: `${themeColor}15`, color: themeColor}}>
                  {report.executiveSummary.classification}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invalid Result Warning */}
      {!isValidResult && (
        <div style={styles.warningContainer}>
          <div style={styles.warningBox}>
            <div>
              <strong>Invalid Assessment Result</strong>
              <p style={styles.warningText}>
                {selectedAssessment.validation_note || 'This assessment was auto-submitted due to rule violations and is not considered valid.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabsWrapper}>
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              style={{
                ...styles.tab, 
                ...(activeTab === tab.id ? {...styles.tabActive, borderBottomColor: themeColor, color: themeColor} : {})
              }}
            >
              {tab.label}
              {activeTab === tab.id && <span style={{...styles.tabIndicator, background: themeColor}} />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Score Breakdown Tab */}
        {activeTab === 'breakdown' && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Score Breakdown by Category</h2>
            <p style={styles.sectionDesc}>Detailed analysis of performance across all categories</p>
            
            <div style={styles.tableContainer}>
              <table style={styles.dataTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Category</th>
                    <th style={styles.tableHeader}>Score</th>
                    <th style={styles.tableHeader}>Percentage</th>
                    <th style={styles.tableHeader}>Grade</th>
                    <th style={styles.tableHeader}>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.scoreBreakdown.map((item, idx) => {
                    const gradeInfo = getGradeFromPercentage(item.percentage);
                    return (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}><strong>{item.category}</strong></td>
                        <td style={styles.tableCell}>{item.score}</td>
                        <td style={styles.tableCell}>
                          <div style={styles.tableProgressContainer}>
                            <div style={{...styles.tableProgressBar, width: `${item.percentage}%`, background: gradeInfo.color}} />
                            <span style={styles.tableProgressText}>{item.percentage}%</span>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{...styles.gradeBadge, background: `${gradeInfo.color}15`, color: gradeInfo.color}}>
                            {gradeInfo.letter} - {gradeInfo.description}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{item.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Executive Summary</h2>
            <div style={{...styles.narrativeBox, borderLeftColor: themeColor}}>
              <p style={styles.executiveText}>{report.executiveSummary.narrative}</p>
              <p style={styles.executiveDesc}>{report.executiveSummary.classificationDescription}</p>
            </div>

            <div style={styles.statsGrid}>
              <div style={{...styles.statCard, background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)'}}>
                <div>
                  <div style={styles.statValue}>{competencyData.filter(c => c.percentage >= 70).length}</div>
                  <div style={styles.statLabel}>Strengths Identified</div>
                </div>
              </div>
              <div style={{...styles.statCard, background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)'}}>
                <div>
                  <div style={styles.statValue}>{competencyData.filter(c => c.percentage >= 55 && c.percentage < 70).length}</div>
                  <div style={styles.statLabel}>Developing Areas</div>
                </div>
              </div>
              <div style={{...styles.statCard, background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)'}}>
                <div>
                  <div style={styles.statValue}>{competencyData.filter(c => c.percentage < 55).length}</div>
                  <div style={styles.statLabel}>Needs Work</div>
                </div>
              </div>
            </div>

            <div style={styles.strengthsSection}>
              <h3 style={styles.subsectionTitle}>Key Strengths</h3>
              <div style={styles.strengthsGrid}>
                {competencyData.filter(c => c.percentage >= 70).slice(0, 4).map((comp, idx) => (
                  <div key={idx} style={{...styles.strengthItem, background: 'linear-gradient(135deg, #F0F9F0, #E8F5E9)'}}>
                    <div style={styles.strengthHeader}>
                      <span style={styles.strengthName}>{comp.competencies.name}</span>
                      <span style={styles.strengthScore}>{comp.percentage}%</span>
                    </div>
                    <div style={styles.strengthBar}><div style={{width: `${comp.percentage}%`, height: '6px', background: '#4CAF50', borderRadius: '3px'}} /></div>
                    <p style={styles.strengthNarrative}>{comp.narrative}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.weaknessesSection}>
              <h3 style={styles.subsectionTitle}>Development Areas</h3>
              <div style={styles.weaknessesGrid}>
                {competencyData.filter(c => c.percentage < 60).slice(0, 4).map((comp, idx) => (
                  <div key={idx} style={{...styles.weaknessItem, background: 'linear-gradient(135deg, #FEF2F2, #FFEBEE)'}}>
                    <div style={styles.weaknessHeader}>
                      <span style={styles.weaknessName}>{comp.competencies.name}</span>
                      <span style={styles.weaknessScore}>{comp.percentage}%</span>
                    </div>
                    <div style={styles.weaknessBar}><div style={{width: `${comp.percentage}%`, height: '6px', background: '#F44336', borderRadius: '3px'}} /></div>
                    <p style={styles.weaknessNarrative}>{comp.narrative}</p>
                    <div style={styles.gapText}>Need {comp.gap}% more to reach target</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Competencies Tab */}
        {activeTab === 'competencies' && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Competency Analysis</h2>
            <p style={styles.sectionDesc}>Detailed breakdown of core competencies with narrative analysis</p>
            <div style={styles.competenciesGrid}>
              {competencyData.map(comp => (
                <div key={comp.id} style={{...styles.competencyCard, borderLeft: `4px solid ${comp.classification === 'Strong' ? '#4CAF50' : comp.classification === 'Moderate' ? '#FF9800' : '#F44336'}`, background: `linear-gradient(135deg, white, ${comp.classification === 'Strong' ? '#E8F5E9' : comp.classification === 'Moderate' ? '#FFF3E0' : '#FFEBEE'})`}}>
                  <div style={styles.competencyHeader}>
                    <div>
                      <div style={styles.competencyName}>{comp.competencies.name}</div>
                      <div style={styles.competencyCategory}>{comp.competencies.category}</div>
                    </div>
                    <div style={styles.competencyScore}>{comp.percentage}%</div>
                  </div>
                  <div style={styles.competencyBar}><div style={{width: `${comp.percentage}%`, height: '6px', background: comp.classification === 'Strong' ? '#4CAF50' : comp.classification === 'Moderate' ? '#FF9800' : '#F44336', borderRadius: '3px'}} /></div>
                  <p style={styles.competencyNarrative}>{comp.narrative}</p>
                  <div style={styles.competencyTarget}>Target: 80% • Gap: {comp.gap}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behavioral Insights Tab */}
        {activeTab === 'behavioral' && behavioralData && behavioralData.work_style !== 'Assessment Invalid' && (
          <div style={styles.contentCard}>
            <BehavioralInsights behavioralData={behavioralData} candidateName={candidate.full_name} />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Development Recommendations</h2>
            <p style={styles.sectionDesc}>Based on assessment results and behavioral patterns</p>
            <div style={styles.recommendationsList}>
              {report.recommendations.map((rec, idx) => (
                <div key={idx} style={{...styles.recommendationCard, borderLeft: `4px solid ${rec.priority === 'High' ? '#F44336' : rec.priority === 'Medium' ? '#FF9800' : '#4CAF50'}`, background: `linear-gradient(135deg, white, ${rec.priority === 'High' ? '#FEF2F2' : rec.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9'})`}}>
                  <div style={styles.recommendationHeader}>
                    <span style={{...styles.recommendationPriority, background: rec.priority === 'High' ? '#FEF2F2' : rec.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9', color: rec.priority === 'High' ? '#B91C1C' : rec.priority === 'Medium' ? '#F57C00' : '#2E7D32'}}>{rec.priority} Priority</span>
                    <span style={styles.recommendationCategory}>{rec.category}</span>
                  </div>
                  <p style={styles.recommendationText}>{rec.recommendation}</p>
                  <div style={styles.recommendationAction}><strong>Action:</strong> {rec.action}</div>
                  <div style={styles.recommendationImpact}><strong>Impact:</strong> {rec.impact}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Development Plan Tab */}
        {activeTab === 'development' && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Personalized Development Plan</h2>
            <p style={styles.sectionDesc}>A structured plan to help improve in key areas</p>
            
            {competencyData.filter(c => c.percentage < 80).length > 0 ? (
              competencyData.filter(c => c.percentage < 80).slice(0, 3).map((comp, idx) => {
                const actions = getActionablePlan(comp.competencies.name, comp.percentage);
                const priority = comp.percentage < 50 ? 'Critical' : comp.percentage < 65 ? 'High' : 'Medium';
                const priorityColor = priority === 'Critical' ? '#F44336' : priority === 'High' ? '#FF9800' : '#2196F3';
                
                return (
                  <div key={idx} style={{...styles.planCard, borderLeft: `4px solid ${priorityColor}`, background: `linear-gradient(135deg, white, ${priorityColor}05)`}}>
                    <div style={styles.planHeader}>
                      <div>
                        <span style={styles.planArea}>{comp.competencies.name}</span>
                        <span style={{...styles.planPriority, background: `${priorityColor}15`, color: priorityColor}}>{priority} Priority</span>
                      </div>
                      <div style={styles.planScore}>
                        <span>Current: {comp.percentage}%</span>
                        <span style={styles.planArrow}>→</span>
                        <span style={styles.planTarget}>Target: 80%</span>
                      </div>
                    </div>
                    <div style={styles.planGap}>
                      <div style={{width: `${(comp.percentage / 80) * 100}%`, height: '8px', background: priorityColor, borderRadius: '4px'}} />
                    </div>
                    <div style={styles.planActions}>
                      <h4 style={styles.planActionsTitle}>Action Items:</h4>
                      <ul style={styles.planActionsList}>
                        {actions.slice(0, 3).map((action, actionIdx) => (
                          <li key={actionIdx} style={styles.planActionItem}>✓ {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.noDevelopmentNeeded}>
                <h3 style={styles.noDevTitle}>Excellent Performance</h3>
                <p style={styles.noDevText}>This candidate has scored 80% or higher in all competency areas.</p>
                <p style={styles.noDevSubtext}>Recommended next steps:</p>
                <ul style={styles.noDevList}>
                  <li>Leverage strengths by mentoring others</li>
                  <li>Take on challenging projects to continue growth</li>
                  <li>Consider advanced certifications in areas of expertise</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Super Analysis Tab */}
        {activeTab === 'super' && superAnalysis && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Super Analysis</h2>
            <p style={styles.sectionDesc}>Advanced analysis combining competency, behavioral, and predictive insights</p>
            
            <div style={{...styles.superOverview, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`}}>
              <div>
                <h3 style={styles.superTitle}>Candidate Profile Summary</h3>
                <p style={styles.superDesc}>{superAnalysis.summary.oneLine}</p>
              </div>
              
              <div style={styles.superStats}>
                <div style={styles.superStat}>
                  <span style={styles.superStatValue}>{superAnalysis.strengths.byScore.length}</span>
                  <span style={styles.superStatLabel}>Strengths</span>
                </div>
                <div style={styles.superStat}>
                  <span style={styles.superStatValue}>{superAnalysis.developmentAreas.byScore.length}</span>
                  <span style={styles.superStatLabel}>Development Areas</span>
                </div>
                <div style={styles.superStat}>
                  <span style={styles.superStatValue}>{superAnalysis.differentiators.length}</span>
                  <span style={styles.superStatLabel}>Differentiators</span>
                </div>
              </div>
            </div>

            {superAnalysis.differentiators.length > 0 && (
              <div style={styles.differentiatorsSection}>
                <h4 style={styles.differentiatorsTitle}>Competitive Differentiators</h4>
                {superAnalysis.differentiators.slice(0, 3).map((diff, idx) => (
                  <div key={idx} style={styles.differentiatorCard}>
                    <span style={styles.diffScore}>{diff.score}%</span>
                    <div style={styles.diffContent}>
                      <span style={styles.diffName}>{diff.differentiator}</span>
                      <p style={styles.diffValue}>{diff.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.readinessSection}>
              <h4 style={styles.readinessTitle}>Role Readiness Assessment</h4>
              <div style={styles.readinessGrid}>
                <div style={styles.readinessCard}>
                  <span style={styles.readinessLabel}>Executive</span>
                  <span style={{...styles.readinessLevel, color: superAnalysis.roleReadiness.executive.ready ? '#4CAF50' : superAnalysis.roleReadiness.executive.score >= 65 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.executive.ready ? 'Ready Now' : superAnalysis.roleReadiness.executive.score >= 65 ? 'Developing' : 'Not Ready'}
                  </span>
                  <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.executive.score}%</span>
                </div>
                <div style={styles.readinessCard}>
                  <span style={styles.readinessLabel}>Management</span>
                  <span style={{...styles.readinessLevel, color: superAnalysis.roleReadiness.management.ready ? '#4CAF50' : superAnalysis.roleReadiness.management.score >= 60 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.management.ready ? 'Ready Now' : superAnalysis.roleReadiness.management.score >= 60 ? 'Developing' : 'Not Ready'}
                  </span>
                  <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.management.score}%</span>
                </div>
                <div style={styles.readinessCard}>
                  <span style={styles.readinessLabel}>Technical</span>
                  <span style={{...styles.readinessLevel, color: superAnalysis.roleReadiness.technical.ready ? '#4CAF50' : superAnalysis.roleReadiness.technical.score >= 60 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.technical.ready ? 'Ready' : superAnalysis.roleReadiness.technical.score >= 60 ? 'Developing' : 'Needs Work'}
                  </span>
                  <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.technical.score}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Responses Tab */}
        {activeTab === 'responses' && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Question Responses</h2>
            <p style={styles.sectionDesc}>Review all answers provided by the candidate</p>
            
            <div style={styles.responsesContainer}>
              {questionResponses.length === 0 ? (
                <p>No response data available.</p>
              ) : (
                <div style={styles.responsesList}>
                  {questionResponses.map((response, idx) => {
                    const isMultiple = response.answer_id && typeof response.answer_id === 'string' && response.answer_id.includes(',');
                    let selectedAnswers = [];
                    
                    if (isMultiple && response.answer_id) {
                      const answerIds = response.answer_id.split(',').map(id => parseInt(id, 10));
                      selectedAnswers = answerIds.map(id => response.unique_answers?.answer_text || `Answer ${id}`);
                    } else {
                      selectedAnswers = [response.unique_answers?.answer_text || response.answer_id];
                    }
                    
                    return (
                      <div key={idx} style={styles.responseCard}>
                        <div style={styles.responseHeader}>
                          <span style={styles.responseNumber}>Q{idx + 1}</span>
                          <span style={styles.responseSection}>{response.unique_questions?.section || 'General'}</span>
                          {isMultiple && <span style={styles.multipleBadge}>Multiple Correct</span>}
                        </div>
                        <div style={styles.responseQuestion}>{response.unique_questions?.question_text || 'Question text not available'}</div>
                        <div style={styles.responseAnswers}>
                          <strong>Selected Answer{selectedAnswers.length > 1 ? 's' : ''}:</strong>
                          <ul style={styles.responseAnswersList}>
                            {selectedAnswers.map((answer, aidx) => (
                              <li key={aidx} style={styles.responseAnswerItem}>• {answer}</li>
                            ))}
                          </ul>
                        </div>
                        {response.time_spent_seconds > 0 && (
                          <div style={styles.responseMeta}>
                            Time spent: {response.time_spent_seconds} seconds
                            {response.times_changed > 0 && ` • Changed answer ${response.times_changed} time${response.times_changed !== 1 ? 's' : ''}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Default/Empty content for other tabs */}
        {activeTab !== 'overview' && activeTab !== 'breakdown' && activeTab !== 'competencies' && activeTab !== 'behavioral' && activeTab !== 'recommendations' && activeTab !== 'development' && activeTab !== 'super' && activeTab !== 'responses' && (
          <div style={styles.contentCard}>
            <p>Content for {activeTab} tab goes here.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media print {
          body { background: white; }
          button { display: none; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: '#F5F7FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7FA',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #E2E8F0',
    borderTop: '3px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7FA',
    textAlign: 'center',
    padding: '20px'
  },
  backButton: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 24px',
    background: '#0A1929',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px'
  },
  header: {
    background: '#0A1929',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  dashboardLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px'
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'white',
    letterSpacing: '2px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  assessmentSelect: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer'
  },
  printButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  hero: {
    padding: '32px 0',
    borderBottom: '1px solid #E2E8F0'
  },
  heroContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  candidateAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 600,
    color: 'white'
  },
  candidateName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0A1929',
    marginBottom: '4px'
  },
  assessmentMeta: {
    fontSize: '14px',
    color: '#64748B'
  },
  profileId: {
    fontSize: '12px',
    color: '#94A3B8',
    marginTop: '4px'
  },
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '16px 24px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  scoreCircle: {
    textAlign: 'center'
  },
  scoreValue: {
    fontSize: '36px',
    fontWeight: 700,
    display: 'block',
    lineHeight: 1
  },
  scoreLabel: {
    fontSize: '11px',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  scoreDetails: {
    display: 'flex',
    gap: '24px'
  },
  scoreDetailItem: {
    textAlign: 'center'
  },
  scoreDetailLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '4px',
    textTransform: 'uppercase'
  },
  scoreDetailValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929'
  },
  classificationBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block'
  },
  warningContainer: {
    maxWidth: '1200px',
    margin: '20px auto 0',
    padding: '0 24px'
  },
  warningBox: {
    background: '#FFF3E0',
    borderLeft: `4px solid #F44336`,
    padding: '16px 20px',
    borderRadius: '8px'
  },
  warningText: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#E65100'
  },
  tabsContainer: {
    borderBottom: '1px solid #E2E8F0',
    background: 'white',
    position: 'sticky',
    top: '73px',
    zIndex: 99
  },
  tabsWrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    gap: '8px',
    overflowX: 'auto'
  },
  tab: {
    padding: '16px 20px',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748B',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: '#0A1929'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: '-1px',
    left: '20px',
    right: '20px',
    height: '2px',
    borderRadius: '1px'
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  contentCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '8px'
  },
  sectionDesc: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '24px'
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '16px'
  },
  narrativeBox: {
    background: '#F8FAFC',
    padding: '24px',
    borderRadius: '12px',
    borderLeft: '6px solid',
    marginBottom: '20px'
  },
  executiveText: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#2D3748',
    marginBottom: '16px'
  },
  executiveDesc: {
    fontSize: '14px',
    color: '#64748B',
    fontStyle: 'italic'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px'
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid rgba(0,0,0,0.05)'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '4px'
  },
  strengthsSection: {
    marginBottom: '32px'
  },
  strengthsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  strengthItem: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.05)'
  },
  strengthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  strengthName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A5C2E'
  },
  strengthScore: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0A5C2E'
  },
  strengthBar: {
    background: '#E8F5E9',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  strengthNarrative: {
    fontSize: '12px',
    color: '#2F855A',
    marginTop: '8px',
    lineHeight: '1.5'
  },
  weaknessesSection: {
    marginBottom: '16px'
  },
  weaknessesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  weaknessItem: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.05)'
  },
  weaknessHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  weaknessName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#B91C1C'
  },
  weaknessScore: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#B91C1C'
  },
  weaknessBar: {
    background: '#FFEBEE',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  weaknessNarrative: {
    fontSize: '12px',
    color: '#B91C1C',
    marginTop: '8px'
  },
  gapText: {
    fontSize: '11px',
    color: '#F57C00',
    marginTop: '8px',
    fontWeight: 500
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '32px'
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeaderRow: {
    background: '#F8FAFC',
    borderBottom: '2px solid #E2E8F0'
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#0A1929'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0'
  },
  tableCell: {
    padding: '12px 16px',
    verticalAlign: 'middle'
  },
  tableProgressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  tableProgressBar: {
    height: '8px',
    borderRadius: '4px',
    minWidth: '30px'
  },
  tableProgressText: {
    fontSize: '13px',
    fontWeight: 500,
    minWidth: '40px'
  },
  gradeBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-block'
  },
  competenciesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  competencyCard: {
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  competencyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  competencyName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '4px'
  },
  competencyCategory: {
    fontSize: '11px',
    color: '#64748B'
  },
  competencyScore: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0A1929'
  },
  competencyBar: {
    background: '#EDF2F7',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  competencyNarrative: {
    fontSize: '12px',
    color: '#4A5568',
    lineHeight: '1.4',
    marginBottom: '8px'
  },
  competencyTarget: {
    fontSize: '11px',
    color: '#64748B',
    textAlign: 'right'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  recommendationCard: {
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  recommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  recommendationPriority: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600
  },
  recommendationCategory: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  recommendationText: {
    fontSize: '14px',
    color: '#2D3748',
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  recommendationAction: {
    fontSize: '13px',
    color: '#475569',
    marginBottom: '8px'
  },
  recommendationImpact: {
    fontSize: '13px',
    color: '#64748B'
  },
  planCard: {
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #E2E8F0'
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  planArea: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929',
    display: 'block',
    marginBottom: '4px'
  },
  planPriority: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-block'
  },
  planScore: {
    fontSize: '14px',
    color: '#64748B'
  },
  planArrow: {
    margin: '0 8px'
  },
  planTarget: {
    fontWeight: 600,
    color: '#4CAF50'
  },
  planGap: {
    background: '#EDF2F7',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  planActions: {
    marginBottom: '20px'
  },
  planActionsTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '12px'
  },
  planActionsList: {
    margin: 0,
    paddingLeft: '20px'
  },
  planActionItem: {
    fontSize: '13px',
    color: '#4A5568',
    marginBottom: '8px'
  },
  noDevelopmentNeeded: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#F0F9F0',
    borderRadius: '16px',
    border: '1px solid #C6F6D5'
  },
  noDevTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#2E7D32',
    marginBottom: '12px'
  },
  noDevText: {
    fontSize: '14px',
    color: '#2E7D32',
    marginBottom: '16px'
  },
  noDevSubtext: {
    fontSize: '13px',
    color: '#64748B',
    marginBottom: '12px'
  },
  noDevList: {
    textAlign: 'left',
    display: 'inline-block',
    margin: '0 auto',
    color: '#4A5568',
    fontSize: '13px',
    lineHeight: '1.8'
  },
  superOverview: {
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    color: 'white'
  },
  superTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  superDesc: {
    fontSize: '14px',
    opacity: 0.9,
    margin: 0
  },
  superStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginTop: '20px'
  },
  superStat: {
    textAlign: 'center',
    background: 'rgba(255,255,255,0.15)',
    padding: '12px',
    borderRadius: '10px'
  },
  superStatValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  superStatLabel: {
    fontSize: '11px',
    opacity: 0.8
  },
  differentiatorsSection: {
    marginBottom: '24px'
  },
  differentiatorsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '16px'
  },
  differentiatorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#F8FAFC',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid #E2E8F0'
  },
  diffScore: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#4CAF50',
    minWidth: '60px',
    textAlign: 'center'
  },
  diffContent: {
    flex: 1
  },
  diffName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '4px'
  },
  diffValue: {
    fontSize: '13px',
    color: '#4A5568'
  },
  readinessSection: {
    marginBottom: '24px'
  },
  readinessTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '16px'
  },
  readinessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  readinessCard: {
    background: '#F8FAFC',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #E2E8F0'
  },
  readinessLabel: {
    fontSize: '12px',
    color: '#64748B',
    display: 'block',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  readinessLevel: {
    fontSize: '14px',
    fontWeight: 600,
    display: 'block',
    marginBottom: '4px'
  },
  readinessScore: {
    fontSize: '12px',
    color: '#64748B',
    display: 'block'
  },
  responsesContainer: {
    marginTop: '16px'
  },
  responsesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  responseCard: {
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    background: 'white'
  },
  responseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  responseNumber: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0A1929',
    background: '#F1F5F9',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  responseSection: {
    fontSize: '12px',
    color: '#64748B',
    background: '#F8FAFC',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  multipleBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#2E7D32',
    background: '#E8F5E9',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  responseQuestion: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#0A1929',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  responseAnswers: {
    marginBottom: '8px',
    fontSize: '13px'
  },
  responseAnswersList: {
    margin: '4px 0 0 20px',
    padding: 0
  },
  responseAnswerItem: {
    fontSize: '13px',
    color: '#2E7D32',
    marginBottom: '4px'
  },
  responseMeta: {
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #E2E8F0'
  }
};

export default CandidateReport;
