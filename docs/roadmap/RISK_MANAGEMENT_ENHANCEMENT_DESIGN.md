# Risk Management Enhancement Implementation Plan & Design

**Status**: 🟡 In Design  
**Target**: Q1 2026  
**Purpose**: Add playbook infrastructure, automated risk monitoring, resolution workflows, and analytics  
**Last Updated**: January 2025

---

## 📋 Executive Summary

This document defines the **detailed technical design and implementation plan** for enhancing ADPA's risk management system with:

1. **Operational Playbooks** - Standardized response procedures for risk/issue scenarios
2. **Automated Risk Monitoring** - Proactive trigger rules for risk identification
3. **Resolution Workflows** - Structured patterns connecting risks → issues → resolutions
4. **Cross-Cutting Analytics** - Risk/issue trends and effectiveness metrics

**Key Design Principles:**
- **Reuse Existing**: Build on `issueService`, `escalationService`, `mitigationPlanService`
- **Playbook-Driven**: Standardized, repeatable response procedures
- **Automated Triggers**: Proactive risk identification and playbook matching
- **End-to-End Tracking**: Full audit trail from risk → issue → resolution
- **Analytics-First**: Built-in metrics for continuous improvement

---

## 🎯 Problem Statement

The current risk management system has solid foundational components but lacks:

1. **Playbook Infrastructure**: Referenced in entity catalog but `operational_playbooks` table not implemented
2. **Automated Risk Monitoring**: No proactive rules to trigger risk identification
3. **Integrated Resolution Workflows**: Need structured patterns for issue resolution
4. **Cross-Cutting Analytics**: Need risk/issue trend analysis and effectiveness metrics

### **Existing Infrastructure (Strengths)**

| Component | Status | Key Features |
|-----------|--------|--------------|
| `issueService.ts` | ✅ Complete | CRUD, status history, `materializeRiskIntoIssue()`, `escalateRiskToIssue()` |
| `mitigationPlanService.ts` | ✅ Complete | Completion tracking, effectiveness metrics |
| `escalationService.ts` | ✅ Complete | Matrix rules, drift detection, notifications |
| Risk Register | ✅ Complete | 17 risks with categories, mitigation strategies |
| Database Schema | ✅ Complete | `risk_appetite`, `risk_checklists`, `issue_log`, `lessons_learned` |

### **Gaps Identified**

- **Playbooks**: Referenced in entity catalog but `operational_playbooks` table not implemented
- **Proactive Monitoring**: No automated rules to trigger risk identification
- **Resolution Workflows**: Need structured patterns for issue resolution
- **Analytics Dashboard**: Need cross-cutting risk/issue analytics

---

## 🏗️ Architecture Overview

### **Component Relationships:**

```
┌─────────────────────────────────────────────────────────────┐
│              Risk Management Enhancement                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Playbooks   │    │   Monitoring │    │  Resolution  │
│  Infrastructure │ │   Automation  │    │  Workflows   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ issueService │  │escalationServ│  │mitigationPlan│
│  (existing)  │  │  ice (existing│  │Service (exist│
│              │  │  )           │  │  ing)        │
└──────────────┘  └──────────────┘  └──────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │   Analytics Dashboard │
              │   (Risk/Issue Trends) │
              └──────────────────────┘
```

### **Data Flow Patterns:**

#### **Pattern 1: Risk → Playbook → Issue Resolution**
```
Risk Identified
    ↓
Playbook Matching (automated)
    ↓
Playbook Execution (manual/auto)
    ↓
Issue Creation (if materialized)
    ↓
Resolution Workflow Tracking
    ↓
Analytics Update
```

#### **Pattern 2: Automated Risk Monitoring**
```
Risk Monitoring Trigger
    ↓
Risk Pattern Detection
    ↓
Playbook Recommendation
    ↓
Notification/Alert
    ↓
Manual/Approved Response
```

---

## 💾 Data Model Design

### **Entity-Relationship Diagram:**

