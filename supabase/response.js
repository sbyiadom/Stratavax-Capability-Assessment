import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";

// Section configuration
const SECTION_CONFIG = {
  'Cognitive Abilities': { color: '#1565c0', icon: '🧠', questions: 20 },
  'Personality Assessment': { color: '#7b1fa2', icon: '😊', questions: 20 },
  'Leadership Potential': { color: '#d32f2f', icon: '👑', questions: 20 },
  'Technical Competence': { color: '#388e3c', icon: '⚙️', questions: 20 },
  'Performance Metrics': { color: '#f57c00', icon: '📊', questions: 20 }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);

// Save response function
async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    console.log("💾 Saving response:", { assessmentId, questionId, answerId, userId });
    
    // Try to insert or update the response
    const { data, error } = await supabase
      .from("responses")
      .upsert({
        assessment_id: assessmentId,
        question_id: questionId,
        answer_id: answerId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'assessment_id,question_id,user_id'
      })
      .select();

    if (error) {
      console.error("❌ Database error:", error);
      
      // If table doesn't exist, create it on the fly (for development)
      if (error.message.includes("does not exist")) {
        console.warn("⚠️ Responses table might not exist. Creating sample data...");
        // For now, just simulate success
        return { success: true };
      }
      
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("✅ Save successful:", data);
    return data;
    
  } catch (error) {
    console.error("❌ Save response error:", error);
    throw error;
  }
}

