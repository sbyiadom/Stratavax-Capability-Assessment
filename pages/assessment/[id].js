// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '🧠',
    bgImage: '/images/backgrounds/cognitive-bg.jpg'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    lightBg: 'rgba(156, 39, 176, 0.1)',
    icon: '😊',
    bgImage: 'https://img.freepik.com/free-photo/people-studying-together-communicating_23-2147656354.jpg'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    lightBg: 'rgba(211, 47, 47, 0.1)',
    icon: '👑',
    bgImage: 'https://img.freepik.com/free-photo/friends-people-group-teamwork-diversity_53876-31488.jpg?semt=ais_hybrid&w=740&q=80'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    lightBg: 'rgba(56, 142, 60, 0.1)',
    icon: '⚙️',
    bgImage: 'https://thumbs.dreamstime.com/b/happy-students-giving-high-five-school-education-friendship-concept-33187252.jpg'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    lightBg: 'rgba(245, 124, 0, 0.1)',
    icon: '📊',
    bgImage: '/images/backgrounds/performance-bg.jpg'
  }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);
const TIME_LIMIT_SECONDS = 10800;

// Consistent randomization function for Technical Competence
function randomizeTechnicalAnswers(answers, questionId) {
  if (!answers || answers.length === 0) return answers;
  
  const seed = parseInt(questionId) || 1;
  const shuffled = [...answers];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const pseudoRandom = Math.sin(seed * (i + 1)) * 10000;
    const j = Math.floor(Math.abs(pseudoRandom - Math.floor(pseudoRandom)) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

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

        const processedQuestions = questionsData.map(q => {
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
          };
          
          if (q.section === 'Technical Competence') {
            return {
              ...baseQuestion,
              options: randomizeTechnicalAnswers(baseQuestion.options, q.id)
            };
          }
          
          return baseQuestion;
        });

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

  // Get current question data
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

      {/* Main Assessment Layout */}
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        
        {/* FULL-WIDTH HEADER WITH HAPPY STUDENT IMAGE */}
        <div style={{
          background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), 
                      url('https://img.freepik.com/free-photo/multiethnic-group-young-happy-students-standing-outdoors_171337-11812.jpg?semt=ais_user_personalization&w=740&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: '15px 30px',
          boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          minHeight: '180px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a237e',
                fontSize: '24px',
                fontWeight: 'bold',
                backdropFilter: 'blur(5px)'
              }}>
                😊
              </div>
              
              <div>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: 'white',
                  lineHeight: 1.2,
                  textShadow: '2px 2px 8px rgba(0,0,0,0.7)'
                }}>
                  Stratavax Capability Assessment
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontWeight: '500',
                  marginTop: '5px',
                  textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                }}>
                  Section: {currentSection} • Question {currentIndex + 1} of {questions.length}
                </div>
              </div>
            </div>
            
            {/* COMPACT TIMER */}
            <div style={{
              padding: '10px 15px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '10px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              minWidth: '140px',
              backdropFilter: 'blur(5px)'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: timeRemaining < 1800 ? '#ff9800' : '#2196f3',
                marginBottom: '5px'
              }}>
                {timeRemaining < 1800 ? 'TIME LOW' : 'TIME REMAINING'}
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: timeRemaining < 1800 ? '#d84315' : '#1565c0'
              }}>
                {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
              </div>
            </div>
          </div>

          {/* COMPACT PROGRESS BAR */}
          <div style={{ marginTop: '15px', position: 'relative', zIndex: 2 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                Progress: {progressPercentage}%
              </span>
              <span style={{ color: 'white' }}>
                {totalAnswered}/{questions.length} Answered
              </span>
            </div>
            <div style={{ 
              height: '8px', 
              background: 'rgba(255, 255, 255, 0.3)', 
              borderRadius: '4px',
              overflow: 'hidden',
              backdropFilter: 'blur(5px)'
            }}>
              <div style={{ 
                height: '100%', 
                width: `${progressPercentage}%`, 
                background: 'linear-gradient(90deg, #4caf50, #2e7d32)', 
                borderRadius: '4px'
              }} />
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ 
          flex: 1,
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'auto'
        }}>
          <div style={{
            maxWidth: '1000px',
            width: '100%',
            background: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), 
                        url('${sectionConfig.bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderRadius: '15px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 240px)',
            backdropFilter: 'blur(2px)'
          }}>
            {/* QUESTION SECTION */}
            <div style={{
              padding: '25px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.8)',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '15px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: sectionConfig.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                  {sectionConfig.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: sectionConfig.color
                  }}>
                    {currentSection}
                  </div>
                  {currentQuestion?.subsection && (
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      {currentQuestion.subsection}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '18px', 
                lineHeight: 1.6,
                color: '#333',
                fontWeight: '500',
                padding: '15px',
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '10px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(5px)'
              }}>
                {currentQuestion?.question_text}
              </div>
            </div>

            {/* ANSWER OPTIONS AREA */}
            <div style={{ 
              flex: 1,
              padding: '25px',
              overflowY: 'auto',
              minHeight: 0,
              background: 'rgba(255, 255, 255, 0.6)'
            }}>
              {/* Save Status */}
              {saveStatus[currentQuestion?.id] && (
                <div style={{
                  padding: '12px 20px',
                  background: saveStatus[currentQuestion.id] === 'saved' ? 'rgba(76, 175, 80, 0.1)' : 
                             saveStatus[currentQuestion.id] === 'saving' ? 'rgba(255, 152, 0, 0.1)' : 
                             'rgba(211, 47, 47, 0.1)',
                  border: `2px solid ${saveStatus[currentQuestion.id] === 'saved' ? '#4caf50' : 
                           saveStatus[currentQuestion.id] === 'saving' ? '#ff9800' : 
                           '#d32f2f'}`,
                  borderRadius: '10px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: saveStatus[currentQuestion.id] === 'saved' ? '#2e7d32' : 
                         saveStatus[currentQuestion.id] === 'saving' ? '#f57c00' : 
                         '#d32f2f',
                  backdropFilter: 'blur(5px)'
                }}>
                  {saveStatus[currentQuestion.id] === 'saved' ? (
                    <>
                      <span style={{ fontSize: '18px' }}>✓</span>
                      Answer saved successfully
                    </>
                  ) : saveStatus[currentQuestion.id] === 'saving' ? (
                    <>
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Saving your answer...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '18px' }}>⚠️</span>
                      Failed to save. Please try again.
                    </>
                  )}
                </div>
              )}

              {/* ANSWER GRID */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px'
              }}>
                {currentQuestion?.options?.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  const optionLetter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveStatus[currentQuestion.id] === 'saving'}
                      style={{
                        padding: '20px',
                        background: isSelected ? 
                          `rgba(${parseInt(sectionConfig.color.slice(1, 3), 16)}, ${parseInt(sectionConfig.color.slice(3, 5), 16)}, ${parseInt(sectionConfig.color.slice(5, 7), 16)}, 0.15)` : 
                          'rgba(255, 255, 255, 0.8)',
                        border: `2px solid ${isSelected ? sectionConfig.color : 'rgba(224, 224, 224, 0.7)'}`,
                        borderRadius: '12px',
                        cursor: saveStatus[currentQuestion.id] === 'saving' ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        fontSize: '16px',
                        lineHeight: 1.5,
                        transition: 'all 0.2s ease',
                        color: isSelected ? sectionConfig.color : '#333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        height: '100%',
                        minHeight: '70px',
                        backdropFilter: 'blur(10px)',
                        boxShadow: isSelected ? 
                          `0 4px 15px ${sectionConfig.color}40` : 
                          '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseOver={(e) => {
                        if (!saveStatus[currentQuestion.id] && !isSelected) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                          e.currentTarget.style.borderColor = sectionConfig.color;
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!saveStatus[currentQuestion.id] && !isSelected) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                          e.currentTarget.style.borderColor = 'rgba(224, 224, 224, 0.7)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                    >
                      {/* Option Indicator */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isSelected ? sectionConfig.color : 'rgba(255, 255, 255, 0.9)',
                        color: isSelected ? 'white' : '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                        flexShrink: 0,
                        border: `2px solid ${isSelected ? sectionConfig.color : '#e0e0e0'}`,
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.2)' : 'none'
                      }}>
                        {optionLetter}
                      </div>
                      
                      {/* Option Text */}
                      <span style={{ 
                        flex: 1,
                        fontWeight: isSelected ? '600' : '500'
                      }}>
                        {option.answer_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COMPACT NAVIGATION FOOTER */}
            <div style={{ 
              padding: '20px',
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              backdropFilter: 'blur(5px)'
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0} 
                style={{ 
                  padding: '12px 25px', 
                  background: currentIndex === 0 ? 'rgba(233, 236, 239, 0.7)' : sectionConfig.color, 
                  color: currentIndex === 0 ? '#999' : 'white', 
                  border: 'none',
                  borderRadius: '10px',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(5px)',
                  boxShadow: currentIndex === 0 ? 'none' : '0 4px 10px rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => currentIndex !== 0 && (e.currentTarget.style.transform = 'translateX(-2px)')}
                onMouseOut={(e) => currentIndex !== 0 && (e.currentTarget.style.transform = 'translateX(0)')}
              >
                ← Previous
              </button>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#666',
                    marginBottom: '3px',
                    fontWeight: '600'
                  }}>
                    Question
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    color: sectionConfig.color
                  }}>
                    {currentIndex + 1}<span style={{ fontSize: '14px', color: '#999' }}>/{questions.length}</span>
                  </div>
                </div>
                
                {/* Quick Jump Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 5))}
                    disabled={currentIndex < 5}
                    style={{
                      padding: '8px 12px',
                      background: currentIndex < 5 ? 'rgba(233, 236, 239, 0.7)' : sectionConfig.lightBg,
                      color: currentIndex < 5 ? '#999' : sectionConfig.color,
                      border: `1px solid ${currentIndex < 5 ? 'rgba(224, 224, 224, 0.5)' : sectionConfig.color}`,
                      borderRadius: '8px',
                      cursor: currentIndex < 5 ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    -5
                  </button>
                  <button 
                    onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 5))}
                    disabled={currentIndex >= questions.length - 5}
                    style={{
                      padding: '8px 12px',
                      background: currentIndex >= questions.length - 5 ? 'rgba(233, 236, 239, 0.7)' : sectionConfig.lightBg,
                      color: currentIndex >= questions.length - 5 ? '#999' : sectionConfig.color,
                      border: `1px solid ${currentIndex >= questions.length - 5 ? 'rgba(224, 224, 224, 0.5)' : sectionConfig.color}`,
                      borderRadius: '8px',
                      cursor: currentIndex >= questions.length - 5 ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    +5
                  </button>
                </div>
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  style={{ 
                    padding: '12px 25px', 
                    background: 'linear-gradient(135deg, #4caf50, #2e7d32)', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backdropFilter: 'blur(5px)',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  Submit →
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  style={{ 
                    padding: '12px 25px', 
                    background: sectionConfig.color, 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backdropFilter: 'blur(5px)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* COMPACT QUICK NAVIGATION */}
        <div style={{
          padding: '15px 20px',
          background: 'white',
          borderTop: '1px solid #e9ecef',
          overflowX: 'auto',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '10px',
            color: '#1a237e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span>
            Quick Navigation
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '400', marginLeft: 'auto' }}>
              Click any number to jump
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            paddingBottom: '5px'
          }}>
            {questions.map((q, index) => {
              const isAnswered = answers[q.id];
              const isCurrent = index === currentIndex;
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(index)}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: isCurrent ? sectionConfig.color : 
                               isAnswered ? '#4caf50' : '#f5f5f5',
                    color: isCurrent ? 'white' : 
                           isAnswered ? 'white' : '#666',
                    border: `2px solid ${isCurrent ? sectionConfig.color : 
                             isAnswered ? '#4caf50' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    boxShadow: isCurrent ? `0 2px 8px ${sectionConfig.color}80` : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isCurrent ? `0 2px 8px ${sectionConfig.color}80` : 'none';
                    }
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
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(241, 241, 241, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(193, 193, 193, 0.8);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 168, 168, 0.9);
        }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hidden {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </>
  );
}
