# Baseline Extraction with PMBOK Process Groups
**Organizing Baseline Components by Project Phase**

---

## 🎯 **PMBOK 7 Process Groups**

### **1. Initiating Process Group**
**Purpose:** Define a new project or phase

**Baseline Components:**
- ✅ **Project Charter**
  - Project purpose and justification
  - High-level requirements
  - Success criteria
  - Initial stakeholder list
  - Assigned project manager
  - Authority level

- ✅ **Stakeholder Register** (Initial)
  - Key stakeholders identified
  - Power/Interest classification
  - Initial engagement strategy

**Completeness Indicators:**
- 🟢 Complete: Charter exists, stakeholders identified
- 🟡 Partial: Charter exists, stakeholders incomplete
- 🔴 Missing: No charter or stakeholder information

---

### **2. Planning Process Group**
**Purpose:** Establish scope, refine objectives, define actions

**Baseline Components:**

#### **Scope Baseline:**
- ✅ **Scope Management Plan**
  - WBS (Work Breakdown Structure)
  - Deliverables
  - Acceptance criteria
  - Scope boundaries (inclusions/exclusions)
  - Change control process

#### **Schedule Baseline:**
- ✅ **Schedule Management Plan**
  - Project timeline
  - Milestones
  - Critical path
  - Activity list
  - Duration estimates
  - Dependencies
  - Buffers

#### **Cost Baseline:**
- ✅ **Cost Management Plan**
  - Budget breakdown by category
  - Cost estimates
  - Contingency reserves
  - Funding requirements
  - Cost control thresholds

#### **Quality Baseline:**
- ✅ **Quality Management Plan**
  - Quality standards
  - Quality metrics
  - Testing approach
  - Acceptance criteria

#### **Resource Baseline:**
- ✅ **Resource Management Plan**
  - Team structure
  - Role definitions
  - Resource allocation
  - Skill requirements
  - Training needs

#### **Communications Baseline:**
- ✅ **Communications Management Plan**
  - Stakeholder communication matrix
  - Reporting frequency
  - Communication channels

#### **Risk Baseline:**
- ✅ **Risk Management Plan**
  - Risk register
  - Risk categories
  - Probability/Impact matrix
  - Mitigation strategies
  - Risk owners

#### **Procurement Baseline:**
- ✅ **Procurement Management Plan**
  - Vendor requirements
  - Contract types
  - Procurement approach

**Completeness Indicators:**
- 🟢 Complete: All 8 subsidiary plans exist
- 🟡 Partial: Core plans exist (Scope, Schedule, Cost)
- 🔴 Missing: Fewer than 3 plans documented

---

### **3. Executing Process Group**
**Purpose:** Complete the work defined in project management plan

**Baseline Components:**
- ✅ **Team Performance Data**
  - Resource utilization
  - Team velocity
  - Productivity metrics

- ✅ **Quality Assurance Results**
  - Testing completion %
  - Defect metrics
  - Quality audit results

- ✅ **Deliverable Status**
  - Work completed
  - Acceptance status
  - Client feedback

**Completeness Indicators:**
- 🟢 Complete: Work in progress with tracking
- 🟡 Partial: Some deliverables started
- 🔴 Not Started: Project in planning phase

---

### **4. Monitoring & Controlling Process Group**
**Purpose:** Track, review, and regulate progress and performance

**Baseline Components:**
- ✅ **Performance Measurement Baseline (PMB)**
  - Earned Value Management (EVM)
  - Schedule Performance Index (SPI)
  - Cost Performance Index (CPI)
  - Variance analysis

- ✅ **Change Log**
  - Approved changes
  - Change impact
  - Baseline versions

- ✅ **Issue Log**
  - Open issues
  - Issue status
  - Resolution tracking

- ✅ **Risk Register Updates**
  - New risks identified
  - Risk status changes
  - Mitigation effectiveness

**Completeness Indicators:**
- 🟢 Complete: Active monitoring with metrics
- 🟡 Partial: Some tracking in place
- 🔴 Missing: No monitoring metrics

---

### **5. Closing Process Group**
**Purpose:** Finalize all activities to formally close project or phase

**Baseline Components:**
- ✅ **Final Deliverables**
  - Acceptance sign-off
  - Documentation complete
  - Handover complete

- ✅ **Lessons Learned**
  - What went well
  - What to improve
  - Recommendations

- ✅ **Project Archives**
  - Final reports
  - Contract closure
  - Resource release

**Completeness Indicators:**
- 🟢 Complete: Project closed with documentation
- 🟡 Partial: In closing phase
- 🔴 Not Applicable: Project active

---

## 📊 **Baseline View by Process Group**

### **Example UI Structure:**

