import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

// ===== BACKGROUND CONFIGURATIONS =====
const BACKGROUND_CONFIG = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
  pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
  overlay: 'rgba(0,0,0,0.7)'
};

// Helper function to get classification from score
const getClassificationFromScore = (score) => {
  if (score >= 450) return "Elite Talent";
  if (score >= 400) return "Top Talent";
  if (score >= 350) return "High Potential";
  if (score >= 300) return "Solid Performer";
  if (score >= 250) return "Developing Talent";
  if (score >= 200) return "Emerging Talent";
  return "Needs Improvement";
};

// Helper function to get classification color and gradient
const getClassificationConfig = (score) => {
  if (score >= 450) return { 
    color: '#2E7D32', 
    gradient: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
    lightBg: 'rgba(46, 125, 50, 0.1)',
    icon: '👑'
  };
  if (score >= 400) return { 
    color: '#4CAF50', 
    gradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    lightBg: 'rgba(76, 175, 80, 0.1)',
    icon: '⭐'
  };
  if (score >= 350) return { 
    color: '#2196F3', 
    gradient: 'linear-gradient(135deg, #2196F3, #64B5F6)',
    lightBg: 'rgba(33, 150, 243, 0.1)',
    icon: '📈'
  };
  if (score >= 300) return { 
    color: '#FF9800', 
    gradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    lightBg: 'rgba(255, 152, 0, 0.1)',
    icon: '⚡'
  };
  if (score >= 250) return { 
    color: '#9C27B0', 
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    lightBg: 'rgba(156, 39, 176, 0.1)',
    icon: '🌱'
  };
  if (score >= 200) return { 
    color: '#795548', 
    gradient: 'linear-gradient(135deg, #795548, #A1887F)',
    lightBg: 'rgba(121, 85, 72, 0.1)',
    icon: '🔰'
  };
  return { 
    color: '#F44336', 
    gradient: 'linear-gradient(135deg, #F44336, #EF5350)',
    lightBg: 'rgba(244, 67, 54, 0.1)',
    icon: '⚠️'
  };
};

// Metric card component
const MetricCard = ({ title, value, subtitle, gradient, icon, trend }) => (
  <div style={{
    background: gradient,
    padding: '25px',
    borderRadius: '20px',
    color: 'white',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
    }
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-5px)';
    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
  }}
  >
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      fontSize: '48px',
      opacity: 0.2,
      color: 'white'
    }}>
      {icon}
    </div>
    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '10px' }}>{title}</div>
    <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '5px' }}>{value}</div>
    <div style={{ fontSize: '12px', opacity: 0.8 }}>{subtitle}</div>
    {trend && (
      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        background: 'rgba(255,255,255,0.2)',
        padding: '4px 8px',
        borderRadius: '20px',
        display: 'inline-block'
      }}>
        {trend}
      </div>
    )}
  </div>
);

