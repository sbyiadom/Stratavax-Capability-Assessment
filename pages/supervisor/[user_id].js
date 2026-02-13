// pages/supervisor/[user_id].js - COMPLETE ANSWER-BASED ANALYSIS
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id, assessment } = router.query;
  const selectedAssessmentFromUrl = assessment || 'General Assessment';
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [assessmentReport, setAssessmentReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");

  // Define all 6 assessment types
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

  // Classification functions based on assessment type
  const getGeneralClassification = (score) => {
    if (score >= 480) return { name: "Elite Talent", color: colors.success, icon: '🏆' };
    if (score >= 450) return { name: "Top Talent", color: colors.info, icon: '⭐' };
    if (score >= 400) return { name: "High Potential", color: colors.warning, icon: '📈' };
    if (score >= 350) return { name: "Solid Performer", color: colors.secondary, icon: '💪' };
    if (score >= 300) return { name: "Developing Talent", color: colors.purple, icon: '🌱' };
    if (score >= 250) return { name: "Emerging Talent", color: colors.pink, icon: '🔰' };
    return { name: "Needs Improvement", color: colors.danger, icon: '⚠️' };
  };

  const getTechnicalClassification = (score) => {
    if (score >= 90) return { name: "Technical Expert", color: colors.success, icon: '🔧' };
    if (score >= 80) return { name: "Advanced", color: colors.info, icon: '⚙️' };
    if (score >= 70) return { name: "Proficient", color: colors.warning, icon: '🔨' };
    if (score >= 60) return { name: "Competent", color: colors.secondary, icon: '🛠️' };
    if (score >= 50) return { name: "Developing", color: colors.purple, icon: '📚' };
    return { name: "Needs Training", color: colors.danger, icon: '⚠️' };
  };

  const getCognitiveClassification = (score) => {
    if (score >= 90) return { name: "Exceptional", color: colors.success, icon: '🧠' };
    if (score >= 80) return { name: "Strong", color: colors.info, icon: '💡' };
    if (score >= 70) return { name: "Good", color: colors.warning, icon: '👍' };
    if (score >= 60) return { name: "Satisfactory", color: colors.secondary, icon: '📊' };
    if (score >= 50) return { name: "Developing", color: colors.purple, icon: '🌱' };
    return { name: "Needs Development", color: colors.danger, icon: '⚠️' };
  };

  const getPersonalityClassification = (score) => {
    if (score >= 80) return { name: "Strong Indicator", color: colors.success, icon: '🌟' };
    if (score >= 70) return { name: "Moderate Indicator", color: colors.info, icon: '📈' };
    if (score >= 60) return { name: "Balanced", color: colors.warning, icon: '⚖️' };
    if (score >= 50) return { name: "Developing", color: colors.secondary, icon: '🌱' };
    return { name: "Area for Growth", color: colors.purple, icon: '📚' };
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

  // Extract machine type from question for manufacturing
  const extractMachineType = (questionText) => {
    const text = questionText.toLowerCase();
    if (text.includes('cnc') || text.includes('lathe') || text.includes('mill')) return 'CNC Machines';
    if (text.includes('assembly') || text.includes('conveyor') || text.includes('robot')) return 'Assembly Line';
    if (text.includes('quality') || text.includes('inspect') || text.includes('calibrat') || text.includes('measure')) return 'Quality Control';
    if (text.includes('safety') || text.includes('protocol') || text.includes('ppe') || text.includes('hazard')) return 'Safety Protocols';
    if (text.includes('maintenance') || text.includes('repair') || text.includes('troubleshoot') || text.includes('diagnos')) return 'Maintenance';
    return 'General Manufacturing';
  };

  // Extract dimension from question
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

  // Fetch candidate's responses for the selected assessment
  const fetchAssessmentReport = async (userId, assessmentName) => {
    try {
      const { data: responses, error } = await supabase
        .from("responses")
        .select(`
          id,
          question_id,
          answer_id,
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

      if (error) throw error;

      if (!responses || responses.length === 0) {
        return null;
      }

      const assessmentConfig = ASSESSMENTS.find(a => a.name === assessmentName);

      // Calculate scores and organize by dimension/machine
      let totalScore = 0;
      const dimensionScores = {};
      const answerDetails = [];
      const strengths = [];
      const weaknesses = [];

      responses.forEach(response => {
        const score = response.answers.score;
        const questionText = response.questions.question_text;
        const subsection = response.questions.subsection;
        
        totalScore += score;
        
        // Determine grouping key
        let groupKey;
        if (assessmentConfig.type === 'technical') {
          groupKey = extractMachineType(questionText);
        } else {
          groupKey = extractDimension(questionText, subsection, assessmentConfig.type);
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
        
        // Categorize as strength or weakness based on actual answer score
        if (score >= 4) {
          strengths.push({
            question: questionText,
            answer: response.answers.answer_text,
            score: score,
            group: groupKey,
            reason: "Selected a high-scoring answer indicating strong understanding"
          });
        } else if (score <= 2) {
          weaknesses.push({
            question: questionText,
            answer: response.answers.answer_text,
            score: score,
            group: groupKey,
            reason: "Selected a low-scoring answer indicating need for improvement"
          });
        }
        
        answerDetails.push({
          question: questionText,
          answer: response.answers.answer_text,
          score: score,
          group: groupKey,
          section: response.questions.section,
          subsection: subsection
        });
      });

      // Calculate percentages for dimensions
      Object.keys(dimensionScores).forEach(key => {
        const data = dimensionScores[key];
        data.percentage = Math.round((data.totalScore / data.maxPossible) * 100);
        data.average = (data.totalScore / data.count).toFixed(1);
      });

      // Calculate overall
      const maxPossible = responses.length * 5;
      const percentage = Math.round((totalScore / maxPossible) * 100);
      const gradeInfo = getGradeInfo(percentage);

      // Get classification
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

      // Generate personalized recommendations based on actual weak answers
      const recommendations = [];

      // Overall recommendation based on percentage
      if (percentage >= 80) {
        recommendations.push({
          type: "overall",
          text: "Excellent performance. Ready for advanced challenges.",
          priority: "Low"
        });
      } else if (percentage >= 70) {
        recommendations.push({
          type: "overall",
          text: "Good performance. Focus on refining specific areas.",
          priority: "Medium"
        });
      } else if (percentage >= 60) {
        recommendations.push({
          type: "overall",
          text: "Satisfactory performance. Structured development recommended.",
          priority: "Medium"
        });
      } else {
        recommendations.push({
          type: "overall",
          text: "Performance needs improvement. Intensive development required.",
          priority: "High"
        });
      }

      // Specific recommendations based on weak answers
      weaknesses.slice(0, 3).forEach(weakness => {
        recommendations.push({
          type: "specific",
          group: weakness.group,
          text: `Review topic: "${weakness.question.substring(0, 60)}..."`,
          action: `Focus on improving understanding in ${weakness.group}`,
          priority: weakness.score <= 1 ? "High" : "Medium"
        });
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
        recommendations,
        responseCount: responses.length
      };

    } catch (error) {
      console.error("Error fetching assessment:", error);
      return null;
    }
  };

  // Fetch candidate data
  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get candidate info
        const { data: candidateData } = await supabase
          .from("candidate_assessments")
          .select("*")
          .eq("user_id", user_id)
          .single();

        setCandidate(candidateData || {
          user_id: user_id,
          full_name: `Candidate ${user_id.substring(0, 8)}`,
          email: "Email not available"
        });
        
        // Fetch report for selected assessment
        const report = await fetchAssessmentReport(user_id, selectedAssessmentFromUrl);
        
        if (!report) {
          setError(`No data found for ${selectedAssessmentFromUrl}`);
          setLoading(false);
          return;
        }
        
        setAssessmentReport(report);

      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user_id, selectedAssessmentFromUrl]);

  const handleBack = () => {
    router.push(`/supervisor?assessment=${encodeURIComponent(selectedAssessmentFromUrl)}`);
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
            <h3>Loading Candidate Report</h3>
            <p>Analyzing individual answers...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !assessmentReport) {
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
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>📭</div>
            <h2>No Data Found</h2>
            <p>{error || `No responses found for ${selectedAssessmentFromUrl}`}</p>
            <button
              onClick={handleBack}
              style={{
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const config = assessmentReport.config;

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
          
          {/* Header */}
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
                cursor: "pointer"
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
                background: config.gradient,
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
                  {candidate.full_name}
                </h1>
                <p style={{ margin: 0, color: "#718096" }}>
                  📧 {candidate.email} • 📋 {assessmentReport.name}
                </p>
              </div>
            </div>
          </div>

          {/* Score Card */}
          <div style={{
            background: assessmentReport.classification.gradient || config.gradient,
            borderRadius: "20px",
            padding: "30px",
            color: "white",
            marginBottom: "30px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "10px" }}>
                  {assessmentReport.classification.icon} Total Score
                </div>
                <div style={{ fontSize: "56px", fontWeight: "800", marginBottom: "10px" }}>
                  {assessmentReport.totalScore}
                  <span style={{ fontSize: "24px", opacity: 0.7, marginLeft: "10px" }}>
                    /{assessmentReport.maxPossible}
                  </span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "5px" }}>
                  {assessmentReport.classification.name}
                </div>
                <div style={{ fontSize: "15px", opacity: 0.9 }}>
                  {assessmentReport.percentage}% • Grade {assessmentReport.gradeInfo.grade}
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
                {assessmentReport.percentage}%
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
            display: "inline-flex"
          }}>
            <button
              onClick={() => setActiveTab("analysis")}
              style={{
                padding: "12px 30px",
                background: activeTab === "analysis" ? config.gradient : 'transparent',
                color: activeTab === "analysis" ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: "50px",
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📈 Strengths & Weaknesses
            </button>
            <button
              onClick={() => setActiveTab("answers")}
              style={{
                padding: "12px 30px",
                background: activeTab === "answers" ? config.gradient : 'transparent',
                color: activeTab === "answers" ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: "50px",
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📝 All Answers
            </button>
          </div>

          {/* Analysis Tab - Strengths & Weaknesses */}
          {activeTab === "analysis" && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "30px"
            }}>
              <h3 style={{ fontSize: "22px", marginBottom: "25px", color: "#2d3748" }}>
                Answer-Based Analysis
              </h3>
              
              {/* Strengths */}
              <div style={{ marginBottom: "40px" }}>
                <h4 style={{ 
                  fontSize: "18px", 
                  color: "#2d3748", 
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{
                    background: "#4ECDC4",
                    color: "white",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>✓</span>
                  Strengths (Based on Actual Answers)
                </h4>
                
                {assessmentReport.strengths.length === 0 ? (
                  <p style={{ color: "#718096", padding: "20px", background: "#f8fafc", borderRadius: "8px" }}>
                    No strengths identified from answer patterns.
                  </p>
                ) : (
                  assessmentReport.strengths.map((strength, i) => (
                    <div key={i} style={{
                      padding: "20px",
                      background: "#f0fff4",
                      borderRadius: "12px",
                      marginBottom: "15px",
                      border: "1px solid #9AE6B4"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        marginBottom: "10px"
                      }}>
                        <span style={{
                          background: "#C6F6D5",
                          color: "#22543D",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {strength.group} • Score: {strength.score}/5
                        </span>
                      </div>
                      <p style={{ margin: "0 0 10px 0", color: "#22543D", fontSize: "14px" }}>
                        <strong>Question:</strong> {strength.question}
                      </p>
                      <div style={{
                        padding: "12px",
                        background: "white",
                        borderRadius: "8px",
                        borderLeft: "4px solid #48BB78"
                      }}>
                        <strong>Answer:</strong> {strength.answer}
                      </div>
                      <p style={{ marginTop: "10px", color: "#2F855A", fontSize: "13px" }}>
                        {strength.reason}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Weaknesses */}
              <div>
                <h4 style={{ 
                  fontSize: "18px", 
                  color: "#2d3748", 
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{
                    background: "#FF6B6B",
                    color: "white",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>!</span>
                  Development Areas (Based on Actual Answers)
                </h4>
                
                {assessmentReport.weaknesses.length === 0 ? (
                  <p style={{ color: "#718096", padding: "20px", background: "#f8fafc", borderRadius: "8px" }}>
                    No significant development areas identified.
                  </p>
                ) : (
                  assessmentReport.weaknesses.map((weakness, i) => (
                    <div key={i} style={{
                      padding: "20px",
                      background: "#fff5f5",
                      borderRadius: "12px",
                      marginBottom: "15px",
                      border: "1px solid #FEB2B2"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        marginBottom: "10px"
                      }}>
                        <span style={{
                          background: "#FED7D7",
                          color: "#9B2C2C",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {weakness.group} • Score: {weakness.score}/5
                        </span>
                      </div>
                      <p style={{ margin: "0 0 10px 0", color: "#9B2C2C", fontSize: "14px" }}>
                        <strong>Question:</strong> {weakness.question}
                      </p>
                      <div style={{
                        padding: "12px",
                        background: "white",
                        borderRadius: "8px",
                        borderLeft: "4px solid #F56565"
                      }}>
                        <strong>Answer:</strong> {weakness.answer}
                      </div>
                      <p style={{ marginTop: "10px", color: "#C53030", fontSize: "13px" }}>
                        {weakness.reason}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Recommendations */}
              <div style={{ marginTop: "30px" }}>
                <h4 style={{ 
                  fontSize: "18px", 
                  color: "#2d3748", 
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{
                    background: "#667eea",
                    color: "white",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>💡</span>
                  Personalized Recommendations
                </h4>
                
                {assessmentReport.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    padding: "15px",
                    background: rec.priority === "High" ? "#FED7D7" : "#FEFCBF",
                    borderRadius: "8px",
                    marginBottom: "10px",
                    border: `1px solid ${rec.priority === "High" ? "#FEB2B2" : "#FEEBC8"}`
                  }}>
                    <div style={{ 
                      fontSize: "12px", 
                      fontWeight: "600",
                      color: rec.priority === "High" ? "#9B2C2C" : "#975A16",
                      marginBottom: "5px"
                    }}>
                      {rec.priority} Priority
                    </div>
                    <div style={{ fontSize: "14px", color: "#4a5568" }}>
                      {rec.type === "overall" ? rec.text : (
                        <>
                          <strong>{rec.group}:</strong> {rec.text}
                          {rec.action && <div style={{ marginTop: "5px" }}>→ {rec.action}</div>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answers Tab - All Questions and Answers */}
          {activeTab === "answers" && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "30px"
            }}>
              <h3 style={{ fontSize: "22px", marginBottom: "20px", color: "#2d3748" }}>
                All Questions and Answers
              </h3>
              
              <div style={{ 
                marginBottom: "20px", 
                padding: "15px", 
                background: "#f8fafc", 
                borderRadius: "8px",
                display: "flex",
                gap: "20px"
              }}>
                <div><strong>Total Questions:</strong> {assessmentReport.responseCount}</div>
                <div><strong>Total Score:</strong> {assessmentReport.totalScore}/{assessmentReport.maxPossible}</div>
                <div><strong>Percentage:</strong> {assessmentReport.percentage}%</div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {assessmentReport.answerDetails.map((answer, index) => {
                  const isHighScore = answer.score >= 4;
                  const isLowScore = answer.score <= 2;
                  
                  return (
                    <div key={index} style={{
                      padding: "20px",
                      background: isHighScore ? "#f0fff4" : isLowScore ? "#fff5f5" : "#ffffff",
                      borderRadius: "12px",
                      border: `2px solid ${
                        isHighScore ? "#9AE6B4" : isLowScore ? "#FEB2B2" : config.border
                      }`
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        marginBottom: "15px",
                        flexWrap: "wrap",
                        gap: "10px"
                      }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{
                            background: config.color,
                            color: "white",
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: "600"
                          }}>
                            {index + 1}
                          </span>
                          <span style={{
                            padding: "4px 12px",
                            background: isHighScore ? "#C6F6D5" : isLowScore ? "#FED7D7" : "#EDF2F7",
                            color: isHighScore ? "#22543D" : isLowScore ? "#9B2C2C" : "#4a5568",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}>
                            Score: {answer.score}/5
                          </span>
                          <span style={{
                            padding: "4px 12px",
                            background: config.lightBg,
                            color: config.color,
                            borderRadius: "20px",
                            fontSize: "12px"
                          }}>
                            {answer.group}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>Question:</div>
                        <div style={{ fontSize: "14px", color: "#4a5568", padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                          {answer.question}
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>Answer:</div>
                        <div style={{
                          fontSize: "14px",
                          color: isHighScore ? "#22543D" : isLowScore ? "#9B2C2C" : "#4a5568",
                          padding: "10px",
                          background: "white",
                          borderRadius: "8px",
                          border: `1px solid ${isHighScore ? "#48BB78" : isLowScore ? "#F56565" : config.border}`,
                          borderLeft: `4px solid ${isHighScore ? "#48BB78" : isLowScore ? "#F56565" : config.color}`
                        }}>
                          {answer.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
