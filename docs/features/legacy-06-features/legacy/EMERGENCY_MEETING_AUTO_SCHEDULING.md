# Emergency Meeting Auto-Scheduling

**Task ID:** TASK-743  
**Status:** ✅ Implemented  
**Source:** DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md

## Overview

The Emergency Meeting Auto-Scheduling feature automatically schedules emergency meetings when critical budget overruns are detected through the Baseline & Drift Detection system. This ensures rapid response to budget issues and prevents small problems from becoming large crises.

## How It Works

### Complete Flow

```
1. Drift Detection System
   ↓ Detects budget overrun (document updated)
   
2. Drift Detection Service
   ↓ Creates drift record
   ↓ Calculates severity
   ↓ Calls checkAndTriggerEscalation()
   
3. Escalation Service
   ↓ Evaluates drift against escalation matrix
   ↓ Matches escalation rule (e.g., "Budget Overrun 25%+")
   ↓ Creates escalation alert
   ↓ Checks if rule.require_meeting == true
   ↓ Calls scheduleMeeting()
   
4. Emergency Meeting Service
   ↓ Determines meeting severity (warning/critical/emergency)
   ↓ Generates meeting ID (EMRG-2025-001)
   ↓ Creates meeting agenda
   ↓ Identifies required attendees
   ↓ Calculates meeting time (ASAP based on severity)
   ↓ Creates meeting record
   ↓ Sends notifications
   
5. Stakeholders
   ↓ Receive meeting invitations
   ↓ Dashboard alerts appear
   ↓ Attend emergency meeting
   ↓ Make decisions on corrective actions
```

## Severity Levels

The system automatically determines meeting severity based on budget overrun percentage:

| Overrun % | Severity | Escalation Level | Meeting Duration | Scheduled Within |
|-----------|----------|------------------|------------------|------------------|
| **0-5%** | N/A | N/A | N/A | No meeting |
| **5-10%** | ⚠️ Warning | Director (Level 2) | 45 min | 48 hours |
| **10-25%** | 🚨 Critical | C-Level (Level 4) | 60 min | 24 hours |
| **25%+** | 🚨🚨 Emergency | Board/CEO (Level 5) | 90 min | 6-12 hours |

## Meeting Components

### 1. Meeting Record

Each emergency meeting includes:

- **Meeting ID**: Unique identifier (e.g., `EMRG-2025-001`)
- **Title**: Descriptive title with severity emoji
- **Trigger Reason**: Markdown-formatted explanation
- **Agenda**: Structured discussion topics
- **Attendees**: Required and optional participants
- **Scheduled Date/Time**: Auto-calculated based on severity
- **Status**: Tracking through lifecycle (scheduled → notified → completed)

### 2. Auto-Generated Agenda

Every meeting has a structured agenda:

1. **Review Budget Overrun Analysis** (15 min)
   - Present current vs approved budget
   - Project final cost variance analysis

2. **Root Cause Examination** (15 min)
   - Analyze what led to the overrun
   - Determine if preventable

3. **Review Corrective Options** (20 min)
   - Approve additional funding
   - Reduce scope
   - Adjust timeline
   - Cancel project

4. **Impact Assessment** (10 min)
   - Portfolio impact
   - Other projects affected
   - Quarterly/annual budget impact

5. **Decision & Approval** (15 min)
   - Make final decision
   - Approve change request

6. **Action Items & Next Steps** (5 min)
   - Assign follow-ups
   - Set deadlines

### 3. Attendees

The system automatically identifies required attendees based on:

- **Project Team**: Sponsor, Project Manager, key team members
- **Executives** (for critical/emergency): CFO, CTO, CEO
- **Severity-based**: Higher severity = more senior attendees required

## Database Schema

### Tables

#### `emergency_meetings`
Stores emergency meeting details:
- Meeting identification (ID, title)
- Source (project, drift record, change request)
- Classification (severity, type)
- Scheduling (date, duration, location)
- Status tracking
- Outcomes (notes, decisions, actions)

#### `meeting_attendees`
Tracks individual attendee information:
- User details
- Required/optional status
- Confirmation status
- Attendance tracking
- Response status

#### `meeting_escalation_history`
Audit trail of escalations:
- Escalation levels
- Recipients
- Reasons
- Notification channels

## API Endpoints

### List Emergency Meetings
```http
GET /api/emergency-meetings?projectId={id}&status={status}&severity={severity}
```

### Get Meeting Details
```http
GET /api/emergency-meetings/:meetingId
```

### Schedule Meeting (Manual)
```http
POST /api/emergency-meetings/schedule
Content-Type: application/json

{
  "projectId": "uuid",
  "projectName": "string",
  "driftRecordId": "uuid",
  "approvedBudget": 500000,
  "projectedCost": 650000,
  "overrunAmount": 150000,
  "overrunPercentage": 30,
  "rootCause": "string"
}
```

### Update Meeting Status
```http
PATCH /api/emergency-meetings/:meetingId/status
Content-Type: application/json

{
  "status": "completed"
}
```

