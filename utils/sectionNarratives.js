// utils/sectionNarratives.js
// Universal section narrative library.
//
// Purpose:
//   Every assessment in the platform has sections (Verbal Reasoning, Integrity,
//   Values Alignment, etc.). This file provides:
//     1. A short definition of what each section measures.
//     2. Banded narrative summaries (what the score suggests).
//     3. Banded supervisor implications (what to do about it).
//
// Fallback behaviour:
//   If a section has no authored narratives, the generic banks below are used.
//   Every section on every assessment therefore renders meaningful,
//   candidate-specific wording, even before it is authored.
//
// Determinism:
//   pickNarrative() selects a variant based on a hash of the seed string
//   (typically candidateId + section + band + type). The same candidate always
//   sees the same wording for a given section and band, but different
//   candidates see different wording. Sections within one candidate's report
//   also see different wording because section is part of the seed.
//
// Band keys:
//   exceptional  →  85%+
//   strong       →  75–84%
//   capable      →  65–74%
//   developing   →  55–64%
//   at_risk      →  40–54%
//   high_risk    →  <40%
//
// Authoring progress:
//   Framework + generic fallback banks + Cognitive Verbal Reasoning +
//   Cognitive Numerical Reasoning. Subsequent sessions add further batches.

// ============================================================
// 1. SECTION DEFINITIONS
// ============================================================

export const sectionDefinitions = {
  // ---------- Cognitive Ability (type 3) ----------
  'Verbal Reasoning':
    'Understanding and drawing conclusions from written language — comprehension, analogies, and inference.',
  'Numerical Reasoning':
    'Working with numbers, proportions, patterns, and quantitative data to reach defensible conclusions.',
  'Abstract Reasoning':
    'Recognising patterns, rules, and relationships in unfamiliar or symbolic material.',
  'Logical Reasoning':
    'Drawing valid inferences from premises — deductive, conditional, and categorical reasoning.',

  // ---------- Behavioral & Soft Skills (type 7) ----------
  'Decision Making':
    'Choosing between options under uncertainty, with attention to trade-offs and downside risk.',
  'Communication':
    'Conveying difficult messages, managing upwards, and adapting register to audience.',
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

  // ---------- Cultural & Attitudinal Fit (type 9) ----------
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

  // ---------- Performance Orientation (part of type 6) ----------
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

  // ---------- Business Acumen (part of type 6) ----------
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

  // ---------- Other assessments (partial, from known structure) ----------
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
// 2. GENERIC BANKS (fallback for unauthored sections)
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
  // ---------- Cognitive: Verbal Reasoning ----------
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

  // ---------- Cognitive: Numerical Reasoning ----------
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

  // ---------- Cognitive: Abstract Reasoning ----------
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

  // ---------- Cognitive: Logical Reasoning ----------
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
};

  // ---------- Behavioral & Soft Skills: Decision Making ----------
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

export const sectionImplications = {
  // ---------- Cognitive: Verbal Reasoning ----------
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

  // ---------- Cognitive: Numerical Reasoning ----------
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

  // ---------- Cognitive: Abstract Reasoning ----------
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

  // ---------- Cognitive: Logical Reasoning ----------
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
