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
        backgroundSize: "contain",  // Changed from "cover" to "contain" to see full image
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",  // Keeps image fixed while scrolling
        backgroundColor: "#f8f9fa",  // Fallback color if image doesn't cover
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflow: "auto"  // Changed to auto to allow scrolling if needed
      }}>
        <div style={{
          width: "90%",
          maxWidth: "500px",
          maxHeight: "90vh",  // Limit height to 90% of viewport
          padding: "30px",
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: "12px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          overflow: "auto",  // Allow scrolling inside card if content is too long
          margin: "20px 0"  // Add vertical margin to see more background
        }}>
          <h1 style={{ 
            color: "#1a237e", 
            marginBottom: "20px",
            fontSize: "24px"
          }}>
            Stratavax Capability Assessment
          </h1>
          <div style={{ 
            height: "2px", 
            width: "60px", 
            background: "#1565c0", 
            margin: "0 auto 25px" 
          }} />
          
          <p style={{ margin: "15px 0", fontSize: "15px", lineHeight: "1.6" }}>
            This assessment measures cognitive abilities, personality traits, leadership, 
            technical competence, and performance potential.
          </p>
          
          <div style={{ 
            background: "#f8f9fa", 
            padding: "15px", 
            borderRadius: "8px",
            margin: "20px 0",
            borderLeft: "4px solid #1565c0"
          }}>
            <p style={{ 
              fontWeight: "600", 
              color: "#d32f2f",
              marginBottom: "10px",
              fontSize: "14px"
            }}>
              ⚠️ IMPORTANT: ONE ATTEMPT ONLY
            </p>
            <p style={{ margin: "8px 0", fontSize: "14px" }}>
              • 3-hour total time limit<br />
              • Timer pauses when you log off<br />
              • Can take breaks (timer pauses)<br />
              • Auto-submits when time expires
            </p>
            <p style={{ 
              fontSize: "13px", 
              color: "#666", 
              marginTop: "10px",
              fontStyle: "italic"
            }}>
              You cannot retake this assessment once submitted.
            </p>
          </div>
          
          <p style={{ 
            margin: "20px 0", 
            fontWeight: 600,
            fontSize: "15px",
            color: "#333"
          }}>
            Please ensure you have a stable internet connection before starting.
          </p>
          
          <Link href="/assessment/1">
            <a style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "12px 30px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "16px",
              display: "inline-block",
              marginTop: "10px",
              marginBottom: "10px",
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
        </div>

        {/* Remove global scrollbar hiding since we want to see full image */}
        <style jsx global>{`
          body {
            margin: 0;
            padding: 0;
          }
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          ::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}</style>
      </div>
    </AppLayout>
  );
}