```
┌─────────────────┐
│   projects      │ (existing)
└────────┬────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│      risks                                │ (existing)
│  • id (UUID)                              │
│  • project_id (FK)                        │
│  • title, description, category           │
│  • probability, impact                    │
└────────┬─────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   operational_playbooks                   │ (NEW)
│  • id (UUID)                              │
│  • project_id (FK)                        │
│  • title, description, category           │
│  • trigger_type (auto | manual | threshold)│
│  • applicable_risk_categories (TEXT[])    │
│  • applicable_severity_levels (TEXT[])    │
│  • is_active (BOOLEAN)                    │
└────────┬─────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   playbook_scenarios                      │ (NEW)
│  • id (UUID)                              │
│  • playbook_id (FK)                       │
│  • scenario_condition (JSONB)             │
│  • trigger_type (auto | manual)           │
│  • priority (INTEGER)                     │
└────────┬─────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   playbook_response_steps                 │ (NEW)
│  • id (UUID)                              │
│  • playbook_id (FK)                       │
│  • step_order (INTEGER)                   │
│  • step_title, description                │
│  • step_type (action | approval | notification)│
│  • sla_hours (INTEGER)                    │
│  • assigned_role (TEXT)                   │
└────────┬─────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   playbook_executions                     │ (NEW)
│  • id (UUID)                              │
│  • playbook_id (FK)                       │
│  • triggered_by (risk_id | issue_id)      │
│  • trigger_type (auto | manual)           │
│  • status (pending | in_progress | completed)│
│  • current_step_id (FK)                   │
│  • started_at, completed_at               │
└──────────────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│      issues                               │ (existing, enhanced)
│  • id (UUID)                              │
│  • related_risk_id (FK)                   │
│  • resolution_workflow (JSONB) [NEW]      │
│  • playbook_execution_id (FK) [NEW]       │
└──────────────────────────────────────────┘
```

---

## 📊 Detailed Schema Definition

### **1. Core Tables**

#### **`operational_playbooks`** - Playbook Definitions
```sql
CREATE TABLE operational_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Playbook metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'risk',           -- Risk response playbook
    'incident',       -- Incident response playbook
    'escalation',     -- Escalation procedure playbook
    'resolution'      -- Issue resolution playbook
  )),
  
  -- Trigger configuration
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'auto',      -- Automatically trigger when conditions met
    'manual',    -- Manual execution only
    'threshold'  -- Trigger on threshold breach
  )),
  
  -- Applicability filters
  applicable_risk_categories TEXT[], -- ['technical', 'resource', 'schedule']
  applicable_severity_levels TEXT[], -- ['critical', 'high', 'medium']
  applicable_priority_levels TEXT[], -- ['critical', 'high', 'medium', 'low']
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Versioning (for playbook evolution)
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES operational_playbooks(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_playbooks_project_id ON operational_playbooks(project_id);
CREATE INDEX idx_playbooks_category ON operational_playbooks(category);
CREATE INDEX idx_playbooks_active ON operational_playbooks(is_active) WHERE is_active = true;
CREATE INDEX idx_playbooks_risk_categories ON operational_playbooks USING GIN(applicable_risk_categories);
CREATE INDEX idx_playbooks_severity_levels ON operational_playbooks USING GIN(applicable_severity_levels);
```

#### **`playbook_scenarios`** - Trigger Conditions
```sql
CREATE TABLE playbook_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES operational_playbooks(id) ON DELETE CASCADE,
  
  -- Scenario condition (JSONB for flexible matching)
  scenario_condition JSONB NOT NULL, -- e.g., {"risk_category": "technical", "impact": "high", "probability": "medium"}
  
  -- Trigger configuration
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('auto', 'manual')),
  priority INTEGER DEFAULT 0, -- Higher priority = matched first
  
  -- Description
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique: one scenario per playbook with same condition
  UNIQUE (playbook_id, scenario_condition)
);

-- Indexes
CREATE INDEX idx_scenarios_playbook_id ON playbook_scenarios(playbook_id);
CREATE INDEX idx_scenarios_condition_gin ON playbook_scenarios USING GIN(scenario_condition);
CREATE INDEX idx_scenarios_priority ON playbook_scenarios(priority DESC);
```

