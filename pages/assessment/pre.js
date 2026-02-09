import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";

export default function PreAssessmentPage() {
  const { session, loading } = useRequireAuth();

  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;
  if (!session) return null; // redirect handled in requireAuth

  return (
    <AppLayout>
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url('/images/preassessmentbg.jpg')",
        backgroundSize: "cover",  // Cover the entire screen
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>
        {/* Semi-transparent overlay for better readability */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.3)",  // Dark overlay
          backdropFilter: "blur(2px)"
        }} />
        
        {/* Transparent message card */}
        <div style={{
          width: "90%",
          maxWidth: "500px",
          padding: "30px",
          backgroundColor: "rgba(255, 255, 255, 0.85)",  // Semi-transparent white
          borderRadius: "12px",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(10px)",
          position: "relative",
          zIndex: 1
        }}>
          <h1 style={{ 
            color: "#1a237e", 
            marginBottom: "15px",
            fontSize: "26px",
            fontWeight: "700",
            textShadow: "0 1px 2px rgba(255,255,255,0.5)"
          }}>
            Stratavax Capability Assessment
          </h1>
          
          <div style={{ 
            height: "3px", 
            width: "80px", 
            background: "linear-gradient(to right, #1565c0, #2196f3)", 
            margin: "0 auto 25px",
            borderRadius: "2px"
          }} />
          
          <p style={{ 
            margin: "15px 0", 
            fontSize: "16px", 
            lineHeight: "1.6",
            color: "#333",
            fontWeight: "500"
          }}>
            This assessment measures cognitive abilities, personality traits, 
            leadership, technical competence, and performance potential.
          </p>
          
          {/* Warning section with slight transparency */}
          <div style={{ 
            background: "rgba(248, 249, 250, 0.7)", 
            padding: "20px", 
            borderRadius: "10px",
            margin: "25px 0",
            borderLeft: "4px solid #d32f2f",
            border: "1px solid rgba(211, 47, 47, 0.2)"
          }}>
            <p style={{ 
              fontWeight: "700", 
              color: "#d32f2f",
              marginBottom: "12px",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <span>⚠️</span> IMPORTANT: ONE ATTEMPT ONLY
            </p>
            <div style={{ 
              fontSize: "15px",
              lineHeight: "1.8",
              textAlign: "left",
              paddingLeft: "10px"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ marginRight: "8px" }}>•</span>
                <span>3-hour total time limit</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ marginRight: "8px" }}>•</span>
                <span>Timer pauses when you log off</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ marginRight: "8px" }}>•</span>
                <span>Can take breaks (timer pauses)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ marginRight: "8px" }}>•</span>
                <span>Auto-submits when time expires</span>
              </div>
            </div>
            <p style={{ 
              fontSize: "14px", 
              color: "#666", 
              marginTop: "15px",
              fontStyle: "italic",
              fontWeight: "500"
            }}>
              You cannot retake this assessment once submitted.
            </p>
          </div>
          
          {/* Internet requirement */}
          <p style={{ 
            margin: "20px 0", 
            fontWeight: "600",
            fontSize: "16px",
            color: "#333",
            background: "rgba(33, 150, 243, 0.1)",
            padding: "12px",
            borderRadius: "6px",
            borderLeft: "4px solid #2196f3"
          }}>
            ⚡ Please ensure you have a stable internet connection before starting.
          </p>
          
          {/* Start button */}
          <Link href="/assessment/1">
            <a style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "14px 40px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "16px",
              display: "inline-block",
              marginTop: "15px",
              marginBottom: "5px",
              transition: "all 0.3s",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(21, 101, 192, 0.3)"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#0d47a1";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 16px rgba(21, 101, 192, 0.4)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#1565c0";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 12px rgba(21, 101, 192, 0.3)";
            }}>
              Start Assessment
            </a>
          </Link>
          
          <p style={{ 
            fontSize: "13px", 
            color: "#666", 
            marginTop: "15px",
            fontStyle: "italic",
            opacity: "0.9"
          }}>
            By clicking above, you confirm you understand the instructions.
          </p>
        </div>

        {/* Remove scrollbars */}
        <style jsx global>{`
          body {
            overflow: hidden;
            margin: 0;
            padding: 0;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </AppLayout>
  );
}
