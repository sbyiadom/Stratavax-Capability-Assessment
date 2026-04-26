import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from 'next/dynamic';
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateStratavaxReport } from "../../utils/stratavaxReportGenerator";
import { assessmentTypes, getAssessmentType } from "../../utils/assessmentConfigs";
import { generateCommentary, generateStrengthsSummary, generateWeaknessesSummary, generateProfileCommentary } from "../../utils/commentaryEngine";
import { generateUniversalInterpretation } from "../../utils/categoryMapper";
import { generateSuperAnalysis } from "../../utils/super-analyzer";
import BehavioralInsights from "../../components/BehavioralInsights";

const CandidateReport = dynamic(
  () => Promise.resolve(CandidateReportComponent),
  { ssr: false }
);

function CandidateReportComponent() {
  const router = useRouter();
  const { user_id } = router.query;
  const reportRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stratavaxReport, setStratavaxReport] = useState(null);
  const [assessmentTypeName, setAssessmentTypeName] = useState('');
  const [competencyData, setCompetencyData] = useState([]);
  const [competencyInterpretation, setCompetencyInterpretation] = useState(null);
  const [superAnalysis, setSuperAnalysis] = useState(null);
  const [behavioralData, setBehavioralData] = useState(null);
  const [detailedCategoryAnalysis, setDetailedCategoryAnalysis] = useState({});
  const [isInvalidResult, setIsInvalidResult] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');
  const [questionResponses, setQuestionResponses] = useState([]); // For multiple-select display

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = localStorage.getItem("userSession");
        if (!userSession) {
          router.push("/login");
          return;
        }
        const session = JSON.parse(userSession);
        if (session.loggedIn) {
          setIsSupervisor(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authChecked || !isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: profileData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        const candidateInfo = {
          id: user_id,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        };
        setCandidate(candidateInfo);

        // Fetch all valid assessment results (include manufacturing_baseline)
        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsData && resultsData.length > 0) {
          const resultsWithAssessments = [];
          for (const result of resultsData) {
            // Skip invalid results if flagged (but keep for display with warning)
            // We still show them but with invalid banner
            
            const { data: assessment } = await supabase
              .from('assessments')
              .select('*, assessment_type:assessment_types(*)')
              .eq('id', result.assessment_id)
              .single();
            if (assessment) {
              resultsWithAssessments.push({ ...result, assessment });
            }
          }
          if (resultsWithAssessments.length > 0) {
            setAllAssessments(resultsWithAssessments);
            await loadAssessmentData(resultsWithAssessments[0], candidateInfo);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [authChecked, isSupervisor, user_id]);

  // Helper function to check if question has multiple correct answers
  const isMultipleCorrectQuestion = (questionId, responses) => {
    const response = responses.find(r => r.question_id === questionId);
    if (!response || !response.answer_id) return false;
    // If answer_id is a string containing commas, it's multiple answers
    return typeof response.answer_id === 'string' && response.answer_id.includes(',');
  };

  // Helper to get selected answer texts for a question
  const getSelectedAnswerTexts = (questionId, responses, answersMap) => {
    const response = responses.find(r => r.question_id === questionId);
    if (!response || !response.answer_id) return [];
    
    let answerIds = [];
    if (typeof response.answer_id === 'string' && response.answer_id.includes(',')) {
      answerIds = response.answer_id.split(',').map(id => parseInt(id, 10));
    } else {
      answerIds = [parseInt(response.answer_id, 10)];
    }
    
    return answerIds.map(id => answersMap[id]?.answer_text || `Answer ${id}`).filter(Boolean);
  };

  const extractCompetencyData = (categoryScores, assessmentTypeId, candidateName, overallPercentage) => {
    if (!categoryScores || Object.keys(categoryScores).length === 0) {
      return { competencies: [], interpretation: null };
    }

    const competencies = Object.entries(categoryScores).map(([category, data], index) => {
      const percentage = data.percentage || 0;
      let classification = 'Needs Development';
      if (percentage >= 80) classification = 'Strong';
      else if (percentage >= 55) classification = 'Moderate';
      
      return {
        id: `comp-${index}`,
        competencies: { name: category, category: assessmentTypeId || 'General' },
        percentage: percentage,
        raw_score: data.score || data.total || 0,
        max_possible: data.maxPossible || 100,
        question_count: data.count || 1,
        classification: classification,
        gap: Math.max(0, 80 - percentage),
        narrative: generateCommentary(category, percentage, classification === 'Strong' ? 'strength' : classification === 'Moderate' ? 'neutral' : 'weakness')
      };
    });

    competencies.sort((a, b) => b.percentage - a.percentage);
    return { competencies, interpretation: null };
  };

  // Helper function to calculate behavioral metrics from responses
  const calculateBehavioralFromResponses = (responses) => {
    if (!responses || responses.length === 0) {
      return getFallbackBehavioralData(responses);
    }
    
    const times = responses.map(r => r.time_spent_seconds).filter(t => t && t > 0);
    const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 30;
    const fastestTime = times.length > 0 ? Math.min(...times) : 5;
    const slowestTime = times.length > 0 ? Math.max(...times) : 60;
    const totalTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) : responses.length * 30;
    
    const totalChanges = responses.reduce((sum, r) => sum + (r.times_changed || 0), 0);
    const revisitRate = responses.length > 0 ? Math.round((totalChanges / responses.length) * 100) : 0;
    
    let firstInstinctAccuracy = 0;
    const responsesWithInitial = responses.filter(r => r.initial_answer_id);
    if (responsesWithInitial.length > 0) {
      const unchanged = responsesWithInitial.filter(r => r.initial_answer_id === r.answer_id).length;
      firstInstinctAccuracy = Math.round((unchanged / responsesWithInitial.length) * 100);
    }
    
    let fatigueFactor = 0;
    if (times.length >= 4) {
      const midPoint = Math.floor(times.length / 2);
      const firstHalf = times.slice(0, midPoint);
      const secondHalf = times.slice(midPoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      fatigueFactor = Math.round(secondAvg - firstAvg);
    }
    
    let workStyle = 'Balanced';
    if (avgTime < 15 && totalChanges < 3) workStyle = 'Quick Decision Maker';
    else if (avgTime > 45 && totalChanges > 5) workStyle = 'Methodical Analyst';
    else if (totalChanges > 8) workStyle = 'Anxious Reviser';
    else if (totalChanges > 3) workStyle = 'Strategic Reviewer';
    else if (avgTime < 25) workStyle = 'Fast-paced / Decisive';
    else if (avgTime > 50) workStyle = 'Methodical / Deliberate';
    
    let confidenceLevel = 'Moderate';
    if (avgTime < 20 && totalChanges < 2) confidenceLevel = 'High';
    else if (totalChanges > 5) confidenceLevel = 'Low';
    
    let decisionPattern = 'Deliberate';
    if (avgTime < 20) decisionPattern = 'Quick / Intuitive';
    else if (avgTime > 50) decisionPattern = 'Thorough / Analytical';
    
    return {
      work_style: workStyle,
      confidence_level: confidenceLevel,
      attention_span: fatigueFactor > 30 ? 'Declining (Fatigue Detected)' : fatigueFactor < -10 ? 'Improving (Warms Up)' : 'Consistent',
      decision_pattern: decisionPattern,
      avg_response_time: avgTime,
      fastest_response: fastestTime,
      slowest_response: slowestTime,
      total_time_spent: totalTime,
      total_answer_changes: totalChanges,
      question_revisit_rate: revisitRate,
      first_instinct_accuracy: firstInstinctAccuracy,
      improvement_rate: 50,
      fatigue_factor: fatigueFactor,
      recommended_support: getRecommendedSupport(workStyle, avgTime, totalChanges),
      development_focus_areas: getDevelopmentFocusAreas(workStyle, fatigueFactor)
    };
  };

  const getFallbackBehavioralData = (responses = []) => {
    const questionCount = responses.length || 10;
    
    return {
      work_style: 'Balanced',
      confidence_level: 'Moderate',
      attention_span: 'Consistent',
      decision_pattern: 'Deliberate',
      avg_response_time: 30,
      fastest_response: 10,
      slowest_response: 60,
      total_time_spent: questionCount * 30,
      total_answer_changes: 0,
      question_revisit_rate: 0,
      first_instinct_accuracy: null,
      improvement_rate: 0,
      fatigue_factor: 0,
      recommended_support: 'Continue to monitor performance patterns. Provide balanced support with regular check-ins.',
      development_focus_areas: ['Consistent performance', 'Regular feedback', 'Progress monitoring']
    };
  };

  const getRecommendedSupport = (workStyle, avgTime, totalChanges) => {
    switch (workStyle) {
      case 'Quick Decision Maker':
        return 'Encourage reviewing answers before submitting. Provide time management guidance to balance speed with accuracy.';
      case 'Methodical Analyst':
        return 'Provide clear time expectations. Consider extended time if needed for complex assessments. Leverage their thoroughness.';
      case 'Anxious Reviser':
        return 'Build confidence through practice assessments. Provide positive reinforcement. Consider reducing time pressure.';
      case 'Strategic Reviewer':
        return 'Leverage their thoroughness. Suggest flagging difficult questions for review rather than revisiting all questions.';
      default:
        return 'Provide balanced support with regular check-ins on progress. Continue to monitor performance patterns.';
    }
  };

  const getDevelopmentFocusAreas = (workStyle, fatigueFactor) => {
    const areas = ['Consistent performance', 'Regular feedback'];
    
    if (workStyle === 'Quick Decision Maker') {
      areas.push('Review habits', 'Quality verification');
    } else if (workStyle === 'Methodical Analyst') {
      areas.push('Time management', 'Efficiency techniques');
    } else if (workStyle === 'Anxious Reviser') {
      areas.push('Confidence building', 'Trusting first instincts');
    } else if (workStyle === 'Strategic Reviewer') {
      areas.push('Question flagging', 'Efficient review strategies');
    }
    
    if (fatigueFactor > 30) {
      areas.push('Break management', 'Fatigue prevention');
    }
    
    return [...new Set(areas)];
  };

  const loadAssessmentData = async (result, candidateInfo) => {
    try {
      console.log("📊 Loading assessment data for result:", result.id);
      
      // Check if result is invalid
      if (result.is_valid === false) {
        console.log("⚠️ This assessment result is invalid:", result.validation_note);
        setIsInvalidResult(true);
        setInvalidReason(result.validation_note || 'This assessment was auto-submitted due to rule violations and is not considered valid.');
      } else {
        setIsInvalidResult(false);
        setInvalidReason('');
      }
      
      // Fetch responses with question and answer details
      const { data: responsesData } = await supabase
        .from('responses')
        .select(`*, unique_questions!inner (id, section, subsection, question_text), unique_answers!inner (id, answer_text, score)`)
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id);
      
      setQuestionResponses(responsesData || []);
      
      // Build answers map for display
      const answersMap = {};
      if (responsesData) {
        responsesData.forEach(r => {
          if (r.unique_answers) {
            answersMap[r.unique_answers.id] = r.unique_answers;
          }
        });
      }

      const assessmentTypeId = result.assessment?.assessment_type?.code || result.assessment_type || 'general';
      const config = getAssessmentType(assessmentTypeId);
      setAssessmentTypeName(config.name);

      const report = generateStratavaxReport(user_id, assessmentTypeId, responsesData || [], candidateInfo.full_name, result.completed_at);
      setStratavaxReport(report);

      const detailedAnalysis = {};
      if (result.category_scores) {
        Object.entries(result.category_scores).forEach(([category, data]) => {
          const percentage = data.percentage || 0;
          detailedAnalysis[category] = {
            score: data.score || data.total || 0,
            maxPossible: data.maxPossible || 100,
            percentage: percentage,
            grade: getGradeFromPercentage(percentage),
            narrative: generateCommentary(category, percentage, percentage >= 70 ? 'strength' : percentage < 55 ? 'weakness' : 'neutral'),
            recommendation: getDevelopmentRecommendation(category, percentage),
            gap: Math.max(0, 80 - percentage)
          };
        });
        setDetailedCategoryAnalysis(detailedAnalysis);
        
        const { competencies } = extractCompetencyData(result.category_scores, assessmentTypeId, candidateInfo.full_name, report.percentageScore);
        setCompetencyData(competencies);
        
        try {
          const analysis = generateSuperAnalysis(candidateInfo.full_name, assessmentTypeId, responsesData || [], result.category_scores, result.total_score, result.max_score);
          setSuperAnalysis(analysis);
        } catch (e) { console.error(e); }
      }

      // ===== BEHAVIORAL DATA FETCHING =====
      console.log("🔍 Fetching behavioral data for user:", user_id, "assessment:", result.assessment_id);
      
      let behavioralInsightsData = null;
      
      // Strategy 1: Try to get from behavioral_metrics table
      const { data: behavioralMetricsData, error: metricsError } = await supabase
        .from('behavioral_metrics')
        .select('*')
        .eq('user_id', user_id)
        .eq('assessment_id', result.assessment_id)
        .maybeSingle();
      
      if (behavioralMetricsData && !metricsError) {
        console.log("✅ Found behavioral metrics in dedicated table");
        behavioralInsightsData = {
          work_style: behavioralMetricsData.work_style || 'Balanced',
          confidence_level: behavioralMetricsData.confidence_level || 'Moderate',
          attention_span: behavioralMetricsData.attention_span || 'Consistent',
          decision_pattern: behavioralMetricsData.decision_pattern || 'Deliberate',
          avg_response_time: behavioralMetricsData.avg_response_time_seconds,
          fastest_response: behavioralMetricsData.fastest_response_seconds,
          slowest_response: behavioralMetricsData.slowest_response_seconds,
          total_time_spent: behavioralMetricsData.total_time_spent_seconds,
          total_answer_changes: behavioralMetricsData.total_answer_changes || 0,
          question_revisit_rate: behavioralMetricsData.revisit_rate || 0,
          first_instinct_accuracy: behavioralMetricsData.first_instinct_accuracy || 0,
          improvement_rate: behavioralMetricsData.improvement_rate || 0,
          fatigue_factor: behavioralMetricsData.fatigue_factor || 0,
          recommended_support: behavioralMetricsData.recommended_support || '',
          development_focus_areas: behavioralMetricsData.development_focus_areas || []
        };
      }
      
      // Strategy 2: Try from interpretations field
      if (!behavioralInsightsData && result.interpretations?.behavioralInsights) {
        console.log("⚠️ Found behavioral insights in interpretations field");
        const insights = result.interpretations.behavioralInsights;
        behavioralInsightsData = {
          work_style: insights.work_style || 'Balanced',
          confidence_level: insights.confidence_level || 'Moderate',
          attention_span: insights.attention_span || 'Consistent',
          decision_pattern: insights.decision_pattern || 'Deliberate',
          avg_response_time: insights.avg_response_time || insights.avg_response_time_seconds,
          fastest_response: insights.fastest_response || insights.fastest_response_seconds,
          slowest_response: insights.slowest_response || insights.slowest_response_seconds,
          total_time_spent: insights.total_time_spent || insights.total_time_spent_seconds,
          total_answer_changes: insights.total_answer_changes || 0,
          question_revisit_rate: insights.question_revisit_rate || insights.revisit_rate || 0,
          first_instinct_accuracy: insights.first_instinct_accuracy || 0,
          improvement_rate: insights.improvement_rate || 0,
          fatigue_factor: insights.fatigue_factor || 0,
          recommended_support: insights.recommended_support || '',
          development_focus_areas: insights.development_focus_areas || []
        };
      }
      
      // Strategy 3: Calculate from responses table directly
      if (!behavioralInsightsData && responsesData && responsesData.length > 0) {
        console.log("🔄 Calculating behavioral insights directly from responses");
        behavioralInsightsData = calculateBehavioralFromResponses(responsesData);
      }
      
      // Strategy 4: Use fallback defaults
      if (!behavioralInsightsData) {
        console.log("⚠️ No behavioral data found, using fallback values");
        behavioralInsightsData = getFallbackBehavioralData(responsesData);
      }
      
      // Add invalid flag to behavioral data if needed
      if (result.is_valid === false) {
        behavioralInsightsData.is_valid = false;
        behavioralInsightsData.validation_note = result.validation_note;
      }
      
      setBehavioralData(behavioralInsightsData);
      console.log("✅ Behavioral data loaded:", {
        work_style: behavioralInsightsData.work_style,
        confidence_level: behavioralInsightsData.confidence_level,
        total_answer_changes: behavioralInsightsData.total_answer_changes,
        avg_response_time: behavioralInsightsData.avg_response_time
      });

      setSelectedAssessment({
        id: result.id,
        assessment_id: result.assessment_id,
        assessment_type: assessmentTypeId,
        assessment_name: config.name,
        total_score: result.total_score,
        max_score: result.max_score,
        percentage: report.percentageScore,
        completed_at: result.completed_at,
        category_scores: result.category_scores || {},
        config: config,
        report: report,
        interpretations: result.interpretations,
        is_valid: result.is_valid !== false,
        validation_note: result.validation_note
      });
    } catch (error) {
      console.error("Error loading assessment data:", error);
    }
  };

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return { letter: 'A+', color: '#2E7D32', bg: '#E8F5E9', description: 'Exceptional' };
    if (percentage >= 80) return { letter: 'A', color: '#4CAF50', bg: '#E8F5E9', description: 'Excellent' };
    if (percentage >= 70) return { letter: 'B', color: '#2196F3', bg: '#E3F2FD', description: 'Good' };
    if (percentage >= 60) return { letter: 'C', color: '#FF9800', bg: '#FFF3E0', description: 'Developing' };
    if (percentage >= 50) return { letter: 'D', color: '#F57C00', bg: '#FFF3E0', description: 'Below Average' };
    return { letter: 'F', color: '#F44336', bg: '#FFEBEE', description: 'Needs Improvement' };
  };

  const getDevelopmentRecommendation = (category, percentage) => {
    if (percentage >= 80) {
      return `Continue to leverage ${category} as a key strength. Consider mentoring others in this area.`;
    } else if (percentage >= 70) {
      return `Build on your solid foundation in ${category}. Focus on advanced applications and real-world practice.`;
    } else if (percentage >= 60) {
      return `Targeted development in ${category} will yield significant improvement. Focus on core concepts and structured practice.`;
    } else if (percentage >= 50) {
      return `${category} requires focused attention. Start with foundational training and work with a mentor to build competence.`;
    } else {
      return `${category} is a critical priority. Immediate intervention needed with structured learning plan and close supervision.`;
    }
  };

  const getActionablePlan = (category, percentage) => {
    const gap = 80 - percentage;
    if (gap <= 0) {
      return [
        `Lead a project utilizing ${category} skills`,
        `Mentor 2-3 colleagues in ${category}`,
        `Create a training resource on ${category} best practices`,
        `Take on a stretch assignment requiring advanced ${category}`
      ];
    } else if (gap <= 20) {
      return [
        `Complete an intermediate course in ${category} (4-6 weeks)`,
        `Practice ${category} skills in low-stakes environments`,
        `Seek feedback from a mentor on ${category} application`,
        `Review case studies related to ${category}`
      ];
    } else if (gap <= 30) {
      return [
        `Enroll in a foundational ${category} training program (6-8 weeks)`,
        `Work with a mentor on weekly ${category} exercises`,
        `Set weekly goals for ${category} improvement`,
        `Complete online modules and practice exercises`
      ];
    } else {
      return [
        `Complete intensive ${category} fundamentals course (8-12 weeks)`,
        `Schedule weekly coaching sessions focused on ${category}`,
        `Create a daily practice routine for ${category}`,
        `Shadow an expert and document learning`,
        `Complete a structured development plan with weekly check-ins`
      ];
    }
  };

  const handleAssessmentChange = async (e) => {
    const selected = allAssessments.find(a => a.id === e.target.value);
    if (selected && candidate) {
      setLoading(true);
      await loadAssessmentData(selected, candidate);
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // Get assessment-specific theme color
  const getAssessmentThemeColor = () => {
    if (selectedAssessment?.assessment_type === 'manufacturing_baseline') {
      return '#2E7D32'; // Green for manufacturing baseline
    }
    const percentage = selectedAssessment?.percentage || 0;
    return percentage >= 80 ? '#2E7D32' : percentage >= 60 ? '#1565C0' : percentage >= 40 ? '#F57C00' : '#C62828';
  };

  // Get integrated executive summary with behavioral insights
  const getIntegratedExecutiveSummary = () => {
    if (!stratavaxReport || !stratavaxReport.stratavaxReport || !stratavaxReport.stratavaxReport.executiveSummary) {
      return "Loading assessment data...";
    }
    
    const reportData = stratavaxReport.stratavaxReport;
    const performanceText = reportData.executiveSummary.narrative.includes('General Assessment') 
      ? reportData.executiveSummary.narrative.replace('General Assessment', assessmentDisplayName)
      : reportData.executiveSummary.narrative;
    
    let behavioralText = '';
    if (behavioralData && !behavioralData.is_valid === false) {
      behavioralText = ` The candidate's ${behavioralData.work_style || 'balanced'} work style, ${behavioralData.confidence_level || 'moderate'} confidence level, and ${behavioralData.decision_pattern || 'deliberate'} decision pattern provide additional context. `;
      if (behavioralData.avg_response_time) {
        behavioralText += `With an average response time of ${behavioralData.avg_response_time} seconds `;
        if (behavioralData.total_answer_changes > 0) {
          behavioralText += `and ${behavioralData.total_answer_changes} answer change${behavioralData.total_answer_changes !== 1 ? 's' : ''} (${behavioralData.question_revisit_rate || 0}% revisit rate), `;
        }
        if (behavioralData.first_instinct_accuracy && behavioralData.first_instinct_accuracy > 80) {
          behavioralText += `their first instinct accuracy is ${behavioralData.first_instinct_accuracy}%, suggesting trusting initial responses could improve efficiency.`;
        } else if (behavioralData.improvement_rate && behavioralData.improvement_rate > 70) {
          behavioralText += `they demonstrate strong adaptability, learning from mistakes effectively (${behavioralData.improvement_rate}% improvement rate).`;
        } else if (behavioralData.fatigue_factor && behavioralData.fatigue_factor > 30) {
          behavioralText += `some fatigue was detected in the second half (${behavioralData.fatigue_factor}s slower), suggesting shorter sessions or breaks may help.`;
        } else {
          behavioralText += `they show a methodical approach, carefully considering each question.`;
        }
      } else {
        behavioralText += `Their response patterns suggest a thoughtful approach to the assessment.`;
      }
    }
    
    return performanceText + behavioralText;
  };

  if (!authChecked || loading) {
    return (
      <div style={stylesModern.loadingContainer}>
        <div style={stylesModern.spinner} />
        <p style={stylesModern.loadingText}>Loading assessment report...</p>
      </div>
    );
  }

  if (!candidate || !selectedAssessment || !stratavaxReport) {
    return (
      <div style={stylesModern.emptyContainer}>
        <div style={stylesModern.emptyIcon}>📊</div>
        <h3 style={stylesModern.emptyTitle}>No Assessment Data Available</h3>
        <p style={stylesModern.emptyText}>This candidate hasn't completed any valid assessments yet.</p>
        <Link href="/supervisor" style={stylesModern.backButton}>← Back to Dashboard</Link>
      </div>
    );
  }

  const report = selectedAssessment.report.stratavaxReport;
  const assessmentDisplayName = selectedAssessment.assessment_name || 'Assessment';
  const themeColor = getAssessmentThemeColor();
  const percentageColor = themeColor;
  const isValidResult = selectedAssessment.is_valid !== false;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'breakdown', label: 'Score Breakdown', icon: '📊' },
    { id: 'competencies', label: 'Competencies', icon: '🎯' },
    ...(behavioralData && behavioralData.work_style !== 'Assessment Invalid' ? [{ id: 'behavioral', label: 'Behavioral Insights', icon: '🧠' }] : []),
    { id: 'recommendations', label: 'Recommendations', icon: '💡' },
    { id: 'development', label: 'Development Plan', icon: '📅' },
    ...(superAnalysis ? [{ id: 'super', label: 'Super Analysis', icon: '🔮' }] : []),
    { id: 'responses', label: 'Question Responses', icon: '📝' } // New tab for detailed responses
  ];

  return (
    <div style={stylesModern.pageContainer}>
      {/* Animated Gradient Header with assessment-specific color */}
      <div style={{...stylesModern.animatedHeader, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)`}}>
        <div style={stylesModern.headerContent}>
          <div style={stylesModern.headerLeft}>
            <Link href="/supervisor" style={stylesModern.dashboardLink}>← Dashboard</Link>
            <div style={stylesModern.logo}>STRATAVAX</div>
          </div>
          <div style={stylesModern.headerRight}>
            {allAssessments.length > 1 && (
              <select value={selectedAssessment.id} onChange={handleAssessmentChange} style={stylesModern.assessmentSelect}>
                {allAssessments.map((a, index) => {
                  const type = a.assessment?.assessment_type?.code || a.assessment_type || 'general';
                  const config = getAssessmentType(type);
                  return <option key={a.id} value={a.id}>{config.name} - {new Date(a.completed_at).toLocaleDateString()}</option>;
                })}
              </select>
            )}
            <button onClick={handlePrint} style={stylesModern.printButton}>🖨️ Print Report</button>
          </div>
        </div>
      </div>

      {/* Hero Section with Theme Color */}
      <div style={{...stylesModern.hero, background: `linear-gradient(135deg, ${themeColor}08 0%, ${themeColor}04 100%)`}}>
        <div style={stylesModern.heroContent}>
          <div style={stylesModern.candidateInfo}>
            <div style={{...stylesModern.candidateAvatar, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`}}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 style={stylesModern.candidateName}>{candidate.full_name}</h1>
              <p style={stylesModern.assessmentMeta}>{assessmentDisplayName} • Completed {new Date(selectedAssessment.completed_at).toLocaleDateString()}</p>
              {superAnalysis && <p style={stylesModern.profileId}>Profile ID: {superAnalysis.profileId}</p>}
            </div>
          </div>
          <div style={{...stylesModern.scoreCard, background: `linear-gradient(135deg, ${themeColor}10, white)`}}>
            <div style={stylesModern.scoreCircle}>
              <span style={{...stylesModern.scoreValue, color: themeColor}}>{selectedAssessment.percentage}%</span>
              <span style={stylesModern.scoreLabel}>Overall Score</span>
            </div>
            <div style={stylesModern.scoreDetails}>
              <div style={stylesModern.scoreDetailItem}>
                <span style={stylesModern.scoreDetailLabel}>Score</span>
                <span style={stylesModern.scoreDetailValue}>{selectedAssessment.total_score}/{selectedAssessment.max_score}</span>
              </div>
              <div style={stylesModern.scoreDetailItem}>
                <span style={stylesModern.scoreDetailLabel}>Grade</span>
                <span style={stylesModern.scoreDetailValue}>{report.executiveSummary.grade}</span>
              </div>
              <div style={stylesModern.scoreDetailItem}>
                <span style={stylesModern.scoreDetailLabel}>Classification</span>
                <span style={{...stylesModern.classificationBadge, background: `${themeColor}15`, color: themeColor}}>
                  {report.executiveSummary.classification}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invalid Result Warning Banner */}
      {!isValidResult && (
        <div style={{
          maxWidth: '1200px',
          margin: '20px auto 0',
          padding: '0 24px'
        }}>
          <div style={{
            background: '#FFF3E0',
            borderLeft: '4px solid #F44336',
            padding: '16px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <strong style={{ color: '#C62828' }}>Invalid Assessment Result</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#E65100' }}>
                {selectedAssessment.validation_note || 'This assessment was auto-submitted due to rule violations and is not considered valid.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={stylesModern.tabsContainer}>
        <div style={stylesModern.tabsWrapper}>
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              style={{
                ...stylesModern.tab, 
                ...(activeTab === tab.id ? {...stylesModern.tabActive, borderBottomColor: themeColor, color: themeColor} : {})
              }}
            >
              <span style={stylesModern.tabIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && <span style={{...stylesModern.tabIndicator, background: themeColor}} />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={stylesModern.mainContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={stylesModern.contentCard}>
            <div style={stylesModern.executiveSummarySection}>
              <h2 style={stylesModern.sectionTitle}>Executive Summary</h2>
              <div style={{...stylesModern.narrativeBox, borderLeftColor: themeColor}}>
                <p style={stylesModern.executiveText}>{getIntegratedExecutiveSummary()}</p>
                <p style={stylesModern.executiveDesc}>{report.executiveSummary.classificationDescription}</p>
              </div>
            </div>

            <div style={stylesModern.statsGrid}>
              <div style={{...stylesModern.statCard, background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)'}}>
                <span style={stylesModern.statIcon}>🎯</span>
                <div>
                  <div style={stylesModern.statValue}>{competencyData.filter(c => c.percentage >= 70).length}</div>
                  <div style={stylesModern.statLabel}>Strengths</div>
                </div>
              </div>
              <div style={{...stylesModern.statCard, background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)'}}>
                <span style={stylesModern.statIcon}>📈</span>
                <div>
                  <div style={stylesModern.statValue}>{competencyData.filter(c => c.percentage >= 55 && c.percentage < 70).length}</div>
                  <div style={stylesModern.statLabel}>Developing</div>
                </div>
              </div>
              <div style={{...stylesModern.statCard, background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)'}}>
                <span style={stylesModern.statIcon}>⚠️</span>
                <div>
                  <div style={stylesModern.statValue}>{competencyData.filter(c => c.percentage < 55).length}</div>
                  <div style={stylesModern.statLabel}>Needs Work</div>
                </div>
              </div>
              {behavioralData && behavioralData.work_style !== 'Assessment Invalid' && (
                <div style={{...stylesModern.statCard, background: 'linear-gradient(135deg, #F3E5F5, #E1BEE7)'}}>
                  <span style={stylesModern.statIcon}>🧠</span>
                  <div>
                    <div style={stylesModern.statValue}>{behavioralData.work_style?.split(' ')[0] || 'Balanced'}</div>
                    <div style={stylesModern.statLabel}>Work Style</div>
                  </div>
                </div>
              )}
            </div>

            {behavioralData && behavioralData.work_style !== 'Assessment Invalid' && (
              <div style={{...stylesModern.insightCard, background: `linear-gradient(135deg, ${themeColor}10, white)`, borderLeft: `4px solid ${themeColor}`}}>
                <div style={stylesModern.insightCardHeader}>
                  <span style={stylesModern.insightCardIcon}>💡</span>
                  <h4 style={stylesModern.insightCardTitle}>Performance & Behavior Correlation</h4>
                </div>
                <p style={stylesModern.insightCardText}>
                  {candidate.full_name} achieved {selectedAssessment.percentage}% overall score with a {behavioralData.work_style?.toLowerCase() || 'balanced'} approach.
                  {behavioralData.confidence_level === 'High' && ' Their high confidence aligns well with their performance, indicating self-assurance in their knowledge.'}
                  {behavioralData.confidence_level === 'Low' && ' Despite their performance, confidence appears low, suggesting potential imposter syndrome or anxiety that may benefit from support.'}
                  {behavioralData.total_answer_changes > 5 && ` With ${behavioralData.total_answer_changes} answer changes, they demonstrate thorough review habits.`}
                  {behavioralData.first_instinct_accuracy > 80 && ` Their first instinct accuracy of ${behavioralData.first_instinct_accuracy}% suggests trusting initial responses could improve efficiency.`}
                </p>
              </div>
            )}

            <div style={stylesModern.strengthsSection}>
              <h3 style={stylesModern.subsectionTitle}>🔷 Key Strengths</h3>
              <div style={stylesModern.strengthsGrid}>
                {competencyData.filter(c => c.percentage >= 70).slice(0, 4).map((comp, idx) => (
                  <div key={idx} style={{...stylesModern.strengthItem, background: 'linear-gradient(135deg, #F0F9F0, #E8F5E9)'}}>
                    <div style={stylesModern.strengthHeader}>
                      <span style={stylesModern.strengthName}>{comp.competencies.name}</span>
                      <span style={stylesModern.strengthScore}>{comp.percentage}%</span>
                    </div>
                    <div style={stylesModern.strengthBar}><div style={{width: `${comp.percentage}%`, height: '6px', background: '#4CAF50', borderRadius: '3px'}} /></div>
                    <p style={stylesModern.strengthNarrative}>{comp.narrative}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={stylesModern.weaknessesSection}>
              <h3 style={stylesModern.subsectionTitle}>⚠️ Development Areas</h3>
              <div style={stylesModern.weaknessesGrid}>
                {competencyData.filter(c => c.percentage < 60).slice(0, 4).map((comp, idx) => (
                  <div key={idx} style={{...stylesModern.weaknessItem, background: 'linear-gradient(135deg, #FEF2F2, #FFEBEE)'}}>
                    <div style={stylesModern.weaknessHeader}>
                      <span style={stylesModern.weaknessName}>{comp.competencies.name}</span>
                      <span style={stylesModern.weaknessScore}>{comp.percentage}%</span>
                    </div>
                    <div style={stylesModern.weaknessBar}><div style={{width: `${comp.percentage}%`, height: '6px', background: '#F44336', borderRadius: '3px'}} /></div>
                    <p style={stylesModern.weaknessNarrative}>{comp.narrative}</p>
                    <div style={stylesModern.gapText}>Need {comp.gap}% more to reach target</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown Tab */}
        {activeTab === 'breakdown' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>Score Breakdown by Category</h2>
            <p style={stylesModern.sectionDesc}>Detailed analysis of performance across all categories</p>
            
            <div style={stylesModern.tableContainer}>
              <table style={stylesModern.dataTable}>
                <thead>
                  <tr style={stylesModern.tableHeaderRow}>
                    <th style={stylesModern.tableHeader}>Category</th>
                    <th style={stylesModern.tableHeader}>Score</th>
                    <th style={stylesModern.tableHeader}>Percentage</th>
                    <th style={stylesModern.tableHeader}>Grade</th>
                    <th style={stylesModern.tableHeader}>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.scoreBreakdown.map((item, idx) => {
                    const gradeInfo = getGradeFromPercentage(item.percentage);
                    return (
                      <tr key={idx} style={stylesModern.tableRow}>
                        <td style={stylesModern.tableCell}><strong>{item.category}</strong></td>
                        <td style={stylesModern.tableCell}>{item.score}</td>
                        <td style={stylesModern.tableCell}>
                          <div style={stylesModern.tableProgressContainer}>
                            <div style={{...stylesModern.tableProgressBar, width: `${item.percentage}%`, background: gradeInfo.color}} />
                            <span style={stylesModern.tableProgressText}>{item.percentage}%</span>
                          </div>
                        </td>
                        <td style={stylesModern.tableCell}>
                          <span style={{...stylesModern.gradeBadge, background: `${gradeInfo.color}15`, color: gradeInfo.color}}>
                            {gradeInfo.letter} - {gradeInfo.description}
                          </span>
                        </td>
                        <td style={stylesModern.tableCell}>{item.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={stylesModern.detailedAnalysisSection}>
              <h3 style={stylesModern.subsectionTitle}>📖 Detailed Category Analysis</h3>
              <p style={stylesModern.sectionDesc}>Each score tells a story about the candidate's capabilities</p>
              
              <div style={stylesModern.analysisGrid}>
                {Object.entries(detailedCategoryAnalysis).map(([category, data]) => {
                  const gradeInfo = data.grade;
                  return (
                    <div key={category} style={{...stylesModern.analysisCard, borderTop: `4px solid ${gradeInfo.color}`, background: `linear-gradient(135deg, white, ${gradeInfo.color}05)`}}>
                      <div style={stylesModern.analysisHeader}>
                        <div>
                          <span style={stylesModern.analysisCategory}>{category}</span>
                          <span style={{...stylesModern.analysisGrade, background: gradeInfo.bg, color: gradeInfo.color}}>
                            {gradeInfo.letter} - {gradeInfo.description}
                          </span>
                        </div>
                        <div style={stylesModern.analysisScore}>
                          <span style={{...stylesModern.analysisScoreValue, color: gradeInfo.color}}>{data.percentage}%</span>
                          <span style={stylesModern.analysisScoreLabel}>{data.score}/{data.maxPossible}</span>
                        </div>
                      </div>
                      <div style={stylesModern.analysisProgress}>
                        <div style={{width: `${data.percentage}%`, height: '8px', background: gradeInfo.color, borderRadius: '4px'}} />
                      </div>
                      <p style={stylesModern.analysisNarrative}>{data.narrative}</p>
                      <div style={stylesModern.analysisInsight}>
                        <span style={stylesModern.insightIcon}>💡</span>
                        <span style={stylesModern.insightText}>{data.recommendation}</span>
                      </div>
                      {data.gap > 0 && (
                        <div style={stylesModern.analysisGap}>
                          <span>📊 Gap to target: {data.gap}%</span>
                          <span>Target: 80%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Competencies Tab */}
        {activeTab === 'competencies' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>Competency Analysis</h2>
            <p style={stylesModern.sectionDesc}>Detailed breakdown of core competencies with narrative analysis</p>
            <div style={stylesModern.competenciesGrid}>
              {competencyData.map(comp => (
                <div key={comp.id} style={{...stylesModern.competencyCard, borderLeft: `4px solid ${comp.classification === 'Strong' ? '#4CAF50' : comp.classification === 'Moderate' ? '#FF9800' : '#F44336'}`, background: `linear-gradient(135deg, white, ${comp.classification === 'Strong' ? '#E8F5E9' : comp.classification === 'Moderate' ? '#FFF3E0' : '#FFEBEE'})`}}>
                  <div style={stylesModern.competencyHeader}>
                    <div>
                      <div style={stylesModern.competencyName}>{comp.competencies.name}</div>
                      <div style={stylesModern.competencyCategory}>{comp.competencies.category}</div>
                    </div>
                    <div style={stylesModern.competencyScore}>{comp.percentage}%</div>
                  </div>
                  <div style={stylesModern.competencyBar}><div style={{width: `${comp.percentage}%`, height: '6px', background: comp.classification === 'Strong' ? '#4CAF50' : comp.classification === 'Moderate' ? '#FF9800' : '#F44336', borderRadius: '3px'}} /></div>
                  <p style={stylesModern.competencyNarrative}>{comp.narrative}</p>
                  <div style={stylesModern.competencyTarget}>Target: 80% • Gap: {comp.gap}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behavioral Insights Tab */}
        {activeTab === 'behavioral' && behavioralData && behavioralData.work_style !== 'Assessment Invalid' && (
          <div style={stylesModern.contentCard}>
            <BehavioralInsights behavioralData={behavioralData} candidateName={candidate.full_name} />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>Development Recommendations</h2>
            <p style={stylesModern.sectionDesc}>Based on assessment results and behavioral patterns</p>
            <div style={stylesModern.recommendationsList}>
              {report.recommendations.map((rec, idx) => (
                <div key={idx} style={{...stylesModern.recommendationCard, borderLeft: `4px solid ${rec.priority === 'High' ? '#F44336' : rec.priority === 'Medium' ? '#FF9800' : '#4CAF50'}`, background: `linear-gradient(135deg, white, ${rec.priority === 'High' ? '#FEF2F2' : rec.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9'})`}}>
                  <div style={stylesModern.recommendationHeader}>
                    <span style={{...stylesModern.recommendationPriority, background: rec.priority === 'High' ? '#FEF2F2' : rec.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9', color: rec.priority === 'High' ? '#B91C1C' : rec.priority === 'Medium' ? '#F57C00' : '#2E7D32'}}>{rec.priority} Priority</span>
                    <span style={stylesModern.recommendationCategory}>{rec.category}</span>
                  </div>
                  <p style={stylesModern.recommendationText}>{rec.recommendation}</p>
                  <div style={stylesModern.recommendationAction}><strong>Action:</strong> {rec.action}</div>
                  <div style={stylesModern.recommendationImpact}><strong>Impact:</strong> {rec.impact}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Development Plan Tab */}
        {activeTab === 'development' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>📅 Personalized Development Plan</h2>
            <p style={stylesModern.sectionDesc}>A structured 90-day plan to help {candidate.full_name} improve in key areas</p>
            
            {competencyData.filter(c => c.percentage < 80).length > 0 ? (
              <>
                {competencyData.filter(c => c.percentage < 80).slice(0, 3).map((comp, idx) => {
                  const actions = getActionablePlan(comp.competencies.name, comp.percentage);
                  const priority = comp.percentage < 50 ? 'Critical' : comp.percentage < 65 ? 'High' : 'Medium';
                  const priorityColor = priority === 'Critical' ? '#F44336' : priority === 'High' ? '#FF9800' : '#2196F3';
                  
                  return (
                    <div key={idx} style={{...stylesModern.planCard, borderLeft: `4px solid ${priorityColor}`, background: `linear-gradient(135deg, white, ${priorityColor}05)`}}>
                      <div style={stylesModern.planHeader}>
                        <div>
                          <span style={stylesModern.planArea}>{comp.competencies.name}</span>
                          <span style={{...stylesModern.planPriority, background: `${priorityColor}15`, color: priorityColor}}>
                            {priority} Priority
                          </span>
                        </div>
                        <div style={stylesModern.planScore}>
                          <span>Current: {comp.percentage}%</span>
                          <span style={stylesModern.planArrow}>→</span>
                          <span style={stylesModern.planTarget}>Target: 80%</span>
                        </div>
                      </div>
                      
                      <div style={stylesModern.planGap}>
                        <div style={{width: `${(comp.percentage / 80) * 100}%`, height: '8px', background: priorityColor, borderRadius: '4px'}} />
                      </div>
                      
                      <div style={stylesModern.planTimeframe}>
                        <span>⏱️ Timeframe: {comp.percentage < 50 ? 'Week 1-4' : comp.percentage < 65 ? 'Week 1-6' : 'Week 1-8'}</span>
                        <span>Gap: {comp.gap}% to target</span>
                      </div>
                      
                      <div style={stylesModern.planActions}>
                        <h4 style={stylesModern.planActionsTitle}>📋 Action Items:</h4>
                        <ul style={stylesModern.planActionsList}>
                          {actions.map((action, actionIdx) => (
                            <li key={actionIdx} style={stylesModern.planActionItem}>✓ {action}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div style={stylesModern.planMilestones}>
                        <h4 style={stylesModern.planMilestonesTitle}>🎯 Milestones:</h4>
                        <div style={stylesModern.planMilestonesGrid}>
                          <div style={stylesModern.milestone}>
                            <span style={stylesModern.milestoneWeek}>Week 2</span>
                            <span>Complete initial assessment</span>
                          </div>
                          <div style={stylesModern.milestone}>
                            <span style={stylesModern.milestoneWeek}>Week 4</span>
                            <span>Demonstrate basic proficiency</span>
                          </div>
                          <div style={stylesModern.milestone}>
                            <span style={stylesModern.milestoneWeek}>Week 8</span>
                            <span>Apply in real scenarios</span>
                          </div>
                          <div style={stylesModern.milestone}>
                            <span style={stylesModern.milestoneWeek}>Week 12</span>
                            <span>Achieve target proficiency</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div style={stylesModern.planSummary}>
                  <h4 style={stylesModern.planSummaryTitle}>📌 Summary of Development Focus</h4>
                  <p>Based on the assessment results, {candidate.full_name} should focus on the following priority areas over the next 90 days:</p>
                  <ul>
                    {competencyData.filter(c => c.percentage < 80).slice(0, 3).map((comp, idx) => (
                      <li key={idx}><strong>{comp.competencies.name}:</strong> Improve from {comp.percentage}% to 80% (gap of {comp.gap}%)</li>
                    ))}
                  </ul>
                  <p style={stylesModern.planSummaryNote}>📅 Recommended check-in schedule: Every 2 weeks for first month, then monthly thereafter.</p>
                  <p style={stylesModern.planSummaryNote}>🎯 Success metric: Achieve 80% or higher in all priority areas within 90 days.</p>
                </div>
              </>
            ) : (
              <div style={stylesModern.noDevelopmentNeeded}>
                <div style={stylesModern.noDevIcon}>🏆</div>
                <h3 style={stylesModern.noDevTitle}>Excellent Performance!</h3>
                <p style={stylesModern.noDevText}>{candidate.full_name} has scored 80% or higher in all competency areas.</p>
                <p style={stylesModern.noDevSubtext}>While no immediate development is required, we recommend:</p>
                <ul style={stylesModern.noDevList}>
                  <li>Leverage strengths by mentoring others</li>
                  <li>Take on challenging projects to continue growth</li>
                  <li>Consider advanced certifications in areas of expertise</li>
                  <li>Share knowledge through team training sessions</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Super Analysis Tab */}
        {activeTab === 'super' && superAnalysis && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>🔮 Super Analysis</h2>
            <p style={stylesModern.sectionDesc}>Advanced 12-dimensional analysis combining competency, behavioral, and predictive insights</p>
            
            <div style={{...stylesModern.superOverview, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`}}>
              <div style={stylesModern.superHeader}>
                <span style={stylesModern.superIcon}>🌟</span>
                <div>
                  <h3 style={stylesModern.superTitle}>Candidate Profile Summary</h3>
                  <p style={stylesModern.superDesc}>{superAnalysis.summary.oneLine}</p>
                </div>
              </div>
              
              <div style={stylesModern.superStats}>
                <div style={stylesModern.superStat}>
                  <span style={stylesModern.superStatValue}>{superAnalysis.strengths.byScore.length}</span>
                  <span style={stylesModern.superStatLabel}>Strengths Identified</span>
                </div>
                <div style={stylesModern.superStat}>
                  <span style={stylesModern.superStatValue}>{superAnalysis.developmentAreas.byScore.length}</span>
                  <span style={stylesModern.superStatLabel}>Development Areas</span>
                </div>
                <div style={stylesModern.superStat}>
                  <span style={stylesModern.superStatValue}>{superAnalysis.patterns.crossCategory.length}</span>
                  <span style={stylesModern.superStatLabel}>Patterns Detected</span>
                </div>
                <div style={stylesModern.superStat}>
                  <span style={stylesModern.superStatValue}>{superAnalysis.differentiators.length}</span>
                  <span style={stylesModern.superStatLabel}>Differentiators</span>
                </div>
              </div>
            </div>

            {superAnalysis.patterns.crossCategory.length > 0 && (
              <div style={stylesModern.patternsSection}>
                <h4 style={stylesModern.patternsTitle}>🔍 Critical Patterns Detected</h4>
                {superAnalysis.patterns.crossCategory.map((pattern, idx) => (
                  <div key={idx} style={{...stylesModern.patternCard, borderLeft: `4px solid ${pattern.severity === 'Critical' ? '#F44336' : pattern.severity === 'High' ? '#FF9800' : '#2196F3'}`}}>
                    <div style={stylesModern.patternHeader}>
                      <span style={stylesModern.patternName}>{pattern.name}</span>
                      <span style={{...stylesModern.patternSeverity, background: pattern.severity === 'Critical' ? '#FEF2F2' : pattern.severity === 'High' ? '#FFF3E0' : '#E3F2FD', color: pattern.severity === 'Critical' ? '#B91C1C' : pattern.severity === 'High' ? '#F57C00' : '#1565C0'}}>{pattern.severity}</span>
                    </div>
                    <p style={stylesModern.patternDescription}>{pattern.description}</p>
                    <div style={stylesModern.patternRecommendation}>
                      <span>💡</span>
                      <span>{pattern.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {superAnalysis.differentiators.length > 0 && (
              <div style={stylesModern.differentiatorsSection}>
                <h4 style={stylesModern.differentiatorsTitle}>🏆 Competitive Differentiators</h4>
                <div style={stylesModern.differentiatorsGrid}>
                  {superAnalysis.differentiators.map((diff, idx) => (
                    <div key={idx} style={stylesModern.differentiatorCard}>
                      <span style={stylesModern.diffScore}>{diff.score}%</span>
                      <div style={stylesModern.diffContent}>
                        <span style={stylesModern.diffName}>{diff.differentiator}</span>
                        <p style={stylesModern.diffValue}>{diff.value}</p>
                        <p style={stylesModern.diffApplication}>{diff.application}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {superAnalysis.predictiveInsights.length > 0 && (
              <div style={stylesModern.predictiveSection}>
                <h4 style={stylesModern.predictiveTitle}>🔮 Predictive Performance Insights</h4>
                {superAnalysis.predictiveInsights.map((insight, idx) => (
                  <div key={idx} style={{...stylesModern.predictiveCard, borderLeft: `4px solid ${insight.type === 'Risk' ? '#F44336' : insight.type === 'Opportunity' ? '#4CAF50' : '#FF9800'}`}}>
                    <div style={stylesModern.predictiveHeader}>
                      <span style={stylesModern.predictiveType}>{insight.type}</span>
                      <span style={stylesModern.predictiveProbability}>Probability: {insight.probability}</span>
                    </div>
                    <p style={stylesModern.predictiveText}>{insight.insight}</p>
                    <p style={stylesModern.predictiveImpact}>Impact: {insight.impact}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={stylesModern.readinessSection}>
              <h4 style={stylesModern.readinessTitle}>🎯 Role Readiness Assessment</h4>
              <div style={stylesModern.readinessGrid}>
                <div style={stylesModern.readinessCard}>
                  <span style={stylesModern.readinessIcon}>👑</span>
                  <span style={stylesModern.readinessLabel}>Executive</span>
                  <span style={{...stylesModern.readinessLevel, color: superAnalysis.roleReadiness.executive.ready ? '#4CAF50' : superAnalysis.roleReadiness.executive.score >= 65 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.executive.ready ? 'Ready Now' : superAnalysis.roleReadiness.executive.score >= 65 ? 'Developing' : 'Not Ready'}
                  </span>
                  <span style={stylesModern.readinessScore}>Score: {superAnalysis.roleReadiness.executive.score}%</span>
                  <p style={stylesModern.readinessReasoning}>{superAnalysis.roleReadiness.executive.reasoning}</p>
                </div>
                <div style={stylesModern.readinessCard}>
                  <span style={stylesModern.readinessIcon}>📋</span>
                  <span style={stylesModern.readinessLabel}>Management</span>
                  <span style={{...stylesModern.readinessLevel, color: superAnalysis.roleReadiness.management.ready ? '#4CAF50' : superAnalysis.roleReadiness.management.score >= 60 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.management.ready ? 'Ready Now' : superAnalysis.roleReadiness.management.score >= 60 ? 'Developing' : 'Not Ready'}
                  </span>
                  <span style={stylesModern.readinessScore}>Score: {superAnalysis.roleReadiness.management.score}%</span>
                  <p style={stylesModern.readinessReasoning}>{superAnalysis.roleReadiness.management.reasoning}</p>
                </div>
                <div style={stylesModern.readinessCard}>
                  <span style={stylesModern.readinessIcon}>⚙️</span>
                  <span style={stylesModern.readinessLabel}>Technical</span>
                  <span style={{...stylesModern.readinessLevel, color: superAnalysis.roleReadiness.technical.ready ? '#4CAF50' : superAnalysis.roleReadiness.technical.score >= 60 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.technical.ready ? 'Ready' : superAnalysis.roleReadiness.technical.score >= 60 ? 'Developing' : 'Needs Work'}
                  </span>
                  <span style={stylesModern.readinessScore}>Score: {superAnalysis.roleReadiness.technical.score}%</span>
                  <p style={stylesModern.readinessReasoning}>{superAnalysis.roleReadiness.technical.reasoning}</p>
                </div>
                <div style={stylesModern.readinessCard}>
                  <span style={stylesModern.readinessIcon}>🧠</span>
                  <span style={stylesModern.readinessLabel}>Analytical</span>
                  <span style={{...stylesModern.readinessLevel, color: superAnalysis.roleReadiness.analytical.ready ? '#4CAF50' : superAnalysis.roleReadiness.analytical.score >= 60 ? '#FF9800' : '#F44336'}}>
                    {superAnalysis.roleReadiness.analytical.ready ? 'Ready' : superAnalysis.roleReadiness.analytical.score >= 60 ? 'Developing' : 'Needs Work'}
                  </span>
                  <span style={stylesModern.readinessScore}>Score: {superAnalysis.roleReadiness.analytical.score}%</span>
                  <p style={stylesModern.readinessReasoning}>{superAnalysis.roleReadiness.analytical.reasoning}</p>
                </div>
              </div>
            </div>

            <div style={stylesModern.superRoadmap}>
              <h4 style={stylesModern.superRoadmapTitle}>🗺️ Development Roadmap</h4>
              {superAnalysis.developmentRoadmap.immediate.length > 0 && (
                <div style={stylesModern.superPhase}>
                  <div style={stylesModern.superPhaseHeader}>
                    <span style={stylesModern.superPhaseIcon}>🔴</span>
                    <span style={stylesModern.superPhaseTitle}>Immediate Priorities (0-3 months)</span>
                  </div>
                  <ul style={stylesModern.superPhaseList}>
                    {superAnalysis.developmentRoadmap.immediate.slice(0, 3).map((item, idx) => (
                      <li key={idx} style={stylesModern.superPhaseItem}>
                        <strong>{item.area}:</strong> {item.recommendation || `Gap of ${item.gap}% to target`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {superAnalysis.developmentRoadmap.shortTerm.length > 0 && (
                <div style={stylesModern.superPhase}>
                  <div style={stylesModern.superPhaseHeader}>
                    <span style={stylesModern.superPhaseIcon}>🟠</span>
                    <span style={stylesModern.superPhaseTitle}>Short-term Goals (3-6 months)</span>
                  </div>
                  <ul style={stylesModern.superPhaseList}>
                    {superAnalysis.developmentRoadmap.shortTerm.slice(0, 3).map((item, idx) => (
                      <li key={idx} style={stylesModern.superPhaseItem}>
                        <strong>{item.area}:</strong> Gap of {item.gap}% to target
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Responses Tab - NEW for multiple-select display */}
        {activeTab === 'responses' && (
          <div style={stylesModern.contentCard}>
            <h2 style={stylesModern.sectionTitle}>📝 Detailed Question Responses</h2>
            <p style={stylesModern.sectionDesc}>Review all answers provided by the candidate, including multiple-select questions</p>
            
            <div style={stylesModern.responsesContainer}>
              {questionResponses.length === 0 ? (
                <p>No response data available.</p>
              ) : (
                <div style={stylesModern.responsesList}>
                  {questionResponses.map((response, idx) => {
                    const isMultiple = isMultipleCorrectQuestion(response.question_id, questionResponses);
                    let selectedAnswers = [];
                    
                    if (isMultiple && response.answer_id && response.answer_id.includes(',')) {
                      const answerIds = response.answer_id.split(',').map(id => parseInt(id, 10));
                      selectedAnswers = answerIds.map(id => response.unique_answers?.answer_text || `Answer ${id}`);
                    } else {
                      selectedAnswers = [response.unique_answers?.answer_text || response.answer_id];
                    }
                    
                    return (
                      <div key={idx} style={stylesModern.responseCard}>
                        <div style={stylesModern.responseHeader}>
                          <span style={stylesModern.responseNumber}>Q{idx + 1}</span>
                          <span style={stylesModern.responseSection}>{response.unique_questions?.section || 'General'}</span>
                          {isMultiple && <span style={stylesModern.multipleBadge}>Multiple Correct</span>}
                        </div>
                        <div style={stylesModern.responseQuestion}>{response.unique_questions?.question_text || 'Question text not available'}</div>
                        <div style={stylesModern.responseAnswers}>
                          <strong>Selected Answer{selectedAnswers.length > 1 ? 's' : ''}:</strong>
                          <ul style={stylesModern.responseAnswersList}>
                            {selectedAnswers.map((answer, aidx) => (
                              <li key={aidx} style={stylesModern.responseAnswerItem}>✓ {answer}</li>
                            ))}
                          </ul>
                        </div>
                        {response.time_spent_seconds > 0 && (
                          <div style={stylesModern.responseMeta}>
                            Time spent: {response.time_spent_seconds} seconds
                            {response.times_changed > 0 && ` • Changed answer ${response.times_changed} time${response.times_changed !== 1 ? 's' : ''}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media print {
          body { background: white; }
          button { display: none; }
        }
      `}</style>
    </div>
  );
}

const stylesModern = {
  pageContainer: { minHeight: '100vh', background: '#F5F7FA', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA', gap: '20px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid #0A1929', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { fontSize: '14px', color: '#64748B' },
  emptyContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA', textAlign: 'center' },
  emptyIcon: { fontSize: '64px', marginBottom: '20px', opacity: 0.5 },
  emptyTitle: { fontSize: '20px', fontWeight: 600, color: '#0A1929', marginBottom: '10px' },
  emptyText: { fontSize: '14px', color: '#64748B', marginBottom: '20px' },
  backButton: { display: 'inline-block', padding: '10px 20px', background: '#0A1929', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500 },
  animatedHeader: { background: 'linear-gradient(135deg, #0A1929, #1A2A3A, #0A1929)', backgroundSize: '200% 200%', animation: 'gradientShift 10s ease infinite', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 100 },
  headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '24px' },
  dashboardLink: { color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' },
  logo: { fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '2px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  assessmentSelect: { padding: '8px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', cursor: 'pointer' },
  printButton: { padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' },
  hero: { padding: '32px 0', borderBottom: '1px solid #E2E8F0' },
  heroContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' },
  candidateInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  candidateAvatar: { width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 600, color: 'white' },
  candidateName: { fontSize: '24px', fontWeight: 700, color: '#0A1929', marginBottom: '4px' },
  assessmentMeta: { fontSize: '14px', color: '#64748B' },
  profileId: { fontSize: '12px', color: '#94A3B8', marginTop: '4px' },
  scoreCard: { display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  scoreCircle: { textAlign: 'center' },
  scoreValue: { fontSize: '36px', fontWeight: 700, display: 'block', lineHeight: 1 },
  scoreLabel: { fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' },
  scoreDetails: { display: 'flex', gap: '24px' },
  scoreDetailItem: { textAlign: 'center' },
  scoreDetailLabel: { display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' },
  scoreDetailValue: { fontSize: '16px', fontWeight: 600, color: '#0A1929' },
  classificationBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  tabsContainer: { borderBottom: '1px solid #E2E8F0', background: 'white', position: 'sticky', top: '73px', zIndex: 99 },
  tabsWrapper: { maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '8px', overflowX: 'auto' },
  tab: { padding: '16px 20px', background: 'none', border: 'none', fontSize: '14px', fontWeight: 500, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', transition: 'all 0.2s' },
  tabActive: { color: '#0A1929' },
  tabIndicator: { position: 'absolute', bottom: '-1px', left: '20px', right: '20px', height: '2px', borderRadius: '1px' },
  tabIcon: { fontSize: '16px' },
  mainContent: { maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' },
  contentCard: { background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' },
  sectionTitle: { fontSize: '20px', fontWeight: 600, color: '#0A1929', marginBottom: '8px' },
  sectionDesc: { fontSize: '14px', color: '#64748B', marginBottom: '24px' },
  subsectionTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '16px' },
  executiveSummarySection: { marginBottom: '32px' },
  narrativeBox: { background: '#F8FAFC', padding: '24px', borderRadius: '12px', borderLeft: '6px solid', marginBottom: '20px' },
  executiveText: { fontSize: '16px', lineHeight: '1.6', color: '#2D3748', marginBottom: '16px' },
  executiveDesc: { fontSize: '14px', color: '#64748B', fontStyle: 'italic' },
  insightCard: { padding: '20px', borderRadius: '12px', marginBottom: '32px' },
  insightCardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  insightCardIcon: { fontSize: '24px' },
  insightCardTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', margin: 0 },
  insightCardText: { fontSize: '14px', lineHeight: '1.6', color: '#2D3748', margin: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  statCard: { padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(0,0,0,0.05)' },
  statIcon: { fontSize: '28px' },
  statValue: { fontSize: '24px', fontWeight: 700, color: '#0A1929' },
  statLabel: { fontSize: '12px', color: '#64748B' },
  strengthsSection: { marginBottom: '32px' },
  strengthsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  strengthItem: { padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' },
  strengthHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  strengthName: { fontSize: '14px', fontWeight: 600, color: '#0A5C2E' },
  strengthScore: { fontSize: '14px', fontWeight: 700, color: '#0A5C2E' },
  strengthBar: { background: '#E8F5E9', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  strengthNarrative: { fontSize: '12px', color: '#2F855A', marginTop: '8px', lineHeight: '1.5' },
  weaknessesSection: { marginBottom: '16px' },
  weaknessesGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  weaknessItem: { padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' },
  weaknessHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  weaknessName: { fontSize: '14px', fontWeight: 600, color: '#B91C1C' },
  weaknessScore: { fontSize: '14px', fontWeight: 700, color: '#B91C1C' },
  weaknessBar: { background: '#FFEBEE', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  weaknessNarrative: { fontSize: '12px', color: '#B91C1C', marginTop: '8px', lineHeight: '1.5' },
  gapText: { fontSize: '11px', color: '#F57C00', marginTop: '8px', fontWeight: 500 },
  tableContainer: { overflowX: 'auto', marginBottom: '32px' },
  dataTable: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  tableHeaderRow: { background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' },
  tableHeader: { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#0A1929' },
  tableRow: { borderBottom: '1px solid #E2E8F0' },
  tableCell: { padding: '12px 16px', verticalAlign: 'middle' },
  tableProgressContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
  tableProgressBar: { height: '8px', borderRadius: '4px', minWidth: '30px' },
  tableProgressText: { fontSize: '13px', fontWeight: 500, minWidth: '40px' },
  gradeBadge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'inline-block' },
  detailedAnalysisSection: { marginTop: '32px' },
  analysisGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  analysisCard: { borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', transition: 'transform 0.2s, box-shadow 0.2s' },
  analysisHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' },
  analysisCategory: { fontSize: '15px', fontWeight: 600, color: '#0A1929', display: 'block', marginBottom: '6px' },
  analysisGrade: { padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 500, display: 'inline-block' },
  analysisScore: { textAlign: 'right' },
  analysisScoreValue: { fontSize: '24px', fontWeight: 700, display: 'block', lineHeight: 1 },
  analysisScoreLabel: { fontSize: '10px', color: '#64748B' },
  analysisProgress: { background: '#EDF2F7', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' },
  analysisNarrative: { fontSize: '13px', lineHeight: '1.5', color: '#2D3748', marginBottom: '12px' },
  analysisInsight: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '12px' },
  insightIcon: { fontSize: '14px' },
  insightText: { fontSize: '12px', color: '#475569', flex: 1 },
  analysisGap: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#F57C00', paddingTop: '10px', borderTop: '1px solid #E2E8F0' },
  competenciesGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  competencyCard: { padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' },
  competencyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  competencyName: { fontSize: '15px', fontWeight: 600, color: '#0A1929', marginBottom: '4px' },
  competencyCategory: { fontSize: '11px', color: '#64748B' },
  competencyScore: { fontSize: '22px', fontWeight: 700, color: '#0A1929' },
  competencyBar: { background: '#EDF2F7', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  competencyNarrative: { fontSize: '12px', color: '#4A5568', lineHeight: '1.4', marginBottom: '8px' },
  competencyTarget: { fontSize: '11px', color: '#64748B', textAlign: 'right' },
  recommendationsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  recommendationCard: { padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' },
  recommendationHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
  recommendationPriority: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 },
  recommendationCategory: { fontSize: '14px', fontWeight: 600, color: '#0A1929' },
  recommendationText: { fontSize: '14px', color: '#2D3748', lineHeight: '1.6', marginBottom: '12px' },
  recommendationAction: { fontSize: '13px', color: '#475569', marginBottom: '8px' },
  recommendationImpact: { fontSize: '13px', color: '#64748B' },
  planCard: { padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #E2E8F0' },
  planHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  planArea: { fontSize: '18px', fontWeight: 600, color: '#0A1929', display: 'block', marginBottom: '4px' },
  planPriority: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-block' },
  planScore: { fontSize: '14px', color: '#64748B' },
  planArrow: { margin: '0 8px' },
  planTarget: { fontWeight: 600, color: '#4CAF50' },
  planGap: { background: '#EDF2F7', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' },
  planTimeframe: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '20px' },
  planActions: { marginBottom: '20px' },
  planActionsTitle: { fontSize: '14px', fontWeight: 600, color: '#0A1929', marginBottom: '12px' },
  planActionsList: { margin: 0, paddingLeft: '20px' },
  planActionItem: { fontSize: '13px', color: '#4A5568', marginBottom: '8px' },
  planMilestones: { marginBottom: '16px' },
  planMilestonesTitle: { fontSize: '14px', fontWeight: 600, color: '#0A1929', marginBottom: '12px' },
  planMilestonesGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  milestone: { background: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', border: '1px solid #E2E8F0' },
  milestoneWeek: { display: 'block', fontWeight: 600, color: '#0A1929', marginBottom: '4px' },
  planSummary: { background: '#F0F4F8', padding: '20px', borderRadius: '12px', marginTop: '24px' },
  planSummaryTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '12px' },
  planSummaryNote: { fontSize: '13px', color: '#64748B', marginTop: '12px', fontStyle: 'italic' },
  noDevelopmentNeeded: { textAlign: 'center', padding: '48px 24px', background: '#F0F9F0', borderRadius: '16px', border: '1px solid #C6F6D5' },
  noDevIcon: { fontSize: '64px', marginBottom: '20px' },
  noDevTitle: { fontSize: '20px', fontWeight: 600, color: '#2E7D32', marginBottom: '12px' },
  noDevText: { fontSize: '14px', color: '#2E7D32', marginBottom: '16px' },
  noDevSubtext: { fontSize: '13px', color: '#64748B', marginBottom: '12px' },
  noDevList: { textAlign: 'left', display: 'inline-block', margin: '0 auto', color: '#4A5568', fontSize: '13px', lineHeight: '1.8' },
  superOverview: { borderRadius: '16px', padding: '24px', marginBottom: '24px', color: 'white' },
  superHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  superIcon: { fontSize: '48px' },
  superTitle: { fontSize: '20px', fontWeight: 600, marginBottom: '8px' },
  superDesc: { fontSize: '14px', opacity: 0.9, margin: 0 },
  superStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  superStat: { textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '10px' },
  superStatValue: { display: 'block', fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  superStatLabel: { fontSize: '11px', opacity: 0.8 },
  patternsSection: { marginBottom: '24px' },
  patternsTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '16px' },
  patternCard: { background: '#F8FAFC', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #E2E8F0' },
  patternHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  patternName: { fontSize: '14px', fontWeight: 600, color: '#0A1929' },
  patternSeverity: { padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  patternDescription: { fontSize: '13px', color: '#4A5568', marginBottom: '12px', lineHeight: '1.5' },
  patternRecommendation: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#F1F5F9', borderRadius: '8px', fontSize: '13px' },
  differentiatorsSection: { marginBottom: '24px' },
  differentiatorsTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '16px' },
  differentiatorsGrid: { display: 'grid', gap: '12px' },
  differentiatorCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' },
  diffScore: { fontSize: '28px', fontWeight: 700, color: '#4CAF50', minWidth: '70px', textAlign: 'center' },
  diffContent: { flex: 1 },
  diffName: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#0A1929', marginBottom: '4px' },
  diffValue: { fontSize: '13px', color: '#4A5568', marginBottom: '4px' },
  diffApplication: { fontSize: '12px', color: '#64748B', fontStyle: 'italic' },
  predictiveSection: { marginBottom: '24px' },
  predictiveTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '16px' },
  predictiveCard: { background: '#F8FAFC', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #E2E8F0' },
  predictiveHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  predictiveType: { fontSize: '13px', fontWeight: 600, color: '#0A1929' },
  predictiveProbability: { fontSize: '11px', color: '#64748B' },
  predictiveText: { fontSize: '13px', color: '#4A5568', marginBottom: '8px', lineHeight: '1.5' },
  predictiveImpact: { fontSize: '12px', color: '#64748B' },
  readinessSection: { marginBottom: '24px' },
  readinessTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '16px' },
  readinessGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  readinessCard: { background: '#F8FAFC', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' },
  readinessIcon: { fontSize: '28px', display: 'block', marginBottom: '8px' },
  readinessLabel: { fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  readinessLevel: { fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '4px' },
  readinessScore: { fontSize: '12px', color: '#64748B', display: 'block' },
  readinessReasoning: { fontSize: '11px', color: '#94A3B8', marginTop: '8px' },
  superRoadmap: { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' },
  superRoadmapTitle: { fontSize: '16px', fontWeight: 600, color: '#0A1929', marginBottom: '16px' },
  superPhase: { marginBottom: '20px' },
  superPhaseHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  superPhaseIcon: { fontSize: '16px' },
  superPhaseTitle: { fontSize: '14px', fontWeight: 600, color: '#0A1929' },
  superPhaseList: { margin: 0, paddingLeft: '26px' },
  superPhaseItem: { fontSize: '13px', color: '#4A5568', marginBottom: '8px', lineHeight: '1.5' },
  // New styles for Question Responses tab
  responsesContainer: { marginTop: '16px' },
  responsesList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  responseCard: { padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white', transition: 'box-shadow 0.2s' },
  responseHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
  responseNumber: { fontSize: '14px', fontWeight: 700, color: '#0A1929', background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px' },
  responseSection: { fontSize: '12px', color: '#64748B', background: '#F8FAFC', padding: '4px 10px', borderRadius: '20px' },
  multipleBadge: { fontSize: '11px', fontWeight: 600, color: '#2E7D32', background: '#E8F5E9', padding: '4px 10px', borderRadius: '20px' },
  responseQuestion: { fontSize: '15px', fontWeight: 500, color: '#0A1929', marginBottom: '12px', lineHeight: '1.5' },
  responseAnswers: { marginBottom: '8px', fontSize: '13px' },
  responseAnswersList: { margin: '4px 0 0 20px', padding: 0 },
  responseAnswerItem: { fontSize: '13px', color: '#2E7D32', marginBottom: '4px' },
  responseMeta: { fontSize: '11px', color: '#94A3B8', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }
};

export default CandidateReport;
