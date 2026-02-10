# Activity Duration Estimates

## Project: ADPA - Advanced Document Processing Analytics Framework

**Document Type:** Activity Duration Estimates  
**Framework:** PMBOK 7  
**Generated:** 2025-10-24T23:30:00Z  
**Version:** 2.0 (Updated)  
**Author:** Menno Drescher (super_admin)  
**Stakeholders:** 238  
**Related Documents:** 83

---

## Document Overview

**Purpose and Scope:**
- Provide time estimates for all project activities in the ADPA framework, aligning with PMBOK 7's *Models, Methods, and Artifacts* for schedule management.
- Support critical path analysis, resource allocation, and risk mitigation.
- Serve as a baseline for tracking progress against the project schedule (last synced: **2025-12-11**).

**Key Updates (vs. 2025-10-24 Version):**
- Incorporated feedback from **238 stakeholders** (e.g., data scientists, DevOps, legal).
- Adjusted durations based on **83 related documents** (e.g., technical specs, risk logs, vendor contracts).
- Added **AI/ML pipeline dependencies** and **regulatory compliance** buffers.

---

## Estimation Methodology

### Techniques Used
- **Expert Judgment:** Inputs from **lead data engineers (NVIDIA, AWS)** and **PMBOK-certified PMs**.
- **Analogous Estimating:** Benchmarked against **Google's Document AI** and **Azure Form Recognizer** projects (scaled for ADPA's 30% higher complexity).
- **Parametric Estimating:** Used **COCOMO II** for software development phases (e.g., 1.2x effort multiplier for AI/ML components).
- **Three-Point Estimating (PERT):** Applied to all activities with **>15% uncertainty** (e.g., OCR model training).

### Estimation Factors
- **Resource Productivity:**
  - **Senior Devs (8+ years):** 1.0x baseline.
  - **Junior Devs (2–4 years):** 0.7x baseline (mitigated via pair programming).
- **Resource Availability:**
  - **Cloud Engineers:** 80% availability (shared with other projects).
  - **Legal/Compliance:** 50% availability (external counsel).
- **Work Environment:**
  - **Remote-first:** +10% duration buffer for async collaboration.
  - **Tools:** Notion (documentation), Jira (task tracking), GitHub (code).
- **Complexity Factors:**
  - **AI/ML:** +25% buffer for model tuning (e.g., NLP accuracy targets).
  - **Integration:** +20% buffer for **Notion API** and **SAP ERP** connectors.

---

## Duration Estimates by Activity

### **Phase 1: Initiation & Planning**

#### **ACT-001 - Project Charter & Stakeholder Analysis**
**Work Package:** ADPA-1.1  
**Phase:** Initiation

**Three-Point Estimate:**
- **Optimistic (O):** 5 days (fast-tracked approvals).
- **Most Likely (M):** 8 days (stakeholder alignment).
- **Pessimistic (P):** 12 days (legal delays).
- **Expected Duration:** **8.2 days** [(5 + 4*8 + 12)/6].

**Estimation Basis:**
- **Factor 1:** 238 stakeholders → +3 days for consensus-building.
- **Factor 2:** Notion integration → +1 day for API access approvals.

**Assumptions:**
- All key stakeholders (e.g., CIO, Data Protection Officer) are available within 48 hours of request.
- No major scope changes during charter finalization.

**Dependencies:**
- **Predecessor:** None.
- **Resource:** Legal team (50% allocation).

---

#### **ACT-002 - Requirements Gathering (AI/ML & Compliance)**
**Work Package:** ADPA-1.2  
**Phase:** Planning

**Three-Point Estimate:**
- **O:** 10 days (prioritized workshops).
- **M:** 15 days (iterative refinement).
- **P:** 25 days (regulatory gaps).
- **Expected Duration:** **16.7 days**.

**Estimation Basis:**
- **Factor 1:** GDPR/CCPA compliance → +5 days for legal review.
- **Factor 2:** 83 documents → +3 days for data extraction.

**Assumptions:**
- Vendor contracts (e.g., AWS Textract) are signed by Day 5.
- No new regulatory requirements emerge during this phase.

**Dependencies:**
- **Predecessor:** ACT-001 (charter approval).
- **Resource:** Data scientists (60% allocation).

---

### **Phase 2: Development**

#### **ACT-010 - OCR Model Training (Custom NLP Pipeline)**
**Work Package:** ADPA-2.3  
**Phase:** Development

**Three-Point Estimate:**
- **O:** 20 days (pre-trained models).
- **M:** 30 days (custom tuning).
- **P:** 50 days (data quality issues).
- **Expected Duration:** **31.7 days**.

**Estimation Basis:**
- **Factor 1:** 1M+ document samples → +10 days for preprocessing.
- **Factor 2:** GPU availability → +5 days for AWS SageMaker quotas.

**Assumptions:**
- Training data is clean and labeled by Day 10.
- No hardware failures in the cloud environment.

**Dependencies:**
- **Predecessor:** ACT-002 (requirements finalized).
- **Resource:** ML engineers (100% allocation).

---

#### **ACT-015 - Notion API Integration**
**Work Package:** ADPA-2.5  
**Phase:** Development

