// ============================================
// STRATEGIC LEADERSHIP ASSESSMENT CATEGORIES
// ============================================

export const interpretVisionStrategy = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional strategic vision**. `;
    interpretation += `Articulates a compelling long-term direction, anticipates market trends, and creates clear strategic pathways. `;
    interpretation += `This is a hallmark of senior leadership capability.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong strategic thinking**. `;
    interpretation += `Sees the big picture, understands organizational dynamics, and can develop sound strategic plans with support. `;
    interpretation += `Has solid foundation for strategic roles.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate strategic ability**. `;
    interpretation += `Can contribute to strategic discussions but may need guidance in long-term planning and complex scenario analysis. `;
    interpretation += `Would benefit from strategic frameworks training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **limited strategic thinking**. `;
    interpretation += `Tends to focus on immediate operational concerns rather than long-term vision. `;
    interpretation += `Requires development in strategic planning and future orientation.`;
  } else {
    interpretation = `${candidateName} demonstrates **poor strategic capability**. `;
    interpretation += `Struggles to see beyond immediate tasks and lacks strategic perspective. `;
    interpretation += `Significant development needed in vision and planning.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong strategic thinking in ${highScoreCount} scenarios, showing vision and planning capability.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with strategic perspective and long-term planning.`;
  }
  
  return interpretation;
};

export const interpretPeopleLeadership = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional people leadership**. `;
    interpretation += `Develops and coaches teams effectively, builds high-performing cultures, and creates psychological safety. `;
    interpretation += `A natural leader who brings out the best in others.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong people leadership**. `;
    interpretation += `Effectively manages teams, provides constructive feedback, and supports professional growth. `;
    interpretation += `Well-suited for team leadership roles.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate people leadership skills**. `;
    interpretation += `Can manage teams but may need development in coaching, feedback delivery, and conflict resolution. `;
    interpretation += `Would benefit from leadership development programs.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **limited people leadership ability**. `;
    interpretation += `May struggle with team motivation, development, and engagement. `;
    interpretation += `Requires guidance in people management practices.`;
  } else {
    interpretation = `${candidateName} demonstrates **poor people leadership**. `;
    interpretation += `Struggles to effectively lead, develop, or engage teams. `;
    interpretation += `Significant development needed in people management.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong people leadership in ${highScoreCount} scenarios, showing team development and coaching capability.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with team leadership and people development.`;
  }
  
  return interpretation;
};

export const interpretDecisionMakingLeadership = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional decision-making**. `;
    interpretation += `Makes sound, timely decisions even under uncertainty, balances data with judgment, and owns outcomes. `;
    interpretation += `A trusted decision-maker for complex situations.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong decision-making skills**. `;
    interpretation += `Evaluates options thoroughly, considers trade-offs, and makes well-reasoned choices. `;
    interpretation += `Consistently reliable in most situations.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate decision-making ability**. `;
    interpretation += `Can handle routine decisions but may need support with complex or high-stakes choices. `;
    interpretation += `Would benefit from decision-making frameworks.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent decision-making**. `;
    interpretation += `May delay decisions, struggle with analysis, or make choices without sufficient information. `;
    interpretation += `Requires guidance in structured decision-making.`;
  } else {
    interpretation = `${candidateName} demonstrates **poor decision-making**. `;
    interpretation += `Struggles significantly with judgment, timeliness, and outcome ownership. `;
    interpretation += `Significant development needed in decision-making skills.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong decision-making in ${highScoreCount} scenarios, showing judgment and analytical capability.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with decision-making and judgment.`;
  }
  
  return interpretation;
};

export const interpretAccountabilityLeadership = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional accountability**. `;
    interpretation += `Takes full ownership of outcomes, learns from mistakes, and follows through on commitments without fail. `;
    interpretation += `A role model for responsibility and reliability.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong accountability**. `;
    interpretation += `Owns responsibilities, meets commitments, and takes responsibility for both successes and failures. `;
    interpretation += `Highly dependable and trustworthy.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate accountability**. `;
    interpretation += `Generally follows through but may sometimes deflect responsibility or need reminders. `;
    interpretation += `Would benefit from ownership development.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent accountability**. `;
    interpretation += `May avoid responsibility or blame external factors when things go wrong. `;
    interpretation += `Requires clear expectations and accountability structures.`;
  } else {
    interpretation = `${candidateName} demonstrates **poor accountability**. `;
    interpretation += `Consistently avoids responsibility and fails to follow through. `;
    interpretation += `Significant development needed in ownership and reliability.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong accountability in ${highScoreCount} scenarios, showing ownership and follow-through.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with accountability and ownership.`;
  }
  
  return interpretation;
};

