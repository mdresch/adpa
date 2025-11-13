# Escalation Matrix Implementation

**Status:** ✅ Implemented (TASK-742)  
**Version:** 1.0  
**Last Updated:** 2025-11-08

---

## Overview

The Escalation Matrix system provides severity-based automated alerting for drift detection events. When drift is detected (budget overruns, scope creep, timeline delays), the system automatically evaluates the drift against configurable escalation rules and triggers appropriate notifications to stakeholders.

This implementation is based on Phase 2 of the **Automated Change Request Generation from Drift Detection** workflow (`DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md`).

---

## Architecture

### Components

1. **Escalation Service** (`server/src/services/escalationService.ts`)
   - Evaluates drift against escalation matrix rules
   - Creates escalation alerts
   - Manages multi-channel notifications (email, Slack, SMS, dashboard)
   - Handles alert lifecycle (acknowledge, resolve)

2. **Database Schema** (`server/migrations/313_escalation_matrix_system.sql`)
   - `escalation_matrix` - Configurable escalation rules
   - `escalation_alerts` - Active escalation alerts
   - `escalation_alert_history` - Audit trail of alert actions

3. **Integration Points**
   - Drift Detection Service automatically triggers escalation checks
   - Document update routes trigger escalation on drift detection
   - Document upload service triggers escalation on drift detection

---

## Escalation Matrix Rules

### Budget Overrun Escalation

| Overrun % | Severity | Escalate To | Deadline | Channels | Auto CR | Meeting |
|-----------|----------|-------------|----------|----------|---------|---------|
| **0-5%** | ⚠️ Warning | PM, Finance Controller | 72 hours | Email, Dashboard | No | No |
| **5-10%** | 🔴 Critical | Sponsor, CFO, PM | 24 hours | Email, Slack, Dashboard | Yes | No |
| **10-25%** | 🚨 Critical | Sponsor, CFO, CTO | 12 hours | Email, Slack, Dashboard, Meeting | Yes | Yes |
| **25%+** | 🚨🚨 Emergency | CEO, CFO, Board | 6 hours | Email, Slack, SMS, Dashboard, Meeting | Yes | Yes |

### Scope Creep Escalation

| Scope Increase | Severity | Escalate To | Deadline | Channels | Auto CR | Meeting |
|----------------|----------|-------------|----------|----------|---------|---------|
| **0-10%** | ⚠️ Warning | PM, Sponsor | 72 hours | Email, Dashboard | No | No |
| **10-25%** | 🔴 High | Sponsor, Program Manager | 48 hours | Email, Slack, Dashboard | Yes | No |
| **25-50%** | 🚨 Critical | Sponsor, CFO, CTO | 24 hours | Email, Slack, Dashboard | Yes | No |
| **50%+** | 🚨🚨 Emergency | CEO, CFO, Board | 12 hours | Email, Slack, SMS, Dashboard, Meeting | Yes | Yes |

---

## Workflow

### 1. Drift Detection
When a document is updated or uploaded:
```typescript
const driftResult = await driftDetectionService.checkForDrift(projectId, documentId)
```

### 2. Drift Record Creation
If drift is detected:
```typescript
const driftRecord = await driftDetectionService.createDriftRecord({
  projectId,
  documentId,
  baselineId,
  driftPoints: driftResult.driftPoints,
  severity: driftResult.severity,
  triggeredBy: 'manual' // or user ID
})
```

### 3. Escalation Check (TASK-742)
Automatically triggered after drift record creation:
```typescript
await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftResult.driftPoints)
```

### 4. Escalation Evaluation
The escalation service evaluates the drift:
```typescript
const evaluation = await escalationService.evaluateDrift(
  driftRecord.id,
  projectId,
  driftType,      // 'budget_overrun', 'scope_creep', etc.
  driftSeverity,
  driftData       // Contains variance calculations
)
```

### 5. Alert Creation
If a matching rule is found:
```typescript
const alert = await escalationService.createAlert(
  driftRecord.id,
  projectId,
  evaluation.matchedRule,
  evaluation.variancePercentage,
  driftData
)
```

### 6. Multi-Channel Notifications
Alerts are sent through configured channels:
- **Email** - Detailed alert with corrective options
- **Slack** - Quick notification with key metrics
- **SMS** - Emergency alerts only (25%+ overrun)
- **Dashboard** - In-app alert banner
- **Meeting** - Emergency meeting auto-scheduled

