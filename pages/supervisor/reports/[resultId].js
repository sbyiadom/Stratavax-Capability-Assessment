// pages/supervisor/reports/[resultId].js - FIXED CANDIDATE DATA EXTRACTION
// Fetches University and Programme from the correct nested candidate_profiles object.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

export default function SupervisorReportView() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isNationalService, setIsNationalService] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [behavioralMatrix, setBehavioralMatrix] = useState(null);
  const [showBehavioral, setShowBehavioral] = useState(false);
  const [loadingBehavioral, setLoadingBehavioral] = useState(false);

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

        // Check if user is supervisor or admin
        const userRole = session.user?.user_metadata?.role || session.user?.role;
        const isSupervisor = userRole === 'supervisor' || userRole === 'admin';
        
        if (!isSupervisor) {
          setError('You do not have permission to view this report.');
          setLoading(false);
          return;
        }

        setIsAuthorized(true);

        // Fetch the report from the API
        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
        }

        console.log('[Supervisor Report] Data received:', data);
        
        // Start with the raw API result
        let rawResult = data.result || {};
        let rawReport = data.report || {};
        let isNS = false;

        // ============================================================
        // STEP 1: Determine Assessment Type
        // ============================================================
        isNS = 
          data.isNationalService === true ||
          data.assessmentTypeCode === 'national_service' ||
          (rawResult?.report_data?.dimensions?.workplaceReadiness !== undefined) ||
          (rawReport?.dimensions?.workplaceReadiness !== undefined) ||
          (rawResult?.workplace_readiness !== undefined && rawResult?.workplace_readiness !== null);

        console.log('[Supervisor Report] Is National Service:', isNS);

        // ============================================================
        // STEP 2: Deep Merge (Safely combine report_data and result)
        // ============================================================
        if (rawResult.report_data && typeof rawResult.report_data === 'object') {
          rawResult = {
            ...rawResult,
            ...rawResult.report_data,
            candidateInfo: rawResult.report_data.candidateInfo || rawResult.candidateInfo || {},
            dimensions: rawResult.report_data.dimensions || rawResult.dimensions || {},
            categoryScores: rawResult.report_data.categoryScores || rawResult.report_data.categoryBreakdown || rawResult.categoryScores || [],
          };
        }

        // ============================================================
        // STEP 3: ISOLATE THE ASSESSMENT TYPE
        // ============================================================
        const assessmentTitle = rawResult.assessments?.title || rawResult.assessment_title || '';
        const assessmentTypeName = rawResult.assessments?.assessment_type?.name || 'General';
        const assessmentTypeCode = data.assessmentTypeCode || rawResult.assessments?.assessment_type?.code || 'general';

        console.log(`[Supervisor Report] Processing Assessment: ${assessmentTitle} (Type: ${assessmentTypeName})`);

        // ============================================================
        // STEP 4: SCORING ENGINE (Based on Assessment Type)
        // ============================================================
        let safeCategoryScores = rawResult.categoryScores || [];
        let trueAverageScore = 0;

        if (safeCategoryScores.length === 0 && rawResult.report_data?.categoryBreakdown) {
          safeCategoryScores = rawResult.report_data.categoryBreakdown;
        }

        if (isNS) {
          const workplace = Number(rawResult.dimensions?.workplaceReadiness || 0);
          const intellectual = Number(rawResult.dimensions?.intellectualCapability || 0);
          if (workplace > 0 || intellectual > 0) {
            trueAverageScore = Math.round((workplace + intellectual) / 2);
          } else {
            trueAverageScore = Number(rawResult.percentage_score || 0);
          }
        } 
        else if (safeCategoryScores.length > 0) {
          const validScores = safeCategoryScores.filter(cat => Number(cat.percentage || 0) > 0);
          if (validScores.length > 0) {
            const sum = validScores.reduce((acc, cat) => acc + Number(cat.percentage || 0), 0);
            trueAverageScore = Math.round(sum / validScores.length);
          } else {
            trueAverageScore = Number(rawResult.percentage_score || 0);
          }
        } 
        else {
          const earned = Number(rawResult.total_score || 0);
          const max = Number(rawResult.max_score || 0);
          if (max > 0) {
            trueAverageScore = Math.round((earned / max) * 100);
            console.log(`[Supervisor Report] Using Fallback Math for ${assessmentTitle}: ${earned}/${max} = ${trueAverageScore}%`);
          } else {
            trueAverageScore = Number(rawResult.percentage_score || 0);
          }
        }

        if (trueAverageScore === 0 && rawResult.completed_at && rawResult.max_score > 0) {
          const earned = Number(rawResult.total_score || 0);
          const max = Number(rawResult.max_score || 0);
          trueAverageScore = Math.round((earned / max) * 100);
        }

        console.log(`[Supervisor Report] Final Locked Score for ${assessmentTitle}: ${trueAverageScore}%`);

        // ============================================================
        // 🟢 FIX: Extract Candidate Info from the correct nested object
        // ============================================================
        // We look inside the deeply nested result.candidate_profiles
        const candidateProfiles = rawResult.candidate_profiles || rawResult.candidateInfo || {};

        // ============================================================
        // STEP 5: BUILD THE FINAL RESULT OBJECT
        // ============================================================
        const finalResult = {
          id: rawResult.id,
          user_id: rawResult.user_id,
          assessment_id: rawResult.assessment_id,
          total_score: rawResult.total_score || 0,
          max_score: rawResult.max_score || 0,
          completed_at: rawResult.completed_at,
          risk_level: rawResult.risk_level || 'Low',
          
          // OVERRIDE THE SCORES
          percentage_score: trueAverageScore,
          overallScore: trueAverageScore,
          score: trueAverageScore,
          
          // INJECT THE CATEGORIES
          categoryScores: safeCategoryScores,
          category_scores: safeCategoryScores,
          strengths: rawResult.strengths || [],
          weaknesses: rawResult.weaknesses || [],
          recommendations: rawResult.recommendations || [],
          executiveSummary: rawResult.executiveSummary || '',
          supervisorImplication: rawResult.supervisorImplication || '',
          
          // CANDIDATE & ASSESSMENT INFO (Mapped from the fix above)
          candidate_profiles: {
            full_name: candidateProfiles.full_name || candidateProfiles.fullName || 'Candidate',
            email: candidateProfiles.email || '',
            university: candidateProfiles.university || '',
            programme: candidateProfiles.programme || candidateProfiles.program || '',
            graduation_year: candidateProfiles.graduation_year || candidateProfiles.graduationYear || '',
            preferred_department: candidateProfiles.preferred_department || candidateProfiles.preferredDepartment || ''
          },
          assessments: {
            title: assessmentTitle,
            assessment_type: {
              name: assessmentTypeName,
              code: assessmentTypeCode
            }
          },
          candidateName: candidateProfiles.full_name || candidateProfiles.fullName || 'Candidate',
          classification: rawResult.classification || 'Standard Profile'
        };

        // Store all data
        setReportData({
          ...data,
          result: finalResult,
          report: isNS ? rawResult : finalResult,
          isNationalService: isNS
        });
        setIsNationalService(isNS);

        // ============================================================
        // Fetch Behavioral Matrix
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
  // Fetch Behavioral Matrix
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
        // Try different response formats
        const matrix = data.behavioralMatrix || data.matrixData || data.data || data.result;
        if (matrix) {
          console.log('[Behavioral] Matrix data found:');
          console.log('[Behavioral] - tabSwitches:', matrix.behavior?.tabSwitches);
          console.log('[Behavioral] - violations:', matrix.behavior?.violations);
          console.log('[Behavioral] - answerChanges:', matrix.behavior?.answerChanges);
          setBehavioralMatrix(matrix);
        } else {
          console.log('[Behavioral] No matrix data found in response');
        }
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    } finally {
      setLoadingBehavioral(false);
    }
  };

  const handleBack = () => {
    router.push('/supervisor');
  };

  const toggleBehavioral = () => {
    setShowBehavioral(!showBehavioral);
  };

  // ============================================================
  // Format time helper
  // ============================================================
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ============================================================
  // Check if behavioral data exists - SIMPLIFIED
  // ============================================================
  const hasBehavioralData = behavioralMatrix !== null && behavioralMatrix !== undefined;

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading report...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
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
  // Render the correct report format based on assessment type
  // ============================================================
  
  // If it's a National Service assessment, use the National Service Report
  if (isNationalService && reportData?.report && isAuthorized) {
    console.log('[Supervisor Report] Rendering National Service Report');
    console.log('[Supervisor Report] Passing behavioralMatrix:', behavioralMatrix);
    
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Supervisor Dashboard
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
          showAssignment={false}
          userRole="supervisor"
          behavioralMatrix={behavioralMatrix}
          loadingBehavioral={loadingBehavioral}
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
                      {behavioralMatrix.riskAssessment?.level || 'Low Risk'}
                    </span>
                  </div>
                </div>
                
                <div style={styles.riskSummary}>
                  <p>
                    Behavioral flags: {behavioralMatrix.behavior?.violations || 0} violation(s), {behavioralMatrix.behavior?.tabSwitches || 0} tab switches.
                  </p>
                  {behavioralMatrix.riskAssessment?.detail && (
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      {behavioralMatrix.riskAssessment.detail}
                    </p>
                  )}
                </div>
                
                {/* Behavioral Commentary */}
                {behavioralMatrix?.behavior && (
                  <div style={styles.behavioralCommentary}>
                    <h4 style={styles.commentaryTitle}>Behavioral Analysis</h4>
                    <div style={styles.commentaryMetrics}>
                      <div style={styles.commentaryItem}>
                        <span style={styles.commentaryLabel}>Tab Switches:</span>
                        <span style={styles.commentaryText}>
                          {behavioralMatrix.behavior.tabSwitches === 0
                            ? 'No tab switching detected. Candidate maintained focus.'
                            : behavioralMatrix.behavior.tabSwitches <= 5
                              ? `Minimal tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Occasional distraction.`
                              : behavioralMatrix.behavior.tabSwitches <= 20
                                ? `Moderate tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Potential external reference use.`
                                : `High tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Significant distraction detected.`
                          }
                        </span>
                      </div>
                      <div style={styles.commentaryItem}>
                        <span style={styles.commentaryLabel}>Violations:</span>
                        <span style={styles.commentaryText}>
                          {behavioralMatrix.behavior.violations === 0
                            ? 'No rule violations detected. Candidate followed all guidelines.'
                            : behavioralMatrix.behavior.violations <= 3
                              ? `Minor violations (${behavioralMatrix.behavior.violations}). May be accidental.`
                              : behavioralMatrix.behavior.violations <= 10
                                ? `Moderate violations (${behavioralMatrix.behavior.violations}). Review recommended.`
                                : `High violations (${behavioralMatrix.behavior.violations}). Immediate review required.`
                          }
                        </span>
                      </div>
                      <div style={styles.commentaryItem}>
                        <span style={styles.commentaryLabel}>Answer Changes:</span>
                        <span style={styles.commentaryText}>
                          {behavioralMatrix.behavior.answerChanges === 0
                            ? 'No answer changes. Candidate showed confidence.'
                            : behavioralMatrix.behavior.answerChanges <= 3
                              ? `Minimal changes (${behavioralMatrix.behavior.answerChanges}). Some hesitation.`
                              : behavioralMatrix.behavior.answerChanges <= 10
                                ? `Moderate changes (${behavioralMatrix.behavior.answerChanges}). Uncertainty detected.`
                                : `High changes (${behavioralMatrix.behavior.answerChanges}). Significant uncertainty.`
                          }
                        </span>
                      </div>
                    </div>
                    
                    {(behavioralMatrix.behavior.violations > 0 || behavioralMatrix.behavior.tabSwitches > 5) ? (
                      <div style={styles.recommendationBox}>
                        <h5 style={styles.recommendationTitle}>Recommendations</h5>
                        <ul style={styles.recommendationList}>
                          {behavioralMatrix.behavior.tabSwitches > 20 && (
                            <li>Consider invalidating the assessment due to excessive tab switching.</li>
                          )}
                          {behavioralMatrix.behavior.violations > 10 && (
                            <li>Immediate review required. Assessment validity is compromised.</li>
                          )}
                          {behavioralMatrix.behavior.tabSwitches > 5 && behavioralMatrix.behavior.tabSwitches <= 20 && (
                            <li>Conduct a follow-up interview to discuss potential external reference use.</li>
                          )}
                          {behavioralMatrix.behavior.violations > 3 && behavioralMatrix.behavior.violations <= 10 && (
                            <li>Review specific flagged questions and discuss with candidate.</li>
                          )}
                          {behavioralMatrix.behavior.answerChanges > 5 && (
                            <li>Review questions where answers were changed for potential ambiguity.</li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      <div style={styles.cleanCommentary}>
                        No concerning behavioral patterns detected. The candidate completed the assessment with integrity.
                      </div>
                    )}
                  </div>
                )}
                
                {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                  <div style={styles.flaggedQuestions}>
                    <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                    <ul style={styles.flaggedList}>
                      {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                        <li key={index} style={styles.flaggedItem}>
                          Question {q.question_id}: {q.time_seconds}s
                          {q.changed ? ' - Changed' : ''}
                          {q.violation ? ' - Violation' : ''}
                          {q.comment ? ` - ${q.comment}` : ''}
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

  // If we have report_data but it's not being detected, try to render it anyway
  if (reportData?.result?.report_data) {
    // Check if the report_data has National Service structure
    const hasNSStructure = reportData.result.report_data.dimensions && 
                          reportData.result.report_data.dimensions.workplaceReadiness !== undefined;
    
    if (hasNSStructure) {
      console.log('[Supervisor Report] Rendering National Service Report from report_data');
      return (
        <AppLayout background="/images/supervisor-bg.jpg">
          <div style={styles.breadcrumb}>
            <button onClick={handleBack} style={styles.breadcrumbButton}>
              ← Back to Supervisor Dashboard
            </button>
            <span style={styles.breadcrumbSeparator}>|</span>
            <span style={styles.breadcrumbText}>National Service Report</span>
            <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
              {showBehavioral ? 'Hide Behavioral Matrix' : 'Show Behavioral Matrix'}
            </button>
          </div>
          <NationalServiceReport 
            report={reportData.result.report_data} 
            onBack={handleBack}
            showAssignment={false}
            userRole="supervisor"
            behavioralMatrix={behavioralMatrix}
            loadingBehavioral={loadingBehavioral}
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
                        {behavioralMatrix.riskAssessment?.level || 'Low Risk'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.riskSummary}>
                    <p>
                      Behavioral flags: {behavioralMatrix.behavior?.violations || 0} violation(s), {behavioralMatrix.behavior?.tabSwitches || 0} tab switches.
                    </p>
                    {behavioralMatrix.riskAssessment?.detail && (
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        {behavioralMatrix.riskAssessment.detail}
                      </p>
                    )}
                  </div>
                  
                  {/* Behavioral Commentary */}
                  {behavioralMatrix?.behavior && (
                    <div style={styles.behavioralCommentary}>
                      <h4 style={styles.commentaryTitle}>Behavioral Analysis</h4>
                      <div style={styles.commentaryMetrics}>
                        <div style={styles.commentaryItem}>
                          <span style={styles.commentaryLabel}>Tab Switches:</span>
                          <span style={styles.commentaryText}>
                            {behavioralMatrix.behavior.tabSwitches === 0
                              ? 'No tab switching detected. Candidate maintained focus.'
                              : behavioralMatrix.behavior.tabSwitches <= 5
                                ? `Minimal tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Occasional distraction.`
                                : behavioralMatrix.behavior.tabSwitches <= 20
                                  ? `Moderate tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Potential external reference use.`
                                  : `High tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Significant distraction detected.`
                            }
                          </span>
                        </div>
                        <div style={styles.commentaryItem}>
                          <span style={styles.commentaryLabel}>Violations:</span>
                          <span style={styles.commentaryText}>
                            {behavioralMatrix.behavior.violations === 0
                              ? 'No rule violations detected. Candidate followed all guidelines.'
                              : behavioralMatrix.behavior.violations <= 3
                                ? `Minor violations (${behavioralMatrix.behavior.violations}). May be accidental.`
                                : behavioralMatrix.behavior.violations <= 10
                                  ? `Moderate violations (${behavioralMatrix.behavior.violations}). Review recommended.`
                                  : `High violations (${behavioralMatrix.behavior.violations}). Immediate review required.`
                            }
                          </span>
                        </div>
                        <div style={styles.commentaryItem}>
                          <span style={styles.commentaryLabel}>Answer Changes:</span>
                          <span style={styles.commentaryText}>
                            {behavioralMatrix.behavior.answerChanges === 0
                              ? 'No answer changes. Candidate showed confidence.'
                              : behavioralMatrix.behavior.answerChanges <= 3
                                ? `Minimal changes (${behavioralMatrix.behavior.answerChanges}). Some hesitation.`
                                : behavioralMatrix.behavior.answerChanges <= 10
                                  ? `Moderate changes (${behavioralMatrix.behavior.answerChanges}). Uncertainty detected.`
                                  : `High changes (${behavioralMatrix.behavior.answerChanges}). Significant uncertainty.`
                            }
                          </span>
                        </div>
                      </div>
                      
                      {(behavioralMatrix.behavior.violations > 0 || behavioralMatrix.behavior.tabSwitches > 5) ? (
                        <div style={styles.recommendationBox}>
                          <h5 style={styles.recommendationTitle}>Recommendations</h5>
                          <ul style={styles.recommendationList}>
                            {behavioralMatrix.behavior.tabSwitches > 20 && (
                              <li>Consider invalidating the assessment due to excessive tab switching.</li>
                            )}
                            {behavioralMatrix.behavior.violations > 10 && (
                              <li>Immediate review required. Assessment validity is compromised.</li>
                            )}
                            {behavioralMatrix.behavior.tabSwitches > 5 && behavioralMatrix.behavior.tabSwitches <= 20 && (
                              <li>Conduct a follow-up interview to discuss potential external reference use.</li>
                            )}
                            {behavioralMatrix.behavior.violations > 3 && behavioralMatrix.behavior.violations <= 10 && (
                              <li>Review specific flagged questions and discuss with candidate.</li>
                            )}
                            {behavioralMatrix.behavior.answerChanges > 5 && (
                              <li>Review questions where answers were changed for potential ambiguity.</li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <div style={styles.cleanCommentary}>
                          No concerning behavioral patterns detected. The candidate completed the assessment with integrity.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                    <div style={styles.flaggedQuestions}>
                      <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                      <ul style={styles.flaggedList}>
                        {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                          <li key={index} style={styles.flaggedItem}>
                            Question {q.question_id}: {q.time_seconds}s
                            {q.changed ? ' - Changed' : ''}
                            {q.violation ? ' - Violation' : ''}
                            {q.comment ? ` - ${q.comment}` : ''}
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
  }

  // ============================================================
  // DEFAULT: Use Stratavax Report for all non-National Service assessments
  // ============================================================
  console.log('[Supervisor Report] Rendering Stratavax Report');
  console.log('[Supervisor Report] Passing behavioralMatrix:', behavioralMatrix);
  
  // Prepare data for Stratavax report
  const stratavaxResult = reportData?.result || null;
  const stratavaxCandidate = stratavaxResult?.candidate_profiles || null;
  const stratavaxAssessment = stratavaxResult?.assessments || null;

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.breadcrumb}>
        <button onClick={handleBack} style={styles.breadcrumbButton}>
          ← Back to Supervisor Dashboard
        </button>
        <span style={styles.breadcrumbSeparator}>|</span>
        <span style={styles.breadcrumbText}>Assessment Report</span>
        <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
          {showBehavioral ? 'Hide Behavioral Data' : 'Show Behavioral Data'}
        </button>
      </div>
      
      <StratavaxReport 
        result={stratavaxResult}
        candidate={stratavaxCandidate}
        assessment={stratavaxAssessment}
        onBack={handleBack}
        behavioralMatrix={behavioralMatrix}
        loadingBehavioral={loadingBehavioral}
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
                    {behavioralMatrix.riskAssessment?.level || 'Low Risk'}
                  </span>
                </div>
              </div>
              
              <div style={styles.riskSummary}>
                <p>
                  Behavioral flags: {behavioralMatrix.behavior?.violations || 0} violation(s), {behavioralMatrix.behavior?.tabSwitches || 0} tab switches.
                </p>
                {behavioralMatrix.riskAssessment?.detail && (
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    {behavioralMatrix.riskAssessment.detail}
                  </p>
                )}
              </div>
              
              {/* Behavioral Commentary */}
              {behavioralMatrix?.behavior && (
                <div style={styles.behavioralCommentary}>
                  <h4 style={styles.commentaryTitle}>Behavioral Analysis</h4>
                  <div style={styles.commentaryMetrics}>
                    <div style={styles.commentaryItem}>
                      <span style={styles.commentaryLabel}>Tab Switches:</span>
                      <span style={styles.commentaryText}>
                        {behavioralMatrix.behavior.tabSwitches === 0
                          ? 'No tab switching detected. Candidate maintained focus.'
                          : behavioralMatrix.behavior.tabSwitches <= 5
                            ? `Minimal tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Occasional distraction.`
                            : behavioralMatrix.behavior.tabSwitches <= 20
                              ? `Moderate tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Potential external reference use.`
                              : `High tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Significant distraction detected.`
                        }
                      </span>
                    </div>
                    <div style={styles.commentaryItem}>
                      <span style={styles.commentaryLabel}>Violations:</span>
                      <span style={styles.commentaryText}>
                        {behavioralMatrix.behavior.violations === 0
                          ? 'No rule violations detected. Candidate followed all guidelines.'
                          : behavioralMatrix.behavior.violations <= 3
                            ? `Minor violations (${behavioralMatrix.behavior.violations}). May be accidental.`
                            : behavioralMatrix.behavior.violations <= 10
                              ? `Moderate violations (${behavioralMatrix.behavior.violations}). Review recommended.`
                              : `High violations (${behavioralMatrix.behavior.violations}). Immediate review required.`
                        }
                      </span>
                    </div>
                    <div style={styles.commentaryItem}>
                      <span style={styles.commentaryLabel}>Answer Changes:</span>
                      <span style={styles.commentaryText}>
                        {behavioralMatrix.behavior.answerChanges === 0
                          ? 'No answer changes. Candidate showed confidence.'
                          : behavioralMatrix.behavior.answerChanges <= 3
                            ? `Minimal changes (${behavioralMatrix.behavior.answerChanges}). Some hesitation.`
                            : behavioralMatrix.behavior.answerChanges <= 10
                              ? `Moderate changes (${behavioralMatrix.behavior.answerChanges}). Uncertainty detected.`
                              : `High changes (${behavioralMatrix.behavior.answerChanges}). Significant uncertainty.`
                        }
                      </span>
                    </div>
                  </div>
                  
                  {(behavioralMatrix.behavior.violations > 0 || behavioralMatrix.behavior.tabSwitches > 5) ? (
                    <div style={styles.recommendationBox}>
                      <h5 style={styles.recommendationTitle}>Recommendations</h5>
                      <ul style={styles.recommendationList}>
                        {behavioralMatrix.behavior.tabSwitches > 20 && (
                          <li>Consider invalidating the assessment due to excessive tab switching.</li>
                        )}
                        {behavioralMatrix.behavior.violations > 10 && (
                          <li>Immediate review required. Assessment validity is compromised.</li>
                        )}
                        {behavioralMatrix.behavior.tabSwitches > 5 && behavioralMatrix.behavior.tabSwitches <= 20 && (
                          <li>Conduct a follow-up interview to discuss potential external reference use.</li>
                        )}
                        {behavioralMatrix.behavior.violations > 3 && behavioralMatrix.behavior.violations <= 10 && (
                          <li>Review specific flagged questions and discuss with candidate.</li>
                        )}
                        {behavioralMatrix.behavior.answerChanges > 5 && (
                          <li>Review questions where answers were changed for potential ambiguity.</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div style={styles.cleanCommentary}>
                      No concerning behavioral patterns detected. The candidate completed the assessment with integrity.
                    </div>
                  )}
                </div>
              )}
              
              {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                <div style={styles.flaggedQuestions}>
                  <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                  <ul style={styles.flaggedList}>
                    {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                      <li key={index} style={styles.flaggedItem}>
                        Question {q.question_id}: {q.time_seconds}s
                        {q.changed ? ' - Changed' : ''}
                        {q.violation ? ' - Violation' : ''}
                        {q.comment ? ` - ${q.comment}` : ''}
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
  // ============================================================
  // Behavioral Commentary Styles
  // ============================================================
  behavioralCommentary: {
    marginTop: '16px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  commentaryTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0'
  },
  commentaryMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  commentaryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #f8fafc'
  },
  commentaryLabel: {
    fontWeight: '600',
    color: '#475569',
    minWidth: '120px',
    fontSize: '13px',
    flexShrink: 0
  },
  commentaryText: {
    fontSize: '13px',
    color: '#1a202c',
    lineHeight: '1.5'
  },
  recommendationBox: {
    marginTop: '12px',
    padding: '12px 16px',
    background: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d'
  },
  recommendationTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#92400e',
    margin: '0 0 6px 0'
  },
  recommendationList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#78350f'
  },
  cleanCommentary: {
    marginTop: '12px',
    padding: '12px 16px',
    background: '#dcfce7',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    fontSize: '13px',
    color: '#166534'
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
