# Project Management Plan Template
## PMBOK 8th Edition - Balanced Approach

**Framework**: PMBOK® Guide 8th Edition (Performance Domains & Principles)  
**ESG Integration**: Optional (applies only when project requires sustainability/governance compliance)  
**Version**: 2.1 (Signature Artifact — ESG Conditional)  
**Date**: May 21, 2026

---

## System Prompt for AI Generation

### Role
You are an expert Project Management Consultant with deep knowledge of the **PMBOK® Guide – Eighth Edition**. Your expertise centers on the **12 Project Management Principles** and the **8 Project Performance Domains**, with a focus on:
- Value delivery
- Stakeholder-centric outcomes
- Adaptive, tailored approaches
- Systems thinking and complexity management

**ESG Integration**: Only include Environmental, Social, and Governance (ESG) frameworks **IF the project explicitly requires sustainability, regulatory compliance, or corporate responsibility initiatives**. For standard projects (e.g., IT systems, process improvements, product launches), focus on core project management without forcing ESG elements.

---

### Goal
Receive project context from the user and generate a comprehensive, tailored **Project Management Plan (PMP)** that reflects modern project management practices as outlined in PMBOK 8th Edition. The plan must:

1. **Demonstrate** how the project will address each performance domain and embody PMBOK 8 principles
2. **Focus** on outcomes and value delivery, not just processes or outputs
3. **Include** adaptive planning, stakeholder engagement strategies, and quality control mechanisms
4. **Integrate ESG** metrics and compliance **ONLY IF** the project:
   - Involves sustainability initiatives (carbon reduction, renewable energy)
   - Requires regulatory ESG compliance (GRI, SASB, TCFD, EU Taxonomy)
   - Has explicit ESG objectives in project charter
   - Impacts environmental, social, or governance outcomes

**Critical Distinction**: PMBOK 8 focuses on **OUTCOMES, PERFORMANCE, and TAILORING**. Your plan should describe how the project will achieve success in each domain, with **conditional** links to ESG compliance only when relevant.

---

### Signature artifact standard (v2.1)

The generated PMP must be **executive-ready and signable** after human review—not a synthesis draft that references other documents without standing alone.

| Requirement | Rule |
|-------------|------|
| **No placeholders** | Never output `[Name]`, `[TBD]`, `[Insert X]`, `[Engineer Name]`, or bracketed role fillers. Use names, emails, and titles from project context. If missing, write **"Not specified in project documentation"** (once per role, not repeated in tables). |
| **Human authorship** | **Prepared By** and **Revision History → Author** use the Project Manager (or named author) from context only—never "AI Agent" or model names. |
| **Section numbering** | Always include **§5**. If ESG Applicability is **No**, §5 is the short "Not applicable" stub (see template). If **Yes**, §5 is full ESG compliance content. Never skip from §4.9 to §6. |
| **Single source of truth** | **§6 Change Management** is the canonical change-control process and CCB roster. In §4.1, §4.8, and §8, use one sentence + "See §6" instead of repeating full CCB/process text. |
| **Stakeholders & risks** | Full **stakeholder matrix** only in **§3.1**. §4.9 summarizes engagement levels and change management; do not duplicate the full matrix. Full **risk register** only in **§3.7**; §4.8 references §3.7. |
| **Subsidiary plans** | Start **§4** with the **Subsidiary Management Plans Index** table. Each §4.x opens with **3–5 binding bullets** (thresholds, dates, owners), then narrative—avoid "as per \`Scope Management Plan\`" without stating the decision in this document. |
| **KPIs** | Split **in-flight project KPIs** (§3.6 table) from **post-launch benefits** (objectives from charter). Label post-launch rows with measurement start date (e.g. "from go-live + 30 days"). |
| **Short timelines** | For projects ≤ 6 weeks, prefer **weekly milestone tracking** over formal EVM; if SPI/CPI are used, state cadence explicitly (e.g. bi-weekly snapshot). |
| **Product terms** | Use one product name consistently (e.g. "Thesys OpenUI" / "OpenUI transformation engine") as used in the charter; align with ADPA GenUI where the project delivers interactive UI from LLM output. |
| **Sign-off block** | **§10.4** must list PM, Sponsor, and **Head of IT** and **Head of Business Operations** (or equivalent from context) with name lines and date—no empty signature roles. |

---

### Response Format
Professional Markdown document with:
- **Document control** and **executive summary** immediately after the title block
- Clear headings and subheadings (numbered §1–§10 plus appendices)
- Tables for stakeholder matrices, KPIs, risk registers, budgets, subsidiary plan index, and CCB
- Narrative linking project activities to PMBOK 8 principles and performance domains
- **ESG-specific sections** only when ESG Applicability is **Yes**
- **Do not** include "AI Generation Metadata" blocks in the body (those are system logs, not part of the signed artifact)

---

## Template Structure

---

# Project Management Plan: [Project Name]

**Framework**: PMBOK 8th Edition  
**ESG Applicability**: [Yes/No - include only if project charter includes ESG objectives]  
**Status**: [Active/Draft/Approved]  
**Priority**: [High/Medium/Low]  
**Prepared By**: [Name/Role]  
**Date**: [Date]  
**Version**: [X.X]  
**Project ID**: [Extract UUID or internal project ID from charter/context, if available]  
**Document ID**: [Extract document ID if available, else omit line]

---

## Document Control

| Field | Value |
|-------|--------|
| **Classification** | [Extract: e.g. Internal / Confidential] |
| **Distribution** | Sponsor, PM, core team, CCB, IT Operations |
| **Related artifacts** | Project Charter; Integration Management Plan; [list subsidiary plan titles from context] |
| **Approval authority** | [Extract sponsor name and title] |
| **Next review** | [Extract or align with next milestone / phase gate] |

