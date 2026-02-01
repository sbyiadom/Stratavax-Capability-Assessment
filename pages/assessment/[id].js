// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #2E4C7E 100%)',
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '🧠',
    bgImage: '/images/backgrounds/cognitive-bg.jpg'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
    lightBg: 'rgba(156, 39, 176, 0.1)',
    icon: '😊',
    bgImage: '/images/backgrounds/personality-bg.jpg'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    gradient: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
    lightBg: 'rgba(211, 47, 47, 0.1)',
    icon: '👑',
    bgImage: '/images/backgrounds/leadership-bg.jpg'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    gradient: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)',
    lightBg: 'rgba(56, 142, 60, 0.1)',
    icon: '⚙️',
    bgImage: '/images/backgrounds/technical-bg.jpg'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    gradient: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
    lightBg: 'rgba(245, 124, 0, 0.1)',
    icon: '📊',
    bgImage: '/images/backgrounds/performance-bg.jpg'
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

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      if (isMobile) setShowSidebar(false);
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

  // Calculate section progress
  const getSectionProgress = (section) => {
    if (!questions || questions.length === 0) {
      return { answered: 0, total: 0, percentage: 0 };
    }
    
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

  // Format time display
  const formatTime = (time) => time.toString().padStart(2, '0');

  // Get current question data safely
  const currentQuestion = questions[currentIndex] || null;
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG[SECTION_ORDER[0]];
  const saveState = currentQuestion ? saveStatus[currentQuestion.id] : null;
  const totalAnswered = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercentage = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;

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
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "600", marginBottom: "20px" }}>
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
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: isMobile ? "18px" : "22px", marginBottom: "20px" }}>
            Error Loading Assessment
          </div>
          <div style={{ 
            fontSize: isMobile ? "14px" : "16px", 
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
              padding: isMobile ? "14px 25px" : "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "600",
              width: isMobile ? "100%" : "auto",
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
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: isMobile ? "18px" : "22px", marginBottom: "20px" }}>
            No Questions Available
          </div>
          <div style={{ fontSize: isMobile ? "14px" : "16px", marginBottom: "30px", lineHeight: 1.5 }}>
            No assessment questions found. Please run the setup scripts.
          </div>
          <button 
            onClick={() => router.push("/")}
            style={{
              padding: isMobile ? "14px 25px" : "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "600",
              width: isMobile ? "100%" : "auto",
              minHeight: "44px"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
          padding: "20px",
          backdropFilter: "blur(5px)"
        }}>
          <div style={{
            background: "white",
            padding: isMobile ? "25px" : "40px",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: "#1565c0", 
              fontSize: isMobile ? "22px" : "28px",
              marginBottom: "20px",
              fontWeight: "700"
            }}>
              📋 Submit Assessment?
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: isMobile ? "20px" : "25px", 
              background: "#f8f9fa", 
              borderRadius: "15px",
              border: "2px solid #e3f2fd"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: isMobile ? "15px" : "16px",
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
                fontSize: isMobile ? "15px" : "16px",
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

            <p style={{ 
              marginBottom: "30px", 
              fontSize: isMobile ? "15px" : "16px", 
              lineHeight: "1.6",
              color: "#666"
            }}>
              {questions.length - totalAnswered > 0 
                ? `You have ${questions.length - totalAnswered} unanswered questions. Are you sure you want to submit?`
                : "All questions have been answered. Ready to submit your assessment?"}
            </p>

            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: isMobile ? "10px" : "15px",
              flexDirection: isMobile ? "column" : "row"
            }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: isMobile ? "14px 25px" : "12px 24px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: isMobile ? "15px" : "16px",
                  minHeight: "44px",
                  flex: isMobile ? "1" : "none",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#e0e0e0"}
                onMouseOut={(e) => e.currentTarget.style.background = "#f5f5f5"}
              >
                Continue Assessment
              </button>
              <button
                onClick={submitAssessment}
                disabled={isSubmitting}
                style={{
                  padding: isMobile ? "14px 25px" : "12px 24px",
                  background: isSubmitting ? "#81c784" : "linear-gradient(135deg, #4caf50, #2e7d32)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: isMobile ? "15px" : "16px",
                  minHeight: "44px",
                  flex: isMobile ? "1" : "none",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 15px rgba(76, 175, 80, 0.3)"
                }}
                onMouseOver={(e) => !isSubmitting && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={(e) => !isSubmitting && (e.currentTarget.style.transform = "translateY(0)")}
              >
                {isSubmitting ? (
                  <>
                    <span style={{ verticalAlign: "middle", marginRight: "8px" }}>⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span style={{ verticalAlign: "middle", marginRight: "8px" }}>✅</span>
                    Submit Assessment
                  </>
                )}
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
          padding: "20px",
          backdropFilter: "blur(5px)"
        }}>
          <div style={{
            background: "white",
            padding: isMobile ? "30px" : "50px",
            borderRadius: "25px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 30px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              width: isMobile ? "80px" : "100px",
              height: isMobile ? "80px" : "100px",
              background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 25px",
              fontSize: isMobile ? "40px" : "50px",
              color: "white",
              animation: "pulse 2s infinite",
              boxShadow: "0 10px 30px rgba(76, 175, 80, 0.4)"
            }}>
              ✓
            </div>
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: "20px", 
              color: "#1a237e",
              fontSize: isMobile ? "26px" : "32px",
              fontWeight: "800"
            }}>
              Assessment Complete! 🎉
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: isMobile ? "20px" : "30px", 
              background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", 
              borderRadius: "15px",
              border: "3px solid #4caf50"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: isMobile ? "16px" : "18px",
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
                fontSize: isMobile ? "16px" : "18px",
                fontWeight: "600"
              }}>
                <span>Completion Rate:</span>
                <span style={{ color: "#2196f3" }}>
                  {progressPercentage}%
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
                  width: `${progressPercentage}%`, 
                  background: "linear-gradient(90deg, #4caf50 0%, #81c784 100%)", 
                  borderRadius: "6px"
                }} />
              </div>
            </div>

            <p style={{ 
              fontSize: isMobile ? "16px" : "18px", 
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
                padding: isMobile ? "16px 35px" : "18px 45px",
                background: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: isMobile ? "16px" : "18px",
                fontWeight: "700",
                boxShadow: "0 6px 25px rgba(33, 150, 243, 0.4)",
                minHeight: "50px",
                width: isMobile ? "100%" : "auto",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              Logout Now
            </button>
          </div>
          <style jsx>{`
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 10px 30px rgba(76, 175, 80, 0.4); }
              50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(76, 175, 80, 0.6); }
              100% { transform: scale(1); box-shadow: 0 10px 30px rgba(76, 175, 80, 0.4); }
            }
          `}</style>
        </div>
      )}

      {/* Main Assessment Layout */}
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
          padding: isMobile ? "15px" : "20px 30px",
          boxShadow: "0 2px 15px rgba(0,0,0,0.08)",
          borderBottom: "1px solid #e9ecef",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "15px"
            }}>
              <div style={{ 
                fontSize: isMobile ? "20px" : "24px", 
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
                <span>Stratavax</span>
              </div>
              <div style={{
                fontSize: isMobile ? "12px" : "14px",
                color: "#666",
                padding: "6px 12px",
                background: "#f8f9fa",
                borderRadius: "20px",
                fontWeight: "500"
              }}>
                Assessment ID: {assessmentId.slice(0, 8)}...
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: isMobile ? "10px" : "20px"
            }}>
              {/* Timer */}
              <div style={{
                padding: "10px 15px",
                background: timeRemaining < 1800 ? "#fff3e0" : "#e3f2fd",
                borderRadius: "10px",
                border: `2px solid ${timeRemaining < 1800 ? "#ff9800" : "#2196f3"}`,
                minWidth: isMobile ? "auto" : "140px"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  marginBottom: "5px"
                }}>
                  <span style={{ fontSize: "16px" }}>⏱️</span>
                  <span style={{ 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    color: timeRemaining < 1800 ? "#ff9800" : "#2196f3"
                  }}>
                    {timeRemaining < 1800 ? "TIME LOW" : "TIME REMAINING"}
                  </span>
                </div>
                <div style={{ 
                  fontSize: isMobile ? "16px" : "18px", 
                  fontWeight: "700", 
                  color: timeRemaining < 1800 ? "#d84315" : "#1565c0"
                }}>
                  {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
                </div>
              </div>

              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  style={{
                    background: sectionConfig.color,
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "20px"
                  }}
                >
                  ☰
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: isMobile ? "15px" : "20px" }}>
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
                {progressPercentage}% Complete
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
                width: `${((currentIndex + 1) / questions.length) * 100}%`, 
                background: sectionConfig.gradient, 
                borderRadius: "4px",
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ 
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative"
        }}>
          {/* Sidebar - Question Navigator */}
          {(!isMobile || showSidebar) && (
            <div style={{
              width: isMobile ? "100%" : "320px",
              background: "white",
              borderRight: "1px solid #e9ecef",
              padding: isMobile ? "20px" : "25px",
              overflowY: "auto",
              position: isMobile ? "fixed" : "relative",
              top: isMobile ? 0 : "auto",
              left: isMobile ? 0 : "auto",
              bottom: isMobile ? 0 : "auto",
              zIndex: 200,
              height: isMobile ? "100vh" : "auto",
              boxShadow: isMobile ? "0 0 30px rgba(0,0,0,0.1)" : "none"
            }}>
              {isMobile && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "20px"
                }}>
                  <h3 style={{ margin: 0, color: "#1a237e" }}>Question Navigator</h3>
                  <button 
                    onClick={() => setShowSidebar(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: "#666"
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Stats */}
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "20px",
                borderRadius: "15px",
                marginBottom: "25px"
              }}>
                <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "10px" }}>
                  Assessment Progress
                </div>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px"
                }}>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: "700" }}>
                      {progressPercentage}%
                    </div>
                    <div style={{ fontSize: "12px", opacity: 0.8 }}>
                      Complete
                    </div>
                  </div>
                  <div style={{ fontSize: "32px" }}>📊</div>
                </div>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  fontSize: "12px"
                }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600" }}>{totalAnswered}</div>
                    <div>Answered</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600" }}>{questions.length - totalAnswered}</div>
                    <div>Remaining</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600" }}>{questions.length}</div>
                    <div>Total</div>
                  </div>
                </div>
              </div>

              {/* Section Progress */}
              <div style={{ marginBottom: "25px" }}>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  marginBottom: "15px",
                  color: "#1a237e"
                }}>
                  <span style={{ verticalAlign: "middle", marginRight: "8px" }}>📈</span>
                  Section Progress
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {SECTION_ORDER.map(section => {
                    const progress = getSectionProgress(section);
                    const config = SECTION_CONFIG[section];
                    
                    return (
                      <div key={section} style={{ 
                        padding: "12px",
                        background: config.lightBg,
                        borderRadius: "10px",
                        border: "1px solid rgba(0,0,0,0.05)"
                      }}>
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          marginBottom: "8px"
                        }}>
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: config.color
                          }}>
                            <span>{config.icon}</span>
                            <span>{section}</span>
                          </div>
                          <span style={{ 
                            fontSize: "12px", 
                            fontWeight: "700", 
                            color: config.color
                          }}>
                            {progress.answered}/{progress.total}
                          </span>
                        </div>
                        <div style={{ 
                          height: "6px", 
                          background: "rgba(0,0,0,0.05)", 
                          borderRadius: "3px",
                          overflow: "hidden"
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
              </div>

              {/* Question Grid */}
              <div>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  marginBottom: "15px",
                  color: "#1a237e"
                }}>
                  <span style={{ verticalAlign: "middle", marginRight: "8px" }}>📋</span>
                  All Questions
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
                  gap: "8px"
                }}>
                  {questions.map((q, index) => {
                    const isAnswered = answers[q.id];
                    const isCurrent = index === currentIndex;
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleJump(index)}
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
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          if (!isCurrent) {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isCurrent) {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }
                        }}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitModal(true)}
                style={{
                  width: "100%",
                  padding: "15px",
                  background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "700",
                  marginTop: "25px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <span style={{ fontSize: "18px" }}>✓</span>
                Submit Assessment
              </button>
            </div>
          )}

          {/* Question Area */}
          <div style={{ 
            flex: 1,
            padding: isMobile ? "20px" : "30px",
            overflowY: "auto",
            background: "white"
          }}>
            {/* Question Header */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "flex-start",
              marginBottom: "30px",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? "15px" : "0"
            }}>
              <div>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: sectionConfig.lightBg,
                  color: sectionConfig.color,
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "15px"
                }}>
                  <span style={{ fontSize: "16px" }}>⚡</span>
                  {currentSection}
                </div>
                <div style={{
                  fontSize: isMobile ? "18px" : "24px",
                  fontWeight: "700",
                  color: "#1a237e",
                  lineHeight: 1.4,
                  marginBottom: "10px"
                }}>
                  Question {currentIndex + 1}
                </div>
                {currentQuestion?.subsection && (
                  <div style={{
                    fontSize: "16px",
                    color: "#666",
                    fontWeight: "500"
                  }}>
                    {currentQuestion.subsection}
                  </div>
                )}
              </div>

              {/* Mobile Question Navigator Button */}
              {isMobile && !showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  style={{
                    alignSelf: "flex-start",
                    padding: "10px 20px",
                    background: sectionConfig.color,
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📋</span>
                  View All Questions
                </button>
              )}
            </div>

            {/* Question Card */}
            <div style={{
              background: "white",
              borderRadius: "20px",
              border: "1px solid #e9ecef",
              padding: isMobile ? "25px" : "35px",
              marginBottom: "30px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.06)"
            }}>
              <div style={{ 
                fontSize: isMobile ? "18px" : "20px", 
                lineHeight: 1.6,
                color: "#333",
                marginBottom: "30px",
                fontWeight: "500"
              }}>
                {currentQuestion?.question_text}
              </div>

              {/* Save Status */}
              {saveState && (
                <div style={{
                  padding: "12px 20px",
                  background: saveState === "saved" ? "#e8f5e9" : 
                             saveState === "saving" ? "#fff3e0" : 
                             "#ffebee",
                  border: `1px solid ${saveState === "saved" ? "#c8e6c9" : 
                           saveState === "saving" ? "#ffcc80" : 
                           "#ffcdd2"}`,
                  borderRadius: "10px",
                  marginBottom: "25px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: saveState === "saved" ? "#2e7d32" : 
                         saveState === "saving" ? "#f57c00" : 
                         "#d32f2f"
                }}>
                  {saveState === "saved" ? (
                    <>
                      <span style={{ fontSize: "18px" }}>✓</span>
                      Answer saved successfully
                    </>
                  ) : saveState === "saving" ? (
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
                      <span style={{ fontSize: "18px" }}>⚠️</span>
                      Failed to save. Please try again.
                    </>
                  )}
                </div>
              )}

              {/* Answer Options */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: "15px"
              }}>
                {currentQuestion?.options?.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  const optionLetter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveState === "saving"}
                      style={{
                        padding: isMobile ? "20px" : "25px",
                        background: isSelected ? sectionConfig.lightBg : "#f8f9fa",
                        border: `2px solid ${isSelected ? sectionConfig.color : "#e9ecef"}`,
                        borderRadius: "15px",
                        cursor: saveState === "saving" ? "not-allowed" : "pointer",
                        textAlign: "left",
                        fontSize: isMobile ? "16px" : "17px",
                        lineHeight: 1.6,
                        color: isSelected ? sectionConfig.color : "#333",
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        transition: "all 0.2s ease",
                        opacity: saveState === "saving" && !isSelected ? 0.7 : 1,
                        position: "relative",
                        overflow: "hidden"
                      }}
                      onMouseOver={(e) => {
                        if (!saveState && !isSelected) {
                          e.currentTarget.style.background = "#f1f3f4";
                          e.currentTarget.style.borderColor = "#dadce0";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!saveState && !isSelected) {
                          e.currentTarget.style.background = "#f8f9fa";
                          e.currentTarget.style.borderColor = "#e9ecef";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {/* Option Indicator */}
                      <div style={{
                        width: isMobile ? "36px" : "42px",
                        height: isMobile ? "36px" : "42px",
                        borderRadius: "10px",
                        background: isSelected ? sectionConfig.color : "#e9ecef",
                        color: isSelected ? "white" : "#666",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? "16px" : "18px",
                        fontWeight: "700",
                        flexShrink: 0,
                        transition: "all 0.2s"
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
                      
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: sectionConfig.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <div style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            background: "white"
                          }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "25px 0",
              borderTop: "1px solid #e9ecef"
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0} 
                style={{ 
                  padding: isMobile ? "14px 25px" : "16px 30px", 
                  background: currentIndex === 0 ? "#f8f9fa" : sectionConfig.color, 
                  color: currentIndex === 0 ? "#999" : "white", 
                  border: "none",
                  borderRadius: "10px",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: isMobile ? "15px" : "16px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                  minWidth: "140px",
                  justifyContent: "center"
                }}
                onMouseOver={(e) => currentIndex !== 0 && (e.currentTarget.style.transform = "translateX(-2px)")}
                onMouseOut={(e) => currentIndex !== 0 && (e.currentTarget.style.transform = "translateX(0)")}
              >
                <span style={{ fontSize: "20px" }}>←</span>
                Previous
              </button>
              
              <div style={{ 
                fontSize: "16px", 
                fontWeight: "600", 
                color: "#666",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "14px", marginBottom: "5px", color: "#999" }}>
                  Question Progress
                </div>
                <div style={{ color: sectionConfig.color }}>
                  {currentIndex + 1} / {questions.length}
                </div>
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  style={{ 
                    padding: isMobile ? "14px 25px" : "16px 30px", 
                    background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)", 
                    color: "white", 
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: isMobile ? "15px" : "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                    minWidth: "140px",
                    justifyContent: "center"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "translateX(2px)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "translateX(0)"}
                >
                  Submit Assessment
                  <span style={{ fontSize: "20px" }}>→</span>
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  style={{ 
                    padding: isMobile ? "14px 25px" : "16px 30px", 
                    background: sectionConfig.color, 
                    color: "white", 
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: isMobile ? "15px" : "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                    minWidth: "140px",
                    justifyContent: "center"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "translateX(2px)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "translateX(0)"}
                >
                  Next
                  <span style={{ fontSize: "20px" }}>→</span>
                </button>
              )}
            </div>

            {/* Instructions */}
            <div style={{
              background: "#f8f9fa",
              padding: "20px",
              borderRadius: "15px",
              border: "1px solid #e9ecef",
              marginTop: "20px"
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                color: "#666",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>💡</span>
                Assessment Instructions
              </div>
              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                lineHeight: 1.6,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: "15px"
              }}>
                <div>
                  <strong>Answer Selection:</strong> Click on your chosen answer. Answers auto-save.
                </div>
                <div>
                  <strong>Navigation:</strong> Use Previous/Next buttons or jump to any question.
                </div>
                <div>
                  <strong>Progress:</strong> {questions.length} questions, {TIME_LIMIT_SECONDS/3600} hours maximum.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? "15px" : "20px 30px",
          background: "white",
          borderTop: "1px solid #e9ecef",
          fontSize: "13px",
          color: "#666",
          textAlign: "center",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div>
            © 2024 Stratavax Assessment Platform. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "12px" }}>
            <span>Questions: {questions.length}</span>
            <span>Answered: {totalAnswered}</span>
            <span>Time: {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}</span>
          </div>
        </div>
      </div>

      {/* Add styles for spinner */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
