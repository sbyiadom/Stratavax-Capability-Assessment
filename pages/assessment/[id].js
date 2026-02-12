import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== SECTION CONFIGURATIONS FOR ALL ASSESSMENT TYPES =====
const SECTION_CONFIG = {
  // General Assessment
  'Cognitive Abilities': { color: '#4A6FA5', lightBg: 'rgba(74, 111, 165, 0.1)', icon: '🧠', bgImage: '/images/backgrounds/cognitive-bg.jpg' },
  'Personality Assessment': { color: '#9C27B0', lightBg: 'rgba(156, 39, 176, 0.1)', icon: '😊', bgImage: 'https://img.freepik.com/free-photo/people-studying-together-communicating_23-2147656354.jpg' },
  'Leadership Potential': { color: '#D32F2F', lightBg: 'rgba(211, 47, 47, 0.1)', icon: '👑', bgImage: 'https://img.freepik.com/free-photo/friends-people-group-teamwork-diversity_53876-31488.jpg' },
  'Bottled Water Manufacturing': { color: '#388E3C', lightBg: 'rgba(56, 142, 60, 0.1)', icon: '⚙️', bgImage: 'https://thumbs.dreamstime.com/b/happy-students-giving-high-five-school-education-friendship-concept-33187252.jpg' },
  'Performance Metrics': { color: '#F57C00', lightBg: 'rgba(245, 124, 0, 0.1)', icon: '📊', bgImage: '/images/backgrounds/performance-bg.jpg' },
  
  // Behavioral
  'Adaptability & Flexibility': { color: '#FF6B6B', lightBg: 'rgba(255, 107, 107, 0.1)', icon: '🔄', bgImage: '/images/backgrounds/adaptability-bg.jpg' },
  'Emotional Intelligence': { color: '#4ECDC4', lightBg: 'rgba(78, 205, 196, 0.1)', icon: '🧘', bgImage: '/images/backgrounds/eq-bg.jpg' },
  'Communication Skills': { color: '#45B7D1', lightBg: 'rgba(69, 183, 209, 0.1)', icon: '💬', bgImage: '/images/backgrounds/communication-bg.jpg' },
  'Teamwork & Collaboration': { color: '#96CEB4', lightBg: 'rgba(150, 206, 180, 0.1)', icon: '🤝', bgImage: '/images/backgrounds/teamwork-bg.jpg' },
  'Initiative & Proactivity': { color: '#FFEAA7', lightBg: 'rgba(255, 234, 167, 0.1)', icon: '⚡', bgImage: '/images/backgrounds/initiative-bg.jpg' },
  'Time Management': { color: '#DDA0DD', lightBg: 'rgba(221, 160, 221, 0.1)', icon: '⏰', bgImage: '/images/backgrounds/time-bg.jpg' },
  'Resilience': { color: '#F08A5D', lightBg: 'rgba(240, 138, 93, 0.1)', icon: '💪', bgImage: '/images/backgrounds/resilience-bg.jpg' },
  
  // Cognitive
  'Problem-Solving': { color: '#6A4C93', lightBg: 'rgba(106, 76, 147, 0.1)', icon: '🔍', bgImage: '/images/backgrounds/problem-solving-bg.jpg' },
  'Critical Thinking': { color: '#1982C4', lightBg: 'rgba(25, 130, 196, 0.1)', icon: '🎯', bgImage: '/images/backgrounds/critical-thinking-bg.jpg' },
  'Learning Agility': { color: '#8AC926', lightBg: 'rgba(138, 201, 38, 0.1)', icon: '📚', bgImage: '/images/backgrounds/learning-bg.jpg' },
  'Creativity & Innovation': { color: '#FFCA3A', lightBg: 'rgba(255, 202, 58, 0.1)', icon: '💡', bgImage: '/images/backgrounds/creativity-bg.jpg' },
  
  // Cultural
  'Core Values Alignment': { color: '#9C89B8', lightBg: 'rgba(156, 137, 184, 0.1)', icon: '🎯', bgImage: '/images/backgrounds/values-bg.jpg' },
  'Organizational Citizenship': { color: '#F0A6CA', lightBg: 'rgba(240, 166, 202, 0.1)', icon: '🤲', bgImage: '/images/backgrounds/citizenship-bg.jpg' },
  'Reliability & Dependability': { color: '#B8F2E6', lightBg: 'rgba(184, 242, 230, 0.1)', icon: '✓', bgImage: '/images/backgrounds/reliability-bg.jpg' },
  'Customer Focus': { color: '#A9D6E5', lightBg: 'rgba(169, 214, 229, 0.1)', icon: '👥', bgImage: '/images/backgrounds/customer-bg.jpg' },
  'Safety Awareness': { color: '#FCA17D', lightBg: 'rgba(252, 161, 125, 0.1)', icon: '⚠️', bgImage: '/images/backgrounds/safety-bg.jpg' },
  'Commercial Awareness': { color: '#86A788', lightBg: 'rgba(134, 167, 136, 0.1)', icon: '💰', bgImage: '/images/backgrounds/commercial-bg.jpg' },
  
  // Manufacturing
  'Blowing Machines': { color: '#3D5A80', lightBg: 'rgba(61, 90, 128, 0.1)', icon: '💨', bgImage: '/images/backgrounds/blowing-bg.jpg' },
  'Labeler': { color: '#EE6C4D', lightBg: 'rgba(238, 108, 77, 0.1)', icon: '🏷️', bgImage: '/images/backgrounds/labeler-bg.jpg' },
  'Filling': { color: '#98C1D9', lightBg: 'rgba(152, 193, 217, 0.1)', icon: '💧', bgImage: '/images/backgrounds/filling-bg.jpg' },
  'Conveyors': { color: '#293241', lightBg: 'rgba(41, 50, 65, 0.1)', icon: '📦', bgImage: '/images/backgrounds/conveyor-bg.jpg' },
  'Stretchwrappers': { color: '#E0FBFC', lightBg: 'rgba(224, 251, 252, 0.1)', icon: '🔄', bgImage: '/images/backgrounds/stretchwrapper-bg.jpg' },
  'Shrinkwrappers': { color: '#C81D25', lightBg: 'rgba(200, 29, 37, 0.1)', icon: '🔥', bgImage: '/images/backgrounds/shrinkwrapper-bg.jpg' },
  'Date Coders': { color: '#725AC1', lightBg: 'rgba(114, 90, 193, 0.1)', icon: '📅', bgImage: '/images/backgrounds/datecoder-bg.jpg' },
  'Raw Materials': { color: '#5D576B', lightBg: 'rgba(93, 87, 107, 0.1)', icon: '🧪', bgImage: '/images/backgrounds/raw-materials-bg.jpg' },
  
  // Leadership
  'Vision & Strategic Thinking': { color: '#FFB347', lightBg: 'rgba(255, 179, 71, 0.1)', icon: '🎯', bgImage: '/images/backgrounds/vision-bg.jpg' },
  'Team Development': { color: '#5F9EA0', lightBg: 'rgba(95, 158, 160, 0.1)', icon: '🌱', bgImage: '/images/backgrounds/team-dev-bg.jpg' },
  'Decision-Making': { color: '#C23B22', lightBg: 'rgba(194, 59, 34, 0.1)', icon: '⚖️', bgImage: '/images/backgrounds/decision-bg.jpg' },
  'Influence': { color: '#6B5B95', lightBg: 'rgba(107, 91, 149, 0.1)', icon: '🗣️', bgImage: '/images/backgrounds/influence-bg.jpg' },
  'Leadership EQ': { color: '#88B04B', lightBg: 'rgba(136, 176, 75, 0.1)', icon: '💖', bgImage: '/images/backgrounds/leadership-eq-bg.jpg' },
  'Conflict Resolution': { color: '#FF6F61', lightBg: 'rgba(255, 111, 97, 0.1)', icon: '🤝', bgImage: '/images/backgrounds/conflict-bg.jpg' },
  'Delegation': { color: '#92A8D1', lightBg: 'rgba(146, 168, 209, 0.1)', icon: '📤', bgImage: '/images/backgrounds/delegation-bg.jpg' },
  'Leadership Integrity': { color: '#955251', lightBg: 'rgba(149, 82, 81, 0.1)', icon: '🛡️', bgImage: '/images/backgrounds/integrity-bg.jpg' },
  'Innovation Leadership': { color: '#B565A7', lightBg: 'rgba(181, 101, 167, 0.1)', icon: '💫', bgImage: '/images/backgrounds/innovation-bg.jpg' }
};

