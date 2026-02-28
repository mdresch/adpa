# Approval Workflow System - User Guide

## Overview

The Approval Workflow System manages formal approval processes for change requests, drift resolutions, and other project changes that require stakeholder approval. Approval requests can be created automatically (from drift detection) or manually through the UI.

---

## How Approval Requests Are Created

### 1. **Automatic Creation** (From Drift Detection)

When drift is detected and resolved in project baselines:

1. **Drift Detection** → System detects changes in baseline documents
2. **Change Request Creation** → Major changes automatically create change request documents
3. **Approval Request** → Approval workflow is automatically triggered for:
   - Budget overruns (>10% variance)
   - Critical drift severity
   - High-priority changes
   - Scope/timeline changes requiring approval

**Location**: Automatic via `/api/drift/resolve` endpoint

### 2. **Manual Creation** (Via UI)

Users can manually create approval requests:

1. Navigate to **Approvals** page (`/approvals`)
2. Click **"Create Approval Request"** button
3. Fill in the form:
   - **Request Type**: Select the type of change (scope, timeline, budget, etc.)
   - **Project**: Select the project (if not pre-selected)
   - **Title**: Brief title for the request
   - **Description**: Detailed description of what requires approval
   - **Priority**: Low, Medium, High, Critical, or Emergency
   - **Severity**: Low, Medium, High, or Critical
   - **Impact Summary**: Optional description of impacts
4. Click **"Create Approval Request"**

**Location**: `/approvals` page → Create Approval Request button

---

## Approval Request Types

The system supports 7 request types, each with its own workflow:

| Type | Description | Use Case | Approval Route |
|------|-------------|----------|----------------|
| **general_cr** | General Change Request | Generic changes not fitting other categories | **CCB** |
| **scope_change** | Scope Change | Changes to project scope or deliverables | **CCB** |
| **timeline_change** | Timeline Change | Schedule adjustments or deadline changes | **CCB** |
| **technical_change** | Technical Change | Technical baseline or architecture changes | **CCB** → CTO (if high impact) |
| **budget_overrun** | Budget Overrun | Budget variances requiring approval | Project Sponsor → CFO → CEO |
| **positive_drift** | Positive Drift (Opportunity) | Efficiency improvements or opportunities | Project Sponsor → Innovation Lead → CTO |
| **negative_drift** | Negative Drift (Corrective Action) | Corrective actions for scope/timeline/quality drift | Project Sponsor → Program Manager |

**Note**: Change requests (general_cr, scope_change, timeline_change, technical_change) are routed to **Change Control Board (CCB)** for approval. See [CCB Approval Routing Guide](./CCB_APPROVAL_ROUTING.md) for details.

---

## Approval Workflow Stages

Each approval request follows a multi-stage workflow:

### Stage Progression

1. **Request Created** → Status: `pending`, Stage: 1
2. **First Approver Reviews** → Status: `in_progress`, Stage: 1
3. **Approval/Rejection** → If approved, advances to next stage (if exists)
4. **Final Stage** → When all required stages are approved, status becomes `approved`
5. **Rejection** → If any stage is rejected, status becomes `rejected`

### Default Workflows

**Change Request Workflows (CCB Routing)**:
- **General Change Request**: Stage 1: CCB (Required)
- **Scope Change**: Stage 1: CCB (Required)
- **Timeline Change**: Stage 1: CCB (Required)
- **Technical Change**: Stage 1: CCB (Required) → Stage 2: CTO (Conditional - if high technical impact)

**Budget Overrun Workflow**:
- Stage 1: Project Sponsor (Required)
- Stage 2: CFO (Required)
- Stage 3: CEO (Conditional - if overrun >25%)

**Positive Drift Workflow**:
- Stage 1: Project Sponsor (Required)
- Stage 2: Innovation Lead (Optional)
- Stage 3: CTO (Conditional - if technical change)

**Negative Drift Workflow**:
- Stage 1: Project Sponsor (Required)
- Stage 2: Program Manager (Required)

---

## Viewing Approval Requests

### Approvals List Page (`/approvals`)

**Features**:
- **Stats Cards**: Pending, Approved, Rejected, Overdue counts
- **Filters**: All, Pending, Completed
- **Request Cards**: Each card shows:
  - Title and description
  - Status badge (Pending, In Progress, Approved, Rejected)
  - Priority badge (Low, Medium, High, Critical, Emergency)
  - Overdue badge (if SLA deadline passed)
  - Stage progress (e.g., "Stage 1/3")
  - Requested date and SLA deadline
  - Request type

**Actions**:
- Click any card to view details
- Create new approval request

### Approval Detail Page (`/approvals/[id]`)

**Features**:
- **Request Information**: Title, description, status, priority, severity
- **Details Card**: Request type, severity, requested date, SLA deadline, completion date
- **Impact Summary**: If provided, shows impact details
- **Approval Steps**: Shows all stages with:
  - Step name and description
  - Approver role and assigned user
  - Current status (Pending, Approved, Rejected)
  - Decision notes (if decided)
  - Action buttons (if user can approve/reject)

