// pages/supervisor/index.js - Corrected Supervisor Dashboard
// Fixes supervisor zero-data issue by loading candidates directly from candidate_profiles.supervisor_id
// Removes visible sub-category/category breakdown behavior for National Service reports.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';

export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national_service');
  const [candidates, setCandidates] = useState([]);
  const [nationalServiceReports, setNationalServiceReports] = useState([]);
  const [otherReports, setOtherReports] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState({});
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completedAssessments: 0,
    pendingReviews: 0,
    nationalServiceReports: 0
  });

  useEffect(() => {
    if (!session) return;
    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const supervisorId = session?.user?.id;

      if (!supervisorId) {
        console.error('[Supervisor] No logged-in user found.');
        setLoading(false);
        return;
      }

      console.log('[Supervisor] Logged in user:', supervisorId);

      const { data: supervisorProfile, error: supervisorProfileError } = await supabase
        .from('supervisor_profiles')
        .select('id, email, role, is_active')
        .eq('id', supervisorId)
        .single();

      if (supervisorProfileError) {
        console.error('[Supervisor] Error fetching supervisor profile:', supervisorProfileError);
      }

      const isAdmin = supervisorProfile?.role === 'admin';
      let assignedCandidates = [];

      if (isAdmin) {
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, university, programme, supervisor_id')
          .order('full_name', { ascending: true });

        if (candidatesError) {
          console.error('[Supervisor] Error fetching admin candidates:', candidatesError);
        } else {
          assignedCandidates = candidatesData || [];
        }
      } else {
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, university, programme, supervisor_id')
          .eq('supervisor_id', supervisorId)
          .order('full_name', { ascending: true });

        if (candidatesError) {
          console.error('[Supervisor] Error fetching supervisor candidates:', candidatesError);
        } else {
          assignedCandidates = candidatesData || [];
        }
      }

      console.log('[Supervisor] Assigned candidates found:', assignedCandidates.length);

      let allAssessments = [];
      let nsReports = [];
      let otherAssessments = [];

      if (assignedCandidates.length > 0) {
        const candidateIds = assignedCandidates.map(c => c.id);

        const { data: assessments, error: assessmentsError } = await supabase
          .from('candidate_assessments')
          .select(`
            id,
            user_id,
            assessment_id,
            status,
            result_id,
            completed_at,
            assessments!inner(
              id,
              title,
              assessment_type:assessment_types(id, code, name)
            )
          `)
          .in('user_id', candidateIds);

        if (assessmentsError) {
          console.error('[Supervisor] Error fetching assessments:', assessmentsError);
        } else {
          allAssessments = assessments || [];
        }

        console.log('[Supervisor] Assessments found:', allAssessments.length);

        const allReportData = [];

        for (const assessment of allAssessments) {
          const isCompleted = assessment.status === 'completed' && assessment.result_id !== null;
          let resultData = null;

          if (assessment.result_id) {
            const { data: result, error: resultError } = await supabase
              .from('assessment_results')
              .select('*')
              .eq('id', assessment.result_id)
              .single();

            if (resultError) {
              console.error('[Supervisor] Error fetching result:', resultError);
            } else {
              resultData = result;
            }
          }

          if (assessment.result_id || isCompleted) {
            const candidate = assignedCandidates.find(c => c.id === assessment.user_id);
            const isNationalService = assessment.assessments?.assessment_type?.code === 'national_service';

            let workplaceReadiness =
              resultData?.workplace_readiness ||
              resultData?.report_data?.dimensions?.workplaceReadiness ||
              resultData?.report_data?.workplaceReadiness ||
              0;

            let intellectualCapability =
              resultData?.intellectual_capability ||
              resultData?.report_data?.dimensions?.intellectualCapability ||
              resultData?.report_data?.intellectualCapability ||
              0;

            let overallScore =
              resultData?.percentage_score ||
              resultData?.report_data?.overallScore ||
              resultData?.report_data?.dimensions?.overallScore ||
              0;

            if (!overallScore && workplaceReadiness && intellectualCapability) {
              overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
            }

            let recommendation = resultData?.recommendation || 'Not Available';

            if (recommendation === 'Not Available' && resultData?.report_data?.recommendation) {
              if (typeof resultData.report_data.recommendation === 'string') {
                recommendation = resultData.report_data.recommendation;
              } else if (resultData.report_data.recommendation?.level) {
                recommendation = resultData.report_data.recommendation.level;
              }
            }

            let riskLevel =
              resultData?.risk_level ||
              resultData?.report_data?.riskLevel ||
              resultData?.report_data?.classification ||
              'Medium';

            const reportEntry = {
              result_id: assessment.result_id,
              candidate_id: assessment.user_id,
              candidate_name: candidate?.full_name || 'Unknown',
              candidate_email: candidate?.email || '',
              university: candidate?.university || '',
              programme: candidate?.programme || '',
              assessment_id: assessment.assessment_id,
              assessment_title: assessment.assessments?.title || 'Assessment',
              assessment_type: assessment.assessments?.assessment_type?.name || 'General',
              assessment_code: assessment.assessments?.assessment_type?.code || 'general',
              status: assessment.status,
              completed_at: assessment.completed_at || resultData?.completed_at,
              score: overallScore || 0,
              is_national_service: isNationalService,
              resultData: resultData,
              percentage_score: overallScore || 0,
              workplace_readiness: workplaceReadiness || 0,
              intellectual_capability: intellectualCapability || 0,
              recommendation: recommendation || 'Not Available',
              risk_level: riskLevel || 'Medium',
              category_scores: []
            };

            if (isNationalService) {
              reportEntry.scores = {
                overall: overallScore || 0,
                workplace: workplaceReadiness || 0,
                intellectual: intellectualCapability || 0,
                recommendation: recommendation || 'Not Available',
                riskLevel: riskLevel || 'Medium'
              };

              nsReports.push(reportEntry);
            } else {
              otherAssessments.push(reportEntry);
            }

            allReportData.push(reportEntry);
          }
        }

        const candidateList = assignedCandidates.map(c => {
          const candidateAssessments = allAssessments.filter(a => a.user_id === c.id);

          const completed = candidateAssessments.filter(
            a => a.status === 'completed' || a.result_id !== null
          ).length;

          const inProgress = candidateAssessments.filter(a => a.status === 'in_progress').length;
          const unblocked = candidateAssessments.filter(a => a.status === 'unblocked').length;
          const blocked = candidateAssessments.filter(a => a.status === 'blocked').length;
          const notStarted = candidateAssessments.filter(
            a => a.status === 'pending' || !a.status || a.status === ''
          ).length;

          const completedAssessments = candidateAssessments
            .filter(a => a.status === 'completed' || a.result_id !== null)
            .map(a => {
              const reportEntry = allReportData.find(
                r => r.result_id === a.result_id && r.candidate_id === c.id
              );

              const isNationalService = a.assessments?.assessment_type?.code === 'national_service';

              return {
                assessment_id: a.assessment_id,
                result_id: a.result_id,
                title: a.assessments?.title || 'Assessment',
                score: reportEntry?.score || 0,
                isNationalService: isNationalService,
                assessment_code: a.assessments?.assessment_type?.code || 'general',
                assessment_type: a.assessments?.assessment_type?.name || 'General',
                reportData: reportEntry || null
              };
            })
            .filter(a => a.result_id);

          return {
            ...c,
            assessments: candidateAssessments,
            stats: {
              completed,
              inProgress,
              unblocked,
              blocked,
              notStarted,
              total: candidateAssessments.length
            },
            completedAssessments
          };
        });

        setCandidates(candidateList);

        const initialSelected = {};
        candidateList.forEach(c => {
          const nonNs = c.completedAssessments.filter(a => !a.isNationalService);
          if (nonNs.length > 0) {
            initialSelected[c.id] = nonNs[0].assessment_id;
          }
        });
        setSelectedAssessments(initialSelected);
      } else {
        setCandidates([]);
      }

      setNationalServiceReports(nsReports);
      setOtherReports(otherAssessments);

      setStats({
        totalCandidates: assignedCandidates.length,
        completedAssessments: allAssessments.filter(
          a => a.status === 'completed' || a.result_id !== null
        ).length,
        pendingReviews: allAssessments.filter(
          a => a.status === 'in_progress' || a.status === 'unblocked'
        ).length,
        nationalServiceReports: nsReports.length
      });

      setLoading(false);
    } catch (error) {
      console.error('[Supervisor] Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleViewReport = (resultId) => {
    if (!resultId) {
      alert('No result available for this assessment.');
      return;
    }
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleAssessmentSelect = (candidateId, assessmentId) => {
    if (!assessmentId) {
      alert('Please select an assessment first.');
      return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      console.warn('[Supervisor] Candidate not found');
      return;
    }

    const assessment = candidate.completedAssessments.find(
      a => String(a.assessment_id) === String(assessmentId)
    );

    if (!assessment) {
      alert('Assessment not found. Please try again.');
      return;
    }

    if (assessment.result_id) {
      handleViewReport(assessment.result_id);
    } else {
      alert('This assessment does not have a result available yet.');
    }
  };

  const handleAssessmentChange = (candidateId, assessmentId) => {
    setSelectedAssessments(prev => ({
      ...prev,
      [candidateId]: assessmentId
    }));
  };

  const getRecommendationColor = (rec) => {
    const colors = {
      'Highly Recommended': '#2e7d32',
      'Recommended': '#1565c0',
      'Conditional': '#f57c00',
      'Reserve Pool': '#f57c00',
      'Not Recommended': '#c62828',
      'Not Available': '#64748b'
    };
    return colors[rec] || '#64748b';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#dcfce7';
    if (score >= 50) return '#fef3c7';
    return '#fee2e2';
  };

  const getScoreTextColor = (score) => {
    if (score >= 70) return '#166534';
    if (score >= 50) return '#92400e';
    return '#991b1b';
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Manage your candidates and review assessment reports.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>🔄 Refresh</button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statLabel}>Total Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completedAssessments}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⏳</div>
            <div>
              <div style={styles.statLabel}>Pending Review</div>
              <div style={styles.statValue}>{stats.pendingReviews}</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, background: '#1a237e' }}>
            <div style={{ ...styles.statIcon, color: 'white' }}>📋</div>
            <div>
              <div style={{ ...styles.statLabel, color: 'rgba(255,255,255,0.8)' }}>National Service Reports</div>
              <div style={{ ...styles.statValue, color: 'white' }}>{stats.nationalServiceReports}</div>
            </div>
          </div>
        </div>

        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('national_service')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'national_service' ? '#1a237e' : 'white',
              color: activeTab === 'national_service' ? 'white' : '#1a237e',
              border: activeTab === 'national_service' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            📋 National Service ({nationalServiceReports.length})
          </button>
          <button
            onClick={() => setActiveTab('other')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'other' ? '#1a237e' : 'white',
              color: activeTab === 'other' ? 'white' : '#1a237e',
              border: activeTab === 'other' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            📊 Other Assessments ({otherReports.length})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'candidates' ? '#1a237e' : 'white',
              color: activeTab === 'candidates' ? 'white' : '#1a237e',
              border: activeTab === 'candidates' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            👥 All Candidates ({candidates.length})
          </button>
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'national_service' && (
            <div style={styles.tabPanel}>
              <div style={styles.tabDescription}>
                <p>📋 All National Service assessment reports assigned to this supervisor.</p>
              </div>
              {nationalServiceReports.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No National Service assessments found.</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Candidate</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Workplace Readiness</th>
                        <th style={styles.th}>Intellectual Capability</th>
                        <th style={styles.th}>Overall Score</th>
                        <th style={styles.th}>Recommendation</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalServiceReports.map((report) => {
                        const workplaceScore = report.workplace_readiness || 0;
                        const intellectualScore = report.intellectual_capability || 0;
                        const overallScore = report.percentage_score || 0;
                        const recommendation = report.recommendation || 'Not Available';
                        const status = report.status || 'unknown';
                        const recColor = getRecommendationColor(recommendation);
                        const isCompleted = status === 'completed' || report.result_id !== null;
                        const hasScores = workplaceScore > 0 || intellectualScore > 0 || overallScore > 0;

                        return (
                          <tr key={report.result_id || report.candidate_id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={styles.cellName}>{report.candidate_name}</div>
                              <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.statusBadge,
                                background: isCompleted ? '#dcfce7' : '#fef3c7',
                                color: isCompleted ? '#166534' : '#92400e'
                              }}>
                                {isCompleted ? '✅ Completed' : '⏳ In Progress'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.scoreBadge, background: getScoreColor(workplaceScore), color: getScoreTextColor(workplaceScore) }}>
                                {hasScores ? Math.round(workplaceScore) + '%' : '—'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.scoreBadge, background: getScoreColor(intellectualScore), color: getScoreTextColor(intellectualScore) }}>
                                {hasScores ? Math.round(intellectualScore) + '%' : '—'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.scoreBadge, background: getScoreColor(overallScore), color: getScoreTextColor(overallScore) }}>
                                {hasScores ? Math.round(overallScore) + '%' : '—'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.recommendationBadge, color: recColor }}>
                                {hasScores ? recommendation : 'Pending'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.actionButtons}>
                                {isCompleted && report.result_id ? (
                                  <button
                                    onClick={() => handleViewReport(report.result_id)}
                                    style={styles.viewButton}
                                  >
                                    📄 View Report
                                  </button>
                                ) : (
                                  <span style={styles.pendingText}>Awaiting completion</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'other' && (
            <div style={styles.tabPanel}>
              <div style={styles.tabDescription}>
                <p>📊 All other completed assessments for candidates under your supervision.</p>
              </div>
              {otherReports.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No other assessments found.</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Candidate</th>
                        <th style={styles.th}>Assessment</th>
                        <th style={styles.th}>Score</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherReports.map((report) => (
                        <tr key={report.result_id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.cellName}>{report.candidate_name}</div>
                            <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                          </td>
                          <td style={styles.td}>{report.assessment_title}</td>
                          <td style={styles.td}>
                            <span style={styles.scoreBadge}>
                              {Math.round(report.score || 0)}%
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
                              <span style={styles.pendingText}>No result</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'candidates' && (
            <div style={styles.tabPanel}>
              <div style={styles.tabDescription}>
                <p>👥 All candidates with assessment status and ability to view individual reports.</p>
              </div>
              {candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No candidates assigned to you yet.</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Candidate</th>
                        <th style={styles.th}>Completed</th>
                        <th style={styles.th}>In Progress</th>
                        <th style={styles.th}>Ready to Start</th>
                        <th style={styles.th}>Blocked</th>
                        <th style={styles.th}>Not Started</th>
                        <th style={styles.th}>Select Assessment</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate) => {
                        const selectedId = selectedAssessments[candidate.id] ||
                          (candidate.completedAssessments.length > 0 ? candidate.completedAssessments[0].assessment_id : '');

                        return (
                          <tr key={candidate.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={styles.cellName}>{candidate.full_name || candidate.name}</div>
                              <div style={styles.cellSub}>{candidate.email}</div>
                              <div style={styles.cellSub}>{candidate.university} • {candidate.programme}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.statBadgeCompleted}>{candidate.stats.completed}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.statBadgeProgress}>{candidate.stats.inProgress}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.statBadgeUnblocked}>{candidate.stats.unblocked}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.statBadgeBlocked}>{candidate.stats.blocked}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.statBadgeNotStarted}>{candidate.stats.notStarted}</span>
                            </td>
                            <td style={styles.td}>
                              <select
                                onChange={(e) => handleAssessmentChange(candidate.id, e.target.value)}
                                style={styles.assessmentDropdown}
                                value={selectedId}
                                data-candidate={candidate.id}
                              >
                                <option value="">-- Select --</option>
                                {candidate.completedAssessments.map((assessment) => (
                                  <option key={assessment.assessment_id} value={assessment.assessment_id}>
                                    {assessment.title} ({Math.round(assessment.score || 0)}%)
                                  </option>
                                ))}
                                {candidate.completedAssessments.length === 0 && (
                                  <option value="" disabled>No completed assessments</option>
                                )}
                              </select>
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => {
                                  const select = document.querySelector(`select[data-candidate="${candidate.id}"]`);
                                  if (select && select.value) {
                                    handleAssessmentSelect(candidate.id, select.value);
                                  } else {
                                    alert('Please select an assessment first.');
                                  }
                                }}
                                style={styles.viewReportButtonSmall}
                                disabled={candidate.completedAssessments.length === 0}
                              >
                                📄 View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
    background: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#0a1929', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  headerActions: { display: 'flex', gap: '10px' },
  refreshButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  statIcon: { fontSize: '28px' },
  statLabel: { fontSize: '12px', color: '#718096', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' },
  statValue: { fontSize: '24px', fontWeight: '800', color: '#0a1929' },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  tabButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    background: 'white',
    border: '1px solid #e2e8f0'
  },
  tabContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7',
    minHeight: '300px'
  },
  tabPanel: { width: '100%' },
  tabDescription: {
    marginBottom: '16px',
    padding: '8px 12px',
    background: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#475569'
  },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0'
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  tr: { transition: 'background 0.2s' },
  cellName: { fontWeight: '600', color: '#1a202c' },
  cellSub: { fontSize: '12px', color: '#94a3b8' },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },
  recommendationBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
    background: 'white',
    border: '1px solid #e2e8f0'
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  viewButton: {
    padding: '6px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap'
  },
  viewReportButtonSmall: {
    padding: '4px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap'
  },
  pendingText: {
    color: '#94a3b8',
    fontSize: '13px'
  },
  assessmentDropdown: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    minWidth: '140px',
    maxWidth: '200px'
  },
  statBadgeCompleted: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#dcfce7',
    color: '#166534'
  },
  statBadgeProgress: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#dbeafe',
    color: '#1e40af'
  },
  statBadgeUnblocked: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#e8f5e9',
    color: '#2e7d32'
  },
  statBadgeBlocked: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#f5f5f5',
    color: '#667085'
  },
  statBadgeNotStarted: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#fef3c7',
    color: '#92400e'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px'
  }
};

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
