# TASK-1131: Portfolio Risk Register Exists and Updated Monthly

**Issue**: #405  
**Task ID**: TASK-1131  
**Status**: 🟡 **PARTIALLY IMPLEMENTED - PORTFOLIO LEVEL MISSING**  
**Priority**: Medium  
**Source**: PMI_COMPLETE_DOMAIN_MAPPING.md  
**Last Updated**: October 29, 2025

---

## Summary

Portfolio risk register system is **partially implemented** at the **project and program levels** but **NOT implemented** at the **portfolio level**. The system has:
- ✅ **Project-level risks** (functional - `risks` table)
- ✅ **Program-level risk aggregation** (functional - aggregates from projects)
- ✅ **Program risk UI** (functional - `ProgramRisksTab` component)
- ❌ **Portfolio-level risk register** (not implemented)
- ❌ **Monthly update tracking** (not implemented)
- ❌ **Portfolio risk aggregation** (not implemented)

**PMI Compliance**: The PMI validation criterion "Portfolio risk register exists and updated monthly" requires a **dedicated portfolio-level risk register** with **monthly update tracking**, which is **NOT YET IMPLEMENTED**.

---

## Current Status

### ✅ **Completed/Implemented** (Project & Program Level - 60% Complete)

1. **Project-Level Risk Management** (✅ Functional):
   - ✅ `risks` table exists (Migration 104)
   - ✅ Risk extraction from documents (AI-powered)
   - ✅ Risk CRUD operations
   - ✅ Risk fields: title, description, category, probability, impact, severity, mitigation, owner, status
   - ✅ Risk deduplication logic

2. **Program-Level Risk Aggregation** (✅ Functional):
   - ✅ `GET /api/programs/:id/risks` endpoint exists
   - ✅ Aggregates risks from all projects in program
   - ✅ Risk transformation and mapping
   - ✅ Risk sorting by severity/probability/impact
   - ✅ `getRiskMetrics()` service function

3. **Program Risk UI** (✅ Functional):
   - ✅ `ProgramRisksTab` component exists
   - ✅ Risk register table view
   - ✅ Risk creation/editing/deletion
   - ✅ Risk filtering (severity, status)
   - ✅ Risk statistics dashboard
   - ✅ Risk severity calculation
   - ⚠️ Uses mock data if API fails (fallback)

### ❌ **Not Implemented** (Portfolio Level - 40% Remaining)

1. **Portfolio-Level Risk Register**:
   - ❌ No `portfolio_risks` table
   - ❌ No portfolio-level risk aggregation
   - ❌ No portfolio risk API endpoints
   - ❌ No portfolio risk UI components
   - ❌ No cross-program risk analysis

2. **Monthly Update Tracking**:
   - ❌ No risk update tracking
   - ❌ No monthly review workflow
   - ❌ No update compliance reporting
   - ❌ No update reminders/alerts
   - ❌ No risk review history

3. **Portfolio Risk Features**:
   - ❌ No systemic risk assessment
   - ❌ No cross-program risk correlation
   - ❌ No portfolio risk heatmap
   - ❌ No portfolio risk thresholds
   - ❌ No portfolio risk escalation paths

---

## PMI Requirement Analysis

### **PMI Domain 4: Portfolio Risk Management**

**Validation Checklist Item**: "Portfolio risk register exists and updated monthly"

**PMI Definition**: 
- Portfolio-level risks should be identified and tracked separately from project/program risks
- Portfolio risks are systemic risks that affect multiple programs or the entire portfolio
- Risk register should be reviewed and updated on a monthly basis
- Update compliance should be tracked and reported

**Required Features**:
1. **Portfolio Risk Register**:
   - Dedicated portfolio-level risk table
   - Portfolio-specific risk categories (strategic, financial, operational)
   - Cross-program risk identification
   - Systemic risk assessment

2. **Monthly Update Tracking**:
   - Track last update date for each risk
   - Track monthly review completion
   - Alert on overdue reviews
   - Report on update compliance

3. **Portfolio Risk Management**:
   - Risk thresholds defined (e.g., >$100k = escalate)
   - Escalation paths documented
   - Risk heatmaps or simulations
   - Mitigation plans tracked to completion

