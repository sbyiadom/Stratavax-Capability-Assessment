export default function QuestionCard({ 
  question, 
  selected, 
  onSelect, 
  disabled = false,
  saveStatus = null 
}) {
  if (!question) return null;

  const getStatusColor = () => {
    if (saveStatus === 'saving') return '#ff9800';
    if (saveStatus === 'saved') return '#4caf50';
    if (saveStatus === 'error') return '#f44336';
    return null;
  };

  const getStatusText = () => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'saved') return 'Saved';
    if (saveStatus === 'error') return 'Save failed';
    return '';
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  return (
    <div>
      {/* Save Status Message */}
      {statusColor && (
        <div style={{
          padding: '10px 15px',
          marginBottom: '20px',
          borderRadius: '6px',
          backgroundColor: `${statusColor}10`,
          border: `1px solid ${statusColor}`,
          color: statusColor,
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          {statusText}
        </div>
      )}

      <p style={{ fontWeight: 600, fontSize: "18px", marginBottom: "20px" }}>
        {question.question_text}
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options && question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => !disabled && onSelect(opt.id)}
            disabled={disabled}
            style={{
              padding: "12px 15px",
              borderRadius: 8,
              border: selected === opt.id ? "2px solid #4CAF50" : "1px solid #ccc",
              background: selected === opt.id ? "#e8f5e9" : "#fff",
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "left",
              transition: "all 0.2s",
              opacity: disabled ? 0.7 : 1,
              fontSize: "16px",
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = selected === opt.id ? "#d4edda" : "#f8f9fa";
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = selected === opt.id ? "#e8f5e9" : "#fff";
              }
            }}
          >
            {opt.answer_text}
          </button>
        ))}
      </div>
    </div>
  );
}
