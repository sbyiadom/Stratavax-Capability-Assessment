// pages/admin/system-settings.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

const DEFAULT_SETTINGS = {
  site_name: "Stratavax",
  support_email: "support@stratavax.com",
  default_assessment_time_limit: 180,
  default_passing_score: 80,
  enable_registration: true,
  require_email_confirmation: true,
  session_timeout: 60,
  max_login_attempts: 5,
  maintenance_mode: false
};

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return fallback;
  return parsed;
}

function clampNumber(value, min, max, fallback) {
  const parsed = toNumber(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

export default function SystemSettings() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsTableAvailable, setSettingsTableAvailable] = useState(true);
  const [databaseStatus, setDatabaseStatus] = useState({
    supervisors: "Checking",
    candidates: "Checking",
    assessments: "Checking",
    systemSettings: "Checking"
  });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [currentAdminId, setCurrentAdminId] = useState(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const hasUnsavedDefaults = useMemo(() => {
    return !settingsTableAvailable;
  }, [settingsTableAvailable]);

  async function checkAdminAuth() {
    try {
      setCheckingAuth(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Admin access is required." });
        router.push("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setCurrentAdminId(activeSession.user.id);
      setIsAdmin(true);
      await Promise.all([loadSettings(), checkDatabaseStatus()]);
    } catch (error) {
      console.error("System settings auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setSettingsTableAvailable(true);

      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
      setSettingsTableAvailable(false);
      setSettings(DEFAULT_SETTINGS);
      setMessage({
        type: "error",
        text: "System settings table is not available or not accessible. Showing default values."
      });
    } finally {
      setLoading(false);
    }
  }

  async function checkTableStatus(tableName) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (error) return "Unavailable";
      return "Active";
    } catch (error) {
      return "Unavailable";
    }
  }

  async function checkDatabaseStatus() {
    const [supervisors, candidates, assessments, systemSettings] = await Promise.all([
      checkTableStatus("supervisor_profiles"),
      checkTableStatus("candidate_profiles"),
      checkTableStatus("assessments"),
      checkTableStatus("system_settings")
    ]);

    setDatabaseStatus({ supervisors, candidates, assessments, systemSettings });
  }

  function sanitizeSettings(rawSettings) {
    return {
      site_name: cleanText(rawSettings.site_name, DEFAULT_SETTINGS.site_name).trim() || DEFAULT_SETTINGS.site_name,
      support_email: cleanText(rawSettings.support_email, DEFAULT_SETTINGS.support_email).trim() || DEFAULT_SETTINGS.support_email,
      default_assessment_time_limit: clampNumber(rawSettings.default_assessment_time_limit, 30, 300, DEFAULT_SETTINGS.default_assessment_time_limit),
      default_passing_score: clampNumber(rawSettings.default_passing_score, 0, 100, DEFAULT_SETTINGS.default_passing_score),
      enable_registration: Boolean(rawSettings.enable_registration),
      require_email_confirmation: Boolean(rawSettings.require_email_confirmation),
      session_timeout: clampNumber(rawSettings.session_timeout, 5, 240, DEFAULT_SETTINGS.session_timeout),
      max_login_attempts: clampNumber(rawSettings.max_login_attempts, 3, 10, DEFAULT_SETTINGS.max_login_attempts),
      maintenance_mode: Boolean(rawSettings.maintenance_mode)
    };
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const sanitized = sanitizeSettings(settings);

      const { error } = await supabase
        .from("system_settings")
        .upsert({
          id: 1,
          ...sanitized,
          updated_at: new Date().toISOString(),
          updated_by: currentAdminId
        }, { onConflict: "id" });

      if (error) throw error;

      setSettings(sanitized);
      setSettingsTableAvailable(true);
      setMessage({ type: "success", text: "Settings saved successfully." });
      await checkDatabaseStatus();
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSettingsTableAvailable(false);
      setMessage({ type: "error", text: "Failed to save settings: " + getReadableError(error) });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(key, value) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  function handleNumberChange(key, value, fallback) {
    const parsed = value === "" ? "" : Number(value);
    setSettings((previous) => ({ ...previous, [key]: parsed === "" ? fallback : parsed }));
  }

  function resetToDefaults() {
    const confirmed = window.confirm("Reset all visible settings to default values? This will not save until you click Save Settings.");
    if (!confirmed) return;
    setSettings(DEFAULT_SETTINGS);
    setMessage({ type: "success", text: "Defaults restored locally. Click Save Settings to persist them." });
  }

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking authorization...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button onClick={() => router.push("/supervisor")} style={styles.button}>Go to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Loading settings...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/admin" legacyBehavior>
            <a style={styles.backButton}>← Back to Admin</a>
          </Link>
          <div>
            <h1 style={styles.title}>System Settings</h1>
            <p style={styles.subtitle}>Configure platform defaults, security options, and operational settings.</p>
          </div>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
          }}>
            {message.text}
          </div>
        )}

        {hasUnsavedDefaults && (
          <div style={styles.warningBox}>
            <strong>Setup notice:</strong> The system_settings table is not currently available or accessible. The page is showing default values. Create or grant access to the table before saving.
          </div>
        )}

        <div style={styles.settingsGrid}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>General Settings</h2>
            <div style={styles.sectionContent}>
              <SettingInput label="Site Name" value={settings.site_name} onChange={(value) => handleChange("site_name", value)} placeholder="Stratavax" />
              <SettingInput label="Support Email" type="email" value={settings.support_email} onChange={(value) => handleChange("support_email", value)} placeholder="support@example.com" />
              <ToggleSetting label="Enable Public Registration" trueLabel="Enabled" falseLabel="Disabled" value={settings.enable_registration} onChange={(value) => handleChange("enable_registration", value)} />
              <ToggleSetting label="Require Email Confirmation" trueLabel="Required" falseLabel="Not Required" value={settings.require_email_confirmation} onChange={(value) => handleChange("require_email_confirmation", value)} />
              <ToggleSetting label="Maintenance Mode" trueLabel="On" falseLabel="Off" dangerWhenTrue value={settings.maintenance_mode} onChange={(value) => handleChange("maintenance_mode", value)} />
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Assessment Settings</h2>
            <div style={styles.sectionContent}>
              <SettingInput label="Default Time Limit (minutes)" type="number" value={settings.default_assessment_time_limit} min={30} max={300} onChange={(value) => handleNumberChange("default_assessment_time_limit", value, DEFAULT_SETTINGS.default_assessment_time_limit)} />
              <SettingInput label="Default Passing Score (%)" type="number" value={settings.default_passing_score} min={0} max={100} onChange={(value) => handleNumberChange("default_passing_score", value, DEFAULT_SETTINGS.default_passing_score)} />
              <InfoBox text="These settings are platform defaults. Individual assessment configuration may override these values if assessment-specific fields exist." />
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Security Settings</h2>
            <div style={styles.sectionContent}>
              <SettingInput label="Session Timeout (minutes)" type="number" value={settings.session_timeout} min={5} max={240} onChange={(value) => handleNumberChange("session_timeout", value, DEFAULT_SETTINGS.session_timeout)} />
              <SettingInput label="Max Login Attempts" type="number" value={settings.max_login_attempts} min={3} max={10} onChange={(value) => handleNumberChange("max_login_attempts", value, DEFAULT_SETTINGS.max_login_attempts)} />
              <InfoBox text="Security settings are stored here for platform use. Enforcement depends on corresponding application logic being implemented in login/auth flows." />
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Database Status</h2>
            <div style={styles.sectionContent}>
              <StatusRow label="Supervisor Profiles" value={databaseStatus.supervisors} />
              <StatusRow label="Candidate Profiles" value={databaseStatus.candidates} />
              <StatusRow label="Assessments" value={databaseStatus.assessments} />
              <StatusRow label="System Settings" value={databaseStatus.systemSettings} />
            </div>
          </div>
        </div>

        <div style={styles.saveSection}>
          <button type="button" onClick={resetToDefaults} style={styles.resetButton}>Reset to Defaults</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ ...styles.saveButton, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
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