```
┌─────────────────────────────────────────────────────┐
│  PROJECT BASELINE - PMBOK PROCESS GROUP VIEW        │
├─────────────────────────────────────────────────────┤

📋 INITIATING PROCESS GROUP (100% Complete)
  ✅ Project Charter
     - Purpose: AI-Powered Baseline & Drift Detection
     - Budget: $400,000
     - Timeline: 12 months
     - PM: Menno Drescher
  
  ✅ Stakeholder Register
     - 15 stakeholders identified
     - 3 high power/high interest
     - Engagement strategy defined

📝 PLANNING PROCESS GROUP (85% Complete)
  ✅ Scope Baseline (100%)
     - 5 deliverables defined
     - Boundaries clear
     - WBS documented
  
  ✅ Schedule Baseline (95%)
     - 12 milestones defined
     - Critical path identified
     - ⚠️ Activity-level estimates missing
  
  ✅ Cost Baseline (100%)
     - $400K budget
     - 4 categories
     - 15% contingency
  
  ⚠️ Quality Baseline (60%)
     - Standards defined
     - ⚠️ Testing approach incomplete
  
  ⚠️ Resource Baseline (70%)
     - 9 roles defined
     - ⚠️ Allocation percentages missing
  
  ✅ Risk Baseline (90%)
     - 18 risks identified
     - Mitigation strategies defined
  
  ⚠️ Communications Baseline (50%)
     - ⚠️ Communication plan incomplete
  
  ❌ Procurement Baseline (0%)
     - ❌ Not documented

🚀 EXECUTING PROCESS GROUP (20% Complete)
  ⏳ Project just started
  ⚠️ Limited execution data available

📊 MONITORING & CONTROLLING (40% Complete)
  ✅ Change Log exists
  ⚠️ Performance metrics not yet tracked
  ❌ EVM not implemented

🏁 CLOSING PROCESS GROUP (0% Complete)
  ⏳ Not applicable (project active)

├─────────────────────────────────────────────────────┤
│  OVERALL BASELINE COMPLETENESS: 73%                 │
│                                                     │
│  Next Steps:                                        │
│  1. Complete activity-level estimates (Schedule)    │
│  2. Define testing approach (Quality)               │
│  3. Add resource allocation % (Resources)           │
│  4. Create communication plan (Communications)      │
│                                                     │
│  [View Details by Phase] [Generate Report] [Approve]│
└─────────────────────────────────────────────────────┘
```

---

## 🎨 **Visual Process Group Dashboard**

```
┌─────────────────────────────────────────────────────┐
│  BASELINE COMPLETENESS BY PROCESS GROUP             │
├─────────────────────────────────────────────────────┤

INITIATING    ████████████████████ 100%  ✅ Complete
PLANNING      ████████████████░░░░  85%  🟡 Good
EXECUTING     ████░░░░░░░░░░░░░░░░  20%  ⏳ Started
MONITORING    ████████░░░░░░░░░░░░  40%  ⚠️ Partial
CLOSING       ░░░░░░░░░░░░░░░░░░░░   0%  ⏳ N/A

└─────────────────────────────────────────────────────┘
```

---

## 📋 **Enhanced Baseline Extraction Output**

### **Current Format:**
```json
{
  "scope_baseline": { ... },
  "cost_baseline": { ... },
  "schedule_baseline": { ... }
}
```

### **Enhanced Format with Process Groups:**
```json
{
  "process_groups": {
    "initiating": {
      "completeness": 100,
      "components": {
        "project_charter": {
          "status": "complete",
          "data": {
            "project_name": "ADPA Baseline Drift Detection",
            "purpose": "Automate baseline creation and drift detection",
            "budget": 400000,
            "timeline_months": 12,
            "success_criteria": [...]
          }
        },
        "stakeholder_register": {
          "status": "complete",
          "data": {
            "stakeholders": 15,
            "high_power_high_interest": 3,
            "engagement_strategies": [...]
          }
        }
      }
    },
    "planning": {
      "completeness": 85,
      "components": {
        "scope_baseline": {
          "status": "complete",
          "completeness": 100,
          "data": {
            "deliverables": [...],
            "wbs": [...],
            "boundaries": {...}
          }
        },
        "schedule_baseline": {
          "status": "good",
          "completeness": 95,
          "missing": ["Activity-level estimates"],
          "data": {
            "duration_months": 12,
            "milestones": [...],
            "critical_path": [...]
          }
        },
        "cost_baseline": {
          "status": "complete",
          "completeness": 100,
          "data": {
            "total_budget": 400000,
            "categories": {...},
            "contingency": 0.15
          }
        }
      }
    },
    "executing": {
      "completeness": 20,
      "status": "in_progress",
      "components": {...}
    },
    "monitoring_controlling": {
      "completeness": 40,
      "status": "partial",
      "components": {...}
    },
    "closing": {
      "completeness": 0,
      "status": "not_applicable",
      "reason": "Project active"
    }
  },
  "overall_completeness": 73,
  "recommendations": [
    {
      "process_group": "planning",
      "component": "schedule_baseline",
      "issue": "Activity-level estimates missing",
      "impact": "Schedule completeness 95% → 100%",
      "recommendation": "Create Activity List with Estimates",
      "template": "Activity List",
      "priority": "medium"
    }
  ]
}
```

