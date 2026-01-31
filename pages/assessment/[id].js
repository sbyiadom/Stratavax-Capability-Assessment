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

// Save response function with INTEGER IDs
async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    console.log("💾 Saving response:", { 
      assessmentId, 
      questionId: parseInt(questionId), 
      answerId: parseInt(answerId), 
      userId 
    });
    
    // Parse IDs to integers since your database uses INTEGER
    const parsedQuestionId = parseInt(questionId);
    const parsedAnswerId = parseInt(answerId);
    
    if (isNaN(parsedQuestionId) || isNaN(parsedAnswerId)) {
      throw new Error("Invalid question or answer ID");
    }

    // Try to insert or update the response
    const { data, error } = await supabase
      .from("responses")
      .upsert({
        assessment_id: assessmentId,
        question_id: parsedQuestionId,
        answer_id: parsedAnswerId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'assessment_id,question_id,user_id'
      })
      .select();

    if (error) {
      console.error("❌ Database error:", error);
      throw new Error(`Failed to save: ${error.message}`);
    }

    console.log("✅ Save successful:", data);
    return data;
    
  } catch (error) {
    console.error("❌ Save response error:", error);
    throw error;
  }
}

// Load user responses function with INTEGER IDs
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
      // Ensure integer IDs for consistency
      responses[parseInt(r.question_id)] = parseInt(r.answer_id);
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
  const [databaseStatus, setDatabaseStatus] = useState("");

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

  // Check database structure
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        // Check responses table structure
        const { error: tableError } = await supabase
          .from('responses')
          .select('id')
          .limit(1);
          
        if (tableError && tableError.message.includes("does not exist")) {
          setDatabaseStatus("responses table missing");
        } else {
          setDatabaseStatus("responses table exists");
        }
      } catch (err) {
        console.log("Database check:", err.message);
      }
    };
    
    if (isSessionReady) {
      checkDatabase();
    }
  }, [isSessionReady]);

  // Fetch questions
  useEffect(() => {
    if (!isSessionReady || !session?.user?.id) return;

    const fetchData = async () => {
      try {
        console.log("📥 Fetching assessment data...");
        
        // First, check total questions count
        const { count: totalCount, error: countError } = await supabase
          .from("questions")
          .select("*", { count: 'exact', head: true })
          .eq("assessment_id", assessmentId);

        if (countError) {
          console.error("❌ Count error:", countError);
          throw countError;
        }

        const actualCount = totalCount || 0;
        console.log(`📊 Total questions in DB: ${actualCount}`);
        setTotalQuestions(actualCount);

        if (actualCount === 0) {
          throw new Error("No questions found in database. Please add questions first.");
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

        // Check if any questions have answers
        const questionsWithAnswers = questionsData.filter(q => 
          q.answers && Array.isArray(q.answers) && q.answers.length > 0
        );
        
        console.log(`✅ ${questionsWithAnswers.length} questions have answers`);

        if (questionsWithAnswers.length === 0) {
          throw new Error("No questions with answers found. Please add answers to questions.");
        }

        // Log question structure
        console.log("Sample question structure:", {
          id: questionsWithAnswers[0].id,
          type: typeof questionsWithAnswers[0].id,
          answers: questionsWithAnswers[0].answers.map(a => ({
            id: a.id,
            type: typeof a.id,
            text: a.answer_text?.substring(0, 20)
          }))
        });

        // Load previous responses
        const savedAnswers = await loadUserResponses(session.user.id);
        console.log("📝 Saved answers loaded:", Object.keys(savedAnswers).length);

        // Group by section
        const questionsBySection = {};
        questionsWithAnswers.forEach(q => {
          if (!questionsBySection[q.section]) {
            questionsBySection[q.section] = [];
          }
          
          // Ensure answer IDs are integers
          const processedAnswers = q.answers.map(answer => ({
            ...answer,
            id: parseInt(answer.id) || answer.id
          }));
          
          // Shuffle answers
          const shuffledAnswers = [...processedAnswers].sort(() => Math.random() - 0.5);
          
          questionsBySection[q.section].push({
            ...q,
            id: parseInt(q.id) || q.id, // Ensure integer ID
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
          if (sectionQuestions.length > 0) {
            // Shuffle questions within each section
            const shuffledQuestions = [...sectionQuestions].sort(() => Math.random() - 0.5);
            allQuestions = [...allQuestions, ...shuffledQuestions];
          }
        });

        console.log(`🎯 Total real questions: ${allQuestions.length}`);

        // If we have less than 100 questions, create placeholders
        if (allQuestions.length < 100) {
          const placeholdersNeeded = 100 - allQuestions.length;
          console.log(`⚠️ Creating ${placeholdersNeeded} placeholder questions`);
          
          const placeholderQuestions = Array.from({ length: placeholdersNeeded }, (_, i) => ({
            id: `placeholder-${i + 1000}`, // Use string ID for placeholders
            question_text: `Question ${allQuestions.length + i + 1} (Placeholder)`,
            section: SECTION_ORDER[i % SECTION_ORDER.length],
            options: [
              { id: `${i + 1000}-1`, answer_text: "Option A (Placeholder)", score: 1 },
              { id: `${i + 1000}-2`, answer_text: "Option B (Placeholder)", score: 2 },
              { id: `${i + 1000}-3`, answer_text: "Option C (Placeholder)", score: 3 },
              { id: `${i + 1000}-4`, answer_text: "Option D (Placeholder)", score: 4 }
            ]
          }));
          
          allQuestions = [...allQuestions, ...placeholderQuestions];
        }

        console.log(`📚 Final question count: ${allQuestions.length}`);

        setQuestions(allQuestions);
        setAnswers(savedAnswers);

      } catch (error) {
        console.error("❌ Error loading assessment:", error);
        setError(error.message);
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

    console.log("🎯 Selecting answer:", { 
      questionId, 
      answerId,
      questionIdType: typeof questionId,
      answerIdType: typeof answerId
    });

    // Skip saving for placeholder questions (they have string IDs)
    if (typeof questionId === 'string' && questionId.includes('placeholder')) {
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
      
      // Show error but don't revert (let user retry)
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
    const sectionQuestions = questions.filter(q => 
      q.section === section && 
      typeof q.id === 'number' && // Only count real questions (with number IDs)
      !isNaN(q.id)
    );
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

    const realQuestions = questions.filter(q => typeof q.id === 'number' && !isNaN(q.id));
    const answeredCount = realQuestions.filter(q => answers[q.id]).length;
    const unanswered = realQuestions.length - answeredCount;
    
    let confirmMessage = "Are you sure you want to submit your assessment?";
    if (unanswered > 0) {
      confirmMessage = `You have ${unanswered} unanswered questions. ${confirmMessage}`;
    }
    
    const confirmSubmit = window.confirm(confirmMessage);
    if (!confirmSubmit) return;

    try {
      // Show success message
      alert("🎉 Assessment submitted successfully! Your responses have been saved.");
      
      // Redirect to home
      router.push("/");
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      alert(`Submission failed: ${error.message}`);
    }
  };

  // Calculate time
  const timeRemaining = Math.max(0, 10800 - elapsed);
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
        {databaseStatus && (
          <div style={{ marginTop: "20px", color: "#666", fontSize: "14px" }}>
            {databaseStatus}
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG[SECTION_ORDER[0]];
  const saveState = saveStatus[currentQuestion?.id];
  const totalAnswered = Object.keys(answers).length;
  const isPlaceholder = currentQuestion?.id?.includes?.('placeholder') || typeof currentQuestion?.id === 'string';

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
                  ⚠️ Database has only {totalQuestions} real questions ({100 - totalQuestions} placeholders)
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
                  {isPlaceholder && (
                    <span style={{ fontSize: "12px", marginLeft: "10px", opacity: 0.8 }}>
                      (Admin needs to add more questions)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Question {currentIndex + 1} of 100 • 
                  Section {SECTION_ORDER.indexOf(currentSection) + 1} of 5
                  {isPlaceholder && " • Placeholder"}
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
                    Only {totalQuestions} real questions in database
                  </div>
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                    Placeholder questions won't be saved
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
            © 2024 Stratavax Assessment System | 
            {isPlaceholder ? " Placeholder questions will not be saved" : " Answers are saved automatically"} | 
            Time remaining: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