---

## Evidence from Codebase

### 1. Project-Level Risks (✅ EXISTS)

**Database Table**: `risks` (Migration 104)
```sql
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  probability VARCHAR(20) DEFAULT 'medium',
  impact VARCHAR(20) DEFAULT 'medium',
  risk_level VARCHAR(20) DEFAULT 'medium',
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  owner VARCHAR(255),
  status VARCHAR(20) DEFAULT 'identified',
  ...
);
```

**Finding**: Project-level risks are **fully functional**.

### 2. Program-Level Risk Aggregation (✅ EXISTS)

**API Endpoint**: `GET /api/programs/:id/risks` (`server/src/routes/programRoutes.ts`)
- ✅ Aggregates risks from all projects in program
- ✅ Transforms database format to frontend format
- ✅ Sorts by severity/probability/impact
- ✅ Returns program-level risk view

**Service**: `getRiskMetrics()` (`server/src/services/programMetricsService.ts`)
- ✅ Fetches program risks
- ✅ Transforms for metrics dashboard

**UI Component**: `ProgramRisksTab.tsx`
- ✅ Displays program risks
- ✅ CRUD operations
- ✅ Filtering and statistics
- ⚠️ Falls back to mock data if API fails

**Finding**: Program-level risk aggregation is **functional**.

### 3. Portfolio-Level Risks (❌ MISSING)

**Database Tables**: None exist
- ❌ No `portfolio_risks` table
- ❌ No `portfolio_risk_reviews` table
- ❌ No `portfolio_risk_updates` table

**API Endpoints**: None exist
- ❌ No `/api/portfolio/risks` endpoint
- ❌ No `/api/portfolio/:id/risks` endpoint
- ❌ No portfolio risk aggregation

**UI Components**: None exist
- ❌ No portfolio risk register component
- ❌ No portfolio risk dashboard
- ❌ No portfolio risk heatmap

**Finding**: Portfolio-level risk management is **NOT implemented**.

### 4. Monthly Update Tracking (❌ MISSING)

**Database Fields**: None exist
- ❌ No `last_review_date` field in risks table
- ❌ No `monthly_review_status` field
- ❌ No `review_history` tracking

**Workflow**: None exists
- ❌ No monthly review workflow
- ❌ No update reminders
- ❌ No compliance reporting

**Finding**: Monthly update tracking is **NOT implemented**.

### 5. Roadmap References

**`docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md`** (Line 147):
```
| Portfolio risk register | `portfolio_risks` table | Risk aggregation | 📋 Phase 4C | P1 |
```

**Status**: Planned for Phase 4C, **NOT YET IMPLEMENTED**

**`docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md`** (Line 153):
```
- [ ] Portfolio risk register exists and updated monthly
```

**Status**: Validation checklist item, **NOT CHECKED** (not implemented)

**`docs/roadmap/PORTFOLIO_MANAGEMENT_COMPLETE.md`** (Line 224-252):
- Shows planned `portfolio_risks` table schema
- Shows planned `portfolio_risk_summary` view
- **Status**: Designed but **NOT IMPLEMENTED**

---

## Planned Implementation

### Database Schema (Designed, Not Implemented)

Based on PMI requirements and roadmap:

```sql
-- Portfolio Risk Register
CREATE TABLE portfolio_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id), -- If portfolios table exists
  program_id UUID REFERENCES programs(id),      -- Or link to programs
  
  -- Risk Details
  risk_title VARCHAR(255) NOT NULL,
  risk_description TEXT,
  risk_category VARCHAR(100),     -- strategic, financial, operational, technical, systemic
  risk_type VARCHAR(50),          -- portfolio-level, cross-program, systemic
  
  -- Assessment
  probability INTEGER,             -- 1-100
  impact_financial DECIMAL(15,2),  -- Financial impact in dollars
  impact_schedule_days INTEGER,    -- Schedule impact in days
  severity VARCHAR(50),            -- low, medium, high, critical
  
  -- Scope
  affects_programs UUID[],         -- Array of program IDs
  affects_projects UUID[],         -- Array of project IDs
  cross_program BOOLEAN DEFAULT FALSE,
  systemic_risk BOOLEAN DEFAULT FALSE,
  
  -- Response
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50),              -- open, monitoring, mitigating, closed, accepted
  
  -- Monthly Update Tracking
  last_review_date DATE,
  last_updated_date DATE,
  last_updated_by UUID REFERENCES users(id),
  monthly_review_status VARCHAR(50), -- 'pending', 'in-progress', 'completed', 'overdue'
  next_review_due_date DATE,
  
  -- Tracking
  identified_date DATE,
  review_date DATE,
  closed_date DATE,
  
  -- Thresholds & Escalation
  exceeds_threshold BOOLEAN DEFAULT FALSE,
  escalation_path TEXT,
  escalated_to UUID REFERENCES users(id),
  escalation_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio Risk Summary View
CREATE VIEW portfolio_risk_summary AS
SELECT 
  COUNT(*) as total_risks,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_risks,
  COUNT(*) FILTER (WHERE severity = 'high') as high_risks,
  COUNT(*) FILTER (WHERE status = 'open') as open_risks,
  SUM(impact_financial) as total_exposure,
  AVG(probability) as avg_probability,
  COUNT(*) FILTER (WHERE monthly_review_status = 'overdue') as overdue_reviews,
  COUNT(*) FILTER (WHERE last_review_date < NOW() - INTERVAL '1 month') as risks_needing_review
FROM portfolio_risks
WHERE status IN ('open', 'monitoring', 'mitigating');

-- Monthly Review Compliance View
CREATE VIEW portfolio_risk_review_compliance AS
SELECT 
  DATE_TRUNC('month', CURRENT_DATE) as review_month,
  COUNT(*) as total_risks,
  COUNT(*) FILTER (WHERE last_review_date >= DATE_TRUNC('month', CURRENT_DATE)) as reviewed_this_month,
  COUNT(*) FILTER (WHERE last_review_date < DATE_TRUNC('month', CURRENT_DATE)) as not_reviewed_this_month,
  ROUND(
    COUNT(*) FILTER (WHERE last_review_date >= DATE_TRUNC('month', CURRENT_DATE))::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as compliance_percentage
FROM portfolio_risks
WHERE status IN ('open', 'monitoring', 'mitigating');
```

### API Endpoints (Designed, Not Implemented)

```
GET    /api/portfolio/risks                    # List all portfolio risks
GET    /api/portfolio/risks/summary            # Get risk summary
POST   /api/portfolio/risks                    # Create portfolio risk
GET    /api/portfolio/risks/:id                 # Get risk details
PUT    /api/portfolio/risks/:id                 # Update risk
DELETE /api/portfolio/risks/:id                # Delete risk
GET    /api/portfolio/risks/compliance          # Get monthly review compliance
POST   /api/portfolio/risks/:id/review         # Record monthly review
GET    /api/portfolio/risks/overdue-reviews     # Get overdue reviews
GET    /api/portfolio/risks/heatmap             # Get risk heatmap data
```

### UI Pages (Designed, Not Implemented)

```
/portfolio/risks
  ├─ Portfolio Risk Register (table view)
  ├─ Risk Heat Map (probability × impact)
  ├─ Monthly Review Dashboard
  ├─ Compliance Report
  ├─ Risk Trend Chart
  └─ Cross-Program Risk Analysis

/portfolio/risks/:id
  ├─ Risk Details
  ├─ Review History
  ├─ Mitigation Tracking
  └─ Escalation Path
```

---

## Acceptance Criteria Status

### ⚠️ Task Implementation Partially Complete

**Project & Program Level** (✅ Complete):
- [x] Project risk register functional
- [x] Program risk aggregation functional
- [x] Program risk UI functional
- [x] Risk CRUD operations working

**Portfolio Level** (❌ Not Complete):
- [ ] Portfolio risk register exists
- [ ] Portfolio risk register updated monthly
- [ ] Monthly update tracking functional
- [ ] Portfolio risk aggregation working
- [ ] Portfolio risk UI implemented
- [ ] Risk thresholds defined
- [ ] Escalation paths documented
- [ ] Risk heatmaps implemented
- [ ] Mitigation plans tracked

