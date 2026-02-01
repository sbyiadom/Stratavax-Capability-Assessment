// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    icon: '🧠',
    bgImage: '/images/backgrounds/cognitive-bg.jpg'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    icon: '😊',
    bgImage: '/images/backgrounds/personality-bg.jpg'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    icon: '👑',
    bgImage: '/images/backgrounds/leadership-bg.jpg'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    icon: '⚙️',
    bgImage: '/images/backgrounds/technical-bg.jpg'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
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

  // Check if mobile and screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Prevent zoom on mobile
      document.querySelector('meta[name="viewport"]')?.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), 
                    url('/images/backgrounds/default-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: "center",
          maxWidth: "500px",
          width: "100%",
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ 
            fontSize: isMobile ? "28px" : "36px", 
            fontWeight: "700", 
            marginBottom: "20px",
            color: 'white'
          }}>
            🏢 Stratavax
          </div>
          <div style={{ 
            fontSize: isMobile ? "18px" : "22px", 
            fontWeight: "600", 
            marginBottom: "20px",
            color: 'white'
          }}>
            Loading Assessment...
          </div>
          <div style={{ 
            width: "100%", 
            height: "6px", 
            backgroundColor: "rgba(255,255,255,0.2)", 
            borderRadius: "3px", 
            overflow: "hidden" 
          }}>
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

  if (questions.length === 0) {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), 
                    url('/images/backgrounds/default-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          textAlign: "center",
          maxWidth: "500px",
          width: "100%",
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ 
            fontSize: isMobile ? "28px" : "36px", 
            fontWeight: "700", 
            marginBottom: "20px",
            color: 'white'
          }}>
            🏢 Stratavax
          </div>
          <div style={{ 
            fontSize: isMobile ? "18px" : "22px", 
            marginBottom: "20px",
            color: 'white'
          }}>
            Assessment Not Ready
          </div>
          <div style={{ 
            fontSize: isMobile ? "14px" : "16px", 
            marginBottom: "30px", 
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            Please run the SQL setup scripts to create the assessment questions.
          </div>
          <button 
            onClick={() => router.push("/")}
            style={{
              padding: isMobile ? "14px 25px" : "15px 35px",
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(5px)',
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
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
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: "20px",
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? "20px" : "30px",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "100%",
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: "#1565c0", 
              fontSize: isMobile ? "20px" : "24px",
              marginBottom: "15px"
            }}>
              Submit Assessment?
            </h2>
            
            <div style={{ 
              margin: "20px 0", 
              padding: isMobile ? "15px" : "20px", 
              background: "rgba(33, 150, 243, 0.1)", 
              borderRadius: "12px",
              border: '1px solid rgba(33, 150, 243, 0.2)'
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: isMobile ? "14px" : "16px"
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
                fontSize: isMobile ? "14px" : "16px"
              }}>
                <span>Completion Rate:</span>
                <span style={{ fontWeight: "700", color: "#2196f3" }}>
                  {Math.round((totalAnswered / questions.length) * 100)}%
                </span>
              </div>
              
              <div style={{ height: "10px", background: "rgba(0,0,0,0.1)", borderRadius: "5px", margin: "15px 0" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${(totalAnswered / questions.length) * 100}%`, 
                  background: "linear-gradient(90deg, #4caf50, #2e7d32)", 
                  borderRadius: "5px"
                }} />
              </div>
            </div>

            <p style={{ 
              marginBottom: "25px", 
              fontSize: isMobile ? "14px" : "16px", 
              lineHeight: "1.6",
              color: "#555"
            }}>
              {questions.length - totalAnswered > 0 
                ? `You have ${questions.length - totalAnswered} unanswered questions. Are you ready to submit?`
                : "All questions have been answered. Ready to submit?"}
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
                  padding: isMobile ? "12px 20px" : "10px 20px",
                  background: "rgba(0,0,0,0.1)",
                  color: "#333",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: isMobile ? "14px" : "15px",
                  minHeight: "44px",
                  flex: isMobile ? "1" : "none"
                }}
              >
                Continue
              </button>
              <button
                onClick={submitAssessment}
                disabled={isSubmitting}
                style={{
                  padding: isMobile ? "12px 25px" : "10px 25px",
                  background: isSubmitting ? "#81c784" : "linear-gradient(135deg, #4caf50, #2e7d32)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: isMobile ? "14px" : "15px",
                  minHeight: "44px",
                  flex: isMobile ? "1" : "none"
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
          backgroundColor: "rgba(0,0,0,0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3000,
          padding: "20px",
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? "25px" : "40px",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: isMobile ? "60px" : "80px",
              height: isMobile ? "60px" : "80px",
              background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: isMobile ? "30px" : "40px",
              color: "white",
              animation: "pulse 2s infinite"
            }}>
              ✓
            </div>
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: "15px", 
              color: "#1a237e",
              fontSize: isMobile ? "22px" : "28px",
              fontWeight: "800"
            }}>
              Assessment Complete! 🎉
            </h2>
            
            <div style={{ 
              margin: "20px 0", 
              padding: isMobile ? "15px" : "25px", 
              background: "rgba(76, 175, 80, 0.1)", 
              borderRadius: "15px",
              border: "2px solid rgba(76, 175, 80, 0.3)"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "10px",
                fontSize: isMobile ? "13px" : "16px",
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
                fontSize: isMobile ? "13px" : "16px",
                fontWeight: "600"
              }}>
                <span>Completion Rate:</span>
                <span style={{ color: "#2196f3" }}>
                  {Math.round((totalAnswered / questions.length) * 100)}%
                </span>
              </div>
              
              <div style={{ 
                height: "12px", 
                background: "rgba(0,0,0,0.1)", 
                borderRadius: "6px", 
                margin: "15px 0",
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
              fontSize: isMobile ? "14px" : "16px", 
              lineHeight: "1.6", 
              color: "#555",
              marginBottom: "25px"
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
                padding: isMobile ? "14px 30px" : "15px 40px",
                background: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: isMobile ? "15px" : "16px",
                fontWeight: "700",
                boxShadow: "0 4px 20px rgba(33, 150, 243, 0.4)",
                minHeight: "44px",
                width: isMobile ? "100%" : "auto"
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

      {/* Main Assessment Interface - NO SCROLL LAYOUT */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), 
                    url('${sectionConfig.bgImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: isMobile ? "0" : "15px"
      }}>
        
        {/* Header - Minimal Glass Effect */}
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          padding: isMobile ? "12px 15px" : "15px 20px",
          borderRadius: isMobile ? "0 0 20px 20px" : "15px",
          borderBottom: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
          marginBottom: isMobile ? "10px" : "15px",
          flexShrink: 0
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "8px" : "0"
          }}>
            <div style={{ 
              textAlign: isMobile ? "center" : "left",
              width: isMobile ? "100%" : "auto"
            }}>
              <div style={{ 
                fontSize: isMobile ? "16px" : "18px", 
                fontWeight: "700", 
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: isMobile ? "center" : "flex-start",
                textShadow: "1px 1px 3px rgba(0,0,0,0.5)"
              }}>
                <span>🏢</span>
                <span>Stratavax Assessment</span>
              </div>
              <div style={{ 
                fontSize: isMobile ? "11px" : "12px", 
                color: "rgba(255, 255, 255, 0.9)", 
                marginTop: "4px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: isMobile ? "center" : "flex-start"
              }}>
                <span>Q{currentIndex + 1}/{questions.length}</span>
                <span>•</span>
                <span>Time: {hours}h {minutes}m {seconds}s</span>
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px",
              flexDirection: isMobile ? "row" : "row",
              justifyContent: isMobile ? "space-between" : "flex-end",
              width: isMobile ? "100%" : "auto"
            }}>
              <div style={{
                padding: isMobile ? "8px 15px" : "8px 16px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(5px)",
                borderRadius: "20px",
                fontWeight: "600",
                color: "white",
                fontSize: isMobile ? "13px" : "14px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                whiteSpace: "nowrap",
                textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
              }}>
                {totalAnswered}/{questions.length} Answered
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Fits within viewport */}
        <div style={{ 
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "10px" : "15px",
          overflow: "hidden",
          padding: isMobile ? "0 10px 70px 10px" : "0"
        }}>
          
          {/* TRANSPARENT QUESTION CARD - GLASS EFFECT */}
          <div style={{ 
            flex: isMobile ? "1" : "7",
            display: "flex",
            flexDirection: "column",
            background: "rgba(255, 255, 255, 0.08)", // Very low opacity for transparency
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            minHeight: "0" // Allows flexbox to handle overflow
          }}>
            
            {/* Section Header - Semi-transparent */}
            <div style={{
              background: `linear-gradient(90deg, 
                ${sectionConfig.color}33 0%, 
                ${sectionConfig.color}66 100%)`,
              color: "white",
              padding: isMobile ? "15px" : "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <div style={{
                width: isMobile ? "36px" : "44px",
                height: isMobile ? "36px" : "44px",
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "18px" : "22px",
                backdropFilter: "blur(5px)"
              }}>
                {sectionConfig.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: "700", 
                  fontSize: isMobile ? "16px" : "18px",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
                }}>
                  {currentSection}
                </div>
                <div style={{ 
                  fontSize: isMobile ? "11px" : "13px", 
                  opacity: 0.9,
                  marginTop: "2px",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {currentQuestion?.subsection || "Question"}
                </div>
              </div>
              
              {saveState && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: saveState === "saved" ? "rgba(76, 175, 80, 0.8)" : 
                             saveState === "saving" ? "rgba(255, 152, 0, 0.8)" : 
                             "rgba(244, 67, 54, 0.8)",
                  color: "white",
                  fontSize: isMobile ? "11px" : "12px",
                  fontWeight: "600",
                  backdropFilter: "blur(5px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {saveState === "saved" ? "✅ Saved" : 
                   saveState === "saving" ? "⏳ Saving..." : "❌ Error"}
                </div>
              )}
            </div>

            {/* Question Text - Very transparent */}
            <div style={{
              padding: isMobile ? "20px" : "25px",
              background: "rgba(255, 255, 255, 0.05)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              minHeight: isMobile ? "auto" : "120px",
              display: "flex",
              alignItems: "center",
              flexShrink: 0
            }}>
              <div style={{
                fontSize: isMobile ? "16px" : "18px",
                lineHeight: "1.6",
                fontWeight: "500",
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
              }}>
                {currentQuestion?.question_text}
              </div>
            </div>

            {/* Answers Grid - Scrollable if needed but fits screen */}
            <div style={{ 
              flex: 1,
              padding: isMobile ? "15px" : "20px",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "10px" : "15px",
              maxHeight: "calc(100vh - 300px)" // Prevents overflow
            }}>
              {currentQuestion && currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                const optionLetter = String.fromCharCode(65 + index);
                
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(currentQuestion.id, option.id)}
                    disabled={saveState === "saving"}
                    style={{
                      padding: isMobile ? "15px" : "18px",
                      background: isSelected 
                        ? "rgba(255, 255, 255, 0.2)" 
                        : "rgba(255, 255, 255, 0.08)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: `2px solid ${isSelected ? 
                        "rgba(255, 255, 255, 0.4)" : 
                        "rgba(255, 255, 255, 0.15)"}`,
                      borderRadius: "15px",
                      cursor: saveState === "saving" ? "not-allowed" : "pointer",
                      textAlign: "left",
                      fontSize: isMobile ? "14px" : "16px",
                      lineHeight: 1.5,
                      color: "white",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      transition: "all 0.2s ease",
                      opacity: saveState === "saving" && !isSelected ? 0.6 : 1,
                      minHeight: "44px",
                      WebkitTapHighlightColor: "transparent",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
                    }}
                    onMouseOver={(e) => {
                      if (!saveState && !isSelected) {
                        e.target.style.background = "rgba(255, 255, 255, 0.15)";
                        e.target.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!saveState && !isSelected) {
                        e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        e.target.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div style={{
                      width: isMobile ? "28px" : "32px",
                      height: isMobile ? "28px" : "32px",
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? 
                        "rgba(255, 255, 255, 0.8)" : 
                        "rgba(255, 255, 255, 0.4)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: isSelected ? "white" : "transparent",
                      fontWeight: "bold",
                      color: isSelected ? sectionConfig.color : "white",
                      fontSize: isMobile ? "12px" : "14px"
                    }}>
                      {optionLetter}
                    </div>
                    <span style={{ 
                      flex: 1, 
                      textShadow: "1px 1px 3px rgba(0,0,0,0.4)",
                      wordBreak: "break-word"
                    }}>
                      {option.answer_text}
                    </span>
                    
                    {isSelected && (
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: sectionConfig.color
                        }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation - Bottom */}
            <div style={{ 
              padding: isMobile ? "15px" : "20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              gap: isMobile ? "8px" : "15px",
              flexWrap: isMobile ? "wrap" : "nowrap",
              flexShrink: 0
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0} 
                style={{ 
                  padding: isMobile ? "12px 15px" : "14px 20px", 
                  background: currentIndex === 0 ? 
                    "rgba(255, 255, 255, 0.05)" : 
                    "rgba(21, 101, 192, 0.6)", 
                  color: currentIndex === 0 ? 
                    "rgba(255, 255, 255, 0.4)" : "white", 
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: "600",
                  flex: isMobile ? "1" : "1",
                  minHeight: "44px",
                  backdropFilter: "blur(5px)",
                  minWidth: isMobile ? "calc(50% - 4px)" : "auto",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                }}
              >
                ← Previous
              </button>
              
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                fontSize: isMobile ? "14px" : "16px",
                color: "white",
                fontWeight: "600",
                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                minWidth: isMobile ? "100%" : "auto",
                order: isMobile ? 3 : 2,
                marginTop: isMobile ? "10px" : "0",
                padding: isMobile ? "8px" : "0"
              }}>
                Question {currentIndex + 1} of {questions.length}
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  style={{ 
                    padding: isMobile ? "12px 15px" : "14px 20px", 
                    background: "rgba(76, 175, 80, 0.6)", 
                    color: "white", 
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "600",
                    flex: isMobile ? "1" : "1",
                    minHeight: "44px",
                    backdropFilter: "blur(5px)",
                    minWidth: isMobile ? "calc(50% - 4px)" : "auto",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                  }}
                >
                  Submit
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  style={{ 
                    padding: isMobile ? "12px 15px" : "14px 20px", 
                    background: "rgba(21, 101, 192, 0.6)", 
                    color: "white", 
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "600",
                    flex: isMobile ? "1" : "1",
                    minHeight: "44px",
                    backdropFilter: "blur(5px)",
                    minWidth: isMobile ? "calc(50% - 4px)" : "auto",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Desktop only */}
          {!isMobile && (
            <div style={{ 
              flex: 3,
              display: "flex", 
              flexDirection: "column", 
              gap: "15px",
              minWidth: "250px",
              maxHeight: "calc(100vh - 150px)" // Fit within viewport
            }}>
              
              {/* Progress Panel - Glass Effect */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "20px",
                padding: "20px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                overflow: "hidden"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px"
                }}>
                  <div style={{ 
                    fontSize: "16px", 
                    fontWeight: "600", 
                    color: "white",
                    textShadow: "1px 1px 3px rgba(0,0,0,0.5)"
                  }}>
                    Your Progress
                  </div>
                  <div style={{ 
                    fontSize: "14px", 
                    color: "rgba(255, 255, 255, 0.9)",
                    fontWeight: "600"
                  }}>
                    {totalAnswered}/{questions.length}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ 
                    height: "10px", 
                    background: "rgba(255, 255, 255, 0.1)", 
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
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginTop: "8px",
                    fontSize: "14px",
                    color: "rgba(255, 255, 255, 0.9)"
                  }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: "600" }}>
                      {Math.round((totalAnswered / questions.length) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Time Display */}
                <div style={{
                  padding: "15px",
                  background: timeRemaining < 1800 ? 
                    "rgba(255, 82, 82, 0.15)" : 
                    "rgba(76, 175, 80, 0.15)",
                  borderRadius: "12px",
                  border: `1px solid ${timeRemaining < 1800 ? 
                    "rgba(255, 82, 82, 0.3)" : 
                    "rgba(76, 175, 80, 0.3)"}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px",
                    marginBottom: "10px"
                  }}>
                    <span style={{ fontSize: "18px" }}>
                      {timeRemaining < 1800 ? "⏰" : "⏱️"}
                    </span>
                    <span style={{ 
                      fontSize: "14px", 
                      fontWeight: "600", 
                      color: timeRemaining < 1800 ? "#ff5252" : "white"
                    }}>
                      {timeRemaining < 1800 ? "Time Running Low!" : "Time Remaining"}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: "24px", 
                    fontWeight: "800", 
                    color: "white",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
                  }}>
                    {hours}h {minutes}m {seconds}s
                  </div>
                </div>
              </div>

              {/* Section Progress - Scrollable */}
              <div style={{ 
                flex: 1,
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "20px",
                padding: "20px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                overflowY: "auto"
              }}>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  color: "white",
                  textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                  marginBottom: "15px"
                }}>
                  Sections Progress
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {SECTION_ORDER.map(section => {
                    const progress = getSectionProgress(section);
                    const config = SECTION_CONFIG[section];
                    
                    return (
                      <div key={section} style={{ 
                        padding: "12px",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
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
                            fontSize: "14px",
                            color: "white",
                            textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                          }}>
                            <span>{config.icon}</span>
                            <span style={{ fontSize: "13px" }}>{section}</span>
                          </div>
                          <span style={{ 
                            fontSize: "13px", 
                            fontWeight: "600", 
                            color: config.color,
                            textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                          }}>
                            {progress.percentage}%
                          </span>
                        </div>
                        <div style={{ 
                          height: "4px", 
                          background: "rgba(255, 255, 255, 0.1)", 
                          borderRadius: "2px",
                          overflow: "hidden"
                        }}>
                          <div style={{ 
                            height: "100%", 
                            width: `${progress.percentage}%`, 
                            background: config.color, 
                            borderRadius: "2px"
                          }} />
                        </div>
                        <div style={{ 
                          fontSize: "11px", 
                          color: "rgba(255, 255, 255, 0.7)",
                          marginTop: "6px",
                          textAlign: "right"
                        }}>
                          {progress.answered}/{progress.total}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation - Fixed */}
        {isMobile && (
          <div style={{
            position: "fixed",
            bottom: "0",
            left: "0",
            right: "0",
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            padding: "12px 15px",
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 100,
            borderRadius: "20px 20px 0 0"
          }}>
            <button 
              onClick={handleBack}
              disabled={currentIndex === 0}
              style={{
                padding: "12px 15px",
                background: currentIndex === 0 ? 
                  "rgba(255, 255, 255, 0.05)" : 
                  "rgba(21, 101, 192, 0.6)",
                color: currentIndex === 0 ? 
                  "rgba(255, 255, 255, 0.4)" : "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                flex: 1,
                marginRight: "5px",
                minHeight: "44px",
                backdropFilter: "blur(5px)",
                textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
              }}
            >
              ← Back
            </button>
            
            <div style={{
              padding: "8px 12px",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(5px)",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              color: "white",
              whiteSpace: "nowrap",
              margin: "0 10px",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
            }}>
              {currentIndex + 1}/{questions.length}
            </div>
            
            {isLastQuestion ? (
              <button 
                onClick={() => setShowSubmitModal(true)}
                style={{
                  padding: "12px 15px",
                  background: "rgba(76, 175, 80, 0.6)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  flex: 1,
                  marginLeft: "5px",
                  minHeight: "44px",
                  backdropFilter: "blur(5px)",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                }}
              >
                Submit
              </button>
            ) : (
              <button 
                onClick={handleNext}
                style={{
                  padding: "12px 15px",
                  background: "rgba(21, 101, 192, 0.6)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  flex: 1,
                  marginLeft: "5px",
                  minHeight: "44px",
                  backdropFilter: "blur(5px)",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                }}
              >
                Next →
              </button>
            )}
          </div>
        )}

        {/* Footer - Minimal */}
        <div style={{
          padding: isMobile ? "10px 15px 70px 15px" : "15px 20px",
          fontSize: isMobile ? "11px" : "12px",
          color: "rgba(255, 255, 255, 0.7)",
          textAlign: "center",
          marginTop: "10px",
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: "10px",
          backdropFilter: "blur(5px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0
        }}>
          <div style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
            © 2024 Stratavax • Auto-save enabled • Complete all {questions.length} questions
          </div>
        </div>
      </div>
    </>
  );
}
