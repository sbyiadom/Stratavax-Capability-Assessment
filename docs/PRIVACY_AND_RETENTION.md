# Stratavax Capability Assessment Platform
## Privacy and Data Retention Policy

**Document Version:** 1.0
**Effective Date:** October 8, 2026
**Owner:** Stratavax Assessment Team
**Review Cycle:** Annually, or after any material change to data handling

---

## 1. Purpose

This document describes how the Stratavax Capability Assessment Platform
collects, uses, retains, and deletes personal data. It is intended for:

- **Internal reviewers** approving data handling practices
- **Candidates** who want to understand their rights
- **Supervisors and administrators** who process candidate data
- **Auditors** verifying compliance with applicable data protection law

It accompanies the Assessment Methodology & Interpretation Guide, which
describes how the platform scores assessments. This document describes
what the platform does with the resulting data.

---

## 2. Legal Framework

The platform is designed to comply with the **Ghana Data Protection Act,
2012 (Act 843)**. This framework shares the core principles of the EU
GDPR and similar laws, so the design is compatible with broader
requirements should they ever apply.

Core principles observed:

1. **Lawful basis** — we process personal data only with the candidate's
   consent (given at registration) or where necessary for the
   assessment's legitimate purpose.
2. **Purpose limitation** — data collected for assessment purposes is
   used only for assessment purposes.
3. **Data minimisation** — we collect only what is necessary to conduct
   and interpret an assessment.
4. **Accuracy** — candidates can request corrections to their data.
5. **Storage limitation** — data is retained only as long as necessary
   (Section 5).
6. **Integrity and confidentiality** — data is protected by
   authentication, authorisation, and audit trails.
7. **Accountability** — this document, the audit trail, and the
   privacy request log demonstrate compliance.

---

## 3. What Data We Collect

The platform collects the following categories of personal data:

### 3.1 Identity and Contact Data
- Full name
- Email address
- Phone number (Ghanaian mobile, normalised to E.164)
- University
- Programme of study
- Degree level
- Graduation year
- Preferred department (optional)

### 3.2 Assessment Data
- Which assessments the candidate was assigned
- Which assessments they completed
- When they started and completed each session
- Their answers to each question
- Their scores, section-by-section and overall
- Their competency scores
- Narrative interpretations generated for them

### 3.3 Behavioral Data
- Time spent on each question
- Number of answer changes
- Tab switches
- Copy/paste attempts
- Right-click attempts
- External URLs visited (if detectable)
- Violation counts

### 3.4 System Data
- IP addresses recorded during assessment
- User agent strings
- Session identifiers
- Authentication timestamps

### 3.5 Audit Data
- Which supervisors or administrators accessed which candidate records
- When they did so
- What changes they made

---

## 4. How Data Is Used

Data is used for:

- **Administering the assessment** — presenting questions, saving responses, calculating scores
- **Producing reports** — generating the candidate report, competency analysis, and behavioral matrix
- **Supervisor review** — enabling supervisors to interpret results for their assigned candidates
- **Platform analytics** — aggregate statistics (e.g. average scores per programme) that do not identify individual candidates
- **Compliance** — retaining an audit trail of who accessed what
- **Communication** — sending invitations, reminders, and completion notifications

Data is **not** used for:

- Sale to third parties
- Advertising or profiling for non-assessment purposes
- Automated decision-making without human review
- Any purpose unrelated to the assessment

---

## 5. Retention Periods

Different categories of data are retained for different periods:

| Data Category | Retention | Rationale |
|---|---|---|
| **Candidate profile** (name, email, phone, education) | 24 months from last activity | Covers the hiring cycle and a follow-up window |
| **Assessment results** (scores, classifications) | 24 months | Needed for onboarding and reference |
| **Competency scores** | 24 months | Tied to the result |
| **Responses** (item-level answers) | 12 months | Used for active review; rarely needed longer |
| **Assessment sessions** (timing metadata) | 12 months | Only needed while a result is being reviewed |
| **Frozen question sets** (session_questions) | 12 months | Only needed for reproducibility of active results |
| **Audit logs** | 36 months | Legal defensibility floor |
| **Privacy request records** | 60 months | Proof of compliance |

At the end of each retention period, the platform automatically applies
the deletion strategy described in Section 6.

**"Last activity"** is defined as the most recent of:
- The candidate's last login
- The candidate's last assessment submission
- Any modification to the candidate's profile by an administrator

If a candidate is inactive for 24 months, retention begins.

---

## 6. Deletion Strategy

When retention expires, different tables receive different treatments.
This is a deliberate choice: some data can be anonymised without losing
its analytical value, while others should be removed entirely.

### 6.1 Anonymisation

The following tables are **anonymised** rather than deleted. The rows
remain in the database — preserving referential integrity — but all
identifying fields are replaced with placeholder values:

| Table | Fields Anonymised | Fields Retained |
|---|---|---|
| `candidate_profiles` | `full_name`, `email`, `phone`, `university`, `programme`, `degree_level_id`, `graduation_year`, `preferred_department` | `id` (kept as a foreign key reference), `created_at`, `updated_at` |
| `assessment_results` | `user_id` (replaced with a sentinel), `answered_questions`, `report_data` (identifying subfields), `proctoring_data` | `assessment_id`, `total_score`, `max_score`, `percentage_score`, `classification`, `completed_at`, `total_seconds` |
| `candidate_competency_scores` | `candidate_id` (replaced with sentinel) | `competency_id`, `raw_score`, `max_possible`, `percentage`, `classification` |

