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
        minHeight: "70vh",
        padding: "20px"
      }}>
        <div style={{
          width: "70vw",
          maxWidth: "700px",
          padding: "40px 30px",
          backgroundColor: "rgba(255,255,255,0.97)",
          borderRadius: "12px",
          textAlign: "center",
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)"
        }}>
          <h1 style={{ color: "#1a237e", marginBottom: "25px" }}>
            Stratavax Capability Assessment
          </h1>
          
          <div style={{
            background: "#f8f9fa",
            padding: "25px",
            borderRadius: "10px",
            margin: "25px 0",
            borderLeft: "4px solid #d32f2f"
          }}>
            <p style={{ fontSize: "16px", lineHeight: "1.6", margin: 0 }}>
              This is a <strong>one-time-only assessment</strong> with a 3-hour timer that pauses when you log off. 
              You can take breaks, answer questions in any order, and change answers before submitting. 
              Anti-cheat measures are active, some answers are randomized, and the system auto-submits when time expires. 
              <strong> You cannot retake this assessment</strong> - after submission, you'll be logged out and your results 
              will be automatically scored and sent to supervisors. Ensure you have a stable internet connection before starting.
            </p>
          </div>
          
          <div style={{ marginTop: "30px" }}>
            <Link href="/assessment/1">
              <a style={{
                backgroundColor: "#1565c0",
                color: "#fff",
                padding: "12px 35px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "16px",
                display: "inline-block",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#0d47a1";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#1565c0";
                e.target.style.transform = "translateY(0)";
              }}>
                Start Assessment
              </a>
            </Link>
            
            <p style={{ 
              fontSize: "13px", 
              color: "#666", 
              marginTop: "15px",
              fontStyle: "italic"
            }}>
              By clicking "Start Assessment", you acknowledge and accept these terms.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

