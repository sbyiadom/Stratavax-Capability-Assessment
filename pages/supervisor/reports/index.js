// pages/supervisor/reports/index.js - COMPLETE FIXED FILE
// Replicates the admin version's logic for proper report categorization

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import AppLayout from '../../../components/AppLayout';

// National Service Assessment ID - same as admin
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// HELPER FUNCTIONS (Replicated from admin)
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

function extractScore(result) {
  // Try multiple possible score fields
  const possibleFields = [
    'score',
    'percentage_score',
    'overallScore',
    'overall_score',
    'total_score',
    'final_score',
    'result'
  ];
  
  for (const field of possibleFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const val = safeNumber(result[field]);
      if (val > 0) return val;
    }
  }
  
  // Check if score is in report_data
  if (result.report_data) {
    try {
      const reportData = typeof result.report_data === 'string' 
        ? JSON.parse(result.report_data) 
        : result.report_data;
      
      if (reportData.overallScore) return safeNumber(reportData.overallScore);
      if (reportData.percentage_score) return safeNumber(reportData.percentage_score);
      if (reportData.score) return safeNumber(reportData.score);
      if (reportData.totalScore) return safeNumber(reportData.totalScore);
      if (reportData.result) return safeNumber(reportData.result);
      
      if (reportData.dimensions?.overallScore) return safeNumber(reportData.dimensions.overallScore);
      if (reportData.dimensions?.percentage_score) return safeNumber(reportData.dimensions.percentage_score);
      
      if (reportData.scores?.overall) return safeNumber(reportData.scores.overall);
      if (reportData.scores?.total) return safeNumber(reportData.scores.total);
      if (reportData.scores?.percentage) return safeNumber(reportData.scores.percentage);
    } catch (e) {
      console.log('Error parsing report_data:', e);
    }
  }
  
  return 0;
}

