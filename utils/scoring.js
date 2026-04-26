// utils/scoring.js

/**
 * Calculate total score from responses
 * @param {Array} responses - Array of response objects with score property
 * @returns {number} Total score
 */
export const calculateTotalScore = (responses) => {
  if (!responses || responses.length === 0) return 0;
  return responses.reduce((total, response) => total + (response.score || 0), 0);
};

/**
 * Calculate percentage score
 * @param {number} score - Earned score
 * @param {number} maxScore - Maximum possible score
 * @returns {number} Percentage (0-100)
 */
export const calculatePercentage = (score, maxScore) => {
  if (!maxScore || maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
};

/**
 * Get overall classification based on score percentage
 * @param {number} totalScore - Total earned score
 * @param {number} maxScore - Maximum possible score (default 500)
 * @returns {string} Classification label
 */
export const getOverallClassification = (totalScore, maxScore = 500) => {
  const percentage = calculatePercentage(totalScore, maxScore);
  
  if (percentage >= 85) return 'High Potential';
  if (percentage >= 70) return 'Strong Performer';
  if (percentage >= 55) return 'Developing';
  if (percentage >= 40) return 'At Risk';
  return 'High Risk';
};

/**
 * Get grade based on percentage
 * @param {number} percentage - Score percentage
 * @returns {string} Grade letter
 */
export const getGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 40) return 'D';
  return 'F';
};

/**
 * Get classification details with color and description
 * @param {number} totalScore - Total earned score
 * @param {number} maxScore - Maximum possible score
 * @returns {Object} Classification details
 */
export const getClassificationDetails = (totalScore, maxScore = 500) => {
  const percentage = calculatePercentage(totalScore, maxScore);
  const classification = getOverallClassification(totalScore, maxScore);
  
  const details = {
    'High Potential': { color: '#2E7D32', bg: '#E8F5E9', description: 'Exceptional capability ready for strategic challenges' },
    'Strong Performer': { color: '#4CAF50', bg: '#E8F5E9', description: 'Solid performance with reliable capability' },
    'Developing': { color: '#FF9800', bg: '#FFF3E0', description: 'Foundational competence with growth opportunities' },
    'At Risk': { color: '#F44336', bg: '#FFEBEE', description: 'Significant gaps requiring attention' },
    'High Risk': { color: '#8B0000', bg: '#FFEBEE', description: 'Critical gaps needing immediate intervention' }
  };
  
  return {
    classification,
    percentage,
    ...details[classification],
    grade: getGrade(percentage)
  };
};
