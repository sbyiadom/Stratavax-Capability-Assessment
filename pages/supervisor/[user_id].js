import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

// ===== BACKGROUND CONFIGURATION =====
const BACKGROUND_CONFIG = {
  bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
  pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
  overlay: 'linear-gradient(135deg, rgba(102,126,234,0.95) 0%, rgba(118,75,162,0.95) 100%)'
};

// Helper functions
const getScoreColor = (score) => {
  if (score >= 80) return '#4CAF50';
  if (score >= 65) return '#2196F3';
  if (score >= 50) return '#FF9800';
  return '#F44336';
};

const getClassificationColor = (classification) => {
  switch(classification?.toLowerCase()) {
    case 'top talent':
      return '#4CAF50';
    case 'high potential':
      return '#2196F3';
    case 'solid performer':
      return '#FF9800';
    default:
      return '#F44336';
  }
};

const getScoreFromTotal = (totalScore) => {
  // Convert total score (max ~450) to percentage
  return Math.round((totalScore / 450) * 100);
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '24px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-5px)';
    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
  }}
  >
    <div style={{
      position: 'absolute',
      top: '15px',
      right: '15px',
      fontSize: '48px',
      opacity: 0.1,
      color: color || '#667eea'
    }}>
      {icon}
    </div>
    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </div>
    <div style={{ fontSize: '42px', fontWeight: '700', color: '#1a2639', marginBottom: '5px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#64748b' }}>
      {subtitle}
    </div>
  </div>
);

