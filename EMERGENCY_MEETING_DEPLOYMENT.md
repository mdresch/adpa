# Emergency Meeting Auto-Scheduling - Deployment Guide

## Overview

This document provides complete instructions for deploying the Emergency Meeting Auto-Scheduling feature (TASK-743) to production.

## ✅ Implementation Status

All implementation tasks are complete:

- ✅ Database schema designed and migration file created
- ✅ Meeting scheduling service implemented
- ✅ Budget overrun alert system with auto-scheduling
- ✅ Integration with drift detection service
- ✅ Multi-channel notification system (email, dashboard, Slack-ready)
- ✅ API endpoints for meeting management
- ✅ Comprehensive test suite (unit + integration)
- ✅ Feature documentation
- ✅ Code review completed and feedback addressed
- ✅ Security scan (CodeQL) completed
- ✅ End-to-end workflow demo created

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Add these new environment variables to your deployment:

#### Backend (`server/.env`)
```bash
# Email Configuration (Optional - defaults to company.com)
COMPANY_EMAIL_DOMAIN=your-company.com

# Frontend URL (for alert links)
FRONTEND_URL=https://your-production-domain.com
```

### 2. Database Migration

Run the database migration to create the required tables:

```bash
# Option 1: Using psql directly
psql $DATABASE_URL -f server/migrations/060_emergency_meeting_scheduling.sql

# Option 2: Using Supabase CLI (if using Supabase)
cd server
supabase migration new emergency_meeting_scheduling
# Copy contents of 060_emergency_meeting_scheduling.sql
supabase db push
```

#### Tables Created:
- `meetings` - Auto-scheduled and manual meetings
- `meeting_attendees` - Attendee tracking with RSVP
- `budget_overrun_alerts` - Critical budget alerts
- `notification_queue` - Multi-channel notification delivery

### 3. Verify Migration

```bash
# Connect to database and verify tables exist
psql $DATABASE_URL -c "\dt meetings"
psql $DATABASE_URL -c "\dt meeting_attendees"
psql $DATABASE_URL -c "\dt budget_overrun_alerts"
psql $DATABASE_URL -c "\dt notification_queue"
```

## 🧪 Testing

### 1. Run Unit Tests

```bash
cd server
npm test -- meeting-scheduler.test
npm test -- budget-overrun-alert.test
```

### 2. Run Integration Tests

```bash
cd server
npm test -- emergency-meeting-integration.test
```

### 3. Run End-to-End Demo

```bash
cd server
npm run demo:emergency-meetings
```

This will demonstrate the complete workflow:
- Budget overrun detection (30% overrun scenario)
- Alert generation with EMERGENCY severity
- Automatic meeting scheduling (within 12 hours)
- Multi-channel notifications
- Corrective options analysis

## 🚀 Deployment Steps

### Step 1: Deploy Backend Changes

```bash
# Build backend
cd server
npm run build

# Deploy to your environment (example for Railway)
railway up

# Or for other platforms
git push production main
```

### Step 2: Run Database Migration

```bash
# SSH into your server or use your cloud provider's console
psql $DATABASE_URL -f server/migrations/060_emergency_meeting_scheduling.sql
```

### Step 3: Verify API Endpoints

Test the new endpoints are accessible:

```bash
# Health check
curl https://your-api-domain.com/health

# Test meetings endpoint (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT" \
     https://your-api-domain.com/api/meetings/project/PROJECT_ID
```

### Step 4: Configure Notifications

Ensure your notification system is configured:
- Email service (SMTP or SendGrid)
- Slack webhooks (optional)
- SMS provider (optional for emergency alerts)

## 📊 Monitoring

### Key Metrics to Monitor

1. **Meeting Scheduling Success Rate**
   - Track successful vs failed meeting creations
   - Query: `SELECT status, COUNT(*) FROM meetings WHERE auto_generated = true GROUP BY status`

2. **Alert Response Times**
   - Monitor time from alert creation to acknowledgment
   - Query: `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FROM budget_overrun_alerts WHERE status = 'acknowledged'`

3. **Notification Delivery**
   - Track notification queue status
   - Query: `SELECT status, COUNT(*) FROM notification_queue GROUP BY status`

### Logging

Monitor logs for these patterns:
- `[MEETING-SCHEDULER]` - Meeting scheduling events
- `[BUDGET-ALERT]` - Budget overrun alert events
- `[DRIFT-API]` - Drift detection triggers

## 🔧 Configuration

### Severity Thresholds

Budget overrun severity levels (configurable in code):

