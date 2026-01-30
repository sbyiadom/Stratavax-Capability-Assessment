// Add these constants and functions to your component

const SECTION_CONFIG = {
  'Cognitive Abilities': {
    color: '#1565c0',
    icon: '🧠',
    description: 'Numerical, verbal, logical, and abstract reasoning skills'
  },
  'Personality Assessment': {
    color: '#7b1fa2',
    icon: '😊',
    description: 'Big Five personality traits and behavioral patterns'
  },
  'Leadership Potential': {
    color: '#d32f2f',
    icon: '👑',
    description: 'Vision, decision-making, team development, and communication'
  },
  'Technical Competence': {
    color: '#388e3c',
    icon: '⚙️',
    description: 'Problem-solving, technical knowledge, quality, and innovation'
  },
  'Performance Metrics': {
    color: '#f57c00',
    icon: '📊',
    description: 'Work ethic, adaptability, collaboration, and ethics'
  }
};

// In your return statement, update the section header:
<div style={{
  backgroundColor: SECTION_CONFIG[currentQuestion.section]?.color || '#1565c0',
  color: 'white',
  padding: '12px 20px',
  borderRadius: '8px',
  marginBottom: '25px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}}>
  <span style={{ fontSize: '20px' }}>
    {SECTION_CONFIG[currentQuestion.section]?.icon || '📋'}
  </span>
  <div>
    <div style={{ fontWeight: '600', fontSize: '18px' }}>
      {currentQuestion.section}
    </div>
    <div style={{ fontSize: '12px', opacity: 0.9 }}>
      {SECTION_CONFIG[currentQuestion.section]?.description || ''}
    </div>
  </div>
</div>

// Update the question counter:
<div style={{ 
  fontSize: '14px', 
  color: '#666',
  backgroundColor: '#f5f5f5',
  padding: '5px 10px',
  borderRadius: '12px',
  display: 'inline-block'
}}>
  Question {currentIndex + 1} of {totalQuestions} 
  • Section {Math.floor(currentIndex / 20) + 1} of 5
</div>

// Update progress tracking to show sections:
const getSectionProgress = (section) => {
  const sectionQuestions = questions.filter(q => q.section === section);
  const answered = sectionQuestions.filter(q => answers[q.id]).length;
  return { answered, total: sectionQuestions.length };
};

// In your progress display:
{SECTION_ORDER.map(section => {
  const progress = getSectionProgress(section);
  return (
    <div key={section} style={{ marginBottom: '10px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '13px',
        marginBottom: '5px'
      }}>
        <span>{SECTION_CONFIG[section]?.icon} {section}</span>
        <span>{progress.answered}/{progress.total}</span>
      </div>
      <div style={{
        height: '6px',
        backgroundColor: '#e0e0e0',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${(progress.answered / progress.total) * 100}%`,
          backgroundColor: SECTION_CONFIG[section]?.color || '#1565c0',
          borderRadius: '3px'
        }} />
      </div>
    </div>
  );
})}
