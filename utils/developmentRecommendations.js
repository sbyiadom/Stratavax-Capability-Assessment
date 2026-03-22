// Category-specific development recommendations

export const getDevelopmentRecommendation = (category, percentage) => {
  const recommendations = {
    // General Assessment
    'Integrity': {
      critical: `Establish clear ethical guidelines and regular integrity training. Consider assigning a mentor for ethical decision-making. Schedule regular check-ins to discuss workplace dilemmas.`,
      significant: `Participate in ethics workshops and case study discussions. Review company values and discuss practical applications with supervisor.`,
      opportunity: `Continue to reinforce ethical behavior through recognition. Consider mentoring others on integrity topics.`
    },
    'Work Pace': {
      critical: `Implement time management training and productivity tools. Set clear daily/weekly goals with regular progress reviews. Consider breaking large tasks into smaller chunks.`,
      significant: `Use productivity tracking tools and establish personal deadlines ahead of actual due dates. Practice prioritizing tasks using the Eisenhower Matrix.`,
      opportunity: `Share time management best practices with team. Take on slightly more challenging deadlines to build momentum.`
    },
    'Motivations': {
      critical: `Connect daily tasks to larger organizational goals. Establish a recognition system with frequent positive feedback. Consider job crafting to align tasks with interests.`,
      significant: `Set personal achievement goals and track progress. Find a mentor who can provide inspiration and guidance.`,
      opportunity: `Take on projects that align with personal interests. Share what motivates you with your manager to get better assignments.`
    },
    'Neuroticism': {
      critical: `Practice mindfulness and stress-reduction techniques daily. Consider professional coaching for anxiety management. Establish predictable routines to reduce uncertainty.`,
      significant: `Learn cognitive reframing techniques to manage negative thoughts. Build a support network of trusted colleagues.`,
      opportunity: `Share stress management techniques with team members. Take on slightly challenging situations to build confidence.`
    },
    'Extraversion': {
      critical: `Practice one-on-one interactions in low-stakes settings first. Prepare talking points before meetings. Consider joining a supportive group like Toastmasters.`,
      significant: `Volunteer for team presentations or meeting facilitation. Practice active listening and build on others' ideas.`,
      opportunity: `Lead team-building activities or social events. Mentor new team members to build confidence in social situations.`
    },
    'Mixed Traits': {
      critical: `Work with a coach to identify behavioral patterns and develop flexibility. Practice adapting communication style in different situations.`,
      significant: `Seek feedback on how you're perceived in different contexts. Observe and learn from colleagues with different styles.`,
      opportunity: `Take on roles that require adapting to different situations. Learn to flex your style based on audience needs.`
    },
    'Agreeableness': {
      critical: `Practice assertiveness techniques. Learn to set boundaries while maintaining relationships. Role-play difficult conversations with a coach.`,
      significant: `Balance cooperation with healthy assertiveness. Practice expressing disagreement constructively.`,
      opportunity: `Use your natural agreeableness to build consensus while developing ability to challenge ideas respectfully.`
    },
    'Behavioral Style': {
      critical: `Work with a coach to identify behavioral triggers and develop alternative responses. Practice self-monitoring and reflection.`,
      significant: `Seek regular feedback on workplace behavior. Identify situations that trigger less effective behaviors.`,
      opportunity: `Share insights about behavioral effectiveness with team. Model adaptable behavior for others.`
    },
    'Conscientiousness': {
      critical: `Use detailed checklists and project management tools. Set up accountability partnerships with regular check-ins. Break commitments into smaller, trackable steps.`,
      significant: `Develop systems for tracking tasks and deadlines. Practice estimating time more accurately for future commitments.`,
      opportunity: `Share organizational systems with team. Take on coordination roles that leverage conscientiousness.`
    },
    'Performance Risks': {
      critical: `Create a performance improvement plan with specific, measurable goals. Weekly check-ins with supervisor to track progress. Address accountability gaps immediately.`,
      significant: `Set quarterly performance goals and review progress monthly. Identify specific barriers to performance and address them.`,
      opportunity: `Continue to meet expectations while looking for opportunities to exceed them. Document achievements.`
    },
    'Stress Management': {
      critical: `Learn and practice stress management techniques daily. Consider employee assistance program resources. Establish work-life boundaries.`,
      significant: `Develop a stress management plan for high-pressure periods. Practice recovery activities after stressful events.`,
      opportunity: `Share stress management techniques with team. Maintain healthy coping strategies during normal operations.`
    },
    'Cognitive Patterns': {
      critical: `Start with foundational logic and reasoning exercises. Use structured problem-solving frameworks (PDCA, 5 Whys). Work with a mentor on analytical tasks.`,
      significant: `Practice with case studies and analytical exercises weekly. Take online courses in critical thinking.`,
      opportunity: `Tackle moderately complex problems with support. Share analytical approaches with peers.`
    },
    'Emotional Intelligence': {
      critical: `Participate in EI workshops focusing on self-awareness and empathy. Practice identifying emotions in self and others. Seek regular feedback on interpersonal interactions.`,
      significant: `Practice active listening and perspective-taking. Reflect on emotional responses to situations.`,
      opportunity: `Use EI strengths to support team dynamics. Mentor others on interpersonal effectiveness.`
    },
    'Openness to Experience': {
      critical: `Start with small changes to routine. Practice curiosity by learning about one new topic weekly. Work with a mentor to explore new approaches.`,
      significant: `Volunteer for projects involving new methodologies. Attend workshops on innovation and creativity.`,
      opportunity: `Champion new ideas and approaches within team. Lead innovation initiatives.`
    },

    // ============================================
    // NEW PERSONALITY TRAITS (6 Traits)
    // ============================================
    
    'Ownership': {
      critical: `Take full ownership of a small project from start to finish. Set personal accountability goals and track progress publicly. Practice owning mistakes and presenting lessons learned. Meet with a mentor weekly to discuss accountability challenges.`,
      significant: `Volunteer to lead a project or initiative. Create a personal accountability dashboard. When things go wrong, focus on solutions rather than blame. Request feedback on your follow-through.`,
      opportunity: `Take on stretch assignments that require high accountability. Mentor others on taking ownership. Share your accountability framework with the team. Lead post-mortem discussions.`
    },
    'Collaboration': {
      critical: `Participate in team-building activities. Practice active listening in every conversation. Ask at least one colleague for input before making decisions. Volunteer for cross-functional projects with close supervision.`,
      significant: `Seek opportunities to work in pairs or small teams. Practice sharing credit generously. Initiate collaborative problem-solving sessions. Ask for feedback on your teamwork effectiveness.`,
      opportunity: `Lead cross-functional initiatives. Facilitate team meetings and decision-making. Help resolve team conflicts constructively. Mentor others on effective collaboration.`
    },
    'Action': {
      critical: `Practice making decisions with 80% of available information. Set time limits for decision-making (e.g., 2 minutes for small decisions, 1 day for moderate decisions). Create action plans with clear deadlines.`,
      significant: `Volunteer for time-sensitive projects. Take initiative on tasks without being asked. Set personal deadlines ahead of official due dates. Track your decision-to-action time.`,
      opportunity: `Lead fast-paced projects. Help others overcome analysis paralysis. Share decision-making frameworks with the team. Take on roles requiring quick execution.`
    },
    'Analysis': {
      critical: `Take a foundational course in critical thinking or data analysis. Use structured problem-solving frameworks for all decisions (PDCA, 5 Whys, decision matrices). Create a habit of gathering data before acting.`,
      significant: `Practice analyzing case studies. Use root cause analysis for problems you encounter. Create structured notes before important decisions. Review past decisions to identify analytical improvements.`,
      opportunity: `Lead complex analytical projects. Teach analytical frameworks to others. Establish data-driven decision-making practices for your team. Become a subject matter expert in analysis.`
    },
    'Risk Tolerance': {
      critical: `Start with small, low-stakes experiments. Practice evaluating risks using structured frameworks (probability, impact, mitigation). Discuss risk decisions with a mentor before proceeding.`,
      significant: `Volunteer for pilot projects or innovation initiatives. Practice presenting risk assessments with mitigation plans. Learn to differentiate between acceptable and unacceptable risks.`,
      opportunity: `Lead innovation initiatives. Help others navigate calculated risks. Develop risk assessment frameworks for the organization. Champion a culture of experimentation.`
    },
    'Structure': {
      critical: `Create personal templates for recurring tasks. Document procedures for your key responsibilities. Use checklists consistently. Follow established processes without deviation.`,
      significant: `Develop and share process documentation with the team. Use project management tools consistently. Help identify opportunities to standardize workflows.`,
      opportunity: `Lead process improvement initiatives. Establish standards for the team. Create documentation systems. Mentor others on process discipline.`
    },

        // ============================================
    // STRATEGIC LEADERSHIP DIMENSIONS (7 Dimensions)
    // ============================================
    
    'Vision / Strategy': {
      critical: `Complete foundational strategic thinking and planning courses. Study your organization's long-term strategy and industry trends. Practice writing strategic memos and scenario plans. Work with a mentor to develop strategic analysis skills. Schedule weekly strategic thinking sessions.`,
      significant: `Participate in strategic planning sessions. Read books on strategic management and business strategy. Practice analyzing case studies of successful and failed strategies. Create a personal strategic development plan with quarterly milestones.`,
      opportunity: `Lead a strategic initiative or project. Mentor others on strategic thinking. Contribute to organizational strategy development. Present strategic recommendations to leadership. Develop expertise in competitive analysis.`
    },
    'People Leadership': {
      critical: `Complete foundational people management and leadership development programs. Practice giving constructive feedback in low-stakes situations. Shadow an experienced leader. Seek opportunities to mentor or coach junior team members.`,
      significant: `Take on team leadership responsibilities for small projects. Develop a coaching practice with team members. Attend workshops on emotional intelligence and team development. Seek feedback on your leadership effectiveness.`,
      opportunity: `Lead a team or department. Develop and deliver leadership training. Coach other leaders on people development. Create a culture of continuous feedback and growth. Mentor future leaders.`
    },
    'Decision Making': {
      critical: `Use structured decision-making frameworks for all major choices (decision matrices, pros/cons, risk analysis). Practice making decisions with 80% of available information. Discuss major decisions with a mentor before finalizing. Document decision outcomes and learn from them.`,
      significant: `Volunteer for decisions that require complex analysis. Study decision-making biases and how to avoid them. Practice scenario planning and risk assessment. Lead decision-making processes for team initiatives.`,
      opportunity: `Lead high-stakes decision-making processes. Develop and teach decision-making frameworks to others. Create a decision-making culture that balances speed and quality. Serve as a trusted advisor for complex decisions.`
    },
    'Accountability': {
      critical: `Take ownership of a small project from start to finish. Create personal accountability commitments and share them publicly. Practice owning mistakes and presenting lessons learned. Set up weekly accountability check-ins with a mentor.`,
      significant: `Volunteer to lead initiatives with clear ownership. Develop systems to track and report progress. When things go wrong, focus on solutions rather than blame. Request feedback on your follow-through and reliability.`,
      opportunity: `Lead critical projects with significant accountability. Create accountability frameworks for teams. Mentor others on taking ownership. Model accountability in all situations. Drive accountability culture across the organization.`
    },
    'Emotional Intelligence': {
      critical: `Participate in emotional intelligence and self-awareness workshops. Practice identifying emotions in self and others daily. Seek regular feedback on interpersonal interactions. Keep a journal to reflect on emotional responses.`,
      significant: `Practice active listening and perspective-taking in all conversations. Develop empathy through understanding others' experiences. Learn conflict resolution techniques. Use emotional intelligence to navigate difficult conversations.`,
      opportunity: `Lead team through challenging interpersonal situations. Mentor others on emotional intelligence. Create a psychologically safe environment. Use emotional intelligence to build strong relationships across the organization.`
    },
    'Execution Drive': {
      critical: `Set SMART goals and track progress daily. Use project management tools consistently. Break large initiatives into small, achievable milestones. Address obstacles immediately rather than avoiding them. Create daily execution rituals.`,
      significant: `Lead execution-focused initiatives. Develop systems to measure and improve delivery speed. Practice overcoming obstacles and maintaining momentum. Celebrate small wins to build execution momentum.`,
      opportunity: `Lead complex, multi-stakeholder execution efforts. Create execution frameworks for the organization. Mentor others on results orientation. Drive a culture of delivery and accountability. Transform strategy into measurable results.`
    },
    'Ethics': {
      critical: `Complete ethics and integrity training programs. Study ethical frameworks and decision-making models. Discuss ethical dilemmas with a mentor. Create a personal ethics statement. Seek guidance on complex ethical situations.`,
      significant: `Practice identifying ethical dimensions in business decisions. Lead by example in ethical behavior. Speak up when you observe ethical concerns. Develop a reputation for principled decision-making.`,
      opportunity: `Lead ethics initiatives within the organization. Create ethical decision-making frameworks. Mentor others on ethical leadership. Serve as an ethics champion. Build a culture of integrity and trust.`
    },
    
    // Leadership Assessment
    'Vision & Strategic Thinking': {
      critical: `Study the organization's strategy and how your role connects. Practice writing a vision for your team or function. Discuss strategic concepts with a mentor.`,
      significant: `Read books on strategic thinking. Participate in strategic planning sessions. Practice scenario planning.`,
      opportunity: `Lead strategic initiatives. Mentor others on strategic thinking.`
    },
    'Decision-Making & Problem-Solving': {
      critical: `Use structured decision-making frameworks (pros/cons, decision matrices). Discuss major decisions with mentor before finalizing.`,
      significant: `Practice making decisions with incomplete information. Analyze past decisions to identify improvement areas.`,
      opportunity: `Lead complex problem-solving sessions. Teach decision-making frameworks to others.`
    },
    'Communication & Influence': {
      critical: `Practice presentations in safe environments first. Prepare talking points for important conversations. Work with a communication coach.`,
      significant: `Take an influencing skills workshop. Practice tailoring messages to different audiences.`,
      opportunity: `Lead important presentations and negotiations. Mentor others on communication skills.`
    },
    'People Management & Coaching': {
      critical: `Complete foundational people management training. Practice giving feedback in low-stakes situations. Shadow an experienced manager.`,
      significant: `Take on informal mentoring of junior team members. Practice coaching conversations.`,
      opportunity: `Lead a small team on a project. Develop others through formal and informal coaching.`
    },
    'Change Leadership & Agility': {
      critical: `Learn about change management models (Kotter, ADKAR). Practice communicating about change positively.`,
      significant: `Volunteer for change initiatives. Help others navigate changes.`,
      opportunity: `Lead change initiatives. Coach others through transitions.`
    },
    'Execution & Results Orientation': {
      critical: `Set SMART goals and track progress weekly. Use project management tools to monitor execution. Address obstacles immediately.`,
      significant: `Improve follow-through by breaking goals into weekly actions. Celebrate small wins.`,
      opportunity: `Lead results-focused initiatives. Help team improve execution.`
    },
    'Resilience & Stress Management': {
      critical: `Develop a personal resilience plan. Practice recovery activities after stressful periods. Seek support when needed.`,
      significant: `Build a support network. Learn and practice stress management techniques.`,
      opportunity: `Support team members during stressful periods. Model healthy stress management.`
    },
    'Self-Awareness & Self-Regulation': {
      critical: `Seek 360-degree feedback. Work with a coach to identify blind spots. Practice pausing before reacting.`,
      significant: `Regularly reflect on decisions and interactions. Ask for feedback after key events.`,
      opportunity: `Share self-awareness insights with team. Help others develop self-awareness.`
    },

    // Cognitive Assessment
    'Logical / Abstract Reasoning': {
      critical: `Practice with logic puzzles and brain teasers daily. Use structured problem-solving frameworks. Work with a mentor on analytical tasks.`,
      significant: `Take online courses in logical reasoning. Practice analyzing arguments and identifying fallacies.`,
      opportunity: `Tackle complex analytical problems. Help others develop logical reasoning.`
    },
    'Numerical Reasoning': {
      critical: `Practice basic math skills daily. Use calculators and tools to verify work. Take a foundational numeracy course.`,
      significant: `Work with data regularly. Practice interpreting charts and statistics.`,
      opportunity: `Take on data analysis projects. Help others understand numerical information.`
    },
    'Verbal Reasoning': {
      critical: `Read complex materials and summarize key points. Practice explaining concepts in simple terms. Take a reading comprehension course.`,
      significant: `Write summaries of documents and get feedback. Practice identifying main ideas and supporting details.`,
      opportunity: `Draft important communications. Help others improve verbal reasoning.`
    },
    'Spatial Reasoning': {
      critical: `Practice with spatial puzzles and games. Use diagrams and visual aids when problem-solving.`,
      significant: `Work with blueprints, diagrams, or 3D models. Practice visualizing before creating.`,
      opportunity: `Take on projects requiring spatial thinking. Help others develop spatial skills.`
    },
    'Memory & Attention': {
      critical: `Use memory techniques (chunking, association). Take notes and review regularly. Minimize distractions during important tasks.`,
      significant: `Practice active recall of information. Use attention-focusing techniques like Pomodoro.`,
      opportunity: `Share memory techniques with team. Manage projects requiring attention to detail.`
    },
    'Perceptual Speed & Accuracy': {
      critical: `Practice speed-accuracy exercises. Double-check work systematically. Use checklists to ensure accuracy.`,
      significant: `Work on processing speed with timed exercises. Balance speed with careful review.`,
      opportunity: `Take on roles requiring quick, accurate processing. Help others improve perceptual skills.`
    },
    'Critical Thinking': {
      critical: `Learn to identify assumptions and evaluate evidence. Practice with case studies. Discuss reasoning process with mentor.`,
      significant: `Question assumptions and seek evidence. Evaluate arguments for logical flaws.`,
      opportunity: `Lead critical analysis projects. Teach critical thinking to others.`
    },
    'Learning Agility': {
      critical: `Focus on learning one new thing each week. Take structured courses with clear objectives.`,
      significant: `Seek opportunities to learn new skills. Reflect on learning process and adapt.`,
      opportunity: `Rapidly master new areas and share learning. Help others learn efficiently.`
    },
    'Mental Flexibility': {
      critical: `Practice seeing situations from multiple perspectives. Try new approaches to routine tasks.`,
      significant: `Generate multiple solutions to problems. Adapt when initial approach doesn't work.`,
      opportunity: `Lead innovation by connecting disparate ideas. Help others develop flexibility.`
    },

    // Technical Assessment
    'Technical Knowledge': {
      critical: `Complete foundational technical training courses. Shadow experienced technicians. Create a structured learning plan.`,
      significant: `Pursue certification in technical area. Stay current with industry developments.`,
      opportunity: `Share technical knowledge with team. Mentor others on technical skills.`
    },
    'System Understanding': {
      critical: `Map out system components and relationships. Study system documentation. Discuss system interactions with experienced colleagues.`,
      significant: `Learn how changes in one area affect others. Practice troubleshooting system issues.`,
      opportunity: `Lead system improvement projects. Help others understand system complexity.`
    },
    'Troubleshooting': {
      critical: `Learn systematic troubleshooting methodologies. Practice with simulated problems. Document troubleshooting steps.`,
      significant: `Develop expertise in common problem patterns. Build a knowledge base of solutions.`,
      opportunity: `Lead troubleshooting efforts. Teach methodology to others.`
    },
    'Practical Application': {
      critical: `Practice applying knowledge in supervised settings. Work on simple projects first. Get feedback on application.`,
      significant: `Take on increasingly complex applications. Document lessons learned.`,
      opportunity: `Apply knowledge to novel situations. Help others apply technical concepts.`
    },
    'Safety & Compliance': {
      critical: `Complete all required safety training. Follow procedures exactly. Report concerns immediately.`,
      significant: `Stay current on safety requirements. Identify potential hazards proactively.`,
      opportunity: `Champion safety initiatives. Train others on safety procedures.`
    },
    'Quality Control': {
      critical: `Learn quality standards and inspection methods. Practice self-checking work. Use quality tools consistently.`,
      significant: `Identify quality improvement opportunities. Track quality metrics.`,
      opportunity: `Lead quality improvement initiatives. Train others on quality standards.`
    },
    'Process Optimization': {
      critical: `Learn process mapping and analysis techniques. Identify waste in current processes.`,
      significant: `Participate in process improvement projects. Suggest incremental improvements.`,
      opportunity: `Lead optimization projects. Teach process improvement methodologies.`
    },
    'Equipment Operation': {
      critical: `Complete equipment training and certification. Practice under supervision. Follow operating procedures strictly.`,
      significant: `Develop proficiency on multiple equipment types. Learn basic maintenance.`,
      opportunity: `Train others on equipment operation. Optimize equipment use.`
    },
    'Maintenance Procedures': {
      critical: `Learn preventive maintenance schedules and procedures. Document maintenance activities.`,
      significant: `Develop troubleshooting skills for common issues. Perform routine maintenance independently.`,
      opportunity: `Lead maintenance planning. Train others on procedures.`
    },
    'Technical Documentation': {
      critical: `Study existing documentation thoroughly. Practice writing clear procedures. Get feedback on documentation.`,
      significant: `Update and improve documentation. Create documentation for new processes.`,
      opportunity: `Lead documentation efforts. Establish documentation standards.`
    },

    // Performance Assessment
    'Productivity & Efficiency': {
      critical: `Use time tracking to identify inefficiencies. Learn productivity techniques (batch processing, Pomodoro). Set daily output goals.`,
      significant: `Identify and eliminate time wasters. Optimize workflows for common tasks.`,
      opportunity: `Share productivity techniques with team. Lead efficiency improvements.`
    },
    'Work Quality & Effectiveness': {
      critical: `Use checklists to ensure quality. Get feedback on work product. Study examples of excellent work.`,
      significant: `Develop personal quality standards. Review work before submitting.`,
      opportunity: `Set quality benchmarks for team. Help others improve quality.`
    },
    'Goal Achievement': {
      critical: `Break goals into weekly action steps. Track progress visibly. Celebrate small wins.`,
      significant: `Set SMART goals with clear metrics. Review progress regularly.`,
      opportunity: `Help team set and achieve goals. Share goal achievement strategies.`
    },
    'Accountability': {
      critical: `Make commitments in writing. Share goals with others for accountability. Follow through consistently.`,
      significant: `Take ownership of mistakes and learn from them. Deliver on promises reliably.`,
      opportunity: `Hold others accountable constructively. Model accountability.`
    },
    'Initiative': {
      critical: `Identify one improvement to make independently. Volunteer for small tasks.`,
      significant: `Proactively seek additional responsibilities. Suggest improvements without being asked.`,
      opportunity: `Lead new initiatives. Encourage initiative in others.`
    },
    'Collaboration': {
      critical: `Practice active listening in meetings. Seek input from others before deciding. Acknowledge others' contributions.`,
      significant: `Volunteer for cross-functional projects. Share credit generously.`,
      opportunity: `Lead collaborative efforts. Build strong team relationships.`
    },
    'Time Management': {
      critical: `Use a calendar and task list consistently. Prioritize tasks using urgency/importance matrix. Estimate time needed more accurately.`,
      significant: `Plan weekly and daily schedules. Protect time for important work.`,
      opportunity: `Help others improve time management. Manage complex schedules effectively.`
    },
    'Results Orientation': {
      critical: `Focus on outcomes rather than activities. Track results metrics. Adjust approach based on results.`,
      significant: `Set stretch goals. Persist through obstacles to achieve results.`,
      opportunity: `Drive results through team. Celebrate results achievement.`
    },

    // Behavioral Assessment
    'Teamwork': {
      critical: `Practice supporting team members. Ask how you can help others. Acknowledge team achievements.`,
      significant: `Contribute ideas in team settings. Help resolve team disagreements.`,
      opportunity: `Build strong team cohesion. Mentor new team members.`
    },
    'Conflict Resolution': {
      critical: `Learn conflict resolution basics. Practice staying calm during disagreements. Seek mediation when needed.`,
      significant: `Address conflicts early before escalation. Find win-win solutions.`,
      opportunity: `Mediate conflicts between others. Teach conflict resolution skills.`
    },
    'Empathy': {
      critical: `Practice perspective-taking. Ask about others' feelings and experiences. Listen without judgment.`,
      significant: `Consider others' needs when making decisions. Show genuine concern for colleagues.`,
      opportunity: `Create supportive environment. Help others feel understood.`
    },
    'Active Listening': {
      critical: `Practice paraphrasing what others say. Avoid interrupting. Maintain eye contact and attentive body language.`,
      significant: `Ask clarifying questions. Summarize discussions to confirm understanding.`,
      opportunity: `Facilitate discussions effectively. Help others feel heard.`
    },
    'Feedback Reception': {
      critical: `Ask for feedback regularly. Listen without defending. Create action plans from feedback.`,
      significant: `Thank people for feedback. Show improvement based on input.`,
      opportunity: `Model gracious feedback reception. Encourage feedback culture.`
    },
    'Interpersonal Skills': {
      critical: `Practice basic social conventions (greetings, small talk). Observe effective interpersonal interactions.`,
      significant: `Build rapport with diverse colleagues. Navigate social situations smoothly.`,
      opportunity: `Build strong professional network. Help others develop interpersonal skills.`
    },
    'Professionalism': {
      critical: `Review professional conduct guidelines. Observe professional behavior models. Get feedback on professional presence.`,
      significant: `Maintain composure in all situations. Represent organization positively.`,
      opportunity: `Set professional standards for team. Mentor others on professionalism.`
    },

    // Cultural Assessment
    'Values Alignment': {
      critical: `Study company values and discuss with supervisor. Identify personal connection to each value.`,
      significant: `Demonstrate values in daily work. Recognize others who exemplify values.`,
      opportunity: `Champion values within team. Help embed values in processes.`
    },
    'Work Ethic': {
      critical: `Set personal standards for effort and quality. Complete tasks thoroughly. Be reliable and dependable.`,
      significant: `Go beyond minimum requirements. Take pride in work quality.`,
      opportunity: `Inspire strong work ethic in others. Model dedication.`
    },
    'Diversity Awareness': {
      critical: `Complete diversity and inclusion training. Learn about different cultures and perspectives.`,
      significant: `Seek diverse perspectives. Challenge own assumptions and biases.`,
      opportunity: `Champion inclusion initiatives. Help create welcoming environment.`
    },
    'Inclusivity': {
      critical: `Ensure everyone has opportunity to contribute. Invite input from quiet members.`,
      significant: `Create space for diverse voices. Address exclusionary behavior.`,
      opportunity: `Lead inclusion efforts. Build culture of belonging.`
    },
    'Respect': {
      critical: `Treat everyone with courtesy regardless of role. Avoid gossip and negative talk.`,
      significant: `Show appreciation for others' contributions. Respect boundaries and differences.`,
      opportunity: `Model respect consistently. Address disrespectful behavior.`
    }
  };

  const categoryRecs = recommendations[category];
  if (!categoryRecs) {
    // Default recommendations for unmapped categories
    if (percentage < 50) {
      return `Critical development needed. Focus on foundational skills in this area. Work with a mentor to create a structured learning plan.`;
    } else if (percentage < 60) {
      return `Significant development opportunity. Identify specific gaps and create a targeted improvement plan with regular check-ins.`;
    } else if (percentage < 70) {
      return `Development opportunity. Build on current skills through practice and feedback. Consider advanced training in this area.`;
    } else {
      return `Continue to leverage this strength while looking for opportunities to refine and share expertise with others.`;
    }
  }

  if (percentage < 50) return categoryRecs.critical;
  if (percentage < 60) return categoryRecs.significant;
  if (percentage < 70) return categoryRecs.opportunity;
  return `Continue to leverage this strength. Consider mentoring others and taking on more challenging applications of this competency.`;
};
