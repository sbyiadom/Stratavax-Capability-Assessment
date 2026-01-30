import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import QuestionCard from "../../components/QuestionCard";
import QuestionNav from "../../components/QuestionNav";
import Timer from "../../components/Timer";
import { supabase } from "../../supabase/client";
import { saveResponse, loadUserResponses } from "../../supabase/response";

// Section configuration
const SECTION_CONFIG = {
  'Cognitive Abilities': { color: '#1565c0', icon: '🧠', questions: 20 },
  'Personality Assessment': { color: '#7b1fa2', icon: '😊', questions: 20 },
  'Leadership Potential': { color: '#d32f2f', icon: '👑', questions: 20 },
  'Technical Competence': { color: '#388e3c', icon: '⚙️', questions: 20 },
  'Performance Metrics': { color: '#f57c00', icon: '📊', questions: 20 }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);

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

  // Backgrounds
  const backgrounds = [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&auto=format&fit=crop&q=80",
  ];

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
    if (!isSessionReady) return;

    const fetchData = async () => {
      try {
        // Fetch questions with answers
        const { data: questionsData, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            answers (id, answer_text, score)
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (error) throw error;

        // Load previous responses
        const savedAnswers = await loadUserResponses(session.user.id);

        // Shuffle questions within sections
        const questionsBySection = {};
        questionsData.forEach(q => {
          if (!questionsBySection[q.section]) {
            questionsBySection[q.section] = [];
          }
          questionsBySection[q.section].push({
            ...q,
            options: q.answers || []
          });
        });

        // Combine sections in order
        const allQuestions = SECTION_ORDER.flatMap(section => 
          questionsBySection[section] || []
        );

        setQuestions(allQuestions);
        setAnswers(savedAnswers);

      } catch (error) {
        console.error("Error:", error);
        alert("Failed to load assessment");
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
    if (!isSessionReady || !session?.user?.id) return;

    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);

    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
      alert(`Save failed: ${error.message}`);
    }
  };

  // Navigation
  const handleNext = () => currentIndex < questions.length - 1 && setCurrentIndex(i => i + 1);
  const handleBack = () => currentIndex > 0 && setCurrentIndex(i => i - 1);
  const handleJump = (index) => index >= 0 && index < questions.length && setCurrentIndex(index);

  // Calculate section progress
  const getSectionProgress = (section) => {
    const sectionQuestions = questions.filter(q => q.section === section);
    const answered = sectionQuestions.filter(q => answers[q.id]).length;
    return { answered, total: sectionQuestions.length };
  };

  // Loading state
  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading 100-question assessment...</div>;
  }

  if (!questions.length) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Assessment not available.</p>
        <button onClick={() => router.push("/")}>Return Home</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion.section;
  const sectionConfig = SECTION_CONFIG[currentSection];
  const saveState = saveStatus[currentQuestion.id];
  const totalAnswered = Object.keys(answers).length;

  return (
    <AppLayout background={backgrounds[currentIndex % backgrounds.length]}>
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
            <h1 style={{ margin: 0, color: "#1565c0" }}>Stratavax EvalEx Assessment</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>100 Questions • Comprehensive Evaluation</p>
          </div>
          <Timer elapsed={elapsed} totalSeconds={10800} />
        </div>

        {/* Main content */}
        <div style={{ display: "flex", gap: 20 }}>
          
          {/* Question panel */}
          <div style={{ flex: 3, background: "white", padding: 30, borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            
            {/* Section header */}
            <div style={{
              background: sectionConfig.color,
              color: "white",
              padding: "12px 20px",
              borderRadius: 8,
              marginBottom: 25,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <span style={{ fontSize: 20 }}>{sectionConfig.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{currentSection}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Question {currentIndex + 1} of 100 • Section {SECTION_ORDER.indexOf(currentSection) + 1} of 5
                </div>
              </div>
            </div>

            {/* Question */}
            <div style={{
              fontSize: 18,
              lineHeight: 1.6,
              marginBottom: 30,
              padding: 15,
              background: "#f8f9fa",
              borderRadius: 8,
              borderLeft: `4px solid ${sectionConfig.color}`
            }}>
              {currentQuestion.question_text}
            </div>

            {/* Answers */}
            <QuestionCard
              question={currentQuestion}
              selected={answers[currentQuestion.id]}
              onSelect={(answerId) => handleSelect(currentQuestion.id, answerId)}
              disabled={saveState === "saving"}
            />

            {/* Navigation */}
            <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleBack} disabled={currentIndex === 0} style={{ padding: "12px 25px", background: currentIndex === 0 ? "#ccc" : "#1565c0", color: "white", border: "none", borderRadius: 8 }}>
                ← Previous
              </button>
              <button onClick={handleNext} disabled={currentIndex === questions.length - 1} style={{ padding: "12px 25px", background: currentIndex === questions.length - 1 ? "#ccc" : "#1565c0", color: "white", border: "none", borderRadius: 8 }}>
                Next →
              </button>
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
            <div style={{ background: "white", padding: 25, borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: 20 }}>Progress</h3>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Overall: {totalAnswered}/100</span>
                  <span style={{ fontWeight: 600 }}>{Math.round((totalAnswered / 100) * 100)}%</span>
                </div>
                <div style={{ height: 10, background: "#e0e0e0", borderRadius: 5 }}>
                  <div style={{ height: "100%", width: `${(totalAnswered / 100) * 100}%`, background: "#4caf50", borderRadius: 5 }} />
                </div>
              </div>

              {/* Section progress */}
              {SECTION_ORDER.map(section => {
                const progress = getSectionProgress(section);
                const config = SECTION_CONFIG[section];
                return (
                  <div key={section} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                      <span>{config.icon} {section}</span>
                      <span>{progress.answered}/{progress.total}</span>
                    </div>
                    <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${(progress.answered / progress.total) * 100}%`, background: config.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
