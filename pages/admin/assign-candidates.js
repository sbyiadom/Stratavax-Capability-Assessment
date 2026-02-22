import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AssignCandidates() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [selectedBulkSupervisor, setSelectedBulkSupervisor] = useState("");

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const supervisorSession = localStorage.getItem("supervisorSession");
      if (!supervisorSession) {
        router.push("/supervisor-login");
        return;
      }

      const session = JSON.parse(supervisorSession);
      
      const { data: profile, error } = await supabase
        .from('supervisor_profiles')
        .select('role')
        .eq('id', session.user_id)
        .single();

      if (error || profile?.role !== 'admin') {
        alert('Admin access required');
        router.push('/supervisor');
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/supervisor-login');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          supervisor_id,
          supervisor:supervisor_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;

      // Fetch all supervisors
      const { data: supervisorsData, error: supervisorsError } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true });

      if (supervisorsError) throw supervisorsError;

      setCandidates(candidatesData || []);
      setSupervisors(supervisorsData || []);
      
      const initialSelected = {};
      candidatesData?.forEach(c => {
        initialSelected[c.id] = c.supervisor_id || '';
      });
      setSelectedSupervisor(initialSelected);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (candidateId) => {
    const supervisorId = selectedSupervisor[candidateId];
    
    if (!supervisorId) {
      alert('Please select a supervisor');
      return;
    }

    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ supervisor_id: supervisorId })
        .eq('id', candidateId);

      if (error) throw error;

      await fetchData();
      alert('Candidate assigned successfully');
    } catch (error) {
      console.error('Error assigning candidate:', error);
      alert('Failed to assign candidate');
    }
  };

  const handleBulkAssign = async () => {
    const unassignedCandidates = candidates.filter(c => !c.supervisor_id);
    
    if (unassignedCandidates.length === 0) {
      alert('No unassigned candidates found');
      return;
    }

    if (!selectedBulkSupervisor) {
      alert('Please select a supervisor');
      return;
    }

    const supervisor = supervisors.find(s => s.id === selectedBulkSupervisor);
    
    if (!confirm(`Assign ${unassignedCandidates.length} unassigned candidates to ${supervisor?.full_name || supervisor?.email}?`)) {
      return;
    }

    try {
      for (let candidate of unassignedCandidates) {
        await supabase
          .from('candidate_profiles')
          .update({ supervisor_id: selectedBulkSupervisor })
          .eq('id', candidate.id);
      }

      await fetchData();
      alert('Bulk assignment completed');
      setSelectedBulkSupervisor("");
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      alert('Failed to complete bulk assignment');
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = searchTerm === '' || 
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterSupervisor === 'all' || 
      (filterSupervisor === 'unassigned' && !c.supervisor_id) ||
      c.supervisor_id === filterSupervisor;
    
    return matchesSearch && matchesFilter;
  });

  if (!isAdmin) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Checking authorization...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/admin" legacyBehavior>
            <a style={styles.backButton}>← Back to Admin</a>
          </Link>
          <h1 style={styles.title}>Assign Candidates to Supervisors</h1>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statLabel}>Total Candidates</div>
              <div style={styles.statValue}>{candidates.length}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div>
              <div style={styles.statLabel}>Assigned</div>
              <div style={styles.statValue}>{candidates.filter(c => c.supervisor_id).length}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⏳</div>
            <div>
              <div style={styles.statLabel}>Unassigned</div>
              <div style={styles.statValue}>{candidates.filter(c => !c.supervisor_id).length}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👑</div>
            <div>
              <div style={styles.statLabel}>Supervisors</div>
              <div style={styles.statValue}>{supervisors.length}</div>
            </div>
          </div>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <select
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Candidates</option>
              <option value="unassigned">Unassigned Only</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>
                  Assigned to: {s.full_name || s.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading candidates...</p>
            </div>
          ) : (
            <>
              {filteredCandidates.filter(c => !c.supervisor_id).length > 0 && (
                <div style={styles.bulkActions}>
                  <span style={styles.bulkLabel}>Bulk Assign Unassigned:</span>
                  <select
                    value={selectedBulkSupervisor}
                    onChange={(e) => setSelectedBulkSupervisor(e.target.value)}
                    style={styles.bulkSelect}
                  >
                    <option value="">Select Supervisor</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email} {s.role === 'admin' ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!selectedBulkSupervisor}
                    style={{
                      ...styles.bulkButton,
                      opacity: !selectedBulkSupervisor ? 0.5 : 1,
                      cursor: !selectedBulkSupervisor ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Assign All ({filteredCandidates.filter(c => !c.supervisor_id).length})
                  </button>
                </div>
              )}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.tableHead}>Candidate</th>
                      <th style={styles.tableHead}>Contact</th>
                      <th style={styles.tableHead}>Current Supervisor</th>
                      <th style={styles.tableHead}>Assign To</th>
                      <th style={styles.tableHead}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.candidateInfo}>
                            <div style={styles.candidateAvatar}>
                              {candidate.full_name?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <div style={styles.candidateName}>{candidate.full_name || 'Unnamed'}</div>
                              <div style={styles.candidateId}>ID: {candidate.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.candidateEmail}>{candidate.email}</div>
                          {candidate.phone && <div style={styles.candidatePhone}>{candidate.phone}</div>}
                        </td>
                        <td style={styles.tableCell}>
                          {candidate.supervisor ? (
                            <span style={styles.assignedBadge}>
                              <span style={styles.assignedName}>{candidate.supervisor.full_name || 'Unknown'}</span>
                              <span style={styles.assignedEmail}>{candidate.supervisor.email}</span>
                            </span>
                          ) : (
                            <span style={styles.unassignedBadge}>Unassigned</span>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          <select
                            value={selectedSupervisor[candidate.id] || ''}
                            onChange={(e) => setSelectedSupervisor({
                              ...selectedSupervisor,
                              [candidate.id]: e.target.value
                            })}
                            style={styles.assignSelect}
                          >
                            <option value="">Select Supervisor</option>
                            {supervisors.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.full_name || s.email} {s.role === 'admin' ? '(Admin)' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.tableCell}>
                          <button
                            onClick={() => handleAssign(candidate.id)}
                            disabled={!selectedSupervisor[candidate.id] || selectedSupervisor[candidate.id] === candidate.supervisor_id}
                            style={{
                              ...styles.assignButton,
                              opacity: (!selectedSupervisor[candidate.id] || selectedSupervisor[candidate.id] === candidate.supervisor_id) ? 0.5 : 1,
                              cursor: (!selectedSupervisor[candidate.id] || selectedSupervisor[candidate.id] === candidate.supervisor_id) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
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
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  container: {
    width: '90vw',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #0A1929',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#0A1929',
      color: 'white'
    }
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '24px',
    fontWeight: 600
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '32px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0A1929'
  },
  filterBar: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchBox: {
    flex: 2,
    minWidth: '250px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 16px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    ':focus': {
      borderColor: '#0A1929'
    }
  },
  filterGroup: {
    flex: 1,
    minWidth: '200px'
  },
  filterSelect: {
    width: '100%',
    padding: '10px 16px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer'
  },
  bulkActions: {
    background: '#F0F9F0',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    flexWrap: 'wrap',
    border: '1px solid #C6F6D5'
  },
  bulkLabel: {
    fontWeight: 600,
    color: '#0A5C2E'
  },
  bulkSelect: {
    padding: '8px 16px',
    border: '2px solid #C6F6D5',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '250px',
    background: 'white'
  },
  bulkButton: {
    padding: '8px 20px',
    background: '#0A5C2E',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#0A1929'
    }
  },
  tableContainer: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #0A1929',
    background: '#F8FAFC'
  },
  tableHead: {
    padding: '15px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background 0.2s ease',
    ':hover': {
      background: '#F8FAFC'
    }
  },
  tableCell: {
    padding: '15px'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  candidateAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    background: '#0A1929',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 600
  },
  candidateName: {
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '4px'
  },
  candidateId: {
    fontSize: '11px',
    color: '#718096',
    fontFamily: 'monospace'
  },
  candidateEmail: {
    fontSize: '14px',
    color: '#0A1929',
    marginBottom: '4px'
  },
  candidatePhone: {
    fontSize: '12px',
    color: '#718096'
  },
  assignedBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  assignedName: {
    fontWeight: 600,
    color: '#0A1929',
    fontSize: '14px'
  },
  assignedEmail: {
    fontSize: '12px',
    color: '#718096'
  },
  unassignedBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#FEF2F2',
    color: '#B91C1C',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600
  },
  assignSelect: {
    width: '100%',
    padding: '8px 12px',
    border: '2px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '13px',
    background: 'white',
    cursor: 'pointer'
  },
  assignButton: {
    padding: '8px 16px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#45a049'
    }
  }
};
