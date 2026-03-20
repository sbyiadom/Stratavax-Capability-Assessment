{/* SECTION 1: COVER PAGE */}
<section style={{...styles.section, display: activeSection === 'cover' || showPrintView ? 'block' : 'none'}}>
  <div style={styles.coverPage}>
    <div style={styles.coverHeader}>
      <h1 style={styles.coverTitle}>STRATAVAX</h1>
      <p style={styles.coverSubtitle}>{assessmentDisplayName}</p> {/* This line is key */}
    </div>
    
    <div style={styles.coverContent}>
      <div style={styles.coverLogo}>📊</div>
      <h2 style={styles.coverCandidateName}>{candidate.full_name}</h2>
      <p style={styles.coverDetail}>Assessment: {assessmentDisplayName}</p> {/* And this line */}
      <p style={styles.coverDetail}>Date Taken: {new Date(selectedAssessment.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p style={styles.coverDetail}>Report Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      {superAnalysis && (
        <p style={styles.coverDetail}>Profile ID: {superAnalysis.profileId}</p>
      )}
      <div style={styles.coverBadge}>CONFIDENTIAL</div>
    </div>
    
    <div style={styles.coverFooter}>
      <p>© Stratavax • All Rights Reserved</p>
    </div>
  </div>
</section>
