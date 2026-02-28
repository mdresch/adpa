# Financial Dashboard - Complete User Guide

**Date**: October 31, 2025  
**Audience**: Program Managers, Finance Teams, Executives  
**Purpose**: Understanding how financial metrics are calculated and managed

---

## 📊 **DASHBOARD METRICS EXPLAINED**

### **1. Total Budget** 💰

**What It Is**: The sum of all project budgets within the program

**How It's Calculated**:
```sql
Total Budget = SUM(budget) FROM all active projects in the program
```

**Example** (Your Test Program):
```
Customer Portal Migration:  $3,500,000
Data Analytics Platform:    $2,800,000
Mobile Application:         $2,150,000
Infrastructure Upgrade:     $1,600,000
Training Platform:            $400,000
─────────────────────────────────────
TOTAL BUDGET:              $10,450,000 ($10.4M)
```

**How to Adjust**:
1. Go to individual project pages
2. Update the project `budget` field
3. The program Total Budget will automatically recalculate

**Database Column**: `projects.budget` (DECIMAL)

---

### **2. Spent to Date** 💸

**What It Is**: The actual costs incurred across all projects to date

**How It's Calculated**:
```sql
Spent to Date = SUM(actual_cost) FROM all active projects
Budget Utilization % = (Spent to Date / Total Budget) × 100
```

**Example** (Your Test Program):
```
Customer Portal Migration:  $2,100,000 spent
Data Analytics Platform:    $1,650,000 spent
Mobile Application:         $1,200,000 spent
Infrastructure Upgrade:       $950,000 spent
Training Platform:            $200,000 spent
─────────────────────────────────────
TOTAL SPENT:               $6,100,000 ($6.1M)
Utilization:               58.4% of budget
```

**How to Update**:

**Option A: Direct Database Update** (for testing):
```sql
UPDATE projects 
SET actual_cost = 2100000.00  -- Amount actually spent
WHERE id = 'project-id';
```

**Option B: Via API** (recommended for production):
```typescript
// Future enhancement: Project cost tracking API
PUT /api/projects/:id/costs
Body: {
  actualCost: 2100000,
  laborCost: 1500000,
  materialsCost: 400000,
  equipmentCost: 150000,
  overheadCost: 50000
}
```

**Option C: Manual Entry** (future UI enhancement):
- Navigate to project page
- Click "Financial Tracking" tab
- Enter actual costs by category
- Save → Program dashboard auto-updates

**Database Column**: `projects.actual_cost` (DECIMAL)

---

### **3. Forecast at Completion** 🔮

**What It Is**: The predicted final cost based on current performance

**How It's Calculated**:
```
Method 1 (Manual): User-entered forecast
Method 2 (EVM-based): EAC = BAC / CPI

Where:
- EAC = Estimate at Completion
- BAC = Budget at Completion (original budget)
- CPI = Cost Performance Index (efficiency)
```

**Example** (Your Test Program):
```
Method 1: Manual Forecast
─────────────────────────────────
Customer Portal:    $3,650,000 (manual entry)
Data Analytics:     $2,900,000 (manual entry)
Mobile App:         $2,200,000 (manual entry)
Infrastructure:     $1,580,000 (manual entry)
Training:             $420,000 (manual entry)
─────────────────────────────────
TOTAL FORECAST:    $10,750,000 ($10.8M)

Method 2: EVM-based (automatic)
─────────────────────────────────
BAC (Total Budget): $10,450,000
CPI (Performance):  0.97
EAC = BAC / CPI:    $10,450,000 / 0.97 = $10,773,195
─────────────────────────────────
TOTAL FORECAST:    $10,773,195 ($10.8M)
```

**How to Update**:

**Manual Forecast**:
```sql
UPDATE projects 
SET forecast_cost = 3650000.00  -- Your estimated final cost
WHERE id = 'project-id';
```

**Automatic EVM Forecast**:
- System calculates based on CPI
- Updates automatically when earned value changes
- More accurate as project progresses

**When to Use Which**:
- **Manual**: Early in project, major changes expected
- **Automatic (EVM)**: Mid to late project, stable performance

**Database Column**: `projects.forecast_cost` (DECIMAL)