### Get Project Meetings
```http
GET /api/emergency-meetings/project/:projectId
```

## Configuration

### Escalation Matrix

Emergency meetings are triggered by escalation rules. Example rule:

```sql
INSERT INTO escalation_rules (
  rule_name,
  drift_type,
  threshold_min,
  threshold_max,
  severity_level,
  escalate_to,
  deadline_hours,
  channels,
  auto_create_cr,
  require_meeting,
  description
) VALUES (
  'Budget Overrun 25%+ (Emergency)',
  'budget_overrun',
  25,
  NULL,
  'emergency',
  ARRAY['CEO', 'CFO', 'Board_Finance_Committee'],
  12,
  ARRAY['email', 'slack', 'sms', 'dashboard', 'meeting'],
  true,
  true,
  'Emergency: Budget overrun >= 25% requires immediate executive meeting'
);
```

## Integration Points

### 1. Drift Detection Service

When budget drift is detected:

```typescript
// In driftDetectionService.ts
const driftRecord = await createDriftRecord({...})
await checkAndTriggerEscalation(driftRecord, driftPoints)
```

### 2. Escalation Service

Evaluates drift and schedules meeting if required:

```typescript
// In escalationService.ts
if (rule.require_meeting) {
  await scheduleMeeting(alert, rule)
}
```

### 3. Emergency Meeting Service

Schedules the actual meeting:

```typescript
// In emergencyMeetingService.ts
const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting({
  projectId,
  projectName,
  driftRecordId,
  approvedBudget,
  projectedCost,
  overrunAmount,
  overrunPercentage,
  rootCause
})
```

## Testing

### Unit Tests

Run emergency meeting service tests:

```bash
cd server
npm test -- emergency-meeting-service.test.ts
```

Tests cover:
- Meeting scheduling for different severity levels
- Unique meeting ID generation
- Agenda generation
- Attendee determination
- Meeting time calculation
- Status updates

### Integration Test

Run the integration test script:

```bash
cd server
npm run tsx scripts/test-emergency-meeting-integration.ts
```

This demonstrates the complete flow from drift detection to meeting scheduling.

## Notifications

When a meeting is scheduled, notifications are sent via:

- ✉️ **Email**: Detailed meeting invitation
- 📱 **Dashboard**: Alert banner (cannot be dismissed)
- 💬 **Slack**: Channel notification (critical/emergency)
- 📲 **SMS**: Text message (emergency only, 25%+ overrun)

## Example Scenarios

### Scenario 1: Emergency Budget Overrun (30%)

**Project:** CRM Upgrade  
**Approved Budget:** $500,000  
**Projected Cost:** $650,000  
**Overrun:** $150,000 (30%)

**System Response:**
1. Drift detected and recorded
2. Escalation alert created (Emergency severity)
3. Meeting auto-scheduled: `EMRG-2025-001`
4. Notifications sent to CEO, CFO, Project Sponsor
5. 90-minute meeting scheduled within 12 hours
6. Dashboard shows critical alert (cannot dismiss)
7. SMS sent to CEO and CFO mobile phones

### Scenario 2: Critical Budget Overrun (15%)

**Project:** Website Redesign  
**Approved Budget:** $200,000  
**Projected Cost:** $230,000  
**Overrun:** $30,000 (15%)

**System Response:**
1. Drift detected and recorded
2. Escalation alert created (Critical severity)
3. Meeting auto-scheduled: `EMRG-2025-002`
4. Notifications sent to CFO, Sponsor, Program Manager
5. 60-minute meeting scheduled within 24 hours
6. Dashboard shows critical alert

## Benefits

✅ **Rapid Response**: Meetings scheduled automatically within hours  
✅ **No Manual Work**: System handles detection → escalation → scheduling  
✅ **Consistent Process**: All budget issues handled the same way  
✅ **Audit Trail**: Complete history of drift → alert → meeting → decision  
✅ **Proactive**: Issues addressed before they become crises  
✅ **Accountability**: Clear attendee list and required participants  

## Future Enhancements

Potential improvements for future versions:

- 📅 **Calendar Integration**: Sync with Google Calendar, Outlook
- 🤖 **AI Meeting Prep**: Auto-generate meeting materials
- 📊 **Historical Analysis**: Pattern detection in budget issues
- 🔄 **Follow-up Automation**: Schedule follow-up meetings if needed
- 📧 **Email Templates**: Customizable invitation templates
- 🌐 **Video Conferencing**: Auto-create Zoom/Teams meeting links
- 📝 **Meeting Minutes**: AI-generated meeting summaries
- ✅ **Action Item Tracking**: Track decisions and follow-ups

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md) - Original specification
- [Baseline & Drift Detection](./BASELINE_DRIFT_DETECTION.md) - Drift detection system
- [Escalation Matrix](./ESCALATION_MATRIX.md) - Escalation rules and alerts

## Support

For questions or issues:
- Check test files: `server/src/__tests__/services/emergency-meeting-service.test.ts`
- Review migration: `server/migrations/313_emergency_meetings.sql`
- See example script: `server/scripts/test-emergency-meeting-integration.ts`
