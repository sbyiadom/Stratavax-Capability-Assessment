import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import { supabase } from "../../supabase/client";
import { saveResponse } from "../../supabase/response";

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function AssessmentPage() {
  const router = useRouter();
  const { id } = router.query;
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState(null);

  const assessmentId = Number(id);
  const backgrounds = [
    "/images/assessment-bg1.jpg",
    "/images/assessment-bg2.jpg",
    "/images/assessment-bg3.jpg",
  ];

  // Session load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Fetch questions
  useEffect(() => {
    if (!assessmentId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            answers (id, answer_text)
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (error) throw error;

        const formatted = shuffleArray(
          (data || []).map((q) => ({
            ...q,
            options: shuffleArray(q.answers || []),
          }))
        );

        setQuestions(formatted);
      } catch (err) {
        console.error("Error loading questions:", err);
        alert("Failed to load assessment questions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Save response
  const handleSelect = async (questionId, answerId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));

    if (!assessmentId || !session?.user?.id) {
      console.warn("Missing assessment/session, skipping save...");
      return;
    }

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
    } catch (err) {
      console.error("Save response error:", err.message || err);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handleBack = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const handleFinish = async () => {
    try {
      if (!session) {
        alert("Please log in to submit.");
        return;
      }

      const response = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessmentId,
          user_id: session.user.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed.");

      alert("Assessment submitted successfully!");
      router.push("/");
    } catch (err) {
      console.error("Finish error:", err);
      alert("Failed to submit your assessment.");
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading assessment…</p>;
  if (!questions.length) return <p style={{ textAlign: "center" }}>No questions found.</p>;

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
        <div
          style={{
            flex: 4,
            background: "rgba(255,255,255,0.94)",
            padding: 30,
            borderRadius: 12,
            color: "#000",
            minHeight: "72vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              padding: "10px 15px",
              borderRadius: 8,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            {currentQuestion.section || "Assessment"}
          </h3>

          <p style={{ fontWeight: 600 }}>
            Question {currentIndex + 1} of {questions.length}
          </p>

          <QuestionCard
            question={currentQuestion}
            selected={answers[currentQuestion.id]}
            onSelect={(answerId) => session && handleSelect(currentQuestion.id, answerId)}
          />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={handleBack} disabled={currentIndex === 0}>
              Previous
            </button>
            {currentIndex === questions.length - 1 ? (
              <button onClick={handleFinish}>Finish</button>
            ) : (
              <button onClick={handleNext}>Next</button>
            )}
          </div>
        </div>

        <QuestionNav
          questions={questions}
          answers={answers}
          current={currentIndex}
          onJump={setCurrentIndex}
          elapsed={elapsed}
          totalSeconds={10800}
        />
      </div>
    </AppLayout>
  );
}
