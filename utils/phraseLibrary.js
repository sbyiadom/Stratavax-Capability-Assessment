// utils/phraseLibrary.js - ULTRA ENHANCED VERSION
// Comprehensive phrase library with rich, varied phrases for all scenarios

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const createHash = (input) => {
  const text = String(input || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const selectPhrase = (phrases = [], seed = "") => {
  if (!Array.isArray(phrases) || phrases.length === 0) return "";
  const index = createHash(seed) % phrases.length;
  return phrases[index];
};

export const replaceVariables = (template = "", variables = {}) => {
  let output = String(template || "");
  Object.entries(variables || {}).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return output;
};

// ============================================================
// SCORE LEVEL PHRASES - EXTENSIVE
// ============================================================

export const scoreLevelPhrases = {
  exceptional: {
    summary: [
      "{{area}} demonstrates exceptional capability, with assessment evidence placing this area among the candidate's strongest attributes.",
      "The candidate shows outstanding proficiency in {{area}}, with performance significantly exceeding typical expectations.",
      "{{area}} represents a standout strength, with the candidate demonstrating superior understanding and application.",
      "Assessment results indicate exceptional performance in {{area}}, suggesting advanced capability beyond standard requirements.",
      "The candidate has demonstrated remarkable aptitude in {{area}}, with evidence of deep understanding and practical application.",
      "{{area}} is a clear area of excellence, with the candidate showing superior knowledge and skill development.",
      "The candidate's performance in {{area}} is exemplary, reflecting strong foundational understanding and advanced capability.",
      "Assessment evidence points to exceptional competency in {{area}}, with the candidate demonstrating mastery of key concepts.",
      "{{area}} stands out as a significant strength, with the candidate showing sophisticated understanding and application.",
      "The candidate has demonstrated outstanding capability in {{area}}, with performance in the top tier of assessed individuals."
    ],
    supervisor: [
      "Consider leveraging this exceptional capability through advanced assignments, mentoring opportunities, or strategic initiatives.",
      "This area of strength may support expanded responsibilities, leadership roles, or complex problem-solving assignments.",
      "The candidate's exceptional performance in this area could be utilized for peer mentoring, training others, or leading key projects.",
      "This strength may position the candidate well for accelerated development or increased responsibility in relevant domains.",
      "Consider assigning the candidate to tasks that fully utilize this exceptional capability, allowing them to contribute at a higher level.",
      "This exceptional strength could be valuable in coaching others, developing training materials, or serving as a subject matter expert.",
      "The candidate's advanced capability in this area suggests readiness for more complex and challenging assignments.",
      "This strength may be leveraged to support organizational initiatives that require deep expertise in this domain.",
      "Consider using this exceptional capability as a foundation for the candidate's professional development and career progression.",
      "The candidate's outstanding performance in this area indicates potential for greater contribution and leadership in relevant contexts."
    ]
  },

  strong: {
    summary: [
      "{{area}} shows strong capability, with consistent performance indicating reliable understanding and application.",
      "The candidate demonstrates solid proficiency in {{area}}, with evidence of dependable knowledge and skill development.",
      "{{area}} represents a notable strength, with the candidate showing reliable performance above standard requirements.",
      "Assessment results indicate strong performance in {{area}}, suggesting capability that can be built upon.",
      "The candidate has demonstrated good understanding and application in {{area}}, with room for continued refinement.",
      "{{area}} is a clear area of strength, with the candidate showing consistent and reliable capability.",
      "The candidate's performance in {{area}} is commendable, reflecting solid foundational knowledge and practical skills.",
      "Assessment evidence supports strong competency in {{area}}, with the candidate demonstrating reliable understanding.",
      "{{area}} stands out as a dependable strength, with the candidate showing solid grasp of key concepts and applications.",
      "The candidate has demonstrated strong capability in {{area}}, with performance consistently above average."
    ],
    supervisor: [
      "This reliable strength can be built upon through practical assignments that reinforce and extend the candidate's capabilities.",
      "Consider providing opportunities that allow the candidate to apply and strengthen this capability in real-world contexts.",
      "This area of strength may serve as a solid foundation for professional development and increased responsibility.",
      "The candidate's reliable performance in this area suggests readiness for more challenging tasks and assignments.",
      "Supervisor should provide regular feedback and opportunities for the candidate to apply and expand this capability.",
      "This strength could be leveraged in team settings where the candidate can contribute reliably and effectively.",
      "Consider assigning tasks that allow the candidate to demonstrate and further develop this consistent capability.",
      "This area of competence may support the candidate's progression to more complex and demanding responsibilities.",
      "The candidate's reliable performance suggests they can be trusted with increased autonomy in this domain.",
      "This strength represents a solid foundation for the candidate's ongoing professional development and growth."
    ]
  },

  adequate: {
    summary: [
      "{{area}} demonstrates functional capability, meeting standard expectations with room for further refinement.",
      "The candidate shows adequate understanding in {{area}}, with performance at expected levels for this stage.",
      "{{area}} represents a competency area where the candidate meets requirements and can build upon for greater proficiency.",
      "Assessment results indicate adequate performance in {{area}}, with opportunities for continued development.",
      "The candidate has demonstrated functional knowledge and skills in {{area}}, sufficient for standard requirements.",
      "{{area}} shows acceptable performance, with the candidate meeting basic expectations and demonstrating foundational understanding.",
      "The candidate's performance in {{area}} is satisfactory, with room for growth through practice and experience.",
      "Assessment evidence suggests adequate competency in {{area}}, with the candidate demonstrating basic understanding.",
      "{{area}} is a functional strength, with the candidate showing sufficient knowledge and skill for standard applications.",
      "The candidate has demonstrated adequate capability in {{area}}, with potential for further development through practice."
    ],
    supervisor: [
      "Provide regular feedback and practical exposure to help the candidate strengthen consistency and build confidence.",
      "This area would benefit from targeted practice and reinforcement to move toward more consistent performance.",
      "Supervisor should offer structured guidance and opportunities for the candidate to apply and refine these skills.",
      "Consider assigning tasks that allow the candidate to practice and develop this capability with appropriate support.",
      "Regular coaching and feedback will help the candidate build on this functional foundation toward stronger performance.",
      "This area may benefit from additional training, practice, or mentorship to enhance consistency and confidence.",
      "The candidate's performance in this area can be strengthened through practical application and constructive feedback.",
      "Supervisor should monitor progress and provide opportunities for the candidate to develop greater proficiency.",
      "This functional capability can be built upon through targeted development and practical experience.",
      "Consider providing structured opportunities for the candidate to practice and strengthen this area."
    ]
  },

  developing: {
    summary: [
      "{{area}} shows developing capability, with foundational understanding that would benefit from structured reinforcement.",
      "The candidate demonstrates emerging knowledge in {{area}}, with clear opportunities for growth through targeted development.",
      "{{area}} represents a development area where the candidate would benefit from focused training and practice.",
      "Assessment results indicate developing performance in {{area}}, with foundational understanding that can be built upon.",
      "The candidate has demonstrated basic understanding in {{area}}, with significant potential for growth through structured support.",
      "{{area}} shows evidence of emerging capability, with the candidate needing focused development to reach expected levels.",
      "The candidate's performance in {{area}} is at a developing stage, with opportunities for growth through guided practice.",
      "Assessment evidence suggests foundational competency in {{area}}, with the candidate benefiting from structured development.",
      "{{area}} is a growth area, with the candidate showing potential that can be developed through targeted intervention.",
      "The candidate has demonstrated emerging capability in {{area}}, with opportunities for significant improvement through practice."
    ],
    supervisor: [
      "Provide structured practice, coaching, and regular progress review to support the candidate's development in this area.",
      "Consider assigning a mentor or experienced peer to guide the candidate's development in this area.",
      "Supervisor should offer clear expectations and constructive feedback to support the candidate's growth.",
      "This area would benefit from focused training, guided practice, and regular progress monitoring.",
      "Provide opportunities for the candidate to practice and apply skills with appropriate supervision and feedback.",
      "Regular check-ins and structured development plans will help the candidate build capability in this area.",
      "Consider providing additional training resources or workshops to support the candidate's development.",
      "Supervisor should monitor progress closely and adjust support as the candidate's capability develops.",
      "This area requires structured development with clear milestones and regular feedback on progress.",
      "Provide opportunities for the candidate to build confidence and competence through guided practice."
    ]
  },

  priority_development: {
    summary: [
      "{{area}} requires priority development, with assessment evidence indicating significant gaps in understanding and application.",
      "The candidate shows limited capability in {{area}}, requiring targeted intervention and structured development.",
      "{{area}} represents a critical development area where the candidate needs focused attention and support.",
      "Assessment results indicate significant gaps in {{area}}, with the candidate requiring immediate developmental intervention.",
      "The candidate has demonstrated limited understanding in {{area}}, with a clear need for structured training and support.",
      "{{area}} shows significant development needs, with the candidate benefiting from intensive targeted intervention.",
      "The candidate's performance in {{area}} is below expected levels, requiring focused development and close supervision.",
      "Assessment evidence suggests substantial gaps in {{area}}, with the candidate needing comprehensive development support.",
      "{{area}} is a priority development area, with the candidate requiring structured training and guided practice.",
      "The candidate has demonstrated limited capability in {{area}}, with significant opportunities for improvement through focused development."
    ],
    supervisor: [
      "Implement targeted training, supervised practice, and regular progress monitoring to address development needs in this area.",
      "Consider assigning a dedicated mentor or coach to provide intensive support and guidance in this area.",
      "Supervisor should establish clear development milestones and regularly review progress toward improvement.",
      "This area requires immediate attention through structured training and close supervision of practical application.",
      "Provide intensive support and regular feedback to help the candidate build foundational capability in this area.",
      "Consider reducing complexity of assignments in this area while the candidate develops foundational understanding.",
      "Regular progress reviews and adjustments to the development plan will help address gaps in this area.",
      "This area requires significant investment of time and resources to build the candidate's capability.",
      "Supervisor should provide clear guidance and monitor progress closely to ensure improvement in this area.",
      "Consider establishing a structured development plan with specific goals and timelines for improvement."
    ]
  },

  critical_gap: {
    summary: [
      "{{area}} represents a critical gap, with assessment evidence indicating significant limitations in understanding and capability.",
      "The candidate shows minimal capability in {{area}}, requiring comprehensive foundational development and immediate intervention.",
      "{{area}} is a significant concern, with the candidate requiring immediate and intensive developmental support.",
      "Assessment results indicate critical gaps in {{area}}, with the candidate needing urgent foundational training.",
      "The candidate has demonstrated very limited understanding in {{area}}, with a clear need for intensive development.",
      "{{area}} shows critical development needs, with the candidate requiring immediate intervention and structured support.",
      "The candidate's performance in {{area}} is significantly below expected levels, requiring urgent attention.",
      "Assessment evidence suggests fundamental gaps in {{area}}, with the candidate needing comprehensive foundational development.",
      "{{area}} is a critical development priority, with the candidate requiring intensive training and close supervision.",
      "The candidate has demonstrated minimal capability in {{area}}, with significant foundational gaps to address."
    ],
    supervisor: [
      "Initiate immediate foundational training, provide close supervision, and establish clear development milestones.",
      "Consider restricting independent responsibility in this area until foundational capability is validated.",
      "Supervisor should provide intensive support, regular feedback, and closely monitor progress in this area.",
      "This area requires comprehensive foundational development before the candidate can take on independent responsibilities.",
      "Provide intensive training, close supervision, and regular progress reviews to address critical gaps.",
      "Consider establishing a structured development plan with clear goals, timelines, and regular progress monitoring.",
      "This area requires significant investment of supervisory time and resources to build foundational capability.",
      "Supervisor should provide clear guidance and closely monitor progress to ensure improvement in this area.",
      "Consider reducing complexity of assignments and providing intensive support until foundational gaps are addressed.",
      "This area requires immediate intervention and ongoing support to build the candidate's foundational capability."
    ]
  }
};

// ============================================================
// CATEGORY-SPECIFIC STRENGTH PHRASES
// ============================================================

export const categoryStrengthPhrases = {
  "Personality & Behavioral": [
    "The candidate demonstrates {adjective} self-awareness and behavioral adaptability, enabling effective navigation of complex interpersonal situations.",
    "Assessment evidence reveals {adjective} emotional intelligence, with the candidate showing strong understanding of personal and others' emotions.",
    "The candidate exhibits {adjective} behavioral flexibility, adapting their approach effectively to different situations and contexts.",
    "Strong interpersonal capabilities are evident, with the candidate showing {adjective} ability to build rapport and influence others.",
    "The candidate's {adjective} self-regulation and emotional awareness supports effective communication and collaboration in diverse settings.",
    "Assessment results indicate {adjective} social awareness, with the candidate demonstrating understanding of group dynamics and interpersonal influence.",
    "The candidate shows {adjective} conflict resolution skills, approaching disagreements constructively and seeking mutually beneficial outcomes.",
    "Strong {adjective} empathy and perspective-taking abilities enable the candidate to connect effectively with others.",
    "The candidate demonstrates {adjective} adaptability in their behavioral approach, adjusting appropriately to different interpersonal contexts.",
    "Assessment evidence points to {adjective} relationship management skills, with the candidate building and maintaining effective professional relationships."
  ],
  "Cultural & Attitudinal Fit": [
    "The candidate demonstrates {adjective} alignment with organizational values, showing commitment to integrity, collaboration, and professional excellence.",
    "Assessment evidence reveals {adjective} cultural awareness and adaptability, enabling the candidate to work effectively across diverse teams.",
    "The candidate exhibits {adjective} openness to diversity and inclusion, contributing positively to inclusive workplace environments.",
    "Strong {adjective} professional values are evident, with the candidate demonstrating commitment to ethical conduct and organizational principles.",
    "The candidate shows {adjective} adaptability to different workplace cultures and expectations, facilitating effective organizational integration.",
    "Assessment results indicate {adjective} alignment with organizational mission and values, supporting effective team collaboration and contribution.",
    "The candidate demonstrates {adjective} commitment to professional growth and continuous learning, contributing positively to organizational culture.",
    "Strong {adjective} workplace orientation and professional attitude support effective integration into new and existing team environments.",
    "The candidate exhibits {adjective} cultural competence, demonstrating understanding and respect for diverse perspectives and approaches.",
    "Assessment evidence points to {adjective} organizational commitment and professional values, supporting positive workplace contributions."
  ],
  "Ethics & Integrity": [
    "The candidate demonstrates {adjective} ethical judgment and decision-making, consistently considering the broader impact of their actions.",
    "Assessment evidence reveals {adjective} commitment to integrity, with the candidate showing consistent honesty and transparency in their approach.",
    "The candidate exhibits {adjective} moral reasoning and ethical awareness, navigating ethical dilemmas with thoughtful consideration.",
    "Strong {adjective} professional ethics are evident, with the candidate demonstrating accountability and responsibility in their approach.",
    "The candidate shows {adjective} commitment to ethical conduct, maintaining high standards of professional integrity and trustworthiness.",
    "Assessment results indicate {adjective} ethical awareness and judgment, supporting responsible decision-making in complex situations.",
    "The candidate demonstrates {adjective} accountability and transparency, building trust and credibility in professional relationships.",
    "Strong {adjective} principled behavior is evident, with the candidate demonstrating consistency between stated values and actions.",
    "The candidate exhibits {adjective} ethical leadership, setting a positive example and promoting ethical conduct in their work.",
    "Assessment evidence points to {adjective} integrity and trustworthiness, supporting reliable and responsible professional conduct."
  ],
  "Problem-Solving": [
    "The candidate demonstrates {adjective} analytical reasoning, systematically breaking down complex problems into manageable components.",
    "Assessment evidence reveals {adjective} critical thinking skills, evaluating information carefully before reaching conclusions.",
    "The candidate exhibits {adjective} creative problem-solving ability, generating innovative solutions to challenging problems.",
    "Strong {adjective} analytical skills are evident, with the candidate showing ability to identify patterns and draw meaningful conclusions.",
    "The candidate shows {adjective} problem-solving methodology, approaching challenges systematically and making well-reasoned decisions.",
    "Assessment results indicate {adjective} strategic thinking capability, considering multiple perspectives and anticipating potential outcomes.",
    "The candidate demonstrates {adjective} decision-making skills, balancing available information with practical considerations.",
    "Strong {adjective} analytical and evaluative skills support the candidate's ability to address complex problems effectively.",
    "The candidate exhibits {adjective} resourcefulness in problem-solving, identifying creative solutions within available constraints.",
    "Assessment evidence points to {adjective} critical thinking and problem-solving capability, supporting effective decision-making."
  ],
  "Communication": [
    "The candidate demonstrates {adjective} verbal communication skills, articulating ideas clearly and persuasively in various settings.",
    "Assessment evidence reveals {adjective} written communication capability, conveying complex information with clarity and precision.",
    "The candidate exhibits {adjective} active listening skills, demonstrating understanding and appropriate responsiveness in conversations.",
    "Strong {adjective} interpersonal communication skills are evident, with the candidate building rapport and trust effectively.",
    "The candidate shows {adjective} presentation skills, engaging audiences and delivering messages with clarity and confidence.",
    "Assessment results indicate {adjective} communication adaptability, adjusting style and approach to different audiences and contexts.",
    "The candidate demonstrates {adjective} persuasive communication, influencing others through compelling and well-reasoned arguments.",
    "Strong {adjective} communication clarity and precision support the candidate's ability to convey complex information effectively.",
    "The candidate exhibits {adjective} cross-cultural communication skills, bridging differences and fostering understanding across groups.",
    "Assessment evidence points to {adjective} communication effectiveness, supporting successful collaboration and professional relationships."
  ],
  "Leadership & Management": [
    "The candidate demonstrates {adjective} leadership capability, inspiring and guiding others toward shared objectives with clarity and purpose.",
    "Assessment evidence reveals {adjective} strategic thinking, anticipating future needs and planning accordingly to achieve organizational goals.",
    "The candidate exhibits {adjective} team management skills, effectively coordinating and motivating team members toward successful outcomes.",
    "Strong {adjective} decision-making ability is evident, with the candidate making timely and well-considered choices in complex situations.",
    "The candidate shows {adjective} capacity to develop and empower others, providing guidance and opportunities for professional growth.",
    "Assessment results indicate {adjective} conflict resolution skills, addressing disagreements constructively and maintaining team cohesion.",
    "The candidate demonstrates {adjective} change management capability, navigating organizational transitions with adaptability and resilience.",
    "Strong {adjective} delegation and resource allocation skills support the candidate's ability to manage teams effectively.",
    "The candidate exhibits {adjective} visionary leadership, articulating a clear direction and inspiring others to work toward common goals.",
    "Assessment evidence points to {adjective} management effectiveness, supporting organizational performance and team development."
  ],
  "Emotional Intelligence": [
    "The candidate demonstrates {adjective} self-awareness, understanding their emotions, strengths, and limitations with clarity and insight.",
    "Assessment evidence reveals {adjective} empathy and perspective-taking ability, understanding and valuing others' feelings and viewpoints.",
    "The candidate exhibits {adjective} emotional regulation, maintaining composure and effectiveness in challenging situations.",
    "Strong {adjective} social awareness is evident, with the candidate reading group dynamics and responding appropriately.",
    "The candidate shows {adjective} relationship management skills, building and maintaining positive professional connections.",
    "Assessment results indicate {adjective} conflict resolution capability, navigating disagreements with sensitivity and effectiveness.",
    "The candidate demonstrates {adjective} emotional resilience, maintaining effectiveness in the face of challenges and setbacks.",
    "Strong {adjective} interpersonal sensitivity supports the candidate's ability to build trust and rapport with others.",
    "The candidate exhibits {adjective} emotional intelligence in leadership contexts, inspiring trust and facilitating effective collaboration.",
    "Assessment evidence points to {adjective} emotional competence, supporting effective communication and relationship building."
  ],
  "Cognitive Ability": [
    "The candidate demonstrates {adjective} cognitive flexibility, adapting thinking to new information and changing circumstances.",
    "Assessment evidence reveals {adjective} analytical reasoning, processing complex information and drawing meaningful conclusions.",
    "The candidate exhibits {adjective} learning agility, quickly absorbing new information and applying it effectively.",
    "Strong {adjective} critical thinking skills are evident, evaluating information carefully and making well-reasoned judgments.",
    "The candidate shows {adjective} problem-solving capability, approaching challenges with creativity and systematic thinking.",
    "Assessment results indicate {adjective} decision-making effectiveness, balancing available information with practical considerations.",
    "The candidate demonstrates {adjective} strategic thinking, considering long-term implications and multiple perspectives.",
    "Strong {adjective} cognitive processing supports the candidate's ability to handle complex and demanding tasks.",
    "The candidate exhibits {adjective} intellectual curiosity, actively seeking to learn and develop new skills.",
    "Assessment evidence points to {adjective} cognitive capability, supporting the candidate's ability to learn and adapt."
  ],
  "Technical & Manufacturing": [
    "The candidate demonstrates {adjective} technical knowledge, showing understanding of key manufacturing principles and practices.",
    "Assessment evidence reveals {adjective} equipment operation skills, demonstrating safe and effective use of manufacturing equipment.",
    "The candidate exhibits {adjective} process optimization capability, identifying improvements to enhance productivity and quality.",
    "Strong {adjective} troubleshooting skills are evident, systematically diagnosing and resolving technical issues.",
    "The candidate shows {adjective} safety awareness, demonstrating understanding of and commitment to workplace safety practices.",
    "Assessment results indicate {adjective} quality control capability, maintaining standards and ensuring consistent quality.",
    "The candidate demonstrates {adjective} technical documentation skills, accurately recording and communicating technical information.",
    "Strong {adjective} technical competency supports the candidate's ability to contribute effectively in manufacturing environments.",
    "The candidate exhibits {adjective} practical application skills, translating technical knowledge into effective practice.",
    "Assessment evidence points to {adjective} technical capability, supporting reliable performance in manufacturing contexts."
  ]
};

// ============================================================
// CATEGORY-SPECIFIC DEVELOPMENT PHRASES
// ============================================================

export const categoryDevelopmentPhrases = {
  "Personality & Behavioral": [
    "Developing greater {skill} would enhance the candidate's effectiveness in {context}, supporting more consistent and confident interactions.",
    "The candidate would benefit from targeted practice in {skill}, building greater confidence and capability in {context}.",
    "Strengthening {skill} through structured development will help the candidate navigate {context} more effectively.",
    "Focused development in {skill} would enhance the candidate's ability to build and maintain effective professional relationships.",
    "The candidate would benefit from practical experience and feedback in {context} to develop stronger {skill}.",
    "Developing {skill} through coaching and practice will help the candidate manage {context} more effectively.",
    "The candidate's capability in {skill} can be strengthened through focused practice and constructive feedback.",
    "Structured development in {skill} would enhance the candidate's confidence and effectiveness in {context}.",
    "The candidate would benefit from opportunities to practice {skill} in supervised {context} settings.",
    "Developing greater {skill} capability will support the candidate's professional growth and effectiveness in {context}."
  ],
  "Cultural & Attitudinal Fit": [
    "Developing greater cultural awareness and adaptability would enhance the candidate's effectiveness in diverse workplace settings.",
    "The candidate would benefit from exposure to diverse teams and perspectives to strengthen cultural competence.",
    "Structured development in cultural competency would enhance the candidate's ability to work effectively in diverse teams.",
    "The candidate would benefit from training and practice in navigating cultural differences in professional settings.",
    "Developing inclusive leadership skills would enhance the candidate's ability to foster inclusive workplace environments.",
    "The candidate would benefit from opportunities to work across different cultural contexts to build cultural competence.",
    "Strengthening cultural awareness through focused development will support the candidate's effectiveness in global organizations.",
    "The candidate would benefit from targeted development in building inclusive relationships and fostering belonging.",
    "Developing cultural competence through structured learning and practice will enhance the candidate's professional effectiveness.",
    "The candidate would benefit from opportunities to demonstrate and develop inclusive leadership skills."
  ],
  "Ethics & Integrity": [
    "Developing stronger ethical reasoning skills would enhance the candidate's ability to navigate complex professional dilemmas.",
    "The candidate would benefit from training and practice in ethical decision-making frameworks and approaches.",
    "Structured development in ethical leadership would support the candidate's ability to model and promote ethical conduct.",
    "The candidate would benefit from exposure to ethical case studies and guided reflection on professional conduct.",
    "Strengthening professional integrity through focused development will enhance the candidate's trustworthiness and credibility.",
    "The candidate would benefit from opportunities to practice ethical reasoning and receive constructive feedback.",
    "Developing stronger accountability and transparency practices will support the candidate's professional growth.",
    "The candidate would benefit from training in navigating ethical challenges in the workplace.",
    "Structured development in professional ethics will enhance the candidate's ability to make sound ethical judgments.",
    "The candidate would benefit from mentoring and coaching in ethical leadership and professional conduct."
  ],
  "Problem-Solving": [
    "Developing stronger analytical reasoning would enhance the candidate's ability to systematically solve complex problems.",
    "The candidate would benefit from practice in structured problem-solving frameworks and methodologies.",
    "Focused development in critical thinking and analysis will strengthen the candidate's problem-solving capability.",
    "The candidate would benefit from opportunities to practice creative and innovative problem-solving approaches.",
    "Developing greater strategic thinking capability will enhance the candidate's ability to anticipate and address challenges.",
    "The candidate would benefit from training in data analysis and evidence-based decision-making.",
    "Strengthening problem-solving skills through practice and feedback will enhance the candidate's effectiveness.",
    "The candidate would benefit from exposure to diverse problem contexts and guided problem-solving practice.",
    "Structured development in analytical thinking will support the candidate's ability to tackle complex challenges.",
    "The candidate would benefit from opportunities to apply problem-solving skills in supervised, real-world contexts."
  ],
  "Communication": [
    "Developing stronger communication skills would enhance the candidate's ability to articulate ideas clearly and persuasively.",
    "The candidate would benefit from practice in active listening and feedback skills to improve communication effectiveness.",
    "Focused development in professional writing and presentation skills will enhance the candidate's communication capability.",
    "The candidate would benefit from opportunities to present and communicate in various professional settings.",
    "Developing greater interpersonal communication effectiveness will support the candidate's professional relationships.",
    "The candidate would benefit from coaching and feedback on communication style and effectiveness.",
    "Structured development in communication will enhance the candidate's ability to influence and persuade others.",
    "The candidate would benefit from practice in communicating complex information to diverse audiences.",
    "Developing stronger cross-cultural communication skills will enhance the candidate's global effectiveness.",
    "The candidate would benefit from opportunities to practice and refine communication skills with constructive feedback."
  ],
  "Leadership & Management": [
    "Developing stronger leadership capability would enhance the candidate's ability to inspire and guide teams effectively.",
    "The candidate would benefit from leadership training and opportunities to practice management skills in supervised settings.",
    "Focused development in strategic thinking and planning will support the candidate's leadership effectiveness.",
    "The candidate would benefit from mentoring and coaching in people management and team leadership.",
    "Developing stronger decision-making capability will enhance the candidate's leadership effectiveness in complex situations.",
    "The candidate would benefit from opportunities to lead projects and teams with appropriate supervision and feedback.",
    "Structured development in change management will enhance the candidate's ability to navigate organizational transitions.",
    "The candidate would benefit from practice in delegation, resource allocation, and team coordination.",
    "Developing stronger conflict resolution skills will enhance the candidate's leadership and team management effectiveness.",
    "The candidate would benefit from leadership development programs and practical leadership experiences."
  ],
  "Emotional Intelligence": [
    "Developing stronger self-awareness would enhance the candidate's ability to understand and manage their emotions effectively.",
    "The candidate would benefit from practice in empathy and perspective-taking to strengthen interpersonal connections.",
    "Focused development in emotional regulation will enhance the candidate's effectiveness in challenging situations.",
    "The candidate would benefit from coaching and feedback on social awareness and relationship management.",
    "Developing stronger emotional intelligence will enhance the candidate's ability to build trust and influence others.",
    "The candidate would benefit from practice in conflict resolution and managing difficult conversations.",
    "Structured development in emotional intelligence will enhance the candidate's leadership and interpersonal effectiveness.",
    "The candidate would benefit from opportunities to practice emotional intelligence skills in professional settings.",
    "Developing greater resilience and stress management capabilities will enhance the candidate's professional effectiveness.",
    "The candidate would benefit from training and coaching in emotional intelligence competencies."
  ],
  "Cognitive Ability": [
    "Developing stronger cognitive agility would enhance the candidate's ability to learn and adapt quickly.",
    "The candidate would benefit from practice in analytical reasoning and systematic problem-solving approaches.",
    "Focused development in critical thinking will strengthen the candidate's ability to evaluate and process information.",
    "The candidate would benefit from opportunities to engage in complex cognitive tasks with appropriate support.",
    "Developing stronger strategic thinking capability will enhance the candidate's effectiveness in complex situations.",
    "The candidate would benefit from training in mental flexibility and adapting to new information.",
    "Structured development in cognitive skills will enhance the candidate's ability to handle demanding intellectual tasks.",
    "The candidate would benefit from practice in decision-making and judgment in supervised contexts.",
    "Developing stronger learning agility will support the candidate's professional growth and adaptability.",
    "The candidate would benefit from opportunities to develop cognitive skills through challenging assignments."
  ],
  "Technical & Manufacturing": [
    "Developing stronger technical knowledge would enhance the candidate's ability to perform manufacturing tasks effectively.",
    "The candidate would benefit from practical training and experience in equipment operation and maintenance.",
    "Focused development in troubleshooting and diagnostic skills will strengthen the candidate's technical capability.",
    "The candidate would benefit from opportunities to practice technical skills in supervised manufacturing settings.",
    "Developing stronger safety awareness and practices will support the candidate's safe and effective work performance.",
    "The candidate would benefit from training in quality control and process optimization techniques.",
    "Structured development in technical skills will enhance the candidate's manufacturing effectiveness.",
    "The candidate would benefit from guided technical practice and constructive feedback on performance.",
    "Developing stronger understanding of manufacturing processes will support the candidate's professional growth.",
    "The candidate would benefit from opportunities to apply technical knowledge in practical manufacturing contexts."
  ]
};

// ============================================================
// GENERAL REPORT PHRASES
// ============================================================

export const generalReportPhrases = {
  evidenceBased: [
    "Assessment evidence suggests {{statement}}.",
    "The response pattern indicates {{statement}}.",
    "The available assessment data points to {{statement}}.",
    "Based on the recorded responses, {{statement}}.",
    "Assessment results consistently indicate {{statement}}.",
    "The candidate's performance suggests {{statement}}.",
    "Available evidence points toward {{statement}}.",
    "Assessment findings indicate {{statement}}."
  ],
  practicalValidation: [
    "This should be validated through practical observation before final placement.",
    "Supervisor judgment and practical work validation are recommended before final assignment.",
    "This interpretation should be considered alongside interview evidence, references, and work observation.",
    "The result should support, not replace, supervisor judgment and practical validation.",
    "Practical observation and supervisor feedback will help confirm these assessment findings.",
    "Real-world performance should be validated through direct observation in the work context.",
    "These assessment findings should be combined with practical work evidence for more complete evaluation."
  ],
  noStrengths: [
    "No category reached the current strength threshold.",
    "No dominant strength area was identified from the category scores.",
    "The assessment did not show a clear strength area above the current threshold.",
    "The profile shows no standout strength area, so baseline development should be prioritized.",
    "The candidate's performance is relatively consistent across categories, with no clear dominant strength.",
    "Assessment results indicate balanced performance without a single standout strength area."
  ],
  noDevelopmentAreas: [
    "No major development area was identified below the current development threshold.",
    "No critical development concern was identified from the category scores.",
    "The assessment did not show a major gap below the current development threshold.",
    "Development should focus on reinforcement and practical validation rather than remediation.",
    "The candidate demonstrates generally consistent performance without significant gaps.",
    "No substantial development needs were identified at this stage."
  ],
  caution: [
    "Use caution when interpreting this result in isolation.",
    "This result should be combined with practical validation before making final placement decisions.",
    "The assessment result should be used as one source of evidence among several.",
    "Further evidence may be required for high-impact placement or promotion decisions.",
    "Consider this assessment alongside other sources of performance evidence.",
    "Practical observation and supervisor feedback will help validate these findings.",
    "These assessment results should be considered as one part of a comprehensive evaluation."
  ]
};

// ============================================================
// MANUFACTURING PHRASES
// ============================================================

export const manufacturingPhrases = {
  "Technical Fundamentals": {
    strength: [
      "Technical Fundamentals show useful evidence of equipment and manufacturing-system understanding.",
      "The candidate appears to have a workable technical foundation for supervised onboarding.",
      "Assessment evidence suggests the candidate can build on existing technical fundamentals during practical exposure.",
      "The candidate demonstrates solid understanding of core technical concepts relevant to manufacturing.",
      "Technical knowledge appears consistent with the candidate's level of experience and training.",
      "The candidate shows good grasp of foundational technical principles and their application."
    ],
    development: [
      "Technical Fundamentals require structured reinforcement before independent equipment-related work.",
      "The candidate may need support with equipment concepts, maintenance basics, sensors, motors, or pneumatic systems.",
      "Foundational technical training and supervised equipment familiarization are recommended.",
      "The candidate would benefit from practical technical experience with appropriate guidance.",
      "Structured technical practice will help strengthen the candidate's foundational understanding.",
      "Guided exposure to technical systems and equipment will support development in this area."
    ],
    action: [
      "Provide equipment walkthroughs, maintenance basics, and supervised technical practice.",
      "Assign practical equipment familiarization with an experienced operator or technician.",
      "Use checklists and demonstrations to reinforce technical concepts.",
      "Offer structured technical training with practical hands-on experience.",
      "Provide clear technical documentation and guided practice opportunities.",
      "Assign supervised technical tasks with regular feedback and review."
    ]
  },
  Troubleshooting: {
    strength: [
      "Troubleshooting shows useful diagnostic evidence for common production issues.",
      "Assessment evidence suggests the candidate can approach practical faults with structured support.",
      "The candidate may be able to contribute to supervised line issue review.",
      "The candidate demonstrates systematic approach to diagnosing and solving problems.",
      "Problem-solving skills in technical contexts appear well developed.",
      "The candidate shows ability to identify and address common production issues."
    ],
    development: [
      "Troubleshooting requires structured diagnostic development.",
      "The candidate may need support with root-cause analysis and fault-finding.",
      "Guided troubleshooting practice is recommended before independent issue resolution.",
      "The candidate would benefit from structured problem-solving methodology training.",
      "Practical diagnostic experience with guidance will help develop troubleshooting skills.",
      "Supervised practice with common production issues will build troubleshooting capability."
    ],
    action: [
      "Use 5 Whys, PDCA, and guided fault scenarios.",
      "Provide practical troubleshooting simulations and supervisor feedback.",
      "Pair the candidate with an experienced technician during issue review.",
      "Offer structured troubleshooting training with practical scenarios.",
      "Provide guided diagnostic practice with feedback and review.",
      "Use case-based learning to develop problem-solving skills."
    ]
  },
  "Numerical Aptitude": {
    strength: [
      "Numerical Aptitude shows useful evidence for production calculations and reporting.",
      "The candidate appears able to handle production math and basic metric interpretation.",
      "Assessment evidence suggests numerical reasoning may support quality or production tracking tasks.",
      "The candidate demonstrates good numeracy skills relevant to manufacturing metrics.",
      "Mathematical understanding appears consistent with requirements for this role.",
      "The candidate shows ability to interpret production data and metrics."
    ],
    development: [
      "Numerical Aptitude requires reinforcement for production calculations and metric interpretation.",
      "The candidate may need support with percentages, ratios, efficiency calculations, or production rates.",
      "Production math practice is recommended before assigning calculation-heavy work.",
      "The candidate would benefit from practice with manufacturing-specific calculations.",
      "Structured practice with production metrics will strengthen numerical understanding.",
      "Guided experience with calculation and data interpretation is recommended."
    ],
    action: [
      "Provide production math exercises and metric interpretation practice.",
      "Use examples involving output, efficiency, ratios, and quality checks.",
      "Review calculation tasks with a supervisor or mentor.",
      "Offer structured numerical skills practice with manufacturing examples.",
      "Provide clear guidance on production calculations and data interpretation.",
      "Assign supervised calculation tasks with feedback and review."
    ]
  },
  "Safety & Work Ethic": {
    strength: [
      "Safety & Work Ethic shows useful evidence of PPE awareness, SOP discipline, and workplace conduct.",
      "Assessment evidence suggests the candidate understands important safety and work-behavior expectations.",
      "This area may support supervised production onboarding, subject to practical observation.",
      "The candidate demonstrates good awareness of safety protocols and professional conduct.",
      "Workplace safety and professionalism appear well understood and valued.",
      "The candidate shows commitment to safe work practices and professional standards."
    ],
    development: [
      "Safety & Work Ethic requires reinforcement before independent production exposure.",
      "The candidate may need safety training, SOP reinforcement, and close onboarding supervision.",
      "Safety awareness and workplace conduct should be practically validated before production assignment.",
      "The candidate would benefit from structured safety training and supervised practice.",
      "Reinforcement of safety protocols and professional conduct is recommended.",
      "Practical validation of safety awareness and workplace conduct should precede independence."
    ],
    action: [
      "Provide safety induction, PPE demonstrations, and SOP review.",
      "Use toolbox talks, hazard-recognition exercises, and supervisor observation.",
      "Validate safe work behavior during supervised onboarding.",
      "Offer comprehensive safety training with practical demonstrations.",
      "Provide structured safety orientation and ongoing monitoring.",
      "Use observation and feedback to validate safety awareness and conduct."
    ]
  }
};

// Alias support
manufacturingPhrases["Safety &amp; Work Ethic"] = manufacturingPhrases["Safety & Work Ethic"];

// ============================================================
// TRAIT PHRASES
// ============================================================

export const traitPhrases = {
  Ownership: {
    strength: [
      "Ownership suggests accountability, initiative, and consistent follow-through on commitments.",
      "The candidate demonstrates strong ownership mentality, taking responsibility for outcomes and driving results.",
      "Assessment evidence indicates reliable accountability and commitment to delivering quality work.",
      "The candidate shows initiative and willingness to take ownership of challenges and opportunities."
    ],
    development: [
      "Ownership requires development through clear expectations, task ownership, and consistent follow-up.",
      "The candidate would benefit from structured accountability practice and feedback.",
      "Developing ownership capability will enhance the candidate's reliability and initiative.",
      "Structured guidance and clear ownership expectations will support development in this area."
    ]
  },
  Collaboration: {
    strength: [
      "Collaboration suggests constructive team contribution and interpersonal effectiveness.",
      "The candidate demonstrates strong team orientation and ability to work effectively with others.",
      "Assessment evidence indicates effective communication and cooperation in team settings.",
      "The candidate shows willingness to support others and contribute to collective goals."
    ],
    development: [
      "Collaboration requires development through team practice, active listening, and constructive feedback.",
      "The candidate would benefit from structured team experiences and feedback on collaboration.",
      "Developing collaborative skills will enhance the candidate's effectiveness in team environments.",
      "Structured opportunities for team practice and reflection will support development."
    ]
  },
  Action: {
    strength: [
      "Action suggests initiative, timely execution, and willingness to move tasks forward.",
      "The candidate demonstrates decisiveness and ability to take appropriate action when needed.",
      "Assessment evidence indicates consistent progress and momentum in task completion.",
      "The candidate shows willingness to take initiative and drive outcomes."
    ],
    development: [
      "Action requires development through time-bound tasks, initiative-building, and decision practice.",
      "The candidate would benefit from structured practice in timely execution and decision-making.",
      "Developing action orientation will enhance the candidate's ability to drive results.",
      "Structured guidance and practice will support development in this area."
    ]
  },
  Analysis: {
    strength: [
      "Analysis suggests structured reasoning and data-informed thinking.",
      "The candidate demonstrates careful and systematic approach to evaluating information.",
      "Assessment evidence indicates strong analytical skills and attention to detail.",
      "The candidate shows ability to process complex information and draw meaningful conclusions."
    ],
    development: [
      "Analysis requires development through problem-solving frameworks, case practice, and guided reasoning.",
      "The candidate would benefit from structured analytical practice and feedback.",
      "Developing analytical capability will enhance the candidate's decision-making effectiveness.",
      "Structured opportunities for analytical practice will support development."
    ]
  },
  "Risk Tolerance": {
    strength: [
      "Risk Tolerance suggests comfort with controlled uncertainty and experimentation.",
      "The candidate demonstrates appropriate risk awareness and willingness to explore new approaches.",
      "Assessment evidence indicates balanced risk assessment and decision-making.",
      "The candidate shows ability to manage uncertainty and adapt to changing circumstances."
    ],
    development: [
      "Risk Tolerance requires development through safe experiments and structured risk review.",
      "The candidate would benefit from guided experience with risk assessment and management.",
      "Developing appropriate risk awareness will enhance the candidate's adaptability.",
      "Structured practice with risk assessment will support development in this area."
    ]
  },
  Structure: {
    strength: [
      "Structure suggests process discipline, consistency, and respect for procedures.",
      "The candidate demonstrates systematic approach and commitment to following established processes.",
      "Assessment evidence indicates reliability and consistency in task execution.",
      "The candidate shows appreciation for structure and organized work methods."
    ],
    development: [
      "Structure requires development through SOP reinforcement, checklists, and process monitoring.",
      "The candidate would benefit from structured practice in following processes and procedures.",
      "Developing structural discipline will enhance the candidate's consistency and reliability.",
      "Structured guidance and practice will support development in this area."
    ]
  }
};

// ============================================================
// ROLE READINESS PHRASES
// ============================================================

export const roleReadinessPhrases = {
  ready: [
    "Assessment evidence suggests possible readiness, subject to practical validation.",
    "The candidate may be considered ready for supervised progression in this role area.",
    "The result supports potential readiness, provided onboarding confirms practical performance.",
    "The candidate appears prepared for increased responsibility with appropriate support.",
    "Assessment findings indicate the candidate may be ready for advancement with targeted guidance.",
    "The candidate's performance suggests readiness for challenges beyond current level."
  ],
  conditional: [
    "The candidate may be conditionally ready with increased supervision and structured onboarding.",
    "Role exposure may be appropriate if development support and supervisor monitoring are in place.",
    "Readiness is developing and should be validated through supervised practical tasks.",
    "The candidate shows potential readiness that should be confirmed through practical experience.",
    "Conditional readiness is indicated, pending demonstration of practical capability.",
    "The candidate's performance suggests readiness with appropriate support and guidance."
  ],
  notReady: [
    "The candidate is not yet recommended for independent responsibility in this role area.",
    "Training and supervised practice are recommended before role placement.",
    "Current evidence suggests the candidate should follow a development-first pathway.",
    "Additional foundational development is needed before independent role assignment.",
    "The candidate would benefit from focused development before assuming this role.",
    "Structured learning and supervised practice should precede independent placement."
  ]
};

// ============================================================
// DEVELOPMENT PLAN PHRASES
// ============================================================

export const developmentPlanPhrases = {
  thirtyDays: [
    "Clarify expectations and begin foundational development in priority areas.",
    "Start supervised practice and assign a mentor or experienced peer for guidance.",
    "Review low-scoring areas and begin targeted training with weekly check-ins.",
    "Establish clear development goals and initial structured practice plan.",
    "Begin guided practice with regular feedback and progress monitoring.",
    "Focus on building foundational understanding through structured learning."
  ],
  sixtyDays: [
    "Increase practical exposure while continuing supervisor feedback.",
    "Review progress against development goals and adjust support where needed.",
    "Introduce role-relevant tasks that allow the candidate to apply developing skills.",
    "Strengthen practical application with guided and increasingly independent practice.",
    "Continue structured development with regular review and feedback sessions.",
    "Expand practical responsibilities with appropriate supervision and support."
  ],
  ninetyDays: [
    "Validate progress through practical observation or reassessment.",
    "Review readiness for expanded responsibility based on demonstrated improvement.",
    "Document progress and decide whether further training, reassessment, or placement adjustment is required.",
    "Evaluate development progress and adjust plan based on demonstrated capability.",
    "Determine readiness for increased responsibility and independence.",
    "Review overall development progress and plan for next steps."
  ]
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const getScoreLevelKey = (percentage) => {
  const value = safeNumber(percentage, 0);
  if (value >= 85) return "exceptional";
  if (value >= 75) return "strong";
  if (value >= 65) return "adequate";
  if (value >= 55) return "developing";
  if (value >= 40) return "priority_development";
  return "critical_gap";
};

export const getScorePhrase = (area, percentage, phraseType = "summary", seed = "") => {
  const levelKey = getScoreLevelKey(percentage);
  const phrases = scoreLevelPhrases[levelKey]?.[phraseType] || [];
  const selected = selectPhrase(phrases, `${seed}-${area}-${percentage}-${phraseType}`);
  return replaceVariables(selected, { area: normalizeText(area), percentage });
};

export const getCategoryStrengthPhrase = (category, seed = "") => {
  const normalizedCategory = normalizeText(category);
  const phraseList = categoryStrengthPhrases[normalizedCategory] || 
    categoryStrengthPhrases[Object.keys(categoryStrengthPhrases).find(
      key => key.includes(normalizedCategory) || normalizedCategory.includes(key)
    )] || [];
  
  const adjectives = [
    'exceptional', 'strong', 'solid', 'remarkable', 'notable', 
    'significant', 'impressive', 'distinctive', 'outstanding', 'substantial'
  ];
  const adjective = selectPhrase(adjectives, `${seed}-adj`);
  
  return replaceVariables(
    selectPhrase(phraseList, `${seed}-${normalizedCategory}`) || 
    "The candidate demonstrates {{adjective}} capability in this area.",
    { adjective }
  );
};

export const getCategoryDevelopmentPhrase = (category, seed = "") => {
  const normalizedCategory = normalizeText(category);
  const phraseList = categoryDevelopmentPhrases[normalizedCategory] ||
    categoryDevelopmentPhrases[Object.keys(categoryDevelopmentPhrases).find(
      key => key.includes(normalizedCategory) || normalizedCategory.includes(key)
    )] || [];
  
  const skills = [
    'capability', 'understanding', 'proficiency', 'competence', 'knowledge',
    'skills', 'confidence', 'effectiveness', 'readiness', 'expertise'
  ];
  const contexts = [
    'professional settings', 'team environments', 'challenging situations', 
    'complex tasks', 'leadership roles', 'collaborative work', 'independent practice'
  ];
  const developmentActions = [
    'targeted training', 'structured practice', 'focused coaching', 'guided experience',
    'mentoring', 'skill-building', 'practical application', 'supervised practice'
  ];
  
  const skill = selectPhrase(skills, `${seed}-skill`);
  const context = selectPhrase(contexts, `${seed}-context`);
  const developmentAction = selectPhrase(developmentActions, `${seed}-action`);
  
  return replaceVariables(
    selectPhrase(phraseList, `${seed}-${normalizedCategory}`) ||
    "Developing {{skill}} would enhance the candidate's effectiveness in {{context}}.",
    { skill, context, developmentAction }
  );
};

export const getManufacturingPhrase = (area, percentage, phraseType = "strength", seed = "") => {
  const normalizedArea = normalizeText(area);
  const library = manufacturingPhrases[normalizedArea];
  if (!library) {
    return getScorePhrase(area, percentage, "summary", seed);
  }
  const selected = selectPhrase(
    library[phraseType] || library.strength || [],
    `${seed}-${normalizedArea}-${percentage}-${phraseType}`
  );
  return selected;
};

export const getTraitPhrase = (trait, percentage) => {
  const normalizedTrait = normalizeText(trait);
  const library = traitPhrases[normalizedTrait];
  if (!library) {
    return getScorePhrase(trait, percentage, "summary", `${trait}-${percentage}`);
  }
  const type = percentage >= 75 ? 'strength' : 'development';
  return selectPhrase(library[type] || [], `${trait}-${percentage}`);
};

export const getRoleReadinessPhrase = (status, seed = "") => {
  const normalizedStatus = normalizeText(status).toLowerCase();
  if (normalizedStatus.includes("ready") && !normalizedStatus.includes("not")) {
    return selectPhrase(roleReadinessPhrases.ready, `${seed}-ready`);
  }
  if (normalizedStatus.includes("conditional") || normalizedStatus.includes("developing")) {
    return selectPhrase(roleReadinessPhrases.conditional, `${seed}-conditional`);
  }
  return selectPhrase(roleReadinessPhrases.notReady, `${seed}-not-ready`);
};

export const getDevelopmentPlanPhrase = (period, seed = "") => {
  const phrases = developmentPlanPhrases[period] || [];
  return selectPhrase(phrases, `${seed}-${period}`);
};

export const getPhrase = (path, seed = "") => {
  const parts = String(path || "").split(".");
  let current = phraseLibrary;
  for (const part of parts) {
    current = current?.[part];
  }
  if (Array.isArray(current)) {
    return selectPhrase(current, seed);
  }
  if (typeof current === "string") {
    return current;
  }
  return "";
};

export const generatePhrase = (template = "", variables = {}) => {
  return replaceVariables(template, variables);
};

// ============================================================
// MAIN LIBRARY EXPORT
// ============================================================

export const phraseLibrary = {
  generalReportPhrases,
  scoreLevelPhrases,
  categoryStrengthPhrases,
  categoryDevelopmentPhrases,
  manufacturingPhrases,
  traitPhrases,
  roleReadinessPhrases,
  developmentPlanPhrases
};

export default {
  phraseLibrary,
  selectPhrase,
  replaceVariables,
  generatePhrase,
  getPhrase,
  getScoreLevelKey,
  getScorePhrase,
  getCategoryStrengthPhrase,
  getCategoryDevelopmentPhrase,
  getManufacturingPhrase,
  getTraitPhrase,
  getRoleReadinessPhrase,
  getDevelopmentPlanPhrase,
  generalReportPhrases,
  scoreLevelPhrases,
  categoryStrengthPhrases,
  categoryDevelopmentPhrases,
  manufacturingPhrases,
  traitPhrases,
  roleReadinessPhrases,
  developmentPlanPhrases
};
