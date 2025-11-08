# Approval Workflow API Documentation

**Task ID**: TASK-745  
**Version**: 1.0  
**Last Updated**: 2025-11-08

## Overview

The Approval Workflow API provides endpoints for managing approval requests, steps, and workflows for change requests and drift resolutions. This system implements a multi-stage approval process with SLA tracking, escalation, and audit logging.

## Base URL

```
/api/approvals
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get Pending Approvals for Current User

Retrieves all pending approval requests assigned to the authenticated user.

**Endpoint**: `GET /api/approvals`

**Response**:
```json
{
  "success": true,
  "approvals": [
    {
      "id": "uuid",
      "request_type": "positive_drift",
      "title": "Approval Required: Budget Optimization",
      "description": "Approve cost savings opportunity",
      "status": "pending",
      "priority": "medium",
      "severity": "medium",
      "sla_deadline": "2025-11-10T12:00:00Z",
      "requested_at": "2025-11-07T12:00:00Z",
      "project_id": "uuid",
      "current_stage": 1,
      "total_stages": 2
    }
  ],
  "count": 1
}
```

---

### 2. Get Approval Request Details

Retrieves detailed information about a specific approval request including all approval steps.

**Endpoint**: `GET /api/approvals/:id`

**Parameters**:
- `id` (path) - Approval request UUID

**Response**:
```json
{
  "success": true,
  "approval": {
    "id": "uuid",
    "workflow_id": "uuid",
    "request_type": "positive_drift",
    "change_request_id": "uuid",
    "drift_record_id": "uuid",
    "project_id": "uuid",
    "title": "Approval Required: Budget Optimization",
    "description": "Approve cost savings opportunity",
    "impact_summary": {
      "financial_impact": "$50,000 savings",
      "timeline_impact": "None",
      "scope_impact": "Minor"
    },
    "current_stage": 1,
    "total_stages": 2,
    "status": "pending",
    "priority": "medium",
    "severity": "medium",
    "sla_deadline": "2025-11-10T12:00:00Z",
    "escalation_deadline": "2025-11-09T12:00:00Z",
    "requested_by": "uuid",
    "requested_at": "2025-11-07T12:00:00Z",
    "metadata": {}
  },
  "steps": [
    {
      "id": "uuid",
      "approval_request_id": "uuid",
      "step_order": 1,
      "step_name": "Approval by project_sponsor",
      "approver_role": "project_sponsor",
      "approver_user_id": "uuid",
      "is_required": true,
      "status": "pending",
      "assigned_at": "2025-11-07T12:00:00Z"
    }
  ]
}
```

---

## Request Types

The following request types are supported:

| Type | Description | Typical SLA |
|------|-------------|-------------|
| `positive_drift` | Opportunity CRs from efficiency improvements | 72 hours |
| `negative_drift` | Corrective action CRs | 48 hours |
| `budget_overrun` | Budget overrun CRs (critical) | 12-24 hours |
| `scope_change` | Scope change CRs | 48 hours |
| `timeline_change` | Timeline/schedule change CRs | 48 hours |
| `technical_change` | Technical baseline changes | 48 hours |
| `general_cr` | Generic change requests | 72 hours |

---

## Priority Levels

| Priority | SLA Multiplier | Use Case |
|----------|----------------|----------|
| `low` | Standard | Non-urgent improvements |
| `medium` | Standard | Normal operations |
| `high` | 0.5x | Important decisions |
| `critical` | 0.33x | Major issues requiring quick action |
| `emergency` | 0.17x | Critical situations requiring immediate attention |

---

## Status Values

### Approval Request Status
- `pending` - Awaiting first approver
- `in_progress` - Partially approved, more approvers needed
- `approved` - All required approvals obtained
- `rejected` - Rejected by an approver
- `cancelled` - Cancelled by requester
- `expired` - Exceeded SLA without approval
- `escalated` - Escalated to higher authority

### Approval Step Status
- `pending` - Waiting for approver action
- `approved` - Approved by assigned approver
- `rejected` - Rejected by assigned approver
- `skipped` - Conditional step that was skipped
- `delegated` - Delegated to another user

---

## See Also

- [Drift Detection Service Documentation](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
- [Approval Workflow Service Source](../../server/src/services/approvalWorkflowService.ts)
