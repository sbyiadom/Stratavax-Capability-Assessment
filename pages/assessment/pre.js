// pages/assessment/pre.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== ASSESSMENT CONFIGURATIONS WITH INSTRUCTIONS =====
const ASSESSMENT_CONFIG = {
  'Behavioral & Soft Skills Assessment': {
    icon: '🧠',
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)',
    timeLimit: '25-30 minutes',
    instructions: [
      'Choose the response that best describes your typical behavior in workplace situations',
      'Be honest - there are no right or wrong answers',
      'Consider how you actually behave, not how you think you should behave',
      'Your results will help identify your natural strengths and development areas'
    ]
  },
  'Cognitive & Thinking Skills': {
    icon: '💡',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #F57C00)',
    timeLimit: '35-40 minutes',
    instructions: [
      'Read each scenario carefully before selecting your answer',
      'Some questions may have time limits - work efficiently',
      'Focus on logical reasoning and problem-solving approaches',
      'This assesses analytical thinking and decision-making capabilities'
    ]
  },
  'Cultural & Attitudinal Fit': {
    icon: '🤝',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    timeLimit: '20-25 minutes',
    instructions: [
      'Consider how you would actually respond in real workplace situations',
      'Your answers help determine alignment with company values',
      'Focus on work ethic, motivation, and team dynamics',
      'Be authentic - this helps find the best fit for your work style'
    ]
  },
  'Leadership Potential Assessment': {
    icon: '👑',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)',
    timeLimit: '30-35 minutes',
    instructions: [
      'Consider both people management and strategic thinking scenarios',
      'Think about how you would guide teams and develop others',
      'Focus on vision, influence, and decision-making',
      'This evaluates your leadership capabilities and potential'
    ]
  },
  'Manufacturing Technical Skills': {
    icon: '⚙️',
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #C62828)',
    timeLimit: '45-50 minutes',
    instructions: [
      'Questions cover equipment operation, maintenance, and troubleshooting',
      'Topics include blowing machines, labelers, fillers, and conveyors',
      'Answer based on your technical knowledge and experience',
      'Some questions may have diagrams or technical specifications'
    ]
  },
  'Stratavax EvalEx Comprehensive Assessment': {
    icon: '📊',
    color: '#607D8B',
    gradient: 'linear-gradient(135deg, #607D8B, #455A64)',
    timeLimit: '60-75 minutes',
    instructions: [
      'Comprehensive evaluation covering all competency areas',
      'Take your time and answer thoughtfully',
      'This assessment provides a complete profile of your capabilities',
      'Results will help identify overall strengths and development needs'
    ]
  }
};

