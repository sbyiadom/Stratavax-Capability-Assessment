import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from 'next/dynamic';
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateStratavaxReport } from "../../utils/stratavaxReportGenerator";
import { assessmentTypes, getAssessmentType } from "../../utils/assessmentConfigs";
import { generateCommentary, generateStrengthsSummary, generateWeaknessesSummary, generateProfileCommentary } from "../../utils/commentaryEngine";
import { generateUniversalInterpretation } from "../../utils/categoryMapper";
import { generateSuperAnalysis } from "../../utils/super-analyzer";
import BehavioralInsights from "../../components/BehavioralInsights";

// Disable SSR for the entire component
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
  const [behavioralData, setBehavioralData] = useState(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof window === 'undefined') return;
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
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!authChecked || !isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: profileData, error: profileError } = await supabase
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

        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsData && resultsData.length > 0) {
          const resultsWithAssessments = [];
          for (const result of resultsData) {
            const { data: assessment, error: assError } = await supabase
              .from('assessments')
              .select('*, assessment_type:assessment_types(*)')
              .eq('id', result.assessment_id)
              .single();
            if (!assError && assessment) {
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
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [authChecked, isSupervisor, user_id]);

  const loadAssessmentData = async (result, candidateInfo) => {
    try {
      const { data: responsesData } = await supabase
        .from('responses')
        .select(`
          *,
          unique_questions!inner (id, section, subsection, question_text),
          unique_answers!inner (id, answer_text, score)
        `)
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id);

      const assessmentTypeId = result.assessment?.assessment_type?.code || result.assessment_type || 'general';
      const config = getAssessmentType(assessmentTypeId);
      setAssessmentTypeName(config.name);

      const report = generateStratavaxReport(
        user_id, assessmentTypeId, responsesData || [],
        candidateInfo.full_name, result.completed_at
      );
      setStratavaxReport(report);

      if (result.category_scores) {
        const competencies = Object.entries(result.category_scores).map(([category, data], index) => ({
          id: `comp-${index}`,
          competencies: { name: category, category: assessmentTypeId || 'General' },
          percentage: data.percentage || 0,
          raw_score: data.score || data.total || 0,
          max_possible: data.maxPossible || 100,
          question_count: data.count || 1,
          classification: data.percentage >= 80 ? 'Strong' : data.percentage >= 55 ? 'Moderate' : 'Needs Development',
          gap: Math.max(0, 80 - (data.percentage || 0))
        }));
        setCompetencyData(competencies);
      }

      if (result.interpretations?.behavioralInsights) {
        setBehavioralData(result.interpretations.behavioralInsights);
      }

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
        report: report
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

  const handlePrint = () => {
    window.print();
  };

  if (!authChecked || loading) {
    return (
      <div style={stylesModern.loadingContainer}>
        <div style={stylesModern.spinner} />
        <p style={stylesModern.loadingText}>Loading assessment report...</p>
      </div>
    );
  }

  if (!candidate || !selectedAssessment || !stratavaxReport) {
    return (
      <div style={stylesModern.emptyContainer}>
        <div style={stylesModern.emptyIcon}>📊</div>
        <h3 style={stylesModern.emptyTitle}>No Assessment Data Available</h3>
        <p style={stylesModern.emptyText}>This candidate hasn't completed any assessments yet.</p>
        <Link href="/supervisor" style={stylesModern.backButton}>← Back to Dashboard</Link>
      </div>
    );
  }

  const report = selectedAssessment.report.stratavaxReport;
  const assessmentDisplayName = selectedAssessment.assessment_name || 'Assessment';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'breakdown', label: 'Score Breakdown', icon: '📊' },
    { id: 'competencies', label: 'Competencies', icon: '🎯' },
    { id: 'behavioral', label: 'Behavioral Insights', icon: '🧠' },
    { id: 'recommendations', label: 'Recommendations', icon: '💡' }
  ];

  if (superAnalysis) tabs.push({ id: 'super', label: 'Super Analysis', icon: '🔮' });

  return (
    <div style={stylesModern.pageContainer}>
      {/* Header */}
      <div style={stylesModern.header}>
        <div style={stylesModern.headerContent}>
          <div style={stylesModern.headerLeft}>
            <Link href="/supervisor" style={stylesModern.dashboardLink}>
              ← Dashboard
            </Link>
            <div style={stylesModern.logo}>STRATAVAX</div>
          </div>
          <div style={stylesModern.headerRight}>
            {allAssessments.length > 1 && (
              <select 
                value={selectedAssessment.id} 
                onChange={handleAssessmentChange}
                style={stylesModern.assessmentSelect}
              >
                {allAssessments.map((a, index) => {
                  const type = a.assessment?.assessment_type?.code || a.assessment_type || 'general';
                  const config = getAssessmentType(type);
                  return (
                    <option key={a.id} value={a.id}>
                      {config.name} - {new Date(a.completed_at).toLocaleDateString()}
                    </option>
                  );
                })}
              </select>
            )}
            <button onClick={handlePrint} style={stylesModern.printButton}>🖨️ Print Report</button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={stylesModern.hero}>
        <div style={stylesModern.heroContent}>
          <div style={stylesModern.candidateInfo}>
            <div style={stylesModern.candidateAvatar}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 style={stylesModern.candidateName}>{candidate.full_name}</h1>
              <p style={stylesModern.assessmentMeta}>
                {assessmentDisplayName} • Completed {new Date(selectedAssessment.completed_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div style={stylesModern.scoreCard}>
            <div style={stylesModern.scoreCircle}>
              <span style={stylesModern.scoreValue}>{selectedAssessment.percentage}%</span>
              <span style={stylesModern.scoreLabel}>Overall Score</span>
            </div>
            <div style={stylesModern.scoreDetails}>
              <div style={stylesModern.scoreDetailItem}>
                <span style={stylesModern.scoreDetailLabel}>Total Score</span>
                <span style={stylesModern.scoreDetailValue}>{selectedAssessment.total_score}/{selectedAssessment.max_score}</span>
              </div>
              <div style={stylesModern.scoreDetailItem}>
                <span style={stylesModern.scoreDetailLabel}>Grade</span>
                <span style={stylesModern.scoreDetailValue}>{report.executiveSummary.grade}</span>
              </div>
              <div style={stylesModern.scoreDetailItem}>
                <span style={stylesModern.scoreDetailLabel}>Classification</span>
                <span style={{
                  ...stylesModern.classificationBadge,
                  background: report.executiveSummary.classification === 'High Potential' ? '#E8F5E9' :
                             report.executiveSummary.classification === 'Strong Performer' ? '#E3F2FD' : '#FFF3E0',
                  color: report.executiveSummary.classification === 'High Potential' ? '#2E7D32' :
                         report.executiveSummary.classification === 'Strong Performer' ? '#1565C0' : '#F57C00'
                }}>
                  {report.executiveSummary.classification}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={stylesModern.tabsContainer}>
        <div style={stylesModern.tabsWrapper}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...stylesModern.tab,
                ...(activeTab === tab.id ? stylesModern.tabActive : {})
              }}
            >
              <span style={stylesModern.tabIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={stylesModern.mainContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={stylesModern.contentCard}>
            <div style={stylesModern.executiveSummarySection}>
              <h2 style={stylesModern.sectionTitle}>Executive Summary</h2>
              <p style={stylesModern.executiveText}>
                {report.executiveSummary.narrative.includes('General Assessment') 
                  ? report.executiveSummary.narrative.replace('General Assessment', assessmentDisplayName)
                  : report.executiveSummary.narrative}
              </p>
              <p style={stylesModern.executiveDesc}>{report.executiveSummary.classificationDescription}</p>
            </div>

            {/* Quick Stats */}
            <div style={stylesModern.statsGrid}>
              <div style={stylesModern.statCard}>
                <span style={stylesModern.statIcon}>🎯</span>
                <div>
                  <div style={stylesModern.statValue}>{competencyData.filter(c => c.percentage >= 70).length}</div>
                  <div style={stylesModern.statLabel}>Strengths</div>
                </div>
              </div>
              <div style={stylesModern.statCard}>
                <span style={stylesModern.statIcon}>📈</span>
                <div>
                  <div style={stylesModern.statValue}>{competencyData.filter(c => c.percentage >= 55 && c.percentage < 70).length}</div>
                  <div style={stylesModern.statLabel}>Developing</div>
                </div>
              </div>
              <div style={stylesModern.statCard}>
                <span style={stylesModern.statIcon}>⚠️</span>
                <div>
                  <div style={stylesModern.statValue}>{competencyData.filter(c => c.percentage < 55).length}</div>
                  <div style={stylesModern.statLabel}>Needs Work</div>
                </div>
              </div>
              {behavioralData && (
                <div style={stylesModern.statCard}>
                  <span style={stylesModern.statIcon}>🧠</span>
                  <div>
                    <div style={stylesModern.statValue}>{behavioralData.work_style?.split(' ')[0] || 'Balanced'}</div>
                    <div style={stylesModern.statLabel}>Work Style</div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Strengths */}
            <div style={stylesModern.strengthsSection}>
              <h3 style={stylesModern.subsectionTitle}>🔷 Key Strengths</h3>
              <div style={stylesModern.strengthsGrid}>
                {competencyData.filter(c => c.percentage >= 70).slice(0, 4).map((comp, idx) => (
                  <div key={idx} style={stylesModern.strengthItem}>
                    <div style={stylesModern.strengthHeader}>
                      <span style={stylesModern.strengthName}>{comp.competencies.name}</span>
                      <span style={stylesModern.strengthScore}>{comp.percentage}%</span>
                    </div>
                    <div style={stylesModern.strengthBar}>
                      <div style={{ width: `${comp.percentage}%`, height: '6px', background: '#4CAF50', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Development Areas */}
            <div style={stylesModern.weaknessesSection}>
              <h3 style={stylesModern.subsectionTitle}>⚠️ Development Areas</h3>
              <div style={stylesModern.weaknessesGrid}>
                {competencyData.filter(c => c.percentage < 60).slice(0, 4).map((comp, idx) => (
                  <div key={idx} style={stylesModern.weaknessItem}>
                    <div style={stylesModern.weaknessHeader}>
                      <span style={stylesModern.weaknessName}>{comp.competencies.name}</span>
                      <span style={stylesModern.weaknessScore}>{comp.percentage}%</span>
                    </div>
                    <div style={stylesModern.weaknessBar}>
                      <div style={{ width: `${comp.percentage}%`, height: '6px', background: '#F44336', borderRadius: '3px' }} />
                    </div>
                    <div style={stylesModern.gapText}>Need {comp.gap}% more to reach target</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown Tab */}
        {activeTab === 'breakdown' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>Score Breakdown by Category</h2>
            <div style={stylesModern.breakdownList}>
              {report.scoreBreakdown.map((item, idx) => (
                <div key={idx} style={stylesModern.breakdownItem}>
                  <div style={stylesModern.breakdownHeader}>
                    <span style={stylesModern.breakdownCategory}>{item.category}</span>
                    <span style={stylesModern.breakdownScore}>{item.score} ({item.percentage}%)</span>
                  </div>
                  <div style={stylesModern.breakdownBar}>
                    <div style={{
                      width: `${item.percentage}%`,
                      height: '8px',
                      background: item.percentage >= 80 ? '#4CAF50' :
                                 item.percentage >= 60 ? '#2196F3' :
                                 item.percentage >= 40 ? '#FF9800' : '#F44336',
                      borderRadius: '4px'
                    }} />
                  </div>
                  <div style={stylesModern.breakdownComment}>{item.comment}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competencies Tab */}
        {activeTab === 'competencies' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>Competency Analysis</h2>
            <p style={stylesModern.sectionDesc}>Detailed breakdown of core competencies</p>
            <div style={stylesModern.competenciesGrid}>
              {competencyData.map(comp => (
                <div key={comp.id} style={{
                  ...stylesModern.competencyCard,
                  borderLeft: `4px solid ${
                    comp.classification === 'Strong' ? '#4CAF50' :
                    comp.classification === 'Moderate' ? '#FF9800' : '#F44336'
                  }`
                }}>
                  <div style={stylesModern.competencyHeader}>
                    <div>
                      <div style={stylesModern.competencyName}>{comp.competencies.name}</div>
                      <div style={stylesModern.competencyCategory}>{comp.competencies.category}</div>
                    </div>
                    <div style={stylesModern.competencyScore}>{comp.percentage}%</div>
                  </div>
                  <div style={stylesModern.competencyBar}>
                    <div style={{
                      width: `${comp.percentage}%`,
                      height: '6px',
                      background: comp.classification === 'Strong' ? '#4CAF50' :
                                 comp.classification === 'Moderate' ? '#FF9800' : '#F44336',
                      borderRadius: '3px'
                    }} />
                  </div>
                  <div style={stylesModern.competencyTarget}>Target: 80%</div>
                  {comp.gap > 0 && (
                    <div style={stylesModern.competencyGap}>📈 {comp.gap}% gap to target</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behavioral Insights Tab */}
        {activeTab === 'behavioral' && behavioralData && (
          <div style={stylesModern.contentCard}>
            <BehavioralInsights behavioralData={behavioralData} candidateName={candidate.full_name} />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>Development Recommendations</h2>
            <p style={stylesModern.sectionDesc}>Based on assessment results and behavioral patterns</p>
            <div style={stylesModern.recommendationsList}>
              {report.recommendations.map((rec, idx) => (
                <div key={idx} style={{
                  ...stylesModern.recommendationCard,
                  borderLeft: `4px solid ${
                    rec.priority === 'High' ? '#F44336' :
                    rec.priority === 'Medium' ? '#FF9800' : '#4CAF50'
                  }`
                }}>
                  <div style={stylesModern.recommendationHeader}>
                    <span style={{
                      ...stylesModern.recommendationPriority,
                      background: rec.priority === 'High' ? '#FEF2F2' :
                                 rec.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9',
                      color: rec.priority === 'High' ? '#B91C1C' :
                             rec.priority === 'Medium' ? '#F57C00' : '#2E7D32'
                    }}>
                      {rec.priority} Priority
                    </span>
                    <span style={stylesModern.recommendationCategory}>{rec.category}</span>
                  </div>
                  <p style={stylesModern.recommendationText}>{rec.recommendation}</p>
                  <div style={stylesModern.recommendationAction}>
                    <strong>Action:</strong> {rec.action}
                  </div>
                  <div style={stylesModern.recommendationImpact}>
                    <strong>Impact:</strong> {rec.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media print {
          body { background: white; }
          button, .no-print { display: none; }
          div { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

const stylesModern = {
  pageContainer: {
    minHeight: '100vh',
    background: '#F5F7FA',
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
  loadingText: {
    fontSize: '14px',
    color: '#64748B'
  },
  emptyContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7FA',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '20px'
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #E2E8F0',
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
    color: '#64748B',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.2s'
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A1929',
    letterSpacing: '1px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  assessmentSelect: {
    padding: '8px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '13px',
    background: 'white',
    cursor: 'pointer'
  },
  printButton: {
    padding: '8px 16px',
    background: '#F1F5F9',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  hero: {
    background: 'white',
    borderBottom: '1px solid #E2E8F0'
  },
  heroContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
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
    background: 'linear-gradient(135deg, #0A1929, #1A2A3A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 600
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
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    background: '#F8FAFC',
    padding: '16px 24px',
    borderRadius: '16px'
  },
  scoreCircle: {
    textAlign: 'center'
  },
  scoreValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0A1929',
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
    fontWeight: 600
  },
  tabsContainer: {
    borderBottom: '1px solid #E2E8F0',
    background: 'white'
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    borderBottom: '2px solid transparent'
  },
  tabActive: {
    color: '#0A1929',
    borderBottomColor: '#0A1929'
  },
  tabIcon: {
    fontSize: '16px'
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '16px'
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
  executiveSummarySection: {
    marginBottom: '32px'
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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px'
  },
  statCard: {
    background: '#F8FAFC',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #E2E8F0'
  },
  statIcon: {
    fontSize: '28px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0A1929'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748B'
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
    background: '#F0F9F0',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #C6F6D5'
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
    overflow: 'hidden'
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
    background: '#FEF2F2',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #FEE2E2'
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
    overflow: 'hidden'
  },
  gapText: {
    fontSize: '11px',
    color: '#B91C1C',
    marginTop: '8px'
  },
  breakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  breakdownItem: {
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '16px'
  },
  breakdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  breakdownCategory: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#0A1929'
  },
  breakdownScore: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  breakdownBar: {
    background: '#EDF2F7',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  breakdownComment: {
    fontSize: '13px',
    color: '#64748B'
  },
  competenciesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  competencyCard: {
    background: '#F8FAFC',
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
  competencyTarget: {
    fontSize: '11px',
    color: '#64748B',
    textAlign: 'right'
  },
  competencyGap: {
    fontSize: '12px',
    color: '#F57C00',
    marginTop: '8px'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  recommendationCard: {
    background: '#F8FAFC',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  recommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
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
  backButton: {
    display: 'inline-block',
    padding: '10px 20px',
    background: '#0A1929',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500
  }
};

export default CandidateReport;