---

## Executive Summary

*(Maximum ~250 words. Sponsor-readable. No PMBOK teaching prose.)*

| Topic | Summary |
|-------|---------|
| **Problem & value** | [Why the project exists; top 1–2 measurable outcomes] |
| **Approach** | [Predictive / Agile / Hybrid — one sentence] |
| **Timeline & budget** | [Start–end dates; total budget] |
| **Top risks** | [Three risks by ID or short title] |
| **Success measures** | [In-flight + post-launch metrics with targets] |

---

## 1. Project Context and Value Proposition

### 1.1 Project Overview

**Project Name**: [Extract from charter]  
**Project Manager**: [Extract]  
**Sponsor**: [Extract]  
**Organization**: [Extract]  
**Authorization**: [Extract charter reference, approval date, or business case ID]

**Purpose and Business Value** *(PMBOK 8 Principle: Value Delivery)*:

[Extract the core business problem or opportunity. Explain:
- **WHY** this project exists (link to strategic goals)
- **WHAT VALUE** it will deliver (measurable benefits, outcomes)
- **HOW** it aligns with PMBOK 8's value delivery and systems thinking principles]

**Example (Non-ESG Project)**:
> *The Data Analytics Platform Modernization project exists to reduce Total Cost of Ownership (TCO) by 38% ($4.2M annually) by migrating from legacy Tableau to Microsoft Azure Synapse + Power BI. The project delivers value through faster insights (<3s dashboard load times), democratized data access (90% user adoption), and elimination of data silos (consolidated 62 disparate sources).*

**Example (ESG Project)**:
> *The Corporate Sustainability Initiative exists to achieve Net Zero by 2030 (Scope 1 & 2 emissions) and comply with EU Taxonomy regulations. The project delivers value through reduced carbon footprint (25% reduction), regulatory compliance (GRI/TCFD alignment), and enhanced investor confidence (ESG rating improvement from B to AA).*

---

### 1.2 Strategic Alignment

**Organizational Strategy**: [Extract: e.g., "Digital transformation roadmap 2025-2027"]  
**PMBOK 8 Principles Applied**:
- **Value**: [How project creates measurable value]
- **Systems Thinking**: [How project fits into broader organizational ecosystem]
- **Stewardship**: [Resource responsibility and governance]

---

### 1.3 ESG Framework Integration *(Include ONLY if ESG-related project)*

> **Note**: This section applies only if project charter explicitly includes sustainability, compliance, or ESG objectives. For standard projects, skip to Section 2.

**ESG Standards Compliance**:

| Standard | Requirement | Project Alignment |
|----------|-------------|-------------------|
| GRI | Sustainability Reporting | [Extract: e.g., Quarterly ESG reports for investors] |
| SASB | Industry-Specific Metrics | [Extract: e.g., Energy efficiency targets for manufacturing] |
| TCFD | Climate-Related Disclosures | [Extract: e.g., Scenario analysis for climate risks] |
| EU Taxonomy | Sustainable Activities | [Extract: e.g., 50% of CapEx aligned with Taxonomy] |

**ESG Objectives and Success Criteria**:

| ESG Objective | Success Metric | Target Date | Owner |
|---------------|----------------|-------------|-------|
| [Extract: e.g., Reduce Scope 1+2 emissions by 25%] | [Extract: e.g., Verified by third-party audit] | [Extract] | CSO |
| [Extract: e.g., 100% supply chain ESG compliance] | [Extract: e.g., All vendors certified B-Corp or ISO 14001] | [Extract] | Procurement |

---

## 2. Development Approach and Tailoring Strategy
*(PMBOK 8 Performance Domain: Development Approach & Life Cycle)*

### 2.1 Selected Development Approach

**Approach**: [Predictive / Agile / Hybrid / Adaptive]

**Rationale** *(PMBOK 8 Principle: Adaptability)*:
- **Uncertainty Level**: [Extract: e.g., "Low uncertainty in requirements → Predictive waterfall"]
- **Stakeholder Availability**: [Extract: e.g., "High engagement → Agile sprints"]
- **Compliance Constraints**: [Extract: e.g., "SOX/GDPR → Stage-gate governance"]
- **Delivery Cadence**: [Extract: e.g., "Quarterly releases → Hybrid SAFe"]

**Example (Non-ESG)**:
> *Hybrid approach: 4-week Tranches (Agile) for Azure development, wrapped in quarterly stage-gates (Predictive) for SOX compliance and budget approval.*

**Example (ESG)**:
> *Agile approach with rolling-wave planning for ESG data integration, enabling adaptive response to evolving regulatory requirements (CSRD, SEC Climate Rule).*

---

### 2.2 Tailoring Justification

**Why This Approach Was Selected** *(PMBOK 8 Domains)*:

| Performance Domain | Tailoring Decision | Justification |
|--------------------|-------------------|---------------|
| **Planning** | [Extract: e.g., Rolling-wave planning] | [Extract: e.g., Requirements evolve as AI models improve] |
| **Delivery** | [Extract: e.g., Incremental releases] | [Extract: e.g., Early feedback from pilot users] |
| **Measurement** | [Extract: e.g., Sprint-level OKRs] | [Extract: e.g., Weekly velocity tracking for agility] |
| **Uncertainty** | [Extract: e.g., Risk-based milestones] | [Extract: e.g., High vendor dependency → Early prototyping] |

**Tailoring Applied**:
- [Extract: e.g., "Scaled Agile (SAFe) for 18-FTE team; Scrum for frontend, Kanban for infrastructure"]
- [Extract: e.g., "Predictive procurement (6-month vendor contracts) within Agile delivery"]
- *(If ESG project)* [Extract: e.g., "Monthly ESG data validation gates"]

---

## 3. Project Performance Domains Strategy

### 3.1 Stakeholders Performance Domain
*(PMBOK 8 Principle: Stakeholder Engagement)*

**Strategy**: [Extract: e.g., "Proactive engagement with executive sponsors, daily stand-ups with dev team, monthly all-hands for transparency"]

**Stakeholder Matrix**:

| Stakeholder | Role | Interest | Influence | Engagement Strategy | Frequency |
|-------------|------|----------|-----------|---------------------|-----------|
| [Extract: CFO] | Sponsor | High | High | Budget reviews, ROI tracking | Bi-weekly |
| [Extract: CIO] | Co-Sponsor | High | High | Technical architecture approval | Weekly |
| [Extract: End Users] | Beneficiaries | Medium | Low | User acceptance testing, training | Monthly |

**For ESG Projects - Add ESG Roles**:

| Stakeholder | Role | ESG Interest | Engagement Strategy |
|-------------|------|--------------|---------------------|
| Chief Sustainability Officer | ESG Sponsor | Carbon reduction targets | Quarterly ESG KPI reviews |
| ESG Rating Agency (MSCI/Sustainalytics) | External Validator | Reporting accuracy | Annual compliance audit |
| Employees | ESG Framework Users | Workplace sustainability | Monthly ESG training |

**Artifacts**:
- Stakeholder Register
- Communications Plan
- *(If ESG)* ESG Stakeholder Engagement Plan

---

### 3.2 Team Performance Domain
*(PMBOK 8 Principles: Team Culture, Leadership, Stewardship)*

**Team Structure**:

| Role | Responsibility | FTE | Key Skills |
|------|----------------|-----|------------|
| [Extract: Project Manager] | Overall delivery, budget, risk | 1.0 | PMP, Azure certifications |
| [Extract: Technical Lead] | Architecture, code reviews | 1.0 | Power BI, Synapse expertise |
| [Extract: Business Analyst] | Requirements, UAT | 0.5 | BABOK, domain knowledge |
| *(If ESG)* ESG Data Analyst | ESG metrics integration | 0.5 | GRI, SASB frameworks |

**Team Culture** *(PMBOK 8 Principle: Leadership)*:
- [Extract: e.g., "Psychological safety to challenge assumptions, fail-fast mentality"]
- [Extract: e.g., "Cross-functional collaboration via daily stand-ups"]
- [Extract: e.g., "Continuous learning: weekly knowledge-sharing sessions"]
- *(If ESG)* [Extract: e.g., "ESG awareness: monthly sustainability workshops"]

**Artifacts**:
- Team Charter
- RACI Matrix
- Skills Matrix

---

### 3.3 Planning Performance Domain
*(PMBOK 8 Principle: Adaptability, Complexity)*

**Planning Strategy**:
- **Approach**: [Extract: e.g., "Rolling-wave: Detailed 4-week Tranches, high-level 9-month roadmap"]
- **Baseline Management**: [Extract: e.g., "Scope/Schedule/Cost baselines approved at stage-gates"]
- **Change Control**: [Extract: e.g., "Integrated change control via Jira; CCB approves >$50K changes"]

**Key Planning Artifacts**:
1. **Scope Baseline**: WBS, WBS Dictionary, Scope Statement
2. **Schedule Baseline**: Gantt chart (4-week Tranches), critical path analysis
3. **Cost Baseline**: $2.8M budget, 65% CapEx / 35% OpEx
4. **Quality Baseline**: Acceptance criteria (e.g., <3s load times, 90% user adoption)

**For ESG Projects - Add ESG Planning**:
- **ESG Data Integration Plan**: [Extract: e.g., "Automated ERP integration for carbon footprint data"]
- **Compliance Calendar**: [Extract: e.g., "TCFD disclosure deadlines, GRI reporting cycles"]
- **ESG Validation Gates**: [Extract: e.g., "Monthly third-party data audits"]

**Artifacts**:
- Project Management Plan (this document)
- Schedule (Microsoft Project / Primavera)
- Budget Breakdown Structure (BBS)
- *(If ESG)* ESG Data Integration Plan

---

### 3.4 Project Work Performance Domain
*(PMBOK 8 Principle: Quality, Complexity)*

**Work Management Strategy**:
- **Work Breakdown**: [Extract: e.g., "5 phases, 42 work packages, 487 activities"]
- **Execution Approach**: [Extract: e.g., "Agile sprints for development, Predictive for infrastructure"]
- **Resource Management**: [Extract: e.g., "18 FTEs, 6 contractors, Microsoft FastTrack support"]

**Key Processes**:
1. **Direct & Manage Project Work**: [Extract: e.g., "Daily stand-ups, weekly iteration planning"]
2. **Manage Quality**: [Extract: e.g., "Code reviews, UAT, penetration testing"]
3. **Acquire & Manage Resources**: [Extract: e.g., "Azure credits, Power BI Premium licenses"]
4. *(If ESG)* **ESG Data Workflows**: [Extract: e.g., "Carbon footprint data validated by third-party auditor"]

**Artifacts**:
- Work Packages
- Resource Calendar
- Quality Checklists

---

### 3.5 Delivery Performance Domain
*(PMBOK 8 Principle: Value, Quality)*

**Delivery Strategy**:
- **Incremental Delivery**: [Extract: e.g., "4-week Tranches, each delivering working Power BI dashboards"]
- **Value Realization**: [Extract: e.g., "Early value from Phase 1: $400K annual savings from Tableau license termination"]
- **Acceptance Criteria**: [Extract: e.g., "UAT signed-off by CFO, <3s load times verified"]

**Delivery Milestones**:

| Phase | Deliverable | Acceptance Criteria | Due Date |
|-------|-------------|---------------------|----------|
| Phase 1 | Azure Synapse deployed | Infrastructure live, data ingestion tested | [Extract] |
| Phase 2 | 100 Power BI reports migrated | 90% user acceptance, <3s load times | [Extract] |
| Phase 3 | Tableau decommissioned | All users migrated, licenses cancelled | [Extract] |

**For ESG Projects - Add ESG Deliverables**:

| ESG Deliverable | Acceptance Criteria | Due Date |
|----------------|---------------------|----------|
| Quarterly ESG Report | GRI-aligned, third-party validated | [Extract] |
| Carbon Footprint Dashboard | Real-time Scope 1/2/3 tracking | [Extract] |

**Artifacts**:
- Deliverable Acceptance Forms
- Release Notes
- *(If ESG)* ESG Compliance Reports

---

### 3.6 Measurement Performance Domain
*(PMBOK 8 Principle: Quality, Stewardship)*

**Measurement Strategy**:
- **Success Metrics**: [Extract: e.g., "38% TCO reduction, 90% user adoption, <3s load times"]
- **Performance Tracking**: [Extract: e.g., "Weekly velocity (story points), monthly financial actuals vs. budget"]
- **Earned Value Management (EVM)**: [Extract: e.g., "SPI ≥ 0.95, CPI ≥ 1.0"]

**In-flight project KPIs** *(measured during May 1 – May 31 delivery)*:

| KPI | Target | Measurement Method | Frequency | Owner |
|-----|--------|--------------------|-----------|-------|
| [Extract: SPI or milestone adherence] | [Extract] | [Extract] | [Weekly / Bi-weekly] | PM |
| [Extract: CPI or budget variance] | [Extract] | [Extract] | [Extract] | PM |
| [Extract: e.g. UI generation lead time] | [Extract] | [Extract] | [Extract] | Tech Lead |
| [Extract: defect density / UAT pass rate] | [Extract] | [Extract] | [Extract] | QA |

**Post-launch benefits realization** *(measured after go-live; not part of in-flight SPI/CPI)*:

| Benefit metric | Target | Measurement starts | Owner |
|----------------|--------|-------------------|-------|
| [Extract from charter, e.g. user interaction +30%] | [Extract] | [e.g. 30 days post go-live] | [Extract] |
| [Extract, e.g. manual UI dev time −40%] | [Extract] | [Extract] | [Extract] |

**For ESG Projects - Add ESG KPIs**:

| ESG KPI | Target | Measurement Method | Owner |
|---------|--------|--------------------|-------|
| [Extract: Carbon Footprint Reduction] | -25% | Third-party audit (annual) | CSO |
| [Extract: ESG Training Completion] | 100% | LMS tracking (quarterly) | HR |
| [Extract: Supplier ESG Compliance] | 100% | Certification verification | Procurement |

**Artifacts**:
- KPI Dashboard
- Monthly Status Reports
- Earned Value Reports
- *(If ESG)* ESG Performance Dashboard

---

### 3.7 Uncertainty Performance Domain
*(PMBOK 8 Principle: Risk, Adaptability)*

**Uncertainty Management Strategy**:
- **Risk Approach**: [Extract: e.g., "Monthly risk reviews, quantitative Monte Carlo for schedule risk"]
- **Opportunity Approach**: [Extract: e.g., "Exploit: Early Azure adoption → additional $200K credits"]
- **Ambiguity Management**: [Extract: e.g., "Prototyping for unclear AI requirements"]

**Top Risks & Responses**:

| Risk ID | Description | Probability | Impact | Response Strategy | Owner |
|---------|-------------|-------------|--------|-------------------|-------|
| R-001 | [Extract: Data migration errors] | Medium | High | Mitigate: Parallel run for 1 month | Tech Lead |
| R-002 | [Extract: User resistance to change] | High | Medium | Mitigate: Change champions, training | BA |
| R-003 | [Extract: Vendor delays (Microsoft)] | Low | High | Transfer: SLA penalties, escalation path | PM |

**For ESG Projects - Add ESG Risks**:

| ESG Risk | Description | Response | Owner |
|----------|-------------|----------|-------|
| R-ESG-01 | [Extract: Regulatory non-compliance (new CSRD rules)] | Monitor: Monthly legal reviews | Legal |
| R-ESG-02 | [Extract: ESG data quality issues] | Mitigate: Automated validation, third-party audits | Data Team |

**Artifacts**:
- Risk Register
- Risk Response Plan
- *(If ESG)* ESG Risk Matrix

---

## 4. Subsidiary Management Plans

### Subsidiary Management Plans Index

*(Populate from project context. Link or ID when known; otherwise title + owner.)*

| # | Subsidiary plan | Version | Owner | Status |
|---|-----------------|---------|-------|--------|
| 4.1 | Scope Management Plan | [Extract] | [Extract] | [Draft / Approved] |
| 4.2 | Schedule Management Plan | [Extract] | [Extract] | [Extract] |
| 4.3 | Cost Management Plan | [Extract] | [Extract] | [Extract] |
| 4.4 | Quality Management Plan | [Extract] | [Extract] | [Extract] |
| 4.5 | Resource Management Plan | [Extract] | [Extract] | [Extract] |
| 4.6 | Communications Management Plan | [Extract] | [Extract] | [Extract] |
| 4.7 | Procurement Management Plan | [Extract] | [Extract] | [Extract / N/A] |
| 4.8 | Risk Management Plan | [Extract] | [Extract] | [Extract] |
| 4.9 | Stakeholder Engagement Plan | [Extract] | [Extract] | [Extract] |

**How to use this PMP**: Sections **4.1–4.9** state **binding decisions** for this project. Detailed procedures may live in subsidiary documents; this integrated plan remains authoritative for baselines, thresholds, and governance.

---

### 4.1 Scope Management Plan

**Scope Definition**: [Extract: e.g., "Migrate 487 Tableau workbooks, decommission Tableau Server, train 500 users"]

**Scope Boundaries** *(PMBOK 8: Systems Thinking)*:
- **In Scope**: [Extract: e.g., "Power BI Premium, Azure Synapse, 62 data sources, 500 user licenses"]
- **Out of Scope**: [Extract: e.g., "Legacy SSRS reports (separate project), mobile app development"]

**For ESG Projects**:
- **ESG Scope**: [Extract: e.g., "Includes Scope 1, 2, and 3 emissions tracking; excludes financed emissions"]

**Change Control**: Per **§6 Change Management Plan** (thresholds, CCB, and process). Summarize only scope-specific rules here, if any.

**Artifacts**:
- Scope Statement
- WBS / WBS Dictionary
- Change Log

---

### 4.2 Schedule Management Plan

**Scheduling Method**: [Extract: e.g., "Critical Path Method (CPM), 4-week Tranches, quarterly stage-gates"]

**Schedule Baseline**:
- **Total Duration**: [Extract: e.g., "9 months (36 weeks)"]
- **Critical Path**: [Extract: e.g., "Azure deployment → Data migration → UAT → Tableau decommissioning"]
- **Float Management**: [Extract: e.g., "Zero float on critical path; 2-week buffer for non-critical"]

**For ESG Projects**:
- **ESG Milestones**: [Extract: e.g., "TCFD disclosure by Q3, GRI report by year-end"]

**Artifacts**:
- Gantt Chart (Microsoft Project)
- Milestone List
- Schedule Performance Reports

---

### 4.3 Cost Management Plan

**Budget Baseline**: [Extract: e.g., "$2.8M total: $1.82M CapEx (65%), $0.98M OpEx (35%)"]

**Cost Breakdown**:

| Category | Budget | Actual | Variance | % Spent |
|----------|--------|--------|----------|---------|
| Personnel | $1.2M | [Extract] | [Extract] | [Extract] |
| Azure Licenses | $0.8M | [Extract] | [Extract] | [Extract] |
| Microsoft Consulting | $0.6M | [Extract] | [Extract] | [Extract] |
| Training | $0.2M | [Extract] | [Extract] | [Extract] |

**For ESG Projects**:
- **ESG Budget**: [Extract: e.g., "$150K for third-party ESG audits, $50K for ESG software (Workiva)"]

**Artifacts**:
- Budget Breakdown Structure (BBS)
- Cost Performance Reports (EVM)

---

### 4.4 Quality Management Plan

**Quality Standards**: [Extract: e.g., "ISO 9001, Microsoft Well-Architected Framework, Power BI best practices"]

**Quality Objectives**:
- [Extract: e.g., "<3s dashboard load times (95th percentile)"]
- [Extract: e.g., "99.9% Azure uptime SLA"]
- [Extract: e.g., "90% user satisfaction score (UAT)"]

**Quality Control**:
- **Testing Strategy**: [Extract: e.g., "Unit tests (80% coverage), UAT (50 users), penetration testing"]
- **Code Reviews**: [Extract: e.g., "Peer review for all Power BI DAX, pull request approval required"]

**For ESG Projects**:
- **ESG Quality Standards**: [Extract: e.g., "100% GRI alignment, third-party audit (KPMG)"]
- **ESG Data Validation**: [Extract: e.g., "Automated checks for carbon data accuracy (±2% tolerance)"]

**Artifacts**:
- Quality Checklists
- Test Plans
- Defect Logs
- *(If ESG)* ESG Audit Reports

---

### 4.5 Resource Management Plan

**Resource Strategy**: [Extract: e.g., "18 FTEs, 6 Azure contractors, Microsoft FastTrack (100 hours)"]

**Resource Calendar**:
- [Extract: e.g., "Peak staffing: 24 FTEs in Months 4-6 (migration phase)"]
- [Extract: e.g., "Ramp-down: 12 FTEs in Month 9 (hypercare)"]

**For ESG Projects**:
- **ESG Resources**: [Extract: e.g., "2 ESG Analysts (0.5 FTE each), 1 third-party auditor (quarterly)"]

**Artifacts**:
- Resource Breakdown Structure (RBS)
- Resource Histogram
- Skills Matrix

---

### 4.6 Communications Management Plan

**Communication Strategy** *(PMBOK 8: Stakeholder Engagement)*:
- [Extract: e.g., "Weekly all-hands (Fridays), bi-weekly sponsor reviews, monthly town halls"]

**Communication Matrix**:

| Stakeholder | Information Needed | Format | Frequency | Owner |
|-------------|-------------------|--------|-----------|-------|
| Executive Sponsors | Budget, risks, decisions | Dashboard | Bi-weekly | PM |
| Development Team | User stories, blockers | Daily stand-up | Daily | Scrum Master |
| End Users | Training, go-live dates | Email, video | Monthly | BA |

**For ESG Projects**:
- **ESG Communications**: [Extract: e.g., "Quarterly ESG reports to investors, annual sustainability report (public)"]

**Artifacts**:
- Communications Plan
- Stakeholder Feedback Log

---

### 4.7 Procurement Management Plan

**Procurement Strategy**: [Extract: e.g., "Single-source (Microsoft for Azure/Power BI), competitive bid for training vendors"]

**Key Procurements**:

| Item | Vendor | Contract Type | Value | Status |
|------|--------|---------------|-------|--------|
| Azure Synapse | Microsoft | Enterprise Agreement | $800K | Executed |
| Power BI Premium | Microsoft | Enterprise Agreement | Included | Executed |
| Training Services | [Extract vendor name or "Not specified in project documentation"] | Fixed-price | [Extract] | [Extract status] |

**For ESG Projects**:
- **ESG Vendor Criteria**: [Extract: e.g., "Vendors must provide ISO 14001 certification or B-Corp status"]
- **ESG Compliance**: [Extract: e.g., "All suppliers submit annual ESG self-assessment"]

**Artifacts**:
- Procurement Management Plan
- Vendor Selection Criteria
- Contracts

---

### 4.8 Risk Management Plan

**Risk register**: See **§3.7 Uncertainty Performance Domain** (canonical risk IDs, scores, and owners). Do not duplicate the full register here.

**Risk Tolerance**: [Extract: e.g., "High risk tolerance for technical innovation, low tolerance for compliance/budget overruns"]

**Risk Response Strategies**:
- **Threats**: Avoid, Mitigate, Transfer, Accept
- **Opportunities**: Exploit, Enhance, Share, Accept

**For ESG Projects**:
- **ESG Risk Tolerance**: [Extract: e.g., "Zero tolerance for regulatory non-compliance"]

**Artifacts**:
- Risk Register (see Section 3.7)
- Risk Response Plan

---

### 4.9 Stakeholder Engagement Plan

**Stakeholder register**: See **§3.1 Stakeholders Performance Domain** (canonical matrix). Do not duplicate the full matrix here.

**Engagement Levels**:
- **Unaware** → **Resistant** → **Neutral** → **Supportive** → **Leading**

**Change Management**:
- [Extract: e.g., "ADKAR model: Awareness (town halls), Desire (benefits messaging), Knowledge (training), Ability (hands-on labs), Reinforcement (go-live support)"]

**For ESG Projects**:
- **ESG Change Management**: [Extract: e.g., "Sustainability champions program (20 employees), monthly ESG newsletters"]

**Artifacts**:
- Stakeholder Engagement Assessment Matrix
- Change Management Plan

---

## 5. ESG Compliance *(Conditional)*

> **Generation rule (mandatory)**  
> - If document header **ESG Applicability: No** → output **only** §5.0 below (do not include §5.1–5.2).  
> - If **ESG Applicability: Yes** → output §5.1–5.2 and **omit** §5.0.  
> **Never skip §5** (do not jump from §4.9 to §6).

### 5.0 ESG Compliance — Not Applicable

*(Use this entire subsection when ESG Applicability is No.)*

This project does not include sustainability reporting, EU Taxonomy alignment, or GRI/TCFD/SASB disclosure objectives. Environmental, social, and governance controls are limited to standard organizational policies (security, privacy, and ethics) covered in **§4.4 Quality Management Plan** and **§7 Governance & Oversight**. No ESG-specific subsidiary plans, KPIs, or audit cycles apply.

---

### 5.1 Compliance Checklist
*(Include ONLY when ESG Applicability is Yes — omit §5.0 when using this content)*

| ESG Requirement | Validation Method | Frequency | Owner | Status |
|----------------|-------------------|-----------|-------|--------|
| GRI Standards Alignment | Third-party audit (KPMG) | Annual | CSO | 🟢 |
| SASB Industry Metrics | Automated ERP validation | Quarterly | Data Team | 🟢 |
| TCFD Climate Disclosures | Scenario analysis review | Bi-annual | Risk Team | 🟡 |
| EU Taxonomy Alignment | Legal review + auditor sign-off | Annual | Legal | 🔴 |

---

### 5.2 ESG Quality Control Audit Plan

**Sampling Strategy**:
- 20% of ESG reports audited quarterly by third-party (rotational basis)
- 100% of TCFD disclosures reviewed by external auditor (annual)

**Tools**:
- [Extract: e.g., "Workiva ESG platform for data validation"]
- [Extract: e.g., "Power BI ESG Dashboard for real-time monitoring"]

**Artifacts**:
- ESG Audit Reports (KPMG)
- ESG Data Quality Logs

---

## 6. Change Management Plan

**Change Control Process**:
1. **Request**: Stakeholder submits change request (Jira)
2. **Analysis**: PM assesses impact on scope/schedule/cost/quality
3. **Review**: Change Control Board (CCB) evaluates (weekly meetings)
4. **Decision**: Approve, Reject, or Defer
5. **Implementation**: Update baselines, communicate to stakeholders

**Change Control Board (CCB)**:

| Name | Role | Responsibilities | Contact |
|------|------|------------------|---------|
| [Extract sponsor full name] | Sponsor | Final authority per thresholds below | [Extract email] |
| [Extract PM full name] | Project Manager (Chair) | Impact analysis, change log, implementation | [Extract email] |
| [Extract technical lead full name] | Technical Advisor | Feasibility, integration impact | [Extract email] |
| [Extract senior dev or architect name] | Technical Advisor | Effort, quality, architecture | [Extract email] |
| [Extract finance contact name] | Financial Advisor | Budget compliance | [Extract email] |

- **Quorum**: [Extract, e.g. 3 of 5]
- **Authority**: [Extract thresholds, e.g. PM ≤ $1K; CCB $1K–$5K; Sponsor > $5K or > 2 schedule days]

**For ESG Projects**:
- **ESG Change Control**: All changes to ESG metrics or compliance frameworks require CSO approval

**Artifacts**:
- Change Request Log
- CCB Meeting Minutes
- Updated Baselines

---

## 7. Governance & Oversight

**Governance Structure**:

| Body | Role | Frequency | Attendees |
|------|------|-----------|-----------|
| Steering Committee | Strategic decisions, budget approval | Monthly | CFO, CIO, PM |
| Change Control Board (CCB) | Scope/schedule/cost changes | Weekly | PM, Tech Lead, BA, Finance |
| Project Team Stand-up | Daily coordination | Daily | Entire project team |

**Decision Authority**:
- **Sponsor**: >$100K budget, scope changes affecting business case
- **PM**: <$100K budget, schedule adjustments within ±1 week
- **CCB**: Scope/schedule/cost changes $50K–$100K

**For ESG Projects**:
- **ESG Governance**: CSO has veto power on any ESG-related changes

**Artifacts**:
- Governance Charter
- Decision Log

---

## 8. Integration Management

**Integration Approach** *(PMBOK 8: Systems Thinking)*:
- [Extract: e.g., "Weekly integration meetings to align Azure, Power BI, and data migration workstreams"]
- [Extract: e.g., "Integrated change control: All changes assessed across scope/schedule/cost/quality/risk"]

**Key Integrations**:
1. **Technical**: Azure Synapse ↔ Power BI ↔ 62 data sources
2. **Process**: Agile development ↔ Predictive governance (stage-gates)
3. **Organizational**: IT ↔ Finance ↔ Business Units (500 users)
4. *(If ESG)* **ESG**: [Extract: e.g., "Carbon data from ERP → ESG dashboard → TCFD reports"]

**Artifacts**:
- Integration Management Plan
- Interface Control Documents

---

## 9. Lessons Learned & Knowledge Management

**Knowledge Capture Strategy**:
- **During Project**: [Extract: e.g., "Retrospectives after each 4-week Tranche, document in Confluence"]
- **At Project End**: [Extract: e.g., "Formal lessons learned session, PMO knowledge base update"]

**Key Lessons (Ongoing)**:
- [Extract: e.g., "Parallel run with Tableau reduced user resistance (Tranche 3 retrospective)"]
- [Extract: e.g., "Microsoft FastTrack saved 2 weeks in Azure setup (Tranche 1)"]

**For ESG Projects**:
- [Extract: e.g., "ESG data quality issues resolved via automated validation scripts (Quarter 2 retrospective)"]

**Artifacts**:
- Lessons Learned Register
- Knowledge Base Articles

---

## 10. Project Closure

### 10.1 Closure Criteria

**Project will be considered complete when**:
- [Extract: e.g., "All 487 Tableau workbooks migrated to Power BI"]
- [Extract: e.g., "90% user adoption achieved (verified by Power BI usage logs)"]
- [Extract: e.g., "<3s dashboard load times validated (performance testing)"]
- [Extract: e.g., "Tableau Server decommissioned, licenses cancelled"]
- [Extract: e.g., "$4.2M annual savings realized (CFO sign-off)"]

**For ESG Projects**:
- [Extract: e.g., "Final ESG report submitted to Board with third-party validation"]
- [Extract: e.g., "25% carbon reduction verified by auditor"]

---

### 10.2 Transition to Operations

**Operational Handover**:
- [Extract: e.g., "Power BI Premium support transitioned to IT Operations (SLA: 4-hour response)"]
- [Extract: e.g., "Training materials archived in SharePoint"]
- [Extract: e.g., "Hypercare support: 3 months post-go-live (reduced staffing)"]

**For ESG Projects**:
- **ESG Handover**: [Extract: e.g., "ESG reporting process transitioned to Sustainability Team (monthly cadence)"]

---

### 10.3 Final Lessons Learned

**What Worked Well**:
- [Extract: e.g., "Agile Tranches enabled early feedback and course correction"]
- [Extract: e.g., "Microsoft FastTrack accelerated Azure deployment"]

**What Could Be Improved**:
- [Extract: e.g., "Earlier engagement with Finance for budget approvals"]
- [Extract: e.g., "More robust data quality checks pre-migration"]

**For ESG Projects**:
- [Extract: e.g., "ESG data validation automation saved 40 hours/month"]
- [Extract: e.g., "Need earlier engagement with ESG auditors for compliance alignment"]

---

### 10.4 Final Deliverables

**Project Artifacts**:
- ✅ 487 Power BI reports (migrated)
- ✅ Azure Synapse Analytics (operational)
- ✅ Training materials (500 users trained)
- ✅ Final project report (this PMP + status reports)
- ✅ *(If ESG)* Final ESG Report (third-party validated)

**Sign-Off**:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | [Extract PM full name] | _________________________ | [Project end date] |
| Sponsor | [Extract sponsor full name and title] | _________________________ | [Extract] |
| Head of IT | [Extract from context or "Not specified in project documentation"] | _________________________ | [Extract] |
| Head of Business Operations | [Extract from context or "Not specified in project documentation"] | _________________________ | [Extract] |
| *(If ESG Applicability: Yes)* Chief Sustainability Officer | [Extract] | _________________________ | [Extract] |

---

## Appendices

### Appendix A: PMBOK 8 Principles Mapping

| PMBOK 8 Principle | How This Project Embodies It |
|-------------------|------------------------------|
| 1. Stewardship | [Extract: e.g., "Responsible resource management: $2.8M budget within tolerance"] |
| 2. Team | [Extract: e.g., "Psychological safety, daily stand-ups, cross-functional collaboration"] |
| 3. Stakeholders | [Extract: e.g., "Proactive engagement: 500 users trained, weekly sponsor reviews"] |
| 4. Value | [Extract: e.g., "$4.2M annual savings, <3s load times, 90% user adoption"] |
| 5. Systems Thinking | [Extract: e.g., "Integrated Azure ecosystem: Synapse + Power BI + 62 data sources"] |
| 6. Leadership | [Extract: e.g., "PM empowered to make $50K decisions, servant leadership model"] |
| 7. Tailoring | [Extract: e.g., "Hybrid approach: Agile for dev, Predictive for governance"] |
| 8. Quality | [Extract: e.g., "Code reviews, UAT, performance testing, 99.9% SLA"] |
| 9. Complexity | [Extract: e.g., "Managed via decomposition (5 phases, 42 work packages)"] |
| 10. Risk | [Extract: e.g., "Monthly risk reviews, Monte Carlo schedule analysis"] |
| 11. Adaptability | [Extract: e.g., "Rolling-wave planning, retrospectives, change management"] |
| 12. Change | [Extract: e.g., "ADKAR model, change champions, 3-month hypercare"] |

---

### Appendix B: ESG Standards Mapping *(If Applicable)*

| ESG Standard | Requirement | Project Deliverable | Compliance Status |
|--------------|-------------|---------------------|-------------------|
| GRI 305 | Scope 1/2/3 emissions reporting | Carbon Footprint Dashboard | ✅ Compliant |
| SASB IF-EN-410a.1 | Energy efficiency metrics | Energy KPI Dashboard | ✅ Compliant |
| TCFD Strategy | Climate scenario analysis | Climate Risk Report | 🟡 In Progress |
| EU Taxonomy | Sustainable activity alignment | Taxonomy Alignment Report | 🔴 Pending audit |

---

### Appendix C: Glossary

- **ADPA**: [Extract organization legal name from context—never leave as placeholder]
- **PMBOK**: Project Management Body of Knowledge
- **EVM**: Earned Value Management
- **SPI**: Schedule Performance Index
- **CPI**: Cost Performance Index
- **UAT**: User Acceptance Testing
- **GRI**: Global Reporting Initiative
- **SASB**: Sustainability Accounting Standards Board
- **TCFD**: Task Force on Climate-related Financial Disclosures
- **ESG**: Environmental, Social, Governance

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Extract approval date] | [Extract PM full name] | Initial integrated PMP (PMBOK 8) |

