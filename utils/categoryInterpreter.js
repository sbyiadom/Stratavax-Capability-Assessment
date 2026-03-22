// ============================================
// GENERAL ASSESSMENT CATEGORIES
// ============================================

export const interpretIntegrity = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional integrity and ethical judgment**. `;
    interpretation += `Responses consistently show strong moral principles, honesty, and a commitment to doing what's right, even when unsupervised. `;
    interpretation += `This is a foundational strength for any role requiring trust and accountability.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **good ethical awareness**. `;
    interpretation += `Generally makes principled decisions and understands the importance of integrity in the workplace. `;
    interpretation += `May occasionally need guidance in complex ethical dilemmas.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **adequate ethical understanding**. `;
    interpretation += `Follows rules and guidelines but may need support navigating ambiguous ethical situations. `;
    interpretation += `Would benefit from ethics training and clear governance structures.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent ethical judgment**. `;
    interpretation += `Response patterns indicate potential gaps in understanding ethical principles. `;
    interpretation += `Requires clear boundaries, supervision, and ethics education.`;
  } else {
    interpretation = `${candidateName} demonstrates **significant ethical concerns**. `;
    interpretation += `This is a major red flag for roles requiring trust and integrity. `;
    interpretation += `Immediate attention and structured guidance needed.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong ethical judgment in ${highScoreCount} key scenarios.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate potential ethical blind spots that need addressing.`;
  }
  
  return interpretation;
};

export const interpretWorkPace = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional productivity and efficiency**. `;
    interpretation += `Consistently works at a fast pace without sacrificing quality. `;
    interpretation += `Thrives in deadline-driven environments and manages multiple priorities effectively.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **good work pace and productivity**. `;
    interpretation += `Generally meets deadlines and maintains steady output. `;
    interpretation += `Can handle reasonable workloads but may need support during peak periods.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **adequate work pace**. `;
    interpretation += `Completes tasks in a timely manner but may need help with prioritization and efficiency. `;
    interpretation += `Would benefit from time management training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent productivity**. `;
    interpretation += `May struggle to maintain steady work pace and meet deadlines. `;
    interpretation += `Requires clear expectations and regular check-ins.`;
  } else {
    interpretation = `${candidateName} demonstrates **significant productivity concerns**. `;
    interpretation += `Struggles to complete tasks in a timely manner. `;
    interpretation += `Needs structured support and close supervision.`;
  }
  
  return interpretation;
};

export const interpretMotivations = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} is **highly self-motivated and driven**. `;
    interpretation += `Demonstrates strong intrinsic motivation, seeks challenges, and shows initiative without prompting. `;
    interpretation += `This internal drive is a valuable asset for roles requiring autonomy.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **good motivation levels**. `;
    interpretation += `Generally engaged and willing to take on responsibilities. `;
    interpretation += `May need occasional external motivation for less interesting tasks.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **adequate motivation**. `;
    interpretation += `Responds to clear goals and expectations but may lack initiative. `;
    interpretation += `Benefits from regular feedback and recognition.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent motivation**. `;
    interpretation += `May require frequent prompting and external motivation. `;
    interpretation += `Struggles to maintain engagement with routine tasks.`;
  } else {
    interpretation = `${candidateName} demonstrates **low motivation levels**. `;
    interpretation += `Shows little initiative and may disengage easily. `;
    interpretation += `Needs structured environment with clear incentives and close supervision.`;
  }
  
  return interpretation;
};

export const interpretNeuroticism = (data, candidateName) => {
  const { percentage } = data;
  
  // Note: For Neuroticism, lower scores are better (emotional stability)
  // But our percentage is based on answers, so we need to invert interpretation
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **high emotional stability**. Remains calm under pressure, handles stress effectively, and bounces back quickly from setbacks. This is a significant strength for high-pressure roles.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good emotional stability**. Generally handles pressure well but may occasionally show signs of stress in challenging situations.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate emotional stability**. Can manage routine stress but may struggle with high-pressure situations or unexpected challenges.`;
  } else if (percentage >= 50) {
    return `${candidateName} shows signs of **emotional sensitivity**. May be prone to stress and anxiety in challenging situations. Would benefit from stress management techniques.`;
  } else {
    return `${candidateName} demonstrates **significant emotional reactivity**. May struggle considerably with stress and pressure. Requires supportive environment and stress management training.`;
  }
};

export const interpretExtraversion = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly extraverted**. Energized by social interaction, naturally engaging, and comfortable in team environments. Thrives in collaborative roles and client-facing positions.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good extraversion**. Comfortable in social situations and works well with others. Can adapt to both collaborative and independent work.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate extraversion**. Functions well in teams but also values independent work time. Balances social interaction with solitude.`;
  } else if (percentage >= 50) {
    return `${candidateName} tends toward **introversion**. Prefers independent work and may find excessive social interaction draining. Best suited for roles with limited team collaboration.`;
  } else {
    return `${candidateName} is **highly introverted**. Strongly prefers solitary work and may find team environments challenging. Best placed in roles requiring deep focus and minimal social interaction.`;
  }
};