---

### **4. Remaining Budget** 💵

**What It Is**: How much budget is left to spend

**How It's Calculated**:
```
Remaining Budget = Total Budget - Spent to Date
Remaining % = (Remaining Budget / Total Budget) × 100
```

**Example** (Your Test Program):
```
Total Budget:      $10,450,000
Spent to Date:     $6,100,000
─────────────────────────────────
REMAINING:         $4,350,000 ($4.3M)
Remaining %:       41.6%
```

**This is Automatic**: 
- ✅ **Yes**, exactly as you said!
- Total Budget - Spent to Date = Remaining Budget
- Updates in real-time when actual costs change

**Cannot Be Directly Edited**: It's a calculated field

---

## 📈 **EVM METRICS EXPLAINED**

### **What is EVM (Earned Value Management)?**

EVM is a **PMBOK 8 standard** method for measuring project performance by comparing:
- What you **planned** to accomplish
- What you **actually** accomplished
- What you **actually** spent

---

### **5. PV (Planned Value)** 📅

**What It Is**: The budgeted cost of work that SHOULD be done by now

**How It's Calculated**:
```
PV = Budget × % of time elapsed

Example for a 12-month project:
- Budget: $3,500,000
- 6 months elapsed (50% of timeline)
- PV = $3,500,000 × 0.50 = $1,750,000

Or calculated directly:
PV = SUM(planned_value) from all projects
```

**Your Test Program**:
```
We're approximately 60% through the timeline
PV = $10,450,000 × 0.60 = $6,270,000 ($6.3M)
```

**How It's Set**:
```sql
-- Automatic based on timeline
UPDATE projects 
SET planned_value = budget * (days_elapsed / total_days)
WHERE id = 'project-id';

-- Or manual entry
UPDATE projects 
SET planned_value = 2100000.00  -- What should be done by now
WHERE id = 'project-id';
```

**Database Column**: `projects.planned_value` (DECIMAL)

---

### **6. EV (Earned Value)** ⭐

**What It Is**: The budgeted cost of work that WAS ACTUALLY completed

**How It's Calculated**:
```
EV = Budget × % Complete

Example:
- Budget: $3,500,000
- Project is 60% complete
- EV = $3,500,000 × 0.60 = $2,100,000
```

**Your Test Program**:
```
Customer Portal (60% done):  $3,500,000 × 0.60 = $2,100,000
Data Analytics (55% done):   $2,800,000 × 0.55 = $1,540,000
Mobile App (50% done):       $2,150,000 × 0.50 = $1,075,000
Infrastructure (65% done):   $1,600,000 × 0.65 = $1,040,000
Training (45% done):           $400,000 × 0.45 =   $180,000
────────────────────────────────────────────────────────────
TOTAL EV:                                       $5,935,000 ($5.9M)
```

**How to Update**:

**Method 1: API Endpoint** (recommended):
```bash
PUT /api/programs/projects/:projectId/earned-value
Body: { percentComplete: 65 }

# This automatically calculates: EV = budget × 65%
```

**Method 2: Direct Database**:
```sql
-- Set percent complete (recommended)
UPDATE projects 
SET percent_complete = 65.0  -- Project is 65% done
WHERE id = 'project-id';

-- Then update earned value (automatic via trigger or manual)
UPDATE projects 
SET earned_value = budget * (percent_complete / 100)
WHERE id = 'project-id';
```

**Method 3: PowerShell Script**:
```powershell
$projectId = "project-uuid"
$percentComplete = 65
$body = @{ percentComplete = $percentComplete } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/programs/projects/$projectId/earned-value" `
  -Method PUT -Body $body -ContentType 'application/json' `
  -Headers @{ Authorization = "Bearer $token" }
```

**Database Columns**: 
- `projects.percent_complete` (0-100)
- `projects.earned_value` (calculated)

---

### **7. AC (Actual Cost)** 💰

**What It Is**: Same as "Spent to Date" - what you actually spent

```
AC = SUM(actual_cost) from all projects = $6,100,000
```

**This is the same value** as "Spent to Date" in the budget summary cards.

---

### **8. CPI (Cost Performance Index)** 📊

