# Program Activities - Complete Implementation Guide

**Date**: October 31, 2025  
**Status**: 📋 **COMPREHENSIVE IMPLEMENTATION PLAN**  
**Priority**: P0 (Core Program Management)  
**Effort**: 8-10 weeks  
**Based On**: Real-world program management best practices

---

## 🎯 **Overview**

This document maps all 11 program-level activities + 8 maintenance activities to ADPA features with exact implementation details, using your provided templates and metrics.

---

## 📊 **Program Health Dashboard** (Using Your Exact Metrics)

### Implementation:

```sql
CREATE TABLE program_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Your 5 Key Metrics
  benefit_realization_percent DECIMAL(5,2),      -- 75%
  benefit_realization_status VARCHAR(50),        -- "On Track"
  
  risk_status VARCHAR(50),                       -- "Medium"
  risk_status_note VARCHAR(100),                 -- "Monitor Closely"
  
  resource_utilization_percent DECIMAL(5,2),     -- 82%
  resource_utilization_status VARCHAR(50),       -- "Efficient"
  
  schedule_adherence_percent DECIMAL(5,2),       -- 90%
  schedule_adherence_status VARCHAR(50),         -- "On Schedule"
  
  stakeholder_satisfaction_percent DECIMAL(5,2), -- 88%
  stakeholder_satisfaction_status VARCHAR(50),   -- "Positive"
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  calculated_by VARCHAR(50) DEFAULT 'system'
);

-- Index for latest metrics
CREATE INDEX idx_program_health_latest ON program_health_metrics(program_id, calculated_at DESC);
```

### Dashboard UI Component:

**File**: `components/program/ProgramHealthDashboard.tsx`

```typescript
interface HealthMetric {
  name: string
  value: string | number
  status: string
  icon: React.ComponentType
  color: string
}

export function ProgramHealthDashboard({ programId }: { programId: string }) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      name: "Benefit Realization",
      value: "75%",
      status: "On Track",
      icon: Target,
      color: "green"
    },
    {
      name: "Risk Status",
      value: "Medium",
      status: "Monitor Closely",
      icon: AlertTriangle,
      color: "yellow"
    },
    {
      name: "Resource Utilization",
      value: "82%",
      status: "Efficient",
      icon: Users,
      color: "green"
    },
    {
      name: "Schedule Adherence",
      value: "90%",
      status: "On Schedule",
      icon: Calendar,
      color: "green"
    },
    {
      name: "Stakeholder Satisfaction",
      value: "88%",
      status: "Positive",
      icon: ThumbsUp,
      color: "green"
    }
  ])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.name}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.name}
            </CardTitle>
            <metric.icon className={cn(
              "h-4 w-4",
              metric.color === "green" && "text-green-500",
              metric.color === "yellow" && "text-yellow-500",
              metric.color === "red" && "text-red-500"
            )} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className={cn(
              "text-xs",
              metric.color === "green" && "text-green-600",
              metric.color === "yellow" && "text-yellow-600",
              metric.color === "red" && "text-red-600"
            )}>
              {metric.status}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 📈 **Benefits Realization Tracking** (Using Your Template)

### Database Schema:

```sql
CREATE TABLE program_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  project_id UUID REFERENCES projects(id),  -- NULL if program-level benefit
  
  -- From your template
  benefit_name VARCHAR(255) NOT NULL,
  description TEXT,
  expected_value DECIMAL(15,2),
  actual_value DECIMAL(15,2) DEFAULT 0,
  realization_status VARCHAR(50),  -- Not Started, In Progress, Partially Achieved, Achieved, Not Achieved
  responsible_owner_id UUID REFERENCES users(id),
  
  -- Additional tracking
  benefit_category VARCHAR(100),    -- financial, operational, strategic, customer
  measurement_method TEXT,
  target_date DATE,
  realization_date DATE,
  percentage_realized DECIMAL(5,2), -- calculated: (actual / expected) × 100
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_program_benefits_program ON program_benefits(program_id);
CREATE INDEX idx_program_benefits_status ON program_benefits(realization_status);

