// pages/supervisor/reports/index.js - UPDATED WITH PROPER SCORE CALCULATION
// Based on admin reports/index.js with proper score display

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function calculateNationalServiceScores(reportData, categoryScores, result) {
  let workplaceReadiness = 0;
  let intellectualCapability = 0;
  let overallScore = 0;

  // Try to get from report_data first
  if (reportData) {
    if (reportData.workplaceReadiness) workplaceReadiness = safeNumber(reportData.workplaceReadiness);
    else if (reportData.workplace_readiness) workplaceReadiness = safeNumber(reportData.workplace_readiness);
    else if (reportData.dimensions?.workplaceReadiness) workplaceReadiness = safeNumber(reportData.dimensions.workplaceReadiness);
    
    if (reportData.intellectualCapability) intellectualCapability = safeNumber(reportData.intellectualCapability);
    else if (reportData.intellectual_capability) intellectualCapability = safeNumber(reportData.intellectual_capability);
    else if (reportData.dimensions?.intellectualCapability) intellectualCapability = safeNumber(reportData.dimensions.intellectualCapability);
    
    if (reportData.overallScore) overallScore = safeNumber(reportData.overallScore);
    else if (reportData.percentage_score) overallScore = safeNumber(reportData.percentage_score);
    else if (reportData.dimensions?.overallScore) overallScore = safeNumber(reportData.dimensions.overallScore);
  }

  // Try to get from result if not found
  if (!workplaceReadiness && result) {
    workplaceReadiness = safeNumber(result.workplace_readiness);
    intellectualCapability = safeNumber(result.intellectual_capability);
    overallScore = safeNumber(result.percentage_score);
  }

  // If still 0, calculate from category scores
  if (workplaceReadiness === 0 || intellectualCapability === 0 || overallScore === 0) {
    const workplaceCategories = [
      'Communication & Teamwork',
      'Ownership & Integrity',
      'Technical Fundamentals',
      'Safety & Risk Awareness'
    ];
    
    const intellectualCategories = [
      'Learning Agility',
      'Problem Solving & Troubleshooting',
      'Logical Reasoning',
      'Numerical Reasoning',
      'Measurement & Engineering Units'
    ];

    let workplaceTotal = 0;
    let workplaceCount = 0;
    let intellectualTotal = 0;
    let intellectualCount = 0;

    if (categoryScores && categoryScores.length > 0) {
      categoryScores.forEach(cat => {
        const name = cat.category || cat.name || '';
        const percentage = safeNumber(cat.percentage || cat.score || 0);
        
        if (workplaceCategories.some(c => name.includes(c) || name.toLowerCase().includes(c.toLowerCase()))) {
          workplaceTotal += percentage;
          workplaceCount++;
        } else if (intellectualCategories.some(c => name.includes(c) || name.toLowerCase().includes(c.toLowerCase()))) {
          intellectualTotal += percentage;
          intellectualCount++;
        }
      });
    }

    if (workplaceReadiness === 0 && workplaceCount > 0) {
      workplaceReadiness = Math.round(workplaceTotal / workplaceCount);
    }
    
    if (intellectualCapability === 0 && intellectualCount > 0) {
      intellectualCapability = Math.round(intellectualTotal / intellectualCount);
    }
    
    if (overallScore === 0 && (workplaceReadiness > 0 || intellectualCapability > 0)) {
      overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
    }
  }

  return { workplaceReadiness, intellectualCapability, overallScore };
}

function calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability) {
  const workplace = Number(workplaceReadiness || 0);
  const intellectual = Number(intellectualCapability || 0);

  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  return 'Not Recommended';
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ReportsIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    averageScore: 0,
    completedAssessments: 0,
    pendingReview: 0,
    failed: 0
  });
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [error, setError] = useState(null);

  // Check URL for tab parameter
  useEffect(() => {
    const tab = router.query.tab;
    if (tab === 'other') {
      setActiveTab('other');
    } else if (tab === 'national') {
      setActiveTab('national');
    }
  }, [router.query.tab]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentSupervisor(profile);
      }

      // Get candidates for this supervisor
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .eq('supervisor_id', session.user.id);

      if (candidatesError) {
        console.error('Candidates error:', candidatesError);
        setLoading(false);
        return;
      }

      if (!candidates || candidates.length === 0) {
        setReports([]);
        setStats({
          totalAssessments: 0,
          averageScore: 0,
          completedAssessments: 0,
          pendingReview: 0,
          failed: 0
        });
        setLoading(false);
        return;
      }

      const candidateIds = candidates.map(c => c.id);

      // Get assessment results - try different column names
      let assessmentResults = [];

      // Try candidate_id
      try {
        const { data, error } = await supabase
          .from('assessment_results')
          .select('*')
          .in('candidate_id', candidateIds);

        if (!error && data && data.length > 0) {
          assessmentResults = data;
          console.log('Found using candidate_id:', data.length);
        }
      } catch (e) {}

      // If no results, try user_id
      if (assessmentResults.length === 0) {
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select('*')
            .in('user_id', candidateIds);

          if (!error && data && data.length > 0) {
            assessmentResults = data;
            console.log('Found using user_id:', data.length);
          }
        } catch (e) {}
      }

      // If no results, try profile_id
      if (assessmentResults.length === 0) {
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select('*')
            .in('profile_id', candidateIds);

          if (!error && data && data.length > 0) {
            assessmentResults = data;
            console.log('Found using profile_id:', data.length);
          }
        } catch (e) {}
      }

      if (!assessmentResults || assessmentResults.length === 0) {
        setReports([]);
        setStats({
          totalAssessments: 0,
          averageScore: 0,
          completedAssessments: 0,
          pendingReview: 0,
          failed: 0
        });
        setLoading(false);
        return;
      }

      // Get assessment details
      const assessmentIds = [...new Set(assessmentResults.map(a => a.assessment_id).filter(id => id))];
      let assessmentMap = {};

      if (assessmentIds.length > 0) {
        const { data: assessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select('id, title, description, type')
          .in('id', assessmentIds);

        if (!assessmentsError && assessments) {
          assessmentMap = assessments.reduce((acc, a) => {
            acc[a.id] = a;
            return acc;
          }, {});
          console.log('Assessment types loaded:', assessments.map(a => ({ id: a.id, title: a.title, type: a.type })));
        }
      }

      // Build report data with proper score calculation
      const reportData = [];
      let totalScore = 0;
      let scoreCount = 0;
      let completed = 0;
      let pending = 0;
      let failed = 0;

      assessmentResults.forEach(result => {
        let candidate = null;
        for (const c of candidates) {
          if (result.candidate_id === c.id || 
              result.user_id === c.id || 
              result.profile_id === c.id) {
            candidate = c;
            break;
          }
        }

        const assessment = assessmentMap[result.assessment_id] || {};
        const reportDataObj = result.report_data ? 
          (typeof result.report_data === 'string' ? JSON.parse(result.report_data) : result.report_data) : 
          {};
        
        // Determine if this is a National Service assessment
        const isNationalService = 
          assessment.type === 'national_service' || 
          assessment.type === 'ns' || 
          assessment.type === 'national' ||
          assessment.title === 'National Service Recruitment Assessment' ||
          assessment.title?.toLowerCase().includes('national service');

        // Calculate scores properly
        let displayScore = 0;
        let workplaceReadiness = 0;
        let intellectualCapability = 0;
        let recommendation = 'N/A';

        if (isNationalService) {
          // Get category scores
          const categoryScores = reportDataObj.categoryScores || 
                                 reportDataObj.category_scores || 
                                 result.category_scores || [];
          
          const calculated = calculateNationalServiceScores(
            reportDataObj,
            categoryScores,
            result
          );
          
          displayScore = calculated.overallScore;
          workplaceReadiness = calculated.workplaceReadiness;
          intellectualCapability = calculated.intellectualCapability;
          recommendation = calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability);
        } else {
          // For Stratavax, use percentage score directly
          displayScore = safeNumber(result.percentage_score || result.score || 0);
          recommendation = result.recommendation || 'N/A';
        }

        reportData.push({
          id: result.id,
          candidate: candidate?.full_name || 'Unknown',
          candidate_id: result.candidate_id || result.user_id || result.profile_id || 'N/A',
          university: candidate?.university || 'Not Specified',
          program: candidate?.programme || 'Not Specified',
          score: displayScore,
          status: result.status || 'Pending',
          date: result.completed_at ? new Date(result.completed_at).toISOString().split('T')[0] : 
                 result.created_at ? new Date(result.created_at).toISOString().split('T')[0] : 'N/A',
          assessment_id: result.assessment_id,
          assessment_title: assessment?.title || 'Untitled Assessment',
          assessment_type: assessment?.type || 'Unknown',
          isNationalService: isNationalService,
          workplaceReadiness: workplaceReadiness,
          intellectualCapability: intellectualCapability,
          recommendation: recommendation,
          report_data: reportDataObj
        });

        // Calculate stats
        if (displayScore > 0) {
          totalScore += displayScore;
          scoreCount++;
        }

        const status = (result.status || '').toLowerCase();
        if (status === 'completed' || status === 'complete') completed++;
        else if (status === 'pending' || status === 'in progress') pending++;
        else if (status === 'failed' || status === 'fail') failed++;
      });

      // Filter reports based on active tab
      const filteredReports = activeTab === 'national' 
        ? reportData.filter(r => r.isNationalService === true)
        : reportData.filter(r => r.isNationalService === false);

      // Calculate filtered stats
      let filteredTotalScore = 0;
      let filteredScoreCount = 0;
      let filteredCompleted = 0;
      let filteredPending = 0;
      let filteredFailed = 0;

      filteredReports.forEach(r => {
        if (r.score > 0) {
          filteredTotalScore += r.score;
          filteredScoreCount++;
        }
        const status = (r.status || '').toLowerCase();
        if (status === 'completed' || status === 'complete') filteredCompleted++;
        else if (status === 'pending' || status === 'in progress') filteredPending++;
        else if (status === 'failed' || status === 'fail') filteredFailed++;
      });

      setReports(filteredReports);
      setStats({
        totalAssessments: filteredReports.length,
        averageScore: filteredScoreCount > 0 ? Math.round(filteredTotalScore / filteredScoreCount) : 0,
        completedAssessments: filteredCompleted,
        pendingReview: filteredPending,
        failed: filteredFailed
      });

      console.log(`[Reports] ${activeTab} tab: ${filteredReports.length} reports found`);
      console.log('[Reports] Sample report:', filteredReports[0]);

    } catch (error) {
      console.error('Error loading reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    switch(s) {
      case 'completed': return '#48bb78';
      case 'complete': return '#48bb78';
      case 'pending': return '#ed8936';
      case 'in progress': return '#4299e1';
      case 'failed': return '#fc8181';
      case 'fail': return '#fc8181';
      default: return '#a0aec0';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#fc8181';
  };

  const getRecommendationBadge = (recommendation) => {
    const styles = {
      background: recommendation === 'Highly Recommended' ? '#dcfce7' :
                 recommendation === 'Recommended' ? '#dbeafe' :
                 recommendation === 'Reserve Pool' ? '#fef3c7' : '#fee2e2',
      color: recommendation === 'Highly Recommended' ? '#166534' :
             recommendation === 'Recommended' ? '#1e40af' :
             recommendation === 'Reserve Pool' ? '#92400e' : '#991b1b'
    };
    return styles;
  };

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>
              {activeTab === 'national' ? '📋 National Service Reports' : '📊 Other Assessment Reports'}
            </h1>
            <p style={styles.subtitle}>
              View and manage {activeTab === 'national' ? 'National Service' : 'other'} assessment reports
              {currentSupervisor && ` — ${currentSupervisor.full_name || currentSupervisor.email}`}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.exportButton}>📥 Export CSV</button>
            <button style={styles.printButton}>🖨️ Print</button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
            <button onClick={loadData} style={styles.retryButton}>Retry</button>
          </div>
        )}

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📋</div>
            <div>
              <div style={styles.statsValue}>{stats.totalAssessments}</div>
              <div style={styles.statsLabel}>Total Assessments</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📈</div>
            <div>
              <div style={styles.statsValue}>{stats.averageScore}%</div>
              <div style={styles.statsLabel}>Average Score</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>✅</div>
            <div>
              <div style={styles.statsValue}>{stats.completedAssessments}</div>
              <div style={styles.statsLabel}>Completed</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>⏳</div>
            <div>
              <div style={styles.statsValue}>{stats.pendingReview}</div>
              <div style={styles.statsLabel}>Pending Review</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => {
              setActiveTab('national');
              router.push('/supervisor/reports?tab=national', undefined, { shallow: true });
            }}
            style={{
              ...styles.tabButton,
              background: activeTab === 'national' ? '#0A1929' : 'white',
              color: activeTab === 'national' ? 'white' : '#4A5568',
              borderBottom: activeTab === 'national' ? '3px solid #2563EB' : '3px solid transparent'
            }}
          >
            📋 National Service Reports
          </button>
          <button
            onClick={() => {
              setActiveTab('other');
              router.push('/supervisor/reports?tab=other', undefined, { shallow: true });
            }}
            style={{
              ...styles.tabButton,
              background: activeTab === 'other' ? '#0A1929' : 'white',
              color: activeTab === 'other' ? 'white' : '#4A5568',
              borderBottom: activeTab === 'other' ? '3px solid #2563EB' : '3px solid transparent'
            }}
          >
            📊 Other Assessment Reports
          </button>
        </div>

        {/* Reports Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <h3 style={styles.emptyTitle}>
                No {activeTab === 'national' ? 'National Service' : 'Other Assessment'} Reports Found
              </h3>
              <p style={styles.emptyText}>
                There are no {activeTab === 'national' ? 'National Service' : 'other assessment'} reports available for your candidates yet.
              </p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.tableHeadCell}>Candidate</th>
                  <th style={styles.tableHeadCell}>University</th>
                  <th style={styles.tableHeadCell}>Program</th>
                  <th style={styles.tableHeadCell}>Assessment</th>
                  <th style={styles.tableHeadCell}>Score</th>
                  {activeTab === 'national' && (
                    <th style={styles.tableHeadCell}>Recommendation</th>
                  )}
                  <th style={styles.tableHeadCell}>Status</th>
                  <th style={styles.tableHeadCell}>Date</th>
                  <th style={styles.tableHeadCell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={styles.candidateName}>{report.candidate}</div>
                      <div style={styles.candidateEmail}>{report.candidate_id}</div>
                    </td>
                    <td style={styles.tableCell}>{report.university}</td>
                    <td style={styles.tableCell}>{report.program}</td>
                    <td style={styles.tableCell}>{report.assessment_title}</td>
                    <td style={styles.tableCell}>
                      {report.score > 0 ? (
                        <span style={{
                          ...styles.scoreBadge,
                          background: getScoreColor(report.score)
                        }}>
                          {report.score}%
                        </span>
                      ) : (
                        <span style={styles.noScoreBadge}>Pending</span>
                      )}
                    </td>
                    {activeTab === 'national' && (
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.recommendationBadge,
                          ...getRecommendationBadge(report.recommendation)
                        }}>
                          {report.recommendation}
                        </span>
                      </td>
                    )}
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        background: getStatusColor(report.status)
                      }}>
                        {report.status || 'Pending'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{report.date}</td>
                    <td style={styles.tableCell}>
                      <button
                        onClick={() => router.push(`/supervisor/reports/${report.id}`)}
                        style={styles.viewButton}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    flex: 1
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#991b1b'
  },
  retryButton: {
    padding: '4px 12px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  exportButton: {
    padding: '8px 20px',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  printButton: {
    padding: '8px 20px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  statsCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statsIcon: {
    fontSize: '32px'
  },
  statsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0A1929'
  },
  statsLabel: {
    fontSize: '14px',
    color: '#718096'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tabButton: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    flex: 1
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    background: '#F8FAFC'
  },
  tableHeadCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '2px solid #E2E8F0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4A5568',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    transition: 'background 0.2s ease'
  },
  tableCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#2D3748',
    verticalAlign: 'middle'
  },
  candidateName: {
    fontWeight: '500',
    color: '#1a202c'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  noScoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
    background: '#f1f5f9'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  recommendationBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  viewButton: {
    padding: '4px 12px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.2s ease'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
