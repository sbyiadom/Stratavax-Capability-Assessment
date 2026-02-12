import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import {
  getAssessmentById,
  getAssessmentQuestions,
  startAssessment,
  saveAnswer,
  updateAssessmentTimer,
  completeAssessment,
  hasCompletedAssessment
} from "../../supabase/assessment";

// Section configurations for different assessment types
const SECTION_CONFIG = {
  // General Assessment Sections
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '🧠',
    bgImage: '/images/backgrounds/cognitive-bg.jpg'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    lightBg: 'rgba(156, 39, 176, 0.1)',
    icon: '😊',
    bgImage: 'https://img.freepik.com/free-photo/people-studying-together-communicating_23-2147656354.jpg'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    lightBg: 'rgba(211, 47, 47, 0.1)',
    icon: '👑',
    bgImage: 'https://img.freepik.com/free-photo/friends-people-group-teamwork-diversity_53876-31488.jpg'
  },
  'Bottled Water Manufacturing': {
    color: '#388E3C', 
    lightBg: 'rgba(56, 142, 60, 0.1)',
    icon: '⚙️',
    bgImage: 'https://thumbs.dreamstime.com/b/happy-students-giving-high-five-school-education-friendship-concept-33187252.jpg'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    lightBg: 'rgba(245, 124, 0, 0.1)',
    icon: '📊',
    bgImage: '/images/backgrounds/performance-bg.jpg'
  },
  
  // Behavioral Assessment Sections
  'Communication': {
    color: '#0077B6',
    lightBg: 'rgba(0, 119, 182, 0.1)',
    icon: '💬',
    bgImage: '/images/backgrounds/communication-bg.jpg'
  },
  'Teamwork': {
    color: '#2A9D8F',
    lightBg: 'rgba(42, 157, 143, 0.1)',
    icon: '🤝',
    bgImage: '/images/backgrounds/teamwork-bg.jpg'
  },
  'Emotional Intelligence': {
    color: '#E76F51',
    lightBg: 'rgba(231, 111, 81, 0.1)',
    icon: '🧘',
    bgImage: '/images/backgrounds/eq-bg.jpg'
  },
  
  // Cognitive Assessment Sections
  'Problem Solving': {
    color: '#6A4C93',
    lightBg: 'rgba(106, 76, 147, 0.1)',
    icon: '🔍',
    bgImage: '/images/backgrounds/problem-solving-bg.jpg'
  },
  'Critical Thinking': {
    color: '#1982C4',
    lightBg: 'rgba(25, 130, 196, 0.1)',
    icon: '🎯',
    bgImage: '/images/backgrounds/critical-thinking-bg.jpg'
  },
  'Analytical Reasoning': {
    color: '#8AC926',
    lightBg: 'rgba(138, 201, 38, 0.1)',
    icon: '📐',
    bgImage: '/images/backgrounds/analytical-bg.jpg'
  },
  
  // Cultural Assessment Sections
  'Values Alignment': {
    color: '#9C89B8',
    lightBg: 'rgba(156, 137, 184, 0.1)',
    icon: '🎯',
    bgImage: '/images/backgrounds/values-bg.jpg'
  },
  'Work Ethic': {
    color: '#F0A6CA',
    lightBg: 'rgba(240, 166, 202, 0.1)',
    icon: '💪',
    bgImage: '/images/backgrounds/work-ethic-bg.jpg'
  },
  
  // Manufacturing Technical Sections
  'Blowing Machines': {
    color: '#3D5A80',
    lightBg: 'rgba(61, 90, 128, 0.1)',
    icon: '💨',
    bgImage: '/images/backgrounds/blowing-bg.jpg'
  },
  'Labeler': {
    color: '#EE6C4D',
    lightBg: 'rgba(238, 108, 77, 0.1)',
    icon: '🏷️',
    bgImage: '/images/backgrounds/labeler-bg.jpg'
  },
  'Filling': {
    color: '#98C1D9',
    lightBg: 'rgba(152, 193, 217, 0.1)',
    icon: '💧',
    bgImage: '/images/backgrounds/filling-bg.jpg'
  },
  'Conveyors': {
    color: '#293241',
    lightBg: 'rgba(41, 50, 65, 0.1)',
    icon: '📦',
    bgImage: '/images/backgrounds/conveyor-bg.jpg'
  },
  'Stretchwrappers': {
    color: '#E0FBFC',
    lightBg: 'rgba(224, 251, 252, 0.1)',
    icon: '🔄',
    bgImage: '/images/backgrounds/stretchwrapper-bg.jpg'
  },
  'Date Coders': {
    color: '#C81D25',
    lightBg: 'rgba(200, 29, 37, 0.1)',
    icon: '📅',
    bgImage: '/images/backgrounds/datecoder-bg.jpg'
  },
  'Raw Materials': {
    color: '#725AC1',
    lightBg: 'rgba(114, 90, 193, 0.1)',
    icon: '🧪',
    bgImage: '/images/backgrounds/raw-materials-bg.jpg'
  }
};

