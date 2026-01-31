import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
  'Cognitive Abilities': { color: '#1565c0', icon: '🧠' },
  'Personality Assessment': { color: '#7b1fa2', icon: '😊' },
  'Leadership Potential': { color: '#d32f2f', icon: '👑' },
  'Technical Competence': { color: '#388e3c', icon: '⚙️' },
  'Performance Metrics': { color: '#f57c00', icon: '📊' }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);

async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    await supabase.from("responses").upsert({
      assessment_id: assessmentId,
      question_id: parseInt(questionId),
      answer_id: parseInt(answerId),
      user_id: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'assessment_id,question_id,user_id' });
    return { success: true };
  } catch (error) {
    throw error;
  }
}

async function loadUserResponses(userId) {
  try {
    const { data } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
      .eq("user_id", userId);
    const responses = {};
    data?.forEach(r => responses[r.question_id] = r.answer_id);
    return responses;
  } catch (error) {
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
    const fetchData = async () => {
      try {
        const { data: questionsData } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            answers!inner (id, answer_text, score)
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (!questionsData?.length) {
          alert("No questions found. Please run the SQL scripts first.");
          return;
        }

        const savedAnswers = await loadUserResponses(session.user.id);
        const processedQuestions = questionsData.map(q => ({
          ...q,
          id: parseInt(q.id),
          options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
        }));

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
      } catch (error) {
        alert(`Error: ${error.message}`);
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

  // Answer selection
  const handleSelect = async (questionId, answerId) => {
    if (!isSessionReady || !session?.user?.id) return;
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));
    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      setTimeout(() => setSaveStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[questionId];
        return newStatus;
      }), 1500);
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
      alert("Failed to save answer.");
    }
  };

  // Navigation
  const handleNext = () => currentIndex < questions.length - 1 && setCurrentIndex(i => i + 1);
  const handleBack = () => currentIndex > 0 && setCurrentIndex(i => i - 1);
  const handleJump = (index) => index >= 0 && index < questions.length && setCurrentIndex(index);
  const handleFinish = () => setShowSubmitModal(true);

  // Submit
  const submitAssessment = async () => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    setIsSubmitting(true);
    try {
      const answeredCount = Object.keys(answers).length;
      alert(`✅ Submitted! ${answeredCount}/${questions.length} questions answered.`);
      router.push("/results");
    } catch (error) {
      alert("Submission failed.");
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Progress
  const getSectionProgress = (section) => {
    const sectionQuestions = questions.filter(q => q.section === section);
    const answered = sectionQuestions.filter(q => answers[q.id]).length;
    return { answered, total: sectionQuestions.length };
  };

  // Time
  const timeRemaining = Math.max(0, 10800 - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  // Loading
  if (loading) return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "20px", color: "#1565c0" }}>
        Loading 100-Question Assessment...
      </div>
    </div>
  );

  if (!questions.length) return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h3>No Questions Found</h3>
      <p>Please run the SQL setup scripts first.</p>
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const sectionConfig = SECTION_CONFIG[currentQuestion?.section] || SECTION_CONFIG['Cognitive Abilities'];
  const saveState = saveStatus[currentQuestion?.id];
  const totalAnswered = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <>
      {showSubmitModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 2000
        }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", maxWidth: "500px", width: "90%" }}>
            <h2 style={{ marginTop: 0, color: "#1565c0" }}>Submit Assessment?</h2>
            <p>You have answered {totalAnswered} of {questions.length} questions.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowSubmitModal(false)} style={{ padding: "10px 20px", background: "#f5f5f5", border: "none", borderRadius: "6px" }}>
                Continue
              </button>
              <button onClick={submitAssessment} disabled={isSubmitting} style={{ padding: "10px 20px", background: "#4caf50", color: "white", border: "none", borderRadius: "6px" }}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "1400px", margin: "auto", padding: "20px" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "20px", padding: "20px", background: "white", borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", color: "#1565c0" }}>
              🏢 Stratavax Capability Assessment
            </h1>
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>
              {questions.length} Questions • Time: {hours}h {minutes}m {seconds}s
            </p>
          </div>
          <div style={{ padding: "8px 16px", background: "#e3f2fd", borderRadius: "20px", fontWeight: "600", color: "#1565c0" }}>
            {totalAnswered}/{questions.length} Answered
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: "flex", gap: "20px" }}>
          {/* Question Panel */}
          <div style={{ flex: 3, background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
            {/* Section Header */}
            <div style={{
              background: sectionConfig.color, color: "white", padding: "15px 20px",
              borderRadius: "8px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px"
            }}>
              <span style={{ fontSize: "24px" }}>{sectionConfig.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "18px" }}>{currentQuestion?.section}</div>
                <div style={{ fontSize: "12px", opacity: 0.9 }}>Question {currentIndex + 1} of {questions.length}</div>
              </div>
              {saveState && (
                <div style={{ padding: "4px 12px", borderRadius: "15px", background: saveState === "saved" ? "#4caf50" : saveState === "saving" ? "#ffb74d" : "#f44336", color: "white", fontSize: "13px" }}>
                  {saveState === "saved" ? "✅ Saved" : saveState === "saving" ? "⏳ Saving" : "❌ Error"}
                </div>
              )}
            </div>

            {/* Question */}
            <div style={{
              fontSize: "18px", lineHeight: 1.6, marginBottom: "25px", padding: "20px",
              background: "#f8f9fa", borderRadius: "8px", borderLeft: `4px solid ${sectionConfig.color}`
            }}>
              {currentQuestion?.question_text}
            </div>

            {/* Answers */}
            <QuestionCard
              question={currentQuestion}
              selected={answers[currentQuestion?.id]}
              onSelect={(answerId) => handleSelect(currentQuestion?.id, answerId)}
              disabled={saveState === "saving"}
            />

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px" }}>
              <button onClick={handleBack} disabled={currentIndex === 0} style={{ padding: "12px 24px", background: currentIndex === 0 ? "#f5f5f5" : "#1565c0", color: currentIndex === 0 ? "#999" : "white", border: "none", borderRadius: "8px" }}>
                ← Previous
              </button>
              {isLastQuestion ? (
                <button onClick={handleFinish} style={{ padding: "12px 30px", background: "#4caf50", color: "white", border: "none", borderRadius: "8px", fontWeight: "600" }}>
                  🏁 Finish Assessment
                </button>
              ) : (
                <button onClick={handleNext} style={{ padding: "12px 24px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px" }}>
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Question Nav */}
            <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Question Navigator</h3>
              <QuestionNav questions={questions} answers={answers} current={currentIndex} onJump={handleJump} />
            </div>

            {/* Progress */}
            <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Progress</h3>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Overall: {totalAnswered}/{questions.length}</span>
                  <span>{Math.round((totalAnswered / questions.length) * 100)}%</span>
                </div>
                <div style={{ height: "8px", background: "#e0e0e0", borderRadius: "4px" }}>
                  <div style={{ height: "100%", width: `${(totalAnswered / questions.length) * 100}%`, background: "#4caf50", borderRadius: "4px" }} />
                </div>
              </div>
              {SECTION_ORDER.map(section => {
                const progress = getSectionProgress(section);
                const config = SECTION_CONFIG[section];
                return (
                  <div key={section} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "5px" }}>
                      <span>{config.icon} {section.split(' ')[0]}</span>
                      <span>{progress.answered}/{progress.total}</span>
                    </div>
                    <div style={{ height: "6px", background: "#e0e0e0", borderRadius: "3px" }}>
                      <div style={{ height: "100%", width: `${progress.total ? (progress.answered / progress.total) * 100 : 0}%`, background: config.color, borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
