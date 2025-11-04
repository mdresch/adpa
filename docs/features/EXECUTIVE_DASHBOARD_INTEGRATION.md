# Executive Dashboard Integration

**Task ID**: TASK-744  
**Status**: Implemented  
**Version**: v2.3

## Overview

The Executive Dashboard Integration provides real-time visibility into drift detection alerts, budget overruns, and innovation opportunities for executive-level decision making. This feature is part of Phase 2 of the Drift to Change Request Workflow (CR-2026-001).

## Features

### 1. Executive Summary Dashboard
- **Drift Statistics**: Real-time counts of total, critical, and high-severity drift alerts
- **Innovation Opportunities**: Count of identified positive drift and patent opportunities
- **Project Health**: Overview of active projects and projects at risk
- **Auto-refresh**: Updates every 2 minutes

### 2. Critical Drift Alerts
- Prioritized by severity (Critical → High → Medium → Low)
- Shows drift type (scope, budget, timeline, technical)
- Impact assessment for each alert
- Click-through to project details

### 3. Budget Overrun Alerts
- Identifies projects exceeding budget baseline
- Severity-based escalation
- Cost variance tracking
- Quick access to portfolio view

### 4. Positive Drift Opportunities
- Innovation and efficiency improvements
- Patent opportunity identification
- Novelty and patentability scores
- Potential value estimation

## API Endpoints

### GET /api/executive-dashboard/summary
Returns comprehensive executive summary with drift, innovation, and project health statistics.

**Response:**
```json
{
  "drift_statistics": {
    "total_drift": 5,
    "critical_drift": 2,
    "high_drift": 1,
    "unaddressed_drift": 3,
    "budget_overruns": 1,
    "scope_creep": 2,
    "schedule_delays": 1
  },
  "innovation_statistics": {
    "total_opportunities": 3,
    "patent_opportunities": 1,
    "efficiency_improvements": 1,
    "cost_savings": 1,
    "avg_novelty_score": 0.75
  },
  "project_health": {
    "total_projects": 10,
    "active_projects": 8,
    "projects_at_risk": 2
  },
  "generated_at": "2025-11-04T14:00:00.000Z"
}
```

### GET /api/executive-dashboard/drift-alerts
Returns critical drift alerts with optional filtering.

**Query Parameters:**
- `severity` (optional): Filter by severity (low, medium, high, critical)
- `status` (optional): Filter by status (detected, acknowledged, investigating, resolved, false_positive)
- `limit` (optional, default: 20): Maximum number of alerts to return

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "project_name": "Project Name",
      "detection_type": "scope_drift",
      "drift_severity": "critical",
      "drift_description": "Scope increased by 40% without approval",
      "drift_impact": "Budget overrun of $225K",
      "detection_date": "2025-11-04T12:00:00.000Z",
      "status": "detected",
      "document_title": "Project Charter v2",
      "baseline_version": "1.0"
    }
  ],
  "statistics": {
    "critical_count": 2,
    "high_count": 1,
    "medium_count": 0,
    "low_count": 0,
    "unaddressed_count": 3,
    "last_24h_count": 1,
    "last_7d_count": 3
  },
  "generated_at": "2025-11-04T14:00:00.000Z"
}
```

### GET /api/executive-dashboard/budget-alerts
Returns budget overrun alerts.

**Response:**
```json
{
  "budget_alerts": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "project_name": "CRM Upgrade Project",
      "drift_severity": "critical",
      "drift_description": "Budget overrun detected: $225K over baseline",
      "drift_impact": "45% over approved budget",
      "budget": 725000,
      "cost_baseline": {
        "approved_budget": 500000
      }
    }
  ],
  "total_count": 1,
  "critical_count": 1,
  "generated_at": "2025-11-04T14:00:00.000Z"
}
```

### GET /api/executive-dashboard/positive-drift
Returns positive drift and innovation opportunities.

**Response:**
```json
{
  "opportunities": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "project_name": "AI Integration Project",
      "opportunity_type": "efficiency_gain",
      "title": "AI Cost Optimization",
      "description": "Switched to Claude Sonnet from GPT-4",
      "potential_value": "$30K annually",
      "novelty_score": 0.75,
      "patentability_score": 0.45,
      "status": "identified",
      "created_at": "2025-11-04T12:00:00.000Z"
    }
  ],
  "total_count": 1,
  "high_novelty_count": 1,
  "generated_at": "2025-11-04T14:00:00.000Z"
}
```

## Frontend Component

### ExecutiveDriftAlertsWidget

Location: `/app/(dashboard)/components/ExecutiveDriftAlertsWidget.tsx`

**Features:**
- Real-time data fetching with auto-refresh (2-minute interval)
- Responsive card-based layout
- Severity-based color coding
- Animated transitions
- Click-through navigation to projects
- Loading states and error handling

**Integration:**
```tsx
import { ExecutiveDriftAlertsWidget } from "@/app/(dashboard)/components/ExecutiveDriftAlertsWidget"

// Add to dashboard
<ExecutiveDriftAlertsWidget />
```

## Performance Optimizations

### Caching Strategy
- **Summary**: 5-minute cache TTL
- **Drift Alerts**: 2-minute cache TTL
- **Budget Alerts**: 5-minute cache TTL
- **Positive Drift**: 10-minute cache TTL

### Query Optimization
- User-scoped queries (only user's projects)
- Severity-based ordering for critical alerts
- Limit parameters to prevent large result sets
- Indexed database columns for fast lookups

## Security

- All endpoints require authentication
- User can only see their own projects (owner or team member)
- Permission-based access control
- SQL injection protection via parameterized queries

## Database Schema

The executive dashboard uses the following tables:
- `baseline_drift_detection` - Drift alerts
- `innovation_opportunities` - Positive drift and innovation
- `project_baselines` - Baseline references
- `projects` - Project information

## Testing

Test file: `/server/src/__tests__/routes/executive-dashboard.test.ts`

**Test Coverage:**
- Executive summary endpoint
- Drift alerts with filtering
- Budget overrun alerts
- Positive drift opportunities
- Caching behavior
- Error handling

**Running Tests:**
```bash
cd server
npm test -- executive-dashboard.test.ts
```

## Future Enhancements

Based on DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md Phase 2-4:

1. **Multi-channel Notifications** (v2.3)
   - Email notifications for critical alerts
   - Slack integration for real-time alerts
   - SMS alerts for emergency-level issues

2. **Automated Change Request Generation** (v2.4)
   - Auto-generate CRs from detected drift
   - Pre-filled CR templates with drift analysis
   - Approval workflow integration

3. **Emergency Meeting Scheduling** (v2.3)
   - Auto-schedule meetings for critical budget overruns
   - Calendar integration
   - Attendee notifications

4. **Advanced Analytics** (v2.4)
   - Trend analysis and predictions
   - Root cause analysis
   - Drift pattern detection

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
- [Baseline & Drift Detection Migration](../../server/migrations/017_baseline_drift_detection.sql)
- [Drift Detection Service](../../server/src/services/driftDetectionService.ts)

## Support

For issues or questions:
- Create a GitHub issue with tag `executive-dashboard`
- Reference TASK-744 in issue description
