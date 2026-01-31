// pages/supervisor/index.js - API INTEGRATION VERSION
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
    totalResponses: 0,
    uniqueRespondents: 0
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateResponses, setCandidateResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [apiStatus, setApiStatus] = useState("loading"); // loading, success, error

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
      
      // Load candidates and stats via API
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

  // Load candidates via API
  const loadCandidates = async () => {
    try {
      console.log("=== LOADING CANDIDATES VIA API ===");
      setApiStatus("loading");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error("No session found");
        setCandidates([]);
        setApiStatus("error");
        return;
      }

      // Call our API endpoint
      const response = await fetch('/api/supervisor/candidates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error ${response.status}:`, errorText);
        
        if (response.status === 403) {
          console.error("Permission denied. Check service role key and supervisor role.");
        }
        
        // Fallback to direct database query (without user details)
        await loadCandidatesFallback();
        setApiStatus("error");
        return;
      }

      const data = await response.json();
      console.log("API response received:", data);
      
      if (data.candidates) {
        setCandidates(data.candidates);
        console.log(`Loaded ${data.candidates.length} candidates`);
        
        // Update stats from API response if available
        if (data.statistics) {
          setStats(prev => ({
            ...prev,
            totalCandidates: data.statistics.totalCandidates,
            completedAssessments: data.statistics.usersWithResponses,
            pendingAssessments: Math.max(0, data.statistics.totalCandidates - data.statistics.usersWithResponses),
            averageScore: data.statistics.averageScore,
            totalResponses: data.statistics.totalResponses,
            uniqueRespondents: data.statistics.usersWithResponses
          }));
        }
        setApiStatus("success");
      } else {
        setCandidates([]);
        setApiStatus("success");
        console.log("No candidates returned from API");
      }

    } catch (error) {
      console.error("Error loading candidates:", error);
      // Try fallback
      await loadCandidatesFallback();
      setApiStatus("error");
    }
  };

  // Fallback method when API fails
  const loadCandidatesFallback = async () => {
    try {
      console.log("=== USING FALLBACK METHOD ===");
      
      // Get users from responses table (only IDs, no user details)
      const { data: responses, error } = await supabase
        .from('responses')
        .select('user_id, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching responses:", error);
        setCandidates([]);
        return;
      }

      if (!responses || responses.length === 0) {
        console.log("No responses found in fallback");
        setCandidates([]);
        return;
      }

      // Group by user_id to get unique candidates
      const uniqueCandidates = {};
      responses.forEach(response => {
        if (!uniqueCandidates[response.user_id]) {
          uniqueCandidates[response.user_id] = {
            id: response.user_id,
            email: `user_${response.user_id.substring(0, 8)}@example.com`, // Anonymous
            name: `Candidate ${Object.keys(uniqueCandidates).length + 1}`,
            created_at: response.created_at,
            last_sign_in: response.created_at,
            status: 'completed',
            response_count: 0
          };
        }
        uniqueCandidates[response.user_id].response_count++;
      });

      const candidates = Object.values(uniqueCandidates);
      console.log("Found candidates from responses (anonymous):", candidates.length);
      
      setCandidates(candidates);

    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      setCandidates([]);
    }
  };

  // Load statistics via API
  const loadStats = async () => {
    try {
      console.log("=== LOADING STATS VIA API ===");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      // Call statistics API
      const response = await fetch('/api/supervisor/statistics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          totalResponses: data.totalResponses,
          completedAssessments: data.completedAssessments,
          averageScore: data.averageScore,
          uniqueRespondents: data.uniqueRespondents
        }));
        console.log("Stats loaded via API:", data);
      } else {
        // Fallback to direct database query
        await loadStatsFallback();
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      await loadStatsFallback();
    }
  };

  // Fallback statistics loading
  const loadStatsFallback = async () => {
    try {
      console.log("=== LOADING STATS FALLBACK ===");
      
      // Get response counts
      const { count: totalResponses } = await supabase
        .from("responses")
        .select("*", { count: 'exact', head: true });

      // Get unique users from responses
      const { data: userResponses } = await supabase
        .from("responses")
        .select("user_id")
        .not("user_id", "is", null);

      const uniqueRespondents = new Set(userResponses?.map(r => r.user_id) || []);
      
      // Calculate average score from responses
      let averageScore = 0;
      if (totalResponses > 0) {
        const { data: allResponses } = await supabase
          .from("responses")
          .select(`
            answers (
              score
            )
          `)
          .limit(1000);
        
        if (allResponses && allResponses.length > 0) {
          let totalScore = 0;
          let validResponses = 0;
          
          allResponses.forEach(response => {
            if (response.answers && response.answers.length > 0) {
              totalScore += response.answers[0]?.score || 0;
              validResponses++;
            }
          });
          
          if (validResponses > 0) {
            averageScore = Math.round((totalScore / (validResponses * 10)) * 100);
          }
        }
      }

      // Update stats
      setStats(prev => ({
        ...prev,
        totalResponses: totalResponses || 0,
        completedAssessments: uniqueRespondents.size,
        averageScore: averageScore,
        uniqueRespondents: uniqueRespondents.size
      }));

      console.log("Fallback stats loaded");

    } catch (error) {
      console.error("Error in stats fallback:", error);
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

      if (error) {
        console.error("Error loading responses:", error);
        setCandidateResponses([]);
      } else {
        console.log("Loaded responses for candidate:", candidateId, "Count:", responses?.length || 0);
        setCandidateResponses(responses || []);
      }
      
      // Find the candidate details
      const candidate = candidates.find(c => c.id === candidateId);
      setSelectedCandidate(candidate);

    } catch (error) {
      console.error("Error loading responses:", error);
      setCandidateResponses([]);
      
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
    } else {
      alert("No responses to export");
    }
  };

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Refresh all data
  const handleRefresh = async () => {
    console.log("Manually refreshing data...");
    setApiStatus("loading");
    await loadCandidates();
    await loadStats();
  };

  // Update total candidates count when candidates change
  useEffect(() => {
    if (candidates.length >= 0) {
      setStats(prev => ({
        ...prev,
        totalCandidates: candidates.length,
        pendingAssessments: Math.max(0, candidates.length - prev.completedAssessments)
      }));
    }
  }, [candidates]);

  // Debug: Log when candidates or stats change
  useEffect(() => {
    console.log("Candidates updated:", candidates.length, "items");
    console.log("Stats updated:", stats);
  }, [candidates, stats]);

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
            
            {/* API Status Indicator */}
            <div style={{
              marginTop: "10px",
              fontSize: "12px",
              color: "#666",
              background: apiStatus === "success" ? "#d1fae5" : 
                         apiStatus === "error" ? "#fee2e2" : "#e0f2fe",
              padding: "6px 12px",
              borderRadius: "6px",
              border: `1px solid ${apiStatus === "success" ? "#a7f3d0" : 
                       apiStatus === "error" ? "#fecaca" : "#bae6fd"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: apiStatus === "success" ? "#10b981" : 
                           apiStatus === "error" ? "#ef4444" : "#3b82f6",
                animation: apiStatus === "loading" ? "pulse 1.5s infinite" : "none"
              }} />
              <span>
                {apiStatus === "success" ? "API Connected" :
                 apiStatus === "error" ? "API Error - Using fallback" :
                 "Connecting to API..."}
              </span>
              <style jsx>{`
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.5; }
                  100% { opacity: 1; }
                }
              `}</style>
            </div>
          </div>
          
          <div style={{
            display: "flex",
            gap: "10px",
            flexDirection: isMobile ? "row" : "row",
            width: isMobile ? "100%" : "auto"
          }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: isMobile ? "10px 15px" : "12px 20px",
                background: "#e8f5e9",
                color: "#2e7d32",
                border: "1px solid #a5d6a7",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: isMobile ? "14px" : "15px",
                flex: isMobile ? "1" : "none",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🔄 Refresh
            </button>
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

      {/* Stats Cards - Show REAL data */}
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
        {/* Left Column - REAL Candidates List */}
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
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}>
              <span>{candidates.length}</span>
              <span>total</span>
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
                <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#1a237e" }}>
                  No Candidates Found
                </div>
                <p style={{ fontSize: "14px", color: "#666", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>
                  {session?.user?.email 
                    ? `You are logged in as supervisor (${session.user.email}). 
                       Candidate data will appear here once users register and take assessments.`
                    : "Candidate data will appear here once users register and take assessments."}
                </p>
                <div style={{ 
                  marginTop: "20px", 
                  fontSize: "13px", 
                  color: "#666", 
                  padding: "12px", 
                  background: "#f8f9fa", 
                  borderRadius: "8px",
                  border: "1px solid #e9ecef"
                }}>
                  <div style={{ fontWeight: "600", marginBottom: "5px" }}>Current Stats:</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>Total Responses:</span>
                    <span>{stats.totalResponses}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>Unique Respondents:</span>
                    <span>{stats.uniqueRespondents}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>Avg Score:</span>
                    <span>{stats.averageScore}%</span>
                  </div>
                  {apiStatus === "error" && (
                    <div style={{ 
                      marginTop: "10px", 
                      padding: "8px", 
                      background: "#fff3e0", 
                      borderRadius: "4px",
                      border: "1px solid #ffcc80",
                      fontSize: "11px",
                      color: "#e65100"
                    }}>
                      ⚠️ API connection failed. Showing anonymous candidate data.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              candidates.map(candidate => {
                const isSelected = selectedCandidate?.id === candidate.id;
                const statusColor = candidate.status === "completed" ? "#10b981" :
                                   candidate.status === "in_progress" ? "#f59e0b" : "#6b7280";
                const isAnonymous = candidate.email.includes('@example.com');
                
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
                      {isAnonymous ? "?" : candidate.name.charAt(0).toUpperCase()}
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
                          {isAnonymous ? `Anonymous Candidate` : candidate.name}
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
                        <span style={{ 
                          fontStyle: isAnonymous ? "italic" : "normal",
                          color: isAnonymous ? "#999" : "#666"
                        }}>
                          {isAnonymous ? `ID: ${candidate.id.substring(0, 8)}...` : candidate.email}
                        </span>
                        <span style={{ fontSize: "11px" }}>
                          {candidate.last_sign_in ? 
                            new Date(candidate.last_sign_in).toLocaleDateString() : 
                            "No login"}
                        </span>
                      </div>
                      {isAnonymous && (
                        <div style={{
                          fontSize: "10px",
                          color: "#f59e0b",
                          marginTop: "2px"
                        }}>
                          ⚠️ Real name/email not available (API issue)
                        </div>
                      )}
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
                {candidates.length > 0 ? "Select a Candidate" : "No Candidates Available"}
              </div>
              <p style={{ fontSize: "14px", color: "#999", maxWidth: "400px", margin: "0 auto" }}>
                {candidates.length > 0 
                  ? "Click on a candidate from the list to view their assessment responses"
                  : "There are no candidates in the system. Users need to register and complete assessments."}
              </p>
              {candidates.length === 0 && stats.totalResponses > 0 && (
                <div style={{ 
                  marginTop: "20px", 
                  padding: "15px", 
                  background: "#fff3e0", 
                  borderRadius: "8px",
                  border: "1px solid #ffcc80"
                }}>
                  <div style={{ fontWeight: "600", color: "#e65100", marginBottom: "5px" }}>
                    ⚠️ Data Discrepancy Detected
                  </div>
                  <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                    The system shows {stats.totalResponses} responses from {stats.uniqueRespondents} user(s), 
                    but no candidates are listed. This might be due to permission issues or data inconsistencies.
                  </p>
                </div>
              )}
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
                      {selectedCandidate.email.includes('@example.com') ? "?" : selectedCandidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: isMobile ? "20px" : "24px",
                        fontWeight: "800",
                        color: "#1a237e",
                        margin: 0
                      }}>
                        {selectedCandidate.email.includes('@example.com') ? `Anonymous Candidate` : selectedCandidate.name}
                      </h3>
                      <p style={{
                        fontSize: "14px",
                        color: "#666",
                        margin: "4px 0 0 0",
                        fontStyle: selectedCandidate.email.includes('@example.com') ? "italic" : "normal"
                      }}>
                        {selectedCandidate.email.includes('@example.com') ? `ID: ${selectedCandidate.id.substring(0, 8)}...` : selectedCandidate.email}
                      </p>
                      {selectedCandidate.email.includes('@example.com') && (
                        <p style={{
                          fontSize: "11px",
                          color: "#f59e0b",
                          margin: "2px 0 0 0"
                        }}>
                          ⚠️ Real user details not available (Check API setup)
                        </p>
                      )}
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
                    No Assessment Responses Found
                  </div>
                  <p style={{ fontSize: "14px", color: "#999", maxWidth: "400px", margin: "0 auto" }}>
                    {selectedCandidate.email.includes('@example.com') 
                      ? `This anonymous candidate hasn't started or completed their assessment yet.`
                      : `${selectedCandidate.name} (${selectedCandidate.email}) hasn't started or completed their assessment yet.`}
                  </p>
                  <div style={{ 
                    marginTop: "20px", 
                    fontSize: "12px", 
                    color: "#666", 
                    padding: "10px", 
                    background: "white",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef"
                  }}>
                    <div style={{ fontWeight: "600", marginBottom: "5px" }}>Candidate Status:</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Status:</span>
                      <span>{selectedCandidate.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Last Login:</span>
                      <span>{selectedCandidate.last_sign_in ? new Date(selectedCandidate.last_sign_in).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>
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
          {session?.user?.email} • Role: Supervisor • 
          Candidates: {candidates.length} • 
          Responses: {stats.totalResponses} • 
          Avg Score: {stats.averageScore}% • 
          API: {apiStatus}
        </div>
        <div style={{ fontSize: "10px", color: "#ccc", marginTop: "5px" }}>
          {apiStatus === "error" 
            ? "⚠️ API connection failed. Real user emails/names not available. Check service role key setup."
            : "Open browser console (F12) for debug information"}
        </div>
      </div>
    </div>
  );
}
