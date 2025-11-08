# Escalation Matrix System

**TASK-742**: Escalation matrix based on severity  
**Phase 2**: Advanced Alerts (DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)

## Overview

The Escalation Matrix System automatically routes drift detection alerts to appropriate stakeholders based on severity thresholds. It implements the escalation specifications from the Drift-to-Change-Request workflow, ensuring critical project variances receive timely executive attention.

## Features

- **Threshold-Based Routing**: Automatically escalates alerts based on variance percentages
- **Multi-Channel Notifications**: Email, Slack, SMS, Dashboard, and Meeting scheduling
- **Auto-CR Creation**: Automatically generates Change Requests for significant drift
- **Configurable Rules**: Admin-configurable escalation matrix rules
- **Audit Trail**: Complete history of all escalation actions
- **Role-Based Escalation**: Routes to PM, Sponsor, CFO, CTO, CEO, or Board based on severity

## Default Escalation Rules

### Budget Overrun Escalation

| Variance | Severity | Escalate To | Deadline | Channels | Auto-CR |
|----------|----------|-------------|----------|----------|---------|
| 0-5% | Warning | PM, Finance Controller | 72 hours | Email, Dashboard | No |
| 5-10% | Critical | Sponsor, CFO, PM | 24 hours | Email, Slack, Dashboard | Yes |
| 10-25% | Critical | Sponsor, CFO, CTO | 12 hours | Email, Slack, Dashboard, Meeting | Yes |
| 25%+ | Emergency | CEO, CFO, Board | 6 hours | Email, Slack, SMS, Dashboard, Meeting | Yes |

### Scope Creep Escalation

| Variance | Severity | Escalate To | Deadline | Channels | Auto-CR |
|----------|----------|-------------|----------|----------|---------|
| 0-10% | Warning | PM, Sponsor | 72 hours | Email, Dashboard | Optional |
| 10-25% | High | Sponsor, Program Mgr | 48 hours | Email, Slack, Dashboard | Yes |
| 25-50% | Critical | Sponsor, CFO, CTO | 24 hours | Email, Slack, Dashboard | Yes |
| 50%+ | Emergency | CEO, CFO, Board | 12 hours | Email, Slack, SMS, Dashboard, Meeting | Yes |

## Database Schema

### Tables Created

1. **escalation_matrix** - Configurable escalation rules
2. **escalation_alerts** - Active and historical escalation alerts
3. **escalation_alert_history** - Audit trail of all alert actions

### Migration File

`server/migrations/313_escalation_matrix_system.sql`

## API Endpoints

### Get Escalation Alerts
```bash
GET /api/escalation/alerts?projectId={uuid}&status={status}
```

### Get Alert Details
```bash
GET /api/escalation/alerts/:id
```

### Acknowledge Alert
```bash
POST /api/escalation/alerts/:id/acknowledge
Body: { "notes": "Investigating..." }
```

### Resolve Alert
```bash
POST /api/escalation/alerts/:id/resolve
Body: { "notes": "Resolved by approving CR-2025-123" }
```

### Get Escalation Rules
```bash
GET /api/escalation/rules?driftType={type}&isActive=true
```

### Create Escalation Rule (Admin)
```bash
POST /api/escalation/rules
Body: {
  "ruleName": "Budget Overrun: 15-20% Critical",
  "driftType": "budget_overrun",
  "thresholdMin": 15.0,
  "thresholdMax": 20.0,
  "severityLevel": "critical",
  "escalateTo": ["CFO", "CTO", "Sponsor"],
  "deadlineHours": 18,
  "channels": ["email", "slack", "dashboard"],
  "autoCreateCr": true,
  "requireMeeting": false,
  "description": "Custom rule for 15-20% budget variance",
  "priority": 25
}
```

### Update Escalation Rule (Admin)
```bash
PUT /api/escalation/rules/:id
Body: { "isActive": false }
```