-- Pre-load sample data (from your template)
INSERT INTO program_benefits (benefit_name, description, expected_value, actual_value, realization_status, benefit_category) VALUES
('Customer Retention', 'Increase repeat purchases by improving service quality', 50000, 45000, 'In Progress', 'customer'),
('Operational Efficiency', 'Reduce processing time through automation', 75000, 80000, 'Achieved', 'operational'),
('Market Expansion', 'Enter new regional markets', 100000, 60000, 'Partially Achieved', 'strategic'),
('Brand Awareness', 'Improve brand recognition via campaigns', 30000, 20000, 'In Progress', 'strategic'),
('Cost Reduction', 'Lower overhead costs by consolidating vendors', 40000, 0, 'Not Started', 'financial');

-- Benefits summary view
CREATE VIEW program_benefits_summary AS
SELECT 
  program_id,
  COUNT(*) as total_benefits,
  SUM(expected_value) as total_expected,
  SUM(actual_value) as total_realized,
  ROUND((SUM(actual_value) / NULLIF(SUM(expected_value), 0) * 100), 2) as realization_rate,
  COUNT(*) FILTER (WHERE realization_status = 'Achieved') as achieved_count,
  COUNT(*) FILTER (WHERE realization_status = 'In Progress') as in_progress_count,
  COUNT(*) FILTER (WHERE realization_status = 'Not Started') as not_started_count
FROM program_benefits
GROUP BY program_id;
```

### UI Component:

**File**: `components/program/BenefitsRealizationTable.tsx`

```typescript
interface Benefit {
  id: string
  benefit_name: string
  description: string
  expected_value: number
  actual_value: number
  realization_status: string
  responsible_owner_name: string
  percentage_realized: number
}

