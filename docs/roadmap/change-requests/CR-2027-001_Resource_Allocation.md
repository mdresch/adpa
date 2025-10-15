# Change Request: Resource Allocation Intelligence (Integration-First)

**CR ID:** CR-2027-001  
**Version:** 1.0  
**Date:** October 15, 2024  
**Status:** Draft (Pending Sponsor Review)  
**Dependency:** CR-2026-003 (Hierarchical PM) recommended but not required  
**Philosophy:** 60% of benefits with 10% of complexity

---

## Executive Summary

**What:** Build a lightweight resource allocation tracking system that detects overallocation and conflicts by **integrating with existing tools** (Jira, BambooHR, Google Calendar) rather than replacing them.

**Why:** Teams already use time-tracking and HR systems. Building another one wastes money and creates duplicate data entry. What's missing is **cross-project visibility** and **early conflict detection**. Organizations lose 30-40% of project time to resource conflicts discovered too late.

**Value:** 40-50% reduction in resource-related delays, 60% reduction in emergency resource scrambling, 5-10 hours/week saved per resource manager. **Integration approach** means faster deployment and lower cost.

**Ask:** $200K investment over 5 months (vs $1M+ for full system). Expected 3-year ROI: 150-300%.

---

## 1. Business Case

### Problem Statement

**Current State:**
- Resources allocated per-project (no cross-project view)
- Overallocation discovered when projects slip
- Resource managers use spreadsheets (manual, error-prone)
- No integration with time-tracking tools (duplicate entry)
- Conflicts detected too late (2-4 weeks into delays)
- No visibility into PTO/leave impact on allocations

**Impact:**
- 30-40% of resources overallocated at any time
- Resource conflicts cause 25% of project delays
- Emergency resource reshuffling: 3-5 times per quarter
- Resource manager time: 10-15 hours/week on manual tracking
- Hidden cost: $200K-$600K annually in inefficiency

**Who's Affected:**
- Resource managers (manual tracking, firefighting)
- Project managers (resource conflicts, delays)
- Team members (burnout from overallocation)
- Executives (surprised by resource bottlenecks)

### Proposed Solution

**Integration-First Resource Intelligence:**

**What We WILL Build:**
1. **Simple Allocation Tracking**
   - Percentage-based allocation (50% to Project A)
   - Visual weekly allocation heatmap
   - Overallocation detection (sum > 100%)

2. **Conflict Detection & Alerts**
   - Detect multiple critical projects competing for same resource
   - Email alerts when overallocation detected
   - Dashboard showing resource health

3. **Integration Framework**
   - **Jira/Tempo:** Pull actual hours logged
   - **BambooHR/Workday:** Pull approved PTO
   - **Google Calendar:** Pull out-of-office events
   - **Variance reporting:** Planned vs Actual

**What We will NOT Build:**
- ❌ Time tracking system (use Jira, Harvest, Toggl)
- ❌ Leave management (use BambooHR, Workday)
- ❌ Timesheet approvals (use existing HR)
- ❌ Payroll integration (out of scope)
- ❌ Complex optimization AI (Phase 1 = detection only)

**Philosophy:** Integrate with best-in-class tools, add cross-project intelligence layer.

### Strategic Alignment

- [x] **Efficiency Goal:** Reduce resource conflicts by 70%
- [x] **PM Productivity:** Save 10 hours/week per resource manager
- [x] **Project Success:** Improve on-time delivery by 20%
- [x] **Team Wellness:** Prevent burnout from overallocation
- [ ] **Compliance:** Not required (efficiency initiative)

---

## 2. Scope Definition

### ✅ IN SCOPE (Version 2.8-2.9)

See detailed scope document: `docs/roadmap/RESOURCE_ALLOCATION_SCOPE.md`

**Phase 1: Core Tracking (v2.8 - Q1 2027)**
- [ ] Resource allocation data model
- [ ] Percentage-based allocation (0-100%)
- [ ] Allocation creation/editing UI
- [ ] Weekly allocation heatmap
- [ ] Overallocation detection algorithm
- [ ] Email alert system

**Phase 2: Integrations (v2.9 - Q2 2027)**
- [ ] Jira/Tempo integration (actual hours)
- [ ] BambooHR integration (approved PTO)
- [ ] Google Calendar integration (OOO events)
- [ ] Variance reporting (planned vs actual)
- [ ] Webhook support for custom systems