// ===== FIXED TIMER FUNCTIONS =====
async function startOrResumeTimer(userId, assessmentId) {
  try {
    if (!userId || !assessmentId) return 0;

    const { data: existingTimer, error: fetchError } = await supabase
      .from("assessment_timer_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Timer fetch error:", fetchError);
      return 0;
    }

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
          status: 'in_progress',
          updated_at: new Date().toISOString()
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
    if (!userId || !assessmentId) return;
    
    const { error } = await supabase
      .from("assessment_timer_progress")
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        elapsed_seconds: elapsedSeconds,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,assessment_id',
        ignoreDuplicates: false 
      });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to save timer:", error);
  }
}

async function markTimerAsCompleted(userId, assessmentId) {
  try {
    if (!userId || !assessmentId) return;
    
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
    }
    if (e.key === 'F12' || e.key === 'PrintScreen') {
      e.preventDefault();
    }
  });

  const style = document.createElement('style');
  style.innerHTML = `* { user-select: none !important; }`;
  document.head.appendChild(style);
}

// ===== RANDOMIZE ANSWERS =====
function trulyRandomizeAnswers(answers) {
  if (!answers || answers.length === 0) return answers;
  const shuffled = [...answers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== SAVE RESPONSE =====
async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    const { error } = await supabase.from("responses").upsert({
      assessment_id: assessmentId,
      question_id: parseInt(questionId),
      answer_id: parseInt(answerId),
      user_id: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'assessment_id,question_id,user_id' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  }
}

async function loadUserResponses(userId, assessmentId) {
  try {
    const { data } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId);

    const responses = {};
    data?.forEach(r => responses[r.question_id] = r.answer_id);
    return responses;
  } catch (error) {
    console.error("Error loading responses:", error);
    return {};
  }
}

// ===== CHECK SUBMISSION =====
async function checkIfAlreadySubmitted(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from("assessment_results")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .eq("status", "completed")
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error checking completion:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in checkIfAlreadySubmitted:", error);
    return false;
  }
}

