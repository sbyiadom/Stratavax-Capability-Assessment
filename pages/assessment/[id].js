// pages/assessment/[id].js
import { useEffect, useState, useMemo } from "react";
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

// CONSISTENT RANDOMIZATION FUNCTION
// This will give same order every time for same question ID
function getRandomizedAnswers(answers, questionId, section) {
  // Only randomize Technical Competence questions
  if (section !== 'Technical Competence' || !answers || answers.length === 0) {
    return answers;
  }
  
  // Convert question ID to numeric seed
  const seed = parseInt(questionId) || 1;
  
  // Create a copy of answers
  const shuffled = [...answers];
  
  // Deterministic shuffle using question ID as seed
  // This algorithm ensures same order every time
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Create deterministic "random" index
    const pseudoRandom = Math.sin(seed * (i + 1)) * 10000;
    const j = Math.floor(Math.abs(pseudoRandom - Math.floor(pseudoRandom)) * (i + 1));
    
    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Rest of your existing functions (saveResponse, loadUserResponses) remain the same...

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
  const [error, setError] = useState(null);
  const [randomizedQuestions, setRandomizedQuestions] = useState([]);

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

  // Fetch questions and randomize Technical Competence answers
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

        // Process questions with randomization for Technical Competence
        const processedQuestions = questionsData.map(q => {
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
          };
          
          // Randomize answers for Technical Competence questions
          if (q.section === 'Technical Competence') {
            return {
              ...baseQuestion,
              options: getRandomizedAnswers(baseQuestion.options, q.id, q.section)
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

  // Answer selection - REMAINS THE SAME
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

  // Loading state - REMAINS THE SAME
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

  // Error state - REMAINS THE SAME
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

  // Check if current question is from Technical Competence
  const isTechnicalQuestion = currentSection === 'Technical Competence';

  return (
    <>
      {/* Submit Confirmation Modal - REMAINS THE SAME */}
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
                  borderRadius: "10
