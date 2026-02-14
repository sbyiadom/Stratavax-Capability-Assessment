// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== SECTION CONFIGURATIONS =====
const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    icon: '🧠', 
    bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1920&q=80',
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #2C3E50 100%)'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    icon: '😊', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    icon: '👑', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    gradient: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)'
  },
  'Technical Competence': { 
    color: '#388E3C', 
    icon: '⚙️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    gradient: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    icon: '📊', 
    bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
    gradient: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)'
  }
};

// ===== ASSESSMENT TYPE CONFIGURATIONS =====
const ASSESSMENT_TYPE_CONFIG = {
  'general': {
    name: 'General Assessment',
    timeLimit: 10800, // 3 hours in seconds
    maxScore: 500,
    sections: ['Cognitive Abilities', 'Personality Assessment', 'Leadership Potential', 'Technical Competence', 'Performance Metrics']
  },
  'leadership': {
    name: 'Leadership Assessment',
    timeLimit: 3600, // 1 hour in seconds
    maxScore: 100,
    sections: ['Leadership Potential']
  },
  'cognitive': {
    name: 'Cognitive Ability Assessment',
    timeLimit: 3600, // 1 hour in seconds
    maxScore: 100,
    sections: ['Cognitive Abilities']
  },
  'technical': {
    name: 'Technical Assessment',
    timeLimit: 3600, // 1 hour in seconds
    maxScore: 100,
    sections: ['Technical Competence']
  },
  'personality': {
    name: 'Personality Assessment',
    timeLimit: 2700, // 45 minutes in seconds
    maxScore: 100,
    sections: ['Personality Assessment']
  },
  'performance': {
    name: 'Performance Assessment',
    timeLimit: 2700, // 45 minutes in seconds
    maxScore: 100,
    sections: ['Performance Metrics']
  }
};

// ===== TIMER FUNCTIONS =====
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
  if (typeof window === 'undefined') return;
  
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
    // Check in candidate_assessments_taken first
    const { data, error } = await supabase
      .from("candidate_assessments_taken")
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

