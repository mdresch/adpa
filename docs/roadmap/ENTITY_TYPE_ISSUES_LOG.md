# New Entity Type: Issues Log (Archived)

**Status**: ✅ Completed  
**Priority**: 🟡 **MEDIUM-HIGH** (P1)  
**PMBOK 8 Domain**: Project Work Performance Domain, Uncertainty Domain  
**Target Release**: Q1 2026  
**Completed**: February 2026  
**Archive**: See `archive/2026/ENTITY_TYPE_ISSUES_LOG_COMPLETED.md`

---

## 📋 Feature Overview

Add **Issues** entity type to track problems, blockers, and impediments encountered during project execution. Issues are distinct from Risks (future events) - Issues are current problems requiring immediate resolution.

---

## 🎯 Problem Statement

**Current Gap:**
- We extract **Risks** (potential future problems)
- We have NO **Issues** (current problems happening now)
- Missing execution problem tracking for PMBOK 8

**Key Difference:**
- **Risk**: "Database server MIGHT fail" (probability: 30%, future event)
- **Issue**: "Database server IS currently down, blocking 5 developers" (happening now, needs resolution)

**PMBOK 8 Requirement:**
> "Manage project work execution... coordinate processes and systems... address impediments and blockers"

**Impact:**
- ⚠️ **Current problems not systematically tracked**
- ⚠️ **Blockers slow down project** (no visibility)
- ⚠️ **Resolution not documented** (repeated issues)
- ⚠️ **Incomplete Project Work Domain** (65% vs. 80% with this)

---

## ✨ Proposed Solution

### New Entity: Issues

Track current problems with priority, impact, ownership, and resolution tracking.

#### Entity Schema

```typescript
interface Issue {
  issue_id: string                     // UUID
  project_id: string                   // Foreign key
  
  // Issue details
  title: string                        // Brief summary
  description: string                  // Full description
  
  category:
    | 'technical'                      // Code bugs, system issues
    | 'resource'                       // Team member unavailable, skill gaps
    | 'schedule'                       // Timeline delays, missed dates
    | 'communication'                  // Miscommunication, information gaps
    | 'quality'                        // Quality problems, defects
    | 'external'                       // Vendor, client, regulatory issues
    | 'scope'                          // Scope creep, unclear requirements
    | 'budget'                         // Cost overruns, funding issues
    | 'other'
  
  // Severity & Impact
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact: string                       // Description of impact on project
  affected_areas?: string[]            // Deliverables, milestones, team members affected
  
  // People
  raised_by: string                    // User ID who identified issue
  assigned_to?: string                 // User ID responsible for resolution
  escalated_to?: string                // Manager/sponsor if escalated
  
  // Status tracking
  status: 
    | 'open'                           // Just identified
    | 'acknowledged'                   // Team aware, working on it
    | 'in_progress'                    // Actively resolving
    | 'blocked'                        // Blocked by external dependency
    | 'resolved'                       // Solution implemented
    | 'closed'                         // Verified and closed
  
  // Resolution
  resolution?: string                  // How it was resolved
  workaround?: string                  // Temporary workaround if applicable
  root_cause?: string                  // Root cause analysis
  
  // Dates
  date_raised: string
  target_resolution_date?: string
  date_resolved?: string
  date_closed?: string
  
  // Related entities
  related_risk_id?: string             // If this issue came from a risk
  related_milestone_id?: string        // Milestone being impacted
  related_deliverable_id?: string      // Deliverable being delayed
  
  // Metadata
  source_document_id?: string
  notes?: string
  
  created_at: string
  updated_at: string
}
```

---

## 🎨 UI/UX Design

### Issues Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  Issues & Blockers                          [+ New Issue]  │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 Critical Issues (2) - Immediate Attention Required      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🚨 Database Server Performance Degradation           │  │
│  │                                                        │  │
│  │ Status: In Progress | Priority: Critical              │  │
│  │ Opened: Oct 29 | Target: Oct 31                      │  │
│  │                                                        │  │
│  │ Impact: 5 developers blocked, backend tests failing  │  │
│  │                                                        │  │
│  │ Assigned: John Smith (DevOps)                        │  │
│  │ Escalated: Mike Torres (PM)                          │  │
│  │                                                        │  │
│  │ Current Action: Investigating query performance,     │  │
│  │ adding indexes. Workaround: Using read replica.      │  │
│  │                                                        │  │
│  │ Affects: Milestones [Testing Complete], [Deploy]    │  │
│  │                                                        │  │
│  │ [View Details] [Update Status] [Add Comment]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🟡 High Priority Issues (5)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚠️ Stakeholder Approval Delayed (2 weeks)            │  │
│  │ Status: Blocked | Assigned: Sarah Chen               │  │
│  │ Impact: Feature release delayed to Q2                │  │
│  │ [View] [Update]                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🟢 Medium Priority Issues (8)                               │
│  🔵 Low Priority Issues (4)                                  │
│  ✅ Resolved Issues (23) [Show All]                         │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Issue Detail View

