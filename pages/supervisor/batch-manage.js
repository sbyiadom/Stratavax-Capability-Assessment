// pages/supervisor/batch-manage.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

// ============================================================
// BULK IMPORT MODAL COMPONENT
// ============================================================
function BulkImportModal({ onClose, onImport, supervisorId }) {
  const [csvData, setCsvData] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const [university, setUniversity] = useState("");
  const [program, setProgram] = useState("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvData(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        setError("File is empty.");
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIndex = header.findIndex(h => h.includes('name') || h.includes('full_name'));
      const emailIndex = header.findIndex(h => h.includes('email'));
      const phoneIndex = header.findIndex(h => h.includes('phone') || h.includes('tel'));

      if (nameIndex === -1 || emailIndex === -1) {
        setError("CSV must contain 'Name' and 'Email' columns.");
        return;
      }

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const name = values[nameIndex] || '';
        const email = values[emailIndex] || '';
        const phone = phoneIndex !== -1 ? values[phoneIndex] || '' : '';

        if (name && email) {
          parsed.push({ full_name: name, email, phone });
        }
      }

      if (parsed.length === 0) {
        setError("No valid candidates found in the file.");
        return;
      }

      setPreview(parsed);
      setError(null);
    } catch (err) {
      setError("Error parsing CSV file: " + err.message);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError("No candidates to import.");
      return;
    }

    if (!university) {
      setError("Please select a university.");
      return;
    }

    if (!program) {
      setError("Please enter a program of study.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/batch-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidates: preview.map(c => ({
            ...c,
            university: university,
            program: program,
            supervisor_id: supervisorId
          }))
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to import candidates');
      }

      alert(`Successfully imported ${result.imported || preview.length} candidate(s)!`);
      onImport();
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>📥 Bulk Import Candidates</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>×</button>
        </div>

        {error && (
          <div style={modalStyles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={modalStyles.section}>
          <p style={modalStyles.helpText}>
            Upload a CSV file with columns: <strong>Name, Email, Phone (optional)</strong>
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={modalStyles.fileInput}
          />
          <p style={modalStyles.hintText}>
            Or paste CSV data directly:
          </p>
          <textarea
            value={csvData}
            onChange={(e) => {
              setCsvData(e.target.value);
              parseCSV(e.target.value);
            }}
            style={modalStyles.textarea}
            placeholder="full_name,email,phone&#10;John Doe,john@example.com,+233201234567&#10;Jane Smith,jane@example.com,+233207654321"
            rows={6}
          />
        </div>

        <div style={modalStyles.section}>
          <h3 style={modalStyles.sectionTitle}>Default Values</h3>
          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>University *</label>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              style={modalStyles.select}
              required
            >
              <option value="">Select University</option>
              <option value="KNUST">KNUST</option>
              <option value="University of Mines and Technology">University of Mines and Technology</option>
              <option value="Kumasi Technical University">Kumasi Technical University</option>
              <option value="Accra Technical University">Accra Technical University</option>
              <option value="Koforidua Technical University">Koforidua Technical University</option>
              <option value="Regional Maritime University">Regional Maritime University</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>Program of Study *</label>
            <input
              type="text"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              style={modalStyles.input}
              placeholder="e.g., BSc Mechanical Engineering"
              required
            />
          </div>
        </div>

        {preview.length > 0 && (
          <div style={modalStyles.section}>
            <h3 style={modalStyles.sectionTitle}>Preview ({preview.length} candidates)</h3>
            <div style={modalStyles.previewContainer}>
              <table style={modalStyles.previewTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((c, i) => (
                    <tr key={i}>
                      <td>{c.full_name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone || 'N/A'}</td>
                    </tr>
                  ))}
                  {preview.length > 5 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>
                        ... and {preview.length - 5} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={modalStyles.actions}>
          <button onClick={onClose} style={modalStyles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || preview.length === 0 || !university || !program}
            style={{
              ...modalStyles.importButton,
              opacity: (importing || preview.length === 0 || !university || !program) ? 0.6 : 1,
              cursor: (importing || preview.length === 0 || !university || !program) ? 'not-allowed' : 'pointer'
            }}
          >
            {importing ? 'Importing...' : `Import ${preview.length} Candidates`}
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
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
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
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    margin: '0 0 8px 0'
  },
  helpText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0'
  },
  hintText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '12px 0 8px 0'
  },
  fileInput: {
    width: '100%',
    padding: '10px',
    border: '2px dashed #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    background: '#fafbfc'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  fieldGroup: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white'
  },
  previewContainer: {
    maxHeight: '200px',
    overflow: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px'
  },
  previewTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '16px',
    fontSize: '14px'
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
  importButton: {
    padding: '8px 24px',
    background: '#0a1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SupervisorBatchManage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [candidates, setCandidates] = useState([]);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    checkSupervisorAuth();
  }, []);

  async function checkSupervisorAuth() {
    try {
      setCheckingAuth(true);
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

      if (resolvedRole !== "supervisor" && resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Supervisor access is required." });
        router.replace("/login");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      setCurrentSupervisor({
        id: activeSession.user.id,
        email: activeSession.user.email,
        name: profile?.full_name || activeSession.user.user_metadata?.full_name || activeSession.user.email,
        role: resolvedRole
      });

      await loadCandidates(activeSession.user.id);

    } catch (error) {
      console.error("Batch manage auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.replace("/login");
    } finally {
      setCheckingAuth(false);
      setLoading(false);
    }
  }

  const loadCandidates = async (supervisorId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          university,
          programme,
          supervisor_id,
          created_at
        `)
        .eq('supervisor_id', supervisorId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCandidates(data);
        console.log('[Supervisor] Candidates loaded:', data.length);
      } else if (error) {
        console.error('[Supervisor] Error loading candidates:', error);
        setCandidates([]);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('candidate_profiles')
        .delete()
        .eq('id', candidateId);

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Candidate deleted successfully." 
      });
      await loadCandidates(currentSupervisor.id);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      setMessage({ 
        type: "error", 
        text: getReadableError(error) 
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = candidates.filter(c => c.selected).map(c => c.id);
    if (selectedIds.length === 0) {
      setMessage({ type: "error", text: "No candidates selected for deletion." });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} candidate(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('candidate_profiles')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: `${selectedIds.length} candidate(s) deleted successfully.` 
      });
      await loadCandidates(currentSupervisor.id);
    } catch (error) {
      console.error('Error bulk deleting candidates:', error);
      setMessage({ 
        type: "error", 
        text: getReadableError(error) 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    loadCandidates(currentSupervisor.id);
    setMessage({ 
      type: "success", 
      text: "Candidates imported successfully!" 
    });
  };

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking supervisor access...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <button onClick={() => router.push('/supervisor')} style={styles.backButton}>
                ← Back to Dashboard
              </button>
              <h1 style={styles.title}>📦 Batch Manage</h1>
              <p style={styles.subtitle}>
                Manage your candidates in bulk. {currentSupervisor?.name && `👑 ${currentSupervisor.name}`}
              </p>
            </div>
            <div style={styles.headerActions}>
              <button
                onClick={() => setShowImportModal(true)}
                style={styles.importButton}
              >
                📥 Import CSV
              </button>
            </div>
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

          {/* Stats Summary */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{candidates.length}</div>
              <div style={styles.statLabel}>Total Candidates</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {candidates.filter(c => c.university).length}
              </div>
              <div style={styles.statLabel}>With University</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {candidates.filter(c => c.programme).length}
              </div>
              <div style={styles.statLabel}>With Program</div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div style={styles.bulkActions}>
            <button
              onClick={() => {
                const allSelected = candidates.every(c => c.selected);
                setCandidates(candidates.map(c => ({ ...c, selected: !allSelected })));
              }}
              style={styles.bulkActionButton}
            >
              {candidates.every(c => c.selected) ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleBulkDelete}
              style={styles.bulkDeleteButton}
              disabled={!candidates.some(c => c.selected)}
            >
              🗑️ Delete Selected ({candidates.filter(c => c.selected).length})
            </button>
          </div>

          {/* Candidates Table */}
          <div style={styles.tableContainer}>
            <div style={styles.tableWrapper}>
              {loading ? (
                <div style={styles.loadingState}>
                  <div style={styles.spinner} />
                  <p>Loading candidates...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📭</div>
                  <h3 style={styles.emptyTitle}>No Candidates Found</h3>
                  <p style={styles.emptyText}>
                    You haven't added any candidates yet. Add candidates individually or import them in bulk.
                  </p>
                  <div style={styles.emptyActions}>
                    <button
                      onClick={() => router.push('/supervisor/add-candidate')}
                      style={styles.emptyButtonPrimary}
                    >
                      + Add Candidate
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      style={styles.emptyButtonSecondary}
                    >
                      📥 Import CSV
                    </button>
                  </div>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={candidates.every(c => c.selected)}
                          onChange={() => {
                            const allSelected = candidates.every(c => c.selected);
                            setCandidates(candidates.map(c => ({ ...c, selected: !allSelected })));
                          }}
                        />
                      </th>
                      <th style={styles.th}>Candidate</th>
                      <th style={styles.th}>University</th>
                      <th style={styles.th}>Program</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} style={styles.tr}>
                        <td style={styles.td}>
                          <input
                            type="checkbox"
                            checked={candidate.selected || false}
                            onChange={() => {
                              setCandidates(candidates.map(c =>
                                c.id === candidate.id ? { ...c, selected: !c.selected } : c
                              ));
                            }}
                          />
                        </td>
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
                          {candidate.phone || 'N/A'}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => router.push(`/supervisor/manage-candidate/${candidate.id}`)}
                            style={styles.actionButton}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            style={styles.deleteActionButton}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <BulkImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportComplete}
          supervisorId={currentSupervisor?.id}
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
  checkingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center"
  },
  checkingText: {
    margin: 0,
    color: "rgba(255,255,255,0.9)",
    fontSize: "14px"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    flex: 1
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '12px'
  },
  title: {
    margin: "0 0 8px",
    color: "#0a1929",
    fontSize: "26px",
    fontWeight: 800
  },
  subtitle: {
    margin: "0 0 4px",
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.6
  },
  importButton: {
    padding: "10px 20px",
    background: "#0a1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600
  },
  message: {
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929'
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  bulkActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  bulkActionButton: {
    padding: '6px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#475569'
  },
  bulkDeleteButton: {
    padding: '6px 16px',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#991b1b'
  },
  tableContainer: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden'
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
  actionButton: {
    padding: '4px 12px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '4px'
  },
  deleteActionButton: {
    padding: '4px 12px',
    background: '#fc8181',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 8px 0'
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 20px 0'
  },
  emptyActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  emptyButtonPrimary: {
    padding: '10px 24px',
    background: '#0a1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  emptyButtonSecondary: {
    padding: '10px 24px',
    background: '#f1f5f9',
    color: '#0a1929',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  footer: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  },
  footerText: {
    margin: 0,
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center'
  }
};
