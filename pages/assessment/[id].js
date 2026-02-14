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
  const [pendingSaves, setPendingSaves] = useState(new Set()); // Track pending saves
  
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

  // Save to localStorage as backup
  const saveToLocalStorage = (questionId, answerId) => {
    try {
      const key = `assessment_${assessmentId}_answers`;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      saved[questionId] = {
        answerId,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(saved));
      localStorage.setItem(`assessment_${assessmentId}_last_saved`, Date.now().toString());
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  };

  // Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const key = `assessment_${assessmentId}_answers`;
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
    return {};
  };

  // Sync localStorage answers to database
  const syncLocalStorageToDatabase = async () => {
    if (!session || !user) return;
    
    const localAnswers = loadFromLocalStorage();
    const localCount = Object.keys(localAnswers).length;
    
    if (localCount === 0) return;
    
    console.log(`📦 Found ${localCount} answers in localStorage, syncing...`);
    
    let synced = 0;
    for (const [qId, data] of Object.entries(localAnswers)) {
      try {
        await saveResponse(session.id, user.id, assessmentId, parseInt(qId), data.answerId);
        synced++;
      } catch (e) {
        console.error(`Failed to sync question ${qId}:`, e);
      }
    }
    
    console.log(`✅ Synced ${synced}/${localCount} answers`);
    
    // Clear localStorage after successful sync
    if (synced === localCount) {
      localStorage.removeItem(`assessment_${assessmentId}_answers`);
    }
  };

  // Initialize assessment
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setUser(session.user);

        if (!assessmentId) return;

        const completed = await isAssessmentCompleted(session.user.id, assessmentId);
        if (completed) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        const assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);
        setAssessmentType(assessmentData.assessment_type);
        setTimeLimit(assessmentData.assessment_type.time_limit_minutes * 60);

        const questionsData = await getAssessmentQuestions(assessmentId);
        setQuestions(questionsData);

        const sessionData = await createAssessmentSession(
          session.user.id,
          assessmentId,
          assessmentData.assessment_type.id
        );
        setSession(sessionData);

        const progress = await getProgress(session.user.id, assessmentId);
        if (progress) {
          setElapsedSeconds(progress.elapsed_seconds);
          if (progress.last_question_id) {
            const lastIndex = questionsData.findIndex(q => q.id === progress.last_question_id);
            if (lastIndex > 0) setCurrentIndex(lastIndex);
          }
        }

        // Load responses from database
        const responses = await getSessionResponses(sessionData.id);
        const answersMap = {};
        responses.forEach(r => {
          answersMap[r.question_id] = r.answer_id;
        });

        // Load from localStorage and merge (localStorage takes precedence)
        const localAnswers = loadFromLocalStorage();
        let merged = false;
        
        Object.entries(localAnswers).forEach(([qId, data]) => {
          if (!answersMap[qId]) {
            answersMap[parseInt(qId)] = data.answerId;
            merged = true;
          }
        });

        setAnswers(answersMap);

        // If we merged localStorage answers, sync them to database
        if (merged && sessionData) {
          await syncLocalStorageToDatabase();
        }

        setupAntiCheat();
        setLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
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

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(pendingSaves).length > 0) {
        // There are pending saves, warn user
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingSaves]);

  // Handle answer selection with reliable saving
  const handleAnswerSelect = async (questionId, answerId) => {
    if (alreadySubmitted || !session) return;

    // Update UI immediately
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));
    
    // Add to pending saves
    setPendingSaves(prev => new Set(prev).add(questionId));

    // Save to localStorage immediately (instant)
    saveToLocalStorage(questionId, answerId);

    // Save to database with retry
    let retries = 3;
    let saved = false;
    
    while (retries > 0 && !saved) {
      try {
        await saveResponse(session.id, user.id, assessmentId, questionId, answerId);
        saved = true;
        
        // Remove from pending saves
        setPendingSaves(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
        
        // Show saved briefly
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
        setTimeout(() => {
          setSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 500);
        
        console.log(`✅ Answer ${questionId} saved after ${4 - retries} attempts`);
      } catch (error) {
        console.error(`Save failed (${retries} retries left):`, error);
        retries--;
        if (retries > 0) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!saved) {
      console.error(`❌ Failed to save answer ${questionId} after multiple attempts`);
      setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
      
      // Show error but keep in pending
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

    // Check for pending saves
    if (pendingSaves.size > 0) {
      const confirm = window.confirm(`You have ${pendingSaves.size} unsaved answers. Wait a moment and try again.`);
      if (!confirm) return;
    }

    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      // Final sync from localStorage
      await syncLocalStorageToDatabase();
      
      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id);
      await updateSessionTimer(session.id, elapsedSeconds);
      
      const resultId = await submitAssessment(session.id);
      
      // Clear localStorage on successful submission
      localStorage.removeItem(`assessment_${assessmentId}_answers`);
      localStorage.removeItem(`assessment_${assessmentId}_last_saved`);
      
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
  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 
    ? Math.round((totalAnswered / questions.length) * 100) 
    : 0;
  
  const isLastQuestion = currentIndex === questions.length - 1;
  const timeRemainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
  const timeRemainingFormatted = formatTime(timeRemainingSeconds);
  const timePercentage = (elapsedSeconds / timeLimit) * 100;
  const isTimeWarning = timePercentage > 80;
  const isTimeCritical = timePercentage > 90;

  const currentQuestion = questions[currentIndex];

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
            <h2 style={{ color: '#2e7d32' }}>Assessment Complete!</h2>
            <p>Your {assessment?.title} has been successfully submitted.</p>
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
                <div style={styles.headerTitle}>{assessment?.title}</div>
                <div style={styles.headerMeta}>
                  <span>Q{currentIndex + 1}/{questions.length}</span>
                  <span>•</span>
                  <span>{currentQuestion?.section}</span>
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
                  <div style={styles.sectionName}>{currentQuestion?.section}</div>
                  {currentQuestion?.subsection && (
                    <div style={styles.subsection}>{currentQuestion.subsection}</div>
                  )}
                </div>
              </div>

              {/* Question */}
              <div style={styles.questionText}>
                <div style={styles.questionNumber}>Question {currentIndex + 1} of {questions.length}</div>
                <div style={styles.questionContent}>{currentQuestion?.question_text}</div>
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
                   saveStatus[currentQuestion.id] === 'saved' ? '✓ Saved' : '❌ Save failed'}
                </div>
              )}

              {/* Answers */}
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
                        ...styles.answerButton,
                        background: isSelected ? assessmentType?.gradient_start || '#667eea' : isHovered ? '#f8fafc' : 'white',
                        borderColor: isSelected ? assessmentType?.gradient_start || '#667eea' : '#e2e8f0',
                        transform: isSelected || isHovered ? 'translateY(-2px)' : 'translateY(0)'
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
                        {answer.answer_text}
                      </span>
                    </button>
                  );
                })}
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
                    border: currentIndex === 0 || alreadySubmitted ? '1px solid #e2e8f0' : `2px solid ${assessmentType?.gradient_start || '#667eea'}`
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
                      background: alreadySubmitted ? '#f1f5f9' : `linear-gradient(135deg, ${assessmentType?.gradient_start || '#667eea'}, ${assessmentType?.gradient_end || '#764ba2'})`,
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
              <h3>Question Navigator</h3>
              {pendingSaves.size > 0 && (
                <span style={styles.pendingBadge}>⏳ {pendingSaves.size}</span>
              )}
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
                const isAnswered = answers[q.id];
                const isCurrent = index === currentIndex;
                const isHovered = hoveredQuestion === index;
                const isPending = pendingSaves.has(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(index)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.gridItem,
                      background: isCurrent ? assessmentType?.gradient_start || '#667eea' : 
                                 isPending ? '#ff9800' :
                                 isAnswered ? '#4caf50' : 'white',
                      color: isCurrent || isAnswered || isPending ? 'white' : '#1e293b',
                      borderColor: isCurrent ? assessmentType?.gradient_start || '#667eea' : 
                                  isPending ? '#ff9800' :
                                  isAnswered ? '#4caf50' : '#e2e8f0',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      opacity: isPending ? 0.8 : 1
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
                <span>Saved</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background: '#ff9800' }} />
                <span>Saving...</span>
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
                <span style={{ fontWeight: 600 }}>{assessmentType?.max_score}</span>
              </div>
              <div style={styles.infoRow}>
                <span>Time Limit:</span>
                <span style={{ fontWeight: 600 }}>{assessmentType?.time_limit_minutes} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Styles (keep all your existing styles, plus add these new ones)
const styles = {
  // ... (keep all your existing styles here)
  
  // Add these new styles
  pendingBadge: {
    marginLeft: 'auto',
    background: '#ff9800',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    padding: '15px 0',
    borderTop: '2px solid #f1f5f9',
    borderBottom: '2px solid #f1f5f9',
    marginBottom: '15px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#475569'
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px'
  }
};
