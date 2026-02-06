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
  const [userInfo, setUserInfo] = useState({ email: "", full_name: "" });
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

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

  // Fetch ALL candidate data - FIXED TO GET REAL NAMES AND CATEGORY SCORES
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching detailed report for candidate: ${user_id}`);

        // 1. Get candidate's classification and score from talent_classification
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (classificationError) {
          console.error("No classification found:", classificationError);
          setCandidate(null);
          setLoading(false);
          return;
        }

        // 2. Get REAL user info from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (profileData) {
          setUserInfo({
            email: profileData.email,
            full_name: profileData.full_name || profileData.email?.split('@')[0] || "Candidate"
          });
        } else {
          // Fallback to users table
          const { data: userData } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", user_id)
            .single();

          if (userData) {
            setUserInfo({
              email: userData.email,
              full_name: userData.full_name || userData.email?.split('@')[0] || "Candidate"
            });
          }
        }

        // Set candidate basic info
        setCandidate({
          total_score: classificationData.total_score,
          classification: classificationData.classification,
          user_id: classificationData.user_id
        });

        // 3. Get ALL responses for this candidate to calculate category scores
        const { data: responsesData } = await supabase
          .from("responses")
          .select(`
            *,
            questions!inner (
              section,
              question_text
            ),
            answers!inner (
              score,
              answer_text,
              interpretation
            )
          `)
          .eq("user_id", user_id);

        if (responsesData && responsesData.length > 0) {
          setResponses(responsesData);
          
          // Calculate category scores from responses
          const calculatedScores = calculateCategoryScores(responsesData);
          setCategoryScores(calculatedScores);
          
          // Calculate strengths and weaknesses
          const { strengths: candidateStrengths, weaknesses: candidateWeaknesses } = 
            calculateStrengthsAndWeaknesses(calculatedScores);
          setStrengths(candidateStrengths);
          setWeaknesses(candidateWeaknesses);
          
          // Generate recommendations
          const candidateRecommendations = generateRecommendations(calculatedScores);
          setRecommendations(candidateRecommendations);
          
          console.log("Calculated category scores:", calculatedScores);
        } else {
          console.log("No responses found for this candidate");
        }

      } catch (err) {
        console.error("Error loading candidate data:", err);
      } finally {
        setLoading(false);
      }
    };

    // Function to calculate category scores from responses
    const calculateCategoryScores = (responses) => {
      const categoryData = {};
      
      responses.forEach(response => {
        const category = response.questions?.section || "Unknown";
        const score = response.answers?.score || 0;
        
        if (!categoryData[category]) {
          categoryData[category] = {
            totalScore: 0,
            count: 0,
            scores: []
          };
        }
        
        categoryData[category].totalScore += score;
        categoryData[category].count += 1;
        categoryData[category].scores.push(score);
      });

      // Format the results
      const formattedScores = {};
      Object.keys(categoryData).forEach(category => {
        const data = categoryData[category];
        const totalScore = data.totalScore;
        const questionCount = data.count;
        const averageScore = questionCount > 0 ? (totalScore / questionCount).toFixed(2) : 0;
        const maxPossibleScore = questionCount * 5; // Assuming max 5 points per question
        const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
        
        formattedScores[category] = {
          score: totalScore,
          questions: questionCount,
          average: parseFloat(averageScore),
          percentage: percentage,
          level: percentage >= 80 ? 'STRONG' : 
                 percentage >= 60 ? 'GOOD' : 
                 percentage >= 40 ? 'NEEDS_IMPROVEMENT' : 'WEAK',
          max_possible: maxPossibleScore
        };
      });

      return formattedScores;
    };

    // Function to calculate strengths and weaknesses
    const calculateStrengthsAndWeaknesses = (categoryScores) => {
      const strengths = [];
      const weaknesses = [];
      
      Object.entries(categoryScores).forEach(([category, data]) => {
        if (data.percentage >= 75) {
          strengths.push(category);
        } else if (data.percentage < 60) {
          weaknesses.push(category);
        }
      });
      
      return { strengths, weaknesses };
    };

    // Function to generate recommendations
    const generateRecommendations = (categoryScores) => {
      const recommendations = [];
      
      Object.entries(categoryScores).forEach(([category, data]) => {
        const percentage = data.percentage || 0;
        
        if (percentage < 60) {
          recommendations.push({
            category: category,
            issue: `Low performance in ${category}`,
            recommendation: percentage < 50 
              ? `Urgent improvement needed. Consider focused training in ${category}.`
              : `Needs improvement. Recommend targeted practice in ${category}.`,
            priority: percentage < 50 ? "High" : "Medium"
          });
        }
      });
      
      return recommendations;
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Cognitive Abilities': '#4A6FA5',
      'Technical Competence': '#2E7D32',
      'Personality Assessment': '#9C27B0',
      'Leadership Potential': '#D32F2F',
      'Performance Metrics': '#F57C00',
      'Cognitive': '#4A6FA5',
      'Technical': '#2E7D32',
      'Personality': '#9C27B0',
      'Leadership': '#D32F2F',
      'Performance': '#F57C00',
      'Unknown': '#666'
    };
    return colors[category] || '#666';
  };

  const calculateGrade = (score) => {
    if (score >= 450) return 'A+';
    if (score >= 400) return 'A';
    if (score >= 350) return 'B';
    if (score >= 300) return 'C';
    if (score >= 250) return 'D';
    return 'E';
  };

  // Loading and error states
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
            No assessment data found for this candidate.
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
              <div style={{ 
                margin: "0", 
                color: "#666",
                fontSize: "16px"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "5px", fontSize: "18px" }}>
                  {userInfo.full_name || "Candidate"}
                </div>
                <div style={{ color: "#1565c0", fontSize: "14px" }}>
                  {userInfo.email || "No email available"}
                </div>
              </div>
            </div>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px 20px", 
              borderRadius: "10px",
              minWidth: "200px",
              border: "1px solid #e0e0e0"
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
                color: candidate.classification === 'Top Talent' ? "#4CAF50" :
                       candidate.classification === 'High Potential' ? "#2196F3" :
                       candidate.classification === 'Solid Performer' ? "#FF9800" :
                       candidate.classification === 'Developing' ? "#9C27B0" : "#F44336"
              }}>
                {candidate.classification}
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
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>Overall Assessment Score</div>
                <div style={{ fontSize: "48px", fontWeight: "700", margin: "10px 0" }}>
                  {candidate.total_score}/500
                </div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>
                  Based on {responses.length} responses across {Object.keys(categoryScores).length} categories
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
                    {calculateGrade(candidate.total_score)}
                  </div>
                </div>
                <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.8 }}>
                  Performance Grade
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Scores - MAIN SECTION - WILL SHOW ALL 5 CATEGORIES */}
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
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <p><strong>Calculating category scores...</strong></p>
              <p style={{ fontSize: "14px", marginTop: "10px", color: "#666" }}>
                Loading detailed category breakdown from candidate responses.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {Object.entries(categoryScores).map(([category, stats]) => {
                const percentage = stats.percentage || 0;
                const score = stats.score || 0;
                const questions = stats.questions || 0;
                const average = stats.average || 0;
                const level = stats.level || 'N/A';
                
                return (
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
                          {questions} questions • Average: {average}/5
                        </p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ 
                          fontSize: "28px", 
                          fontWeight: "700",
                          color: getCategoryColor(category)
                        }}>
                          {percentage}%
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          Score
                        </div>
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
                        width: `${percentage}%`, 
                        background: getCategoryColor(category),
                        borderRadius: "5px"
                      }} />
                    </div>
                    
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      fontSize: "12px", 
                      color: "#666",
                      marginTop: "10px"
                    }}>
                      <div>
                        <div style={{ fontWeight: "600" }}>Total Score</div>
                        <div>{score}/{questions * 5}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600" }}>Performance Level</div>
                        <div style={{ 
                          color: (level === 'STRONG' || level === 'GOOD') ? '#4CAF50' : '#F44336',
                          fontWeight: "600"
                        }}>
                          {level}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600" }}>Performance</div>
                        <div>
                          {percentage >= 80 ? 'Excellent' :
                           percentage >= 60 ? 'Good' :
                           percentage >= 40 ? 'Average' : 'Needs Improvement'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Key Strengths</h2>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "15px" 
            }}>
              {strengths.map((strength, index) => (
                <div key={index} style={{
                  padding: "15px",
                  background: "#e8f5e9",
                  borderRadius: "8px",
                  borderLeft: "4px solid #4CAF50"
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px",
                    marginBottom: "8px"
                  }}>
                    <span style={{ 
                      background: "#4CAF50", 
                      color: "white", 
                      width: "28px", 
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}>
                      ✓
                    </span>
                    <span style={{ fontWeight: "600", color: "#2e7d32" }}>
                      {strength}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#555" }}>
                    {categoryScores[strength] ? 
                      `Score: ${categoryScores[strength].percentage}%` : 
                      'Strong performance area'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Areas Needing Improvement</h2>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "15px" 
            }}>
              {weaknesses.map((weakness, index) => (
                <div key={index} style={{
                  padding: "15px",
                  background: "#ffebee",
                  borderRadius: "8px",
                  borderLeft: "4px solid #F44336"
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px",
                    marginBottom: "8px"
                  }}>
                    <span style={{ 
                      background: "#F44336", 
                      color: "white", 
                      width: "28px", 
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}>
                      !
                    </span>
                    <span style={{ fontWeight: "600", color: "#c62828" }}>
                      {weakness}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#555" }}>
                    {categoryScores[weakness] ? 
                      `Score: ${categoryScores[weakness].percentage}% - Needs attention` : 
                      'Requires development'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Recommendations</h2>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: rec.priority === "High" ? "#fff3e0" : "#e3f2fd",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${rec.priority === "High" ? "#FF9800" : "#2196F3"}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px"
                  }}>
                    <div>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        marginBottom: "5px"
                      }}>
                        <span style={{ 
                          fontWeight: "600", 
                          color: rec.priority === "High" ? "#E65100" : "#1565c0",
                          fontSize: "16px"
                        }}>
                          {rec.category}
                        </span>
                        <span style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          background: rec.priority === "High" ? "#FF9800" : "#2196F3",
                          color: "white",
                          borderRadius: "12px",
                          fontWeight: "600"
                        }}>
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p style={{ 
                        margin: "0 0 10px 0", 
                        fontSize: "14px", 
                        color: "#555" 
                      }}>
                        {rec.issue}
                      </p>
                    </div>
                  </div>
                  <p style={{ 
                    margin: "0", 
                    fontSize: "13px", 
                    color: "#666",
                    lineHeight: "1.5"
                  }}>
                    <strong>Action:</strong> {rec.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
