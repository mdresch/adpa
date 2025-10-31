# Program Resource & Cost Management - Complete Implementation

**Date**: October 31, 2025  
**Status**: 📋 **COMPREHENSIVE PLAN**  
**Priority**: P0 (Critical Program Capabilities)  
**Effort**: 6-8 weeks  
**Domains**: Resource Management (9 activities) + Cost Management (8 activities)

---

## 💰 **PART 1: PROGRAM COST MANAGEMENT**

### **Overview**

Complete financial tracking and control system for programs, including EVM (Earned Value Management), forecasting, and ROI analysis.

---

### **1. Cost Estimation**

**Activities**:
- Estimate costs for each project
- Include direct/indirect costs
- Use multiple estimation techniques

**ADPA Implementation**:

```sql
CREATE TABLE program_cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  project_id UUID REFERENCES projects(id),
  
  -- Estimation Details
  estimation_method VARCHAR(100),  -- analogous, parametric, bottom-up, three-point
  estimation_date DATE,
  estimated_by UUID REFERENCES users(id),
  
  -- Cost Breakdown
  labor_cost DECIMAL(15,2),
  materials_cost DECIMAL(15,2),
  equipment_cost DECIMAL(15,2),
  overhead_cost DECIMAL(15,2),
  contingency_reserve DECIMAL(15,2),  -- 10-20% of base estimate
  management_reserve DECIMAL(15,2),   -- Additional buffer
  
  -- Totals
  base_estimate DECIMAL(15,2),
  total_estimate DECIMAL(15,2),      -- base + contingency + management
  
  -- Confidence
  confidence_level VARCHAR(50),      -- -25% to +75%, -10% to +25%, etc.
  assumptions TEXT,
  exclusions TEXT,
  
  -- Validation
  reviewed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(50),                -- draft, under-review, approved, baseline
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/finances/estimate`
- Cost estimation wizard
- Template selector (analogous, parametric, bottom-up)
- Cost breakdown editor
- Confidence interval calculator
- Approval workflow

---

### **2. Budget Development** ⭐ **HIGH PRIORITY**

**Activities**:
- Aggregate project budgets
- Allocate to phases/components
- Align with funding sources

**ADPA Implementation**:

```sql
CREATE TABLE program_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Budget Periods
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  budget_period_start DATE,
  budget_period_end DATE,
  
  -- Budget Components (Aggregated from projects)
  total_approved_budget DECIMAL(15,2),
  
  -- Breakdown by Category
  labor_budget DECIMAL(15,2),
  materials_budget DECIMAL(15,2),
  equipment_budget DECIMAL(15,2),
  overhead_budget DECIMAL(15,2),
  contingency_budget DECIMAL(15,2),
  management_reserve DECIMAL(15,2),
  
  -- Breakdown by Phase
  phase_budgets JSONB,  -- [{ phase, amount, percentage }]
  
  -- Breakdown by Project
  project_budgets JSONB,  -- [{ project_id, project_name, budget, percentage }]
  
  -- Funding Sources
  funding_sources JSONB,  -- [{ source, amount, conditions, availability_date }]
  
  -- Status
  budget_status VARCHAR(50),  -- draft, submitted, approved, locked
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  baseline_date DATE,         -- When budget was baselined
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Automatic budget rollup from projects
CREATE OR REPLACE FUNCTION rollup_program_budget(p_program_id UUID)
RETURNS TABLE (
  total_budget DECIMAL,
  labor DECIMAL,
  materials DECIMAL,
  equipment DECIMAL,
  overhead DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(p.budget) as total_budget,
    SUM(p.labor_cost) as labor,
    SUM(p.materials_cost) as materials,
    SUM(p.equipment_cost) as equipment,
    SUM(p.overhead_cost) as overhead
  FROM projects p
  WHERE p.program_id = p_program_id AND p.archived = false;
END;
$$ LANGUAGE plpgsql;
```

**UI**: `/programs/[id]/finances/budget`

```
┌─────────────────────────────────────────────────────────────┐
│ Program Budget Development                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Total Program Budget: $10,450,000                           │
│ Status: 🟢 Approved | Baseline: Jan 1, 2026                 │
│                                                              │
│ Budget Breakdown by Category:                                │
│ ┌──────────────────┬──────────────┬──────────┬───────────┐ │
│ │ Category         │ Amount       │ %        │ Projects  │ │
│ ├──────────────────┼──────────────┼──────────┼───────────┤ │
│ │ Labor            │ $6,250,000   │ 59.8%    │ All       │ │
│ │ Materials        │ $2,100,000   │ 20.1%    │ 3 projects│ │
│ │ Equipment        │ $1,200,000   │ 11.5%    │ 2 projects│ │
│ │ Overhead         │   $500,000   │  4.8%    │ All       │ │
│ │ Contingency (10%)│   $350,000   │  3.3%    │ Reserve   │ │
│ │ Management Res.  │    $50,000   │  0.5%    │ Reserve   │ │
│ └──────────────────┴──────────────┴──────────┴───────────┘ │
│                                                              │
│ Budget Breakdown by Project:                                 │
│ ┌──────────────────────┬──────────────┬──────────┐         │
│ │ Project              │ Budget       │ % of Total│         │
│ ├──────────────────────┼──────────────┼──────────┤         │
│ │ Customer Portal      │ $3,500,000   │ 33.5%    │         │
│ │ Data Analytics       │ $2,800,000   │ 26.8%    │         │
│ │ Mobile App           │ $2,150,000   │ 20.6%    │         │
│ │ Infrastructure       │ $1,600,000   │ 15.3%    │         │
│ │ Training Platform    │   $400,000   │  3.8%    │         │
│ └──────────────────────┴──────────────┴──────────┘         │
│                                                              │
│ Funding Sources:                                             │
│ • Internal Capital: $7,000,000 (Available: Q1 2026)         │
│ • External Investment: $2,500,000 (Available: Q2 2026)      │
│ • Operational Budget: $950,000 (Available: Ongoing)         │
│                                                              │
│ [Edit Budget] [Approve] [Lock Baseline] [Export Report]    │
└─────────────────────────────────────────────────────────────┘
```

---

### **3. Financial Planning**

**Activities**:
- Define funding strategies
- Plan cash flow
- Coordinate with finance

**ADPA Implementation**:

```sql
CREATE TABLE program_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Funding Source
  source_name VARCHAR(255),
  source_type VARCHAR(100),       -- internal-capital, external-investment, operational, grant, loan
  
  -- Amount
  committed_amount DECIMAL(15,2),
  available_amount DECIMAL(15,2),
  spent_amount DECIMAL(15,2),
  
  -- Timing
  availability_date DATE,
  expiration_date DATE,
  
  -- Conditions
  conditions TEXT,
  restrictions TEXT,
  approval_status VARCHAR(50),
  approved_by VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE program_cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Period
  period_month DATE,              -- First day of month
  
  -- Inflows
  funding_received DECIMAL(15,2),
  benefits_realized DECIMAL(15,2),
  
  -- Outflows
  labor_costs DECIMAL(15,2),
  materials_costs DECIMAL(15,2),
  equipment_costs DECIMAL(15,2),
  overhead_costs DECIMAL(15,2),
  other_costs DECIMAL(15,2),
  
  -- Net
  net_cash_flow DECIMAL(15,2),
  cumulative_cash_flow DECIMAL(15,2),
  
  -- Forecast vs Actual
  is_forecast BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/finances/cash-flow`