```
┌────────────────────────────────────────────────────────────┐
│  Issue #247: Database Server Performance Degradation       │
│  [Edit] [Resolve] [Close] [Export]                         │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🚨 Priority: Critical                                       │
│  📂 Category: Technical                                      │
│  📊 Status: In Progress                                      │
│                                                              │
│  📝 Description:                                             │
│  Database queries taking 5-10 seconds (normally <500ms).    │
│  Affecting backend API performance and test execution.      │
│                                                              │
│  💥 Impact:                                                  │
│  • 5 developers blocked from integration testing           │
│  • Backend test suite failing due to timeouts              │
│  • User acceptance testing delayed by 2 days               │
│                                                              │
│  📅 Timeline:                                                │
│  • Raised: Oct 29, 2026 (2 days ago)                       │
│  • Target Resolution: Oct 31, 2026 (today)                 │
│  • Time Open: 2 days                                       │
│                                                              │
│  👥 People:                                                  │
│  • Raised By: Mike Torres (PM)                             │
│  • Assigned To: John Smith (DevOps Lead)                   │
│  • Escalated To: CTO                                       │
│                                                              │
│  🔗 Related Items:                                           │
│  • Milestone: Testing Complete (delayed)                   │
│  • Deliverable: Backend API v2.0 (blocked)                 │
│  • Risk #45: Database capacity concerns (materialized!)    │
│                                                              │
│  🛠️ Workaround (Temporary):                                 │
│  Using read replica for test queries. Not ideal but unblocks│
│  team while we optimize primary database.                   │
│                                                              │
│  ✅ Resolution (When Closed):                                │
│  Added missing indexes on user_projects and documents       │
│  tables. Query performance improved from 8s → 120ms.        │
│  Root cause: Database migration missed composite indexes.   │
│                                                              │
│  📊 Activity Log:                                            │
│  ├─ Oct 29 10:23am - Issue raised by Mike Torres           │
│  ├─ Oct 29 11:45am - Assigned to John Smith                │
│  ├─ Oct 29 2:15pm - Workaround implemented (read replica)  │
│  ├─ Oct 30 9:00am - Root cause identified (missing indexes)│
│  ├─ Oct 30 3:30pm - Indexes added, testing in progress     │
│  └─ Oct 31 10:00am - Resolved and closed ✅                │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Database Schema

```sql
-- Issues Table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Issue details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN (
    'technical', 'resource', 'schedule', 'communication', 
    'quality', 'external', 'scope', 'budget', 'other'
  )),
  
  -- Severity & Impact
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  impact TEXT,
  affected_areas JSONB DEFAULT '[]'::jsonb,
  
  -- People
  raised_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  escalated_to UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed'
  )),
  
  -- Resolution
  resolution TEXT,
  workaround TEXT,
  root_cause TEXT,
  
  -- Dates
  date_raised TIMESTAMP NOT NULL DEFAULT NOW(),
  target_resolution_date TIMESTAMP,
  date_resolved TIMESTAMP,
  date_closed TIMESTAMP,
  
  -- Related entities
  related_risk_id UUID REFERENCES risks(id),
  related_milestone_id UUID,
  related_deliverable_id UUID,
  
  -- Metadata
  source_document_id UUID REFERENCES documents(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_issues_project (project_id),
  INDEX idx_issues_status (status),
  INDEX idx_issues_priority (priority),
  INDEX idx_issues_assigned_to (assigned_to),
  INDEX idx_issues_date_raised (date_raised DESC)
);

