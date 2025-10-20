# Change Request: Project Baseline & Drift Detection System

**CR ID:** CR-2026-001  
**Version:** 1.0  
**Date:** October 15, 2025  
**Status:** ✅ Approved & Authorized (October 19, 2025)  
**Approved By:** Menno Drescher (Project Owner)  
**Authorization:** Proceed with Phase 1 implementation immediately  
**Test Plan:** [BASELINE_DRIFT_DETECTION_TEST_PLAN.md](../../06-features/BASELINE_DRIFT_DETECTION_TEST_PLAN.md)  
**Production Approval:** ⏳ Pending test plan execution and UAT sign-off

---

## Executive Summary

**What:** Build an AI-powered system that establishes project baselines from existing documents and automatically detects scope drift, technical drift, timeline drift, and innovation opportunities.

**Why:** Organizations lose 20-40% of project value to undetected scope creep and fail to capitalize on efficiency improvements that emerge during execution. Current manual reviews miss 70% of drift until it's too late.

**Value:** Early drift detection can save 15-25% of project budgets and reduce timeline overruns by 30-50%. Patent opportunity detection could generate $500K-$2M in IP value per discovery.

**Ask:** $400K investment over 12 months. Expected 3-year ROI: 300-500%.

---

## 1. Business Case

### Problem Statement

**Current State:**
- Projects establish baselines manually (often incomplete)
- Scope changes go undetected until quarterly reviews
- No systematic way to identify positive deviations (efficiency gains)
- Innovation opportunities discovered accidentally, not systematically
- Project drift averages 35% from baseline by project end

**Impact:**
- 30-40% of projects exceed budget due to undetected scope creep
- 25% of projects delayed by undetected dependencies
- Lost opportunity: $500K-$2M in potential IP value per year
- Emergency course corrections cost 3x more than early interventions

**Who's Affected:**
- Project managers (spend 20% of time manually tracking drift)
- Executives (surprised by budget overruns in month 8)
- Innovation teams (miss patentable discoveries)
- Stakeholders (misaligned expectations)

### Proposed Solution

**AI-Powered Baseline & Drift Detection:**

1. **Automated Baseline Creation**
   - AI analyzes project documents (charter, requirements, design docs)
   - Extracts scope, technical approach, timeline, success criteria
   - Creates structured, version-controlled baseline

2. **Continuous Drift Monitoring**
   - Weekly analysis of project documents and artifacts
   - Detects: scope drift, technical drift, timeline drift
   - Classifies: negative drift (scope creep) vs positive drift (efficiency)

3. **Patent Opportunity Detection**
   - Identifies novel technical approaches
   - Compares against prior art databases (USPTO, EPO, academic)
   - Flags high-value innovation for IP review

4. **Early Warning System**
   - Alerts 2-4 weeks before drift becomes critical
   - Recommends corrective actions
   - Escalates to appropriate stakeholders

### Strategic Alignment

- [x] **Strategic Goal:** Improve project delivery success rate from 65% to 85%
- [x] **Business Priority:** Reduce unplanned budget overruns by 50%
- [x] **Innovation Priority:** Increase IP portfolio value by 20% annually
- [ ] **Compliance Required:** No (strategic initiative)

---

## 2. Scope Definition

### ✅ IN SCOPE (Version 2.1)

**Phase 1: Baseline Foundation (v2.1 - Q2 2026)**
- [ ] AI-powered document corpus analysis
- [ ] Automatic scope extraction from requirements, charters, RFPs
- [ ] Technical baseline identification
- [ ] Success criteria extraction
- [ ] Baseline version control and approval workflow

**Phase 2: Drift Detection Engine (v2.2 - Q3 2026)**
- [ ] Scope drift detection (additions, deletions, modifications)
- [ ] Technical drift detection (architecture changes)
- [ ] Timeline drift detection
- [ ] Impact assessment (budget, schedule, quality)
- [ ] Alert generation and escalation

