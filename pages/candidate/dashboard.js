import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

export default function CandidateDashboard() {
  const { session, loading } = useRequireAuth();
  const [assessments, setAssessments] = useState([]);
  const [activeTab, setActiveTab] = useState("general");
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [completedAssessments, setCompletedAssessments] = useState([]);

  useEffect(() => {
    if (session?.user) {
      fetchAssessments();
      fetchCompletedAssessments();
    }
  }, [session]);

  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("is_active", true)
      .order("created_at");

    if (!error && data) {
      setAssessments(data);
    }
    setLoadingAssessments(false);
  };

  const fetchCompletedAssessments = async () => {
    const { data, error } = await supabase
      .from("assessment_results")
      .select("assessment_id, completed_at, overall_score")
      .eq("user_id", session.user.id)
      .eq("status", "completed");

    if (!error && data) {
      setCompletedAssessments(data);
    }
  };

  const isAssessmentCompleted = (assessmentId) => {
    return completedAssessments.some(a => a.assessment_id === assessmentId);
  };

  const getAssessmentScore = (assessmentId) => {
    const completed = completedAssessments.find(a => a.assessment_id === assessmentId);
    return completed?.overall_score || null;
  };

  // Group assessments by type
  const assessmentGroups = {
    general: assessments.filter(a => a.assessment_type === 'general'),
    behavioral: assessments.filter(a => a.assessment_type === 'behavioral'),
    cognitive: assessments.filter(a => a.assessment_type === 'cognitive'),
    cultural: assessments.filter(a => a.assessment_type === 'cultural'),
    manufacturing: assessments.filter(a => a.assessment_type === 'manufacturing')
  };

  // Tab configuration
  const tabs = [
    { id: 'general', label: '📋 General Assessment', description: 'Comprehensive 5-area evaluation' },
    { id: 'behavioral', label: '🧠 Behavioral & Soft Skills', description: 'Communication, teamwork, EQ' },
    { id: 'cognitive', label: '💡 Cognitive & Thinking Skills', description: 'Problem-solving, critical thinking' },
    { id: 'cultural', label: '🤝 Cultural & Attitudinal Fit', description: 'Values alignment, work ethic' },
    { id: 'manufacturing', label: '⚙️ Manufacturing Technical Skills', description: 'Blowing machines, Labeler, Filling, Conveyors, Stretchwrappers, Date coders' }
  ];

  if (loading) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;
  if (!session) return null;

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={{
        minHeight: "100vh",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{
          width: "90%",
          maxWidth: "1200px",
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 16,
          padding: "30px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
        }}>
          
          {/* Header */}
          <div style={{ marginBottom: "30px" }}>
            <h1 style={{ 
              margin: "0 0 10px 0", 
              color: "#1565c0",
              fontSize: "32px"
            }}>
              Welcome, {session.user.email}
            </h1>
            <p style={{ 
              color: "#666", 
              fontSize: "16px",
              margin: 0
            }}>
              Select an assessment to begin or continue
            </p>
          </div>

          {/* Tabs Navigation */}
          <div style={{
            display: "flex",
            gap: "10px",
            borderBottom: "2px solid #e0e0e0",
            paddingBottom: "10px",
            marginBottom: "30px",
            overflowX: "auto",
            flexWrap: "wrap"
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 24px",
                  background: activeTab === tab.id ? "#1565c0" : "transparent",
                  color: activeTab === tab.id ? "white" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.id ? "bold" : "normal",
                  transition: "all 0.3s",
                  fontSize: "15px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span style={{ fontSize: "16px" }}>{tab.label}</span>
                <span style={{ 
                  fontSize: "12px", 
                  opacity: activeTab === tab.id ? 0.9 : 0.7 
                }}>
                  {tab.description}
                </span>
              </button>
            ))}
          </div>

          {/* Assessment Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px"
          }}>
            {loadingAssessments ? (
              <p>Loading assessments...</p>
            ) : assessmentGroups[activeTab]?.length > 0 ? (
              assessmentGroups[activeTab].map(assessment => {
                const completed = isAssessmentCompleted(assessment.id);
                const score = getAssessmentScore(assessment.id);
                
                return (
                  <div
                    key={assessment.id}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "12px",
                      padding: "24px",
                      backgroundColor: completed ? "#f1f8e9" : "white",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: completed ? "default" : "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      ...(!completed && {
                        hover: {
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 20px rgba(21,101,192,0.15)"
                        }
                      })
                    }}
                    onClick={() => {
                      if (!completed) {
                        router.push(`/assessment/${assessment.id}`);
                      }
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3 style={{ 
                        margin: "0 0 12px 0", 
                        color: completed ? "#2e7d32" : "#1565c0",
                        fontSize: "20px"
                      }}>
                        {assessment.name}
                        {completed && " ✅"}
                      </h3>
                      {assessment.icon_name && (
                        <span style={{ fontSize: "24px" }}>{assessment.icon_name}</span>
                      )}
                    </div>
                    
                    <p style={{ 
                      color: "#666", 
                      marginBottom: "16px",
                      fontSize: "14px",
                      lineHeight: "1.5"
                    }}>
                      {assessment.category_description || assessment.description}
                    </p>
                    
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "16px",
                      fontSize: "13px",
                      color: "#555"
                    }}>
                      <span>⏱️ {assessment.duration_minutes} mins</span>
                      <span>📝 {assessment.total_questions} questions</span>
                      <span>🎯 Pass: {assessment.passing_score}%</span>
                    </div>

                    {completed ? (
                      <div style={{
                        backgroundColor: "#2e7d32",
                        color: "white",
                        padding: "10px",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "14px"
                      }}>
                        Completed - Score: {score}%
                      </div>
                    ) : (
                      <Link href={`/assessment/${assessment.id}`} legacyBehavior>
                        <a style={{
                          display: "block",
                          backgroundColor: "#1565c0",
                          color: "white",
                          padding: "12px",
                          borderRadius: "6px",
                          textAlign: "center",
                          textDecoration: "none",
                          fontWeight: "bold",
                          fontSize: "14px",
                          transition: "background 0.3s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}>
                          Start Assessment
                        </a>
                      </Link>
                    )}
                  </div>
                );
              })
            ) : (
              <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#666", padding: "40px" }}>
                No assessments available in this category.
              </p>
            )}
          </div>

          {/* Footer with logout */}
          <div style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "1px solid #e0e0e0",
            textAlign: "center"
          }}>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              style={{
                background: "transparent",
                border: "1px solid #dc3545",
                color: "#dc3545",
                padding: "8px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold"
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