// Assessment type to default section order mapping
const ASSESSMENT_TYPE_SECTIONS = {
  'general': ['Cognitive Abilities', 'Personality Assessment', 'Leadership Potential', 'Bottled Water Manufacturing', 'Performance Metrics'],
  'behavioral': ['Communication', 'Teamwork', 'Emotional Intelligence'],
  'cognitive': ['Problem Solving', 'Critical Thinking', 'Analytical Reasoning'],
  'cultural': ['Values Alignment', 'Work Ethic'],
  'manufacturing': ['Blowing Machines', 'Labeler', 'Filling', 'Conveyors', 'Stretchwrappers', 'Date Coders', 'Raw Materials']
};

// Truly random shuffle function
function trulyRandomizeAnswers(answers) {
  if (!answers || answers.length === 0) return answers;
  
  const shuffled = [...answers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== TIMER DATABASE FUNCTIONS =====
async function startOrResumeTimer(userId, assessmentId) {
  try {
    const { data: existingTimer, error: fetchError } = await supabase
      .from("assessment_timer_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingTimer) {
      return existingTimer.elapsed_seconds;
    } else {
      const { error } = await supabase
        .from("assessment_timer_progress")
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          started_at: new Date().toISOString(),
          elapsed_seconds: 0,
          status: 'in_progress'
        });
      if (error) throw error;
      return 0;
    }
  } catch (error) {
    console.error("Timer error:", error);
    return 0;
  }
}

async function saveTimerProgress(userId, assessmentId, elapsedSeconds) {
  try {
    const { error } = await supabase
      .from("assessment_timer_progress")
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        elapsed_seconds: elapsedSeconds,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,assessment_id' });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to save timer:", error);
  }
}

async function markTimerAsCompleted(userId, assessmentId) {
  try {
    const { error } = await supabase
      .from("assessment_timer_progress")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);
    if (error) throw error;
  } catch (error) {
    console.error("Failed to mark timer as completed:", error);
  }
}

// ===== ANTI-CHEAT FUNCTIONS =====
function setupAntiCheatProtection() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && 
        (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
      e.preventDefault();
      return false;
    }
    if (e.key === 'F12' || e.key === 'PrintScreen') {
      e.preventDefault();
      return false;
    }
  });

  const style = document.createElement('style');
  style.innerHTML = `
    * { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; }
    .allow-select { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; }
  `;
  document.head.appendChild(style);
}

