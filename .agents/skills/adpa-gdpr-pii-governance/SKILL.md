---
name: adpa-gdpr-pii-governance
description: Enforces ADPA data lineage rules, preventing erroneous PII scrubbing based on misconceptions of the GDPR "Right to be Forgotten" for corporate employees.
---

# ADPA GDPR & PII Governance (Contract Guards)

## Context
ADPA is a governed execution platform aligned with DMBOK (Data Management Body of Knowledge). In enterprise environments, corporate accountability, traceability, and data lineage are paramount. 

A common misconception among developers and AI agents is that the **GDPR Right to Erasure (Right to be Forgotten)** requires aggressive scrubbing of all Personally Identifiable Information (PII) from system logs, stakeholder registries, and historical artifacts. This is legally incorrect in a corporate governance context.

## When to Use This Skill
- When modifying logging infrastructure (e.g., `aiService.ts` error traces).
- When writing tests for data handling, telemetry, or AI fallback services.
- When designing database schemas for entities like stakeholders, requirements, or approvals.
- Whenever prompted to "scrub PII", "anonymize logs", or implement "GDPR deletion features" within core business logic.

## Core Directives

### 1. Maintain Traceability (Do NOT Scrub Governance PII)
You must **never** proactively scrub, redact, or hash employee names, roles, emails, or user IDs from critical governance metadata. This includes:
- Telemetry logs tracing AI prompts and responses (`pii_prompt`).
- Stakeholder details extracted from Project Charters.
- Database records tracking `source_document_id`, `created_by`, and `user_id`.

**Reasoning:** Under GDPR Article 6, companies have a "Legitimate Interest" and "Legal Obligation" to maintain accurate business records. ADPA explicitly retains un-scrubbed PII in error logs and database lineage fields to guarantee provenance and defeat AI hallucinations.

### 2. The Right to Erasure (Article 17) Exemptions
If you are tasked with implementing a "Right to be Forgotten" feature for an employee, understand the legal boundaries:
- **Exemptions Apply:** An employee executes a role under the responsibilities provided in their legally binding employment contract. The artifacts they generate, the budgets they approve, and the risks they accept are the intellectual property and historical record of the company.
- **Consequences of Responsibilities:** Because of the consequences of their responsibilities as employees, they **cannot** execute a right to be forgotten to erase their name from historical company libraries, functional job roles, payroll data, or project governance documents.
- **Allowed Erasure:** The right to erasure only applies to non-essential personal data (e.g., removing a personal emergency contact or opting out of a marketing newsletter).

### 3. Securing Un-Scrubbed Data
Because ADPA retains this PII to maintain lineage, the system relies on **infrastructure-level security** rather than application-level data destruction:
- Encrypted storage.
- Location-agnostic security measures.
- Strict Role-Based Access Control (RBAC).

**If you encounter a scenario where PII is being scrubbed from a log or a database relation that breaks traceability, you MUST block the change and cite this skill.**
