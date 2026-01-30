export function scoreBySection(responses) {
  const result = {};
  responses.forEach((r) => {
    result[r.section] = (result[r.section] || 0) + r.score;
  });
  return result;
}

export function totalScore(responses) {
  return responses.reduce((sum, r) => sum + r.score, 0);
}
