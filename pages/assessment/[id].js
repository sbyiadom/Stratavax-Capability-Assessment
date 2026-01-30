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

// Convert assessment ID to UUID format
const toAssessmentUUID = (id) => {
  const num = Number(id);
  if (isNaN(num) || num <= 0) {
    return '00000000-0000-0000-0000-000000000001';
  }
  return `00000000-0000-0000-0000-${num.toString().padStart(12, '0')}`;
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
  const [errorMessage, setErrorMessage] = useState("");

  // Fixed backgrounds - using Unsplash to avoid 404 errors
  const backgrounds = [
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop&q=80",
  ];

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
        setErrorMessage("Failed to initialize session");
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state changed:", event, session?.user?.id);
        setSession(session);
        setIsSessionReady(!!session);
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
        console.log("📥 Fetching questions...");
        
        // Get all questions (no assessment_id filter since column doesn't exist)
        const { data, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            answers (id, answer_text, score)
          `)
          .order("id");

        if (error) {
          console.error("❌ Questions query error:", error);
          throw error;
        }
        
        if (!active) return;

        console.log(`📋 Found ${data?.length || 0} questions`);

        // Load previously saved answers
        const assessmentUUID = toAssessmentUUID(assessmentId);
        console.log("🔍 Loading saved responses for assessment UUID:", assessmentUUID);
        
        const { data: savedResponses, error: savedError } = await supabase
          .from("responses")
          .select("question_id, answer_id")
          .eq("assessment_id", assessmentUUID)
          .eq("user_id", session.user.id);

        if (savedError) {
          console.error("❌ Error loading saved responses:", savedError);
          // Continue without saved responses
        }

        const savedAnswers = {};
        if (savedResponses && savedResponses.length > 0) {
          savedResponses.forEach(res => {
            savedAnswers[res.question_id] = res.answer_id;
          });
          console.log(`📝 Loaded ${Object.keys(savedAnswers).length} saved answers`);
        } else {
          console.log("📝 No previously saved answers found");
        }

        // Shuffle questions and answers
        const formatted = shuffleArray(
          (data || []).map((q) => ({
            ...q,
            options: shuffleArray(q.answers || []),
          }))
        );

        setQuestions(formatted);
        setAnswers(savedAnswers);
        
      } catch (err) {
        console.error("❌ Error in fetchQuestions:", {
          message: err.message,
          code: err.code,
          details: err.details
        });
        setErrorMessage("Failed to load questions. Please refresh the page.");
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

  // Handle answer selection
  const handleSelect = async (questionId, answerId) => {
    console.group("🎯 handleSelect");
    console.log("Question ID:", questionId);
    console.log("Answer ID:", answerId);
    console.log("Assessment ID:", assessmentId);
    console.log("Session user ID:", session?.user?.id);
    
    if (!isSessionReady || !session?.user?.id) {
      console.error("❌ Cannot save: Session not ready");
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
      setErrorMessage(""); // Clear any previous errors
      
      // Remove success status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);
      
    } catch (err) {
      console.error("❌ Save error:", err);
      console.error("Error details:", err.message);
      
      setSaveStatus((prev) => ({ ...prev, [questionId]: "error" }));
      setErrorMessage(err.message || "Failed to save answer");
      
      // Revert UI on error
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
      
      // Show error message
      alert(`Save failed: ${err.message}`);
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

  // Debug function
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
          const assessmentUUID = toAssessmentUUID(assessmentId);
          console.log("Assessment UUID:", assessmentUUID);
          
          const { data, error } = await supabase
            .from("responses")
            .insert({
              assessment_id: assessmentUUID,
              question_id: 1,
              answer_id: 1,
              user_id: session?.user?.id,
              created_at: new Date().toISOString(),
            })
            .select();
            
          console.log("Test result:", { data, error });
          
          if (error) {
            alert(`❌ Test failed: ${error.message}`);
          } else {
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
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h3>No Questions Found</h3>
        <p>Please check if your database has questions.</p>
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
      
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#f44336',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}
      
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
                opacity: currentIndex === 0 ? 0.6 : 1
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
                }}
              >
                Next Question →
              </button>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ flex: 1 }}>
          <QuestionNav
            questions={questions}
            answers={answers}
            current={currentIndex}
            onJump={setCurrentIndex}
          />
          
          <div style={{ 
            marginTop: "20px", 
            padding: "20px", 
            backgroundColor: "rgba(255,255,255,0.95)", 
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h4 style={{ marginTop: 0, marginBottom: "15px" }}>Progress</h4>
            <p style={{ fontSize: "14px", marginBottom: "10px" }}>
              Answered: <strong>{Object.keys(answers).length}</strong> / <strong>{questions.length}</strong>
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
            
            <div style={{ 
              marginTop: "15px", 
              padding: "10px", 
              backgroundColor: "#e3f2fd", 
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              <div style={{ fontWeight: "600", marginBottom: "5px" }}>Time Remaining</div>
              <div>{Math.floor((10800 - elapsed) / 60)}:{((10800 - elapsed) % 60).toString().padStart(2, '0')}</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