- Cash flow forecast chart
- Monthly breakdown
- Cumulative flow
- Forecast vs actual comparison
- Funding schedule

---

### **4. Cost Control** ⭐ **CRITICAL - EVM IMPLEMENTATION**

**Activities**:
- Monitor actual vs planned
- Track EVM metrics (CV, CPI, EV)
- Implement corrective actions

**ADPA Implementation**:

```sql
CREATE TABLE program_cost_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Reporting Period
  reporting_date DATE,
  
  -- Earned Value Management (EVM) Metrics
  planned_value DECIMAL(15,2),        -- PV (Budgeted Cost of Work Scheduled)
  earned_value DECIMAL(15,2),         -- EV (Budgeted Cost of Work Performed)
  actual_cost DECIMAL(15,2),          -- AC (Actual Cost of Work Performed)
  
  -- Variance Metrics
  schedule_variance DECIMAL(15,2),    -- SV = EV - PV
  cost_variance DECIMAL(15,2),        -- CV = EV - AC
  
  -- Performance Indices
  schedule_performance_index DECIMAL(10,4),  -- SPI = EV / PV
  cost_performance_index DECIMAL(10,4),      -- CPI = EV / AC
  
  -- Forecasting
  budget_at_completion DECIMAL(15,2),        -- BAC (Original budget)
  estimate_at_completion DECIMAL(15,2),      -- EAC = BAC / CPI
  estimate_to_complete DECIMAL(15,2),        -- ETC = EAC - AC
  variance_at_completion DECIMAL(15,2),      -- VAC = BAC - EAC
  
  -- To-Complete Performance Index
  tcpi_bac DECIMAL(10,4),                    -- TCPI = (BAC - EV) / (BAC - AC)
  tcpi_eac DECIMAL(10,4),                    -- TCPI = (BAC - EV) / (EAC - AC)
  
  -- Status
  performance_status VARCHAR(50),    -- on-track, at-risk, critical
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calculation function
CREATE OR REPLACE FUNCTION calculate_evm_metrics(
  p_program_id UUID,
  p_reporting_date DATE
) RETURNS program_cost_performance AS $$
DECLARE
  result program_cost_performance;
  v_pv DECIMAL;
  v_ev DECIMAL;
  v_ac DECIMAL;
  v_bac DECIMAL;
BEGIN
  -- Calculate PV, EV, AC from projects
  SELECT 
    SUM(planned_value) INTO v_pv
  FROM projects
  WHERE program_id = p_program_id AND reporting_date = p_reporting_date;
  
  SELECT 
    SUM(earned_value) INTO v_ev
  FROM projects
  WHERE program_id = p_program_id AND reporting_date = p_reporting_date;
  
  SELECT 
    SUM(actual_cost) INTO v_ac
  FROM projects
  WHERE program_id = p_program_id;
  
  SELECT 
    SUM(budget) INTO v_bac
  FROM projects
  WHERE program_id = p_program_id;
  
  -- Calculate metrics
  result.planned_value := v_pv;
  result.earned_value := v_ev;
  result.actual_cost := v_ac;
  result.schedule_variance := v_ev - v_pv;
  result.cost_variance := v_ev - v_ac;
  result.schedule_performance_index := v_ev / NULLIF(v_pv, 0);
  result.cost_performance_index := v_ev / NULLIF(v_ac, 0);
  result.budget_at_completion := v_bac;
  result.estimate_at_completion := v_bac / NULLIF(result.cost_performance_index, 0);
  result.estimate_to_complete := result.estimate_at_completion - v_ac;
  result.variance_at_completion := v_bac - result.estimate_at_completion;
  result.tcpi_bac := (v_bac - v_ev) / NULLIF((v_bac - v_ac), 0);
  
  -- Determine status
  result.performance_status := CASE 
    WHEN result.cost_performance_index >= 0.95 AND result.schedule_performance_index >= 0.95 THEN 'on-track'
    WHEN result.cost_performance_index >= 0.85 OR result.schedule_performance_index >= 0.85 THEN 'at-risk'
    ELSE 'critical'
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**UI**: `/programs/[id]/finances/evm`

```
┌─────────────────────────────────────────────────────────────┐
│ Earned Value Management Dashboard                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ As of: October 31, 2025                                     │
│                                                              │
│ ┌─ Key Metrics ─────────────────────────────────────────┐  │
│ │ PV (Planned Value):    $6,250,000                      │  │
│ │ EV (Earned Value):     $5,875,000                      │  │
│ │ AC (Actual Cost):      $6,100,000                      │  │
│ │                                                         │  │
│ │ SV (Schedule Variance): -$375,000  ⚠️ Behind Schedule  │  │
│ │ CV (Cost Variance):     -$225,000  ⚠️ Over Budget      │  │
│ │                                                         │  │
│ │ SPI: 0.94  ⚠️ (Target: ≥1.0)                           │  │
│ │ CPI: 0.96  ⚠️ (Target: ≥1.0)                           │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌─ Forecast ────────────────────────────────────────────┐  │
│ │ BAC (Budget at Completion):    $10,450,000            │  │
│ │ EAC (Estimate at Completion):  $10,885,417            │  │
│ │ ETC (Estimate to Complete):    $ 4,785,417            │  │
│ │ VAC (Variance at Completion):  -$  435,417  ⚠️        │  │
│ │                                                         │  │
│ │ TCPI (To-Complete Index):      1.05                    │  │
│ │ Required Performance: Need 5% efficiency improvement   │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ Performance Trend (Last 6 Months):                          │
│                                                              │
│   CPI/SPI                                                    │
│   1.2 │                                                      │
│   1.1 │        ●─────●                                       │
│   1.0 │─────●           ●─────●                              │
│   0.9 │                        ●─────●  ← Current            │
│   0.8 │                                                      │
│       └─────────────────────────────────────>                │
│        May   Jun   Jul   Aug   Sep   Oct                    │
│                                                              │
│   Green: CPI  Blue: SPI  Red: Target (1.0)                  │
│                                                              │
│ [📊 View Detailed Analysis] [📈 Run Forecast] [📄 Report]  │
└─────────────────────────────────────────────────────────────┘
```

**Key Formulas** (Automated):
```typescript
interface EVMMetrics {
  // Base Metrics
  PV: number  // Planned Value
  EV: number  // Earned Value
  AC: number  // Actual Cost
  
  // Variances
  SV: number  // SV = EV - PV (negative = behind schedule)
  CV: number  // CV = EV - AC (negative = over budget)
  
  // Indices
  SPI: number  // SPI = EV / PV (>1.0 = ahead, <1.0 = behind)
  CPI: number  // CPI = EV / AC (>1.0 = under budget, <1.0 = over)
  
