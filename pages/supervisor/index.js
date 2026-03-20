import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  // Authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userRole = session.user?.user_metadata?.role;
          setCurrentSupervisor({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email,
            role: userRole || 'supervisor'
          });
        } else {
          const userSession = localStorage.getItem("userSession");
          if (userSession) {
            const sessionData = JSON.parse(userSession);
            setCurrentSupervisor({
              id: sessionData.user_id,
              email: sessionData.email,
              name: sessionData.full_name || sessionData.email,
              role: sessionData.role || 'supervisor'
            });
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch ALL candidates (for supervisors, show all)
  useEffect(() => {
    if (!currentSupervisor) return;

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        
        // Get ALL candidates - no filter by supervisor
        const { data: candidatesData, error } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, phone, created_at, supervisor_id')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Get assessment counts for each candidate
        const candidatesWithCounts = await Promise.all(
          (candidatesData || []).map(async (candidate) => {
            const { count: completedCount } = await supabase
              .from('assessment_results')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', candidate.id);
            
            const { count: totalCount } = await supabase
              .from('candidate_assessments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', candidate.id);
            
            return {
              ...candidate,
              completedCount: completedCount || 0,
              totalAssessments: totalCount || 0
            };
          })
        );
        
        setCandidates(candidatesWithCounts);
        
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCandidates();
  }, [currentSupervisor]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading candidates...</p>
      </div>
    );
  }

  if (!currentSupervisor) {
    return <div style={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.welcome}>Welcome, <strong>{currentSupervisor.name}</strong></p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} 
            style={styles.logoutButton}
          >
            Sign Out
          </button>
        </div>

        <div style={styles.statsCard}>
          <div style={styles.statIcon}>👥</div>
          <div>
            <div style={styles.statLabel}>Total Candidates</div>
            <div style={styles.statValue}>{candidates.length}</div>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <h2 style={styles.tableTitle}>All Candidates</h2>
          
          {candidates.length === 0 ? (
            <div style={styles.emptyState}>No candidates found</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assessments</th>
                    <th>Completed</th>
                    <th>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td>
                        <strong>{candidate.full_name || 'Unnamed'}</strong>
                        <div style={styles.candidateId}>{candidate.id.substring(0, 8)}...</div>
                      </td>
                      <td>{candidate.email}</td>
                      <td>{candidate.totalAssessments}</td>
                      <td>
                        <span style={styles.completedBadge}>{candidate.completedCount}</span>
                      </td>
                      <td>
                        <Link href={`/supervisor/${candidate.id}`} style={styles.viewButton}>
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
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
    animation: 'spin 1s linear infinite'
  },
  container: {
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px'
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '24px'
  },
  welcome: {
    margin: '5px 0 0 0',
    color: '#666'
  },
  logoutButton: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  statsCard: {
    background: 'linear-gradient(135deg, #0A1929, #1A2A3A)',
    padding: '25px',
    borderRadius: '16px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px'
  },
  statIcon: {
    fontSize: '40px'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.8
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold'
  },
  tableContainer: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px'
  },
  tableTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  candidateId: {
    fontSize: '11px',
    color: '#999',
    marginTop: '2px'
  },
  completedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    background: '#E8F5E9',
    color: '#2E7D32',
    fontSize: '13px',
    fontWeight: 500
  },
  viewButton: {
    display: 'inline-block',
    background: '#0A1929',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  }
};
