# Email Notification System

**TASK-739: Email notification system for drift detection**

## Overview

The Email Notification System provides automated email alerts for drift detection, change requests, and escalation events in the ADPA Framework. It integrates with the drift detection and escalation systems to send timely, well-formatted notifications to stakeholders.

## Features

### Notification Types

1. **Positive Drift Opportunities** - Alerts when efficiency improvements or cost savings are detected
2. **Budget Overrun Alerts** - Critical alerts for budget variances
3. **Scope Creep Alerts** - Warnings when project scope deviates from baseline
4. **Timeline Delay Alerts** - Notifications for schedule variances
5. **Quality Degradation Alerts** - Alerts for quality issues
6. **Technical Drift Alerts** - Notifications for technical changes
7. **Change Request Notifications** - Updates on change request status
8. **Escalation Alerts** - Critical notifications requiring immediate action

### Email Templates

The system includes professionally designed HTML and plain text email templates for all notification types:

- **HTML Templates**: Responsive, branded emails with visual hierarchy
- **Plain Text Templates**: Fallback for email clients that don't support HTML
- **Dynamic Content**: Templates populate with project-specific data
- **Call-to-Action Buttons**: Direct links to relevant pages in ADPA

### Key Capabilities

- **Multi-recipient Support**: Send to multiple stakeholders based on roles
- **Priority Levels**: High, normal, and low priority emails
- **Severity-based Routing**: Automatically escalate to appropriate roles based on severity
- **Audit Logging**: All emails logged to database for compliance
- **User Preferences**: Users can configure notification preferences
- **Digest Mode**: Option to batch notifications into daily digests
- **Project Filtering**: Subscribe to notifications for specific projects only

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│  Email Notification Service                                  │
│  (/server/src/services/emailNotificationService.ts)         │
│                                                              │
│  • Email template generation (HTML + text)                  │
│  • SMTP configuration and transport                         │
│  • Recipient management                                     │
│  • Notification sending                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ↓             ↓             ↓
┌────────────┐  ┌─────────────┐  ┌────────────┐
│ Escalation │  │    Drift    │  │   Change   │
│  Service   │  │  Detection  │  │  Requests  │
└────────────┘  └─────────────┘  └────────────┘
         │             │             │
         └─────────────┼─────────────┘
                       ↓
         ┌─────────────────────────┐
         │  Email Notification API  │
         │  (/routes/emailNotif...) │
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │  Email Notification DB   │
         │  • Logs                  │
         │  • Preferences           │
         └─────────────────────────┘
```

### Database Schema

#### email_notification_logs

Tracks all sent emails for audit and debugging:

```sql
CREATE TABLE email_notification_logs (
    id UUID PRIMARY KEY,
    notification_type VARCHAR(50),  -- Type of alert
    severity VARCHAR(20),            -- low, normal, high, critical, emergency
    priority VARCHAR(20),            -- Email priority
    recipient_emails TEXT[],         -- Array of recipients
    recipient_roles TEXT[],          -- Recipient roles
    subject TEXT,                    -- Email subject
    body_text TEXT,                  -- Plain text body
    body_html TEXT,                  -- HTML body
    project_id UUID,                 -- Associated project
    drift_detection_id UUID,         -- Associated drift detection
    escalation_alert_id UUID,        -- Associated escalation
    status VARCHAR(20),              -- pending, sent, failed, bounced
    sent_at TIMESTAMP,
    created_at TIMESTAMP
);
```

#### email_notification_preferences

User-specific notification settings:

```sql
CREATE TABLE email_notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID,
    positive_drift_enabled BOOLEAN,
    budget_overrun_enabled BOOLEAN,
    scope_creep_enabled BOOLEAN,
    -- ... other notification types
    min_severity_level VARCHAR(20),  -- Minimum severity to receive
    email_enabled BOOLEAN,
    digest_mode BOOLEAN,             -- Batch into daily digest
    digest_time TIME,                -- Time to send digest
    project_filters JSONB,           -- Filter by project IDs
    created_at TIMESTAMP
);
```

## Configuration

### Environment Variables

Add the following to your `server/.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ADPA Framework <noreply@adpa.com>
```

### SMTP Providers

The system works with any SMTP provider. Common options:

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Not your Gmail password - use App Password
```

**Setup**: Enable 2FA, then create an App Password at https://myaccount.google.com/apppasswords

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

## Usage

### Send Positive Drift Notification

```typescript
import { emailNotificationService } from './services/emailNotificationService'

const data = {
  title: 'AI Cost Optimization',
  description: 'Team switched from GPT-4 to Claude Sonnet',
  projectId: 'project-uuid',
  projectName: 'CRM Upgrade',
  costSavings: 2500,
  timeAcceleration: 15,
  potentialValue: 30000,
  replicableProjects: 12,
  severity: 'medium',
  recommendations: [
    'Approve Claude as preferred provider',
    'Apply to similar projects'
  ],
  changeRequestId: 'CR-2025-042'
}

await emailNotificationService.sendPositiveDriftNotification(data)
```

### Send Budget Overrun Alert

```typescript
const data = {
  projectId: 'project-uuid',
  projectName: 'CRM Implementation',
  approvedBudget: 500000,
  projectedCost: 725000,
  overrunAmount: 225000,
  overrunPercentage: 45,
  severity: 'critical',
  deadline: new Date('2025-10-20'),
  rootCause: 'Scope increased without approval',
  options: [
    {
      option: 'Approve additional budget',
      impact: 'Complete all features',
      recommendation: false
    },
    {
      option: 'Reduce scope',
      impact: 'Stay within budget',
      recommendation: true
    }
  ]
}

await emailNotificationService.sendBudgetOverrunAlert(data)
```

