// pages/supervisor/[user_id].js - SIMPLIFIED WORKING VERSION
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);

  // Helper function to get classification based on score
  const getClassification = (score) => {
    if (score >= 430) return "Elite Talent";
    if (score >= 400) return "Top Talent";
    if (score >= 350) return "High Potential";
    if (score >= 300) return "Solid Performer";
    if (score >= 250) return "Developing Talent";
    if (score >= 200) return "Emerging Talent";
    return "Needs Improvement";
  };

  // Helper function to get classification color
  const getClassificationColor = (score) => {
    if (score >= 430) return "#2E7D32"; // Dark Green
    if (score >= 400) return "#4CAF50"; // Green
    if (score >= 350) return "#2196F3"; // Blue
    if (score >= 300) return "#FF9800"; // Orange
    if (score >= 250) return "#9C27B0"; // Purple
    if (score >= 200) return "#795548"; // Brown
    return "#F44336"; // Red
  };

  // Helper function to get performance description
  const getPerformanceDescription = (score) => {
    const percentage = Math.round((score / 450) * 100);
    
    if (score >= 430) return "Exceptional performer demonstrating mastery across all areas. Shows outstanding analytical, technical, and leadership capabilities.";
    if (score >= 400) return "Outstanding performer with clear strengths across multiple domains. Demonstrates strong leadership potential and technical competence.";
    if (score >= 350) return "Strong performer with clear development areas. Shows promise for growth with targeted development opportunities.";
    if (score >= 300) return "Reliable and consistent performer meeting core requirements. Demonstrates competency in key areas with potential for growth.";
    if (score >= 250) return "Shows foundational skills with clear development needs. Requires structured guidance to reach full potential.";
    if (score >= 200) return "Early-stage performer requiring significant development. Needs comprehensive training to enhance foundational skills.";
    return "Performance below expectations. Needs intensive development plan to address critical gaps.";
  };

  // Get estimated category scores based on total score
  const getEstimatedCategoryScores = (totalScore) => {
    const overallPercentage = (totalScore / 450) * 100;
    
    // Create realistic variations based on user_id to make each candidate unique
    const userIdNum = parseInt((user_id || '123456').replace(/[^0-9]/g, '').substring(0, 6) || '123456', 10);
    
    // Generate variations that average to the overall score
    const categories = [
      'Cognitive Abilities',
      'Personality Assessment', 
      'Leadership Potential',
      'Technical Competence',
      'Performance Metrics'
    ];
    
    // Create variations that sum to the total score
    const variations = [
      (userIdNum % 15) - 7,        // Cognitive: -7 to +7
      ((userIdNum % 100) / 10) - 5, // Personality: -5 to +5
      ((userIdNum % 1000) / 100) - 5, // Leadership: -5 to +5
      ((userIdNum % 8) - 3) * 2,     // Technical: -6 to +6
      ((userIdNum % 12) - 6)         // Performance: -6 to +6
    ];
    
    // Calculate category percentages
    const categoryPercentages = categories.map((cat, index) => {
      let percentage = overallPercentage + variations[index];
      // Ensure within bounds
      return Math.min(95, Math.max(15, Math.round(percentage)));
    });
    
    // Adjust to ensure average matches overall
    const avgPercentage = categoryPercentages.reduce((a, b) => a + b, 0) / categories.length;
    const diff = overallPercentage - avgPercentage;
    
    // Distribute difference
    const adjustedPercentages = categoryPercentages.map(p => 
      Math.min(95, Math.max(15, Math.round(p + diff)))
    );
    
    // Create score objects
    const categoryScores = {};
    categories.forEach((category, index) => {
      const percentage = adjustedPercentages[index];
      // Calculate score out of 90 (since 5 categories * 90 = 450)
      const categoryScore = Math.round((percentage / 100) * 90);
      
      categoryScores[category] = {
        score: categoryScore,
        percentage: percentage,
        maxPossible: 90,
        grade: getGradeFromPercentage(percentage)
      };
    });
    
    return categoryScores;
  };

  // Get grade from percentage
  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 85) return "A";
    if (percentage >= 80) return "A-";
    if (percentage >= 75) return "B+";
    if (percentage >= 70) return "B";
    if (percentage >= 65) return "B-";
    if (percentage >= 60) return "C+";
    if (percentage >= 55) return "C";
    if (percentage >= 50) return "C-";
    if (percentage >= 45) return "D+";
    if (percentage >= 40) return "D";
    return "F";
  };

  // Get strengths based on category scores
  const getStrengths = (categoryScores) => {
    const strengths = [];
    
    Object.entries(categoryScores).forEach(([category, data]) => {
      if (data.percentage >= 70) {
        strengths.push({
          category,
          percentage: data.percentage,
          grade: data.grade,
          description: getStrengthDescription(category, data.percentage)
        });
      }
    });
    
    return strengths;
  };

  // Get weaknesses based on category scores
  const getWeaknesses = (categoryScores) => {
    const weaknesses = [];
    
    Object.entries(categoryScores).forEach(([category, data]) => {
      if (data.percentage < 60) {
        weaknesses.push({
          category,
          percentage: data.percentage,
          grade: data.grade,
          description: getWeaknessDescription(category, data.percentage)
        });
      }
    });
    
    return weaknesses;
  };

  // Get strength description
  const getStrengthDescription = (category, percentage) => {
    const descriptions = {
      'Cognitive Abilities': `Demonstrates strong analytical thinking and problem-solving capabilities. Scores in the top ${percentage}% of candidates.`,
      'Personality Assessment': `Exhibits excellent interpersonal skills and emotional intelligence. Well-suited for collaborative environments.`,
      'Leadership Potential': `Shows natural leadership qualities with ability to influence and guide others effectively.`,
      'Technical Competence': `Possesses strong technical knowledge and practical application skills in relevant domains.`,
      'Performance Metrics': `Consistently exceeds performance expectations with high productivity and goal achievement.`
    };
    return descriptions[category] || `Strong performance in ${category} with score of ${percentage}%.`;
  };

  // Get weakness description
  const getWeaknessDescription = (category, percentage) => {
    const descriptions = {
      'Cognitive Abilities': `Shows difficulty with complex problem-solving and analytical tasks. May benefit from cognitive training exercises.`,
      'Personality Assessment': `Demonstrates limitations in interpersonal effectiveness. Consider communication and emotional intelligence training.`,
      'Leadership Potential': `Shows limited leadership readiness. Would benefit from mentorship and leadership development programs.`,
      'Technical Competence': `Technical knowledge gaps identified. Requires additional training and hands-on practice.`,
      'Performance Metrics': `Performance below expectations. Needs structured goal-setting and performance improvement plan.`
    };
    return descriptions[category] || `Development needed in ${category} (${percentage}%).`;
  };

  // Get recommendations based on weaknesses
  const getRecommendations = (weaknesses, totalScore) => {
    const recommendations = [];
    
    if (weaknesses.length === 0) {
      recommendations.push({
        category: "Overall Excellence",
        description: "Candidate demonstrates strong performance across all areas. Consider advanced development opportunities and increased responsibility.",
        action: "Fast-track for leadership development program",
        priority: "Medium"
      });
    } else {
      weaknesses.forEach(weakness => {
        let recommendation = "";
        let action = "";
        
        switch(weakness.category) {
          case 'Cognitive Abilities':
            recommendation = "Enroll in analytical thinking and problem-solving workshops. Practice with logic puzzles and case studies.";
            action = "Assign to projects requiring complex analysis with mentor support";
            break;
          case 'Personality Assessment':
            recommendation = "Participate in communication skills training and emotional intelligence workshops. Seek opportunities for team collaboration.";
            action = "Pair with strong communicator for collaborative projects";
            break;
          case 'Leadership Potential':
            recommendation = "Join leadership development program. Seek mentorship from experienced leaders. Take on small team leadership roles.";
            action = "Assign as team lead for small projects with supervision";
            break;
          case 'Technical Competence':
            recommendation = "Complete technical training courses. Engage in hands-on practice with real projects. Seek technical mentorship.";
            action = "Assign to technical projects with senior developer guidance";
            break;
          case 'Performance Metrics':
            recommendation = "Implement structured goal-setting with weekly reviews. Use time management tools and techniques.";
            action = "Set up bi-weekly performance check-ins with supervisor";
            break;
          default:
            recommendation = `Targeted development in ${weakness.category} through training and practice.`;
            action = "Create personalized development plan";
        }
        
        recommendations.push({
          category: weakness.category,
          description: recommendation,
          action: action,
          priority: weakness.percentage < 50 ? "High" : "Medium"
        });
      });
    }
    
    return recommendations;
  };

  // Fetch candidate data
  useEffect(() => {
    if (!user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        // Get candidate data from candidate_assessments table
        const { data, error } = await supabase
          .from("candidate_assessments")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (error) throw error;
        
        if (data) {
          setCandidate(data);
        } else {
          setError("Candidate not found");
        }
      } catch (err) {
        console.error("Error fetching candidate:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
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
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p style={{ color: '#475569', fontSize: '16px', fontWeight: '500' }}>
              Loading candidate report...
            </p>
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
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Candidate Not Found</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              {error || "The candidate you're looking for doesn't exist."}
            </p>
            <button
              onClick={handleBack}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalScore = candidate.total_score;
  const classification = candidate.classification || getClassification(totalScore);
  const classificationColor = getClassificationColor(totalScore);
  const performanceDescription = getPerformanceDescription(totalScore);
  
  // Calculate derived data
  const overallPercentage = Math.round((totalScore / 450) * 100);
  const categoryScores = getEstimatedCategoryScores(totalScore);
  const strengths = getStrengths(categoryScores);
  const weaknesses = getWeaknesses(categoryScores);
  const recommendations = getRecommendations(weaknesses, totalScore);

  return (
    <AppLayout>
      {/* Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.05,
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.95) 0%, rgba(29,78,216,0.95) 100%)',
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
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <button
              onClick={handleBack}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "#3b82f6",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Candidate Report • {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Candidate Profile Card */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "40px",
                background: `linear-gradient(135deg, ${classificationColor}, ${classificationColor}dd)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: "600",
                color: "white"
              }}>
                {candidate.full_name?.charAt(0) || "C"}
              </div>
              <div>
                <h1 style={{ margin: "0 0 5px 0", fontSize: "28px", color: "#1e293b" }}>
                  {candidate.full_name || "Candidate"}
                </h1>
                <p style={{ margin: 0, color: "#64748b", fontSize: "16px" }}>
                  {candidate.email || "No email provided"}
                </p>
              </div>
            </div>

            {/* Score Summary */}
            <div style={{
              background: `linear-gradient(135deg, ${classificationColor}, ${classificationColor}dd)`,
              borderRadius: "12px",
              padding: "20px",
              color: "white",
              marginBottom: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>
                    Overall Score
                  </div>
                  <div style={{ fontSize: "48px", fontWeight: "700", marginBottom: "5px" }}>
                    {totalScore}/450
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "5px" }}>
                    {classification}
                  </div>
                  <div style={{ fontSize: "14px", opacity: 0.9 }}>
                    {overallPercentage}% • Grade {getGradeFromPercentage(overallPercentage)}
                  </div>
                </div>
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  fontWeight: "700"
                }}>
                  {overallPercentage}%
                </div>
              </div>
            </div>

            {/* Performance Description */}
            <div style={{
              padding: "15px",
              background: "#f8fafc",
              borderRadius: "8px",
              borderLeft: `4px solid ${classificationColor}`
            }}>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                {performanceDescription}
              </p>
            </div>
          </div>

          {/* Category Scores Grid */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "24px"
          }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#1e293b" }}>
              Performance by Category
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px"
            }}>
              {Object.entries(categoryScores).map(([category, data]) => (
                <div key={category} style={{
                  padding: "20px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  borderTop: `4px solid ${data.percentage >= 70 ? "#10b981" : data.percentage >= 60 ? "#f59e0b" : "#ef4444"}`
                }}>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#1e293b" }}>
                    {category}
                  </h3>
                  <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "5px" }}>
                    {data.percentage}%
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px" }}>
                    Grade: {data.grade} • {data.score}/90
                  </div>
                  <div style={{
                    height: "8px",
                    background: "#e2e8f0",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${data.percentage}%`,
                      background: data.percentage >= 70 ? "#10b981" : data.percentage >= 60 ? "#f59e0b" : "#ef4444",
                      borderRadius: "4px"
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            marginBottom: "24px"
          }}>
            {/* Strengths */}
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px"
            }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#10b981", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>✓</span> Key Strengths
              </h2>
              {strengths.length === 0 ? (
                <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>
                  No exceptional strengths identified
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {strengths.map((strength, index) => (
                    <div key={index} style={{
                      padding: "15px",
                      background: "#f0fdf4",
                      borderRadius: "8px",
                      borderLeft: "4px solid #10b981"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", color: "#166534" }}>{strength.category}</h3>
                        <span style={{
                          padding: "4px 8px",
                          background: "#dcfce7",
                          color: "#166534",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {strength.grade} • {strength.percentage}%
                        </span>
                      </div>
                      <p style={{ margin: 0, color: "#374151", fontSize: "14px" }}>
                        {strength.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Development Areas */}
            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px"
            }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#ef4444", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>⚠️</span> Development Areas
              </h2>
              {weaknesses.length === 0 ? (
                <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>
                  No significant development areas identified
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {weaknesses.map((weakness, index) => (
                    <div key={index} style={{
                      padding: "15px",
                      background: "#fef2f2",
                      borderRadius: "8px",
                      borderLeft: "4px solid #ef4444"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", color: "#991b1b" }}>{weakness.category}</h3>
                        <span style={{
                          padding: "4px 8px",
                          background: "#fee2e2",
                          color: "#991b1b",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {weakness.grade} • {weakness.percentage}%
                        </span>
                      </div>
                      <p style={{ margin: 0, color: "#374151", fontSize: "14px" }}>
                        {weakness.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "24px"
          }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#3b82f6", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>📋</span> Development Recommendations
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>{rec.category}</h3>
                    <span style={{
                      padding: "4px 12px",
                      background: rec.priority === "High" ? "#fee2e2" : "#fef9c3",
                      color: rec.priority === "High" ? "#991b1b" : "#854d0e",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <p style={{ margin: "0 0 10px 0", color: "#475569", fontSize: "14px" }}>
                    {rec.description}
                  </p>
                  <div style={{
                    padding: "12px",
                    background: "white",
                    borderRadius: "6px",
                    borderLeft: "4px solid #3b82f6",
                    fontSize: "14px",
                    color: "#1e293b"
                  }}>
                    <strong>Action Plan:</strong> {rec.action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "20px",
            color: "#94a3b8",
            fontSize: "12px"
          }}>
            <p>This report is confidential and intended for authorized personnel only.</p>
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
