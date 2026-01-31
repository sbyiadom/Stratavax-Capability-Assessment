import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #2E4C7E 100%)',
    icon: '🧠',
    bgColor: 'rgba(232, 239, 247, 0.9)'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
    icon: '😊',
    bgColor: 'rgba(243, 229, 245, 0.9)'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    gradient: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
    icon: '👑',
    bgColor: 'rgba(255, 235, 238, 0.9)'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    gradient: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)',
    icon: '⚙️',
    bgColor: 'rgba(232, 245, 233, 0.9)'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    gradient: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
    icon: '📊',
    bgColor: 'rgba(255, 243, 224, 0.9)'
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

        const processedQuestions = questionsData.map(q => ({
          ...q,
          id: parseInt(q.id),
          options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
        }));

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);

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

  // Countdown timer for success modal
  useEffect(() => {
    if (showSuccessModal) {
      let countdown = 5;
      const timer = setInterval(() => {
        countdown--;
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
          countdownElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
          clearInterval(timer);
          supabase.auth.signOut().then(() => {
            router.push("/login");
          });
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [showSuccessModal, router]);

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
    setShowSubmitModal(false);
    
    try {
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
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
                Continue
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
          zIndex: 3000
        }}>
          <div style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 25px",
              fontSize: "40px",
              color: "white",
              animation: "pulse 2s infinite"
            }}>
              ✓
            </div>
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: "20px", 
              color: "#1a237e",
              fontSize: "28px",
              fontWeight: "800"
            }}>
              Assessment Complete! 🎉
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: "25px", 
              background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", 
              borderRadius: "15px",
              border: "3px solid #4caf50"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px",
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
                marginBottom: "15px",
                fontSize: "16px",
                fontWeight: "600"
              }}>
                <span>Completion Rate:</span>
                <span style={{ color: "#2196f3" }}>
                  {Math.round((totalAnswered / questions.length) * 100)}%
                </span>
              </div>
              
              <div style={{ 
                height: "12px", 
                background: "#e0e0e0", 
                borderRadius: "6px", 
                margin: "20px 0",
                overflow: "hidden"
              }}>
                <div style={{ 
                  height: "100%", 
                  width: `${(totalAnswered / questions.length) * 100}%`, 
                  background: "linear-gradient(90deg, #4caf50 0%, #81c784 100%)", 
                  borderRadius: "6px"
                }} />
              </div>
            </div>

            <p style={{ 
              fontSize: "16px", 
              lineHeight: "1.6", 
              color: "#555",
              marginBottom: "30px"
            }}>
              Your responses have been saved successfully. 
              You will be redirected to login in <span style={{ fontWeight: "700", color: "#1a237e" }} id="countdown">5</span> seconds.
            </p>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              style={{
                padding: "15px 40px",
                background: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
                boxShadow: "0 4px 20px rgba(33, 150, 243, 0.4)"
              }}
            >
              Logout Now
            </button>
          </div>
          <style jsx>{`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* Main Assessment Interface - COMPACT */}
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}>
        {/* Header - Fixed Height */}
        <div style={{
          background: "white",
          padding: "12px 20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "700", 
                color: "#1a237e",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>🏢</span>
                <span>Stratavax Assessment</span>
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Q{currentIndex + 1}/{questions.length} • Time: {hours}h {minutes}m {seconds}s
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                padding: "6px 12px",
                background: "#e3f2fd",
                borderRadius: "15px",
                fontWeight: "600",
                color: "#1565c0",
                fontSize: "13px",
                border: "1px solid #90caf9"
              }}>
                {totalAnswered}/{questions.length}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - No Scroll */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          gap: "15px", 
          padding: "15px",
          overflow: "hidden"
        }}>
          
          {/* Left Panel - Question & Answers (70%) */}
          <div style={{ 
            flex: 7,
            display: "flex",
            flexDirection: "column",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            
            {/* Section Header */}
            <div style={{
              background: sectionConfig.gradient,
              color: "white",
              padding: "12px 15px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                {sectionConfig.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "16px" }}>
                  {currentSection}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.9 }}>
                  {currentQuestion?.subsection || "Question"}
                </div>
              </div>
              
              {saveState && (
                <div style={{
                  padding: "4px 8px",
                  borderRadius: "10px",
                  background: saveState === "saved" ? "#4caf50" : 
                             saveState === "saving" ? "#ff9800" : "#f44336",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "600"
                }}>
                  {saveState === "saved" ? "✅" : 
                   saveState === "saving" ? "⏳" : "❌"}
                </div>
              )}
            </div>

            {/* Question - Compact */}
            <div style={{
              padding: "15px",
              background: sectionConfig.bgColor,
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              flexShrink: 0,
              maxHeight: "100px",
              overflow: "auto"
            }}>
              <div style={{
                fontSize: "16px",
                lineHeight: "1.5",
                fontWeight: "500",
                color: "#333"
              }}>
                {currentQuestion?.question_text}
              </div>
            </div>

            {/* Answers - Compact */}
            <div style={{ 
              flex: 1,
              padding: "15px",
              overflow: "auto",
              minHeight: 0
            }}>
              {currentQuestion && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveState === "saving"}
                      style={{
                        padding: "10px 12px",
                        background: answers[currentQuestion.id] === option.id ? 
                          "#e3f2fd" : "white",
                        border: `2px solid ${answers[currentQuestion.id] === option.id ? "#1565c0" : "#e0e0e0"}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "14px",
                        lineHeight: 1.4,
                        color: "#333",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: `2px solid ${answers[currentQuestion.id] === option.id ? "#1565c0" : "#ccc"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                        background: answers[currentQuestion.id] === option.id ? "#1565c0" : "transparent"
                      }}>
                        {answers[currentQuestion.id] === option.id && (
                          <div style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "white"
                          }} />
                        )}
                      </div>
                      <span style={{ flex: 1 }}>{option.answer_text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation - Compact & Close */}
            <div style={{ 
              padding: "12px 15px",
              borderTop: "1px solid #e0e0e0",
              background: "#f8f9fa",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexShrink: 0
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0} 
                style={{ 
                  padding: "8px 16px", 
                  background: currentIndex === 0 ? "#f5f5f5" : "#1565c0", 
                  color: currentIndex === 0 ? "#999" : "white", 
                  border: "none", 
                  borderRadius: "6px",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  flex: 1
                }}
              >
                ← Previous
              </button>
              
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                fontSize: "13px",
                color: "#666",
                minWidth: "100px"
              }}>
                {currentIndex + 1}/{questions.length}
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  style={{ 
                    padding: "8px 16px", 
                    background: "#4caf50", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    flex: 1
                  }}
                >
                  Submit
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  style={{ 
                    padding: "8px 16px", 
                    background: "#1565c0", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    flex: 1
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Progress & Navigation (30%) */}
          <div style={{ 
            flex: 3,
            display: "flex", 
            flexDirection: "column", 
            gap: "15px",
            minWidth: "250px"
          }}>
            
            {/* Question Navigation - Compact */}
            <div style={{ 
              background: "white",
              borderRadius: "12px",
              padding: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              flex: 1
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a237e" }}>
                  Question Navigator
                </div>
                <div style={{ fontSize: "11px", color: "#666" }}>
                  {totalAnswered}/{questions.length}
                </div>
              </div>
              
              <div style={{ maxHeight: "150px", overflow: "auto" }}>
                <QuestionNav
                  questions={questions}
                  answers={answers}
                  current={currentIndex}
                  onJump={handleJump}
                  compact={true}
                />
              </div>
            </div>

            {/* Progress Summary - Compact */}
            <div style={{ 
              background: "white",
              borderRadius: "12px",
              padding: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              flex: 1
            }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a237e", marginBottom: "12px" }}>
                Progress
              </div>
              
              {/* Overall Progress */}
              <div style={{ marginBottom: "15px" }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  marginBottom: "8px", 
                  fontSize: "13px"
                }}>
                  <span>Overall</span>
                  <span style={{ fontWeight: "600", color: "#4caf50" }}>
                    {Math.round((totalAnswered / questions.length) * 100)}%
                  </span>
                </div>
                <div style={{ 
                  height: "8px", 
                  background: "#e0e0e0", 
                  borderRadius: "4px",
                  overflow: "hidden"
                }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${(totalAnswered / questions.length) * 100}%`, 
                    background: "#4caf50", 
                    borderRadius: "4px"
                  }} />
                </div>
              </div>

              {/* Time Info - Compact */}
              <div style={{
                padding: "12px",
                background: timeRemaining < 1800 ? "#ffebee" : "#e8f5e9",
                borderRadius: "8px",
                border: `1px solid ${timeRemaining < 1800 ? "#ff5252" : "#4caf50"}`
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  marginBottom: "6px"
                }}>
                  <span style={{ fontSize: "14px" }}>
                    {timeRemaining < 1800 ? "⏰" : "⏱️"}
                  </span>
                  <span style={{ 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    color: timeRemaining < 1800 ? "#c62828" : "#2e7d32"
                  }}>
                    {timeRemaining < 1800 ? "Hurry!" : "Time Left"}
                  </span>
                </div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#1a237e" }}>
                  {hours}h {minutes}m {seconds}s
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div style={{
          padding: "8px 15px",
          fontSize: "11px",
          color: "#666",
          background: "white",
          borderTop: "1px solid #e0e0e0",
          textAlign: "center",
          flexShrink: 0
        }}>
          <div>
            © 2024 Stratavax • Auto-save enabled • Complete all {questions.length} questions
          </div>
        </div>
      </div>
    </>
  );
}
