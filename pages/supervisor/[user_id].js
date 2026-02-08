// pages/supervisor/[user_id].js - FIXED VERSION WITH CORRECT SCORE CALCULATION
import React, { useEffect, useState } from "react";
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
  const [personalityDimensions, setPersonalityDimensions] = useState({});

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

  // 3. Get interpretive comments based on NEW scale - CATEGORY SPECIFIC
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
    
    if (percentage >= 75) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Displays very strong cognitive abilities with excellent problem-solving skills. Demonstrates strong analytical thinking and logical reasoning with minor areas for refinement.";
        case 'Personality Assessment':
          return "Exhibits strong interpersonal skills and emotional intelligence. Demonstrates good adaptability and communication abilities suitable for most professional contexts.";
        case 'Leadership Potential':
          return "Shows strong leadership qualities with clear potential. Demonstrates ability to guide teams effectively and contribute to organizational goals.";
        case 'Technical Competence':
          return "Possesses strong technical knowledge and practical skills. Demonstrates competence in technical areas with ability to handle complex problems.";
        case 'Performance Metrics':
          return "Frequently exceeds performance expectations. Demonstrates strong productivity and effective goal achievement.";
        default:
          return "Shows strong overall capability with minimal development areas. Demonstrates effective performance across key dimensions.";
      }
    }
    
    if (percentage >= 70) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Displays above average cognitive abilities with good problem-solving skills. Demonstrates solid analytical thinking and reasoning capabilities.";
        case 'Personality Assessment':
          return "Exhibits good interpersonal skills and emotional awareness. Demonstrates reliability and appropriate communication in professional settings.";
        case 'Leadership Potential':
          return "Shows above average leadership qualities. Demonstrates ability to contribute to team success and handle leadership responsibilities.";
        case 'Technical Competence':
          return "Possesses good technical understanding and application skills. Demonstrates ability to solve standard job-related problems.";
        case 'Performance Metrics':
          return "Meets and occasionally exceeds performance expectations. Demonstrates reliable productivity and goal achievement.";
        default:
          return "Performs above average across most assessed areas. Demonstrates good understanding and application of required skills.";
      }
    }
    
    if (percentage >= 65) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Displays solid cognitive abilities meeting baseline requirements. Demonstrates adequate problem-solving and reasoning capabilities for standard tasks.";
        case 'Personality Assessment':
          return "Exhibits adequate interpersonal skills for most situations. Demonstrates basic emotional intelligence and professional behavior.";
        case 'Leadership Potential':
          return "Shows foundational leadership capabilities. Demonstrates potential for growth with appropriate development.";
        case 'Technical Competence':
          return "Possesses basic technical knowledge meeting minimum requirements. Demonstrates ability to handle routine technical tasks.";
        case 'Performance Metrics':
          return "Consistently meets performance standards. Demonstrates adequate productivity and goal completion.";
        default:
          return "Meets baseline requirements across assessed dimensions. Demonstrates adequate competency for standard expectations.";
      }
    }
    
    if (percentage >= 60) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Meets minimum cognitive requirements but shows inconsistency. Demonstrates adequate reasoning but may struggle with complex problem-solving.";
        case 'Personality Assessment':
          return "Shows basic interpersonal skills with some limitations. Demonstrates acceptable professional behavior but may need development.";
        case 'Leadership Potential':
          return "Displays emerging leadership qualities. Shows potential but requires structured development and guidance.";
        case 'Technical Competence':
          return "Possesses fundamental technical understanding. Demonstrates ability to perform basic technical functions.";
        case 'Performance Metrics':
          return "Meets minimum performance standards. Demonstrates basic productivity with some inconsistency.";
        default:
          return "Meets basic requirements but shows inconsistency. Demonstrates fundamental understanding with room for improvement.";
      }
    }
    
    if (percentage >= 55) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Shows difficulty with some cognitive tasks. Demonstrates gaps in analytical thinking that require targeted improvement.";
        case 'Personality Assessment':
          return "Exhibits limitations in interpersonal effectiveness. Demonstrates need for development in communication or adaptability.";
        case 'Leadership Potential':
          return "Displays limited leadership readiness. Shows some capability but requires significant development.";
        case 'Technical Competence':
          return "Possesses insufficient technical knowledge in some areas. Demonstrates need for additional training and practice.";
        case 'Performance Metrics':
          return "Approaches performance standards but falls short consistently. Demonstrates need for improvement in productivity or efficiency.";
        default:
          return "Shows some capability but falls short of expectations in multiple areas. Requires focused development.";
      }
    }
    
    if (percentage >= 50) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Struggles with analytical thinking and problem-solving. Demonstrates significant gaps in reasoning and processing abilities.";
        case 'Personality Assessment':
          return "Exhibits clear limitations in professional behavior. Demonstrates challenges with emotional intelligence or communication.";
        case 'Leadership Potential':
          return "Shows minimal leadership capabilities. Requires extensive development to reach basic competency.";
        case 'Technical Competence':
          return "Possesses inadequate technical knowledge. Demonstrates major deficiencies in understanding core concepts.";
        case 'Performance Metrics':
          return "Falls below performance expectations. Demonstrates poor productivity or goal achievement.";
        default:
          return "Falls below minimum competency standards. Demonstrates significant gaps in required skills and knowledge.";
      }
    }
    
    if (percentage >= 45) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Demonstrates poor cognitive abilities with severe limitations. Shows difficulty with basic reasoning and problem-solving.";
        case 'Personality Assessment':
          return "Exhibits poor interpersonal skills and professional behavior. Demonstrates serious limitations in adaptability or communication.";
        case 'Leadership Potential':
          return "Shows very limited leadership potential. Demonstrates little evidence of leadership capabilities.";
        case 'Technical Competence':
          return "Possesses very poor technical understanding. Demonstrates inability to apply basic technical concepts.";
        case 'Performance Metrics':
          return "Consistently underperforms. Demonstrates very poor productivity and goal achievement.";
        default:
          return "Shows very limited capability. Demonstrates serious deficiencies across multiple assessment areas.";
      }
    }
    
    if (percentage >= 40) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Demonstrates severely limited cognitive capabilities. Shows inability to perform basic analytical tasks.";
        case 'Personality Assessment':
          return "Exhibits unacceptable professional behavior. Demonstrates critical deficiencies in interpersonal skills.";
        case 'Leadership Potential':
          return "Shows no evidence of leadership capabilities. Demonstrates complete lack of readiness for leadership roles.";
        case 'Technical Competence':
          return "Possesses almost no technical knowledge. Demonstrates complete inability to perform technical tasks.";
        case 'Performance Metrics':
          return "Fails to meet any performance standards. Demonstrates complete lack of productivity.";
        default:
          return "Demonstrates critical deficiencies. Shows inability to meet basic role requirements.";
      }
    }
    
    if (percentage >= 35) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Demonstrates extremely poor cognitive abilities. Shows complete lack of analytical thinking skills.";
        case 'Personality Assessment':
          return "Exhibits completely unacceptable professional behavior. Demonstrates severe interpersonal deficiencies.";
        case 'Leadership Potential':
          return "Shows complete absence of leadership qualities. Demonstrates no potential for leadership development.";
        case 'Technical Competence':
          return "Possesses no relevant technical knowledge. Demonstrates complete technical incompetence.";
        case 'Performance Metrics':
          return "Completely fails to perform. Demonstrates zero productivity and goal achievement.";
        default:
          return "Demonstrates complete lack of required capabilities. Shows no evidence of basic competency.";
      }
    }
    
    // Below 35% (F)
    switch(category) {
      case 'Cognitive Abilities':
        return "Does not meet minimum cognitive competency thresholds. Shows complete inability to perform basic reasoning tasks.";
      case 'Personality Assessment':
        return "Fails to demonstrate basic interpersonal or professional competencies. Shows complete lack of emotional intelligence.";
      case 'Leadership Potential':
        return "Lacks any fundamental leadership qualities. Shows no evidence of leadership capability or potential.";
      case 'Technical Competence':
        return "Does not possess any relevant technical knowledge. Shows complete technical incompetence.";
      case 'Performance Metrics':
        return "Fails to meet any performance standards. Demonstrates complete inability to achieve basic goals.";
      default:
        return "Does not meet any competency thresholds. Shows complete lack of required skills and knowledge.";
    }
  };

  // 4. Get performance label for categories - UPDATED
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

  // 5. Get performance color for categories - UPDATED with more granular colors
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

  // 6. Get performance icon/emoji - UPDATED
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

  // =============================================
  // PERSONALITY ANALYSIS FUNCTIONS - NEW
  // =============================================

  // Map subsection to personality dimensions
  const mapSubsectionToDimension = (subsection) => {
    const mapping = {
      // Communication & Collaboration
      'Communication': 'communication',
      'Conflict Resolution': 'emotionalIntelligence',
      'Communication Style': 'communication',
      'Communication Clarity': 'communication',
      'Team Contribution': 'collaboration',
      
      // Work Style & Approach
      'Work Approach': 'adaptability',
      'Work Environment': 'collaboration',
      'Time Management': 'workEthic',
      'Learning Style': 'adaptability',
      'Problem-Solving': 'problemSolving',
      
      // Values & Motivation
      'Motivation': 'workEthic',
      'Decision Values': 'problemSolving',
      'Success Definition': 'workEthic',
      'Work-Life Balance': 'emotionalIntelligence',
      'Feedback Reception': 'emotionalIntelligence',
      
      // Leadership & Initiative
      'Initiative': 'initiative',
      'Leadership': 'leadership',
      'Leadership Style': 'leadership',
      'Risk Tolerance': 'initiative',
      'Delegation': 'leadership'
    };
    
    return mapping[subsection] || 'general';
  };

  // Analyze personality dimensions from responses
  const analyzePersonalityDimensions = (responsesData, questionsMap, answersMap) => {
    const personalityDimensions = {
      collaboration: { total: 0, count: 0, subsections: [] },
      communication: { total: 0, count: 0, subsections: [] },
      adaptability: { total: 0, count: 0, subsections: [] },
      initiative: { total: 0, count: 0, subsections: [] },
      emotionalIntelligence: { total: 0, count: 0, subsections: [] },
      problemSolving: { total: 0, count: 0, subsections: [] },
      leadership: { total: 0, count: 0, subsections: [] },
      workEthic: { total: 0, count: 0, subsections: [] }
    };
    
    // Calculate dimension scores
    responsesData.forEach(response => {
      const questionId = response.question_id;
      const answerId = response.answer_id;
      
      // Check if this is a personality question
      if (questionsMap[questionId] && questionsMap[questionId].section === 'Personality Assessment') {
        const question = questionsMap[questionId];
        const dimension = mapSubsectionToDimension(question.subsection);
        const score = answersMap[answerId] || 0;
        
        if (dimension && personalityDimensions[dimension]) {
          personalityDimensions[dimension].total += score;
          personalityDimensions[dimension].count += 1;
          
          // Track unique subsections
          if (!personalityDimensions[dimension].subsections.includes(question.subsection)) {
            personalityDimensions[dimension].subsections.push(question.subsection);
          }
        }
      }
    });
    
    // Calculate percentages and prepare results
    const dimensionResults = {};
    Object.entries(personalityDimensions).forEach(([dimension, data]) => {
      if (data.count > 0) {
        const average = data.total / data.count;
        const percentage = Math.round((average / 5) * 100);
        const maxScore = data.count * 5;
        
        dimensionResults[dimension] = {
          score: average.toFixed(1),
          percentage: percentage,
          count: data.count,
          total: data.total,
          maxPossible: maxScore,
          subsections: data.subsections,
          interpretation: getPersonalityDimensionInterpretation(dimension, percentage)
        };
      }
    });
    
    return dimensionResults;
  };

  // Helper function for personality dimension interpretation
  const getPersonalityDimensionInterpretation = (dimension, percentage) => {
    const interpretations = {
      collaboration: {
        high: "Strong team player who actively contributes to group success and values collective achievement",
        medium: "Works effectively with others while maintaining independent capabilities",
        low: "More comfortable with independent work than team collaboration"
      },
      communication: {
        high: "Exceptional communicator who adapts style to different audiences and situations",
        medium: "Clear and effective communicator with room for growth in adaptability",
        low: "Direct communicator who may benefit from developing more nuanced communication approaches"
      },
      adaptability: {
        high: "Highly flexible and comfortable with change, uncertainty, and new approaches",
        medium: "Adaptable within familiar contexts and structures",
        low: "Prefers stability, predictability, and established routines"
      },
      initiative: {
        high: "Proactive problem-solver who takes ownership and drives improvements",
        medium: "Takes initiative when needed or when specifically empowered to do so",
        low: "Prefers clear direction and established processes before taking action"
      },
      emotionalIntelligence: {
        high: "Highly self-aware, empathetic, and skilled at navigating interpersonal dynamics",
        medium: "Aware of emotions in self and others with developing interpersonal skills",
        low: "More task-focused than people-focused in approach to work"
      },
      problemSolving: {
        high: "Analytical, creative, and systematic approach to solving complex problems",
        medium: "Capable problem-solver using established methods and approaches",
        low: "Prefers straightforward, proven solutions over innovative approaches"
      },
      leadership: {
        high: "Natural leader who guides, develops, and empowers others effectively",
        medium: "Demonstrates leadership potential and capability with appropriate support",
        low: "Prefers individual contributor role over leadership responsibilities"
      },
      workEthic: {
        high: "Highly responsible, reliable, and quality-focused in all work activities",
        medium: "Consistently meets expectations and delivers reliable performance",
        low: "Task-focused with opportunities to develop greater ownership and initiative"
      }
    };
    
    if (percentage >= 70) return interpretations[dimension]?.high || "Strong demonstration of this trait";
    if (percentage >= 50) return interpretations[dimension]?.medium || "Moderate demonstration of this trait";
    return interpretations[dimension]?.low || "Area for development";
  };

  // Helper to get top dimensions for summary
  const getTopDimensions = (dimensions) => {
    const sorted = Object.entries(dimensions)
      .filter(([_, data]) => data.percentage >= 70)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .slice(0, 3);
    
    if (sorted.length === 0) {
      // If no high scores, show moderately strong areas
      const moderateSorted = Object.entries(dimensions)
        .filter(([_, data]) => data.percentage >= 50)
        .sort((a, b) => b[1].percentage - a[1].percentage)
        .slice(0, 3);
      
      if (moderateSorted.length === 0) return "developing areas across most dimensions";
      
      return moderateSorted.map(([dim]) => 
        dim.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
      ).join(', ');
    }
    
    return sorted.map(([dim]) => 
      dim.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
    ).join(', ');
  };

  // Helper to format dimension name for display
  const formatDimensionName = (dimension) => {
    return dimension
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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

  // Fetch candidate data - UPDATED VERSION
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setDebugInfo(`Starting fetch for user: ${user_id}`);
        
        // GET CANDIDATE NAME AND EMAIL - FROM CODE 1
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
        // This handles candidates who might not be in the VIEW yet
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
        setDebugInfo(prev => prev + `\nGeneral error: ${err.message}`);
        // Use estimated data as last resort
        useEstimatedData(candidate?.total_score || 300);
      } finally {
        setLoading(false);
      }
    };

    // MAIN FUNCTION: Fetch responses and calculate category scores - FIXED VERSION
    const fetchAndCalculateCategoryScores = async (userId) => {
      try {
        setDebugInfo(prev => prev + "\n\n=== FETCHING RESPONSES ===");
        setDebugInfo(prev => prev + `\nUser ID: ${userId}`);
        
        // FIRST: Let's check what responses exist for this user
        const { data: responseCheck, error: checkError } = await supabase
          .from("responses")
          .select("id, question_id, answer_id, assessment_id, user_id")
          .eq("user_id", userId)
          .limit(5);
        
        if (checkError) {
          setDebugInfo(prev => prev + `\nError checking responses: ${checkError.message}`);
        } else if (responseCheck && responseCheck.length > 0) {
          setDebugInfo(prev => prev + `\nSample responses found:`);
          responseCheck.forEach((resp, i) => {
            setDebugInfo(prev => prev + `\n  ${i+1}. Q:${resp.question_id?.substring(0,8)} A:${resp.answer_id?.substring(0,8)}`);
          });
        } else {
          setDebugInfo(prev => prev + `\nNo responses found in initial check`);
        }
        
        // Fetch all responses for this user - WITHOUT ASSESSMENT_ID FILTER
        const { data: allResponses, error: responsesError } = await supabase
          .from("responses")
          .select("id, question_id, answer_id, assessment_id")
          .eq("user_id", userId);
        
        if (responsesError) {
          setDebugInfo(prev => prev + `\nError fetching responses: ${responsesError.message}`);
          // Try without user_id filter to see what's in the table
          const { data: allTableResponses } = await supabase
            .from("responses")
            .select("id, user_id")
            .limit(10);
          
          if (allTableResponses) {
            setDebugInfo(prev => prev + `\nTotal responses in table: ${allTableResponses.length}`);
            const uniqueUsers = [...new Set(allTableResponses.map(r => r.user_id))];
            setDebugInfo(prev => prev + `\nFound ${uniqueUsers.length} unique users in responses table`);
          }
          
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        if (!allResponses || allResponses.length === 0) {
          setDebugInfo(prev => prev + `\nNo responses found for user ${userId.substring(0, 8)}`);
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        setDebugInfo(prev => prev + `\nFound ${allResponses.length} responses for user ${userId.substring(0, 8)}`);
        
        // Show sample data for debugging
        if (allResponses.length > 0) {
          setDebugInfo(prev => prev + `\nSample responses:`);
          allResponses.slice(0, 3).forEach((resp, i) => {
            setDebugInfo(prev => prev + `\n  ${i+1}. Q:${resp.question_id?.substring(0,8)} A:${resp.answer_id?.substring(0,8)}`);
          });
        }
        
        setResponses(allResponses);
        
        // Now calculate category scores
        await calculateCategoryScoresFromResponses(allResponses);
        
      } catch (error) {
        console.error("Fetch error:", error);
        setDebugInfo(prev => prev + `\nFetch error: ${error.message}`);
        useEstimatedData(candidate?.total_score || 300);
      }
    };

    // CALCULATE CATEGORY SCORES FROM RESPONSES - FIXED VERSION WITH CORRECT SCORING
    const calculateCategoryScoresFromResponses = async (responsesData) => {
      try {
        setDebugInfo(prev => prev + "\n\n=== CALCULATING CATEGORY SCORES ===");
        
        if (!responsesData || responsesData.length === 0) {
          setDebugInfo(prev => prev + "\nNo response data to calculate");
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        // Get unique question and answer IDs
        const questionIds = [...new Set(responsesData.map(r => r.question_id))];
        const answerIds = [...new Set(responsesData.map(r => r.answer_id))];
        
        setDebugInfo(prev => prev + `\nUnique questions: ${questionIds.length}, Unique answers: ${answerIds.length}`);
        
        if (questionIds.length === 0 || answerIds.length === 0) {
          setDebugInfo(prev => prev + "\nNo valid question or answer IDs found");
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        // Fetch questions - UPDATED: Include question_text and subsection
        const { data: questions, error: qError } = await supabase
          .from("questions")
          .select("id, question_text, section, subsection")
          .in("id", questionIds);
        
        if (qError) {
          setDebugInfo(prev => prev + `\nError fetching questions: ${qError.message}`);
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        if (!questions || questions.length === 0) {
          setDebugInfo(prev => prev + "\nNo questions found in database");
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        setDebugInfo(prev => prev + `\nLoaded ${questions.length} questions`);
        
        // Create questions map
        const questionsMap = {};
        questions.forEach(q => {
          questionsMap[q.id] = {
            section: q.section,
            subsection: q.subsection,
            question_text: q.question_text
          };
        });
        
        // Fetch answers - UPDATED: Use answer_text column
        const { data: answers, error: aError } = await supabase
          .from("answers")
          .select("id, score, answer_text")
          .in("id", answerIds);
        
        if (aError) {
          setDebugInfo(prev => prev + `\nError fetching answers: ${aError.message}`);
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        if (!answers || answers.length === 0) {
          setDebugInfo(prev => prev + "\nNo answers found in database");
          useEstimatedData(candidate?.total_score || 300);
          return;
        }
        
        set
