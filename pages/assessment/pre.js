import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

export default function PreAssessmentPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
  const [userName, setUserName] = useState("");
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const [inProgressAssessments, setInProgressAssessments] = useState([]);

  // Assessment type configuration with icons and colors
  const assessmentTypes = [
    { 
      id: 'general', 
      label: '📋 General Assessment', 
      description: 'Comprehensive 5-area evaluation of cognitive abilities, personality, leadership, technical competence, and performance',
      icon: '📋',
      color: '#4A6FA5',
      lightColor: 'rgba(74, 111, 165, 0.1)',
      duration: '180 mins',
      questions: 100,
      passing: 60
    },
    { 
      id: 'behavioral', 
      label: '🧠 Behavioral & Soft Skills', 
      description: 'Communication, teamwork, emotional intelligence, adaptability, initiative, time management, and resilience',
      icon: '🧠',
      color: '#9C27B0',
      lightColor: 'rgba(156, 39, 176, 0.1)',
      duration: '120 mins',
      questions: 100,
      passing: 70
    },
    { 
      id: 'cognitive', 
      label: '💡 Cognitive & Thinking Skills', 
      description: 'Problem-solving, critical thinking, learning agility, creativity, and analytical reasoning',
      icon: '💡',
      color: '#FF9800',
      lightColor: 'rgba(255, 152, 0, 0.1)',
      duration: '90 mins',
      questions: 100,
      passing: 65
    },
    { 
      id: 'cultural', 
      label: '🤝 Cultural & Attitudinal Fit', 
      description: 'Values alignment, organizational citizenship, reliability, customer focus, safety awareness, and commercial acumen',
      icon: '🤝',
      color: '#4CAF50',
      lightColor: 'rgba(76, 175, 80, 0.1)',
      duration: '60 mins',
      questions: 100,
      passing: 75
    },
    { 
      id: 'manufacturing', 
      label: '⚙️ Manufacturing Technical Skills', 
      description: 'Blowing machines, Labeler, Filling, Conveyors, Stretchwrappers, Shrinkwrappers, Date coders, and Raw materials',
      icon: '⚙️',
      color: '#F44336',
      lightColor: 'rgba(244, 67, 54, 0.1)',
      duration: '150 mins',
      questions: 100,
      passing: 75
    },
    { 
      id: 'leadership', 
      label: '👑 Leadership Potential', 
      description: 'Vision setting, team development, coaching, decision-making, influence, and strategic leadership',
      icon: '👑',
      color: '#FFC107',
      lightColor: 'rgba(255, 193, 7, 0.1)',
      duration: '120 mins',
      questions: 100,
      passing: 75
    }
  ];

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Candidate');
      fetchAssessments();
      fetchUserProgress();
    }
  }, [session]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      
      if (data) {
        // Ensure only one per type
        const uniqueAssessments = removeDuplicateAssessments(data);
        setAssessments(uniqueAssessments);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicateAssessments = (assessments) => {
    const assessmentMap = new Map();
    assessments.forEach(assessment => {
      const existing = assessmentMap.get(assessment.assessment_type);
      if (!existing || new Date(assessment.created_at) > new Date(existing.created_at)) {
        assessmentMap.set(assessment.assessment_type, assessment);
      }
    });
    return Array.from(assessmentMap.values());
  };

  const fetchUserProgress = async () => {
    try {
      // Get completed assessments
      const { data: completed, error: completedError } = await supabase
        .from("assessment_results")
        .select("assessment_id, overall_score, completed_at, status")
        .eq("user_id", session.user.id)
        .eq("status", "completed");

      if (!completedError && completed) {
        setCompletedAssessments(completed);
      }

      // Get in-progress assessments
      const { data: inProgress, error: inProgressError } = await supabase
        .from("assessment_results")
        .select("assessment_id, time_spent, updated_at")
        .eq("user_id", session.user.id)
        .eq("status", "in_progress");

      if (!inProgressError && inProgress) {
        setInProgressAssessments(inProgress);
      }
    } catch (error) {
      console.error("Error fetching user progress:", error);
    }
  };

  const getAssessmentById = (type) => {
    return assessments.find(a => a.assessment_type === type);
  };

  const isAssessmentCompleted = (assessmentId) => {
    return completedAssessments.some(a => a.assessment_id === assessmentId);
  };

  const isAssessmentInProgress = (assessmentId) => {
    return inProgressAssessments.some(a => a.assessment_id === assessmentId);
  };

  const getAssessmentScore = (assessmentId) => {
    const completed = completedAssessments.find(a => a.assessment_id === assessmentId);
    return completed?.overall_score || null;
  };

  const handleStartAssessment = (e, assessmentId) => {
    e.preventDefault();
    e.stopPropagation();
    if (assessmentId) {
      router.push(`/assessment/${assessmentId}`);
    }
  };

  const getCompletedCount = () => {
    return completedAssessments.length;
  };

  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "24px", marginBottom: "20px" }}>Loading assessments...</div>
          <div style={{ 
            width: "50px", 
            height: "50px", 
            border: "5px solid rgba(255,255,255,0.3)",
            borderTop: "5px solid white",
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

  if (!session) return null;

  const completedCount = getCompletedCount();
  const totalAssessments = assessments.length;
  const progressPercentage = totalAssessments > 0 ? Math.round((completedCount / totalAssessments) * 100) : 0;

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={{
        minHeight: "100vh",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "1200px",
          backgroundColor: "rgba(255,255,255,0.98)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          backdropFilter: "blur(10px)"
        }}>
          
          {/* Header */}
          <div style={{
            textAlign: "center",
            marginBottom: "40px"
          }}>
            <h1 style={{ 
              margin: "0 0 15px 0", 
              color: "#1a2639",
              fontSize: "36px",
              fontWeight: "700"
            }}>
              Welcome to Stratavax Assessment Portal
            </h1>
            <p style={{ 
              color: "#64748b", 
              fontSize: "18px",
              margin: "0 auto",
              maxWidth: "800px",
              lineHeight: "1.6"
            }}>
              Hello <strong style={{ color: "#667eea" }}>{userName}</strong>! Please select the assessment you would like to take. 
              Each assessment is designed to evaluate specific skills and competencies.
            </p>
          </div>

          {/* Progress Summary Banner */}
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "40px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px"
          }}>
            <div>
              <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "5px" }}>
                Your Assessment Journey
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700" }}>
                {completedCount} of {totalAssessments} Completed
              </div>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "20px"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                position: "relative"
              }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${progressPercentage * 2.83} 283`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "white"
                }}>
                  {progressPercentage}%
                </div>
              </div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>
                Overall Progress
              </div>
            </div>
          </div>

          {/* Assessment Grid */}
          <h2 style={{
            fontSize: "24px",
            color: "#1a2639",
            marginBottom: "25px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span>📋 Available Assessments</span>
            <span style={{
              fontSize: "14px",
              fontWeight: "normal",
              color: "#64748b",
              marginLeft: "10px"
            }}>
              Select any assessment to begin
            </span>
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "25px",
            marginBottom: "30px"
          }}>
            {assessmentTypes.map(type => {
              const assessment = getAssessmentById(type.id);
              const hasAssessment = !!assessment;
              const isCompleted = assessment ? isAssessmentCompleted(assessment.id) : false;
              const isInProgress = assessment ? isAssessmentInProgress(assessment.id) : false;
              const score = assessment ? getAssessmentScore(assessment.id) : null;
              const passed = isCompleted && score >= (assessment?.passing_score || type.passing);

              if (!hasAssessment) return null;

              return (
                <div
                  key={type.id}
                  style={{
                    background: "white",
                    borderRadius: "20px",
                    padding: "30px",
                    boxShadow: isCompleted 
                      ? "0 10px 30px rgba(0,0,0,0.08)" 
                      : "0 15px 40px rgba(0,0,0,0.12)",
                    transition: "all 0.3s ease",
                    border: isCompleted 
                      ? passed 
                        ? "2px solid #4CAF50" 
                        : "2px solid #FF9800"
                      : isInProgress
                        ? `2px solid ${type.color}`
                        : "2px solid transparent",
                    position: "relative",
                    overflow: "hidden",
                    cursor: isCompleted ? "default" : "pointer",
                    opacity: isCompleted ? 0.9 : 1
                  }}
                  onClick={() => {
                    if (!isCompleted && assessment) {
                      router.push(`/assessment/${assessment.id}`);
                    }
                  }}
                >
                  {/* Status Badge */}
                  <div style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    padding: "6px 14px",
                    borderRadius: "30px",
                    fontSize: "12px",
                    fontWeight: "600",
                    background: isCompleted 
                      ? passed 
                        ? "#4CAF50" 
                        : "#FF9800"
                      : isInProgress
                        ? type.color
                        : "#e2e8f0",
                    color: isCompleted || isInProgress ? "white" : "#64748b"
                  }}>
                    {isCompleted 
                      ? passed 
                        ? "✓ Passed" 
                        : "⚠️ Needs Review"
                      : isInProgress
                        ? "🕐 In Progress"
                        : "📝 Ready"
                    }
                  </div>

                  {/* Icon and Title */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    marginBottom: "20px"
                  }}>
                    <div style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      background: type.lightColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px"
                    }}>
                      {type.icon}
                    </div>
                    <div>
                      <h3 style={{ 
                        margin: "0 0 5px 0", 
                        color: "#1a2639",
                        fontSize: "20px",
                        fontWeight: "600"
                      }}>
                        {type.label}
                      </h3>
                      <div style={{
                        display: "flex",
                        gap: "12px",
                        fontSize: "12px",
                        color: "#64748b"
                      }}>
                        <span>⏱️ {type.duration}</span>
                        <span>📝 {type.questions} Q</span>
                        <span>🎯 {type.passing}% pass</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{
                    color: "#475569",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    marginBottom: "25px",
                    minHeight: "65px"
                  }}>
                    {type.description}
                  </p>

                  {/* Score or Progress */}
                  {isCompleted && (
                    <div style={{
                      background: passed ? "#E8F5E9" : "#FFF3E0",
                      borderRadius: "12px",
                      padding: "15px",
                      marginBottom: "20px"
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ 
                          fontSize: "14px", 
                          fontWeight: "600",
                          color: passed ? "#2E7D32" : "#E65100"
                        }}>
                          Your Score
                        </span>
                        <span style={{ 
                          fontSize: "24px", 
                          fontWeight: "700",
                          color: passed ? "#2E7D32" : "#E65100"
                        }}>
                          {score}%
                        </span>
                      </div>
                      <div style={{
                        fontSize: "12px",
                        color: passed ? "#2E7D32" : "#E65100",
                        marginTop: "5px"
                      }}>
                        Completed on {new Date(completedAssessments.find(a => a.assessment_id === assessment?.id)?.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {isInProgress && !isCompleted && (
                    <div style={{
                      background: type.lightColor,
                      borderRadius: "12px",
                      padding: "15px",
                      marginBottom: "20px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        color: type.color,
                        fontWeight: "600"
                      }}>
                        <span>🕐</span>
                        <span>You have an assessment in progress</span>
                      </div>
                      <div style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "8px"
                      }}>
                        Click anywhere on this card to resume
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!isCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (assessment) {
                          router.push(`/assessment/${assessment.id}`);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "14px 20px",
                        background: isInProgress 
                          ? `linear-gradient(135deg, ${type.color} 0%, ${type.color}dd 100%)`
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {isInProgress ? (
                        <>
                          <span>🕐</span> Continue Assessment
                        </>
                      ) : (
                        <>
                          <span>🚀</span> Start Assessment
                        </>
                      )}
                    </button>
                  )}

                  {isCompleted && (
                    <div style={{
                      width: "100%",
                      padding: "14px 20px",
                      background: "#f1f5f9",
                      color: "#64748b",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "600",
                      textAlign: "center"
                    }}>
                      ✓ Assessment Completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Instructions and Guidelines */}
          <div style={{
            marginTop: "40px",
            padding: "30px",
            background: "#f8fafc",
            borderRadius: "16px",
            border: "1px solid #e2e8f0"
          }}>
            <h3 style={{
              margin: "0 0 20px 0",
              color: "#1a2639",
              fontSize: "18px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span>📌</span> Important Guidelines
            </h3>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ color: "#667eea", fontSize: "20px" }}>⏰</div>
                <div>
                  <div style={{ fontWeight: "600", color: "#1a2639", marginBottom: "5px" }}>
                    Time Limit
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>
                    Each assessment has a specific time limit shown on the card. The timer starts when you begin.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ color: "#667eea", fontSize: "20px" }}>🔄</div>
                <div>
                  <div style={{ fontWeight: "600", color: "#1a2639", marginBottom: "5px" }}>
                    One Attempt Only
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>
                    Each assessment can only be taken once. Make sure you're ready before starting.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ color: "#667eea", fontSize: "20px" }}>💾</div>
                <div>
                  <div style={{ fontWeight: "600", color: "#1a2639", marginBottom: "5px" }}>
                    Auto-Save
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>
                    Your answers are automatically saved. You can leave and return to resume where you left off.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ color: "#667eea", fontSize: "20px" }}>🛡️</div>
                <div>
                  <div style={{ fontWeight: "600", color: "#1a2639", marginBottom: "5px" }}>
                    Anti-Cheat Protection
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>
                    Right-click, copy/paste, and text selection are disabled during assessments.
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: "25px",
              padding: "20px",
              background: "#fff9c4",
              borderRadius: "12px",
              border: "1px solid #ffe082",
              display: "flex",
              alignItems: "flex-start",
              gap: "15px"
            }}>
              <div style={{ fontSize: "24px" }}>💡</div>
              <div>
                <div style={{ fontWeight: "600", color: "#856404", marginBottom: "5px" }}>
                  Pro Tip
                </div>
                <div style={{ fontSize: "14px", color: "#856404" }}>
                  You don't need to complete all assessments at once. Take them one at a time when you're ready. 
                  Your progress is automatically saved, and you can always return to continue where you left off.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Need help? Contact support@stratavax.com
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
