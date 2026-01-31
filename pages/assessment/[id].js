import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";

// Assessment Configuration
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

    if (error) return {};
    const responses = {};
    data.forEach(r => responses[r.question_id] = r.answer_id);
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
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  // Use local images
  const backgrounds = [
    "/images/assessment-bg-1.jpg",
    "/images/assessment-bg-2.jpg",
    "/images/assessment-bg-3.jpg",
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
        // First check total count
        const { count: totalCount } = await supabase
          .from("questions")
          .select("*", { count: 'exact', head: true })
          .eq("assessment_id", assessmentId);

        setQuestionCount(totalCount || 0);

        // Fetch all questions with answers
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

        if (questionsError) throw new Error(`Failed to load questions: ${questionsError.message}`);

        if (!questionsData || questionsData.length === 0) {
          throw new Error("No questions found. Please run the database setup script.");
        }

        const savedAnswers = await loadUserResponses(session.user.id);

        // Process questions
        const questionsBySection = {};
        questionsData.forEach(q => {
          if (!questionsBySection[q.section]) {
            questionsBySection[q.section] = [];
          }
          
          const processedAnswers = q.answers.map(a => ({
            ...a,
            id: parseInt(a.id)
          }));
          
          questionsBySection[q.section].push({
            ...q,
            id: parseInt(q.id),
            options: processedAnswers
          });
        });

        // Build ordered questions
        let orderedQuestions = [];
        SECTION_ORDER.forEach(section => {
          const sectionQuestions = questionsBySection[section] || [];
          orderedQuestions = [...orderedQuestions, ...sectionQuestions];
        });

        setQuestions(orderedQuestions);
        setAnswers(savedAnswers);

        console.log(`Loaded ${orderedQuestions.length} questions out of expected ${TOTAL_QUESTIONS}`);

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
    }
  };

  // Handle answer selection
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

  // Navigation - FIXED: Proper navigation functions
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
      const completionRate = Math.round((answeredCount / questions.length) * 100);

      // Update assessment status
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

      if (updateError) console.error("Error updating assessment status:", updateError);

      alert(`✅ Assessment Submitted Successfully!\n\n📊 Results:\n• Questions answered: ${answeredCount}/${questions.length}\n• Completion rate: ${completionRate}%`);
      
      router.push("/results");
      
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please try again.");
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
        padding: "40px", 
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white"
      }}>
        <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
          Stratavax Capability Assessment
        </div>
        <div style={{ fontSize: "18px", marginBottom: "30px", opacity: 0.9 }}>
          Loading {TOTAL_QUESTIONS} questions...
        </div>
        <div style={{ width: "300px", height: "8px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "4px" }}>
          <div style={{ 
            width: "70%", 
            height: "100%", 
            backgroundColor: "white",
            borderRadius: "4px",
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
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white"
      }}>
        <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          🏢 Stratavax
        </div>
        <div style={{ fontSize: "24px", marginBottom: "20px" }}>
          Assessment Not Ready
        </div>
        <div style={{ fontSize: "16px", marginBottom: "30px", maxWidth: "500px", lineHeight: 1.6 }}>
          The assessment needs to be configured with {TOTAL_QUESTIONS} questions. 
          Currently, only {questionCount} questions are in the database.
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
            fontWeight: "600",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
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
  const backgroundImage = backgrounds[currentIndex % backgrounds.length];

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
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
          }}>
            <h2 style={{ marginTop: 0, color: "#1565c0", fontSize: "24px" }}>
              Submit Assessment?
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
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
                <span>Total Questions:</span>
                <span style={{ fontWeight: "700" }}>
                  {questions.length}
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
                  {totalAnswered}/{questions.length}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "20px",
                fontSize: "16px"
              }}>
                <span>Completion Rate:</span>
                <span style={{ fontWeight: "700", color: "#2196f3" }}>
                  {Math.round((totalAnswered / questions.length) * 100)}%
                </span>
              </div>
              
              <div style={{ height: "10px", background: "#e0e0e0", borderRadius: "5px", margin: "20px 0" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${(totalAnswered / questions.length) * 100}%`, 
                  background: "#4caf50", 
                  borderRadius: "5px"
                }} />
              </div>
            </div>

            <p style={{ 
              marginBottom: "30px", 
              fontSize: "16px",
              lineHeight: "1.6"
            }}>
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
                  fontWeight: "600",
                  fontSize: "14px"
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
                  fontWeight: "700",
                  fontSize: "15px"
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div style={{
        minHeight: "100vh",
        background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}>
        <div style={{ maxWidth: "1400px", margin: "auto", padding: "20px" }}>
          
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            padding: "20px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
          }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: "26px", 
                fontWeight: "700", 
                color: "#1565c0",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span>🏢</span>
                Stratavax Capability Assessment
              </h1>
              <div style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>
                <div>{questions.length} Questions • Comprehensive Evaluation</div>
                {questionCount < TOTAL_QUESTIONS && (
                  <div style={{ marginTop: "5px", fontSize: "12px", color: "#f57c00" }}>
                    ⚠️ Database has {questionCount} questions (Expected: {TOTAL_QUESTIONS})
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{
                padding: "8px 16px",
                backgroundColor: "#e3f2fd",
                borderRadius: "20px",
                fontWeight: "600",
                color: "#1565c0",
                fontSize: "14px",
                border: "2px solid #bbdefb"
              }}>
                ⏱️ {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Main content - FIXED: No overflow:hidden on main container */}
          <div style={{ display: "flex", gap: "20px", minHeight: "600px" }}>
            
            {/* Question panel */}
            <div style={{ 
              flex: 3, 
              background: "rgba(255, 255, 255, 0.95)", 
              padding: "25px", 
              borderRadius: "12px", 
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column"
            }}>
              
              {/* Section header */}
              <div style={{
                background: sectionConfig.color,
                color: "white",
                padding: "15px 20px",
                borderRadius: "8px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <span style={{ fontSize: "24px" }}>{sectionConfig.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>{currentSection}</div>
                  <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "4px" }}>
                    Question {currentIndex + 1} of {questions.length} • {sectionConfig.description}
                  </div>
                </div>
                
                {/* Save status */}
                <div style={{
                  padding: "6px 12px",
                  borderRadius: "15px",
                  backgroundColor: 
                    saveState === "saving" ? "#ffb74d" :
                    saveState === "saved" ? "#4caf50" :
                    saveState === "error" ? "#f44336" : "rgba(255,255,255,0.2)",
                  color: saveState ? "white" : "rgba(255,255,255,0.8)",
                  fontSize: "13px",
                  fontWeight: "600",
                  minWidth: "80px",
                  textAlign: "center"
                }}>
                  {saveState === "saving" && "⏳ Saving"}
                  {saveState === "saved" && "✅ Saved"}
                  {saveState === "error" && "❌ Error"}
                </div>
              </div>

              {/* Question */}
              <div style={{
                fontSize: "18px",
                lineHeight: 1.6,
                marginBottom: "20px",
                padding: "20px",
                background: "#f8f9fa",
                borderRadius: "8px",
                borderLeft: `4px solid ${sectionConfig.color}`,
                minHeight: "80px"
              }}>
                {currentQuestion?.question_text}
              </div>

              {/* Answers - Fixed Height Container */}
              <div style={{ 
                flex: 1,
                minHeight: "300px",
                marginBottom: "20px"
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

              {/* Navigation - FIXED: Always visible */}
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between",
                paddingTop: "20px",
                borderTop: "1px solid #eee"
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
                    fontWeight: "600"
                  }}
                >
                  ← Previous Question
                </button>
                
                {isLastQuestion ? (
                  <button 
                    onClick={handleFinish}
                    style={{ 
                      padding: "12px 30px", 
                      background: "#4caf50", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "700"
                    }}
                  >
                    🏁 Finish Assessment
                  </button>
                ) : (
                  <button 
                    onClick={handleNext} 
                    style={{ 
                      padding: "12px 24px", 
                      background: "#1565c0", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "600"
                    }}
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ 
              flex: 1, 
              display: "flex", 
              flexDirection: "column", 
              gap: "20px"
            }}>
              
              {/* Question navigation - FIXED: Make sure QuestionNav renders */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.95)", 
                padding: "20px", 
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "15px", 
                  color: "#333",
                  fontSize: "16px",
                  fontWeight: "700"
                }}>
                  Question Navigator
                </h3>
                <QuestionNav
                  questions={questions}
                  answers={answers}
                  current={currentIndex}
                  onJump={handleJump}
                />
              </div>

              {/* Progress summary */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.95)", 
                padding: "20px", 
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "20px", 
                  color: "#333",
                  fontSize: "18px",
                  fontWeight: "700"
                }}>
                  Progress Overview
                </h3>
                
                {/* Overall progress */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginBottom: "10px", 
                    fontSize: "14px"
                  }}>
                    <span>Overall Completion</span>
                    <span style={{ fontWeight: "600", color: "#4caf50" }}>
                      {Math.round((totalAnswered / questions.length) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: "10px", background: "#e8e8e8", borderRadius: "5px" }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${(totalAnswered / questions.length) * 100}%`, 
                      background: "#4caf50", 
                      borderRadius: "5px"
                    }} />
                  </div>
                  <div style={{ 
                    fontSize: "13px", 
                    color: "#666", 
                    marginTop: "8px",
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <span>{totalAnswered} answered</span>
                    <span>{questions.length - totalAnswered} remaining</span>
                  </div>
                </div>

                {/* Section progress */}
                <div>
                  <h4 style={{ 
                    marginBottom: "15px", 
                    fontSize: "16px", 
                    color: "#555",
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
                          <span>
                            <span style={{ marginRight: "6px" }}>{config.icon}</span>
                            {section.split(' ')[0]}
                          </span>
                          <span style={{ fontWeight: "600" }}>
                            {progress.answered}/{progress.total}
                          </span>
                        </div>
                        <div style={{ height: "6px", background: "#e8e8e8", borderRadius: "3px" }}>
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
            </div>
          </div>
          
          {/* Footer */}
          <div style={{
            marginTop: "20px",
            padding: "15px",
            textAlign: "center",
            fontSize: "12px",
            color: "#fff",
            background: "rgba(0, 0, 0, 0.5)",
            borderRadius: "8px",
            backdropFilter: "blur(10px)"
          }}>
            <p style={{ margin: 0, fontWeight: "500" }}>
              © 2024 Stratavax • {questions.length}-Question Capability Assessment • 
              Time remaining: {hours}h {minutes}m {seconds}s
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
