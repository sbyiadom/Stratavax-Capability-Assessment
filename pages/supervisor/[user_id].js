import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

// ===== BACKGROUND CONFIGURATION =====
const BACKGROUND_CONFIG = {
  bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
  pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
  overlay: 'linear-gradient(135deg, rgba(37,99,235,0.95) 0%, rgba(29,78,216,0.95) 100%)'
};

// ===== ASSESSMENT TYPE CONFIGURATIONS =====
const assessmentTypes = [
  { 
    id: 'general', 
    label: 'General Assessment', 
    shortLabel: 'General',
    icon: '📋', 
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #6B8EC9)',
    lightGradient: 'linear-gradient(135deg, #4A6FA520, #6B8EC920)',
    description: 'Comprehensive 5-area evaluation',
    maxScore: 450
  },
  { 
    id: 'behavioral', 
    label: 'Behavioral & Soft Skills', 
    shortLabel: 'Behavioral',
    icon: '🧠', 
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    lightGradient: 'linear-gradient(135deg, #9C27B020, #BA68C820)',
    description: 'Communication, teamwork, emotional intelligence',
    maxScore: 100
  },
  { 
    id: 'cognitive', 
    label: 'Cognitive & Thinking Skills', 
    shortLabel: 'Cognitive',
    icon: '💡', 
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    lightGradient: 'linear-gradient(135deg, #FF980020, #FFB74D20)',
    description: 'Problem-solving, critical thinking, analysis',
    maxScore: 100
  },
  { 
    id: 'cultural', 
    label: 'Cultural & Attitudinal Fit', 
    shortLabel: 'Cultural',
    icon: '🤝', 
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    lightGradient: 'linear-gradient(135deg, #4CAF5020, #81C78420)',
    description: 'Values alignment, organizational fit',
    maxScore: 100
  },
  { 
    id: 'manufacturing', 
    label: 'Manufacturing Technical Skills', 
    shortLabel: 'Manufacturing',
    icon: '⚙️', 
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #EF5350)',
    lightGradient: 'linear-gradient(135deg, #F4433620, #EF535020)',
    description: 'Technical skills, equipment knowledge',
    maxScore: 100
  },
  { 
    id: 'leadership', 
    label: 'Leadership Potential', 
    shortLabel: 'Leadership',
    icon: '👑', 
    color: '#FFC107',
    gradient: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    lightGradient: 'linear-gradient(135deg, #FFC10720, #FFD54F20)',
    description: 'Vision, influence, team development',
    maxScore: 100
  }
];

// Helper functions
const getScoreColor = (score) => {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

const getScoreGradient = (score) => {
  if (score >= 80) return 'linear-gradient(135deg, #10b981, #059669)';
  if (score >= 65) return 'linear-gradient(135deg, #3b82f6, #2563eb)';
  if (score >= 50) return 'linear-gradient(135deg, #f59e0b, #d97706)';
  return 'linear-gradient(135deg, #ef4444, #dc2626)';
};

const getClassificationColor = (classification) => {
  switch(classification?.toLowerCase()) {
    case 'elite talent':
      return '#2E7D32';
    case 'top talent':
      return '#4CAF50';
    case 'high potential':
      return '#2196F3';
    case 'solid performer':
      return '#FF9800';
    case 'developing talent':
      return '#9C27B0';
    case 'emerging talent':
      return '#795548';
    default:
      return '#F44336';
  }
};

const getScoreFromTotal = (totalScore) => {
  // Convert total score (max 450) to percentage
  return Math.round((totalScore / 450) * 100);
};

// Assessment Card Component
const AssessmentCard = ({ type, score }) => {
  const percentage = Math.round((score / type.maxScore) * 100);
  const scoreColor = getScoreColor(percentage);
  
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '1px solid #eef2f6',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: type.lightGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}>
          {type.icon}
        </div>
        <div>
          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '16px' }}>
            {type.shortLabel}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {type.description}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Score</span>
          <span style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: scoreColor 
          }}>
            {score}/{type.maxScore}
          </span>
        </div>
        
        {/* Progress bar */}
        <div style={{
          height: '8px',
          background: '#e2e8f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${percentage}%`,
            background: getScoreGradient(percentage),
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '4px',
          fontSize: '12px',
          fontWeight: '600',
          color: scoreColor
        }}>
          {percentage}%
        </div>
      </div>

      <div style={{
        padding: '12px',
        background: type.lightGradient,
        borderRadius: '8px',
        fontSize: '13px',
        color: type.color,
        border: `1px solid ${type.color}20`
      }}>
        <strong>Assessment Summary:</strong> {score >= type.maxScore * 0.8 ? 'Excellent' : 
          score >= type.maxScore * 0.65 ? 'Good' :
          score >= type.maxScore * 0.5 ? 'Average' : 'Needs Improvement'}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, color = '#3b82f6' }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f6',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
  }}>
    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>
      {title}
    </div>
    <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
      {subtitle}
    </div>
  </div>
);