function SettingInput({ label, type = "text", value, onChange, placeholder, min, max }) {
  return (
    <div style={styles.settingRow}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </div>
  );
}

function ToggleSetting({ label, value, onChange, trueLabel, falseLabel, dangerWhenTrue = false }) {
  const trueActiveColor = dangerWhenTrue ? "#f44336" : "#4caf50";
  const falseActiveColor = dangerWhenTrue ? "#4caf50" : "#f44336";

  return (
    <div style={styles.settingRow}>
      <label style={styles.label}>{label}</label>
      <div style={styles.toggleContainer}>
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{ ...styles.toggleButton, background: value ? trueActiveColor : "#e2e8f0", color: value ? "white" : "#2d3748" }}
        >
          {trueLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{ ...styles.toggleButton, background: !value ? falseActiveColor : "#e2e8f0", color: !value ? "white" : "#2d3748" }}
        >
          {falseLabel}
        </button>
      </div>
    </div>
  );
}

function StatusRow({ label, value }) {
  const isActive = value === "Active";
  return (
    <div style={styles.statusRow}>
      <span style={styles.statusLabel}>{label}</span>
      <span style={{ ...styles.statusValue, color: isActive ? "#2e7d32" : "#c62828" }}>{isActive ? "Active" : value}</span>
    </div>
  );
}

function InfoBox({ text }) {
  return <div style={styles.infoBox}>{text}</div>;
}

const styles = {
  checkingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)", color: "white", padding: "20px", textAlign: "center" },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  spinner: { width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "20px" },
  container: { width: "90vw", maxWidth: "1200px", margin: "0 auto", padding: "30px 20px" },
  header: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  backButton: { color: "#0a1929", textDecoration: "none", fontSize: "14px", fontWeight: 700, padding: "8px 16px", borderRadius: "8px", border: "1px solid #0a1929" },
  title: { margin: 0, color: "#0a1929", fontSize: "24px", fontWeight: 800 },
  subtitle: { margin: "5px 0 0", color: "#667085", fontSize: "14px" },
  message: { padding: "13px 18px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  warningBox: { background: "#fff3e0", color: "#92400e", padding: "14px 18px", borderRadius: "10px", marginBottom: "20px", border: "1px solid #fde68a", fontSize: "14px", lineHeight: 1.5 },
  settingsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "30px" },
  section: { background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #eef2f7" },
  sectionTitle: { margin: 0, padding: "15px 20px", background: "#f8fafc", borderBottom: "2px solid #0a1929", fontSize: "16px", fontWeight: 800, color: "#0a1929" },
  sectionContent: { padding: "20px" },
  settingRow: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 800, color: "#2d3748" },
  input: { width: "100%", padding: "10px", border: "2px solid #e2e8f0", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  toggleContainer: { display: "flex", gap: "10px" },
  toggleButton: { flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 800 },
  statusRow: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: "1px solid #e2e8f0" },
  statusLabel: { fontSize: "14px", color: "#4a5568" },
  statusValue: { fontSize: "14px", fontWeight: 800 },
  infoBox: { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "13px", lineHeight: 1.5 },
  saveSection: { display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" },
  saveButton: { padding: "14px 40px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 800, cursor: "pointer" },
  resetButton: { padding: "14px 28px", background: "#f1f5f9", color: "#0a1929", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "16px", fontWeight: 800, cursor: "pointer" },
  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" }
};