export const interpretMixedTraits = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **well-integrated personality traits**. Shows adaptability and flexibility across different situations. Can adjust style based on context.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **balanced personality traits**. Generally adaptable but may have preferred modes of operating.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderately integrated traits**. Can adapt but may have some rigidity in certain situations.`;
  } else if (percentage >= 50) {
    return `${candidateName} shows **some inconsistency** in personality expression. May struggle to adapt style to different situations.`;
  } else {
    return `${candidateName} demonstrates **significant rigidity** in personality. May struggle to adapt to different situations and expectations.`;
  }
};

export const interpretAgreeableness = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly agreeable**. Cooperative, compassionate, and skilled at maintaining positive relationships. Naturally builds trust and fosters team harmony.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good agreeableness**. Generally cooperative and considerate of others. Maintains positive working relationships.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate agreeableness**. Can be cooperative but may prioritize own needs at times.`;
  } else if (percentage >= 50) {
    return `${candidateName} tends toward **competitiveness** over cooperation. May prioritize own agenda over team harmony. Could benefit from teamwork training.`;
  } else {
    return `${candidateName} demonstrates **low agreeableness**. May be perceived as challenging to work with. Could struggle with team collaboration and conflict resolution.`;
  }
};

export const interpretBehavioralStyle = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **highly effective behavioral patterns**. Adapts behavior appropriately to situations, shows strong self-awareness, and maintains professionalism consistently.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good behavioral adaptability**. Generally appropriate in most situations with occasional missteps.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderately effective behavioral patterns**. May need guidance on appropriate workplace behavior in certain contexts.`;
  } else if (percentage >= 50) {
    return `${candidateName} shows **inconsistent behavioral patterns**. May struggle with professional conduct and situational appropriateness.`;
  } else {
    return `${candidateName} demonstrates **concerning behavioral patterns**. May have difficulty with professional conduct and workplace norms. Requires clear guidelines and feedback.`;
  }
};

export const interpretConscientiousness = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly conscientious**. Organized, dependable, and detail-oriented. Takes responsibilities seriously and follows through consistently. A reliable and trustworthy team member.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good conscientiousness**. Generally organized and reliable. Follows through on commitments.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate conscientiousness**. Can be organized but may need support with prioritization and follow-through.`;
  } else if (percentage >= 50) {
    return `${candidateName} shows **inconsistent conscientiousness**. May struggle with organization, deadlines, and follow-through.`;
  } else {
    return `${candidateName} demonstrates **low conscientiousness**. May be disorganized, unreliable, and struggle with commitments. Requires structured support and clear expectations.`;
  }
};

export const interpretPerformanceRisks = (data, candidateName) => {
  const { percentage, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} presents **minimal performance risks**. Demonstrates strong accountability, consistent delivery, and effective performance management.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} presents **low performance risks**. Generally meets expectations but may have isolated areas needing attention.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} presents **moderate performance risks**. May have inconsistent delivery or accountability in certain areas.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} presents **elevated performance risks**. Shows patterns of inconsistent performance and accountability gaps.`;
  } else {
    interpretation = `${candidateName} presents **significant performance risks**. Demonstrates consistent challenges with accountability, delivery, and performance standards. Requires close supervision and clear performance expectations.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Multiple responses indicate performance vulnerabilities that need addressing.`;
  }
  
  return interpretation;
};

export const interpretStressManagement = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional stress management**. Remains composed under pressure, thinks clearly in crises, and maintains performance during challenging times.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good stress management**. Generally handles pressure well but may show signs of stress in extreme situations.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate stress management**. Can handle routine pressure but may struggle with high-stress situations.`;
  } else if (percentage >= 50) {
    return `${candidateName} shows **limited stress management skills**. May become overwhelmed under pressure and performance may decline.`;
  } else {
    return `${candidateName} demonstrates **poor stress management**. Easily overwhelmed by pressure and may struggle significantly in demanding situations. Needs support and stress management training.`;
  }
};

