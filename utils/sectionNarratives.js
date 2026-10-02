// utils/sectionNarratives.js
// Universal section narrative library.
//
// Authoring progress:
//   Cognitive (4) + Behavioral & Soft Skills (8) + Cultural & Attitudinal Fit
//   (Values Alignment, Cultural Adaptability, Team Compatibility,
//   Attitudinal Markers). Remaining Cultural sections: Organisational
//   Citizenship, Ethical & Cultural Judgment, Motivation & Drive,
//   Learning Orientation.

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
  'Initiative':
    'Acting without being told — spotting and addressing issues before they escalate.',
  'Persistence':
    'Continuing effort through setback, ambiguity, and slow progress.',
  'Self-Management':
    'Managing own time, energy, attention, and commitments.',
  'Goal Setting':
    'Setting goals that are meaningful, achievable, and aligned to priorities.',
  'Quality Standards':
    'Choosing the right standard for the work — not over-polishing, not under-delivering.',
  'Professional Reliability':
    'Following through on commitments, communicating changes, and being dependable.',
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
  'Vision / Strategy':
    'Setting direction, framing long-term priorities, and translating intent into action.',
  'People Leadership':
    'Building, developing, and holding teams accountable.',
  'Emotional Intelligence':
    'Reading and responding to emotions in self and others, especially under pressure.',
  'Execution Drive':
    'Translating intent into delivered outcomes on time and at standard.',
  'Ethics':
    'Consistency between stated principles and observable decisions, especially when costly.',
  'Technical Fundamentals':
    'Core technical knowledge required for the role.',
  'Troubleshooting':
    'Systematically diagnosing and resolving operational problems.',
  'Numerical Aptitude':
    'Applying arithmetic and quantitative reasoning to practical problems.',
  'Safety & Work Ethic':
    'Understanding of safety practices and behaviours associated with dependable work.',
  'CIP & Maintenance':
    'Cleaning-in-place systems and preventative maintenance practices.',
  'Conveyors & Line Efficiency':
    'Conveyor systems and their impact on line throughput and stability.',
  'Filling & Bottling':
    'Filling and bottling operations, parameters, and quality control.',
  'Packaging & Labeling':
    'Packaging processes, labeling accuracy, and downstream quality.',
  'Safety & Efficiency':
    'Balancing safety requirements with production efficiency.',
  'Water Treatment & Quality':
    'Water treatment processes and quality standards.',
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
// 3. AUTHORED SECTION BANKS
// ============================================================

export const sectionSummaries = {
  // ---------- Cognitive ----------
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

  // ---------- Behavioral ----------
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

  // ---------- Cultural: Values Alignment ----------
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

  // ---------- Cultural: Cultural Adaptability ----------
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

  // ---------- Cultural: Team Compatibility ----------
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

  // ---------- Cultural: Attitudinal Markers ----------
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
};

export const sectionImplications = {
  // ---------- Cognitive ----------
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

  // ---------- Behavioral ----------
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

  // ---------- Cultural: Values Alignment ----------
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

  // ---------- Cultural: Cultural Adaptability ----------
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

  // ---------- Cultural: Team Compatibility ----------
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

  // ---------- Cultural: Attitudinal Markers ----------
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
};

// ============================================================
// 4. HELPERS
// ============================================================

function hashString(str) {
  let hash = 0;
  const text = String(str || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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

export function pickNarrative(section, band, seed, type) {
  const bank = type === 'implication' ? sectionImplications : sectionSummaries;
  const generic = type === 'implication' ? genericImplications : genericSummaries;

  const sectionBank = bank[section] || {};
  const variants = sectionBank[band] || generic[band] || [];
  if (variants.length === 0) return '';

  const idx = hashString(`${seed}:${section}:${band}:${type}`) % variants.length;
  return variants[idx];
}

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