### Send Scope Creep Alert

```typescript
const data = {
  projectName: 'Website Redesign',
  baselineScope: ['Homepage', 'About', 'Contact'],
  currentScope: ['Homepage', 'About', 'Contact', 'Blog', 'Shop'],
  scopeIncrease: 67,
  severity: 'high',
  unapprovedFeatures: ['Blog', 'Shop']
}

await emailNotificationService.sendScopeCreepAlert(data)
```

## API Endpoints

### Test Email Configuration
```http
POST /api/email-notifications/test
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "message": "Email configuration is valid and working"
}
```

### Get User Preferences
```http
GET /api/email-notifications/preferences
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "positive_drift_enabled": true,
    "budget_overrun_enabled": true,
    "email_enabled": true,
    "digest_mode": false,
    ...
  }
}
```

### Update User Preferences
```http
PUT /api/email-notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "positive_drift_enabled": true,
  "budget_overrun_enabled": true,
  "scope_creep_enabled": false,
  "min_severity_level": "high",
  "digest_mode": true,
  "digest_time": "09:00:00"
}

Response:
{
  "success": true,
  "data": { ... },
  "message": "Email notification preferences updated successfully"
}
```

### Get Email Logs (Admin Only)
```http
GET /api/email-notifications/logs?page=1&limit=50&status=sent
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Get Email Statistics (Admin Only)
```http
GET /api/email-notifications/stats?days=30
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "overall": {
      "total_emails": 250,
      "total_sent": 245,
      "total_failed": 5,
      "total_pending": 0
    },
    "breakdown": [ ... ]
  }
}
```

## Integration with Drift Detection

The email notification service is automatically integrated with the escalation service. When drift is detected and matches an escalation rule with `email` in the `channels` array, notifications are sent automatically.

```typescript
// In escalationService.ts
private async sendEmailNotification(alert, rule) {
  // Automatically sends appropriate email based on drift type
  switch (rule.drift_type) {
    case 'budget_overrun':
      await emailNotificationService.sendBudgetOverrunAlert(data)
      break
    case 'scope_creep':
      await emailNotificationService.sendScopeCreepAlert(data)
      break
  }
}
```

## Testing

### Run Tests

```bash
cd server
npm test -- email-notification.test.ts
```

### Manual Testing

1. Configure SMTP credentials in `.env`
2. Test configuration:
   ```bash
   curl -X POST http://localhost:5000/api/email-notifications/test \
     -H "Authorization: Bearer <admin-token>"
   ```

3. Trigger a drift detection to receive a real email notification

## User Guide

### Configure Email Preferences

1. Log into ADPA
2. Navigate to **Settings** → **Notifications**
3. Toggle notification types on/off
4. Set minimum severity level
5. Enable/disable digest mode
6. Filter by specific projects
7. Click **Save Preferences**

### View Email Notification History (Admins)

1. Navigate to **Admin** → **Email Notifications**
2. View sent emails, statuses, and timestamps
3. Filter by status, type, or severity
4. Export logs for compliance

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**
   ```bash
   curl -X POST http://localhost:5000/api/email-notifications/test \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Check Logs**
   ```bash
   tail -f server/logs/combined.log | grep EMAIL
   ```

3. **Verify Environment Variables**
   ```bash
   echo $SMTP_HOST
   echo $SMTP_USER
   ```

### Common Issues

**Gmail App Password Not Working**
- Ensure 2FA is enabled on your Google account
- Create a new App Password specifically for ADPA
- Use the 16-character password, not your regular Gmail password

**Emails Going to Spam**
- Configure SPF and DKIM records for your domain
- Use a verified sender address
- Consider using a dedicated email service (SendGrid, AWS SES)

**Connection Timeouts**
- Check firewall rules for SMTP port (usually 587 or 465)
- Verify SMTP server is accessible from your network
- Try using port 465 with `secure: true` instead of 587

## Security Considerations

1. **Never commit SMTP credentials** to version control
2. **Use environment variables** for all sensitive configuration
3. **Enable TLS/SSL** for SMTP connections
4. **Rotate credentials** regularly
5. **Limit admin access** to email logs (may contain sensitive data)
6. **Sanitize email content** to prevent injection attacks

## Performance

- **Non-blocking**: Email sending is asynchronous and doesn't block API requests
- **Rate Limiting**: SMTP providers have rate limits - monitor usage
- **Batch Processing**: Use digest mode for high-volume scenarios
- **Retry Logic**: Failed emails are logged for manual retry

## Future Enhancements

- [ ] Email template customization UI
- [ ] Multi-language support
- [ ] Rich attachments (PDFs, charts)
- [ ] Email analytics dashboard
- [ ] A/B testing for email templates
- [ ] Mobile push notifications integration
- [ ] SMS fallback for critical alerts

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
- [Escalation Matrix System](../server/docs/ESCALATION_MATRIX.md)
- [Drift Detection System](./DRIFT_DETECTION_TECHNICAL_GUIDE.md)

## Support

For issues or questions about the email notification system:
- Check the [Troubleshooting](#troubleshooting) section
- Review server logs in `server/logs/combined.log`
- Contact the development team
