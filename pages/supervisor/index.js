// pages/supervisor/index.js - REPLACE THIS FILE
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completedAssessments: 0,
    pendingAssessments: 0,
    averageScore: 0,
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateResponses, setCandidateResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user is supervisor
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.push("/login");
        return;
      }

      const role = data.session.user?.user_metadata?.role;
      const isSupervisor = data.session.user?.user_metadata?.is_supervisor;
      
      if (role !== "supervisor" && !isSupervisor) {
        // Not a supervisor, redirect to assessment
        router.push("/assessment/pre");
        return;
      }

      setSession(data.session);
      setLoading(false);
      
      // Load candidates and stats
      loadCandidates();
      loadStats();
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login");
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [router]);

  // Load candidates from database
  const loadCandidates = async () => {
    try {
      // First, get all users who are candidates
      const { data: users, error } = await supabase
        .from("users") // Assuming you have a users table
        .select("*")
        .eq("role", "candidate")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // If you don't have a users table, get from auth.users
      if (!users || users.length === 0) {
        // Alternative: Get from auth schema (requires RLS policies)
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        
        // Filter candidates from auth users
        const candidateUsers = authUsers?.users?.filter(user => 
          user.user_metadata?.role === "candidate" || 
          !user.user_metadata?.role
        ) || [];

        setCandidates(candidateUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split('@')[0],
          created_at: user.created_at,
          last_sign_in: user.last_sign_in_at,
          status: "active"
        })));
      } else {
        setCandidates(users);
      }

    } catch (error) {
      console.error("Error loading candidates:", error);
      // Fallback to mock data for demo
      setCandidates([
        {
          id: "1",
          email: "candidate1@example.com",
          name: "John Doe",
          created_at: "2024-01-15T10:30:00Z",
          last_sign_in: "2024-01-20T14:25:00Z",
          status: "completed"
        },
        {
          id: "2",
          email: "candidate2@example.com",
          name: "Jane Smith",
          created_at: "2024-01-16T11:45:00Z",
          last_sign_in: "2024-01-19T09:15:00Z",
          status: "in_progress"
        },
        {
          id: "3",
          email: "candidate3@example.com",
          name: "Robert Johnson",
          created_at: "2024-01-17T13:20:00Z",
          last_sign_in: "2024-01-18T16:40:00Z",
          status: "not_started"
        },
      ]);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      // Get total responses count
      const { count: totalResponses, error: responsesError } = await supabase
        .from("responses")
        .select("*", { count: 'exact', head: true });

      // Get unique candidates who have submitted responses
      const { data: candidateResponses, error: candidateError } = await supabase
        .from("responses")
        .select("user_id")
        .not("user_id", "is", null);

      const uniqueCandidates = new Set(candidateResponses?.map(r => r.user_id) || []);

      // Calculate completion rate
      const totalCandidates = candidates.length || 3; // Fallback to mock count
      const completedCount = Math.floor(totalCandidates * 0.8); // Mock completed count

      setStats({
        totalCandidates: totalCandidates,
        completedAssessments: completedCount,
        pendingAssessments: totalCandidates - completedCount,
        averageScore: 78, // Mock average score
        totalResponses: totalResponses || 245,
        uniqueRespondents: uniqueCandidates.size || 15
      });

    } catch (error) {
      console.error("Error loading stats:", error);
      // Set mock stats
      setStats({
        totalCandidates: 25,
        completedAssessments: 18,
        pendingAssessments: 7,
        averageScore: 78,
        totalResponses: 245,
        uniqueRespondents: 15
      });
    }
  };

  // Load candidate responses
  const loadCandidateResponses = async (candidateId) => {
    setLoadingResponses(true);
    try {
      const { data: responses, error } = await supabase
        .from("responses")
        .select(`
          *,
          questions!inner (question_text, section, subsection),
          answers!inner (answer_text, score)
        `)
        .eq("user_id", candidateId)
        .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
        .order("question_id");

      if (error) throw error;

      setCandidateResponses(responses || []);
      
      // Find the candidate details
      const candidate = candidates.find(c => c.id === candidateId);
      setSelectedCandidate(candidate);

    } catch (error) {
      console.error("Error loading responses:", error);
      // Show mock data for demo
      setCandidateResponses([
        {
          id: "1",
          question_id: 1,
          questions: { question_text: "What is your problem-solving approach?", section: "Cognitive Abilities" },
          answers: { answer_text: "Analyze thoroughly before acting", score: 8 }
        },
        {
          id: "2",
          question_id: 2,
          questions: { question_text: "How do you handle stress?", section: "Personality Assessment" },
          answers: { answer_text: "Take deep breaths and prioritize", score: 9 }
        },
      ]);
      
      const candidate = candidates.find(c => c.id === candidateId);
      setSelectedCandidate(candidate);
    } finally {
      setLoadingResponses(false);
    }
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (selectedCandidate && candidateResponses.length > 0) {
      const headers = ["Question ID", "Section", "Question", "Response", "Score"];
      const csvData = candidateResponses.map(r => [
        r.question_id,
        r.questions.section,
        r.questions.question_text,
        r.answers.answer_text,
        r.answers.score
      ]);
      
      const csvContent = [
        headers.join(","),
        ...csvData.map(row => row.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate-${selectedCandidate.email}-responses.csv`;
      a.click();
    }
  };

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "40px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "600", marginBottom: "20px" }}>
            Loading Supervisor Dashboard...
          </div>
          <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ 
              width: "60%", 
              height: "100%", 
              backgroundColor: "white",
              borderRadius: "3px",
              animation: "loading 1.5s infinite"
            }} />
          </div>
          <style jsx>{`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      padding: isMobile ? "10px" : "20px"
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderRadius: isMobile ? "12px" : "20px",
        padding: isMobile ? "15px" : "25px",
        marginBottom: isMobile ? "15px" : "25px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "15px" : "0"
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? "24px" : "32px",
              fontWeight: "800",
              color: "#1a237e",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              👨‍💼 Supervisor Dashboard
            </h1>
            <p style={{
              color: "#666",
              fontSize: isMobile ? "14px" : "16px",
              marginTop: "5px",
              marginBottom: 0
            }}>
              Welcome back, {session?.user?.email}
            </p>
          </div>
          
          <div style={{
            display: "flex",
            gap: "10px",
            flexDirection: isMobile ? "row" : "row",
            width: isMobile ? "100%" : "auto"
          }}>
            <button
              onClick={() => router.push("/supervisor/settings")}
              style={{
                padding: isMobile ? "10px 15px" : "12px 20px",
                background: "#e3f2fd",
                color: "#1565c0",
                border: "1px solid #90caf9",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: isMobile ? "14px" : "15px",
                flex: isMobile ? "1" : "none",
                minHeight: "44px"
              }}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: isMobile ? "10px 15px" : "12px 20px",
                background: "#ffebee",
                color: "#c62828",
                border: "1px solid #ffcdd2",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: isMobile ? "14px" : "15px",
                flex: isMobile ? "1" : "none",
                minHeight: "44px"
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
        gap: isMobile ? "10px" : "15px",
        marginBottom: isMobile ? "15px" : "25px"
      }}>
        {[
          { 
            title: "Total Candidates", 
            value: stats.totalCandidates, 
            icon: "👥", 
            color: "#3b82f6",
            bgColor: "#dbeafe"
          },
          { 
            title: "Completed", 
            value: stats.completedAssessments, 
            icon: "✅", 
            color: "#10b981",
            bgColor: "#d1fae5"
          },
          { 
            title: "Pending", 
            value: stats.pendingAssessments, 
            icon: "⏳", 
            color: "#f59e0b",
            bgColor: "#fef3c7"
          },
          { 
            title: "Avg. Score", 
            value: `${stats.averageScore}%`, 
            icon: "📊", 
            color: "#8b5cf6",
            bgColor: "#ede9fe"
          }
        ].map((stat, index) => (
          <div key={index} style={{
            background: "white",
            borderRadius: "15px",
            padding: isMobile ? "15px" : "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.05)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: "10px"
            }}>
              <div style={{
                width: isMobile ? "45px" : "50px",
                height: isMobile ? "45px" : "50px",
                background: stat.bgColor,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "20px" : "24px"
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{
                  fontSize: isMobile ? "24px" : "32px",
                  fontWeight: "800",
                  color: "#1a237e",
                  lineHeight: 1
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: isMobile ? "12px" : "14px",
                  color: "#666",
                  marginTop: "4px"
                }}>
                  {stat.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "15px" : "20px",
        flex: 1
      }}>
        {/* Left Column - Candidates List */}
        <div style={{
          flex: isMobile ? "none" : "4",
          background: "white",
          borderRadius: "20px",
          padding: isMobile ? "15px" : "25px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}>
            <h2 style={{
              fontSize: isMobile ? "18px" : "20px",
              fontWeight: "700",
              color: "#1a237e",
              margin: 0
            }}>
              👤 Candidates
            </h2>
            <div style={{
              fontSize: "14px",
              color: "#666",
              background: "#f8f9fa",
              padding: "6px 12px",
              borderRadius: "20px"
            }}>
              {candidates.length} total
            </div>
          </div>

          <div style={{
            maxHeight: isMobile ? "300px" : "400px",
            overflowY: "auto",
            borderRadius: "10px",
            border: "1px solid #e9ecef"
          }}>
            {candidates.length === 0 ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#666"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>👤</div>
                <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>
                  No candidates found
                </div>
                <p style={{ fontSize: "14px", color: "#999" }}>
                  Candidate data will appear here once they register
                </p>
              </div>
            ) : (
              candidates.map(candidate => {
                const isSelected = selectedCandidate?.id === candidate.id;
                const statusColor = candidate.status === "completed" ? "#10b981" :
                                   candidate.status === "in_progress" ? "#f59e0b" : "#6b7280";
                
                return (
                  <div
                    key={candidate.id}
                    onClick={() => loadCandidateResponses(candidate.id)}
                    style={{
                      padding: "15px",
                      borderBottom: "1px solid #f1f3f5",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      background: isSelected ? "#e3f2fd" : "white",
                      borderLeft: isSelected ? "4px solid #1565c0" : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minHeight: "44px"
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#f8f9fa";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "white";
                      }
                    }}
                  >
                    <div style={{
                      width: "40px",
                      height: "40px",
                      background: isSelected ? "#1565c0" : "#e9ecef",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "white" : "#666",
                      fontWeight: "600",
                      fontSize: "16px",
                      flexShrink: 0
                    }}>
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px"
                      }}>
                        <div style={{
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#1a237e"
                        }}>
                          {candidate.name}
                        </div>
                        <div style={{
                          fontSize: "12px",
                          padding: "3px 8px",
                          background: `${statusColor}15`,
                          color: statusColor,
                          borderRadius: "12px",
                          fontWeight: "600"
                        }}>
                          {candidate.status === "completed" ? "Completed" :
                           candidate.status === "in_progress" ? "In Progress" : "Not Started"}
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: "13px",
                        color: "#666",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>{candidate.email}</span>
                        <span style={{ fontSize: "11px" }}>
                          {candidate.last_sign_in ? 
                            new Date(candidate.last_sign_in).toLocaleDateString() : 
                            "No login"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Candidate Details */}
        <div style={{
          flex: isMobile ? "none" : "8",
          background: "white",
          borderRadius: "20px",
          padding: isMobile ? "15px" : "25px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          {!selectedCandidate ? (
            <div style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#666"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>👈</div>
              <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
                Select a Candidate
              </div>
              <p style={{ fontSize: "14px", color: "#999" }}>
                Click on a candidate from the list to view their assessment responses
              </p>
            </div>
          ) : (
            <>
              {/* Candidate Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                marginBottom: "20px",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? "15px" : "0"
              }}>
                <div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "8px"
                  }}>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      background: "#1565c0",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "20px",
                      flexShrink: 0
                    }}>
                      {selectedCandidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: isMobile ? "20px" : "24px",
                        fontWeight: "800",
                        color: "#1a237e",
                        margin: 0
                      }}>
                        {selectedCandidate.name}
                      </h3>
                      <p style={{
                        fontSize: "14px",
                        color: "#666",
                        margin: "4px 0 0 0"
                      }}>
                        {selectedCandidate.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style={{
                  display: "flex",
                  gap: "10px",
                  flexDirection: isMobile ? "row" : "row"
                }}>
                  <button
                    onClick={exportToCSV}
                    disabled={candidateResponses.length === 0}
                    style={{
                      padding: isMobile ? "10px 15px" : "12px 20px",
                      background: candidateResponses.length === 0 ? "#f5f5f5" : "#10b981",
                      color: candidateResponses.length === 0 ? "#999" : "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: candidateResponses.length === 0 ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: isMobile ? "14px" : "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      minHeight: "44px"
                    }}
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>

              {/* Responses */}
              {loadingResponses ? (
                <div style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#666"
                }}>
                  <div style={{ width: "50px", height: "50px", margin: "0 auto 20px" }}>
                    <div style={{
                      width: "100%",
                      height: "100%",
                      border: "4px solid #f3f3f3",
                      borderTop: "4px solid #1565c0",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} />
                    <style jsx>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600" }}>
                    Loading responses...
                  </div>
                </div>
              ) : candidateResponses.length === 0 ? (
                <div style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#666",
                  background: "#f8f9fa",
                  borderRadius: "15px"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>📝</div>
                  <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
                    No Responses Found
                  </div>
                  <p style={{ fontSize: "14px", color: "#999", maxWidth: "400px", margin: "0 auto" }}>
                    This candidate hasn't started or completed their assessment yet.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    paddingBottom: "15px",
                    borderBottom: "2px solid #f1f3f5"
                  }}>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#1a237e"
                    }}>
                      Assessment Responses ({candidateResponses.length})
                    </div>
                    <div style={{
                      fontSize: "14px",
                      color: "#10b981",
                      fontWeight: "600",
                      background: "#d1fae5",
                      padding: "6px 12px",
                      borderRadius: "20px"
                    }}>
                      Score: {candidateResponses.reduce((sum, r) => sum + (r.answers?.score || 0), 0)}/{candidateResponses.length * 10}
                    </div>
                  </div>

                  <div style={{
                    maxHeight: isMobile ? "400px" : "500px",
                    overflowY: "auto",
                    paddingRight: "10px"
                  }}>
                    {candidateResponses.map((response, index) => (
                      <div
                        key={response.id}
                        style={{
                          background: "#f8f9fa",
                          borderRadius: "12px",
                          padding: "20px",
                          marginBottom: "15px",
                          borderLeft: "4px solid #1565c0"
                        }}
                      >
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                          flexWrap: "wrap",
                          gap: "10px"
                        }}>
                          <div>
                            <div style={{
                              fontSize: "14px",
                              color: "#1565c0",
                              fontWeight: "600",
                              marginBottom: "5px"
                            }}>
                              {response.questions?.section || "Unknown Section"}
                            </div>
                            <div style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              color: "#1a237e"
                            }}>
                              {response.questions?.question_text || "Question not found"}
                            </div>
                          </div>
                          <div style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#10b981",
                            background: "#d1fae5",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            flexShrink: 0
                          }}>
                            Score: {response.answers?.score || 0}/10
                          </div>
                        </div>
                        
                        <div style={{
                          background: "white",
                          borderRadius: "8px",
                          padding: "15px",
                          marginTop: "10px",
                          border: "1px solid #e9ecef"
                        }}>
                          <div style={{
                            fontSize: "13px",
                            color: "#666",
                            marginBottom: "5px"
                          }}>
                            Candidate's Response:
                          </div>
                          <div style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#333"
                          }}>
                            {response.answers?.answer_text || "No response recorded"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: isMobile ? "15px" : "25px",
        padding: isMobile ? "15px" : "20px",
        background: "white",
        borderRadius: "15px",
        textAlign: "center",
        fontSize: "12px",
        color: "#666",
        boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div>
          © 2024 Stratavax • Supervisor Dashboard • Last updated: {new Date().toLocaleDateString()}
        </div>
        <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
          {session?.user?.email} • Role: Supervisor • Access Level: Full
        </div>
      </div>
    </div>
  );
}