#### **`playbook_response_steps`** - Ordered Response Procedures
```sql
CREATE TABLE playbook_response_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES operational_playbooks(id) ON DELETE CASCADE,
  
  -- Step ordering
  step_order INTEGER NOT NULL,
  
  -- Step details
  step_title VARCHAR(255) NOT NULL,
  step_description TEXT,
  step_type VARCHAR(50) NOT NULL CHECK (step_type IN (
    'action',        -- Action to take
    'approval',      -- Approval required
    'notification',  -- Send notification
    'escalation',    -- Escalate to role/person
    'documentation', -- Create/update documentation
    'wait'           -- Wait for condition
  )),
  
  -- Assignment & SLA
  assigned_role VARCHAR(100), -- Role that should execute this step
  sla_hours INTEGER, -- Expected completion time in hours
  
  -- Step configuration (JSONB for flexible step-specific data)
  step_config JSONB DEFAULT '{}', -- e.g., {"notification_channels": ["email", "slack"]}
  
  -- Condition for step execution (optional)
  step_condition JSONB, -- Conditional step execution
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique: one step per order per playbook
  UNIQUE (playbook_id, step_order)
);

-- Indexes
CREATE INDEX idx_steps_playbook_id ON playbook_response_steps(playbook_id);
CREATE INDEX idx_steps_order ON playbook_response_steps(playbook_id, step_order);
CREATE INDEX idx_steps_type ON playbook_response_steps(step_type);
```

#### **`playbook_executions`** - Execution Tracking
```sql
CREATE TABLE playbook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES operational_playbooks(id) ON DELETE CASCADE,
  
  -- What triggered this execution
  triggered_by_type VARCHAR(50) NOT NULL CHECK (triggered_by_type IN ('risk', 'issue', 'escalation', 'manual')),
  triggered_by_id UUID NOT NULL, -- FK to risks.id, issues.id, etc. (polymorphic)
  
  -- Trigger metadata
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('auto', 'manual')),
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trigger_reason TEXT, -- Why was this playbook triggered
  
  -- Execution status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting start
    'in_progress',  -- Currently executing
    'completed',    -- All steps completed
    'cancelled',    -- Execution cancelled
    'failed'        -- Execution failed
  )),
  
  -- Current progress
  current_step_id UUID REFERENCES playbook_response_steps(id) ON DELETE SET NULL,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  
  -- Execution tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  
  -- Execution context (JSONB for flexible tracking)
  execution_context JSONB DEFAULT '{}', -- Store runtime data
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_executions_playbook_id ON playbook_executions(playbook_id);
CREATE INDEX idx_executions_triggered_by ON playbook_executions(triggered_by_type, triggered_by_id);
CREATE INDEX idx_executions_status ON playbook_executions(status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_executions_started_at ON playbook_executions(started_at DESC);
CREATE INDEX idx_executions_triggered_by_user ON playbook_executions(triggered_by_user_id);
```

#### **`playbook_step_executions`** - Individual Step Tracking
```sql
CREATE TABLE playbook_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES playbook_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES playbook_response_steps(id) ON DELETE CASCADE,
  
  -- Step execution status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not started
    'in_progress',  -- Currently executing
    'completed',    -- Step completed
    'skipped',      -- Step skipped (conditional)
    'failed'        -- Step failed
  )),
  
  -- Assignment & completion
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ, -- Calculated from started_at + sla_hours
  sla_breached BOOLEAN DEFAULT false,
  
  -- Step results
  completion_notes TEXT,
  completion_evidence JSONB DEFAULT '{}', -- Links, attachments, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique: one execution per step per playbook execution
  UNIQUE (execution_id, step_id)
);

-- Indexes
CREATE INDEX idx_step_executions_execution_id ON playbook_step_executions(execution_id);
CREATE INDEX idx_step_executions_step_id ON playbook_step_executions(step_id);
CREATE INDEX idx_step_executions_status ON playbook_step_executions(status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_step_executions_assigned_to ON playbook_step_executions(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_step_executions_sla_deadline ON playbook_step_executions(sla_deadline) WHERE status IN ('pending', 'in_progress');
```

### **2. Schema Enhancements to Existing Tables**

#### **Enhance `issues` table:**
```sql
-- Add playbook execution tracking to issues table
ALTER TABLE issues 
  ADD COLUMN IF NOT EXISTS playbook_execution_id UUID REFERENCES playbook_executions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_workflow JSONB DEFAULT '{}'; -- Track resolution steps

-- Index
CREATE INDEX IF NOT EXISTS idx_issues_playbook_execution ON issues(playbook_execution_id) WHERE playbook_execution_id IS NOT NULL;
```

#### **Enhance `risks` table:**
```sql
-- Add playbook tracking to risks table
ALTER TABLE risks 
  ADD COLUMN IF NOT EXISTS recommended_playbook_id UUID REFERENCES operational_playbooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS playbook_execution_id UUID REFERENCES playbook_executions(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risks_recommended_playbook ON risks(recommended_playbook_id) WHERE recommended_playbook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_playbook_execution ON risks(playbook_execution_id) WHERE playbook_execution_id IS NOT NULL;
```

