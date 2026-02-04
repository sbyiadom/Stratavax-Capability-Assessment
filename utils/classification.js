export function classifyTalent(totalScore) {
  if (totalScore >= 80) return "High Potential";
  if (totalScore >= 60) return "Medium Potential";
  if (totalScore >= 40) return "Low Potential";
  return "Needs Development";
}
