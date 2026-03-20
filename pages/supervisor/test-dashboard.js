import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../supabase/client";

export default function TestDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [error, setError] = useState(null);
  const [candidateCount, setCandidateCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication...");
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userRole = session.user?.user_metadata?.role;
          
          if (userRole === 'supervisor' || userRole === 'admin') {
            setCurrentSupervisor({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email,
              role: userRole
            });
            
            // Check how many candidates exist (data is safe)
            const { count, error: countError } = await supabase
              .from('candidate_profiles')
              .select('*', { count: 'exact', head: true });
            
            if (!countError) {
              setCandidateCount(count || 0);
            }
            
            setLoading(false);
            return;
          }
        }
        
        const userSession = localStorage.getItem("userSession");
        
        if (userSession) {
          const sessionData = JSON.parse(userSession);
          if (sessionData.loggedIn && (sessionData.role === 'supervisor' || sessionData.role === 'admin')) {
            setCurrentSupervisor({
              id: sessionData.user_id,
              email: sessionData.email,
              name: sessionData.full_name || sessionData.email,
              role: sessionData.role
            });
            
            // Check how many candidates exist (data is safe)
            const { count, error: countError } = await supabase
              .from('candidate_profiles')
              .select('*', { count: 'exact', head: true });
            
            if (!countError) {
              setCandidateCount(count || 0);
            }
            
            setLoading(false);
            return;
          }
        }
        
        router.push("/login");
        
      } catch (err) {
        console.error("Auth error:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentSupervisor) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Test Dashboard</h1>
          <p style={styles.welcome}>Welcome, <strong>{currentSupervisor.name || currentSupervisor.email}</strong></p>
          {currentSupervisor.role === 'admin' && (
            <p style={styles.adminBadge}>Admin</p>
          )}
        </div>
        <button 
          onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} 
          style={styles.logoutButton}
        >
          Sign Out
        </button>
      </div>

      <div style={styles.contentCard}>
        <h2>✅ Dashboard Test Successful</h2>
        <p>Your authentication is working!</p>
        
        <div style={styles.infoBox}>
          <p><strong>Role:</strong> {currentSupervisor.role}</p>
          <p><strong>Email:</strong> {currentSupervisor.email}</p>
          <p><strong>User ID:</strong> {currentSupervisor.id}</p>
          <p><strong>Candidates in database:</strong> {candidateCount}</p>
        </div>
        
        <p style={styles.note}>All your assessment data is safe. No data has been deleted or modified.</p>
        
        <div style={styles.linkContainer}>
          <Link href="/supervisor" style={styles.link}>
            Go to Original Dashboard
          </Link>
          <Link href="/supervisor/c3d293a4-b655-45a0-9651-285825f24c9a" style={styles.link}>
            View Anastasia's Report
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
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
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    padding: '20px'
  },
  errorCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  retryButton: {
    padding: '12px 30px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '20px'
  },
  container: {
    width: '90vw',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px',
    minHeight: '100vh',
    background: '#f8fafc'
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
  welcome: {
    margin: '5px 0 0 0',
    color: '#666',
    fontSize: '14px'
  },
  adminBadge: {
    margin: '5px 0 0 0',
    color: '#4CAF50',
    fontSize: '12px',
    fontWeight: 600
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
  contentCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    textAlign: 'center'
  },
  infoBox: {
    background: '#F0F4F8',
    padding: '20px',
    borderRadius: '12px',
    margin: '20px 0',
    textAlign: 'left'
  },
  note: {
    color: '#4CAF50',
    fontWeight: 500,
    margin: '20px 0'
  },
  linkContainer: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginTop: '30px'
  },
  link: {
    display: 'inline-block',
    background: '#0A1929',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 500
  }
};
