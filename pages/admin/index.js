// pages/admin/index.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "N/A";
  }
}

async function getExactCount(tableName, configureQuery) {
  try {
    let query = supabase.from(tableName).select("*", { count: "exact", head: true });
    if (typeof configureQuery === "function") query = configureQuery(query);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Count error for " + tableName + ":", error);
    return 0;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0,
    inProgressSessions: 0,
    totalResults: 0
  });
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      const userId = activeSession.user.id;
      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        setAuthError("Admin access is required for this page.");
        router.push("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        setAuthError("This admin account is inactive. Please contact system administration.");
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setIsAdmin(true);
      await fetchDashboardData();
    } catch (error) {
      console.error("Admin auth error:", error);
      setAuthError(error?.message || "Unable to verify admin access.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardData() {
    try {
      const [
        supervisorCount,
        candidateCount,
        assessmentCount,
        completedCount,
        resultCount,
        inProgressCount,
        accessResponse,
        candidatesResponse,
        resultsResponse
      ] = await Promise.all([
        getExactCount("supervisor_profiles"),
        getExactCount("candidate_profiles"),
        getExactCount("assessments", (query) => query.eq("is_active", true)),
        getExactCount("candidate_assessments", (query) => query.eq("status", "completed")),
        getExactCount("assessment_results"),
        getExactCount("assessment_sessions", (query) => query.eq("status", "in_progress")),
        supabase.from("candidate_assessments").select("status"),
        supabase
          .from("candidate_profiles")
          .select("id, full_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("assessment_results")
          .select("id, user_id, assessment_id, total_score, max_score, percentage_score, completed_at, candidate_profiles(full_name, email), assessments(title)")
          .order("completed_at", { ascending: false })
          .limit(6)
      ]);

      const accessRows = safeArray(accessResponse.data);
      const unblockedCount = accessRows.filter((item) => item.status === "unblocked").length;
      const blockedCount = accessRows.filter((item) => item.status === "blocked").length;

      if (accessResponse.error) console.error("Access status warning:", accessResponse.error);
      if (candidatesResponse.error) console.error("Recent candidates warning:", candidatesResponse.error);
      if (resultsResponse.error) console.error("Recent results warning:", resultsResponse.error);

      setStats({
        totalSupervisors: supervisorCount,
        totalCandidates: candidateCount,
        totalAssessments: assessmentCount,
        completedAssessments: completedCount,
        unblockedAssessments: unblockedCount,
        blockedAssessments: blockedCount,
        inProgressSessions: inProgressCount,
        totalResults: resultCount
      });

      setRecentCandidates(candidatesResponse.data || []);
      setRecentResults(resultsResponse.data || []);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("userSession");
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading admin dashboard...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>Authentication Error</p>
        <p style={styles.errorDetail}>{authError}</p>
        <button onClick={() => router.push("/supervisor")} style={styles.backButton}>Back to Dashboard</button>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>System administration, users, assessments, and platform activity.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>Refresh</button>
            <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard icon="👑" label="Supervisors" value={stats.totalSupervisors} />
          <StatCard icon="👥" label="Candidates" value={stats.totalCandidates} />
          <StatCard icon="📋" label="Active Assessments" value={stats.totalAssessments} />
          <StatCard icon="✅" label="Completed" value={stats.completedAssessments} />
          <StatCard icon="🔓" label="Unblocked" value={stats.unblockedAssessments} />
          <StatCard icon="🔒" label="Blocked" value={stats.blockedAssessments} />
          <StatCard icon="⏳" label="In Progress" value={stats.inProgressSessions} />
          <StatCard icon="📊" label="Result Records" value={stats.totalResults} />
        </div>

        <div style={styles.actionCardsGrid}>
          <ActionCard href="/admin/add-supervisor" icon="➕" title="Add Supervisor" description="Create new supervisor accounts with dashboard access." />
          <ActionCard href="/admin/manage-supervisors" icon="👥" title="Manage Supervisors" description="View, activate, deactivate, or update supervisor accounts." />
          <ActionCard href="/admin/manage-candidates" icon="🎓" title="Manage Candidates" description="View candidate profiles, reset access, and review activity." />
          <ActionCard href="/admin/assign-candidates" icon="🔗" title="Assign Supervisors" description="Assign candidates to specific supervisors for management." />
          <ActionCard href="/admin/assign-assessments" icon="📋" title="Assign Assessments" description="Assign, unblock, or block candidate assessments." />
          <ActionCard href="/admin/batch-manage" icon="📦" title="Batch Manage" description="Perform bulk administrative actions and candidate updates." />
          <ActionCard href="/admin/audit-logs" icon="📊" title="Audit Logs" description="View system activity, access events, and administrative actions." />
          <ActionCard href="/admin/system-settings" icon="⚙️" title="System Settings" description="Configure platform settings and assessment parameters." />
        </div>

        <div style={styles.lowerGrid}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Recent Candidates</h2>
            {recentCandidates.length === 0 ? (
              <div style={styles.emptyState}>No candidates found.</div>
            ) : (
              <div style={styles.list}>
                {recentCandidates.map((candidate) => (
                  <div key={candidate.id} style={styles.listItem}>
                    <div>
                      <div style={styles.listTitle}>{candidate.full_name || candidate.email || "Candidate"}</div>
                      <div style={styles.listMeta}>{candidate.email || "No email"}</div>
                    </div>
                    <div style={styles.dateBadge}>{formatDate(candidate.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Recent Results</h2>
            {recentResults.length === 0 ? (
              <div style={styles.emptyState}>No results found.</div>
            ) : (
              <div style={styles.list}>
                {recentResults.map((result) => (
                  <div key={result.id} style={styles.listItem}>
                    <div>
                      <div style={styles.listTitle}>{result.candidate_profiles?.full_name || result.candidate_profiles?.email || "Candidate"}</div>
                      <div style={styles.listMeta}>{result.assessments?.title || "Assessment"} • {formatDate(result.completed_at)}</div>
                    </div>
                    <div style={styles.scoreBadge}>{Math.round(toNumber(result.percentage_score, 0))}%</div>
                  </div>
                ))}
              </div>
            )}
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

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description }) {
  return (
    <Link href={href} legacyBehavior>
      <a style={styles.actionCard}>
        <span style={styles.actionCardIcon}>{icon}</span>
        <div>
          <h3 style={styles.actionCardTitle}>{title}</h3>
          <p style={styles.actionCardDesc}>{description}</p>
        </div>
      </a>
    </Link>
  );
}

const styles = {
  checkingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
  errorIcon: { fontSize: "48px", marginBottom: "20px" },
  errorText: { fontSize: "20px", fontWeight: 700, marginBottom: "10px" },
  errorDetail: { fontSize: "14px", opacity: 0.85, marginBottom: "20px", maxWidth: "500px" },
  backButton: { padding: "12px 30px", background: "white", color: "#0a1929", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 700, cursor: "pointer" },
  container: { width: "90vw", maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "30px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  title: { margin: 0, color: "#0a1929", fontSize: "28px", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#667085", fontSize: "14px" },
  headerActions: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  refreshButton: { background: "#0a1929", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 },
  logoutButton: { background: "#f44336", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "18px", marginBottom: "30px" },
  statCard: { background: "white", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #eef2f7" },
  statIcon: { fontSize: "30px" },
  statLabel: { fontSize: "12px", color: "#718096", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontSize: "24px", fontWeight: 800, color: "#0a1929" },
  actionCardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "18px", marginBottom: "30px" },
  actionCard: { background: "white", padding: "20px", borderRadius: "12px", textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #eef2f7", cursor: "pointer" },
  actionCardIcon: { fontSize: "32px" },
  actionCardTitle: { margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a1929" },
  actionCardDesc: { margin: "5px 0 0", fontSize: "12px", color: "#718096", lineHeight: 1.45 },
  lowerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "30px" },
  panel: { background: "white", borderRadius: "16px", padding: "22px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #eef2f7" },
  panelTitle: { margin: "0 0 16px", fontSize: "18px", color: "#0a1929", fontWeight: 800 },
  emptyState: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", color: "#64748b", textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" },
  listTitle: { fontSize: "14px", fontWeight: 800, color: "#0f172a" },
  listMeta: { fontSize: "12px", color: "#64748b", marginTop: "4px" },
  dateBadge: { fontSize: "12px", color: "#334155", background: "#e2e8f0", padding: "5px 10px", borderRadius: "999px", whiteSpace: "nowrap" },
  scoreBadge: { fontSize: "13px", color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "6px 12px", borderRadius: "999px", fontWeight: 800 }
};
