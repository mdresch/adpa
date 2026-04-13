# ADPA Governance Baseline (RPAS‑CM)

## Overview
This folder contains the foundational principles, rules, and workflows of the **Regulated Process Assurance System - Cloud Master (RPAS‑CM)** methodology. It is designed to be a portable, project-agnostic baseline that ensures AI agents operate with high integrity, security, and accountability.

## Purpose
The contents of this directory serve as the "Agent Envelope" and "Governance Rule Artifacts". By including this folder in any project, you provide AI agents with:
1.  **Identity & Standards**: Canonical naming conventions and versioning systems.
2.  **Safety Protocols**: Atomic Execution & Validation (AEV) workflows.
3.  **Audit Integrity**: Mandatory amendment logging and certification paths.
4.  **Operational Boundaries**: Explicit rules for data tiers and authoritative orchestration.

## How to use in other projects
To adopt these principles in a new repository:
1.  Copy the entire `governance/` folder to your project root.
2.  Ensure your `GEMINI.md` or equivalent agent instructions point to `governance/RPAS.md` and `governance/CONTRIBUTING.md` as foundational mandates.
3.  Implement the **AEV (Atomic Execution & Validation)** gate logic in your verification pipeline.

## Structure
-   `AMD-*.md`: Amendment records documenting state transitions, hardening, and optimizations.
-   `RPAS-*.md`: Core methodology definitions (Authority, Integrity, Logic).
-   `visuals/`: Graphical representations of governance flows and matrix logic.
-   `security/archive/`: Historical remediation records and reference artifacts.

## CI/CD & Operational Secrets (Mandatory)
The following secrets must be configured in your environment (e.g., GitHub Secrets) to support the DRACO Review Board and G5 validation:

| Secret Name | Purpose | Scope |
| :--- | :--- | :--- |
| `GOOGLE_AI_API_KEY` | Authority for Gemini Agents | Gate 5 (DRACO) |
| `DATABASE_URL` | Access to Governance Ledger | Audit & Persistence |
| `GITHUB_TOKEN` | Automated PR Reporting | Gate 6 (Workflow) |

---
**Certification**: Certified for cross-project deployment (April 2026).  
*Latest Baseline*: RPAS-CM v2.4.1 (Optimized DRACO Semantic Governance).
