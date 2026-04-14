import { useEffect, useState, useRef } from "react";
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

// ===== TIMER FUNCTIONS =====
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// ===== SIMPLIFIED ANTI-CHEAT - ONLY COPY & SCREENSHOT PROTECTION =====
const setupAntiCheat = () => {
  if (typeof window === 'undefined') return () => {};

  // 1. Prevent copy
  const preventCopy = (e) => {
    e.preventDefault();
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      font-size: 14px;
    `;
    warning.textContent = '⚠️ Copying is not allowed during the assessment.';
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 2000);
    return false;
  };
  
  // 2. Prevent paste
  const preventPaste = (e) => {
    e.preventDefault();
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      font-size: 14px;
    `;
    warning.textContent = '⚠️ Pasting is not allowed during the assessment.';
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 2000);
    return false;
  };
  
  // 3. Prevent cut
  const preventCut = (e) => {
    e.preventDefault();
    return false;
  };
  
  // 4. Detect PrintScreen / Screenshot attempt
  const detectScreenCapture = (e) => {
    if (e.key === 'PrintScreen' || e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      e.preventDefault();
      const warning = document.createElement('div');
      warning.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f44336;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 10000;
        font-size: 14px;
      `;
      warning.textContent = '⚠️ Screenshot capture is not allowed during the assessment.';
      document.body.appendChild(warning);
      setTimeout(() => warning.remove(), 2000);
      return false;
    }
  };
  
  // Add event listeners
  document.addEventListener('copy', preventCopy);
  document.addEventListener('paste', preventPaste);
  document.addEventListener('cut', preventCut);
  document.addEventListener('keydown', detectScreenCapture);
  
  // Add CSS to prevent text selection
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
  `;
  document.head.appendChild(style);

  console.log("🔒 Anti-cheat enabled: copy, paste, cut, screenshot protection only");

  // Return cleanup function
  return () => {
    document.removeEventListener('copy', preventCopy);
    document.removeEventListener('paste', preventPaste);
    document.removeEventListener('cut', preventCut);
    document.removeEventListener('keydown', detectScreenCapture);
    document.head.removeChild(style);
  };
};

export default function AssessmentPage() {
  const router = useRouter();
  const { id: assessmentId } = router.query;

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [assessmentType, setAssessmentType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  
  // Assessment state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [initialAnswers, setInitialAnswers] = useState({}); // Track first instinct
  const [answerChangeCount, setAnswerChangeCount] = useState({}); // Track times changed per question
  const [saveStatus, setSaveStatus] = useState({});
  
  // ===== TIMING TRACKING =====
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimings, setQuestionTimings] = useState({}); // Store time spent per question
  const sessionIdRef = useRef(null);
  
  // Timer - Set to 3 hours (10800 seconds) for all assessments
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(10800);
  const [timeRemaining, setTimeRemaining] = useState(10800);
  
  // UI state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);
  const [hoveredAnswer, setHoveredAnswer] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [antiCheatCleanup, setAntiCheatCleanup] = useState(null);

  // Auth state listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔐 Auth state changed:", event, session?.user?.id);
      if (event === 'SIGNED_OUT') {
        console.log("User signed out, redirecting to login");
        router.push('/login');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Check if assessment is unblocked for this user
  const checkAssessmentAccess = async (userId, assessmentId) => {
    try {
      const completed = await isAssessmentCompleted(userId, assessmentId);
      if (completed) {
        setAlreadySubmitted(true);
        setAccessChecked(true);
        return false;
      }

      const { data, error } = await supabase
        .from('candidate_assessments')
        .select('status')
        .eq('user_id', userId)
        .eq('assessment_id', assessmentId)
        .maybeSingle();

      if (error) throw error;

      const hasAccess = data?.status === 'unblocked';
      
      if (!hasAccess) {
        setAccessDenied(true);
      }
      
      setAccessChecked(true);
      return hasAccess;

    } catch (error) {
      console.error("Error checking assessment access:", error);
      setAccessDenied(true);
      setAccessChecked(true);
      return false;
    }
  };

  // Initialize assessment with access check
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          router.push("/login");
          return;
        }
        setUser(authSession.user);

        if (!assessmentId) return;

        const hasAccess = await checkAssessmentAccess(authSession.user.id, assessmentId);
        
        if (!hasAccess) {
          setLoading(false);
          return;
        }

        const completed = await isAssessmentCompleted(authSession.user.id, assessmentId);
        if (completed) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        const assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);
        setAssessmentType(assessmentData?.assessment_type);
        setTimeLimit(10800);
        setTimeRemaining(10800);

        const sessionData = await createAssessmentSession(
          authSession.user.id,
          assessmentId,
          assessmentData?.assessment_type?.id
        );
        setSession(sessionData);
        
        // Store session ID for behavioral tracking
        if (sessionData?.id) {
          sessionIdRef.current = sessionData.id;
          console.log("📌 Session ID for behavioral tracking:", sessionData.id);
        }

        const progress = await getProgress(authSession.user.id, assessmentId);
        if (progress) {
          setElapsedSeconds(progress.elapsed_seconds || 0);
        }

        console.log("🔍 Loading unique questions...");
        const uniqueQuestions = await getUniqueQuestions(assessmentId);
        console.log(`📊 Loaded ${uniqueQuestions?.length || 0} unique questions`);
        
        setQuestions(uniqueQuestions || []);

        if (sessionData?.id) {
          const responses = await getSessionResponses(sessionData.id);
          if (responses?.answerMap) {
            setAnswers(responses.answerMap);
            // Also load initial answers if stored
            if (responses.initialAnswerMap) {
              setInitialAnswers(responses.initialAnswerMap);
            }
            
            if (progress?.last_question_id && uniqueQuestions?.length > 0) {
              const lastIndex = uniqueQuestions.findIndex(q => q.id === progress.last_question_id);
              if (lastIndex >= 0) setCurrentIndex(lastIndex);
            }
          }
        }
        
        // Start timing for the first question
        setQuestionStartTime(Date.now());

        setLoading(false);
      } catch (error) {
        console.error("❌ Initialization error:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    init();
  }, [assessmentId, router]);

  // Setup anti-cheat after loading is complete
  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session) return;

    const cleanup = setupAntiCheat();
    setAntiCheatCleanup(() => cleanup);

    return () => {
      if (cleanup) cleanup();
    };
  }, [loading, alreadySubmitted, accessDenied, session]);

  // Timer effect
  useEffect(() => {
    if (loading || alreadySubmitted || !session || accessDenied) return;

    const timer = setInterval(async () => {
      setElapsedSeconds(prev => {
        const newElapsed = prev + 1;
        setTimeRemaining(timeLimit - newElapsed);
        
        if (newElapsed >= timeLimit) {
          handleTimeExpired();
        }
        
        if (newElapsed % 30 === 0) {
          saveProgress(session.id, user.id, assessmentId, newElapsed, questions[currentIndex]?.id);
          updateSessionTimer(session.id, newElapsed);
        }
        
        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, alreadySubmitted, session, timeLimit, assessmentId, user?.id, currentIndex, questions, accessDenied]);

  // Save timing when moving between questions
  const saveQuestionTiming = async (questionId, timeSpentSeconds) => {
    if (!sessionIdRef.current || !questionId || !user?.id) return;
    
    try {
      // Save to question_timing table
      const { error } = await supabase
        .from('question_timing')
        .upsert({
          session_id: sessionIdRef.current,
          question_id: questionId,
          user_id: user.id,
          assessment_id: assessmentId,
          time_spent_seconds: timeSpentSeconds,
          visit_count: (questionTimings[questionId]?.visit_count || 0) + 1,
          last_answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_id, question_id'
        });
      
      if (error) {
        console.error("❌ Error saving question timing:", error);
      } else {
        console.log(`⏱️ Saved timing for question ${questionId}: ${timeSpentSeconds}s`);
      }
      
      // Update local state
      setQuestionTimings(prev => ({
        ...prev,
        [questionId]: {
          time_spent: timeSpentSeconds,
          visit_count: (prev[questionId]?.visit_count || 0) + 1
        }
      }));
    } catch (error) {
      console.error("❌ Error in saveQuestionTiming:", error);
    }
  };

  // Handle time expiration
  const handleTimeExpired = async () => {
    if (alreadySubmitted || isSubmitting) return;
    
    alert("Time's up! Your assessment will be submitted automatically.");
    
    try {
      setIsSubmitting(true);
      
      await Promise.all([
        saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id),
        updateSessionTimer(session.id, elapsedSeconds)
      ]);
      
      await submitAssessment(session.id);
      setAlreadySubmitted(true);
      router.push('/candidate/dashboard');
    } catch (error) {
      console.error("Auto-submit error:", error);
      alert("Failed to auto-submit. Please contact support.");
      setIsSubmitting(false);
    }
  };

  // Handle answer selection with full behavioral tracking
  const handleAnswerSelect = async (questionId, answerId) => {
    if (alreadySubmitted || !session || !questionId || !answerId || accessDenied) return;

    // Calculate time spent on this question
    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    
    // Check if this is a change (already has an answer)
    const previousAnswer = answers[questionId];
    const isAnswerChange = previousAnswer && previousAnswer !== answerId;
    const isFirstAnswer = !previousAnswer;
    
    // Track times changed for this question
    const currentChangeCount = answerChangeCount[questionId] || 0;
    const newChangeCount = isAnswerChange ? currentChangeCount + 1 : currentChangeCount;
    
    // Capture first instinct (initial answer)
    let initialAnswerId = initialAnswers[questionId];
    if (isFirstAnswer) {
      initialAnswerId = answerId;
      setInitialAnswers(prev => ({ ...prev, [questionId]: answerId }));
    }
    
    // Update answer change count
    if (isAnswerChange) {
      setAnswerChangeCount(prev => ({ ...prev, [questionId]: newChangeCount }));
    }

    // Update UI immediately
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));

    try {
      // Save to responses table with full behavioral metadata
      const result = await saveUniqueResponse(
        session.id,
        user.id,
        assessmentId,
        questionId,
        answerId,
        {
          time_spent_seconds: timeSpentSeconds,
          times_changed: newChangeCount,
          initial_answer_id: initialAnswerId,
          is_answer_change: isAnswerChange
        }
      );

      if (result?.success) {
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
        
        // Save timing data separately
        await saveQuestionTiming(questionId, timeSpentSeconds);
        
        // If answer was changed, record in answer_history
        if (isAnswerChange && previousAnswer) {
          await recordAnswerHistory(questionId, previousAnswer, answerId, timeSpentSeconds);
        }
        
        setTimeout(() => {
          setSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 500);
      } else {
        console.error("Save failed:", result?.error);
        setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
        setTimeout(() => {
          setSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);
    }
    
    // Reset timer for next question (but don't reset if staying on same question)
    setQuestionStartTime(Date.now());
  };

  // Record answer history for tracking changes
  const recordAnswerHistory = async (questionId, previousAnswerId, newAnswerId, timeSpentSeconds) => {
    if (!sessionIdRef.current || !user?.id) return;
    
    try {
      // Get scores for previous and new answers to determine if improvement occurred
      const currentQuestion = questions.find(q => q.id === questionId);
      const previousAnswer = currentQuestion?.answers?.find(a => a.id === previousAnswerId);
      const newAnswer = currentQuestion?.answers?.find(a => a.id === newAnswerId);
      
      const scoreImproved = newAnswer?.score > previousAnswer?.score;
      
      const { error } = await supabase
        .from('answer_history')
        .insert({
          session_id: sessionIdRef.current,
          question_id: questionId,
          user_id: user.id,
          assessment_id: assessmentId,
          previous_answer_id: previousAnswerId,
          new_answer_id: newAnswerId,
          score_improved: scoreImproved,
          changed_at: new Date().toISOString(),
          time_before_change_seconds: timeSpentSeconds
        });
      
      if (error) {
        console.error("❌ Error recording answer history:", error);
      } else {
        console.log(`📝 Recorded answer change for question ${questionId}: ${scoreImproved ? 'improved' : 'changed'}`);
      }
    } catch (error) {
      console.error("❌ Error in recordAnswerHistory:", error);
    }
  };

  // Navigation - save timing before leaving question
  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      // Save timing for current question before leaving
      const currentQuestionId = questions[currentIndex]?.id;
      if (currentQuestionId) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        await saveQuestionTiming(currentQuestionId, timeSpent);
      }
      
      setCurrentIndex(i => i + 1);
      // Reset timer for new question
      setQuestionStartTime(Date.now());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = async () => {
    if (currentIndex > 0) {
      // Save timing for current question before leaving
      const currentQuestionId = questions[currentIndex]?.id;
      if (currentQuestionId) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        await saveQuestionTiming(currentQuestionId, timeSpent);
      }
      
      setCurrentIndex(i => i - 1);
      // Reset timer for new question
      setQuestionStartTime(Date.now());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToQuestion = async (index) => {
    // Save timing for current question before jumping
    const currentQuestionId = questions[currentIndex]?.id;
    if (currentQuestionId) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      await saveQuestionTiming(currentQuestionId, timeSpent);
    }
    
    setCurrentIndex(index);
    // Reset timer for new question
    setQuestionStartTime(Date.now());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit assessment - save final timing
  const handleSubmit = async () => {
    if (!session || alreadySubmitted || accessDenied) return;

    // Save timing for last question
    const lastQuestionId = questions[currentIndex]?.id;
    if (lastQuestionId) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      await saveQuestionTiming(lastQuestionId, timeSpent);
    }

    console.log("🔍 Submit button clicked");
    console.log("Current session:", session);
    console.log("Current user:", user);
    console.log("Number of answers:", Object.keys(answers).length);
    console.log("Total questions:", questions.length);
    console.log("Answer changes recorded:", answerChangeCount);

    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      console.log(`⚠️ ${unansweredCount} questions unanswered`);
      const confirm = window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) {
        return;
      }
    }

    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      await Promise.all([
        saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id),
        updateSessionTimer(session.id, elapsedSeconds)
      ]);
      
      console.log("📤 Calling submitAssessment with session:", session.id);
      
      // Pass behavioral summary to submit function
      const behavioralSummary = {
        total_answer_changes: Object.values(answerChangeCount).reduce((a, b) => a + b, 0),
        questions_with_changes: Object.keys(answerChangeCount).length,
        avg_time_per_question: Object.values(questionTimings).reduce((a, b) => a + (b.time_spent || 0), 0) / (Object.keys(questionTimings).length || 1),
        completed_at: new Date().toISOString()
      };
      
      const result = await submitAssessment(session.id, behavioralSummary);
      console.log("✅ Submit successful:", result);
      
      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      
      if (antiCheatCleanup) {
        antiCheatCleanup();
      }
      
      setTimeout(() => {
        router.push('/candidate/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      
      if (error.message === "already_submitted" || error.message?.includes("already submitted")) {
        setAlreadySubmitted(true);
        alert("This assessment has already been submitted.");
        router.push('/candidate/dashboard');
      } else {
        alert(`Failed to submit assessment: ${error.message}`);
        setIsSubmitting(false);
      }
    }
  };

  const handleBackClick = async () => {
    console.log("🔙 Back button clicked");
    
    const { data: { session: authSession } } = await supabase.auth.getSession();
    console.log("Auth session on back click:", authSession ? "Valid" : "Invalid");
    
    if (!authSession) {
      console.log("No session, redirecting to login instead");
      router.push('/login');
    } else {
      if (antiCheatCleanup) {
        antiCheatCleanup();
      }
      router.push('/assessment/pre');
    }
  };

  const totalAnswered = Object.keys(answers || {}).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const timeRemainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
  const timeRemainingFormatted = formatTime(timeRemainingSeconds);
  const timePercentage = (elapsedSeconds / timeLimit) * 100;
  const isTimeWarning = timePercentage > 80;
  const isTimeCritical = timePercentage > 90;

  const currentQuestion = questions[currentIndex] || {};

  // Show access denied message
  if (!loading && accessDenied && accessChecked) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>🔒</div>
          <h2 style={{ marginBottom: '15px' }}>Access Denied</h2>
          <p style={{ marginBottom: '10px', color: '#64748b' }}>
            You don't have permission to take this assessment.
          </p>
          <p style={{ marginBottom: '25px', color: '#64748b', fontSize: '14px' }}>
            Assessments must be unblocked by your supervisor before you can take them.
          </p>
          <button onClick={() => router.push('/candidate/dashboard')} style={styles.primaryButton}>
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner} />
          <h2 style={{ color: 'white', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Loading Assessment...</h2>
          <p style={{ color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Preparing your personalized questions</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={{ marginBottom: '15px' }}>Assessment Already Completed</h2>
          <p style={{ marginBottom: '25px', color: '#64748b' }}>You have already submitted this assessment.</p>
          <button onClick={() => router.push('/candidate/dashboard')} style={styles.primaryButton}>
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={{ marginBottom: '15px' }}>Error Loading Assessment</h2>
          <p style={{ marginBottom: '25px', color: '#64748b' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.primaryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>📭</div>
          <h2 style={{ marginBottom: '15px' }}>No Questions Available</h2>
          <p style={{ marginBottom: '25px', color: '#64748b' }}>This assessment doesn't have any questions yet.</p>
          <button onClick={() => router.push('/candidate/dashboard')} style={styles.primaryButton}>
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
                  <span style={{ color: '#4caf50', fontWeight: 700 }}>{totalAnswered}/{questions.length}</span>
                </div>
                <div style={styles.modalStat}>
                  <span>Completion Rate</span>
                  <span style={{ color: '#2196f3', fontWeight: 700 }}>{Math.round((totalAnswered / questions.length) * 100)}%</span>
                </div>
                <div style={styles.modalStat}>
                  <span>Assessment</span>
                  <span style={{ color: '#9C27B0', fontWeight: 700 }}>{assessment?.title}</span>
                </div>
                <div style={styles.modalStat}>
                  <span>Answer Changes</span>
                  <span style={{ color: '#ff9800', fontWeight: 700 }}>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</span>
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
              <button onClick={handleSubmit} disabled={isSubmitting} style={styles.modalPrimaryButton}>
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: 'center' }}>
            <div style={styles.successIconLarge}>✓</div>
            <h2 style={{ color: '#2e7d32', marginBottom: '10px' }}>Assessment Complete!</h2>
            <p style={{ marginBottom: '5px' }}>Your {assessment?.title} has been successfully submitted.</p>
            <p style={{ color: '#64748b' }}>Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* Main Assessment Layout */}
      <div style={styles.container}>
        {/* Header */}
        <div style={{
          ...styles.header,
          background: `linear-gradient(135deg, ${assessmentType?.gradient_start || '#667eea'}, ${assessmentType?.gradient_end || '#764ba2'})`
        }}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button onClick={handleBackClick} style={styles.backButton}>
                ←
              </button>
              <div>
                <div style={styles.headerTitle}>{assessment?.title}</div>
                <div style={styles.headerMeta}>
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span>•</span>
                  <span>{currentQuestion?.section || 'General'}</span>
                  {currentQuestion?.subsection && (
                    <>
                      <span>•</span>
                      <span>{currentQuestion.subsection}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Timer */}
            <div style={{
              ...styles.timer,
              background: isTimeCritical ? 'rgba(211, 47, 47, 0.1)' : 
                         isTimeWarning ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255,255,255,0.15)',
              borderColor: isTimeCritical ? '#d32f2f' : 
                          isTimeWarning ? '#ff9800' : 'rgba(255,255,255,0.3)'
            }}>
              <div style={styles.timerLabel}>TIME REMAINING</div>
              <div style={{
                ...styles.timerValue,
                color: isTimeCritical ? '#d32f2f' : 
                       isTimeWarning ? '#ff9800' : 'white'
              }}>
                {timeRemainingFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div style={styles.mainContent}>
          {/* Left Column - Questions */}
          <div style={styles.questionColumn}>
            <div style={styles.questionCard}>
              <div style={styles.sectionBadge}>
                <div style={{
                  ...styles.sectionIcon,
                  background: `linear-gradient(135deg, ${assessmentType?.gradient_start || '#667eea'}, ${assessmentType?.gradient_end || '#764ba2'})`
                }}>
                  {assessmentType?.icon || '📋'}
                </div>
                <div>
                  <div style={styles.sectionName}>{currentQuestion?.section || 'General'}</div>
                  {currentQuestion?.subsection && (
                    <div style={styles.subsection}>{currentQuestion.subsection}</div>
                  )}
                </div>
              </div>

              <div style={styles.questionText}>
                {currentQuestion?.question_text}
              </div>

              {saveStatus[currentQuestion?.id] && (
                <div style={{
                  ...styles.saveStatus,
                  background: saveStatus[currentQuestion.id] === 'saving' ? '#fff3e0' : 
                             saveStatus[currentQuestion.id] === 'saved' ? '#e8f5e9' : '#ffebee',
                  borderColor: saveStatus[currentQuestion.id] === 'saving' ? '#ff9800' : 
                              saveStatus[currentQuestion.id] === 'saved' ? '#4caf50' : '#f44336',
                  color: saveStatus[currentQuestion.id] === 'saving' ? '#f57c00' : 
                         saveStatus[currentQuestion.id] === 'saved' ? '#2e7d32' : '#c62828'
                }}>
                  {saveStatus[currentQuestion.id] === 'saving' ? '⏳ Saving your answer...' : 
                   saveStatus[currentQuestion.id] === 'saved' ? '✓ Answer saved' : '❌ Save failed - please try again'}
                </div>
              )}

              {/* Show answer change indicator */}
              {answerChangeCount[currentQuestion?.id] > 0 && (
                <div style={{
                  padding: '6px 12px',
                  background: '#FFF8E1',
                  borderRadius: '20px',
                  fontSize: '11px',
                  color: '#F57C00',
                  marginBottom: '12px',
                  display: 'inline-block'
                }}>
                  ✏️ Changed answer {answerChangeCount[currentQuestion.id]} time{answerChangeCount[currentQuestion.id] !== 1 ? 's' : ''}
                </div>
              )}

              <div style={styles.answersContainer}>
                {currentQuestion?.answers?.map((answer, index) => {
                  const isSelected = answers[currentQuestion.id] === answer.id;
                  const isHovered = hoveredAnswer === answer.id;
                  const optionLetter = String.fromCharCode(65 + index);

                  return (
                    <button
                      key={answer.id}
                      onClick={() => handleAnswerSelect(currentQuestion.id, answer.id)}
                      disabled={alreadySubmitted}
                      style={{
                        ...styles.answerCard,
                        background: isSelected ? `linear-gradient(135deg, ${assessmentType?.gradient_start || '#667eea'}, ${assessmentType?.gradient_end || '#764ba2'})` : 
                                   isHovered ? '#f8fafc' : 'white',
                        borderColor: isSelected ? assessmentType?.gradient_start || '#667eea' : '#e2e8f0',
                        transform: isSelected || isHovered ? 'translateY(-1px)' : 'translateY(0)',
                        boxShadow: isSelected ? '0 2px 8px rgba(102, 126, 234, 0.2)' : 
                                  isHovered ? '0 2px 8px rgba(0,0,0,0.05)' : '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={() => setHoveredAnswer(answer.id)}
                      onMouseLeave={() => setHoveredAnswer(null)}
                    >
                      <div style={{
                        ...styles.answerLetter,
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 
                                   isHovered ? assessmentType?.gradient_start || '#667eea' + '20' : '#f1f5f9',
                        color: isSelected ? 'white' : '#475569'
                      }}>
                        {optionLetter}
                      </div>
                      <span style={{
                        ...styles.answerText,
                        color: isSelected ? 'white' : '#1e293b',
                        fontWeight: isSelected ? 500 : 400
                      }}>
                        {answer.answer_text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={styles.navigation}>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || alreadySubmitted}
                  style={{
                    ...styles.navButton,
                    background: currentIndex === 0 || alreadySubmitted ? '#f1f5f9' : 'white',
                    color: currentIndex === 0 || alreadySubmitted ? '#94a3b8' : assessmentType?.gradient_start || '#667eea',
                    border: currentIndex === 0 || alreadySubmitted ? '1px solid #e2e8f0' : `2px solid ${assessmentType?.gradient_start || '#667eea'}`,
                    cursor: currentIndex === 0 || alreadySubmitted ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Previous Question
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.navButton,
                      background: alreadySubmitted ? '#f1f5f9' : '#4caf50',
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      border: 'none',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
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
                      background: alreadySubmitted ? '#f1f5f9' : `linear-gradient(135deg, ${assessmentType?.gradient_start || '#667eea'}, ${assessmentType?.gradient_end || '#764ba2'})`,
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      border: 'none',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Navigator */}
          <div style={styles.navigatorColumn}>
            <div style={styles.navigatorCard}>
              <div style={styles.navigatorHeader}>
                <span style={styles.navigatorIcon}>📋</span>
                <h3>Question Navigator</h3>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#4caf50' }}>{totalAnswered}</div>
                  <div style={styles.statLabel}>Answered</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#64748b' }}>{questions.length - totalAnswered}</div>
                  <div style={styles.statLabel}>Remaining</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: assessmentType?.gradient_start || '#667eea' }}>{Math.round((totalAnswered / questions.length) * 100)}%</div>
                  <div style={styles.statLabel}>Complete</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#ff9800' }}>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</div>
                  <div style={styles.statLabel}>Changes</div>
                </div>
              </div>

              <div style={styles.questionGrid}>
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id];
                  const isCurrent = index === currentIndex;
                  const isHovered = hoveredQuestion === index;
                  const hasChanges = answerChangeCount[q.id] > 0;

                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(index)}
                      disabled={alreadySubmitted}
                      style={{
                        ...styles.gridItem,
                        background: isCurrent ? assessmentType?.gradient_start || '#667eea' : 
                                   isAnswered ? (hasChanges ? '#ff9800' : '#4caf50') : 'white',
                        color: isCurrent || isAnswered ? 'white' : '#1e293b',
                        borderColor: isCurrent ? assessmentType?.gradient_start || '#667eea' : 
                                    isAnswered ? (hasChanges ? '#ff9800' : '#4caf50') : '#e2e8f0',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.15)' : 'none',
                        cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={() => setHoveredQuestion(index)}
                      onMouseLeave={() => setHoveredQuestion(null)}
                      title={`Question ${index + 1}${hasChanges ? ` (changed ${answerChangeCount[q.id]} time${answerChangeCount[q.id] !== 1 ? 's' : ''})` : ''}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: '#4caf50' }} />
                  <span>Answered</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: '#ff9800' }} />
                  <span>Changed</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: assessmentType?.gradient_start || '#667eea' }} />
                  <span>Current</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: 'white', border: '2px solid #e2e8f0' }} />
                  <span>Pending</span>
                </div>
              </div>

              <div style={styles.assessmentInfo}>
                <div style={styles.infoRow}>
                  <span>Assessment:</span>
                  <span style={{ fontWeight: 600 }}>{assessment?.title}</span>
                </div>
                <div style={styles.infoRow}>
                  <span>Time Limit:</span>
                  <span style={{ fontWeight: 600 }}>3 hours</span>
                </div>
                <div style={styles.infoRow}>
                  <span>Changes Made:</span>
                  <span style={{ fontWeight: 600, color: '#ff9800' }}>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background: #f8fafc;
        }
      `}</style>
    </>
  );
}

// Styles object (keeping all existing styles - same as before, omitted for brevity)
// ... [all the existing styles remain exactly the same]
