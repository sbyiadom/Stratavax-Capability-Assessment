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
        width: "90vw",
        maxWidth: "500px",
        margin: "auto",
        padding: "30px",
        backgroundColor: "rgba(255,255,255,0.98)",
        borderRadius: "12px",
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxHeight: "90vh",
        overflow: "auto"
      }}>
        <h1 style={{ 
          color: "#1a237e", 
          marginBottom: "15px",
          fontSize: "24px",
          lineHeight: "1.3"
        }}>
          Stratavax Capability Assessment
        </h1>
        
        <div style={{ 
          height: "2px", 
          width: "60px", 
          background: "#1565c0", 
          margin: "0 auto 20px" 
        }} />
        
        <div style={{ 
          textAlign: "left", 
          marginBottom: "25px",
          lineHeight: "1.5"
        }}>
          <div style={{ 
            background: "#f8f9fa", 
            padding: "15px", 
            borderRadius: "8px",
            border: "1px solid #e0e0e0"
          }}>
            <p style={{ 
              fontWeight: "600", 
              color: "#d32f2f",
              marginBottom: "8px",
              fontSize: "14px"
            }}>
              ⚠️ ONE ATTEMPT ONLY
            </p>
            <p style={{ 
              marginBottom: "15px",
              fontSize: "14px"
            }}>
              You have <strong>one opportunity</strong> to complete this assessment. Once submitted, you cannot retake it.
            </p>
            
            <p style={{ 
              fontWeight: "600", 
              marginBottom: "8px",
              fontSize: "14px",
              color: "#1565c0"
            }}>
              ⏰ Assessment Details
            </p>
            <ul style={{ 
              margin: "0 0 15px 18px", 
              padding: 0,
              listStyle: "none",
              fontSize: "13px"
            }}>
              <li style={{ marginBottom: "6px" }}>• 3-hour total time limit</li>
              <li style={{ marginBottom: "6px" }}>• Timer pauses when you log off</li>
              <li style={{ marginBottom: "6px" }}>• Auto-submits when time expires</li>
              <li style={{ marginBottom: "6px" }}>• Can take breaks (timer pauses)</li>
              <li style={{ marginBottom: "6px" }}>• Navigate freely between questions</li>
            </ul>
            
            <p style={{ 
              fontSize: "12px", 
              color: "#666",
              padding: "8px",
              background: "#fff3e0",
              borderRadius: "4px",
              border: "1px solid #ffb74d",
              marginBottom: "0"
            }}>
              <strong>Note:</strong> Anti-cheat measures are active.
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: "20px" }}>
          <Link href="/assessment/1">
            <a style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "12px 35px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "15px",
              display: "inline-block",
              transition: "all 0.3s",
              border: "none",
              cursor: "pointer",
              width: "100%",
              boxSizing: "border-box"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#0d47a1";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#1565c0";
            }}>
              Begin Assessment
            </a>
          </Link>
          <p style={{ 
            fontSize: "12px", 
            color: "#666", 
            marginTop: "10px",
            fontStyle: "italic"
          }}>
            By clicking "Begin Assessment", you confirm you understand the instructions.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

