# Change Control Board (CCB) Approval Routing

## Overview

Change requests are now routed to the **Change Control Board (CCB)** for approval. CCB is a standard PMBOK practice for managing project changes through a formal governance structure.

---

## CCB Composition

The Change Control Board typically consists of:

- **Project Sponsor** (Chair) - Ultimate decision authority
- **Project Manager** - Coordinates change analysis and presents to CCB
- **Technical Lead** - Assesses technical feasibility and impact
- **Business Analyst** - Evaluates business impact and requirements
- **Key Stakeholders** - Domain experts as needed

---

## Workflow Updates

### Change Requests Routed to CCB

The following change request types are routed to CCB:

| Request Type | Workflow | CCB Stage | Additional Stages |
|--------------|----------|-----------|-------------------|
| **General Change Request** | `general_cr` | Stage 1 (Required) | None |
| **Scope Change** | `scope_change` | Stage 1 (Required) | None |
| **Timeline Change** | `timeline_change` | Stage 1 (Required) | None |
| **Technical Change** | `technical_change` | Stage 1 (Required) | Stage 2: CTO (if high technical impact) |

### Other Workflows (Unchanged)

These workflows maintain their specific approval paths:

- **Budget Overrun**: Project Sponsor → CFO → CEO (if >25% overrun)
- **Positive Drift**: Project Sponsor → Innovation Lead → CTO (conditional)
- **Negative Drift**: Project Sponsor → Program Manager

---

## How CCB Approval Works

### 1. Change Request Created

When a change request is created (manually or automatically):

1. System identifies the request type
2. Finds the appropriate workflow
3. Creates approval steps based on workflow stages
4. Assigns approval steps to users with the `ccb` role

### 2. CCB Assignment

The system assigns approval steps to users with the `ccb` role:

- **Role-Based Assignment**: All users with `role = 'ccb'` are eligible
- **First Available**: System selects the first user with CCB role (ordered by creation date)
- **Multiple Approvers**: If multiple CCB members exist, they can all see and approve the request

### 3. CCB Review Process

1. **Notification**: CCB members receive notification of pending approval
2. **Review**: CCB members review the change request details
3. **Decision**: Any CCB member can approve or reject
4. **Completion**: Once approved, request moves to next stage (if exists) or completes

---

## Setting Up CCB Members

### Option 1: Assign CCB Role to Users

Update user roles in the database:

```sql
-- Assign CCB role to specific users
UPDATE users 
SET role = 'ccb' 
WHERE email IN (
    'sponsor@example.com',
    'pm@example.com',
    'tech-lead@example.com',
    'ba@example.com'
);
```

### Option 2: Create CCB User Group (Future Enhancement)

A future enhancement could create a `ccb_members` table or user group system to manage CCB membership more flexibly.

---

## CCB Approval Workflow Stages

### General Change Request Flow

```
Change Request Created
    ↓
CCB Review (Stage 1) ← All CCB members notified
    ↓
[Approve] → Request Approved
[Reject]  → Request Rejected
```

### Technical Change Flow

```
Change Request Created
    ↓
CCB Review (Stage 1) ← All CCB members notified
    ↓
[Approve] → CTO Review (Stage 2) ← If high technical impact
    ↓
[Approve] → Request Approved
[Reject]  → Request Rejected
```

---

## SLA Timelines

CCB approval requests have the following SLA deadlines:

| Priority | SLA Hours | Deadline Example |
|----------|-----------|------------------|
| **Low** | 72 hours | 3 business days |
| **Medium** | 72 hours | 3 business days |
| **High** | 48 hours | 2 business days |
| **Critical** | 24 hours | 1 business day |
| **Emergency** | 12 hours | Same day |

---

## CCB Decision Criteria

CCB members should evaluate change requests based on:

1. **Business Impact**: Alignment with project objectives
2. **Technical Feasibility**: Can the change be implemented?
3. **Resource Impact**: Budget, timeline, and resource requirements
4. **Risk Assessment**: What are the risks of implementing/not implementing?
5. **Stakeholder Impact**: Who is affected by this change?
6. **Compliance**: Does this change affect regulatory/compliance requirements?

---

## CCB Meeting Process (Recommended)

While the system supports asynchronous approval, CCB meetings can be scheduled:

1. **Weekly CCB Meeting**: Review all pending change requests
2. **Urgent Requests**: Can be approved outside meetings for critical/emergency priority
3. **Documentation**: All decisions are automatically logged in the audit trail

---

## Migration Details

**Migration**: `325_update_approval_workflows_for_ccb.sql`

**Changes**:
- Updated `general_cr` workflow to route to CCB
- Updated `scope_change` workflow to route to CCB
- Updated `timeline_change` workflow to route to CCB
- Updated `technical_change` workflow to route to CCB (with optional CTO stage)

**Backward Compatibility**:
- Existing approval requests continue with their original workflows
- New requests use CCB routing
- Budget and drift workflows remain unchanged

---

## Troubleshooting

### "No users found with CCB role"

**Problem**: No users have the `ccb` role assigned.

**Solution**:
1. Assign `ccb` role to appropriate users:
   ```sql
   UPDATE users SET role = 'ccb' WHERE id IN (...);
   ```
2. Or create new users with CCB role via Users & Roles page

### "CCB approval not appearing"

**Problem**: CCB members not seeing approval requests.

**Solution**:
- Verify user has `role = 'ccb'`
- Check that approval request type matches CCB workflow
- Ensure request is in `pending` or `in_progress` status
- Verify user is assigned to approval step (`approver_user_id`)

---

## Best Practices

1. **CCB Membership**: Keep CCB membership current and aligned with project structure
2. **Clear Criteria**: Document CCB decision criteria in project management plan
3. **Timely Reviews**: Respect SLA deadlines for approval decisions
4. **Documentation**: Use decision notes to explain approval/rejection reasoning
5. **Escalation**: For urgent requests, consider expedited CCB review process

---

## Related Documentation

- `docs/06-features/APPROVAL_WORKFLOW_GUIDE.md` - Complete approval workflow guide
- `docs/implementation/APPROVAL_WORKFLOW_IMPLEMENTATION.md` - Technical implementation details
- PMBOK Guide - Perform Integrated Change Control process

---

**Last Updated**: November 2025  
**Migration**: 325_update_approval_workflows_for_ccb.sql

