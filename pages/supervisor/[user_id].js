import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function SupervisorDashboard() {
  const router = useRouter();
  const { user_id } = router.query;
  const [supervisor, setSupervisor] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week");
  const [stats, setStats] = useState({
    totalAssessments: 0,
    completedAssessments: 0,
    averageScore: 0,
    highPotential: 0,
    byType: {}
  });

  // Assessment type configuration for supervisor view - ONE PER TYPE
  const assessmentTypes = [
    { id: 'all', label: '📋 All Assessments', color: '#64748b' },
    { id: 'general', label: '📋 General', icon: '📋', color: '#4A6FA5' },
    { id: 'behavioral', label: '🧠 Behavioral', icon: '🧠', color: '#9C27B0' },
    { id: 'cognitive', label: '💡 Cognitive', icon: '💡', color: '#FF9800' },
    { id: 'cultural', label: '🤝 Cultural', icon: '🤝', color: '#4CAF50' },
    { id: 'manufacturing', label: '⚙️ Manufacturing', icon: '⚙️', color: '#F44336' },
    { id: 'leadership', label: '👑 Leadership', icon: '👑', color: '#FFC107' }
  ];

  useEffect(() => {
    if (user_id) {
      fetchSupervisorData();
      fetchCandidates();
    }
  }, [user_id]);

  useEffect(() => {
    if (candidates.length > 0) {
      calculateStats();
    }
  }, [candidates, selectedAssessmentType, dateRange]);

  const fetchSupervisorData = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisors")
        .select("*")
        .eq("id", user_id)
        .single();

      if (error) throw error;
      setSupervisor(data);
    } catch (error) {
      console.error("Error fetching supervisor:", error);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      // Get all completed assessments with user and assessment details
      const { data: results, error } = await supabase
        .from("assessment_results")
        .select(`
          *,
          assessments (
            id,
            name,
            assessment_type,
            passing_score,
            icon_name
          )
        `)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      // Group by user
      const candidateMap = new Map();
      
      results?.forEach(result => {
        if (!candidateMap.has(result.user_id)) {
          candidateMap.set(result.user_id, {
            user_id: result.user_id,
            user_name: result.user_name || result.user_email?.split('@')[0] || 'Unknown',
            user_email: result.user_email,
            assessments: [],
            averageScore: 0,
            completedCount: 0,
            lastActive: result.completed_at
          });
        }
        
        const candidate = candidateMap.get(result.user_id);
        candidate.assessments.push({
          ...result,
          passed: result.overall_score >= (result.assessments?.passing_score || 60)
        });
        candidate.completedCount++;
        candidate.averageScore = candidate.assessments.reduce((sum, a) => sum + a.overall_score, 0) / candidate.completedCount;
      });

      setCandidates(Array.from(candidateMap.values()));
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let filteredAssessments = [];
    
    // Filter candidates based on selection
    candidates.forEach(candidate => {
      candidate.assessments.forEach(assessment => {
        if (selectedAssessmentType === "all" || assessment.assessments?.assessment_type === selectedAssessmentType) {
          
          // Filter by date range
          const completedDate = new Date(assessment.completed_at);
          const now = new Date();
          let include = true;
          
          switch(dateRange) {
            case "today":
              include = completedDate.toDateString() === now.toDateString();
              break;
            case "week":
              const weekAgo = new Date(now.setDate(now.getDate() - 7));
              include = completedDate >= weekAgo;
              break;
            case "month":
              const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
              include = completedDate >= monthAgo;
              break;
            default:
              include = true;
          }
          
          if (include) {
            filteredAssessments.push(assessment);
          }
        }
      });
    });

    // Calculate stats
    const total = filteredAssessments.length;
    const totalScore = filteredAssessments.reduce((sum, a) => sum + a.overall_score, 0);
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
    const highPotential = filteredAssessments.filter(a => a.overall_score >= 80).length;

    // Calculate by assessment type
    const byType = {};
    filteredAssessments.forEach(assessment => {
      const type = assessment.assessments?.assessment_type || 'unknown';
      if (!byType[type]) {
        byType[type] = { count: 0, totalScore: 0, average: 0 };
      }
      byType[type].count++;
      byType[type].totalScore += assessment.overall_score;
    });

    Object.keys(byType).forEach(type => {
      byType[type].average = Math.round(byType[type].totalScore / byType[type].count);
    });

    setStats({
      totalAssessments: total,
      completedAssessments: total,
      averageScore: avgScore,
      highPotential: highPotential,
      byType
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 65) return '#2196F3';
    if (score >= 50) return '#FF9800';
    return '#F44336';
  };

  const getRiskBadge = (riskLevel) => {
    switch(riskLevel) {
      case 'high':
        return { label: '⚠️ High Risk', color: '#F44336', bg: '#FFEBEE' };
      case 'medium':
        return { label: '⚡ Medium Risk', color: '#FF9800', bg: '#FFF3E0' };
      default:
        return { label: '✅ Low Risk', color: '#4CAF50', bg: '#E8F5E9' };
    }
  };

  const getReadinessBadge = (readiness) => {
    switch(readiness) {
      case 'ready':
        return { label: '🚀 Ready', color: '#4CAF50', bg: '#E8F5E9' };
      case 'needs_development':
        return { label: '📚 Needs Development', color: '#FF9800', bg: '#FFF3E0' };
      case 'not_ready':
        return { label: '⚠️ Not Ready', color: '#F44336', bg: '#FFEBEE' };
      default:
        return { label: '⏳ Pending', color: '#64748b', bg: '#F1F5F9' };
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "20px", color: "#667eea" }}>Loading Dashboard...</div>
          <div style={{ 
            width: "50px", 
            height: "50px", 
            border: "5px solid #e2e8f0",
            borderTop: "5px solid #667eea",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }} />
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div style={{
        padding: "30px 20px",
        background: "#f8fafc",
        minHeight: "100vh"
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
              <div>
                <h1 style={{ margin: "0 0 10px 0", fontSize: "32px", color: "#1a2639", fontWeight: "700" }}>
                  👋 Welcome, {supervisor?.name || 'Supervisor'}
                </h1>
                <p style={{ color: "#64748b", margin: 0, fontSize: "16px" }}>
                  Overview of candidate assessments and performance metrics across all assessment types
                </p>
              </div>
              
              {/* Date Range Filter */}
              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    background: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="today">Today</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}>
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "25px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              borderBottom: "4px solid #667eea"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Assessments
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#1a2639" }}>
                {stats.totalAssessments}
              </div>
              <div style={{ fontSize: "12px", color: "#4CAF50", marginTop: "10px" }}>
                ↑ Completed assessments
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "25px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              borderBottom: "4px solid #4CAF50"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Average Score
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#1a2639" }}>
                {stats.averageScore}%
              </div>
              <div style={{ fontSize: "12px", color: stats.averageScore >= 70 ? "#4CAF50" : "#FF9800", marginTop: "10px" }}>
                {stats.averageScore >= 70 ? '✓ Above target' : '⚠ Below target (70%)'}
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "25px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              borderBottom: "4px solid #FFC107"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                High Potential
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#1a2639" }}>
                {stats.highPotential}
              </div>
              <div style={{ fontSize: "12px", color: "#FF9800", marginTop: "10px" }}>
                Candidates scoring 80%+
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "25px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              borderBottom: "4px solid #9C27B0"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Candidates
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#1a2639" }}>
                {candidates.length}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "10px" }}>
                Completed at least 1 assessment
              </div>
            </div>
          </div>

          {/* Assessment Type Filter */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "30px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}>
            <div style={{ marginBottom: "15px", fontSize: "14px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Filter by Assessment Type:
            </div>
            <div style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap"
            }}>
              {assessmentTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedAssessmentType(type.id)}
                  style={{
                    padding: "12px 24px",
                    background: selectedAssessmentType === type.id ? type.color : "white",
                    color: selectedAssessmentType === type.id ? "white" : "#64748b",
                    border: selectedAssessmentType === type.id ? "none" : "2px solid #e2e8f0",
                    borderRadius: "40px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: selectedAssessmentType === type.id ? "600" : "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{type.icon || type.label.split(' ')[0]}</span>
                  {type.label}
                  {selectedAssessmentType === type.id && stats.byType[type.id] && (
                    <span style={{
                      background: "rgba(255,255,255,0.2)",
                      padding: "2px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {stats.byType[type.id]?.count || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Candidates Table */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "25px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px",
              flexWrap: "wrap",
              gap: "15px"
            }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1a2639", fontWeight: "600" }}>
                Candidate Performance
              </h2>
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="🔍 Search candidates..."
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    width: "250px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
                <button style={{
                  padding: "12px 25px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#5a67d8"}
                onMouseOut={(e) => e.currentTarget.style.background = "#667eea"}>
                  📊 Export Report
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>📊</div>
                <h3 style={{ color: "#64748b", marginBottom: "10px", fontSize: "20px" }}>No Data Available</h3>
                <p style={{ color: "#94a3b8", fontSize: "16px" }}>Candidates haven't completed any assessments yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Candidate</th>
                      <th style={{ textAlign: "left", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</th>
                      <th style={{ textAlign: "center", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Completed</th>
                      <th style={{ textAlign: "center", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg Score</th>
                      <th style={{ textAlign: "center", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Risk Level</th>
                      <th style={{ textAlign: "center", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Readiness</th>
                      <th style={{ textAlign: "center", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Active</th>
                      <th style={{ textAlign: "center", padding: "15px 10px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates
                      .filter(candidate => {
                        if (selectedAssessmentType === "all") return true;
                        return candidate.assessments.some(a => a.assessments?.assessment_type === selectedAssessmentType);
                      })
                      .map(candidate => (
                        <tr key={candidate.user_id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                          onMouseOut={(e) => e.currentTarget.style.background = "white"}>
                          <td style={{ padding: "15px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                fontWeight: "600"
                              }}>
                                {candidate.user_name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <span style={{ fontWeight: "600", color: "#1a2639" }}>
                                {candidate.user_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "15px 10px", color: "#64748b", fontSize: "14px" }}>
                            {candidate.user_email}
                          </td>
                          <td style={{ padding: "15px 10px", textAlign: "center" }}>
                            <span style={{
                              background: "#E8F5E9",
                              color: "#2E7D32",
                              padding: "6px 14px",
                              borderRadius: "30px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {candidate.completedCount}/6
                            </span>
                          </td>
                          <td style={{ padding: "15px 10px", textAlign: "center" }}>
                            <span style={{
                              color: getScoreColor(candidate.averageScore),
                              fontWeight: "700",
                              fontSize: "18px"
                            }}>
                              {Math.round(candidate.averageScore)}%
                            </span>
                          </td>
                          <td style={{ padding: "15px 10px", textAlign: "center" }}>
                            {candidate.assessments[0] && (
                              <span style={{
                                background: getRiskBadge(candidate.assessments[0].risk_level).bg,
                                color: getRiskBadge(candidate.assessments[0].risk_level).color,
                                padding: "6px 14px",
                                borderRadius: "30px",
                                fontSize: "12px",
                                fontWeight: "600",
                                display: "inline-block"
                              }}>
                                {getRiskBadge(candidate.assessments[0].risk_level).label}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "15px 10px", textAlign: "center" }}>
                            {candidate.assessments[0] && (
                              <span style={{
                                background: getReadinessBadge(candidate.assessments[0].readiness).bg,
                                color: getReadinessBadge(candidate.assessments[0].readiness).color,
                                padding: "6px 14px",
                                borderRadius: "30px",
                                fontSize: "12px",
                                fontWeight: "600",
                                display: "inline-block"
                              }}>
                                {getReadinessBadge(candidate.assessments[0].readiness).label}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "15px 10px", textAlign: "center", color: "#64748b", fontSize: "13px", fontWeight: "500" }}>
                            {new Date(candidate.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: "15px 10px", textAlign: "center" }}>
                            <button
                              onClick={() => setSelectedCandidate(candidate)}
                              style={{
                                padding: "8px 18px",
                                background: "transparent",
                                color: "#667eea",
                                border: "2px solid #667eea",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "600",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "#667eea";
                                e.currentTarget.style.color = "white";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#667eea";
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assessment Type Performance Summary - 6 CARDS FOR 6 TYPES */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginTop: "30px"
          }}>
            {assessmentTypes.filter(t => t.id !== 'all').map(type => {
              const typeStats = stats.byType[type.id] || { count: 0, average: 0 };
              
              return (
                <div key={type.id} style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "25px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  borderLeft: `6px solid ${type.color}`,
                  transition: "transform 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    marginBottom: "20px"
                  }}>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "12px",
                      background: type.lightColor || `${type.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px"
                    }}>
                      {type.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1a2639" }}>
                        {type.label}
                      </h3>
                      <p style={{ margin: "5px 0 0", fontSize: "13px", color: "#64748b" }}>
                        {typeStats.count} completed assessments
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Average Score
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: "700", color: type.color }}>
                        {typeStats.average}%
                      </div>
                    </div>
                    <div style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      background: `conic-gradient(${type.color} ${typeStats.average * 3.6}deg, #f1f5f9 0deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        background: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "700",
                        color: type.color
                      }}>
                        {typeStats.average}%
                      </div>
                    </div>
                  </div>
                  
                  {typeStats.count === 0 && (
                    <div style={{
                      marginTop: "15px",
                      fontSize: "12px",
                      color: "#94a3b8",
                      fontStyle: "italic",
                      textAlign: "center",
                      padding: "8px",
                      background: "#f8fafc",
                      borderRadius: "8px"
                    }}>
                      No completed assessments yet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "35px",
            maxWidth: "800px",
            width: "100%",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.2)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "25px"
            }}>
              <div>
                <h2 style={{ margin: "0 0 5px 0", color: "#1a2639", fontSize: "28px", fontWeight: "700" }}>
                  {selectedCandidate.user_name}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>
                  {selectedCandidate.user_email}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "0 10px"
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "30px"
            }}>
              <div style={{
                background: "#f8fafc",
                padding: "20px",
                borderRadius: "12px"
              }}>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Overall Performance
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: getScoreColor(selectedCandidate.averageScore) }}>
                  {Math.round(selectedCandidate.averageScore)}%
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>
                  Average across {selectedCandidate.completedCount} assessments
                </div>
              </div>
              <div style={{
                background: "#f8fafc",
                padding: "20px",
                borderRadius: "12px"
              }}>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Completion Status
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "#667eea" }}>
                  {selectedCandidate.completedCount}/6
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>
                  Assessments completed
                </div>
              </div>
            </div>

            <h3 style={{ margin: "0 0 15px", fontSize: "18px", color: "#1a2639", fontWeight: "600" }}>
              Assessment History
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "30px" }}>
              {selectedCandidate.assessments.map((assessment, index) => {
                const typeConfig = assessmentTypes.find(t => t.id === assessment.assessments?.assessment_type) || assessmentTypes[0];
                
                return (
                  <div key={index} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    borderLeft: `6px solid ${typeConfig.color}`,
                    flexWrap: "wrap",
                    gap: "15px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <div style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "10px",
                        background: `${typeConfig.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px"
                      }}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: "#1a2639", marginBottom: "5px", fontSize: "16px" }}>
                          {assessment.assessments?.name || 'Assessment'}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", display: "flex", gap: "15px" }}>
                          <span>📅 {new Date(assessment.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>⏱️ {Math.floor(assessment.time_spent / 60)}m</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "700", color: getScoreColor(assessment.overall_score) }}>
                          {assessment.overall_score}%
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Score</div>
                      </div>
                      
                      <span style={{
                        padding: "6px 16px",
                        borderRadius: "30px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: assessment.passed ? "#E8F5E9" : "#FFEBEE",
                        color: assessment.passed ? "#2E7D32" : "#C62828"
                      }}>
                        {assessment.passed ? '✓ Passed' : '✗ Failed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "15px"
            }}>
              <button
                onClick={() => setSelectedCandidate(null)}
                style={{
                  padding: "12px 25px",
                  background: "white",
                  color: "#64748b",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Close
              </button>
              <button style={{
                padding: "12px 30px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                📄 Download Full Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
