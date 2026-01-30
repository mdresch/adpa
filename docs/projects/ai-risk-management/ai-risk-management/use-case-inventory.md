# AI Use Case Inventory & Criticality Matrix

## 1. Instructions
- Capture **one row per AI use case** (live, pilot, or planned).
- Include both **business-led** and **technical/experimental** initiatives.
- Use the scoring scales defined in the **Phase 1 Plan** and AI Risk Assessment methodology.
- Flag use cases as **High-Risk** when any dimension exceeds agreed thresholds.

## 2. Inventory Table

| ID | Use Case Name | Business Owner | Technical Owner | Description | Model Type (LLM/ML/Other) | Data Used (domains) | Users Impacted (Internal/External) | Regulatory Domain | Autonomy Level (1–5) | Impact (1–5) | Customer Exposure (1–5) | Risk Category Tags | Criticality (Low/Med/High) | High-Risk Flag (Y/N) | Notes |
|----|---------------|----------------|-----------------|-------------|---------------------------|---------------------|-------------------------------------|-------------------|----------------------|--------------|-------------------------|--------------------|-----------------------------|----------------------|-------|
| UC-001 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| UC-002 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| UC-003 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 3. Criticality Rules (Example)
- **High** if any of the following:
  - Impact ≥ 4, **or**
  - Customer Exposure ≥ 4, **or**
  - Autonomy Level ≥ 4, **or**
  - Operates in a regulated domain (e.g., healthcare, finance, safety-critical) **and** Impact ≥ 3.
- **Medium**:
  - Not High, and at least one of (Impact, Customer Exposure, Autonomy) ≥ 3.
- **Low**:
  - All key dimensions ≤ 2 and not in a regulated domain.

> These thresholds can be refined by the AI Risk Steering Committee to align with the organization’s broader risk appetite.

