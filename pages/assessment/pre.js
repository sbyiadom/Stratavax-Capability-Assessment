import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";

export default function PreAssessmentPage() {
  const { session, loading } = useRequireAuth();

  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;
  if (!session) return null; // redirect handled in requireAuth

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px"
      }}>
        <div style={{
          width: "70vw",
          maxWidth: "850px",
          padding: 30,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 12,
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          <h1>Welcome to the Stratavax Capability Assessment</h1>
          <p style={{ margin: "20px 0" }}>
            This assessment will measure cognitive abilities, personality traits, leadership, technical competence, and performance potential.
            Please ensure you are in a quiet place and can complete it in one sitting.
          </p>
          <p style={{ margin: "20px 0", fontWeight: 600 }}>
            You will not be able to go back once the assessment starts. Take your time and answer honestly.
          </p>
          <Link href="/assessment/1"> {/* replace 1 with actual assessment id */}
            <a style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: "bold"
            }}>Start Assessment</a>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