**Phase 3: Dashboards (v2.9 - Q2 2027)**
- [ ] Resource allocation heatmap
- [ ] Utilization trend charts
- [ ] Executive summary dashboard
- [ ] Export to CSV/Excel
- [ ] Mobile-responsive views

### ❌ OUT OF SCOPE (Explicitly Excluded)

**From Scope Document:**
- ❌ Daily timesheet entry
- ❌ Timesheet approval workflows
- ❌ Leave request/approval system
- ❌ PTO accrual tracking
- ❌ Payroll calculation
- ❌ Contractor invoicing
- ❌ AI optimization (future: v3.0+)
- ❌ Skills matrix (future: v3.0+)
- ❌ Mobile app (web only)

**Reason:** Teams already have these tools. We integrate, not replace.

### 🔄 Dependencies

**Requires:**
- ADPA v2.0 (user authentication)
- PostgreSQL database (existing)
- Email system (existing)

**Integrates With:**
- Jira/Tempo (time tracking)
- BambooHR/Workday (HR/PTO)
- Google Calendar (availability)
- Hierarchical PM (CR-2026-003) - cross-level visibility

**Enables:**
- Early conflict detection
- Variance analysis
- Resource optimization (future)

---

## 3. Financial Analysis

### Investment Required

| Category | Cost | Notes |
|----------|------|-------|
| **Development** | **$170K** | |
| - Phase 1 (6 weeks) | $60K | 1 backend, 1 frontend |
| - Phase 2 (6 weeks) | $60K | 1 backend, 1 integration specialist |
| - Phase 3 (4 weeks) | $40K | 1 frontend, 1 designer |
| **Integration APIs** | $5K | Jira, BambooHR, Google (annual) |
| **Infrastructure** | $5K | Minimal - uses existing ADPA |
| **Training & Docs** | $10K | User guides, training sessions |
| **User Research** | $10K | Interviews with resource managers |
| **Total Investment** | **$200K** | |

### Expected Returns (Annual)

| Benefit | Annual Value | Calculation Method |
|---------|--------------|-------------------|
| **Conflict reduction** | $120K-$250K | 40% less delays × 50 projects × $6K avg delay cost |
| **PM time savings** | $80K-$150K | 5 resource managers × 10 hours/week × $100/hour |
| **Emergency scrambling** | $40K-$80K | 60% less urgent rehires/contractors |
| **Burnout prevention** | $60K-$120K | Reduced turnover, sick days, productivity loss |
| **Project acceleration** | $100K-$200K | 15% of projects complete faster |
| **Total Annual Value** | **$400K-$800K** | |

### ROI Calculation

- **Payback Period:** 3-6 months (fastest of all CRs!)
- **Year 1 ROI:** 100-300%
- **3-Year ROI:** 150-300%
- **5-Year ROI:** 300-500%
- **Net Present Value (NPV, 10% discount):** $900K-$1.8M

**Conservative Scenario:** Even with 50% of projected value = $200K/year = 100% 3-year ROI

**Why Lower Cost Than Others:**
- Simpler scope (integration vs build)
- Faster development (5 months vs 7-12)
- Smaller team (2-3 vs 5-8)
- Leverage existing tools (no complex features)

---

## 4. Implementation Plan

### Timeline (5 months)

| Phase | Duration | Deliverables | Budget |
|-------|----------|--------------|--------|
| **Phase 1** | 6 weeks | Core allocation, detection, alerts | $70K |
| **Phase 2** | 6 weeks | Integrations (Jira, BambooHR, Calendar) | $70K |
| **Phase 3** | 4 weeks | Dashboards, reporting, polish | $50K |
| **Buffer** | 4 weeks | UAT, refinement, training | $10K |

### Resource Requirements

| Role | Allocation | Duration | Cost |
|------|------------|----------|------|
| Senior Backend Developer | 60% | 4 months | $80K |
| Frontend Developer | 80% | 3 months | $60K |
| Integration Specialist | 40% | 2 months | $24K |
| UX Designer | 25% | 1 month | $5K |
| Product Manager | 20% | 5 months | $20K |
| QA Engineer | 50% | 1 month | $13K |

### Key Milestones

