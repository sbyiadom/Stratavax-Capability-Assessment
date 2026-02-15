import { useEffect, useState } from "react";
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

// ===== ANTI-CHEAT =====
const setupAntiCheat = () => {
  if (typeof window === 'undefined') return;
  
  // Temporarily disabled for debugging
  // document.addEventListener('contextmenu', (e) => e.preventDefault());
  // document.addEventListener('copy', (e) => e.preventDefault());
  // document.addEventListener('paste', (e) => e.preventDefault());
  // document.addEventListener('cut', (e) => e.preventDefault());
  
  // document.addEventListener('keydown', (e) => {
  //   if (e.ctrlKey || e.metaKey) {
  //     e.preventDefault();
  //   }
  //   if (e.key === 'F12' || e.key === 'PrintScreen') {
  //     e.preventDefault();
  //   }
  // });
  
  console.log("🔓 Anti-cheat temporarily disabled for debugging");
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
          router.push("/login");
          return;
        }
        setUser(authSession.user);

        if (!assessmentId) return;

        // Check if already completed
        const completed = await isAssessmentCompleted(authSession.user.id, assessmentId);
        if (completed) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        // Load assessment details
        const assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);
        setAssessmentType(assessmentData?.assessment_type);
        setTimeLimit(assessmentData?.assessment_type?.time_limit_minutes * 60 || 3600);

        // Create or get session
        const sessionData = await createAssessmentSession(
          authSession.user.id,
          assessmentId,
          assessmentData?.assessment_type?.id
        );
        setSession(sessionData);

        // Load saved progress
        const progress = await getProgress(authSession.user.id, assessmentId);
        if (progress) {
          setElapsedSeconds(progress.elapsed_seconds || 0);
        }

        // Load UNIQUE questions
        console.log("🔍 Loading unique questions...");
        const uniqueQuestions = await getUniqueQuestions(assessmentId);
        console.log(`📊 Loaded ${uniqueQuestions?.length || 0} unique questions`);
        
        if (uniqueQuestions && uniqueQuestions.length > 0) {
          console.log("✅ First question sample:", uniqueQuestions[0]);
        } else {
          console.log("❌ No questions returned from getUniqueQuestions");
        }
        
        setQuestions(uniqueQuestions || []);

        // Load saved responses
        if (sessionData?.id) {
          const responses = await getSessionResponses(sessionData.id);
          if (responses?.answerMap) {
            setAnswers(responses.answerMap);
            
            // If we have a saved response, find the current question index
            if (progress?.last_question_id && uniqueQuestions?.length > 0) {
              const lastIndex = uniqueQuestions.findIndex(q => q.id === progress.last_question_id);
              if (lastIndex >= 0) setCurrentIndex(lastIndex);
            }
          }
        }

        // Setup anti-cheat (temporarily disabled)
        setupAntiCheat();

        setLoading(false);
      } catch (error) {
        console.error("❌ Initialization error:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    init();
  }, [assessmentId, router]);

  // Timer effect
  useEffect(() => {
    if (loading || alreadySubmitted || !session) return;

    const timer = setInterval(async () => {
      setElapsedSeconds(prev => {
        const newElapsed = prev + 1;
        setTimeRemaining(timeLimit - newElapsed);
        
        if (newElapsed >= timeLimit) {
          handleSubmit();
        }
        
        if (newElapsed % 30 === 0) {
          saveProgress(session.id, user.id, assessmentId, newElapsed, questions[currentIndex]?.id);
          updateSessionTimer(session.id, newElapsed);
        }
        
        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, alreadySubmitted, session, timeLimit, assessmentId, user?.id, currentIndex, questions]);

  // Handle answer selection
  const handleAnswerSelect = async (questionId, answerId) => {
    if (alreadySubmitted || !session || !questionId || !answerId) return;

    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));

    try {
      const result = await saveUniqueResponse(
        session.id,
        user.id,
        assessmentId,
        questionId,
        answerId
      );

      if (result?.success) {
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
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
  };

  // Navigation
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToQuestion = (index) => {
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit assessment
  const handleSubmit = async () => {
    if (!session || alreadySubmitted) return;

    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id);
      await updateSessionTimer(session.id, elapsedSeconds);
      
      const resultId = await submitAssessment(session.id);
      
      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        router.push('/assessment/pre');
      }, 3000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit assessment. Please contact support.");
    } finally {
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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner} />
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Loading Assessment...</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Preparing your personalized questions</p>
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
                  <span style={{ color: '#9C27B0', fontWeight: 700 }}>{assessment?.title}</span>
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
            <p style={{ color: '#64748b' }}>Redirecting to assessment selection...</p>
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

            {/* Question Card */}
            <div style={styles.questionCard}>
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

              {/* Question Text */}
              <div style={styles.questionText}>
                {currentQuestion?.question_text}
              </div>

              {/* Save Status */}
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

              {/* Answer Options */}
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
                        transform: isSelected || isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        boxShadow: isSelected ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 
                                  isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)'
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

              {/* Navigation Buttons */}
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

              {/* Stats Cards */}
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
                        background: isCurrent ? assessmentType?.gradient_start || '#667eea' : 
                                   isAnswered ? '#4caf50' : 'white',
                        color: isCurrent || isAnswered ? 'white' : '#1e293b',
                        borderColor: isCurrent ? assessmentType?.gradient_start || '#667eea' : 
                                    isAnswered ? '#4caf50' : '#e2e8f0',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.15)' : 'none',
                        cursor: alreadySubmitted ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={() => setHoveredQuestion(index)}
                      onMouseLeave={() => setHoveredQuestion(null)}
                      title={`Question ${index + 1}`}
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
                  <span style={{ fontWeight: 600 }}>{assessment?.title}</span>
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
      </div>

      {/* Global Styles */}
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
    textAlign: 'center'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
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
    borderRadius: '16px',
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
  primaryButton: {
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  container: {
    minHeight: '100vh',
    background: '#f8fafc'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
    width: '40px',
    height: '40px',
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    backdropFilter: 'blur(10px)'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  headerMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    opacity: 0.9
  },
  timer: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: '1px solid',
    textAlign: 'center',
    minWidth: '160px',
    backdropFilter: 'blur(10px)'
  },
  timerLabel: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
    letterSpacing: '0.5px'
  },
  timerValue: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'monospace'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px'
  },
  questionColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  progressContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  progressTrack: {
    height: '10px',
    background: '#e2e8f0',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '12px'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '5px'
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 500
  },
  questionCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  sectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px'
  },
  sectionIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  },
  sectionName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b'
  },
  subsection: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px'
  },
  questionText: {
    fontSize: '20px',
    lineHeight: '1.6',
    color: '#1e293b',
    marginBottom: '24px',
    fontWeight: 500,
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  saveStatus: {
    padding: '12px 20px',
    border: '1px solid',
    borderRadius: '10px',
    marginBottom: '24px',
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'center'
  },
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px'
  },
  answerCard: {
    padding: '20px',
    border: '2px solid',
    borderRadius: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    transition: 'all 0.2s ease',
    width: '100%',
    minHeight: '100px',
    background: 'white',
    lineHeight: '1.5'
  },
  answerLetter: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    flexShrink: 0
  },
  answerText: {
    flex: 1,
    fontSize: '15px'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginTop: '8px'
  },
  navButton: {
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  navigatorColumn: {
    position: 'sticky',
    top: '100px',
    height: 'fit-content'
  },
  navigatorCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  navigatorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f1f5f9',
    marginBottom: '20px'
  },
  navigatorIcon: {
    fontSize: '24px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
    marginBottom: '24px'
  },
  statCard: {
    background: '#f8fafc',
    padding: '16px 8px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    marginBottom: '20px',
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '4px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  gridItem: {
    aspectRatio: '1',
    border: '2px solid',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    background: 'white'
  },
  legend: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderTop: '2px solid #f1f5f9',
    borderBottom: '2px solid #f1f5f9',
    marginBottom: '16px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#475569',
    fontWeight: 500
  },
  legendDot: {
    width: '14px',
    height: '14px',
    borderRadius: '4px'
  },
  assessmentInfo: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '10px',
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
    padding: '20px',
    backdropFilter: 'blur(5px)'
  },
  modalContent: {
    background: 'white',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalIcon: {
    fontSize: '60px',
    textAlign: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '28px',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: '24px',
    color: '#1e293b'
  },
  modalBody: {
    marginBottom: '28px'
  },
  modalStats: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0'
  },
  modalStat: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: 500
  },
  modalWarning: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    background: '#fff8e1',
    borderRadius: '12px',
    color: '#856404',
    fontSize: '14px',
    border: '1px solid #ffe082'
  },
  modalActions: {
    display: 'flex',
    gap: '12px'
  },
  modalSecondaryButton: {
    flex: 1,
    padding: '14px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '16px',
    color: '#475569',
    transition: 'background 0.2s'
  },
  modalPrimaryButton: {
    flex: 1,
    padding: '14px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '16px',
    transition: 'background 0.2s, transform 0.2s',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
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
    color: 'white',
    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4)'
  }
};
