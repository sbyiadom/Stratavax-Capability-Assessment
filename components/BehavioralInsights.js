// components/BehavioralInsights.js

/**
 * BehavioralInsights Component
 *
 * Displays assessment behavior in a supervisor-friendly way.
 * Supports all assessment types.
 *
 * Handles both:
 * 1. Full behavioral metrics when question_timing data exists.
 * 2. Partial/fallback metrics when timing data was not captured.
 */

import React from "react";

const formatSeconds = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not captured";
  }

  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return "Not captured";
  }

  if (number <= 0) {
    return "Not captured";
  }

  if (number < 60) {
    return `${Math.round(number)}s`;
  }

  const minutes = Math.floor(number / 60);
  const seconds = Math.round(number % 60);

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m ${seconds}s`;
};

const formatTotalTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not captured";
  }

  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return "Not captured";
  }

  if (number <= 0) {
    return "Not captured";
  }

  return formatSeconds(number);
};

const formatPercent = (value, fallback = "Not captured") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return fallback;
  }

  return `${Math.round(number * 100) / 100}%`;
};

const formatNumber = (value, fallback = "0") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return fallback;
  }

  return `${Math.round(number * 100) / 100}`;
};

const getInsightStatus = (value) => {
  if (value === null || value === undefined || value === "") {
    return "missing";
  }

  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return "missing";
  }

  if (number <= 0) {
    return "limited";
  }

  return "available";
};

const getWorkStyleDescription = (workStyle) => {
  const descriptions = {
    "Quick Decision Maker":
      "The candidate appears to move quickly through decisions. Supervisors may encourage answer review and quality verification.",
    "Methodical Analyst":
      "The candidate appears to take a more deliberate and analytical approach. Supervisors may support this style with clear time expectations.",
    "Anxious Reviser":
      "The candidate shows frequent answer revision behavior. Supervisors may support confidence-building and structured review habits.",
    "Strategic Reviewer":
      "The candidate appears to review responses intentionally. Supervisors may guide the candidate toward efficient review strategies.",
    "Adaptive Learner":
      "The candidate may benefit from feedback loops and guided correction after mistakes.",
    "Non-Linear Thinker":
      "The candidate may move through questions in a less linear pattern. Supervisors may provide workflow and prioritization support.",
    "Inconsistent Responder":
      "The candidate shows variation in response pace. Supervisors may support consistency through pacing strategies.",
    "Review-Oriented":
      "The candidate shows a tendency to revisit or reconsider answers. Supervisors may support structured and evidence-based review habits.",
    Balanced:
      "The candidate shows a balanced response pattern based on the available behavioral data."
  };

  return descriptions[workStyle] || descriptions.Balanced;
};

const getConfidenceDescription = (confidenceLevel) => {
  const descriptions = {
    High:
      "The candidate shows indicators of confidence in response behavior, such as low answer-change activity.",
    Moderate:
      "The candidate shows a generally stable level of response confidence based on available evidence.",
    Low:
      "The candidate may require support in building decision confidence and reducing second-guessing.",
    Cautious:
      "The candidate may prefer careful review before committing to responses.",
    Variable:
      "The candidate shows mixed confidence indicators. Additional observation may be useful.",
    Growing:
      "The candidate may benefit from feedback and repeated practice to strengthen confidence.",
    Uncertain:
      "The candidate shows signs of inconsistent response confidence."
  };

  return descriptions[confidenceLevel] || descriptions.Moderate;
};

const getAttentionDescription = (attentionSpan) => {
  const descriptions = {
    Consistent:
      "The candidate shows a generally consistent attention pattern based on the available data.",
    "Declining Pace":
      "The candidate appears to slow down later in the assessment. Supervisors may consider pacing and break strategies.",
    "Improving Pace":
      "The candidate appears to gain pace as the assessment progresses. This may suggest warming up over time.",
    "Declining (Fatigue Detected)":
      "The candidate appears to slow down later in the assessment. Supervisors may consider pacing and break strategies.",
    "Improving (Warms Up)":
      "The candidate appears to gain pace as the assessment progresses. This may suggest warming up over time."
  };

  return descriptions[attentionSpan] || descriptions.Consistent;
};

const getDecisionDescription = (decisionPattern) => {
  const descriptions = {
    Deliberate:
      "The candidate appears to make decisions in a considered and steady way.",
    "Fast & Confident":
      "The candidate appears to answer quickly with limited revision.",
    "Thorough & Revisiting":
      "The candidate appears to review and reconsider answers before finalizing.",
    "Second-Guesses":
      "The candidate may frequently reconsider answers and may benefit from confidence-building.",
    "Reviews Before Submitting":
      "The candidate uses review behavior before finalizing responses.",
    "Learns from Mistakes":
      "The candidate may benefit from corrective feedback and iterative learning.",
    "Jumps Between Questions":
      "The candidate may use a non-linear navigation pattern.",
    "Variable Speed":
      "The candidate shows inconsistent response pace.",
    "Consistent First Choice":
      "The candidate made few or no changes, suggesting a stable first-choice response pattern.",
    "Minor Review Pattern":
      "The candidate made limited changes, suggesting modest review behavior.",
    "Frequent Reconsideration":
      "The candidate made multiple changes, suggesting frequent reconsideration."
  };

  return descriptions[decisionPattern] || descriptions.Deliberate;
};

const MetricCard = ({
  title,
  value,
  subtitle,
  color = "#1565C0",
  background = "#E3F2FD"
}) => {
  return (
    <div style={{ ...styles.metricCard, background }}>
      <div style={styles.metricTitle}>{title}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
      {subtitle && <div style={styles.metricSubtitle}>{subtitle}</div>}
    </div>
  );
};

const InsightPanel = ({ title, value, description, color = "#1565C0" }) => {
  return (
    <div style={styles.insightPanel}>
      <div style={styles.insightHeader}>
        <span style={{ ...styles.insightDot, background: color }} />
        <div>
          <div style={styles.insightTitle}>{title}</div>
          <div style={{ ...styles.insightValue, color }}>{value}</div>
        </div>
      </div>
      <p style={styles.insightDescription}>{description}</p>
    </div>
  );
};

export default function BehavioralInsights({ behavioralData, candidateName }) {
  if (!behavioralData) {
    return (
      <div style={styles.emptyState}>
        <h3 style={styles.emptyTitle}>Behavioral Insights Not Available</h3>
        <p style={styles.emptyText}>
          No behavioral data has been captured for this assessment attempt.
        </p>
      </div>
    );
  }

  const workStyle = behavioralData.work_style || "Balanced";
  const confidenceLevel = behavioralData.confidence_level || "Moderate";
  const attentionSpan = behavioralData.attention_span || "Consistent";
  const decisionPattern = behavioralData.decision_pattern || "Deliberate";

  const avgResponseTime =
    behavioralData.avg_response_time_seconds ??
    behavioralData.avg_response_time;

  const medianResponseTime = behavioralData.median_response_time_seconds;

  const fastestResponse = behavioralData.fastest_response_seconds;
  const slowestResponse = behavioralData.slowest_response_seconds;

  const totalTime =
    behavioralData.total_time_spent_seconds ??
    behavioralData.total_time_spent;

  const totalAnswerChanges = behavioralData.total_answer_changes ?? 0;
  const avgChangesPerQuestion = behavioralData.avg_changes_per_question ?? 0;

  const firstInstinctAccuracy = behavioralData.first_instinct_accuracy;
  const improvementRate = behavioralData.improvement_rate;

  const totalQuestionVisits = behavioralData.total_question_visits ?? 0;

  const revisitRate =
    behavioralData.revisit_rate ??
    behavioralData.question_revisit_rate;

  const skippedQuestions = behavioralData.skipped_questions ?? 0;
  const linearityScore = behavioralData.linearity_score;

  const firstHalfAvgTime = behavioralData.first_half_avg_time;
  const secondHalfAvgTime = behavioralData.second_half_avg_time;
  const fatigueFactor = behavioralData.fatigue_factor;

  const recommendedSupport =
    behavioralData.recommended_support ||
    "Provide balanced support with regular check-ins on progress.";

  const developmentFocusAreas = Array.isArray(
    behavioralData.development_focus_areas
  )
    ? behavioralData.development_focus_areas
    : Array.isArray(behavioralData.focus_areas)
    ? behavioralData.focus_areas
    : [];

  const hasPerQuestionTiming =
    getInsightStatus(fastestResponse) === "available" ||
    getInsightStatus(slowestResponse) === "available" ||
    getInsightStatus(avgResponseTime) === "available";

  const hasNavigationData =
    Number(totalQuestionVisits || 0) > 0 ||
    getInsightStatus(revisitRate) === "available";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Behavioral Insights</h2>
          <p style={styles.description}>
            Behavioral insights summarize how{" "}
            <strong>{candidateName || "the candidate"}</strong> interacted with
            the assessment. These indicators should support supervisor judgment
            and should be interpreted alongside the assessment score and
            category breakdown.
          </p>
        </div>
      </div>

      {!hasPerQuestionTiming && (
        <div style={styles.noticeBox}>
          <strong>Timing limitation:</strong> Per-question timing was not fully
          captured for this assessment attempt. Timing-based insights such as
          fastest response, slowest response, revisit rate, fatigue, and
          linearity may be limited or unavailable for this report.
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Behavioral Profile</h3>

        <div style={styles.insightGrid}>
          <InsightPanel
            title="Work Style"
            value={workStyle}
            description={getWorkStyleDescription(workStyle)}
            color="#1565C0"
          />

          <InsightPanel
            title="Confidence Level"
            value={confidenceLevel}
            description={getConfidenceDescription(confidenceLevel)}
            color="#2E7D32"
          />

          <InsightPanel
            title="Attention Span"
            value={attentionSpan}
            description={getAttentionDescription(attentionSpan)}
            color="#F57C00"
          />

          <InsightPanel
            title="Decision Pattern"
            value={decisionPattern}
            description={getDecisionDescription(decisionPattern)}
            color="#6A1B9A"
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Timing Metrics</h3>

        <div style={styles.metricsGrid}>
          <MetricCard
            title="Average Response"
            value={formatSeconds(avgResponseTime)}
            subtitle="Average time per captured question"
            color="#1565C0"
            background="#E3F2FD"
          />

          <MetricCard
            title="Median Response"
            value={formatSeconds(medianResponseTime)}
            subtitle="Middle response time"
            color="#1565C0"
            background="#E3F2FD"
          />

          <MetricCard
            title="Fastest Response"
            value={formatSeconds(fastestResponse)}
            subtitle="Fastest captured answer time"
            color="#2E7D32"
            background="#E8F5E9"
          />

          <MetricCard
            title="Slowest Response"
            value={formatSeconds(slowestResponse)}
            subtitle="Slowest captured answer time"
            color="#C62828"
            background="#FFEBEE"
          />

          <MetricCard
            title="Total Time Spent"
            value={formatTotalTime(totalTime)}
            subtitle="Total captured assessment duration"
            color="#0A1929"
            background="#F8FAFC"
          />

          <MetricCard
            title="Fatigue Factor"
            value={
              fatigueFactor === null || fatigueFactor === undefined
                ? "Not captured"
                : `${formatNumber(fatigueFactor)}s`
            }
            subtitle="Second-half pace minus first-half pace"
            color="#F57C00"
            background="#FFF3E0"
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Answer Behavior</h3>

        <div style={styles.metricsGrid}>
          <MetricCard
            title="Answer Changes"
            value={formatNumber(totalAnswerChanges, "0")}
            subtitle="Total recorded answer changes"
            color="#6A1B9A"
            background="#F3E5F5"
          />

          <MetricCard
            title="Avg Changes / Question"
            value={formatNumber(avgChangesPerQuestion, "0")}
            subtitle="Average revision behavior"
            color="#6A1B9A"
            background="#F3E5F5"
          />

          <MetricCard
            title="First Instinct Consistency"
            value={formatPercent(firstInstinctAccuracy, "Not captured")}
            subtitle="Initial answer retained as final answer"
            color="#2E7D32"
            background="#E8F5E9"
          />

          <MetricCard
            title="Improvement Rate"
            value={formatPercent(improvementRate, "Not captured")}
            subtitle="Answer changes that improved score, if tracked"
            color="#1565C0"
            background="#E3F2FD"
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Navigation Behavior</h3>

        <div style={styles.metricsGrid}>
          <MetricCard
            title="Total Visits"
            value={
              hasNavigationData
                ? formatNumber(totalQuestionVisits, "0")
                : "Not captured"
            }
            subtitle="Total question visits recorded"
            color="#0A1929"
            background="#F8FAFC"
          />

          <MetricCard
            title="Revisit Rate"
            value={
              hasNavigationData
                ? formatPercent(revisitRate, "0%")
                : "Not captured"
            }
            subtitle="Questions revisited after first view"
            color="#F57C00"
            background="#FFF3E0"
          />

          <MetricCard
            title="Skipped Questions"
            value={
              hasNavigationData
                ? formatNumber(skippedQuestions, "0")
                : "Not captured"
            }
            subtitle="Questions marked or detected as skipped"
            color="#C62828"
            background="#FFEBEE"
          />

          <MetricCard
            title="Linearity Score"
            value={
              hasNavigationData
                ? formatPercent(linearityScore, "0%")
                : "Not captured"
            }
            subtitle="How linearly candidate moved through questions"
            color="#1565C0"
            background="#E3F2FD"
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Pacing Split</h3>

        <div style={styles.metricsGrid}>
          <MetricCard
            title="First Half Avg Time"
            value={formatSeconds(firstHalfAvgTime)}
            subtitle="Average response time in first half"
            color="#2E7D32"
            background="#E8F5E9"
          />

          <MetricCard
            title="Second Half Avg Time"
            value={formatSeconds(secondHalfAvgTime)}
            subtitle="Average response time in second half"
            color="#F57C00"
            background="#FFF3E0"
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Supervisor Support Recommendation</h3>

        <div style={styles.recommendationBox}>
          <p style={styles.recommendationText}>{recommendedSupport}</p>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Development Focus Areas</h3>

        {developmentFocusAreas.length > 0 ? (
          <div style={styles.focusList}>
            {developmentFocusAreas.map((area, index) => (
              <span key={`${area}-${index}`} style={styles.focusPill}>
                {area}
              </span>
            ))}
          </div>
        ) : (
          <p style={styles.noFocusText}>
            No specific behavioral focus areas were generated for this report.
          </p>
        )}
      </div>

      <div style={styles.footerNote}>
        <strong>Interpretation note:</strong> Behavioral data describes how the
        candidate interacted with the assessment. These indicators should not be
        used alone for selection decisions. Use them together with score
        results, category performance, supervisor judgment, and practical
        validation.
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%"
  },
  header: {
    marginBottom: "24px"
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#0A1929",
    marginBottom: "8px"
  },
  description: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#475569",
    margin: 0
  },
  noticeBox: {
    background: "#FFF8E1",
    borderLeft: "5px solid #F57C00",
    padding: "14px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#7A4B00",
    marginBottom: "24px"
  },
  section: {
    marginBottom: "30px"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0A1929",
    marginBottom: "14px"
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px"
  },
  insightPanel: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 2px 8px rgba(15,23,42,0.04)"
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "10px"
  },
  insightDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0
  },
  insightTitle: {
    fontSize: "12px",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "2px"
  },
  insightValue: {
    fontSize: "15px",
    fontWeight: 700
  },
  insightDescription: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: 1.55,
    margin: 0
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px"
  },
  metricCard: {
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: "14px",
    padding: "16px",
    minHeight: "104px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  metricTitle: {
    fontSize: "12px",
    color: "#64748B",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.35px"
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: 800,
    marginTop: "8px",
    marginBottom: "6px"
  },
  metricSubtitle: {
    fontSize: "11px",
    color: "#64748B",
    lineHeight: 1.4
  },
  recommendationBox: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderLeft: "5px solid #1565C0",
    padding: "18px",
    borderRadius: "12px"
  },
  recommendationText: {
    fontSize: "14px",
    lineHeight: 1.65,
    color: "#334155",
    margin: 0
  },
  focusList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px"
  },
  focusPill: {
    padding: "8px 12px",
    background: "#E3F2FD",
    color: "#1565C0",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600
  },
  noFocusText: {
    fontSize: "13px",
    color: "#64748B"
  },
  footerNote: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "12px",
    lineHeight: 1.6,
    color: "#475569"
  },
  emptyState: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center"
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0A1929",
    marginBottom: "8px"
  },
  emptyText: {
    fontSize: "14px",
    color: "#64748B"
  }
};
