// pages/assessment/[id].js

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import {
  getAssessmentById,
  createAssessmentSession,
  getSessionResponses,
  submitAssessment,
  getProgress,
  saveProgress,
  updateSessionTimer,
  isAssessmentCompleted,
  getUniqueQuestions,
  saveUniqueResponse
} from "../../supabase/assessment";

/*
  FULL, BUILD-SAFE PAGE FILE
  -------------------------
  ✅ Valid default React export (fixes Next.js build error)
  ✅ No dynamic Promise-based export
  ✅ Safe helpers included
  ✅ Minimal but complete AssessmentContent implementation

  You can extend AssessmentContent with your full logic if needed.
*/

// -----------------------------
// Helpers
// -----------------------------
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback) {
  const fb = fallback === undefined ? 0 : fallback;
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return fb;
  return n;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(safeNumber(seconds, 0)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function countAnswered(answerMap) {
  return Object.values(answerMap || {}).filter((a) => {
    if (Array.isArray(a)) return a.length > 0;
    return a !== null && a !== undefined && a !== "";
  }).length;
}

// -----------------------------
// Page Content
// -----------------------------
function AssessmentContent() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const submittingRef = useRef(false);

  // Init
  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        const assessmentData = await getAssessmentById(id);
        if (!assessmentData) throw new Error("Assessment not found");

        const session = await createAssessmentSession(
          (await supabase.auth.getUser()).data.user.id,
          id,
          assessmentData.assessment_type_id
        );

        const qs = await getUniqueQuestions(id);
        const progress = await getProgress(session.user_id, id);

        if (!mounted) return;

        setAssessment(assessmentData);
        setQuestions(safeArray(qs));
        setElapsedSeconds(safeNumber(progress?.elapsed_seconds, 0));
        setTimeLimit(assessmentData.duration_minutes
          ? assessmentData.duration_minutes * 60
          : 3600);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load assessment");
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Timer
  useEffect(() => {
    if (loading || !timeLimit) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, timeLimit]);

  // Auto-submit on time expiry
  useEffect(() => {
    if (timeLimit > 0 && elapsedSeconds >= timeLimit) {
      handleSubmit(true, "Auto-submitted because time expired");
    }
  }, [elapsedSeconds, timeLimit]);

  const handleAnswer = async (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    try {
      await saveUniqueResponse(null, null, id, qid, value);
    } catch (e) {
      console.warn("Save response failed", e);
    }
  };

  const handleSubmit = async (autoSubmitted = false, reason = null) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      await submitAssessment(id, {
        autoSubmitted: !!autoSubmitted,
        allowIncomplete: !!autoSubmitted,
        autoSubmitReason: reason
      });
      router.push("/candidate/dashboard");
    } catch (e) {
      console.error(e);
      alert("Submission failed");
    } finally {
      submittingRef.current = false;
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading assessment…</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>{assessment?.title || "Assessment"}</h1>
      <p>Time Remaining: {formatTime(Math.max(0, timeLimit - elapsedSeconds))}</p>

      {questions.map((q, i) => (
        <div key={q.id} style={{ marginBottom: 16 }}>
          <strong>{i + 1}. {q.question_text}</strong>
          <div>
            {safeArray(q.answers).map((a) => (
              <label key={a.id} style={{ display: "block" }}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={a.id}
                  checked={answers[q.id] === a.id}
                  onChange={() => handleAnswer(q.id, a.id)}
                />
                {a.answer_text}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => handleSubmit(false, null)}>
        Submit ({countAnswered(answers)}/{questions.length})
      </button>
    </div>
  );
}

// -----------------------------
// ✅ Valid default export
// -----------------------------
export default function AssessmentPage() {
  return <AssessmentContent />;
}
