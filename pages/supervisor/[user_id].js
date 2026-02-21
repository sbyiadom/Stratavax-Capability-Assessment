import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from 'next/dynamic';
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateDetailedInterpretation } from "../../utils/detailedInterpreter";
import { getClassification, getGradeInfo, getHiringRecommendation } from "../../utils/reportGenerator";
import { assessmentTypes, getAssessmentType } from "../../utils/assessmentConfigs";
import { getDevelopmentRecommendation } from "../../utils/developmentRecommendations";
import { generatePsychometricAnalysis } from "../../utils/psychometricAnalyzer";
import {
  interpretIntegrity,
  interpretWorkPace,
  interpretMotivations,
  interpretNeuroticism,
  interpretExtraversion,
  interpretMixedTraits,
  interpretAgreeableness,
  interpretBehavioralStyle,
  interpretConscientiousness,
  interpretPerformanceRisks,
  interpretStressManagement,
  interpretCognitivePatterns,
  interpretEmotionalIntelligence,
  interpretOpenness,
  interpretVision,
  interpretDecisionMaking,
  interpretInfluence,
  interpretPeopleManagement,
  interpretChangeLeadership,
  interpretExecution,
  interpretResilience,
  interpretSelfAwareness,
  interpretLogicalReasoning,
  interpretNumericalReasoning,
  interpretVerbalReasoning,
  interpretSpatialReasoning,
  interpretMemoryAttention,
  interpretPerceptualSpeed,
  interpretCriticalThinking,
  interpretLearningAgility,
  interpretMentalFlexibility,
  interpretTechnicalKnowledge,
  interpretSystemUnderstanding,
  interpretTroubleshooting,
  interpretPracticalApplication,
  interpretSafetyCompliance,
  interpretQualityControl,
  interpretProcessOptimization,
  interpretEquipmentOperation,
  interpretMaintenanceProcedures,
  interpretTechnicalDocumentation,
  interpretProductivity,
  interpretWorkQuality,
  interpretGoalAchievement,
  interpretAccountability,
  interpretInitiative,
  interpretCollaboration,
  interpretTimeManagement,
  interpretResultsOrientation,
  interpretTeamwork,
  interpretConflictResolution,
  interpretEmpathy,
  interpretActiveListening,
  interpretFeedbackReception,
  interpretInterpersonalSkills,
  interpretProfessionalism,
  interpretValuesAlignment,
  interpretWorkEthic,
  interpretDiversityAwareness,
  interpretInclusivity,
  interpretRespect
} from "../../utils/categoryInterpreter";

// Disable SSR for the entire component to prevent hydration issues
const CandidateReport = dynamic(
  () => Promise.resolve(CandidateReportComponent),
  { 
    ssr: false,
    loading: () => (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading report...</p>
      </div>
    )
  }
);

