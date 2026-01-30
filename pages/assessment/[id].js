import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
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

  const backgrounds = [
    "/images/assessment-bg1.jpg",
    "/images/assessment-bg2.jpg",
    "/images/assessment-bg3.jpg",
  ];

  // Get or subscribe to Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Fetch questions
  useEffect(() => {
    if (!assessmentId) return;
    let active = true;
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
        if (!active) return;

        const formatted = shuffleArray(
          (data || []).map((q) => ({
            ...q,
            options: shuffleArray(q.answers || []),
          }))
        );

        setQuestions(formatted);
      } catch (err) {
        console.error("Error fetching questions:", err);
        alert("Failed to load the assessment.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [assessmentId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle answer click
  const handleSelect = async (questionId, answerId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));

    if (!assessmentId || !session?.user?.id) {
      console.warn("Save skipped: assessment or session not ready yet");
      return;
    }

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
    } catch (err) {
      console.error("Failed to save answer:", err.message);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };
  const handleBack = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const handleFinish = async () => {
    try {
      if (!session) {
        alert("Please log in to submit your assessment.");
        return;
      }

      const res = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment_id: assessmentId, user_id: session.user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");

      alert("Assessment submitted successfully!");
      router.push("/");
    } catch (err) {
      console.error("Finish attempt error:", err);
      alert("Failed to submit assessment.");
    }
  };

  // Loading/empty states
  if (loading) return <p style={{ textAlign: "center" }}>Loading assessment…</p>;
  if (!questions.length)
    return <p style={{ textAlign: "center" }}>No questions found.</p>;

  const currentQuestion = questions[currentIndex];
  const bg = backgrounds[currentIndex % backgrounds.length];

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
              marginBottom: 15,
            }}
          >
            {currentQuestion.section || "Assessment"}
          </div>

          <p style={{ fontWeight: 600 }}>
            Question {currentIndex + 1} of {questions.length}
          </p>

          <QuestionCard
            question={currentQuestion}
            selected={answers[currentQuestion.id]}
            onSelect={(answerId) =>
              session && handleSelect(currentQuestion.id, answerId)
            }
          />

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
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
