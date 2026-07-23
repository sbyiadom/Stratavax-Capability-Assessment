// pages/admin/reports/[resultId].js - COMPLETE WITH BEHAVIORAL MATRIX

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

export default function AdminReportView() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isNationalService, setIsNationalService] = useState(false);
  const [behavioralMatrix, setBehavioralMatrix] = useState(null);
  const [showBehavioral, setShowBehavioral] = useState(false);
  const [loadingBehavioral, setLoadingBehavioral] = useState(false);

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

        const userRole = session.user?.user_metadata?.role || session.user?.role;
        if (userRole !== 'admin') {
          setError('You do not have permission to view this report.');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
        }

        console.log('[Admin Report] Full data received:', data);

        // ============================================================
        // DETERMINE IF NATIONAL SERVICE
        // ============================================================
        const assessmentId = data.result?.assessment_id || data.assessment_id || '';
        const assessmentTypeCode = data.assessmentTypeCode || data.result?.assessment_type_code || '';
        
        const isNS = 
          assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID ||
          assessmentTypeCode === 'national_service' ||
          data.isNationalService === true;

        console.log('[Admin Report] Is National Service:', isNS);
        console.log('[Admin Report] assessmentTypeCode:', assessmentTypeCode);

        // ============================================================
        // BUILD REPORT OBJECT
        // ============================================================
        let report = data.report || {};
        let result = data.result || {};

        if (result.report_data && !report.dimensions) {
          report = result.report_data;
        }

        // ============================================================
        // EXTRACT CANDIDATE NAME
        // ============================================================
        let candidateName = 'Candidate';
        let candidateEmail = '';
        let candidateUniversity = '';
        let candidateProgramme = '';
        
        if (result.candidate_profiles?.full_name) {
          candidateName = result.candidate_profiles.full_name;
          candidateEmail = result.candidate_profiles.email || '';
          candidateUniversity = result.candidate_profiles.university || '';
          candidateProgramme = result.candidate_profiles.programme || '';
        } else if (report.candidateInfo?.fullName) {
          candidateName = report.candidateInfo.fullName;
          candidateEmail = report.candidateInfo.email || '';
          candidateUniversity = report.candidateInfo.university || '';
          candidateProgramme = report.candidateInfo.programme || '';
        } else if (data.candidateName) {
          candidateName = data.candidateName;
        } else if (data.result?.candidate_name) {
          candidateName = data.result.candidate_name;
        }

        console.log('[Admin Report] Candidate name:', candidateName);

        // ============================================================
        // FOR NATIONAL SERVICE
        // ============================================================
        if (isNS) {
          let categoryScores = [];
          
          if (data.categoryScores && Array.isArray(data.categoryScores) && data.categoryScores.length > 0) {
            categoryScores = data.categoryScores;
          } else if (data.workplaceSubCategories && data.intellectualSubCategories) {
            categoryScores = [
              ...(data.workplaceSubCategories || []),
              ...(data.intellectualSubCategories || [])
            ];
          } else if (result.category_scores && Array.isArray(result.category_scores) && result.category_scores.length > 0) {
            categoryScores = result.category_scores;
          } else if (report.category_scores && Array.isArray(report.category_scores) && report.category_scores.length > 0) {
            categoryScores = report.category_scores;
          } else if (report.categoryScores && Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
            categoryScores = report.categoryScores;
          }

          report.category_scores = categoryScores;
          report.workplaceSubCategories = data.workplaceSubCategories || [];
          report.intellectualSubCategories = data.intellectualSubCategories || [];

          if (!report.dimensions) {
            report.dimensions = {
              workplaceReadiness: data.workplaceReadiness || result.workplace_readiness || 0,
              intellectualCapability: data.intellectualCapability || result.intellectual_capability || 0,
              overallScore: data.overallScore || result.percentage_score || 0
            };
          }

          if (!report.recommendation) {
            report.recommendation = {
              level: data.recommendation || result.recommendation || 'Not Recommended'
            };
          }

          if (!report.candidateInfo) {
            report.candidateInfo = {
              fullName: candidateName,
              email: candidateEmail,
              university: candidateUniversity,
              programme: candidateProgramme,
              graduationYear: result.candidate_profiles?.graduation_year || '',
              preferredDepartment: result.candidate_profiles?.preferred_department || '',
              assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
            };
          }

          if (!report.statistics) {
            report.statistics = {
              totalQuestions: result.total_questions || 0,
              totalAnswered: result.answered_questions || 0
            };
          }

          report.reportType = 'national_service';
        }

        // ============================================================
        // FOR STRATAVAX
        // ============================================================
        if (!isNS) {
          let categoryScores = [];
          
          if (result.categoryScores && Array.isArray(result.categoryScores)) {
            categoryScores = result.categoryScores;
          } else if (result.category_scores && Array.isArray(result.category_scores)) {
            categoryScores = result.category_scores;
          } else if (report.categoryScores && Array.isArray(report.categoryScores)) {
            categoryScores = report.categoryScores;
          } else if (report.category_scores && Array.isArray(report.category_scores)) {
            categoryScores = report.category_scores;
          } else if (data.categoryScores && Array.isArray(data.categoryScores)) {
            categoryScores = data.categoryScores;
          }

          let strengths = result.strengths || report.strengths || data.strengths || [];
          let weaknesses = result.weaknesses || report.weaknesses || report.developmentAreas || data.weaknesses || [];
          let recommendations = result.recommendations || report.recommendations || data.recommendations || [];

          const candidateInfo = {
            fullName: candidateName,
            email: candidateEmail,
            university: candidateUniversity,
            programme: candidateProgramme,
            graduationYear: result.candidate_profiles?.graduation_year || report.candidateInfo?.graduationYear || '',
            preferredDepartment: result.candidate_profiles?.preferred_department || report.candidateInfo?.preferredDepartment || '',
            assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
          };

          report = {
            ...report,
            categoryScores: categoryScores,
            category_scores: categoryScores,
            strengths: strengths,
            weaknesses: weaknesses,
            recommendations: recommendations,
            overallScore: result.percentage_score || report.overallScore || data.overallScore || 0,
            percentage_score: result.percentage_score || report.percentage_score || data.percentage_score || 0,
            classification: result.classification || report.classification || data.classification || 'Standard Profile',
            riskLevel: result.riskLevel || report.riskLevel || result.risk_level || data.riskLevel || 'Medium',
            executiveSummary: result.executiveSummary || report.executiveSummary || data.executiveSummary || '',
            supervisorImplication: result.supervisorImplication || report.supervisorImplication || data.supervisorImplication || '',
            candidateInfo: candidateInfo,
            candidateName: candidateName,
            reportType: 'stratavax',
            total_questions: result.total_questions || 0,
            answered_questions: result.answered_questions || 0
          };
        }

        setReportData({
          ...data,
          report: report,
          result: result,
          candidateName: candidateName
        });
        setIsNationalService(isNS);

        // ============================================================
        // FETCH BEHAVIORAL MATRIX
        // ============================================================
        await fetchBehavioralMatrix(resultId);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReport();
  }, [resultId, session]);

  // ============================================================
  // FETCH BEHAVIORAL MATRIX
  // ============================================================
  const fetchBehavioralMatrix = async (id) => {
    try {
      setLoadingBehavioral(true);
      console.log('[Behavioral] Fetching for resultId:', id);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.log('[Behavioral] No token found');
        return;
      }

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('[Behavioral] API Response:', data);
      
      if (data.success) {
        setBehavioralMatrix(data.behavioralMatrix);
        console.log('[Behavioral] Matrix data:', data.behavioralMatrix);
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    } finally {
      setLoadingBehavioral(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/reports');
  };

  const toggleBehavioral = () => {
    setShowBehavioral(!showBehavioral);
  };

  // ============================================================
  // FORMAT TIME HELPER
  // ============================================================
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Check if behavioral data exists
  const hasBehavioralData = 
    behavioralMatrix?.behavior?.hasBehavioralData === true ||
    (behavioralMatrix?.behavior?.tabSwitches || 0) > 0 ||
    (behavioralMatrix?.behavior?.violations || 0) > 0 ||
    (behavioralMatrix?.behavior?.answerChanges || 0) > 0 ||
    (behavioralMatrix?.timing?.timePerQuestion && behavioralMatrix.timing.timePerQuestion.length > 0);

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading report...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>🔒</div>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
        </div>
      </AppLayout>
    );
  }

  // ============================================================
  // RENDER NATIONAL SERVICE REPORT WITH BEHAVIORAL MATRIX
  // ============================================================
  if (isNationalService && reportData?.report) {
    console.log('[Admin Report] Rendering National Service Report');
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Reports List
          </button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>National Service Report</span>
          <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
            {showBehavioral ? 'Hide Behavioral Matrix' : 'Show Behavioral Matrix'}
          </button>
        </div>
        <NationalServiceReport 
          report={reportData.report} 
          onBack={handleBack} 
          resultId={resultId}  // Pass resultId for behavioral data
        />
        
        {showBehavioral && (
          <div style={styles.behavioralSection}>
            <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
            
            {loadingBehavioral ? (
              <div style={styles.loadingBehavioral}>
                <p>Loading behavioral data...</p>
              </div>
            ) : behavioralMatrix && hasBehavioralData ? (
              <>
                <div style={styles.behavioralStats}>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Total Time</span>
                    <span style={styles.behavioralValue}>
                      {formatTime(behavioralMatrix.timing?.totalTimeSeconds)}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Avg Time per Question</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.timing?.averageTimePerQuestion || 0}s
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Answer Changes</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.answerChanges || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Tab Switches</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.tabSwitches || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Violations</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.violations || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
                    <span style={styles.behavioralValue}>
                      {(behavioralMatrix.behavior?.copyAttempts || 0) + (behavioralMatrix.behavior?.pasteAttempts || 0)}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Right-Click Attempts</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.rightClickAttempts || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Risk Level</span>
                    <span style={{
                      ...styles.riskBadge,
                      background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                                 behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                      color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                             behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
                    }}>
                      {behavioralMatrix.riskAssessment?.level || 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <div style={styles.riskSummary}>
                  <p>{behavioralMatrix.riskAssessment?.summary || 'No behavioral concerns detected.'}</p>
                </div>
                
                {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                  <div style={styles.flaggedQuestions}>
                    <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                    <ul style={styles.flaggedList}>
                      {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                        <li key={index} style={styles.flaggedItem}>
                          Question {q.question_id}: {q.time_seconds}s
                          {q.changed ? ' - Changed' : ''}
                          {q.violation ? ' - Violation' : ''}
                        </li>
                      ))}
                      {behavioralMatrix.flaggedQuestions.length > 10 && (
                        <li style={styles.flaggedItem}>... and {behavioralMatrix.flaggedQuestions.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.noBehavioralData}>
                <p>No behavioral data is available for this assessment.</p>
                <p style={styles.noBehavioralSubtext}>
                  Behavioral data (tab switches, violations, answer changes, etc.) 
                  is only tracked for assessments completed after the behavioral tracking feature was implemented.
                </p>
              </div>
            )}
          </div>
        )}
      </AppLayout>
    );
  }

  // ============================================================
  // RENDER STRATAVAX REPORT WITH BEHAVIORAL MATRIX
  // ============================================================
  if (!isNationalService && reportData?.report) {
    console.log('[Admin Report] Rendering Stratavax Report');
    const report = reportData.report;
    
    const stratavaxResult = {
      ...reportData.result,
      candidate_profiles: {
        full_name: report.candidateInfo?.fullName || reportData.candidateName || 'Candidate',
        email: report.candidateInfo?.email || '',
        university: report.candidateInfo?.university || '',
        programme: report.candidateInfo?.programme || '',
        graduation_year: report.candidateInfo?.graduationYear || '',
        preferred_department: report.candidateInfo?.preferredDepartment || ''
      },
      assessments: {
        title: reportData.result?.assessments?.title || report.assessmentName || 'Assessment',
        assessment_type: {
          name: reportData.result?.assessments?.assessment_type?.name || 'General'
        }
      },
      percentage_score: report.overallScore || report.percentage_score || 0,
      classification: report.classification || 'Standard Profile',
      riskLevel: report.riskLevel || 'Medium',
      categoryScores: report.categoryScores || report.category_scores || [],
      strengths: report.strengths || [],
      weaknesses: report.weaknesses || [],
      recommendations: report.recommendations || [],
      executiveSummary: report.executiveSummary || '',
      supervisorImplication: report.supervisorImplication || '',
      total_questions: report.total_questions || 0,
      answered_questions: report.answered_questions || 0,
      completed_at: reportData.result?.completed_at || null,
      candidateName: report.candidateInfo?.fullName || reportData.candidateName || 'Candidate'
    };

    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Reports List
          </button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>Assessment Report</span>
          <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
            {showBehavioral ? 'Hide Behavioral Matrix' : 'Show Behavioral Matrix'}
          </button>
        </div>
        <StratavaxReport 
          result={stratavaxResult}
          candidate={stratavaxResult.candidate_profiles || null}
          assessment={stratavaxResult.assessments || null}
          onBack={handleBack}
        />
        
        {showBehavioral && (
          <div style={styles.behavioralSection}>
            <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
            
            {loadingBehavioral ? (
              <div style={styles.loadingBehavioral}>
                <p>Loading behavioral data...</p>
              </div>
            ) : behavioralMatrix && hasBehavioralData ? (
              <>
                <div style={styles.behavioralStats}>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Total Time</span>
                    <span style={styles.behavioralValue}>
                      {formatTime(behavioralMatrix.timing?.totalTimeSeconds)}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Avg Time per Question</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.timing?.averageTimePerQuestion || 0}s
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Answer Changes</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.answerChanges || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Tab Switches</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.tabSwitches || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Violations</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.violations || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
                    <span style={styles.behavioralValue}>
                      {(behavioralMatrix.behavior?.copyAttempts || 0) + (behavioralMatrix.behavior?.pasteAttempts || 0)}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Right-Click Attempts</span>
                    <span style={styles.behavioralValue}>
                      {behavioralMatrix.behavior?.rightClickAttempts || 0}
                    </span>
                  </div>
                  <div style={styles.behavioralStat}>
                    <span style={styles.behavioralLabel}>Risk Level</span>
                    <span style={{
                      ...styles.riskBadge,
                      background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                                 behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                      color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                             behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
                    }}>
                      {behavioralMatrix.riskAssessment?.level || 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <div style={styles.riskSummary}>
                  <p>{behavioralMatrix.riskAssessment?.summary || 'No behavioral concerns detected.'}</p>
                </div>
                
                {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                  <div style={styles.flaggedQuestions}>
                    <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                    <ul style={styles.flaggedList}>
                      {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                        <li key={index} style={styles.flaggedItem}>
                          Question {q.question_id}: {q.time_seconds}s
                          {q.changed ? ' - Changed' : ''}
                          {q.violation ? ' - Violation' : ''}
                        </li>
                      ))}
                      {behavioralMatrix.flaggedQuestions.length > 10 && (
                        <li style={styles.flaggedItem}>... and {behavioralMatrix.flaggedQuestions.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.noBehavioralData}>
                <p>No behavioral data is available for this assessment.</p>
                <p style={styles.noBehavioralSubtext}>
                  Behavioral data (tab switches, violations, answer changes, etc.) 
                  is only tracked for assessments completed after the behavioral tracking feature was implemented.
                </p>
              </div>
            )}
          </div>
        )}
      </AppLayout>
    );
  }

  // ============================================================
  // FALLBACK
  // ============================================================
  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Reports List
        </button>
        <div style={styles.fallbackContent}>
          <h2>Report Not Available</h2>
          <p>Unable to determine the report type.</p>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    maxWidth: '500px',
    margin: '40px auto',
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorButton: {
    padding: '10px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px'
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap'
  },
  breadcrumbButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#1a237e',
    fontWeight: '500'
  },
  breadcrumbSeparator: {
    color: '#94a3b8'
  },
  breadcrumbText: {
    fontSize: '14px',
    color: '#475569'
  },
  behavioralToggle: {
    padding: '6px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginLeft: 'auto'
  },
  behavioralSection: {
    maxWidth: '1200px',
    margin: '24px auto',
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  behavioralTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 16px 0',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0'
  },
  behavioralStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  behavioralStat: {
    background: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  behavioralLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px'
  },
  behavioralValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929'
  },
  riskBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  riskSummary: {
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#475569'
  },
  flaggedQuestions: {
    marginTop: '12px'
  },
  flaggedTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px'
  },
  flaggedList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  flaggedItem: {
    padding: '6px 12px',
    background: '#f8fafc',
    borderRadius: '4px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
    color: '#475569'
  },
  loadingBehavioral: {
    textAlign: 'center',
    padding: '20px',
    color: '#64748b'
  },
  noBehavioralData: {
    textAlign: 'center',
    padding: '30px 20px',
    color: '#64748b'
  },
  noBehavioralSubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '8px'
  },
  fallbackContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '20px'
  },
  fallbackContent: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
};

// Add keyframe animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