export default function AssessmentPage() {
  const router = useRouter();
  const { id: assessmentId } = router.query;

  const [assessment, setAssessment] = useState(null);
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [resultId, setResultId] = useState(null);
  const [sectionOrder, setSectionOrder] = useState([]);

  // Get section order based on assessment type
  useEffect(() => {
    if (assessment?.assessment_type) {
      const order = ASSESSMENT_TYPE_SECTIONS[assessment.assessment_type] || 
                   ASSESSMENT_TYPE_SECTIONS.general;
      setSectionOrder(order);
    }
  }, [assessment]);

  // Initialize anti-cheat protection
  useEffect(() => {
    if (!alreadySubmitted && !loading && isSessionReady) {
      setupAntiCheatProtection();
    }
  }, [alreadySubmitted, loading, isSessionReady]);

  // Check localStorage for submission
  useEffect(() => {
    if (assessmentId) {
      const storedSubmitted = localStorage.getItem(`assessment_submitted_${assessmentId}`);
      if (storedSubmitted === 'true') {
        setAlreadySubmitted(true);
        setError("You have already submitted this assessment. One attempt only allowed.");
        setLoading(false);
      }
    }
  }, [assessmentId]);

  // Initialize session and check if already submitted
  useEffect(() => {
    const initSessionAndCheck = async () => {
      if (!assessmentId) return;
      
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          
          // Check if user has already completed this assessment
          const hasSubmitted = await hasCompletedAssessment(data.session.user.id, assessmentId);
          if (hasSubmitted) {
            setAlreadySubmitted(true);
            localStorage.setItem(`assessment_submitted_${assessmentId}`, 'true');
            setError("You have already submitted this assessment. One attempt only allowed.");
            setLoading(false);
            return;
          }
          
          setIsSessionReady(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Session init error:", error);
        setError("Failed to initialize session");
      }
    };
    initSessionAndCheck();
  }, [assessmentId, router]);

  // Block navigation if already submitted
  useEffect(() => {
    if (alreadySubmitted && router.pathname.includes('/assessment/')) {
      setError("Assessment already submitted. You cannot access this page.");
      setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(`assessment_submitted_${assessmentId}`);
        router.push('/login?message=already_submitted');
      }, 3000);
    }
  }, [alreadySubmitted, assessmentId, router]);

  // Fetch assessment details and questions
  useEffect(() => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId) return;

    const fetchAssessmentData = async () => {
      try {
        setLoading(true);

        // Get assessment details
        const assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);

        // Start or get existing assessment attempt
        const result = await startAssessment(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name || session.user.email,
          assessmentId
        );
        setResultId(result.id);

        // Get questions for this assessment
        const questionsData = await getAssessmentQuestions(assessmentId);

        if (!questionsData || questionsData.length === 0) {
          throw new Error("Assessment questions not found.");
        }

        // Load saved answers from the result
        const savedAnswers = {};
        if (result.responses) {
          Object.keys(result.responses).forEach(qId => {
            savedAnswers[qId] = result.responses[qId].answer_id;
          });
        }

        // Process questions - randomize answers for manufacturing section
        const processedQuestions = questionsData.map(q => {
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            options: q.answers.map(a => ({ 
              ...a, 
              id: parseInt(a.id),
              answer_text: a.answer_text
            }))
          };
          
          // Randomize only for manufacturing-related sections
          if (q.section.includes('Blowing') || 
              q.section.includes('Labeler') || 
              q.section.includes('Filling') || 
              q.section.includes('Conveyor') || 
              q.section.includes('Stretchwrapper') || 
              q.section.includes('Date Coder') ||
              q.section === 'Bottled Water Manufacturing') {
            baseQuestion.options = trulyRandomizeAnswers(baseQuestion.options);
          }
          
          return baseQuestion;
        });

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
        setError(null);

      } catch (error) {
        console.error("Assessment loading error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId, isSessionReady, session, alreadySubmitted]);

  // Timer with pause-resume
  useEffect(() => {
    if (alreadySubmitted || !session?.user?.id || !isSessionReady || !assessmentId || !assessment) return;

    let timerInterval;
    let localElapsed = 0;
    
    const initializeTimer = async () => {
      try {
        const savedElapsed = await startOrResumeTimer(session.user.id, assessmentId);
        localElapsed = savedElapsed;
        setElapsed(savedElapsed);
        setTimerLoaded(true);
        
        timerInterval = setInterval(async () => {
          localElapsed += 1;
          setElapsed(localElapsed);
          
          if (localElapsed % 30 === 0) {
            await saveTimerProgress(session.user.id, assessmentId, localElapsed);
            if (resultId) {
              await updateAssessmentTimer(resultId, localElapsed);
            }
          }
          
          // Auto-submit if time is up
          if (localElapsed >= (assessment.duration_minutes * 60)) {
            clearInterval(timerInterval);
            if (!alreadySubmitted) {
              await submitAssessment();
            }
          }
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize timer:", error);
        timerInterval = setInterval(() => {
          setElapsed(t => t + 1);
        }, 1000);
      }
    };

    initializeTimer();

    const handleBeforeUnload = async () => {
      if (session?.user?.id && localElapsed > 0) {
        await saveTimerProgress(session.user.id, assessmentId, localElapsed);
        if (resultId) {
          await updateAssessmentTimer(resultId, localElapsed);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timerInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (session?.user?.id && localElapsed > 0 && !alreadySubmitted) {
        saveTimerProgress(session.user.id, assessmentId, localElapsed);
        if (resultId) {
          updateAssessmentTimer(resultId, localElapsed);
        }
      }
    };
  }, [alreadySubmitted, session, isSessionReady, assessmentId, resultId, assessment]);

  // Handle answer selection
  const handleSelect = async (questionId, answerId, score, section) => {
    if (alreadySubmitted || !resultId) {
      alert("❌ Cannot save answer.");
      return;
    }
    
    if (!isSessionReady || !session?.user?.id) return;

    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      await saveAnswer(resultId, questionId, answerId, score, section);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 1500);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
      alert("Failed to save answer. Please try again.");
    }
  };

  // Navigation
  const handleNext = () => {
    if (alreadySubmitted) {
      alert("❌ Assessment already submitted. Navigation disabled.");
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleBack = () => {
    if (alreadySubmitted) {
      alert("❌ Assessment already submitted. Navigation disabled.");
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  // Submit assessment
  const submitAssessment = async () => {
    if (alreadySubmitted || !resultId || !assessment) {
      alert("⚠️ Cannot submit assessment.");
      return;
    }
    
    if (!session?.user?.id) {
      alert("Please log in to submit your assessment.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    try {
      // Calculate scores
      const categoryScores = {};
      let totalScore = 0;
      let totalQuestions = 0;
      const strengths = [];
      const weaknesses = [];

      // Process all answers to calculate scores by section
      Object.keys(answers).forEach(questionId => {
        const question = questions.find(q => q.id === parseInt(questionId));
        if (question) {
          const answer = question.options.find(a => a.id === answers[questionId]);
          if (answer) {
            const score = answer.score || 0;
            totalScore += score;
            totalQuestions++;
            
            const section = question.section;
            if (!categoryScores[section]) {
              categoryScores[section] = { total: 0, count: 0, average: 0 };
            }
            categoryScores[section].total += score;
            categoryScores[section].count += 1;
            categoryScores[section].average = 
              Math.round((categoryScores[section].total / categoryScores[section].count) * 100) / 100;
          }
        }
      });

      const overallScore = totalQuestions > 0 ? 
        Math.round((totalScore / (totalQuestions * 5)) * 100) : 0;

      // Determine risk level and readiness
      let riskLevel = 'low';
      let readiness = 'ready';
      
      if (overallScore < 40) {
        riskLevel = 'high';
        readiness = 'not_ready';
      } else if (overallScore < 60) {
        riskLevel = 'medium';
        readiness = 'needs_development';
      }

      // Complete the assessment
      await completeAssessment(
        resultId,
        overallScore,
        categoryScores,
        strengths,
        weaknesses,
        riskLevel,
        readiness
      );

      // Mark timer as completed
      await markTimerAsCompleted(session.user.id, assessmentId);
      
      // Block further access
      setAlreadySubmitted(true);
      localStorage.setItem(`assessment_submitted_${assessmentId}`, 'true');
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/candidate/dashboard');
      }, 5000);
      
    } catch (error) {
      console.error("Submission error:", error);
      alert("Assessment submitted but there was an error saving your score. Please contact support.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "40px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", fontWeight: "600", marginBottom: "20px" }}>
            {assessment ? `Loading ${assessment.name}...` : 'Loading Assessment...'}
          </div>
          <div style={{ 
            width: "100%", 
            height: "6px", 
            backgroundColor: "rgba(255,255,255,0.2)", 
            borderRadius: "3px", 
            overflow: "hidden" 
          }}>
            <div style={{ 
              width: "60%", 
              height: "100%", 
              backgroundColor: "white",
              borderRadius: "3px",
              animation: "loading 1.5s infinite"
            }} />
          </div>
          <style jsx>{`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Already submitted state
  if (alreadySubmitted) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "30px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", marginBottom: "20px" }}>
            Assessment Already Submitted ✅
          </div>
          <div style={{ 
            fontSize: "16px", 
            marginBottom: "30px", 
            lineHeight: 1.5,
            background: "rgba(255,255,255,0.1)",
            padding: "20px",
            borderRadius: "10px",
            border: "2px solid rgba(255,255,255,0.2)"
          }}>
            <strong style={{ color: "#ff9800" }}>ONE ATTEMPT ONLY POLICY</strong>
            <br /><br />
            You have already completed and submitted this assessment.
            <br />
            <strong style={{ color: "#4caf50" }}>Each candidate is allowed only one attempt.</strong>
            <br /><br />
            <small style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
              ⚠️ Redirecting to dashboard...
            </small>
          </div>
          <button 
            onClick={() => router.push('/candidate/dashboard')}
            style={{
              padding: "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              width: "100%",
              minHeight: "44px"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "30px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", marginBottom: "20px" }}>
            {error.includes("already submitted") ? "Assessment Already Submitted" : "Error Loading Assessment"}
          </div>
          <div style={{ 
            fontSize: "16px", 
            marginBottom: "30px", 
            lineHeight: 1.5,
            background: "rgba(255,255,255,0.1)",
            padding: "20px",
            borderRadius: "10px"
          }}>
            {error}
          </div>
          <button 
            onClick={() => router.push("/candidate/dashboard")}
            style={{
              padding: "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              width: "100%",
              minHeight: "44px"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px"
      }}>
        <div style={{ textAlign: "center", padding: "30px", maxWidth: "500px", width: "100%" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}>
            🏢 Stratavax
          </div>
          <div style={{ fontSize: "22px", marginBottom: "20px" }}>
            No Questions Available
          </div>
          <div style={{ fontSize: "16px", marginBottom: "30px", lineHeight: 1.5 }}>
            No assessment questions found for {assessment?.name || 'this assessment'}.
          </div>
          <button 
            onClick={() => router.push("/candidate/dashboard")}
            style={{
              padding: "15px 35px",
              backgroundColor: "white",
              color: "#764ba2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              width: "100%",
              minHeight: "44px"
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || sectionOrder[0] || 'General';
  const sectionConfig = SECTION_CONFIG[currentSection] || {
    color: '#4A6FA5',
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '📝',
    bgImage: '/images/backgrounds/default-bg.jpg'
  };
  
  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;

  // Time calculations
  const timeLimitSeconds = assessment?.duration_minutes ? assessment.duration_minutes * 60 : 10800;
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const formatTime = (time) => time.toString().padStart(2, '0');
  
  const timeUsedPercentage = (elapsed / timeLimitSeconds) * 100;
  const isTimeWarning = timeUsedPercentage > 80;
  const isTimeCritical = timeUsedPercentage > 90;

  return (
    <>
      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: "#1565c0", 
              fontSize: "28px",
              marginBottom: "20px",
              fontWeight: "700"
            }}>
              📋 Final Submission
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: "25px", 
              background: "#f8f9fa", 
              borderRadius: "15px",
              border: "2px solid #e3f2fd"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px",
                fontWeight: "600"
              }}>
                <span style={{ color: "#555" }}>Questions Answered:</span>
                <span style={{ fontWeight: "700", color: "#4caf50" }}>
                  {totalAnswered}/{questions.length}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "20px",
                fontSize: "16px",
                fontWeight: "600"
              }}>
                <span style={{ color: "#555" }}>Completion Rate:</span>
                <span style={{ fontWeight: "700", color: "#2196f3" }}>
                  {progressPercentage}%
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "16px",
                fontWeight: "600"
              }}>
                <span style={{ color: "#555" }}>Time Used:</span>
                <span style={{ 
                  fontWeight: "700", 
                  color: isTimeCritical ? "#d32f2f" : isTimeWarning ? "#ff9800" : "#4caf50" 
                }}>
                  {formatTime(Math.floor(elapsed / 3600))}:{formatTime(Math.floor((elapsed % 3600) / 60))}:{formatTime(elapsed % 60)}
                </span>
              </div>
              
              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                padding: "12px", 
                background: "#fff8e1", 
                borderRadius: "8px",
                marginBottom: "15px",
                borderLeft: "4px solid #ff9800"
              }}>
                ⚠️ <strong>ONE ATTEMPT ONLY:</strong> After submission, you <strong>cannot</strong> retake this assessment.
              </div>
              
              <div style={{ height: "12px", background: "#e0e0e0", borderRadius: "6px", margin: "20px 0" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${progressPercentage}%`, 
                  background: "linear-gradient(90deg, #4caf50, #2e7d32)", 
                  borderRadius: "6px"
                }} />
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "15px"
            }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: "12px 24px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "16px",
                  minHeight: "44px"
                }}
              >
                Continue Assessment
              </button>
              <button
                onClick={submitAssessment}
                disabled={isSubmitting}
                style={{
                  padding: "12px 24px",
                  background: isSubmitting ? "#81c784" : "linear-gradient(135deg, #4caf50, #2e7d32)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: "16px",
                  minHeight: "44px"
                }}
              >
                {isSubmitting ? "Submitting..." : "Final Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            padding: "50px",
            borderRadius: "25px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 30px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              width: "100px",
              height: "100px",
              background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 25px",
              fontSize: "50px",
              color: "white"
            }}>
              ✓
            </div>
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: "20px", 
              color: "#1a237e",
              fontSize: "32px",
              fontWeight: "800"
            }}>
              Assessment Complete! 🎉
            </h2>
            
            <div style={{ 
              margin: "25px 0", 
              padding: "30px", 
              background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", 
              borderRadius: "15px",
              border: "3px solid #4caf50"
            }}>
              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                margin: "15px 0",
                padding: "12px",
                background: "#e3f2fd",
                borderRadius: "8px",
                borderLeft: "4px solid #2196f3"
              }}>
                ✅ <strong>One-time submission completed:</strong> Your {assessment?.name} has been successfully submitted.
                <br />
                <strong>You cannot retake this assessment.</strong>
                <br /><br />
                <small>Redirecting to dashboard in 5 seconds...</small>
              </div>
            </div>

            <button
              onClick={() => router.push("/candidate/dashboard")}
              style={{
                padding: "18px 45px",
                background: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "700",
                minHeight: "50px",
                width: "100%"
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Assessment Layout */}
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden"
      }}>
        
        {/* Header */}
        <div style={{
          background: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), 
                      url('https://img.freepik.com/free-photo/multiethnic-group-young-happy-students-standing-outdoors_171337-11812.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '8px 15px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          height: '70px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            width: '100%'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a237e',
                fontSize: '16px'
              }}>
                {sectionConfig.icon}
              </div>
              
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  color: 'white',
                  lineHeight: 1.2
                }}>
                  {assessment?.name || 'Stratavax Assessment'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  Q{currentIndex + 1}/{questions.length} • {currentSection}
                  {(currentSection.includes('Blowing') || 
                    currentSection.includes('Labeler') || 
                    currentSection.includes('Filling') || 
                    currentSection.includes('Conveyor') || 
                    currentSection.includes('Stretchwrapper') || 
                    currentSection.includes('Date Coder') ||
                    currentSection === 'Bottled Water Manufacturing') && (
                    <span style={{ marginLeft: '5px', fontStyle: 'italic' }}>
                      (Randomized)
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Timer */}
            <div style={{
              padding: '4px 8px',
              background: isTimeCritical ? 'rgba(255, 255, 255, 0.9)' : 
                         isTimeWarning ? 'rgba(255, 255, 255, 0.9)' : 
                         'rgba(255, 255, 255, 0.9)',
              borderRadius: '4px',
              textAlign: 'center',
              minWidth: '70px',
              border: isTimeCritical ? '1px solid #d32f2f' : 
                      isTimeWarning ? '1px solid #ff9800' : 
                      '1px solid #2196f3'
            }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: isTimeCritical ? '#d32f2f' : 
                       isTimeWarning ? '#ff9800' : 
                       '#2196f3'
              }}>
                TIME REMAINING
              </div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '700', 
                color: isTimeCritical ? '#d32f2f' : 
                       isTimeWarning ? '#ff9800' : 
                       '#1565c0'
              }}>
                {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Cheat Warning */}
        <div style={{
          padding: '8px 15px',
          background: 'linear-gradient(135deg, #ff9800, #f57c00)',
          color: 'white',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: '600',
          borderBottom: '2px solid #e65100'
        }}>
          ⚠️ ANTI-CHEAT ACTIVE: Right-click, copy/paste, and text selection disabled. Timer pauses when you log off.
        </div>

        {/* Progress Bar */}
        <div style={{ 
          height: '4px', 
          background: '#e0e0e0',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${progressPercentage}%`, 
            background: sectionConfig.color,
            transition: 'width 0.3s'
          }} />
        </div>

        {/* Main Content - Question Display */}
        <div style={{ 
          flex: 1,
          padding: '10px',
          display: 'flex',
          overflow: 'hidden',
          gap: '10px'
        }}>
          
          {/* Question & Answers Panel */}
          <div style={{
            flex: 7,
            background: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), 
                        url('${sectionConfig.bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '20px'
          }}>
            {/* Question Header */}
            <div style={{
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  background: sectionConfig.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  {sectionConfig.icon}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: sectionConfig.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {currentSection}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '16px', 
                lineHeight: 1.6,
                color: '#444',
                fontWeight: '400'
              }}>
                {currentQuestion?.question_text}
              </div>
            </div>

            {/* Save Status */}
            {saveStatus[currentQuestion?.id] && (
              <div style={{
                padding: '8px 12px',
                background: saveStatus[currentQuestion.id] === 'saved' ? 'rgba(76, 175, 80, 0.15)' : 
                           saveStatus[currentQuestion.id] === 'saving' ? 'rgba(255, 152, 0, 0.15)' : 
                           'rgba(211, 47, 47, 0.15)',
                border: `1px solid ${saveStatus[currentQuestion.id] === 'saved' ? '#4caf50' : 
                         saveStatus[currentQuestion.id] === 'saving' ? '#ff9800' : 
                         '#d32f2f'}`,
                borderRadius: '5px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: saveStatus[currentQuestion.id] === 'saved' ? '#2e7d32' : 
                       saveStatus[currentQuestion.id] === 'saving' ? '#f57c00' : 
                       '#d32f2f',
                fontWeight: '500'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: saveStatus[currentQuestion.id] === 'saved' ? '#4caf50' : 
                             saveStatus[currentQuestion.id] === 'saving' ? '#ff9800' : 
                             '#d32f2f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px'
                }}>
                  {saveStatus[currentQuestion.id] === 'saved' ? '✓' : 
                   saveStatus[currentQuestion.id] === 'saving' ? '⏳' : 
                   '⚠️'}
                </div>
                <span>
                  {saveStatus[currentQuestion.id] === 'saved' ? 'Answer saved successfully' : 
                   saveStatus[currentQuestion.id] === 'saving' ? 'Saving answer...' : 
                   'Failed to save answer'}
                </span>
              </div>
            )}

            {/* Answer Options */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              flex: 1
            }}>
              {currentQuestion?.options?.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                const optionLetter = String.fromCharCode(65 + index);
                
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(
                      currentQuestion.id, 
                      option.id, 
                      option.score || 0, 
                      currentSection
                    )}
                    disabled={saveStatus[currentQuestion.id] === 'saving' || alreadySubmitted}
                    style={{
                      padding: '15px 20px',
                      background: isSelected ? sectionConfig.lightBg : 'white',
                      border: `2px solid ${isSelected ? sectionConfig.color : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: (saveStatus[currentQuestion.id] === 'saving' || alreadySubmitted) ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      fontSize: '15px',
                      lineHeight: 1.4,
                      color: isSelected ? sectionConfig.color : '#333',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '15px',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 4px 8px ${sectionConfig.color}40` : 'none',
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: isSelected ? sectionConfig.color : '#f5f5f5',
                      color: isSelected ? 'white' : '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {optionLetter}
                    </div>
                    
                    <div style={{ 
                      flex: 1,
                      fontSize: '15px',
                      lineHeight: 1.5,
                      textAlign: 'left'
                    }}>
                      {option.answer_text}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div style={{ 
              marginTop: '25px',
              paddingTop: '15px',
              borderTop: '2px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0 || alreadySubmitted} 
                style={{ 
                  padding: '12px 24px', 
                  background: currentIndex === 0 || alreadySubmitted ? '#f5f5f5' : sectionConfig.color, 
                  color: currentIndex === 0 || alreadySubmitted ? '#999' : 'white', 
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentIndex === 0 || alreadySubmitted ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  minWidth: '100px'
                }}
              >
                ← Previous
              </button>
              
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#666'
                }}>
                  {currentIndex + 1} of {questions.length}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500', 
                  color: sectionConfig.color
                }}>
                  {progressPercentage}% Complete
                </div>
              </div>
              
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  disabled={alreadySubmitted}
                  style={{ 
                    padding: '12px 24px', 
                    background: alreadySubmitted ? '#81c784' : '#4caf50', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '6px',
                    cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    minWidth: '100px'
                  }}
                >
                  Submit
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  disabled={alreadySubmitted}
                  style={{ 
                    padding: '12px 24px', 
                    background: alreadySubmitted ? '#f5f5f5' : sectionConfig.color, 
                    color: alreadySubmitted ? '#999' : 'white', 
                    border: 'none',
                    borderRadius: '6px',
                    cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    minWidth: '100px'
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator Panel */}
          <div style={{
            flex: 3,
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            minWidth: "250px"
          }}>
            <div style={{ 
              fontSize: "16px",
              fontWeight: "600", 
              marginBottom: "15px",
              color: "#333",
              textAlign: "center",
              paddingBottom: "10px",
              borderBottom: "2px solid #f0f0f0"
            }}>
              📋 Question Navigator
            </div>
            
            {/* Progress Summary */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "15px",
              padding: "12px 15px",
              background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
              borderRadius: "6px",
              fontSize: "14px"
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ color: "#4caf50", fontWeight: "700", fontSize: "18px" }}>
                  {totalAnswered}
                </div>
                <div style={{ color: "#666", fontSize: "11px" }}>Answered</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ color: "#666", fontWeight: "700", fontSize: "18px" }}>
                  {questions.length - totalAnswered}
                </div>
                <div style={{ color: "#666", fontSize: "11px" }}>Remaining</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ color: "#2196f3", fontWeight: "700", fontSize: "18px" }}>
                  {progressPercentage}%
                </div>
                <div style={{ color: "#666", fontSize: "11px" }}>Complete</div>
              </div>
            </div>
            
            {/* Question Grid */}
            <div style={{ 
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "4px",
              gridAutoRows: "minmax(32px, auto)",
              alignContent: "start"
            }}>
              {questions.map((q, index) => {
                const isAnswered = answers[q.id];
                const isCurrent = index === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => !alreadySubmitted && setCurrentIndex(index)}
                    disabled={alreadySubmitted}
                    style={{
                      width: "100%",
                      height: "32px",
                      minHeight: "32px",
                      background: isCurrent ? sectionConfig.color : 
                                 isAnswered ? "#4caf50" : "#f5f5f5",
                      color: isCurrent ? "white" : 
                             isAnswered ? "white" : "#666",
                      border: `1px solid ${isCurrent ? sectionConfig.color : 
                               isAnswered ? "#4caf50" : "#e0e0e0"}`,
                      borderRadius: "4px",
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0",
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            
            {/* Legend */}
            <div style={{
              marginTop: "15px",
              paddingTop: "15px",
              borderTop: "2px solid #e0e0e0"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                fontSize: "11px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#4caf50" }} />
                  <span>Answered</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: sectionConfig.color }} />
                  <span>Current</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#f5f5f5", border: "1px solid #e0e0e0" }} />
                  <span>Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