- [ ] **Week 6:** Basic allocation working with 3 test teams
- [ ] **Week 12:** Jira integration pulling actual hours
- [ ] **Week 16:** Full dashboard with all integrations
- [ ] **Week 20:** Organization-wide deployment

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Integration APIs change** | Medium | Medium | Abstraction layer, monitor API versions, fallback options |
| **Low adoption (too simple?)** | Low | Medium | Show value early, executive mandate, weekly demos |
| **False positives** | Medium | Low | Tune thresholds, allow snoozing alerts, user feedback |
| **Data quality (wrong %)** | High | Medium | Validation rules, weekly audits, manager reviews |
| **Integration complexity** | Low | Low | Start with Jira only, add others incrementally |

### Contingency Plan

- **Budget Buffer:** $10K (5%) for UAT
- **Schedule Buffer:** 4 weeks for integration testing
- **Rollback Plan:** Phase 1 delivers value standalone
- **Success Criteria:** 70% usage by Week 12 - if not, assess barriers

---

## 6. Success Metrics

### Adoption Metrics (Month 3)
- **Target:** 70% of active projects using allocation tracking
- **Target:** 80% of resource managers check dashboard weekly
- **Target:** 50% of teams have at least 1 integration enabled

### Business Impact Metrics (Month 6)
- **Conflict detection:** 2+ weeks earlier than before
- **Resource conflicts:** 40% reduction
- **Emergency reshuffling:** 60% reduction
- **PM time saved:** 5-10 hours/week per resource manager

### Technical Metrics
- **Dashboard load:** < 2 seconds for 100 resources
- **Detection speed:** < 5 seconds for 1000 allocations
- **Uptime:** 99.5%
- **Integration sync:** < 1 hour lag

---

## 7. Stakeholder Impact

| Stakeholder Group | Impact | Benefit | Change Required |
|-------------------|--------|---------|-----------------|
| **Resource Managers** | High | Automated tracking, early warnings | Use system daily (30 min/day) |
| **Project Managers** | Medium | Resource visibility | Update allocations weekly (15 min) |
| **Team Members** | Low | Better workload balance | None - PMs handle updates |
| **Executives** | Low | Portfolio resource health | Review monthly reports |
| **IT** | Low | Support integrations | Minimal - API setup only |

### Communication Plan

**Month 1:**
- Resource manager workshops
- PM training on allocation updates
- IT integration setup

**Month 3:**
- Success stories from pilot teams
- Expand to more teams

**Month 5:**
- Organization-wide deployment
- Executive dashboard training

**Ongoing:**
- Weekly overallocation alerts
- Monthly resource health reports

---

## 8. Alternatives Considered

### Option 1: Integration-first approach (Recommended)
**Pros:** Fast, low cost, works with existing tools  
**Cons:** Depends on external APIs  
**Cost:** $200K over 5 months  
**ROI:** 150-300% (3-year)

### Option 2: Build full resource management system
**Pros:** Full control, all features  
**Cons:** $1M+ cost, 18 months, duplicate entry  
**Cost:** $1M-$2M over 18 months  
**ROI:** 100-150% (3-year, much slower)

### Option 3: Buy resource management software (Smartsheet, Float)
**Pros:** Mature product  
**Cons:** $50K-$100K/year, doesn't integrate with ADPA, limited customization  
**Cost:** $150K-$300K over 3 years  
**ROI:** 50-100% (3-year)

### Option 4: Continue with spreadsheets
**Pros:** No investment  
**Cons:** Manual, error-prone, doesn't scale  
**Cost:** $150K/year in PM time  
**ROI:** Negative (ongoing cost)

**Recommendation:** **Option 1** - Fast, pragmatic, integrates with existing, best ROI

---

## 9. Decision Required

### Approval Requested

Please approve:
- [ ] **Budget allocation:** $200K from Operational Excellence Fund
- [ ] **Team allocation:** As specified in section 4
- [ ] **Timeline:** 5-month development, start Q1 2027
- [ ] **Success criteria:** As specified in section 6

### Conditions

- Start after or concurrent with CR-2026-003 (Hierarchical PM)
- Pilot with 3 teams using different time-tracking tools
- Go/No-Go after Phase 1 if adoption < 50%
- Prioritize Jira integration (most common tool)

---

## 10. Sign-Off