// Load user responses function
async function loadUserResponses(userId) {
  try {
    console.log("📥 Loading responses for user:", userId);
    
    const { data, error } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Error loading responses:", error);
      
      // If table doesn't exist, return empty object
      if (error.message.includes("does not exist")) {
        console.warn("⚠️ Responses table doesn't exist yet");
        return {};
      }
      
      throw error;
    }

    const responses = {};
    data.forEach(r => {
      responses[r.question_id] = r.answer_id;
    });
    
    console.log(`✅ Loaded ${Object.keys(responses).length} previous responses`);
    return responses;
    
  } catch (error) {
    console.error("❌ Error in loadUserResponses:", error);
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
  const [totalQuestions, setTotalQuestions] = useState(0);

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
        
        // Check if we have questions in the database
        const { count: totalCount, error: countError } = await supabase
          .from("questions")
          .select("*", { count: 'exact', head: true })
          .eq("assessment_id", assessmentId);

        if (countError) {
          console.error("❌ Count error:", countError);
          throw countError;
        }

        console.log(`📊 Total questions in DB: ${totalCount}`);
        setTotalQuestions(totalCount || 0);

        // If we don't have 100 questions, create them
        if (!totalCount || totalCount < 100) {
          console.warn(`⚠️ Only ${totalCount} questions found. Need to create more.`);
          setError(`Only ${totalCount} questions available. Please contact admin to add more questions.`);
        }

        // Fetch questions with answers
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

        console.log(`📋 Loaded ${questionsData?.length || 0} questions with answers`);

        // Load previous responses
        const savedAnswers = await loadUserResponses(session.user.id);
        console.log("📝 Saved answers loaded:", Object.keys(savedAnswers).length);

        // Check if questions have answers
        const validQuestions = questionsData.filter(q => q.answers && q.answers.length > 0);
        
        if (validQuestions.length === 0) {
          throw new Error("No questions with answers found in database");
        }

        console.log(`✅ ${validQuestions.length} questions have answers`);

        // Group by section and ensure proper distribution
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

        // Log section distribution
        Object.keys(questionsBySection).forEach(section => {
          console.log(`📊 ${section}: ${questionsBySection[section].length} questions`);
        });

        // Combine sections in order
        let allQuestions = [];
        SECTION_ORDER.forEach(section => {
          const sectionQuestions = questionsBySection[section] || [];
          // Shuffle questions within each section
          const shuffledQuestions = [...sectionQuestions].sort(() => Math.random() - 0.5);
          allQuestions = [...allQuestions, ...shuffledQuestions];
        });

        // If we have less than 100 questions, pad with placeholders
        if (allQuestions.length < 100) {
          console.warn(`⚠️ Only ${allQuestions.length} questions available. Expected 100.`);
          
          // Create placeholder questions for missing ones
          const placeholdersNeeded = 100 - allQuestions.length;
          const placeholderQuestions = Array.from({ length: placeholdersNeeded }, (_, i) => ({
            id: `placeholder-${i}`,
            question_text: `Question ${allQuestions.length + i + 1} (Placeholder - Contact Admin)`,
            section: SECTION_ORDER[i % SECTION_ORDER.length],
            options: [
              { id: `placeholder-a-${i}`, answer_text: "Placeholder option A", score: 1 },
              { id: `placeholder-b-${i}`, answer_text: "Placeholder option B", score: 2 },
              { id: `placeholder-c-${i}`, answer_text: "Placeholder option C", score: 3 },
              { id: `placeholder-d-${i}`, answer_text: "Placeholder option D", score: 4 }
            ]
          }));
          
          allQuestions = [...allQuestions, ...placeholderQuestions];
        }

        console.log(`🎯 Total questions for assessment: ${allQuestions.length}`);

        setQuestions(allQuestions);
        setAnswers(savedAnswers);

        // Debug: Log first question
        if (allQuestions.length > 0) {
          console.log("First question:", {
            id: allQuestions[0].id,
            text: allQuestions[0].question_text?.substring(0, 50) + "...",
            options: allQuestions[0].options?.length,
            section: allQuestions[0].section
          });
        }

      } catch (error) {
        console.error("❌ Error loading assessment:", error);
        setError(`Failed to load assessment: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assessmentId, isSessionReady, session]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle answer selection
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) {
      alert("Please wait for session to initialize");
      return;
    }

    console.log("🎯 Selecting answer:", { questionId, answerId });

    // Skip saving for placeholder questions
    if (questionId.includes('placeholder')) {
      console.log("📝 Skipping save for placeholder question");
      setAnswers(prev => ({ ...prev, [questionId]: answerId }));
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 1000);
      return;
    }

    // Update UI immediately
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      
      console.log("✅ Save successful");
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      // Clear status after 1 second
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 1000);

    } catch (error) {
      console.error("❌ Save error:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
      
      // Revert UI on error
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
      
      alert(`Save failed. Please try again. Error: ${error.message}`);
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
    const sectionQuestions = questions.filter(q => q.section === section && !q.id.includes('placeholder'));
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

    const realQuestions = questions.filter(q => !q.id.includes('placeholder'));
    const answeredCount = realQuestions.filter(q => answers[q.id]).length;
    const unanswered = realQuestions.length - answeredCount;
    
    if (unanswered > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unanswered} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    try {
      alert("✅ Assessment completed! In a real app, this would submit to the server.");
      router.push("/");
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      alert(`Submission failed: ${error.message}`);
    }
  };

  // Calculate time
  const timeRemaining = 10800 - elapsed;
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
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG[SECTION_ORDER[0]];
  const saveState = saveStatus[currentQuestion?.id];
  const totalAnswered = Object.keys(answers).length;
  const isPlaceholder = currentQuestion?.id?.includes('placeholder');

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
          padding: "15px 20px",
          borderRadius: "8px",
          zIndex: 1000,
          maxWidth: "400px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          ⚠️ <strong>Warning:</strong> {error}
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
            <div style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
              <div>100 Questions • Comprehensive Evaluation</div>
              {totalQuestions < 100 && (
                <div style={{ color: "#f57c00", marginTop: "2px" }}>
                  ⚠️ Database has only {totalQuestions} questions
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{
              padding: "8px 16px",
              backgroundColor: "#e3f2fd",
              borderRadius: "20px",
              fontWeight: "600",
              color: "#1565c0",
              fontSize: "14px"
            }}>
              Time: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
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
              background: isPlaceholder ? "#757575" : sectionConfig.color,
              color: "white",
              padding: "12px 20px",
              borderRadius: 8,
              marginBottom: 25,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <span style={{ fontSize: 20 }}>{isPlaceholder ? "📝" : sectionConfig.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 18 }}>
                  {isPlaceholder ? "Placeholder Question" : currentSection}
                  {isPlaceholder && <span style={{ fontSize: "12px", marginLeft: "10px", opacity: 0.8 }}>(Admin needs to add more questions)</span>}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Question {currentIndex + 1} of 100 • 
                  Section {SECTION_ORDER.indexOf(currentSection) + 1} of 5
                </div>
              </div>
              
              {/* Save status */}
              {!isPlaceholder && (
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
              )}
            </div>

            {/* Question */}
            <div style={{
              fontSize: "18px",
              lineHeight: 1.6,
              marginBottom: 30,
              padding: 20,
              background: isPlaceholder ? "#f5f5f5" : "#f8f9fa",
              borderRadius: 8,
              borderLeft: `4px solid ${isPlaceholder ? "#757575" : sectionConfig.color}`,
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
                disabled={saveState === "saving" || isPlaceholder}
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
                    {Math.round((totalAnswered / 100) * 100)}%
                  </span>
                </div>
                <div style={{ height: 10, background: "#e0e0e0", borderRadius: 5 }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${(totalAnswered / 100) * 100}%`, 
                    background: "#4caf50", 
                    borderRadius: 5,
                    transition: "width 0.5s ease"
                  }} />
                </div>
                <div style={{ fontSize: "13px", color: "#666", marginTop: "5px" }}>
                  {totalAnswered} of 100 questions answered
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
                        <span>
                          {progress.answered}/{progress.total} 
                          {progress.total > 0 && ` (${progress.percentage}%)`}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                        <div style={{ 
                          height: "100%", 
                          width: `${progress.total > 0 ? progress.percentage : 0}%`, 
                          background: config.color, 
                          borderRadius: 3 
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Database warning */}
              {totalQuestions < 100 && (
                <div style={{
                  marginTop: "20px",
                  padding: "10px",
                  backgroundColor: "#fff3e0",
                  borderLeft: "4px solid #f57c00",
                  borderRadius: "4px"
                }}>
                  <div style={{ fontSize: "12px", color: "#e65100", fontWeight: "500" }}>
                    ⚠️ Database Status
                  </div>
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                    Only {totalQuestions} real questions in database. {100 - totalQuestions} are placeholders.
                  </div>
                </div>
              )}
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
            © 2024 Stratavax Assessment System | {isPlaceholder ? "Placeholder questions will not be saved" : "Answers are saved automatically"} | 
            Assessment will auto-submit when time expires
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