**Phase 3: Efficiency & Value Tracking (v2.3 - Q4 2026)**
- [ ] Positive deviation detection (efficiency improvements)
- [ ] Business value quantification
- [ ] Recommendation engine for corrective actions
- [ ] Stakeholder communication templates

**Phase 4: Innovation & Patent Detection (v3.0 - 2027)**
- [ ] Novel approach detection
- [ ] Prior art search integration (USPTO, EPO, academic databases)
- [ ] Patentability assessment
- [ ] Commercial value estimation
- [ ] IP attorney workflow integration

### ❌ OUT OF SCOPE (Explicitly Excluded)

- ❌ **Full project management system** (use existing PM tools)
- ❌ **Time tracking or resource management** (separate CR)
- ❌ **Financial accounting integration** (use existing ERP)
- ❌ **Contract management** (use existing CLM system)
- ❌ **Automated project execution** (detection only, not autopilot)
- ❌ **Patent filing automation** (flag opportunities, lawyers file)
- ❌ **Real-time monitoring** (weekly analysis sufficient)

### 🔄 Dependencies

**Requires:**
- ADPA v2.0 document management system (deployed)
- AI provider API keys (OpenAI, Claude, or equivalent)
- Access to project documents (SharePoint, Confluence, etc.)

**Integrates With:**
- Existing PM tools (Jira, MS Project) for timeline data
- Document repositories (SharePoint, Confluence, Google Drive)
- USPTO/EPO APIs for prior art search

**Enables:**
- Document feedback system (CR-2026-002)
- Hierarchical project management (CR-2026-003)

---

## 3. Financial Analysis

### Investment Required

| Category | Cost | Notes |
|----------|------|-------|
| **Development** | **$320K** | |
| - Phase 1 (3 months) | $100K | 2 backend, 1 AI/ML engineer |
| - Phase 2 (2 months) | $80K | 2 backend, 1 AI/ML |
| - Phase 3 (2 months) | $80K | 1 backend, 1 AI/ML |
| - Phase 4 (3 months) | $60K | 1 AI/ML, IP consultant |
| **AI/LLM Costs** | $30K | OpenAI/Claude API usage (annual) |
| **Prior Art APIs** | $20K | USPTO, EPO, Espacenet access |
| **Infrastructure** | $10K | Database, processing, storage |
| **Training & Docs** | $20K | User training, admin guides |
| **Total Investment** | **$400K** | |

### Expected Returns (Annual)

| Benefit | Annual Value | Calculation Method |
|---------|--------------|-------------------|
| **Early drift detection** | $250K-$400K | 10 projects × $25K-$40K saved per project |
| **Scope creep prevention** | $150K-$300K | Prevent 30% budget overrun on $500K avg project |
| **Efficiency capture** | $100K-$200K | Document & replicate 5-10 improvements |
| **Patent opportunities** | $500K-$2M | 1-2 patents × $500K-$1M value each |
| **PM time savings** | $50K-$100K | 5 PMs × 10 hours/month × $100/hour |
| **Total Annual Value** | **$1.05M-$3M** | |

### ROI Calculation

- **Payback Period:** 5-8 months
- **Year 1 ROI:** 160-650%
- **3-Year ROI:** 300-500%
- **5-Year ROI:** 500-1000%
- **Net Present Value (NPV, 10% discount):** $1.8M-$6.2M

**Conservative Scenario:** Even with 50% of projected value = $525K/year = 131% 3-year ROI

---

## 4. Implementation Plan

### Timeline (12 months)

| Phase | Duration | Deliverables | Budget |
|-------|----------|--------------|--------|
| **Phase 1** | 3 months | Baseline creation, AI extraction, version control | $130K |
| **Phase 2** | 2 months | Drift detection algorithms, alert system | $110K |
| **Phase 3** | 2 months | Efficiency tracking, recommendations | $100K |
| **Phase 4** | 3 months | Patent detection, prior art integration | $60K |
| **Buffer** | 2 months | Contingency, refinement, UAT | - |

