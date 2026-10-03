// utils/sectionNarratives.js
// Universal section narrative library.
//
// Keys are section names only — shared across assessments. A single
// 'Communication' bank renders for every assessment whose section string is
// 'Communication'. Do not duplicate banks per assessment type.
//
// Authoring progress:
//   Cognitive (4) + Behavioral (8) + Cultural (8) + Performance (12) +
//   General Assessment (9) + Leadership (2) + Manufacturing Technical (6) +
//   Practical (5) + Technical Competence (7) + single-section types (5) —
//   LIBRARY COMPLETE. Covers every section currently in unique_questions.

// ============================================================
// 1. SECTION DEFINITIONS
// ============================================================

export const sectionDefinitions = {
  'Verbal Reasoning':
    'Understanding and drawing conclusions from written language — comprehension, analogies, and inference.',
  'Numerical Reasoning':
    'Working with numbers, proportions, patterns, and quantitative data to reach defensible conclusions.',
  'Abstract Reasoning':
    'Recognising patterns, rules, and relationships in unfamiliar or symbolic material.',
  'Logical Reasoning':
    'Drawing valid inferences from premises — deductive, conditional, and categorical reasoning.',
  'Decision Making':
    'Choosing between options under uncertainty, with attention to trade-offs and downside risk.',
  'Communication':
    'Conveying information clearly, adapting register and medium to audience, and delivering difficult messages — including upward — with candour.',
  'Adaptability':
    'Responding constructively to change, uncertainty, and shifting context.',
  'Accountability':
    'Owning outcomes, accepting responsibility, and learning from failure without deflection.',
  'Collaboration':
    'Working effectively with others — trust, conflict, shared goals, and team dynamics.',
  'Integrity':
    'Maintaining ethical standards under pressure — transparency, directness, and proportionality.',
  'Resilience':
    'Sustaining composure and recovery under sustained pressure or setback.',
  'Stakeholder Focus':
    'Managing the expectations and interests of clients, partners, and senior stakeholders.',
  'Values Alignment':
    'Choosing behaviours consistent with stated organisational values, especially when it costs something.',
  'Cultural Adaptability':
    'Working effectively across differing cultural norms, styles, and expectations.',
  'Team Compatibility':
    'Integrating into established team dynamics without losing individual contribution.',
  'Attitudinal Markers':
    'Signals of motivation, engagement, and work ethic — including unobserved situations.',
  'Organisational Citizenship':
    'Contributing beyond formal role — helping others, improving processes, strengthening the workplace.',
  'Ethical & Cultural Judgment':
    'Navigating ethical decisions where cultural context and organisational standards interact.',
  'Motivation & Drive':
    'Sustained effort, especially on work that is uninteresting, difficult, or without visible reward.',
  'Learning Orientation':
    'Using feedback, failure, and new information to improve — including from unexpected sources.',
  'Achievement Orientation':
    'Drive to set, pursue, and exceed demanding goals.',
  'Goal Setting':
    'Setting goals that are meaningful, achievable, and aligned to priorities.',
  'Initiative':
    'Acting without being told — spotting and addressing issues before they escalate.',
  'Persistence':
    'Continuing effort through setback, ambiguity, and slow progress.',
  'Self-Management':
    'Managing own time, energy, attention, and commitments.',
  'Professional Reliability':
    'Following through on commitments, communicating changes, and being dependable.',
  'Quality Standards':
    'Choosing the right standard for the work — not over-polishing, not under-delivering.',
  'Productivity & Efficiency':
    'Understanding of productivity metrics, efficiency levers, and the trade-offs between them.',
  'Quality & Effectiveness':
    'Understanding of quality management concepts, cost-of-quality, and customer outcomes.',
  'Goal Achievement':
    'Understanding of goal frameworks (OKRs, KPIs) and how organisations track progress.',
  'Employee Engagement':
    'Understanding of engagement, retention, and the drivers of discretionary effort.',
  'Financial & Operational Performance':
    'Understanding of core financial and operational metrics — margin, cash flow, ROI, liquidity.',
  'Cognitive Ability':
    'Overall performance across the cognitive sections of the general assessment — reasoning, problem-solving, and mental agility.',
  'Cultural & Attitudinal Fit':
    'Overall alignment with organisational culture — values, adaptability, engagement, and citizenship.',
  'Emotional Intelligence':
    'Reading and responding to emotions in self and others, especially under pressure.',
  'Ethics & Integrity':
    'Consistency between stated principles and observable decisions, especially when costly.',
  'Leadership & Management':
    'Setting direction, developing people, and holding teams accountable for outcomes.',
  'Performance Metrics':
    'Understanding and use of metrics that track individual, team, and organisational performance.',
  'Personality & Behavioral':
    'Stable patterns of behaviour and preference that shape how the candidate works and interacts.',
  'Problem-Solving':
    'Structured approach to diagnosing problems, generating options, and reaching workable solutions.',
  'Technical & Manufacturing':
    'Understanding of technical and manufacturing concepts relevant to the operating environment.',
  'People Management':
    'Directly managing people — setting expectations, developing capability, and addressing performance.',
  'Strategic Thinking':
    'Reasoning about long-term direction, competitive context, and the trade-offs that shape strategy.',
  'Vision / Strategy':
    'Setting direction, framing long-term priorities, and translating intent into action.',
  'People Leadership':
    'Building, developing, and holding teams accountable.',
  'Execution Drive':
    'Translating intent into delivered outcomes on time and at standard.',
  'Ethics':
    'Consistency between stated principles and observable decisions, especially when costly.',
  'CIP & Maintenance':
    'Cleaning-in-place systems and preventative maintenance practices in food and beverage production.',
  'Conveyors & Line Efficiency':
    'Conveyor systems and their impact on line throughput, stability, and downtime.',
  'Filling & Bottling':
    'Filling and bottling operations — parameters, changeovers, and quality control.',
  'Packaging & Labeling':
    'Packaging processes, labeling accuracy, and downstream quality and compliance.',
  'Safety & Efficiency':
    'Balancing safety requirements with production efficiency in a live production environment.',
  'Water Treatment & Quality':
    'Water treatment processes and quality standards in beverage production.',
  'Aptitude':
    'General practical aptitude for hands-on technical work — the ability to learn, reason, and apply skills in a workshop or plant context.',
  'Attitude':
    'Workplace attitude in a practical setting — reliability, willingness to learn, and engagement with hands-on tasks.',
  'Safety':
    'Understanding and application of safety practices in a practical technical environment — PPE, hazard awareness, and safe working habits.',
  'Technical':
    'Practical technical judgment in a workshop or plant context — tool use, materials, and hands-on problem recognition.',
  'Troubleshooting':
    'Systematically diagnosing and resolving operational problems.',
  'Communication & Teamwork':
    'Communicating effectively with colleagues and working as part of a technical team.',
  'Learning Agility':
    'Ability to learn new technical content quickly and apply it under changing conditions.',
  'Measurement & Engineering Units':
    'Working accurately with measurement, units, tolerances, and engineering specifications.',
  'Ownership & Integrity':
    'Taking responsibility for work, equipment, and outcomes — including admitting errors and reporting issues.',
  'Problem Solving & Troubleshooting':
    'Diagnosing faults and reaching workable solutions in technical contexts.',
  'Safety & Risk Awareness':
    'Understanding of safety practices and the ability to identify and manage risk in technical work.',
  'Technical Fundamentals':
    'Core technical knowledge required for the role.',
  'Numerical Aptitude':
    'Applying arithmetic and quantitative reasoning to practical problems.',
  'Safety & Work Ethic':
    'Understanding of safety practices and behaviours associated with dependable work.',
  'Manufacturing':
    'Broad understanding of manufacturing operations — processes, equipment, quality, and safety in a production environment.',
  'Mechanical Engineering':
    'Understanding of mechanical engineering principles — forces, materials, motion, and machine design.',
  'Electrical Engineering':
    'Understanding of electrical engineering principles — circuits, power, control, and electrical safety.',
  'Logistics & Supply Chain':
    'Understanding of logistics and supply chain — planning, movement, inventory, and coordination.',
  'Quality Assurance':
    'Understanding of quality assurance — standards, inspection, testing, and continuous improvement.',
};

// ============================================================
// 2. GENERIC BANKS
// ============================================================

export const genericSummaries = {
  exceptional: [
    'Performance in this area is well above the expected range. The evidence indicates consistently strong reasoning and judgment.',
    'This section shows a clear strength. The candidate handles complex situations in this area with confidence and sound judgment.',
    'Results in this area are exceptional. The candidate demonstrates reliable capability even in demanding situations.',
    'A standout area. The candidate reasons about situations in this section with notable clarity and depth.',
  ],
  strong: [
    'Performance in this area is strong and dependable. The candidate handles typical situations well and is rarely thrown by complexity.',
    'The candidate shows solid capability here. Occasional difficulty at the very top end, but overall reliable.',
    'This is an area of relative strength. Sound judgment across a range of scenarios.',
    'Above average performance in this area. The candidate reasons well and is unlikely to make basic errors.',
  ],
  capable: [
    'Performance in this area is adequate. The candidate gets the basics right but may slow down on complex or ambiguous cases.',
    'Functional capability. Standard situations are handled well; unusual or high-stakes cases may need review.',
    'Reasonable performance in this area. Not a strength, not a weakness — solid middle-ground capability.',
    'Acceptable capability. The candidate handles typical scenarios correctly but may not spot subtle distinctions.',
  ],
  developing: [
    'Performance in this area is below the expected range. Basic understanding is present but application is inconsistent.',
    'This area shows gaps. The candidate will benefit from structured support and additional exposure.',
    'Developing capability. More effort is required than for peers in this area, and errors are more likely.',
    'Below-expected performance. The candidate has room to grow here, particularly on complex or high-stakes decisions.',
  ],
  at_risk: [
    'Performance in this area is well below the expected range. This will affect role effectiveness if not addressed.',
    'Significant gaps. The candidate is likely to make errors or hesitate in situations requiring this capability.',
    'This area represents a genuine constraint. Without support, performance will be inconsistent.',
    'Substantial development required. The candidate is unlikely to handle this area reliably without assistance.',
  ],
  high_risk: [
    'Performance in this area is critically low. Tasks requiring this capability should be avoided or heavily supported.',
    'Severe gaps. The candidate is likely to struggle even with routine situations in this area.',
    'This is the lowest range observed for this section. Significant risk if the role depends on it.',
    'Critical development need. Reliable performance in this area is unlikely without substantial intervention.',
  ],
};

export const genericImplications = {
  exceptional: [
    'Consider using this strength in higher-stakes contexts. The candidate can be trusted with complex or demanding work in this area.',
    'Leverage this capability. It may be a differentiator for the candidate relative to peers.',
    'Prioritise the candidate for work that requires this strength. Very few candidates will show this level.',
    'This is a genuine strength. Consider how it can be applied to wider team benefit.',
  ],
  strong: [
    "Reliable for most work in this area. Consider pairing with the candidate's weaker areas when the stakes are high.",
    'Use this strength where it matters. No specific intervention required.',
    'This capability can be relied upon. Monitor for edge cases but no structured development needed.',
    'Assign work in this area with normal supervision. Quality should be dependable.',
  ],
  capable: [
    'Suitable for standard work. Provide reviews on high-stakes tasks.',
    'Acceptable for most purposes. Consider extra check-ins on unusual cases.',
    'Baseline capability in place. Provide clarity and support on ambiguous tasks.',
    'Functional. If the role demands excellence in this area, consider targeted development.',
  ],
  developing: [
    'Pair with a stronger performer for complex work in this area until the capability is reinforced.',
    'Provide structured development — mentoring, practice, and feedback.',
    'Avoid assigning sole responsibility for high-stakes tasks in this area until progress is visible.',
    'Set specific learning goals for this section and review quarterly.',
  ],
  at_risk: [
    'Significant support required. Do not assign standalone responsibility in this area.',
    'Avoid roles where this capability is central. If unavoidable, provide close supervision.',
    'Structured development plan needed. Track progress formally.',
    'This is a priority development area. Expect to invest time and support.',
  ],
  high_risk: [
    'Do not rely on this capability for decisions or critical work.',
    'Roles requiring this capability should be reconsidered for this candidate.',
    'Significant, ongoing support would be needed. Consider whether this is the right fit.',
    'This is a critical gap. Any work in this area should be fully supervised or reassigned.',
  ],
};

// ============================================================
// 3. AUTHORED SECTION BANKS — sectionSummaries
// ============================================================