export const interpretEmotionalIntelligenceLeadership = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional emotional intelligence**. `;
    interpretation += `Highly self-aware, empathetic, and skilled at managing relationships and conflict. `;
    interpretation += `Navigates complex interpersonal dynamics with ease.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong emotional intelligence**. `;
    interpretation += `Understands own emotions and those of others, manages relationships effectively, and handles conflict constructively. `;
    interpretation += `A strong foundation for leadership.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate emotional intelligence**. `;
    interpretation += `Manages basic interpersonal dynamics but may struggle with conflict, empathy, or self-awareness. `;
    interpretation += `Would benefit from EI development programs.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **limited emotional intelligence**. `;
    interpretation += `May struggle with self-awareness, empathy, or relationship management. `;
    interpretation += `Requires development in interpersonal skills.`;
  } else {
    interpretation = `${candidateName} demonstrates **poor emotional intelligence**. `;
    interpretation += `Significant challenges with self-awareness, empathy, and interpersonal effectiveness. `;
    interpretation += `Critical development needed for leadership roles.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong emotional intelligence in ${highScoreCount} scenarios, showing self-awareness and empathy.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with emotional intelligence and interpersonal effectiveness.`;
  }
  
  return interpretation;
};

export const interpretExecutionDrive = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional execution drive**. `;
    interpretation += `Consistently delivers results with urgency, overcomes obstacles, and maintains momentum. `;
    interpretation += `A results-oriented leader who gets things done.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong execution focus**. `;
    interpretation += `Drives results effectively, meets deadlines, and maintains accountability for delivery. `;
    interpretation += `Reliable in achieving objectives.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate execution capability**. `;
    interpretation += `Can deliver results but may need support with prioritization, follow-through, or overcoming obstacles. `;
    interpretation += `Would benefit from execution frameworks.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent execution**. `;
    interpretation += `May struggle with deadlines, follow-through, or maintaining momentum. `;
    interpretation += `Requires support in execution discipline.`;
  } else {
    interpretation = `${candidateName} demonstrates **poor execution**. `;
    interpretation += `Consistently struggles to deliver results, meet deadlines, or maintain accountability. `;
    interpretation += `Significant development needed in execution.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong execution drive in ${highScoreCount} scenarios, showing results orientation and follow-through.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with execution and delivery.`;
  }
  
  return interpretation;
};

export const interpretEthics = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional ethical judgment**. `;
    interpretation += `Consistently makes principled decisions, upholds integrity, and models ethical behavior. `;
    interpretation += `A trusted leader with strong moral compass.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong ethical awareness**. `;
    interpretation += `Generally makes ethical choices and understands the importance of integrity in leadership. `;
    interpretation += `May need guidance in complex ethical dilemmas.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate ethical judgment**. `;
    interpretation += `Follows rules but may need support navigating ambiguous ethical situations. `;
    interpretation += `Would benefit from ethics training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent ethical judgment**. `;
    interpretation += `Response patterns indicate potential gaps in ethical reasoning. `;
    interpretation += `Requires clear ethical guidelines and supervision.`;
  } else {
    interpretation = `${candidateName} demonstrates **significant ethical concerns**. `;
    interpretation += `This is a major red flag for leadership roles requiring trust and integrity. `;
    interpretation += `Immediate attention and structured guidance needed.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong ethical judgment in ${highScoreCount} scenarios, showing integrity and principled decision-making.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate potential ethical blind spots that need addressing.`;
  }
  
  return interpretation;
};