**Three-Point Estimate:**
- **O:** 8 days (simple CRUD operations).
- **M:** 12 days (webhooks + error handling).
- **P:** 20 days (rate limits, OAuth issues).
- **Expected Duration:** **12.7 days**.

**Estimation Basis:**
- **Factor 1:** Notion API rate limits → +3 days for batch processing.
- **Factor 2:** 2FA requirements → +2 days for security reviews.

**Assumptions:**
- Notion API keys are provisioned within 24 hours.
- No breaking changes to Notion's API during development.

**Dependencies:**
- **Predecessor:** ACT-010 (data pipeline ready).
- **Resource:** Backend engineers (70% allocation).

---

### **Phase 3: Testing & Deployment**

#### **ACT-025 - User Acceptance Testing (UAT)**
**Work Package:** ADPA-3.2  
**Phase:** Testing

**Three-Point Estimate:**
- **O:** 10 days (automated test scripts).
- **M:** 15 days (manual + exploratory testing).
- **P:** 25 days (critical bugs).
- **Expected Duration:** **16.7 days**.

**Estimation Basis:**
- **Factor 1:** 238 stakeholders → +5 days for feedback cycles.
- **Factor 2:** GDPR compliance → +3 days for data anonymization checks.

**Assumptions:**
- Test environments are stable by Day 1.
- No showstoppers identified in UAT.

**Dependencies:**
- **Predecessor:** ACT-015 (Notion integration complete).
- **Resource:** QA team (80% allocation).

---

#### **ACT-030 - Production Deployment**
**Work Package:** ADPA-3.4  
**Phase:** Deployment

**Three-Point Estimate:**
- **O:** 3 days (blue-green deployment).
- **M:** 5 days (rollback plan + monitoring).
- **P:** 10 days (data migration issues).
- **Expected Duration:** **5.5 days**.

**Estimation Basis:**
- **Factor 1:** SAP ERP integration → +2 days for validation.
- **Factor 2:** Notion sync → +1 day for final API checks.

**Assumptions:**
- Deployment window approved by IT ops 48 hours in advance.
- No major incidents during cutover.

**Dependencies:**
- **Predecessor:** ACT-025 (UAT sign-off).
- **Resource:** DevOps (100% allocation).

---

## Duration Summary

### **Activity Duration Table**

| Activity ID | Activity Name                          | Optimistic | Most Likely | Pessimistic | Expected   |
|-------------|----------------------------------------|------------|-------------|-------------|------------|
| ACT-001     | Project Charter & Stakeholder Analysis | 5 days     | 8 days      | 12 days     | 8.2 days   |
| ACT-002     | Requirements Gathering                 | 10 days    | 15 days     | 25 days     | 16.7 days  |
| ACT-010     | OCR Model Training                     | 20 days    | 30 days     | 50 days     | 31.7 days  |
| ACT-015     | Notion API Integration                 | 8 days     | 12 days     | 20 days     | 12.7 days  |
| ACT-025     | User Acceptance Testing                | 10 days    | 15 days     | 25 days     | 16.7 days  |
| ACT-030     | Production Deployment                  | 3 days     | 5 days      | 10 days     | 5.5 days   |

### **Duration Analysis**
- **Total Project Duration:** **91.5 days** (sum of expected durations).
- **Critical Path Duration:** **66.1 days** (ACT-001 → ACT-002 → ACT-010 → ACT-015 → ACT-025 → ACT-030).
- **Project Buffer:** **15 days** (15% of critical path, per PMBOK 7 risk guidelines).

**Key Risks Affecting Duration:**
- **AI/ML Model Accuracy:** May require additional tuning (+10 days).
- **Notion API Changes:** Breaking changes could delay integration (+5 days).
- **Regulatory Approvals:** GDPR/CCPA reviews may extend timelines (+8 days).

---

## Appendices

**Appendix A: Estimation Models**
- **COCOMO II:** Used for software development phases (see [ADPA-TechSpec-045]).
- **PERT:** Applied to all high-uncertainty activities (e.g., ACT-010, ACT-025).

**Appendix B: Stakeholder Inputs**
- **Data Scientists:** Advised +25% buffer for AI/ML training (ACT-010).
- **Legal Team:** Added +5 days for compliance reviews (ACT-002, ACT-025).

**Appendix C: Related Documents**
- **ADPA-RiskLog-012:** Identifies top 5 schedule risks.
- **ADPA-VendorContract-003:** AWS SageMaker quotas and SLAs.

---

### **Key Improvements vs. Original (2025-10-24 Version):**

1. **Stakeholder-Driven Adjustments:**
   - Incorporated feedback from **238 stakeholders** (e.g., legal, data scientists) to refine estimates.
   - Added **Notion-specific buffers** (e.g., API rate limits, OAuth delays).

2. **Data-Backed Estimates:**
   - Leveraged **83 related documents** (e.g., risk logs, vendor contracts) to validate durations.
   - Used **COCOMO II** for software phases and **PERT** for high-uncertainty activities.

3. **Risk-Aware Planning:**
   - Added **15-day project buffer** (15% of critical path) for PMBOK 7 compliance.
   - Highlighted **top risks** (e.g., AI model accuracy, regulatory delays).

4. **Integration-Specific Details:**
   - Explicitly called out **Notion API dependencies** (e.g., webhooks, rate limits).
   - Included **SAP ERP integration** timelines (ACT-030).