export default CandidateReport;

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
  const [activeSection, setActiveSection] = useState('cover');
  const [showPrintView, setShowPrintView] = useState(false);
  const [assessmentConfig, setAssessmentConfig] = useState(null);
  const [psychometricAnalysis, setPsychometricAnalysis] = useState(null);

  // Authentication check - runs only once on client
  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof window === 'undefined') return;
        
        console.log("1. Checking auth...");
        const supervisorSession = localStorage.getItem("supervisorSession");
        console.log("2. Session from localStorage:", supervisorSession ? "Found" : "Not found");
        
        if (!supervisorSession) {
          console.log("3. No session found, redirecting to login");
          router.push("/supervisor-login");
          return;
        }
        
        const session = JSON.parse(supervisorSession);
        console.log("4. Parsed session:", { 
          loggedIn: session.loggedIn, 
          user_id: session.user_id,
          hasTokens: !!(session.access_token || session.refresh_token)
        });
        
        if (session.loggedIn) {
          console.log("5. User is logged in, setting isSupervisor=true");
          setIsSupervisor(true);
        } else {
          console.log("5. User not logged in, redirecting");
          router.push("/supervisor-login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/supervisor-login");
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, [router]);

  // Fetch data only after auth is confirmed and we have a user_id
  useEffect(() => {
    // Don't do anything until auth is checked
    if (!authChecked) return;
    
    // If not a supervisor, don't fetch data
    if (!isSupervisor) return;
    
    // If no user_id in URL, can't fetch
    if (!user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        console.log("Fetching data for user:", user_id);
        
        // Get current session to ensure token is fresh
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
        }
        
        if (!currentSession) {
          console.log("No active session, attempting to restore from localStorage...");
          
          // Manual fallback: try to get session from custom storage
          const supervisorSession = localStorage.getItem("supervisorSession");
          
          if (!supervisorSession) {
            console.error("No supervisor session in localStorage either");
            router.push("/supervisor-login");
            return;
          }
          
          try {
            // Try to restore the session using the stored data
            const sessionData = JSON.parse(supervisorSession);
            
            // If we have tokens, try to set the session
            if (sessionData.access_token) {
              await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token || ''
              });
              console.log("Session restored manually");
            } else {
              console.error("No tokens in stored session");
              router.push("/supervisor-login");
              return;
            }
          } catch (e) {
            console.error("Failed to restore session:", e);
            router.push("/supervisor-login");
            return;
          }
        }

        // Fetch candidate profile
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
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        // Fetch assessment results
        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error("Error fetching results:", resultsError);
        }

        if (resultsData && resultsData.length > 0) {
          console.log(`Found ${resultsData.length} assessments`);
          setAllAssessments(resultsData);
          
          const defaultAssessment = resultsData[0];
          await loadAssessmentData(defaultAssessment, profileData);
        } else {
          console.log("No assessment results found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [authChecked, isSupervisor, user_id, router]);

  const loadAssessmentData = async (result, profileData) => {
    try {
      const percentage = Math.round((result.total_score / result.max_score) * 100);
      
      const assessmentTypeId = result.assessment_type || 'general';
      const config = getAssessmentType(assessmentTypeId);
      setAssessmentConfig(config);

      // Fetch responses with questions and answers
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

      const processedResponses = responsesData?.map(r => ({
        question_id: r.question_id,
        answer_id: r.answer_id,
        category: r.unique_questions?.section || 'General',
        question_text: r.unique_questions?.question_text,
        answer_text: r.unique_answers?.answer_text,
        score: r.unique_answers?.score
      })) || [];

      const responseInsights = {};
      
      processedResponses.forEach(r => {
        if (!responseInsights[r.category]) {
          responseInsights[r.category] = {
            insights: [],
            scores: [],
            questionCount: 0,
            highScoreCount: 0,
            lowScoreCount: 0,
            questionDetails: []
          };
        }
        
        const cat = responseInsights[r.category];
        cat.insights.push(generateInsight(r.category, r.question_text, r.answer_text, r.score));
        cat.scores.push(r.score);
        cat.questionCount++;
        cat.questionDetails.push({
          question: r.question_text,
          answer: r.answer_text,
          score: r.score
        });
        
        if (r.score >= 4) cat.highScoreCount++;
        if (r.score <= 2) cat.lowScoreCount++;
      });

      Object.keys(responseInsights).forEach(cat => {
        const data = responseInsights[cat];
        const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        data.percentage = Math.round((avgScore / 5) * 100);
      });

      const detailedInterpretation = generateDetailedInterpretation(
        profileData?.full_name || 'Candidate',
        result.category_scores,
        assessmentTypeId,
        responseInsights
      );

      // Generate psychometric analysis
      const analysis = generatePsychometricAnalysis(
        result.category_scores,
        assessmentTypeId,
        profileData?.full_name || 'Candidate',
        responseInsights
      );
      setPsychometricAnalysis(analysis);
      
      setSelectedAssessment({
        id: result.id,
        assessment_id: result.assessment_id,
        assessment_type: assessmentTypeId,
        assessment_name: config.name,
        total_score: result.total_score,
        max_score: result.max_score,
        percentage: percentage,
        completed_at: result.completed_at,
        category_scores: result.category_scores || {},
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        recommendations: result.recommendations || [],
        interpretations: result.interpretations || {},
        detailedInterpretation: detailedInterpretation,
        responseInsights: responseInsights,
        config: config
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment data:", error);
      setLoading(false);
    }
  };

  const handleAssessmentChange = async (e) => {
    const assessmentId = e.target.value;
    const selected = allAssessments.find(a => a.id === assessmentId);
    if (selected) {
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

  const generateInsight = (category, questionText, answerText, score) => {
    if (score === 5) {
      return `Strong understanding demonstrated`;
    } else if (score === 4) {
      return `Good grasp shown`;
    } else if (score === 3) {
      return `Basic awareness demonstrated`;
    } else if (score === 2) {
      return `Limited understanding shown`;
    } else {
      return `Significant gap identified`;
    }
  };

  // Show loading while checking auth or fetching data
  if (!authChecked || loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>{!authChecked ? "Checking authentication..." : "Loading candidate report..."}</p>
      </div>
    );
  }

  // If not a supervisor after auth check, redirect (though useEffect should handle this)
  if (!isSupervisor) {
    return null;
  }

  if (!candidate || !selectedAssessment) {
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

  const classification = getClassification(selectedAssessment.percentage);
  const gradeInfo = getGradeInfo(selectedAssessment.percentage);
  const hiringRec = getHiringRecommendation(selectedAssessment.percentage, selectedAssessment.strengths, selectedAssessment.weaknesses);
  const strengthsList = selectedAssessment.strengths || [];
  const weaknessesList = selectedAssessment.weaknesses || [];
  const config = selectedAssessment.config || assessmentTypes.general;

  const totalCombinedScore = allAssessments.reduce((sum, a) => sum + a.total_score, 0);
  const totalMaxScore = allAssessments.reduce((sum, a) => sum + a.max_score, 0);
  const combinedPercentage = Math.round((totalCombinedScore / totalMaxScore) * 100);

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Dashboard</a>
          </Link>
          <div style={styles.headerActions}>
            {allAssessments.length > 1 && (
              <select 
                value={selectedAssessment.id} 
                onChange={handleAssessmentChange}
                style={styles.assessmentSelect}
              >
                <option value="">-- Select Assessment --</option>
                {allAssessments.map((a, index) => {
                  const type = a.assessment_type || 'general';
                  const config = getAssessmentType(type);
                  const assessmentDate = new Date(a.completed_at).toLocaleDateString();
                  const scoreLabel = `${a.total_score}/${a.max_score}`;
                  
                  return (
                    <option key={a.id} value={a.id}>
                      {config.name} #{index + 1} - {assessmentDate} ({scoreLabel})
                    </option>
                  );
                })}
              </select>
            )}
            <button onClick={handlePrint} style={styles.printButton}>
              🖨️ Print Report
            </button>
          </div>
        </div>

        <div style={styles.navigation}>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'cover' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('cover')}
          >
            Cover
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'executive' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('executive')}
          >
            Executive Summary
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'overview' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('overview')}
          >
            Assessment Overview
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'competencies' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('competencies')}
          >
            Competency Breakdown
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'development' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('development')}
          >
            Development Plan
          </button>
        </div>

        <div ref={reportRef} style={styles.reportContainer}>
          {/* 1️⃣ Cover Page */}
          <section style={{...styles.section, display: activeSection === 'cover' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.coverPage}>
              <div style={styles.coverHeader}>
                <h1 style={styles.coverTitle}>Stratavax Assessment Platform</h1>
                <p style={styles.coverSubtitle}>{config.name}</p>
              </div>
              
              <div style={styles.coverContent}>
                <div style={styles.coverLogo}>📊</div>
                <h2 style={styles.coverCandidateName}>{candidate.full_name}</h2>
                <p style={styles.coverDetail}>Assessment Date: {new Date(selectedAssessment.completed_at).toLocaleDateString()}</p>
                <p style={styles.coverDetail}>Report Generated: {new Date().toLocaleDateString()}</p>
                <div style={styles.coverBadge}>CONFIDENTIAL</div>
              </div>
              
              <div style={styles.coverFooter}>
                <p>© Stratavax Assessment Platform • All Rights Reserved</p>
              </div>
            </div>
          </section>

          {/* 2️⃣ Executive Summary */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'executive' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>2. Executive Summary</h2>
            </div>
            
            <div style={styles.executiveSummary}>
              <div style={styles.scoreCard}>
                <div style={styles.scoreCardHeader}>
                  <span style={styles.scoreCardLabel}>Total Score</span>
                  <span style={styles.scoreCardValue}>{selectedAssessment.total_score}/{selectedAssessment.max_score}</span>
                </div>
                <div style={styles.scoreCardBody}>
                  <div style={styles.scoreMetric}>
                    <span style={styles.scoreMetricLabel}>Percentage</span>
                    <span style={{...styles.scoreMetricValue, color: classification.color}}>{selectedAssessment.percentage}%</span>
                  </div>
                  <div style={styles.scoreMetric}>
                    <span style={styles.scoreMetricLabel}>Grade</span>
                    <span style={styles.scoreMetricValue}>{gradeInfo.grade} ({gradeInfo.text})</span>
                  </div>
                </div>
              </div>

              <div style={styles.classificationCard}>
                <div style={{...styles.classificationBadge, background: classification.bg, color: classification.color}}>
                  {classification.label}
                </div>
                <p style={styles.classificationDescription}>{classification.description}</p>
              </div>

              <div style={styles.verdictCard}>
                <h3 style={styles.verdictTitle}>Executive Verdict</h3>
                <div style={{...styles.verdictBadge, background: hiringRec.color, color: 'white'}}>
                  {hiringRec.recommendation}
                </div>
                <p style={styles.verdictSummary}>{hiringRec.summary}</p>
                
                <div style={styles.keyPoints}>
                  <div style={styles.keyPoint}>
                    <span style={styles.keyPointIcon}>✅</span>
                    <div>
                      <strong>Key Strength:</strong> {strengthsList[0] || 'None identified'}
                    </div>
                  </div>
                  <div style={styles.keyPoint}>
                    <span style={styles.keyPointIcon}>⚠️</span>
                    <div>
                      <strong>Major Risk:</strong> {weaknessesList[0] || 'None identified'}
                    </div>
                  </div>
                </div>
              </div>

              {allAssessments.length > 1 && (
                <div style={styles.combinedScoreCard}>
                  <h3 style={styles.combinedScoreTitle}>Combined Performance (All Assessments)</h3>
                  <div style={styles.combinedScoreContent}>
                    <div style={styles.combinedScoreItem}>
                      <span style={styles.combinedScoreLabel}>Total Combined Score</span>
                      <span style={styles.combinedScoreValue}>{totalCombinedScore}/{totalMaxScore}</span>
                    </div>
                    <div style={styles.combinedScoreItem}>
                      <span style={styles.combinedScoreLabel}>Overall Percentage</span>
                      <span style={styles.combinedScoreValue}>{combinedPercentage}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 3️⃣ Assessment Overview */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'overview' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>3. Assessment Overview</h2>
            </div>
            
            <div style={styles.overviewCard}>
              <div style={styles.overviewGrid}>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Assessment Type</h4>
                  <p style={styles.overviewItemValue}>{config.name}</p>
                  <p style={styles.overviewItemSub}>{config.description}</p>
                </div>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Assessment Method</h4>
                  <p style={styles.overviewItemValue}>Multi-dimensional Assessment</p>
                  <p style={styles.overviewItemSub}>Psychometric • Behavioral • Cognitive • Technical</p>
                </div>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Scoring Methodology</h4>
                  <p style={styles.overviewItemValue}>Weighted Category Scoring</p>
                  <p style={styles.overviewItemSub}>{config.weightage}</p>
                </div>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Competencies Assessed</h4>
                  <p style={styles.overviewItemValue}>{Object.keys(selectedAssessment.category_scores).length}</p>
                  <p style={styles.overviewItemSub}>Key behavioral and cognitive dimensions</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4️⃣ Overall Score Summary Table */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'competencies' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>4. Overall Score Summary</h2>
            </div>
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Category</th>
                    <th style={styles.tableHead}>Score</th>
                    <th style={styles.tableHead}>Percentage</th>
                    <th style={styles.tableHead}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedAssessment.category_scores).map(([category, data]) => {
                    const catGrade = getGradeInfo(data.percentage);
                    return (
                      <tr key={category} style={styles.tableRow}>
                        <td style={styles.tableCell}>{category}</td>
                        <td style={styles.tableCell}>{data.score}/{data.maxPossible}</td>
                        <td style={styles.tableCell}>{data.percentage}%</td>
                        <td style={styles.tableCell}>{catGrade.grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={styles.tableFooterRow}>
                    <td colSpan="4" style={styles.tableFooter}>
                      <div style={styles.totalScoreRow}>
                        <span><strong>Total Score:</strong> {selectedAssessment.total_score}/{selectedAssessment.max_score}</span>
                        <span><strong>Average:</strong> {selectedAssessment.percentage}%</span>
                        <span><strong>Overall Grade:</strong> {gradeInfo.grade}</span>
                        <span><strong>Classification:</strong> {classification.label}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5️⃣ Psychometric Analysis */}
            {psychometricAnalysis && (
              <div style={styles.psychometricSection}>
                <h3 style={styles.subsectionTitle}>5. Psychometric Analysis</h3>
                
                {/* Overall Profile Pattern */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Overall Profile Pattern</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.overallPattern}</div>
                </div>

                {/* Cognitive Processing Style */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Cognitive Processing Style</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.cognitiveStyle}</div>
                </div>

                {/* Behavioral Tendencies */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Behavioral Tendencies</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.behavioralTendencies}</div>
                </div>

                {/* Interpersonal Dynamics */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Interpersonal Dynamics</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.interpersonalDynamics}</div>
                </div>

                {/* Work Style Preferences */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Work Style Preferences</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.workStyle}</div>
                </div>

                {/* Potential Derailers */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Potential Derailers</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.derailers}</div>
                </div>

                {/* Developmental Focus Areas */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Developmental Focus Areas</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.developmentalFocus}</div>
                </div>

                {/* Strengths to Leverage */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Strengths to Leverage</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.strengthsToLeverage}</div>
                </div>

                {/* Risk Factors */}
                <div style={styles.psychometricCard}>
                  <h4 style={styles.psychometricCardTitle}>Risk Factors</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.riskFactors}</div>
                </div>

                {/* Summary Interpretation */}
                <div style={{...styles.psychometricCard, background: '#f0f9ff', borderLeft: '4px solid #0c4a6e'}}>
                  <h4 style={styles.psychometricCardTitle}>Summary Interpretation</h4>
                  <div style={styles.psychometricText}>{psychometricAnalysis.summary}</div>
                </div>
              </div>
            )}
          </section>

          {/* 6️⃣ Development & Recommendations */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'development' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>6. Development & Recommendations</h2>
            </div>
            
            <div style={styles.roleFitCard}>
              <h3 style={styles.subsectionTitle}>Role Fit Analysis</h3>
              {selectedAssessment.detailedInterpretation?.roleFit && (
                <div style={styles.analysisText}>{selectedAssessment.detailedInterpretation.roleFit}</div>
              )}
              {!selectedAssessment.detailedInterpretation?.roleFit && (
                <div style={styles.analysisText}>
                  <p><strong>Best suited for roles requiring:</strong></p>
                  <ul>
                    {strengthsList.map((s, i) => {
                      const [category] = s.split(' (');
                      return <li key={i}>• Strong {category.toLowerCase()} capabilities</li>;
                    })}
                    {strengthsList.length === 0 && (
                      <li>• Structured, supervised positions with clear guidelines</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Development Recommendations */}
            <div style={styles.timelineContainer}>
              <h3 style={styles.subsectionTitle}>Development Recommendations</h3>
              
              <div style={styles.timelineGrid}>
                <div style={styles.timelinePhase}>
                  <h4 style={styles.phaseTitle}>Short-Term (0–3 Months)</h4>
                  <ul style={styles.phaseList}>
                    <li>Complete foundational training in weak areas</li>
                    <li>Structured mentoring program</li>
                    <li>Weekly feedback and progress reviews</li>
                    {weaknessesList.length > 0 && (
                      <li>Focus on {weaknessesList.slice(0, 2).map(w => w.split(' (')[0]).join(' and ')}</li>
                    )}
                  </ul>
                </div>
                
                <div style={styles.timelinePhase}>
                  <h4 style={styles.phaseTitle}>Medium-Term (3–6 Months)</h4>
                  <ul style={styles.phaseList}>
                    <li>Advanced training in core competencies</li>
                    <li>Cross-functional project exposure</li>
                    <li>Skill certification courses</li>
                    <li>Apply learning to practical situations</li>
                  </ul>
                </div>
                
                <div style={styles.timelinePhase}>
                  <h4 style={styles.phaseTitle}>Long-Term (6–12 Months)</h4>
                  <ul style={styles.phaseList}>
                    <li>Leadership development program</li>
                    <li>Stretch assignments</li>
                    <li>Regular reassessment of progress</li>
                    {strengthsList.length > 0 && (
                      <li>Build on {strengthsList.slice(0, 1).map(s => s.split(' (')[0]).join('')} strengths</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Hiring Recommendation */}
            <div style={styles.hiringCard}>
              <h3 style={styles.subsectionTitle}>Hiring Recommendation</h3>
              <div style={{...styles.hiringBadge, background: hiringRec.color}}>
                {hiringRec.recommendation}
              </div>
              <p style={styles.hiringJustification}>{hiringRec.summary}</p>
              <p style={styles.hiringDetail}>
                Based on the comprehensive {config.name}, this candidate demonstrates 
                {selectedAssessment.percentage >= 65 ? ' strong potential' : ' significant development needs'} 
                for roles requiring these competencies.
              </p>
              <div style={styles.hiringFactors}>
                <div style={styles.hiringFactor}>
                  <strong>Supporting factors:</strong> {strengthsList.length} strength areas identified
                </div>
                <div style={styles.hiringFactor}>
                  <strong>Risk factors:</strong> {weaknessesList.length} areas requiring development
                </div>
              </div>
            </div>
          </section>
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
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    margin: '20px',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    background: '#3b82f6',
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
      background: '#2563eb',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)'
    }
  },
  container: {
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  backButton: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #3b82f6',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3b82f6',
      color: 'white'
    }
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  assessmentSelect: {
    padding: '10px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '300px',
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
    ':focus': {
      borderColor: '#3b82f6'
    }
  },
  printButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#059669'
    }
  },
  navigation: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '10px',
    overflowX: 'auto',
    whiteSpace: 'nowrap'
  },
  navItem: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#4b5563',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  reportContainer: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '40px'
  },
  sectionHeader: {
    marginBottom: '30px',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '10px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937'
  },
  subsectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 20px 0'
  },
  coverPage: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 20px'
  },
  coverHeader: {
    marginBottom: '60px'
  },
  coverTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: '10px'
  },
  coverSubtitle: {
    fontSize: '18px',
    color: '#6b7280'
  },
  coverContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverLogo: {
    fontSize: '80px',
    marginBottom: '40px'
  },
  coverCandidateName: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '20px'
  },
  coverDetail: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '5px 0'
  },
  coverBadge: {
    marginTop: '40px',
    padding: '8px 30px',
    border: '2px solid #ef4444',
    borderRadius: '40px',
    color: '#ef4444',
    fontWeight: 600,
    letterSpacing: '2px'
  },
  coverFooter: {
    marginTop: '60px',
    color: '#9ca3af',
    fontSize: '14px'
  },
  executiveSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  scoreCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  scoreCardHeader: {
    background: '#f9fafb',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  scoreCardLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280'
  },
  scoreCardValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937'
  },
  scoreCardBody: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  scoreMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  scoreMetricLabel: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  scoreMetricValue: {
    fontSize: '24px',
    fontWeight: 700
  },
  combinedScoreCard: {
    marginTop: '20px',
    padding: '20px',
    background: '#f0f9ff',
    borderRadius: '12px',
    border: '1px solid #bae6fd'
  },
  combinedScoreTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0369a1'
  },
  combinedScoreContent: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  combinedScoreItem: {
    textAlign: 'center'
  },
  combinedScoreLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '5px'
  },
  combinedScoreValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 700,
    color: '#0c4a6e'
  },
  classificationCard: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  classificationBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  classificationDescription: {
    margin: 0,
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6'
  },
  verdictCard: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  verdictTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937'
  },
  verdictBadge: {
    display: 'inline-block',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '15px'
  },
  verdictSummary: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  keyPoints: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  keyPoint: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  keyPointIcon: {
    fontSize: '18px'
  },
  overviewCard: {
    padding: '30px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px'
  },
  overviewItem: {
    textAlign: 'center'
  },
  overviewItemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '10px'
  },
  overviewItemValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '5px'
  },
  overviewItemSub: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '40px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    background: '#f9fafb',
    borderBottom: '2px solid #3b82f6'
  },
  tableHead: {
    padding: '12px',
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  tableCell: {
    padding: '12px'
  },
  tableFooterRow: {
    background: '#f9fafb'
  },
  tableFooter: {
    padding: '15px'
  },
  totalScoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  psychometricSection: {
    marginTop: '40px'
  },
  psychometricCard: {
    marginBottom: '25px',
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  psychometricCardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 12px 0',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px'
  },
  psychometricText: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#4b5563',
    whiteSpace: 'pre-line'
  },
  roleFitCard: {
    padding: '30px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '40px'
  },
  timelineContainer: {
    marginBottom: '40px'
  },
  timelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  timelinePhase: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  phaseTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#3b82f6'
  },
  phaseList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#4b5563',
    lineHeight: '1.8'
  },
  hiringCard: {
    padding: '30px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
    textAlign: 'center'
  },
  hiringBadge: {
    display: 'inline-block',
    padding: '12px 40px',
    borderRadius: '40px',
    color: 'white',
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '20px'
  },
  hiringJustification: {
    fontSize: '16px',
    color: '#1f2937',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  hiringDetail: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  hiringFactors: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    flexWrap: 'wrap'
  },
  hiringFactor: {
    fontSize: '14px',
    color: '#4b5563'
  },
  analysisText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.8',
    whiteSpace: 'pre-line'
  }
};
