import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

// Helper function to get classification from score (based on assessment type)
const getClassificationFromScore = (score, assessmentType = 'general') => {
  if (assessmentType === 'general') {
    if (score >= 450) return "Elite Talent";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid Performer";
    if (score >= 250) return "Developing Talent";
    if (score >= 200) return "Emerging Talent";
    return "Needs Improvement";
  } else {
    // For other assessments (max score 100)
    if (score >= 90) return "Exceptional";
    if (score >= 80) return "Advanced";
    if (score >= 70) return "Proficient";
    if (score >= 60) return "Developing";
    if (score >= 50) return "Basic";
    return "Needs Improvement";
  }
};

// Helper function to get classification color
const getClassificationColor = (score, assessmentType = 'general') => {
  if (assessmentType === 'general') {
    if (score >= 450) return "#2E7D32";
    if (score >= 400) return "#4CAF50";
    if (score >= 350) return "#2196F3";
    if (score >= 300) return "#FF9800";
    if (score >= 250) return "#9C27B0";
    if (score >= 200) return "#795548";
    return "#F44336";
  } else {
    if (score >= 90) return "#2E7D32";
    if (score >= 80) return "#4CAF50";
    if (score >= 70) return "#2196F3";
    if (score >= 60) return "#FF9800";
    if (score >= 50) return "#9C27B0";
    return "#F44336";
  }
};

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('all');
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAssessments: 0,
    general: 0,
    leadership: 0,
    cognitive: 0,
    technical: 0,
    personality: 0,
    performance: 0
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

  // Fetch candidates and stats from the new view
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch from the new view
        const { data: candidatesData, error } = await supabase
          .from("supervisor_candidates_view")
          .select("*")
          .order("last_assessment", { ascending: false });

        if (error) {
          console.error("Error fetching data:", error);
          // Fallback to direct query if view doesn't exist
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("candidate_assessments_taken")
            .select(`
              user_id,
              assessment_type,
              assessment_name,
              score,
              completed_at,
              users (
                email,
                raw_user_meta_data
              )
            `)
            .order("completed_at", { ascending: false });

          if (fallbackError) throw fallbackError;
          
          // Process fallback data
          const candidatesMap = new Map();
          
          fallbackData.forEach(item => {
            const userId = item.user_id;
            if (!candidatesMap.has(userId)) {
              candidatesMap.set(userId, {
                user_id: userId,
                email: item.users?.email,
                full_name: item.users?.raw_user_meta_data?.full_name || 
                          item.users?.raw_user_meta_data?.name || 
                          'Unknown',
                assessments_taken: [],
                total_assessments: 0,
                assessment_breakdown: {}
              });
            }
            
            const candidate = candidatesMap.get(userId);
            candidate.assessments_taken.push({
              assessment_type: item.assessment_type,
              assessment_name: item.assessment_name,
              completed_at: item.completed_at,
              score: item.score
            });
            candidate.total_assessments++;
          });
          
          setCandidates(Array.from(candidatesMap.values()));
        } else {
          setCandidates(candidatesData || []);
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

  // Calculate stats whenever candidates change
  useEffect(() => {
    if (candidates.length > 0) {
      const newStats = {
        totalCandidates: candidates.length,
        totalAssessments: candidates.reduce((sum, c) => sum + (c.total_assessments || 0), 0),
        general: 0,
        leadership: 0,
        cognitive: 0,
        technical: 0,
        personality: 0,
        performance: 0
      };

      candidates.forEach(candidate => {
        if (candidate.assessment_breakdown) {
          newStats.general += candidate.assessment_breakdown.general || 0;
          newStats.leadership += candidate.assessment_breakdown.leadership || 0;
          newStats.cognitive += candidate.assessment_breakdown.cognitive || 0;
          newStats.technical += candidate.assessment_breakdown.technical || 0;
          newStats.personality += candidate.assessment_breakdown.personality || 0;
          newStats.performance += candidate.assessment_breakdown.performance || 0;
        }
      });

      setStats(newStats);
      
      // Get unique assessment types
      const types = new Set();
      candidates.forEach(candidate => {
        if (candidate.assessments_taken) {
          candidate.assessments_taken.forEach(a => types.add(a.assessment_type));
        }
      });
      setAssessmentTypes(['all', ...Array.from(types)]);
    }
  }, [candidates]);

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  // Filter candidates based on selected assessment type
  const filteredCandidates = selectedAssessmentType === 'all' 
    ? candidates 
    : candidates.filter(c => 
        c.assessments_taken?.some(a => a.assessment_type === selectedAssessmentType)
      );

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
              Multi-Assessment Talent Analytics & Management
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
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "20px", 
          marginBottom: "40px" 
        }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Candidates</div>
            <div style={{ fontSize: "32px", fontWeight: "700", margin: "5px 0" }}>
              {stats.totalCandidates}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Assessments</div>
            <div style={{ fontSize: "32px", fontWeight: "700", margin: "5px 0" }}>
              {stats.totalAssessments}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>General</div>
            <div style={{ fontSize: "32px", fontWeight: "700", margin: "5px 0" }}>
              {stats.general}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Leadership</div>
            <div style={{ fontSize: "32px", fontWeight: "700", margin: "5px 0" }}>
              {stats.leadership}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Cognitive</div>
            <div style={{ fontSize: "32px", fontWeight: "700", margin: "5px 0" }}>
              {stats.cognitive}
            </div>
          </div>
        </div>

        {/* Assessment Type Filter */}
        <div style={{ 
          background: "white", 
          padding: "20px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "600", color: "#333" }}>Filter by Assessment:</span>
            {assessmentTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedAssessmentType(type)}
                style={{
                  padding: "8px 16px",
                  background: selectedAssessmentType === type ? "#1565c0" : "#f0f0f0",
                  color: selectedAssessmentType === type ? "white" : "#333",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: selectedAssessmentType === type ? "600" : "400",
                  textTransform: "capitalize"
                }}
              >
                {type === 'all' ? 'All Assessments' : type}
              </button>
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
              {loading ? "Loading..." : `${filteredCandidates.length} candidate${filteredCandidates.length !== 1 ? 's' : ''} found`}
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
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "20px", opacity: 0.3 }}>📊</div>
              <h3 style={{ color: "#666", marginBottom: "10px" }}>No Assessment Data Yet</h3>
              <p style={{ color: "#888", maxWidth: "500px", margin: "0 auto 25px" }}>
                When candidates complete their assessments, their results will appear here.
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
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Candidate</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Contact</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Assessments Taken</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Latest Score</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Classification</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Last Completed</th>
                    <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const latestAssessment = candidate.assessments_taken?.[0] || {};
                    const score = latestAssessment.score || 0;
                    const assessmentType = latestAssessment.assessment_type || 'general';
                    
                    return (
                      <tr key={candidate.user_id} style={{ 
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s"
                      }}>
                        <td style={{ padding: "15px", fontWeight: "500" }}>
                          {candidate.full_name}
                          <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
                            ID: {candidate.user_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td style={{ padding: "15px" }}>
                          <div style={{ fontSize: "14px", color: "#1565c0" }}>
                            {candidate.email}
                          </div>
                        </td>
                        <td style={{ padding: "15px" }}>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {candidate.assessment_breakdown && Object.entries(candidate.assessment_breakdown).map(([type, count]) => 
                              count > 0 && (
                                <span key={type} style={{
                                  padding: "4px 8px",
                                  background: "#e3f2fd",
                                  color: "#1565c0",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  textTransform: "capitalize"
                                }}>
                                  {type}: {count}
                                </span>
                              )
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "5px" }}>
                            Total: {candidate.total_assessments} assessment{candidate.total_assessments !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td style={{ padding: "15px", fontWeight: "500" }}>
                          <div style={{ 
                            display: "inline-block",
                            padding: "5px 12px",
                            background: score >= 400 ? "#e8f5e9" : 
                                      score >= 350 ? "#e3f2fd" :
                                      score >= 300 ? "#fff3e0" : 
                                      score >= 250 ? "#f3e5f5" :
                                      score >= 200 ? "#efebe9" : "#ffebee",
                            color: score >= 400 ? "#2e7d32" : 
                                  score >= 350 ? "#1565c0" :
                                  score >= 300 ? "#f57c00" : 
                                  score >= 250 ? "#7b1fa2" :
                                  score >= 200 ? "#5d4037" : "#c62828",
                            borderRadius: "20px",
                            fontWeight: "600",
                            fontSize: "14px"
                          }}>
                            {score}/{assessmentType === 'general' ? 500 : 100}
                          </div>
                        </td>
                        <td style={{ padding: "15px" }}>
                          <span style={{ 
                            color: getClassificationColor(score, assessmentType),
                            fontWeight: "600",
                            padding: "6px 12px",
                            background: `${getClassificationColor(score, assessmentType)}15`,
                            borderRadius: "6px",
                            display: "inline-block",
                            fontSize: "13px"
                          }}>
                            {getClassificationFromScore(score, assessmentType)}
                          </span>
                        </td>
                        <td style={{ padding: "15px", fontSize: "13px", color: "#666" }}>
                          {latestAssessment.completed_at ? new Date(latestAssessment.completed_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: "15px" }}>
                          <Link href={`/supervisor/${candidate.user_id}`} legacyBehavior>
                            <a style={{ 
                              color: "#fff", 
                              background: "#1565c0", 
                              padding: "8px 16px", 
                              borderRadius: "6px",
                              textDecoration: "none",
                              display: "inline-block",
                              fontWeight: "500",
                              fontSize: "14px"
                            }}>
                              View Reports
                            </a>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}