export const interpretCognitivePatterns = (data, candidateName) => {
  const { percentage, lowScoreCount, questionCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional cognitive abilities**. Shows strong analytical thinking, pattern recognition, and problem-solving skills. Capable of handling complex, abstract concepts.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} has **strong cognitive abilities**. Processes information effectively and handles most complex problems well.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} shows **adequate cognitive ability**. Can handle structured problems and routine analytical tasks effectively.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} demonstrates **limited analytical capacity**. May struggle with abstract reasoning and complex problem-solving. Best suited for roles with clear procedures.`;
  } else {
    interpretation = `${candidateName} shows **significant cognitive challenges**. Struggles with basic analytical tasks and logical reasoning. Requires clear, step-by-step guidance and simplified problem-solving approaches.`;
  }
  
  if (lowScoreCount > questionCount / 2) {
    interpretation += `\n\n**⚠️ Concern:** Performance was consistently low across most cognitive tasks, indicating potential limitations in handling analytical responsibilities.`;
  }
  
  return interpretation;
};

export const interpretEmotionalIntelligence = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional emotional intelligence**. Highly self-aware, empathetic, and skilled at managing relationships. Navigates complex interpersonal situations with ease.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong emotional intelligence**. Understands own emotions and those of others. Handles most interpersonal situations effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} shows **adequate emotional intelligence**. Manages basic interpersonal dynamics but may struggle with conflict or high-stress situations. Would benefit from EI development.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited emotional awareness**. May struggle with self-awareness, empathy, and relationship management. Could impact team dynamics.`;
  } else {
    return `${candidateName} has **significant emotional intelligence gaps**. Response patterns indicate challenges with self-awareness and interpersonal effectiveness. Critical development needed for roles requiring team collaboration.`;
  }
};

export const interpretOpenness = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly open to experience**. Creative, curious, and embraces innovation. Seeks new experiences and adapts well to change. Valuable for roles requiring innovation and adaptability.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **good openness**. Receptive to new ideas and willing to try new approaches.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate openness**. May need encouragement to embrace change and innovation.`;
  } else if (percentage >= 50) {
    return `${candidateName} tends toward **practicality over innovation**. Prefers familiar approaches and may resist change.`;
  } else {
    return `${candidateName} demonstrates **low openness**. Strongly prefers routine and familiar approaches. May struggle significantly with change and innovation.`;
  }
};

// ============================================
// PERSONALITY ASSESSMENT - NEW 6 TRAITS
// ============================================

export const interpretOwnership = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional ownership**. `;
    interpretation += `Takes full responsibility for outcomes, proactively drives results, and owns mistakes as learning opportunities. `;
    interpretation += `This is a hallmark of high performers and future leaders.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong ownership**. `;
    interpretation += `Generally takes responsibility for work and follows through on commitments. `;
    interpretation += `Occasionally may need encouragement to step up in challenging situations.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate ownership**. `;
    interpretation += `Accepts responsibility for assigned tasks but may hesitate to take initiative beyond defined scope. `;
    interpretation += `Would benefit from opportunities to stretch accountability.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent ownership**. `;
    interpretation += `May sometimes deflect responsibility or wait for direction rather than taking initiative. `;
    interpretation += `Requires clear expectations and regular accountability check-ins.`;
  } else {
    interpretation = `${candidateName} demonstrates **limited ownership**. `;
    interpretation += `Tends to avoid responsibility and may blame external factors for challenges. `;
    interpretation += `Significant development needed in accountability and initiative.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong ownership in ${highScoreCount} key scenarios, showing reliability and accountability.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with taking full ownership and accountability.`;
  }
  
  return interpretation;
};

export const interpretCollaboration = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional collaboration skills**. `;
    interpretation += `Builds strong team relationships, actively seeks diverse perspectives, and elevates collective performance. `;
    interpretation += `A natural team player who fosters psychological safety.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong collaboration**. `;
    interpretation += `Works effectively with others, shares credit generously, and contributes to team goals. `;
    interpretation += `May need occasional encouragement to include quieter team members.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate collaboration**. `;
    interpretation += `Cooperates when needed but may prefer working independently. `;
    interpretation += `Would benefit from teamwork development and shared goal alignment.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent collaboration**. `;
    interpretation += `May struggle with team dynamics or prioritize individual goals over team success. `;
    interpretation += `Requires guidance on effective collaboration and communication.`;
  } else {
    interpretation = `${candidateName} demonstrates **limited collaboration**. `;
    interpretation += `Often works in silos and may struggle with teamwork. `;
    interpretation += `Significant development needed in interpersonal and team skills.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong collaboration in ${highScoreCount} scenarios, showing team orientation and interpersonal effectiveness.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with teamwork and collaboration.`;
  }
  
  return interpretation;
};

export const interpretAction = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional action orientation**. `;
    interpretation += `Moves quickly on priorities, makes decisive choices, and takes initiative without waiting for direction. `;
    interpretation += `Thrives in fast-paced, dynamic environments.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong action orientation**. `;
    interpretation += `Generally proactive and willing to act. Makes timely decisions with appropriate information. `;
    interpretation += `Occasionally may benefit from slowing down to ensure thoroughness.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate action orientation**. `;
    interpretation += `Takes action when prompted but may hesitate without clear direction. `;
    interpretation += `Would benefit from building confidence in independent decision-making.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent action orientation**. `;
    interpretation += `May delay decisions or wait for instructions rather than taking initiative. `;
    interpretation += `Requires encouragement to act and develop urgency.`;
  } else {
    interpretation = `${candidateName} demonstrates **limited action orientation**. `;
    interpretation += `Struggles with decisiveness and initiative. `;
    interpretation += `Significant development needed in proactive execution.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong action orientation in ${highScoreCount} scenarios, showing decisiveness and initiative.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with taking initiative and decisive action.`;
  }
  
  return interpretation;
};

