// pages/admin/reports/index.js - FIXED VERSION
// Shows ALL assessment reports (both National Service and Stratavax)

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
  const [filter, setFilter] = useState('all'); // 'all', 'national_service', 'stratavax'

  useEffect(() => {
    if (!session) return;
    fetchReports();
  }, [session]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Step 1: Get all assessment results with joins in a single query
      const { data: results, error: resultsError } = await supabase
        .from('assessment_results')
        .select(`
          *,
          candidate_profiles!inner(
            full_name,
            email,
            university,
            programme
          ),
          assessments!inner(
            id,
            title,
            assessment_type_id,
            assessment_types!inner(
              id,
              code,
              name
            )
          )
        `)
        .order('completed_at', { ascending: false });

      if (resultsError) {
        console.error('Error fetching results:', resultsError);
        setReports([]);
        setLoading(false);
        return;
      }

      console.log('All results:', results);

      // Transform the data
      const enrichedReports = results.map((result) => ({
        ...result,
        candidate_name: result.candidate_profiles?.full_name || 'Unknown',
        candidate_email: result.candidate_profiles?.email || '',
        candidate_university: result.candidate_profiles?.university || '',
        candidate_programme: result.candidate_profiles?.programme || '',
        assessment_title: result.assessments?.title || 'Unknown',
        assessment_type_code: result.assessments?.assessment_types?.code || null,
        assessment_type_name: result.assessments?.assessment_types?.name || 'General'
      }));

      console.log('Enriched reports:', enrichedReports.length);
      setReports(enrichedReports);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const getFilteredReports = () => {
    if (filter === 'national_service') {
      return reports.filter(r => r.assessment_type_code === 'national_service');
    }
    if (filter === 'stratavax') {
      return reports.filter(r => r.assessment_type_code !== 'national_service');
    }
    return reports;
  };

  const filteredReports = getFilteredReports();
  const nationalServiceCount = reports.filter(r => r.assessment_type_code === 'national_service').length;
  const stratavaxCount = reports.filter(r => r.assessment_type_code !== 'national_service').length;

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
          <p style={styles.subtitle}>All assessment reports from candidates</p>
          
          {/* Filter Tabs */}
          <div style={styles.filterTabs}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterTab,
                background: filter === 'all' ? '#1a237e' : 'white',
                color: filter === 'all' ? 'white' : '#1a237e',
                border: filter === 'all' ? 'none' : '1px solid #e2e8f0'
              }}
            >
              All Reports ({reports.length})
            </button>
            <button
              onClick={() => setFilter('national_service')}
              style={{
                ...styles.filterTab,
                background: filter === 'national_service' ? '#1a237e' : 'white',
                color: filter === 'national_service' ? 'white' : '#1a237e',
                border: filter === 'national_service' ? 'none' : '1px solid #e2e8f0'
              }}
            >
              📋 National Service ({nationalServiceCount})
            </button>
            <button
              onClick={() => setFilter('stratavax')}
              style={{
                ...styles.filterTab,
                background: filter === 'stratavax' ? '#1a237e' : 'white',
                color: filter === 'stratavax' ? 'white' : '#1a237e',
                border: filter === 'stratavax' ? 'none' : '1px solid #e2e8f0'
              }}
            >
              📊 Stratavax ({stratavaxCount})
            </button>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Assessment</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Recommendation</th>
                <th style={styles.th}>Completed</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.emptyState}>
                    No assessment reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isNationalService = report.assessment_type_code === 'national_service';
                  
                  return (
                    <tr key={report.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.candidateName}>
                          {report.candidate_name || 'Unknown'}
                        </div>
                        <div style={styles.candidateEmail}>
                          {report.candidate_email || ''}
                        </div>
                        {report.candidate_university && (
                          <div style={styles.candidateSub}>
                            {report.candidate_university} • {report.candidate_programme || ''}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {report.assessment_title || 'N/A'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          background: isNationalService ? '#dbeafe' : '#e8f5e9',
                          color: isNationalService ? '#1e40af' : '#2e7d32'
                        }}>
                          {isNationalService ? '📋 National Service' : '📊 Stratavax'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {isNationalService ? (
                          <div>
                            <div style={styles.scoreRow}>
                              <span style={styles.scoreLabel}>Overall:</span>
                              <span style={{
                                ...styles.scoreBadge,
                                background: report.percentage_score >= 75 ? '#dcfce7' :
                                           report.percentage_score >= 65 ? '#fef3c7' : '#fee2e2',
                                color: report.percentage_score >= 75 ? '#166534' :
                                       report.percentage_score >= 65 ? '#92400e' : '#991b1b'
                              }}>
                                {Math.round(report.percentage_score || 0)}%
                              </span>
                            </div>
                            <div style={styles.scoreRow}>
                              <span style={styles.scoreLabel}>Workplace:</span>
                              <span style={styles.scoreSmall}>
                                {Math.round(report.workplace_readiness || 0)}%
                              </span>
                            </div>
                            <div style={styles.scoreRow}>
                              <span style={styles.scoreLabel}>Intellectual:</span>
                              <span style={styles.scoreSmall}>
                                {Math.round(report.intellectual_capability || 0)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            ...styles.scoreBadge,
                            background: report.percentage_score >= 75 ? '#dcfce7' :
                                       report.percentage_score >= 65 ? '#fef3c7' : '#fee2e2',
                            color: report.percentage_score >= 75 ? '#166534' :
                                   report.percentage_score >= 65 ? '#92400e' : '#991b1b'
                          }}>
                            {Math.round(report.percentage_score || 0)}%
                          </span>
                        )}
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
                  );
                })
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
  filterTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  filterTab: {
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    background: 'white',
    border: '1px solid #e2e8f0'
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
  candidateSub: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px'
  },
  typeBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  scoreBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    marginTop: '1px'
  },
  scoreLabel: {
    color: '#94a3b8',
    fontSize: '11px'
  },
  scoreSmall: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1a202c'
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
