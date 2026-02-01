// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '🧠'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    lightBg: 'rgba(156, 39, 176, 0.1)',
    icon: '😊'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    lightBg: 'rgba(211, 47, 47, 0.1)',
    icon: '👑'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    lightBg: 'rgba(56, 142, 60, 0.1)',
    icon: '⚙️'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    lightBg: 'rgba(245, 124, 0, 0.1)',
    icon: '📊'
  }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);
const TIME_LIMIT_SECONDS = 10800;

async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    const { error } = await supabase.from("responses").upsert({
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [error, setError] = useState(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setIsSessionReady(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Session init error:", error);
        setError("Failed to initialize session");
      }
    };
    initSession();
  }, [router]);

  // Fetch questions
  useEffect(() => {
    if (!isSessionReady || !session?.user?.id) return;

    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
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

        const processedQuestions = questionsData.map(q => ({
          ...q,
          id: parseInt(q.id),
          options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
        }));

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
        setError(null);

      } catch (error) {
        console.error("Assessment loading error:", error);
        setError(error.message);
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

  // Submit assessment
  const submitAssessment = async () => {
    if (!session?.user?.id) {
      alert("Please log in to submit your assessment.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    try {
      // Add your submission logic here
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "40px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", fontWeight: "600", marginBottom: "20px" }}>
            Loading Assessment...
          </div>
          <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ 
              width: "60%", 
              height: "100%", 
              backgroundColor: "white",
              borderRadius: "3px",
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

  // Error state
  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "30px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", marginBottom: "20px" }}>
            Error Loading Assessment
          </div>
          <div style={{ 
            fontSize: "16px", 
            marginBottom: "30px", 
            lineHeight: 1.5,
            background: "rgba(255,255,255,0.1)",
            padding: "20px",
            borderRadius: "10px"
          }}>
            {error}
          </div>
          <button 
            onClick={() => router.push("/")}
            style={{
              padding: "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              width: "100%",
              minHeight: "44px"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "30px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", marginBottom: "20px" }}>
            No Questions Available
          </div>
          <div style={{ fontSize: "16px", marginBottom: "30px", lineHeight: 1.5 }}>
            No assessment questions found. Please run the setup scripts.
          </div>
          <button 
            onClick={() => router.push("/")}
            style={{
              padding: "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              width: "100%",
              minHeight: "44px"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get current question data - SAFELY
  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG[SECTION_ORDER[0]];
  const totalAnswered = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercentage = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;

  // Calculate time
  const timeRemaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const formatTime = (time) => time.toString().padStart(2, '0');

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
          zIndex: 2000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: "#1565c0", 
              fontSize: "28px",
              marginBottom: "20px",
              fontWeight: "700"
            }}>
              📋 Submit Assessment?
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: "25px", 
              background: "#f8f9fa", 
              borderRadius: "15px",
              border: "2px solid #e3f2fd"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px",
                fontWeight: "600"
              }}>
                <span style={{ color: "#555" }}>Questions Answered:</span>
                <span style={{ fontWeight: "700", color: "#4caf50" }}>
                  {totalAnswered}/{questions.length}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "20px",
                fontSize: "16px",
                fontWeight: "600"
              }}>
                <span style={{ color: "#555" }}>Completion Rate:</span>
                <span style={{ fontWeight: "700", color: "#2196f3" }}>
                  {progressPercentage}%
                </span>
              </div>
              
              <div style={{ height: "12px", background: "#e0e0e0", borderRadius: "6px", margin: "20px 0" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${progressPercentage}%`, 
                  background: "linear-gradient(90deg, #4caf50, #2e7d32)", 
                  borderRadius: "6px"
                }} />
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "15px"
            }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: "12px 24px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "16px",
                  minHeight: "44px"
                }}
              >
                Continue Assessment
              </button>
              <button
                onClick={submitAssessment}
                disabled={isSubmitting}
                style={{
                  padding: "12px 24px",
                  background: isSubmitting ? "#81c784" : "linear-gradient(135deg, #4caf50, #2e7d32)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: "16px",
                  minHeight: "44px"
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            padding: "50px",
            borderRadius: "25px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 30px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              width: "100px",
              height: "100px",
              background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 25px",
              fontSize: "50px",
              color: "white"
            }}>
              ✓
            </div>
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: "20px", 
              color: "#1a237e",
              fontSize: "32px",
              fontWeight: "800"
            }}>
              Assessment Complete! 🎉
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: "30px", 
              background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", 
              borderRadius: "15px",
              border: "3px solid #4caf50"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "18px",
                fontWeight: "600"
              }}>
                <span>Questions Answered:</span>
                <span style={{ color: "#2e7d32" }}>
                  {totalAnswered}/{questions.length}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: "600"
              }}>
                <span>Completion Rate:</span>
                <span style={{ color: "#2196f3" }}>
                  {progressPercentage}%
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              style={{
                padding: "18px 45px",
                background: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "700",
                minHeight: "50px",
                width: "100%"
              }}
            >
              Logout Now
            </button>
          </div>
        </div>
      )}

      {/* Main Assessment Layout - SIMPLIFIED */}
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        
        {/* Top Navigation Bar */}
        <div style={{
          background: "white",
          padding: "20px 30px",
          boxShadow: "0 2px 15px rgba(0,0,0,0.08)",
          borderBottom: "1px solid #e9ecef"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center"
          }}>
            <div style={{ 
              fontSize: "24px", 
              fontWeight: "800", 
              color: "#1a237e",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ 
                background: sectionConfig.color,
                color: "white",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px"
              }}>
                {sectionConfig.icon}
              </span>
              <span>Stratavax Assessment</span>
            </div>
            
            {/* Timer */}
            <div style={{
              padding: "10px 15px",
              background: timeRemaining < 1800 ? "#fff3e0" : "#e3f2fd",
              borderRadius: "10px",
              border: `2px solid ${timeRemaining < 1800 ? "#ff9800" : "#2196f3"}`,
              minWidth: "140px"
            }}>
              <div style={{ 
                fontSize: "12px", 
                fontWeight: "600", 
                color: timeRemaining < 1800 ? "#ff9800" : "#2196f3",
                marginBottom: "5px"
              }}>
                {timeRemaining < 1800 ? "TIME LOW" : "TIME REMAINING"}
              </div>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "700", 
                color: timeRemaining < 1800 ? "#d84315" : "#1565c0"
              }}>
                {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              <span style={{ color: "#666" }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span style={{ color: sectionConfig.color }}>
                {progressPercentage}% Complete ({totalAnswered}/{questions.length})
              </span>
            </div>
            <div style={{ 
              height: "8px", 
              background: "#e9ecef", 
              borderRadius: "4px",
              overflow: "hidden"
            }}>
              <div style={{ 
                height: "100%", 
                width: `${progressPercentage}%`, 
                background: sectionConfig.color, 
                borderRadius: "4px"
              }} />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ 
          flex: 1,
          padding: "30px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start"
        }}>
          <div style={{
            maxWidth: "900px",
            width: "100%",
            background: "white",
            borderRadius: "20px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
            border: "1px solid #e9ecef",
            overflow: "hidden"
          }}>
            {/* Question Header */}
            <div style={{
              padding: "30px",
              background: sectionConfig.lightBg,
              borderBottom: `2px solid ${sectionConfig.color}`
            }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "white",
                color: sectionConfig.color,
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "15px"
              }}>
                <span>⚡</span>
                {currentSection}
              </div>
              <div style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#1a237e",
                lineHeight: 1.4
              }}>
                Question {currentIndex + 1}
              </div>
              {currentQuestion?.subsection && (
                <div style={{
                  fontSize: "16px",
                  color: "#666",
                  fontWeight: "500",
                  marginTop: "5px"
                }}>
                  {currentQuestion.subsection}
                </div>
              )}
            </div>

            {/* Question Content */}
            <div style={{ padding: "30px" }}>
              {/* Question Text */}
              <div style={{ 
                fontSize: "20px", 
                lineHeight: 1.6,
                color: "#333",
                marginBottom: "30px",
                fontWeight: "500"
              }}>
                {currentQuestion?.question_text}
              </div>

              {/* Save Status */}
              {saveStatus[currentQuestion?.id] && (
                <div style={{
                  padding: "12px 20px",
                  background: saveStatus[currentQuestion.id] === "saved" ? "#e8f5e9" : 
                             saveStatus[currentQuestion.id] === "saving" ? "#fff3e0" : 
                             "#ffebee",
                  border: `1px solid ${saveStatus[currentQuestion.id] === "saved" ? "#c8e6c9" : 
                           saveStatus[currentQuestion.id] === "saving" ? "#ffcc80" : 
                           "#ffcdd2"}`,
                  borderRadius: "10px",
                  marginBottom: "25px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: saveStatus[currentQuestion.id] === "saved" ? "#2e7d32" : 
                         saveStatus[currentQuestion.id] === "saving" ? "#f57c00" : 
                         "#d32f2f"
                }}>
                  {saveStatus[currentQuestion.id] === "saved" ? (
                    <>
                      <span>✓</span>
                      Answer saved successfully
                    </>
                  ) : saveStatus[currentQuestion.id] === "saving" ? (
                    <>
                      <div style={{ 
                        width: "16px", 
                        height: "16px", 
                        border: "2px solid currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }} />
                      Saving your answer...
                    </>
                  ) : (
                    <>
                      <span>⚠️</span>
                      Failed to save. Please try again.
                    </>
                  )}
                </div>
              )}

              {/* Answer Options */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "15px"
              }}>
                {currentQuestion?.options?.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  const optionLetter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveStatus[currentQuestion.id] === "saving"}
                      style={{
                        padding: "25px",
                        background: isSelected ? sectionConfig.lightBg : "#f8f9fa",
                        border: `2px solid ${isSelected ? sectionConfig.color : "#e9ecef"}`,
                        borderRadius: "15px",
                        cursor: saveStatus[currentQuestion.id] === "saving" ? "not-allowed" : "pointer",
                        textAlign: "left",
                        fontSize: "17px",
                        lineHeight: 1.6,
                        color: isSelected ? sectionConfig.color : "#333",
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        if (!saveStatus[currentQuestion.id] && !isSelected) {
                          e.currentTarget.style.background = "#f1f3f4";
                          e.currentTarget.style.borderColor = "#dadce0";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!saveStatus[currentQuestion.id] && !isSelected) {
                          e.currentTarget.style.background = "#f8f9fa";
                          e.currentTarget.style.borderColor = "#e9ecef";
                        }
                      }}
                    >
                      {/* Option Indicator */}
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: isSelected ? sectionConfig.color : "#e9ecef",
                        color: isSelected ? "white" : "#666",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: "700",
                        flexShrink: 0
                      }}>
                        {optionLetter}
                      </div>
                      
                      {/* Option Text */}
                      <span style={{ 
                        flex: 1,
                        fontWeight: isSelected ? "600" : "500"
                      }}>
                        {option.answer_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Footer */}
            <div style={{ 
              padding: "25px 30px",
              borderTop: "1px solid #e9ecef",
              background: "#f8f9fa",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0} 
                style={{ 
                  padding: "14px 30px", 
                  background: currentIndex === 0 ? "#e9ecef" : sectionConfig.color, 
                  color: currentIndex === 0 ? "#999" : "white", 
                  border: "none",
                  borderRadius: "10px",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  minWidth: "140px"
                }}
              >
                ← Previous
              </button>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  fontSize: "14px", 
                  color: "#666",
                  marginBottom: "5px"
                }}>
                  Question Progress
                </div>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  color: sectionConfig.color
                }}>
                  {currentIndex + 1} of {questions.length}
                </div>
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  style={{ 
                    padding: "14px 30px", 
                    background: "#4caf50", 
                    color: "white", 
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    minWidth: "140px"
                  }}
                >
                  Submit Assessment
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  style={{ 
                    padding: "14px 30px", 
                    background: sectionConfig.color, 
                    color: "white", 
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    minWidth: "140px"
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation Grid */}
        <div style={{
          padding: "20px 30px",
          background: "white",
          borderTop: "1px solid #e9ecef"
        }}>
          <div style={{ 
            fontSize: "16px", 
            fontWeight: "600", 
            marginBottom: "15px",
            color: "#1a237e"
          }}>
            Quick Navigation
          </div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
            gap: "10px"
          }}>
            {questions.map((q, index) => {
              const isAnswered = answers[q.id];
              const isCurrent = index === currentIndex;
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(index)}
                  style={{
                    width: "40px",
                    height: "40px",
                    background: isCurrent ? sectionConfig.color : 
                               isAnswered ? "#4caf50" : "#f5f5f5",
                    color: isCurrent ? "white" : 
                           isAnswered ? "white" : "#666",
                    border: `2px solid ${isCurrent ? sectionConfig.color : 
                             isAnswered ? "#4caf50" : "#e0e0e0"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
