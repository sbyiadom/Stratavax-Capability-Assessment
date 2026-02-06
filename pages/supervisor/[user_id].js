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
  const [categoryScores, setCategoryScores] = useState({});
  const [responses, setResponses] = useState([]);
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
          setIsSupervisor(session.loggedIn);
        } catch {
          router.push("/supervisor-login");
        }
      }
    };
    checkSupervisorAuth();
  }, [router]);

  // Fetch candidate data
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        console.log(`Loading candidate: ${user_id}`);

        // 1. Get candidate profile info (always exists for registered users)
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name, created_at")
          .eq("id", user_id)
          .single();

        if (!profile) {
          setError("Candidate not found in the system");
          setLoading(false);
          return;
        }

        // 2. Check if candidate has any responses
        const { data: candidateResponses } = await supabase
          .from("responses")
          .select(`
            *,
            questions (
              id,
              question_text,
              section
            ),
            answers (
              id,
              answer_text,
              score,
              interpretation
            )
          `)
          .eq("user_id", user_id);

        console.log("Candidate responses found:", candidateResponses?.length || 0);

        // 3. Get any existing assessment data
        const { data: assessment } = await supabase
          .from("assessment_results")
          .select("*")
          .eq("user_id", user_id)
          .single()
          .catch(() => ({ data: null }));

        // 4. Get classification if exists
        const { data: classification } = await supabase
          .from("talent_classification")
          .select("total_score, classification")
          .eq("user_id", user_id)
          .single()
          .catch(() => ({ data: null }));

        // Build candidate object
        const candidateData = {
          user_id: user_id,
          email: profile.email || "No email",
          full_name: profile.full_name || profile.email?.split('@')[0] || "Candidate",
          overall_score: assessment?.overall_score || classification?.total_score || 0,
          classification: assessment?.risk_level || classification?.classification || "Not Assessed",
          completed_at: assessment?.completed_at,
          response_count: candidateResponses?.length || 0,
          registered_date: profile.created_at
        };

        setCandidate(candidateData);
        setResponses(candidateResponses || []);

        // 5. Calculate category scores if responses exist
        if (candidateResponses && candidateResponses.length > 0) {
          const calculatedScores = calculateCategoryScores(candidateResponses);
          setCategoryScores(calculatedScores);
          console.log("Calculated scores:", calculatedScores);
        } else if (assessment?.category_scores) {
          // Use existing scores if available
          setCategoryScores(assessment.category_scores);
        } else {
          // No assessment data yet
          setCategoryScores({});
        }

      } catch (err) {
        console.error("Error loading candidate:", err);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Function to calculate category scores from responses
    const calculateCategoryScores = (responses) => {
      const categoryData = {};
      
      responses.forEach(response => {
        const category = response.questions?.section || "Uncategorized";
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

      // Format results
      const formattedScores = {};
      Object.keys(categoryData).forEach(category => {
        const data = categoryData[category];
        const total = data.totalScore;
        const count = data.count;
        const average = count > 0 ? (total / count).toFixed(2) : 0;
        const maxPossible = count * 5;
        const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
        
        formattedScores[category] = {
          score: total,
          questions: count,
          average: parseFloat(average),
          percentage: percentage,
          level: percentage >= 80 ? 'STRONG' : 
                 percentage >= 60 ? 'GOOD' : 
                 percentage >= 40 ? 'AVERAGE' : 'NEEDS_IMPROVEMENT',
          max_possible: maxPossible
        };
      });

      return formattedScores;
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  const handleBack = () => router.push("/supervisor");

  const getCategoryColor = (category) => {
    const colors = {
      'Cognitive Abilities': '#4A6FA5',
      'Technical Competence': '#2E7D32',
      'Personality Assessment': '#9C27B0',
      'Leadership Potential': '#D32F2F',
      'Performance Metrics': '#F57C00'
    };
    return colors[category] || '#666';
  };

  const getClassificationColor = (classification) => {
    switch(classification) {
      case 'Top Talent': return '#4CAF50';
      case 'High Potential': return '#2196F3';
      case 'Solid Performer': return '#FF9800';
      case 'Developing': return '#9C27B0';
      case 'Not Assessed': return '#757575';
      default: return '#F44336';
    }
  };

  // Calculate strengths and weaknesses
  const calculateStrengths = () => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage >= 75)
      .map(([category]) => category);
  };

  const calculateWeaknesses = () => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage < 60)
      .map(([category]) => category);
  };

  const strengths = calculateStrengths();
  const weaknesses = calculateWeaknesses();

  // Loading state
  if (!isSupervisor) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p>Checking authentication...</p></div>;
  }

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "50px", height: "50px", border: "5px solid #f3f3f3", borderTop: "5px solid #1565c0", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ color: "#666" }}>Loading candidate information...</p>
            <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ width: "90vw", margin: "auto", padding: "40px 20px", textAlign: "center" }}>
          <h1 style={{ color: "#666", marginBottom: "20px" }}>Candidate Not Found</h1>
          <p style={{ color: "#888", marginBottom: "30px" }}>This candidate does not exist in the system.</p>
          <button onClick={handleBack} style={{ padding: "12px 24px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}>
            ← Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        
        {/* Error Message */}
        {error && (
          <div style={{ marginBottom: "20px", padding: "15px", background: "#ffebee", color: "#c62828", borderRadius: "8px", borderLeft: "4px solid #f44336" }}>
            {error}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <button onClick={handleBack} style={{ background: "none", border: "none", color: "#1565c0", cursor: "pointer", fontSize: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            ← Back to Dashboard
          </button>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>Candidate Profile</h1>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "5px" }}>{candidate.full_name}</div>
              <div style={{ color: "#1565c0", fontSize: "16px" }}>{candidate.email}</div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
                Registered: {new Date(candidate.registered_date).toLocaleDateString()} • 
                ID: {user_id.substring(0, 8)}...
              </div>
            </div>
            
            <div style={{ background: "#f8f9fa", padding: "15px 20px", borderRadius: "10px", minWidth: "200px", border: "1px solid #e0e0e0" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Assessment Status</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: getClassificationColor(candidate.classification) }}>
                {candidate.classification}
              </div>
            </div>
          </div>

          {/* Assessment Status Card */}
          <div style={{ 
            background: candidate.response_count > 0 ? "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)" : "linear-gradient(135deg, #757575 0%, #616161 100%)", 
            color: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            marginBottom: "30px" 
          }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>
              {candidate.response_count > 0 ? "Assessment Progress" : "Assessment Status"}
            </div>
            <div style={{ fontSize: "48px", fontWeight: "700", margin: "10px 0" }}>
              {candidate.response_count > 0 ? `${candidate.overall_score}/500` : "Not Started"}
            </div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>
              {candidate.response_count > 0 
                ? `${candidate.response_count} questions answered` 
                : "Candidate has not started the assessment"}
            </div>
          </div>
        </div>

        {/* Category Scores - Only show if there's data */}
        {candidate.response_count > 0 ? (
          <>
            <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
              <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Performance by Category</h2>
              
              {Object.keys(categoryScores).length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
                  <p><strong>Calculating category scores...</strong></p>
                  <p>Category analysis is being processed. Please refresh in a moment.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  {Object.entries(categoryScores).map(([category, data]) => {
                    const percentage = data.percentage || 0;
                    const score = data.score || 0;
                    const questions = data.questions || 0;
                    const average = data.average || 0;
                    
                    return (
                      <div key={category} style={{ borderLeft: `4px solid ${getCategoryColor(category)}`, padding: "20px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                          <div>
                            <h3 style={{ margin: "0 0 5px 0", color: getCategoryColor(category), fontSize: "18px" }}>{category}</h3>
                            <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>{questions} questions • Average: {average}/5</p>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "28px", fontWeight: "700", color: getCategoryColor(category) }}>{percentage}%</div>
                            <div style={{ fontSize: "12px", color: "#666" }}>Score</div>
                          </div>
                        </div>
                        
                        <div style={{ height: "10px", background: "#e0e0e0", borderRadius: "5px", marginBottom: "8px" }}>
                          <div style={{ height: "100%", width: `${percentage}%`, background: getCategoryColor(category), borderRadius: "5px" }} />
                        </div>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666", marginTop: "10px" }}>
                          <div>
                            <div style={{ fontWeight: "600" }}>Total Score</div>
                            <div>{score}/{questions * 5}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: "600" }}>Performance</div>
                            <div style={{ color: percentage >= 60 ? '#4CAF50' : '#F44336', fontWeight: "600" }}>
                              {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'Average' : 'Needs Improvement'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Strengths & Weaknesses */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              {/* Strengths */}
              <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Strengths</h2>
                {strengths.length > 0 ? (
                  <div>
                    {strengths.map((strength, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "10px", background: "#e8f5e9", borderRadius: "6px" }}>
                        <div style={{ background: "#4CAF50", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
                        <div style={{ fontWeight: "500" }}>{strength}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#888", fontStyle: "italic" }}>No specific strengths identified yet</div>
                )}
              </div>

              {/* Weaknesses */}
              <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Areas for Improvement</h2>
                {weaknesses.length > 0 ? (
                  <div>
                    {weaknesses.map((weakness, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "10px", background: "#ffebee", borderRadius: "6px" }}>
                        <div style={{ background: "#F44336", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>!</div>
                        <div style={{ fontWeight: "500" }}>{weakness}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#888", fontStyle: "italic" }}>No specific weaknesses identified yet</div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Recommendations</h2>
              {Object.keys(categoryScores).length > 0 ? (
                <div>
                  {Object.entries(categoryScores).map(([category, data]) => {
                    const percentage = data.percentage || 0;
                    
                    if (percentage < 60) {
                      return (
                        <div key={category} style={{ marginBottom: "15px", padding: "15px", background: percentage < 50 ? "#fff3e0" : "#e3f2fd", borderRadius: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                            <div style={{ fontWeight: "600", color: "#333" }}>{category}</div>
                            <div style={{ fontSize: "12px", padding: "3px 8px", background: percentage < 50 ? "#FF9800" : "#2196F3", color: "white", borderRadius: "12px" }}>
                              {percentage < 50 ? "High Priority" : "Medium Priority"}
                            </div>
                          </div>
                          <div style={{ fontSize: "13px", color: "#666" }}>
                            <strong>Action:</strong> Focus on improving {category.toLowerCase()} through practice and training.
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ) : (
                <div style={{ color: "#888", fontStyle: "italic" }}>Complete more questions to get recommendations</div>
              )}
            </div>
          </>
        ) : (
          /* No Assessment Data Section */
          <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px", color: "#e0e0e0" }}>📝</div>
            <h2 style={{ margin: "0 0 15px 0", color: "#666" }}>Assessment Not Started</h2>
            <p style={{ color: "#888", marginBottom: "25px", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
              This candidate has not started the assessment yet. Once they begin answering questions, their performance analysis will appear here with:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "30px" }}>
              <div style={{ padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>📊</div>
                <div style={{ fontWeight: "600", color: "#333" }}>Category Breakdown</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Performance across different skill areas</div>
              </div>
              <div style={{ padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>✅</div>
                <div style={{ fontWeight: "600", color: "#333" }}>Strengths</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Areas of excellence</div>
              </div>
              <div style={{ padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>📈</div>
                <div style={{ fontWeight: "600", color: "#333" }}>Improvement Areas</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Opportunities for growth</div>
              </div>
              <div style={{ padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>💡</div>
                <div style={{ fontWeight: "600", color: "#333" }}>Recommendations</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Personalized action items</div>
              </div>
            </div>
            <button onClick={() => window.location.reload()} style={{ padding: "12px 24px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "600" }}>
              Refresh Status
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
