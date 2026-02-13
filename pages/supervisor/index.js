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

// Define all 6 assessment types with their configurations
const ASSESSMENT_TYPES = [
  { 
    id: 'general',
    name: 'General Assessment',
    icon: '📋',
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #6B8EC9)',
    lightBg: '#E8EEF5',
    description: 'Comprehensive evaluation across core competencies',
    maxScore: 500,
    dbValue: 'General Assessment' // The actual value in your database
  },
  { 
    id: 'behavioral',
    name: 'Behavioral & Soft Skills',
    icon: '🧠',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    lightBg: '#F3E5F5',
    description: 'Communication, teamwork, emotional intelligence',
    maxScore: 100,
    dbValue: 'Behavioral & Soft Skills'
  },
  { 
    id: 'cognitive',
    name: 'Cognitive & Thinking Skills',
    icon: '💡',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    lightBg: '#FFF3E0',
    description: 'Problem-solving, critical thinking, analysis',
    maxScore: 100,
    dbValue: 'Cognitive & Thinking Skills'
  },
  { 
    id: 'cultural',
    name: 'Cultural & Attitudinal Fit',
    icon: '🤝',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    lightBg: '#E8F5E9',
    description: 'Values alignment, organizational fit',
    maxScore: 100,
    dbValue: 'Cultural & Attitudinal Fit'
  },
  { 
    id: 'manufacturing',
    name: 'Manufacturing Technical Skills',
    icon: '⚙️',
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #EF5350)',
    lightBg: '#FFEBEE',
    description: 'Technical skills across different machines and equipment',
    maxScore: 100,
    dbValue: 'Manufacturing Technical Skills'
  },
  { 
    id: 'leadership',
    name: 'Leadership Potential',
    icon: '👑',
    color: '#FFC107',
    gradient: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    lightBg: '#FFF8E1',
    description: 'Vision, influence, team development',
    maxScore: 100,
    dbValue: 'Leadership Potential'
  }
];

// Helper function to get classification based on score and assessment type
const getClassification = (score, assessmentType, maxScore) => {
  const percentage = (score / maxScore) * 100;
  
  // For General Assessment (500 points)
  if (assessmentType === 'General Assessment') {
    if (score >= 480) return { name: "Elite Talent", color: "#00B894" };
    if (score >= 450) return { name: "Top Talent", color: "#0984E3" };
    if (score >= 400) return { name: "High Potential", color: "#FDCB6E" };
    if (score >= 350) return { name: "Solid Performer", color: "#00CEC9" };
    if (score >= 300) return { name: "Developing Talent", color: "#6C5CE7" };
    if (score >= 250) return { name: "Emerging Talent", color: "#E84342" };
    return { name: "Needs Improvement", color: "#D63031" };
  }
  
  // For Technical/Manufacturing Assessment (100 points)
  if (assessmentType === 'Manufacturing Technical Skills') {
    if (percentage >= 90) return { name: "Technical Expert", color: "#00B894" };
    if (percentage >= 80) return { name: "Advanced", color: "#0984E3" };
    if (percentage >= 70) return { name: "Proficient", color: "#FDCB6E" };
    if (percentage >= 60) return { name: "Competent", color: "#00CEC9" };
    if (percentage >= 50) return { name: "Developing", color: "#6C5CE7" };
    return { name: "Needs Training", color: "#D63031" };
  }
  
  // For Cognitive Assessment (100 points)
  if (assessmentType === 'Cognitive & Thinking Skills') {
    if (percentage >= 90) return { name: "Exceptional", color: "#00B894" };
    if (percentage >= 80) return { name: "Strong", color: "#0984E3" };
    if (percentage >= 70) return { name: "Good", color: "#FDCB6E" };
    if (percentage >= 60) return { name: "Satisfactory", color: "#00CEC9" };
    if (percentage >= 50) return { name: "Developing", color: "#6C5CE7" };
    return { name: "Needs Development", color: "#D63031" };
  }
  
  // For Personality-based assessments (Behavioral, Cultural, Leadership)
  if (percentage >= 80) return { name: "Strong Indicator", color: "#00B894" };
  if (percentage >= 70) return { name: "Moderate Indicator", color: "#0984E3" };
  if (percentage >= 60) return { name: "Balanced", color: "#FDCB6E" };
  if (percentage >= 50) return { name: "Developing", color: "#00CEC9" };
  return { name: "Area for Growth", color: "#6C5CE7" };
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, color = '#2563eb' }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f6',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
  </div>
);