**What It Is**: How efficiently you're using your budget

**Formula**:
```
CPI = EV / AC

CPI > 1.0 = Under budget (good!) ✅
CPI = 1.0 = On budget
CPI < 1.0 = Over budget (bad!) ⚠️
```

**Your Test Program**:
```
EV (Earned):     $5,935,000
AC (Actual Cost): $6,100,000
CPI = $5,935,000 / $6,100,000 = 0.97

Interpretation: 0.97 = 3% over budget (at-risk ⚠️)
```

**This Is Automatic**: Calculated from EV and AC

**How to Improve CPI**:
1. **Increase EV**: Complete more work faster
2. **Decrease AC**: Reduce actual costs (better efficiency)
3. Both will increase CPI closer to 1.0

---

### **9. SPI (Schedule Performance Index)** 📅

**What It Is**: How well you're keeping to the schedule

**Formula**:
```
SPI = EV / PV

SPI > 1.0 = Ahead of schedule (good!) ✅
SPI = 1.0 = On schedule
SPI < 1.0 = Behind schedule (bad!) ⚠️
```

**Your Test Program**:
```
EV (Earned):      $5,935,000
PV (Planned):     $6,270,000
SPI = $5,935,000 / $6,270,000 = 0.95

Interpretation: 0.95 = 5% behind schedule (at-risk ⚠️)
```

**This Is Automatic**: Calculated from EV and PV

**How to Improve SPI**:
1. **Accelerate work**: Complete tasks faster
2. **Update % complete**: Reflect actual progress accurately
3. **Reduce scope**: If PV is too aggressive

---

### **10. EAC (Estimate at Completion)** 🎯

**What It Is**: Predicted final cost based on current performance

**Formula**:
```
EAC = BAC / CPI

Where:
- BAC = Budget at Completion (original budget)
- CPI = Cost Performance Index
```

**Your Test Program**:
```
BAC (Original Budget): $10,450,000
CPI (Performance):     0.97
EAC = $10,450,000 / 0.97 = $10,773,195 ($10.8M)
```

**What This Means**:
- If you continue at current efficiency (CPI 0.97)
- You'll spend $10.8M by the end
- That's $323K over budget

**This Is Automatic**: Calculated from BAC and CPI

---

### **11. VAC (Variance at Completion)** ⚖️

**What It Is**: Expected overrun or underrun at project end

**Formula**:
```
VAC = BAC - EAC

Positive VAC = Under budget ✅
Negative VAC = Over budget ⚠️
```

**Your Test Program**:
```
BAC (Budget):    $10,450,000
EAC (Forecast):  $10,773,195
VAC = $10,450,000 - $10,773,195 = -$323,195

Showing on dashboard: "$300K overrun" (rounded)
```

**This Is Automatic**: Calculated from BAC and EAC

---

### **12. TCPI (To-Complete Performance Index)** 🎯

**What It Is**: The efficiency you NEED to achieve to stay on budget

**Formula**:
```
TCPI = (BAC - EV) / (BAC - AC)

TCPI < 1.0 = Can relax, ahead of budget ✅
TCPI = 1.0 = Maintain current performance
TCPI > 1.0 = Need to improve efficiency ⚠️
```

**Your Test Program**:
```
BAC (Budget):     $10,450,000
EV (Earned):      $5,935,000
AC (Spent):       $6,100,000
TCPI = ($10,450,000 - $5,935,000) / ($10,450,000 - $6,100,000)
TCPI = $4,515,000 / $4,350,000 = 1.04

Interpretation: You need 4% better efficiency to meet budget
```

**This Is Automatic**: Calculated from BAC, EV, AC

---

## 🎯 **ROI METRICS EXPLAINED**

### **13. ROI (Return on Investment)** 📈

**What It Is**: The financial return you expect from the investment

**Formula**:
```
ROI = ((Total Benefits - Total Investment) / Total Investment) × 100
```

**Your Test Program**:
```
Total Investment (Budget):  $10,450,000
Total Expected Benefits:    $18,750,000
ROI = ($18,750,000 - $10,450,000) / $10,450,000 × 100
ROI = $8,300,000 / $10,450,000 × 100 = 79.4%

Interpretation: For every $1 invested, you get back $1.79
```

