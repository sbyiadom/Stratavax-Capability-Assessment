// pages/admin/reports/index.js - WITH CANDIDATE GROUPING AND FILTERING

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
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [expandedCandidates, setExpandedCandidates] = useState({});
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    if (!session) return;
    fetchReports();
  }, [session]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/reports', {
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

      setReports(data.reports || []);
      
      // Build candidate list with their assessments
      const candidateMap = {};
      (data.reports || []).forEach(report => {
        const key = report.user_id || report.candidate_email;
        if (!candidateMap[key]) {
          candidateMap[key] = {
            id: key,
            name: report.candidate_name || 'Unknown',
            email: report.candidate_email || '',
            university: report.candidate_university || '',
            programme: report.candidate_programme || '',
            assessments: []
          };
        }
        candidateMap[key].assessments.push(report);
      });
      
      setCandidates(Object.values(candidateMap));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
      setLoading(false);
    }
  };

  const toggleCandidate = (candidateId) => {
    setExpandedCandidates(prev => ({
      ...prev,
      [candidateId]: !prev[candidateId]
    }));
  };

  const getFilteredCandidates = () => {
    let filtered = candidates;
    
    // Filter by assessment type
    if (filter === 'national_service') {
      filtered = filtered.map(c => ({
        ...c,
        assessments: c.assessments.filter(r => r.isNationalService === true)
      })).filter(c => c.assessments.length > 0);
    } else if (filter === 'stratavax') {
      filtered = filtered.map(c => ({
        ...c,
        assessments: c.assessments.filter(r => r.isNationalService !== true)
      })).filter(c => c.assessments.length > 0);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.assessments.some(a => a.assessment_title.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  };

  const filteredCandidates = getFilteredCandidates();
  const totalAssessments = reports.length;
  const nationalServiceCount = reports.filter(r => r.isNationalService === true).length;
  const stratavaxCount = reports.filter(r => r.isNationalService !== true).length;

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
          <p style={styles.subtitle}>All assessment reports grouped by candidate</p>
          
          {error && (
            <div style={styles.errorBox}>
              <strong>⚠️ Error:</strong> {error}
              <button onClick={fetchReports} style={styles.retryButton}>Retry</button>
            </div>
          )}

          {/* Search Bar */}
          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="Search by candidate name, email, or assessment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

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
              All Reports ({totalAssessments})
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
                <th style={{ ...styles.th, width: '30%' }}>Candidate</th>
                <th style={{ ...styles.th, width: '20%' }}>Type</th>
                <th style={{ ...styles.th, width: '15%' }}>Total Assessments</th>
                <th style={{ ...styles.th, width: '20%' }}>Completed</th>
                <th style={{ ...styles.th, width: '15%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.emptyState}>
                    {searchTerm ? 'No candidates match your search.' : 'No assessment reports found.'}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => {
                  const isExpanded = expandedCandidates[candidate.id];
                  const completedAssessments = candidate.assessments.filter(a => a.completed_at);
                  const avgScore = candidate.assessments.length > 0
                    ? Math.round(candidate.assessments.reduce((sum, a) => sum + (a.percentage_score || 0), 0) / candidate.assessments.length)
                    : 0;

                  return (
                    <React.Fragment key={candidate.id}>
                      <tr 
                        style={styles.candidateRow}
                        onClick={() => toggleCandidate(candidate.id)}
                      >
                        <td style={styles.td}>
                          <div style={styles.candidateName}>
                            {candidate.name || 'Unknown'}
                          </div>
                          <div style={styles.candidateEmail}>
                            {candidate.email || ''}
                          </div>
                          {candidate.university && (
                            <div style={styles.candidateSub}>
                              {candidate.university}
                              {candidate.programme ? ` • ${candidate.programme}` : ''}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.typeTags}>
                            {candidate.assessments.some(a => a.isNationalService) && (
                              <span style={{ ...styles.typeBadge, background: '#dbeafe', color: '#1e40af' }}>
                                📋 National Service
                              </span>
                            )}
                            {candidate.assessments.some(a => !a.isNationalService) && (
                              <span style={{ ...styles.typeBadge, background: '#e8f5e9', color: '#2e7d32' }}>
                                📊 Stratavax
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.statCount}>{candidate.assessments.length}</span>
                        </td>
                        <td style={styles.td}>
                          <div>
                            <span style={styles.statCount}>{candidate.assessments.filter(a => a.completed_at).length}</span>
                            <span style={styles.statLabel}> completed</span>
                          </div>
                          <div style={styles.avgScore}>
                            Avg Score: <strong>{avgScore}%</strong>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.expandIcon}>
                            {isExpanded ? '▲' : '▼'} {isExpanded ? 'Hide' : 'Show'} Assessments
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Assessments */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" style={styles.expandedRow}>
                            <div style={styles.assessmentList}>
                              <h4 style={styles.assessmentListTitle}>
                                Assessments for {candidate.name}
                              </h4>
                              <div style={styles.assessmentGrid}>
                                {candidate.assessments.map((assessment) => {
                                  const isNationalService = assessment.isNationalService;
                                  const score = Math.round(assessment.percentage_score || 0);
                                  
                                  return (
                                    <div key={assessment.id} style={styles.assessmentItem}>
                                      <div style={styles.assessmentItemHeader}>
                                        <span style={styles.assessmentItemTitle}>
                                          {assessment.assessment_title || 'Unknown'}
                                        </span>
                                        <span style={{
                                          ...styles.assessmentTypeTag,
                                          background: isNationalService ? '#dbeafe' : '#e8f5e9',
                                          color: isNationalService ? '#1e40af' : '#2e7d32'
                                        }}>
                                          {isNationalService ? 'National Service' : 'Stratavax'}
                                        </span>
                                      </div>
                                      <div style={styles.assessmentItemDetails}>
                                        <span style={styles.scoreBadge}>
                                          {score}%
                                        </span>
                                        <span style={styles.recommendationBadge}>
                                          {assessment.recommendation || 'N/A'}
                                        </span>
                                        <span style={styles.dateBadge}>
                                          {assessment.completed_at ? new Date(assessment.completed_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewReport(assessment.id);
                                          }}
                                          style={styles.viewButton}
                                        >
                                          View Report
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '12px',
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
  searchBar: {
    marginBottom: '16px'
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    fontFamily: 'inherit'
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
  candidateRow: {
    cursor: 'pointer',
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
  typeTags: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap'
  },
  typeBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  statCount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929'
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  avgScore: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px'
  },
  expandIcon: {
    fontSize: '13px',
    color: '#1a237e',
    fontWeight: '500',
    cursor: 'pointer'
  },
  expandedRow: {
    padding: '0',
    background: '#f8fafc'
  },
  assessmentList: {
    padding: '16px 20px'
  },
  assessmentListTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  assessmentGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  assessmentItem: {
    background: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  assessmentItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  assessmentItemTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#0a1929'
  },
  assessmentTypeTag: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600'
  },
  assessmentItemDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  scoreBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    background: '#f1f5f9',
    color: '#1a202c'
  },
  recommendationBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: '#f1f5f9',
    color: '#475569'
  },
  dateBadge: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  viewButton: {
    padding: '4px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
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
