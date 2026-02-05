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

  // Fetch candidates and stats - UPDATED WITH API INTEGRATION
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
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

        if (talentError) throw talentError;

        // If no data, set empty and return
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

        // Try to get user emails via API first
        let candidatesWithUsers = [];
        
        try {
          // Extract user IDs
          const userIds = talentData.map(c => c.user_id);
          
          // Call our API to get user emails and names
          const response = await fetch('/api/admin/get-users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds })
          });

          if (response.ok) {
            const { users } = await response.json();
            
            // Create a map for quick lookup
            const userMap = {};
            users.forEach(user => {
              userMap[user.id] = {
                email: user.email,
                full_name: user.full_name || user.email.split('@')[0]
              };
            });

            // Combine talent data with user info
            candidatesWithUsers = talentData.map((candidate, index) => {
              const userInfo = userMap[candidate.user_id] || {
                email: "Unknown Email",
                full_name: `Candidate ${index + 1}`
              };

              return {
                ...candidate,
                user: userInfo
              };
            });
          } else {
            // If API fails, use fallback method
            console.error('Failed to fetch user data via API, using fallback');
            candidatesWithUsers = talentData.map((candidate, index) => ({
              ...candidate,
              user: {
                email: `candidate${index + 1}@example.com`,
                full_name: `Candidate ${index + 1}`
              }
            }));
          }
        } catch (apiError) {
          console.error('API error, using fallback:', apiError);
          // Fallback if API call fails
          candidatesWithUsers = talentData.map((candidate, index) => ({
            ...candidate,
            user: {
              email: `candidate${index + 1}@example.com`,
              full_name: `Candidate ${index + 1}`
            }
          }));
        }

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
              Across all classifications
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Completed Assessments</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {stats.completed}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              100% completion rate
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
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
            background: "linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)",
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
              Out of maximum 100
            </div>
          </div>
        </div>

        {/* Classification Distribution */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "40px"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Talent Classification Distribution</h2>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
            gap: "15px" 
          }}>
            {[
              { name: 'Top Talent', count: stats.topTalent, color: '#4CAF50' },
              { name: 'High Potential', count: stats.highPotential, color: '#2196F3' },
              { name: 'Solid Performer', count: stats.solidPerformer, color: '#FF9800' },
              { name: 'Developing', count: stats.developing, color: '#9C27B0' },
              { name: 'Needs Improvement', count: stats.needsImprovement, color: '#F44336' }
            ].map((category) => (
              <div key={category.name} style={{
                borderLeft: `4px solid ${category.color}`,
                padding: "15px",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "5px"
                }}>
                  <span style={{ fontWeight: "600", color: "#333" }}>{category.name}</span>
                  <span style={{ 
                    fontWeight: "700", 
                    color: category.color,
                    fontSize: "18px"
                  }}>{category.count}</span>
                </div>
                <div style={{ 
                  height: "8px", 
                  background: "#e0e0e0", 
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginTop: "8px"
                }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${stats.totalCandidates > 0 ? (category.count / stats.totalCandidates) * 100 : 0}%`, 
                    background: category.color,
                    borderRadius: "4px"
                  }} />
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#666", 
                  marginTop: "5px",
                  textAlign: "right"
                }}>
                  {stats.totalCandidates > 0 ? `${Math.round((category.count / stats.totalCandidates) * 100)}%` : "0%"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Candidates Table - SIMPLIFIED DISPLAY */}
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
                No Assessment Data Yet
              </h3>
              <p style={{ color: "#888", maxWidth: "500px", margin: "0 auto 25px" }}>
                When candidates complete their assessments, their results will appear here with detailed analytics including scores, classifications, strengths, weaknesses, and improvement opportunities.
              </p>
              <div style={{
                display: "inline-flex",
                gap: "15px",
                background: "#e3f2fd",
                padding: "15px",
                borderRadius: "8px"
              }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600", color: "#1565c0" }}>Expected Analytics:</div>
                  <ul style={{ 
                    margin: "10px 0 0 0", 
                    paddingLeft: "20px",
                    fontSize: "14px",
                    color: "#555"
                  }}>
                    <li>Individual performance breakdown</li>
                    <li>Category-wise scoring (Cognitive, Personality, etc.)</li>
                    <li>Strengths & Weaknesses analysis</li>
                    <li>Improvement recommendations</li>
                    <li>Comparative analytics</li>
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
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Candidate Name</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Email</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Total Score</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Classification</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Status</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, index) => (
                    <tr key={c.user_id} style={{ 
                      borderBottom: "1px solid #eee",
                      transition: "background 0.2s"
                    }}>
                      <td style={{ padding: "15px", fontWeight: "500" }}>
                        {c.user?.full_name}
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
                          ID: {c.user_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <div style={{ fontSize: "14px", color: "#1565c0" }}>
                          {c.user?.email}
                        </div>
                        {c.user?.email === "Unknown Email" && (
                          <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>
                            Contact information not available
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "15px", fontWeight: "500" }}>
                        <div style={{ 
                          display: "inline-block",
                          padding: "5px 12px",
                          background: c.total_score >= 75 ? "#e8f5e9" : 
                                    c.total_score >= 60 ? "#fff3e0" : "#ffebee",
                          color: c.total_score >= 75 ? "#2e7d32" : 
                                c.total_score >= 60 ? "#f57c00" : "#c62828",
                          borderRadius: "20px",
                          fontWeight: "600",
                          fontSize: "14px"
                        }}>
                          {c.total_score}
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
                      <td style={{ padding: "15px" }}>
                        <span style={{
                          padding: "6px 12px",
                          background: "#4CAF50",
                          color: "white",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          Completed
                        </span>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <Link href={`/supervisor/${c.user_id}`} legacyBehavior>
                          <a style={{ 
                            color: "#fff", 
                            background: "#1565c0", 
                            padding: "8px 16px", 
                            borderRadius: "6px",
                            textDecoration: "none",
                            display: "inline-block",
                            fontWeight: "500",
                            fontSize: "14px",
                            transition: "background 0.2s"
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
                          onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}
                          >
                            View Report
                          </a>
                        </Link>
                      </td>
                    </tr>
                  ))}
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
                <strong>Note:</strong> Candidate emails and names are retrieved from the registration data. 
                If you see "Unknown Email", the candidate's contact information may not be available in the system.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
