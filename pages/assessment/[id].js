import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";
import { saveResponse } from "../../supabase/response";

// Section configuration
const SECTION_CONFIG = {
  'Cognitive Abilities': { color: '#1565c0', icon: '🧠', questions: 20 },
  'Personality Assessment': { color: '#7b1fa2', icon: '😊', questions: 20 },
  'Leadership Potential': { color: '#d32f2f', icon: '👑', questions: 20 },
  'Technical Competence': { color: '#388e3c', icon: '⚙️', questions: 20 },
  'Performance Metrics': { color: '#f57c00', icon: '📊', questions: 20 }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);

// Helper function to load user responses
async function loadUserResponses(user_id) {
  try {
    const { data, error } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
      .eq("user_id", user_id);

    if (error) {
      console.error("Error loading responses:", error);
      return {};
    }

    const responses = {};
    data.forEach(r => {
      responses[r.question_id] = r.answer_id;
    });
    
    console.log(`Loaded ${Object.keys(responses).length} previous responses`);
    return responses;
  } catch (error) {
    console.error("Error in loadUserResponses:", error);
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
  const [error, setError] = useState("");

  // Backgrounds
  const backgrounds = [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&auto=format&fit=crop&q=80",
  ];

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setIsSessionReady(true);
          console.log("✅ Session initialized:", data.session.user.id);
        } else {
          console.warn("⚠️ No session found");
          router.push("/login");
        }
      } catch (error) {
        console.error("❌ Session error:", error);
        setError("Failed to initialize session");
        router.push("/login");
      }
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔄 Auth state:", event);
        setSession(session);
        setIsSessionReady(!!session);
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [router]);

  // Fetch questions
  useEffect(() => {
    if (!isSessionReady || !session?.user?.id) return;

    const fetchData = async () => {
      try {
        console.log("📥 Fetching assessment data...");
        
        // Fetch questions with answers - FIXED QUERY
        const { data: questionsData, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            answers!inner (
              id,
              answer_text,
              score
            )
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (error) {
          console.error("❌ Query error:", error);
          throw error;
        }

        console.log(`📋 Loaded ${questionsData?.length || 0} questions`);

        // Load previous responses
        const savedAnswers = await loadUserResponses(session.user.id);

        // Check if questions have answers
        const validQuestions = questionsData.filter(q => q.answers && q.answers.length > 0);
        
        if (validQuestions.length === 0) {
          throw new Error("No questions with answers found in database");
        }

        console.log(`✅ ${validQuestions.length} questions have answers`);

        // Group by section
        const questionsBySection = {};
        validQuestions.forEach(q => {
          if (!questionsBySection[q.section]) {
            questionsBySection[q.section] = [];
          }
          // Shuffle answers for each question
          const shuffledAnswers = [...q.answers].sort(() => Math.random() - 0.5);
          questionsBySection[q.section].push({
            ...q,
            options: shuffledAnswers
          });
        });

        // Combine sections in order and shuffle within sections
        const allQuestions = SECTION_ORDER.flatMap(section => {
          const sectionQuestions = questionsBySection[section] || [];
          return [...sectionQuestions].sort(() => Math.random() - 0.5);
        });

        // Validate we have enough questions
        if (allQuestions.length < 20) {
          console.warn(`⚠️ Only ${allQuestions.length} questions loaded`);
        }

        setQuestions(allQuestions);
        setAnswers(savedAnswers);

        // Debug: Log first question
        if (allQuestions.length > 0) {
          console.log("First question sample:", {
            id: allQuestions[0].id,
            text: allQuestions[0].question_text.substring(0, 50) + "...",
            options: allQuestions[0].options?.length,
            optionIds: allQuestions[0].options?.map(o => o.id)
          });
        }

      } catch (error) {
        console.error("❌ Error loading assessment:", error);
        setError(`Failed to load assessment: ${error.message}`);
        alert(`Failed to load assessment: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assessmentId, isSessionReady, session]);

  // Timer with auto-submit
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(t => {
        const newTime = t + 1;
        // Auto-submit after 3 hours (10800 seconds)
        if (newTime >= 10800) {
          handleFinish();
          return t;
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle answer selection
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) {
      alert("Please wait for session to initialize");
      return;
    }

    console.log("🎯 Selecting answer:", { questionId, answerId });

    // Update UI immediately
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      const result = await saveResponse(assessmentId, questionId, answerId, session.user.id);
      
      console.log("✅ Save successful:", result);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      // Clear status after 2 seconds
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
      
      // Revert UI on error
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
      
      alert(`Save failed: ${error.message}`);
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

  // Calculate section progress
  const getSectionProgress = (section) => {
    const sectionQuestions = questions.filter(q => q.section === section);
    const answered = sectionQuestions.filter(q => answers[q.id]).length;
    return { 
      answered, 
      total: sectionQuestions.length,
      percentage: sectionQuestions.length > 0 ? Math.round((answered / sectionQuestions.length) * 100) : 0
    };
  };

  const handleFinish = async () => {
    if (!session?.user?.id) {
      alert("Please log in to submit your assessment.");
      router.push("/login");
      return;
    }

    const unanswered = questions.length - Object.keys(answers).length;
    
    if (unanswered > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unanswered} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    try {
      // Submit assessment
      const res = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assessment_id: assessmentId, 
          user_id: session.user.id 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      // Trigger classification
      await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assessment_id: assessmentId, 
          user_id: session.user.id 
        }),
      });

      alert("✅ Assessment submitted successfully! You will be redirected.");
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
        padding: "40px", 
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh"
      }}>
        <div style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#1565c0" }}>
          Loading Assessment...
        </div>
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
        {error && <div style={{ color: "#f44336", marginTop: "20px" }}>{error}</div>}
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3 style={{ color: "#f44336" }}>Assessment Not Available</h3>
        <p>No questions found or questions don't have answers.</p>
        {error && <p style={{ color: "#f44336", marginTop: "10px" }}>{error}</p>}
        <button 
          onClick={() => router.push("/")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#1565c0",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "20px",
            fontSize: "16px"
          }}
        >
          Return Home
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || 'Cognitive Abilities';
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG['Cognitive Abilities'];
  const saveState = saveStatus[currentQuestion?.id];
  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = questions.length;

  // Calculate time
  const timeRemaining = 10800 - elapsed;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  return (
    <AppLayout background={backgrounds[currentIndex % backgrounds.length]}>
      {/* Error banner */}
      {error && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: "#f44336",
          color: "white",
          padding: "10px 15px",
          borderRadius: "5px",
          zIndex: 1000,
          maxWidth: "300px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ maxWidth: "1400px", margin: "auto", padding: 20 }}>
        
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          padding: "15px 20px",
          background: "white",
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <div>
            <h1 style={{ margin: 0, color: "#1565c0", fontSize: "24px" }}>Stratavax EvalEx Assessment</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
              {totalQuestions} Questions • Comprehensive Evaluation
            </p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Timer elapsed={elapsed} totalSeconds={10800} />
            <div style={{
              padding: "8px 16px",
              backgroundColor: "#e3f2fd",
              borderRadius: "20px",
              fontWeight: "600",
              color: "#1565c0",
              fontSize: "14px"
            }}>
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", gap: 20 }}>
          
          {/* Question panel */}
          <div style={{ 
            flex: 3, 
            background: "white", 
            padding: 30, 
            borderRadius: 12, 
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            minHeight: "70vh"
          }}>
            
            {/* Section header */}
            <div style={{
              background: sectionConfig.color,
              color: "white",
              padding: "12px 20px",
              borderRadius: 8,
              marginBottom: 25,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <span style={{ fontSize: 20 }}>{sectionConfig.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{currentSection}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Question {currentIndex + 1} of {totalQuestions} • 
                  Section {SECTION_ORDER.indexOf(currentSection) + 1} of 5
                </div>
              </div>
              
              {/* Save status */}
              <div style={{
                padding: "4px 12px",
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

            {/* Question */}
            <div style={{
              fontSize: "18px",
              lineHeight: 1.6,
              marginBottom: 30,
              padding: 20,
              background: "#f8f9fa",
              borderRadius: 8,
              borderLeft: `4px solid ${sectionConfig.color}`,
              flex: 1
            }}>
              {currentQuestion?.question_text || "Question not available"}
            </div>

            {/* Answers */}
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                selected={answers[currentQuestion.id]}
                onSelect={(answerId) => handleSelect(currentQuestion.id, answerId)}
                disabled={saveState === "saving"}
              />
            )}

            {/* Navigation */}
            <div style={{ 
              marginTop: "auto", 
              display: "flex", 
              justifyContent: "space-between",
              paddingTop: 30,
              borderTop: "1px solid #eee"
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0} 
                style={{ 
                  padding: "12px 25px", 
                  background: currentIndex === 0 ? "#f5f5f5" : "#1565c0", 
                  color: currentIndex === 0 ? "#999" : "white", 
                  border: "none", 
                  borderRadius: 8,
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500"
                }}
              >
                ← Previous
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={handleFinish}
                  style={{ 
                    padding: "12px 30px", 
                    background: "#4caf50", 
                    color: "white", 
                    border: "none", 
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600"
                  }}
                >
                  🏁 Finish Assessment
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  disabled={currentIndex === questions.length - 1} 
                  style={{ 
                    padding: "12px 25px", 
                    background: "#1565c0", 
                    color: "white", 
                    border: "none", 
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "500"
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* Question navigation */}
            <QuestionNav
              questions={questions}
              answers={answers}
              current={currentIndex}
              onJump={handleJump}
            />

            {/* Progress summary */}
            <div style={{ 
              background: "white", 
              padding: 25, 
              borderRadius: 12, 
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)" 
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 20, color: "#333" }}>Progress</h3>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "14px" }}>
                  <span>Overall Completion</span>
                  <span style={{ fontWeight: 600 }}>
                    {Math.round((totalAnswered / totalQuestions) * 100)}%
                  </span>
                </div>
                <div style={{ height: 10, background: "#e0e0e0", borderRadius: 5 }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${(totalAnswered / totalQuestions) * 100}%`, 
                    background: "#4caf50", 
                    borderRadius: 5,
                    transition: "width 0.5s ease"
                  }} />
                </div>
                <div style={{ fontSize: "13px", color: "#666", marginTop: "5px" }}>
                  {totalAnswered} of {totalQuestions} questions answered
                </div>
              </div>

              {/* Section progress */}
              <div style={{ marginTop: "20px" }}>
                <h4 style={{ marginBottom: 15, fontSize: "16px", color: "#555" }}>Section Progress</h4>
                {SECTION_ORDER.map(section => {
                  const progress = getSectionProgress(section);
                  const config = SECTION_CONFIG[section];
                  return (
                    <div key={section} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 5 }}>
                        <span>{config.icon} {section}</span>
                        <span>{progress.answered}/{progress.total} ({progress.percentage}%)</span>
                      </div>
                      <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                        <div style={{ 
                          height: "100%", 
                          width: `${progress.percentage}%`, 
                          background: config.color, 
                          borderRadius: 3 
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
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <p style={{ margin: 0 }}>
            © 2024 Stratavax Assessment System | Answers are saved automatically | 
            Assessment will auto-submit when time expires
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