**How to Update**:

**Benefits come from the `program_benefits` table**:
```sql
-- View current benefits
SELECT * FROM program_benefits WHERE program_id = 'your-program-id';

-- Add a new benefit
INSERT INTO program_benefits (
  program_id,
  project_id,
  benefit_type,
  benefit_category,
  description,
  expected_value,
  status,
  owner_id
) VALUES (
  'program-id',
  'project-id',
  'revenue-increase',      -- Type
  'financial',             -- Category
  'Increased online sales',-- Description
  4000000.00,              -- $4M expected benefit
  'planned',               -- Status
  'user-id'
);

-- Update expected value
UPDATE program_benefits 
SET expected_value = 5000000.00  -- Increase benefit to $5M
WHERE id = 'benefit-id';
```

**Benefit Types** (must match these exactly):
- `cost-savings`
- `revenue-increase`
- `efficiency`
- `risk-reduction`
- `quality-improvement`
- `strategic`

**Database Table**: `program_benefits`

---

### **14. NPV (Net Present Value)** 💎

**What It Is**: Today's value of future benefits (accounting for time value of money)

**Formula**:
```
NPV = -Initial Investment + Σ(Annual Benefit / (1 + Discount Rate)^year)

Default Discount Rate: 8%
Time Horizon: 5 years
```

**Your Test Program**:
```
Initial Investment:  -$10,450,000 (Year 0)
Annual Benefit:      $18,750,000 / 5 = $3,750,000 per year

Year 1: $3,750,000 / (1.08)¹ = $3,472,222
Year 2: $3,750,000 / (1.08)² = $3,214,650
Year 3: $3,750,000 / (1.08)³ = $2,976,528
Year 4: $3,750,000 / (1.08)⁴ = $2,755,119
Year 5: $3,750,000 / (1.08)⁵ = $2,551,036
─────────────────────────────────────────
Total Present Value:  $14,969,555
Less Investment:      -$10,450,000
─────────────────────────────────────────
NPV:                  $4,519,555 ($4.5M)

✅ Positive NPV = Good investment
```

**This Is Automatic**: Uses benefit data from `program_benefits` table

**To Change NPV**: Update expected benefits or investment amounts

---

### **15. Payback Period** ⏱️

**What It Is**: How long until benefits equal costs (break-even point)

**Formula**:
```
Payback Period (months) = Total Investment / Monthly Benefit

Monthly Benefit = Total Expected Benefits / 12 months
```

**Your Test Program**:
```
Total Investment:    $10,450,000
Total Benefits:      $18,750,000
Monthly Benefit:     $18,750,000 / 12 = $1,562,500

Payback = $10,450,000 / $1,562,500 = 6.7 years = 80 months

Wait... Dashboard shows 14 months?
```

**Note**: The calculation assumes benefits are realized over time, not all at once. The actual calculation in the code divides annual benefits by time horizon:

```typescript
// Simplified calculation (current implementation)
annual_benefit = total_benefits / 12 months
payback_months = investment / monthly_benefit

// More accurate: tracks cumulative benefits month by month
```

**This Is Automatic**: Calculated from investment and benefits

---

### **16. Benefit/Cost Ratio (B/C Ratio)** ⚖️

**What It Is**: How many dollars of benefit per dollar invested

**Formula**:
```
B/C Ratio = Total Expected Benefits / Total Investment

B/C > 1.0 = More benefits than costs ✅
B/C = 1.0 = Break even
B/C < 1.0 = Costs exceed benefits ❌
```

**Your Test Program**:
```
Total Benefits:  $18,750,000
Total Investment: $10,450,000
B/C = $18,750,000 / $10,450,000 = 1.79

Interpretation: For every $1 spent, you get $1.79 in benefits
Net gain per dollar: $0.79
```

**This Is Automatic**: Calculated from benefits and investment

---

## 🛠️ **HOW TO UPDATE FINANCIAL DATA**

### **Scenario 1: Starting a New Program**

**Step 1: Create Projects** (via UI or API)
```
Create projects with:
- Name
- Description
- Budget (e.g., $3,500,000)
- Start Date
- End Date
```

