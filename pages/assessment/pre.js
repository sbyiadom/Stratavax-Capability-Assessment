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
          
          <p style={{ margin: "20px 0", fontSize: "16px", lineHeight: "1.6" }}>
            This professional assessment evaluates cognitive abilities, personality traits, 
            leadership potential, technical competence, and performance metrics.
          </p>
          
          {/* Key Information Box */}
          <div style={{
            background: "#f8f9fa",
            padding: "25px",
            borderRadius: "10px",
            margin: "25px 0",
            textAlign: "left",
            borderLeft: "4px solid #d32f2f"
          }}>
            <h3 style={{ color: "#d32f2f", marginBottom: "15px" }}>
              🚨 Important Assessment Rules
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "14px" }}>
              <div>
                <p style={{ fontWeight: "600", marginBottom: "8px" }}>✅ What You Can Do:</p>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>Take breaks (timer pauses)</li>
                  <li>Answer questions in any order</li>
                  <li>Change answers before submitting</li>
                  <li>Submit early if finished</li>
                </ul>
              </div>
              
              <div>
                <p style={{ fontWeight: "600", marginBottom: "8px" }}>❌ What You Cannot Do:</p>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>Retake after submission</li>
                  <li>Copy or cheat</li>
                  <li>Get extra time</li>
                  <li>Review answers after submission</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Timer and System Features */}
          <div style={{
            background: "rgba(33, 150, 243, 0.08)",
            padding: "20px",
            borderRadius: "10px",
            margin: "20px 0",
            fontSize: "14px"
          }}>
            <p style={{ fontWeight: "600", marginBottom: "10px", color: "#1565c0" }}>
              ⏰ Assessment System Features:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "#4caf50" }}>✓</span>
                <span>3-hour timer (pauses when logged off)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "#4caf50" }}>✓</span>
                <span>Auto-save answers</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "#4caf50" }}>✓</span>
                <span>Anti-cheat protection</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "#4caf50" }}>✓</span>
                <span>Randomized answers in some sections</span>
              </div>
            </div>
          </div>
          
          {/* Final Warning */}
          <div style={{
            background: "#fff8e1",
            padding: "15px",
            borderRadius: "8px",
            margin: "20px 0",
            fontSize: "14px",
            border: "1px solid #ffd54f"
          }}>
            <p style={{ fontWeight: "600", marginBottom: "5px" }}>
              ⚠️ One Attempt Only
            </p>
            <p style={{ margin: 0 }}>
              This is a <strong>one-time assessment</strong>. After submission, you will be immediately logged out 
              and cannot retake it. Your results will be automatically scored and sent to supervisors.
            </p>
          </div>
          
          {/* Start Button */}
          <div style={{ marginTop: "30px" }}>
            <p style={{ marginBottom: "15px", fontSize: "15px", color: "#555" }}>
              Please ensure you have a stable internet connection before starting.
            </p>
            
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
              By clicking "Start Assessment", you acknowledge and accept all assessment rules.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

