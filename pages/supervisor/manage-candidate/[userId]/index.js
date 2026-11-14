// pages/supervisor/manage-candidate/[userId]/index.js
// Phase 9: Added "Pending Assessments" section with Unblock buttons.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../../components/AppLayout';
import { supabase } from '../../../../supabase/client';
import ResetAssessmentButton from '../../../../components/ResetAssessmentButton';

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'Completed': return '#48bb78';
    case 'Pending': return '#ed8936';
    case 'In Progress': return '#4299e1';
    case 'Failed': return '#fc8181';
    default: return '#a0aec0';
  }
}

function getScoreColor(score) {
  if (score >= 80) return '#48bb78';
  if (score >= 60) return '#ed8936';
  return '#fc8181';
}

export default function CandidateReports() {
  const router = useRouter();
  const { userId } = router.query;

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [reports, setReports] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(null);
  const [assignedSupervisors, setAssignedSupervisors] = useState([]);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    if (!router.isReady || !userId) return;
    loadData();
  }, [router.isReady, userId]);

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

      const token = session.access_token;

      // 1. Load candidate detail AND completed reports
      const response = await fetch(
        `/api/supervisor/manage-candidates/${encodeURIComponent(userId)}/detail`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load candidate.');
      }

      setCandidate(payload.candidate || null);
      setReports(Array.isArray(payload.reports) ? payload.reports : []);
      setAssignedSupervisors(Array.isArray(payload.assignedSupervisors) ? payload.assignedSupervisors : []);

      // 2. Fetch candidate assignments (to see pending/blocked ones)
      const assignRes = await fetch(`/api/supervisor/candidate-assignments?action=load&candidateId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assignData = await assignRes.json();
      
      if (assignData.success) {
        const assignmentMap = {};
        assignData.assigned.forEach(a => { assignmentMap[a.assessment_id] = a; });
        
        const combined = assignData.assessments
          .filter(a => assignmentMap[a.id])
          .map(a => ({
            ...assignmentMap[a.id],
            assessment_title: a.title,
            assessment_id: a.id,
            isCompleted: assignmentMap[a.id].status === 'completed'
          }));
          
        setAssignments(combined);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnblock(assessmentId) {
    setUnblockingId(assessmentId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/supervisor/unblock-assessment', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        // 👇 The unblock endpoint expects `userId`, not `candidateId`
        body: JSON.stringify({ userId: userId, assessmentId })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message);

      const emailMsg = data.emailSent ? ' Candidate has been notified via email.' : '';
      alert('Assessment unlocked successfully.' + emailMsg);
      await loadData();
    } catch (err) {
      alert('Failed to unblock: ' + err.message);
    } finally {
      setUnblockingId(null);
    }
  }

  const handleOpenReport = (reportId) => {
    if (!reportId) {
      setError('The selected report has no ID.');
      return;
    }
    router.push({
      pathname: `/supervisor/reports/${reportId}`,
      query: { returnTo: `/supervisor/manage-candidate/${userId}` }
    });
  };

  if (loading) return <AppLayout><div style={styles.loadingContainer}><div style={styles.spinner} /><p>Loading...</p></div></AppLayout>;
  if (error) return <AppLayout><div style={styles.errorContainer}><h2>Error</h2><p>{error}</p><button onClick={loadData} style={styles.errorButton}>Retry</button></div></AppLayout>;
  if (!candidate) return <AppLayout><div style={styles.errorContainer}><h2>Not Found</h2><button onClick={() => router.push('/supervisor/manage-candidate')} style={styles.errorButton}>Go Back</button></div></AppLayout>;

  const pendingAssignments = assignments.filter(a => a.status === 'blocked');
  const activeAssignments = assignments.filter(a => a.status === 'unblocked');

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => router.push('/supervisor/manage-candidate')} style={styles.backButton}>
            ← Back to Candidates
          </button>
          <button onClick={loadData} style={styles.refreshButton}>🔄 Refresh</button>
        </div>

        <div style={styles.candidateCard}>
          <div style={styles.candidateHeader}>
            <div style={styles.candidateAvatar}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div style={styles.candidateInfo}>
              <h1 style={styles.candidateName}>{candidate.full_name || 'Unknown'}</h1>
              <p style={styles.candidateEmail}>{candidate.email || 'No email'}</p>
              <div style={styles.candidateDetails}>
                <span style={styles.detailTag}>🏫 {candidate.university || 'Not Specified'}</span>
                <span style={styles.detailTag}>📚 {candidate.programme || 'Not Specified'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            PENDING ASSIGNMENTS (Blocked)
            ========================================= */}
        {pendingAssignments.length > 0 && (
          <div style={{...styles.reportsSection, background: '#fff7ed', borderColor: '#fed7aa', borderStyle: 'solid', borderWidth: '1px'}}>
            <h2 style={{...styles.sectionTitle, color: '#c2410c'}}>⏳ Pending Assignments (Blocked)</h2>
            <p style={{fontSize: '13px', color: '#9a3412', marginBottom: '16px'}}>These assessments are assigned but blocked. Candidates cannot start them until you unblock them.</p>
            <div style={styles.reportGrid}>
              {pendingAssignments.map((assignment) => (
                <div key={assignment.id} style={{...styles.reportCard, borderColor: '#fed7aa', background: '#ffffff'}}>
                  <div style={styles.reportHeader}>
                    <h3 style={styles.reportTitle}>{assignment.assessment_title}</h3>
                    <span style={{...styles.statusBadge, background: '#f97316'}}>Blocked</span>
                  </div>
                  <div style={styles.reportFooter}>
                    <button 
                      onClick={() => handleUnblock(assignment.assessment_id)} 
                      disabled={unblockingId === assignment.assessment_id}
                      style={{...styles.viewButton, background: '#16a34a'}}
                    >
                      {unblockingId === assignment.assessment_id ? 'Unblocking...' : '🔓 Unblock & Notify Candidate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================
            ACTIVE ASSIGNMENTS (Ready to Start)
            ========================================= */}
        {activeAssignments.length > 0 && (
          <div style={{...styles.reportsSection, background: '#eff6ff', borderColor: '#bfdbfe', borderStyle: 'solid', borderWidth: '1px', marginTop: '20px'}}>
            <h2 style={{...styles.sectionTitle, color: '#1e40af'}}>📋 Ready to Start (Unblocked)</h2>
            <div style={styles.reportGrid}>
              {activeAssignments.map((assignment) => (
                <div key={assignment.id} style={{...styles.reportCard, borderColor: '#bfdbfe'}}>
                  <div style={styles.reportHeader}>
                    <h3 style={styles.reportTitle}>{assignment.assessment_title}</h3>
                    <span style={{...styles.statusBadge, background: '#4299e1'}}>Ready</span>
                  </div>
                  <div style={styles.reportFooter}>
                    <p style={{fontSize: '12px', color: '#64748b', margin: 0}}>Candidate has been notified.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================
            COMPLETED REPORTS
            ========================================= */}
        <div style={styles.reportsSection}>
          <h2 style={styles.sectionTitle}>Assessment Reports ({reports.length})</h2>

          {reports.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <p>No assessments found for this candidate.</p>
            </div>
          ) : (
            <div style={styles.reportGrid}>
              {reports.map((report) => (
                <div
                  key={report.id}
                  style={styles.reportCard}
                  onClick={() => handleOpenReport(report.id)}
                >
                  <div style={styles.reportHeader}>
                    <h3 style={styles.reportTitle}>{report.assessment_title}</h3>
                    <span style={{...styles.statusBadge, background: getStatusColor(report.status)}}>
                      {report.status}
                    </span>
                  </div>
                  <div style={styles.reportBody}>
                    <div style={styles.reportScore}>
                      {report.isCompleted && report.score > 0 ? (
                        <span style={{...styles.scoreBadge, background: getScoreColor(report.score)}}>
                          {report.score}%
                        </span>
                      ) : (
                        <span style={styles.noScoreBadge}>—</span>
                      )}
                    </div>
                    <div style={styles.reportMeta}>
                      <span>📅 {formatDate(report.completed_at)}</span>
                    </div>
                  </div>
                  <div style={styles.reportFooter}>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenReport(report.id); }} style={styles.viewButton}>
                      View Report Details →
                    </button>
                    {report.isCompleted && (
                      <div style={{ marginTop: '8px' }}>
                        <ResetAssessmentButton candidateId={userId} assessmentId={report.assessment_id} assessmentName={report.assessment_title} candidateName={candidate?.full_name} onReset={loadData} variant="inline" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #E2E8F0', borderTop: '4px solid #0A1929', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  errorContainer: { maxWidth: '500px', margin: '40px auto', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  errorButton: { padding: '10px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', marginTop: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' },
  refreshButton: { padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' },
  candidateCard: { background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  candidateHeader: { display: 'flex', alignItems: 'center', gap: '20px' },
  candidateAvatar: { width: '60px', height: '60px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', flexShrink: 0 },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: '22px', fontWeight: 'bold', color: '#0A1929', margin: '0 0 4px 0' },
  candidateEmail: { fontSize: '14px', color: '#718096', margin: '0 0 8px 0' },
  candidateDetails: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  detailTag: { fontSize: '13px', color: '#4A5568', background: '#f7fafc', padding: '4px 12px', borderRadius: '16px' },
  reportsSection: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#0A1929', margin: '0 0 16px 0' },
  reportGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  reportCard: { background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' },
  reportHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  reportTitle: { fontSize: '16px', fontWeight: '600', color: '#0A1929', margin: 0, flex: 1, marginRight: '12px' },
  reportBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  reportScore: { display: 'flex', alignItems: 'center' },
  reportMeta: { fontSize: '13px', color: '#94a3b8' },
  reportFooter: { marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap' },
  scoreBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', color: 'white' },
  noScoreBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '16px', fontWeight: '500', color: '#94a3b8', background: '#f1f5f9' },
  viewButton: { padding: '8px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '16px' }
};
