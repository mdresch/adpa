# Risk → Issue Escalation Playbook

Purpose
- Define when and how items in the Risk Register are escalated to the Issue Register, how they are rephrased, gated, and assigned an actionable playbook so they are resolved and prevented from recurring.

Key definitions
- Risk: A potential adverse event with likelihood and impact and an associated mitigation.
- Issue: A realized problem that requires immediate, structured remediation and owner accountability.
- Playbook: A set of actions, roles and communications for resolving an Issue and preventing recurrence.

COSO Framework Integration
- Each Risk and Issue should be tagged with the relevant COSO component and assertion(s) to ensure alignment with enterprise internal control objectives.

COSO Components (pick one per risk)
- Control Environment: Tone at the top, integrity, ethics, organizational structure.
- Risk Assessment: Identification and analysis of risks to achieving objectives.
- Control Activities: Policies and procedures ensuring management directives are carried out.
- Information & Communication: Systems supporting identification, capture, and exchange of information.
- Monitoring Activities: Ongoing evaluations, separate evaluations, or combination.

COSO Assertions (select all that apply)
- Existence / Occurrence: Assets, liabilities, and transactions exist and have occurred.
- Completeness: All transactions and accounts are recorded; nothing omitted.
- Rights & Obligations: Entity holds rights to assets; liabilities are obligations of the entity.
- Valuation / Allocation: Assets, liabilities, revenues, and expenses are recorded at appropriate amounts.
- Presentation & Disclosure: Items are properly classified, described, and disclosed.

Mapping guidance
- When a Risk is identified, determine which COSO component is most relevant and which assertion(s) the control is designed to address.
- When a Risk escalates to an Issue, carry forward the COSO tags and note the specific control gap (e.g., "Control Activity for Completeness assertion failed due to missing reconciliation step").
- Use COSO tags in dashboards/filters to aggregate risks by component and identify systemic weaknesses.

Escalation criteria (examples)
- Risk has triggered its escalation trigger (e.g., mitigation failed, incident observed).
- Risk score (likelihood × impact) exceeds the escalation threshold.
- Residual risk remains high after mitigation or is increasing over time.
- Repeated occurrences, customer impact, regulatory exposure, or executive request.

Rephrasing phase (how to convert a Risk into an Issue)
1. Capture the triggering event and reference the originating Risk ID.
2. Rephrase description to state the concrete problem (what happened, where, and the immediate impact).
3. Record affected services, customers, timelines, and evidence.
4. Assign an Issue owner and initial severity.
5. Attach current mitigation(s) and why they failed or became insufficient.
6. Carry forward COSO Component, Assertion(s), and note the control gap.

Gates (minimum required checkpoints)
- Gate 0 — Detection: Evidence documented; Risk owner flags for escalation.
- Gate 1 — Intake & Rephrase Review: Triage team validates the rephrased Issue statement and assigns owner and severity.
- Gate 2 — Playbook Assignment & Plan: Assign existing playbook or draft a bespoke playbook; define milestones and communications.
- Gate 3 — Execution & Stabilization: Actions taken, status updates, and interim verification that impact is contained.
- Gate 4 — Resolution & Prevention: Issue resolved, preventative controls implemented, and closure review / lessons learned.

Playbook requirements
- Title and summary: One-line description of the problem and outcome objective.
- Root-cause hypothesis: Initial technical/organizational cause(s).
- Immediate remediation steps: Actions to stabilize or contain the problem.
- Longer-term corrective actions: Tasks to fully resolve and strengthen controls.
- Preventative measures: Steps to prevent recurrence and who will maintain them.
- Roles & responsibilities: Issue owner, responders, approvers, and communications lead.
- Acceptance criteria: Measurable conditions to consider the issue resolved.
- Timeline & milestones: Due dates for containment, remediation, verification.
- Stakeholder communications: Who to notify and when (customers, execs, legal).

Cost guidance
- For each Risk and Issue, capture high-level cost assessments using the bands `Low`, `Medium`, `High`:
  - `Cost to Mitigate`: estimate to implement and operate the mitigation while the item remains a Risk.
  - `Estimated Cost if Realised`: high-level estimate of the potential impact if the Risk becomes an Issue.
- For Issues capture an additional `Playbook Remediation Cost` (estimate to execute the playbook and remedial work). When practical, break the playbook into steps and annotate each step with a cost band (Low/Medium/High).
- Use cost bands to inform prioritization and the decision to invest in prevention versus acceptance. Record any quantitative estimates or simple notes to justify the band.

Maintaining mitigations
- Keep original risk mitigation records; link them to the resulting Issue so historical context is preserved.
- If mitigation remains valid, translate it into an ongoing maintenance task on the Issue to ensure it is kept effective.

Escalation checklist (quick)
- [ ] Risk ID referenced
- [ ] COSO Component and Assertion(s) tagged
- [ ] Control gap identified
- [ ] Clear rephrased Issue statement
- [ ] Severity & owner assigned
- [ ] Playbook assigned or drafted
- [ ] Immediate containment actions listed
- [ ] Long-term corrective actions defined
- [ ] Acceptance criteria defined
- [ ] Communications plan documented

Roles & responsibilities
- Risk Owner: monitors risk and requests escalation when triggers occur.
- Triage/PMO: reviews escalation, performs Gate 1 rephrase review, assigns owner.
- Issue Owner: leads remediation, maintains playbook, reports status.
- QA/Operations: validates containment and verifies remediation.
- Lessons Learned Lead: runs closure review and updates risk register/playbooks.

Templates and automation
- Use consistent templates for rephrasing and playbook creation (see `templates/`).
- Where possible, link Risk and Issue records in the tracking tool and automate assignment of the playbook label.

Filtering & dashboarding
- Standardize `Impact` values to `Low`, `Medium`, or `High` for consistent filtering.
- Add a short filter tag in the Risk/Issue record (`impact:Low`, `impact:Medium`, `impact:High`) to support text-search dashboards and simple grep-style queries.
- Filter by COSO Component (`coso:ControlActivities`, `coso:RiskAssessment`, etc.) to identify control framework gaps.
- Recommended dashboard filters: `impact`, `effort`, `costToMitigate`, `estimatedCostIfRealised`, `gridOutcome`, `cosoComponent`, `cosoAssertion`.

Closure and feedback
- When the Issue is closed, run a short retrospective: was the original risk mitigation adequate? Update the Risk Register entry or archive it and add preventive controls to the configuration baseline.
- Review COSO mapping: did the control gap indicate a broader framework weakness? Update control documentation if needed.

Related artifacts
- templates/risk_template.md
- templates/issue_template.md
- docs/effort-cost-grid.md
