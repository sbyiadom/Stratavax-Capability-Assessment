import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from 'next/dynamic';
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateStratavaxReport } from "../../utils/stratavaxReportGenerator";
import { assessmentTypes, getAssessmentType } from "../../utils/assessmentConfigs";

// Disable SSR for the entire component to prevent hydration issues
const CandidateReport = dynamic(
  () => Promise.resolve(CandidateReportComponent),
  { 
    ssr: false,
    loading: () => (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading Stratavax professional report...</p>
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

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof window === 'undefined') return;
        
        const supervisorSession = localStorage.getItem("supervisorSession");
        
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        const session = JSON.parse(supervisorSession);
        
        if (session.loggedIn) {
          setIsSupervisor(true);
        } else {
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

  // Fetch data
  useEffect(() => {
    if (!authChecked || !isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        console.log("📊 Fetching Stratavax report data for user:", user_id);

        // Fetch candidate profile
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

      // Generate Stratavax report
      const report = generateStratavaxReport(
        user_id,
        assessmentTypeId,
        responsesData || [],
        candidateInfo.full_name,
        result.completed_at
      );

      setStratavaxReport(report);
      
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
      a.download = `${candidate?.full_name || 'candidate'}_report.pdf`;
      a.click();
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!authChecked || loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>{!authChecked ? "Checking authentication..." : "Generating professional report..."}</p>
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
                <p style={styles.coverSubtitle}>Professional Assessment Report</p>
              </div>
              
              <div style={styles.coverContent}>
                <div style={styles.coverLogo}>📊</div>
                <h2 style={styles.coverCandidateName}>{candidate.full_name}</h2>
                <p style={styles.coverDetail}>Assessment: {config.name}</p>
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
                <p style={styles.narrativeText}>{report.executiveSummary.narrative}</p>
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
          </section>

          {/* SECTION 4: STRENGTHS & WEAKNESSES */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'strengths' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Strengths & Development Areas</h2>
            </div>
            
            {/* STRENGTHS SECTION */}
            <div style={styles.strengthsSection}>
              <div style={styles.sectionBadge}>
                <span style={styles.badgeIcon}>🔷</span>
                <h3 style={styles.subsectionTitle}>Key Strengths</h3>
              </div>
              
              <div style={styles.narrativeBox}>
                <p style={styles.narrativeText}>{report.strengths.narrative}</p>
              </div>
              
              <div style={styles.cardsGrid}>
                {report.strengths.items.slice(0, 4).map((strength, index) => (
                  <div key={index} style={styles.strengthCard}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardTitleSection}>
                        <span style={styles.cardIcon}>⭐</span>
                        <span style={styles.cardTitle}>{strength.area}</span>
                      </div>
                      <div style={styles.cardScore}>
                        <span style={{...styles.cardPercentage, color: '#0A5C2E'}}>{strength.percentage}%</span>
                        <span style={styles.cardGrade}>{strength.grade}</span>
                      </div>
                    </div>
                    <div style={styles.cardBody}>
                      <div style={styles.metricBar}>
                        <div style={styles.metricBarLabel}>
                          <span>Proficiency</span>
                          <span>{strength.percentage}%</span>
                        </div>
                        <div style={styles.progressBarContainer}>
                          <div style={{...styles.progressBar, width: `${strength.percentage}%`, background: 'linear-gradient(90deg, #0A5C2E, #4CAF50)'}} />
                        </div>
                      </div>
                      <div style={styles.cardFooter}>
                        <span style={styles.cardFooterText}>Top {index + 1} strength</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEVELOPMENT AREAS SECTION */}
            <div style={{...styles.strengthsSection, marginTop: '50px'}}>
              <div style={styles.sectionBadge}>
                <span style={styles.badgeIcon}>⚠️</span>
                <h3 style={{...styles.subsectionTitle, color: '#B71C1C'}}>Development Areas</h3>
              </div>
              
              <div style={{...styles.narrativeBox, background: '#FEF2F2', borderLeftColor: '#F44336'}}>
                <p style={styles.narrativeText}>{report.weaknesses.narrative}</p>
              </div>
              
              {/* DEVELOPMENT AREAS BULLET LIST */}
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
                      
                      <div style={styles.developmentItemBody}>
                        <div style={styles.developmentBar}>
                          <div style={styles.developmentBarLabel}>
                            <span>Current: {weakness.percentage}%</span>
                            <span>Target: 80%</span>
                          </div>
                          <div style={styles.developmentBarContainer}>
                            <div style={{...styles.developmentBarFill, width: `${weakness.percentage}%`, backgroundColor: priorityColor}} />
                            <div style={{...styles.developmentBarTarget, left: '80%'}}>
                              <span style={styles.targetMarker}>●</span>
                            </div>
                          </div>
                        </div>
                        
                        {weakness.gap > 0 && (
                          <div style={styles.gapIndicator}>
                            <span style={styles.gapIcon}>📈</span>
                            <span style={styles.gapText}>Needs +{weakness.gap} points to reach target</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ADDITIONAL DEVELOPMENT AREAS */}
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
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>

          {/* SECTION 5: DEVELOPMENT RECOMMENDATIONS */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'recommendations' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Development Recommendations</h2>
            </div>
            
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
                <p>Your strongest areas are <strong>{report.strengths.topStrengths.join(', ')}</strong>. Consider mentoring others and taking on projects that utilize these capabilities.</p>
              </div>
            )}

            {report.weaknesses.topWeaknesses.length > 0 && (
              <div style={{...styles.tipBox, background: '#FFEBEE', borderLeftColor: '#F44336'}}>
                <h4 style={{...styles.tipTitle, color: '#F44336'}}>⚠️ Priority Focus Areas</h4>
                <p>Focus immediate development on <strong>{report.weaknesses.topWeaknesses.join(', ')}</strong>. Create a 30-day plan with specific learning objectives.</p>
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

const styles = {
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
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
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #0A1929',
    transition: 'all 0.2s ease',
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
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#0A1929'
    }
  },
  reportContainer: {
    background: 'white',
    borderRadius: '20px',
    padding: '50px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
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
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginTop: '25px'
  },
  strengthCard: {
    background: '#F0F9F0',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #C6F6D5',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,100,0,0.1)'
    }
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  cardTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardIcon: {
    fontSize: '16px',
    color: '#FBBF24'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A5C2E'
  },
  cardScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardPercentage: {
    fontSize: '20px',
    fontWeight: 700
  },
  cardGrade: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#718096',
    background: 'white',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  cardBody: {
    marginTop: '10px'
  },
  metricBar: {
    marginBottom: '12px'
  },
  metricBarLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#4A5568',
    marginBottom: '4px'
  },
  cardFooter: {
    borderTop: '1px solid #C6F6D5',
    paddingTop: '12px',
    marginTop: '4px'
  },
  cardFooterText: {
    fontSize: '12px',
    color: '#2F855A',
    fontStyle: 'italic'
  },
  developmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '25px'
  },
  developmentItem: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    border: '1px solid #FEE2E2',
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
      borderColor: '#FECACA'
    }
  },
  developmentItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
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
    fontSize: '18px',
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
    color: '#1A2A3A',
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
  developmentItemBody: {
    marginTop: '10px'
  },
  developmentBar: {
    marginBottom: '10px'
  },
  developmentBarLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#4A5568',
    marginBottom: '6px'
  },
  developmentBarContainer: {
    height: '8px',
    background: '#EDF2F7',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'visible'
  },
  developmentBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  developmentBarTarget: {
    position: 'absolute',
    top: '-2px',
    width: '2px',
    height: '12px',
    backgroundColor: '#718096',
    transform: 'translateX(-50%)'
  },
  targetMarker: {
    position: 'absolute',
    top: '-8px',
    left: '-4px',
    fontSize: '12px',
    color: '#4A5568'
  },
  gapIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#B91C1C'
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
    padding: '4px 8px',
    ':hover': {
      color: '#991B1B'
    }
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
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: '8px',
    fontSize: '14px'
  },
  moreBullet: {
    color: '#FCA5A5',
    fontSize: '16px'
  },
  moreArea: {
    flex: 1,
    color: '#2D3748'
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
  }
};

export default CandidateReport;
