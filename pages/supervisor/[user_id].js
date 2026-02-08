// pages/supervisor/[user_id].js - FIXED WITH PROPER CANDIDATE NAME & EMAIL
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  // Helper function to get classification based on score
  const getClassification = (score) => {
    if (score >= 450) return "Elite Talent";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid Performer";
    if (score >= 250) return "Developing Talent";
    if (score >= 200) return "Emerging Talent";
    return "Needs Improvement";
  };

  // Helper function to get classification color
  const getClassificationColor = (score) => {
    if (score >= 450) return "#4CAF50"; // Green
    if (score >= 400) return "#2196F3"; // Blue
    if (score >= 350) return "#FF9800"; // Orange
    if (score >= 300) return "#9C27B0"; // Purple
    if (score >= 250) return "#F57C00"; // Deep Orange
    if (score >= 200) return "#795548"; // Brown
    return "#F44336"; // Red
  };

  // Helper function to get classification description
  const getClassificationDescription = (score) => {
    if (score >= 450) return "Exceptional performer demonstrating mastery across all assessment categories. Consistently exceeds expectations with outstanding analytical, technical, and leadership capabilities.";
    if (score >= 400) return "Outstanding performer with clear strengths across multiple domains. Demonstrates strong leadership potential and technical competence suitable for increased responsibility.";
    if (score >= 350) return "Strong performer with clear development areas. Shows promise for growth and advancement with targeted development and strategic improvement opportunities.";
    if (score >= 300) return "Reliable and consistent performer meeting core requirements. Demonstrates competency in key areas with predictable performance and potential for growth.";
    if (score >= 250) return "Shows foundational skills with clear development needs. Requires structured guidance and skill-building opportunities to reach full potential.";
    if (score >= 200) return "Early-stage performer requiring significant development. Needs comprehensive training and close supervision to enhance foundational skills.";
    return "Performance below expectations requiring immediate attention. Needs intensive development plan and regular performance reviews to address critical gaps.";
  };

  // Helper function to get performance grade
  const getPerformanceGrade = (score) => {
    if (score >= 450) return "A+";
    if (score >= 400) return "A";
    if (score >= 350) return "B+";
    if (score >= 300) return "B";
    if (score >= 250) return "C";
    if (score >= 200) return "D";
    return "F";
  };

  // Helper function to get grade label
  const getGradeLabel = (score) => {
    if (score >= 450) return "Elite";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid";
    if (score >= 250) return "Developing";
    if (score >= 200) return "Emerging";
    return "Needs Improvement";
  };

  // 1. Get category grade based on NEW scale
  const getCategoryGrade = (percentage) => {
    if (percentage >= 80) return "A";
    if (percentage >= 75) return "A-";
    if (percentage >= 70) return "B+";
    if (percentage >= 65) return "B";
    if (percentage >= 60) return "B-";
    if (percentage >= 55) return "C+";
    if (percentage >= 50) return "C";
    if (percentage >= 45) return "C-";
    if (percentage >= 40) return "D+";
    if (percentage >= 35) return "D";
    return "F";
  };

  // 2. Get category grade label (for dashboards) - UPDATED
  const getCategoryGradeLabel = (grade) => {
    const labels = {
      "A": "High-impact candidate",
      "A-": "Strong candidate with minor refinement areas",
      "B+": "Above average performance",
      "B": "Solid performance",
      "B-": "Adequate with some development needs",
      "C+": "Meets basic requirements",
      "C": "Development required",
      "C-": "Significant improvement needed",
      "D+": "Below expectations",
      "D": "Low readiness",
      "F": "Not suitable"
    };
    return labels[grade] || "Unknown";
  };

  // 3. Get performance label for categories - UPDATED
  const getCategoryPerformanceLabel = (percentage) => {
    if (percentage >= 80) return "Exceptional";
    if (percentage >= 75) return "Outstanding";
    if (percentage >= 70) return "Above Average";
    if (percentage >= 65) return "Solid";
    if (percentage >= 60) return "Adequate";
    if (percentage >= 55) return "Developing";
    if (percentage >= 50) return "Basic";
    if (percentage >= 45) return "Below Expectations";
    if (percentage >= 40) return "Poor";
    if (percentage >= 35) return "Very Poor";
    return "Unsuitable";
  };

  // 4. Get performance color for categories - UPDATED with more granular colors
  const getCategoryPerformanceColor = (percentage) => {
    if (percentage >= 80) return "#4CAF50"; // Green - Excellent
    if (percentage >= 75) return "#66BB6A"; // Light Green - Very Good
    if (percentage >= 70) return "#2196F3"; // Blue - Good
    if (percentage >= 65) return "#42A5F5"; // Light Blue - Above Average
    if (percentage >= 60) return "#FF9800"; // Orange - Average
    if (percentage >= 55) return "#FFA726"; // Light Orange - Below Average
    if (percentage >= 50) return "#FF5722"; // Deep Orange - Poor
    if (percentage >= 45) return "#F44336"; // Red - Very Poor
    if (percentage >= 40) return "#E53935"; // Dark Red - Critical
    if (percentage >= 35) return "#C62828"; // Darker Red - Very Critical
    return "#B71C1C"; // Darkest Red - Unsuitable
  };

  // 5. Get performance icon/emoji - UPDATED
  const getCategoryPerformanceIcon = (percentage) => {
    if (percentage >= 80) return "🏆";
    if (percentage >= 75) return "⭐";
    if (percentage >= 70) return "👍";
    if (percentage >= 65) return "👌";
    if (percentage >= 60) return "✅";
    if (percentage >= 55) return "⚠️";
    if (percentage >= 50) return "📉";
    if (percentage >= 45) return "❌";
    if (percentage >= 40) return "🔴";
    if (percentage >= 35) return "💀";
    return "🚫";
  };

  // Check supervisor authentication
  useEffect(() => {
    const checkSupervisorAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn && session.expires > Date.now()) {
            setIsSupervisor(true);
          } else {
            // Session expired
            localStorage.removeItem("supervisorSession");
            router.push("/supervisor-login");
          }
        } catch {
          localStorage.removeItem("supervisorSession");
          router.push("/supervisor-login");
        }
      }
    };

    checkSupervisorAuth();
  }, [router]);

  // Fetch candidate data - UNIVERSAL FIX FOR ALL CANDIDATES
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        // METHOD 1: Try candidate_assessments VIEW first (same as index.js)
        // This works for most candidates
        const { data: candidateData, error: candidateError } = await supabase
          .from("candidate_assessments")
          .select(`
            user_id,
            total_score,
            classification,
            email,
            full_name
          `)
          .eq("user_id", user_id)
          .single();
        
        if (!candidateError && candidateData) {
          // SUCCESS: Found in candidate_assessments VIEW
          setUserEmail(candidateData.email || "Email not found");
          setUserName(candidateData.full_name || `Candidate ${user_id.substring(0, 8).toUpperCase()}`);
          
          setCandidate({
            total_score: candidateData.total_score,
            classification: candidateData.classification || getClassification(candidateData.total_score),
            user_id: candidateData.user_id
          });
          
          // Fetch responses
          await fetchAndCalculateCategoryScores(user_id);
          return;
        }
        
        // METHOD 2: If not in candidate_assessments VIEW, check talent_classification + auth.users
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("total_score, classification")
          .eq("user_id", user_id)
          .single();
        
        if (!classificationError && classificationData) {
          // Try to get user info from auth.users
          try {
            // First try admin API
            const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user_id);
            
            if (!authError && authData?.user) {
              setUserEmail(authData.user.email || "Email not found");
              setUserName(authData.user.user_metadata?.name || 
                         authData.user.user_metadata?.full_name ||
                         authData.user.email?.split('@')[0] ||
                         `Candidate ${user_id.substring(0, 8).toUpperCase()}`);
            } else {
              // Try direct query to auth.users
              const { data: authDirectData, error: authDirectError } = await supabase
                .from("auth.users")
                .select("email, raw_user_meta_data")
                .eq("id", user_id)
                .single();
              
              if (!authDirectError && authDirectData) {
                setUserEmail(authDirectData.email || "Email not found");
                const meta = authDirectData.raw_user_meta_data || {};
                setUserName(meta.name || meta.full_name || 
                           authDirectData.email?.split('@')[0] ||
                           `Candidate ${user_id.substring(0, 8).toUpperCase()}`);
              } else {
                // Fallback
                setUserEmail("Email not found");
                setUserName(`Candidate ${user_id.substring(0, 8).toUpperCase()}`);
              }
            }
          } catch (authErr) {
            // Auth lookup failed
            setUserEmail("Email not found");
            setUserName(`Candidate ${user_id.substring(0, 8).toUpperCase()}`);
          }
          
          setCandidate({
            total_score: classificationData.total_score,
            classification: classificationData.classification || getClassification(classificationData.total_score),
            user_id: user_id
          });
          
          // Fetch responses
          await fetchAndCalculateCategoryScores(user_id);
          return;
        }
        
        // METHOD 3: Candidate not found in either place
        setUserEmail("Email not found");
        setUserName(`Candidate ${user_id.substring(0, 8).toUpperCase()}`);
        setCandidate(null);
        
      } catch (err) {
        console.error("Fetch error:", err);
        setUserEmail("Email not found");
        setUserName(`Candidate ${user_id.substring(0, 8).toUpperCase()}`);
      } finally {
        setLoading(false);
      }
    };

    // MAIN FUNCTION: Fetch responses and calculate category scores
    const fetchAndCalculateCategoryScores = async (userId) => {
      try {
        // Fetch all responses for this user
        const { data: allResponses, error: responsesError } = await supabase
          .from("responses")
          .select("id, question_id, answer_id, assessment_id")
          .eq("user_id", userId);
        
        if (responsesError) {
          console.error('Error fetching responses:', responsesError);
          return;
        }
        
        if (!allResponses || allResponses.length === 0) {
          console.log('No responses found for user');
          return;
        }
        
        setResponses(allResponses);
        
        // Now calculate category scores
        await calculateCategoryScoresFromResponses(allResponses);
        
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    // CALCULATE CATEGORY SCORES FROM RESPONSES
    const calculateCategoryScoresFromResponses = async (responsesData) => {
      try {
        if (!responsesData || responsesData.length === 0) {
          return;
        }
        
        // Get unique question and answer IDs
        const questionIds = [...new Set(responsesData.map(r => r.question_id))];
        const answerIds = [...new Set(responsesData.map(r => r.answer_id))];
        
        // Fetch questions
        const { data: questions, error: qError } = await supabase
          .from("questions")
          .select("id, section, text")
          .in("id", questionIds);
        
        if (qError || !questions || questions.length === 0) {
          return;
        }
        
        // Fetch answers
        const { data: answers, error: aError } = await supabase
          .from("answers")
          .select("id, score, text")
          .in("id", answerIds);
        
        if (aError || !answers || answers.length === 0) {
          return;
        }
        
        // Create maps
        const questionsMap = {};
        questions.forEach(q => {
          questionsMap[q.id] = q.section;
        });
        
        const answersMap = {};
        answers.forEach(a => {
          answersMap[a.id] = a.score;
        });
        
        // Calculate category scores
        const categoryTotals = {};
        const categoryCounts = {};
        
        responsesData.forEach(response => {
          const section = questionsMap[response.question_id];
          const score = answersMap[response.answer_id] || 0;
          
          if (section) {
            categoryTotals[section] = (categoryTotals[section] || 0) + score;
            categoryCounts[section] = (categoryCounts[section] || 0) + 1;
          }
        });
        
        // Calculate category percentages
        const calculatedCategoryScores = {};
        Object.keys(categoryTotals).forEach(section => {
          const total = categoryTotals[section];
          const count = categoryCounts[section];
          const maxPossible = count * 5;
          const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
          const average = count > 0 ? (total / count).toFixed(1) : 0;
          
          calculatedCategoryScores[section] = {
            total,
            average: parseFloat(average),
            count,
            percentage,
            maxPossible
          };
        });
        
        setCategoryScores(calculatedCategoryScores);
        
        // Calculate strengths, weaknesses, and recommendations
        calculateAnalysis(calculatedCategoryScores);
        
      } catch (error) {
        console.error("Calculation error:", error);
      }
    };

    // Calculate strengths, weaknesses, and recommendations
    const calculateAnalysis = (categoryScoresData) => {
      const candidateStrengths = [];
      const candidateWeaknesses = [];
      
      const strengthThreshold = 70;
      const weaknessThreshold = 60;
      
      Object.entries(categoryScoresData).forEach(([section, data]) => {
        const percentage = data.percentage;
        const grade = getCategoryGrade(percentage);
        const performanceLabel = getCategoryPerformanceLabel(percentage);
        
        if (percentage >= strengthThreshold) {
          candidateStrengths.push({
            category: section,
            score: percentage,
            grade: grade,
            gradeLabel: getCategoryGradeLabel(grade),
            interpretation: `${performanceLabel} performance in ${section}`,
            icon: getCategoryPerformanceIcon(percentage)
          });
        }
        
        if (percentage < weaknessThreshold) {
          candidateWeaknesses.push({
            category: section,
            score: percentage,
            grade: grade,
            gradeLabel: getCategoryGradeLabel(grade),
            interpretation: `${performanceLabel} performance in ${section}`,
            icon: getCategoryPerformanceIcon(percentage)
          });
        }
      });
      
      setStrengths(candidateStrengths);
      setWeaknesses(candidateWeaknesses);
      
      // Generate recommendations
      const candidateRecommendations = candidateWeaknesses.map(weakness => {
        let recommendation = "";
        let specificIssue = "";
        
        switch(weakness.category) {
          case 'Cognitive Abilities':
            specificIssue = `Cognitive abilities scored ${weakness.score}% (Grade ${weakness.grade}).`;
            recommendation = "Consider cognitive training exercises, problem-solving workshops, and analytical thinking development programs.";
            break;
          case 'Personality Assessment':
            specificIssue = `Personality assessment scored ${weakness.score}% (Grade ${weakness.grade}).`;
            recommendation = "Engage in personality development sessions, emotional intelligence training, and communication workshops.";
            break;
          case 'Leadership Potential':
            specificIssue = `Leadership potential scored ${weakness.score}% (Grade ${weakness.grade}).`;
            recommendation = "Participate in leadership workshops, mentorship programs, and team management exercises.";
            break;
          case 'Technical Competence':
            specificIssue = `Technical competence scored ${weakness.score}% (Grade ${weakness.grade}).`;
            recommendation = "Attend technical training sessions, industry-specific workshops, and hands-on practice programs.";
            break;
          case 'Performance Metrics':
            specificIssue = `Performance metrics scored ${weakness.score}% (Grade ${weakness.grade}).`;
            recommendation = "Focus on goal-setting strategies, performance tracking improvement, time management workshops.";
            break;
          default:
            specificIssue = `${weakness.category} scored ${weakness.score}% (Grade ${weakness.grade}).`;
            recommendation = "Consider targeted training and development programs in this specific area.";
        }
        
        return {
          category: weakness.category,
          issue: specificIssue,
          recommendation: recommendation,
          grade: weakness.grade,
          score: weakness.score
        };
      });
      
      if (candidateWeaknesses.length === 0 && Object.keys(categoryScoresData).length > 0) {
        candidateRecommendations.push({
          category: "Overall Performance",
          issue: "Strong overall performance across all categories",
          recommendation: "Continue current development path. Consider advanced training in areas of strength.",
          grade: "A/B",
          score: 85
        });
      }
      
      setRecommendations(candidateRecommendations);
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  const getScoreColor = (score) => {
    if (score >= 4) return "#4CAF50";
    if (score >= 3) return "#FF9800";
    return "#F44336";
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Cognitive Abilities': '#4A6FA5',
      'Personality Assessment': '#9C27B0',
      'Leadership Potential': '#D32F2F',
      'Technical Competence': '#388E3C',
      'Performance Metrics': '#F57C00'
    };
    return colors[category] || '#666';
  };

  if (!isSupervisor) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <p style={{ textAlign: "center" }}>Checking authentication...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "400px" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ 
              width: "50px", 
              height: "50px", 
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #1565c0",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }} />
            <p style={{ color: "#666" }}>Loading candidate report...</p>
            <p style={{ color: "#888", fontSize: "12px", marginTop: "10px" }}>
              Candidate: {userName || "Loading..."}
            </p>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          width: "90vw", 
          margin: "auto", 
          padding: "40px 20px",
          textAlign: "center" 
        }}>
          <h1 style={{ color: "#666", marginBottom: "20px" }}>Candidate Not Found</h1>
          <p style={{ color: "#888", marginBottom: "30px" }}>
            The requested candidate data could not be found.
          </p>
          <button
            onClick={handleBack}
            style={{
              padding: "12px 24px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  const candidateScore = candidate.total_score;
  const classification = getClassification(candidateScore);
  const classificationColor = getClassificationColor(candidateScore);
  const classificationDescription = getClassificationDescription(candidateScore);
  const performanceGrade = getPerformanceGrade(candidateScore);
  const gradeLabel = getGradeLabel(candidateScore);

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            marginBottom: "20px" 
          }}>
            <div>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1565c0",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "0",
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                ← Back to Dashboard
              </button>
              <h1 style={{ 
                margin: "0 0 10px 0", 
                color: "#333",
                fontSize: "28px"
              }}>
                Candidate Performance Report
              </h1>
              <p style={{ 
                margin: "0 0 5px 0", 
                color: "#666",
                fontSize: "16px",
                fontWeight: "500"
              }}>
                {userName}
              </p>
              <p style={{ 
                margin: "0", 
                color: userEmail === "Email not found" ? "#999" : "#888",
                fontSize: "14px",
                fontStyle: userEmail === "Email not found" ? "italic" : "normal"
              }}>
                {userEmail === "Email not found" ? "Email not available" : userEmail}
              </p>
              <p style={{ 
                margin: "5px 0 0 0", 
                color: "#999",
                fontSize: "12px",
                fontFamily: "monospace"
              }}>
                ID: {user_id?.substring(0, 12)}... | Score: {candidateScore} | {classification}
              </p>
            </div>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px 20px", 
              borderRadius: "10px",
              minWidth: "200px"
            }}>
              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                marginBottom: "5px" 
              }}>
                Overall Classification
              </div>
              <div style={{ 
                fontSize: "20px", 
                fontWeight: "700",
                color: classificationColor
              }}>
                {classification}
              </div>
              <div style={{ 
                fontSize: "12px", 
                color: "#888", 
                marginTop: "5px",
                fontStyle: "italic"
              }}>
                Score: {candidateScore}/500
              </div>
            </div>
          </div>

          {/* Performance Classification Details */}
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Performance Classification</h3>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
              gap: "10px",
              marginBottom: "20px"
            }}>
              {[
                { range: "450-500", label: "Elite Talent", color: "#4CAF50", active: candidateScore >= 450 },
                { range: "400-449", label: "Top Talent", color: "#2196F3", active: candidateScore >= 400 && candidateScore < 450 },
                { range: "350-399", label: "High Potential", color: "#FF9800", active: candidateScore >= 350 && candidateScore < 400 },
                { range: "300-349", label: "Solid Performer", color: "#9C27B0", active: candidateScore >= 300 && candidateScore < 350 },
                { range: "250-299", label: "Developing Talent", color: "#F57C00", active: candidateScore >= 250 && candidateScore < 300 },
                { range: "200-249", label: "Emerging Talent", color: "#795548", active: candidateScore >= 200 && candidateScore < 250 },
                { range: "0-199", label: "Needs Improvement", color: "#F44336", active: candidateScore < 200 }
              ].map((item, index) => (
                <div key={index} style={{
                  padding: "12px",
                  background: item.active ? item.color : "#f8f9fa",
                  color: item.active ? "white" : "#666",
                  borderRadius: "8px",
                  textAlign: "center",
                  border: `2px solid ${item.active ? item.color : "#e0e0e0"}`,
                  fontWeight: item.active ? "600" : "400"
                }}>
                  <div style={{ fontSize: "14px" }}>{item.range}</div>
                  <div style={{ fontSize: "12px", opacity: item.active ? 0.9 : 0.7 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ 
              padding: "15px",
              background: candidateScore >= 450 ? "#e8f5e9" :
                         candidateScore >= 400 ? "#e3f2fd" :
                         candidateScore >= 350 ? "#fff3e0" :
                         candidateScore >= 300 ? "#f3e5f5" :
                         candidateScore >= 250 ? "#fff8e1" :
                         candidateScore >= 200 ? "#efebe9" : "#ffebee",
              borderRadius: "8px",
              borderLeft: `4px solid ${classificationColor}`
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600",
                color: "#333",
                marginBottom: "5px"
              }}>
                {classification} - Performance Summary
              </div>
              <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.5 }}>
                {classificationDescription}
              </div>
            </div>
          </div>

          {/* Overall Score Card */}
          <div style={{
            background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            marginBottom: "30px"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>Overall Assessment Score</div>
                <div style={{ fontSize: "48px", fontWeight: "700", margin: "10px 0" }}>
                  {candidateScore}
                </div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>
                  Candidate: {userName}
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  opacity: 0.8, 
                  marginTop: "5px",
                  padding: "5px 10px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  display: "inline-block"
                }}>
                  Max possible: 500 points • {Math.round((candidateScore / 500) * 100)}% overall • {classification}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "5px solid rgba(255,255,255,0.2)"
                }}>
                  <div style={{ fontSize: "32px", fontWeight: "700" }}>
                    {performanceGrade}
                  </div>
                </div>
                <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.8 }}>
                  Performance Grade
                </div>
                <div style={{ 
                  fontSize: "11px", 
                  opacity: 0.7,
                  marginTop: "3px"
                }}>
                  {gradeLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY SCORES BREAKDOWN */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Performance by Category</h2>
          
          {Object.keys(categoryScores).length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>📊</div>
              <h3 style={{ color: "#666" }}>Loading Category Scores...</h3>
              <p style={{ maxWidth: "500px", margin: "0 auto" }}>
                Please wait while we calculate category scores.
              </p>
            </div>
          ) : (
            <>
              {/* Category Score Cards */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                gap: "20px",
                marginBottom: "30px"
              }}>
                {Object.entries(categoryScores).map(([category, data]) => (
                  <div key={category} style={{
                    borderLeft: `4px solid ${getCategoryColor(category)}`,
                    padding: "20px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "15px"
                    }}>
                      <div>
                        <h3 style={{ 
                          margin: "0 0 5px 0", 
                          color: getCategoryColor(category),
                          fontSize: "18px"
                        }}>
                          {category}
                        </h3>
                        <p style={{ 
                          margin: 0, 
                          fontSize: "14px", 
                          color: "#666" 
                        }}>
                          {data.count} questions • Avg: {data.average.toFixed(1)}/5
                        </p>
                      </div>
                      <div style={{ 
                        fontSize: "28px", 
                        fontWeight: "700",
                        color: getCategoryColor(category)
                      }}>
                        {data.percentage}%
                      </div>
                    </div>
                    
                    <div style={{ 
                      height: "10px", 
                      background: "#e0e0e0", 
                      borderRadius: "5px",
                      overflow: "hidden",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        height: "100%", 
                        width: `${data.percentage}%`, 
                        background: getCategoryColor(category),
                        borderRadius: "5px"
                      }} />
                    </div>
                    
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      fontSize: "12px", 
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      <span>Score: {data.total}/{data.maxPossible}</span>
                      <span>Grade: {getCategoryGrade(data.percentage)} • {data.percentage}% of max</span>
                    </div>
                    
                    <div style={{ 
                      fontSize: "12px",
                      fontWeight: "600",
                      color: data.percentage >= 70 ? "#4CAF50" : 
                             data.percentage >= 60 ? "#FF9800" : "#F44336",
                      textAlign: "right",
                      marginTop: "5px"
                    }}>
                      {getCategoryPerformanceIcon(data.percentage)} {getCategoryPerformanceLabel(data.percentage)} ({getCategoryGrade(data.percentage)})
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Performance Grid */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "15px",
                marginTop: "30px"
              }}>
                {Object.entries(categoryScores).map(([category, data]) => {
                  const percentage = data.percentage;
                  const grade = getCategoryGrade(percentage);
                  const color = getCategoryPerformanceColor(percentage);
                  const icon = getCategoryPerformanceIcon(percentage);
                  const label = getCategoryPerformanceLabel(percentage);
                  
                  return (
                    <div key={category} style={{
                      padding: "15px",
                      background: color + "10",
                      border: `1px solid ${color}30`,
                      borderRadius: "10px",
                      textAlign: "center"
                    }}>
                      <div style={{ fontSize: "24px", marginBottom: "5px" }}>
                        {icon}
                      </div>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "5px"
                      }}>
                        {category}
                      </div>
                      <div style={{ 
                        fontSize: "20px", 
                        fontWeight: "700",
                        color: color,
                        marginBottom: "5px"
                      }}>
                        {grade}
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666",
                        marginBottom: "5px"
                      }}>
                        {label}
                      </div>
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#888"
                      }}>
                        {percentage}% • {getCategoryGradeLabel(grade)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* STRENGTHS & WEAKNESSES */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "30px",
          marginBottom: "30px"
        }}>
          {/* Strengths */}
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ 
                background: "#4CAF50", 
                color: "white",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                ✓
              </span>
              Key Strengths
            </h2>
            
            {strengths.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "20px",
                color: "#888",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <p>No significant strengths identified.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {strengths.map((strength, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "#e8f5e9",
                    borderRadius: "8px",
                    borderLeft: `4px solid #4CAF50`
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#2E7D32"
                      }}>
                        {strength.category}
                      </div>
                      <div style={{ 
                        fontSize: "24px"
                      }}>
                        {strength.icon}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      Score: <strong>{strength.score}%</strong> • Grade: <strong>{strength.grade}</strong>
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#888"
                    }}>
                      {strength.interpretation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weaknesses */}
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ 
                background: "#F44336", 
                color: "white",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                !
              </span>
              Development Areas
            </h2>
            
            {weaknesses.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "20px",
                color: "#888",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <p>No significant weaknesses identified.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {weaknesses.map((weakness, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "#ffebee",
                    borderRadius: "8px",
                    borderLeft: `4px solid #F44336`
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#C62828"
                      }}>
                        {weakness.category}
                      </div>
                      <div style={{ 
                        fontSize: "24px"
                      }}>
                        {weakness.icon}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      Score: <strong>{weakness.score}%</strong> • Grade: <strong>{weakness.grade}</strong>
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#888"
                    }}>
                      {weakness.interpretation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECOMMENDATIONS */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ 
            margin: "0 0 20px 0", 
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ 
              background: "#1565c0", 
              color: "white",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px"
            }}>
              💡
            </span>
            Development Recommendations
          </h2>
          
          {recommendations.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "30px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <p>No specific recommendations available.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: "#e3f2fd",
                  borderRadius: "8px",
                  borderLeft: `4px solid #1565c0`
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px"
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#1565c0",
                        marginBottom: "5px"
                      }}>
                        {rec.category}
                      </div>
                      <div style={{ 
                        fontSize: "14px", 
                        color: "#666",
                        fontStyle: "italic",
                        marginBottom: "10px"
                      }}>
                        {rec.issue}
                      </div>
                    </div>
                    <div style={{ 
                      background: rec.score >= 70 ? "#4CAF50" : 
                                 rec.score >= 60 ? "#FF9800" : "#F44336",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      Grade: {rec.grade}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: "14px", 
                    color: "#333",
                    lineHeight: 1.5
                  }}>
                    <strong>Recommendation:</strong> {rec.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: "center", 
          padding: "20px",
          color: "#666",
          fontSize: "12px",
          borderTop: "1px solid #e0e0e0",
          marginTop: "30px"
        }}>
          <p>Candidate Performance Report • Generated on {new Date().toLocaleDateString()} • Supervisor View</p>
          <p style={{ color: "#888", marginTop: "5px" }}>
            This report is based on assessment data and is intended for internal use only.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