### Resource Requirements

| Role | Allocation | Duration | Cost |
|------|------------|----------|------|
| Senior Backend Engineer | 70% | 7 months | $140K |
| AI/ML Engineer | 80% | 10 months | $160K |
| Product Manager | 25% | 12 months | $40K |
| UX Designer | 20% | 4 months | $16K |
| QA Engineer | 40% | 5 months | $40K |
| IP Legal Consultant | 10% | 3 months | $24K |

### Key Milestones

- [ ] **Month 3:** Baseline creation working for 5 pilot projects
- [ ] **Month 5:** Drift detection alerts generated for pilot projects
- [ ] **Month 7:** Efficiency recommendations delivered
- [ ] **Month 10:** Patent opportunity flagged (at least 1)
- [ ] **Month 12:** Full system deployed to all active projects

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AI accuracy < 80%** | Medium | High | Extensive training data, human review loop, confidence scoring |
| **Low adoption by PMs** | Medium | High | Early PM involvement, show value in first month, executive sponsorship |
| **Prior art API limits** | Low | Medium | Multiple API providers, fallback to manual search |
| **Complex projects fail baseline** | High | Medium | Start with simpler projects, iterative refinement |
| **Patent detection false positives** | Medium | Low | Legal review required for all flags, confidence thresholds |
| **Cost overruns** | Low | Medium | Phased approach allows pause/adjust, 15% buffer |

### Contingency Plan

- **Budget Buffer:** 15% ($60K) for unexpected complexity
- **Schedule Buffer:** 2 months for refinement and UAT
- **Rollback Plan:** Phase 1 delivers value standalone; can pause after any phase
- **Success Criteria:** 70% accuracy threshold - if not met by Month 5, reassess

---

## 6. Success Metrics

### Adoption Metrics (Month 3)
- **Target:** 80% of new projects create AI baseline
- **Target:** 90% of PMs review drift alerts weekly
- **Target:** 5+ pilot projects using system

### Business Impact Metrics (Month 6)
- **Scope drift detected:** 2-4 weeks earlier than manual reviews
- **False positive rate:** < 20% of alerts
- **Budget savings:** $100K+ from early interventions
- **Patent opportunities:** At least 1 flagged for review

### Technical Metrics
- **Baseline creation accuracy:** > 80% PM satisfaction
- **Drift detection accuracy:** > 75% true positives
- **System performance:** < 5 seconds to analyze 50-page document
- **Uptime:** 99.5%

---

## 7. Stakeholder Impact

| Stakeholder Group | Impact | Benefit | Change Required |
|-------------------|--------|---------|-----------------|
| **Project Managers** | High | Early warnings, time savings | Weekly review of alerts (30 min) |
| **Executives** | Medium | Visibility, risk mitigation | Review monthly drift reports |
| **Innovation Team** | Medium | Patent opportunities | Review flagged innovations |
| **IT Operations** | Low | Support new system | Minimal - uses existing infrastructure |
| **Legal/IP** | Medium | Proactive IP strategy | Review patent opportunities |

### Communication Plan

**Month 1:**
- Executive presentation on system goals
- PM workshops on baseline creation
- IT briefing on technical architecture

**Month 3:**
- Pilot project showcase
- Success stories and lessons learned

**Month 6:**
- Company-wide rollout announcement
- Training videos and documentation
- Q&A sessions

**Ongoing:**
- Weekly alerts to project teams
- Monthly executive summary reports
- Quarterly IP review meetings

---

## 8. Alternatives Considered

### Option 1: Build in-house AI system (Recommended)
**Pros:** Full control, customization, integration with ADPA  
**Cons:** Higher initial cost, longer time to value  
**Cost:** $400K over 12 months  
**ROI:** 300-500% (3-year)