export const sectionSummaries = {
  // ----- COGNITIVE -----
  'Verbal Reasoning': {
    exceptional: [
      'Verbal reasoning is a clear strength. The candidate extracts meaning from complex written material with ease and reasons confidently about implications, not just surface content.',
      'The candidate reads quickly and accurately, distinguishing essential from incidental detail. Inference and analogy work are notably strong.',
      'Verbal reasoning is well above the expected range. The candidate handles subtle distinctions in language without hesitation.',
      'Strong command of written meaning and inference. The candidate is likely to communicate clearly and reason effectively from documentation-heavy material.',
    ],
    strong: [
      'Verbal reasoning is solid and reliable. The candidate handles most complex written material well and reasons correctly about what follows.',
      'Comprehension and inference are strong. Occasional difficulty with very abstract or indirect material, but the overall pattern is dependable.',
      'Verbal reasoning is above average. The candidate reads carefully and draws sound conclusions most of the time.',
      'Good command of language-based reasoning. The candidate is comfortable extracting meaning and applying it.',
    ],
    capable: [
      'Verbal reasoning is functional. The candidate handles standard written material well but may slow down on complex inference.',
      'Comprehension is generally sound. Distinctions between similar meanings or subtle implications may occasionally be missed.',
      'Adequate verbal reasoning. The candidate gets most messages right but is not always quick to identify the underlying inference.',
      'Reasonable grasp of written meaning. Complex or highly nuanced material is where the candidate is more likely to struggle.',
    ],
    developing: [
      'Verbal reasoning is developing. The candidate understands direct written statements but has difficulty with inference, analogy, or abstract language.',
      'Comprehension is inconsistent. Some passages are handled well; others — especially subtle ones — are more effortful.',
      'Verbal reasoning is below the expected range. The candidate may need to slow down and re-read materials that rely on inference.',
      'Basic comprehension is intact. Difficulty emerges with indirect meaning, ambiguous phrasing, or layered arguments.',
    ],
    at_risk: [
      'Verbal reasoning is a significant constraint. The candidate struggles with inference and may misread complex written material.',
      'Written reasoning is limited. The candidate handles simple statements but struggles when meaning is implied rather than stated.',
      'Verbal reasoning is well below the expected range. Passages requiring interpretation or analogy work are likely to be difficult.',
      'Comprehension gaps will affect roles requiring careful reading, argument analysis, or written reasoning.',
    ],
    high_risk: [
      'Verbal reasoning is severely limited. Even simple written material may require significant support to interpret correctly.',
      'The candidate shows marked difficulty with written reasoning. Nearly all tasks involving inference or written meaning are likely to be challenging.',
      'Verbal reasoning is in the lowest range observed on this assessment. Reading-dependent work would present consistent difficulty.',
      'Substantial support with written material would be needed. The candidate is unlikely to reason reliably from written sources without help.',
    ],
  },

  'Numerical Reasoning': {
    exceptional: [
      'Numerical reasoning is a clear strength. The candidate works confidently with quantitative material and reasons fluently about proportions, patterns, and relationships between numbers.',
      'Quantitative reasoning is well above the expected range. The candidate reads data accurately, chooses the appropriate operation without hesitation, and arrives at defensible conclusions.',
      'The candidate handles numerical complexity with ease. Calculations are performed quickly and checked reliably, even on multi-step problems.',
      'Performance on quantitative items indicates strong analytical capability. The candidate is comfortable with data, patterns, and the arithmetic judgments required to reach sound conclusions.',
    ],
    strong: [
      'Numerical reasoning is solid and dependable. The candidate handles most quantitative tasks correctly and rarely makes basic errors.',
      'The candidate works reliably with numbers, percentages, and ratios. Complex multi-step problems may occasionally slow the pace, but the overall pattern is sound.',
      'Quantitative reasoning is above average. Most calculations and pattern-based questions are handled confidently.',
      'The candidate reads numerical data carefully and applies the right approach in most cases. Occasional complexity may cause brief hesitation, but the outcome is generally correct.',
    ],
    capable: [
      'Numerical reasoning is functional. Routine calculations and straightforward data interpretations are handled correctly, but complex or multi-step problems may be more effortful.',
      'The candidate works adequately with numbers. Standard percentage, ratio, and arithmetic tasks are handled well; problems requiring abstract or layered reasoning may reveal gaps.',
      'Quantitative reasoning is at the expected baseline. The candidate reaches correct conclusions on most tasks but is slower or less certain on more demanding items.',
      'The candidate demonstrates reliable numeracy on typical problems. Where patterns are non-obvious or data is dense, accuracy may be inconsistent.',
    ],
    developing: [
      'Numerical reasoning is below the expected range. Basic arithmetic and direct percentage or ratio tasks are handled, but more complex quantitative reasoning presents difficulty.',
      'The candidate manages standard calculations with care but is likely to make errors on multi-step or abstract numerical problems.',
      'Performance on quantitative items suggests the candidate finds numerical reasoning effortful. Simple cases are handled; complex cases are more likely to be missed.',
      'The candidate understands foundational numerical concepts but struggles with the reasoning layer — choosing the right operation, spotting patterns, or interpreting layered data.',
    ],
    at_risk: [
      'Numerical reasoning is a significant constraint. The candidate handles simple arithmetic but is likely to make errors when data requires interpretation, pattern recognition, or multi-step logic.',
      'Quantitative work presents notable difficulty. The candidate may need external tooling, reference material, or peer support to reach reliable conclusions with numbers.',
      'Performance in this area is well below the expected range. Even standard quantitative tasks may be effortful and error-prone.',
      'The candidate struggles with numerical reasoning in a way that will affect roles requiring data work, financial calculations, or quantitative analysis.',
    ],
    high_risk: [
      'Numerical reasoning is severely limited. Most quantitative tasks will present substantial difficulty, even with the candidate applying sustained effort.',
      "The candidate's performance on quantitative items is in the lowest range observed on this assessment. Numerical work should not be relied on without significant support.",
      'Numerical reasoning is a critical constraint. Even simple calculations may require scaffolding.',
      'Performance on this section indicates a serious difficulty with quantitative material. Tasking that depends on numerical reasoning should be reconsidered or reassigned.',
    ],
  },

  'Abstract Reasoning': {
    exceptional: [
      'Abstract reasoning is a clear strength. The candidate identifies patterns and underlying rules in unfamiliar material quickly and with confidence.',
      'The candidate reasons fluently with symbolic or novel content. Structure is recognised without needing examples or prior exposure.',
      'Abstract reasoning is well above the expected range. The candidate spots relationships and rules that are not immediately obvious.',
      'Performance on abstract items indicates strong fluid reasoning. The candidate moves easily from specific cases to general patterns.',
    ],
    strong: [
      'Abstract reasoning is solid and reliable. The candidate handles most pattern-based problems correctly and rarely misses the underlying rule.',
      'The candidate recognises structure in unfamiliar content with confidence. Occasional complexity may slow the pace but not the outcome.',
      'Abstract reasoning is above average. Patterns and symbolic relationships are handled well most of the time.',
      'The candidate reasons effectively about novel material. Rules are identified correctly even where examples are limited.',
    ],
    capable: [
      'Abstract reasoning is functional. Straightforward patterns and rules are handled correctly, but more complex or unfamiliar content may be effortful.',
      'The candidate recognises structure on typical tasks. Where patterns are layered or abstract, accuracy may be inconsistent.',
      'Abstract reasoning is at the expected baseline. The candidate reaches the right conclusions on most items but may slow down on the more demanding ones.',
      'The candidate demonstrates reasonable fluid reasoning. Some pattern types are handled easily; others require more effort.',
    ],
    developing: [
      'Abstract reasoning is below the expected range. Basic patterns are recognised, but the candidate struggles to infer rules from unfamiliar material.',
      'The candidate finds abstract content effortful. Straightforward sequences or analogies may be handled; layered or symbolic problems are more likely to be missed.',
      'Performance on abstract items suggests the candidate benefits from concrete examples. Without them, rule inference is inconsistent.',
      'The candidate recognises structure when it is explicit. Where patterns must be inferred, the reasoning breaks down more often.',
    ],
    at_risk: [
      'Abstract reasoning is a significant constraint. The candidate handles simple pattern recognition but struggles with unfamiliar or symbolic material.',
      'Fluid reasoning presents notable difficulty. The candidate is likely to miss rules or relationships that are not immediately visible.',
      'Performance in this area is well below the expected range. Even standard abstract tasks may be effortful.',
      "The candidate's ability to reason with novel material is limited. Roles requiring pattern inference or abstract problem solving will be affected.",
    ],
    high_risk: [
      'Abstract reasoning is severely limited. Most pattern-based or symbolic tasks will present substantial difficulty.',
      "The candidate's performance on abstract items is in the lowest range observed. Novel problem solving should not be relied upon without significant support.",
      'Fluid reasoning is a critical constraint. Even simple pattern recognition may require scaffolding.',
      'Performance on this section indicates a serious difficulty with abstract material. Tasking that depends on inferring rules from unfamiliar content should be reconsidered.',
    ],
  },

  'Logical Reasoning': {
    exceptional: [
      'Logical reasoning is a clear strength. The candidate draws valid inferences from premises with confidence and reliably distinguishes necessary from possible conclusions.',
      'The candidate reasons correctly about conditionals and categorical relationships. Invalid inferences are recognised immediately.',
      'Logical reasoning is well above the expected range. The candidate handles complex chains of deduction without losing precision.',
      'Performance on logical items indicates strong analytical reasoning. The candidate identifies what must follow from premises, and what cannot.',
    ],
    strong: [
      'Logical reasoning is solid and dependable. The candidate draws correct inferences in most cases and rarely confuses valid reasoning with plausible reasoning.',
      'The candidate handles conditional and categorical logic reliably. Very complex or layered problems may occasionally slow the pace, but the outcome is generally correct.',
      'Logical reasoning is above average. Most deductions are handled confidently.',
      'The candidate distinguishes valid from invalid inferences in most scenarios. Where multiple premises interact, accuracy remains high.',
    ],
    capable: [
      'Logical reasoning is functional. Straightforward deductions are handled correctly, but complex or multi-step logical problems may be more effortful.',
      'The candidate reasons about premises adequately. Where conditionals or categorical statements interact, occasional errors may occur.',
      'Logical reasoning is at the expected baseline. The candidate reaches correct conclusions on most items but is slower or less certain on harder ones.',
      'The candidate demonstrates reliable deduction on typical tasks. Where premises are layered or ambiguous, accuracy may vary.',
    ],
    developing: [
      'Logical reasoning is below the expected range. Basic inferences are handled, but the candidate struggles with conditionals, contrapositives, or multi-premise chains.',
      'The candidate finds logical deduction effortful. Direct inferences may be reached; layered or categorical reasoning is more likely to be missed.',
      'Performance on logical items suggests the candidate benefits from concrete examples. Without them, rule application is inconsistent.',
      'The candidate reasons correctly on simpler premises but is more likely to accept plausible-looking but invalid conclusions.',
    ],
    at_risk: [
      'Logical reasoning is a significant constraint. The candidate handles simple statements but struggles with conditionals, categorical logic, or multi-premise reasoning.',
      'Deductive reasoning presents notable difficulty. The candidate may accept invalid conclusions when they are plausible.',
      'Performance in this area is well below the expected range. Even standard logical tasks may be effortful.',
      "The candidate's ability to draw valid inferences is limited. Roles requiring careful reasoning about conditionals or categorisation will be affected.",
    ],
    high_risk: [
      'Logical reasoning is severely limited. Most deductive tasks will present substantial difficulty.',
      "The candidate's performance on logical items is in the lowest range observed. Valid inference should not be relied on without significant support.",
      'Analytical reasoning is a critical constraint. Even simple conditionals may require scaffolding.',
      'Performance on this section indicates a serious difficulty with logical structure. Tasking that depends on drawing valid inferences should be reconsidered.',
    ],
  },

  // ----- BEHAVIORAL -----
  'Decision Making': {
    exceptional: [
      'Decision making is a clear strength. The candidate weighs options carefully under uncertainty, identifies the relevant trade-offs, and reaches defensible conclusions without unnecessary delay.',
      'The candidate handles difficult choices well. Competing priorities are weighed deliberately, and the reasoning behind a decision is usually sound even when information is incomplete.',
      'Decision quality is well above the expected range. The candidate distinguishes between reversible and irreversible choices and adjusts rigour accordingly.',
      'The candidate decides with confidence and discipline. Downside risk is considered rather than ignored, and decisions are owned rather than deferred.',
    ],
    strong: [
      'Decision making is solid. The candidate reaches sound conclusions on most choices and rarely acts on incomplete reasoning.',
      'The candidate weighs options effectively and considers trade-offs. Highly ambiguous or high-stakes decisions may occasionally slow the pace, but quality holds.',
      'Decision quality is above average. The candidate is comfortable choosing between reasonable alternatives without over-analysing.',
      'The candidate makes timely, well-reasoned decisions in typical situations. Escalation is used appropriately rather than as avoidance.',
    ],
    capable: [
      'Decision making is functional. Routine choices are handled well, but complex trade-offs or incomplete information may cause hesitation.',
      'The candidate reaches acceptable conclusions on most decisions. Where stakes are high or options are closely matched, extra review is sensible.',
      'Decision quality is at the expected baseline. The candidate decides correctly on standard matters but may defer or seek cover on harder calls.',
      'The candidate handles day-to-day decisions adequately. Reversible decisions are made promptly; irreversible ones may need support to finalise.',
    ],
    developing: [
      'Decision making is below the expected range. The candidate may struggle to weigh trade-offs or commit to a course of action when options are close.',
      'The candidate is more comfortable with clear-cut choices than with ambiguous ones. Under uncertainty, decisions are slower or less well-founded.',
      'Performance on decision items suggests the candidate benefits from structure. Without a clear framework, reasoning quality is inconsistent.',
      'The candidate may over-rely on others to validate decisions, or under-weight downside risk when acting quickly.',
    ],
    at_risk: [
      'Decision making is a significant constraint. The candidate may avoid decisions, defer them upward, or commit without adequate consideration of trade-offs.',
      'Choice under uncertainty presents notable difficulty. Decisions may be driven by the most recent information rather than the most relevant.',
      'Performance in this area is well below the expected range. Complex decisions are likely to be poorly reasoned or not made at all.',
      'The candidate struggles to reach defensible conclusions where options are genuinely close. Roles requiring independent judgment will be affected.',
    ],
    high_risk: [
      'Decision making is severely limited. Even routine choices may be deferred, reversed, or made without regard to consequence.',
      'The candidate shows marked difficulty committing to well-reasoned decisions. Risk of poor outcomes in any role requiring autonomous judgment.',
      'Decision quality is in the lowest range observed on this assessment. Independent decision-making should not be relied upon without close support.',
      'Significant scaffolding is required. The candidate is unlikely to reach defensible conclusions under uncertainty without structured frameworks and review.',
    ],
  },

  'Communication': {
    exceptional: [
      'Communication is a clear strength. The candidate conveys information clearly and concisely, adapts register and medium to the audience, and handles difficult messages with candour.',
      'The candidate communicates with precision and poise. Bad news and disagreement are delivered directly but constructively, without evasion or dilution.',
      'Communication is well above the expected range. The candidate reads the audience accurately and adjusts tone, detail, and framing to match.',
      'The candidate manages upward communication well. Concerns are raised early and framed in a way that supports decisions rather than obscures them.',
    ],
    strong: [
      'Communication is solid and reliable. The candidate gets the message across clearly and adapts reasonably well to different audiences.',
      'The candidate handles most difficult conversations competently. Occasional awkwardness at the very top end, but candour is generally maintained.',
      'Communication is above average. The candidate is clear, appropriately direct, and rarely misunderstood.',
      'The candidate communicates well in typical situations. Sensitive or high-stakes messages are handled with reasonable care.',
    ],
    capable: [
      'Communication is functional. The candidate gets the message across in routine situations but may be less effective with difficult messages or senior audiences.',
      'The candidate communicates adequately. Clarity holds in most cases; nuance and audience adaptation may be inconsistent.',
      'Communication is at the expected baseline. The candidate is generally understood but may soften or delay difficult messages more than is helpful.',
      'The candidate handles standard communication well. Escalating concerns or disagreeing upward may need coaching.',
    ],
    developing: [
      'Communication is below the expected range. The candidate may be unclear, over-long, or misjudge the register appropriate to the audience.',
      'The candidate finds difficult messages hard to deliver. Bad news may be delayed, softened, or obscured rather than stated plainly.',
      'Performance on communication items suggests the candidate benefits from structure — prepared messages, written follow-ups, or a rehearsal before high-stakes conversations.',
      'The candidate may avoid upward communication or deliver it in a way that does not land clearly with senior audiences.',
    ],
    at_risk: [
      'Communication is a significant constraint. The candidate may be unclear, avoid difficult messages, or fail to adapt to the audience in ways that affect outcomes.',
      'Difficult conversations present notable difficulty. Concerns may be withheld, delayed, or delivered in a way that creates ambiguity or surprise.',
      'Performance in this area is well below the expected range. Misunderstanding and unmet expectations are likely consequences.',
      'The candidate struggles to communicate upward. Senior stakeholders may be under-informed or caught off guard by issues the candidate was aware of.',
    ],
    high_risk: [
      'Communication is severely limited. Even routine messages may be unclear, mistimed, or directed at the wrong audience.',
      'The candidate shows marked difficulty with difficult or upward communication. Bad news is unlikely to be raised proactively or clearly.',
      'Communication is in the lowest range observed on this assessment. Roles requiring regular stakeholder communication would present consistent difficulty.',
      'Significant scaffolding is required. The candidate is unlikely to communicate effectively under pressure without structured templates and review.',
    ],
  },

  'Adaptability': {
    exceptional: [
      'Adaptability is a clear strength. The candidate adjusts approach smoothly when context shifts, treats change as normal rather than threatening, and maintains effectiveness through uncertainty.',
      'The candidate responds to new information by updating plans rather than defending prior ones. Course correction is handled without friction.',
      'Adaptability is well above the expected range. The candidate works effectively when priorities, tools, or team composition change mid-stream.',
      'The candidate shows comfort with ambiguity. Where others may need certainty, this candidate can proceed and refine as they go.',
    ],
    strong: [
      'Adaptability is solid and reliable. The candidate adjusts to most changes without significant loss of effectiveness.',
      'The candidate responds well to shifting circumstances. Large or sudden change may take brief adjustment, but recovery is quick.',
      'Adaptability is above average. The candidate handles evolving requirements with composure and keeps work moving.',
      'The candidate is comfortable with reasonable levels of change and adjusts approach to fit new conditions.',
    ],
    capable: [
      'Adaptability is functional. The candidate handles routine change well but may be slower to adjust when change is significant or unexpected.',
      'The candidate manages moderate shifts in context. Larger changes may need time, clarity, or support to absorb.',
      'Adaptability is at the expected baseline. The candidate adjusts eventually but may initially resist or slow down.',
      'The candidate is comfortable when change is incremental. Disruptive or high-ambiguity change may test composure.',
    ],
    developing: [
      'Adaptability is below the expected range. The candidate may be unsettled by change and slow to adjust when context shifts.',
      'The candidate prefers stable conditions. Frequent or significant change is likely to affect effectiveness or morale.',
      'Performance on adaptability items suggests the candidate benefits from clear framing and notice when change is coming.',
      'The candidate may cling to prior plans after conditions have changed, or require repeated reassurance before adjusting.',
    ],
    at_risk: [
      'Adaptability is a significant constraint. The candidate struggles with change, ambiguity, or shifting priorities in ways that affect delivery.',
      'The candidate may resist or delay adjustment when circumstances change, or become less effective under uncertainty.',
      'Performance in this area is well below the expected range. Roles requiring frequent change or ambiguity would present sustained difficulty.',
      'Change is likely to produce anxiety or paralysis. The candidate may need close support through transitions.',
    ],
    high_risk: [
      'Adaptability is severely limited. Even minor changes in circumstance may disrupt the candidate\u2019s work.',
      'The candidate shows marked rigidity. Plans, methods, or expectations may be held to long after they have become obsolete.',
      'Adaptability is in the lowest range observed on this assessment. Roles with unstable environments should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to adjust effectively to change without structured support and time.',
    ],
  },

  'Accountability': {
    exceptional: [
      'Accountability is a clear strength. The candidate owns outcomes — good and bad — without deflecting to circumstance, colleagues, or system. Responsibility is taken quickly and cleanly.',
      'The candidate reports problems early rather than after they compound. Failures are acknowledged and used as input, not hidden or reframed.',
      'Accountability is well above the expected range. Commitments are tracked and followed through, and the candidate holds themselves to a higher standard than required.',
      'The candidate distinguishes between factors within their control and those outside it, and takes responsibility only for the former — without overclaiming or underclaiming.',
    ],
    strong: [
      'Accountability is solid and dependable. The candidate accepts responsibility for outcomes and rarely deflects or excuses.',
      'The candidate owns mistakes promptly and follows through on corrective action. Minor lapses at the top end, but the pattern is reliable.',
      'Accountability is above average. Commitments are honoured and failures acknowledged without defensiveness.',
      'The candidate takes responsibility for their work in typical situations. Escalation and disclosure happen as expected.',
    ],
    capable: [
      'Accountability is functional. The candidate accepts responsibility in routine situations but may be slower to own failure when stakes are high or visibility is broad.',
      'The candidate follows through on most commitments. Where things go wrong, ownership may be partial or delayed.',
      'Accountability is at the expected baseline. The candidate is generally reliable but may attribute poor outcomes to external factors more readily than is warranted.',
      'The candidate manages day-to-day ownership adequately. Public or high-stakes failure may need support to acknowledge cleanly.',
    ],
    developing: [
      'Accountability is below the expected range. The candidate may deflect, excuse, or delay taking responsibility when things go wrong.',
      'The candidate is more comfortable owning success than failure. Errors may be reframed, minimised, or attributed to others or circumstance.',
      'Performance on accountability items suggests the candidate benefits from clear ownership structures and explicit expectations.',
      'The candidate may avoid raising problems early, preferring to solve or conceal them without escalation.',
    ],
    at_risk: [
      'Accountability is a significant constraint. The candidate may deflect blame, delay disclosure, or fail to follow through on commitments without external pressure.',
      'Ownership of outcomes is inconsistent. Failures may be reframed as external, hidden, or attributed to factors the candidate did not control.',
      'Performance in this area is well below the expected range. Reliability and trust are likely to be affected.',
      'The candidate struggles to acknowledge error or accept responsibility in ways that affect team confidence and learning.',
    ],
    high_risk: [
      'Accountability is severely limited. Even routine ownership may be avoided, deflected, or reversed when consequences appear.',
      'The candidate shows marked difficulty taking responsibility. Failures are unlikely to be owned or used constructively.',
      'Accountability is in the lowest range observed on this assessment. Roles requiring reliability and ownership should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to accept responsibility without explicit structure, monitoring, and consequence.',
    ],
  },

  'Collaboration': {
    exceptional: [
      'Collaboration is a clear strength. The candidate works effectively with others — builds trust quickly, handles disagreement without damage, and keeps shared goals ahead of personal position.',
      'The candidate contributes to team performance beyond their own output. Others are supported, credit is shared, and friction is resolved rather than left to accumulate.',
      'Collaboration is well above the expected range. The candidate reads team dynamics accurately and adjusts contribution to what the group needs.',
      'The candidate is comfortable with constructive conflict. Disagreement is used to improve outcomes rather than avoided or escalated.',
    ],
    strong: [
      'Collaboration is solid and reliable. The candidate works well in teams and rarely creates friction.',
      'The candidate contributes to shared outcomes and handles disagreement maturely. Very complex team dynamics may occasionally require adjustment, but the pattern is dependable.',
      'Collaboration is above average. The candidate is a dependable team member who contributes without needing to dominate.',
      'The candidate works effectively with others in typical situations. Trust is built and maintained.',
    ],
    capable: [
      'Collaboration is functional. The candidate works adequately in teams but may prefer independence and contribute less where group effort is required.',
      'The candidate manages routine collaboration well. Conflict or cross-functional tension may reveal less comfort with joint work.',
      'Collaboration is at the expected baseline. The candidate is a reasonable team member but does not consistently strengthen the team.',
      'The candidate handles standard teamwork adequately. Where trust must be built quickly or differences resolved, more effort may be needed.',
    ],
    developing: [
      'Collaboration is below the expected range. The candidate may work in parallel rather than with others, or avoid the friction that comes with real teamwork.',
      'The candidate may struggle with disagreement or shared ownership. Contributions to team outcomes are inconsistent.',
      'Performance on collaboration items suggests the candidate benefits from clear roles, structured communication, and explicit shared goals.',
      'The candidate may prioritise individual delivery over team process in ways that affect collective outcomes.',
    ],
    at_risk: [
      'Collaboration is a significant constraint. The candidate may create friction, avoid joint work, or fail to contribute to shared outcomes.',
      'Team dynamics present notable difficulty. Conflict may be mishandled, avoided entirely, or escalated unnecessarily.',
      'Performance in this area is well below the expected range. Roles requiring close teamwork would present sustained difficulty.',
      'The candidate struggles to build or maintain trust with colleagues. Collaboration may reduce rather than enhance team performance.',
    ],
    high_risk: [
      'Collaboration is severely limited. Even routine joint work may be disrupted by the candidate\u2019s approach.',
      'The candidate shows marked difficulty working with others. Team outcomes may be affected by friction, withdrawal, or unmanaged conflict.',
      'Collaboration is in the lowest range observed on this assessment. Roles requiring sustained teamwork should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to collaborate effectively without structured process and close facilitation.',
    ],
  },

  'Integrity': {
    exceptional: [
      'Integrity is a clear strength. The candidate maintains ethical standards under pressure — states uncomfortable truths, refuses shortcuts that cross lines, and is transparent when it would be easier not to be.',
      'The candidate\u2019s actions align with stated principles even when the cost is real. Consistency between word and deed is a defining feature.',
      'Integrity is well above the expected range. The candidate raises ethical concerns proactively and proportionately, without grandstanding or evasion.',
      'The candidate is trusted with sensitive matters. Transparency and directness are maintained under conditions where others might compromise.',
    ],
    strong: [
      'Integrity is solid and dependable. The candidate maintains standards under normal pressure and is generally transparent.',
      'The candidate behaves consistently with stated principles. Extreme pressure or high personal cost may test this, but the pattern is reliable.',
      'Integrity is above average. The candidate is honest and direct without being needlessly harsh.',
      'The candidate maintains ethical standards in typical situations. Disclosure happens as expected.',
    ],
    capable: [
      'Integrity is functional. The candidate maintains standards in routine situations but may soften or delay disclosure when stakes are high.',
      'The candidate generally behaves consistently with stated principles. Under significant pressure, transparency may waver.',
      'Integrity is at the expected baseline. The candidate is honest in ordinary matters but may weigh consequences more heavily than principle at the margins.',
      'The candidate handles standard ethical situations adequately. High-cost situations may require support to hold the line.',
    ],
    developing: [
      'Integrity is below the expected range. The candidate may soften truths, delay disclosure, or rationalise small compromises when under pressure.',
      'Standards may bend under pressure in ways the candidate does not fully acknowledge. Consistency between stated and observed behaviour is inconsistent.',
      'Performance on integrity items suggests the candidate benefits from clear expectations and explicit ethical frameworks.',
      'The candidate may avoid uncomfortable disclosures, prefer ambiguity to directness, or allow situational factors to override stated principles.',
    ],
    at_risk: [
      'Integrity is a significant constraint. The candidate may compromise standards under pressure, withhold relevant information, or rationalise conduct in ways that affect trust.',
      'Transparency is inconsistent. What is stated and what is done may diverge under pressure.',
      'Performance in this area is well below the expected range. Roles requiring ethical reliability would present sustained difficulty.',
      'The candidate struggles to maintain principles when the cost is real. Trust is likely to be affected.',
    ],
    high_risk: [
      'Integrity is severely limited. Even routine situations may produce compromises or omissions that would not be expected.',
      'The candidate shows marked difficulty maintaining standards. Ethical behaviour may be contingent on convenience or visibility.',
      'Integrity is in the lowest range observed on this assessment. Roles requiring ethical reliability should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to maintain standards without close oversight and explicit consequence.',
    ],
  },

  'Resilience': {
    exceptional: [
      'Resilience is a clear strength. The candidate sustains composure and performance under sustained pressure, recovers quickly from setback, and does not transmit stress to those around them.',
      'The candidate maintains perspective under difficulty. Setbacks are processed and absorbed rather than allowed to affect ongoing work.',
      'Resilience is well above the expected range. The candidate performs effectively in conditions that would degrade others\u2019 output.',
      'The candidate recovers from failure without prolonged disruption. Composure and judgment are maintained through demanding periods.',
    ],
    strong: [
      'Resilience is solid and reliable. The candidate handles most pressure and setback without significant loss of function.',
      'The candidate sustains performance through demanding periods. Very high or sustained pressure may take a toll, but recovery is generally quick.',
      'Resilience is above average. The candidate maintains composure in typical high-pressure situations.',
      'The candidate recovers from setbacks and continues effectively. Stress is managed without undue spillover.',
    ],
    capable: [
      'Resilience is functional. The candidate handles routine pressure well but may show strain under sustained or intense demand.',
      'The candidate manages typical setbacks adequately. Prolonged pressure may affect composure or output.',
      'Resilience is at the expected baseline. The candidate copes with ordinary difficulty but may need support during extended challenge.',
      'The candidate recovers from setback in time but may be slower than peers. Recovery is supported by structure and support.',
    ],
    developing: [
      'Resilience is below the expected range. The candidate may show strain under pressure and take longer than peers to recover from setback.',
      'The candidate copes with short-term difficulty but struggles when pressure is sustained. Output may drop during demanding periods.',
      'Performance on resilience items suggests the candidate benefits from recovery time, clarity, and support during difficult periods.',
      'The candidate may transmit stress to colleagues or find judgment compromised under sustained pressure.',
    ],
    at_risk: [
      'Resilience is a significant constraint. The candidate may be significantly affected by pressure in ways that affect performance, judgment, or relationships.',
      'Sustained demand is likely to produce strain that shows in output, composure, or colleagues\u2019 experience.',
      'Performance in this area is well below the expected range. Roles with inherent pressure would present sustained difficulty.',
      'The candidate may need active support to maintain function through demanding periods.',
    ],
    high_risk: [
      'Resilience is severely limited. Even routine pressure may disrupt the candidate\u2019s work or composure.',
      'The candidate shows marked difficulty sustaining performance under demand. Recovery from setback may be prolonged or incomplete.',
      'Resilience is in the lowest range observed on this assessment. High-pressure roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to sustain performance under pressure without substantial support.',
    ],
  },

  'Stakeholder Focus': {
    exceptional: [
      'Stakeholder focus is a clear strength. The candidate reads the interests, expectations, and priorities of clients, partners, and senior stakeholders accurately, and manages them proactively.',
      'The candidate balances competing stakeholder needs without losing sight of the underlying objectives. Expectations are managed honestly and early.',
      'Stakeholder focus is well above the expected range. The candidate anticipates concerns before they are raised and communicates in ways that build confidence.',
      'The candidate handles difficult stakeholders with composure. Conflicting demands are surfaced, prioritised, and managed rather than left to escalate.',
    ],
    strong: [
      'Stakeholder focus is solid and reliable. The candidate manages most stakeholder relationships well and communicates expectations clearly.',
      'The candidate balances stakeholder needs effectively. Highly complex or politically sensitive relationships may occasionally require support.',
      'Stakeholder focus is above average. Concerns are addressed promptly and expectations managed appropriately.',
      'The candidate manages typical stakeholder relationships effectively. Trust is built and maintained.',
    ],
    capable: [
      'Stakeholder focus is functional. The candidate handles routine stakeholder interactions well but may be less effective with competing demands or senior audiences.',
      'The candidate manages standard relationships adequately. Complex stakeholder landscapes may reveal gaps in anticipation or management.',
      'Stakeholder focus is at the expected baseline. The candidate responds to stakeholder needs but may not proactively shape expectations.',
      'The candidate handles typical stakeholder situations well. Higher-stakes or politically complex contexts may need support.',
    ],
    developing: [
      'Stakeholder focus is below the expected range. The candidate may misread stakeholder priorities, fail to manage expectations proactively, or allow issues to escalate.',
      'The candidate may focus on immediate delivery without adequately considering wider stakeholder interests.',
      'Performance on stakeholder items suggests the candidate benefits from structured briefings and clear escalation routes.',
      'Competing stakeholder demands may cause confusion or reactive rather than anticipatory management.',
    ],
    at_risk: [
      'Stakeholder focus is a significant constraint. The candidate may mishandle relationships, miss expectations, or create friction with senior audiences or clients.',
      'Stakeholder management is likely to produce unmet expectations, surprises, or unnecessary escalation.',
      'Performance in this area is well below the expected range. Roles with significant external or senior stakeholder contact would present sustained difficulty.',
      'The candidate struggles to balance competing interests in ways that affect outcomes and relationships.',
    ],
    high_risk: [
      'Stakeholder focus is severely limited. Even routine stakeholder interactions may create friction or unmet expectations.',
      'The candidate shows marked difficulty managing relationships. Senior or external stakeholders are unlikely to be handled effectively.',
      'Stakeholder focus is in the lowest range observed on this assessment. Roles requiring stakeholder management should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to manage stakeholder relationships effectively without close support and structure.',
    ],
  },

  // ----- CULTURAL -----
  'Values Alignment': {
    exceptional: [
      'Values alignment is a clear strength. The candidate consistently chooses behaviours that reflect the organisation\u2019s stated values, including when doing so carries a personal or professional cost.',
      'The candidate holds to stated principles in situations where short-term advantage would favour a different course. Values function as a genuine constraint, not a slogan.',
      'Values alignment is well above the expected range. The candidate can articulate what the values mean in practice and behaves accordingly in ambiguous situations.',
      'The candidate treats organisational values as operative. Decisions are made with reference to them, not merely justified by them after the fact.',
    ],
    strong: [
      'Values alignment is solid and dependable. The candidate generally behaves in line with stated values and treats them as meaningful.',
      'The candidate follows through on values when the cost is moderate. Very high-cost situations may test this, but the pattern is reliable.',
      'Values alignment is above average. The candidate acts consistently with stated principles in most situations.',
      'The candidate is values-aware and behaves accordingly. Occasional small deviations occur but are not characteristic.',
    ],
    capable: [
      'Values alignment is functional. The candidate behaves in line with stated values when the cost is low, but may weigh situational factors more heavily when the cost rises.',
      'The candidate subscribes to the organisation\u2019s values in principle. Behaviour under pressure may drift from stated principles.',
      'Values alignment is at the expected baseline. The candidate is generally consistent but may not treat values as a decisive constraint.',
      'The candidate handles routine values situations adequately. High-cost decisions may reveal a preference for pragmatism over principle.',
    ],
    developing: [
      'Values alignment is below the expected range. The candidate may hold the values nominally but deviate when convenient or when under pressure.',
      'The candidate may prioritise outcomes over stated principles in ways that create inconsistency between words and actions.',
      'Performance on values items suggests the candidate benefits from explicit examples of what the values look like in practice.',
      'The candidate may not fully internalise what the values require in day-to-day work, especially in ambiguous situations.',
    ],
    at_risk: [
      'Values alignment is a significant constraint. The candidate may behave in ways that conflict with stated values, or treat them as aspirational rather than binding.',
      'Consistency between stated values and observed behaviour is likely to be an issue, particularly when the cost is real.',
      'Performance in this area is well below the expected range. Roles where cultural fit is central would present sustained difficulty.',
      'The candidate struggles to prioritise values over convenience or immediate benefit in ways that affect trust and team culture.',
    ],
    high_risk: [
      'Values alignment is severely limited. The candidate\u2019s behaviour may routinely diverge from the organisation\u2019s stated values.',
      'The candidate shows marked difficulty acting in line with stated principles. Values are unlikely to be a meaningful constraint on behaviour.',
      'Values alignment is in the lowest range observed on this assessment. Cultural fit should be a serious consideration.',
      'Significant scaffolding is required. The candidate is unlikely to behave consistently with the values without close oversight and explicit expectations.',
    ],
  },

  'Cultural Adaptability': {
    exceptional: [
      'Cultural adaptability is a clear strength. The candidate works effectively across differing norms, communication styles, and expectations, and adjusts their own approach without losing effectiveness.',
      'The candidate reads cultural context accurately and modifies behaviour accordingly. Assumptions are tested rather than imposed.',
      'Cultural adaptability is well above the expected range. The candidate is comfortable in unfamiliar cultural settings and learns the unwritten rules quickly.',
      'The candidate navigates cultural differences with sensitivity and confidence. Diversity of style and expectation is treated as a resource rather than a friction.',
    ],
    strong: [
      'Cultural adaptability is solid and reliable. The candidate works well across most cultural contexts and adjusts approach appropriately.',
      'The candidate is respectful of differing norms and adapts behaviour reasonably. Very unfamiliar settings may take adjustment, but the pattern is dependable.',
      'Cultural adaptability is above average. The candidate works effectively in culturally mixed teams and contexts.',
      'The candidate manages cultural differences well in typical situations. Trust is built across backgrounds.',
    ],
    capable: [
      'Cultural adaptability is functional. The candidate works adequately across cultural boundaries but may default to familiar norms under pressure.',
      'The candidate is respectful of difference but may not always adjust behaviour to fit. Cultural nuance may occasionally be missed.',
      'Cultural adaptability is at the expected baseline. The candidate copes with cultural diversity but may not seek it out.',
      'The candidate handles standard cross-cultural situations adequately. Unfamiliar norms may take time to absorb.',
    ],
    developing: [
      'Cultural adaptability is below the expected range. The candidate may be uncomfortable in unfamiliar cultural settings or apply their own norms without adjustment.',
      'The candidate finds cultural difference effortful. Cross-cultural interactions may reveal gaps in flexibility or reading of context.',
      'Performance on cultural adaptability items suggests the candidate benefits from structured exposure and explicit guidance on differing norms.',
      'The candidate may misinterpret behaviour that would be clear in a familiar cultural context.',
    ],
    at_risk: [
      'Cultural adaptability is a significant constraint. The candidate may struggle in culturally mixed environments or create friction through unadjusted expectations.',
      'Cross-cultural work presents notable difficulty. Misunderstandings, unintended offence, or missed cues are likely.',
      'Performance in this area is well below the expected range. Roles with significant cultural diversity would present sustained difficulty.',
      'The candidate may not recognise their own cultural defaults or the impact of those defaults on colleagues from other backgrounds.',
    ],
    high_risk: [
      'Cultural adaptability is severely limited. Even routine cross-cultural interactions may create friction or misunderstanding.',
      'The candidate shows marked difficulty working across cultural boundaries. Adjustment to unfamiliar norms is unlikely without close support.',
      'Cultural adaptability is in the lowest range observed on this assessment. Culturally diverse roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to work effectively across cultures without substantial guidance and structure.',
    ],
  },

  'Team Compatibility': {
    exceptional: [
      'Team compatibility is a clear strength. The candidate integrates into established team dynamics quickly while still contributing individually. Trust is built without needing to dominate the space.',
      'The candidate is a stabilising presence in teams. Differences are accommodated, norms are respected, and contribution flows naturally.',
      'Team compatibility is well above the expected range. The candidate reads team climate accurately and adapts their working style to strengthen the group.',
      'The candidate is genuinely additive to team culture. Others work better because of the candidate\u2019s presence.',
    ],
    strong: [
      'Team compatibility is solid and dependable. The candidate fits into teams well and contributes to a functional working environment.',
      'The candidate integrates into teams without friction and adds value. Very particular team cultures may take brief adjustment.',
      'Team compatibility is above average. The candidate is well-liked and works harmoniously with colleagues.',
      'The candidate works well in established teams. Trust is built and maintained without difficulty.',
    ],
    capable: [
      'Team compatibility is functional. The candidate fits into most teams but may need time to settle into established dynamics.',
      'The candidate works adequately with colleagues. Distinct or strong team cultures may reveal limits in adaptability.',
      'Team compatibility is at the expected baseline. The candidate is a reasonable team member but may not actively strengthen team culture.',
      'The candidate handles standard team environments well. High-cohesion teams or long-standing dynamics may need adjustment time.',
    ],
    developing: [
      'Team compatibility is below the expected range. The candidate may not fit easily into established team dynamics or may create friction over time.',
      'The candidate may prefer working independently and contribute less to team cohesion than would be expected.',
      'Performance on team compatibility items suggests the candidate benefits from structured induction and clear team norms.',
      'The candidate may find team environments harder to navigate than they expect, or misread unwritten team rules.',
    ],
    at_risk: [
      'Team compatibility is a significant constraint. The candidate may struggle to integrate into established teams or disrupt team cohesion.',
      'Team dynamics present notable difficulty. Friction, isolation, or unresolved tension is likely over time.',
      'Performance in this area is well below the expected range. Roles requiring close team membership would present sustained difficulty.',
      'The candidate may not recognise the impact of their style on team functioning, or may struggle to adapt to norms they do not share.',
    ],
    high_risk: [
      'Team compatibility is severely limited. Even routine team membership may create significant friction.',
      'The candidate shows marked difficulty integrating into teams. Cohesion and collaboration are likely to be affected.',
      'Team compatibility is in the lowest range observed on this assessment. Team-based roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to work effectively as a team member without close support and structure.',
    ],
  },

  'Attitudinal Markers': {
    exceptional: [
      'Attitudinal markers are a clear strength. The candidate shows sustained motivation, engagement, and work ethic across a range of situations — including ones where effort is unobserved or reward is distant.',
      'The candidate demonstrates genuine investment in work quality and organisational outcomes. Engagement is not contingent on visibility.',
      'Attitudinal markers are well above the expected range. The candidate brings energy and commitment to tasks regardless of how externally rewarding they are.',
      'The candidate treats work as inherently worth doing well. Effort is applied consistently, not strategically.',
    ],
    strong: [
      'Attitudinal markers are solid and reliable. The candidate shows good engagement and work ethic across typical situations.',
      'The candidate is dependable and motivated. Long or unrewarding tasks may occasionally test this, but the pattern holds.',
      'Attitudinal markers are above average. The candidate is engaged and applies consistent effort.',
      'The candidate demonstrates positive work attitudes in most situations. Motivation is generally stable.',
    ],
    capable: [
      'Attitudinal markers are functional. The candidate shows adequate engagement when the task or context is motivating, but effort may vary with reward or visibility.',
      'The candidate maintains basic work ethic. Motivation may be more situational than intrinsic.',
      'Attitudinal markers are at the expected baseline. The candidate is engaged when conditions are favourable but may not be self-driving.',
      'The candidate performs adequately in typical circumstances. Sustained effort on unengaging tasks may need support.',
    ],
    developing: [
      'Attitudinal markers are below the expected range. The candidate may show inconsistent engagement or effort contingent on reward, visibility, or interest.',
      'Motivation may dip on tasks that are not immediately rewarding. Work ethic is variable.',
      'Performance on attitudinal items suggests the candidate benefits from clear purpose, regular feedback, and visible connection to outcomes.',
      'The candidate may approach work instrumentally rather than treating it as intrinsically worth doing well.',
    ],
    at_risk: [
      'Attitudinal markers are a significant constraint. The candidate may show low engagement, minimal discretionary effort, or inconsistent work ethic.',
      'Motivation is likely to be fragile. Effort may not be sustained under low visibility or reward.',
      'Performance in this area is well below the expected range. Roles requiring self-driven effort would present sustained difficulty.',
      'The candidate may disengage from tasks that are not directly motivating, affecting both output and colleagues\u2019 experience.',
    ],
    high_risk: [
      'Attitudinal markers are severely limited. Even routine engagement may be inconsistent or absent.',
      'The candidate shows marked difficulty sustaining effort or interest. Discretionary contribution is unlikely.',
      'Attitudinal markers are in the lowest range observed on this assessment. Roles requiring intrinsic motivation should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to show consistent engagement without close management and frequent reinforcement.',
    ],
  },

  'Organisational Citizenship': {
    exceptional: [
      'Organisational citizenship is a clear strength. The candidate contributes beyond formal role — helps colleagues without being asked, improves processes, and strengthens the workplace in ways not required by the job.',
      'The candidate invests in the organisation\u2019s broader effectiveness, not just their own delivery. Contributions extend to team and organisational outcomes.',
      'Organisational citizenship is well above the expected range. The candidate notices and addresses things that would otherwise fall between roles.',
      'The candidate behaves as an owner, not just an occupant. Discretionary contribution is consistent and constructive.',
    ],
    strong: [
      'Organisational citizenship is solid and dependable. The candidate helps colleagues and contributes to shared outcomes beyond their own brief.',
      'The candidate is a good organisational citizen. Contribution extends beyond role requirements in typical situations.',
      'Organisational citizenship is above average. The candidate supports colleagues and improves shared processes where possible.',
      'The candidate contributes to the wider workplace in most situations. Team benefit is a genuine consideration.',
    ],
    capable: [
      'Organisational citizenship is functional. The candidate delivers their own role reliably but may contribute less beyond it than peers.',
      'The candidate is a reasonable organisational citizen. Discretionary contribution is occasional rather than characteristic.',
      'Organisational citizenship is at the expected baseline. The candidate focuses primarily on their own responsibilities.',
      'The candidate handles their own work well. Helping others or improving processes may occur but is not a defining feature.',
    ],
    developing: [
      'Organisational citizenship is below the expected range. The candidate focuses on their own role and contributes little beyond it.',
      'The candidate may be unaware of, or indifferent to, wider organisational needs. Colleagues may not experience them as supportive.',
      'Performance on citizenship items suggests the candidate benefits from explicit expectations around team contribution.',
      'Discretionary effort beyond role requirements is limited. The candidate may see work as strictly transactional.',
    ],
    at_risk: [
      'Organisational citizenship is a significant constraint. The candidate may contribute nothing beyond formal role, or create drag on team effectiveness.',
      'Colleagues are unlikely to experience the candidate as supportive. Shared processes may suffer from lack of investment.',
      'Performance in this area is well below the expected range. Roles where team contribution matters would present sustained difficulty.',
      'The candidate may actively avoid or undermine organisational initiatives that require contribution beyond their own tasking.',
    ],
    high_risk: [
      'Organisational citizenship is severely limited. Even basic collegial contribution may be absent.',
      'The candidate shows marked disengagement from wider organisational outcomes. Contribution is strictly transactional.',
      'Organisational citizenship is in the lowest range observed on this assessment. Team-oriented roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to contribute beyond role requirements without explicit structure and consequence.',
    ],
  },

  'Ethical & Cultural Judgment': {
    exceptional: [
      'Ethical and cultural judgment is a clear strength. The candidate navigates situations where organisational standards and cultural context interact, and reaches defensible decisions without losing sight of either.',
      'The candidate distinguishes genuine ethical issues from cultural difference, and responds appropriately to each. Judgment is balanced and considered.',
      'Ethical and cultural judgment is well above the expected range. The candidate recognises when norms conflict and manages the tension thoughtfully rather than defaulting to one side.',
      'The candidate is trusted with complex moral and cultural questions. Decisions are made transparently and with reference to principle.',
    ],
    strong: [
      'Ethical and cultural judgment is solid and dependable. The candidate handles most situations involving ethical or cultural complexity appropriately.',
      'The candidate navigates ethical and cultural tensions well. Very complex cases may occasionally require consultation, but the pattern is reliable.',
      'Ethical and cultural judgment is above average. The candidate reaches sound conclusions when principle and context interact.',
      'The candidate handles typical ethical and cultural situations effectively. Judgment is generally sound.',
    ],
    capable: [
      'Ethical and cultural judgment is functional. The candidate handles routine situations adequately but may struggle when ethical and cultural considerations pull in different directions.',
      'The candidate manages standard ethical and cultural questions. Complex cases may reveal limits in balancing principle and context.',
      'Ethical and cultural judgment is at the expected baseline. The candidate reaches reasonable conclusions but may not fully consider all dimensions.',
      'The candidate handles typical situations well. Cases where norms conflict may require additional thought or consultation.',
    ],
    developing: [
      'Ethical and cultural judgment is below the expected range. The candidate may default to one frame (ethical or cultural) without adequately considering the other.',
      'The candidate may misread situations where standards and cultural context interact, or reach conclusions that don\u2019t fully account for both.',
      'Performance on ethical and cultural judgment items suggests the candidate benefits from structured frameworks and case discussion.',
      'The candidate may find it difficult to distinguish genuine ethical issues from cultural differences, or vice versa.',
    ],
    at_risk: [
      'Ethical and cultural judgment is a significant constraint. The candidate may reach inappropriate conclusions when standards and cultural context interact.',
      'Judgment is likely to be inconsistent. The candidate may apply rules mechanically or defer entirely to context, rather than balancing both.',
      'Performance in this area is well below the expected range. Roles requiring nuanced ethical and cultural judgment would present sustained difficulty.',
      'The candidate may create risk through misjudged responses to complex situations, or avoid judgment entirely.',
    ],
    high_risk: [
      'Ethical and cultural judgment is severely limited. Even routine situations involving ethical or cultural complexity may produce poor outcomes.',
      'The candidate shows marked difficulty navigating situations where standards and context interact. Judgment is likely to be unreliable.',
      'Ethical and cultural judgment is in the lowest range observed on this assessment. Roles requiring this capability should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to reach defensible conclusions in complex ethical and cultural situations without close support.',
    ],
  },

  'Motivation & Drive': {
    exceptional: [
      'Motivation and drive are a clear strength. The candidate sustains effort over time, including on work that is uninteresting, difficult, or without visible reward.',
      'The candidate pursues goals with persistence and energy. Effort is not contingent on external stimulation or recognition.',
      'Motivation and drive are well above the expected range. The candidate maintains momentum through long or unrewarding tasks.',
      'The candidate is genuinely self-driven. Intrinsic motivation carries them through periods where external rewards are distant or absent.',
    ],
    strong: [
      'Motivation and drive are solid and reliable. The candidate sustains effort in most situations, including difficult ones.',
      'The candidate is motivated and persistent. Very long or heavily unrewarding tasks may test this, but the pattern holds.',
      'Motivation and drive are above average. The candidate works with consistent energy and commitment.',
      'The candidate demonstrates good drive in typical situations. Effort is generally sustained.',
    ],
    capable: [
      'Motivation and drive are functional. The candidate sustains effort on tasks that are interesting or reasonably rewarded, but may flag on unengaging work.',
      'The candidate is reasonably motivated. Effort may depend on task characteristics or external reinforcement.',
      'Motivation and drive are at the expected baseline. The candidate works adequately in normal conditions but may not be self-generating.',
      'The candidate performs acceptably. Sustained effort on unrewarding tasks may need support or periodic reinforcement.',
    ],
    developing: [
      'Motivation and drive are below the expected range. The candidate may show variable effort depending on task interest or reward.',
      'The candidate may find it difficult to sustain effort on work that is uninteresting or without visible reward.',
      'Performance on motivation items suggests the candidate benefits from clear purpose, progress visibility, and periodic recognition.',
      'The candidate may require more external structure than peers to maintain consistent output.',
    ],
    at_risk: [
      'Motivation and drive are a significant constraint. The candidate may show low sustained effort or effort that is highly contingent on external factors.',
      'Discretionary effort is likely to be minimal. Tasks without reward or interest are unlikely to be completed to standard.',
      'Performance in this area is well below the expected range. Roles requiring self-driven sustained effort would present difficulty.',
      'The candidate may need frequent external reinforcement to maintain momentum, which may not be available in many roles.',
    ],
    high_risk: [
      'Motivation and drive are severely limited. Even routine effort may be inconsistent or absent.',
      'The candidate shows marked difficulty sustaining effort over time. Long or unrewarding tasks are unlikely to be completed.',
      'Motivation and drive are in the lowest range observed on this assessment. Roles requiring intrinsic drive should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to maintain sustained effort without close management and frequent reinforcement.',
    ],
  },

  'Learning Orientation': {
    exceptional: [
      'Learning orientation is a clear strength. The candidate actively uses feedback, failure, and new information to improve, including from sources that challenge existing views.',
      'The candidate treats mistakes as information rather than threats. Learning is pursued deliberately and applied quickly.',
      'Learning orientation is well above the expected range. The candidate seeks feedback proactively and changes behaviour accordingly.',
      'The candidate is genuinely curious and adaptive. New information and criticism are absorbed and used constructively.',
    ],
    strong: [
      'Learning orientation is solid and reliable. The candidate uses feedback and new information to improve performance.',
      'The candidate learns from experience and adjusts approach appropriately. Very challenging feedback may take brief processing, but the pattern holds.',
      'Learning orientation is above average. The candidate takes feedback seriously and applies it.',
      'The candidate demonstrates good learning behaviour in typical situations. Improvement over time is visible.',
    ],
    capable: [
      'Learning orientation is functional. The candidate accepts feedback and adjusts where necessary, but may not actively seek development.',
      'The candidate learns from experience. Feedback may be applied unevenly, and some lessons may need repetition.',
      'Learning orientation is at the expected baseline. The candidate is open to learning but not proactively so.',
      'The candidate handles typical feedback situations adequately. Challenging or unfamiliar feedback may take longer to absorb.',
    ],
    developing: [
      'Learning orientation is below the expected range. The candidate may accept feedback nominally but not consistently act on it.',
      'The candidate may find challenging feedback difficult to process. Learning from failure is inconsistent.',
      'Performance on learning items suggests the candidate benefits from structured development conversations and clear expectations.',
      'The candidate may repeat mistakes rather than adjusting approach, or see feedback as criticism rather than information.',
    ],
    at_risk: [
      'Learning orientation is a significant constraint. The candidate may be defensive, resistant, or slow to change behaviour in response to feedback.',
      'Learning from experience is limited. The candidate may repeatedly make similar errors without adjustment.',
      'Performance in this area is well below the expected range. Roles requiring continuous learning would present sustained difficulty.',
      'The candidate may reject or dismiss feedback that challenges their approach, limiting development.',
    ],
    high_risk: [
      'Learning orientation is severely limited. Even direct feedback is unlikely to produce behaviour change.',
      'The candidate shows marked resistance to learning or development. Improvement over time is unlikely.',
      'Learning orientation is in the lowest range observed on this assessment. Roles requiring adaptability and growth should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to learn and adjust without intensive, structured intervention.',
    ],
  },

  // ----- PERFORMANCE -----
  'Achievement Orientation': {
    exceptional: [
      'Achievement orientation is a clear strength. The candidate sets ambitious goals, pursues them with sustained energy, and consistently performs above the expected level.',
      'The candidate is driven by a genuine desire to achieve, not just to meet requirements. Standards are self-imposed and consistently high.',
      'Achievement orientation is well above the expected range. The candidate pushes for results even when the baseline would be acceptable.',
      'The candidate shows a strong internal drive to excel. Effort and aspiration are aligned and sustained.',
    ],
    strong: [
      'Achievement orientation is solid and reliable. The candidate sets meaningful goals and pursues them with consistent effort.',
      'The candidate is achievement-focused. Very demanding targets may occasionally stretch them, but the pattern is dependable.',
      'Achievement orientation is above average. The candidate aims for high standards and generally reaches them.',
      'The candidate demonstrates good drive in typical situations. Performance tends to exceed minimum requirements.',
    ],
    capable: [
      'Achievement orientation is functional. The candidate meets goals adequately but may not consistently push beyond them.',
      'The candidate is reasonably achievement-focused. Standards are set appropriately but ambition may be moderate.',
      'Achievement orientation is at the expected baseline. The candidate performs adequately without strong aspiration to exceed.',
      'The candidate delivers to requirements. Higher targets may not be actively sought.',
    ],
    developing: [
      'Achievement orientation is below the expected range. The candidate may set modest goals or apply inconsistent effort toward them.',
      'The candidate may be satisfied with meeting minimum requirements rather than pursuing higher standards.',
      'Performance on achievement items suggests the candidate benefits from stretch goals and regular recognition.',
      'Ambition and drive may not be consistently present, particularly on demanding tasking.',
    ],
    at_risk: [
      'Achievement orientation is a significant constraint. The candidate may set low goals, avoid challenge, or apply insufficient effort to reach them.',
      'Ambition is limited. The candidate may be content with minimum delivery and disinclined to stretch.',
      'Performance in this area is well below the expected range. Roles requiring high aspiration or demanding goal pursuit would present difficulty.',
      'The candidate may underperform relative to potential due to limited drive or low self-expectation.',
    ],
    high_risk: [
      'Achievement orientation is severely limited. The candidate shows little motivation to set or pursue ambitious goals.',
      'Standards are low or effort is minimal. Delivery is unlikely to exceed basic requirements.',
      'Achievement orientation is in the lowest range observed on this assessment. High-achievement environments should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to pursue demanding goals without intensive structure and encouragement.',
    ],
  },

  'Goal Setting': {
    exceptional: [
      'Goal setting is a clear strength. The candidate sets goals that are meaningful, specific, ambitious, and aligned with wider priorities.',
      'The candidate distinguishes between goals worth pursuing and those that merely look good. Objectives are chosen deliberately and structured for action.',
      'Goal setting is well above the expected range. The candidate breaks long-term direction into intermediate milestones that support progress.',
      'The candidate sets goals that stretch capability without becoming unrealistic. Balance between ambition and achievability is well-judged.',
    ],
    strong: [
      'Goal setting is solid and reliable. The candidate sets appropriate goals and structures them for progress.',
      'The candidate is a capable goal-setter. Goals are generally well-chosen and linked to priorities.',
      'Goal setting is above average. The candidate sets meaningful objectives and tracks progress toward them.',
      'The candidate demonstrates good goal-setting behaviour in typical situations. Objectives are specific and actionable.',
    ],
    capable: [
      'Goal setting is functional. The candidate sets goals but may not always align them tightly to priorities or make them specific enough for tracking.',
      'The candidate manages standard goal-setting adequately. Goals may be more operational than strategic.',
      'Goal setting is at the expected baseline. The candidate sets reasonable objectives but may not challenge or stretch themselves.',
      'The candidate handles typical goal-setting situations well. Alignment and specificity may need support.',
    ],
    developing: [
      'Goal setting is below the expected range. The candidate may set vague, low, or misaligned goals that do not drive progress.',
      'The candidate may focus on task completion rather than meaningful objectives. Goals may need external input to be useful.',
      'Performance on goal-setting items suggests the candidate benefits from frameworks and structured planning conversations.',
      'The candidate may not distinguish clearly between aims worth pursuing and those that are merely present.',
    ],
    at_risk: [
      'Goal setting is a significant constraint. The candidate may set no clear goals, set inappropriate ones, or fail to link goals to priorities.',
      'Without external structure, the candidate is unlikely to establish objectives that support meaningful progress.',
      'Performance in this area is well below the expected range. Roles requiring independent goal-setting would present difficulty.',
      'The candidate may drift without clear direction, or pursue goals that do not advance wider objectives.',
    ],
    high_risk: [
      'Goal setting is severely limited. The candidate shows marked difficulty establishing or structuring goals.',
      'Goals, where present, are unlikely to be meaningful, specific, or aligned with organisational priorities.',
      'Goal setting is in the lowest range observed on this assessment. Roles requiring self-directed objective-setting should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to set or pursue goals without intensive external support.',
    ],
  },

  'Initiative': {
    exceptional: [
      'Initiative is a clear strength. The candidate acts without being told, spots issues before they escalate, and addresses them proactively.',
      'The candidate does not wait for permission or instruction when action is clearly needed. Ownership is taken without overstepping.',
      'Initiative is well above the expected range. The candidate anticipates needs and acts in ways that prevent problems rather than react to them.',
      'The candidate is a self-starter. Work moves forward without external prompting, including on ambiguous or under-defined tasking.',
    ],
    strong: [
      'Initiative is solid and reliable. The candidate acts appropriately without being told and addresses issues proactively.',
      'The candidate takes initiative in most situations. Extremely novel or high-stakes matters may prompt appropriate caution, but the pattern is dependable.',
      'Initiative is above average. The candidate spots and addresses issues without being prompted.',
      'The candidate demonstrates good initiative in typical situations. Action is generally taken when needed.',
    ],
    capable: [
      'Initiative is functional. The candidate handles routine proactivity adequately but may wait for direction on less familiar or higher-stakes matters.',
      'The candidate takes initiative when the path is clear. Ambiguous situations may prompt waiting rather than action.',
      'Initiative is at the expected baseline. The candidate acts when instructed or when issues are obvious.',
      'The candidate manages standard situations well. Proactivity on complex or political matters may be less consistent.',
    ],
    developing: [
      'Initiative is below the expected range. The candidate may wait for instruction rather than acting on evident needs.',
      'The candidate may notice issues but not act on them without prompting. Ownership is reactive rather than proactive.',
      'Performance on initiative items suggests the candidate benefits from explicit permission and clear boundaries for autonomous action.',
      'The candidate may avoid action where the outcome is uncertain, even when the situation calls for engagement.',
    ],
    at_risk: [
      'Initiative is a significant constraint. The candidate may routinely wait for instruction, miss evident problems, or allow issues to escalate without action.',
      'Reactive behaviour is likely to create problems that proactive action would have prevented.',
      'Performance in this area is well below the expected range. Roles requiring autonomous action would present sustained difficulty.',
      'The candidate may require explicit direction for even minor decisions, limiting effectiveness in most roles.',
    ],
    high_risk: [
      'Initiative is severely limited. The candidate shows marked passivity, waiting for instruction even when action is clearly required.',
      'Issues are likely to escalate unnoticed. Ownership is absent without active external prompting.',
      'Initiative is in the lowest range observed on this assessment. Roles requiring self-direction should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to act without close oversight and explicit instruction.',
    ],
  },

  'Persistence': {
    exceptional: [
      'Persistence is a clear strength. The candidate continues effort through setback, ambiguity, and slow progress without losing commitment to the goal.',
      'The candidate treats obstacles as problems to solve rather than signals to stop. Effort is sustained until the objective is reached or a genuine reason to change course emerges.',
      'Persistence is well above the expected range. The candidate maintains momentum through conditions that would cause others to disengage.',
      'The candidate shows resilience of effort. Long, difficult, or unrewarding work is continued with the same commitment as quick wins.',
    ],
    strong: [
      'Persistence is solid and reliable. The candidate continues effort through most setbacks and slow periods.',
      'The candidate sustains commitment to goals under normal difficulty. Very prolonged or severe obstacles may test this, but the pattern holds.',
      'Persistence is above average. The candidate continues effort when progress is slow or the work is uninteresting.',
      'The candidate demonstrates good persistence in typical situations. Setbacks do not easily derail effort.',
    ],
    capable: [
      'Persistence is functional. The candidate continues effort through routine difficulty but may flag under sustained or severe setback.',
      'The candidate manages standard persistence demands adequately. Long or unusually difficult periods may reduce momentum.',
      'Persistence is at the expected baseline. The candidate perseveres when difficulty is moderate but may lose commitment under extended strain.',
      'The candidate handles typical situations well. Sustained effort on very difficult or slow tasks may need support.',
    ],
    developing: [
      'Persistence is below the expected range. The candidate may abandon effort too readily when progress is slow or setback occurs.',
      'The candidate copes with short-term difficulty but may not sustain commitment through prolonged or repeated obstacles.',
      'Performance on persistence items suggests the candidate benefits from intermediate milestones, encouragement, and clear progress visibility.',
      'Effort may dip when the path becomes unclear or the reward is distant.',
    ],
    at_risk: [
      'Persistence is a significant constraint. The candidate may give up when difficulty arises or when progress is not immediately visible.',
      'Long or difficult tasking is unlikely to be completed without active external support.',
      'Performance in this area is well below the expected range. Roles requiring sustained effort through difficulty would present difficulty.',
      'The candidate may cycle through unfinished work, or avoid tasks that present likely obstacles.',
    ],
    high_risk: [
      'Persistence is severely limited. Even routine obstacles may halt effort.',
      'The candidate shows marked difficulty continuing through setback or ambiguity. Effort is likely to be short-lived.',
      'Persistence is in the lowest range observed on this assessment. Roles requiring sustained commitment should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to persist without intensive structure and frequent reinforcement.',
    ],
  },

  'Self-Management': {
    exceptional: [
      'Self-management is a clear strength. The candidate manages time, energy, attention, and commitments with discipline and foresight, without needing external structure.',
      'The candidate prioritises effectively, protects focus, and delivers on commitments without supervision or reminders.',
      'Self-management is well above the expected range. The candidate works efficiently across competing demands and maintains quality under pressure.',
      'The candidate is genuinely self-organising. Work is planned, executed, and adjusted without needing oversight.',
    ],
    strong: [
      'Self-management is solid and reliable. The candidate manages time and commitments effectively and rarely needs prompting.',
      'The candidate organises work well. Very high demand or conflicting priorities may occasionally strain this, but the pattern holds.',
      'Self-management is above average. The candidate manages competing demands and delivers on commitments consistently.',
      'The candidate demonstrates good self-management in typical situations. Supervision requirements are minimal.',
    ],
    capable: [
      'Self-management is functional. The candidate manages routine work adequately but may struggle when demands compete or priorities shift.',
      'The candidate handles standard self-management. Higher-complexity or high-volume situations may require support.',
      'Self-management is at the expected baseline. The candidate delivers adequately with normal structure and check-ins.',
      'The candidate manages typical commitments well. Overload or ambiguity may reduce effectiveness.',
    ],
    developing: [
      'Self-management is below the expected range. The candidate may struggle to prioritise, manage time, or follow through without external structure.',
      'The candidate may over-commit, under-prioritise, or lose focus under competing demands.',
      'Performance on self-management items suggests the candidate benefits from clear priorities, deadlines, and regular check-ins.',
      'Work may need frequent review or re-prioritisation to remain on track.',
    ],
    at_risk: [
      'Self-management is a significant constraint. The candidate may miss deadlines, mismanage time, or fail to deliver without close oversight.',
      'Commitments may be tracked poorly. Reliability under independent working conditions is unlikely.',
      'Performance in this area is well below the expected range. Roles requiring autonomy would present sustained difficulty.',
      'The candidate may benefit from highly structured environments with frequent checkpoints.',
    ],
    high_risk: [
      'Self-management is severely limited. Even routine commitments may not be delivered without close supervision.',
      'The candidate shows marked difficulty organising work or managing time effectively.',
      'Self-management is in the lowest range observed on this assessment. Autonomous roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to manage work independently without intensive structure.',
    ],
  },

  'Professional Reliability': {
    exceptional: [
      'Professional reliability is a clear strength. The candidate follows through on commitments, communicates changes early, and can be depended upon without reminders or checks.',
      'The candidate is dependable in all the ways that matter — deadlines are met, quality is consistent, and reneging on commitments is not characteristic.',
      'Professional reliability is well above the expected range. Colleagues and managers can plan around the candidate\u2019s delivery with confidence.',
      'The candidate demonstrates reliability in conditions where others might let standards slip — pressure, ambiguity, or competing demands.',
    ],
    strong: [
      'Professional reliability is solid and dependable. The candidate delivers on commitments and communicates changes appropriately.',
      'The candidate is trusted to deliver. Extreme pressure or unusual circumstances may occasionally test this, but the pattern holds.',
      'Professional reliability is above average. Commitments are met and expectations are managed honestly.',
      'The candidate demonstrates good reliability in typical situations. Follow-through is consistent.',
    ],
    capable: [
      'Professional reliability is functional. The candidate generally delivers but may occasionally miss commitments or communicate changes late.',
      'The candidate handles standard reliability demands adequately. Higher-stakes or high-volume situations may reveal gaps.',
      'Professional reliability is at the expected baseline. The candidate is reasonably dependable but not always proactive in flagging changes.',
      'The candidate manages typical commitments well. Delivery under stress may occasionally suffer.',
    ],
    developing: [
      'Professional reliability is below the expected range. The candidate may miss commitments, deliver late, or fail to communicate changes in advance.',
      'Colleagues and managers may need to follow up to ensure delivery. Dependability is inconsistent.',
      'Performance on reliability items suggests the candidate benefits from structured commitment tracking and early-warning systems.',
      'Commitments may be taken on without adequate assessment of capacity or follow-through.',
    ],
    at_risk: [
      'Professional reliability is a significant constraint. The candidate may routinely miss commitments, deliver late, or fail to communicate issues until they become problems.',
      'Trust in delivery is likely to be affected. Dependability cannot be assumed without checks.',
      'Performance in this area is well below the expected range. Roles requiring reliable independent delivery would present difficulty.',
      'The candidate may over-commit and under-deliver in ways that affect team planning and stakeholder expectations.',
    ],
    high_risk: [
      'Professional reliability is severely limited. Even routine commitments may not be met.',
      'The candidate shows marked difficulty delivering on obligations. Follow-through is unpredictable.',
      'Professional reliability is in the lowest range observed on this assessment. Roles requiring dependable delivery should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to deliver reliably without close monitoring and frequent reinforcement.',
    ],
  },

  'Quality Standards': {
    exceptional: [
      'Quality standards are a clear strength. The candidate judges the right level of rigour for the work — neither over-polishing nor under-delivering — and applies it consistently.',
      'The candidate distinguishes between work that needs to be excellent and work that needs to be good enough. Standard is chosen deliberately rather than by habit.',
      'Quality standards are well above the expected range. Output is consistently fit for purpose, with effort matched to consequence.',
      'The candidate takes pride in work without confusing polish with value. Quality is defined by fitness for purpose, not by effort spent.',
    ],
    strong: [
      'Quality standards are solid and reliable. The candidate applies appropriate rigour and delivers work that meets expectations.',
      'The candidate produces dependable quality. Very high-stakes or ambiguous work may occasionally prompt second-guessing, but the pattern holds.',
      'Quality standards are above average. Output is consistent and well-judged.',
      'The candidate demonstrates good quality judgment in typical situations. Standards are appropriate to the work.',
    ],
    capable: [
      'Quality standards are functional. The candidate delivers acceptable work but may occasionally over-invest or under-invest effort relative to the work\u2019s importance.',
      'The candidate manages standard quality demands. Fit-for-purpose judgment may waver on ambiguous or high-stakes tasks.',
      'Quality standards are at the expected baseline. Output is acceptable; effort may not always match consequence.',
      'The candidate handles typical situations adequately. High-stakes work may need review to confirm appropriate standard.',
    ],
    developing: [
      'Quality standards are below the expected range. The candidate may apply inconsistent rigour — over-polishing low-stakes work or under-delivering on important tasks.',
      'The candidate may confuse effort with quality, or struggle to judge what standard the work actually requires.',
      'Performance on quality items suggests the candidate benefits from clear expectations about what \u201cgood\u201d looks like for specific outputs.',
      'Output may need review to confirm it meets the required standard, or to catch over-investment in low-value areas.',
    ],
    at_risk: [
      'Quality standards are a significant constraint. The candidate may routinely deliver work below the required standard, or spend disproportionate effort on the wrong things.',
      'Quality judgment is inconsistent. Output may be excellent in some areas and inadequate in others, without clear reasoning.',
      'Performance in this area is well below the expected range. Roles requiring consistent quality judgment would present difficulty.',
      'The candidate may not recognise the gap between their output and what the work requires.',
    ],
    high_risk: [
      'Quality standards are severely limited. Even routine work may fall below the required standard, or effort may be badly mismatched to importance.',
      'The candidate shows marked difficulty judging what quality the work requires.',
      'Quality standards are in the lowest range observed on this assessment. Roles requiring consistent quality judgment should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to deliver appropriate quality without close review and explicit standards.',
    ],
  },

  'Productivity & Efficiency': {
    exceptional: [
      'Understanding of productivity and efficiency is a clear strength. The candidate grasps the levers that drive output, the trade-offs between speed and quality, and how efficiency is measured.',
      'The candidate distinguishes between activity and productivity. Effort is understood in terms of outcome, not hours.',
      'Understanding is well above the expected range. The candidate can articulate how productivity is measured and where the real efficiency gains lie.',
      'The candidate demonstrates sophisticated understanding of operational trade-offs and the conditions under which efficiency improvements help versus harm.',
    ],
    strong: [
      'Understanding of productivity and efficiency is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about output, effort, and trade-offs. Very complex optimisation scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss productivity meaningfully and apply concepts to real situations.',
      'The candidate demonstrates good grasp of efficiency concepts in typical situations.',
    ],
    capable: [
      'Understanding of productivity and efficiency is functional. The candidate grasps basic concepts but may miss subtler trade-offs.',
      'The candidate understands standard productivity measures. Complex or system-level efficiency questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss productivity adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or second-order effects may need support.',
    ],
    developing: [
      'Understanding of productivity and efficiency is below the expected range. The candidate may confuse activity with output or miss basic efficiency principles.',
      'The candidate may not distinguish between short-term speed and sustainable productivity. Trade-offs may be poorly understood.',
      'Performance on productivity items suggests the candidate benefits from structured exposure to operational concepts.',
      'The candidate may reason about productivity in ways that miss system-level effects or downstream consequences.',
    ],
    at_risk: [
      'Understanding of productivity and efficiency is a significant constraint. The candidate may hold misconceptions that would lead to poor operational decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about efficiency trade-offs or measurement.',
      'Performance in this area is well below the expected range. Roles requiring operational judgment would present difficulty.',
      'The candidate may pursue efficiency in ways that harm quality or sustainability due to limited understanding.',
    ],
    high_risk: [
      'Understanding of productivity and efficiency is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about operational trade-offs or measurement.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring operational judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to productivity discussions.',
    ],
  },

  'Quality & Effectiveness': {
    exceptional: [
      'Understanding of quality and effectiveness is a clear strength. The candidate grasps quality management concepts, cost-of-quality trade-offs, and the link between quality and customer outcomes.',
      'The candidate understands that quality is about fitness for purpose and customer experience, not just defect rates.',
      'Understanding is well above the expected range. The candidate can reason about where quality investment pays off and where it becomes over-engineering.',
      'The candidate demonstrates sophisticated understanding of quality systems, root-cause thinking, and the balance between prevention and inspection.',
    ],
    strong: [
      'Understanding of quality and effectiveness is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about quality trade-offs and customer impact. Very complex scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss quality meaningfully and apply concepts to real situations.',
      'The candidate demonstrates good grasp of quality concepts in typical situations.',
    ],
    capable: [
      'Understanding of quality and effectiveness is functional. The candidate grasps basic concepts but may miss subtler trade-offs.',
      'The candidate understands standard quality measures. Complex or system-level quality questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss quality adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or second-order effects may need support.',
    ],
    developing: [
      'Understanding of quality and effectiveness is below the expected range. The candidate may confuse inspection with quality, or miss the customer dimension.',
      'The candidate may not distinguish between defect prevention and detection. Cost-of-quality trade-offs may be poorly understood.',
      'Performance on quality items suggests the candidate benefits from structured exposure to quality management concepts.',
      'The candidate may reason about quality in ways that miss system-level effects or customer outcomes.',
    ],
    at_risk: [
      'Understanding of quality and effectiveness is a significant constraint. The candidate may hold misconceptions that would lead to poor quality decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about quality systems or trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring quality judgment would present difficulty.',
      'The candidate may pursue quality in ways that harm efficiency or miss what customers actually value.',
    ],
    high_risk: [
      'Understanding of quality and effectiveness is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about quality systems or customer outcomes.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring quality judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to quality discussions.',
    ],
  },

  'Goal Achievement': {
    exceptional: [
      'Understanding of goal achievement is a clear strength. The candidate grasps goal frameworks such as OKRs and KPIs, how progress is tracked, and how goals drive organisational alignment.',
      'The candidate distinguishes between output and outcome measures and understands why the distinction matters.',
      'Understanding is well above the expected range. The candidate can reason about how goals are cascaded, adjusted, and used to focus effort.',
      'The candidate demonstrates sophisticated understanding of goal systems and their limitations.',
    ],
    strong: [
      'Understanding of goal achievement is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about goal-setting frameworks and measurement. Very complex scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss OKRs, KPIs, and progress tracking meaningfully.',
      'The candidate demonstrates good grasp of goal concepts in typical situations.',
    ],
    capable: [
      'Understanding of goal achievement is functional. The candidate grasps basic concepts but may miss subtler distinctions.',
      'The candidate understands standard goal frameworks. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss goals adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or second-order effects may need support.',
    ],
    developing: [
      'Understanding of goal achievement is below the expected range. The candidate may confuse outputs with outcomes, or misunderstand how goals align with strategy.',
      'The candidate may not distinguish between well-designed and poorly-designed goals.',
      'Performance on goal items suggests the candidate benefits from structured exposure to goal frameworks.',
      'The candidate may reason about goals in ways that miss system-level effects or downstream consequences.',
    ],
    at_risk: [
      'Understanding of goal achievement is a significant constraint. The candidate may hold misconceptions that would lead to poor goal-setting or tracking.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about goal systems.',
      'Performance in this area is well below the expected range. Roles requiring goal framework fluency would present difficulty.',
      'The candidate may set or pursue goals in ways that harm organisational alignment or distort behaviour.',
    ],
    high_risk: [
      'Understanding of goal achievement is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about goal frameworks or tracking.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring goal fluency should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to goal discussions.',
    ],
  },

  'Employee Engagement': {
    exceptional: [
      'Understanding of employee engagement is a clear strength. The candidate grasps what drives discretionary effort, retention, and genuine commitment versus compliance.',
      'The candidate distinguishes between satisfaction, engagement, and motivation, and understands how each is measured and influenced.',
      'Understanding is well above the expected range. The candidate can reason about the conditions that create engagement and the organisational practices that erode it.',
      'The candidate demonstrates sophisticated understanding of engagement drivers and their relationship to performance.',
    ],
    strong: [
      'Understanding of employee engagement is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about engagement drivers. Very complex organisational scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss engagement meaningfully and apply concepts to real situations.',
      'The candidate demonstrates good grasp of engagement concepts in typical situations.',
    ],
    capable: [
      'Understanding of employee engagement is functional. The candidate grasps basic concepts but may miss subtler distinctions.',
      'The candidate understands standard engagement measures. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss engagement adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced drivers or second-order effects may need support.',
    ],
    developing: [
      'Understanding of employee engagement is below the expected range. The candidate may conflate engagement with satisfaction or morale.',
      'The candidate may not distinguish between the drivers of discretionary effort and the conditions that merely prevent disengagement.',
      'Performance on engagement items suggests the candidate benefits from structured exposure to engagement research and practice.',
      'The candidate may reason about engagement in ways that miss team-level or cultural factors.',
    ],
    at_risk: [
      'Understanding of employee engagement is a significant constraint. The candidate may hold misconceptions that would lead to ineffective people decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about engagement drivers.',
      'Performance in this area is well below the expected range. Roles requiring people insight would present difficulty.',
      'The candidate may apply engagement practices in ways that miss the underlying dynamics.',
    ],
    high_risk: [
      'Understanding of employee engagement is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about engagement drivers or measurement.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring people insight should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to engagement discussions.',
    ],
  },

  'Financial & Operational Performance': {
    exceptional: [
      'Understanding of financial and operational performance is a clear strength. The candidate grasps core metrics — margin, cash flow, ROI, liquidity — and how they interact with operational decisions.',
      'The candidate distinguishes between profitability and cash generation, or between growth and returns, and understands why the distinctions matter.',
      'Understanding is well above the expected range. The candidate can reason fluently about the financial implications of operational choices.',
      'The candidate demonstrates sophisticated understanding of financial and operational metrics, their trade-offs, and their limitations.',
    ],
    strong: [
      'Understanding of financial and operational performance is solid. The candidate grasps core metrics and their practical implications.',
      'The candidate reasons well about financial and operational trade-offs. Very complex scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss financial and operational metrics meaningfully.',
      'The candidate demonstrates good grasp of financial concepts in typical situations.',
    ],
    capable: [
      'Understanding of financial and operational performance is functional. The candidate grasps basic metrics but may miss subtler interactions.',
      'The candidate understands standard financial measures. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss financial and operational performance adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or second-order effects may need support.',
    ],
    developing: [
      'Understanding of financial and operational performance is below the expected range. The candidate may confuse revenue with profit, or miss cash-flow dynamics.',
      'The candidate may not distinguish between short-term metrics and sustainable financial health.',
      'Performance on financial items suggests the candidate benefits from structured exposure to financial and operational concepts.',
      'The candidate may reason about performance in ways that miss balance-sheet or cash-flow implications.',
    ],
    at_risk: [
      'Understanding of financial and operational performance is a significant constraint. The candidate may hold misconceptions that would lead to poor financial decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about financial trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring financial judgment would present difficulty.',
      'The candidate may pursue operational metrics in ways that harm financial health due to limited understanding.',
    ],
    high_risk: [
      'Understanding of financial and operational performance is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about financial metrics or trade-offs.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring financial judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to financial discussions.',
    ],
  },

  // ----- GENERAL ASSESSMENT -----
  'Cognitive Ability': {
    exceptional: [
      'Overall cognitive performance is a clear strength. The candidate reasons quickly and accurately across verbal, numerical, and abstract material, and sustains mental effort on demanding problems.',
      'The candidate handles complex reasoning across multiple domains with confidence. Accuracy holds under time pressure and increased difficulty.',
      'Cognitive ability is well above the expected range. The candidate grasps unfamiliar concepts quickly and reasons reliably from limited information.',
      'Combined cognitive performance is strong across all sections. The candidate is likely to learn new material quickly and reason defensibly under pressure.',
    ],
    strong: [
      'Overall cognitive performance is solid and reliable. The candidate reasons well across most domains and handles typical complexity without difficulty.',
      'The candidate performs strongly across the cognitive sections. Very demanding or unfamiliar problems may occasionally slow the pace but rarely affect accuracy.',
      'Cognitive ability is above average. The candidate reasons confidently and makes few errors on standard tasks.',
      'Combined cognitive performance is dependable. Learning and reasoning are effective across a range of material.',
    ],
    capable: [
      'Overall cognitive performance is functional. The candidate handles standard reasoning tasks adequately but may slow under complexity or time pressure.',
      'The candidate reasons correctly on typical problems across domains. Demanding or unfamiliar material may reveal gaps.',
      'Cognitive ability is at the expected baseline. The candidate reaches correct conclusions on most tasks but may not be quick on harder items.',
      'Combined cognitive performance is acceptable. Some domains are stronger than others; overall reasoning is sound without being exceptional.',
    ],
    developing: [
      'Overall cognitive performance is below the expected range. The candidate handles simpler reasoning tasks but struggles with complex or unfamiliar material.',
      'The candidate finds multi-domain reasoning effortful. Accuracy drops where problems require inference, pattern recognition, or multi-step logic.',
      'Cognitive ability is below the expected baseline. The candidate benefits from structure, worked examples, and additional time.',
      'Combined cognitive performance suggests the candidate will need support on demanding reasoning work.',
    ],
    at_risk: [
      'Overall cognitive performance is a significant constraint. The candidate struggles across multiple reasoning domains, not just one.',
      'Combined cognitive ability is well below the expected range. Complex problem solving is likely to be unreliable.',
      'Performance across the cognitive sections indicates a sustained difficulty with reasoning under demand.',
      'The candidate is unlikely to reason reliably on complex or unfamiliar problems without significant support.',
    ],
    high_risk: [
      'Overall cognitive performance is severely limited. Even routine reasoning tasks may require support.',
      'The candidate shows marked difficulty across the cognitive sections. Accurate reasoning on unfamiliar material is unlikely.',
      'Combined cognitive ability is in the lowest range observed on this assessment. Roles requiring autonomous reasoning should be reconsidered.',
      'Significant scaffolding is required. Cognitive work should be structured, bounded, and reviewed.',
    ],
  },

  'Cultural & Attitudinal Fit': {
    exceptional: [
      'Overall cultural and attitudinal fit is a clear strength. The candidate aligns with stated values, adapts well across cultural contexts, and demonstrates sustained engagement and citizenship.',
      'The candidate is genuinely additive to organisational culture. Values, adaptability, and attitudinal markers all point in the same direction.',
      'Fit is well above the expected range across all cultural sections. The candidate is likely to strengthen team culture wherever placed.',
      'Combined cultural and attitudinal performance indicates the candidate will integrate and contribute positively from the outset.',
    ],
    strong: [
      'Overall cultural and attitudinal fit is solid and dependable. The candidate aligns with most cultural expectations and demonstrates good engagement.',
      'The candidate fits well across the cultural sections. Extreme or unusual cultural contexts may take adjustment, but the pattern is reliable.',
      'Cultural fit is above average. Values, adaptability, and attitudinal signals are consistently positive.',
      'Combined cultural performance is dependable. The candidate is likely to integrate smoothly and contribute to team culture.',
    ],
    capable: [
      'Overall cultural and attitudinal fit is functional. The candidate aligns with cultural expectations in typical situations but may drift under pressure or in unfamiliar contexts.',
      'The candidate fits adequately across the cultural sections. Some areas are stronger than others; overall alignment is acceptable.',
      'Cultural fit is at the expected baseline. The candidate is likely to settle into the organisation without major friction.',
      'Combined cultural performance is acceptable. Engagement and alignment are present but not consistently distinctive.',
    ],
    developing: [
      'Overall cultural and attitudinal fit is below the expected range. The candidate may struggle with values alignment, cultural adaptation, or sustained engagement in some contexts.',
      'The candidate shows inconsistent cultural alignment across the sections. Some areas may create friction with team or organisational norms.',
      'Cultural fit is below the expected baseline. The candidate benefits from explicit cultural framing and structured integration.',
      'Combined cultural performance suggests some risk to team cohesion or cultural alignment if not managed.',
    ],
    at_risk: [
      'Overall cultural and attitudinal fit is a significant constraint. The candidate may struggle across multiple cultural sections, not just one.',
      'Combined cultural ability is well below the expected range. Alignment with organisational culture is likely to be inconsistent.',
      'Performance across the cultural sections indicates a sustained difficulty with cultural fit or engagement.',
      'The candidate may create friction with team culture or struggle to sustain engagement without significant support.',
    ],
    high_risk: [
      'Overall cultural and attitudinal fit is severely limited. Even routine cultural interactions may create friction.',
      'The candidate shows marked difficulty across the cultural sections. Alignment with organisational culture is unlikely.',
      'Combined cultural ability is in the lowest range observed on this assessment. Cultural fit should be a serious consideration.',
      'Significant scaffolding is required. The candidate is unlikely to integrate culturally without close support.',
    ],
  },

  'Emotional Intelligence': {
    exceptional: [
      'Emotional intelligence is a clear strength. The candidate reads emotions accurately in themselves and others, and responds in ways that defuse rather than escalate tension.',
      'The candidate manages their own emotional responses under pressure and adjusts approach based on what others are feeling.',
      'Emotional intelligence is well above the expected range. The candidate is trusted with sensitive interpersonal situations and handles them with composure.',
      'The candidate is genuinely emotionally aware. Emotional information is used constructively in decisions and interactions.',
    ],
    strong: [
      'Emotional intelligence is solid and reliable. The candidate reads most interpersonal situations accurately and responds appropriately.',
      'The candidate manages their own emotions well and is generally attuned to others. Very high-pressure situations may test this, but the pattern holds.',
      'Emotional intelligence is above average. The candidate is aware of emotional dynamics and responds constructively.',
      'The candidate demonstrates good emotional awareness in typical situations. Interactions are generally well-judged.',
    ],
    capable: [
      'Emotional intelligence is functional. The candidate handles routine interpersonal situations adequately but may miss subtler emotional signals.',
      'The candidate manages standard emotional demands. High-pressure or emotionally charged situations may reveal gaps.',
      'Emotional intelligence is at the expected baseline. The candidate is reasonably aware but may not read others consistently.',
      'The candidate handles typical situations well. Complex emotional dynamics may need additional thought.',
    ],
    developing: [
      'Emotional intelligence is below the expected range. The candidate may miss emotional signals or respond in ways that escalate tension.',
      'The candidate may struggle to manage their own reactions under pressure, or misread what others are feeling.',
      'Performance on emotional intelligence items suggests the candidate benefits from structured feedback and coaching on interpersonal dynamics.',
      'The candidate may not recognise the emotional impact of their own behaviour on others.',
    ],
    at_risk: [
      'Emotional intelligence is a significant constraint. The candidate may misread emotional situations or respond in ways that damage relationships.',
      'Self-regulation or awareness of others is limited. Interactions under pressure are likely to create friction.',
      'Performance in this area is well below the expected range. Roles requiring emotional attunement would present difficulty.',
      'The candidate may escalate tension rather than defuse it, or fail to recognise emotional impact.',
    ],
    high_risk: [
      'Emotional intelligence is severely limited. Even routine interpersonal situations may create friction.',
      'The candidate shows marked difficulty reading or responding to emotions in themselves or others.',
      'Emotional intelligence is in the lowest range observed on this assessment. Interpersonal-heavy roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to navigate emotionally charged situations without close support.',
    ],
  },

  'Ethics & Integrity': {
    exceptional: [
      'Ethics and integrity are a clear strength. The candidate maintains standards under pressure, states uncomfortable truths, and is transparent when it would be easier not to be.',
      'The candidate\u2019s actions align with stated principles even when the cost is real. Consistency between word and deed is a defining feature.',
      'Ethics and integrity are well above the expected range. The candidate raises concerns proactively and proportionately, without grandstanding.',
      'The candidate is trusted with sensitive matters. Transparency and directness are maintained under conditions where others might compromise.',
    ],
    strong: [
      'Ethics and integrity are solid and dependable. The candidate maintains standards under normal pressure and is generally transparent.',
      'The candidate behaves consistently with stated principles. Extreme pressure or high personal cost may test this, but the pattern is reliable.',
      'Ethics and integrity are above average. The candidate is honest and direct without being needlessly harsh.',
      'The candidate demonstrates good ethical behaviour in typical situations. Disclosure happens as expected.',
    ],
    capable: [
      'Ethics and integrity are functional. The candidate maintains standards in routine situations but may soften or delay disclosure when stakes are high.',
      'The candidate generally behaves consistently with stated principles. Under significant pressure, transparency may waver.',
      'Ethics and integrity are at the expected baseline. The candidate is honest in ordinary matters but may weigh consequences more heavily than principle at the margins.',
      'The candidate handles standard ethical situations adequately. High-cost situations may require support.',
    ],
    developing: [
      'Ethics and integrity are below the expected range. The candidate may soften truths, delay disclosure, or rationalise small compromises when under pressure.',
      'Standards may bend under pressure in ways the candidate does not fully acknowledge. Consistency is inconsistent.',
      'Performance on ethics items suggests the candidate benefits from clear expectations and explicit ethical frameworks.',
      'The candidate may avoid uncomfortable disclosures or allow situational factors to override stated principles.',
    ],
    at_risk: [
      'Ethics and integrity are a significant constraint. The candidate may compromise standards under pressure, withhold information, or rationalise conduct in ways that affect trust.',
      'Transparency is inconsistent. What is stated and what is done may diverge under pressure.',
      'Performance in this area is well below the expected range. Roles requiring ethical reliability would present difficulty.',
      'The candidate struggles to maintain principles when the cost is real. Trust is likely to be affected.',
    ],
    high_risk: [
      'Ethics and integrity are severely limited. Even routine situations may produce compromises or omissions that would not be expected.',
      'The candidate shows marked difficulty maintaining standards. Ethical behaviour may be contingent on convenience or visibility.',
      'Ethics and integrity are in the lowest range observed on this assessment. Roles requiring ethical reliability should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to maintain standards without close oversight and explicit consequence.',
    ],
  },

  'Leadership & Management': {
    exceptional: [
      'Leadership and management are a clear strength. The candidate sets direction clearly, develops people deliberately, and holds teams accountable without needing to dominate.',
      'The candidate is trusted with teams. Decisions are made with reference to both task and people, and standards are maintained without friction.',
      'Leadership and management are well above the expected range. The candidate builds capability in others while maintaining performance.',
      'The candidate demonstrates mature leadership. Difficult decisions are made and communicated effectively; people are developed rather than merely directed.',
    ],
    strong: [
      'Leadership and management are solid and dependable. The candidate sets direction appropriately and holds people accountable.',
      'The candidate leads effectively in typical situations. Very complex team dynamics may occasionally require adjustment, but the pattern is reliable.',
      'Leadership and management are above average. The candidate balances task focus with people focus reasonably well.',
      'The candidate demonstrates good leadership in normal circumstances. Teams are directed and supported effectively.',
    ],
    capable: [
      'Leadership and management are functional. The candidate handles routine leadership tasks adequately but may struggle with complex team dynamics or difficult people issues.',
      'The candidate manages standard leadership demands. High-stakes or politically sensitive situations may reveal gaps.',
      'Leadership and management are at the expected baseline. The candidate can direct work and hold people accountable at a basic level.',
      'The candidate handles typical situations well. Developing others or managing underperformance may need support.',
    ],
    developing: [
      'Leadership and management are below the expected range. The candidate may avoid difficult conversations, fail to set direction, or struggle to hold people accountable.',
      'The candidate finds team leadership effortful. People issues may be mishandled or avoided.',
      'Performance on leadership items suggests the candidate benefits from structured frameworks and coaching on management practice.',
      'The candidate may focus on task delivery at the expense of team development or accountability.',
    ],
    at_risk: [
      'Leadership and management are a significant constraint. The candidate may struggle to lead teams, avoid accountability conversations, or fail to develop others.',
      'Team performance is likely to suffer without support. Direction may be unclear or inconsistently applied.',
      'Performance in this area is well below the expected range. Roles requiring team leadership would present difficulty.',
      'The candidate may create tension or leave performance issues unaddressed in ways that affect team health.',
    ],
    high_risk: [
      'Leadership and management are severely limited. Even routine team leadership may create issues.',
      'The candidate shows marked difficulty setting direction or holding people accountable.',
      'Leadership and management are in the lowest range observed on this assessment. Team leadership roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to lead effectively without close support and structured practice.',
    ],
  },

  'Performance Metrics': {
    exceptional: [
      'Understanding of performance metrics is a clear strength. The candidate grasps how individual, team, and organisational performance is measured, and why metric choice shapes behaviour.',
      'The candidate distinguishes between leading and lagging indicators, and understands when each is appropriate.',
      'Understanding is well above the expected range. The candidate can reason about how metrics interact, where they distort, and how to select measures that drive the right outcomes.',
      'The candidate demonstrates sophisticated understanding of measurement systems and their limitations.',
    ],
    strong: [
      'Understanding of performance metrics is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about measurement and indicators. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss performance measures meaningfully and apply concepts to real situations.',
      'The candidate demonstrates good grasp of metrics concepts in typical situations.',
    ],
    capable: [
      'Understanding of performance metrics is functional. The candidate grasps basic concepts but may miss subtler distinctions.',
      'The candidate understands standard performance measures. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss metrics adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or distortion effects may need support.',
    ],
    developing: [
      'Understanding of performance metrics is below the expected range. The candidate may confuse activity measures with outcome measures, or miss how metrics shape behaviour.',
      'The candidate may not distinguish between leading and lagging indicators.',
      'Performance on metrics items suggests the candidate benefits from structured exposure to measurement concepts.',
      'The candidate may reason about performance in ways that miss system-level effects or unintended consequences.',
    ],
    at_risk: [
      'Understanding of performance metrics is a significant constraint. The candidate may hold misconceptions that would lead to poor measurement choices.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about metric design or interpretation.',
      'Performance in this area is well below the expected range. Roles requiring measurement judgment would present difficulty.',
      'The candidate may select or interpret metrics in ways that misdirect effort or distort behaviour.',
    ],
    high_risk: [
      'Understanding of performance metrics is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about measurement or indicators.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring metric fluency should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to measurement discussions.',
    ],
  },

  'Personality & Behavioral': {
    exceptional: [
      'Personality and behavioral profile is a clear strength. Preferences and behavioural patterns are well-suited to professional environments, and the candidate adapts style to context without losing consistency.',
      'The candidate\u2019s behavioural tendencies support effective work — reliability, collaboration, and appropriate assertiveness are all present.',
      'Profile is well above the expected range. The candidate demonstrates self-awareness about behavioural preferences and adjusts where needed.',
      'The candidate\u2019s natural style is additive to most teams. Behavioural consistency makes them predictable and easy to work with.',
    ],
    strong: [
      'Personality and behavioral profile is solid. The candidate\u2019s tendencies support effective performance in most roles.',
      'The candidate demonstrates a balanced behavioural profile. Some contexts may suit them less well, but the pattern is generally positive.',
      'Profile is above average. Behavioural preferences are compatible with professional demands.',
      'The candidate demonstrates good behavioural fit in typical situations. Style is consistent and appropriate.',
    ],
    capable: [
      'Personality and behavioral profile is functional. The candidate\u2019s tendencies are adequate for standard professional contexts but may create friction in some roles.',
      'The candidate manages behavioural demands adequately. Very specific role requirements may reveal mismatches.',
      'Profile is at the expected baseline. The candidate is workable in most settings without being distinctive.',
      'The candidate handles typical behavioural demands well. Contexts requiring different preferences may need adjustment.',
    ],
    developing: [
      'Personality and behavioral profile is below the expected range in some dimensions. The candidate\u2019s tendencies may create friction in specific role contexts.',
      'The candidate may find certain professional demands effortful given their behavioural preferences.',
      'Performance on personality items suggests the candidate benefits from roles aligned with their natural style, or from explicit support on areas of tension.',
      'Some behavioural patterns may need conscious management in professional settings.',
    ],
    at_risk: [
      'Personality and behavioral profile is a significant constraint. The candidate\u2019s tendencies may create friction across multiple role contexts.',
      'Behavioural preferences appear misaligned with typical professional demands.',
      'Performance in this area is well below the expected range. Role fit should be carefully considered.',
      'The candidate may struggle in environments that require behavioural flexibility outside their natural preferences.',
    ],
    high_risk: [
      'Personality and behavioral profile is severely limited. Behavioural tendencies are likely to create friction in most professional settings.',
      'The candidate shows marked difficulty adapting behavioural style to context.',
      'Profile is in the lowest range observed on this assessment. Role fit should be a serious consideration.',
      'Significant support is required. The candidate is unlikely to succeed in roles requiring behavioural adaptation without close coaching.',
    ],
  },

  'Problem-Solving': {
    exceptional: [
      'Problem-solving is a clear strength. The candidate diagnoses problems systematically, generates multiple options, and reaches workable solutions efficiently.',
      'The candidate distinguishes between symptoms and root causes and addresses the underlying issue rather than the visible one.',
      'Problem-solving is well above the expected range. The candidate handles novel and complex problems without needing worked examples.',
      'The candidate demonstrates sophisticated problem-solving. Options are weighed rigorously and solutions are implemented with follow-through.',
    ],
    strong: [
      'Problem-solving is solid and reliable. The candidate diagnoses most problems effectively and reaches sound solutions.',
      'The candidate works through problems methodically. Very complex or novel problems may occasionally slow the pace, but the pattern holds.',
      'Problem-solving is above average. The candidate identifies causes accurately and generates practical options.',
      'The candidate demonstrates good problem-solving in typical situations. Solutions are effective and well-reasoned.',
    ],
    capable: [
      'Problem-solving is functional. The candidate handles routine problems adequately but may struggle with complex or novel ones.',
      'The candidate reaches acceptable solutions. Difficult or ambiguous problems may reveal gaps in diagnosis or option generation.',
      'Problem-solving is at the expected baseline. The candidate solves standard problems correctly but may not be systematic.',
      'The candidate handles typical situations well. Complex root-cause analysis may need support.',
    ],
    developing: [
      'Problem-solving is below the expected range. The candidate may treat symptoms rather than causes, or struggle to generate multiple options.',
      'The candidate finds novel or complex problems effortful. Solutions may be superficial or premature.',
      'Performance on problem-solving items suggests the candidate benefits from structured frameworks and worked examples.',
      'The candidate may jump to solutions before adequately diagnosing the problem.',
    ],
    at_risk: [
      'Problem-solving is a significant constraint. The candidate may reach poor solutions, address the wrong problem, or avoid solving altogether.',
      'Diagnosis is limited. Complex problems are likely to be mishandled or escalated without adequate analysis.',
      'Performance in this area is well below the expected range. Roles requiring independent problem-solving would present difficulty.',
      'The candidate may create new problems through poorly conceived solutions.',
    ],
    high_risk: [
      'Problem-solving is severely limited. Even routine problems may not be resolved effectively.',
      'The candidate shows marked difficulty diagnosing or addressing problems.',
      'Problem-solving is in the lowest range observed on this assessment. Roles requiring independent problem-solving should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to solve problems without close support and structured frameworks.',
    ],
  },

  'Technical & Manufacturing': {
    exceptional: [
      'Understanding of technical and manufacturing concepts is a clear strength. The candidate grasps relevant systems, processes, and constraints, and can apply this understanding to practical decisions.',
      'The candidate reasons fluently about technical trade-offs, failure modes, and how manufacturing environments behave under different conditions.',
      'Understanding is well above the expected range. The candidate moves easily between technical detail and operational consequence.',
      'The candidate demonstrates sophisticated technical understanding, including where systems interact and where interventions are likely to fail.',
    ],
    strong: [
      'Understanding of technical and manufacturing concepts is solid. The candidate grasps core principles and applies them effectively.',
      'The candidate reasons well about technical decisions. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss technical topics meaningfully and apply concepts to practical situations.',
      'The candidate demonstrates good technical grasp in typical situations.',
    ],
    capable: [
      'Understanding of technical and manufacturing concepts is functional. The candidate grasps basics but may miss subtler interactions.',
      'The candidate understands standard technical concepts. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss technical topics adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or second-order effects may need support.',
    ],
    developing: [
      'Understanding of technical and manufacturing concepts is below the expected range. The candidate may grasp terminology without understanding underlying principles.',
      'The candidate may miss interactions between systems or fail to anticipate downstream consequences.',
      'Performance on technical items suggests the candidate benefits from structured exposure to concepts and worked examples.',
      'The candidate may reason about technical matters in ways that miss operational implications.',
    ],
    at_risk: [
      'Understanding of technical and manufacturing concepts is a significant constraint. The candidate may hold misconceptions that would lead to poor technical decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about technical trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring technical judgment would present difficulty.',
      'The candidate may make unsafe or inefficient technical choices due to limited understanding.',
    ],
    high_risk: [
      'Understanding of technical and manufacturing concepts is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about technical matters.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring technical judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to technical discussions.',
    ],
  },

  // ----- LEADERSHIP -----
  'People Management': {
    exceptional: [
      'People management is a clear strength. The candidate sets clear expectations, develops capability deliberately, and holds people accountable without friction.',
      'The candidate builds strong teams. Performance is managed directly and fairly, and difficult conversations are held early rather than deferred.',
      'People management is well above the expected range. The candidate invests in individual development and adjusts approach to what each person needs.',
      'The candidate is genuinely trusted by their teams. Standards are high but support is visible, and people grow under their management.',
    ],
    strong: [
      'People management is solid and dependable. The candidate manages people effectively and maintains appropriate standards.',
      'The candidate sets expectations clearly and addresses performance when needed. Very difficult or sensitive situations may occasionally require support.',
      'People management is above average. The candidate develops people reasonably well and manages team performance effectively.',
      'The candidate demonstrates good people management in typical situations. Teams are directed and supported.',
    ],
    capable: [
      'People management is functional. The candidate manages routine expectations adequately but may struggle with difficult performance conversations or individual development.',
      'The candidate handles standard people management demands. Complex or sensitive situations may reveal gaps.',
      'People management is at the expected baseline. The candidate directs work and manages people at a basic level.',
      'The candidate handles typical situations adequately. Development of others or managing underperformance may need support.',
    ],
    developing: [
      'People management is below the expected range. The candidate may avoid difficult conversations, fail to set clear expectations, or struggle to develop others.',
      'The candidate finds people management effortful. Performance issues may be left unaddressed or handled poorly.',
      'Performance on people management items suggests the candidate benefits from structured frameworks and coaching on management practice.',
      'The candidate may focus on task delivery at the expense of managing the people doing the work.',
    ],
    at_risk: [
      'People management is a significant constraint. The candidate may struggle to lead teams, avoid accountability conversations, or fail to develop others.',
      'Team performance is likely to suffer without support. Direction may be unclear or performance issues left unaddressed.',
      'Performance in this area is well below the expected range. Roles requiring people management would present difficulty.',
      'The candidate may create tension or leave performance issues unaddressed in ways that affect team health.',
    ],
    high_risk: [
      'People management is severely limited. Even routine team leadership may create issues.',
      'The candidate shows marked difficulty setting expectations or holding people accountable.',
      'People management is in the lowest range observed on this assessment. People leadership roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to manage people effectively without close support and structured practice.',
    ],
  },

  'Strategic Thinking': {
    exceptional: [
      'Strategic thinking is a clear strength. The candidate reasons fluently about long-term direction, competitive context, and the trade-offs that shape strategy.',
      'The candidate distinguishes between urgent and important, and consistently frames decisions with reference to longer-term consequences.',
      'Strategic thinking is well above the expected range. The candidate sees patterns across markets, functions, and time horizons that others miss.',
      'The candidate demonstrates sophisticated strategic judgment. Options are weighed against multiple futures, and priorities are set with clear rationale.',
    ],
    strong: [
      'Strategic thinking is solid and reliable. The candidate reasons well about direction and trade-offs at the organisational level.',
      'The candidate frames decisions with an appropriate time horizon. Very complex or highly ambiguous strategic questions may occasionally warrant input, but the pattern is dependable.',
      'Strategic thinking is above average. The candidate thinks beyond immediate execution and considers wider implications.',
      'The candidate demonstrates good strategic judgment in typical situations. Long-term consequences are considered.',
    ],
    capable: [
      'Strategic thinking is functional. The candidate handles routine strategic questions adequately but may default to operational framing under pressure.',
      'The candidate manages standard strategic demands. Highly complex or novel strategic questions may reveal gaps.',
      'Strategic thinking is at the expected baseline. The candidate considers longer-term consequences when prompted.',
      'The candidate handles typical situations well. Strategic depth may be inconsistent across contexts.',
    ],
    developing: [
      'Strategic thinking is below the expected range. The candidate may focus on execution without adequately considering longer-term direction or trade-offs.',
      'The candidate finds ambiguous strategic questions effortful. Framing may stay operational rather than strategic.',
      'Performance on strategic items suggests the candidate benefits from structured frameworks and exposure to strategic contexts.',
      'The candidate may make decisions that look reasonable in the short term but create problems over time.',
    ],
    at_risk: [
      'Strategic thinking is a significant constraint. The candidate may fail to consider longer-term consequences, miss competitive context, or default to operational reasoning.',
      'Strategic questions are likely to be mishandled or avoided. Direction-setting may be absent or reactive.',
      'Performance in this area is well below the expected range. Roles requiring strategic judgment would present difficulty.',
      'The candidate may make decisions that create strategic risk through limited foresight or narrow framing.',
    ],
    high_risk: [
      'Strategic thinking is severely limited. Even routine strategic questions may not be addressed effectively.',
      'The candidate shows marked difficulty reasoning about direction, trade-offs, or long-term consequences.',
      'Strategic thinking is in the lowest range observed on this assessment. Strategy roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to contribute to strategic discussions without close support and structured frameworks.',
    ],
  },

  // ----- MANUFACTURING TECHNICAL -----
  'CIP & Maintenance': {
    exceptional: [
      'Understanding of CIP and maintenance is a clear strength. The candidate grasps cleaning-in-place systems, preventative maintenance practices, and how both affect product safety and line availability.',
      'The candidate reasons fluently about CIP parameters, maintenance scheduling, and the trade-offs between uptime and risk.',
      'Understanding is well above the expected range. The candidate recognises failure modes, can reason about optimal maintenance intervals, and understands the compliance context.',
      'The candidate demonstrates sophisticated practical knowledge — including where CIP and maintenance interact with production, quality, and safety.',
    ],
    strong: [
      'Understanding of CIP and maintenance is solid. The candidate grasps core practices and their operational implications.',
      'The candidate reasons well about maintenance and cleaning systems. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss CIP and maintenance meaningfully and apply concepts in practice.',
      'The candidate demonstrates good practical grasp in typical situations.',
    ],
    capable: [
      'Understanding of CIP and maintenance is functional. The candidate grasps standard practices but may miss subtler interactions or failure modes.',
      'The candidate understands routine CIP and maintenance activities. Complex or non-standard situations may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss CIP and maintenance adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or system interactions may need support.',
    ],
    developing: [
      'Understanding of CIP and maintenance is below the expected range. The candidate may grasp terminology without understanding why practices exist or how they interact.',
      'The candidate may miss failure modes, contamination risks, or the trade-offs between maintenance frequency and line availability.',
      'Performance on CIP and maintenance items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about these areas in ways that miss compliance or quality implications.',
    ],
    at_risk: [
      'Understanding of CIP and maintenance is a significant constraint. The candidate may hold misconceptions that would lead to unsafe or non-compliant decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about CIP parameters or maintenance strategy.',
      'Performance in this area is well below the expected range. Roles requiring practical judgment in CIP or maintenance would present difficulty.',
      'The candidate may make choices that put product safety, compliance, or equipment reliability at risk.',
    ],
    high_risk: [
      'Understanding of CIP and maintenance is severely limited. Even basic practices may be misunderstood.',
      'The candidate shows marked difficulty reasoning about cleaning systems or maintenance.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring CIP or maintenance judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully in these areas.',
    ],
  },

  'Conveyors & Line Efficiency': {
    exceptional: [
      'Understanding of conveyors and line efficiency is a clear strength. The candidate grasps how conveyor systems work, where throughput is constrained, and how stability and downtime are managed.',
      'The candidate reasons fluently about line balancing, accumulation, and the trade-offs between speed and reliability.',
      'Understanding is well above the expected range. The candidate can diagnose line inefficiencies and identify where interventions will have the most impact.',
      'The candidate demonstrates sophisticated practical knowledge — including where conveyor behaviour interacts with upstream and downstream operations.',
    ],
    strong: [
      'Understanding of conveyors and line efficiency is solid. The candidate grasps core principles and their practical implications.',
      'The candidate reasons well about throughput and stability. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss line efficiency meaningfully and apply concepts in practice.',
      'The candidate demonstrates good practical grasp in typical situations.',
    ],
    capable: [
      'Understanding of conveyors and line efficiency is functional. The candidate grasps standard concepts but may miss subtler interactions.',
      'The candidate understands routine line dynamics. Complex or non-standard situations may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss conveyors and line efficiency adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or system interactions may need support.',
    ],
    developing: [
      'Understanding of conveyors and line efficiency is below the expected range. The candidate may grasp components without understanding how they interact or affect throughput.',
      'The candidate may miss accumulation issues, jams, or the relationship between line speed and stability.',
      'Performance on line efficiency items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about line performance in ways that miss systemic effects.',
    ],
    at_risk: [
      'Understanding of conveyors and line efficiency is a significant constraint. The candidate may hold misconceptions that would lead to poor operational decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to diagnose line inefficiencies or identify effective interventions.',
      'Performance in this area is well below the expected range. Roles requiring line judgment would present difficulty.',
      'The candidate may make changes that reduce throughput or stability rather than improve them.',
    ],
    high_risk: [
      'Understanding of conveyors and line efficiency is severely limited. Even basic principles may be misunderstood.',
      'The candidate shows marked difficulty reasoning about line dynamics.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring line judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to line efficiency discussions.',
    ],
  },

  'Filling & Bottling': {
    exceptional: [
      'Understanding of filling and bottling is a clear strength. The candidate grasps the parameters that govern fill accuracy, changeover discipline, and product quality at the filler.',
      'The candidate reasons fluently about fill heights, foam, temperature effects, and how these interact with downstream quality.',
      'Understanding is well above the expected range. The candidate can diagnose filler problems and identify where interventions have the most impact.',
      'The candidate demonstrates sophisticated practical knowledge — including where filler performance interacts with packaging, quality, and compliance.',
    ],
    strong: [
      'Understanding of filling and bottling is solid. The candidate grasps core parameters and their operational implications.',
      'The candidate reasons well about fill quality and changeovers. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss filling operations meaningfully and apply concepts in practice.',
      'The candidate demonstrates good practical grasp in typical situations.',
    ],
    capable: [
      'Understanding of filling and bottling is functional. The candidate grasps standard parameters but may miss subtler interactions.',
      'The candidate understands routine filling operations. Complex or non-standard situations may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss filling and bottling adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or system interactions may need support.',
    ],
    developing: [
      'Understanding of filling and bottling is below the expected range. The candidate may grasp components without understanding how parameters interact or affect quality.',
      'The candidate may miss changeover issues, fill height variation, or the effect of product characteristics on filler behaviour.',
      'Performance on filling items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about filling operations in ways that miss quality or efficiency implications.',
    ],
    at_risk: [
      'Understanding of filling and bottling is a significant constraint. The candidate may hold misconceptions that would lead to poor operational decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to diagnose filler problems or identify effective interventions.',
      'Performance in this area is well below the expected range. Roles requiring filling judgment would present difficulty.',
      'The candidate may make changes that reduce fill quality or increase waste.',
    ],
    high_risk: [
      'Understanding of filling and bottling is severely limited. Even basic parameters may be misunderstood.',
      'The candidate shows marked difficulty reasoning about filling operations.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring filling judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to filling operations.',
    ],
  },

  'Packaging & Labeling': {
    exceptional: [
      'Understanding of packaging and labeling is a clear strength. The candidate grasps packaging processes, labeling accuracy requirements, and how both affect downstream quality and compliance.',
      'The candidate reasons fluently about packaging line speed, material handling, and the relationship between labeling accuracy and product safety or regulatory compliance.',
      'Understanding is well above the expected range. The candidate can diagnose packaging problems and identify where interventions have the most impact.',
      'The candidate demonstrates sophisticated practical knowledge — including where packaging and labeling interact with quality systems, traceability, and customer requirements.',
    ],
    strong: [
      'Understanding of packaging and labeling is solid. The candidate grasps core processes and their operational implications.',
      'The candidate reasons well about packaging quality and labeling accuracy. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss packaging and labeling meaningfully and apply concepts in practice.',
      'The candidate demonstrates good practical grasp in typical situations.',
    ],
    capable: [
      'Understanding of packaging and labeling is functional. The candidate grasps standard processes but may miss subtler interactions.',
      'The candidate understands routine packaging operations. Complex or non-standard situations may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss packaging and labeling adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or system interactions may need support.',
    ],
    developing: [
      'Understanding of packaging and labeling is below the expected range. The candidate may grasp components without understanding how they interact or affect compliance.',
      'The candidate may miss labeling accuracy risks, traceability issues, or the effect of packaging changes on downstream operations.',
      'Performance on packaging items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about packaging operations in ways that miss quality or regulatory implications.',
    ],
    at_risk: [
      'Understanding of packaging and labeling is a significant constraint. The candidate may hold misconceptions that would lead to non-compliant or low-quality output.',
      'Conceptual grasp is limited. The candidate is unlikely to diagnose packaging problems or identify effective interventions.',
      'Performance in this area is well below the expected range. Roles requiring packaging or labeling judgment would present difficulty.',
      'The candidate may make changes that compromise labeling accuracy, traceability, or customer requirements.',
    ],
    high_risk: [
      'Understanding of packaging and labeling is severely limited. Even basic processes may be misunderstood.',
      'The candidate shows marked difficulty reasoning about packaging operations or compliance requirements.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring packaging or labeling judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to packaging operations.',
    ],
  },

  'Safety & Efficiency': {
    exceptional: [
      'Understanding of safety and efficiency is a clear strength. The candidate grasps how safety requirements interact with production efficiency, and where the two can be improved together rather than traded off.',
      'The candidate reasons fluently about risk, throughput, and the conditions under which safety shortcuts create long-term cost.',
      'Understanding is well above the expected range. The candidate recognises where efficiency pressures create safety risk and intervenes before problems occur.',
      'The candidate demonstrates sophisticated practical judgment — including where safety and efficiency genuinely conflict and how to balance them.',
    ],
    strong: [
      'Understanding of safety and efficiency is solid. The candidate grasps core principles and their operational implications.',
      'The candidate reasons well about the safety-efficiency trade-off. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss safety and efficiency meaningfully and apply judgment in practice.',
      'The candidate demonstrates good practical grasp in typical situations.',
    ],
    capable: [
      'Understanding of safety and efficiency is functional. The candidate grasps standard principles but may miss subtler interactions.',
      'The candidate understands routine safety and efficiency demands. Complex or ambiguous situations may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss safety and efficiency adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or competing priorities may need support.',
    ],
    developing: [
      'Understanding of safety and efficiency is below the expected range. The candidate may default to one dimension without adequately considering the other.',
      'The candidate may not recognise where efficiency pressure creates safety risk, or where safety measures can be redesigned to improve throughput.',
      'Performance on safety and efficiency items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about safety or efficiency in isolation rather than as an interacting system.',
    ],
    at_risk: [
      'Understanding of safety and efficiency is a significant constraint. The candidate may prioritise one in ways that harm the other, or fail to recognise the trade-off.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about how safety and efficiency interact.',
      'Performance in this area is well below the expected range. Roles requiring this judgment would present difficulty.',
      'The candidate may make choices that either compromise safety or unnecessarily reduce efficiency.',
    ],
    high_risk: [
      'Understanding of safety and efficiency is severely limited. Even basic principles may be misunderstood.',
      'The candidate shows marked difficulty reasoning about safety-efficiency trade-offs.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring this judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to safety and efficiency discussions.',
    ],
  },

  'Water Treatment & Quality': {
    exceptional: [
      'Understanding of water treatment and quality is a clear strength. The candidate grasps treatment processes, quality parameters, and the regulatory context that governs water used in production.',
      'The candidate reasons fluently about treatment stages, water chemistry, and how quality issues propagate downstream.',
      'Understanding is well above the expected range. The candidate can diagnose water quality problems and identify where interventions have the most impact.',
      'The candidate demonstrates sophisticated practical knowledge — including where water treatment interacts with product quality, compliance, and equipment reliability.',
    ],
    strong: [
      'Understanding of water treatment and quality is solid. The candidate grasps core processes and their operational implications.',
      'The candidate reasons well about treatment and quality parameters. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss water treatment meaningfully and apply concepts in practice.',
      'The candidate demonstrates good practical grasp in typical situations.',
    ],
    capable: [
      'Understanding of water treatment and quality is functional. The candidate grasps standard concepts but may miss subtler interactions.',
      'The candidate understands routine treatment operations. Complex or non-standard situations may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss water treatment adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or system interactions may need support.',
    ],
    developing: [
      'Understanding of water treatment and quality is below the expected range. The candidate may grasp stages without understanding how they interact or affect downstream quality.',
      'The candidate may miss contamination risks, chemical dosing issues, or the relationship between water quality and product safety.',
      'Performance on water treatment items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about water treatment in ways that miss compliance or quality implications.',
    ],
    at_risk: [
      'Understanding of water treatment and quality is a significant constraint. The candidate may hold misconceptions that would lead to compliance or product safety issues.',
      'Conceptual grasp is limited. The candidate is unlikely to diagnose water quality problems or identify effective interventions.',
      'Performance in this area is well below the expected range. Roles requiring water treatment judgment would present difficulty.',
      'The candidate may make choices that compromise water quality or regulatory compliance.',
    ],
    high_risk: [
      'Understanding of water treatment and quality is severely limited. Even basic processes may be misunderstood.',
      'The candidate shows marked difficulty reasoning about treatment or quality parameters.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring water treatment judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to water treatment operations.',
    ],
  },

  // ----- PRACTICAL -----
  'Aptitude': {
    exceptional: [
      'General practical aptitude is a clear strength. The candidate learns hands-on technical content quickly and applies it accurately in workshop or plant contexts.',
      'The candidate reasons well about practical problems, picks up new tools and processes easily, and transfers skills across tasks without difficulty.',
      'Aptitude is well above the expected range. The candidate grasps the underlying logic of practical work faster than most peers.',
      'The candidate demonstrates strong applied intelligence — able to reason from principle to practice and adjust approach when conditions change.',
    ],
    strong: [
      'General practical aptitude is solid and dependable. The candidate learns hands-on content effectively and applies it in most situations.',
      'The candidate reasons well about practical work and picks up new tasks with reasonable speed. Very unfamiliar areas may take brief adjustment.',
      'Aptitude is above average. The candidate handles a range of practical demands effectively.',
      'The candidate demonstrates good practical aptitude in typical situations. Learning and application are reliable.',
    ],
    capable: [
      'General practical aptitude is functional. The candidate learns and applies standard practical content adequately but may slow on novel or complex tasks.',
      'The candidate manages routine practical demands. Unfamiliar tooling, materials, or processes may reveal gaps.',
      'Aptitude is at the expected baseline. The candidate handles typical practical work correctly but may need additional time on new content.',
      'The candidate handles standard situations well. Complex or non-standard practical problems may need support.',
    ],
    developing: [
      'General practical aptitude is below the expected range. The candidate may learn practical content slowly or struggle to apply it accurately.',
      'The candidate finds unfamiliar practical work effortful. Errors may be more frequent than expected on hands-on tasks.',
      'Performance on aptitude items suggests the candidate benefits from structured training, repetition, and clear demonstration.',
      'The candidate may need more time than peers to reach working proficiency in practical contexts.',
    ],
    at_risk: [
      'General practical aptitude is a significant constraint. The candidate may struggle to learn or apply hands-on technical content reliably.',
      'Practical work presents notable difficulty. Errors, slow learning, or missed steps are likely without structured support.',
      'Performance in this area is well below the expected range. Roles requiring practical adaptability would present difficulty.',
      'The candidate may need close supervision and repeated training to reach even basic practical proficiency.',
    ],
    high_risk: [
      'General practical aptitude is severely limited. Even routine hands-on tasks may not be completed reliably.',
      'The candidate shows marked difficulty learning or applying practical content.',
      'Aptitude is in the lowest range observed on this assessment. Hands-on technical roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to develop practical proficiency without intensive, structured support.',
    ],
  },

  'Attitude': {
    exceptional: [
      'Workplace attitude in practical settings is a clear strength. The candidate shows sustained reliability, genuine willingness to learn, and positive engagement with hands-on work.',
      'The candidate is trusted on the floor. Instructions are followed, feedback is welcomed, and effort is applied regardless of task appeal.',
      'Attitude is well above the expected range. The candidate brings energy and professionalism to practical work and is a stabilising presence in teams.',
      'The candidate demonstrates genuine craftsmanship and work ethic — pride in work, care with tools, and consistent application.',
    ],
    strong: [
      'Workplace attitude in practical settings is solid and dependable. The candidate is reliable, willing to learn, and engaged with hands-on work.',
      'The candidate demonstrates good attitude on the floor. Minor lapses at the top end, but the pattern is reliable.',
      'Attitude is above average. The candidate applies effort consistently and engages constructively.',
      'The candidate shows positive workplace attitude in typical situations. Trust is built with supervisors and peers.',
    ],
    capable: [
      'Workplace attitude in practical settings is functional. The candidate is reliable on routine tasks but may vary engagement on less appealing work.',
      'The candidate manages standard attitude demands. Sustained effort on unrewarding tasks may need support.',
      'Attitude is at the expected baseline. The candidate is workable on the floor without being distinctive.',
      'The candidate handles typical situations adequately. Engagement may fluctuate with task characteristics.',
    ],
    developing: [
      'Workplace attitude in practical settings is below the expected range. The candidate may show inconsistent reliability or effort contingent on task interest.',
      'The candidate may be less engaged with routine or less rewarding practical work.',
      'Performance on attitude items suggests the candidate benefits from clear expectations, feedback, and visible connection between work and outcomes.',
      'The candidate may need conscious reinforcement to maintain consistent professional standards in hands-on work.',
    ],
    at_risk: [
      'Workplace attitude in practical settings is a significant constraint. The candidate may show poor reliability, low engagement, or inconsistent effort on the floor.',
      'Practical environments with high trust or low supervision are likely to suffer from the candidate\u2019s attitude.',
      'Performance in this area is well below the expected range. Roles requiring consistent workplace discipline would present difficulty.',
      'The candidate may disengage or cut corners in ways that affect output, safety, or team morale.',
    ],
    high_risk: [
      'Workplace attitude in practical settings is severely limited. Even routine attendance, instruction-following, or effort may be unreliable.',
      'The candidate shows marked difficulty maintaining professional standards in hands-on work.',
      'Attitude is in the lowest range observed on this assessment. Practical roles should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to sustain reliable workplace behaviour without close management and frequent reinforcement.',
    ],
  },

  'Safety': {
    exceptional: [
      'Safety understanding and practice is a clear strength. The candidate demonstrates strong hazard awareness, correct PPE and procedure discipline, and safe working habits as second nature.',
      'The candidate identifies risks proactively and intervenes before unsafe conditions escalate. Safety is treated as a personal standard, not a rule to be followed.',
      'Safety is well above the expected range. The candidate models safe behaviour and reinforces it with colleagues.',
      'The candidate demonstrates mature safety judgment — including when production pressure could encourage shortcuts.',
    ],
    strong: [
      'Safety understanding and practice is solid and dependable. The candidate follows procedures, uses PPE correctly, and maintains awareness of hazards.',
      'The candidate demonstrates good safety behaviour. Very novel or unusual hazards may occasionally require input, but the pattern is reliable.',
      'Safety is above average. The candidate is safe on the floor and reliable in routine conditions.',
      'The candidate shows good safety practice in typical situations. Standards are maintained without prompting.',
    ],
    capable: [
      'Safety understanding and practice is functional. The candidate follows standard procedures adequately but may miss subtler hazards or drift under pressure.',
      'The candidate manages routine safety demands. Complex or unfamiliar situations may reveal gaps.',
      'Safety is at the expected baseline. The candidate is safe on routine tasks without being vigilant.',
      'The candidate handles typical situations adequately. High-pressure or novel conditions may require reinforcement.',
    ],
    developing: [
      'Safety understanding and practice is below the expected range. The candidate may miss hazards, take shortcuts, or apply procedures inconsistently.',
      'Safety awareness may lapse under time pressure or in unfamiliar conditions.',
      'Performance on safety items suggests the candidate benefits from structured safety training, reminders, and supervision.',
      'The candidate may need explicit reinforcement of safe working habits and hazard awareness.',
    ],
    at_risk: [
      'Safety understanding and practice is a significant constraint. The candidate may create risk to self and others through missed hazards or shortcuts.',
      'Safety compliance is inconsistent. Supervision is likely to be needed to maintain standards.',
      'Performance in this area is well below the expected range. Roles with significant physical risk should be reconsidered.',
      'The candidate may require close supervision and reinforcement to maintain safe practice.',
    ],
    high_risk: [
      'Safety understanding and practice is severely limited. Even routine tasks may present safety risk.',
      'The candidate shows marked difficulty recognising or responding to hazards.',
      'Safety is in the lowest range observed on this assessment. Roles with meaningful physical risk should not proceed without a formal review.',
      'Significant scaffolding is required. The candidate should not work unsupervised in any role with safety-critical tasking.',
    ],
  },

  'Technical': {
    exceptional: [
      'Practical technical judgment is a clear strength. The candidate selects and uses tools correctly, understands materials and their limits, and recognises problems accurately in hands-on contexts.',
      'The candidate reasons fluently about workshop or plant tasks — choosing the right approach, anticipating issues, and adapting when conditions differ from expectations.',
      'Technical judgment is well above the expected range. The candidate can work independently on complex practical tasks and produce reliable results.',
      'The candidate demonstrates genuine practical competence — including knowing when a task requires escalation versus when to proceed.',
    ],
    strong: [
      'Practical technical judgment is solid and dependable. The candidate handles most hands-on tasks correctly and works with confidence.',
      'The candidate uses tools and materials effectively. Very unfamiliar or complex tasks may occasionally need guidance, but the pattern is reliable.',
      'Technical judgment is above average. The candidate works well in practical environments and reaches sound conclusions.',
      'The candidate demonstrates good practical competence in typical situations.',
    ],
    capable: [
      'Practical technical judgment is functional. The candidate handles routine hands-on tasks adequately but may struggle with unfamiliar or complex work.',
      'The candidate manages standard practical demands. Non-standard problems may reveal gaps in approach or tool selection.',
      'Technical judgment is at the expected baseline. The candidate completes typical tasks correctly with normal supervision.',
      'The candidate handles typical situations well. Novel or complex tasks may need support.',
    ],
    developing: [
      'Practical technical judgment is below the expected range. The candidate may choose incorrect approaches, misuse tools, or misread task requirements.',
      'The candidate finds unfamiliar practical work effortful. Errors may be more frequent than expected.',
      'Performance on technical items suggests the candidate benefits from structured training, demonstration, and supervised practice.',
      'The candidate may need more guidance than peers to complete even routine hands-on tasks reliably.',
    ],
    at_risk: [
      'Practical technical judgment is a significant constraint. The candidate may make errors that affect quality, safety, or equipment.',
      'Hands-on work presents notable difficulty. Close supervision is likely to be needed.',
      'Performance in this area is well below the expected range. Roles requiring independent practical judgment would present difficulty.',
      'The candidate may create risk through incorrect tool use, material choices, or task approaches.',
    ],
    high_risk: [
      'Practical technical judgment is severely limited. Even routine hands-on tasks may not be completed safely or correctly.',
      'The candidate shows marked difficulty reasoning about or executing practical work.',
      'Technical judgment is in the lowest range observed on this assessment. Independent hands-on roles should be reconsidered.',
      'Significant scaffolding is required. The candidate should not work unsupervised on practical tasks until capability is built.',
    ],
  },

  'Troubleshooting': {
    exceptional: [
      'Troubleshooting is a clear strength. The candidate diagnoses faults systematically, reasons from symptom to cause, and identifies corrective action efficiently.',
      'The candidate does not jump to conclusions. Hypotheses are tested, evidence is weighed, and solutions are verified before being declared complete.',
      'Troubleshooting is well above the expected range. The candidate handles unfamiliar faults without prior experience by applying diagnostic reasoning.',
      'The candidate demonstrates sophisticated fault-finding — including where multiple issues interact and where the obvious cause is not the real one.',
    ],
    strong: [
      'Troubleshooting is solid and dependable. The candidate diagnoses most faults effectively and reaches workable solutions.',
      'The candidate works through faults methodically. Very complex or unfamiliar problems may occasionally take longer, but the pattern is reliable.',
      'Troubleshooting is above average. The candidate identifies causes accurately and applies appropriate fixes.',
      'The candidate demonstrates good fault-finding in typical situations. Solutions are effective.',
    ],
    capable: [
      'Troubleshooting is functional. The candidate handles routine faults adequately but may struggle with complex or interacting problems.',
      'The candidate reaches acceptable solutions. Difficult or unfamiliar faults may reveal gaps in diagnosis.',
      'Troubleshooting is at the expected baseline. The candidate resolves standard faults correctly but may not be systematic.',
      'The candidate handles typical situations well. Complex fault chains may need support.',
    ],
    developing: [
      'Troubleshooting is below the expected range. The candidate may jump to solutions, miss underlying causes, or fail to verify fixes.',
      'The candidate finds unfamiliar or complex faults effortful. Superficial diagnosis is likely.',
      'Performance on troubleshooting items suggests the candidate benefits from structured diagnostic frameworks and case practice.',
      'The candidate may address symptoms rather than causes, leading to recurring faults.',
    ],
    at_risk: [
      'Troubleshooting is a significant constraint. The candidate may misdiagnose faults, apply ineffective fixes, or escalate unnecessarily.',
      'Complex or interacting problems are likely to be mishandled.',
      'Performance in this area is well below the expected range. Roles requiring independent fault-finding would present difficulty.',
      'The candidate may leave problems unresolved or create new ones through incorrect interventions.',
    ],
    high_risk: [
      'Troubleshooting is severely limited. Even routine faults may not be resolved effectively.',
      'The candidate shows marked difficulty diagnosing or correcting problems.',
      'Troubleshooting is in the lowest range observed on this assessment. Independent fault-finding roles should be reconsidered.',
      'Significant scaffolding is required. The candidate should not work unsupervised on diagnostic tasking until capability is built.',
    ],
  },

  // ----- TECHNICAL COMPETENCE -----
  'Communication & Teamwork': {
    exceptional: [
      'Communication and teamwork in technical contexts is a clear strength. The candidate conveys technical information clearly to colleagues, listens accurately, and works as a genuine part of the team.',
      'The candidate shares knowledge openly, escalates issues appropriately, and coordinates effectively with others on shared tasks.',
      'Communication and teamwork are well above the expected range. The candidate is trusted in team settings and bridges gaps between technical and non-technical colleagues.',
      'The candidate is a stabilising presence in technical teams — clear, cooperative, and reliable under the pressure of joint work.',
    ],
    strong: [
      'Communication and teamwork in technical contexts are solid and dependable. The candidate communicates clearly and works well with colleagues.',
      'The candidate contributes to team tasks effectively. Very complex or high-pressure team situations may occasionally require adjustment, but the pattern is reliable.',
      'Communication and teamwork are above average. The candidate coordinates well and shares information appropriately.',
      'The candidate demonstrates good communication and teamwork in typical situations. Colleagues find them easy to work with.',
    ],
    capable: [
      'Communication and teamwork in technical contexts are functional. The candidate handles routine interactions adequately but may be less effective under pressure or on complex shared tasks.',
      'The candidate works acceptably in teams. Complex coordination or cross-functional work may reveal gaps.',
      'Communication and teamwork are at the expected baseline. The candidate gets the job done without being distinctive.',
      'The candidate handles typical situations adequately. Escalation or knowledge sharing may be inconsistent.',
    ],
    developing: [
      'Communication and teamwork in technical contexts are below the expected range. The candidate may withhold information, miscommunicate technical details, or work in parallel rather than with others.',
      'The candidate may struggle to coordinate on shared tasks or to escalate issues cleanly.',
      'Performance on communication and teamwork items suggests the candidate benefits from structured briefings, clear roles, and reinforcement of knowledge-sharing expectations.',
      'Handover and shift-change communication may be a particular risk area.',
    ],
    at_risk: [
      'Communication and teamwork in technical contexts are a significant constraint. The candidate may create friction, withhold critical information, or fail to coordinate on shared tasks.',
      'Team coordination is likely to suffer. Safety or quality risks may emerge from communication gaps.',
      'Performance in this area is well below the expected range. Roles requiring close technical teamwork would present difficulty.',
      'The candidate may need structured process and close supervision to work effectively with others.',
    ],
    high_risk: [
      'Communication and teamwork in technical contexts are severely limited. Even routine shared tasks may be disrupted.',
      'The candidate shows marked difficulty communicating technical information or coordinating with colleagues.',
      'Communication and teamwork are in the lowest range observed on this assessment. Team-based technical roles should be reconsidered.',
      'Significant scaffolding is required. The candidate should not work on interdependent tasks without structured communication and close oversight.',
    ],
  },

  'Learning Agility': {
    exceptional: [
      'Learning agility in technical contexts is a clear strength. The candidate picks up new technical content quickly, transfers learning across contexts, and adapts approach when conditions change.',
      'The candidate seeks out unfamiliar technical content and applies it constructively. Learning is applied, not just acquired.',
      'Learning agility is well above the expected range. The candidate absorbs new systems, tools, or processes faster than most peers and uses them effectively.',
      'The candidate demonstrates genuine technical curiosity and adaptability — able to learn under time pressure or in ambiguous conditions.',
    ],
    strong: [
      'Learning agility in technical contexts is solid and dependable. The candidate learns new technical content effectively and applies it to practical work.',
      'The candidate adapts to new tools, systems, or processes with reasonable speed. Very unfamiliar content may take brief adjustment, but the pattern is reliable.',
      'Learning agility is above average. The candidate learns well and applies learning in practice.',
      'The candidate demonstrates good learning agility in typical situations. New content is absorbed and used.',
    ],
    capable: [
      'Learning agility in technical contexts is functional. The candidate learns standard technical content adequately but may slow on novel or complex subjects.',
      'The candidate manages routine learning demands. Unfamiliar systems, tools, or processes may reveal gaps.',
      'Learning agility is at the expected baseline. The candidate learns typical content correctly but may need additional time on new material.',
      'The candidate handles standard situations well. Rapid learning or cross-domain transfer may need support.',
    ],
    developing: [
      'Learning agility in technical contexts is below the expected range. The candidate may learn slowly, struggle to transfer knowledge across contexts, or resist unfamiliar content.',
      'New technical systems or processes may take longer than expected to absorb.',
      'Performance on learning agility items suggests the candidate benefits from structured training, reinforcement, and repeated exposure.',
      'The candidate may need substantial support to keep pace with technical change.',
    ],
    at_risk: [
      'Learning agility in technical contexts is a significant constraint. The candidate may struggle to learn or apply new technical content, limiting adaptability.',
      'Roles with significant technical change or novel systems are likely to present sustained difficulty.',
      'Performance in this area is well below the expected range. Rapid learning demands would present difficulty.',
      'The candidate may need close supervision and structured repetition to build new capability.',
    ],
    high_risk: [
      'Learning agility in technical contexts is severely limited. Even routine technical learning may not be absorbed or applied.',
      'The candidate shows marked difficulty learning new technical content.',
      'Learning agility is in the lowest range observed on this assessment. Roles requiring frequent technical learning should be reconsidered.',
      'Significant scaffolding is required. The candidate is unlikely to keep pace with technical change without intensive, structured support.',
    ],
  },

  'Measurement & Engineering Units': {
    exceptional: [
      'Working with measurement and engineering units is a clear strength. The candidate reads drawings and specifications accurately, converts between units reliably, and reasons about tolerances with confidence.',
      'The candidate notices when measurements are wrong, when units are inconsistent, or when a specification cannot be met as written.',
      'Understanding is well above the expected range. The candidate can reason about measurement error, tolerance stack-ups, and practical fit.',
      'The candidate demonstrates genuine precision — accuracy is maintained even under time pressure or on unfamiliar content.',
    ],
    strong: [
      'Working with measurement and engineering units is solid and dependable. The candidate reads specifications correctly and works with units and tolerances reliably.',
      'The candidate handles most measurement tasks accurately. Very unusual units or complex tolerance interactions may occasionally require checking, but the pattern is reliable.',
      'Understanding is above average. The candidate works with measurement confidently and applies it correctly.',
      'The candidate demonstrates good precision in typical situations.',
    ],
    capable: [
      'Working with measurement and engineering units is functional. The candidate handles standard tasks adequately but may make occasional errors on unusual units or complex tolerances.',
      'The candidate manages routine measurement demands. Non-standard content may reveal gaps.',
      'Understanding is at the expected baseline. The candidate completes typical tasks correctly but may not catch subtle inconsistencies.',
      'The candidate handles standard situations well. Complex or unusual measurement problems may need support.',
    ],
    developing: [
      'Working with measurement and engineering units is below the expected range. The candidate may misread specifications, confuse units, or mishandle tolerances.',
      'Errors may occur on routine tasks, particularly under time pressure.',
      'Performance on measurement items suggests the candidate benefits from structured practice and reference material.',
      'The candidate may need checking of measurement work before it is relied upon.',
    ],
    at_risk: [
      'Working with measurement and engineering units is a significant constraint. The candidate may make errors that affect fit, function, or safety.',
      'Measurement work is likely to require verification by others.',
      'Performance in this area is well below the expected range. Roles requiring precision measurement would present difficulty.',
      'The candidate may create rework or downstream problems through measurement errors.',
    ],
    high_risk: [
      'Working with measurement and engineering units is severely limited. Even routine measurement tasks may produce errors.',
      'The candidate shows marked difficulty reading, converting, or reasoning about measurements.',
      'Measurement is in the lowest range observed on this assessment. Precision-dependent roles should be reconsidered.',
      'Significant scaffolding is required. All measurement work should be independently verified until capability is built.',
    ],
  },

  'Ownership & Integrity': {
    exceptional: [
      'Ownership and integrity are a clear strength. The candidate takes responsibility for equipment, work quality, and outcomes — and reports errors or problems honestly, even when it reflects poorly on them.',
      'The candidate treats tools, machines, and materials with care. Damage or loss is reported promptly, and issues are escalated rather than concealed.',
      'Ownership and integrity are well above the expected range. The candidate is trusted with expensive or critical equipment without close supervision.',
      'The candidate demonstrates genuine professional standards — including when no one is watching.',
    ],
    strong: [
      'Ownership and integrity are solid and dependable. The candidate takes responsibility for their work and reports issues honestly.',
      'The candidate treats equipment and materials with care. Difficult or embarrassing situations may occasionally require support, but the pattern is reliable.',
      'Ownership and integrity are above average. The candidate is trusted with equipment and work areas.',
      'The candidate demonstrates good ownership in typical situations. Reporting is honest and prompt.',
    ],
    capable: [
      'Ownership and integrity are functional. The candidate takes responsibility for routine work but may be slower to report errors or problems when stakes are higher.',
      'The candidate handles standard ownership demands. Difficult disclosures may lag.',
      'Ownership and integrity are at the expected baseline. The candidate is reliable on ordinary tasks.',
      'The candidate handles typical situations adequately. High-consequence mistakes may be harder to disclose.',
    ],
    developing: [
      'Ownership and integrity are below the expected range. The candidate may delay reporting problems, deflect responsibility, or treat equipment carelessly.',
      'Small errors or damage may go unreported until they compound.',
      'Performance on ownership items suggests the candidate benefits from clear expectations and a culture where honest reporting is reinforced.',
      'The candidate may need explicit reminders about care of equipment and prompt disclosure.',
    ],
    at_risk: [
      'Ownership and integrity are a significant constraint. The candidate may conceal problems, deflect responsibility, or mishandle equipment.',
      'Unreported damage or errors are likely to create downstream issues.',
      'Performance in this area is well below the expected range. Roles involving valuable or critical equipment would present difficulty.',
      'The candidate may need close supervision and formal reporting requirements to maintain standards.',
    ],
    high_risk: [
      'Ownership and integrity are severely limited. Even routine responsibility may not be honoured.',
      'The candidate shows marked difficulty accepting responsibility or reporting honestly.',
      'Ownership and integrity are in the lowest range observed on this assessment. Roles requiring trust with equipment or critical work should be reconsidered.',
      'Significant scaffolding is required. The candidate should not work unsupervised with valuable or safety-critical equipment.',
    ],
  },

  'Problem Solving & Troubleshooting': {
    exceptional: [
      'Problem solving and troubleshooting in technical contexts is a clear strength. The candidate diagnoses faults systematically, reasons from symptom to cause, and identifies effective corrective action.',
      'The candidate does not jump to conclusions. Hypotheses are tested, evidence is weighed, and solutions are verified before being declared complete.',
      'Problem solving and troubleshooting are well above the expected range. The candidate handles unfamiliar faults without prior experience by applying diagnostic reasoning.',
      'The candidate demonstrates sophisticated fault-finding — including where multiple issues interact and where the obvious cause is not the real one.',
    ],
    strong: [
      'Problem solving and troubleshooting in technical contexts are solid and dependable. The candidate diagnoses most faults effectively and reaches workable solutions.',
      'The candidate works through problems methodically. Very complex or unfamiliar faults may occasionally take longer, but the pattern is reliable.',
      'Problem solving and troubleshooting are above average. The candidate identifies causes accurately and applies appropriate fixes.',
      'The candidate demonstrates good fault-finding in typical situations. Solutions are effective and verified.',
    ],
    capable: [
      'Problem solving and troubleshooting in technical contexts are functional. The candidate handles routine faults adequately but may struggle with complex or interacting problems.',
      'The candidate reaches acceptable solutions. Difficult or unfamiliar faults may reveal gaps in diagnosis.',
      'Problem solving and troubleshooting are at the expected baseline. The candidate resolves standard faults correctly but may not be systematic.',
      'The candidate handles typical situations well. Complex fault chains may need support.',
    ],
    developing: [
      'Problem solving and troubleshooting in technical contexts are below the expected range. The candidate may jump to solutions, miss underlying causes, or fail to verify fixes.',
      'The candidate finds unfamiliar or complex faults effortful. Superficial diagnosis is likely.',
      'Performance on problem solving items suggests the candidate benefits from structured diagnostic frameworks and case practice.',
      'The candidate may address symptoms rather than causes, leading to recurring faults.',
    ],
    at_risk: [
      'Problem solving and troubleshooting in technical contexts are a significant constraint. The candidate may misdiagnose faults, apply ineffective fixes, or escalate unnecessarily.',
      'Complex or interacting problems are likely to be mishandled.',
      'Performance in this area is well below the expected range. Roles requiring independent fault-finding would present difficulty.',
      'The candidate may leave problems unresolved or create new ones through incorrect interventions.',
    ],
    high_risk: [
      'Problem solving and troubleshooting in technical contexts are severely limited. Even routine faults may not be resolved effectively.',
      'The candidate shows marked difficulty diagnosing or correcting problems.',
      'Problem solving and troubleshooting are in the lowest range observed on this assessment. Independent fault-finding roles should be reconsidered.',
      'Significant scaffolding is required. The candidate should not work unsupervised on diagnostic tasking until capability is built.',
    ],
  },

  'Safety & Risk Awareness': {
    exceptional: [
      'Safety and risk awareness are a clear strength. The candidate identifies hazards before they become incidents, applies controls correctly, and treats safety as a personal standard rather than a rule to be followed.',
      'The candidate intervenes proactively when unsafe conditions arise and reinforces safe behaviour with colleagues.',
      'Safety and risk awareness are well above the expected range. The candidate exercises good judgment about risk in novel or non-routine situations.',
      'The candidate demonstrates mature safety judgment — including under production pressure when shortcuts might be tempting.',
    ],
    strong: [
      'Safety and risk awareness are solid and dependable. The candidate follows procedures, uses PPE correctly, and maintains awareness of hazards.',
      'The candidate demonstrates good safety behaviour. Very unusual or novel hazards may occasionally require input, but the pattern is reliable.',
      'Safety and risk awareness are above average. The candidate is safe and reliable on the floor.',
      'The candidate shows good safety practice in typical situations. Standards are maintained without prompting.',
    ],
    capable: [
      'Safety and risk awareness are functional. The candidate follows standard procedures adequately but may miss subtler hazards or drift under pressure.',
      'The candidate manages routine safety demands. Complex or unfamiliar situations may reveal gaps.',
      'Safety and risk awareness are at the expected baseline. The candidate is safe on routine tasks without being vigilant.',
      'The candidate handles typical situations adequately. High-pressure or novel conditions may require reinforcement.',
    ],
    developing: [
      'Safety and risk awareness are below the expected range. The candidate may miss hazards, take shortcuts, or apply procedures inconsistently.',
      'Safety awareness may lapse under time pressure or in unfamiliar conditions.',
      'Performance on safety items suggests the candidate benefits from structured safety training, reminders, and supervision.',
      'The candidate may need explicit reinforcement of safe working habits and hazard awareness.',
    ],
    at_risk: [
      'Safety and risk awareness are a significant constraint. The candidate may create risk to self and others through missed hazards or shortcuts.',
      'Safety compliance is inconsistent. Supervision is likely to be needed to maintain standards.',
      'Performance in this area is well below the expected range. Roles with significant physical risk should be reconsidered.',
      'The candidate may require close supervision and reinforcement to maintain safe practice.',
    ],
    high_risk: [
      'Safety and risk awareness are severely limited. Even routine tasks may present safety risk.',
      'The candidate shows marked difficulty recognising or responding to hazards.',
      'Safety and risk awareness are in the lowest range observed on this assessment. Roles with meaningful physical risk should not proceed without a formal review.',
      'Significant scaffolding is required. The candidate should not work unsupervised in any role with safety-critical tasking.',
    ],
  },

  'Technical Fundamentals': {
    exceptional: [
      'Technical fundamentals are a clear strength. The candidate grasps core concepts underlying the technical work and applies them accurately across contexts.',
      'The candidate can reason from first principles when needed and recognises where their understanding applies and where it does not.',
      'Technical fundamentals are well above the expected range. The candidate moves easily between theory and practice.',
      'The candidate demonstrates strong foundational knowledge — including how individual systems interact within a larger technical environment.',
    ],
    strong: [
      'Technical fundamentals are solid and dependable. The candidate grasps core concepts and applies them effectively in practice.',
      'The candidate reasons well about foundational technical content. Very novel or cross-disciplinary questions may occasionally stretch this, but the pattern is reliable.',
      'Technical fundamentals are above average. The candidate understands the technical basis of the work.',
      'The candidate demonstrates good foundational knowledge in typical situations.',
    ],
    capable: [
      'Technical fundamentals are functional. The candidate grasps basic concepts but may miss subtler interactions or applications.',
      'The candidate understands standard technical content. Complex or system-level questions may reveal gaps.',
      'Technical fundamentals are at the expected baseline. The candidate can discuss core technical content adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced or cross-domain applications may need support.',
    ],
    developing: [
      'Technical fundamentals are below the expected range. The candidate may have gaps in core concepts that affect practical application.',
      'The candidate may struggle to reason from first principles or to transfer foundational knowledge to new situations.',
      'Performance on fundamentals items suggests the candidate benefits from structured training and worked examples.',
      'The candidate may apply rules or procedures correctly without understanding the underlying basis.',
    ],
    at_risk: [
      'Technical fundamentals are a significant constraint. The candidate may hold misconceptions that would lead to poor technical decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about technical trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring technical judgment would present difficulty.',
      'The candidate may make errors that stem from gaps in foundational understanding.',
    ],
    high_risk: [
      'Technical fundamentals are severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about technical matters.',
      'Technical fundamentals are in the lowest range observed on this assessment. Roles requiring technical judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to technical work.',
    ],
  },

  // ----- SINGLE-SECTION TYPES -----
  'Manufacturing': {
    exceptional: [
      'Understanding of manufacturing is a clear strength. The candidate grasps production processes, equipment constraints, quality requirements, and the safety context in which they operate.',
      'The candidate reasons fluently about trade-offs between throughput, quality, cost, and safety, and recognises where improvements are possible.',
      'Understanding is well above the expected range. The candidate can reason about manufacturing systems — including where processes interact and where interventions carry unintended consequences.',
      'The candidate demonstrates sophisticated practical knowledge across the breadth of a manufacturing environment.',
    ],
    strong: [
      'Understanding of manufacturing is solid. The candidate grasps core processes and their operational implications.',
      'The candidate reasons well about production, quality, and safety. Very novel or cross-functional scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss manufacturing meaningfully and apply concepts in practice.',
      'The candidate demonstrates good manufacturing grasp in typical situations.',
    ],
    capable: [
      'Understanding of manufacturing is functional. The candidate grasps standard concepts but may miss subtler interactions.',
      'The candidate understands routine production operations. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss manufacturing adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or system interactions may need support.',
    ],
    developing: [
      'Understanding of manufacturing is below the expected range. The candidate may grasp individual activities without understanding how they interact or affect outcomes.',
      'The candidate may miss quality, safety, or efficiency implications of decisions.',
      'Performance on manufacturing items suggests the candidate benefits from structured practical exposure and case discussion.',
      'The candidate may reason about production in ways that miss system-level effects.',
    ],
    at_risk: [
      'Understanding of manufacturing is a significant constraint. The candidate may hold misconceptions that would lead to poor operational decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about production trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring manufacturing judgment would present difficulty.',
      'The candidate may make choices that harm quality, safety, or efficiency.',
    ],
    high_risk: [
      'Understanding of manufacturing is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about production processes or constraints.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring manufacturing judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully in a production environment.',
    ],
  },

  'Mechanical Engineering': {
    exceptional: [
      'Understanding of mechanical engineering is a clear strength. The candidate grasps forces, materials, motion, and machine design, and applies them accurately to practical problems.',
      'The candidate reasons fluently about mechanical systems — including failure modes, tolerances, and the interaction between components.',
      'Understanding is well above the expected range. The candidate moves easily between theory and application and recognises where standard practice does not apply.',
      'The candidate demonstrates sophisticated mechanical judgment — including where mechanical choices affect safety, cost, or maintainability.',
    ],
    strong: [
      'Understanding of mechanical engineering is solid. The candidate grasps core principles and applies them effectively.',
      'The candidate reasons well about mechanical problems. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss mechanical topics meaningfully and apply concepts in practice.',
      'The candidate demonstrates good mechanical grasp in typical situations.',
    ],
    capable: [
      'Understanding of mechanical engineering is functional. The candidate grasps basic principles but may miss subtler interactions.',
      'The candidate understands standard mechanical concepts. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss mechanical topics adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or failure-mode reasoning may need support.',
    ],
    developing: [
      'Understanding of mechanical engineering is below the expected range. The candidate may grasp terminology without understanding underlying principles.',
      'The candidate may miss failure modes, material limits, or the interaction between components.',
      'Performance on mechanical items suggests the candidate benefits from structured exposure to concepts and worked examples.',
      'The candidate may reason about mechanical matters in ways that miss practical implications.',
    ],
    at_risk: [
      'Understanding of mechanical engineering is a significant constraint. The candidate may hold misconceptions that would lead to poor mechanical decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about mechanical trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring mechanical judgment would present difficulty.',
      'The candidate may make unsafe or impractical mechanical choices due to limited understanding.',
    ],
    high_risk: [
      'Understanding of mechanical engineering is severely limited. Even basic principles may be misunderstood.',
      'The candidate shows marked difficulty reasoning about mechanical systems.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring mechanical judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to mechanical work.',
    ],
  },

  'Electrical Engineering': {
    exceptional: [
      'Understanding of electrical engineering is a clear strength. The candidate grasps circuits, power, control, and electrical safety, and applies them accurately to practical problems.',
      'The candidate reasons fluently about electrical systems — including fault behaviour, protection, and the interaction between components.',
      'Understanding is well above the expected range. The candidate moves easily between theory and application and recognises where standard practice does not apply.',
      'The candidate demonstrates sophisticated electrical judgment — including where electrical choices affect safety, cost, or reliability.',
    ],
    strong: [
      'Understanding of electrical engineering is solid. The candidate grasps core principles and applies them effectively.',
      'The candidate reasons well about electrical problems. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss electrical topics meaningfully and apply concepts in practice.',
      'The candidate demonstrates good electrical grasp in typical situations.',
    ],
    capable: [
      'Understanding of electrical engineering is functional. The candidate grasps basic principles but may miss subtler interactions.',
      'The candidate understands standard electrical concepts. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss electrical topics adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or fault reasoning may need support.',
    ],
    developing: [
      'Understanding of electrical engineering is below the expected range. The candidate may grasp terminology without understanding underlying principles.',
      'The candidate may miss protection requirements, fault behaviour, or safety implications.',
      'Performance on electrical items suggests the candidate benefits from structured exposure to concepts and worked examples.',
      'The candidate may reason about electrical matters in ways that miss practical implications.',
    ],
    at_risk: [
      'Understanding of electrical engineering is a significant constraint. The candidate may hold misconceptions that would lead to unsafe or poor electrical decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about electrical trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring electrical judgment would present difficulty.',
      'The candidate may make unsafe electrical choices due to limited understanding.',
    ],
    high_risk: [
      'Understanding of electrical engineering is severely limited. Even basic principles may be misunderstood.',
      'The candidate shows marked difficulty reasoning about electrical systems.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring electrical judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to electrical work.',
    ],
  },

  'Logistics & Supply Chain': {
    exceptional: [
      'Understanding of logistics and supply chain is a clear strength. The candidate grasps planning, movement, inventory, and coordination, and reasons fluently about trade-offs between cost, speed, and service.',
      'The candidate understands supply chain as a system — including where local decisions create downstream consequences.',
      'Understanding is well above the expected range. The candidate can reason about inventory positioning, lead times, and risk in complex networks.',
      'The candidate demonstrates sophisticated practical knowledge — including the interaction between suppliers, operations, and customers.',
    ],
    strong: [
      'Understanding of logistics and supply chain is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about planning, movement, and inventory. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss logistics meaningfully and apply concepts in practice.',
      'The candidate demonstrates good supply chain grasp in typical situations.',
    ],
    capable: [
      'Understanding of logistics and supply chain is functional. The candidate grasps basic concepts but may miss subtler interactions.',
      'The candidate understands standard logistics activities. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss logistics adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or network effects may need support.',
    ],
    developing: [
      'Understanding of logistics and supply chain is below the expected range. The candidate may grasp individual activities without understanding how they interact.',
      'The candidate may miss lead-time, inventory, or service implications of decisions.',
      'Performance on logistics items suggests the candidate benefits from structured exposure to concepts and case discussion.',
      'The candidate may reason about logistics in ways that miss system-level effects.',
    ],
    at_risk: [
      'Understanding of logistics and supply chain is a significant constraint. The candidate may hold misconceptions that would lead to poor planning or coordination decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about logistics trade-offs.',
      'Performance in this area is well below the expected range. Roles requiring logistics judgment would present difficulty.',
      'The candidate may make choices that increase cost, delay delivery, or disrupt supply.',
    ],
    high_risk: [
      'Understanding of logistics and supply chain is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about planning, movement, or inventory.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring logistics judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to supply chain work.',
    ],
  },

  'Quality Assurance': {
    exceptional: [
      'Understanding of quality assurance is a clear strength. The candidate grasps standards, inspection, testing, and continuous improvement, and applies them accurately to practical problems.',
      'The candidate reasons fluently about prevention versus detection, cost of quality, and the link between quality systems and customer outcomes.',
      'Understanding is well above the expected range. The candidate can design or critique quality approaches and recognise where standard practice falls short.',
      'The candidate demonstrates sophisticated quality judgment — including where quality interacts with safety, cost, and compliance.',
    ],
    strong: [
      'Understanding of quality assurance is solid. The candidate grasps core concepts and their practical implications.',
      'The candidate reasons well about quality systems. Very complex or novel scenarios may occasionally stretch this, but the pattern is reliable.',
      'Understanding is above average. The candidate can discuss quality meaningfully and apply concepts in practice.',
      'The candidate demonstrates good quality grasp in typical situations.',
    ],
    capable: [
      'Understanding of quality assurance is functional. The candidate grasps basic concepts but may miss subtler interactions.',
      'The candidate understands standard quality activities. Complex or system-level questions may reveal gaps.',
      'Understanding is at the expected baseline. The candidate can discuss quality adequately without deep insight.',
      'The candidate handles typical questions well. Nuanced trade-offs or improvement reasoning may need support.',
    ],
    developing: [
      'Understanding of quality assurance is below the expected range. The candidate may conflate inspection with quality, or miss prevention and system-level effects.',
      'The candidate may not distinguish between conformance and fitness for purpose.',
      'Performance on quality items suggests the candidate benefits from structured exposure to quality concepts and case discussion.',
      'The candidate may reason about quality in ways that miss customer or cost implications.',
    ],
    at_risk: [
      'Understanding of quality assurance is a significant constraint. The candidate may hold misconceptions that would lead to poor quality decisions.',
      'Conceptual grasp is limited. The candidate is unlikely to reason effectively about quality systems or improvement.',
      'Performance in this area is well below the expected range. Roles requiring quality judgment would present difficulty.',
      'The candidate may make choices that harm quality, compliance, or customer satisfaction.',
    ],
    high_risk: [
      'Understanding of quality assurance is severely limited. Even basic concepts may be misunderstood.',
      'The candidate shows marked difficulty reasoning about quality systems or standards.',
      'Understanding is in the lowest range observed on this assessment. Roles requiring quality judgment should be reconsidered.',
      'Significant development is required before the candidate can contribute meaningfully to quality work.',
    ],
  },
};

