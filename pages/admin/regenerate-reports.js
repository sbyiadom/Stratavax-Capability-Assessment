import { useState } from "react";
import AppLayout from "../../components/AppLayout";

export default function RegenerateReports() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [userId, setUserId] = useState("");
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const runRegeneration = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await fetch("/api/admin/regenerate-all-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dryRun, 
          userId: userId || undefined,
          limit: 100 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setResults(data);
      
      if (data.hasMore && !dryRun && !userId) {
        // Process next batch automatically
        let allResults = [...data.results];
        let offset = data.nextOffset;
        
        while (data.hasMore) {
          setProgress({ processed: allResults.length, total: "..." });
          
          const nextResponse = await fetch("/api/admin/regenerate-all-reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dryRun, offset, limit: 100 })
          });
          
          const nextData = await nextResponse.json();
          allResults = [...allResults, ...nextData.results];
          setResults({ ...nextData, results: allResults });
          
          if (!nextData.hasMore) break;
          offset = nextData.nextOffset;
        }
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress({ processed: 0, total: 0 });
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <h1>Regenerate Assessment Reports</h1>
        <p>This tool will regenerate all reports using the correct scoring logic.</p>
        
        <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              <input 
                type="checkbox" 
                checked={dryRun} 
                onChange={(e) => setDryRun(e.target.checked)} 
              />
              {" "}Dry Run (preview only, no changes)
            </label>
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Specific User ID (optional)</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Leave empty to process all"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          
          <button
            onClick={runRegeneration}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: loading ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Processing..." : dryRun ? "Preview Changes" : "Regenerate Reports"}
          </button>
        </div>
        
        {progress.processed > 0 && (
          <div style={{ background: "#e3f2fd", padding: "10px", borderRadius: "4px", margin: "10px 0" }}>
            Processed: {progress.processed} assessments
          </div>
        )}
        
        {error && (
          <div style={{ background: "#ffebee", padding: "15px", borderRadius: "4px", color: "#c62828", margin: "10px 0" }}>
            Error: {error}
          </div>
        )}
        
        {results && (
          <div style={{ marginTop: "20px" }}>
            <h2>Results</h2>
            <p>Dry Run: {results.dryRun ? "Yes" : "No"}</p>
            <p>Processed: {results.totalProcessed} assessments</p>
            <p>Successful: {results.results?.filter(r => r.status !== "dry_run").length || 0}</p>
            {results.errors?.length > 0 && (
              <div style={{ background: "#fff3e0", padding: "10px", borderRadius: "4px", margin: "10px 0" }}>
                <strong>Errors ({results.errors.length}):</strong>
                <ul>{results.errors.map((e, i) => <li key={i}>{e.id}: {e.error}</li>)}</ul>
              </div>
            )}
            
            <details>
              <summary style={{ cursor: "pointer", margin: "10px 0" }}>View Details</summary>
              <pre style={{ background: "#f5f5f5", padding: "10px", borderRadius: "4px", overflow: "auto", fontSize: "12px" }}>
                {JSON.stringify(results.results?.slice(0, 20), null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
