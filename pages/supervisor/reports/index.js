// pages/supervisor/reports/index.js - COMPLETE FIXED
// Uses the API endpoint properly with user_id

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function calculateScore(report) {
  if (report.displayScore !== undefined && report.displayScore > 0) {
    return report.displayScore;
  }
  if (report.total_score !== undefined && report.max_score !== undefined) {
    const total = safeNumber(report.total_score);
    const max = safeNumber(report.max_score);
    if (max > 0) {
      return Math.round((total / max) * 100);
    }
  }
  if (report.percentage_score !== undefined && report.percentage_score !== null) {
    const val = safeNumber(report.percentage_score);
    if (val > 0) return val;
  }
  return 0;
}

function calculateNationalServiceRecommendation(score) {
  const s = Number(score || 0);
  if (s >= 85) return 'Highly Recommended';
  if (s >= 75) return 'Recommended';
  if (s >= 65) return 'Reserve Pool';
  return 'Not Recommended';
}

function getStatus(report) {
  if (report.completed_at) {
    return 'Completed';
  }
  return report.status || 'Pending';
}

export default function ReportsIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national');
  const [allReports, setAllReports] = useState([]);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    averageScore: 0,
    completedAssessments: 0,
    pendingReview: 0,
    failed: 0
  });
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [error, setError] = useState(null);

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
      const token = sessionData?.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      // ✅ Use the API endpoint
      const response = await fetch('/api/supervisor/reports', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load reports');
      }

      // Get supervisor info
      const { data: profile } = await supabase
        .from('supervisor_profiles')
        .select('full_name, email')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentSupervisor(profile);
      }

      // Process reports from the API
      const reportsData = data.reports || [];
      
      console.log('📊 Reports from API:', reportsData.length);

      const processedReports = reportsData.map(report => {
        const isNationalService = 
          report.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
          report.is_national_service === true ||
          report.assessment_title === 'National Service Recruitment Assessment';

        const displayScore = calculateScore(report);
        
        let recommendation = report.recommendation || 'N/A';
        if (isNationalService && displayScore > 0) {
          recommendation = calculateNationalServiceRecommendation(displayScore);
        }

        const status = getStatus(report);

        return {
          id: report.result_id || report.id,
          candidate_name: report.candidate_name || 'Unknown',
          candidate_email: report.candidate_email || '',
          candidate_university: report.university || 'Not Specified',
          candidate_programme: report.programme || 'Not Specified',
          assessment_id: report.assessment_id,
          assessment_title: report.assessment_title || 'Untitled Assessment',
          displayScore: displayScore,
          recommendation: recommendation,
          status: status,
          completed_at: report.completed_at,
          created_at: report.created_at,
          isNationalService: isNationalService,
          total_score: report.total_score,
          max_score: report.max_score,
          percentage_score: report.percentage_score
        };
      });

      setAllReports(processedReports);

      const nationalCount = processedReports.filter(r => r.isNationalService === true).length;
      const otherCount = processedReports.filter(r => r.isNationalService === false).length;
      console.log(`📊 BREAKDOWN: ${nationalCount} National Service, ${otherCount} Other Assessments`);

      updateStats(processedReports, activeTab);

    } catch (error) {
      console.error('Error loading reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const updateStats = (reports, tab) => {
    const filtered = tab === 'national' 
      ? reports.filter(r => r.isNationalService === true)
      : reports.filter(r => r.isNationalService === false);

    let totalScore = 0;
    let scoreCount = 0;
    let completed = 0;
    let pending = 0;
    let failed = 0;

    filtered.forEach(r => {
      if (r.displayScore > 0) {
        totalScore += r.displayScore;
        scoreCount++;
      }
      if (r.status === 'Completed') completed++;
      else if (r.status === 'Pending' || r.status === 'In Progress') pending++;
      else if (r.status === 'Failed') failed++;
    });

    setStats({
      totalAssessments: filtered.length,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      completedAssessments: completed,
      pendingReview: pending,
      failed: failed
    });
  };

  useEffect(() => {
    if (allReports.length > 0) {
      updateStats(allReports, activeTab);
    }
  }, [activeTab, allReports]);

  const getFilteredReports = () => {
    if (allReports.length === 0) return [];
    return activeTab === 'national' 
      ? allReports.filter(r => r.isNationalService === true)
      : allReports.filter(r => r.isNationalService === false);
  };

  const filteredReports = getFilteredReports();

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#48bb78';
      case 'Pending': return '#ed8936';
      case 'In Progress': return '#4299e1';
      case 'Failed': return '#fc8181';
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/supervisor/reports?tab=${tab}`, undefined, { shallow: true });
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
            onClick={() => handleTabChange('national')}
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
            onClick={() => handleTabChange('other')}
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
          ) : filteredReports.length === 0 ? (
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
                {filteredReports.map((report) => (
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
                        {report.status}
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
