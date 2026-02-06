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
          setIsSupervisor(session.loggedIn);
        } catch {
          router.push("/supervisor-login");
        }
      }
    };
    checkSupervisorAuth();
  }, [router]);

  // Fetch candidates - SIMPLIFIED and RELIABLE
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        
        console.log("Fetching supervisor dashboard data...");
        
        // Get ALL users who have profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false });

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          setCandidates([]);
          setLoading(false);
          return;
        }

        if (!profiles || profiles.length === 0) {
          setCandidates([]);
          setLoading(false);
          return;
        }

        // Get assessment results for these users
        const { data: assessments, error: assessmentsError } = await supabase
          .from("assessment_results")
          .select("*")
          .in("user_id", profiles.map(p => p.id));

        // Get talent classification for these users
        const { data: classifications, error: classificationsError } = await supabase
          .from("talent_classification")
          .select("*")
          .in("user_id", profiles.map(p => p.id));

        // Combine all data
        const formattedCandidates = profiles.map(profile => {
          const assessment = assessments?.find(a => a.user_id === profile.id);
          const classification = classifications?.find(c => c.user_id === profile.id);
          
          const overallScore = assessment?.overall_score || classification?.total_score || 0;
          const categoryScores = assessment?.category_scores || {};
          const categoryCount = Object.keys(categoryScores).length;
          
          // Determine classification
          let candidateClassification = "Not Assessed";
          if (assessment?.risk_level) candidateClassification = assessment.risk_level;
          else if (classification?.classification) candidateClassification = classification.classification;
          else if (overallScore > 0) {
            // Auto-classify based on score
            if (overallScore >= 450) candidateClassification = "Top Talent";
            else if (overallScore >= 400) candidateClassification = "High Potential";
            else if (overallScore >= 350) candidateClassification = "Solid Performer";
            else if (overallScore >= 300) candidateClassification = "Developing";
            else if (overallScore > 0) candidateClassification = "Needs Improvement";
          }

          // Determine status
          let status = "Not Started";
          let statusColor = "#9E9E9E";
          if (assessment?.completed_at) {
            status = "Completed";
            statusColor = "#4CAF50";
          } else if (overallScore > 0) {
            status = "In Progress";
            statusColor = "#FF9800";
          }

          return {
            user_id: profile.id,
            user_name: profile.full_name || profile.email?.split('@')[0] || "User",
            user_email: profile.email || "No email",
            overall_score: overallScore,
            classification: candidateClassification,
            category_scores: categoryScores,
            category_count: categoryCount,
            status: status,
            status_color: statusColor,
            completed_at: assessment?.completed_at,
            created_at: profile.created_at
          };
        });

        // Sort by score (highest first), then by completion
        formattedCandidates.sort((a, b) => {
          if (a.overall_score !== b.overall_score) return b.overall_score - a.overall_score;
          if (a.completed_at && !b.completed_at) return -1;
          if (!a.completed_at && b.completed_at) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });

        setCandidates(formattedCandidates);
        console.log(`Loaded ${formattedCandidates.length} candidates`);

      } catch (error) {
        console.error("Error in fetchCandidates:", error);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [isSupervisor]);

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  const getClassificationColor = (classification) => {
    switch(classification) {
      case 'Top Talent': return '#4CAF50';
      case 'High Potential': return '#2196F3';
      case 'Solid Performer': return '#FF9800';
      case 'Developing': return '#9C27B0';
      case 'Needs Improvement': return '#F44336';
      default: return '#757575';
    }
  };

  // Calculate dashboard statistics
  const totalCandidates = candidates.length;
  const completedAssessments = candidates.filter(c => c.status === "Completed").length;
  const inProgressAssessments = candidates.filter(c => c.status === "In Progress").length;
  const topTalentCount = candidates.filter(c => c.classification === "Top Talent").length;
  const averageScore = totalCandidates > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + c.overall_score, 0) / totalCandidates)
    : 0;

  if (!isSupervisor) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p>Checking authentication...</p></div>;
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <h1 style={{ margin: 0, color: "#1565c0", fontSize: "32px" }}>Supervisor Dashboard</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>Talent Assessment & Analytics Platform</p>
          </div>
          <button onClick={handleLogout} style={{ background: "#d32f2f", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
            Logout
          </button>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "25px", borderRadius: "12px", color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Candidates</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>{totalCandidates}</div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>Registered in system</div>
          </div>
          
          <div style={{ background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)", padding: "25px", borderRadius: "12px", color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Completed</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>{completedAssessments}</div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {totalCandidates > 0 ? `${Math.round((completedAssessments / totalCandidates) * 100)}% completion` : "0%"}
            </div>
          </div>
          
          <div style={{ background: "linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)", padding: "25px", borderRadius: "12px", color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Avg Score</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>{averageScore}</div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>Out of maximum 500</div>
          </div>
          
          <div style={{ background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)", padding: "25px", borderRadius: "12px", color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Top Talent</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>{topTalentCount}</div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {totalCandidates > 0 ? `${Math.round((topTalentCount / totalCandidates) * 100)}% of total` : "0%"}
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, color: "#333" }}>Candidate Assessments</h2>
            <div style={{ fontSize: "14px", color: "#666" }}>
              {loading ? "Loading..." : `${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}`}
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #1565c0", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
              <p>Loading candidate data...</p>
              <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : totalCandidates === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px", opacity: 0.3 }}>👥</div>
              <h3 style={{ color: "#666", marginBottom: "10px" }}>No Candidates Found</h3>
              <p style={{ color: "#888", marginBottom: "20px" }}>No candidates are registered in the system yet.</p>
              <div style={{ background: "#e3f2fd", padding: "15px", borderRadius: "8px", display: "inline-block" }}>
                <p style={{ margin: 0, color: "#1565c0" }}><strong>Note:</strong> Candidates will appear here after they register and complete assessments.</p>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #1565c0", backgroundColor: "#f5f5f5" }}>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Candidate</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Email</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Score</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Classification</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Status</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Categories</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate, index) => (
                    <tr key={candidate.user_id} style={{ borderBottom: "1px solid #eee", background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "15px", fontWeight: "500" }}>
                        <div style={{ fontWeight: "600", color: "#333" }}>{candidate.user_name}</div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
                          ID: {candidate.user_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <div style={{ fontSize: "14px", color: "#1565c0" }}>{candidate.user_email}</div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <div style={{ 
                          display: "inline-block", 
                          padding: "6px 12px", 
                          background: candidate.overall_score >= 400 ? "#e8f5e9" : 
                                    candidate.overall_score >= 350 ? "#fff3e0" : 
                                    candidate.overall_score > 0 ? "#ffebee" : "#f5f5f5",
                          color: candidate.overall_score >= 400 ? "#2e7d32" : 
                                candidate.overall_score >= 350 ? "#f57c00" : 
                                candidate.overall_score > 0 ? "#c62828" : "#666",
                          borderRadius: "20px", 
                          fontWeight: "600", 
                          fontSize: "14px" 
                        }}>
                          {candidate.overall_score}/500
                        </div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <span style={{ 
                          color: getClassificationColor(candidate.classification), 
                          fontWeight: "600", 
                          padding: "6px 12px", 
                          background: `${getClassificationColor(candidate.classification)}15`, 
                          borderRadius: "6px",
                          display: "inline-block" 
                        }}>
                          {candidate.classification}
                        </span>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <span style={{ 
                          padding: "6px 12px", 
                          background: candidate.status_color, 
                          color: "white", 
                          borderRadius: "6px", 
                          fontSize: "12px", 
                          fontWeight: "600" 
                        }}>
                          {candidate.status}
                        </span>
                      </td>
                      <td style={{ padding: "15px" }}>
                        {candidate.category_count > 0 ? (
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            <div style={{ fontWeight: "600", marginBottom: "5px" }}>{candidate.category_count} assessed</div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {Object.keys(candidate.category_scores).slice(0, 2).map(cat => (
                                <span key={cat} style={{ 
                                  padding: "3px 8px", 
                                  background: "#e3f2fd", 
                                  borderRadius: "4px", 
                                  fontSize: "10px", 
                                  color: "#1565c0" 
                                }}>
                                  {cat.substring(0, 10)}{cat.length > 10 ? '...' : ''}
                                </span>
                              ))}
                              {candidate.category_count > 2 && (
                                <span style={{ 
                                  padding: "3px 8px", 
                                  background: "#f5f5f5", 
                                  borderRadius: "4px", 
                                  fontSize: "10px", 
                                  color: "#666" 
                                }}>
                                  +{candidate.category_count - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : candidate.overall_score > 0 ? (
                          <div style={{ fontSize: "12px", color: "#FF9800", fontStyle: "italic" }}>
                            Calculating...
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", color: "#999", fontStyle: "italic" }}>
                            Not started
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "15px" }}>
                        <Link href={`/supervisor/${candidate.user_id}`}>
                          <a style={{ 
                            color: "#fff", 
                            background: candidate.overall_score > 0 ? "#1565c0" : "#9E9E9E", 
                            padding: "8px 16px", 
                            borderRadius: "6px", 
                            textDecoration: "none", 
                            display: "inline-block", 
                            fontWeight: "500",
                            cursor: candidate.overall_score > 0 ? "pointer" : "not-allowed"
                          }}>
                            {candidate.overall_score > 0 ? "View Report" : "No Data"}
                          </a>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
