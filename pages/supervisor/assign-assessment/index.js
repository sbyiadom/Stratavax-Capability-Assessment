// pages/supervisor/assign-assessment/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

export default function AssignAssessmentIndex() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Check authentication and load candidates
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Get current session
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session?.user) {
          router.push('/login');
          return;
        }

        // Get supervisor profile
        const { data: profile, error: profileError } = await supabase
          .from('supervisor_profiles')
          .select('id, full_name, email, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error('Unable to verify your account.');
        }

        setCurrentSupervisor(profile);

        // Fetch candidates assigned to this supervisor
        const isAdmin = profile?.role === 'admin';
        
        let query = supabase
          .from('candidate_profiles')
          .select('id, full_name, email, university, programme, created_at, supervisor_id')
          .order('full_name', { ascending: true });

        // If not admin, only show their assigned candidates
        if (!isAdmin) {
          query = query.eq('supervisor_id', session.user.id);
        }

        const { data: candidatesData, error: candidatesError } = await query;

        if (candidatesError) {
          throw new Error('Failed to load candidates.');
        }

        setCandidates(candidatesData || []);

      } catch (err) {
        console.error('Error loading assign assessment page:', err);
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleAssign = (userId) => {
    router.push(`/supervisor/assign-assessment/${userId}`);
  };

  const handleViewCandidate = (userId) => {
    router.push(`/supervisor/manage-candidate/${userId}`);
  };

  // Filter candidates based on search
  const filteredCandidates = candidates.filter(candidate => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (candidate.full_name && candidate.full_name.toLowerCase().includes(term)) ||
      (candidate.email && candidate.email.toLowerCase().includes(term)) ||
      (candidate.university && candidate.university.toLowerCase().includes(term)) ||
      (candidate.programme && candidate.programme.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading candidates...</p>
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

  if (error) {
    return (
      <AppLayout>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Error Loading Data</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Assign Assessment</h1>
            <p style={styles.subtitle}>
              Select a candidate to assign assessments
            </p>
          </div>
          <div style={styles.headerStats}>
            <span style={styles.statsBadge}>
              {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, university, or programme..."
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
              ✕
            </button>
          )}
        </div>

        {/* Candidates Table */}
        <div style={styles.tableContainer}>
          {filteredCandidates.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👤</div>
              <h3>No Candidates Found</h3>
              <p>
                {searchTerm 
                  ? `No candidates match "${searchTerm}". Try a different search term.`
                  : candidates.length === 0
                    ? 'You have no candidates assigned yet. Add candidates first.'
                    : 'No candidates available.'
                }
              </p>
              {candidates.length === 0 && (
                <button 
                  onClick={() => router.push('/supervisor/add-candidate')}
                  style={styles.addButton}
                >
                  + Add Candidate
                </button>
              )}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Candidate Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>University</th>
                  <th style={styles.th}>Programme</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={styles.candidateName}>
                        <div style={styles.avatar}>
                          {candidate.full_name?.charAt(0) || 'C'}
                        </div>
                        <span>{candidate.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{candidate.email || 'N/A'}</td>
                    <td style={styles.td}>{candidate.university || 'Not Specified'}</td>
                    <td style={styles.td}>{candidate.programme || 'Not Specified'}</td>
                    <td style={styles.td}>
                      <div style={styles.actionContainer}>
                        <button
                          onClick={() => handleViewCandidate(candidate.id)}
                          style={styles.viewButton}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleAssign(candidate.id)}
                          style={styles.assignButton}
                        >
                          Assign Assessment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer note */}
        <div style={styles.footerNote}>
          <p>
            💡 <strong>Tip:</strong> Newly assigned assessments are blocked by default. 
            Unblock them from the candidate's profile when they should be allowed to start.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    maxWidth: '500px',
    margin: '60px auto',
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorMessage: {
    color: '#dc2626',
    marginBottom: '20px'
  },
  retryButton: {
    padding: '10px 24px',
    background: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0A1929',
    margin: '0 0 4px 0'
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0
  },
  headerStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statsBadge: {
    padding: '6px 16px',
    background: '#e2e8f0',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569'
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    paddingRight: '48px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: 'white',
    boxSizing: 'border-box'
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px 8px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #eef2f7'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8fafc'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #eef2f7',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  tableRow: {
    transition: 'background 0.15s',
    cursor: 'default'
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '14px',
    color: '#1a202c',
    verticalAlign: 'middle'
  },
  candidateName: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#2563EB',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0
  },
  actionContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  viewButton: {
    padding: '6px 14px',
    background: 'transparent',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.15s'
  },
  assignButton: {
    padding: '6px 16px',
    background: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },
  addButton: {
    marginTop: '16px',
    padding: '10px 24px',
    background: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  footerNote: {
    marginTop: '20px',
    padding: '16px 20px',
    background: '#eff6ff',
    borderRadius: '10px',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    fontSize: '14px'
  }
};
