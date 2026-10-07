# Stratavax Capability Assessment Platform
## Assessment Methodology & Interpretation Guide

**Document Version:** 1.0
**Effective Date:** October 7, 2026
**Owner:** Stratavax Assessment Team
**Review Cycle:** Annually, or after any change to scoring logic

---

## 1. Purpose

This document describes how the Stratavax Capability Assessment Platform
scores assessments, interprets results, and produces reports. It is intended
for:

- **Internal reviewers** approving the platform for use
- **Supervisors** interpreting candidate reports
- **Administrators** configuring assessments
- **Auditors** verifying that reports are produced consistently

It is **not** a psychometric validation document. The platform has not yet
been normed, tested for reliability, or validated against external criteria.
Section 8 describes these limitations.

---

## 2. Assessment Design

Each assessment is a set of questions grouped by **section**. Sections
represent the behavioural or technical domains the assessment measures
(e.g. "Decision Making", "Communication", "Safety & Risk Awareness").

Questions are presented in a fixed order. The candidate's response set for
each attempt is **frozen** at session start — meaning a candidate who begins
an assessment sees the same set of questions from start to finish, even if
the question bank is edited during their session.

### Scoring Modes

Each question uses one of three scoring modes:

| Mode | Behaviour | Used For |
|---|---|---|
| **single_select** | Candidate picks one answer. The selected answer has a point value (typically 0–5). | Knowledge, judgement, values |
| **forced_choice** | Candidate picks TWO answers per question: the most likely and the least likely. Each answer has a separate `most_score` and `least_score` (both 1–5). | Behavioural disposition, situational judgement |
| **baseline** | Candidate selects the exact set of correct answers. Exact match = 1 point; otherwise 0. | Factual recall |

Some assessments mix modes within a single session (e.g. the Performance
Assessment contains both forced-choice and single-select questions). Each
question is scored according to its own mode, not the assessment's declared
mode.

### Assessment Duration

Assessments have a maximum duration set at the assessment-type level
(typically 60–90 minutes). If a candidate leaves the session idle for more
than 15 minutes, the platform auto-submits whatever they have answered so
far. This protects both the integrity of the timing data and fairness
across candidates.

---

## 3. Scoring

### Per-Question Scoring

Each response is scored on a **0–1 scale per question**:

- **single_select**: earned = answer_score; max = highest possible answer_score.
- **forced_choice**: The most-picked answer's score and the least-picked answer's score are normalised to 0–1 and combined 70/30. A candidate who picks the best answer as "most" and the worst answer as "least" scores 1.0. A candidate who inverts both scores 0.0. A random responder averages 0.5.
- **baseline**: earned = 1 if the answer set matches exactly; max = 1.

### Section Scores

For each section, the platform sums the earned points and the maximum
available points across all questions in that section:
