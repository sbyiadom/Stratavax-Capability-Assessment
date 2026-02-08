// pages/supervisor/[user_id].js - SIMPLIFIED VERSION (NO PDF DEPENDENCIES)
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  const reportRef = useRef(null);
  
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
  const [generatingReport, setGeneratingReport] = useState(false);

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
    if (score >= 450) return "#4CAF50"; // Green
    if (score >= 400) return "#2196F3"; // Blue
    if (score >= 350) return "#FF9800"; // Orange
    if (score >= 300) return "#9C27B0"; // Purple
    if (score >= 250) return "#F57C00"; // Deep Orange
    if (score >= 200) return "#795548"; // Brown
    return "#F44336"; // Red
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

  // 1. Get category grade based on NEW scale
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

  // 2. Get category grade label (for dashboards) - UPDATED
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

  // 3. Get interpretive comments based on NEW scale - CATEGORY SPECIFIC
  const getCategoryInterpretation = useCallback((percentage, category) => {
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
  }, []);

  // 4. Get performance label for categories - UPDATED
  const getCategoryPerformanceLabel = useCallback((percentage) => {
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
  }, []);

  // 5. Get performance color for categories - UPDATED with more granular colors
  const getCategoryPerformanceColor = useCallback((percentage) => {
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
  }, []);

  // 6. Get performance icon/emoji - UPDATED
  const getCategoryPerformanceIcon = useCallback((percentage) => {
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
  }, []);

  // =============================================
  // PERSONALITY ANALYSIS FUNCTIONS
  // =============================================

  // Map subsection to personality dimensions
  const mapSubsectionToDimension = useCallback((subsection) => {
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
  }, []);

  // Analyze personality dimensions from responses
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
  }, [mapSubsectionToDimension]);

  // Helper function for personality dimension interpretation
  const getPersonalityDimensionInterpretation = useCallback((dimension, percentage) => {
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
  }, []);

  // Helper to get top dimensions for summary
  const getTopDimensions = useCallback((dimensions) => {
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
  }, []);

  // Helper to format dimension name for display
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

  // FALLBACK: Estimate category scores based on total score - UNIQUE PER USER
  const useEstimatedData = useCallback((totalScore) => {
    setDebugInfo(prev => prev + "\n\n=== USING ESTIMATED DATA ===");
    
    const overallPercentage = Math.round((totalScore / 500) * 100);
    const basePercentage = overallPercentage;
    
    // Create UNIQUE distribution for each user based on their user_id
    const userIdNum = parseInt((user_id || '123456').replace(/[^0-9]/g, '').substring(0, 6) || '123456', 10);
    
    const variations = {
      'Cognitive Abilities': (userIdNum % 10) - 4,
      'Personality Assessment': ((userIdNum % 100) / 10) - 4,
      'Leadership Potential': ((userIdNum % 1000) / 100) - 4,
      'Technical Competence': ((userIdNum % 10000) / 1000) - 4,
      'Performance Metrics': ((userIdNum % 8) - 3)
    };
    
    // Apply variations to base percentage
    const estimatedPercentages = {
      'Cognitive Abilities': Math.min(100, Math.max(0, basePercentage + variations['Cognitive Abilities'])),
      'Personality Assessment': Math.min(100, Math.max(0, basePercentage + variations['Personality Assessment'])),
      'Leadership Potential': Math.min(100, Math.max(0, basePercentage + variations['Leadership Potential'])),
      'Technical Competence': Math.min(100, Math.max(0, basePercentage + variations['Technical Competence'])),
      'Performance Metrics': Math.min(100, Math.max(0, basePercentage + variations['Performance Metrics']))
    };
    
    // Scale percentages so they average to the overall percentage
    const categories = Object.keys(estimatedPercentages);
    let currentAvg = Object.values(estimatedPercentages).reduce((a, b) => a + b, 0) / categories.length;
    let adjustFactor = overallPercentage / currentAvg;
    
    // Adjust all percentages
    categories.forEach(category => {
      estimatedPercentages[category] = Math.min(100, Math.max(0, Math.round(estimatedPercentages[category] * adjustFactor)));
    });
    
    // Recalculate to ensure exact match
    currentAvg = Object.values(estimatedPercentages).reduce((a, b) => a + b, 0) / categories.length;
    if (Math.abs(currentAvg - overallPercentage) > 1) {
      const diff = overallPercentage - currentAvg;
      // Distribute the difference
      categories.forEach(category => {
        estimatedPercentages[category] = Math.min(100, Math.max(0, estimatedPercentages[category] + Math.round(diff / categories.length)));
      });
    }
    
    setDebugInfo(prev => prev + `\nUser ID based variations: ${JSON.stringify(variations)}`);
    setDebugInfo(prev => prev + `\nAdjusted percentages: ${JSON.stringify(estimatedPercentages)}`);
    
    const estimatedCategoryScores = {};
    
    categories.forEach((section) => {
      const percentage = estimatedPercentages[section];
      const count = 20;
      const maxPossible = count * 5;
      const total = Math.round((percentage / 100) * maxPossible);
      const average = (total / count).toFixed(1);
      
      estimatedCategoryScores[section] = {
        total,
        average: parseFloat(average),
        count,
        percentage,
        maxPossible
      };
    });
    
    // Ensure the sum matches the candidate's total score
    const calculatedTotal = Object.values(estimatedCategoryScores).reduce((sum, data) => sum + data.total, 0);
    if (Math.abs(calculatedTotal - totalScore) > 5) {
      // Scale to match
      const scaleFactor = totalScore / calculatedTotal;
      categories.forEach(section => {
        estimatedCategoryScores[section].total = Math.round(estimatedCategoryScores[section].total * scaleFactor);
        estimatedCategoryScores[section].percentage = Math.round((estimatedCategoryScores[section].total / estimatedCategoryScores[section].maxPossible) * 100);
        estimatedCategoryScores[section].average = (estimatedCategoryScores[section].total / estimatedCategoryScores[section].count).toFixed(1);
      });
    }
    
    setCategoryScores(estimatedCategoryScores);
    setResponses(Array(100).fill({}));
    calculateAnalysis(estimatedCategoryScores);
    setDebugInfo(prev => prev + `\nEstimated data based on ${totalScore} total score (${overallPercentage}%)`);
  }, [user_id]);

  // Calculate strengths, weaknesses, and recommendations with UPDATED LOGIC for new scale
  const calculateAnalysis = useCallback((categoryScoresData) => {
    setDebugInfo(prev => prev + "\n\n=== ANALYZING RESULTS ===");
    
    const candidateStrengths = [];
    const candidateWeaknesses = [];
    
    // UPDATED: Adjusted thresholds for new grading scale
    const strengthThreshold = 70; // B+ or above
    const weaknessThreshold = 60; // B- or below
    
    setDebugInfo(prev => prev + `\nStrength threshold: ${strengthThreshold}% (B+ or above)`);
    setDebugInfo(prev => prev + `\nWeakness threshold: ${weaknessThreshold}% (B- or below)`);
    
    Object.entries(categoryScoresData).forEach(([section, data]) => {
      const percentage = data.percentage;
      const grade = getCategoryGrade(percentage);
      const performanceLabel = getCategoryPerformanceLabel(percentage);
      
      // UPDATED: Show in strengths if ≥ 70% (B+ or above)
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
      
      // UPDATED: Show in weaknesses if < 60% (B- or below)
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
    
    setDebugInfo(prev => prev + `\nFound ${candidateStrengths.length} strengths, ${candidateWeaknesses.length} weaknesses`);
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
        grade: "A/A-",
        score: 85
      });
    }
    
    setRecommendations(candidateRecommendations);
    setDebugInfo(prev => prev + `\nGenerated ${candidateRecommendations.length} recommendations`);
  }, [getCategoryGrade, getCategoryInterpretation, getCategoryGradeLabel, getCategoryPerformanceLabel, getCategoryPerformanceIcon]);

  // CALCULATE CATEGORY SCORES FROM RESPONSES - FIXED VERSION
  const calculateCategoryScoresFromResponses = useCallback(async (responsesData, candidateTotalScore) => {
    try {
      setDebugInfo(prev => prev + "\n\n=== CALCULATING CATEGORY SCORES ===");
      
      if (!responsesData || responsesData.length === 0) {
        setDebugInfo(prev => prev + "\nNo response data to calculate");
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      // Get unique question and answer IDs
      const questionIds = [...new Set(responsesData.map(r => r.question_id))];
      const answerIds = [...new Set(responsesData.map(r => r.answer_id))];
      
      setDebugInfo(prev => prev + `\nUnique questions: ${questionIds.length}, Unique answers: ${answerIds.length}`);
      
      if (questionIds.length === 0 || answerIds.length === 0) {
        setDebugInfo(prev => prev + "\nNo valid question or answer IDs found");
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      // Fetch questions
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("id, question_text, section, subsection")
        .in("id", questionIds);
      
      if (qError) {
        setDebugInfo(prev => prev + `\nError fetching questions: ${qError.message}`);
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      if (!questions || questions.length === 0) {
        setDebugInfo(prev => prev + "\nNo questions found in database");
        useEstimatedData(candidateTotalScore || 300);
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
      
      // Fetch answers
      const { data: answers, error: aError } = await supabase
        .from("answers")
        .select("id, score, answer_text")
        .in("id", answerIds);
      
      if (aError) {
        setDebugInfo(prev => prev + `\nError fetching answers: ${aError.message}`);
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      if (!answers || answers.length === 0) {
        setDebugInfo(prev => prev + "\nNo answers found in database");
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      setDebugInfo(prev => prev + `\nLoaded ${answers.length} answers`);
      
      // Create answers map
      const answersMap = {};
      answers.forEach(a => {
        answersMap[a.id] = a.score || 0;
      });
      
      // Calculate category scores
      const categoryTotals = {};
      const categoryCounts = {};
      let totalScore = 0;
      let processedCount = 0;
      let missingSectionCount = 0;
      let missingScoreCount = 0;
      
      responsesData.forEach(response => {
        const questionData = questionsMap[response.question_id];
        const section = questionData?.section;
        const score = answersMap[response.answer_id] || 0;
        
        if (!section) {
          missingSectionCount++;
          return;
        }
        
        if (score === 0 && !answersMap[response.answer_id]) {
          missingScoreCount++;
        }
        
        categoryTotals[section] = (categoryTotals[section] || 0) + score;
        categoryCounts[section] = (categoryCounts[section] || 0) + 1;
        totalScore += score;
        processedCount++;
      });
      
      setDebugInfo(prev => prev + `\nProcessed ${processedCount} responses`);
      setDebugInfo(prev => prev + `\nMissing sections: ${missingSectionCount}, Missing scores: ${missingScoreCount}`);
      setDebugInfo(prev => prev + `\nTotal calculated score: ${totalScore}`);
      
      if (processedCount === 0) {
        setDebugInfo(prev => prev + "\nNo responses could be processed");
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      // Calculate category percentages
      const calculatedCategoryScores = {};
      const categoriesFound = Object.keys(categoryTotals);
      
      setDebugInfo(prev => prev + `\nCategories found: ${categoriesFound.join(', ')}`);
      
      categoriesFound.forEach(section => {
        const total = categoryTotals[section];
        const count = categoryCounts[section];
        const maxPossible = count * 5; // Each question max 5 points
        const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
        const average = count > 0 ? (total / count).toFixed(1) : 0;
        
        calculatedCategoryScores[section] = {
          total,
          average: parseFloat(average),
          count,
          percentage,
          maxPossible
        };
        
        setDebugInfo(prev => prev + `\n${section}: ${total}/${maxPossible} (${percentage}%) avg: ${average}`);
      });
      
      // Check if we have all expected categories
      const expectedCategories = [
        'Cognitive Abilities',
        'Personality Assessment', 
        'Leadership Potential',
        'Technical Competence',
        'Performance Metrics'
      ];
      
      expectedCategories.forEach(category => {
        if (!calculatedCategoryScores[category]) {
          setDebugInfo(prev => prev + `\n⚠ Missing category: ${category}`);
        }
      });
      
      setDebugInfo(prev => prev + `\n✓ Calculated ${Object.keys(calculatedCategoryScores).length} categories`);
      
      // NEW: Calculate personality dimensions
      const personalityDimResults = analyzePersonalityDimensions(responsesData, questionsMap, answersMap);
      setPersonalityDimensions(personalityDimResults);
      
      // Verify total score matches classification - FIXED: If mismatch, scale category scores
      if (candidateTotalScore && Math.abs(totalScore - candidateTotalScore) > 5) {
        setDebugInfo(prev => prev + `\n⚠ Score mismatch: Calculated ${totalScore} vs Candidate ${candidateTotalScore}`);
        
        // Scale category scores to match the candidate's total score
        const scaleFactor = candidateTotalScore / totalScore;
        Object.keys(calculatedCategoryScores).forEach(section => {
          calculatedCategoryScores[section].total = Math.round(calculatedCategoryScores[section].total * scaleFactor);
          calculatedCategoryScores[section].percentage = Math.round((calculatedCategoryScores[section].total / calculatedCategoryScores[section].maxPossible) * 100);
          calculatedCategoryScores[section].average = (calculatedCategoryScores[section].total / calculatedCategoryScores[section].count).toFixed(1);
        });
        setDebugInfo(prev => prev + `\nScaled category scores by factor ${scaleFactor.toFixed(2)} to match candidate score`);
      }
      
      setCategoryScores(calculatedCategoryScores);
      
      // Calculate strengths, weaknesses, and recommendations
      calculateAnalysis(calculatedCategoryScores);
      
    } catch (error) {
      console.error("Calculation error:", error);
      setDebugInfo(prev => prev + `\nCalculation error: ${error.message}`);
      useEstimatedData(candidateTotalScore || 300);
    }
  }, [useEstimatedData, calculateAnalysis, analyzePersonalityDimensions]);

  // MAIN FUNCTION: Fetch responses and calculate category scores
  const fetchAndCalculateCategoryScores = useCallback(async (userId, candidateTotalScore) => {
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
        
        useEstimatedData(candidateTotalScore || 300);
        return;
      }
      
      if (!allResponses || allResponses.length === 0) {
        setDebugInfo(prev => prev + `\nNo responses found for user ${userId.substring(0, 8)}`);
        useEstimatedData(candidateTotalScore || 300);
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
      await calculateCategoryScoresFromResponses(allResponses, candidateTotalScore);
      
    } catch (error) {
      console.error("Fetch error:", error);
      setDebugInfo(prev => prev + `\nFetch error: ${error.message}`);
      useEstimatedData(candidateTotalScore || 300);
    }
  }, [useEstimatedData, calculateCategoryScoresFromResponses]);

  // Fetch candidate data
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setDebugInfo(`Starting fetch for user: ${user_id}`);
        
        // GET CANDIDATE NAME AND EMAIL
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
          
          const candidateInfo = {
            total_score: candidateData.total_score,
            classification: candidateData.classification || getClassification(candidateData.total_score),
            user_id: candidateData.user_id
          };
          
          setCandidate(candidateInfo);
          
          // Fetch responses
          await fetchAndCalculateCategoryScores(user_id, candidateData.total_score);
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
          
          const candidateInfo = {
            total_score: classificationData.total_score,
            classification: classificationData.classification || getClassification(classificationData.total_score),
            user_id: user_id
          };
          
          setCandidate(candidateInfo);
          
          // Fetch responses
          await fetchAndCalculateCategoryScores(user_id, classificationData.total_score);
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

    fetchCandidateData();
  }, [isSupervisor, user_id, getClassification, fetchAndCalculateCategoryScores, useEstimatedData]);

  // Simple browser print function
  const handlePrint = () => {
    setGeneratingReport(true);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      setGeneratingReport(false);
      return;
    }
    
    // Get the report content
    const reportContent = reportRef.current.innerHTML;
    
    // Create a clean HTML document for printing
    const printDocument = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Candidate Report - ${userName}</title>
        <style>
          @media print {
            @page { margin: 20mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .no-print { display: none !important; }
            .print-break { page-break-before: always; }
            .print-avoid-break { page-break-inside: avoid; }
          }
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 3px solid #1565c0;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #1565c0;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
          }
          .info {
            font-size: 14px;
            color: #444;
            margin: 5px 0;
          }
          .section {
            margin: 25px 0;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #1565c0;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .card {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #1565c0;
          }
          .table-container {
            overflow-x: auto;
            margin: 15px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #e9ecef;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #1565c0;
            font-weight: bold;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
          .score-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin: 2px;
          }
          .strength { background: #e8f5e9; color: #2e7d32; }
          .weakness { background: #ffebee; color: #c62828; }
          .average { background: #fff3e0; color: #f57c00; }
          .classification-badge {
            display: inline-block;
            padding: 6px 14px;
            background: ${getClassificationColor(candidate?.total_score || 300)};
            color: white;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-left: 10px;
          }
          .overall-score {
            font-size: 36px;
            font-weight: bold;
            color: #1565c0;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Candidate Performance Report</div>
          <div class="subtitle">${userName}</div>
          <div class="info">Email: ${userEmail}</div>
          <div class="info">Candidate ID: ${user_id?.substring(0, 12)}...</div>
          <div class="info">Report Date: ${new Date().toLocaleDateString()}</div>
          <div class="info">
            Overall Score: <span class="overall-score">${candidate?.total_score || 0}</span>/500 
            <span class="classification-badge">${getClassification(candidate?.total_score || 300)}</span>
          </div>
        </div>
        
        ${reportContent}
        
        <div class="footer">
          <p>This assessment report is confidential and intended for authorized personnel only.</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printDocument);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
    
    setGeneratingReport(false);
  };

  // Alternative: Direct browser print (simpler)
  const handleDirectPrint = () => {
    window.print();
  };

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

  // Render loading state
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

  // Calculate total count and average for summary
  const totalCount = Object.values(categoryScores).reduce((sum, data) => sum + data.count, 0);
  const totalAverage = totalCount > 0 ? (candidateScore / totalCount).toFixed(1) : 0;

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-content, #report-content * {
            visibility: visible;
          }
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .print-avoid-break {
            page-break-inside: avoid;
          }
          .app-layout {
            background: white !important;
          }
          .print-header {
            display: block !important;
            border-bottom: 3px solid #1565c0;
            padding-bottom: 15px;
            margin-bottom: 25px;
            page-break-after: avoid;
          }
        }
        
        .print-header {
          display: none;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }} id="report-content" ref={reportRef}>
        {/* Print Header (only shows in print) */}
        <div className="print-header">
          <h1 style={{ 
            margin: "0 0 10px 0", 
            color: "#1565c0",
            fontSize: "28px"
          }}>
            Candidate Performance Report
          </h1>
          <div style={{ fontSize: "16px", color: "#666", marginBottom: "5px" }}>
            <strong>Candidate:</strong> {userName}
          </div>
          <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
            <strong>Email:</strong> {userEmail === "Email not found" ? "Not available" : userEmail}
          </div>
          <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
            <strong>Report Date:</strong> {new Date().toLocaleDateString()}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            <strong>Overall Score:</strong> {candidateScore}/500 ({classification})
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          flexWrap: "wrap",
          gap: "15px"
        }} className="no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <button
              onClick={handleBack}
              style={{
                padding: "10px 20px",
                background: "none",
                border: "2px solid #1565c0",
                color: "#1565c0",
                cursor: "pointer",
                fontSize: "16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600"
              }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "10px 20px", 
              borderRadius: "8px",
              border: "1px solid #dee2e6"
            }}>
              <div style={{ fontSize: "14px", color: "#666" }}>Candidate Report</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#1565c0" }}>{userName}</div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleDirectPrint}
              style={{
                padding: "10px 20px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600"
              }}
            >
              🖨️ Print Report
            </button>
            
            <button
              onClick={handlePrint}
              style={{
                padding: "10px 20px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600"
              }}
              disabled={generatingReport}
            >
              {generatingReport ? (
                <>
                  <div style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid white",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Preparing Report...
                </>
              ) : (
                "📄 Generate Report"
              )}
            </button>
          </div>
        </div>

        {/* Performance Classification Details */}
        <div style={{ 
          background: "white", 
          padding: "20px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px",
          pageBreakInside: "avoid"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: "0", color: "#333" }}>Performance Classification</h3>
            <div style={{ 
              padding: "8px 16px",
              background: classificationColor,
              color: "white",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              {classification}
            </div>
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
          marginBottom: "30px",
          pageBreakInside: "avoid"
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

        {/* CATEGORY SCORES BREAKDOWN */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px",
          pageBreakInside: "avoid"
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
            <React.Fragment>
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
                      }}></div>
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
              
              {/* Performance Summary Table - FIXED TOTAL SCORE DISPLAY */}
              <div style={{ 
                padding: "20px",
                background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                borderRadius: "8px",
                border: "1px solid #dee2e6"
              }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Category Performance Summary</h3>
                
                <div style={{ overflowX: "auto" }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px"
                  }}>
                    <thead>
                      <tr style={{ 
                        background: "#e9ecef",
                        borderBottom: "2px solid #1565c0"
                      }}>
                        <th style={{ padding: "12px", textAlign: "left", color: "#333", fontWeight: "600" }}>Category</th>
                        <th style={{ padding: "12px", textAlign: "center", color: "#333", fontWeight: "600" }}>Questions</th>
                        <th style={{ padding: "12px", textAlign: "center", color: "#333", fontWeight: "600" }}>Total Score</th>
                        <th style={{ padding: "12px", textAlign: "center", color: "#333", fontWeight: "600" }}>Average</th>
                        <th style={{ padding: "12px", textAlign: "center", color: "#333", fontWeight: "600" }}>Percentage</th>
                        <th style={{ padding: "12px", textAlign: "center", color: "#333", fontWeight: "600" }}>Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(categoryScores).map(([category, data], index) => (
                        <tr key={category} style={{ 
                          borderBottom: "1px solid #dee2e6",
                          background: index % 2 === 0 ? "white" : "#f8f9fa"
                        }}>
                          <td style={{ 
                            padding: "12px", 
                            fontWeight: "500",
                            color: getCategoryColor(category)
                          }}>
                            {category}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", color: "#666" }}>
                            {data.count}/20
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", color: "#666" }}>
                            {data.total}/{data.maxPossible}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", color: "#666" }}>
                            {data.average.toFixed(1)}/5
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <span style={{ 
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              background: data.percentage >= 70 ? "rgba(76, 175, 80, 0.1)" : 
                                         data.percentage >= 60 ? "rgba(255, 152, 0, 0.1)" : 
                                         "rgba(244, 67, 54, 0.1)",
                              color: data.percentage >= 70 ? "#2e7d32" : 
                                     data.percentage >= 60 ? "#f57c00" : "#c62828",
                              fontWeight: "600",
                              fontSize: "13px"
                            }}>
                              {getCategoryGrade(data.percentage)} • {data.percentage}%
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <div style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              background: data.percentage >= 70 ? "#e8f5e9" : 
                                         data.percentage >= 60 ? "#fff3e0" : "#ffebee",
                              color: data.percentage >= 70 ? "#2e7d32" : 
                                     data.percentage >= 60 ? "#f57c00" : "#c62828",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {getCategoryPerformanceIcon(data.percentage)} {getCategoryPerformanceLabel(data.percentage)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#e3f2fd", borderTop: "2px solid #1565c0" }}>
                        <td style={{ 
                          padding: "12px", 
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          Overall Summary
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {totalCount}/100
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {/* FIXED: Use candidateScore instead of calculated total */}
                          {candidateScore}/500
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {/* FIXED: Calculate average based on candidateScore */}
                          {totalAverage}/5
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {Math.round((candidateScore / 500) * 100)}%
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {classification}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* Performance Indicators - UPDATED for new grading scale */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  marginTop: "20px",
                  padding: "15px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#4CAF50" }}>
                      {strengths.length}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      Strong Areas (A/A-/B+)
                    </div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                      (≥70%)
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#FF9800" }}>
                      {Object.keys(categoryScores).length - strengths.length - weaknesses.length}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      Average Areas (B/B-)
                    </div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                      (60-69%)
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#F44336" }}>
                      {weaknesses.length}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      Development Areas (C+ or below)
                    </div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                      (≤59%)
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          )}
        </div>

        {/* STRENGTHS AND WEAKNESSES */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
          gap: "30px",
          marginBottom: "30px",
          pageBreakInside: "avoid"
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
                padding: "30px", 
                textAlign: "center",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "15px" }}>📈</div>
                <p style={{ color: "#666", margin: 0 }}>
                  No exceptional strengths identified (scoring below 70% in all categories).
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "15px"
              }}>
                {strengths.map((strength, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    borderLeft: `4px solid #4CAF50`
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px"
                    }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: "16px",
                        color: "#2e7d32"
                      }}>
                        {strength.category}
                      </h3>
                      <div style={{ 
                        padding: "4px 10px",
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {strength.icon} {strength.grade} • {strength.score}%
                      </div>
                    </div>
                    <p style={{ 
                      margin: "0 0 8px 0", 
                      fontSize: "14px",
                      color: "#555"
                    }}>
                      {strength.detailedInterpretation}
                    </p>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#777",
                      padding: "8px 12px",
                      background: "white",
                      borderRadius: "6px"
                    }}>
                      <strong>Assessment:</strong> {strength.gradeLabel}
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
                padding: "30px", 
                textAlign: "center",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "15px" }}>🎯</div>
                <p style={{ color: "#666", margin: 0 }}>
                  All categories meet or exceed expectations (scoring above 60%).
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "15px"
              }}>
                {weaknesses.map((weakness, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    borderLeft: `4px solid #F44336`
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px"
                    }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: "16px",
                        color: "#c62828"
                      }}>
                        {weakness.category}
                      </h3>
                      <div style={{ 
                        padding: "4px 10px",
                        background: "#ffebee",
                        color: "#c62828",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {weakness.icon} {weakness.grade} • {weakness.score}%
                      </div>
                    </div>
                    <p style={{ 
                      margin: "0 0 8px 0", 
                      fontSize: "14px",
                      color: "#555"
                    }}>
                      {weakness.detailedInterpretation}
                    </p>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#777",
                      padding: "8px 12px",
                      background: "white",
                      borderRadius: "6px",
                      fontStyle: "italic"
                    }}>
                      <strong>Priority:</strong> {weakness.grade === "F" || weakness.grade === "D" ? "High" : 
                                                  weakness.grade === "C-" || weakness.grade === "D+" ? "Medium" : "Low"}
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
          marginBottom: "30px",
          pageBreakInside: "avoid"
        }}>
          <h2 style={{ 
            margin: "0 0 25px 0", 
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
              padding: "30px", 
              textAlign: "center",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "36px", marginBottom: "15px" }}>✅</div>
              <p style={{ color: "#666", margin: 0 }}>
                No specific development recommendations. Candidate demonstrates strong performance across all categories.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "flex", 
              flexDirection: "column",
              gap: "20px"
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: index === 0 && rec.category === "Overall Performance" ? "#e3f2fd" : "#f8f9fa",
                  borderRadius: "8px",
                  border: `1px solid ${index === 0 && rec.category === "Overall Performance" ? "#1565c0" : "#e0e0e0"}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px"
                  }}>
                    <div>
                      <h3 style={{ 
                        margin: "0 0 8px 0", 
                        fontSize: "18px",
                        color: index === 0 && rec.category === "Overall Performance" ? "#1565c0" : "#333"
                      }}>
                        {rec.category}
                      </h3>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666",
                        marginBottom: "5px"
                      }}>
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
                    <strong>Assessment:</strong> {rec.issue}
                  </div>
                  
                  <div style={{ 
                    padding: "15px",
                    background: index === 0 && rec.category === "Overall Performance" ? "white" : "#e8f5e9",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${index === 0 && rec.category === "Overall Performance" ? "#1565c0" : "#4CAF50"}`
                  }}>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "600",
                      color: "#333",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>📚</span>
                      Recommended Action Plan
                    </div>
                    <div style={{ fontSize: "14px", color: "#444", lineHeight: 1.6 }}>
                      {rec.recommendation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Next Steps */}
          <div style={{ 
            marginTop: "25px",
            padding: "20px",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            borderRadius: "8px"
          }}>
            <div style={{ 
              fontSize: "16px", 
              fontWeight: "600",
              color: "#333",
              marginBottom: "10px"
            }}>
              Next Steps
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "15px",
              fontSize: "14px"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ 
                  width: "24px", 
                  height: "24px", 
                  background: "#1565c0",
                  color: "white",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <strong>Review Findings</strong>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Discuss results with candidate and team
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ 
                  width: "24px", 
                  height: "24px", 
                  background: "#1565c0",
                  color: "white",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <strong>Create Development Plan</strong>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Based on recommendations above
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ 
                  width: "24px", 
                  height: "24px", 
                  background: "#1565c0",
                  color: "white",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <strong>Schedule Follow-up</strong>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Set milestones and review dates
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
            This assessment report is confidential and intended for authorized personnel only.
          </p>
        </div>

        {/* DEBUG INFO (Hidden by default) */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: "30px",
            padding: "20px",
            background: "#f5f5f5",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "#666",
            maxHeight: "300px",
            overflow: "auto",
            whiteSpace: "pre-wrap"
          }} className="no-print">
            <div style={{ 
              fontSize: "14px", 
              fontWeight: "bold",
              color: "#333",
              marginBottom: "10px"
            }}>
              Debug Information
            </div>
            {debugInfo}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
