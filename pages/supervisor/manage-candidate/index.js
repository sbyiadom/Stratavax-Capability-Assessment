// pages/supervisor/manage-candidate/index.js
// Phase 7A: fetches candidates from /api/supervisor/manage-candidates/list
// Phase 9: Added "Email Candidate" feature (scoped to supervisor's candidates).

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

export default function ManageCandidateIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSupervisor, setCurrentSupervisor] = useState(null);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
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

      const { data: profile } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentSupervisor(profile);
      }

      const response = await fetch('/api/supervisor/manage-candidates/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to load candidates (HTTP ${response.status}).`);
      }

      const rows = Array.isArray(payload.candidates) ? payload.candidates : [];

      const enriched = rows.map((c) => ({
        id: c.id,
        full_name: c.full_name || '',
        email: c.email || '',
        university: c.university || '',
        programme: c.programme || '',
        created_at: c.created_at || null,
        totalAssessments: c.totalAssessments || 0,
        completedAssessments: c.completedAssessments || 0,
      }));

      setCandidates(enriched);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setError(error.message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      alert('Subject and message are required.');
      return;
    }
    setSendingEmail(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/supervisor/send-candidate-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: emailCandidate.id,
          subject: emailSubject,
          message: emailMessage,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(`Email sent to ${emailCandidate.full_name} successfully!`);
      setEmailModalOpen(false);
      setEmailSubject('');
      setEmailMessage('');
      setEmailCandidate(null);
    } catch (err) {
      alert('Failed to send email: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  }

  const handleView = (userId) => {
    router.push(`/supervisor/manage-candidate/${userId}`);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
      return;
    }

    try {
      const { error: resultsError } = await supabase
        .from('assessment_results')
        .delete()
        .eq('user_id', userId);

      if (resultsError) {
        console.error('Error deleting assessment results:', resultsError);
        alert('Failed to delete candidate assessments. Please try again.');
        return;
      }

      const { error: candidateError } = await supabase
        .from('candidate_profiles')
        .delete()
        .eq('id', userId);

      if (candidateError) {
        console.error('Error deleting candidate:', candidateError);
        alert('Failed to delete candidate. Please try again.');
        return;
      }

      setCandidates(candidates.filter(c => c.id !== userId));
      alert('Candidate deleted successfully!');
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('An error occurred while deleting the candidate.');
    }
  };

  const getStatus = (candidate) => {
    if (candidate.completedAssessments > 0) {
      return { label: 'Completed', color: '#48bb78', bg: '#dcfce7' };
    } else if (candidate.totalAssessments > 0) {
      return { label: 'In Progress', color: '#ed8936', bg: '#fef3c7' };
    } else {
      return { label: 'Not Started', color: '#94a3b8', bg: '#f1f5f9' };
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      candidate.full_name?.toLowerCase().includes(term) ||
      candidate.email?.toLowerCase().includes(term) ||
      candidate.university?.toLowerCase().includes(term) ||
      candidate.programme?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading candidates...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Error Loading Candidates</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={loadCandidates} style={styles.retryButton}>Retry</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidates</h1>
            <p style={styles.subtitle}>
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} assigned to you
              {currentSupervisor && ` — ${currentSupervisor.full_name || currentSupervisor.email}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/supervisor/add-candidate')}
            style={styles.addButton}
          >
            + Add New Candidate
          </button>
        </div>

        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name, email, university, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={styles.clearButton}>✕</button>
          )}
          <span style={styles.searchCount}>
            {filteredCandidates.length} of {candidates.length}
          </span>
        </div>

        {filteredCandidates.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <h3 style={styles.emptyTitle}>
              {searchTerm ? 'No candidates match your search' : 'No candidates found'}
            </h3>
            <p style={styles.emptyText}>
              {searchTerm ? 'Try adjusting your search criteria.' : 'Start by adding your first candidate.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/supervisor/add-candidate')}
                style={styles.emptyButton}
              >
                + Add New Candidate
              </button>
            )}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.tableHeadCell}>Candidate Name</th>
                  <th style={styles.tableHeadCell}>Email</th>
                  <th style={styles.tableHeadCell}>University</th>
                  <th style={styles.tableHeadCell}>Program</th>
                  <th style={styles.tableHeadCell}>Assessments</th>
                  <th style={styles.tableHeadCell}>Status</th>
                  <th style={styles.tableHeadCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => {
                  const status = getStatus(candidate);
                  return (
                    <tr key={candidate.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <div style={styles.candidateName}>
                          {candidate.full_name || 'Unnamed'}
                        </div>
                        <div style={styles.candidateId}>
                          ID: {candidate.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.candidateEmail}>{candidate.email || 'No email'}</div>
                      </td>
                      <td style={styles.tableCell}>
                        {candidate.university && candidate.university !== 'Not Specified'
                          ? candidate.university
                          : <span style={styles.naText}>—</span>}
                      </td>
                      <td style={styles.tableCell}>
                        {candidate.programme && candidate.programme !== 'Not Specified'
                          ? candidate.programme
                          : <span style={styles.naText}>—</span>}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.assessmentCount}>
                          {candidate.completedAssessments}/{candidate.totalAssessments}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          background: status.bg,
                          color: status.color
                        }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          <button onClick={() => handleView(candidate.id)} style={styles.viewButton}>
                            View
                          </button>
                          <button
                            onClick={() => {
                              setEmailCandidate(candidate);
                              setEmailModalOpen(true);
                            }}
                            style={styles.emailButton}
                          >
                            ✉️ Email
                          </button>
                          <button onClick={() => handleDelete(candidate.id)} style={styles.deleteButton}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== EMAIL MODAL ===== */}
        {emailModalOpen && emailCandidate && (
          <div style={styles.modalBackdrop} onClick={() => setEmailModalOpen(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Email Candidate</h2>
              <p style={styles.modalSub}>
                To: <strong>{emailCandidate.full_name}</strong> ({emailCandidate.email})
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.inputLabel}>Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Interview Invitation - Stratavax"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={styles.inputLabel}>Message</label>
                <textarea
                  placeholder="Dear candidate..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={7}
                  style={styles.textArea}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  onClick={() => setEmailModalOpen(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  style={{
                    ...styles.sendButton,
                    opacity: sendingEmail ? 0.6 : 1,
                    cursor: sendingEmail ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
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
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #E2E8F0', borderTop: '4px solid #0A1929', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  errorContainer: { textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '40px auto' },
  errorIcon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  errorMessage: { color: '#dc2626', marginBottom: '16px' },
  retryButton: { padding: '10px 24px', background: '#0A1929', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginTop: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#0A1929', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#718096', margin: 0 },
  addButton: { padding: '10px 24px', background: '#0A1929', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' },
  searchBar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' },
  searchInput: { flex: 1, padding: '8px 12px', border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', minWidth: '200px' },
  clearButton: { padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' },
  searchCount: { fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' },
  tableContainer: { background: 'white', borderRadius: '12px', overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' },
  tableHeadRow: { background: '#F8FAFC' },
  tableHeadCell: { padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #E2E8F0', fontSize: '13px', fontWeight: '600', color: '#4A5568', whiteSpace: 'nowrap' },
  tableRow: { transition: 'background 0.2s ease' },
  tableCell: { padding: '12px 16px', borderBottom: '1px solid #E2E8F0', fontSize: '13px', color: '#2D3748', verticalAlign: 'middle' },
  candidateName: { fontWeight: '500', color: '#1a202c' },
  candidateId: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
  candidateEmail: { fontSize: '12px', color: '#64748b' },
  naText: { color: '#94a3b8', fontStyle: 'italic' },
  assessmentCount: { fontWeight: '600', color: '#0A1929' },
  statusBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  actionButtons: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  viewButton: { padding: '4px 12px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  emailButton: { padding: '4px 12px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  deleteButton: { padding: '4px 12px', background: '#fc8181', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  emptyTitle: { fontSize: '18px', fontWeight: '600', color: '#0A1929', margin: '0 0 8px 0' },
  emptyText: { fontSize: '14px', color: '#94a3b8', margin: '0 0 16px 0' },
  emptyButton: { padding: '10px 24px', background: '#0A1929', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },

  // ===== Modal styles =====
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(10, 25, 41, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalContent: { background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '560px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' },
  modalTitle: { fontSize: '22px', fontWeight: '700', color: '#0A1929', margin: '0 0 8px 0' },
  modalSub: { fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' },
  inputLabel: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' },
  textInput: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  textArea: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' },
  cancelButton: { padding: '12px 24px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  sendButton: { padding: '12px 32px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' },
};