// Status Badge Component
const StatusBadge = ({ status, color }) => (
  <span style={{
    padding: "4px 12px",
    background: `${color}15`,
    color: color,
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "600",
    display: 'inline-block'
  }}>
    {status}
  </span>
);

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState('General Assessment');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score_desc');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    averageScore: 0,
    topPerformers: 0,
    needsDevelopment: 0
  });
  const [debug, setDebug] = useState('');

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

  // Fetch all candidates and their assessment data
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchAllCandidates = async () => {
      try {
        setLoading(true);
        setDebug('Fetching data...');
        
        // First, let's get the structure of the questions table to see the column name
        const { data: columns, error: columnsError } = await supabase
          .from('questions')
          .select('*')
          .limit(1);

        if (columnsError) {
          setDebug(`Error accessing questions table: ${columnsError.message}`);
        } else if (columns && columns.length > 0) {
          setDebug(`Questions table columns: ${Object.keys(columns[0]).join(', ')}`);
        }

        // Let's try a simpler approach - first get all responses with questions
        const { data: allResponses, error: responsesError } = await supabase
          .from("responses")
          .select(`
            user_id,
            question_id,
            answer_id,
            questions (
              id,
              section,
              subsection
            ),
            answers (
              score
            )
          `);

        if (responsesError) {
          setDebug(`Error fetching responses: ${responsesError.message}`);
          throw responsesError;
        }

        if (!allResponses || allResponses.length === 0) {
          setDebug('No responses found in the database');
          setCandidates([]);
          setStats({
            totalCandidates: 0,
            averageScore: 0,
            topPerformers: 0,
            needsDevelopment: 0
          });
          setLoading(false);
          return;
        }

        setDebug(`Found ${allResponses.length} total responses`);

        // Get unique user IDs from responses
        const uniqueUserIds = [...new Set(allResponses.map(r => r.user_id))];
        setDebug(prev => `${prev}\nUnique users: ${uniqueUserIds.length}`);

        // For now, since we don't know the assessment type column, 
        // we'll assume all responses belong to General Assessment
        // and we'll manually map based on question IDs or sections later
        
        // Get user details from candidate_assessments
        const { data: candidatesData, error: candidatesError } = await supabase
          .from("candidate_assessments")
          .select("user_id, full_name, email")
          .in("user_id", uniqueUserIds);

        if (candidatesError) {
          setDebug(prev => `${prev}\nError fetching candidate details: ${candidatesError.message}`);
        }

        // Group responses by user
        const userData = {};

        allResponses.forEach(response => {
          const userId = response.user_id;
          const score = response.answers?.score || 0;
          
          if (!userData[userId]) {
            userData[userId] = {
              totalScore: 0,
              totalQuestions: 0,
              // For now, assume all responses are for General Assessment
              assessments: {
                'General Assessment': {
                  totalScore: 0,
                  questionCount: 0
                }
              }
            };
          }
          
          userData[userId].totalScore += score;
          userData[userId].totalQuestions += 1;
          userData[userId].assessments['General Assessment'].totalScore += score;
          userData[userId].assessments['General Assessment'].questionCount += 1;
        });

        setDebug(prev => `${prev}\nProcessed ${Object.keys(userData).length} users`);

        // Build candidate list
        const candidatesList = uniqueUserIds.map(userId => {
          const candidateInfo = candidatesData?.find(c => c.user_id === userId) || {};
          const userAssessmentData = userData[userId] || { assessments: {} };
          
          // Get completed assessments list
          const completedAssessments = Object.keys(userAssessmentData.assessments || {});
          
          // Calculate score for selected assessment
          let score = 0;
          let maxPossible = 0;
          let questionCount = 0;
          
          if (userAssessmentData.assessments && userAssessmentData.assessments[selectedAssessment]) {
            const assessmentData = userAssessmentData.assessments[selectedAssessment];
            score = assessmentData.totalScore;
            questionCount = assessmentData.questionCount;
            maxPossible = questionCount * 5;
          }
          
          const percentage = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;
          const assessmentConfig = ASSESSMENT_TYPES.find(a => a.name === selectedAssessment);
          const classification = getClassification(score, selectedAssessment, assessmentConfig?.maxScore || 100);
          
          return {
            user_id: userId,
            full_name: candidateInfo.full_name || `Candidate ${userId.substring(0, 8)}`,
            email: candidateInfo.email || "Email not available",
            score,
            maxPossible,
            percentage,
            classification,
            questionCount,
            completedAssessments,
            hasAssessment: questionCount > 0 // If they have any questions, they've taken it
          };
        });

        // Filter to only include candidates who have taken the selected assessment
        const filteredCandidates = candidatesList.filter(c => c.hasAssessment);
        
        setDebug(prev => `${prev}\nCandidates for ${selectedAssessment}: ${filteredCandidates.length}`);

        // Sort by score
        filteredCandidates.sort((a, b) => b.score - a.score);
        setCandidates(filteredCandidates);

        // Calculate stats
        const avgScore = filteredCandidates.length > 0 
          ? filteredCandidates.reduce((sum, c) => sum + c.percentage, 0) / filteredCandidates.length 
          : 0;
        const topPerformers = filteredCandidates.filter(c => c.percentage >= 80).length;
        const needsDev = filteredCandidates.filter(c => c.percentage < 60).length;

        setStats({
          totalCandidates: filteredCandidates.length,
          averageScore: Math.round(avgScore),
          topPerformers,
          needsDevelopment: needsDev
        });

      } catch (err) {
        console.error("Error fetching candidates:", err);
        setDebug(prev => `${prev}\nError: ${err.message}`);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCandidates();
  }, [isSupervisor, selectedAssessment]);

  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter(candidate => {
      const matchesSearch = 
        (candidate.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'score_desc':
          return b.score - a.score;
        case 'score_asc':
          return a.score - b.score;
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

  const currentAssessmentConfig = ASSESSMENT_TYPES.find(a => a.name === selectedAssessment) || ASSESSMENT_TYPES[0];

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
              View candidates and their assessment reports
            </p>
          </div>
          
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

        {/* Debug Info - Shows what's happening */}
        <div style={{
          background: '#f1f5f9',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          color: '#334155',
          border: '1px solid #cbd5e1'
        }}>
          <strong>Debug Information:</strong>
          <div>{debug}</div>
        </div>

        {/* Assessment Type Selector */}
        <div style={{
          background: "white",
          borderRadius: "60px",
          padding: "8px",
          marginBottom: "30px",
          display: "flex",
          flexWrap: "wrap",
          gap: "5px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          border: "1px solid #eef2f6"
        }}>
          {ASSESSMENT_TYPES.map(assessment => {
            // Count candidates for this assessment type
            const count = candidates.filter(c => c.completedAssessments?.includes(assessment.name)).length;
            
            return (
              <button
                key={assessment.id}
                onClick={() => setSelectedAssessment(assessment.name)}
                style={{
                  padding: "12px 24px",
                  background: selectedAssessment === assessment.name ? assessment.gradient : 'transparent',
                  color: selectedAssessment === assessment.name ? 'white' : '#4a5568',
                  border: 'none',
                  borderRadius: "50px",
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: '1 1 auto',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <span>{assessment.icon}</span>
                <span>{assessment.name}</span>
                <span style={{
                  background: selectedAssessment === assessment.name ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '12px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Assessment Info Card */}
        <div style={{
          background: currentAssessmentConfig.gradient,
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "30px",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <span style={{ fontSize: '32px' }}>{currentAssessmentConfig.icon}</span>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>{selectedAssessment}</h2>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>
              {currentAssessmentConfig.description}
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '15px 25px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Max Score</div>
            <div style={{ fontSize: '28px', fontWeight: '700' }}>{currentAssessmentConfig.maxScore}</div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats.totalCandidates > 0 && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "20px", 
            marginBottom: "30px" 
          }}>
            <MetricCard
              title="Total Candidates"
              value={stats.totalCandidates}
              subtitle={`Took ${selectedAssessment}`}
              color="#2563eb"
            />
            
            <MetricCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle="Across all candidates"
              color="#10b981"
            />
            
            <MetricCard
              title="Top Performers"
              value={stats.topPerformers}
              subtitle="Scored 80% or above"
              color="#f59e0b"
            />
            
            <MetricCard
              title="Needs Development"
              value={stats.needsDevelopment}
              subtitle="Scored below 60%"
              color="#ef4444"
            />
          </div>
        )}

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
              Candidates who completed {selectedAssessment}
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
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              />

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
              Showing <strong>{filteredCandidates.length}</strong> candidates for {selectedAssessment}
            </span>
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
              <p style={{ color: "#64748b", fontSize: "14px" }}>Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px",
              background: "#f8fafc",
              borderRadius: "12px"
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>{currentAssessmentConfig.icon}</div>
              <h3 style={{ color: "#1e293b", marginBottom: "8px", fontSize: '16px', fontWeight: '600' }}>
                No Candidates Found
              </h3>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                {searchTerm 
                  ? "Try adjusting your search criteria"
                  : `No candidates have completed ${selectedAssessment} yet`}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
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
                  Clear Search
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
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Score</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Percentage</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Classification</th>
                    <th style={{ padding: "14px 16px", fontWeight: "600", color: "#475569" }}>Questions</th>
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
                        onClick={() => router.push(`/supervisor/${candidate.user_id}?assessment=${encodeURIComponent(selectedAssessment)}`)}
                      >
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: "500", color: "#1e293b" }}>
                            {candidate.full_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                            ID: {candidate.user_id.substring(0, 12)}...
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ color: "#2563eb", fontSize: '13px' }}>
                            {candidate.email}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{ fontWeight: "600", color: "#1e293b" }}>
                            {candidate.score}/{candidate.maxPossible}
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ 
                            display: "inline-block",
                            padding: "6px 14px",
                            background: `${candidate.classification.color}15`,
                            color: candidate.classification.color,
                            borderRadius: "30px",
                            fontWeight: "600",
                            fontSize: "13px"
                          }}>
                            {candidate.percentage}%
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <StatusBadge 
                            status={candidate.classification.name} 
                            color={candidate.classification.color}
                          />
                        </td>
                        <td style={{ padding: "16px", color: "#64748b" }}>
                          {candidate.questionCount}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <button style={{ 
                            background: "transparent",
                            color: currentAssessmentConfig.color, 
                            padding: "8px 16px", 
                            borderRadius: "6px",
                            border: `1px solid ${currentAssessmentConfig.color}`,
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = currentAssessmentConfig.color;
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = currentAssessmentConfig.color;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/supervisor/${candidate.user_id}?assessment=${encodeURIComponent(selectedAssessment)}`);
                          }}>
                            View Report
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
            Talent Assessment System • {stats.totalCandidates} candidates completed {selectedAssessment}
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