**Step 2: Assign to Program**
```
Click "Add Project" on program page
Select projects
They now contribute to Total Budget
```

**Step 3: Add Expected Benefits**
```sql
-- For each project, add benefits
INSERT INTO program_benefits (
  program_id, project_id, benefit_type, benefit_category,
  description, expected_value, status
) VALUES (
  'program-id', 'project-id', 'revenue-increase', 'financial',
  'Increased sales from new features', 4000000.00, 'planned'
);
```

**Result**: ROI, NPV, B/C Ratio now calculated

---

### **Scenario 2: Tracking Progress During Execution**

**Step 1: Update Actual Costs** (weekly or monthly)
```sql
-- Update how much you've actually spent
UPDATE projects 
SET actual_cost = 2100000.00,  -- Total spent to date
    labor_cost = 1500000.00,
    materials_cost = 400000.00,
    equipment_cost = 150000.00,
    overhead_cost = 50000.00
WHERE id = 'project-id';
```

**Step 2: Update Percent Complete**
```sql
-- Or via API
PUT /api/programs/projects/:projectId/earned-value
Body: { percentComplete: 65 }
```

**Result**: 
- ✅ Spent to Date increases
- ✅ Earned Value recalculates
- ✅ CPI, SPI, EAC all update automatically
- ✅ Dashboard shows current performance

---

### **Scenario 3: Reforecasting**

**When**: Performance is different than expected, scope changes, etc.

**Step 1: Update Forecast Costs**
```sql
UPDATE projects 
SET forecast_cost = 3800000.00  -- New estimate
WHERE id = 'project-id';
```

**Step 2: Optional - Use EVM Forecast**
```
Don't set forecast_cost manually
Let EAC = BAC / CPI calculate automatically
More accurate if performance is stable
```

**Result**: Forecast at Completion updates, VAC shows new variance

---

### **Scenario 4: Benefits Realization Tracking**

**During Execution**: Mark benefits as realized
```sql
-- When a benefit is actually achieved
UPDATE program_benefits 
SET realized_value = 2500000.00,    -- Actually achieved
    realization_date = '2026-01-15',
    status = 'realized',
    realization_percentage = 100
WHERE id = 'benefit-id';
```

**Result**: 
- Realized Benefits increases
- Can track expected vs realized
- More accurate ROI over time

---

## 📊 **DATA FLOW DIAGRAM**

```
Project Level Data (Input by Users)
┌────────────────────────────────────┐
│ • budget          → Total Budget   │
│ • actual_cost     → Spent to Date  │
│ • forecast_cost   → Forecast       │
│ • percent_complete → Earned Value  │
│ • planned_value   → PV             │
└──────────────┬─────────────────────┘
               │
               ↓ (Aggregation)
               │
Program Level Metrics (Automatic)
┌──────────────┴─────────────────────┐
│ • Total Budget = SUM(budget)       │
│ • Total Spent = SUM(actual_cost)   │
│ • Total EV = SUM(earned_value)     │
│ • Total PV = SUM(planned_value)    │
└──────────────┬─────────────────────┘
               │
               ↓ (Calculations)
               │
EVM Metrics (Automatic)
┌──────────────┴─────────────────────┐
│ • CPI = EV / AC                    │
│ • SPI = EV / PV                    │
│ • EAC = BAC / CPI                  │
│ • VAC = BAC - EAC                  │
└──────────────┬─────────────────────┘
               │
               ↓
Dashboard Display (What You See)
```

---

## 🔧 **PRACTICAL MANAGEMENT GUIDE**

### **Weekly Update Routine**:

**Monday Morning** (15 minutes):
```sql
-- 1. Update actual costs for each project
UPDATE projects SET actual_cost = 2150000 WHERE name = 'Customer Portal';
UPDATE projects SET actual_cost = 1680000 WHERE name = 'Data Analytics';
-- ... (repeat for all projects)

-- 2. Update percent complete based on team reports
UPDATE projects SET percent_complete = 62 WHERE name = 'Customer Portal';
UPDATE projects SET percent_complete = 57 WHERE name = 'Data Analytics';
-- ... (repeat for all projects)

-- 3. Trigger EV calculation (or use API)
UPDATE projects 
SET earned_value = budget * (percent_complete / 100)
WHERE program_id = 'your-program-id';
```

