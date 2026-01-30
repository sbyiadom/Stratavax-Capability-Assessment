import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import { supabase } from "../../supabase/client";
import { saveResponse } from "../../supabase/response";

/* ================= SHUFFLE HELPER ================= */
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/* ================= ASSESSMENT PAGE ================= */
export default function AssessmentPage() {
  const router = useRouter();
  const { id } = router.query;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const backgrounds = [
    "/images/assessment-bg1.jpg",
    "/images/assessment-bg2.jpg",
    "/images/assessment-bg3.jpg",
  ];

  /* ================= FETCH QUESTIONS ================= */
  useEffect(() => {
    if (!id) return;

    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            answers (id, answer_text)
          `)
          .order("id");

        if (error) throw error;

        const formatted = shuffleArray(
          (data || []).map((q) => ({
            id: q.id,
            question_text: q.question_text,
            section: q.section,
            options: shuffleArray(q.answers || []),
          }))
        );

        setQuestions(formatted);
      } catch (err) {
        console.error("Question load error:", err);
        alert("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [id]);

  /* ================= TIMER ================= */
  useEffect(() => {
    const interval = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  /* ================= ANSWER SELECTION ================= */
  const handleSelect = async (questionId, answerId) => {
    // ✅ Optimistic UI update
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));

    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;

      // ⚠️ Do NOT alert — session can briefly be null
      if (!session) {
        console.warn("Session not ready yet, answer not saved");
        return;
      }

      await saveResponse(
        id,
        questionId,
        answerId,
        session.user.id
      );
    } catch (err) {
      // ❌ Do NOT alert — this causes false negatives
      console.error("Unexpected save error:", err);
    }
  };

  /* ================= NAVIGATION ================= */
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  /* ================= FINISH ATTEMPT ================= */
  const handleFinish = async () => {
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;

      if (!session) {
        alert("You must be logged in to submit.");
        return;
      }

      const submitRes = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment_id: id }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok) {
        alert(submitData.error || "Submission failed");
        return;
      }

      alert("Assessment submitted successfully!");
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Failed to submit assessment.");
    }
  };

  /* ================= UI STATES ================= */
  if (loading) {
    return <p style={{ textAlign: "center" }}>Loading assessment…</p>;
  }

  if (!questions.length) {
    return <p style={{ textAlign: "center" }}>No questions found.</p>;
  }

  const currentQuestion = questions[currentIndex];
  const bg = backgrounds[currentIndex % backgrounds.length];

  return (
    <AppLayout background={bg}>
      <div
        style={{
          display: "flex",
          gap: 20,
          width: "85vw",
          margin: "auto",
          alignItems: "flex-start",
        }}
      >
        {/* MAIN QUESTION PANEL */}
        <div
          style={{
            flex: 4,
            background: "rgba(255,255,255,0.94)",
            padding: 30,
            borderRadius: 12,
            color: "#000",
            minHeight: "72vh",
            maxHeight: "78vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "10px 15px",
              borderRadius: 8,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 15,
              textTransform: "uppercase",
            }}
          >
            {currentQuestion.section || "STRATAVAX CAPABILITY ASSESSMENT"}
          </div>

          <p style={{ marginBottom: 15, fontWeight: 600 }}>
            Question {currentIndex + 1} of {questions.length}
          </p>

          <QuestionCard
            question={currentQuestion}
            selected={answers[currentQuestion.id]}
            onSelect={(answerId) =>
              handleSelect(currentQuestion.id, answerId)
            }
            fitLayout
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            <button onClick={handleBack} disabled={currentIndex === 0}>
              Previous page
            </button>
            {currentIndex === questions.length - 1 ? (
              <button onClick={handleFinish}>Finish Attempt</button>
            ) : (
              <button onClick={handleNext}>Next page</button>
            )}
          </div>
        </div>

        {/* QUESTION NAV */}
        <QuestionNav
          questions={questions}
          answers={answers}
          current={currentIndex}
          onJump={setCurrentIndex}
          assessmentId={id}
          elapsed={elapsed}
          totalSeconds={10800}
        />
      </div>
    </AppLayout>
  );
}
