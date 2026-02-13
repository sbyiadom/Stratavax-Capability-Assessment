// pages/supervisor/[user_id].js - COMPLETE DETAILED CANDIDATE REPORT
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateDetailReport() {
  const router = useRouter();
  const { user_id, assessment } = router.query;
  const selectedAssessment = assessment || 'General Assessment';
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [responses, setResponses] = useState([]);
  const [sectionScores, setSectionScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState('');

  // Assessment type configurations
  const ASSESSMENT_CONFIG = {
    'General Assessment': {
      icon: '📋',
      color: '#4A6FA5',
      gradient: 'linear-gradient(135deg, #4A6FA5, #6B8EC9)',
      lightBg: '#E8EEF5',
      maxScore: 500,
      sections: [
        'Cognitive Abilities',
        'Personality Assessment',
        'Leadership Potential',
        'Technical Competence',
        'Performance Metrics',
        'Behavioral Analysis'
      ]
    },
    'Behavioral & Soft Skills': {
      icon: '🧠',
      color: '#9C27B0',
      gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
      lightBg: '#F3E5F5',
      maxScore: 100,
      sections: ['Communication', 'Teamwork', 'Emotional Intelligence', 'Adaptability', 'Conflict Resolution']
    },
    'Cognitive & Thinking Skills': {
      icon: '💡',
      color: '#FF9800',
      gradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
      lightBg: '#FFF3E0',
      maxScore: 100,
      sections: ['Analytical Thinking', 'Problem Solving', 'Critical Thinking', 'Logical Reasoning']
    },
    'Cultural & Attitudinal Fit': {
      icon: '🤝',
      color: '#4CAF50',
      gradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
      lightBg: '#E8F5E9',
      maxScore: 100,
      sections: ['Values Alignment', 'Work Ethic', 'Adaptability', 'Team Orientation']
    },
    'Manufacturing Technical Skills': {
      icon: '⚙️',
      color: '#F44336',
      gradient: 'linear-gradient(135deg, #F44336, #EF5350)',
      lightBg: '#FFEBEE',
      maxScore: 100,
      sections: ['CNC Machines', 'Assembly Line', 'Quality Control', 'Safety Protocols', 'Maintenance']
    },
    'Leadership Potential': {
      icon: '👑',
      color: '#FFC107',
      gradient: 'linear-gradient(135deg, #FFC107, #FFD54F)',
      lightBg: '#FFF8E1',
      maxScore: 100,
      sections: ['Vision', 'Influence', 'Team Development', 'Decision Making', 'Strategic Thinking']
    }
  };

  const config = ASSESSMENT_CONFIG[selectedAssessment] || ASSESSMENT_CONFIG['General Assessment'];

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

  // Get grade based on percentage
  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: '#00B894', label: 'Exceptional' };
    if (percentage >= 85) return { grade: 'A', color: '#00B894', label: 'Outstanding' };
    if (percentage >= 80) return { grade: 'A-', color: '#00B894', label: 'Excellent' };
    if (percentage >= 75) return { grade: 'B+', color: '#0984E3', label: 'Very Good' };
    if (percentage >= 70) return { grade: 'B', color: '#0984E3', label: 'Good' };
    if (percentage >= 65) return { grade: 'B-', color: '#0984E3', label: 'Above Average' };
    if (percentage >= 60) return { grade: 'C+', color: '#FDCB6E', label: 'Satisfactory' };
    if (percentage >= 55) return { grade: 'C', color: '#FDCB6E', label: 'Adequate' };
    if (percentage >= 50) return { grade: 'C-', color: '#FDCB6E', label: 'Developing' };
    if (percentage >= 45) return { grade: 'D+', color: '#FF7675', label: 'Below Average' };
    if (percentage >= 40) return { grade: 'D', color: '#FF7675', label: 'Poor' };
    return { grade: 'F', color: '#D63031', label: 'Unsatisfactory' };
  };

  // Get interpretation based on score and section
  const getInterpretation = (score, maxScore, section) => {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 80) {
      return `Excellent performance in ${section}. This is a significant strength.`;
    } else if (percentage >= 70) {
      return `Good performance in ${section}. Shows solid understanding.`;
    } else if (percentage >= 60) {
      return `Satisfactory performance in ${section}. Meets basic requirements.`;
    } else if (percentage >= 50) {
      return `Developing skills in ${section}. Needs focused improvement.`;
    } else {
      return `Significant opportunity for growth in ${section}. Requires attention.`;
    }
  };

  // Fetch candidate data and responses
  useEffect(() => {
    if (!user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setDebug('Fetching candidate data...\n');

        // Get candidate info from candidate_assessments
        const { data: candidateData, error: candidateError } = await supabase
          .from("candidate_assessments")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (candidateError) {
          setDebug(prev => prev + `Candidate not in assessments table, using ID only\n`);
          setCandidate({
            user_id: user_id,
            full_name: `Candidate ${user_id.substring(0, 8)}`,
            email: "Email not available",
            total_score: 0
          });
        } else {
          setDebug(prev => prev + `Found candidate: ${candidateData.full_name}\n`);
          setCandidate(candidateData);
        }

        // Fetch all responses for this user
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(`
            id,
            question_id,
            answer_id,
            created_at,
            answers (
              score,
              answer_text
            )
          `)
          .eq("user_id", user_id);

        if (responsesError) {
          setDebug(prev => prev + `Error fetching responses: ${responsesError.message}\n`);
          throw responsesError;
        }

        setDebug(prev => prev + `Found ${responsesData?.length || 0} responses\n`);

        if (!responsesData || responsesData.length === 0) {
          setDebug(prev => prev + `No responses found for this candidate\n`);
          setResponses([]);
          setLoading(false);
          return;
        }

        // Get question details for all responses
        const questionIds = [...new Set(responsesData.map(r => r.question_id))];
        
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("id, question_text, section, subsection")
          .in("id", questionIds);

        if (questionsError) {
          setDebug(prev => prev + `Error fetching questions: ${questionsError.message}\n`);
        }

        // Create a map of question details
        const questionMap = {};
        if (questionsData) {
          questionsData.forEach(q => {
            questionMap[q.id] = q;
          });
        }

        // Enhance responses with question details
        const enhancedResponses = responsesData.map(response => ({
          ...response,
          question: questionMap[response.question_id] || {
            section: 'General',
            subsection: 'General',
            question_text: 'Unknown question'
          }
        }));

        setResponses(enhancedResponses);

        // Group responses by section
        const sectionTotals = {};
        const sectionCounts = {};

        enhancedResponses.forEach(response => {
          const section = response.question.section || 'General';
          const score = response.answers?.score || 0;
          
          if (!sectionTotals[section]) {
            sectionTotals[section] = 0;
            sectionCounts[section] = 0;
          }
          
          sectionTotals[section] += score;
          sectionCounts[section] += 1;
        });

        setDebug(prev => prev + `Sections found: ${Object.keys(sectionTotals).join(', ')}\n`);

        // Calculate section scores
        const scores = {};
        const strengthsList = [];
        const weaknessesList = [];

        Object.keys(sectionTotals).forEach(section => {
          const total = sectionTotals[section];
          const count = sectionCounts[section];
          const maxPossible = count * 5;
          const percentage = Math.round((total / maxPossible) * 100);
          const grade = getGrade(percentage);
          const interpretation = getInterpretation(total, maxPossible, section);
          
          scores[section] = {
            total,
            maxPossible,
            count,
            percentage,
            grade,
            interpretation
          };

          // Identify strengths (80% or above)
          if (percentage >= 80) {
            strengthsList.push({
              section,
              percentage,
              grade: grade.grade,
              interpretation: `Strong performance: ${interpretation}`
            });
          }
          
          // Identify weaknesses (below 60%)
          if (percentage < 60) {
            weaknessesList.push({
              section,
              percentage,
              grade: grade.grade,
              interpretation: `Area for improvement: ${interpretation}`
            });
          }
        });

        setSectionScores(scores);
        setStrengths(strengthsList);
        setWeaknesses(weaknessesList);

        // Generate recommendations based on weaknesses
        const recommendationsList = [];
        
        if (weaknessesList.length > 0) {
          weaknessesList.forEach(weakness => {
            recommendationsList.push({
              area: weakness.section,
              recommendation: `Focus on improving ${weakness.section.toLowerCase()} through targeted training and practice.`,
              priority: weakness.percentage < 50 ? 'High' : 'Medium'
            });
          });
        } else {
          recommendationsList.push({
            area: 'Overall',
            recommendation: 'Excellent performance across all sections. Consider advanced development opportunities.',
            priority: 'Low'
          });
        }

        setRecommendations(recommendationsList);

      } catch (err) {
        console.error("Error:", err);
        setDebug(prev => prev + `\nError: ${err.message}`);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [user_id]);

  const handleBack = () => {
    router.push(`/supervisor?assessment=${encodeURIComponent(selectedAssessment)}`);
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
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h3>Loading Candidate Report</h3>
            <p style={{ color: '#718096' }}>Analyzing responses...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !candidate) {
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
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h2>Error Loading Report</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>{error || 'Candidate not found'}</p>
            <button
              onClick={handleBack}
              style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Calculate overall score
  const totalScore = Object.values(sectionScores).reduce((sum, s) => sum + s.total, 0);
  const totalMaxPossible = Object.values(sectionScores).reduce((sum, s) => sum + s.maxPossible, 0);
  const overallPercentage = totalMaxPossible > 0 ? Math.round((totalScore / totalMaxPossible) * 100) : 0;
  const overallGrade = getGrade(overallPercentage);

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
            background: "white",
            borderRadius: "16px",
            padding: "20px 30px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <button
              onClick={handleBack}
              style={{
                padding: "10px 24px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ display: 'flex', gap: '20px', color: '#64748b' }}>
              <span>📅 {new Date().toLocaleDateString()}</span>
              <span>🆔 {user_id.substring(0, 12)}...</span>
            </div>
          </div>

          {/* Candidate Info Card */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "40px",
                background: config.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                color: "white"
              }}>
                {candidate.full_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 style={{ margin: "0 0 5px 0", fontSize: "28px", color: "#1e293b" }}>
                  {candidate.full_name}
                </h1>
                <p style={{ margin: 0, color: "#64748b", fontSize: "16px" }}>
                  📧 {candidate.email} • 📋 {selectedAssessment}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Score Card */}
          <div style={{
            background: config.gradient,
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            color: "white",
            boxShadow: "0 8px 20px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "10px" }}>
                  {config.icon} Overall Performance
                </div>
                <div style={{ fontSize: "48px", fontWeight: "700", marginBottom: "10px" }}>
                  {totalScore}
                  <span style={{ fontSize: "24px", opacity: 0.7, marginLeft: "10px" }}>
                    /{totalMaxPossible}
                  </span>
                </div>
                <div style={{ fontSize: "20px", fontWeight: "600", marginBottom: "5px" }}>
                  Grade: {overallGrade.grade} • {overallPercentage}%
                </div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>
                  {overallGrade.label}
                </div>
              </div>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "60px",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: "700",
                border: "4px solid rgba(255,255,255,0.3)"
              }}>
                {overallPercentage}%
              </div>
            </div>
          </div>

          {/* Debug Info - Remove in production */}
          {debug && (
            <div style={{
              background: '#f1f5f9',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              color: '#334155'
            }}>
              <strong>Debug:</strong>
              <div>{debug}</div>
            </div>
          )}

          {/* Section Scores Grid */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#1e293b" }}>
              📊 Section Performance Breakdown
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {Object.entries(sectionScores).map(([section, data]) => (
                <div key={section} style={{
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: `1px solid ${data.percentage >= 70 ? '#9AE6B4' : data.percentage >= 50 ? '#FEEBC8' : '#FED7D7'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '600' }}>{section}</h3>
                    <span style={{
                      padding: '4px 12px',
                      background: data.grade.color + '20',
                      color: data.grade.color,
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {data.grade.grade} • {data.percentage}%
                    </span>
                  </div>
                  
                  <div style={{
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${data.percentage}%`,
                      background: data.grade.color,
                      borderRadius: '4px'
                    }} />
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '8px' }}>
                    Score: {data.total}/{data.maxPossible} • {data.count} questions
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#2d3748',
                    borderLeft: `4px solid ${data.grade.color}`
                  }}>
                    {data.interpretation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Strengths */}
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ 
                margin: "0 0 20px 0", 
                fontSize: "18px", 
                color: "#1e293b",
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
                  justifyContent: 'center'
                }}>✓</span>
                Key Strengths
              </h2>
              
              {strengths.length === 0 ? (
                <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>
                  No specific strengths identified
                </p>
              ) : (
                strengths.map((strength, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: '#f0fff4',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: '1px solid #9AE6B4'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontWeight: '600', color: '#22543D' }}>{strength.section}</span>
                      <span style={{
                        padding: '2px 8px',
                        background: '#C6F6D5',
                        color: '#22543D',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {strength.grade} • {strength.percentage}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#22543D' }}>
                      {strength.interpretation}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Weaknesses */}
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ 
                margin: "0 0 20px 0", 
                fontSize: "18px", 
                color: "#1e293b",
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
                  justifyContent: 'center'
                }}>!</span>
                Development Areas
              </h2>
              
              {weaknesses.length === 0 ? (
                <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>
                  No significant development areas identified
                </p>
              ) : (
                weaknesses.map((weakness, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: '#fff5f5',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: '1px solid #FEB2B2'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontWeight: '600', color: '#9B2C2C' }}>{weakness.section}</span>
                      <span style={{
                        padding: '2px 8px',
                        background: '#FED7D7',
                        color: '#9B2C2C',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {weakness.grade} • {weakness.percentage}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#9B2C2C' }}>
                      {weakness.interpretation}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              fontSize: "18px", 
              color: "#1e293b",
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
                justifyContent: 'center'
              }}>💡</span>
              Development Recommendations
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: '15px',
                  background: rec.priority === 'High' ? '#FED7D7' : rec.priority === 'Medium' ? '#FEFCBF' : '#E6FFFA',
                  borderRadius: '8px',
                  border: `1px solid ${rec.priority === 'High' ? '#FEB2B2' : rec.priority === 'Medium' ? '#FEEBC8' : '#9AE6B4'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#2d3748' }}>{rec.area}</span>
                    <span style={{
                      padding: '2px 8px',
                      background: rec.priority === 'High' ? '#FED7D7' : rec.priority === 'Medium' ? '#FEFCBF' : '#C6F6D5',
                      color: rec.priority === 'High' ? '#9B2C2C' : rec.priority === 'Medium' ? '#975A16' : '#22543D',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#4a5568' }}>
                    {rec.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Responses Section */}
          {responses.length > 0 && (
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              marginBottom: "30px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#1e293b" }}>
                📝 Detailed Response Analysis
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {responses.slice(0, 10).map((response, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '5px' }}>
                      Q: {response.question.question_text}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#4a5568',
                      padding: '10px',
                      background: 'white',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${(response.answers?.score || 0) >= 4 ? '#48BB78' : (response.answers?.score || 0) <= 2 ? '#F56565' : '#A0AEC0'}`
                    }}>
                      <strong>Answer:</strong> {response.answers?.answer_text || 'No answer text'} 
                      <span style={{ marginLeft: '10px', color: '#718096' }}>(Score: {response.answers?.score || 0}/5)</span>
                    </div>
                  </div>
                ))}
                {responses.length > 10 && (
                  <p style={{ textAlign: 'center', color: '#718096', marginTop: '10px' }}>
                    Showing 10 of {responses.length} responses
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "20px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "12px"
          }}>
            <p>Comprehensive Assessment Report • Generated on {new Date().toLocaleString()}</p>
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