**Actions**:
- **Approve Step**: If you're assigned as approver for current stage
- **Reject Step**: If you're assigned as approver (requires reason)
- **Back to Approvals**: Return to list page

---

## Approving/Rejecting Requests

### Who Can Approve?

- Users assigned to the approval step's `approver_user_id`
- Users with the role matching the step's `approver_role`
- Only for steps in the current stage (`step_order === current_stage`)
- Only for requests with status `pending` or `in_progress`

### How to Approve

1. Navigate to the approval detail page (`/approvals/[id]`)
2. Find the step you're assigned to (should show "Approve" button)
3. Click **"Approve"** button
4. (Optional) Add decision notes
5. Click **"Confirm Approval"**

### How to Reject

1. Navigate to the approval detail page (`/approvals/[id]`)
2. Find the step you're assigned to
3. Click **"Reject"** button
4. **Required**: Provide a reason for rejection
5. Click **"Confirm Rejection"**

**Note**: Rejection immediately stops the workflow and sets status to `rejected`.

---

## SLA Tracking

Each approval request has an SLA deadline based on:

- **Priority Level**:
  - Emergency: 6-12 hours
  - Critical: 12-24 hours
  - High: 24-48 hours
  - Medium: 48-72 hours
  - Low: 72+ hours

- **Workflow Type**: Each workflow has default SLA hours

**Overdue Detection**:
- Requests past their SLA deadline show an "Overdue" badge
- Overdue requests are counted in stats
- Escalation may be triggered (if configured)

---

## Notifications

Approval requests trigger notifications via:

- **Email**: Sent to approvers when assigned
- **Dashboard**: Badge count in sidebar
- **Slack/SMS**: If configured in workflow

---

## Common Workflows

### Scenario 1: Budget Overrun Detected

1. Drift detection identifies budget variance >10%
2. Change request document created automatically
3. Approval request created with type `budget_overrun`
4. Assigned to Project Sponsor → CFO → (CEO if >25%)
5. Approvers receive notifications
6. Each approver reviews and approves/rejects
7. Once all stages approved, change request is finalized

### Scenario 2: Manual Scope Change Request

1. Project manager identifies need for scope change
2. Navigates to `/approvals`
3. Clicks "Create Approval Request"
4. Selects "Scope Change" type
5. Fills in details and submits
6. Approval workflow starts (Project Sponsor → Program Manager)
7. Approvers review and decide

### Scenario 3: Positive Drift Opportunity

1. AI drift detection finds efficiency improvement
2. Positive drift approval request created automatically
3. Assigned to Project Sponsor
4. If approved, innovation lead may review (optional)
5. If technical change, CTO reviews (conditional)
6. Once approved, opportunity is implemented

---

## Troubleshooting

### "No active workflow found for type: [type]"

**Problem**: No approval workflow exists for the request type.

**Solution**: 
- Check that workflows are seeded in database (migration 322)
- Verify workflow `is_active = TRUE` for the request type
- Contact admin to create/activate workflow

### "User not authorized to approve this step"

**Problem**: User trying to approve a step they're not assigned to.

**Solution**:
- Check that user's role matches step's `approver_role`
- Verify user is assigned to step's `approver_user_id`
- Ensure step is in current stage

### Approval Requests Not Showing

**Problem**: Empty approvals list despite creating requests.

**Solution**:
- Check filter (may be set to "Pending" but request is "Completed")
- Verify user has permissions to view approvals
- Check that requests are assigned to current user's role
- Ensure API endpoint `/api/approvals` returns data

---

## API Endpoints

- `GET /api/approvals` - List approvals for current user
- `GET /api/approvals/:id` - Get approval details
- `POST /api/approvals` - Create approval request
- `POST /api/approvals/:id/steps/:stepId/approve` - Approve step
- `POST /api/approvals/:id/steps/:stepId/reject` - Reject step
- `GET /api/approvals/stats/user` - Get user approval statistics

---

## Database Tables

- `approval_workflows` - Workflow templates
- `approval_requests` - Approval request instances
- `approval_steps` - Individual approval steps
- `approval_notifications` - Notification tracking
- `approval_escalations` - Escalation records
- `approval_audit_log` - Complete audit trail

---

## Best Practices

1. **Provide Clear Descriptions**: Include all relevant context in the description
2. **Set Appropriate Priority**: Use emergency/critical sparingly
3. **Include Impact Summary**: Help approvers understand the full impact
4. **Respond Promptly**: Respect SLA deadlines
5. **Add Decision Notes**: Explain your approval/rejection reasoning
6. **Monitor Overdue**: Check overdue requests regularly

---

**Last Updated**: November 2025  
**Related Documentation**: 
- `docs/implementation/APPROVAL_WORKFLOW_IMPLEMENTATION.md`
- `docs/api/APPROVAL_WORKFLOW_API.md`

