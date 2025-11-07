# Emergency Meeting Auto-Scheduling

## Overview

The Emergency Meeting Auto-Scheduling feature automatically schedules emergency meetings when critical budget overruns or drift are detected in projects. This ensures rapid response and decision-making for project issues requiring immediate attention.

## Features

### 1. Automatic Meeting Scheduling

When a budget overrun or critical drift is detected, the system automatically:
- Schedules an emergency meeting based on severity
- Invites relevant stakeholders (CFO, CEO, Project Sponsor, etc.)
- Generates a default agenda focused on corrective actions
- Sends multi-channel notifications to all attendees

### 2. Severity-Based Scheduling

Meetings are scheduled based on the severity of the issue:

| Severity | Overrun % | Scheduled Within | Escalated To |
|----------|-----------|------------------|--------------|
| **Emergency** | 25%+ | 12 hours | CEO, CFO, Board |
| **Critical** | 10-25% | 24 hours | CFO, Sponsor, CTO |
| **High** | 5-10% | 48 hours | PM, Finance Controller |

### 3. Budget Overrun Alerts

The system generates comprehensive alerts that include:
- Financial analysis (approved vs projected costs)
- Root cause analysis
- Impact assessment
- Corrective action options with recommendations
- Auto-generated Change Request

### 4. Meeting Management

Features for managing emergency meetings:
- RSVP tracking for attendees
- Meeting cancellation with notifications
- Agenda customization
- Meeting notes and decision tracking
- Action item management

## API Endpoints

### Schedule Emergency Meeting

```http
POST /api/meetings
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "uuid",
  "title": "Emergency Budget Review",
  "meetingType": "emergency_budget_overrun",
  "severity": "emergency",
  "urgency": "emergency",
  "durationMinutes": 60,
  "attendees": [
    {
      "email": "cfo@company.com",
      "name": "CFO",
      "role": "decision_maker"
    }
  ]
}
```

### Create Budget Overrun Alert

```http
POST /api/meetings/alerts/budget-overrun
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "uuid",
  "projectName": "CRM Upgrade",
  "approvedBudget": 500000,
  "projectedCost": 650000,
  "rootCause": {
    "category": "Scope Creep",
    "description": "Unapproved features added",
    "preventable": true
  }
}
```

Response:
```json
{
  "success": true,
  "alert": {
    "id": "uuid",
    "severity": "critical",
    "title": "🚨 CRITICAL: Budget Overrun Detected - CRM Upgrade",
    "overrunAmount": 150000,
    "overrunPercentage": 30,
    "meetingId": "uuid",
    "escalatedTo": ["CEO", "CFO", "Project_Sponsor"]
  },
  "meetingScheduled": true
}
```

### List Meetings

```http
GET /api/meetings/project/:projectId?status=scheduled&severity=emergency
Authorization: Bearer <token>
```

### Update RSVP

```http
PATCH /api/meetings/:id/rsvp
Content-Type: application/json
Authorization: Bearer <token>

{
  "attendeeId": "uuid",
  "status": "accepted"
}
```

### Cancel Meeting

```http
PATCH /api/meetings/:id/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Issue resolved, meeting no longer needed"
}
```

## Database Schema

### meetings Table

Stores all scheduled meetings (auto-generated and manual):

```sql
CREATE TABLE meetings (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(50) NOT NULL,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    severity VARCHAR(20),
    urgency VARCHAR(20),
    agenda JSONB,
    auto_generated BOOLEAN DEFAULT false,
    auto_scheduled_reason TEXT,
    alert_id UUID,
    status VARCHAR(20) DEFAULT 'scheduled'
);
```

### meeting_attendees Table

Tracks meeting attendees and RSVP status:

```sql
CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id),
    user_id UUID REFERENCES users(id),
    email VARCHAR(255),
    role VARCHAR(50),
    rsvp_status VARCHAR(20) DEFAULT 'pending',
    attended BOOLEAN DEFAULT false
);
```

### budget_overrun_alerts Table

Stores budget overrun alerts and escalations:

