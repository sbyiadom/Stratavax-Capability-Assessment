// pages/supervisor/[user_id].js - WITH PSYCHOLOGICAL/PROFILE ANALYSIS
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
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [personalityDimensions, setPersonalityDimensions] = useState({});
  const [activeTab, setActiveTab] = useState("analysis");
  const [profileInsights, setProfileInsights] = useState([]);

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
    if (score >= 450) return "Exceptional performer demonstrating mastery across all assessment categories. Consistently exceeds expectations with outstanding analytical, technical, and leadership capabilities.";
    if (score >= 400) return "Outstanding performer with clear strengths across multiple domains. Demonstrates strong leadership potential and technical competence suitable for increased responsibility.";
    if (score >= 350) return "Strong performer with clear development areas. Shows promise for growth and advancement with targeted development and strategic improvement opportunities.";
    if (score >= 300) return "Reliable and consistent performer meeting core requirements. Demonstrates competency in key areas with predictable performance and potential for growth.";
    if (score >= 250) return "Shows foundational skills with clear development needs. Requires structured guidance and skill-building opportunities to reach full potential.";
    if (score >= 200) return "Early-stage performer requiring significant development. Needs comprehensive training and close supervision to enhance foundational skills.";
    return "Performance below expectations requiring immediate attention. Needs intensive development plan and regular performance reviews to address critical gaps.";
  }, []);

  // Helper function to get performance grade
  const getPerformanceGrade = useCallback((score) => {
    if (score >= 450) return "A+";
    if (score >= 400) return "A";
    if (score >= 350) return "B+";
    if (score >= 300) return "B";
    if (score >= 250) return "C";
    if (score >= 200) return "D";
    return "F";
  }, []);

  // Helper function to get grade label
  const getGradeLabel = useCallback((score) => {
    if (score >= 450) return "Elite";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid";
    if (score >= 250) return "Developing";
    if (score >= 200) return "Emerging";
    return "Needs Improvement";
  }, []);

  // Get category grade
  const getCategoryGrade = useCallback((percentage) => {
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
  }, []);

  // Get category grade label
  const getCategoryGradeLabel = useCallback((grade) => {
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
  }, []);

  // Get category interpretation - PSYCHOLOGICAL/PROFILE BASED
  const getCategoryInterpretation = useCallback((percentage, category) => {
    if (percentage >= 80) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Demonstrates exceptional cognitive processing, analytical reasoning, and problem-solving capabilities. Shows advanced pattern recognition, logical deduction, and mental agility suitable for complex decision-making roles. This candidate processes information quickly and can handle abstract concepts with ease.";
        case 'Personality Assessment':
          return "Exhibits outstanding emotional intelligence, adaptability, and interpersonal skills. Demonstrates strong self-awareness, resilience, and communication abilities ideal for collaborative environments. This candidate reads situations well and adapts their approach to different personalities.";
        case 'Leadership Potential':
          return "Shows exceptional leadership qualities including strategic vision, influence, and team development capabilities. Demonstrates natural ability to inspire, motivate, and drive organizational success. This candidate naturally gravitates toward leadership roles and others look to them for direction.";
        case 'Technical Competence':
          return "Possesses expert-level technical knowledge and application skills. Demonstrates mastery of technical concepts, problem-solving abilities, and capacity for innovation in specialized domains. This candidate stays current with industry trends and applies best practices effectively.";
        case 'Performance Metrics':
          return "Consistently exceeds performance targets with exceptional results. Demonstrates outstanding productivity, efficiency, and goal achievement capabilities with measurable impact. This candidate sets high standards and consistently delivers beyond expectations.";
        default:
          return "Demonstrates exceptional capability across assessed dimensions. Shows strong reasoning, sound judgment, and consistent performance.";
      }
    } else if (percentage >= 70) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Displays very strong cognitive abilities with excellent problem-solving skills. Demonstrates strong analytical thinking and logical reasoning with minor areas for refinement. Processes information effectively and can handle most complex situations.";
        case 'Personality Assessment':
          return "Exhibits strong interpersonal skills and emotional intelligence. Demonstrates good adaptability and communication abilities suitable for most professional contexts. Works well with others and maintains positive relationships.";
        case 'Leadership Potential':
          return "Shows strong leadership qualities with clear potential. Demonstrates ability to guide teams effectively and contribute to organizational goals. Has the foundational qualities to develop into a strong leader with experience.";
        case 'Technical Competence':
          return "Possesses strong technical knowledge and practical skills. Demonstrates competence in technical areas with ability to handle complex problems. Can apply technical concepts effectively in most situations.";
        case 'Performance Metrics':
          return "Frequently exceeds performance expectations. Demonstrates strong productivity and effective goal achievement. Consistently delivers high-quality work.";
        default:
          return "Shows strong overall capability with minimal development areas. Demonstrates effective performance across key dimensions.";
      }
    } else if (percentage >= 60) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Displays adequate cognitive abilities meeting baseline requirements. Demonstrates satisfactory problem-solving and reasoning capabilities for standard tasks. May need additional time to process complex information.";
        case 'Personality Assessment':
          return "Exhibits adequate interpersonal skills for most situations. Demonstrates basic emotional intelligence and professional behavior. Works acceptably with others but may have occasional interpersonal challenges.";
        case 'Leadership Potential':
          return "Shows foundational leadership capabilities. Demonstrates potential for growth with appropriate development. Can lead in limited contexts but needs support for broader leadership responsibilities.";
        case 'Technical Competence':
          return "Possesses basic technical knowledge meeting minimum requirements. Demonstrates ability to handle routine technical tasks with guidance. Needs support for complex technical challenges.";
        case 'Performance Metrics':
          return "Consistently meets performance standards. Demonstrates adequate productivity and goal completion. Delivers expected results reliably.";
        default:
          return "Meets baseline requirements across assessed dimensions. Demonstrates adequate competency for standard expectations.";
      }
    } else if (percentage >= 50) {
      switch(category) {
        case 'Cognitive Abilities':
          return "Shows difficulty with some cognitive tasks. Demonstrates gaps in analytical thinking that require targeted improvement. May struggle with complex problem-solving and need additional support.";
        case 'Personality Assessment':
          return "Exhibits limitations in interpersonal effectiveness. Demonstrates need for development in communication or adaptability. May have difficulty navigating complex social situations.";
        case 'Leadership Potential':
          return "Displays limited leadership readiness. Shows some capability but requires significant development. Not ready for independent leadership responsibilities.";
        case 'Technical Competence':
          return "Possesses insufficient technical knowledge in some areas. Demonstrates need for additional training and practice. Can perform basic tasks but struggles with more complex requirements.";
        case 'Performance Metrics':
          return "Approaches performance standards but falls short consistently. Demonstrates need for improvement in productivity or efficiency. Requires coaching to meet expectations.";
        default:
          return "Shows some capability but falls short of expectations in multiple areas. Requires focused development.";
      }
    } else {
      switch(category) {
        case 'Cognitive Abilities':
          return "Struggles significantly with analytical thinking and problem-solving. Demonstrates substantial gaps in reasoning and processing abilities. Requires intensive support and basic skill development.";
        case 'Personality Assessment':
          return "Exhibits significant limitations in professional behavior and interpersonal effectiveness. Demonstrates serious challenges with emotional intelligence and communication. May not be suitable for team-based roles.";
        case 'Leadership Potential':
          return "Shows minimal leadership capabilities. Requires extensive development to reach basic competency. Not suited for leadership roles at this time.";
        case 'Technical Competence':
          return "Possesses inadequate technical knowledge. Demonstrates major deficiencies in understanding core concepts. Needs foundational training before handling technical tasks.";
        case 'Performance Metrics':
          return "Falls below performance expectations consistently. Demonstrates poor productivity and goal achievement. Requires immediate intervention and close supervision.";
        default:
          return "Falls below minimum competency standards. Demonstrates significant gaps in required skills and knowledge. May not be suitable for the role.";
      }
    }
  }, []);

  // Get performance label
  const getCategoryPerformanceLabel = useCallback((percentage) => {
    if (percentage >= 80) return "Exceptional";
    if (percentage >= 70) return "Strong";
    if (percentage >= 60) return "Satisfactory";
    if (percentage >= 50) return "Developing";
    return "Needs Improvement";
  }, []);

  // Get performance color
  const getCategoryPerformanceColor = useCallback((percentage) => {
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 70) return "#2196F3";
    if (percentage >= 60) return "#FF9800";
    if (percentage >= 50) return "#9C27B0";
    return "#F44336";
  }, []);

  // Get performance icon
  const getCategoryPerformanceIcon = useCallback((percentage) => {
    if (percentage >= 80) return "🏆";
    if (percentage >= 70) return "👍";
    if (percentage >= 60) return "✅";
    if (percentage >= 50) return "📉";
    return "⚠️";
  }, []);

  // Map subsection to personality dimensions
  const mapSubsectionToDimension = useCallback((subsection) => {
    const mapping = {
      'Communication': 'communication',
      'Conflict Resolution': 'emotionalIntelligence',
      'Communication Style': 'communication',
      'Communication Clarity': 'communication',
      'Team Contribution': 'collaboration',
      'Work Approach': 'adaptability',
      'Work Environment': 'collaboration',
      'Time Management': 'workEthic',
      'Learning Style': 'adaptability',
      'Problem-Solving': 'problemSolving',
      'Motivation': 'workEthic',
      'Decision Values': 'problemSolving',
      'Success Definition': 'workEthic',
      'Work-Life Balance': 'emotionalIntelligence',
      'Feedback Reception': 'emotionalIntelligence',
      'Initiative': 'initiative',
      'Leadership': 'leadership',
      'Leadership Style': 'leadership',
      'Risk Tolerance': 'initiative',
      'Delegation': 'leadership'
    };
    return mapping[subsection] || 'general';
  }, []);

  // Analyze personality dimensions from responses - WITH PSYCHOLOGICAL INSIGHTS
  const analyzePersonalityDimensions = useCallback((responsesData, questionsMap, answersMap) => {
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
    
    // Also collect insights based on specific answer patterns
    const insights = [];
    
    responsesData.forEach(response => {
      const questionId = response.question_id;
      const answerId = response.answer_id;
      
      if (questionsMap[questionId] && questionsMap[questionId].section === 'Personality Assessment') {
        const question = questionsMap[questionId];
        const dimension = mapSubsectionToDimension(question.subsection);
        const score = answersMap[answerId] || 0;
        
        if (dimension && personalityDimensions[dimension]) {
          personalityDimensions[dimension].total += score;
          personalityDimensions[dimension].count += 1;
          
          if (!personalityDimensions[dimension].subsections.includes(question.subsection)) {
            personalityDimensions[dimension].subsections.push(question.subsection);
          }
          
          // Generate insights based on score patterns
          if (score >= 4) {
            insights.push({
              type: 'strength',
              dimension,
              subsection: question.subsection,
              insight: getStrengthInsight(dimension, question.subsection)
            });
          } else if (score <= 2) {
            insights.push({
              type: 'weakness',
              dimension,
              subsection: question.subsection,
              insight: getWeaknessInsight(dimension, question.subsection)
            });
          }
        }
      }
    });
    
    const dimensionResults = {};
    Object.entries(personalityDimensions).forEach(([dimension, data]) => {
      if (data.count > 0) {
        const average = data.total / data.count;
        const percentage = Math.round((average / 5) * 100);
        
        dimensionResults[dimension] = {
          score: average.toFixed(1),
          percentage: percentage,
          count: data.count,
          total: data.total,
          maxPossible: data.count * 5,
          subsections: data.subsections,
          interpretation: getPersonalityDimensionInterpretation(dimension, percentage),
          detailedProfile: getPersonalityProfile(dimension, percentage)
        };
      }
    });
    
    return { dimensionResults, insights };
  }, [mapSubsectionToDimension]);

  // Get strength insight based on dimension and subsection
  const getStrengthInsight = (dimension, subsection) => {
    const insights = {
      communication: {
        high: "Naturally articulates ideas clearly and persuasively. Adapts communication style to different audiences effectively."
      },
      collaboration: {
        high: "Seeks out diverse perspectives and builds consensus. Creates an environment where others feel valued and heard."
      },
      emotionalIntelligence: {
        high: "Highly attuned to others' emotions and responds with empathy. Navigates difficult conversations with grace."
      },
      adaptability: {
        high: "Embraces change and uncertainty as opportunities for growth. Quickly adjusts approach when circumstances shift."
      },
      initiative: {
        high: "Identifies problems before they escalate and takes proactive steps. Doesn't wait for direction to act."
      },
      problemSolving: {
        high: "Approaches challenges systematically while thinking creatively. Sees multiple solutions and evaluates trade-offs effectively."
      },
      leadership: {
        high: "Inspires others through vision and example. Develops people around them and delegates effectively."
      },
      workEthic: {
        high: "Consistently delivers high-quality work with minimal oversight. Takes ownership and follows through on commitments."
      }
    };
    return insights[dimension]?.high || "Strong demonstration of this trait based on answer patterns.";
  };

  // Get weakness insight based on dimension and subsection
  const getWeaknessInsight = (dimension, subsection) => {
    const insights = {
      communication: {
        low: "May struggle to articulate thoughts clearly in certain situations. Could benefit from developing more nuanced communication approaches."
      },
      collaboration: {
        low: "Prefers independent work and may miss opportunities for synergy. Could develop greater openness to others' input."
      },
      emotionalIntelligence: {
        low: "May not always pick up on social cues or others' emotional states. Could benefit from empathy-building exercises."
      },
      adaptability: {
        low: "Prefers stability and may resist necessary changes. Could develop greater flexibility and openness to new approaches."
      },
      initiative: {
        low: "Tends to wait for direction rather than acting independently. Could benefit from developing greater proactivity."
      },
      problemSolving: {
        low: "May rely on familiar solutions rather than exploring alternatives. Could develop more systematic problem-solving approaches."
      },
      leadership: {
        low: "Prefers individual contributor role over leading others. May need development in influencing and developing people."
      },
      workEthic: {
        low: "May need support with consistency and follow-through. Could benefit from stronger accountability structures."
      }
    };
    return insights[dimension]?.low || "Area for development based on answer patterns.";
  };

  // Get personality dimension interpretation
  const getPersonalityDimensionInterpretation = useCallback((dimension, percentage) => {
    const interpretations = {
      collaboration: {
        high: "Strong team player who actively contributes to group success and values collective achievement. Likely seeks input from others and builds consensus effectively.",
        medium: "Works effectively with others while maintaining independent capabilities. Can collaborate when needed but also comfortable working alone.",
        low: "More comfortable with independent work than team collaboration. May prefer solo projects and need encouragement to engage with teams."
      },
      communication: {
        high: "Exceptional communicator who adapts style to different audiences and situations. Articulates ideas clearly and listens actively to others.",
        medium: "Clear and effective communicator with room for growth in adaptability. Communicates well in familiar contexts but may struggle with difficult conversations.",
        low: "Direct communicator who may benefit from developing more nuanced communication approaches. May come across as abrupt or miss subtle cues."
      },
      adaptability: {
        high: "Highly flexible and comfortable with change, uncertainty, and new approaches. Thrives in dynamic environments and sees change as opportunity.",
        medium: "Adaptable within familiar contexts and structures. Can adjust when needed but prefers stability and predictability.",
        low: "Prefers stability, predictability, and established routines. May struggle with rapid change and need additional support during transitions."
      },
      initiative: {
        high: "Proactive problem-solver who takes ownership and drives improvements. Identifies opportunities without waiting for direction.",
        medium: "Takes initiative when needed or when specifically empowered to do so. May need clear authority to act independently.",
        low: "Prefers clear direction and established processes before taking action. Waits for guidance rather than acting proactively."
      },
      emotionalIntelligence: {
        high: "Highly self-aware, empathetic, and skilled at navigating interpersonal dynamics. Reads situations well and responds appropriately.",
        medium: "Aware of emotions in self and others with developing interpersonal skills. Generally handles relationships well but may miss subtle cues.",
        low: "More task-focused than people-focused in approach to work. May not always consider emotional impact of actions on others."
      },
      problemSolving: {
        high: "Analytical, creative, and systematic approach to solving complex problems. Generates multiple solutions and evaluates trade-offs effectively.",
        medium: "Capable problem-solver using established methods and approaches. Solves standard problems effectively but may struggle with novel situations.",
        low: "Prefers straightforward, proven solutions over innovative approaches. May need support with complex or ambiguous problems."
      },
      leadership: {
        high: "Natural leader who guides, develops, and empowers others effectively. Inspires through vision and builds strong teams.",
        medium: "Demonstrates leadership potential and capability with appropriate support. Can lead in limited contexts but needs development for broader roles.",
        low: "Prefers individual contributor role over leadership responsibilities. May not seek opportunities to influence or develop others."
      },
      workEthic: {
        high: "Highly responsible, reliable, and quality-focused in all work activities. Takes ownership and follows through consistently.",
        medium: "Consistently meets expectations and delivers reliable performance. Can be counted on for standard deliverables.",
        low: "Task-focused with opportunities to develop greater ownership and initiative. May need support with consistency and follow-through."
      }
    };
    
    if (percentage >= 70) return interpretations[dimension]?.high || "Strong demonstration of this trait";
    if (percentage >= 50) return interpretations[dimension]?.medium || "Moderate demonstration of this trait";
    return interpretations[dimension]?.low || "Area for development";
  }, []);

  // Get detailed personality profile
  const getPersonalityProfile = (dimension, percentage) => {
    if (percentage >= 70) {
      return `This candidate demonstrates strong ${dimension} tendencies, which suggests they will likely excel in environments that value this trait.`;
    } else if (percentage >= 50) {
      return `This candidate shows moderate ${dimension} tendencies, with flexibility to adapt based on situation.`;
    } else {
      return `This candidate shows lower ${dimension} tendencies, which may impact their effectiveness in areas requiring this trait.`;
    }
  };

  // Get top dimensions
  const getTopDimensions = useCallback((dimensions) => {
    const sorted = Object.entries(dimensions)
      .filter(([_, data]) => data.percentage >= 70)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .slice(0, 3);
    
    if (sorted.length === 0) {
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
  }, []);

  // Format dimension name
  const formatDimensionName = useCallback((dimension) => {
    return dimension
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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

  // Calculate analysis
  const calculateAnalysis = useCallback((categoryScoresData) => {
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
    
    const candidateRecommendations = candidateWeaknesses.map(weakness => {
      let recommendation = "";
      
      switch(weakness.category) {
        case 'Cognitive Abilities':
          recommendation = "Consider cognitive training exercises, problem-solving workshops, and analytical thinking development programs. Focus on logical reasoning, pattern recognition, and mental agility exercises.";
          break;
        case 'Personality Assessment':
          recommendation = "Engage in personality development sessions, emotional intelligence training, and communication workshops. Consider role-playing exercises and interpersonal skills development programs.";
          break;
        case 'Leadership Potential':
          recommendation = "Participate in leadership workshops, mentorship programs, and team management exercises. Focus on decision-making, influence development, and strategic thinking training.";
          break;
        case 'Technical Competence':
          recommendation = "Attend technical training sessions, industry-specific workshops, and hands-on practice programs. Focus on core technical skills, practical applications, and problem-solving in technical domains.";
          break;
        case 'Performance Metrics':
          recommendation = "Focus on goal-setting strategies, performance tracking improvement, time management workshops, and productivity enhancement techniques. Implement regular performance reviews and feedback sessions.";
          break;
        default:
          recommendation = "Consider targeted training and development programs in this specific area. Create a personalized development plan with measurable goals and regular progress reviews.";
      }
      
      return {
        category: weakness.category,
        issue: `${weakness.category} scored ${weakness.score}% (Grade ${weakness.grade}). ${weakness.detailedInterpretation}`,
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
        grade: "A/A-",
        score: 85
      });
    }
    
    setRecommendations(candidateRecommendations);
  }, [getCategoryGrade, getCategoryInterpretation, getCategoryGradeLabel, getCategoryPerformanceLabel, getCategoryPerformanceIcon]);

  // Calculate category scores from responses
  const calculateCategoryScoresFromResponses = useCallback(async (responsesData, candidateTotalScore) => {
    try {
      if (!responsesData || responsesData.length === 0) {
        return;
      }
      
      const questionIds = [...new Set(responsesData.map(r => r.question_id))];
      const answerIds = [...new Set(responsesData.map(r => r.answer_id))];
      
      if (questionIds.length === 0 || answerIds.length === 0) {
        return;
      }
      
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
      
      const categoryTotals = {};
      const categoryCounts = {};
      let totalScore = 0;
      let processedCount = 0;
      
      responsesData.forEach(response => {
        const questionData = questionsMap[response.question_id];
        const section = questionData?.section;
        const score = answersMap[response.answer_id] || 0;
        
        if (!section) return;
        
        categoryTotals[section] = (categoryTotals[section] || 0) + score;
        categoryCounts[section] = (categoryCounts[section] || 0) + 1;
        totalScore += score;
        processedCount++;
      });
      
      if (processedCount === 0) return;
      
      const calculatedCategoryScores = {};
      const categoriesFound = Object.keys(categoryTotals);
      
      categoriesFound.forEach(section => {
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
      
      // Calculate personality dimensions with insights
      const { dimensionResults, insights } = analyzePersonalityDimensions(responsesData, questionsMap, answersMap);
      setPersonalityDimensions(dimensionResults);
      setProfileInsights(insights);
      
      if (candidateTotalScore && Math.abs(totalScore - candidateTotalScore) > 5) {
        const scaleFactor = candidateTotalScore / totalScore;
        Object.keys(calculatedCategoryScores).forEach(section => {
          calculatedCategoryScores[section].total = Math.round(calculatedCategoryScores[section].total * scaleFactor);
          calculatedCategoryScores[section].percentage = Math.round((calculatedCategoryScores[section].total / calculatedCategoryScores[section].maxPossible) * 100);
          calculatedCategoryScores[section].average = (calculatedCategoryScores[section].total / calculatedCategoryScores[section].count).toFixed(1);
        });
      }
      
      setCategoryScores(calculatedCategoryScores);
      calculateAnalysis(calculatedCategoryScores);
      
    } catch (error) {
      console.error("Calculation error:", error);
    }
  }, [calculateAnalysis, analyzePersonalityDimensions]);

  // Fetch responses
  const fetchAndCalculateCategoryScores = useCallback(async (userId, candidateTotalScore) => {
    try {
      const { data: allResponses, error: responsesError } = await supabase
        .from("responses")
        .select("id, question_id, answer_id, assessment_id")
        .eq("user_id", userId);
      
      if (responsesError || !allResponses || allResponses.length === 0) {
        return;
      }
      
      setResponses(allResponses);
      await calculateCategoryScoresFromResponses(allResponses, candidateTotalScore);
      
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [calculateCategoryScoresFromResponses]);

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
          await fetchAndCalculateCategoryScores(user_id, candidateData.total_score);
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
  }, [isSupervisor, user_id, getClassification, fetchAndCalculateCategoryScores]);

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

  const totalCount = Object.values(categoryScores).reduce((sum, data) => sum + data.count, 0);
  const totalAverage = totalCount > 0 ? (candidateScore / totalCount).toFixed(1) : 0;

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
                Candidate Profile Analysis
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
                Score: {candidateScore}/500
              </div>
            </div>
          </div>

          {/* Performance Classification */}
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
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "5px" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                  Max possible: 500 points • {Math.round((candidateScore / 500) * 100)}% overall
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
                <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "3px" }}>
                  {gradeLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Scores Breakdown - What their scores reveal */}
        {Object.keys(categoryScores).length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>What Their Scores Reveal</h2>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px"
            }}>
              {Object.entries(categoryScores).map(([category, data]) => (
                <div key={category} style={{
                  padding: "20px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderTop: `4px solid ${getCategoryColor(category)}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px"
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      color: getCategoryColor(category),
                      fontSize: "18px"
                    }}>
                      {category}
                    </h3>
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
                    marginBottom: "15px"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${data.percentage}%`, 
                      background: getCategoryColor(category),
                      borderRadius: "5px"
                    }} />
                  </div>
                  
                  <div style={{ 
                    fontSize: "14px", 
                    color: "#555", 
                    lineHeight: 1.6,
                    padding: "15px",
                    background: "white",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0"
                  }}>
                    {getCategoryInterpretation(data.percentage, category)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personality Dimension Analysis - PSYCHOLOGICAL PROFILE */}
        {Object.keys(personalityDimensions).length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Psychological Profile</h2>
            
            {/* Overall Profile Summary */}
            <div style={{ 
              padding: "20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "8px",
              marginBottom: "25px",
              color: "white"
            }}>
              <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
                Profile Overview
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.6, opacity: 0.95 }}>
                This candidate's responses reveal a profile characterized by <strong>{getTopDimensions(personalityDimensions)}</strong>. 
                {personalityDimensions.collaboration?.percentage >= 70 ? ' They thrive in collaborative environments and naturally build consensus.' : ''}
                {personalityDimensions.communication?.percentage >= 70 ? ' They communicate with clarity and adapt well to different audiences.' : ''}
                {personalityDimensions.adaptability?.percentage >= 70 ? ' They are highly adaptable and comfortable with change.' : ''}
                {personalityDimensions.initiative?.percentage >= 70 ? ' They take initiative and drive improvements proactively.' : ''}
                {personalityDimensions.leadership?.percentage >= 70 ? ' They demonstrate natural leadership qualities.' : ''}
                {personalityDimensions.emotionalIntelligence?.percentage < 50 ? ' They may benefit from developing greater emotional awareness.' : ''}
                {personalityDimensions.collaboration?.percentage < 50 ? ' They prefer independent work over team collaboration.' : ''}
              </div>
            </div>
            
            {/* Detailed Dimension Analysis */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px"
            }}>
              {Object.entries(personalityDimensions).map(([dimension, data]) => (
                <div key={dimension} style={{
                  padding: "20px",
                  background: data.percentage >= 70 ? "#f1f8e9" : 
                             data.percentage >= 50 ? "#fff8e1" : "#ffebee",
                  borderRadius: "8px",
                  border: `1px solid ${data.percentage >= 70 ? "#a5d6a7" : 
                                         data.percentage >= 50 ? "#ffe082" : "#ef9a9a"}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px"
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: "18px", 
                      color: "#333"
                    }}>
                      {formatDimensionName(dimension)}
                    </h3>
                    <span style={{
                      padding: "4px 12px",
                      background: data.percentage >= 70 ? "#a5d6a7" : 
                                 data.percentage >= 50 ? "#ffe082" : "#ef9a9a",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: data.percentage >= 70 ? "#1b5e20" : 
                             data.percentage >= 50 ? "#ff6f00" : "#b71c1c"
                    }}>
                      {data.percentage}%
                    </span>
                  </div>
                  
                  <div style={{ 
                    fontSize: "14px", 
                    color: "#555",
                    lineHeight: 1.6,
                    marginBottom: "10px"
                  }}>
                    {data.interpretation}
                  </div>
                  
                  <div style={{
                    padding: "12px",
                    background: "white",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#666",
                    borderLeft: `4px solid ${data.percentage >= 70 ? "#4CAF50" : 
                                              data.percentage >= 50 ? "#FF9800" : "#F44336"}`
                  }}>
                    <strong>What this means:</strong> {data.detailedProfile}
                  </div>
                  
                  {data.subsections && data.subsections.length > 0 && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "#888" }}>
                      <strong>Assessed through:</strong> {data.subsections.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Specific Insights from Answer Patterns */}
            {profileInsights.length > 0 && (
              <div style={{ marginTop: "25px" }}>
                <h3 style={{ fontSize: "16px", color: "#333", marginBottom: "15px" }}>
                  Key Behavioral Insights
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {profileInsights.slice(0, 5).map((insight, index) => (
                    <div key={index} style={{
                      padding: "12px",
                      background: insight.type === 'strength' ? "#e8f5e9" : "#ffebee",
                      borderRadius: "6px",
                      borderLeft: `4px solid ${insight.type === 'strength' ? "#4CAF50" : "#F44336"}`
                    }}>
                      <div style={{ fontSize: "13px", color: insight.type === 'strength' ? "#1b5e20" : "#b71c1c" }}>
                        {insight.insight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strengths and Weaknesses - Summary */}
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
                        {strength.grade} • {strength.score}%
                      </div>
                    </div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#555" }}>
                      {strength.detailedInterpretation}
                    </p>
                    <div style={{ fontSize: "13px", color: "#777", padding: "8px", background: "white", borderRadius: "6px" }}>
                      <strong>What this indicates:</strong> {strength.gradeLabel}
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
                        {weakness.grade} • {weakness.score}%
                      </div>
                    </div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#555" }}>
                      {weakness.detailedInterpretation}
                    </p>
                    <div style={{ fontSize: "13px", color: "#777", padding: "8px", background: "white", borderRadius: "6px", fontStyle: "italic" }}>
                      <strong>Priority:</strong> {weakness.grade === "F" || weakness.grade === "D" ? "High" : 
                                                  weakness.grade === "C-" || weakness.grade === "D+" ? "Medium" : "Low"}
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
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: index === 0 && rec.category === "Overall Performance" ? "#e3f2fd" : "#f8f9fa",
                  borderRadius: "8px",
                  border: `1px solid ${index === 0 && rec.category === "Overall Performance" ? "#1565c0" : "#e0e0e0"}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: index === 0 && rec.category === "Overall Performance" ? "#1565c0" : "#333" }}>
                        {rec.category}
                      </h3>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                        Score: {rec.score}% • Grade: {rec.grade}
                      </div>
                    </div>
                    <div style={{ 
                      padding: "6px 12px",
                      background: rec.score >= 70 ? "#e8f5e9" : 
                                 rec.score >= 60 ? "#fff3e0" : "#ffebee",
                      color: rec.score >= 70 ? "#2e7d32" : 
                             rec.score >= 60 ? "#f57c00" : "#c62828",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {rec.score >= 70 ? "Strength" : rec.score >= 60 ? "Average" : "Development Area"}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: "14px", 
                    color: "#555",
                    lineHeight: 1.6,
                    marginBottom: "15px",
                    padding: "10px",
                    background: "white",
                    borderRadius: "6px"
                  }}>
                    {rec.issue}
                  </div>
                  
                  <div style={{ 
                    padding: "15px",
                    background: index === 0 && rec.category === "Overall Performance" ? "white" : "#e8f5e9",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${index === 0 && rec.category === "Overall Performance" ? "#1565c0" : "#4CAF50"}`
                  }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                      Recommended Action Plan
                    </div>
                    <div style={{ fontSize: "14px", color: "#444", lineHeight: 1.6 }}>
                      {rec.recommendation}
                    </div>
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
          <p>Profile analysis generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p style={{ marginTop: "5px" }}>
            This analysis is based on the candidate's actual responses and provides insights into their capabilities, 
            thinking patterns, and development areas.
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
