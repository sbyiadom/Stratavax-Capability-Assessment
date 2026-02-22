// pages/admin/index.js
import { useEffect, useState } from "react";
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
    totalAssessments: 0
  });

  useEffect(() => {
    checkAdminAuth();
    fetchStats();
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
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/supervisor-login');
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

      setStats({
        totalSupervisors: supervisorCount || 0,
        totalCandidates: candidateCount || 0,
        totalAssessments: assessmentCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>System Administration & Configuration</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>

        {/* Stats Overview */}
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
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>←</span>
              <div>
                <h3 style={styles.actionTitle}>Back to Supervisor</h3>
                <p style={styles.actionDesc}>Return to supervisor dashboard</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/add-supervisor" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>➕</span>
              <div>
                <h3 style={styles.actionTitle}>Add Supervisor</h3>
                <p style={styles.actionDesc}>Create new supervisor accounts with dashboard access</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/manage-supervisors" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>👥</span>
              <div>
                <h3 style={styles.actionTitle}>Manage Supervisors</h3>
                <p style={styles.actionDesc}>View, activate, or remove existing supervisors</p>
              </div>
            </a>
          </Link>

          {/* NEW: Assign Candidates to Supervisors */}
          <Link href="/admin/assign-candidates" legacyBehavior>
            <a style={{...styles.actionCard, borderLeft: '4px solid #4CAF50'}}>
              <span style={styles.actionIcon}>📋</span>
              <div>
                <h3 style={styles.actionTitle}>Assign Candidates</h3>
                <p style={styles.actionDesc}>Assign candidates to specific supervisors for management</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/system-settings" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>⚙️</span>
              <div>
                <h3 style={styles.actionTitle}>System Settings</h3>
                <p style={styles.actionDesc}>Configure assessment parameters and system options</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/audit-logs" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>📊</span>
              <div>
                <h3 style={styles.actionTitle}>Audit Logs</h3>
                <p style={styles.actionDesc}>View system activity and user actions</p>
              </div>
            </a>
          </Link>
        </div>

        {/* Quick Tips */}
        <div style={styles.tipsSection}>
          <h3 style={styles.tipsTitle}>💡 Quick Tips</h3>
          <div style={styles.tipsGrid}>
            <div style={styles.tipCard}>
              <strong>Assign Candidates:</strong> Go to "Assign Candidates" to link candidates with their supervisors
            </div>
            <div style={styles.tipCard}>
              <strong>New Supervisors:</strong> Use "Add Supervisor" to create accounts for team leads
            </div>
            <div style={styles.tipCard}>
              <strong>Monitor Activity:</strong> Check "Audit Logs" to track system usage
            </div>
          </div>
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
    fontWeight: 600,
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#D32F2F',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
    }
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '40px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '5px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  actionCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      borderColor: '#0A1929'
    }
  },
  actionIcon: {
    fontSize: '32px'
  },
  actionTitle: {
    margin: '0 0 5px 0',
    color: '#0A1929',
    fontSize: '18px',
    fontWeight: 600
  },
  actionDesc: {
    margin: 0,
    color: '#718096',
    fontSize: '13px',
    lineHeight: '1.5'
  },
  tipsSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  tipsTitle: {
    margin: '0 0 20px 0',
    color: '#0A1929',
    fontSize: '18px',
    fontWeight: 600
  },
  tipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  tipCard: {
    padding: '15px',
    background: '#F8FAFC',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#4A5568',
    lineHeight: '1.6'
  }
};
