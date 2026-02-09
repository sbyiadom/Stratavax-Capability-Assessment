import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";

export default function PreAssessmentPage() {
  const { session, loading } = useRequireAuth();

  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;
  if (!session) return null; // redirect handled in requireAuth

  return (
    <AppLayout background="/images/assessment-bg1.jpg">
      <div style={{
        width: "70vw",
        maxWidth: "600px",
        margin: "auto",
        padding: "40px 30px",
        backgroundColor: "rgba(255,255,255,0.98)",
        borderRadius: "16px",
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ 
          color: "#1a237e", 
          marginBottom: "10px",
          fontSize: "28px"
        }}>
          Stratavax Capability Assessment
        </h1>
        <div style={{ 
          height: "3px", 
          width: "80px", 
          background: "#1565c0", 
          margin: "0 auto 25px" 
        }} />
        
        <div style={{ 
          textAlign: "left", 
          marginBottom: "30px",
          lineHeight: "1.6"
        }}>
          <h3 style={{ color: "#1565c0", marginBottom: "15px" }}>
            Important Instructions
          </h3>
          
          <div style={{ 
            background: "#f8f9fa", 
            padding: "20px", 
            borderRadius: "10px",
            marginBottom: "20px",
            borderLeft: "4px solid #1565c0"
          }}>
            <p style={{ 
              fontWeight: "600", 
              color: "#d32f2f",
              marginBottom: "10px"
            }}>
              ⚠️ ONE ATTEMPT ONLY
            </p>
            <p style={{ marginBottom: "15px" }}>
              You have <strong>one opportunity</strong> to complete this assessment. Once submitted, you cannot retake it.
            </p>
            
            <p style={{ fontWeight: "600", marginBottom: "10px" }}>
              ⏰ Time Management
            </p>
            <ul style={{ 
              margin: "0 0 15px 20px", 
              padding: 0,
              listStyle: "none"
            }}>
              <li style={{ marginBottom: "8px" }}>• 3-hour total time limit</li>
              <li style={{ marginBottom: "8px" }}>• Timer pauses when you log off</li>
              <li style={{ marginBottom: "8px" }}>• Auto-submits when time expires</li>
            </ul>
            
            <p style={{ fontWeight: "600", marginBottom: "10px" }}>
              ✅ What You Can Do
            </p>
            <ul style={{ 
              margin: "0 0 15px 20px", 
              padding: 0,
              listStyle: "none"
            }}>
              <li style={{ marginBottom: "8px" }}>• Take breaks (timer pauses)</li>
              <li style={{ marginBottom: "8px" }}>• Navigate between questions</li>
              <li style={{ marginBottom: "8px" }}>• Change answers before submitting</li>
            </ul>
            
            <p style={{ 
              fontSize: "14px", 
              color: "#666",
              padding: "10px",
              background: "#fff3e0",
              borderRadius: "6px",
              border: "1px solid #ffb74d"
            }}>
              <strong>Note:</strong> Anti-cheat measures are active. Ensure a stable internet connection.
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: "30px" }}>
          <Link href="/assessment/1">
            <a style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "14px 40px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "16px",
              display: "inline-block",
              transition: "all 0.3s",
              border: "none",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#0d47a1";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#1565c0";
              e.target.style.transform = "translateY(0)";
            }}>
              Begin Assessment
            </a>
          </Link>
          <p style={{ 
            fontSize: "13px", 
            color: "#666", 
            marginTop: "15px",
            fontStyle: "italic"
          }}>
            By clicking "Begin Assessment", you confirm you understand the instructions.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
