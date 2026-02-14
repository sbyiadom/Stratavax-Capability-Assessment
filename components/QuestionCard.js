// components/QuestionCard.js
export default function QuestionCard({ 
  question, 
  selected, 
  onSelect, 
  disabled = false,
  saveStatus = null 
}) {
  if (!question) return null;

  console.log("QuestionCard render:", { questionId: question.id, selected, saveStatus });

  const getStatusColor = () => {
    if (saveStatus === 'saving') return '#ff9800';
    if (saveStatus === 'saved') return '#4caf50';
    if (saveStatus === 'error') return '#f44336';
    return null;
  };

  const getStatusText = () => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'saved') return 'Saved ✓';
    if (saveStatus === 'error') return 'Save failed - retrying...';
    return '';
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  const handleOptionClick = (optionId) => {
    console.log("Option clicked:", { questionId: question.id, optionId });
    if (!disabled && onSelect) {
      onSelect(question.id, optionId);
    }
  };

  return (
    <div>
      {/* Save Status Message */}
      {statusColor && (
        <div style={{
          padding: '10px 15px',
          marginBottom: '20px',
          borderRadius: '6px',
          backgroundColor: `${statusColor}20`,
          border: `1px solid ${statusColor}`,
          color: statusColor,
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          {statusText}
        </div>
      )}

      <p style={{ fontWeight: 600, fontSize: "18px", marginBottom: "20px" }}>
        {question.question_text}
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {question.answers && question.answers.map((opt) => {
          const isSelected = selected === opt.id;
          
          return (
            <button
              key={opt.id}
              onClick={() => handleOptionClick(opt.id)}
              disabled={disabled}
              style={{
                padding: "15px 20px",
                borderRadius: "8px",
                border: isSelected ? "2px solid #4CAF50" : "1px solid #e2e8f0",
                background: isSelected ? "#e8f5e9" : "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                opacity: disabled ? 0.7 : 1,
                fontSize: "16px",
                width: "100%",
                boxShadow: isSelected ? "0 2px 4px rgba(76, 175, 80, 0.2)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: isSelected ? "2px solid #4CAF50" : "2px solid #cbd5e1",
                  background: isSelected ? "#4CAF50" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {isSelected && <span style={{ color: "white", fontSize: "14px" }}>✓</span>}
                </div>
                <span style={{ 
                  color: isSelected ? "#2e7d32" : "#1e293b",
                  fontWeight: isSelected ? 500 : 400
                }}>
                  {opt.answer_text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