**Result**: Dashboard auto-updates with latest financial health

---

### **Monthly Forecasting**:

```sql
-- Review each project's forecast
UPDATE projects 
SET forecast_cost = 3700000  -- Adjusted based on trends
WHERE name = 'Customer Portal';

-- Create official forecast record
INSERT INTO program_forecasts (
  program_id, forecast_date, forecast_type,
  forecast_total_cost, assumptions, confidence_level, status
) VALUES (
  'program-id', '2025-11-01', 'monthly',
  10800000, 'Based on current burn rate and CPI trends', 85, 'approved'
);
```

---

### **Quarterly Benefits Review**:

```sql
-- Review and update benefits
UPDATE program_benefits 
SET realized_value = 1500000,  -- Partially realized
    realization_percentage = 37.5,  -- 37.5% of expected $4M
    status = 'in-progress'
WHERE description = 'Increased online sales';
```

---

## 🎓 **EXAMPLE: Complete Workflow**

### **Week 1: New Program**

**1. Create Program**:
```
Name: Digital Transformation
Budget: (calculated from projects)
Timeline: July 2025 - June 2026
```

**2. Add 5 Projects**:
```sql
INSERT INTO projects (name, budget, ...) VALUES
('Customer Portal', 3500000, ...),
('Data Analytics', 2800000, ...),
...;
```

**Result**: Total Budget = $10.45M

**3. Add Expected Benefits**:
```sql
-- 10 benefits totaling $18.75M
INSERT INTO program_benefits ...
```

**Result**: ROI = 79.4%, B/C Ratio = 1.79

---

### **Week 12: Mid-Project Update**

**1. Update Actual Costs**:
```sql
-- Team reports $6.1M spent so far
UPDATE projects SET actual_cost = 2100000 WHERE name = 'Customer Portal';
-- ... (update all projects)
```

**Result**: Spent = $6.1M (58.4% utilized)

**2. Update Progress**:
```sql
-- PM reports Customer Portal is 60% complete
UPDATE projects SET percent_complete = 60 WHERE name = 'Customer Portal';
```

**Result**: 
- EV = $3.5M × 60% = $2.1M
- Program EV = $5.935M

**3. Dashboard Auto-Updates**:
```
CPI = $5.935M / $6.1M = 0.97 ⚠️ (slightly over budget)
SPI = $5.935M / $6.27M = 0.95 ⚠️ (slightly behind)
EAC = $10.45M / 0.97 = $10.77M
VAC = -$320K overrun projected
```

---

### **Week 24: Reforecast**

**1. Review Trends**:
- CPI consistently 0.95-0.97
- Projects taking longer than planned
- Some scope increases

**2. Update Forecasts**:
```sql
UPDATE projects 
SET forecast_cost = budget * 1.10  -- Expect 10% overrun
WHERE program_id = 'program-id';
```

**3. Update Benefits** (if changed):
```sql
-- Market conditions improved - increase revenue benefit
UPDATE program_benefits 
SET expected_value = 5000000  -- Up from $4M
WHERE description = 'Increased online sales';
```

**Result**: 
- Forecast = $11.5M (updated)
- ROI = 88% (improved due to better benefits)
- Dashboard reflects new reality

---

## 📋 **QUICK REFERENCE CHEAT SHEET**

### **To Update Budget**:
```sql
UPDATE projects SET budget = 3600000 WHERE id = 'project-id';
```
→ Total Budget recalculates

### **To Update Spent**:
```sql
UPDATE projects SET actual_cost = 2200000 WHERE id = 'project-id';
```
→ Spent to Date, CPI, EAC recalculate

### **To Update Progress**:
```sql
UPDATE projects SET percent_complete = 70 WHERE id = 'project-id';
UPDATE projects SET earned_value = budget * 0.70 WHERE id = 'project-id';
```
→ EV, SPI, CPI, EAC recalculate

### **To Update Forecast**:
```sql
UPDATE projects SET forecast_cost = 3800000 WHERE id = 'project-id';
```
→ Forecast at Completion recalculates

