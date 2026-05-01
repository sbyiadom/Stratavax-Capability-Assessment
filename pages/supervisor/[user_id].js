import { useEffect, useState } from "react";
import > 0import { useRouter } from "next/router";
    ) {
      return generatedReport.categoryScores;
    }

    return {};
  };

  const getDevelopmentRecommendation = (category, percentage) => {
    const value = Number(percentage || 0);

    if (value >= 80) {
      return `Continue to leverage ${category} as a key strength. Consider mentoring others or taking on stretch assignments in this area.`;
    }

    if (value >= 70) {
      return `Build on the solid foundation in ${category}. Focus on advanced application and practical exposure.`;
    }

    if (value >= 60) {
      return `Targeted development in ${category} will support meaningful improvement. Focus on core concepts and structured practice.`;
    }

    if (value >= 50) {
      return `${category} requires focused attention. Start with foundational training and mentoring support.`;
    }

    return `${category} is a critical priority. Immediate structured learning and close supervision are recommended.`;
  };

  const buildCompetencyData = (categoryScores, assessmentTypeId) => {
    const competencies = Object.entries(categoryScores || {}).map(
      ([category, data], index) => {
        const percentage = Number(data?.percentage || 0);

        let classification = "Needs Development";

        if (percentage >= 80) {
          classification = "Strong";
        } else if (percentage >= 55) {
          classification = "Moderate";
        }

        return {
          id: `comp-${index}`,
          competencies: {
            name: category,
            category: assessmentTypeId || "general"
          },
          percentage,
          raw_score: data?.score || data?.total || 0,
          max_possible: data?.maxPossible || 100,
          classification,
          gap: Math.max(0, 80 - percentage),
          narrative: generateCommentary(
            category,
            percentage,
            classification === "Strong" ? "strength" : "weakness",
            assessmentTypeId
          ),
          recommendation: getDevelopmentRecommendation(category, percentage)
        };
      }
    );

    return competencies.sort((a, b) => b.percentage - a.percentage);
  };

  const calculateBehavioralFromResponses = (responses, sessionInfo = null) => {
    const safeResponses = responses || [];
    const totalSessionTime = Number(sessionInfo?.time_spent_seconds || 0);

    const responseTimes = safeResponses
      .map((response) => Number(response.time_spent_seconds || 0))
      .filter((time) => time > 0);

    const totalAnswerChanges = safeResponses.reduce(
      (sum, response) => sum + Number(response.times_changed || 0),
      0
    );

    const avgChangesPerQuestion =
      safeResponses.length > 0 ? totalAnswerChanges / safeResponses.length : 0;

    let unchangedInitialAnswers = 0;
    let responsesWithInitialAnswer = 0;

    safeResponses.forEach((response) => {
      if (
        response.initial_answer_id !== null &&
        response.initial_answer_id !== undefined &&
        response.answer_id !== null &&
        response.answer_id !== undefined
      ) {
        responsesWithInitialAnswer += 1;

        if (String(response.initial_answer_id) === String(response.answer_id)) {
          unchangedInitialAnswers += 1;
        }
      }
    });

    const firstInstinctAccuracy =
      responsesWithInitialAnswer > 0
        ? (unchangedInitialAnswers / responsesWithInitialAnswer) * 100
        : 0;

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const sortedTimes = [...responseTimes].sort((a, b) => a - b);

    let medianResponseTime = 0;

    if (sortedTimes.length > 0) {
      const middle = Math.floor(sortedTimes.length / 2);

      if (sortedTimes.length % 2 === 0) {
        medianResponseTime = (sortedTimes[middle - 1] + sortedTimes[middle]) / 2;
      } else {
        medianResponseTime = sortedTimes[middle];
      }
    }

    const totalCapturedResponseTime = responseTimes.reduce(
      (sum, time) => sum + time,
      0
    );

    let timeVariance = 0;

    if (responseTimes.length > 0) {
      timeVariance =
        responseTimes.reduce(
          (sum, time) => sum + Math.pow(time - avgResponseTime, 2),
          0
        ) / responseTimes.length;
    }

    let workStyle = "Balanced";
    let confidenceLevel = "Moderate";
    let decisionPattern = "Consistent First Choice";

    if (totalAnswerChanges === 0) {
      workStyle = "Balanced";
      confidenceLevel = "Moderate";
      decisionPattern = "Consistent First Choice";
    } else if (totalAnswerChanges <= 3) {
      workStyle = "Balanced";
      confidenceLevel = "Moderate";
      decisionPattern = "Minor Review Pattern";
    } else {
      workStyle = "Review-Oriented";
      confidenceLevel = "Variable";
      decisionPattern = "Frequent Reconsideration";
    }

    return {
      work_style: workStyle,
      confidence_level: confidenceLevel,
      attention_span: "Consistent",
      decision_pattern: decisionPattern,

      avg_response_time_seconds: Math.round(avgResponseTime * 100) / 100,
      median_response_time_seconds: Math.round(medianResponseTime * 100) / 100,
      fastest_response_seconds: sortedTimes[0] || null,
      slowest_response_seconds: sortedTimes[sortedTimes.length - 1] || null,
      total_time_spent_seconds:
        totalCapturedResponseTime > 0
          ? totalCapturedResponseTime
          : totalSessionTime,
      time_variance: Math.round(timeVariance * 100) / 100,

      total_answer_changes: totalAnswerChanges,
      avg_changes_per_question: Math.round(avgChangesPerQuestion * 100) / 100,
      improvement_rate: 0,
      first_instinct_accuracy: Math.round(firstInstinctAccuracy * 100) / 100,

      total_question_visits: 0,
      revisit_rate: 0,
      skipped_questions: 0,
      linearity_score: 0,

      first_half_avg_time: 0,
      second_half_avg_time: 0,
      fatigue_factor: 0,

      recommended_support:
        "Provide balanced support with regular check-ins on progress. Continue to monitor performance patterns.",
      development_focus_areas: [
        "Consistent performance",
        "Regular feedback",
        "Progress monitoring"
      ]
    };
  };

  const mapBehavioralMetricsForDisplay = (behavioralMetricsData) => {
    if (!behavioralMetricsData) return null;

    return {
      work_style: behavioralMetricsData.work_style || "Balanced",
      confidence_level: behavioralMetricsData.confidence_level || "Moderate",
      attention_span: behavioralMetricsData.attention_span || "Consistent",
      decision_pattern: behavioralMetricsData.decision_pattern || "Deliberate",

      avg_response_time_seconds:
        behavioralMetricsData.avg_response_time_seconds,
      median_response_time_seconds:
        behavioralMetricsData.median_response_time_seconds,
      fastest_response_seconds:
        behavioralMetricsData.fastest_response_seconds,
      slowest_response_seconds:
        behavioralMetricsData.slowest_response_seconds,
      total_time_spent_seconds:
        behavioralMetricsData.total_time_spent_seconds,
      time_variance: behavioralMetricsData.time_variance,

      total_answer_changes: behavioralMetricsData.total_answer_changes || 0,
      avg_changes_per_question:
        behavioralMetricsData.avg_changes_per_question || 0,
      improvement_rate: behavioralMetricsData.improvement_rate,
      first_instinct_accuracy:
        behavioralMetricsData.first_instinct_accuracy,

      total_question_visits: behavioralMetricsData.total_question_visits || 0,
      revisit_rate: behavioralMetricsData.revisit_rate,
      skipped_questions: behavioralMetricsData.skipped_questions || 0,
      linearity_score: behavioralMetricsData.linearity_score,

      first_half_avg_time: behavioralMetricsData.first_half_avg_time,
      second_half_avg_time: behavioralMetricsData.second_half_avg_time,
      fatigue_factor: behavioralMetricsData.fatigue_factor,

      recommended_support:
        behavioralMetricsData.recommended_support ||
        "Provide balanced support with regular check-ins on progress.",
      development_focus_areas:
        behavioralMetricsData.development_focus_areas || []
    };
  };

  const generateSupervisorDecisionSnapshot = (
    result,
    assessmentTypeId,
    categoryScores,
    superAnalysisData
  ) => {
    const percentage = Number(result?.percentage_score ?? 0);
    const isManufacturing = assessmentTypeId === "manufacturing_baseline";

    if (isManufacturing) {
      const safety =
        categoryScores?.["Safety & Work Ethic"]?.percentage ||
        categoryScores?.["Safety &amp; Work Ethic"]?.percentage ||
        0;

      const technical =
        categoryScores?.["Technical Fundamentals"]?.percentage || 0;

      const troubleshooting =
        categoryScores?.Troubleshooting?.percentage || 0;

      let readiness = "Not Ready";
      let supervision = "Close";
      let placement = "Training Before Placement";
      let nextStep =
        "Complete foundational training before independent production assignment.";
      let retest = "Retest after 30-60 days of structured training.";

      if (safety >= 70 && technical >= 60 && troubleshooting >= 60) {
        readiness = "Conditionally Ready";
        supervision = "Increased";
        placement = "Supervised Production Exposure";
        nextStep =
          "Begin supervised line exposure with structured coaching and practical validation.";
      }

      if (safety >= 80 && technical >= 70 && troubleshooting >= 70) {
        readiness = "Ready";
        supervision = "Standard";
        placement = "Production Line / Manufacturing Associate";
        nextStep =
          "Proceed with standard onboarding and practical role validation.";
        retest = "Retest optional after onboarding period.";
      }

      if (safety < 60) {
        readiness = "Not Ready";
        supervision = "Close";
        placement = "Safety Training Required";
        nextStep =
          "Prioritize safety training before production or equipment exposure.";
      }

      return {
        title: "Supervisor Decision Snapshot",
        readiness,
        placement,
        supervision,
        nextStep,
        retest,
        primaryRisk:
          safety < 60
            ? "Safety & Work Ethic"
            : technical < 60
            ? "Technical Fundamentals"
            : troubleshooting < 60
            ? "Troubleshooting"
            : "None critical",
        note:
          "Manufacturing readiness should be validated through practical observation before independent assignment."
      };
    }

    let readiness = "Development Required";
    let supervision = "Close";
    let placement = "Structured Role with Support";
    let nextStep = "Provide targeted development and supervisor check-ins.";
    let retest = "Retest after development period if role-critical.";

    if (percentage >= 85) {
      readiness = "High Potential";
      supervision = "Standard";
      placement = "Stretch Role / Advanced Responsibility";
      nextStep = "Leverage strengths through challenging assignments.";
      retest = "Retest not required unless role changes.";
    } else if (percentage >= 70) {
      readiness = "Strong Performer";
      supervision = "Moderate";
      placement = "Role Placement with Targeted Development";
      nextStep = "Use strengths while addressing specific development areas.";
      retest = "Retest optional after development plan.";
    } else if (percentage >= 55) {
      readiness = "Developing";
      supervision = "Increased";
      placement = "Structured Role with Coaching";
      nextStep = "Create a focused development plan and monitor progress.";
      retest = "Retest after 60-90 days.";
    }

    return {
      title: "Supervisor Decision Snapshot",
      readiness,
      placement,
      supervision,
      nextStep,
      retest,
      primaryRisk:
        superAnalysisData?.developmentAreas?.byScore?.[0]?.area ||
        "Review development areas",
      note:
        "This recommendation should be interpreted with interview evidence, references, and practical validation."
    };
  };

  const loadAssessmentData = async (result, candidateInfo) => {
    try {
      setSelectedAssessment(null);
      setStratavaxReport(null);
      setCompetencyData([]);
      setSuperAnalysis(null);
      setBehavioralData(null);
      setQuestionResponses([]);
      setInvalidReason("");

      if (result.is_valid === false) {
        setInvalidReason(
          result.validation_note ||
            "This assessment was auto-submitted due to rule violations and is not considered valid."
        );
      }

      const assessmentTypeId = getAssessmentTypeId(result);
      const config = getAssessmentType(assessmentTypeId);

      let sessionInfo = null;

      if (result.session_id) {
        const { data: sessionData, error: sessionError } = await supabase
          .from("assessment_sessions")
          .select("*")
          .eq("id", result.session_id)
          .maybeSingle();

        if (sessionError) {
          console.error("Error fetching assessment session:", sessionError);
        }

        sessionInfo = sessionData;
      }

      let responsesQuery = supabase.from("responses").select(`
        *,
        unique_questions!inner (
          id,
          section,
          subsection,
          question_text
        ),
        unique_answers!inner (
          id,
          answer_text,
          score
        )
      `);

      if (result.session_id) {
        responsesQuery = responsesQuery.eq("session_id", result.session_id);
      } else {
        responsesQuery = responsesQuery
          .eq("user_id", user_id)
          .eq("assessment_id", result.assessment_id);
      }

      const { data: responsesData, error: responsesError } =
        await responsesQuery;

      if (responsesError) {
        console.error("Error fetching responses:", responsesError);
      }

      const safeResponses = responsesData || [];
      setQuestionResponses(safeResponses);

      const generatedReport = generateStratavaxReport(
        user_id,
        assessmentTypeId,
        safeResponses,
        candidateInfo.full_name,
        result.completed_at
      );

      setStratavaxReport(generatedReport);

      const categoryScores = normalizeCategoryScores(result, generatedReport);
      const competencies = buildCompetencyData(categoryScores, assessmentTypeId);

      setCompetencyData(competencies);

      let generatedSuperAnalysis = null;

      try {
        generatedSuperAnalysis = generateSuperAnalysis(
          candidateInfo.full_name,
          assessmentTypeId,
          safeResponses,
          categoryScores,
          result.total_score,
          result.max_score
        );

        setSuperAnalysis(generatedSuperAnalysis);
      } catch (error) {
        console.error("Error generating super analysis:", error);
      }

      let behavioralInsightsData = null;

      let behavioralQuery = supabase
        .from("behavioral_metrics")
        .select("*")
        .eq("user_id", user_id)
        .eq("assessment_id", result.assessment_id);

      if (result.session_id) {
        behavioralQuery = behavioralQuery.eq("session_id", result.session_id);
      }

      const { data: behavioralMetricsData, error: metricsError } =
        await behavioralQuery.maybeSingle();

      if (metricsError) {
        console.error("Error fetching behavioral metrics:", metricsError);
      }

      if (behavioralMetricsData) {
        behavioralInsightsData =
          mapBehavioralMetricsForDisplay(behavioralMetricsData);
      }

      if (!behavioralInsightsData && safeResponses.length > 0) {
        behavioralInsightsData = calculateBehavioralFromResponses(
          safeResponses,
          sessionInfo
        );
      }

      setBehavioralData(behavioralInsightsData);

      const decisionSnapshot = generateSupervisorDecisionSnapshot(
        result,
        assessmentTypeId,
        categoryScores,
        generatedSuperAnalysis
      );

      setSelectedAssessment({
        id: result.id,
        assessment_id: result.assessment_id,
        session_id: result.session_id,
        assessment_type: assessmentTypeId,
        assessment_name: config.name,
        total_score: result.total_score,
        max_score: result.max_score,
        percentage: generatedReport.percentageScore,
        completed_at: result.completed_at,
        category_scores: categoryScores,
        config,
        report: generatedReport,
        interpretations: result.interpretations,
        is_valid: result.is_valid !== false,
        validation_note: result.validation_note,
        decisionSnapshot
      });
    } catch (error) {
      console.error("Error loading assessment data:", error);
    }
  };

  const handleAssessmentChange = async (event) => {
    const selected = allAssessments.find(
      (assessment) => assessment.id === event.target.value
    );

    if (selected && candidate) {
      setLoading(true);
      await loadAssessmentData(selected, candidate);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getActionablePlan = (category, percentage) => {
    const value = Number(percentage || 0);
    const gap = 80 - value;

    if (gap <= 0) {
      return [
        `Lead a project utilizing ${category} skills`,
        `Mentor 2-3 colleagues in ${category}`,
        `Create a training resource on ${category} best practices`
      ];
    }

    if (gap <= 20) {
      return [
        `Complete an intermediate course in ${category} within 4-6 weeks`,
        `Practice ${category} skills in low-risk work situations`,
        `Seek feedback from a mentor on ${category} application`
      ];
    }

    if (gap <= 30) {
      return [
        `Enroll in foundational ${category} training within 6-8 weeks`,
        `Work with a mentor on weekly ${category} exercises`,
        `Set weekly goals for ${category} improvement`
      ];
    }

    return [
      `Complete intensive ${category} fundamentals training within 8-12 weeks`,
      `Schedule weekly coaching sessions focused on ${category}`,
      `Shadow an experienced colleague and document learning`
    ];
  };

  const handlePrint = () => window.print();

  if (!authChecked || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading assessment report...</p>
      </div>
    );
  }

  if (!candidate || !selectedAssessment || !stratavaxReport) {
    return (
      <div style={styles.emptyContainer}>
        <h3>No Assessment Data Available</h3>
        <p>This candidate has not completed any assessment results yet.</p>
        <Link href="/supervisor" style={styles.backButton}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const themeColor = getAssessmentThemeColor();
  const report = selectedAssessment.report.stratavaxReport;
  const isValidResult = selectedAssessment.is_valid !== false;
  const isManufacturing =
    selectedAssessment.assessment_type === "manufacturing_baseline";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "breakdown", label: "Score Breakdown" },
    { id: "competencies", label: "Competencies" },
    ...(behavioralData
      ? [{ id: "behavioral", label: "Behavioral Insights" }]
      : []),
    { id: "recommendations", label: "Recommendations" },
    { id: "development", label: "Development Plan" },
    ...(superAnalysis ? [{ id: "super", label: "Super Analysis" }] : []),
    { id: "responses", label: "Question Responses" }
  ];

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <Link href="/supervisor" style={styles.dashboardLink}>
              Dashboard
            </Link>
            <div style={styles.logo}>STRATAVAX</div>
          </div>

          <div style={styles.headerRight}>
            {allAssessments.length > 1 && (
              <select
                value={selectedAssessment.id}
                onChange={handleAssessmentChange}
                style={styles.assessmentSelect}
              >
                {allAssessments.map((assessmentResult) => {
                  const type = getAssessmentTypeId(assessmentResult);
                  const config = getAssessmentType(type);

                  return (
                    <option key={assessmentResult.id} value={assessmentResult.id}>
                      {config.name} -{" "}
                      {new Date(
                        assessmentResult.completed_at
                      ).toLocaleDateString()}
                    </option>
                  );
                })}
              </select>
            )}

            <button onClick={handlePrint} style={styles.printButton}>
              Print Report
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.hero,
          background: `linear-gradient(135deg, ${themeColor}08 0%, ${themeColor}04 100%)`
        }}
      >
        <div style={styles.heroContent}>
          <div style={styles.candidateInfo}>
            <div
              style={{
                ...styles.candidateAvatar,
                background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`
              }}
            >
              {candidate.full_name?.charAt(0) || "C"}
            </div>

            <div>
              <h1 style={styles.candidateName}>{candidate.full_name}</h1>
              <p style={styles.assessmentMeta}>
                {selectedAssessment.assessment_name} • Completed{" "}
                {formatDate(selectedAssessment.completed_at)}
              </p>
              {selectedAssessment.session_id && (
                <p style={styles.profileId}>
                  Session ID: {selectedAssessment.session_id}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              ...styles.scoreCard,
              background: `linear-gradient(135deg, ${themeColor}10, white)`
            }}
          >
            <div style={styles.scoreCircle}>
              <span style={{ ...styles.scoreValue, color: themeColor }}>
                {selectedAssessment.percentage}%
              </span>
              <span style={styles.scoreLabel}>Overall Score</span>
            </div>

            <div style={styles.scoreDetails}>
              <div style={styles.scoreDetailItem}>
                <span style={styles.scoreDetailLabel}>Score</span>
                <span style={styles.scoreDetailValue}>
                  {selectedAssessment.total_score}/{selectedAssessment.max_score}
                </span>
              </div>

              <div style={styles.scoreDetailItem}>
                <span style={styles.scoreDetailLabel}>Grade</span>
                <span style={styles.scoreDetailValue}>
                  {report.executiveSummary.grade}
                </span>
              </div>

              <div style={styles.scoreDetailItem}>
                <span style={styles.scoreDetailLabel}>Classification</span>
                <span
                  style={{
                    ...styles.classificationBadge,
                    background: `${themeColor}15`,
                    color: themeColor
                  }}
                >
                  {report.executiveSummary.classification}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isValidResult && (
        <div style={styles.warningContainer}>
          <div style={styles.warningBox}>
            <strong>Invalid Assessment Result</strong>
            <p style={styles.warningText}>
              {selectedAssessment.validation_note ||
                invalidReason ||
                "This assessment was auto-submitted due to rule violations and is not considered valid."}
            </p>
          </div>
        </div>
      )}

      <div style={styles.tabsContainer}>
        <div style={styles.tabsWrapper}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id
                  ? {
                      ...styles.tabActive,
                      borderBottomColor: themeColor,
                      color: themeColor
                    }
                  : {})
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  style={{
                    ...styles.tabIndicator,
                    background: themeColor
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.mainContent}>
        {activeTab === "overview" && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Executive Summary</h2>

            <div
              style={{
                ...styles.narrativeBox,
                borderLeftColor: themeColor
              }}
            >
              <p style={styles.executiveText}>
                {report.executiveSummary.narrative}
              </p>
              <p style={styles.executiveDesc}>
                {report.executiveSummary.classificationDescription}
              </p>
            </div>

            {selectedAssessment.decisionSnapshot && (
              <div style={styles.snapshotBox}>
                <h3 style={styles.snapshotTitle}>
                  {selectedAssessment.decisionSnapshot.title}
                </h3>

                <div style={styles.snapshotGrid}>
                  <div style={styles.snapshotItem}>
                    <span style={styles.snapshotLabel}>Readiness</span>
                    <strong style={{ color: themeColor }}>
                      {selectedAssessment.decisionSnapshot.readiness}
                    </strong>
                  </div>

                  <div style={styles.snapshotItem}>
                    <span style={styles.snapshotLabel}>Placement</span>
                    <strong>
                      {selectedAssessment.decisionSnapshot.placement}
                    </strong>
                  </div>

                  <div style={styles.snapshotItem}>
                    <span style={styles.snapshotLabel}>Supervision</span>
                    <strong>
                      {selectedAssessment.decisionSnapshot.supervision}
                    </strong>
                  </div>

                  <div style={styles.snapshotItem}>
                    <span style={styles.snapshotLabel}>Primary Risk</span>
                    <strong>
                      {selectedAssessment.decisionSnapshot.primaryRisk}
                    </strong>
                  </div>
                </div>

                <p style={styles.snapshotAction}>
                  <strong>Next Step:</strong>{" "}
                  {selectedAssessment.decisionSnapshot.nextStep}
                </p>

                <p style={styles.snapshotAction}>
                  <strong>Retest Guidance:</strong>{" "}
                  {selectedAssessment.decisionSnapshot.retest}
                </p>

                <p style={styles.snapshotNote}>
                  {selectedAssessment.decisionSnapshot.note}
                </p>
              </div>
            )}

            <div style={styles.statsGrid}>
              <div style={styles.greenStatCard}>
                <div style={styles.statValue}>
                  {competencyData.filter((c) => c.percentage >= 70).length}
                </div>
                <div style={styles.statLabel}>Strengths Identified</div>
              </div>

              <div style={styles.blueStatCard}>
                <div style={styles.statValue}>
                  {
                    competencyData.filter(
                      (c) => c.percentage >= 55 && c.percentage < 70
                    ).length
                  }
                </div>
                <div style={styles.statLabel}>Developing Areas</div>
              </div>

              <div style={styles.orangeStatCard}>
                <div style={styles.statValue}>
                  {competencyData.filter((c) => c.percentage < 55).length}
                </div>
                <div style={styles.statLabel}>Needs Work</div>
              </div>
            </div>

            <h3 style={styles.subsectionTitle}>Key Strengths</h3>

            {competencyData.filter((c) => c.percentage >= 70).length === 0 ? (
              <p style={styles.emptyText}>
                No category reached the strength threshold. Development should
                focus on building baseline competence before specialization.
              </p>
            ) : (
              <div style={styles.cardGrid}>
                {competencyData
                  .filter((c) => c.percentage >= 70)
                  .slice(0, 4)
                  .map((comp) => (
                    <div key={comp.id} style={styles.strengthCard}>
                      <div style={styles.cardHeader}>
                        <strong>{comp.competencies.name}</strong>
                        <span>{comp.percentage}%</span>
                      </div>
                      <p style={styles.cardText}>{comp.narrative}</p>
                    </div>
                  ))}
              </div>
            )}

            <h3 style={styles.subsectionTitle}>Development Areas</h3>

            {competencyData.filter((c) => c.percentage < 60).length === 0 ? (
              <p style={styles.emptyText}>
                No major development area was identified below the current
                threshold.
              </p>
            ) : (
              <div style={styles.cardGrid}>
                {competencyData
                  .filter((c) => c.percentage < 60)
                  .slice(0, 4)
                  .map((comp) => (
                    <div key={comp.id} style={styles.weaknessCard}>
                      <div style={styles.cardHeader}>
                        <strong>{comp.competencies.name}</strong>
                        <span>{comp.percentage}%</span>
                      </div>
                      <p style={styles.cardText}>{comp.narrative}</p>
                      <p style={styles.gapText}>
                        Gap to target: {comp.gap}%
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "breakdown" && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Score Breakdown by Category</h2>
            <p style={styles.sectionDesc}>
              Detailed analysis of performance across all categories.
            </p>

            <div style={styles.tableContainer}>
              <table style={styles.dataTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Category</th>
                    <th style={styles.tableHeader}>Score</th>
                    <th style={styles.tableHeader}>Percentage</th>
                    <th style={styles.tableHeader}>Grade</th>
                    <th style={styles.tableHeader}>Performance</th>
                  </tr>
                </thead>

                <tbody>
                  {report.scoreBreakdown.map((item, index) => {
                    const gradeInfo = getGradeFromPercentage(item.percentage);

                    return (
                      <tr key={index} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <strong>{item.category}</strong>
                        </td>
                        <td style={styles.tableCell}>{item.score}</td>
                        <td style={styles.tableCell}>{item.percentage}%</td>
                        <td style={styles.tableCell}>
                          <span
                            style={{
                              ...styles.gradeBadge,
                              background: `${gradeInfo.color}15`,
                              color: gradeInfo.color
                            }}
                          >
                            {gradeInfo.letter} - {gradeInfo.description}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{item.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "competencies" && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Competency Analysis</h2>
            <p style={styles.sectionDesc}>
              Detailed breakdown of core competencies with narrative analysis.
            </p>

            <div style={styles.cardGrid}>
              {competencyData.map((comp) => {
                const color =
                  comp.classification === "Strong"
                    ? "#4CAF50"
                    : comp.classification === "Moderate"
                    ? "#FF9800"
                    : "#F44336";

                return (
                  <div
                    key={comp.id}
                    style={{
                      ...styles.competencyCard,
                      borderLeft: `5px solid ${color}`
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <strong>{comp.competencies.name}</strong>
                      <span>{comp.percentage}%</span>
                    </div>

                    <p style={styles.cardText}>{comp.narrative}</p>
                    <p style={styles.gapText}>Target: 80% • Gap: {comp.gap}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "behavioral" && behavioralData && (
          <div style={styles.contentCard}>
            <BehavioralInsights
              behavioralData={behavioralData}
              candidateName={candidate.full_name}
            />
          </div>
        )}

        {activeTab === "recommendations" && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Development Recommendations</h2>
            <p style={styles.sectionDesc}>
              Based on assessment results and available behavioral patterns.
            </p>

            <div style={styles.recommendationsList}>
              {report.recommendations.map((recommendation, index) => {
                const color =
                  recommendation.priority === "High"
                    ? "#F44336"
                    : recommendation.priority === "Medium"
                    ? "#FF9800"
                    : "#4CAF50";

                return (
                  <div
                    key={index}
                    style={{
                      ...styles.recommendationCard,
                      borderLeft: `5px solid ${color}`
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <strong>{recommendation.category}</strong>
                      <span>{recommendation.priority} Priority</span>
                    </div>

                    <p style={styles.cardText}>
                      {recommendation.recommendation}
                    </p>

                    <p style={styles.cardText}>
                      <strong>Action:</strong> {recommendation.action}
                    </p>

                    <p style={styles.cardText}>
                      <strong>Impact:</strong> {recommendation.impact}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "development" && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Personalized Development Plan</h2>
            <p style={styles.sectionDesc}>
              A structured plan to support improvement in key areas.
            </p>

            {competencyData.filter((c) => c.percentage < 80).length > 0 ? (
              competencyData
                .filter((c) => c.percentage < 80)
                .slice(0, 3)
                .map((comp) => {
                  const actions = getActionablePlan(
                    comp.competencies.name,
                    comp.percentage
                  );

                  return (
                    <div key={comp.id} style={styles.planCard}>
                      <div style={styles.cardHeader}>
                        <strong>{comp.competencies.name}</strong>
                        <span>
                          {comp.percentage}% → Target 80%
                        </span>
                      </div>

                      <ul style={styles.planList}>
                        {actions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })
            ) : (
              <div style={styles.noDevelopmentNeeded}>
                <h3>Excellent Performance</h3>
                <p>
                  This candidate has scored 80% or higher in all competency
                  areas.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "super" && superAnalysis && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Super Analysis</h2>
            <p style={styles.sectionDesc}>
              Advanced analysis combining competency, behavioral, and predictive
              insights.
            </p>

            <div
              style={{
                ...styles.superOverview,
                background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`
              }}
            >
              <h3 style={styles.superTitle}>Candidate Profile Summary</h3>
              <p style={styles.superDesc}>{superAnalysis.summary.oneLine}</p>
            </div>

            {superAnalysis.differentiators?.length > 0 && (
              <>
                <h3 style={styles.subsectionTitle}>
                  Competitive Differentiators
                </h3>

                <div style={styles.cardGrid}>
                  {superAnalysis.differentiators
                    .slice(0, 3)
                    .map((diff, index) => (
                      <div key={index} style={styles.competencyCard}>
                        <div style={styles.cardHeader}>
                          <strong>{diff.differentiator}</strong>
                          <span>{diff.score}%</span>
                        </div>
                        <p style={styles.cardText}>{diff.value}</p>
                      </div>
                    ))}
                </div>
              </>
            )}

            <h3 style={styles.subsectionTitle}>Role Readiness Assessment</h3>

            {isManufacturing ? (
              <div style={styles.cardGrid}>
                {["production", "quality", "maintenance"].map((key) => {
                  const readiness = superAnalysis.roleReadiness?.[key];

                  if (!readiness) return null;

                  return (
                    <div key={key} style={styles.competencyCard}>
                      <div style={styles.cardHeader}>
                        <strong>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </strong>
                        <span>{readiness.score}%</span>
                      </div>

                      <p style={styles.cardText}>
                        <strong>Status:</strong>{" "}
                        {readiness.ready
                          ? "Ready"
                          : readiness.score >= 60
                          ? "Developing"
                          : "Not Ready"}
                      </p>

                      <p style={styles.cardText}>{readiness.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.cardGrid}>
                {["executive", "management", "technical"].map((key) => {
                  const readiness = superAnalysis.roleReadiness?.[key];

                  if (!readiness) return null;

                  return (
                    <div key={key} style={styles.competencyCard}>
                      <div style={styles.cardHeader}>
                        <strong>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </strong>
                        <span>{readiness.score}%</span>
                      </div>

                      <p style={styles.cardText}>
                        <strong>Status:</strong>{" "}
                        {readiness.ready
                          ? "Ready"
                          : readiness.score >= 60
                          ? "Developing"
                          : "Not Ready"}
                      </p>

                      <p style={styles.cardText}>{readiness.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "responses" && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Question Responses</h2>
            <p style={styles.sectionDesc}>
              Review all answers provided by the candidate for this assessment
              attempt.
            </p>

            <div style={styles.responsesList}>
              {questionResponses.length === 0 ? (
                <p>No response data available.</p>
              ) : (
                questionResponses.map((response, index) => (
                  <div key={index} style={styles.responseCard}>
                    <div style={styles.responseHeader}>
                      <span style={styles.responseNumber}>Q{index + 1}</span>
                      <span style={styles.responseSection}>
                        {response.unique_questions?.section || "General"}
                      </span>
                    </div>

                    <div style={styles.responseQuestion}>
                      {response.unique_questions?.question_text ||
                        "Question text not available"}
                    </div>

                    <div style={styles.responseAnswers}>
                      <strong>Selected Answer:</strong>
                      <ul>
                        <li>
                          {response.unique_answers?.answer_text ||
                            response.answer_id}
                        </li>
                      </ul>
                    </div>

                    {(response.time_spent_seconds > 0 ||
                      response.times_changed > 0) && (
                      <div style={styles.responseMeta}>
                        {response.time_spent_seconds > 0 &&
                          `Time spent: ${response.time_spent_seconds} seconds`}
                        {response.times_changed > 0 &&
                          ` • Changed answer ${response.times_changed} time${
                            response.times_changed !== 1 ? "s" : ""
                          }`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }

        @media print {
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: "100vh",
    background: "#F5F7FA",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#F5F7FA",
    gap: "20px"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #E2E8F0",
    borderTop: "3px solid #0A1929",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  emptyContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px"
  },
  backButton: {
    marginTop: "20px",
    padding: "10px 24px",
    background: "#0A1929",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px"
  },
  header: {
    background: "#0A1929",
    position: "sticky",
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "24px"
  },
  dashboardLink: {
    color: "rgba(255,255,255,0.8)",
    textDecoration: "none",
    fontSize: "14px"
  },
  logo: {
    color: "white",
    fontWeight: 700,
    letterSpacing: "2px"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  assessmentSelect: {
    padding: "8px 12px",
    borderRadius: "8px"
  },
  printButton: {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.12)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    cursor: "pointer"
  },
  hero: {
    padding: "32px 0",
    borderBottom: "1px solid #E2E8F0"
  },
  heroContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap"
  },
  candidateInfo: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  candidateAvatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: 700
  },
  candidateName: {
    fontSize: "24px",
    margin: 0,
    color: "#0A1929"
  },
  assessmentMeta: {
    color: "#64748B",
    fontSize: "14px",
    marginTop: "6px"
  },
  profileId: {
    color: "#94A3B8",
    fontSize: "12px"
  },
  scoreCard: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    padding: "18px 24px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
  },
  scoreCircle: {
    textAlign: "center"
  },
  scoreValue: {
    fontSize: "36px",
    fontWeight: 800,
    display: "block"
  },
  scoreLabel: {
    fontSize: "11px",
    color: "#64748B",
    textTransform: "uppercase"
  },
  scoreDetails: {
    display: "flex",
    gap: "22px"
  },
  scoreDetailItem: {
    textAlign: "center"
  },
  scoreDetailLabel: {
    display: "block",
    fontSize: "11px",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: "4px"
  },
  scoreDetailValue: {
    fontWeight: 700,
    color: "#0A1929"
  },
  classificationBadge: {
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700
  },
  warningContainer: {
    maxWidth: "1200px",
    margin: "20px auto 0",
    padding: "0 24px"
  },
  warningBox: {
    background: "#FFF3E0",
    borderLeft: "5px solid #F44336",
    padding: "16px",
    borderRadius: "10px"
  },
  warningText: {
    margin: "6px 0 0",
    color: "#E65100",
    fontSize: "13px"
  },
  tabsContainer: {
    background: "white",
    borderBottom: "1px solid #E2E8F0",
    position: "sticky",
    top: "57px",
    zIndex: 90
  },
  tabsWrapper: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    gap: "8px",
    overflowX: "auto"
  },
  tab: {
    position: "relative",
    padding: "16px 18px",
    background: "none",
    border: "none",
    color: "#64748B",
    fontWeight: 600,
    cursor: "pointer"
  },
  tabActive: {
    color: "#0A1929"
  },
  tabIndicator: {
    position: "absolute",
    left: "18px",
    right: "18px",
    bottom: 0,
    height: "3px",
    borderRadius: "3px"
  },
  mainContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px"
  },
  contentCard: {
    background: "white",
    borderRadius: "16px",
    padding: "32px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
  },
  sectionTitle: {
    fontSize: "21px",
    marginBottom: "8px",
    color: "#0A1929"
  },
  sectionDesc: {
    color: "#64748B",
    fontSize: "14px",
    marginBottom: "24px"
  },
  subsectionTitle: {
    marginTop: "28px",
    fontSize: "17px",
    color: "#0A1929"
  },
  narrativeBox: {
    background: "#F8FAFC",
    padding: "22px",
    borderRadius: "12px",
    borderLeft: "6px solid",
    marginBottom: "24px"
  },
  executiveText: {
    lineHeight: 1.65,
    color: "#334155"
  },
  executiveDesc: {
    fontSize: "14px",
    color: "#64748B",
    fontStyle: "italic"
  },
  snapshotBox: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "28px"
  },
  snapshotTitle: {
    marginTop: 0,
    color: "#0A1929"
  },
  snapshotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginBottom: "16px"
  },
  snapshotItem: {
    background: "white",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "14px"
  },
  snapshotLabel: {
    display: "block",
    fontSize: "11px",
    color: "#64748B",
    marginBottom: "6px",
    textTransform: "uppercase"
  },
  snapshotAction: {
    fontSize: "13px",
    color: "#334155"
  },
  snapshotNote: {
    fontSize: "12px",
    color: "#64748B",
    fontStyle: "italic"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "24px"
  },
  greenStatCard: {
    background: "#E8F5E9",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center"
  },
  blueStatCard: {
    background: "#E3F2FD",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center"
  },
  orangeStatCard: {
    background: "#FFF3E0",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center"
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 800
  },
  statLabel: {
    fontSize: "12px",
    color: "#64748B"
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px"
  },
  strengthCard: {
    background: "#F0F9F0",
    border: "1px solid #C8E6C9",
    borderRadius: "12px",
    padding: "16px"
  },
  weaknessCard: {
    background: "#FEF2F2",
    border: "1px solid #FFCDD2",
    borderRadius: "12px",
    padding: "16px"
  },
  competencyCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "16px"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px"
  },
  cardText: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: 1.55
  },
  gapText: {
    fontSize: "12px",
    color: "#F57C00",
    fontWeight: 700
  },
  emptyText: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "14px",
    color: "#64748B",
    fontSize: "13px"
  },
  tableContainer: {
    overflowX: "auto"
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },
  tableHeaderRow: {
    background: "#F8FAFC",
    borderBottom: "2px solid #E2E8F0"
  },
  tableHeader: {
    padding: "12px",
    textAlign: "left"
  },
  tableRow: {
    borderBottom: "1px solid #E2E8F0"
  },
  tableCell: {
    padding: "12px"
  },
  gradeBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700
  },
  recommendationsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  recommendationCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "16px"
  },
  planCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "16px"
  },
  planList: {
    color: "#475569",
    lineHeight: 1.8
  },
  noDevelopmentNeeded: {
    background: "#E8F5E9",
    border: "1px solid #C8E6C9",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center"
  },
  superOverview: {
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
    color: "white"
  },
  superTitle: {
    marginTop: 0
  },
  superDesc: {
    marginBottom: 0,
    opacity: 0.95
  },
  responsesList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  responseCard: {
    background: "white",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "18px"
  },
  responseHeader: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px"
  },
  responseNumber: {
    background: "#F1F5F9",
    borderRadius: "999px",
    padding: "4px 10px",
    fontWeight: 700
  },
  responseSection: {
    background: "#F8FAFC",
    borderRadius: "999px",
    padding: "4px 10px",
    color: "#64748B"
  },
  responseQuestion: {
    fontWeight: 600,
    marginBottom: "10px",
    color: "#0A1929"
  },
  responseAnswers: {
    fontSize: "13px",
    color: "#334155"
  },
  responseMeta: {
    borderTop: "1px solid #E2E8F0",
    marginTop: "10px",
    paddingTop: "8px",
    color: "#94A3B8",
    fontSize: "12px"
  }
};
import Link from "next/link";
import { supabase } from "../../supabase/client";
import { generateStratavaxReport } from "../../utils/stratavaxReportGenerator";
import { getAssessmentType } from "../../utils/assessmentConfigs";
import { generateCommentary } from "../../utils/commentaryEngine";
import { generateSuperAnalysis } from "../../utils/super-analyzer";
import BehavioralInsights from "../../components/BehavioralInsights";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const [candidate, setCandidate] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [stratavaxReport, setStratavaxReport] = useState(null);
  const [competencyData, setCompetencyData] = useState([]);
  const [superAnalysis, setSuperAnalysis] = useState(null);
  const [behavioralData, setBehavioralData] = useState(null);
  const [questionResponses, setQuestionResponses] = useState([]);
  const [invalidReason, setInvalidReason] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = localStorage.getItem("userSession");

        if (!userSession) {
          router.push("/login");
          return;
        }

        const session = JSON.parse(userSession);

        if (session?.loggedIn) {
          setIsSupervisor(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authChecked || !isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: profileData, error: profileError } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("id", user_id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching candidate profile:", profileError);
        }

        const candidateInfo = {
          id: user_id,
          full_name:
            profileData?.full_name ||
            profileData?.email?.split("@")[0] ||
            "Candidate",
          email: profileData?.email || "Email not available"
        };

        setCandidate(candidateInfo);

        const { data: resultsData, error: resultsError } = await supabase
          .from("assessment_results")
          .select("*")
          .eq("user_id", user_id)
          .order("completed_at", { ascending: false });

        if (resultsError) {
          console.error("Error fetching assessment results:", resultsError);
        }

        const resultsWithAssessments = [];

        for (const result of resultsData || []) {
          const { data: assessment, error: assessmentError } = await supabase
            .from("assessments")
            .select("*, assessment_type:assessment_types(*)")
            .eq("id", result.assessment_id)
            .maybeSingle();

          if (assessmentError) {
            console.error("Error fetching assessment:", assessmentError);
          }

          if (assessment) {
            resultsWithAssessments.push({
              ...result,
              assessment
            });
          }
        }

        setAllAssessments(resultsWithAssessments);

        if (resultsWithAssessments.length > 0) {
          await loadAssessmentData(resultsWithAssessments[0], candidateInfo);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading report:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [authChecked, isSupervisor, user_id]);

  const getAssessmentTypeId = (result) => {
    return (
      result?.assessment?.assessment_type?.code ||
      result?.assessment_type ||
      "general"
    );
  };

  const getGradeFromPercentage = (percentage) => {
    const value = Number(percentage || 0);

    if (value >= 90) {
      return {
        letter: "A+",
        color: "#2E7D32",
        bg: "#E8F5E9",
        description: "Exceptional"
      };
    }

    if (value >= 80) {
      return {
        letter: "A",
        color: "#4CAF50",
        bg: "#E8F5E9",
        description: "Excellent"
      };
    }

    if (value >= 70) {
      return {
        letter: "B",
        color: "#1565C0",
        bg: "#E3F2FD",
        description: "Good"
      };
    }

    if (value >= 60) {
      return {
        letter: "C",
        color: "#F57C00",
        bg: "#FFF3E0",
        description: "Developing"
      };
    }

    if (value >= 50) {
      return {
        letter: "D",
        color: "#E65100",
        bg: "#FFF3E0",
        description: "Below Average"
      };
    }

    return {
      letter: "F",
      color: "#C62828",
      bg: "#FFEBEE",
      description: "Needs Improvement"
    };
  };

  const getAssessmentThemeColor = () => {
    if (selectedAssessment?.assessment_type === "manufacturing_baseline") {
      return "#2E7D32";
    }

    const percentage = Number(selectedAssessment?.percentage || 0);

    if (percentage >= 80) return "#2E7D32";
    if (percentage >= 60) return "#1565C0";
    if (percentage >= 40) return "#F57C00";

    return "#C62828";
  };

  const normalizeCategoryScores = (result, generatedReport) => {
    if (
      result?.category_scores &&
      Object.keys(result.category_scores).length > 0
    ) {
      return result.category_scores;
    }

    if (
      generatedReport?.categoryScores &&
