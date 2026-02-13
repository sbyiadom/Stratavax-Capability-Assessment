// pages/supervisor/[user_id].js - COMPLETE CANDIDATE REPORT WITH ALL 6 ASSESSMENTS
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [assessmentReports, setAssessmentReports] = useState({});
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Define all 6 independent assessment types
  const ASSESSMENTS = [
    {
      id: 'general',
      name: 'General Assessment',
      icon: '📋',
      color: '#4A6FA5',
      gradient: 'linear-gradient(135deg, #4A6FA5, #6B8EC9)',
      lightBg: '#E8EEF5',
      border: '#B8C7E0',
      description: 'Comprehensive evaluation across core competencies',
      totalQuestions: 100,
      maxScore: 500,
      type: 'general'
    },
    {
      id: 'behavioral',
      name: 'Behavioral & Soft Skills',
      icon: '🧠',
      color: '#9C27B0',
      gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
      lightBg: '#F3E5F5',
      border: '#D1B3E0',
      description: 'Communication, teamwork, emotional intelligence',
      totalQuestions: 20,
      maxScore: 100,
      type: 'personality'
    },
    {
      id: 'cognitive',
      name: 'Cognitive & Thinking Skills',
      icon: '💡',
      color: '#FF9800',
      gradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
      lightBg: '#FFF3E0',
      border: '#FFD8B0',
      description: 'Problem-solving, critical thinking, analysis',
      totalQuestions: 20,
      maxScore: 100,
      type: 'cognitive'
    },
    {
      id: 'cultural',
      name: 'Cultural & Attitudinal Fit',
      icon: '🤝',
      color: '#4CAF50',
      gradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
      lightBg: '#E8F5E9',
      border: '#B8DFB8',
      description: 'Values alignment, organizational fit',
      totalQuestions: 20,
      maxScore: 100,
      type: 'personality'
    },
    {
      id: 'manufacturing',
      name: 'Manufacturing Technical Skills',
      icon: '⚙️',
      color: '#F44336',
      gradient: 'linear-gradient(135deg, #F44336, #EF5350)',
      lightBg: '#FFEBEE',
      border: '#FFCDD2',
      description: 'Technical skills across different machines and equipment',
      totalQuestions: 20,
      maxScore: 100,
      type: 'technical'
    },
    {
      id: 'leadership',
      name: 'Leadership Potential',
      icon: '👑',
      color: '#FFC107',
      gradient: 'linear-gradient(135deg, #FFC107, #FFD54F)',
      lightBg: '#FFF8E1',
      border: '#FFE9B0',
      description: 'Vision, influence, team development',
      totalQuestions: 20,
      maxScore: 100,
      type: 'personality'
    }
  ];

  // Color palette
  const colors = {
    primary: '#6C5CE7',
    secondary: '#A8E6CF',
    success: '#4ECDC4',
    warning: '#FFD93D',
    danger: '#FF6B6B',
    info: '#4A90E2',
    purple: '#9B59B6',
    pink: '#FD79A8',
    dark: '#2D3436',
    light: '#F9F9F9',
    text: '#2D3436',
    textLight: '#636E72',
    border: '#DFE6E9'
  };

  // Classification for General Assessment (500 points)
  const getGeneralClassification = (score) => {
    if (score >= 480) return { 
      name: "Elite Talent", 
      color: colors.success,
      gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
      icon: '🏆',
      description: "Exceptional performer across all competencies. Demonstrates mastery in all areas."
    };
    if (score >= 450) return { 
      name: "Top Talent", 
      color: colors.info,
      gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
      icon: '⭐',
      description: "Outstanding performer with clear strengths across multiple domains."
    };
    if (score >= 400) return { 
      name: "High Potential", 
      color: colors.warning,
      gradient: 'linear-gradient(135deg, #FDCB6E, #FFEAA7)',
      icon: '📈',
      description: "Strong performer with identified development areas. Shows promise for growth."
    };
    if (score >= 350) return { 
      name: "Solid Performer", 
      color: colors.secondary,
      gradient: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
      icon: '💪',
      description: "Reliable performer meeting core requirements. Demonstrates solid competency."
    };
    if (score >= 300) return { 
      name: "Developing Talent", 
      color: colors.purple,
      gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
      icon: '🌱',
      description: "Shows foundational skills with clear development needs."
    };
    if (score >= 250) return { 
      name: "Emerging Talent", 
      color: colors.pink,
      gradient: 'linear-gradient(135deg, #E84342, #FF7675)',
      icon: '🔰',
      description: "Early-stage performer requiring significant development."
    };
    return { 
      name: "Needs Improvement", 
      color: colors.danger,
      gradient: 'linear-gradient(135deg, #D63031, #FF7675)',
      icon: '⚠️',
      description: "Performance below expectations requiring immediate attention."
    };
  };

  // Classification for Technical/Manufacturing Assessment (100 points)
  const getTechnicalClassification = (score) => {
    if (score >= 90) return { 
      name: "Technical Expert", 
      color: colors.success,
      gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
      icon: '🔧',
      description: "Mastery of technical concepts across multiple machines. Demonstrates expert-level knowledge."
    };
    if (score >= 80) return { 
      name: "Advanced", 
      color: colors.info,
      gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
      icon: '⚙️',
      description: "Strong technical knowledge with ability to operate most machines independently."
    };
    if (score >= 70) return { 
      name: "Proficient", 
      color: colors.warning,
      gradient: 'linear-gradient(135deg, #FDCB6E, #FFEAA7)',
      icon: '🔨',
      description: "Solid technical foundation. Can operate machines with minimal supervision."
    };
    if (score >= 60) return { 
      name: "Competent", 
      color: colors.secondary,
      gradient: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
      icon: '🛠️',
      description: "Adequate technical knowledge. Requires supervision for complex operations."
    };
    if (score >= 50) return { 
      name: "Developing", 
      color: colors.purple,
      gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
      icon: '📚',
      description: "Basic technical understanding. Requires training on specific machines."
    };
    return { 
      name: "Needs Training", 
      color: colors.danger,
      gradient: 'linear-gradient(135deg, #D63031, #FF7675)',
      icon: '⚠️',
      description: "Significant gaps in technical knowledge. Requires immediate training across multiple areas."
    };
  };

  // Classification for Cognitive Assessments (100 points, right/wrong)
  const getCognitiveClassification = (score) => {
    if (score >= 90) return { 
      name: "Exceptional", 
      color: colors.success,
      gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
      icon: '🧠',
      description: "Outstanding cognitive abilities. Demonstrates superior problem-solving and analytical thinking."
    };
    if (score >= 80) return { 
      name: "Strong", 
      color: colors.info,
      gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
      icon: '💡',
      description: "Strong cognitive skills. Effectively analyzes complex problems and identifies solutions."
    };
    if (score >= 70) return { 
      name: "Good", 
      color: colors.warning,
      gradient: 'linear-gradient(135deg, #FDCB6E, #FFEAA7)',
      icon: '👍',
      description: "Good cognitive abilities. Handles most problems effectively."
    };
    if (score >= 60) return { 
      name: "Satisfactory", 
      color: colors.secondary,
      gradient: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
      icon: '📊',
      description: "Satisfactory cognitive performance. May struggle with highly complex problems."
    };
    if (score >= 50) return { 
      name: "Developing", 
      color: colors.purple,
      gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
      icon: '🌱',
      description: "Developing cognitive skills. Would benefit from problem-solving practice."
    };
    return { 
      name: "Needs Development", 
      color: colors.danger,
      gradient: 'linear-gradient(135deg, #D63031, #FF7675)',
      icon: '⚠️',
      description: "Significant opportunities for cognitive skill development."
    };
  };

  // Classification for Personality Assessments (no right/wrong)
  const getPersonalityClassification = (score) => {
    if (score >= 80) return { 
      name: "Strong Indicator", 
      color: colors.success,
      gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
      icon: '🌟',
      description: "Strong tendencies in this area. This is likely a natural strength."
    };
    if (score >= 70) return { 
      name: "Moderate Indicator", 
      color: colors.info,
      gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
      icon: '📈',
      description: "Moderate tendencies. Can adapt based on situation."
    };
    if (score >= 60) return { 
      name: "Balanced", 
      color: colors.warning,
      gradient: 'linear-gradient(135deg, #FDCB6E, #FFEAA7)',
      icon: '⚖️',
      description: "Balanced approach. Shows flexibility in this area."
    };
    if (score >= 50) return { 
      name: "Developing", 
      color: colors.secondary,
      gradient: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
      icon: '🌱',
      description: "Still developing in this area. May need support."
    };
    return { 
      name: "Area for Growth", 
      color: colors.purple,
      gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
      icon: '📚',
      description: "Opportunity for growth and development in this area."
    };
  };

  // Get grade from percentage
  const getGradeInfo = (percentage) => {
    if (percentage >= 90) return { grade: "A+", color: colors.success, label: "Exceptional" };
    if (percentage >= 85) return { grade: "A", color: colors.success, label: "Outstanding" };
    if (percentage >= 80) return { grade: "A-", color: colors.success, label: "Excellent" };
    if (percentage >= 75) return { grade: "B+", color: colors.info, label: "Very Good" };
    if (percentage >= 70) return { grade: "B", color: colors.info, label: "Good" };
    if (percentage >= 65) return { grade: "B-", color: colors.info, label: "Above Average" };
    if (percentage >= 60) return { grade: "C+", color: colors.warning, label: "Satisfactory" };
    if (percentage >= 55) return { grade: "C", color: colors.warning, label: "Adequate" };
    if (percentage >= 50) return { grade: "C-", color: colors.warning, label: "Developing" };
    if (percentage >= 45) return { grade: "D+", color: colors.danger, label: "Below Average" };
    if (percentage >= 40) return { grade: "D", color: colors.danger, label: "Poor" };
    return { grade: "F", color: colors.danger, label: "Unsatisfactory" };
  };

  // Extract machine type from question for manufacturing assessment
  const extractMachineType = (questionText) => {
    const text = questionText.toLowerCase();
    if (text.includes('cnc')) return 'CNC Machines';
    if (text.includes('assembly')) return 'Assembly Line';
    if (text.includes('quality') || text.includes('inspect')) return 'Quality Control';
    if (text.includes('safety') || text.includes('protocol')) return 'Safety Protocols';
    if (text.includes('maintenance') || text.includes('repair')) return 'Maintenance';
    if (text.includes('lathe')) return 'CNC Machines';
    if (text.includes('mill')) return 'CNC Machines';
    if (text.includes('conveyor')) return 'Assembly Line';
    if (text.includes('robot')) return 'Assembly Line';
    if (text.includes('calibrat')) return 'Quality Control';
    if (text.includes('measure')) return 'Quality Control';
    if (text.includes('ppe') || text.includes('protective')) return 'Safety Protocols';
    if (text.includes('hazard')) return 'Safety Protocols';
    if (text.includes('troubleshoot')) return 'Maintenance';
    if (text.includes('diagnos')) return 'Maintenance';
    return 'General Manufacturing';
  };

  // Extract dimension from question for personality assessments
  const extractDimension = (questionText, subsection, assessmentType) => {
    if (subsection) return subsection;
    
    const text = questionText.toLowerCase();
    
    if (assessmentType === 'behavioral') {
      if (text.includes('communicat')) return 'Communication';
      if (text.includes('team') || text.includes('collaborat')) return 'Teamwork';
      if (text.includes('emotion') || text.includes('feel')) return 'Emotional Intelligence';
      if (text.includes('adapt') || text.includes('change')) return 'Adaptability';
      if (text.includes('conflict') || text.includes('disagree')) return 'Conflict Resolution';
      return 'General Behavioral';
    }
    
    if (assessmentType === 'cognitive') {
      if (text.includes('analyz') || text.includes('pattern')) return 'Analytical Thinking';
      if (text.includes('solv') || text.includes('fix')) return 'Problem Solving';
      if (text.includes('critic') || text.includes('evaluat')) return 'Critical Thinking';
      if (text.includes('logic') || text.includes('reason')) return 'Logical Reasoning';
      return 'General Cognitive';
    }
    
    if (assessmentType === 'cultural') {
      if (text.includes('value') || text.includes('belief')) return 'Values Alignment';
      if (text.includes('ethic') || text.includes('dedicat')) return 'Work Ethic';
      if (text.includes('adapt') || text.includes('flexib')) return 'Adaptability';
      if (text.includes('team') || text.includes('collaborat')) return 'Team Orientation';
      return 'General Cultural';
    }
    
    if (assessmentType === 'leadership') {
      if (text.includes('vision') || text.includes('future')) return 'Vision';
      if (text.includes('influenc') || text.includes('inspire')) return 'Influence';
      if (text.includes('develop') || text.includes('mentor')) return 'Team Development';
      if (text.includes('decis') || text.includes('choice')) return 'Decision Making';
      if (text.includes('strateg') || text.includes('plan')) return 'Strategic Thinking';
      return 'General Leadership';
    }
    
    return subsection || 'General';
  };

  // Fetch a specific assessment report
  const fetchAssessmentReport = async (userId, assessmentName) => {
    try {
      console.log(`Fetching ${assessmentName} for user ${userId}`);
      
      const { data: responses, error } = await supabase
        .from("responses")
        .select(`
          id,
          question_id,
          answer_id,
          assessment_id,
          created_at,
          questions!inner (
            id,
            question_text,
            section,
            subsection,
            assessment_type
          ),
          answers!inner (
            id,
            answer_text,
            score
          )
        `)
        .eq("user_id", userId)
        .eq("questions.assessment_type", assessmentName);

      if (error) {
        console.error(`Error fetching ${assessmentName}:`, error);
        return null;
      }

      if (!responses || responses.length === 0) {
        console.log(`No responses found for ${assessmentName}`);
        return null;
      }

      const assessmentConfig = ASSESSMENTS.find(a => a.name === assessmentName);

      // Calculate scores and organize by dimension/machine
      let totalScore = 0;
      const dimensionScores = {};
      const answerDetails = [];

      responses.forEach(response => {
        const score = response.answers.score;
        const questionText = response.questions.question_text;
        const subsection = response.questions.subsection;
        
        totalScore += score;
        
        // Determine grouping key based on assessment type
        let groupKey;
        if (assessmentConfig.type === 'technical') {
          groupKey = extractMachineType(questionText);
        } else if (['personality', 'cognitive', 'leadership'].includes(assessmentConfig.type)) {
          groupKey = extractDimension(questionText, subsection, assessmentConfig.type);
        } else {
          groupKey = response.questions.section || 'General';
        }
        
        if (!dimensionScores[groupKey]) {
          dimensionScores[groupKey] = {
            totalScore: 0,
            maxPossible: 0,
            count: 0,
            responses: []
          };
        }
        
        dimensionScores[groupKey].totalScore += score;
        dimensionScores[groupKey].maxPossible += 5;
        dimensionScores[groupKey].count++;
        
        answerDetails.push({
          question: questionText,
          answer: response.answers.answer_text,
          score: score,
          group: groupKey,
          section: response.questions.section,
          subsection: subsection,
          isCorrect: score === 5 && assessmentConfig.type === 'cognitive' ? true : false
        });
      });

      // Calculate percentages for each dimension
      Object.keys(dimensionScores).forEach(key => {
        const data = dimensionScores[key];
        data.percentage = Math.round((data.totalScore / data.maxPossible) * 100);
        data.average = (data.totalScore / data.count).toFixed(1);
        
        // Get appropriate classification based on assessment type
        if (assessmentConfig.type === 'technical') {
          data.classification = getTechnicalClassification(data.percentage);
        } else if (assessmentConfig.type === 'cognitive') {
          data.classification = getCognitiveClassification(data.percentage);
        } else if (assessmentConfig.type === 'personality') {
          data.classification = getPersonalityClassification(data.percentage);
        }
      });

      // Calculate overall percentage
      const maxPossible = responses.length * 5;
      const percentage = Math.round((totalScore / maxPossible) * 100);
      const gradeInfo = getGradeInfo(percentage);

      // Get overall classification based on assessment type
      let classification;
      if (assessmentConfig.type === 'general') {
        classification = getGeneralClassification(totalScore);
      } else if (assessmentConfig.type === 'technical') {
        classification = getTechnicalClassification(percentage);
      } else if (assessmentConfig.type === 'cognitive') {
        classification = getCognitiveClassification(percentage);
      } else {
        classification = getPersonalityClassification(percentage);
      }

      // Generate insights
      const strengths = [];
      const weaknesses = [];

      answerDetails.forEach(answer => {
        if (answer.score >= 4) {
          strengths.push({
            text: answer.question.length > 80 ? answer.question.substring(0, 80) + '...' : answer.question,
            detail: `Selected: "${answer.answer.substring(0, 50)}${answer.answer.length > 50 ? '...' : ''}"`,
            score: answer.score,
            group: answer.group
          });
        } else if (answer.score <= 2) {
          weaknesses.push({
            text: answer.question.length > 80 ? answer.question.substring(0, 80) + '...' : answer.question,
            detail: `Selected: "${answer.answer.substring(0, 50)}${answer.answer.length > 50 ? '...' : ''}"`,
            score: answer.score,
            group: answer.group
          });
        }
      });

      // Generate recommendations
      const recommendations = [];

      if (percentage >= 80) {
        recommendations.push({
          type: "overall",
          text: `Excellent performance in ${assessmentName}. Ready for advanced responsibilities.`,
          priority: "Low"
        });
      } else if (percentage >= 70) {
        recommendations.push({
          type: "overall",
          text: `Good performance in ${assessmentName}. Focus on refining specific areas.`,
          priority: "Medium"
        });
      } else if (percentage >= 60) {
        recommendations.push({
          type: "overall",
          text: `Satisfactory performance in ${assessmentName}. Structured development recommended.`,
          priority: "Medium"
        });
      } else {
        recommendations.push({
          type: "overall",
          text: `Performance in ${assessmentName} needs improvement. Intensive development required.`,
          priority: "High"
        });
      }

      // Add dimension-specific recommendations
      Object.entries(dimensionScores).forEach(([key, data]) => {
        if (data.percentage < 60) {
          recommendations.push({
            type: "specific",
            group: key,
            text: `Development needed in ${key}`,
            action: `Focus on improving ${key.toLowerCase()} through targeted training`,
            priority: data.percentage < 50 ? "High" : "Medium"
          });
        }
      });

      return {
        name: assessmentName,
        config: assessmentConfig,
        totalScore,
        maxPossible,
        percentage,
        gradeInfo,
        classification,
        dimensionScores,
        answerDetails,
        strengths: strengths.slice(0, 5),
        weaknesses: weaknesses.slice(0, 5),
        recommendations: recommendations.slice(0, 5),
        responseCount: responses.length,
        completedDate: new Date().toLocaleDateString()
      };

    } catch (error) {
      console.error(`Error in fetchAssessmentReport for ${assessmentName}:`, error);
      return null;
    }
  };

  // Fetch all available assessment reports
  const fetchAllAssessmentReports = async (userId) => {
    const reports = {};
    
    for (const assessment of ASSESSMENTS) {
      const report = await fetchAssessmentReport(userId, assessment.name);
      if (report) {
        reports[assessment.name] = report;
      }
    }
    
    return reports;
  };

  // Main data fetch
  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: candidateData, error: candidateError } = await supabase
          .from("candidate_assessments")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (candidateError) {
          setCandidate({
            user_id: user_id,
            full_name: `Candidate ${user_id.substring(0, 8)}`,
            email: "Email not available"
          });
        } else {
          setCandidate(candidateData);
        }
        
        const reports = await fetchAllAssessmentReports(user_id);
        
        if (Object.keys(reports).length === 0) {
          setError("No assessment data found for this candidate");
          setLoading(false);
          return;
        }
        
        setAssessmentReports(reports);
        const firstAssessment = Object.keys(reports)[0];
        setSelectedAssessment(firstAssessment);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user_id]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '50px',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 30px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{ color: '#2d3748' }}>Loading Assessment Reports</h3>
            <p style={{ color: '#718096' }}>Analyzing responses across all assessments...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || Object.keys(assessmentReports).length === 0) {
    return (
      <AppLayout>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '50px',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>📋</div>
            <h2 style={{ color: '#2d3748', marginBottom: '15px' }}>No Assessments Found</h2>
            <p style={{ color: '#718096', marginBottom: '30px' }}>
              {error || "This candidate hasn't completed any assessments yet."}
            </p>
            <button
              onClick={handleBack}
              style={{
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentReport = assessmentReports[selectedAssessment];

  return (
    <AppLayout>
      {/* Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        zIndex: 0
      }} />

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: "30px 20px",
        minHeight: "100vh"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          {/* Header with Back Button */}
          <div style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: 'blur(10px)',
            borderRadius: "20px",
            padding: "20px 30px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <button
              onClick={handleBack}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "50px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ 
              display: 'flex', 
              gap: '15px',
              padding: '8px 20px',
              background: '#f7fafc',
              borderRadius: '50px'
            }}>
              <span>📅 {new Date().toLocaleDateString()}</span>
              <span>🕐 {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Candidate Info */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "20px",
            padding: "25px 30px",
            marginBottom: "30px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{
                width: "70px",
                height: "70px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: "white"
              }}>
                {candidate.full_name?.charAt(0) || "C"}
              </div>
              <div>
                <h1 style={{ margin: "0 0 5px 0", fontSize: "28px", color: "#2d3748" }}>
                  {candidate.full_name || "Candidate"}
                </h1>
                <p style={{ margin: 0, color: "#718096", fontSize: "16px" }}>
                  📧 {candidate.email || "No email"} • 🆔 {user_id?.substring(0, 12)}...
                </p>
                <p style={{ margin: "5px 0 0 0", color: "#718096", fontSize: "14px" }}>
                  📊 {Object.keys(assessmentReports).length} of 6 assessments completed
                </p>
              </div>
            </div>
          </div>

          {/* Assessment Selector */}
          <div style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: 'blur(10px)',
            borderRadius: "60px",
            padding: "8px",
            marginBottom: "30px",
            display: "flex",
            flexWrap: "wrap",
            gap: "5px"
          }}>
            {Object.keys(assessmentReports).map(assessmentName => {
              const report = assessmentReports[assessmentName];
              const config = report.config;
              return (
                <button
                  key={assessmentName}
                  onClick={() => setSelectedAssessment(assessmentName)}
                  style={{
                    padding: "12px 24px",
                    background: selectedAssessment === assessmentName ? config.gradient : 'transparent',
                    color: selectedAssessment === assessmentName ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: "50px",
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{config.icon}</span>
                  <span>{config.name}</span>
                  <span style={{
                    background: selectedAssessment === assessmentName ? 'rgba(255,255,255,0.2)' : config.color + '20',
                    padding: '4px 10px',
                    borderRadius: '30px',
                    fontSize: '11px',
                    color: selectedAssessment === assessmentName ? 'white' : config.color
                  }}>
                    {report.percentage}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Assessment Report */}
          {currentReport && (
            <>
              {/* Report Header */}
              <div style={{
                background: "rgba(255,255,255,0.98)",
                backdropFilter: 'blur(10px)',
                borderRadius: "30px",
                padding: "30px",
                marginBottom: "30px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "25px" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "20px",
                    background: currentReport.config.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "36px",
                    color: "white"
                  }}>
                    {currentReport.config.icon}
                  </div>
                  <div>
                    <h2 style={{ margin: "0 0 5px 0", fontSize: "28px", color: "#2d3748" }}>
                      {currentReport.name}
                    </h2>
                    <p style={{ margin: 0, color: "#718096", fontSize: "15px" }}>
                      {currentReport.config.description}
                    </p>
                  </div>
                </div>

                {/* Score Card */}
                <div style={{
                  background: currentReport.classification.gradient,
                  borderRadius: "20px",
                  padding: "30px",
                  color: "white"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "10px" }}>
                        {currentReport.classification.icon} Total Score
                      </div>
                      <div style={{ fontSize: "56px", fontWeight: "800", marginBottom: "10px", lineHeight: 1 }}>
                        {currentReport.totalScore}
                        <span style={{ fontSize: "24px", opacity: 0.7, marginLeft: "10px" }}>
                          /{currentReport.maxPossible}
                        </span>
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "5px" }}>
                        {currentReport.classification.name}
                      </div>
                      <div style={{ fontSize: "15px", opacity: 0.9 }}>
                        {currentReport.percentage}% • Grade {currentReport.gradeInfo.grade} • {currentReport.gradeInfo.label}
                      </div>
                    </div>
                    <div style={{
                      width: "140px",
                      height: "140px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "42px",
                      fontWeight: "700",
                      border: "5px solid rgba(255,255,255,0.3)"
                    }}>
                      {currentReport.percentage}%
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: "20px",
                    padding: "15px",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    fontSize: "14px",
                    lineHeight: 1.6
                  }}>
                    {currentReport.classification.description}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: 'blur(10px)',
                borderRadius: "60px",
                padding: "8px",
                marginBottom: "30px",
                display: "inline-flex",
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
              }}>
                {['overview', 'answers', 'analysis'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "12px 30px",
                      background: activeTab === tab ? currentReport.config.gradient : 'transparent',
                      color: activeTab === tab ? 'white' : '#4a5568',
                      border: 'none',
                      borderRadius: "50px",
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      transition: 'all 0.3s'
                    }}
                  >
                    {tab === 'overview' && '📊 '}
                    {tab === 'answers' && '📝 '}
                    {tab === 'analysis' && '📈 '}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Overview Tab - Dimension/Machine Breakdown */}
              {activeTab === 'overview' && (
                <div style={{
                  background: "rgba(255,255,255,0.98)",
                  backdropFilter: 'blur(10px)',
                  borderRadius: "30px",
                  padding: "30px"
                }}>
                  <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#2d3748" }}>
                    {currentReport.config.type === 'technical' ? 'Machine Performance' : 'Dimension Breakdown'}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.entries(currentReport.dimensionScores).map(([key, data]) => (
                      <div key={key} style={{
                        padding: '20px',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: `1px solid ${currentReport.config.border}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', color: currentReport.config.color, fontWeight: '600' }}>
                            {key}
                          </h4>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {data.classification && (
                              <span style={{ fontSize: '20px' }}>{data.classification.icon}</span>
                            )}
                            <span style={{
                              padding: '4px 12px',
                              background: currentReport.config.lightBg,
                              color: currentReport.config.color,
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {data.percentage}%
                            </span>
                          </div>
                        </div>
                        
                        <div style={{
                          height: '10px',
                          background: '#e2e8f0',
                          borderRadius: '5px',
                          overflow: 'hidden',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${data.percentage}%`,
                            background: currentReport.config.gradient,
                            borderRadius: '5px'
                          }} />
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          color: '#718096'
                        }}>
                          <span>Score: {data.totalScore}/{data.maxPossible}</span>
                          <span>Average: {data.average}/5 per question</span>
                          <span>{data.count} questions</span>
                        </div>
                        
                        {data.classification && (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#4a5568'
                          }}>
                            {data.classification.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answers Tab - Detailed Answer Analysis */}
              {activeTab === 'answers' && (
                <div style={{
                  background: "rgba(255,255,255,0.98)",
                  backdropFilter: 'blur(10px)',
                  borderRadius: "30px",
                  padding: "30px"
                }}>
                  <h3 style={{ margin: "0 0 25px 0", fontSize: "22px", color: "#2d3748", display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: currentReport.config.lightBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}>📝</span>
                    Detailed Answer Analysis - {currentReport.name}
                  </h3>
                  
                  <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div><strong>Total Questions:</strong> {currentReport.responseCount}</div>
                      <div><strong>Total Score:</strong> {currentReport.totalScore}/{currentReport.maxPossible}</div>
                      <div><strong>Percentage:</strong> {currentReport.percentage}%</div>
                      <div><strong>Grade:</strong> {currentReport.gradeInfo.grade}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {currentReport.answerDetails.map((answer, index) => {
                      const isHighScore = answer.score >= 4;
                      const isLowScore = answer.score <= 2;
                      
                      return (
                        <div key={index} style={{
                          padding: '20px',
                          background: isHighScore ? '#f0fff4' : isLowScore ? '#fff5f5' : '#f8fafc',
                          borderRadius: '16px',
                          border: `2px solid ${
                            isHighScore ? '#9AE6B4' : isLowScore ? '#FEB2B2' : currentReport.config.border
                          }`,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}>
                          
                          {/* Header with question number and score */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '15px',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: currentReport.config.color,
                                color: 'white',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                {index + 1}
                              </span>
                              <span style={{
                                padding: '6px 16px',
                                background: isHighScore ? '#C6F6D5' : isLowScore ? '#FED7D7' : '#EDF2F7',
                                color: isHighScore ? '#22543D' : isLowScore ? '#742A2A' : '#4a5568',
                                borderRadius: '30px',
                                fontSize: '13px',
                                fontWeight: '600'
                              }}>
                                Score: {answer.score}/5
                              </span>
                              <span style={{
                                padding: '6px 16px',
                                background: currentReport.config.lightBg,
                                color: currentReport.config.color,
                                borderRadius: '30px',
                                fontSize: '13px',
                                fontWeight: '500'
                              }}>
                                {answer.group}
                              </span>
                              {answer.subsection && answer.subsection !== answer.group && (
                                <span style={{
                                  padding: '6px 16px',
                                  background: '#e2e8f0',
                                  color: '#4a5568',
                                  borderRadius: '30px',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}>
                                  {answer.subsection}
                                </span>
                              )}
                            </div>
                            
                            {/* Score indicator */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '20px',
                              background: isHighScore ? '#48BB78' : isLowScore ? '#F56565' : '#A0AEC0',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: '700'
                            }}>
                              {answer.score}
                            </div>
                          </div>
                          
                          {/* Question */}
                          <div style={{ marginBottom: '15px' }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '600', 
                              color: '#2d3748', 
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>📌</span> Question:
                            </div>
                            <div style={{ 
                              fontSize: '15px', 
                              color: '#4a5568', 
                              padding: '15px', 
                              background: 'white', 
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              lineHeight: 1.6
                            }}>
                              {answer.question}
                            </div>
                          </div>
                          
                          {/* Selected Answer */}
                          <div>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '600', 
                              color: '#2d3748', 
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>💬</span> Selected Answer:
                            </div>
                            <div style={{
                              fontSize: '15px',
                              color: isHighScore ? '#22543D' : isLowScore ? '#742A2A' : '#4a5568',
                              padding: '15px',
                              background: 'white',
                              borderRadius: '12px',
                              border: `2px solid ${
                                isHighScore ? '#48BB78' : isLowScore ? '#F56565' : currentReport.config.border
                              }`,
                              borderLeft: `6px solid ${
                                isHighScore ? '#48BB78' : isLowScore ? '#F56565' : currentReport.config.color
                              }`,
                              lineHeight: 1.6
                            }}>
                              {answer.answer}
                            </div>
                          </div>
                          
                          {/* Feedback based on score */}
                          {(isHighScore || isLowScore) && (
                            <div style={{
                              marginTop: '15px',
                              padding: '12px',
                              background: isHighScore ? '#F0FFF4' : '#FFF5F5',
                              borderRadius: '8px',
                              fontSize: '13px',
                              color: isHighScore ? '#22543D' : '#9B2C2C',
                              border: `1px solid ${isHighScore ? '#9AE6B4' : '#FEB2B2'}`
                            }}>
                              {isHighScore ? (
                                <span>✅ <strong>Strength:</strong> This answer demonstrates strong understanding in this area.</span>
                              ) : (
                                <span>📌 <strong>Development Area:</strong> Consider reviewing this topic for improvement.</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Analysis Tab - Strengths, Weaknesses, Recommendations */}
              {activeTab === 'analysis' && (
                <div style={{
                  background: "rgba(255,255,255,0.98)",
                  backdropFilter: 'blur(10px)',
                  borderRadius: "30px",
                  padding: "30px"
                }}>
                  <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#2d3748" }}>
                    📈 Response Pattern Analysis
                  </h3>
                  
                  {/* Strengths */}
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ 
                      fontSize: '18px', 
                      color: '#2d3748', 
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: '#4ECDC4',
                        color: 'white',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>✓</span>
                      Key Strengths ({currentReport.strengths.length})
                    </h4>
                    
                    {currentReport.strengths.map((strength, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        background: '#f0fff4',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        border: '1px solid #9AE6B4'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#22543D', marginBottom: '5px' }}>
                          {strength.group}
                        </div>
                        <div style={{ fontSize: '13px', color: '#22543D' }}>{strength.text}</div>
                        <div style={{ fontSize: '12px', color: '#2F855A', marginTop: '5px' }}>
                          {strength.detail}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weaknesses */}
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ 
                      fontSize: '18px', 
                      color: '#2d3748', 
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: '#FF6B6B',
                        color: 'white',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>!</span>
                      Development Areas ({currentReport.weaknesses.length})
                    </h4>
                    
                    {currentReport.weaknesses.map((weakness, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        background: '#fff5f5',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        border: '1px solid #FEB2B2'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#9B2C2C', marginBottom: '5px' }}>
                          {weakness.group}
                        </div>
                        <div style={{ fontSize: '13px', color: '#9B2C2C' }}>{weakness.text}</div>
                        <div style={{ fontSize: '12px', color: '#C53030', marginTop: '5px' }}>
                          {weakness.detail}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 style={{ 
                      fontSize: '18px', 
                      color: '#2d3748', 
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: '#667eea',
                        color: 'white',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>💡</span>
                      Recommendations
                    </h4>
                    
                    {currentReport.recommendations.map((rec, index) => (
                      <div key={index} style={{
                        padding: '15px',
                        background: rec.priority === 'High' ? '#FED7D7' : '#FEFCBF',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        border: `1px solid ${rec.priority === 'High' ? '#FEB2B2' : '#FEEBC8'}`
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: rec.priority === 'High' ? '#9B2C2C' : '#975A16',
                          marginBottom: '5px'
                        }}>
                          {rec.priority} Priority
                        </div>
                        <div style={{ fontSize: '14px', color: '#4a5568' }}>
                          {rec.type === 'overall' ? rec.text : (
                            <>
                              <strong>{rec.group}:</strong> {rec.text}
                              {rec.action && <div style={{ marginTop: '5px', fontSize: '13px' }}>→ {rec.action}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "30px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "13px",
            marginTop: "20px"
          }}>
            <p>Each assessment report is independent and tailored to its specific assessment type.</p>
            <p>© {new Date().getFullYear()} Talent Assessment System</p>
          </div>
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