export function BenefitsRealizationTable({ programId }: { programId: string }) {
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [summary, setSummary] = useState({
    total_expected: 0,
    total_realized: 0,
    realization_rate: 0
  })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expected Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.total_expected.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Realized Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.total_realized.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Realization Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.realization_rate}%
            </div>
            <Progress value={summary.realization_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Benefits Table (Using your template structure) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Benefits Realization Tracking</CardTitle>
            <Button onClick={() => setAddBenefitOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Benefit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Expected Value</TableHead>
                <TableHead className="text-right">Actual Value</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benefits.map((benefit) => (
                <TableRow key={benefit.id}>
                  <TableCell className="font-medium">{benefit.benefit_name}</TableCell>
                  <TableCell className="max-w-md truncate">{benefit.description}</TableCell>
                  <TableCell className="text-right">${benefit.expected_value.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">${benefit.actual_value.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={benefit.percentage_realized} className="w-20" />
                      <span className="text-xs">{benefit.percentage_realized}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(benefit.realization_status)}>
                      {benefit.realization_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{benefit.responsible_owner_name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Achieved': return 'bg-green-100 text-green-800 border-green-300'
    case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'Partially Achieved': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'Not Started': return 'bg-gray-100 text-gray-800 border-gray-300'
    case 'Not Achieved': return 'bg-red-100 text-red-800 border-red-300'
    default: return 'bg-gray-100 text-gray-800'
  }
}
```

---

## 🧩 **11 Program-Level Activities → ADPA Features**

### **1. Program Governance**

**Activities**:
- Establish governance structure
- Define roles and responsibilities
- Ensure compliance with policies

**ADPA Implementation**:

```sql
CREATE TABLE program_governance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Governance Structure
  governance_model VARCHAR(100),  -- steering-committee, program-board, hybrid
  decision_authority JSONB,       -- Who can decide what
  
  -- Board Members
  steering_committee JSONB,       -- Array of { user_id, role, authority_level }
  program_board JSONB,
  
  -- Meeting Schedule
  review_frequency VARCHAR(50),   -- weekly, bi-weekly, monthly
  next_review_date DATE,
  last_review_date DATE,
  
  -- Policies
  policies JSONB,                 -- Array of policy documents
  compliance_standards TEXT[],    -- ISO, PMI, internal standards
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example data
{
  "steering_committee": [
    { "user_id": "uuid", "name": "John Doe", "role": "Chair", "authority": "approve-budgets" },
    { "user_id": "uuid", "name": "Jane Smith", "role": "Member", "authority": "review-risks" }
  ],
  "review_frequency": "bi-weekly",
  "policies": [
    { "name": "Change Control Policy", "version": "2.0", "url": "/docs/policies/change-control.pdf" }
  ]
}
```

**UI**: `/programs/[id]/governance`
- Governance board roster
- Meeting schedule
- Policy library
- Compliance checklist

---

### **2. Program Planning**

**Activities**:
- Develop program roadmap
- Define scope, milestones, interdependencies
- Align with portfolio priorities

**ADPA Implementation**:

```sql
ALTER TABLE programs ADD COLUMN roadmap_data JSONB;
ALTER TABLE programs ADD COLUMN scope_statement TEXT;
ALTER TABLE programs ADD COLUMN key_milestones JSONB;

-- Interdependencies
CREATE TABLE program_dependencies (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES programs(id),
  depends_on_program_id UUID REFERENCES programs(id),
  dependency_type VARCHAR(50),  -- finish-to-start, start-to-start, etc.
  description TEXT,
  criticality VARCHAR(50)       -- critical, important, nice-to-have
);

CREATE TABLE project_interdependencies (
  id UUID PRIMARY KEY,
  source_project_id UUID REFERENCES projects(id),
  target_project_id UUID REFERENCES projects(id),
  dependency_type VARCHAR(50),
  lag_days INTEGER,
  status VARCHAR(50)  -- active, broken, completed
);
```

**UI**: `/programs/[id]/roadmap`
- Gantt chart (all projects)
- Dependency graph
- Critical path visualization
- Milestone timeline

---

### **3. Benefits Management** ⭐ **USING YOUR TEMPLATE**

**Activities**:
- Identify and quantify benefits
- Plan for realization
- Track delivery

**ADPA Implementation**: (Schema shown above in Benefits section)

**Calculation Engine**:
```typescript
class BenefitsManager {
  async calculateRealizationRate(programId: string): Promise<number> {
    const benefits = await db.query(`
      SELECT SUM(expected_value) as expected, SUM(actual_value) as actual
      FROM program_benefits
      WHERE program_id = $1
    `, [programId])
    
    return (benefits.actual / benefits.expected) * 100
  }
  
  async updateHealthMetric(programId: string): Promise<void> {
    const rate = await this.calculateRealizationRate(programId)
    
    const status = rate >= 90 ? 'Excellent' :
                   rate >= 75 ? 'On Track' :
                   rate >= 50 ? 'At Risk' :
                   'Critical'
    
    await db.query(`
      INSERT INTO program_health_metrics (program_id, benefit_realization_percent, benefit_realization_status)
      VALUES ($1, $2, $3)
      ON CONFLICT (program_id, calculated_at::date) 
      DO UPDATE SET benefit_realization_percent = $2, benefit_realization_status = $3
    `, [programId, rate, status])
  }
}
```

**UI**: `/programs/[id]/benefits`
- Benefits register table (your exact template)
- Add/edit benefit dialog
- Track actual vs expected
- Progress bars
- Export to Excel/CSV

---

### **4. Stakeholder Engagement**

**Activities**:
- Identify stakeholders
- Communication plan
- Manage expectations

**ADPA Implementation**:

```sql
CREATE TABLE program_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Stakeholder Info
  name VARCHAR(255),
  role VARCHAR(100),
  organization VARCHAR(255),
  email VARCHAR(255),
  
  -- RACI Matrix
  interest_level VARCHAR(50),    -- high, medium, low
  influence_level VARCHAR(50),   -- high, medium, low
  raci_role VARCHAR(10),         -- R, A, C, I
  
  -- Communication
  communication_frequency VARCHAR(50),  -- daily, weekly, monthly, quarterly
  communication_method VARCHAR(100),    -- email, dashboard, meeting, report
  preferred_format VARCHAR(50),         -- executive-summary, detailed, visual
  
  -- Satisfaction
  satisfaction_score INTEGER,    -- 1-100
  last_contacted TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stakeholder satisfaction rollup
CREATE VIEW program_stakeholder_satisfaction AS
SELECT 
  program_id,
  AVG(satisfaction_score) as avg_satisfaction,
  COUNT(*) FILTER (WHERE satisfaction_score >= 80) as satisfied_count,
  COUNT(*) FILTER (WHERE satisfaction_score < 50) as unsatisfied_count
FROM program_stakeholders
GROUP BY program_id;
```

**UI**: `/programs/[id]/stakeholders`
- Stakeholder register (table view)
- Power/Interest matrix (2×2 grid)
- Communication plan
- Satisfaction tracking
- Contact history

---

### **5. Risk and Issue Management**

**Activities**:
- Identify cross-project risks
- Program-level mitigation
- Issue escalation

**ADPA Implementation**:

```sql
CREATE TABLE program_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Risk Details
  risk_title VARCHAR(255) NOT NULL,
  risk_description TEXT,
  risk_category VARCHAR(100),     -- strategic, financial, operational, technical
  
  -- Assessment
  probability INTEGER,             -- 1-100
  impact_financial DECIMAL(15,2),
  impact_schedule_days INTEGER,
  severity VARCHAR(50),            -- low, medium, high, critical
  
  -- Scope
  affects_projects UUID[],         -- Array of project IDs
  cross_project BOOLEAN DEFAULT FALSE,
  
  -- Response
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50),              -- open, monitoring, mitigating, closed
  
  -- Tracking
  identified_date DATE,
  review_date DATE,
  closed_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calculate program risk status (for health dashboard)
CREATE VIEW program_risk_status AS
SELECT 
  program_id,
  COUNT(*) as total_risks,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_risks,
  COUNT(*) FILTER (WHERE severity = 'high') as high_risks,
  CASE 
    WHEN COUNT(*) FILTER (WHERE severity = 'critical') > 0 THEN 'High'
    WHEN COUNT(*) FILTER (WHERE severity = 'high') >= 3 THEN 'Medium'
    ELSE 'Low'
  END as overall_risk_status,
  CASE
    WHEN COUNT(*) FILTER (WHERE severity = 'critical') > 0 THEN 'Immediate Attention Required'
    WHEN COUNT(*) FILTER (WHERE severity = 'high') >= 3 THEN 'Monitor Closely'
    ELSE 'Under Control'
  END as risk_status_note
FROM program_risks
WHERE status IN ('open', 'monitoring', 'mitigating')
GROUP BY program_id;
```

**UI**: `/programs/[id]/risks`
- Risk register (table)
- Risk heat map (probability × impact)
- Cross-project risk indicator
- Mitigation tracking
- Risk trend chart

---

### **6. Resource Coordination**

**Activities**:
- Allocate shared resources
- Resolve conflicts
- Monitor capacity

**ADPA Implementation**:

```sql
CREATE TABLE program_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Resource Details
  resource_name VARCHAR(255),
  resource_type VARCHAR(100),     -- fte, contractor, equipment, budget
  
  -- Capacity
  total_capacity DECIMAL(10,2),   -- e.g., 5.0 FTE, $500k budget
  allocated_capacity DECIMAL(10,2),
  available_capacity DECIMAL(10,2),
  utilization_percent DECIMAL(5,2),  -- (allocated / total) × 100
  
  -- Allocation by project
  allocations JSONB,              -- [{ project_id, amount, percentage }]
  
  -- Period
  period_start DATE,
  period_end DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resource utilization calculation (for health dashboard)
CREATE VIEW program_resource_utilization AS
SELECT 
  program_id,
  AVG(utilization_percent) as avg_utilization,
  CASE 
    WHEN AVG(utilization_percent) BETWEEN 70 AND 90 THEN 'Efficient'
    WHEN AVG(utilization_percent) > 90 THEN 'Over-utilized'
    ELSE 'Under-utilized'
  END as utilization_status
FROM program_resources
WHERE period_end >= CURRENT_DATE
GROUP BY program_id;
```

**UI**: `/programs/[id]/resources`
- Resource allocation matrix
- Utilization heat map
- Conflict detector
- Capacity planning

---

### **7. Financial Management** ⭐ **HIGH PRIORITY**

**Activities**:
- Manage program budget
- Track costs across projects
- Financial alignment

**ADPA Implementation**:

```sql
-- Enhanced financial tracking
CREATE TABLE program_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Budget
  total_budget DECIMAL(15,2),
  contingency_budget DECIMAL(15,2),
  
  -- Actuals (computed from projects)
  total_spent DECIMAL(15,2),
  total_forecast DECIMAL(15,2),
  
  -- Variance
  budget_variance DECIMAL(15,2),      -- budget - spent
  variance_percent DECIMAL(5,2),
  
  -- Benefits
  expected_benefits DECIMAL(15,2),
  realized_benefits DECIMAL(15,2),
  
  -- ROI
  roi_percent DECIMAL(10,2),          -- (benefits - costs) / costs × 100
  npv DECIMAL(15,2),                  -- Net Present Value
  payback_period_months INTEGER,
  
  -- Period
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  as_of_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rollup from projects
CREATE OR REPLACE FUNCTION calculate_program_financials(p_program_id UUID)
RETURNS TABLE (
  total_budget DECIMAL,
  total_spent DECIMAL,
  total_forecast DECIMAL,
  variance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(budget) as total_budget,
    SUM(actual_cost) as total_spent,
    SUM(forecast_cost) as total_forecast,
    SUM(budget - COALESCE(actual_cost, 0)) as variance
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
END;
$$ LANGUAGE plpgsql;
```

**UI**: `/programs/[id]/finances`
- Budget vs Actual chart
- Spend trend
- ROI calculator
- Variance analysis
- Forecast modeling

---

### **8. Quality Management**

**Activities**:
- Define quality standards
- Monitor adherence
- Conduct audits

**ADPA Implementation**:

```sql
CREATE TABLE program_quality_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  standard_name VARCHAR(255),
  standard_description TEXT,
  measurement_criteria JSONB,
  target_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),  -- Minimum acceptable
  
  applies_to TEXT[],               -- project-types or specific project IDs
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE program_quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  project_id UUID REFERENCES projects(id),
  
  audit_date DATE,
  auditor_id UUID REFERENCES users(id),
  
  findings JSONB,                  -- Issues found
  conformance_score INTEGER,       -- 0-100
  status VARCHAR(50),              -- passed, failed, conditional
  
  action_items JSONB,
  follow_up_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI**: `/programs/[id]/quality`
- Quality standards library
- Audit schedule
- Conformance tracking
- Action item tracker

---

### **9. Performance Monitoring and Reporting** ⭐ **CORE FEATURE**

**Activities**:
- Track progress against objectives
- Consolidate project reports
- Report to executives

**ADPA Implementation**: (Combines all health metrics)

**Automated Calculation Service**:
```typescript
class ProgramHealthService {
  async calculateAllMetrics(programId: string): Promise<HealthMetrics> {
    const [
      benefitRealization,
      riskStatus,
      resourceUtilization,
      scheduleAdherence,
      stakeholderSatisfaction
    ] = await Promise.all([
      this.calculateBenefitRealization(programId),
      this.calculateRiskStatus(programId),
      this.calculateResourceUtilization(programId),
      this.calculateScheduleAdherence(programId),
      this.calculateStakeholderSatisfaction(programId)
    ])
    
    return {
      benefitRealization,
      riskStatus,
      resourceUtilization,
      scheduleAdherence,
      stakeholderSatisfaction,
      overallHealth: this.calculateOverallHealth([
        benefitRealization,
        riskStatus,
        resourceUtilization,
        scheduleAdherence,
        stakeholderSatisfaction
      ])
    }
  }
  
  async calculateBenefitRealization(programId: string): Promise<MetricResult> {
    const result = await db.query(`
      SELECT 
        ROUND((SUM(actual_value) / NULLIF(SUM(expected_value), 0) * 100), 2) as rate
      FROM program_benefits
      WHERE program_id = $1
    `, [programId])
    
    const rate = result.rows[0]?.rate || 0
    
    return {
      value: `${rate}%`,
      numericValue: rate,
      status: rate >= 90 ? 'Excellent' :
              rate >= 75 ? 'On Track' :
              rate >= 50 ? 'At Risk' :
              'Critical',
      color: rate >= 75 ? 'green' : rate >= 50 ? 'yellow' : 'red'
    }
  }
  
  async calculateScheduleAdherence(programId: string): Promise<MetricResult> {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed' AND end_date <= planned_end_date) as on_time
      FROM projects
      WHERE program_id = $1
    `, [programId])
    
    const { total, on_time } = result.rows[0]
    const rate = total > 0 ? (on_time / total) * 100 : 100
    
    return {
      value: `${Math.round(rate)}%`,
      numericValue: rate,
      status: rate >= 85 ? 'On Schedule' : rate >= 70 ? 'Minor Delays' : 'At Risk',
      color: rate >= 85 ? 'green' : rate >= 70 ? 'yellow' : 'red'
    }
  }
  
  async calculateStakeholderSatisfaction(programId: string): Promise<MetricResult> {
    const result = await db.query(`
      SELECT AVG(satisfaction_score) as avg_score
      FROM program_stakeholders
      WHERE program_id = $1
    `, [programId])
    
    const score = result.rows[0]?.avg_score || 0
    
    return {
      value: `${Math.round(score)}%`,
      numericValue: score,
      status: score >= 85 ? 'Positive' : score >= 70 ? 'Neutral' : 'Negative',
      color: score >= 85 ? 'green' : score >= 70 ? 'yellow' : 'red'
    }
  }
}
```

---

### **10. Change Management**

**Activities**:
- Assess change impact
- Manage scope changes
- Communicate changes

**ADPA Implementation**:

```sql
CREATE TABLE program_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Change Details
  change_title VARCHAR(255),
  change_description TEXT,
  change_type VARCHAR(100),        -- scope, budget, schedule, resource
  change_reason TEXT,
  
  -- Impact Assessment
  affects_projects UUID[],
  impact_budget DECIMAL(15,2),
  impact_schedule_days INTEGER,
  impact_risk_score INTEGER,
  impact_benefits DECIMAL(15,2),
  
  -- Approval
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  status VARCHAR(50),              -- pending, approved, rejected, implemented
  
  -- Implementation
  implemented_at TIMESTAMP,
  rollback_plan TEXT
);
```

**UI**: `/programs/[id]/changes`
- Change request form
- Impact assessment calculator
- Approval workflow
- Change log

---

### **11. Integration Management**

**Activities**:
- Coordinate projects
- Manage dependencies
- Align outputs

**ADPA Implementation**: (Uses dependency tables from #2)

**UI**: `/programs/[id]/integration`
- Dependency matrix
- Integration points map
- Handoff tracker
- Output alignment checker

---

## 🔄 **Program Maintenance Checklist**

### Implementation:

```sql
CREATE TABLE program_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  
  -- Task Details
  task_name VARCHAR(255),
  task_category VARCHAR(100),      -- benefits, change, improvement, stakeholder, resource, financial, risk, integration
  frequency VARCHAR(50),           -- daily, weekly, monthly, quarterly, annually
  
  -- Schedule
  last_completed DATE,
  next_due_date DATE,
  
  -- Responsible
  assigned_to UUID REFERENCES users(id),
  
  -- Completion
  status VARCHAR(50),              -- pending, in-progress, completed, overdue
  completion_notes TEXT,
  
  -- Recurring
  is_recurring BOOLEAN DEFAULT TRUE,
  recurrence_rule VARCHAR(100),    -- RRULE format
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-load standard maintenance tasks
INSERT INTO program_maintenance_tasks (task_name, task_category, frequency) VALUES
('Update benefits register', 'benefits', 'monthly'),
('Review risk register', 'risk', 'bi-weekly'),
('Update resource allocations', 'resource', 'weekly'),
('Generate financial report', 'financial', 'monthly'),
('Stakeholder satisfaction survey', 'stakeholder', 'quarterly'),
('Conduct retrospective', 'improvement', 'monthly'),
('Review and approve changes', 'change', 'weekly'),
('Dependency health check', 'integration', 'bi-weekly');
```

**UI**: `/programs/[id]/maintenance`
- Checklist dashboard
- Overdue alerts
- Task assignment
- Completion tracking
- Auto-scheduling

---

## 📋 **Complete Feature Matrix**

### Dashboard Tabs Structure:

**Program Detail Page** (`/programs/[id]`)

```
Tabs:
├─ 1. Overview (Health Dashboard) ⭐ Week 4
│  ├─ 5 health metrics (your template)
│  ├─ Project count cards
│  └─ Quick actions
│
├─ 2. Projects ✅ DONE (Phase 2)
│  ├─ Assigned projects list
│  ├─ Assign/remove projects
│  └─ Project health rollup
│
├─ 3. Prioritization ⭐ Week 1-2
│  ├─ Criteria management
│  ├─ Scoring interface
│  ├─ Rankings display
│  └─ Export reports
│
├─ 4. Finances ⭐ Week 3
│  ├─ Budget vs Actual
│  ├─ Spend trend
│  ├─ ROI calculator
│  └─ Variance analysis
│
├─ 5. Benefits ⭐ Week 7
│  ├─ Benefits register (your template)
│  ├─ Track expected vs actual
│  └─ Realization dashboard
│
├─ 6. Risks Week 5
│  ├─ Risk register
│  ├─ Risk heat map
│  └─ Mitigation tracking
│
├─ 7. Stakeholders Week 6
│  ├─ Stakeholder register
│  ├─ Power/Interest matrix
│  └─ Satisfaction tracking
│
├─ 8. Resources Week 4
│  ├─ Resource allocation
│  ├─ Utilization tracking
│  └─ Conflict resolution
│
├─ 9. Governance Week 6
│  ├─ Board management
│  ├─ Decision log
│  └─ Policy library
│
├─ 10. Roadmap Week 5
│  ├─ Gantt chart
│  ├─ Dependencies
│  └─ Critical path
│
├─ 11. Changes Future
│  ├─ Change requests
│  ├─ Impact assessment
│  └─ Approval workflow
│
└─ 12. Reports Week 7
   ├─ Executive summary
   ├─ PDF/PPTX export
   └─ Email digests