### Delete Escalation Rule (Admin)
```bash
DELETE /api/escalation/rules/:id
```

## Service Integration

### Drift Detection Integration

The escalation system is automatically triggered when drift is detected:

```typescript
import { driftDetectionService } from './services/driftDetectionService'

// After detecting drift
const driftResult = await driftDetectionService.checkForDrift(projectId, documentId)

if (driftResult.hasDrift) {
  // Create drift record
  const driftRecord = await driftDetectionService.createDriftRecord({
    projectId,
    documentId,
    baselineId,
    driftPoints: driftResult.driftPoints,
    severity: driftResult.severity,
    triggeredBy: 'ai'
  })
  
  // Check and trigger escalation automatically
  await driftDetectionService.checkAndTriggerEscalation(
    driftRecord,
    driftResult.driftPoints
  )
}
```

### Manual Escalation Evaluation

You can also manually evaluate drift for escalation:

```typescript
import { escalationService } from './services/escalationService'

const evaluation = await escalationService.evaluateDrift(
  driftDetectionId,
  projectId,
  'budget_overrun',
  'critical',
  {
    approved_budget: 500000,
    projected_cost: 550000
  }
)

if (evaluation.shouldEscalate && evaluation.matchedRule) {
  await escalationService.createAlert(
    driftDetectionId,
    projectId,
    evaluation.matchedRule,
    evaluation.variancePercentage,
    driftData
  )
}
```

## Notification Channels

### Email
- Sent to stakeholder email addresses
- Contains alert summary, variance details, and action items
- Includes link to review in ADPA dashboard

### Slack
- Posted to #executive-alerts channel
- Mentions relevant stakeholders
- Provides quick action buttons

### SMS
- Reserved for emergency alerts (25%+ variance)
- Sent to CFO and CEO mobile numbers
- Brief message with urgency indicator

### Dashboard
- Real-time dashboard alerts
- Cannot be dismissed for critical/emergency alerts
- Shows countdown timer to deadline

### Meeting
- Auto-schedules emergency meeting for crisis situations
- Invites all escalated stakeholders
- Includes meeting agenda and background materials

## Testing

### Run Escalation Tests
```bash
cd server
npm test -- escalation.test.ts
```

### Manual Testing
1. Create a project with approved baseline
2. Update document to create 10% budget variance
3. Verify escalation alert is created automatically
4. Check that proper stakeholders are notified
5. Acknowledge and resolve the alert

## Configuration

### Environment Variables

```bash
# Email Service (SendGrid, AWS SES, etc.)
EMAIL_API_KEY=your_email_service_api_key
EMAIL_FROM=alerts@adpa-system.com

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALERTS_CHANNEL=#executive-alerts

# SMS Service (Twilio, AWS SNS, etc.)
SMS_API_KEY=your_sms_service_api_key
SMS_FROM=+1234567890

# Calendar Integration (Google Calendar, Outlook, etc.)
CALENDAR_API_KEY=your_calendar_api_key
```

## Permissions

- `projects.view` - View escalation alerts for projects
- `projects.update` - Acknowledge and respond to alerts
- `system.view` - View escalation rules
- `system.admin` - Create, update, delete escalation rules

## Future Enhancements

1. **Smart Routing**: ML-based routing based on historical response patterns
2. **Escalation Chains**: Multi-tier escalation if initial deadline missed
3. **Custom Notification Templates**: Customizable email/Slack templates
4. **Integration Webhooks**: Trigger external systems (JIRA, ServiceNow)
5. **Analytics Dashboard**: Escalation metrics and response time tracking
6. **Mobile Push Notifications**: Native mobile app alerts

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../../docs/roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
- [Drift Detection Service](../services/driftDetectionService.ts)
- [Baseline Management](../services/baselineService.ts)

## Support

For issues or questions about the escalation system:
- File an issue with label `escalation-matrix`
- Contact: ADPA Development Team