**Prepared By:**
- Name: ADPA Product Team
- Role: Product Manager
- Date: October 15, 2024

**Reviewed By:**

| Reviewer | Role | Recommendation | Date | Signature |
|----------|------|----------------|------|-----------|
| | VP Operations | ☐ Approve ☐ Defer ☐ Reject | | |
| | CTO | ☐ Approve ☐ Defer ☐ Reject | | |
| | CFO | ☐ Approve ☐ Defer ☐ Reject | | |
| | HR Director | ☐ Approve ☐ Defer ☐ Reject | | |

**Final Decision:**
- Sponsor: _________________
- Decision: ☐ Approved ☐ Rejected ☐ Deferred
- Date: _________________
- Signature: _________________

**Conditions of Approval:**
- (To be completed upon sponsor review)

---

## Appendix

### A. Detailed Scope Document
See: `docs/roadmap/RESOURCE_ALLOCATION_SCOPE.md` for complete IN/OUT scope

### B. Integration Flow Example

```
┌─────────────────────────────────────────────────────────┐
│ ADPA Resource Allocation Intelligence                  │
│ (Lightweight cross-project visibility layer)           │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │   Jira   │ │ BambooHR │ │  Google  │
  │  Tempo   │ │ Workday  │ │ Calendar │
  └──────────┘ └──────────┘ └──────────┘
     (time)      (PTO)       (OOO)

Flow:
1. PM assigns: "Sarah 60% to Project Alpha" (in ADPA)
2. ADPA checks all projects: Sarah at 175% total (ALERT!)
3. ADPA syncs with Jira: Sarah logged 15h (expected 24h)
4. ADPA checks BambooHR: Sarah has PTO next week
5. ADPA generates alert: "Overallocation + PTO conflict"
6. Resource Manager receives email, resolves conflict
```

### C. Sample Alert Email

```
Subject: 🚨 Resource Overallocation: Sarah Chen (175%)

Hi Resource Manager,

Sarah Chen is currently overallocated:

Current Allocations:
├─ Project Alpha:   60% (Critical)
├─ Project Beta:    50% (High)
├─ Project Gamma:   40% (Medium)
└─ BAU Support:     25% (Low)
─────────────────────────
Total:             175% (75% over capacity)

Upcoming Conflicts:
⚠️ PTO scheduled: Feb 10-14 (5 days)
⚠️ All 3 projects have critical milestones in Feb

Recommended Actions:
1. Remove BAU Support (25%) → reduces to 150%
2. Reduce Project Gamma to 15% → reduces to 135%
3. Delay Project Gamma start by 2 weeks
4. Consider hiring contractor for Project Beta

Review in ADPA: [Link to Dashboard]
Contact Sarah's manager: John Smith

---
ADPA Resource Intelligence
Weekly Scan: Feb 3, 2027
```

### D. Dashboard Mockup

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resource Allocation Dashboard - Week of Feb 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overview:
├─ Total Resources: 45
├─ Average Utilization: 82%
├─ Overallocated: 3 (🚨)
├─ Conflicts: 2
└─ On PTO: 4

Heatmap (this week):
Resource          Mon Tue Wed Thu Fri  Total
────────────────────────────────────────────
Sarah Chen        ███ ███ ███ ███ ███  175% 🚨
Mike Thompson     ███ ███ ███ ███ ███   95% ✅
Lisa Wang         ██░ ██░ ██░ ██░ ██░   65% ⚠️ 
John Smith        ███ ███ ███ ███ ███  110% ⚠️ 

Legend: ███ >100%  ██░ 50-85%  ░░░ <50%

Critical Alerts:
🚨 Sarah Chen: 175% allocated + PTO next week
⚠️ John Smith: 110% allocated across 2 critical projects

[View Full Report] [Export Data] [Alert Settings]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### E. Pilot Team Candidates
1. Engineering team (uses Jira + BambooHR)
2. Product team (uses Jira + Google Calendar)
3. Operations team (uses MS Project + Workday)

---

**Next Step:** Present to VP Operations and CFO for approval decision by January 15, 2027.

**Note:** This CR represents the **pragmatic, integration-first philosophy**:
- 60% of enterprise resource management benefits
- 10% of the complexity and cost
- Works WITH existing tools, not against them
- Fast to build (5 months), easy to adopt