### **3. Helper Functions & Triggers**

#### **Auto-update `updated_at` timestamp:**
```sql
CREATE OR REPLACE FUNCTION update_playbook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all playbook tables
CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON operational_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_playbook_updated_at();

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON playbook_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_playbook_updated_at();

CREATE TRIGGER update_steps_updated_at
  BEFORE UPDATE ON playbook_response_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_playbook_updated_at();

CREATE TRIGGER update_executions_updated_at
  BEFORE UPDATE ON playbook_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_playbook_updated_at();

CREATE TRIGGER update_step_executions_updated_at
  BEFORE UPDATE ON playbook_step_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_playbook_updated_at();
```

#### **Auto-update execution progress:**
```sql
CREATE OR REPLACE FUNCTION update_execution_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_steps count when step execution status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
    UPDATE playbook_executions
    SET 
      completed_steps = completed_steps + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.execution_id;
    
    -- Check if all steps are completed
    UPDATE playbook_executions
    SET 
      status = 'completed',
      completed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.execution_id
      AND completed_steps >= total_steps
      AND status = 'in_progress';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_execution_progress_trigger
  AFTER INSERT OR UPDATE ON playbook_step_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_execution_progress();
```

---

## 🔄 Data Flow Patterns

### **Pattern 1: Risk → Playbook Matching → Execution**

```typescript
// 1. Risk identified (existing risk creation)
const risk = await createRisk({
  project_id: projectId,
  title: 'API rate limit exceeded',
  category: 'technical',
  impact: 'high',
  probability: 'medium',
  // ...
});

// 2. Find matching playbooks (NEW - playbookService)
const matchingPlaybooks = await playbookService.findMatchingPlaybooks({
  risk_category: risk.category,
  impact: risk.impact,
  probability: risk.probability,
  project_id: risk.project_id
});

// 3. Recommend playbook (if auto-trigger disabled)
if (matchingPlaybooks.length > 0 && !matchingPlaybooks[0].trigger_type === 'auto') {
  await updateRisk(risk.id, {
    recommended_playbook_id: matchingPlaybooks[0].id
  });
  
  // Notify user about recommended playbook
  await notificationService.send({
    type: 'playbook_recommendation',
    user_id: risk.owner,
    message: `Playbook "${matchingPlaybooks[0].title}" recommended for risk "${risk.title}"`
  });
}

// 4. Auto-trigger playbook (if configured)
if (matchingPlaybooks.length > 0 && matchingPlaybooks[0].trigger_type === 'auto') {
  const execution = await playbookService.executePlaybook({
    playbook_id: matchingPlaybooks[0].id,
    triggered_by_type: 'risk',
    triggered_by_id: risk.id,
    trigger_type: 'auto',
    triggered_by_user_id: risk.owner
  });
  
  // Update risk with execution
  await updateRisk(risk.id, {
    playbook_execution_id: execution.id
  });
}
```

### **Pattern 2: Playbook Execution → Issue Creation**