The sentinel user for anonymised candidates is a placeholder record
created once during platform setup. All anonymised candidates point to
it via their `user_id`, so reports that reference the original ID no
longer resolve to a real person.

The **scores and classifications are retained**, because:
1. They contain no personal identifying information once anonymised
2. They contribute to norms data (average scores per assessment type)
3. They support continued aggregate reporting

### 6.2 Hard Deletion

The following tables are **hard deleted** entirely:

| Table | Rationale |
|---|---|
| `responses` | Item-level data; not useful after 12 months |
| `assessment_sessions` | Timing metadata; not needed after result is stable |
| `session_questions` | Only needed for active reproducibility |
| `audit_logs` (after 36 months) | No reason to retain beyond the legal floor |

### 6.3 Deletion Notification

When a candidate's data is anonymised or deleted — whether by retention
or by their own request — the platform sends them a confirmation email
at their last known address. The email states:

- What was processed (deleted vs. anonymised)
- The effective date
- What was retained and why (if applicable)
- How to contact the platform with questions

If the email address is no longer valid or the deletion was
self-initiated, the notification is logged in the audit trail instead.

---

## 7. Candidate Rights

Under the Ghana DPA, candidates have the following rights. The platform
provides workflows to fulfil each:

### 7.1 Right of Access

A candidate can request a full export of the data held about them. The
export is delivered in two formats:

- **PDF** — a human-readable summary of profile, results, and reports
- **JSON** — a complete, machine-readable dump of all rows

The export is generated within 7 days of the request.

### 7.2 Right to Correction

A candidate can request that inaccurate data be corrected — for example,
a misspelled name, an incorrect university, or an outdated phone number.

Corrections to **identity data** (name, contact) can be applied directly.
Corrections to **assessment data** (scores, responses) can only be made
where the original data is demonstrably wrong — for example, if a session
was completed by the wrong user due to a system error. In those cases,
the original data is preserved in the audit log alongside the correction.

### 7.3 Right to Deletion

A candidate can request that their personal data be deleted. The platform
processes these requests by:

1. Anonymising their profile (per Section 6.1)
2. Deleting their responses and session metadata (per Section 6.2)
3. Retaining their scores in anonymised form for aggregate analytics

Retention of anonymised scores is disclosed to the candidate at the time
of the request. If the candidate objects to this retention, they can
request full deletion, which the platform will comply with unless a
legal obligation requires retention (e.g. an active dispute).

### 7.4 Right to Withdraw Consent

A candidate can withdraw consent to further processing at any time. This
does not affect data already processed but prevents future processing.
Withdrawal is logged and future assessments are blocked unless consent
is renewed.

---

## 8. How to Exercise Your Rights

**As a candidate:**

Visit the platform's privacy page and submit a request. You will be
asked to verify your identity before any action is taken. Requests are
processed within 30 days, and usually within 7.

**As an administrator processing requests:**

1. Log into the admin dashboard
2. Navigate to **Privacy Requests**
3. Review each pending request, verify the candidate's identity
4. Approve or reject with a documented reason
5. The platform executes the approved action and logs it

For rejected requests, the admin must provide a reason, which is shown
to the candidate.

---

## 9. Data Security

Personal data is protected by:

- **Authentication** — every user authenticates with Supabase Auth
- **Authorisation** — role-based access control limits what each user can see
- **Row Level Security** — Supabase RLS policies enforce data scoping at the database layer
- **Audit trails** — every read and write of candidate data is logged
- **Encryption at rest** — Supabase encrypts data at rest
- **Encryption in transit** — all traffic uses HTTPS
- **Secrets management** — service credentials are stored in Vercel environment variables and rotated per the Secrets Rotation Policy

---

## 10. Data Breach Response

If a data breach is discovered:

1. **Contain** — revoke affected credentials immediately
2. **Assess** — determine what data was exposed, how many candidates are affected, and whether the exposure is ongoing
3. **Notify** — if the breach poses a risk to data subjects, notify affected candidates and the Data Protection Commission within 72 hours of discovery, as required by the Ghana DPA
4. **Document** — log the incident, the response, and the outcome
5. **Remediate** — implement controls to prevent recurrence

The breach response process is documented in detail in the
**Secrets Rotation Policy**, Section 5.

---

## 11. Third-Party Processors

The platform uses the following third-party services, each of which
processes personal data on our behalf:

| Processor | Purpose | Data Processed |
|---|---|---|
| **Supabase** | Database, authentication, storage | All platform data |
| **Vercel** | Application hosting, deployment | Runtime logs (may include IP addresses) |
| **Email provider** | Transactional email | Candidate email addresses and names |
| **GitHub** | Source code hosting | No personal data (code only) |

Each processor is bound by its own data protection terms. Where
practicable, we choose processors with data protection commitments
aligned to the Ghana DPA.

---

## 12. Children and Minors

The platform is not intended for candidates under 18. Registration
requires a declaration of age. If a minor's data is discovered, it will
be deleted immediately upon notification.

---

## 13. Changes to This Policy

This policy may be updated when:

- Legal requirements change
- New categories of data are collected
- New processors are engaged
- Retention periods are adjusted

Material changes are communicated to candidates at their next login and
to administrators via the platform's notification system.

The document is versioned in git alongside the platform's source code.

---

## 14. Contact

For privacy questions, requests, or complaints:

**Data Protection Contact:** Stratavax Assessment Team

Candidates who are not satisfied with the platform's response may
escalate to the **Data Protection Commission of Ghana**.

---

**Document prepared by:** Stratavax Assessment Team
**Reviewed by:** Stratavax Assessment Team
**Approved by:** Stratavax Assessment Team
**Date:** October 8, 2026