export const interpretAnalysis = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional analytical thinking**. `;
    interpretation += `Thoroughly analyzes problems, seeks data before acting, and thinks systematically. `;
    interpretation += `Excels in roles requiring careful planning and evidence-based decisions.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong analytical skills**. `;
    interpretation += `Gathers necessary information and considers options before acting. `;
    interpretation += `May occasionally need support with complex analysis.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate analytical ability**. `;
    interpretation += `Considers basic factors but may not always dig deeper for root causes. `;
    interpretation += `Would benefit from structured analytical frameworks.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent analysis**. `;
    interpretation += `May act without sufficient information or fail to consider alternatives. `;
    interpretation += `Requires guidance on systematic problem-solving.`;
  } else {
    interpretation = `${candidateName} demonstrates **limited analytical thinking**. `;
    interpretation += `Struggles with structured analysis and may rely on intuition without data. `;
    interpretation += `Significant development needed in analytical skills.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong analytical thinking in ${highScoreCount} scenarios, showing thoroughness and systematic approach.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with thorough analysis and structured thinking.`;
  }
  
  return interpretation;
};

export const interpretRiskTolerance = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **healthy risk tolerance**. `;
    interpretation += `Comfortable with uncertainty, experiments with new approaches, and pushes boundaries appropriately. `;
    interpretation += `Balances innovation with prudence.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **good risk awareness**. `;
    interpretation += `Willing to try new approaches when supported, while maintaining reasonable caution. `;
    interpretation += `May need encouragement for bolder initiatives.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate risk orientation**. `;
    interpretation += `Generally prefers proven approaches but will accept calculated risks with support. `;
    interpretation += `Would benefit from confidence-building in uncertain situations.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **cautious risk approach**. `;
    interpretation += `Prefers certainty and may avoid necessary risks. `;
    interpretation += `Requires encouragement to embrace innovation and change.`;
  } else {
    interpretation = `${candidateName} demonstrates **excessive risk aversion**. `;
    interpretation += `Struggles with uncertainty and resists new approaches. `;
    interpretation += `Significant development needed in adaptability and innovation.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated appropriate risk-taking in ${highScoreCount} scenarios, balancing innovation with caution.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate excessive caution that may limit innovation and adaptability.`;
  }
  
  return interpretation;
};

export const interpretStructure = (data, candidateName) => {
  const { percentage, highScoreCount, lowScoreCount } = data;
  
  let interpretation = '';
  
  if (percentage >= 80) {
    interpretation = `${candidateName} demonstrates **exceptional process orientation**. `;
    interpretation += `Follows procedures reliably, respects established systems, and maintains consistent quality. `;
    interpretation += `Provides stability and reliability to teams.`;
  } else if (percentage >= 70) {
    interpretation = `${candidateName} shows **strong structure orientation**. `;
    interpretation += `Generally follows processes and values consistency. `;
    interpretation += `May need flexibility in novel situations.`;
  } else if (percentage >= 60) {
    interpretation = `${candidateName} has **moderate process adherence**. `;
    interpretation += `Follows procedures when clear but may improvise without guidance. `;
    interpretation += `Would benefit from structured training.`;
  } else if (percentage >= 50) {
    interpretation = `${candidateName} shows **inconsistent process adherence**. `;
    interpretation += `May skip steps or improvise without considering consequences. `;
    interpretation += `Requires reinforcement of procedures and quality standards.`;
  } else {
    interpretation = `${candidateName} demonstrates **limited process orientation**. `;
    interpretation += `Struggles to follow procedures consistently and may create instability. `;
    interpretation += `Significant development needed in process discipline.`;
  }
  
  if (highScoreCount > lowScoreCount && highScoreCount > 2) {
    interpretation += `\n\n**✅ Strength:** Demonstrated strong process orientation in ${highScoreCount} scenarios, showing reliability and consistency.`;
  }
  
  if (lowScoreCount > 2) {
    interpretation += `\n\n**⚠️ Concern:** Responses in ${lowScoreCount} areas indicate challenges with following processes and maintaining consistency.`;
  }
  
  return interpretation;
};


// ============================================
// LEADERSHIP ASSESSMENT CATEGORIES
// ============================================

export const interpretVision = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional strategic thinking**. Articulates a compelling vision, anticipates future trends, and creates clear direction. A natural strategic leader.`;
  } else if (percentage >= 70) {
    return `${candidateName} shows **strong strategic thinking**. Sees the big picture and understands organizational direction.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate strategic ability**. Can think ahead but may need support in long-term planning.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited strategic thinking**. Tends to focus on immediate tasks rather than long-term vision.`;
  } else {
    return `${candidateName} shows **poor strategic thinking**. Struggles to see beyond immediate concerns. Needs development in vision and planning.`;
  }
};

export const interpretDecisionMaking = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly decisive and analytical**. Makes sound judgments consistently, even under pressure. Balances data with intuition effectively.`;
  } else if (percentage >= 70) {
    return `${candidateName} is a **good decision-maker**. Handles most decisions effectively with thorough analysis.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate decision-making skills**. May need support with complex or high-stakes choices.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **inconsistent decision-making**. May struggle with analysis and timely decisions.`;
  } else {
    return `${candidateName} shows **poor decision-making**. Significant concerns in judgment and problem-solving.`;
  }
};

export const interpretInfluence = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is a **powerful influencer**. Communicates persuasively and gains buy-in at all levels. Naturally inspires and motivates others.`;
  } else if (percentage >= 70) {
    return `${candidateName} is **influential**. Persuades effectively in most situations and builds consensus.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate influence**. Can communicate ideas but may struggle with persuasion.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited influence**. May struggle to gain buy-in and persuade others.`;
  } else {
    return `${candidateName} shows **poor influence skills**. Communication lacks persuasiveness and impact.`;
  }
};

export const interpretPeopleManagement = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **exceptional people manager**. Develops and coaches others effectively, builds high-performing teams, and creates psychological safety.`;
  } else if (percentage >= 70) {
    return `${candidateName} is a **good people manager**. Supports team development and provides effective coaching.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate people management skills**. Needs development in coaching and team development.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited people management ability**. May struggle with developing others.`;
  } else {
    return `${candidateName} shows **poor people management**. Not ready for team leadership responsibilities.`;
  }
};

export const interpretChangeLeadership = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **exceptional change leader**. Drives transformation, adapts quickly, and helps others navigate change effectively.`;
  } else if (percentage >= 70) {
    return `${candidateName} is **good at managing change**. Adapts well and supports others through transitions.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate change agility**. May need support during organizational transitions.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited change adaptability**. May struggle with change.`;
  } else {
    return `${candidateName} shows **poor change agility**. Resists or struggles significantly with change.`;
  }
};

export const interpretExecution = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly execution-focused**. Drives results with disciplined follow-through and strong accountability. Consistently delivers.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good execution focus**. Delivers results consistently with solid follow-through.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate execution skills**. May need help with follow-through and accountability.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **inconsistent execution**. May struggle to deliver results reliably.`;
  } else {
    return `${candidateName} shows **poor execution**. Significant accountability concerns.`;
  }
};

export const interpretResilience = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly resilient**. Thrives under pressure, bounces back quickly from setbacks, and maintains performance during challenges.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good resilience**. Handles pressure well and recovers from setbacks.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate resilience**. May struggle under intense pressure.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited resilience**. May be overwhelmed by pressure.`;
  } else {
    return `${candidateName} shows **poor resilience**. Struggles significantly with stress and setbacks.`;
  }
};

export const interpretSelfAwareness = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly self-aware**. Understands own strengths, weaknesses, and impact on others. Seeks and acts on feedback effectively.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good self-awareness**. Generally aware of own capabilities and impact.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate self-awareness**. May have some blind spots.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited self-awareness**. May lack insight into own behavior and impact.`;
  } else {
    return `${candidateName} shows **poor self-awareness**. Significant blind spots and resistance to feedback.`;
  }
};


// ============================================
// COGNITIVE ASSESSMENT CATEGORIES
// ============================================

export const interpretLogicalReasoning = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional logical reasoning**. Excellent pattern recognition, abstract thinking, and systematic problem-solving.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong logical reasoning**. Handles abstract concepts and patterns well.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate logical skills**. May need support with complex logic.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited logical reasoning**. Struggles with abstract concepts.`;
  } else {
    return `${candidateName} shows **poor logical reasoning**. Significant concerns in analytical thinking.`;
  }
};

export const interpretNumericalReasoning = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional numerical reasoning**. Highly comfortable with data, statistics, and quantitative analysis.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong numerical skills**. Handles numbers and data analysis effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate numerical ability**. Needs support with complex calculations.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited numerical reasoning**. Struggles with data interpretation.`;
  } else {
    return `${candidateName} shows **poor numerical reasoning**. Significant gaps in quantitative thinking.`;
  }
};

export const interpretVerbalReasoning = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional verbal reasoning**. Excellent comprehension, language processing, and communication of complex ideas.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong verbal skills**. Understands language well and communicates effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate verbal ability**. May need support with complex language.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited verbal reasoning**. Struggles with language comprehension.`;
  } else {
    return `${candidateName} shows **poor verbal reasoning**. Significant concerns in language processing.`;
  }
};

export const interpretSpatialReasoning = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional spatial reasoning**. Visualizes and manipulates objects mentally with ease. Strong in design and technical roles.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong spatial skills**. Handles spatial tasks and visualization well.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate spatial ability**. Needs development in visualization.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited spatial reasoning**. Struggles with spatial tasks.`;
  } else {
    return `${candidateName} shows **poor spatial reasoning**. Significant gaps in spatial thinking.`;
  }
};

export const interpretMemoryAttention = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional memory and attention**. Excellent recall and sustained focus on details.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong memory and focus**. Attentive to details and good recall.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate memory**. May miss some details or have occasional lapses.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited memory**. May struggle with detail retention.`;
  } else {
    return `${candidateName} shows **poor memory and attention**. Significant concerns in recall and focus.`;
  }
};

export const interpretPerceptualSpeed = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional perceptual speed**. Processes visual information quickly and accurately.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good speed and accuracy**. Reliable in most perceptual tasks.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate speed**. May need more time for perceptual tasks.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited perceptual skills**. May be slow or error-prone.`;
  } else {
    return `${candidateName} shows **poor perceptual skills**. Significant concerns in speed and accuracy.`;
  }
};

export const interpretCriticalThinking = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional critical thinking**. Analyzes arguments, identifies assumptions, and evaluates evidence systematically.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong critical thinking**. Evaluates information effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate critical thinking**. May need support with complex analysis.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited critical thinking**. May accept information without sufficient analysis.`;
  } else {
    return `${candidateName} shows **poor critical thinking**. Struggles to evaluate arguments and evidence.`;
  }
};

export const interpretLearningAgility = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional learning agility**. Rapidly acquires new skills and adapts to new situations. A quick learner.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good learning agility**. Picks up new concepts well.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate learning pace**. Needs time to master new areas.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited learning agility**. May be slow to acquire new skills.`;
  } else {
    return `${candidateName} shows **poor learning agility**. Difficulty acquiring new skills and adapting.`;
  }
};

export const interpretMentalFlexibility = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional mental flexibility**. Easily shifts between different concepts and adapts thinking to new information.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good mental flexibility**. Adapts thinking when needed.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate mental flexibility**. May need support with cognitive shifts.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited mental flexibility**. May get stuck in thinking patterns.`;
  } else {
    return `${candidateName} shows **poor mental flexibility**. Difficulty adapting thinking to new situations.`;
  }
};


// ============================================
// TECHNICAL ASSESSMENT CATEGORIES
// ============================================

export const interpretTechnicalKnowledge = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional technical knowledge**. Deep understanding of systems, technologies, and best practices. A technical expert.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong technical knowledge**. Solid grasp of core concepts and applications.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate technical knowledge**. Needs training in advanced areas.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited technical knowledge**. Requires foundational training.`;
  } else {
    return `${candidateName} shows **poor technical knowledge**. Significant gaps needing immediate attention.`;
  }
};

export const interpretSystemUnderstanding = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional system understanding**. Comprehends complex interactions, dependencies, and integration points.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good system understanding**. Grasps how components work together.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate system knowledge**. May need help understanding complex interactions.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited system understanding**. Struggles with integrated concepts.`;
  } else {
    return `${candidateName} shows **poor system understanding**. Difficulty seeing the big picture.`;
  }
};

export const interpretTroubleshooting = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **exceptional troubleshooter**. Quickly identifies root causes and implements effective solutions. Systematic and thorough.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong troubleshooting skills**. Handles most issues effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate troubleshooting**. May need support with complex problems.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited troubleshooting**. Struggles with problem diagnosis.`;
  } else {
    return `${candidateName} shows **poor troubleshooting**. Significant difficulties in problem resolution.`;
  }
};

export const interpretPracticalApplication = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional practical application**. Effectively translates knowledge into real-world solutions.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong practical skills**. Applies knowledge effectively in most situations.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate practical application**. Needs guidance for complex applications.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited practical skills**. Struggles to apply knowledge.`;
  } else {
    return `${candidateName} shows **poor practical application**. Significant gap between knowledge and execution.`;
  }
};

export const interpretSafetyCompliance = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional safety focus**. Champions safety protocols and consistently follows procedures.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good safety awareness**. Follows procedures consistently.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate safety knowledge**. Needs reinforcement of protocols.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited safety awareness**. Requires monitoring.`;
  } else {
    return `${candidateName} shows **poor safety understanding**. Significant concerns requiring immediate attention.`;
  }
};

export const interpretQualityControl = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is a **quality expert**. Maintains exceptional standards and proactively identifies improvements.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good quality focus**. Maintains standards and identifies issues.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate quality awareness**. Needs support in quality maintenance.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited quality focus**. Inconsistent standards.`;
  } else {
    return `${candidateName} shows **poor quality focus**. Significant concerns in quality maintenance.`;
  }
};

export const interpretProcessOptimization = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional process optimization skills**. Continuously improves workflows and eliminates waste.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong optimization skills**. Identifies improvement opportunities.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate optimization awareness**. Needs guidance in process improvement.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited optimization focus**. Follows processes without question.`;
  } else {
    return `${candidateName} shows **poor process optimization**. May resist or struggle with process changes.`;
  }
};

export const interpretEquipmentOperation = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **expert equipment operator**. Masters all machinery and optimizes performance.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong equipment skills**. Handles most machinery effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate equipment skills**. Needs training on advanced equipment.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited equipment skills**. Requires supervision.`;
  } else {
    return `${candidateName} shows **poor equipment skills**. Significant training needed.`;
  }
};

export const interpretMaintenanceProcedures = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional maintenance knowledge**. Performs and understands preventive and corrective maintenance thoroughly.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong maintenance skills**. Handles routine maintenance effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate maintenance knowledge**. Needs training on complex procedures.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited maintenance skills**. Requires guidance.`;
  } else {
    return `${candidateName} shows **poor maintenance understanding**. Significant gaps in knowledge.`;
  }
};

export const interpretTechnicalDocumentation = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional documentation skills**. Creates clear, comprehensive technical documentation and follows procedures precisely.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **strong documentation skills**. Produces clear documentation.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate documentation skills**. May need improvement in clarity.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited documentation skills**. May struggle with technical writing.`;
  } else {
    return `${candidateName} shows **poor documentation skills**. Significant concerns in technical communication.`;
  }
};


// ============================================
// PERFORMANCE ASSESSMENT CATEGORIES
// ============================================

export const interpretProductivity = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly productive**. Consistently exceeds targets and manages time effectively.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good productivity**. Meets targets with efficient work processes.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate productivity**. May need support with time management.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited productivity**. Struggles to meet targets.`;
  } else {
    return `${candidateName} shows **poor productivity**. Significant concerns in output and efficiency.`;
  }
};

export const interpretWorkQuality = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} delivers **exceptional work quality**. Consistently high standards and attention to detail.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good work quality**. Reliable and produces solid results.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate quality**. May need improvement in accuracy.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited quality focus**. Inconsistent output.`;
  } else {
    return `${candidateName} shows **poor quality**. Significant concerns in work standards.`;
  }
};

export const interpretGoalAchievement = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional goal achievement**. Consistently exceeds objectives and sets ambitious targets.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good goal achievement**. Meets most targets and objectives.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate goal achievement**. May need support with goal setting.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited goal achievement**. Struggles to meet objectives.`;
  } else {
    return `${candidateName} shows **poor goal achievement**. Significant concerns in target attainment.`;
  }
};

export const interpretAccountability = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional accountability**. Takes full ownership of outcomes and learns from mistakes.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good accountability**. Takes responsibility for own work.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate accountability**. May sometimes deflect responsibility.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited accountability**. May blame others or external factors.`;
  } else {
    return `${candidateName} shows **poor accountability**. Avoids responsibility and ownership.`;
  }
};

export const interpretInitiative = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional initiative**. Proactively seeks opportunities and acts without waiting for direction.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good initiative**. Takes action when needed.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate initiative**. May need prompting to act.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited initiative**. Waits for direction.`;
  } else {
    return `${candidateName} shows **poor initiative**. Avoids taking action independently.`;
  }
};

export const interpretCollaborationPerf = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **exceptional collaborator**. Builds strong relationships, shares credit, and enhances team performance.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good collaboration skills**. Works well with others.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate collaboration**. May need development in teamwork.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited collaboration**. May work in silos.`;
  } else {
    return `${candidateName} shows **poor collaboration**. Struggles in team settings.`;
  }
};

export const interpretTimeManagement = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional time management**. Prioritizes effectively, meets all deadlines, and balances multiple demands.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good time management**. Generally meets deadlines.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate time management**. May need help with prioritization.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited time management**. Often misses deadlines.`;
  } else {
    return `${candidateName} shows **poor time management**. Struggles significantly with deadlines.`;
  }
};

export const interpretResultsOrientation = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is **highly results-oriented**. Focused on outcomes, persistent in overcoming obstacles, and driven to succeed.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good results focus**. Works toward goals effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate results orientation**. May lose focus on outcomes.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited results focus**. May prioritize activity over outcomes.`;
  } else {
    return `${candidateName} shows **poor results orientation**. Lacks drive to achieve.`;
  }
};


// ============================================
// BEHAVIORAL ASSESSMENT CATEGORIES
// ============================================

export const interpretTeamwork = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **exceptional team player**. Builds strong relationships, supports others, and enhances team dynamics.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good teamwork skills**. Collaborates effectively.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate teamwork**. May need development in collaboration.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited teamwork**. May prefer working alone.`;
  } else {
    return `${candidateName} shows **poor teamwork**. Struggles in team settings.`;
  }
};

