import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

// ===== BACKGROUND CONFIGURATIONS =====
const BACKGROUND_CONFIG = {
  gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
  bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
  pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
  overlay: 'rgba(0,0,0,0.8)'
};

// Assessment type configurations for badges
const ASSESSMENT_TYPES = [
  { id: 'general', name: 'General', color: '#4A6FA5', icon: '📋' },
  { id: 'behavioral', name: 'Behavioral', color: '#9C27B0', icon: '🧠' },
  { id: 'cognitive', name: 'Cognitive', color: '#FF9800', icon: '💡' },
  { id: 'cultural', name: 'Cultural', color: '#4CAF50', icon: '🤝' },
  { id: 'manufacturing', name: 'Manufacturing', color: '#F44336', icon: '⚙️' },
  { id: 'leadership', name: 'Leadership', color: '#FFC107', icon: '👑' }
];

// Helper function to get classification from score (out of 500)
const getClassificationFromScore = (score) => {
  if (score >= 480) return { name: "Elite Talent", color: "#00B894" };
  if (score >= 450) return { name: "Top Talent", color: "#0984E3" };
  if (score >= 400) return { name: "High Potential", color: "#FDCB6E" };
  if (score >= 350) return { name: "Solid Performer", color: "#00CEC9" };
  if (score >= 300) return { name: "Developing Talent", color: "#6C5CE7" };
  if (score >= 250) return { name: "Emerging Talent", color: "#E84342" };
  return { name: "Needs Improvement", color: "#D63031" };
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, trend, color = '#2563eb' }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f6',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
  }}>
    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>
      {title}
    </div>
    <div style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
      {subtitle}
    </div>
    {trend && (
      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: color,
        background: `${color}10`,
        padding: '4px 12px',
        borderRadius: '20px',
        display: 'inline-block',
        fontWeight: '500'
      }}>
        {trend}
      </div>
    )}
  </div>
);

