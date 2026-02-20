// Category-specific interpreters that use response patterns for professional analysis

export const interpretLeadership = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional leadership potential**. `;
    interpretation += `Responses indicate strong strategic thinking, effective people management, and the ability to inspire teams. `;
    interpretation += `Shows particular strength in decision-making and conflict resolution.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **solid leadership capabilities**. `;
    interpretation += `Demonstrates good judgment in people management and can effectively guide teams through most situations. `;
    interpretation += `With further development, could take on increased leadership responsibility.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **emerging leadership qualities**. `;
    interpretation += `Shows basic understanding of leadership concepts but would benefit from structured development in people management, delegation, and strategic thinking.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **limited leadership readiness**. `;
    interpretation += `Response patterns indicate gaps in key areas such as team motivation, conflict resolution, and strategic decision-making. `;
    interpretation += `Not currently suited for people management roles without significant development.`;
  } else {
    interpretation = `${candidateName} demonstrates **significant leadership gaps**. `;
    interpretation += `Critical development needed in fundamental leadership competencies. `;
    interpretation += `Currently更适合 for individual contributor roles with clear supervision.`;
  }
  
  // Add specific insights based on response patterns
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**Areas of strength:** Demonstrated good judgment in ${highScoreCount} key leadership scenarios.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**Critical development areas:** Struggled with ${lowScoreCount} leadership situations involving people management and strategic decisions.`;
  }
  
  return interpretation;
};

export const interpretCognitive = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional cognitive abilities**. `;
    interpretation += `Shows strong analytical thinking, pattern recognition, and problem-solving skills. `;
    interpretation += `Capable of handling complex, abstract concepts and making sound decisions with limited information.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} has **strong analytical capabilities**. `;
    interpretation += `Processes information effectively and handles most complex problems well. `;
    interpretation += `May occasionally need support with highly abstract or novel situations.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} shows **adequate cognitive ability**. `;
    interpretation += `Can handle structured problems and routine analytical tasks effectively. `;
    interpretation += `May struggle with highly complex or ambiguous situations without clear frameworks.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **limited analytical capacity**. `;
    interpretation += `Response patterns indicate difficulty with abstract reasoning and complex problem-solving. `;
    interpretation += `Best suited for roles with clear procedures and structured tasks.`;
  } else {
    interpretation = `${candidateName} shows **significant cognitive challenges**. `;
    interpretation += `Struggles with basic analytical tasks and logical reasoning. `;
    interpretation += `Requires clear, step-by-step guidance and simplified problem-solving approaches.`;
  }
  
  if (lowScoreCount > questionCount / 2) {
    interpretation += `\n\n**⚠️ Concern:** Performance was consistently low across most cognitive tasks, indicating potential limitations in handling analytical responsibilities.`;
  }
  
  return interpretation;
};

export const interpretCommunication = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, questionCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} is an **exceptional communicator**. `;
    interpretation += `Articulates ideas with clarity and impact. Adapts communication style effectively to different audiences and situations.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} communicates **effectively in most situations**. `;
    interpretation += `Expresses ideas clearly and engages well with others. May occasionally struggle with highly complex or sensitive messaging.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **adequate communication skills**. `;
    interpretation += `Can convey basic ideas but may lack persuasiveness or clarity in complex situations. Would benefit from communication training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **limited communication effectiveness**. `;
    interpretation += `Response patterns indicate difficulty articulating ideas clearly and adapting to different audiences. `;
    interpretation += `This may impact stakeholder engagement and team collaboration.`;
  } else {
    interpretation = `${candidateName} shows **significant communication gaps**. `;
    interpretation += `Struggles to express ideas clearly and may misunderstand others. `;
    interpretation += `Critical development needed for roles requiring stakeholder interaction.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**📌 Recommendation:** Consider communication skills training, presentation practice, and structured feedback sessions.`;
  }
  
  return interpretation;
};

export const interpretEthics = (data, candidateName) => {
  const { insights, highScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **strong ethical judgment and integrity**. `;
    interpretation += `Responses indicate a principled approach to decision-making, with clear understanding of right and wrong. `;
    interpretation += `This is a significant strength and foundation for trust.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **good ethical awareness**. `;
    interpretation += `Generally makes sound ethical choices and understands organizational values. `;
    interpretation += `May need occasional guidance in complex ethical dilemmas.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **adequate ethical understanding**. `;
    interpretation += `Follows rules and guidelines but may need support navigating ambiguous ethical situations. `;
    interpretation += `Would benefit from ethics training and clear governance structures.`;
  } else {
    interpretation = `${candidateName} shows **ethical concerns that require attention**. `;
    interpretation += `Response patterns indicate potential gaps in understanding ethical principles. `;
    interpretation += `Requires clear boundaries, supervision, and ethics education.`;
  }
  
  return interpretation;
};

export const interpretTechnical = (data, candidateName) => {
  const { insights, lowScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} has **strong technical expertise**. `;
    interpretation += `Demonstrates deep understanding of technical concepts and their practical application. `;
    interpretation += `Capable of handling complex technical challenges independently.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **solid technical knowledge**. `;
    interpretation += `Handles most technical tasks effectively. May need support with advanced or specialized areas.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **basic technical understanding**. `;
    interpretation += `Can perform routine technical tasks but needs development in advanced concepts and problem-solving. `;
    interpretation += `Would benefit from targeted technical training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **limited technical knowledge**. `;
    interpretation += `Response patterns indicate gaps in foundational technical concepts. `;
    interpretation += `Requires structured training and close supervision for technical tasks.`;
  } else {
    interpretation = `${candidateName} has **significant technical gaps**. `;
    interpretation += `Struggles with basic technical concepts and applications. `;
    interpretation += `Needs foundational training before taking on technical responsibilities.`;
  }
  
  if (lowScoreCount > 3) {
    interpretation += `\n\n**📌 Recommendation:** Enroll in foundational technical training programs and pair with experienced mentors for hands-on learning.`;
  }
  
  return interpretation;
};