### Option 2: Buy commercial drift detection tool
**Pros:** Faster deployment (3 months)  
**Cons:** Limited customization, $150K/year recurring, no patent detection  
**Cost:** $450K over 3 years + integration ($50K)  
**ROI:** 150-200% (3-year, lower value)

### Option 3: Hire more project managers for manual tracking
**Pros:** No technology risk  
**Cons:** Doesn't scale, misses 70% of drift, no patent detection  
**Cost:** $200K/year × 3 years = $600K  
**ROI:** Negative (higher cost, less value)

### Option 4: Do nothing
**Pros:** No investment  
**Cons:** Continue losing 30-40% to scope creep, miss IP opportunities  
**Cost:** $1M-$3M in lost value over 3 years

**Recommendation:** **Option 1** - Highest ROI, strategic capability, enables future features

---

## 9. Decision Required

### Approval Requested

Please approve:
- [x] **Budget envelope:** $400K from Innovation Fund (subject to CFO funding control)
- [x] **Team allocation:** As specified in section 4
- [x] **Timeline:** 12-month development, start Q1 2026
- [x] **Success criteria:** As specified in section 6

### Conditions
- Must integrate with existing ADPA v2.0 (prerequisite)
- Pilot with 5 projects in first 3 months
- Go/No-Go decision point after Phase 1 (baseline creation)
- Patent detection requires legal team engagement
- CFO funding approval contingent on receipt of constraints & requirements dossier (Scope, Cost, Schedule baselines and risks)
- **Testing Gate:** Production deployment blocked until comprehensive test plan executed and approved (see section 9.1)

### 9.1 Testing & Quality Gate

**Pre-Production Testing Requirements:**

All Phase 1 features must pass comprehensive testing before production approval:

1. **Test Plan Execution** (3 weeks)
   - Unit Testing: Backend services (85% coverage target)
   - Integration Testing: API & database operations
   - UI/UX Testing: Frontend baseline management interface
   - End-to-End Testing: Full workflow validation
   - Performance Testing: Load and stress tests
   - Security Testing: Permission enforcement, input validation

2. **User Acceptance Testing (UAT)**
   - Session 1: Project Managers (3 participants, 1 hour)
   - Session 2: Stakeholders (2 executives, CFO, 30 minutes)
   - Acceptance Criteria:
     * ≥ 80% of PMs rate extraction accuracy as "good" or "excellent"
     * 100% successfully create and approve baseline
     * Stakeholder confirmation of business value
     * No critical UI bugs

3. **Production Approval Checklist**
   - [ ] All critical test cases passed (100%)
   - [ ] ≥ 95% high-priority test cases passed
   - [ ] No unresolved critical/high severity defects
   - [ ] Performance benchmarks met (baseline extraction < 30s for 5 docs)
   - [ ] Security audit passed (permission enforcement verified)
   - [ ] UAT completed with stakeholder sign-off
   - [ ] Documentation complete
   - [ ] Rollback plan documented
   - [ ] Support team trained

**Quality Targets:**
- Baseline extraction accuracy: ≥ 85%
- Drift detection precision: ≥ 80%
- API response time: < 500ms (reads), < 35s (extraction)
- Zero critical security vulnerabilities

**Go/No-Go Authority:**
- Technical Lead (QA sign-off)
- Project Owner (business value confirmation)
- Product Manager (feature completeness)

**Full Test Plan:** See [BASELINE_DRIFT_DETECTION_TEST_PLAN.md](../../06-features/BASELINE_DRIFT_DETECTION_TEST_PLAN.md)

---

## 10. Sign-Off

**Prepared By:**
- Name: ADPA Product Team
- Role: Product Manager
- Date: October 15, 2025

**Reviewed By:**