// Candidate Detail Modal Component
const CandidateDetailModal = ({ candidate, onClose }) => {
  if (!candidate) return null;
  
  const percentageScore = getScoreFromTotal(candidate.total_score);
  const scoreColor = getScoreColor(percentageScore);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '32px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.transform = 'rotate(0)';
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: `linear-gradient(135deg, #667eea, #764ba2)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: '600',
            boxShadow: '0 15px 30px rgba(102,126,234,0.6)'
          }}>
            {candidate.full_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#1a2639', fontSize: '28px', fontWeight: '700' }}>
              {candidate.full_name}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
              📧 {candidate.email}
            </p>
          </div>
        </div>

        {/* Score Card */}
        <div style={{
          background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}dd)`,
          borderRadius: '24px',
          padding: '30px',
          color: 'white',
          marginBottom: '25px',
          boxShadow: `0 15px 30px ${scoreColor}60`
        }}>
          <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '15px' }}>
            General Assessment Result
          </div>
          <div style={{ fontSize: '64px', fontWeight: '800', marginBottom: '10px' }}>
            {percentageScore}%
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>
            {candidate.classification}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Total Score: {candidate.total_score}/450
          </div>
        </div>

        {/* Details */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '25px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ color: '#64748b' }}>User ID:</span>
            <span style={{ color: '#1a2639', fontWeight: '500' }}>{candidate.user_id}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Assessment:</span>
            <span style={{ color: '#1a2639', fontWeight: '500' }}>General Assessment</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '15px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '14px 28px',
              background: 'white',
              color: '#64748b',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            Close
          </button>
          <button style={{
            padding: '14px 35px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            transition: 'all 0.2s ease',
            boxShadow: '0 8px 20px rgba(102,126,234,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 25px rgba(102,126,234,0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.3)';
          }}
          >
            <span style={{ fontSize: '18px' }}>📄</span>
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SupervisorDashboard() {
  const router = useRouter();
  const { user_id } = router.query;
  const [supervisor, setSupervisor] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    averageScore: 0,
    topTalent: 0,
    highPotential: 0
  });

  useEffect(() => {
    if (user_id) {
      fetchSupervisorData();
      fetchCandidates();
    }
  }, [user_id]);

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
      setError("Failed to load supervisor data");
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Explicitly select only the columns that exist in your table
      const { data, error } = await supabase
        .from("candidate_assessments")
        .select('user_id, total_score, classification, email, full_name')
        .order("total_score", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        setError(`Database error: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        console.log("Candidates found:", data.length);
        setCandidates(data);
        
        // Calculate stats
        const totalCandidates = data.length;
        const avgScore = data.reduce((sum, c) => sum + getScoreFromTotal(c.total_score), 0) / totalCandidates;
        const topTalent = data.filter(c => c.classification?.toLowerCase() === "top talent").length;
        const highPotential = data.filter(c => c.classification?.toLowerCase() === "high potential").length;

        setStats({
          totalCandidates,
          averageScore: Math.round(avgScore),
          topTalent,
          highPotential
        });
      } else {
        console.log("No candidates found");
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate => 
    (candidate.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '50px',
          borderRadius: '30px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
          textAlign: 'center',
          animation: 'slideIn 0.5s ease'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 25px'
          }} />
          <div style={{ fontSize: '20px', color: '#1a2639', fontWeight: '600', marginBottom: '10px' }}>
            Loading Dashboard
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Fetching candidate records...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BACKGROUND_CONFIG.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.05,
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: BACKGROUND_CONFIG.overlay,
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BACKGROUND_CONFIG.pattern})`,
        opacity: 0.03,
        zIndex: 0
      }} />

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: "30px 20px",
        minHeight: "100vh"
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "24px",
            padding: "35px",
            marginBottom: "30px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            animation: 'slideIn 0.5s ease'
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              flexWrap: "wrap", 
              gap: "20px" 
            }}>
              <div>
                <h1 style={{ 
                  margin: "0 0 10px 0", 
                  fontSize: "36px",
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: "800"
                }}>
                  👋 Welcome, {supervisor?.name || 'Supervisor'}
                </h1>
                <p style={{ color: "#64748b", margin: 0, fontSize: "16px" }}>
                  📊 Viewing {candidates.length} candidate records from General Assessment
                </p>
                {error && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px 15px',
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#b91c1c',
                    fontSize: '14px'
                  }}>
                    ❌ Error: {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "25px",
            marginBottom: "30px"
          }}>
            <StatCard
              title="Total Candidates"
              value={stats.totalCandidates}
              subtitle="Completed General Assessment"
              icon="👥"
              color="#667eea"
            />
            
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle="Across all candidates"
              icon="📊"
              color={stats.averageScore >= 80 ? '#4CAF50' : '#FF9800'}
            />
            
            <StatCard
              title="Top Talent"
              value={stats.topTalent}
              subtitle="Classification: Top Talent"
              icon="⭐"
              color="#4CAF50"
            />
            
            <StatCard
              title="High Potential"
              value={stats.highPotential}
              subtitle="Classification: High Potential"
              icon="🚀"
              color="#2196F3"
            />
          </div>

          {/* Candidates Table */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "24px",
            padding: "30px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            animation: 'slideIn 0.5s ease'
          }}>
            {/* Table Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px",
              flexWrap: "wrap",
              gap: "15px"
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ margin: 0, fontSize: "24px", color: "#1a2639", fontWeight: "600" }}>
                  Candidate Results
                </h2>
                <span style={{
                  background: '#667eea20',
                  padding: '6px 16px',
                  borderRadius: '30px',
                  fontSize: '14px',
                  color: '#667eea',
                  fontWeight: '600'
                }}>
                  {filteredCandidates.length} candidates
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: '#94a3b8'
                  }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "14px 20px 14px 45px",
                      borderRadius: "40px",
                      border: "2px solid #e2e8f0",
                      width: "300px",
                      fontSize: "14px",
                      outline: "none",
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                <button style={{
                  padding: "14px 30px",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "white",
                  border: "none",
                  borderRadius: "40px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s ease",
                  boxShadow: "0 8px 20px rgba(102,126,234,0.3)",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 25px rgba(102,126,234,0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.3)';
                }}
                onClick={() => {
                  // Export functionality
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Name,Email,Total Score,Percentage,Classification\n"
                    + candidates.map(c => 
                      `${c.full_name},${c.email},${c.total_score},${getScoreFromTotal(c.total_score)}%,${c.classification}`
                    ).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "candidate_results.csv");
                  document.body.appendChild(link);
                  link.click();
                }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  Export CSV
                </button>
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "80px 20px",
                background: "#f8fafc",
                borderRadius: "16px"
              }}>
                <div style={{ fontSize: "64px", marginBottom: "20px", opacity: 0.5 }}>📊</div>
                <h3 style={{ color: "#1a2639", marginBottom: "10px", fontSize: "20px" }}>
                  {searchTerm ? 'No matching candidates' : 'No Data Available'}
                </h3>
                <p style={{ color: "#64748b", fontSize: "16px" }}>
                  {searchTerm 
                    ? `No candidates found matching "${searchTerm}"`
                    : "No candidates have completed the assessment yet."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      marginTop: '20px',
                      padding: '12px 30px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '40px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: "2px solid #e2e8f0",
                      background: '#f8fafc'
                    }}>
                      <th style={{ textAlign: "left", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Candidate
                      </th>
                      <th style={{ textAlign: "left", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Email
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Total Score
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Percentage
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Classification
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map(candidate => {
                      const percentageScore = getScoreFromTotal(candidate.total_score);
                      const scoreColor = getScoreColor(percentageScore);
                      const classificationColor = getClassificationColor(candidate.classification);
                      
                      return (
                        <tr
                          key={candidate.user_id}
                          onMouseEnter={() => setHoveredRow(candidate.user_id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: hoveredRow === candidate.user_id ? '#f8fafc' : 'white',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <td style={{ padding: '20px 15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '16px',
                                background: `linear-gradient(135deg, #667eea, #764ba2)`,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: '600',
                                boxShadow: '0 8px 16px rgba(102,126,234,0.4)'
                              }}>
                                {candidate.full_name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: '#1a2639', fontSize: '16px', marginBottom: '4px' }}>
                                  {candidate.full_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '20px 15px' }}>
                            <div style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500' }}>
                              {candidate.email}
                            </div>
                          </td>
                          <td style={{ padding: '20px 15px', textAlign: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a2639' }}>
                              {candidate.total_score}/450
                            </span>
                          </td>
                          <td style={{ padding: '20px 15px', textAlign: 'center' }}>
                            <div style={{
                              background: scoreColor + '15',
                              padding: '8px 16px',
                              borderRadius: '30px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: scoreColor
                              }} />
                              <span style={{
                                fontWeight: '700',
                                fontSize: '18px',
                                color: scoreColor
                              }}>
                                {percentageScore}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '20px 15px', textAlign: 'center' }}>
                            <span style={{
                              padding: '6px 16px',
                              borderRadius: '30px',
                              fontSize: '13px',
                              fontWeight: '600',
                              background: classificationColor + '20',
                              color: classificationColor
                            }}>
                              {candidate.classification}
                            </span>
                          </td>
                          <td style={{ padding: '20px 15px', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCandidate(candidate);
                              }}
                              style={{
                                padding: '8px 20px',
                                background: 'transparent',
                                color: '#667eea',
                                border: '1px solid #667eea',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#667eea';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#667eea';
                              }}
                            >
                              View Details
                            </button>
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
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </AppLayout>
  );
}
