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

  // Fetch all registered candidates
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        console.log("Fetching all registered candidates...");

        // Get ALL registered users from profiles
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching profiles:", error);
          setCandidates([]);
          setLoading(false);
          return;
        }

        if (!profiles || profiles.length === 0) {
          console.log("No registered candidates found");
          setCandidates([]);
          setLoading(false);
          return;
        }

        // Get user IDs
        const userIds = profiles.map(p => p.id);
        
        // Check which users have started assessments
        const { data: responses } = await supabase
          .from("responses")
          .select("user_id")
          .in("user_id", userIds)
          .groupBy("user_id");

        const usersWithResponses = responses?.map(r => r.user_id) || [];
        
        // Get any assessment results
        const { data: assessments } = await supabase
          .from("assessment_results")
          .select("*")
          .in("user_id", userIds);

        // Format candidates data
        const formattedCandidates = profiles.map(profile => {
          const hasResponses = usersWithResponses.includes(profile.id);
          const assessment = assessments?.find(a => a.user_id === profile.id);
          
          // Determine status
          let status = "Not Started";
          let statusColor = "#9E9E9E";
          let overallScore = 0;
          let classification = "Not Assessed";
          
          if (assessment) {
            status = "Completed";
            statusColor = "#4CAF50";
            overallScore = assessment.overall_score || 0;
            classification = assessment.risk_level || "Not Classified";
          } else if (hasResponses) {
            status = "In Progress";
            statusColor = "#FF9800";
            classification = "In Progress";
          }

          return {
            user_id: profile.id,
            user_name: profile.full_name || profile.email?.split('@')[0] || "User",
            user_email: profile.email || "No email",
            overall_score: overallScore,
            classification: classification,
            status: status,
            status_color: statusColor,
            registered_date: profile.created_at,
            has_assessment: hasResponses || !!assessment
          };
        });

        // Sort: Completed first, then In Progress, then Not Started
        formattedCandidates.sort((a, b) => {
          if (a.status === "Completed" && b.status !== "Completed") return -1;
          if (a.status !== "Completed" && b.status === "Completed") return 1;
          if (a.status === "In Progress" && b.status === "Not Started") return -1;
          if (a.status === "Not Started" && b.status === "In Progress") return 1;
          return new Date(b.registered_date) - new Date(a.registered_date);
        });

        setCandidates(formattedCandidates);
        console.log(`Loaded ${formattedCandidates.length} candidates`);

      } catch (error) {
        console.error("Error loading candidates:", error);
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
      case 'In Progress': return '#FF9800';
      case 'Not Assessed': return '#757575';
      default: return '#F44336';
    }
  };

  // Calculate statistics
  const totalCandidates = candidates.length;
  const completedAssessments = candidates.filter(c => c.status === "Completed").length;
  const inProgressAssessments = candidates.filter(c => c.status === "In Progress").length;
  const notStartedAssessments = candidates.filter(c => c.status === "Not Started").length;

  if (!isSupervisor) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <h1 style={{ margin: 0, color: "#1565c0", fontSize: "32px" }}>Supervisor Dashboard</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>Talent Assessment Management System</p>
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
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Registered Candidates</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {totalCandidates}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Total in system
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Completed</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {completedAssessments}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {totalCandidates > 0 ? `${Math.round((completedAssessments / totalCandidates) * 100)}%` : "0%"} done
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>In Progress</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {inProgressAssessments}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Currently taking assessment
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #757575 0%, #616161 100%)",
            padding: "25px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Not Started</div>
            <div style={{ fontSize: "36px", fontWeight: "700", margin: "10px 0" }}>
              {notStartedAssessments}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Registered but not started
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
            <h2 style={{ margin: 0, color: "#333" }}>Candidate Management</h2>
            <div style={{ fontSize: "14px", color: "#666" }}>
              {loading ? "Loading..." : `${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}`}
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
          ) : totalCandidates === 0 ? (
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
                👥
              </div>
              <h3 style={{ color: "#666", marginBottom: "10px" }}>
                No Candidates Registered
              </h3>
              <p style={{ color: "#888", marginBottom: "20px" }}>
                No candidates are registered in the system yet. 
                Candidates will appear here once they sign up and complete their assessments.
              </p>
              <div style={{
                background: "#e3f2fd",
                padding: "15px",
                borderRadius: "8px",
                display: "inline-block"
              }}>
                <p style={{ margin: 0, color: "#1565c0" }}>
                  <strong>Next Steps:</strong> Share the assessment link with candidates to get started.
                </p>
              </div>
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
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Status</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Score</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Classification</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Registered Date</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate, index) => (
                    <tr key={candidate.user_id} style={{ 
                      borderBottom: "1px solid #eee",
                      background: index % 2 === 0 ? "#fff" : "#fafafa"
                    }}>
                      <td style={{ padding: "15px", fontWeight: "500" }}>
                        <div style={{ fontWeight: "600", color: "#333" }}>
                          {candidate.user_name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
                          ID: {candidate.user_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: "15px" }}>
                        <div style={{ fontSize: "14px", color: "#1565c0" }}>
                          {candidate.user_email}
                        </div>
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
                          {candidate.overall_score > 0 ? `${candidate.overall_score}/500` : "N/A"}
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
                      <td style={{ padding: "15px", fontSize: "14px", color: "#666" }}>
                        {new Date(candidate.registered_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "15px" }}>
                        <Link href={`/supervisor/${candidate.user_id}`} legacyBehavior>
                          <a style={{ 
                            color: "#fff", 
                            background: candidate.has_assessment ? "#1565c0" : "#9E9E9E", 
                            padding: "8px 16px", 
                            borderRadius: "6px",
                            textDecoration: "none",
                            display: "inline-block",
                            fontWeight: "500",
                            cursor: candidate.has_assessment ? "pointer" : "default"
                          }}>
                            {candidate.has_assessment ? "View Report" : "No Data"}
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
