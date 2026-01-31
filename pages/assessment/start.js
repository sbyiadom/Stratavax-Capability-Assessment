import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

export default function AssessmentStartPage() {
  const router = useRouter();

  const startAssessment = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    
    router.push("/assessment/11111111-1111-1111-1111-111111111111");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "800px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "24px",
        padding: "50px 40px",
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
          fontSize: "38px",
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
          Complete 100 questions across 5 key competency areas.
          Time limit: 3 hours. Answers are saved automatically.
        </p>
        
        <div style={{
          background: "#f8f9fa",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "40px",
          borderLeft: "5px solid #667eea"
        }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "20px" }}>
            📋 Assessment Overview
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
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>5 Areas</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Auto-save</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>✅ Enabled</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/dashboard")}
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
            onMouseOver={(e) => e.target.style.background = "#e0e0e0"}
            onMouseOut={(e) => e.target.style.background = "#f5f5f5"}
          >
            ← Back to Dashboard
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
            onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            🚀 Start Assessment
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
            <strong>📝 Instructions:</strong> Answer all questions honestly. Use navigation to move between questions.
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>⏰ Time Management:</strong> Average 1.8 minutes per question. Monitor progress using the timer.
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>💾 Auto-save:</strong> Your answers are saved automatically as you progress.
          </p>
        </div>
      </div>
    </div>
  );
}