// Candidate Detail Modal Component
const CandidateDetailModal = ({ candidate, onClose }) => {
  if (!candidate) return null;
  
  const percentageScore = getScoreFromTotal(candidate.total_score);
  const scoreColor = getScoreColor(percentageScore);
  const classificationColor = getClassificationColor(candidate.classification);
  
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
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
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
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            fontSize: '20px',
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
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, #3b82f6, #2563eb)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '600',
            boxShadow: '0 8px 16px rgba(59,130,246,0.3)'
          }}>
            {candidate.full_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '24px', fontWeight: '700' }}>
              {candidate.full_name}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              {candidate.email}
            </p>
          </div>
        </div>

        {/* Score Card */}
        <div style={{
          background: getScoreGradient(percentageScore),
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          marginBottom: '20px',
          boxShadow: `0 8px 20px ${scoreColor}40`
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>
            Overall Assessment Result
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', marginBottom: '8px' }}>
            {percentageScore}%
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            {candidate.classification}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Total Score: {candidate.total_score}/450
          </div>
        </div>

        {/* Details */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Candidate ID:</span>
            <span style={{ color: '#1e293b', fontWeight: '500', fontSize: '13px' }}>
              {candidate.user_id.substring(0, 16)}...
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Assessment Date:</span>
            <span style={{ color: '#1e293b', fontWeight: '500', fontSize: '13px' }}>
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            Close
          </button>
          <button style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
          }}
          onClick={() => {
            // Generate detailed report
            const reportContent = `
CANDIDATE ASSESSMENT REPORT
============================
Name: ${candidate.full_name}
Email: ${candidate.email}
Classification: ${candidate.classification}
Total Score: ${candidate.total_score}/450 (${percentageScore}%)

ASSESSMENT BREAKDOWN:
- General Assessment: ${candidate.total_score}/450
- Behavioral & Soft Skills: Pending
- Cognitive Skills: Pending
- Cultural Fit: Pending
- Manufacturing Skills: Pending
- Leadership Potential: Pending

Report generated: ${new Date().toLocaleString()}
            `;
            
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${candidate.full_name || 'candidate'}_assessment_report.txt`;
            a.click();
          }}>
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
    eliteTalent: 0,
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
        setCandidates(data);
        
        // Calculate stats
        const totalCandidates = data.length;
        const avgScore = data.reduce((sum, c) => sum + getScoreFromTotal(c.total_score), 0) / totalCandidates;
        const eliteTalent = data.filter(c => c.classification?.toLowerCase() === "elite talent").length;
        const topTalent = data.filter(c => c.classification?.toLowerCase() === "top talent").length;
        const highPotential = data.filter(c => c.classification?.toLowerCase() === "high potential").length;

        setStats({
          totalCandidates,
          averageScore: Math.round(avgScore),
          eliteTalent,
          topTalent,
          highPotential
        });
      } else {
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
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div style={{ fontSize: '16px', color: '#1e293b', fontWeight: '500' }}>
            Loading Dashboard
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
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
            background: "white",
            borderRadius: "16px",
            padding: "24px 30px",
            marginBottom: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid #eef2f6"
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
                  margin: "0 0 4px 0", 
                  fontSize: "28px",
                  color: "#1e293b",
                  fontWeight: "700"
                }}>
                  Welcome, {supervisor?.name || 'Supervisor'}
                </h1>
                <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                  Viewing {candidates.length} candidate records
                </p>
                {error && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#b91c1c',
                    fontSize: '13px'
                  }}>
                    Error: {error}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => router.push("/supervisor")}
                style={{
                  padding: "10px 20px",
                  background: "white",
                  color: "#3b82f6",
                  border: "1px solid #3b82f6",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#3b82f6";
                  e.currentTarget.style.color = "white";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "#3b82f6";
                }}
              >
                ← Back to Overview
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}>
            <StatCard
              title="Total Candidates"
              value={stats.totalCandidates}
              subtitle="Completed assessments"
            />
            
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle="Overall performance"
              color={stats.averageScore >= 80 ? '#10b981' : '#f59e0b'}
            />
            
            <StatCard
              title="Elite & Top Talent"
              value={stats.eliteTalent + stats.topTalent}
              subtitle="Top performers"
              color="#10b981"
            />
            
            <StatCard
              title="High Potential"
              value={stats.highPotential}
              subtitle="Future leaders"
              color="#3b82f6"
            />
          </div>

          {/* Candidates Table */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid #eef2f6"
          }}>
            {/* Table Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "15px"
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#1e293b", fontWeight: "600" }}>
                  Candidate Results
                </h2>
                <span style={{
                  background: '#f1f5f9',
                  padding: '4px 12px',
                  borderRadius: '30px',
                  fontSize: '13px',
                  color: '#475569',
                  fontWeight: '500'
                }}>
                  {filteredCandidates.length} candidates
                </span>
              </div>
              
              <div style={{ position: 'relative', width: '300px' }}>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    width: "100%",
                    fontSize: "14px",
                    outline: "none",
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px 20px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}>
                <h3 style={{ color: "#1e293b", marginBottom: "8px", fontSize: "16px", fontWeight: "600" }}>
                  {searchTerm ? 'No matching candidates' : 'No Data Available'}
                </h3>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
                  {searchTerm 
                    ? `No candidates found matching "${searchTerm}"`
                    : "No candidates have completed the assessment yet."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      padding: '10px 20px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: "1px solid #e2e8f0",
                      background: '#f8fafc'
                    }}>
                      <th style={{ textAlign: "left", padding: "14px 16px", color: "#475569", fontWeight: "600" }}>
                        Candidate
                      </th>
                      <th style={{ textAlign: "left", padding: "14px 16px", color: "#475569", fontWeight: "600" }}>
                        Email
                      </th>
                      <th style={{ textAlign: "center", padding: "14px 16px", color: "#475569", fontWeight: "600" }}>
                        Total Score
                      </th>
                      <th style={{ textAlign: "center", padding: "14px 16px", color: "#475569", fontWeight: "600" }}>
                        Percentage
                      </th>
                      <th style={{ textAlign: "center", padding: "14px 16px", color: "#475569", fontWeight: "600" }}>
                        Classification
                      </th>
                      <th style={{ textAlign: "center", padding: "14px 16px", color: "#475569", fontWeight: "600" }}>
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
                            borderBottom: '1px solid #eef2f6',
                            background: hoveredRow === candidate.user_id ? '#f8fafc' : 'white',
                            transition: 'background 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: '500', color: '#1e293b' }}>
                              {candidate.full_name || 'Unnamed Candidate'}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ color: '#3b82f6', fontSize: '14px' }}>
                              {candidate.email || 'No email'}
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>
                              {candidate.total_score}/450
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '30px',
                              background: `${scoreColor}15`,
                              color: scoreColor,
                              fontWeight: '600',
                              fontSize: '14px'
                            }}>
                              {percentageScore}%
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{
                              color: classificationColor,
                              fontWeight: '500',
                              fontSize: '14px'
                            }}>
                              {candidate.classification}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCandidate(candidate);
                              }}
                              style={{
                                padding: '6px 16px',
                                background: 'transparent',
                                color: '#3b82f6',
                                border: '1px solid #3b82f6',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#3b82f6';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#3b82f6';
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
