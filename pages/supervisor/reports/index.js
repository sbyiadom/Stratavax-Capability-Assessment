// pages/supervisor/reports/index.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

export default function SupervisorReportsList() {
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

      const supervisorId = session.user.id;

      // Step 1: Get all candidates assigned to this supervisor
      const { data: assignedCandidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .eq('supervisor_id', supervisorId);

      if (candidatesError) {
        console.error('Error fetching candidates:', candidatesError);
        setLoading(false);
        return;
      }

      if (!assignedCandidates || assignedCandidates.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      const candidateIds = assignedCandidates.map(c => c.id);

      // Step 2: Get completed National Service assessments for these candidates
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(`
          id,
          user_id,
          assessment_id,
          status,
          result_id,
          assessments!inner(title, assessment_type:assessment_types(code))
        `)
        .in('user_id', candidateIds)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching reports:', error);
        setLoading(false);
        return;
      }

      // Filter for National Service assessments
      const nationalServiceReports = (data || []).filter(
        item => item.assessments?.assessment_type?.code === 'national_service'
      );

      // Enrich with candidate info
      const enrichedReports = nationalServiceReports.map(report => {
        const candidate = assignedCandidates.find(c => c.id === report.user_id);
        return {
          ...report,
          candidate_name: candidate?.full_name || 'Unknown',
          candidate_email: candidate?.email || '',
          candidate_university: candidate?.university || '',
          candidate_programme: candidate?.programme || ''
        };
      });

      setReports(enrichedReports);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const handleViewReport = (resultId) => {
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleBack = () => {
    router.push('/supervisor');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>📋 National Service Reports</h1>
          <p style={styles.subtitle}>Review completed National Service assessments for your candidates.</p>
          <div style={styles.stats}>
            <span style={styles.statBadge}>📊 Total Reports: {reports.length}</span>
          </div>
        </div>

        {reports.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No completed National Service assessments to review.</p>
            <p style={styles.emptySubtext}>When candidates complete their National Service assessment, their reports will appear here.</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>👤 Candidate</th>
                  <th style={styles.th}>📝 Assessment</th>
                  <th style={styles.th}>🏫 University</th>
                  <th style={styles.th}>📚 Programme</th>
                  <th style={styles.th}>📊 Status</th>
                  <th style={styles.th}>⚡ Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.candidateName}>
                        {report.candidate_name || 'Unknown'}
                      </div>
                      <div style={styles.candidateEmail}>
                        {report.candidate_email || ''}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {report.assessments?.title || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      {report.candidate_university || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      {report.candidate_programme || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: '#dcfce7',
                        color: '#166534'
                      }}>
                        ✅ Completed
                      </span>
                    </td>
                    <td style={styles.td}>
                      {report.result_id ? (
                        <button
                          onClick={() => handleViewReport(report.result_id)}
                          style={styles.viewButton}
                        >
                          📄 View Report
                        </button>
                      ) : (
                        <span style={styles.noReport}>No result</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    fontWeight: '600',
    color: '#1a202c'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },
  viewButton: {
    padding: '8px 20px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s'
  },
  noReport: {
    color: '#94a3b8',
    fontSize: '13px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '8px'
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
