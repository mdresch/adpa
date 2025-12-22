# Governance – Drift Detection & Resolution (User Guide)

Confluence version: cba-hr.atlassian.net/wiki/spaces/AD/pages/372146222

Status: Draft (v0.1)
Audience: Project Managers, Business Analysts, Governance Leads
Related Epics: WA-75 (Governance – Drift Detection & Resolution)

---

## Purpose
This guide explains how to maintain continuous alignment to approved baselines, detect drift early, resolve deviations (auto/manual), and escalate effectively.

## Key Concepts
- Baseline: An approved snapshot of scope/schedule/cost/quality used to detect deviations.
- Drift: Any material deviation from the latest approved baseline.
- Severity: Low/Medium/High based on impact and risk.
- Auto-resolution: System applies a safe, predefined correction for low-severity drift.
- Escalation: Routed to the right owner with MTTA target (<1h) and SLA per severity.

## Roles & Responsibilities
- Project Owner: Reviews drift, approves manual fixes, requests baseline updates.
- Governance Lead: Oversees escalations, ensures MTTA and closure SLAs.
- Approver(s): Approve change requests and baseline updates.

## Success Metrics (KPIs)
- 80% auto-resolution for low severity drift
- <1 hour MTTA for escalations
- 100% traceability from drift → resolution → baseline update

---

## End-to-End Workflow
1) Detect
- Where: Project → Baselines → Drift
- What you see: Drift list with severity, impact, detection time, suggested action
- Tip: Use filters for severity and age to triage quickly

2) Decide & Act
- Auto-resolve (when available): Applies recommended fix; creates audit record automatically
- Manual resolve: Opens guided resolution form; attach notes and link impacted artifacts
- Defer & escalate: Assigns to owner; sets MTTA clock; adds notifications

3) Escalate (if needed)
- Trigger: High severity, blockers, or missing owner response
- Flow: Routing per escalation matrix; notifications via email and in‑app; MTTA tracked

4) Approve & Update Baseline
- When: Post-resolution if the baseline must change
- Action: Submit/approve change request → System updates baseline on approval

5) Verify & Close
- Verify: Drift cleared; metrics updated; audit trail complete
- Close: Mark resolved; ensure links to CR/baseline version

---

## Step-by-Step

A. Review Drift
- Go to: Project → Baselines → Drift
- Sort by: Severity desc, then Age desc
- Click a row to open details: context, impacted metrics, suggested fix

B. Auto-Resolve
- If "Auto-resolve" is enabled: Click Auto-resolve → Confirm
- Result: System applies fix, creates audit entry, and updates drift status

C. Manual Resolve
- Click Resolve → Choose resolution type → Enter notes → Save
- Optional: Link related documents or tasks

D. Escalate
- Click Escalate → Select target (role/owner) → Add context → Send
- MTTA: Target < 1 hour; track in Notifications → Escalations

E. Update Baseline (after CR approval)
- Navigate: Project → Baselines → + Create Baseline (or Update on Approval)
- System will record baseline version and link to resolution record

---

## Troubleshooting
- I don't see any drift: Ensure a baseline exists; check detection schedule; verify permissions
- Auto-resolve disabled: Drift severity or type may require manual action; see policy
- MTTA breaches: Confirm escalation matrix ownership and notification delivery (email/in‑app)
- Baseline not updating: Check CR approval status and baseline update policy

---

## Tips & Best Practices
- Create/update baselines immediately after major approvals
- Address Low severity drift daily; escalate Medium/High within policy windows
- Keep notes concise but specific; include rationale for audit clarity
- Review weekly metrics on resolution rates and MTTA

---

## Where to Find Things
- Drift list: Project → Baselines → Drift
- Escalations: Notifications → Escalations tab
- Baselines: Project → Baselines
- Audit logs: Project → Activity / Audit

---

## Related Documentation
- Features: docs/06-features/DRIFT_AUTO_RESOLUTION_IMPLEMENTATION.md
- Features (legacy but useful): docs/06-features/legacy/DRIFT_DETECTION_TECHNICAL_GUIDE.md, DRIFT_DETECTION_USER_GUIDE.md, DRIFT_RESOLUTION_UI_GUIDE.md, BASELINE_DRIFT_DETECTION_TEST_PLAN.md
- Approvals & Baselines: docs/06-features/APPROVAL_WORKFLOW_GUIDE.md, BASELINE_APPROVAL_WORKFLOW.md, BASELINE_UPDATE_ON_CR_APPROVAL.md
- Personas & User Stories (Confluence): https://cba-hr.atlassian.net/wiki/spaces/AD/pages/372113409

---

## Definitions
- MTTA: Mean Time To Acknowledge escalation (target < 1h)
- SLA: Target to resolve by severity

---

## Version History
- v0.1 (Draft): Initial user workflow and links
