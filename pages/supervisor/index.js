// pages/supervisor/index.js - Updated to show actual user names/emails
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";
import Link from "next/link";

export default function SupervisorDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch candidates with actual user data
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        
        // Get all classifications with actual user data
        const { data: classifications, error: classError } = await supabase
          .from("talent_classification")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (classError) {
          console.error("Error fetching classifications:", classError);
          return;
        }
        
        // Get user data for each classification
        const candidatesWithUserData = await Promise.all(
          classifications.map(async (candidate) => {
            try {
              // Try to get user data from users table first
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("email, full_name")
                .eq("id", candidate.user_id)
                .single();
              
              if (!userError && userData) {
                return {
                  ...candidate,
                  user_email: userData.email,
                  user_name: userData.full_name || `User ${candidate.user_id.substring(0, 8)}`
                };
              }
              
              // If not found in users table, try auth.users (requires admin privileges)
              // Or use fallback data
              return {
                ...candidate,
                user_email: "Loading...",
                user_name: `Candidate ${candidate.user_id.substring(0, 8).toUpperCase()}`
              };
            } catch (err) {
              console.error(`Error fetching user ${candidate.user_id}:`, err);
              return {
                ...candidate,
                user_email: "Not available",
                user_name: `Candidate ${candidate.user_id.substring(0, 8).toUpperCase()}`
              };
            }
          })
        );
        
        setCandidates(candidatesWithUserData);
      } catch (error) {
        console.error("Error in fetch:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCandidates();
  }, []);
  
  // Filter candidates based on search
  const filteredCandidates = candidates.filter(candidate =>
    candidate.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.classification.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "40px 20px" }}>
        <h1 style={{ 
          marginBottom: "30px", 
          color: "#333",
          fontSize: "32px"
        }}>
          Candidate Assessments
        </h1>
        
        {/* Search Bar */}
        <div style={{ marginBottom: "30px" }}>
          <input
            type="text"
            placeholder="Search candidates by name, email, or classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "16px",
              border: "2px solid #e0e0e0",
              borderRadius: "10px",
              outline: "none",
              transition: "border-color 0.3s"
            }}
          />
        </div>
        
        {loading ? (
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            minHeight: "200px" 
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
              <p style={{ color: "#666" }}>Loading candidates...</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ 
              marginBottom: "15px",
              color: "#666",
              fontSize: "14px"
            }}>
              {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} found
            </div>
            
            <div style={{ 
              background: "white", 
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              overflow: "hidden"
            }}>
              <table style={{ 
                width: "100%", 
                borderCollapse: "collapse",
                fontSize: "14px"
              }}>
                <thead>
                  <tr style={{ 
                    background: "#f8f9fa",
                    borderBottom: "2px solid #e9ecef"
                  }}>
                    <th style={{ 
                      padding: "18px 20px", 
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057"
                    }}>Candidate</th>
                    <th style={{ 
                      padding: "18px 20px", 
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057"
                    }}>Total Score</th>
                    <th style={{ 
                      padding: "18px 20px", 
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057"
                    }}>Classification</th>
                    <th style={{ 
                      padding: "18px 20px", 
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057"
                    }}>Status</th>
                    <th style={{ 
                      padding: "18px 20px", 
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057"
                    }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate, index) => (
                    <tr 
                      key={candidate.id}
                      style={{ 
                        borderBottom: index < filteredCandidates.length - 1 ? "1px solid #e9ecef" : "none",
                        transition: "background 0.2s"
                      }}
                    >
                      <td style={{ padding: "20px" }}>
                        <div style={{ fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                          {candidate.user_name}
                        </div>
                        <div style={{ color: "#666", fontSize: "13px", marginBottom: "2px" }}>
                          {candidate.user_email}
                        </div>
                        <div style={{ 
                          color: "#888", 
                          fontSize: "12px",
                          fontFamily: "monospace"
                        }}>
                          ID: {candidate.user_id.substring(0, 8).toUpperCase()}...
                        </div>
                      </td>
                      <td style={{ padding: "20px", color: "#333", fontWeight: "500" }}>
                        <div style={{ fontSize: "18px", fontWeight: "600" }}>
                          {candidate.total_score}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          /500 points
                        </div>
                      </td>
                      <td style={{ padding: "20px" }}>
                        <div style={{ 
                          display: "inline-block",
                          padding: "6px 12px",
                          background: 
                            candidate.classification === 'Top Talent' ? "rgba(76, 175, 80, 0.1)" :
                            candidate.classification === 'High Potential' ? "rgba(33, 150, 243, 0.1)" :
                            candidate.classification === 'Solid Performer' ? "rgba(255, 152, 0, 0.1)" :
                            "rgba(156, 39, 176, 0.1)",
                          color: 
                            candidate.classification === 'Top Talent' ? "#2e7d32" :
                            candidate.classification === 'High Potential' ? "#1565c0" :
                            candidate.classification === 'Solid Performer' ? "#ef6c00" :
                            "#7b1fa2",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          border: `1px solid ${
                            candidate.classification === 'Top Talent' ? "#4CAF50" :
                            candidate.classification === 'High Potential' ? "#2196F3" :
                            candidate.classification === 'Solid Performer' ? "#FF9800" :
                            "#9C27B0"
                          }`
                        }}>
                          {candidate.classification}
                        </div>
                      </td>
                      <td style={{ padding: "20px" }}>
                        <div style={{ 
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          <div style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#4CAF50"
                          }} />
                          <span style={{ color: "#4CAF50", fontWeight: "500" }}>Completed</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                          {formatDate(candidate.created_at)}
                        </div>
                      </td>
                      <td style={{ padding: "20px" }}>
                        <Link href={`/supervisor/${candidate.user_id}`} passHref>
                          <button
                            style={{
                              padding: "8px 16px",
                              background: "#1565c0",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "500",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.background = "#0d47a1"}
                            onMouseLeave={(e) => e.target.style.background = "#1565c0"}
                          >
                            View Report
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredCandidates.length === 0 && (
                <div style={{ 
                  padding: "60px 20px", 
                  textAlign: "center",
                  color: "#666"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔍</div>
                  <h3 style={{ color: "#555", marginBottom: "10px" }}>
                    No candidates found
                  </h3>
                  <p style={{ maxWidth: "400px", margin: "0 auto" }}>
                    Try adjusting your search terms or check back later.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