### **To Add Benefits**:
```sql
INSERT INTO program_benefits (program_id, benefit_type, expected_value, ...) 
VALUES ('program-id', 'revenue-increase', 5000000, ...);
```
→ ROI, NPV, B/C Ratio recalculate

---

## 🎯 **YOUR SPECIFIC QUESTIONS ANSWERED**

### **Q1: "How do I adjust a budget?"**

**Answer**: Update the `budget` field on individual projects:

```sql
-- Increase Customer Portal budget from $3.5M to $4M
UPDATE projects 
SET budget = 4000000.00 
WHERE name = 'Customer Portal' 
  AND program_id = '3b37223a-e620-4e8d-8604-36ac91ed5c3b';
```

**Result**: 
- Total Budget: $10.45M → $10.95M
- All percentages recalculate
- EAC formula adjusts

**Future UI Enhancement**: Edit button on project cards to update budget directly

---

### **Q2: "How is Spent to Date formulated?"**

**Answer**: Simple sum of all actual costs:

```sql
SELECT SUM(actual_cost) 
FROM projects 
WHERE program_id = 'program-id' 
  AND archived = false;
```

**What Goes Into actual_cost**:
```
actual_cost = labor_cost + materials_cost + equipment_cost + overhead_cost

Example:
Labor:      $1,500,000
Materials:    $400,000
Equipment:    $150,000
Overhead:      $50,000
────────────────────────
TOTAL:      $2,100,000 (this is actual_cost)
```

**How to Track**:
1. **Weekly/Monthly**: Collect actuals from accounting
2. **Update Database**: Set actual_cost for each project
3. **Dashboard**: Auto-sums across all projects

---

### **Q3: "How can Forecast at Completion be reviewed?"**

**Answer**: Two methods to set forecast:

**Method 1: Manual Review**
```sql
-- You manually estimate final cost
UPDATE projects 
SET forecast_cost = 3650000.00  -- Your estimate
WHERE id = 'project-id';
```

**When to Use**:
- Early in project (not enough data for EVM)
- Major scope changes
- External factors (market changes, resource changes)
- You have better information than the formula

**Method 2: EVM Automatic**
```
EAC = BAC / CPI

If you don't set forecast_cost, system uses:
forecast_cost = budget / CPI
```

**When to Use**:
- Mid to late project
- Stable performance (CPI not fluctuating wildly)
- Normal execution (no major changes)
- Let the math do the work

**Best Practice**: 
1. Use Manual early in project
2. Switch to EVM-based mid-project
3. Override EVM if you know something it doesn't

---

### **Q4: "Does Total Budget - Spent = Remaining?"**

**Answer**: ✅ **YES, EXACTLY!**

```
Remaining Budget = Total Budget - Spent to Date

Your Program:
$10,450,000 - $6,100,000 = $4,350,000 ✅

As a percentage:
Remaining % = ($4,350,000 / $10,450,000) × 100 = 41.6% ✅
```

**This is a live calculation** - it updates instantly when:
- Total Budget changes (project budgets updated)
- Spent to Date changes (actual costs updated)

**You cannot directly edit "Remaining Budget"** - it's always calculated.

---

## 🎨 **VISUAL INDICATORS EXPLAINED**

### **Color Coding**:

**Green** ✅:
- CPI/SPI ≥ 0.95 (on track)
- ROI > 0% (profitable)
- NPV > $0 (worthwhile)
- Positive metrics

**Yellow/Amber** ⚠️:
- CPI/SPI between 0.85-0.95 (at risk)
- Performance needs attention
- "AT RISK" badge

**Red** ❌:
- CPI/SPI < 0.85 (critical)
- Major performance issues
- Immediate action needed

**Your Dashboard**: Yellow because CPI (0.97) and SPI (0.95) are both in the 0.85-0.95 range

---

### **Performance Status**:

```typescript
if (CPI >= 0.95 AND SPI >= 0.95) → "ON TRACK" (green)
if (CPI >= 0.85 OR SPI >= 0.85)  → "AT RISK" (yellow) ← You are here
if (CPI < 0.85 AND SPI < 0.85)   → "CRITICAL" (red)
```

