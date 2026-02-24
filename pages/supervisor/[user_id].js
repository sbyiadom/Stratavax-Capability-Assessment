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
          <p style={styles.loadingText}>Loading Stratavax professional report...</p>
          <p style={styles.loadingSubtext}>Generating comprehensive assessment analysis</p>
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
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [activeSection, setActiveSection] = useState('cover');
  const [showPrintView, setShowPrintView] = useState(false);
  const [stratavaxReport, setStratavaxReport] = useState(null);
  const [assessmentTypeName, setAssessmentTypeName] = useState('');
  
  // State for competency data from category_scores
  const [competencyData, setCompetencyData] = useState([]);
  const [competencyInterpretation, setCompetencyInterpretation] = useState(null);
  const [showCompetencyView, setShowCompetencyView] = useState(false);

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
        
        console.log("📊 Fetching Stratavax report data for user:", user_id);

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

        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error("Error fetching results:", resultsError);
        }

        if (resultsData && resultsData.length > 0) {
          console.log(`✅ Found ${resultsData.length} assessments`);
          setAllAssessments(resultsData);
          
          const defaultAssessment = resultsData[0];
          await loadAssessmentData(defaultAssessment, candidateInfo);
        } else {
          console.log("❌ No assessment results found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [authChecked, isSupervisor, user_id]);

  // Function to extract competency data from category_scores
  const extractCompetencyData = (categoryScores, assessmentTypeId, candidateName, overallPercentage) => {
    if (!categoryScores || Object.keys(categoryScores).length === 0) {
      return { competencies: [], interpretation: null };
    }

    console.log("🔍 Extracting competency data from category_scores:", categoryScores);

    // Convert category_scores object to array format
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

    // Sort by percentage descending
    competencies.sort((a, b) => b.percentage - a.percentage);

    // Generate interpretation using categoryMapper
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
      // Fetch responses
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

      const assessmentTypeId = result.assessment_type || 'general';
      const config = getAssessmentType(assessmentTypeId);
      
      setAssessmentTypeName(config.name);

      const report = generateStratavaxReport(
        user_id,
        assessmentTypeId,
        responsesData || [],
        candidateInfo.full_name,
        result.completed_at
      );

      setStratavaxReport(report);
      
      // Extract competency data from category_scores in the result
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
      } else {
        console.log("⚠️ No category_scores found in assessment result");
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
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment data:", error);
      setLoading(false);
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

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/generate-pdf-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user_id,
          assessmentId: selectedAssessment?.assessment_id
        })
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate?.full_name || 'candidate'}_${assessmentTypeName.replace(/\s+/g, '_')}_report.pdf`;
      a.click();
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!authChecked || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>{!authChecked ? "Verifying credentials..." : "Analyzing assessment data..."}</p>
          <p style={styles.loadingSubtext}>Please wait while we prepare your comprehensive report</p>
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
        <p>This candidate hasn't completed any assessments yet.</p>
        <Link href="/supervisor" legacyBehavior>
          <a style={styles.primaryButton}>← Back to Dashboard</a>
        </Link>
      </div>
    );
  }

  const report = selectedAssessment.report.stratavaxReport;
  const config = selectedAssessment.config || assessmentTypes.general;
  const assessmentDisplayName = config.name;

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
                  
                  return (
                    <option key={a.id} value={a.id}>
                      {config.name} #{index + 1} - {assessmentDate}
                    </option>
                  );
                })}
              </select>
            )}
            <button onClick={handlePrint} style={styles.printButton}>
              🖨️ Print
            </button>
            <button onClick={handleDownloadPDF} style={styles.pdfButton}>
              📥 Download PDF
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

          {/* SECTION 4: COMPETENCY ANALYSIS - WITH PROPER NARRATIVE COMMENTARY */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'competency' || (showPrintView && competencyData.length > 0) ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Competency Analysis</h2>
              <p style={styles.sectionSubtitle}>Professional interpretation of core competencies measured in this {assessmentDisplayName.toLowerCase()}</p>
            </div>
            
            {competencyData && competencyData.length > 0 ? (
              <>
                {/* Overall Competency Narrative - Using commentaryEngine */}
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

                {/* Competency Summary Cards - Keep these for quick reference */}
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

                {/* Detailed Competency Cards WITH INDIVIDUAL COMMENTARY */}
                <div style={styles.competencyGrid}>
                  {competencyData.map(comp => {
                    // Generate specific commentary for this competency using commentaryEngine
                    const commentary = generateCommentary(
                      comp.competencies.name, 
                      comp.percentage, 
                      comp.classification === 'Strong' ? 'strength' : 
                      comp.classification === 'Moderate' ? 'neutral' : 'weakness'
                    );
                    
                    // Get detailed interpretation from categoryMapper if available
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
                        
                        {/* Progress Bar - Keep visual */}
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
                        
                        {/* COMPETENCY COMMENTARY - This is the key addition */}
                        <div style={styles.competencyCommentary}>
                          <p style={styles.commentaryText}>
                            {detailedInterpretation || commentary}
                          </p>
                        </div>
                        
                        {/* Raw scores - Keep for reference but de-emphasize */}
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

                {/* Enhanced Competency Interpretation from categoryMapper */}
                {competencyInterpretation && (
                  <div style={styles.competencyInterpretation}>
                    <h4 style={styles.interpretationTitle}>Professional Profile Analysis</h4>
                    <p style={styles.interpretationText}>
                      {competencyInterpretation.overallSummary}
                    </p>
                    
                    {/* Top Strengths with Commentary */}
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
                    
                    {/* Development Areas with Commentary */}
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
                    
                    {/* Role Suitability - Professional narrative */}
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
                    
                    {/* Risks/Considerations - Professional narrative */}
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
                    
                    {/* Development Focus Areas */}
                    {competencyInterpretation.developmentFocus && competencyInterpretation.developmentFocus.length > 0 && (
                      <div style={styles.interpretationSection}>
                        <h5 style={styles.interpretationSubtitle}>📋 Recommended Focus Areas</h5>
                        <div style={styles.focusGrid}>
                          {competencyInterpretation.developmentFocus.map((focus, idx) => (
                            <div key={idx} style={{
                              ...styles.focusCard,
                              borderLeft: `4px solid ${
                                focus.priority === 'High' ? '#F44336' :
                                focus.priority === 'Medium' ? '#FF9800' : '#4CAF50'
                              }`
                            }}>
                              <span style={styles.focusArea}>{focus.area}</span>
                              <span style={{
                                ...styles.focusPriority,
                                background: focus.priority === 'High' ? '#FEF2F2' :
                                           focus.priority === 'Medium' ? '#FFF3E0' : '#F0F9F0',
                                color: focus.priority === 'High' ? '#B91C1C' :
                                       focus.priority === 'Medium' ? '#F57C00' : '#2F855A'
                              }}>{focus.priority} Priority</span>
                            </div>
                          ))}
                        </div>
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
    </AppLayout>
  );
}

// Define all styles directly in the file
const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  loadingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(/images/report-loading-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0
  },
  loadingContent: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    maxWidth: '600px',
    padding: '0 20px'
  },
  loadingText: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  loadingSubtext: {
    fontSize: '16px',
    opacity: 0.9,
    marginTop: '10px'
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 30px',
    boxShadow: '0 0 20px rgba(0,0,0,0.3)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    margin: '20px auto',
    maxWidth: '500px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    background: '#0A1929',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '30px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    marginTop: '20px',
    cursor: 'pointer'
  },
  container: {
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
    backgroundImage: 'url(/images/report-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    borderRadius: '0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '15px 25px',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #0A1929',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    ':hover': {
      background: '#0A1929',
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
      borderColor: '#0A1929'
    }
  },
  printButton: {
    background: '#0A1929',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  },
  pdfButton: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#45a049',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
    }
  },
  navigation: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    borderBottom: '1px solid rgba(255,255,255,0.3)',
    paddingBottom: '10px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    background: 'rgba(255, 255, 255, 0.8)',
    padding: '15px 25px',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)'
  },
  navItem: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#0A1929',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#0A1929',
      opacity: 0.8
    }
  },
  reportContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '50px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(10px)'
  },
  section: {
    marginBottom: '40px'
  },
  sectionHeader: {
    marginBottom: '30px',
    borderBottom: '3px solid #0A1929',
    paddingBottom: '10px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929',
    letterSpacing: '-0.5px'
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '8px',
    fontStyle: 'italic'
  },
  subsectionTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0'
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
    fontSize: '48px',
    fontWeight: 800,
    color: '#0A1929',
    marginBottom: '10px',
    letterSpacing: '2px'
  },
  coverSubtitle: {
    fontSize: '24px',
    color: '#666',
    fontWeight: 300
  },
  coverContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverLogo: {
    fontSize: '100px',
    marginBottom: '40px'
  },
  coverCandidateName: {
    fontSize: '42px',
    fontWeight: 700,
    color: '#0A1929',
    marginBottom: '30px'
  },
  coverDetail: {
    fontSize: '18px',
    color: '#666',
    margin: '5px 0'
  },
  coverBadge: {
    marginTop: '50px',
    padding: '10px 40px',
    border: '2px solid #F44336',
    borderRadius: '40px',
    color: '#F44336',
    fontWeight: 600,
    letterSpacing: '2px'
  },
  coverFooter: {
    marginTop: '60px',
    color: '#999',
    fontSize: '14px'
  },
  executiveSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px'
  },
  scoreItem: {
    background: '#F7FAFC',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #E2E8F0'
  },
  scoreLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#718096',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  scoreValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929'
  },
  classificationPill: {
    display: 'inline-block',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 600
  },
  narrativeBox: {
    background: '#F7FAFC',
    padding: '30px',
    borderRadius: '12px',
    borderLeft: '6px solid #0A1929'
  },
  narrativeText: {
    fontSize: '16px',
    lineHeight: '1.8',
    color: '#2D3748',
    margin: 0
  },
  narrativeDescription: {
    fontSize: '15px',
    color: '#718096',
    marginTop: '15px',
    fontStyle: 'italic'
  },
  narrativeFootnote: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '15px',
    fontStyle: 'italic',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '15px'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    background: '#0A1929',
    color: 'white'
  },
  tableHead: {
    padding: '15px',
    fontWeight: 600,
    textAlign: 'left',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background 0.2s ease',
    ':hover': {
      background: '#F7FAFC'
    }
  },
  tableCell: {
    padding: '12px 15px',
    color: '#2D3748'
  },
  tableFootnote: {
    fontSize: '13px',
    color: '#718096',
    marginTop: '15px',
    fontStyle: 'italic',
    textAlign: 'right'
  },
  percentageContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  percentageText: {
    minWidth: '40px',
    fontWeight: 500
  },
  progressBarContainer: {
    flex: 1,
    height: '8px',
    background: '#EDF2F7',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: '4px'
  },
  gradeBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#0A1929',
    color: 'white',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '12px'
  },
  
  // Competency Styles
  competencyOverallNarrative: {
    marginBottom: '30px'
  },
  narrativeSubtitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '10px'
  },
  competencySummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginBottom: '30px'
  },
  competencySummaryCard: {
    background: '#F8FAFC',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #E2E8F0'
  },
  competencySummaryLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#64748B',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  competencySummaryValue: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 700,
    color: '#0A1929'
  },
  competencyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  competencyCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  competencyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  competencyName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    display: 'block',
    marginBottom: '4px'
  },
  competencyCategory: {
    fontSize: '12px',
    color: '#718096',
    background: '#F1F5F9',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  competencyScoreContainer: {
    textAlign: 'right'
  },
  competencyScore: {
    fontSize: '24px',
    fontWeight: 700,
    display: 'block',
    lineHeight: 1.2
  },
  competencyBadge: {
    fontSize: '11px',
    color: '#64748B',
    background: '#F1F5F9',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-block',
    marginTop: '4px'
  },
  competencyBarContainer: {
    marginBottom: '15px'
  },
  competencyBar: {
    height: '10px',
    background: '#EDF2F7',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '5px'
  },
  competencyTarget: {
    fontSize: '11px',
    color: '#718096',
    display: 'block',
    textAlign: 'right'
  },
  competencyCommentary: {
    margin: '15px 0',
    padding: '12px',
    background: '#F8FAFC',
    borderRadius: '8px',
    borderLeft: '3px solid #0A1929'
  },
  commentaryText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#2D3748',
    margin: 0,
    fontStyle: 'italic'
  },
  rawScoreDetails: {
    marginTop: '10px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    padding: '8px'
  },
  rawScoreSummary: {
    fontSize: '12px',
    color: '#718096',
    cursor: 'pointer',
    fontWeight: 500
  },
  competencyDetails: {
    display: 'flex',
    gap: '15px',
    marginTop: '10px',
    fontSize: '13px'
  },
  competencyDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  competencyDetailLabel: {
    color: '#718096'
  },
  competencyDetailValue: {
    fontWeight: 600,
    color: '#0A1929'
  },
  competencyGap: {
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#B91C1C'
  },
  competencyInterpretation: {
    background: '#F0F4F8',
    padding: '25px',
    borderRadius: '12px',
    marginTop: '20px'
  },
  interpretationTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '15px'
  },
  interpretationText: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#2D3748',
    marginBottom: '20px'
  },
  interpretationSection: {
    marginTop: '20px',
    padding: '15px',
    background: 'white',
    borderRadius: '8px'
  },
  interpretationSubtitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '12px'
  },
  interpretationList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  interpretationListItem: {
    padding: '8px 0',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#2D3748'
  },
  focusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  focusCard: {
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  focusArea: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  focusPriority: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-block',
    alignSelf: 'flex-start'
  },
  noCompetencyData: {
    background: '#FEF2F2',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#B91C1C',
    fontSize: '15px',
    border: '1px solid #FEE2E2'
  },
  competencyBulletList: {
    textAlign: 'left',
    marginTop: '15px',
    paddingLeft: '30px',
    color: '#4A5568'
  },
  
  // Strengths & Weaknesses Styles
  strengthsSection: {
    marginTop: '20px'
  },
  sectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  badgeIcon: {
    fontSize: '28px'
  },
  strengthsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '25px'
  },
  strengthCard: {
    background: '#F0F9F0',
    borderRadius: '12px',
    padding: '18px',
    border: '1px solid #C6F6D5'
  },
  strengthCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px'
  },
  strengthIcon: {
    fontSize: '18px'
  },
  strengthName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A5C2E',
    flex: 1
  },
  strengthScore: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A5C2E'
  },
  strengthInterpretation: {
    fontSize: '14px',
    color: '#2F855A',
    lineHeight: '1.6',
    paddingLeft: '30px'
  },
  noStrengthsMessage: {
    padding: '20px',
    background: '#F7FAFC',
    borderRadius: '12px',
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '20px'
  },
  developmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '25px'
  },
  developmentItem: {
    background: 'white',
    borderRadius: '12px',
    padding: '18px',
    border: '1px solid #FEE2E2'
  },
  developmentItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  bulletContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  bulletPoint: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  developmentArea: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1A2A3A'
  },
  developmentMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  priorityBadge: {
    padding: '4px 12px',
    borderRadius: '30px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.3px'
  },
  developmentScore: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#B71C1C',
    minWidth: '50px',
    textAlign: 'right'
  },
  developmentGrade: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#718096',
    background: '#F7FAFC',
    padding: '4px 8px',
    borderRadius: '6px',
    minWidth: '40px',
    textAlign: 'center'
  },
  developmentInterpretation: {
    fontSize: '14px',
    color: '#4A5568',
    lineHeight: '1.6',
    marginBottom: '12px',
    paddingLeft: '22px'
  },
  gapIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#B91C1C',
    marginLeft: '22px'
  },
  gapIcon: {
    fontSize: '14px'
  },
  gapText: {
    fontWeight: 500
  },
  moreDetails: {
    marginTop: '20px',
    border: '1px solid #FEE2E2',
    borderRadius: '12px',
    padding: '12px'
  },
  moreSummary: {
    color: '#B91C1C',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px'
  },
  moreList: {
    marginTop: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  moreItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: '#FEF2F2',
    borderRadius: '8px',
    fontSize: '14px',
    flexWrap: 'wrap'
  },
  moreBullet: {
    color: '#FCA5A5',
    fontSize: '16px'
  },
  moreArea: {
    flex: 2,
    color: '#2D3748',
    fontWeight: 500
  },
  morePercentage: {
    fontWeight: 600,
    color: '#B91C1C',
    minWidth: '50px'
  },
  moreGrade: {
    background: '#FEE2E2',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#B91C1C',
    minWidth: '35px',
    textAlign: 'center'
  },
  moreInterpretation: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic',
    flex: 1,
    minWidth: '120px'
  },
  
  // Recommendations Styles
  recommendationIntro: {
    fontSize: '16px',
    color: '#2D3748',
    marginBottom: '25px',
    fontStyle: 'italic'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '30px'
  },
  recommendationCard: {
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    borderLeftWidth: '6px',
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }
  },
  recHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '10px'
  },
  recCategory: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2D3748'
  },
  recText: {
    fontSize: '15px',
    color: '#4A5568',
    marginBottom: '10px',
    lineHeight: '1.6'
  },
  recAction: {
    fontSize: '14px',
    background: '#F7FAFC',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '8px',
    color: '#2D3748'
  },
  recImpact: {
    fontSize: '13px',
    color: '#718096',
    fontStyle: 'italic'
  },
  tipBox: {
    padding: '20px',
    background: '#F0F9F0',
    borderRadius: '12px',
    borderLeft: '6px solid #4CAF50',
    marginTop: '20px'
  },
  tipTitle: {
    margin: '0 0 10px 0',
    color: '#2F855A',
    fontSize: '16px',
    fontWeight: 600
  },
  suitabilityList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0'
  },
  suitabilityItem: {
    padding: '8px 12px',
    marginBottom: '6px',
    background: '#F0F9F0',
    borderRadius: '8px',
    color: '#2F855A',
    fontSize: '14px'
  },
  risksList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0'
  },
  riskItem: {
    padding: '8px 12px',
    marginBottom: '6px',
    background: '#FEF2F2',
    borderRadius: '8px',
    color: '#B91C1C',
    fontSize: '14px'
  }
};

export default CandidateReport;
