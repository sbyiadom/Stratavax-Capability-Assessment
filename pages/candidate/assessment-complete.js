// pages/candidate/assessment-complete.js - WITH submit-bg.jpg

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
      {/* Background with gradient and image */}
      <div style={styles.backgroundWrapper}>
        <div style={styles.backgroundImage} />
        <div style={styles.backgroundOverlay} />
      </div>
      
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

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden"
  },
  backgroundWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url("/images/submit-bg.jpg")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "scale(1.05)"
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(10, 22, 40, 0.75) 0%, rgba(26, 35, 126, 0.7) 50%, rgba(13, 71, 161, 0.75) 100%)"
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(12px)",
    padding: "48px 40px",
    borderRadius: "20px",
    maxWidth: "520px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.15)",
    animation: "fadeInUp 0.6s ease-out"
  },
  successIcon: {
    width: "80px",
    height: "80px",
    background: "linear-gradient(135deg, #2e7d32, #43a047)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    fontSize: "40px",
    color: "white",
    boxShadow: "0 8px 32px rgba(46, 125, 50, 0.3)",
    animation: "scaleIn 0.6s ease-out 0.3s both"
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1a237e",
    marginBottom: "12px",
    letterSpacing: "-0.5px"
  },
  message: {
    fontSize: "16px",
    color: "#475569",
    lineHeight: "1.6",
    marginBottom: "16px"
  },
  noteBox: {
    background: "rgba(241, 245, 249, 0.9)",
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