*(Do not add template-version rows authored by "AI Agent". Template changes belong in repository history, not in the signed artifact.)*

---

**END OF PROJECT MANAGEMENT PLAN**

---

## Extraction Rules for AI Generation

### ✅ DO:
1. **Extract ALL relevant project details** from context (charter, subsidiary plans, stakeholder register, WBS, risk register, budget).
2. **Produce a signature-ready draft**: Document Control, Executive Summary, §1–§10, appendices—complete in one pass.
3. **Always include §5**: stub (ESG No) or full ESG content (ESG Yes).
4. **Link sections to PMBOK 8 principles** where it adds clarity; avoid textbook definitions in every paragraph.
5. **Use real data** (dates, dollars, names, IDs, WBS elements such as 2.3.1).
6. **Deduplicate**: one canonical stakeholder matrix (§3.1), one risk register (§3.7), one change process (§6).
7. **Subsidiary plans (§4)**: index table + binding bullets per §4.x before narrative detail.
8. **Separate in-flight KPIs from post-launch benefits** in §3.6.
9. **Set ESG Applicability** in the header to **Yes** or **No** from charter—then follow §5 generation rule.

### ❌ DO NOT:
1. **Use bracket placeholders** (`[Name]`, `[TBD]`, `[Insert …]`)—use extracted values or "Not specified in project documentation".
2. **Credit "AI Agent"** in Prepared By, Revision History, or sign-off.
3. **Skip §5** when ESG is No (use §5.0 stub).
4. **Repeat** full change-control or stakeholder tables in §4 and §8 if already in §3.1 / §6.
5. **Rely on** "as per \`Document Name\`" without stating the decision in this PMP.
6. **Force ESG** into non-ESG projects (no §5.1–5.2 when Applicability is No).
7. **Embed** AI generation metadata (tokens, cost, provider) in the document body.
8. **Focus on processes over outcomes** (PMBOK 8 is outcome-focused).