export const interpretConflictResolution = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **expert conflict resolver**. Navigates disagreements constructively, finds common ground, and builds consensus.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good conflict resolution skills**. Handles most disagreements professionally.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate conflict resolution**. May need support with complex conflicts.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited conflict resolution**. May avoid or escalate conflicts.`;
  } else {
    return `${candidateName} shows **poor conflict resolution**. Significant concerns in managing disputes.`;
  }
};

export const interpretEmpathy = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional empathy**. Deeply understands others' perspectives and responds with compassion.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good empathy**. Understands others' feelings and perspectives.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate empathy**. May sometimes miss others' emotional cues.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited empathy**. May struggle to understand others' perspectives.`;
  } else {
    return `${candidateName} shows **poor empathy**. Difficulty relating to others' experiences.`;
  }
};

export const interpretActiveListening = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} is an **exceptional listener**. Fully attends to others, seeks to understand, and responds thoughtfully.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good listening skills**. Generally attentive and responsive.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate listening skills**. May sometimes miss key information.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited listening**. May be easily distracted or interrupt.`;
  } else {
    return `${candidateName} shows **poor listening**. Struggles to attend to others.`;
  }
};

export const interpretFeedbackReception = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional feedback receptivity**. Welcomes feedback, reflects on it, and actively uses it to improve.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good feedback reception**. Generally open to feedback.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate feedback reception**. May be defensive at times.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited feedback reception**. May resist or dismiss feedback.`;
  } else {
    return `${candidateName} shows **poor feedback reception**. Reacts negatively to feedback.`;
  }
};

export const interpretInterpersonalSkills = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional interpersonal skills**. Builds rapport easily, navigates social situations skillfully, and leaves positive impressions.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good interpersonal skills**. Relates well to others.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate interpersonal skills**. May need development in social awareness.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited interpersonal skills**. May struggle in social situations.`;
  } else {
    return `${candidateName} shows **poor interpersonal skills**. Significant social challenges.`;
  }
};

export const interpretProfessionalism = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional professionalism**. Consistently displays appropriate behavior, appearance, and communication.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good professionalism**. Generally professional in most situations.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate professionalism**. May need guidance on professional conduct.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited professionalism**. May have lapses in professional behavior.`;
  } else {
    return `${candidateName} shows **poor professionalism**. Significant concerns in professional conduct.`;
  }
};


// ============================================
// CULTURAL ASSESSMENT CATEGORIES
// ============================================

export const interpretValuesAlignment = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional values alignment**. Naturally embodies company values and serves as a cultural role model.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good values alignment**. Generally aligned with organizational values.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate values alignment**. Some values may need reinforcement.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited values alignment**. May not fully embrace company values.`;
  } else {
    return `${candidateName} shows **poor values alignment**. Significant disconnect from organizational values.`;
  }
};

export const interpretWorkEthic = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional work ethic**. Consistently goes above and beyond, takes pride in work, and delivers quality.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good work ethic**. Reliable and dedicated to quality work.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate work ethic**. May need encouragement for extra effort.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited work ethic**. May do minimum required.`;
  } else {
    return `${candidateName} shows **poor work ethic**. Lacks dedication and effort.`;
  }
};

export const interpretDiversityAwareness = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional diversity awareness**. Champions inclusion, respects all perspectives, and creates belonging.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good diversity awareness**. Values different perspectives.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate diversity awareness**. Needs development in diversity understanding.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited diversity awareness**. May need training.`;
  } else {
    return `${candidateName} shows **poor diversity awareness**. Significant concerns in this area.`;
  }
};

export const interpretInclusivity = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional inclusivity**. Actively ensures all voices are heard and creates an environment where everyone can contribute.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good inclusivity**. Generally inclusive of others.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate inclusivity**. May need awareness of exclusionary behaviors.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited inclusivity**. May unintentionally exclude others.`;
  } else {
    return `${candidateName} shows **poor inclusivity**. May actively exclude or marginalize others.`;
  }
};

export const interpretRespect = (data, candidateName) => {
  const { percentage } = data;
  
  if (percentage >= 80) {
    return `${candidateName} demonstrates **exceptional respect**. Treats everyone with dignity, regardless of role or background.`;
  } else if (percentage >= 70) {
    return `${candidateName} has **good respect**. Generally respectful to others.`;
  } else if (percentage >= 60) {
    return `${candidateName} has **moderate respect**. May need reminders about respectful behavior.`;
  } else if (percentage >= 50) {
    return `${candidateName} demonstrates **limited respect**. May be dismissive of others.`;
  } else {
    return `${candidateName} shows **poor respect**. Disrespectful behavior is a concern.`;
  }
};
