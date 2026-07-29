// pages/supervisor/reports/index.js - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

export default function SupervisorReportsList() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    fetchReports();
  }, [session]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const supervisorId = session.user.id;
      const supervisorEmail = session.user.email;

      console.log('[Supervisor Reports] Supervisor ID:', supervisorId);
      console.log('[Supervisor Reports] Supervisor Email:', supervisorEmail);

      // ============================================================
      // Step 1: Get all candidates assigned to this supervisor
      // ============================================================
      // Try multiple fields for assignment
      let assignedCandidates = [];

      // Method 1: Check supervisor_id and assigned_supervisor_id
      const { data: candidatesByField, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email')
        .or(`supervisor_id.eq.${supervisorId},assigned_supervisor_id.eq.${supervisorId},supervisor_email.eq.${supervisorEmail}`);

      if (!candidatesError && candidatesByField && candidatesByField.length > 0) {
        assignedCandidates = candidatesByField;
        console.log('[Supervisor Reports] Found candidates via profile fields:', assignedCandidates.length);
      }

      // Method 2: If no candidates found, check supervisor_assignments table
      if (assignedCandidates.length === 0) {
        try {
          const { data: assignments, error: assignmentError } = await supabase
            .from('supervisor_assignments')
            .select('candidate_id')
            .eq('supervisor_id', supervisorId);

          if (!assignmentError && assignments && assignments.length > 0) {
            const candidateIds = assignments.map(a => a.candidate_id);
            
            const { data: candidatesFromAssignments, error: candidatesError2 } = await supabase
              .from('candidate_profiles')
              .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email')
              .in('id', candidateIds);

            if (!candidatesError2 && candidatesFromAssignments) {
              assignedCandidates = candidatesFromAssignments;
              console.log('[Supervisor Reports] Found candidates via supervisor_assignments:', assignedCandidates.length);
            }
          }
        } catch (assignmentTableError) {
          console.log('[Supervisor Reports] supervisor_assignments table may not exist');
        }
      }

      if (assignedCandidates.length === 0) {
        console.log('[Supervisor Reports] No candidates assigned to this supervisor');
        setReports([]);
        setStats({ total: 0, completed: 0, inProgress: 0 });
        setLoading(false);
        return;
      }

      const candidateIds = assignedCandidates.map(c => c.id);
      console.log('[Supervisor Reports] Candidate IDs:', candidateIds);

      // ============================================================
      // Step 2: Get assessment results for these candidates
      // ============================================================
      const { data: results, error: resultsError } = await supabase
        .from('assessment_results')
        .select(`
          id,
          user_id,
          assessment_id,
          session_id,
          percentage_score,
          workplace_readiness,
          intellectual_capability,
          total_score,
          max_score,
          category_scores,
          report_data,
          completed_at,
          created_at,
          is_valid,
          is_auto_submitted,
          violation_count,
          assessments:assessment_id (
            id,
            title,
            assessment_type_id,
            assessment_types:assessment_type_id (
              id,
              code,
              name
            )
          )
        `)
        .in('user_id', candidateIds)
        .order('completed_at', { ascending: false });

    if (resultsError) {
      console.error('[Supervisor Reports] Results query error:', resultsError);
      setError(resultsError.message);
      setLoading(false);
      return;
    }

    console.log('[Supervisor Reports] Results found:', results?.length || 0);

    // ============================================================
    // Step 3: Process results and filter for National Service
    // ============================================================
    let processedReports = (results || []).map(report => {
      const assessment = report.assessments || {};
      const assessmentType = assessment.assessment_types || {};
      
      const isNationalService = 
        assessmentType?.code === 'national_service' ||
        assessment?.title === 'National Service Recruitment Assessment' ||
        report.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;

      // Find the candidate info
      const candidate = assignedCandidates.find(c => c.id === report.user_id) || {};

      // Calculate display score for National Service
      let displayScore = report.percentage_score || 0;
      let calculatedWorkplace = report.workplace_readiness || 0;
      let calculatedIntellectual = report.intellectual_capability || 0;

      if (isNationalService) {
        // Calculate from category_scores if available
        const categoryScores = report.category_scores || report.report_data?.categoryScores || [];
        
        if (categoryScores.length > 0) {
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

          categoryScores.forEach(cat => {
            const name = cat.category || cat.name || '';
            const percentage = Number(cat.percentage || cat.score || 0);
            
            if (workplaceCategories.some(c => name.includes(c) || name.toLowerCase().includes(c.toLowerCase()))) {
              workplaceTotal += percentage;
              workplaceCount++;
            } else if (intellectualCategories.some(c => name.includes(c) || name.toLowerCase().includes(c.toLowerCase()))) {
              intellectualTotal += percentage;
              intellectualCount++;
            }
          });

          calculatedWorkplace = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
          calculatedIntellectual = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;
          
          displayScore = (calculatedWorkplace > 0 || calculatedIntellectual > 0) 
            ? Math.round((calculatedWorkplace + calculatedIntellectual) / 2)
            : Number(report.percentage_score || 0);
        }
      }

      return {
        ...report,
        displayScore: displayScore,
        calculatedWorkplace: calculatedWorkplace,
        calculatedIntellectual: calculatedIntellectual,
        isNationalService: isNationalService,
        candidate_name: candidate.full_name || 'Unknown',
        candidate_email: candidate.email || '',
        candidate_university: candidate.university || '',
        candidate_programme: candidate.programme || '',
        assessment_title: assessment?.title || 'Unknown',
        is_completed: !!report.completed_at,
        is_auto_submitted: report.is_auto_submitted || false,
        hasResultId: !!report.id
      };
    });

    // Filter for National Service assessments
    let filteredReports = processedReports.filter(r => r.isNationalService === true);

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredReports = filteredReports.filter(r => 
        (r.candidate_name || '').toLowerCase().includes(term) ||
        (r.candidate_email || '').toLowerCase().includes(term) ||
        (r.assessment_title || '').toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filter === 'completed') {
      filteredReports = filteredReports.filter(r => r.is_completed);
    } else if (filter === 'auto_submitted') {
      filteredReports = filteredReports.filter(r => r.is_auto_submitted);
    } else if (filter === 'in_progress') {
      filteredReports = filteredReports.filter(r => !r.is_completed && r.session_id);
    }

    // Calculate stats
    const total = processedReports.filter(r => r.isNationalService).length;
    const completed = processedReports.filter(r => r.isNationalService && r.is_completed).length;
    const autoSubmitted = processedReports.filter(r => r.isNationalService && r.is_auto_submitted).length;
    const inProgress = processedReports.filter(r => r.isNationalService && !r.is_completed && r.session_id).length;

    setStats({ total, completed, autoSubmitted, inProgress });
    setReports(filteredReports);
    setLoading(false);

  } catch (error) {
    console.error('[Supervisor Reports] Error:', error);
    setError(error.message || 'Failed to fetch reports');
    setLoading(false);
  }
};

  const handleViewReport = (resultId) => {
    if (resultId) {
      router.push(`/supervisor/reports/${resultId}`);
    }
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
          <h1 style={styles.title}>National Service Reports</h1>
          <p style={styles.subtitle}>Review completed National Service assessments for your assigned candidates.</p>
          
          {error && (
            <div style={styles.errorBox}>
              <strong>Error:</strong> {error}
              <button onClick={fetchReports} style={styles.retryButton}>Retry</button>
            </div>
          )}

          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="Search by candidate name, email, or assessment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

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
              All Reports ({stats.total || 0})
            </button>
            <button
              onClick={() => setFilter('completed')}
              style={{
                ...styles.filterTab,
                background: filter === 'completed' ? '#1a237e' : 'white',
                color: filter === 'completed' ? 'white' : '#1a237e',
                border: filter === 'completed' ? 'none' : '1px solid #e2e8f0'
              }}
            >
              Completed ({stats.completed || 0})
            </button>
            <button
              onClick={() => setFilter('auto_submitted')}
              style={{
                ...styles.filterTab,
                background: filter === 'auto_submitted' ? '#1a237e' : 'white',
                color: filter === 'auto_submitted' ? 'white' : '#1a237e',
                border: filter === 'auto_submitted' ? 'none' : '1px solid #e2e8f0'
              }}
            >
              Auto-Submitted ({stats.autoSubmitted || 0})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              style={{
                ...styles.filterTab,
                background: filter === 'in_progress' ? '#1a237e' : 'white',
                color: filter === 'in_progress' ? 'white' : '#1a237e',
                border: filter === 'in_progress' ? 'none' : '1px solid #e2e8f0'
              }}
            >
              In Progress ({stats.inProgress || 0})
            </button>
          </div>

          <div style={styles.statsSummary}>
            <span style={styles.statsItem}>
              📊 Total: <strong>{stats.total || 0}</strong>
            </span>
            <span style={styles.statsItem}>
              ✅ Completed: <strong>{stats.completed || 0}</strong>
            </span>
            <span style={styles.statsItem}>
              ⏳ In Progress: <strong>{stats.inProgress || 0}</strong>
            </span>
          </div>
        </div>

        {reports.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No National Service assessments to review.</p>
            <p style={styles.emptySubtext}>
              {searchTerm ? 'Try adjusting your search or filter.' : 'When your assigned candidates complete their National Service assessment, their reports will appear here.'}
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Assessment</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Completed</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const score = Math.round(report.displayScore || report.percentage_score || 0);
                  const isCompleted = report.is_completed;
                  const isAutoSubmitted = report.is_auto_submitted;

                  let statusText = 'Not Started';
                  let statusColor = '#94a3b8';
                  let statusBg = '#f1f5f9';

                  if (isCompleted && isAutoSubmitted) {
                    statusText = 'Auto-Submitted';
                    statusColor = '#92400e';
                    statusBg = '#fef3c7';
                  } else if (isCompleted) {
                    statusText = 'Completed';
                    statusColor = '#166534';
                    statusBg = '#dcfce7';
                  } else if (report.session_id) {
                    statusText = 'In Progress';
                    statusColor = '#1e40af';
                    statusBg = '#dbeafe';
                  }

                  return (
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
                        {report.assessment_title || 'N/A'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.scoreBadge,
                          background: score >= 75 ? '#dcfce7' :
                                     score >= 65 ? '#fef3c7' : '#fee2e2',
                          color: score >= 75 ? '#166534' :
                                 score >= 65 ? '#92400e' : '#991b1b'
                        }}>
                          {isCompleted ? `${score}%` : 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          background: statusBg,
                          color: statusColor
                        }}>
                          {statusText}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {report.completed_at ? new Date(report.completed_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={styles.td}>
                        {report.hasResultId ? (
                          <button
                            onClick={() => handleViewReport(report.id)}
                            style={styles.viewButton}
                          >
                            View Report
                          </button>
                        ) : (
                          <span style={styles.noReport}>No result</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
    flexWrap: 'wrap',
    marginBottom: '16px'
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
  statsSummary: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  statsItem: {
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
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
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
