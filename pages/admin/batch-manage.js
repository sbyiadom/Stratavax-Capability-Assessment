// pages/admin/batch-manage.js - COMPLETE FIXED VERSION

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

// ============================================================
// SUPERVISOR ASSIGNMENT MODAL COMPONENT
// ============================================================
function SupervisorAssignmentModal({ candidate, onClose, onSave }) {
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [candidate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ============================================================
      // STEP 1: Get ALL supervisors from supervisor_profiles table
      // ============================================================
      const { data: supervisorProfiles, error: profError } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email, is_active')
        .eq('is_active', true);

      if (profError) {
        console.error('[Modal] Error loading supervisors:', profError);
        setError('Failed to load supervisors.');
        setLoading(false);
        return;
      }

      const supervisors = supervisorProfiles || [];
      setAllSupervisors(supervisors);
      console.log('[Modal] Total supervisors loaded:', supervisors.length);

      // ============================================================
      // STEP 2: Get current assignments for this candidate
      // ============================================================
      let currentIds = [];

      // Check candidate_supervisors table
      try {
        const { data: assignments, error: assignError } = await supabase
          .from('candidate_supervisors')
          .select('supervisor_id')
          .eq('candidate_id', candidate.id);

        if (!assignError && assignments && assignments.length > 0) {
          currentIds = assignments.map(a => a.supervisor_id);
          console.log('[Modal] Current assignments from junction table:', currentIds.length);
        }
      } catch (e) {
        console.log('[Modal] candidate_supervisors table may not exist');
      }

      // Also check if supervisor_id is set in candidate_profiles
      if (candidate.supervisor_id && !currentIds.includes(candidate.supervisor_id)) {
        const existsInList = supervisors.some(s => s.id === candidate.supervisor_id);
        if (existsInList) {
          currentIds.push(candidate.supervisor_id);
          console.log('[Modal] Added supervisor_id from candidate profile');
        }
      }

      setSelectedSupervisors(currentIds);
      
      // Filter out supervisors already assigned
      const available = supervisors.filter(s => !currentIds.includes(s.id));
      setAvailableSupervisors(available);
      
    } catch (error) {
      console.error('[Modal] Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/supervisors/assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: candidate.id,
          supervisorIds: selectedSupervisors
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign supervisors');
      }

      alert(`Successfully assigned ${selectedSupervisors.length} supervisor(s) to ${candidate.full_name}`);
      onSave();
      onClose();
    } catch (error) {
      console.error('[Modal] Error assigning supervisors:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addSupervisor = (supervisorId) => {
    setSelectedSupervisors(prev => [...prev, supervisorId]);
    const supervisor = allSupervisors.find(s => s.id === supervisorId);
    setAvailableSupervisors(prev => prev.filter(s => s.id !== supervisorId));
  };

  const removeSupervisor = (supervisorId) => {
    setSelectedSupervisors(prev => prev.filter(id => id !== supervisorId));
    const supervisor = allSupervisors.find(s => s.id === supervisorId);
    if (supervisor) {
      setAvailableSupervisors(prev => [...prev, supervisor]);
    }
  };

  const getSupervisorName = (id) => {
    const supervisor = allSupervisors.find(s => s.id === id);
    return supervisor?.full_name || supervisor?.email || id.substring(0, 8);
  };

  if (loading) {
    return (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.modal}>
          <div style={modalStyles.loadingContainer}>
            <div style={modalStyles.loadingSpinner}></div>
            <p>Loading supervisors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>Assign Supervisors</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>×</button>
        </div>
        
        <div style={modalStyles.candidateInfo}>
          <strong>{candidate.full_name}</strong>
          <span style={modalStyles.candidateEmail}>{candidate.email}</span>
        </div>

        {error && (
          <div style={modalStyles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={modalStyles.section}>
          <h3 style={modalStyles.sectionTitle}>Assigned Supervisors ({selectedSupervisors.length})</h3>
          {selectedSupervisors.length === 0 ? (
            <p style={modalStyles.emptyText}>No supervisors assigned</p>
          ) : (
            <div style={modalStyles.chipContainer}>
              {selectedSupervisors.map(id => {
                const name = getSupervisorName(id);
                return (
                  <div key={id} style={modalStyles.chip}>
                    <span>{name}</span>
                    <button 
                      onClick={() => removeSupervisor(id)}
                      style={modalStyles.removeChip}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={modalStyles.section}>
          <h3 style={modalStyles.sectionTitle}>Available Supervisors ({availableSupervisors.length})</h3>
          <div style={modalStyles.availableList}>
            {availableSupervisors.length === 0 ? (
              <p style={modalStyles.emptyText}>All supervisors are already assigned.</p>
            ) : (
              availableSupervisors.map(supervisor => (
                <div key={supervisor.id} style={modalStyles.availableItem}>
                  <div>
                    <div style={modalStyles.supervisorName}>
                      {supervisor.full_name || 'Unknown'}
                    </div>
                    <div style={modalStyles.supervisorEmail}>
                      {supervisor.email || ''}
                    </div>
                  </div>
                  <button
                    onClick={() => addSupervisor(supervisor.id)}
                    style={modalStyles.addButton}
                  >
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={modalStyles.actions}>
          <button onClick={onClose} style={modalStyles.cancelButton}>
            Cancel
          </button>
          <button 
            onClick={handleAssign} 
            style={modalStyles.saveButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '0 8px'
  },
  candidateInfo: {
    background: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0'
  },
  candidateEmail: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    margin: '0 0 8px 0'
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#e2e8f0',
    padding: '4px 12px 4px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#1a202c'
  },
  removeChip: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#991b1b',
    padding: '0 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  availableList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflow: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px'
  },
  availableItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    border: '1px solid #f1f5f9',
    borderRadius: '8px',
    background: '#fafbfc'
  },
  supervisorName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  supervisorEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  addButton: {
    padding: '4px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelButton: {
    padding: '8px 20px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569'
  },
  saveButton: {
    padding: '8px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '13px',
    fontStyle: 'italic',
    margin: '4px 0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '16px'
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '16px',
    fontSize: '14px'
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminBatchManageRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [candidates, setCandidates] = useState([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [supervisorList, setSupervisorList] = useState([]);

  useEffect(() => {
    checkAdminAndRedirect();
  }, []);

  async function checkAdminAndRedirect() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Admin access is required for this page." });
        router.replace("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      await loadCandidates();
      await loadSupervisors();

    } catch (error) {
      console.error("Admin batch redirect error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  const loadCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          university,
          programme,
          supervisor_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCandidates(data);
        console.log('[Admin] Candidates loaded:', data.length);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const loadSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email, is_active')
        .eq('is_active', true);

      if (error) {
        console.error('[Admin] Error loading supervisors:', error);
        setSupervisorList([]);
        return;
      }

      setSupervisorList(data || []);
      console.log('[Admin] Supervisors loaded:', data?.length || 0);

    } catch (error) {
      console.error('Error loading supervisors:', error);
      setSupervisorList([]);
    }
  };

  const openAssignmentModal = (candidate) => {
    setSelectedCandidate(candidate);
    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedCandidate(null);
  };

  const handleAssignmentSaved = () => {
    loadCandidates();
    loadSupervisors();
  };

  const handleBack = () => {
    router.push('/admin');
  };

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <button onClick={handleBack} style={styles.backButton}>← Back to Dashboard</button>
            <h1 style={styles.title}>Admin Batch Manager</h1>
            <p style={styles.subtitle}>
              Manage candidates and assign supervisors. ({supervisorList.length} supervisors available)
            </p>
          </div>

          {message.text && (
            <div style={{
              ...styles.message,
              background: message.type === "success" ? "#e8f5e9" : "#ffebee",
              color: message.type === "success" ? "#2e7d32" : "#c62828",
              border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
            }}>
              {message.text}
            </div>
          )}

          {/* Supervisors Summary */}
          <div style={styles.supervisorSummary}>
            <span>👥 Available Supervisors: <strong>{supervisorList.length}</strong></span>
            {supervisorList.map(s => (
              <span key={s.id} style={styles.supervisorTag}>
                {s.full_name || s.email || s.id.substring(0, 8)}
              </span>
            ))}
            {supervisorList.length === 0 && (
              <span style={styles.supervisorTag}>No supervisors found</span>
            )}
          </div>

          {/* Candidates Table */}
          <div style={styles.tableContainer}>
            <h3 style={styles.tableTitle}>Candidates ({candidates.length})</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Candidate</th>
                    <th style={styles.th}>University</th>
                    <th style={styles.th}>Programme</th>
                    <th style={styles.th}>Supervisors</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={styles.emptyState}>
                        No candidates found.
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate) => {
                      const supervisorName = candidate.supervisor_id 
                        ? supervisorList.find(s => s.id === candidate.supervisor_id)?.full_name 
                        : null;
                      
                      return (
                        <tr key={candidate.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.candidateName}>
                              {candidate.full_name || 'Unknown'}
                            </div>
                            <div style={styles.candidateEmail}>
                              {candidate.email || ''}
                            </div>
                          </td>
                          <td style={styles.td}>
                            {candidate.university || 'N/A'}
                          </td>
                          <td style={styles.td}>
                            {candidate.programme || 'N/A'}
                          </td>
                          <td style={styles.td}>
                            {supervisorName ? (
                              <span style={styles.supervisorBadge}>
                                {supervisorName}
                              </span>
                            ) : (
                              <span style={styles.noSupervisorBadge}>None</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => openAssignmentModal(candidate)}
                              style={styles.actionButton}
                            >
                              Assign Supervisor
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

          {loading && (
            <div style={styles.loadingBlock}>
              <div style={styles.spinner} />
              <span>Loading...</span>
            </div>
          )}

          <div style={styles.actions}>
            <Link href="/supervisor/batch-manage" legacyBehavior>
              <a style={styles.primaryButton}>Open Batch Manager</a>
            </Link>
            <Link href="/admin" legacyBehavior>
              <a style={styles.secondaryButton}>Back to Admin Dashboard</a>
            </Link>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && selectedCandidate && (
        <SupervisorAssignmentModal
          candidate={selectedCandidate}
          onClose={closeAssignmentModal}
          onSave={handleAssignmentSaved}
        />
      )}

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
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "30px 20px"
  },
  card: {
    width: "100%",
    maxWidth: "1200px",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "18px",
    padding: "36px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.45)"
  },
  header: {
    marginBottom: '24px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '16px'
  },
  title: {
    margin: "0 0 8px",
    color: "#0a1929",
    fontSize: "26px",
    fontWeight: 800
  },
  subtitle: {
    margin: "0 0 24px",
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.6
  },
  supervisorSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
    flexWrap: 'wrap',
    fontSize: '14px',
    color: '#475569'
  },
  supervisorTag: {
    padding: '2px 10px',
    background: '#e2e8f0',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#1a202c'
  },
  loadingBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "22px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #0a1929",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  message: {
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  tableContainer: {
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  tableTitle: {
    padding: '16px 20px',
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    color: '#0a1929'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
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
  supervisorBadge: {
    padding: '2px 8px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  noSupervisorBadge: {
    padding: '2px 8px',
    background: '#f1f5f9',
    color: '#94a3b8',
    borderRadius: '12px',
    fontSize: '12px'
  },
  actionButton: {
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
    padding: '30px',
    color: '#94a3b8'
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: '16px'
  },
  primaryButton: {
    padding: "11px 18px",
    background: "#0a1929",
    color: "white",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 800
  },
  secondaryButton: {
    padding: "11px 18px",
    background: "#f1f5f9",
    color: "#0a1929",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 800
  }
};
