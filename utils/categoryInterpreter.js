// Category-specific interpreters that generate unique narratives based on response patterns

export const interpretLeadership = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = `${candidateName} demonstrates `;
  
  if (highScoreCount >= questionCount * 0.7) {
    interpretation += `strong leadership potential. `;
    interpretation += `Particularly strong in strategic decision-making and team development. `;
  } else if (lowScoreCount >= questionCount * 0.5) {
    interpretation += `significant gaps in leadership capabilities. `;
    interpretation += `Critical development needed in people management and strategic thinking. `;
  } else {
    interpretation += `mixed leadership capabilities. `;
    interpretation += `Areas of strength exist but require development in key competencies. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nKey observations:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretCognitive = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `demonstrates strong analytical thinking and problem-solving abilities. `;
    interpretation += `Shows capacity for complex reasoning and logical analysis. `;
  } else if (percentage >= 50) {
    interpretation += `shows moderate cognitive abilities. `;
    interpretation += `Can handle structured tasks but may struggle with complexity. `;
  } else {
    interpretation += `shows significant challenges in cognitive reasoning. `;
    interpretation += `Struggles with analytical tasks and complex problem-solving. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nResponse analysis:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretCommunication = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `communicates effectively in most situations. `;
    interpretation += `Articulates ideas clearly and adapts to audience needs. `;
  } else if (percentage >= 50) {
    interpretation += `has basic communication skills but needs development. `;
    interpretation += `Can convey ideas but may struggle with complex messaging. `;
  } else {
    interpretation += `struggles with effective communication. `;
    interpretation += `Needs development in articulating ideas and engaging stakeholders. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nKey insights:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretEthics = (data, candidateName) => {
  const { insights, highScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 80) {
    interpretation += `demonstrates strong ethical judgment and integrity. `;
    interpretation += `Responses indicate a principled approach to decision-making. `;
  } else if (percentage >= 60) {
    interpretation += `shows adequate ethical awareness. `;
    interpretation += `May need guidance in complex ethical situations. `;
  } else {
    interpretation += `has ethical concerns that need attention. `;
    interpretation += `Requires clear boundaries and supervision. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nBased on responses:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretTechnical = (data, candidateName) => {
  const { insights, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `has strong technical knowledge and skills. `;
    interpretation += `Demonstrates depth in technical areas. `;
  } else if (percentage >= 50) {
    interpretation += `has basic technical understanding. `;
    interpretation += `Needs development in advanced concepts and practical application. `;
  } else {
    interpretation += `has significant gaps in technical knowledge. `;
    interpretation += `Responses indicate lack of depth in key technical areas. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nAreas for development:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretEmotional = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `demonstrates strong emotional intelligence. `;
    interpretation += `Self-aware, empathetic, and skilled at managing relationships. `;
  } else if (percentage >= 50) {
    interpretation += `has moderate emotional awareness. `;
    interpretation += `May struggle with complex interpersonal dynamics. `;
  } else {
    interpretation += `shows gaps in emotional intelligence. `;
    interpretation += `May struggle with self-awareness and conflict management. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nKey observations:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretPerformance = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `is results-driven with strong accountability. `;
    interpretation += `Sets and achieves challenging goals consistently. `;
  } else if (percentage >= 50) {
    interpretation += `has adequate focus on results. `;
    interpretation += `May need guidance in goal setting and performance tracking. `;
  } else {
    interpretation += `shows inconsistent performance orientation. `;
    interpretation += `Struggles with accountability and meeting targets. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nPerformance insights:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretCultural = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `demonstrates strong cultural alignment. `;
    interpretation += `Embodies company values and enhances team dynamics. `;
  } else if (percentage >= 50) {
    interpretation += `shows moderate cultural fit. `;
    interpretation += `Some areas may need attention for full integration. `;
  } else {
    interpretation += `has cultural fit concerns. `;
    interpretation += `May not fully align with company values and norms. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nCultural insights:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretProblemSolving = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `is an excellent problem-solver. `;
    interpretation += `Systematic, creative, and effective in all situations. `;
  } else if (percentage >= 50) {
    interpretation += `has moderate problem-solving skills. `;
    interpretation += `May need support with complex or novel issues. `;
  } else {
    interpretation += `struggles with problem-solving. `;
    interpretation += `Difficulties with analysis and solution generation. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nProblem-solving insights:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};

export const interpretPersonality = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = `${candidateName} `;
  
  if (percentage >= 70) {
    interpretation += `demonstrates stable, resilient, and adaptable behavior. `;
    interpretation += `Consistently positive work patterns. `;
  } else if (percentage >= 50) {
    interpretation += `shows moderate behavioral patterns. `;
    interpretation += `May have some inconsistencies in work style. `;
  } else {
    interpretation += `has behavioral concerns. `;
    interpretation += `May lack resilience or adaptability. `;
  }
  
  if (insights && insights.length > 0) {
    interpretation += `\n\nBehavioral insights:\n`;
    insights.slice(0, 2).forEach(insight => {
      interpretation += `• ${insight}\n`;
    });
  }
  
  return interpretation;
};