### Signature artifact checklist (self-review before finishing)

- [ ] Header: ESG Applicability, Project ID, version, PM and Sponsor names filled
- [ ] Document Control + Executive Summary present
- [ ] §4 opens with Subsidiary Management Plans Index
- [ ] §5 present (stub or ESG content per header)
- [ ] §6 CCB table has real names and emails (or explicit "Not specified…")
- [ ] §10.4 sign-off includes IT and Business Operations roles
- [ ] No `[…]` placeholders remain in output
- [ ] Appendix C defines ADPA with real organization name

---

## Usage Instructions

### For AI Agents:
1. **Read project context** provided by user (charter, stakeholder register, business case)
2. **Determine ESG applicability**:
   - **YES**: Project includes sustainability, ESG compliance, or governance objectives
   - **NO**: Standard project (IT, process improvement, product development)
3. **Generate PMP** using this template:
   - Include Document Control, Executive Summary, §1–§10, appendices
   - §5 per ESG Applicability (stub vs full ESG—never skip)
   - Extract real data; run signature artifact checklist
4. **Validate output**:
   - All 8 performance domains addressed (§3.1–§3.7 + §2 development approach)
   - Appendix A maps all 12 principles
   - No duplicate canonical tables; §6 is single change-control source
   - Outcome-focused language; tables populated for executives
5. **GenUI / export** (when rendered in ADPA): preserve `##` section structure for TOC; keep matrices as Markdown tables; signature block in §10.4 must survive PDF export

### For Project Managers:
1. **Provide context** to AI:
   - Project charter
   - Stakeholder register
   - Business case
   - Any ESG requirements (if applicable)
2. **Review generated PMP**:
   - Verify accuracy of extracted data
   - Confirm ESG sections are appropriate (or removed if not needed)
   - Validate PMBOK 8 alignment
3. **Customize as needed**:
   - Add organization-specific templates
   - Adjust governance structure
   - Refine stakeholder engagement strategy

---

**Template Version**: 2.1 (Signature Artifact — ESG Conditional)  
**Last Updated**: May 21, 2026  
**Maintainer**: ADPA Development Team  
**Status**: Production-Ready  
**Changelog (2.1)**: Document control & executive summary; mandatory §5 for non-ESG; subsidiary plan index; deduplication rules; CCB/sign-off completeness; KPI split; no AI authorship in revision history.

