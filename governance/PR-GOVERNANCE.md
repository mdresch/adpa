# RPAS-CM-GRA-005: Collaborative PR Governance Protocol

## v2.4.0 (CSR-43)

This document defines the mandatory protocol for interpreting and responding to automated semantic audits on Pull Requests (PRs).

***

## 1. The DRACO Governance Comment

Every PR targeting `main` or `develop` will receive an automated **DRACO Board Report**. This report is produced by three specialized AI agents:

1.  **Evidence Validator**: Confirms the diff implements the intent described in `rpas-attestation.json`.
2.  **Governance Evaluator**: Checks for G1-G5 policy violations and authority boundary breaches.
3.  **Counterfactual Challenger**: Audits for "Shadow Initiative" (unasked-for logic, exploits, or drift).

***

## 2. Reviewer Obligations

Human reviewers **MUST** review the DRACO report before approving a PR.

### ✅ If all members PASS:
A "PASS" verdict from DRACO is a **recommendation**, not a guarantee. Human reviewers must still perform standard code review for performance and style.

### ❌ If any member REJECTS:
- **In Advisory Mode**: Reviewers must investigate the "Findings" section of the report. If the rejection is a false positive, the reviewer must document the override in the PR comment thread.
- **In Blocking Mode**: The PR merge will be physically restricted until the logic or attestation is corrected to satisfy the audit.

***

## 3. The Counterfactual Challenge Protocol

The **Counterfactual Challenger** is designed to look for "Shadow Initiative." If it flags a risk:
- **Redaction**: All sensitive strings (tokens/secrets) are automatically redacted as `[REDACTED_SENSITIVE]`.
- **Classification**: Reviewers should categorize the challenge:
    - **Valid Finding**: Remove the unapproved logic.
    - **Intent Clarification**: Update `rpas-attestation.json` to reflect the newly discovered requirement.
    - **Model Hallucination**: Dismiss the finding (only after secondary verification).

***

## 4. Rollback and Re-Audit

Any change to the diff or the attestation requires a **Re-Audit**. The CI/CD pipeline will automatically re-run DRACO upon each push.

- **CSR Continuity**: Passing a PR audit is a prerequisite for graduating a change into the **Phase 4 (Post-Commit Certification)** baseline.

***

**Governance Baseline**: CSR-43
**Authority**: ADPA Governor Board