-- Track issue status changes
CREATE TABLE issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  comment TEXT,
  
  INDEX idx_issue_history_issue (issue_id),
  INDEX idx_issue_history_date (changed_at DESC)
);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO issue_status_history (issue_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
  END IF;
  
  -- Auto-set resolution date
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.date_resolved := NOW();
  END IF;
  
  -- Auto-set closed date
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.date_closed := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_issue_status_change
  AFTER UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION log_issue_status_change();
```

### 2. AI Extraction

```typescript
/**
 * Extract issues from project documents
 */
private async extractIssues(
  documents: Array<{ id: string; title: string; content: string }>,
  projectId: string,
  options: { aiProvider?: string; aiModel?: string }
): Promise<Issue[]> {
  try {
    logger.info('[EXTRACTION-ISSUES] Starting extraction')
    
    const documentContext = this.buildDocumentContext(documents)
    
    const prompt = `
You are analyzing project documents to extract ISSUES - current problems, blockers, and impediments.

CRITICAL: Issues are CURRENT problems (happening now), NOT future risks.

Look for language like:
- "Issue:", "Problem:", "Blocker:", "Impediment:"
- "Currently blocked by..."
- "Waiting on...", "Delayed due to..."
- "Bug:", "Defect:", "System is down..."
- "Team member unavailable...", "Resource constraint..."
- "Stakeholder hasn't responded...", "Approval pending for 2 weeks..."
- Status updates mentioning problems
- Issue logs, problem reports

DOCUMENT CONTENT:
${documentContext}

Extract all issues as a JSON array. For each issue found:

{
  "title": "Brief summary of the issue",
  "description": "Full description of the problem",
  "category": "technical" | "resource" | "schedule" | "communication" | "quality" | "external" | "scope" | "budget" | "other",
  "priority": "critical" | "high" | "medium" | "low",
  "impact": "Description of how this affects the project",
  "status": "open" | "in_progress" | "blocked" | "resolved" | "closed",
  "date_raised": "YYYY-MM-DD",
  "resolution": "How it was resolved (if mentioned)",
  "workaround": "Temporary workaround (if mentioned)",
  "root_cause": "Root cause (if identified)",
  "notes": "Additional context"
}

Examples to extract:
- "Database performance issue blocking 5 developers since Oct 29"
- "Legal approval delayed 2 weeks, holding up contract signature"
- "Senior developer on medical leave, team lacking expertise"
- "Vendor API integration failing, preventing testing"

ONLY extract CURRENT issues (not historical or hypothetical). Return empty array if none found.

Output valid JSON array only.
`
    
    const cacheKey = `issues_${projectId}_${this.hashDocuments(documents)}`
    
    const response = await this.cachedAICall(cacheKey, {
      prompt,
      provider: options.aiProvider || 'openai',
      model: options.aiModel || 'gpt-4-turbo-preview',
      temperature: 0.3,
      max_tokens: 3000
    })
    
    const parsed = this.parseAIResponse(response.content)
    const issues = parsed.issues || []
    
    logger.info(`[EXTRACTION-ISSUES] Extracted ${issues.length} issues`)
    
    return issues
    
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ISSUES] Extraction failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}
```

---

## 🎨 UI Components

### Issues Widget (Dashboard)

```typescript
// components/IssuesWidget.tsx

export function IssuesWidget({ projectId }: { projectId: string }) {
  const [issues, setIssues] = useState<Issue[]>([])
  
  const criticalIssues = issues.filter(i => i.priority === 'critical' && i.status !== 'closed')
  const openIssues = issues.filter(i => i.status !== 'closed')
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Active Issues
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {criticalIssues.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{criticalIssues.length} Critical Issues</AlertTitle>
            <AlertDescription>
              Immediate attention required
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          {openIssues.slice(0, 5).map(issue => (
            <div key={issue.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Badge variant={getPriorityVariant(issue.priority)}>
                  {issue.priority}
                </Badge>
                <span className="text-sm">{issue.title}</span>
              </div>
              <Badge variant="outline">{issue.status}</Badge>
            </div>
          ))}
        </div>
        
        {openIssues.length > 5 && (
          <Button variant="link" className="mt-2">
            View all {openIssues.length} issues →
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 📊 Business Value

### Benefits

1. **Visibility & Transparency**
   - All team members see current blockers
   - Management aware of impediments
   - Stakeholders informed of delays

2. **Faster Resolution**
   - Issues tracked systematically
   - Clear ownership and accountability
   - Escalation paths defined

3. **Prevents Recurrence**
   - Root cause analysis captured
   - Historical issue data available
   - Patterns identified (repeated issues)

4. **PMBOK 8 Compliance**
   - Project Work Domain: 65% → 80% coverage
   - Overall PMBOK 8: 82% → 85% coverage

5. **Integration with Risk Management**
   - Materialized risks become issues
   - Issue patterns inform future risk identification
   - Closed loop: Risk → Issue → Resolution → Lesson

---

## 🔗 Integration Points

### 1. Risk Management Integration

```typescript
/**
 * When a risk materializes, create an issue
 */
async materializeRisk(riskId: string): Promise<Issue> {
  const risk = await getRisk(riskId)
  
  const issue = await createIssue({
    title: `Risk Materialized: ${risk.title}`,
    description: risk.description,
    category: mapRiskCategoryToIssue(risk.category),
    priority: mapRiskImpactToPriority(risk.impact),
    impact: risk.impact,
    related_risk_id: riskId,
    status: 'open'
  })
  
  // Update risk status
  await updateRisk(riskId, { status: 'materialized', related_issue_id: issue.id })
  
  return issue
}
```

### 2. Baseline Drift Integration

```typescript
/**
 * Create issue when baseline drift detected
 */
async createIssueFromDrift(driftDetection: DriftDetection): Promise<Issue> {
  return await createIssue({
    title: `Baseline Drift: ${driftDetection.entity_name}`,
    description: `Drift detected: ${driftDetection.drift_description}`,
    category: 'scope',
    priority: driftDetection.severity === 'high' ? 'high' : 'medium',
    impact: `Baseline variance: ${driftDetection.variance_percent}%`,
    status: 'open'
  })
}
```

### 3. Performance Actuals Integration

```typescript
/**
 * Auto-create issue when variance exceeds threshold
 */
async checkVarianceAndCreateIssue(actual: PerformanceActual): Promise<Issue | null> {
  // If schedule variance > 20% behind, create issue
  if (actual.schedule_variance_days && actual.schedule_variance_days < -5) {
    return await createIssue({
      title: `Schedule Delay: ${actual.entity_name}`,
      description: `${Math.abs(actual.schedule_variance_days)} days behind schedule`,
      category: 'schedule',
      priority: 'high',
      impact: `Timeline impact: ${actual.schedule_variance_percent}% delay`,
      status: 'open'
    })
  }
  
  return null
}
```

---

## 🧪 Testing Plan

### Unit Tests
- ✅ AI extraction from issue logs
- ✅ Status workflow transitions
- ✅ Automatic date setting (resolved, closed)

### Integration Tests
- ✅ Extract issues from status reports
- ✅ Create issue from materialized risk
- ✅ Create issue from baseline drift
- ✅ Issue lifecycle (open → resolved → closed)

### Manual Testing
- [ ] Add project status update with issues
- [ ] Run extraction
- [ ] Verify issues extracted correctly
- [ ] Test manual issue creation
- [ ] Test status transitions
- [ ] Test issue assignment
- [ ] Verify notifications work

---

## 📈 Success Metrics

### Technical
- ✅ Extract issues from 70%+ of status reports
- ✅ Issue categorization accuracy > 85%
- ✅ Status transition tracking 100% accurate

### Business
- ✅ Issue resolution time reduced by 30%
- ✅ 90% of critical issues resolved within SLA
- ✅ Team satisfaction with issue tracking: 4+/5 stars
- ✅ Management visibility improved

---

## 🚀 Rollout Plan

### Day 1: Backend
- Create database schema
- Implement AI extraction
- Add API endpoints
- Status transition logic

### Day 2: Frontend
- Issues dashboard component
- Issue detail view
- Manual create/edit forms
- Status update workflow

### Day 3: Testing & Integration
- Integration testing
- Risk materialization integration
- Baseline drift integration
- Production deployment

---

## ✅ Acceptance Criteria

- [ ] Database schema created with triggers
- [ ] AI extraction identifies issues from documents
- [ ] Issues categorized and prioritized correctly
- [ ] Frontend displays open/critical issues prominently
- [ ] Manual issue creation and editing works
- [ ] Status workflow (open → resolved → closed) functional
- [ ] Integration with risks (materialization)
- [ ] Integration with baseline drift
- [ ] Notification system for new/critical issues
- [ ] PMBOK 8 Project Work Domain requirements met

---

**Created**: October 31, 2025  
**Status**: 🔵 Ready for Implementation  
**PMBOK 8 Impact**: Project Work Domain 65% → 80%