function extractRecommendation(result) {
  const possibleFields = [
    'recommendation',
    'classification',
    'status',
    'result_status'
  ];
  
  for (const field of possibleFields) {
    if (result[field]) {
      const val = String(result[field]);
      if (val && val !== 'Pending' && val !== 'pending') {
        return val;
      }
    }
  }
  
  if (result.report_data) {
    try {
      const reportData = typeof result.report_data === 'string' 
        ? JSON.parse(result.report_data) 
        : result.report_data;
      
      if (reportData.recommendation) return reportData.recommendation;
      if (reportData.classification) return reportData.classification;
      if (reportData.result) return reportData.result;
    } catch (e) {}
  }
  
  return 'N/A';
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

      // Get assessment results using user_id (same as admin)
      let assessmentResults = [];

      try {
        const { data, error } = await supabase
          .from('assessment_results')
          .select('*')
          .in('user_id', candidateIds);

        if (!error && data && data.length > 0) {
          assessmentResults = data;
          console.log('Found assessment results:', data.length);
        } else if (error) {
          console.error('Error fetching assessment_results:', error);
        }
      } catch (e) {
        console.error('Error fetching assessment_results:', e);
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

      // Get assessment titles
      const assessmentIds = [...new Set(assessmentResults.map(a => a.assessment_id).filter(id => id))];
      let assessmentMap = {};

      if (assessmentIds.length > 0) {
        try {
          const { data: assessments, error: assessmentsError } = await supabase
            .from('assessments')
            .select('id, title, description')
            .in('id', assessmentIds);

          if (!assessmentsError && assessments) {
            assessmentMap = assessments.reduce((acc, a) => {
              acc[a.id] = a;
              return acc;
            }, {});
          }
        } catch (e) {
          console.error('Error fetching assessments:', e);
        }
      }

      // Process reports - replicating admin logic
      const processedReports = assessmentResults.map(result => {
        const candidate = candidates.find(c => c.id === result.user_id);
        const assessment = assessmentMap[result.assessment_id] || {};
        
        // ✅ FIX: Determine if National Service - same logic as admin
        const isNationalService = 
          result.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
          assessment.title === 'National Service Recruitment Assessment' ||
          result.isNationalService === true;

        // Get report_data
        let reportData = {};
        try {
          reportData = typeof result.report_data === 'string' 
            ? JSON.parse(result.report_data) 
            : (result.report_data || {});
        } catch (e) {
          reportData = {};
        }

        // Get category scores
        const categoryScores = reportData.categoryScores || 
                               reportData.category_scores || 
                               result.category_scores || [];

        let displayScore = 0;
        let workplaceReadiness = 0;
        let intellectualCapability = 0;
        let recommendation = 'N/A';

        if (isNationalService) {
          // Calculate scores for National Service (same as admin)
          const calculated = calculateNationalServiceScores(
            reportData,
            categoryScores,
            result
          );
          
          displayScore = calculated.overallScore;
          workplaceReadiness = calculated.workplaceReadiness;
          intellectualCapability = calculated.intellectualCapability;
          recommendation = calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability);
        } else {
          // For Stratavax, use percentage score directly
          displayScore = extractScore(result);
          recommendation = extractRecommendation(result);
        }

        return {
          id: result.id,
          candidate_name: candidate?.full_name || 'Unknown',
          candidate_email: candidate?.email || '',
          candidate_university: candidate?.university || 'Not Specified',
          candidate_programme: candidate?.programme || 'Not Specified',
          user_id: result.user_id,
          assessment_id: result.assessment_id,
          assessment_title: assessment?.title || 'Untitled Assessment',
          isNationalService: isNationalService,
          displayScore: displayScore,
          percentage_score: result.percentage_score || 0,
          workplaceReadiness: workplaceReadiness,
          intellectualCapability: intellectualCapability,
          recommendation: recommendation,
          status: result.status || 'Pending',
          completed_at: result.completed_at,
          created_at: result.created_at,
          report_data: reportData,
          category_scores: categoryScores
        };
      });

      // Separate into National Service and Other (same as admin)
      const nationalServiceReports = processedReports.filter(r => r.isNationalService === true);
      const otherReports = processedReports.filter(r => r.isNationalService === false);

      console.log(`📊 SUMMARY: ${nationalServiceReports.length} National Service, ${otherReports.length} Other Assessments`);

      // Select which reports to show based on active tab
      const filteredReports = activeTab === 'national' ? nationalServiceReports : otherReports;

      // Calculate stats
      let filteredTotalScore = 0;
      let filteredScoreCount = 0;
      let filteredCompleted = 0;
      let filteredPending = 0;
      let filteredFailed = 0;

      filteredReports.forEach(r => {
        if (r.displayScore > 0) {
          filteredTotalScore += r.displayScore;
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
                      <div style={styles.candidateName}>{report.candidate_name}</div>
                      <div style={styles.candidateEmail}>{report.candidate_email}</div>
                    </td>
                    <td style={styles.tableCell}>{report.candidate_university}</td>
                    <td style={styles.tableCell}>{report.candidate_programme}</td>
                    <td style={styles.tableCell}>{report.assessment_title}</td>
                    <td style={styles.tableCell}>
                      {report.displayScore > 0 ? (
                        <span style={{
                          ...styles.scoreBadge,
                          background: getScoreColor(report.displayScore)
                        }}>
                          {report.displayScore}%
                        </span>
                      ) : (
                        <span style={styles.noScoreBadge}>Pending</span>
                      )}
                    </td>
                    {activeTab === 'national' && (
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.recommendationBadge,
                          ...getRecommendationBadge(report.recommendation || 'Not Recommended')
                        }}>
                          {report.recommendation || 'Not Recommended'}
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
                    <td style={styles.tableCell}>
                      {report.completed_at ? new Date(report.completed_at).toISOString().split('T')[0] : 
                       report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : 'N/A'}
                    </td>
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