| Severity | Overrun % | Meeting Window | Escalation |
|----------|-----------|----------------|------------|
| Warning | 5-10% | 72 hours | PM, Finance Controller |
| Critical | 10-25% | 24 hours | CFO, Sponsor, CTO |
| Emergency | 25%+ | 12 hours | CEO, CFO, Board |

### Customization

To customize behavior, edit these files:
- `server/src/services/budgetOverrunAlertService.ts` - Alert thresholds and escalation
- `server/src/services/meetingSchedulerService.ts` - Meeting scheduling logic

## 📱 API Endpoints

### Meeting Management

```bash
# Create budget overrun alert (triggers auto-scheduling)
POST /api/meetings/alerts/budget-overrun
{
  "projectId": "uuid",
  "projectName": "Project Name",
  "approvedBudget": 500000,
  "projectedCost": 650000,
  "rootCause": {
    "category": "Scope Creep",
    "description": "Added features without approval",
    "preventable": true
  }
}

# List meetings for a project
GET /api/meetings/project/:projectId?status=scheduled&severity=emergency

# Get meeting details
GET /api/meetings/:id

# Update RSVP
PATCH /api/meetings/:id/rsvp
{
  "attendeeId": "uuid",
  "status": "accepted"
}

# Cancel meeting
PATCH /api/meetings/:id/cancel
{
  "reason": "Issue resolved"
}

# List alerts
GET /api/meetings/alerts/project/:projectId

# Acknowledge alert
PATCH /api/meetings/alerts/:alertId/acknowledge

# Resolve alert
PATCH /api/meetings/alerts/:alertId/resolve
{
  "resolutionNotes": "Scope reduced to baseline"
}
```

## 🔒 Security

All endpoints require:
- JWT authentication via `Authorization: Bearer` header
- Appropriate permissions (checked via middleware)
- Input validation (Joi schemas)

Rate limiting should be added system-wide (see CodeQL scan notes).

## 🐛 Troubleshooting

### Issue: Meetings not being auto-scheduled

**Check:**
1. Verify drift detection is running
2. Check alert severity meets threshold (10%+ for auto-scheduling)
3. Review logs for `[BUDGET-ALERT]` errors
4. Verify database tables exist

### Issue: Notifications not sending

**Check:**
1. Verify `notification_queue` table has pending entries
2. Check notification worker is running
3. Verify email/Slack configuration
4. Review notification status: `SELECT * FROM notification_queue WHERE status = 'failed'`

### Issue: Database migration fails

**Solution:**
```bash
# Check if tables already exist
psql $DATABASE_URL -c "\dt meetings"

# If tables exist, migration may have already run
# Verify schema matches migration file
```

## 📚 Documentation

- **Feature Documentation**: `docs/06-features/EMERGENCY_MEETING_AUTO_SCHEDULING.md`
- **API Reference**: See API Endpoints section above
- **Architecture**: `docs/roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md`
- **Demo Script**: `server/scripts/demo-emergency-meeting-scheduling.js`

## 🎯 Success Criteria

The deployment is successful when:

1. ✅ Database migration completes without errors
2. ✅ All tests pass (unit, integration, E2E)
3. ✅ API endpoints respond correctly
4. ✅ Demo script runs successfully
5. ✅ Budget overrun alerts trigger meeting scheduling
6. ✅ Notifications are queued and delivered
7. ✅ No new errors in application logs

## 🔄 Rollback Plan

If issues occur, rollback using:

```bash
# Revert database migration (run DOWN section)
psql $DATABASE_URL << 'EOF'
BEGIN;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS budget_overrun_alerts CASCADE;
DROP TABLE IF EXISTS meeting_attendees CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
COMMIT;
EOF

# Revert code changes
git revert <commit-hash>
git push production main
```

## 📞 Support

For issues during deployment:
1. Check logs: `server/logs/combined.log`
2. Review test output: `npm test`
3. Run demo for validation: `npm run demo:emergency-meetings`
4. Consult documentation in `docs/06-features/`

## ✨ Next Steps

After successful deployment:

1. **Monitor**: Watch for the first auto-scheduled meeting
2. **Train Users**: Share documentation with stakeholders
3. **Iterate**: Gather feedback on alert thresholds
4. **Enhance**: Consider adding:
   - Calendar integration (Google Calendar, Outlook)
   - SMS notifications for emergency alerts
   - Meeting analytics dashboard
   - AI-powered agenda generation

---

**Deployment Date**: _________  
**Deployed By**: _________  
**Production Environment**: _________  
**Version**: 2.0.0 (TASK-743)

