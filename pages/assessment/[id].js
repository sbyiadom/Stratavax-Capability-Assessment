import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";

// Color scheme for different sections
const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #2E4C7E 100%)',
    icon: '🧠',
    bgColor: '#E8EFF7'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
    icon: '😊',
    bgColor: '#F3E5F5'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    gradient: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
    icon: '👑',
    bgColor: '#FFEBEE'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    gradient: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)',
    icon: '⚙️',
    bgColor: '#E8F5E9'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    gradient: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
    icon: '📊',
    bgColor: '#FFF3E0'
  }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);
const TIME_LIMIT_SECONDS = 10800; // 3 hours

// Save response function
async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    const { error } = await supabase
      .from("responses")
      .upsert({
        assessment_id: assessmentId,
        question_id: parseInt(questionId),
        answer_id: parseInt(answerId),
        user_id: userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'assessment_id,question_id,user_id' });

    if (error) throw new Error(`Save failed: ${error.message}`);
    return { success: true };
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  }
}

// Load user responses
async function loadUserResponses(userId) {
  try {
    const { data } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
      .eq("user_id", userId);

    const responses = {};
    data?.forEach(r => responses[r.question_id] = r.answer_id);
    return responses;
  } catch (error) {
    return {};
  }
}

export default function AssessmentPage() {
  const router = useRouter();
  const assessmentId = '11111111-1111-1111-1111-111111111111';

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [saveStatus, setSaveStatus] = useState({});
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Background images
  const backgrounds = [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80",
  ];

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setIsSessionReady(true);
      } else {
        router.push("/login");
      }
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setIsSessionReady(!!session);
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [router]);

  // Fetch questions
  useEffect(() => {
    if (!isSessionReady || !session?.user?.id) return;

    const fetchAssessmentData = async () => {
      try {
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            answers!inner (id, answer_text, score)
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (questionsError) throw new Error(`Failed to load questions: ${questionsError.message}`);

        if (!questionsData || questionsData.length === 0) {
          throw new Error("Assessment questions not found. Please run the setup scripts.");
        }

        const savedAnswers = await loadUserResponses(session.user.id);

        // Process questions
        const processedQuestions = questionsData.map(q => ({
          ...q,
          id: parseInt(q.id),
          options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
        }));

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
        console.log(`Loaded ${processedQuestions.length} questions`);

      } catch (error) {
        console.error("Assessment loading error:", error);
        alert(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId, isSessionReady, session]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Answer selection
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) return;

    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 1500);

    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
      alert("Failed to save answer. Please try again.");
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const handleJump = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  // Submit assessment
  const submitAssessment = async () => {
    if (!session?.user?.id) {
      alert("Please log in to submit your assessment.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const answeredCount = Object.keys(answers).length;
      alert(`✅ Assessment Submitted!\n\nYou answered ${answeredCount} of ${questions.length} questions.\n\nResults will be available shortly.`);
      
      router.push("/results");
      
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Calculate section progress
  const getSectionProgress = (section) => {
    const sectionQuestions = questions.filter(q => q.section === section);
    const answered = sectionQuestions.filter(q => answers[q.id]).length;
    const total = sectionQuestions.length;
    
    return { 
      answered, 
      total,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0
    };
  };

  // Calculate time
  const timeRemaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "20px" }}>
            Loading Assessment...
          </div>
          <div style={{ width: "200px", height: "4px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "2px", margin: "0 auto" }}>
            <div style={{ 
              width: "60%", 
              height: "100%", 
              backgroundColor: "white",
              borderRadius: "2px",
              animation: "loading 1.5s infinite"
            }} />
          </div>
          <style jsx>{`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "24px", marginBottom: "20px" }}>
            Assessment Not Ready
          </div>
          <div style={{ fontSize: "16px", marginBottom: "30px", maxWidth: "500px" }}>
            Please run the SQL setup scripts to create the assessment questions.
          </div>
          <button 
            onClick={() => router.push("/")}
            style={{
              padding: "12px 30px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection];
  const saveState = saveStatus[currentQuestion?.id];
  const totalAnswered = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentBackground = backgrounds[currentIndex % backgrounds.length];

  return (
    <>
      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}>
          <div style={{
            background: "white",
            padding: "30px",
            borderRadius: "16px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
          }}>
            <h2 style={{ marginTop: 0, color: "#1565c0", fontSize: "24px" }}>
              Submit Assessment?
            </h2>
            
            <div style={{ 
              margin: "20px 0", 
              padding: "20px", 
              background: "#f8f9fa", 
              borderRadius: "10px"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px"
              }}>
                <span>Questions Answered:</span>
                <span style={{ fontWeight: "700", color: "#4caf50" }}>
                  {totalAnswered}/{questions.length}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px"
              }}>
                <span>Completion Rate:</span>
                <span style={{ fontWeight: "700", color: "#2196f3" }}>
                  {Math.round((totalAnswered / questions.length) * 100)}%
                </span>
              </div>
              
              <div style={{ height: "10px", background: "#e0e0e0", borderRadius: "5px", margin: "15px 0" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${(totalAnswered / questions.length) * 100}%`, 
                  background: "#4caf50", 
                  borderRadius: "5px"
                }} />
              </div>
            </div>

            <p style={{ marginBottom: "25px", fontSize: "16px", lineHeight: "1.6" }}>
              {questions.length - totalAnswered > 0 
                ? `You have ${questions.length - totalAnswered} unanswered questions. Are you ready to submit?`
                : "All questions have been answered. Ready to submit?"}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: "10px 20px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Continue Assessment
              </button>
              <button
                onClick={submitAssessment}
                disabled={isSubmitting}
                style={{
                  padding: "10px 25px",
                  background: isSubmitting ? "#81c784" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "700"
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Assessment Interface - NO SCROLLING */}
      <div style={{
        height: "100vh",
        overflow: "hidden",
        background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${currentBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}>
        <div style={{ 
          height: "100vh", 
          padding: "20px", 
          display: "flex", 
          flexDirection: "column",
          maxWidth: "1600px",
          margin: "0 auto"
        }}>
          
          {/* Header - Fixed Height */}
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "20px 25px",
            marginBottom: "20px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: "24px", 
                  fontWeight: "800", 
                  color: "#1a237e",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <span style={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}>
                    🏢 Stratavax Capability Assessment
                  </span>
                </h1>
                <div style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#5a5a5a" }}>
                  <div>Question {currentIndex + 1} of {questions.length} • Time: {hours}h {minutes}m {seconds}s</div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div style={{
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                  borderRadius: "20px",
                  fontWeight: "700",
                  color: "#1565c0",
                  fontSize: "14px",
                  border: "2px solid #90caf9"
                }}>
                  {totalAnswered}/{questions.length} Answered
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area - Flex to fill available space */}
          <div style={{ 
            flex: 1, 
            display: "flex", 
            gap: "20px",
            overflow: "hidden",
            minHeight: 0
          }}>
            
            {/* Left Panel - Question & Answers */}
            <div style={{ 
              flex: 3,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              overflow: "hidden"
            }}>
              
              {/* Section Header */}
              <div style={{
                background: sectionConfig.gradient,
                color: "white",
                padding: "15px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexShrink: 0
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px"
                }}>
                  {sectionConfig.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "18px", marginBottom: "2px" }}>
                    {currentSection}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    {currentIndex + 1} of {questions.length}
                  </div>
                </div>
                
                {/* Save Status */}
                {saveState && (
                  <div style={{
                    padding: "6px 12px",
                    borderRadius: "15px",
                    background: saveState === "saved" ? "rgba(76, 175, 80, 0.9)" : 
                               saveState === "saving" ? "rgba(255, 183, 77, 0.9)" : 
                               "rgba(244, 67, 54, 0.9)",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {saveState === "saved" ? "✅ Saved" : 
                     saveState === "saving" ? "⏳ Saving..." : "❌ Error"}
                  </div>
                )}
              </div>

              {/* Question - Fixed Height */}
              <div style={{
                padding: "20px",
                background: sectionConfig.bgColor,
                borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
                flexShrink: 0,
                maxHeight: "150px",
                overflow: "auto"
              }}>
                <div style={{
                  fontSize: "18px",
                  lineHeight: "1.6",
                  color: "#333"
                }}>
                  {currentQuestion?.question_text}
                </div>
              </div>

              {/* Answers - Scrollable but contained */}
              <div style={{ 
                flex: 1,
                padding: "20px",
                overflow: "auto",
                minHeight: 0
              }}>
                {currentQuestion && (
                  <QuestionCard
                    question={currentQuestion}
                    selected={answers[currentQuestion.id]}
                    onSelect={(answerId) => handleSelect(currentQuestion.id, answerId)}
                    disabled={saveState === "saving"}
                  />
                )}
              </div>

              {/* Navigation - Fixed at bottom */}
              <div style={{ 
                padding: "15px 20px",
                borderTop: "1px solid rgba(0, 0, 0, 0.1)",
                background: "rgba(255, 255, 255, 0.8)",
                display: "flex",
                justifyContent: "space-between",
                flexShrink: 0
              }}>
                <button 
                  onClick={handleBack} 
                  disabled={currentIndex === 0} 
                  style={{ 
                    padding: "12px 24px", 
                    background: currentIndex === 0 ? "#f5f5f5" : "#1565c0", 
                    color: currentIndex === 0 ? "#999" : "white", 
                    border: "none", 
                    borderRadius: "8px",
                    cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    minWidth: "140px"
                  }}
                >
                  ← Previous
                </button>
                
                {isLastQuestion ? (
                  <button 
                    onClick={() => setShowSubmitModal(true)}
                    style={{ 
                      padding: "12px 30px", 
                      background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "700",
                      minWidth: "160px"
                    }}
                  >
                    🏁 Submit Assessment
                  </button>
                ) : (
                  <button 
                    onClick={handleNext} 
                    style={{ 
                      padding: "12px 24px", 
                      background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "600",
                      minWidth: "140px"
                    }}
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel - Progress & Navigation */}
            <div style={{ 
              flex: 1, 
              display: "flex", 
              flexDirection: "column", 
              gap: "20px",
              minWidth: "300px",
              maxWidth: "350px"
            }}>
              
              {/* Question Navigation */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                flexShrink: 0
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "15px", 
                  color: "#1a237e",
                  fontSize: "16px",
                  fontWeight: "700"
                }}>
                  Question Navigator
                </h3>
                <div style={{ maxHeight: "200px", overflow: "auto" }}>
                  <QuestionNav
                    questions={questions}
                    answers={answers}
                    current={currentIndex}
                    onJump={handleJump}
                    compact={true}
                  />
                </div>
              </div>

              {/* Progress Summary */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                flex: 1,
                overflow: "auto",
                minHeight: 0
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "20px", 
                  color: "#1a237e",
                  fontSize: "16px",
                  fontWeight: "700"
                }}>
                  Progress Overview
                </h3>
                
                {/* Overall Progress */}
                <div style={{ marginBottom: "25px" }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginBottom: "10px", 
                    fontSize: "14px"
                  }}>
                    <span style={{ fontWeight: "600" }}>Overall Progress</span>
                    <span style={{ fontWeight: "700", color: "#4caf50" }}>
                      {Math.round((totalAnswered / questions.length) * 100)}%
                    </span>
                  </div>
                  <div style={{ 
                    height: "10px", 
                    background: "rgba(0, 0, 0, 0.1)", 
                    borderRadius: "5px",
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${(totalAnswered / questions.length) * 100}%`, 
                      background: "linear-gradient(90deg, #4caf50 0%, #81c784 100%)", 
                      borderRadius: "5px"
                    }} />
                  </div>
                </div>

                {/* Section Progress */}
                <div>
                  <h4 style={{ 
                    marginBottom: "15px", 
                    fontSize: "14px", 
                    color: "#333",
                    fontWeight: "600"
                  }}>
                    By Section
                  </h4>
                  {SECTION_ORDER.map(section => {
                    const progress = getSectionProgress(section);
                    const config = SECTION_CONFIG[section];
                    return (
                      <div key={section} style={{ marginBottom: "12px" }}>
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          fontSize: "13px", 
                          marginBottom: "6px"
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{config.icon}</span>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {section}
                            </span>
                          </span>
                          <span style={{ fontWeight: "600" }}>
                            {progress.answered}/{progress.total}
                          </span>
                        </div>
                        <div style={{ 
                          height: "5px", 
                          background: "rgba(0, 0, 0, 0.1)", 
                          borderRadius: "3px"
                        }}>
                          <div style={{ 
                            height: "100%", 
                            width: `${progress.percentage}%`, 
                            background: config.color, 
                            borderRadius: "3px"
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Info */}
                <div style={{
                  marginTop: "25px",
                  padding: "15px",
                  background: timeRemaining < 1800 ? 
                    "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)" : 
                    "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                  borderRadius: "10px",
                  border: `2px solid ${timeRemaining < 1800 ? "#ff5252" : "#4caf50"}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    marginBottom: "5px"
                  }}>
                    <span style={{ fontSize: "16px" }}>
                      {timeRemaining < 1800 ? "⏰" : "⏱️"}
                    </span>
                    <span style={{ 
                      fontSize: "13px", 
                      fontWeight: "700", 
                      color: timeRemaining < 1800 ? "#c62828" : "#2e7d32"
                    }}>
                      {timeRemaining < 1800 ? "Time Running Out!" : "Time Remaining"}
                    </span>
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#1a237e" }}>
                    {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
