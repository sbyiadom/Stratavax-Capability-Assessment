// pages/admin/privacy/requests.js
// Phase 7H — Admin privacy requests management page.
//
// Lists all candidate-submitted privacy requests (access, correction,
// deletion), with filters by status and type. Admins can approve or
// reject requests, and download exports for approved access requests.
//
// Uses:
//   GET  /api/admin/privacy/requests             — list with filters
//   POST /api/admin/privacy/requests/[id]/approve — approve
//   POST /api/admin/privacy/requests/[id]/reject  — reject
//   GET  /api/admin/privacy/export/[candidateId]  — export file (with ?download=1)

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import AppLayout from '../../../components/AppLayout';

// Valid status values that map to filter tabs
const VALID_STATUSES = ['all', 'pending', 'in_review', 'approved', 'rejected', 'completed'];

// Status → badge color
const STATUS_COLORS = {
  pending:   { bg: '#fef3c7', fg: '#92400e' },
  in_review: { bg: '#dbeafe', fg: '#1e40af' },
  approved:  { bg: '#d1fae5', fg: '#065f46' },
  rejected:  { bg: '#fee2e2', fg: '#991b1b' },
  completed: { bg: '#dcfce7', fg: '#166534' },
};

// Request type → label
const TYPE_LABELS = {
  access:     'Data Access',
  correction: 'Correction',
  deletion:   'Deletion',
};

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return safeText(value);
  }
}

