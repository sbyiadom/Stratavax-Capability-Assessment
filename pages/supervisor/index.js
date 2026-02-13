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

// Helper function to get classification from score (max 450)
const getClassificationFromScore = (score) => {
  if (score >= 430) return "Elite Talent";
  if (score >= 400) return "Top Talent";
  if (score >= 350) return "High Potential";
  if (score >= 300) return "Solid Performer";
  if (score >= 250) return "Developing Talent";
  if (score >= 200) return "Emerging Talent";
  return "Needs Improvement";
};

// Helper function to get classification color
const getClassificationColor = (score) => {
  if (score >= 430) return '#2E7D32';
  if (score >= 400) return '#4CAF50';
  if (score >= 350) return '#2196F3';
  if (score >= 300) return '#FF9800';
  if (score >= 250) return '#9C27B0';
  if (score >= 200) return '#795548';
  return '#F44336';
};

// Helper function to get classification config
const getClassificationConfig = (score) => {
  const color = getClassificationColor(score);
  return {
    color,
    gradient: `linear-gradient(135deg, ${color}, ${color}dd)`,
    lightBg: `${color}15`,
    border: `1px solid ${color}30`
  };
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

// Classification Card Component
const ClassificationCard = ({ category, count, total, color, scoreRange }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #eef2f6',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px"
      }}>
        <div>
          <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px" }}>{category}</div>
          <div style={{ fontSize: "12px", color: color, marginTop: "2px", fontWeight: "500" }}>
            {scoreRange}
          </div>
        </div>
        <span style={{ 
          fontWeight: "700", 
          color: color,
          fontSize: "20px",
          background: `${color}10`,
          padding: '4px 12px',
          borderRadius: '12px'
        }}>{count}</span>
      </div>
      
      <div style={{ 
        height: "6px", 
        background: "#e2e8f0", 
        borderRadius: "3px",
        overflow: "hidden",
        marginTop: "8px"
      }}>
        <div style={{ 
          height: "100%", 
          width: `${percentage}%`, 
          background: color,
          borderRadius: "3px",
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <div style={{ 
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12px", 
        color: "#64748b", 
        marginTop: "8px"
      }}>
        <span>{scoreRange}</span>
        <span style={{ fontWeight: '600', color: color }}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => (
  <span style={{
    padding: "6px 14px",
    background: "#10b98115",
    color: "#10b981",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "600",
    border: "1px solid #10b98130",
    display: 'inline-block'
  }}>
    Completed
  </span>
);

// Score Badge Component
const ScoreBadge = ({ score, color }) => (
  <div style={{ 
    display: "inline-block",
    padding: "6px 14px",
    background: `${color}10`,
    color: color,
    borderRadius: "30px",
    fontWeight: "600",
    fontSize: "14px",
    border: `1px solid ${color}30`
  }}>
    {score}/450
  </div>
);

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

  // Fetch candidates and stats
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
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

        // Enhance candidate data
        const candidatesWithDetails = candidatesData.map((candidate) => ({
          ...candidate,
          displayName: candidate.full_name || `Candidate ${candidate.user_id.substring(0, 8)}`,
          displayId: candidate.user_id.substring(0, 12) + '...',
          emailDisplay: candidate.email || "No email provided"
        }));

        setCandidates(candidatesWithDetails);

        // Calculate statistics
        const statsData = {
          totalCandidates: candidatesData.length,
          completed: candidatesData.length,
          eliteTalent: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'Elite Talent').length,
          topTalent: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'Top Talent').length,
          highPotential: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'High Potential').length,
          solidPerformer: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'Solid Performer').length,
          developing: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'Developing Talent').length,
          emergingTalent: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'Emerging Talent').length,
          needsImprovement: candidatesData.filter(c => getClassificationFromScore(c.total_score) === 'Needs Improvement').length
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
        getClassificationFromScore(candidate.total_score) === filterClassification;
      
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
    sessionStorage.removeItem("supervisorAuth");
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
              onClick={() => router.push("/supervisor-setup")}
              style={{
                background: "white",
                color: "#2563eb",
                border: "1px solid #2563eb",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#2563eb";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#2563eb";
              }}
            >
              + Add Supervisor
            </button>
            
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
            value={stats.topTalent + stats.eliteTalent}
            subtitle={`${stats.totalCandidates > 0 ? Math.round(((stats.topTalent + stats.eliteTalent) / stats.totalCandidates) * 100) : 0}% of candidates`}
            color="#f59e0b"
          />
          
          <MetricCard
            title="Average Score"
            value={averageScore}
            subtitle="Out of 450 points"
            color="#8b5cf6"
          />
        </div>

        {/* Classification Distribution */}
        <div style={{ 
          background: "white",
          padding: "24px", 
          borderRadius: "16px", 
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          marginBottom: "30px",
          border: "1px solid #eef2f6"
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: '18px', fontWeight: '600' }}>
              Talent Distribution
            </h2>
            <div style={{
              padding: '6px 14px',
              background: '#f8fafc',
              borderRadius: '20px',
              fontSize: '13px',
              color: '#475569',
              fontWeight: '500'
            }}>
              Total: {stats.totalCandidates}
            </div>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "16px" 
          }}>
            {[
              { name: 'Elite Talent', count: stats.eliteTalent, color: '#2E7D32', range: '430-450' },
              { name: 'Top Talent', count: stats.topTalent, color: '#4CAF50', range: '400-429' },
              { name: 'High Potential', count: stats.highPotential, color: '#2196F3', range: '350-399' },
              { name: 'Solid Performer', count: stats.solidPerformer, color: '#FF9800', range: '300-349' },
              { name: 'Developing Talent', count: stats.developing, color: '#9C27B0', range: '250-299' },
              { name: 'Emerging Talent', count: stats.emergingTalent, color: '#795548', range: '200-249' },
              { name: 'Needs Improvement', count: stats.needsImprovement, color: '#F44336', range: '0-199' }
            ].map((category) => (
              <ClassificationCard
                key={category.name}
                category={category.name}
                count={category.count}
                total={stats.totalCandidates}
                color={category.color}
                scoreRange={category.range}
              />
            ))}
          </div>
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
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#1d4ed8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#2563eb';
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
                minWidth: "900px"
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
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Status</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const classification = getClassificationFromScore(candidate.total_score);
                    const color = getClassificationColor(candidate.total_score);
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
                          <ScoreBadge score={candidate.total_score} color={color} />
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{ 
                            color: color,
                            fontWeight: "500"
                          }}>
                            {classification}
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <StatusBadge status="completed" />
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
