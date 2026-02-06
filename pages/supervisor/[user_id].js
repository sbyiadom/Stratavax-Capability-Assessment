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

  // Fetch ALL candidate data
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching data for candidate: ${user_id}`);

        // 1. Get candidate profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single()
          .catch(() => ({ data: null })); // Handle if profile doesn't exist

        // 2. Get classification if exists
        const { data: classification } = await supabase
          .from("talent_classification")
          .select("total_score, classification")
          .eq("user_id", user_id)
          .single()
          .catch(() => ({ data: null }));

        // 3. Get assessment results if exists
        const { data: assessment } = await supabase
          .from("assessment_results")
          .select("*")
          .eq("user_id", user_id)
          .single()
          .catch(() => ({ data: null }));

        // 4. Get ALL responses for this candidate
        const { data: responses } = await supabase
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
          .eq("user_id", user_id)
          .catch(() => ({ data: [] }));

        console.log("Raw data fetched:", {
          profile,
          classification,
          assessment,
          responseCount: responses?.length || 0
        });

        // Build candidate object
        const candidateData = {
          user_id: user_id,
          email: profile?.email || assessment?.user_email || "No email",
          full_name: profile?.full_name || assessment?.user_name || "Candidate",
          overall_score: assessment?.overall_score || classification?.total_score || 0,
          classification: assessment?.risk_level || classification?.classification || "Not Classified",
          completed_at: assessment?.completed_at,
          response_count: responses?.length || 0
        };

        setCandidate(candidateData);
        console.log("Candidate data:", candidateData);

        // 5. Calculate category scores from responses
        if (responses && responses.length > 0) {
          const calculatedScores = calculateCategoryScoresFromResponses(responses);
          setCategoryScores(calculatedScores);
          console.log("Calculated category scores:", calculatedScores);
        } else if (assessment?.category_scores) {
          // Use pre-calculated scores if available
          setCategoryScores(assessment.category_scores);
          console.log("Using pre-calculated scores from database");
        } else {
          setCategoryScores({});
          console.log("No responses found and no pre-calculated scores");
        }

      } catch (err) {
        console.error("Error loading candidate data:", err);
        setError(`Failed to load candidate data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Function to calculate category scores from raw responses
    const calculateCategoryScoresFromResponses = (responses) => {
      const scoresByCategory = {};
      
      responses.forEach(response => {
        const category = response.questions?.section || "Unknown";
        const score = response.answers?.score || 0;
        
        if (!scoresByCategory[category]) {
          scoresByCategory[category] = {
            totalScore: 0,
            count: 0,
            scores: []
          };
        }
        
        scoresByCategory[category].totalScore += score;
        scoresByCategory[category].count += 1;
        scoresByCategory[category].scores.push(score);
      });

      // Format results
      const formattedScores = {};
      Object.keys(scoresByCategory).forEach(category => {
        const data = scoresByCategory[category];
        const totalScore = data.totalScore;
        const questionCount = data.count;
        const averageScore = questionCount > 0 ? (totalScore / questionCount).toFixed(2) : 0;
        const maxPossibleScore = questionCount * 5;
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

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  // Helper functions
  const handleBack = () => router.push("/supervisor");

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
      'Performance': '#F57C00'
    };
    return colors[category] || '#666';
  };

  const getClassificationColor = (classification) => {
    switch(classification) {
      case 'Top Talent': return '#4CAF50';
      case 'High Potential': return '#2196F3';
      case 'Solid Performer': return '#FF9800';
      case 'Developing': return '#9C27B0';
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
            <p>Loading candidate report...</p>
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
          <h1>Candidate Not Found</h1>
          <p>No assessment data found for this candidate.</p>
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
              <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>Candidate Performance Report</h1>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "5px" }}>{candidate.full_name}</div>
              <div style={{ color: "#1565c0", fontSize: "16px" }}>{candidate.email}</div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
                {candidate.response_count} questions answered • ID: {user_id.substring(0, 8)}...
              </div>
            </div>
            
            <div style={{ background: "#f8f9fa", padding: "15px 20px", borderRadius: "10px", minWidth: "200px", border: "1px solid #e0e0e0" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Overall Classification</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: getClassificationColor(candidate.classification) }}>
                {candidate.classification}
              </div>
            </div>
          </div>

          {/* Overall Score Card */}
          <div style={{ background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)", color: "white", padding: "25px", borderRadius: "12px", marginBottom: "30px" }}>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Overall Assessment Score</div>
            <div style={{ fontSize: "48px", fontWeight: "700", margin: "10px 0" }}>{candidate.overall_score}/500</div>
            {candidate.completed_at && (
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                Completed on {new Date(candidate.completed_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Category Scores - MAIN SECTION */}
        <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
          <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Performance by Category</h2>
          
          {Object.keys(categoryScores).length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <p><strong>No assessment data available</strong></p>
              <p>This candidate has not completed any assessments or no category scores could be calculated.</p>
              <button onClick={() => window.location.reload()} style={{ marginTop: "15px", padding: "8px 16px", background: "#1565c0", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                Refresh Page
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {Object.entries(categoryScores).map(([category, data]) => {
                const percentage = data.percentage || 0;
                const score = data.score || 0;
                const questions = data.questions || 0;
                const average = data.average || 0;
                const level = data.level || (percentage >= 80 ? 'STRONG' : percentage >= 60 ? 'GOOD' : percentage >= 40 ? 'NEEDS_IMPROVEMENT' : 'WEAK');
                
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
                        <div style={{ fontWeight: "600" }}>Performance Level</div>
                        <div style={{ color: percentage >= 60 ? '#4CAF50' : '#F44336', fontWeight: "600" }}>
                          {level}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600" }}>Average</div>
                        <div>{average}/5</div>
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
            <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Key Strengths</h2>
            {strengths.length > 0 ? (
              <div>
                {strengths.map((strength, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "10px", background: "#e8f5e9", borderRadius: "6px" }}>
                    <div style={{ background: "#4CAF50", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
                    <div>
                      <div style={{ fontWeight: "500" }}>{strength}</div>
                      {categoryScores[strength] && (
                        <div style={{ fontSize: "12px", color: "#2e7d32" }}>Score: {categoryScores[strength].percentage}%</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#888", fontStyle: "italic" }}>No specific strengths identified</div>
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
                    <div>
                      <div style={{ fontWeight: "500" }}>{weakness}</div>
                      {categoryScores[weakness] && (
                        <div style={{ fontSize: "12px", color: "#c62828" }}>Score: {categoryScores[weakness].percentage}%</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#888", fontStyle: "italic" }}>No specific weaknesses identified</div>
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
                      <div style={{ fontSize: "14px", color: "#555" }}>
                        Current Score: {percentage}% • Target: 60%+
                      </div>
                      <div style={{ fontSize: "13px", color: "#666", marginTop: "5px" }}>
                        <strong>Action:</strong> {percentage < 50 
                          ? `Immediate focus needed. Recommend structured training program for ${category.toLowerCase()}.`
                          : `Developmental opportunity. Consider mentoring or workshops in ${category.toLowerCase()}.`}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              
              {Object.values(categoryScores).every(data => data.percentage >= 60) && (
                <div style={{ textAlign: "center", padding: "20px", background: "#e8f5e9", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>🎉</div>
                  <div style={{ fontWeight: "600", color: "#2e7d32", fontSize: "18px" }}>Excellent Performance!</div>
                  <div style={{ color: "#555", marginTop: "5px" }}>Candidate demonstrates strong performance across all assessment categories.</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#888", fontStyle: "italic" }}>No recommendations available without assessment data</div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
