// pages/supervisor/index.js - Supervisor Dashboard
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    assessedCandidates: 0,
    averageScore: 0,
    eliteTalent: 0,
    topTalent: 0,
    highPotential: 0
  });
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn && session.expires > Date.now()) {
            setUser(session);
            fetchDashboardData();
          } else {
            localStorage.removeItem("supervisorSession");
            router.push("/supervisor-login");
          }
        } catch {
          localStorage.removeItem("supervisorSession");
          router.push("/supervisor-login");
        }
      }
    };

    checkAuth();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all candidates with their classifications
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidate_assessments")
        .select(`
          user_id,
          email,
          full_name,
          total_score,
          classification,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (!candidateError && candidateData) {
        setCandidates(candidateData);
        
        // Calculate statistics
        const total = candidateData.length;
        const assessed = candidateData.filter(c => c.total_score > 0).length;
        const avgScore = candidateData.length > 0 
          ? Math.round(candidateData.reduce((sum, c) => sum + c.total_score, 0) / candidateData.length)
          : 0;
        
        const elite = candidateData.filter(c => c.classification === "Elite Talent" || c.total_score >= 450).length;
        const top = candidateData.filter(c => c.classification === "Top Talent" || (c.total_score >= 400 && c.total_score < 450)).length;
        const high = candidateData.filter(c => c.classification === "High Potential" || (c.total_score >= 350 && c.total_score < 400)).length;

        setStats({
          totalCandidates: total,
          assessedCandidates: assessed,
          averageScore: avgScore,
          eliteTalent: elite,
          topTalent: top,
          highPotential: high
        });

        // Get recent assessments (last 10)
        setRecentAssessments(candidateData.slice(0, 10));
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("supervisorSession");
      sessionStorage.removeItem("supervisorAuth");
      router.push("/supervisor-login");
    }
  };

  const handleViewCandidate = (userId) => {
    router.push(`/supervisor/${userId}`);
  };

  const filteredCandidates = candidates.filter(candidate => 
    candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.classification?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClassificationColor = (classification) => {
    switch(classification) {
      case 'Elite Talent': return '#4CAF50';
      case 'Top Talent': return '#2196F3';
      case 'High Potential': return '#FF9800';
      case 'Solid Performer': return '#9C27B0';
      case 'Developing Talent': return '#F57C00';
      case 'Emerging Talent': return '#795548';
      case 'Needs Improvement': return '#F44336';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "400px" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ 
              width: "50px", 
              height: "50px", 
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #1565c0",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }} />
            <p style={{ color: "#666" }}>Loading dashboard...</p>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "95vw", margin: "auto", padding: "30px 20px" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <div>
            <h1 style={{ 
              margin: "0 0 10px 0", 
              color: "#333",
              fontSize: "32px"
            }}>
              Supervisor Dashboard
            </h1>
            <p style={{ 
              margin: "0", 
              color: "#666",
              fontSize: "16px"
            }}>
              Welcome back, {user?.name || 'Supervisor'} • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "10px 15px", 
              borderRadius: "8px",
              fontSize: "14px",
              color: "#666"
            }}>
              <div style={{ fontSize: "12px", opacity: 0.7 }}>Role</div>
              <div style={{ fontWeight: "600" }}>{user?.role || 'Supervisor'}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 20px",
                background: "#F44336",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "20px",
          marginBottom: "30px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Candidates</div>
            <div style={{ fontSize: "42px", fontWeight: "700", margin: "10px 0" }}>
              {stats.totalCandidates}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {stats.assessedCandidates} assessed • {stats.totalCandidates - stats.assessedCandidates} pending
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Average Score</div>
            <div style={{ fontSize: "42px", fontWeight: "700", margin: "10px 0" }}>
              {stats.averageScore}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Out of 500 • {Math.round((stats.averageScore / 500) * 100)}% average
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>High Performers</div>
            <div style={{ fontSize: "42px", fontWeight: "700", margin: "10px 0" }}>
              {stats.eliteTalent + stats.topTalent}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {stats.eliteTalent} Elite • {stats.topTalent} Top Talent • {stats.highPotential} High Potential
            </div>
          </div>
        </div>

        {/* Search and Candidates Table */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "25px"
          }}>
            <h2 style={{ margin: 0, color: "#333", fontSize: "24px" }}>
              Candidate Assessments
            </h2>
            <div style={{ position: "relative", width: "300px" }}>
              <input
                type="text"
                placeholder="Search candidates by name, email, or classification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 15px 12px 40px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
              <div style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#999"
              }}>
                🔍
              </div>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>📊</div>
              <h3 style={{ color: "#666", marginBottom: "10px" }}>No Candidates Found</h3>
              <p style={{ maxWidth: "400px", margin: "0 auto" }}>
                {searchTerm ? 'No candidates match your search. Try a different term.' : 'No candidate assessments have been completed yet.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px"
              }}>
                <thead>
                  <tr style={{ 
                    background: "#f8f9fa",
                    borderBottom: "2px solid #1565c0"
                  }}>
                    <th style={{ padding: "15px", textAlign: "left", color: "#333", fontWeight: "600" }}>Candidate</th>
                    <th style={{ padding: "15px", textAlign: "center", color: "#333", fontWeight: "600" }}>Email</th>
                    <th style={{ padding: "15px", textAlign: "center", color: "#333", fontWeight: "600" }}>Total Score</th>
                    <th style={{ padding: "15px", textAlign: "center", color: "#333", fontWeight: "600" }}>Classification</th>
                    <th style={{ padding: "15px", textAlign: "center", color: "#333", fontWeight: "600" }}>Date Assessed</th>
                    <th style={{ padding: "15px", textAlign: "center", color: "#333", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate, index) => (
                    <tr key={candidate.user_id} style={{ 
                      borderBottom: "1px solid #eee",
                      background: index % 2 === 0 ? "white" : "#fafafa",
                      transition: "background 0.2s"
                    }}>
                      <td style={{ padding: "15px", fontWeight: "500", color: "#333" }}>
                        {candidate.full_name || `Candidate ${candidate.user_id.substring(0, 8).toUpperCase()}`}
                      </td>
                      <td style={{ padding: "15px", textAlign: "center", color: "#666" }}>
                        {candidate.email || "No email"}
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <div style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          background: candidate.total_score >= 400 ? "rgba(76, 175, 80, 0.1)" :
                                     candidate.total_score >= 300 ? "rgba(255, 152, 0, 0.1)" :
                                     "rgba(244, 67, 54, 0.1)",
                          color: candidate.total_score >= 400 ? "#2e7d32" :
                                 candidate.total_score >= 300 ? "#f57c00" : "#c62828",
                          borderRadius: "20px",
                          fontWeight: "600",
                          fontSize: "13px",
                          minWidth: "60px"
                        }}>
                          {candidate.total_score}/500
                        </div>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "20px",
                          border: `2px solid ${getClassificationColor(candidate.classification)}`,
                          color: getClassificationColor(candidate.classification),
                          fontWeight: "600",
                          fontSize: "12px"
                        }}>
                          <div style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: getClassificationColor(candidate.classification)
                          }} />
                          {candidate.classification || "Not Classified"}
                        </div>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center", color: "#666" }}>
                        {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button
                          onClick={() => handleViewCandidate(candidate.user_id)}
                          style={{
                            padding: "8px 16px",
                            background: "#1565c0",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            transition: "background 0.2s"
                          }}
                          onMouseOver={(e) => e.target.style.background = "#0d47a1"}
                          onMouseOut={(e) => e.target.style.background = "#1565c0"}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Info */}
          {filteredCandidates.length > 0 && (
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginTop: "20px",
              paddingTop: "15px",
              borderTop: "1px solid #eee",
              fontSize: "13px",
              color: "#666"
            }}>
              <div>
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  style={{
                    padding: "6px 12px",
                    background: "#f8f9fa",
                    color: "#666",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ← Previous
                </button>
                <span>Page 1 of 1</span>
                <button
                  style={{
                    padding: "6px 12px",
                    background: "#f8f9fa",
                    color: "#666",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#333", fontSize: "24px" }}>
            Recent Assessments
          </h2>
          
          {recentAssessments.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "30px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "36px", marginBottom: "15px" }}>📝</div>
              <p>No recent assessments available.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {recentAssessments.slice(0, 5).map((assessment, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "15px",
                  background: index % 2 === 0 ? "#f8f9fa" : "white",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${getClassificationColor(assessment.classification)}`
                }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}>
                      {assessment.full_name || `Candidate ${assessment.user_id.substring(0, 8).toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      {assessment.email} • {new Date(assessment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Score</div>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#1565c0" }}>
                        {assessment.total_score}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Classification</div>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: getClassificationColor(assessment.classification)
                      }}>
                        {assessment.classification}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewCandidate(assessment.user_id)}
                      style={{
                        padding: "6px 12px",
                        background: "none",
                        color: "#1565c0",
                        border: "1px solid #1565c0",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "1px solid #eee",
          textAlign: "center",
          fontSize: "12px",
          color: "#888"
        }}>
          <p style={{ margin: 0 }}>
            Talent Assessment System • {stats.totalCandidates} total candidates • Last updated: {new Date().toLocaleTimeString()}
          </p>
          <p style={{ margin: "5px 0 0 0" }}>
            Logged in as: {user?.email} • Session expires: {new Date(user?.expires || Date.now()).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