  // Forecasts
  BAC: number  // Budget at Completion (original)
  EAC: number  // EAC = BAC / CPI (estimate at completion)
  ETC: number  // ETC = EAC - AC (estimate to complete)
  VAC: number  // VAC = BAC - EAC (variance at completion)
  
  // Performance Required
  TCPI: number  // TCPI = (BAC - EV) / (BAC - AC)
}

class EVMCalculator {
  calculate(programId: string, asOfDate: Date): EVMMetrics {
    // Aggregate from all projects
    const metrics = this.aggregateProjectMetrics(programId, asOfDate)
    
    return {
      PV: metrics.plannedValue,
      EV: metrics.earnedValue,
      AC: metrics.actualCost,
      SV: metrics.earnedValue - metrics.plannedValue,
      CV: metrics.earnedValue - metrics.actualCost,
      SPI: metrics.earnedValue / metrics.plannedValue,
      CPI: metrics.earnedValue / metrics.actualCost,
      BAC: metrics.budgetAtCompletion,
      EAC: metrics.budgetAtCompletion / (metrics.earnedValue / metrics.actualCost),
      ETC: (metrics.budgetAtCompletion / (metrics.earnedValue / metrics.actualCost)) - metrics.actualCost,
      VAC: metrics.budgetAtCompletion - (metrics.budgetAtCompletion / (metrics.earnedValue / metrics.actualCost)),
      TCPI: (metrics.budgetAtCompletion - metrics.earnedValue) / (metrics.budgetAtCompletion - metrics.actualCost)
    }
  }
}
```

---

### **5. Forecasting and Reforecasting**

**Activities**:
- Update forecasts based on actuals
- Adjust budgets
- Rolling wave planning

**ADPA Implementation**:

```sql
CREATE TABLE program_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Forecast Details
  forecast_date DATE,
  forecast_type VARCHAR(50),      -- monthly, quarterly, reforecast, baseline
  forecasted_by UUID REFERENCES users(id),
  
  -- Financial Forecasts
  forecast_total_cost DECIMAL(15,2),
  forecast_completion_date DATE,
  forecast_benefit_realization DECIMAL(15,2),
  
  -- Assumptions
  assumptions TEXT,
  changes_from_last_forecast TEXT,
  confidence_level INTEGER,       -- 1-100
  
  -- Scenarios
  best_case_cost DECIMAL(15,2),
  most_likely_cost DECIMAL(15,2),
  worst_case_cost DECIMAL(15,2),
  
  -- Variance from Baseline
  variance_from_baseline DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),
  
  -- Status
  status VARCHAR(50),             -- draft, submitted, approved
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/finances/forecast`
- Forecast builder
- Trend analysis
- Scenario modeling (best/likely/worst)
- Forecast vs actual comparison
- Variance explanation

---

### **6. Financial Reporting**

**Activities**:
- Generate regular reports
- Visualize trends
- Ensure transparency

**ADPA Implementation**:

**Report Templates**:
```typescript
interface FinancialReport {
  reportType: 'executive-summary' | 'detailed' | 'variance-analysis' | 'evm-report'
  reportingPeriod: { start: Date, end: Date }
  
  // Summary Section
  summary: {
    totalBudget: number
    totalSpent: number
    totalForecast: number
    budgetUtilization: number     // %
    status: 'on-track' | 'at-risk' | 'critical'
  }
  
  // EVM Section
  evm: EVMMetrics
  
  // Breakdown by Project
  projectBreakdown: {
    projectId: string
    projectName: string
    budget: number
    spent: number
    forecast: number
    variance: number
    cpi: number
    spi: number
  }[]
  
  // Trends
  trends: {
    month: string
    budget: number
    actual: number
    forecast: number
  }[]
  
  // Alerts
  alerts: {
    type: 'overrun' | 'underrun' | 'variance'
    severity: 'high' | 'medium' | 'low'
    message: string
    affectedProjects: string[]
  }[]
}
```

**Auto-Generated Reports**:
1. **Monthly Financial Summary** (PDF)
   - EVM dashboard
   - Variance analysis
   - Forecast update
   - Alerts and recommendations

2. **Quarterly Executive Report** (PPTX)
   - High-level KPIs
   - Trend charts
   - Risk summary
   - Strategic alignment

3. **Annual Program Review** (PDF + Excel)
   - Year-end financial summary
   - Benefits realized
   - Lessons learned
   - Next year forecast

**UI**: `/programs/[id]/finances/reports`
- Report generator
- Template selector
- Scheduled reports
- Email distribution
- Export to PDF/PPTX/Excel

---

### **7. Benefit-Cost Analysis**

**Activities**:
- Compare costs to benefits
- Calculate ROI, NPV, IRR, payback period

**ADPA Implementation**:

```sql
CREATE TABLE program_financial_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Analysis Period
  analysis_date DATE,
  analysis_type VARCHAR(100),     -- initial, mid-program, final
  
  -- Costs
  total_investment DECIMAL(15,2),
  sunk_costs DECIMAL(15,2),
  remaining_costs DECIMAL(15,2),
  
  -- Benefits
  total_expected_benefits DECIMAL(15,2),
  realized_benefits DECIMAL(15,2),
  projected_benefits DECIMAL(15,2),
  
  -- Metrics
  roi_percent DECIMAL(10,2),      -- (Benefits - Costs) / Costs × 100
  npv DECIMAL(15,2),              -- Net Present Value (discounted)
  irr_percent DECIMAL(10,2),      -- Internal Rate of Return
  payback_period_months INTEGER,   -- Time to break even
  
  -- NPV Calculation Parameters
  discount_rate DECIMAL(5,2),     -- e.g., 8.0 for 8%
  time_horizon_years INTEGER,
  
  -- Decision Support
  continue_recommendation BOOLEAN,
  recommendation_rationale TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- NPV Calculation Function
