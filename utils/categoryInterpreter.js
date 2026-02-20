// Category-specific interpreters that generate unique narratives based on response patterns

export const interpretLeadership = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = `🟡 Leadership & Management – ${percentage}% (${getGradeLetter(percentage)})\n\n`;
  
  if (highScoreCount >= 5) {
    interpretation += `${candidateName} demonstrates strong leadership potential. `;
    interpretation += `Particularly strong in strategic decision-making and team development. `;
  } else if (lowScoreCount >= 5) {
    interpretation += `${candidateName} shows significant gaps in leadership capabilities. `;
    interpretation += `Critical development needed in people management and strategic thinking. `;
  } else {
    interpretation += `${candidateName} shows mixed leadership capabilities. `;
    interpretation += `Areas of strength exist but require development in key competencies. `;
  }
  
  interpretation += `\n\nKey observations from responses:\n`;
  insights.slice(0, 2).forEach(insight => {
    interpretation += `• ${insight}\n`;
  });
  
  if (lowScoreCount > 0) {
    interpretation += `\n⚠️ Critical areas needing attention: ${lowScoreCount} responses indicate gaps in understanding.\n`;
  }
  
  return interpretation;
};

export const interpretCognitive = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = `🔴 Cognitive Ability – ${percentage}% (${getGradeLetter(percentage)})\n\n`;
  
  if (highScoreCount >= 5) {
    interpretation += `${candidateName} demonstrates strong analytical thinking and problem-solving abilities. `;
    interpretation += `Shows capacity for complex reasoning and logical analysis. `;
  } else if (lowScoreCount >= 5) {
    interpretation += `${candidateName} shows significant challenges in cognitive reasoning. `;
    interpretation += `Struggles with analytical tasks and complex problem-solving. `;
  } else {
    interpretation += `${candidateName} shows moderate cognitive abilities. `;
    interpretation += `Can handle structured tasks but may struggle with complexity. `;
  }
  
  interpretation += `\n\nResponse analysis:\n`;
  insights.slice(0, 3).forEach(insight => {
    interpretation += `• ${insight}\n`;
  });
  
  if (percentage < 50) {
    interpretation += `\n🔴 This is a critical concern for roles requiring analytical thinking.\n`;
  }
  
  return interpretation;
};

export const interpretCommunication = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `🟡 Communication – ${percentage}% (${getGradeLetter(percentage)})\n\n`;
  
  if (highScoreCount > lowScoreCount) {
    interpretation += `${candidateName} communicates effectively in most situations. `;
    interpretation += `Articulates ideas clearly and adapts to audience needs. `;
  } else {
    interpretation += `${candidateName} struggles with effective communication. `;
    interpretation += `Needs development in articulating ideas and engaging stakeholders. `;
  }
  
  interpretation += `\nKey insights:\n`;
  insights.slice(0, 2).forEach(insight => {
    interpretation += `• ${insight}\n`;
  });
  
  return interpretation;
};

export const interpretEthics = (data, candidateName) => {
  const { insights, highScoreCount, percentage } = data;
  
  let interpretation = `🟢 Ethics & Integrity – ${percentage}% (${getGradeLetter(percentage)})\n\n`;
  
  if (highScoreCount > 3) {
    interpretation += `${candidateName} demonstrates strong ethical judgment and integrity. `;
    interpretation += `Responses indicate a principled approach to decision-making. `;
  } else {
    interpretation += `${candidateName} shows adequate ethical awareness but may need guidance in complex situations. `;
  }
  
  interpretation += `\nBased on responses:\n`;
  insights.slice(0, 2).forEach(insight => {
    interpretation += `• ${insight}\n`;
  });
  
  return interpretation;
};

export const interpretTechnical = (data, candidateName) => {
  const { insights, lowScoreCount, percentage } = data;
  
  let interpretation = `🔴 Technical & Manufacturing – ${percentage}% (${getGradeLetter(percentage)})\n\n`;
  
  if (lowScoreCount > 3) {
    interpretation += `${candidateName} has significant gaps in technical knowledge. `;
    interpretation += `Responses indicate lack of depth in key technical areas. `;
  } else {
    interpretation += `${candidateName} shows basic technical understanding but needs development in advanced concepts. `;
  }
  
  interpretation += `\nAreas for development:\n`;
  insights.slice(0, 2).forEach(insight => {
    interpretation += `• ${insight}\n`;
  });
  
  return interpretation;
};

const getGradeLetter = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};
