import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    topTalent: 0,
    highPotential: 0,
    solidPerformer: 0,
    developing: 0,
    needsImprovement: 0
  });

  // Check supervisor authentication
  useEffect(() => {
    const checkSupervisorAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn) {
            setIsSupervisor(true);
          } else {
            router.push("/supervisor-login");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };

    checkSupervisorAuth();
  }, [router]);

  // Fetch candidates and stats - SIMPLIFIED AND FIXED VERSION
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching candidate data...");
        
        // OPTION 1: Get ALL users from auth.users (if using Supabase Auth)
        // This gets ALL registered users
        const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();
        
        let usersMap = {};
        
        if (!usersError && allUsers?.users) {
          allUsers.users.forEach(user => {
            usersMap[user.id] = {
              email: user.email || "",
              full_name: user.user_metadata?.full_name || 
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] ||
                        `User ${user.id.substring(0, 8)}`
            };
          });
        } else {
          console.log("Could not get users from auth, trying profiles table...");
          
          // OPTION 2: Get from profiles table
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, full_name");
            
          if (!profilesError && profilesData) {
            profilesData.forEach(profile => {
              usersMap[profile.id] = {
                email: profile.email || "",
                full_name: profile.full_name || profile.email?.split('@')[0] || `User ${profile.id.substring(0, 8)}`
              };
            });
          }
        }

        // Get all talent classification data
        const { data: talentData, error: talentError } = await supabase
          .from("talent_classification")
          .select(`
            user_id,
            total_score,
            classification,
            created_at,
            updated_at
          `)
          .order("total_score", { ascending: false });

        if (talentError) {
          console.error("Talent classification error:", talentError);
          throw talentError;
        }

        console.log("Talent data found:", talentData?.length || 0, "candidates");
        console.log("Users map size:", Object.keys(usersMap).length);

        // If no talent data, show empty dashboard
        if (!talentData || talentData.length === 0) {
          setCandidates([]);
          setStats({
            totalCandidates: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            topTalent: 0,
            highPotential: 0,
            solidPerformer: 0,
            developing: 0,
            needsImprovement: 0
          });
          setLoading(false);
          return;
        }

        // Combine talent data with user info
        const candidatesWithUsers = talentData.map(candidate => {
          const userInfo = usersMap[candidate.user_id];
          
          let email = "Not available";
          let full_name = `Candidate ${candidate.user_id.substring(0, 8)}`;
          
          if (userInfo) {
            if (userInfo.email) {
              email = userInfo.email;
            }
            if (userInfo.full_name) {
              full_name = userInfo.full_name;
            } else if (userInfo.email) {
              full_name = userInfo.email.split('@')[0];
            }
          } else {
            // Try to fetch individual user info if not in map
            console.log("User info not found in map for:", candidate.user_id);
          }

          return {
            ...candidate,
            user: {
              email: email,
              full_name: full_name,
              id: candidate.user_id
            }
          };
        });

        console.log("Processed candidates:", candidatesWithUsers.length);
        setCandidates(candidatesWithUsers);

        // Calculate statistics
        const statsData = {
          totalCandidates: talentData.length,
          completed: talentData.length,
          inProgress: 0,
          notStarted: 0,
          topTalent: talentData.filter(c => c.classification === 'Top Talent').length,
          highPotential: talentData.filter(c => c.classification === 'High Potential').length,
          solidPerformer: talentData.filter(c => c.classification === 'Solid Performer').length,
          developing: talentData.filter(c => c.classification === 'Developing').length,
          needsImprovement: talentData.filter(c => c.classification === 'Needs Improvement').length
        };
        setStats(statsData);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setCandidates([]);
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor]);

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  const handleViewReport = (userId) => {
    console.log("View report clicked for user:", userId);
    router.push(`/supervisor/candidate/${userId}`);
  };

  if (!isSupervisor) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <p style={{ textAlign: "center" }}>Checking authentication...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 30 
        }}>
          <div>
            <h1 style={{ margin: 0, color: "#1565c0", fontSize: "32px" }}>Supervisor Dashboard</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>
              Talent Assessment Analytics & Management
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "#d32f2f",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            Logout
          </button>
        </div>

        {/* Statistics Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "20px", 
          marginBottom: "40px" 
        }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Candidates</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {stats.totalCandidates}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Completed assessments
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Top Talent</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {stats.topTalent}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {stats.totalCandidates > 0 ? `${Math.round((stats.topTalent / stats.totalCandidates) * 100)}% of total` : "0%"}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Average Score</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {candidates.length > 0 
                ? Math.round(candidates.reduce((sum, c) => sum + c.total_score, 0) / candidates.length)
                : "0"
              }
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Out of maximum 500
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Completion Rate</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              100%
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              All assessments completed
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "20px" 
          }}>
            <h2 style={{ margin: 0, color: "#333" }}>Candidate Assessments</h2>
            <div style={{ fontSize: "14px", color: "#666" }}>
              {loading ? "Loading..." : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} found`}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ 
                width: "40px", 
                height: "40px", 
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #1565c0",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px"
              }} />
              <p style={{ color: "#666" }}>Loading candidate data...</p>
              <style jsx>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ 
                fontSize: "48px", 
                marginBottom: "20px",
                opacity: 0.3
              }}>
                📊
              </div>
              <h3 style={{ color: "#666", marginBottom: "10px" }}>
                No Completed Assessments Yet
              </h3>
              <p style={{ color: "#888", maxWidth: "500px", margin: "0 auto 25px" }}>
                When candidates complete their assessments, their results will appear here.
              </p>
              <div style={{
                display: "inline-flex",
                gap: "15px",
                background: "#e3f2fd",
                padding: "15px",
                borderRadius: "8px"
              }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600", color: "#1565c0" }}>What you'll see:</div>
                  <ul style={{ 
                    margin: "10px 0 0 0", 
                    paddingLeft: "20px",
                    fontSize: "14px",
                    color: "#555"
                  }}>
                    <li>Candidate name and email</li>
                    <li>Total assessment score</li>
                    <li>Talent classification</li>
                    <li>Detailed performance breakdown</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                minWidth: "800px"
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "2px solid #1565c0",
                    backgroundColor: "#f5f5f5"
                  }}>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>#</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Candidate Name</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Email</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Total Score</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Classification</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Completed On</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, index) => {
                    // Format date
                    const completedDate = c.updated_at || c.created_at;
                    const formattedDate = completedDate ? new Date(completedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : "N/A";
                    
                    return (
                      <tr key={c.user_id} style={{ 
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "15px", color: "#666" }}>{index + 1}</td>
                        <td style={{ padding: "15px", fontWeight: "500" }}>
                          <div style={{ fontWeight: "600" }}>
                            {c.user.full_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
                            ID: {c.user_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td style={{ padding: "15px" }}>
                          <div style={{ fontSize: "14px", color: "#1565c0" }}>
                            {c.user.email}
                          </div>
                          {c.user.email === "Not available" && (
                            <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>
                              Email not in database
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "15px", fontWeight: "500" }}>
                          <div style={{ 
                            display: "inline-block",
                            padding: "5px 12px",
                            background: c.total_score >= 400 ? "#e8f5e9" : 
                                      c.total_score >= 350 ? "#fff3e0" : "#ffebee",
                            color: c.total_score >= 400 ? "#2e7d32" : 
                                  c.total_score >= 350 ? "#f57c00" : "#c62828",
                            borderRadius: "20px",
                            fontWeight: "600",
                            fontSize: "14px"
                          }}>
                            {c.total_score}/500
                          </div>
                        </td>
                        <td style={{ padding: "15px" }}>
                          <span style={{ 
                            color: c.classification === 'Top Talent' ? "#4CAF50" :
                                  c.classification === 'High Potential' ? "#2196F3" :
                                  c.classification === 'Solid Performer' ? "#FF9800" :
                                  c.classification === 'Developing' ? "#9C27B0" : "#F44336",
                            fontWeight: "600",
                            padding: "6px 12px",
                            background: `${c.classification === 'Top Talent' ? "#4CAF50" :
                                       c.classification === 'High Potential' ? "#2196F3" :
                                       c.classification === 'Solid Performer' ? "#FF9800" :
                                       c.classification === 'Developing' ? "#9C27B0" : "#F44336"}15`,
                            borderRadius: "6px",
                            display: "inline-block"
                          }}>
                            {c.classification}
                          </span>
                        </td>
                        <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>
                          {formattedDate}
                        </td>
                        <td style={{ padding: "15px" }}>
                          <button
                            onClick={() => handleViewReport(c.user_id)}
                            style={{ 
                              color: "#fff", 
                              background: "#1565c0", 
                              padding: "8px 16px", 
                              borderRadius: "6px",
                              textDecoration: "none",
                              border: "none",
                              display: "inline-block",
                              fontWeight: "500",
                              fontSize: "14px",
                              cursor: "pointer",
                              transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
                            onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Info Box */}
              <div style={{ 
                marginTop: "20px", 
                padding: "15px", 
                background: "#e3f2fd", 
                borderRadius: "8px",
                fontSize: "13px",
                color: "#1565c0",
                borderLeft: "4px solid #1565c0"
              }}>
                <strong>Note:</strong> This dashboard shows all candidates who have completed the assessment. 
                Click "View Report" to see detailed performance breakdown by question category.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