// ===== CREATE ASSESSMENT RESULT =====
async function createAssessmentResult(userId, assessmentId, assessmentType) {
  try {
    const { data, error } = await supabase
      .from("assessment_results")
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        assessment_type: assessmentType,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        responses: {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating assessment result:", error);
    return null;
  }
}

// ===== SUBMIT ASSESSMENT =====
async function submitAssessment(userId, assessmentId, resultId, timeSpent, assessmentType) {
  try {
    const response = await fetch('/api/supervisor/submit-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assessment_id: assessmentId, 
        user_id: userId,
        result_id: resultId,
        time_spent: timeSpent
      })
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
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(10800);
  const [assessmentType, setAssessmentType] = useState('general');
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);
  const [hoveredAnswer, setHoveredAnswer] = useState(null);

  // ===== FETCH ASSESSMENT DETAILS =====
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
          
          // Set assessment type and time limit
          const type = data.assessment_type || 'general';
          setAssessmentType(type);
          
          const config = ASSESSMENT_TYPE_CONFIG[type] || ASSESSMENT_TYPE_CONFIG.general;
          setTimeLimitSeconds(config.timeLimit);
          
          document.title = `${data.name} - Stratavax Assessment`;
        }
      } catch (error) {
        console.error("Error fetching assessment details:", error);
      }
    };
    
    fetchAssessmentDetails();
  }, [assessmentId, isSessionReady, alreadySubmitted]);

  // ===== INITIALIZE SESSION AND CREATE RESULT =====
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
          
          // Create assessment result record
          const result = await createAssessmentResult(
            data.session.user.id, 
            assessmentId, 
            assessmentType
          );
          
          if (result) {
            setAssessmentResult(result);
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
  }, [assessmentId, router, assessmentType]);

  // ===== FETCH QUESTIONS =====
  useEffect(() => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId) {
      return;
    }

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
            question_order,
            answers (
              id, 
              answer_text
            )
          `)
          .eq("assessment_id", assessmentId)
          .order("question_order", { ascending: true })
          .order("id", { ascending: true });

        if (questionsError) {
          console.error("Questions fetch error:", questionsError);
          throw new Error(`Failed to load questions: ${questionsError.message}`);
        }
        
        if (!questionsData || questionsData.length === 0) {
          throw new Error("No questions found for this assessment.");
        }

        const savedAnswers = await loadUserResponses(session.user.id, assessmentId);

        const processedQuestions = questionsData.map((q, index) => {
          const options = q.answers && Array.isArray(q.answers) && q.answers.length > 0
            ? q.answers.map(a => ({ 
                ...a, 
                id: parseInt(a.id),
                answer_text: a.answer_text || 'Option text missing'
              }))
            : [];
          
          return {
            ...q,
            id: parseInt(q.id),
            question_number: index + 1,
            options: trulyRandomizeAnswers([...options])
          };
        });

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
        setError(null);
        
        const firstUnanswered = processedQuestions.findIndex(q => !savedAnswers[q.id]);
        if (firstUnanswered > 0) {
          setCurrentIndex(firstUnanswered);
        }
        
      } catch (error) {
        console.error("❌ Assessment loading error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId, isSessionReady, session?.user?.id, alreadySubmitted]);

  // ===== TIMER =====
  useEffect(() => {
    if (alreadySubmitted || !session?.user?.id || !isSessionReady || !assessmentId || !assessment || questions.length === 0) return;

    let timerInterval;
    let localElapsed = 0;
    let isMounted = true;
    
    const initializeTimer = async () => {
      try {
        const savedElapsed = await startOrResumeTimer(session.user.id, assessmentId);
        
        if (!isMounted) return;
        
        localElapsed = savedElapsed;
        setElapsed(savedElapsed);
        
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
              await handleSubmitAssessment();
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
  }, [alreadySubmitted, session?.user?.id, isSessionReady, assessmentId, assessment, questions.length, timeLimitSeconds]);

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (alreadySubmitted) return;
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToQuestion = (index) => {
    if (!alreadySubmitted) {
      setCurrentIndex(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ===== HANDLE SUBMIT ASSESSMENT =====
  const handleSubmitAssessment = async () => {
    if (alreadySubmitted || !session?.user?.id || !assessmentId || !assessmentResult) return;

    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    try {
      await submitAssessment(
        session.user.id, 
        assessmentId, 
        assessmentResult.id, 
        elapsed,
        assessmentType
      );
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

  // ===== RETRY FETCH =====
  const handleRetry = () => {
    window.location.reload();
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingTitle}>Loading Assessment...</div>
          <div style={styles.loadingSubtitle}>Preparing your questions</div>
        </div>
      </div>
    );
  }

  // ===== ALREADY SUBMITTED =====
  if (alreadySubmitted) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.messageTitle}>Assessment Already Completed</h2>
          <p style={styles.messageText}>
            You have already submitted this assessment. Each assessment can only be taken once.
          </p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={styles.primaryButton}
          >
            ← Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.messageTitle}>Error Loading Assessment</h2>
          <p style={styles.messageText}>{error}</p>
          <button
            onClick={handleRetry}
            style={styles.primaryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>📭</div>
          <h2 style={styles.messageTitle}>No Questions Available</h2>
          <p style={styles.messageText}>
            This assessment doesn't have any questions yet.
          </p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={styles.primaryButton}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || 'General';
  const sectionConfig = SECTION_CONFIG[currentSection] || {
    color: '#4A6FA5',
    icon: '📝',
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    gradient: 'linear-gradient(135deg, #4A6FA5, #2C3E50)'
  };

  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;
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

  const assessmentConfig = ASSESSMENT_TYPE_CONFIG[assessmentType] || ASSESSMENT_TYPE_CONFIG.general;

  return (
    <>
      {/* Submit Modal */}
      {showSubmitModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIcon}>📋</div>
            <h2 style={styles.modalTitle}>Ready to Submit?</h2>
            <div style={styles.modalBody}>
              <div style={styles.modalStats}>
                <div style={styles.modalStat}>
                  <span>Questions Answered</span>
                  <span style={{fontWeight: '700', color: '#4caf50'}}>{totalAnswered}/{questions.length}</span>
                </div>
                <div style={styles.modalStat}>
                  <span>Completion Rate</span>
                  <span style={{fontWeight: '700', color: '#2196f3'}}>{progressPercentage}%</span>
                </div>
                <div style={styles.modalStat}>
                  <span>Assessment Type</span>
                  <span style={{fontWeight: '700', color: '#9C27B0'}}>{assessmentConfig.name}</span>
                </div>
              </div>
              <div style={styles.modalWarning}>
                <span>⚠️</span>
                <span><strong>One attempt only:</strong> After submission, you cannot retake this assessment.</span>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowSubmitModal(false)} style={styles.modalSecondaryButton}>
                Continue Reviewing
              </button>
              <button onClick={handleSubmitAssessment} disabled={isSubmitting} style={styles.modalPrimaryButton}>
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, textAlign: 'center'}}>
            <div style={styles.successIconLarge}>✓</div>
            <h2 style={{...styles.modalTitle, color: '#2e7d32'}}>Assessment Complete!</h2>
            <p style={styles.successText}>Your {assessmentConfig.name} has been successfully submitted.</p>
            <p style={styles.redirectText}>Redirecting to assessment selection...</p>
          </div>
        </div>
      )}

      {/* Main Assessment Layout */}
      <div style={styles.container}>
        {/* Header */}
        <div style={{
          ...styles.header,
          background: sectionConfig.gradient
        }}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button
                onClick={() => router.push('/assessment/pre')}
                style={styles.backButton}
              >
                ←
              </button>
              
              <div style={styles.headerIcon}>
                {sectionConfig.icon}
              </div>
              
              <div style={styles.headerInfo}>
                <div style={styles.headerTitle}>
                  {assessment?.name || assessmentConfig.name}
                </div>
                <div style={styles.headerMeta}>
                  <span>Q{currentIndex + 1}/{questions.length}</span>
                  <span>•</span>
                  <span>{currentSection}</span>
                  <span>•</span>
                  <span style={{fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px'}}>
                    Max Score: {assessmentConfig.maxScore}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Timer */}
            <div style={{
              ...styles.timer,
              background: isTimeCritical ? '#d32f2f20' : isTimeWarning ? '#ff980020' : 'rgba(255,255,255,0.15)',
              borderColor: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : 'rgba(255,255,255,0.3)'
            }}>
              <div style={styles.timerLabel}>TIME REMAINING</div>
              <div style={{
                ...styles.timerValue,
                color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : 'white'
              }}>
                {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressFill,
              width: `${progressPercentage}%`,
              background: sectionConfig.gradient
            }} />
          </div>
          <div style={styles.progressStats}>
            <span>{totalAnswered} answered</span>
            <span>{questions.length - totalAnswered} remaining</span>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Question Panel */}
          <div style={styles.questionPanel}>
            <div style={styles.questionContent}>
              <div style={styles.sectionBadge}>
                <div style={{
                  ...styles.sectionIcon,
                  background: sectionConfig.gradient
                }}>
                  {sectionConfig.icon}
                </div>
                <div>
                  <div style={styles.sectionName}>{currentSection}</div>
                </div>
              </div>

              <div style={styles.questionText}>
                <div style={styles.questionNumber}>
                  Question {currentIndex + 1} of {questions.length}
                </div>
                <div style={styles.questionContent}>
                  {currentQuestion?.question_text}
                </div>
              </div>

              {saveStatus[currentQuestion?.id] && (
                <div style={{
                  ...styles.saveStatus,
                  background: saveStatus[currentQuestion.id] === 'saved' ? '#4caf5010' : '#ff980010',
                  borderColor: saveStatus[currentQuestion.id] === 'saved' ? '#4caf50' : '#ff9800',
                  color: saveStatus[currentQuestion.id] === 'saved' ? '#2e7d32' : '#f57c00'
                }}>
                  <span>
                    {saveStatus[currentQuestion.id] === 'saved' ? '✓ Answer saved' : '⏳ Saving...'}
                  </span>
                </div>
              )}

              <div style={styles.answersContainer}>
                {currentQuestion?.options?.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  const isHovered = hoveredAnswer === option.id;
                  const optionLetter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveStatus[currentQuestion.id] === 'saving' || alreadySubmitted}
                      style={{
                        ...styles.answerButton,
                        background: isSelected ? sectionConfig.color : isHovered ? '#f8fafc' : 'white',
                        borderColor: isSelected ? sectionConfig.color : '#e2e8f0',
                        transform: isSelected || isHovered ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                      onMouseEnter={() => setHoveredAnswer(option.id)}
                      onMouseLeave={() => setHoveredAnswer(null)}
                    >
                      <div style={{
                        ...styles.answerLetter,
                        background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                        color: isSelected ? 'white' : '#475569'
                      }}>
                        {optionLetter}
                      </div>
                      <span style={{
                        ...styles.answerText,
                        color: isSelected ? 'white' : '#1e293b'
                      }}>
                        {option.answer_text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={styles.navigation}>
                <button 
                  onClick={handleBack} 
                  disabled={currentIndex === 0 || alreadySubmitted}
                  style={{
                    ...styles.navButton,
                    background: currentIndex === 0 || alreadySubmitted ? '#f1f5f9' : 'white',
                    color: currentIndex === 0 || alreadySubmitted ? '#94a3b8' : sectionConfig.color,
                    border: currentIndex === 0 || alreadySubmitted ? '1px solid #e2e8f0' : `2px solid ${sectionConfig.color}`
                  }}
                >
                  ← Previous
                </button>
                
                {isLastQuestion ? (
                  <button 
                    onClick={() => setShowSubmitModal(true)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.navButton,
                      background: alreadySubmitted ? '#f1f5f9' : '#4caf50',
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      border: 'none'
                    }}
                  >
                    Submit Assessment
                  </button>
                ) : (
                  <button 
                    onClick={handleNext} 
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.navButton,
                      background: alreadySubmitted ? '#f1f5f9' : sectionConfig.color,
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      border: 'none'
                    }}
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigator Panel */}
          <div style={styles.navigatorPanel}>
            <div style={styles.navigatorHeader}>
              <span style={styles.navigatorIcon}>📋</span>
              <h3 style={styles.navigatorTitle}>Question Navigator</h3>
            </div>
            
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: '#4caf50'}}>{totalAnswered}</div>
                <div style={styles.statLabel}>Answered</div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: '#64748b'}}>{questions.length - totalAnswered}</div>
                <div style={styles.statLabel}>Remaining</div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: sectionConfig.color}}>{progressPercentage}%</div>
                <div style={styles.statLabel}>Complete</div>
              </div>
            </div>

            <div style={styles.questionGrid}>
              {questions.map((q, index) => {
                const isAnswered = answers[q.id];
                const isCurrent = index === currentIndex;
                const isHovered = hoveredQuestion === index;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(index)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.gridItem,
                      background: isCurrent ? sectionConfig.color : isAnswered ? '#4caf50' : 'white',
                      color: isCurrent || isAnswered ? 'white' : '#1e293b',
                      borderColor: isCurrent ? sectionConfig.color : isAnswered ? '#4caf50' : '#e2e8f0',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                    }}
                    onMouseEnter={() => setHoveredQuestion(index)}
                    onMouseLeave={() => setHoveredQuestion(null)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{...styles.legendDot, background: '#4caf50'}} />
                <span>Answered</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{...styles.legendDot, background: sectionConfig.color}} />
                <span>Current</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{...styles.legendDot, background: 'white', border: '2px solid #e2e8f0'}} />
                <span>Pending</span>
              </div>
            </div>

            {/* Assessment Info */}
            <div style={styles.assessmentInfo}>
              <div style={styles.infoRow}>
                <span>Assessment Type:</span>
                <span style={{fontWeight: '600', color: '#9C27B0'}}>{assessmentConfig.name}</span>
              </div>
              <div style={styles.infoRow}>
                <span>Max Score:</span>
                <span style={{fontWeight: '600'}}>{assessmentConfig.maxScore}</span>
              </div>
            </div>
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
const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  loadingContent: {
    textAlign: 'center',
    color: 'white'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '10px'
  },
  loadingSubtitle: {
    fontSize: '16px',
    opacity: 0.9
  },
  messageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  messageCard: {
    background: 'white',
    padding: '50px',
    borderRadius: '20px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  messageTitle: {
    color: '#1a2639',
    marginBottom: '15px',
    fontSize: '28px',
    fontWeight: '700'
  },
  messageText: {
    color: '#64748b',
    marginBottom: '30px',
    fontSize: '16px',
    lineHeight: '1.6'
  },
  primaryButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    color: 'white'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '20px'
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700'
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    opacity: 0.9,
    flexWrap: 'wrap'
  },
  timer: {
    padding: '10px 20px',
    borderRadius: '10px',
    textAlign: 'center',
    border: '1px solid',
    minWidth: '160px'
  },
  timerLabel: {
    fontSize: '11px',
    fontWeight: '600',
    marginBottom: '4px',
    letterSpacing: '0.5px'
  },
  timerValue: {
    fontSize: '22px',
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  progressContainer: {
    maxWidth: '1400px',
    margin: '20px auto 10px',
    padding: '0 24px'
  },
  progressTrack: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px 40px',
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap'
  },
  questionPanel: {
    flex: '1 1 700px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  questionContent: {
    padding: '40px'
  },
  sectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  sectionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'white'
  },
  sectionName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b'
  },
  questionText: {
    background: '#f8fafc',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  questionNumber: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '10px'
  },
  questionContent: {
    fontSize: '20px',
    lineHeight: '1.6',
    color: '#1e293b',
    fontWeight: '500'
  },
  saveStatus: {
    padding: '12px',
    border: '1px solid',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '30px'
  },
  answerButton: {
    padding: '18px 20px',
    border: '2px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
    width: '100%'
  },
  answerLetter: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    flexShrink: 0
  },
  answerText: {
    flex: 1,
    fontSize: '16px',
    lineHeight: '1.5'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px'
  },
  navButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  navigatorPanel: {
    flex: '1 1 300px',
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: '100px',
    height: 'fit-content'
  },
  navigatorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f1f5f9',
    marginBottom: '20px'
  },
  navigatorIcon: {
    fontSize: '20px'
  },
  navigatorTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#f8fafc',
    borderRadius: '10px',
    padding: '12px 8px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: 1,
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
    marginBottom: '20px',
    maxHeight: '250px',
    overflowY: 'auto',
    padding: '5px'
  },
  gridItem: {
    aspectRatio: '1',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  legend: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
    paddingTop: '15px',
    borderTop: '2px solid #f1f5f9',
    marginBottom: '15px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#475569'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '4px'
  },
  assessmentInfo: {
    background: '#f8fafc',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '10px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#475569',
    marginBottom: '8px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  modalIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a2639',
    textAlign: 'center',
    marginBottom: '20px'
  },
  modalBody: {
    marginBottom: '30px'
  },
  modalStats: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '15px'
  },
  modalStat: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '16px'
  },
  modalWarning: {
    display: 'flex',
    gap: '10px',
    padding: '15px',
    background: '#fff8e1',
    borderRadius: '10px',
    color: '#856404',
    fontSize: '14px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px'
  },
  modalSecondaryButton: {
    padding: '12px 24px',
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  modalPrimaryButton: {
    padding: '12px 28px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  successIconLarge: {
    width: '80px',
    height: '80px',
    background: '#4caf50',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '40px',
    color: 'white'
  },
  successText: {
    fontSize: '16px',
    color: '#1e293b',
    marginBottom: '20px',
    textAlign: 'center'
  },
  redirectText: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center'
  }
};
