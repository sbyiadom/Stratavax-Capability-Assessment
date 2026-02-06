import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/client";
import AppLayout from "../../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [userInfo, setUserInfo] = useState({ email: "", full_name: "" });
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [error, setError] = useState("");

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

  // Fetch ALL data for the candidate
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setError("");
        console.log("Fetching report for user:", user_id);

        // 1. Get candidate classification
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (classificationError) {
          console.error("Classification error:", classificationError);
          setError("Candidate assessment data not found");
          setLoading(false);
          return;
        }

        console.log("Classification found:", classificationData);
        setCandidate(classificationData);

        // 2. Get user info from multiple sources
        let email = "";
        let full_name = "";
        
        // First try auth.users via admin API
        try {
          const { data: { users }, error: authError } = await supabase.auth.admin.getUserById(user_id);
          if (!authError && users && users.length > 0) {
            const user = users[0];
            email = user.email || "";
            full_name = user.user_metadata?.full_name || 
                       user.user_metadata?.name ||
                       user.email?.split('@')[0] ||
                       `Candidate ${user_id.substring(0, 8)}`;
          }
        } catch (authErr) {
          console.log("Auth API failed, trying profiles table...");
        }

        // If still no email, try profiles table
        if (!email) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", user_id)
            .single()
            .catch(() => null);

          if (profileData?.email) {
            email = profileData.email;
            full_name = profileData.full_name || profileData.email.split('@')[0];
          }
        }

        // If still no email, try assessment_results
        if (!email) {
          const { data: assessmentData } = await supabase
            .from("assessment_results")
            .select("email, full_name")
            .eq("user_id", user_id)
            .single()
            .catch(() => null);

          if (assessmentData?.email) {
            email = assessmentData.email;
            full_name = assessmentData.full_name || assessmentData.email.split('@')[0];
          }
        }

        // Final fallback
        if (!email) {
          email = "Email not available";
          full_name = `Candidate ${user_id.substring(0, 8)}`;
        }

        setUserInfo({ email, full_name });

        // 3. Get ALL responses for this user with questions and answers
        console.log("Fetching responses for user...");
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(`
            id,
            user_id,
            question_id,
            answer_id,
            created_at,
            questions (
              id,
              question_text,
              category,
              section,
              difficulty_level
            ),
            answers (
              id,
              answer_text,
              score,
              is_correct
            )
          `)
          .eq("user_id", user_id);

        if (responsesError) {
          console.error("Responses error:", responsesError);
        } else if (responsesData && responsesData.length > 0) {
          console.log(`Found ${responsesData.length} responses`);
          setResponses(responsesData);
          
          // Calculate category scores
          const scores = calculateCategoryScores(responsesData);
          setCategoryScores(scores);
          console.log("Category scores calculated:", scores);
        } else {
          console.log("No responses found");
          setError("No detailed response data found for this candidate");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching candidate data:", err);
        setError("Failed to load candidate report");
        setLoading(false);
      }
    };

    // Calculate category scores from responses
    const calculateCategoryScores = (responses) => {
      const categoryData = {};
      
      responses.forEach(response => {
        const category = response.questions?.category || 
                        response.questions?.section || 
                        "Uncategorized";
        const score = response.answers?.score || 0;
        
        if (!categoryData[category]) {
          categoryData[category] = {
            totalScore: 0,
            count: 0,
            questionIds: new Set(),
            scores: []
          };
        }
        
        categoryData[category].totalScore += score;
        categoryData[category].count += 1;
        categoryData[category].questionIds.add(response.question_id);
        categoryData[category].scores.push(score);
      });

      // Format for display
      const formattedScores = {};
      Object.keys(categoryData).forEach(category => {
        const data = categoryData[category];
        const totalScore = data.totalScore;
        const questionCount = data.count;
        const maxPossibleScore = questionCount * 5; // Assuming 5 is max score per question
        const averageScore = questionCount > 0 ? (totalScore / questionCount).toFixed(2) : 0;
        const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
        
        formattedScores[category] = {
          totalScore: totalScore,
          questionCount: questionCount,
          averageScore: parseFloat(averageScore),
          percentage: percentage,
          maxPossible: maxPossibleScore,
          level: percentage >= 80 ? 'Excellent' : 
                 percentage >= 60 ? 'Good' : 
                 percentage >= 40 ? 'Average' : 'Needs Improvement'
        };
      });

      return formattedScores;
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  const getCategoryColor = (percentage) => {
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 60) return "#2196F3";
    if (percentage >= 40) return "#FF9800";
    return "#F44336";
  };

  const getLevelText = (percentage) => {
    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    if (percentage >= 40) return "Average";
    return "Needs Improvement";
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

  if (error || !candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          width: "90vw", 
          margin: "auto", 
          padding: "40px 20px",
          textAlign: "center" 
        }}>
          <h1 style={{ color: "#666", marginBottom: "20px" }}>Candidate Report</h1>
          <div style={{ 
            padding: "30px",
            background: "#ffebee",
            borderRadius: "10px",
            marginBottom: "30px",
            maxWidth: "600px",
            margin: "0 auto 30px"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>⚠️</div>
            <h3 style={{ color: "#c62828", marginBottom: "10px" }}>{error || "Candidate Not Found"}</h3>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              Could not load the candidate report. This might be because:
            </p>
            <ul style={{ 
              textAlign: "left", 
              display: "inline-block",
              color: "#666",
              marginBottom: "20px"
            }}>
              <li>The candidate hasn't completed the assessment</li>
              <li>There's no data in the talent_classification table</li>
              <li>The user_id is invalid or doesn't exist</li>
            </ul>
          </div>
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

  const totalQuestions = responses.length;
  const strengths = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage >= 70)
    .map(([category]) => category);
  
  const weaknesses = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage < 60)
    .map(([category]) => category);

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "20px"
          }}>
            <div style={{ flex: 1 }}>
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
                <div style={{ fontWeight: "600", marginBottom: "5px" }}>
                  {userInfo.full_name}
                </div>
                <div style={{ color: "#1565c0" }}>
                  {userInfo.email}
                </div>
                <div style={{ fontSize: "14px", color: "#888", marginTop: "5px" }}>
                  User ID: {user_id}
                </div>
              </div>
            </div>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px 20px", 
              borderRadius: "10px",
              minWidth: "250px",
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
              <div style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
                <div>Total Score: <strong>{candidate.total_score}/500</strong></div>
                <div>Questions Answered: <strong>{totalQuestions}</strong></div>
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
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px"
            }}>
              <div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>Overall Assessment Score</div>
                <div style={{ fontSize: "48px", fontWeight: "700", margin: "10px 0" }}>
                  {candidate.total_score}/500
                </div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>
                  Based on {totalQuestions} questions across {Object.keys(categoryScores).length} categories
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
                    {Math.round((candidate.total_score / 500) * 100)}%
                  </div>
                </div>
                <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.8 }}>
                  Overall Percentage
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown - MAIN FIX */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Performance Breakdown by Category</h2>
          
          {Object.keys(categoryScores).length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <p><strong>No detailed category data available</strong></p>
              <p style={{ fontSize: "14px", marginTop: "10px", color: "#666" }}>
                The candidate has completed the assessment, but detailed category breakdown is not available.
                This might be because response data is not linked to question categories.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {Object.entries(categoryScores).map(([category, data]) => {
                const color = getCategoryColor(data.percentage);
                return (
                  <div key={category} style={{
                    borderLeft: `4px solid ${color}`,
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
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          margin: "0 0 5px 0", 
                          color: color,
                          fontSize: "18px"
                        }}>
                          {category}
                        </h3>
                        <p style={{ 
                          margin: 0, 
                          fontSize: "14px", 
                          color: "#666" 
                        }}>
                          {data.questionCount} questions • Average: {data.averageScore.toFixed(1)}/5
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ 
                          fontSize: "28px", 
                          fontWeight: "700",
                          color: color
                        }}>
                          {data.percentage}%
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
                        width: `${data.percentage}%`, 
                        background: color,
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
                        <div>{data.totalScore}/{data.maxPossible}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600" }}>Performance</div>
                        <div style={{ 
                          color: color,
                          fontWeight: "600"
                        }}>
                          {getLevelText(data.percentage)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600" }}>Questions</div>
                        <div>{data.questionCount}</div>
                      </div>
                    </div>
                    
                    {data.questionCount > 0 && (
                      <div style={{ 
                        marginTop: "15px",
                        padding: "10px",
                        background: "rgba(255,255,255,0.5)",
                        borderRadius: "6px",
                        fontSize: "12px"
                      }}>
                        <div style={{ fontWeight: "600", marginBottom: "5px", color: "#666" }}>
                          Score Distribution:
                        </div>
                        <div style={{ display: "flex", gap: "5px", height: "20px" }}>
                          {data.scores && data.scores.map((score, idx) => (
                            <div 
                              key={idx}
                              style={{
                                flex: 1,
                                background: score >= 4 ? "#4CAF50" : 
                                          score >= 3 ? "#2196F3" : 
                                          score >= 2 ? "#FF9800" : "#F44336",
                                borderRadius: "3px",
                                opacity: 0.7
                              }}
                              title={`Question ${idx + 1}: ${score}/5`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Responses Table */}
        {responses.length > 0 && (
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Detailed Question Responses</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                minWidth: "800px"
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "2px solid #1565c0",
                    backgroundColor: "#f5f5f5"
                  }}>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#333", width: "50px" }}>#</th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#333" }}>Question</th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#333", width: "150px" }}>Category</th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#333", width: "100px" }}>Score</th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#333", width: "80px" }}>Out of 5</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response, index) => (
                    <tr key={response.id} style={{ 
                      borderBottom: "1px solid #eee",
                      background: index % 2 === 0 ? "#fafafa" : "white"
                    }}>
                      <td style={{ padding: "12px", color: "#666", fontWeight: "500" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "500", marginBottom: "5px" }}>
                          {response.questions?.question_text || "Question not found"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#888" }}>
                          Answer: {response.answers?.answer_text || "No answer text"}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "4px 8px",
                          background: "#e3f2fd",
                          color: "#1565c0",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {response.questions?.category || response.questions?.section || "Uncategorized"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontWeight: "500" }}>
                        <div style={{ 
                          display: "inline-block",
                          padding: "4px 10px",
                          background: response.answers?.score >= 4 ? "#e8f5e9" : 
                                    response.answers?.score >= 3 ? "#fff3e0" : "#ffebee",
                          color: response.answers?.score >= 4 ? "#2e7d32" : 
                                response.answers?.score >= 3 ? "#f57c00" : "#c62828",
                          borderRadius: "4px",
                          fontWeight: "600",
                          fontSize: "13px"
                        }}>
                          {response.answers?.score || 0}
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: "#666", textAlign: "center" }}>
                        <div style={{ 
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          border: `2px solid ${response.answers?.score >= 4 ? "#4CAF50" : 
                                                   response.answers?.score >= 3 ? "#FF9800" : "#F44336"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: response.answers?.score >= 4 ? "#2e7d32" : 
                                response.answers?.score >= 3 ? "#f57c00" : "#c62828"
                        }}>
                          {response.answers?.score || 0}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            onClick={handleBack}
            style={{
              padding: "12px 30px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
            onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
