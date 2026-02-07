// pages/supervisor/[user_id].js - COMPLETE FIXED VERSION WITH CATEGORY BREAKDOWN
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

  // Helper functions (same as before)
  const getClassification = (score) => {
    if (score >= 450) return "Elite Talent";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid Performer";
    if (score >= 250) return "Developing Talent";
    if (score >= 200) return "Emerging Talent";
    return "Needs Improvement";
  };

  const getClassificationColor = (score) => {
    if (score >= 450) return "#4CAF50";
    if (score >= 400) return "#2196F3";
    if (score >= 350) return "#FF9800";
    if (score >= 300) return "#9C27B0";
    if (score >= 250) return "#F57C00";
    if (score >= 200) return "#795548";
    return "#F44336";
  };

  const getClassificationDescription = (score) => {
    if (score >= 450) return "Exceptional performer demonstrating mastery across all assessment categories. Consistently exceeds expectations with outstanding analytical, technical, and leadership capabilities.";
    if (score >= 400) return "Outstanding performer with clear strengths across multiple domains. Demonstrates strong leadership potential and technical competence suitable for increased responsibility.";
    if (score >= 350) return "Strong performer with clear development areas. Shows promise for growth and advancement with targeted development and strategic improvement opportunities.";
    if (score >= 300) return "Reliable and consistent performer meeting core requirements. Demonstrates competency in key areas with predictable performance and potential for growth.";
    if (score >= 250) return "Shows foundational skills with clear development needs. Requires structured guidance and skill-building opportunities to reach full potential.";
    if (score >= 200) return "Early-stage performer requiring significant development. Needs comprehensive training and close supervision to enhance foundational skills.";
    return "Performance below expectations requiring immediate attention. Needs intensive development plan and regular performance reviews to address critical gaps.";
  };

  const getPerformanceGrade = (score) => {
    if (score >= 450) return "A+";
    if (score >= 400) return "A";
    if (score >= 350) return "B+";
    if (score >= 300) return "B";
    if (score >= 250) return "C";
    if (score >= 200) return "D";
    return "F";
  };

  const getGradeLabel = (score) => {
    if (score >= 450) return "Elite";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid";
    if (score >= 250) return "Developing";
    if (score >= 200) return "Emerging";
    return "Needs Improvement";
  };

  // Category grading functions
  const getCategoryGrade = (percentage) => {
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    if (percentage >= 40) return "E";
    return "F";
  };

  const getCategoryGradeLabel = (grade) => {
    const labels = {
      "A": "High-impact candidate",
      "B": "Strong candidate", 
      "C": "Viable with development",
      "D": "Development required",
      "E": "Low readiness",
      "F": "Not suitable"
    };
    return labels[grade] || "Unknown";
  };

  const getCategoryInterpretation = (percentage, category) => {
    if (percentage >= 80) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Demonstrates exceptional cognitive processing, analytical reasoning, and problem-solving capabilities. Shows advanced pattern recognition, logical deduction, and mental agility suitable for complex decision-making roles.";
        case 'Personality Assessment':
          return "Exhibits outstanding emotional intelligence, adaptability, and interpersonal skills. Demonstrates strong self-awareness, resilience, and communication abilities ideal for collaborative environments.";
        case 'Leadership Potential':
          return "Shows exceptional leadership qualities including strategic vision, influence, and team development capabilities. Demonstrates natural ability to inspire, motivate, and drive organizational success.";
        case 'Technical Competence':
          return "Possesses expert-level technical knowledge and application skills. Demonstrates mastery of technical concepts, problem-solving abilities, and capacity for innovation in specialized domains.";
        case 'Performance Metrics':
          return "Consistently exceeds performance targets with exceptional results. Demonstrates outstanding productivity, efficiency, and goal achievement capabilities with measurable impact.";
        default:
          return "Demonstrates exceptional capability across assessed dimensions. Shows strong reasoning, sound judgment, and consistent performance.";
      }
    }
    
    if (percentage >= 70) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Displays strong cognitive abilities with effective problem-solving skills. Demonstrates good analytical thinking, logical reasoning, and mental processing suitable for role requirements.";
        case 'Personality Assessment':
          return "Shows well-developed interpersonal skills and emotional intelligence. Demonstrates adaptability, reliability, and effective communication in most professional situations.";
        case 'Leadership Potential':
          return "Exhibits solid leadership qualities with potential for growth. Demonstrates ability to guide teams, make decisions, and contribute to organizational objectives.";
        case 'Technical Competence':
          return "Possesses solid technical knowledge and practical application skills. Demonstrates competence in key technical areas with ability to solve most job-related problems.";
        case 'Performance Metrics':
          return "Consistently meets and occasionally exceeds performance expectations. Demonstrates reliable productivity and effective goal achievement capabilities.";
        default:
          return "Displays strong overall capability with minor development areas. Demonstrates effective problem-solving and reliable performance.";
      }
    }
    
    if (percentage >= 60) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Meets basic cognitive requirements but shows inconsistency in complex problem-solving. Demonstrates adequate reasoning abilities but may struggle with abstract concepts or rapid processing.";
        case 'Personality Assessment':
          return "Shows adequate interpersonal skills but may need development in specific areas. Demonstrates basic emotional intelligence but could improve adaptability or communication effectiveness.";
        case 'Leadership Potential':
          return "Displays foundational leadership qualities requiring structured development. Shows potential for growth but needs guidance in decision-making and team management.";
        case 'Technical Competence':
          return "Possesses basic technical understanding with room for skill development. Demonstrates fundamental knowledge but requires additional training for complex applications.";
        case 'Performance Metrics':
          return "Meets minimum performance standards with occasional inconsistency. Demonstrates basic productivity but needs improvement in efficiency or goal achievement.";
        default:
          return "Meets baseline requirements across most assessed areas. Cognitive and technical abilities are adequate but inconsistent.";
      }
    }
    
    if (percentage >= 50) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Shows difficulty with analytical thinking and problem-solving. Demonstrates gaps in logical reasoning, pattern recognition, or mental processing that require targeted development.";
        case 'Personality Assessment':
          return "Exhibits limitations in interpersonal effectiveness or adaptability. Demonstrates challenges with emotional intelligence, communication, or professional behavior that need improvement.";
        case 'Leadership Potential':
          return "Displays limited leadership readiness requiring significant development. Shows gaps in decision-making, influence, or team management capabilities.";
        case 'Technical Competence':
          return "Possesses insufficient technical knowledge for role expectations. Demonstrates significant gaps in technical understanding or practical application skills.";
        case 'Performance Metrics':
          return "Falls below performance expectations in productivity or goal achievement. Demonstrates inconsistency in meeting standards or delivering results.";
        default:
          return "Performance falls below role expectations in multiple areas. Demonstrates gaps in problem-solving, technical competence, or behavioral fit.";
      }
    }
    
    if (percentage >= 40) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Struggles significantly with cognitive demands and analytical tasks. Demonstrates limited reasoning ability, poor problem-solving skills, and difficulty processing information.";
        case 'Personality Assessment':
          return "Shows substantial limitations in professional behavior and interpersonal skills. Demonstrates poor emotional intelligence, communication barriers, or adaptability issues.";
        case 'Leadership Potential':
          return "Exhibits minimal leadership capabilities requiring extensive development. Shows little evidence of decision-making ability, influence, or team guidance skills.";
        case 'Technical Competence':
          return "Possesses very limited technical understanding and application skills. Demonstrates major deficiencies in technical knowledge relevant to role requirements.";
        case 'Performance Metrics':
          return "Consistently underperforms with poor productivity and goal achievement. Demonstrates significant challenges in meeting basic performance standards.";
        default:
          return "Shows limited capability across key assessment dimensions. Struggles with cognitive demands and performance consistency.";
      }
    }
    
    // Below 40%
    switch(category) {
      case 'Cognitive Abilities':
        return "Does not meet minimum cognitive competency thresholds. Shows severe deficiencies in analytical thinking, problem-solving, and information processing capabilities.";
      case 'Personality Assessment':
        return "Fails to demonstrate basic interpersonal or professional competencies. Shows critical deficiencies in emotional intelligence, communication, or adaptability.";
      case 'Leadership Potential':
        return "Lacks fundamental leadership qualities and readiness. Shows no evidence of decision-making, influence, or team management capabilities.";
      case 'Technical Competence':
        return "Does not possess required technical knowledge or skills. Shows complete lack of understanding in core technical areas for the role.";
      case 'Performance Metrics':
        return "Fails to meet any performance standards. Demonstrates complete inability to achieve basic productivity or goal targets.";
      default:
        return "Does not meet minimum competency thresholds. Significant deficiencies observed across multiple assessment areas.";
    }
  };

  const getCategoryPerformanceLabel = (percentage) => {
    if (percentage >= 80) return "Exceptional";
    if (percentage >= 70) return "Strong";
    if (percentage >= 60) return "Adequate";
    if (percentage >= 50) return "Below Expectations";
    if (percentage >= 40) return "Low Readiness";
    return "Unsuitable";
  };

  const getCategoryPerformanceColor = (percentage) => {
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 70) return "#2196F3";
    if (percentage >= 60) return "#FF9800";
    if (percentage >= 50) return "#FF5722";
    if (percentage >= 40) return "#795548";
    return "#F44336";
  };

  const getCategoryPerformanceIcon = (percentage) => {
    if (percentage >= 80) return "🏆";
    if (percentage >= 70) return "⭐";
    if (percentage >= 60) return "✅";
    if (percentage >= 50) return "⚠️";
    if (percentage >= 40) return "🔍";
    return "❌";
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
          if (session.loggedIn) {
            setIsSupervisor(true);
          } else {
            router.push("/supervisor-login");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };

    checkSupervisorAuth();
  }, [router]);

  // Fetch candidate data - FIXED VERSION
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        // METHOD 1: Try candidate_assessments VIEW first
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
          
          // Fetch responses and calculate category scores
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
          
          // Fetch responses and calculate category scores
          await fetchAndCalculateCategoryScores(user_id);
          return;
        }
        
        // METHOD 3: Candidate not found
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

    // Fetch responses and calculate category scores
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

    // Calculate category scores from responses
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
            detailedInterpretation: getCategoryInterpretation(percentage, section),
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
            detailedInterpretation: getCategoryInterpretation(percentage, section),
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
            specificIssue = `Cognitive abilities scored ${weakness.score}% (Grade ${weakness.grade}). ${getCategoryInterpretation(weakness.score, weakness.category)}`;
            recommendation = "Consider cognitive training exercises, problem-solving workshops, and analytical thinking development programs. Focus on logical reasoning, pattern recognition, and mental agility exercises.";
            break;
          case 'Personality Assessment':
            specificIssue = `Personality assessment scored ${weakness.score}% (Grade ${weakness.grade}). ${getCategoryInterpretation(weakness.score, weakness.category)}`;
            recommendation = "Engage in personality development sessions, emotional intelligence training, and communication workshops. Consider role-playing exercises and interpersonal skills development programs.";
            break;
          case 'Leadership Potential':
            specificIssue = `Leadership potential scored ${weakness.score}% (Grade ${weakness.grade}). ${getCategoryInterpretation(weakness.score, weakness.category)}`;
            recommendation = "Participate in leadership workshops, mentorship programs, and team management exercises. Focus on decision-making, influence development, and strategic thinking training.";
            break;
          case 'Technical Competence':
            specificIssue = `Technical competence scored ${weakness.score}% (Grade ${weakness.grade}). ${getCategoryInterpretation(weakness.score, weakness.category)}`;
            recommendation = "Attend technical training sessions, industry-specific workshops, and hands-on practice programs. Focus on core technical skills, practical applications, and problem-solving in technical domains.";
            break;
          case 'Performance Metrics':
            specificIssue = `Performance metrics scored ${weakness.score}% (Grade ${weakness.grade}). ${getCategoryInterpretation(weakness.score, weakness.category)}`;
            recommendation = "Focus on goal-setting strategies, performance tracking improvement, time management workshops, and productivity enhancement techniques. Implement regular performance reviews and feedback sessions.";
            break;
          default:
            specificIssue = `${weakness.category} scored ${weakness.score}% (Grade ${weakness.grade}). ${getCategoryInterpretation(weakness.score, weakness.category)}`;
            recommendation = "Consider targeted training and development programs in this specific area. Create a personalized development plan with measurable goals and regular progress reviews.";
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
          recommendation: "Continue current development path. Consider advanced training in areas of strength to further enhance expertise and prepare for increased responsibility.",
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

  // Loading and authentication checks (same as before)
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
        {/* Header Section */}
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

        {/* CATEGORY SCORES BREAKDOWN - ADDED BACK */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ margin: "0 0 25px
