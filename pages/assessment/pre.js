import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";

export default function PreAssessmentPage() {
  const { session, loading } = useRequireAuth();

  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;
  if (!session) return null; // redirect handled in requireAuth

  return (
    <AppLayout background="/images/preassessment_bg.jpg">
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url('/images/preassessment_bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          borderRadius: "12px",
          padding: "35px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(5px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "auto",
          maxHeight: "85vh",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{ marginBottom: "25px" }}>
            <h1 style={{ 
              color: "#1a237e", 
              margin: "0 0 10px 0",
              fontSize: "26px",
              fontWeight: "700",
              lineHeight: "1.2"
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
          </div>
          
          {/* Content - Spaced longitudinally */}
          <div style={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            gap: "25px",
            marginBottom: "25px"
          }}>
            {/* Warning Section */}
            <div style={{ 
              background: "rgba(211, 47, 47, 0.08)", 
              padding: "18px",
              borderRadius: "8px",
              border: "1px solid rgba(211, 47, 47, 0.2)",
              textAlign: "left"
            }}>
              <p style={{ 
                fontWeight: "700", 
                color: "#d32f2f",
                margin: "0 0 8px 0",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>⚠️</span> ONE ATTEMPT ONLY
              </p>
              <p style={{ 
                margin: 0,
                fontSize: "14px",
                lineHeight: "1.5",
                color: "#333"
              }}>
                You have <strong>one opportunity</strong> to complete this assessment. Once submitted, you cannot retake it.
              </p>
            </div>
            
            {/* Details Section */}
            <div style={{ 
              background: "rgba(33, 150, 243, 0.05)", 
              padding: "18px",
              borderRadius: "8px",
              border: "1px solid rgba(33, 150, 243, 0.2)",
              textAlign: "left"
            }}>
              <p style={{ 
                fontWeight: "700", 
                margin: "0 0 12px 0",
                fontSize: "15px",
                color: "#1565c0",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>⏰</span> Assessment Details
              </p>
              <div style={{ 
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "13px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ 
                    width: "6px", 
                    height: "6px", 
                    backgroundColor: "#1565c0", 
                    borderRadius: "50%" 
                  }} />
                  <span>3-hour limit</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ 
                    width: "6px", 
                    height: "6px", 
                    backgroundColor: "#1565c0", 
                    borderRadius: "50%" 
                  }} />
                  <span>Timer pauses</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ 
                    width: "6px", 
                    height: "6px", 
                    backgroundColor: "#1565c0", 
                    borderRadius: "50%" 
                  }} />
                  <span>Auto-submit</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ 
                    width: "6px", 
                    height: "6px", 
                    backgroundColor: "#1565c0", 
                    borderRadius: "50%" 
                  }} />
                  <span>Take breaks</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ 
                    width: "6px", 
                    height: "6px", 
                    backgroundColor: "#1565c0", 
                    borderRadius: "50%" 
                  }} />
                  <span>Free navigation</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ 
                    width: "6px", 
                    height: "6px", 
                    backgroundColor: "#1565c0", 
                    borderRadius: "50%" 
                  }} />
                  <span>Anti-cheat</span>
                </div>
              </div>
            </div>
            
            {/* Note Section */}
            <div style={{ 
              background: "rgba(255, 152, 0, 0.05)", 
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 152, 0, 0.2)",
              textAlign: "center"
            }}>
              <p style={{ 
                margin: 0,
                fontSize: "13px",
                color: "#666",
                lineHeight: "1.5"
              }}>
                <strong>Note:</strong> Ensure a stable internet connection before starting.
              </p>
            </div>
          </div>
          
          {/* Button Section */}
          <div style={{ marginTop: "20px" }}>
            <Link href="/assessment/1">
              <a style={{
                backgroundColor: "#1565c0",
                color: "#fff",
                padding: "14px 40px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "15px",
                display: "block",
                transition: "all 0.3s",
                border: "none",
                cursor: "pointer",
                width: "100%",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#0d47a1";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 12px rgba(21, 101, 192, 0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#1565c0";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
              onMouseDown={(e) => {
                e.target.style.transform = "translateY(0)";
              }}>
                Begin Assessment
              </a>
            </Link>
            <p style={{ 
              fontSize: "12px", 
              color: "#666", 
              marginTop: "12px",
              fontStyle: "italic",
              opacity: "0.8"
            }}>
              By clicking above, you confirm you understand the instructions.
            </p>
          </div>
        </div>
      </div>
      
      {/* Hide scrollbar globally */}
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
    </AppLayout>
  );
}