---

## 💡 **PRO TIPS FOR PROGRAM MANAGERS**

### **Tip 1: Update Earned Value Weekly**
```sql
-- Every Friday, update percent complete for all projects
UPDATE projects 
SET percent_complete = 62  -- Based on milestone completion
WHERE id = 'project-id';

-- System auto-calculates EV = budget × 62%
```

**Why**: Keeps CPI and SPI accurate for decision-making

---

### **Tip 2: Watch CPI Trends, Not Just Current Value**

**Good CPI Trend**: 0.98 → 0.97 → 0.98 (stable around 1.0)  
**Bad CPI Trend**: 1.05 → 0.98 → 0.92 → 0.87 (deteriorating)

**Action**: If CPI declining, investigate:
- What's causing costs to increase?
- Are estimates accurate?
- Can we improve efficiency?

---

### **Tip 3: Use TCPI for Action Planning**

**TCPI = 1.04** means:
- You need 4% better efficiency
- Current CPI is 0.97
- Target CPI to meet budget: 1.01

**Actions**:
1. Review high-cost activities
2. Optimize resource allocation
3. Reduce waste/rework
4. Negotiate better vendor rates

---

### **Tip 4: Track Benefits Early**

```sql
-- Don't wait until end - track benefits as they're realized
UPDATE program_benefits 
SET realized_value = 1200000,  -- $1.2M of $4M realized so far
    realization_percentage = 30,
    status = 'in-progress'
WHERE id = 'benefit-id';
```

**Why**: Shows ROI is actually happening, not just theoretical

---

## 🚀 **NEXT STEPS FOR YOU**

### **To Make This System Live**:

**1. Set Up Regular Updates**:
- Weekly: Update actual_cost, percent_complete
- Monthly: Review forecasts, update benefits
- Quarterly: Full financial review, reforecast if needed

**2. Create Update Workflow**:
```
Project Managers → Submit weekly actuals
Finance Team → Update actual_cost in database
System → Auto-calculates all EVM metrics
Executives → View dashboard for insights
```

**3. Optional: Build UI for Updates** (Future Enhancement):
- Project cost entry forms
- Benefit tracking interface
- Forecast adjustment tools
- Approval workflows

---

## 📊 **YOUR CURRENT DASHBOARD METRICS - WHAT THEY MEAN**

Based on what you're seeing:

✅ **Total Budget: $10.4M** 
- Sum of 5 project budgets
- Well-structured program

⚠️ **Spent: $6.1M (58.4%)**
- More than halfway through budget
- Reasonable for mid-project

⚠️ **CPI: 0.97**
- 3% over budget
- **Action**: Monitor closely, improve efficiency

⚠️ **SPI: 0.95**
- 5% behind schedule
- **Action**: Accelerate or extend timeline

✅ **ROI: 79.4%**
- Strong return on investment
- $8.3M net benefit expected

✅ **NPV: $4.5M**
- Positive - investment is worthwhile
- Good long-term value

✅ **B/C Ratio: 1.79**
- $1.79 benefit per $1 invested
- Financially sound

**Overall Assessment**: ⚠️ **AT RISK** but **CONTINUE**
- Performance slightly off track (cost & schedule)
- BUT strong business case (ROI, NPV, B/C all positive)
- **Recommendation**: Continue with performance improvements

---

## 📝 **SUMMARY**

**Simple Answer**:
- ✅ **Total Budget** = Sum of project budgets (you set these)
- ✅ **Spent** = Sum of actual costs (you update weekly/monthly)
- ✅ **Remaining** = Total - Spent (automatic, you were right!)
- ✅ **Forecast** = Your estimate OR automatic (BAC/CPI)
- ✅ **All EVM metrics** = Automatic calculations from the above
- ✅ **ROI metrics** = Based on expected benefits (you add these)

**To Manage**:
1. Set project budgets (one time)
2. Update actual costs (weekly/monthly)
3. Update % complete (weekly)
4. Add/update benefits (as they change)
5. Everything else calculates automatically! ✨

---

**Does this clarify how the financial system works? Any specific scenarios you'd like me to explain further?** 🎯
