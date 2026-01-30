import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";
import { saveResponse } from "../../supabase/response";

const SECTION_CONFIG = {
  'Cognitive Abilities': {
    color: '#1565c0',
    icon: '🧠',
    description: 'Numerical, verbal, logical, and abstract reasoning skills'
  },
  'Personality Assessment': {
    color: '#7b1fa2',
    icon: '😊',
    description: 'Big Five personality traits and behavioral patterns'
  },
  'Leadership Potential': {
    color: '#d32f2f',
    icon: '👑',
    description: 'Vision, decision-making, team development, and communication'
  },
  'Technical Competence': {
    color: '#388e3c',
    icon: '⚙️',
    description: 'Problem-solving, technical knowledge, quality, and innovation'
  },
  'Performance Metrics': {
    color: '#f57c00',
    icon: '📊',
    description: 'Work ethic, adaptability, collaboration, and ethics'
  }
};

const SECTION_ORDER = [
  'Cognitive Abilities',
  'Personality Assessment',
  'Leadership Potential',
  'Technical Competence',
  'Performance Metrics'
];

export default function AssessmentPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Use our default assessment ID from database
  const assessmentId = '11111111-1111-1111-1111-111111111111';

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [saveStatus, setSaveStatus] = useState({});
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Professional backgrounds
  const backgrounds = [
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80",
  ];

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setIsSessionReady(true);
          console.log("✅ Session initialized:", data.session.user.id);
        } else {
          console.warn("⚠️ No session found - redirecting to login");
          router.push("/login");
        }
      } catch (error) {
        console.error("❌ Session error:", error);
        router.push("/login");
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔄 Auth state:", event);
        setSession(session);
        setIsSessionReady(!!session);
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [router]);

  // Fetch questions with answers
  useEffect(() => {
    if (!isSessionReady) return;

    let isActive = true;

    const fetchAssessmentData = async () => {
      try {
        console.log("📥 Loading assessment data...");

        // Fetch questions with their answers
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            difficulty_level,
            answers (
              id,
              answer_text,
              score,
              trait_dimension
            )
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (questionsError) throw questionsError;

        if (!isActive) return;

        console.log(`📋 Loaded ${questionsData?.length || 0} questions`);

        // Load user's previous responses
        if (session?.user?.id) {
          const { data: responsesData, error: responsesError } = await supabase
            .from("responses")
            .select("question_id, answer_id")
            .eq("assessment_id", assessmentId)
            .eq("user_id", session.user.id);

          if (responsesError) {
            console.error("❌ Error loading responses:", responsesError);
          }

          const savedAnswers = {};
          if (responsesData) {
            responsesData.forEach(response => {
              savedAnswers[response.question_id] = response.answer_id;
            });
            console.log(`📝 Loaded ${Object.keys(savedAnswers).length} previous answers`);
          }

          setAnswers(savedAnswers);
        }

        // Shuffle questions within each section
        const shuffleArray = (array) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        // Group by section, shuffle within sections, then combine
        const questionsBySection = {};
        (questionsData || []).forEach(q => {
          if (!questionsBySection[q.section]) {
            questionsBySection[q.section] = [];
          }
          questionsBySection[q.section].push(q);
        });

        // Shuffle questions within each section and shuffle their answers
        const formattedQuestions = SECTION_ORDER.flatMap(section => {
          const sectionQuestions = questionsBySection[section] || [];
          const shuffledQuestions = shuffleArray(sectionQuestions);
          return shuffledQuestions.map(q => ({
            ...q,
            options: shuffleArray(q.answers || [])
          }));
        });

        setQuestions(formattedQuestions);
        setTotalQuestions(formattedQuestions.length);

        // Start at first question
        if (formattedQuestions.length > 0) {
          setCurrentIndex(0);
        }

      } catch (error) {
        console.error("❌ Error loading assessment:", error);
        alert("Failed to load assessment. Please refresh the page.");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchAssessmentData();

    return () => {
      isActive = false;
    };
  }, [assessmentId, isSessionReady, session]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 1;
        // Auto-submit after 3 hours (10800 seconds)
        if (newElapsed >= 10800) {
          handleFinish();
          return prev;
        }
        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle answer selection
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) {
      alert("Please wait for session initialization");
      return;
    }

    console.group("🎯 Answer Selection");
    console.log("Question:", questionId, "Answer:", answerId);

    // Update UI immediately
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      const result = await saveResponse(assessmentId, questionId, answerId, session.user.id);
      
      console.log("✅ Save result:", result);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));

      // Clear save status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);

    } catch (error) {
      console.error("❌ Save error:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
      
      // Revert UI change
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });

      alert(`Save failed: ${error.message}`);
    }

    console.groupEnd();
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleJump = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  // Get section progress
  const getSectionProgress = (section) => {
    const sectionQuestions = questions.filter(q => q.section === section);
    const answered = sectionQuestions.filter(q => answers[q.id]).length;
    return { answered, total: sectionQuestions.length };
  };

  const handleFinish = async () => {
    if (!session?.user?.id) {
      alert("Please log in to submit your assessment.");
      router.push("/login");
      return;
    }

    const unanswered = questions.length - Object.keys(answers).length;
    
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    try {
      // Submit assessment
      const submitRes = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assessment_id: assessmentId, 
          user_id: session.user.id 
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Submission failed");

      // Calculate classification
      const classifyRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assessment_id: assessmentId, 
          user_id: session.user.id 
        }),
      });

      const classifyData = await classifyRes.json();
      
      alert(`✅ Assessment submitted successfully!\n\nScore: ${classifyData.total || 0}\nClassification: ${classifyData.classification || "Pending"}`);
      
      router.push("/");

    } catch (error) {
      console.error("❌ Submission error:", error);
      alert(`Submission failed: ${error.message}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        flexDirection: "column",
        gap: "20px"
      }}>
        <div style={{ fontSize: "18px", fontWeight: "500" }}>Loading Assessment...</div>
        <div style={{ width: "200px", height: "4px", backgroundColor: "#e0e0e0", borderRadius: "2px" }}>
          <div style={{ 
            width: "60%", 
            height: "100%", 
            backgroundColor: "#1565c0",
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
    );
  }

  if (!questions.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h3>Assessment Not Available</h3>
        <p>No questions found for this assessment.</p>
        <button 
          onClick={() => router.push("/")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#1565c0",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "20px"
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const bgIndex = currentIndex % backgrounds.length;
  const saveState = saveStatus[currentQuestion.id];
  const timeRemaining = 10800 - elapsed;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const currentSection = currentQuestion.section;
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG['Cognitive Abilities'];

  return (
    <AppLayout background={backgrounds[bgIndex]}>
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        minHeight: "100vh",
        padding: "20px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        
        {/* Header with timer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          padding: "15px 20px",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", color: "#1565c0" }}>
              Stratavax EvalEx Assessment
            </h1>
            <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
              100 Questions • 5 Sections • Comprehensive Talent Evaluation
            </p>
          </div>
          
          <Timer elapsed={elapsed} totalSeconds={10800} />
          
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#e3f2fd",
            borderRadius: "20px",
            fontWeight: "600",
            color: "#1565c0"
          }}>
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", gap: "20px", flex: 1 }}>
          
          {/* Questions panel */}
          <div style={{ 
            flex: 3,
            backgroundColor: "rgba(255, 255, 255, 0.97)",
            borderRadius: "12px",
            padding: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column"
          }}>
            
            {/* Section header */}
            <div style={{
              backgroundColor: sectionConfig.color,
              color: "white",
              padding: "12px 20px",
              borderRadius: "8px",
              marginBottom: "25px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ fontSize: "20px" }}>
                {sectionConfig.icon}
              </span>
              <div>
                <div style={{ fontWeight: "600", fontSize: "18px" }}>
                  {currentSection}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.9 }}>
                  {sectionConfig.description}
                </div>
              </div>
            </div>

            {/* Question info */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "15px",
              borderBottom: "1px solid #eee"
            }}>
              <div>
                <span style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#333"
                }}>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span style={{
                  marginLeft: "15px",
                  fontSize: "14px",
                  color: "#666",
                  backgroundColor: "#f5f5f5",
                  padding: "3px 10px",
                  borderRadius: "12px"
                }}>
                  Section {SECTION_ORDER.indexOf(currentSection) + 1} of 5
                </span>
              </div>
              
              <div style={{
                padding: "6px 12px",
                borderRadius: "15px",
                backgroundColor: 
                  saveState === "saving" ? "#ffb74d" :
                  saveState === "saved" ? "#4caf50" :
                  saveState === "error" ? "#f44336" : "transparent",
                color: saveState ? "white" : "transparent",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s"
              }}>
                {saveState === "saving" && "⏳ Saving..."}
                {saveState === "saved" && "✅ Saved"}
                {saveState === "error" && "❌ Error"}
              </div>
            </div>

            {/* Question text */}
            <div style={{
              fontSize: "18px",
              lineHeight: "1.6",
              marginBottom: "30px",
              padding: "15px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              borderLeft: `4px solid ${sectionConfig.color}`
            }}>
              {currentQuestion.question_text}
            </div>

            {/* Answer options */}
            <QuestionCard
              question={currentQuestion}
              selected={answers[currentQuestion.id]}
              onSelect={(answerId) => handleSelect(currentQuestion.id, answerId)}
              disabled={saveState === "saving"}
            />

            {/* Navigation buttons */}
            <div style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "25px",
              borderTop: "1px solid #eee"
            }}>
              <button 
                onClick={handleBack}
                disabled={currentIndex === 0}
                style={{
                  padding: "12px 25px",
                  backgroundColor: currentIndex === 0 ? "#f5f5f5" : "#1565c0",
                  color: currentIndex === 0 ? "#999" : "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: currentIndex === 0 ? 0.6 : 1
                }}
              >
                ← Previous Question
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={handleFinish}
                  style={{
                    padding: "12px 30px",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  🏁 Submit Assessment
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  style={{
                    padding: "12px 25px",
                    backgroundColor: "#1565c0",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  Next Question →
                </button>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Question navigation */}
            <QuestionNav
              questions={questions}
              answers={answers}
              current={currentIndex}
              onJump={handleJump}
            />

            {/* Progress summary */}
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.97)",
              borderRadius: "12px",
              padding: "25px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
                Assessment Progress
              </h3>
              
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "14px"
                }}>
                  <span>Overall Completion</span>
                  <span style={{ fontWeight: "600" }}>
                    {Math.round((Object.keys(answers).length / totalQuestions) * 100)}%
                  </span>
                </div>
                <div style={{
                  height: "10px",
                  backgroundColor: "#e0e0e0",
                  borderRadius: "5px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(Object.keys(answers).length / totalQuestions) * 100}%`,
                    backgroundColor: "#4caf50",
                    borderRadius: "5px",
                    transition: "width 0.5s ease"
                  }} />
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div style={{
                  textAlign: "center",
                  padding: "15px",
                  backgroundColor: "#e8f5e9",
                  borderRadius: "8px"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#2e7d32" }}>
                    {Object.keys(answers).length}
                  </div>
                  <div style={{ fontSize: "13px", color: "#555" }}>Answered</div>
                </div>
                <div style={{
                  textAlign: "center",
                  padding: "15px",
                  backgroundColor: "#ffebee",
                  borderRadius: "8px"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#c62828" }}>
                    {totalQuestions - Object.keys(answers).length}
                  </div>
                  <div style={{ fontSize: "13px", color: "#555" }}>Remaining</div>
                </div>
              </div>

              {/* Section breakdown */}
              <div>
                <h4 style={{ marginBottom: "15px", fontSize: "16px", color: "#555" }}>
                  Section Progress
                </h4>
                {SECTION_ORDER.map(section => {
                  const progress = getSectionProgress(section);
                  const config = SECTION_CONFIG[section];
                  
                  return progress.total > 0 && (
                    <div key={section} style={{ marginBottom: "12px" }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        marginBottom: "5px"
                      }}>
                        <span>{config.icon} {section}</span>
                        <span>{progress.answered}/{progress.total}</span>
                      </div>
                      <div style={{
                        height: "6px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "3px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${(progress.answered / progress.total) * 100}%`,
                          backgroundColor: config.color,
                          borderRadius: "3px"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: "20px",
          padding: "15px",
          textAlign: "center",
          fontSize: "12px",
          color: "#666",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "8px"
        }}>
          <p style={{ margin: 0 }}>
            © 2024 Stratavax EvalEx Assessment System | 100 Questions • 5 Sections • 
            Time will auto-submit when expired
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
