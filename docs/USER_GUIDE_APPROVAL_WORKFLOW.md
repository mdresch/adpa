# Approval Workflow User Guide

**Task ID**: TASK-745  
**Version**: 1.0  
**Last Updated**: 2025-11-08

## Overview

The Approval Workflow system enables formal approval processes for change requests generated from drift detection. This guide explains how to use the approval features as an approver, requester, or administrator.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Viewing Pending Approvals](#viewing-pending-approvals)
3. [Reviewing an Approval Request](#reviewing-an-approval-request)
4. [Approving a Request](#approving-a-request)
5. [Rejecting a Request](#rejecting-a-request)
6. [Understanding Approval Stages](#understanding-approval-stages)
7. [SLA and Deadlines](#sla-and-deadlines)
8. [Notifications](#notifications)
9. [FAQs](#faqs)

---

## Getting Started

### Accessing the Approval System

1. Log in to the ADPA admin portal
2. Click on **Approvals** in the left sidebar
3. You'll see a badge showing the number of pending approvals assigned to you

### Dashboard Overview

The Approvals dashboard shows:
- **Pending** - Approvals awaiting your action
- **Approved** - Approvals you've approved
- **Rejected** - Approvals you've rejected
- **Overdue** - Approvals past their SLA deadline

---

## Viewing Pending Approvals

### Approval List

The main approvals page displays all requests with:

**Status Filters**
- **All** - View all approval requests
- **Pending** - Active requests needing action
- **Completed** - Approved or rejected requests

**Request Information**
- Title and description
- Current approval status
- Priority level (Low, Medium, High, Critical, Emergency)
- SLA deadline
- Stage progress (e.g., "Stage 1/2")
- Request type (positive drift, budget overrun, etc.)

**Visual Indicators**
- 🚨 Red "Overdue" badge for requests past SLA
- Priority emoji badges (📋 Low, ℹ️ Medium, ⚠️ High, 🚨 Critical/Emergency)
- Color-coded status badges

---

## Reviewing an Approval Request

### Opening a Request

Click on any approval request card to view full details:

1. **Request Header**
   - Title and description
   - Status, priority, and stage progress badges
   - Overdue indicator if past SLA

2. **Request Details Card**
   - Request type and severity
   - Requested date and requester
   - SLA deadline (highlighted if overdue)
   - Completion date (if completed)
   - Link to related change request document

3. **Impact Summary** (if available)
   - Financial impact
   - Timeline impact
   - Scope impact
   - Risk assessment
   - Other relevant metrics

4. **Approval Steps Section**
   - All approval stages and steps
   - Current stage highlighted in blue
   - Status of each step (Pending, Approved, Rejected)
   - Approver role for each step
   - Decision notes from previous approvers

---

## Approving a Request

### When You Can Approve

You can approve a step when:
- ✅ The step is assigned to you (based on your role)
- ✅ The step is in the current approval stage
- ✅ The step status is "Pending"
- ✅ The overall request status is "Pending" or "In Progress"

### Approval Process

1. **Review the request thoroughly**
   - Read the description and impact summary
   - Check related change request if linked
   - Review any previous approver notes

2. **Click the "Approve" button**
   - Located next to your assigned step

3. **Add decision notes (optional)**
   - Provide comments about your decision
   - Add conditions or requirements
   - Document concerns or recommendations

4. **Confirm approval**
   - Click "Approve" in the dialog
   - The system will:
     - Mark your step as approved
     - Advance to next stage if all current stage steps are complete
     - Mark request as fully approved if all stages complete
     - Send notifications to next approvers or requester
     - Update linked change request status

### What Happens After Approval

**Single-Stage Workflows**
- Request immediately marked as "Approved"
- Requester notified
- Change request (if linked) status updated to "Approved"

**Multi-Stage Workflows**
- Current stage marked complete
- Request advances to next stage
- Next stage approvers notified
- Status changes to "In Progress"

---

## Rejecting a Request

### When to Reject

Reject a request when:
- Requirements are not met
- Insufficient justification
- Risks outweigh benefits
- Alternative approach needed
- Incomplete information

### Rejection Process

1. **Click the "Reject" button**
   - Located next to your assigned step

2. **Provide rejection reason (required)**
   - Explain why the request is being rejected
   - Be specific and constructive
   - Suggest improvements or alternatives

3. **Confirm rejection**
   - Click "Reject" in the dialog
   - The system will:
     - Mark the entire approval request as "Rejected"
     - Stop processing remaining stages
     - Notify the requester
     - Update linked change request status

**Important**: Rejection at any stage stops the entire approval process. The request cannot proceed further without being resubmitted.

---

## Understanding Approval Stages

### What Are Stages?

Approval workflows are organized into stages:
- Each stage may have one or more approval steps
- All required steps in a stage must be approved before advancing
- Stages process sequentially (Stage 1, then Stage 2, etc.)

### Common Stage Patterns

**Single-Stage Approval**
```
Stage 1: Project Sponsor → Approved ✅
```

**Two-Stage Approval**
```
Stage 1: Project Sponsor → Approved ✅
Stage 2: CFO → Pending ⏳
```

**Multi-Approver Stage**
```
Stage 1: 
  - Project Sponsor (Required) → Approved ✅
  - Innovation Lead (Optional) → Pending ⏳
```

### Stage Status Indicators

- **Current** - Blue badge, step currently being processed
- **Required** - Must be approved to proceed
- **Optional** - Can be skipped
- **Conditional** - Only required if certain conditions are met

---

## SLA and Deadlines

### Understanding SLA

SLA (Service Level Agreement) defines how quickly an approval must be processed:

| Priority | Typical SLA |
|----------|-------------|
| Low | 72 hours |
| Medium | 72 hours |
| High | 36 hours |
| Critical | 12-24 hours |
| Emergency | 6-12 hours |

### SLA Indicators

**In the approval list:**
- Normal deadline shown in gray
- Approaching deadline shown in orange (< 2 hours remaining)
- Overdue shown in red with "Overdue" badge

**In approval details:**
- SLA deadline prominently displayed
- Overdue requests highlighted in red
- Time remaining calculated automatically

### What Happens When SLA is Breached

1. Request status changes to "Expired"
2. Escalation process initiated
3. Higher-level approvers notified
4. Escalation record created in audit log

---

## Notifications

### Email Notifications

You'll receive emails for:
- **New approval requests** - When assigned as approver
- **Reminders** - For pending approvals approaching SLA
- **Escalations** - For overdue approvals
- **Status updates** - When request is approved/rejected

### In-App Notifications

- **Sidebar badge** - Shows count of pending approvals
- **Real-time updates** - Badge refreshes every 30 seconds
- **Visual indicators** - Red dot in collapsed sidebar mode

### Notification Content

Emails include:
- Request title and description
- Priority and severity
- SLA deadline
- Your role in the approval
- Direct link to review in ADPA

---

## FAQs

### General Questions

**Q: Can I delegate my approval to someone else?**
A: Delegation is not currently available. Contact your administrator if you need to reassign an approval.

**Q: What if I need more information before approving?**
A: You can reject with notes requesting additional information, or contact the requester directly before making a decision.

**Q: Can I change my decision after approving/rejecting?**
A: No, decisions are final. Contact your administrator if you made an error.

**Q: How do I know which approvals are most urgent?**
A: Check the priority badge and SLA deadline. Red "Overdue" badges indicate immediate attention needed.

### Technical Questions

**Q: Why don't I see any approval requests?**
A: Possible reasons:
- No requests currently assigned to your role
- Requests filtered out by current filter selection
- You don't have approver permissions

**Q: Why can't I approve a request?**
A: Check that:
- The step is assigned to you (matches your role)
- The step is in the current stage
- The request status is "Pending" or "In Progress"
- You're not viewing a completed request

**Q: What does "Stage 2/3" mean?**
A: The request is currently in stage 2 of a 3-stage approval process.

### Workflow Questions

**Q: What's the difference between "Pending" and "In Progress"?**
A: 
- "Pending" - Awaiting first approval
- "In Progress" - Some stages approved, more stages remaining

**Q: Can multiple people approve the same step?**
A: No, each step is assigned to one approver. However, a stage may have multiple steps for different approvers.

**Q: What happens if no one approves before the SLA deadline?**
A: The request is marked as "Expired" and escalated to higher-level approvers.

---

## Best Practices

### For Approvers

1. **Review requests promptly** - Respect SLA deadlines
2. **Be thorough** - Review all details and linked documents
3. **Provide clear notes** - Help others understand your decision
4. **Ask questions** - Contact requester if information is missing
5. **Consider impact** - Think about broader implications

### For Requesters

1. **Provide complete information** - Include all relevant details
2. **Set appropriate priority** - Don't overuse Critical/Emergency
3. **Link related documents** - Help approvers find context
4. **Be available** - Respond quickly to approver questions
5. **Follow up** - Monitor progress and remind if needed

### For Administrators

1. **Configure appropriate workflows** - Match business processes
2. **Set realistic SLAs** - Based on actual approval times
3. **Monitor overdue requests** - Address bottlenecks
4. **Review escalations** - Ensure proper routing
5. **Train users** - Ensure everyone understands the process

---

## Support

### Getting Help

**Technical Issues**
- Contact: support@adpa.example.com
- Slack: #adpa-support

**Workflow Questions**
- Contact: Your project manager or workflow administrator

**Access Issues**
- Contact: Your system administrator

---

## Related Documentation

- [Approval Workflow API Documentation](./api/APPROVAL_WORKFLOW_API.md)
- [Drift Detection Workflow](./roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
- [Change Request Management Guide](./CHANGE_REQUEST_GUIDE.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-08  
**Maintained By**: ADPA Development Team
