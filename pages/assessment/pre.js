import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function StartAssessmentPage() {
  const router = useRouter();

  const startAssessment = async () => {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    
    router.push("/assessment");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop&q=80)`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        maxWidth: "800px",
        width: "90%",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        padding: "50px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        textAlign: "center"
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 30px",
          fontSize: "36px"
        }}>
          🏢
        </div>
        
        <h1 style={{
          margin: "0 0 20px 0",
          fontSize: "42px",
          fontWeight: "800",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Stratavax Capability Assessment
        </h1>
        
        <p style={{
          fontSize: "18px",
          lineHeight: "1.6",
          color: "#555",
          marginBottom: "30px"
        }}>
          This comprehensive assessment consists of 100 questions across 5 key areas. 
          You will have 3 hours to complete it. Your answers are saved automatically.
        </p>
        
        <div style={{
          background: "#f8f9fa",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "40px",
          borderLeft: "5px solid #667eea"
        }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "20px" }}>
            Assessment Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Total Questions</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>100</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Time Limit</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>3 Hours</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Sections</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>5</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Auto-save</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>Yes</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "16px 32px",
              background: "#f5f5f5",
              color: "#333",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "all 0.2s",
              minWidth: "150px"
            }}
          >
            ← Back
          </button>
          <button
            onClick={startAssessment}
            style={{
              padding: "16px 32px",
              background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "700",
              transition: "all 0.2s",
              minWidth: "200px",
              boxShadow: "0 4px 20px rgba(76, 175, 80, 0.3)"
            }}
          >
            Start Assessment →
          </button>
        </div>
        
        <div style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #eee",
          fontSize: "14px",
          color: "#777"
        }}>
          <p style={{ margin: "5px 0" }}>
            <strong>Note:</strong> All answers are saved automatically. You can navigate between questions.
          </p>
          <p style={{ margin: "5px 0" }}>
            You must click "Submit Assessment" after completing all questions.
          </p>
        </div>
      </div>
    </div>
  );
}