```sql
CREATE TABLE budget_overrun_alerts (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    severity VARCHAR(20) NOT NULL,
    approved_budget DECIMAL(15, 2),
    projected_cost DECIMAL(15, 2),
    overrun_amount DECIMAL(15, 2),
    overrun_percentage DECIMAL(5, 2),
    corrective_options JSONB,
    escalated_to JSONB,
    meeting_id UUID REFERENCES meetings(id),
    status VARCHAR(20) DEFAULT 'active'
);
```

### notification_queue Table

Queues multi-channel notifications:

```sql
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    channels JSONB DEFAULT '["email"]',
    meeting_id UUID REFERENCES meetings(id),
    status VARCHAR(20) DEFAULT 'pending'
);
```

## Integration with Drift Detection

The emergency meeting scheduling integrates with the existing drift detection system:

```typescript
// When drift is detected
const driftResult = await driftDetectionService.checkForDrift(projectId, documentId);

if (driftResult.severity === 'critical' && driftResult.hasBudgetOverrun) {
  // Auto-generate budget overrun alert with emergency meeting
  const alert = await budgetOverrunAlertService.processBudgetOverrun({
    projectId,
    projectName,
    approvedBudget,
    projectedCost,
    overrunAmount,
    overrunPercentage,
    driftRecordId: driftResult.id
  }, userId);
  
  // Meeting is automatically scheduled
  console.log(`Emergency meeting scheduled: ${alert.meetingId}`);
}
```

## Workflow

1. **Drift Detection** → Budget overrun detected (e.g., 30% over baseline)
2. **Alert Generation** → System creates critical/emergency alert
3. **Meeting Auto-Scheduling** → Emergency meeting scheduled within 12-24 hours
4. **Escalation** → Stakeholders notified via email, Slack, dashboard
5. **Agenda Creation** → Default agenda generated with corrective options
6. **Approval Workflow** → Meeting linked to auto-generated Change Request
7. **Decision Tracking** → Meeting notes and decisions recorded
8. **Resolution** → Alert marked as resolved when action taken

## Configuration

### Environment Variables

No additional environment variables required. The feature uses existing database and notification infrastructure.

### Customization

You can customize the following behavior:

1. **Escalation Matrix** - Modify `determineEscalation()` in `budgetOverrunAlertService.ts`
2. **Meeting Timing** - Adjust `calculateMeetingTime()` in `meetingSchedulerService.ts`
3. **Default Agenda** - Customize `generateDefaultAgenda()` in `meetingSchedulerService.ts`
4. **Notification Channels** - Update channels in `sendAlertNotifications()`

## Testing

Run the test suite:

```bash
cd server
npm test -- meeting-scheduler.test
npm test -- budget-overrun-alert.test
```

Test scenarios included:
- Emergency meeting scheduling (25%+ overrun)
- Critical meeting scheduling (10-25% overrun)
- Warning alerts (5-10% overrun)
- RSVP tracking
- Meeting cancellation
- Alert acknowledgment and resolution

## Security

- All endpoints require authentication via JWT token
- Project update permission required for scheduling meetings
- Users can only update their own RSVP status
- Meeting cancellation requires project update permission

## Performance Considerations

- Meetings and alerts are stored in PostgreSQL with proper indexes
- Notification queue processes asynchronously
- Real-time updates via WebSocket for meeting status changes
- Database queries optimized with proper joins and indexes

## Future Enhancements

1. **Calendar Integration** - Sync with Google Calendar, Outlook
2. **Video Conference Links** - Auto-generate Zoom/Teams meeting links
3. **SMS Notifications** - Add SMS channel for emergency alerts
4. **AI-Powered Agendas** - Use AI to generate context-specific agendas
5. **Meeting Analytics** - Track meeting effectiveness and decisions

## Support

For issues or questions:
- Check logs in `server/logs/combined.log`
- Review test cases for usage examples
- See API documentation above for endpoint details

## Related Documentation

- [Drift Detection System](./DRIFT_DETECTION.md)
- [Change Request Workflow](../../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
- [Baseline Management](./BASELINE_MANAGEMENT.md)