```

---

## 🎯 **Implementation Priority Order**

### **Phase 3A: Quick Wins** (Weeks 1-3) ⭐ **START HERE**

**Week 1**: Prioritization Matrix
- Database tables
- Your 5 default criteria
- Scoring interface
- Rankings calculation
- **Value**: Immediate decision-making capability

**Week 2**: Rankings & Export
- Display rankings (Alpha, Beta, Gamma, Delta format)
- Excel export
- PDF reports
- **Value**: Shareable decisions

**Week 3**: Financial Rollup
- Budget aggregation
- Spend tracking
- ROI calculation
- **Value**: Executive visibility

---

### **Phase 3B: Core Dashboards** (Weeks 4-5)

**Week 4**: Health Dashboard (Your 5 Metrics)
- Benefit Realization (75% - On Track)
- Risk Status (Medium - Monitor Closely)
- Resource Utilization (82% - Efficient)
- Schedule Adherence (90% - On Schedule)
- Stakeholder Satisfaction (88% - Positive)
- **Value**: At-a-glance program health

**Week 5**: Risk & Roadmap
- Risk register
- Risk heat map
- Gantt chart view
- **Value**: Proactive risk management

---

### **Phase 4: Advanced Features** (Weeks 6-8)

**Week 6**: Governance & Stakeholders
- Board management
- Decision tracking
- Stakeholder register

**Week 7**: Benefits & Reporting
- Benefits tracking (your template)
- Executive reports
- Email digests

**Week 8**: Integration & Maintenance
- Dependency management
- Maintenance checklist
- Continuous improvement

---

## ✅ **Success Metrics**

### Executive Satisfaction:
- ✅ 90% of executives satisfied with program visibility
- ✅ 100% of decisions backed by quantitative data
- ✅ 5-minute average time to understand program health

### Program Manager Effectiveness:
- ✅ 60% reduction in reporting time
- ✅ 50% faster decision-making
- ✅ 40% improvement in resource allocation

### Business Outcomes:
- ✅ 20% better benefit realization
- ✅ 25% reduction in cost overruns
- ✅ 30% improvement in schedule adherence

---

## 📊 **Data Model Summary**

### New Tables (12):
1. ✅ `program_health_metrics` - Your 5 metrics
2. ✅ `program_benefits` - Your benefits template
3. ✅ `prioritization_criteria` - Your 5 criteria
4. ✅ `project_priority_scores` - Scoring data
5. `program_governance` - Board structure
6. `program_stakeholders` - Stakeholder register
7. `program_risks` - Risk register
8. `program_resources` - Resource tracking
9. `program_financials` - Financial rollup
10. `program_quality_standards` - Quality criteria
11. `program_changes` - Change control
12. `program_maintenance_tasks` - Checklist

### Views (6):
1. `project_priority_rankings` - Computed rankings
2. `program_benefits_summary` - Rollup metrics
3. `program_risk_status` - Risk health
4. `program_resource_utilization` - Resource efficiency
5. `program_stakeholder_satisfaction` - Satisfaction avg
6. `program_financial_summary` - Budget vs actual

---

## 🚀 **Ready to Start Implementation!**

**Recommended Order**:
1. Week 1: **Prioritization Matrix** (your criteria + sample projects)
2. Week 3: **Financial Rollup** (high executive value)
3. Week 4: **Health Dashboard** (your 5 metrics)
4. Week 7: **Benefits Tracking** (your template)

**All templates, schemas, and UI mockups are ready!**

Would you like me to start implementing **Week 1 (Prioritization Matrix)** right now? I'll use your exact criteria and create the scoring interface! 🎯
