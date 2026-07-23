// In the behavioral matrix section, add this after the stats

{/* Violation Comments */}
{behavioralMatrix.behavior?.violationComments && behavioralMatrix.behavior.violationComments.length > 0 && (
  <div style={styles.violationCommentsSection}>
    <h4 style={styles.violationCommentsTitle}>Violation Details</h4>
    {behavioralMatrix.behavior.violationComments.map((item, index) => (
      <div key={index} style={styles.violationCommentItem}>
        <div style={styles.violationCommentHeader}>
          <span style={styles.violationCommentType}>
            {item.label} ({item.count})
          </span>
          <span style={{
            ...styles.violationCommentSeverity,
            color: item.severity === 'critical' ? '#dc2626' :
                   item.severity === 'high' ? '#f59e0b' :
                   item.severity === 'medium' ? '#f97316' : '#64748b'
          }}>
            {item.severity.toUpperCase()}
          </span>
        </div>
        <div style={styles.violationCommentText}>{item.comment}</div>
        <div style={styles.violationCommentRecommendation}>
          <strong>Recommendation:</strong> {item.recommendation}
        </div>
      </div>
    ))}
  </div>
)}

{/* Risk Assessment with Comments */}
<div style={styles.riskAssessmentSection}>
  <h4 style={styles.riskAssessmentTitle}>Risk Assessment</h4>
  <div style={styles.riskAssessmentSummary}>{behavioralMatrix.riskAssessment?.summary}</div>
  <div style={styles.riskAssessmentDetail}>{behavioralMatrix.riskAssessment?.detail}</div>
  <div style={styles.riskAssessmentAction}>
    <strong>Recommended Action:</strong> {behavioralMatrix.riskAssessment?.action}
  </div>
</div>

{/* Flagged Questions with Comments */}
{behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
  <div style={styles.flaggedQuestionsSection}>
    <h4 style={styles.flaggedQuestionsTitle}>Flagged Questions</h4>
    {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
      <div key={index} style={styles.flaggedQuestionItem}>
        <span style={styles.flaggedQuestionId}>Question {q.question_id}</span>
        <span style={styles.flaggedQuestionTime}>{q.time_seconds}s</span>
        <span style={styles.flaggedQuestionComment}>{q.comment}</span>
        <span style={styles.flaggedQuestionRecommendation}>{q.recommendation}</span>
      </div>
    ))}
  </div>
)}
