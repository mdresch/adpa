# 📋 Prompt Management

## Overview

ADPA includes a centralized prompt registry to manage the versions, environment (dev/staging/prod), and deployment of all prompts used in LLM pipelines.

## Features

- **Versioning**: Track changes to prompts over time (e.g., `prompt_v1`, `prompt_v2`).
- **Environment Separation**: Use different prompts for testing vs. production.
- **A/B Testing**: Compare performance of two prompt variants.

## 🔧 Developer Guide

Prompts are stored in `repo/prompts/` as YAML or Markdown files, e.g.:

```yaml
# prompts/extract_invoice_v2.yaml
name: extract_invoice
version: "2.0"
system_prompt: >
  You are an expert data extraction assistant. Analyze the provided invoice and extract:
  - Invoice number
  - Date
  - Total amount
  - Line items (description, quantity, price)
model: gpt-4-1106-preview
temperature: 0.1

Prompts are loaded at runtime and versioned in the metadata of every LLM trace (via Langfuse).

🔗 Back: AI Engine Overview [blocked]


---

### 📄 `docs/features/compliance/README.md`

```markdown
# ⚖️ Compliance & Data Governance

Ensure your ADPA deployments meet global regulatory standards.

## Key Features

- **Data Governance**: Full data lineage and provenance.
- **GDPR/CCPA Tools**: Automated PII redaction and DSAR (Data Subject Access Request) support.

## 📄 Documentation

- **[Data Governance](data-governance.md)**: Understand data lineage, schemas, and ownership.
- **[GDPR/CCPA Compliance](gdpr-ccpa.md)**: Learn how ADPA helps with consent, deletion, and access requests.

---

🔗 **Next**: [Integrations](../integrations/README.md)