import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import {
  getAssessmentById,
  getAssessmentQuestions,
  createAssessmentSession,
  getSessionResponses,
  saveResponse,
  submitAssessment,
  getProgress,
  saveProgress,
  updateSessionTimer,
  isAssessmentCompleted
} from "../../supabase/assessment";

// ===== TIMER FUNCTIONS =====
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// ===== ANTI-CHEAT =====
const setupAntiCheat = () => {
  if (typeof window === 'undefined') return;
  
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
    if (e.key === 'F12' || e.key === 'PrintScreen') {
      e.preventDefault();
    }
  });
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
  const [saveStatus, setSaveStatus] = useState({});
  
  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(3600);
  const [timeRemaining, setTimeRemaining] = useState(3600);
  
  // UI state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);
  const [hoveredAnswer, setHoveredAnswer] = useState(null);

  // Initialize assessment
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Check user session
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          console.log("No session, redirecting to login");
          router.push("/login");
          return;
        }
        setUser(authSession.user);
        console.log("User authenticated:", authSession.user.id);

        if (!assessmentId) {
          console.log("No assessment ID, waiting...");
          return;
        }

        console.log("Initializing assessment:", assessmentId);

        // Check if already completed
        const completed = await isAssessmentCompleted(authSession.user.id, assessmentId);
        console.log("Assessment completed check:", completed);
        
        if (completed) {
          console.log("Assessment already completed");
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        // Load assessment details
        console.log("Loading assessment details...");
        const assessmentData = await getAssessmentById(assessmentId);
        console.log("Assessment data:", assessmentData);
        
        setAssessment(assessmentData);
        setAssessmentType(assessmentData?.assessment_type || null);
        setTimeLimit(assessmentData?.assessment_type?.time_limit_minutes * 60 || 3600);

        // Load questions
        console.log("Loading questions...");
        const questionsData = await getAssessmentQuestions(assessmentId);
        console.log(`Loaded ${questionsData?.length || 0} questions`);
        setQuestions(Array.isArray(questionsData) ? questionsData : []);

        // Create or get session
        console.log("Creating/getting session...");
        const sessionData = await createAssessmentSession(
          authSession.user.id,
          assessmentId,
          assessmentData?.assessment_type?.id || null
        );
        console.log("Session data:", sessionData);
        setSession(sessionData);

        // Load saved progress
        console.log("Loading saved progress...");
        const progress = await getProgress(authSession.user.id, assessmentId);
        console.log("Progress data:", progress);
        
        if (progress) {
          setElapsedSeconds(progress.elapsed_seconds || 0);
          if (progress.last_question_id && Array.isArray(questionsData)) {
            const lastIndex = questionsData.findIndex(q => q?.id === progress.last_question_id);
            if (lastIndex > 0) {
              console.log("Setting current index to:", lastIndex);
              setCurrentIndex(lastIndex);
            }
          }
        }

        // Load saved responses
        if (sessionData?.id) {
          console.log("Loading saved responses for session:", sessionData.id);
          const responses = await getSessionResponses(sessionData.id);
          console.log("Loaded responses:", responses);
          
          // Make sure we're setting the answers correctly
          if (responses && responses.answerMap) {
            console.log("Setting answers map:", responses.answerMap);
            setAnswers(responses.answerMap);
          } else {
            console.log("No saved responses found");
          }
        }

        // Setup anti-cheat
        setupAntiCheat();

        console.log("Initialization complete");
        setLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        setError(error.message || "Failed to load assessment");
        setLoading(false);
      }
    };

    init();
  }, [assessmentId, router]);

  // Timer effect
  useEffect(() => {
    if (loading || alreadySubmitted || !session || !session.id) return;

    console.log("Starting timer for session:", session.id);
    
    const timer = setInterval(async () => {
      setElapsedSeconds(prev => {
        const newElapsed = prev + 1;
        setTimeRemaining(timeLimit - newElapsed);
        
        // Auto-submit if time limit reached
        if (newElapsed >= timeLimit) {
          console.log("Time limit reached, auto-submitting...");
          handleSubmit();
        }
        
        // Save progress every 30 seconds
        if (newElapsed % 30 === 0) {
          console.log("Auto-saving progress at", newElapsed, "seconds");
          const currentQ = questions[currentIndex];
          saveProgress(session.id, user.id, assessmentId, newElapsed, currentQ?.id);
          updateSessionTimer(session.id, newElapsed);
        }
        
        return newElapsed;
      });
    }, 1000);

    return () => {
      console.log("Cleaning up timer");
      clearInterval(timer);
    };
  }, [loading, alreadySubmitted, session, timeLimit, assessmentId, user?.id, currentIndex, questions]);

  // ===== FIXED HANDLE ANSWER SELECTION =====
  const handleAnswerSelect = async (questionId, answerId) => {
    // Validate all required parameters
    if (!questionId || !answerId) {
      console.error("Missing questionId or answerId:", { questionId, answerId });
      return;
    }

    if (alreadySubmitted) {
      console.log("Cannot save - assessment already submitted");
      return;
    }

    if (!session || !session.id) {
      console.error("No active session");
      return;
    }

    if (!user || !user.id) {
      console.error("No authenticated user");
      return;
    }

    if (!assessmentId) {
      console.error("No assessment ID");
      return;
    }

    console.log("🎯 Answer selected:", { 
      questionId, 
      answerId,
      sessionId: session.id,
      userId: user.id,
      assessmentId 
    });

    // Update UI immediately for better UX
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: answerId };
      console.log("Updated answers state:", newAnswers);
      return newAnswers;
    });
    
    // Show saving indicator
    setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));

    // Save to Supabase
    try {
      console.log("💾 Calling saveResponse with:", {
        sessionId: session.id,
        userId: user.id,
        assessmentId: assessmentId,
        questionId,
        answerId
      });

      const result = await saveResponse(
        session.id, 
        user.id, 
        assessmentId, 
        questionId, 
        answerId
      );
      
      console.log("📥 Save result:", result);
      
      if (result && result.success === true) {
        console.log("✅ Saved successfully");
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
        
        // Clear success status after short delay
        setTimeout(() => {
          setSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 1000);
      } else {
        console.error("❌ Save failed:", result?.error || "Unknown error");
        setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
        
        // Keep error visible longer
        setTimeout(() => {
          setSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 3000);
        
        // Optionally revert the UI change on error
        // You could reload the answers from the server here
      }
      
    } catch (error) {
      console.error("❌ Save error:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
      
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 3000);
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      console.log("Moving to next question:", currentIndex + 1);
      setCurrentIndex(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      console.log("Moving to previous question:", currentIndex - 1);
      setCurrentIndex(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToQuestion = (index) => {
    console.log("Jumping to question:", index);
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit assessment
  const handleSubmit = async () => {
    if (!session || !session.id || alreadySubmitted) {
      console.log("Cannot submit - invalid state:", { hasSession: !!session, alreadySubmitted });
      return;
    }

    console.log("📤 Submitting assessment:", {
      sessionId: session.id,
      userId: user?.id,
      assessmentId
    });

    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      // Save final progress
      const currentQ = questions[currentIndex];
      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, currentQ?.id);
      await updateSessionTimer(session.id, elapsedSeconds);
      
      // Submit the assessment
      const resultId = await submitAssessment(session.id, user.id, assessmentId, elapsedSeconds);
      
      console.log("✅ Submission successful, result ID:", resultId);
      
      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      
      // Redirect after showing success message
      setTimeout(() => {
        router.push('/assessment/pre');
      }, 3000);
    } catch (error) {
      console.error("❌ Submission error:", error);
      alert("Failed to submit assessment. Please try again or contact support.");
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const totalAnswered = Object.keys(answers || {}).length;
  const progressPercentage = questions.length > 0 
    ? Math.round((totalAnswered / questions.length) * 100) 
    : 0;
  
  const isLastQuestion = currentIndex === questions.length - 1;
  const timeRemainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
  const timeRemainingFormatted = formatTime(timeRemainingSeconds);
  const timePercentage = (elapsedSeconds / timeLimit) * 100;
  const isTimeWarning = timePercentage > 80;
  const isTimeCritical = timePercentage > 90;

  const currentQuestion = questions[currentIndex] || {};

  // Debug logging
  console.log("Render state:", {
    currentIndex,
    totalQuestions: questions.length,
    totalAnswered,
    currentQuestionId: currentQuestion?.id,
    hasAnswers: Object.keys(answers).length,
    sessionId: session?.id
  });

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner} />
          <h2>Loading Assessment...</h2>
          <p>Preparing your questions</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.successIcon}>✅</div>
          <h2>Assessment Already Completed</h2>
          <p>You have already submitted this assessment. Each assessment can only be taken once.</p>
          <button onClick={() => router.push('/assessment/pre')} style={styles.primaryButton}>
            ← Return to Assessments
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
          <h2>Error Loading Assessment</h2>
          <p>{error}</p>
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
          <h2>No Questions Available</h2>
          <p>This assessment doesn't have any questions yet.</p>
          <button onClick={() => router.push('/assessment/pre')} style={styles.primaryButton}>
            ← Back
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
                  <span style={{ color: '#2196f3', fontWeight: 700 }}>{progressPercentage}%</span>
                </div>
                <div style={styles.modalStat}>
                  <span>Assessment</span>
                  <span style={{ color: '#9C27B0', fontWeight: 700 }}>{assessment?.title || 'Assessment'}</span>
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
            <h2 style={{ color: '#2e7d32' }}>Assessment Complete!</h2>
            <p>Your {assessment?.title || 'assessment'} has been successfully submitted.</p>
            <p>Redirecting to assessment selection...</p>
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
              <button onClick={() => router.push('/assessment/pre')} style={styles.backButton}>
                ←
              </button>
              <div style={styles.headerIcon}>{assessmentType?.icon || '📋'}</div>
              <div>
                <div style={styles.headerTitle}>{assessment?.title || 'Assessment'}</div>
                <div style={styles.headerMeta}>
                  <span>Q{currentIndex + 1}/{questions.length}</span>
                  <span>•</span>
                  <span>{currentQuestion?.section || 'General'}</span>
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
                {timeRemainingFormatted}
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
              background: `linear-gradient(135deg, ${assessmentType?.gradient_start || '#667eea'}, ${assessmentType?.gradient_end || '#764ba2'})`
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
              {/* Section Badge */}
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

              {/* Question */}
              <div style={styles.questionText}>
                <div style={styles.questionNumber}>Question {currentIndex + 1} of {questions.length}</div>
                <div style={styles.questionContent}>{currentQuestion?.question_text || 'Loading question...'}</div>
              </div>

              {/* Save Status */}
              {saveStatus[currentQuestion?.id] && (
                <div style={{
                  ...styles.saveStatus,
                  background: saveStatus[currentQuestion.id] === 'saving' ? '#ff980010' : 
                             saveStatus[currentQuestion.id] === 'saved' ? '#4caf5010' : '#f4433610',
                  borderColor: saveStatus[currentQuestion.id] === 'saving' ? '#ff9800' : 
                              saveStatus[currentQuestion.id] === 'saved' ? '#4caf50' : '#f44336',
                  color: saveStatus[currentQuestion.id] === 'saving' ? '#f57c00' : 
                         saveStatus[currentQuestion.id] === 'saved' ? '#2e7d32' : '#c62828'
                }}>
                  {saveStatus[currentQuestion.id] === 'saving' ? '⏳ Saving...' : 
                   saveStatus[currentQuestion.id] === 'saved' ? '✓ Saved' : '❌ Save failed - will retry'}
                </div>
              )}

              {/* Answers */}
              <div style={styles.answersContainer}>
                {currentQuestion?.answers && Array.isArray(currentQuestion.answers) && currentQuestion.answers.length > 0 ? (
                  currentQuestion.answers.map((answer, index) => {
                    if (!answer || !answer.id) return null;
                    
                    const isSelected = answers[currentQuestion.id] === answer.id;
                    const isHovered = hoveredAnswer === answer.id;
                    const optionLetter = String.fromCharCode(65 + index);

                    return (
                      <button
                        key={answer.id}
                        onClick={() => handleAnswerSelect(currentQuestion.id, answer.id)}
                        disabled={alreadySubmitted}
                        style={{
                          ...styles.answerButton,
                          background: isSelected ? assessmentType?.gradient_start || '#667eea' : isHovered ? '#f8fafc' : 'white',
                          borderColor: isSelected ? assessmentType?.gradient_start || '#667eea' : '#e2e8f0',
                          transform: isSelected || isHovered ? 'translateY(-2px)' : 'translateY(0)',
                          cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={() => setHoveredAnswer(answer.id)}
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
                          {answer.answer_text || 'Option not available'}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#f57c00' }}>
                    No answers available for this question.
                  </div>
                )}
              </div>

              {/* Navigation */}
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
              <h3>Question Navigator</h3>
            </div>

            {/* Stats */}
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
                <div style={{ ...styles.statValue, color: assessmentType?.gradient_start || '#667eea' }}>{progressPercentage}%</div>
                <div style={styles.statLabel}>Complete</div>
              </div>
            </div>

            {/* Question Grid */}
            <div style={styles.questionGrid}>
              {questions.map((q, index) => {
                if (!q || !q.id) return null;
                
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
                      background: isCurrent ? assessmentType?.gradient_start || '#667eea' : isAnswered ? '#4caf50' : 'white',
                      color: isCurrent || isAnswered ? 'white' : '#1e293b',
                      borderColor: isCurrent ? assessmentType?.gradient_start || '#667eea' : isAnswered ? '#4caf50' : '#e2e8f0',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={() => setHoveredQuestion(index)}
                    onMouseLeave={() => setHoveredQuestion(null)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background: '#4caf50' }} />
                <span>Answered</span>
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

            {/* Assessment Info */}
            <div style={styles.assessmentInfo}>
              <div style={styles.infoRow}>
                <span>Assessment:</span>
                <span style={{ fontWeight: 600 }}>{assessment?.title || 'Assessment'}</span>
              </div>
              <div style={styles.infoRow}>
                <span>Max Score:</span>
                <span style={{ fontWeight: 600 }}>{assessmentType?.max_score || 100}</span>
              </div>
              <div style={styles.infoRow}>
                <span>Time Limit:</span>
                <span style={{ fontWeight: 600 }}>{assessmentType?.time_limit_minutes || 60} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add keyframe animation for spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// Styles
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
    padding: '40px',
    borderRadius: '12px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  container: {
    minHeight: '100vh',
    background: '#f8fafc'
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
    gap: '16px'
  },
  backButton: {
    width: '40px',
    height: '40px',
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '4px'
  },
  headerMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    opacity: 0.9
  },
  timer: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid',
    textAlign: 'center',
    minWidth: '140px'
  },
  timerLabel: {
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '4px'
  },
  timerValue: {
    fontSize: '20px',
    fontWeight: 700,
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
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '24px'
  },
  questionPanel: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  questionContent: {
    padding: '32px'
  },
  sectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px'
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
    fontWeight: 600,
    color: '#1e293b'
  },
  subsection: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px'
  },
  questionText: {
    background: '#f8fafc',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  questionNumber: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '8px'
  },
  questionContent: {
    fontSize: '18px',
    lineHeight: '1.6',
    color: '#1e293b'
  },
  saveStatus: {
    padding: '12px',
    border: '1px solid',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  answerButton: {
    padding: '16px',
    border: '2px solid',
    borderRadius: '8px',
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
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    flexShrink: 0
  },
  answerText: {
    flex: 1,
    lineHeight: '1.5'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '24px'
  },
  navButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  navigatorPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
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
    marginBottom: '15px'
  },
  navigatorIcon: {
    fontSize: '20px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b'
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    marginBottom: '15px',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '4px'
  },
  gridItem: {
    aspectRatio: '1',
    border: '2px solid',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  legend: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderTop: '2px solid #f1f5f9',
    borderBottom: '2px solid #f1f5f9',
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
    borderRadius: '3px'
  },
  assessmentInfo: {
    background: '#f8fafc',
    padding: '15px',
    borderRadius: '6px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '8px',
    color: '#475569'
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
    padding: '32px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%'
  },
  modalIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '20px'
  },
  modalBody: {
    marginBottom: '24px'
  },
  modalStats: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  modalStat: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '15px'
  },
  modalWarning: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: '#fff8e1',
    borderRadius: '8px',
    color: '#856404',
    fontSize: '14px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px'
  },
  modalSecondaryButton: {
    flex: 1,
    padding: '12px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600
  },
  modalPrimaryButton: {
    flex: 1,
    padding: '12px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600
  },
  successIconLarge: {
    width: '60px',
    height: '60px',
    background: '#4caf50',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '30px',
    color: 'white'
  }
};