---

## 🎯 **Process Group Analysis**

### **For Each Process Group, Show:**

1. **Completeness %**
   - Overall percentage for that phase
   - Visual progress bar

2. **Component Status**
   - Complete (🟢), Partial (🟡), Missing (🔴), N/A (⏳)
   - Specific gaps identified

3. **Phase Readiness**
   - Can project proceed to next phase?
   - What's blocking progression?

4. **Recommendations**
   - What documents to create/enhance
   - Which templates to use
   - Estimated impact

---

## 📊 **Example: Planning Phase Detail**

```
📝 PLANNING PROCESS GROUP (85% Complete)

KNOWLEDGE AREAS:

1. Scope Management (100%) ✅
   ✅ Scope Management Plan
   ✅ WBS
   ✅ Deliverables defined
   ✅ Acceptance criteria
   
2. Schedule Management (95%) 🟡
   ✅ Schedule Management Plan
   ✅ Milestones (12)
   ✅ Critical path
   ⚠️ Missing: Activity-level estimates
   💡 Create: Activity List (2 hours)
   
3. Cost Management (100%) ✅
   ✅ Cost Management Plan
   ✅ Budget breakdown ($400K)
   ✅ Contingency (15%)
   ✅ Cost control process
   
4. Quality Management (60%) 🟡
   ✅ Quality standards
   ⚠️ Missing: Testing approach
   ⚠️ Missing: Quality metrics
   💡 Create: Quality Assurance Plan (3 hours)
   
5. Resource Management (70%) 🟡
   ✅ Team structure (9 roles)
   ⚠️ Missing: Allocation percentages
   💡 Create: Resource Allocation Matrix (1 hour)
   
6. Communications Management (50%) 🟡
   ⚠️ Missing: Communication plan
   💡 Create: Communications Matrix (2 hours)
   
7. Risk Management (90%) ✅
   ✅ Risk register (18 risks)
   ✅ Mitigation strategies
   ⚠️ Missing: Risk response owners
   
8. Procurement Management (0%) ❌
   ❌ No procurement documented
   💡 If applicable: Create Procurement Plan

PLANNING PHASE READINESS:
✅ READY TO PROCEED TO EXECUTION
   Core planning (Scope/Schedule/Cost) complete
   
   Optional enhancements:
   - Quality approach refinement
   - Resource allocation detail
   - Communications matrix

[Proceed to Execution] [Enhance Planning] [View Gaps]
```

---

## 🚀 **Implementation Updates Needed**

### **1. Backend (`baselineService.ts`):**
```typescript
// Add process group classification
const PROCESS_GROUP_MAPPING = {
  initiating: {
    components: ['project_charter', 'stakeholder_register'],
    weight: 0.15
  },
  planning: {
    components: ['scope_baseline', 'schedule_baseline', 'cost_baseline', 
                 'quality_baseline', 'resource_baseline', 'risk_baseline',
                 'communications_baseline', 'procurement_baseline'],
    weight: 0.50
  },
  executing: {
    components: ['deliverable_status', 'team_performance', 'quality_results'],
    weight: 0.15
  },
  monitoring_controlling: {
    components: ['performance_baseline', 'change_log', 'issue_log'],
    weight: 0.15
  },
  closing: {
    components: ['final_deliverables', 'lessons_learned', 'archives'],
    weight: 0.05
  }
};

// Calculate completeness by process group
function calculateProcessGroupCompleteness(baseline: any) {
  const results = {};
  
  for (const [group, config] of Object.entries(PROCESS_GROUP_MAPPING)) {
    const components = config.components;
    const completeness = components.map(c => 
      getComponentCompleteness(baseline, c)
    ).reduce((a, b) => a + b, 0) / components.length;
    
    results[group] = {
      completeness: Math.round(completeness),
      status: getStatus(completeness),
      components: getComponentDetails(baseline, components)
    };
  }
  
  return results;
}
```

### **2. Frontend UI (`page.tsx`):**
Add new tab or section:
```typescript
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="process-groups">PMBOK Process Groups</TabsTrigger>
    <TabsTrigger value="components">Components</TabsTrigger>
  </TabsList>
  
  <TabsContent value="process-groups">
    <ProcessGroupView baseline={viewingBaseline} />
  </TabsContent>
</Tabs>
```

### **3. Formal Document:**
Add PMBOK section:
```markdown
## 2. Baseline Structure by PMBOK Process Group

### 2.1 Initiating Process Group
[Project Charter details]
[Stakeholder Register]

### 2.2 Planning Process Group
[Scope Baseline]
[Schedule Baseline]
[Cost Baseline]
[etc.]

### 2.3 Monitoring & Controlling
[Performance Baseline]
[Change Management]
```

---

**This adds critical PMBOK governance structure to your baseline!** 🎯

**Want me to implement the UI component to display this?**