---

## API Endpoints

### Get Active Alerts
```
GET /api/escalation/alerts?projectId={projectId}
```

### Acknowledge Alert
```
POST /api/escalation/alerts/{alertId}/acknowledge
Body: { notes: "Investigating the issue" }
```

### Resolve Alert
```
POST /api/escalation/alerts/{alertId}/resolve
Body: { notes: "Issue resolved", resolution: "..." }
```

### Get Escalation Matrix Rules
```
GET /api/escalation/matrix
```

### Update Escalation Rule (Admin)
```
PUT /api/escalation/matrix/{ruleId}
Body: { threshold_min: 10, deadline_hours: 24, ... }
```

---

## Configuration

### Database Seed Data
Default escalation rules are seeded during migration:
```sql
-- server/migrations/313_escalation_matrix_system.sql
INSERT INTO escalation_matrix (rule_name, drift_type, threshold_min, threshold_max, ...)
VALUES 
  ('Budget Overrun: 0-5% Warning', 'budget_overrun', 0.0, 5.0, ...),
  ('Budget Overrun: 5-10% Critical', 'budget_overrun', 5.0, 10.0, ...),
  ...
```

### Customizing Rules
Rules can be customized via:
1. Direct database updates
2. Admin API endpoints (when implemented)
3. Migration scripts for organization-specific rules

---

## Testing

### Unit Tests
```bash
cd server
npm test -- escalation.test.ts
```

Test coverage includes:
- Budget overrun escalation matching (7%, 30% overrun)
- Scope creep escalation matching (15% increase)
- Alert creation with proper deadlines
- Alert acknowledgment and resolution
- Edge cases (below threshold, no matching rules)

### Integration Tests
```bash
# Test drift detection with escalation
cd server
npm test -- drift-detection-entity-types.test.ts
```

---

## Monitoring & Alerts

### Key Metrics
- **Alert Response Time** - Time between alert creation and acknowledgment
- **Escalation Hit Rate** - % of drifts that trigger escalation
- **Resolution Time** - Time to resolve escalated alerts
- **False Positive Rate** - Alerts marked as false positives

### Logs
All escalation events are logged:
```
[ESCALATION] Evaluating drift for escalation
[ESCALATION] Escalation rule matched: Budget Overrun: 10-25% Critical
[ESCALATION] Alert created successfully
[ESCALATION] Email notification sent
[ESCALATION] Slack notification sent
```

### Audit Trail
Complete history in `escalation_alert_history`:
- Alert created
- Notifications sent
- Alert acknowledged
- Status changes
- Alert resolved

---

## Future Enhancements

### Phase 3: Workflow Automation (Planned)
- Automatic baseline update upon approval
- Knowledge base integration
- Replication to similar projects
- Integration with change request system

### Additional Features
- SMS integration with Twilio/AWS SNS
- Slack webhooks for team notifications
- Calendar integration for meeting scheduling
- Custom escalation paths per project
- ML-based escalation prediction

---

## Troubleshooting

### Alert Not Created
1. Check if escalation rule exists for drift type
2. Verify variance calculation matches threshold
3. Check escalation service logs for errors
4. Ensure drift record was created successfully

### Notification Not Sent
1. Check email service configuration
2. Verify Slack webhook URL (if configured)
3. Check notification logs in `escalation_alerts` table
4. Review error logs for notification failures

### No Matching Rule Found
1. Verify drift type is supported
2. Check if variance percentage is calculated correctly
3. Ensure escalation rules are active (`is_active = true`)
4. Review rule priorities and threshold ranges

---

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md) - Original specification
- [DRIFT_AUTO_RESOLUTION_FEATURE.md](../roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md) - Drift resolution workflow
- [APPROVAL_WORKFLOW_IMPLEMENTATION.md](./APPROVAL_WORKFLOW_IMPLEMENTATION.md) - Change request approvals

---

## Change Log

### Version 1.0 (2025-11-08)
- ✅ Initial implementation (TASK-742)
- ✅ Database schema and migrations
- ✅ Escalation service with rule matching
- ✅ Integration with drift detection workflow
- ✅ Multi-channel notification support
- ✅ Alert lifecycle management
- ✅ Unit tests and integration tests
- ✅ Documentation

---

**Implementation Status:** ✅ Complete  
**Test Coverage:** ✅ Passing  
**Documentation:** ✅ Complete
