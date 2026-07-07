// pages/candidate/results/[resultId].js

import { useRouter } from "next/router";
import ReportViewer from "../../../components/reports/ReportViewer";
import { useRequireAuth } from "../../../utils/requireAuth";

export default function CandidateResults() {
  const router = useRouter();
  const { resultId } = router.query;
  const { loading: authLoading } = useRequireAuth();

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading report...</p>
      </div>
    );
  }

  if (!resultId) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2>Result Not Found</h2>
        <p>No assessment result was specified.</p>

        <button
          onClick={() => router.push("/candidate/dashboard")}
          style={styles.errorButton}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <ReportViewer
      resultId={resultId}
      onBack={() => router.push("/candidate/dashboard")}
    />
  );
}

const styles = {
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    background: "#f8fafc"
  },

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #1a237e",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },

  errorContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background: "#f8fafc",
    padding: "20px"
  },

  errorIcon: {
    fontSize: "48px",
    marginBottom: "16px"
  },

  errorButton: {
    padding: "10px 24px",
    background: "#1a237e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "16px"
  }
};

if (typeof document !== "undefined") {
  const existingStyle = document.getElementById(
    "candidate-results-spin-keyframes"
  );

  if (!existingStyle) {
    const style = document.createElement("style");

    style.id = "candidate-results-spin-keyframes";

    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
  }
}
