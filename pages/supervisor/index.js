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

  // Fetch candidates and stats - UPDATED TO USE assessment_results
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
        // Get all assessment results with pre-calculated scores
        const { data: assessmentResults, error: assessmentError } = await supabase
          .from("assessment_results")
          .select(`
            user_id,
            user_name,
            user_email,
            overall_score,
            category_scores,
            strengths,
            weaknesses,
            risk_level,
            readiness,
            completed_at,
            created_at,
            updated_at
          `)
          .order("completed_at", { ascending: false });

        if (assessmentError) throw assessmentError;

        // If no data in assessment_results, fallback to talent_classification
        if (!assessmentResults || assessmentResults.length === 0) {
          console.log("No assessment results, falling back to talent_classification");
          
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

          // Process talent classification data
          const processedCandidates = await processCandidates(talentData);
          setCandidates(processedCandidates);
          calculateStats(processedCandidates);
        } else {
          // Process assessment results data
          const processedCandidates = await processAssessmentResults(assessmentResults);
          setCandidates(processedCandidates);
          calculateStats(processedCandidates);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setCandidates([]);
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor]);

  // Process assessment results
  const processAssessmentResults = async (assessmentResults) => {
    const candidatesWithData = [];
    
    for (const result of assessmentResults) {
      try {
        // Try to get user profile for additional info
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", result.user_id)
          .single();
        
        // Get classification from risk_level or calculate from score
        const classification = result.risk_level || getClassificationFromScore(result.overall_score);
        
        candidatesWithData.push({
          user_id: result.user_id,
          total_score: result.overall_score || 0,
          classification: classification,
          user: {
            email: profileData?.email || result.user_email || "Unknown Email",
            full_name: profileData?.full_name || result.user_name || `Candidate ${result.user_id.substring(0, 8)}`
          },
          category_scores: result.category_scores || {},
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          readiness: result.readiness || 'UNKNOWN',
          completed_at: result.completed_at,
          created_at: result.created_at
        });
      } catch (error) {
        // Fallback if profile not found
        const classification = result.risk_level || getClassificationFromScore(result.overall_score);
        
        candidatesWithData.push({
          user_id: result.user_id,
          total_score: result.overall_score || 0,
          classification: classification,
          user: {
            email: result.user_email || "Unknown Email",
            full_name: result.user_name || `Candidate ${result.user_id.substring(0, 8)}`
          },
          category_scores: result.category_scores || {},
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          readiness: result.readiness || 'UNKNOWN',
          completed_at: result.completed_at,
          created_at: result.created_at
        });
      }
    }
    
    return candidatesWithData;
  };

  // Process talent classification data (fallback)
  const processCandidates = async (talentData) => {
    const candidatesWithUsers = [];
    
    for (const candidate of talentData) {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", candidate.user_id)
          .single();
        
        candidatesWithUsers.push({
          ...candidate,
          user: {
            email: profileData?.email || "Unknown Email",
            full_name: profileData?.full_name || `Candidate ${candidate.user_id.substring(0, 8)}`
          },
          category_scores: {},
          strengths: [],
          weaknesses: []
        });
      } catch (error) {
        candidatesWithUsers.push({
          ...candidate,
          user: {
            email: "Unknown Email",
            full_name: `Candidate ${candidate.user_id.substring(0, 8)}`
          },
          category_scores: {},
          strengths: [],
          weaknesses: []
        });
      }
    }
    
    return candidatesWithUsers;
  };

  // Calculate classification from score
  const getClassificationFromScore = (score) => {
    if (score >= 450) return 'Top Talent';
    if (score >= 400) return 'High Potential';
    if (score >= 350) return 'Solid Performer';
    if (score >= 300) return 'Developing';
    return 'Needs Improvement';
  };

  // Calculate statistics
  const calculateStats = (candidatesData) => {
    const statsData = {
      totalCandidates: candidatesData.length,
      completed: candidatesData.filter(c => c.completed_at).length,
      inProgress: 0,
      notStarted: 0,
      topTalent: candidatesData.filter(c => c.classification === 'Top Talent').length,
      highPotential: candidatesData.filter(c => c.classification === 'High Potential').length,
      solidPerformer: candidatesData.filter(c => c.classification === 'Solid Performer').length,
      developing: candidatesData.filter(c => c.classification === 'Developing').length,
      needsImprovement: candidatesData.filter(c => c.classification === 'Needs Improvement').length
    };
    
    // Calculate in progress and not started based on completion
    statsData.inProgress = candidatesData.filter(c => !c.completed_at && c.total_score > 0).length;
    statsData.notStarted = candidatesData.filter(c => !c.completed_at && c.total_score === 0).length;
    
    setStats(statsData);
  };

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
              {stats.completed} completed, {stats.inProgress} in progress
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
              {stats.totalCandidates > 0 ? `${Math.round((stats.completed / stats.totalCandidates) * 100)}% completion rate` : "0%"}
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
                No Assessment Data Yet
              </h3>
              <p style={{ color: "#888", maxWidth: "500px", margin: "0 auto 25px" }}>
                When candidates complete their assessments, their results will appear here with detailed analytics.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                minWidth: "1000px"
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
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Category Scores</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, index) => {
                    const hasCategoryScores = c.category_scores && Object.keys(c.category_scores).length > 0;
                    const categoryCount = hasCategoryScores ? Object.keys(c.category_scores).length : 0;
                    
                    return (
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
                        <td style={{ padding: "15px" }}>
                          {c.completed_at ? (
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
                          ) : c.total_score > 0 ? (
                            <span style={{
                              padding: "6px 12px",
                              background: "#FF9800",
                              color: "white",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              In Progress
                            </span>
                          ) : (
                            <span style={{
                              padding: "6px 12px",
                              background: "#9E9E9E",
                              color: "white",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              Not Started
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "15px" }}>
                          {hasCategoryScores ? (
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              <div style={{ fontWeight: "600", marginBottom: "5px" }}>
                                {categoryCount} categor{categoryCount === 1 ? 'y' : 'ies'}
                              </div>
                              <div style={{ 
                                display: "flex", 
                                gap: "4px", 
                                flexWrap: "wrap",
                                maxWidth: "200px"
                              }}>
                                {Object.keys(c.category_scores).slice(0, 3).map(cat => (
                                  <span key={cat} style={{
                                    padding: "2px 6px",
                                    background: "#e3f2fd",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    color: "#1565c0"
                                  }}>
                                    {cat.substring(0, 12)}{cat.length > 12 ? '...' : ''}
                                  </span>
                                ))}
                                {Object.keys(c.category_scores).length > 3 && (
                                  <span style={{
                                    padding: "2px 6px",
                                    background: "#f5f5f5",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    color: "#666"
                                  }}>
                                    +{Object.keys(c.category_scores).length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: "12px", color: "#999", fontStyle: "italic" }}>
                              No category scores
                            </div>
                          )}
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
                <strong>Category Scores:</strong> Shows performance across different assessment categories (Cognitive, Personality, etc.). 
                Click "View Report" for detailed breakdown with strengths, weaknesses, and recommendations.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
