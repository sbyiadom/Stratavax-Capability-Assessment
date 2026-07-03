// pages/admin/reports/index.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

export default function AdminReportsList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!session) return;
    fetchReports();
  }, [session]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('assessment_results')
        .select(`
          id,
          user_id,
          assessment_id,
          percentage_score,
          workplace_readiness,
          intellectual_capability,
          recommendation,
          completed_at,
          is_auto_submitted,
          candidate_profiles!inner(full_name, email),
          assessments!inner(title, assessment_type:assessment_types(code))
        `)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Filter for National Service assessments
      const nationalServiceReports = data.filter(
        item => item.assessments?.assessment_type?.code === 'national_service'
      );

      setReports(nationalServiceReports);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const handleViewReport = (resultId) => {
    router.push(`/admin/reports/${resultId}`);
  };

  const handleBack = () => {
    router.push('/admin');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Admin Dashboard
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>Assessment Reports</h1>
          <p style={styles.subtitle}>National Service Assessment Reports</p>
          <div style={styles.stats}>
            <span style={styles.statBadge}>Total Reports: {reports.length}</span>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Assessment</th>
                <th style={styles.th}>Workplace Readiness</th>
                <th style={styles.th}>Intellectual Capability</th>
                <th style={styles.th}>Overall Score</th>
                <th style={styles.th}>Recommendation</th>
                <th style={styles.th}>Completed</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="8" style={styles.emptyState}>
                    No National Service assessment reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.candidateName}>
                        {report.candidate_profiles?.full_name || 'Unknown'}
                      </div>
                      <div style={styles.candidateEmail}>
                        {report.candidate_profiles?.email || ''}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {report.assessments?.title || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.scoreBadge,
                        background: report.workplace_readiness >= 75 ? '#dcfce7' :
                                   report.workplace_readiness >= 65 ? '#fef3c7' : '#fee2e2',
                        color: report.workplace_readiness >= 75 ? '#166534' :
                               report.workplace_readiness >= 65 ? '#92400e' : '#991b1b'
                      }}>
                        {report.workplace_readiness || 0}%
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.scoreBadge,
                        background: report.intellectual_capability >= 75 ? '#dcfce7' :
                                   report.intellectual_capability >= 65 ? '#fef3c7' : '#fee2e2',
                        color: report.intellectual_capability >= 75 ? '#166534' :
                               report.intellectual_capability >= 65 ? '#92400e' : '#991b1b'
                      }}>
                        {report.intellectual_capability || 0}%
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.scoreBadge,
                        background: report.percentage_score >= 75 ? '#dcfce7' :
                                   report.percentage_score >= 65 ? '#fef3c7' : '#fee2e2',
                        color: report.percentage_score >= 75 ? '#166534' :
                               report.percentage_score >= 65 ? '#92400e' : '#991b1b'
                      }}>
                        {report.percentage_score || 0}%
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.recommendationBadge,
                        background: report.recommendation === 'Highly Recommended' ? '#dcfce7' :
                                   report.recommendation === 'Recommended' ? '#dbeafe' :
                                   report.recommendation === 'Reserve Pool' ? '#fef3c7' : '#fee2e2',
                        color: report.recommendation === 'Highly Recommended' ? '#166534' :
                               report.recommendation === 'Recommended' ? '#1e40af' :
                               report.recommendation === 'Reserve Pool' ? '#92400e' : '#991b1b'
                      }}>
                        {report.recommendation || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {report.completed_at ? new Date(report.completed_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleViewReport(report.id)}
                        style={styles.viewButton}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
  container: {
    maxWidth: '1400px',
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
  header: {
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 16px 0'
  },
  stats: {
    display: 'flex',
    gap: '12px'
  },
  statBadge: {
    padding: '6px 16px',
    background: '#e2e8f0',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#475569'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'auto',
    border: '1px solid #e2e8f0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#1a202c',
    verticalAlign: 'middle'
  },
  tr: {
    transition: 'background 0.2s'
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
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },
  recommendationBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    whiteSpace: 'nowrap'
  },
  viewButton: {
    padding: '6px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8'
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