| Reviewer | Role | Recommendation | Date | Signature |
|----------|------|----------------|------|-----------|
| CTO | CTO | ✅ Approve | 2025-10-19 |  |
| CFO | CFO | ⏳ Pending (post-dossier) |  |  |
| VP Innovation | VP Innovation | ✅ Approve | 2025-10-19 |  |
| Chief Legal Officer | CLO | ✅ Approve | 2025-10-19 |  |

**Final Decision:**
- Sponsor: ___________________
- Decision: ✅ Approved (subject to CFO funding control)
- Date: 2025-10-19
- Signature: ___________________

**Conditions of Approval:**
- Deliver constraints & requirements dossier (Scope, Cost, Schedule, Risk) to CFO for funding release
- Proceed with Phase 1 planning; do not incur material spend until CFO approves funding release

---

## Appendix

### A. Technical Architecture
See: `docs/roadmap/FUTURE_IMPROVEMENTS.md` Section 10

### B. Data Model Examples
See: `docs/roadmap/FUTURE_IMPROVEMENTS.md` Section 10.2-10.4

### C. Pilot Project Candidates
1. Digital Transformation Initiative ($2M budget)
2. Cloud Migration Program ($1.5M budget)
3. AI Integration Project ($500K budget)
4. Mobile App Redesign ($750K budget)
5. ERP Upgrade Phase 2 ($3M budget)

### D. Prior Art Search Providers
- USPTO PatentsView API
- EPO Open Patent Services
- Google Patents Public Data
- Espacenet Web Services
- Semantic Scholar (academic papers)

---

**Next Step:** Present to executive sponsor for approval decision by November 1, 2025.

---

## Baseline Attachments (For CFO Review)

### A. Scope Baseline (v1.0)
- Objective: Establish AI-powered baseline creation and drift detection across scope, technical, and timeline domains
- In Scope (Phase 1–3):
  - AI document corpus analysis; automatic extraction of scope/tech/timeline/success criteria
  - Baseline version control & approval workflow
  - Drift detection (scope/tech/timeline) + impact assessment + alerts
  - Efficiency tracking and recommendations
- Out of Scope:
  - Full PM suite (use existing tools), time tracking, ERP/finance, contract management, autopilot execution, patent filing automation
- Deliverables by Phase:
  - P1: Baseline creation, extraction, versioning workflow
  - P2: Drift detection engine + alerting + impact
  - P3: Efficiency/value tracking + recommendations

### B. Cost Baseline (v1.0)
- Total: $400K (12 months)
- Breakdown:
  - Development: $320K (P1 $100K, P2 $80K, P3 $80K, P4 $60K)
  - AI/LLM: $30K; Prior Art APIs: $20K; Infra: $10K; Training/Docs: $20K
- Buffer: 15% schedule buffer (absorbed across phases); spend gated by monthly checkpoints

### C. Schedule Baseline (v1.0)
- Duration: 12 months (start Q1 2026)
- Milestones:
  - M3: Baseline creation for 5 pilot projects
  - M5: Drift alerts live on pilots
  - M7: Efficiency recommendations delivered
  - M10: ≥1 patent opportunity flagged
  - M12: Org-wide deployment
- Checkpoints: Monthly Stop/Go with budget burn vs. value progress

### D. Risk Baseline (v1.0)
- Risks & Mitigations:
  - AI accuracy <80% → Training data + human review + confidence scoring
  - Low PM adoption → Early involvement + visible value in month 1
  - API limits → Multi-provider + manual fallback
  - Complex projects → Start simpler + iterate
  - False positives (patent) → Legal review + thresholds
  - Cost overruns → Phased plan + 15% buffer + checkpoints
- Success Criteria:
  - Month 3: 80% PM baseline satisfaction; Month 6: drift detected 2–4 weeks early; <20% false positives; $100K+ savings

### E. CFO Funding Dossier – Ready for Review
- Included: Scope/Cost/Schedule/Risk baselines (this section), ROI model ($1.05M–$3M/yr), dependencies, and conditions
- Funding Release Condition: Approval of this dossier and confirmation of monthly checkpoint governance