```typescript
// Playbook execution triggers issue creation (step type: 'action')
async function executePlaybookStep(stepExecutionId: string, step: PlaybookStep) {
  if (step.step_type === 'action' && step.step_config?.action_type === 'create_issue') {
    // Get playbook execution context
    const execution = await getPlaybookExecution(stepExecutionId);
    const risk = await getRisk(execution.triggered_by_id);
    
    // Create issue from risk using existing service
    const issue = await issueService.escalateRiskToIssue(risk.id, execution.triggered_by_user_id, {
      trigger_reason: 'playbook_triggered',
      trigger_description: `Automated issue creation via playbook "${execution.playbook.title}"`
    });
    
    // Link issue to playbook execution
    await updateIssue(issue.id, {
      playbook_execution_id: execution.id
    });
    
    // Update step execution
    await updateStepExecution(stepExecutionId, {
      status: 'completed',
      completion_notes: `Issue #${issue.id} created`,
      completion_evidence: { issue_id: issue.id }
    });
  }
}
```

### **Pattern 3: Resolution Workflow Tracking**

```typescript
// Enhanced issue resolution with playbook tracking
async function resolveIssue(issueId: string, userId: string, resolution: string) {
  const issue = await getIssue(issueId);
  
  // If issue has playbook execution, track resolution in workflow
  if (issue.playbook_execution_id) {
    const execution = await getPlaybookExecution(issue.playbook_execution_id);
    
    // Update resolution workflow
    await updateIssue(issueId, {
      resolution: resolution,
      status: 'resolved',
      date_resolved: new Date(),
      resolution_workflow: {
        ...issue.resolution_workflow,
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolution_notes: resolution,
        playbook_execution_completed: execution.status === 'completed',
        playbook_steps_completed: execution.completed_steps,
        playbook_steps_total: execution.total_steps
      }
    });
    
    // Complete playbook execution if all steps done
    if (execution.completed_steps >= execution.total_steps) {
      await updatePlaybookExecution(execution.id, {
        status: 'completed',
        completed_at: new Date()
      });
    }
  } else {
    // Standard resolution (no playbook)
    await updateIssue(issueId, {
      resolution: resolution,
      status: 'resolved',
      date_resolved: new Date()
    });
  }
}
```

---

## 📡 API Design

### **REST Endpoints**

#### **Playbooks API:**
```
GET    /api/playbooks                    # List playbooks (paginated, filtered)
GET    /api/playbooks/:id                # Get playbook details
POST   /api/playbooks                    # Create new playbook
PUT    /api/playbooks/:id                # Update playbook
DELETE /api/playbooks/:id                # Delete playbook
POST   /api/playbooks/:id/execute        # Execute playbook for risk/issue
GET    /api/playbooks/match              # Find matching playbooks (query params: risk_category, impact, etc.)
GET    /api/playbooks/:id/scenarios      # Get playbook scenarios
GET    /api/playbooks/:id/steps          # Get playbook steps
```

#### **Playbook Executions API:**
```
GET    /api/playbooks/executions         # List executions (paginated, filtered)
GET    /api/playbooks/executions/:id     # Get execution details
POST   /api/playbooks/executions/:id/cancel  # Cancel execution
GET    /api/playbooks/executions/:id/steps   # Get execution step statuses
POST   /api/playbooks/executions/:id/steps/:stepId/complete  # Complete step
```

#### **Enhanced Issues API:**
```
GET    /api/issues/:id/resolution-recommendations  # Get resolution recommendations (NEW)
GET    /api/issues/:id/resolution-metrics          # Get resolution metrics (NEW)
```

#### **Enhanced Risks API:**
```
GET    /api/risks/:id/playbook-recommendations     # Get playbook recommendations (NEW)
POST   /api/risks/:id/trigger-playbook             # Manually trigger playbook (NEW)
```

### **WebSocket Events (Socket.io)**

#### **Server → Client:**
```typescript
// Playbook recommendation
socket.on('playbook:recommendation', (data: {
  risk_id: string,
  playbook_id: string,
  playbook_title: string,
  match_score: number,
}));

// Playbook execution started
socket.on('playbook:execution-started', (data: {
  execution_id: string,
  playbook_id: string,
  triggered_by_type: string,
  triggered_by_id: string,
}));

// Playbook step completed
socket.on('playbook:step-completed', (data: {
  execution_id: string,
  step_id: string,
  step_title: string,
  completed_by: string,
  next_step?: string,
}));

// Playbook execution completed
socket.on('playbook:execution-completed', (data: {
  execution_id: string,
  playbook_id: string,
  completed_steps: number,
  total_steps: number,
  execution_time_minutes: number,
}));
```

---

## 🔐 Security & Access Control

### **Row-Level Security (RLS) Policies:**

```sql
-- Enable RLS on all playbook tables
ALTER TABLE operational_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_response_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_step_executions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see playbooks in their projects
CREATE POLICY playbooks_select_policy ON operational_playbooks
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE owner_id = current_setting('app.current_user_id')::UUID
        OR id IN (
          SELECT project_id FROM project_members 
          WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    )
  );

-- Policy: Only project owners/admins can create/edit playbooks
CREATE POLICY playbooks_insert_policy ON operational_playbooks
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE owner_id = current_setting('app.current_user_id')::UUID
    )
  );

