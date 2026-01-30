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

  const backgrounds = [
    "/images/assessment-bg1.jpg",
    "/images/assessment-bg2.jpg",
    "/images/assessment-bg3.jpg",
  ];

  // Get session and ensure it's ready
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setIsSessionReady(true);
          console.log("Session initialized:", data.session.user.id);
        } else {
          console.warn("No session found");
          router.push("/login");
        }
      } catch (error) {
        console.error("Session initialization error:", error);
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setIsSessionReady(!!session);
        console.log("Auth state changed:", event, session?.user?.id);
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
        console.log("Fetching questions for assessment:", assessmentId);
        
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
      } catch (err) {
        console.error("Error fetching questions:", err);
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

  // Handle answer selection with improved error handling
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) {
      console.error("Cannot save: Session not ready or user not logged in");
      alert("Please wait while we verify your session, or log in again.");
      return;
    }

    // Update local state immediately for better UX
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
    setSaveStatus((prev) => ({ ...prev, [questionId]: "saving" }));

    try {
      console.log("Saving answer:", { assessmentId, questionId, answerId, userId: session.user.id });
      
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      
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
      console.error("Failed to save answer:", err);
      setSaveStatus((prev) => ({ ...prev, [questionId]: "error" }));
      
      // Revert local state on error
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
      
      alert(`Save failed: ${err.message}`);
    }
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

        alert("Assessment submitted successfully! You will be redirected to the home page.");
        router.push("/");
      } catch (err) {
        console.error("Finish attempt error:", err);
        alert(`Failed to submit assessment: ${err.message}`);
      }
    }
  };

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
        <button onClick={() => router.push("/")}>Return Home</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const bg = backgrounds[currentIndex % backgrounds.length];
  const saveState = saveStatus[currentQuestion.id];

  return (
    <AppLayout background={bg}>
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
            }}
          >
            {currentQuestion.section || "Assessment"}
          </div>

          <p style={{ fontWeight: 600 }}>
            Question {currentIndex + 1} of {questions.length}
            {saveState === "saving" && " (Saving...)"}
            {saveState === "saved" && " ✓ Saved"}
            {saveState === "error" && " ✗ Error"}
          </p>

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
                padding: "10px 20px",
                backgroundColor: currentIndex === 0 ? "#f0f0f0" : "#1565c0",
                color: currentIndex === 0 ? "#666" : "white",
                border: "none",
                borderRadius: "5px",
                cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            
            {currentIndex === questions.length - 1 ? (
              <button 
                onClick={handleFinish}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Finish Assessment
              </button>
            ) : (
              <button 
                onClick={handleNext}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#1565c0",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Next Question
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
            padding: "15px", 
            backgroundColor: "rgba(255,255,255,0.9)", 
            borderRadius: "8px" 
          }}>
            <h4>Progress</h4>
            <p>
              Answered: {Object.keys(answers).length} / {questions.length}
            </p>
            <div style={{ 
              height: "10px", 
              backgroundColor: "#e0e0e0", 
              borderRadius: "5px",
              marginTop: "5px"
            }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${(Object.keys(answers).length / questions.length) * 100}%`, 
                  backgroundColor: "#4CAF50",
                  borderRadius: "5px"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
