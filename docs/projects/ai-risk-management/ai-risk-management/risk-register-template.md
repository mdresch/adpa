# AI Risk Register – Template

## 1. Risk Scoring Scales
- **Likelihood (L)**: 1–5 (Very Low, Low, Medium, High, Very High).
- **Impact (I)**: 1–5 (Very Low, Low, Medium, High, Very High).
- **Inherent Risk Score** = L × I (range 1–25).
- **Residual Risk Rating** after controls: Low / Moderate / High / Critical.

Reference detailed descriptions in the Phase 1 AI Risk Assessment methodology.

## 2. Risk Register Table

| Risk ID | Use Case ID | Risk Category | Risk Description | Cause | Potential Impact | Likelihood (1–5) | Impact (1–5) | Inherent Score (L×I) | Existing Controls | Control Effectiveness (Strong/Adequate/Weak/None) | Residual Risk (Low/Mod/High/Critical) | Risk Owner | Treatment (Accept/Mitigate/Transfer/Avoid) | Action Plan & Target Date | Status (Open/In Progress/Closed) |
|---------|-------------|---------------|------------------|-------|------------------|------------------|--------------|----------------------|-------------------|---------------------------------------------------|----------------------------------------|-----------|--------------------------------------------|---------------------------|-----------------------------------|
| R-001 | UC-001 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| R-002 | UC-001 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| R-003 | UC-002 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 3. Example Risk Entry (Illustrative)

| Risk ID | Use Case ID | Risk Category | Risk Description | Cause | Potential Impact | Likelihood | Impact | Inherent Score | Existing Controls | Control Effectiveness | Residual Risk | Risk Owner | Treatment | Action Plan & Target Date | Status |
|--------|-------------|---------------|------------------|-------|------------------|-----------|--------|----------------|-------------------|-----------------------|--------------|-----------|-----------|---------------------------|--------|
| R-EX1 | UC-001 | Data Privacy | Customer PII exposure via prompts to public LLM | Users may paste PII into prompts; vendor logs inputs externally | Regulatory fines, customer complaints, reputational damage | 3 | 5 | 15 | Policy discouraging PII in prompts; vendor DPA signed | Weak | High | Data Protection Officer | Mitigate | Implement technical redaction proxy and UI warnings by 2026-03-31 | Open |