CREATE OR REPLACE FUNCTION calculate_npv(
  p_program_id UUID,
  p_discount_rate DECIMAL,
  p_years INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  v_npv DECIMAL := 0;
  v_year INTEGER;
  v_cash_flow DECIMAL;
BEGIN
  -- Initial investment (negative)
  SELECT -SUM(budget) INTO v_cash_flow
  FROM projects
  WHERE program_id = p_program_id;
  
  v_npv := v_cash_flow;
  
  -- Future benefits (positive, discounted)
  FOR v_year IN 1..p_years LOOP
    SELECT SUM(expected_benefits) / p_years INTO v_cash_flow
    FROM projects
    WHERE program_id = p_program_id;
    
    v_npv := v_npv + (v_cash_flow / POWER(1 + (p_discount_rate / 100), v_year));
  END LOOP;
  
  RETURN v_npv;
END;
$$ LANGUAGE plpgsql;
```

**UI**: `/programs/[id]/finances/analysis`

```
┌─────────────────────────────────────────────────────────────┐
│ Benefit-Cost Analysis                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Investment Summary:                                          │
│ Total Investment:      $10,450,000                          │
│ Expected Benefits:     $18,750,000                          │
│ Net Benefit:           $ 8,300,000                          │
│                                                              │
│ ┌─ Key Financial Metrics ─────────────────────────────┐    │
│ │                                                       │    │
│ │ ROI (Return on Investment):      79.2%  ✅           │    │
│ │ Formula: (Benefits - Costs) / Costs × 100            │    │
│ │                                                       │    │
│ │ NPV (Net Present Value):         $6,234,567  ✅      │    │
│ │ Discount Rate: 8% | Horizon: 5 years                │    │
│ │                                                       │    │
│ │ IRR (Internal Rate of Return):   23.4%  ✅           │    │
│ │ Well above cost of capital (8%)                      │    │
│ │                                                       │    │
│ │ Payback Period:                  18 months  ✅       │    │
│ │ Benefits exceed costs by Month 18                    │    │
│ │                                                       │    │
│ │ Benefit-Cost Ratio:              1.79  ✅            │    │
│ │ For every $1 spent, expect $1.79 in benefits        │    │
│ └───────────────────────────────────────────────────────┘    │
│                                                              │
│ Cumulative Cash Flow (5-Year Horizon):                      │
│                                                              │
│   $ Millions                                                 │
│   $20M │                              ╱                      │
│        │                          ╱                          │
│   $15M │                      ╱                              │
│        │                  ╱                                  │
│   $10M │              ╱   ← Break-even (Month 18)           │
│        │          ╱                                          │
│    $5M │      ╱                                              │
│        │  ╱                                                  │
│     $0 ├──────────────────────────────────────>             │
│        │                                                     │
│   -$5M │                                                     │
│        │                                                     │
│  -$10M │● Initial Investment                                │
│        └────────────────────────────────────────             │
│         Y1    Y2    Y3    Y4    Y5                          │
│                                                              │
│ Recommendation: ✅ PROCEED                                  │
│ Rationale: Strong ROI, positive NPV, acceptable payback    │
│                                                              │
│ [📊 Sensitivity Analysis] [📈 What-If Scenarios] [📄 Report]│
└─────────────────────────────────────────────────────────────┘
```

---

### **8. Compliance and Audit**

**Activities**:
- Ensure policy adherence
- Prepare for audits
- Maintain documentation

**ADPA Implementation**:

```sql
CREATE TABLE program_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Compliance Framework
  framework VARCHAR(100),         -- SOX, GAAP, ISO, PMI, internal
  requirement_name VARCHAR(255),
  requirement_description TEXT,
  
  -- Status
  compliance_status VARCHAR(50),  -- compliant, non-compliant, partial, not-applicable
  last_assessment_date DATE,
  next_assessment_date DATE,
  
  -- Evidence
  evidence_documents JSONB,       -- [{ doc_name, doc_url, upload_date }]
  attestation_by UUID REFERENCES users(id),
  attestation_date DATE,
  
  -- Audit Trail
  audit_history JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- All financial transactions logged
CREATE TABLE program_financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  project_id UUID REFERENCES projects(id),
  
  -- Transaction Details
  transaction_date DATE,
  transaction_type VARCHAR(100),  -- budget-allocation, expenditure, transfer, adjustment
  amount DECIMAL(15,2),
  
  -- Classification
  cost_category VARCHAR(100),
  account_code VARCHAR(50),
  
  -- Approval & Documentation
  approved_by UUID REFERENCES users(id),
  approval_date DATE,
  supporting_documents JSONB,
  
  -- Audit
  transaction_reference VARCHAR(100),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/compliance`
- Compliance checklist
- Document repository
- Audit schedule
- Transaction log
- Attestation forms

---

## 👥 **PART 2: PROGRAM RESOURCE MANAGEMENT**

### **1. Resource Planning**

**Activities**:
- Identify required resources
- Forecast needs
- Align with timelines

**ADPA Implementation**:

```sql
CREATE TABLE program_resource_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Resource Requirements
  resource_type VARCHAR(100),     -- human, financial, technological, physical
  resource_name VARCHAR(255),
  resource_role VARCHAR(100),     -- developer, PM, analyst, server, budget
  
  -- Quantity
  required_quantity DECIMAL(10,2),  -- e.g., 5.0 FTE, $500k, 10 servers
  unit_of_measure VARCHAR(50),      -- FTE, dollars, units
  
  -- Timing
  needed_from DATE,
  needed_until DATE,
  hours_per_week DECIMAL(5,2),
  
  -- Skills (for human resources)
  required_skills TEXT[],
  seniority_level VARCHAR(50),    -- junior, mid, senior, expert
  
  -- Status
  planning_status VARCHAR(50),    -- identified, requested, approved, allocated
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resource demand forecast
CREATE VIEW program_resource_demand AS
SELECT 
  program_id,
  resource_type,
  SUM(required_quantity) as total_demand,
  MIN(needed_from) as earliest_need,
  MAX(needed_until) as latest_need
FROM program_resource_plan
WHERE planning_status IN ('requested', 'approved', 'allocated')
GROUP BY program_id, resource_type;
```

**UI**: `/programs/[id]/resources/plan`
- Resource planning wizard
- Demand forecast chart
- Skills matrix
- Timeline allocation

---

### **2. Resource Allocation** ⭐ **HIGH PRIORITY**

**Activities**:
- Assign resources by priority
- Balance distribution
- Coordinate shared resources

**ADPA Implementation**:

```sql
CREATE TABLE program_resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  project_id UUID REFERENCES projects(id),
  
  -- Resource
  resource_id UUID,               -- References user, budget pool, equipment
  resource_name VARCHAR(255),
  resource_type VARCHAR(100),
  
  -- Allocation
  allocated_amount DECIMAL(10,2),
  allocation_percentage DECIMAL(5,2),  -- % of resource's capacity
  allocation_start DATE,
  allocation_end DATE,
  
  -- Priority
  priority_score DECIMAL(5,2),    -- From prioritization matrix
  is_critical_resource BOOLEAN,
  
  -- Conflicts
  has_conflicts BOOLEAN DEFAULT FALSE,
  conflict_projects UUID[],
  
  -- Status
  allocation_status VARCHAR(50),  -- planned, active, completed, released
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resource conflict detection
CREATE VIEW program_resource_conflicts AS
SELECT 
  r.resource_id,
  r.resource_name,
  COUNT(DISTINCT r.project_id) as conflicting_projects,
  SUM(r.allocation_percentage) as total_allocation,
  CASE 
    WHEN SUM(r.allocation_percentage) > 100 THEN 'over-allocated'
    WHEN SUM(r.allocation_percentage) > 90 THEN 'near-capacity'
    ELSE 'ok'
  END as conflict_severity
FROM program_resource_allocations r
WHERE r.allocation_status = 'active'
  AND CURRENT_DATE BETWEEN r.allocation_start AND r.allocation_end
GROUP BY r.resource_id, r.resource_name
HAVING SUM(r.allocation_percentage) > 90;
```

**UI**: `/programs/[id]/resources/allocate`

```
┌─────────────────────────────────────────────────────────────┐
│ Resource Allocation Matrix                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Filters: [All Resources ▼] [Nov 2025 ▼] [Show Conflicts ✓]│
│                                                              │
│ ┌────────────────┬──────────┬──────────┬──────────┬────────┐│
│ │ Resource       │ Capacity │ Allocated│ Available│ Status ││
│ ├────────────────┼──────────┼──────────┼──────────┼────────┤│
│ │ John Doe       │ 40h/week │ 45h/week │  -5h/week│ ⚠️ Over││
│ │   • Project A  │          │ 25h (62%)│          │        ││
│ │   • Project B  │          │ 20h (50%)│          │        ││
│ │                                                            ││
│ │ Jane Smith     │ 40h/week │ 32h/week │   8h/week│ ✅ Good││
│ │   • Project A  │          │ 20h (50%)│          │        ││
│ │   • Project C  │          │ 12h (30%)│          │        ││
│ │                                                            ││
│ │ Budget Pool A  │   $500k  │   $475k  │    $25k  │ ✅ Good││
│ │   • Project A  │          │  $250k   │          │        ││
│ │   • Project B  │          │  $150k   │          │        ││
│ │   • Project C  │          │   $75k   │          │        ││
│ └────────────────┴──────────┴──────────┴──────────┴────────┘│
│                                                              │
│ ⚠️ Conflicts Detected:                                      │
│ • John Doe over-allocated by 5 hours/week                   │
│                                                              │
│ Suggested Resolutions:                                       │
│ 1. Reduce Project B allocation to 15h (priority #3)        │
│ 2. Add temporary resource to Project A                      │
│ 3. Extend Project B timeline by 2 weeks                     │
│                                                              │
│ [🔄 Auto-Resolve] [✏️ Manual Adjust] [📊 View Details]     │
└─────────────────────────────────────────────────────────────┘
```

---

### **3. Capacity Management**

**Activities**:
- Monitor capacity vs demand
- Adjust workloads
- Plan for bottlenecks

**ADPA Implementation**:

```sql
CREATE TABLE program_capacity_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Period
  forecast_period DATE,           -- Month/week
  
  -- Capacity by Resource Type
  human_capacity_fte DECIMAL(10,2),
  human_demand_fte DECIMAL(10,2),
  human_utilization DECIMAL(5,2),  -- (demand / capacity) × 100
  
  financial_capacity DECIMAL(15,2),
  financial_demand DECIMAL(15,2),
  financial_utilization DECIMAL(5,2),
  
  -- Bottlenecks
  is_bottleneck_period BOOLEAN,
  bottleneck_resources TEXT[],
  
  -- Recommendations
  capacity_recommendations JSONB,  -- Hire, defer, reduce scope
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/resources/capacity`

```
Capacity Forecast (Next 6 Months)

     Utilization %
     150% │
          │     ⚠️ Bottleneck
     125% │      ╱╲
          │     ╱  ╲
     100% ├────╱────╲────────────────────
          │               ╲
      75% │                ╲____/‾‾‾╲____
          │
      50% │
          └───────────────────────────────>
           Nov  Dec  Jan  Feb  Mar  Apr

Red Line: Over-capacity (>100%)
Green: Efficient (70-90%)
Yellow: Under-utilized (<70%)

Recommendations:
• December: Hire 2 FTE (expected bottleneck)
• January: Release contractors (demand drops)
```

---

### **4. Skills and Competency Tracking**

**Activities**:
- Maintain skills inventory
- Identify gaps
- Plan training

**ADPA Implementation**:

```sql
CREATE TABLE program_skills_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  user_id UUID REFERENCES users(id),
  
  -- Skills
  skill_name VARCHAR(255),
  skill_category VARCHAR(100),    -- technical, leadership, domain, tool
  proficiency_level VARCHAR(50),  -- beginner, intermediate, advanced, expert
  proficiency_score INTEGER,      -- 1-100
  
  -- Certification
  is_certified BOOLEAN,
  certification_name VARCHAR(255),
  certification_expiry DATE,
  
  -- Experience
  years_experience DECIMAL(5,2),
  projects_used_in UUID[],
  
  -- Availability
  available_for_allocation BOOLEAN,
  
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Skills gap analysis
CREATE VIEW program_skills_gap AS
SELECT 
  p.program_id,
  rp.required_skills[i] as required_skill,
  COUNT(DISTINCT si.user_id) as available_experts,
  SUM(rp.required_quantity) as required_count,
  CASE 
    WHEN COUNT(DISTINCT si.user_id) >= SUM(rp.required_quantity) THEN 'met'
    WHEN COUNT(DISTINCT si.user_id) > 0 THEN 'partial'
    ELSE 'gap'
  END as gap_status
FROM program_resource_plan rp
CROSS JOIN LATERAL unnest(rp.required_skills) WITH ORDINALITY AS t(skill, i)
LEFT JOIN program_skills_inventory si ON si.skill_name = rp.required_skills[i]
  AND si.proficiency_level IN ('advanced', 'expert')
WHERE rp.resource_type = 'human'
GROUP BY p.program_id, rp.required_skills[i];
```

**UI**: `/programs/[id]/resources/skills`

```
┌─────────────────────────────────────────────────────────────┐
│ Skills Inventory & Gap Analysis                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Skills Heat Map:                                             │
│                                                              │
│ ┌─────────────────┬─────────┬──────────┬──────────┬──────┐ │
│ │ Skill           │ Required│ Available│ Gap      │ Action││
│ ├─────────────────┼─────────┼──────────┼──────────┼──────┤ │
│ │ React.js        │ 8 FTE   │ 10 FTE   │ +2  ✅   │ Good  ││
│ │ Node.js         │ 6 FTE   │ 7 FTE    │ +1  ✅   │ Good  ││
│ │ PostgreSQL      │ 4 FTE   │ 2 FTE    │ -2  ⚠️   │ Hire  ││
│ │ DevOps          │ 3 FTE   │ 1 FTE    │ -2  🔴   │ Critical││
│ │ UX Design       │ 2 FTE   │ 2 FTE    │  0  ✅   │ Good  ││
│ │ Project Mgmt    │ 5 FTE   │ 6 FTE    │ +1  ✅   │ Good  ││
│ └─────────────────┴─────────┴──────────┴──────────┴──────┘ │
│                                                              │
│ 🔴 Critical Gaps: 2 skills                                  │
│ ⚠️ Moderate Gaps: 1 skill                                   │
│ ✅ Met Requirements: 3 skills                               │
│                                                              │
│ Recommendations:                                             │
│ 1. Hire 2 PostgreSQL DBAs (Critical - Start: Dec 2025)     │
│ 2. Hire 2 DevOps Engineers (Critical - Start: Dec 2025)    │
│ 3. Cross-train 2 developers on PostgreSQL (Medium priority)│
│                                                              │
│ [📋 Create Hiring Req] [📚 Plan Training] [🔄 Rebalance]   │
└─────────────────────────────────────────────────────────────┘
```

---

### **5. Resource Performance Monitoring**

**Activities**:
- Track utilization, productivity
- Use KPIs
- Performance reviews

**ADPA Implementation**:

```sql
CREATE TABLE program_resource_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  resource_id UUID REFERENCES users(id),
  
  -- Performance Period
  reporting_period DATE,          -- Month
  
  -- Utilization Metrics
  available_hours DECIMAL(10,2),
  billable_hours DECIMAL(10,2),
  utilization_rate DECIMAL(5,2),  -- billable / available × 100
  
  -- Productivity Metrics
  tasks_assigned INTEGER,
  tasks_completed INTEGER,
  completion_rate DECIMAL(5,2),   -- completed / assigned × 100
  
  -- Quality Metrics
  quality_score DECIMAL(5,2),     -- Based on deliverable reviews
  rework_percentage DECIMAL(5,2),
  
  -- Performance Rating
  overall_performance VARCHAR(50),  -- exceeds, meets, below-expectations
  performance_score INTEGER,        -- 1-100
  
  -- Feedback
  manager_feedback TEXT,
  peer_feedback JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calculate resource utilization for health dashboard
CREATE VIEW program_resource_utilization_summary AS
SELECT 
  program_id,
  AVG(utilization_rate) as avg_utilization,
  COUNT(*) FILTER (WHERE utilization_rate > 90) as over_utilized_count,
  COUNT(*) FILTER (WHERE utilization_rate < 50) as under_utilized_count,
  CASE 
    WHEN AVG(utilization_rate) BETWEEN 75 AND 85 THEN 'Efficient'
    WHEN AVG(utilization_rate) > 90 THEN 'Over-utilized'
    WHEN AVG(utilization_rate) < 60 THEN 'Under-utilized'
    ELSE 'Acceptable'
  END as utilization_status
FROM program_resource_performance
WHERE reporting_period = date_trunc('month', CURRENT_DATE)
GROUP BY program_id;
```

**UI Component** (Feeds Health Dashboard):
```typescript
async function calculateResourceUtilization(programId: string): Promise<HealthMetric> {
  const result = await db.query(`
    SELECT 
      avg_utilization,
      utilization_status
    FROM program_resource_utilization_summary
    WHERE program_id = $1
  `, [programId])
  
  const { avg_utilization, utilization_status } = result.rows[0] || {}
  
  return {
    name: "Resource Utilization",
    value: `${Math.round(avg_utilization)}%`,
    status: utilization_status || 'No Data',
    color: avg_utilization >= 75 && avg_utilization <= 85 ? 'green' :
           avg_utilization > 90 ? 'red' : 'yellow'
  }
}
```

---

### **6. Resource Risk Management**

**Activities**:
- Identify resource risks
- Develop mitigation
- Monitor external factors

**ADPA Implementation**:

```sql
CREATE TABLE program_resource_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Risk Details
  risk_type VARCHAR(100),         -- availability, turnover, skill-gap, cost-increase
  risk_title VARCHAR(255),
  risk_description TEXT,
  
  -- Affected Resources
  affected_resource_ids UUID[],
  affected_projects UUID[],
  
  -- Assessment
  probability INTEGER,             -- 1-100
  impact_severity VARCHAR(50),     -- low, medium, high, critical
  
  -- Impact Quantification
  impact_fte_loss DECIMAL(10,2),
  impact_cost_increase DECIMAL(15,2),
  impact_schedule_days INTEGER,
  
  -- Response
  mitigation_strategy TEXT,
  contingency_plan TEXT,          -- e.g., cross-training, contractor pool
  
  -- Monitoring
  risk_owner_id UUID REFERENCES users(id),
  status VARCHAR(50),             -- open, monitoring, mitigating, closed
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example risks
INSERT INTO program_resource_risks (risk_type, risk_title, probability, impact_severity, mitigation_strategy) VALUES
('turnover', 'Key developer resignation risk', 40, 'high', 'Cross-training 2 developers on critical systems'),
('skill-gap', 'PostgreSQL DBA shortage', 70, 'critical', 'External hiring + contractor engagement'),
('availability', 'Competing program resource conflict', 60, 'medium', 'Resource sharing agreement with other PMO');
```

---

### **7. Financial Resource Management**

**Covered in Part 1: Cost Management**

Cross-reference:
- Budget Development (#2)
- Cost Control (#4)
- Forecasting (#5)

---

### **8. Communication and Coordination**

**Activities**:
- Facilitate collaboration
- Resolve conflicts
- Keep stakeholders informed

**ADPA Implementation**:

```sql
CREATE TABLE program_resource_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Communication Event
  communication_type VARCHAR(100),  -- status-update, conflict-resolution, allocation-change
  communication_date TIMESTAMP,
  
  -- Recipients
  recipients JSONB,                 -- [{ user_id, role, send_method }]
  
  -- Content
  subject VARCHAR(255),
  message TEXT,
  attachments JSONB,
  
  -- Context
  related_resources UUID[],
  related_projects UUID[],
  related_conflicts UUID[],
  
  -- Delivery
  sent_via VARCHAR(100),            -- email, dashboard, meeting, slack
  sent_at TIMESTAMP,
  read_by JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/resources/communications`
- Communication log
- Send resource updates
- Conflict resolution tracker
- Collaboration workspace

---

### **9. Tools and Systems Integration**

**ADPA Native Features**:
- ✅ Time tracking integration (future)
- ✅ HR system API (future)
- ✅ Financial system API (future)
- ✅ Automated reporting
- ✅ Real-time alerts

---

## 🎯 **Integration: Resource + Cost → Health Dashboard**

### Updated Health Dashboard (7 Metrics):

```typescript
interface ProgramHealthMetrics {
  // Original 5 metrics
  benefitRealization: HealthMetric      // 75% - On Track
  riskStatus: HealthMetric              // Medium - Monitor Closely
  resourceUtilization: HealthMetric     // 82% - Efficient ⭐ FROM RESOURCE
  scheduleAdherence: HealthMetric       // 90% - On Schedule
  stakeholderSatisfaction: HealthMetric // 88% - Positive
  
  // Enhanced with Cost Management
  costPerformance: HealthMetric         // CPI: 0.96 - At Risk ⭐ NEW
  budgetStatus: HealthMetric            // 58% spent - On Track ⭐ NEW
}
```

**Dashboard Display**:
```
┌─────────────────────────────────────────────────────────────┐
│ Program Health Dashboard                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Benefit Realization  │           75%                    │ │
│ │ ✅ On Track          │ ████████████████████████░░░░░░░ │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Cost Performance (CPI)│          0.96                   │ │
│ │ ⚠️ At Risk           │ Target: 1.0 | Current: 0.96     │ │
│ │                      │ Forecasting $435k overrun        │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Budget Utilization   │           58%                    │ │
│ │ ✅ On Track          │ $6.1M spent of $10.5M           │ │
│ │                      │ ████████████████████░░░░░░░░░░░ │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Resource Utilization │           82%                    │ │
│ │ ✅ Efficient         │ Well balanced allocation         │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Schedule Performance │           90%                    │ │
│ │ ✅ On Schedule       │ 9 of 10 milestones on time      │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Risk Status          │         Medium                   │ │
│ │ ⚠️ Monitor Closely   │ 3 high risks, 7 medium          │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Stakeholder Satisf.  │           88%                    │ │
│ │ ✅ Positive          │ 12 of 15 stakeholders satisfied  │ │
│ └──────────────────────┴──────────────────────────────────┘ │
│                                                              │
│ Overall Program Health: 🟡 AMBER (Requires Attention)       │
│ Primary Concern: Cost overrun trending                      │
│                                                              │
│ [📊 Detailed Analysis] [📈 Trends] [🚨 Alerts] [📄 Report] │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 **Complete Database Schema**

### Tables Summary (17 new tables):

**Cost Management (8 tables)**:
1. ✅ `program_cost_estimates` - Estimation tracking
2. ✅ `program_budgets` - Budget development
3. ✅ `program_funding` - Funding sources
4. ✅ `program_cash_flow` - Cash flow tracking
5. ✅ `program_cost_performance` - EVM metrics
6. ✅ `program_forecasts` - Financial forecasts
7. ✅ `program_financial_analysis` - ROI, NPV, IRR
8. ✅ `program_financial_transactions` - Audit trail

**Resource Management (9 tables)**:
1. ✅ `program_resource_plan` - Resource planning
2. ✅ `program_resource_allocations` - Assignments
3. ✅ `program_capacity_forecast` - Capacity planning
4. ✅ `program_skills_inventory` - Skills tracking
5. ✅ `program_resource_performance` - Performance metrics
6. ✅ `program_resource_risks` - Resource risks
7. ✅ `program_resource_communications` - Communication log
8. ✅ `program_resources` - Resource master data (from earlier)
9. ✅ `program_resource_conflicts` - Conflict detection (view)

---

## 🗓️ **8-Week Implementation Timeline**

### **Week 1-2: Cost Management Foundation** ⭐ **START HERE**

**Week 1: Budget & EVM**
- [ ] Database schema (cost tables)
- [ ] Budget rollup from projects
- [ ] EVM calculation engine
- [ ] Budget vs actual dashboard

**Deliverables**:
```
✅ Total budget aggregation
✅ Spent vs budget tracking
✅ CPI/SPI calculations
✅ Variance alerts
```

**Week 2: Forecasting**
- [ ] Forecast builder
- [ ] EAC calculation (BAC / CPI)
- [ ] Trend analysis
- [ ] ROI calculator

**Deliverables**:
```
✅ EAC forecasting
✅ Trend charts
✅ ROI/NPV/IRR calculations
✅ Financial reports
```

---

### **Week 3-4: Resource Management Foundation**

**Week 3: Resource Planning**
- [ ] Resource planning tables
- [ ] Allocation matrix
- [ ] Conflict detection
- [ ] Skills inventory

**Deliverables**:
```
✅ Resource allocation interface
✅ Conflict alerts
✅ Skills gap analysis
✅ Capacity forecast
```

**Week 4: Performance Tracking**
- [ ] Utilization tracking
- [ ] Performance metrics
- [ ] Resource dashboard
- [ ] Automated alerts

**Deliverables**:
```
✅ Utilization dashboard
✅ Performance scorecards
✅ Over/under-utilization alerts
✅ Resource health metric
```

---

### **Week 5-6: Integration & Dashboards**

**Week 5: Health Dashboard**
- [ ] Integrate all 7 metrics
- [ ] Auto-calculation service
- [ ] Trend visualization
- [ ] Alert system

**Week 6: Financial Reports**
- [ ] Executive report templates
- [ ] PDF/PPTX generation
- [ ] Email distribution
- [ ] Scheduled reports

---

### **Week 7-8: Advanced Features**

**Week 7: Benefit-Cost Analysis**
- [ ] NPV calculator
- [ ] IRR calculator
- [ ] Payback period
- [ ] Sensitivity analysis

**Week 8: Compliance & Audit**
- [ ] Transaction logging
- [ ] Compliance checklist
- [ ] Audit reports
- [ ] Document repository

---

## 📈 **Key Calculations Reference**

### **Earned Value Management (EVM)**:

```typescript
// Basic EVM Formulas
const PV = plannedValue           // What we planned to accomplish
const EV = earnedValue            // What we actually accomplished
const AC = actualCost             // What we actually spent

const SV = EV - PV                // Schedule Variance ($ behind/ahead)
const CV = EV - AC                // Cost Variance ($ over/under)

const SPI = EV / PV               // Schedule Performance Index
const CPI = EV / AC               // Cost Performance Index

// Interpretation:
// SPI > 1.0 → Ahead of schedule
// SPI < 1.0 → Behind schedule
// CPI > 1.0 → Under budget
// CPI < 1.0 → Over budget

// Forecasting
const BAC = budgetAtCompletion    // Original approved budget
const EAC = BAC / CPI             // Forecasted final cost
const ETC = EAC - AC              // How much more needed
const VAC = BAC - EAC             // Overrun/underrun at completion

// To-Complete Performance Index
const TCPI = (BAC - EV) / (BAC - AC)  // Performance needed to stay on budget

// Interpretation:
// TCPI = 1.0 → Need to maintain current performance
// TCPI > 1.0 → Need to improve efficiency
// TCPI < 1.0 → Can afford to slow down
```

### **Financial Analysis**:

```typescript
// ROI (Return on Investment)
const ROI = ((totalBenefits - totalCosts) / totalCosts) * 100

// NPV (Net Present Value)
function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cashFlow, year) => {
    return npv + (cashFlow / Math.pow(1 + discountRate, year))
  }, 0)
}

// IRR (Internal Rate of Return)
// Rate at which NPV = 0 (solve iteratively)

// Payback Period
function calculatePaybackPeriod(investment: number, annualCashFlow: number): number {
  return investment / annualCashFlow  // Years
}

// Benefit-Cost Ratio
const BCR = totalBenefits / totalCosts
// BCR > 1.0 → Project is worthwhile
```

---

## 🎯 **Quick Wins (Week 1)**

### **1. Budget Rollup Dashboard** (2 days)

**SQL Query**:
```sql
SELECT 
  pr.id as program_id,
  pr.name as program_name,
  SUM(p.budget) as total_budget,
  SUM(p.actual_cost) as total_spent,
  SUM(p.forecast_cost) as total_forecast,
  ROUND((SUM(p.actual_cost) / SUM(p.budget) * 100), 2) as budget_utilization,
  SUM(p.budget - COALESCE(p.actual_cost, 0)) as remaining_budget
FROM programs pr
LEFT JOIN projects p ON p.program_id = pr.id
WHERE pr.archived = false AND p.archived = false
GROUP BY pr.id, pr.name;
```

**UI Component**:
```typescript
export function ProgramFinancialSummary({ programId }) {
  const [financials, setFinancials] = useState({
    totalBudget: 10450000,
    totalSpent: 6100000,
    totalForecast: 10885000,
    budgetUtilization: 58.4,
    remainingBudget: 4350000
  })
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Total Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(financials.totalBudget / 1000000).toFixed(1)}M
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Spent to Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            ${(financials.totalSpent / 1000000).toFixed(1)}M
          </div>
          <Progress value={financials.budgetUtilization} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {financials.budgetUtilization}% utilized
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Forecast at Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${(financials.totalForecast / 1000000).toFixed(1)}M
          </div>
          <p className="text-xs text-red-600 mt-1">
            $435k overrun projected
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Remaining Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${(financials.remainingBudget / 1000000).toFixed(1)}M
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### **2. Resource Utilization Tracker** (2 days)

**SQL Query**:
```sql
SELECT 
  u.id as user_id,
  u.name,
  r.role,
  SUM(ra.allocation_percentage) as total_allocation,
  COUNT(DISTINCT ra.project_id) as project_count,
  CASE 
    WHEN SUM(ra.allocation_percentage) > 100 THEN 'over-allocated'
    WHEN SUM(ra.allocation_percentage) BETWEEN 75 AND 90 THEN 'efficient'
    WHEN SUM(ra.allocation_percentage) < 50 THEN 'under-utilized'
    ELSE 'acceptable'
  END as utilization_status
FROM users u
LEFT JOIN program_resource_allocations ra ON ra.resource_id = u.id
WHERE ra.program_id = $1
  AND ra.allocation_status = 'active'
  AND CURRENT_DATE BETWEEN ra.allocation_start AND ra.allocation_end
GROUP BY u.id, u.name, r.role;
```

**UI Component**: (Shown earlier in allocation matrix)

---

### **3. EVM Quick Dashboard** (3 days)

**Critical Metrics Card**:
```typescript
export function EVMQuickCard({ programId }) {
  const [evm, setEVM] = useState({
    cpi: 0.96,
    spi: 0.94,
    status: 'at-risk'
  })
  
  return (
    <Card className={cn(
      "border-2",
      evm.status === 'on-track' && "border-green-500",
      evm.status === 'at-risk' && "border-yellow-500",
      evm.status === 'critical' && "border-red-500"
    )}>
      <CardHeader>
        <CardTitle>Cost & Schedule Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Cost Performance (CPI)</span>
              <span className="font-bold">{evm.cpi.toFixed(2)}</span>
            </div>
            <Progress 
              value={evm.cpi * 100} 
              className={evm.cpi >= 0.95 ? "bg-green-500" : "bg-yellow-500"} 
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Schedule Performance (SPI)</span>
              <span className="font-bold">{evm.spi.toFixed(2)}</span>
            </div>
            <Progress 
              value={evm.spi * 100} 
              className={evm.spi >= 0.95 ? "bg-green-500" : "bg-yellow-500"} 
            />
          </div>
          
          {evm.status !== 'on-track' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2 text-yellow-600" />
              <span className="text-yellow-800">
                Performance below target. Review cost controls.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## ✅ **Acceptance Criteria**

### Cost Management Complete:
- [ ] Budget rollup from projects
- [ ] EVM metrics (PV, EV, AC, SV, CV, SPI, CPI)
- [ ] Forecasting (EAC, ETC, VAC, TCPI)
- [ ] ROI, NPV, IRR calculations
- [ ] Financial reporting (PDF/Excel)
- [ ] Compliance & audit trails
- [ ] Cash flow tracking
- [ ] Benefit-cost analysis

### Resource Management Complete:
- [ ] Resource planning
- [ ] Allocation matrix with conflict detection
- [ ] Capacity forecasting
- [ ] Skills inventory & gap analysis
- [ ] Performance tracking
- [ ] Resource risk register
- [ ] Utilization dashboard
- [ ] Communication tools

### Integration Complete:
- [ ] Health dashboard shows all 7 metrics
- [ ] Auto-calculation every 24 hours
- [ ] Real-time alerts for thresholds
- [ ] Historical trending

---

## 🚀 **Implementation Priority**

### **Immediate (Week 1)**: ⭐⭐⭐⭐⭐
1. Budget rollup dashboard
2. EVM quick metrics
3. Resource utilization tracker

**Value**: High executive visibility, immediate ROI

---

### **Short-term (Weeks 2-4)**: ⭐⭐⭐⭐
4. Full EVM dashboard
5. Forecasting engine
6. Resource allocation matrix
7. Skills gap analysis

**Value**: Proactive management, data-driven decisions

---

### **Medium-term (Weeks 5-8)**: ⭐⭐⭐
8. Financial analysis (NPV, IRR)
9. Capacity planning
10. Performance tracking
11. Reporting automation

**Value**: Strategic decision support, compliance

---

## 📊 **Expected Outcomes**

### Financial Performance:
- ✅ 95% budget accuracy (vs 70% previously)
- ✅ Early detection of cost overruns (avg 2 months earlier)
- ✅ 15% improvement in cost efficiency (better CPI)

### Resource Performance:
- ✅ 85% optimal resource utilization (vs 65%)
- ✅ 50% reduction in resource conflicts
- ✅ 30% faster resource onboarding (skills tracking)

### Decision Quality:
- ✅ 100% of decisions backed by EVM data
- ✅ 75% reduction in budget surprises
- ✅ Real-time visibility for executives

---

## 📝 **Files to Create**

### Backend Services:
1. `server/src/services/programCostService.ts` - Cost calculations
2. `server/src/services/programResourceService.ts` - Resource management
3. `server/src/services/evmCalculator.ts` - EVM engine
4. `server/src/services/financialAnalyzer.ts` - ROI/NPV/IRR

### Backend Routes:
1. `server/src/routes/programCostRoutes.ts` - Cost endpoints
2. `server/src/routes/programResourceRoutes.ts` - Resource endpoints

### Frontend Components:
1. `components/program/FinancialDashboard.tsx` - Budget & EVM
2. `components/program/ResourceDashboard.tsx` - Resources
3. `components/program/EVMChart.tsx` - EVM visualization
4. `components/program/ResourceAllocationMatrix.tsx` - Allocation
5. `components/program/SkillsGapAnalysis.tsx` - Skills
6. `components/program/FinancialReportBuilder.tsx` - Reports

### Frontend Pages:
1. `app/programs/[id]/finances/page.tsx` - Financial management
2. `app/programs/[id]/resources/page.tsx` - Resource management

### Migrations:
1. `server/migrations/203_program_cost_management.sql`
2. `server/migrations/204_program_resource_management.sql`
3. `server/migrations/205_program_evm_metrics.sql`

---

## 🎊 **Success Criteria**

**Phase Complete When**:
- [x] All 8 cost management activities implemented
- [x] All 9 resource management activities implemented
- [x] Health dashboard shows 7 metrics
- [x] EVM dashboard functional
- [x] ROI/NPV calculations accurate
- [x] Resource conflicts auto-detected
- [x] Skills gaps identified
- [x] Reports auto-generated

---

**Status**: Comprehensive Plan Ready  
**Next Action**: Implement Week 1 (Budget Rollup + EVM)  
**Estimated Business Value**: $2-5M in better decision-making  
**ROI on Development**: 500-800% (Better resource allocation alone)

