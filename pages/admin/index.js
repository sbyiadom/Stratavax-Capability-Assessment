import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        
        if (supervisorSession) {
          try {
            const session = JSON.parse(supervisorSession);
            if (session.loggedIn && session.role === 'admin') {
              setIsAdmin(true);
            } else {
              router.push("/supervisor");
            }
          } catch (e) {
            router.push("/supervisor-login");
          }
        } else {
          router.push("/supervisor-login");
        }
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You don't have admin privileges.</p>
          <button onClick={() => router.push('/supervisor')} style={styles.button}>
            Go to Supervisor Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <button onClick={() => router.push('/supervisor')} style={styles.backButton}>
            ← Back to Supervisor
          </button>
        </div>
        
        <div style={styles.grid}>
          <Link href="/admin/add-supervisor" legacyBehavior>
            <a style={styles.card}>
              <div style={styles.cardIcon}>➕</div>
              <h3 style={styles.cardTitle}>Add Supervisor</h3>
              <p style={styles.cardDescription}>Create new supervisor accounts with dashboard access</p>
            </a>
          </Link>
          
          <Link href="/admin/manage-supervisors" legacyBehavior>
            <a style={styles.card}>
              <div style={styles.cardIcon}>👥</div>
              <h3 style={styles.cardTitle}>Manage Supervisors</h3>
              <p style={styles.cardDescription}>View, activate, or remove existing supervisors</p>
            </a>
          </Link>
          
          <Link href="/admin/settings" legacyBehavior>
            <a style={styles.card}>
              <div style={styles.cardIcon}>⚙️</div>
              <h3 style={styles.cardTitle}>System Settings</h3>
              <p style={styles.cardDescription}>Configure assessment parameters and system options</p>
            </a>
          </Link>
          
          <Link href="/admin/audit-logs" legacyBehavior>
            <a style={styles.card}>
              <div style={styles.cardIcon}>📋</div>
              <h3 style={styles.cardTitle}>Audit Logs</h3>
              <p style={styles.cardDescription}>View system activity and user actions</p>
            </a>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unauthorized: {
    textAlign: 'center',
    padding: '60px',
    color: '#666'
  },
  button: {
    padding: '10px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    animation: 'fadeIn 0.5s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  backButton: {
    padding: '10px 20px',
    background: '#f5f5f5',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#e0e0e0'
    }
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '25px'
  },
  card: {
    padding: '30px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    textDecoration: 'none',
    color: '#333',
    transition: 'all 0.3s ease',
    border: '1px solid #f0f0f0',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
      borderColor: '#1565c0'
    }
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 10px 0',
    color: '#1565c0'
  },
  cardDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
    margin: 0
  }
};