// Classification card component
const ClassificationCard = ({ category, count, total, config }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div style={{
      borderLeft: `4px solid ${config.color}`,
      padding: '18px',
      background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
      border: '1px solid #f1f5f9'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
    }}
    >
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{config.icon}</span>
          <div>
            <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px" }}>{category}</div>
            <div style={{ fontSize: "11px", color: config.color, marginTop: "2px", fontWeight: '500' }}>
              {category.scoreRange}
            </div>
          </div>
        </div>
        <span style={{ 
          fontWeight: "700", 
          color: config.color,
          fontSize: "22px",
          background: config.lightBg,
          padding: '4px 12px',
          borderRadius: '20px'
        }}>{count}</span>
      </div>
      
      <div style={{ 
        height: "8px", 
        background: "#e2e8f0", 
        borderRadius: "4px",
        overflow: "hidden",
        marginTop: "10px"
      }}>
        <div style={{ 
          height: "100%", 
          width: `${percentage}%`, 
          background: config.gradient,
          borderRadius: "4px",
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
        <span>{category.scoreRange}</span>
        <span style={{ fontWeight: '600', color: config.color }}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
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
            full_name,
            created_at
          `)
          .order("total_score", { ascending: false });

        if (candidatesError) throw candidatesError;

        if (!candidatesData || candidatesData.length === 0) {
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

        // Enhance candidate data with additional info
        const candidatesWithDetails = candidatesData.map((candidate, index) => {
          const config = getClassificationConfig(candidate.total_score);
          return {
            ...candidate,
            user: {
              email: candidate.email || "No email provided",
              full_name: candidate.full_name || `Candidate ${candidate.user_id.substring(0, 8).toUpperCase()}`,
              id_short: candidate.user_id.substring(0, 8).toUpperCase()
            },
            config,
            displayId: candidate.user_id.substring(0, 12) + '...',
            displayName: candidate.full_name || `Candidate ${index + 1}`,
            completedDate: candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A'
          };
        });

        setCandidates(candidatesWithDetails);

        // Calculate statistics
        const statsData = {
          totalCandidates: candidatesData.length,
          completed: candidatesData.length,
          inProgress: 0,
          notStarted: 0,
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
        candidate.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          return (a.user?.full_name || '').localeCompare(b.user?.full_name || '');
        case 'name_desc':
          return (b.user?.full_name || '').localeCompare(a.user?.full_name || '');
        case 'date_desc':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'date_asc':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default:
          return 0;
      }
    });

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    sessionStorage.removeItem("supervisorAuth");
    router.push("/supervisor-login");
  };

  if (!isSupervisor) {
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
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#333', fontSize: '16px' }}>Checking authentication...</p>
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
        opacity: 0.1,
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BACKGROUND_CONFIG.pattern})`,
        opacity: 0.05,
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
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          padding: '20px 30px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: "36px",
              fontWeight: "800"
            }}>
              Supervisor Dashboard
            </h1>
            <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>
              Talent Assessment Analytics & Candidate Management
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => router.push("/supervisor-setup")}
              style={{
                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(76,175,80,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.3)';
              }}
            >
              <span style={{ fontSize: '18px' }}>➕</span>
              Add Supervisor
            </button>
            
            <button
              onClick={handleLogout}
              style={{
                background: "linear-gradient(135deg, #d32f2f, #b71c1c)",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(211,47,47,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(211,47,47,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(211,47,47,0.3)';
              }}
            >
              <span style={{ fontSize: '18px' }}>🚪</span>
              Logout
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "25px", 
          marginBottom: "40px" 
        }}>
          <MetricCard
            title="Total Candidates"
            value={stats.totalCandidates}
            subtitle="Across all classifications"
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            icon="👥"
          />
          
          <MetricCard
            title="Completed Assessments"
            value={stats.completed}
            subtitle="100% completion rate"
            gradient="linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)"
            icon="✅"
            trend={`${stats.totalCandidates > 0 ? '100%' : '0%'} of total`}
          />
          
          <MetricCard
            title="Top Talent"
            value={stats.topTalent}
            subtitle={`${stats.totalCandidates > 0 ? Math.round((stats.topTalent / stats.totalCandidates) * 100) : 0}% of candidates`}
            gradient="linear-gradient(135deg, #FF9800 0%, #F57C00 100%)"
            icon="⭐"
          />
          
          <MetricCard
            title="Average Score"
            value={candidates.length > 0 
              ? Math.round(candidates.reduce((sum, c) => sum + c.total_score, 0) / candidates.length)
              : "0"
            }
            subtitle="Out of 500 points"
            gradient="linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)"
            icon="📊"
          />
        </div>

        {/* Classification Distribution */}
        <div style={{ 
          background: "rgba(255,255,255,0.98)",
          backdropFilter: 'blur(10px)',
          padding: "30px", 
          borderRadius: "24px", 
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          marginBottom: "40px",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '25px'
          }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: '24px' }}>
              Talent Classification Distribution
            </h2>
            <div style={{
              padding: '8px 16px',
              background: '#f8fafc',
              borderRadius: '30px',
              fontSize: '14px',
              color: '#64748b'
            }}>
              Total: <strong>{stats.totalCandidates}</strong> candidates
            </div>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
            gap: "20px" 
          }}>
            {[
              { name: 'Elite Talent', count: stats.eliteTalent, config: getClassificationConfig(475), scoreRange: '450-500' },
              { name: 'Top Talent', count: stats.topTalent, config: getClassificationConfig(425), scoreRange: '400-449' },
              { name: 'High Potential', count: stats.highPotential, config: getClassificationConfig(375), scoreRange: '350-399' },
              { name: 'Solid Performer', count: stats.solidPerformer, config: getClassificationConfig(325), scoreRange: '300-349' },
              { name: 'Developing Talent', count: stats.developing, config: getClassificationConfig(275), scoreRange: '250-299' },
              { name: 'Emerging Talent', count: stats.emergingTalent, config: getClassificationConfig(225), scoreRange: '200-249' },
              { name: 'Needs Improvement', count: stats.needsImprovement, config: getClassificationConfig(150), scoreRange: '0-199' }
            ].map((category) => (
              <ClassificationCard
                key={category.name}
                category={category.name}
                count={category.count}
                total={stats.totalCandidates}
                config={{ ...category.config, scoreRange: category.scoreRange }}
              />
            ))}
          </div>
        </div>

        {/* Candidates Table */}
        <div style={{ 
          background: "rgba(255,255,255,0.98)",
          backdropFilter: 'blur(10px)',
          padding: "30px", 
          borderRadius: "24px", 
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          {/* Table Header with Filters */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "25px",
            flexWrap: "wrap",
            gap: "15px"
          }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: '24px' }}>
              Candidate Assessments
            </h2>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
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
                    padding: '12px 12px 12px 40px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    width: '250px',
                    outline: 'none',
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

              {/* Filter by Classification */}
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none'
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
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="score_desc">Score: High to Low</option>
                <option value="score_asc">Score: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div style={{
            marginBottom: '20px',
            padding: '10px 16px',
            background: '#f8fafc',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#64748b',
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
                width: "50px", 
                height: "50px", 
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px"
              }} />
              <p style={{ color: "#64748b" }}>Loading candidate data...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "80px 20px",
              background: "#f8fafc",
              borderRadius: "16px"
            }}>
              <div style={{ 
                fontSize: "64px", 
                marginBottom: "20px",
                opacity: 0.5
              }}>
                📊
              </div>
              <h3 style={{ color: "#1e293b", marginBottom: "10px", fontSize: '20px' }}>
                No Candidates Found
              </h3>
              <p style={{ color: "#64748b", maxWidth: "500px", margin: "0 auto 25px" }}>
                {searchTerm || filterClassification !== 'all' 
                  ? "Try adjusting your search or filter criteria"
                  : "When candidates complete their assessments, their results will appear here"}
              </p>
              {(searchTerm || filterClassification !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterClassification('all');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
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
                minWidth: "1000px"
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "2px solid #e2e8f0",
                    backgroundColor: "#f8fafc"
                  }}>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Candidate</th>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Contact</th>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Completed</th>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Total Score</th>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Classification</th>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Status</th>
                    <th style={{ padding: "16px", fontWeight: "600", color: "#475569" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, index) => {
                    const config = c.config;
                    const isHovered = hoveredRow === c.user_id;
                    
                    return (
                      <tr 
                        key={c.user_id} 
                        style={{ 
                          borderBottom: "1px solid #f1f5f9",
                          transition: "all 0.2s ease",
                          background: isHovered ? '#f8fafc' : 'white',
                          transform: isHovered ? 'scale(1.01)' : 'scale(1)',
                          boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                        }}
                        onMouseEnter={() => setHoveredRow(c.user_id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: "600", color: "#1e293b" }}>
                            {c.displayName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                            ID: {c.displayId}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ color: "#2563eb", fontSize: "14px" }}>
                            {c.user?.email}
                          </div>
                          {c.user?.email === "No email provided" && (
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                              Short ID: {c.user?.id_short}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "16px", color: "#64748b", fontSize: "14px" }}>
                          {c.completedDate}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ 
                            display: "inline-block",
                            padding: "6px 14px",
                            background: config.lightBg,
                            color: config.color,
                            borderRadius: "30px",
                            fontWeight: "600",
                            fontSize: "14px",
                            border: `1px solid ${config.color}30`
                          }}>
                            {c.total_score}/500
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '20px' }}>{config.icon}</span>
                            <span style={{ 
                              color: config.color,
                              fontWeight: "600",
                              fontSize: "14px"
                            }}>
                              {getClassificationFromScore(c.total_score)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            padding: "6px 14px",
                            background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                            color: "white",
                            borderRadius: "30px",
                            fontSize: "12px",
                            fontWeight: "600",
                            boxShadow: '0 2px 8px rgba(76,175,80,0.3)'
                          }}>
                            ✓ Completed
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <Link href={`/supervisor/${c.user_id}`} legacyBehavior>
                            <a style={{ 
                              background: "linear-gradient(135deg, #667eea, #764ba2)",
                              color: "white", 
                              padding: "10px 20px", 
                              borderRadius: "10px",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              fontWeight: "500",
                              fontSize: "14px",
                              transition: "all 0.2s ease",
                              boxShadow: "0 4px 12px rgba(102,126,234,0.3)"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.4)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
                            }}
                            >
                              <span>📋</span>
                              View Report
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

        {/* Footer */}
        <div style={{ 
          marginTop: "30px",
          padding: "20px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: 'blur(10px)',
          borderRadius: "16px",
          textAlign: "center",
          fontSize: "13px",
          color: "#64748b",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <p style={{ margin: 0 }}>
            Talent Assessment System • {stats.totalCandidates} total candidates • Session active
          </p>
          <p style={{ margin: "5px 0 0 0", fontSize: "12px" }}>
            Session expires: {new Date(Date.now() + 8 * 60 * 60 * 1000).toLocaleTimeString()}
          </p>
        </div>
      </div>

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
