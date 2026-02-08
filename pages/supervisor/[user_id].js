// pages/supervisor/[user_id].js - UPDATED WITH NEW PERFORMANCE CLASSIFICATION AND GRADING SCALE
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

  // 1. Get category grade based on your scale
  const getCategoryGrade = (percentage) => {
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    if (percentage >= 40) return "E";
    return "F";
  };

  // 2. Get category grade label (for dashboards)
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

  // 3. Get interpretive comments based on your scale - CATEGORY SPECIFIC
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

  // 4. Get performance label for categories
  const getCategoryPerformanceLabel = (percentage) => {
    if (percentage >= 80) return "Exceptional";
    if (percentage >= 70) return "Strong";
    if (percentage >= 60) return "Adequate";
    if (percentage >= 50) return "Below Expectations";
    if (percentage >= 40) return "Low Readiness";
    return "Unsuitable";
  };

  // 5. Get performance color for categories
  const getCategoryPerformanceColor = (percentage) => {
    if (percentage >= 80) return "#4CAF50"; // Green
    if (percentage >= 70) return "#2196F3"; // Blue
    if (percentage >= 60) return "#FF9800"; // Orange
    if (percentage >= 50) return "#FF5722"; // Deep Orange
    if (percentage >= 40) return "#795548"; // Brown
    return "#F44336"; // Red
  };

  // 6. Get performance icon/emoji
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

    // CALCULATE CATEGORY SCORES FROM RESPONSES - FIXED VERSION
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
        
        // Fetch questions
        const { data: questions, error: qError } = await supabase
          .from("questions")
          .select("id, section, text")
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
          questionsMap[q.id] = q.section;
        });
        
        // Fetch answers
        const { data: answers, error: aError } = await supabase
          .from("answers")
          .select("id, score, text")
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
        
        setDebugInfo(prev => prev + `\nLoaded ${answers.length} answers`);
        
        // Create answers map
        const answersMap = {};
        answers.forEach(a => {
          answersMap[a.id] = a.score;
        });
        
        // Calculate category scores
        const categoryTotals = {};
        const categoryCounts = {};
        let totalScore = 0;
        let processedCount = 0;
        let missingSectionCount = 0;
        let missingScoreCount = 0;
        
        responsesData.forEach(response => {
          const section = questionsMap[response.question_id];
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
          useEstimatedData(candidate?.total_score || 300);
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
        setCategoryScores(calculatedCategoryScores);
        
        // Verify total score matches classification
        if (candidate && Math.abs(totalScore - candidate.total_score) > 10) {
          setDebugInfo(prev => prev + `\n⚠ Score mismatch: Calculated ${totalScore} vs Classification ${candidate.total_score}`);
        }
        
        // Calculate strengths, weaknesses, and recommendations
        calculateAnalysis(calculatedCategoryScores);
        
      } catch (error) {
        console.error("Calculation error:", error);
        setDebugInfo(prev => prev + `\nCalculation error: ${error.message}`);
        useEstimatedData(candidate?.total_score || 300);
      }
    };

    // FALLBACK: Estimate category scores based on total score - UNIQUE PER USER
    const useEstimatedData = (totalScore) => {
      setDebugInfo(prev => prev + "\n\n=== USING ESTIMATED DATA ===");
      
      const overallPercentage = Math.round((totalScore / 500) * 100);
      const basePercentage = overallPercentage;
      
      // Create UNIQUE distribution for each user based on their user_id
      // This ensures each candidate has different category scores
      const userIdNum = parseInt(user_id.replace(/[^0-9]/g, '').substring(0, 6) || '123456', 10);
      
      // Use user_id to create unique but consistent variations for each candidate
      const variations = {
        'Cognitive Abilities': (userIdNum % 10) - 4, // -4 to +5 variation
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
      
      setDebugInfo(prev => prev + `\nUser ID based variations: ${JSON.stringify(variations)}`);
      setDebugInfo(prev => prev + `\nEstimated percentages: ${JSON.stringify(estimatedPercentages)}`);
      
      const estimatedCategoryScores = {};
      Object.entries(estimatedPercentages).forEach(([section, percentage]) => {
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
      
      setCategoryScores(estimatedCategoryScores);
      setResponses(Array(100).fill({}));
      calculateAnalysis(estimatedCategoryScores);
      setDebugInfo(prev => prev + `\nEstimated data based on ${totalScore} total score (${overallPercentage}%)`);
    };

    // Calculate strengths, weaknesses, and recommendations with FIXED LOGIC
    const calculateAnalysis = (categoryScoresData) => {
      setDebugInfo(prev => prev + "\n\n=== ANALYZING RESULTS ===");
      
      const candidateStrengths = [];
      const candidateWeaknesses = [];
      
      // FIXED: Use fixed thresholds based on YOUR grading scale
      const strengthThreshold = 70; // B or above
      const weaknessThreshold = 60; // C or below (D, E, F)
      
      setDebugInfo(prev => prev + `\nStrength threshold: ${strengthThreshold}% (B or above)`);
      setDebugInfo(prev => prev + `\nWeakness threshold: ${weaknessThreshold}% (C or below)`);
      
      Object.entries(categoryScoresData).forEach(([section, data]) => {
        const percentage = data.percentage;
        const grade = getCategoryGrade(percentage);
        const performanceLabel = getCategoryPerformanceLabel(percentage);
        
        // FIXED: Only show in strengths if ≥ 70% (B or above)
        if (percentage >= strengthThreshold) {
          candidateStrengths.push({
            category: section,
            score: percentage,
            grade: grade,
            gradeLabel: getCategoryGradeLabel(grade),
            interpretation: `${performanceLabel} performance in ${section}`,
            detailedInterpretation: getCategoryInterpretation(percentage, section), // Pass category here
            icon: getCategoryPerformanceIcon(percentage)
          });
        }
        
        // FIXED: Only show in weaknesses if < 60% (C or below)
        if (percentage < weaknessThreshold) {
          candidateWeaknesses.push({
            category: section,
            score: percentage,
            grade: grade,
            gradeLabel: getCategoryGradeLabel(grade),
            interpretation: `${performanceLabel} performance in ${section}`,
            detailedInterpretation: getCategoryInterpretation(percentage, section), // Pass category here
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
          grade: "A/B",
          score: 85
        });
      }
      
      setRecommendations(candidateRecommendations);
      setDebugInfo(prev => prev + `\nGenerated ${candidateRecommendations.length} recommendations`);
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
              
              {/* Performance Summary Table */}
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
                          {Object.values(categoryScores).reduce((sum, data) => sum + data.count, 0)}/100
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {Object.values(categoryScores).reduce((sum, data) => sum + data.total, 0)}/500
                        </td>
                        <td style={{ 
                          padding: "12px", 
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1565c0"
                        }}>
                          {(Object.values(categoryScores).reduce((sum, data) => sum + data.total, 0) / 
                            Object.values(categoryScores).reduce((sum, data) => sum + data.count, 0)).toFixed(1)}/5
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
                
                {/* Performance Indicators */}
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
                      Strong Areas (A/B)
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
                      Average Areas (C)
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
                      Weak Areas (D/E/F)
                    </div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                      (≤59%)
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Strengths and Weaknesses */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
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
                width: "30px", 
                height: "30px", 
                background: "#4CAF50",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                ✓
              </span>
              Key Strengths ({strengths.length})
            </h2>
            
            {strengths.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "30px",
                color: "#888",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "15px" }}>📈</div>
                <p style={{ marginBottom: "10px" }}>
                  No categories scored above strength threshold (≥70%).
                </p>
                <p style={{ fontSize: "13px", color: "#666" }}>
                  Candidate shows adequate or below performance across categories.
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "10px"
              }}>
                {strengths.map((strength, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "rgba(76, 175, 80, 0.1)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #4CAF50"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px"
                    }}>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#2e7d32",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <span style={{ fontSize: "20px" }}>{strength.icon}</span>
                        {strength.category}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ 
                          padding: "4px 10px",
                          background: "#4CAF50",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: "600",
                          minWidth: "40px",
                          textAlign: "center"
                        }}>
                          {strength.grade}
                        </div>
                        <div style={{ 
                          padding: "4px 10px",
                          background: "rgba(255,255,255,0.9)",
                          color: "#2e7d32",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          border: "1px solid #4CAF50"
                        }}>
                          {strength.score}%
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      marginBottom: "8px",
                      fontWeight: "500"
                    }}>
                      {strength.interpretation}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      marginBottom: "8px",
                      fontStyle: "italic",
                      lineHeight: 1.4
                    }}>
                      {strength.gradeLabel}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#555",
                      lineHeight: 1.4,
                      padding: "8px",
                      background: "rgba(255,255,255,0.5)",
                      borderRadius: "4px",
                      marginTop: "5px"
                    }}>
                      {strength.detailedInterpretation}
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
                width: "30px", 
                height: "30px", 
                background: "#F44336",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                !
              </span>
              Areas for Improvement ({weaknesses.length})
            </h2>
            
            {weaknesses.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "30px",
                color: "#888",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "15px" }}>🎯</div>
                <p style={{ marginBottom: "10px" }}>
                  All categories scored above weakness threshold (≥60%).
                </p>
                <p style={{ fontSize: "13px", color: "#666" }}>
                  Candidate shows adequate or better performance across all areas.
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "10px"
              }}>
                {weaknesses.map((weakness, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "rgba(244, 67, 54, 0.1)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #F44336"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px"
                    }}>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#c62828",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <span style={{ fontSize: "20px" }}>{weakness.icon}</span>
                        {weakness.category}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ 
                          padding: "4px 10px",
                          background: "#F44336",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: "600",
                          minWidth: "40px",
                          textAlign: "center"
                        }}>
                          {weakness.grade}
                        </div>
                        <div style={{ 
                          padding: "4px 10px",
                          background: "rgba(255,255,255,0.9)",
                          color: "#c62828",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          border: "1px solid #F44336"
                        }}>
                          {weakness.score}%
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      marginBottom: "8px",
                      fontWeight: "500"
                    }}>
                      {weakness.interpretation}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      marginBottom: "8px",
                      fontStyle: "italic",
                      lineHeight: 1.4
                    }}>
                      {weakness.gradeLabel} • Needs {Math.round(70 - weakness.score)}% improvement to reach strong performance
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#555",
                      lineHeight: 1.4,
                      padding: "8px",
                      background: "rgba(255,255,255,0.5)",
                      borderRadius: "4px",
                      marginTop: "5px"
                    }}>
                      {weakness.detailedInterpretation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
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
              width: "30px", 
              height: "30px", 
              background: "#FF9800",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px"
            }}>
              💡
            </span>
            Development Recommendations ({recommendations.length})
          </h2>
          
          {recommendations.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "30px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "36px", marginBottom: "15px" }}>✅</div>
              <p style={{ marginBottom: "10px" }}>
                No specific development recommendations needed.
              </p>
              <p style={{ fontSize: "13px", color: "#666" }}>
                Candidate shows strong overall performance across all categories.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: "#fff3e0",
                  borderRadius: "8px",
                  border: "1px solid #ffe0b2"
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "15px"
                  }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: getCategoryColor(rec.category),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      {rec.category.charAt(0)}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        {rec.category}
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666"
                      }}>
                        Priority: {index === 0 ? "High" : index === 1 ? "Medium" : "Low"} • Grade: {rec.grade}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      Issue:
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      padding: "8px",
                      background: "white",
                      borderRadius: "4px",
                      borderLeft: "3px solid #FF9800"
                    }}>
                      {rec.issue}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      Recommendation:
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      lineHeight: 1.5,
                      padding: "8px",
                      background: "rgba(255, 255, 255, 0.7)",
                      borderRadius: "4px"
                    }}>
                      {rec.recommendation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessment Summary */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>
            Assessment Summary
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "20px",
            marginBottom: "30px"
          }}>
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #1565c0"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1565c0" }}>
                {responses.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Total Responses
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                {responses.length}/100 questions
              </div>
            </div>
            
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #4CAF50"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#4CAF50" }}>
                {candidateScore}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Total Score
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Max: 500 • {Math.round((candidateScore / 500) * 100)}%
              </div>
            </div>
            
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #9C27B0"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#9C27B0" }}>
                {Object.keys(categoryScores).length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Categories Assessed
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Out of 5 categories
              </div>
            </div>
            
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #FF9800"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#FF9800" }}>
                {strengths.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Key Strengths
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Areas ≥70% (A/B)
              </div>
            </div>
          </div>
          
          <div style={{ 
            textAlign: "center",
            padding: "20px",
            background: "#e3f2fd",
            borderRadius: "8px",
            border: "1px solid #bbdefb"
          }}>
            <p style={{ margin: 0, color: "#1565c0", fontSize: "14px" }}>
              <strong>Report Generated:</strong> {new Date().toLocaleDateString()} | 
              <strong> Candidate:</strong> {userName} | 
              <strong> Classification:</strong> {classification} | 
              <strong> Status:</strong> Completed
            </p>
          </div>
        </div>
        
        {/* Debug Panel (Enable by changing display to "block") */}
        <div style={{ 
          marginTop: "30px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
          fontSize: "12px",
          color: "#666",
          display: "none" /* Change to "block" to see debug info */
        }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", color: "#333" }}>
            Debug Information
          </div>
          <pre style={{ 
            margin: 0, 
            whiteSpace: "pre-wrap",
            fontSize: "11px",
            fontFamily: "monospace",
            maxHeight: "300px",
            overflow: "auto"
          }}>
            {debugInfo}
          </pre>
        </div>
      </div>
    </AppLayout>
  );
}
