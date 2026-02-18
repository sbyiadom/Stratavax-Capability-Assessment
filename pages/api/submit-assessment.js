import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called");

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization token" });
    }

    const token = authHeader.replace('Bearer ', '');

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId = user_id;
    let assessmentId = assessment_id;

    if (sessionId && !userId) {
      const { data: session, error: sessionError } = await serviceClient
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
    }

    // Get assessment type to understand the categories
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('assessment_type_id, title, assessment_type:assessment_types(name, code)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error("❌ Assessment error:", assessmentError);
    }

    // Get all responses with full question and answer details
    const { data: responses, error: responsesError } = await userClient
      .from('responses')
      .select(`
        question_id,
        answer_id,
        unique_questions!inner (
          id,
          section,
          subsection,
          question_text
        ),
        unique_answers!inner (
          id,
          score,
          answer_text
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Responses error:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        message: responsesError.message 
      });
    }

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: "No responses found" });
    }

    // Initialize dynamic category scores
    const categoryScores = {};
    const allResponses = [];
    let totalScore = 0;
    let totalMaxPossible = 0;

    // Process each response
    responses.forEach(response => {
      const question = response.unique_questions;
      const answer = response.unique_answers;
      const section = question.section || 'General';
      const subsection = question.subsection;
      
      allResponses.push({
        questionId: question.id,
        questionText: question.question_text,
        section,
        subsection,
        answerId: answer.id,
        answerText: answer.answer_text,
        score: answer.score,
        maxScore: 5
      });

      totalScore += answer.score;
      totalMaxPossible += 5;

      // Initialize category if not exists
      if (!categoryScores[section]) {
        categoryScores[section] = {
          total: 0,
          count: 0,
          maxPossible: 0,
          subsections: {},
          questions: []
        };
      }

      // Track subsection scores
      if (subsection && !categoryScores[section].subsections[subsection]) {
        categoryScores[section].subsections[subsection] = {
          total: 0,
          count: 0,
          maxPossible: 0
        };
      }

      // Add to totals
      categoryScores[section].total += answer.score;
      categoryScores[section].count += 1;
      categoryScores[section].maxPossible += 5;
      categoryScores[section].questions.push({
        text: question.question_text,
        answer: answer.answer_text,
        score: answer.score,
        maxScore: 5,
        subsection
      });

      if (subsection) {
        categoryScores[section].subsections[subsection].total += answer.score;
        categoryScores[section].subsections[subsection].count += 1;
        categoryScores[section].subsections[subsection].maxPossible += 5;
      }
    });

    // Calculate percentages and generate analysis for each category
    const categoryAnalysis = {};
    const strengths = [];
    const weaknesses = [];

    Object.keys(categoryScores).sort().forEach(section => {
      const data = categoryScores[section];
      const percentage = Math.round((data.total / data.maxPossible) * 100);
      const average = Number((data.total / data.count).toFixed(2));

      // Calculate subsection percentages
      const subsectionAnalysis = {};
      Object.keys(data.subsections).forEach(sub => {
        const subData = data.subsections[sub];
        subData.percentage = Math.round((subData.total / subData.maxPossible) * 100);
        subData.average = Number((subData.total / subData.count).toFixed(2));
        subsectionAnalysis[sub] = subData;
      });

      // Generate dynamic category analysis
      const analysis = generateDynamicAnalysis(section, percentage, average, data);

      categoryAnalysis[section] = {
        score: data.total,
        maxPossible: data.maxPossible,
        percentage,
        average,
        count: data.count,
        subsections: subsectionAnalysis,
        analysis: analysis.text,
        strengths: analysis.strengths,
        growthAreas: analysis.growthAreas,
        recommendations: analysis.recommendations,
        traits: analysis.traits,
        behavioralIndicators: analysis.behavioralIndicators
      };

      // Identify strengths (70%+)
      if (percentage >= 70) {
        strengths.push({
          category: section,
          percentage,
          score: data.total,
          maxPossible: data.maxPossible,
          analysis: analysis.text,
          traits: analysis.traits
        });
      }
      // Identify weaknesses (40% or less)
      else if (percentage <= 40) {
        weaknesses.push({
          category: section,
          percentage,
          score: data.total,
          maxPossible: data.maxPossible,
          analysis: analysis.text,
          traits: analysis.traits
        });
      }
    });

    const overallPercentage = Math.round((totalScore / totalMaxPossible) * 100);

    // Generate comprehensive profile
    const profile = generateComprehensiveProfile(categoryAnalysis, strengths, weaknesses, overallPercentage);

    // Prepare the complete assessment result
    const assessmentResult = {
      metadata: {
        completedAt: new Date().toISOString(),
        assessmentTitle: assessment?.title || 'Assessment',
        assessmentType: assessment?.assessment_type?.name || 'General',
        totalScore,
        maxScore: totalMaxPossible,
        percentage: overallPercentage,
        questionsAnswered: responses.length,
        categoriesAssessed: Object.keys(categoryAnalysis).length
      },
      executiveSummary: profile.executiveSummary,
      overallProfile: profile.overallProfile,
      categoryAnalysis,
      strengths: strengths.map(s => ({
        area: s.category,
        level: s.percentage >= 90 ? 'Exceptional' : s.percentage >= 80 ? 'Strong' : 'Developing Strength',
        score: `${s.score}/${s.maxPossible} (${s.percentage}%)`,
        insights: s.analysis
      })),
      areasForDevelopment: weaknesses.map(w => ({
        area: w.category,
        priority: w.percentage <= 20 ? 'Critical' : w.percentage <= 30 ? 'High' : 'Moderate',
        score: `${w.score}/${w.maxPossible} (${w.percentage}%)`,
        insights: w.analysis,
        recommendations: categoryAnalysis[w.category]?.recommendations || []
      })),
      recommendations: profile.recommendations,
      developmentPlan: profile.developmentPlan,
      rawResponses: allResponses
    };

    // Update session to completed
    if (sessionId) {
      await serviceClient
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    // Save to candidate_assessments
    await serviceClient
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        status: 'completed',
        score: totalScore,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    // Save detailed results to assessment_results
    const { error: resultsError } = await serviceClient
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: totalMaxPossible,
        percentage_score: overallPercentage,
        category_scores: categoryAnalysis,
        interpretations: {
          executiveSummary: profile.executiveSummary,
          overallProfile: profile.overallProfile,
          strengths: strengths.map(s => s.category),
          developmentAreas: weaknesses.map(w => w.category)
        },
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: profile.recommendations,
        development_plan: profile.developmentPlan,
        detailed_analysis: assessmentResult,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (resultsError) {
      console.error("❌ Results error:", resultsError);
      return res.status(500).json({ 
        error: "Failed to save detailed results",
        message: resultsError.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      score: totalScore,
      percentage: overallPercentage,
      ...assessmentResult
    });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}

// Dynamic analysis generator that works for any category
function generateDynamicAnalysis(category, percentage, average, data) {
  const scoreLevel = percentage >= 80 ? 'exceptional' : 
                     percentage >= 60 ? 'strong' :
                     percentage >= 40 ? 'developing' : 'foundational';

  const analysisTemplates = {
    'Cognitive Ability': {
      exceptional: {
        text: 'Demonstrates exceptional analytical and critical thinking skills. Processes complex information quickly and makes well-reasoned decisions.',
        strengths: ['Advanced problem-solving', 'Quick learner', 'Strategic thinker'],
        growthAreas: ['May overcomplicate simple problems', 'Could delegate analytical tasks more'],
        traits: ['Analytical', 'Strategic', 'Quick-thinking']
      },
      strong: {
        text: 'Shows solid cognitive abilities with good analytical and reasoning skills. Effectively handles complex problems with structured approaches.',
        strengths: ['Logical reasoning', 'Pattern recognition', 'Decision-making'],
        growthAreas: ['Speed of processing', 'Complex problem frameworks'],
        traits: ['Logical', 'Methodical', 'Rational']
      },
      developing: {
        text: 'Developing cognitive abilities with foundational analytical skills. Benefits from structured problem-solving approaches and clear frameworks.',
        strengths: ['Willingness to learn', 'Follows procedures well'],
        growthAreas: ['Analytical depth', 'Complex reasoning', 'Strategic thinking'],
        traits: ['Practical', 'Process-oriented', 'Learning']
      },
      foundational: {
        text: 'Building fundamental cognitive skills. Requires clear guidance and structured approaches for complex problems.',
        strengths: ['Task-focused', 'Follows direction'],
        growthAreas: ['Analytical thinking', 'Problem-solving', 'Decision-making'],
        traits: ['Hands-on', 'Detail-oriented', 'Developing']
      }
    },
    'Communication': {
      exceptional: {
        text: 'Exceptional communicator who articulates ideas with clarity and impact. Builds strong relationships and influences effectively.',
        strengths: ['Clear articulation', 'Active listening', 'Persuasive communication'],
        growthAreas: ['May need to simplify for some audiences'],
        traits: ['Articulate', 'Persuasive', 'Empathetic']
      },
      strong: {
        text: 'Good communicator who expresses ideas clearly. Comfortable in team settings and professional interactions.',
        strengths: ['Clear expression', 'Professional demeanor', 'Team collaboration'],
        growthAreas: ['Presentation skills', 'Difficult conversations'],
        traits: ['Clear', 'Professional', 'Approachable']
      },
      developing: {
        text: 'Developing communication skills. Adequate for routine interactions but working on complex messaging.',
        strengths: ['Willing to communicate', 'Basic clarity'],
        growthAreas: ['Active listening', 'Articulating complex ideas', 'Confidence'],
        traits: ['Reserved', 'Developing', 'Willing']
      },
      foundational: {
        text: 'Building foundational communication skills. Benefits from coaching and practice in professional settings.',
        strengths: ['Basic expression', 'Follows instructions'],
        growthAreas: ['Verbal expression', 'Active listening', 'Professional writing'],
        traits: ['Quiet', 'Developing', 'Needs support']
      }
    },
    'Cultural & Attitudinal Fit': {
      exceptional: {
        text: 'Exemplary cultural alignment with strong positive attitude. Embodies organizational values and enhances team dynamics.',
        strengths: ['Values alignment', 'Positive influence', 'Team player'],
        growthAreas: ['May need to challenge status quo more'],
        traits: ['Values-driven', 'Positive', 'Collaborative']
      },
      strong: {
        text: 'Good cultural fit with positive attitude. Supports team goals and demonstrates organizational values.',
        strengths: ['Team orientation', 'Positive outlook', 'Reliable'],
        growthAreas: ['Influencing culture', 'Leading by example'],
        traits: ['Supportive', 'Positive', 'Reliable']
      },
      developing: {
        text: 'Developing cultural awareness and alignment. Generally positive but still learning organizational dynamics.',
        strengths: ['Willing to adapt', 'Basic positivity'],
        growthAreas: ['Cultural understanding', 'Initiative', 'Peer influence'],
        traits: ['Adapting', 'Learning', 'Accepting']
      },
      foundational: {
        text: 'Building understanding of organizational culture. Needs guidance on values and expected behaviors.',
        strengths: ['Open to feedback', 'Compliant'],
        growthAreas: ['Cultural awareness', 'Positive contribution', 'Peer relationships'],
        traits: ['Learning', 'Following', 'Developing']
      }
    },
    'Emotional Intelligence': {
      exceptional: {
        text: 'High emotional intelligence with strong self-awareness and empathy. Navigates interpersonal dynamics skillfully.',
        strengths: ['Self-awareness', 'Empathy', 'Relationship management'],
        growthAreas: ['May absorb others\' emotions too much'],
        traits: ['Self-aware', 'Empathetic', 'Socially skilled']
      },
      strong: {
        text: 'Good emotional awareness with ability to manage relationships effectively. Reads situations well.',
        strengths: ['Emotional awareness', 'Social perception', 'Self-regulation'],
        growthAreas: ['Conflict navigation', 'Emotional resilience'],
        traits: ['Aware', 'Regulated', 'Perceptive']
      },
      developing: {
        text: 'Developing emotional intelligence. Shows some self-awareness but working on reading others.',
        strengths: ['Basic self-awareness', 'Willing to improve'],
        growthAreas: ['Empathy', 'Social cues', 'Emotional regulation'],
        traits: ['Learning', 'Developing', 'Trying']
      },
      foundational: {
        text: 'Building foundational emotional skills. Needs support in recognizing and managing emotions.',
        strengths: ['Honest about feelings', 'Open to feedback'],
        growthAreas: ['Self-awareness', 'Social perception', 'Emotional control'],
        traits: ['Open', 'Learning', 'Developing']
      }
    },
    'Ethics & Integrity': {
      exceptional: {
        text: 'Unwavering ethical standards and integrity. Consistently does the right thing even when unobserved.',
        strengths: ['Strong moral compass', 'Transparency', 'Trustworthiness'],
        growthAreas: ['May need to help others navigate gray areas'],
        traits: ['Ethical', 'Trustworthy', 'Principled']
      },
      strong: {
        text: 'Strong ethical foundation with clear integrity. Generally makes principled decisions.',
        strengths: ['Honesty', 'Reliability', 'Fairness'],
        growthAreas: ['Navigating ethical gray areas', 'Speaking up'],
        traits: ['Honest', 'Reliable', 'Fair']
      },
      developing: {
        text: 'Developing ethical reasoning. Understands basic right/wrong but working on complex situations.',
        strengths: ['Basic honesty', 'Follows rules'],
        growthAreas: ['Ethical reasoning', 'Courage to speak up', 'Consistency'],
        traits: ['Rule-follower', 'Developing', 'Learning']
      },
      foundational: {
        text: 'Building understanding of ethical expectations. Needs clear guidance on integrity standards.',
        strengths: ['Wants to do right', 'Accepts feedback'],
        growthAreas: ['Ethical understanding', 'Consistency', 'Independent judgment'],
        traits: ['Learning', 'Following', 'Developing']
      }
    },
    'Leadership & Management': {
      exceptional: {
        text: 'Exceptional leadership potential with strong people management skills. Inspires and develops others effectively.',
        strengths: ['Team development', 'Strategic vision', 'Inspirational'],
        growthAreas: ['May need to delegate more strategically'],
        traits: ['Inspirational', 'Strategic', 'Developmental']
      },
      strong: {
        text: 'Good leadership foundation with solid management skills. Effectively guides teams and achieves results.',
        strengths: ['Team guidance', 'Goal setting', 'Performance management'],
        growthAreas: ['Strategic thinking', 'Succession planning'],
        traits: ['Guiding', 'Results-oriented', 'Supportive']
      },
      developing: {
        text: 'Developing leadership capabilities. Shows potential but needs experience and mentoring.',
        strengths: ['Willing to lead', 'Basic management skills'],
        growthAreas: ['People development', 'Strategic thinking', 'Influence'],
        traits: ['Emerging', 'Willing', 'Learning']
      },
      foundational: {
        text: 'Building foundational leadership skills. Needs development in people management and direction-setting.',
        strengths: ['Task management', 'Follows direction'],
        growthAreas: ['People skills', 'Vision', 'Delegation'],
        traits: ['Task-focused', 'Developing', 'Learning']
      }
    },
    'Performance Metrics': {
      exceptional: {
        text: 'Exceptional understanding of performance metrics and data-driven decision making. Uses metrics effectively to drive improvement.',
        strengths: ['Data-driven', 'Metric literacy', 'Performance focus'],
        growthAreas: ['May focus too much on numbers over people'],
        traits: ['Analytical', 'Results-driven', 'Data-savvy']
      },
      strong: {
        text: 'Good grasp of performance metrics and their application. Uses data to guide decisions.',
        strengths: ['Metric understanding', 'Data application', 'Goal tracking'],
        growthAreas: ['Advanced analytics', 'Predictive metrics'],
        traits: ['Data-aware', 'Goal-oriented', 'Practical']
      },
      developing: {
        text: 'Developing understanding of performance metrics. Working on applying data to decisions.',
        strengths: ['Basic metric awareness', 'Willing to learn'],
        growthAreas: ['Data interpretation', 'Metric application', 'Analytical depth'],
        traits: ['Learning', 'Developing', 'Practical']
      },
      foundational: {
        text: 'Building foundational metric literacy. Needs guidance on using data effectively.',
        strengths: ['Number awareness', 'Follows metrics'],
        growthAreas: ['Data understanding', 'Metric application', 'Analytical thinking'],
        traits: ['Learning', 'Following', 'Developing']
      }
    },
    'Personality & Behavioral': {
      exceptional: {
        text: 'Highly adaptive personality with strong behavioral alignment. Navigates diverse situations effectively.',
        strengths: ['Adaptability', 'Self-awareness', 'Behavioral flexibility'],
        growthAreas: ['May need to maintain consistency'],
        traits: ['Adaptable', 'Self-aware', 'Flexible']
      },
      strong: {
        text: 'Good personality fit with consistent behavioral patterns. Handles most situations appropriately.',
        strengths: ['Consistency', 'Self-awareness', 'Appropriateness'],
        growthAreas: ['Situational adaptation', 'Range of behaviors'],
        traits: ['Consistent', 'Aware', 'Appropriate']
      },
      developing: {
        text: 'Developing behavioral awareness. Working on adapting style to different situations.',
        strengths: ['Basic self-awareness', 'Willing to adapt'],
        growthAreas: ['Behavioral range', 'Situational awareness', 'Flexibility'],
        traits: ['Learning', 'Developing', 'Trying']
      },
      foundational: {
        text: 'Building foundational behavioral skills. Needs guidance on appropriate workplace behaviors.',
        strengths: ['Open to feedback', 'Basic awareness'],
        growthAreas: ['Behavioral understanding', 'Situational adaptation', 'Self-regulation'],
        traits: ['Learning', 'Following', 'Developing']
      }
    },
    'Problem-Solving': {
      exceptional: {
        text: 'Exceptional problem-solver who tackles complex challenges systematically. Generates innovative solutions.',
        strengths: ['Systematic approach', 'Innovation', 'Root cause analysis'],
        growthAreas: ['May need to involve others more'],
        traits: ['Innovative', 'Systematic', 'Analytical']
      },
      strong: {
        text: 'Strong problem-solving skills with structured approach. Effectively resolves most challenges.',
        strengths: ['Structured thinking', 'Practical solutions', 'Analytical'],
        growthAreas: ['Complex problem frameworks', 'Creativity'],
        traits: ['Structured', 'Practical', 'Logical']
      },
      developing: {
        text: 'Developing problem-solving capabilities. Works well on familiar problems but struggles with complexity.',
        strengths: ['Follows process', 'Practical approach'],
        growthAreas: ['Complex analysis', 'Root cause', 'Innovative thinking'],
        traits: ['Process-driven', 'Learning', 'Practical']
      },
      foundational: {
        text: 'Building foundational problem-solving skills. Needs guidance and structured approaches.',
        strengths: ['Basic troubleshooting', 'Follows guidance'],
        growthAreas: ['Analytical thinking', 'Root cause analysis', 'Solution generation'],
        traits: ['Learning', 'Following', 'Developing']
      }
    },
    'Technical & Manufacturing': {
      exceptional: {
        text: 'Exceptional technical expertise with deep understanding of systems and processes. Troubleshoots complex issues effectively.',
        strengths: ['Technical depth', 'Systems thinking', 'Troubleshooting'],
        growthAreas: ['May need to share knowledge more'],
        traits: ['Technical expert', 'Systems thinker', 'Hands-on']
      },
      strong: {
        text: 'Strong technical foundation with good understanding of core processes. Handles routine technical challenges well.',
        strengths: ['Technical knowledge', 'Process understanding', 'Reliability'],
        growthAreas: ['Complex systems', 'Advanced troubleshooting'],
        traits: ['Technically capable', 'Process-aware', 'Reliable']
      },
      developing: {
        text: 'Developing technical skills. Competent with routine tasks but learning complex systems.',
        strengths: ['Basic technical skills', 'Willing to learn'],
        growthAreas: ['System understanding', 'Advanced troubleshooting', 'Process optimization'],
        traits: ['Learning', 'Hands-on', 'Developing']
      },
      foundational: {
        text: 'Building foundational technical knowledge. Needs guidance and training for technical tasks.',
        strengths: ['Basic awareness', 'Safety conscious'],
        growthAreas: ['Technical understanding', 'System operation', 'Troubleshooting'],
        traits: ['Learning', 'Following', 'Developing']
      }
    }
  };

  // Default template for any category not specifically defined
  const defaultTemplate = {
    exceptional: {
      text: `Exceptional performance in ${category}. Demonstrates mastery and deep understanding.`,
      strengths: ['Advanced capability', 'Deep understanding', 'Consistent excellence'],
      growthAreas: ['Continued refinement', 'Knowledge sharing'],
      traits: ['Expert', 'Capable', 'Consistent']
    },
    strong: {
      text: `Strong performance in ${category}. Shows solid capability and good understanding.`,
      strengths: ['Solid capability', 'Good understanding', 'Reliable performance'],
      growthAreas: ['Further development', 'Advanced application'],
      traits: ['Capable', 'Reliable', 'Knowledgeable']
    },
    developing: {
      text: `Developing capability in ${category}. Shows foundational understanding with room for growth.`,
      strengths: ['Foundational knowledge', 'Willingness to learn'],
      growthAreas: ['Depth of understanding', 'Practical application'],
      traits: ['Developing', 'Learning', 'Foundational']
    },
    foundational: {
      text: `Building foundational skills in ${category}. Requires guidance and development.`,
      strengths: ['Basic awareness', 'Open to learning'],
      growthAreas: ['Core understanding', 'Skill development', 'Practical application'],
      traits: ['Learning', 'Developing', 'Foundational']
    }
  };

  const template = analysisTemplates[category] || defaultTemplate;
  const levelData = template[scoreLevel] || template.developing;

  // Generate behavioral indicators
  const behavioralIndicators = generateBehavioralIndicators(category, percentage, average);

  return {
    text: levelData.text,
    strengths: levelData.strengths,
    growthAreas: levelData.growthAreas,
    recommendations: levelData.growthAreas.map(area => `Focus on ${area.toLowerCase()}`),
    traits: levelData.traits,
    behavioralIndicators
  };
}

// Generate behavioral indicators based on category and score
function generateBehavioralIndicators(category, percentage, average) {
  const indicators = [];

  if (percentage >= 70) {
    indicators.push(`Consistently demonstrates strong ${category.toLowerCase()} behaviors`);
    indicators.push(`Shows initiative and capability in ${category.toLowerCase()} situations`);
  } else if (percentage >= 50) {
    indicators.push(`Displays adequate ${category.toLowerCase()} behaviors in familiar situations`);
    indicators.push(`May need support with complex ${category.toLowerCase()} challenges`);
  } else {
    indicators.push(`Developing foundational ${category.toLowerCase()} behaviors`);
    indicators.push(`Requires guidance in ${category.toLowerCase()} situations`);
  }

  return indicators;
}

// Generate comprehensive profile
function generateComprehensiveProfile(categoryAnalysis, strengths, weaknesses, overallPercentage) {
  const strengthCount = strengths.length;
  const weaknessCount = weaknesses.length;
  const totalCategories = Object.keys(categoryAnalysis).length;

  let executiveSummary = '';
  let overallProfile = '';
  let recommendations = [];
  let developmentPlan = [];

  // Determine overall profile
  if (overallPercentage >= 80) {
    executiveSummary = 'High-Performing Candidate: Demonstrates exceptional capability across most areas. Ready for increased responsibility and complex challenges.';
    overallProfile = 'This candidate shows strong potential for leadership and advanced roles. Their performance indicates they would excel in challenging environments and can be trusted with significant responsibility.';
  } else if (overallPercentage >= 60) {
    executiveSummary = 'Solid Performer with Growth Potential: Shows good capability with clear areas for development. Would benefit from targeted growth opportunities.';
    overallProfile = 'This candidate has a solid foundation and performs well in most areas. With focused development in specific areas, they could advance to higher levels of responsibility.';
  } else if (overallPercentage >= 40) {
    executiveSummary = 'Developing Professional: Demonstrates foundational skills with significant growth opportunities. Would benefit from structured development and mentorship.';
    overallProfile = 'This candidate is building their professional capabilities. They show willingness and foundational understanding but need support to reach their full potential.';
  } else {
    executiveSummary = 'Entry-Level Foundation: Building basic professional skills. Requires significant development and close guidance.';
    overallProfile = 'This candidate is at an early stage of professional development. They need structured learning, clear expectations, and consistent feedback to grow.';
  }

  // Generate recommendations
  if (strengths.length > 0) {
    recommendations.push(`Leverage strengths in: ${strengths.map(s => s.category).join(', ')}`);
    strengths.slice(0, 2).forEach(s => {
      recommendations.push(`In ${s.category}, encourage them to mentor others and take on stretch assignments`);
    });
  }

  if (weaknesses.length > 0) {
    recommendations.push(`Priority development areas: ${weaknesses.map(w => w.category).join(', ')}`);
    weaknesses.slice(0, 3).forEach(w => {
      recommendations.push(`For ${w.category}, provide targeted training and regular feedback`);
    });
  }

  recommendations.push('Create a 90-day development plan with specific, measurable goals');
  recommendations.push('Schedule monthly check-ins to review progress and adjust approach');

  // Generate development plan
  developmentPlan = [
    'Immediate (0-30 days):',
    ...weaknesses.slice(0, 2).map(w => `• Focus on ${w.category} - identify specific learning opportunities`),
    '• Meet with manager to discuss assessment results and create action plan',
    '',
    'Short-term (30-60 days):',
    ...weaknesses.slice(0, 3).map(w => `• Complete training or project in ${w.category}`),
    '• Seek feedback from colleagues on progress',
    '',
    'Medium-term (60-90 days):',
    '• Apply learning in practical situations',
    '• Demonstrate improvement in targeted areas',
    '• Review progress and adjust development plan'
  ];

  return {
    executiveSummary,
    overallProfile,
    recommendations,
    developmentPlan
  };
}
