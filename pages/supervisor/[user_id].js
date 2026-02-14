// pages/supervisor/[user_id].js - COMPLETE CATEGORY BREAKDOWN WITH INTERPRETATIONS
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
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [subcategoryScores, setSubcategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [personalityDimensions, setPersonalityDimensions] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Define all categories and subcategories for each assessment
  const ASSESSMENT_CATEGORIES = {
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
        'Decision Making',
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
        'Equipment Operation',
        'Safety Protocols',
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
  };

  // Helper function to get classification based on score
  const getClassification = useCallback((score) => {
    if (score >= 450) return "Elite Talent";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid Performer";
    if (score >= 250) return "Developing Talent";
    if (score >= 200) return "Emerging Talent";
    return "Needs Improvement";
  }, []);

  // Helper function to get classification color
  const getClassificationColor = useCallback((score) => {
    if (score >= 450) return "#4CAF50";
    if (score >= 400) return "#2196F3";
    if (score >= 350) return "#FF9800";
    if (score >= 300) return "#9C27B0";
    if (score >= 250) return "#F57C00";
    if (score >= 200) return "#795548";
    return "#F44336";
  }, []);

  // Helper function to get classification description
  const getClassificationDescription = useCallback((score) => {
    if (score >= 450) return "Exceptional performer demonstrating mastery across all assessment categories. Consistently exceeds expectations with outstanding analytical, technical, and leadership capabilities. This candidate is ready for senior roles and complex challenges.";
    if (score >= 400) return "Outstanding performer with clear strengths across multiple domains. Demonstrates strong leadership potential and technical competence suitable for increased responsibility. Shows consistent high performance.";
    if (score >= 350) return "Strong performer with clear development areas. Shows promise for growth and advancement with targeted development and strategic improvement opportunities. Good foundation to build upon.";
    if (score >= 300) return "Reliable and consistent performer meeting core requirements. Demonstrates competency in key areas with predictable performance and potential for growth. Solid contributor with room to develop.";
    if (score >= 250) return "Shows foundational skills with clear development needs. Requires structured guidance and skill-building opportunities to reach full potential. Needs focused development plan.";
    if (score >= 200) return "Early-stage performer requiring significant development. Needs comprehensive training and close supervision to enhance foundational skills. Requires structured support.";
    return "Performance below expectations requiring immediate attention. Needs intensive development plan and regular performance reviews to address critical gaps. May need role reconsideration.";
  }, []);

  // Get performance grade
  const getPerformanceGrade = useCallback((score) => {
    if (score >= 450) return "A+";
    if (score >= 400) return "A";
    if (score >= 350) return "B+";
    if (score >= 300) return "B";
    if (score >= 250) return "C";
    if (score >= 200) return "D";
    return "F";
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
  const getCategoryInterpretation = useCallback((category, percentage) => {
    if (percentage >= 80) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Exceptional cognitive capabilities. Demonstrates superior analytical thinking, pattern recognition, and problem-solving abilities. Processes complex information quickly and makes sound decisions. Shows advanced reasoning skills and mental agility suitable for strategic roles.";
        case 'Personality Assessment':
          return "Outstanding interpersonal skills and emotional intelligence. Communicates effectively, builds strong relationships, and navigates complex social situations with ease. Highly self-aware and adaptable to different personalities and contexts.";
        case 'Leadership Potential':
          return "Natural leadership qualities with strong vision and influence. Inspires others, develops talent effectively, and drives team success. Shows strategic thinking and ability to motivate others toward common goals.";
        case 'Technical Competence':
          return "Expert-level technical knowledge and practical skills. Masters complex technical concepts, troubleshoots effectively, and applies knowledge to real-world situations. Stays current with industry developments and best practices.";
        case 'Performance Metrics':
          return "Exceptional productivity and goal achievement. Consistently exceeds targets, manages time effectively, and delivers high-quality work. Takes initiative and drives results with minimal supervision.";
        default:
          return "Exceptional performance in this area. Demonstrates mastery and consistent excellence.";
      }
    } else if (percentage >= 70) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Strong cognitive abilities with good analytical and problem-solving skills. Handles complex information well and makes sound decisions. Processes information effectively and shows good reasoning capabilities.";
        case 'Personality Assessment':
          return "Strong interpersonal skills with good emotional intelligence. Communicates well, builds positive relationships, and handles most social situations effectively. Self-aware and adaptable.";
        case 'Leadership Potential':
          return "Good leadership qualities with ability to influence and guide others. Shows potential for team leadership and can motivate others. Demonstrates strategic thinking in familiar contexts.";
        case 'Technical Competence':
          return "Strong technical knowledge with good practical application skills. Handles most technical challenges effectively and applies concepts correctly. Shows solid understanding of core principles.";
        case 'Performance Metrics':
          return "Strong performance with consistent goal achievement. Meets or exceeds targets regularly, manages time well, and delivers quality work. Shows good initiative and reliability.";
        default:
          return "Strong performance in this area. Shows solid capabilities with minor areas for refinement.";
      }
    } else if (percentage >= 60) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Satisfactory cognitive abilities meeting basic requirements. Handles standard problems well but may struggle with complex challenges. Processes information adequately with occasional need for support.";
        case 'Personality Assessment':
          return "Satisfactory interpersonal skills. Communicates adequately in most situations and maintains professional relationships. May need support with complex social dynamics or difficult conversations.";
        case 'Leadership Potential':
          return "Foundational leadership qualities with potential for growth. Can guide others in limited contexts but needs development for broader leadership responsibilities. Shows basic team coordination skills.";
        case 'Technical Competence':
          return "Satisfactory technical knowledge meeting minimum requirements. Handles routine tasks effectively but needs support for complex problems. Shows adequate understanding of core concepts.";
        case 'Performance Metrics':
          return "Satisfactory performance meeting basic expectations. Achieves most goals consistently but may need support with productivity or quality. Shows reliability for standard tasks.";
        default:
          return "Satisfactory performance meeting basic requirements. Has foundational skills with identified development areas.";
      }
    } else if (percentage >= 50) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Developing cognitive abilities with identified gaps. May struggle with analytical tasks and complex problem-solving. Needs support and practice to build stronger reasoning skills.";
        case 'Personality Assessment':
          return "Developing interpersonal skills with some limitations. May have difficulty with communication or emotional awareness. Would benefit from targeted development in this area.";
        case 'Leadership Potential':
          return "Limited leadership qualities at this time. Shows some potential but needs significant development. May not be ready for leadership responsibilities without support.";
        case 'Technical Competence':
          return "Developing technical knowledge with gaps in understanding. Can perform basic tasks but struggles with more complex requirements. Needs additional training and practice.";
        case 'Performance Metrics':
          return "Developing performance with inconsistency. Meets some goals but struggles with others. Needs coaching and support to improve productivity and quality.";
        default:
          return "Developing in this area with clear improvement needs. Requires focused attention and structured development.";
      }
    } else {
      switch(category) {
        case 'Cognitive Abilities':
          return "Significant gaps in cognitive abilities requiring immediate attention. Struggles with analytical thinking and problem-solving. Needs intensive support and basic skill development.";
        case 'Personality Assessment':
          return "Significant interpersonal challenges requiring development. May struggle with communication, teamwork, or emotional intelligence. Needs coaching and skill-building in this area.";
        case 'Leadership Potential':
          return "Limited leadership capability at this time. Not ready for leadership responsibilities without significant development. May be better suited for individual contributor roles.";
        case 'Technical Competence':
          return "Significant technical knowledge gaps requiring intensive training. Struggles with even basic technical tasks. Needs foundational skill development before handling responsibilities.";
        case 'Performance Metrics':
          return "Performance significantly below expectations. Consistently misses goals and struggles with productivity. Needs immediate intervention and close supervision.";
        default:
          return "Significant development needed in this area. Requires intensive support and structured improvement plan.";
      }
    }
  }, []);

  // Get strength/weakness determination
  const getPerformanceLevel = useCallback((percentage) => {
    if (percentage >= 70) return { type: 'strength', label: 'Strength', color: '#4CAF50' };
    if (percentage >= 60) return { type: 'average', label: 'Average', color: '#FF9800' };
    return { type: 'weakness', label: 'Development Area', color: '#F44336' };
  }, []);

  // Get recommendation based on category and score
  const getRecommendation = useCallback((category, percentage) => {
    if (percentage >= 70) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Leverage this strength by assigning complex problem-solving tasks and strategic projects. Consider them for roles requiring analytical thinking and decision-making.";
        case 'Personality Assessment':
          return "Utilize their interpersonal strengths in client-facing roles, team leadership, or conflict resolution. They would excel in collaborative environments.";
        case 'Leadership Potential':
          return "Fast-track for leadership development programs. Consider for team lead roles and mentorship opportunities. Their natural leadership should be cultivated.";
        case 'Technical Competence':
          return "Assign them to complex technical projects and consider them for technical lead roles. They could mentor others and drive technical excellence.";
        case 'Performance Metrics':
          return "Recognize their consistent high performance and consider for increased responsibility. They could model best practices for others.";
        default:
          return "This is a key strength to leverage in their role and development plan.";
      }
    } else if (percentage >= 60) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Provide opportunities to work on progressively complex problems. Offer mentoring and training to strengthen analytical skills.";
        case 'Personality Assessment':
          return "Encourage participation in team projects and provide feedback on interpersonal interactions. Consider communication workshops for development.";
        case 'Leadership Potential':
          return "Offer opportunities to lead small projects or mentor junior team members. Provide leadership training and coaching.";
        case 'Technical Competence':
          return "Provide technical training and opportunities to work with experienced team members. Assign stretch assignments to build skills.";
        case 'Performance Metrics':
          return "Set clear goals with regular check-ins. Provide coaching on productivity techniques and time management.";
        default:
          return "Targeted development in this area will help them reach full potential.";
      }
    } else {
      switch(category) {
        case 'Cognitive Abilities':
          return "Implement structured problem-solving training and provide clear frameworks. Offer additional support and break down complex tasks. Consider pairing with analytical thinkers for mentoring.";
        case 'Personality Assessment':
          return "Provide communication skills training and emotional intelligence workshops. Offer coaching on interpersonal effectiveness. Consider role-playing exercises for practice.";
        case 'Leadership Potential':
          return "Start with basic leadership training and provide opportunities to observe effective leaders. Consider individual contributor path if leadership isn't suitable.";
        case 'Technical Competence':
          return "Create a structured technical training plan with clear milestones. Provide hands-on practice with supervision. Consider formal certification programs.";
        case 'Performance Metrics':
          return "Implement daily or weekly check-ins to track progress. Set smaller, achievable goals to build momentum. Provide close coaching on productivity techniques.";
        default:
          return "This area requires focused attention and a structured improvement plan with regular reviews.";
      }
    }
  }, []);

  // Map subsection to subcategory
  const mapToSubcategory = useCallback((subsection) => {
    const mapping = {
      // Cognitive subcategories
      'Analytical Thinking': 'Analytical Thinking',
      'Problem Solving': 'Problem Solving',
      'Critical Thinking': 'Critical Thinking',
      'Logical Reasoning': 'Logical Reasoning',
      'Pattern Recognition': 'Pattern Recognition',
      'Decision Making': 'Decision Making',
      
      // Personality subcategories
      'Communication': 'Communication',
      'Teamwork': 'Teamwork',
      'Emotional Intelligence': 'Emotional Intelligence',
      'Adaptability': 'Adaptability',
      'Conflict Resolution': 'Conflict Resolution',
      'Empathy': 'Empathy',
      
      // Leadership subcategories
      'Vision': 'Vision',
      'Influence': 'Influence',
      'Team Development': 'Team Development',
      'Strategic Thinking': 'Strategic Thinking',
      'Motivation': 'Motivation',
      
      // Technical subcategories
      'Technical Knowledge': 'Technical Knowledge',
      'Practical Application': 'Practical Application',
      'Troubleshooting': 'Troubleshooting',
      'Equipment Operation': 'Equipment Operation',
      'Safety Protocols': 'Safety Protocols',
      'Quality Control': 'Quality Control',
      
      // Performance subcategories
      'Productivity': 'Productivity',
      'Goal Achievement': 'Goal Achievement',
      'Time Management': 'Time Management',
      'Quality of Work': 'Quality of Work',
      'Consistency': 'Consistency',
      'Initiative': 'Initiative'
    };
    
    return mapping[subsection] || subsection;
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

  // Calculate category and subcategory scores from responses
  const calculateScoresFromResponses = useCallback(async (responsesData, candidateTotalScore) => {
    try {
      if (!responsesData || responsesData.length === 0) {
        return;
      }
      
      const questionIds = [...new Set(responsesData.map(r => r.question_id))];
      const answerIds = [...new Set(responsesData.map(r => r.answer_id))];
      
      if (questionIds.length === 0 || answerIds.length === 0) {
        return;
      }
      
      // Fetch questions
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("id, question_text, section, subsection")
        .in("id", questionIds);
      
      if (qError || !questions || questions.length === 0) {
        return;
      }
      
      const questionsMap = {};
      questions.forEach(q => {
        questionsMap[q.id] = {
          section: q.section,
          subsection: q.subsection,
          question_text: q.question_text
        };
      });
      
      // Fetch answers
      const { data: answers, error: aError } = await supabase
        .from("answers")
        .select("id, score, answer_text")
        .in("id", answerIds);
      
      if (aError || !answers || answers.length === 0) {
        return;
      }
      
      const answersMap = {};
      answers.forEach(a => {
        answersMap[a.id] = a.score || 0;
      });
      
      // Calculate category and subcategory scores
      const categoryTotals = {};
      const categoryCounts = {};
      const subcategoryTotals = {};
      const subcategoryCounts = {};
      
      responsesData.forEach(response => {
        const questionData = questionsMap[response.question_id];
        if (!questionData) return;
        
        const section = questionData.section;
        const subsection = questionData.subsection;
        const score = answersMap[response.answer_id] || 0;
        
        // Category scores
        if (!categoryTotals[section]) {
          categoryTotals[section] = 0;
          categoryCounts[section] = 0;
        }
        categoryTotals[section] += score;
        categoryCounts[section] += 1;
        
        // Subcategory scores
        if (subsection) {
          const mappedSubcategory = mapToSubcategory(subsection);
          const key = `${section}||${mappedSubcategory}`;
          
          if (!subcategoryTotals[key]) {
            subcategoryTotals[key] = 0;
            subcategoryCounts[key] = 0;
          }
          subcategoryTotals[key] += score;
          subcategoryCounts[key] += 1;
        }
      });
      
      // Calculate category percentages
      const calculatedCategoryScores = {};
      const strengthsList = [];
      const weaknessesList = [];
      
      Object.entries(categoryTotals).forEach(([section, total]) => {
        const count = categoryCounts[section];
        const maxPossible = count * 5;
        const percentage = Math.round((total / maxPossible) * 100);
        const average = (total / count).toFixed(1);
        const gradeInfo = getCategoryGrade(percentage);
        const performanceLevel = getPerformanceLevel(percentage);
        const interpretation = getCategoryInterpretation(section, percentage);
        const recommendation = getRecommendation(section, percentage);
        
        calculatedCategoryScores[section] = {
          total,
          average: parseFloat(average),
          count,
          percentage,
          maxPossible,
          grade: gradeInfo.grade,
          gradeLabel: gradeInfo.label,
          gradeColor: gradeInfo.color,
          performanceLevel: performanceLevel.type,
          performanceLabel: performanceLevel.label,
          performanceColor: performanceLevel.color,
          interpretation,
          recommendation,
          icon: ASSESSMENT_CATEGORIES[section]?.icon || '📋',
          color: ASSESSMENT_CATEGORIES[section]?.color || '#666'
        };
        
        if (percentage >= 70) {
          strengthsList.push({
            category: section,
            percentage,
            grade: gradeInfo.grade,
            interpretation: `Strong performance in ${section}: ${interpretation}`,
            recommendation
          });
        } else if (percentage < 60) {
          weaknessesList.push({
            category: section,
            percentage,
            grade: gradeInfo.grade,
            interpretation: `Development needed in ${section}: ${interpretation}`,
            recommendation
          });
        }
      });
      
      setCategoryScores(calculatedCategoryScores);
      
      // Calculate subcategory percentages
      const calculatedSubcategoryScores = {};
      
      Object.entries(subcategoryTotals).forEach(([key, total]) => {
        const [section, subcategory] = key.split('||');
        const count = subcategoryCounts[key];
        const maxPossible = count * 5;
        const percentage = Math.round((total / maxPossible) * 100);
        const average = (total / count).toFixed(1);
        const gradeInfo = getCategoryGrade(percentage);
        const performanceLevel = getPerformanceLevel(percentage);
        
        if (!calculatedSubcategoryScores[section]) {
          calculatedSubcategoryScores[section] = {};
        }
        
        calculatedSubcategoryScores[section][subcategory] = {
          total,
          average: parseFloat(average),
          count,
          percentage,
          maxPossible,
          grade: gradeInfo.grade,
          gradeLabel: gradeInfo.label,
          gradeColor: gradeInfo.color,
          performanceLevel: performanceLevel.type,
          performanceLabel: performanceLevel.label,
          performanceColor: performanceLevel.color
        };
      });
      
      setSubcategoryScores(calculatedSubcategoryScores);
      setStrengths(strengthsList);
      setWeaknesses(weaknessesList);
      
      // Generate recommendations
      const recommendationsList = weaknessesList.map(w => ({
        category: w.category,
        issue: w.interpretation,
        recommendation: w.recommendation,
        priority: w.percentage < 50 ? 'High' : 'Medium'
      }));
      
      if (weaknessesList.length === 0 && strengthsList.length > 0) {
        recommendationsList.push({
          category: "Overall Excellence",
          issue: "Strong performance across all categories",
          recommendation: "Continue current development path. Consider advanced training and increased responsibility to leverage strengths.",
          priority: "Low"
        });
      }
      
      setRecommendations(recommendationsList);
      
    } catch (error) {
      console.error("Calculation error:", error);
    }
  }, [getCategoryGrade, getPerformanceLevel, getCategoryInterpretation, getRecommendation, mapToSubcategory]);

  // Fetch responses
  const fetchAndCalculateScores = useCallback(async (userId, candidateTotalScore) => {
    try {
      const { data: allResponses, error: responsesError } = await supabase
        .from("responses")
        .select("id, question_id, answer_id, assessment_id")
        .eq("user_id", userId);
      
      if (responsesError || !allResponses || allResponses.length === 0) {
        return;
      }
      
      setResponses(allResponses);
      await calculateScoresFromResponses(allResponses, candidateTotalScore);
      
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [calculateScoresFromResponses]);

  // Fetch candidate data
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
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
          setUserEmail(candidateData.email || "Email not found");
          setUserName(candidateData.full_name || `Candidate ${user_id.substring(0, 8).toUpperCase()}`);
          
          const candidateInfo = {
            total_score: candidateData.total_score,
            classification: candidateData.classification || getClassification(candidateData.total_score),
            user_id: candidateData.user_id
          };
          
          setCandidate(candidateInfo);
          await fetchAndCalculateScores(user_id, candidateData.total_score);
        } else {
          setUserEmail("Email not found");
          setUserName(`Candidate ${user_id.substring(0, 8).toUpperCase()}`);
          setCandidate(null);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [isSupervisor, user_id, getClassification, fetchAndCalculateScores]);

  const handleBack = () => {
    router.push("/supervisor");
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
                Candidate Performance Analysis
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
                fontSize: "14px"
              }}>
                {userEmail === "Email not found" ? "Email not available" : userEmail}
              </p>
            </div>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px 20px", 
              borderRadius: "10px",
              minWidth: "200px"
            }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
                Overall Classification
              </div>
              <div style={{ 
                fontSize: "20px", 
                fontWeight: "700",
                color: classificationColor
              }}>
                {classification}
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "5px" }}>
                Score: {candidateScore}/500 • Grade: {performanceGrade}
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "20px"
          }}>
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
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                {classification} - Performance Summary
              </div>
              <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.6 }}>
                {classificationDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Category Overview Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "20px",
          marginBottom: "30px"
        }}>
          {Object.entries(categoryScores).map(([category, data]) => (
            <div 
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                border: `2px solid ${selectedCategory === category ? data.color : 'transparent'}`,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: data.color + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  {data.icon}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{category}</h3>
                  <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#666" }}>
                    {data.count} questions • Avg: {data.average}/5
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
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
                padding: "8px 12px",
                background: data.performanceColor + "15",
                color: data.performanceColor,
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-block"
              }}>
                {data.performanceLabel}
              </div>

              {/* Expanded view when selected */}
              {selectedCategory === category && (
                <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e0e0e0" }}>
                  <div style={{ fontSize: "14px", color: "#555", lineHeight: 1.6, marginBottom: "15px" }}>
                    {data.interpretation}
                  </div>
                  
                  {/* Subcategories */}
                  {subcategoryScores[category] && Object.keys(subcategoryScores[category]).length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "10px" }}>
                        Detailed Breakdown:
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {Object.entries(subcategoryScores[category]).map(([subcat, subData]) => (
                          <div key={subcat}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                              <span style={{ fontSize: "12px", color: "#666" }}>{subcat}</span>
                              <span style={{ 
                                fontSize: "12px", 
                                fontWeight: "600",
                                color: subData.gradeColor 
                              }}>
                                {subData.percentage}% ({subData.average}/5)
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
              )}
            </div>
          ))}
        </div>

        {/* Strengths and Weaknesses */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
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
            <h2 style={{ margin: "0 0 20px 0", color: "#333", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ background: "#4CAF50", color: "white", width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✓
              </span>
              Key Strengths
            </h2>
            {strengths.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", background: "#f8f9fa", borderRadius: "8px" }}>
                <p style={{ color: "#666", margin: 0 }}>No exceptional strengths identified.</p>
              </div>
            ) : (
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
            )}
          </div>

          {/* Development Areas */}
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
            {weaknesses.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", background: "#f8f9fa", borderRadius: "8px" }}>
                <p style={{ color: "#666", margin: 0 }}>All categories meet or exceed expectations.</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>

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
          <p>Analysis generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p style={{ marginTop: "5px" }}>
            This analysis is based on the candidate's actual responses and provides insights into their capabilities, 
            strengths, development areas, and recommended action plans.
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