### ❌ Tests Written and Passing
- [ ] Unit tests for portfolio risk service
- [ ] Integration tests for portfolio risk API endpoints
- [ ] E2E tests for portfolio risk workflow
- [ ] Tests for monthly review compliance

### ✅ Documentation Updated
- [x] Design documentation exists (roadmap references)
- [x] PMI requirement documented
- [x] Status document created (this document)
- [ ] User guide for portfolio risk management (not created)
- [ ] API documentation (not created)

### ❌ Code Reviewed and Approved
- [ ] Implementation code reviewed (not implemented)
- [ ] Database schema reviewed (not implemented)
- [ ] API design reviewed (not implemented)

---

## Implementation Timeline

According to `PMI_COMPLETE_DOMAIN_MAPPING.md`:

**Phase 4C: Portfolio Risk** (Week 5)
- [ ] Portfolio risk register
- [ ] Risk aggregation
- [ ] Risk heatmap
- [ ] Mitigation tracking

**Status**: Not yet started (planned for Phase 4C / Week 5)

---

## PMI Validation Criterion Assessment

**Criterion**: "Portfolio risk register exists and updated monthly"

**Current Status**: ❌ **NON-COMPLIANT**

**What Exists**:
- ✅ Project-level risks (functional)
- ✅ Program-level risk aggregation (functional)
- ✅ Program risk UI (functional)

**What's Missing** (Required for PMI Compliance):
- ❌ Portfolio-level risk register
- ❌ Portfolio risk aggregation
- ❌ Monthly update tracking
- ❌ Monthly review workflow
- ❌ Update compliance reporting
- ❌ Risk thresholds defined
- ❌ Escalation paths documented
- ❌ Risk heatmaps
- ❌ Systemic risk assessment

**PMI Compliance Score**: **0%** (No portfolio-level risk register exists)

---

## Recommendation

### Current Status: 🟡 **PARTIALLY IMPLEMENTED - PORTFOLIO LEVEL MISSING**

**Action Required**:
1. **Do NOT close issue #405** - Portfolio-level implementation not complete
2. **Update task status** to "In Progress" when implementation begins
3. **Follow implementation plan** in roadmap (Phase 4C / Week 5)
4. **Start with portfolio risk register foundation** (database schema + basic API)

### Next Steps to Complete

1. **Database Implementation**:
   - Create migrations for `portfolio_risks` table
   - Add monthly review tracking fields
   - Create compliance views
   - Add indexes and constraints

2. **Backend Implementation**:
   - Create portfolio risk service (`portfolioRiskService.ts`)
   - Implement API routes (`portfolioRiskRoutes.ts`)
   - Add monthly review workflow
   - Add compliance calculation
   - Add risk aggregation logic

3. **Frontend Implementation**:
   - Create portfolio risk register component
   - Create monthly review dashboard
   - Create risk heatmap component
   - Create compliance report view

4. **Testing**:
   - Write unit tests
   - Write integration tests
   - Write E2E tests

5. **Documentation**:
   - Update user guide
   - Create API documentation
   - Update completion status

---

## Related Documentation

- **Roadmap**: `docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md`
- **Portfolio Management**: `docs/roadmap/PORTFOLIO_MANAGEMENT_COMPLETE.md`
- **Program Risks**: `components/program/ProgramRisksTab.tsx`
- **Program Routes**: `server/src/routes/programRoutes.ts`

---

## Conclusion

**Task Status**: 🟡 **PARTIALLY IMPLEMENTED - PORTFOLIO LEVEL MISSING**

The portfolio risk register system is **partially functional** at the **project and program levels** but **NOT implemented** at the **portfolio level** required for PMI compliance. The system is approximately **60% complete** (project/program level implementation) with **40% remaining** (portfolio level implementation + monthly update tracking).

**Recommendation**: 
- Keep issue #405 **OPEN** until portfolio-level implementation is complete
- Project/program risk management can be used, but does NOT satisfy PMI validation criterion
- Priority: Implement portfolio-level risk register (Phase 4C / Week 5 per roadmap)

---

**Last Updated**: October 29, 2025  
**Status**: 🟡 **PARTIALLY IMPLEMENTED - PORTFOLIO LEVEL MISSING**

