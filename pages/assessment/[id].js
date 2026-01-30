import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";
import { saveResponse } from "../../supabase/response";

const shuffleArray = (arr) => {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export default function AssessmentPage() {
  const router = useRouter();
  const { id } = router.query;
  const assessmentId = Number(id);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [saveStatus, setSaveStatus] = useState({});
  const [isSessionReady, setIsSessionReady] = useState(false);

  // Fixed: Use online images or solid colors to avoid 404 errors
  const backgrounds = [
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop",
  ];
  // Alternative: Use solid colors
  // const backgrounds = ["#f0f7ff", "#f5f0ff", "#fff0f5"];

  // Get session and ensure it's ready
  useEffect(() => {
    const initializeSession = async () => {
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
        console.error("❌ Session initialization error:", error);
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setIsSessionReady(!!session);
        console.log("🔄 Auth state changed:", event, session?.user?.id);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [router]);

  // Fetch questions
  useEffect(() => {
    if (!assessmentId || !isSessionReady) return;
    
    let active = true;
    
    const fetchQuestions = async () => {
      try {
        console.log("📥 Fetching questions for assessment:", assessmentId);
        
        const { data, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            answers (id, answer_text, score)
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (error) throw error;
        if (!active) return;

        // Load previously saved answers
        const { data: savedResponses } = await supabase
          .from("responses")
          .select("question_id, answer_id")
          .eq("assessment_id", assessmentId)
          .eq("user_id", session.user.id);

        const savedAnswers = {};
        if (savedResponses) {
          savedResponses.forEach(res => {
            savedAnswers[res.question_id] = res.answer_id;
          });
        }

        const formatted = shuffleArray(
          (data || []).map((q) => ({
            ...q,
            options: shuffleArray(q.answers || []),
          }))
        );

        setQuestions(formatted);
        setAnswers(savedAnswers);
        console.log(`✅ Loaded ${formatted.length} questions and ${Object.keys(savedAnswers).length} saved answers`);
      } catch (err) {
        console.error("❌ Error fetching questions:", err);
        alert("Failed to load the assessment. Please refresh the page.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchQuestions();
    
    return () => {
      active = false;
    };
  }, [assessmentId, isSessionReady, session]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // FIXED: Handle answer selection with detailed debugging
  const handleSelect = async (questionId, answerId) => {
    console.group("🎯 handleSelect Debug");
    console.log("Question ID:", questionId);
    console.log("Answer ID:", answerId);
    console.log("Assessment ID:", assessmentId);
    console.log("Session user ID:", session?.user?.id);
    console.log("Is session ready?", isSessionReady);
    
    if (!isSessionReady || !session?.user?.id) {
      console.error("❌ Cannot save: Missing session or user ID");
      alert("Please wait while we verify your session.");
      console.groupEnd();
      return;
    }

    // Update UI immediately for better UX
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
    setSaveStatus((prev) => ({ ...prev, [questionId]: "saving" }));

    try {
      console.log("📤 Calling saveResponse...");
      const result = await saveResponse(
        assessmentId, 
        questionId, 
        answerId, 
        session.user.id
      );
      
      console.log("✅ saveResponse result:", result);
      setSaveStatus((prev) => ({ ...prev, [questionId]: "saved" }));
      
      // Remove success status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);
      
    } catch (err) {
      console.error("❌ Save error in handleSelect:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      setSaveStatus((prev) => ({ ...prev, [questionId]: "error" }));
      
      // Show specific error message
      alert(`Save failed: ${err.message}`);
      
      // Revert UI on error
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
    }
    
    console.groupEnd();
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const handleFinish = async () => {
    if (!session?.user?.id) {
      alert("Please log in to submit your assessment.");
      router.push("/login");
      return;
    }

    if (window.confirm("Are you sure you want to finish? You cannot change answers after submission.")) {
      try {
        const res = await fetch("/api/submit-assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            assessment_id: assessmentId, 
            user_id: session.user.id 
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Submission failed.");

        // Trigger classification
        await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            assessment_id: assessmentId, 
            user_id: session.user.id 
          }),
        });

        alert("✅ Assessment submitted successfully! You will be redirected to the home page.");
        router.push("/");
      } catch (err) {
        console.error("❌ Finish attempt error:", err);
        alert(`Failed to submit assessment: ${err.message}`);
      }
    }
  };

  // Test function to debug save issues
  const TestSaveButton = () => (
    <button
      onClick={async () => {
        console.group("🧪 MANUAL SAVE TEST");
        
        const testData = {
          assessment_id: assessmentId,
          question_id: 1,
          answer_id: 1,
          user_id: session?.user?.id
        };
        
        console.log("Test data:", testData);
        
        try {
          // Test direct Supabase call
          const { data, error } = await supabase
            .from("responses")
            .upsert(
              [{
                ...testData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }],
              { 
                onConflict: 'assessment_id,question_id,user_id',
                ignoreDuplicates: false
              }
            )
            .select();
            
          console.log("Direct test result:", { data, error });
          
          if (error) {
            console.error("❌ Direct test failed:", error);
            alert(`Test failed: ${error.message}`);
          } else {
            console.log("✅ Direct test succeeded:", data);
            alert("✅ Test save successful!");
          }
          
        } catch (err) {
          console.error("❌ Test error:", err);
          alert(`Test error: ${err.message}`);
        }
        
        console.groupEnd();
      }}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        padding: '10px 15px',
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        zIndex: 1000,
        fontSize: '12px'
      }}
    >
      🧪 Test Save
    </button>
  );

  // Loading states
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
        <p>Loading assessment...</p>
        {!isSessionReady && <p>Verifying your session...</p>}
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
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
          Return Home
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const bg = backgrounds[currentIndex % backgrounds.length];
  const saveState = saveStatus[currentQuestion.id];

  return (
    <AppLayout background={bg}>
      <TestSaveButton />
      
      <div style={{ display: "flex", gap: 20, width: "85vw", margin: "auto" }}>
        {/* Main panel */}
        <div
          style={{
            flex: 4,
            background: "rgba(255,255,255,0.94)",
            padding: 30,
            borderRadius: 12,
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <Timer elapsed={elapsed} totalSeconds={10800} />
          
          <div
            style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "10px 15px",
              borderRadius: 8,
              textAlign: "center",
              fontWeight: 700,
              marginBottom: 15,
              fontSize: "18px",
            }}
          >
            {currentQuestion.section || "Assessment"}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <p style={{ fontWeight: 600, fontSize: "16px" }}>
              Question {currentIndex + 1} of {questions.length}
            </p>
            <div style={{ 
              padding: "4px 12px", 
              borderRadius: "12px", 
              backgroundColor: 
                saveState === "saving" ? "#ff9800" :
                saveState === "saved" ? "#4CAF50" :
                saveState === "error" ? "#f44336" : "transparent",
              color: saveState ? "white" : "transparent",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {saveState === "saving" && "Saving..."}
              {saveState === "saved" && "✓ Saved"}
              {saveState === "error" && "✗ Error"}
            </div>
          </div>

          <QuestionCard
            question={currentQuestion}
            selected={answers[currentQuestion.id]}
            onSelect={(answerId) => handleSelect(currentQuestion.id, answerId)}
            disabled={saveState === "saving"}
          />

          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", paddingTop: 20 }}>
            <button 
              onClick={handleBack} 
              disabled={currentIndex === 0}
              style={{
                padding: "12px 24px",
                backgroundColor: currentIndex === 0 ? "#f0f0f0" : "#1565c0",
                color: currentIndex === 0 ? "#666" : "white",
                border: "none",
                borderRadius: "8px",
                cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "500",
                transition: "all 0.2s",
                opacity: currentIndex === 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (currentIndex !== 0) {
                  e.currentTarget.style.backgroundColor = "#0d47a1";
                }
              }}
              onMouseLeave={(e) => {
                if (currentIndex !== 0) {
                  e.currentTarget.style.backgroundColor = "#1565c0";
                }
              }}
            >
              ← Previous
            </button>
            
            {currentIndex === questions.length - 1 ? (
              <button 
                onClick={handleFinish}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#388e3c";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#4CAF50";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                🏁 Finish Assessment
              </button>
            ) : (
              <button 
                onClick={handleNext}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#1565c0",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0d47a1";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#1565c0";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Next Question →
              </button>
            )}
          </div>
        </div>

        {/* Side panel with navigation */}
        <div style={{ flex: 1 }}>
          <QuestionNav
            questions={questions}
            answers={answers}
            current={currentIndex}
            onJump={setCurrentIndex}
          />
          
          {/* Progress summary */}
          <div style={{ 
            marginTop: "20px", 
            padding: "20px", 
            backgroundColor: "rgba(255,255,255,0.95)", 
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h4 style={{ marginTop: 0, marginBottom: "15px" }}>Progress</h4>
            <p style={{ fontSize: "14px", marginBottom: "10px" }}>
              Answered: <strong>{Object.keys(answers).length}</strong> / <strong>{questions.length}</strong> questions
            </p>
            <div style={{ 
              height: "10px", 
              backgroundColor: "#e0e0e0", 
              borderRadius: "5px",
              marginBottom: "10px",
              overflow: "hidden"
            }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${(Object.keys(answers).length / questions.length) * 100}%`, 
                  backgroundColor: "#4CAF50",
                  borderRadius: "5px",
                  transition: "width 0.3s ease"
                }}
              />
            </div>
            
            {/* Time remaining */}
            <div style={{ 
              marginTop: "15px", 
              padding: "10px", 
              backgroundColor: "#e3f2fd", 
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              <div style={{ fontWeight: "600", marginBottom: "5px" }}>Time</div>
              <div>Elapsed: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</div>
              <div>Remaining: {Math.floor((10800 - elapsed) / 60)}:{((10800 - elapsed) % 60).toString().padStart(2, '0')}</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
