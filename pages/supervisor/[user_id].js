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

// Disable SSR for the entire component to prevent hydration issues
const CandidateReport = dynamic(
  () => Promise.resolve(CandidateReportComponent),
  { 
    ssr: false,
    loading: () => (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading Report...</p>
          <p style={styles.loadingSubtext}>Please wait while we prepare the candidate data</p>
        </div>
      </div>
    )
  }
);

function CandidateReportComponent() {
  const router = useRouter();
  const { user_id } = router.query;
  const reportRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [activeSection, setActiveSection] = useState('cover');
  const [showPrintView, setShowPrintView] = useState(false);
  const [stratavaxReport, setStratavaxReport] = useState(null);
  const [assessmentTypeName, setAssessmentTypeName] = useState('');
  
  // State for competency data
  const [competencyData, setCompetencyData] = useState([]);
  const [competencyInterpretation, setCompetencyInterpretation] = useState(null);
  const [showCompetencyView, setShowCompetencyView] = useState(false);
  
  // NEW: Behavioral Insights data
  const [behavioralData, setBehavioralData] = useState(null);
  
  // Super Analysis data
  const [superAnalysis, setSuperAnalysis] = useState(null);
  const [superAnalysisError, setSuperAnalysisError] = useState(false);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout - forcing render");
        setLoadingTimeout(true);
        setLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading]);

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
        
        console.log("📊 Fetching data for candidate - user:", user_id);

        const { data: profileData, error: profileError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        const candidateInfo = {
          id: user_id,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        };
        setCandidate(candidateInfo);

        console.log("🔍 Step 1: Fetching assessment_results...");
        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error("Error fetching results:", resultsError);
        }

        console.log(`Found ${resultsData?.length || 0} assessment results`);

        if (resultsData && resultsData.length > 0) {
          const resultsWithAssessments = [];
          
          for (const result of resultsData) {
            console.log(`Fetching assessment details for ID: ${result.assessment_id}`);
            
            const { data: assessment, error: assError } = await supabase
              .from('assessments')
              .select('*, assessment_type:assessment_types(*)')
              .eq('id', result.assessment_id)
              .single();

            if (assError) {
              console.error("Error fetching assessment:", assError);
              continue;
            }

            resultsWithAssessments.push({
              ...result,
              assessment: assessment
            });
          }

          if (resultsWithAssessments.length > 0) {
            console.log(`✅ Successfully loaded ${resultsWithAssessments.length} assessments with details`);
            setAllAssessments(resultsWithAssessments);
            
            const defaultAssessment = resultsWithAssessments[0];
            await loadAssessmentData(defaultAssessment, candidateInfo);
            setLoading(false);
            return;
          }
        }

        console.log("🔍 Step 2: Checking candidate_assessments...");
        const { data: caData, error: caError } = await supabase
          .from('candidate_assessments')
          .select('*')
          .eq('user_id', user_id)
          .eq('status', 'completed');

        if (caError) {
          console.error("Error fetching candidate_assessments:", caError);
        }

        console.log(`Found ${caData?.length || 0} completed candidate_assessments`);

        if (caData && caData.length > 0) {
          const resultsFromCA = [];
          
          for (const ca of caData) {
            if (ca.result_id) {
              const { data: result } = await supabase
                .from('assessment_results')
                .select('*')
                .eq('id', ca.result_id)
                .single();

              if (result) {
                const { data: assessment } = await supabase
                  .from('assessments')
                  .select('*, assessment_type:assessment_types(*)')
                  .eq('id', ca.assessment_id)
                  .single();

                if (assessment) {
                  resultsFromCA.push({
                    ...result,
                    assessment: assessment
                  });
                }
              }
            }
          }

          if (resultsFromCA.length > 0) {
            console.log(`✅ Found ${resultsFromCA.length} results via candidate_assessments`);
            setAllAssessments(resultsFromCA);
            const defaultAssessment = resultsFromCA[0];
            await loadAssessmentData(defaultAssessment, candidateInfo);
            setLoading(false);
            return;
          }
        }

        console.log("❌ No assessment data found for this candidate");
        setAllAssessments([]);
        setLoading(false);

      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [authChecked, isSupervisor, user_id]);

  const extractCompetencyData = (categoryScores, assessmentTypeId, candidateName, overallPercentage) => {
    if (!categoryScores || Object.keys(categoryScores).length === 0) {
      return { competencies: [], interpretation: null };
    }

    console.log("🔍 Extracting competency data from category_scores");

    const competencies = Object.entries(categoryScores).map(([category, data], index) => {
      const percentage = data.percentage || 0;
      let classification = 'Needs Development';
      if (percentage >= 80) classification = 'Strong';
      else if (percentage >= 55) classification = 'Moderate';
      
      return {
        id: `comp-${index}`,
        competencies: {
          name: category,
          category: assessmentTypeId || 'General'
        },
        percentage: percentage,
        raw_score: data.score || data.total || 0,
        max_possible: data.maxPossible || 100,
        question_count: data.count || 1,
        classification: classification,
        gap: Math.max(0, 80 - percentage)
      };
    });

    competencies.sort((a, b) => b.percentage - a.percentage);

    const scoresObject = {};
    competencies.forEach(comp => {
      scoresObject[comp.competencies.name] = comp.percentage;
    });

    const strengths = competencies
      .filter(c => c.percentage >= 70)
      .map(c => ({ area: c.competencies.name, percentage: c.percentage }));

    const weaknesses = competencies
      .filter(c => c.percentage < 60)
      .map(c => ({ area: c.competencies.name, percentage: c.percentage }));

    const interpretation = generateUniversalInterpretation(
      assessmentTypeId,
      candidateName,
      scoresObject,
      strengths,
      weaknesses,
      overallPercentage
    );

    return { competencies, interpretation };
  };

  const loadAssessmentData = async (result, candidateInfo) => {
    try {
      console.log("Loading assessment data for result:", result.id);
      
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          unique_questions!inner (
            id,
            section,
            subsection,
            question_text
          ),
          unique_answers!inner (
            id,
            answer_text,
            score
          )
        `)
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id);

      if (responsesError) {
        console.error("Error fetching responses:", responsesError);
      }

      const assessmentTypeId = result.assessment?.assessment_type?.code || result.assessment_type || 'general';
      const config = getAssessmentType(assessmentTypeId);
      
      const assessmentName = config.name;
      setAssessmentTypeName(assessmentName);
      
      console.log(`📋 Assessment type: ${assessmentTypeId}, Name: ${assessmentName}`);

      const report = generateStratavaxReport(
        user_id,
        assessmentTypeId,
        responsesData || [],
        candidateInfo.full_name,
        result.completed_at
      );

      setStratavaxReport(report);
      
      if (result.category_scores) {
        const { competencies, interpretation } = extractCompetencyData(
          result.category_scores,
          assessmentTypeId,
          candidateInfo.full_name,
          report.percentageScore
        );
        setCompetencyData(competencies);
        setCompetencyInterpretation(interpretation);
        console.log(`✅ Extracted ${competencies.length} competencies from category_scores`);
        
        try {
          console.log("🔮 Generating super analysis...");
          const analysis = generateSuperAnalysis(
            candidateInfo.full_name,
            assessmentTypeId,
            responsesData || [],
            result.category_scores,
            result.total_score,
            result.max_score
          );
          
          setSuperAnalysis(analysis);
          console.log(`✅ Super analysis complete - Profile ID: ${analysis.profileId}`);
        } catch (saError) {
          console.error("Error generating super analysis:", saError);
          setSuperAnalysisError(true);
        }
      } else {
        console.log("⚠️ No category_scores found in assessment result");
      }
      
      // NEW: Extract behavioral insights from interpretations
      if (result.interpretations?.behavioralInsights) {
        setBehavioralData(result.interpretations.behavioralInsights);
        console.log("✅ Loaded behavioral insights");
      }
      
      setSelectedAssessment({
        id: result.id,
        assessment_id: result.assessment_id,
        assessment_type: assessmentTypeId,
        assessment_name: assessmentName,
        total_score: result.total_score,
        max_score: result.max_score,
        percentage: report.percentageScore,
        completed_at: result.completed_at,
        category_scores: result.category_scores || {},
        config: config,
        report: report,
        interpretations: result.interpretations
      });
      
    } catch (error) {
      console.error("Error loading assessment data:", error);
    }
  };

  const handleAssessmentChange = async (e) => {
    const assessmentId = e.target.value;
    const selected = allAssessments.find(a => a.id === assessmentId);
    if (selected && candidate) {
      setLoading(true);
      await loadAssessmentData(selected, candidate);
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  if (loadingTimeout) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Loading Timeout</h2>
          <p>The report is taking too long to generate. This could be due to:</p>
          <ul style={{textAlign: 'left', marginTop: '10px'}}>
            <li>Large amount of data to process</li>
            <li>Network connectivity issues</li>
            <li>Server processing delay</li>
          </ul>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Try Again
          </button>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backLink}>← Back to Dashboard</a>
          </Link>
        </div>
      </div>
    );
  }

  if (!authChecked || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>
            {!authChecked ? "Verifying credentials..." : "Generating report..."}
          </p>
          <p style={styles.loadingSubtext}>
            {!authChecked ? "Checking your access level" : "Analyzing candidate performance data"}
          </p>
        </div>
      </div>
    );
  }

  if (!isSupervisor) {
    return null;
  }

  if (!candidate || !selectedAssessment || !stratavaxReport) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <h3>No Assessment Data Available</h3>
        <p>This candidate hasn't completed any assessments yet, or the results haven't been processed.</p>
        
        <Link href="/supervisor" legacyBehavior>
          <a style={styles.primaryButton}>← Back to Dashboard</a>
        </Link>
      </div>
    );
  }

  const report = selectedAssessment.report.stratavaxReport;
  const config = selectedAssessment.config || assessmentTypes.general;
  const assessmentDisplayName = selectedAssessment.assessment_name || config.name;

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Dashboard</a>
          </Link>
          <div style={styles.headerActions}>
            {superAnalysis && (
              <div style={styles.profileIdBadge}>
                <span style={styles.profileIdLabel}>Profile ID:</span>
                <span style={styles.profileIdValue}>{superAnalysis.profileId}</span>
              </div>
            )}
            {superAnalysisError && (
              <div style={styles.warningBadge}>
                ⚠️ Enhanced analysis unavailable
              </div>
            )}
            {allAssessments.length > 1 && (
              <select 
                value={selectedAssessment.id} 
                onChange={handleAssessmentChange}
                style={styles.assessmentSelect}
              >
                <option value="">-- Select Assessment --</option>
                {allAssessments.map((a, index) => {
                  const type = a.assessment?.assessment_type?.code || a.assessment_type || 'general';
                  const config = getAssessmentType(type);
                  const assessmentDate = new Date(a.completed_at).toLocaleDateString();
                  
                  return (
                    <option key={a.id} value={a.id}>
                      {config.name} #{index + 1} - {assessmentDate}
                    </option>
                  );
                })}
              </select>
            )}
            <button onClick={handlePrint} style={styles.printButton}>
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>

        <div style={styles.navigation}>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'cover' ? '3px solid #0A1929' : '3px solid transparent'}}
            onClick={() => setActiveSection('cover')}
          >
            Cover
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'executive' ? '3px solid #0A1929' : '3px solid transparent'}}
            onClick={() => setActiveSection('executive')}
          >
            Executive Summary
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'breakdown' ? '3px solid #0A1929' : '3px solid transparent'}}
            onClick={() => setActiveSection('breakdown')}
          >
            Score Breakdown
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'competency' ? '3px solid #0A1929' : '3px solid transparent'}}
            onClick={() => {
              setActiveSection('competency');
              setShowCompetencyView(true);
            }}
          >
            Competency Analysis
          </button>
          {/* NEW: Behavioral Insights Navigation Button */}
          {behavioralData && (
            <button 
              style={{...styles.navItem, borderBottom: activeSection === 'behavioral' ? '3px solid #0A1929' : '3px solid transparent', color: '#9C27B0'}}
              onClick={() => setActiveSection('behavioral')}
            >
              🧠 Behavioral Insights
            </button>
          )}
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'strengths' ? '3px solid #0A1929' : '3px solid transparent'}}
            onClick={() => setActiveSection('strengths')}
          >
            Strengths & Weaknesses
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'recommendations' ? '3px solid #0A1929' : '3px solid transparent'}}
            onClick={() => setActiveSection('recommendations')}
          >
            Recommendations
          </button>
          {superAnalysis && (
            <button 
              style={{...styles.navItem, borderBottom: activeSection === 'super' ? '3px solid #0A1929' : '3px solid transparent', color: '#9C27B0'}}
              onClick={() => setActiveSection('super')}
            >
              🔮 Super Analysis
            </button>
          )}
        </div>

        <div ref={reportRef} style={styles.reportContainer}>
          {/* SECTION 1: COVER PAGE */}
          <section style={{...styles.section, display: activeSection === 'cover' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.coverPage}>
              <div style={styles.coverHeader}>
                <h1 style={styles.coverTitle}>STRATAVAX</h1>
                <p style={styles.coverSubtitle}>{assessmentDisplayName}</p>
              </div>
              
              <div style={styles.coverContent}>
                <div style={styles.coverLogo}>📊</div>
                <h2 style={styles.coverCandidateName}>{candidate.full_name}</h2>
                <p style={styles.coverDetail}>Assessment: {assessmentDisplayName}</p>
                <p style={styles.coverDetail}>Date Taken: {new Date(selectedAssessment.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style={styles.coverDetail}>Report Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {superAnalysis && (
                  <p style={styles.coverDetail}>Profile ID: {superAnalysis.profileId}</p>
                )}
                <div style={styles.coverBadge}>CONFIDENTIAL</div>
              </div>
              
              <div style={styles.coverFooter}>
                <p>© Stratavax • All Rights Reserved</p>
              </div>
            </div>
          </section>

          {/* SECTION 2: EXECUTIVE SUMMARY */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'executive' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Executive Summary</h2>
            </div>
            
            <div style={styles.executiveSummary}>
              <div style={styles.scoreGrid}>
                <div style={styles.scoreItem}>
                  <span style={styles.scoreLabel}>Total Score</span>
                  <span style={styles.scoreValue}>{report.executiveSummary.totalScore}</span>
                </div>
                <div style={styles.scoreItem}>
                  <span style={styles.scoreLabel}>Percentage</span>
                  <span style={{...styles.scoreValue, color: report.executiveSummary.percentage >= 80 ? '#4CAF50' : report.executiveSummary.percentage >= 55 ? '#FF9800' : '#F44336'}}>
                    {report.executiveSummary.percentage}%
                  </span>
                </div>
                <div style={styles.scoreItem}>
                  <span style={styles.scoreLabel}>Grade</span>
                  <span style={styles.scoreValue}>{report.executiveSummary.grade}</span>
                </div>
                <div style={styles.scoreItem}>
                  <span style={styles.scoreLabel}>Classification</span>
                  <span style={{
                    ...styles.classificationPill,
                    background: report.executiveSummary.classification === 'High Potential' ? '#4CAF50' :
                               report.executiveSummary.classification === 'Strong Performer' ? '#2196F3' :
                               report.executiveSummary.classification === 'Developing' ? '#FF9800' : '#F44336',
                    color: 'white'
                  }}>
                    {report.executiveSummary.classification}
                  </span>
                </div>
              </div>

              <div style={styles.narrativeBox}>
                <p style={styles.narrativeText}>
                  {report.executiveSummary.narrative.includes('General Assessment') 
                    ? report.executiveSummary.narrative.replace('General Assessment', assessmentDisplayName)
                    : report.executiveSummary.narrative}
                </p>
                <p style={styles.narrativeDescription}>{report.executiveSummary.classificationDescription}</p>
              </div>

              {/* Quick Stats with Behavioral Summary */}
              {behavioralData && (
                <div style={styles.insightsGrid}>
                  <div style={styles.insightCard}>
                    <span style={styles.insightIcon}>🧠</span>
                    <div>
                      <span style={styles.insightLabel}>Work Style</span>
                      <span style={styles.insightValue}>{behavioralData.work_style || 'Balanced'}</span>
                    </div>
                  </div>
                  <div style={styles.insightCard}>
                    <span style={styles.insightIcon}>⚡</span>
                    <div>
                      <span style={styles.insightLabel}>Confidence</span>
                      <span style={styles.insightValue}>{behavioralData.confidence_level || 'Moderate'}</span>
                    </div>
                  </div>
                  <div style={styles.insightCard}>
                    <span style={styles.insightIcon}>⏱️</span>
                    <div>
                      <span style={styles.insightLabel}>Avg Response</span>
                      <span style={styles.insightValue}>{behavioralData.avg_response_time || 0}s</span>
                    </div>
                  </div>
                  <div style={styles.insightCard}>
                    <span style={styles.insightIcon}>🔄</span>
                    <div>
                      <span style={styles.insightLabel}>Answer Changes</span>
                      <span style={styles.insightValue}>{behavioralData.total_answer_changes || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3: SCORE BREAKDOWN */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'breakdown' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Score Breakdown</h2>
            </div>
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Category</th>
                    <th style={styles.tableHead}>Score</th>
                    <th style={styles.tableHead}>Percentage</th>
                    <th style={styles.tableHead}>Grade</th>
                    <th style={styles.tableHead}>Performance</th>
                   </tr>
                </thead>
                <tbody>
                  {report.scoreBreakdown.map((item, index) => (
                    <tr key={index} style={styles.tableRow}>
                      <td style={styles.tableCell}>{item.category}</td>
                      <td style={styles.tableCell}>{item.score}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.percentageContainer}>
                          <span style={styles.percentageText}>{item.percentage}%</span>
                          <div style={styles.progressBarContainer}>
                            <div style={{
                              ...styles.progressBar,
                              width: `${item.percentage}%`,
                              background: item.percentage >= 80 ? 'linear-gradient(90deg, #0A5C2E, #4CAF50)' :
                                         item.percentage >= 60 ? 'linear-gradient(90deg, #1565C0, #2196F3)' :
                                         item.percentage >= 40 ? 'linear-gradient(90deg, #E65100, #FF9800)' : 'linear-gradient(90deg, #B71C1C, #F44336)'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.gradeBadge}>{item.grade}</span>
                      </td>
                      <td style={styles.tableCell}>{item.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={styles.tableFootnote}>Performance metrics based on {assessmentDisplayName} criteria and standardized scoring rubrics.</p>
          </section>

          {/* SECTION 4: COMPETENCY ANALYSIS */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'competency' || (showPrintView && competencyData.length > 0) ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Competency Analysis</h2>
              <p style={styles.sectionSubtitle}>Professional interpretation of core competencies measured in this {assessmentDisplayName.toLowerCase()}</p>
            </div>
            
            {competencyData && competencyData.length > 0 ? (
              <>
                <div style={styles.competencyOverallNarrative}>
                  <div style={styles.narrativeBox}>
                    <h4 style={styles.narrativeSubtitle}>Competency Profile Summary</h4>
                    <p style={styles.narrativeText}>
                      {generateProfileCommentary(
                        selectedAssessment.percentage,
                        report.executiveSummary.classification,
                        competencyData.filter(c => c.percentage >= 70).map(c => ({ area: c.competencies.name, percentage: c.percentage })),
                        competencyData.filter(c => c.percentage < 60).map(c => ({ area: c.competencies.name, percentage: c.percentage }))
                      )}
                    </p>
                  </div>
                </div>

                <div style={styles.competencySummaryGrid}>
                  <div style={styles.competencySummaryCard}>
                    <span style={styles.competencySummaryLabel}>Competencies Assessed</span>
                    <span style={styles.competencySummaryValue}>{competencyData.length}</span>
                  </div>
                  <div style={styles.competencySummaryCard}>
                    <span style={styles.competencySummaryLabel}>Strong (≥80%)</span>
                    <span style={{...styles.competencySummaryValue, color: '#4CAF50'}}>
                      {competencyData.filter(c => c.classification === 'Strong').length}
                    </span>
                  </div>
                  <div style={styles.competencySummaryCard}>
                    <span style={styles.competencySummaryLabel}>Moderate (55-79%)</span>
                    <span style={{...styles.competencySummaryValue, color: '#FF9800'}}>
                      {competencyData.filter(c => c.classification === 'Moderate').length}
                    </span>
                  </div>
                  <div style={styles.competencySummaryCard}>
                    <span style={styles.competencySummaryLabel}>Needs Development (&lt;55%)</span>
                    <span style={{...styles.competencySummaryValue, color: '#F44336'}}>
                      {competencyData.filter(c => c.classification === 'Needs Development').length}
                    </span>
                  </div>
                </div>

                <div style={styles.competencyGrid}>
                  {competencyData.map(comp => {
                    const commentary = generateCommentary(
                      comp.competencies.name, 
                      comp.percentage, 
                      comp.classification === 'Strong' ? 'strength' : 
                      comp.classification === 'Moderate' ? 'neutral' : 'weakness'
                    );
                    
                    const detailedInterpretation = competencyInterpretation?.categoryInterpretation?.[comp.competencies.name]?.interpretation;
                    
                    return (
                      <div key={comp.id} style={{
                        ...styles.competencyCard,
                        borderLeft: `6px solid ${
                          comp.classification === 'Strong' ? '#4CAF50' :
                          comp.classification === 'Moderate' ? '#FF9800' : '#F44336'
                        }`
                      }}>
                        <div style={styles.competencyHeader}>
                          <div>
                            <span style={styles.competencyName}>{comp.competencies.name}</span>
                            <span style={styles.competencyCategory}>{comp.competencies.category}</span>
                          </div>
                          <div style={styles.competencyScoreContainer}>
                            <span style={{
                              ...styles.competencyScore,
                              color: comp.classification === 'Strong' ? '#4CAF50' :
                                     comp.classification === 'Moderate' ? '#FF9800' : '#F44336'
                            }}>
                              {comp.percentage}%
                            </span>
                            <span style={styles.competencyBadge}>{comp.classification}</span>
                          </div>
                        </div>
                        
                        <div style={styles.competencyBarContainer}>
                          <div style={styles.competencyBar}>
                            <div style={{
                              width: `${comp.percentage}%`,
                              height: '10px',
                              background: comp.classification === 'Strong' ? '#4CAF50' :
                                         comp.classification === 'Moderate' ? '#FF9800' : '#F44336',
                              borderRadius: '5px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={styles.competencyTarget}>Target: 80%</span>
                        </div>
                        
                        <div style={styles.competencyCommentary}>
                          <p style={styles.commentaryText}>
                            {detailedInterpretation || commentary}
                          </p>
                        </div>
                        
                        <details style={styles.rawScoreDetails}>
                          <summary style={styles.rawScoreSummary}>View raw scores</summary>
                          <div style={styles.competencyDetails}>
                            <div style={styles.competencyDetail}>
                              <span style={styles.competencyDetailLabel}>Raw Score:</span>
                              <span style={styles.competencyDetailValue}>{Math.round(comp.raw_score)}/{Math.round(comp.max_possible)}</span>
                            </div>
                            <div style={styles.competencyDetail}>
                              <span style={styles.competencyDetailLabel}>Questions:</span>
                              <span style={styles.competencyDetailValue}>{comp.question_count}</span>
                            </div>
                          </div>
                        </details>
                        
                        {comp.gap > 0 && (
                          <div style={styles.competencyGap}>
                            <span style={styles.gapIcon}>📈</span>
                            <span style={styles.gapText}>
                              Development opportunity: {comp.gap.toFixed(1)}% gap to proficiency target
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {competencyInterpretation && (
                  <div style={styles.competencyInterpretation}>
                    <h4 style={styles.interpretationTitle}>Professional Profile Analysis</h4>
                    <p style={styles.interpretationText}>
                      {competencyInterpretation.overallSummary}
                    </p>
                    
                    {competencyInterpretation.topStrengths?.length > 0 && (
                      <div style={styles.interpretationSection}>
                        <h5 style={styles.interpretationSubtitle}>🔷 Key Strengths</h5>
                        <ul style={styles.interpretationList}>
                          {competencyInterpretation.topStrengths.map((strength, idx) => {
                            const strengthCommentary = generateCommentary(strength, 80, 'strength');
                            return (
                              <li key={idx} style={styles.interpretationListItem}>
                                <strong>{strength}:</strong> {strengthCommentary}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    {competencyInterpretation.topWeaknesses?.length > 0 && (
                      <div style={styles.interpretationSection}>
                        <h5 style={{...styles.interpretationSubtitle, color: '#B91C1C'}}>⚠️ Development Priorities</h5>
                        <ul style={styles.interpretationList}>
                          {competencyInterpretation.topWeaknesses.map((weakness, idx) => {
                            const weaknessCommentary = generateCommentary(weakness, 50, 'weakness');
                            return (
                              <li key={idx} style={styles.interpretationListItem}>
                                <strong>{weakness}:</strong> {weaknessCommentary}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    {competencyInterpretation.suitability && competencyInterpretation.suitability.length > 0 && (
                      <div style={styles.interpretationSection}>
                        <h5 style={styles.interpretationSubtitle}>✓ Role Suitability</h5>
                        <ul style={styles.suitabilityList}>
                          {competencyInterpretation.suitability.map((item, idx) => (
                            <li key={idx} style={styles.suitabilityItem}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {competencyInterpretation.risks && competencyInterpretation.risks.length > 0 && (
                      <div style={styles.interpretationSection}>
                        <h5 style={{...styles.interpretationSubtitle, color: '#B91C1C'}}>⚠️ Considerations</h5>
                        <ul style={styles.risksList}>
                          {competencyInterpretation.risks.map((risk, idx) => (
                            <li key={idx} style={styles.riskItem}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={styles.noCompetencyData}>
                <p>Competency data is not available for this assessment. This may be because:</p>
                <ul style={styles.competencyBulletList}>
                  <li>The assessment was completed before the competency framework was implemented</li>
                  <li>Questions have not been mapped to competencies yet</li>
                  <li>The category_scores data is not present in the assessment result</li>
                </ul>
              </div>
            )}
          </section>

          {/* NEW SECTION: BEHAVIORAL INSIGHTS */}
          {behavioralData && (
            <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'behavioral' || showPrintView ? 'block' : 'none'}}>
              <div style={styles.sectionHeader}>
                <h2 style={{...styles.sectionTitle, color: '#9C27B0'}}>🧠 Behavioral Insights</h2>
                <p style={styles.sectionSubtitle}>How {candidate.full_name} approached the assessment - behavioral patterns and work style analysis</p>
              </div>
              
              <BehavioralInsights 
                behavioralData={behavioralData} 
                candidateName={candidate.full_name}
              />
            </section>
          )}

          {/* SECTION 5: STRENGTHS & WEAKNESSES */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'strengths' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Strengths & Development Areas</h2>
            </div>
            
            <div style={styles.strengthsSection}>
              <div style={styles.sectionBadge}>
                <span style={styles.badgeIcon}>🔷</span>
                <h3 style={styles.subsectionTitle}>Key Strengths</h3>
              </div>
              
              <div style={styles.narrativeBox}>
                <p style={styles.narrativeText}>{generateStrengthsSummary(report.strengths.items, report.strengths.topStrengths)}</p>
              </div>
              
              {report.strengths.items.length > 0 ? (
                <div style={styles.strengthsList}>
                  {report.strengths.items.slice(0, 4).map((strength, index) => (
                    <div key={index} style={styles.strengthCard}>
                      <div style={styles.strengthCardHeader}>
                        <span style={styles.strengthIcon}>⭐</span>
                        <span style={styles.strengthName}>{strength.area}</span>
                        <span style={styles.strengthScore}>{strength.percentage}% ({strength.grade})</span>
                      </div>
                      <div style={styles.strengthInterpretation}>
                        {generateCommentary(strength.area, strength.percentage, 'strength')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noStrengthsMessage}>
                  No significant strengths identified above the 80% threshold in this {assessmentDisplayName.toLowerCase()}.
                </div>
              )}
            </div>

            <div style={{...styles.strengthsSection, marginTop: '50px'}}>
              <div style={styles.sectionBadge}>
                <span style={styles.badgeIcon}>⚠️</span>
                <h3 style={{...styles.subsectionTitle, color: '#B71C1C'}}>Development Areas</h3>
              </div>
              
              <div style={{...styles.narrativeBox, background: '#FEF2F2', borderLeftColor: '#F44336'}}>
                <p style={styles.narrativeText}>{generateWeaknessesSummary(report.weaknesses.items, report.weaknesses.topWeaknesses, report.executiveSummary.percentage)}</p>
              </div>
              
              <div style={styles.developmentList}>
                {report.weaknesses.items.slice(0, 5).map((weakness, index) => {
                  const priority = weakness.percentage < 40 ? 'Critical' : weakness.percentage < 55 ? 'High' : 'Medium';
                  const priorityColor = priority === 'Critical' ? '#B71C1C' : priority === 'High' ? '#F57C00' : '#F9A825';
                  
                  return (
                    <div key={index} style={styles.developmentItem}>
                      <div style={styles.developmentItemHeader}>
                        <div style={styles.bulletContainer}>
                          <span style={{...styles.bulletPoint, backgroundColor: priorityColor}}></span>
                          <span style={styles.developmentArea}>{weakness.area}</span>
                        </div>
                        <div style={styles.developmentMetrics}>
                          <span style={{...styles.priorityBadge, backgroundColor: priorityColor, color: 'white'}}>
                            {priority}
                          </span>
                          <span style={styles.developmentScore}>{weakness.percentage}%</span>
                          <span style={styles.developmentGrade}>{weakness.grade}</span>
                        </div>
                      </div>
                      
                      <div style={styles.developmentInterpretation}>
                        {generateCommentary(weakness.area, weakness.percentage, 'weakness')}
                      </div>
                      
                      {weakness.gap > 0 && (
                        <div style={styles.gapIndicator}>
                          <span style={styles.gapIcon}>📈</span>
                          <span style={styles.gapText}>Development gap: {weakness.gap} points needed to reach proficiency target</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {report.weaknesses.items.length > 5 && (
                <details style={styles.moreDetails}>
                  <summary style={styles.moreSummary}>View {report.weaknesses.items.length - 5} additional development areas</summary>
                  <div style={styles.moreList}>
                    {report.weaknesses.items.slice(5).map((weakness, index) => (
                      <div key={index} style={styles.moreItem}>
                        <span style={styles.moreBullet}>•</span>
                        <span style={styles.moreArea}>{weakness.area}</span>
                        <span style={styles.morePercentage}>{weakness.percentage}%</span>
                        <span style={styles.moreGrade}>{weakness.grade}</span>
                        <span style={styles.moreInterpretation}>
                          {weakness.percentage < 40 ? 'Critical priority' : 
                           weakness.percentage < 55 ? 'High priority' : 
                           weakness.percentage < 70 ? 'Medium priority' : 'Low priority'}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            
            <div style={{...styles.narrativeBox, marginTop: '40px', background: '#F0F4F8'}}>
              <h4 style={{margin: '0 0 15px 0', color: '#0A1929'}}>Professional Profile Summary</h4>
              <p style={styles.narrativeText}>
                {generateProfileCommentary(
                  report.executiveSummary.percentage,
                  report.executiveSummary.classification,
                  report.strengths.items,
                  report.weaknesses.items
                )}
              </p>
              <p style={styles.narrativeFootnote}>
                This summary integrates findings from the {assessmentDisplayName.toLowerCase()} with the candidate's overall performance profile.
              </p>
            </div>
          </section>

          {/* SECTION 6: DEVELOPMENT RECOMMENDATIONS */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'recommendations' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Development Recommendations</h2>
            </div>
            
            <p style={styles.recommendationIntro}>
              Based on the {assessmentDisplayName.toLowerCase()} results, the following development actions are recommended:
            </p>
            
            <div style={styles.recommendationsList}>
              {report.recommendations.map((rec, index) => (
                <div key={index} style={{
                  ...styles.recommendationCard,
                  borderLeftColor: rec.priority === 'High' ? '#F44336' :
                                  rec.priority === 'Medium' ? '#FF9800' : '#4CAF50'
                }}>
                  <div style={styles.recHeader}>
                    <span style={{
                      ...styles.priorityBadge,
                      background: rec.priority === 'High' ? '#F44336' :
                                 rec.priority === 'Medium' ? '#FF9800' : '#4CAF50'
                    }}>
                      {rec.priority}
                    </span>
                    <span style={styles.recCategory}>{rec.category}</span>
                  </div>
                  <p style={styles.recText}>{rec.recommendation}</p>
                  <div style={styles.recAction}><strong>Action:</strong> {rec.action}</div>
                  <div style={styles.recImpact}><strong>Impact:</strong> {rec.impact}</div>
                </div>
              ))}
            </div>

            {report.strengths.topStrengths.length > 0 && (
              <div style={styles.tipBox}>
                <h4 style={styles.tipTitle}>🎯 Leverage Your Strengths</h4>
                <p>Your strongest areas in the {assessmentDisplayName.toLowerCase()} are <strong>{report.strengths.topStrengths.join(', ')}</strong>. Consider mentoring others and taking on projects that utilize these capabilities.</p>
              </div>
            )}

            {report.weaknesses.topWeaknesses.length > 0 && (
              <div style={{...styles.tipBox, background: '#FFEBEE', borderLeftColor: '#F44336'}}>
                <h4 style={{...styles.tipTitle, color: '#F44336'}}>⚠️ Priority Focus Areas</h4>
                <p>Focus immediate development on <strong>{report.weaknesses.topWeaknesses.join(', ')}</strong> as identified in the {assessmentDisplayName.toLowerCase()}. Create a 30-day plan with specific learning objectives.</p>
              </div>
            )}
          </section>

          {/* SECTION 7: SUPER ANALYSIS */}
          {superAnalysis && (
            <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'super' || showPrintView ? 'block' : 'none'}}>
              <div style={styles.sectionHeader}>
                <h2 style={{...styles.sectionTitle, color: '#9C27B0'}}>🔮 Super Analysis</h2>
                <p style={styles.sectionSubtitle}>12-dimensional personalized analysis for {candidate.full_name}</p>
              </div>

              <div style={styles.profileOverview}>
                <div style={styles.profileHeader}>
                  <span style={styles.profileIcon}>🌟</span>
                  <div>
                    <h3 style={styles.profileTitle}>Candidate Profile Summary</h3>
                    <p style={styles.profileDesc}>{superAnalysis.summary.oneLine}</p>
                  </div>
                </div>
              </div>

              {superAnalysis.patterns.crossCategory.length > 0 && (
                <div style={styles.patternsSection}>
                  <h4 style={styles.patternsTitle}>🔍 Patterns Detected</h4>
                  <div style={styles.patternsGrid}>
                    {superAnalysis.patterns.crossCategory.map((pattern, idx) => (
                      <div key={idx} style={{
                        ...styles.patternCard,
                        borderLeft: `6px solid ${
                          pattern.severity === 'Critical' ? '#F44336' :
                          pattern.severity === 'High' ? '#FF9800' :
                          pattern.severity === 'Medium' ? '#2196F3' : '#4CAF50'
                        }`
                      }}>
                        <div style={styles.patternHeader}>
                          <span style={styles.patternName}>{pattern.name}</span>
                          <span style={{
                            ...styles.patternSeverity,
                            background: pattern.severity === 'Critical' ? '#FEF2F2' :
                                       pattern.severity === 'High' ? '#FFF3E0' :
                                       pattern.severity === 'Medium' ? '#E3F2FD' : '#E8F5E9',
                            color: pattern.severity === 'Critical' ? '#B91C1C' :
                                   pattern.severity === 'High' ? '#F57C00' :
                                   pattern.severity === 'Medium' ? '#1565C0' : '#2E7D32'
                          }}>
                            {pattern.severity}
                          </span>
                        </div>
                        <p style={styles.patternDescription}>{pattern.description}</p>
                        <div style={styles.patternRecommendation}>
                          <span style={styles.patternRecIcon}>💡</span>
                          <span style={styles.patternRecText}>{pattern.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {superAnalysis.differentiators.length > 0 && (
                <div style={styles.differentiatorsSection}>
                  <h4 style={styles.differentiatorsTitle}>🏆 Competitive Differentiators</h4>
                  <div style={styles.differentiatorsGrid}>
                    {superAnalysis.differentiators.map((diff, idx) => (
                      <div key={idx} style={styles.differentiatorCard}>
                        <span style={styles.diffScore}>{diff.score}%</span>
                        <div style={styles.diffContent}>
                          <span style={styles.diffName}>{diff.differentiator}</span>
                          <p style={styles.diffValue}>{diff.value}</p>
                          <p style={styles.diffApplication}>{diff.application}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.readinessSection}>
                <h4 style={styles.readinessTitle}>🎯 Role Readiness Assessment</h4>
                <div style={styles.readinessGrid}>
                  <div style={styles.readinessCard}>
                    <span style={styles.readinessIcon}>👑</span>
                    <span style={styles.readinessLabel}>Executive</span>
                    <span style={{
                      ...styles.readinessLevel,
                      color: superAnalysis.roleReadiness.executive.ready ? '#4CAF50' : 
                             superAnalysis.roleReadiness.executive.score >= 65 ? '#FF9800' : '#F44336'
                    }}>
                      {superAnalysis.roleReadiness.executive.ready ? 'Ready Now' : 
                       superAnalysis.roleReadiness.executive.score >= 65 ? 'Developing' : 'Not Ready'}
                    </span>
                    <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.executive.score}%</span>
                    <p style={styles.readinessReasoning}>{superAnalysis.roleReadiness.executive.reasoning}</p>
                    <span style={styles.readinessTimeframe}>⏱️ {superAnalysis.roleReadiness.executive.timeframe}</span>
                  </div>

                  <div style={styles.readinessCard}>
                    <span style={styles.readinessIcon}>📋</span>
                    <span style={styles.readinessLabel}>Management</span>
                    <span style={{
                      ...styles.readinessLevel,
                      color: superAnalysis.roleReadiness.management.ready ? '#4CAF50' : 
                             superAnalysis.roleReadiness.management.score >= 60 ? '#FF9800' : '#F44336'
                    }}>
                      {superAnalysis.roleReadiness.management.ready ? 'Ready Now' : 
                       superAnalysis.roleReadiness.management.score >= 60 ? 'Developing' : 'Not Ready'}
                    </span>
                    <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.management.score}%</span>
                    <p style={styles.readinessReasoning}>{superAnalysis.roleReadiness.management.reasoning}</p>
                    <span style={styles.readinessTimeframe}>⏱️ {superAnalysis.roleReadiness.management.timeframe}</span>
                  </div>

                  <div style={styles.readinessCard}>
                    <span style={styles.readinessIcon}>⚙️</span>
                    <span style={styles.readinessLabel}>Technical</span>
                    <span style={{
                      ...styles.readinessLevel,
                      color: superAnalysis.roleReadiness.technical.ready ? '#4CAF50' : 
                             superAnalysis.roleReadiness.technical.score >= 60 ? '#FF9800' : '#F44336'
                    }}>
                      {superAnalysis.roleReadiness.technical.ready ? 'Ready' : 
                       superAnalysis.roleReadiness.technical.score >= 60 ? 'Developing' : 'Needs Work'}
                    </span>
                    <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.technical.score}%</span>
                    <p style={styles.readinessReasoning}>{superAnalysis.roleReadiness.technical.reasoning}</p>
                    <span style={styles.readinessScope}>Scope: {superAnalysis.roleReadiness.technical.scope}</span>
                  </div>

                  <div style={styles.readinessCard}>
                    <span style={styles.readinessIcon}>🧠</span>
                    <span style={styles.readinessLabel}>Analytical</span>
                    <span style={{
                      ...styles.readinessLevel,
                      color: superAnalysis.roleReadiness.analytical.ready ? '#4CAF50' : 
                             superAnalysis.roleReadiness.analytical.score >= 60 ? '#FF9800' : '#F44336'
                    }}>
                      {superAnalysis.roleReadiness.analytical.ready ? 'Ready' : 
                       superAnalysis.roleReadiness.analytical.score >= 60 ? 'Developing' : 'Needs Work'}
                    </span>
                    <span style={styles.readinessScore}>Score: {superAnalysis.roleReadiness.analytical.score}%</span>
                    <p style={styles.readinessReasoning}>{superAnalysis.roleReadiness.analytical.reasoning}</p>
                    <span style={styles.readinessScope}>Scope: {superAnalysis.roleReadiness.analytical.scope}</span>
                  </div>
                </div>
              </div>

              {superAnalysis.predictiveInsights.length > 0 && (
                <div style={styles.predictiveBox}>
                  <h4 style={styles.predictiveTitle}>🔮 Predictive Insights</h4>
                  {superAnalysis.predictiveInsights.map((insight, idx) => (
                    <div key={idx} style={{
                      ...styles.predictiveItem,
                      borderLeft: `4px solid ${
                        insight.type === 'Risk' ? '#F44336' :
                        insight.type === 'Critical Risk' ? '#B71C1C' :
                        insight.type === 'Opportunity' ? '#4CAF50' : '#FF9800'
                      }`
                    }}>
                      <span style={styles.predictiveType}>{insight.type}</span>
                      <p style={styles.predictiveText}>{insight.insight}</p>
                      <div style={styles.predictiveMeta}>
                        <span style={styles.predictiveProbability}>Probability: {insight.probability}</span>
                        <span style={styles.predictiveImpact}>Impact: {insight.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.roadmapSection}>
                <h4 style={styles.roadmapTitle}>🗺️ Personalized Development Roadmap</h4>

                {superAnalysis.developmentRoadmap.immediate.length > 0 && (
                  <div style={styles.roadmapPhase}>
                    <div style={styles.phaseHeader}>
                      <span style={styles.phaseIcon}>🔴</span>
                      <h5 style={styles.phaseTitle}>Immediate Priorities (0-3 months)</h5>
                    </div>
                    <div style={styles.phaseItems}>
                      {superAnalysis.developmentRoadmap.immediate.map((item, idx) => (
                        <div key={idx} style={styles.phaseItem}>
                          <div style={styles.phaseItemHeader}>
                            <span style={styles.phaseItemArea}>{item.area}</span>
                            {!item.isPattern && <span style={styles.phaseItemGap}>Gap: {item.gap}%</span>}
                          </div>
                          {item.recommendation && (
                            <p style={styles.phaseItemRec}>{item.recommendation}</p>
                          )}
                          {item.actions && item.actions.length > 0 && (
                            <ul style={styles.phaseItemActions}>
                              {item.actions.map((action, actionIdx) => (
                                <li key={actionIdx} style={styles.phaseItemAction}>• {action}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {superAnalysis.developmentRoadmap.shortTerm.length > 0 && (
                  <div style={styles.roadmapPhase}>
                    <div style={styles.phaseHeader}>
                      <span style={styles.phaseIcon}>🟠</span>
                      <h5 style={styles.phaseTitle}>Short-term Goals (3-6 months)</h5>
                    </div>
                    <div style={styles.phaseItems}>
                      {superAnalysis.developmentRoadmap.shortTerm.map((item, idx) => (
                        <div key={idx} style={styles.phaseItem}>
                          <div style={styles.phaseItemHeader}>
                            <span style={styles.phaseItemArea}>{item.area}</span>
                            {!item.isPattern && <span style={styles.phaseItemGap}>Gap: {item.gap}%</span>}
                          </div>
                          {item.recommendation && (
                            <p style={styles.phaseItemRec}>{item.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media print {
          body { background: white; }
          button, .no-print { display: none; }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  // ... (keep all your existing styles exactly as they are)
  // The styles object is very long, so I'm not reprinting it here.
  // Keep your existing styles object exactly as it is in your current file.
  
  // Add these new styles for the insights grid
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginTop: '20px'
  },
  insightCard: {
    background: '#F8FAFC',
    padding: '15px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid #E2E8F0'
  },
  insightIcon: {
    fontSize: '24px'
  },
  insightLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#718096',
    marginBottom: '4px'
  },
  insightValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A1929'
  }
};

export default CandidateReport;