export default function PreAssessment() {
  const router = useRouter();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedInstructions, setExpandedInstructions] = useState({});

  useEffect(() => {
    checkUser();
    fetchAssessments();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSession(session);
    } catch (error) {
      console.error("Error checking session:", error);
      router.push("/login");
    }
  };

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          assessment_categories (
            id,
            name,
            description,
            icon
          )
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      // Get question counts for each assessment
      const assessmentsWithCounts = await Promise.all(
        (data || []).map(async (assessment) => {
          const { count, error: countError } = await supabase
            .from("questions")
            .select("*", { count: 'exact', head: true })
            .eq("assessment_id", assessment.id);

          if (countError) {
            console.error(`Error counting questions for ${assessment.id}:`, countError);
            return { ...assessment, question_count: 0 };
          }

          // Get config or use default
          const config = ASSESSMENT_CONFIG[assessment.name] || {
            icon: '📋',
            color: '#667eea',
            gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
            timeLimit: '30-40 minutes',
            instructions: [
              `${count || 0} questions to assess your skills and abilities`,
              'Read each question carefully before answering',
              'Choose the option that best reflects your approach',
              'Take your time - there is no time limit for individual questions'
            ]
          };

          return { 
            ...assessment, 
            question_count: count || 0,
            config
          };
        })
      );

      setAssessments(assessmentsWithCounts);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setError("Failed to load assessments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (assessmentId) => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    router.push(`/assessment/${assessmentId}`);
  };

  const toggleInstructions = (assessmentId) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [assessmentId]: !prev[assessmentId]
    }));
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading assessments...</div>
        </div>
      </div>
    );
  }

  const filteredAssessments = assessments.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Assessment Center</h1>
        <p style={styles.headerSubtitle}>
          Complete these assessments to help us understand your skills, behaviors, and potential.
          Each assessment provides valuable insights for your professional development.
        </p>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Search assessments by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={fetchAssessments} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Assessments Grid */}
      {filteredAssessments.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>🔍</div>
          <h3 style={styles.emptyStateTitle}>No Assessments Found</h3>
          <p style={styles.emptyStateText}>
            {searchTerm ? `No assessments matching "${searchTerm}"` : "No assessments available"}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={styles.clearButton}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div style={styles.gridContainer}>
          {filteredAssessments.map((assessment) => {
            const config = assessment.config;
            const isExpanded = expandedInstructions[assessment.id];
            
            return (
              <div key={assessment.id} style={styles.card}>
                {/* Card Header with Gradient */}
                <div style={{
                  ...styles.cardHeader,
                  background: config.gradient
                }}>
                  <div style={styles.cardIcon}>{config.icon}</div>
                  <h2 style={styles.cardTitle}>{assessment.name}</h2>
                </div>

                {/* Card Body */}
                <div style={styles.cardBody}>
                  {/* Stats */}
                  <div style={styles.statsContainer}>
                    <div style={styles.stat}>
                      <span style={styles.statIcon}>📝</span>
                      <span style={styles.statLabel}>{assessment.question_count} Questions</span>
                    </div>
                    <div style={styles.stat}>
                      <span style={styles.statIcon}>⏱️</span>
                      <span style={styles.statLabel}>{config.timeLimit}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={styles.description}>
                    {assessment.description || 'Comprehensive assessment to evaluate your skills and capabilities.'}
                  </p>

                  {/* Instructions Section */}
                  <div style={styles.instructionsSection}>
                    <button
                      onClick={() => toggleInstructions(assessment.id)}
                      style={styles.instructionsToggle}
                    >
                      <span style={styles.instructionsToggleText}>
                        <span style={styles.instructionsIcon}>📋</span>
                        Assessment Instructions
                      </span>
                      <span style={{
                        ...styles.instructionsArrow,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)'
                      }}>▼</span>
                    </button>
                    
                    {isExpanded && (
                      <div style={styles.instructionsList}>
                        {config.instructions.map((instruction, index) => (
                          <div key={index} style={styles.instructionItem}>
                            <span style={styles.instructionBullet}>•</span>
                            <span style={styles.instructionText}>{instruction}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => handleStartAssessment(assessment.id)}
                    style={{
                      ...styles.startButton,
                      background: config.gradient
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 10px 20px ${config.color}80`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${config.color}60`;
                    }}
                  >
                    Start Assessment →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          All assessments are confidential and results are used for development purposes only.
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ===== STYLES =====
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '40px 20px'
  },
  header: {
    maxWidth: '800px',
    margin: '0 auto 40px',
    textAlign: 'center'
  },
  headerTitle: {
    fontSize: '42px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '15px',
    letterSpacing: '-0.5px'
  },
  headerSubtitle: {
    fontSize: '18px',
    color: '#475569',
    lineHeight: '1.6'
  },
  searchContainer: {
    maxWidth: '600px',
    margin: '0 auto 40px'
  },
  searchInput: {
    width: '100%',
    padding: '16px 24px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '50px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  errorBanner: {
    maxWidth: '800px',
    margin: '0 auto 30px',
    padding: '16px 24px',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    color: '#991b1b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  retryButton: {
    padding: '8px 16px',
    background: 'white',
    border: '1px solid #991b1b',
    borderRadius: '8px',
    color: '#991b1b',
    cursor: 'pointer',
    fontWeight: '600'
  },
  emptyState: {
    maxWidth: '500px',
    margin: '60px auto',
    textAlign: 'center',
    background: 'white',
    padding: '60px 40px',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
  },
  emptyStateIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  emptyStateTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '10px'
  },
  emptyStateText: {
    color: '#64748b',
    marginBottom: '25px'
  },
  clearButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  gridContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '30px'
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  cardHeader: {
    padding: '30px',
    color: 'white'
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    lineHeight: '1.4'
  },
  cardBody: {
    padding: '30px'
  },
  statsContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f5f9'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statIcon: {
    fontSize: '18px'
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569'
  },
  description: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#64748b',
    marginBottom: '25px'
  },
  instructionsSection: {
    marginBottom: '25px'
  },
  instructionsToggle: {
    width: '100%',
    padding: '14px 18px',
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  instructionsToggleText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  instructionsIcon: {
    fontSize: '18px'
  },
  instructionsArrow: {
    fontSize: '14px',
    color: '#64748b',
    transition: 'transform 0.3s ease'
  },
  instructionsList: {
    marginTop: '15px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  instructionItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#475569',
    ':last-child': {
      marginBottom: 0
    }
  },
  instructionBullet: {
    color: '#667eea',
    fontSize: '18px',
    lineHeight: '1.4'
  },
  instructionText: {
    flex: 1,
    lineHeight: '1.5'
  },
  startButton: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  footer: {
    maxWidth: '800px',
    margin: '60px auto 0',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '14px',
    color: '#64748b'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  },
  loadingContent: {
    textAlign: 'center',
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingText: {
    fontSize: '18px',
    color: '#475569'
  }
};