-- Similar policies for other tables...
```

---

## 📈 Analytics & Reporting

### **Metrics to Track:**

#### **Playbook Metrics:**
- **Utilization Rate**: % of risks/issues that used playbooks
- **Execution Time**: Average time from trigger to completion
- **Completion Rate**: % of executions that complete successfully
- **SLA Compliance**: % of steps completed within SLA
- **Most Used Playbooks**: Top playbooks by execution count

#### **Risk-to-Issue Metrics:**
- **Conversion Rate**: % of risks that materialize to issues
- **Time to Materialization**: Average time from risk creation to issue
- **Playbook Effectiveness**: % of playbook-executed risks that resolve before materialization

#### **Resolution Metrics:**
- **Resolution Time**: Average time from issue creation to resolution
- **Resolution Time by Category**: Breakdown by issue category
- **Resolution Time with/without Playbooks**: Compare playbook vs manual resolution
- **Reopening Rate**: % of resolved issues that reopen

### **Analytics Queries:**

```sql
-- Risk-to-Issue conversion rate
SELECT 
  COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN r.id END)::float / 
  COUNT(DISTINCT r.id)::float * 100 as conversion_rate
FROM risks r
LEFT JOIN issues i ON i.related_risk_id = r.id
WHERE r.created_at >= NOW() - INTERVAL '30 days';

-- Playbook execution time
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_execution_time_minutes
FROM playbook_executions
WHERE status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days';

-- Resolution time with vs without playbooks
SELECT 
  CASE WHEN i.playbook_execution_id IS NOT NULL THEN 'with_playbook' ELSE 'without_playbook' END as resolution_type,
  AVG(EXTRACT(EPOCH FROM (i.date_resolved - i.date_raised)) / 3600) as avg_resolution_hours
FROM issues i
WHERE i.status = 'resolved'
  AND i.date_resolved >= NOW() - INTERVAL '30 days'
