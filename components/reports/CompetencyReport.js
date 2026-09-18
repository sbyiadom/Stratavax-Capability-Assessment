// components/reports/CompetencyReport.js
// Phase 6 — Competency Reports
// Pure presentational component.
// Consumes the payload shape from /api/reports/competency-summary.
//
// Two modes:
//   mode="single" → per-candidate profile with cohort band
//   mode="rollup" → per-assessment aggregate table
//
// No data fetching. No side effects. Renders whatever it is given.

import React from 'react';

// ============================================================
// CONSTANTS
// ============================================================
const CLASSIFICATION_COLORS = {
  'Exceptional':          { bg: '#dcfce7', fg: '#166534', bar: '#16a34a' },
  'Strong Performer':     { bg: '#dbeafe', fg: '#1e40af', bar: '#2563eb' },
  'Capable Contributor':  { bg: '#e2e8f0', fg: '#334155', bar: '#64748b' },
  'Developing':           { bg: '#fef3c7', fg: '#92400e', bar: '#f59e0b' },
  'At Risk':              { bg: '#fee2e2', fg: '#991b1b', bar: '#dc2626' },
  'High Risk':            { bg: '#fecaca', fg: '#7f1d1d', bar: '#991b1b' },
};

const DISCRIMINATION_UI = {
  low:      { label: 'Low discrimination',      bg: '#fef3c7', fg: '#92400e', tip: 'This competency is not separating candidates — consider reviewing the questions.' },
  moderate: { label: 'Moderate discrimination', bg: '#e0f2fe', fg: '#075985', tip: 'This competency shows some spread across candidates.' },
  good:     { label: 'Good discrimination',     bg: '#dcfce7', fg: '#166534', tip: 'This competency clearly separates candidates.' },
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  // Preserve one decimal when present, drop trailing .0
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function classificationStyle(classification) {
  return CLASSIFICATION_COLORS[classification] || {
    bg: '#f1f5f9', fg: '#475569', bar: '#94a3b8',
  };
}

function discriminationStyle(level) {
  return DISCRIMINATION_UI[level] || null;
}

// ============================================================
// STYLES (inline object — matches project convention)
// ============================================================
const styles = {
  wrapper: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px 24px',
    marginTop: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0b2a4e',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  headerMeta: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'right',
    lineHeight: 1.5,
  },
  emptyState: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px 24px',
    color: '#475569',
  },
  emptyTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 6px 0',
  },
  emptyText: {
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#64748b',
    margin: 0,
  },

  // ---------- SINGLE MODE ----------
  singleRow: {
    padding: '14px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  singleRowLast: {
    padding: '14px 0 0 0',
  },
  singleRowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  singleName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  singleCategory: {
    fontSize: '11px',
    color: '#94a3b8',
    marginLeft: '8px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  singleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  singleScore: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    minWidth: '56px',
    textAlign: 'right',
  },
  classificationBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  bandTrack: {
    position: 'relative',
    height: '24px',
    background: '#f1f5f9',
    borderRadius: '6px',
    overflow: 'hidden',
    marginTop: '4px',
  },
  bandFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: '6px',
    background: '#e0f2fe',
    border: '1px solid #bae6fd',
  },
  bandFillLow: {
    background: 'repeating-linear-gradient(45deg, #fef3c7, #fef3c7 6px, #fde68a 6px, #fde68a 12px)',
    border: '1px solid #fcd34d',
  },
  bandMarker: {
    position: 'absolute',
    top: '-2px',
    bottom: '-2px',
    width: '3px',
    background: '#0b2a4e',
    borderRadius: '2px',
    boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
  },
  bandMarkerDot: {
    position: 'absolute',
    top: '50%',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#0b2a4e',
    transform: 'translate(-50%, -50%)',
    border: '2px solid #ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    zIndex: 3,
  },
  bandLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  bandMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#64748b',
    marginTop: '6px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  discriminationTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  cohortMetaText: {
    fontSize: '11px',
    color: '#94a3b8',
  },

  // ---------- ROLLUP MODE ----------
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: '#f8fafc',
    color: '#475569',
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  thNumeric: {
    textAlign: 'right',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    color: '#1e293b',
  },
  tdNumeric: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  rollupName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
  },
  rollupCategory: {
    fontSize: '11px',
    color: '#94a3b8',
    display: 'block',
    marginTop: '2px',
  },
  classificationBar: {
    display: 'flex',
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    background: '#f1f5f9',
    marginTop: '6px',
    minWidth: '140px',
  },
  classificationSeg: {
    height: '100%',
  },
  distributionLegend: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    fontSize: '10px',
    color: '#64748b',
    marginTop: '8px',
  },
  legendDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '2px',
    marginRight: '4px',
    verticalAlign: 'middle',
  },
  statCell: {
    fontSize: '13px',
    color: '#334155',
    fontVariantNumeric: 'tabular-nums',
  },
  statCellMuted: {
    fontSize: '12px',
    color: '#64748b',
  },

  note: {
    marginTop: '16px',
    padding: '10px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#64748b',
    lineHeight: 1.6,
  },
};

