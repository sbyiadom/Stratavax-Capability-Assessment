import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

const SECTION_CONFIG = {
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
    bgImage: 'https://img.freepik.com/free-photo/friends-people-group-teamwork-diversity_53876-31488.jpg?semt=ais_hybrid&w=740&q=80'
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
  }
};

const SECTION_ORDER = Object.keys(SECTION_CONFIG);
const TIME_LIMIT_SECONDS = 10800;

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

async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    const { error } = await supabase.from("responses").upsert({
      assessment_id: assessmentId,
      question_id: parseInt(questionId),
      answer_id: parseInt(answerId),
      user_id: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'assessment_id,question_id,user_id' });

    if (error) throw new Error(`Save failed: ${error.message}`);
    return { success: true };
  } catch (error) {
    console.error("Save error:", error);
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

// ===== UPDATED: Check if user has already submitted =====
async function checkIfAlreadySubmitted(userId) {
  try {
    // Primary check: assessments_completed table
    const { data, error } = await supabase
      .from("assessments_completed")
      .select("id, completed_at")
      .eq("user_id", userId)
      .eq("assessment_id", '11111111-1111-1111-1111-111111111111')
      .maybeSingle();

    // If error (not "no rows" error), log it
    if (error && error.code !== 'PGRST116') {
      console.error("Error checking completion:", error);
      return false;
    }
    
    // If data exists, user has submitted
    if (data) {
      console.log("Found existing submission in assessments_completed");
      return true;
    }

    // Secondary check: assessments table (backward compatibility)
    const { data: assessmentData } = await supabase
      .from("assessments")
      .select("status, submitted_at")
      .eq("user_id", userId)
      .eq("id", '11111111-1111-1111-1111-111111111111')
      .maybeSingle();

    const isSubmitted = assessmentData?.status === 'submitted' || assessmentData?.submitted_at;
    
    if (isSubmitted) {
      console.log("Found submitted assessment in assessments table");
    }
    
    return isSubmitted;
  } catch (error) {
    console.error("Error in checkIfAlreadySubmitted:", error);
    return false;
  }
}

// ===== UPDATED: Mark user as submitted =====
async function markAsSubmitted(userId) {
  try {
    // Call the API to handle submission (ensures both frontend and backend checks)
    const response = await fetch('/api/submit-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assessment_id: '11111111-1111-1111-1111-111111111111',
        user_id: userId
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Submission failed');
    }

    console.log("Submission successful via API:", result.message);
    return true;
  } catch (error) {
    console.error("Failed to submit assessment:", error);
    
    // Fallback: Try direct database update if API fails
    try {
      console.log("Trying fallback database update...");
      const { error: dbError } = await supabase
        .from("assessments_completed")
        .insert({
          user_id: userId,
          assessment_id: '11111111-1111-1111-1111-111111111111',
          completed_at: new Date().toISOString(),
          status: 'completed'
        });

      if (dbError) {
        // If it's a duplicate error, that's actually OK - it means already submitted
        if (dbError.code === '23505') {
          console.log("Assessment already marked as completed (unique constraint)");
          return true;
        }
        throw dbError;
      }
      
      console.log("Fallback database update successful");
      return true;
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      throw new Error("Could not submit assessment. Please contact support.");
    }
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Initialize session and check if already submitted
  useEffect(() => {
    const initSessionAndCheck = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          
          // Check if user has already submitted this assessment
          const hasSubmitted = await checkIfAlreadySubmitted(data.session.user.id);
          if (hasSubmitted) {
            setAlreadySubmitted(true);
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
  }, [router]);

  // Fetch questions (only if not already submitted)
  useEffect(() => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id) return;

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

        if (!questionsData || questionsData.length === 0) {
          throw new Error("Assessment questions not found. Please run the setup scripts.");
        }

        const savedAnswers = await loadUserResponses(session.user.id);

        const processedQuestions = questionsData.map(q => {
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
          };
          
          // Randomize ONLY for Bottled Water Manufacturing section
          if (q.section === 'Bottled Water Manufacturing') {
            console.log(`Randomizing answers for Bottled Water Manufacturing question ${q.id}`);
            
            const randomizedOptions = trulyRandomizeAnswers(baseQuestion.options);
            
            console.log('Original order:', baseQuestion.options.map(opt => ({ 
              id: opt.id, 
              text: opt.answer_text.substring(0, 50) + '...' 
            })));
            console.log('Randomized order:', randomizedOptions.map(opt => ({ 
              id: opt.id, 
              text: opt.answer_text.substring(0, 50) + '...' 
            })));
            
            return {
              ...baseQuestion,
              options: randomizedOptions
            };
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

  // Timer (don't run if already submitted)
  useEffect(() => {
    if (alreadySubmitted) return;
    
    const timer = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [alreadySubmitted]);

  // Answer selection
  const handleSelect = async (questionId, answerId) => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id) return;

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
      alert("Failed to save answer. Please try again.");
    }
  };

  // Navigation
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

  // ===== UPDATED: Submit assessment function =====
  const submitAssessment = async () => {
    // Double-check locally before even trying
    if (alreadySubmitted) {
      alert("⚠️ You have already submitted this assessment.");
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
      // This will call the API which does the final check
      await markAsSubmitted(session.user.id);
      
      // If we get here, submission was successful
      setAlreadySubmitted(true);
      
      // Calculate total score from responses
      const calculateAndStoreScore = async () => {
        try {
          const { data: responsesData, error: responsesError } = await supabase
            .from("responses")
            .select(`
              answer_id,
              answers (score)
            `)
            .eq("user_id", session.user.id)
            .eq("assessment_id", assessmentId);

          if (responsesError) throw responsesError;

          const totalScore = responsesData?.reduce((sum, r) => sum + (r.answers?.score || 0), 0) || 0;

          const classification = 
            totalScore >= 90 ? 'Top Talent' :
            totalScore >= 75 ? 'High Potential' :
            totalScore >= 60 ? 'Solid Performer' :
            totalScore >= 40 ? 'Developing' : 'Needs Improvement';

          const { error: classificationError } = await supabase
            .from("talent_classification")
            .upsert({
              user_id: session.user.id,
              total_score: totalScore,
              classification: classification,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          if (classificationError) {
            console.error("Failed to save classification:", classificationError);
            throw classificationError;
          }

          console.log("Score calculated and saved:", { totalScore, classification });
          return { totalScore, classification };
        } catch (error) {
          console.error("Score calculation error:", error);
          throw error;
        }
      };

      await calculateAndStoreScore();
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Submission error:", error);
      
      // Check if it's a "already submitted" error
      if (error.message.includes("already submitted") || error.message.includes("One attempt")) {
        setAlreadySubmitted(true);
        setError("Assessment already submitted. You cannot retake it.");
        alert("Assessment already submitted. You cannot retake it.");
      } else {
        alert("Assessment submitted but there was an error calculating your score. Please contact support.");
      }
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
            Loading Assessment...
          </div>
          <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "3px", overflow: "hidden" }}>
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
            borderRadius: "10px"
          }}>
            <strong>One Attempt Only Policy</strong>
            <br /><br />
            You have already completed and submitted this assessment. 
            <br />
            <strong>Each candidate is allowed only one attempt.</strong>
            <br /><br />
            Your results will be reviewed by our assessment team.
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
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
            Logout & Return to Login
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
            {error.includes("already submitted") && (
              <>
                <br /><br />
                <strong>One attempt only is allowed per candidate.</strong>
              </>
            )}
          </div>
          <button 
            onClick={() => router.push("/")}
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
            No assessment questions found. Please run the setup scripts.
          </div>
          <button 
            onClick={() => router.push("/")}
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

  // Get current question data
  const currentQuestion = questions[currentIndex];
  const currentSection = currentQuestion?.section || SECTION_ORDER[0];
  const sectionConfig = SECTION_CONFIG[currentSection] || SECTION_CONFIG[SECTION_ORDER[0]];
  const totalAnswered = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercentage = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;

  // Calculate time
  const timeRemaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const formatTime = (time) => time.toString().padStart(2, '0');

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
                fontSize: "14px", 
                color: "#666", 
                padding: "12px", 
                background: "#fff8e1", 
                borderRadius: "8px",
                marginBottom: "15px",
                borderLeft: "4px solid #ff9800"
              }}>
                ⚠️ <strong>ONE ATTEMPT ONLY:</strong> After submission, you <strong>cannot</strong> retake this assessment. 
                This is your final submission.
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
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "15px",
                fontSize: "18px",
                fontWeight: "600"
              }}>
                <span>Questions Answered:</span>
                <span style={{ color: "#2e7d32" }}>
                  {totalAnswered}/{questions.length}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: "600"
              }}>
                <span>Completion Rate:</span>
                <span style={{ color: "#2196f3" }}>
                  {progressPercentage}%
                </span>
              </div>

              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                margin: "15px 0",
                padding: "12px",
                background: "#e3f2fd",
                borderRadius: "8px",
                borderLeft: "4px solid #2196f3"
              }}>
                ✅ <strong>One-time submission completed:</strong> Your assessment has been successfully submitted. 
                <br />
                <strong>You cannot retake this assessment.</strong>
              </div>
              
              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                margin: "15px 0",
                padding: "12px",
                background: "#e3f2fd",
                borderRadius: "8px"
              }}>
                <strong>📊 Results:</strong> Your results are now available in the supervisor dashboard for review.
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
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
              Logout Now
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
                      url('https://img.freepik.com/free-photo/multiethnic-group-young-happy-students-standing-outdoors_171337-11812.jpg?semt=ais_user_personalization&w=740&q=80')`,
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
                😊
              </div>
              
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  color: 'white',
                  lineHeight: 1.2
                }}>
                  Stratavax Capability Assessment
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  Q{currentIndex + 1}/{questions.length} • {currentSection}
                  {currentSection === 'Bottled Water Manufacturing' && (
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
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '4px',
              textAlign: 'center',
              minWidth: '70px'
            }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: timeRemaining < 1800 ? '#ff9800' : '#2196f3'
              }}>
                TIME
              </div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '700', 
                color: timeRemaining < 1800 ? '#d84315' : '#1565c0'
              }}>
                {formatTime(hours)}:{formatTime(minutes)}
              </div>
            </div>
          </div>
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

        {/* Main Content */}
        <div style={{ 
          flex: 1,
          padding: '10px',
          display: 'flex',
          overflow: 'hidden',
          gap: '10px'
        }}>
          {/* Question & Answers */}
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
                  {currentSection === 'Bottled Water Manufacturing' && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '400',
                      color: '#666',
                      marginLeft: '8px',
                      textTransform: 'none',
                      fontStyle: 'italic'
                    }}>
                      (Answers are randomized for fairness)
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '18px', 
                lineHeight: 1.5,
                color: '#333',
                fontWeight: '500',
                marginBottom: '5px'
              }}>
                <strong style={{ color: sectionConfig.color }}>Question {currentIndex + 1}:</strong>
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

            {/* Answers */}
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
                    onClick={() => handleSelect(currentQuestion.id, option.id)}
                    disabled={saveStatus[currentQuestion.id] === 'saving'}
                    style={{
                      padding: '15px 20px',
                      background: isSelected ? sectionConfig.lightBg : 'white',
                      border: `2px solid ${isSelected ? sectionConfig.color : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: saveStatus[currentQuestion.id] === 'saving' ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      fontSize: '15px',
                      lineHeight: 1.4,
                      color: isSelected ? sectionConfig.color : '#333',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '15px',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 4px 8px ${sectionConfig.color}40` : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!saveStatus[currentQuestion.id] && !isSelected) {
                        e.currentTarget.style.background = '#f8f9fa';
                        e.currentTarget.style.borderColor = sectionConfig.color;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!saveStatus[currentQuestion.id] && !isSelected) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
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
                      flexShrink: 0,
                      marginTop: '2px'
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

            {/* Navigation */}
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
                disabled={currentIndex === 0} 
                style={{ 
                  padding: '12px 24px', 
                  background: currentIndex === 0 ? '#f5f5f5' : sectionConfig.color, 
                  color: currentIndex === 0 ? '#999' : 'white', 
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  minWidth: '100px',
                  transition: 'all 0.2s',
                  opacity: currentIndex === 0 ? 0.6 : 1
                }}
              >
                ← Previous Question
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
                  Question {currentIndex + 1} of {questions.length}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500', 
                  color: sectionConfig.color
                }}>
                  {progressPercentage}% Complete
                </div>
              </div>
              
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  style={{ 
                    padding: '12px 24px', 
                    background: '#4caf50', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    minWidth: '100px',
                    transition: 'all 0.2s'
                  }}
                >
                  Submit Assessment →
                </button>
              ) : (
                <button 
                  onClick={handleNext} 
                  style={{ 
                    padding: '12px 24px', 
                    background: sectionConfig.color, 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: "14px",
                    fontWeight: "600",
                    minWidth: "100px",
                    transition: "all 0.2s"
                  }}
                >
                  Next Question →
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator */}
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
              fontSize: "14px",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center"
              }}>
                <div style={{ color: "#4caf50", fontWeight: "700", fontSize: "18px" }}>
                  {totalAnswered}
                </div>
                <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>
                  Answered
                </div>
              </div>
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center"
              }}>
                <div style={{ color: "#666", fontWeight: "700", fontSize: "18px" }}>
                  {questions.length - totalAnswered}
                </div>
                <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>
                  Remaining
                </div>
              </div>
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center"
              }}>
                <div style={{ color: "#2196f3", fontWeight: "700", fontSize: "18px" }}>
                  {progressPercentage}%
                </div>
                <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>
                  Complete
                </div>
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
                    onClick={() => setCurrentIndex(index)}
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
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0",
                      transition: "all 0.2s",
                      position: "relative"
                    }}
                    title={`Question ${index + 1}${isAnswered ? " (Answered)" : " (Not answered)"}`}
                    onMouseOver={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {index + 1}
                    {isCurrent && (
                      <div style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: sectionConfig.color,
                        border: "2px solid white"
                      }} />
                    )}
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
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "8px",
                textAlign: "center"
              }}>
                Navigation Guide
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                fontSize: "11px"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  padding: "6px",
                  background: "#f8f9fa",
                  borderRadius: "4px"
                }}>
                  <div style={{ 
                    width: "16px", 
                    height: "16px", 
                    borderRadius: "4px", 
                    background: "#4caf50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "10px"
                  }}>
                    ✓
                  </div>
                  <span>Answered</span>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  padding: "6px",
                  background: "#f8f9fa",
                  borderRadius: "4px"
                }}>
                  <div style={{ 
                    width: "16px", 
                    height: "16px", 
                    borderRadius: "4px", 
                    background: sectionConfig.color,
                    position: "relative"
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "-3px",
                      right: "-3px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "white",
                      border: "1px solid" + sectionConfig.color
                    }} />
                  </div>
                  <span>Current</span>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  padding: "6px",
                  background: "#f8f9fa",
                  borderRadius: "4px"
                }}>
                  <div style={{ 
                    width: "16px", 
                    height: "16px", 
                    borderRadius: "4px", 
                    background: "#f5f5f5",
                    border: "1px solid #e0e0e0"
                  }} />
                  <span>Pending</span>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  padding: "6px",
                  background: "#f8f9fa",
                  borderRadius: "4px"
                }}>
                  <div style={{ 
                    width: "16px", 
                    height: "16px", 
                    borderRadius: "4px", 
                    background: "#2196f3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "bold"
                  }}>
                    %
                  </div>
                  <span>Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