GROUP BY resolution_type;
```

---

## 🧪 Testing Strategy

### **Unit Tests:**

#### **`playbookService.test.ts`:**
- Playbook CRUD operations
- Playbook matching logic (scenario conditions)
- Playbook execution creation
- Step completion tracking

#### **`escalationService.test.ts` (enhanced):**
- Risk indicator detection
- Playbook recommendation integration
- Escalation with playbook suggestions

#### **`issueService.test.ts` (enhanced):**
- Resolution workflow tracking
- Resolution recommendations from playbooks
- Resolution metrics calculation

### **Integration Tests:**

#### **`playbook-execution.test.ts`:**
- Full playbook execution flow (risk → playbook → issue → resolution)
- Step-by-step execution tracking
- SLA deadline calculation
- Execution completion logic

#### **`resolution-workflow.test.ts`:**
- Issue resolution with playbook execution
- Resolution workflow JSONB updates
- Playbook execution completion triggers

### **E2E Tests (Playwright):**

#### **Playbook Management:**
- Create new playbook
- Add scenarios and steps
- Enable/disable playbook
- Delete playbook

#### **Playbook Execution:**
- Risk created → playbook recommended
- Manual playbook execution
- Step-by-step completion
- Execution completion notification

#### **Resolution Workflow:**
- Issue resolved with playbook execution
- Resolution timeline display
- Resolution metrics dashboard

---

## 🚀 Implementation Phases

### **Phase 1: Database & Core Service (Estimated: 2 hours)**

1. **Create Migration** (`XXX_create_operational_playbooks.sql`):
   - Create all playbook tables
   - Add indexes and constraints
   - Add helper functions and triggers
   - Enhance existing `issues` and `risks` tables

2. **Implement `playbookService.ts`:**
   - CRUD operations for playbooks
   - Playbook matching logic
   - Playbook execution tracking
   - Step completion logic

3. **Add `playbookRoutes.ts`:**
   - REST API endpoints
   - Request validation (Joi)
   - Error handling

4. **Write Unit Tests:**
   - `playbookService.test.ts`
   - Test all CRUD and matching logic

### **Phase 2: Integration (Estimated: 1.5 hours)**

1. **Enhance `escalationService.ts`:**
   - Add `checkRiskIndicators()` method
   - Integrate playbook recommendation in `findMatchingRule()`
   - Add proactive risk monitoring

2. **Enhance `issueService.ts`:**
   - Add `resolution_workflow` field handling
   - Add `getResolutionRecommendations()` method
   - Add `getResolutionMetrics()` method
   - Update `updateIssue()` for workflow tracking

3. **Write Integration Tests:**
   - `playbook-execution.test.ts`
   - `resolution-workflow.test.ts`

### **Phase 3: UI Components (Estimated: 2 hours)**

1. **Playbook Management UI:**
   - Playbook list/detail views
   - Scenario and step configuration forms
   - Playbook activation/deactivation

2. **Resolution Workflow Component:**
   - `ResolutionWorkflowCard.tsx`
   - Current resolution step display
   - Suggested playbook actions
   - SLA countdown timer
   - Resolution history timeline

3. **Analytics Dashboard:**
   - `RiskIssueAnalytics.tsx`
   - Risk-to-Issue conversion charts
   - Mitigation effectiveness trends
   - Playbook utilization metrics
   - Resolution time analytics

### **Phase 4: Documentation (Estimated: 30 mins)**

1. **Update Risk Management Docs:**
   - Playbook user guide
   - Resolution workflow documentation
   - Analytics dashboard guide

2. **Update API Documentation:**
   - New playbook endpoints
   - Enhanced issue/risk endpoints

---

## ❓ Design Decisions & Questions

### **1. Playbook Trigger Preferences**

**Question**: Should playbooks be automatically triggered when risks match, or require manual confirmation?

**Recommendation**: **Hybrid Approach**
- **Auto-trigger**: For `critical`/`emergency` severity risks (user-configurable threshold)
- **Manual-trigger**: For `high`/`medium` severity risks (user approval required)
- **User-configurable**: Allow project owners to set auto-trigger thresholds per playbook

**Implementation**: Use `trigger_type` field in `playbook_scenarios` table:
- `auto` - Automatically trigger when condition matches
- `manual` - Require user confirmation (send notification)

---

### **2. SLA Configuration**

**Question**: What are the default SLA hours for playbook step completion?

**Recommendation**: **Priority-Based Defaults**
- **Critical**: 4 hours
- **High**: 8 hours
- **Medium**: 24 hours
- **Low**: 72 hours

**Implementation**: Configurable per step in `playbook_response_steps.sla_hours`, with defaults based on step priority.

---

### **3. Notification Channels**

**Question**: Should playbook execution notifications use the same channels as escalation (email, Slack, SMS)?

**Recommendation**: **Unified Notification System**
- Reuse existing `emailNotificationService` and `escalationService` notification infrastructure
- Add playbook-specific notification templates
- Allow per-step notification channel configuration (via `step_config` JSONB)

**Implementation**: Extend `step_config` JSONB:
```json
{
  "notification_channels": ["email", "slack"],
  "notify_on_start": true,
  "notify_on_completion": true,
  "notify_on_sla_breach": true
}
```

---

### **4. Analytics Scope**

**Question**: Should the analytics dashboard aggregate across all projects or be project-specific?

**Recommendation**: **Multi-Level Analytics**
- **Project-Level**: Default view (user's projects only)
- **Program-Level**: Aggregate across program projects (for program managers)
- **Organization-Level**: Aggregate across all projects (for admins)

**Implementation**: Use existing `projects` and `programs` table relationships, with RLS policies enforcing access control.

---

## 📦 Migration Plan

### **Migration File: `XXX_create_operational_playbooks.sql`**

```sql
-- Migration XXX: Operational Playbooks System
-- Purpose: Add playbook infrastructure for standardized risk/issue response procedures
-- Components:
--   * operational_playbooks - Playbook definitions
--   * playbook_scenarios - Trigger conditions
--   * playbook_response_steps - Ordered response procedures
--   * playbook_executions - Execution tracking
--   * playbook_step_executions - Individual step tracking

BEGIN;

-- [All table definitions, indexes, triggers, and functions from schema design above]

-- Seed data: Example playbooks for common scenarios
INSERT INTO operational_playbooks (id, project_id, title, description, category, trigger_type, is_active)
SELECT 
  gen_random_uuid(),
  p.id,
  'Technical Risk Response',
  'Standard response procedure for technical risks',
  'risk',
  'manual',
  true
FROM projects p
LIMIT 1; -- Example for first project

COMMIT;
```

---

## 📚 References

- [ADPA Database Schema Overview](../07-architecture/DATABASE_SCHEMA_OVERVIEW.md)
- [Entity Type Issues Log Documentation](../06-features/ENTITY_TYPE_ISSUES_LOG.md)
- [Escalation Matrix Implementation](../06-features/legacy/ESCALATION_MATRIX_IMPLEMENTATION.md)
- [PMBOK 8 Risk Management Domain](https://www.pmi.org/pmbok-guide-standards/foundational/pmbok)

---

**Status**: ✅ Design Complete - Ready for Implementation  
**Next Action**: Create SQL migration file (`server/migrations/XXX_create_operational_playbooks.sql`)