// ===== MARK AS SUBMITTED =====
async function markAsSubmitted(userId, assessmentId) {
  try {
    const response = await fetch('/api/submit-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment_id: assessmentId, user_id: userId })
    });

    const result = await response.json();
    
    if (!response.ok) {
      if (result.error?.includes("already submitted")) {
        return true;
      }
      throw new Error(result.error || 'Submission failed');
    }

    return true;
  } catch (error) {
    console.error("Failed to submit assessment:", error);
    throw error;
  }
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
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(10800); // 180 minutes fixed

  // ===== FETCH ASSESSMENT DETAILS - FORCED 180 MINS =====
  useEffect(() => {
    const fetchAssessmentDetails = async () => {
      if (!assessmentId || !isSessionReady || alreadySubmitted) return;
      
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("*")
          .eq("id", assessmentId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setAssessment(data);
          // FORCE 180 MINUTES FOR ALL ASSESSMENT TYPES
          setTimeLimitSeconds(10800); // 180 minutes = 10800 seconds
          document.title = `${data.name} - Stratavax Assessment`;
        }
      } catch (error) {
        console.error("Error fetching assessment details:", error);
      }
    };
    
    fetchAssessmentDetails();
  }, [assessmentId, isSessionReady, alreadySubmitted]);

  // ===== INITIALIZE SESSION =====
  useEffect(() => {
    const initSessionAndCheck = async () => {
      if (!assessmentId) return;
      
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          
          const hasSubmitted = await checkIfAlreadySubmitted(data.session.user.id, assessmentId);
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
        setLoading(false);
      }
    };
    initSessionAndCheck();
  }, [assessmentId, router]);

  // ===== FETCH QUESTIONS =====
  useEffect(() => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId) return;

    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        
        const { data: questionsData, error: questionsError } = await supabase
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

        if (questionsError) throw new Error(`Failed to load questions: ${questionsError.message}`);
        if (!questionsData || questionsData.length === 0) throw new Error("Assessment questions not found.");

        const savedAnswers = await loadUserResponses(session.user.id, assessmentId);

        const processedQuestions = questionsData.map(q => {
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
          };
          
          // Randomize answers for manufacturing sections
          if (q.section === 'Bottled Water Manufacturing' || 
              q.section === 'Blowing Machines' ||
              q.section === 'Labeler' ||
              q.section === 'Filling' ||
              q.section === 'Conveyors' ||
              q.section === 'Stretchwrappers' ||
              q.section === 'Shrinkwrappers' ||
              q.section === 'Date Coders' ||
              q.section === 'Raw Materials') {
            return { ...baseQuestion, options: trulyRandomizeAnswers(baseQuestion.options) };
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
  }, [assessmentId, isSessionReady, session?.user?.id, alreadySubmitted]);

  // ===== TIMER =====
  useEffect(() => {
    if (alreadySubmitted || !session?.user?.id || !isSessionReady || !assessmentId || !assessment) return;

    let timerInterval;
    let localElapsed = 0;
    let isMounted = true;
    
    const initializeTimer = async () => {
      try {
        const savedElapsed = await startOrResumeTimer(session.user.id, assessmentId);
        
        if (!isMounted) return;
        
        localElapsed = savedElapsed;
        setElapsed(savedElapsed);
        setTimerLoaded(true);
        
        timerInterval = setInterval(async () => {
          if (!isMounted) return;
          
          localElapsed += 1;
          setElapsed(localElapsed);
          
          if (localElapsed % 30 === 0) {
            await saveTimerProgress(session.user.id, assessmentId, localElapsed);
          }
          
          if (localElapsed >= timeLimitSeconds) {
            clearInterval(timerInterval);
            if (!alreadySubmitted && isMounted) {
              await submitAssessment();
            }
          }
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize timer:", error);
      }
    };

    initializeTimer();

    const handleBeforeUnload = () => {
      if (session?.user?.id && localElapsed > 0) {
        saveTimerProgress(session.user.id, assessmentId, localElapsed);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(timerInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [alreadySubmitted, session?.user?.id, isSessionReady, assessmentId, assessment, timeLimitSeconds]);

  // ===== ANTI-CHEAT =====
  useEffect(() => {
    if (!alreadySubmitted && !loading && isSessionReady && questions.length > 0) {
      setupAntiCheatProtection();
    }
  }, [alreadySubmitted, loading, isSessionReady, questions.length]);

  // ===== HANDLE ANSWER SELECTION =====
  const handleSelect = async (questionId, answerId) => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId) return;

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
      }, 1500);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
    }
  };

  // ===== NAVIGATION =====
  const handleNext = () => {
    if (alreadySubmitted) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleBack = () => {
    if (alreadySubmitted) return;
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  // ===== SUBMIT ASSESSMENT =====
  const submitAssessment = async () => {
    if (alreadySubmitted || !session?.user?.id || !assessmentId) return;

    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    try {
      await markAsSubmitted(session.user.id, assessmentId);
      await markTimerAsCompleted(session.user.id, assessmentId);
      
      setAlreadySubmitted(true);
      localStorage.setItem(`assessment_submitted_${assessmentId}`, 'true');
      
      setShowSuccessModal(true);
      
      setTimeout(() => {
        router.push('/assessment/pre');
      }, 3000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please contact support.");
      setIsSubmitting(false);
    }
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={loadingContentStyle}>
          <div style={loadingTitleStyle}>
            {assessment?.name || 'Loading Assessment...'}
          </div>
          <div style={loadingSubtitleStyle}>
            Please wait while we prepare your assessment
          </div>
          <div style={loadingSpinnerStyle} />
        </div>
      </div>
    );
  }

  // ===== ALREADY SUBMITTED =====
  if (alreadySubmitted) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorCardStyle}>
          <div style={successIconStyle}>✅</div>
          <h2 style={errorTitleStyle}>Assessment Already Completed</h2>
          <p style={errorTextStyle}>
            You have already submitted this assessment. Each assessment can only be taken once.
          </p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={primaryButtonStyle}
          >
            Return to Assessment Selection
          </button>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorCardStyle}>
          <div style={errorIconStyle}>⚠️</div>
          <h2 style={errorTitleStyle}>
            {error.includes("already submitted") ? "Already Submitted" : "Error"}
          </h2>
          <p style={errorTextStyle}>{error}</p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={primaryButtonStyle}
          >
            Return to Assessment Selection
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorCardStyle}>
          <div style={errorIconStyle}>📭</div>
          <h2 style={errorTitleStyle}>No Questions Available</h2>
          <p style={errorTextStyle}>
            This assessment doesn't have any questions yet. Please contact support.
          </p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={primaryButtonStyle}
          >
            Return to Assessment Selection
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || 'General';
  const sectionConfig = SECTION_CONFIG[currentSection] || {
    color: '#4A6FA5',
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '📝',
    bgImage: '/images/backgrounds/default-bg.jpg'
  };

  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = Math.round((totalAnswered / questions.length) * 100);
  const isLastQuestion = currentIndex === questions.length - 1;

  // Time calculations
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const formatTime = (t) => t.toString().padStart(2, '0');

  const timeUsedPercentage = (elapsed / timeLimitSeconds) * 100;
  const isTimeWarning = timeUsedPercentage > 80;
  const isTimeCritical = timeUsedPercentage > 90;

  return (
    <>
      {/* Submit Modal */}
      {showSubmitModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={modalTitleStyle}>📋 Final Submission</h2>
            <div style={modalBodyStyle}>
              <div style={modalRowStyle}>
                <span>Questions Answered:</span>
                <span style={{ color: '#4caf50', fontWeight: '700' }}>{totalAnswered}/{questions.length}</span>
              </div>
              <div style={modalRowStyle}>
                <span>Completion Rate:</span>
                <span style={{ color: '#2196f3', fontWeight: '700' }}>{progressPercentage}%</span>
              </div>
              <div style={modalRowStyle}>
                <span>Time Used:</span>
                <span style={{ 
                  color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#4caf50',
                  fontWeight: '700'
                }}>
                  {formatTime(Math.floor(elapsed / 3600))}:{formatTime(Math.floor((elapsed % 3600) / 60))}:{formatTime(elapsed % 60)}
                </span>
              </div>
              <div style={modalWarningStyle}>
                ⚠️ <strong>ONE ATTEMPT ONLY:</strong> After submission, you cannot retake this assessment.
              </div>
            </div>
            <div style={modalButtonContainerStyle}>
              <button onClick={() => setShowSubmitModal(false)} style={modalSecondaryButtonStyle}>
                Continue
              </button>
              <button onClick={submitAssessment} disabled={isSubmitting} style={modalPrimaryButtonStyle}>
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, textAlign: 'center' }}>
            <div style={successIconLargeStyle}>✓</div>
            <h2 style={{ ...modalTitleStyle, color: '#2e7d32' }}>Assessment Complete! 🎉</h2>
            <div style={modalBodyStyle}>
              <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                Your {assessment?.name || 'assessment'} has been successfully submitted.
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Redirecting to assessment selection...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Assessment Layout */}
      <div style={mainContainerStyle}>
        {/* Header with Back Button */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            {/* Back Button to return to assessment selection */}
            <button
              onClick={() => router.push('/assessment/pre')}
              style={backButtonStyle}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Back to Assessment Selection"
            >
              ←
            </button>
            
            <div style={headerIconStyle}>{sectionConfig.icon}</div>
            <div>
              <div style={headerTitleStyle}>{assessment?.name || 'Assessment'}</div>
              <div style={headerSubtitleStyle}>
                Q{currentIndex + 1}/{questions.length} • {currentSection}
                {(currentSection === 'Blowing Machines' || 
                  currentSection === 'Labeler' ||
                  currentSection === 'Filling' ||
                  currentSection === 'Conveyors' ||
                  currentSection === 'Stretchwrappers' ||
                  currentSection === 'Shrinkwrappers' ||
                  currentSection === 'Date Coders' ||
                  currentSection === 'Raw Materials' ||
                  currentSection === 'Bottled Water Manufacturing') && (
                  <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>(Randomized)</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Timer - Fixed at 180 mins for all assessments */}
          <div style={{
            ...timerStyle,
            borderColor: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#2196f3'
          }}>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '600', 
              color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#2196f3'
            }}>
              TIME REMAINING (180 MINS)
            </div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#1565c0'
            }}>
              {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
            </div>
          </div>
        </div>

        {/* Anti-Cheat Banner */}
        <div style={antiCheatStyle}>
          ⚠️ ANTI-CHEAT ACTIVE: Right-click, copy/paste, and text selection disabled.
        </div>

        {/* Progress Bar */}
        <div style={progressBarContainerStyle}>
          <div style={{ 
            ...progressBarFillStyle, 
            width: `${progressPercentage}%`, 
            background: sectionConfig.color 
          }} />
        </div>

        {/* Main Content */}
        <div style={contentContainerStyle}>
          {/* Question Panel */}
          <div style={{
            ...questionPanelStyle,
            background: `linear-gradient(rgba(255,255,255,0.98), rgba(255,255,255,0.98)), url('${sectionConfig.bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            {/* Question Header */}
            <div style={questionHeaderStyle}>
              <div style={sectionBadgeStyle}>
                <div style={{ ...sectionIconStyle, background: sectionConfig.color }}>
                  {sectionConfig.icon}
                </div>
                <div style={{ ...sectionTitleStyle, color: sectionConfig.color }}>
                  {currentSection}
                </div>
              </div>
              <div style={questionTextStyle}>
                <strong style={{ color: sectionConfig.color }}>
                  Question {currentIndex + 1}:
                </strong>
                <div style={{ marginTop: '10px' }}>{currentQuestion?.question_text}</div>
              </div>
            </div>

            {/* Save Status */}
            {saveStatus[currentQuestion?.id] && (
              <div style={{
                ...saveStatusStyle,
                background: saveStatus[currentQuestion.id] === 'saved' 
                  ? 'rgba(76,175,80,0.1)' 
                  : 'rgba(255,152,0,0.1)',
                borderColor: saveStatus[currentQuestion.id] === 'saved' 
                  ? '#4caf50' 
                  : '#ff9800',
                color: saveStatus[currentQuestion.id] === 'saved' 
                  ? '#2e7d32' 
                  : '#f57c00'
              }}>
                <div style={saveStatusIconStyle}>
                  {saveStatus[currentQuestion.id] === 'saved' ? '✓' : '⏳'}
                </div>
                <span>
                  {saveStatus[currentQuestion.id] === 'saved' 
                    ? 'Answer saved' 
                    : 'Saving...'}
                </span>
              </div>
            )}

            {/* Answer Options */}
            <div style={answersContainerStyle}>
              {currentQuestion?.options?.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                const optionLetter = String.fromCharCode(65 + index);
                
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(currentQuestion.id, option.id)}
                    disabled={saveStatus[currentQuestion.id] === 'saving' || alreadySubmitted}
                    style={{
                      ...answerButtonStyle,
                      background: isSelected ? sectionConfig.lightBg : 'white',
                      borderColor: isSelected ? sectionConfig.color : '#e2e8f0',
                      boxShadow: isSelected ? `0 4px 12px ${sectionConfig.color}30` : 'none'
                    }}
                  >
                    <div style={{ 
                      ...answerLetterStyle, 
                      background: isSelected ? sectionConfig.color : '#f1f5f9',
                      color: isSelected ? 'white' : '#64748b'
                    }}>
                      {optionLetter}
                    </div>
                    <div style={answerTextStyle}>{option.answer_text}</div>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={navigationContainerStyle}>
              <button 
                onClick={handleBack} 
                disabled={currentIndex === 0 || alreadySubmitted}
                style={{
                  ...navButtonStyle,
                  background: currentIndex === 0 || alreadySubmitted ? '#f1f5f9' : sectionConfig.color,
                  color: currentIndex === 0 || alreadySubmitted ? '#94a3b8' : 'white',
                  cursor: currentIndex === 0 || alreadySubmitted ? 'not-allowed' : 'pointer'
                }}
              >
                ← Previous
              </button>
              
              <div style={navInfoStyle}>
                <div style={{ fontWeight: '600' }}>
                  {currentIndex + 1} of {questions.length}
                </div>
                <div style={{ color: sectionConfig.color, fontSize: '12px' }}>
                  {progressPercentage}% Complete
                </div>
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  disabled={alreadySubmitted}
                  style={{
                    ...navButtonStyle,
                    background: alreadySubmitted ? '#f1f5f9' : '#4caf50',
                    color: alreadySubmitted ? '#94a3b8' : 'white',
                    cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                  }}
                >
                  Submit
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  disabled={alreadySubmitted}
                  style={{
                    ...navButtonStyle,
                    background: alreadySubmitted ? '#f1f5f9' : sectionConfig.color,
                    color: alreadySubmitted ? '#94a3b8' : 'white',
                    cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Navigator Panel */}
          <div style={navigatorPanelStyle}>
            <div style={navigatorTitleStyle}>📋 Question Navigator</div>
            
            {/* Stats Summary */}
            <div style={statsSummaryStyle}>
              <div style={statItemStyle}>
                <div style={{ color: '#4caf50', fontSize: '24px', fontWeight: '700' }}>
                  {totalAnswered}
                </div>
                <div style={statLabelStyle}>Answered</div>
              </div>
              <div style={statItemStyle}>
                <div style={{ color: '#64748b', fontSize: '24px', fontWeight: '700' }}>
                  {questions.length - totalAnswered}
                </div>
                <div style={statLabelStyle}>Remaining</div>
              </div>
              <div style={statItemStyle}>
                <div style={{ color: '#2196f3', fontSize: '24px', fontWeight: '700' }}>
                  {progressPercentage}%
                </div>
                <div style={statLabelStyle}>Complete</div>
              </div>
            </div>

            {/* Timer Progress */}
            <div style={timerProgressStyle}>
              <div style={timerProgressHeaderStyle}>
                <span>⏰ Time Remaining (180 mins)</span>
                <span style={{ fontWeight: '700' }}>
                  {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
                </span>
              </div>
              <div style={timerProgressBarContainerStyle}>
                <div style={{
                  ...timerProgressBarFillStyle,
                  width: `${(elapsed / timeLimitSeconds) * 100}%`,
                  background: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#2196f3'
                }} />
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: '#64748b', 
                marginTop: '8px',
                textAlign: 'center'
              }}>
                {Math.round((elapsed / timeLimitSeconds) * 100)}% used
              </div>
            </div>

            {/* Question Grid */}
            <div style={questionGridStyle}>
              {questions.map((q, index) => {
                const isAnswered = answers[q.id];
                const isCurrent = index === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => !alreadySubmitted && setCurrentIndex(index)}
                    disabled={alreadySubmitted}
                    style={{
                      ...gridItemStyle,
                      background: isCurrent 
                        ? sectionConfig.color 
                        : isAnswered 
                          ? '#4caf50' 
                          : '#f1f5f9',
                      color: isCurrent || isAnswered ? 'white' : '#64748b',
                      borderColor: isCurrent 
                        ? sectionConfig.color 
                        : isAnswered 
                          ? '#4caf50' 
                          : '#e2e8f0',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                    title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ' (Not answered)'}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={legendStyle}>
              <div style={legendItemStyle}>
                <div style={{ ...legendDotStyle, background: '#4caf50' }} />
                <span style={{ fontSize: '11px' }}>Answered</span>
              </div>
              <div style={legendItemStyle}>
                <div style={{ ...legendDotStyle, background: sectionConfig.color }} />
                <span style={{ fontSize: '11px' }}>Current</span>
              </div>
              <div style={legendItemStyle}>
                <div style={{ 
                  ...legendDotStyle, 
                  background: '#f1f5f9', 
                  border: '1px solid #e2e8f0' 
                }} />
                <span style={{ fontSize: '11px' }}>Pending</span>
              </div>
              <div style={legendItemStyle}>
                <div style={{ 
                  ...legendDotStyle, 
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  ⏰
                </div>
                <span style={{ fontSize: '11px' }}>180 mins</span>
              </div>
            </div>
            
            {/* Back to Selection Button (Mobile/Quick Access) */}
            <button
              onClick={() => router.push('/assessment/pre')}
              style={{
                marginTop: '15px',
                padding: '10px',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              ← Back to Assessment Selection
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ===== STYLES =====
const loadingContainerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const loadingContentStyle = {
  textAlign: 'center',
  color: 'white',
  padding: '40px',
  maxWidth: '500px'
};

const loadingTitleStyle = {
  fontSize: '28px',
  fontWeight: '700',
  marginBottom: '20px'
};

const loadingSubtitleStyle = {
  fontSize: '18px',
  marginBottom: '30px'
};

const loadingSpinnerStyle = {
  width: '60px',
  height: '60px',
  border: '5px solid rgba(255,255,255,0.3)',
  borderTop: '5px solid white',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto'
};

const errorContainerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const errorCardStyle = {
  background: 'white',
  padding: '40px',
  borderRadius: '20px',
  maxWidth: '500px',
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};

const errorIconStyle = {
  fontSize: '48px',
  marginBottom: '20px'
};

const errorTitleStyle = {
  color: '#1a2639',
  marginBottom: '15px',
  fontSize: '24px',
  fontWeight: '700'
};

const errorTextStyle = {
  color: '#64748b',
  marginBottom: '25px',
  fontSize: '16px',
  lineHeight: '1.6'
};

const primaryButtonStyle = {
  padding: '12px 30px',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const successIconStyle = {
  fontSize: '48px',
  marginBottom: '20px'
};

const successIconLargeStyle = {
  width: '100px',
  height: '100px',
  background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 25px',
  fontSize: '50px',
  color: 'white'
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: '20px'
};

const modalContentStyle = {
  background: 'white',
  padding: '40px',
  borderRadius: '20px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
};

const modalTitleStyle = {
  margin: '0 0 20px 0',
  color: '#1565c0',
  fontSize: '28px',
  fontWeight: '700'
};

const modalBodyStyle = {
  margin: '25px 0',
  padding: '25px',
  background: '#f8f9fa',
  borderRadius: '15px',
  border: '2px solid #e3f2fd'
};

const modalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '15px',
  fontSize: '16px'
};

const modalWarningStyle = {
  fontSize: '14px',
  color: '#666',
  padding: '12px',
  background: '#fff8e1',
  borderRadius: '8px',
  borderLeft: '4px solid #ff9800',
  marginTop: '15px'
};

const modalButtonContainerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '15px'
};

const modalSecondaryButtonStyle = {
  padding: '12px 24px',
  background: '#f1f5f9',
  color: '#64748b',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '16px'
};

const modalPrimaryButtonStyle = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: '700',
  fontSize: '16px'
};

const mainContainerStyle = {
  minHeight: '100vh',
  background: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
};

const headerStyle = {
  background: 'linear-gradient(135deg, #1a2639 0%, #2d3748 100%)',
  padding: '15px 25px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.1)'
};

const headerLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
};

const backButtonStyle = {
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  color: 'white',
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '18px',
  marginRight: '5px',
  transition: 'all 0.2s'
};

const headerIconStyle = {
  width: '45px',
  height: '45px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px'
};

const headerTitleStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: 'white',
  marginBottom: '4px'
};

const headerSubtitleStyle = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.7)'
};

const timerStyle = {
  padding: '8px 15px',
  background: 'rgba(255,255,255,0.1)',
  borderRadius: '8px',
  textAlign: 'center',
  border: '1px solid',
  minWidth: '140px'
};

const antiCheatStyle = {
  padding: '8px 15px',
  background: 'linear-gradient(135deg, #ff9800, #f57c00)',
  color: 'white',
  textAlign: 'center',
  fontSize: '12px',
  fontWeight: '600'
};

const progressBarContainerStyle = {
  height: '4px',
  background: '#e2e8f0',
  overflow: 'hidden'
};

const progressBarFillStyle = {
  height: '100%',
  transition: 'width 0.3s ease'
};

const contentContainerStyle = {
  flex: 1,
  padding: '20px',
  display: 'flex',
  gap: '20px',
  overflow: 'hidden'
};

const questionPanelStyle = {
  flex: 7,
  background: 'white',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '25px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
};

const questionHeaderStyle = {
  marginBottom: '25px',
  paddingBottom: '20px',
  borderBottom: '2px solid #f1f5f9'
};

const sectionBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '15px'
};

const sectionIconStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontSize: '16px'
};

const sectionTitleStyle = {
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const questionTextStyle = {
  fontSize: '18px',
  lineHeight: '1.6',
  color: '#1e293b'
};

const saveStatusStyle = {
  padding: '10px 15px',
  border: '1px solid',
  borderRadius: '8px',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  fontWeight: '500'
};

const saveStatusIconStyle = {
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontSize: '12px'
};

const answersContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  flex: 1
};

const answerButtonStyle = {
  padding: '16px 20px',
  border: '2px solid',
  borderRadius: '12px',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '15px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '15px',
  transition: 'all 0.2s'
};

const answerLetterStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: '700',
  flexShrink: 0
};

const answerTextStyle = {
  flex: 1,
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#334155'
};

const navigationContainerStyle = {
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '2px solid #f1f5f9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const navButtonStyle = {
  padding: '12px 28px',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600',
  transition: 'all 0.2s'
};

const navInfoStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  fontSize: '14px',
  color: '#64748b'
};

const navigatorPanelStyle = {
  flex: 3,
  background: 'white',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  minWidth: '280px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
};

const navigatorTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
  textAlign: 'center',
  paddingBottom: '15px',
  borderBottom: '2px solid #f1f5f9',
  marginBottom: '15px'
};

const statsSummaryStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  background: '#f8fafc',
  borderRadius: '12px',
  padding: '15px',
  marginBottom: '15px'
};

const statItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px'
};

const statLabelStyle = {
  fontSize: '11px',
  color: '#64748b'
};

const timerProgressStyle = {
  background: '#f8fafc',
  borderRadius: '12px',
  padding: '15px',
  marginBottom: '20px'
};

const timerProgressHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '10px',
  fontSize: '12px',
  color: '#64748b'
};

const timerProgressBarContainerStyle = {
  height: '8px',
  background: '#e2e8f0',
  borderRadius: '4px',
  overflow: 'hidden'
};

const timerProgressBarFillStyle = {
  height: '100%',
  borderRadius: '4px',
  transition: 'width 0.3s ease'
};

const questionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  gap: '6px',
  marginBottom: '20px'
};

const gridItemStyle = {
  aspectRatio: '1',
  border: '2px solid',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
};

const legendStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  paddingTop: '15px',
  borderTop: '2px solid #f1f5f9',
  fontSize: '11px'
};

const legendItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px',
  background: '#f8fafc',
  borderRadius: '6px'
};

const legendDotStyle = {
  width: '14px',
  height: '14px',
  borderRadius: '4px'
};
