// utils/resolveRiskLevel.js
// Single source of truth for risk level resolution across report surfaces.
//
// Why this exists:
//   Multiple report components had hardcoded fallbacks like `|| 'Medium'`
//   which misled supervisors when the underlying risk_level column was
//   missing from an API response. This helper prefers real data in priority
//   order and never invents a value.
//
// Priority:
//   1. result.risk_level       (DB column, canonical)
//   2. result.riskLevel        (camelCase variant)
//   3. report.risk_level
//   4. report.riskLevel
//   5. proctoring.summary.riskLevel / risk_level
//   6. Derived from risk_score (>=70 = high, >=40 = medium, else low)
//   7. 'Not available'
//
// Usage:
//   import { resolveRiskLevel } from '../../utils/resolveRiskLevel';
//   const riskLevel = resolveRiskLevel(result, report, proctoringData);

export function resolveRiskLevel(result, report, proctoringData) {
  const fromResult = result?.risk_level || result?.riskLevel;
  const fromReport = report?.risk_level || report?.riskLevel;
  const fromProctoring =
    proctoringData?.summary?.riskLevel ||
    proctoringData?.summary?.risk_level;

  const candidate = fromResult || fromReport || fromProctoring;
  if (typeof candidate === 'string' && candidate.trim() !== '') {
    return candidate;
  }

  // Derive from risk_score if no explicit level is available.
  const score = Number(
    result?.risk_score ??
    report?.risk_score ??
    report?.riskScore ??
    proctoringData?.summary?.riskScore
  );
  if (Number.isFinite(score)) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  return 'Not available';
}

// Alternative: shared badge-style resolver so all three files colour the
// badge the same way. Used by report components for consistency.
export function getRiskBadgeTone(riskLevel) {
  const text = String(riskLevel || '').toLowerCase();
  if (text.includes('high') || text.includes('critical')) return 'critical';
  if (text.includes('medium') || text.includes('elevated') || text.includes('moderate')) return 'warn';
  if (text.includes('low') || text.includes('minimal')) return 'good';
  return 'neutral';
}

export default { resolveRiskLevel, getRiskBadgeTone };
