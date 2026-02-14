import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [categoryScores, setCategoryScores] = useState({});
  const [subcategoryScores, setSubcategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  // Define all categories and subcategories for each assessment type
  const ASSESSMENT_CONFIG = {
    'general': {
      name: 'General Assessment',
      maxScore: 500,
      categories: {
        'Cognitive Abilities': {
          icon: '🧠',
          color: '#FF6B6B',
          subcategories: [
            'Analytical Thinking',
            'Problem Solving',
            'Critical Thinking',
            'Logical Reasoning',
            'Pattern Recognition',
            'Decision Making'
          ]
        },
        'Personality Assessment': {
          icon: '🌟',
          color: '#4ECDC4',
          subcategories: [
            'Communication',
            'Teamwork',
            'Emotional Intelligence',
            'Adaptability',
            'Conflict Resolution',
            'Empathy'
          ]
        },
        'Leadership Potential': {
          icon: '👑',
          color: '#A8E6CF',
          subcategories: [
            'Vision',
            'Influence',
            'Team Development',
            'Strategic Thinking',
            'Motivation'
          ]
        },
        'Technical Competence': {
          icon: '⚙️',
          color: '#FFD93D',
          subcategories: [
            'Technical Knowledge',
            'Practical Application',
            'Troubleshooting',
            'Quality Control'
          ]
        },
        'Performance Metrics': {
          icon: '📊',
          color: '#6C5CE7',
          subcategories: [
            'Productivity',
            'Goal Achievement',
            'Time Management',
            'Quality of Work',
            'Consistency',
            'Initiative'
          ]
        }
      }
    },
    'leadership': {
      name: 'Leadership Assessment',
      maxScore: 100,
      categories: {
        'Leadership Potential': {
          icon: '👑',
          color: '#A8E6CF',
          subcategories: [
            'Vision',
            'Influence',
            'Team Development',
            'Strategic Thinking',
            'Motivation',
            'Decision Making',
            'Communication',
            'Emotional Intelligence'
          ]
        }
      }
    },
    'cognitive': {
      name: 'Cognitive Ability Assessment',
      maxScore: 100,
      categories: {
        'Cognitive Abilities': {
          icon: '🧠',
          color: '#FF6B6B',
          subcategories: [
            'Analytical Thinking',
            'Problem Solving',
            'Critical Thinking',
            'Logical Reasoning',
            'Pattern Recognition',
            'Decision Making',
            'Numerical Reasoning',
            'Verbal Reasoning'
          ]
        }
      }
    },
    'technical': {
      name: 'Technical Assessment',
      maxScore: 100,
      categories: {
        'Technical Competence': {
          icon: '⚙️',
          color: '#FFD93D',
          subcategories: [
            'Technical Knowledge',
            'Practical Application',
            'Troubleshooting',
            'Equipment Operation',
            'Safety Protocols',
            'Quality Control',
            'Best Practices',
            'Industry Standards'
          ]
        }
      }
    },
    'personality': {
      name: 'Personality Assessment',
      maxScore: 100,
      categories: {
        'Personality Assessment': {
          icon: '🌟',
          color: '#4ECDC4',
          subcategories: [
            'Communication',
            'Teamwork',
            'Emotional Intelligence',
            'Adaptability',
            'Conflict Resolution',
            'Empathy',
            'Stress Management',
            'Collaboration'
          ]
        }
      }
    },
    'performance': {
      name: 'Performance Assessment',
      maxScore: 100,
      categories: {
        'Performance Metrics': {
          icon: '📊',
          color: '#6C5CE7',
          subcategories: [
            'Productivity',
            'Goal Achievement',
            'Time Management',
            'Quality of Work',
            'Consistency',
            'Initiative',
            'Reliability',
            'Accountability'
          ]
        }
      }
    }
  };

  // Helper function to get classification based on score and assessment type
  const getClassification = useCallback((score, assessmentType = 'general') => {
    if (assessmentType === 'general') {
      if (score >= 450) return "Elite Talent";
      if (score >= 400) return "Top Talent";
      if (score >= 350) return "High Potential";
      if (score >= 300) return "Solid Performer";
      if (score >= 250) return "Developing Talent";
      if (score >= 200) return "Emerging Talent";
      return "Needs Improvement";
    } else {
      if (score >= 90) return "Exceptional";
      if (score >= 80) return "Advanced";
      if (score >= 70) return "Proficient";
      if (score >= 60) return "Developing";
      if (score >= 50) return "Basic";
      return "Needs Improvement";
    }
  }, []);

  // Helper function to get classification color
  const getClassificationColor = useCallback((score, assessmentType = 'general') => {
    if (assessmentType === 'general') {
      if (score >= 450) return "#2E7D32";
      if (score >= 400) return "#4CAF50";
      if (score >= 350) return "#2196F3";
      if (score >= 300) return "#FF9800";
      if (score >= 250) return "#9C27B0";
      if (score >= 200) return "#795548";
      return "#F44336";
    } else {
      if (score >= 90) return "#2E7D32";
      if (score >= 80) return "#4CAF50";
      if (score >= 70) return "#2196F3";
      if (score >= 60) return "#FF9800";
      if (score >= 50) return "#9C27B0";
      return "#F44336";
    }
  }, []);

  // Get category grade based on percentage
  const getCategoryGrade = useCallback((percentage) => {
    if (percentage >= 90) return { grade: "A+", label: "Exceptional", color: "#4CAF50" };
    if (percentage >= 85) return { grade: "A", label: "Outstanding", color: "#4CAF50" };
    if (percentage >= 80) return { grade: "A-", label: "Excellent", color: "#4CAF50" };
    if (percentage >= 75) return { grade: "B+", label: "Very Good", color: "#2196F3" };
    if (percentage >= 70) return { grade: "B", label: "Good", color: "#2196F3" };
    if (percentage >= 65) return { grade: "B-", label: "Above Average", color: "#2196F3" };
    if (percentage >= 60) return { grade: "C+", label: "Satisfactory", color: "#FF9800" };
    if (percentage >= 55) return { grade: "C", label: "Adequate", color: "#FF9800" };
    if (percentage >= 50) return { grade: "C-", label: "Developing", color: "#FF9800" };
    if (percentage >= 45) return { grade: "D+", label: "Below Average", color: "#F44336" };
    if (percentage >= 40) return { grade: "D", label: "Poor", color: "#F44336" };
    return { grade: "F", label: "Unsatisfactory", color: "#F44336" };
  }, []);

  // Get detailed interpretation for a category
  const getCategoryInterpretation = useCallback((category, percentage, assessmentType) => {
    const baseInterpretation = {
      'Cognitive Abilities': {
        high: "Exceptional cognitive capabilities. Demonstrates superior analytical thinking, pattern recognition, and problem-solving abilities.",
        medium: "Good cognitive abilities with solid analytical and problem-solving skills.",
        low: "Developing cognitive abilities. Needs support with complex analytical tasks."
      },
      'Personality Assessment': {
        high: "Outstanding interpersonal skills and emotional intelligence. Builds strong relationships effectively.",
        medium: "Good interpersonal skills. Communicates well in most situations.",
        low: "Developing interpersonal skills. Would benefit from communication training."
      },
      'Leadership Potential': {
        high: "Natural leadership qualities with strong vision and influence. Inspires others effectively.",
        medium: "Shows leadership potential. Can guide teams in familiar contexts.",
        low: "Limited leadership qualities at this time. Needs development in this area."
      },
      'Technical Competence': {
        high: "Expert-level technical knowledge and practical skills. Masters complex technical concepts.",
        medium: "Strong technical foundation. Handles most technical challenges effectively.",
        low: "Technical knowledge needs development. Requires additional training."
      },
      'Performance Metrics': {
        high: "Exceptional productivity and goal achievement. Consistently exceeds targets.",
        medium: "Good performance with consistent goal achievement.",
        low: "Performance needs improvement. Requires coaching and support."
      }
    };

    const categoryData = baseInterpretation[category];
    if (!categoryData) return "Performance in this area.";

    if (percentage >= 70) return categoryData.high;
    if (percentage >= 50) return categoryData.medium;
    return categoryData.low;
  }, []);

  // Get recommendation based on category and score
  const getRecommendation = useCallback((category, percentage, assessmentType) => {
    const baseRecommendations = {
      'Cognitive Abilities': {
        high: "Leverage this strength by assigning complex problem-solving tasks and strategic projects.",
        medium: "Provide opportunities to work on progressively complex problems.",
        low: "Implement structured problem-solving training and provide clear frameworks."
      },
      'Personality Assessment': {
        high: "Utilize their interpersonal strengths in client-facing roles and team leadership.",
        medium: "Encourage participation in team projects and provide feedback.",
        low: "Provide communication skills training and emotional intelligence workshops."
      },
      'Leadership Potential': {
        high: "Fast-track for leadership development programs. Consider for team lead roles.",
        medium: "Offer opportunities to lead small projects or mentor junior team members.",
        low: "Start with basic leadership training and provide opportunities to observe effective leaders."
      },
      'Technical Competence': {
        high: "Assign them to complex technical projects and consider for technical lead roles.",
        medium: "Provide technical training and opportunities to work with experienced team members.",
        low: "Create a structured technical training plan with clear milestones."
      },
      'Performance Metrics': {
        high: "Recognize their consistent high performance and consider for increased responsibility.",
        medium: "Set clear goals with regular check-ins. Provide coaching on productivity techniques.",
        low: "Implement daily or weekly check-ins to track progress. Set smaller, achievable goals."
      }
    };

    const recommendation = baseRecommendations[category];
    if (!recommendation) return "Targeted development in this area will help them reach full potential.";

    if (percentage >= 70) return recommendation.high;
    if (percentage >= 50) return recommendation.medium;
    return recommendation.low;
  }, []);

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

  // Fetch candidate data and all assessments
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        // Get candidate info from auth.users
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, raw_user_meta_data")
          .eq("id", user_id)
          .single();

        if (!userError && userData) {
          setUserEmail(userData.email || "Email not found");
          setUserName(
            userData.raw_user_meta_data?.full_name || 
            userData.raw_user_meta_data?.name || 
            `Candidate ${user_id.substring(0, 8)}`
          );
        }

        // Get all assessments taken by this candidate
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from("candidate_assessments_taken")
          .select("*")
          .eq("user_id", user_id)
          .order("completed_at", { ascending: false });

        if (assessmentsError) throw assessmentsError;

        if (assessmentsData && assessmentsData.length > 0) {
          setAssessments(assessmentsData);
          // Select the first assessment by default
          setSelectedAssessment(assessmentsData[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  // Fetch detailed responses for selected assessment
  useEffect(() => {
    if (!selectedAssessment || !selectedAssessment.result_id) return;

    const fetchAssessmentDetails = async () => {
      try {
        // Get the assessment result details
        const { data: resultData, error: resultError } = await supabase
          .from("assessment_results")
          .select("*")
          .eq("id", selectedAssessment.result_id)
          .single();

        if (resultError) throw resultError;

        if (resultData) {
          setAssessmentDetails(resultData);
          
          // If we have category scores already stored, use them
          if (resultData.category_scores) {
            setCategoryScores(resultData.category_scores);
          }
          
          if (resultData.strengths) {
            setStrengths(resultData.strengths);
          }
          
          if (resultData.weaknesses) {
            setWeaknesses(resultData.weaknesses);
          }
          
          if (resultData.recommendations) {
            setRecommendations(resultData.recommendations);
          }
        }

        // Get responses for this assessment
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(`
            id,
            question_id,
            answer_id,
            questions (
              section,
              subsection,
              question_text
            ),
            answers (
              score,
              answer_text
            )
          `)
          .eq("user_id", user_id)
          .eq("assessment_id", selectedAssessment.assessment_id);

        if (responsesError) throw responsesError;

        if (responsesData && responsesData.length > 0) {
          calculateScoresFromResponses(responsesData, selectedAssessment.assessment_type);
        }
      } catch (error) {
        console.error("Error fetching assessment details:", error);
      }
    };

    fetchAssessmentDetails();
  }, [selectedAssessment, user_id]);

  // Calculate scores from responses
  const calculateScoresFromResponses = useCallback((responsesData, assessmentType) => {
    try {
      const categoryTotals = {};
      const categoryCounts = {};
      const subcategoryTotals = {};
      const subcategoryCounts = {};
      const strengthsList = [];
      const weaknessesList = [];

      responsesData.forEach(response => {
        const question = response.questions;
        if (!question) return;

        const section = question.section;
        const subsection = question.subsection;
        const score = response.answers?.score || 0;

        // Category scores
        if (!categoryTotals[section]) {
          categoryTotals[section] = 0;
          categoryCounts[section] = 0;
        }
        categoryTotals[section] += score;
        categoryCounts[section] += 1;

        // Subcategory scores
        if (subsection) {
          if (!subcategoryTotals[section]) {
            subcategoryTotals[section] = {};
            subcategoryCounts[section] = {};
          }
          if (!subcategoryTotals[section][subsection]) {
            subcategoryTotals[section][subsection] = 0;
            subcategoryCounts[section][subsection] = 0;
          }
          subcategoryTotals[section][subsection] += score;
          subcategoryCounts[section][subsection] += 1;
        }
      });

      // Calculate category percentages
      const calculatedCategoryScores = {};
      
      Object.entries(categoryTotals).forEach(([section, total]) => {
        const count = categoryCounts[section];
        const maxPossible = count * 5;
        const percentage = Math.round((total / maxPossible) * 100);
        const average = (total / count).toFixed(1);
        const gradeInfo = getCategoryGrade(percentage);
        
        calculatedCategoryScores[section] = {
          total,
          average: parseFloat(average),
          count,
          percentage,
          maxPossible,
          grade: gradeInfo.grade,
          gradeLabel: gradeInfo.label,
          gradeColor: gradeInfo.color,
          interpretation: getCategoryInterpretation(section, percentage, assessmentType),
          recommendation: getRecommendation(section, percentage, assessmentType)
        };

        if (percentage >= 70) {
          strengthsList.push({
            category: section,
            percentage,
            grade: gradeInfo.grade,
            interpretation: calculatedCategoryScores[section].interpretation,
            recommendation: calculatedCategoryScores[section].recommendation
          });
        } else if (percentage < 50) {
          weaknessesList.push({
            category: section,
            percentage,
            grade: gradeInfo.grade,
            interpretation: calculatedCategoryScores[section].interpretation,
            recommendation: calculatedCategoryScores[section].recommendation
          });
        }
      });

      // Calculate subcategory percentages
      const calculatedSubcategoryScores = {};
      
      Object.entries(subcategoryTotals).forEach(([section, subs]) => {
        calculatedSubcategoryScores[section] = {};
        Object.entries(subs).forEach(([subsection, total]) => {
          const count = subcategoryCounts[section][subsection];
          const maxPossible = count * 5;
          const percentage = Math.round((total / maxPossible) * 100);
          const gradeInfo = getCategoryGrade(percentage);
          
          calculatedSubcategoryScores[section][subsection] = {
            total,
            average: (total / count).toFixed(1),
            count,
            percentage,
            maxPossible,
            grade: gradeInfo.grade,
            gradeColor: gradeInfo.color
          };
        });
      });

      setCategoryScores(calculatedCategoryScores);
      setSubcategoryScores(calculatedSubcategoryScores);
      setStrengths(strengthsList);
      setWeaknesses(weaknessesList);

      // Generate recommendations
      const recommendationsList = weaknessesList.map(w => ({
        category: w.category,
        issue: w.interpretation,
        recommendation: w.recommendation,
        priority: w.percentage < 40 ? 'High' : 'Medium'
      }));

      if (weaknessesList.length === 0 && strengthsList.length > 0) {
        recommendationsList.push({
          category: "Overall Excellence",
          issue: "Strong performance across all categories",
          recommendation: "Continue current development path. Consider advanced training and increased responsibility.",
          priority: "Low"
        });
      }

      setRecommendations(recommendationsList);

    } catch (error) {
      console.error("Calculation error:", error);
    }
  }, [getCategoryGrade, getCategoryInterpretation, getRecommendation]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  const handleAssessmentChange = (assessment) => {
    setSelectedAssessment(assessment);
    // Reset state for new assessment
    setCategoryScores({});
    setSubcategoryScores({});
    setStrengths([]);
    setWeaknesses([]);
    setRecommendations([]);
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
            <p style={{ color: "#666" }}>Loading candidate analysis...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (assessments.length === 0) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          width: "90vw", 
          margin: "auto", 
          padding: "40px 20px",
          textAlign: "center" 
        }}>
          <h1 style={{ color: "#666", marginBottom: "20px" }}>No Assessments Found</h1>
          <p style={{ color: "#888", marginBottom: "30px" }}>
            This candidate hasn't completed any assessments yet.
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

  const currentAssessment = selectedAssessment || assessments[0];
  const assessmentConfig = ASSESSMENT_CONFIG[currentAssessment.assessment_type] || ASSESSMENT_CONFIG.general;
  const classification = getClassification(currentAssessment.score, currentAssessment.assessment_type);
  const classificationColor = getClassificationColor(currentAssessment.score, currentAssessment.assessment_type);

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
                Candidate Assessment Report
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
                color: "#888",
                fontSize: "14px"
              }}>
                {userEmail}
              </p>
            </div>
            
            {/* Assessment Selector */}
            {assessments.length > 1 && (
              <div style={{ 
                background: "#f8f9fa", 
                padding: "15px", 
                borderRadius: "10px",
                minWidth: "250px"
              }}>
                <div style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                  Select Assessment:
                </div>
                <select
                  value={currentAssessment.id}
                  onChange={(e) => {
                    const selected = assessments.find(a => a.id === e.target.value);
                    handleAssessmentChange(selected);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    fontSize: "14px"
                  }}
                >
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.assessment_name} - {new Date(a.completed_at).toLocaleDateString()} ({a.score}/{assessmentConfig.maxScore})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Assessment Summary Card */}
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: "0 0 10px 0", color: "#333" }}>
                  {currentAssessment.assessment_name}
                </h2>
                <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                  Completed on {new Date(currentAssessment.completed_at).toLocaleDateString()} at {new Date(currentAssessment.completed_at).toLocaleTimeString()}
                </p>
              </div>
              <div style={{ 
                background: "#f8f9fa", 
                padding: "15px 25px", 
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
                  Overall Score
                </div>
                <div style={{ 
                  fontSize: "32px", 
                  fontWeight: "700",
                  color: classificationColor
                }}>
                  {currentAssessment.score}/{assessmentConfig.maxScore}
                </div>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600",
                  color: classificationColor,
                  marginTop: "5px"
                }}>
                  {classification}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Scores */}
        {Object.keys(categoryScores).length > 0 && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
            gap: "20px",
            marginBottom: "30px"
          }}>
            {Object.entries(categoryScores).map(([category, data]) => {
              const categoryConfig = assessmentConfig.categories[category] || {
                icon: '📋',
                color: data.gradeColor || '#666'
              };
              
              return (
                <div key={category} style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  borderLeft: `4px solid ${categoryConfig.color}`
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: categoryConfig.color + "20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      {categoryConfig.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{category}</h3>
                      <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#666" }}>
                        {data.count} questions • Avg: {data.average}/5
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "13px", color: "#666" }}>Score: {data.total}/{data.maxPossible}</span>
                      <span style={{ 
                        fontSize: "13px", 
                        fontWeight: "600",
                        color: data.gradeColor 
                      }}>
                        {data.grade} • {data.percentage}%
                      </span>
                    </div>
                    <div style={{
                      height: "8px",
                      background: "#e0e0e0",
                      borderRadius: "4px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${data.percentage}%`,
                        background: data.gradeColor,
                        borderRadius: "4px"
                      }} />
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: "14px", 
                    color: "#555", 
                    lineHeight: 1.6,
                    padding: "10px",
                    background: "#f8f9fa",
                    borderRadius: "8px"
                  }}>
                    {data.interpretation}
                  </div>

                  {/* Subcategories */}
                  {subcategoryScores[category] && Object.keys(subcategoryScores[category]).length > 0 && (
                    <div style={{ marginTop: "15px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "10px" }}>
                        Detailed Breakdown:
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Object.entries(subcategoryScores[category]).map(([subcat, subData]) => (
                          <div key={subcat}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                              <span style={{ fontSize: "12px", color: "#666" }}>{subcat}</span>
                              <span style={{ 
                                fontSize: "12px", 
                                fontWeight: "600",
                                color: subData.gradeColor 
                              }}>
                                {subData.percentage}%
                              </span>
                            </div>
                            <div style={{
                              height: "4px",
                              background: "#e0e0e0",
                              borderRadius: "2px",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                height: "100%",
                                width: `${subData.percentage}%`,
                                background: subData.gradeColor,
                                borderRadius: "2px"
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Strengths and Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
            gap: "30px",
            marginBottom: "30px"
          }}>
            {/* Strengths */}
            {strengths.length > 0 && (
              <div style={{ 
                background: "white", 
                padding: "25px", 
                borderRadius: "12px", 
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}>
                <h2 style={{ margin: "0 0 20px 0", color: "#333", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ background: "#4CAF50", color: "white", width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✓
                  </span>
                  Key Strengths
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {strengths.map((strength, index) => (
                    <div key={index} style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #4CAF50"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", color: "#2e7d32" }}>{strength.category}</h3>
                        <div style={{ padding: "4px 10px", background: "#e8f5e9", color: "#2e7d32", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                          {strength.grade} • {strength.percentage}%
                        </div>
                      </div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#555" }}>
                        {strength.interpretation}
                      </p>
                      <div style={{ fontSize: "12px", color: "#777", padding: "8px", background: "white", borderRadius: "6px" }}>
                        <strong>Recommendation:</strong> {strength.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Development Areas */}
            {weaknesses.length > 0 && (
              <div style={{ 
                background: "white", 
                padding: "25px", 
                borderRadius: "12px", 
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}>
                <h2 style={{ margin: "0 0 20px 0", color: "#333", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ background: "#F44336", color: "white", width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    !
                  </span>
                  Development Areas
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {weaknesses.map((weakness, index) => (
                    <div key={index} style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #F44336"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", color: "#c62828" }}>{weakness.category}</h3>
                        <div style={{ padding: "4px 10px", background: "#ffebee", color: "#c62828", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                          {weakness.grade} • {weakness.percentage}%
                        </div>
                      </div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#555" }}>
                        {weakness.interpretation}
                      </p>
                      <div style={{ fontSize: "12px", color: "#777", padding: "8px", background: "white", borderRadius: "6px" }}>
                        <strong>Development Plan:</strong> {weakness.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 25px 0", color: "#333", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ background: "#1565c0", color: "white", width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                💡
              </span>
              Development Recommendations
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "15px",
                  background: rec.priority === 'High' ? '#ffebee' : rec.priority === 'Medium' ? '#fff8e1' : '#e8f5e9',
                  borderRadius: "8px",
                  border: `1px solid ${rec.priority === 'High' ? '#ef9a9a' : rec.priority === 'Medium' ? '#ffe082' : '#a5d6a7'}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{rec.category}</h3>
                    <span style={{
                      padding: "4px 10px",
                      background: rec.priority === 'High' ? '#ffcdd2' : rec.priority === 'Medium' ? '#ffecb3' : '#c8e6c9',
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: rec.priority === 'High' ? '#b71c1c' : rec.priority === 'Medium' ? '#ff6f00' : '#1b5e20'
                    }}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#555" }}>{rec.issue}</p>
                  <div style={{
                    padding: "10px",
                    background: "white",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${rec.priority === 'High' ? '#f44336' : rec.priority === 'Medium' ? '#ff9800' : '#4caf50'}`
                  }}>
                    <strong>Action Plan:</strong> {rec.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          textAlign: "center", 
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0",
          color: "#888",
          fontSize: "12px"
        }}>
          <p>Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p style={{ marginTop: "5px" }}>
            This analysis is based on the candidate's responses to the {currentAssessment.assessment_name}.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}
