// pages/candidate/assessment-complete.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

export default function AssessmentComplete() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDashboard = () => {
    router.push("/candidate/dashboard");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.successIcon}>✓</div>
        <h1 style={styles.title}>Assessment Submitted Successfully!</h1>
        <p style={styles.message}>
          Thank you for taking the time to complete the assessment.
          Your responses have been recorded successfully.
        </p>
        <div style={styles.noteBox}>
          <p style={styles.note}>
            🔒 Your results will be reviewed by your supervisor.
            You will be notified once the review is complete.
          </p>
        </div>
        <div style={styles.buttonGroup}>
          <button onClick={handleLogout} style={styles.primaryButton}>
            Log Off
          </button>
          <button onClick={handleDashboard} style={styles.secondaryButton}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f4f7fc 0%, #e8eaf6 100%)",
    padding: "20px"
  },
  card: {
    background: "white",
    padding: "48px 40px",
    borderRadius: "20px",
    maxWidth: "520px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
    border: "1px solid rgba(11, 42, 78, 0.08)"
  },
  successIcon: {
    width: "80px",
    height: "80px",
    background: "#2e7d32",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    fontSize: "40px",
    color: "white",
    boxShadow: "0 4px 12px rgba(46, 125, 50, 0.3)"
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "12px"
  },
  message: {
    fontSize: "16px",
    color: "#475569",
    lineHeight: "1.6",
    marginBottom: "16px"
  },
  noteBox: {
    background: "#f0f4ff",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "28px",
    borderLeft: "4px solid #f9b83a"
  },
  note: {
    fontSize: "14px",
    color: "#1b4a7a",
    margin: 0,
    lineHeight: "1.5"
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "12px 32px",
    background: "#0b2a4e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s ease",
    minWidth: "140px"
  },
  secondaryButton: {
    padding: "12px 32px",
    background: "white",
    color: "#0b2a4e",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s ease",
    minWidth: "140px"
  }
};