export default function AdminPrivacyRequests() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Sync status filter with URL
  useEffect(() => {
    if (!router.isReady) return;
    const q = typeof router.query.status === 'string' ? router.query.status : 'pending';
    setStatusFilter(VALID_STATUSES.includes(q) ? q : 'pending');
  }, [router.isReady, router.query.status]);

  useEffect(() => {
    if (!session) return;
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusFilter]);

  const fetchRequests = async () => {
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

      const url = statusFilter === 'all'
        ? '/api/admin/privacy/requests'
        : `/api/admin/privacy/requests?status=${statusFilter}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load privacy requests');
      }

      setRequests(data.requests || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching privacy requests:', err);
      setError(err.message || 'Failed to load privacy requests');
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    const query = nextStatus === 'pending' ? {} : { status: nextStatus };
    router.replace(
      { pathname: '/admin/privacy/requests', query },
      undefined,
      { shallow: true }
    );
  };

  const toggleExpanded = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // ------------------------------------------------------------
  // Approve
  // ------------------------------------------------------------
  const handleApprove = async (request) => {
    if (busyId) return;

    // Extra confirmation for deletion — irreversible
    if (request.request_type === 'deletion') {
      const confirmText = window.prompt(
        `This will permanently anonymize ${request.candidate?.full_name || 'this candidate'}.\n\nType DELETE to confirm.`
      );
      if (confirmText !== 'DELETE') return;
    }

    try {
      setBusyId(request.id);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`/api/admin/privacy/requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve request');
      }

      await fetchRequests();
      setBusyId(null);
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve: ' + err.message);
      setBusyId(null);
    }
  };

  // ------------------------------------------------------------
  // Reject
  // ------------------------------------------------------------
  const openRejectDialog = (requestId) => {
    setRejectingId(requestId);
    setRejectionReason('');
  };

  const closeRejectDialog = () => {
    setRejectingId(null);
    setRejectionReason('');
  };

  const submitRejection = async () => {
    if (!rejectingId) return;
    if (rejectionReason.trim().length < 10) {
      alert('Rejection reason must be at least 10 characters.');
      return;
    }

    try {
      setBusyId(rejectingId);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`/api/admin/privacy/requests/${rejectingId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_reason: rejectionReason.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject request');
      }

      closeRejectDialog();
      await fetchRequests();
      setBusyId(null);
    } catch (err) {
      console.error('Reject error:', err);
      alert('Failed to reject: ' + err.message);
      setBusyId(null);
    }
  };

  // ------------------------------------------------------------
  // Download export (for approved access requests)
  // ------------------------------------------------------------
  const handleDownloadExport = async (candidateId) => {
    try {
      setBusyId(candidateId);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`/api/admin/privacy/export/${candidateId}?download=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Export failed (${res.status})`);
      }

      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `stratavax-export-${candidateId.slice(0, 8)}.json`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBusyId(null);
    } catch (err) {
      console.error('Export download error:', err);
      alert('Failed to download export: ' + err.message);
      setBusyId(null);
    }
  };

  const handleBack = () => {
    router.push('/admin');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading privacy requests...</p>
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
          <h1 style={styles.title}>Privacy Requests</h1>
          <p style={styles.subtitle}>
            Data access, correction, and deletion requests from candidates.
          </p>

          {error && (
            <div style={styles.errorBox}>
              <strong>Error:</strong> {error}
              <button onClick={fetchRequests} style={styles.retryButton}>Retry</button>
            </div>
          )}

          <div style={styles.filterTabs}>
            {VALID_STATUSES.map((s) => {
              const isActive = statusFilter === s;
              const label = s === 'all'
                ? 'All'
                : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <button
                  key={s}
                  onClick={() => handleStatusFilterChange(s)}
                  style={{
                    ...styles.filterTab,
                    background: isActive ? '#1a237e' : 'white',
                    color: isActive ? 'white' : '#1a237e',
                    border: isActive ? 'none' : '1px solid #e2e8f0',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {requests.length === 0 ? (
          <div style={styles.emptyState}>
            {statusFilter === 'pending'
              ? 'No pending privacy requests.'
              : `No requests with status "${statusFilter}".`}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '25%' }}>Candidate</th>
                  <th style={{ ...styles.th, width: '12%' }}>Type</th>
                  <th style={{ ...styles.th, width: '12%' }}>Status</th>
                  <th style={{ ...styles.th, width: '18%' }}>Requested</th>
                  <th style={{ ...styles.th, width: '33%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const statusColor = STATUS_COLORS[request.status] || { bg: '#f1f5f9', fg: '#475569' };
                  const isExpanded = expandedId === request.id;
                  const isBusy = busyId === request.id;
                  const isPending = request.status === 'pending' || request.status === 'in_review';

                  return (
                    <Fragment key={request.id}>
                      <tr
                        style={styles.tr}
                        onClick={() => toggleExpanded(request.id)}
                      >
                        <td style={styles.td}>
                          <div style={styles.candidateName}>
                            {request.candidate?.full_name || 'Unknown'}
                          </div>
                          <div style={styles.candidateEmail}>
                            {request.candidate?.email || ''}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.typeBadge}>
                            {TYPE_LABELS[request.request_type] || request.request_type}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              background: statusColor.bg,
                              color: statusColor.fg,
                            }}
                          >
                            {request.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {formatDateTime(request.requested_at)}
                        </td>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(request)}
                                disabled={isBusy}
                                style={{
                                  ...styles.approveButton,
                                  opacity: isBusy ? 0.6 : 1,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => openRejectDialog(request.id)}
                                disabled={isBusy}
                                style={{
                                  ...styles.rejectButton,
                                  opacity: isBusy ? 0.6 : 1,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {request.status === 'completed' && request.request_type === 'access' && (
                            <button
                              onClick={() => handleDownloadExport(request.candidate_id)}
                              disabled={isBusy}
                              style={{
                                ...styles.exportButton,
                                opacity: isBusy ? 0.6 : 1,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isBusy ? 'Preparing...' : '↓ Download Export'}
                            </button>
                          )}
                          {!isPending && request.status !== 'completed' && (
                            <span style={styles.mutedText}>—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan="5" style={styles.expandedRow}>
                            <div style={styles.detailsGrid}>
                              <div>
                                <div style={styles.detailLabel}>Request ID</div>
                                <div style={styles.detailValue}>{request.id}</div>
                              </div>
                              <div>
                                <div style={styles.detailLabel}>Candidate ID</div>
                                <div style={styles.detailValue}>{request.candidate_id}</div>
                              </div>
                              <div>
                                <div style={styles.detailLabel}>University</div>
                                <div style={styles.detailValue}>
                                  {request.candidate?.university || '—'}
                                </div>
                              </div>
                              <div>
                                <div style={styles.detailLabel}>Programme</div>
                                <div style={styles.detailValue}>
                                  {request.candidate?.programme || '—'}
                                </div>
                              </div>
                              <div>
                                <div style={styles.detailLabel}>IP Address</div>
                                <div style={styles.detailValue}>
                                  {request.ip_address || '—'}
                                </div>
                              </div>
                              <div>
                                <div style={styles.detailLabel}>User Agent</div>
                                <div style={styles.detailValueSmall}>
                                  {request.user_agent || '—'}
                                </div>
                              </div>
                              {request.reviewed_at && (
                                <div>
                                  <div style={styles.detailLabel}>Reviewed At</div>
                                  <div style={styles.detailValue}>
                                    {formatDateTime(request.reviewed_at)}
                                  </div>
                                </div>
                              )}
                              {request.completed_at && (
                                <div>
                                  <div style={styles.detailLabel}>Completed At</div>
                                  <div style={styles.detailValue}>
                                    {formatDateTime(request.completed_at)}
                                  </div>
                                </div>
                              )}
                              {request.rejection_reason && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <div style={styles.detailLabel}>Rejection Reason</div>
                                  <div style={styles.detailValue}>
                                    {request.rejection_reason}
                                  </div>
                                </div>
                              )}
                              {request.details && Object.keys(request.details).length > 0 && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <div style={styles.detailLabel}>Request Details</div>
                                  <div style={styles.detailValueSmall}>
                                    {JSON.stringify(request.details)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rejection dialog */}
        {rejectingId && (
          <div style={styles.modalOverlay} onClick={closeRejectDialog}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Reject Privacy Request</h3>
              <p style={styles.modalSubtitle}>
                The candidate will see this reason. Be clear and specific.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                style={styles.modalTextarea}
                rows={5}
              />
              <div style={styles.modalActions}>
                <button onClick={closeRejectDialog} style={styles.modalCancelButton}>
                  Cancel
                </button>
                <button
                  onClick={submitRejection}
                  disabled={busyId === rejectingId || rejectionReason.trim().length < 10}
                  style={{
                    ...styles.modalConfirmButton,
                    opacity: (busyId === rejectingId || rejectionReason.trim().length < 10) ? 0.5 : 1,
                    cursor: (busyId === rejectingId || rejectionReason.trim().length < 10) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busyId === rejectingId ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '400px', gap: '16px',
  },
  loadingSpinner: {
    width: '40px', height: '40px',
    border: '4px solid #e2e8f0', borderTop: '4px solid #1a237e',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '20px' },
  backButton: {
    padding: '8px 16px', background: 'transparent',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', color: '#475569',
    marginBottom: '20px',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: '0 0 16px 0' },
  errorBox: {
    background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px',
    padding: '12px 16px', marginBottom: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    color: '#991b1b',
  },
  retryButton: {
    padding: '4px 12px', background: '#991b1b', color: 'white',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
  },
  filterTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  filterTab: {
    padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600', transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  tableContainer: {
    background: 'white', borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'auto', border: '1px solid #e2e8f0',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    padding: '14px 16px', textAlign: 'left', background: '#f8fafc',
    fontWeight: '600', color: '#475569',
    borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
    color: '#1a202c', verticalAlign: 'middle',
  },
  tr: { transition: 'background 0.2s', cursor: 'pointer' },
  candidateName: { fontWeight: '500', color: '#1a202c' },
  candidateEmail: { fontSize: '12px', color: '#94a3b8' },
  typeBadge: {
    padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
    fontWeight: '600', display: 'inline-block',
    background: '#eef2ff', color: '#4338ca',
  },
  statusBadge: {
    padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
    fontWeight: '600', display: 'inline-block',
  },
  approveButton: {
    padding: '6px 14px', background: '#16a34a', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', marginRight: '6px',
    fontFamily: 'inherit',
  },
  rejectButton: {
    padding: '6px 14px', background: '#dc2626', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
  },
  exportButton: {
    padding: '6px 14px', background: '#1a237e', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
  },
  mutedText: { color: '#94a3b8', fontSize: '13px' },
  emptyState: {
    textAlign: 'center', padding: '60px 20px', color: '#94a3b8',
    background: 'white', borderRadius: '12px',
    border: '1px solid #e2e8f0', fontSize: '15px',
  },
  expandedRow: { background: '#f8fafc', padding: 0 },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    padding: '20px 24px',
  },
  detailLabel: {
    fontSize: '11px', fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    marginBottom: '4px',
  },
  detailValue: { fontSize: '13px', color: '#1a202c', wordBreak: 'break-all' },
  detailValueSmall: {
    fontSize: '11px', color: '#64748b', wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '12px',
  },
  modalContent: {
    background: 'white', borderRadius: '16px', padding: '24px',
    maxWidth: '520px', width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: '20px', fontWeight: '700', color: '#1a237e',
    margin: '0 0 6px 0',
  },
  modalSubtitle: {
    fontSize: '13px', color: '#64748b', margin: '0 0 16px 0',
  },
  modalTextarea: {
    width: '100%', padding: '12px', borderRadius: '10px',
    border: '1px solid #e2e8f0', fontSize: '14px',
    fontFamily: 'inherit', resize: 'vertical',
    outline: 'none', boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex', gap: '10px', justifyContent: 'flex-end',
    marginTop: '16px',
  },
  modalCancelButton: {
    padding: '10px 20px', background: '#f1f5f9',
    border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    fontFamily: 'inherit',
  },
  modalConfirmButton: {
    padding: '10px 20px', background: '#dc2626', color: 'white',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '600', fontFamily: 'inherit',
  },
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