export const interpretEmotional = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional emotional intelligence**. `;
    interpretation += `Highly self-aware, empathetic, and skilled at managing relationships. `;
    interpretation += `Navigates complex interpersonal situations with ease.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} has **strong emotional awareness**. `;
    interpretation += `Understands own emotions and those of others. Handles most interpersonal situations effectively.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} shows **adequate emotional intelligence**. `;
    interpretation += `Manages basic interpersonal dynamics but may struggle with conflict or high-stress situations. `;
    interpretation += `Would benefit from EI development.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **limited emotional awareness**. `;
    interpretation += `May struggle with self-awareness, empathy, and relationship management. `;
    interpretation += `This could impact team dynamics and collaboration.`;
  } else {
    interpretation = `${candidateName} has **significant emotional intelligence gaps**. `;
    interpretation += `Response patterns indicate challenges with self-awareness and interpersonal effectiveness. `;
    interpretation += `Critical development needed for roles requiring team collaboration.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**📌 Recommendation:** Participate in emotional intelligence workshops, practice active listening, and seek regular feedback on interpersonal interactions.`;
  }
  
  return interpretation;
};

export const interpretPerformance = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} is **highly results-driven**. `;
    interpretation += `Demonstrates strong accountability, sets challenging goals, and consistently delivers. `;
    interpretation += `Takes ownership of outcomes and drives for excellence.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} has **good performance orientation**. `;
    interpretation += `Meets targets consistently and takes accountability for results. `;
    interpretation += `May benefit from more aggressive goal-setting.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} shows **adequate performance focus**. `;
    interpretation += `Meets basic expectations but may need guidance in goal setting and accountability. `;
    interpretation += `Would benefit from performance management training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **inconsistent performance orientation**. `;
    interpretation += `Response patterns indicate challenges with accountability and meeting targets. `;
    interpretation += `May require close supervision and clear performance expectations.`;
  } else {
    interpretation = `${candidateName} has **significant performance gaps**. `;
    interpretation += `Struggles with accountability, goal achievement, and results delivery. `;
    interpretation += `Critical development needed in performance management.`;
  }
  
  return interpretation;
};

export const interpretCultural = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **strong cultural alignment**. `;
    interpretation += `Naturally embodies company values and enhances team dynamics. `;
    interpretation += `Would be a positive influence on organizational culture.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **good cultural fit**. `;
    interpretation += `Generally aligned with organizational values and contributes positively to team environment.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate cultural alignment**. `;
    interpretation += `Fits with most team norms but may need support in fully embracing company values. `;
    interpretation += `Would benefit from cultural integration activities.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **cultural fit concerns**. `;
    interpretation += `Response patterns indicate potential misalignment with company values. `;
    interpretation += `May require guidance to integrate effectively.`;
  } else {
    interpretation = `${candidateName} shows **significant cultural misalignment**. `;
    interpretation += `This is a hiring risk. May struggle to embrace organizational values and norms. `;
    interpretation += `Careful consideration needed for team placement.`;
  }
  
  return interpretation;
};

export const interpretProblemSolving = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} is an **exceptional problem-solver**. `;
    interpretation += `Approaches challenges systematically, identifies root causes effectively, and develops creative solutions. `;
    interpretation += `Thrives in complex, ambiguous situations.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} has **strong problem-solving skills**. `;
    interpretation += `Handles most challenges effectively with sound analysis. May need support with highly novel situations.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} shows **adequate problem-solving ability**. `;
    interpretation += `Can solve routine problems but may struggle with complex, ambiguous issues. `;
    interpretation += `Would benefit from structured problem-solving frameworks.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **limited problem-solving capability**. `;
    interpretation += `Response patterns indicate difficulty with analysis and solution generation. `;
    interpretation += `May rely on others for problem resolution.`;
  } else {
    interpretation = `${candidateName} has **significant problem-solving gaps**. `;
    interpretation += `Struggles to analyze situations and generate effective solutions. `;
    interpretation += `Needs structured guidance and clear procedures.`;
  }
  
  return interpretation;
};

export const interpretPersonality = (data, candidateName) => {
  const { insights, highScoreCount, lowScoreCount, percentage } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional resilience and adaptability**. `;
    interpretation += `Stable under pressure, flexible in approach, and maintains positive work patterns consistently.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} has **strong behavioral profile**. `;
    interpretation += `Generally stable, reliable, and adaptable. Handles most situations with composure.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} shows **moderate behavioral patterns**. `;
    interpretation += `May have some inconsistencies in work style or response to pressure. `;
    interpretation += `Would benefit from resilience training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **behavioral concerns**. `;
    interpretation += `May lack resilience or adaptability in challenging situations. `;
    interpretation += `Could struggle under pressure or with change.`;
  } else {
    interpretation = `${candidateName} has **significant behavioral challenges**. `;
    interpretation += `Response patterns indicate potential difficulties with stress, adaptability, and consistent performance. `;
    interpretation += `Requires structured support and clear expectations.`;
  }
  
  return interpretation;
};