// ============================================================
// SINGLE MODE — one competency row with cohort band
// ============================================================
function SingleCompetencyRow({ competency, isLast }) {
  const name = competency?.name || 'Unknown competency';
  const category = competency?.category || null;
  const pct = safeNumber(competency?.percentage, 0);
  const classification = competency?.classification || null;
  const rawScore = safeNumber(competency?.rawScore, 0);
  const maxPossible = safeNumber(competency?.maxPossible, 0);
  const questionCount = safeNumber(competency?.questionCount, 0);

  const cohort = competency?.cohort || {};
  const cohortN = safeNumber(cohort?.n, 0);
  const cohortMin = cohort?.min;
  const cohortMax = cohort?.max;
  const cohortMean = cohort?.mean;
  const cohortStddev = cohort?.stddev;
  const discrimination = cohort?.discrimination || null;

  const clsStyle = classificationStyle(classification);
  const discStyle = discriminationStyle(discrimination);

  const hasBand = cohortN >= 2
    && Number.isFinite(Number(cohortMin))
    && Number.isFinite(Number(cohortMax))
    && Number(cohortMax) > Number(cohortMin);

  // Band layout: scale 0..100 across the track
  const bandLeft = hasBand ? Math.max(0, Math.min(100, Number(cohortMin))) : 0;
  const bandRight = hasBand ? Math.max(0, Math.min(100, Number(cohortMax))) : 0;
  const bandWidth = hasBand ? Math.max(0.5, bandRight - bandLeft) : 0; // minimum visual width

  const markerLeft = Math.max(0, Math.min(100, pct));

  return (
    <div style={isLast ? styles.singleRowLast : styles.singleRow}>
      <div style={styles.singleRowHeader}>
        <div>
          <span style={styles.singleName}>{name}</span>
          {category && <span style={styles.singleCategory}>{category}</span>}
        </div>
        <div style={styles.singleRight}>
          <span style={styles.singleScore}>{fmtPct(pct)}</span>
          {classification && (
            <span
              style={{
                ...styles.classificationBadge,
                background: clsStyle.bg,
                color: clsStyle.fg,
              }}
            >
              {classification}
            </span>
          )}
        </div>
      </div>

      {/* Cohort band */}
      {hasBand ? (
        <>
          <div style={styles.bandTrack}>
            <div
              style={{
                ...styles.bandFill,
                ...(discrimination === 'low' ? styles.bandFillLow : null),
                left: `${bandLeft}%`,
                width: `${bandWidth}%`,
              }}
            />
            <div
              style={{
                ...styles.bandMarkerDot,
                left: `${markerLeft}%`,
              }}
              title={`This candidate: ${fmtPct(pct)}`}
            />
          </div>
          <div style={styles.bandLabels}>
            <span>0%</span>
            <span>100%</span>
          </div>
        </>
      ) : (
        <div style={styles.cohortMetaText}>
          Cohort comparison unavailable (n&nbsp;=&nbsp;{cohortN}).
        </div>
      )}

      <div style={styles.bandMeta}>
        <div>
          <span style={styles.cohortMetaText}>
            {rawScore} / {maxPossible} pts
            {questionCount > 0 ? ` · ${questionCount} questions` : ''}
            {hasBand ? ` · cohort n=${cohortN}` : ''}
          </span>
        </div>
        {discStyle && (
          <span
            style={{
              ...styles.discriminationTag,
              background: discStyle.bg,
              color: discStyle.fg,
            }}
            title={discStyle.tip}
          >
            {discStyle.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ROLLUP MODE — one row per competency, aggregate stats
// ============================================================
function RollupRow({ competency, isLast }) {
  const name = competency?.name || 'Unknown competency';
  const category = competency?.category || null;
  const n = safeNumber(competency?.n, 0);
  const mean = competency?.mean;
  const medianValue = competency?.median;
  const min = competency?.min;
  const max = competency?.max;
  const stddev = competency?.stddev;
  const discrimination = competency?.discrimination || null;
  const counts = competency?.classificationCounts || {};

  const discStyle = discriminationStyle(discrimination);

  // Build classification distribution bar
  const order = [
    'Exceptional',
    'Strong Performer',
    'Capable Contributor',
    'Developing',
    'At Risk',
    'High Risk',
  ];
  const total = order.reduce((sum, key) => sum + safeNumber(counts[key], 0), 0);

  const segments = order
    .map((key) => ({
      key,
      count: safeNumber(counts[key], 0),
      pct: total > 0 ? (safeNumber(counts[key], 0) / total) * 100 : 0,
      color: CLASSIFICATION_COLORS[key]?.bar || '#94a3b8',
    }))
    .filter((s) => s.count > 0);

  return (
    <tr>
      <td style={isLast ? { ...styles.td, borderBottom: 'none' } : styles.td}>
        <div style={styles.rollupName}>{name}</div>
        {category && <span style={styles.rollupCategory}>{category}</span>}
        <div style={styles.classificationBar}>
          {segments.map((s) => (
            <div
              key={s.key}
              style={{
                ...styles.classificationSeg,
                width: `${s.pct}%`,
                background: s.color,
              }}
              title={`${s.key}: ${s.count}`}
            />
          ))}
        </div>
      </td>

      <td style={{ ...styles.td, ...styles.tdNumeric }}>
        <span style={styles.statCell}>{n}</span>
      </td>

      <td style={{ ...styles.td, ...styles.tdNumeric }}>
        <span style={styles.statCell}>{fmtPct(mean)}</span>
        <div style={styles.statCellMuted}>
          {fmtPct(medianValue)} median
        </div>
      </td>

      <td style={{ ...styles.td, ...styles.tdNumeric }}>
        <span style={styles.statCellMuted}>
          {fmtPct(min)} – {fmtPct(max)}
        </span>
      </td>

      <td style={{ ...styles.td, ...styles.tdNumeric }}>
        <span style={styles.statCell}>{fmtPct(stddev)}</span>
      </td>

      <td style={styles.td}>
        {discStyle && (
          <span
            style={{
              ...styles.discriminationTag,
              background: discStyle.bg,
              color: discStyle.fg,
            }}
            title={discStyle.tip}
          >
            {discStyle.label}
          </span>
        )}
      </td>
    </tr>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CompetencyReport({
  mode = 'single',
  data,
  title,
  subtitle,
  emptyMessage,
}) {
  // -------------------- Guard: no data at all --------------------
  if (!data) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>{title || 'Competency Report'}</h3>
          </div>
        </div>
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>Competency data not loaded</p>
          <p style={styles.emptyText}>
            The competency summary could not be retrieved for this view.
          </p>
        </div>
      </div>
    );
  }

  // -------------------- Empty: no competencies for this attempt --------------------
  const competencies = Array.isArray(data.competencies) ? data.competencies : [];
  const hasCompetencies = data.hasCompetencies !== false && competencies.length > 0;

  if (!hasCompetencies) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>{title || 'Competency Report'}</h3>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <div style={styles.headerMeta}>
            {mode === 'single' ? 'Single candidate' : 'Assessment rollup'}
          </div>
        </div>
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>Competency scoring not available for this attempt</p>
          <p style={styles.emptyText}>
            {emptyMessage ||
              data.message ||
              'This assessment attempt does not have competency scores. ' +
              'Competency data is generated for assessments completed under the current scoring engine.'}
          </p>
        </div>
      </div>
    );
  }

  // -------------------- Header for populated views --------------------
  const headerMetaSingle = mode === 'single'
    ? `n = ${competencies[0]?.cohort?.n ?? '—'}`
    : `n = ${data.candidateCount ?? '—'}`;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>
            {title || (mode === 'single' ? 'Competency Profile' : 'Competency Rollup')}
          </h3>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        <div style={styles.headerMeta}>
          {mode === 'single' ? (
            <>
              <div>Competency profile</div>
              <div>{headerMetaSingle} · cohort</div>
            </>
          ) : (
            <>
              <div>{data.assessmentTitle || 'Assessment'}</div>
              <div>{data.candidateCount ?? 0} candidates · {competencies.length} competencies</div>
            </>
          )}
        </div>
      </div>

      {/* -------------------- SINGLE MODE -------------------- */}
      {mode === 'single' && (
        <div>
          {competencies.map((c, idx) => (
            <SingleCompetencyRow
              key={c.competencyId ?? idx}
              competency={c}
              isLast={idx === competencies.length - 1}
            />
          ))}
        </div>
      )}

      {/* -------------------- ROLLUP MODE -------------------- */}
      {mode === 'rollup' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Competency</th>
                  <th style={{ ...styles.th, ...styles.thNumeric }}>n</th>
                  <th style={{ ...styles.th, ...styles.thNumeric }}>Mean / Median</th>
                  <th style={{ ...styles.th, ...styles.thNumeric }}>Range</th>
                  <th style={{ ...styles.th, ...styles.thNumeric }}>Std Dev</th>
                  <th style={styles.th}>Discrimination</th>
                </tr>
              </thead>
              <tbody>
                {competencies.map((c, idx) => (
                  <RollupRow
                    key={c.competencyId ?? idx}
                    competency={c}
                    isLast={idx === competencies.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Distribution legend */}
          <div style={styles.distributionLegend}>
            <span><span style={{ ...styles.legendDot, background: CLASSIFICATION_COLORS['Exceptional'].bar }} />Exceptional</span>
            <span><span style={{ ...styles.legendDot, background: CLASSIFICATION_COLORS['Strong Performer'].bar }} />Strong Performer</span>
            <span><span style={{ ...styles.legendDot, background: CLASSIFICATION_COLORS['Capable Contributor'].bar }} />Capable Contributor</span>
            <span><span style={{ ...styles.legendDot, background: CLASSIFICATION_COLORS['Developing'].bar }} />Developing</span>
            <span><span style={{ ...styles.legendDot, background: CLASSIFICATION_COLORS['At Risk'].bar }} />At Risk</span>
            <span><span style={{ ...styles.legendDot, background: CLASSIFICATION_COLORS['High Risk'].bar }} />High Risk</span>
          </div>

          <div style={styles.note}>
            <strong>Reading this table:</strong> Std Dev measures how widely scores are spread across
            candidates. When Std Dev is below 5 points (flagged as “Low discrimination”), the
            competency is not separating candidates — the questions for that competency may need
            review. This is a signal about the <em>assessment</em>, not about any individual.
          </div>
        </>
      )}
    </div>
  );
}
