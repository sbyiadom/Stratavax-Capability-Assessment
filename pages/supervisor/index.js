import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

// Helper function to get classification from score (SAME AS IN CANDIDATE REPORT)
const getClassificationFromScore = (score) => {
  if (score >= 450) return "Elite Talent";
  if (score >= 400) return "Top Talent";
  if (score >= 350) return "High Potential";
  if (score >= 300) return "Solid Performer";
  if (score >= 250) return "Developing Talent";
  if (score >= 200) return "Emerging Talent";
  return "Needs Improvement";
};

// Helper function to get classification color
const getClassificationColor = (score) => {
  if (score >= 450) return "#2E7D32";
  if (score >= 400) return "#4CAF50";
  if (score >= 350) return "#2196F3";
  if (score >= 300) return "#FF9800";
  if (score >= 250) return "#9C27B0";
  if (score >= 200) return "#795548";
  return "#F44336";
};

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
    eliteTalent: 0,
    topTalent: 0,
    highPotential: 0,
    solidPerformer: 0,
    developing: 0,
    emergingTalent: 0,
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

  // Fetch candidates and stats - FIXED VERSION
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // FIRST: Try to get data from talent_classification table WITH user data
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("*")
          .order("total_score", { ascending: false });

        if (classificationError) throw classificationError;

        // If no classification data, try candidate_assessments as fallback
        if (!classificationData || classificationData.length === 0) {
          // Fallback to candidate_assessments
          const { data: assessmentsData, error: assessmentsError } = await supabase
            .from("candidate_assessments")
            .select("*")
            .order("total_score", { ascending: false });

          if (assessmentsError) throw assessmentsError;

          if (!assessmentsData || assessmentsData.length === 0) {
            setCandidates([]);
            setStats({
              totalCandidates: 0,
              completed: 0,
              inProgress: 0,
              notStarted: 0,
              eliteTalent: 0,
              topTalent: 0,
              highPotential: 0,
              solidPerformer: 0,
              developing: 0,
              emergingTalent: 0,
              needsImprovement: 0
            });
            setLoading(false);
            return;
          }

          // Process assessments data with user lookup
          const processedCandidates = await Promise.all(
            assessmentsData.map(async (assessment) => {
              let userEmail = "Email not found";
              let userName = `Candidate ${assessment.user_id.substring(0, 8).toUpperCase()}`;

              // Try to get user info from users table
              const { data: userData } = await supabase
                .from("users")
                .select("email, full_name")
                .eq("id", assessment.user_id)
                .single();

              if (userData) {
                userEmail = userData.email || "No email provided";
                userName = userData.full_name || userName;
              } else {
                // Try auth.users as fallback
                try {
                  const { data: authData } = await supabase.auth.admin.getUserById(assessment.user_id);
                  if (authData?.user) {
                    userEmail = authData.user.email || "No email in auth";
                    userName = authData.user.user_metadata?.full_name || 
                              authData.user.user_metadata?.name ||
                              userEmail.split('@')[0] || 
                              userName;
                  }
                } catch (authErr) {
                  // Silently fail and use default values
                }
              }

              return {
                ...assessment,
                user: {
                  email: userEmail,
                  full_name: userName,
                  id_short: assessment.user_id.substring(0, 8).toUpperCase()
                }
              };
            })
          );

          setCandidates(processedCandidates);
          
          // Calculate statistics
          const statsData = {
            totalCandidates: processedCandidates.length,
            completed: processedCandidates.length,
            inProgress: 0,
            notStarted: 0,
            eliteTalent: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Elite Talent').length,
            topTalent: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Top Talent').length,
            highPotential: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'High Potential').length,
            solidPerformer: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Solid Performer').length,
            developing: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Developing Talent').length,
            emergingTalent: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Emerging Talent').length,
            needsImprovement: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Needs Improvement').length
          };
          setStats(statsData);
          
          setLoading(false);
          return;
        }

        // Process classification data (MAIN PATH)
        const processedCandidates = await Promise.all(
          classificationData.map(async (classification) => {
            let userEmail = "Email not found";
            let userName = `Candidate ${classification.user_id.substring(0, 8).toUpperCase()}`;

            // Try to get user info from users table FIRST
            const { data: userData } = await supabase
              .from("users")
              .select("email, full_name")
              .eq("id", classification.user_id)
              .single();

            if (userData) {
              userEmail = userData.email || "No email provided";
              userName = userData.full_name || 
                        userEmail.split('@')[0] || 
                        userName;
            } else {
              // Check if email is in metadata
              if (classification.metadata?.email) {
                userEmail = classification.metadata.email;
                userName = classification.metadata.name || 
                          userEmail.split('@')[0] || 
                          userName;
              } else {
                // Try auth.users as last resort
                try {
                  const { data: authData } = await supabase
                    .from("auth.users")
                    .select("email, raw_user_meta_data")
                    .eq("id", classification.user_id)
                    .single();

                  if (authData) {
                    userEmail = authData.email || "No email in auth";
                    userName = authData.raw_user_meta_data?.full_name || 
                              authData.raw_user_meta_data?.name ||
                              userEmail.split('@')[0] || 
                              userName;
                  }
                } catch (authErr) {
                  // Silently fail and use default values
                }
              }
            }

            return {
              ...classification,
              user: {
                email: userEmail,
                full_name: userName,
                id_short: classification.user_id.substring(0, 8).toUpperCase()
              }
            };
          })
        );

        setCandidates(processedCandidates);
        
        // Calculate statistics
        const statsData = {
          totalCandidates: processedCandidates.length,
          completed: processedCandidates.length,
          inProgress: 0,
          notStarted: 0,
          eliteTalent: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Elite Talent').length,
          topTalent: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Top Talent').length,
          highPotential: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'High Potential').length,
          solidPerformer: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Solid Performer').length,
          developing: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Developing Talent').length,
          emergingTalent: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Emerging Talent').length,
          needsImprovement: processedCandidates.filter(c => getClassificationFromScore(c.total_score) === 'Needs Improvement').length
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
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => router.push("/admin/add-supervisor")}
              style={{
                background: "#4CAF50",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              Add Supervisor
            </button>
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
              Out of maximum 500
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
              { name: 'Elite Talent', count: stats.eliteTalent, color: '#2E7D32', scoreRange: '450-500' },
              { name: 'Top Talent', count: stats.topTalent, color: '#4CAF50', scoreRange: '400-449' },
              { name: 'High Potential', count: stats.highPotential, color: '#2196F3', scoreRange: '350-399' },
              { name: 'Solid Performer', count: stats.solidPerformer, color: '#FF9800', scoreRange: '300-349' },
              { name: 'Developing Talent', count: stats.developing, color: '#9C27B0', scoreRange: '250-299' },
              { name: 'Emerging Talent', count: stats.emergingTalent, color: '#795548', scoreRange: '200-249' },
              { name: 'Needs Improvement', count: stats.needsImprovement, color: '#F44336', scoreRange: '0-199' }
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
                  <div>
                    <div style={{ fontWeight: "600", color: "#333", fontSize: "15px" }}>{category.name}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{category.scoreRange}</div>
                  </div>
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
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px", 
                  color: "#666", 
                  marginTop: "5px"
                }}>
                  <span>{category.scoreRange}</span>
                  <span>{stats.totalCandidates > 0 ? `${Math.round((category.count / stats.totalCandidates) * 100)}%` : "0%"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Candidates Table - IMPROVED DISPLAY */}
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
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Candidate ID</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Name</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Contact</th>
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
                      <td style={{ padding: "15px", fontSize: "13px", color: "#666", fontFamily: "monospace" }}>
                        {c.user_id.substring(0, 12)}...
                      </td>
                      <td style={{ padding: "15px", fontWeight: "500" }}>
                        {c.user?.full_name}
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
                          Candidate #{index + 1}
                        </div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <div style={{ fontSize: "14px", color: "#1565c0" }}>
                          {c.user?.email}
                        </div>
                        {c.user?.email === "Email not found" && (
                          <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>
                            ID: {c.user?.id_short}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "15px", fontWeight: "500" }}>
                        <div style={{ 
                          display: "inline-block",
                          padding: "5px 12px",
                          background: c.total_score >= 400 ? "#e8f5e9" : 
                                    c.total_score >= 350 ? "#e3f2fd" :
                                    c.total_score >= 300 ? "#fff3e0" : 
                                    c.total_score >= 250 ? "#f3e5f5" :
                                    c.total_score >= 200 ? "#efebe9" : "#ffebee",
                          color: c.total_score >= 400 ? "#2e7d32" : 
                                c.total_score >= 350 ? "#1565c0" :
                                c.total_score >= 300 ? "#f57c00" : 
                                c.total_score >= 250 ? "#7b1fa2" :
                                c.total_score >= 200 ? "#5d4037" : "#c62828",
                          borderRadius: "20px",
                          fontWeight: "600",
                          fontSize: "14px"
                        }}>
                          {c.total_score}/500
                        </div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <span style={{ 
                          color: getClassificationColor(c.total_score),
                          fontWeight: "600",
                          padding: "6px 12px",
                          background: `${getClassificationColor(c.total_score)}15`,
                          borderRadius: "6px",
                          display: "inline-block"
                        }}>
                          {getClassificationFromScore(c.total_score)}
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
              
              {/* Legend for identification */}
              <div style={{ 
                marginTop: "20px", 
                padding: "15px", 
                background: "#f8f9fa", 
                borderRadius: "8px",
                fontSize: "12px",
                color: "#666"
              }}>
                <strong>Identification Guide:</strong> Candidates are identified by their unique ID. If email is "Unknown", 
                the candidate can still be tracked using their ID prefix (e.g., {candidates[0]?.user?.id_short || "XXXXXX"}).
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
