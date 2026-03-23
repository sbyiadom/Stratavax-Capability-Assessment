import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0
  });
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      setLoading(true);
      
      const userSession = localStorage.getItem("userSession");
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (!userSession && !supabaseSession) {
        router.push("/login");
        return;
      }

      let userId = null;
      if (supabaseSession?.user?.id) {
        userId = supabaseSession.user.id;
      } else if (userSession) {
        try {
          const parsed = JSON.parse(userSession);
          userId = parsed.user_id;
        } catch (e) {
          console.error('Error parsing userSession:', e);
        }
      }
      
      if (!userId) {
        setAuthError('No user ID found');
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('supervisor_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error('Database error:', profileError);
        setAuthError(`Database error: ${profileError.message}`);
        router.push('/supervisor');
        return;
      }
      
      if (!profile || profile.role !== 'admin') {
        alert('Admin access required');
        router.push('/supervisor');
        return;
      }
      
      setIsAdmin(true);
      fetchStats();
      
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total supervisors
      const { count: supervisorCount } = await supabase
        .from('supervisor_profiles')
        .select('*', { count: 'exact', head: true });

      // Get total candidates
      const { count: candidateCount } = await supabase
        .from('candidate_profiles')
        .select('*', { count: 'exact', head: true });

      // Get total assessments
      const { count: assessmentCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });

      // Get completed assessments
      const { count: completedCount } = await supabase
        .from('assessment_results')
        .select('*', { count: 'exact', head: true });

      // Get unblocked and blocked assessments
      const { data: accessData } = await supabase
        .from('candidate_assessments')
        .select('status');

      const unblockedCount = accessData?.filter(a => a.status === 'unblocked').length || 0;
      const blockedCount = accessData?.filter(a => a.status === 'blocked').length || 0;

      setStats({
        totalSupervisors: supervisorCount || 0,
        totalCandidates: candidateCount || 0,
        totalAssessments: assessmentCount || 0,
        completedAssessments: completedCount || 0,
        unblockedAssessments: unblockedCount,
        blockedAssessments: blockedCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>Authentication Error</p>
        <p style={styles.errorDetail}>{authError}</p>
        <button onClick={() => router.push('/supervisor')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>System Administration & Configuration</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👑</div>
            <div>
              <div style={styles.statLabel}>Supervisors</div>
              <div style={styles.statValue}>{stats.totalSupervisors}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statLabel}>Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📋</div>
            <div>
              <div style={styles.statLabel}>Assessments</div>
              <div style={styles.statValue}>{stats.totalAssessments}</div>
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
            <div style={styles.statIcon}>🔓</div>
            <div>
              <div style={styles.statLabel}>Unblocked</div>
              <div style={styles.statValue}>{stats.unblockedAssessments}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🔒</div>
            <div>
              <div style={styles.statLabel}>Blocked</div>
              <div style={styles.statValue}>{stats.blockedAssessments}</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div style={styles.actionCardsGrid}>
          <Link href="/admin/add-supervisor" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>➕</span>
              <div>
                <h3 style={styles.actionCardTitle}>Add Supervisor</h3>
                <p style={styles.actionCardDesc}>Create new supervisor accounts with dashboard access</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/manage-supervisors" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>👥</span>
              <div>
                <h3 style={styles.actionCardTitle}>Manage Supervisors</h3>
                <p style={styles.actionCardDesc}>View, activate, or remove existing supervisors</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/manage-candidates" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>🎓</span>
              <div>
                <h3 style={styles.actionCardTitle}>Manage Candidates</h3>
                <p style={styles.actionCardDesc}>View all candidates, reset assessments, and reset passwords</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/assign-candidates" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>📋</span>
              <div>
                <h3 style={styles.actionCardTitle}>Assign Supervisors</h3>
                <p style={styles.actionCardDesc}>Assign candidates to specific supervisors</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/assign-assessments" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>📋</span>
              <div>
                <h3 style={styles.actionCardTitle}>Assign Assessments</h3>
                <p style={styles.actionCardDesc}>Assign, unblock, or block assessments for candidates</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/audit-logs" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>📊</span>
              <div>
                <h3 style={styles.actionCardTitle}>Audit Logs</h3>
                <p style={styles.actionCardDesc}>View system activity and user actions</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/system-settings" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>⚙️</span>
              <div>
                <h3 style={styles.actionCardTitle}>System Settings</h3>
                <p style={styles.actionCardDesc}>Configure assessment parameters and system options</p>
              </div>
            </a>
          </Link>
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
    color: 'white',
    padding: '20px',
    textAlign: 'center'
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
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  errorText: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  errorDetail: {
    fontSize: '14px',
    opacity: 0.8,
    marginBottom: '20px',
    maxWidth: '500px'
  },
  backButton: {
    padding: '12px 30px',
    background: 'white',
    color: '#0A1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  container: {
    width: '90vw',
    maxWidth: '1400px',
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
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '28px',
    fontWeight: 700
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#666',
    fontSize: '14px'
  },
  logoutButton: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '20px',
    marginBottom: '30px',
    '@media (max-width: 1200px)': {
      gridTemplateColumns: 'repeat(3, 1fr)'
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)'
    }
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '32px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0A1929'
  },
  actionCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  actionCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
    }
  },
  actionCardIcon: {
    fontSize: '32px'
  },
  actionCardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929'
  },
  actionCardDesc: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#718096'
  }
};
