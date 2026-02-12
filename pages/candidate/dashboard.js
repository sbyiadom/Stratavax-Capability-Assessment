import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

export default function CandidateDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  const [assessments, setAssessments] = useState([]);
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const [inProgressAssessments, setInProgressAssessments] = useState([]);
  const [userName, setUserName] = useState("");

  // Assessment type configuration with icons and colors - ONE PER TYPE
  const assessmentTypes = [
    { 
      id: 'general', 
      label: '📋 General Assessment', 
      description: 'Comprehensive 5-area evaluation',
      icon: '📋',
      color: '#4A6FA5',
      lightColor: 'rgba(74, 111, 165, 0.1)'
    },
    { 
      id: 'behavioral', 
      label: '🧠 Behavioral & Soft Skills', 
      description: 'Communication, teamwork, EQ, adaptability',
      icon: '🧠',
      color: '#9C27B0',
      lightColor: 'rgba(156, 39, 176, 0.1)'
    },
    { 
      id: 'cognitive', 
      label: '💡 Cognitive & Thinking Skills', 
      description: 'Problem-solving, critical thinking, learning agility',
      icon: '💡',
      color: '#FF9800',
      lightColor: 'rgba(255, 152, 0, 0.1)'
    },
    { 
      id: 'cultural', 
      label: '🤝 Cultural & Attitudinal Fit', 
      description: 'Values alignment, OCB, reliability, safety',
      icon: '🤝',
      color: '#4CAF50',
      lightColor: 'rgba(76, 175, 80, 0.1)'
    },
    { 
      id: 'manufacturing', 
      label: '⚙️ Manufacturing Technical Skills', 
      description: 'Blowing machines, Labeler, Filling, Conveyors, Stretchwrappers, Shrinkwrappers, Date coders',
      icon: '⚙️',
      color: '#F44336',
      lightColor: 'rgba(244, 67, 54, 0.1)'
    },
    { 
      id: 'leadership', 
      label: '👑 Leadership Potential', 
      description: 'Vision, coaching, decision-making, influence',
      icon: '👑',
      color: '#FFC107',
      lightColor: 'rgba(255, 193, 7, 0.1)'
    }
  ];

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Candidate');
      fetchAssessments();
      fetchUserProgress();
    }
  }, [session]);

  // Fetch assessments - ENSURE ONLY ONE PER TYPE
  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      
      if (data) {
        // If no assessments exist, create default ones
        if (data.length === 0) {
          await createDefaultAssessments();
          // Fetch again
          const { data: newData } = await supabase
            .from("assessments")
            .select("*")
            .eq("is_active", true);
          
          // Ensure only one per type
          const uniqueAssessments = removeDuplicateAssessments(newData || []);
          setAssessments(uniqueAssessments);
        } else {
          // Ensure only one per type
          const uniqueAssessments = removeDuplicateAssessments(data);
          setAssessments(uniqueAssessments);
        }
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Remove duplicate assessments - KEEP ONLY THE LATEST
  const removeDuplicateAssessments = (assessments) => {
    const assessmentMap = new Map();
    
    assessments.forEach(assessment => {
      const existing = assessmentMap.get(assessment.assessment_type);
      // Keep the most recently created one
      if (!existing || new Date(assessment.created_at) > new Date(existing.created_at)) {
        assessmentMap.set(assessment.assessment_type, assessment);
      }
    });
    
    return Array.from(assessmentMap.values());
  };

  // Create default assessments - USING UPSERT TO AVOID DUPLICATES
  const createDefaultAssessments = async () => {
    const defaultAssessments = [
      {
        name: 'General Assessment',
        description: 'Comprehensive assessment covering all 5 key areas',
        assessment_type: 'general',
        category_description: 'Measures cognitive abilities, personality, leadership, technical competence, and performance',
        icon_name: '📋',
        total_questions: 100,
        duration_minutes: 180,
        passing_score: 60,
        is_active: true
      },
      {
        name: 'Behavioral & Soft Skills Assessment',
        description: 'Evaluate communication, teamwork, emotional intelligence, and interpersonal skills',
        assessment_type: 'behavioral',
        category_description: 'Measures adaptability, emotional intelligence, communication, teamwork, initiative, time management, and resilience',
        icon_name: '🧠',
        total_questions: 100,
        duration_minutes: 120,
        passing_score: 70,
        is_active: true
      },
      {
        name: 'Cognitive & Thinking Skills Assessment',
        description: 'Assess problem-solving, critical thinking, learning agility, and creativity',
        assessment_type: 'cognitive',
        category_description: 'Measures problem-solving, critical thinking, learning agility, and creative innovation',
        icon_name: '💡',
        total_questions: 100,
        duration_minutes: 90,
        passing_score: 65,
        is_active: true
      },
      {
        name: 'Cultural & Attitudinal Fit Assessment',
        description: 'Evaluate alignment with company values, work ethic, and organizational citizenship',
        assessment_type: 'cultural',
        category_description: 'Measures core values alignment, OCB, reliability, customer focus, safety awareness, and commercial acumen',
        icon_name: '🤝',
        total_questions: 100,
        duration_minutes: 60,
        passing_score: 75,
        is_active: true
      },
      {
        name: 'Manufacturing Technical Skills Assessment',
        description: 'Comprehensive assessment on manufacturing equipment and processes',
        assessment_type: 'manufacturing',
        category_description: 'Tests knowledge of Blowing Machines, Labeler, Filling, Conveyors, Stretchwrappers, Shrinkwrappers, Date Coders, and Raw Materials',
        icon_name: '⚙️',
        total_questions: 100,
        duration_minutes: 150,
        passing_score: 75,
        is_active: true
      },
      {
        name: 'Leadership Potential Assessment',
        description: 'Comprehensive evaluation of leadership capabilities and people management',
        assessment_type: 'leadership',
        category_description: 'Measures vision setting, team development, decision-making, influence, coaching, and strategic leadership',
        icon_name: '👑',
        total_questions: 100,
        duration_minutes: 120,
        passing_score: 75,
        is_active: true
      }
    ];

    for (const assessment of defaultAssessments) {
      // UPSERT - update if exists, insert if not
      const { error } = await supabase
        .from("assessments")
        .upsert(
          {
            assessment_type: assessment.assessment_type,
            name: assessment.name,
            description: assessment.description,
            category_description: assessment.category_description,
            icon_name: assessment.icon_name,
            total_questions: assessment.total_questions,
            duration_minutes: assessment.duration_minutes,
            passing_score: assessment.passing_score,
            is_active: assessment.is_active
          },
          { 
            onConflict: 'assessment_type',
            ignoreDuplicates: false 
          }
        );
      
      if (error) console.error(`Error creating ${assessment.assessment_type} assessment:`, error);
    }
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

  const getInProgressTime = (assessmentId) => {
    const inProgress = inProgressAssessments.find(a => a.assessment_id === assessmentId);
    return inProgress?.time_spent || 0;
  };

  // Get assessment by type - RETURNS ONLY ONE
  const getAssessmentByType = (type) => {
    return assessments.find(a => a.assessment_type === type);
  };

  // Get count of completed assessments
  const getCompletedCount = () => {
    return completedAssessments.length;
  };

  // Get total available assessments
  const getTotalAssessments = () => {
    return assessments.length;
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
          <div style={{ fontSize: "24px", marginBottom: "20px" }}>Loading your dashboard...</div>
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

  const activeTypeConfig = assessmentTypes.find(t => t.id === activeTab) || assessmentTypes[0];
  const activeAssessment = getAssessmentByType(activeTab);
  const completedCount = getCompletedCount();
  const totalAssessments = getTotalAssessments();
  const progressPercentage = totalAssessments > 0 ? Math.round((completedCount / totalAssessments) * 100) : 0;

  return (
    <AppLayout>
      <div style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px 20px"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto"
        }}>
          
          {/* Header with Welcome and Progress */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px"
          }}>
            <div>
              <h1 style={{ 
                margin: "0 0 10px 0", 
                color: "#1a2639",
                fontSize: "32px",
                fontWeight: "700"
              }}>
                Welcome back, {userName}! 👋
              </h1>
              <p style={{ 
                color: "#64748b", 
                fontSize: "16px",
                margin: 0
              }}>
                Select an assessment to begin or continue. You have completed {completedCount} of {totalAssessments} assessments.
              </p>
            </div>
            
            {/* Overall Progress Ring */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              background: "#f8fafc",
              padding: "15px 25px",
              borderRadius: "12px"
            }}>
              <div style={{
                position: "relative",
                width: "80px",
                height: "80px"
              }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#4CAF50"
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
                  color: "#1a2639"
                }}>
                  {progressPercentage}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: "14px", color: "#64748b" }}>Overall Progress</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#1a2639" }}>
                  {completedCount}/{totalAssessments}
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Type Tabs - SHOWING 1 ASSESSMENT PER TYPE */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "30px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "5px"
            }}>
              {assessmentTypes.map(tab => {
                const isActive = activeTab === tab.id;
                const hasAssessment = !!getAssessmentByType(tab.id);
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => hasAssessment && setActiveTab(tab.id)}
                    disabled={!hasAssessment}
                    style={{
                      padding: "15px 25px",
                      background: isActive ? tab.color : "white",
                      color: isActive ? "white" : "#64748b",
                      border: isActive ? "none" : "2px solid #e2e8f0",
                      borderRadius: "12px",
                      cursor: hasAssessment ? "pointer" : "not-allowed",
                      fontWeight: isActive ? "600" : "400",
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "all 0.2s",
                      opacity: hasAssessment ? 1 : 0.5,
                      minWidth: "200px",
                      flex: "0 0 auto"
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{tab.icon}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: "600" }}>{tab.label}</div>
                      <div style={{ 
                        fontSize: "12px", 
                        opacity: isActive ? 0.9 : 0.7,
                        marginTop: "2px"
                      }}>
                        {hasAssessment ? '1 assessment' : 'Coming soon'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tab Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}>
            <div>
              <h2 style={{ 
                margin: "0 0 5px 0", 
                color: "#1a2639",
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span>{activeTypeConfig.icon}</span>
                {activeTypeConfig.label}
              </h2>
              <p style={{ color: "#64748b", margin: 0 }}>
                {activeTypeConfig.description}
              </p>
            </div>
            
            {/* Quick Stats */}
            <div style={{
              display: "flex",
              gap: "15px"
            }}>
              <div style={{
                background: activeTypeConfig.lightColor,
                padding: "10px 15px",
                borderRadius: "8px",
                color: activeTypeConfig.color,
                fontSize: "14px",
                fontWeight: "500"
              }}>
                {activeAssessment ? (isAssessmentCompleted(activeAssessment.id) ? '✓ Completed' : '📝 Not Started') : 'No assessment'}
              </div>
            </div>
          </div>

          {/* Single Assessment Card - ONLY ONE PER TYPE */}
          {activeAssessment ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "25px"
            }}>
              {(() => {
                const assessment = activeAssessment;
                const completed = isAssessmentCompleted(assessment.id);
                const inProgress = isAssessmentInProgress(assessment.id);
                const score = getAssessmentScore(assessment.id);
                const timeSpent = getInProgressTime(assessment.id);
                
                // Calculate passing status
                const passed = completed && score >= (assessment.passing_score || 60);
                
                return (
                  <div
                    key={assessment.id}
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      padding: "30px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                      transition: "all 0.3s ease",
                      border: completed 
                        ? passed 
                          ? "2px solid #4CAF50" 
                          : "2px solid #FF9800"
                        : inProgress
                          ? `2px solid ${activeTypeConfig.color}`
                          : "2px solid transparent",
                      opacity: completed ? 0.9 : 1,
                      cursor: completed ? "default" : "pointer",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onClick={() => {
                      if (!completed) {
                        router.push(`/assessment/${assessment.id}`);
                      }
                    }}
                  >
                    {/* Status Badge */}
                    <div style={{
                      position: "absolute",
                      top: "20px",
                      right: "20px",
                      padding: "8px 16px",
                      borderRadius: "30px",
                      fontSize: "13px",
                      fontWeight: "600",
                      background: completed 
                        ? passed 
                          ? "#4CAF50" 
                          : "#FF9800"
                        : inProgress
                          ? activeTypeConfig.color
                          : "#e2e8f0",
                      color: completed || inProgress ? "white" : "#64748b"
                    }}>
                      {completed 
                        ? passed 
                          ? "✓ Passed" 
                          : "⚠️ Needs Review"
                        : inProgress
                          ? "🕐 In Progress"
                          : "📝 Not Started"
                      }
                    </div>

                    {/* Header */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      marginBottom: "25px"
                    }}>
                      <div style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "16px",
                        background: activeTypeConfig.lightColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "36px"
                      }}>
                        {assessment.icon_name || activeTypeConfig.icon}
                      </div>
                      <div>
                        <h3 style={{ 
                          margin: "0 0 8px 0", 
                          color: "#1a2639",
                          fontSize: "24px",
                          fontWeight: "600"
                        }}>
                          {assessment.name}
                        </h3>
                        <div style={{
                          display: "flex",
                          gap: "20px",
                          fontSize: "14px",
                          color: "#64748b"
                        }}>
                          <span>⏱️ {assessment.duration_minutes} minutes</span>
                          <span>📝 {assessment.total_questions} questions</span>
                          <span>🎯 Pass: {assessment.passing_score}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ 
                      color: "#64748b", 
                      fontSize: "16px",
                      lineHeight: "1.6",
                      marginBottom: "25px",
                      maxWidth: "800px"
                    }}>
                      {assessment.category_description || assessment.description}
                    </p>

                    {/* Progress or Score */}
                    {completed ? (
                      <div style={{
                        background: passed ? "#E8F5E9" : "#FFF3E0",
                        borderRadius: "12px",
                        padding: "20px",
                        marginBottom: "25px",
                        maxWidth: "400px"
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px"
                        }}>
                          <span style={{ 
                            fontSize: "16px", 
                            fontWeight: "600",
                            color: passed ? "#2E7D32" : "#E65100"
                          }}>
                            Final Score
                          </span>
                          <span style={{ 
                            fontSize: "32px", 
                            fontWeight: "700",
                            color: passed ? "#2E7D32" : "#E65100"
                          }}>
                            {score}%
                          </span>
                        </div>
                        <div style={{
                          height: "10px",
                          background: "#E0E0E0",
                          borderRadius: "5px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${score}%`,
                            background: passed ? "#4CAF50" : "#FF9800",
                            borderRadius: "5px"
                          }} />
                        </div>
                        <div style={{
                          fontSize: "13px",
                          color: passed ? "#2E7D32" : "#E65100",
                          marginTop: "10px",
                          textAlign: "right"
                        }}>
                          {passed ? "✓ Passed - Congratulations!" : "⚡ Below passing score - Review recommended"}
                        </div>
                      </div>
                    ) : inProgress ? (
                      <div style={{
                        background: activeTypeConfig.lightColor,
                        borderRadius: "12px",
                        padding: "20px",
                        marginBottom: "25px",
                        maxWidth: "400px"
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px"
                        }}>
                          <span style={{ 
                            fontSize: "16px", 
                            fontWeight: "600",
                            color: activeTypeConfig.color
                          }}>
                            In Progress
                          </span>
                          <span style={{ 
                            fontSize: "16px",
                            fontWeight: "600",
                            color: activeTypeConfig.color
                          }}>
                            {Math.floor(timeSpent / 60)}m used
                          </span>
                        </div>
                        <div style={{
                          fontSize: "15px",
                          color: activeTypeConfig.color,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <span>🕐</span> You have an in-progress assessment. Click to resume.
                        </div>
                      </div>
                    ) : null}

                    {/* Action Button */}
                    {!completed && (
                      <Link href={`/assessment/${assessment.id}`} legacyBehavior>
                        <a style={{
                          display: "inline-block",
                          background: inProgress ? activeTypeConfig.color : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          padding: "14px 40px",
                          borderRadius: "10px",
                          textDecoration: "none",
                          fontWeight: "600",
                          fontSize: "16px",
                          transition: "all 0.3s",
                          border: "none",
                          cursor: "pointer"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}>
                          {inProgress ? "🕐 Continue Assessment" : "🚀 Start Assessment"}
                        </a>
                      </Link>
                    )}

                    {completed && (
                      <div style={{
                        display: "inline-block",
                        padding: "14px 40px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        color: "#64748b",
                        fontSize: "15px",
                        fontWeight: "500"
                      }}>
                        ✓ Completed on {new Date(completedAssessments.find(a => a.assessment_id === assessment.id)?.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔧</div>
              <h3 style={{ color: "#1a2639", marginBottom: "10px", fontSize: "24px" }}>
                Assessment Coming Soon
              </h3>
              <p style={{ color: "#64748b", maxWidth: "400px", margin: "0 auto", fontSize: "16px" }}>
                The {activeTypeConfig.label.toLowerCase()} is being prepared. Please check back later.
              </p>
            </div>
          )}

          {/* Footer with Progress Summary - SHOWING 0/1 or 1/1 */}
          <div style={{
            marginTop: "40px",
            background: "white",
            borderRadius: "16px",
            padding: "25px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ 
              margin: "0 0 20px 0", 
              color: "#1a2639",
              fontSize: "20px",
              fontWeight: "600"
            }}>
              Your Assessment Journey
            </h3>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px"
            }}>
              {assessmentTypes.map(type => {
                const typeAssessment = getAssessmentByType(type.id);
                const hasAssessment = !!typeAssessment;
                const isCompleted = typeAssessment ? isAssessmentCompleted(typeAssessment.id) : false;
                const completedCount = isCompleted ? 1 : 0;
                const progress = isCompleted ? 100 : 0;
                
                return (
                  <div key={type.id} style={{
                    padding: "20px",
                    background: type.lightColor,
                    borderRadius: "12px",
                    opacity: hasAssessment ? 1 : 0.6,
                    border: isCompleted ? `2px solid ${type.color}` : 'none'
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "15px"
                    }}>
                      <span style={{ fontSize: "24px" }}>{type.icon}</span>
                      <div>
                        <span style={{ 
                          fontSize: "15px", 
                          fontWeight: "600",
                          color: type.color
                        }}>
                          {type.label.split(' ').slice(0, 2).join(' ')}
                        </span>
                        {isCompleted && (
                          <span style={{
                            display: "block",
                            fontSize: "11px",
                            color: type.color,
                            marginTop: "2px"
                          }}>
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px"
                    }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>Progress</span>
                      <span style={{ 
                        fontSize: "20px", 
                        fontWeight: "700",
                        color: type.color
                      }}>
                        {completedCount}/1
                      </span>
                    </div>
                    <div style={{
                      height: "8px",
                      background: "#e2e8f0",
                      borderRadius: "4px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: type.color,
                        borderRadius: "4px",
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                    {!hasAssessment && (
                      <div style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        marginTop: "12px",
                        textAlign: "center",
                        fontStyle: "italic"
                      }}>
                        Coming soon
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
