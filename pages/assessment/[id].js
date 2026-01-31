import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";

// EvalEx Assessment Configuration
const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#1565c0', 
    icon: '🧠', 
    questions: 20,
    description: 'Logical reasoning, problem-solving, analytical thinking'
  },
  'Personality Assessment': { 
    color: '#7b1fa2', 
    icon: '😊', 
    questions: 20,
    description: 'Behavioral traits, work style, interpersonal skills'
  },
  'Leadership Potential': { 
    color: '#d32f2f', 
    icon: '👑', 
    questions: 20,
    description: 'Management capabilities, decision-making, team leadership'
  },
  'Technical Competence': { 
    color: '#388e3c', 
    icon: '⚙️', 
    questions: 20,
    description: 'Job-specific technical skills and knowledge'
  },
  'Performance Metrics': { 
    color: '#f57c00', 
    icon: '📊', 
    questions: 20,
    description: 'Work habits, productivity, and performance indicators'
  }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);
const TOTAL_QUESTIONS = 100;
const TIME_LIMIT_SECONDS = 10800; // 3 hours

// Save response function
async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    const { data, error } = await supabase
      .from("responses")
      .upsert({
        assessment_id: assessmentId,
        question_id: parseInt(questionId),
        answer_id: parseInt(answerId),
        user_id: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'assessment_id,question_id,user_id'
      });

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
    const { data, error } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
      .eq("user_id", userId);

    if (error) {
      console.warn("No previous responses found or table doesn't exist");
      return {};
    }

    const responses = {};
    data.forEach(r => {
      responses[r.question_id] = r.answer_id;
    });
    
    console.log(`Loaded ${Object.keys(responses).length} previous responses`);
    return responses;
  } catch (error) {
    console.error("Error loading responses:", error);
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
  const [realQuestionCount, setRealQuestionCount] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Backgrounds
  const backgrounds = [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&auto=format&fit=crop&q=80",
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
        console.log("🔄 Fetching EvalEx assessment data...");
        
        // Fetch all questions with answers (without difficulty field)
        const { data: questionsData, error: questionsError } = await supabase
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

        if (questionsError) {
          console.error("❌ Error fetching questions:", questionsError);
          throw new Error(`Failed to load questions: ${questionsError.message}`);
        }

        console.log(`📊 Database contains ${questionsData?.length || 0} questions`);
        setRealQuestionCount(questionsData?.length || 0);

        if (!questionsData || questionsData.length === 0) {
          throw new Error("No questions found in the database.");
        }

        // Load user's previous responses
        const savedAnswers = await loadUserResponses(session.user.id);

        // Process questions
        const processedQuestions = questionsData.map(q => ({
          ...q,
          id: parseInt(q.id),
          options: q.answers.map(a => ({
            ...a,
            id: parseInt(a.id)
          })).sort(() => Math.random() - 0.5)
        }));

        // If we have less than 100 questions, we'll work with what we have
        // But we'll show the user that we expect 100 questions
        setQuestions(processedQuestions);
        setAnswers(savedAnswers);

        console.log(`✅ Assessment ready: ${processedQuestions.length} questions loaded`);

      } catch (error) {
        console.error("❌ Assessment loading error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId, isSessionReady, session]);

  // Timer with auto-submit
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(t => {
        const newTime = t + 1;
        if (newTime >= TIME_LIMIT_SECONDS) {
          handleAutoSubmit();
          return t;
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAutoSubmit = async () => {
    if (!session?.user?.id || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      alert("⏰ Time's up! Submitting your assessment automatically...");
      await submitAssessment();
    } catch (error) {
      console.error("Auto-submit error:", error);
    } finally {
      router.push("/");
    }
  };

  // Handle answer selection
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) {
      alert("Please wait for session to initialize");
      return;
    }

    // Update UI immediately
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      // Clear status after delay
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
      
      alert(`Failed to save answer. Please try again.`);
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowSubmitModal(true);
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
      const completionRate = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

      // Create or update assessment completion record
      const { error: updateError } = await supabase
        .from("user_assessments")
        .upsert({
          user_id: session.user.id,
          assessment_id: assessmentId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: answeredCount,
          total_questions: questions.length,
          completion_rate: completionRate,
          time_taken: elapsed
        }, {
          onConflict: 'user_id,assessment_id'
        });

      if (updateError) {
        console.error("Error updating assessment status:", updateError);
      }

      // Show success message
      const completionMessage = `
✅ EvalEx Assessment Successfully Submitted!

📊 Your Results:
• Questions attempted: ${answeredCount}/${questions.length} (${completionRate}%)
• Time taken: ${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds
• Assessment completed: ${new Date().toLocaleTimeString()}

Your responses have been saved for evaluation.
      `;

      alert(completionMessage);
      
      // Redirect to results page
      router.push("/assessment/results");
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleFinish = () => {
    setShowSubmitModal(true);
  };

  // Calculate section progress
  const getSectionProgress = (section) => {
    const sectionQuestions = questions.filter(q => q.section === section);
    const answered = sectionQuestions.filter(q => answers[q.id]).length;
    const total = sectionQuestions.length;
    
    return { 
      answered, 
      total,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
      expected: SECTION_CONFIG[section].questions
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
        padding: "40px", 
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh"
      }}>
        <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "20px", color: "#1565c0" }}>
          Loading EvalEx Assessment...
        </div>
        <div style={{ fontSize: "16px", color: "#666", marginBottom: "30px" }}>
          Preparing your comprehensive evaluation
        </div>
        <div style={{ width: "300px", height: "6px", backgroundColor: "#e0e0e0", borderRadius: "3px" }}>
          <div style={{ 
            width: "70%", 
            height: "100%", 
            backgroundColor: "#1565c0",
            borderRadius: "3px",
            animation: "loading 2s infinite"
          }} />
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3 style={{ color: "#f44336" }}>No Questions Available</h3>
        <p>The assessment doesn't have any questions yet.</p>
        {error && <p style={{ color: "#f44336", marginTop: "10px" }}>Error: {error}</p>}
        <button 
          onClick={() => router.push("/")}
          style={{
            padding: "12px 24px",
            backgroundColor: "#1565c0",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginTop: "20px",
            fontSize: "16px"
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection];
  const saveState = saveStatus[currentQuestion?.id];
  const totalAnswered = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const totalQuestions = questions.length;

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
            padding: "40px",
            borderRadius: "16px",
            maxWidth: "600px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
          }}>
            <h2 style={{ marginTop: 0, color: "#1565c0", fontSize: "28px" }}>
              Complete EvalEx Assessment
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: "20px", 
              background: "#f8f9fa", 
              borderRadius: "10px",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px"
              }}>
                <span>Total Questions:</span>
                <span style={{ fontWeight: "700" }}>
                  {totalQuestions} {realQuestionCount < TOTAL_QUESTIONS && `(Expected: ${TOTAL_QUESTIONS})`}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px"
              }}>
                <span>Questions Answered:</span>
                <span style={{ fontWeight: "700", color: "#4caf50" }}>
                  {totalAnswered}/{totalQuestions}
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
                  {totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0}%
                </span>
              </div>
              
              <div style={{ height: "12px", background: "#e0e0e0", borderRadius: "6px", margin: "20px 0" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0}%`, 
                  background: "#4caf50", 
                  borderRadius: "6px"
                }} />
              </div>
            </div>

            <p style={{ 
              marginBottom: "30px", 
              fontSize: "16px",
              lineHeight: "1.6"
            }}>
              {totalQuestions - totalAnswered > 0 
                ? `You have ${totalQuestions - totalAnswered} unanswered questions. Are you ready to submit?`
                : "All questions have been answered. Ready to submit your assessment?"}
            </p>

            {realQuestionCount < TOTAL_QUESTIONS && (
              <div style={{
                padding: "15px",
                backgroundColor: "#fff3e0",
                borderRadius: "8px",
                marginBottom: "25px",
                borderLeft: "4px solid #ff9800"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#e65100" }}>
                  ⚠️ Note: Database has {realQuestionCount} questions (Expected: {TOTAL_QUESTIONS})
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "20px" }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: "12px 24px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "15px"
                }}
              >
                Continue Assessment
              </button>
              <button
                onClick={submitAssessment}
                disabled={isSubmitting}
                style={{
                  padding: "12px 30px",
                  background: isSubmitting ? "#81c784" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: "16px"
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppLayout background={backgrounds[currentIndex % backgrounds.length]}>
        <div style={{ maxWidth: "1400px", margin: "auto", padding: 20 }}>
          
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
            padding: "20px 25px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            color: "white"
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>EvalEx Comprehensive Assessment</h1>
              <div style={{ margin: "8px 0 0 0", fontSize: "15px", opacity: 0.9 }}>
                <div>{totalQuestions} Questions • Stratavax Evaluation System</div>
                {realQuestionCount < TOTAL_QUESTIONS && (
                  <div style={{ marginTop: "5px", color: "#ffcc80", fontSize: "13px" }}>
                    ⚠️ Database has {realQuestionCount} questions (Expected: {TOTAL_QUESTIONS})
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
              <div style={{
                padding: "10px 20px",
                backgroundColor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: "25px",
                fontWeight: "700",
                fontSize: "16px",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                ⏱️ {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", gap: 25 }}>
            
            {/* Question panel */}
            <div style={{ 
              flex: 3, 
              background: "white", 
              padding: 35, 
              borderRadius: "14px", 
              boxShadow: "0 6px 25px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              minHeight: "75vh"
            }}>
              
              {/* Section header */}
              <div style={{
                background: `linear-gradient(135deg, ${sectionConfig.color} 0%, ${sectionConfig.color}99 100%)`,
                color: "white",
                padding: "18px 25px",
                borderRadius: "10px",
                marginBottom: 30,
                display: "flex",
                alignItems: "center",
                gap: 15,
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  right: "-30px",
                  top: "-30px",
                  width: "120px",
                  height: "120px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "50%"
                }} />
                
                <span style={{ fontSize: 28, zIndex: 1 }}>{sectionConfig.icon}</span>
                <div style={{ flex: 1, zIndex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "20px" }}>{currentSection}</div>
                  <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
                    {sectionConfig.description} • Question {currentIndex + 1} of {totalQuestions}
                  </div>
                </div>
                
                {/* Save status */}
                <div style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  backgroundColor: 
                    saveState === "saving" ? "rgba(255,183,77,0.9)" :
                    saveState === "saved" ? "rgba(76,175,80,0.9)" :
                    saveState === "error" ? "rgba(244,67,54,0.9)" : "rgba(255,255,255,0.2)",
                  color: saveState ? "white" : "rgba(255,255,255,0.8)",
                  fontSize: "14px",
                  fontWeight: "600",
                  backdropFilter: "blur(10px)",
                  border: saveState ? "none" : "1px solid rgba(255,255,255,0.3)",
                  zIndex: 1
                }}>
                  {saveState === "saving" && "⏳ Saving..."}
                  {saveState === "saved" && "✅ Saved"}
                  {saveState === "error" && "❌ Error"}
                  {!saveState && "Click to answer"}
                </div>
              </div>

              {/* Question */}
              <div style={{
                fontSize: "20px",
                lineHeight: 1.7,
                marginBottom: 35,
                padding: 25,
                background: "#f8f9fa",
                borderRadius: "10px",
                borderLeft: `5px solid ${sectionConfig.color}`,
                flex: 1,
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
              }}>
                {currentQuestion?.question_text}
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
                paddingTop: 35,
                borderTop: "2px solid #f0f0f0"
              }}>
                <button 
                  onClick={handleBack} 
                  disabled={currentIndex === 0} 
                  style={{ 
                    padding: "14px 28px", 
                    background: currentIndex === 0 ? "#f5f5f5" : "#1565c0", 
                    color: currentIndex === 0 ? "#999" : "white", 
                    border: "none", 
                    borderRadius: "10px",
                    cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "all 0.3s",
                    opacity: currentIndex === 0 ? 0.6 : 1
                  }}
                >
                  ← Previous Question
                </button>
                
                {isLastQuestion ? (
                  <button 
                    onClick={handleFinish}
                    style={{ 
                      padding: "14px 35px", 
                      background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "17px",
                      fontWeight: "700",
                      transition: "all 0.3s",
                      boxShadow: "0 4px 15px rgba(76,175,80,0.4)"
                    }}
                  >
                    🏁 Finish Assessment
                  </button>
                ) : (
                  <button 
                    onClick={handleNext} 
                    style={{ 
                      padding: "14px 28px", 
                      background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "600",
                      transition: "all 0.3s"
                    }}
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 25 }}>
              
              {/* Question navigation */}
              <QuestionNav
                questions={questions}
                answers={answers}
                current={currentIndex}
                onJump={handleJump}
                totalQuestions={totalQuestions}
              />

              {/* Progress summary */}
              <div style={{ 
                background: "white", 
                padding: 30, 
                borderRadius: "14px", 
                boxShadow: "0 6px 25px rgba(0,0,0,0.12)",
                position: "sticky",
                top: "20px"
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: 25, 
                  color: "#333",
                  fontSize: "20px",
                  fontWeight: "700"
                }}>
                  Assessment Progress
                </h3>
                
                {/* Overall progress */}
                <div style={{ marginBottom: 30 }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginBottom: 12, 
                    fontSize: "15px",
                    fontWeight: "600"
                  }}>
                    <span>Overall Completion</span>
                    <span style={{ color: "#4caf50" }}>
                      {totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ height: 12, background: "#e8e8e8", borderRadius: 6 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0}%`, 
                      background: "linear-gradient(90deg, #4caf50 0%, #81c784 100%)", 
                      borderRadius: 6,
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  <div style={{ 
                    fontSize: "14px", 
                    color: "#666", 
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <span>{totalAnswered} answered</span>
                    <span>{totalQuestions - totalAnswered} remaining</span>
                  </div>
                </div>

                {/* Section progress */}
                <div style={{ marginTop: "25px" }}>
                  <h4 style={{ 
                    marginBottom: 20, 
                    fontSize: "18px", 
                    color: "#555",
                    fontWeight: "600"
                  }}>
                    Section Breakdown
                  </h4>
                  {SECTION_ORDER.map(section => {
                    const progress = getSectionProgress(section);
                    const config = SECTION_CONFIG[section];
                    return (
                      <div key={section} style={{ marginBottom: 16 }}>
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          fontSize: "14px", 
                          marginBottom: 8,
                          alignItems: "center"
                        }}>
                          <span>
                            <span style={{ marginRight: "8px" }}>{config.icon}</span>
                            <span style={{ fontWeight: "500" }}>{section}</span>
                          </span>
                          <span style={{ 
                            fontWeight: "600", 
                            color: progress.percentage >= 80 ? "#4caf50" : 
                                   progress.percentage >= 50 ? "#ff9800" : "#f44336"
                          }}>
                            {progress.answered}/{progress.total} ({progress.percentage}%)
                          </span>
                        </div>
                        <div style={{ height: 8, background: "#e8e8e8", borderRadius: 4 }}>
                          <div style={{ 
                            height: "100%", 
                            width: `${progress.percentage}%`, 
                            background: config.color, 
                            borderRadius: 4 
                          }} />
                        </div>
                        {progress.total < progress.expected && (
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#f57c00", 
                            marginTop: "4px",
                            textAlign: "right"
                          }}>
                            Expected: {progress.expected}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time warning */}
                <div style={{
                  marginTop: "25px",
                  padding: "15px",
                  backgroundColor: timeRemaining < 1800 ? "#ffebee" : "#e8f5e9",
                  borderLeft: `4px solid ${timeRemaining < 1800 ? "#f44336" : "#4caf50"}`,
                  borderRadius: "8px",
                  border: `1px solid ${timeRemaining < 1800 ? "#ffcdd2" : "#c8e6c9"}`
                }}>
                  <div style={{ 
                    fontSize: "14px", 
                    fontWeight: "700", 
                    color: timeRemaining < 1800 ? "#c62828" : "#2e7d32",
                    marginBottom: "6px"
                  }}>
                    {timeRemaining < 1800 ? "⏰ Time Running Out!" : "⏱️ Assessment Timer"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
                    {hours}h {minutes}m {seconds}s remaining
                  </div>
                  <div style={{ 
                    fontSize: "11px", 
                    color: timeRemaining < 1800 ? "#e53935" : "#43a047",
                    fontWeight: "500"
                  }}>
                    {timeRemaining < 1800 
                      ? "Less than 30 minutes remaining - Assessment will auto-submit!" 
                      : "Assessment auto-submits after 3 hours"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div style={{
            marginTop: "25px",
            padding: "18px",
            textAlign: "center",
            fontSize: "13px",
            color: "#666",
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 15px rgba(0,0,0,0.1)",
            borderTop: "3px solid #1565c0"
          }}>
            <p style={{ margin: 0, fontWeight: "500" }}>
              © 2024 Stratavax EvalEx System • {totalQuestions} Questions • 
              All answers are saved automatically • Time remaining: {hours}h {minutes}m {seconds}s
            </p>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