export const sectionImplications = {
  // ----- COGNITIVE -----
  'Verbal Reasoning': {
    exceptional: [
      'Consider using this capability in writing-intensive roles. The candidate can be trusted with materials requiring nuance, judgement, or drafting.',
      'Leverage this strength in roles requiring interpretation of policy, contracts, or complex documentation.',
      'Assign written analysis tasks where subtle inference matters. The candidate is likely to add clarity.',
      'This is a genuine differentiator. Prioritise the candidate for roles where verbal reasoning carries significant weight.',
    ],
    strong: [
      'Reliable for most written reasoning tasks. Very complex or highly abstract material may need a second pair of eyes.',
      'Use in roles requiring interpretation of written guidance. Occasional double-checking is reasonable but usually unnecessary.',
      'The candidate will handle written reasoning tasks well. Complex legal or technical prose may occasionally warrant review.',
      'Assign to written work with normal levels of supervision. Quality should be dependable.',
    ],
    capable: [
      'Suitable for standard written work. Provide reviews on high-stakes documents or dense source material.',
      'Verify interpretation on complex written material before decisions are finalised.',
      'Provide clarity or written summaries on ambiguous sources to reduce interpretation burden.',
      'Acceptable for most day-to-day written reasoning. Complex or high-stakes content deserves a review pass.',
    ],
    developing: [
      'Pair with a stronger reader for dense or inference-heavy written work.',
      'Provide structured summaries of key written material until the candidate builds confidence.',
      'Avoid placing the candidate in roles where written analysis is the primary output until the capability is reinforced.',
      'Assign written work in stages, with check-ins to catch misreads before they compound.',
    ],
    at_risk: [
      'Written material should be reviewed before any decisions based on it are finalised.',
      'Provide verbal briefings in place of, or alongside, written source material.',
      'Do not assign roles requiring written analysis as a primary responsibility.',
      'Written tasking should be short, specific, and checked before acting.',
    ],
    high_risk: [
      'Written materials should be read aloud or summarised verbally for reliable understanding.',
      'Every written task should be reviewed before it is acted upon.',
      'Avoid roles where careful reading or interpretation of written material is central.',
      'Significant scaffolding is needed. Written reasoning should not be relied on for decision-making in this role.',
    ],
  },

  'Numerical Reasoning': {
    exceptional: [
      'The candidate can be trusted with quantitative work requiring interpretation, judgement, or analysis. Consider using this strength in data-heavy roles or on projects where numerical precision matters.',
      'Reliable for any role requiring arithmetic fluency, financial reasoning, or data interpretation. Very few candidates will perform at this level.',
      'Assign to work involving calculations, metrics, or data analysis with confidence. No structured support needed in this area.',
      'This is a genuine differentiator. Consider pairing the candidate with weaker performers on numerical tasks for peer development.',
    ],
    strong: [
      'Suitable for most quantitative work with normal supervision. Consider a review pass on high-stakes calculations, but routine tasks should be dependable.',
      'Reliable for roles requiring data interpretation or financial reasoning. No specific intervention required.',
      'Assign to work involving numbers or data analysis with standard oversight. Quality should be consistent.',
      'This capability can be counted on. Consider using it in roles where financial or operational metrics are part of the job.',
    ],
    capable: [
      'Suitable for routine quantitative tasks. On complex or high-stakes work in this area, consider a review pass or additional tooling.',
      'Acceptable for most numerical work. Where accuracy is critical, verify results before finalising decisions.',
      'Provide calculators, reference sheets, or peer support on multi-step or high-stakes problems. The baseline capability is in place.',
      'If the role demands excellence in quantitative work, targeted practice with feedback is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger performer for quantitative tasks requiring pattern recognition or multi-step logic.',
      'Provide structured practice, worked examples, and review checkpoints. Avoid assigning standalone responsibility for high-stakes numerical work until capability improves.',
      'Assign numerical tasks in stages and verify before relying on the results.',
      'Set specific learning goals for this area and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign standalone responsibility for quantitative work.',
      'Where numerical reasoning is central to the role, reconsider fit or provide close supervision and tooling.',
      'Structured development plan needed. Track progress formally and provide external aids where possible.',
      "This is a priority development area. Expect to invest time and support in scaffolding the candidate's quantitative work.",
    ],
    high_risk: [
      'Do not rely on this capability for decisions or critical work.',
      'Roles requiring numerical reasoning should be reconsidered for this candidate. If unavoidable, pair with a stronger performer for any quantitative tasking.',
      "Substantial, ongoing support would be needed. Consider whether this is the right fit for the role's demands.",
      'This is a critical constraint. Numerical work should be reassigned or heavily supervised.',
    ],
  },

  'Abstract Reasoning': {
    exceptional: [
      'The candidate can be trusted with problems that require seeing structure in unfamiliar material. Consider using this strength in roles involving analysis, design, or novel problem solving.',
      'Reliable for any task requiring abstract pattern recognition or rule inference. Very few candidates will perform at this level.',
      'Assign to work involving unfamiliar systems, novel data, or symbolic content with confidence. No structured support needed.',
      'This is a genuine differentiator. Consider pairing the candidate with weaker performers on pattern-heavy work for peer development.',
    ],
    strong: [
      'Suitable for most tasks requiring pattern recognition and rule inference. No specific intervention required.',
      'Reliable for roles involving abstraction or unfamiliar content. Occasional complexity may warrant review, but the overall pattern is sound.',
      'Assign to work requiring structure-finding with standard oversight. Quality should be consistent.',
      'This capability can be counted on. Consider using it where reasoning about novel material is part of the job.',
    ],
    capable: [
      'Suitable for routine pattern-based tasks. On complex or unfamiliar work in this area, consider a review pass or additional support.',
      'Acceptable for most abstraction tasks. Where the stakes are high, verify conclusions before acting on them.',
      'Provide worked examples, reference patterns, or peer support on layered or symbolic problems.',
      'If the role demands excellence in abstract reasoning, targeted practice with feedback is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger performer for tasks requiring rule inference or pattern recognition in unfamiliar content.',
      'Provide structured support — worked examples, reference material, and review checkpoints. Avoid assigning standalone responsibility for abstract problem solving until capability improves.',
      'Assign abstraction tasks in stages and verify conclusions before relying on them.',
      'Set specific learning goals for this area and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign standalone responsibility for abstract reasoning tasks.',
      'Where pattern inference is central to the role, reconsider fit or provide close supervision and scaffolding.',
      'Structured development plan needed. Track progress formally and provide external aids where possible.',
      "This is a priority development area. Expect to invest time and support in scaffolding the candidate's abstract work.",
    ],
    high_risk: [
      'Do not rely on this capability for decisions or critical work.',
      'Roles requiring abstract reasoning should be reconsidered for this candidate. If unavoidable, pair with a stronger performer for any pattern-inference tasking.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s demands.',
      'This is a critical constraint. Abstract reasoning tasks should be reassigned or heavily supervised.',
    ],
  },

  'Logical Reasoning': {
    exceptional: [
      'The candidate can be trusted with problems requiring careful inference. Consider using this strength in roles involving analysis, policy, or structured decision-making.',
      'Reliable for any task requiring valid reasoning from premises. Very few candidates will perform at this level.',
      'Assign to work involving contracts, rules, procedure, or diagnostic reasoning with confidence. No structured support needed.',
      'This is a genuine differentiator. Consider pairing the candidate with weaker performers on logic-heavy work for peer development.',
    ],
    strong: [
      'Suitable for most tasks requiring valid inference. No specific intervention required.',
      'Reliable for roles involving rule interpretation or deductive reasoning. Occasional complexity may warrant review, but the overall pattern is sound.',
      'Assign to work requiring logical analysis with standard oversight. Quality should be consistent.',
      'This capability can be counted on. Consider using it where reasoning about premises or conditions is part of the job.',
    ],
    capable: [
      'Suitable for routine logical tasks. On complex or layered reasoning in this area, consider a review pass or additional support.',
      'Acceptable for most deductive work. Where the stakes are high, verify conclusions before acting on them.',
      'Provide reference material, worked examples, or peer support on multi-premise problems.',
      'If the role demands excellence in logical reasoning, targeted practice with feedback is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger reasoner for tasks requiring conditionals or categorical logic.',
      'Provide structured support — worked examples, reference material, and review checkpoints. Avoid assigning standalone responsibility for complex deduction until capability improves.',
      'Assign logical tasks in stages and verify conclusions before relying on them.',
      'Set specific learning goals for this area and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign standalone responsibility for logical reasoning tasks.',
      'Where valid inference is central to the role, reconsider fit or provide close supervision and scaffolding.',
      'Structured development plan needed. Track progress formally and provide external aids where possible.',
      "This is a priority development area. Expect to invest time and support in scaffolding the candidate's deductive work.",
    ],
    high_risk: [
      'Do not rely on this capability for decisions or critical work.',
      'Roles requiring logical reasoning should be reconsidered for this candidate. If unavoidable, pair with a stronger performer for any inference-based tasking.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s demands.',
      'This is a critical constraint. Logical reasoning tasks should be reassigned or heavily supervised.',
    ],
  },

  // ----- BEHAVIORAL -----
  'Decision Making': {
    exceptional: [
      'The candidate can be trusted with high-stakes or ambiguous decisions. Consider using this strength in roles where judgment under uncertainty is central.',
      'Reliable for decisions with material consequences. Very few candidates will reason this cleanly under uncertainty.',
      'Assign decision authority where trade-offs are genuinely difficult. The candidate is likely to reach defensible conclusions and own them.',
      'This is a genuine differentiator. Consider using the candidate as a sounding board or escalation point for colleagues facing complex choices.',
    ],
    strong: [
      'Suitable for most decision-making contexts with normal oversight. High-stakes calls may still warrant a second view.',
      'The candidate can be relied upon for independent judgment on routine and moderately complex decisions. No specific intervention required.',
      'Assign decision authority appropriate to role scope. Quality should be dependable.',
      'This capability can be counted on. Consider stretching the candidate with broader decision scope over time.',
    ],
    capable: [
      'Suitable for standard operational decisions. Provide review or a peer check on high-stakes or irreversible choices.',
      'Acceptable for most day-to-day decisions. Where trade-offs are close or consequences are material, verify reasoning before finalising.',
      'Provide decision frameworks, escalation routes, or a peer review step to support harder calls.',
      'If the role demands consistent high-quality judgment under ambiguity, targeted coaching on decision practice is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger decision-maker for complex or high-stakes choices until judgment is reinforced.',
      'Provide structured decision frameworks — criteria, checklists, escalation routes — and review decisions before they are acted on.',
      'Avoid assigning standalone decision authority for irreversible or high-risk matters until capability improves.',
      'Set specific development goals around decision discipline and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign standalone decision authority for consequential matters.',
      'Where independent judgment is central to the role, reconsider fit or provide close supervision and structured decision support.',
      'Structured development plan needed. Track decision quality formally and provide external frameworks or peer review.',
      'This is a priority development area. Expect to invest time in building the candidate\u2019s decision discipline through practice and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions with material consequences.',
      'Roles requiring autonomous judgment should be reconsidered for this candidate. If unavoidable, require review of every significant decision.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s decision demands.',
      'This is a critical constraint. Decision authority should be limited, supervised, or reassigned until capability is built.',
    ],
  },

  'Communication': {
    exceptional: [
      'The candidate can be trusted with high-stakes or sensitive communication. Consider using this strength in roles requiring stakeholder management, negotiation, or delivery of difficult news.',
      'Reliable for upward communication, bad-news delivery, and audience adaptation. Very few candidates will communicate this cleanly under pressure.',
      'Assign communication responsibilities where candour and clarity matter — briefings, escalations, written updates to senior stakeholders.',
      'This is a genuine differentiator. Consider using the candidate as a communication exemplar or to coach colleagues on difficult conversations.',
    ],
    strong: [
      'Suitable for most communication contexts with normal oversight. Highly sensitive or politically complex messages may warrant a second view.',
      'The candidate communicates clearly and adapts reasonably to audience. No specific intervention required.',
      'Assign stakeholder-facing and upward communication appropriate to role scope. Quality should be dependable.',
      'This capability can be counted on. Consider stretching the candidate with broader or more senior audiences over time.',
    ],
    capable: [
      'Suitable for standard communication. Provide review or rehearsal on high-stakes messages, especially upward or to external stakeholders.',
      'Acceptable for most day-to-day communication. Where the message is difficult or the audience is senior, verify framing before delivery.',
      'Provide templates, briefing notes, or peer feedback to support harder conversations.',
      'If the role demands consistent excellence in difficult communication, targeted coaching on message structure and delivery is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger communicator for difficult, upward, or high-stakes messages until capability is reinforced.',
      'Provide structured support — prepared messages, written follow-ups, rehearsal, and review — before consequential conversations.',
      'Avoid assigning standalone responsibility for sensitive stakeholder communication until capability improves.',
      'Set specific development goals around clarity, audience adaptation, and candour, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign standalone responsibility for difficult or upward communication.',
      'Where stakeholder communication is central to the role, reconsider fit or provide close supervision and message review.',
      'Structured development plan needed. Track communication outcomes formally and provide external templates or peer support.',
      'This is a priority development area. Expect to invest time in building the candidate\u2019s clarity and candour through practice and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for high-stakes or upward communication.',
      'Roles requiring regular stakeholder communication should be reconsidered for this candidate. If unavoidable, review all consequential messages before delivery.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s communication demands.',
      'This is a critical constraint. Sensitive communication should be supervised, scripted, or reassigned until capability is built.',
    ],
  },

  'Adaptability': {
    exceptional: [
      'The candidate can be trusted in fast-changing or ambiguous environments. Consider using this strength in roles where context shifts frequently or requirements emerge as work proceeds.',
      'Reliable for work involving pivots, restructuring, or novel situations. Very few candidates adjust this smoothly without loss of effectiveness.',
      'Assign to change-heavy programmes, start-up contexts, or roles with unclear boundaries. The candidate is likely to thrive rather than merely cope.',
      'This is a genuine differentiator. Consider using the candidate as a stabiliser during transitions or to model adaptive behaviour for the team.',
    ],
    strong: [
      'Suitable for most roles with normal levels of change. Sudden or high-ambiguity shifts may still warrant framing and support.',
      'The candidate adjusts well to evolving requirements. No specific intervention required.',
      'Assign change-affected work with standard oversight. The candidate should absorb reasonable amounts of transition without significant friction.',
      'This capability can be counted on. Consider stretching the candidate with gradually more ambiguous or dynamic assignments.',
    ],
    capable: [
      'Suitable for roles with predictable change. Where change is frequent, sudden, or poorly communicated, provide framing and time to adjust.',
      'Acceptable for most environments. Large pivots may slow the candidate briefly; recovery is usually reasonable.',
      'Provide clear rationale and notice ahead of significant change. The candidate adjusts better with context than with surprise.',
      'If the role demands consistent comfort with ambiguity, targeted development in this area is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger adapter during periods of significant change until capability is reinforced.',
      'Provide structured support during transitions — clear timelines, rationale, and check-ins — and avoid stacking multiple changes at once.',
      'Avoid placing the candidate in roles with frequent or high-ambiguity change until capability improves.',
      'Set specific development goals around flexibility and tolerance for uncertainty, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles with frequent or disruptive change.',
      'Where adaptability is central to the role, reconsider fit or provide close supervision and staged transitions.',
      'Structured development plan needed. Track response to change formally and provide external framing and support.',
      'This is a priority development area. Expect to invest time in building the candidate\u2019s tolerance for ambiguity and change through graduated exposure.',
    ],
    high_risk: [
      'Do not rely on this capability for roles involving change, ambiguity, or shifting priorities.',
      'Roles requiring flexibility should be reconsidered for this candidate. If unavoidable, minimise change and provide extensive framing.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s stability demands.',
      'This is a critical constraint. Change should be introduced slowly, framed carefully, and supported throughout.',
    ],
  },

  'Accountability': {
    exceptional: [
      'The candidate can be trusted with work where ownership and reliability are critical. Consider using this strength in roles with high autonomy or low oversight.',
      'Reliable for taking responsibility, raising problems early, and following through on commitments. Very few candidates own outcomes this cleanly.',
      'Assign to work where failures are consequential and disclosure matters — high-trust, minimal-supervision environments.',
      'This is a genuine differentiator. Consider using the candidate as a model for ownership culture or to mentor others on accountability practice.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. The candidate accepts responsibility and follows through reliably.',
      'Ownership and follow-through are dependable. No specific intervention required.',
      'Assign work with standard supervision. The candidate is likely to disclose problems and own outcomes appropriately.',
      'This capability can be counted on. Consider stretching the candidate with higher-autonomy work over time.',
    ],
    capable: [
      'Suitable for standard work. Where failure is public or high-stakes, provide framing and support to ensure clean ownership.',
      'Acceptable for most purposes. Follow-through is generally reliable; disclosure may lag where stakes are high.',
      'Provide clear ownership expectations and check-ins on commitments. The candidate performs better with visible structure.',
      'If the role demands consistent ownership under pressure, targeted coaching on responsibility practice is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger owner for high-visibility or high-stakes work until capability is reinforced.',
      'Provide structured support — explicit ownership, commitment tracking, and regular check-ins — and reinforce early disclosure.',
      'Avoid assigning the candidate roles where independent ownership of failure is central until capability improves.',
      'Set specific development goals around ownership and disclosure, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate standalone ownership of high-stakes outcomes.',
      'Where accountability is central to the role, reconsider fit or provide close supervision and formal commitment tracking.',
      'Structured development plan needed. Track follow-through and disclosure formally.',
      'This is a priority development area. Expect to invest time in building ownership and reliability through explicit structure and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for work requiring ownership or follow-through.',
      'Roles requiring accountability should be reconsidered for this candidate. If unavoidable, provide close supervision and explicit consequence.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s reliability demands.',
      'This is a critical constraint. Ownership should be assigned only with monitoring, structure, and clear consequences.',
    ],
  },

  'Collaboration': {
    exceptional: [
      'The candidate can be trusted with joint work where trust, candour, and shared ownership matter. Consider using this strength in cross-functional teams, projects, or roles requiring influence without authority.',
      'Reliable for team settings involving disagreement, shared accountability, or diverse working styles. Very few candidates collaborate this cleanly.',
      'Assign the candidate to teams where dynamics matter — high-stakes projects, integration efforts, or teams under pressure.',
      'This is a genuine differentiator. Consider using the candidate to build team norms or to work with colleagues who need support on collaboration.',
    ],
    strong: [
      'Suitable for most team settings with normal oversight. Highly charged team dynamics may still warrant a second pair of eyes.',
      'The candidate collaborates reliably and handles disagreement maturely. No specific intervention required.',
      'Assign joint work with standard oversight. The candidate contributes to shared outcomes without creating friction.',
      'This capability can be counted on. Consider stretching the candidate with cross-functional or higher-stakes team work.',
    ],
    capable: [
      'Suitable for standard team work. Where dynamics are complex or conflict is likely, provide facilitation or clear roles.',
      'Acceptable for most collaboration. Shared ownership may need to be explicit to draw out the candidate\u2019s best contribution.',
      'Provide clear roles, structured communication, and a light touch on conflict resolution where needed.',
      'If the role demands sustained collaborative excellence, targeted coaching on team behaviour is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger collaborator for complex or high-friction team work until capability is reinforced.',
      'Provide structured support — clear roles, explicit shared goals, and facilitation — before joint work begins.',
      'Avoid assigning the candidate to teams with significant conflict or unclear dynamics until capability improves.',
      'Set specific development goals around trust-building and constructive disagreement, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to teams with complex dynamics or high interdependence.',
      'Where collaboration is central to the role, reconsider fit or provide close facilitation and structured process.',
      'Structured development plan needed. Track team outcomes and peer feedback formally.',
      'This is a priority development area. Expect to invest time in building collaboration capability through supervised joint work.',
    ],
    high_risk: [
      'Do not rely on this capability for work requiring sustained teamwork.',
      'Roles involving close collaboration should be reconsidered for this candidate. If unavoidable, provide close facilitation and explicit process.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s team demands.',
      'This is a critical constraint. Joint work should be highly structured and closely supported until capability is built.',
    ],
  },

  'Integrity': {
    exceptional: [
      'The candidate can be trusted with sensitive information, decisions with ethical dimensions, and situations where the right call is costly. Consider using this strength where trust is critical.',
      'Reliable for roles requiring ethical judgment under pressure. Very few candidates maintain standards this consistently.',
      'Assign to work involving confidential information, regulatory matters, or decisions where the easy path and the right path diverge.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for ethical conduct or to support colleagues in difficult situations.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Extreme pressure or high personal cost may still test the candidate, but the pattern is reliable.',
      'The candidate maintains standards and transparency under normal pressure. No specific intervention required.',
      'Assign ethical and confidential work with standard oversight. Behaviour should align with stated principles.',
      'This capability can be counted on. Consider stretching the candidate with roles requiring ethical judgment over time.',
    ],
    capable: [
      'Suitable for standard work. Where pressure to compromise is likely, provide explicit expectations and clear support.',
      'Acceptable for most purposes. Transparency may waver under high cost or visibility; verify in sensitive matters.',
      'Provide clear ethical frameworks, explicit expectations, and support when the right path is difficult.',
      'If the role demands consistent ethical reliability under pressure, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a trusted colleague for matters involving ethical judgment or sensitive information until capability is reinforced.',
      'Provide structured support — clear ethical expectations, escalation routes, and explicit consequences for compromise.',
      'Avoid assigning the candidate roles with significant ethical exposure until capability improves.',
      'Set specific development goals around transparency and consistency, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles involving sensitive information or ethical judgment.',
      'Where integrity is central to the role, reconsider fit or provide close supervision and formal monitoring.',
      'Structured development plan needed. Track ethical conduct and disclosure formally.',
      'This is a priority development area. Expect to invest time in building reliability and transparency through explicit structure and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions with ethical dimensions or sensitive information.',
      'Roles requiring integrity should be reconsidered for this candidate. If unavoidable, provide close oversight and explicit consequence.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s ethical demands.',
      'This is a critical constraint. Ethical exposure should be minimised or eliminated until capability is built.',
    ],
  },

  'Resilience': {
    exceptional: [
      'The candidate can be trusted in high-pressure or high-stakes environments. Consider using this strength in roles where sustained demand is the norm.',
      'Reliable under pressure, during setbacks, and through extended difficulty. Very few candidates maintain performance this cleanly.',
      'Assign to demanding roles, crisis work, or environments where composure matters — the candidate is likely to stabilise others under pressure.',
      'This is a genuine differentiator. Consider using the candidate as a stabiliser during difficult periods or as a support for colleagues under strain.',
    ],
    strong: [
      'Suitable for most roles with normal levels of pressure. Extreme or prolonged demand may still warrant support and recovery time.',
      'The candidate sustains performance through typical pressure and recovers from setback well. No specific intervention required.',
      'Assign high-pressure work with standard oversight. The candidate should absorb reasonable demand without significant impact.',
      'This capability can be counted on. Consider stretching the candidate with gradually more demanding assignments.',
    ],
    capable: [
      'Suitable for roles with predictable pressure. Where demand is sustained or intense, provide recovery time and support.',
      'Acceptable for most purposes. Prolonged pressure may affect composure; monitor during extended challenges.',
      'Provide structure and recovery periods during demanding phases. Check in during extended difficulty.',
      'If the role demands consistent performance under sustained pressure, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger colleague during high-pressure periods until capability is reinforced.',
      'Provide structured support — clear priorities, recovery time, and regular check-ins — during demanding phases.',
      'Avoid placing the candidate in roles with sustained high pressure or crisis conditions until capability improves.',
      'Set specific development goals around stress management and recovery, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles with sustained pressure or frequent crisis.',
      'Where resilience is central to the role, reconsider fit or provide close supervision and structured recovery.',
      'Structured development plan needed. Monitor wellbeing and performance during demanding periods.',
      'This is a priority development area. Expect to invest time in building resilience through graduated exposure and support.',
    ],
    high_risk: [
      'Do not rely on this capability for roles involving pressure, crisis, or sustained demand.',
      'Roles requiring resilience should be reconsidered for this candidate. If unavoidable, minimise pressure and provide substantial support.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s demands.',
      'This is a critical constraint. High-pressure work should be avoided or heavily supported until capability is built.',
    ],
  },

  'Stakeholder Focus': {
    exceptional: [
      'The candidate can be trusted with high-stakes stakeholder relationships — clients, partners, senior executives. Consider using this strength where relationship management is critical.',
      'Reliable for managing competing interests, expectations, and politically sensitive contexts. Very few candidates handle stakeholder complexity this cleanly.',
      'Assign to client-facing, executive-facing, or partnership roles where trust and expectation management are central.',
      'This is a genuine differentiator. Consider using the candidate as a relationship anchor on complex or sensitive engagements.',
    ],
    strong: [
      'Suitable for most stakeholder-facing work with normal oversight. Highly political or complex landscapes may warrant a second view.',
      'The candidate manages stakeholder relationships and expectations effectively. No specific intervention required.',
      'Assign stakeholder-facing work with standard oversight. Trust should be built and maintained reliably.',
      'This capability can be counted on. Consider stretching the candidate with more senior or complex stakeholder exposure.',
    ],
    capable: [
      'Suitable for standard stakeholder work. Where interests conflict or senior audiences are involved, provide review and clear escalation routes.',
      'Acceptable for most purposes. Complex or politically sensitive relationships may require support to manage effectively.',
      'Provide structured briefings, clear escalation routes, and support on difficult stakeholder conversations.',
      'If the role demands consistent excellence in stakeholder management, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger stakeholder manager for complex or high-stakes relationships until capability is reinforced.',
      'Provide structured support — briefings, escalation routes, and review of key communications — before significant engagements.',
      'Avoid assigning the candidate standalone ownership of significant external or senior stakeholder relationships until capability improves.',
      'Set specific development goals around expectation management and relationship building, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate standalone ownership of high-stakes stakeholder relationships.',
      'Where stakeholder management is central to the role, reconsider fit or provide close supervision and structured support.',
      'Structured development plan needed. Track stakeholder outcomes and relationship health formally.',
      'This is a priority development area. Expect to invest time in building stakeholder capability through supervised practice.',
    ],
    high_risk: [
      'Do not rely on this capability for stakeholder-facing work.',
      'Roles requiring significant stakeholder management should be reconsidered for this candidate. If unavoidable, review all significant interactions.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s stakeholder demands.',
      'This is a critical constraint. Stakeholder relationships should be managed by others or heavily supervised until capability is built.',
    ],
  },

  // ----- CULTURAL -----
  'Values Alignment': {
    exceptional: [
      'The candidate can be trusted as a cultural anchor. Consider using this strength in roles where values-based decisions set the tone for others.',
      'Reliable for ethical, cultural, and value-laden decisions where the right call may be unpopular. Very few candidates hold this consistently.',
      'Assign work where the organisation\u2019s values need to be modelled visibly — team leadership, onboarding, or high-trust engagements.',
      'This is a genuine differentiator. Consider using the candidate to reinforce cultural standards or support colleagues in values-driven decisions.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Extreme pressure or high personal cost may still test this, but the pattern is reliable.',
      'The candidate aligns well with stated values in most situations. No specific intervention required.',
      'Assign work with standard supervision. Values alignment should be dependable.',
      'This capability can be counted on. Consider using the candidate where cultural fit matters moderately.',
    ],
    capable: [
      'Suitable for standard roles. Where values conflicts are likely or cost is high, provide clarity and support.',
      'Acceptable for most purposes. Values alignment may waver when pressure rises; monitor in high-stakes situations.',
      'Reinforce expectations by referencing values in decisions and giving examples of what alignment looks like in practice.',
      'If the role demands consistent values-based decision-making, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a values-anchored colleague on decisions where principle and pragmatism may conflict.',
      'Provide structured support — concrete examples, case discussions, and check-ins on values-relevant decisions.',
      'Avoid placing the candidate in roles where cultural leadership or values-based decisions are central until capability improves.',
      'Set specific development goals around values consistency and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate roles where cultural fit or values alignment is central.',
      'Where values alignment is critical, reconsider fit or provide close supervision and explicit expectations.',
      'Structured development plan needed. Track consistency between stated values and observed behaviour.',
      'This is a priority development area. Expect to invest time in reinforcing values through explicit guidance and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for roles where cultural fit matters.',
      'Roles requiring values alignment should be reconsidered for this candidate. If unavoidable, provide close oversight and clear consequences.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the organisation\u2019s culture.',
      'This is a critical constraint. Cultural fit should be carefully weighed before placing the candidate in values-critical roles.',
    ],
  },

  'Cultural Adaptability': {
    exceptional: [
      'The candidate can be trusted in culturally diverse or unfamiliar environments. Consider using this strength in cross-cultural teams, international roles, or integration work.',
      'Reliable for adapting to unfamiliar norms, styles, and expectations. Very few candidates navigate cultural difference this smoothly.',
      'Assign the candidate to culturally mixed teams, international engagements, or contexts where norms are not yet established.',
      'This is a genuine differentiator. Consider using the candidate as a cultural bridge or mentor for colleagues working across cultures.',
    ],
    strong: [
      'Suitable for most cross-cultural roles with normal oversight. Very unfamiliar settings may warrant additional support.',
      'The candidate adapts well to cultural difference. No specific intervention required.',
      'Assign culturally mixed or geographically distributed work with standard oversight. Trust should be built effectively.',
      'This capability can be counted on. Consider stretching the candidate with progressively more unfamiliar cultural contexts.',
    ],
    capable: [
      'Suitable for most roles involving cultural diversity. Where norms are very unfamiliar, provide orientation and check-ins.',
      'Acceptable for most purposes. Adjustment may take longer in strongly unfamiliar settings.',
      'Provide cultural orientation, briefing, and support where norms differ significantly from the candidate\u2019s default.',
      'If the role demands sustained cross-cultural effectiveness, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a culturally adept colleague in unfamiliar settings until capability is reinforced.',
      'Provide structured support — cultural briefings, mentoring, and feedback — particularly when entering new environments.',
      'Avoid placing the candidate in roles with high cultural novelty until capability improves.',
      'Set specific development goals around cross-cultural flexibility and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to culturally unfamiliar or highly diverse environments without support.',
      'Where cultural adaptability is central to the role, reconsider fit or provide close supervision and structured guidance.',
      'Structured development plan needed. Track cross-cultural interactions and outcomes formally.',
      'This is a priority development area. Expect to invest time in building cultural flexibility through graduated exposure.',
    ],
    high_risk: [
      'Do not rely on this capability for cross-cultural work.',
      'Roles requiring cultural adaptability should be reconsidered for this candidate. If unavoidable, provide close supervision and cultural mediation.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s cultural demands.',
      'This is a critical constraint. Cross-cultural interactions should be supported or mediated until capability is built.',
    ],
  },

  'Team Compatibility': {
    exceptional: [
      'The candidate can be trusted as a stabilising team presence. Consider using this strength in teams that need cohesion, especially through change or pressure.',
      'Reliable for integrating into established teams and strengthening team culture. Very few candidates fit this smoothly without losing individual voice.',
      'Assign the candidate to teams where cultural fit and cohesion matter — new teams, cross-functional groups, or teams in transition.',
      'This is a genuine differentiator. Consider using the candidate as an informal anchor for team norms and peer support.',
    ],
    strong: [
      'Suitable for most team environments with normal oversight. Very high-cohesion or long-established teams may take brief adjustment.',
      'The candidate integrates well and contributes to team functioning. No specific intervention required.',
      'Assign team membership with standard oversight. Trust should be built and maintained.',
      'This capability can be counted on. Consider stretching the candidate with more complex team structures over time.',
    ],
    capable: [
      'Suitable for standard team environments. Where team culture is strong or distinctive, allow time and support for integration.',
      'Acceptable for most purposes. The candidate fits adequately but may not actively strengthen team cohesion.',
      'Provide structured induction, clear team norms, and check-ins during the integration period.',
      'If the role demands sustained team cohesion, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a team anchor during integration and through the early months of team membership.',
      'Provide structured support — clear norms, explicit expectations, and regular check-ins — particularly in established teams.',
      'Avoid placing the candidate in highly cohesive or high-friction teams until capability improves.',
      'Set specific development goals around team integration and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not place the candidate in teams where cohesion is central without close support.',
      'Where team compatibility is critical, reconsider fit or provide close supervision and structured integration.',
      'Structured development plan needed. Track team outcomes and peer feedback formally.',
      'This is a priority development area. Expect to invest time in building team integration capability through supervised experience.',
    ],
    high_risk: [
      'Do not rely on this capability for team-based work.',
      'Roles requiring close team membership should be reconsidered for this candidate. If unavoidable, provide close support and explicit structure.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s team demands.',
      'This is a critical constraint. Team integration should be closely supported or individual work arrangements considered.',
    ],
  },

  'Attitudinal Markers': {
    exceptional: [
      'The candidate can be trusted with work requiring sustained intrinsic motivation. Consider using this strength in roles with low external reward or high autonomy.',
      'Reliable for consistent effort without close oversight or visible reward. Very few candidates maintain engagement this consistently.',
      'Assign self-directed work, remote arrangements, or roles where discretionary effort matters. The candidate is likely to sustain quality without external pressure.',
      'This is a genuine differentiator. Consider using the candidate as a model for work ethic or to support colleagues who need structure to stay engaged.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Long or unrewarding tasks may occasionally require reinforcement.',
      'The candidate shows good engagement and work ethic in typical situations. No specific intervention required.',
      'Assign work with standard oversight. Motivation should be stable.',
      'This capability can be counted on. Consider stretching the candidate with gradually more autonomous or less externally rewarding assignments.',
    ],
    capable: [
      'Suitable for standard roles. Where tasks are unrewarding or visibility is low, provide purpose and regular reinforcement.',
      'Acceptable for most purposes. Engagement may vary with task characteristics; monitor on lower-reward assignments.',
      'Provide clear purpose, regular feedback, and visible connection to outcomes to sustain engagement.',
      'If the role demands sustained intrinsic motivation, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a highly engaged colleague on low-reward or high-autonomy tasks until capability is reinforced.',
      'Provide structured support — clear purpose, regular feedback, and check-ins — particularly on tasks that are not intrinsically motivating.',
      'Avoid placing the candidate in roles with low visibility or distant reward until capability improves.',
      'Set specific development goals around engagement and work ethic, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to work requiring sustained self-driven effort.',
      'Where intrinsic motivation is central to the role, reconsider fit or provide close supervision and frequent reinforcement.',
      'Structured development plan needed. Track engagement and effort formally.',
      'This is a priority development area. Expect to invest time in building intrinsic motivation through purpose, feedback, and staged challenge.',
    ],
    high_risk: [
      'Do not rely on this capability for work requiring discretionary effort or self-direction.',
      'Roles requiring sustained engagement should be reconsidered for this candidate. If unavoidable, provide close management and frequent reinforcement.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s engagement demands.',
      'This is a critical constraint. Work should be closely supported and externally structured until capability is built.',
    ],
  },

  'Organisational Citizenship': {
    exceptional: [
      'The candidate can be trusted as an organisational anchor — someone who invests beyond formal role and strengthens the workplace in ways that are difficult to mandate.',
      'Reliable for improving shared processes, supporting colleagues, and contributing to outcomes beyond their own tasking. Very few candidates give at this level consistently.',
      'Assign the candidate to roles where organisational health matters — team development, process improvement, culture-building, or mentoring.',
      'This is a genuine differentiator. Consider using the candidate to model discretionary contribution or to lead informal improvement efforts.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. The candidate contributes beyond role requirements and supports colleagues.',
      'The candidate is a dependable organisational citizen. No specific intervention required.',
      'Assign work with standard oversight. Contribution to the wider organisation should be reliable.',
      'This capability can be counted on. Consider stretching the candidate with broader improvement or mentoring responsibilities.',
    ],
    capable: [
      'Suitable for standard roles. Where wider contribution is expected, make expectations explicit and recognise it when it occurs.',
      'Acceptable for most purposes. The candidate delivers their own role reliably but may not consistently extend beyond it.',
      'Reinforce the value of contributions beyond formal role — helping colleagues, improving processes — through recognition and explicit expectation.',
      'If the role demands sustained organisational contribution, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a strong organisational citizen to model contribution beyond role.',
      'Provide structured expectations — explicit examples of what discretionary contribution looks like — and recognise it when it appears.',
      'Avoid placing the candidate in roles where success depends on contributions beyond their own tasking until capability improves.',
      'Set specific development goals around team contribution and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate to contribute beyond formal role.',
      'Where organisational contribution is central to the role, reconsider fit or provide close supervision and explicit expectations.',
      'Structured development plan needed. Track contribution to shared outcomes formally.',
      'This is a priority development area. Expect to invest time in building citizenship through explicit expectation and reinforcement.',
    ],
    high_risk: [
      'Do not rely on this capability for roles where shared contribution matters.',
      'Roles requiring organisational citizenship should be reconsidered for this candidate. If unavoidable, make expectations explicit and monitor closely.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s contribution demands.',
      'This is a critical constraint. Contribution beyond formal role should not be relied on; structure work accordingly.',
    ],
  },

  'Ethical & Cultural Judgment': {
    exceptional: [
      'The candidate can be trusted with complex ethical and cultural decisions where principle and context interact. Consider using this strength in roles requiring nuanced judgment.',
      'Reliable for navigating situations where organisational standards and cultural expectations conflict. Very few candidates handle this tension so thoughtfully.',
      'Assign to work involving policy interpretation, cross-cultural engagements, or decisions where ethical and cultural considerations must be balanced.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for others facing complex ethical and cultural questions.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Highly complex ethical and cultural cases may still warrant consultation.',
      'The candidate navigates ethical and cultural complexity well in most situations. No specific intervention required.',
      'Assign work with standard oversight where ethical and cultural considerations intersect.',
      'This capability can be counted on. Consider stretching the candidate with more complex ethical and cultural decision-making over time.',
    ],
    capable: [
      'Suitable for standard roles. Where ethical and cultural considerations conflict, provide frameworks and consultation.',
      'Acceptable for most purposes. Complex cases may reveal limits in balancing principle and context.',
      'Provide structured frameworks, case discussion, and consultation for ethically or culturally complex situations.',
      'If the role demands consistent excellence in ethical and cultural judgment, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a trusted colleague for situations where ethical and cultural considerations interact.',
      'Provide structured support — case discussion, frameworks, and review — before consequential decisions.',
      'Avoid placing the candidate in roles requiring nuanced ethical and cultural judgment until capability improves.',
      'Set specific development goals around balancing principle and context, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate responsibility for decisions involving complex ethical and cultural judgment.',
      'Where ethical and cultural judgment is central to the role, reconsider fit or provide close supervision and structured consultation.',
      'Structured development plan needed. Track ethical and cultural judgment outcomes formally.',
      'This is a priority development area. Expect to invest time in building judgment through structured frameworks and supervised practice.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving ethical or cultural complexity.',
      'Roles requiring ethical and cultural judgment should be reconsidered for this candidate. If unavoidable, provide close oversight and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s judgment demands.',
      'This is a critical constraint. Complex ethical and cultural decisions should be escalated, reviewed, or reassigned until capability is built.',
    ],
  },

  'Motivation & Drive': {
    exceptional: [
      'The candidate can be trusted with work requiring sustained intrinsic motivation, including tasks that are difficult, uninteresting, or without visible reward.',
      'Reliable for long-horizon work where effort must be self-generated. Very few candidates sustain drive this consistently.',
      'Assign the candidate challenging or unrewarding work where persistence matters — long projects, difficult problems, or low-visibility tasking.',
      'This is a genuine differentiator. Consider using the candidate as a model for sustained effort or to anchor difficult workstreams.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Very long or heavily unrewarding tasks may occasionally require reinforcement.',
      'The candidate shows good sustained effort in typical situations. No specific intervention required.',
      'Assign work with standard oversight. Motivation should hold across the range of normal tasking.',
      'This capability can be counted on. Consider stretching the candidate with gradually more demanding or less rewarded assignments.',
    ],
    capable: [
      'Suitable for standard roles. Where tasks are uninteresting or reward is distant, provide purpose and progress visibility.',
      'Acceptable for most purposes. Sustained effort may vary with task characteristics; monitor on unrewarding work.',
      'Provide clear purpose, progress milestones, and periodic recognition to sustain motivation on difficult tasking.',
      'If the role demands consistent self-driven effort, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a highly driven colleague on long or unrewarding tasks until capability is reinforced.',
      'Provide structured support — clear goals, progress visibility, and periodic reinforcement — particularly on tasks that lack external reward.',
      'Avoid placing the candidate in roles requiring sustained self-driven effort until capability improves.',
      'Set specific development goals around persistence and effort, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate work requiring sustained intrinsic motivation.',
      'Where drive is central to the role, reconsider fit or provide close supervision and frequent reinforcement.',
      'Structured development plan needed. Track sustained effort and output formally.',
      'This is a priority development area. Expect to invest time in building drive through structured goals, feedback, and staged challenge.',
    ],
    high_risk: [
      'Do not rely on this capability for work requiring self-generated or sustained effort.',
      'Roles requiring intrinsic drive should be reconsidered for this candidate. If unavoidable, provide close management and external structure.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s drive demands.',
      'This is a critical constraint. Long or unrewarding work should be reassigned or heavily structured until capability is built.',
    ],
  },

  'Learning Orientation': {
    exceptional: [
      'The candidate can be trusted with work where rapid learning and adjustment are essential. Consider using this strength in roles requiring continuous improvement or adaptation.',
      'Reliable for using feedback and failure as information rather than threat. Very few candidates learn this cleanly.',
      'Assign to work involving new domains, complex feedback, or high-development environments where learning speed matters.',
      'This is a genuine differentiator. Consider using the candidate as a model for learning culture or to support colleagues who find feedback difficult.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Very challenging feedback may take brief processing, but the pattern is reliable.',
      'The candidate learns from experience and adjusts behaviour appropriately. No specific intervention required.',
      'Assign work with standard oversight. Learning and development should occur as expected.',
      'This capability can be counted on. Consider stretching the candidate with progressively more challenging learning demands.',
    ],
    capable: [
      'Suitable for standard roles. Where feedback is challenging or development demands are high, provide structure and support.',
      'Acceptable for most purposes. The candidate learns adequately but may not actively seek development.',
      'Provide structured development conversations and clear expectations. Reinforce learning from experience.',
      'If the role demands continuous learning and adaptation, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a strong learner or mentor for development-intensive roles until capability is reinforced.',
      'Provide structured support — regular feedback, explicit development goals, and coaching — with clear expectations about behaviour change.',
      'Avoid placing the candidate in roles requiring rapid learning or frequent behaviour change until capability improves.',
      'Set specific development goals around receiving and acting on feedback, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles requiring continuous learning or rapid adaptation.',
      'Where learning orientation is central to the role, reconsider fit or provide close supervision and structured coaching.',
      'Structured development plan needed. Track learning behaviour and adjustment formally.',
      'This is a priority development area. Expect to invest time in building receptivity to feedback through structured coaching.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring learning or behaviour change.',
      'Roles requiring continuous learning should be reconsidered for this candidate. If unavoidable, provide intensive coaching and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s learning demands.',
      'This is a critical constraint. Development expectations should be carefully managed, or the role reconsidered.',
    ],
  },

  // ----- PERFORMANCE -----
  'Achievement Orientation': {
    exceptional: [
      'The candidate can be trusted with demanding goals and high-expectation environments. Consider using this strength in roles where ambition and self-driven delivery matter.',
      'Reliable for setting and reaching stretching targets without external pressure. Very few candidates consistently perform at this level.',
      'Assign to high-stakes, high-aspiration work — growth roles, turnaround situations, or programmes that require people to push beyond the baseline.',
      'This is a genuine differentiator. Consider using the candidate as a benchmark for performance culture or to raise ambition on a team.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Very demanding or self-directed goal pursuit may warrant periodic review.',
      'The candidate pursues goals reliably and delivers above minimum requirements. No specific intervention required.',
      'Assign to work with meaningful targets. The candidate should sustain effort and exceed baseline expectations.',
      'This capability can be counted on. Consider stretching the candidate with gradually more ambitious goals.',
    ],
    capable: [
      'Suitable for standard roles. Where stretch performance is essential, provide clarity, recognition, and clear milestones.',
      'Acceptable for most purposes. The candidate delivers to requirements but may not consistently exceed them.',
      'Provide clear targets, regular feedback, and recognition of effort to encourage movement beyond baseline delivery.',
      'If the role demands consistent aspiration and excellence, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a high-achieving colleague for ambitious or demanding work until capability is reinforced.',
      'Provide structured support — stretch goals, clear milestones, and recognition — to build confidence and drive.',
      'Avoid placing the candidate in roles requiring sustained self-driven ambition until capability improves.',
      'Set specific development goals around aspiration, effort, and goal pursuit, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles requiring sustained high achievement or stretch performance.',
      'Where ambition is central to the role, reconsider fit or provide close supervision and structured encouragement.',
      'Structured development plan needed. Track goal pursuit and delivery formally.',
      'This is a priority development area. Expect to invest time in building drive through progressively stretching tasking and recognition.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring ambition or high achievement.',
      'Roles requiring sustained aspiration should be reconsidered for this candidate. If unavoidable, provide external structure and close encouragement.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s achievement demands.',
      'This is a critical constraint. Performance expectations should be calibrated carefully, or the role reconsidered.',
    ],
  },

  'Goal Setting': {
    exceptional: [
      'The candidate can be trusted to set their own meaningful, well-aligned goals. Consider using this strength in roles requiring self-direction or strategic planning.',
      'Reliable for translating direction into specific, ambitious, structured objectives. Very few candidates set goals this well.',
      'Assign the candidate to roles involving goal frameworks, OKRs, or strategic planning where objective quality matters.',
      'This is a genuine differentiator. Consider using the candidate to raise goal quality across a team or to mentor others on goal practice.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Highly strategic or unfamiliar goal-setting may still warrant review.',
      'The candidate sets appropriate goals and structures them for progress. No specific intervention required.',
      'Assign work with standard oversight. Goals should be meaningful, specific, and aligned with priorities.',
      'This capability can be counted on. Consider stretching the candidate with more strategic or ambitious goal-setting.',
    ],
    capable: [
      'Suitable for standard roles. Where goals need to be strategic or highly specific, provide framing and review.',
      'Acceptable for most purposes. The candidate sets reasonable objectives but may not always align them tightly with wider priorities.',
      'Provide frameworks, examples, and structured planning conversations to raise goal quality.',
      'If the role demands consistent excellence in goal-setting, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a strong goal-setter for planning-intensive work until capability is reinforced.',
      'Provide structured support — frameworks, templates, and review — before goals are committed to.',
      'Avoid placing the candidate in roles requiring independent strategic goal-setting until capability improves.',
      'Set specific development goals around goal quality and alignment, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate to set meaningful or aligned goals without review.',
      'Where goal-setting is central to the role, reconsider fit or provide close supervision and structured frameworks.',
      'Structured development plan needed. Track goal quality and alignment formally.',
      'This is a priority development area. Expect to invest time in building goal-setting capability through structured coaching.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring independent goal-setting.',
      'Roles requiring strategic objective-setting should be reconsidered for this candidate. If unavoidable, provide goals or close support in defining them.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s planning demands.',
      'This is a critical constraint. Goals should be externally set or heavily supported until capability is built.',
    ],
  },

  'Initiative': {
    exceptional: [
      'The candidate can be trusted to act without prompting, spot issues early, and take ownership proactively. Consider using this strength in roles requiring self-direction or where problems must be caught early.',
      'Reliable for autonomous action within appropriate boundaries. Very few candidates operate this proactively without overstepping.',
      'Assign to roles with minimal supervision where initiative is essential — new areas, uncertain contexts, or roles where the scope is defined by what the candidate sees needs doing.',
      'This is a genuine differentiator. Consider using the candidate to model proactive ownership or to lead areas where problems must be prevented rather than reacted to.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Highly novel or politically sensitive situations may still warrant a check before acting.',
      'The candidate acts appropriately without being told. No specific intervention required.',
      'Assign work with standard oversight. Proactive action should occur as expected.',
      'This capability can be counted on. Consider stretching the candidate with progressively more autonomous or ambiguous assignments.',
    ],
    capable: [
      'Suitable for standard roles. Where autonomy is high or situations are ambiguous, make expectations about proactive action explicit.',
      'Acceptable for most purposes. The candidate may wait for direction in uncertain situations where action would be appropriate.',
      'Provide clarity on what action is authorised, and reinforce proactive behaviour when it occurs.',
      'If the role demands consistent initiative, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a strong self-starter on ambiguous or autonomous tasking until capability is reinforced.',
      'Provide structured support — explicit permission to act, clear boundaries, and regular reinforcement of proactive behaviour.',
      'Avoid placing the candidate in roles requiring independent action or early problem-spotting until capability improves.',
      'Set specific development goals around initiative and proactive ownership, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles requiring autonomous action or proactive problem-solving.',
      'Where initiative is central to the role, reconsider fit or provide close supervision and explicit direction.',
      'Structured development plan needed. Track proactive behaviour and issue-escalation patterns formally.',
      'This is a priority development area. Expect to invest time in building initiative through explicit permission, practice, and reinforcement.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring self-directed action.',
      'Roles requiring autonomy or proactive problem-solving should be reconsidered for this candidate. If unavoidable, provide close oversight and explicit instruction.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s autonomy demands.',
      'This is a critical constraint. Work should be closely directed and structured until capability is built.',
    ],
  },

  'Persistence': {
    exceptional: [
      'The candidate can be trusted with long, difficult, or slow-burn work that requires sustained commitment. Consider using this strength in roles where progress is measured over months or years.',
      'Reliable for continuing effort through setback and ambiguity. Very few candidates sustain commitment this cleanly.',
      'Assign to difficult programmes, research, complex problem-solving, or roles where visible progress is intermittent.',
      'This is a genuine differentiator. Consider using the candidate as an anchor on difficult workstreams or to support colleagues through demoralising periods.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Very prolonged or severe obstacles may still warrant support and review.',
      'The candidate continues effort through most difficulty. No specific intervention required.',
      'Assign work with standard oversight. Persistence should hold across normal obstacles.',
      'This capability can be counted on. Consider stretching the candidate with progressively longer or more difficult assignments.',
    ],
    capable: [
      'Suitable for standard roles. Where work is prolonged or repeatedly obstructed, provide intermediate goals and recovery time.',
      'Acceptable for most purposes. Momentum may dip under sustained or severe difficulty.',
      'Provide intermediate milestones, visible progress, and periodic encouragement during difficult phases.',
      'If the role demands sustained persistence under difficulty, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a persistent colleague on long or difficult work until capability is reinforced.',
      'Provide structured support — clear milestones, recovery time, and encouragement — particularly during prolonged difficulty.',
      'Avoid placing the candidate in roles requiring extended commitment through obstacles until capability improves.',
      'Set specific development goals around persistence and effort continuity, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to work requiring sustained effort through prolonged difficulty.',
      'Where persistence is central to the role, reconsider fit or provide close supervision and structured support.',
      'Structured development plan needed. Track work completion on long or difficult tasking formally.',
      'This is a priority development area. Expect to invest time in building persistence through staged difficulty and continuous support.',
    ],
    high_risk: [
      'Do not rely on this capability for work requiring sustained effort through difficulty.',
      'Roles requiring long-horizon commitment should be reconsidered for this candidate. If unavoidable, provide intensive structure and support.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s persistence demands.',
      'This is a critical constraint. Long or difficult work should be reassigned or heavily supported until capability is built.',
    ],
  },

  'Self-Management': {
    exceptional: [
      'The candidate can be trusted with autonomous work requiring disciplined time, priority, and commitment management. Consider using this strength in roles with minimal supervision.',
      'Reliable for organising complex work and delivering on commitments without external structure. Very few candidates manage themselves this effectively.',
      'Assign to high-autonomy roles, remote arrangements, or positions with competing demands that require effective prioritisation.',
      'This is a genuine differentiator. Consider using the candidate as a model for self-organisation or to support colleagues who need structure.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Extremely complex or high-volume demands may still warrant light structure.',
      'The candidate manages time and commitments effectively. No specific intervention required.',
      'Assign work with standard oversight. Self-management should be dependable.',
      'This capability can be counted on. Consider stretching the candidate with gradually more autonomous or complex work.',
    ],
    capable: [
      'Suitable for standard roles. Where demands compete or autonomy is high, provide structure, priorities, and check-ins.',
      'Acceptable for most purposes. The candidate manages routine work adequately but may need support under higher complexity.',
      'Provide clear priorities, deadlines, and periodic check-ins. The candidate performs better with some external structure.',
      'If the role demands sustained autonomous effectiveness, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a well-organised colleague for high-complexity or autonomous work until capability is reinforced.',
      'Provide structured support — priorities, commitment tracking, and regular check-ins — with gradual reduction as capability builds.',
      'Avoid placing the candidate in high-autonomy or competing-demand roles until capability improves.',
      'Set specific development goals around time management and prioritisation, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles requiring independent time and commitment management.',
      'Where self-management is central to the role, reconsider fit or provide close supervision and structured process.',
      'Structured development plan needed. Track delivery and prioritisation formally.',
      'This is a priority development area. Expect to invest time in building self-management through structured process and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for autonomous work.',
      'Roles requiring independent self-management should be reconsidered for this candidate. If unavoidable, provide intensive structure and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s autonomy demands.',
      'This is a critical constraint. Work should be externally structured and closely supported until capability is built.',
    ],
  },

  'Professional Reliability': {
    exceptional: [
      'The candidate can be trusted to deliver on commitments reliably, communicate changes proactively, and be depended upon without checks. Consider using this strength in high-trust roles.',
      'Reliable for consistent delivery, honest expectation management, and follow-through under pressure. Very few candidates are this dependable.',
      'Assign to roles where trust in delivery is critical — client-facing work, critical path tasking, or positions where others plan around the candidate\u2019s output.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for reliability or to anchor work that others depend upon.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Extreme pressure or unusually complex commitments may still warrant review.',
      'The candidate delivers on commitments and manages expectations appropriately. No specific intervention required.',
      'Assign work with standard oversight. Delivery should be dependable.',
      'This capability can be counted on. Consider stretching the candidate with progressively higher-trust or higher-stakes responsibilities.',
    ],
    capable: [
      'Suitable for standard roles. Where stakes are high or commitments are complex, provide commitment tracking and early-warning reinforcement.',
      'Acceptable for most purposes. Delivery is generally reliable; proactive communication of changes may lag.',
      'Provide structured commitment tracking and reinforce early communication of changes before they become issues.',
      'If the role demands consistent reliability under pressure, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a reliable colleague on high-stakes or high-visibility work until capability is reinforced.',
      'Provide structured support — commitment tracking, regular check-ins, and explicit expectations around early disclosure of changes.',
      'Avoid placing the candidate in roles where delivery reliability is critical until capability improves.',
      'Set specific development goals around follow-through and expectation management, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate\u2019s delivery without verification and follow-up.',
      'Where reliability is central to the role, reconsider fit or provide close supervision and formal commitment tracking.',
      'Structured development plan needed. Track commitment fulfilment and disclosure formally.',
      'This is a priority development area. Expect to invest time in building reliability through explicit structure and consequence.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring dependable delivery.',
      'Roles requiring reliable independent delivery should be reconsidered for this candidate. If unavoidable, provide close monitoring and frequent reinforcement.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s reliability demands.',
      'This is a critical constraint. Delivery should be closely monitored and verification built into every commitment until capability is built.',
    ],
  },

  'Quality Standards': {
    exceptional: [
      'The candidate can be trusted to judge and apply the right level of rigour across varied work. Consider using this strength where quality judgment matters more than rule-following.',
      'Reliable for producing output that is fit for purpose — neither over-polished nor under-delivered. Very few candidates calibrate this well.',
      'Assign to roles requiring judgment about what standard the work needs — senior delivery, client-facing output, or work where over-engineering is costly.',
      'This is a genuine differentiator. Consider using the candidate as a benchmark for quality calibration or to review the standard of work others produce.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Unusually ambiguous or high-stakes work may still warrant review.',
      'The candidate applies appropriate rigour and delivers work that meets expectations. No specific intervention required.',
      'Assign work with standard oversight. Quality should be consistent and well-judged.',
      'This capability can be counted on. Consider stretching the candidate with work requiring subtle quality judgment.',
    ],
    capable: [
      'Suitable for standard roles. Where the right standard is unclear or the stakes are high, provide explicit quality expectations.',
      'Acceptable for most purposes. Quality judgment may occasionally be off — either over- or under-investing effort.',
      'Provide clear examples of what \u201cgood\u201d looks like for specific outputs, and check in on judgment-heavy work.',
      'If the role demands consistent quality judgment, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with someone who has strong quality judgment on ambiguous or high-stakes work until capability is reinforced.',
      'Provide structured support — explicit quality criteria, examples, and review — before output is finalised.',
      'Avoid placing the candidate in roles requiring independent quality judgment until capability improves.',
      'Set specific development goals around calibrating rigour to consequence, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate work that depends on independent quality judgment.',
      'Where quality judgment is central to the role, reconsider fit or provide close supervision and explicit standards.',
      'Structured development plan needed. Track quality calibration and rework rates formally.',
      'This is a priority development area. Expect to invest time in building quality judgment through explicit examples and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring quality judgment.',
      'Roles requiring consistent quality standards should be reconsidered for this candidate. If unavoidable, provide explicit standards and close review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s quality demands.',
      'This is a critical constraint. All output should be reviewed against explicit standards until capability is built.',
    ],
  },

  'Productivity & Efficiency': {
    exceptional: [
      'The candidate can be trusted with operational decisions involving productivity and efficiency trade-offs. Consider using this strength in roles requiring judgment about how work is organised and measured.',
      'Reliable for reasoning about output, effort, and system-level effects. Very few candidates understand these trade-offs this well.',
      'Assign to work involving operational design, process improvement, or decisions where measurement and trade-offs matter.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for productivity thinking or to support colleagues on operational questions.',
    ],
    strong: [
      'Suitable for most roles requiring operational judgment. Highly complex optimisation questions may still warrant input from specialists.',
      'The candidate understands productivity concepts and applies them well. No specific intervention required.',
      'Assign to work involving operational metrics or efficiency questions with standard oversight.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex operational problems.',
    ],
    capable: [
      'Suitable for standard roles. Where operational trade-offs are complex or consequences are high, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler system-level effects.',
      'Provide structured frameworks, examples, and specialist support on complex operational questions.',
      'If the role demands consistent operational judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong operational insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring operational judgment until understanding improves.',
      'Set specific development goals around productivity and efficiency concepts, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving productivity or efficiency trade-offs.',
      'Where operational judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track operational reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving operational trade-offs.',
      'Roles requiring productivity or efficiency judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s operational demands.',
      'This is a critical constraint. Operational decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Quality & Effectiveness': {
    exceptional: [
      'The candidate can be trusted with decisions involving quality management, cost-of-quality trade-offs, and customer outcomes. Consider using this strength in roles where quality judgment matters.',
      'Reliable for reasoning about where quality investment pays off and where it becomes over-engineering. Very few candidates understand these trade-offs this well.',
      'Assign to work involving quality systems, process design, or decisions where quality and cost must be balanced.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for quality thinking or to support colleagues on quality questions.',
    ],
    strong: [
      'Suitable for most roles requiring quality judgment. Highly complex quality-system questions may still warrant specialist input.',
      'The candidate understands quality concepts and applies them well. No specific intervention required.',
      'Assign to work involving quality metrics or improvement questions with standard oversight.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex quality problems.',
    ],
    capable: [
      'Suitable for standard roles. Where quality trade-offs are complex or consequences are high, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler system-level effects.',
      'Provide structured frameworks, examples, and specialist support on complex quality questions.',
      'If the role demands consistent quality judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong quality insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring quality-system judgment until understanding improves.',
      'Set specific development goals around quality concepts and customer outcomes, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving quality trade-offs.',
      'Where quality judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track quality reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving quality trade-offs.',
      'Roles requiring quality judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s quality demands.',
      'This is a critical constraint. Quality decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Goal Achievement': {
    exceptional: [
      'The candidate can be trusted with designing, tracking, and interpreting goal systems. Consider using this strength in roles involving OKRs, KPIs, or performance frameworks.',
      'Reliable for reasoning about how goals drive alignment and where frameworks can distort behaviour. Very few candidates understand these systems this well.',
      'Assign to work involving goal-setting frameworks, performance tracking, or organisational alignment.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for goal-system design or to support colleagues on framework questions.',
    ],
    strong: [
      'Suitable for most roles requiring goal-framework fluency. Highly complex or novel goal-system questions may still warrant specialist input.',
      'The candidate understands goal frameworks and applies them well. No specific intervention required.',
      'Assign to work involving OKRs, KPIs, or performance tracking with standard oversight.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex goal-system problems.',
    ],
    capable: [
      'Suitable for standard roles. Where goal-system design or interpretation is complex, provide frameworks or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler distortion or alignment effects.',
      'Provide structured frameworks, examples, and specialist support on complex goal questions.',
      'If the role demands consistent goal-framework fluency, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong goal-system insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring goal-system design until understanding improves.',
      'Set specific development goals around goal frameworks and alignment, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving goal frameworks.',
      'Where goal-system fluency is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track goal-design reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving goal frameworks.',
      'Roles requiring goal-system fluency should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s goal demands.',
      'This is a critical constraint. Goal-system decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Employee Engagement': {
    exceptional: [
      'The candidate can be trusted with decisions affecting engagement, retention, and discretionary effort. Consider using this strength in roles involving people leadership, culture, or HR.',
      'Reliable for reasoning about the conditions that create genuine engagement versus surface compliance. Very few candidates understand these dynamics this well.',
      'Assign to work involving team culture, retention strategy, or decisions where engagement is a critical factor.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for people insight or to support managers on engagement questions.',
    ],
    strong: [
      'Suitable for most roles requiring people insight. Highly complex or culturally specific engagement questions may still warrant input from specialists.',
      'The candidate understands engagement drivers and applies them well. No specific intervention required.',
      'Assign to people-related work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex people questions.',
    ],
    capable: [
      'Suitable for standard roles. Where engagement issues are complex or entrenched, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler team or cultural factors.',
      'Provide structured frameworks, examples, and specialist support on complex engagement questions.',
      'If the role demands consistent people insight, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong people insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring engagement insight until understanding improves.',
      'Set specific development goals around engagement concepts and drivers, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving engagement or retention.',
      'Where people insight is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track engagement reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving engagement or retention.',
      'Roles requiring people insight should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s people demands.',
      'This is a critical constraint. People-related decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Financial & Operational Performance': {
    exceptional: [
      'The candidate can be trusted with decisions involving financial and operational trade-offs. Consider using this strength in roles requiring commercial judgment or operational leadership.',
      'Reliable for reasoning about margin, cash flow, ROI, and how operational choices affect financial outcomes. Very few candidates understand these dynamics this well.',
      'Assign to work involving financial analysis, operational decision-making, or decisions where commercial judgment is critical.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for financial reasoning or to support colleagues on commercial questions.',
    ],
    strong: [
      'Suitable for most roles requiring financial or operational judgment. Highly complex financial questions may still warrant specialist input.',
      'The candidate understands financial and operational concepts and applies them well. No specific intervention required.',
      'Assign to work involving financial or operational metrics with standard oversight.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex commercial problems.',
    ],
    capable: [
      'Suitable for standard roles. Where financial trade-offs are complex or consequences are high, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler balance-sheet or cash-flow effects.',
      'Provide structured frameworks, examples, and specialist support on complex financial questions.',
      'If the role demands consistent financial judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong financial insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring financial judgment until understanding improves.',
      'Set specific development goals around financial and operational concepts, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving financial trade-offs.',
      'Where financial judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track financial reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving financial trade-offs.',
      'Roles requiring financial judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s financial demands.',
      'This is a critical constraint. Financial decisions should be reviewed by others until understanding is built.',
    ],
  },

  // ----- GENERAL ASSESSMENT -----
  'Cognitive Ability': {
    exceptional: [
      'The candidate can be trusted with cognitively demanding work across domains. Consider using this strength in roles requiring rapid learning, complex reasoning, or novel problem solving.',
      'Reliable for unfamiliar material, complex analysis, and reasoning under pressure. Very few candidates perform at this level across all cognitive sections.',
      'Assign to roles where reasoning quality matters — analysis, strategy, technical design, or work involving unfamiliar problems.',
      'This is a genuine differentiator. Consider using the candidate on work that others find cognitively taxing.',
    ],
    strong: [
      'Suitable for most roles requiring cognitive work. Extremely demanding or unfamiliar material may still warrant review.',
      'The candidate reasons well across domains and learns quickly. No specific intervention required.',
      'Assign cognitively demanding work with standard oversight. Performance should hold across the normal range.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex cognitive work.',
    ],
    capable: [
      'Suitable for standard roles. Where reasoning is complex or material is unfamiliar, provide structure and review.',
      'Acceptable for most purposes. The candidate reasons adequately but may slow under complexity or pressure.',
      'Provide worked examples, additional time, or peer support on complex reasoning tasks.',
      'If the role demands consistent high-level reasoning, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger reasoner on complex or unfamiliar cognitive work until capability is reinforced.',
      'Provide structured support — worked examples, additional time, and review — before conclusions are relied on.',
      'Avoid placing the candidate in roles requiring rapid reasoning on unfamiliar material until capability improves.',
      'Set specific development goals around reasoning accuracy and speed, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate cognitively demanding work without review.',
      'Where reasoning is central to the role, reconsider fit or provide close supervision and scaffolding.',
      'Structured development plan needed. Track reasoning accuracy on complex tasks formally.',
      'This is a priority development area. Expect to invest time in supporting cognitive performance through structure and review.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring autonomous reasoning.',
      'Roles demanding cognitive work should be reconsidered for this candidate. If unavoidable, provide intensive structure and close review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s cognitive demands.',
      'This is a critical constraint. Cognitive work should be structured, bounded, and reviewed until capability is built.',
    ],
  },

  'Cultural & Attitudinal Fit': {
    exceptional: [
      'The candidate can be trusted as a cultural fit in most environments. Consider using this strength in roles where cultural alignment and engagement matter.',
      'Reliable across the cultural sections — values, adaptability, and engagement all point in the same direction. Very few candidates present this cleanly.',
      'Assign to roles where cultural contribution matters — team leadership, customer-facing work, or integration into established teams.',
      'This is a genuine differentiator. Consider using the candidate as a cultural anchor or to support colleagues in navigating organisational norms.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Very unfamiliar or high-pressure cultural contexts may still warrant support.',
      'The candidate fits well across the cultural sections. No specific intervention required.',
      'Assign work with standard oversight. Cultural integration should be dependable.',
      'This capability can be counted on. Consider stretching the candidate with progressively more demanding cultural contexts.',
    ],
    capable: [
      'Suitable for standard roles. Where cultural fit is critical or contexts are unfamiliar, provide framing and support.',
      'Acceptable for most purposes. The candidate aligns adequately but may not be distinctive in any cultural dimension.',
      'Provide clear cultural expectations, examples, and check-ins during integration.',
      'If the role demands strong cultural alignment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a culturally anchored colleague during integration and through early months.',
      'Provide structured support — explicit expectations, examples, and regular check-ins — around values, adaptability, and engagement.',
      'Avoid placing the candidate in roles where cultural fit is central until capability improves.',
      'Set specific development goals around cultural alignment and engagement, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not place the candidate in roles where cultural fit is critical without close support.',
      'Where cultural alignment is central to the role, reconsider fit or provide close supervision and explicit cultural framing.',
      'Structured development plan needed. Track cultural integration and engagement formally.',
      'This is a priority development area. Expect to invest time in building cultural alignment through explicit guidance and support.',
    ],
    high_risk: [
      'Do not rely on this capability for roles where cultural fit matters.',
      'Roles requiring cultural alignment should be reconsidered for this candidate. If unavoidable, provide intensive support and explicit expectations.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the organisation\u2019s culture.',
      'This is a critical constraint. Cultural fit should be carefully weighed before placement.',
    ],
  },

  'Emotional Intelligence': {
    exceptional: [
      'The candidate can be trusted with sensitive interpersonal situations. Consider using this strength in roles requiring negotiation, conflict resolution, or people leadership.',
      'Reliable for reading emotions accurately and responding in ways that defuse rather than escalate tension. Very few candidates navigate this cleanly.',
      'Assign to work involving high-stakes interpersonal situations — difficult conversations, mediation, or leading through change.',
      'This is a genuine differentiator. Consider using the candidate as a model for interpersonal effectiveness or to support colleagues in emotionally charged situations.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Extremely charged situations may still warrant support.',
      'The candidate reads and responds to emotions appropriately. No specific intervention required.',
      'Assign interpersonal work with standard oversight. Interactions should be well-judged.',
      'This capability can be counted on. Consider stretching the candidate with progressively more challenging interpersonal situations.',
    ],
    capable: [
      'Suitable for standard roles. Where emotions run high or dynamics are complex, provide support and reflection time.',
      'Acceptable for most purposes. The candidate manages routine interpersonal situations but may miss subtler signals.',
      'Provide structured support — debriefs, feedback, and coaching — on emotionally complex situations.',
      'If the role demands consistent emotional attunement, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone strong in emotional intelligence on complex or charged situations until capability is reinforced.',
      'Provide structured support — coaching, feedback, and reflection — on interpersonal interactions.',
      'Avoid placing the candidate in roles requiring consistent emotional attunement until capability improves.',
      'Set specific development goals around self-awareness and reading others, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles requiring emotional attunement without supervision.',
      'Where emotional intelligence is central to the role, reconsider fit or provide close coaching and support.',
      'Structured development plan needed. Track interpersonal effectiveness and feedback formally.',
      'This is a priority development area. Expect to invest time in building emotional awareness through coaching and practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles involving emotionally charged situations.',
      'Roles requiring emotional intelligence should be reconsidered for this candidate. If unavoidable, provide intensive support and close supervision.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s interpersonal demands.',
      'This is a critical constraint. Interpersonal-heavy work should be reassigned or closely supported until capability is built.',
    ],
  },

  'Ethics & Integrity': {
    exceptional: [
      'The candidate can be trusted with sensitive information, ethically complex decisions, and situations where the right call is costly. Consider using this strength where trust is critical.',
      'Reliable for ethical judgment under pressure. Very few candidates maintain standards this consistently.',
      'Assign to work involving confidential information, regulatory matters, or decisions where the easy path and the right path diverge.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for ethical conduct or to support colleagues in difficult situations.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Extreme pressure or high personal cost may still test the candidate, but the pattern is reliable.',
      'The candidate maintains standards and transparency under normal pressure. No specific intervention required.',
      'Assign ethical and confidential work with standard oversight. Behaviour should align with stated principles.',
      'This capability can be counted on. Consider stretching the candidate with roles requiring ethical judgment over time.',
    ],
    capable: [
      'Suitable for standard work. Where pressure to compromise is likely, provide explicit expectations and clear support.',
      'Acceptable for most purposes. Transparency may waver under high cost or visibility; verify in sensitive matters.',
      'Provide clear ethical frameworks, explicit expectations, and support when the right path is difficult.',
      'If the role demands consistent ethical reliability under pressure, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a trusted colleague for matters involving ethical judgment or sensitive information until capability is reinforced.',
      'Provide structured support — clear ethical expectations, escalation routes, and explicit consequences for compromise.',
      'Avoid assigning the candidate roles with significant ethical exposure until capability improves.',
      'Set specific development goals around transparency and consistency, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to roles involving sensitive information or ethical judgment.',
      'Where ethics and integrity are central to the role, reconsider fit or provide close supervision and formal monitoring.',
      'Structured development plan needed. Track ethical conduct and disclosure formally.',
      'This is a priority development area. Expect to invest time in building reliability and transparency through explicit structure and feedback.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions with ethical dimensions or sensitive information.',
      'Roles requiring integrity should be reconsidered for this candidate. If unavoidable, provide close oversight and explicit consequence.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s ethical demands.',
      'This is a critical constraint. Ethical exposure should be minimised or eliminated until capability is built.',
    ],
  },

  'Leadership & Management': {
    exceptional: [
      'The candidate can be trusted to lead teams. Consider using this strength in roles requiring direction-setting, people development, and accountability.',
      'Reliable for setting direction, developing capability, and holding people accountable without creating friction. Very few candidates lead this cleanly.',
      'Assign to roles where people leadership is central — team leadership, functional management, or turnaround situations.',
      'This is a genuine differentiator. Consider using the candidate to model leadership behaviour or to mentor less experienced managers.',
    ],
    strong: [
      'Suitable for most leadership roles with normal oversight. Highly complex team dynamics may still warrant support.',
      'The candidate leads effectively and manages people well. No specific intervention required.',
      'Assign leadership responsibilities with standard oversight. Direction, development, and accountability should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more demanding leadership scope.',
    ],
    capable: [
      'Suitable for standard leadership roles. Where dynamics are complex or stakes are high, provide support and coaching.',
      'Acceptable for most purposes. The candidate leads adequately but may struggle with difficult people situations.',
      'Provide frameworks, coaching, and peer support on complex leadership challenges.',
      'If the role demands consistent leadership excellence, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger leader on complex team or people situations until capability is reinforced.',
      'Provide structured support — leadership frameworks, coaching, and regular feedback — on direction-setting, development, and accountability.',
      'Avoid placing the candidate in roles requiring independent team leadership until capability improves.',
      'Set specific development goals around leadership and management practice, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate standalone leadership responsibility.',
      'Where leadership is central to the role, reconsider fit or provide close supervision and structured coaching.',
      'Structured development plan needed. Track leadership effectiveness and team outcomes formally.',
      'This is a priority development area. Expect to invest time in building leadership capability through supervised practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring team leadership.',
      'Leadership roles should be reconsidered for this candidate. If unavoidable, provide intensive support and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s leadership demands.',
      'This is a critical constraint. Team leadership should be supported or reassigned until capability is built.',
    ],
  },

  'Performance Metrics': {
    exceptional: [
      'The candidate can be trusted with metric design, selection, and interpretation. Consider using this strength in roles requiring measurement judgment.',
      'Reliable for reasoning about how metrics shape behaviour and where they distort. Very few candidates understand these dynamics this well.',
      'Assign to work involving performance frameworks, metric design, or decisions where measurement drives outcomes.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for measurement thinking or to support colleagues on metric questions.',
    ],
    strong: [
      'Suitable for most roles requiring measurement judgment. Highly complex or politically sensitive metric questions may still warrant specialist input.',
      'The candidate understands performance metrics and applies them well. No specific intervention required.',
      'Assign to work involving metrics or indicators with standard oversight.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex measurement problems.',
    ],
    capable: [
      'Suitable for standard roles. Where metric design or interpretation is complex, provide frameworks or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler distortion or interaction effects.',
      'Provide structured frameworks, examples, and specialist support on complex metric questions.',
      'If the role demands consistent measurement judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong measurement insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring metric design until understanding improves.',
      'Set specific development goals around metric concepts and behavioural effects, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving metric design or interpretation.',
      'Where measurement judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track metric reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving metrics or indicators.',
      'Roles requiring measurement judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s measurement demands.',
      'This is a critical constraint. Metric decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Personality & Behavioral': {
    exceptional: [
      'The candidate\u2019s behavioural profile is well-suited to most professional environments. Consider using this strength in roles aligned with their natural style.',
      'Reliable across a range of contexts — the candidate manages behavioural preferences consciously and adapts where needed.',
      'Assign to roles where the candidate\u2019s behavioural profile is clearly additive — reliability, collaboration, or appropriate assertiveness.',
      'This is a genuine differentiator. Consider using the candidate as a model for behavioural consistency or to support colleagues on style adaptation.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Very specific contexts may reveal mismatches, but the overall pattern is positive.',
      'The candidate\u2019s behavioural preferences are compatible with professional demands. No specific intervention required.',
      'Assign work with standard oversight. Behavioural fit should be dependable.',
      'This capability can be counted on. Consider stretching the candidate with gradually more varied role contexts.',
    ],
    capable: [
      'Suitable for standard roles. Where role requirements clearly diverge from behavioural preferences, provide support or consider fit.',
      'Acceptable for most purposes. The candidate manages behavioural demands adequately but may find some contexts effortful.',
      'Provide clear expectations and support where role demands diverge from natural style.',
      'If the role demands behavioural flexibility outside the candidate\u2019s preferences, targeted coaching is recommended.',
    ],
    developing: [
      'Pair the candidate with a coach or mentor on contexts where behavioural preferences create friction.',
      'Provide structured support — explicit expectations, feedback, and coaching — on behavioural adaptation.',
      'Avoid placing the candidate in roles that repeatedly demand behaviour outside their natural preferences until capability improves.',
      'Set specific development goals around behavioural flexibility, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not place the candidate in roles requiring behavioural adaptation without close support.',
      'Where behavioural fit is central to the role, reconsider fit or provide structured coaching and explicit expectations.',
      'Structured development plan needed. Track behavioural effectiveness and feedback formally.',
      'This is a priority development area. Expect to invest time in supporting behavioural adaptation through coaching and practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring behavioural flexibility.',
      'Roles demanding behaviour outside the candidate\u2019s preferences should be reconsidered. If unavoidable, provide intensive coaching and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s behavioural demands.',
      'This is a critical constraint. Role fit should be carefully weighed before placement.',
    ],
  },

  'Problem-Solving': {
    exceptional: [
      'The candidate can be trusted with complex or novel problems. Consider using this strength in roles requiring diagnosis, design, or independent resolution of ambiguous issues.',
      'Reliable for reasoning from symptom to cause and generating workable solutions. Very few candidates solve problems this effectively.',
      'Assign to work involving root-cause analysis, novel problems, or situations where the path forward is not obvious.',
      'This is a genuine differentiator. Consider using the candidate as a problem-solving anchor or to support colleagues facing difficult issues.',
    ],
    strong: [
      'Suitable for most roles requiring problem-solving. Highly novel or ambiguous problems may still warrant review.',
      'The candidate diagnoses problems effectively and reaches sound solutions. No specific intervention required.',
      'Assign problem-solving work with standard oversight. Solutions should be effective and well-reasoned.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex problems.',
    ],
    capable: [
      'Suitable for standard roles. Where problems are complex or novel, provide structure and review.',
      'Acceptable for most purposes. The candidate solves routine problems adequately but may struggle with ambiguity.',
      'Provide structured frameworks, peer support, and review on complex problems.',
      'If the role demands consistent high-level problem-solving, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger problem-solver on complex or novel work until capability is reinforced.',
      'Provide structured support — frameworks, worked examples, and review — before solutions are implemented.',
      'Avoid placing the candidate in roles requiring independent problem-solving until capability improves.',
      'Set specific development goals around diagnosis and option generation, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate independent problem-solving responsibility.',
      'Where problem-solving is central to the role, reconsider fit or provide close supervision and structured frameworks.',
      'Structured development plan needed. Track problem-solving outcomes formally.',
      'This is a priority development area. Expect to invest time in building problem-solving capability through structured practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring independent problem-solving.',
      'Roles demanding problem-solving should be reconsidered for this candidate. If unavoidable, provide intensive support and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s problem-solving demands.',
      'This is a critical constraint. Problems should be escalated or resolved with close support until capability is built.',
    ],
  },

  'Technical & Manufacturing': {
    exceptional: [
      'The candidate can be trusted with technical decisions in manufacturing environments. Consider using this strength in roles requiring technical judgment, process design, or troubleshooting.',
      'Reliable for reasoning about systems, failure modes, and operational trade-offs. Very few candidates combine technical depth with operational judgment this well.',
      'Assign to roles where technical judgment matters — process engineering, quality, maintenance strategy, or operational improvement.',
      'This is a genuine differentiator. Consider using the candidate as a technical reference point or to support colleagues on complex technical questions.',
    ],
    strong: [
      'Suitable for most roles requiring technical understanding. Highly novel or cross-disciplinary questions may still warrant specialist input.',
      'The candidate grasps technical concepts and applies them effectively. No specific intervention required.',
      'Assign technical work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex technical problems.',
    ],
    capable: [
      'Suitable for standard roles. Where technical questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or downstream effects.',
      'Provide structured frameworks, examples, and specialist support on complex technical questions.',
      'If the role demands consistent technical judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong technical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent technical judgment until understanding improves.',
      'Set specific development goals around technical concepts and their operational implications, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving technical trade-offs.',
      'Where technical judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track technical reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building technical understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving technical trade-offs.',
      'Roles requiring technical judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s technical demands.',
      'This is a critical constraint. Technical decisions should be reviewed by others until understanding is built.',
    ],
  },

  // ----- LEADERSHIP -----
  'People Management': {
    exceptional: [
      'The candidate can be trusted to manage people directly. Consider using this strength in roles requiring performance management, development, and accountability.',
      'Reliable for setting expectations, holding people accountable, and developing capability without creating friction. Very few candidates manage this cleanly.',
      'Assign to roles where people management is central — first-line management, team leadership, or supervision of experienced staff.',
      'This is a genuine differentiator. Consider using the candidate to model management practice or to mentor new managers.',
    ],
    strong: [
      'Suitable for most people management roles with normal oversight. Highly sensitive situations may still warrant support.',
      'The candidate manages people effectively and maintains appropriate standards. No specific intervention required.',
      'Assign people management responsibilities with standard oversight. Expectations and accountability should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex team structures.',
    ],
    capable: [
      'Suitable for standard management roles. Where performance issues or difficult conversations are likely, provide support and coaching.',
      'Acceptable for most purposes. The candidate manages adequately but may struggle with development or underperformance.',
      'Provide frameworks, coaching, and peer support on difficult people situations.',
      'If the role demands consistent management excellence, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger people manager on complex or sensitive situations until capability is reinforced.',
      'Provide structured support — management frameworks, coaching, and regular feedback — on expectations, development, and accountability.',
      'Avoid placing the candidate in roles requiring independent people management until capability improves.',
      'Set specific development goals around people management practice, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate standalone people management responsibility.',
      'Where people management is central to the role, reconsider fit or provide close supervision and structured coaching.',
      'Structured development plan needed. Track management effectiveness and team outcomes formally.',
      'This is a priority development area. Expect to invest time in building people management capability through supervised practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring people management.',
      'People management roles should be reconsidered for this candidate. If unavoidable, provide intensive support and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s people demands.',
      'This is a critical constraint. People management should be supported or reassigned until capability is built.',
    ],
  },

  'Strategic Thinking': {
    exceptional: [
      'The candidate can be trusted with strategic decisions and direction-setting. Consider using this strength in roles requiring long-term reasoning and trade-off judgment.',
      'Reliable for framing decisions with an appropriate time horizon and weighing options against multiple futures. Very few candidates think strategically this cleanly.',
      'Assign to work involving strategy, direction-setting, or decisions where short-term and long-term considerations must be balanced.',
      'This is a genuine differentiator. Consider using the candidate as a strategic sounding board or to support colleagues on long-horizon decisions.',
    ],
    strong: [
      'Suitable for most roles requiring strategic judgment. Highly ambiguous or novel strategic questions may still warrant input.',
      'The candidate reasons well about direction and trade-offs. No specific intervention required.',
      'Assign strategic work with standard oversight. Thinking should hold across the normal range.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex strategic contexts.',
    ],
    capable: [
      'Suitable for standard roles. Where strategic questions are complex or highly ambiguous, provide frameworks and support.',
      'Acceptable for most purposes. The candidate grasps basics but may default to operational reasoning under pressure.',
      'Provide structured frameworks, exposure to strategic contexts, and peer discussion on complex strategic questions.',
      'If the role demands consistent strategic thinking, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger strategic thinker on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — strategic frameworks, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent strategic judgment until capability improves.',
      'Set specific development goals around strategic reasoning and time horizon, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for strategic decisions.',
      'Where strategic thinking is central to the role, reconsider fit or provide close supervision and structured input.',
      'Structured development plan needed. Track strategic reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building strategic capability through structured exposure and coaching.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring strategic judgment.',
      'Roles demanding strategic thinking should be reconsidered for this candidate. If unavoidable, provide intensive support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s strategic demands.',
      'This is a critical constraint. Strategic decisions should be reviewed by others until capability is built.',
    ],
  },

  // ----- MANUFACTURING TECHNICAL -----
  'CIP & Maintenance': {
    exceptional: [
      'The candidate can be trusted with CIP and maintenance decisions. Consider using this strength in roles requiring practical judgment about cleaning systems, maintenance strategy, or compliance.',
      'Reliable for reasoning about CIP parameters, maintenance intervals, and the trade-offs between uptime, quality, and risk. Very few candidates combine practical depth with operational judgment this well.',
      'Assign to work involving CIP systems, maintenance planning, or decisions where cleaning and equipment reliability affect product safety or line availability.',
      'This is a genuine differentiator. Consider using the candidate as a practical reference point or to support colleagues on CIP and maintenance questions.',
    ],
    strong: [
      'Suitable for most roles requiring CIP or maintenance knowledge. Highly novel or cross-functional questions may still warrant specialist input.',
      'The candidate grasps CIP and maintenance practice and applies it effectively. No specific intervention required.',
      'Assign CIP or maintenance work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex practical problems.',
    ],
    capable: [
      'Suitable for standard roles. Where CIP or maintenance questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or risk implications.',
      'Provide structured frameworks, practical examples, and specialist support on complex CIP or maintenance questions.',
      'If the role demands consistent CIP or maintenance judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong practical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — practical training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent CIP or maintenance judgment until understanding improves.',
      'Set specific development goals around CIP and maintenance practice, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving CIP or maintenance trade-offs.',
      'Where CIP or maintenance judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track CIP and maintenance reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving CIP or maintenance.',
      'Roles requiring CIP or maintenance judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s practical demands.',
      'This is a critical constraint. CIP and maintenance decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Conveyors & Line Efficiency': {
    exceptional: [
      'The candidate can be trusted with line efficiency decisions. Consider using this strength in roles requiring judgment about conveyor systems, throughput, and stability.',
      'Reliable for reasoning about line balancing, accumulation, and the trade-offs between speed and reliability. Very few candidates combine practical depth with systemic judgment this well.',
      'Assign to work involving line design, throughput improvement, or decisions where conveyor behaviour affects overall performance.',
      'This is a genuine differentiator. Consider using the candidate as a practical reference point or to support colleagues on line efficiency questions.',
    ],
    strong: [
      'Suitable for most roles requiring line efficiency knowledge. Highly novel or system-level questions may still warrant specialist input.',
      'The candidate grasps conveyor and line dynamics and applies them effectively. No specific intervention required.',
      'Assign line efficiency work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex line problems.',
    ],
    capable: [
      'Suitable for standard roles. Where line efficiency questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler system effects.',
      'Provide structured frameworks, practical examples, and specialist support on complex line efficiency questions.',
      'If the role demands consistent line judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong practical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — practical training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent line efficiency judgment until understanding improves.',
      'Set specific development goals around line dynamics and throughput, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving line efficiency.',
      'Where line judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track line efficiency reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving line efficiency.',
      'Roles requiring line judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s operational demands.',
      'This is a critical constraint. Line efficiency decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Filling & Bottling': {
    exceptional: [
      'The candidate can be trusted with filling and bottling decisions. Consider using this strength in roles requiring judgment about fill quality, changeovers, and filler performance.',
      'Reliable for reasoning about fill parameters, foam, temperature effects, and the relationship between filler performance and downstream quality. Very few candidates combine practical depth with quality judgment this well.',
      'Assign to work involving filling operations, changeover improvement, or decisions where fill quality affects product outcomes.',
      'This is a genuine differentiator. Consider using the candidate as a practical reference point or to support colleagues on filling questions.',
    ],
    strong: [
      'Suitable for most roles requiring filling knowledge. Highly novel or system-level questions may still warrant specialist input.',
      'The candidate grasps filling parameters and applies them effectively. No specific intervention required.',
      'Assign filling work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex filling problems.',
    ],
    capable: [
      'Suitable for standard roles. Where filling questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions.',
      'Provide structured frameworks, practical examples, and specialist support on complex filling questions.',
      'If the role demands consistent filling judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong practical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — practical training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent filling judgment until understanding improves.',
      'Set specific development goals around fill parameters and quality, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving filling operations.',
      'Where filling judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track filling reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving filling operations.',
      'Roles requiring filling judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s operational demands.',
      'This is a critical constraint. Filling decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Packaging & Labeling': {
    exceptional: [
      'The candidate can be trusted with packaging and labeling decisions. Consider using this strength in roles requiring judgment about packaging processes, labeling accuracy, and compliance.',
      'Reliable for reasoning about material handling, line speed, and the relationship between labeling accuracy and product safety. Very few candidates combine practical depth with compliance awareness this well.',
      'Assign to work involving packaging operations, labeling integrity, or decisions where downstream quality and traceability matter.',
      'This is a genuine differentiator. Consider using the candidate as a practical reference point or to support colleagues on packaging questions.',
    ],
    strong: [
      'Suitable for most roles requiring packaging or labeling knowledge. Highly novel or system-level questions may still warrant specialist input.',
      'The candidate grasps packaging and labeling processes and applies them effectively. No specific intervention required.',
      'Assign packaging work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex packaging problems.',
    ],
    capable: [
      'Suitable for standard roles. Where packaging or labeling questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or compliance implications.',
      'Provide structured frameworks, practical examples, and specialist support on complex packaging questions.',
      'If the role demands consistent packaging or labeling judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong practical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — practical training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent packaging or labeling judgment until understanding improves.',
      'Set specific development goals around packaging processes and compliance, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving packaging or labeling.',
      'Where packaging or labeling judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track packaging reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving packaging or labeling.',
      'Roles requiring packaging or labeling judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s operational demands.',
      'This is a critical constraint. Packaging and labeling decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Safety & Efficiency': {
    exceptional: [
      'The candidate can be trusted with safety-efficiency trade-off decisions. Consider using this strength in roles where production pressure and safety requirements must be balanced.',
      'Reliable for reasoning about where safety and efficiency genuinely conflict, and where redesign can improve both. Very few candidates hold this judgment this cleanly.',
      'Assign to work involving production supervision, safety leadership, or decisions where efficiency pressures create risk.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for safety-efficiency judgment or to support colleagues on difficult trade-offs.',
    ],
    strong: [
      'Suitable for most roles requiring safety and efficiency judgment. Highly complex or novel trade-offs may still warrant specialist input.',
      'The candidate reasons well about safety and efficiency. No specific intervention required.',
      'Assign safety and efficiency work with standard oversight. Judgment should hold across normal situations.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex trade-off situations.',
    ],
    capable: [
      'Suitable for standard roles. Where trade-offs are complex or consequences are high, provide frameworks and review.',
      'Acceptable for most purposes. The candidate grasps basics but may default to one dimension without adequately considering the other.',
      'Provide structured frameworks, case discussion, and specialist support on complex safety-efficiency trade-offs.',
      'If the role demands consistent judgment in this area, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong safety-efficiency judgment on complex or high-stakes situations until capability is reinforced.',
      'Provide structured support — frameworks, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent safety-efficiency trade-off judgment until capability improves.',
      'Set specific development goals around balancing safety and efficiency, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving safety-efficiency trade-offs.',
      'Where this judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track safety-efficiency reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building this judgment through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving safety-efficiency trade-offs.',
      'Roles requiring this judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s demands.',
      'This is a critical constraint. Safety-efficiency decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Water Treatment & Quality': {
    exceptional: [
      'The candidate can be trusted with water treatment and quality decisions. Consider using this strength in roles requiring judgment about treatment processes, quality parameters, and compliance.',
      'Reliable for reasoning about treatment stages, water chemistry, and how quality issues propagate downstream. Very few candidates combine practical depth with quality judgment this well.',
      'Assign to work involving water treatment operations, quality control, or decisions where water quality affects product safety or compliance.',
      'This is a genuine differentiator. Consider using the candidate as a practical reference point or to support colleagues on water treatment questions.',
    ],
    strong: [
      'Suitable for most roles requiring water treatment knowledge. Highly novel or system-level questions may still warrant specialist input.',
      'The candidate grasps treatment processes and quality parameters and applies them effectively. No specific intervention required.',
      'Assign water treatment work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex treatment problems.',
    ],
    capable: [
      'Suitable for standard roles. Where treatment questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or quality implications.',
      'Provide structured frameworks, practical examples, and specialist support on complex water treatment questions.',
      'If the role demands consistent water treatment judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong practical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — practical training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent water treatment judgment until understanding improves.',
      'Set specific development goals around treatment processes and quality parameters, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving water treatment or quality.',
      'Where water treatment judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track water treatment reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving water treatment or quality.',
      'Roles requiring water treatment judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s operational demands.',
      'This is a critical constraint. Water treatment decisions should be reviewed by others until understanding is built.',
    ],
  },

  // ----- PRACTICAL -----
  'Aptitude': {
    exceptional: [
      'The candidate can be trusted with hands-on technical work requiring rapid learning and application. Consider using this strength in roles requiring practical adaptability.',
      'Reliable for picking up new tools, processes, or systems quickly and applying them accurately. Very few candidates learn practical content this efficiently.',
      'Assign to roles where practical learning speed matters — new production environments, cross-training, or hands-on technical roles with evolving demands.',
      'This is a genuine differentiator. Consider using the candidate as a fast learner in technical contexts or to support colleagues on new processes.',
    ],
    strong: [
      'Suitable for most hands-on roles with normal oversight. Very unfamiliar or complex practical content may take brief adjustment.',
      'The candidate learns practical content effectively and applies it reliably. No specific intervention required.',
      'Assign hands-on work with standard oversight. Learning and application should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex practical tasks.',
    ],
    capable: [
      'Suitable for standard roles. Where practical content is novel or complex, provide structured training and reinforcement.',
      'Acceptable for most purposes. The candidate learns routine content adequately but may need additional time on new material.',
      'Provide structured training, demonstration, and repetition where practical content is unfamiliar.',
      'If the role demands rapid practical learning, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a skilled mentor on unfamiliar or complex practical work until capability is reinforced.',
      'Provide structured support — demonstration, repetition, and supervised practice — before independent work.',
      'Avoid placing the candidate in roles requiring rapid practical adaptability until capability improves.',
      'Set specific development goals around practical learning and application, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate independent hands-on work requiring rapid learning.',
      'Where practical aptitude is central to the role, reconsider fit or provide close supervision and structured training.',
      'Structured development plan needed. Track practical learning and application formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured repetition and support.',
    ],
    high_risk: [
      'Do not rely on this capability for hands-on technical work requiring learning or application.',
      'Roles demanding practical aptitude should be reconsidered for this candidate. If unavoidable, provide intensive training and close supervision.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s practical demands.',
      'This is a critical constraint. Hands-on work should be closely supervised and broken into simple steps until capability is built.',
    ],
  },

  'Attitude': {
    exceptional: [
      'The candidate can be trusted with hands-on work requiring consistent professional standards without close supervision. Consider using this strength in practical roles with high trust.',
      'Reliable for reliable attendance, instruction-following, and sustained effort on practical work — including unrewarding tasks.',
      'Assign to practical roles where attitude sets the standard — team environments, unsupervised work, or roles with strong craft traditions.',
      'This is a genuine differentiator. Consider using the candidate as a model for workplace professionalism or to support colleagues on team norms.',
    ],
    strong: [
      'Suitable for most hands-on roles with normal oversight. Long or unrewarding practical tasking may occasionally require reinforcement.',
      'The candidate shows good attitude and work ethic in typical practical situations. No specific intervention required.',
      'Assign practical work with standard oversight. Attitude should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more demanding or autonomous practical work.',
    ],
    capable: [
      'Suitable for standard roles. Where tasks are unrewarding or supervision is light, provide purpose and reinforcement.',
      'Acceptable for most purposes. Engagement may vary with task characteristics; monitor on lower-reward practical work.',
      'Provide clear expectations, feedback, and visible connection between work and outcomes to sustain engagement.',
      'If the role demands consistent practical work ethic, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a highly engaged colleague on unrewarding or autonomous practical tasks until capability is reinforced.',
      'Provide structured support — clear expectations, regular feedback, and check-ins — particularly on tasks that are not intrinsically motivating.',
      'Avoid placing the candidate in practical roles with low supervision or low reward until capability improves.',
      'Set specific development goals around workplace reliability and effort, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate practical work requiring sustained self-driven effort.',
      'Where practical attitude is central to the role, reconsider fit or provide close supervision and frequent reinforcement.',
      'Structured development plan needed. Track attendance, effort, and follow-through formally.',
      'This is a priority development area. Expect to invest time in building practical work ethic through structured reinforcement.',
    ],
    high_risk: [
      'Do not rely on this capability for hands-on work requiring consistent professional standards.',
      'Practical roles should be reconsidered for this candidate. If unavoidable, provide close management and frequent reinforcement.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s practical demands.',
      'This is a critical constraint. Practical work should be closely supervised and externally structured until capability is built.',
    ],
  },

  'Safety': {
    exceptional: [
      'The candidate can be trusted in safety-critical environments. Consider using this strength in roles requiring strong hazard awareness and safe practice without close supervision.',
      'Reliable for identifying risks, applying controls correctly, and maintaining safe habits under production pressure. Very few candidates demonstrate safety this cleanly.',
      'Assign to roles where safety is critical — high-risk environments, unsupervised work areas, or positions that set safety tone for others.',
      'This is a genuine differentiator. Consider using the candidate as a safety champion or to support colleagues on hazard recognition.',
    ],
    strong: [
      'Suitable for most practical roles with normal oversight. Highly novel or unusual hazards may still warrant input.',
      'The candidate follows procedures, uses PPE, and maintains awareness of hazards. No specific intervention required.',
      'Assign practical work with standard oversight. Safety should hold across normal conditions.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex safety demands.',
    ],
    capable: [
      'Suitable for standard practical roles. Where hazards are complex or pressure is high, provide reinforcement and check-ins.',
      'Acceptable for most purposes. Safety awareness may dip under sustained pressure or in unfamiliar conditions.',
      'Provide structured safety reinforcement, reminders, and check-ins during high-pressure periods.',
      'If the role demands consistent safety judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a safety-conscious colleague on risk-prone tasks until capability is reinforced.',
      'Provide structured support — safety training, reminders, and supervision — particularly on tasks where shortcuts are tempting.',
      'Avoid placing the candidate in high-risk or unsupervised practical work until capability improves.',
      'Set specific development goals around hazard awareness and safe practice, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to safety-critical or unsupervised practical work.',
      'Where safety is central to the role, reconsider fit or provide close supervision and structured reinforcement.',
      'Structured development plan needed. Track safety behaviour and incidents formally.',
      'This is a priority development area. Expect to invest time in building safety awareness through structured training and supervision.',
    ],
    high_risk: [
      'Do not rely on this capability for safety-critical work.',
      'Roles with meaningful physical risk should be reconsidered for this candidate. If unavoidable, provide close supervision and enforce safety rules rigorously.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s safety demands.',
      'This is a critical constraint. The candidate should not work unsupervised in any role with safety-critical tasking.',
    ],
  },

  'Technical': {
    exceptional: [
      'The candidate can be trusted with independent hands-on technical work. Consider using this strength in roles requiring practical judgment, tool use, and problem recognition.',
      'Reliable for selecting correct approaches, working with materials and tools effectively, and adapting when conditions differ from expectations.',
      'Assign to roles where practical technical judgment matters — skilled trades, maintenance, or workshop-based work requiring autonomy.',
      'This is a genuine differentiator. Consider using the candidate as a practical reference point or to support colleagues on hands-on tasks.',
    ],
    strong: [
      'Suitable for most hands-on roles with normal oversight. Very unfamiliar or complex tasks may still warrant guidance.',
      'The candidate works effectively with tools and materials and reaches sound practical conclusions. No specific intervention required.',
      'Assign practical work with standard oversight. Technical judgment should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex practical tasks.',
    ],
    capable: [
      'Suitable for standard practical roles. Where tasks are complex or unfamiliar, provide guidance and review.',
      'Acceptable for most purposes. The candidate handles routine practical work adequately but may struggle with non-standard tasks.',
      'Provide structured guidance, demonstration, and review on complex or unfamiliar practical work.',
      'If the role demands consistent practical technical judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a skilled colleague on complex or unfamiliar practical work until capability is reinforced.',
      'Provide structured support — demonstration, supervised practice, and review — before independent work.',
      'Avoid placing the candidate in roles requiring independent practical judgment until capability improves.',
      'Set specific development goals around tool use, material selection, and practical reasoning, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate independent hands-on technical work.',
      'Where practical technical judgment is central to the role, reconsider fit or provide close supervision and structured guidance.',
      'Structured development plan needed. Track practical competence and error rates formally.',
      'This is a priority development area. Expect to invest time in building practical capability through structured training and supervised practice.',
    ],
    high_risk: [
      'Do not rely on this capability for hands-on technical work.',
      'Roles requiring practical judgment should be reconsidered for this candidate. If unavoidable, provide close supervision and simple, well-defined tasking.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s practical demands.',
      'This is a critical constraint. The candidate should not work unsupervised on practical tasks until capability is built.',
    ],
  },

  'Troubleshooting': {
    exceptional: [
      'The candidate can be trusted with independent fault-finding. Consider using this strength in roles requiring diagnostic reasoning, root-cause analysis, and corrective action.',
      'Reliable for reasoning from symptom to cause, testing hypotheses, and verifying fixes. Very few candidates fault-find this systematically.',
      'Assign to roles where diagnosis matters — maintenance, technical support, or operations roles where faults must be resolved quickly and correctly.',
      'This is a genuine differentiator. Consider using the candidate as a diagnostic reference point or to support colleagues on complex faults.',
    ],
    strong: [
      'Suitable for most roles requiring fault-finding. Highly complex or interacting faults may still warrant review.',
      'The candidate diagnoses most faults effectively and reaches workable solutions. No specific intervention required.',
      'Assign troubleshooting work with standard oversight. Diagnosis and correction should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex faults.',
    ],
    capable: [
      'Suitable for standard roles. Where faults are complex or interact, provide structure and review.',
      'Acceptable for most purposes. The candidate handles routine faults adequately but may struggle with unfamiliar ones.',
      'Provide structured diagnostic frameworks, peer support, and review on complex faults.',
      'If the role demands consistent diagnostic excellence, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger fault-finder on complex or unfamiliar problems until capability is reinforced.',
      'Provide structured support — diagnostic frameworks, case practice, and review of reasoning — before solutions are applied.',
      'Avoid placing the candidate in roles requiring independent troubleshooting until capability improves.',
      'Set specific development goals around diagnosis and verification, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate independent troubleshooting responsibility.',
      'Where fault-finding is central to the role, reconsider fit or provide close supervision and structured frameworks.',
      'Structured development plan needed. Track diagnostic accuracy and outcomes formally.',
      'This is a priority development area. Expect to invest time in building diagnostic capability through structured practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring independent fault-finding.',
      'Roles demanding troubleshooting should be reconsidered for this candidate. If unavoidable, provide intensive support and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s diagnostic demands.',
      'This is a critical constraint. Faults should be resolved with close support until capability is built.',
    ],
  },

  // ----- TECHNICAL COMPETENCE -----
  'Communication & Teamwork': {
    exceptional: [
      'The candidate can be trusted as a communication and teamwork anchor in technical settings. Consider using this strength in teams where coordination and knowledge-sharing matter.',
      'Reliable for clear technical communication, accurate handovers, and effective collaboration on shared tasks. Very few candidates manage this so cleanly.',
      'Assign to roles requiring technical coordination — shift handovers, cross-functional projects, or teams where miscommunication carries risk.',
      'This is a genuine differentiator. Consider using the candidate to model communication norms or to bridge technical and non-technical audiences.',
    ],
    strong: [
      'Suitable for most technical team settings with normal oversight. Highly charged or complex team situations may still warrant support.',
      'The candidate communicates technical information clearly and works well with colleagues. No specific intervention required.',
      'Assign team-based technical work with standard oversight. Communication and coordination should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex team coordination.',
    ],
    capable: [
      'Suitable for standard technical roles. Where high-pressure coordination or cross-functional work is likely, provide structure and check-ins.',
      'Acceptable for most purposes. The candidate handles routine technical communication adequately but may struggle under pressure.',
      'Provide clear protocols, structured handovers, and reinforcement on knowledge-sharing expectations.',
      'If the role demands consistent technical communication, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a strong technical communicator during high-pressure or interdependent work until capability is reinforced.',
      'Provide structured support — communication protocols, clear roles, and check-ins — before shared work begins.',
      'Avoid placing the candidate in roles requiring fast, precise technical coordination until capability improves.',
      'Set specific development goals around technical communication and team contribution, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to interdependent technical tasks without close supervision.',
      'Where technical communication is central to the role, reconsider fit or provide close supervision and structured process.',
      'Structured development plan needed. Track handover quality, escalation, and peer feedback formally.',
      'This is a priority development area. Expect to invest time in building communication and teamwork capability through structured practice.',
    ],
    high_risk: [
      'Do not rely on this capability for interdependent technical work.',
      'Roles requiring close technical teamwork should be reconsidered for this candidate. If unavoidable, provide close supervision and explicit process.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s coordination demands.',
      'This is a critical constraint. Interdependent work should be highly structured and closely supported until capability is built.',
    ],
  },

  'Learning Agility': {
    exceptional: [
      'The candidate can be trusted with technical work where rapid learning and adjustment are essential. Consider using this strength in roles facing continuous technical change.',
      'Reliable for absorbing new technical content quickly and applying it under changing conditions. Very few candidates learn this efficiently.',
      'Assign to roles involving new systems, evolving technology, or environments where technical demands shift frequently.',
      'This is a genuine differentiator. Consider using the candidate to model learning behaviour or to support colleagues on unfamiliar technical content.',
    ],
    strong: [
      'Suitable for most technical roles with normal oversight. Very novel or highly complex content may take brief adjustment.',
      'The candidate learns technical content effectively and applies it to practical work. No specific intervention required.',
      'Assign technical work with standard oversight. Learning and application should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more unfamiliar technical demands.',
    ],
    capable: [
      'Suitable for standard technical roles. Where content is novel or change is rapid, provide structure and reinforcement.',
      'Acceptable for most purposes. The candidate learns routine content adequately but may need additional time on new material.',
      'Provide structured training, reinforcement, and reference material where technical content is unfamiliar.',
      'If the role demands rapid technical learning, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a strong technical learner on unfamiliar or fast-changing work until capability is reinforced.',
      'Provide structured support — training, demonstration, and repeated exposure — before new content is relied upon.',
      'Avoid placing the candidate in roles requiring rapid technical adaptation until capability improves.',
      'Set specific development goals around technical learning and application, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate technical work requiring rapid learning or frequent adaptation.',
      'Where technical learning agility is central to the role, reconsider fit or provide close supervision and structured training.',
      'Structured development plan needed. Track technical learning and application formally.',
      'This is a priority development area. Expect to invest time in building learning agility through structured repetition and support.',
    ],
    high_risk: [
      'Do not rely on this capability for technical work requiring learning or adaptation.',
      'Roles demanding technical learning agility should be reconsidered for this candidate. If unavoidable, provide intensive training and close supervision.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s learning demands.',
      'This is a critical constraint. Technical work requiring rapid learning should be reassigned or heavily supported until capability is built.',
    ],
  },

  'Measurement & Engineering Units': {
    exceptional: [
      'The candidate can be trusted with precision measurement and unit work. Consider using this strength in roles where tolerance, specification, and accuracy matter.',
      'Reliable for reading drawings, converting units, and reasoning about tolerances with confidence. Very few candidates combine this precision with practical judgment.',
      'Assign to roles involving specification interpretation, tolerance-critical work, or where measurement errors carry real cost.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for precision work or to check others\u2019 measurement.',
    ],
    strong: [
      'Suitable for most roles requiring measurement accuracy. Unusual units or complex tolerance interactions may still warrant checking.',
      'The candidate reads specifications correctly and works reliably with units and tolerances. No specific intervention required.',
      'Assign measurement-critical work with standard oversight. Precision should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex measurement problems.',
    ],
    capable: [
      'Suitable for standard roles. Where unusual units or complex tolerances are involved, provide reference material and checking.',
      'Acceptable for most purposes. The candidate handles routine measurement adequately but may miss subtle inconsistencies.',
      'Provide reference tables, standard practice documents, and checking on non-standard work.',
      'If the role demands consistent precision, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a precision-focused colleague on complex or non-standard measurement work until capability is reinforced.',
      'Provide structured support — reference material, practice, and checking — before measurement work is relied upon.',
      'Avoid placing the candidate in roles requiring independent precision work until capability improves.',
      'Set specific development goals around unit conversions and tolerance reasoning, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate\u2019s measurement work without verification.',
      'Where measurement precision is central to the role, reconsider fit or provide close supervision and systematic checking.',
      'Structured development plan needed. Track measurement accuracy and rework rates formally.',
      'This is a priority development area. Expect to invest time in building measurement capability through structured practice.',
    ],
    high_risk: [
      'Do not rely on this capability for measurement-critical work.',
      'Roles requiring precision measurement should be reconsidered for this candidate. If unavoidable, provide independent verification of all measurement work.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s precision demands.',
      'This is a critical constraint. All measurement work should be independently verified until capability is built.',
    ],
  },

  'Ownership & Integrity': {
    exceptional: [
      'The candidate can be trusted with valuable equipment, work quality, and honest reporting. Consider using this strength in roles requiring high trust and low oversight.',
      'Reliable for taking responsibility, reporting problems promptly, and treating equipment and materials with care. Very few candidates hold these standards this consistently.',
      'Assign to roles involving valuable equipment, critical work, or environments where honest reporting matters most.',
      'This is a genuine differentiator. Consider using the candidate as a model for ownership culture or to reinforce professional standards in a team.',
    ],
    strong: [
      'Suitable for most roles with normal oversight. Difficult or embarrassing situations may occasionally test this, but the pattern is reliable.',
      'The candidate takes responsibility for their work and reports issues honestly. No specific intervention required.',
      'Assign work with standard oversight. Ownership and reporting should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively higher-trust responsibilities.',
    ],
    capable: [
      'Suitable for standard roles. Where difficult disclosures or high-consequence mistakes are likely, provide framing and support.',
      'Acceptable for most purposes. Ownership is reliable on routine matters; disclosure may lag when stakes rise.',
      'Provide clear expectations around reporting, and reinforce honest disclosure when it occurs.',
      'If the role demands consistent integrity under pressure, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a trusted colleague on high-consequence or sensitive work until capability is reinforced.',
      'Provide structured support — explicit reporting expectations, escalation routes, and consequences for concealment.',
      'Avoid placing the candidate in roles requiring independent ownership of consequential outcomes until capability improves.',
      'Set specific development goals around responsibility and honest reporting, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate independent ownership of high-consequence work.',
      'Where ownership and integrity are central to the role, reconsider fit or provide close supervision and formal monitoring.',
      'Structured development plan needed. Track reporting behaviour and equipment care formally.',
      'This is a priority development area. Expect to invest time in building ownership and integrity through explicit structure and consequence.',
    ],
    high_risk: [
      'Do not rely on this capability for work requiring responsibility or honest reporting.',
      'Roles requiring high trust should be reconsidered for this candidate. If unavoidable, provide close oversight and explicit consequence.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s trust demands.',
      'This is a critical constraint. The candidate should not work unsupervised with valuable or critical equipment.',
    ],
  },

  'Problem Solving & Troubleshooting': {
    exceptional: [
      'The candidate can be trusted with independent diagnostic work. Consider using this strength in roles requiring systematic fault-finding, root-cause analysis, and corrective action.',
      'Reliable for reasoning from symptom to cause, testing hypotheses rigorously, and verifying fixes. Very few candidates diagnose this cleanly.',
      'Assign to roles where diagnosis quality matters — maintenance, technical support, or operations roles with real consequences for error.',
      'This is a genuine differentiator. Consider using the candidate as a diagnostic reference point or to support colleagues on complex faults.',
    ],
    strong: [
      'Suitable for most roles requiring diagnosis. Very complex or interacting faults may still warrant review.',
      'The candidate diagnoses most problems effectively and reaches workable solutions. No specific intervention required.',
      'Assign diagnostic work with standard oversight. Reasoning should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex diagnostic problems.',
    ],
    capable: [
      'Suitable for standard roles. Where faults are complex or interacting, provide structure and review.',
      'Acceptable for most purposes. The candidate handles routine diagnosis adequately but may struggle with unfamiliar problems.',
      'Provide structured diagnostic frameworks, peer support, and review on complex problems.',
      'If the role demands consistent diagnostic excellence, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a stronger diagnostician on complex or unfamiliar problems until capability is reinforced.',
      'Provide structured support — diagnostic frameworks, case practice, and review of reasoning — before solutions are applied.',
      'Avoid placing the candidate in roles requiring independent diagnosis until capability improves.',
      'Set specific development goals around systematic diagnosis and verification, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate independent diagnostic responsibility.',
      'Where diagnosis is central to the role, reconsider fit or provide close supervision and structured frameworks.',
      'Structured development plan needed. Track diagnostic accuracy and outcomes formally.',
      'This is a priority development area. Expect to invest time in building diagnostic capability through structured practice.',
    ],
    high_risk: [
      'Do not rely on this capability for roles requiring independent diagnosis.',
      'Roles demanding diagnostic capability should be reconsidered for this candidate. If unavoidable, provide intensive support and close oversight.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s diagnostic demands.',
      'This is a critical constraint. Faults should be resolved with close support until capability is built.',
    ],
  },

  'Safety & Risk Awareness': {
    exceptional: [
      'The candidate can be trusted in safety-critical technical environments. Consider using this strength in roles requiring strong hazard recognition and safe judgment under pressure.',
      'Reliable for identifying risks, applying controls correctly, and maintaining safety as a personal standard. Very few candidates demonstrate this consistently.',
      'Assign to roles where safety matters most — high-risk environments, unsupervised work, or positions that set safety tone for others.',
      'This is a genuine differentiator. Consider using the candidate as a safety champion or to support colleagues on hazard recognition.',
    ],
    strong: [
      'Suitable for most technical roles with normal oversight. Novel or unusual hazards may still warrant input.',
      'The candidate follows procedures, uses PPE, and maintains awareness of hazards. No specific intervention required.',
      'Assign technical work with standard oversight. Safety should hold across normal conditions.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex safety demands.',
    ],
    capable: [
      'Suitable for standard technical roles. Where hazards are complex or pressure is high, provide reinforcement and check-ins.',
      'Acceptable for most purposes. Safety awareness may dip under sustained pressure or in unfamiliar conditions.',
      'Provide structured safety reinforcement, reminders, and check-ins during high-pressure periods.',
      'If the role demands consistent safety judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with a safety-conscious colleague on risk-prone tasks until capability is reinforced.',
      'Provide structured support — safety training, reminders, and supervision — particularly on tasks where shortcuts are tempting.',
      'Avoid placing the candidate in high-risk or unsupervised technical work until capability improves.',
      'Set specific development goals around hazard awareness and safe practice, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not assign the candidate to safety-critical or unsupervised technical work.',
      'Where safety is central to the role, reconsider fit or provide close supervision and structured reinforcement.',
      'Structured development plan needed. Track safety behaviour and incidents formally.',
      'This is a priority development area. Expect to invest time in building safety awareness through structured training and supervision.',
    ],
    high_risk: [
      'Do not rely on this capability for safety-critical technical work.',
      'Roles with meaningful physical risk should be reconsidered for this candidate. If unavoidable, provide close supervision and enforce safety rules rigorously.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s safety demands.',
      'This is a critical constraint. The candidate should not work unsupervised in any role with safety-critical tasking.',
    ],
  },

  'Technical Fundamentals': {
    exceptional: [
      'The candidate can be trusted with technical work requiring sound foundational understanding. Consider using this strength in roles where first-principles reasoning matters.',
      'Reliable for applying core concepts accurately across contexts and reasoning from principle when needed. Very few candidates hold this depth.',
      'Assign to roles requiring conceptual judgment — engineering support, technical design, or work where rules must be applied intelligently.',
      'This is a genuine differentiator. Consider using the candidate as a technical reference point or to support colleagues on foundational questions.',
    ],
    strong: [
      'Suitable for most technical roles with normal oversight. Highly novel or cross-disciplinary questions may still warrant specialist input.',
      'The candidate grasps core concepts and applies them effectively. No specific intervention required.',
      'Assign technical work with standard oversight. Foundational knowledge should hold.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex technical problems.',
    ],
    capable: [
      'Suitable for standard technical roles. Where complex or system-level questions arise, provide guidance and review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or cross-domain links.',
      'Provide structured frameworks, worked examples, and specialist support on complex technical questions.',
      'If the role demands consistent foundational depth, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong foundational depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, worked examples, and review — before technical decisions are made.',
      'Avoid placing the candidate in roles requiring independent foundational judgment until understanding improves.',
      'Set specific development goals around core technical concepts and their application, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions requiring foundational technical judgment.',
      'Where technical fundamentals are central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track technical reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building foundational understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for technical work requiring foundational knowledge.',
      'Roles demanding technical fundamentals should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s technical demands.',
      'This is a critical constraint. Technical decisions should be reviewed by others until understanding is built.',
    ],
  },

  // ----- SINGLE-SECTION TYPES -----
  'Manufacturing': {
    exceptional: [
      'The candidate can be trusted with manufacturing decisions across the breadth of a production environment. Consider using this strength in roles requiring operational judgment.',
      'Reliable for reasoning about processes, constraints, quality, and safety — and how they interact. Very few candidates combine this breadth with depth.',
      'Assign to roles requiring operational judgment — production supervision, process improvement, or cross-functional manufacturing work.',
      'This is a genuine differentiator. Consider using the candidate as a reference point across production functions or to support colleagues on operational questions.',
    ],
    strong: [
      'Suitable for most manufacturing roles with normal oversight. Highly novel or cross-functional questions may still warrant specialist input.',
      'The candidate grasps manufacturing processes and applies them effectively. No specific intervention required.',
      'Assign manufacturing work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex operational problems.',
    ],
    capable: [
      'Suitable for standard roles. Where production questions are complex or consequences are high, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler process interactions.',
      'Provide structured frameworks, examples, and specialist support on complex manufacturing questions.',
      'If the role demands consistent operational judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong operational insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — process training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent manufacturing judgment until understanding improves.',
      'Set specific development goals around production processes and trade-offs, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving manufacturing trade-offs.',
      'Where operational judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track manufacturing reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving manufacturing.',
      'Roles requiring operational judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s operational demands.',
      'This is a critical constraint. Manufacturing decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Mechanical Engineering': {
    exceptional: [
      'The candidate can be trusted with mechanical engineering decisions. Consider using this strength in roles requiring mechanical judgment, design reasoning, or failure analysis.',
      'Reliable for reasoning about forces, materials, motion, and machine design. Very few candidates combine theory and application this well.',
      'Assign to roles involving mechanical design, analysis, or decisions where mechanical choices affect safety, cost, or maintainability.',
      'This is a genuine differentiator. Consider using the candidate as a technical reference point or to support colleagues on complex mechanical problems.',
    ],
    strong: [
      'Suitable for most roles requiring mechanical understanding. Highly novel or cross-disciplinary questions may still warrant specialist input.',
      'The candidate grasps mechanical principles and applies them effectively. No specific intervention required.',
      'Assign mechanical work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex mechanical problems.',
    ],
    capable: [
      'Suitable for standard roles. Where mechanical questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or failure modes.',
      'Provide structured frameworks, worked examples, and specialist support on complex mechanical questions.',
      'If the role demands consistent mechanical judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong mechanical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent mechanical judgment until understanding improves.',
      'Set specific development goals around mechanical principles and their application, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving mechanical trade-offs.',
      'Where mechanical judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track mechanical reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building mechanical understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving mechanical engineering.',
      'Roles requiring mechanical judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s mechanical demands.',
      'This is a critical constraint. Mechanical decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Electrical Engineering': {
    exceptional: [
      'The candidate can be trusted with electrical engineering decisions. Consider using this strength in roles requiring electrical judgment, system reasoning, or fault analysis.',
      'Reliable for reasoning about circuits, power, control, and electrical safety. Very few candidates combine theory and application this well.',
      'Assign to roles involving electrical design, analysis, or decisions where electrical choices affect safety, cost, or reliability.',
      'This is a genuine differentiator. Consider using the candidate as a technical reference point or to support colleagues on complex electrical problems.',
    ],
    strong: [
      'Suitable for most roles requiring electrical understanding. Highly novel or cross-disciplinary questions may still warrant specialist input.',
      'The candidate grasps electrical principles and applies them effectively. No specific intervention required.',
      'Assign electrical work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex electrical problems.',
    ],
    capable: [
      'Suitable for standard roles. Where electrical questions are complex or consequences are high, provide specialist input or review.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler interactions or fault behaviour.',
      'Provide structured frameworks, worked examples, and specialist support on complex electrical questions.',
      'If the role demands consistent electrical judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong electrical depth on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent electrical judgment until understanding improves.',
      'Set specific development goals around electrical principles and their application, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving electrical trade-offs.',
      'Where electrical judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track electrical reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building electrical understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving electrical engineering.',
      'Roles requiring electrical judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s electrical demands.',
      'This is a critical constraint. Electrical decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Logistics & Supply Chain': {
    exceptional: [
      'The candidate can be trusted with logistics and supply chain decisions. Consider using this strength in roles requiring planning, coordination, or network judgment.',
      'Reliable for reasoning about trade-offs between cost, speed, and service, and where local decisions create downstream effects. Very few candidates hold this systemic view.',
      'Assign to roles involving supply planning, logistics operations, or decisions where network effects matter.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for supply chain thinking or to support colleagues on complex coordination problems.',
    ],
    strong: [
      'Suitable for most roles requiring logistics understanding. Highly complex or novel network questions may still warrant specialist input.',
      'The candidate grasps logistics concepts and applies them effectively. No specific intervention required.',
      'Assign logistics work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex supply chain problems.',
    ],
    capable: [
      'Suitable for standard roles. Where logistics trade-offs are complex or consequences are high, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler network or lead-time effects.',
      'Provide structured frameworks, examples, and specialist support on complex logistics questions.',
      'If the role demands consistent logistics judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong supply chain insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent logistics judgment until understanding improves.',
      'Set specific development goals around planning, inventory, and coordination, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving logistics or supply chain trade-offs.',
      'Where logistics judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track logistics reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving logistics or supply chain.',
      'Roles requiring logistics judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s logistics demands.',
      'This is a critical constraint. Logistics decisions should be reviewed by others until understanding is built.',
    ],
  },

  'Quality Assurance': {
    exceptional: [
      'The candidate can be trusted with quality assurance decisions. Consider using this strength in roles requiring standards judgment, inspection reasoning, or improvement work.',
      'Reliable for reasoning about prevention versus detection, cost of quality, and the link between quality and customer outcomes. Very few candidates hold this view.',
      'Assign to roles involving quality systems, inspection strategy, or continuous improvement where judgment matters.',
      'This is a genuine differentiator. Consider using the candidate as a reference point for quality thinking or to support colleagues on complex quality problems.',
    ],
    strong: [
      'Suitable for most roles requiring quality understanding. Highly complex or novel quality-system questions may still warrant specialist input.',
      'The candidate grasps quality concepts and applies them effectively. No specific intervention required.',
      'Assign quality work with standard oversight. Reasoning should be sound.',
      'This capability can be counted on. Consider stretching the candidate with progressively more complex quality problems.',
    ],
    capable: [
      'Suitable for standard roles. Where quality trade-offs are complex or consequences are high, provide analysis or specialist input.',
      'Acceptable for most purposes. The candidate grasps basics but may miss subtler system-level or customer effects.',
      'Provide structured frameworks, examples, and specialist support on complex quality questions.',
      'If the role demands consistent quality judgment, targeted development is recommended.',
    ],
    developing: [
      'Pair the candidate with someone with strong quality insight on complex or high-stakes questions until capability is reinforced.',
      'Provide structured support — concept training, case discussion, and review of reasoning — before decisions are made.',
      'Avoid placing the candidate in roles requiring independent quality-system judgment until understanding improves.',
      'Set specific development goals around quality concepts and improvement reasoning, and review progress quarterly.',
    ],
    at_risk: [
      'Significant support is required. Do not rely on the candidate for decisions involving quality systems or improvement.',
      'Where quality judgment is central to the role, reconsider fit or provide close supervision and specialist input.',
      'Structured development plan needed. Track quality reasoning and outcomes formally.',
      'This is a priority development area. Expect to invest time in building conceptual understanding through structured learning.',
    ],
    high_risk: [
      'Do not rely on this capability for decisions involving quality assurance.',
      'Roles requiring quality judgment should be reconsidered for this candidate. If unavoidable, provide specialist support and formal review.',
      'Substantial, ongoing support would be needed. Consider whether this is the right fit for the role\u2019s quality demands.',
      'This is a critical constraint. Quality decisions should be reviewed by others until understanding is built.',
    ],
  },
};

// ============================================================
// 4. HELPERS
// ============================================================

// Deterministic hash for picking a variant. Same seed → same index.
function hashString(str) {
  let hash = 0;
  const text = String(str || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Convert percentage → band key.
export function getBandKey(percentage) {
  const value = Number(percentage);
  if (!Number.isFinite(value)) return 'capable';
  if (value >= 85) return 'exceptional';
  if (value >= 75) return 'strong';
  if (value >= 65) return 'capable';
  if (value >= 55) return 'developing';
  if (value >= 40) return 'at_risk';
  return 'high_risk';
}

// Pick a summary or implication phrase.
//   type: 'summary' | 'implication'
//   seed: any string — we recommend `${candidateId}:${section}:${percentage}`
export function pickNarrative(section, band, seed, type) {
  const bank = type === 'implication' ? sectionImplications : sectionSummaries;
  const generic = type === 'implication' ? genericImplications : genericSummaries;

  const sectionBank = bank[section] || {};
  const variants = sectionBank[band] || generic[band] || [];
  if (variants.length === 0) return '';

  const idx = hashString(`${seed}:${section}:${band}:${type}`) % variants.length;
  return variants[idx];
}

// Look up a section definition, falling back to a generic phrase.
export function getSectionDefinition(section) {
  if (!section) return '';
  if (sectionDefinitions[section]) return sectionDefinitions[section];
  return `This section measures ${String(section).toLowerCase()}.`;
}

// ============================================================
// 5. DEFAULT EXPORT
// ============================================================

export default {
  sectionDefinitions,
  genericSummaries,
  genericImplications,
  sectionSummaries,
  sectionImplications,
  getBandKey,
  pickNarrative,
  getSectionDefinition,
};