// Status Badge Component
const StatusBadge = ({ assessments }) => {
  const completedCount = assessments?.length || 0;
  const colors = {
    0: { bg: '#f1f5f9', text: '#64748b', label: 'No assessments' },
    1: { bg: '#fee2e2', text: '#b91c1c', label: '1 completed' },
    2: { bg: '#fed7aa', text: '#9a3412', label: '2 completed' },
    3: { bg: '#fef08a', text: '#854d0e', label: '3 completed' },
    4: { bg: '#d9f99d', text: '#3f6212', label: '4 completed' },
    5: { bg: '#a7f3d0', text: '#065f46', label: '5 completed' },
    6: { bg: '#c7d2fe', text: '#3730a3', label: 'All 6 completed' }
  };
  const style = colors[completedCount] || colors[0];
  
  return (
    <span style={{
      padding: "4px 12px",
      background: style.bg,
      color: style.text,
      borderRadius: "30px",
      fontSize: "12px",
      fontWeight: "600",
      display: 'inline-block'
    }}>
      {style.label}
    </span>
  );
};

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState('all');
  const [sortBy, setSortBy] = useState('score_desc');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completed: 0,
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
          if (session.loggedIn && session.expires > Date.now()) {
            setIsSupervisor(true);
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

    checkSupervisorAuth();
  }, [router]);

  // Fetch candidates and their assessment status
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
        // Get all candidates from candidate_assessments
        const { data: candidatesData, error: candidatesError } = await supabase
          .from("candidate_assessments")
          .select(`
            user_id,
            total_score,
            classification,
            email,
            full_name
          `)
          .order("total_score", { ascending: false });

        if (candidatesError) throw candidatesError;

        if (!candidatesData || candidatesData.length === 0) {
          setCandidates([]);
          setStats({
            totalCandidates: 0,
            completed: 0,
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

        // For each candidate, fetch their completed assessments
        const candidatesWithDetails = await Promise.all(
          candidatesData.map(async (candidate) => {
            // Get unique assessment types from responses
            const { data: responses } = await supabase
              .from("responses")
              .select(`
                questions!inner (
                  assessment_type
                )
              `)
              .eq("user_id", candidate.user_id);

            const completedAssessments = responses 
              ? [...new Set(responses.map(r => r.questions.assessment_type))] 
              : [];

            return {
              ...candidate,
              completedAssessments,
              classificationObj: getClassificationFromScore(candidate.total_score),
              displayName: candidate.full_name || `Candidate ${candidate.user_id.substring(0, 8)}`,
              displayId: candidate.user_id.substring(0, 12) + '...'
            };
          })
        );

        setCandidates(candidatesWithDetails);

        // Calculate statistics
        const statsData = {
          totalCandidates: candidatesData.length,
          completed: candidatesData.length,
          eliteTalent: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'Elite Talent').length,
          topTalent: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'Top Talent').length,
          highPotential: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'High Potential').length,
          solidPerformer: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'Solid Performer').length,
          developing: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'Developing Talent').length,
          emergingTalent: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'Emerging Talent').length,
          needsImprovement: candidatesData.filter(c => getClassificationFromScore(c.total_score).name === 'Needs Improvement').length
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

  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter(candidate => {
      const matchesSearch = 
        (candidate.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        candidate.user_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterClassification === 'all' || 
        candidate.classificationObj.name === filterClassification;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'score_desc':
          return b.total_score - a.total_score;
        case 'score_asc':
          return a.total_score - b.total_score;
        case 'name_asc':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'name_desc':
          return (b.full_name || '').localeCompare(a.full_name || '');
        default:
          return 0;
      }
    });

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  // Calculate average score
  const averageScore = candidates.length > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + c.total_score, 0) / candidates.length)
    : 0;

  if (!isSupervisor) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'
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
            borderTop: '3px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#475569', fontSize: '16px', fontWeight: '500' }}>Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout background={BACKGROUND_CONFIG.bgImage}>
      {/* Background Elements */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BACKGROUND_CONFIG.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.08,
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: BACKGROUND_CONFIG.overlay,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Main Content */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        width: "95vw", 
        maxWidth: "1600px",
        margin: "0 auto", 
        padding: "30px 20px"
      }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 30,
          background: 'white',
          borderRadius: '16px',
          padding: '20px 30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #eef2f6'
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              color: '#1e293b',
              fontSize: "28px",
              fontWeight: "700"
            }}>
              Supervisor Dashboard
            </h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              Talent Assessment Overview
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleLogout}
              style={{
                background: "white",
                color: "#dc2626",
                border: "1px solid #dc2626",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#dc2626";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#dc2626";
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
          gap: "20px", 
          marginBottom: "30px" 
        }}>
          <MetricCard
            title="Total Candidates"
            value={stats.totalCandidates}
            subtitle="Registered in system"
            color="#2563eb"
          />
          
          <MetricCard
            title="Completed Assessments"
            value={stats.completed}
            subtitle={`${stats.totalCandidates > 0 ? '100%' : '0%'} completion rate`}
            color="#10b981"
          />
          
          <MetricCard
            title="Top Talent"
            value={stats.eliteTalent + stats.topTalent}
            subtitle={`${stats.totalCandidates > 0 ? Math.round(((stats.eliteTalent + stats.topTalent) / stats.totalCandidates) * 100) : 0}% of candidates`}
            color="#f59e0b"
          />
          
          <MetricCard
            title="Average Score"
            value={averageScore}
            subtitle="Out of 500 points"
            color="#8b5cf6"
          />
        </div>

        {/* Candidates Table */}
        <div style={{ 
          background: "white",
          padding: "24px", 
          borderRadius: "16px", 
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid #eef2f6"
        }}>
          {/* Table Header with Filters */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "15px"
          }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: '18px', fontWeight: '600' }}>
              Candidate Assessments
            </h2>
            
            <div style={{ display: 'flex', gap: "12px", flexWrap: 'wrap' }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  width: '240px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              />

              {/* Filter by Classification */}
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                  color: '#1e293b'
                }}
              >
                <option value="all">All Classifications</option>
                <option value="Elite Talent">Elite Talent</option>
                <option value="Top Talent">Top Talent</option>
                <option value="High Potential">High Potential</option>
                <option value="Solid Performer">Solid Performer</option>
                <option value="Developing Talent">Developing Talent</option>
                <option value="Emerging Talent">Emerging Talent</option>
                <option value="Needs Improvement">Needs Improvement</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                  color: '#1e293b'
                }}
              >
                <option value="score_desc">Score: High to Low</option>
                <option value="score_asc">Score: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#475569',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> candidates
            </span>
            {filteredCandidates.length > 0 && (
              <span>
                Average Score: <strong>{Math.round(filteredCandidates.reduce((sum, c) => sum + c.total_score, 0) / filteredCandidates.length)}</strong>
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ 
                width: "40px", 
                height: "40px", 
                border: "3px solid #e2e8f0",
                borderTop: "3px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px"
              }} />
              <p style={{ color: "#64748b", fontSize: "14px" }}>Loading candidate data...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px",
              background: "#f8fafc",
              borderRadius: "12px"
            }}>
              <h3 style={{ color: "#1e293b", marginBottom: "8px", fontSize: '16px', fontWeight: '600' }}>
                No Candidates Found
              </h3>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                {searchTerm || filterClassification !== 'all' 
                  ? "Try adjusting your search or filter criteria"
                  : "No candidates have completed assessments yet"}
              </p>
              {(searchTerm || filterClassification !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterClassification('all');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "14px",
                minWidth: "1000px"
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc"
                  }}>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Candidate</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Contact</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Total Score</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Classification</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Completed Assessments</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const isHovered = hoveredRow === candidate.user_id;
                    
                    return (
                      <tr 
                        key={candidate.user_id} 
                        style={{ 
                          borderBottom: "1px solid #eef2f6",
                          transition: "background 0.2s ease",
                          background: isHovered ? '#f8fafc' : 'white',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setHoveredRow(candidate.user_id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => router.push(`/supervisor/${candidate.user_id}`)}
                      >
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: "500", color: "#1e293b" }}>
                            {candidate.full_name || 'Unnamed Candidate'}
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                            ID: {candidate.displayId}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ color: "#2563eb" }}>
                            {candidate.email || 'No email'}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ 
                            display: "inline-block",
                            padding: "6px 14px",
                            background: `${candidate.classificationObj.color}15`,
                            color: candidate.classificationObj.color,
                            borderRadius: "30px",
                            fontWeight: "600",
                            fontSize: "14px"
                          }}>
                            {candidate.total_score}/500
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{ 
                            color: candidate.classificationObj.color,
                            fontWeight: "500"
                          }}>
                            {candidate.classificationObj.name}
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <StatusBadge assessments={candidate.completedAssessments} />
                          {candidate.completedAssessments?.length > 0 && (
                            <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {candidate.completedAssessments.slice(0, 3).map((type, i) => {
                                const assessment = ASSESSMENT_TYPES.find(a => a.name === type) || ASSESSMENT_TYPES[0];
                                return (
                                  <span key={i} style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    background: `${assessment.color}15`,
                                    color: assessment.color,
                                    borderRadius: '4px'
                                  }}>
                                    {assessment.icon} {type.split(' ')[0]}
                                  </span>
                                );
                              })}
                              {candidate.completedAssessments.length > 3 && (
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                  +{candidate.completedAssessments.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <button style={{ 
                            background: "transparent",
                            color: "#2563eb", 
                            padding: "8px 16px", 
                            borderRadius: "6px",
                            border: "1px solid #2563eb",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "#2563eb";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#2563eb";
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/supervisor/${candidate.user_id}`);
                          }}>
                            View Reports
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

        {/* Footer */}
        <div style={{ 
          marginTop: "20px",
          padding: "16px",
          background: "white",
          borderRadius: "8px",
          textAlign: "center",
          fontSize: "13px",
          color: "#64748b",
          border: "1px solid #eef2f6"
        }}>
          <p style={{ margin: 0 }}>
            Talent Assessment System • {stats.totalCandidates} candidates • Last updated: {new Date().toLocaleDateString()}
          </p>
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
