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
  [behavioralData, setBehavioralData] = useState(null);
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

  const isMultipleCorrectQuestion = (questionId, responses) => {
    const response = responses.find(r => r.question_id === questionId);
    if (!response || !response.answer_id) return false;
    return typeof response.answer_id === 'string' && response.answer_id.includes(',');
  };

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return { letter: 'A+', color: '#2E7D32', bg: '#E8F5E9', description: 'Exceptional' };
    if (percentage >= 80) return { letter: 'A', color: '#4CAF50', bg: '#E8F5E9', description: 'Excellent' };
    if (percentage >= 70) return { letter: 'B', color: '#2196F3', bg: '#E3F2FD', description: 'Good' };
    if (percentage >= 60) return { letter: 'C', color: '#FF9800', bg: '#FFF3E0', description: 'Developing' };
    if (percentage >= 50) return { letter: 'D', color: '#F57C00', bg: '#FFF3E0', description: 'Below Average' };
    return { letter: 'F', color: '#F44336', bg: '#FFEBEE', description: 'Needs Improvement' };
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

  const getAssessmentThemeColor = () => {
    if (selectedAssessment?.assessment_type === 'manufacturing_baseline') {
      return '#2E7D32';
    }
    const percentage = selectedAssessment?.percentage || 0;
    return percentage >= 80 ? '#2E7D32' : percentage >= 60 ? '#1565C0' : percentage >= 40 ? '#F57C00' : '#C62828';
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
        <div style={{...styles.contentCard, borderLeft: `4px solid ${themeColor}`}}>
          <p>This is a placeholder - the full report content would go here with professional styling and no emojis.</p>
          <p>All icons and visual elements have been replaced with professional text and styling.</p>
        </div>
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
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
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
  }
};

export default CandidateReport;
