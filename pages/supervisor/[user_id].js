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
  const [responseDetails, setResponseDetails] = useState([]);

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
      // Fetch responses with question and answer details
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          unique_questions!inner (id, section, subsection, question_text),
          unique_answers!inner (id, answer_text, score)
        `)
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id);

      if (responsesError) {
        console.error("Error fetching responses:", responsesError);
      }

      // Store response details for narrative generation
      if (responsesData && responsesData.length > 0) {
        setResponseDetails(responsesData);
      }

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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading assessment report...</p>
      </div>
    );
  }

  if (!candidate || !selectedAssessment || !stratavaxReport) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📊</div>
        <h3 style={styles.emptyTitle}>No Assessment Data Available</h3>
        <p style={styles.emptyText}>This candidate hasn't completed any assessments yet.</p>
        <Link href="/supervisor" style={styles.backButton}>← Back to Dashboard</Link>
      </div>
    );
  }

  const report = selectedAssessment.report.stratavaxReport;
  const assessmentDisplayName = selectedAssessment.assessment_name || 'Assessment';
  const percentageColor = selectedAssessment.percentage >= 80 ? '#2E7D32' : 
                          selectedAssessment.percentage >= 60 ? '#1565C0' : 
                          selectedAssessment.percentage >= 40 ? '#F57C00' : '#C62828';

  return (
    <div style={styles.pageContainer}>
      {/* Professional Header with Gradient */}
      <div style={styles.header}>
        <div style={styles.headerOverlay}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <Link href="/supervisor" style={styles.dashboardLink}>← Dashboard</Link>
              <div style={styles.logo}>STRATAVAX</div>
            </div>
            <div style={styles.headerRight}>
              {allAssessments.length > 1 && (
                <select value={selectedAssessment.id} onChange={handleAssessmentChange} style={styles.assessmentSelect}>
                  {allAssessments.map((a, index) => (
                    <option key={a.id} value={a.id}>
                      {getAssessmentType(a.assessment?.assessment_type?.code || a.assessment_type || 'general').name} - {new Date(a.completed_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={handlePrint} style={styles.printButton}>🖨️ Print Report</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Page */}
      <div style={styles.coverPage}>
        <div style={styles.coverContent}>
          <div style={styles.coverLogo}>STRATAVAX</div>
          <div style={styles.coverTitle}>{assessmentDisplayName}</div>
          <div style={styles.coverSubtitle}>Assessment Report</div>
          <div style={styles.coverCandidate}>
            <div style={styles.coverAvatar}>{candidate.full_name?.charAt(0) || 'C'}</div>
            <div style={styles.coverName}>{candidate.full_name}</div>
            <div style={styles.coverDate}>Completed: {new Date(selectedAssessment.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div style={styles.coverBadge}>CONFIDENTIAL</div>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryHeader}>
          <span style={styles.summaryIcon}>📋</span>
          <h2 style={styles.summaryTitle}>Executive Summary</h2>
        </div>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryScore}>
            <div style={styles.scoreCircleLarge}>
              <span style={{...styles.scoreLargeValue, color: percentageColor}}>{selectedAssessment.percentage}%</span>
              <span style={styles.scoreLargeLabel}>Overall Score</span>
            </div>
            <div style={styles.scoreMeta}>
              <div><span>Total:</span> <strong>{selectedAssessment.total_score}/{selectedAssessment.max_score}</strong></div>
              <div><span>Grade:</span> <strong>{report.executiveSummary.grade}</strong></div>
              <div><span>Classification:</span> <strong style={{color: percentageColor}}>{report.executiveSummary.classification}</strong></div>
            </div>
          </div>
          <div style={styles.summaryText}>
            <p>{report.executiveSummary.narrative.includes('General Assessment') ? report.executiveSummary.narrative.replace('General Assessment', assessmentDisplayName) : report.executiveSummary.narrative}</p>
            <p style={styles.summaryDesc}>{report.executiveSummary.classificationDescription}</p>
          </div>
        </div>
      </div>

      {/* Score Breakdown - Report Card Style */}
      <div style={styles.reportCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>📊</span>
          <h2 style={styles.cardTitle}>Performance Report Card</h2>
          <p style={styles.cardSubtitle}>Detailed breakdown by category with narrative analysis</p>
        </div>
        
        <div style={styles.categoriesGrid}>
          {report.scoreBreakdown.map((item, idx) => {
            const categoryColor = item.percentage >= 80 ? '#4CAF50' :
                                 item.percentage >= 60 ? '#2196F3' :
                                 item.percentage >= 40 ? '#FF9800' : '#F44336';
            const categoryBg = item.percentage >= 80 ? '#E8F5E9' :
                              item.percentage >= 60 ? '#E3F2FD' :
                              item.percentage >= 40 ? '#FFF3E0' : '#FFEBEE';
            
            // Get detailed narrative for this category
            const categoryNarrative = generateCommentary(item.category, item.percentage, 'neutral');
            
            return (
              <div key={idx} style={{...styles.categoryCard, borderTop: `4px solid ${categoryColor}`}}>
                <div style={styles.categoryHeader}>
                  <div>
                    <span style={styles.categoryName}>{item.category}</span>
                    <span style={{...styles.categoryGrade, background: categoryBg, color: categoryColor}}>
                      {item.grade} • {item.percentage}%
                    </span>
                  </div>
                  <div style={styles.categoryScoreCircle}>
                    <span style={{...styles.categoryScoreValue, color: categoryColor}}>{item.percentage}%</span>
                  </div>
                </div>
                
                <div style={styles.progressSection}>
                  <div style={styles.progressBarBg}>
                    <div style={{width: `${item.percentage}%`, height: '8px', background: categoryColor, borderRadius: '4px'}} />
                  </div>
                  <div style={styles.progressLabels}>
                    <span>Needs Improvement</span>
                    <span>Developing</span>
                    <span>Proficient</span>
                    <span>Exceptional</span>
                  </div>
                </div>
                
                {/* Narrative Analysis for this category */}
                <div style={styles.categoryNarrative}>
                  <p style={styles.narrativeText}>{categoryNarrative}</p>
                </div>
                
                {/* Score breakdown */}
                <div style={styles.scoreBreakdownRow}>
                  <div><span>Score:</span> <strong>{item.score}</strong></div>
                  <div><span>Target:</span> <strong>80%</strong></div>
                  <div><span>Gap:</span> <strong style={{color: '#F44336'}}>{Math.max(0, 80 - item.percentage)}%</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Weaknesses Section */}
      <div style={styles.strengthsWeaknessesCard}>
        <div style={styles.swHeader}>
          <div style={styles.strengthsHeader}>
            <span style={styles.swIcon}>⭐</span>
            <h3>Key Strengths</h3>
            <p>Areas where {candidate.full_name} excels</p>
          </div>
          <div style={styles.weaknessesHeader}>
            <span style={styles.swIcon}>⚠️</span>
            <h3>Development Areas</h3>
            <p>Opportunities for growth</p>
          </div>
        </div>
        
        <div style={styles.swGrid}>
          <div style={styles.strengthsList}>
            {report.strengths.items.slice(0, 5).map((strength, idx) => (
              <div key={idx} style={styles.strengthItem}>
                <div style={styles.strengthItemHeader}>
                  <span style={styles.strengthBullet}>✓</span>
                  <span style={styles.strengthItemName}>{strength.area}</span>
                  <span style={styles.strengthItemScore}>{strength.percentage}%</span>
                </div>
                <p style={styles.strengthItemDesc}>{generateCommentary(strength.area, strength.percentage, 'strength')}</p>
              </div>
            ))}
          </div>
          
          <div style={styles.weaknessesList}>
            {report.weaknesses.items.slice(0, 5).map((weakness, idx) => (
              <div key={idx} style={styles.weaknessItem}>
                <div style={styles.weaknessItemHeader}>
                  <span style={styles.weaknessBullet}>!</span>
                  <span style={styles.weaknessItemName}>{weakness.area}</span>
                  <span style={styles.weaknessItemScore}>{weakness.percentage}%</span>
                </div>
                <p style={styles.weaknessItemDesc}>{generateCommentary(weakness.area, weakness.percentage, 'weakness')}</p>
                <div style={styles.gapTag}>Gap: {weakness.gap} points to target</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competency Analysis Section */}
      <div style={styles.competencyCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>🎯</span>
          <h2 style={styles.cardTitle}>Competency Analysis</h2>
          <p style={styles.cardSubtitle}>Deep dive into core competencies</p>
        </div>
        
        <div style={styles.competencyGrid}>
          {competencyData.map(comp => (
            <div key={comp.id} style={{
              ...styles.competencyItem,
              borderLeft: `4px solid ${comp.classification === 'Strong' ? '#4CAF50' : comp.classification === 'Moderate' ? '#FF9800' : '#F44336'}`
            }}>
              <div style={styles.competencyItemHeader}>
                <div>
                  <span style={styles.competencyItemName}>{comp.competencies.name}</span>
                  <span style={styles.competencyItemLevel}>{comp.classification}</span>
                </div>
                <span style={styles.competencyItemScore}>{comp.percentage}%</span>
              </div>
              <div style={styles.competencyProgress}>
                <div style={{width: `${comp.percentage}%`, height: '6px', background: comp.classification === 'Strong' ? '#4CAF50' : comp.classification === 'Moderate' ? '#FF9800' : '#F44336', borderRadius: '3px'}} />
              </div>
              <div style={styles.competencyTarget}>Target: 80% • Gap: {comp.gap}%</div>
              <div style={styles.competencyInsight}>
                {comp.classification === 'Strong' ? 'This is a key strength area. Continue to leverage and develop further.' :
                 comp.classification === 'Moderate' ? 'Solid foundation with room for growth. Focused development will yield results.' :
                 'Priority development area. Requires structured learning and practice.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Insights Section */}
      {behavioralData && (
        <div style={styles.behavioralCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🧠</span>
            <h2 style={styles.cardTitle}>Behavioral Insights</h2>
            <p style={styles.cardSubtitle}>How {candidate.full_name} approached the assessment</p>
          </div>
          <BehavioralInsights behavioralData={behavioralData} candidateName={candidate.full_name} />
        </div>
      )}

      {/* Development Recommendations */}
      <div style={styles.recommendationsCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>💡</span>
          <h2 style={styles.cardTitle}>Development Recommendations</h2>
          <p style={styles.cardSubtitle}>Actionable steps for growth</p>
        </div>
        
        <div style={styles.recommendationsList}>
          {report.recommendations.slice(0, 5).map((rec, idx) => (
            <div key={idx} style={{
              ...styles.recommendationItem,
              borderLeft: `4px solid ${rec.priority === 'High' ? '#F44336' : rec.priority === 'Medium' ? '#FF9800' : '#4CAF50'}`
            }}>
              <div style={styles.recommendationHeader}>
                <span style={{...styles.priorityTag, background: rec.priority === 'High' ? '#FEF2F2' : rec.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9', color: rec.priority === 'High' ? '#B91C1C' : rec.priority === 'Medium' ? '#F57C00' : '#2E7D32'}}>
                  {rec.priority} Priority
                </span>
                <span style={styles.recommendationCategory}>{rec.category}</span>
              </div>
              <p style={styles.recommendationText}>{rec.recommendation}</p>
              <div style={styles.recommendationAction}><strong>Action:</strong> {rec.action}</div>
              <div style={styles.recommendationImpact}><strong>Impact:</strong> {rec.impact}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>© 2024 Stratavax - All Rights Reserved</p>
        <p>Report generated on {new Date().toLocaleDateString()}</p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media print {
          body { background: white; }
          button, .no-print { display: none; }
          div { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

const styles = {
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
  backButton: {
    display: 'inline-block',
    padding: '10px 20px',
    background: '#0A1929',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500
  },
  pageContainer: {
    minHeight: '100vh',
    background: '#F0F4F8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerOverlay: {
    background: 'rgba(0,0,0,0.2)'
  },
  headerContent: {
    maxWidth: '1000px',
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
    fontSize: '14px',
    transition: 'color 0.2s'
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
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
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  coverPage: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '80px 40px',
    textAlign: 'center'
  },
  coverContent: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  coverLogo: {
    fontSize: '48px',
    fontWeight: 800,
    letterSpacing: '4px',
    marginBottom: '20px'
  },
  coverTitle: {
    fontSize: '32px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  coverSubtitle: {
    fontSize: '18px',
    opacity: 0.8,
    marginBottom: '40px'
  },
  coverCandidate: {
    marginBottom: '40px'
  },
  coverAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    margin: '0 auto 20px'
  },
  coverName: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  coverDate: {
    fontSize: '14px',
    opacity: 0.7
  },
  coverBadge: {
    display: 'inline-block',
    padding: '8px 24px',
    border: '2px solid white',
    borderRadius: '40px',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '2px'
  },
  summaryCard: {
    maxWidth: '1000px',
    margin: '40px auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  summaryHeader: {
    background: '#F8FAFC',
    padding: '20px 24px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  summaryIcon: {
    fontSize: '24px'
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929',
    margin: 0
  },
  summaryGrid: {
    padding: '24px',
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap'
  },
  summaryScore: {
    flex: '0 0 200px',
    textAlign: 'center'
  },
  scoreCircleLarge: {
    marginBottom: '16px'
  },
  scoreLargeValue: {
    fontSize: '48px',
    fontWeight: 700,
    display: 'block',
    lineHeight: 1
  },
  scoreLargeLabel: {
    fontSize: '12px',
    color: '#64748B'
  },
  scoreMeta: {
    fontSize: '13px',
    color: '#64748B',
    textAlign: 'left',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '16px'
  },
  summaryText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#2D3748'
  },
  summaryDesc: {
    fontSize: '14px',
    color: '#64748B',
    marginTop: '12px',
    fontStyle: 'italic'
  },
  reportCard: {
    maxWidth: '1000px',
    margin: '40px auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  cardHeader: {
    background: '#F8FAFC',
    padding: '20px 24px',
    borderBottom: '1px solid #E2E8F0'
  },
  cardIcon: {
    fontSize: '24px',
    display: 'block',
    marginBottom: '8px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 4px 0'
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0
  },
  categoriesGrid: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  categoryCard: {
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '20px',
    background: 'white'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    display: 'block',
    marginBottom: '6px'
  },
  categoryGrade: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 500
  },
  categoryScoreCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    background: '#F8FAFC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #E2E8F0'
  },
  categoryScoreValue: {
    fontSize: '20px',
    fontWeight: 700
  },
  progressSection: {
    marginBottom: '16px'
  },
  progressBarBg: {
    background: '#EDF2F7',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9px',
    color: '#94A3B8'
  },
  categoryNarrative: {
    background: '#F8FAFC',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  narrativeText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#2D3748',
    margin: 0,
    fontStyle: 'italic'
  },
  scoreBreakdownRow: {
    display: 'flex',
    gap: '24px',
    fontSize: '13px',
    color: '#64748B',
    paddingTop: '12px',
    borderTop: '1px solid #E2E8F0'
  },
  strengthsWeaknessesCard: {
    maxWidth: '1000px',
    margin: '40px auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  swHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    background: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0'
  },
  strengthsHeader: {
    padding: '20px 24px',
    borderRight: '1px solid #E2E8F0'
  },
  weaknessesHeader: {
    padding: '20px 24px'
  },
  swIcon: {
    fontSize: '24px',
    display: 'block',
    marginBottom: '8px'
  },
  swGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: '24px',
    gap: '24px'
  },
  strengthsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  weaknessesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  strengthItem: {
    padding: '16px',
    background: '#F0F9F0',
    borderRadius: '10px',
    border: '1px solid #C6F6D5'
  },
  strengthItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  strengthBullet: {
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    background: '#4CAF50',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  strengthItemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A5C2E',
    flex: 1
  },
  strengthItemScore: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0A5C2E'
  },
  strengthItemDesc: {
    fontSize: '12px',
    color: '#2F855A',
    lineHeight: '1.5',
    margin: 0,
    paddingLeft: '30px'
  },
  weaknessItem: {
    padding: '16px',
    background: '#FEF2F2',
    borderRadius: '10px',
    border: '1px solid #FEE2E2'
  },
  weaknessItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  weaknessBullet: {
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    background: '#F44336',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  weaknessItemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#B91C1C',
    flex: 1
  },
  weaknessItemScore: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#B91C1C'
  },
  weaknessItemDesc: {
    fontSize: '12px',
    color: '#B91C1C',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
    paddingLeft: '30px'
  },
  gapTag: {
    fontSize: '11px',
    color: '#F57C00',
    background: '#FFF3E0',
    padding: '4px 8px',
    borderRadius: '12px',
    display: 'inline-block',
    marginLeft: '30px'
  },
  competencyCard: {
    maxWidth: '1000px',
    margin: '40px auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  competencyGrid: {
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  competencyItem: {
    padding: '16px',
    background: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #E2E8F0'
  },
  competencyItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  competencyItemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929',
    display: 'block'
  },
  competencyItemLevel: {
    fontSize: '10px',
    color: '#64748B',
    display: 'block'
  },
  competencyItemScore: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A1929'
  },
  competencyProgress: {
    background: '#EDF2F7',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  competencyTarget: {
    fontSize: '10px',
    color: '#64748B',
    marginBottom: '8px'
  },
  competencyInsight: {
    fontSize: '11px',
    color: '#64748B',
    fontStyle: 'italic'
  },
  behavioralCard: {
    maxWidth: '1000px',
    margin: '40px auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  recommendationsCard: {
    maxWidth: '1000px',
    margin: '40px auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  recommendationsList: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  recommendationItem: {
    padding: '16px',
    background: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #E2E8F0'
  },
  recommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  priorityTag: {
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
  footer: {
    textAlign: 'center',
    padding: '40px 24px',
    color: '#94A3B8',
    fontSize: '12px',
    borderTop: '1px solid #E2E8F0',
    marginTop: '40px'
  }
};

export default CandidateReport;
